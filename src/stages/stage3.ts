import type { StageDefinition, TownBlockout } from './types.ts';

// One puzzle board. The surrounding forecourts are reserved scenery, not navigation.
const town: TownBlockout = {
  platform: { x: 0, z: .3, width: 12.6, depth: 12, thickness: .5 },
  square: { x: 0, z: 1, width: 7.25, depth: 7.25 },
  zones: [
    { id: 'bakery', x: -4.1, z: -3.8, width: 2.9, depth: 2.2, height: 1.9,
      mass: { x: -4.1, z: -4.1, width: 3.5, depth: 2.3 },
      forecourt: { x: -4.1, z: -2.9, width: 2.4, depth: .6 }, facing: 'south' },
    { id: 'shop', x: 4.1, z: -3.8, width: 2.9, depth: 2.2, height: 1.9,
      mass: { x: 4.1, z: -4.1, width: 3.5, depth: 2.3 },
      forecourt: { x: 4.1, z: -2.9, width: 2.4, depth: .6 }, facing: 'south' },
    { id: 'clock', x: 0, z: -4.3, width: 1.8, depth: 1.8, height: 3.1,
      mass: { x: 0, z: -4.3, width: 1.05, depth: 1.05 },
      forecourt: { x: 0, z: -3.4, width: 1.4, depth: .5 }, facing: 'south' },
    { id: 'mail', x: -4.7, z: 3.5, width: 1, depth: 1, height: .85,
      mass: { x: -4.7, z: 3.5, width: .6, depth: .55 },
      forecourt: { x: -4.2, z: 3.5, width: .4, depth: .7 }, facing: 'south' },
    { id: 'delivery', x: 4.7, z: 3.5, width: 1, depth: 1, height: .5,
      mass: { x: 4.7, z: 3.5, width: .75, depth: .65 },
      forecourt: { x: 4.2, z: 3.5, width: .4, depth: .7 }, facing: 'south' }
  ],
  paths: [],
  gardens: [
    { x: -5, z: .2, width: .85, depth: .85 },
    { x: 5, z: .2, width: .85, depth: .85 }
  ],
  carryRoute: []
};

export const stage3: StageDefinition = {
  id: 'stage-3-busy-little-town', stageNumber: 3, title: 'A Busy Little Town',
  kind: 'playable', environment: 'town-blockout',
  townProgression: true,
  grid: { rows: 7, columns: 7, tileSize: 1, origin: { x: 0, z: 1 } },
  playerStart: { row: 6, column: 3 },
  // Authored orthogonal paths and decoys; see STAGE3_VOCABULARY.md.
  letterLayout: ['BRACLEC', 'NEADORO', 'RAEOCKI', 'LOHSCAN', 'LPEACAT', 'ETRNERR', 'OTENLOY'],
  vocabulary: ['BREAD', 'COIN', 'SHOP', 'LETTER', 'CLOCK', 'CARRY'],
  // Existing quest dependencies drive availability and NEW QUEST presentation.
  // Hints derive progressive prefixes from targetWord using the existing system.
  // Stage-local simulation owns reaction progress; the renderer only projects it.
  quests: [
    { id: 'town-bread', targetWord: 'BREAD', clue: 'Find something baked that people eat.', worldReactionId: 'town.bread' },
    { id: 'town-coin', targetWord: 'COIN', clue: 'Find a small piece of money.', worldReactionId: 'town.coin' },
    { id: 'town-shop', targetWord: 'SHOP', clue: 'Find a place where people buy things.', worldReactionId: 'town.shop', requires: ['BREAD', 'COIN'] },
    { id: 'town-letter', targetWord: 'LETTER', clue: 'Find something you can write and send to someone.', worldReactionId: 'town.letter' },
    { id: 'town-clock', targetWord: 'CLOCK', clue: 'Find something that tells you the time.', worldReactionId: 'town.clock' },
    { id: 'town-carry', targetWord: 'CARRY', clue: 'You have something to deliver. What should you do with it?', worldReactionId: 'town.carry', requires: ['SHOP', 'LETTER'] }
  ],
  decorations: [], tileTheme: 'town-stone',
  // Translate camera and target together: a small upward framing shift, no tilt or zoom.
  camera: { position: [0, 17, 11.7], target: [0, 0, -.3], verticalSpan: 13, minimumWidth: 14 },
  townBlockout: town
};
