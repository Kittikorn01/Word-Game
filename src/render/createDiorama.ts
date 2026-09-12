import { createCottage } from './createCottage.ts';
import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { StageDefinition } from '../stages/types.ts';
export function createDiorama(stage: StageDefinition, assets: PrimitiveAssets): Group {
  if (stage.environment === 'cottage') return createCottage(stage, assets);
  const root = new Group();
  const width = stage.grid.columns * stage.grid.tileSize + 3;
  const depth = stage.grid.rows * stage.grid.tileSize + 3;
  const base = assets.mesh('box', 'earth'); base.scale.set(width, 0.65, depth); base.position.y = -0.48;
  const turf = assets.mesh('box', 'grass'); turf.scale.set(width, 0.2, depth); turf.position.y = -0.08;
  root.add(base, turf);
  for (const item of stage.decorations) {
    const decoration = new Group(); decoration.position.set(item.x, 0.02, item.z); decoration.scale.setScalar(item.scale);
    if (item.kind === 'tree') {
      const trunk = assets.mesh('trunk', 'trunk'); trunk.position.y = 0.4;
      const crown = assets.mesh('crown', 'leaf'); crown.position.y = 1.35;
      const top = assets.mesh('crown', 'leafLight'); top.scale.setScalar(0.72); top.position.y = 2;
      decoration.add(trunk, crown, top);
    } else {
      const rock = assets.mesh('rock', 'rock'); rock.scale.set(1.3, 0.85, 1); rock.position.y = 0.32; rock.rotation.y = item.x; decoration.add(rock);
    }
    root.add(decoration);
  }
  return root;
}

