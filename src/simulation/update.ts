import type { GameState, MoveAction } from './types.ts';
import { createWordProgress } from './WordProgress.ts';
import type { GridCoordinate, GridDefinition } from '../grid/types.ts';

export const STEP_DURATION = 0.18;
export function createGameState(start: GridCoordinate, grid: GridDefinition): GameState {
  if (!Number.isInteger(start.row) || !Number.isInteger(start.column) || start.row < 0 || start.column < 0 || start.row >= grid.rows || start.column >= grid.columns) {
    throw new Error('Player start must be a valid grid coordinate.');
  }
  return { words: createWordProgress(), player: { currentTile: { ...start }, targetTile: null, elapsed: 0, heading: 0 } };
}
/** First keydown wins; commands during an active step are discarded. */
export function requestMovement(state: GameState, action: MoveAction, grid: GridDefinition): boolean {
  const player = state.player;
  if (player.targetTile || !Number.isInteger(action.x) || !Number.isInteger(action.z) || Math.abs(action.x) + Math.abs(action.z) !== 1) return false;
  const target = { row: player.currentTile.row + action.z, column: player.currentTile.column + action.x };
  if (target.row < 0 || target.column < 0 || target.row >= grid.rows || target.column >= grid.columns) return false;
  player.targetTile = target; player.elapsed = 0; player.heading = Math.atan2(action.x, action.z);
  return true;
}
/** Commit logical location only on arrival. Returns true once per completed step. */
export function updateMovement(state: GameState, dt: number): boolean {
  const player = state.player;
  if (!player.targetTile || !Number.isFinite(dt) || dt <= 0) return false;
  player.elapsed = Math.min(STEP_DURATION, player.elapsed + dt);
  if (player.elapsed + 1e-10 < STEP_DURATION) return false;
  player.currentTile = player.targetTile; player.targetTile = null; player.elapsed = 0;
  return true;
}

