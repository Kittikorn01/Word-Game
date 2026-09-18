import * as THREE from 'three';
import type { ForestBlockout } from '../stages/types.ts';
import type { ForestWorldState } from '../simulation/ForestWorldState.ts';

/** Visual-only river feedback; world state owns recognition and reaction timing. */
export class RiverView {
  readonly root = new THREE.Group();
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private highlights: THREE.InstancedMesh;
  private ripples: THREE.InstancedMesh;
  private waterMaterial: THREE.MeshStandardMaterial;
  private baseColor: THREE.Color;
  private brightColor = new THREE.Color('#91c7bf');
  private elapsed = 0;
  private matrix = new THREE.Matrix4();
  private zone: ForestBlockout['terrain'][number];
  private river: NonNullable<ForestBlockout['river']>;

  constructor(data: ForestBlockout) {
    this.river = data.river!;
    this.zone = data.terrain.find(area => area.id === this.river.zoneId)!;
    const { zone, river } = this;
    this.root.name = 'river-foundation';
    const waterMaterial = new THREE.MeshStandardMaterial({ color: river.color, roughness: .85, metalness: 0, flatShading: true });
    this.waterMaterial = waterMaterial;
    this.baseColor = waterMaterial.color.clone();
    const bankMaterial = new THREE.MeshStandardMaterial({ color: '#a29472', roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: '#d4ece0', transparent: true, opacity: .23, depthWrite: false });
    this.materials.push(waterMaterial, bankMaterial, highlightMaterial);
    // Opaque shallow volume: no transparency sorting, reflection pass or exposed gap at diorama ends.
    const waterGeometry = new THREE.BoxGeometry(zone.width, river.waterLevel - zone.top, zone.depth);
    this.geometries.push(waterGeometry);
    const water = new THREE.Mesh(waterGeometry, waterMaterial); water.name = 'river-water';
    water.position.set(zone.x, (river.waterLevel + zone.top) / 2, zone.z);
    water.receiveShadow = true; this.root.add(water);

    // Nine angular shoreline segments. Outer edge joins the original bank; inner toe slopes into water.
    const contour = river.contour ?? [0, .04, -.03, .05, .01, -.04, .03, -.02, .04, 0];
    for (const side of [-1, 1]) {
      const bank = data.terrain.find(area => area.id === (side < 0 ? 'main-ground' : 'far-ground'))!;
      const vertices: number[] = [], indices: number[] = [];
      const outerX = zone.x + side * zone.width / 2;
      contour.forEach((offset, i) => {
        const z = zone.z - zone.depth / 2 + i * zone.depth / (contour.length - 1);
        const inset = river.bankInset + offset * side;
        // Above-water earth slope and submerged toe hide the rectangular water edge.
        vertices.push(outerX, bank.top + .003, z,
          outerX - side * (inset * .45), bank.top * .45 + river.waterLevel * .55, z,
          outerX - side * inset, river.waterLevel + .025, z,
          outerX - side * (inset + .1), zone.top + .01, z);
        if (i < contour.length - 1) for (let strip = 0; strip < 3; strip++) {
          const a = i * 4 + strip, b = a + 4;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); this.geometries.push(geometry);
      const slope = new THREE.Mesh(geometry, bankMaterial); slope.name = 'river-bank';
      slope.receiveShadow = true; this.root.add(slope);
    }
    const highlightGeometry = new THREE.PlaneGeometry(1, 1); highlightGeometry.rotateX(-Math.PI / 2);
    this.geometries.push(highlightGeometry);
    this.highlights = new THREE.InstancedMesh(highlightGeometry, highlightMaterial, 9);
    this.highlights.name = 'river-flow-highlights'; this.highlights.frustumCulled = false;
    this.highlights.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Three low-poly chevrons travel downstream, staying inside the shoreline.
    const rippleGeometry = new THREE.BufferGeometry();
    rippleGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -.5, 0, -.07, 0, 0, .04, 0, 0, .1,
      -.5, 0, -.07, 0, 0, .1, -.5, 0, -.01,
      0, 0, .04, .5, 0, -.07, .5, 0, -.01,
      0, 0, .04, .5, 0, -.01, 0, 0, .1,
    ], 3));
    const rippleMaterial = new THREE.MeshBasicMaterial({ color: '#d4ece0', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.geometries.push(rippleGeometry); this.materials.push(rippleMaterial);
    this.ripples = new THREE.InstancedMesh(rippleGeometry, rippleMaterial, 3);
    this.ripples.name = 'river-recognition-ripples'; this.ripples.frustumCulled = false;
    this.ripples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.highlights, this.ripples); this.update(0);
  }

  update(dt: number, state?: Pick<ForestWorldState, 'riverRecognized' | 'progress'>): void {
    const recognized = state?.riverRecognized ?? false;
    const progress = recognized ? THREE.MathUtils.clamp(state!.progress.river, 0, 1) : 0;
    const emphasis = recognized && progress < 1 ? Math.sin(progress * Math.PI) : 0;
    const settled = recognized ? 1 : 0;
    if (Number.isFinite(dt) && dt > 0) this.elapsed = (this.elapsed + dt * (1 + settled * .25 + emphasis * 3)) % (this.zone.depth / this.river.flowSpeed);
    this.waterMaterial.color.copy(this.baseColor).lerp(this.brightColor, settled * .06 + emphasis * .32);
    (this.highlights.material as THREE.MeshBasicMaterial).opacity = .23 + settled * .09 + emphasis * .38;
    const { zone, river } = this;
    for (let i = 0; i < this.highlights.count; i++) {
      const phase = ((i / this.highlights.count) + this.elapsed * river.flowSpeed / zone.depth) % 1;
      const envelope = Math.min(1, phase * 12, (1 - phase) * 12);
      const x = zone.x + ((i % 3) - 1) * .36;
      const z = zone.z + (phase - .5) * (zone.depth - .3);
      this.matrix.makeScale((.22 + (i % 2) * .12) * envelope, 1, .035 * envelope * (1 + settled * .3 + emphasis * 2.5));
      this.matrix.setPosition(x, river.waterLevel + .012, z);
      this.highlights.setMatrixAt(i, this.matrix);
    }
    this.highlights.instanceMatrix.needsUpdate = true;
    this.ripples.visible = emphasis > 0;
    (this.ripples.material as THREE.MeshBasicMaterial).opacity = emphasis * .48;
    for (let i = 0; i < this.ripples.count; i++) {
      const phase = (progress * 1.15 + i / this.ripples.count) % 1;
      const envelope = Math.min(1, phase * 10, (1 - phase) * 10);
      this.matrix.makeScale((zone.width - river.bankInset * 2 - .32) * envelope, 1, 1);
      this.matrix.setPosition(zone.x, river.waterLevel + .022, zone.z + (phase - .5) * (zone.depth - .4));
      this.ripples.setMatrixAt(i, this.matrix);
    }
    this.ripples.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.highlights.dispose();
    this.ripples.dispose();
    this.geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());
    this.root.clear();
  }
}
