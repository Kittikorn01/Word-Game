# Assistance refinement — current implementation

This document supersedes the original Prompt 7 pickup/popup instructions.

## HUD and input

- Main quests remain on the upper-left objective board: pinned timber edge, warm paper, progress badge, focused row, clue, and the existing progressive hint display.
- Assistance is a separate lower-right tool tray, clear of the bottom controls. It includes shard count, Hint (cost 1), and an always-visible single-letter Scan field with Go (cost 1). Enter submits; Escape clears/blurs. There is no scan popup or scan-open gameplay lock.
- A small Room Discoveries strip inside the assistance tray lists the two optional objectives and their reward. It does not enter the main quest list or progress count. On short desktop screens only the contextual instruction remains, keeping the tray compact.
- Unavailable action buttons use `aria-disabled` and guarded handlers to explain why an attempt cannot proceed. Scan input is disabled when assistance is unavailable. Hint and scan rules, costs, query, priority, and durations remain unchanged.
- DOM clicks never start canvas selection. Typing in Scan does not move the player or trigger E interactions. Movement keys work again after clicking a HUD button; input focus is cleared after a successful scan. No changes were made to grid movement, word selection, validation, quest progression, completion, or transition algorithms.

## Support objectives and rewards

Stage data now defines `supportObjectives` with unique `id`, `label`, `tile: { row, column }`, and positive integer `reward`. Stage 1 has no `wordShardSpawns`.

| Objective | Interaction tile (zero-based) | Reward |
| --- | --- | --- |
| Inspect the bookshelf. | row 0, column 3 | 1 Word Shard |
| Examine the window. | row 0, column 1 | 1 Word Shard |

Walk to the indicated north-wall tile, release movement, and press E. The contextual strip shows `[E]` when an incomplete objective is in range. Merely arriving does nothing. `ExitInput` supplies the existing press-edge interaction pattern (no repeats, typing fields, or modifier shortcuts). The support request also rejects selection, word feedback, movement in progress, stage locks, hidden tabs, and context loss.

`SupportObjectives` owns completed IDs and a short reward-presentation timer. It marks completion before adding to the shared player resource, preventing duplicate rewards. Main quests and words are never passed to this class. Support completion is optional and is not a stage-completion requirement. No clue, target word, or solution path is revealed by support interactions.

The initial balance remains 2 shards. Each of the two support objectives grants one extra shard; there are no free world pickups. The previous pickup utility/schema remain for compatibility but are not wired into any stage runtime acquisition or rendering flow.

`PlayerResources` still lives at app scope and carries across stages. Support state is stage-local and recreated on a new mount, like other stage state. The current flow is forward-only; reload resets the session and its initial balance. No save/persistent objective ledger was added. Stage 2 remains a placeholder.

## Item presentation

Word Shard is now a reward-only crystal above the inspection tile for 2.5 seconds: elongated lavender silhouette, stronger emissive glow, upward float/rotation, and five small orbiting sparkles. It is not a collectible waiting on the floor.

Key has a separate brighter gold material with modest metallic response and warm emission. Its existing pop, hover, acquisition path and timing remain. Six pooled motes trail it during flight and clear when acquired. Effects do not add shadow lights, bloom passes, or particle engines, and do not extend stage-completion waits.

## Test guide

Run `npm.cmd run dev`, open the printed local URL, and refresh for a fresh balance of 2. A movement key must be released between steps.

| Test | Procedure / expected result |
| --- | --- |
| 1 Split HUD | Quest board upper-left and assistance tray lower-right are visibly separate. Inspect desktop and narrow/short viewport sizes. |
| 2 Hint | Click Hint from the tray with KEY focused: balance 2→1, clue displays `K _ _`. Click again: `K E _`. Switch quests and return; hint persists. Completed/locked/capped hints cannot spend. |
| 3 Inline Scan | Refresh. Immediately type k in the visible Scan field: K appears. Go or Enter spends 1 and highlights all three K tiles for 3 seconds. Try KEY, AA, 1, ?, whitespace, and invalid paste: no spend. Type W/A/S/D/E in the field: no movement or support interaction. |
| 4 Disabled state | Spend both starting shards; Hint/Go are visibly disabled and Scan cannot be edited. Attempt a button: small no-shard feedback. Also hold a word selection and verify assistance is unavailable. |
| 5 Item polish | Complete KEY to see the bright gold key and short trail. Complete a support objective to see the floating lavender reward crystal and sparkles; it clears after 2.5 seconds. |
| 6 Support examples | From spawn (4,3), press W four times to (0,3) by the bookshelf. The strip shows `[E] Inspect the bookshelf.` Move A twice to (0,1) to find the window objective. |
| 7 Reward | At either tile, wait for arrival and press E: balance +1, reward message, objective check mark, crystal animation. Main quest progress stays unchanged. |
| 8 No duplication | Hold/repeat E, release and press again, walk away and back: no further reward from a completed objective. Walking over either tile without E gives nothing. E during selection/feedback/movement also gives nothing. |
| 9 Visual direction | Check wood/paper quest board, gold tool buttons, lavender resource count, readable inline Scan and small optional-objective strip. Check that game floor and bottom controls remain usable. |
| 10 Regression | Exercise movement bounds, hold selection, backtracking, wrong/correct/duplicate submissions, DOOR→OPEN dependency, world reactions, completion recap, NEXT STAGE, and carried shard count. Complete a stage without support objectives: completion must still work. Check browser console for errors. |

## Files changed in this refinement

New:
- `src/simulation/SupportObjectives.ts`
- `src/ui/SupportOverlay.ts`
- `tests/support-objectives.test.mjs`

Modified:
- `src/ui/AssistanceOverlay.ts`, `src/ui/styles.css`
- `src/stages/types.ts`, `src/stages/stage1.ts`
- `src/app/GameApp.ts`, `src/render/GameView.ts`
- `src/render/WordShardView.ts`
- `src/assets/createWorldObjects.ts`, `src/render/WorldReactionView.ts`
- `tests/assistance.test.mjs`, `ASSISTANCE_SYSTEM.md`
- Generated production output in `dist/`

## Verification / limitations

Build and automated tests are run with `npm.cmd run build` and `npm.cmd test`. Support tests verify explicit interaction, no automatic collection, one-time rewards, blocked requests, unchanged main state, valid data, and crystal visibility/cleanup. Existing hint/scan and gameplay regression tests remain in the suite.

No browser is exposed to automation in this session (`apps: [], browsers: []`). Screenshot review, rendered HUD overlap, keyboard/pointer playtesting in the actual browser, and console verification still require manual testing. Material/primitive effects are prototype presentation, not final art. Vite retains the >500 kB bundle advisory. No Git commands were used.
