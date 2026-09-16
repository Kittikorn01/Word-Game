import * as THREE from 'three';
import type { PrimitiveAssets } from './PrimitiveAssets.ts';
import type { StageDefinition } from '../stages/types.ts';

/** Placeholder asset boundary: replace these factories with model assets without changing quests. */
export function createWorldObjects(assets: PrimitiveAssets, positions: NonNullable<StageDefinition['worldObjects']>) {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];
  const material = (color: string) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
    owned.push(value); return value;
  };
  const wood = material('#986b48'), gold = material('#eac46b'), cream = material('#f3dfad');
  const foliage = material('#99845c'), cover = material('#a25948');
  const box = (parent: THREE.Group, surface: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = new THREE.Mesh(assets.geometry.box, surface);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = false; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  };
  const anchor = (name: keyof typeof positions) => {
    const group = new THREE.Group(); group.name = name;
    group.position.set(positions[name].x, 0.04, positions[name].z); root.add(group); return group;
  };
  const keyGold = material('#ffd875'); keyGold.metalness = .3; keyGold.roughness = .32; keyGold.emissive.set('#ffbf4a'); keyGold.emissiveIntensity = .7;
  const keyStand = anchor('key'); // Presentation anchor only: no pedestal.
  const key = new THREE.Group(); key.position.y = .7; keyStand.add(key);
  // Square bow with an actual hole, shaft and teeth; light enough to read against the board.
  box(key, keyGold, -.2, .16, 0, .1, .4, .1); box(key, keyGold, .1, .16, 0, .1, .4, .1);
  box(key, keyGold, -.05, .36, 0, .4, .08, .1); box(key, keyGold, -.05, -.04, 0, .4, .08, .1);
  box(key, keyGold, .28, .04, 0, .45, .09, .1); box(key, keyGold, .43, -.04, 0, .09, .2, .1);
  const trailMaterial = new THREE.MeshBasicMaterial({color:'#ffe4a0',transparent:true,opacity:.65,depthWrite:false}); owned.push(trailMaterial);
  const keyTrail = Array.from({length: 6}, () => { const mote = new THREE.Mesh(assets.geometry.rock, trailMaterial); mote.visible = false; root.add(mote); return mote; });
  const bulbs: THREE.MeshStandardMaterial[] = [];
  const lights: THREE.PointLight[] = [];
  for (const x of [-4.25,1.55,4.25]) {
    const sconce = new THREE.Group(); sconce.name = 'wall-lamp';
    sconce.position.set(x,1.65,positions.door.z+.27); root.add(sconce);
    const emission = material('#807b70'); bulbs.push(emission);
    box(sconce,wood,0,0,0,.32,.6,.14);
    box(sconce,emission,0,.02,.2,.23,.32,.25);
    box(sconce,wood,0,.24,.2,.4,.1,.36);
    box(sconce,wood,0,-.2,.2,.36,.08,.32);
    const light = new THREE.PointLight('#ffd697',0,5,2);
    light.position.set(0,.05,.4); sconce.add(light); lights.push(light);
  }
  const light = lights[0];
  const plant = anchor('plant'); box(plant, material('#a25948'), 0, .22, 0, .48, .44, .48);
  const growth = new THREE.Group(); growth.position.y = .42; plant.add(growth);
  box(growth, wood, 0, .28, 0, .07, .56, .07);
  for (const [x,y,z] of [[-.18,.3,0],[.18,.48,0],[0,.65,.06]]) {
    const leaf = new THREE.Mesh(assets.geometry.rock, foliage); leaf.position.set(x,y,z); leaf.scale.set(.5,.3,.35); growth.add(leaf);
  }
  const drops = new THREE.Group(); plant.add(drops);
  const water = material('#88bfd3'); water.emissive.set('#538fa8'); water.emissiveIntensity = .2;
  for (let i=0;i<7;i++) {
    const drop = new THREE.Mesh(assets.geometry.rock,water); drop.scale.set(.075,.15,.075); drop.castShadow = false; drops.add(drop);
  }
  const table = anchor('book'); table.name = 'bookshelf';
  table.position.z = positions.door.z + .51; // Back panel meets the plaster face.
  const darkWood = material('#604a3b');
  const shelfWood = material('#986b48'), shelfBack = material('#604a3b');
  const shelfPages = material('#f3dfad');
  const shelfBooks: { object: THREE.Group; home: THREE.Vector3; row: number; column: number }[] = [];
  box(table,shelfBack,0,.86,-.26,1.72,1.72,.1);
  for (const x of [-.85,.85]) box(table,shelfWood,x,.88,0,.13,1.76,.62);
  for (const y of [.1,.64,1.18,1.79]) box(table,shelfWood,0,y,.02,1.86,.11,.7);
  const covers = ['#73877b','#8e6259','#aaa078','#667d8c','#9b806b'].map(material);
  const book = new THREE.Group(); book.name = 'reaction-book';
  const bookHome = new THREE.Vector3(.22,.9,.1);
  for (let row=0;row<3;row++) for (let column=0;column<9;column++) {
    const selected = row===1 && column===5;
    const volume = selected ? book : new THREE.Group();
    volume.name = selected ? 'reaction-book' : 'shelf-book';
    const h = .32+(column%3)*.045;
    volume.position.set(-.68+column*.15,.17+row*.54+h/2,.1);
    if (selected) bookHome.copy(volume.position);
    const coverMaterial = selected ? cover : covers[(column+row*2)%covers.length];
    box(volume,shelfPages,0,0,0,.115,h-.035,.33);
    for (const x of [-.064,.064]) box(volume,coverMaterial,x,0,0,.025,h,.38);
    box(volume,coverMaterial,0,0,.19,.15,h,.045);
    for (const y of [-h*.3,h*.3]) box(volume,shelfPages,0,y,.216,.09,.018,.009);
    table.add(volume);
    if (!selected) shelfBooks.push({ object: volume, home: volume.position.clone(), row, column });
  }
  // This section exactly continues the static shell, with no visible doorway cues.
  const wallCover = new THREE.Group(); wallCover.name = 'unrevealed-wall';
  wallCover.position.set(positions.door.x,0,positions.door.z); root.add(wallCover);
  const plaster = box(wallCover,assets.material.plaster,0,.925,0,1.32,1.85,.4);
  plaster.castShadow = false;
  const skirting = box(wallCover,assets.material.cottageWood,0,.12,.23,1.32,.24,.12);
  skirting.castShadow = false;
  // Opaque recess replaces the plaster only when the leaf starts opening.
  const doorway = new THREE.Group(); doorway.name = 'doorway-depth';
  doorway.position.copy(wallCover.position); root.add(doorway); doorway.visible = false;
  box(doorway,darkWood,0,.925,-.22,1.32,1.85,.08);
  for (const x of [-.61,.61]) box(doorway,wood,x,.925,0,.1,1.85,.48);
  box(doorway,wood,0,1.8,0,1.32,.1,.48);
  const door = anchor('door');
  door.position.z += .31; // Leaf rear face clears the plaster (+.2), without z-fighting.
  const frame = new THREE.Group(); frame.name = 'door-frame'; door.add(frame);
  box(frame, wood, -.58, .85, .12, .15, 1.7, .22); box(frame, wood, .58, .85, .12, .15, 1.7, .22);
  box(frame, wood, 0, 1.73, .12, 1.32, .16, .24);
  // Pivot on the left, room-facing edge; keep the closed leaf in its original pose.
  const hinge = new THREE.Group(); hinge.position.set(-.5, 0, .08); door.add(hinge);
  box(hinge, wood, .5, .83, 0, 1, 1.62, .16);
  for (const x of [.2,.4,.6,.8]) box(hinge,darkWood,x,.83,.085,.015,1.5,.01);
  for (const y of [.25,1.4]) box(hinge,darkWood,.5,y,.1,.9,.09,.045);
  box(frame,wood,0,0,0,1.32,.08,.45); box(hinge, gold, .85, .82, .1, .09, .09, .09);
  for (const part of hinge.children) part.position.z -= .08;
  return { root, key, keyStand, keyTrail, drops, bulbs, lights, book, bookHome, bookCover: cover, shelfBooks, shelfMaterials: [shelfWood, shelfBack, shelfPages, ...covers], wallCover, doorway, door, frame, hinge, growth, foliage, light, dispose: () => owned.forEach(value => value.dispose()) };
}

