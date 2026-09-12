import { ExitInput } from '../input/ExitInput.ts';
import { updateExitInteraction, interactWithExit } from '../simulation/ExitInteraction.ts';
import { updateQuestPresentation } from '../simulation/QuestProgress.ts';
import { createNarrativeOverlay } from '../ui/NarrativeOverlay.ts';
import { WorldReactionController } from '../simulation/WorldReactionController.ts';
import { KeyboardInput } from '../input/KeyboardInput.ts';
import { GameView } from '../render/GameView.ts';
import { createGameState, requestMovement, updateMovement } from '../simulation/update.ts';
import type { StageDefinition } from '../stages/types.ts';
import { createOverlay } from '../ui/createOverlay.ts';
import { LetterGrid } from '../grid/LetterGrid.ts';
import { TilePointerInput } from '../input/TilePointerInput.ts';
import { WordSelection, type WordSubmission } from '../selection/WordSelection.ts';
import { PlayerTileTracker } from '../simulation/PlayerTileTracker.ts';
import { WordSelectionInput } from '../input/WordSelectionInput.ts';
import { createWordSelectionOverlay } from '../ui/WordSelectionOverlay.ts';
import { createQuestValidator } from '../validation/QuestValidator.ts';
import { createQuestOverlay } from '../ui/QuestOverlay.ts';
import { finishQuestFeedback, resolveQuestWord } from '../simulation/QuestProgress.ts';
import { WordFeedback } from '../feedback/WordFeedback.ts';

export function startGame(host: HTMLElement, stage: StageDefinition, onWordSubmitted: (submission: WordSubmission) => void = () => {}, onQuestCompleted: (questId: string) => void = () => {}, onStageCompleted: (stageId: string) => void = () => {}): () => void {
  const ui = createOverlay(host);
  const grid = new LetterGrid(stage.id, stage.grid, stage.letterLayout ?? []);
  let view: GameView;
  try { view = new GameView(host, stage, grid); }
  catch (error) { console.error(error); ui.message('This scene needs WebGL 2. Please enable hardware acceleration or try another browser.'); return () => ui.dispose(); }
  const state = createGameState(stage.playerStart, stage.grid, stage.quests);
  const reactions = new WorldReactionController(state.world, stage.worldReactions);
  const input = new KeyboardInput(action => {
    if (!lost && !document.hidden) requestMovement(state, action, stage.grid);
  });
  const pointer = new TilePointerInput(view.renderer.domElement, view.pickTile, id => grid.setHovered(id));
  const questUI = createQuestOverlay(host, index => {
    if (!state.quests.discoveredIds.includes(state.quests.definitions[index]?.id)) return;
    state.quests.focusedIndex = index;
    state.quests.pendingAdvanceId = null;
    questUI.render(state.quests, state.words);
  });
  questUI.render(state.quests, state.words);
  const wordUI = createWordSelectionOverlay(host, () => {
    finishQuestFeedback(state.quests, state.words); questUI.render(state.quests, state.words);
  });
  const validate = createQuestValidator(state.quests.definitions);
  const feedback = new WordFeedback(grid);
  const selection = new WordSelection(grid, submission => {
    if (feedback.isResolving) return;
    // Finish any older visible feedback before queuing this submission's advance.
    wordUI.clear();
    const result = resolveQuestWord(state.quests, state.words, submission, validate, id => { reactions.onQuestCompleted(id); onQuestCompleted(id); });
    feedback.begin(result);
    wordUI.show(result);
    questUI.render(state.quests, state.words);
    onWordSubmitted(submission);
  });
  const tracker = new PlayerTileTracker(grid); tracker.update(state.player.currentTile);
  const selectionInput = new WordSelectionInput(view.renderer.domElement, () => {
    if (lost || document.hidden || feedback.isResolving) return false;
    tracker.update(state.player.currentTile);
    return selection.start(tracker.currentPlayerTile);
  }, () => { selection.submit(); }, () => selection.cancel());
  const narrativeUI = createNarrativeOverlay(host);
  const exitInput = new ExitInput(() => {
    if (!lost && !document.hidden && !selection.isSelecting && !feedback.isResolving)
      interactWithExit(state, stage.exit, stage.id, onStageCompleted);
  });
  const abort = new AbortController();
  let lastTime = 0, accumulator = 0, lost = false;
  const step = 1 / 60;
  const resetClock = () => { lastTime = 0; accumulator = 0; input.clear(); exitInput.clear(); selectionInput.reset(); feedback.clear(); wordUI.clear(); };
  window.addEventListener('blur', resetClock, { signal: abort.signal });
  document.addEventListener('visibilitychange', resetClock, { signal: abort.signal });
  view.renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; resetClock(); ui.message('Graphics paused. Waiting for the browser to restore the scene...');
  }, { signal: abort.signal });
  view.renderer.domElement.addEventListener('webglcontextrestored', () => {
    lost = false; resetClock(); ui.message('');
  }, { signal: abort.signal });
  view.renderer.setAnimationLoop((time: number) => {
    if (lost || document.hidden) { resetClock(); return; }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    accumulator += dt;
    lastTime = time;
    pointer.refresh();
    while (accumulator >= step) {
      updateMovement(state, step); reactions.update(step);
      if (updateQuestPresentation(state.quests, step)) questUI.render(state.quests, state.words);
      updateExitInteraction(state, stage.exit);
      if (tracker.update(state.player.currentTile)) selection.enterTile(tracker.currentPlayerTile);
      grid.update(step); feedback.update(step); accumulator -= step;
    }
    wordUI.update(selection, dt);
    narrativeUI.update(state.quests, state.exit);
    view.render(state, dt, feedback.isResolving ? feedback.selectedTiles : selection.selectedTiles, feedback.visual);
  });
  return () => { view.renderer.setAnimationLoop(null); abort.abort(); exitInput.dispose(); narrativeUI.dispose(); selectionInput.dispose(); wordUI.dispose(); questUI.dispose(); pointer.dispose(); input.dispose(); view.dispose(); ui.dispose(); };
}



