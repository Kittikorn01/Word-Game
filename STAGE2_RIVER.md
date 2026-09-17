# Stage 2.1 ? River Foundation

Supersedes the dry-trench portion of STAGE2_BLOCKOUT.md. Gameplay, grid, spawn, camera, HUD, intro and stage lifecycle remain unchanged.

- Placement: original X 2?4, Z -4.5?4.5; channel width 2, length 9.
- Water: muted teal, surface Y -0.38, bed Y -0.85. Opaque shallow volume avoids transparency sorting and gives the diorama ends visible depth.
- Banks: angular earth slopes connect Main Ground Y 0 and Far Ground Y 0.25 to the shoreline, with submerged toes. Small contour offsets leave approximately 1.5 units of open water. No added rocks or plants.
- Motion: nine low-opacity highlights flow toward +Z at approximately 0.18 units/second, shrinking at the ends before wrapping. One instanced draw for highlights; four river draw calls total, no water shadow casting, particles, reflection pass, custom shader or physics.
- Previous crossing bank markers are removed. Future bridge footprint remains data only; no bridge geometry or traversable connection exists.
- Tuning: forestBlockout.river in src/stages/stage2.ts controls source zone, level, bank inset, speed and color.

## Verification

Run npm.cmd run build and npm.cmd test. Automated checks cover reserved-zone bounds, water height, separation from the board, flow wrapping, GPU resource disposal, existing camera projection and gameplay regressions.

Manual: npm.cmd run dev; complete Stage 1; Next Stage; wait for Intro; verify teal water with gentle highlights between the original banks, no crossing markers or bridge, readable board and unchanged HUD. Resize and inspect Console. No connected browser was available during implementation, so screenshots, actual appearance and runtime Console remain unverified.

## Limitations

Visual environment only. Movement remains restricted to the existing grid. No crossing, collision changes, quests, vocabulary, interactions or world reactions. The water is deliberately opaque; underwater detail, refraction and realistic waves are not implemented. The surrounding forest remains a simple blockout.
