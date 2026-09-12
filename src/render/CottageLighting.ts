import * as THREE from 'three';

/** Presentation of the existing lightOn flag; no quest knowledge or gameplay writes. */
export class CottageLighting {
  readonly root = new THREE.Group();
  readonly ambient = new THREE.HemisphereLight('#c0cfe4', '#777c89', .85);
  readonly window = new THREE.DirectionalLight('#cbd9ed', 1.05);
  private blend = 0;
  private initialized = false;
  private cool = new THREE.Color('#c0cfe4');
  private warm = new THREE.Color('#ffe2b4');
  private coolGround = new THREE.Color('#777c89');
  private warmGround = new THREE.Color('#aa8569');
  constructor() {
    this.window.position.set(-3,8,-4);
    this.window.castShadow = true;
    this.window.shadow.mapSize.set(1024,1024);
    Object.assign(this.window.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:35});
    this.window.shadow.normalBias = .04;
    this.window.shadow.radius = 3;
    this.root.add(this.ambient,this.window);
  }
  update(lightOn: boolean, dt: number): void {
    const target = lightOn ? 1 : 0;
    if (!this.initialized) { this.blend = target; this.initialized = true; }
    else {
      const step = Math.max(0,dt) / 1.4;
      this.blend += THREE.MathUtils.clamp(target-this.blend,-step,step);
    }
    const room = THREE.MathUtils.clamp((this.blend-.25)/.75,0,1);
    const t = room*room*(3-2*room);
    this.ambient.color.copy(this.cool).lerp(this.warm,t);
    this.ambient.groundColor.copy(this.coolGround).lerp(this.warmGround,t);
    this.ambient.intensity = THREE.MathUtils.lerp(.85,1.65,t);
    // More diffuse room light makes the fixed window shadows less dominant.
    this.window.intensity = THREE.MathUtils.lerp(1.05,.8,t);
  }
}


