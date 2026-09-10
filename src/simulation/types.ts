export interface GridPosition { column: number; row: number }
export type TileStatus = 'normal' | 'hover' | 'selected' | 'correct';
// Future data contract only; no selection or feedback behavior in Prompt 0.
export interface LetterTile { id: string; letter: string; grid: GridPosition; status: TileStatus }
export interface Position { x: number; z: number }
export interface MoveAction { x: number; z: number }
export interface GameState { player: Position & { heading: number } }
export interface MovementBounds { minX: number; maxX: number; minZ: number; maxZ: number }
