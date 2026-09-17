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
  private woodEdge = new THREE.MeshStandardMaterial({ color: '#60402c', roughness: 1, flatShading: true });
  private grainMaterial = new THREE.MeshStandardMaterial({ color: '#755035', roughness: 1 });
  private knotGeometry = new THREE.TorusGeometry(1, .11, 3, 9);
  private ropeMaterial = new THREE.MeshStandardMaterial({ color: '#d8bd82', roughness: 1, flatShading: true });
  private rootMaterial = new THREE.MeshStandardMaterial({ color: '#887344', roughness: 1, flatShading: true });
  private ropeGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
  private coilGeometry = new THREE.TorusGeometry(.21, .038, 5, 14);
  private planks: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; yaw: number }[] = [];
  private ropes: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; delay: number; radius: number }[] = [];
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
    this.woodMaterial = new THREE.MeshStandardMaterial({ color: '#a7794d', roughness: 1, flatShading: true });
    const data = stage.forestBlockout!, lane = data.futureBridge;
    const nearX = lane.x - lane.width / 2 - .55;
    const farY = data.terrain.find(a => a.id === 'far-ground')!.top;
    for (let i = 0; i < 12; i++) {
      // Box material slots: a warm sawn top and darker bark-like edges, not a beige block.
      const mesh = new THREE.Mesh(assets.geometry.box, [this.woodEdge, this.woodEdge, this.woodMaterial, this.woodEdge, this.woodEdge, this.woodEdge]);
      mesh.name = `bridge-plank-${i}`; mesh.scale.set(.22, .095, .88 + (i % 3) * .015); mesh.castShadow = mesh.receiveShadow = true;
      const from = new THREE.Vector3(nearX + (i % 3 - 1) * .22, .07 + Math.floor(i / 3) * .105, lane.z + 1.35 + (i % 3 - 1) * .12);
      const t = i / 11;
      const to = new THREE.Vector3(lane.x - lane.width / 2 - .38 + (lane.width + .76) * t, farY * t + .015 - Math.sin(t * Math.PI) * .025, lane.z);
      // Sparse model-space grain strokes and a small oval knot follow each board into the bridge.
      for (let g = 0; g < 3; g++) {
        const grain = new THREE.Mesh(assets.geometry.box, this.grainMaterial); grain.name = 'wood-grain';
        grain.scale.set(.025, .012, .48 + ((g + i) % 3) * .14);
        grain.position.set((g - 1) * .26, .507, (g % 2 ? .08 : -.08)); grain.rotation.y = (g - 1) * .025;
        mesh.add(grain);
      }
      const knot = new THREE.Mesh(this.knotGeometry, this.grainMaterial); knot.name = 'wood-knot';
      knot.rotation.x = -Math.PI / 2; knot.scale.set(.13, .055, .06); knot.position.set(.06, .513, .22 - (i % 3) * .18); mesh.add(knot);
      this.planks.push({ mesh, from, to, yaw: (i % 3 - 1) * .014 }); this.root.add(mesh);
    }
    this.coils.position.set(nearX, .12, lane.z - 1.18);
    this.coilHome.copy(this.coils.position); this.bridgeCenter.set(lane.x, .55, lane.z);
    for (let i = 0; i < 3; i++) {
      const coil = new THREE.Mesh(this.coilGeometry, this.ropeMaterial);
      coil.rotation.x = Math.PI / 2; coil.position.y = i * .055; this.coils.add(coil);
    }
    this.root.add(this.coils, this.supports, this.vines, this.markers);
    // A narrow under-deck spine keeps a continuous visual/support surface beneath the gaps.
    const spine = new THREE.Mesh(assets.geometry.box, this.woodEdge); spine.name = 'bridge-under-deck';
    spine.scale.set(lane.width + .98, .09, .36); spine.position.set(lane.x, farY / 2 - .065, lane.z);
    spine.rotation.z = Math.atan2(farY, lane.width + .76); this.supports.add(spine);
    const addRope = (from: THREE.Vector3, to: THREE.Vector3, delay: number, radius: number, name: string) => {
      const mesh = new THREE.Mesh(this.ropeGeometry, this.ropeMaterial); mesh.name = name; this.root.add(mesh);
      this.ropes.push({ mesh, from, to, delay, radius });
    };
    for (const side of [-1, 1]) {
      const point = (t: number) => new THREE.Vector3(lane.x - lane.width / 2 - .23 + (lane.width + .46) * t,
        .78 + farY * t - Math.sin(t * Math.PI) * .25, lane.z + side * (lane.depth / 2 - Math.sin(t * Math.PI) * .21));
      // Extend the existing four anchors vertically, keeping their original bank locations.
      for (const end of [0, 1]) {
        const top = point(end), bankY = end ? farY : 0;
        const post = new THREE.Mesh(assets.geometry.box, this.woodEdge); post.name = 'bridge-post-extension';
        post.scale.set(.14, .81, .16); post.position.set(top.x, bankY + .405, top.z); this.supports.add(post);
        const cap = assets.mesh('box', 'trunk'); cap.scale.set(.19, .07, .21); cap.position.set(top.x, bankY + .825, top.z); this.supports.add(cap);
      }
      for (let i = 0; i < 8; i++) {
        addRope(point(i / 8), point((i + 1) / 8), .57 + i * .025, .043, 'bridge-rope');
      }
      for (let i = 1; i < 6; i++) {
        const t = i / 6, top = point(t), bottom = top.clone();
        bottom.y = farY * t + .035; bottom.z = lane.z + side * .44;
        addRope(top, bottom, .69 + i * .025, .027, 'bridge-rope-hanger');
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
      patch.scale.set(node.id === 'summit' ? 1.05 : .58, .02, node.id === 'summit' ? .85 : .55); patch.position.set(node.x, node.y + .012, node.z); patch.castShadow = false;
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
    const finishPulse = s.bridgeStarted ? Math.sin(clamp((s.progress.bridge - .9) / .1) * Math.PI) : 0;
    this.woodMaterial.emissive.set('#d6b76b'); this.woodMaterial.emissiveIntensity = pulse * .35 + finishPulse * .22;
    this.ropeMaterial.emissive.set('#e6d39d'); this.ropeMaterial.emissiveIntensity = pulse * .35;
    const b = s.progress.bridge;
    this.planks.forEach(({ mesh, from, to, yaw }, i) => {
      mesh.visible = s.hasWood;
      const p = ease((b - .08 - i * .041) / .25);
      mesh.position.copy(from).lerp(to, p);
      mesh.position.y += s.bridgeStarted ? Math.sin(p * Math.PI) * .95 + Math.sin(clamp((b - .86) / .14) * Math.PI * 2) * .035 : Math.sin(s.progress.wood * Math.PI) * .28;
      mesh.rotation.y = (1 - p) * (i % 2 ? .12 : -.09) + p * yaw;
      mesh.scale.y = .095 * ease(s.progress.wood * 2);
    });
    this.coils.visible = s.hasRope && b < .88;
    const coilScale = ease(s.progress.rope * 2) * (1 - ease((b - .65) / .23));
    this.coils.scale.setScalar(coilScale * (1 + .12 * Math.sin(s.progress.rope * Math.PI)));
    this.coils.position.copy(this.coilHome).lerp(this.bridgeCenter, ease((b - .3) / .5));
    this.coils.position.y += s.bridgeStarted ? Math.sin(clamp(b / .88) * Math.PI) * .6 : 0;
    this.supports.visible = s.bridgeStarted && b > .05;
    this.supports.scale.y = ease(b / .22);
    this.ropes.forEach(({ mesh, from, to, delay, radius }) => {
      const p = ease((b - delay) / .13);
      mesh.visible = p > 0;
      this.segment(mesh, from, from.clone().lerp(to, Math.max(.001, p)), radius);
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
    this.woodEdge.dispose(); this.grainMaterial.dispose(); this.knotGeometry.dispose();
    this.woodMaterial.dispose(); this.ropeMaterial.dispose(); this.rootMaterial.dispose();
    this.ropeGeometry.dispose(); this.coilGeometry.dispose(); this.root.clear();
  }
}
