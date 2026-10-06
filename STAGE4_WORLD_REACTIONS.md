# Stage 4.2 - World Reactions & Machine Sequence

The Silent Workshop now projects every target word into a persistent machine state. The Stage 4.1 board, paths, decoys, player start, exact clues, camera, landmark layout and core input are unchanged. No audio system, physics, timer challenge, hazards or new buttons were added.

## Sequence

| Word / phase | Visual result | Duration |
| --- | --- | --- |
| GEAR | A 12-tooth gear pops into view, arcs into the existing front socket, settles and stays installed. No continuous movement before power/start. | 1.4 s |
| REPAIR | The raised, tilted machine cap aligns into its repaired pose. Machine stays unpowered. Either initial word can be first. | 1.2 s |
| POWER | Cabinet lamp becomes warm amber, one short glow travels along the existing conduit, machine indicator lights and gear turns slightly into ready position. | 1.6 s |
| LEVER | Highlighted grip moves from -0.55 to +0.60 radians; ready indicator acknowledges the operation. Conveyor stays stopped. | 1 s |
| START | Gear accelerates first, drive link moves, rollers and belt seams accelerate later. Crates depart after startup. | 1.8 s |
| Production | Two crates travel on fixed paths with staggered departures, arrive in separate receiving slots and settle with a subtle receiving-platform dip. | 7 s after startup |
| STOP | Lever returns toward rest; gear, drive link, rollers and belt smoothly decelerate. Indicators settle to safe powered idle. Received crates stay in place. | 1.4 s |
| Completion | Existing word feedback finishes and the existing 0.3 s completion settle runs after all reactions stop. | Existing shared behavior |

These durations are animation pacing, not deadlines. After production the empty conveyor continues safely until the player finds STOP, however long that takes. No countdown, automatic STOP, repeated crate spawning, failure or falling crates exists.

## State and gating

`WorkshopWorldState` is mounted only for the workshop environment. It owns:

- `gearInstalled`, `machineRepaired`, `powerOn`, `leverActivated`
- `machineStarted`, `productionFinished`, `machineStopped`
- once-only requested flags, normalized reaction progress, production elapsed time
- gear/belt speed and integrated gear angle/belt travel

Quest completion events request reactions idempotently. POWER waits for both installation and repair animations; LEVER waits for power; START waits for lever. This also handles unusually rapid valid submissions without overlapping incompatible visual states.

STOP retains its START prerequisite and adds the existing `requiresWorld` gate `workshop.productionFinished`. The simulation publishes that condition only after both crates arrive and settle. Existing availability refresh, NEW QUEST presentation, fixed HUD order, locked feedback, Hint and Scan remain in use. No validation algorithm changed. World-condition types were extended narrowly for the new gate.

Completion uses the existing `StageCompletionController` and includes the workshop controller's busy state. STOP submission cannot display Stage Complete while shutdown is active. On completion, the existing overlay displays The Silent Workshop and all six discovered words.

The renderer never feeds positions, visibility or mesh state back into gameplay. Its meshes and cloned materials are allocated once per mount and disposed with `GameView`. Existing placeholder crate meshes are hidden and replaced by exactly two animated crates; no props accumulate. Every fresh mount/DEV stage reload constructs fresh state, resets the world gate and recreates the view. There are no asynchronous callbacks or timers to survive disposal.

## Files

New:

- `src/simulation/WorkshopWorldState.ts`
- `src/render/WorkshopReactionView.ts`
- `tests/stage4-reactions.test.mjs`
- `STAGE4_WORLD_REACTIONS.md`
- `artifacts/stage4-reactions-tests.txt`

Modified:

- `src/stages/stage4.ts`: STOP production condition and updated stage comments only.
- `src/simulation/types.ts`: optional workshop state.
- `src/simulation/WordProgress.ts`: read-only world-condition shape supports the workshop gate.
- `src/quests/types.ts`: add the workshop condition to the allowed gate names.
- `src/app/GameApp.ts`: stage-local controller creation, quest events, update, completion busy integration.
- `src/render/GameView.ts`: workshop view creation, projection and disposal.
- `tests/stage4-vocabulary.test.mjs`: run workshop reactions between vocabulary checks to satisfy the new production gate.
- `STAGE4_VOCABULARY.md`: note that Stage 4.2 supersedes its historical reaction/gating limitations.

Build regenerates `dist/` output. No Git commands were run.

## Verification

`npm.cmd test`: 135/135 passed, including Stage 1-3 and input/selection/assistance regressions.

New sequence tests cover both initial word orders, zero-motion initial state, queued reaction prerequisites, startup acceleration, production-gated STOP submissions/hints, indefinite safe waiting, shutdown deceleration, delayed completion, duplicate words/events, deterministic timestep behavior, invalid timestep rejection and fresh-state reset.

Renderer tests instantiate the real diorama and reaction view without WebGL: verify toothed gear, repair pose, lights, lever, exactly two crates, output positions, stationary after-state, state immutability and disposal. Ray checks across phase samples confirm tile centers remain unobstructed at desktop and narrow camera aspects. Existing blockout tests retain full letter-surface and framing checks.

`npm.cmd run build`: TypeScript and production bundle pass. Vite retains the >500 kB bundle advisory.

## Manual test guide

Run `npm.cmd run dev`, open the printed URL with `?stage=4`. Use the paths in `STAGE4_VOCABULARY.md`; move to the first tile, hold Space or left mouse, move through the word, then release.

1. Initial: confirm missing gear, tilted cap, dark indicators, resting handle, two waiting crates and stationary belt.
2. GEAR: observe pop/installation; wait and confirm it stays still. REPAIR: observe cap alignment and no power. Reload and reverse their order.
3. POWER: observe cabinet light, conduit pulse, machine light and small gear turn. Confirm conveyor still stationary.
4. LEVER: observe a clear handle pull and ready light. Confirm conveyor still stationary.
5. START: observe staggered acceleration rather than all moving on one frame. During startup/production, STOP must remain Locked and reject submission politely.
6. Watch both crates arrive/settle; STOP unlocks via NEW QUEST. Wait as long as desired: crates stay received, belt runs safely, no countdown/failure appears.
7. STOP: observe handle movement and slowing belt/gear, then safe idle. Stage Complete appears only after shutdown and feedback finish, listing all six words.
8. Before final completion, resubmit earlier completed words: ALREADY_COMPLETED, no repeated installation/repair/power/lever/start and no extra crates.
9. Reload or use DEV stage shortcuts and return: initial workshop state must reset. Check Hint/Scan with available Word Shards, Space/mouse selection, WASD/arrows and backtracking. Smoke-test Stages 1-3.
10. Review desktop/narrow screenshots, visible animation readability and browser console for errors.

## Known limitations

No connected browser is exposed in this session (`cua.listBrowsers()` returned `[]`). Live playthrough, screenshots, perceived animation readability and browser-console checks remain pending; scene tests do not replace visual QA. The moving crates and energy pulse are scripted rather than physics-driven. Audio remains absent because no audio integration was added. Stage 4.1's shared Word Shard economy remains unchanged.
