# Stage 2.3 — Bridge Area / Crossing Setup

The existing reserved crossing at X=3, Z=1.4 now has two aligned prepared-earth landings and paired wooden anchor posts. The near landing sits between the grid and the bank at X=2, leaving about 0.245 units from the board. The far landing starts at X=4 on the existing Y=0.25 ground, in front of the raised plateau. There is no climb route.

Four small stone footings and short, uneven wooden support remnants suggest an unfinished or former crossing. All pieces stay on land: the full two-unit reserved span remains empty. No deck, spanning rope, traversal surface, quest prop, trigger, completion state or animation is present. Movement remains limited to the original grid.

The camera, river, forest placements, UI and gameplay systems are unchanged. The setup adds 14 static meshes using existing shared geometry/materials and the existing disposal lifecycle.

## Files

- New: `src/render/createBridgeCrossing.ts`, `STAGE2_CROSSING.md`.
- Modified: `src/render/createForestBlockout.ts`, `src/stages/stage2.ts` (comment only), `tests/forest-structure.test.mjs`.

## Verification

- `npm.cmd run build`: passes; Vite reports a bundle-size warning above 500 kB.
- `npm.cmd test`: checks existing gameplay/stage flow, camera bounds, river and forest, plus crossing/letter occlusion and an empty reserved span.
- Manual: `npm.cmd run dev`, complete Stage 1, choose Next Stage and finish the intro. Inspect the aligned landings to the right of the board, visible water between all anchors, and the far landing below the plateau. Walk/select/backtrack along the right grid edge; confirm the player cannot leave the board. Check Hint/Scan, desktop/narrow framing and browser Console.

Browser visual QA and runtime Console remain unverified: no browser was connected to the available UI tool. Automated geometry checks do not replace visual review of composition. The current area intentionally provides only visual setup for a future bridge prompt.
