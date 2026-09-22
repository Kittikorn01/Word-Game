# Stage 3 reaction emphasis polish

Scope: Stage 3 presentation only. Grid, paths, answers, dependencies, camera, environment layout, input, assistance and delivery script remain unchanged. No Git commands used.

## Changes
- `src/render/TownReactionView.ts`: shop uses an anchored 1.10 pulse (rise, short hold, smooth return), then shutter/awning opening and warm display. Envelope is 1.35x, pops for 0.2s, hovers for 0.4s, arcs along the west side into the mailbox, then the mailbox bounces and raises its flag. Clock dial pulses to 1.09 while existing hands rotate, retaining active highlight and slow ticking. No particles or extra decorative clutter.
- `src/simulation/TownWorldState.ts`: SHOP duration is 1.2s; other reaction durations unchanged.
- `src/ui/QuestOverlay.ts`: optional fixed slots retain definition order; locked rows hide clues in both visible and accessible labels, disable clicks, and show a muted lock. Available/completed badges appear in place; denominator stays six.
- `src/app/GameApp.ts`: enables fixed quest slots only for town progression.
- `src/ui/styles.css`: Stage 3 feedback docks at the right side on desktop and lower left on narrow screens, outside the board and landmark area. Stage 1/2 selectors unchanged.
- `tests/stage3-reactions.test.mjs`: updates SHOP timing assertion and checks scale peaks, envelope hover/arc, mailbox receive, settled transforms and active storefront.

## Verification
- `npm.cmd run build`
- `npm.cmd test` (119 tests; includes frozen board/camera, 720 quest order permutations, all 49 CARRY starting positions, Stage 1/2 and core gameplay regression).
- `artifacts/stage3-polish/visual-check.mjs`: deterministic production-renderer fixture, desktop and narrow screenshots, stable six-row positions, locked accessible labels, error capture.
- `artifacts/stage3-polish/live-check.mjs`: actual keyboard navigation and Space submission, wrong/duplicate feedback, six words and CARRY ending; Stage 1/2 startup screenshots.
- QA scripts use the local cached Playwright package and Chrome; adjust their machine-specific import/executable paths and port 5174 on another machine. They are QA artifacts, not runtime dependencies.

## Manual test
Run `npm.cmd run dev`, open `/?stage=3` in development. Complete BREAD and COIN in either order, verify SHOP stays in slot 3 as it unlocks. Complete SHOP and LETTER, verify CARRY stays in slot 6. Follow SHOP's brief pulse and opening, LETTER's pop/hover/arc and mailbox flag, CLOCK's dial pulse and hands. Submit a wrong word and a completed word; feedback must remain readable without obscuring Clock or grid. Finish CARRY and confirm scripted delivery. Switch to Stage 1/2 using the dev navigation for a visual sanity check.

## Limitations
- Small-screen quest list retains existing scrolling; all six rows exist but need not be visible simultaneously.
- Existing discovery banner timing, quest focus timing and hint eligibility remain unchanged; a newly AVAILABLE row becomes focusable when its existing discovery presentation finishes.
- Vite still reports the existing large-bundle warning. Browser requests for the absent favicon may produce a 404; no favicon changes are in scope.
- Visual QA covers desktop 1440x900/1280x720 and narrow 390x844; unusual viewport sizes remain a manual review item.
