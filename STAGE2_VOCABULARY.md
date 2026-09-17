> Historical Stage 2.4 notes. Board and paths remain current; availability, reactions and traversal are superseded by [Stage 2.5](STAGE2_WORLD_REACTIONS.md).

# Stage 2.4 — Vocabulary + Quest Gameplay

Stage 2 owns a new 7×7 board. All six quests start AVAILABLE through the existing derived questStatus ledger (no duplicate mutable status in stage data). All clues and reserved worldReactionId values live in stage2.ts. No reaction mapping, world objects, exit or next stage is enabled.

## Board and intended solutions

Coordinates below are **1-based (row, column)**, from the top left.

```text
    1 2 3 4 5 6 7
1   T R E E A N R
2   W A L S P O R
3   O A R N E A T
4   O D I T N A B
5   B M V E A I R
6   L I S R G D N
7   C A S N E L O
```

| Word | Path | Shape |
|---|---|---|
| TREE | (1,1) ? (1,2) ? (1,3) ? (1,4) | Straight right |
| WOOD | (2,1) ? (3,1) ? (4,1) ? (4,2) | Down, down, right |
| ROPE | (2,7) ? (2,6) ? (2,5) ? (3,5) | Left, left, down |
| RIVER | (3,3) ? (4,3) ? (5,3) ? (5,4) ? (6,4) | Down, down, right, down |
| BRIDGE | (4,7) ? (5,7) ? (5,6) ? (6,6) ? (6,5) ? (7,5) | Down/left zigzag |
| CLIMB | (7,1) ? (6,1) ? (6,2) ? (5,2) ? (5,1) | Up, right, up, left |

An exhaustive cardinal DFS verifies exactly one solution per target, with no repeated cell. The six paths do not overlap. The remaining 21 cells use familiar letters, including a decoy R and plausible near misses; there is no random generation. Scan R finds all six R tiles, including the decoy.

## Clues

- TREE: “A tall plant with a trunk and branches.”
- WOOD: “This material comes from trees and is used to build things.”
- ROPE: “Find something strong that can tie things together.”
- RIVER: “Water flows through the land and blocks the path ahead.”
- BRIDGE: “A structure that helps you cross from one bank to the other.”
- CLIMB: “The path continues above. What should you do to go higher?”

## Presentation and assistance

Stage-owned tileTheme selects forest-stone. Four subtle beige/gray-green stone tones, a persistent moss-green border and two small edge marks replace the cottage palette. Dark glyphs remain unchanged; amber selection, lifted latest tile with double border, success feedback and cyan Scan retain their priorities. Stage 1 keeps its original tile appearance.

Hint uses targetWord and the existing per-quest progression: T _ _ _ ? T R _ _, B _ _ _ _ _ ? B R _ _ _ _. No separate hint configuration is needed. The existing shard cost, cap before the final letter, and carried player resource balance remain unchanged.

Player starts at (7,4), a decoy N outside every target path. Movement bounds, camera, terrain, nature, raised area and incomplete crossing are unchanged.

## Test procedure

Run `npm.cmd test` and `npm.cmd run build` on Windows. Start with `npm.cmd run dev`, complete Stage 1 and continue into Stage 2.

For each path above, move to its first cell with WASD/arrows. Hold left mouse on the canvas **or hold Space**, move along the listed cells, then release to submit. Movement uses separate key presses. Moving back onto the previous cell should shorten the selection; a diagonal or earlier non-previous cell must not extend it. Correct submissions complete their quest without removing tiles or changing the forest.

Navigate all six clues. With shards available, request two hints for TREE or BRIDGE and scan R. Scan must highlight all R cells rather than a solution path. Check normal, hover, selected, latest, scan and correct tile readability. Verify that moving right off column 7 is rejected, even after completing words. Recheck Stage 1 mouse/Space, hints and world reactions.

## Files

New:
- tests/stage2-vocabulary.test.mjs
- STAGE2_VOCABULARY.md

Changed:
- src/stages/stage2.ts
- src/stages/types.ts
- src/quests/types.ts
- src/render/GameView.ts
- src/render/LetterGridView.ts
- src/input/WordSelectionInput.ts (the previous implementation had mouse hold only; adds Space hold/release and cancellation)
- tests/stage2-blockout.test.mjs
- tests/stage-flow.test.mjs
- tests/forest-structure.test.mjs

Build regenerates dist output.

## Limitations

- World reactions are reserved identifiers only; the bridge remains incomplete and the far bank is inaccessible.
- Existing stage-completion overlay appears after all six words, with no next stage. Future bridge progression is not implemented.
- Stage 2 has no new shard source: assistance uses the carried balance and can be unavailable if exhausted.
- Browser visual/screenshot and live console verification could not run because the browser tool reported no available browser. Manual visual and console checks remain required.
- Production build reports the existing large JavaScript chunk warning.
