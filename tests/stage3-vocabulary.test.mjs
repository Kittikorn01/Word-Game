import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3 } from '../src/stages/stage3.ts';
import { stage1 } from '../src/stages/stage1.ts';
import { stage2 } from '../src/stages/stage2.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { createGameState } from '../src/simulation/update.ts';
import { questStatus, resolveQuestWord } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { WorldReactionController } from '../src/simulation/WorldReactionController.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
export const paths = {
 BREAD:[[0,0],[0,1],[1,1],[1,2],[1,3]], COIN:[[0,6],[1,6],[2,6],[3,6]],
 SHOP:[[3,3],[3,2],[3,1],[4,1]], LETTER:[[4,0],[5,0],[5,1],[6,1],[6,2],[5,2]],
 CLOCK:[[0,3],[0,4],[1,4],[2,4],[2,5]], CARRY:[[4,4],[4,5],[5,5],[5,6],[6,6]]
};
const grid = () => new LetterGrid(stage3.id,stage3.grid,stage3.letterLayout);
const state = () => createGameState(stage3.playerStart,stage3.grid,stage3.quests);
function unlockFor(s,word) {
 if(word==='SHOP')s.words.completedWords=['BREAD','COIN'];
 if(word==='CARRY')s.words.completedWords=['BREAD','COIN','SHOP','LETTER'];
 const q=s.quests.definitions.find(q=>q.targetWord===word);
 if(!s.quests.discoveredIds.includes(q.id))s.quests.discoveredIds.push(q.id);
}
function solutions(g,word) {
 const found=[];
 function visit(tile,path) {
  if(!tile || path.includes(tile) || tile.letter!==word[path.length])return;
  const next=[...path,tile];
  if(next.length===word.length){found.push(next.map(t=>[t.row,t.column]));return;}
  for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]])visit(g.getTile(tile.row+dr,tile.column+dc),next);
 }
 g.tiles.forEach(t=>visit(t,[]));return found;
}
for(const [word,coords] of Object.entries(paths))test(`town ${word}: exactly one cardinal path, backtracking, valid submission, persistent tiles`,()=>{
 const g=grid(),s=state(),selection=new WordSelection(g); unlockFor(s,word);
 assert.deepEqual(solutions(g,word),[coords]);
 const tiles=coords.map(([r,c])=>g.getTile(r,c));
 selection.start(tiles[0].id);selection.enterTile(tiles[1].id);selection.enterTile(tiles[0].id);
 assert.equal(selection.currentWord,word[0]);
 tiles.slice(1).forEach(t=>selection.enterTile(t.id));
 assert.equal(selection.currentWord,word);assert.equal(new Set(selection.selectedTileIds).size,word.length);
 assert.equal(resolveQuestWord(s.quests,s.words,selection.submit(),createQuestValidator(s.quests.definitions,s.words)).status,'CORRECT');
 assert.equal(questStatus(s.quests.definitions.find(q=>q.targetWord===word),s.words),'COMPLETED');
 assert.deepEqual(solutions(g,word),[coords]);assert.equal(g.tiles.length,49);
});
test('town has four initial clues, prefix hints after dependencies and a scan that includes decoys',()=>{
 const s=state(),g=grid(),a=new AssistanceState({wordShards:50});
 assert.deepEqual(stage3.vocabulary,Object.keys(paths));assert.equal(s.quests.discoveredIds.length,4);
 for(const [i,q]of s.quests.definitions.entries()) {
  unlockFor(s,q.targetWord); assert.equal(questStatus(q,s.words),'AVAILABLE');assert.equal(q.worldReactionId,`town.${q.targetWord.toLowerCase()}`);
  assert.ok(!q.clue.toUpperCase().includes(q.targetWord));s.quests.focusedIndex=i;
  for(let n=1;n<q.targetWord.length;n++) {
   assert.equal(a.requestHint(s.quests,s.words,false),'');
   assert.equal(a.hintText(s.quests,s.words),[...q.targetWord].map((c,j)=>j<n?c:'_').join(' '));
  }
  assert.ok(a.requestHint(s.quests,s.words,false));
 }
 assert.equal(a.requestScan('c',g,false),'');assert.deepEqual([...a.scanState.tileIds],g.findLetter('C').map(t=>t.id));
 assert.equal(a.scanState.tileIds.size,5); // Includes decoy C at row 4, column 5 (one-based).
 a.update(3);assert.equal(a.scanState,null);
});
test('town spawn is a decoy, diagonals fail, all quests complete in dependency order without cottage world changes',()=>{
 const s=state(),g=grid(),before=structuredClone(s.world),r=new WorldReactionController(s.world,stage3.worldReactions);
 assert.equal(g.getTile(6,3).letter,'N');assert.ok(!Object.values(paths).flat().some(([r,c])=>r===6&&c===3));
 for(const prior of [stage1,stage2])assert.notDeepEqual(stage3.letterLayout,prior.letterLayout);
 const selection=new WordSelection(g);selection.start(g.getTile(0,0).id);selection.enterTile(g.getTile(1,1).id);assert.equal(selection.currentWord,'B');selection.cancel();
 let completed=0;const completion=new StageCompletionController(stage3.id,()=>completed++);
 for(const word of ['CLOCK','LETTER','COIN','BREAD','SHOP','CARRY']) {
  const tiles=paths[word].map(([r,c])=>g.getTile(r,c));selection.start(tiles[0].id);tiles.slice(1).forEach(t=>selection.enterTile(t.id));
  assert.equal(resolveQuestWord(s.quests,s.words,selection.submit(),createQuestValidator(s.quests.definitions,s.words),r.onQuestCompleted).status,'CORRECT');
  r.update(10);completion.check(s.quests,s.words);
 }
 completion.update(1,false,false);completion.update(1,false,false);assert.equal(completed,1);
 assert.deepEqual(s.world,before);assert.equal(r.isBusy,false);assert.equal(stage3.worldReactions,undefined);
 assert.deepEqual(g.tiles.map(t=>t.letter).join(''),stage3.letterLayout.join(''));
});

