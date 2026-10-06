import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';

/** Static named landmarks reserve reaction space; all GPU resources belong to assets. */
export function createWorkshopBlockout(assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'workshop-blockout';
  type Surface = keyof PrimitiveAssets['material'];
  const group = (name: string, x: number, z: number) => {
    const node = new Group(); node.name = name; node.position.set(x, 0, z); root.add(node); return node;
  };
  const part = (parent: Group, name: string, x: number, y: number, z: number,
    w: number, h: number, d: number, surface: Surface, shape: keyof PrimitiveAssets['geometry'] = 'box') => {
    const mesh = assets.mesh(shape, surface); mesh.name = name;
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
  };
  part(root, 'workshop-foundation', 0, -.34, .3, 12.6, .52, 12, 'workshopDark', 'townSlab');
  part(root, 'warm-concrete-floor', 0, -.04, .3, 12.6, .08, 12, 'workshopFloor', 'townSlab');
  part(root, 'grid-recess-border', 0, .005, 1, 7.22, .02, 7.22, 'workshopDark', 'townSlab');
  // Sparse joints only in the perimeter; the puzzle remains visually quiet.
  for (const x of [-4.8, 4.8]) for (const z of [0, 3, 5.4])
    part(root, 'floor-joint', x, .003, z, 2.5, .006, .018, 'workshopJoint');

  const machine = group('main-machine', -3.7, -4.05);
  part(machine, 'machine-foot', 0, .14, 0, 2.8, .28, 2.15, 'workshopDark');
  part(machine, 'machine-housing', 0, 1.05, 0, 2.35, 1.65, 1.7, 'workshopOlive');
  part(machine, 'machine-cap', 0, 1.94, 0, 2.55, .18, 1.85, 'workshopSteel');
  part(machine, 'feed-hopper', -.45, 2.18, -.15, 1.05, .3, .85, 'workshopSteel');
  part(machine, 'hopper-dark-inset', -.45, 2.335, -.15, .8, .015, .6, 'workshopDark');
  part(machine, 'output-port', 1.19, .93, 0, .06, .7, 1.12, 'workshopDark');
  part(machine, 'output-chute', 1.52, .72, 0, .72, .12, 1.1, 'workshopSteel');
  // Empty front-facing housing and exposed axle: deliberately no installed gear.
  const gear = group('gear-area-empty-slot', -3.7, -3.16);
  part(gear, 'open-service-recess', 0, 1.07, 0, 1.45, 1.22, .07, 'workshopDark');
  part(gear, 'gear-socket-rim', 0, 1.1, .07, 1, 1, .8, 'workshopSteel', 'workshopRing');
  const axle = part(gear, 'empty-gear-axle', 0, 1.1, .19, .19, .28, .19, 'workshopAmber', 'workshopCylinder');
  axle.rotation.x = Math.PI / 2;
  for (const x of [-.62, .62])
    part(gear, 'housing-bolt', x, 1.55, .07, .09, .09, .08, 'workshopSteel');

  const conveyor = group('stationary-conveyor', .75, -4.05);
  part(conveyor, 'belt-underframe', 0, .63, 0, 5.7, .22, 1.45, 'workshopDark');
  part(conveyor, 'stationary-belt-surface', 0, .82, 0, 5.65, .12, 1.16, 'workshopDark');
  for (const x of [-2.65, 2.65]) {
    const roller = part(conveyor, 'end-roller', x, .81, 0, .35, 1.23, .35, 'workshopSteel', 'workshopCylinder');
    roller.rotation.x = Math.PI / 2;
  }
  for (let x = -2.25; x <= 2.3; x += .45)
    part(conveyor, 'belt-seam', x, .884, 0, .035, .009, 1.1, 'workshopSteel');
  for (const z of [-.72, .72]) {
    part(conveyor, 'belt-side-rail', 0, .72, z, 5.9, .21, .12, 'workshopSteel');
    for (const x of [-2.25, 2.25]) part(conveyor, 'conveyor-leg', x, .3, z, .17, .6, .17, 'workshopSteel');
    for (const x of [-2.65, 2.65]) part(conveyor, 'end-cap-accent', x, .73, z * 1.015, .3, .23, .14, 'workshopAmber');
  }
  const crate = (parent: Group, x: number, bottom: number, z: number) => {
    part(parent, 'waiting-crate', x, bottom + .35, z, .72, .7, .68, 'workshopWood');
    for (const dx of [-.25, .25]) part(parent, 'crate-band', x + dx, bottom + .36, z, .065, .73, .71, 'workshopAmber');
  };
  crate(conveyor, -.65, .89, 0);

  const output = group('output-receiving-platform', 4.75, -4.05);
  part(output, 'receiving-base', 0, .3, 0, 2.15, .6, 1.85, 'workshopSteel');
  part(output, 'receiving-tray', 0, .66, 0, 2.25, .12, 1.95, 'workshopSteel');
  part(output, 'tray-end-stop', 1.04, .86, 0, .14, .32, 1.95, 'workshopAmber');
  for (const z of [-.92, .92]) part(output, 'tray-edge', 0, .8, z, 2.15, .2, .1, 'workshopSteel');
  crate(output, .2, .72, .05);

  const power = group('inactive-power-box', -4.95, -.95);
  part(power, 'control-plinth', 0, .1, 0, 1.28, .2, 1.05, 'workshopDark');
  part(power, 'electrical-cabinet', 0, .9, 0, 1.1, 1.5, .8, 'workshopSteel');
  part(power, 'cabinet-face', 0, .98, .415, .89, 1.13, .05, 'workshopOlive');
  part(power, 'unlit-indicator-surround', -.18, 1.3, .46, .3, .3, .06, 'workshopDark');
  part(power, 'unlit-indicator', -.18, 1.3, .5, .15, .15, .04, 'workshopSteel');
  part(power, 'cabinet-latch', .28, .8, .48, .07, .28, .06, 'workshopDark');
  // One tidy conduit connects the cabinet back to the machine.
  part(root, 'power-conduit', -5.23, .12, -2.25, .1, .1, 1.8, 'workshopDark');
  part(root, 'machine-conduit-connection', -4.92, .12, -3.1, .7, .1, .1, 'workshopDark');

  const lever = group('lever-at-rest', -4.9, 1.25);
  // Turn the entire control assembly so the slot and resting handle aim toward the conveyor.
  lever.rotation.y = -.8;
  part(lever, 'lever-pedestal', 0, .35, 0, .95, .7, .86, 'workshopOlive');
  part(lever, 'lever-slot', 0, .72, 0, .24, .08, .69, 'workshopDark');
  const handle = new Group(); handle.name = 'resting-lever-handle'; handle.position.y = .74;
  handle.rotation.x = -.55; lever.add(handle);
  part(handle, 'lever-shaft', 0, .43, 0, .12, .86, .12, 'workshopSteel');
  part(handle, 'lever-grip', 0, .86, 0, .62, .2, .23, 'workshopAmber');
  return root;
}
