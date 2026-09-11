import type { GridCoordinate } from '../grid/types.ts';
import type { WordProgress } from './WordProgress.ts';
import type { QuestProgress } from './QuestProgress.ts';
export interface Position { x: number; z: number }
export interface MoveAction { x: number; z: number }
export interface GameState {
  words: WordProgress;
  quests: QuestProgress;
  player: { currentTile: GridCoordinate; targetTile: GridCoordinate | null; elapsed: number; heading: number };
}
export interface MovementBounds { minX: number; maxX: number; minZ: number; maxZ: number }
