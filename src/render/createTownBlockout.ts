import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { TownBlockout, TownFootprint } from '../stages/types.ts';

/** Static layout only. Shared assets own every geometry/material, including slabs. */
export function createTownBlockout(data: TownBlockout, assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'town-blockout';
  const block = (name: string, area: TownFootprint, height: number, top: number,
    surface: keyof PrimitiveAssets['material'], shape: 'box' | 'townSlab' = 'box') => {
    const mesh = assets.mesh(shape, surface); mesh.name = name;
    mesh.scale.set(area.width, height, area.depth);
    mesh.position.set(area.x, top - height / 2, area.z); root.add(mesh); return mesh;
  };
  block('raised-town-platform', data.platform, data.platform.thickness, -.08, 'earth', 'townSlab');
  block('town-ground', data.platform, .08, 0, 'townStone', 'townSlab');
  block('central-town-square', data.square, .035, .025, 'townPaving', 'townSlab');
  // Connected paving interrupts the border at entrances, without raised barriers.
  data.paths.forEach(area => block(area.id, area, .02, .035, 'townRoute'));
  data.carryRoute.forEach((area, index) => block(`future-carry-route-${index}`, area, .012, .04, 'townRoute'));
  for (const zone of data.zones) {
    const mass = zone.mass;
    const building = new Group(); building.name = `${zone.id}-placeholder`; root.add(building);
    const massBlock = (name: string, area: TownFootprint, height: number, top: number, surface: keyof PrimitiveAssets['material']) => {
      const mesh = block(name, area, height, top, surface); building.add(mesh); return mesh;
    };
    if (zone.id === 'clock') {
      // Static landmark only: clock hands never animate.
      massBlock('clock-plinth', { ...mass, width: mass.width + .5, depth: mass.depth + .5 }, .35, .41, 'townStone');
      massBlock('clock-shaft', { ...mass, width: mass.width * .72, depth: mass.depth * .72 }, zone.height - .8, zone.height - .39, 'townCream');
      massBlock('clock-crown', mass, .66, zone.height + .27, 'townCream');
      massBlock('clock-cap', { ...mass, width: mass.width + .24, depth: mass.depth + .24 }, .2, zone.height + .47, 'townRoof');
    } else if (zone.id === 'bakery' || zone.id === 'shop') {
      massBlock(`${zone.id}-body`, mass, zone.height, zone.height + .06, 'townCream');
      massBlock(`${zone.id}-cap`, { ...mass, width: mass.width + .16, depth: mass.depth + .16 }, .18, zone.height + .24, 'townRoof');
    }
    // Facade-local coordinates: +depth always points toward the plaza.
    const south = zone.facing === 'south', side = zone.facing === 'east' ? 1 : -1;
    const facade = (name: string, across: number, out: number, width: number, depth: number,
      height: number, top: number, surface: keyof PrimitiveAssets['material']) => massBlock(name, {
        x: mass.x + (south ? across : side * (mass.width / 2 + out)),
        z: mass.z + (south ? mass.depth / 2 + out : across),
        width: south ? width : depth, depth: south ? depth : width
      }, height, top, surface);
    if (zone.id === 'bakery' || zone.id === 'shop') {
      const accent = zone.id === 'bakery' ? 'townRoof' : 'townTeal';
      const roof = assets.mesh('townRoof', accent); roof.name = `${zone.id}-pitched-roof`;
      roof.scale.set(mass.width + .2, .55, mass.depth + .2);
      roof.position.set(mass.x, zone.height + .23, mass.z); building.add(roof);
      facade(`${zone.id}-door`, -.9, .025, .65, .06, 1.35, 1.41, 'townInk');
      facade(`${zone.id}-door-inset`, -.9, .065, .45, .03, .72, 1.29, 'townTeal');
      facade(`${zone.id}-window-frame`, .55, .03, 1.35, .09, .9, 1.48, 'cottageWood');
      facade(`${zone.id}-window`, .55, .085, 1.15, .04, .7, 1.38, 'windowSky');
      facade(`${zone.id}-mullion`, .55, .12, .07, .035, .7, 1.38, 'townCream');
      facade(`${zone.id}-sill`, .55, .16, 1.48, .3, .1, .65, 'townCream');
      facade(`${zone.id}-awning`, 0, .25, 2.8, .55, .1, 1.8, accent);
      // Scale the entire facade about its own anchor, preserving readable proportions.
      building.scale.setScalar(.7);
      building.position.set(mass.x * .3, 0, mass.z * .3);
    } else if (zone.id === 'clock') {
      const dial = assets.mesh('clockFace', 'townCream'); dial.name = 'static-clock-face';
      dial.rotation.x = Math.PI / 2; dial.scale.setScalar(.8);
      dial.position.set(mass.x, zone.height - .5, mass.z + mass.depth / 2 + .04); building.add(dial);
      facade('clock-hand-hour', 0, .075, .065, .04, .28, zone.height - .26, 'townInk');
      facade('clock-hand-minute', .13, .075, .32, .04, .055, zone.height - .47, 'townInk');
      facade('clock-door', 0, -.17, .5, .06, 1.05, 1.11, 'cottageWood');
    } else if (zone.id === 'mail') {
      massBlock('mailbox-post', { ...mass, width: .16, depth: .16 }, .4, .44, 'townStone');
      massBlock('mailbox', mass, .5, .94, 'townMail');
      facade('mail-slot', 0, .035, .4, .04, .065, .81, 'townInk');
      facade('mail-envelope-plaque', 0, .04, .25, .03, .16, .68, 'townCream');
    } else {
      massBlock('delivery-crate', mass, .5, .56, 'cottageWood');
      massBlock('delivery-crate-band', { ...mass, width: .12, depth: mass.depth + .02 }, .51, .57, 'townCream');
    }
  }
  data.gardens.forEach((area, index) => {
    block(`garden-edge-${index}`, area, .12, .12, 'townCream', 'townSlab');
    block(`garden-${index}`, { ...area, width: area.width - .18, depth: area.depth - .18 }, .06, .16, 'townGreen', 'townSlab');
    const shrub = assets.mesh('rock', 'townGreen');
    shrub.scale.set(.65, .5, .65);
    shrub.position.set(area.x, .35, area.z);
    root.add(shrub);
  });
  return root;
}

