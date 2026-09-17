# Stage 2 ? The Broken Forest Path

Environment blockout only. StageManager mounts the existing playable runtime after Stage 1's Next Stage; no page navigation or reload was added.

## Layout (world X/Z, Y up)

| Area | X range | Z range | Surface Y |
| --- | --- | --- | --- |
| Main Ground | -7 to 2 | -4.5 to 4.5 | 0 |
| Future River (dry trench) | 2 to 4 | -4.5 to 4.5 | -0.85 |
| Far Ground | 4 to 8 | -4.5 to 4.5 | 0.25 |
| Raised Area | 4.5 to 8 | -4.5 to -0.5 | 1.65 |

Earth foundation bottom: -1.4. Simple vertical cliffs deliberately reserve the future ascent; no climb route exists.
Future bridge footprint: X 2?4, Z 0.65?2.15. Two flat bank markings identify it, with nothing spanning the trench.

Grid: 7?7, tile size 1, center (-2.5, 0), one unit of ground margin on every side. Existing Stage 1 letters are temporary test content, with no Stage 2 vocabulary or quests. Spawn: row 5 / column 3, world (-2.5, 2), safely within Main Ground.

Camera: orthographic, position (0.5,17,12), target (0.5,0,0), vertical span 12, minimum horizontal span 19. No yaw preserves screen/cardinal movement alignment. It shows the grid, dry trench and raised far bank together; narrow portrait screens necessarily shrink letters to fit the composition.

## Boundaries

Movement remains the existing grid-constrained movement. Ground margins and the far bank are composition placeholders, not walkable areas. Submissions use the existing validator and cannot complete a quest because no quests exist. Hint has no target; Scan keeps the existing resource rules. No token grants, world reactions, water, bridge, trees or new mechanics were added.

## Manual test

1. Run `npm.cmd run dev` and open the local Vite URL.
2. Play Stage 1 normally, finish its six objectives, then press Next Stage.
3. Verify the fade reaches the blockout without browser reload, with only one canvas/runtime.
4. Walk in all four directions; inspect grid edges, player spawn and hover alignment.
5. Hold the left mouse button and move to select letters; reverse a step to backtrack, then release. With no quests, submissions should not complete the stage.
6. Inspect the dry trench, two bank markers and high rear platform. Confirm there is no water or crossing.
7. Check desktop and narrow windows for framing/readability, and check DevTools Console for errors.

Automated verification: `npm.cmd run build` and `npm.cmd test`. Tests cover Stage 1 regressions, stage lifecycle, offset coordinates, ground clearance, spawn/movement and camera projection bounds. Browser screenshots, actual Next Stage UI and runtime console still require manual verification: no connected browser was available in the implementation session.
