# Word Search Adventure - Prompt 2.1

Refines the existing Three.js + TypeScript + Vite project. No dependencies added, no Git commands, no scene redesign. No word validation, quests, hints, scan or world reactions.

## Run

```powershell
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

Open the URL printed by Vite (normally http://127.0.0.1:5173). Requires a desktop keyboard/mouse and WebGL 2 browser.

## Movement and input contract

- One fresh W/A/S/D or arrow keydown requests one cardinal tile. Holding does not repeat: release and press again.
- First received keydown wins. Commands received during a step are discarded, without a queue. Simultaneous keys can never produce diagonal motion.
- A step takes approximately 0.18 seconds, with smoothstep interpolation between tile centers. Simulation runs at 60 Hz. No velocity integration, diagonal normalization or floating-point gameplay position remains.
- Out-of-board commands do nothing. Every finished step ends at the exact target tile center.
- `player.currentTile` is the authoritative committed row/column; `targetTile` is the pending destination. Current tile stays at the source during animation and changes once on arrival.
- Stage data now has `playerStart: { row: 4, column: 3 }`, preserving the former spawn center (0,1). Change row/column in stage data to change spawn. Invalid coordinates fail early.
- Mouse down anywhere on the canvas starts from the committed current tile, regardless of pointer position. DOM UI blocks starts; tile raycasting remains only for hover.
- Pressing mouse during a step starts with its source tile. Releasing during a step submits only the letters already reached; movement still finishes and cannot add a letter after submission.
- Blur/visibility/capture cancellation clears selection. Hidden-tab/context-loss animation pauses and resumes its pending step on return; it does not discard or compound the destination. No new movement/selection starts during context loss.

## Data flow

KeyboardInput -> requestMovement -> currentTile/targetTile/elapsed -> GameView derives interpolated world position.

Mouse hold on canvas -> WordSelection.start(currentPlayerTile).

Movement arrival -> PlayerTileTracker reads committed row/column -> existing WordSelection adjacency/backtrack/reuse rules -> tile renderer / connection path / current-word HUD.

FloatingLetterView reads the committed tile letter and follows the rendered player position. Its camera-facing Sprite has a small warm backing plate above the hat. During transit it keeps the source letter, then changes on arrival. It shows one letter (where the player is), while the existing top-center HUD shows the complete selected word.

## Files

New:
- `src/render/FloatingLetterView.ts`: billboard canvas texture, backing plate, current-letter updates and resource disposal.

Modified:
- `src/simulation/types.ts`: coordinate-based player state.
- `src/simulation/update.ts`: validated spawn, cardinal step request, input lock and arrival commit; replaces free-motion speed/radius/velocity and boundary-clamp logic.
- `src/input/KeyboardInput.ts`: keydown commands instead of continuously reading held axes; ignores repeats.
- `src/simulation/PlayerTileTracker.ts`: committed grid lookup instead of per-frame world-to-grid detection.
- `src/stages/types.ts`, `src/stages/prototype.ts`: data-driven playerStart replaces world-coordinate spawn; Stage 1 inherits it.
- `src/selection/WordSelection.ts`: start accepts current tile only; path/backtracking/reuse/submit unchanged.
- `src/input/WordSelectionInput.ts`: start callback no longer receives pointer coordinates; capture/release/cancel safety retained.
- `src/app/GameApp.ts`: connects grid movement, current-tile selection and lifecycle.
- `src/render/GameView.ts`: derives render position from coordinates/step progress, adds/disposes floating letter.
- `src/ui/createOverlay.ts`: English instructions for tap-to-step and canvas hold.
- `tests/movement.test.mjs`: replaces obsolete free-movement expectations with grid/input/integration checks.
- `tests/selection.test.mjs`: updated start/tracker contract; existing rule/safety coverage retained.
- `README.md`; generated `dist/` output.

No files deleted in this refinement. The removed Prompt 1 click/C/R debug interaction stays removed. Grid, hover, selected visuals, connection path, camera, lighting and decoration retain their existing implementation.

## Submission boundary / placeholder

`startGame(host, stage, onWordSubmitted)` retains the optional callback and frozen snapshot:

```js
{
  word: 'KEY',
  selectedTileIds: ['stage-1-letter-clearing:0:0', 'stage-1-letter-clearing:0:1', 'stage-1-letter-clearing:0:2'],
  path: [
    { id: 'stage-1-letter-clearing:0:0', letter: 'K', row: 0, column: 0 },
    { id: 'stage-1-letter-clearing:0:1', letter: 'E', row: 0, column: 1 },
    { id: 'stage-1-letter-clearing:0:2', letter: 'Y', row: 0, column: 2 }
  ]
}
```

Release clears selection and shows neutral `Submitted: KEY` for 1.8 seconds. No correct/wrong state is triggered. This neutral feedback and callback remain the future validation integration point; Prompt 3 is not implemented.

## Manual tests

From original spawn (4,3), tap Up four times and Left three times, waiting for each step, to reach K at (0,0). E/Y are (0,1)/(0,2). Use fresh presses for each step.

| Test | Actions | Expected |
| --- | --- | --- |
| 1 One step | At K, press Right once | Animate to E, stop at center; no further movement |
| 2 Hold | Hold Right through and after a step | Exactly one step; release/repress for another |
| 3 No diagonal | From an interior tile press W and D together | First received direction only; next input during animation discarded |
| 4 Boundary | At K press Up or Left; repeat at other edges | Remain at same center, letter and selection unchanged |
| 5 Auto start | At K aim at empty canvas ground, hold left mouse | Select K immediately without aiming at K |
| 6 Build KEY | Hold mouse; tap Right, wait; tap Right, wait | UI K -> KE -> KEY, selected K/E/Y and two path segments |
| 7 Backtrack | While holding at Y, tap Left, wait | Return E, remove Y/latest segment; word KE |
| 8 Floating letter | Walk K -> E -> Y without selection | Marker above head changes K -> E -> Y on arrival and faces camera |
| 9 Separate roles | Build KEY and remain holding at Y | Top HUD KEY; above-head marker Y |
| 10 UI click | Hold on scene label, controls or word HUD | No new selection; then a fresh canvas press starts normally |
| 11 Submit | Build KEY, release left mouse | One KEY submission, temporary Submitted: KEY, no judgment |
| 12 Stability | Rapid/multiple presses; hold/release mouse midway; blur/switch tabs; release outside canvas | No diagonal, extra queued steps, out-of-grid position or permanent mid-tile stop; release uses committed path, cancellation clears; inspect console |

Also check hover priority while selecting, repeated backtracks, non-previous tile reuse, and wide/square/narrow rendering. Preserve the Stage 1 board:

```text
KEYAMXZ
NLIGHTP
WATERUS
CBOOKVN
DOORHIA
TOPENEF
QILFEOQ
```

## Verification / limitations

19/19 automated tests pass, including grid data, cardinal movement, input lock/repeat suppression, boundaries, KEY/backtracking, mid-animation start/release and pointer safety. TypeScript and production build pass. The existing Vite large-chunk warning remains (about 561 kB minified / 142 kB gzip).

Connected-browser inventory again returned no browsers. Actual browser playtest, console verification, responsive visual QA and floating-letter/path screenshots remain unverified; the manual cases above are needed. EventTarget input tests do not establish browser-native pointer-capture behavior. No touch/mobile controls added. Fast presses during a step are intentionally discarded rather than buffered.
