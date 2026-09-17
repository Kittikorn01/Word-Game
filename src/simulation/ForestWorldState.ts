import type { WordProgress } from './WordProgress.ts';

export const FOREST_REACTION_SECONDS = { tree: 2, wood: .9, rope: .9, river: 2.5, bridge: 4.8, climb: 2.8 } as const;
export type ForestReaction = keyof typeof FOREST_REACTION_SECONDS;
export interface ForestWorldState {
  treeReacted: boolean;
  hasWood: boolean;
  hasRope: boolean;
  riverRecognized: boolean;
  bridgeStarted: boolean;
  climbStarted: boolean;
  conditions: { bridgeBuilt: boolean; climbRouteOpen: boolean };
  progress: Record<ForestReaction, number>;
  preparation: number;
}
export function createForestWorldState(words: WordProgress): ForestWorldState {
  const conditions = { bridgeBuilt: false, climbRouteOpen: false };
  words.worldConditions = conditions;
  return { treeReacted: false, hasWood: false, hasRope: false, riverRecognized: false,
    bridgeStarted: false, climbStarted: false, conditions,
    progress: { tree: 0, wood: 0, rope: 0, river: 0, bridge: 0, climb: 0 }, preparation: 0 };
}
/** Fixed-step timing owns both traversability and visual progress. Views never unlock paths. */
export class ForestReactionController {
  readonly state: ForestWorldState;
  constructor(state: ForestWorldState) { this.state = state; }
  onQuestCompleted = (id: string): void => {
    const s = this.state;
    switch (id) {
      case 'forest-tree': s.treeReacted = true; break;
      case 'forest-wood': s.hasWood = true; break;
      case 'forest-rope': s.hasRope = true; break;
      case 'forest-river': s.riverRecognized = true; break;
      case 'forest-bridge': if (s.hasWood && s.hasRope) s.bridgeStarted = true; break;
      case 'forest-climb': if (s.conditions.bridgeBuilt) s.climbStarted = true; break;
    }
  };
  private active(): Record<ForestReaction, boolean> {
    const s = this.state;
    return { tree: s.treeReacted, wood: s.hasWood, rope: s.hasRope, river: s.riverRecognized, bridge: s.bridgeStarted, climb: s.climbStarted };
  }
  get isBusy(): boolean { return Object.entries(this.active()).some(([key, active]) => active && this.state.progress[key as ForestReaction] < 1); }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const s = this.state;
    for (const [key, active] of Object.entries(this.active())) {
      const reaction = key as ForestReaction;
      if (active) s.progress[reaction] = Math.min(1, s.progress[reaction] + dt / FOREST_REACTION_SECONDS[reaction]);
      if (s.progress[reaction] > 1 - 1e-9) s.progress[reaction] = 1;
    }
    if (s.hasWood && s.hasRope) s.preparation = Math.min(1, s.preparation + dt / 1.6);
    s.conditions.bridgeBuilt = s.progress.bridge === 1;
    s.conditions.climbRouteOpen = s.progress.climb === 1;
  }
}
