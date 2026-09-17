import { createForestStructure } from './createForestStructure.ts';
import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { ForestBlockout } from '../stages/types.ts';

/** Shared primitive resources are disposed by GameView's PrimitiveAssets owner. */
export function createForestBlockout(data: ForestBlockout, assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'forest-blockout';
  for (const area of data.terrain) {
    const section = new Group(); section.name = area.id;
    const capDepth = .12;
    const shape = area.id === 'future-river-zone' ? 'box' : area.id === 'raised-area' ? 'terrain' : 'bankTerrain';
    const earth = assets.mesh(shape, 'earth');
    earth.scale.set(area.width, area.top - capDepth - data.baseY, area.depth);
    earth.position.set(area.x, (data.baseY + area.top - capDepth) / 2, area.z);
    const cap = assets.mesh(shape, area.surface);
    cap.scale.set(area.width, capDepth, area.depth);
    cap.position.set(area.x, area.top - capDepth / 2, area.z);
    if (area.id === 'raised-area') {
      const ledge = assets.mesh('terrain', 'rock');
      ledge.scale.set(area.width + .08, .25, area.depth + .08);
      ledge.position.set(area.x, area.top - .31, area.z); section.add(ledge);
    }
    if (area.id === 'far-ground') earth.rotation.y = cap.rotation.y = Math.PI;
    section.add(earth, cap); root.add(section);
  }
  root.add(createForestStructure(data, assets));
  return root;
}
