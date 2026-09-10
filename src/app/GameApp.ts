import { KeyboardInput } from '../input/KeyboardInput.ts';
import { GameView } from '../render/GameView.ts';
import { createGameState, updateMovement } from '../simulation/update.ts';
import { movementBounds, type StageDefinition } from '../stages/types.ts';
import { createOverlay } from '../ui/createOverlay.ts';
import { LetterGrid } from '../grid/LetterGrid.ts';
import { TilePointerInput } from '../input/TilePointerInput.ts';
import { bindTileDebugControls } from '../debug/TileDebugControls.ts';

export function startGame(host: HTMLElement, stage: StageDefinition): () => void {
  const ui = createOverlay(host);
  const grid = new LetterGrid(stage.id, stage.grid, stage.letterLayout ?? []);
  let view: GameView;
  try { view = new GameView(host, stage, grid); }
  catch (error) { console.error(error); ui.message('This scene needs WebGL 2. Please enable hardware acceleration or try another browser.'); return () => ui.dispose(); }
  const input = new KeyboardInput();
  const pointer = new TilePointerInput(view.renderer.domElement, view.pickTile, id => grid.setHovered(id));
  const disposeDebug = bindTileDebugControls(view.renderer.domElement, grid, view.pickTile);
  const state = createGameState(stage.spawn), bounds = movementBounds(stage);
  const abort = new AbortController();
  let lastTime = 0, accumulator = 0, lost = false;
  const step = 1 / 60;
  const resetClock = () => { lastTime = 0; accumulator = 0; input.clear(); };
  window.addEventListener('blur', resetClock, { signal: abort.signal });
  document.addEventListener('visibilitychange', resetClock, { signal: abort.signal });
  view.renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; resetClock(); ui.message('Graphics paused. Waiting for the browser to restore the scene…');
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
    while (accumulator >= step) { updateMovement(state, input.read(), step, bounds); grid.update(step); accumulator -= step; }
    view.render(state, dt);
  });
  return () => { view.renderer.setAnimationLoop(null); abort.abort(); disposeDebug(); pointer.dispose(); input.dispose(); view.dispose(); ui.dispose(); };
}
