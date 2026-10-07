# Stage 5.1 — The Storm: Vocabulary + Quests

## Board
Coordinates are zero-based (row, column), top-left (0,0).

```text
RAINIUS
TSTSTEH
FENUTLN
IRIMERS
ARUEASU
WMCSEFR
NHREEAS
```

| Word | Path | Clue |
|---|---|---|
| RAIN | (0,0) → (0,1) → (0,2) → (0,3) | Find water that falls from the sky. |
| SHELTER | (0,6) → (1,6) → (1,5) → (2,5) → (2,4) → (3,4) → (3,5) | Find a place that protects you from rain and wind. |
| FIRE | (2,0) → (3,0) → (3,1) → (2,1) | Find something that gives heat and light. |
| WARM | (5,0) → (4,0) → (4,1) → (5,1) | After a fire is lit, the shelter feels comfortably hot, but not too hot. How does it feel? |
| SAFE | (6,6) → (6,5) → (5,5) → (5,4) | Find a word that means protected from danger. |
| RESCUE | (6,2) → (6,3) → (5,3) → (5,2) → (4,2) → (4,3) | A traveler is trapped in the storm. What action brings them out of danger? |

## Progression
RAIN, SHELTER and FIRE start AVAILABLE, in that fixed HUD order. All six permutations work. WARM requires all three completed words; SAFE requires WARM; RESCUE requires SAFE. Locked rows remain in their fixed slots with only “Locked” shown, never their clues or answers. Existing validator refuses early submissions with “That word isn't needed here yet.” They must be submitted again after unlocking.

Existing discovery/banner timing is retained: a newly available quest can be solved immediately, but focus and hints become available after its discovery presentation. Completed quests never reorder.

## Puzzle and assistance
Player starts on N at (6,0), outside every authored answer path; all 49 tiles are reachable. Each target has exactly one cardinal path, with no repeated tile. RAIN is straight; FIRE and WARM have two turns; SAFE reverses left/up/left; SHELTER and RESCUE are longer multi-turn routes. Decoys reuse familiar spelling letters and include an off-path R at (5,6). Exhaustive search rejects accidental duplicate target routes; filler is fixed data, never randomized at runtime.

Existing Hint reveals progressive prefixes only for discovered AVAILABLE quests, capped before the final letter. Scan highlights every occurrence of the supplied letter, including decoys, for three seconds; no path/start information is added. Existing Word Shard cost and carried balance are unchanged; no extra pickups are added.

## Scope and files
- Updated src/stages/stage5.ts: board, spawn, vocabulary, clues, prerequisites.
- Updated src/app/GameApp.ts: enable existing fixed-slot quest HUD for storm-blockout only.
- Updated tests/stage5-blockout.test.mjs: replace obsolete empty-quest expectations, preserve framing checks.
- Added tests/stage5-vocabulary.test.mjs and this document.
- Evidence and browser harness: artifacts/stage5-vocabulary/.

Environment geometry/materials, rain, camera, grid size/origin, movement, selection, validator, assistance and transitions are unchanged. No world reaction identifiers/controllers, traveler, flame, warmth, safety transform, or rescue sequence are implemented. WARM clue describes a hypothetical lit fire; RESCUE describes the narrative situation, not a visible traveler. Finishing RESCUE uses the existing vocabulary completion screen; there is no next stage or rescue ending yet. The compatible stage ID remains stage-5-placeholder.

## Verification
- Full automated suite: 155 passed, 0 failed; includes all six opening orders, locked attempts at each progression step, unique solutions, movement/backtracking, hint caps, scan expiry/decoys, reachability and Stage 1–4 regressions.
- TypeScript check and Vite production build passed; existing >500 kB bundle advisory remains.
- Run npm.cmd test and npm.cmd run build. For visual review, start the dev server at port 5174 and run node artifacts/stage5-vocabulary/review.mjs.
- No Git commands used.

- Live Chromium playtest passed: all six words via keyboard/mouse with backtracking; all three locked words rejected before unlock; HUD statuses/order checked after every completion; Hint prefixes and Scan exercised; Stages 1–5 loaded. Desktop and 390 × 844 screenshots reviewed. Mobile uses the existing scrollable quest list, so later slots require scrolling. No gameplay console errors/page exceptions; existing favicon 404 is recorded separately in console.json.
