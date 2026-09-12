import type { GridCoordinate } from '../grid/types.ts';
import type { GameState } from './types.ts';
import { questStatus } from './QuestProgress.ts';
export interface ExitDefinition { readonly tiles: readonly GridCoordinate[]; readonly requiresKey: boolean }
export interface ExitState { nearby: boolean; canInteractWithExit: boolean; completed: boolean }
export function createExitState(): ExitState { return { nearby: false, canInteractWithExit: false, completed: false }; }
export function updateExitInteraction(state: GameState, definition?: ExitDefinition): void {
  const { player, world, exit } = state;
  exit.nearby = !!definition && world.doorRevealed && !player.targetTile && definition.tiles.some(t => t.row === player.currentTile.row && t.column === player.currentTile.column);
  exit.canInteractWithExit = exit.nearby && !exit.completed && world.doorOpen &&
    (!definition!.requiresKey || world.hasKey) && state.quests.definitions.length > 0 &&
    state.quests.definitions.every(q => questStatus(q,state.words) === 'COMPLETED');
}
export function interactWithExit(state: GameState, definition: ExitDefinition | undefined, stageId: string, onCompleted: (id: string) => void): boolean {
  updateExitInteraction(state,definition);
  if (!state.exit.canInteractWithExit) return false;
  state.exit.completed = true; state.exit.canInteractWithExit = false;
  onCompleted(stageId); return true;
}
