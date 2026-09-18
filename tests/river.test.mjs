import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, Box3 } from 'three';
import { RiverView } from '../src/render/RiverView.ts';
import { stage2 } from '../src/stages/stage2.ts';

test('river stays inside reserved zone, below land and clear of the letter grid', () => {
  const view = new RiverView(stage2.forestBlockout);
  try {
    view.root.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(view.root);
    assert.ok(bounds.min.x >= 1.999 && bounds.max.x <= 4.001);
    assert.ok(bounds.min.z >= -4.501 && bounds.max.z <= 4.501);
    const water = view.root.getObjectByName('river-water');
    const waterBounds = new Box3().setFromObject(water);
    assert.ok(Math.abs(waterBounds.max.y - stage2.forestBlockout.river.waterLevel) < 1e-6);
    assert.ok(waterBounds.max.y < 0 && waterBounds.min.y >= -.851);
    assert.ok(bounds.min.x > stage2.grid.origin.x + stage2.grid.columns / 2);
    assert.equal(view.root.getObjectByName('river-recognition-ripples').visible, false);
    assert.equal(water.material.transparent, false);
  } finally { view.dispose(); }
});

test('flow advances gently, stays in water across wrap and releases owned GPU resources', () => {
  const view = new RiverView(stage2.forestBlockout);
  const highlights = view.root.getObjectByName('river-flow-highlights');
  const matrix = new Matrix4();
  highlights.getMatrixAt(4, matrix); const before = matrix.elements[14];
  view.update(1); highlights.getMatrixAt(4, matrix);
  assert.ok(matrix.elements[14] > before && matrix.elements[14] - before < .2);
  for (let step = 0; step < 600; step++) {
    view.update(.2);
    for (let i = 0; i < highlights.count; i++) {
      highlights.getMatrixAt(i, matrix);
      assert.ok(matrix.elements.every(Number.isFinite));
      assert.ok(matrix.elements[12] > 2.4 && matrix.elements[12] < 3.6);
      assert.ok(Math.abs(matrix.elements[14]) <= 4.35);
    }
  }
  const resources = new Set();
  view.root.traverse(object => { if (object.isMesh) { resources.add(object.geometry); resources.add(object.material); } });
  let disposed = 0; for (const resource of resources) resource.addEventListener('dispose', () => disposed++);
  view.dispose(); assert.equal(disposed, resources.size); assert.equal(view.root.children.length, 0);
});
