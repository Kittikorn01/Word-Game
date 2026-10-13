# Stage 6.0 — The Word Archive

Static Ancient Underground Archive Chamber, using the existing Three.js primitive assets,
normal grid runtime, fixed orthographic camera, and cutaway diorama architecture.
No quest clues, dependencies, reactions, ending, final message, or completion screen are authored.
Vocabulary is context only: STONE, ABOVE, UNDER, SECRET, READ, EXIT.

## Entry

Run `npm.cmd run dev`, then use DEV / Skip stage **6**, or `?stage=6`.
Direct Stage 6 preview runs the existing intro overlay: **STAGE 6 / The Word Archive**.
Stage Manager and transitions between existing stages remain unchanged.
Stage 5 has no nextStageId; normal Stage 5 → 6 progression is intentionally not connected
because this milestone explicitly preserves Stage 1–5 and stage transitions.
The development preview selector is disabled in production, as before.

## Layout

Coordinates are world X/Z, Y is height, +Z faces the camera. One unit is one tile.

| Area | Position / extent | Initial appearance |
| --- | --- | --- |
| Main grid | center (0, 1), 7×7, tileSize 1; centers X -3…3, Z -2…4 | Light chamfered stone; tile top .105; alphabetical placeholder letters |
| Chamber | 12.6×12, center (0, .3) | Raised stone foundation, muted floor, low side walls, open front and roof |
| Rear masonry | Z -5.25; top 2.665 | Simple stagger-free block courses, two short side pillars |
| Final door | (0, -4.92); frame width 2.94, top 3.11 | Two closed stone leaves, limestone jambs/lintel, restrained gold detail |
| Stone mechanism | (-4.15, -3.83) | Empty socket and separate loose block resting on its own small stone support |
| Loose block | (-4.89, -2.56) | Distinct .68×.7×.68 block; no movement |
| ABOVE / UNDER | aligned X -3.51, near Z -3.8 | Supported upper platform with object at Y 1.91; recessed lower tray at Y .31 |
| Secret compartment | (2.37, -4.98) | Flush sealed stone panel near the bookshelf; no visible contents |
| Archive shelf | (4.26, -4.77) | One modest brown shelf with three rows of old volumes |
| Book altar | (4.6, -2.92) | Low limestone pedestal with a large closed blue-gray book, page edges and clasp |
| Lamps | X ±2.4, Z -5 | Two small amber lanterns; local warm light without particles or bloom |

The lower tray extends toward the camera beyond the shallow upper shelf.
Its exposed front area is checked with camera raycasts, so UNDER remains visible under
the actual fixed camera rather than merely existing inside an opaque pedestal.
The book altar was shifted outward after the occlusion check detected a rear-right tile overlap.

## Color and camera

Muted stone gray, warm limestone, desaturated blue-gray, dark brown,
small ancient gold accents. Light tiles and dark existing letter glyphs preserve grid priority.
Soft cool hemisphere fill plus a gentle warm directional light and two local amber lamps.
No door backlight, glowing runes, fog, or new post-processing.

Camera matches Stage 3–5: position (0, 17, 11.7), target (0, 0, -.3),
verticalSpan 13, minimumWidth 14; no yaw, follow, or exploration controls.
The existing responsive minimum-width rule keeps every landmark in frame on narrow screens.

## Space reserved for later milestones

- STONE: separate movable-stone-block group; short clear lane toward the socket outside the grid.
- ABOVE: upper-platform and upper-object named meshes, supported over the same lower tray;
  available vertical clearance beneath the wall top.
- UNDER: lower-compartment-tray and lower-slot-lip, with a visibly exposed front section.
- SECRET: sealed-secret-compartment group; outward opening clearance on the rear apron,
  away from the board. No hidden contents are instantiated.
- READ: closed-ancient-book group on an isolated side altar; space for covers to open above
  the pedestal. Keep the future book footprint to the right of X 3.5.
- EXIT: two independent closed-door-leaf meshes; rear apron and central approach between
  grid rear edge Z -2.5 and the threshold. A future exit should proceed toward -Z.

These are layout reservations, not animation implementations. Future animation extents,
UI, and player routes still need their own obstruction tests.

## Files

Added: src/stages/stage6.ts, src/render/createArchiveBlockout.ts,
tests/stage6-blockout.test.mjs, STAGE6_BLOCKOUT.md.

Updated: src/stages/types.ts, src/stages/registry.ts, src/assets/PrimitiveAssets.ts,
src/render/createDiorama.ts, src/render/GameView.ts, src/render/LetterGridView.ts,
src/main.ts.

All scene mesh resources remain owned/disposed by PrimitiveAssets. No simulation,
input, assistance, quest, Stage Manager, or Stage 1–5 definition files were changed.

## Validation and limitations

- TypeScript and Vite production build pass; Vite reports its bundle-size advisory.
- Final full suite: 175/175 pass, including all 173 existing regression tests and two Stage 6 checks.
- Stage 6 tests: fixed framing at 1440×900, 390×844, and 16:9; 9 line-of-sight
  samples per tile; visible lower tray; upper/lower projected separation;
  inert quest/ending configuration and no automatic completion.
- No connected browser surface is available in the UI tooling. Screenshots, actual intro
  presentation, lighting appearance, live mouse/Space behavior, and console errors require
  manual browser verification. Geometry and build checks do not establish console cleanliness.
- The board is an alphabet placeholder, not the final vocabulary puzzle. Submitted words
  cannot complete quests; hints have no target. Existing movement and selection adapters run normally.
- No Git commands were used.
