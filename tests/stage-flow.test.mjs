import test from 'node:test';
import assert from 'node:assert/strict';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { StageManager } from '../src/app/StageManager.ts';
import { stages } from '../src/stages/registry.ts';
import { createGameState } from '../src/simulation/update.ts';
import { resolveQuestWord } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';

for (const last of ['KEY','LIGHT','WATER','BOOK','OPEN']) test(`completion waits for every quest and reaction; ${last} last`, () => {
  const stage=stages[0], state=createGameState(stage.playerStart,stage.grid,stage.quests), events=[];
  const completion=new StageCompletionController(stage.id,id=>events.push(id));
  const submit=word=>resolveQuestWord(state.quests,state.words,{word,selectedTileIds:[],path:[]},createQuestValidator(state.quests.definitions),()=>completion.check(state.quests,state.words));
  assert.equal(submit('OPEN').status,'WRONG');
  for(const word of stage.vocabulary.filter(word=>word!==last)) submit(word);
  completion.update(10,false,false); assert.deepEqual(events,[]);
  submit(last); completion.update(10,true,false); assert.deepEqual(events,[]);
  completion.update(10,false,true); assert.deepEqual(events,[]);
  completion.update(.2,false,false); assert.deepEqual(events,[]);
  completion.update(.1,false,false); assert.deepEqual(events,[stage.id]);
  for(let i=0;i<10;i++){completion.check(state.quests,state.words);completion.update(1,false,false);submit(last);}
  assert.deepEqual(events,[stage.id]);
});
test('empty placeholder does not complete',()=>{
 const s=stages[1], state=createGameState(s.playerStart,s.grid,[]);
 const c=new StageCompletionController(s.id,()=>assert.fail('empty stage completed'));
 c.check(state.quests,state.words); c.update(10,false,false);
});
test('transition locks, fades, disposes old state, mounts fresh state once, then fades in',async()=>{
 const calls=[], states=[]; let release;
 const transition={fadeOut(){calls.push('out');return new Promise(resolve=>release=resolve);},async fadeIn(){calls.push('in');},dispose(){}};
 const manager=new StageManager(stages,stages[0].id,stage=>{
  const state=createGameState(stage.playerStart,stage.grid,stage.quests);states.push(state);calls.push(stage.id);
  return {lock(){calls.push('lock');},dispose(){calls.push('dispose');}};
 },transition);
 manager.start();
 resolveQuestWord(states[0].quests,states[0].words,{word:'KEY',selectedTileIds:[],path:[]},createQuestValidator(states[0].quests.definitions));
 states[0].world.keySpawned=true;
 const first=manager.next();assert.equal(await manager.next(),false);assert.equal(manager.currentStageId,stages[0].id);
 release();assert.equal(await first,true);
 assert.deepEqual(calls,[stages[0].id,'lock','out','dispose',stages[1].id,'lock','in']);
 assert.equal(manager.currentStageId,stages[1].id);assert.equal(states.length,2);
 assert.deepEqual(states[1].words.completedWords,[]);assert.equal(states[1].quests.definitions.length,6);assert.equal(states[1].world.keySpawned,false);
 assert.equal(manager.nextStageId,stages[2].id);manager.dispose();
});
test('disposing during fade prevents mounting a new stage',async()=>{
 let release,mounts=0;
 const manager=new StageManager(stages,stages[0].id,()=>{mounts++;return {lock(){},dispose(){}};},{fadeOut:()=>new Promise(r=>release=r),async fadeIn(){},dispose(){}});
 manager.start();const pending=manager.next();manager.dispose();release();assert.equal(await pending,false);assert.equal(mounts,1);
});

// Real finite animation readiness, including cases where OPEN was completed early.
import { WorldReactionController } from '../src/simulation/WorldReactionController.ts';
import { WorldReactionView } from '../src/render/WorldReactionView.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
for (const last of ['KEY','LIGHT','WATER','BOOK','OPEN']) test(`real reaction settles before completion: ${last}`,()=>{
 const stage=stages[0], state=createGameState(stage.playerStart,stage.grid,stage.quests);
 const assets=new PrimitiveAssets(), view=new WorldReactionView(assets,stage.worldObjects);
 const reactions=new WorldReactionController(state.world,stage.worldReactions);
 let count=0, elapsed=0;
 const completion=new StageCompletionController(stage.id,()=>{assert.equal(reactions.isBusy,false);assert.equal(view.isBusy(state.world),false);count++;});
 const submit=word=>resolveQuestWord(state.quests,state.words,{word,selectedTileIds:[],path:[]},createQuestValidator(state.quests.definitions),id=>{reactions.onQuestCompleted(id);completion.check(state.quests,state.words);});
 const tick=()=>{reactions.update(1/60);completion.update(1/60,reactions.isBusy||view.isBusy(state.world),false);view.update(state.world,1/60);};
 view.update(state.world,0);
 for(const word of stage.vocabulary.filter(word=>word!==last)){submit(word);for(let i=0;i<160;i++)tick();}
 assert.equal(count,0);submit(last);
 while(!count && elapsed<4){tick();elapsed+=1/60;}
 assert.equal(count,1);assert.ok(elapsed>=1.4 && elapsed<2.5,`unexpected delay ${elapsed}`);
 for(let i=0;i<160;i++)tick();assert.equal(count,1);
 view.dispose();assets.dispose();
});


test('intro receives destination data and blocks mounting, duplicate next and start until it finishes', async () => {
  const calls = []; let releaseIntro;
  const destination = { ...stages[1], nextStageId: undefined, id: 'stage-3-test', stageNumber: 3, title: 'A Busy Little Town' };
  const source = { ...stages[0], nextStageId: destination.id };
  const manager = new StageManager([source, destination], source.id, stage => {
    calls.push(`mount:${stage.id}`);
    return { lock() { calls.push('lock'); }, unlock() { calls.push('unlock'); }, dispose() { calls.push('dispose'); } };
  }, {
    async fadeOut() { calls.push('out'); },
    showIntro(stage) { assert.equal(stage, destination); calls.push('intro'); return new Promise(resolve => releaseIntro = resolve); },
    async fadeIn() { calls.push('in'); }, dispose() {}
  });
  manager.start(); const next = manager.next(); await Promise.resolve();
  assert.deepEqual(calls, [`mount:${source.id}`, 'lock', 'out', 'dispose', 'intro']);
  assert.equal(manager.isTransitioning, true);
  assert.equal(await manager.next(), false); manager.start();
  assert.equal(calls.filter(call => call.startsWith('mount:')).length, 1);
  releaseIntro(); assert.equal(await next, true);
  assert.deepEqual(calls.slice(-3), ['lock', 'in', 'unlock']);
  assert.equal(calls.filter(call => call === `mount:${destination.id}`).length, 1);
  assert.equal(manager.isTransitioning, false); manager.dispose();
});

test('disposing during intro prevents destination gameplay from mounting', async () => {
  let releaseIntro, mounts = 0;
  const manager = new StageManager(stages, stages[0].id, () => {
    mounts++; return { lock() {}, dispose() {} };
  }, {
    async fadeOut() {}, showIntro() { return new Promise(resolve => releaseIntro = resolve); },
    async fadeIn() { assert.fail('disposed transition revealed gameplay'); }, dispose() { releaseIntro?.(); }
  });
  manager.start(); const next = manager.next(); await Promise.resolve();
  manager.dispose(); assert.equal(await next, false); assert.equal(mounts, 1);
});


