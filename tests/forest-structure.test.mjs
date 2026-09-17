import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Raycaster, Vector3 } from 'three';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { stage2 } from '../src/stages/stage2.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';

test('forest props do not occlude board, player or feedback from the unchanged camera', () => {
  const assets = new PrimitiveAssets();
  try {
    const scene = createDiorama(stage2, assets); scene.updateMatrixWorld(true);
    const props = scene.getObjectByName('forest-structure');
    const direction = new Vector3(...stage2.camera.target).sub(new Vector3(...stage2.camera.position)).normalize();
    const ray = new Raycaster();
    const grid = new LetterGrid(stage2.id, stage2.grid, stage2.letterLayout);
    for (const tile of grid.tiles) for (const height of [.11,.7,1.65]) {
      for (const dx of [-.42,0,.42]) for (const dz of [-.42,0,.42]) {
        const point = new Vector3(tile.worldPosition.x + dx,height,tile.worldPosition.z + dz);
        ray.set(point.clone().addScaledVector(direction,-30),direction); ray.far = 29.99;
        const crossing = scene.getObjectByName('bridge-crossing-setup');
        assert.equal(ray.intersectObjects([props, crossing],true).length,0, `occlusion at ${tile.id}, height ${height}`);
      }
    }
    assert.equal(props.children.filter(p => p.name === 'forest-tree').length,6);
    assert.ok(props.children.length <= 20);
    assert.equal(stage2.quests.length,6); assert.equal(stage2.vocabulary.length,6);
  } finally { assets.dispose(); }
});

test('crossing landings leave the full reserved river span empty and stay clear of the grid', () => {
  const assets = new PrimitiveAssets();
  try {
    const scene = createDiorama(stage2, assets); scene.updateMatrixWorld(true);
    const lane = stage2.forestBlockout.futureBridge;
    const crossing = scene.getObjectByName('bridge-crossing-setup');
    const near = new Box3().setFromObject(crossing.getObjectByName('near-side-landing'));
    const far = new Box3().setFromObject(crossing.getObjectByName('far-side-landing'));
    assert.ok(near.max.x <= lane.x - lane.width / 2);
    assert.ok(far.min.x >= lane.x + lane.width / 2);
    const gridRight = stage2.grid.origin.x + stage2.grid.columns * stage2.grid.tileSize / 2;
    assert.ok(near.min.x - gridRight >= .2);
    assert.equal(near.min.z, far.min.z);
    assert.equal(near.max.z, far.max.z);
    assert.equal(stage2.worldReactions, undefined);
  } finally { assets.dispose(); }
});
