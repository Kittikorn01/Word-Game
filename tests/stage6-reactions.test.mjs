import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3, OrthographicCamera, Raycaster, Box3 } from 'three';
import { stage6 } from '../src/stages/stage6.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { createGameState } from '../src/simulation/update.ts';
import { resolveQuestWord, questStatus, refreshQuestAvailability } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { createArchiveWorldState, ArchiveReactionController, ARCHIVE_SECONDS } from '../src/simulation/ArchiveWorldState.ts';
import { ArchiveReactionView } from '../src/render/ArchiveReactionView.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
const paths={STONE:[[0,0],[0,1],[1,1],[2,1],[2,2]],ABOVE:[[0,4],[0,5],[0,6],[1,6],[2,6]],UNDER:[[3,6],[3,5],[4,5],[4,4],[3,4]],SECRET:[[6,0],[5,0],[5,1],[4,1],[4,2],[3,2]],READ:[[1,3],[1,4],[2,4],[2,3]],EXIT:[[6,6],[6,5],[5,5],[5,4]]};
function setup(){
 const state=createGameState(stage6.playerStart,stage6.grid,stage6.quests,stage6.questPresentation);
 const controller=new ArchiveReactionController(state.archive=createArchiveWorldState(state.words),state.words,state.quests);
 const grid=new LetterGrid(stage6.id,stage6.grid,stage6.letterLayout),selection=new WordSelection(grid),validate=createQuestValidator(state.quests.definitions,state.words);
 const submit=word=>{const tiles=paths[word].map(([r,c])=>grid.getTile(r,c));selection.start(tiles[0].id);tiles.slice(1).forEach(t=>selection.enterTile(t.id));return resolveQuestWord(state.quests,state.words,selection.submit(),validate,controller.onQuestCompleted);};
 const tick=dt=>{controller.update(dt);refreshQuestAvailability(state.quests,state.words);};
 const status=word=>questStatus(state.quests.definitions.find(q=>q.targetWord===word),state.words);
 return {state,controller,grid,submit,tick,status};
}
for(const order of [['STONE','ABOVE','UNDER'],['STONE','UNDER','ABOVE'],['UNDER','STONE','ABOVE'],['UNDER','ABOVE','STONE'],['ABOVE','STONE','UNDER'],['ABOVE','UNDER','STONE']])test('archive reaction unlocks after visual completion + quiet: '+order.join(' ? '),()=>{
 const {state,controller,submit,tick,status}=setup();
 for(const word of order){assert.equal(submit(word).status,'CORRECT');const duration=ARCHIVE_SECONDS[word.toLowerCase()];
  tick(duration-.01);assert.equal(status('SECRET'),'LOCKED');assert.equal(controller.notificationsHeld,true);
  tick(.01);assert.equal(state.archive.progress[word.toLowerCase()],1);assert.equal(status('SECRET'),'LOCKED');
  tick(.44);assert.equal(status('SECRET'),'LOCKED');tick(.01);
 }
 assert.equal(status('SECRET'),'AVAILABLE');assert.equal(state.quests.presentations[0].questId,'archive-secret');
 assert.equal(submit('SECRET').status,'CORRECT');tick(3.6);assert.equal(state.archive.secretRevealed,true);assert.equal(status('READ'),'LOCKED');tick(.45);
 assert.equal(status('READ'),'AVAILABLE');assert.equal(state.archive.readCompleted,false);
 assert.equal(submit('READ').status,'CORRECT');assert.equal(state.archive.readCompleted,false);tick(4.2);assert.equal(state.archive.readingVisible,true);tick(60);assert.equal(status('EXIT'),'LOCKED');controller.acknowledgeReading();tick(.44);assert.equal(status('EXIT'),'LOCKED');tick(.01);assert.equal(status('EXIT'),'AVAILABLE');
 assert.equal(submit('EXIT').status,'CORRECT');assert.equal(state.archive.exitCompleted,false);assert.equal(controller.canCompleteStage,false);tick(4.05);assert.equal(state.archive.doorOpened,true);
 const completion=new StageCompletionController(stage6.id,()=>assert.fail('ending'),stage6.completionMode!=='manual');completion.check(state.quests,state.words);completion.update(100,false,false);
 const before=structuredClone(state.archive);for(const word of Object.keys(paths)){assert.equal(submit(word).status,'ALREADY_COMPLETED');controller.onQuestCompleted('archive-'+word.toLowerCase());}
 assert.deepEqual(state.archive,before);assert.equal(controller.isBusy,false);
});
test('archive queued reactions converge, invalid events do nothing, hints stay locked and scan is unchanged',()=>{
 const a=setup(),b=setup();
 for(const v of [a,b]){v.controller.onQuestCompleted('archive-secret');assert.equal(v.controller.isBusy,false);for(const word of ['UNDER','ABOVE','STONE'])v.submit(word);}
 a.tick(9.45);for(let i=0;i<567;i++)b.tick(1/60);
 assert.deepEqual(a.state.archive,b.state.archive);assert.equal(a.status('SECRET'),'AVAILABLE');
 for(const dt of [0,-1,NaN,Infinity])a.tick(dt);assert.equal(a.controller.isBusy,false);
 const fresh=setup(),assistance=new AssistanceState({wordShards:20});fresh.state.quests.focusedIndex=3;
 assert.equal(assistance.requestHint(fresh.state.quests,fresh.state.words,false),'Hint unavailable for this quest');
 assert.equal(assistance.requestScan('E',fresh.grid,false),'');assert.deepEqual([...assistance.scanState.tileIds],fresh.grid.findLetter('E').map(t=>t.id));
});
test('archive visual phases keep all letters clear in unchanged cameras; above/under remain independent and reset',()=>{
 const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage6,assets));const view=new ArchiveReactionView(scene,assets);scene.add(view.root);
 const {state:s,grid}=setup(),visible=node=>{for(let n=node;n;n=n.parent)if(!n.visible)return false;return true;};
 const transforms=()=>{const out=[];scene.traverse(n=>out.push([n.name,n.visible,...n.position.toArray(),...n.scale.toArray()]));return out;};
 try{
  view.update(s.archive);const initial=transforms();
  for(const aspect of [1440/900,390/844,16/9]){
   const span=Math.max(stage6.camera.verticalSpan,stage6.camera.minimumWidth/aspect),camera=new OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,100);
   camera.position.set(...stage6.camera.position);camera.lookAt(...stage6.camera.target);camera.updateMatrixWorld();const direction=camera.getWorldDirection(new Vector3());
   for(let frame=0;frame<=40;frame++){
    for(const key of Object.keys(ARCHIVE_SECONDS))s.archive.progress[key]=frame/40;
    view.update(s.archive);scene.updateMatrixWorld(true);
    for(const tile of grid.tiles)for(const dx of [-.4,0,.4])for(const dz of [-.4,0,.4]){
     const point=new Vector3(tile.worldPosition.x+dx,.115,tile.worldPosition.z+dz);
     const hits=new Raycaster(point.clone().addScaledVector(direction,-40),direction,0,39.99).intersectObject(scene,true).filter(h=>visible(h.object));
     assert.equal(hits.length,0,`tile ${tile.id} obscured at ${frame}: ${hits[0]?.object.name}`);
    }
   }
   const upper=scene.getObjectByName('upper-object'),platform=scene.getObjectByName('upper-platform');
   const upperBox=new Box3().setFromObject(upper),platformBox=new Box3().setFromObject(platform);
   assert.ok(upperBox.min.y>platformBox.max.y+.85);
   const a=upper.getWorldPosition(new Vector3()).project(camera),b=platform.getWorldPosition(new Vector3()).project(camera);assert.ok(a.y>b.y+.04);
   const lower=scene.getObjectByName('under-stone-tablet');assert.ok(new Box3().setFromObject(lower).max.y<platformBox.min.y);
   const point=lower.localToWorld(new Vector3(0,.51,.35));
   const hits=new Raycaster(point.clone().addScaledVector(direction,-40),direction,0,39.99).intersectObject(scene,true).filter(h=>visible(h.object));assert.equal(hits.length,0,`under object hidden by ${hits[0]?.object.name}`);
   const secret=scene.getObjectByName('secret-closed-volume').children.filter(n=>n.name==='secret-book-cover').at(-1);const bookPoint=secret.localToWorld(new Vector3(0,.51,0));
   const bookHits=new Raycaster(bookPoint.clone().addScaledVector(direction,-40),direction,0,39.99).intersectObject(scene,true).filter(h=>visible(h.object));assert.equal(bookHits.length,0,`secret hidden by ${bookHits[0]?.object.name}`);
  }
  s.archive.progress.above=1;s.archive.progress.under=0;view.update(s.archive);assert.equal(scene.getObjectByName('under-archive-object').visible,false);
  s.archive.progress.under=1;view.update(s.archive);assert.equal(scene.getObjectByName('upper-object').position.y,2.86);
  const completed=transforms();view.update(s.archive);assert.deepEqual(transforms(),completed);
  const fresh=setup();view.update(fresh.state.archive);assert.deepEqual(transforms(),initial);assert.equal(fresh.controller.isBusy,false);
  assert.equal(scene.getObjectByName('closed-door-leaf').position.x,-.49);assert.equal(scene.getObjectByName('book-upper-cover').rotation.x,0);
 }finally{view.dispose();assets.dispose();}
});

