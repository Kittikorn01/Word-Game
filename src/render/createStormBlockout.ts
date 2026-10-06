import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';

/** Static reserved landmarks. All GPU resources belong to PrimitiveAssets. */
export function createStormBlockout(assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'storm-blockout';
  const group = (name: string, x: number, z: number) => {
    const node = new Group(); node.name = name; node.position.set(x, 0, z); root.add(node); return node;
  };
  const part = (parent: Group, name: string, x: number, y: number, z: number,
    w: number, h: number, d: number, surface: keyof PrimitiveAssets['material'], shape: keyof PrimitiveAssets['geometry'] = 'box') => {
    const mesh = assets.mesh(shape, surface); mesh.name = name;
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
  };
  part(root, 'clearing-earth-base', 0, -.34, .3, 12.6, .6, 12, 'stormEdge', 'townSlab');
  part(root, 'wet-forest-floor', 0, -.045, .3, 12.6, .09, 12, 'stormEarth', 'townSlab');
  part(root, 'grid-stone-border', 0, .005, 1, 7.24, .02, 7.24, 'stormStone', 'townSlab');
  // Open lean-to with a short rear roof to reveal the protected floor to the camera.
  const shelter = group('forest-shelter', -.5, -4.3);
  part(shelter, 'covered-ground', 0, .065, .1, 5.4, .13, 2.3, 'stormDry', 'townSlab');
  for (const x of [-2.45, 2.45]) {
    part(shelter, 'rear-post', x, 1.03, -.85, .18, 2.06, .18, 'stormWood');
    part(shelter, 'front-post', x, 1.23, .72, .18, 2.46, .18, 'stormWood');
  }
  for (const y of [.45, .85, 1.25, 1.65]) part(shelter, 'rear-windbreak', 0, y, -.89, 4.95, .34, .1, 'stormWood');
  part(shelter, 'front-crossbeam', 0, 2.43, .72, 5.25, .18, .18, 'stormWood');
  const roof = part(shelter, 'sloped-weather-roof', 0, 2.29, -.25, 5.7, .16, 1.85, 'stormRoof'); roof.rotation.x = .22;
  for (const x of [-2.3, -1.15, 0, 1.15, 2.3]) {
    const rib = part(shelter, 'roof-batten', x, 2.39, -.25, .055, .035, 1.85, 'stormWood'); rib.rotation.x = .22;
  }
  const dry = group('safe-dry-zone', .85, -3.55);
  part(dry, 'resting-mat', 0, .145, 0, 1.65, .045, .85, 'stormMat', 'townSlab');
  part(dry, 'rolled-mat-end', .66, .23, 0, .22, .19, .8, 'stormDry');
  const fire = group('unlit-fire-area', -1.95, -2.98);
  part(fire, 'cold-ash-bed', 0, .035, 0, 1.1, .05, .9, 'stormEdge', 'rock');
  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI * 2 / 9;
    part(fire, 'fire-ring-stone', Math.cos(angle) * .59, .15, Math.sin(angle) * .43, .32, .26, .28, 'stormStone', 'rock');
  }
  for (const angle of [-.6, .6]) {
    const log = part(fire, 'unlit-firewood', 0, .13, 0, .73, .13, .14, 'stormWood'); log.rotation.y = angle;
  }
  const path = group('rescue-entry-path', 4.55, 1);
  part(path, 'outside-arrival', .35, .013, 3.45, 1.25, .025, 3, 'stormPath', 'townSlab');
  part(path, 'forest-trail', 0, .015, .55, 1.4, .028, 3.4, 'stormPath', 'townSlab');
  const bend = part(path, 'trail-to-shelter', -.65, .017, -2.45, 1.4, .03, 3.4, 'stormPath', 'townSlab'); bend.rotation.y = .42;
  part(root, 'shelter-approach', 2.35, .02, -3.12, 1.9, .035, .85, 'stormPath', 'townSlab');
  const forest = group('forest-framing', 0, 0);
  for (const [x,z,s] of [[-5.05,-4.3,1],[4.85,-4.5,.95],[-5.3,-.65,.85],[5.7,.3,.65],[-5.2,3.55,.6]]) {
    part(forest, 'pine-trunk', x, .5*s, z, 1.1*s, 1.3*s, 1.1*s, 'stormWood', 'trunk');
    part(forest, 'pine-crown', x, 1.6*s, z, 1.25*s, 1.55*s, 1.25*s, 'stormLeaf', 'crown');
    part(forest, 'pine-tip', x, 2.45*s, z, .85*s, 1.1*s, .85*s, 'stormLeafTop', 'crown');
  }
  for (const [x,z,s] of [[-4.7,1.7,.8],[5.65,5.25,.65],[-3.9,-4.8,.55]])
    part(forest, 'wet-rock', x, s*.28, z, s, s*.65, s*.8, 'stormStone', 'rock');
  for (const [x,z,w,d] of [[-4.65,3,1.2,.55],[4.45,1.3,.8,.6],[1.3,5.25,1.7,.55],[-4.7,-2.4,.8,.5]])
    part(root, 'shallow-puddle', x, .012, z, w, .018, d, 'stormWater', 'townSlab');
  return root;
}

