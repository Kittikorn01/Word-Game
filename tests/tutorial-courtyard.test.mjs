import test from 'node:test';
import assert from 'node:assert/strict';
import { tutorialStage, tutorialPath } from '../src/stages/tutorial.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { createGameState, requestMovement, updateMovement } from '../src/simulation/update.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';

test('real movement and selection solve START through a turn among distractors', () => {
  const grid = new LetterGrid(tutorialStage.id, tutorialStage.grid, tutorialStage.letterLayout);
  const state = createGameState(tutorialStage.playerStart, tutorialStage.grid);
  const selected = new WordSelection(grid);
  for (const [i, target] of tutorialPath.entries()) {
    const current = state.player.currentTile;
    assert.equal(requestMovement(state, { x: target.column-current.column, z: target.row-current.row }, tutorialStage.grid), true);
    assert.equal(updateMovement(state, .18), true);
    const tile = grid.getTile(target.row,target.column);
    if (i === 0) selected.start(tile.id); else selected.enterTile(tile.id);
  }
  assert.equal(selected.submit().word, 'START');
  assert.ok(grid.tiles.length > tutorialPath.length * 3);
});
test('wrong route remains retryable and does not modify real quest or resource state', () => {
  const grid = new LetterGrid(tutorialStage.id, tutorialStage.grid, tutorialStage.letterLayout);
  const selection = new WordSelection(grid);
  selection.start(grid.getTile(2,1).id); selection.enterTile(grid.getTile(3,1).id);
  assert.notEqual(selection.submit().word, 'START');
  selection.start(grid.getTile(2,1).id);
  for (const point of tutorialPath.slice(1)) selection.enterTile(grid.getTile(point.row,point.column).id);
  assert.equal(selection.submit().word, 'START');
  assert.equal(tutorialStage.quests, undefined);
});
test('courtyard provides an animated door and leaves the letter floor clear', () => {
  const assets = new PrimitiveAssets(), scene = createDiorama(tutorialStage, assets);
  const door = scene.getObjectByName('tutorial-door');
  assert.ok(door); assert.ok(door.position.z < -2.5);
  assert.equal(door.rotation.y, 0);
  assets.dispose();
});
