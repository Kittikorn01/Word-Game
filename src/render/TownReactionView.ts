import * as THREE from 'three';
import type { StageDefinition } from '../stages/types.ts';
import type { GameState } from '../simulation/types.ts';
import { townParcelAvailable } from '../simulation/TownWorldState.ts';
import { townDeliveryPoints } from '../simulation/TownEndingController.ts';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
/** Bounded geometry, allocated once. State and timing remain simulation-owned. */
export class TownReactionView {
  readonly root = new THREE.Group();
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.MeshStandardMaterial[] = [];
  private box = this.geometry(new THREE.BoxGeometry(1, 1, 1));
  private sphere = this.geometry(new THREE.SphereGeometry(1, 14, 8));
  private disk = this.geometry(new THREE.CylinderGeometry(1, 1, .15, 24));
  private ring = this.geometry(new THREE.TorusGeometry(1, .055, 5, 24));
  private crust = this.material('#c88236');
  private cream = this.material('#fff0ce');
  private gold = this.material('#efb638', .35, .5);
  private ink = this.material('#8d6547');
  private teal = this.material('#5c837b');
  private paper = this.material('#fff6dc');
  private parcelMaterial = this.material('#bb8455');
  private bread = new THREE.Group();
  private coin = new THREE.Group();
  private letter = new THREE.Group();
  private parcel = new THREE.Group();
  private shopPulse = new THREE.Group();
  private mailbox: THREE.Object3D;
  private mailboxHome: THREE.Vector3;
  private dial: THREE.Object3D;
  private shutter: THREE.Mesh;
  private shutterHome: THREE.Vector3;
  private shutterHeight: number;
  private awning: THREE.Object3D;
  private awningScale: THREE.Vector3;
  private awningHome: THREE.Vector3;
  private windowMaterial: THREE.MeshStandardMaterial;
  private faceMaterial: THREE.MeshStandardMaterial;
  private hour: THREE.Group;
  private minute: THREE.Group;
  private flag: THREE.Group;
  private breadHome: THREE.Vector3;
  private coinHome: THREE.Vector3;
  private mailHome: THREE.Vector3;
  private destinationRing: THREE.Mesh;
  private points: ReturnType<typeof townDeliveryPoints>;

  constructor(stage: StageDefinition, environment: THREE.Object3D) {
    this.root.name = 'town-world-reactions';
    this.points = townDeliveryPoints(stage);
    environment.updateMatrixWorld(true);
    const object = (name: string) => {
      const found = environment.getObjectByName(name);
      if (!found) throw new Error(`Town reaction anchor missing: ${name}`);
      return found;
    };
    const anchor = (name: string) => object(name).getWorldPosition(new THREE.Vector3());
    this.breadHome = anchor('bakery-counter-top'); this.breadHome.y += .065; this.breadHome.z += .06;
    this.bread.name = 'town-bread'; this.bread.position.copy(this.breadHome);
    for (let i = 0; i < 3; i++) {
      const loaf = new THREE.Group(); loaf.position.set((i - 1) * .31, .12, i === 1 ? -.025 : .025);
      loaf.rotation.y = (i - 1) * -.16;
      const body = this.mesh(this.sphere, this.crust, [.2, .13, .135]); body.name = 'bread-rounded-loaf'; loaf.add(body);
      for (const x of [-.08, 0, .08]) {
        const score = this.mesh(this.box, this.cream, [.025, .012, .13]); score.name = 'bread-score'; score.position.set(x, .12, .015); score.rotation.y = -.3; loaf.add(score);
      }
      this.bread.add(loaf);
    }
    this.coinHome = anchor('shop-display-shelf'); this.coinHome.y += .25; this.coinHome.z += .13;
    this.coin.name = 'town-coin';
    const disk = this.mesh(this.disk, this.gold, [.23, .5, .23]); disk.rotation.x = Math.PI / 2; disk.name = 'coin-round-disk'; this.coin.add(disk);
    const rim = this.mesh(this.ring, this.cream, [.18, .18, .18]); rim.position.z = .043; this.coin.add(rim);
    const stamp = this.mesh(this.box, this.ink, [.025, .18, .012]); stamp.position.z = .045; this.coin.add(stamp);
    for (const y of [-.075, .075]) { const serif = this.mesh(this.box, this.ink, [.09, .025, .012]); serif.position.set(0, y, .045); this.coin.add(serif); }
    this.coin.rotation.x = -.25;

    const display = object('shop-open-display') as THREE.Mesh;
    this.windowMaterial = this.cloneMaterial(display); this.windowMaterial.color.set('#c6a56e'); this.windowMaterial.emissive.set('#ffbf65');
    const displaySize = display.getWorldScale(new THREE.Vector3());
    this.shutterHeight = displaySize.y;
    this.shutter = this.mesh(this.box, this.teal, [displaySize.x + .035, displaySize.y, .04]); this.shutter.name = 'shop-shutter';
    this.shutterHome = anchor('shop-open-display'); this.shutterHome.z += .045;
    // Broad slat seams read as one shutter, not extra merchandise.
    for (const y of [-.15, 0, .15]) {
      const seam = this.mesh(this.box, this.ink, [.96, .025, .05]); seam.position.set(0, y / displaySize.y, .51); this.shutter.add(seam);
    }
    this.awning = object('shop-awning'); this.awningScale = this.awning.scale.clone(); this.awningHome = this.awning.position.clone();

    this.mailHome = anchor('mail-slot'); this.mailHome.z += .09;
    this.letter.name = 'town-envelope';
    const paper = this.mesh(this.box, this.paper, [.65, .4, .055]); this.letter.add(paper);
    // Dark perimeter and V flap make an envelope silhouette readable at town scale.
    for (const y of [-.2, .2]) { const edge = this.mesh(this.box, this.ink, [.66, .018, .014]); edge.position.set(0, y, .033); this.letter.add(edge); }
    for (const x of [-.32, .32]) { const edge = this.mesh(this.box, this.ink, [.018, .4, .014]); edge.position.set(x, 0, .033); this.letter.add(edge); }
    for (const sign of [-1, 1]) {
      const fold = this.mesh(this.box, this.ink, [.36, .018, .014]); fold.position.set(sign * .15, .085, .037); fold.rotation.z = sign * .58; this.letter.add(fold);
    }
    const seal = this.mesh(this.disk, this.crust, [.055, .1, .055]); seal.rotation.x = Math.PI / 2; seal.position.set(0, -.025, .05); this.letter.add(seal);
    this.letter.rotation.x = -.25;
    const stem = object('mailbox-flag-stem'), flag = object('mailbox-flag');
    this.flag = new THREE.Group(); this.flag.name = 'mailbox-active-flag';
    this.flag.position.copy(stem.position); this.flag.position.y -= .12; stem.parent!.add(this.flag);
    for (const part of [stem, flag]) { part.position.sub(this.flag.position); this.flag.add(part); }

    this.mailbox = object('mail-placeholder'); this.mailboxHome = this.mailbox.position.clone();
    const dial = this.dial = object('town-clock-dial');
    const pivot = (name: string) => {
      const hand = object(name); const group = new THREE.Group(); group.name = `${name}-pivot`;
      group.position.z = .055; dial.add(group); hand.position.z -= .055; group.add(hand); return group;
    };
    this.hour = pivot('clock-hand-hour'); this.minute = pivot('clock-hand-minute');
    this.faceMaterial = this.cloneMaterial(object('static-clock-face') as THREE.Mesh); this.faceMaterial.emissive.set('#ffdc8a');

    // Replace only the small loose parcel with a movable version; keep the destination crate.
    object('delivery-small-parcel').visible = false; object('delivery-small-parcel-wrap').visible = false;
    this.parcel.name = 'town-carry-parcel';
    this.parcel.add(this.mesh(this.box, this.parcelMaterial, [.5, .43, .42]));
    this.parcel.add(this.mesh(this.box, this.cream, [.065, .44, .43]));
    this.parcel.add(this.mesh(this.box, this.cream, [.51, .44, .06]));
    const label = this.mesh(this.box, this.paper, [.19, .1, .012]); label.position.set(.12, .05, .218); this.parcel.add(label);
    this.destinationRing = this.mesh(this.ring, this.gold, [.62, .62, .62]); this.destinationRing.name = 'delivery-arrival-ring';
    this.destinationRing.rotation.x = -Math.PI / 2; this.destinationRing.position.set(this.points.parcelDestination.x, .075, this.points.parcelDestination.z);
    this.root.add(this.bread, this.coin, this.letter, this.parcel, this.shutter, this.destinationRing);
    // Pivot at the shop's ground anchor, keeping the authored layout unchanged.
    const shop = object('shop-placeholder');
    const shopZone = stage.townBlockout!.zones.find(zone => zone.id === 'shop')!;
    this.shopPulse.name = 'shop-opening-pulse';
    this.shopPulse.position.set(shopZone.mass.x, 0, shopZone.mass.z);
    this.root.add(this.shopPulse); this.root.updateMatrixWorld(true);
    this.shopPulse.attach(shop); this.shopPulse.attach(this.shutter); this.shopPulse.attach(this.coin);
    this.bread.visible = this.coin.visible = this.letter.visible = this.parcel.visible = this.destinationRing.visible = false;
  }
  private geometry<T extends THREE.BufferGeometry>(geometry: T): T { this.geometries.push(geometry); return geometry; }
  private material(color: string, roughness = .9, metalness = 0): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness }); this.materials.push(material); return material;
  }
  private cloneMaterial(mesh: THREE.Mesh): THREE.MeshStandardMaterial {
    const material = (mesh.material as THREE.MeshStandardMaterial).clone(); this.materials.push(material); mesh.material = material; return material;
  }
  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, size: [number, number, number]): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material); mesh.scale.set(...size); mesh.castShadow = mesh.receiveShadow = true; return mesh;
  }
  update(game: GameState): void {
    const s = game.town; if (!s) return;
    const p = s.progress;
    this.bread.visible = s.started.bread;
    this.bread.scale.setScalar(ease(p.bread * 2) * (1 + .08 * Math.sin(p.bread * Math.PI)));
    this.bread.position.copy(this.breadHome); this.bread.position.y += Math.sin(p.bread * Math.PI) * .3;
    this.crust.emissive.set('#d58c32'); this.crust.emissiveIntensity = Math.sin(p.bread * Math.PI) * .18;
    this.coin.visible = s.started.coin;
    this.coin.position.copy(this.coinHome).sub(this.shopPulse.position); this.coin.position.y += Math.sin(p.coin * Math.PI) * .55;
    this.coin.rotation.y = (1 - ease(p.coin)) * Math.PI * 4;
    this.coin.scale.setScalar(ease(p.coin * 4));
    const shopBeat = ease(p.shop / .22) * (1 - ease((p.shop - .36) / .36));
    this.shopPulse.scale.setScalar(1 + .10 * shopBeat);
    const opening = ease((p.shop - .35) / .65);
    this.shutter.visible = opening < 1;
    this.shutter.scale.y = this.shutterHeight * Math.max(.001, 1 - opening);
    this.shutter.position.copy(this.shutterHome).sub(this.shopPulse.position); this.shutter.position.y += this.shutterHeight * opening / 2;
    const awningDepth = .3 + opening * .7;
    this.awning.scale.z = this.awningScale.z * awningDepth;
    this.awning.position.z = this.awningHome.z - this.awningScale.z * (1 - awningDepth) / 2;
    this.windowMaterial.emissiveIntensity = opening * .55 + shopBeat * .25;
    this.letter.visible = s.started.letter && p.letter < 1;
    // 0.2s pop, 0.4s hover, then a readable arc outside the west grid edge.
    const flight = ease((p.letter - .25) / .55);
    this.letter.position.copy(this.mailHome);
    this.letter.position.x -= (1 - flight) * .75;
    this.letter.position.y += (1 - flight) * .9 + Math.sin(flight * Math.PI) * .65;
    this.letter.position.z += (1 - flight) * .75;
    const pop = ease(p.letter / .085) * (1 + .10 * Math.sin(clamp(p.letter / .085) * Math.PI));
    this.letter.scale.setScalar(1.35 * pop * (1 - ease((p.letter - .73) / .07)));
    this.letter.rotation.z = -.12 * Math.sin(flight * Math.PI);
    this.paper.emissive.set('#ffe3a0');
    this.paper.emissiveIntensity = s.started.letter ? .18 * (1 - flight) : 0;
    const received = ease((p.letter - .8) / .2);
    this.mailbox.position.copy(this.mailboxHome);
    this.mailbox.position.y += Math.sin(received * Math.PI) * .16;
    this.flag.rotation.z = -Math.PI / 2 * (1 - received);
    const clockTurn = ease(p.clock);
    // Finish near 10:10, with distinct hands instead of overlapping at twelve.
    this.minute.rotation.z = -clockTurn * (Math.PI * 4 + Math.PI / 3) - s.clockElapsed * Math.PI / 30;
    this.hour.rotation.z = clockTurn * (-Math.PI * 2 + .12) - s.clockElapsed * Math.PI / 360;
    this.dial.scale.setScalar(1 + .09 * Math.sin(ease(p.clock) * Math.PI));
    this.faceMaterial.emissiveIntensity = s.started.clock ? .08 + .35 * Math.sin(p.clock * Math.PI) : 0;
    const ending = game.townEnding;
    this.parcel.visible = townParcelAvailable(game);
    this.parcel.position.set(this.points.pickup.x, .25, this.points.pickup.z);
    this.parcelMaterial.emissive.set('#ffc46b');
    this.parcelMaterial.emissiveIntensity = ending && ending.phase !== 'idle' && !s.carryCompleted ? .22 : 0;
    if (ending?.pose && (ending.phase === 'pickup' || ending.parcelAttached || ending.placeProgress > 0)) {
      const held = new THREE.Vector3(ending.pose.x + Math.sin(ending.heading) * .42, .67, ending.pose.z + Math.cos(ending.heading) * .42);
      const placed = new THREE.Vector3(this.points.parcelDestination.x, this.points.parcelDestination.y, this.points.parcelDestination.z);
      if (ending.phase === 'pickup') this.parcel.position.lerp(held, ease(ending.elapsed / .5));
      else this.parcel.position.copy(held).lerp(placed, ease(ending.placeProgress));
      this.parcel.position.y += Math.sin(ending.placeProgress * Math.PI) * .17;
    }
    this.destinationRing.visible = !!ending && ending.placeProgress > 0;
    this.destinationRing.scale.setScalar(.62 + Math.sin((ending?.placeProgress ?? 0) * Math.PI) * .1);
    this.gold.emissive.set('#eab444'); this.gold.emissiveIntensity = ending?.phase === 'arrival' ? .25 : .05;
  }
  dispose(): void { this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose()); this.root.removeFromParent(); }
}

