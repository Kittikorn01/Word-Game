import type { ExitState } from './ExitInteraction.ts';
import type { StageWorldState } from './WorldReactionController.ts';
import type { GridCoordinate } from '../grid/types.ts';
import type { WordProgress } from './WordProgress.ts';
import type { QuestProgress } from './QuestProgress.ts';
import type { ForestWorldState } from './ForestWorldState.ts';
import type { ForestTraversalState } from './ForestTraversal.ts';
import type { ForestEndingState } from './ForestEndingController.ts';
export interface Position { x: number; z: number }
export interface MoveAction { x: number; z: number }
export interface GameState {
  forest?: ForestWorldState;
  traversal?: ForestTraversalState;
  ending?: ForestEndingState;
  exit: ExitState;
  world: StageWorldState;
  words: WordProgress;
  quests: QuestProgress;
  player: { currentTile: GridCoordinate; targetTile: GridCoordinate | null; elapsed: number; heading: number };
}
export interface MovementBounds { minX: number; maxX: number; minZ: number; maxZ: number }


