import * as THREE from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { ForestWorldState } from '../simulation/ForestWorldState.ts';
import { createForestTraversal } from '../simulation/ForestTraversal.ts';
import type { StageDefinition } from '../stages/types.ts';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
/** Deterministic projection of simulation progress; bounded geometry, no spawn on update. */
export class ForestReactionView {
  readonly root = new THREE.Group();
  private woodMaterial: THREE.MeshStandardMaterial;
  private ropeMaterial = new THREE.MeshStandardMaterial({ color: '#d8bd82', roughness: 1, flatShading: true });
  private rootMaterial = new THREE.MeshStandardMaterial({ color: '#887344', roughness: 1, flatShading: true });
  private ropeGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
  private coilGeometry = new THREE.TorusGeometry(.21, .038, 5, 14);
  private planks: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3 }[] = [];
  private ropes: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3 }[] = [];
  private coils = new THREE.Group();
  private coilHome = new THREE.Vector3();
  private bridgeCenter = new THREE.Vector3();
  private supports = new THREE.Group();
  private steps: { mesh: THREE.Mesh; height: number }[] = [];
  private vines = new THREE.Group();
  private markers = new THREE.Group();
  private trees: THREE.Object3D[] = [];

  constructor(assets: PrimitiveAssets, stage: StageDefinition, environment: THREE.Object3D) {
    this.root.name = 'forest-world-reactions';
    environment.traverse(object => { if (object.name === 'forest-tree') this.trees.push(object); });
    this.woodMaterial = assets.material.cottageFloor.clone();
    const data = stage.forestBlockout!, lane = data.futureBridge;
    const nearX = lane.x - lane.width / 2 - .55;
    const farY = data.terrain.find(a => a.id === 'far-ground')!.top;
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(assets.geometry.box, this.woodMaterial);
      mesh.name = `bridge-plank-${i}`; mesh.scale.set(.26, .12, lane.depth - .13); mesh.castShadow = mesh.receiveShadow = true;
      const from = new THREE.Vector3(nearX + (i % 2) * .26 - .13, .07 + Math.floor(i / 2) * .12, lane.z + 1.28);
      const t = i / 11;
      const to = new THREE.Vector3(lane.x - lane.width / 2 - .38 + (lane.width + .76) * t, farY * t + .015, lane.z);
      this.planks.push({ mesh, from, to }); this.root.add(mesh);
    }
    this.coils.position.set(nearX, .12, lane.z - 1.18);
    this.coilHome.copy(this.coils.position); this.bridgeCenter.set(lane.x, .55, lane.z);
    for (let i = 0; i < 3; i++) {
      const coil = new THREE.Mesh(this.coilGeometry, this.ropeMaterial);
      coil.rotation.x = Math.PI / 2; coil.position.y = i * .055; this.coils.add(coil);
    }
    this.root.add(this.coils, this.supports, this.vines, this.markers);
    for (const side of [-1, 1]) {
      const z = lane.z + side * lane.depth / 2;
      const support = assets.mesh('box', 'trunk');
      support.scale.set(lane.width + .76, .1, .1); support.position.set(lane.x, farY / 2 - .08, lane.z + side * .56);
      support.rotation.z = Math.atan2(farY, lane.width + .76); this.supports.add(support);
      for (let i = 0; i < 8; i++) {
        const point = (t: number) => new THREE.Vector3(lane.x - lane.width / 2 - .23 + (lane.width + .46) * t,
          .56 + farY * t - Math.sin(t * Math.PI) * .15, z);
        const mesh = new THREE.Mesh(this.ropeGeometry, this.ropeMaterial);
        mesh.name = 'bridge-rope'; this.root.add(mesh);
        this.ropes.push({ mesh, from: point(i / 8), to: point((i + 1) / 8) });
      }
    }
    const route = createForestTraversal(stage);
    for (let i = 1; i <= 6; i++) {
      const node = route.nodes[`root-${i}`];
      const mesh = new THREE.Mesh(assets.geometry.box, this.rootMaterial);
      mesh.name = `root-step-${i}`; mesh.scale.set(.92, node.y - farY, i === 6 ? 1.05 : .43);
      mesh.position.set(node.x, farY + (node.y - farY) / 2, node.z - (i === 6 ? .35 : 0));
      mesh.castShadow = mesh.receiveShadow = true;
      this.steps.push({ mesh, height: node.y - farY }); this.root.add(mesh);
      const treadRoot = new THREE.Mesh(this.ropeGeometry, this.rootMaterial);
      this.segment(treadRoot, new THREE.Vector3(node.x - .48, node.y + .025, node.z + .08), new THREE.Vector3(node.x + .48, node.y + .045, node.z + .1), .045);
      this.vines.add(treadRoot);
      for (const side of [-1, 1]) {
        const leaf = assets.mesh('rock', 'leafLight'); leaf.scale.set(.18, .06, .12);
        leaf.position.set(node.x + side * .52, node.y + .06, node.z); this.vines.add(leaf);
        if (i > 1) {
          const previous = route.nodes[`root-${i - 1}`];
          const vine = new THREE.Mesh(this.ropeGeometry, this.rootMaterial);
          this.segment(vine, new THREE.Vector3(previous.x + side * .47, previous.y + .04, previous.z), new THREE.Vector3(node.x + side * .47, node.y + .04, node.z), .055);
          this.vines.add(vine);
        }
      }
    }
    // Small earth stepping patches communicate every accessible far-side connection.
    for (const node of Object.values(route.nodes).filter(n => n.id === 'landing' || n.id.startsWith('far-') || n.id === 'root-foot' || n.id === 'root-foot-south' || n.id === 'summit')) {
      const patch = assets.mesh('terrain', 'earth'); patch.name = 'walkable-path-marker';
      patch.scale.set(.58, .02, .55); patch.position.set(node.x, node.y + .012, node.z); patch.castShadow = false;
      patch.userData.climbOnly = node.gate === 'climbRouteOpen';
      this.markers.add(patch);
    }
    this.root.visible = false;
  }
  private segment(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, radius: number): void {
    const delta = to.clone().sub(from);
    mesh.position.copy(from).add(to).multiplyScalar(.5); mesh.scale.set(radius, delta.length(), radius);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  }
  update(s: ForestWorldState): void {
    this.root.visible = true;
    const pulse = s.hasWood && s.hasRope && !s.bridgeStarted ? Math.sin(s.preparation * Math.PI) : 0;
    this.woodMaterial.emissive.set('#d6b76b'); this.woodMaterial.emissiveIntensity = pulse * .35;
    this.ropeMaterial.emissive.set('#e6d39d'); this.ropeMaterial.emissiveIntensity = pulse * .35;
    const b = s.progress.bridge;
    this.planks.forEach(({ mesh, from, to }, i) => {
      mesh.visible = s.hasWood;
      const p = ease((b - .10 - i * .038) / .3);
      mesh.position.copy(from).lerp(to, p);
      mesh.position.y += s.bridgeStarted ? Math.sin(p * Math.PI) * .95 + Math.sin(clamp((b - .86) / .14) * Math.PI * 2) * .035 : Math.sin(s.progress.wood * Math.PI) * .28;
      mesh.rotation.y = (1 - p) * (i % 2 ? .06 : -.06);
      mesh.scale.y = .12 * ease(s.progress.wood * 2);
    });
    this.coils.visible = s.hasRope && b < .88;
    const coilScale = ease(s.progress.rope * 2) * (1 - ease((b - .65) / .23));
    this.coils.scale.setScalar(coilScale * (1 + .12 * Math.sin(s.progress.rope * Math.PI)));
    this.coils.position.copy(this.coilHome).lerp(this.bridgeCenter, ease((b - .3) / .5));
    this.coils.position.y += s.bridgeStarted ? Math.sin(clamp(b / .88) * Math.PI) * .6 : 0;
    this.supports.visible = s.bridgeStarted && b > .05;
    this.supports.scale.y = ease(b / .22);
    this.ropes.forEach(({ mesh, from, to }, i) => {
      const p = ease((b - .58 - (i % 8) * .024) / .16);
      mesh.visible = p > 0;
      this.segment(mesh, from, from.clone().lerp(to, Math.max(.001, p)), .035);
    });
    this.steps.forEach(({ mesh, height }, i) => {
      const p = ease((s.progress.climb - i * .07) / .58);
      mesh.visible = s.climbStarted && p > 0;
      mesh.scale.y = height * p;
      mesh.position.y = .25 + height * p / 2;
    });
    this.vines.visible = s.climbStarted;
    this.vines.children.forEach((child, i) => { child.visible = s.progress.climb >= (1 - i / this.vines.children.length) * .8; });
    this.markers.visible = s.conditions.bridgeBuilt;
    this.markers.children.forEach(child => { child.visible = !child.userData.climbOnly || s.conditions.climbRouteOpen; });
    const wind = Math.sin(s.progress.tree * Math.PI * 4) * Math.sin(s.progress.tree * Math.PI);
    this.trees.forEach((tree, i) => { tree.rotation.z = wind * (i < 3 ? .075 : .045); });
  }
  dispose(): void {
    this.woodMaterial.dispose(); this.ropeMaterial.dispose(); this.rootMaterial.dispose();
    this.ropeGeometry.dispose(); this.coilGeometry.dispose(); this.root.clear();
  }
}
