import { RiverView } from '../src/render/RiverView.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3, Box3 } from 'three';
import { stage2 } from '../src/stages/stage2.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { gridToWorld, movementBounds } from '../src/stages/types.ts';
import { createGameState, requestMovement, updateMovement } from '../src/simulation/update.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';

test('offset grid round trips, stays safely on main ground, and supports original movement', () => {
  const grid = new LetterGrid(stage2.id, stage2.grid, stage2.letterLayout);
  const main = stage2.forestBlockout.terrain.find(area => area.id === 'main-ground');
  for (const tile of grid.tiles) {
    assert.deepEqual(grid.worldToGrid(tile.worldPosition), { row: tile.row, column: tile.column });
    assert.ok(Math.abs(tile.worldPosition.x - main.x) + .5 <= main.width / 2 - .9);
    assert.ok(Math.abs(tile.worldPosition.z - main.z) + .5 <= main.depth / 2 - .9);
  }
  const bounds = movementBounds(stage2);
  assert.equal(grid.worldToGrid({ x: bounds.maxX, z: 0 }), null);
  assert.deepEqual(grid.worldToGrid({ x: bounds.minX, z: bounds.minZ }), { row: 0, column: 0 });
  const state = createGameState(stage2.playerStart, stage2.grid, stage2.quests);
  assert.deepEqual(gridToWorld(state.player.currentTile.column, state.player.currentTile.row, stage2.grid), { x: -2.5, z: 2 });
  assert.equal(requestMovement(state, { x: 0, z: -1 }, stage2.grid), true);
  updateMovement(state, .18);
  assert.deepEqual(state.player.currentTile, { row: 4, column: 3 });
});

test('river foundation and raised ground fit the unchanged camera without a crossing', () => {
  const assets = new PrimitiveAssets();
  const water = new RiverView(stage2.forestBlockout);
  try {
    const scene = createDiorama(stage2, assets); scene.add(water.root); scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(scene);
    const data = stage2.forestBlockout;
    const river = data.terrain.find(area => area.id === 'future-river-zone');
    assert.ok(river.top < 0);
    assert.ok(data.terrain.find(area => area.id === 'raised-area').top > 1);
    assert.equal(stage2.worldObjects, undefined);
    assert.deepEqual(stage2.quests, []); assert.deepEqual(stage2.decorations, []);
    assert.equal(scene.getObjectByName('future-crossing-bank-marker'), undefined);
    for (const [width, height] of [[1440,900],[1280,720],[390,844]]) {
      const aspect = width / height, span = Math.max(stage2.camera.verticalSpan, stage2.camera.minimumWidth / aspect);
      const camera = new OrthographicCamera(-span*aspect/2, span*aspect/2, span/2, -span/2, .1, 100);
      camera.position.set(...stage2.camera.position); camera.lookAt(...stage2.camera.target); camera.updateMatrixWorld(true);
      for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
        const projected = new Vector3(x,y,z).project(camera);
        assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, `clipped at ${width}x${height}`);
      }
      if (width >= 1280) assert.ok(height / span >= 55, 'desktop letters must retain useful pixel size');
    }
  } finally { water.dispose(); assets.dispose(); }
});
