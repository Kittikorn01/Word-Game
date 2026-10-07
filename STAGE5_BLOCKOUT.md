# Stage 5.0 � The Storm

Environment blockout only. Existing Stage 4 destination ID `stage-5-placeholder` is retained for compatibility; its title is now The Storm and it mounts the normal scene runtime. Stage Manager and Stage 1�4 data are unchanged.

## Composition
- One 7 � 7 grid, tile size 1, center (0, 1) in world X/Z. Temporary alphabet letters, no final vocabulary paths.
- Open-front wooden lean-to centered (-0.5, -4.3), above the board. Rear windbreak, sloping roof and two visible front posts establish a refuge rather than a house.
- Unlit stone fire ring at (-3.85, -2.95), at the shelter's front-left apron. No flame, glow or fire controller.
- Covered ground and resting mat at (0.85, -3.55) reserve the future warm/safe destination.
- Arrival trail enters at the lower-right edge, runs beside the grid and bends toward the shelter. Visual reservation only, no traveler or navigation sequence.
- Five low-poly pines frame the clearing, with three rocks and four shallow puddles. No dense foliage.
- Fixed orthographic camera matches Stage 4 framing: position (0,17,11.7), target (0,0,-0.3), vertical span 13, minimum width 14.

## Weather and palette
Cool blue-gray backdrop and overcast lighting, muted green trees, wet gray-brown ground, natural brown shelter, muted tan cloth bedroll with a beige pillow. Ambient sparse drizzle is confined to side bands, away from the projected letter grid. Weather has no word-event inputs. No lightning or storm escalation yet. No warm local lighting yet.

## Files
New: src/render/createStormBlockout.ts, src/render/StormWeatherView.ts, tests/stage5-blockout.test.mjs, STAGE5_BLOCKOUT.md.
Updated: src/stages/stage5.ts, src/stages/types.ts, src/assets/PrimitiveAssets.ts, src/render/createDiorama.ts, src/render/GameView.ts, tests/stage4-reactions.test.mjs (replace obsolete placeholder expectation).
Review evidence: artifacts/stage5/, artifacts/stage5-tests.txt.

## Verification
- npm.cmd run build passed (Vite reports its >500 kB bundle advisory).
- npm.cmd test: 141 passed, 0 failed.
- Geometry tests cover desktop, narrow and 16:9 camera bounds and 9 ray samples per letter tile to detect environmental obstruction.
- Existing Stage 4 transition test verifies fade, disposal, Stage 5 intro, mount and unlock in order.
- Headless Chromium loads Stage 1�5 and captures screenshots; Stage 5 also captured at 390 � 844 and with the existing intro overlay.
- No page exceptions. Console records one favicon.ico 404 on first load; no Stage 5 application error.

## Limits / manual review
No quests, hint/scan configuration, dependencies, vocabulary reactions, traveler, or stage-completion content was added. Shared movement, selection and assistance UI remain as before. The dev shortcut opens directly (as for other stages); normal Stage 4 progression shows the intro. Narrow screens fit the entire diorama, so letters shrink with the existing camera policy. Weather is a simple presentation-only drizzle and puddle blockout, not a full weather simulation. Roof/floor proportions favor readability and are not final architectural detailing.

Preview with the existing DEV Stage 5 button or ?stage=5 on the Vite dev server. No Git commands were used.

## Rest area / fire pit composition refinement
- Rest area keeps its original position and footprint. Raised the mat to a 0.13-unit cloth cushion, with a single small chamfered pillow. Stage-5-only rough, flat-shaded materials: mat #b5a084, pillow #c6b69c; no emissive material or warm light.
- Fire area moved to X/Z (-3.85, -2.95), outside the shelter front-left corner. A shallow compact-soil disk anchors the existing nine-stone ring; two crossed logs now sit at separate heights. No flame, extra wood pile, or reaction logic.
- Source edits: src/render/createStormBlockout.ts and Stage-5-only material entries in src/assets/PrimitiveAssets.ts. Shared resource ownership/disposal is unchanged.
- Verification: full existing test suite passed; TypeScript check and Vite production build passed (existing >500 kB bundle advisory). Existing grid raycast and framing tests passed for desktop, narrow and 16:9. Browser smoke loaded Stages 1–5; screenshots reviewed for Stage 5 desktop and 390 × 844. No new console errors or page exceptions; baseline favicon 404 remains.
- Evidence: artifacts/stage5-rest-polish/ includes before.png, stage-5.png, narrow.png, console.json and build.json. No Git commands used.
