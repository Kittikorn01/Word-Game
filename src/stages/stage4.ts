import type { StageDefinition } from './types.ts';

/** Stage 4.0: scenery only. No authored vocabulary, paths or reactions. */
export const stage4: StageDefinition = {
  id: 'stage-4-silent-workshop', stageNumber: 4, title: 'The Silent Workshop',
  kind: 'playable', environment: 'workshop-blockout',
  grid: { rows: 7, columns: 7, tileSize: 1, origin: { x: 0, z: 1 } },
  playerStart: { row: 6, column: 3 },
  // Deliberately generic alphabet samples, not future vocabulary paths.
  letterLayout: ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZAB', 'CDEFGHI', 'JKLMNOP', 'QRSTUVW'],
  quests: [], decorations: [],
  camera: { position: [0, 17, 11.7], target: [0, 0, -.3], verticalSpan: 13, minimumWidth: 14 }
};
