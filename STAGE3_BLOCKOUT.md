# Stage 3.0.1 — Expanded Town Layout

Stage: **A Busy Little Town**. Layout/blockout only. Per the scope clarification,
movement remains on the letter grid: town streets reserve physical space for
future exploration but do not enable off-grid traversal. No vocabulary paths,
quests, NPCs, world reactions, delivery logic or ending were added.

## Changes from Stage 3.0

- Platform grows from 13 × 12 to 19 × 17 world units: 2.07× the bounding area.
  The clipped corners make it a crafted raised diorama, not an infinite plane.
- Plaza grows from 8.4 × 8.4 to 11.2 × 10.2. Grid stays 7 × 7 with unit tiles,
  its original origin, letters and spawn. Grid/plaza bounding-area ratio drops
  from 69% to 43%; grid/platform ratio drops from 31% to 15%.
- Side apron grows from 0.7 to 2.1 units; front/rear apron is 1.7/1.5 units.
  Cream edging, chamfered paving and intersecting streets break up the square.
- Larger zone reservations have separate building masses and open forecourts.
  Bakery/shop sit along the rear town edge facing the plaza; mail/delivery sit
  at the sides facing inward. Broad facade bands show their orientation.
- Clock has a plinth, narrow shaft, projecting crown and terracotta cap; total
  height 4.57 units. It is deliberately unfinished, without a clock face.
- Six low garden reservations frame streets and leave scenery capacity.

## Layout (world X/Z; negative Z = rear / screen upper area)

| Area | Center X/Z | Reservation / footprint |
| --- | --- | --- |
| Raised town platform | 0 / 0 | 19 × 17; thickness 0.7 plus ground 0.08 |
| Central square | 0 / 0.6 | 11.2 × 10.2 |
| Letter grid | 0 / 0.5 | 7 × 7; one-unit tiles |
| Bakery, upper left | -6.8 / -5.5 | 4.4 × 4.5; rear mass 3.8 × 2.4 |
| Shop, upper right | 6.8 / -5.5 | 4.4 × 4.5; rear mass 3.8 × 2.4 |
| Mail, lower left | -7 / 2.6 | 4 × 3.8; low side mass |
| Clock, upper center | 0 / -6.1 | 4.2 × 4; tower center 0 / -6.9 |
| Carry destination, lower right | 7 / 4.9 | 4 × 4; low side mass |

Player starts at row 6, column 3, world (0, 3.5), unchanged. No future
street is blocked by the spawn.

## Street and carry foundation

The north street joins bakery, clock court and shop. West/east promenades
connect it to the south street, forming a loop entirely outside the grid.
Mail has a short west lane; delivery opens onto the east/south intersection.
An offset arrival apron extends the front plaza. Main streets are 1.8 units
wide; the mail connector is 1.8 units deep.

The future carry reservation begins at the shop forecourt (6.8, -4.4), goes
south to the cross street at Z=-0.1, turns west to the east promenade at
X=4.7, passes beside the low garden, then goes south to Z=5.4 and east to the
delivery forecourt at X=6.3. Approximate centerline length is 13.5 units.
The subtle paving uses the same street material: no arrows, quest markers,
interaction trigger, destination reward or carry gameplay is present.

## Camera and readability

Fixed orthographic camera, no yaw or dynamic camera changes:
position (0,22,16), target (0,0,-0.4), vertical span 17.8, minimum width 21.
The slightly lower elevation preserves depth while fitting the expanded town
and tower. At 1280×720, tile pitch is approximately 40.4 px horizontally and
32.4 px in projected depth (previous horizontal pitch: 56.3 px). The larger
composition necessarily makes letters smaller; tile size itself is unchanged.
At 1440×900 the horizontal pitch is approximately 50.6 px. Portrait fits the
whole town but has small letters (~18.6 px pitch at 390×844).

Automated projection checks cover every environment mesh at 1440×900,
1280×720 and 390×844, and ensure tall massing does not cover letter centers.
These checks do not replace screenshot-based approval of font readability,
shadows, HUD overlap or visual composition.

## Data and files

All placement remains in `src/stages/stage3.ts`: identity/title, grid, spawn,
camera, platform, plaza, zone anchors, mass/forecourt footprints, facade facing,
paths, gardens and carry reservations. `TownBlockout` types describe those data.
The renderer consumes them; no runtime movement or progression code changed.
Shared chamfered slab geometry is disposed by the existing PrimitiveAssets owner.

New files: **none**.

Modified:
- `src/stages/stage3.ts` — expanded town data and camera.
- `src/stages/types.ts` — typed mass, forecourt, facing, path and garden data.
- `src/render/createTownBlockout.ts` — plaza, streets, massing and border rendering.
- `src/assets/PrimitiveAssets.ts` — shared chamfered slab geometry.
- `tests/stage3-blockout.test.mjs` — layout connectivity/clearance and revised camera checks.
- `STAGE3_BLOCKOUT.md` — this record and test guide.

Build also regenerates `dist/`. Stage 1/2 definitions, Stage Manager, Intro,
completion, movement, selection, validation, Hint and Scan were not edited.

## Verification

- `npm.cmd run build`: passes. Existing Vite warning: bundle exceeds 500 kB.
- `npm.cmd test`: **102 passed**, including Stage 1/2 regressions and Stage 2 →
  Stage 3 intro sequencing, unchanged grid spawn/movement, empty-stage
  non-completion, and town camera bounds/letter-center occlusion checks.
- New spatial test samples the reserved paving with 0.22-unit obstacle
  clearance, excluding the grid. All five forecourts and street centers are
  connected; the future carry centerline remains clear of massing/gardens.
  This verifies layout space, not playable off-grid movement.
- Browser visual/console checks are **pending**: browser inventory was empty;
  creating an in-app browser returned `Browser is not available: iab`.
  No claim of a completed visual playtest or zero browser console errors.

## Manual acceptance test

1. Run `npm.cmd run dev` and open the printed local URL.
2. Finish Stage 2 and select Next Stage. Confirm the unchanged intro:
   **STAGE 3 / A Busy Little Town**.
3. Confirm the expanded diorama, clear central plaza, five zone reservations,
   rear tower silhouette and open forecourts.
4. Inspect the full loop and shop → cross street → east promenade → delivery
   route. These are layout foundations; walking remains on the grid by design.
5. Check 1280×720 and your normal viewport: letters, player and selection
   remain readable; tower/side masses do not obscure the board.
6. Exercise arrows/WASD, mouse and Space selection, backtracking, Hint and Scan.
   No Stage 3 target words, quests, NPCs or automatic completion should appear.
7. Replay Stage 1/2 and check DevTools for new errors through transitions.

Known placeholders: flat caps, facade bands, plain mail/delivery masses, no
clock face, no finished buildings/props. Narrow/portrait letter readability
and actual browser composition require user review. No Git commands were used.
