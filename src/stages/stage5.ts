import type { StageDefinition } from './types.ts';

/** Stage 5.0 scenery only; retain the existing Stage 4 destination ID. */
export const stage5: StageDefinition = {
  id: 'stage-5-placeholder', stageNumber: 5, title: 'The Storm', kind: 'playable', environment: 'storm-blockout',
  grid: { rows: 7, columns: 7, tileSize: 1, origin: { x: 0, z: 1 } }, playerStart: { row: 6, column: 3 },
  tileTheme: 'forest-stone',
  // Temporary letters, no authored vocabulary paths.
  letterLayout: ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZAB', 'CDEFGHI', 'JKLMNOP', 'QRSTUVW'],
  camera: { position: [0, 17, 11.7], target: [0, 0, -.3], verticalSpan: 13, minimumWidth: 14 },
  quests: [], decorations: []
};
