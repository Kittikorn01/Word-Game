# Word Search Adventure — Prompt 0

A small English-only woodland diorama foundation. There are no word, quest, inventory, progression, hint, scan, or save systems.

## Run

Use Node.js 22.18+ (or Node 24 LTS) and a desktop browser with WebGL 2 / hardware acceleration. Developed with Node 24.15.0.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite, normally http://127.0.0.1:5173. `npm.cmd` avoids PowerShell execution-policy restrictions on `npm.ps1`. Other shells can use `npm`.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

## Expected scene and controls

The full-screen playfield contains a warm cream 7 × 7 blank tile clearing on a raised grassy island, low-poly trees and rocks outside the walkable area, soft directional shadows, and a small terracotta-coated placeholder explorer. A fixed elevated orthographic camera looks toward the center. Only an unobtrusive scene label and keyboard guide overlay the game.

WASD / arrow keys move along grid axes. Up moves toward the back of the scene; left/right align with screen left/right. Movement is continuous for testing, not tile-stepped. Diagonals are normalized. The player cannot walk beyond tile edges. Camera orientation never follows the player. Mouse has no bindings, pointer lock, or camera controls.

## Stack and architecture

Three.js + strict TypeScript + Vite, following Game Studio's plain 3D path. Three.js is the only runtime dependency. React is unnecessary for the minimal DOM overlay. Physics is unnecessary for a bounded flat test surface; no physics library, GLB loader, or post-processing is included.

Orthographic projection preserves tile sizes at different depths. The fixed camera has no yaw and approximately 55° elevation; this retains depth and visible object sides without confusing cardinal movement. Its frustum fits the island when the viewport changes.

Data flow: keyboard → move action → fixed-step simulation → state → render adapter.

| Files | Responsibility |
| --- | --- |
| `index.html`, `src/main.ts` | English document, bootstrap, HMR disposal |
| `src/app/GameApp.ts` | Composition, 60 Hz simulation loop, visibility/context lifecycle |
| `src/simulation/types.ts` | Serializable state, movement contracts, future letter tile contract |
| `src/simulation/update.ts` | Renderer-independent movement, speed normalization, boundary enforcement |
| `src/input/KeyboardInput.ts` | Physical key → action mapping, blur/visibility cleanup |
| `src/stages/types.ts` | Stage data contract, grid/world mapping, bounds derivation |
| `src/stages/prototype.ts` | One scene's dimensions, spawn, decoration placements |
| `src/assets/PrimitiveAssets.ts` | Stable primitive geometry/material keys, shared ownership and disposal |
| `src/render/GameView.ts` | Renderer, fixed camera, lights, responsive sizing, state presentation |
| `src/render/createDiorama.ts` | Placeholder island, blank tiles, trees and rocks |
| `src/render/createPlayer.ts` | Placeholder character mesh assembly |
| `src/ui/createOverlay.ts`, `src/ui/styles.css` | Small DOM overlay and graphics failure message |
| `src/vite-env.d.ts`, `tsconfig.json` | Strict typing and Vite declarations |
| `package.json`, `package-lock.json`, `.gitignore` | Commands, dependency lock, generated-file exclusions |
| `tests/movement.test.mjs` | Pure simulation/grid checks with Node's built-in test runner |

All files were newly created in an empty project directory. No pre-existing files were replaced and no Git commands were used.

## Extension boundaries

- Simulation and stage data import no Three.js or DOM APIs. Do not use mesh transforms as authoritative gameplay state.
- Coordinates: Y-up; gameplay uses X/Z. Grid column increases along +X; row increases along +Z. The grid is centered at the origin. Default tile size is one world unit. Character pivot is at its feet.
- `LetterTile` defines letter, grid position and `normal | hover | selected | correct` status for a later prompt. It is not instantiated or wired to mechanics now.
- Tile mesh metadata contains only a grid identifier for future picking. Future input can resolve a raycast to this identifier and send an action to simulation.
- A stage is a plain data object passed at bootstrap. This is not a stage manager or progression system.
- All current assets are shared primitives. Future shipped models should use GLB/glTF behind asset keys; add loaders only when assets exist.
- Frame gaps are capped at 100 ms; blur and hidden tabs clear input and timing. Context loss pauses simulation and displays an English status; restoration resumes using current simulation state.
- Renderer pixel ratio is capped at 2, with one 1024px shadow map and no post-processing.

## Validation and manual checklist

Automated movement tests cover normalized diagonals, four boundaries with character radius, update-rate independence, idle/invalid elapsed time and grid/world alignment.

Browser visual/input QA remains pending: this Codex session has no connected browser, and its in-app browser is unavailable. A successful build alone does not verify WebGL output.

1. Open the scene and confirm all 49 blank tiles, explorer, trees, rocks and shadows are visible.
2. Walk with WASD and arrow keys. Try diagonal/opposing inputs and all four edges. Confirm a static camera and no page scrolling.
3. Hold a direction, switch focus/tab, then return. The explorer should not continue walking or jump.
4. Resize the browser to wide, square and narrow proportions. The island should remain visible; narrow screens are viewing-only unless a hardware keyboard is available.
5. Check the browser console for errors. Test WebGL context loss/restoration using browser developer tools where available.

## Deliberate limitations

Primitive art only; no external assets, animation rig, audio, obstacle collision, touch controls or gameplay. Trees and rocks are decoration outside movement bounds. Movement is not yet constrained to cardinal tile steps. The 60 Hz state is presented without interpolation. No GPU performance or browser compatibility claims have been verified in this session.
