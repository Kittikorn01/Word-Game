import { prototypeStage } from './prototype.ts';
import type { StageDefinition } from './types.ts';

export const stage1: StageDefinition = {
  ...prototypeStage,
  id: 'stage-1-letter-clearing',
  title: 'The Locked Cottage',
  stageNumber: 1,
  nextStageId: 'stage-2-forest-path',
  environment: 'cottage',
  decorations: [],
  supportObjectives: [
    { id: 'inspect-bookshelf', label: 'Inspect the bookshelf.', tile: { row: 0, column: 3 }, reward: 1 },
    { id: 'examine-window', label: 'Examine the window.', tile: { row: 0, column: 1 }, reward: 1 }
  ],
  letterLayout: [
    'KEYXLAR',
    'KEXNISO',
    'WATXGNO',
    'MQESHAD',
    'BORXTEL',
    'ZOKOPXI',
    'QIFLENQ'
  ],
  worldReactions: { 'key-quest': 'keySpawned', 'light-quest': 'lightOn', 'water-quest': 'plantWatered', 'book-quest': 'bookSpawned', 'door-quest': 'doorRevealed', 'open-quest': 'doorOpen' },
  worldObjects: { key: { x: 4.2, z: -2.3 }, lamp: { x: -4.2, z: 0 }, plant: { x: -3.95, z: -3.8 }, book: { x: .15, z: -4.12 }, door: { x: 2.8, z: -4.65 } },
  vocabulary: ['KEY', 'LIGHT', 'WATER', 'BOOK', 'DOOR', 'OPEN'],
  quests: [
    { id: 'key-quest', targetWord: 'KEY', clue: 'The door is locked. Find something that can unlock it.' },
    { id: 'light-quest', targetWord: 'LIGHT', clue: 'It is too dark to see clearly.' },
    { id: 'water-quest', targetWord: 'WATER', clue: 'This plant looks very dry.' },
    { id: 'book-quest', targetWord: 'BOOK', clue: 'Find something you can read.' },
    { id: 'door-quest', targetWord: 'DOOR', clue: 'Find the way people normally enter or leave a room.' },
    { id: 'open-quest', targetWord: 'OPEN', requires: ['DOOR'], clue: 'The way out is still closed. What should you do?' }
  ]
};




