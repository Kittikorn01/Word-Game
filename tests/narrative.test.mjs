import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1 } from '../src/stages/stage1.ts';
import { createGameState, requestMovement, updateMovement } from '../src/simulation/update.ts';
import { questStatus, resolveQuestWord, updateQuestPresentation, createQuestProgress } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { WorldReactionController } from '../src/simulation/WorldReactionController.ts';
import { interactWithExit, updateExitInteraction } from '../src/simulation/ExitInteraction.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { WorldReactionView } from '../src/render/WorldReactionView.ts';
import { ExitInput } from '../src/input/ExitInput.ts';
const setup = () => {
  const state=createGameState(stage1.playerStart,stage1.grid,stage1.quests), events=[];
  const controller=new WorldReactionController(state.world,stage1.worldReactions);
  const submit=word=>resolveQuestWord(state.quests,state.words,{word,selectedTileIds:[],path:[]},createQuestValidator(state.quests.definitions),id=>{events.push(id);controller.onQuestCompleted(id);});
  return {state,events,controller,submit};
};
test('OPEN locked, not remembered; DOOR unlocks once; presentation then discovered list',()=>{
  const {state:s,submit,events}=setup(), open=s.quests.definitions[5];
  assert.equal(questStatus(open,s.words),'LOCKED'); assert.equal(s.quests.discoveredIds.length,5);
  assert.equal(submit('OPEN').status,'WRONG'); assert.deepEqual(s.words.completedWords,[]);
  assert.equal(submit('DOOR').status,'CORRECT'); assert.equal(questStatus(open,s.words),'AVAILABLE');
  assert.equal(s.world.doorOpen,false); assert.equal(s.quests.presentations.length,1);
  updateQuestPresentation(s.quests,.3); assert.equal(s.quests.discoveredIds.length,5);
  updateQuestPresentation(s.quests,2.8); assert.equal(s.quests.discoveredIds.length,5);
  assert.equal(submit('DOOR').status,'ALREADY_COMPLETED'); assert.equal(s.quests.presentations.length,1);
  updateQuestPresentation(s.quests,.4); assert.equal(s.quests.discoveredIds.length,6); assert.equal(s.quests.presentations.length,0);
  assert.equal(submit('OPEN').status,'CORRECT'); assert.deepEqual(events,['door-quest','open-quest']);
});
test('malformed dependency data is rejected',()=>{
  const q=stage1.quests[0];
  assert.throws(()=>createQuestProgress([{...q,requires:['MISSING']}]));
  assert.throws(()=>createQuestProgress([{...q,requires:['KEY']}]));
});
test('key flight is simulation-owned, once only, and completes after 1.8 seconds',()=>{
  const {state:s,submit,controller:c}=setup(); submit('KEY'); c.update(.25);
  assert.equal(s.world.keySpawned,true); assert.equal(s.world.hasKey,false);
  c.update(.9); assert.equal(s.world.keyAcquisitionProgress,.5); assert.equal(s.world.hasKey,false);
  c.update(.9); assert.equal(s.world.hasKey,true);
  submit('KEY'); c.update(2); assert.equal(s.world.keyAcquisitionProgress,1);
});
test('legacy exit helper remains isolated from the stage runtime',()=>{
  const {state:s,submit,controller:c}=setup(), events=[];
  const press=()=>interactWithExit(s,{ tiles: [{row:0,column:6}], requiresKey:true },stage1.id,id=>events.push(id));
  submit('DOOR'); submit('OPEN'); c.update(.25);
  s.player.currentTile={row:0,column:6}; updateExitInteraction(s,{ tiles: [{row:0,column:6}], requiresKey:true });
  assert.equal(s.exit.nearby,true); assert.equal(press(),false);
  for(const w of ['LIGHT','WATER','BOOK','KEY']) submit(w);
  c.update(.25); assert.equal(press(),false); c.update(1.8);
  s.world.doorOpen=false; assert.equal(press(),false); s.world.doorOpen=true;
  s.player.currentTile={row:1,column:6}; assert.equal(press(),false);
  requestMovement(s,{x:0,z:-1},stage1.grid); assert.equal(press(),false);
  updateMovement(s,.18); updateExitInteraction(s,{ tiles: [{row:0,column:6}], requiresKey:true }); assert.equal(s.exit.canInteractWithExit,true);
  assert.equal(press(),true); for(let i=0;i<20;i++) assert.equal(press(),false);
  assert.deepEqual(events,[stage1.id]); assert.equal(s.exit.completed,true);
});
test('key tracks player, shelf slides, lamps stagger, droplets end and healthy plant persists',()=>{
  const {state:s,submit,controller:c}=setup(), assets=new PrimitiveAssets(), v=new WorldReactionView(assets,stage1.worldObjects);
  v.update(s.world,0); assert.equal(v.objects.book.visible,true); assert.equal(v.objects.drops.visible,false);
  assert.ok(v.objects.bulbs.every(b=>b.emissiveIntensity===0));
  submit('KEY'); c.update(.25); c.update(.9); v.update(s.world,.1,{x:2,z:1});
  const start=v.objects.key.position.clone(); c.update(.5); v.update(s.world,.1,{x:-1,z:2});
  assert.notDeepEqual(v.objects.key.position.toArray(),start.toArray()); c.update(.4); v.update(s.world,.1); assert.equal(v.objects.key.visible,false);
  submit('LIGHT'); submit('WATER'); submit('BOOK'); c.update(.25); v.update(s.world,.1);
  assert.ok(v.objects.bulbs[0].emissiveIntensity>v.objects.bulbs[2].emissiveIntensity);
  assert.equal(v.objects.drops.visible,true);
  v.update(s.world,2); assert.equal(v.objects.drops.visible,false); assert.ok(v.objects.book.position.z>v.objects.bookHome.z);
  assert.ok(v.objects.bulbs.every(b=>b.emissiveIntensity===1.4)); assert.ok(v.objects.growth.scale.x>1);
  v.dispose(); assets.dispose();
});
test('E input rejects repeat, typing and modifiers; release, blur and teardown work',()=>{
  globalThis.window=new EventTarget(); globalThis.document=new EventTarget();
  globalThis.HTMLElement=class extends EventTarget { closest(){return true;} };
  let count=0; const input=new ExitInput(()=>count++);
  const emit=(target,type,extra={})=>target.dispatchEvent(Object.assign(new Event(type),{code:'KeyE',repeat:false,ctrlKey:false,altKey:false,metaKey:false,...extra}));
  emit(window,'keydown'); emit(window,'keydown'); emit(window,'keydown',{repeat:true}); assert.equal(count,1);
  emit(window,'keyup'); emit(window,'keydown',{ctrlKey:true}); assert.equal(count,1);
  const typing = Object.assign(new Event('keydown'),{code:'KeyE'});
  Object.defineProperty(typing,'target',{value:new HTMLElement()}); window.dispatchEvent(typing); assert.equal(count,1);
  emit(window,'keydown'); emit(window,'blur'); emit(window,'keydown'); assert.equal(count,3);
  input.dispose(); emit(window,'keyup'); emit(window,'keydown'); assert.equal(count,3);
  delete globalThis.window; delete globalThis.document; delete globalThis.HTMLElement;
});


