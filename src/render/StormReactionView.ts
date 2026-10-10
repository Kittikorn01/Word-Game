import * as THREE from 'three';
import { STORM_ROOF, STORM_WINDBREAK, stormProtection } from './StormProtection.ts';
import { stormSmooth as smooth, type StormWorldState } from '../simulation/StormWorldState.ts';

const pulse=(p:number,start=0,end=1)=>p<=start||p>=end?0:Math.sin((p-start)/(end-start)*Math.PI);
/** A single bounded flash, never an idle effect. */
export const stormLightning=(p:number)=>pulse(p,.43,.51);
/** Stage-local projection. Temporary roof transforms and materials are restored on disposal. */
export class StormReactionView {
  readonly root=new THREE.Group();
  private geometries:THREE.BufferGeometry[]=[];
  private materials:THREE.Material[]=[];
  private surfaces:{node:THREE.Mesh; original:THREE.Material|THREE.Material[]; material:THREE.MeshStandardMaterial; base:THREE.Color}[]=[];
  private flame=new THREE.Group();
  private fireLight=new THREE.PointLight('#ffab52',0,2.7,2);
  private warmLight=new THREE.PointLight('#ffd39a',0,4.1,2);
  private lightning=new THREE.DirectionalLight('#dceeff',0);
  private traveler=new THREE.Group();
  private legs:THREE.Mesh[]=[];
  private flap=new THREE.Group();
  private roof:THREE.Mesh;
  private roofPosition:THREE.Vector3;
  private roofScale:THREE.Vector3;
  private roofRoll:THREE.Mesh;
  private gate=new THREE.Group();
  private frontGate=new THREE.Group();
  private latch:THREE.Mesh;
  private debris:THREE.Group[]=[];
  private helpingHands=new THREE.Group();
  private seams:THREE.Mesh[]=[];
  private readonly clothColor=new THREE.Color('#92917d');
  private box=this.geometry(new THREE.BoxGeometry(1,1,1));
  private flameMaterial:THREE.MeshBasicMaterial;
  constructor(environment:THREE.Object3D) {
    this.root.name='storm-world-reactions';
    const names=new Set(['storm-sky-backdrop','sloped-weather-roof','roof-batten','front-crossbeam','front-post','rear-post','rear-windbreak','covered-ground','resting-mat','bedroll-pillow','unlit-firewood']);
    environment.traverse(node=>{
      if(node instanceof THREE.Mesh&&names.has(node.name)) {
        const original=node.material,material=(original as THREE.MeshStandardMaterial).clone();
        this.materials.push(material);node.material=material;
        this.surfaces.push({node,original,material,base:material.color.clone()});
      }
    });
    this.flame.name='storm-campfire';this.flame.position.copy(environment.getObjectByName('unlit-fire-area')!.position);
    this.fireLight.position.copy(this.flame.position);this.fireLight.position.y=1;
    this.flameMaterial=new THREE.MeshBasicMaterial({color:'#ff943a'});this.materials.push(this.flameMaterial);
    const core=new THREE.MeshBasicMaterial({color:'#ffe3a0'});this.materials.push(core);
    const cone=this.geometry(new THREE.ConeGeometry(1,1,5));
    for(const [x,y,z,w,h,m] of [[0,.68,0,.28,.9,this.flameMaterial],[-.2,.5,.05,.13,.52,this.flameMaterial],[.19,.56,-.05,.13,.62,this.flameMaterial],[0,.48,.14,.14,.48,core]] as const) {
      const mesh=new THREE.Mesh(cone,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,w);this.flame.add(mesh);
    }
    this.flame.visible=false;
    this.roof=environment.getObjectByName('sloped-weather-roof') as THREE.Mesh;
    this.roofPosition=this.roof.position.clone();this.roofScale=this.roof.scale.clone();
    // The existing roof becomes rolled canvas; framing and the final footprint stay fixed.
    const canvas=this.material('#92917d'),edge=this.material('#655e4c');
    this.roofRoll=this.mesh(this.geometry(new THREE.CylinderGeometry(.17,.17,STORM_ROOF.depth,10)),canvas);
    this.roofRoll.name='rolling-roof-canvas';this.roofRoll.rotation.x=Math.PI/2+STORM_ROOF.slope;
    for(const z of [-.63,0,.63]) {
      const seam=this.mesh(this.box,edge,[1,.012,.025]);seam.name='roof-canvas-seam';
      seam.position.z=STORM_ROOF.z+z;seam.position.y=STORM_ROOF.y-Math.tan(STORM_ROOF.slope)*z+.055;
      seam.rotation.x=STORM_ROOF.slope;this.seams.push(seam);this.root.add(seam);
    }
    this.flap.name='shelter-side-windbreak';
    this.flap.position.set(STORM_WINDBREAK.x,.15,STORM_WINDBREAK.z);
    const wood=this.material('#796247'),iron=this.material('#393f3d');
    this.gate.name='safe-side-gate';this.frontGate.name='safe-front-gate';
    this.frontGate.position.z=STORM_WINDBREAK.depth;
    // Low, hinged wooden panels with broad planks and a cross brace; no canvas remains.
    for(const y of [.16,.43,.70,.97]) {
      const side=this.mesh(this.box,wood,[.12,.24,STORM_WINDBREAK.depth]);side.position.set(0,y,STORM_WINDBREAK.depth/2);this.gate.add(side);
      const front=this.mesh(this.box,wood,[1.15,.24,.12]);front.name='safe-front-plank';front.position.set(.575,y,0);this.frontGate.add(front);
    }
    for(const z of [.12,STORM_WINDBREAK.depth-.12]) {
      const brace=this.mesh(this.box,edge,[.16,1.13,.12]);brace.position.set(.02,.57,z);this.gate.add(brace);
    }
    const diagonal=this.mesh(this.box,edge,[.12,1.32,.14]);diagonal.position.set(.575,.57,.085);diagonal.rotation.z=-.72;this.frontGate.add(diagonal);
    for(const x of [0,1.15]) {
      const post=this.mesh(this.box,wood,[.16,1.3,.16]);post.position.set(x,.58,STORM_WINDBREAK.depth);this.flap.add(post);
    }
    this.latch=this.mesh(this.box,iron,[.48,.10,.14]);this.latch.name='safe-locking-bolt';
    this.latch.position.set(.84,1.04,STORM_WINDBREAK.depth+.12);this.flap.add(this.latch);
    const socket=this.mesh(this.box,iron,[.18,.21,.19]);socket.position.set(1.15,1.04,STORM_WINDBREAK.depth+.12);this.flap.add(socket);
    this.flap.add(this.gate,this.frontGate);
    const twig=this.material('#60513c'),leaf=this.material('#798163');
    for(let i=0;i<3;i++) {
      const branch=new THREE.Group();branch.name='storm-stopped-branch';
      const stem=this.mesh(this.box,twig,[.48,.065,.07]);stem.rotation.y=.35;branch.add(stem);
      const fork=this.mesh(this.box,twig,[.25,.05,.055]);fork.position.set(.08,.02,.07);fork.rotation.y=-.65;branch.add(fork);
      const foliage=this.mesh(this.geometry(new THREE.IcosahedronGeometry(.13,0)),leaf,[1,.35,.7]);foliage.position.set(-.18,.03,.02);branch.add(foliage);
      this.debris.push(branch);this.root.add(branch);
    }
    const sleeve=this.material('#80513e'),hand=this.material('#d5b998');
    for(const x of [-.2,.2]) {
      const arm=this.mesh(this.box,sleeve,[.14,.14,.36]);arm.position.set(x,.55,.28);
      const palm=this.mesh(this.box,hand,[.15,.13,.13]);palm.position.set(x,.55,.50);
      this.helpingHands.add(arm,palm);
    }
    this.helpingHands.name='safe-player-hands';this.root.add(this.helpingHands);
    this.root.add(this.roofRoll);
    this.warmLight.position.set(.35,1.35,-3.6);this.lightning.position.set(-3,9,-5);
    this.traveler.name='storm-traveler';this.traveler.visible=false;
    const coat=this.material('#9c7665'),skin=this.material('#d5b998'),dark=this.material('#4e5351'),pack=this.material('#736551');
    const torso=this.mesh(this.geometry(new THREE.CylinderGeometry(.18,.27,.49,6)),coat);torso.position.y=.43;
    const hood=this.mesh(this.geometry(new THREE.IcosahedronGeometry(.23,1)),coat);hood.position.set(0,.85,0);
    const face=this.mesh(this.geometry(new THREE.IcosahedronGeometry(.15,1)),skin,[1,1,.6]);face.position.set(0,.85,.16);
    const bag=this.mesh(this.box,pack,[.31,.35,.17]);bag.position.set(0,.5,-.23);
    this.traveler.add(torso,hood,face,bag);
    for(const x of [-.115,.115]){const boot=this.mesh(this.box,dark,[.16,.16,.24]);boot.position.set(x,.1,.02);this.legs.push(boot);this.traveler.add(boot);}
    this.root.add(this.flame,this.fireLight,this.warmLight,this.lightning,this.flap,this.traveler);
  }
  private geometry<T extends THREE.BufferGeometry>(g:T):T{this.geometries.push(g);return g;}
  private material(color:string):THREE.MeshStandardMaterial{const m=new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true});this.materials.push(m);return m;}
  private mesh(g:THREE.BufferGeometry,m:THREE.Material,size:readonly[number,number,number]=[1,1,1]):THREE.Mesh{const mesh=new THREE.Mesh(g,m);mesh.scale.set(...size);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
  update(s:StormWorldState):void {
    const p=s.progress,warm=smooth(p.warm),finalPulse=pulse(p.rescue,.83,1);
    const {cover,roofEdge,drop,fasten,protection}=stormProtection(p.shelter,p.safe);
    this.roof.scale.set(STORM_ROOF.width*cover,.08,STORM_ROOF.depth);
    this.roof.position.x=STORM_ROOF.left+STORM_ROOF.width*cover/2+.5;
    this.roofRoll.position.set(roofEdge,STORM_ROOF.y+.13,STORM_ROOF.z);
    this.roofRoll.scale.set(1-.65*smooth(p.shelter),1,1-.65*smooth(p.shelter));
    for(const seam of this.seams) {seam.scale.x=STORM_ROOF.width*cover;seam.position.x=STORM_ROOF.left+STORM_ROOF.width*cover/2;}
    // The player reaches the panel before it rises, then slides the bolt into its socket.
    this.gate.rotation.z=(drop-1)*Math.PI/2;
    this.frontGate.rotation.x=(drop-1)*Math.PI/2;
    this.latch.position.x=.78+.30*fasten;
    this.latch.visible=drop===1;
    const working=p.safe>=.28&&p.safe<.52&&!!s.playerPose&&!s.requested.rescue;
    this.helpingHands.visible=working;
    if(working) {
      this.helpingHands.position.set(s.playerPose!.x,s.playerPose!.y+.105,s.playerPose!.z);
      this.helpingHands.rotation.y=s.playerPose!.heading;
      this.helpingHands.position.y+=.45*drop;
      this.helpingHands.position.x+=.25*fasten;
    }
    for(let i=0;i<this.debris.length;i++) {
      const branch=this.debris[i];branch.visible=p.shelter>0;
      if(p.safe<.50) {
        const t=(s.elapsed*.55+i*.31)%1;
        branch.position.set(-4.7+t*2.7,.3+Math.sin(t*Math.PI)*.3,-4.15+i*.2);
        branch.rotation.set(0,t*4+i,t*.3);
      } else {
        const t=smooth((p.safe-.54-i*.015)/.11);
        // Approach, collide at the OUTSIDE face, recoil and drop; never cross into the shelter.
        const hit=Math.min(1,t/.6),fall=smooth((t-.6)/.4);
        branch.position.set(-4.7+1.34*hit-.32*fall,.62-.54*fall,-4.15+i*.2);
        branch.rotation.set(0,i+hit*1.3+fall*.5,fall*.2);
        branch.visible=p.safe>=.54+i*.015;
      }
    }
    for(const {node,material,base} of this.surfaces) {
      material.color.copy(base);material.emissive.set('#d5b07a');material.emissiveIntensity=0;
      const name=node.name;
      if(name==='storm-sky-backdrop') {
        material.color.lerp(new THREE.Color('#d5e5ee'),stormLightning(p.rain)*.42);continue;
      }
      if(name==='unlit-firewood') {
        material.color.lerp(new THREE.Color('#4a3025'),smooth(p.fire));
        material.emissive.set('#ed6e22');material.emissiveIntensity=.4*pulse(p.fire,0,.35)+.12*smooth(p.fire);continue;
      }
      const rest=name==='resting-mat'||name==='bedroll-pillow',floor=name==='covered-ground';
      const roof=name==='sloped-weather-roof'||name==='roof-batten'||name==='front-crossbeam';
      // Only a brief, non-emissive roof-edge cue; never illuminate the building.
      if(name==='front-crossbeam') material.color.lerp(new THREE.Color('#9a9d92'),pulse(p.shelter,.02,.22)*.25);
      if(name==='sloped-weather-roof') material.color.copy(this.clothColor);
      // The floor no longer dries instantly; stopping rain carries the meaning.
      material.emissiveIntensity=(rest||floor)?finalPulse*.08:0;
      if(rest||floor) {
        material.color.lerp(new THREE.Color(rest?'#d6a66c':'#a08b69'),warm*(rest?.85:.55));
        material.emissiveIntensity+=warm*(rest?.2:.12);
      } else if(!roof) material.emissiveIntensity+=warm*.065;
    }
    const ignition=smooth((p.fire-.12)/.72);
    this.flame.visible=p.fire>0;
    const flicker=1+(.06-.035*protection)*Math.sin(s.elapsed*5.1)+.025*Math.sin(s.elapsed*8.3);
    this.flame.scale.set(ignition,ignition*flicker,ignition);
    this.flame.rotation.z=-(.06+.025*Math.sin(s.elapsed*4.7))*(1-protection)*smooth(p.shelter);
    this.flame.rotation.y=Math.sin(s.elapsed*2)*.08*(1-.8*protection);
    this.fireLight.intensity=ignition*(4+warm*1.2+finalPulse*.7)*flicker;this.fireLight.distance=2.7+warm*.8;
    const spread=smooth((p.warm-.08)/.8);
    this.warmLight.position.x=-2+2.35*spread;
    this.warmLight.intensity=spread*(5.8+finalPulse*1.2)+pulse(p.warm,.2,1)*.6;
    this.lightning.intensity=stormLightning(p.rain)*1.8;
    this.traveler.visible=s.travelerVisible;
    const pose=s.traveler,bob=pose.walking?Math.abs(Math.sin(s.elapsed*9))*.025:0;
    this.traveler.position.set(pose.x,pose.y+bob,pose.z);this.traveler.rotation.y=pose.heading;
    for(let i=0;i<this.legs.length;i++)this.legs[i].rotation.x=pose.walking?Math.sin(s.elapsed*9+i*Math.PI)*.3:0;
  }
  dispose():void {
    this.roof.position.copy(this.roofPosition);this.roof.scale.copy(this.roofScale);
    for(const {node,original} of this.surfaces)node.material=original;
    this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.root.removeFromParent();
  }
}

