import { GameView } from '../render/GameView.ts';
import { LetterGrid } from '../grid/LetterGrid.ts';
import { KeyboardInput } from '../input/KeyboardInput.ts';
import { WordSelectionInput } from '../input/WordSelectionInput.ts';
import { WordSelection } from '../selection/WordSelection.ts';
import { createGameState, requestMovement, updateMovement } from '../simulation/update.ts';
import { tutorialPath, tutorialStage as stage } from '../stages/tutorial.ts';
import { createQuestProgress, refreshQuestAvailability } from '../simulation/QuestProgress.ts';
import { createWordProgress } from '../simulation/WordProgress.ts';
import { createQuestOverlay } from '../ui/QuestOverlay.ts';

/** Uses the real player renderer, movement and word selection, with isolated practice state. */
export function mountTutorialStage(host: HTMLElement, onComplete: () => void, onBack: () => void) {
  const root = document.createElement('div'); root.className = 'stage-runtime tutorial-runtime'; host.append(root);
  const panel = document.createElement('section'); panel.className = 'tutorial-coach';
  panel.innerHTML = `<p class="adventure-eyebrow" data-step></p><h1 data-title></h1><p data-instruction role="status"></p><p data-message role="alert"></p><p data-word></p><button data-back>Back</button>`;
  const grid = new LetterGrid(stage.id, stage.grid, stage.letterLayout!);
  let view: GameView;
  try { view = new GameView(root, stage, grid); }
  catch (error) { root.remove(); onBack(); console.error('Tutorial WebGL initialization failed', error); return { dispose() {} }; }
  root.append(panel);
  const quests = createQuestProgress([{ id: 'tutorial-start', clue: 'Spell the word that means "begin".', targetWord: 'START' }], 'immediate');
  const words = createWordProgress();
  refreshQuestAvailability(quests, words);
  const questOverlay = createQuestOverlay(root, () => {});
  questOverlay.render(quests, words);
  const questHud = root.querySelector<HTMLElement>('.quest-hud')!;
  const state = createGameState(stage.playerStart, stage.grid);
  const field = (name: string) => panel.querySelector<HTMLElement>(`[data-${name}]`)!;
  const stepLabel = field('step'), title = field('title'), instruction = field('instruction'), word = field('word'), message = field('message');
  // Assign only on change so screen readers announce each step once, not every frame.
  const show = (element: HTMLElement, text: string) => { if (element.textContent !== text) element.textContent = text; };
  let disposed = false, solved = false, moved = false, pendingSubmit = false, frame = 0, last = performance.now(), successTime = 0;
  const currentTile = () => grid.getTile(state.player.currentTile.row, state.player.currentTile.column)!;
  const selection = new WordSelection(grid, submission => {
    if (submission.word === 'START') {
      solved = true; state.world.doorOpen = true;
      submission.selectedTileIds.forEach(id => { const tile = grid.getById(id)!; tile.state = 'CORRECT'; tile.correctRemaining = 2; });
      words.completedWords = ['START']; questOverlay.render(quests, words);
      show(stepLabel, 'TUTORIAL COMPLETE'); show(title, 'Well done!'); show(instruction, 'The door is open. Your adventure begins.');
      show(message, ''); show(word, 'S T A R T');
    } else show(message, 'Keep holding the mouse button, then walk to the right letter.');
  });
  const keyboard = new KeyboardInput(action => {
    if (disposed || solved || pendingSubmit || document.hidden) return;
    moved = true; requestMovement(state, action, stage.grid);
  });
  view.renderer.domElement.tabIndex = 0;
  const selectionInput = new WordSelectionInput(view.renderer.domElement,
    () => {
      if (disposed || solved || state.player.targetTile || pendingSubmit) return false;
      show(message, '');
      return selection.start(currentTile().id);
    },
    () => { if (!solved) { if (state.player.targetTile) pendingSubmit = true; else selection.submit(); } },
    () => { pendingSubmit = false; selection.cancel(); });
  const focus = () => view.renderer.domElement.focus();
  const abort = new AbortController();
  panel.querySelector('[data-back]')!.addEventListener('click', () => { dispose(); onBack(); }, { signal: abort.signal });
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame); abort.abort();
    keyboard.dispose(); selectionInput.dispose(); questOverlay.dispose(); view.dispose(); root.remove();
  }
  /** Steps advance on player actions only: first move, standing on S, then holding the selection. */
  function coach(text: string): [string, string, string] {
    if (!moved) return ['STEP 1 / 3 · YOUR QUEST', 'Find the hidden words.',
      'Each quest is a clue. Spell its word on the board to bring the world to life. Your first quest is START. Use WASD or the arrow keys to move.'];
    if (!selection.isSelecting) return currentTile().letter === 'S'
      ? ['STEP 3 / 3 · SPELL', 'Hold to select.', 'Hold the left mouse button on the board, then walk S → T → A → R → T.']
      : ['STEP 2 / 3 · MOVE', 'Walk to the glowing S.', 'Press WASD or an arrow key once for each step.'];
    if (text === 'START') return ['STEP 3 / 3 · SPELL', 'Release to submit!', 'Let go of the mouse button.'];
    return 'START'.startsWith(text)
      ? ['STEP 3 / 3 · SPELL', 'Keep holding.', `Walk to the glowing ${'START'[text.length]}.`]
      : ['STEP 3 / 3 · SPELL', 'Wrong letter.', 'Step back one tile to fix it, or release and try again.'];
  }
  function tick(now: number) {
    if (disposed) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!document.hidden) {
      if (updateMovement(state, dt)) { selection.enterTile(currentTile().id); if (pendingSubmit) { pendingSubmit = false; selection.submit(); } }
      if (!solved) {
        const text = selection.currentWord;
        const validPrefix = 'START'.startsWith(text);
        const next = tutorialPath[selection.isSelecting && validPrefix ? Math.min(text.length, 4) : 0];
        grid.setHovered(grid.getTile(next.row, next.column)!.id);
        const [step, heading, body] = coach(text);
        show(stepLabel, step); show(title, heading); show(instruction, body);
        questHud.classList.toggle('is-spotlit', !moved);
        show(word, moved ? `Your word: ${text || '—'}   ·   Goal: START` : '');
      } else {
        grid.setHovered(null); successTime += dt;
        if (successTime >= 1.6) { dispose(); onComplete(); return; }
      }
      view.render(state, dt, selection.selectedTiles);
    }
    frame = requestAnimationFrame(tick);
  }
  focus(); frame = requestAnimationFrame(tick);
  return { dispose };
}
