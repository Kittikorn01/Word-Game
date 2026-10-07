import type { StageDefinition } from './types.ts';

/** Stage 5.1 vocabulary only; retain the existing Stage 4 destination ID. */
export const stage5: StageDefinition = {
  id: 'stage-5-placeholder', stageNumber: 5, title: 'The Storm', kind: 'playable', environment: 'storm-blockout',
  grid: { rows: 7, columns: 7, tileSize: 1, origin: { x: 0, z: 1 } }, playerStart: { row: 6, column: 0 },
  tileTheme: 'forest-stone',
  // Unique cardinal paths and controlled decoys; see STAGE5_VOCABULARY.md.
  letterLayout: ['RAINIUS', 'TSTSTEH', 'FENUTLN', 'IRIMERS', 'ARUEASU', 'WMCSEFR', 'NHREEAS'],
  vocabulary: ['RAIN', 'SHELTER', 'FIRE', 'WARM', 'SAFE', 'RESCUE'],
  quests: [
    { id: 'storm-rain', targetWord: 'RAIN', clue: 'Find water that falls from the sky.' },
    { id: 'storm-shelter', targetWord: 'SHELTER', clue: 'Find a place that protects you from rain and wind.' },
    { id: 'storm-fire', targetWord: 'FIRE', clue: 'Find something that gives heat and light.' },
    { id: 'storm-warm', targetWord: 'WARM', clue: 'After a fire is lit, the shelter feels comfortably hot, but not too hot. How does it feel?', requires: ['RAIN', 'SHELTER', 'FIRE'] },
    { id: 'storm-safe', targetWord: 'SAFE', clue: 'Find a word that means protected from danger.', requires: ['WARM'] },
    { id: 'storm-rescue', targetWord: 'RESCUE', clue: 'A traveler is trapped in the storm. What action brings them out of danger?', requires: ['SAFE'] }
  ],
  camera: { position: [0, 17, 11.7], target: [0, 0, -.3], verticalSpan: 13, minimumWidth: 14 },
  decorations: []
};
