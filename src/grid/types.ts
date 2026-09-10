import type { Position } from '../simulation/types.ts';

export interface GridCoordinate { row: number; column: number }
export interface GridDefinition { rows: number; columns: number; tileSize: number }
export type TileState = 'NORMAL' | 'SELECTED' | 'CORRECT';
export type TileVisualState = TileState | 'HOVER';
export interface LetterTile extends GridCoordinate {
  readonly id: string;
  readonly letter: string;
  /** Logical ground center; renderer lift never changes this position. */
  readonly worldPosition: Position & { y: number };
  state: TileState;
  correctRemaining: number;
}
