import { STEP_DURATION } from '../simulation/update.ts';
import { createStormWorldState, StormReactionController } from '../simulation/StormWorldState.ts';
import { createWorkshopWorldState, WorkshopReactionController } from '../simulation/WorkshopWorldState.ts';
import { SupportObjectives } from '../simulation/SupportObjectives.ts';
import { createSupportOverlay } from '../ui/SupportOverlay.ts';
import { ExitInput } from '../input/ExitInput.ts';
import { AssistanceState, createPlayerResources, type PlayerResources } from '../simulation/AssistanceState.ts';
import { createAssistanceOverlay } from '../ui/AssistanceOverlay.ts';
import type { StageRuntime } from './StageManager.ts';
import { StageCompletionController } from '../simulation/StageCompletionController.ts';
import { createStageCompleteOverlay } from '../ui/StageCompleteOverlay.ts';
import { updateQuestPresentation, refreshQuestAvailability } from '../simulation/QuestProgress.ts';
import { createForestWorldState, ForestReactionController } from '../simulation/ForestWorldState.ts';
import { ForestEndingController } from '../simulation/ForestEndingController.ts';
import { createTownWorldState, TownReactionController } from '../simulation/TownWorldState.ts';
import { TownEndingController } from '../simulation/TownEndingController.ts';
import { createForestTraversal, isOnLetterGrid, requestStageMovement, updateStageMovement } from '../simulation/ForestTraversal.ts';
import { createNarrativeOverlay } from '../ui/NarrativeOverlay.ts';
import { WorldReactionController } from '../simulation/WorldReactionController.ts';
import { KeyboardInput } from '../input/KeyboardInput.ts';
import { GameView } from '../render/GameView.ts';
import { createGameState } from '../simulation/update.ts';
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
  onWordSubmitted: (submission: WordSubmission) => void = () => {}, onQuestCompleted: (questId: string) => void = () => {}, onStageCompleted: (stageId: string) => void = () => {}, resources: PlayerResources = createPlayerResources()): StageRuntime {
  const container = document.createElement('div'); container.className = 'stage-runtime'; container.dataset.stageId = stage.id;
  host.append(container); host = container;
  if (stage.kind === 'placeholder') {
    host.classList.add('stage-placeholder');
    const label = document.createElement('p'), title = document.createElement('h1'), note = document.createElement('p');
    label.textContent = `STAGE ${stage.stageNumber ?? ''}`; title.textContent = stage.title ?? stage.id;
    note.textContent = 'A new adventure awaits.';
    const shards = document.createElement('strong'); shards.textContent = `\u25c7 ${resources.wordShards} Word Shards`;
    host.append(label, title, note, shards); title.tabIndex = -1; title.focus();
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
  const workshopReactions = stage.environment === 'workshop-blockout' ? new WorkshopReactionController(state.workshop = createWorkshopWorldState(state.words), state.words) : undefined;
  const stormReactions = stage.environment === 'storm-blockout' ? new StormReactionController(state.storm = createStormWorldState(state.words), state.words) : undefined;
  const gameplayLocked = () => locked || !!workshopReactions?.inputLocked || !!stormReactions?.inputLocked;
  const forestReactions = stage.forestProgression ? new ForestReactionController(state.forest = createForestWorldState(state.words)) : undefined;
  if (stage.forestProgression) state.traversal = createForestTraversal(stage);
  const ending = stage.forestProgression ? new ForestEndingController(stage) : undefined;
  if (ending) state.ending = ending.state;
  const townReactions = stage.townProgression ? new TownReactionController(state.town = createTownWorldState()) : undefined;
  const townEnding = stage.townProgression ? new TownEndingController(stage) : undefined;
  if (townEnding) state.townEnding = townEnding.state;
  const assistance = new AssistanceState(resources);
  const reactions = new WorldReactionController(state.world, stage.worldReactions);
  const input = new KeyboardInput(action => {
    if (!gameplayLocked() && !lost && !document.hidden) {
      requestStageMovement(state, action, stage, selection.isSelecting);
    }
  });
  const pointer = new TilePointerInput(view.renderer.domElement, view.pickTile, id => grid.setHovered(id));
  const questUI = createQuestOverlay(host, index => {
    if (gameplayLocked() || !state.quests.discoveredIds.includes(state.quests.definitions[index]?.id)) return;
    state.quests.focusedIndex = index;
    state.quests.pendingAdvanceId = null;
    questUI.render(state.quests, state.words);
  }, !!stage.townProgression || stage.environment === 'workshop-blockout' || stage.environment === 'storm-blockout');
  questUI.render(state.quests, state.words);
  const wordUI = createWordSelectionOverlay(host, () => {
    finishQuestFeedback(state.quests, state.words); questUI.render(state.quests, state.words);
  });
  const validate = createQuestValidator(state.quests.definitions, state.words);
  const feedback = new WordFeedback(grid);
  const selection = new WordSelection(grid, submission => {
    if (gameplayLocked() || feedback.isResolving) return;
    // Finish any older visible feedback before queuing this submission's advance.
    wordUI.clear();
    const result = resolveQuestWord(state.quests, state.words, submission, validate, id => { reactions.onQuestCompleted(id); forestReactions?.onQuestCompleted(id); townReactions?.onQuestCompleted(id); workshopReactions?.onQuestCompleted(id); stormReactions?.onQuestCompleted(id); completion.check(state.quests, state.words); onQuestCompleted(id); });
    feedback.begin(result);
    wordUI.show(result);
    if (workshopReactions?.inputLocked || stormReactions?.inputLocked) {
      if (state.storm && !state.storm.playerPose) {
        const a=grid.getTile(state.player.currentTile.row,state.player.currentTile.column)!.worldPosition;
        const b=state.player.targetTile?grid.getTile(state.player.targetTile.row,state.player.targetTile.column)!.worldPosition:a;
        const t=state.player.targetTile?Math.min(1,state.player.elapsed / STEP_DURATION):0;
        const f=t*t*(3-2*t);
        const start={x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};
        if(state.storm.requested.rescue) state.storm.rescueStart=start;
        else state.storm.safeStart={...start,heading:state.player.heading};
      }
      // Preserve final-word feedback while blocking every gameplay adapter immediately.
      input.clear(); selectionInput.reset(); selection.cancel(); supportInput.clear();
      if (!state.storm || state.storm.requested.rescue) { state.player.targetTile = null; state.player.elapsed = 0; }
      assistance.clearScan(); assistanceUI.close(); grid.setHovered(null);
      for (const element of host.querySelectorAll<HTMLElement>('.quest-hud,.assistance-hud,.support-hud,canvas')) element.inert = true;
    }
    questUI.render(state.quests, state.words);
    onWordSubmitted(submission);
  });
  const tracker = new PlayerTileTracker(grid); tracker.update(state.player.currentTile);
  const selectionInput = new WordSelectionInput(view.renderer.domElement, () => {
    if (gameplayLocked() || lost || document.hidden || feedback.isResolving || !isOnLetterGrid(state)) return false;
    tracker.update(state.player.currentTile);
    return selection.start(tracker.currentPlayerTile);
  }, () => { selection.submit(); }, () => selection.cancel());
  const assistanceBlocked = () => gameplayLocked() || lost || document.hidden || selection.isSelecting || feedback.isResolving;
  const assistanceUI = createAssistanceOverlay(host, {
    hint: () => assistance.requestHint(state.quests, state.words, assistanceBlocked()),
    scan: letter => {
      const reason = assistance.requestScan(letter, grid, assistanceBlocked());
      return reason;
    },
    opening: () => input.clear()
  });
  const support = new SupportObjectives(resources, stage.supportObjectives);
  const supportUI = createSupportOverlay(host, support);
  const supportBlocked = () => assistanceBlocked() || !!state.player.targetTile || !isOnLetterGrid(state);
  const supportInput = new ExitInput(() => {
    const reward = support.inspect(state.player.currentTile, supportBlocked());
    if (reward) assistanceUI.message(`Word Shard +${reward.reward}`);
  });
  const renderAssistance = (dt: number) => {
    assistanceUI.render(assistance.wordShards, assistance.hintUnavailable(state.quests, state.words, assistanceBlocked()), assistance.unavailable(assistanceBlocked()), dt);
    supportUI.render(state.player.currentTile, supportBlocked());
    questUI.renderHint(assistance.hintText(state.quests, state.words));
  };
  const narrativeUI = createNarrativeOverlay(host);
  const lock = () => {
    locked = true; assistance.clearScan(); assistanceUI.close(); supportInput.clear(); input.clear(); selectionInput.reset(); selection.cancel();
    feedback.clear(); wordUI.clear(); grid.setHovered(null);
    host.classList.add('stage-runtime--locked');
    for (const element of host.querySelectorAll<HTMLElement>('.quest-hud,.assistance-hud,.support-hud,.overlay,.word-selection,.new-quest,canvas')) element.inert = true;
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
  const resetClock = () => { lastTime = 0; accumulator = 0; input.clear(); selectionInput.reset(); if (!workshopReactions?.inputLocked && !stormReactions?.inputLocked) { feedback.clear(); wordUI.clear(); } assistance.clearScan(); assistanceUI.close(); };
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
    while (accumulator >= step) {
      if (!gameplayLocked()) {
        updateStageMovement(state, step); assistance.update(step);
        support.update(step);
      }
      reactions.update(step);
      forestReactions?.update(step);
      townReactions?.update(step);
      workshopReactions?.update(step, feedback.isResolving || wordUI.isShowing);
      const stormWasLocked=stormReactions?.inputLocked;
      stormReactions?.update(step);
      if(stormWasLocked && !stormReactions?.inputLocked && !locked) {
        input.clear();selectionInput.reset();
        for(const element of host.querySelectorAll<HTMLElement>('.quest-hud,.assistance-hud,.support-hud,canvas')) element.inert=false;
      }
      const previousPresentations = state.quests.presentations.length;
      refreshQuestAvailability(state.quests, state.words);
      if ((workshopReactions || stormReactions) && state.quests.presentations.length > previousPresentations) questUI.render(state.quests, state.words);
      if ((workshopReactions && !workshopReactions.notificationsHeld) || (stormReactions && !stormReactions.notificationsHeld)) {
        // These stage controllers already supplied the reaction completion buffer.
        for (const item of state.quests.presentations) item.remaining = Math.min(item.remaining, 3.2);
      }
      if (!workshopReactions?.notificationsHeld && !stormReactions?.notificationsHeld && updateQuestPresentation(state.quests, step)) questUI.render(state.quests, state.words);
      if (!gameplayLocked() && isOnLetterGrid(state) && tracker.update(state.player.currentTile)) selection.enterTile(tracker.currentPlayerTile);
      grid.update(step); feedback.update(step); accumulator -= step;
      const reactionsBusy = reactions.isBusy || !!stormReactions?.isBusy || !!workshopReactions?.isBusy || !!forestReactions?.isBusy || !!townReactions?.isBusy || view.reactionsBusy(state);
      if (!locked && ending?.tryStart(state, reactionsBusy || feedback.isResolving)) lock();
      if (!locked && townEnding?.tryStart(state, reactionsBusy || feedback.isResolving)) lock();
      ending?.update(step);
      townEnding?.update(step, state);
      completion.update(step, reactionsBusy || (!!ending && !ending.isFinished) || (!!townEnding && !townEnding.isFinished), feedback.isResolving);
    }
    renderAssistance(dt);
    wordUI.update(selection, dt);
    narrativeUI.update(state.quests, !!workshopReactions?.notificationsHeld || !!stormReactions?.notificationsHeld);
    view.render(state, dt, feedback.isResolving ? feedback.selectedTiles : selection.selectedTiles, feedback.visual, assistance, support);
    if (!gameplayLocked()) pointer.refresh();
  });
  return { lock, unlock() {
    if (completeUI || workshopReactions?.inputLocked || stormReactions?.inputLocked || ending?.inputLocked || townEnding?.inputLocked) return;
    locked = false; input.clear(); host.classList.remove('stage-runtime--locked');
    for (const element of host.querySelectorAll<HTMLElement>('[inert]')) element.inert = false;
  }, dispose() { view.renderer.setAnimationLoop(null); abort.abort(); assistance.clearScan(); assistanceUI.dispose(); supportInput.dispose(); supportUI.dispose(); completeUI?.dispose(); narrativeUI.dispose(); selectionInput.dispose(); wordUI.dispose(); questUI.dispose(); pointer.dispose(); input.dispose(); view.dispose(); ui.dispose(); host.remove(); } };
}



