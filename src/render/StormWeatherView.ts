import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import { stormSmooth, type StormWorldState } from '../simulation/StormWorldState.ts';

/** Side bands keep every drop outside the grid and the covered shelter footprint. */
export class StormWeatherView {
  private geometry = new BufferGeometry();
  private material = new LineBasicMaterial({ color: '#c2d6df', transparent: true, opacity: .32, depthWrite: false });
  readonly root = new LineSegments(this.geometry, this.material);
  private elapsed = 0;
  constructor() {
    this.root.name = 'baseline-drizzle';
    this.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(192 * 6), 3));
    this.root.frustumCulled = false;this.update(0);
  }
  update(dt: number, state?:StormWorldState): void {
    if(Number.isFinite(dt)&&dt>0)this.elapsed=(this.elapsed+dt)%100;
    const strength=stormSmooth((state?.progress.rain??0)/.75);
    const count=64+Math.round(strength*128);
    this.geometry.setDrawRange(0,count*2);this.material.opacity=.32+strength*.13;
    const attribute=this.geometry.getAttribute('position');
    for(let i=0;i<count;i++) {
      const x=(i%2?-1:1)*(4.15+((i*37)%19)/10);
      const z=-4.8+((i*43)%101)/10;
      const y=3.4-((i*.379+this.elapsed*(1.8+strength*1.7))%3.3);
      attribute.setXYZ(i*2,x,y,z);
      attribute.setXYZ(i*2+1,x+.035+strength*.16,y-.19-strength*.19,z+.025+strength*.05);
    }
    attribute.needsUpdate=true;
  }
  dispose():void {this.geometry.dispose();this.material.dispose();}
}
