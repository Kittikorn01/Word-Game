import type { StageRuntime } from './StageManager.ts';
import { StageCompletionController } from '../simulation/StageCompletionController.ts';
import { createStageCompleteOverlay } from '../ui/StageCompleteOverlay.ts';
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

export function mountStage(host: HTMLElement, stage: StageDefinition, onNext: () => void,
  onWordSubmitted: (submission: WordSubmission) => void = () => {}, onQuestCompleted: (questId: string) => void = () => {}, onStageCompleted: (stageId: string) => void = () => {}): StageRuntime {
  const container = document.createElement('div'); container.className = 'stage-runtime'; container.dataset.stageId = stage.id;
  host.append(container); host = container;
  if (stage.kind === 'placeholder') {
    host.classList.add('stage-placeholder');
    const label = document.createElement('p'), title = document.createElement('h1'), note = document.createElement('p');
    label.textContent = `STAGE ${stage.stageNumber ?? ''}`; title.textContent = stage.title ?? stage.id;
    note.textContent = 'A new adventure awaits.';
    host.append(label, title, note); title.tabIndex = -1; title.focus();
    return { lock() {}, dispose() { host.remove(); } };
  }
  let locked = false;
  let completeUI: ReturnType<typeof createStageCompleteOverlay> | undefined;
  const ui = createOverlay(host);
  const grid = new LetterGrid(stage.id, stage.grid, stage.letterLayout ?? []);
  let view: GameView;
  try { view = new GameView(host, stage, grid); }
  catch (error) { console.error(error); ui.message('This scene needs WebGL 2. Please enable hardware acceleration or try another browser.'); return { lock() {}, dispose() { ui.dispose(); host.remove(); } }; }
  const state = createGameState(stage.playerStart, stage.grid, stage.quests);
  const reactions = new WorldReactionController(state.world, stage.worldReactions);
  const input = new KeyboardInput(action => {
    if (!locked && !lost && !document.hidden) requestMovement(state, action, stage.grid);
  });
  const pointer = new TilePointerInput(view.renderer.domElement, view.pickTile, id => grid.setHovered(id));
  const questUI = createQuestOverlay(host, index => {
    if (locked || !state.quests.discoveredIds.includes(state.quests.definitions[index]?.id)) return;
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
    if (locked || feedback.isResolving) return;
    // Finish any older visible feedback before queuing this submission's advance.
    wordUI.clear();
    const result = resolveQuestWord(state.quests, state.words, submission, validate, id => { reactions.onQuestCompleted(id); completion.check(state.quests, state.words); onQuestCompleted(id); });
    feedback.begin(result);
    wordUI.show(result);
    questUI.render(state.quests, state.words);
    onWordSubmitted(submission);
  });
  const tracker = new PlayerTileTracker(grid); tracker.update(state.player.currentTile);
  const selectionInput = new WordSelectionInput(view.renderer.domElement, () => {
    if (locked || lost || document.hidden || feedback.isResolving) return false;
    tracker.update(state.player.currentTile);
    return selection.start(tracker.currentPlayerTile);
  }, () => { selection.submit(); }, () => selection.cancel());
  const narrativeUI = createNarrativeOverlay(host);
  const lock = () => {
    locked = true; input.clear(); selectionInput.reset(); selection.cancel();
    feedback.clear(); wordUI.clear(); grid.setHovered(null);
    host.classList.add('stage-runtime--locked');
    for (const element of host.querySelectorAll<HTMLElement>('.quest-hud,.overlay,.word-selection,.new-quest,canvas')) element.inert = true;
  };
  const completion = new StageCompletionController(stage.id, id => {
    lock();
    completeUI = createStageCompleteOverlay(host, {
      title: stage.title ?? stage.id,
      vocabulary: (stage.vocabulary ?? state.quests.definitions.map(q => q.targetWord)).filter(word => state.words.completedWords.includes(word)),
      hasNextStage: !!stage.nextStageId
    }, onNext);
    onStageCompleted(id);
  });
  const abort = new AbortController();
  let lastTime = 0, accumulator = 0, lost = false;
  const step = 1 / 60;
  const resetClock = () => { lastTime = 0; accumulator = 0; input.clear(); selectionInput.reset(); feedback.clear(); wordUI.clear(); };
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
    if (!locked) pointer.refresh();
    while (accumulator >= step) {
      if (!locked) updateMovement(state, step);
      reactions.update(step);
      if (updateQuestPresentation(state.quests, step)) questUI.render(state.quests, state.words);
      if (!locked && tracker.update(state.player.currentTile)) selection.enterTile(tracker.currentPlayerTile);
      grid.update(step); feedback.update(step); accumulator -= step;
      completion.update(step, reactions.isBusy || view.reactionsBusy(state), feedback.isResolving);
    }
    wordUI.update(selection, dt);
    narrativeUI.update(state.quests);
    view.render(state, dt, feedback.isResolving ? feedback.selectedTiles : selection.selectedTiles, feedback.visual);
  });
  return { lock, unlock() {
    if (completeUI) return;
    locked = false; input.clear(); host.classList.remove('stage-runtime--locked');
    for (const element of host.querySelectorAll<HTMLElement>('[inert]')) element.inert = false;
  }, dispose() { view.renderer.setAnimationLoop(null); abort.abort(); completeUI?.dispose(); narrativeUI.dispose(); selectionInput.dispose(); wordUI.dispose(); questUI.dispose(); pointer.dispose(); input.dispose(); view.dispose(); ui.dispose(); host.remove(); } };
}



