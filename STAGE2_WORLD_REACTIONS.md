# Stage 2.5 — World Reactions & Bridge Progression

> Wood/bridge visuals and completion behavior are refined in [STAGE2_VISUAL_ENDING.md](STAGE2_VISUAL_ENDING.md). The current flow automatically walks to the raised destination before Stage Complete; the Explore Forest continuation described below is historical.

The tested 7×7 board, all six word paths, decoys, grid movement, selection/backtracking, Hint progression, Scan, camera, intro and Stage 1 layout are preserved. Stage 3 is not implemented. No Git commands were used.

## World reactions and progression

| Word | Reaction | Timing / gate |
| --- | --- | --- |
| TREE | Existing forest trees sway; near-board trees move more clearly | 2 seconds, once |
| WOOD | Twelve wooden planks appear in a settling stack beside the near landing | 0.9 seconds; `hasWood` |
| ROPE | Three low-poly rope coils pop into place beside the near landing | 0.9 seconds; `hasRope` |
| RIVER | Current streaks become broader, brighter and faster, then settle | 2.5 seconds; no movement-rule change |
| BRIDGE | Supports align, the same stacked planks lift and assemble bank-to-bank, coils travel toward the bridge, ropes extend between anchors, deck settles | 4.8 seconds; requires completed WOOD + ROPE |
| CLIMB | Six root-covered steps rise; roots and leaves reveal down the route | 2.8 seconds; requires completed BRIDGE and finished construction |

Materials pulse briefly when both are ready. The bridge uses shared simple geometry, 12 planks and 16 short rope segments; there are no physics bodies, particles or new shaders. Visual objects are allocated once. Rendering projects simulation progress, so duplicates do not spawn or restart anything.

Only TREE, WOOD, ROPE and RIVER are initially discovered. Unlocks use the existing NEW QUEST banner and its 3.5-second discovery presentation. An unlocked quest is valid immediately; its HUD row and Hint become accessible when the existing reveal finishes. Locked submissions receive “That word isn't needed here yet.” Repeated completed words retain ALREADY_COMPLETED feedback.

## Traversal architecture

`ForestTraversal.ts` supplies a stage-owned graph of explicitly walkable points and reciprocal cardinal connections. Original grid movement functions remain unchanged. On-grid commands still use them; only the exit connection dispatches to the route graph. Movement retains one key press per step, a 0.18-second step, and no queued input. No grid coordinates or invisible letter tiles are created outside the board.

After construction, leave from **row 5, column 7 (1-based)** by pressing Right/D. Release mouse/Space selection before leaving. Continue right across the bridge to the far bank and root foot. The clearing also has a short southern loop. Route points have visible supporting surfaces/earth markers; other directions are blocked by the graph.

At the root foot (X=5.6, Z=1.4), Up/W is blocked until the climb reaction finishes. Then six upward steps reach plateau height Y=1.65, and another Up reaches the summit. The final tread overlaps the plateau. Down/S returns to the foot; Left/A returns across the bridge and onto the same grid entry cell. The floating letter and word selection are available only on the letter grid.

Traversal is a small, explicit route network rather than free-roaming collision or physics. Position and height interpolate between approved points. The fixed camera is unchanged.

## Simulation state

`GameState.forest` owns:

- `treeReacted`, `hasWood`, `hasRope`, `riverRecognized`
- `bridgeStarted`, `climbStarted`
- `conditions.bridgeBuilt`, `conditions.climbRouteOpen`
- `progress.tree/wood/rope/river/bridge/climb` (0–1)
- `preparation` (one-time readiness pulse)

`GameState.traversal` owns route nodes, entry coordinate, current/target node and elapsed step time. `WordProgress.worldConditions` is a read-only reference to the same simulation-owned conditions, used by quest availability, validation and the unchanged Hint policy. Scene objects are never a source of truth. Mounting/resetting creates fresh state, progress and routes.

## Completion

The existing controller waits for all six quests, active reactions and feedback to finish. It displays STAGE COMPLETE, The Broken Forest Path and all six discovered words, once.

Since Stage 2 has no next stage, its overlay button becomes **Explore Forest**. This dismisses the overlay and restores controls so players can cross and reach the raised area after solving the final word. It does not re-arm completion or reset discoveries. Stage 1 keeps Next Stage behavior.

## Verification

Verified: `npm.cmd test` passes **92/92 tests**; `npm.cmd run build` passes TypeScript and Vite production build. Vite reports the existing chunk-size warning (651.38 kB before gzip). Browser verification remains pending as noted below.

Run `npm.cmd test` and `npm.cmd run build`. Automated tests cover dependency timing, both material orders, hidden quests, locked validation/Hint, one-shot discovery, duplicate events, reset, traversal gates, return to grid, summit height, supporting geometry, letter occlusion and completion timing. Existing tests retain all six unique word paths and Stage 1 regression coverage.

For manual testing, run `npm.cmd run dev`, finish Stage 1 and enter Stage 2 through its intro. Use the unchanged paths in STAGE2_VOCABULARY.md.

| Case | Procedure and expected result |
| --- | --- |
| 1 Initial quests | Only TREE/WOOD/ROPE/RIVER clues; no available BRIDGE/CLIMB row. |
| 2 TREE | Solve TREE; trees sway once, then settle. |
| 3 WOOD | Solve WOOD; a plank stack appears below the near landing. |
| 4 ROPE | Solve ROPE; coiled rope appears above the near landing. |
| 5 BRIDGE locked | Submit BRIDGE with neither or only one material; not-needed-yet feedback, no completion. |
| 6 BRIDGE unlock | Complete materials in either order; readiness pulse and NEW QUEST, then clue/Hint. |
| 7 BRIDGE build | Solve BRIDGE; materials assemble for 4.8 seconds; no duplicate stack remains. |
| 8 Bridge crossing | Before construction ends, Right from row 5/column 7 is blocked. Afterwards, release selection and walk right over the bridge. Walk back too. |
| 9 CLIMB locked | Submit before BRIDGE or during construction; completion is rejected. |
| 10 CLIMB unlock | After construction, observe NEW QUEST, then clue/Hint. |
| 11 CLIMB reaction | Return to grid and solve CLIMB; roots/steps reveal for 2.8 seconds. |
| 12 Raised access | If completion appears, choose Explore Forest. Cross right to the root foot, then Up seven times; Down and Left return safely. |
| 13 RIVER | Current streaks emphasize the obstacle then return to baseline, with no new hazard. |
| 14 Repeat | Repeat any word, including BRIDGE/CLIMB; Already found, no repeat construction/materials. |
| 15 Hint lock | Locked quests are hidden and cannot be hinted; unlocked clues use existing shard costs/progression. Scan R still finds all six R tiles including decoys. |
| 16 Complete | Finish all words; overlay waits for reactions. Check title/six words; Explore Forest resumes without another completion. Also try TREE or RIVER last. |
| 17 Regression | Check WASD/arrows, mouse hold, Space hold, current word, backtracking, no diagonals, mid-step release, Hint/Scan, blur/visibility pause, intro and Stage 1. Reload/re-enter for fresh state. |
| 18 Console / framing | Inspect Console through the full loop; check desktop/narrow framing and visibility of materials, bridge and root route. |

## Files

New:

- `src/simulation/ForestWorldState.ts`
- `src/simulation/ForestTraversal.ts`
- `src/render/ForestReactionView.ts`
- `tests/stage2-progression.test.mjs`
- `STAGE2_WORLD_REACTIONS.md`

Modified:

- `src/app/GameApp.ts`
- `src/render/GameView.ts`
- `src/render/RiverView.ts`
- `src/stages/stage2.ts`
- `src/stages/types.ts`
- `src/simulation/types.ts`
- `src/simulation/QuestProgress.ts`
- `src/simulation/WordProgress.ts`
- `src/quests/types.ts`
- `src/validation/QuestValidator.ts`
- `src/validation/WordValidator.ts`
- `src/ui/WordSelectionOverlay.ts`
- `src/ui/StageCompleteOverlay.ts`
- `tests/stage2-vocabulary.test.mjs`
- `STAGE2_VOCABULARY.md`

The production build also regenerates `dist/` output.

## Known limitations

- Browser inventory is empty. Screenshots, live Console and visual/manual playtesting remain unverified; geometry/simulation tests do not replace that pass.
- Exploration follows marked routes, not unrestricted free traversal. There is no dedicated climbing character animation.
- Hint/Scan use the carried shard balance; Stage 2 adds no economy changes.
- The existing production chunk-size warning remains (bundle above 500 kB).
