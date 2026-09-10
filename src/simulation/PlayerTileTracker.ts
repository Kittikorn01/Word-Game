import type { LetterGrid } from '../grid/LetterGrid.ts';
import type { GridCoordinate } from '../grid/types.ts';

export class PlayerTileTracker {
  currentPlayerTile: string | null = null;
  private grid: LetterGrid;
  constructor(grid: LetterGrid) { this.grid = grid; }
  /** Reads committed gameplay coordinates, never interpolated world position. */
  update(coordinate: GridCoordinate): boolean {
    const next = this.grid.getTile(coordinate.row, coordinate.column)?.id ?? null;
    const changed = next !== this.currentPlayerTile;
    this.currentPlayerTile = next; return changed;
  }
}
