import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Raycaster, Vector3 } from 'three';
import { stage4 } from '../src/stages/stage4.ts';
import { createGameState } from '../src/simulation/update.ts';
import { createWorkshopWorldState, WorkshopReactionController, WORKSHOP_SECONDS } from '../src/simulation/WorkshopWorldState.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { resolveQuestWord, questStatus, refreshQuestAvailability } from '../src/simulation/QuestProgress.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { WorkshopReactionView } from '../src/render/WorkshopReactionView.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
function setup() {
  const game=createGameState(stage4.playerStart,stage4.grid,stage4.quests);
  game.workshop=createWorkshopWorldState(game.words);
  const controller=new WorkshopReactionController(game.workshop,game.words);
  const validate=createQuestValidator(game.quests.definitions,game.words);
  const submit=word=>resolveQuestWord(game.quests,game.words,{word,selectedTileIds:[],path:[]},validate,controller.onQuestCompleted);
  const tick=dt=>{controller.update(dt);refreshQuestAvailability(game.quests,game.words);};
  return {game,s:game.workshop,controller,submit,tick};
}
for(const order of [['GEAR','REPAIR'],['REPAIR','GEAR']]) test(`workshop sequence ${order.join(' then ')}: delayed STOP, smooth shutdown, once-only completion`,()=>{
  const {game,s,controller,submit,tick}=setup();
  assert.equal(controller.isBusy,false);
  for(const key of ['gearInstalled','machineRepaired','powerOn','leverActivated','machineStarted','productionFinished','machineStopped']) assert.equal(s[key],false);
  for(const word of order) {
    assert.equal(submit(word).status,'CORRECT');tick(.5);
    assert.equal(controller.isBusy,true);assert.equal(s.beltSpeed,0);tick(WORKSHOP_SECONDS[word.toLowerCase()]);
  }
  assert.ok(s.gearInstalled&&s.machineRepaired);assert.equal(s.powerOn,false);
  assert.equal(submit('POWER').status,'CORRECT');tick(.6);assert.equal(s.powerOn,false);tick(3.5);
  assert.equal(s.powerOn,true);assert.equal(s.beltSpeed,0);
  assert.equal(submit('LEVER').status,'CORRECT');tick(1.5);assert.equal(s.leverActivated,true);assert.equal(s.beltSpeed,0);
  assert.equal(submit('START').status,'CORRECT');assert.equal(submit('STOP').reason,'LOCKED');
  tick(.6);assert.ok(s.gearSpeed>0);assert.equal(s.beltSpeed,0);
  tick(.6);assert.ok(s.beltSpeed>0&&s.beltSpeed<1);tick(.6);
  assert.equal(s.machineStarted,true);assert.equal(s.beltSpeed,1);assert.equal(s.productionFinished,false);
  tick(6.9);assert.equal(submit('STOP').reason,'LOCKED');
  const a=new AssistanceState({wordShards:2});game.quests.focusedIndex=5;
  assert.equal(a.requestHint(game.quests,game.words,false),'Hint unavailable for this quest');
  tick(.7);assert.equal(s.productionFinished,true);
  assert.equal(questStatus(game.quests.definitions[5],game.words),'AVAILABLE');
  const angle=s.gearAngle;tick(60);assert.equal(s.beltSpeed,1);assert.notEqual(s.gearAngle,angle);
  assert.equal(game.words.completedWords.length,5); // No timeout or automatic STOP.
  let completed=0;const completion=new StageCompletionController(stage4.id,()=>completed++);
  assert.equal(submit('STOP').status,'CORRECT');completion.check(game.quests,game.words);
  tick(.7);completion.update(.7,controller.isBusy,false);
  assert.ok(s.beltSpeed>0&&s.beltSpeed<1);assert.ok(s.gearSpeed>0&&s.gearSpeed<1);assert.equal(completed,0);
  tick(.7);assert.equal(s.machineStopped,true);assert.equal(s.beltSpeed,0);assert.equal(s.gearSpeed,0);
  assert.equal(controller.isBusy,true);tick(.65);assert.equal(controller.finaleFinished,true);
  completion.update(.29,controller.isBusy,false);assert.equal(completed,0);
  completion.update(.01,controller.isBusy,false);assert.equal(completed,1);
  tick(.5);const stopped=structuredClone(s);
  for(const word of stage4.vocabulary)assert.equal(submit(word).status,'ALREADY_COMPLETED');
  tick(20);assert.deepEqual(s,stopped);completion.update(20,false,false);assert.equal(completed,1);
  const fresh=setup();assert.equal(fresh.s.productionFinished,false);assert.equal(fresh.s.requested.gear,false);
  assert.equal(fresh.game.words.worldConditions['workshop.productionFinished'],false);
});
test('workshop reveal waits for actual completion plus 0.45 seconds and ignores invalid dt',()=>{
  const {s,controller,submit,tick,game}=setup();
  submit('GEAR');submit('REPAIR');
  assert.equal(submit('POWER').reason,'LOCKED');
  tick(2.6);assert.equal(s.gearInstalled,true);
  tick(.44);assert.equal(submit('POWER').reason,'LOCKED');assert.equal(game.quests.presentations.length,0);
  tick(.02);assert.equal(controller.notificationsHeld,false);
  assert.equal(game.quests.presentations[0].questId,'workshop-power');
  assert.equal(submit('POWER').status,'CORRECT');
  tick(3.6);assert.equal(submit('LEVER').reason,'LOCKED');
  tick(.46);assert.equal(submit('LEVER').status,'CORRECT');
  tick(1);assert.equal(submit('START').reason,'LOCKED');
  tick(.46);assert.equal(submit('START').status,'CORRECT');
  tick(8.8);assert.equal(s.productionFinished,true);assert.equal(submit('STOP').reason,'LOCKED');
  tick(.46);assert.equal(submit('STOP').status,'CORRECT');
  const before=structuredClone(s);
  for(const dt of [NaN,Infinity,-1,0])controller.update(dt);
  assert.deepEqual(s,before);
});
test('workshop renderer projects all phases without state mutation, keeps crates on output, and preserves grid visibility',()=>{
  const assets=new PrimitiveAssets(),environment=createDiorama(stage4,assets),view=new WorkshopReactionView(environment);
  environment.add(view.root);
  const {s,submit,tick}=setup();
  const grid=new LetterGrid(stage4.id,stage4.grid,stage4.letterLayout);
  const node=name=>environment.getObjectByName(name);
  const inspect=()=>{
    const before=structuredClone(s);view.update(s);assert.deepEqual(s,before);environment.updateMatrixWorld(true);
    for(const aspect of [1440/900,390/844]) {
      const span=Math.max(stage4.camera.verticalSpan,stage4.camera.minimumWidth/aspect);
      const camera=new OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,100);
      camera.position.set(...stage4.camera.position);camera.lookAt(...stage4.camera.target);camera.updateMatrixWorld();
      const direction=camera.getWorldDirection(new Vector3());
      for(const tile of grid.tiles) {
        const point=new Vector3(tile.worldPosition.x,.115,tile.worldPosition.z);
        const ray=new Raycaster(point.clone().addScaledVector(direction,-40),direction,0,39.99);
        assert.equal(ray.intersectObject(environment,true).filter(hit=>{
          for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;
          return true;
        }).length,0,`obscured ${tile.id}`);
      }
    }
  };
  try {
    inspect();assert.equal(node('installed-workshop-gear').visible,false);assert.ok(node('machine-cap').rotation.z>0);
    const first=node('workshop-production-crate-1'),second=node('workshop-production-crate-2');
    assert.ok(first.position.x>second.position.x);assert.equal(node('unlit-indicator').material.emissiveIntensity,0);
    for(const word of ['GEAR','REPAIR','POWER','LEVER','START']) {
      submit(word);for(let i=0;i<Math.ceil((WORKSHOP_SECONDS[word.toLowerCase()]+.5)/.4);i++){tick(.4);inspect();}
      if(word==='GEAR'){assert.equal(node('installed-workshop-gear').visible,true);assert.equal(node('installed-workshop-gear').children.filter(n=>n.name==='gear-tooth').length,12);}
      if(word==='REPAIR')assert.equal(node('machine-cap').rotation.z,0);
      if(word==='POWER')assert.ok(node('unlit-indicator').material.emissiveIntensity>0);
      if(word==='LEVER')assert.ok(node('resting-lever-handle').rotation.x>0);
    }
    for(let i=0;i<18;i++){tick(.4);inspect();}
    assert.equal(s.productionFinished,true);assert.ok(first.position.x>second.position.x);
    assert.ok(first.position.x<5.7&&second.position.x>3.7);
    const received=first.position.clone();submit('STOP');tick(.7);inspect();tick(.7);inspect();
    assert.deepEqual(first.position,received);assert.equal(s.beltSpeed,0);
    const gearRotation=node('installed-workshop-gear').rotation.z;
    tick(5);inspect();assert.equal(node('installed-workshop-gear').rotation.z,gearRotation);
    assert.equal(view.root.children.filter(n=>n.name.startsWith('workshop-production-crate')).length,2);
  } finally {view.dispose();assets.dispose();}
  assert.equal(view.root.parent,null);
});

test('polish: local gear emphasis, repair transform and sequential power arrival',()=>{
  const assets=new PrimitiveAssets(),environment=createDiorama(stage4,assets),view=new WorkshopReactionView(environment);
  environment.add(view.root);const {s}=setup();const node=name=>environment.getObjectByName(name);
  try {
    view.update(s);const broken=node('machine-cap').position.clone();
    s.requested.gear=true;s.progress.gear=.8;view.update(s);
    assert.ok(node('gear-local-warm-light').intensity>1);
    assert.ok(node('gear-local-warm-light').distance<3);
    assert.equal(node('gear-housing-light-sweep').visible,true);
    s.progress.repair=.3;view.update(s);assert.equal(node('workshop-repair-hammer').visible,true);
    s.progress.gear=1;s.progress.repair=1;view.update(s);assert.equal(node('workshop-repair-hammer').visible,false);
    assert.equal(node('gear-housing-light-sweep').visible,false);
    assert.ok(node('gear-local-warm-light').intensity<.2);
    assert.ok(broken.distanceTo(node('machine-cap').position)>.3);
    assert.equal(node('unlit-indicator').material.emissiveIntensity,0);
    s.progress.power=.3;view.update(s);
    assert.ok(node('unlit-indicator').material.emissiveIntensity>0);
    assert.equal(node('workshop-machine-indicator').material.emissiveIntensity,0);
    const pulse=node('workshop-energy-pulse').position.clone();
    s.progress.power=.7;view.update(s);
    assert.ok(pulse.distanceTo(node('workshop-energy-pulse').position)>1);
    assert.equal(node('workshop-machine-indicator').material.emissiveIntensity,0);
    s.progress.power=1;view.update(s);
    assert.ok(node('workshop-machine-indicator').material.emissiveIntensity>0);
    assert.equal(node('power-travel-light').intensity,0);assert.equal(s.beltSpeed,0);
  } finally {view.dispose();assets.dispose();}
});

test('notification overlay hides a queued banner while reactions hold it and resumes afterward',async()=>{
  const {createNarrativeOverlay}=await import('../src/ui/NarrativeOverlay.ts');
  const saved=globalThis.document;
  class Element { children=[];style={};hidden=false;textContent='';append(...items){this.children.push(...items);}setAttribute(){}remove(){} }
  globalThis.document={createElement:()=>new Element()};
  try {
    const host=new Element(),overlay=createNarrativeOverlay(host),{game}=setup();
    game.quests.presentations.push({questId:'workshop-power',remaining:3});
    overlay.update(game.quests,true);assert.equal(host.children[0].hidden,true);
    overlay.update(game.quests,false);assert.equal(host.children[0].hidden,false);
    overlay.update(game.quests,true);assert.equal(host.children[0].hidden,true);
    assert.equal(game.quests.presentations[0].remaining,3);overlay.dispose();
  } finally {globalThis.document=saved;}
});

test('finale waits for visible word feedback, locks immediately, holds idle and preserves output until disposal',()=>{
  const {game,s,controller,submit,tick}=setup();
  const assets=new PrimitiveAssets(),environment=createDiorama(stage4,assets),view=new WorkshopReactionView(environment);
  environment.add(view.root);
  try {
    for(const word of ['GEAR','REPAIR','POWER','LEVER','START']){assert.equal(submit(word).status,'CORRECT');tick(12);}
    view.update(s);
    const crate=environment.getObjectByName('workshop-production-crate-2'),received=crate.position.clone();
    let completions=0;const completion=new StageCompletionController(stage4.id,()=>completions++);
    assert.equal(controller.inputLocked,false);
    assert.equal(submit('STOP').status,'CORRECT');completion.check(game.quests,game.words);
    assert.equal(controller.inputLocked,true);assert.equal(s.finalePhase,'feedback');
    controller.update(2.3,true);completion.update(2.3,controller.isBusy,true);
    assert.equal(s.progress.stop,0);assert.equal(s.beltSpeed,1);assert.equal(completions,0);
    controller.update(.7,false);assert.equal(s.finalePhase,'shutdown');
    assert.ok(s.beltSpeed>0&&s.beltSpeed<1);
    controller.update(.7,false);assert.equal(s.finalePhase,'pause');assert.equal(s.beltSpeed,0);
    controller.update(.3,false);view.update(s);
    assert.ok(environment.getObjectByName('receiving-tray').material.emissiveIntensity>.08);
    completion.update(.3,controller.isBusy,false);assert.equal(completions,0);
    controller.update(.35,false);assert.equal(controller.finaleFinished,true);
    completion.update(.29,controller.isBusy,false);assert.equal(completions,0);
    completion.update(.01,controller.isBusy,false);assert.equal(completions,1);
    controller.update(20);view.update(s);
    assert.deepEqual(crate.position,received);
    assert.equal(environment.getObjectByName('resting-lever-handle').rotation.x,-.55);
    assert.ok(environment.getObjectByName('unlit-indicator').material.emissiveIntensity>0);
    assert.ok(environment.getObjectByName('workshop-machine-indicator').material.emissiveIntensity>0);
    assert.equal(controller.inputLocked,true);
    assert.equal(setup().s.finalePhase,'idle');assert.equal(setup().controller.inputLocked,false);
  } finally {view.dispose();assets.dispose();}
});

test('Stage 4 Next Stage uses fade/dispose/Stage 5 intro/mount/fade without reloading',async()=>{
  const {StageManager}=await import('../src/app/StageManager.ts');
  const {stages}=await import('../src/stages/registry.ts');
  const events=[];
  const manager=new StageManager(stages,stage4.id,stage=>{
    events.push(`mount:${stage.stageNumber}`);
    return {lock(){events.push(`lock:${stage.stageNumber}`);},unlock(){events.push(`unlock:${stage.stageNumber}`);},dispose(){events.push(`dispose:${stage.stageNumber}`);}};
  },{async fadeOut(){events.push('fadeOut');},async showIntro(stage){events.push(`intro:${stage.stageNumber}`);},async fadeIn(){events.push('fadeIn');},dispose(){}});
  manager.start();const first=manager.next();assert.equal(await manager.next(),false);assert.equal(await first,true);
  assert.deepEqual(events,['mount:4','lock:4','fadeOut','dispose:4','intro:5','mount:5','lock:5','fadeIn','unlock:5']);
  assert.equal(manager.currentStage.kind,'playable');assert.equal(manager.currentStage.title,'The Storm');assert.equal(await manager.next(),false);manager.dispose();
});

