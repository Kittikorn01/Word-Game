import * as THREE from 'three';
import { smooth, type WorkshopWorldState } from '../simulation/WorkshopWorldState.ts';

/** Projection only. Geometry is bounded; all phase, motion and completion state lives in simulation. */
export class WorkshopReactionView {
  readonly root=new THREE.Group();
  private geometries: THREE.BufferGeometry[]=[];
  private materials: THREE.MeshStandardMaterial[]=[];
  private box=this.geometry(new THREE.BoxGeometry(1,1,1));
  private metal=this.material('#b99457');
  private dark=this.material('#535b53');
  private wood=this.material('#ac774b');
  private amber=this.material('#efb655');
  private gear=new THREE.Group();
  private gearMetal=this.material('#c5a15d');
  private gearLight=new THREE.PointLight('#ffc477',0,2.1,2);
  private energyLight=new THREE.PointLight('#ffc477',0,1.6,2);
  private sweep:THREE.Mesh;
  private repairTool=new THREE.Group();
  private capMaterial:THREE.MeshStandardMaterial;
  private housingMaterial:THREE.MeshStandardMaterial;
  private crates: THREE.Group[]=[];
  private seams: {node:THREE.Object3D;x:number}[]=[];
  private rollers: THREE.Object3D[]=[];
  private cap:THREE.Object3D;
  private capHome:THREE.Vector3;
  private handle:THREE.Object3D;
  private output:THREE.Object3D;
  private outputHome:THREE.Vector3;
  private outputMaterial:THREE.MeshStandardMaterial;
  private powerLight:THREE.MeshStandardMaterial;
  private grip:THREE.MeshStandardMaterial;
  private machineLight:THREE.MeshStandardMaterial;
  private readyLight:THREE.MeshStandardMaterial;
  private cable:THREE.Mesh;
  private piston:THREE.Mesh;
  constructor(environment:THREE.Object3D) {
    this.root.name='workshop-world-reactions';
    const object=(name:string) => {
      const found=environment.getObjectByName(name);
      if(!found)throw new Error(`Workshop reaction anchor missing: ${name}`);
      return found;
    };
    this.cap=object('machine-cap'); this.capHome=this.cap.position.clone();
    this.capMaterial=this.cloneMaterial(this.cap as THREE.Mesh);
    // Brief scripted maintenance gesture: two readable hammer taps, no new interaction.
    this.repairTool.name='workshop-repair-hammer';
    // Toward the fixed camera, clear of the housing and cap silhouette.
    this.repairTool.position.set(-3.35,2.34,-2.65);
    const shaft=this.mesh(this.box,this.wood,[.09,.55,.09]);shaft.position.y=.28;
    const head=this.mesh(this.box,this.metal,[.44,.2,.22]);head.position.y=.6;
    this.repairTool.add(shaft,head);this.root.add(this.repairTool);
    this.repairTool.visible=false;
    this.housingMaterial=this.cloneMaterial(object('gear-socket-rim') as THREE.Mesh);
    this.gearLight.name='gear-local-warm-light';this.gearLight.position.set(-3.7,1.35,-2.6);
    this.energyLight.name='power-travel-light';this.root.add(this.gearLight,this.energyLight);
    const sweepMaterial=this.material('#e3b76a');sweepMaterial.emissive.set('#e3a953');
    this.sweep=this.mesh(this.geometry(new THREE.TorusGeometry(.55,.035,5,24,Math.PI*.65)),sweepMaterial);
    this.sweep.name='gear-housing-light-sweep';this.sweep.position.set(-3.7,1.1,-2.88);this.root.add(this.sweep);
    this.handle=object('resting-lever-handle');
    this.output=object('output-receiving-platform');this.outputHome=this.output.position.clone();
    this.outputMaterial=this.cloneMaterial(object('receiving-tray') as THREE.Mesh);
    this.powerLight=this.cloneMaterial(object('unlit-indicator') as THREE.Mesh);
    this.grip=this.cloneMaterial(object('lever-grip') as THREE.Mesh);
    // Toothed silhouette around a hollow hub; face remains aimed at the fixed camera.
    this.gear.name='installed-workshop-gear';this.root.add(this.gear);
    const ring=this.geometry(new THREE.TorusGeometry(.29,.105,6,20));
    this.gear.add(this.mesh(ring,this.gearMetal));
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6,tooth=this.mesh(this.box,this.gearMetal,[.17,.18,.17]);
      tooth.name='gear-tooth';tooth.position.set(Math.sin(a)*.4,Math.cos(a)*.4,0);tooth.rotation.z=-a;this.gear.add(tooth);
    }
    for(let i=0;i<3;i++) {
      const spoke=this.mesh(this.box,this.dark,[.075,.57,.12]);spoke.rotation.z=i*Math.PI/3;this.gear.add(spoke);
    }
    const light=(name:string,x:number,y:number,z:number) => {
      const material=this.material('#686858');material.emissive.set('#efad43');
      const node=this.mesh(this.box,material,[.23,.15,.06]);node.name=name;node.position.set(x,y,z);this.root.add(node);return material;
    };
    this.machineLight=light('workshop-machine-indicator',-2.82,1.62,-3.16);
    this.readyLight=light('workshop-ready-indicator',-4.65,.82,1.57);
    this.cable=this.mesh(this.box,this.amber,[.2,.16,.34]);this.cable.name='workshop-energy-pulse';this.root.add(this.cable);
    this.piston=this.mesh(this.box,this.metal,[.23,.24,.35]);this.piston.name='workshop-drive-link';this.root.add(this.piston);
    environment.traverse(node=>{
      if(node.name==='belt-seam')this.seams.push({node,x:node.position.x});
      if(node.name==='end-roller') {
        this.rollers.push(node);
        // An asymmetric end marker makes rotation visible on otherwise round rollers.
        const marker=this.mesh(this.box,this.metal,[.65,.04,.13]);marker.position.y=.51;node.add(marker);
      }
      if(node.name==='waiting-crate'||node.name==='crate-band')node.visible=false;
    });
    for(let i=0;i<2;i++) {
      const crate=new THREE.Group();crate.name=`workshop-production-crate-${i+1}`;
      crate.add(this.mesh(this.box,this.wood,[.72,.7,.68]));
      for(const x of [-.25,.25]) { const band=this.mesh(this.box,this.metal,[.065,.73,.71]);band.position.x=x;crate.add(band); }
      this.crates.push(crate);this.root.add(crate);
    }
    this.gear.visible=false;
  }
  private geometry<T extends THREE.BufferGeometry>(g:T):T {this.geometries.push(g);return g;}
  private material(color:string):THREE.MeshStandardMaterial {
    const m=new THREE.MeshStandardMaterial({color,roughness:.75,metalness:.15});this.materials.push(m);return m;
  }
  private cloneMaterial(node:THREE.Mesh):THREE.MeshStandardMaterial {
    const m=(node.material as THREE.MeshStandardMaterial).clone();node.material=m;this.materials.push(m);return m;
  }
  private mesh(g:THREE.BufferGeometry,m:THREE.Material,size:[number,number,number]=[1,1,1]):THREE.Mesh {
    const node=new THREE.Mesh(g,m);node.scale.set(...size);node.castShadow=node.receiveShadow=true;return node;
  }
  update(s:WorkshopWorldState):void {
    const p=s.progress,install=smooth((p.gear-.12)/.48);
    this.gear.visible=s.requested.gear;
    this.gear.position.set(-3.7-(1-install)*.55,1.1+Math.sin(install*Math.PI)*.4,-2.91+(1-install)*.12);
    this.gear.scale.setScalar(smooth(p.gear/.2)*(1+.07*Math.sin(p.gear*Math.PI)));
    const lock=smooth((p.gear-.6)/.4), pulse=Math.sin(lock*Math.PI);
    this.gear.rotation.z=(1-install)*-.8+lock*Math.PI*2+s.gearAngle+smooth((p.power-.82)/.18)*1.2;
    this.gearMetal.emissive.set('#dca14d');this.gearMetal.emissiveIntensity=s.requested.gear ? .12+.3*Math.sin(p.gear*Math.PI)+pulse*.45:0;
    this.housingMaterial.emissive.set('#e9ae57');this.housingMaterial.emissiveIntensity=pulse*.6;
    this.gearLight.intensity=s.requested.gear ? .15+1.8*pulse : 0;
    this.sweep.visible=p.gear>.6&&p.gear<1;this.sweep.rotation.z=-lock*Math.PI*2;
    (this.sweep.material as THREE.MeshStandardMaterial).emissiveIntensity=pulse*.8;
    const repair=smooth((p.repair-.38)/.44), settle=p.repair===1?0:Math.sin(smooth((p.repair-.82)/.18)*Math.PI);
    const tapping=Math.max(0,Math.min(1,(p.repair-.12)/.56));
    this.repairTool.visible=p.repair>0&&p.repair<.9;
    this.repairTool.scale.setScalar(smooth(p.repair/.1)*(1-smooth((p.repair-.78)/.12)));
    this.repairTool.rotation.z=-.65-1.3*Math.pow(Math.sin(tapping*Math.PI*2),2);
    this.cap.position.copy(this.capHome);this.cap.position.y+=(1-repair)*.32+settle*.045;this.cap.position.x+=(1-repair)*.22;
    this.cap.rotation.z=(1-repair)*.2-settle*.025;
    this.capMaterial.emissive.set('#f1bd74');this.capMaterial.emissiveIntensity=Math.sin(p.repair*Math.PI)*.5+settle*.3;
    const power=smooth(p.power/.25),energized=smooth((p.power-.74)/.1);
    this.powerLight.color.set(power>0?'#dca149':'#687166');this.powerLight.emissive.set('#efad43');this.powerLight.emissiveIntensity=power*(.8+.7*Math.sin(smooth(p.power/.3)*Math.PI))*(1-.65*smooth(p.stop));
    this.machineLight.color.set(s.machineStopped?'#afbc88':energized>0?'#e8b25f':'#686858');
    this.machineLight.emissiveIntensity=energized*(.35+s.beltSpeed*.45)*(1-.4*smooth(p.stop));
    const cableT=smooth((p.power-.18)/.55);
    this.cable.visible=p.power>.18&&p.power<.78;
    if(cableT<.75)this.cable.position.set(-5.23,.2,-1.4-cableT/.75*1.7);
    else this.cable.position.set(-5.23+(cableT-.75)/.25*.66,.2,-3.1);
    this.energyLight.position.copy(this.cable.position);this.energyLight.position.y+=.16;
    this.energyLight.intensity=this.cable.visible ? 1.2 : 0;
    this.amber.emissive.set('#ffbe65');this.amber.emissiveIntensity=.9;
    this.handle.rotation.x=-.55+1.15*smooth(p.lever)-1.15*smooth(p.stop);
    this.grip.emissive.set('#ffd17a');this.grip.emissiveIntensity=energized*(.1+.55*Math.sin(p.lever*Math.PI));
    this.readyLight.emissiveIntensity=smooth(p.lever)*(.45-.25*smooth(p.stop));
    this.readyLight.color.set(s.machineStopped?'#afbc88':s.leverActivated?'#e5ba63':'#686858');
    this.piston.position.set(-2.4,.98+Math.sin(s.gearAngle*2)*.07*s.gearSpeed,-3.82);
    for(const {node,x} of this.seams)node.position.x=((x+2.7+s.beltTravel)%5.4)-2.7;
    for(const roller of this.rollers)roller.rotation.y=s.beltTravel/.175;
    let receivingBeat=0;
    for(let i=0;i<2;i++) {
      // Two safe scripted journeys; staggered departure and separate receiving slots.
      const travel=smooth((s.productionElapsed-i*1.1)/5.4);
      const arrival=smooth((s.productionElapsed-(5.4+i*1.1))/.5);
      const beat=Math.sin(arrival*Math.PI);receivingBeat=Math.max(receivingBeat,beat);
      const startX=.1-i*1.2,endX=5.17-i*.85;
      this.crates[i].position.set(THREE.MathUtils.lerp(startX,endX,travel),1.24-.17*smooth((travel-.85)/.15)+beat*.065,-4.05);
    }
    this.outputMaterial.emissive.set('#e9b96f');
    const confirmation=s.finalePhase==='pause'?Math.sin(Math.min(1,s.finaleElapsed/.5)*Math.PI):0;
    this.outputMaterial.emissiveIntensity=s.machineStopped ? .08+confirmation*.35:0;
    this.output.position.copy(this.outputHome);this.output.position.y-=receivingBeat*.035;
  }
  dispose():void {
    this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.root.removeFromParent();
  }
}
