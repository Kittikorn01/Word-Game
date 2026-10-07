import { createStormWorldState, StormReactionController } from '../src/simulation/StormWorldState.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage5 } from '../src/stages/stage5.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { createGameState, requestMovement, updateMovement } from '../src/simulation/update.ts';
import { questStatus, resolveQuestWord, updateQuestPresentation, refreshQuestAvailability } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { WorldReactionController } from '../src/simulation/WorldReactionController.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';

const paths = {
  "RAIN": [
    [
      0,
      0
    ],
    [
      0,
      1
    ],
    [
      0,
      2
    ],
    [
      0,
      3
    ]
  ],
  "SHELTER": [
    [
      0,
      6
    ],
    [
      1,
      6
    ],
    [
      1,
      5
    ],
    [
      2,
      5
    ],
    [
      2,
      4
    ],
    [
      3,
      4
    ],
    [
      3,
      5
    ]
  ],
  "FIRE": [
    [
      2,
      0
    ],
    [
      3,
      0
    ],
    [
      3,
      1
    ],
    [
      2,
      1
    ]
  ],
  "WARM": [
    [
      5,
      0
    ],
    [
      4,
      0
    ],
    [
      4,
      1
    ],
    [
      5,
      1
    ]
  ],
  "SAFE": [
    [
      6,
      6
    ],
    [
      6,
      5
    ],
    [
      5,
      5
    ],
    [
      5,
      4
    ]
  ],
  "RESCUE": [
    [
      6,
      2
    ],
    [
      6,
      3
    ],
    [
      5,
      3
    ],
    [
      5,
      2
    ],
    [
      4,
      2
    ],
    [
      4,
      3
    ]
  ]
};
const setup = () => {
  const grid = new LetterGrid(stage5.id, stage5.grid, stage5.letterLayout);
  const state = createGameState(stage5.playerStart, stage5.grid, stage5.quests);
  const storm = new StormReactionController(state.storm = createStormWorldState(state.words), state.words);
  const selection = new WordSelection(grid);
  const validate = createQuestValidator(state.quests.definitions, state.words);
  const submit = (word, callback) => {
    const tiles = paths[word].map(([r,c]) => grid.getTile(r,c));
    selection.start(tiles[0].id);
    tiles.slice(1).forEach(tile => selection.enterTile(tile.id));
    assert.equal(selection.currentWord, word);
    const result=resolveQuestWord(state.quests, state.words, selection.submit(), validate, id=>{storm.onQuestCompleted(id);callback?.(id);});
    storm.update(20); // Vocabulary assertions run after presentation settles; exact timing has separate coverage.
    refreshQuestAvailability(state.quests,state.words);
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
for (const [word, path] of Object.entries(paths)) test(`storm ${word}: unique path, movement, backtracking and persistent completed tiles`, () => {
  const { grid, state, selection, submit } = setup();
  assert.deepEqual(solutions(grid, word), [path]);
  const tiles = path.map(([r,c]) => grid.getTile(r,c));
  state.player.currentTile = { row: path[0][0], column: path[0][1] };
  selection.start(tiles[0].id);
  selection.enterTile(tiles[1].id); selection.enterTile(tiles[0].id);
  assert.equal(selection.currentWord, word[0]);
  for (let i=1; i<path.length; i++) {
    assert.equal(requestMovement(state, {x:path[i][1]-path[i-1][1],z:path[i][0]-path[i-1][0]}, stage5.grid), true);
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
function permutations(items) { return items.length ? items.flatMap((item,i)=>permutations(items.filter((_,j)=>j!==i)).map(rest=>[item,...rest])) : [[]]; }
for (const early of permutations(['RAIN','SHELTER','FIRE'])) test('storm progression: '+early.join(' → '), () => {
  const {state,submit}=setup(); const order=Object.keys(paths);
  const statuses=()=>state.quests.definitions.map(q=>questStatus(q,state.words));
  assert.deepEqual(stage5.vocabulary,order);
  assert.deepEqual(statuses(),['AVAILABLE','AVAILABLE','AVAILABLE','LOCKED','LOCKED','LOCKED']);
  const before=structuredClone(state.world);const reactions=new WorldReactionController(state.world,stage5.worldReactions);
  let count=0;const completion=new StageCompletionController(stage5.id,()=>count++);
  for(const [i,word] of [...early,'WARM','SAFE','RESCUE'].entries()) {
    for(const q of state.quests.definitions.filter(q=>questStatus(q,state.words)==='LOCKED')) {
      const ledger=[...state.words.completedWords];
      assert.equal(submit(q.targetWord,()=>assert.fail('locked completion')).reason,'LOCKED');
      assert.deepEqual(state.words.completedWords,ledger);
    }
    assert.equal(submit(word,reactions.onQuestCompleted).status,'CORRECT');reactions.update(10);
    assert.deepEqual(state.quests.definitions.map(q=>q.targetWord),order);
    assert.equal(statuses()[3],i<2?'LOCKED':i===2?'AVAILABLE':'COMPLETED');
    assert.equal(statuses()[4],i<3?'LOCKED':i===3?'AVAILABLE':'COMPLETED');
    assert.equal(statuses()[5],i<4?'LOCKED':i===4?'AVAILABLE':'COMPLETED');
    completion.check(state.quests,state.words);completion.update(2,false,false);assert.equal(count,i===5?1:0);
  }
  completion.update(10,false,false);assert.equal(count,1);assert.deepEqual(state.world,before);assert.equal(reactions.isBusy,false);
});

test('storm hints gate locked/completed quests and reveal prefixes; scan includes every matching decoy only temporarily', () => {
  const { grid, state, submit } = setup();
  const resources = {wordShards:100}, assistance = new AssistanceState(resources);
  for (let i=3;i<6;i++) {
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
  assert.ok(assistance.scanState.tileIds.has(grid.getTile(5,6).id)); // Decoy R.
  assistance.update(3); assert.equal(assistance.scanState,null);
  assert.deepEqual(state.words.completedWords,before);
});
test('storm spawn reaches all 49 tiles; diagonal and loop reuse rejected; approved framing unchanged', () => {
  const { grid, state, selection } = setup();
  const start = stage5.playerStart;
  assert.equal(grid.getTile(start.row,start.column).letter,'N');
  assert.ok(!Object.values(paths).flat().some(([r,c])=>r===start.row&&c===start.column));
  const queue=[start], seen=new Set([`${start.row},${start.column}`]);
  for (const current of queue) for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const next={row:current.row+dr,column:current.column+dc}, key=`${next.row},${next.column}`;
    if (!grid.getTile(next.row,next.column)||seen.has(key)) continue;
    const s=createGameState(current,stage5.grid);
    assert.equal(requestMovement(s,{x:dc,z:dr},stage5.grid),true);
    updateMovement(s,1); assert.deepEqual(s.player.currentTile,next);
    seen.add(key);queue.push(next);
  }
  assert.equal(seen.size,49);
  assert.equal(requestMovement(state,{x:1,z:-1},stage5.grid),false);
  selection.start(grid.getTile(0,0).id); selection.enterTile(grid.getTile(1,1).id);
  assert.equal(selection.currentWord,'R');
  for (const [r,c] of [[0,1],[1,1],[1,0]]) selection.enterTile(grid.getTile(r,c).id);
  const word=selection.currentWord; selection.enterTile(grid.getTile(0,0).id);
  assert.equal(selection.currentWord,word);
  assert.deepEqual(stage5.grid,{rows:7,columns:7,tileSize:1,origin:{x:0,z:1}});
  assert.deepEqual(stage5.camera,{position:[0,17,11.7],target:[0,0,-.3],verticalSpan:13,minimumWidth:14});
});
