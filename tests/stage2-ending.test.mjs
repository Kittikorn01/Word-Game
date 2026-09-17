import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Raycaster, Vector3, OrthographicCamera, Box3 } from 'three';
import { stage2 } from '../src/stages/stage2.ts';
import { createGameState, requestMovement, updateMovement } from '../src/simulation/update.ts';
import { createForestWorldState } from '../src/simulation/ForestWorldState.ts';
import { createForestTraversal } from '../src/simulation/ForestTraversal.ts';
import { ForestEndingController, ENDING_SPEED } from '../src/simulation/ForestEndingController.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { ForestReactionView } from '../src/render/ForestReactionView.ts';
import { createDiorama } from '../src/render/createDiorama.ts';

function ready() {
 const s=createGameState(stage2.playerStart,stage2.grid,stage2.quests);
 s.forest=createForestWorldState(s.words);s.traversal=createForestTraversal(stage2);
 s.words.completedWords=[...stage2.vocabulary];s.forest.conditions.bridgeBuilt=true;s.forest.conditions.climbRouteOpen=true;
 return s;
}
test('CLIMB first does not strand unfinished words; readiness waits for reactions, feedback and a committed step',()=>{
 const s=ready(),e=new ForestEndingController(stage2);
 s.words.completedWords=s.words.completedWords.filter(w=>w!=='TREE');assert.equal(e.tryStart(s,false),false);assert.equal(e.inputLocked,false);
 s.words.completedWords=[...stage2.vocabulary];s.forest.conditions.climbRouteOpen=false;assert.equal(e.tryStart(s,false),false);
 s.forest.conditions.climbRouteOpen=true;assert.equal(e.tryStart(s,true),false);
 requestMovement(s,{x:1,z:0},stage2.grid);assert.equal(e.tryStart(s,false),false);updateMovement(s,.18);
 assert.equal(e.tryStart(s,false),true);assert.equal(e.inputLocked,true);assert.equal(e.tryStart(s,false),false);
 e.update(NaN);e.update(-1);assert.equal(e.state.phase,'lead');
});
test('all 49 grid starts walk through the bridge and root waypoints without teleporting or rewriting gameplay',()=>{
 for(let row=0;row<7;row++)for(let column=0;column<7;column++) {
  const s=ready();s.player.currentTile={row,column};const before=JSON.stringify({player:s.player,traversal:s.traversal});
  const e=new ForestEndingController(stage2);assert.equal(e.tryStart(s,false),true);
  assert.deepEqual(e.state.pose,{x:column-5.5,y:0,z:row-3});
  const expected=['landing','span-0','span-1','span-2','span-3','span-4','far-bank','root-foot','root-1','root-2','root-3','root-4','root-5','root-6','summit'];
  for(const id of expected)assert.ok(e.state.waypoints.some(p=>p.x===s.traversal.nodes[id].x&&p.z===s.traversal.nodes[id].z),id);
  for(let n=0;n<1500&&!e.isFinished;n++) {
   const previous={...e.state.pose};e.update(1/60);
   assert.ok(Math.hypot(e.state.pose.x-previous.x,e.state.pose.y-previous.y,e.state.pose.z-previous.z)<=ENDING_SPEED/60+1e-8);
  }
  assert.equal(e.isFinished,true);assert.equal(e.inputLocked,true);
  const summit=s.traversal.nodes.summit;assert.deepEqual(e.state.pose,{x:summit.x,y:summit.y,z:summit.z});
  assert.equal(JSON.stringify({player:s.player,traversal:s.traversal}),before);
 }
});
test('ending can start safely from every existing traversal node; timing is frame-rate independent',()=>{
 for(const id of Object.keys(ready().traversal.nodes).filter(id=>id!=='grid')) {
  const s=ready();s.traversal.current=id;
  const a=new ForestEndingController(stage2),b=new ForestEndingController(stage2);
  assert.equal(a.tryStart(s,false),true);assert.equal(b.tryStart(s,false),true);
  a.update(20);for(let i=0;i<1200;i++)b.update(1/60);
  assert.equal(a.isFinished,true,id);assert.equal(b.isFinished,true,id);assert.deepEqual(a.state.pose,b.state.pose);
  assert.equal(a.state.pose.y,1.65);assert.equal(a.state.pose.z,-1.15);
 }
});
test('the existing completion overlay waits until summit arrival plus a 0.75-second pause, once only',()=>{
 const s=ready(),e=new ForestEndingController(stage2);let completed=0;
 const c=new StageCompletionController(stage2.id,()=>completed++);c.check(s.quests,s.words);
 c.update(20,!e.isFinished,false);assert.equal(completed,0);e.tryStart(s,false);
 let arrivalTime=null,now=0;
 while(!completed&&now<20) {
  e.update(.01);now+=.01;if(e.state.phase==='arrival'&&arrivalTime===null)arrivalTime=now;
  c.update(.01,!e.isFinished,false);
  if(e.state.phase==='walking'||e.state.phase==='lead')assert.equal(completed,0);
 }
 assert.equal(completed,1);assert.ok(now-arrivalTime>=.73&&now-arrivalTime<=.76);
 c.update(10,false,false);e.update(10);assert.equal(completed,1);assert.equal(e.inputLocked,true);
 const fresh=new ForestEndingController(stage2);assert.equal(fresh.inputLocked,false);assert.equal(fresh.state.pose,null);
});

test('wood has distinct grain/edges; narrow rope bridge assembles existing boards and consumes the coil',()=>{
 const assets=new PrimitiveAssets(),scene=createDiorama(stage2,assets),v=new ForestReactionView(assets,stage2,scene),s=ready().forest;
 try {
  s.hasWood=s.hasRope=true;s.progress.wood=s.progress.rope=1;v.update(s);const count=[];v.root.traverse(o=>count.push(o));
  const boards=Array.from({length:12},(_,i)=>v.root.getObjectByName(`bridge-plank-${i}`));
  const starts=boards.map(b=>b.position.clone());
  for(const b of boards) {
   assert.ok(b.scale.z/b.scale.x>3);assert.ok(b.getObjectByName('wood-grain'));assert.ok(b.getObjectByName('wood-knot'));
   assert.notEqual(b.material[0].color.getHex(),b.material[2].color.getHex());
  }
  s.bridgeStarted=true;s.progress.bridge=.3;v.update(s);
  assert.ok(boards[0].position.distanceTo(starts[0])>.5);assert.ok(boards[11].position.distanceTo(starts[11])<.1);
  s.progress.bridge=1;v.update(s);v.root.updateMatrixWorld(true);
  for(let i=1;i<12;i++) {
   const left=new Box3().setFromObject(boards[i-1]),right=new Box3().setFromObject(boards[i]);
   assert.ok(right.min.x-left.max.x>.015,'readable plank gaps');assert.ok(right.max.z-right.min.z<1,'narrow deck');
  }
  const all=[];v.root.traverse(o=>all.push(o));assert.equal(all.filter(o=>o.name==='bridge-post-extension').length,4);
  assert.equal(all.filter(o=>o.name==='bridge-rope').length,16);assert.equal(all.filter(o=>o.name==='bridge-rope-hanger').length,10);
  for(const coil of all.filter(o=>o.geometry?.type==='TorusGeometry'&&o.name!=='wood-knot'))assert.equal(coil.parent.visible,false);
  const final=boards.map(b=>b.position.toArray());v.update(s);assert.deepEqual(boards.map(b=>b.position.toArray()),final);assert.equal(all.length,count.length);
 }finally{v.dispose();assets.dispose();}
});

test('ending route stays on supporting geometry and within the unchanged desktop/narrow camera',()=>{
 const s=ready(),e=new ForestEndingController(stage2),assets=new PrimitiveAssets(),environment=createDiorama(stage2,assets),v=new ForestReactionView(assets,stage2,environment);
 const scene=new Group();scene.add(environment,v.root);
 Object.assign(s.forest,{hasWood:true,hasRope:true,bridgeStarted:true,climbStarted:true});for(const key in s.forest.progress)s.forest.progress[key]=1;
 v.update(s.forest);scene.updateMatrixWorld(true);e.tryStart(s,false);
 const ray=new Raycaster(),samples=[];
 try {
  while(!e.isFinished){e.update(1/60);samples.push({...e.state.pose});}
  for(const p of samples){
   if(p.x<1.1)continue;
   ray.set(new Vector3(p.x,4,p.z),new Vector3(0,-1,0));
   const hit=ray.intersectObject(scene,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});
   assert.ok(hit,`missing surface at ${JSON.stringify(p)}`);
   assert.ok(hit.point.y-p.y<.12&&p.y-hit.point.y<.3,`route/support gap ${JSON.stringify(p)} vs ${hit.point.y}`);
  }
  for(const aspect of [16/9,390/844]){
   const span=Math.max(stage2.camera.verticalSpan,stage2.camera.minimumWidth/aspect),camera=new OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,100);
   camera.position.set(...stage2.camera.position);camera.lookAt(...stage2.camera.target);camera.updateMatrixWorld(true);
   for(const p of samples){const ndc=new Vector3(p.x,p.y+1.2,p.z).project(camera);assert.ok(Math.abs(ndc.x)<.98&&Math.abs(ndc.y)<.98);}
  }
 }finally{v.dispose();assets.dispose();}
});
