# Stage 3 — Exploration Foundation

This replaces the whole-town composition documented in STAGE3_BLOCKOUT.md. Final vocabulary paths, quests, props, carry interactions and world reactions are intentionally absent.

## Layout

- Platform grows from 19 × 17 to 38 × 36 world units, with landscaped margins framing the playable streets.
- Shared navigation coordinates cover 29 × 29 cells (world x/z -14…14). Only explicitly paved cells are walkable; building masses, raised gardens and margins block movement.
- Central plaza: center (0, 1), 9 × 9, mostly neutral pavement with a small practice strip at spawn.
- North/south streets, east/west promenades and plaza cross streets form a connected network. There are no disconnected walkable cells.
- Tile pitch remains 1 unit, matching Stage 1/2. At 1280 × 720 the 13-unit camera span gives roughly 55 px tile pitch, versus 40 px in the previous 17.8-unit composition.

| Future vocabulary area | Temporary letter anchor x, z | Context |
| --- | --- | --- |
| BREAD | -9, -4 | Northwest bakery forecourt |
| SHOP | 8, -5 | Northeast storefront |
| COIN | 10, -3 | Same market forecourt, payment-side reservation |
| LETTER | -10, 5 | West post corner |
| CLOCK | 0, -8 | Northern tower court |
| CARRY | 9, 7 | Southeast depot/destination |

Irregular letter patches sit directly in the paving. SHOP/COIN share one natural forecourt rather than separate boxes. Synthetic temporary letters cannot spell the six future targets; these are layout/input fixtures, not final decoy distributions. Location signs say BAKERY / MARKET / POST / TOWER / DEPOT. Building details remain blockout geometry.

Carry space connects the market pickup reservation through the east cross street and promenade to the depot. No pickup, inventory or delivery trigger exists yet.

## Movement and selection

TownNavigation wraps the existing requestMovement function. Position, movement duration (0.18 seconds per press), interpolation, cardinal adjacency, keyboard mappings and WordSelection remain unchanged. No physics or second player-position system was introduced.

Town walkable data uses `.` for pavement and `#` for blocked cells. The letter layout separately uses A–Z for selectable letters and `.` for cells without letters. LetterGrid accepts holes only when its explicit sparse option is enabled; Stage 1/2 keep the strict dense-board path. Stable tile IDs still use stage/row/column.

Outside letter patches, the player walks normally and no floating letter appears. Hold selection can start only on a letter; while holding, movement into neutral pavement is blocked. Release the hold to resume exploration. A hold cannot begin mid-step toward a neutral destination. Backtracking and submission still use committed logical tile arrivals.

Mouse Hold starts at the player's tile, as before; it is not pointer-drag path selection. Camera motion cannot change the selected word. Hover raycasting refreshes after the rendered camera pose is updated. HUD remains the existing viewport DOM layer.

## Camera

TownCamera is instantiated only for town exploration. Fixed orthographic angle [0,16,11], preferred vertical span 13, no rotation or gameplay zoom. It follows the already interpolated player position with exponential damping (rate 8/second), avoiding snapping to committed grid coordinates. It starts at spawn.

Bounds use the actual orthographic ground footprint, including camera elevation and viewport aspect ratio. The safe rectangle is inset to 44% of platform width/depth from center, excluding the chamfered corners, plus a 0.2-unit safety margin. Both the target and smoothed center are clamped; resize re-clamps immediately. Portrait retains tile scale and shows fewer horizontal cells. Extremely wide aspect ratios reduce vertical span only as needed to keep the entire viewport on the platform. Final portrait HUD usability and ultrawide composition still need visual review.

The tower is taller than surrounding placeholders and helps orientation when within the local view. It is intentionally not visible from every corner of the town.

## Files

New:
- src/simulation/TownNavigation.ts
- src/render/TownCamera.ts
- src/render/TownWayfinding.ts
- tests/stage3-exploration.test.mjs
- STAGE3_EXPLORATION.md

Modified:
- src/stages/stage3.ts — layout, walkable mask and temporary patches
- src/stages/types.ts — opt-in exploration data
- src/grid/LetterGrid.ts — sparse letters with coordinate lookup
- src/app/GameApp.ts — town movement and selection guards; camera-aware hover refresh ordering
- src/render/GameView.ts — town camera, signs, shadow coverage and safe floating-letter handling
- src/main.ts — development-only `?stage=1|2|3` entry
- tests/stage3-blockout.test.mjs — retain stage transition/empty-content checks; replace obsolete whole-map framing assumptions with exploration tests

## Verification and manual playtest

Run `npm.cmd test` and `npm.cmd run build` on Windows. Automated tests cover connectivity of every walkable cell, actual movement between all six contextual anchors, tile scale, sparse lookup, selection/backtracking/neutral boundaries, mouse/Space input adapters, WASD/arrows, camera damping, ground-frustum bounds including resize and extreme aspect ratios, placeholder occlusion at letter centers and player visibility. Existing Stage 1/2 regression tests remain in the suite.

For visual playtest:
1. Run `npm.cmd run dev`; open the printed local URL with `?stage=3`.
2. Spawn is (0,1). Tap keys as before; holding movement keys does not auto-walk.
3. Visit plaza ? bakery ? market ? post ? tower ? depot. Use the streets; gardens/buildings should block movement. Release selection hold before leaving letters.
4. On the practice strip, hold Space or left mouse and press Right, Right, Left. Check Current Word grows then backtracks. Release to submit. Placeholder words produce the existing wrong-word feedback because there are no quests.
5. Walk between patches; there should be no floating letter on plain pavement. Hold during a step leaving a patch to verify it does not start selection.
6. Check camera smoothness at street ends, on resize and while holding selection; compare letter size with `?stage=1` / `?stage=2`.
7. Confirm Quest, Hint, Scan, Word Shards and Current Word stay fixed, pointer hover tracks visible tiles, and browser console has no new errors.
8. Verify normal Stage 1/2 progression at the URL without a stage query. Query shortcuts are ignored in production builds.

Limitations: no connected browser was available in this session, so screenshots, live pointer raycast feel, HUD overlap and browser-console checks could not be verified. Input adapter and geometry tests are not substitutes for that visual playtest. Build reports the existing large-bundle warning. This remains an exploration foundation, not finished Stage 3 content.
