import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Box3, Vector3, OrthographicCamera, Raycaster, Mesh, MeshStandardMaterial } from 'three';
import { stage5 } from '../src/stages/stage5.ts';
import { createGameState } from '../src/simulation/update.ts';
import { createStormWorldState, StormReactionController, STORM_SECONDS, STORM_QUIET_SECONDS, stormTravelerPose, stormPlayerPose, stormSafePlayerPose } from '../src/simulation/StormWorldState.ts';
import { questStatus, resolveQuestWord, refreshQuestAvailability, updateQuestPresentation } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { StormReactionView, stormLightning } from '../src/render/StormReactionView.ts';
import { stormProtection, stormRoofHeight, stormWindbreakX } from '../src/render/StormProtection.ts';
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
  for(const w of ['FIRE','RAIN','SHELTER','WARM','SAFE']){submit(w);tick(STORM_SECONDS[w.toLowerCase()]+.45);}
  const assistance=new AssistanceState({wordShards:10});
  let completed=0;const completion=new StageCompletionController(stage5.id,()=>completed++);
  submit('RESCUE');completion.check(s.quests,s.words);
  assert.equal(c.inputLocked,true);
  assert.notEqual(assistance.requestScan('R',new LetterGrid(stage5.id,stage5.grid,stage5.letterLayout),c.inputLocked),'');
  const original=structuredClone(s.player);
  for(let i=0;i<139;i++){tick(.1);completion.update(.1,c.isBusy,false);assert.equal(completed,0);}
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
  assert.equal(weather.root.geometry.drawRange.count,416);assert.equal(view.root.getObjectByName('storm-campfire').visible,false);
  const neutral=mat.material.color.clone();submit('FIRE');tick(4);view.update(s.storm);
  assert.ok(mat.material.color.equals(neutral));assert.equal(view.root.getObjectByName('storm-campfire').visible,true);
  submit('SHELTER');tick(4);submit('RAIN');tick(4);view.update(s.storm);weather.update(1,s.storm);
  assert.equal(weather.root.geometry.drawRange.count,672);
  const attr=weather.root.geometry.getAttribute('position');for(let i=0;i<384;i++)assert.ok(Math.abs(attr.getX(i))>3.9);
  submit('WARM');tick(5);view.update(s.storm);assert.ok(!mat.material.color.equals(neutral));
  submit('SAFE');tick(4);view.update(s.storm);assert.equal(view.root.getObjectByName('shelter-side-windbreak').visible,true);
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
  for(const w of ['RAIN','SHELTER','FIRE','WARM','SAFE']){submit(w);tick(STORM_SECONDS[w.toLowerCase()]+.45);}submit('RESCUE');
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

 test('rescue requires an outbound helper, acknowledgment, then following and arrival',()=>{
  const start={x:-3,z:4};
  assert.deepEqual([stormPlayerPose(0,start).x,stormPlayerPose(0,start).z],[-3,4]);
  const waiting=stormTravelerPose(.43),helper=stormPlayerPose(.43,start);
  assert.equal(waiting.walking,false);
  assert.ok(Math.hypot(helper.x-waiting.x,helper.z-waiting.z)<.001);
  for(const p of [.5,.6,.7,.8]) {
    const leader=stormPlayerPose(p,start),follower=stormTravelerPose(p);
    assert.ok(leader.z<follower.z || leader.x<follower.x);
    assert.equal(follower.walking,true);
  }
  assert.equal(stormTravelerPose(.9).walking,false);
  assert.equal(stormPlayerPose(1,start).walking,false);
});
test('shelter is cool and non-emissive, safe raises a wooden gate and masks side intrusion',()=>{
  const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage5,assets));
  const view=new StormReactionView(scene),weather=new StormWeatherView(),{state:s,submit,tick}=setup();
  submit('SHELTER');
  for(let i=0;i<34;i++) {tick(.1);view.update(s.storm);
    for(const name of ['sloped-weather-roof','front-post','rear-post','front-crossbeam','covered-ground'])
      assert.equal(scene.getObjectByName(name).material.emissiveIntensity,0);
  }
  for(const w of ['RAIN','FIRE','WARM']){submit(w);tick(STORM_SECONDS[w.toLowerCase()]+.45);}
  submit('SAFE');tick(4.2);view.update(s.storm);
  const flap=view.root.getObjectByName('safe-side-gate');assert.ok(flap.rotation.z>-Math.PI/2&&flap.rotation.z<0);
  tick(7.8);view.update(s.storm);weather.update(0,s.storm);assert.equal(flap.rotation.z,0);
  const a=weather.root.geometry.getAttribute('position');
  for(let i=264;i<288;i++)assert.ok(a.getX(i*2+1)<=stormWindbreakX(a.getZ(i*2+1))+1e-6);
  const fresh=setup();view.update(fresh.state.storm);assert.equal(flap.rotation.z,-Math.PI/2);assert.equal(fresh.state.storm.playerPose,null);
  view.dispose();weather.dispose();assets.dispose();
});

test('rescue presentation converges at varied frame rates without changing grid movement',()=>{
  const a=setup(),b=setup();
  for(const v of [a,b]) {
    for(const w of ['RAIN','SHELTER','FIRE','WARM','SAFE']) {v.submit(w);v.tick(STORM_SECONDS[w.toLowerCase()]+.45);}
    v.state.storm.rescueStart={x:2.4,z:-1};v.submit('RESCUE');
  }
  a.tick(10);for(let i=0;i<600;i++)b.tick(1/60);
  for(const key of ['x','y','z','heading'])assert.ok(Math.abs(a.state.storm.playerPose[key]-b.state.storm.playerPose[key])<1e-8);
  assert.deepEqual(a.state.player,b.state.player);
  assert.equal(a.state.storm.travelerRescued,false);
  a.tick(4.45);assert.equal(a.state.storm.travelerRescued,true);assert.equal(a.controller.isBusy,false);
});

test('roof unrolls with its rain mask and restores the original mesh on disposal',()=>{
  const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage5,assets));
  const roof=scene.getObjectByName('sloped-weather-roof'),position=roof.position.clone(),scale=roof.scale.clone();
  const view=new StormReactionView(scene),weather=new StormWeatherView(),{state:s}=setup();
  try {
    let previousWidth=0;
    for(const progress of [0,.2,.4,.6,.8,1]) {
      s.storm.progress.shelter=progress;view.update(s.storm);weather.update(0,s.storm);scene.updateMatrixWorld(true);
      const edge=stormProtection(progress,0).roofEdge;
      assert.ok(roof.scale.x>=previousWidth);previousWidth=roof.scale.x;
      const center=roof.getWorldPosition(new Vector3());assert.ok(Math.abs(center.x+roof.scale.x/2-edge)<1e-9);
      assert.ok(Math.abs(view.root.getObjectByName('rolling-roof-canvas').position.x-edge)<1e-9);
      let belowRoof=0;
      const a=weather.root.geometry.getAttribute('position');
      for(let i=64;i<112;i++) {
        const x=a.getX(i*2),z=a.getZ(i*2),y=a.getY(i*2+1);
        if(x<=edge)assert.ok(y>=stormRoofHeight(z)-1e-6,'rain leaks through deployed canvas');
        else if(y<stormRoofHeight(z))belowRoof++;
      }
      if(progress===0)assert.ok(belowRoof>10,'open roof must visibly admit rain');
      if(progress===1)assert.equal(belowRoof,0);
    }
    s.storm.progress.shelter=0;view.update(s.storm);assert.ok(roof.scale.x<1);
  } finally {view.dispose();weather.dispose();assert.deepEqual(roof.position,position);assert.deepEqual(roof.scale,scale);assets.dispose();}
});
test('SAFE locks input through approach, raising, latch, gust and return before unlocking RESCUE',()=>{
  const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage5,assets));
  const view=new StormReactionView(scene),{state:s,controller:c,submit,tick}=setup();
  for(const word of ['RAIN','SHELTER','FIRE','WARM']){submit(word);tick(5);}
  const original=structuredClone(s.player);s.storm.safeStart={x:1,z:2,heading:.7};
  submit('SAFE');assert.equal(c.inputLocked,true);
  tick(3.36);view.update(s.storm);assert.ok(Math.abs(s.storm.playerPose.z+3.03)<1e-8);
  tick(1.8);view.update(s.storm);assert.equal(view.root.getObjectByName('safe-side-gate').rotation.z,0);
  assert.equal(submit('RESCUE').reason,'LOCKED');
  tick(1.08);view.update(s.storm);assert.equal(view.root.getObjectByName('safe-locking-bolt').position.x,1.08);
  tick(2);view.update(s.storm);
  for(const branch of view.root.children.filter(n=>n.name==='storm-stopped-branch'))assert.ok(branch.position.x<-3.2);
  assert.equal(c.inputLocked,true);assert.equal(submit('RESCUE').reason,'LOCKED');
  tick(3.76);assert.equal(s.storm.progress.safe,1);
  assert.deepEqual([s.storm.playerPose.x,s.storm.playerPose.z,s.storm.playerPose.heading],[1,2,.7]);
  assert.equal(submit('RESCUE').reason,'LOCKED');tick(.45);
  assert.equal(c.inputLocked,false);assert.equal(s.storm.playerPose,null);assert.deepEqual(s.player,original);
  assert.equal(submit('RESCUE').status,'CORRECT');view.dispose();assets.dispose();
});

test('deploying roof and attached windbreak leave the full letter board readable',()=>{
  const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage5,assets));
  const view=new StormReactionView(scene);scene.add(view.root);
  const grid=new LetterGrid(stage5.id,stage5.grid,stage5.letterLayout),{state:s}=setup();
  const camera=new OrthographicCamera(-7,7,6.5,-6.5,.1,100);
  camera.position.set(...stage5.camera.position);camera.lookAt(...stage5.camera.target);camera.updateMatrixWorld();
  const direction=camera.getWorldDirection(new Vector3());
  try {
    for(let frame=0;frame<=40;frame++) {
      s.storm.progress.shelter=Math.min(1,frame/20);s.storm.progress.safe=Math.max(0,(frame-20)/20);
      s.storm.elapsed=frame*.17;view.update(s.storm);scene.updateMatrixWorld(true);
      for(const tile of grid.tiles)for(const dx of [-.4,0,.4])for(const dz of [-.4,0,.4]) {
        const point=new Vector3(tile.worldPosition.x+dx,.115,tile.worldPosition.z+dz);
        const ray=new Raycaster(point.clone().addScaledVector(direction,-40),direction,0,39.99);
        assert.equal(ray.intersectObject(scene,true).length,0,'cloth obscures '+tile.id+' at frame '+frame);
      }
    }
    // The front return makes the protection readable without a diagonal panel in the room.
    const panel=view.root.getObjectByName('safe-front-plank');
    const a=panel.localToWorld(new Vector3(-.5,0,0)).project(camera);
    const b=panel.localToWorld(new Vector3(.5,0,0)).project(camera);
    assert.ok(Math.abs(b.x-a.x)>.09,'side canvas too narrow in the fixed camera');
  } finally {view.dispose();assets.dispose();}
});

test('SAFE stays attached to the left posts and runoff stays outside the resting floor',()=>{
  const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage5,assets));
  const view=new StormReactionView(scene),weather=new StormWeatherView(),{state:s}=setup();scene.add(view.root);
  s.storm.progress.shelter=1;s.storm.progress.safe=1;view.update(s.storm);weather.update(0,s.storm);scene.updateMatrixWorld(true);
  const gate=view.root.getObjectByName('safe-side-gate');
  for(const z of [0,1.57]) {
    const corner=gate.localToWorld(new Vector3(0,0,z));
    assert.ok(Math.abs(corner.x+2.95)<1e-9);
    assert.ok(Math.min(Math.abs(corner.z+5.15),Math.abs(corner.z+3.58))<1e-9);
  }
  assert.equal(view.root.getObjectByName('windbreak-canvas'),undefined);
  const a=weather.root.geometry.getAttribute('position');
  for(let i=112;i<136;i++)assert.ok(a.getX(i*2)<-3.2||a.getX(i*2)>2.2,'runoff inside shelter floor');
  view.dispose();weather.dispose();assets.dispose();
});

test('SAFE gust is stopped outside, stays stopped, and resets for another visit',()=>{
  const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage5,assets));
  const view=new StormReactionView(scene),{state:s}=setup();s.storm.progress.shelter=1;
  for(let frame=0;frame<=100;frame++) {
    s.storm.progress.safe=.54+.46*frame/100;s.storm.elapsed=frame/60;view.update(s.storm);
    for(const branch of view.root.children.filter(n=>n.name==='storm-stopped-branch')) {
      if(!branch.visible)continue;
      const bounds=new Box3().setFromObject(branch);
      assert.ok(bounds.max.x<-3.01,'branch passes through closed panel');
    }
  }
  const old=setup(),fresh=setup();
  for(const run of [old,fresh]) {
    for(const word of ['RAIN','SHELTER','FIRE','WARM']){run.submit(word);run.tick(5);}
    run.state.storm.safeStart={x:2,z:3,heading:1};run.submit('SAFE');
  }
  old.tick(7);for(let i=0;i<420;i++)fresh.tick(1/60);
  for(const axis of ['x','y','z'])assert.ok(Math.abs(old.state.storm.playerPose[axis]-fresh.state.storm.playerPose[axis])<1e-8);
  const reset=setup();view.update(reset.state.storm);
  assert.equal(view.root.getObjectByName('safe-locking-bolt').visible,false);
  assert.equal(view.root.getObjectByName('safe-player-hands').visible,false);
  assert.equal(reset.controller.inputLocked,false);assert.equal(reset.state.storm.playerPose,null);
  view.dispose();assets.dispose();
});
