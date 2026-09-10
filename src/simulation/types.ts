export interface Position { x: number; z: number }
export interface MoveAction { x: number; z: number }
export interface GameState { player: Position & { heading: number } }
export interface MovementBounds { minX: number; maxX: number; minZ: number; maxZ: number }
