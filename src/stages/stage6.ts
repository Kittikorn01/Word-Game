import type { StageDefinition } from './types.ts';

/** Stage 6.1: vocabulary gameplay; archive reactions and final ending remain deferred. */
export const stage6: StageDefinition = {
  id: 'stage-6-word-archive', stageNumber: 6, title: 'The Word Archive',
  kind: 'playable', environment: 'archive-blockout',
  grid: { rows: 7, columns: 7, tileSize: 1, origin: { x: 0, z: 1 } },
  playerStart: { row: 6, column: 3 }, tileTheme: 'archive-stone',
  // Zero-based (row, column) paths; coordinates, never world positions, define solutions.
  // STONE: (0,0) (0,1) (1,1) (2,1) (2,2)
  // ABOVE: (0,4) (0,5) (0,6) (1,6) (2,6)
  // UNDER: (3,6) (3,5) (4,5) (4,4) (3,4)
  // SECRET: (6,0) (5,0) (5,1) (4,1) (4,2) (3,2)
  // READ: (1,3) (1,4) (2,4) (2,3)
  // EXIT: (6,6) (6,5) (5,5) (5,4)
  // Common-letter decoys preserve exactly one cardinal solution per target.
  letterLayout: ['STLVABO', 'NOUREFV', 'FNEDASE', 'FNTFRNU', 'HREEEDB', 'ECDDTIN', 'SBAMBXE'],
  vocabulary: ['STONE', 'ABOVE', 'UNDER', 'SECRET', 'READ', 'EXIT'],
  questPresentation: 'immediate', completionMode: 'manual',
  quests: [
    { id: 'archive-stone', targetWord: 'STONE', clue: 'Find a hard natural material often used to build old walls.' },
    { id: 'archive-above', targetWord: 'ABOVE', clue: 'Find a word that means at a higher position than something else.' },
    { id: 'archive-under', targetWord: 'UNDER', clue: 'Find a word that means directly below something else.' },
    { id: 'archive-secret', targetWord: 'SECRET', clue: 'Find something kept hidden because others should not know about it.', requires: ['STONE', 'ABOVE', 'UNDER'] },
    { id: 'archive-read', targetWord: 'READ', clue: 'You find an old book. What do you do to understand its words?', requires: ['SECRET'] },
    { id: 'archive-exit', targetWord: 'EXIT', clue: 'Your journey is complete. Find the way out of this room.', requires: ['READ'] }
  ],
  camera: { position: [0, 17, 11.7], target: [0, 0, -.3], verticalSpan: 13, minimumWidth: 14 },
  decorations: []
};
