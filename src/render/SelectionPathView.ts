import * as THREE from 'three';
import type { LetterTile } from '../grid/types.ts';

export class SelectionPathView {
  readonly root = new THREE.Group();
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshBasicMaterial({ color: '#ffe1a0', transparent: true, opacity: 0.75, depthWrite: false });
  private segments: THREE.Mesh[] = [];
  update(tiles: readonly LetterTile[]): void {
    const count = Math.max(0, tiles.length - 1);
    while (this.segments.length > count) this.root.remove(this.segments.pop()!);
    while (this.segments.length < count) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      this.segments.push(mesh); this.root.add(mesh);
    }
    this.segments.forEach((mesh, i) => {
      const a = tiles[i].worldPosition, b = tiles[i + 1].worldPosition;
      mesh.position.set((a.x + b.x) / 2, 0.248, (a.z + b.z) / 2);
      mesh.scale.set(Math.hypot(b.x - a.x, b.z - a.z), 0.012, 0.035);
      mesh.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    });
  }
  dispose(): void { this.root.clear(); this.segments = []; this.geometry.dispose(); this.material.dispose(); }
}
