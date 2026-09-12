import { paths } from './stage1-paths.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStageWordValidator } from '../src/validation/WordValidator.ts';
import { createWordProgress, resolveWord } from '../src/simulation/WordProgress.ts';
import { WordFeedback } from '../src/feedback/WordFeedback.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { stage1 } from '../src/stages/stage1.ts';
const validate = createStageWordValidator(stage1.vocabulary);
const submission = word => ({word, selectedTileIds: [], path: []});
test('normalizes targets, submissions and completed words; rejects non-target English words', () => {
  const check = createStageWordValidator([' Key ']);
  for (const word of ['key', 'Key', 'KEY', ' key ']) assert.equal(check(submission(word), []).status, 'CORRECT');
  assert.equal(check(submission('KEY'), ['key']).status, 'ALREADY_COMPLETED');
  for (const word of ['CAT', '', '   ']) assert.equal(validate(submission(word), []).status, 'WRONG');
});
test('all six real board paths resolve; correct tiles persist, cleanup allows reuse, duplicates do not progress', () => {
  const grid = new LetterGrid(stage1.id, stage1.grid, stage1.letterLayout);
  const progress = createWordProgress(), feedback = new WordFeedback(grid);
  const original = grid.tiles.map(t => t.letter);
  let last;
  const selection = new WordSelection(grid, s => { last = resolveWord(progress, s, validate); feedback.begin(last); });
  const start = id => !feedback.isResolving && selection.start(id);
  for (const word of [...stage1.vocabulary, 'KEY']) {
    const [[row, column], ...rest] = paths[word];
    assert.equal(start(grid.getTile(row,column).id), true);
    for (const [r,c] of rest) selection.enterTile(grid.getTile(r,c).id);
    assert.equal(selection.currentWord, word);
    const duplicate = progress.completedWords.includes(word);
    selection.submit();
    assert.equal(last.status, duplicate ? 'ALREADY_COMPLETED' : 'CORRECT');
    assert.equal(feedback.selectedTiles.length, word.length);
    assert.equal(start(grid.getTile(0,0).id), false);
    assert.equal(selection.submit(), null);
    assert.equal(feedback.begin(last), false);
    if (!duplicate) assert.ok(feedback.selectedTiles.every(t => t.state === 'CORRECT'));
    feedback.update(0.2); assert.equal(feedback.isResolving,true);
    grid.update(2); feedback.update(2);
    assert.equal(feedback.isResolving,false); assert.deepEqual(feedback.selectedTiles,[]);
    assert.equal(feedback.message,''); assert.equal(selection.currentWord,'');
    assert.ok(grid.tiles.every(t => t.state === 'NORMAL'));
    assert.deepEqual(grid.tiles.map(t => t.letter), original);
  }
  assert.deepEqual(progress.completedWords, stage1.vocabulary);
});
test('backtrack does not validate before release; wrong and interrupted feedback preserve progress', () => {
  const grid = new LetterGrid(stage1.id, stage1.grid, stage1.letterLayout);
  const progress = createWordProgress(), feedback = new WordFeedback(grid);
  let count=0;
  const selection=new WordSelection(grid,s=>{ count++; feedback.begin(resolveWord(progress,s,validate)); });
  selection.start(grid.getTile(0,0).id);
  for(const c of [1,2,1]) selection.enterTile(grid.getTile(0,c).id);
  assert.equal(selection.currentWord,'KE'); assert.equal(count,0);
  selection.submit(); assert.equal(count,1);
  assert.match(feedback.message,/That word isn't needed here\./);
  assert.equal(feedback.visual.tone,'wrong'); assert.deepEqual(progress.completedWords,[]);
  feedback.clear(); assert.equal(feedback.isResolving,false);
  assert.ok(grid.tiles.every(t=>t.state==='NORMAL'));
  selection.start(grid.getTile(0,0).id);
  selection.enterTile(grid.getTile(0,1).id); selection.enterTile(grid.getTile(0,2).id); selection.submit();
  feedback.clear(); assert.deepEqual(progress.completedWords,['KEY']);
  assert.ok(grid.tiles.every(t=>t.state==='NORMAL' && t.correctRemaining===0));
});

