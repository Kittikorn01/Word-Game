import { createForestBlockout } from './createForestBlockout.ts';
import { createTownBlockout } from './createTownBlockout.ts';
import { createWorkshopBlockout } from './createWorkshopBlockout.ts';
import { createCottage } from './createCottage.ts';
import { createStormBlockout } from './createStormBlockout.ts';
import { createArchiveBlockout } from './createArchiveBlockout.ts';
import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { StageDefinition } from '../stages/types.ts';
export function createDiorama(stage: StageDefinition, assets: PrimitiveAssets): Group {
  if (stage.environment === 'archive-blockout') return createArchiveBlockout(assets);
  if (stage.environment === 'storm-blockout') return createStormBlockout(assets);
  if (stage.environment === 'workshop-blockout') return createWorkshopBlockout(assets);
  if (stage.environment === 'town-blockout' && stage.townBlockout) return createTownBlockout(stage.townBlockout, assets);
  if (stage.environment === 'forest-blockout' && stage.forestBlockout) return createForestBlockout(stage.forestBlockout, assets);
  if (stage.environment === 'cottage') return createCottage(stage, assets);
  const root = new Group();
  const width = stage.grid.columns * stage.grid.tileSize + 3;
  const depth = stage.grid.rows * stage.grid.tileSize + (stage.environment === 'tutorial-courtyard' ? 7 : 3);
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
  if (stage.environment === 'tutorial-courtyard') {
    const box = (surface: keyof PrimitiveAssets['material'], x: number, y: number, z: number, w: number, h: number, d: number) => {
      const mesh = assets.mesh('box', surface); mesh.position.set(x,y,z); mesh.scale.set(w,h,d); root.add(mesh); return mesh;
    };
    box('plaster', 0, 1.15, -4.2, 3.8, 2.3, 1.7);
    const roof = assets.mesh('crown', 'leaf'); roof.position.set(0, 3, -4.2); roof.scale.set(3.2, 1.1, 2); root.add(roof);
    box('boots', 0, .85, -3.32, .95, 1.7, .08);
    const hinge = new Group(); hinge.name = 'tutorial-door'; hinge.position.set(-.475, 0, -3.24);
    const door = assets.mesh('box', 'cottageWood'); door.position.set(.475,.85,0); door.scale.set(.95,1.7,.1); hinge.add(door); root.add(hinge);
    for (const x of [-1.2,1.2]) box('hat', x, 1.35, -3.31, .6, .7, .09);
    box('earth', 0, .01, -2.9, 1.1, .05, .65);
    for (const x of [-4,4]) {
      for (const z of [-2,-.5,1,2.5]) box('cottageWood',x,.45,z,.12,.9,.12);
      for (const y of [.3,.65]) box('cottageWood',x,y,.25,.09,.09,4.6);
    }
  }
  return root;
}

