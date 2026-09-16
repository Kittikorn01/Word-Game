import * as THREE from 'three';
import { createWorldObjects } from '../assets/createWorldObjects.ts';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { StageDefinition } from '../stages/types.ts';
import type { StageWorldState } from '../simulation/WorldReactionController.ts';

/** State projection plus presentation-only interpolation; never decides completion. */
export class WorldReactionView {
  readonly objects: ReturnType<typeof createWorldObjects>;
  private initialized = false;
  private keyActive = false;
  private keyTrailHistory: THREE.Vector3[] = [];
  private trailClock = 0;
  private keyTarget = new THREE.Vector3();
  private book = 0;
  private light = 0;
  private plant = 0;
  private door = 0;
  private angle = 0;
  private revealed = false;
  /** Readiness of finite reactions only; idle animation never blocks stage flow. */
  isBusy(state: Readonly<StageWorldState>): boolean {
    return (state.bookSpawned && this.book < 1) || (state.lightOn && this.light < 1)
      || (state.plantWatered && this.plant < 1) || (state.doorRevealed && this.door < 1)
      || (state.doorOpen && Math.abs(this.angle + Math.PI / 3) > .005);
  }
  constructor(assets: PrimitiveAssets, positions: NonNullable<StageDefinition['worldObjects']>) {
    this.objects = createWorldObjects(assets, positions);
    this.objects.key.visible = this.objects.door.visible = this.objects.drops.visible = false;
  }
  update(state: Readonly<StageWorldState>, dt: number, player: { x: number; z: number } = {x:0,z:0}): void {
    const first = !this.initialized; this.initialized = true;
    const advance = (value: number, enabled: boolean, duration: number) => !enabled ? 0 : first ? 1 : Math.min(1, value + Math.max(0, dt) / duration);

    this.book = advance(this.book, state.bookSpawned, 1.5);
    this.light = advance(this.light, state.lightOn, 1.4);
    this.plant = advance(this.plant, state.plantWatered, 1.4);
    this.door = advance(this.door, state.doorRevealed, .9);
    const ease = (t: number) => t * t * (3 - 2 * t);
    // Never retract the plaster during DOOR: every reveal frame has a solid backing.
    this.objects.door.visible = this.door > 0;
    const frameReveal = ease(THREE.MathUtils.clamp(this.door / .55, 0, 1));
    const leafReveal = ease(THREE.MathUtils.clamp((this.door - .25) / .75, 0, 1));
    this.objects.frame.scale.y = Math.max(.001, frameReveal);
    this.objects.hinge.scale.y = Math.max(.001, leafReveal);
    const keyProgress = state.keyAcquisitionProgress;
    this.objects.key.visible = state.keySpawned && !state.hasKey;
    if (this.objects.key.visible && !this.keyActive) {
      this.objects.keyStand.position.set(player.x+.55,0,player.z);
    }
    this.keyActive = this.objects.key.visible;
    if (this.objects.key.visible) {
      const flight = ease(THREE.MathUtils.clamp((keyProgress-.45)/.55,0,1));
      const rise = Math.sin(Math.min(1,keyProgress/.3)*Math.PI/2)*.55;
      this.keyTarget.set(player.x,.65,player.z).sub(this.objects.keyStand.position);
      this.objects.key.position.set(0,1.05+rise+Math.sin(keyProgress*Math.PI*4)*.055,0).lerp(this.keyTarget,flight);
      this.objects.key.rotation.set(-.25,Math.sin(keyProgress*Math.PI)*.65,-.18);
      this.objects.key.scale.setScalar(Math.max(.02,Math.min(1,keyProgress/.16)*(1-flight*.85)));
    }
    this.trailClock += dt;
    if (this.objects.key.visible && keyProgress > .45) {
      if (this.trailClock >= .035) {
        this.trailClock = 0;
        this.keyTrailHistory.unshift(this.objects.key.position.clone().add(this.objects.keyStand.position));
        this.keyTrailHistory.length = Math.min(6,this.keyTrailHistory.length);
      }
    } else this.keyTrailHistory = [];
    this.objects.keyTrail.forEach((mote,i) => {
      mote.visible = !!this.keyTrailHistory[i];
      if (mote.visible) { mote.position.copy(this.keyTrailHistory[i]); mote.scale.setScalar(.075 * (1-i/7)); }
    });
    // A warm zone-wide response precedes the featured volume; no extra lights or particles.
    const shelfPulse = Math.sin(Math.PI * Math.min(1, this.book / .65));
    this.objects.shelfMaterials.forEach(surface => {
      surface.emissive.set('#e6b86a');
      surface.emissiveIntensity = .08 * ease(this.book) + .32 * shelfPulse;
    });
    this.objects.shelfBooks.forEach(({ object, home, row, column }) => {
      const t = THREE.MathUtils.clamp((this.book - row * .025) / .5, 0, 1);
      const bounce = Math.sin(Math.PI * t);
      object.position.copy(home);
      object.position.y += .055 * bounce;
      object.rotation.z = (column % 2 ? 1 : -1) * .035 * bounce;
    });
    const featured = THREE.MathUtils.clamp((this.book - .3) / .7, 0, 1);
    this.objects.book.visible = true;
    this.objects.book.position.copy(this.objects.bookHome);
    this.objects.book.position.z += .32 * ease(Math.min(1, featured * 2));
    this.objects.book.position.y += .15 * ease(featured) + .18 * Math.sin(Math.PI * featured);
    this.objects.bookCover.emissive.set('#e6b86a');
    this.objects.bookCover.emissiveIntensity = .32 * shelfPulse + .35 * ease(featured) + .4 * Math.sin(Math.PI * featured);
    this.objects.book.rotation.z = -.12 * ease(featured);
    this.objects.bulbs.forEach((bulb,index) => {
      const t = THREE.MathUtils.clamp((this.light*1.4-index*.18)/.65,0,1);
      this.objects.lights[index].intensity = ease(t)*5;
      bulb.emissive.set('#ffd28a'); bulb.emissiveIntensity = ease(t)*1.4;
    });
    const health = ease(THREE.MathUtils.clamp((this.plant-.3)/.7,0,1));
    this.objects.drops.visible = this.plant > 0 && this.plant < .75;
    this.objects.drops.children.forEach((drop,i) => {
      const fall = (this.plant*2.6+i/7)%1;
      drop.position.set(Math.sin(i*2.4)*.22,1.65-fall*.95,Math.cos(i*2.4)*.2);
    });
    this.objects.foliage.color.set('#99845c').lerp(new THREE.Color('#64a96c'), health);
    this.objects.growth.rotation.z = -.14*(1-health);
    this.objects.growth.scale.setScalar(1 + .24 * ease(this.plant) + .1 * Math.sin(Math.PI * this.plant));
    // Room interior is +Z: a left-hinged leaf swings inward with negative Y rotation.
    // Stop at 60 degrees to show the face and keep the swing clear of the letter board.
    const target = state.doorOpen ? -Math.PI / 3 : 0;
    // A previously hidden door is projected in its final open pose BEFORE it becomes visible.
    if (first || !this.revealed) this.angle = target;
    else this.angle = THREE.MathUtils.damp(this.angle, target, 5, dt);
    this.objects.hinge.rotation.y = this.angle;
    // Swap opaque backing in the same update as the swing; never expose the scene void.
    const opening = state.doorRevealed && state.doorOpen && Math.abs(this.angle) > .0001;
    this.objects.wallCover.visible = !opening;
    this.objects.doorway.visible = opening;
    this.revealed = state.doorRevealed;
  }
  dispose(): void { this.objects.dispose(); }
}

