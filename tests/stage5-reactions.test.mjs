import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Box3, Vector3, OrthographicCamera, Raycaster, Mesh, MeshStandardMaterial } from 'three';
import { stage5 } from '../src/stages/stage5.ts';
import { createGameState } from '../src/simulation/update.ts';
import { createStormWorldState, StormReactionController, STORM_SECONDS, STORM_QUIET_SECONDS, stormTravelerPose } from '../src/simulation/StormWorldState.ts';
import { questStatus, resolveQuestWord, refreshQuestAvailability, updateQuestPresentation } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { StormReactionView, stormLightning } from '../src/render/StormReactionView.ts';
import { StormWeatherView } from '../src/render/StormWeatherView.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
const setup=()=>{
  const state=createGameState(stage5.playerStart,stage5.grid,stage5.quests);
  const controller=new StormReactionController(state.storm=createStormWorldState(state.words),state.words);
  const validate=createQuestValidator(state.quests.definitions,state.words);
  const submit=word=>resolveQuestWord(state.quests,state.words,{word,selectedTileIds:[]},validate,controller.onQuestCompleted);
  const tick=dt=>{controller.update(dt);refreshQuestAvailability(state.quests,state.words);};
  return {state,controller,submit,tick};
};
const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(rest=>[v,...rest])):[[]];
for(const order of permutations(['RAIN','SHELTER','FIRE'])) test('storm queued reactions and delayed unlock: '+order.join(', '),()=>{
  const {state:s,controller:c,submit,tick}=setup();
  for(const word of order)assert.equal(submit(word).status,'CORRECT');
  const snapshot=()=>JSON.stringify({requested:s.storm.requested,queue:s.storm.queue,progress:s.storm.progress});
  const before=snapshot();assert.equal(submit(order[0]).status,'ALREADY_COMPLETED');assert.equal(snapshot(),before);
  for(const word of order){const key=word.toLowerCase();tick(STORM_SECONDS[key]-.01);assert.equal(questStatus(s.quests.definitions[3],s.words),'LOCKED');assert.equal(s.quests.presentations.length,0);assert.equal(c.notificationsHeld,true);tick(.01);assert.equal(s.storm.progress[key],1);}
  tick(.3);assert.equal(questStatus(s.quests.definitions[3],s.words),'LOCKED');
  assert.equal(submit('WARM').reason,'LOCKED');tick(.15);
  assert.equal(questStatus(s.quests.definitions[3],s.words),'AVAILABLE');assert.equal(c.notificationsHeld,false);
  assert.deepEqual(s.quests.presentations.map(p=>p.questId),['storm-warm']);
  assert.ok(s.storm.rainIntensified&&s.storm.shelterHighlighted&&s.storm.fireLit);
  for(const [word,next] of [['WARM','SAFE'],['SAFE','RESCUE']]) {
    while(s.quests.presentations.length)updateQuestPresentation(s.quests,4);
    assert.equal(submit(word).status,'CORRECT');tick(STORM_SECONDS[word.toLowerCase()]);
    assert.equal(submit(next).reason,'LOCKED');assert.equal(s.quests.presentations.length,0);
    tick(.44);assert.equal(submit(next).reason,'LOCKED');tick(.01);
    assert.equal(questStatus(s.quests.definitions.find(q=>q.targetWord===next),s.words),'AVAILABLE');
    assert.deepEqual(s.quests.presentations.map(p=>p.questId),['storm-'+next.toLowerCase()]);
  }
  assert.equal(s.storm.travelerVisible,true);assert.equal(s.storm.travelerRescued,false);
  assert.deepEqual([s.storm.traveler.x,s.storm.traveler.z],[4.9,5.25]);
});
test('storm rescue blocks completion until arrival, final pulse and quiet; repeat events never restart; reset is fresh',()=>{
  const {state:s,controller:c,submit,tick}=setup();
  for(const w of ['FIRE','RAIN','SHELTER','WARM','SAFE']){submit(w);tick(5);}
  const assistance=new AssistanceState({wordShards:10});
  let completed=0;const completion=new StageCompletionController(stage5.id,()=>completed++);
  submit('RESCUE');completion.check(s.quests,s.words);
  assert.equal(c.inputLocked,true);
  assert.notEqual(assistance.requestScan('R',new LetterGrid(stage5.id,stage5.grid,stage5.letterLayout),c.inputLocked),'');
  const original=structuredClone(s.player);
  for(let i=0;i<79;i++){tick(.1);completion.update(.1,c.isBusy,false);assert.equal(completed,0);}
  tick(.1);assert.equal(s.storm.travelerRescued,true);assert.equal(s.storm.traveler.walking,false);
  assert.deepEqual([s.storm.traveler.x,s.storm.traveler.z],[-.3,-3.55]);
  completion.update(10,c.isBusy,false);assert.equal(completed,0);
  tick(.45);completion.update(.29,c.isBusy,false);assert.equal(completed,0);completion.update(.01,c.isBusy,false);assert.equal(completed,1);
  const before=structuredClone(s.storm);c.onQuestCompleted('storm-rescue');assert.deepEqual(s.storm,before);
  completion.update(100,false,false);assert.equal(completed,1);assert.deepEqual(s.player,original);
  const fresh=setup();assert.equal(fresh.controller.isBusy,false);assert.equal(fresh.controller.inputLocked,false);
  assert.ok(Object.values(fresh.state.storm.progress).every(v=>v===0));assert.equal(fresh.state.storm.travelerVisible,false);
  assert.deepEqual(fresh.state.words.reactionHeldWords,['WARM','SAFE','RESCUE']);
});
test('storm animation state agrees across large/small steps and rejects duplicate/unaccepted events',()=>{
  const a=setup(),b=setup();
  a.controller.onQuestCompleted('storm-rescue');assert.equal(a.controller.inputLocked,false);
  for(const v of [a,b])for(const w of ['RAIN','FIRE','SHELTER'])v.submit(w);
  a.tick(10);for(let i=0;i<600;i++)b.tick(1/60);
  assert.deepEqual(a.state.storm.progress,b.state.storm.progress);
  assert.deepEqual(a.state.words.reactionHeldWords,b.state.words.reactionHeldWords);
  for(const dt of [NaN,Infinity,-1,0])a.tick(dt);
  assert.equal(a.state.storm.active,null);
  assert.equal(stormLightning(0),0);assert.equal(stormLightning(1),0);assert.ok(stormLightning(.47)>.99);
});
test('storm visuals are idempotent, retain independent after-states and restore/dispose local resources',()=>{
  const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage5,assets));
  const mat=scene.getObjectByName('resting-mat'),original=mat.material;
  const view=new StormReactionView(scene);scene.add(view.root);const weather=new StormWeatherView();
  const {state:s,submit,tick}=setup();view.update(s.storm);weather.update(0,s.storm);
  assert.equal(weather.root.geometry.drawRange.count,128);assert.equal(view.root.getObjectByName('storm-campfire').visible,false);
  const neutral=mat.material.color.clone();submit('FIRE');tick(4);view.update(s.storm);
  assert.ok(mat.material.color.equals(neutral));assert.equal(view.root.getObjectByName('storm-campfire').visible,true);
  submit('SHELTER');tick(4);submit('RAIN');tick(4);view.update(s.storm);weather.update(1,s.storm);
  assert.equal(weather.root.geometry.drawRange.count,384);
  const attr=weather.root.geometry.getAttribute('position');for(let i=0;i<384;i++)assert.ok(Math.abs(attr.getX(i))>3.9);
  submit('WARM');tick(5);view.update(s.storm);assert.ok(!mat.material.color.equals(neutral));
  submit('SAFE');tick(4);view.update(s.storm);assert.equal(view.root.getObjectByName('protected-ground-edge').visible,true);
  const transforms=()=>{const out=[];scene.traverse(n=>out.push([n.name,...n.position.toArray(),...n.scale.toArray(),...n.rotation.toArray()]));return out;};
  const before=transforms();view.update(s.storm);assert.deepEqual(transforms(),before);
  let disposed=0;const resources=new Set();scene.traverse(n=>{if(n instanceof Mesh){resources.add(n.geometry);if(n.material instanceof MeshStandardMaterial)resources.add(n.material);}});
  for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  view.dispose();assert.equal(mat.material,original);assert.ok(disposed>0);assert.equal(view.root.parent,null);
  weather.dispose();assets.dispose();
});
test('traveler and reaction geometry stay clear of all letters throughout rescue in fixed desktop/narrow/16:9 frames',()=>{
  const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage5,assets));const view=new StormReactionView(scene);scene.add(view.root);
  const grid=new LetterGrid(stage5.id,stage5.grid,stage5.letterLayout),{state:s,submit,tick}=setup();
  for(const w of ['RAIN','SHELTER','FIRE','WARM','SAFE']){submit(w);tick(5);}submit('RESCUE');
  try {
    for(let frame=0;frame<=60;frame++) {
      const p=frame/60;s.storm.progress.rescue=p;s.storm.traveler=stormTravelerPose(p);view.update(s.storm);scene.updateMatrixWorld(true);
      const traveler=view.root.getObjectByName('storm-traveler');const box=new Box3().setFromObject(traveler);
      for(const aspect of [1440/900,390/844,16/9]) {
        const span=Math.max(stage5.camera.verticalSpan,stage5.camera.minimumWidth/aspect),camera=new OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,100);
        camera.position.set(...stage5.camera.position);camera.lookAt(...stage5.camera.target);camera.updateMatrixWorld();
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new Vector3(x,y,z).project(camera);assert.ok(Math.abs(v.x)<.96&&Math.abs(v.y)<.96,'traveler clipped');}
        const direction=camera.getWorldDirection(new Vector3());
        for(const tile of grid.tiles)for(const dx of [-.4,0,.4])for(const dz of [-.4,0,.4]) {
          const point=new Vector3(tile.worldPosition.x+dx,.115,tile.worldPosition.z+dz);
          const ray=new Raycaster(point.clone().addScaledVector(direction,-40),direction,0,39.99);
          assert.equal(ray.intersectObject(scene,true).length,0,'obscured '+tile.id+' at '+p);
        }
      }
    }
  } finally{view.dispose();assets.dispose();}
});
