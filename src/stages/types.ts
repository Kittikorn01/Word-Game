import type { MovementBounds, Position } from '../simulation/types.ts';
export interface StageDefinition {
  id: string;
  grid: { columns: number; rows: number; tileSize: number };
  spawn: Position;
  decorations: readonly (Position & { kind: 'tree' | 'rock'; scale: number })[];
}
// Grid centers map to world X/Z; +row is +Z, Y is height. One unit = one tile.
export function gridToWorld(column: number, row: number, grid: StageDefinition['grid']): Position {
  return { x: (column - (grid.columns - 1) / 2) * grid.tileSize, z: (row - (grid.rows - 1) / 2) * grid.tileSize };
}
export function movementBounds(stage: StageDefinition): MovementBounds {
  const halfX = stage.grid.columns * stage.grid.tileSize / 2;
  const halfZ = stage.grid.rows * stage.grid.tileSize / 2;
  return { minX: -halfX, maxX: halfX, minZ: -halfZ, maxZ: halfZ };
}
