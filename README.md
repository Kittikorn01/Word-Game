# Stage 1 — Cottage narrative and exit interaction

Continues the existing Three.js + TypeScript + Vite runtime. Letter layout, word routes, movement, selection, feedback semantics, camera and cottage shell remain intact. No new dependencies, Git commands, Stage 2, stage loading, transition, inventory UI or save system.

## Run

```powershell
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

Open Vite's local URL (normally http://127.0.0.1:5173). Desktop keyboard/mouse and WebGL 2 are required. Reload starts fresh.

## Quest flow

QuestDefinition now optionally contains `requires`, a list of prerequisite target words in stage data. Stage 1 OPEN requires DOOR. Definition creation normalizes/snapshots dependencies and rejects missing/cyclic prerequisites.

`questStatus` derives LOCKED / AVAILABLE / COMPLETED from the existing completedWords ledger. Initial available clues correspond to KEY, LIGHT, WATER, BOOK and DOOR. OPEN is locked and absent from DOM rows, navigation and the discovered-quest count. The HUD shows 0/5 initially; it does not reveal a sixth quest in advance.

QuestValidator evaluates prerequisites against the current completion ledger on every submission. OPEN before DOOR is WRONG, uses the existing Not Needed feedback, and emits no completion event or deferred credit. The player must build OPEN again after unlocking it. Focus never gates validation.

DOOR completion commits progress and queues a discovery presentation. OPEN is immediately AVAILABLE for validation. WorldReactionController reveals the door after the existing 0.25-second feedback lead. After 0.3 seconds, the nonmodal NEW QUEST banner appears with the clue only:

> The way out is still closed. What should you do?

The dark cocoa panel with gold edge fades/slides/scales in, stays fully readable for about 2.75 seconds, then fades out. Total visible presentation is 3.2 seconds. Simulation-owned presentation timing adds OPEN to discoveredIds/list afterward, preserving existing row nodes, focus and scroll. Completing OPEN during its presentation remains valid; its eventual list row then shows Completed. No UI code unlocks quests.

The banner ignores pointer input. On narrow screens it temporarily occupies the quest-panel area while the list is hidden, then restores the list; it does not stop movement or require dismissal. Reduced-motion CSS removes its transform animation. Timers pause while the document is hidden/context is lost; blur clears input without losing pending progress.

## World reactions

- KEY: appears above the existing entry-side stand, rises/briefly hovers, flies toward the moving player's rendered position and shrinks away. Gameplay owns `keyAcquisitionProgress` over 1.8 seconds and sets `hasKey=true` at completion. No renderer callback awards the key. Duplicates cannot restart it; reconstructing acquired state keeps the key hidden.
- LIGHT: existing floor lamp plus two rear-wall sconces switch on with 0.18-second staggered emissive ramps. Room ambience follows after a short lead, finishing over 1.4 seconds. Still only three actual lights: one hemisphere, one directional window light (the only shadow caster), and the existing unshadowed lamp point light. Sconces use emission only. Tile minimum brightness remains.
- WATER: seven reusable low-poly blue drops fall briefly over the indoor pot. Foliage changes from dull brown to green, the wilt straightens and the plant grows/bounces. Drops disappear when the reaction ends. No simulation of water or growing particle allocations.
- BOOK: the reading pedestal becomes a small shelf present from the start. A subdued book is already there; solving BOOK slides it toward the room, lifts and tilts it slightly. No pickup.
- DOOR: reveals the existing door in the cottage wall and unlocks OPEN.
- OPEN: opens the revealed door with the existing smooth hinge animation.

World gameplay flags remain keySpawned, lightOn, plantWatered, bookSpawned, doorRevealed, doorOpen; hasKey and keyAcquisitionProgress are added for acquisition. `bookSpawned` is retained as the existing state key and now means the shelf book has reacted. Object/material creation remains in the asset factory, independently replaceable with production models.

## Exit interaction and completion boundary

Stage data defines an exit tile list and `requiresKey`. Stage 1 uses **one-based (row 1, column 7)**, the top-right R tile in front of the rear door. The board is not expanded; gameplay never requires walking off-grid to reach the decorative door.

`GameState.exit` owns nearby, canInteractWithExit and completed. ExitInteraction uses committed player tile and rejects mid-step interaction. It requires revealed/open door, all six quest statuses COMPLETED and hasKey. Before ready, standing on the exit tile by the revealed door displays neutral information: `There is still something to do here.` Once ready it displays `Press E to leave`. Neither prompt appears away from the exit. Completion hides the prompt.

ExitInput handles E press edges, rejects key repeat/modifier shortcuts/typing fields, and clears on blur/visibility changes. GameApp additionally suppresses E during selection, resolving word feedback, hidden document or graphics loss. Release selection/wait for feedback, then press E.

`interactWithExit` rechecks eligibility and commits exit.completed **before** calling `onStageCompleted(stageId)`. Repeated taps, held E and callback reentry cannot emit twice. There is no auto-completion just from solving all quests or standing near the door.

Public integration boundary (optional fifth argument; existing callers remain compatible):

```ts
startGame(host, stage1, onWordSubmitted, onQuestCompleted, onStageCompleted);
```

For manual event observation, temporarily replace the existing startGame call in src/main.ts (do not start a second runtime):

```ts
const dispose = startGame(document.querySelector<HTMLElement>('#app')!, stage1,
  undefined, undefined, stageId => console.count(`Stage completed: ${stageId}`));
```

The shipped main uses the default no-op observer. After E, the scene stays loaded and the prompt disappears; no Stage Complete modal or transition is implemented. Completion can also be inspected with a breakpoint inside interactWithExit. The callback is the intended next-prompt boundary.

## Unchanged board and developer routes

Coordinates below are **one-based (row,column)**. Spawn = (5,4). Walk to the starting tile without mouse held; hold left mouse on canvas, tap one movement per arrival, then release.

```text
K E Y X L A R
K E X N I S O
W A T X G N O
M Q E S H A D
B O R X T E L
Z O K O P X I
Q I F L E N Q
```

| Word | Path | Directions |
| --- | --- | --- |
| KEY | (1,1) -> (1,2) -> (1,3) | Right, Right |
| LIGHT | (1,5) -> (2,5) -> (3,5) -> (4,5) -> (5,5) | Down x4 |
| WATER | (3,1) -> (3,2) -> (3,3) -> (4,3) -> (5,3) | Right, Right, Down, Down |
| BOOK | (5,1) -> (5,2) -> (6,2) -> (6,3) | Right, Down, Right |
| DOOR | (4,7) -> (3,7) -> (2,7) -> (1,7) | Up x3 |
| OPEN | (6,4) -> (6,5) -> (7,5) -> (7,6) | Right, Down, Right; accepted only after DOOR |

## Manual acceptance tests 1-14

Reload between cases needing fresh state. Use the route table above.

1. Initial quests: five clue rows, 0/5 progress. No OPEN clue/target or hidden sixth row. Focus each row; existing focused clue behavior remains.
2. OPEN before DOOR: build OPEN. Expect red `That word isn't needed here.`, no completion/door opening. Repeat after waiting: still WRONG.
3. DOOR: solve it. Door reveals, then gold NEW QUEST presentation displays the new clue. No green/red discovery styling.
4. Presentation: read the full new clue, wait roughly three seconds. No OK button or gameplay pause. After fade, sixth clue row appears and can be focused. Try narrow viewport and reduced motion. Repeat DOOR: amber Already found, no second banner.
5. OPEN after unlock: build OPEN again. Expect CORRECT and door opening. Earlier locked attempt must not have credited it.
6. KEY: solve, watch rise/hover/flight to player/disappearance. Move during flight to check tracking. Repeat KEY: Already found with no second flight. hasKey remains true after acquisition.
7. LIGHT: solve in fresh dim cottage. Watch floor lamp then two sconces illuminate and cool room become warm. Check every letter remains readable throughout; repeating LIGHT does not restart sequence.
8. WATER: solve, watch blue drops above indoor pot, color change and straightening/growth. Drops finish; plant stays healthy. Repeat: no repeated watering.
9. BOOK: shelf/book exist before solving. Solve and watch the shelf book move outward/up and tilt. No collected book or inventory panel.
10. Door before all quests: solve DOOR then OPEN, leave other quests undone. Walk to (1,7). Expect `There is still something to do here.` E cannot finish the stage. Step away: prompt hides.
11. All complete: solve remaining quests, wait for key acquisition and reactions. No auto-finish. Walk to (1,7), stop, and expect `Press E to leave`.
12. Press E: observe optional callback/breakpoint above. It receives stage-1-letter-clearing once. Prompt disappears; cottage remains loaded and no Stage 2 or transition runs.
13. Duplicate events: rapidly press/release E, hold E, walk away and return. Completion count stays one. Also test E mid-step and while selecting: no premature completion.
14. Regression: test all six paths, one input/one tile, held-key nonrepeat, no diagonal, floating letter on arrival, hold/release selection, KEY backtrack Y->E, nonconsecutive reuse rejection, later selection reuse, current word/path, correct/wrong/already feedback, quest focus/scroll, blur/resume during banner/key flight, resize and browser console. Cottage composition and letter layout remain intact.

## Changed files in this refinement

New:
- src/simulation/ExitInteraction.ts
- src/input/ExitInput.ts
- src/ui/NarrativeOverlay.ts
- tests/narrative.test.mjs

Modified:
- src/quests/types.ts
- src/simulation/QuestProgress.ts
- src/validation/QuestValidator.ts
- src/stages/stage1.ts
- src/stages/types.ts
- src/simulation/types.ts
- src/simulation/update.ts
- src/simulation/WorldReactionController.ts
- src/ui/QuestOverlay.ts
- src/ui/styles.css
- src/app/GameApp.ts
- src/assets/createWorldObjects.ts
- src/render/WorldReactionView.ts
- src/render/GameView.ts
- src/render/CottageLighting.ts
- tests/quests.test.mjs
- tests/world-reactions.test.mjs
- README.md
- dist/ regenerated by build

## Verification / limitations

41/41 tests pass: existing movement/grid/selection/validation regressions, prerequisite gating and data validation, discovery timing, key acquisition, scene-object reaction assertions, all 720 submission orders with early OPEN rejected and resubmitted after DOOR, exit requirement/mid-step checks, one-shot callback, and E-input repeat/typing/teardown checks. Initial OPEN is no longer a valid quest order; previous renderer state-projection coverage remains as a defensive check, not a gameplay rule.

TypeScript and production build pass. Existing bundle warning remains around 579 kB minified / 148 kB gzip. A transient source encoding error during development was corrected; final build passes.

Browser inventory reports no connected browsers. Actual WebGL screenshots, perceived animation clarity, responsive overlay placement, native browser console and performance remain unverified. Automated scene/state tests do not replace manual visual QA. Placeholder objects use simple primitive geometry. No inventory UI, persistence, pickup button, stage loading or transition was added.

## Cottage art refinement (after Prompts 5 / 5.1 / 5.2)

Presentation-only update; Prompt 6 is not started. Grid, word paths, inputs, quest
order/HUD, validation, key acquisition timing, DOOR -> OPEN and exit rules remain
unchanged. Only plant/bookshelf positions changed in the stage definition.

- Thick cream back wall, timber corners/caps/baseboards, stepped partial side
  walls and an open front. Wood floor stays low contrast.
- Future door stays at (2.8, -4.65), aligned with the original exit area. A matching
  opaque plaster section and continuous skirting conceal it initially. DOOR lifts
  that section into the lintel while the timber frame/leaf materialize over 0.9s.
  Threshold is part of the hidden door, with no initial mat or frame. OPEN keeps
  the existing hinge animation and simulation dependency.
- Front-facing three-tier bookshelf at (0.15, -4.12), 27 muted books present at
  startup. BOOK slides one volume into the room, lifts/tilts it and leaves a warm
  highlight over 1.5s. Pot and book materials are independent.
- KEY has no table/pedestal. Its presentation anchor is captured beside the
  player, followed by pop/rise, brief rotating hover and a flight toward the
  player's current position. The existing controller grants hasKey at 1.8s;
  the view never writes gameplay state.
- Three wall sconces replace the floor lamp. Each has an actual warm point light
  and sequential bulb emission. Existing CottageLighting supplies the gradual
  cool-to-warm ambient transition. Perimeter props do not cast shadows on letters.
- Dry potted plant at (-3.95, -3.8), next to the left wall/window area; existing
  watering droplets and healthy green growth remain.

### Validation and manual playtest

Run `npm.cmd test` and `npm.cmd run build`. The 45 tests cover existing gameplay
regressions plus wall continuity, reveal/open geometry, bookshelf isolation,
key convergence and camera-ray checks over 49 letter footprints throughout
perimeter reactions. These geometry checks are not screenshot verification.

Run `npm.cmd run dev` and open the local URL Vite prints. Refresh for each initial
state check. With the original input mapping:

1. Inspect the initial room: solid ordinary wall at back right, no door frame,
   gap or entry mat; full shelf, dry plant, three unlit wall lamps.
2. Solve KEY and watch the complete 1.8s acquisition, including while moving.
3. Solve BOOK: one book slides outward/upward, settles highlighted; the pot
   must not glow. Solve LIGHT: lamps activate in sequence, room becomes warm.
4. Solve WATER: falling droplets stop and the healthy plant persists.
5. Try OPEN before DOOR: it remains locked. Solve DOOR: wall retracts and door
   appears. Solve OPEN after unlock: leaf swings open in the wall.
6. Check movement, selection/backtracking, wrong/duplicate submissions, quest
   HUD, all letters and selection paths, including the rear row and small window
   sizes. Finish all quests, move to row 0 / column 6, press E to leave once.
7. Keep browser DevTools console open and check for runtime/WebGL errors.

Current limitation: the connected browser tool reported no available browser,
so live screenshots, perceived brightness/animation readability and browser
console verification remain pending manual playtest. Assets are procedural
low-poly placeholders, not imported art. Build reports the >500 kB chunk warning;
no new dependency was introduced. No Git commands were used.
