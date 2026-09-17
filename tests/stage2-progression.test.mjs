import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Raycaster, Vector3 } from 'three';
import { stage2 } from '../src/stages/stage2.ts';
import { stage1 } from '../src/stages/stage1.ts';
import { createGameState } from '../src/simulation/update.ts';
import { createForestWorldState, ForestReactionController } from '../src/simulation/ForestWorldState.ts';
import { createForestTraversal, requestStageMovement, updateStageMovement, isOnLetterGrid, traversalPose } from '../src/simulation/ForestTraversal.ts';
import { questStatus, resolveQuestWord, refreshQuestAvailability, updateQuestPresentation } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { ForestReactionView } from '../src/render/ForestReactionView.ts';
import { RiverView } from '../src/render/RiverView.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';

function setup() {
 const s=createGameState(stage2.playerStart,stage2.grid,stage2.quests);
 s.forest=createForestWorldState(s.words); s.traversal=createForestTraversal(stage2);
 const c=new ForestReactionController(s.forest), events=[];
 const submit=word=>resolveQuestWord(s.quests,s.words,{word,selectedTileIds:[],path:[]},createQuestValidator(s.quests.definitions,s.words),id=>{events.push(id);c.onQuestCompleted(id);});
 const tick=dt=>{ c.update(dt);refreshQuestAvailability(s.quests,s.words);updateQuestPresentation(s.quests,dt); };
 return {s,c,submit,tick,events};
}
const direction={east:{x:1,z:0},west:{x:-1,z:0},north:{x:0,z:-1},south:{x:0,z:1}};
function move(s,dir) { assert.equal(requestStageMovement(s,direction[dir],stage2),true,`${s.traversal.current} -> ${dir}`);updateStageMovement(s,.18); }

test('initial hidden locks, both material orders, Hint gates, construction completion and one-time NEW QUEST',()=>{
 for (const order of [['WOOD','ROPE'],['ROPE','WOOD']]) {
  const {s,c,submit,tick}=setup(), a=new AssistanceState({wordShards:20});
  assert.deepEqual(s.quests.definitions.map(q=>questStatus(q,s.words)),['AVAILABLE','AVAILABLE','AVAILABLE','AVAILABLE','LOCKED','LOCKED']);
  assert.equal(s.quests.discoveredIds.length,4);
  for(const word of ['BRIDGE','CLIMB']) {
   assert.equal(submit(word).reason,'LOCKED');
   s.quests.focusedIndex=stage2.vocabulary.indexOf(word); assert.ok(a.requestHint(s.quests,s.words,false));
  }
  assert.equal(a.wordShards,20);
  submit(order[0]);tick(1);assert.equal(submit('BRIDGE').status,'WRONG');
  submit(order[1]); assert.equal(questStatus(s.quests.definitions[4],s.words),'AVAILABLE');
  assert.equal(s.quests.presentations.length,1);tick(3.5);
  s.quests.focusedIndex=4;assert.equal(a.requestHint(s.quests,s.words,false),'');
  assert.equal(submit('BRIDGE').status,'CORRECT');tick(4.79);
  assert.equal(s.forest.conditions.bridgeBuilt,false);assert.equal(submit('CLIMB').reason,'LOCKED');
  tick(.01);assert.equal(s.forest.conditions.bridgeBuilt,true);assert.equal(c.isBusy,false);
  assert.equal(questStatus(s.quests.definitions[5],s.words),'AVAILABLE');
  assert.deepEqual(s.quests.presentations.map(p=>p.questId),['forest-climb']);
  tick(3.5);tick(1);assert.equal(s.quests.discoveredIds.length,6);assert.equal(s.quests.presentations.length,0);
  s.quests.focusedIndex=5;assert.equal(a.requestHint(s.quests,s.words,false),'');
 }
});

test('safe crossing, grid return, far-side routes, climb gate, summit height and invalid moves',()=>{
 const {s,submit,tick}=setup();s.player.currentTile={...s.traversal.entry};
 assert.equal(requestStageMovement(s,direction.east,stage2),false);
 submit('WOOD');submit('ROPE');submit('BRIDGE');tick(4.79);
 assert.equal(requestStageMovement(s,direction.east,stage2),false);tick(.01);
 assert.equal(requestStageMovement(s,direction.east,stage2,true),false);
 assert.equal(requestStageMovement(s,{x:1,z:1},stage2),false);
 assert.equal(requestStageMovement(s,direction.east,stage2),true);
 assert.equal(isOnLetterGrid(s),false);assert.equal(requestStageMovement(s,direction.east,stage2),false);
 updateStageMovement(s,.09);assert.ok(traversalPose(s).x>.5);updateStageMovement(s,.09);
 for(let i=0;i<7;i++) move(s,'east');
 assert.equal(s.traversal.current,'root-foot');
 assert.equal(requestStageMovement(s,direction.north,stage2),false);
 move(s,'east');move(s,'south');move(s,'west');move(s,'north');
 assert.equal(s.traversal.current,'root-foot');
 submit('CLIMB');tick(2.79);assert.equal(requestStageMovement(s,direction.north,stage2),false);tick(.01);
 let last=.25;
 for(let i=0;i<7;i++) {move(s,'north'); const p=traversalPose(s);assert.ok(p.y>=last);last=p.y;}
 assert.equal(s.traversal.current,'summit');assert.equal(last,1.65);
 assert.equal(requestStageMovement(s,direction.north,stage2),false);
 for(let i=0;i<7;i++) move(s,'south');
 for(let i=0;i<8;i++) move(s,'west');
 assert.equal(isOnLetterGrid(s),true);assert.deepEqual(s.player.currentTile,s.traversal.entry);
 move(s,'west');assert.equal(s.player.currentTile.column,5);
});

test('completion waits for final reactions, duplicate submissions/events do not replay, reset is fresh',()=>{
 const {s,c,submit,tick,events}=setup();let complete=0;
 const completion=new StageCompletionController(stage2.id,()=>complete++);
 for (const word of ['TREE','WOOD','ROPE','RIVER','BRIDGE']) submit(word);
 tick(4.8);submit('CLIMB');completion.check(s.quests,s.words);
 completion.update(10,c.isBusy,false);assert.equal(complete,0);
 tick(2.79);completion.update(10,c.isBusy,false);assert.equal(complete,0);
 tick(.01);completion.update(.29,c.isBusy,false);assert.equal(complete,0);
 completion.update(.01,c.isBusy,false);assert.equal(complete,1);
 const before=JSON.stringify(s.forest);
 for (const word of stage2.vocabulary) { assert.equal(submit(word).status,'ALREADY_COMPLETED');c.onQuestCompleted(`forest-${word.toLowerCase()}`); }
 tick(10);assert.equal(JSON.stringify(s.forest),before);assert.equal(events.length,6);
 completion.update(10,false,false);assert.equal(complete,1);
 const fresh=setup();assert.ok(Object.values(fresh.s.forest.progress).every(p=>p===0));
 assert.equal(fresh.s.forest.conditions.bridgeBuilt,false);assert.equal(fresh.s.quests.discoveredIds.length,4);
 assert.deepEqual(fresh.s.words.completedWords,[]);assert.equal(fresh.s.traversal.current,'grid');
});

test('visual reactions consume the same planks, keep mesh count bounded, and reconstruct final state',()=>{
 const {s,submit,tick}=setup(),assets=new PrimitiveAssets(), environment=createDiorama(stage2,assets);
 const view=new ForestReactionView(assets,stage2,environment);
 try {
  view.update(s.forest);const count=view.root.children.length;
  assert.equal(view.root.getObjectByName('bridge-plank-0').visible,false);
  submit('TREE');tick(.3);view.update(s.forest);assert.notEqual(environment.getObjectByName('forest-tree').rotation.z,0);
  submit('WOOD');submit('ROPE');tick(1);view.update(s.forest);
  const plank=view.root.getObjectByName('bridge-plank-0');assert.equal(plank.visible,true);const spawn=plank.position.clone();
  submit('BRIDGE');tick(2.4);view.update(s.forest);assert.ok(plank.position.distanceTo(spawn)>.2);
  tick(2.4);submit('CLIMB');tick(2.8);view.update(s.forest);
  assert.equal(view.root.children.length,count);assert.ok(view.root.getObjectByName('root-step-6').visible);
  const rebuilt=new ForestReactionView(assets,stage2,environment);rebuilt.update(s.forest);
  assert.deepEqual(rebuilt.root.getObjectByName('bridge-plank-0').position.toArray(),plank.position.toArray());
  rebuilt.dispose();
 } finally {view.dispose();assets.dispose();}
});

test('bridge and root route nodes have visible supporting surfaces; new geometry avoids letters',()=>{
 const {s,submit,tick}=setup(),assets=new PrimitiveAssets(),environment=createDiorama(stage2,assets);
 const view=new ForestReactionView(assets,stage2,environment),scene=new Group();scene.add(environment,view.root);
 try {
  for(const word of stage2.vocabulary){submit(word);tick(5);}view.update(s.forest);scene.updateMatrixWorld(true);
  const ray=new Raycaster();
  for(const node of Object.values(s.traversal.nodes)) {
   ray.set(new Vector3(node.x,node.y+3,node.z),new Vector3(0,-1,0));
   const hit=ray.intersectObject(scene,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});
   assert.ok(hit,`missing surface ${node.id}`);assert.ok(Math.abs(hit.point.y-node.y)<.14,`height mismatch ${node.id}: ${hit.point.y}/${node.y}`);
  }
  const dir=new Vector3(...stage2.camera.target).sub(new Vector3(...stage2.camera.position)).normalize();
  for(let row=0;row<7;row++) for(let col=0;col<7;col++) {
   const point=new Vector3(-2.5+col-3,.11,row-3);ray.set(point.clone().addScaledVector(dir,-30),dir);ray.far=29.99;
   assert.equal(ray.intersectObject(view.root,true).filter(h=>h.object.visible).length,0,`letter occlusion ${row},${col}`);
  }
 } finally {view.dispose();assets.dispose();}
});

test('RIVER emphasis changes currents temporarily without affecting movement; Stage 1 remains grid-only',()=>{
 const river=new RiverView(stage2.forestBlockout);
 try {
  const flow=river.root.getObjectByName('river-flow-highlights');river.update(.5,1);assert.ok(flow.material.opacity>.5);
  river.update(.5,0);assert.equal(flow.material.opacity,.23);
  const s=createGameState(stage1.playerStart,stage1.grid,stage1.quests);s.player.currentTile={row:4,column:6};
  assert.equal(requestStageMovement(s,direction.east,stage1),false);assert.equal(s.forest,undefined);
 } finally {river.dispose();}
});
