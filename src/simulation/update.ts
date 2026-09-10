import type { GameState, MoveAction, MovementBounds, Position } from './types.ts';

export const PLAYER_RADIUS = 0.24;
export const WALK_SPEED = 2.6;
export function createGameState(spawn: Position): GameState {
  return { player: { ...spawn, heading: 0 } };
}
export function updateMovement(state: GameState, action: MoveAction, dt: number, bounds: MovementBounds): void {
  if (dt <= 0 || !Number.isFinite(dt)) return;
  const length = Math.hypot(action.x, action.z);
  if (!length) return;
  const x = action.x / Math.max(1, length);
  const z = action.z / Math.max(1, length);
  state.player.x = Math.max(bounds.minX + PLAYER_RADIUS, Math.min(bounds.maxX - PLAYER_RADIUS, state.player.x + x * WALK_SPEED * dt));
  state.player.z = Math.max(bounds.minZ + PLAYER_RADIUS, Math.min(bounds.maxZ - PLAYER_RADIUS, state.player.z + z * WALK_SPEED * dt));
  state.player.heading = Math.atan2(x, z);
}
