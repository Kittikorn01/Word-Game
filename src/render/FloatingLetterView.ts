import * as THREE from 'three';

/** Camera-facing current-cell marker, separate from the word HUD. */
export class FloatingLetterView {
  readonly sprite: THREE.Sprite;
  private canvas = document.createElement('canvas');
  private texture: THREE.CanvasTexture;
  private material: THREE.SpriteMaterial;
  private letter = '';
  constructor() {
    this.canvas.width = this.canvas.height = 128;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // Opaque cutout: discard only the area outside the rounded plate. Writing
    // depth prevents later transparent scene geometry from showing through it.
    this.material = new THREE.SpriteMaterial({
      map: this.texture, transparent: false, opacity: 1, alphaTest: 0.5,
      depthTest: true, depthWrite: true, toneMapped: false
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(0.48, 0.48, 1);
  }
  update(letter: string, x: number, z: number): void {
    this.sprite.position.set(x, 1.65, z);
    if (letter === this.letter) return;
    this.letter = letter;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is required for the floating letter.');
    context.clearRect(0, 0, 128, 128);
    context.fillStyle = '#52634a'; context.beginPath(); context.roundRect(10, 12, 108, 108, 26); context.fill();
    context.fillStyle = '#fff4d9'; context.beginPath(); context.roundRect(10, 6, 108, 108, 26); context.fill();
    context.fillStyle = '#30483b'; context.font = 'bold 86px "Courier New", monospace';
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(letter, 64, 64);
    this.texture.needsUpdate = true;
  }
  dispose(): void { this.texture.dispose(); this.material.dispose(); }
}
