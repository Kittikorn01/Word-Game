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
  vocabulary: ['KEY', 'LIGHT', 'WATER', 'BOOK', 'DOOR', 'OPEN']
};
