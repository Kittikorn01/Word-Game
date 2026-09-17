import test from 'node:test';
import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
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
        assert.equal(ray.intersectObject(props,true).length,0, `occlusion at ${tile.id}, height ${height}`);
      }
    }
    assert.equal(props.children.filter(p => p.name === 'forest-tree').length,6);
    assert.ok(props.children.length <= 20);
    assert.equal(stage2.quests.length,0); assert.equal(stage2.vocabulary.length,0);
  } finally { assets.dispose(); }
});
