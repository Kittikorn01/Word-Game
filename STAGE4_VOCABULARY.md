# Stage 4.1 - The Silent Workshop vocabulary

Historical vocabulary plan: Stage 4.2 now implements world reactions and gates STOP on finished production. See STAGE4_WORLD_REACTIONS.md for current sequencing and verification. Board, clues and paths below remain unchanged.

Vocabulary content is playable using existing movement, selection, validation, assistance, discovery and completion systems. No machinery reactions or production cycle are wired. Stage 4.0 scenery, grid dimensions/position and camera are preserved.

## Board and solution plan

Coordinates are zero-based (row, column), top to bottom and left to right.

```text
    0 1 2 3 4 5 6
0   G E P E R P S
1   N A L P A O T
2   L R N L I R I
3   E V R N T O P
4   P E R M E W N
5   T A O T R R M
6   S R T N R P E
```

| Word | Path | Shape |
| --- | --- | --- |
| GEAR | (0,0) (0,1) (1,1) (2,1) | Short L |
| REPAIR | (0,4) (0,3) (1,3) (1,4) (2,4) (2,5) | Reverse entry, multiple turns |
| POWER | (3,6) (3,5) (4,5) (4,4) (5,4) | Left/down zigzag |
| LEVER | (2,0) (3,0) (3,1) (4,1) (4,2) | Down/right turns |
| START | (6,0) (5,0) (5,1) (6,1) (6,2) | Up/right/down/right zigzag |
| STOP | (0,6) (1,6) (1,5) (0,5) | Short U with reverse finish |

Every target has exactly one simple cardinal path, verified by exhaustive DFS. No diagonal or reused tile is required. Decoys use familiar puzzle letters and plausible partial prefixes, including extra R/P/E/T, rather than unrelated alphabet filler. The final layout is fixed, never randomized at runtime.

Player start: (6,3), N, outside all solution paths. This retains the suitable approved spawn coordinate after evaluating the new board. All 49 tiles are reachable by actual movement commands.

## Clues and progression

| Word | Clue | Requires |
| --- | --- | --- |
| GEAR | Find a toothed wheel that helps a machine move. | None |
| REPAIR | The machine is broken. What should you do to fix it? | None |
| POWER | The machine needs energy before it can work. | GEAR AND REPAIR |
| LEVER | Find a handle you can push or pull to control a machine. | POWER |
| START | The machine is ready. What should you do to make it begin working? | LEVER |
| STOP | The work is finished. What should you do to make the machine end its movement? | START |

The six fixed HUD slots stay in the table order. Locked rows show only a faded lock/Locked label and cannot be focused. Available/completed rows use clues, not target answers. Existing NEW QUEST discovery timing is preserved; newly unlocked quests become focusable after the presentation finishes. Submission eligibility is dependency-driven and does not depend on focus or banner timing.

Locked submissions return the existing polite feedback: "That word isn't needed here yet." They emit no completion and cannot unlock descendants. START makes STOP available; it does not complete it. Completing STOP finishes the vocabulary stage through the existing completion overlay. No timer/emergency or production-cycle condition is added.

Hints use the existing progressively revealed prefix, e.g. R _ _ _ _ _ then R E _ _ _ _. Only available, discovered quests can request a hint; completed/locked quests show no hint. Scan accepts one letter and highlights every matching tile, including decoys, for three seconds. Neither assistance system reveals solution paths.

## Changed files

- src/stages/stage4.ts: authored board, vocabulary, exact clues and dependencies.
- src/app/GameApp.ts: use existing fixed-slot Quest HUD for the workshop.
- src/ui/styles.css: workshop-only faded locked rows and summary flex matching fixed-slot presentation.
- tests/stage4-blockout.test.mjs: update obsolete empty-stage assertions; retain scenery visibility/framing coverage.

New files:

- tests/stage4-vocabulary.test.mjs: unique paths, actual movement/selection, backtracking, reuse/diagonal rejection, locked submission, both initial completion orders, all unlocks, hints, scan, reachability, completion and unchanged world state.
- STAGE4_VOCABULARY.md: this plan and test guide.
- artifacts/stage4-vocabulary-tests.txt: full automated regression output.

The production build also regenerates dist output.

## Verification and manual playtest

Automated checks: `npm.cmd test` (131/131 passed); `npm.cmd run build` (passed). Regression suite includes Stage 1-3, mouse/Space input adapters, selection, feedback, stage flow and workshop scenery ray/framing checks. Vite reports a bundle-size advisory for the application bundle (>500 kB); no build error.

To test in-browser:

1. Run `npm.cmd run dev` and open the printed local URL with `?stage=4` (development-only shortcut). Confirm 2 available clues and 4 faded Locked slots in fixed order.
2. Navigate to each path's first coordinate without selection. Hold Space (or hold left mouse on the canvas), move with arrows/WASD through the coordinates, then release to submit. Selection starts at the player's current tile, not the hovered tile.
3. Before GEAR/REPAIR, submit POWER, LEVER, START and STOP using their paths. Each must show the locked feedback with progress still 0/6.
4. Complete either GEAR or REPAIR first; POWER stays locked. Complete the other and wait for NEW QUEST presentation. POWER becomes available in slot 3.
5. Complete POWER, LEVER, START in that order. Each reveals the next slot. After START, verify 5/6, STOP available and machinery still stationary.
6. Complete STOP separately. Confirm final completion overlay contains all six vocabulary words.
7. On a fresh run, focus GEAR and use Hint twice: G _ _ _, then G E _ _. Reload and Scan R: all R tiles should highlight briefly, including (6,4). Repeat available-quest hint prefixes through progression as resources permit.
8. Backtrack one step while holding selection; the last letter must disappear. Attempt diagonal and loop reuse; neither appends a tile. Completed paths remain traversable/reselectable before stage completion.
9. Review desktop and narrow HUDs (quest list scrolls), camera, scenery and browser console. Use DEV stage buttons to smoke-test Stages 1-3.

## Known limitations / pending browser evidence

- This session exposes no connected browser (`cua.listBrowsers()` returned an empty list; IAB unavailable). Screenshot review, live HUD/input playthrough and browser-console verification remain pending; automated tests are not represented as visual/browser verification.
- Hint and Scan retain the shared Word Shard economy: a fresh direct stage entry starts with 2 shards; normal progression carries the existing balance. Stage 4 adds no pickups or resource grants. Automated assistance tests provision resources to verify every prefix without altering gameplay economy. Reload fresh previews to test individual assistance actions, or use remaining carried shards.
- Full workshop reactions and the real production-cycle gate for STOP belong to Stage 4.2. There are intentionally no workshop reaction handlers in this pass.
