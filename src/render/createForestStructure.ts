import { Group } from 'three';
import type { ForestBlockout } from '../stages/types.ts';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';

/** Static, data-placed nature shapes; resource lifetime belongs to PrimitiveAssets. */
export function createForestStructure(data: ForestBlockout, assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'forest-structure';
  for (const item of data.nature ?? []) {
    const group = new Group(); group.name = `forest-${item.kind}`;
    group.position.set(item.x, item.y, item.z); group.scale.setScalar(item.scale);
    if (item.kind === 'tree') {
      const trunk = assets.mesh('trunk', 'trunk'); trunk.position.y = .4;
      const crown = assets.mesh('crown', 'leaf'); crown.position.y = 1.25;
      const tip = assets.mesh('crown', 'leafLight'); tip.position.y = 1.95; tip.scale.setScalar(.7);
      // Keep foliage shadows from darkening letters; the ground receives ambient scene lighting.
      trunk.castShadow = crown.castShadow = tip.castShadow = false;
      group.add(trunk, crown, tip);
    } else if (item.kind === 'rock') {
      const rock = assets.mesh('rock', 'rock'); rock.scale.set(1.1,.7,.8); rock.position.y = .3;
      rock.rotation.y = item.x; group.add(rock);
    } else if (item.kind === 'bush') {
      for (let i = 0; i < 2; i++) {
        const bush = assets.mesh('rock', i ? 'leafLight' : 'leaf');
        bush.scale.set(.8,.65,.7); bush.position.set(i * .42 - .21,.25,i * .16); group.add(bush);
      }
    } else {
      const patch = assets.mesh('terrain', 'leafLight'); patch.scale.set(1.1,.018,.7); patch.position.y = .012; group.add(patch);
      for (let i = 0; i < 3; i++) {
        const blade = assets.mesh('crown', 'leaf'); blade.scale.set(.075,.19 + i * .025,.075);
        blade.position.set((i - 1) * .2,.15, (i % 2) * .12); blade.castShadow = false; group.add(blade);
      }
    }
    root.add(group);
  }
  return root;
}
