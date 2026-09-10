# Word Search Adventure — Prompt 1

Continues the existing Three.js + TypeScript + Vite foundation. No dependencies added, no Git commands used. The 7 × 7 island, orthographic camera, lighting, decoration and continuous WASD/arrow movement retain their original settings.

## Run

From this folder, with dependencies already installed:

```powershell
npm.cmd run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:5173). For a fresh dependency installation use `npm.cmd ci`. Node 22.18+ / Node 24 and a WebGL 2 browser are required.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

## Architecture

GameApp composes stage data → LetterGrid and keyboard → movement simulation, then presents state through GameView. Simulation remains at 60 Hz. Grid modules import no Three.js or DOM APIs.

- `src/stages/stage1.ts`: deterministic layout and vocabulary, reusing prototype dimensions/spawn/decorations.
- `src/grid/types.ts`: Tile ID, row, column, uppercase letter, logical world center and state contracts.
- `src/grid/LetterGrid.ts`: creation/validation, ID and coordinate lookup, cardinal adjacency, world mapping, selection state and feedback timer.
- `src/render/LetterGridView.ts`: data-generated tile bodies, cached CanvasTexture letters, lift/color/pulse animation and raycasting adapter. Shared letter textures are disposed on teardown. Fixed picking proxies keep hover stable while tiles lift; only these proxies are raycast, so decoration and lettering cannot block input.
- `src/input/TilePointerInput.ts`: pointer coordinates → picked ID → hovered ID; clears on leave/cancel/blur/visibility change and refreshes after resize.
- `src/debug/TileDebugControls.ts`: temporary click/C/R input binding, isolated from movement and future word selection.
- `tests/grid.test.mjs`: test-only DFS proves solvability; adjacency, state and mapping checks.

Tile state is NORMAL / SELECTED / CORRECT. Hover is separate (`grid.hoveredTileId`), so pointer exit cannot discard selection. Effective visual priority is CORRECT > SELECTED > HOVER > NORMAL. CORRECT lasts 0.9 seconds, then returns to NORMAL (or HOVER if the pointer is still there). Rendering reads state without writing gameplay data.

Grid coordinates are zero-based. +column = +X, +row = +Z, Y is height. Existing `gridToWorld(column, row, grid)` remains the forward mapping. `grid.worldToGrid({x,z})` and `grid.tileAtWorld(state.player)` perform inverse lookup. Cell boundaries are half-open: minimum included, maximum excluded; small visual gaps belong to the logical cell. Logical world positions stay fixed during animation. Player movement is still continuous and is not elevated by feedback tiles.

## Stage 1 proof

Rows run from the back of the scene to the front:

```text
KEYAMXZ
NLIGHTP
WATERUS
CBOOKVN
DOORHIA
TOPENEF
QILFEOQ
```

Example paths, inclusive endpoints `(row,column)`:

| Word | Path |
| --- | --- |
| KEY | (0,0) → (0,1) → (0,2) |
| LIGHT | (1,1) → (1,2) → (1,3) → (1,4) → (1,5) |
| WATER | (2,0) → (2,1) → (2,2) → (2,3) → (2,4) |
| BOOK | (3,1) → (3,2) → (3,3) → (3,4) |
| DOOR | (4,0) → (4,1) → (4,2) → (4,3) |
| OPEN | (5,1) → (5,2) → (5,3) → (5,4) |

`npm.cmd test` independently searches the actual board, prints one valid path per word and disallows diagonal steps and tile reuse. It may find a different valid path. There is no runtime word validator.

## Manual visual/input check

1. Open the scene: 49 cream tiles with centered dark uppercase letters (NORMAL). Check I/L/E/F/O/Q on the front row.
2. Move the pointer over a tile: brighter cream and small lift (HOVER). Move off the board: normal again.
3. Click: warm amber and a higher lift (SELECTED). Leave the tile: selection persists. Click again: selection clears. Select multiple independent tiles if desired.
4. Press C: selected tiles turn soft green, rise and pulse, then settle after 0.9 seconds. This is only a debug trigger, not a correct-answer check.
5. Press R: all selection/feedback clears. A tile still under the pointer resumes hover.
6. Walk using both WASD and arrows, diagonals/opposing directions, all edges and blur/refocus. Camera and environment should remain unchanged.
7. Resize wide/square/narrow; check board framing and hint overlap. Small portrait viewports naturally make letters smaller; keyboard remains necessary for movement.
8. Check browser developer console for errors and test context loss/restoration if desired.

## Validation and limitations

Automated tests: 15/15 passed, including all existing movement checks. TypeScript and production build passed. Vite reports a bundle-size warning (approximately 548 kB minified / 139 kB gzip); this is not a build failure.

Visual screenshots, actual mouse/keyboard browser playtest and browser-console verification remain pending: the connected browser tool reports `No browser is available`. Build/test success is not proof of visual quality or an error-free browser console.

The click/C/R binding and small debug hint are temporary and should be removed/replaced in Prompt 2. No hold/drag selection, selection path, connecting lines, word UI, runtime word validation, quests, world reactions or progression were added. Lettering uses system bold Courier New/monospace, with no font download. Player and decorations intentionally do not block tile picking; player geometry can visually cover a letter as it walks across the board.

## File changes

New: `src/stages/stage1.ts`, `src/grid/types.ts`, `src/grid/LetterGrid.ts`, `src/render/LetterGridView.ts`, `src/input/TilePointerInput.ts`, `src/debug/TileDebugControls.ts`, `tests/grid.test.mjs`.

Modified: `src/stages/types.ts`, `src/simulation/types.ts`, `src/render/createDiorama.ts`, `src/render/GameView.ts`, `src/app/GameApp.ts`, `src/main.ts`, `src/ui/createOverlay.ts`, `src/ui/styles.css`, `README.md`. Build output in `dist/` is regenerated by Vite.
