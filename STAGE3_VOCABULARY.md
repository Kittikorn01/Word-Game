# Stage 3.2 — Vocabulary + Quest Design

> The board and paths below remain current. Stage 3.3 supersedes the all-available and placeholder-reaction notes; see [STAGE3_WORLD_REACTIONS.md](STAGE3_WORLD_REACTIONS.md) for current progression and ending behavior.

The approved 7×7 town board, environment, tile style, camera and intro are unchanged. Only authored letters and quest content are added. All six quests start AVAILABLE through the existing QuestProgress rules (no prerequisites). Status remains derived from the completion ledger, rather than duplicated in static quest data.

## Board

Rows run top to bottom, columns left to right; coordinates below are **one-based**.

```text
B R A C L E C
N E A D O R O
R A E O C K I
L O H S C A N
L P E A C A T
E T R N E R R
O T E N L O Y
```

| Word | Path (row,column) | Shape | Clue / context |
| --- | --- | --- | --- |
| BREAD | (1,1) → (1,2) → (2,2) → (2,3) → (2,4) | Right, down, right; 2 turns | Find something baked that people eat. / Bakery |
| COIN | (1,7) → (2,7) → (3,7) → (4,7) | Straight vertical | Find a small piece of money. / Shop |
| SHOP | (4,4) → (4,3) → (4,2) → (5,2) | Reverse horizontal then down; 1 turn | Find a place where people buy things. / Shop |
| LETTER | (5,1) → (6,1) → (6,2) → (7,2) → (7,3) → (6,3) | Multi-turn; 4 turns | Find something you can write and send to someone. / Mailbox |
| CLOCK | (1,4) → (1,5) → (2,5) → (3,5) → (3,6) | Right, down, right; 2 turns | Find something that tells you the time. / Clock Tower |
| CARRY | (5,5) → (5,6) → (6,6) → (6,7) → (7,7) | Zigzag; 3 turns | You have something to deliver. What should you do with it? / Delivery area |

All paths use cardinal adjacency without repeated tiles or shared answer tiles. Exhaustive search verifies exactly one solution per word. There are 29 answer tiles and 20 fixed decoys, using familiar letters and nearby spelling alternatives. The extra C at (4,5) ensures scanning C includes a decoy, not only answer tiles. Letters never randomize or disappear after completion.

Player start stays at (7,4), a valid N decoy outside all six paths.

## Assistance and reactions

No new hint configuration is needed: AssistanceState derives progressive prefixes from each quest's targetWord. First and second hints show B _ _ _ _ then B R _ _ _ (likewise L/E for LETTER and C/A for CARRY). The existing cap leaves the last letter hidden. Scan C highlights all five C tiles for three seconds; it does not provide a path or identify a correct start.

Existing Word Shard cost and shared resource balance are unchanged. Direct development entry starts with two shards. Reload for additional isolated hint/scan checks; normal progression retains the player's current balance. No pickups or new mechanics were added.

Each quest has a town.* worldReactionId placeholder. There is no reaction mapping or town reaction controller; solving words only updates existing quest/word feedback. The existing stage completion overlay appears after all six words. There is no Stage 4 or town ending sequence in this scope.

## Test procedure

1. Run `npm.cmd run dev -- --port 5177`, open `http://127.0.0.1:5177/?stage=3`, or use the existing DEV Stage 3 shortcut. Confirm six available English clues.
2. Walk with arrows/WASD to the first coordinate of a word. Hold Space (or left mouse button on the canvas), follow its listed path with movement keys, then release. Repeat for all six in any order. Expected: correct feedback and completed quest.
3. While selecting, step forward then back one tile: the last letter is removed. A tile cannot be reused within one word. Diagonal movement is rejected.
4. Before completing a quest, focus its HUD row and request Hint twice. Reload between resource-limited checks. Scan C separately: all five C tiles highlight, including (4,5), then clear after three seconds.
5. Confirm tiles remain and town landmarks do not react after solving. At 6/6 the standard completion overlay appears.
6. Visit Stage 1 and Stage 2; check their existing clues, movement and presentation. Run `npm.cmd test` and `npm.cmd run build`.

Automated coverage: exhaustive path uniqueness, real selection and quest submission, backtracking, availability, all progressive hints, scan set/expiry, persistent tiles, reversed completion order, unchanged world state, completion emitted once, and existing regression suite. Browser review drives all six paths with keyboard/Space and mouse hold, checks hints, captures scan and desktop/mobile screenshots, and records console errors.

## Files

Changed: `src/stages/stage3.ts`, `tests/stage3-blockout.test.mjs` (replace obsolete empty-stage expectations).

Added: `tests/stage3-vocabulary.test.mjs`, `STAGE3_VOCABULARY.md`.

QA evidence: `artifacts/stage3-vocabulary/review.mjs`, screenshots and `console.json`; `artifacts/stage3-vocabulary-tests.txt`.

## Limits

World reactions, dependencies, delivery, inventory and town ending remain deferred to Stage 3.3. Assistance retains the existing limited shard economy. No environment/render/UI/shared gameplay source was modified.

## Verification results

- `npm.cmd test`: 110 passed, 0 failed.
- `npm.cmd run build`: passed; Vite reports its existing bundle-size advisory (>500 kB).
- Browser: all six quests solved through real input, including mouse hold for SHOP and Space for the others, with backtracking on each path. Two BREAD hints and C scan exercised. Stage 1/2/3 boot screenshots captured.
- Console: no gameplay exceptions observed. The pre-existing `/favicon.ico` 404 is recorded separately in `console.json`.
- Desktop and narrow screenshots visually reviewed. On narrow screens the existing quest list scrolls to reach the remaining clues.

