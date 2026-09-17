# Gameplay letter feedback polish

Shared render/UI changes apply to every stage. No simulation, selection, validator, assistance, stage data, camera or progression changes.

- Current letter: cream plate, wood outline and inset gold keyline; 0.5-unit footprint with a 200ms, 12% scale pulse on a letter change. Texture redraw only on a changed letter. Reduced-motion preference disables the pulse.
- Current word: CURRENT WORD heading and bold monospace spelling in the existing HUD position. A 140ms settle plays only when spelling changes, including backtracking; disabled for reduced motion. Long spellings are height-limited and scrollable.
- Selected tiles: warm fill, narrow inset border and eased lift. Latest selected tile uses a second border and slightly higher lift; glyph size and pointer hitboxes stay unchanged. Removed tiles ease back to normal.
- Path: short connectors between neighboring tile edges avoid crossing the letter centers. Removed connectors disappear immediately to match the committed path.
- Submit: green/check WORD FOUND, amber/return-arrow ALREADY FOUND, red/cross NOT NEEDED. Existing Already found. and That word isn't needed here. messages remain below the word. Existing display durations (2.3/2.0/2.8 seconds), completion callback and validation lock durations remain unchanged.

## Verification

Build and the 75 existing tests pass, including selection, backtracking, validation, progression and river checks. Browser visual QA and Console verification are still required; no connected browser was available in this session.

1. npm.cmd run dev; in Stage 1 move through different letters and inspect the badge.
2. Hold the left mouse button and walk a word. Check CURRENT WORD, selected borders and the double-border endpoint.
3. Reverse one step; the last connector should disappear, the old tile should settle, and the endpoint/word should update immediately.
4. Submit KEY for success, then KEY again for Already found.; submit an unrelated string for That word isn't needed here.
5. Check normal/selected letters in the dim cottage and after the room light changes.
6. Complete Stage 1, pass through the intro, and repeat selection/backtracking in Stage 2 with the river active. Stage 2 still has no quests, so use Stage 1 for correct/already results.
7. Check narrow/short windows, very long spellings, reduced-motion settings and Console. The existing responsive HUD anchors are retained; no board/camera resizing was added.

Files modified: src/render/FloatingLetterView.ts, src/render/LetterGridView.ts, src/render/SelectionPathView.ts, src/render/GameView.ts, src/ui/WordSelectionOverlay.ts, src/ui/styles.css.
