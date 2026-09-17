import type { GridDefinition } from '../grid/types.ts';
import type { SupportObjectiveDefinition } from '../simulation/SupportObjectives.ts';
import type { ExitDefinition } from '../simulation/ExitInteraction.ts';
import type { WorldReactionMap } from '../simulation/WorldReactionController.ts';
import type { MovementBounds, Position } from '../simulation/types.ts';
import type { QuestDefinition } from '../quests/types.ts';
export interface RiverDefinition {
  zoneId: string;
  waterLevel: number;
  bankInset: number;
  flowSpeed: number;
  color: string;
  contour?: readonly number[];
}
export interface ForestBlockout {
  river?: RiverDefinition;
  nature?: readonly { kind: 'tree' | 'rock' | 'bush' | 'grass'; x: number; z: number; y: number; scale: number }[];
  terrain: readonly { id: string; x: number; z: number; width: number; depth: number; top: number; surface: 'grass' | 'earth' | 'leafLight' }[];
  baseY: number;
  futureBridge: { x: number; z: number; width: number; depth: number };
}
export interface StageDefinition {
  id: string;
  title?: string;
  stageNumber?: number;
  kind?: 'playable' | 'placeholder';
  nextStageId?: string;
  exit?: ExitDefinition;
  environment?: 'cottage' | 'forest-blockout';
  forestBlockout?: ForestBlockout;
  camera?: { position: readonly [number, number, number]; target: readonly [number, number, number]; verticalSpan: number; minimumWidth: number };
  worldReactions?: WorldReactionMap;
  worldObjects?: Readonly<Record<'key' | 'lamp' | 'plant' | 'book' | 'door', Position>>;
  grid: GridDefinition;
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
  return { x: (grid.origin?.x ?? 0) + (column - (grid.columns - 1) / 2) * grid.tileSize, z: (grid.origin?.z ?? 0) + (row - (grid.rows - 1) / 2) * grid.tileSize };
}
export function movementBounds(stage: StageDefinition): MovementBounds {
  const halfX = stage.grid.columns * stage.grid.tileSize / 2;
  const halfZ = stage.grid.rows * stage.grid.tileSize / 2;
  const origin = stage.grid.origin ?? { x: 0, z: 0 };
  return { minX: origin.x - halfX, maxX: origin.x + halfX, minZ: origin.z - halfZ, maxZ: origin.z + halfZ };
}



