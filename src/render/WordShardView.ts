import * as THREE from 'three';
import { gridToWorld, type StageDefinition } from '../stages/types.ts';
import type { SupportObjectives } from '../simulation/SupportObjectives.ts';
/** Reward-only crystal: never a walk-over collectible. */
export class WordShardView {
  readonly root = new THREE.Group();
  private geometry = new THREE.OctahedronGeometry(.22);
  private material = new THREE.MeshStandardMaterial({ color: '#ebd6ff', emissive: '#c594ed', emissiveIntensity: 1.1, roughness: .35, flatShading: true });
  private sparkleMaterial = new THREE.MeshBasicMaterial({ color: '#f6e4ff', transparent: true, opacity: .8, depthWrite: false });
  private entries: { id: string; group: THREE.Group; crystal: THREE.Mesh; sparks: THREE.Mesh[] }[] = [];
  constructor(stage: StageDefinition) {
    for (const objective of stage.supportObjectives ?? []) {
      const position = gridToWorld(objective.tile.column, objective.tile.row, stage.grid);
      const group = new THREE.Group(); group.position.set(position.x, 0, position.z); group.visible = false;
      const crystal = new THREE.Mesh(this.geometry, this.material); crystal.scale.set(.8,1.65,.8); group.add(crystal);
      const sparks = Array.from({length: 5}, () => { const spark = new THREE.Mesh(this.geometry, this.sparkleMaterial); spark.scale.setScalar(.13); group.add(spark); return spark; });
      this.root.add(group); this.entries.push({ id: objective.id, group, crystal, sparks });
    }
  }
  update(_dt: number, reward: SupportObjectives['rewardVisual']): void {
    for (const {id,group,crystal,sparks} of this.entries) {
      group.visible = reward?.id === id;
      if (!group.visible || !reward) continue;
      const elapsed = 2.5 - reward.remaining;
      const scale = Math.min(1, elapsed * 5) * Math.min(1, reward.remaining * 3);
      group.scale.setScalar(Math.max(.001,scale));
      crystal.position.y = 1 + elapsed * .18 + Math.sin(elapsed * 4) * .08;
      crystal.rotation.y = elapsed * 1.2;
      sparks.forEach((spark,i) => {
        const angle = i * Math.PI * 2 / sparks.length + elapsed * .8;
        spark.position.set(Math.cos(angle)*.36, crystal.position.y + Math.sin(angle*2)*.22, Math.sin(angle)*.36);
        spark.scale.setScalar(.08 + .09 * Math.sin(elapsed*5+i)**2);
      });
    }
  }
  dispose(): void { this.geometry.dispose(); this.material.dispose(); this.sparkleMaterial.dispose(); this.root.clear(); }
}
