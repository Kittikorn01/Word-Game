import test from 'node:test';
import assert from 'node:assert/strict';
import { LetterGrid, areAdjacent, CORRECT_DURATION } from '../src/grid/LetterGrid.ts';
import { stage1 } from '../src/stages/stage1.ts';
const create = () => new LetterGrid(stage1.id, stage1.grid, stage1.letterLayout);
// Test-only DFS: runtime intentionally has no word validation.
function findPath(grid, word, path = []) {
  if (path.length === word.length) return path;
  for (const tile of grid.tiles) {
    if (tile.letter !== word[path.length] || path.includes(tile) ||
      (path.length && !areAdjacent(path.at(-1), tile))) continue;
    const found = findPath(grid, word, [...path, tile]);
    if (found) return found;
  }
  return null;
}
for (const word of stage1.vocabulary) test(`Stage 1 contains cardinal path: ${word}`, () => {
  const path = findPath(create(), word);
  assert.ok(path); assert.equal(path.map(t => t.letter).join(''), word);
  assert.equal(new Set(path.map(t => t.id)).size, word.length);
  console.log(`${word}: ${path.map(t => `(${t.row},${t.column})`).join(' -> ')}`);
});
test('cardinal neighbors only', () => {
  const a = { row: 2, column: 2 };
  for (const [row,column] of [[1,2],[3,2],[2,1],[2,3]]) assert.ok(areAdjacent(a,{row,column}));
  for (const [row,column] of [[1,1],[1,3],[3,1],[3,3],[2,2],[2,4]]) assert.equal(areAdjacent(a,{row,column}),false);
});
test('deterministic IDs and world/grid round trips at different cell sizes', () => {
  assert.deepEqual(create().tiles, create().tiles);
  for (const tileSize of [0.5, 1, 2]) {
    const grid = new LetterGrid('test',{...stage1.grid,tileSize},stage1.letterLayout);
    assert.equal(new Set(grid.tiles.map(t=>t.id)).size,49);
    for (const tile of grid.tiles) assert.equal(grid.tileAtWorld(tile.worldPosition),tile);
    assert.equal(grid.tileAtWorld({x:3.5*tileSize,z:0}),undefined);
    assert.equal(grid.tileAtWorld({x:-3.5*tileSize,z:0})?.column,0);
    assert.equal(grid.tileAtWorld({x:0,z:-3.501*tileSize}),undefined);
    assert.equal(grid.tileAtWorld({x:NaN,z:0}),undefined);
    assert.equal(grid.getTile(0,7),undefined);
  }
});
test('hover never overwrites selection; correct expires and reset cancels feedback', () => {
  const grid=create(), tile=grid.tiles[0];
  grid.setHovered(tile.id); assert.equal(grid.visualState(tile),'HOVER');
  grid.setHovered(null); assert.equal(grid.visualState(tile),'NORMAL');
  grid.toggleSelected(tile.id); grid.setHovered(tile.id); grid.setHovered(null);
  assert.equal(grid.visualState(tile),'SELECTED');
  grid.playCorrectOnSelected(); assert.equal(grid.visualState(tile),'CORRECT');
  grid.toggleSelected(tile.id); assert.equal(tile.state,'CORRECT');
  grid.update(CORRECT_DURATION); assert.equal(tile.state,'NORMAL');
  grid.toggleSelected(tile.id); grid.toggleSelected(tile.id); assert.equal(tile.state,'NORMAL');
  grid.toggleSelected(tile.id); grid.playCorrectOnSelected(); grid.reset();
  assert.equal(tile.correctRemaining,0); assert.equal(grid.visualState(tile),'NORMAL');
});
test('malformed stage layout fails early', () => {
  for (const layout of [[],['lowercase'],stage1.letterLayout.map((r,i)=>i===0?'1234567':r)])
    assert.throws(()=>new LetterGrid('bad',stage1.grid,layout));
});
