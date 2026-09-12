export interface StageWorldState {
  keySpawned: boolean;
  hasKey: boolean;
  keyAcquisitionProgress: number;
  lightOn: boolean;
  plantWatered: boolean;
  bookSpawned: boolean;
  doorRevealed: boolean;
  doorOpen: boolean;
}
export type WorldReactionMap = Readonly<Record<string, Exclude<keyof StageWorldState, 'keyAcquisitionProgress' | 'hasKey'>>>;
export function createStageWorldState(): StageWorldState {
  return { hasKey: false, keyAcquisitionProgress: 0, keySpawned: false, lightOn: false, plantWatered: false, bookSpawned: false, doorRevealed: false, doorOpen: false };
}
/** Consumes completion events, never touches scene objects. Pending work survives feedback clearing. */
export class WorldReactionController {
  private pending = new Map<Exclude<keyof StageWorldState, 'keyAcquisitionProgress' | 'hasKey'>, number>();
  private state: StageWorldState;
  private mapping: WorldReactionMap;
  get isBusy(): boolean { return this.pending.size > 0 || (this.state.keySpawned && !this.state.hasKey); }
  constructor(state: StageWorldState, mapping: WorldReactionMap = {}) {
    this.state = state; this.mapping = mapping;
  }
  onQuestCompleted = (questId: string): void => {
    const flag = this.mapping[questId];
    if (flag && !this.state[flag] && !this.pending.has(flag)) this.pending.set(flag, 0.25);
  };
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (this.state.keySpawned && !this.state.hasKey) {
      this.state.keyAcquisitionProgress = Math.min(1, this.state.keyAcquisitionProgress + dt / 1.8);
      if (this.state.keyAcquisitionProgress >= 1 - 1e-9) { this.state.keyAcquisitionProgress = 1; this.state.hasKey = true; }
    }
    for (const [flag, remaining] of this.pending) {
      if (remaining <= dt + 1e-10) { this.state[flag] = true; this.pending.delete(flag); }
      else this.pending.set(flag, remaining - dt);
    }
  }
}

