import type { StageDefinition } from '../stages/types.ts';
import type { ScanState } from '../simulation/AssistanceState.ts';
import * as THREE from 'three';
import type { FeedbackVisual } from '../feedback/WordFeedback.ts';
import { CORRECT_DURATION, type LetterGrid } from '../grid/LetterGrid.ts';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';

const colors = { NORMAL: '#e8dcc2', HOVER: '#fff4d5', SELECTED: '#efb552', CORRECT: '#bcd5aa' };
export class LetterGridView {
  readonly root = new THREE.Group();
  private borderGeometry = (() => {
    const shape = new THREE.Shape(); shape.moveTo(-.47, -.47); shape.lineTo(.47, -.47); shape.lineTo(.47, .47); shape.lineTo(-.47, .47); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(-.425, -.425); hole.lineTo(-.425, .425); hole.lineTo(.425, .425); hole.lineTo(.425, -.425); hole.closePath(); shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape);
  })();
  private plane = new THREE.PlaneGeometry(1, 1);
  private letters = new Map<string, THREE.MeshBasicMaterial>();
  private entries: { root: THREE.Group; material: THREE.MeshStandardMaterial; normal: THREE.Color; border: THREE.Mesh; borderMaterial: THREE.MeshBasicMaterial; end: THREE.Mesh }[] = [];
  private targets: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private color = new THREE.Color();
  constructor(private grid: LetterGrid, assets: PrimitiveAssets, private minimumBrightness = 0, private theme?: StageDefinition['tileTheme']) {
    const size = grid.definition.tileSize;
    for (const tile of grid.tiles) {
      const root = new THREE.Group();
      root.position.set(tile.worldPosition.x, 0, tile.worldPosition.z);
      const stoneTones = ['#b8b49a', '#afaf98', '#c2b69b', '#b4b39d'];
      const townTones = ['#d4c4aa', '#cebea6', '#ddcdb3', '#d5c6b0'];
      const normal = new THREE.Color(this.theme === 'forest-stone'
        ? stoneTones[(tile.row * 3 + tile.column) % stoneTones.length]
        : this.theme === 'town-stone' ? townTones[(tile.row * 3 + tile.column) % 4] : (tile.row + tile.column) % 2 ? '#e8dcc2' : '#dfd4b9');
      const material = new THREE.MeshStandardMaterial({ color: normal, roughness: 1, flatShading: true });
      const body = new THREE.Mesh(this.theme === 'town-stone' ? assets.geometry.townSlab : assets.geometry.box, material);
      body.scale.set(size - 0.055, 0.1, size - 0.055); body.position.y = 0.055;
      body.castShadow = true; body.receiveShadow = true;
      body.userData.tileId = tile.id;
      const letter = new THREE.Mesh(this.plane, this.letterMaterial(tile.letter));
      letter.rotation.x = -Math.PI / 2;
      letter.position.y = 0.108; letter.scale.setScalar(size * 0.83);
      letter.renderOrder = 2;
      const borderMaterial = new THREE.MeshBasicMaterial({ color: this.theme === 'town-stone' ? '#887b69' : this.theme === 'forest-stone' ? '#69745b' : '#8d612d', transparent: true, opacity: this.theme === 'town-stone' ? .45 : this.theme === 'forest-stone' ? .8 : 0, depthWrite: false });
      const border = new THREE.Mesh(this.borderGeometry, borderMaterial);
      border.rotation.x = -Math.PI / 2; border.position.y = .112; border.scale.setScalar(size);
      const end = new THREE.Mesh(this.borderGeometry, borderMaterial);
      end.rotation.x = -Math.PI / 2; end.position.y = .114; end.scale.setScalar(size * .87); end.visible = false;
      root.add(border, end);
      root.add(body, letter);
      if (this.theme === 'forest-stone') {
        // Small edge chips use the border material; the letter's central area stays clear.
        for (let chip = 0; chip < 2; chip++) {
          const moss = new THREE.Mesh(this.plane, borderMaterial);
          moss.rotation.x = -Math.PI / 2;
          moss.scale.set(size * (.09 + chip * .04), size * .025, 1);
          moss.position.set(size * (-.29 + chip * .12), .113, size * ((tile.row + tile.column) % 2 ? .39 : -.39));
          root.add(moss);
        }
      }
      this.root.add(root);
      // Fixed logical footprint prevents hover flicker when a tile lifts beneath a stationary pointer.
      const hitTarget = new THREE.Mesh(assets.geometry.box, material);
      hitTarget.scale.copy(body.scale);
      hitTarget.position.set(tile.worldPosition.x, 0.055, tile.worldPosition.z);
      hitTarget.userData.tileId = tile.id; hitTarget.updateMatrixWorld(true);
      this.targets.push(hitTarget); this.entries.push({ root, material, normal, border, borderMaterial, end });
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
  update(dt: number, selectedIds: ReadonlySet<string> = new Set(), feedback?: FeedbackVisual, scan?: ScanState | null, latestId?: string): void {
    const blend = 1 - Math.exp(-24 * dt);
    this.grid.tiles.forEach((tile, index) => {
      const selected = selectedIds.has(tile.id);
      const latest = selected && tile.id === latestId;
      const tone = selected ? feedback?.tone : undefined;
      const entry = this.entries[index], state = tile.state === 'CORRECT' ? 'CORRECT' : selected ? 'SELECTED' : this.grid.visualState(tile);
      const scanned = !!scan?.tileIds.has(tile.id) && !tone && (state === 'NORMAL' || state === 'HOVER');
      const searchPulse = scanned ? .5 + .5 * Math.sin((3 - scan!.remaining) * 7) : 0;
      const progress = 1 - tile.correctRemaining / CORRECT_DURATION;
      const pulse = state === 'CORRECT' ? Math.sin(Math.PI * progress) ** 2 : 0;
      const lift = state === 'CORRECT' ? 0.13 + pulse * 0.15 : tone ? 0.045 : state === 'SELECTED' ? (latest ? .16 : .11) : scanned ? .045 + searchPulse * .025 : state === 'HOVER' ? 0.055 : 0;
      entry.root.position.y = THREE.MathUtils.lerp(entry.root.position.y, lift, blend);
      this.color.set(tone === 'wrong' ? '#e3b7ac' : tone === 'already' ? '#f4e7c5' : scanned ? '#a9d4d6' : colors[state]);
      entry.material.color.lerp(state === 'NORMAL' && !scanned ? entry.normal : this.color, blend);
      entry.borderMaterial.opacity = THREE.MathUtils.lerp(entry.borderMaterial.opacity, selected ? 1 : this.theme === 'town-stone' ? .45 : this.theme === 'forest-stone' ? .8 : 0, blend);
      entry.border.visible = entry.borderMaterial.opacity > .01;
      entry.end.visible = latest && !tone;
      entry.borderMaterial.color.set(tone === 'correct' ? '#37634a' : tone === 'wrong' ? '#984d46' : tone === 'already' ? '#886328' : latest ? '#70451e' : selected ? '#a27533' : scanned ? '#377b86' : this.theme === 'town-stone' ? '#887b69' : this.theme === 'forest-stone' ? '#69745b' : '#a27533');
      // Cottage floor keeps a small material fill even when room lighting is dim.
      entry.material.emissive.set(scanned ? '#79bec7' : state === 'NORMAL' && !tone ? '#e8dcc2' : '#dba03d');
      entry.material.emissiveIntensity = this.minimumBrightness + (state === 'CORRECT' ? 0.18 + pulse * 0.5 : tone ? 0.04 : state === 'SELECTED' ? 0.16 : scanned ? .12 + searchPulse * .12 : 0);
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
    this.borderGeometry.dispose(); this.entries.forEach(entry => entry.borderMaterial.dispose());
    this.plane.dispose(); this.entries.forEach(entry => entry.material.dispose());
    this.letters.forEach(material => { material.map?.dispose(); material.dispose(); });
    this.root.clear();
  }
}

