# Stage 4.2 reaction readability polish

## Changes

GEAR: dedicated gear emissive material (not shared with crates), warm point light limited to 2.1 world units, a short partial-ring sweep around the housing, and one installation turn after reaching the socket. Pulse fades to a subtle installed highlight. No scene-wide light changes.

REPAIR: existing cap begins displaced 0.22 horizontally, 0.32 vertically and tilted 0.20 radians. It highlights, aligns during the middle of the animation, then settles with a small bounce. A temporary hammer performs two repair taps, then retracts as the cap settles. REPAIR now lasts 2.6 seconds (previously 1.2). Final transform returns exactly to its authored position. Power indicators remain off until POWER.

POWER: cabinet light and pulse precede the enlarged moving cable highlight and local traveling light. Cable traversal ends at 73% of the reaction; machine illumination begins at 74%; powered gear turn begins at 82%. Conveyor still requires START. POWER now lasts 3.6 seconds (previously 1.6) so the energy transfer can be followed. START/STOP durations remain unchanged.

## Notification timing

Workshop owns a temporary `reactionHeldWords` availability hold, separate from unchanged quest dependency data. It releases the appropriate next quests only when the real controller reports no active reaction/production, followed by 0.45 seconds of quiet. A new reaction restarts the quiet interval. Other stages do not create this optional hold.

The existing shared quest status/validator respects the optional hold so early submissions and hints cannot bypass it. Existing completed-word handling takes priority. POWER waits for both GEAR and REPAIR, LEVER waits for POWER, START waits for LEVER. STOP still uses the original production-finished world condition, plus the same presentation buffer. START/STOP motion, production and completion logic are unchanged.

Workshop presentation countdown pauses and the banner hides while reactions hold notifications. The generic 0.3-second notification lead is skipped after the workshop's own 0.45-second buffer. HUD availability refreshes when the queued reveal appears. Existing discovery/focus behavior still inserts the quest after its NEW QUEST presentation completes. NEW QUEST uses the original upper placement again, per playtest feedback. It remains hidden throughout active reactions and resumes only after the completion buffer. Other stage placement/timing is unchanged.

## Files modified

- src/render/WorkshopReactionView.ts
- src/simulation/WorkshopWorldState.ts
- src/simulation/WordProgress.ts
- src/simulation/QuestProgress.ts
- src/validation/QuestValidator.ts
- src/app/GameApp.ts
- src/ui/NarrativeOverlay.ts
- src/ui/styles.css
- tests/stage4-reactions.test.mjs

New: STAGE4_REACTION_POLISH.md and artifacts/stage4-polish-tests.txt. Build also regenerates dist output. No Git commands used. Stage data, board, paths, clues, dependencies, Hint/Scan implementation and other stage data/renderers were not edited.

## Tests and playtest

Automated: 137/137 tests pass; TypeScript/Vite build passes. Includes both initial completion orders, exact completion + buffer boundaries, rejected early submissions, STOP after production, notification hiding/resuming, local-light range, broken/fixed transform, power sequencing, grid visibility, input, assistance and Stage 1-3 regressions.

Manual: run npm.cmd run dev and open ?stage=4. Follow STAGE4_VOCABULARY.md paths.

1. GEAR: look for warm local focus, socket arrival, one turn and fading ring sweep; installed gear remains readable.
2. REPAIR: compare displaced/tilted cap before to aligned cap after; status lights must remain off. Repeat with REPAIR before GEAR.
3. After the second initial word: POWER stays locked until its reaction completes + roughly 0.45 s; then NEW QUEST appears in its original upper position.
4. POWER: observe cabinet -> moving cable light -> machine lamp -> gear movement. Check stationary conveyor. LEVER notification follows completion + buffer.
5. LEVER: START notification follows the lever's finished motion + buffer.
6. START: no STOP notification throughout startup and crate travel/settle. STOP reveal follows production completion + buffer. Wait freely, then submit STOP and verify original shutdown/completion.
7. Test desktop, narrow and short windows; verify the upper banner appears only after the animation finishes. Check browser console and Stage 1-3.

## Limitations

Live screenshots, visual brightness/readability and browser-console verification remain pending because this session has no connected browser. Automated scene/DOM checks do not establish perceived visual quality. Upper notification placement is restored as requested; responsive live review is still required. Vite reports the existing >500 kB bundle advisory. No audio or postprocessing bloom was added.
