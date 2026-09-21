import { createTerrainGeometry } from './createTerrainGeometry.ts';
import * as THREE from 'three';
// Stable domain keys; one owner disposes shared GPU resources.
export class PrimitiveAssets {
  readonly geometry = {
    // Unit chamfered slab; shared town geometry uses the existing disposal owner.
    townSlab: (() => {
      const outline = new THREE.Shape();
      outline.moveTo(-.44, -.5); outline.lineTo(.44, -.5);
      outline.lineTo(.5, -.44); outline.lineTo(.5, .44);
      outline.lineTo(.44, .5); outline.lineTo(-.44, .5);
      outline.lineTo(-.5, .44); outline.lineTo(-.5, -.44); outline.closePath();
      const geometry = new THREE.ExtrudeGeometry(outline, { depth: 1, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2); geometry.translate(0, -.5, 0);
      return geometry;
    })(),
    townRoof: (() => {
      const outline = new THREE.Shape(); outline.moveTo(-.5, 0); outline.lineTo(.5, 0); outline.lineTo(0, 1); outline.closePath();
      const geometry = new THREE.ExtrudeGeometry(outline, { depth: 1, bevelEnabled: false });
      geometry.translate(0, 0, -.5); return geometry;
    })(),
    clockFace: new THREE.CylinderGeometry(.5, .5, .04, 12),
    terrain: createTerrainGeometry(),
    bankTerrain: createTerrainGeometry(true),
    box: new THREE.BoxGeometry(1, 1, 1),
    rock: new THREE.IcosahedronGeometry(0.5, 0),
    crown: new THREE.ConeGeometry(0.9, 1.6, 7),
    trunk: new THREE.CylinderGeometry(0.12, 0.17, 0.8, 6),
    head: new THREE.IcosahedronGeometry(0.25, 1),
    body: new THREE.CylinderGeometry(0.19, 0.27, 0.46, 8)
  };
  readonly material = {
    townTeal: this.make('#5c837b'), townInk: this.make('#514d43'), townMail: this.make('#718eaa'),
    // Town-only surfaces separate the plaza from architecture without changing other stages.
    // Slight cool compensation reads as warm gray under the town's warm sunlight.
    townGround: this.make('#b6bec8'), townJoint: this.make('#a7afb8'),
    townPlazaBorder: this.make('#999fa5'),
    townBakeryWall: this.make('#d5b6a0'), townShopWall: this.make('#c4cbb5'),
    townTowerStone: this.make('#aaa899'),
    townStone: this.make('#c4b29b'), townPaving: this.make('#b4a38d'),
    townCream: this.make('#e5d3b5'), townRoof: this.make('#a77363'),
    townRoute: this.make('#d6c3a3'), townGreen: this.make('#98a78c'),
    cottageWood: this.make('#795940'), cottageFloor: this.make('#b89b78'),
    plaster: this.make('#e2d5b9'), fabric: this.make('#758b7c'), windowSky: this.make('#b3c8d8'),
    grass: this.make('#9cb786'), earth: this.make('#b49a78'),
    tile: this.make('#e8dcc2'), tileAlt: this.make('#dfd4b9'),
    trunk: this.make('#957258'), leaf: this.make('#689879'), leafLight: this.make('#87ac80'),
    rock: this.make('#a9b4a3'), coat: this.make('#bd674d'), skin: this.make('#f6d4a1'),
    hat: this.make('#edc979'), boots: this.make('#525d55'), ground: this.make('#dce4d6')
  };
  private make(color: string): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  }
  mesh(shape: keyof PrimitiveAssets['geometry'], surface: keyof PrimitiveAssets['material']): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry[shape], this.material[surface]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  dispose(): void {
    Object.values(this.geometry).forEach(resource => resource.dispose());
    Object.values(this.material).forEach(resource => resource.dispose());
  }
}

