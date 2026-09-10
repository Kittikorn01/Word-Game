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

export function startGame(host: HTMLElement, stage: StageDefinition, onWordSubmitted: (submission: WordSubmission) => void = () => {}): () => void {
  const ui = createOverlay(host);
  const grid = new LetterGrid(stage.id, stage.grid, stage.letterLayout ?? []);
  let view: GameView;
  try { view = new GameView(host, stage, grid); }
  catch (error) { console.error(error); ui.message('This scene needs WebGL 2. Please enable hardware acceleration or try another browser.'); return () => ui.dispose(); }
  const state = createGameState(stage.playerStart, stage.grid);
  const input = new KeyboardInput(action => {
    if (!lost && !document.hidden) requestMovement(state, action, stage.grid);
  });
  const pointer = new TilePointerInput(view.renderer.domElement, view.pickTile, id => grid.setHovered(id));
  const wordUI = createWordSelectionOverlay(host);
  const selection = new WordSelection(grid, result => { wordUI.submitted(result); onWordSubmitted(result); });
  const tracker = new PlayerTileTracker(grid); tracker.update(state.player.currentTile);
  const selectionInput = new WordSelectionInput(view.renderer.domElement, () => {
    if (lost || document.hidden) return false;
    tracker.update(state.player.currentTile);
    return selection.start(tracker.currentPlayerTile);
  }, () => { selection.submit(); }, () => selection.cancel());
  const abort = new AbortController();
  let lastTime = 0, accumulator = 0, lost = false;
  const step = 1 / 60;
  const resetClock = () => { lastTime = 0; accumulator = 0; input.clear(); selectionInput.reset(); };
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
      updateMovement(state, step);
      if (tracker.update(state.player.currentTile)) selection.enterTile(tracker.currentPlayerTile);
      grid.update(step); accumulator -= step;
    }
    wordUI.update(selection, dt);
    view.render(state, dt, selection.selectedTiles);
  });
  return () => { view.renderer.setAnimationLoop(null); abort.abort(); selectionInput.dispose(); wordUI.dispose(); pointer.dispose(); input.dispose(); view.dispose(); ui.dispose(); };
}
