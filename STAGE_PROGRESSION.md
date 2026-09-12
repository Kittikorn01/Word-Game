# Prompt 6: stage progression

Current flow: complete all stage quests -> wait for queued and visible finite world
reactions -> 0.3s settling beat -> one stage-completed event -> result overlay ->
Next Stage -> 420ms warm fade out -> dispose old runtime -> mount destination ->
420ms fade in. Reduced motion removes UI/fade animation. Environment idle
animation continues on the result screen.

StageCompletionController owns completion, not the UI. It checks the canonical
quest status after successful quest events; every defined quest is required.
An empty quest list cannot complete. Stage 1 retains DOOR -> OPEN. KEY, LIGHT,
WATER, BOOK or OPEN may be last. Actual reaction readiness is read from the
controller and view; KEY acquisition and door damping cannot be covered early.

StageCompleteOverlay receives title, completed vocabulary (in stage-data order),
and next-stage availability. It contains no cottage title or word constants.
Keyboard focus stays inside the result screen. Movement, selection, held pointer
capture and quest focus are blocked, and underlying HUD/canvas become inert.

StageManager owns currentStageId, nextStageId, stage registry and the mounted
runtime. Its synchronous transition guard rejects double clicks, including while
awaiting fades. Add future definitions to registry.ts and link nextStageId; there
are no cottage-specific transition branches. Destination gameplay stays locked
until fade in finishes. Manager disposal during fade prevents later mounting.

The stage runtime owns GameState, grid, player/tracker, selected path/current word,
completedWords, quests/discovery/focus, reaction queues, feedback, input listeners,
DOM, animation loop and scene resources. Its disposal releases all of them; a
future playable destination creates fresh state using its own data. Global
application systems can live alongside the manager and are not reset.

Stage 2 is a text scene with its own stage ID and title, no canvas, no quest UI,
no gameplay input, no reaction controller and no Stage 1 runtime. Its minimal grid
metadata is unused. It has no next destination and cannot auto-complete. There
is no Stage 2 gameplay, ending, save, level select or final recap.

## Old exit logic

GameApp no longer imports/constructs ExitInput or calls updateExitInteraction /
interactWithExit. stage1 has no exit area. NarrativeOverlay no longer creates
Press E to leave or the nearby-door message. The original ExitInput.ts,
ExitInteraction.ts and inert GameState.exit shape remain only for legacy
compatibility/tests; they are not used to progress the running game. Door reveal
and opening remain world reactions. Earlier README exit instructions are historical.

## Run

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run dev`, then open the URL printed by Vite.

## Manual acceptance tests

Use a fresh load to restart Stage 1 between independent runs. Coordinates below
are zero-based (row,column). Walk to a word's first tile, hold left mouse on the
playfield, tap directions along the path, then release.

| Word | Path |
| --- | --- |
| KEY | (0,0) -> (0,1) -> (0,2) |
| LIGHT | (0,4) -> (1,4) -> (2,4) -> (3,4) -> (4,4) |
| WATER | (2,0) -> (2,1) -> (2,2) -> (3,2) -> (4,2) |
| BOOK | (4,0) -> (4,1) -> (5,1) -> (5,2) |
| DOOR | (3,6) -> (2,6) -> (1,6) -> (0,6) |
| OPEN | (5,3) -> (5,4) -> (6,4) -> (6,5) |

1. NOT COMPLETE: solve DOOR and OPEN first, leaving another quest incomplete.
   Wait and press E at the door. No result, exit prompt or transition may appear.
2. FINAL QUEST: finish remaining words. Confirm WORD FOUND, then the final world
   reaction is visible before the result. Repeat with KEY, BOOK and OPEN last.
3. CONTENT: result says STAGE COMPLETE, The Locked Cottage, Words discovered,
   KEY / LIGHT / WATER / BOOK / DOOR / OPEN and Next Stage. Check desktop, narrow
   and short windows, keyboard focus and reduced-motion preference.
4. GAMEPLAY LOCK: while result is open, tap WASD/arrows, hold/release mouse,
   click where the board/quest list was, and use Tab. Player and selection must
   remain stopped; focus must stay on Next Stage. Idle scene rendering continues.
5. NEXT STAGE: click Next Stage. Button disables immediately; warm fade covers
   scene, then STAGE 2 / The Broken Forest Path appears and fades in.
6. NO PAGE RELOAD: enable Preserve log in DevTools Network before Next Stage.
   There must be no new Document navigation request. The URL stays the same.
7. STATE RESET: inspect DOM: exactly one .stage-runtime, with data-stage-id
   stage-2-forest-path. No canvas, .quest-hud, .word-selection, .new-quest or
   .stage-complete remain. WASD/E/mouse must do nothing. For state inspection,
   breakpoint StageManager at dispose/mount: the old runtime is released and
   the placeholder mounts without constructing any Stage 1 state.
8. DOUBLE CLICK: rapidly click Next Stage several times. Only one fade/load,
   one placeholder and one runtime appear. Automated manager test covers this.
9. COMPLETION EVENT: set a DevTools breakpoint at onStageCompleted(id) in
   GameApp.ts. It is hit once after the final reaction. Resume and try input
   again; no second hit. Automated tests check repeated completion updates.
10. REGRESSION: play from fresh load, test OPEN before DOOR (WRONG), wrong word,
    already-found word, backtracking, one-press movement, floating letter, quest
    focus/discovery, all reactions and door reveal/swing. Test blur/resume during
    final reaction and fade. Keep Console open and check for errors.

## Verification and limitations

Automated tests cover completion for each possible final quest, real finite
reaction readiness, one-shot events, empty placeholders, duplicate next requests,
state isolation and dispose-during-fade, alongside the original regression suite.
Browser automation reported `No browser is available`; screenshots, native input
under the overlay, responsive visual appearance and browser console are pending
manual verification. Build has the existing >500 kB bundle-size advisory. No new
package dependency or Git command was used.

## Files

New: src/app/StageManager.ts; src/simulation/StageCompletionController.ts;
src/stages/registry.ts; src/stages/stage2.ts; src/ui/StageCompleteOverlay.ts;
src/ui/StageTransition.ts; tests/stage-flow.test.mjs; STAGE_PROGRESSION.md.

Modified: src/app/GameApp.ts; src/main.ts; src/stages/types.ts;
src/stages/stage1.ts; src/simulation/WorldReactionController.ts;
src/render/WorldReactionView.ts; src/render/GameView.ts;
src/ui/NarrativeOverlay.ts; src/ui/styles.css; tests/narrative.test.mjs; README.md.
Production build regenerates dist/.
