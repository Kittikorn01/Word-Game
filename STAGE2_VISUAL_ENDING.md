# Stage 2 — Wood, Rope Bridge and Climb Ending Polish

This refinement changes only material/bridge presentation and the final journey. The board, target paths, decoys, vocabulary, clues, quest dependencies, Hint/Scan policy, normal movement/selection/backtracking, Stage Intro and Stage 1 remain unchanged. No Git commands were used.

## Wood and bridge

WOOD now reveals twelve elongated warm-brown boards, arranged in three staggered columns/four shallow layers. Dark edges contrast with sawn top faces. Sparse grain strokes and oval knots move with each board. The existing brief pop/settle timing and one-shot state are retained.

The bridge deck is about 0.9 world units wide (previously 1.37), comfortably wider than the player's boots. Twelve individual boards have approximately 0.03-unit gaps and small yaw variations. The deck has a slight center dip; the two rope rails sag more noticeably and bow inward from the four existing bank anchors. Taller post extensions retain those anchor positions. Ten short hanging ropes join rails to the deck. A narrow dark under-deck spine supports the gaps without reading as a broad platform.

Construction retains the 4.8-second simulation timer: supports rise, boards lift from the pile and travel across the river in order, the coil travels toward the crossing and shrinks away, rails and hanging ropes connect, then the deck settles with a brief warm emphasis. Every board is the original material object, so no duplicate wood pile remains. The original ROPE reward timing is unchanged.

No textures, shaders, rope physics, particles or per-frame mesh allocation are introduced. Geometry/materials are shared and owned resources are disposed by the view.

## Ending route and timing

`ForestEndingController` owns a temporary presentation pose with phases `idle → lead → walking → arrival → finished`. It does not rewrite normal player coordinates or the traversal graph. `GameView` displays that pose during the ending and hides the floating letter.

Start requires all original quests completed, CLIMB's route open, bridge built, current reactions/feedback settled and any in-progress manual step committed. If CLIMB was solved before TREE/RIVER, the player can finish those words normally; the ending then starts once. This preserves quest availability and prevents an early CLIMB from locking the player out of the remaining words.

After a 0.4-second lead, deterministic waypoints follow the original walkable route:

| Location | World position (X, Y, Z) |
| --- | --- |
| Start | Current committed player position; no teleport |
| Grid approach | Same X to Z=1, then grid exit at (0.5, 0, 1) |
| Near landing | (1.45, 0, 1.4) |
| Bridge span | X=2, 2.5, 3, 3.5, 4; Z=1.4; Y rises from 0 to 0.25 |
| Far bank | (4.6, 0.25, 1.4) |
| Root foot | (5.6, 0.25, 1.4) |
| Root steps | Six existing route nodes, ascending to (5.6, 1.65, -0.15) |
| Destination | Existing summit at (5.6, 1.65, -1.15), with a slightly wider clearing marker |

The controller also handles starts from every existing traversal node if the player moved off-grid while the last reaction was settling. It follows connected routes to the root foot or continues from a root step already reached.

Walking uses linear interpolation at up to 4 world units/second, with a minimum leg duration of 0.18 seconds. Root steps take at least 0.32 seconds and include a small vertical lift to clear the visible risers. There is no pathfinding, teleport, camera cut or new climbing mechanic. The camera remains unchanged.

## Input and completion

Starting the ending calls the existing runtime lock: movement, mouse/Space selection, quest interaction, Hint/Scan and support input are blocked; held selection is cancelled, Scan is cleared, controls become inert. The script continues independently of manual movement. Normal controls are not unlocked after arrival. Hidden-tab/context-loss pauses retain the scripted position.

The existing completion controller additionally waits for `ending.isFinished`. The ending holds the destination for 0.45 seconds; the existing completion settle contributes another 0.3 seconds, giving approximately **0.75 seconds at the destination before Stage Complete**. Vocabulary recap and overlay layout remain unchanged. The previous Explore Forest callback is no longer supplied; there is no return to word selection after the ending and no Stage 3 implementation.

## Verification and manual checklist

Verified in this session: **98/98 tests pass**; TypeScript and Vite production build pass. Production JavaScript is 655.24 kB before gzip, with the existing chunk-size warning. Browser visual/Console verification remains pending.

Run `npm.cmd test`, `npm.cmd run build`, then `npm.cmd run dev` for manual playtesting through Stage 1 → Stage 2.

Automated coverage includes every one of the 49 grid starts, every traversal-node start, speed/continuity, timestep independence, unchanged normal player state, readiness gates, final arrival/overlay timing, one-shot/reset behavior, wood detail, plank gaps, staged assembly, consumed coils, supporting geometry and camera bounds at desktop/narrow aspect ratios. Existing regression tests cover original quests, paths, movement, Hint/Scan, mouse/Space and Stage 1.

| Test | Manual verification |
| --- | --- |
| 1 WOOD visual | Complete WOOD; inspect elongated warm boards, darker edges, grain and staggered pile. |
| 2 WOOD once | Repeat WOOD; Already found, no extra pile or replay. |
| 3 BRIDGE visual | Complete BRIDGE; inspect narrow deck, separate boards/gaps, four posts, two sagging rope rails and hanging ropes. |
| 4 Assembly | Watch from submission through 4.8 seconds; boards move in sequence, ropes follow, bridge settles. |
| 5 Consumption | After construction, no wood pile or rope coil remains beside the bank. |
| 6 Walkability | Before solving the final words, cross manually from row 5/column 7 and return. No blocked span or fall. |
| 7 CLIMB | Complete CLIMB; original root route opens. |
| 8 No immediate complete | CLIMB correct must not immediately show the result overlay. |
| 9 Input lock | During the lead/walk, try WASD/arrows, mouse hold, Space, Hint/Scan; none may interrupt the script or spend shards. |
| 10 Auto walk | Observe continuous board approach → bridge → far bank → root route. |
| 11 Destination | Player reaches the raised clearing at X=5.6, Y=1.65, Z=-1.15. |
| 12 Complete | After the arrival pause, check STAGE COMPLETE, The Broken Forest Path and TREE/WOOD/ROPE/RIVER/BRIDGE/CLIMB. No Explore Forest return. |
| 13 Regression | Recheck normal quests, Hint/Scan, selection/backtracking, dependencies, intro and Stage 1. Also solve CLIMB before TREE/RIVER, then finish the missing words. |
| 14 Console | Inspect browser Console throughout; also test narrow framing, tab hide/restore and re-enter/reset. |

## Files

New:

- `src/simulation/ForestEndingController.ts`
- `tests/stage2-ending.test.mjs`
- `STAGE2_VISUAL_ENDING.md`

Modified:

- `src/render/ForestReactionView.ts` — wood detail, bridge silhouette, staged presentation, clearing marker.
- `src/render/GameView.ts` — scripted pose/heading rendering and floating-letter visibility.
- `src/app/GameApp.ts` — ending lifecycle, existing input lock and completion gate; removes Explore Forest continuation.
- `src/simulation/types.ts` — optional stage-owned ending presentation state.
- `STAGE2_WORLD_REACTIONS.md` — points to this refinement for current visual/completion behavior.

Build regenerates `dist/` artifacts.

## Known limitations

- Browser inventory is empty in this session. Actual rendered screenshots, live Console, visual readability and real-input playtesting could not be verified here. Geometry/simulation checks do not replace the manual visual pass.
- Wood grain is intentionally sparse geometry, not a detailed texture. Readability at narrow viewport sizes needs visual review.
- The final walk is scripted; no limb/climbing animation or free navigation system was added.
- The existing bundle-size warning above 500 kB remains.
