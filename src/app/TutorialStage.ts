import { GameView } from '../render/GameView.ts';
import { LetterGrid } from '../grid/LetterGrid.ts';
import { KeyboardInput } from '../input/KeyboardInput.ts';
import { WordSelectionInput } from '../input/WordSelectionInput.ts';
import { WordSelection } from '../selection/WordSelection.ts';
import { createGameState, requestMovement, updateMovement } from '../simulation/update.ts';
import { tutorialPath, tutorialStage as stage } from '../stages/tutorial.ts';

/** Uses the real player renderer, movement and word selection, with isolated practice state. */
export function mountTutorialStage(host: HTMLElement, onComplete: () => void, onBack: () => void) {
  const root = document.createElement('div'); root.className = 'stage-runtime tutorial-runtime'; host.append(root);
  const panel = document.createElement('section'); panel.className = 'tutorial-coach';
  panel.innerHTML = `<p class="adventure-eyebrow">BEFORE THE ADVENTURE · ด่านฝึก</p><h1>One word. A new adventure.</h1><p>Spell <b>START</b> · เริ่มต้น</p><p data-instruction role="status"></p><p data-word aria-live="polite"></p><p data-message role="status">เดินตามช่องที่สว่าง · ฝึกได้ไม่จำกัด ไม่เสีย Shards</p><div><button data-reset>Try again · เริ่มใหม่</button><button data-back>Back · กลับ</button></div>`;
  const grid = new LetterGrid(stage.id, stage.grid, stage.letterLayout!);
  let view: GameView;
  try { view = new GameView(root, stage, grid); }
  catch (error) { root.remove(); onBack(); console.error('Tutorial WebGL initialization failed', error); return { dispose() {} }; }
  root.append(panel);
  const state = createGameState(stage.playerStart, stage.grid);
  const instruction = panel.querySelector<HTMLElement>('[data-instruction]')!;
  const word = panel.querySelector<HTMLElement>('[data-word]')!;
  const message = panel.querySelector<HTMLElement>('[data-message]')!;
  let disposed = false, solved = false, pendingSubmit = false, frame = 0, last = performance.now(), successTime = 0;
  const currentTile = () => grid.getTile(state.player.currentTile.row, state.player.currentTile.column)!;
  const selection = new WordSelection(grid, submission => {
    if (submission.word === 'START') {
      solved = true; state.world.doorOpen = true;
      submission.selectedTileIds.forEach(id => { const tile = grid.getById(id)!; tile.state = 'CORRECT'; tile.correctRemaining = 2; });
      message.textContent = '✓ START! ประตูเปิดแล้ว — กำลังเข้าสู่กระท่อม';
      instruction.textContent = 'Well done! Your adventure begins.'; word.textContent = 'S T A R T';
    } else message.textContent = `You spelled ${submission.word}. ลองใหม่ได้ เดินกลับไป S แล้วสะกด START`;
  });
  const keyboard = new KeyboardInput(action => { if (!disposed && !solved && !pendingSubmit && !document.hidden) requestMovement(state, action, stage.grid); });
  view.renderer.domElement.tabIndex = 0;
  const selectionInput = new WordSelectionInput(view.renderer.domElement,
    () => {
      if (disposed || solved || state.player.targetTile || pendingSubmit) return false;
      message.textContent = 'กดค้างแล้วเดินต่อกัน · เดินย้อนหนึ่งช่องเพื่อแก้ตัวอักษรได้';
      return selection.start(currentTile().id);
    },
    () => { if (!solved) { if (state.player.targetTile) pendingSubmit = true; else selection.submit(); } },
    () => { pendingSubmit = false; selection.cancel(); });
  const focus = () => view.renderer.domElement.focus();
  const abort = new AbortController();
  panel.querySelector('[data-reset]')!.addEventListener('click', () => {
    if (solved) return;
    selectionInput.reset(); selection.cancel(); pendingSubmit = false; keyboard.clear();
    Object.assign(state.player, { currentTile: { ...stage.playerStart }, targetTile: null, elapsed: 0 });
    message.textContent = 'ลองอีกครั้ง: เดินไปหา S ที่สว่าง'; focus();
  }, { signal: abort.signal });
  panel.querySelector('[data-back]')!.addEventListener('click', () => { dispose(); onBack(); }, { signal: abort.signal });
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame); abort.abort();
    keyboard.dispose(); selectionInput.dispose(); view.dispose(); root.remove();
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
        instruction.textContent = selection.isSelecting
          ? text === 'START' ? '3 / 3 · ปล่อย Space หรือเมาส์เพื่อส่ง START'
            : validPrefix ? `2 / 3 · กดค้างแล้วเดินไปตัว ${'START'[text.length]} ที่สว่าง`
              : 'เดินผิดแล้ว? เดินย้อนกลับเพื่อแก้ หรือปล่อยแล้วลองใหม่'
          : currentTile().letter === 'S' ? '2 / 3 · กด Space หรือเมาส์ซ้ายบนฉากค้าง แล้วเดินสะกดคำ'
            : '1 / 3 · กด W A S D หรือปุ่มลูกศรทีละครั้ง เดินไปหา S';
        word.textContent = `Your word: ${text || '—'}   ·   Goal: START`;
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
