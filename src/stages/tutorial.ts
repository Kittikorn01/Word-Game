import type { StageDefinition } from './types.ts';

export const tutorialPath = [
  { row: 2, column: 1 }, { row: 2, column: 2 }, { row: 2, column: 3 },
  { row: 1, column: 3 }, { row: 1, column: 4 }
] as const;
export const tutorialStage: StageDefinition = {
  id: 'tutorial-courtyard', title: 'A word opens the way', environment: 'tutorial-courtyard',
  grid: { rows: 5, columns: 7, tileSize: 1 },
  letterLayout: ['MQEPLNX', 'OVBRTKH', 'XSTAJWE', 'NCLYQPO', 'HUEBMKI'],
  playerStart: { row: 3, column: 1 },
  camera: { position: [0, 18, 13], target: [0, 0, -1], verticalSpan: 13, minimumWidth: 13 },
  decorations: [
    { kind: 'tree', x: -4.2, z: -3.5, scale: 1.2 },
    { kind: 'tree', x: 4.2, z: -3.5, scale: 1 },
    { kind: 'tree', x: -4.3, z: 1.2, scale: .8 },
    { kind: 'rock', x: 4.2, z: 1.5, scale: .7 }
  ]
};
