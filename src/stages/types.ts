import type { SupportObjectiveDefinition } from '../simulation/SupportObjectives.ts';
import type { ExitDefinition } from '../simulation/ExitInteraction.ts';
import type { WorldReactionMap } from '../simulation/WorldReactionController.ts';
import type { MovementBounds, Position } from '../simulation/types.ts';
import type { QuestDefinition } from '../quests/types.ts';
export interface StageDefinition {
  id: string;
  title?: string;
  stageNumber?: number;
  kind?: 'playable' | 'placeholder';
  nextStageId?: string;
  exit?: ExitDefinition;
  environment?: 'cottage';
  worldReactions?: WorldReactionMap;
  worldObjects?: Readonly<Record<'key' | 'lamp' | 'plant' | 'book' | 'door', Position>>;
  grid: { columns: number; rows: number; tileSize: number };
  supportObjectives?: readonly SupportObjectiveDefinition[];
  wordShardSpawns?: readonly { id: string; row: number; column: number }[];
  letterLayout?: readonly string[];
  vocabulary?: readonly string[];
  quests?: readonly QuestDefinition[];
  playerStart: { row: number; column: number };
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



