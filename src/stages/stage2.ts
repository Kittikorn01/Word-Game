import type { StageDefinition } from './types.ts';

/** Transition destination only. No letter board, quests or reactions are mounted. */
export const stage2: StageDefinition = {
  id: 'stage-2-forest-path', title: 'The Broken Forest Path', stageNumber: 2,
  kind: 'placeholder', grid: { rows: 1, columns: 1, tileSize: 1 },
  playerStart: { row: 0, column: 0 }, decorations: [], quests: [], vocabulary: []
};
