import { gridToWorld } from '../stages/types.ts';
import type { Position } from '../simulation/types.ts';
import type { GridCoordinate, GridDefinition, LetterTile, TileVisualState } from './types.ts';

export const CORRECT_DURATION = 0.9;
export function areAdjacent(a: GridCoordinate, b: GridCoordinate): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.column - b.column) === 1;
}

export class LetterGrid {
  readonly tiles: readonly LetterTile[];
  hoveredTileId: string | null = null;
  private byId = new Map<string, LetterTile>();
  readonly definition: Readonly<GridDefinition>;
  constructor(stageId: string, definition: GridDefinition, layout: readonly string[]) {
    const { rows, columns, tileSize } = definition;
    if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(columns) || columns < 1 || !Number.isFinite(tileSize) || tileSize <= 0 ||
      layout.length !== rows || layout.some(row => row.length !== columns || !/^[A-Z]+$/.test(row))) {
      throw new Error('Letter grid requires positive dimensions and a matching uppercase A-Z layout.');
    }
    this.definition = Object.freeze({ ...definition });
    this.tiles = layout.flatMap((letters, row) => [...letters].map((letter, column): LetterTile => ({
      id: `${stageId}:${row}:${column}`, row, column, letter,
      worldPosition: { ...gridToWorld(column, row, definition), y: 0.105 },
      state: 'NORMAL', correctRemaining: 0
    })));
    this.tiles.forEach(tile => this.byId.set(tile.id, tile));
  }
  findLetter(letter: string): readonly LetterTile[] { return this.tiles.filter(tile => tile.letter === letter); }
  getById(id: string | null): LetterTile | undefined { return id === null ? undefined : this.byId.get(id); }
  getTile(row: number, column: number): LetterTile | undefined {
    if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0 || row >= this.definition.rows || column >= this.definition.columns) return;
    return this.tiles[row * this.definition.columns + column];
  }
  /** Half-open cells: minimum edge included, maximum edge excluded; gaps belong to the cell. */
  worldToGrid(position: Position): GridCoordinate | null {
    const { rows, columns, tileSize } = this.definition;
    const column = Math.floor(position.x / tileSize + columns / 2);
    const row = Math.floor(position.z / tileSize + rows / 2);
    return this.getTile(row, column) ? { row, column } : null;
  }
  tileAtWorld(position: Position): LetterTile | undefined {
    const coordinate = this.worldToGrid(position);
    return coordinate ? this.getTile(coordinate.row, coordinate.column) : undefined;
  }
  setHovered(id: string | null): void { this.hoveredTileId = this.getById(id)?.id ?? null; }
  visualState(tile: LetterTile): TileVisualState {
    return tile.state !== 'NORMAL' ? tile.state : tile.id === this.hoveredTileId ? 'HOVER' : 'NORMAL';
  }
  toggleSelected(id: string): void {
    const tile = this.getById(id);
    if (tile && tile.state !== 'CORRECT') tile.state = tile.state === 'SELECTED' ? 'NORMAL' : 'SELECTED';
  }
  playCorrectOnSelected(): void {
    for (const tile of this.tiles) if (tile.state === 'SELECTED') {
      tile.state = 'CORRECT'; tile.correctRemaining = CORRECT_DURATION;
    }
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const tile of this.tiles) if (tile.state === 'CORRECT') {
      tile.correctRemaining = Math.max(0, tile.correctRemaining - dt);
      if (!tile.correctRemaining) tile.state = 'NORMAL';
    }
  }
  reset(): void {
    this.hoveredTileId = null;
    for (const tile of this.tiles) { tile.state = 'NORMAL'; tile.correctRemaining = 0; }
  }
}
