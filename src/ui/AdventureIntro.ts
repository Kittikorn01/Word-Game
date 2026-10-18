/** A separate practice board: never spends shards or completes a real quest. */
export function showTutorial(host: HTMLElement, onClose: () => void, settings: { introductory?: boolean } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'adventure-dialog';
  dialog.setAttribute('aria-labelledby', 'tutorial-title');
  dialog.innerHTML = `<div class="adventure-paper"><p class="adventure-eyebrow">LEARN BY PLAYING · ฝึกเล่นไปด้วยกัน</p>
    <h1 id="tutorial-title">Spell START to begin.</h1>
    <p>START means “begin”. <span lang="th">START แปลว่า เริ่มต้น — ฝึกเดินและสะกดคำนี้ไปด้วยกัน</span></p>
    <section class="practice">
      <p class="practice-step" role="status" aria-live="polite"></p>
      <div class="practice-board" tabindex="0" role="group" aria-label="Practice board: empty tile, S T A R T. Use A and D or left and right arrows. Hold Space to select letters."></div>
      <p>Selected word: <strong class="practice-word">—</strong></p>
      <p class="practice-status" role="status"></p>
      <button type="button" data-reset>Try again · เริ่มฝึกใหม่</button>
    </section>
    <p>Move: A / D or ← / →. Hold Space or the left mouse button on the board to select. Release to submit.</p>
    <p lang="th">จุดสีส้มคือตำแหน่งของคุณ กดเดินทีละครั้ง ระหว่างฝึกไม่ใช้ Shards</p>
    <details><summary>Hints &amp; Word Shards · คำใบ้</summary><p>Hint reveals one more letter. Scan highlights a letter for 3 seconds. Each costs ◇ 1.</p><p lang="th">เริ่มด้วย 2 Shards · ตอบโจทย์ใหม่ถูก +1 · สำรวจ Room Discoveries แล้วกด E เพื่อรับเพิ่ม</p></details>
    <button type="button" data-close>${settings.introductory ? 'Back · กลับหน้าเริ่มต้น' : 'Back to game · กลับไปเล่น'}</button></div>`;
  host.append(dialog);
  const abort = new AbortController(), options = { signal: abort.signal };
  const board = dialog.querySelector<HTMLElement>('.practice-board')!;
  const step = dialog.querySelector<HTMLElement>('.practice-step')!;
  const status = dialog.querySelector<HTMLElement>('.practice-status')!;
  const wordDisplay = dialog.querySelector<HTMLElement>('.practice-word')!;
  const letters = ['', ...'START'];
  const tiles = letters.map(letter => {
    const tile = document.createElement('span'); tile.textContent = letter || '·'; board.append(tile); return tile;
  });
  let position = 0, path: number[] = [], selecting: 'keyboard' | 'mouse' | null = null, done = false;
  const word = () => path.map(i => letters[i]).join('');
  const draw = () => {
    tiles.forEach((tile, i) => {
      tile.classList.toggle('is-player', i === position);
      tile.classList.toggle('is-selected', path.includes(i));
      tile.classList.toggle('is-next', i === (selecting ? Math.min(position + 1, 5) : 1));
    });
    wordDisplay.textContent = word() || '—';
    step.textContent = selecting
      ? word() === 'START'
        ? '4 / 4 · Release to submit! ปล่อย Space หรือเมาส์เพื่อส่งคำตอบ'
        : '3 / 4 · Keep holding and move right. กดค้างไว้ แล้วเดินไปเก็บตัวอักษรถัดไป →'
      : position === 1
        ? '2 / 4 · Hold Space to select S. กด Space ค้างเพื่อเริ่มเก็บตัว S'
        : '1 / 4 · Walk to S. กด D หรือ → เพื่อเดินไปตัว S';
  };
  const reset = () => {
    position = 0; path = []; selecting = null;
    status.textContent = settings.introductory ? 'สะกด START ถูกต้องแล้วจะเข้า Stage 1 อัตโนมัติ' : 'สะกด START ถูกต้องแล้วจะกลับไปเล่นด่านเดิม';
    draw(); board.focus();
  };
  const close = (completed: boolean) => {
    if (done) return;
    done = true; abort.abort(); dialog.close(); dialog.remove();
    if (completed || !settings.introductory) onClose();
  };
  const begin = (source: 'keyboard' | 'mouse') => {
    if (selecting) return;
    if (position !== 1) { status.textContent = 'เดินไปที่ S ก่อน แล้วค่อยกดค้างเพื่อสะกดคำ'; return; }
    selecting = source; path = [position]; status.textContent = 'START = เริ่มต้น'; draw();
  };
  const submit = () => {
    selecting = null;
    if (word() === 'START') { close(true); return; }
    const attempted = word(); position = 1; path = [];
    status.textContent = `You made ${attempted || '—'}. ลองใหม่: กดค้างแล้วเดินให้ครบ S → T → A → R → T`;
    draw();
  };
  dialog.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.target !== board || !['Space','ArrowRight','ArrowLeft','KeyD','KeyA'].includes(event.code)) return;
    event.preventDefault(); if (event.repeat) return;
    if (event.code === 'Space') begin('keyboard');
    else {
      const next = Math.max(selecting ? 1 : 0, Math.min(5, position + (['ArrowRight','KeyD'].includes(event.code) ? 1 : -1)));
      if (next !== position) {
        position = next;
        if (selecting) { if (path.at(-2) === next) path.pop(); else if (!path.includes(next)) path.push(next); }
      }
      draw();
    }
  }, options);
  dialog.addEventListener('keyup', event => {
    event.stopPropagation();
    if (event.code === 'Space' && selecting === 'keyboard') { event.preventDefault(); submit(); }
  }, options);
  board.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); board.focus(); begin('mouse');
  }, options);
  window.addEventListener('mouseup', event => { if (event.button === 0 && selecting === 'mouse') submit(); }, options);
  const cancelSelection = () => { selecting = null; path = []; draw(); };
  window.addEventListener('blur', cancelSelection, options);
  board.addEventListener('blur', cancelSelection, options);
  dialog.querySelector('[data-reset]')!.addEventListener('click', reset, options);
  dialog.querySelector('[data-close]')!.addEventListener('click', () => close(false), options);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(false); }, options);
  dialog.showModal(); reset();
  return { dispose() { if (!done) { done = true; abort.abort(); dialog.close(); dialog.remove(); } } };
}

export function createAdventureIntro(host: HTMLElement, onStart: () => void, onLearn?: () => void) {
  const element = document.createElement('section'); element.className = 'adventure-intro';
  element.innerHTML = `<div class="adventure-cover"><div class="cottage-emblem" aria-hidden="true"><div class="cottage-roof"></div><div class="cottage-wall"><i></i><b></b><i></i></div><div class="cottage-path"></div></div><p class="adventure-eyebrow">CHAPTER 01 · THE JOURNEY BEGINS</p><h1>Word Search<br>Adventure</h1><p>A quiet room. A locked door.<br>The words you find will bring this place to life.</p><div class="adventure-actions"><button type="button" data-play class="adventure-primary">Learn & play →</button></div></div>`;
  host.append(element);
  let started = false;
  let tutorial: ReturnType<typeof showTutorial> | undefined;
  const start = () => { if (started) return; started = true; element.remove(); onStart(); };
  element.querySelector('[data-play]')!.addEventListener('click', () => { if (onLearn) { element.remove(); onLearn(); } else tutorial = showTutorial(host, start, { introductory: true }); });
  element.querySelector<HTMLButtonElement>('[data-play]')!.focus();
  return { dispose() { tutorial?.dispose(); element.remove(); started = true; } };
}
