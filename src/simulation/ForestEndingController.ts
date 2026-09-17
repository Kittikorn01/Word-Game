import type { GameState } from './types.ts';
import type { StageDefinition } from '../stages/types.ts';
import { gridToWorld } from '../stages/types.ts';
import { isOnLetterGrid, traversalPose, type SurfacePoint } from './ForestTraversal.ts';

export interface ForestEndingState {
  phase: 'idle' | 'lead' | 'walking' | 'arrival' | 'finished';
  pose: SurfacePoint | null;
  heading: number;
  waypoints: SurfacePoint[];
  index: number;
  elapsed: number;
}
export const ENDING_SPEED = 4;
export const ENDING_LEAD_SECONDS = .4;
// The existing completion controller adds its own .3s settle: total arrival pause = .75s.
export const ENDING_ARRIVAL_SECONDS = .45;
export function createForestEndingState(): ForestEndingState {
  return { phase: 'idle', pose: null, heading: 0, waypoints: [], index: 0, elapsed: 0 };
}
export function forestEndingReady(state: GameState): boolean {
  return !!state.forest?.conditions.climbRouteOpen && !!state.forest.conditions.bridgeBuilt &&
    state.words.completedWords.includes('CLIMB') && state.quests.definitions.length > 0 &&
    state.quests.definitions.every(q => state.words.completedWords.includes(q.targetWord));
}
/** Temporary presentation pose only. Normal grid/traversal state is never rewritten. */
export class ForestEndingController {
  readonly state: ForestEndingState;
  private stage: StageDefinition;
  constructor(stage: StageDefinition, state = createForestEndingState()) { this.stage = stage; this.state = state; }
  get inputLocked(): boolean { return this.state.phase !== 'idle'; }
  get isFinished(): boolean { return this.state.phase === 'finished'; }
  tryStart(game: GameState, reactionsOrFeedbackBusy: boolean): boolean {
    if (this.inputLocked || reactionsOrFeedbackBusy || !forestEndingReady(game) ||
      game.player.targetTile || game.traversal?.target || !game.traversal) return false;
    const t = game.traversal, points: SurfacePoint[] = [];
    if (isOnLetterGrid(game)) {
      const start = gridToWorld(game.player.currentTile.column, game.player.currentTile.row, this.stage.grid);
      points.push({ ...start, y: 0 });
      // Two orthogonal legs stay entirely over the board, then join the existing route.
      points.push({ x: start.x, y: 0, z: t.nodes.grid.z }, { ...t.nodes.grid });
      for (const id of ['landing', 'span-0', 'span-1', 'span-2', 'span-3', 'span-4', 'far-bank', 'root-foot']) points.push({ ...t.nodes[id] });
    } else {
      // A player may already have explored while the last environmental reaction settles.
      points.push({ ...traversalPose(game)! });
      let id = t.current;
      while (id !== 'root-foot' && id !== 'summit' && !/^root-[1-6]$/.test(id)) {
        const node = t.nodes[id];
        id = id.endsWith('-south') ? node.links.north! : id === 'far-clearing' ? node.links.west! : node.links.east!;
        if (!id) throw new Error('Forest ending route must connect to the root foot.');
        points.push({ ...t.nodes[id] });
      }
    }
    const currentId = isOnLetterGrid(game) ? 'root-foot' : t.current;
    const firstRoot = /^root-[1-6]$/.test(currentId) ? Number(currentId.slice(5)) + 1 : 1;
    if (currentId !== 'summit') {
      for (let i = firstRoot; i <= 6; i++) points.push({ ...t.nodes[`root-${i}`] });
      points.push({ ...t.nodes.summit });
    }
    const s = this.state;
    s.waypoints = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y, p.z - points[i - 1].z) > 1e-8);
    s.pose = { ...s.waypoints[0] }; s.heading = game.player.heading;
    s.index = 0; s.elapsed = 0; s.phase = 'lead';
    return true;
  }
  update(dt: number): void {
    const s = this.state;
    if (!Number.isFinite(dt) || dt <= 0 || s.phase === 'idle' || s.phase === 'finished') return;
    let remaining = dt;
    while (remaining > 1e-10 && s.phase !== 'finished') {
      if (s.phase === 'lead' || s.phase === 'arrival') {
        const duration = s.phase === 'lead' ? ENDING_LEAD_SECONDS : ENDING_ARRIVAL_SECONDS;
        const used = Math.min(remaining, duration - s.elapsed); s.elapsed += used; remaining -= used;
        if (s.elapsed + 1e-9 < duration) break;
        s.phase = s.phase === 'lead' ? 'walking' : 'finished'; s.elapsed = 0;
      } else {
        const from = s.waypoints[s.index], to = s.waypoints[s.index + 1];
        if (!to) { s.phase = 'arrival'; s.elapsed = 0; continue; }
        const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
        const rootStep = to.y - from.y > .15 && Math.hypot(to.x - from.x, to.z - from.z) < .5;
        const duration = Math.max(rootStep ? .32 : .18, distance / ENDING_SPEED);
        const used = Math.min(remaining, duration - s.elapsed); s.elapsed += used; remaining -= used;
        const p = Math.min(1, s.elapsed / duration);
        // A small lifted step clears the visible root risers without adding character physics.
        s.pose = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p + (rootStep ? Math.sin(p * Math.PI) * .18 : 0), z: from.z + (to.z - from.z) * p };
        s.heading = Math.atan2(to.x - from.x, to.z - from.z);
        if (s.elapsed + 1e-9 < duration) break;
        s.index++; s.elapsed = 0;
      }
    }
  }
}
