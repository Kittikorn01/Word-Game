# Stage 4.3 - Workshop Finale

## Finale sequence

STOP accepted -> input locked -> existing WORD FOUND feedback finishes -> 1.4 s smooth shutdown -> powered safe idle with one subtle output-tray warm pulse -> approximately 0.95 s idle pause -> existing Stage Complete overlay.

The workshop controller owns `finalePhase` (`idle`, `feedback`, `shutdown`, `pause`, `finished`) and `finaleElapsed`. The runtime supplies actual word-overlay/selection-feedback activity; it does not estimate the feedback duration. The controller remains busy throughout the finale, so the existing all-quests-completed condition cannot display the result prematurely. The 0.65 s local pause plus the existing 0.3 s completion settle give about 0.95 s to see the finished scene.

Gear and conveyor use the existing smooth deceleration. Production already gates STOP until both crates reach the output, so neither crate stops midway or needs a second delivery animation. Output positions remain fixed throughout feedback, shutdown, pause and overlay. A single warm tray highlight confirms completion. Cabinet stays softly lit at standby, machine indicator becomes muted safe idle, lever returns to its original resting angle. No lights-out effect or additional machinery reactions.

Input is blocked immediately on accepted STOP: movement, quest focus, mouse/Space selection, Hint, Scan and support input. Held inputs and active scan clear; movement returns to the committed tile. Feedback remains visible and world simulation/rendering continues. Blur/context reset preserves finale feedback progress rather than prematurely ending it. Existing completion lock takes over when the overlay appears.

## Completion and lifecycle

All six quest completions plus finished finale are required. The existing translucent/blurred overlay remains unchanged, showing The Silent Workshop and GEAR, REPAIR, POWER, LEVER, START, STOP in their original order. World state persists behind it; input stays locked.

Stage 4 now points to a Stage 5 placeholder. Next Stage uses the existing StageManager flow: lock -> fade out -> dispose Stage 4 -> Stage 5 intro -> mount placeholder -> fade in. No reload is introduced. Stage 5 has no environment/gameplay content yet. A fresh Stage 4 mount resets all workshop/finale state and resources are disposed with the previous view.

## Files

Modified:
- src/simulation/WorkshopWorldState.ts: feedback/shutdown/pause/finished phases and input/completion state.
- src/render/WorkshopReactionView.ts: standby intensity, resting lever and output confirmation pulse.
- src/app/GameApp.ts: immediate finale input guards, preserve feedback, pass feedback activity into controller.
- src/ui/WordSelectionOverlay.ts: read-only isShowing getter; existing timing unchanged.
- src/stages/stage4.ts: nextStageId only.
- src/stages/registry.ts: register Stage 5 placeholder.
- tests/stage4-reactions.test.mjs: finale phases, delay, persistence, reset and Stage 5 transition coverage.
- tests/stage4-blockout.test.mjs: expect the new Stage 5 destination.

New:
- src/stages/stage5.ts
- STAGE4_FINALE.md
- artifacts/stage4-finale-tests.txt

Build regenerates dist output. No Git commands were used.

## Validation

139/139 automated tests pass, including Stage 1-3 regressions, unchanged vocabulary paths, selection/assistance, feedback gating, deceleration, pause, final crate positions, lit standby indicators, lock state, reset and exact StageManager transition order. Production build passes with the existing >500 kB bundle advisory.

Manual playtest: run npm.cmd run dev, open ?stage=4, complete the existing paths in STAGE4_VOCABULARY.md.

1. After production, submit STOP. Verify WORD FOUND finishes while the belt still runs; try WASD/arrows, Space/mouse, Hint/Scan. No gameplay action should occur.
2. Observe control movement and smooth 1.4 s deceleration, then stopped gear/belt, received crates, resting lever and soft standby indicators.
3. Check one subtle tray highlight and roughly one second of visible idle before the overlay. Overlay must not cover shutdown.
4. Confirm all six words in original order and the final scene behind the translucent overlay.
5. Press Next Stage once or rapidly twice: a single fade/Stage 5 intro/placeholder transition, no reload.
6. DEV return to Stage 4: initial missing gear, broken cap, power off, resting conveyor and fresh quests. Smoke-test Stage 1-3 completion flows.
7. Check browser console and desktop/narrow display; blur/resume during feedback and shutdown should not skip the sequence or unlock input.

## Limitations

No connected browser is available in this session, so live input integration, screenshots, perceived finale timing and browser-console verification remain pending. Automated simulation/scene/transition tests are not visual playtest evidence. Stage 5 is intentionally only a placeholder. No new sound, rewards, mechanics or camera effects were added.
