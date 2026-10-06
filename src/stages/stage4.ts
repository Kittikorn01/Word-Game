import type { StageDefinition } from './types.ts';

/** Stage 4.2: vocabulary drives a safe, deterministic machine sequence. */
export const stage4: StageDefinition = {
  id: 'stage-4-silent-workshop', stageNumber: 4, title: 'The Silent Workshop',
  nextStageId: 'stage-5-placeholder',
  kind: 'playable', environment: 'workshop-blockout',
  grid: { rows: 7, columns: 7, tileSize: 1, origin: { x: 0, z: 1 } },
  playerStart: { row: 6, column: 3 },
  // Unique cardinal paths with authored decoys; see STAGE4_VOCABULARY.md.
  letterLayout: ['GEPERPS', 'NALPAOT', 'LRNLIRI', 'EVRNTOP', 'PERMEWN', 'TAOTRRM', 'SRTNRPE'],
  vocabulary: ['GEAR', 'REPAIR', 'POWER', 'LEVER', 'START', 'STOP'],
  quests: [
    { id: 'workshop-gear', targetWord: 'GEAR', clue: 'Find a toothed wheel that helps a machine move.' },
    { id: 'workshop-repair', targetWord: 'REPAIR', clue: 'The machine is broken. What should you do to fix it?' },
    { id: 'workshop-power', targetWord: 'POWER', clue: 'The machine needs energy before it can work.', requires: ['GEAR', 'REPAIR'] },
    { id: 'workshop-lever', targetWord: 'LEVER', clue: 'Find a handle you can push or pull to control a machine.', requires: ['POWER'] },
    { id: 'workshop-start', targetWord: 'START', clue: 'The machine is ready. What should you do to make it begin working?', requires: ['LEVER'] },
    // Production completion is simulation-owned; there is no deadline to submit STOP.
    { id: 'workshop-stop', targetWord: 'STOP', clue: 'The work is finished. What should you do to make the machine end its movement?', requires: ['START'], requiresWorld: 'workshop.productionFinished' }
  ],
  decorations: [],
  camera: { position: [0, 17, 11.7], target: [0, 0, -.3], verticalSpan: 13, minimumWidth: 14 }
};
