import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { ForestBlockout } from '../stages/types.ts';

/** Static bank dressing only. The reserved span contains no deck or traversal state. */
export function createBridgeCrossing(data: ForestBlockout, assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'bridge-crossing-setup';
  const lane = data.futureBridge;
  for (const side of [-1, 1]) {
    const bank = data.terrain.find(area => area.id === (side < 0 ? 'main-ground' : 'far-ground'));
    if (!bank) continue;
    const landing = new Group(); landing.name = side < 0 ? 'near-side-landing' : 'far-side-landing';
    const edge = lane.x + side * lane.width / 2;
    const length = side < 0 ? .72 : 1.25;
    const patch = assets.mesh('terrain', 'earth'); patch.name = 'prepared-bank';
    patch.scale.set(length, .025, lane.depth + .22);
    patch.position.set(edge + side * (length / 2 + .035), bank.top + .014, lane.z);
    patch.castShadow = false; landing.add(patch);

    for (const flank of [-1, 1]) {
      const z = lane.z + flank * lane.depth / 2;
      const base = assets.mesh('terrain', 'rock'); base.name = 'anchor-footing';
      base.scale.set(.3, .09, .3); base.position.set(edge + side * .23, bank.top + .045, z);
      const post = assets.mesh('box', 'trunk'); post.name = 'unconnected-anchor-post';
      const height = flank < 0 ? .59 : .48;
      post.scale.set(.13, height, .15);
      post.position.set(edge + side * .23, bank.top + height / 2 + .05, z);
      // A low, uneven support stub stays entirely on land; nothing projects over water.
      const stub = assets.mesh('box', 'cottageWood'); stub.name = 'broken-bank-support';
      stub.scale.set(flank < 0 ? .31 : .23, .09, .12);
      stub.position.set(edge + side * .19, bank.top + .12, z);
      stub.rotation.y = flank * .09;
      landing.add(base, post, stub);
    }
    root.add(landing);
  }
  return root;
}
