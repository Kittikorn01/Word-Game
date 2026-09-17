import type { StageDefinition } from './types.ts';

/** Environment study only; letters are temporary and there are no objectives. */
export const stage2: StageDefinition = {
  id: 'stage-2-forest-path', title: 'The Broken Forest Path', stageNumber: 2,
  kind: 'playable', environment: 'forest-blockout',
  grid: { rows: 7, columns: 7, tileSize: 1, origin: { x: -2.5, z: 0 } },
  playerStart: { row: 5, column: 3 },
  letterLayout: ['KEYXLAR', 'KEXNISO', 'WATXGNO', 'MQESHAD', 'BORXTEL', 'ZOKOPXI', 'QIFLENQ'],
  camera: { position: [.5, 17, 12], target: [.5, 0, 0], verticalSpan: 12, minimumWidth: 19 },
  forestBlockout: {
    baseY: -1.4,
    river: { zoneId: 'future-river-zone', waterLevel: -.38, bankInset: .22, flowSpeed: .18, color: '#66aaa7', contour: [0, .06, .01, -.05, -.02, .07, .1, .02, -.04, 0] },
    nature: [
      { kind: 'tree', x: -6.6, z: -2.8, y: 0, scale: .5 },
      { kind: 'tree', x: -4.6, z: -4.12, y: 0, scale: .65 },
      { kind: 'tree', x: -.8, z: -4.12, y: 0, scale: .58 },
      { kind: 'tree', x: 7.25, z: 2.8, y: .25, scale: .7 },
      { kind: 'tree', x: 5.35, z: -3.55, y: 1.65, scale: .6 },
      { kind: 'tree', x: 7.05, z: -2.6, y: 1.65, scale: .55 },
      { kind: 'rock', x: -6.55, z: 1.8, y: 0, scale: .6 },
      { kind: 'rock', x: 4.65, z: 3.4, y: .25, scale: .65 },
      { kind: 'rock', x: 7.55, z: -.1, y: .25, scale: .7 },
      { kind: 'bush', x: -6.6, z: .4, y: 0, scale: .5 },
      { kind: 'bush', x: 6.7, z: 3.8, y: .25, scale: .6 },
      { kind: 'bush', x: 7.15, z: -1.25, y: 1.65, scale: .55 },
      { kind: 'grass', x: -5.5, z: -4, y: 0, scale: .5 },
      { kind: 'grass', x: -6.55, z: 2.9, y: 0, scale: .5 },
      { kind: 'grass', x: 1.5, z: -2.4, y: 0, scale: .45 },
      { kind: 'grass', x: 4.45, z: .1, y: .25, scale: .5 },
      { kind: 'grass', x: 5.2, z: 3.7, y: .25, scale: .5 }
    ],
    terrain: [
      { id: 'main-ground', x: -2.5, z: 0, width: 9, depth: 9, top: 0, surface: 'grass' },
      { id: 'future-river-zone', x: 3, z: 0, width: 2, depth: 9, top: -.85, surface: 'earth' },
      { id: 'far-ground', x: 6, z: 0, width: 4, depth: 9, top: .25, surface: 'grass' },
      { id: 'raised-area', x: 6.25, z: -2.5, width: 3.5, depth: 4, top: 1.65, surface: 'leafLight' }
    ],
    // Reserved footprint only: never a traversable surface or a bridge mesh.
    futureBridge: { x: 3, z: 1.4, width: 2, depth: 1.5 }
  },
  decorations: [], quests: [], vocabulary: []
};
