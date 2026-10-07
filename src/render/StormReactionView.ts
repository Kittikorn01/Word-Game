import * as THREE from 'three';
import { stormSmooth as smooth, type StormWorldState } from '../simulation/StormWorldState.ts';

const pulse=(p:number,start=0,end=1)=>p<=start||p>=end?0:Math.sin((p-start)/(end-start)*Math.PI);
/** A single bounded flash, never an idle effect. */
export const stormLightning=(p:number)=>pulse(p,.43,.51);
/** Stage-local projection. Owns every added mesh/material; original layout never moves. */
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
  private borderMaterial:THREE.MeshStandardMaterial;
  private border=new THREE.Group();
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
    this.borderMaterial=this.material('#ae9872');this.borderMaterial.emissive.set('#cba469');
    this.border.name='protected-ground-edge';this.border.visible=false;
    for(const [x,z,w,d] of [[-.5,-3.09,5.12,.045],[-.5,-5.28,5.12,.045],[-3.08,-4.18,.045,2.16],[2.08,-4.18,.045,2.16]]) {
      const mesh=this.mesh(this.box,this.borderMaterial,[w,.015,d]);mesh.position.set(x,.138,z);this.border.add(mesh);
    }
    this.warmLight.position.set(.35,1.35,-3.6);this.lightning.position.set(-3,9,-5);
    this.traveler.name='storm-traveler';this.traveler.visible=false;
    const coat=this.material('#9c7665'),skin=this.material('#d5b998'),dark=this.material('#4e5351'),pack=this.material('#736551');
    const torso=this.mesh(this.geometry(new THREE.CylinderGeometry(.18,.27,.49,6)),coat);torso.position.y=.43;
    const hood=this.mesh(this.geometry(new THREE.IcosahedronGeometry(.23,1)),coat);hood.position.set(0,.85,0);
    const face=this.mesh(this.geometry(new THREE.IcosahedronGeometry(.15,1)),skin,[1,1,.6]);face.position.set(0,.85,.16);
    const bag=this.mesh(this.box,pack,[.31,.35,.17]);bag.position.set(0,.5,-.23);
    this.traveler.add(torso,hood,face,bag);
    for(const x of [-.115,.115]){const boot=this.mesh(this.box,dark,[.16,.16,.24]);boot.position.set(x,.1,.02);this.legs.push(boot);this.traveler.add(boot);}
    this.root.add(this.flame,this.fireLight,this.warmLight,this.lightning,this.border,this.traveler);
  }
  private geometry<T extends THREE.BufferGeometry>(g:T):T{this.geometries.push(g);return g;}
  private material(color:string):THREE.MeshStandardMaterial{const m=new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true});this.materials.push(m);return m;}
  private mesh(g:THREE.BufferGeometry,m:THREE.Material,size:readonly[number,number,number]=[1,1,1]):THREE.Mesh{const mesh=new THREE.Mesh(g,m);mesh.scale.set(...size);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
  update(s:StormWorldState):void {
    const p=s.progress,warm=smooth(p.warm),safe=smooth(p.safe),finalPulse=pulse(p.rescue,.83,1);
    const shelterPulse=pulse(p.shelter,.66,1),safePulse=pulse(p.safe,.15,.95);
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
      let trace=0;
      if(roof) {
        const order=name==='roof-batten'?(node.position.x+2.3)/4.6: name==='front-crossbeam'?.85:.1;
        trace=pulse(p.shelter,.03+order*.18,.42+order*.18);
      } else if(!rest&&!floor) trace=pulse(p.shelter,.32,.72);
      else trace=pulse(p.shelter,.55,.92)*.6;
      material.emissiveIntensity=trace*.5+shelterPulse*.12+(s.shelterHighlighted?.045:0)+safePulse*.19+finalPulse*.16;
      if(rest||floor) {
        material.color.lerp(new THREE.Color(rest?'#d6a66c':'#a08b69'),warm*(rest?.85:.55));
        material.emissiveIntensity+=warm*(rest?.2:.12)+safe*.045;
      } else if(!roof) material.emissiveIntensity+=warm*.065+safe*.035;
    }
    const ignition=smooth((p.fire-.12)/.72);
    this.flame.visible=p.fire>0;
    const flicker=1+(s.safeState?.025:.06)*Math.sin(s.elapsed*5.1)+.025*Math.sin(s.elapsed*8.3);
    this.flame.scale.set(ignition,ignition*flicker,ignition);
    this.flame.rotation.y=Math.sin(s.elapsed*2)*.08;
    this.fireLight.intensity=ignition*(4+warm*1.2)*flicker;this.fireLight.distance=2.7+warm*.8;
    const spread=smooth((p.warm-.08)/.8);
    this.warmLight.position.x=-2+2.35*spread;
    this.warmLight.intensity=spread*(5.8+safe*.65+finalPulse*1.2)+pulse(p.warm,.2,1)*.6;
    this.border.visible=p.safe>0;
    this.borderMaterial.emissiveIntensity=.06*safe+safePulse*.45+finalPulse*.18;
    this.border.scale.setScalar(1); // No force field or expanding geometry.
    this.lightning.intensity=stormLightning(p.rain)*1.8;
    this.traveler.visible=s.travelerVisible;
    const pose=s.traveler,bob=pose.walking?Math.abs(Math.sin(s.elapsed*9))*.025:0;
    this.traveler.position.set(pose.x,pose.y+bob,pose.z);this.traveler.rotation.y=pose.heading;
    for(let i=0;i<this.legs.length;i++)this.legs[i].rotation.x=pose.walking?Math.sin(s.elapsed*9+i*Math.PI)*.3:0;
  }
  dispose():void {
    for(const {node,original} of this.surfaces)node.material=original;
    this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.root.removeFromParent();
  }
}
