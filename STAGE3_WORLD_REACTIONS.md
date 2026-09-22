# Stage 3.3 — Town World Reactions & Busy Town Progression

Stage 3 keeps the exact Stage 3.2 letter layout, paths, decoys, player start, camera, ground and landmark footprints. The town now progresses through stage-local simulation state and lightweight visual reactions. No NPCs, inventory, physics, audio system or new player controls are added.

## Quest progression

Initial available/discovered quests: **BREAD, COIN, LETTER, CLOCK**.

- **SHOP** requires completed BREAD + COIN.
- **CARRY** requires completed SHOP + LETTER.

The existing `requires`, QuestProgress, QuestValidator, NEW QUEST banner and HUD discovery timing implement these rules. Locked words receive `That word isn't needed here yet.` and cannot complete. Repeated completed words receive ALREADY_COMPLETED and never re-emit a completion event. Hints use only discovered AVAILABLE quests. Scan remains the same independent letter locator and still finds every C, including the decoy.

## Meaningful changes in the town

| Word | Reaction | Duration / permanent result |
| --- | --- | --- |
| BREAD | Three rounded loaves with pale scoring rise onto the bakery counter | 1.25 s; loaves remain |
| COIN | Round gold disk with raised rim and mark spins and bounces onto the shop shelf | 1.6 s; coin remains, distinct from crystal Word Shards |
| SHOP | Broad shutter retracts upward, existing awning extends, display receives a warm emissive fill | 2.1 s; storefront stays open |
| LETTER | Cream envelope with outline, V flap and seal appears, hovers toward the mailbox, shrinks into the slot; flag lifts | 2.4 s; flag stays raised |
| CLOCK | Face pulses and hands rotate into a readable near-10:10 arrangement | 2 s; hands continue slowly using simulation time |
| CARRY | One wrapped parcel at the shop-side pickup point follows the player along the clear right plaza strip, then settles on the existing delivery crate | Approximately 7 s from the normal CARRY end tile, including pauses; destination ring and parcel remain |

The original loose decorative parcel is replaced by the animated parcel, rather than duplicated. The destination crate and its bands remain. No geometry or particles spawn during updates.

## Simulation and ending

`TownWorldState` owns `breadReady`, `coinPlaced`, `shopOpen`, `letterDelivered`, `clockActive`, `carryRequested`, `carryCompleted`, started flags, reaction progress and clock elapsed time. Flags/progress reset on each mount. Duplicate events do not reset progress.

`TownEndingController` follows the existing forest ending's presentation-pose boundary without rewriting the forest controller or normal grid movement. It waits for all six completed quests, settled reactions/word feedback and a committed player step, then:

1. Locks the existing runtime input and highlights the parcel (0.45 s lead).
2. Walks from the current tile to the right board edge and up the clear strip to the parcel.
3. Lifts the parcel toward the player (0.5 s).
4. Walks through deterministic waypoints to the delivery destination.
5. Places the parcel on the crate with a small arc (0.8 s).
6. Holds the delivered pose (0.65 s), marks `carryCompleted`, then lets the existing completion controller add its 0.3 s settle.

While locked, WASD/arrows, Space/mouse selection, Hint and Scan are disabled; the scan is cleared. The simulated grid player coordinate is not rewritten. The existing overlay shows **STAGE COMPLETE**, **A Busy Little Town**, and all six vocabulary words in the original vocabulary order.

### CARRY before CLOCK

CARRY is available as soon as SHOP + LETTER complete, even if CLOCK is unfinished. An early CARRY submission is accepted and queued, while normal play remains available for CLOCK. The final delivery starts after all six words and reactions settle. This follows the Stage 2 CLIMB ending rule and avoids stranding an unfinished quest behind the ending input lock. There is no extra CARRY prerequisite or replay requirement.

## Validation and manual test cases

Run `npm.cmd run dev -- --port 5177` and visit `http://127.0.0.1:5177/?stage=3` (or DEV shortcut 3). Use the unchanged word coordinates in [STAGE3_VOCABULARY.md](STAGE3_VOCABULARY.md). Hold Space or the left mouse button, move with arrows/WASD, then release.

1. **Initial:** four clues only; shop shutter down, no reaction bread/coin/mail, clock frozen, parcel hidden.
2. **Locked SHOP/CARRY:** spell each before its prerequisites; confirm NOT NEEDED feedback and no world change.
3. **BREAD:** solve and watch three scored loaves appear at the bakery. Repeat BREAD; confirm Already found and no respawn.
4. **COIN:** solve and watch the round gold coin spin/settle. After BREAD + COIN, watch NEW QUEST and SHOP enter the list.
5. **SHOP:** solve; watch shutter, awning and warm display. If LETTER is unfinished, CARRY stays hidden.
6. **LETTER:** solve; watch envelope flight and mailbox flag. After SHOP + LETTER, watch CARRY discovery and parcel appearance near the shop.
7. **CLOCK:** solve; watch the 2 s activation and continued hand movement.
8. **CARRY ending:** solve after the other five. Confirm no immediate completion overlay; observe pickup, parcel following, delivery and pause. Try movement, mouse, Space, Hint and Scan during the sequence: none may interrupt it.
9. **Completion:** overlay appears only after delivery; title and six words are present, once.
10. **Early CARRY:** reload and solve BREAD, COIN, SHOP, LETTER, CARRY. Confirm no ending lock yet. Solve CLOCK; final delivery should then play and complete normally.
11. **Hints/scan:** locked clues cannot be focused/hinted. Once discovered, SHOP/CARRY use normal progressive hints. Scan C still finds five tiles independently of quest locks. Existing shard costs/balance apply; reload direct entry for isolated checks.
12. **Regression:** all six paths still work; backtracking removes the last selected tile. Visit Stage 1 and Stage 2 and test their established flow. Intro, grid input and validation code are unchanged.
13. **Lifecycle:** reload or switch stages; state/props return to initial values. No duplicated reactions or lingering scripted pose.
14. **Responsive:** inspect desktop and narrow layout; the existing narrow quest list scrolls.

Automated tests include frozen grid/camera data, all six unique orthogonal paths, locked validation/hints, scan, timed discovery, duplicate events, all 720 word-attempt permutations, all 49 ending start positions, continuous scripted motion, dt-independent ending, completion gating and bounded render geometry. The browser script exercises real keyboard/mouse selection, backtracking, locked submissions, duplicates, hints/scan, each reaction, ending input lock, completion and Stage 1/2 boot.

## Files

New:
- `src/simulation/TownWorldState.ts`
- `src/simulation/TownEndingController.ts`
- `src/render/TownReactionView.ts`
- `tests/stage3-reactions.test.mjs`
- `STAGE3_WORLD_REACTIONS.md`
- QA script/screenshots/console report in `artifacts/stage3-reactions/`; test log `artifacts/stage3-reactions-tests.txt`.

Modified:
- `src/stages/stage3.ts`: opt into town progression and add the two quest dependencies only.
- `src/stages/types.ts`: optional town progression flag.
- `src/simulation/types.ts`: optional town state and ending state.
- `src/app/GameApp.ts`: mount/update stage-local controllers, use existing input lock and completion gate.
- `src/render/GameView.ts`: mount/project/dispose town view and optional town scripted pose.
- `tests/stage3-vocabulary.test.mjs`, `tests/stage3-blockout.test.mjs`: replace Stage 3.2 all-available assumptions with dependency-aware setup.
- `STAGE3_VOCABULARY.md`: mark Stage 3.2 availability/placeholder notes as historical.

Stage 1/2 source, shared dependency/validation/selection/input/scan code, Stage Intro and static town geometry remain unchanged.

## Known limits

- The delivery is a scripted presentation; it does not introduce playable off-grid exploration or an inventory.
- An early CARRY waits for the remaining words, as described above.
- No audio/chime, NPCs, crowds or physics. Continued clock motion is cosmetic.
- The existing resource economy and narrow-screen HUD remain in place.
- Vite retains its existing >500 kB bundle advisory. The development server's pre-existing missing `/favicon.ico` is logged separately from gameplay errors.

## Verification results

- Final `npm.cmd test`: **118 passed, 0 failed**, including Stage 1/2 regression tests and the unchanged Stage 3 word-path checks.
- `npm.cmd run build`: passed TypeScript checking and Vite production build.
- `node artifacts/stage3-reactions/review.mjs`: passed real browser flow (initial locks, locked submissions, unlock banners, repeat feedback, Hint/Scan, keyboard/mouse/backtracking, six reactions, ending lock and delayed completion, Stage 1/2 boot).
- Desktop reaction/ending and narrow initial screenshots visually reviewed. `console.json` contains **no gameplay errors** and separately records the existing favicon 404.
- No Git commands were used.
