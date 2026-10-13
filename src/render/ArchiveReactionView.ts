import { Group, Object3D, PointLight, MeshStandardMaterial, type Mesh } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import { archiveSmooth as smooth, type ArchiveWorldState } from '../simulation/ArchiveWorldState.ts';

/** Absolute transforms make every after-state independent and resettable. Shared assets own resources. */
export class ArchiveReactionView {
  readonly root=new Group();
  private lights:PointLight[]=[];
  private accents:{mesh:Mesh;original:Mesh['material'];material:MeshStandardMaterial;key:keyof ArchiveWorldState['progress']}[]=[];
  private hinge=new Group();
  private pages:Group[]=[];
  private bookParts:{node:Object3D;parent:Object3D;position:Object3D['position']}[]=[];
  private doorLeaves:Object3D[]=[];
  private doorEdges:Object3D[]=[];
  private doorway:Mesh;
  private clasp:Object3D;
  private block:Object3D;
  private upper:Object3D;
  private band:Object3D;
  private panel:Object3D;
  private joint:Object3D;
  private cover:Mesh;
  private lower:Group;
  private secret:Group;
  private support:Mesh;
  private homes:Map<Object3D,{position:Object3D['position'];scale:Object3D['scale']}> = new Map();
  private added:Object3D[]=[];
  constructor(environment:Object3D,assets:PrimitiveAssets) {
    this.root.name='archive-world-reactions';
    const anchor=(name:string)=>{const n=environment.getObjectByName(name);if(!n)throw new Error(`Archive anchor missing: ${name}`);return n;};
    this.block=anchor('movable-stone-block');this.upper=anchor('upper-object');this.band=anchor('upper-object-band');
    this.panel=anchor('closed-secret-panel');this.joint=anchor('panel-masonry-joint');
    for(const n of [this.block,this.upper,this.band,this.panel,this.joint])this.homes.set(n,{position:n.position.clone(),scale:n.scale.clone()});
    const part=(parent:Object3D,name:string,x:number,y:number,z:number,w:number,h:number,d:number,surface:keyof PrimitiveAssets['material'])=>{
      const m=assets.mesh('townSlab',surface);m.name=name;m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
    const positional=anchor('above-under-structure');
    this.cover=part(positional,'lower-sliding-stone-panel',0,.78,.84,1.02,.84,.13,'archiveStone');
    this.lower=new Group();this.lower.name='under-archive-object';positional.add(this.lower);
    part(this.lower,'under-stone-tablet',0,.49,.62,.62,.24,.42,'archivePaper');
    part(this.lower,'tablet-carved-line',0,.616,.62,.35,.015,.025,'archiveStone');
    this.support=part(positional,'upper-rising-support',0,1.68,-.08,.13,.05,.13,'archiveStone');
    this.secret=new Group();this.secret.name='secret-closed-volume';anchor('sealed-secret-compartment').add(this.secret);
    part(this.secret,'secret-recess',0,1.06,.22,.73,1.38,.14,'archiveRecess');
    part(this.secret,'secret-book-rest',0,.64,.49,.7,.1,.58,'archiveLimestone');
    part(this.secret,'secret-book-pages',0,.79,.49,.53,.15,.4,'archivePaper');
    for(const y of [.69,.89])part(this.secret,'secret-book-cover',0,y,.49,.61,.05,.47,'archiveBook');
    part(this.secret,'secret-book-clasp',.28,.82,.49,.055,.19,.08,'archiveGold');
    this.added.push(this.cover,this.lower,this.support,this.secret);
    const accent=(node:Object3D,key:keyof ArchiveWorldState['progress'])=>{
      node.traverse(n=>{const mesh=n as Mesh;if(!mesh.isMesh||!(mesh.material instanceof MeshStandardMaterial))return;
        const original=mesh.material,material=original.clone();material.emissive.set('#e9aa51');mesh.material=material;this.accents.push({mesh,original,material,key});});
    };
    accent(anchor('stone-socket'),'stone');accent(this.block,'stone');
    accent(this.upper,'above');accent(this.band,'above');accent(this.support,'above');
    accent(this.cover,'under');accent(this.lower,'under');accent(this.joint,'secret');accent(this.secret,'secret');
    const light=(parent:Object3D,x:number,y:number,z:number)=>{const l=new PointLight('#efbd77',0,2.8,2);l.position.set(x,y,z);parent.add(l);this.lights.push(l);this.added.push(l);};
    light(anchor('stone-mechanism'),-.74,1.1,.28);
    light(positional,0,2.5,.45);light(positional,0,.85,1.05);
    light(anchor('sealed-secret-compartment'),0,1.2,.8);
    const book=anchor('closed-ancient-book');
    this.hinge.name='book-cover-hinge';this.hinge.position.set(-.63,.25,0);book.add(this.hinge);this.added.push(this.hinge);
    for(const n of [...book.children].filter(n=>n.name==='book-upper-cover'||n.name==='cover-gold-band')){
      this.bookParts.push({node:n,parent:book,position:n.position.clone()});this.hinge.add(n);n.position.sub(this.hinge.position);
    }
    this.clasp=anchor('closed-book-clasp');
    for(let i=0;i<3;i++){const pivot=new Group();pivot.name='turning-archive-page';pivot.position.set(-.59,.22+i*.008,0);book.add(pivot);this.pages.push(pivot);this.added.push(pivot);
      part(pivot,'unfolding-page',.58,0,0,1.16,.012,.74,'archivePaper');}
    accent(book,'read');light(anchor('ancient-book-altar'),0,2.4,.4);
    const door=anchor('final-stone-door');this.doorLeaves=door.children.filter(n=>n.name==='closed-door-leaf');this.doorEdges=door.children.filter(n=>n.name==='door-carved-edge');
    for(const n of [...this.doorLeaves,...this.doorEdges])this.homes.set(n,{position:n.position.clone(),scale:n.scale.clone()});
    for(const n of door.children.filter(n=>['door-jamb','stone-lintel','door-carved-edge'].includes(n.name)))accent(n,'exit');
    this.doorway=part(door,'warm-open-doorway',0,1.4,0,1.98,2.6,.025,'archiveGold');this.added.push(this.doorway);accent(this.doorway,'exit');
    light(door,0,1.3,.75);
    this.lower.visible=false;this.secret.visible=false;
  }
  update(s:ArchiveWorldState):void {
    const stone=s.progress.stone;
    const lift=smooth((stone-.08)/.22),travel=smooth((stone-.3)/.38),settle=smooth((stone-.68)/.2);
    this.block.position.set(-.74,.36*lift-.20*settle,1.27-.99*travel);
    this.block.position.y+=.025*Math.sin(Math.PI*smooth((stone-.88)/.12));
    const height=.95*smooth((s.progress.above-.08)/.70);
    this.upper.position.y=1.91+height;this.band.position.y=1.91+height;
    this.support.visible=height>0;this.support.scale.y=Math.max(.001,height);this.support.position.y=1.66+height/2;
    const opening=smooth((s.progress.under-.08)/.68);
    this.cover.position.x=1.18*opening;this.lower.visible=opening>.38;
    const reveal=smooth((s.progress.secret-.08)/.67);
    // Pull the sealed panel forward first, then lower it in front of the recess contents.
    const pull=.65*smooth(s.progress.secret/.08);
    this.panel.position.set(0,1.06-1.58*reveal,.02+pull);
    this.joint.position.set(0,1.03-1.58*reveal,.124+pull);
    this.secret.visible=s.progress.secret>=.08;
    const read=s.progress.read;
    this.hinge.rotation.z=Math.PI*.93*smooth((read-.12)/.48);
    this.clasp.visible=read<.12;
    this.pages.forEach((page,i)=>{page.visible=read>.25;page.rotation.z=Math.PI*.91*smooth((read-.28-i*.10)/.35);});
    const door=smooth((s.progress.exit-.12)/.68);
    for(const n of [...this.doorLeaves,...this.doorEdges]){const home=this.homes.get(n)!;n.position.x=home.position.x+Math.sign(home.position.x)*1.03*door;}
    this.doorway.visible=door>0;
    const keys=['stone','above','under','secret','read','exit'] as const;
    const emphasis=(key:typeof keys[number])=>{const p=s.progress[key];return p>0&&p<1?smooth(p/.1)*(1-smooth((p-.78)/.22))*(1+.3*Math.exp(-Math.pow((p-.84)/.055,2))):0;};
    this.lights.forEach((l,i)=>{const key=keys[i];l.intensity=4*emphasis(key)+(s.progress[key]===1&&['secret','read','exit'].includes(key)?.18:0);});
    this.lights[1].position.y=2.3+height;
    for(const a of this.accents){const p=s.progress[a.key];const settled=p===1&&['secret','read','exit'].includes(a.key)?.07:0;
      a.material.emissiveIntensity=.5*emphasis(a.key)+settled;
      if(a.mesh===this.doorway)a.material.emissiveIntensity=.55*door;
    }
  }
  dispose():void {
    for(const a of this.accents){a.mesh.material=a.original;a.material.dispose();}
    for(const item of this.bookParts){item.parent.add(item.node);item.node.position.copy(item.position);}
    this.clasp.visible=true;
    for(const [n,home] of this.homes){n.position.copy(home.position);n.scale.copy(home.scale);}
    for(const n of this.added)n.removeFromParent();this.root.removeFromParent();
  }
}

