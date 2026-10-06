import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';

/** Ambient drizzle, independent of words. Side bands preserve grid readability. */
export class StormWeatherView {
  private geometry = new BufferGeometry();
  private material = new LineBasicMaterial({ color: '#c2d6df', transparent: true, opacity: .32, depthWrite: false });
  readonly root = new LineSegments(this.geometry, this.material);
  private elapsed = 0;
  constructor() {
    this.root.name = 'baseline-drizzle';
    this.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(64 * 6), 3));
    this.root.frustumCulled = false;
    this.update(0);
  }
  update(dt: number): void {
    this.elapsed = (this.elapsed + dt) % 100;
    const attribute = this.geometry.getAttribute('position');
    for (let i = 0; i < 64; i++) {
      const x = (i % 2 ? -1 : 1) * (4.15 + ((i * 37) % 19) / 10);
      const z = -4.8 + ((i * 43) % 101) / 10;
      const y = 3.4 - ((i * .379 + this.elapsed * 1.8) % 3.3);
      attribute.setXYZ(i * 2, x, y, z);
      attribute.setXYZ(i * 2 + 1, x + .035, y - .19, z + .025);
    }
    attribute.needsUpdate = true;
  }
  dispose(): void { this.geometry.dispose(); this.material.dispose(); }
}
