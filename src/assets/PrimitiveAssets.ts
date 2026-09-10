import * as THREE from 'three';
// Stable domain keys; one owner disposes shared GPU resources.
export class PrimitiveAssets {
  readonly geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    rock: new THREE.IcosahedronGeometry(0.5, 0),
    crown: new THREE.ConeGeometry(0.9, 1.6, 7),
    trunk: new THREE.CylinderGeometry(0.12, 0.17, 0.8, 6),
    head: new THREE.IcosahedronGeometry(0.25, 1),
    body: new THREE.CylinderGeometry(0.19, 0.27, 0.46, 8)
  };
  readonly material = {
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
