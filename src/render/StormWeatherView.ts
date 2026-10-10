import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import { STORM_ROOF, STORM_WINDBREAK, stormProtection, stormRoofHeight, stormWindbreakX } from './StormProtection.ts';
import { stormSmooth, type StormWorldState } from '../simulation/StormWorldState.ts';

/** Side storm, roof-clipped rainfall, eave runoff and canvas-controlled side intrusion. */
export class StormWeatherView {
  private geometry = new BufferGeometry();
  private material = new LineBasicMaterial({ color: '#c2d6df', transparent: true, opacity: .32, depthWrite: false });
  readonly root = new LineSegments(this.geometry, this.material);
  private elapsed = 0;
  constructor() {
    this.root.name = 'baseline-drizzle';
    this.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(336 * 6), 3));
    this.root.frustumCulled = false;this.update(0);
  }
  update(dt: number, state?:StormWorldState): void {
    if(Number.isFinite(dt)&&dt>0)this.elapsed=(this.elapsed+dt)%100;
    const strength=stormSmooth((state?.progress.rain??0)/.75);
    const count=64+Math.round(strength*128);
    this.geometry.setDrawRange(0,(count+144)*2);this.material.opacity=.32+strength*.13;
    const attribute=this.geometry.getAttribute('position');
    for(let i=0;i<count;i++) {
      const x=(i%2?-1:1)*(4.15+((i*37)%19)/10);
      const z=-4.8+((i*43)%101)/10;
      const y=3.4-((i*.379+this.elapsed*(1.8+strength*1.7))%3.3);
      attribute.setXYZ(i*2,x,y,z);
      attribute.setXYZ(i*2+1,x+.035+strength*.16,y-.19-strength*.19,z+.025+strength*.05);
    }
    const {roofEdge,protection}=stormProtection(state?.progress.shelter??0,state?.progress.safe??0);
    // Identical coverage boundary to the rolling canvas. Uncovered rain reaches the floor.
    for(let i=0;i<48;i++) {
      const x=-3.15+((i*17)%47)/47*5.3,z=-5.35+((i*13)%43)/43*1.5;
      const covered=x<=roofEdge,roofY=stormRoofHeight(z);
      const bottom=covered?roofY+.015:.15;
      const y=bottom+(1-((i*.137+this.elapsed*2)%1))*(3.7-bottom);
      const j=(count+i)*2;
      attribute.setXYZ(j,x,y,z);attribute.setXYZ(j+1,x,Math.max(bottom,y-.30),z);
    }
    // Side eaves overhang the floor: runoff must never look like indoor rainfall.
    for(let i=0;i<24;i++) {
      const right=i%2===1,x=right?2.42:-3.42;
      const z=STORM_ROOF.z-.78+Math.floor(i/2)/11*1.56;
      const y=stormRoofHeight(z)-((i*.197+this.elapsed*2.8)%1.9);
      const j=(count+48+i)*2,length=(!right||roofEdge>=2.34)?.18:0;
      attribute.setXYZ(j,x,y,z);attribute.setXYZ(j+1,x,y-length,z);
    }
    // Wind-driven rain stops outside the left posts once the canvas is secured.
    for(let i=0;i<24;i++) {
      const f=(i*.173+this.elapsed*1.8)%1,z=STORM_WINDBREAK.z+.08+(i%8)*.18;
      const wallX=stormWindbreakX(z),reach=.85*(1-protection);
      const x=wallX-.7+f*(.7+reach),y=.95-f*.35,j=(count+72+i)*2;
      const endX=Math.min(wallX+reach,x+.28);
      attribute.setXYZ(j,x,y,z);attribute.setXYZ(j+1,endX,y-(endX-x)*.55,z);
    }
    // Small impact fans on the roof and wet-floor ripples disappear as coverage reaches them.
    for(let i=0;i<24;i++) {
      const x=-3.12+i/23*5.25,z=-5.18+(i%4)*.37;
      const phase=(i*.271+this.elapsed*2.6)%1,covered=x<=roofEdge;
      const radius=(phase<.45?Math.sin(phase/.45*Math.PI):0)*.11;
      const j=(count+96+i)*2,roofY=stormRoofHeight(z)+.025;
      const roofRadius=covered?radius:0;
      attribute.setXYZ(j,x-roofRadius,roofY,z);
      attribute.setXYZ(j+1,x+roofRadius,roofY+roofRadius*.7,z);
      const k=(count+120+i)*2,floorRadius=covered?0:radius;
      attribute.setXYZ(k,x-floorRadius,.145,z);attribute.setXYZ(k+1,x+floorRadius,.145,z+.04);
      if(covered) attribute.setXYZ(k+1,x,.145,z);
    }
    attribute.needsUpdate=true;
  }
  dispose():void {this.geometry.dispose();this.material.dispose();}
}
