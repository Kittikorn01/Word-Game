import type { StageDefinition } from './types.ts';
export const prototypeStage: StageDefinition = {
  id: 'foundation-clearing',
  grid: { columns: 7, rows: 7, tileSize: 1 },
  spawn: { x: 0, z: 1 },
  decorations: [
    { kind: 'tree', x: -4.25, z: -3.3, scale: 1.05 },
    { kind: 'tree', x: 3.8, z: -3.8, scale: 1.2 },
    { kind: 'tree', x: 4.35, z: -1.7, scale: 0.78 },
    { kind: 'rock', x: -4.25, z: 1.4, scale: 0.75 },
    { kind: 'rock', x: -3.9, z: 2.2, scale: 0.42 },
    { kind: 'rock', x: 3.9, z: 2.6, scale: 0.55 }
  ]
};
