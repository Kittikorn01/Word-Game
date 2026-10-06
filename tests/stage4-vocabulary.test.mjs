import { createWorkshopWorldState, WorkshopReactionController } from '../src/simulation/WorkshopWorldState.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4 } from '../src/stages/stage4.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { createGameState, requestMovement, updateMovement } from '../src/simulation/update.ts';
import { questStatus, resolveQuestWord, updateQuestPresentation, refreshQuestAvailability } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { WorldReactionController } from '../src/simulation/WorldReactionController.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';

const paths = {
  GEAR: [[0,0],[0,1],[1,1],[2,1]],
  REPAIR: [[0,4],[0,3],[1,3],[1,4],[2,4],[2,5]],
  POWER: [[3,6],[3,5],[4,5],[4,4],[5,4]],
  LEVER: [[2,0],[3,0],[3,1],[4,1],[4,2]],
  START: [[6,0],[5,0],[5,1],[6,1],[6,2]],
  STOP: [[0,6],[1,6],[1,5],[0,5]]
};
const setup = () => {
  const grid = new LetterGrid(stage4.id, stage4.grid, stage4.letterLayout);
  const state = createGameState(stage4.playerStart, stage4.grid, stage4.quests);
  const workshop = new WorkshopReactionController(createWorkshopWorldState(state.words),state.words);
  const selection = new WordSelection(grid);
  const validate = createQuestValidator(state.quests.definitions, state.words);
  const submit = (word, callback) => {
    const tiles = paths[word].map(([r,c]) => grid.getTile(r,c));
    selection.start(tiles[0].id);
    tiles.slice(1).forEach(tile => selection.enterTile(tile.id));
    assert.equal(selection.currentWord, word);
    const result=resolveQuestWord(state.quests, state.words, selection.submit(), validate, id=>{workshop.onQuestCompleted(id);callback?.(id);});
    workshop.update(12); refreshQuestAvailability(state.quests,state.words);
    return result;
  };
  return { grid, state, selection, submit };
};
function solutions(grid, word) {
  const found = [];
  function visit(tile, path) {
    if (!tile || path.includes(tile) || tile.letter !== word[path.length]) return;
    const next = [...path, tile];
    if (next.length === word.length) { found.push(next.map(t => [t.row,t.column])); return; }
    for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) visit(grid.getTile(tile.row+dr,tile.column+dc), next);
  }
  grid.tiles.forEach(tile => visit(tile, []));
  return found;
}
for (const [word, path] of Object.entries(paths)) test(`workshop ${word}: unique path, movement, backtracking and persistent completed tiles`, () => {
  const { grid, state, selection, submit } = setup();
  assert.deepEqual(solutions(grid, word), [path]);
  const tiles = path.map(([r,c]) => grid.getTile(r,c));
  state.player.currentTile = { row: path[0][0], column: path[0][1] };
  selection.start(tiles[0].id);
  selection.enterTile(tiles[1].id); selection.enterTile(tiles[0].id);
  assert.equal(selection.currentWord, word[0]);
  for (let i=1; i<path.length; i++) {
    assert.equal(requestMovement(state, {x:path[i][1]-path[i-1][1],z:path[i][0]-path[i-1][0]}, stage4.grid), true);
    assert.equal(updateMovement(state,1), true);
    const {row,column} = state.player.currentTile;
    selection.enterTile(grid.getTile(row,column).id);
  }
  assert.equal(selection.currentWord, word);
  assert.equal(new Set(selection.selectedTileIds).size, word.length);
  selection.cancel();
  for (const prior of Object.keys(paths).slice(0,Object.keys(paths).indexOf(word))) assert.equal(submit(prior).status,'CORRECT');
  assert.equal(submit(word).status,'CORRECT');
  assert.equal(submit(word).status,'ALREADY_COMPLETED');
  assert.deepEqual(solutions(grid,word),[path]);
});
for (const first of ['GEAR','REPAIR']) test(`workshop progression with ${first} first; locked words never complete; STOP requires submission`, () => {
  const { state, submit } = setup();
  const order = Object.keys(paths);
  const statuses = () => state.quests.definitions.map(q => questStatus(q,state.words));
  assert.deepEqual(stage4.vocabulary, order);
  assert.deepEqual(statuses(), ['AVAILABLE','AVAILABLE','LOCKED','LOCKED','LOCKED','LOCKED']);
  let count = 0;
  const completion = new StageCompletionController(stage4.id, () => count++);
  const before = structuredClone(state.world);
  const reactions = new WorldReactionController(state.world, stage4.worldReactions);
  const actualOrder = [first, first === 'GEAR' ? 'REPAIR' : 'GEAR', ...order.slice(2)];
  for (const word of actualOrder) {
    for (const quest of state.quests.definitions.filter(q => questStatus(q,state.words) === 'LOCKED')) {
      const ledger = [...state.words.completedWords];
      assert.equal(submit(quest.targetWord,()=>assert.fail('locked completion event')).reason,'LOCKED');
      assert.deepEqual(state.words.completedWords,ledger);
    }
    assert.equal(submit(word,reactions.onQuestCompleted).status,'CORRECT');
    reactions.update(10);
    assert.deepEqual(state.quests.definitions.map(q=>q.targetWord),order);
    if (word === first) assert.equal(statuses()[2],'LOCKED');
    if (word === actualOrder[1]) assert.equal(statuses()[2],'AVAILABLE');
    if (word === 'POWER') assert.equal(statuses()[3],'AVAILABLE');
    if (word === 'LEVER') assert.equal(statuses()[4],'AVAILABLE');
    if (word === 'START') { assert.equal(statuses()[5],'AVAILABLE'); assert.ok(!state.words.completedWords.includes('STOP')); }
    completion.check(state.quests,state.words); completion.update(2,false,false);
    assert.equal(count,word === 'STOP' ? 1 : 0);
  }
  completion.update(10,false,false); assert.equal(count,1);
  assert.deepEqual(state.world,before); assert.equal(reactions.isBusy,false);
  assert.equal(stage4.worldReactions,undefined);
});
test('workshop hints gate locked/completed quests and reveal prefixes; scan includes every matching decoy only temporarily', () => {
  const { grid, state, submit } = setup();
  const resources = {wordShards:100}, assistance = new AssistanceState(resources);
  for (let i=2;i<6;i++) {
    state.quests.focusedIndex=i;
    assert.equal(assistance.requestHint(state.quests,state.words,false),'Hint unavailable for this quest');
    assert.equal(assistance.hintText(state.quests,state.words),'');
  }
  assert.equal(resources.wordShards,100);
  for (const [i,quest] of state.quests.definitions.entries()) {
    while (state.quests.presentations.length) updateQuestPresentation(state.quests,4);
    state.quests.focusedIndex=i;
    assert.ok(!quest.clue.toUpperCase().includes(quest.targetWord));
    for (let level=1;level<quest.targetWord.length;level++) {
      assert.equal(assistance.requestHint(state.quests,state.words,false),'');
      assert.equal(assistance.hintText(state.quests,state.words),[...quest.targetWord].map((ch,j)=>j<level?ch:'_').join(' '));
    }
    assert.equal(assistance.requestHint(state.quests,state.words,false),'No more hints for this word');
    assert.equal(submit(quest.targetWord).status,'CORRECT');
    assert.equal(assistance.hintText(state.quests,state.words),'');
    assert.equal(assistance.requestHint(state.quests,state.words,false),'Hint unavailable for this quest');
  }
  const before = [...state.words.completedWords];
  assert.equal(assistance.requestScan('r',grid,false),'');
  assert.deepEqual([...assistance.scanState.tileIds],grid.findLetter('R').map(t=>t.id));
  assert.ok(assistance.scanState.tileIds.has(grid.getTile(6,4).id)); // Decoy R.
  assistance.update(3); assert.equal(assistance.scanState,null);
  assert.deepEqual(state.words.completedWords,before);
});
test('workshop spawn reaches all 49 tiles; diagonal and loop reuse rejected; approved framing unchanged', () => {
  const { grid, state, selection } = setup();
  const start = stage4.playerStart;
  assert.equal(grid.getTile(start.row,start.column).letter,'N');
  assert.ok(!Object.values(paths).flat().some(([r,c])=>r===start.row&&c===start.column));
  const queue=[start], seen=new Set([`${start.row},${start.column}`]);
  for (const current of queue) for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const next={row:current.row+dr,column:current.column+dc}, key=`${next.row},${next.column}`;
    if (!grid.getTile(next.row,next.column)||seen.has(key)) continue;
    const s=createGameState(current,stage4.grid);
    assert.equal(requestMovement(s,{x:dc,z:dr},stage4.grid),true);
    updateMovement(s,1); assert.deepEqual(s.player.currentTile,next);
    seen.add(key);queue.push(next);
  }
  assert.equal(seen.size,49);
  assert.equal(requestMovement(state,{x:1,z:-1},stage4.grid),false);
  selection.start(grid.getTile(0,0).id); selection.enterTile(grid.getTile(1,1).id);
  assert.equal(selection.currentWord,'G');
  for (const [r,c] of [[0,1],[1,1],[1,0]]) selection.enterTile(grid.getTile(r,c).id);
  const word=selection.currentWord; selection.enterTile(grid.getTile(0,0).id);
  assert.equal(selection.currentWord,word);
  assert.deepEqual(stage4.grid,{rows:7,columns:7,tileSize:1,origin:{x:0,z:1}});
  assert.deepEqual(stage4.camera,{position:[0,17,11.7],target:[0,0,-.3],verticalSpan:13,minimumWidth:14});
});
