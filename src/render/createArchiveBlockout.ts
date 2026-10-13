import { Group, PointLight } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';

/** Static cutaway: +Z faces the camera. Shared mesh resources belong to PrimitiveAssets.
 * Named groups are future reaction anchors, without any reaction state or animation.
 */
export function createArchiveBlockout(assets: PrimitiveAssets): Group {
  const root = new Group(); root.name = 'archive-blockout';
  const group = (name: string, x: number, z: number) => {
    const node = new Group(); node.name = name; node.position.set(x, 0, z); root.add(node); return node;
  };
  const part = (parent: Group, name: string, x: number, y: number, z: number,
    w: number, h: number, d: number, surface: keyof PrimitiveAssets['material'], shape: keyof PrimitiveAssets['geometry'] = 'box') => {
    const mesh = assets.mesh(shape, surface); mesh.name = name;
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
  };
  part(root, 'archive-foundation', 0, -.36, .3, 12.6, .64, 12, 'archiveEdge', 'townSlab');
  part(root, 'limestone-floor', 0, -.04, .3, 12.6, .08, 12, 'archiveFloor', 'townSlab');
  part(root, 'grid-inset-border', 0, .012, 1, 7.24, .024, 7.24, 'archiveLimestone', 'townSlab');
  // Floor joints stay on the outer apron; the letter board remains clean.
  for (const x of [-4.75, 4.75]) for (const z of [-1, 1, 3, 5])
    part(root, 'apron-paving-joint', x, .006, z, 2.5, .01, .024, 'archiveEdge');

  const walls = group('cutaway-stone-walls', 0, 0);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
    const x = -5.46 + col * 1.56;
    part(walls, 'rear-masonry-block', x, .34 + row * .67, -5.25, 1.52, .63, .38,
      (row + col) % 3 ? 'archiveStone' : 'archiveLimestone');
  }
  for (const x of [-6.03, 6.03]) {
    part(walls, 'cutaway-side-wall', x, .42, .15, .38, .84, 10.4, 'archiveStone');
    part(walls, 'side-wall-cap', x, .89, .15, .52, .12, 10.4, 'archiveLimestone');
    const pillar = group(x < 0 ? 'left-short-pillar' : 'right-short-pillar', x, -3.4);
    part(pillar, 'pillar-foot', 0, .12, 0, .8, .24, .8, 'archiveLimestone', 'townSlab');
    part(pillar, 'pillar-shaft', 0, .9, 0, .5, 1.55, .5, 'archiveStone');
    part(pillar, 'pillar-cap', 0, 1.73, 0, .74, .18, .74, 'archiveLimestone', 'townSlab');
  }

  const door = group('final-stone-door', 0, -4.92);
  part(door, 'door-threshold', 0, .08, .45, 2.9, .16, 1.15, 'archiveLimestone', 'townSlab');
  // Two closed leaves reserve a lateral slide into the wall; no initial backlight.
  for (const x of [-.49, .49]) part(door, 'closed-door-leaf', x, 1.4, 0, .96, 2.6, .24, 'archiveDoor');
  for (const x of [-1.2, 1.2]) {
    part(door, 'door-jamb', x, 1.43, .1, .42, 2.86, .6, 'archiveLimestone');
    for (const y of [.66, 1.35, 2.04]) part(door, 'jamb-joint', x, y, .407, .42, .035, .012, 'archiveStone');
  }
  part(door, 'stone-lintel', 0, 2.95, .1, 2.94, .32, .65, 'archiveLimestone', 'townSlab');
  part(door, 'lintel-inlay', 0, 2.95, .432, .55, .07, .018, 'archiveGold');
  for (const x of [-.74, .74]) part(door, 'door-carved-edge', x, 1.4, .128, .026, 2.16, .012, 'archiveStone');
  part(root, 'reserved-exit-approach', 0, .01, -3.42, 1.65, .016, 1.12, 'archiveStone', 'townSlab');

  const mechanism = group('stone-mechanism', -4.15, -3.83);
  part(mechanism, 'mechanical-base', 0, .13, .12, 2.75, .26, 1.98, 'archiveLimestone', 'townSlab');
  // The loose block and empty socket have separate silhouettes and an open travel lane.
  part(mechanism, 'stone-socket', -.74, .3, .28, .86, .08, .86, 'archiveRecess', 'townSlab');
  for (const x of [-1.22, -.26]) part(mechanism, 'socket-rail', x, .35, .28, .07, .18, 1, 'archiveGold');
  part(mechanism, 'loose-block-rest', -.74, .09, 1.27, .86, .18, .86, 'archiveLimestone', 'townSlab');
  const block = new Group(); block.name = 'movable-stone-block'; block.position.set(-.74, 0, 1.27); mechanism.add(block);
  part(block, 'loose-block', 0, .53, 0, .68, .7, .68, 'archiveStone', 'townSlab');
  part(block, 'block-inlay', 0, .888, 0, .3, .014, .3, 'archiveGold', 'townSlab');

  const positional = new Group(); positional.name = 'above-under-structure'; positional.position.set(.64, 0, .03); mechanism.add(positional);
  // Shallow upper shelf, tall opening, and extended lower tray expose UNDER to the high camera.
  part(positional, 'lower-compartment-back', 0, .79, -.45, 1.05, 1.04, .12, 'archiveRecess');
  for (const x of [-.58, .58]) part(positional, 'pedestal-support', x, .87, -.06, .19, 1.22, .91, 'archiveStone');
  part(positional, 'lower-compartment-tray', 0, .31, .47, .95, .07, 1.32, 'archiveRecess', 'townSlab');
  part(positional, 'lower-slot-lip', 0, .37, 1.1, 1.03, .14, .09, 'archiveLimestone');
  part(positional, 'upper-platform', 0, 1.55, -.08, 1.53, .22, .99, 'archiveLimestone', 'townSlab');
  part(positional, 'upper-object', 0, 1.91, -.08, .51, .5, .51, 'archiveStone', 'townSlab');
  part(positional, 'upper-object-band', 0, 1.91, .183, .53, .06, .025, 'archiveGold');

  const shelf = group('archive-bookshelf', 4.26, -4.77);
  part(shelf, 'shelf-back', 0, 1.02, -.15, 2.4, 2.04, .17, 'archiveWood');
  for (const x of [-1.16, 1.16]) part(shelf, 'shelf-side', x, 1.07, .1, .15, 2.14, .66, 'archiveWood');
  for (const y of [.14, .78, 1.45, 2.13]) part(shelf, 'shelf-board', 0, y, .1, 2.48, .12, .71, 'archiveWood');
  for (const [level, xs] of [[.2, [-.9, -.66, -.4, .22, .49, .76]], [.84, [-.83, -.56, -.29, .33, .6]], [1.51, [-.85, -.59, .14, .4, .7]]] as const) {
    xs.forEach((x, i) => {
      const h = .39 + i % 3 * .06;
      part(shelf, 'old-bound-volume', x, level + h / 2, .17, .17, h, .39, i % 3 === 0 ? 'archiveBook' : i % 3 === 1 ? 'archivePaper' : 'archiveWood');
      part(shelf, 'book-spine-band', x, level + h * .72, .37, .17, .022, .012, 'archiveGold');
    });
  }
  // Flush panel is sealed: no book, light, or contents behind it in this milestone.
  const secret = group('sealed-secret-compartment', 2.37, -4.98);
  part(secret, 'closed-secret-panel', 0, 1.06, .02, .77, 1.42, .2, 'archiveStone');
  part(secret, 'panel-masonry-joint', 0, 1.03, .124, .76, .027, .01, 'archiveEdge');

  const altar = group('ancient-book-altar', 4.6, -2.92);
  part(altar, 'altar-foot', 0, .13, 0, 1.82, .26, 1.16, 'archiveLimestone', 'townSlab');
  part(altar, 'altar-stem', 0, .58, 0, .83, .77, .67, 'archiveStone');
  part(altar, 'altar-top', 0, 1.04, 0, 1.82, .2, 1.24, 'archiveLimestone', 'townSlab');
  const book = new Group(); book.name = 'closed-ancient-book'; book.position.set(0, 1.14, .02); book.rotation.y = -.12; altar.add(book);
  part(book, 'book-lower-cover', 0, .04, 0, 1.34, .08, .87, 'archiveBook', 'townSlab');
  part(book, 'closed-page-block', .035, .14, 0, 1.2, .15, .76, 'archivePaper');
  part(book, 'book-upper-cover', 0, .25, 0, 1.34, .08, .87, 'archiveBook', 'townSlab');
  part(book, 'book-spine', -.63, .145, 0, .11, .28, .87, 'archiveWood');
  for (const x of [-.41, .41]) part(book, 'cover-gold-band', x, .295, 0, .04, .012, .72, 'archiveGold');
  part(book, 'closed-book-clasp', .64, .2, 0, .08, .17, .14, 'archiveGold');

  for (const x of [-2.4, 2.4]) {
    const lamp = group(x < 0 ? 'left-archive-lamp' : 'right-archive-lamp', x, -5);
    part(lamp, 'lamp-bracket', 0, 2.22, .24, .27, .12, .44, 'archiveWood');
    part(lamp, 'amber-lantern', 0, 2.46, .35, .24, .36, .22, 'archiveLamp');
    for (const y of [2.26, 2.66]) part(lamp, 'lantern-cap', 0, y, .35, .32, .06, .3, 'archiveGold');
    const light = new PointLight('#efb96f', 2.5, 4.3, 2); light.position.set(0, 2.42, .65); lamp.add(light);
  }
  return root;
}
