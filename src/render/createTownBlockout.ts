import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { TownBlockout, TownFootprint } from '../stages/types.ts';

/** Static environment identity only; no gameplay or animated props. Shared assets own every geometry/material, including slabs. */
export function createTownBlockout(data: TownBlockout, assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'town-blockout';
  const block = (name: string, area: TownFootprint, height: number, top: number,
    surface: keyof PrimitiveAssets['material'], shape: 'box' | 'townSlab' = 'box') => {
    const mesh = assets.mesh(shape, surface); mesh.name = name;
    mesh.scale.set(area.width, height, area.depth);
    mesh.position.set(area.x, top - height / 2, area.z); root.add(mesh); return mesh;
  };
  block('raised-town-platform', data.platform, data.platform.thickness, -.08, 'earth', 'townSlab');
  block('town-ground', data.platform, .08, 0, 'townGround', 'townSlab');
  block('central-town-square', data.square, .035, .025, 'townPlazaBorder', 'townSlab');
  // Large, quiet paving joints stay in the perimeter, away from the letters.
  for (const side of [-1, 1]) for (const z of [-1.5, 2, 5]) {
    block(`plaza-joint-${side}-${z}`, { x: side * 4.95, z, width: 2.35, depth: .022 }, .006, .006, 'townJoint');
  }
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
      massBlock('clock-plinth', { ...mass, width: mass.width + .5, depth: mass.depth + .5 }, .35, .41, 'townTowerStone');
      massBlock('clock-shaft', { ...mass, width: mass.width * .72, depth: mass.depth * .72 }, zone.height - .8, zone.height - .39, 'townTowerStone');
      massBlock('clock-crown', mass, .66, zone.height + .27, 'townTowerStone');
      massBlock('clock-cap', { ...mass, width: mass.width + .24, depth: mass.depth + .24 }, .2, zone.height + .47, 'townRoof');
    } else if (zone.id === 'bakery' || zone.id === 'shop') {
      massBlock(`${zone.id}-body`, mass, zone.height, zone.height + .06, zone.id === 'bakery' ? 'townBakeryWall' : 'townShopWall');
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
      if (zone.id === 'bakery') {
        // Three broad cream stripes, not a busy repeating fabric texture.
        for (const across of [-.93, 0, .93])
          facade('bakery-canopy-stripe', across, .25, .32, .56, .012, 1.812, 'townCream');
        facade('bakery-display-counter', .55, .24, 1.45, .42, .38, .62, 'townRoof');
        facade('bakery-counter-top', .55, .26, 1.54, .46, .075, .695, 'townCream');
        // Fixed architectural loaf emblem; this is not a spawned bread reward.
        const loaf = assets.mesh('head', 'cottageFloor'); loaf.name = 'bakery-loaf-emblem';
        loaf.scale.set(2.3, .8, .7);
        loaf.position.set(mass.x, 2.08, mass.z + mass.depth / 2 + .16); building.add(loaf);
        for (const across of [-.2, 0, .2]) {
          const score = facade('bakery-loaf-score', across, .32, .035, .025, .13, 2.15, 'townCream');
          score.rotation.z = -.3;
        }
      } else {
        facade('shop-open-display', .55, .13, 1.15, .04, .65, 1.35, 'townInk');
        facade('shop-display-shelf', .55, .25, 1.48, .4, .1, .7, 'townTeal');
        // One bag pictogram integrated into the facade, without text signage.
        facade('shop-bag-symbol', .1, .42, .43, .07, .32, 2.17, 'townCream');
        facade('shop-bag-handle-top', .1, .42, .23, .07, .045, 2.31, 'townCream');
        for (const across of [.005, .195])
          facade('shop-bag-handle-side', across, .42, .045, .07, .14, 2.31, 'townCream');
      }
      // Scale the entire facade about its own anchor, preserving readable proportions.
      building.scale.setScalar(.7);
      building.position.set(mass.x * .3, 0, mass.z * .3);
    } else if (zone.id === 'clock') {
      const face = new Group(); face.name = 'town-clock-dial';
      face.position.set(mass.x, zone.height - .28, mass.z + mass.depth / 2 + .09);
      // A slight upward tilt keeps the dial readable from the existing fixed camera.
      face.rotation.x = -.28; building.add(face);
      for (const [name, scale, surface, z] of [
        ['clock-rim', .98, 'cottageWood', 0],
        ['static-clock-face', .84, 'townCream', .025]
      ] as const) {
        const dial = assets.mesh('clockFace', surface); dial.name = name;
        dial.rotation.x = Math.PI / 2; dial.scale.setScalar(scale); dial.position.z = z; face.add(dial);
      }
      const dialMark = (name: string, x: number, y: number, width: number, height: number) => {
        const mark = assets.mesh('box', 'townInk'); mark.name = name;
        mark.scale.set(width, height, .025); mark.position.set(x, y, .055); face.add(mark);
      };
      for (const direction of [-1, 1]) {
        dialMark('clock-quarter-hour', direction * .32, 0, .08, .04);
        dialMark('clock-quarter-hour', 0, direction * .32, .04, .08);
      }
      dialMark('clock-hand-hour', -.09, .065, .23, .055);
      face.children[face.children.length - 1].rotation.z = -.6;
      dialMark('clock-hand-minute', .02, .13, .045, .29);
      facade('clock-base-trim', 0, -.1, .8, .2, .1, .52, 'townPaving');
      facade('clock-door', 0, -.17, .5, .06, 1.05, 1.11, 'cottageWood');
    } else if (zone.id === 'mail') {
      massBlock('mailbox-foot', { ...mass, width: .4, depth: .38 }, .08, .08, 'townPaving');
      massBlock('mailbox-post', { ...mass, width: .16, depth: .16 }, .4, .44, 'townStone');
      massBlock('mailbox', mass, .5, .94, 'townMail');
      const hood = assets.mesh('clockFace', 'townMail'); hood.name = 'mailbox-rounded-hood';
      hood.rotation.x = Math.PI / 2; hood.scale.set(.6, mass.depth / .04, .32);
      hood.position.set(mass.x, .93, mass.z); building.add(hood);
      facade('mailbox-flag-stem', .35, -.15, .045, .07, .28, 1.09, 'townRoof');
      facade('mailbox-flag', .4, -.15, .15, .07, .1, 1.09, 'townRoof');
      facade('mail-slot', 0, .035, .4, .04, .065, .81, 'townInk');
      facade('mail-envelope-plaque', 0, .04, .34, .03, .21, .7, 'townCream');
      for (const side of [-1, 1]) {
        const fold = facade('mail-envelope-fold', side * .072, .06, .17, .018, .02, .65, 'townMail');
        fold.rotation.z = side * .55;
      }
    } else {
      massBlock('delivery-dropoff-base', { ...mass, width: 1.02, depth: .92 }, .06, .06, 'townPaving');
      massBlock('delivery-crate', mass, .5, .56, 'cottageWood');
      massBlock('delivery-crate-band', { ...mass, width: .12, depth: mass.depth + .02 }, .51, .57, 'townCream');
      massBlock('delivery-cross-band', { ...mass, depth: .1, width: mass.width + .02 }, .51, .575, 'townCream');
      massBlock('delivery-small-parcel', { ...mass, x: mass.x + .15, z: mass.z - .06, width: .4, depth: .36 }, .24, .81, 'cottageFloor');
      massBlock('delivery-small-parcel-wrap', { ...mass, x: mass.x + .15, z: mass.z - .06, width: .065, depth: .37 }, .25, .815, 'townCream');
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

