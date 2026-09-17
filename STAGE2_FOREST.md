# Stage 2.2 ? Terrain + Forest Structure

Environment-only refinement of the existing Stage 2. Grid, camera, spawn, river width/level, feedback, HUD, input, intro and gameplay rules are unchanged.

- Six small low-poly trees: three on the left/back perimeter, one on the far bank, two on the raised plateau. No foreground trees. Foliage shadow casting is disabled to protect letter contrast.
- Three rocks, three low shrubs and five small grass patches; explicit placements live in stage2.forestBlockout.nature. No random scattering or animated foliage.
- Main/far ground use chamfered outer corners. River-facing edges remain straight and sealed against the bank slopes. Playable top stays flat at Y=0.
- Raised plateau keeps its height (Y=1.65), with clipped corners and a narrow stone ledge below the turf. No stairs, ladder or climb route.
- River banks use a more varied low-poly contour and an extra slope tier, maintaining the open water channel and existing gentle water motion.
- All nature geometry/materials are shared through PrimitiveAssets and disposed with the existing scene lifecycle.

## Test

Run npm.cmd run build and npm.cmd test. New ray checks sample letters, player and floating-feedback heights across all grid cells to check forest-prop occlusion from the original orthographic camera. Existing camera-bounds, river, selection, progression and Stage 1 tests also run.

Manual: npm.cmd run dev; finish Stage 1; Next Stage; wait through Intro. Inspect forest framing, river banks and raised ledge. Walk/select/backtrack at all grid edges. Check desktop/narrow framing, HUD overlap and Console. Browser screenshots and actual Console remain unverified because no browser was connected.

This is a sparse first environment pass, not final art. Movement is still grid-bound. No bridge, crossing stones, quest objects, vocabulary, interactions or world reactions were added.
