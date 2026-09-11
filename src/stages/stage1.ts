import { prototypeStage } from './prototype.ts';
import type { StageDefinition } from './types.ts';

export const stage1: StageDefinition = {
  ...prototypeStage,
  id: 'stage-1-letter-clearing',
  letterLayout: [
    'KEYAMXZ',
    'NLIGHTP',
    'WATERUS',
    'CBOOKVN',
    'DOORHIA',
    'TOPENEF',
    'QILFEOQ'
  ],
  vocabulary: ['KEY', 'LIGHT', 'WATER', 'BOOK', 'DOOR', 'OPEN'],
  quests: [
    { id: 'key-quest', targetWord: 'KEY', clue: 'The door is locked. Find something that can unlock it.' },
    { id: 'light-quest', targetWord: 'LIGHT', clue: 'It is too dark to see clearly.' },
    { id: 'water-quest', targetWord: 'WATER', clue: 'This plant looks very dry.' },
    { id: 'book-quest', targetWord: 'BOOK', clue: 'Find something you can read.' },
    { id: 'door-quest', targetWord: 'DOOR', clue: 'Find the way people normally enter or leave a room.' },
    { id: 'open-quest', targetWord: 'OPEN', clue: 'The way out is still closed. What should you do?' }
  ]
};
