import * as THREE from 'three';
import type { FeedbackVisual } from '../feedback/WordFeedback.ts';
import { CORRECT_DURATION, type LetterGrid } from '../grid/LetterGrid.ts';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';

const colors = { NORMAL: '#e8dcc2', HOVER: '#fff4d5', SELECTED: '#efb552', CORRECT: '#ffe2a2' };
export class LetterGridView {
  readonly root = new THREE.Group();
  private plane = new THREE.PlaneGeometry(1, 1);
  private letters = new Map<string, THREE.MeshBasicMaterial>();
  private entries: { root: THREE.Group; material: THREE.MeshStandardMaterial; normal: THREE.Color }[] = [];
  private targets: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private color = new THREE.Color();
  constructor(private grid: LetterGrid, assets: PrimitiveAssets) {
    const size = grid.definition.tileSize;
    for (const tile of grid.tiles) {
      const root = new THREE.Group();
      root.position.set(tile.worldPosition.x, 0, tile.worldPosition.z);
      const normal = new THREE.Color((tile.row + tile.column) % 2 ? '#e8dcc2' : '#dfd4b9');
      const material = new THREE.MeshStandardMaterial({ color: normal, roughness: 1, flatShading: true });
      const body = new THREE.Mesh(assets.geometry.box, material);
      body.scale.set(size - 0.055, 0.1, size - 0.055); body.position.y = 0.055;
      body.castShadow = true; body.receiveShadow = true;
      body.userData.tileId = tile.id;
      const letter = new THREE.Mesh(this.plane, this.letterMaterial(tile.letter));
      letter.rotation.x = -Math.PI / 2;
      letter.position.y = 0.108; letter.scale.setScalar(size * 0.83);
      letter.renderOrder = 2;
      root.add(body, letter); this.root.add(root);
      // Fixed logical footprint prevents hover flicker when a tile lifts beneath a stationary pointer.
      const hitTarget = new THREE.Mesh(assets.geometry.box, material);
      hitTarget.scale.copy(body.scale);
      hitTarget.position.set(tile.worldPosition.x, 0.055, tile.worldPosition.z);
      hitTarget.userData.tileId = tile.id; hitTarget.updateMatrixWorld(true);
      this.targets.push(hitTarget); this.entries.push({ root, material, normal });
    }
  }
  private letterMaterial(letter: string): THREE.MeshBasicMaterial {
    const cached = this.letters.get(letter); if (cached) return cached;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is required for letter textures.');
    // Bold monospace gives I crossbars, a distinct L and a visible Q tail.
    context.font = 'bold 184px "Courier New", monospace'; context.fillStyle = '#273c35';
    const metrics = context.measureText(letter);
    context.fillText(letter, (256 - metrics.width) / 2,
      128 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
    this.letters.set(letter, material); return material;
  }
  update(dt: number, selectedIds: ReadonlySet<string> = new Set(), feedback?: FeedbackVisual): void {
    const blend = 1 - Math.exp(-24 * dt);
    this.grid.tiles.forEach((tile, index) => {
      const selected = selectedIds.has(tile.id);
      const tone = selected ? feedback?.tone : undefined;
      const entry = this.entries[index], state = tile.state === 'CORRECT' ? 'CORRECT' : selected ? 'SELECTED' : this.grid.visualState(tile);
      const progress = 1 - tile.correctRemaining / CORRECT_DURATION;
      const pulse = state === 'CORRECT' ? Math.sin(Math.PI * progress) ** 2 : 0;
      const lift = state === 'CORRECT' ? 0.13 + pulse * 0.15 : tone ? 0.045 : state === 'SELECTED' ? 0.13 : state === 'HOVER' ? 0.055 : 0;
      entry.root.position.y = THREE.MathUtils.lerp(entry.root.position.y, lift, blend);
      this.color.set(tone === 'wrong' ? '#ddc8bd' : tone === 'already' ? '#f4e7c5' : colors[state]);
      entry.material.color.lerp(state === 'NORMAL' ? entry.normal : this.color, blend);
      entry.material.emissive.set('#dba03d');
      entry.material.emissiveIntensity = state === 'CORRECT' ? 0.18 + pulse * 0.5 : tone ? 0.04 : state === 'SELECTED' ? 0.16 : 0;
    });
  }
  pick(clientX: number, clientY: number, canvas: HTMLCanvasElement, camera: THREE.Camera): string | null {
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX >= rect.right || clientY < rect.top || clientY >= rect.bottom) return null;
    this.pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(); this.root.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.pointer, camera);
    // Only tile bodies participate: letters, player and decoration cannot steal hits.
    return this.raycaster.intersectObjects(this.targets, false)[0]?.object.userData.tileId ?? null;
  }
  dispose(): void {
    this.plane.dispose(); this.entries.forEach(entry => entry.material.dispose());
    this.letters.forEach(material => { material.map?.dispose(); material.dispose(); });
    this.root.clear();
  }
}
