# Stage 4.0 — The Silent Workshop

Static Three.js workshop blockout, reusing the fixed diorama camera and existing movement/selection runtime.

## Composition (world X/Z)
- Grid: center (0, 1), 7 × 7, tile size 1; temporary alphabet samples.
- Machine: (-3.7, -4.05), olive housing, feed hopper and right-facing output chute.
- Gear area: (-3.7, -3.16), open front service recess, empty ring socket and exposed axle.
- Conveyor: (.75, -4.05), horizontal 5.7-unit belt, end rollers, rails and stationary crate.
- Output: (4.75, -4.05), one receiving tray with end stop and one crate.
- Power: (-4.95, -.95), unlit cabinet with a single conduit to the machine.
- Lever: (-4.9, 1.25), large amber grip tilted at rest for camera readability.
- Ground: 12.6 × 12 chamfered concrete slab, sparse perimeter joints and dark grid border.
- Palette: warm gray, charcoal, muted steel/olive, brown crates, restrained amber accents. Warm ambient lighting; no emissive machine parts.

Named render groups reserve future reaction space only. No update callback, quest, vocabulary paths, dependencies, reaction controller, timer, NPC or interactions were added.

## Entry
Finish Stage 3 and use its existing Next Stage flow to see the Stage 4 intro. In development, use shortcut 4 or /?stage=4. As with other development shortcuts, direct entry skips the transition intro.

## Files
New: src/stages/stage4.ts; src/render/createWorkshopBlockout.ts; tests/stage4-blockout.test.mjs; STAGE4_BLOCKOUT.md; artifacts/stage4/ (review script, screenshots, console and test results).
Modified: src/stages/types.ts; src/stages/registry.ts; src/stages/stage3.ts (nextStageId only); src/render/createDiorama.ts; src/render/GameView.ts (workshop-only lighting/background); src/assets/PrimitiveAssets.ts (owned shared primitives/materials); tests/stage3-blockout.test.mjs (Stage 3 now has a successor).

## Validation
- Production build passes; Vite reports the existing large-chunk warning.
- All 121 tests pass, including Stage 1–3 regression, Stage 3?4 intro contract, empty-stage noncompletion, camera framing and ray tests across all 49 letter surfaces.
- Browser screenshots reviewed at 1440 × 900 and 390 × 844; Stage 1–3 boot captured too.
- No JavaScript runtime errors. Browser resource log retains the missing favicon 404.

## Limitations
Environment blockout only; no completion or vocabulary gameplay in Stage 4. Hint/Scan UI remains the shared existing UI; Hint has no quest and Scan still scans placeholder letters. Narrow screens fit the complete scene by scaling it down, so letters/controls are smaller. Intro screenshot uses the real transition component; progression contract is covered by StageManager tests, not a full manual solve of Stage 3 in this pass.
