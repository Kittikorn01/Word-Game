import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3 } from '../src/stages/stage3.ts';
import { createGameState, requestMovement, updateMovement } from '../src/simulation/update.ts';
import { questStatus, resolveQuestWord, updateQuestPresentation } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { createTownWorldState, TownReactionController } from '../src/simulation/TownWorldState.ts';
import { TownEndingController, townDeliveryPoints, TOWN_CARRY_SPEED } from '../src/simulation/TownEndingController.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { TownReactionView } from '../src/render/TownReactionView.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';

function setup() {
 const game=createGameState(stage3.playerStart,stage3.grid,stage3.quests);game.town=createTownWorldState();
 const reactions=new TownReactionController(game.town),ending=new TownEndingController(stage3);game.townEnding=ending.state;
 const events=[];
 const submit=word=>resolveQuestWord(game.quests,game.words,{word,selectedTileIds:[],path:[]},createQuestValidator(game.quests.definitions,game.words),id=>{events.push(id);reactions.onQuestCompleted(id);});
 return {game,reactions,ending,submit,events};
}
function ready(){const s=setup();for(const word of ['BREAD','COIN','SHOP','LETTER','CLOCK','CARRY'])assert.equal(s.submit(word).status,'CORRECT');s.reactions.update(3);return s;}

test('frozen Stage 3.2 board, spawn, camera and layout remain unchanged',()=>{
 assert.deepEqual(stage3.letterLayout,['BRACLEC','NEADORO','RAEOCKI','LOHSCAN','LPEACAT','ETRNERR','OTENLOY']);
 assert.deepEqual(stage3.playerStart,{row:6,column:3});
 assert.deepEqual(stage3.grid,{rows:7,columns:7,tileSize:1,origin:{x:0,z:1}});
 assert.deepEqual(stage3.camera,{position:[0,17,11.7],target:[0,0,-.3],verticalSpan:13,minimumWidth:14});
});
test('initial hidden quests reject submissions/hints; independent scan; exact unlock banners',()=>{
 const {game:g,submit,events}=setup(),a=new AssistanceState({wordShards:20});
 assert.deepEqual(g.quests.definitions.filter(q=>questStatus(q,g.words)==='AVAILABLE').map(q=>q.targetWord),['BREAD','COIN','LETTER','CLOCK']);
 for(const word of ['SHOP','CARRY']){
  const result=submit(word);assert.equal(result.status,'WRONG');assert.equal(result.reason,'LOCKED');
  g.quests.focusedIndex=g.quests.definitions.findIndex(q=>q.targetWord===word);
  assert.ok(a.requestHint(g.quests,g.words,false));assert.equal(a.hintText(g.quests,g.words),'');
 }
 assert.equal(events.length,0);assert.equal(a.wordShards,20);
 const grid=new LetterGrid(stage3.id,stage3.grid,stage3.letterLayout);
 assert.equal(a.requestScan('C',grid,false),'');assert.equal(a.scanState.tileIds.size,5);
 submit('COIN');assert.equal(submit('SHOP').reason,'LOCKED');submit('BREAD');
 assert.deepEqual(g.quests.presentations.map(p=>p.questId),['town-shop']);
 assert.ok(!g.quests.discoveredIds.includes('town-shop'));updateQuestPresentation(g.quests,3.5);
 assert.ok(g.quests.discoveredIds.includes('town-shop'));
 submit('SHOP');assert.equal(submit('CARRY').reason,'LOCKED');submit('LETTER');
 assert.deepEqual(g.quests.presentations.map(p=>p.questId),['town-carry']);updateQuestPresentation(g.quests,3.5);
 g.quests.focusedIndex=g.quests.definitions.findIndex(q=>q.targetWord==='CARRY');
 assert.equal(a.requestHint(g.quests,g.words,false),'');assert.equal(a.hintText(g.quests,g.words),'C _ _ _ _');
});
test('reaction durations, duplicates, reset and no replay after completed submission',()=>{
 const {game:g,reactions:r,submit,events}=setup();
 for(const w of ['BREAD','COIN','SHOP','LETTER','CLOCK','CARRY'])submit(w);
 r.update(1);assert.equal(g.town.clockActive,false);assert.equal(r.isBusy,true);
 r.update(1);assert.equal(g.town.clockActive,true);assert.equal(g.town.shopOpen,true);
 r.update(.4);assert.equal(r.isBusy,false);assert.ok(g.town.breadReady&&g.town.coinPlaced&&g.town.shopOpen&&g.town.letterDelivered);
 const snapshot=structuredClone(g.town);
 for(const word of stage3.vocabulary){assert.equal(submit(word).status,'ALREADY_COMPLETED');r.onQuestCompleted(`town-${word.toLowerCase()}`);}
 assert.equal(events.length,6);assert.deepEqual(g.town,snapshot);assert.equal(g.town.carryCompleted,false);
 assert.deepEqual(setup().game.town,createTownWorldState());
});
test('all 720 word attempt orders converge under existing dependency validation',()=>{
 function* permutations(a){if(!a.length){yield [];return;}for(let i=0;i<a.length;i++)for(const rest of permutations(a.filter((_,j)=>j!==i)))yield[a[i],...rest];}
 for(const order of permutations([...stage3.vocabulary])){
  const {game:g,submit,events,reactions:r,ending:e}=setup();
  for(let pass=0;pass<3;pass++)for(const word of order)submit(word);
  assert.equal(g.words.completedWords.length,6);assert.equal(events.length,6);
  r.update(3);assert.equal(e.tryStart(g,false),true);e.update(30,g);assert.equal(g.town.carryCompleted,true);
 }
});
test('CARRY before CLOCK waits safely; ending waits for feedback and committed movement',()=>{
 const {game:g,reactions:r,submit,ending:e}=setup();
 for(const w of ['BREAD','COIN','SHOP','LETTER','CARRY'])submit(w);r.update(3);
 assert.equal(e.tryStart(g,false),false);assert.equal(e.inputLocked,false);
 submit('CLOCK');assert.equal(e.tryStart(g,r.isBusy),false);r.update(2);
 assert.equal(e.tryStart(g,true),false);requestMovement(g,{x:1,z:0},stage3.grid);assert.equal(e.tryStart(g,false),false);
 updateMovement(g,.18);assert.equal(e.tryStart(g,false),true);assert.equal(e.tryStart(g,false),false);
 e.update(NaN,g);e.update(-1,g);assert.equal(e.state.phase,'lead');
});
test('all 49 starts move continuously via pickup and destination without rewriting player/grid state',()=>{
 for(let row=0;row<7;row++)for(let column=0;column<7;column++){
  const {game:g,ending:e}=ready();g.player.currentTile={row,column};const before=structuredClone(g.player);
  assert.equal(e.tryStart(g,false),true);assert.deepEqual(e.state.pose,{x:column-3,y:0,z:row-2});
  let carried=false,placed=false;
  for(let n=0;n<2000&&!e.isFinished;n++){
   const p={...e.state.pose};e.update(1/60,g);
   assert.ok(Math.hypot(p.x-e.state.pose.x,p.z-e.state.pose.z)<=TOWN_CARRY_SPEED/60+1e-8);
   carried ||= e.state.parcelAttached;placed ||= e.state.phase==='placing';
  }
  assert.ok(carried&&placed);assert.equal(e.isFinished,true);assert.equal(g.town.carryCompleted,true);
  assert.deepEqual(e.state.pose,townDeliveryPoints(stage3).destination);assert.deepEqual(g.player,before);
  assert.equal(e.inputLocked,true);
 }
});
test('completion waits for delivery plus pause, emits once and large/small time steps agree',()=>{
 const a=ready(),b=ready();let completed=0;
 const c=new StageCompletionController(stage3.id,()=>completed++);c.check(a.game.quests,a.game.words);
 c.update(30,!a.ending.isFinished,false);assert.equal(completed,0);
 a.ending.tryStart(a.game,false);b.ending.tryStart(b.game,false);b.ending.update(30,b.game);
 while(!a.ending.isFinished){a.ending.update(1/60,a.game);c.update(1/60,!a.ending.isFinished,false);assert.equal(completed,0);}
 c.update(.3,false,false);assert.equal(completed,1);c.update(30,false,false);assert.equal(completed,1);
 assert.deepEqual(a.ending.state,b.ending.state);
});
test('town rendering is a bounded idempotent projection with readable prop identities',()=>{
 const assets=new PrimitiveAssets(),scene=createDiorama(stage3,assets),view=new TownReactionView(stage3,scene),{game:g,reactions:r,submit,ending:e}=setup();
 scene.add(view.root);
 try{
  view.update(g);assert.equal(view.root.getObjectByName('town-bread').visible,false);assert.equal(view.root.getObjectByName('shop-shutter').visible,true);
  assert.equal(view.root.getObjectByName('town-carry-parcel').visible,false);
  const before=[];scene.traverse(o=>before.push(o));
  submit('LETTER');r.update(1);view.update(g);assert.equal(view.root.getObjectByName('town-envelope').visible,true);
  for(const w of ['BREAD','COIN','SHOP','CLOCK','CARRY'])submit(w);r.update(3);view.update(g);
  assert.equal(view.root.getObjectByName('shop-shutter').visible,false);assert.equal(view.root.getObjectByName('town-envelope').visible,false);
  assert.equal(view.root.getObjectByName('town-carry-parcel').visible,true);
  assert.equal(view.root.getObjectByName('coin-round-disk').geometry.type,'CylinderGeometry');
  assert.equal(before.filter(o=>o.name==='bread-rounded-loaf').length,3);assert.equal(before.filter(o=>o.name==='bread-score').length,9);
  e.tryStart(g,false);e.update(30,g);view.update(g);
  const parcel=view.root.getObjectByName('town-carry-parcel');const dest=townDeliveryPoints(stage3).parcelDestination;
  assert.deepEqual(parcel.position.toArray(),[dest.x,dest.y,dest.z]);
  const stateBefore=structuredClone(g.town);view.update(g);view.update(g);assert.deepEqual(g.town,stateBefore);
  const after=[];scene.traverse(o=>after.push(o));assert.equal(before.length,after.length);
 }finally{view.dispose();assets.dispose();}
});

test('shop pulse, letter hover/receive and clock emphasis settle without accumulating transforms',()=>{
 const assets=new PrimitiveAssets(),scene=createDiorama(stage3,assets),view=new TownReactionView(stage3,scene),{game:g}=setup();scene.add(view.root);
 try {
  const shop=scene.getObjectByName('shop-opening-pulse'),dial=scene.getObjectByName('town-clock-dial'),mail=scene.getObjectByName('mail-placeholder'),letter=scene.getObjectByName('town-envelope');
  view.update(g);const home=mail.position.clone();
  for(const key of ['shop','letter','clock'])g.town.started[key]=true;
  g.town.progress.shop=.3;g.town.progress.letter=.15;g.town.progress.clock=.5;view.update(g);
  assert.ok(Math.abs(shop.scale.x-1.1)<1e-8);assert.ok(Math.abs(dial.scale.x-1.09)<1e-8);
  const hover=letter.position.clone();g.town.progress.letter=.24;view.update(g);assert.ok(letter.position.distanceTo(hover)<1e-8);assert.equal(letter.scale.x,1.35);
  g.town.progress.letter=.5;view.update(g);assert.ok(letter.position.y>hover.y);assert.ok(letter.position.x>hover.x);
  g.town.progress.letter=.9;view.update(g);assert.ok(mail.position.y>home.y);assert.equal(letter.visible,true);
  for(const key of ['shop','letter','clock'])g.town.progress[key]=1;view.update(g);view.update(g);
  assert.equal(shop.scale.x,1);assert.equal(dial.scale.x,1);assert.ok(mail.position.distanceTo(home)<1e-8);assert.equal(letter.visible,false);
  assert.ok(Math.abs(scene.getObjectByName('mailbox-active-flag').rotation.z)<1e-8);
  assert.equal(scene.getObjectByName('shop-shutter').visible,false);
  assert.ok(scene.getObjectByName('shop-open-display').material.emissiveIntensity>=.5);
 } finally {view.dispose();assets.dispose();}
});

