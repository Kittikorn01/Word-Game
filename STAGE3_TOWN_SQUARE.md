# Stage 3: simplified town square

This composition pass supersedes the prior town-square layout and the historical exploration/blockout notes.

## Composition

- Grid stays 7 x 7 with tileSize 1, matching Stage 1/2. Origin (0, 1), starting tile, temporary letters, vocabulary and quests are unchanged.
- Fixed camera: position [0, 17, 11.3], target [0, 0, -.7], verticalSpan 13 (Stage 1 default), minimumWidth 14. No follow, zoom or exploration behavior.
- At 1440 x 900 the board is approximately 481 px wide, up from 391 px: about 23% larger. Stage 2 uses span 12 at this aspect, so Stage 3 tiles are about 8% smaller than Stage 2 and match Stage 1 horizontally.
- Platform reduced from 16 x 15 to 12.6 x 12. One subtle 7.25 x 7.25 paving slab supports the board.
- Bakery upper left and Shop upper right: complete buildings scaled to 70%, shallower roofs, simple solid awnings. Counters, striped awnings and bakery chimney removed.
- Clock remains the tallest landmark at top center, with reduced shaft/crown/face dimensions and static hands.
- Lower-left mailbox is a small box on a post. Lower-right delivery is one small banded crate; no depot, shelf or building.
- Removed 36 perimeter stones, outer plaza edging, separate zone pads, forecourts, four connecting paving strips and three curb fragments.
- Planters reduced from four to two; shrubs reduced from twelve to two. No new props, words, quests, reactions or animation.

## Files in this pass

Modified: src/stages/stage3.ts, src/render/createTownBlockout.ts, STAGE3_TOWN_SQUARE.md.
New review artifacts only: artifacts/stage3-refine/review.mjs, console.json, stage-1-desktop.png, stage-2-desktop.png, stage-3-desktop.png, stage-3-narrow.png, selection.png. The review script uses the local Playwright installation; adjust its import on another machine.
No new runtime files. No core-system or Stage 1/2 changes. No Git commands used.

## Verification

- npm.cmd run build passed (existing bundle-size warning).
- npm.cmd test passed: 102/102, covering core input, selection/backtracking, assistance, validation, Stage 1/2 progression and transitions.
- Existing Stage 3 projection tests pass for desktop, portrait and ultrawide: all landmarks fit and no building bounds cover letter centers.
- Headless Chrome screenshots reviewed for the new desktop composition, selected path and portrait layout; Stage 1/2 boot screenshots also captured.
- No JavaScript page errors. Console only reports the existing /favicon.ico 404.

## Manual review

Run npm.cmd run dev and open /?stage=3 on the printed local URL. Compare /?stage=1 and /?stage=2 at the same viewport. Check all letters and the three upper landmarks, mailbox lower left, crate lower right. Hold Space or left mouse and move with WASD/arrows, backtrack and release. Scan A; confirm the camera stays fixed.

## Known limitations

Final vocabulary/reactions are intentionally absent: Hint has no quest target, submissions do not complete quests, and Stage 3 does not complete. Portrait fits the whole environment and therefore has smaller letters. Existing submission feedback covers the board center on portrait, and the current-word HUD can overlap the clock cap during selection. Shared HUD behavior is unchanged.
