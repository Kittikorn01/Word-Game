import type { GameState } from './types.ts';
import { gridToWorld, type StageDefinition } from '../stages/types.ts';

export interface TownPoint { x: number; y: number; z: number }
export interface TownEndingState {
  phase: 'idle' | 'lead' | 'pickupWalk' | 'pickup' | 'deliveryWalk' | 'placing' | 'arrival' | 'finished';
  pose: TownPoint | null;
  heading: number;
  waypoints: TownPoint[];
  index: number;
  elapsed: number;
  parcelAttached: boolean;
  placeProgress: number;
}
export const TOWN_CARRY_SPEED = 3.6;
export function townDeliveryPoints(stage: StageDefinition) {
  const shop = stage.townBlockout!.zones.find(z => z.id === 'shop')!;
  const delivery = stage.townBlockout!.zones.find(z => z.id === 'delivery')!;
  return {
    pickup: { x: shop.x - .3, y: 0, z: shop.forecourt.z + .3 },
    destination: { x: delivery.x - .8, y: 0, z: delivery.z },
    parcelDestination: { x: delivery.mass.x, y: .79, z: delivery.mass.z }
  };
}
export function createTownEndingState(): TownEndingState {
  return { phase: 'idle', pose: null, heading: 0, waypoints: [], index: 0, elapsed: 0, parcelAttached: false, placeProgress: 0 };
}
/** Same presentation-pose boundary as the forest ending, without changing grid movement.
 * Wait for all words, including CLOCK, so an early CARRY never strands unfinished quests. */
export class TownEndingController {
  readonly state = createTownEndingState();
  private stage: StageDefinition;
  constructor(stage: StageDefinition) { this.stage = stage; }
  get inputLocked(): boolean { return this.state.phase !== 'idle'; }
  get isFinished(): boolean { return this.state.phase === 'finished'; }
  tryStart(game: GameState, busy: boolean): boolean {
    if (this.inputLocked || busy || !game.town?.carryRequested || game.player.targetTile ||
      !game.quests.definitions.length || !game.quests.definitions.every(q => game.words.completedWords.includes(q.targetWord))) return false;
    const start = { ...gridToWorld(game.player.currentTile.column, game.player.currentTile.row, this.stage.grid), y: 0 };
    const { pickup } = townDeliveryPoints(this.stage);
    // Exit through the right board edge, then use the clear strip beside the grid.
    const edgeX = gridToWorld(this.stage.grid.columns - 1, 0, this.stage.grid).x;
    this.state.waypoints = [start, { x: edgeX, y: 0, z: start.z }, { x: pickup.x, y: 0, z: start.z }, pickup];
    Object.assign(this.state, { pose: { ...start }, heading: game.player.heading, phase: 'lead', elapsed: 0, index: 0 });
    return true;
  }
  update(dt: number, game: GameState): void {
    const s = this.state;
    if (!Number.isFinite(dt) || dt <= 0 || s.phase === 'idle' || s.phase === 'finished') return;
    let remaining = dt;
    while (remaining > 1e-10 && s.phase !== 'finished') {
      if (s.phase === 'pickupWalk' || s.phase === 'deliveryWalk') {
        const from = s.waypoints[s.index], to = s.waypoints[s.index + 1];
        if (!to) { s.phase = s.phase === 'pickupWalk' ? 'pickup' : 'placing'; s.elapsed = 0; continue; }
        const distance = Math.hypot(to.x - from.x, to.z - from.z);
        if (distance < 1e-8) { s.index++; continue; }
        const duration = distance / TOWN_CARRY_SPEED;
        const used = Math.min(remaining, duration - s.elapsed); remaining -= used; s.elapsed += used;
        const p = Math.min(1, s.elapsed / duration);
        s.pose = { x: from.x + (to.x - from.x) * p, y: 0, z: from.z + (to.z - from.z) * p };
        s.heading = Math.atan2(to.x - from.x, to.z - from.z);
        if (s.elapsed + 1e-9 < duration) break;
        s.index++; s.elapsed = 0;
      } else {
        const duration = s.phase === 'lead' ? .45 : s.phase === 'pickup' ? .5 : s.phase === 'placing' ? .8 : .65;
        const used = Math.min(remaining, duration - s.elapsed); remaining -= used; s.elapsed += used;
        if (s.phase === 'placing') s.placeProgress = Math.min(1, s.elapsed / duration);
        if (s.elapsed + 1e-9 < duration) break;
        s.elapsed = 0;
        if (s.phase === 'lead') s.phase = 'pickupWalk';
        else if (s.phase === 'pickup') {
          s.parcelAttached = true; s.phase = 'deliveryWalk'; s.index = 0;
          const { pickup, destination } = townDeliveryPoints(this.stage);
          s.waypoints = [pickup, { x: pickup.x, y: 0, z: 1 }, { x: pickup.x, y: 0, z: destination.z }, destination];
        } else if (s.phase === 'placing') {
          s.placeProgress = 1; s.parcelAttached = false; s.phase = 'arrival';
        } else {
          s.phase = 'finished'; if (game.town) game.town.carryCompleted = true;
        }
      }
    }
  }
}
