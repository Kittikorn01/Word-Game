import { SupportObjectives } from '../src/simulation/SupportObjectives.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AssistanceState, createPlayerResources, normalizeScanLetter } from '../src/simulation/AssistanceState.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { createGameState } from '../src/simulation/update.ts';
import { stage1 } from '../src/stages/stage1.ts';
import { stages } from '../src/stages/registry.ts';
import { StageManager } from '../src/app/StageManager.ts';
const setup = () => {
 const resources = createPlayerResources(), assistance = new AssistanceState(resources, stage1.wordShardSpawns);
 const state = createGameState(stage1.playerStart, stage1.grid, stage1.quests);
 const grid = new LetterGrid(stage1.id, stage1.grid, stage1.letterLayout);
 return { resources, assistance, state, grid };
};
test('Stage 1 no longer grants walk-over shards anywhere on the board', () => {
 const {assistance, grid} = setup();
 assert.equal(stage1.wordShardSpawns,undefined);
 for (const tile of grid.tiles) assert.equal(assistance.collectAt(tile),0);
 assert.equal(assistance.wordShards,2);
});
test('hint progresses, survives focus switch, caps before last letter and hides completed', () => {
 const {resources, assistance:a, state:s} = setup(); resources.wordShards = 10;
 assert.equal(a.requestHint(s.quests,s.words,false),''); assert.equal(a.hintText(s.quests,s.words),'K _ _');
 s.quests.focusedIndex=1; assert.equal(a.hintText(s.quests,s.words),'');
 s.quests.focusedIndex=0; assert.equal(a.hintText(s.quests,s.words),'K _ _');
 a.requestHint(s.quests,s.words,false); assert.equal(a.hintText(s.quests,s.words),'K E _');
 assert.ok(a.requestHint(s.quests,s.words,false)); assert.equal(resources.wordShards,8);
 s.words.completedWords = Object.freeze(['KEY']); assert.equal(a.hintText(s.quests,s.words),''); assert.ok(a.requestHint(s.quests,s.words,false));
 s.quests.focusedIndex=5; assert.ok(a.requestHint(s.quests,s.words,false)); assert.equal(resources.wordShards,8);
});
test('long hints never expose full spelling', () => {
 const {resources, assistance:a, state:s} = setup(); resources.wordShards=20; s.quests.focusedIndex=1;
 for (const hint of ['L _ _ _ _','L I _ _ _','L I G _ _','L I G H _']) { assert.equal(a.requestHint(s.quests,s.words,false),''); assert.equal(a.hintText(s.quests,s.words),hint); }
 assert.ok(a.requestHint(s.quests,s.words,false)); assert.equal(resources.wordShards,16);
});
test('scan queries every matching tile including distractors, expires without mutating tile states', () => {
 const {assistance:a,grid} = setup(); grid.tiles[0].state='CORRECT'; grid.tiles[7].state='SELECTED';
 const before=grid.tiles.map(t=>t.state);
 assert.equal(a.requestScan('k',grid,false),''); assert.equal(a.wordShards,1);
 assert.equal(a.scanState.letter,'K'); assert.equal(a.scanState.tileIds.size,3);
 assert.deepEqual([...a.scanState.tileIds],grid.tiles.filter(t=>t.letter==='K').map(t=>t.id));
 a.update(2.9); assert.ok(a.scanState); a.update(.1); assert.equal(a.scanState,null);
 assert.deepEqual(grid.tiles.map(t=>t.state),before);
});
test('invalid full input never charges; uppercase normalization accepts exactly ASCII letter', () => {
 const {assistance:a,grid} = setup();
 for(const input of ['KEY','1','?','AA','',' K','K ','\u00e9','\uff21','A\n']) { assert.equal(normalizeScanLetter(input),null); assert.ok(a.requestScan(input,grid,false)); }
 assert.equal(a.wordShards,2); assert.equal(a.scanState,null);
 assert.equal(normalizeScanLetter('w'),'W');
});
test('no shards and selection/feedback lock guard both request paths', () => {
 const {resources,assistance:a,state:s,grid} = setup();
 assert.ok(a.requestHint(s.quests,s.words,true)); assert.ok(a.requestScan('K',grid,true)); assert.equal(a.wordShards,2);
 resources.wordShards=0;
 assert.equal(a.requestHint(s.quests,s.words,false),'No Word Shards'); assert.equal(a.requestScan('K',grid,false),'No Word Shards');
 assert.equal(a.scanState,null); assert.equal(a.hintProgressByQuest.size,0);
});
test('valid no-match scan costs one and active scans replace rather than stack', () => {
 const {assistance:a,grid} = setup(); a.requestScan('C',grid,false); assert.equal(a.scanState.tileIds.size,0);
 a.requestScan('K',grid,false); assert.equal(a.wordShards,0); assert.equal(a.scanState.remaining,3);
 a.clearScan(); assert.equal(a.scanState,null);
});
test('actual stage transition carries player ledger and resets stage-owned assistance', async () => {
 const resources=createPlayerResources(), mounted=[];
 const manager=new StageManager(stages,stages[0].id,stage=>{
  const a=new AssistanceState(resources,stage.wordShardSpawns); mounted.push(a);
  return {lock(){a.clearScan();},dispose(){}};
 },{async fadeOut(){},async fadeIn(){},dispose(){}});
 manager.start(); new SupportObjectives(resources,stage1.supportObjectives).inspect(stage1.supportObjectives[0].tile,false);
 mounted[0].hintProgressByQuest.set('key-quest',1);
 await manager.next(); assert.equal(mounted[1].wordShards,3); assert.equal(mounted[1].hintProgressByQuest.size,0); assert.equal(mounted[1].collectedPickupIds.size,0);
 manager.dispose();
});
