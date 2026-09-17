import * as THREE from 'three';
import type { FeedbackVisual } from '../feedback/WordFeedback.ts';
import type { LetterTile } from '../grid/types.ts';

export class SelectionPathView {
  readonly root = new THREE.Group();
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshBasicMaterial({ color: '#a27533', transparent: true, opacity: 0.75, depthWrite: false });
  private segments: THREE.Mesh[] = [];
  update(tiles: readonly LetterTile[], feedback?: FeedbackVisual): void {
    this.material.color.set(feedback?.tone === 'correct' ? '#37634a' : feedback?.tone === 'wrong' ? '#984d46' : feedback?.tone === 'already' ? '#886328' : '#a27533');
    this.material.opacity = feedback?.tone === 'wrong' ? 0.75 * (1 - feedback.progress)
      : feedback?.tone === 'correct' ? 0.95 : feedback?.tone === 'already' ? 0.45 : 0.75;
    const count = Math.max(0, tiles.length - 1);
    while (this.segments.length > count) this.root.remove(this.segments.pop()!);
    while (this.segments.length < count) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      this.segments.push(mesh); this.root.add(mesh);
    }
    this.segments.forEach((mesh, i) => {
      const a = tiles[i].worldPosition, b = tiles[i + 1].worldPosition;
      mesh.position.set((a.x + b.x) / 2, 0.29, (a.z + b.z) / 2);
      mesh.scale.set(Math.hypot(b.x - a.x, b.z - a.z) * .2, 0.012, 0.065);
      mesh.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    });
  }
  dispose(): void { this.root.clear(); this.segments = []; this.geometry.dispose(); this.material.dispose(); }
}
