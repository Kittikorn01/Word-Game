import test from 'node:test';
import assert from 'node:assert/strict';
import { stage2 } from '../src/stages/stage2.ts';
import { stage1 } from '../src/stages/stage1.ts';
import { LetterGrid, areAdjacent } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { createGameState, requestMovement } from '../src/simulation/update.ts';
import { questStatus, resolveQuestWord } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { createForestWorldState, ForestReactionController } from '../src/simulation/ForestWorldState.ts';
function unlockFor(s, word) {
 if (word === 'BRIDGE') s.words.completedWords = ['WOOD','ROPE'];
 if (word === 'CLIMB') { s.words.completedWords = ['WOOD','ROPE','BRIDGE']; s.words.worldConditions = {bridgeBuilt:true,climbRouteOpen:false}; }
 const q=s.quests.definitions.find(q=>q.targetWord===word);
 if (!s.quests.discoveredIds.includes(q.id)) s.quests.discoveredIds.push(q.id);
}
const paths = {
 TREE:[[0,0],[0,1],[0,2],[0,3]], WOOD:[[1,0],[2,0],[3,0],[3,1]],
 ROPE:[[1,6],[1,5],[1,4],[2,4]], RIVER:[[2,2],[3,2],[4,2],[4,3],[5,3]],
 BRIDGE:[[3,6],[4,6],[4,5],[5,5],[5,4],[6,4]], CLIMB:[[6,0],[5,0],[5,1],[4,1],[4,0]]
};
const grid = () => new LetterGrid(stage2.id, stage2.grid, stage2.letterLayout);
function solve(g, word) {
 const found=[];
 function visit(tile, path) {
  if (!tile || path.includes(tile) || tile.letter !== word[path.length]) return;
  const next=[...path,tile];
  if (next.length===word.length) { found.push(next.map(t=>[t.row,t.column])); return; }
  for (const [r,c] of [[1,0],[-1,0],[0,1],[0,-1]]) visit(g.getTile(tile.row+r,tile.column+c),next);
 }
 for (const tile of g.tiles) visit(tile,[]);
 return found;
}
for (const [word, coords] of Object.entries(paths)) test(`${word}: unique orthogonal solution, backtracking and real quest submission`,()=>{
 const g=grid(), s=createGameState(stage2.playerStart,stage2.grid,stage2.quests);
 assert.deepEqual(solve(g,word),[coords]);
 const tiles=coords.map(([r,c])=>g.getTile(r,c));
 const selection=new WordSelection(g); selection.start(tiles[0].id);
 selection.enterTile(tiles[1].id); selection.enterTile(tiles[0].id);
 assert.equal(selection.currentWord,word[0]);
 for(const tile of tiles.slice(1)) selection.enterTile(tile.id);
 assert.equal(selection.currentWord,word);
 assert.equal(new Set(selection.selectedTileIds).size,word.length);
 unlockFor(s,word);
 const result=resolveQuestWord(s.quests,s.words,selection.submit(),createQuestValidator(s.quests.definitions,s.words));
 assert.equal(result.status,'CORRECT');
 assert.deepEqual(solve(g,word),[coords]); assert.equal(g.tiles.length,49);
});
test('four initial clues, generic progressive hints after dependencies, scan includes every decoy R',()=>{
 const s=createGameState(stage2.playerStart,stage2.grid,stage2.quests), g=grid();
 assert.notDeepEqual(stage2.letterLayout,stage1.letterLayout);
 assert.equal(s.quests.discoveredIds.length,4);
 const a=new AssistanceState({wordShards:50});
 s.quests.definitions.forEach((q,i)=>{
  unlockFor(s,q.targetWord);
  assert.equal(questStatus(q,s.words),'AVAILABLE'); assert.ok(q.worldReactionId);
  assert.ok(!q.clue.toUpperCase().includes(q.targetWord));
  s.quests.focusedIndex=i;
  for(let n=1;n<q.targetWord.length;n++) {
   assert.equal(a.requestHint(s.quests,s.words,false),'');
   assert.equal(a.hintText(s.quests,s.words),[...q.targetWord].map((c,j)=>j<n?c:'_').join(' '));
  }
  assert.ok(a.requestHint(s.quests,s.words,false));
 });
 assert.equal(a.requestScan('r',g,false),'');
 assert.deepEqual([...a.scanState.tileIds],g.findLetter('R').map(t=>t.id));
 assert.equal(a.scanState.tileIds.size,6);
});
test('start is a decoy; diagonals rejected; forest reactions preserve the tested board',()=>{
 const g=grid(),s=createGameState(stage2.playerStart,stage2.grid,stage2.quests);
 assert.equal(g.getTile(stage2.playerStart.row,stage2.playerStart.column).letter,'N');
 assert.ok(!Object.values(paths).flat().some(([r,c])=>r===stage2.playerStart.row&&c===stage2.playerStart.column));
 assert.equal(areAdjacent({row:0,column:0},{row:1,column:1}),false);
 const selection=new WordSelection(g); selection.start(g.getTile(0,0).id); selection.enterTile(g.getTile(1,1).id); assert.equal(selection.currentWord,'T');
 const layout=g.tiles.map(t=>t.letter), reactions=new ForestReactionController(createForestWorldState(s.words));
 for(const word of stage2.vocabulary) {
  assert.equal(resolveQuestWord(s.quests,s.words,{word,selectedTileIds:[],path:[]},createQuestValidator(s.quests.definitions,s.words),reactions.onQuestCompleted).status,'CORRECT');
  reactions.update(10);
 }
 assert.deepEqual(g.tiles.map(t=>t.letter),layout); assert.equal(reactions.isBusy,false);
 assert.equal(reactions.state.conditions.climbRouteOpen,true);
 s.player.currentTile={row:3,column:6}; assert.equal(requestMovement(s,{x:1,z:0},stage2.grid),false);
 assert.equal(stage2.nextStageId,'stage-3-busy-little-town'); assert.equal(stage2.worldObjects,undefined);
});

import { WordSelectionInput } from '../src/input/WordSelectionInput.ts';
test('Space and mouse hold/release submit once, exclude each other, cancel on blur, dispose cleanly',()=>{
 globalThis.window=new EventTarget(); globalThis.document=new EventTarget(); globalThis.HTMLElement=class {};
 const canvas=new EventTarget(); let captured=null, starts=0, submits=0, cancels=0;
 canvas.setPointerCapture=id=>{captured=id;}; canvas.hasPointerCapture=id=>captured===id; canvas.releasePointerCapture=()=>{captured=null;};
 const input=new WordSelectionInput(canvas,()=>{starts++;return true;},()=>submits++,()=>cancels++);
 const key=(type,repeat=false)=>window.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),{code:'Space',repeat}));
 const mouse=(target,type)=>target.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),{pointerType:'mouse',button:0,pointerId:1}));
 try {
  key('keydown'); key('keydown',true); mouse(canvas,'pointerdown'); assert.equal(starts,1);
  key('keyup'); key('keyup'); assert.equal(submits,1);
  mouse(canvas,'pointerdown'); key('keydown'); assert.equal(starts,2);
  mouse(window,'pointerup'); assert.equal(submits,2);
  key('keydown'); window.dispatchEvent(new Event('blur')); key('keyup'); assert.equal(cancels,1); assert.equal(submits,2);
  input.dispose(); key('keydown'); mouse(canvas,'pointerdown'); assert.equal(starts,3);
 } finally { input.dispose(); delete globalThis.window; delete globalThis.document; delete globalThis.HTMLElement; }
});

