import type { GridCoordinate } from '../grid/types.ts';
import type { PlayerResources } from './AssistanceState.ts';
export interface SupportObjectiveDefinition { id: string; label: string; tile: GridCoordinate; reward: number }
/** Optional exploration rewards; never part of main quest completion. */
export class SupportObjectives {
  readonly completedIds = new Set<string>();
  rewardVisual: { id: string; remaining: number } | null = null;
  readonly definitions: readonly SupportObjectiveDefinition[];
  private resources: PlayerResources;
  constructor(resources: PlayerResources, definitions: readonly SupportObjectiveDefinition[] = []) {
    if (new Set(definitions.map(d => d.id)).size !== definitions.length || definitions.some(d => !d.id || !d.label || !Number.isInteger(d.tile.row) || d.tile.row < 0 || !Number.isInteger(d.tile.column) || d.tile.column < 0 || !Number.isInteger(d.reward) || d.reward < 1)) throw new Error('Invalid support objectives');
    this.resources = resources; this.definitions = definitions;
  }
  nearby(tile: GridCoordinate): SupportObjectiveDefinition | undefined {
    return this.definitions.find(d => d.tile.row === tile.row && d.tile.column === tile.column && !this.completedIds.has(d.id));
  }
  inspect(tile: GridCoordinate, blocked: boolean): SupportObjectiveDefinition | undefined {
    if (blocked) return;
    const objective = this.nearby(tile); if (!objective) return;
    this.completedIds.add(objective.id); this.resources.wordShards += objective.reward;
    this.rewardVisual = { id: objective.id, remaining: 2.5 }; return objective;
  }
  update(dt: number): void {
    if (!this.rewardVisual || !Number.isFinite(dt) || dt <= 0) return;
    this.rewardVisual.remaining -= dt;
    if (this.rewardVisual.remaining <= 0) this.rewardVisual = null;
  }
}
