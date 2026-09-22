import type { GameState } from './types.ts';

export const TOWN_REACTION_SECONDS = { bread: 1.25, coin: 1.6, shop: 1.2, letter: 2.4, clock: 2 } as const;
export type TownReaction = keyof typeof TOWN_REACTION_SECONDS;
export interface TownWorldState {
  breadReady: boolean;
  coinPlaced: boolean;
  shopOpen: boolean;
  letterDelivered: boolean;
  clockActive: boolean;
  carryRequested: boolean;
  carryCompleted: boolean;
  started: Record<TownReaction, boolean>;
  progress: Record<TownReaction, number>;
  clockElapsed: number;
}
export function createTownWorldState(): TownWorldState {
  return { breadReady: false, coinPlaced: false, shopOpen: false, letterDelivered: false, clockActive: false,
    carryRequested: false, carryCompleted: false,
    started: { bread: false, coin: false, shop: false, letter: false, clock: false },
    progress: { bread: 0, coin: 0, shop: 0, letter: 0, clock: 0 }, clockElapsed: 0 };
}
/** Stage-local, idempotent event handling. Rendering only reads this state. */
export class TownReactionController {
  readonly state: TownWorldState;
  constructor(state: TownWorldState) { this.state = state; }
  onQuestCompleted = (id: string): void => {
    if (id === 'town-carry') { this.state.carryRequested = true; return; }
    const key = id.slice(5) as TownReaction;
    if (id.startsWith('town-') && Object.hasOwn(TOWN_REACTION_SECONDS, key)) this.state.started[key] = true;
  };
  get isBusy(): boolean {
    return (Object.keys(TOWN_REACTION_SECONDS) as TownReaction[]).some(key => this.state.started[key] && this.state.progress[key] < 1);
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const s = this.state;
    if (s.started.clock) {
      const activeTime = Math.max(0, dt - (1 - s.progress.clock) * TOWN_REACTION_SECONDS.clock);
      s.clockElapsed = (s.clockElapsed + activeTime) % 720;
    }
    for (const key of Object.keys(TOWN_REACTION_SECONDS) as TownReaction[]) {
      if (s.started[key]) s.progress[key] = Math.min(1, s.progress[key] + dt / TOWN_REACTION_SECONDS[key]);
      if (s.progress[key] > 1 - 1e-9) s.progress[key] = 1;
    }
    s.breadReady = s.progress.bread === 1; s.coinPlaced = s.progress.coin === 1;
    s.shopOpen = s.progress.shop === 1; s.letterDelivered = s.progress.letter === 1;
    s.clockActive = s.progress.clock === 1;
  }
}
export function townParcelAvailable(game: GameState): boolean {
  return game.words.completedWords.includes('SHOP') && game.words.completedWords.includes('LETTER');
}
