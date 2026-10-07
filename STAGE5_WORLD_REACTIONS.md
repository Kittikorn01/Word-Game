# Stage 5.2 — The Storm: World Reactions & Quest Timing

## Reactions
- RAIN (3.2 s): drizzle expands from 64 to 192 slanted rain strokes, with one bounded 0.256 s sky/environment flash; steady heavy rain remains. Side bands leave the entire letter grid and shelter footprint rain-free. No camera shake, hazards, deadlines or damage.
- SHELTER (3.4 s): roof/battens sweep, frame/posts illuminate, then covered floor and bedroll receive a modest pulse; a subdued persistent structural highlight remains. This identifies protection without the full WARM interior.
- FIRE (2.8 s): logs highlight, four low-poly flame tongues grow into an idle campfire, with localized light. The rest material stays unchanged until WARM.
- WARM (3.6 s): the fire light expands slightly and a local warm fill travels across the interior; cloth/ground materials become warmer, then settle.
- SAFE (3 s): roof, posts and rest surface pulse together; a thin earth-toned border follows the existing dry floor and lighting becomes stable. No shield, bubble or geometry changes to the shelter.
- RESCUE (8 s): a hooded traveler already waits at the entry after SAFE unlocks RESCUE. On acceptance, controls lock immediately. The traveler walks along the existing approach, reaches the dry area beside the mat, stops, and the shelter gives a final warm pulse.

## Timing and state
StormReactionController is the simulation source of truth. Completed quest IDs queue once, in acceptance order. The three initial quests remain independent and can be submitted while earlier reactions play; queued reactions are presented sequentially. Progress drives both rendered animation and its completion boundary. No setTimeout or mesh-visibility gates are used.

World flags: rainIntensified, shelterHighlighted, fireLit, warmState, safeState, travelerRescued. State also owns requested/progress maps, the queue, quiet interval, idle clock and traveler pose. Existing reactionHeldWords gates hold WARM, SAFE and RESCUE while visual prerequisites are incomplete. Once all queued reactions have finished, a 0.45 s quiet interval elapses, then the controller releases eligible gates. The existing quest banner skips its redundant lead-in and starts then. Both its visibility and presentation countdown are held during reactions.

The unchanged data still requires RAIN + SHELTER + FIRE → WARM → SAFE → RESCUE. Discovery/focus/Hint availability retains the shared banner timing. Submitting a locked word does not queue a reaction. ALREADY_COMPLETED never queues or restarts a sequence. Flame/rain idle motion does not keep the stage busy forever.

RESCUE input lock covers keyboard movement, mouse/Space selection, Hint, Scan and UI interactions through the existing runtime guards. Pending movement/selection/scan is cleared on acceptance. Input remains locked through the result screen. Completion waits for arrival, the final pulse and 0.45 s quiet; the existing completion controller then adds its 0.3 s settle. No new transition system was added.

## Scripted traveler route
World X/Z waypoints: (4.9,5.25) → (4.55,1.55) → (4.4,-1.15) → (4.05,-2.85) → (3.05,-3.12) → (1.25,-3.12) → (-0.3,-3.55). Distance-weighted interpolation eases departure/arrival, with a small walk cycle. The route rounds the grid corner before crossing toward the shelter. A simple height interpolation steps onto the existing raised dry floor. No pathfinding or physics.

## Ownership and reset
Each mount creates a fresh StormWorldState/controller, weather and reaction view. Reactions clone only the affected Stage 5 mesh materials; no shared asset values or environment transforms change. The view restores original material references and disposes every owned geometry/material on teardown. Re-entry starts with drizzle, an unlit fire, cool materials, hidden traveler and the three original available quests.

## Files
New:
- src/simulation/StormWorldState.ts
- src/render/StormReactionView.ts
- tests/stage5-reactions.test.mjs
- STAGE5_WORLD_REACTIONS.md
- artifacts/stage5-reactions/: browser harnesses, screenshots and verification results

Modified:
- src/simulation/types.ts: optional storm state
- src/app/GameApp.ts: Stage-5-only controller, presentation and rescue-lock integration
- src/render/GameView.ts: instantiate/update/dispose the Stage 5 reaction view
- src/render/StormWeatherView.ts: bounded state-driven weather intensity, unchanged initial drizzle
- tests/stage5-vocabulary.test.mjs: settle the actual reaction controller before existing vocabulary assertions

Stage 5 data, grid/paths/decoys, clues/order/spawn/camera, environment geometry/material source, shared quest/validation/Hint/Scan/movement/selection/transition implementations and Stage 1–4 files are unchanged.

## Verification
- Full suite: 165 tests passed, 0 failed. Includes all six initial orders with queued submissions, reaction-end and 0.45 s gate boundaries, duplicates, large/small time steps, assistance regression, reset, GPU ownership and Stage 1–4 behavior.
- Raycast samples every tile at nine points across 61 traveler poses in desktop, narrow and 16:9 frames; all clear. Traveler bounds remain inside the fixed camera.
- TypeScript and Vite build pass. Existing >500 kB bundle advisory remains.
- Deterministic browser checkpoints cover each active/settled reaction and the narrow final state; no page errors.
- Commands: npm.cmd test; npm.cmd run build. For live review, run the Vite dev server on port 5174, then node artifacts/stage5-reactions/live-review.mjs. The visual-review.mjs harness captures simulation-driven checkpoints without the gameplay HUD.

## Limits
Rain protection is a deterministic exclusion region, not roof collision/fluid simulation. Traveler and flames are procedural low-poly meshes; no audio, AI, physics or additional fail mechanics. Fixed-camera/mobile HUD layout and shared quest discovery timing are preserved. No Git commands were used.

## Final live verification
Production runtime playthrough passed via mouse/Space selection, arrows and backtracking. FIRE → SHELTER → RAIN → WARM → SAFE → RESCUE completed correctly. NEW QUEST was absent during each animation; observed onset from the post-release measurement was 3.631 s after RAIN (3.2 s reaction), 4.019 s after WARM (3.6 s reaction) and 3.423 s after SAFE (3 s reaction). The few milliseconds before measurement account for the difference from the simulation-owned 0.45 s pause.

RESCUE made canvas/assistance inert immediately; attempted movement and selection did not move the player from the final E tile. The result screen waited for the traveler sequence and showed The Storm with all six words in authored order. Stage 1–5 boot, Hint, Scan and re-entry reset passed. No application errors or page exceptions; existing favicon 404 recorded separately. Evidence: live-results.json, live-console.json, live-rescue-active.png, live-complete.png and live-reset.png. Desktop and narrow views reviewed.
