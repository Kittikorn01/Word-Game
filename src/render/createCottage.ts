import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { StageDefinition } from '../stages/types.ts';

/** Cutaway shell only; the central grid and all reaction objects remain separate. */
export function createCottage(stage: StageDefinition, assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'cottage-shell';
  const halfWidth = stage.grid.columns * stage.grid.tileSize / 2 + 1.5;
  const depth = stage.grid.rows * stage.grid.tileSize + 3;
  const back = stage.worldObjects!.door.z, doorX = stage.worldObjects!.door.x;
  const box = (name: string, surface: keyof PrimitiveAssets['material'], x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = assets.mesh('box', surface); mesh.name = name;
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz);
    // Architectural shadows must not wash over the puzzle surface.
    mesh.castShadow = false; root.add(mesh); return mesh;
  };
  const foundationY = -.48, foundationHeight = .65;
  const foundationBottom = foundationY - foundationHeight / 2;
  box('wooden-foundation','cottageWood',0,foundationY,0,halfWidth*2,foundationHeight,depth);
  box('wood-floor','cottageFloor',0,-.08,0,halfWidth*2,.2,depth);
  // Wide, low-frequency floor seams, beneath the grid rather than over its letters.
  for (let x = -halfWidth + .8; x < halfWidth; x += .8)
    box('floor-seam','cottageWood',x,.022,0,.018,.008,depth);
  const wallHeight = 2.5, beamHeight = .18, beamY = wallHeight + beamHeight / 2;
  // Align the outer face of each .5-deep end post with the floor's front edge.
  const front = depth / 2 - .25;
  const sideDepth = front - back, sideCenter = (back + front) / 2;
  const headerBottom = 1.95;
  const wall = (left: number, right: number, bottom = 0, top = headerBottom) =>
    box('plaster-wall','plaster',(left+right)/2,(bottom+top)/2,back,right-left,top-bottom,.4);
  const windowLeft = -3.25, windowRight = -1.25;
  wall(-halfWidth,windowLeft); wall(windowRight,doorX-.66); wall(doorX+.66,halfWidth);
  wall(windowLeft,windowRight,0,.85);
  // One uninterrupted header ties the whole rear elevation together.
  wall(-halfWidth,halfWidth,headerBottom,wallHeight);
  wall(doorX-.66,doorX+.66,1.85);
  // Opaque stylized daylight inset: no glass, transparency or extra render pass.
  box('window-daylight','windowSky',-2.25,1.4,back+.015,2,1.1,.035);
  for (const x of [windowLeft, -2.25, windowRight])
    box('window-mullion','cottageWood',x,1.4,back+.25,.085,1.22,.12);
  for (const y of [.82,1.98]) box('window-frame','cottageWood',-2.25,y,back+.25,2.2,.1,.16);
  box('window-sill','cottageWood',-2.25,.79,back+.28,2.3,.12,.4);
  box('rear-top-beam','cottageWood',0,beamY,back,halfWidth*2+.5,beamHeight,.5);
  for (const x of [-halfWidth,halfWidth]) {
    box('corner-post','cottageWood',x,wallHeight/2,back,.5,wallHeight,.5);
    // Full-height sides meet the straight rear wall; only the front is cut away.
    box('side-wall','plaster',x,wallHeight/2,sideCenter,.4,wallHeight,sideDepth);
    box('side-top-beam','cottageWood',x,beamY,sideCenter,.5,beamHeight,sideDepth+.5);
    // Continue down to the foundation bottom, so the visible cut edge meets
    // the room's lower border even in the elevated camera projection.
    box('cutaway-end-post','cottageWood',x,(wallHeight+foundationBottom)/2,front,.5,wallHeight-foundationBottom,.5);
    box('side-skirting','cottageWood',x-Math.sign(x)*.2,.12,sideCenter,.12,.24,sideDepth);
  }
  // The reveal adapter fills the future doorway with matching plaster and skirting.
  for (const [left,right] of [[-halfWidth,doorX-.66],[doorX+.66,halfWidth]])
    box('rear-baseboard','cottageWood',(left+right)/2,.12,back+.23,right-left,.24,.12);
  return root;
}
