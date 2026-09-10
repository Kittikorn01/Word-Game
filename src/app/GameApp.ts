import { KeyboardInput } from '../input/KeyboardInput.ts';
import { GameView } from '../render/GameView.ts';
import { createGameState, updateMovement } from '../simulation/update.ts';
import { movementBounds, type StageDefinition } from '../stages/types.ts';
import { createOverlay } from '../ui/createOverlay.ts';

export function startGame(host: HTMLElement, stage: StageDefinition): () => void {
  const ui = createOverlay(host);
  let view: GameView;
  try { view = new GameView(host, stage); }
  catch (error) { console.error(error); ui.message('This scene needs WebGL 2. Please enable hardware acceleration or try another browser.'); return () => ui.dispose(); }
  const input = new KeyboardInput();
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
    accumulator += lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    lastTime = time;
    while (accumulator >= step) { updateMovement(state, input.read(), step, bounds); accumulator -= step; }
    view.render(state);
  });
  return () => { view.renderer.setAnimationLoop(null); abort.abort(); input.dispose(); view.dispose(); ui.dispose(); };
}
