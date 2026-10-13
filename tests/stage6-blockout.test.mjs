import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, OrthographicCamera, Vector3, Raycaster } from 'three';
import { stage6 } from '../src/stages/stage6.ts';
import { stages } from '../src/stages/registry.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { createGameState } from '../src/simulation/update.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';

test('archive fits fixed desktop/narrow frames, with clear tiles and a visible lower slot', () => {
  const assets = new PrimitiveAssets();
  try {
    const scene = createDiorama(stage6, assets); scene.updateMatrixWorld(true);
    const grid = new LetterGrid(stage6.id, stage6.grid, stage6.letterLayout);
    assert.equal(grid.tiles.length, 49);
    for (const aspect of [1440 / 900, 390 / 844, 16 / 9]) {
      const span = Math.max(stage6.camera.verticalSpan, stage6.camera.minimumWidth / aspect);
      const camera = new OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, .1, 100);
      camera.position.set(...stage6.camera.position); camera.lookAt(...stage6.camera.target); camera.updateMatrixWorld();
      for (const name of ['cutaway-stone-walls', 'final-stone-door', 'stone-mechanism', 'archive-bookshelf', 'ancient-book-altar', 'sealed-secret-compartment']) {
        const node = scene.getObjectByName(name); assert.ok(node, name);
        const box = new Box3().setFromObject(node);
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          const p = new Vector3(x, y, z).project(camera);
          assert.ok(Math.abs(p.x) < .96 && Math.abs(p.y) < .96, `clipped ${name}: ${p.toArray()}`);
        }
      }
      const direction = camera.getWorldDirection(new Vector3());
      for (const tile of grid.tiles) for (const dx of [-.4, 0, .4]) for (const dz of [-.4, 0, .4]) {
        const point = new Vector3(tile.worldPosition.x + dx, .115, tile.worldPosition.z + dz);
        const ray = new Raycaster(point.clone().addScaledVector(direction, -40), direction, 0, 39.99);
        const hits = ray.intersectObject(scene, true);
        assert.equal(hits.length, 0, `obscured ${tile.id} by ${hits[0]?.object.name}`);
      }
      // Sample the actual exposed tray, not just the existence of a named mesh.
      const tray = scene.getObjectByName('lower-compartment-tray');
      for (const x of [-.3, 0, .3]) {
        const point = tray.localToWorld(new Vector3(x / .95, .51, .28));
        const hits = new Raycaster(point.clone().addScaledVector(direction, -40), direction, 0, 39.99).intersectObject(scene, true);
        assert.equal(hits.length, 0, `lower compartment blocked by ${hits[0]?.object.name}`);
      }
      const upper = scene.getObjectByName('upper-object').getWorldPosition(new Vector3());
      const lower = tray.getWorldPosition(new Vector3());
      assert.ok(upper.y > lower.y + 1.5);
      assert.ok(upper.clone().project(camera).y > lower.clone().project(camera).y + .02);
    }
  } finally { assets.dispose(); }
});

test('Stage 6 retains the approved static environment without reactions or automatic completion', () => {
  assert.equal(stages.at(-1), stage6);
  assert.equal(stage6.stageNumber, 6); assert.equal(stage6.title, 'The Word Archive');
  const state = createGameState(stage6.playerStart, stage6.grid, stage6.quests);
  assert.equal(state.quests.definitions.length, 6);
  assert.equal(stage6.completionMode, 'manual');
  for (const key of ['exit', 'nextStageId', 'worldReactions', 'worldObjects', 'forestProgression', 'townProgression', 'supportObjectives', 'wordShardSpawns']) assert.equal(stage6[key], undefined, key);
  const completion = new StageCompletionController(stage6.id, () => assert.fail('archive auto-completed'), stage6.completionMode !== 'manual');
  completion.check(state.quests, state.words); completion.update(100, false, false);
});
