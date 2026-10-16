/** A separate practice board: never spends shards or completes a real quest. */
export function showTutorial(host: HTMLElement, onClose: () => void) {
  const dialog = document.createElement('dialog'); dialog.className = 'adventure-dialog';
  dialog.setAttribute('aria-labelledby', 'tutorial-title');
  dialog.innerHTML = `<div class="adventure-paper"><p class="adventure-eyebrow">YOUR FIRST STEPS · วิธีเล่น</p><h1 id="tutorial-title">Every word opens a way.</h1>
    <div class="tutorial-instructions"><p><b>1. Read a clue.</b> Choose a quest on the left.<br><span lang="th">อ่านคำใบ้ แล้วคิดว่าคำศัพท์ใดตรงกับความหมาย</span></p>
    <p><b>2. Walk to the first letter.</b> Tap WASD or the arrow keys. One tap moves one tile.<br><span lang="th">เดินไปตัวอักษรแรก โดยกดปุ่มทีละครั้ง</span></p>
    <p><b>3. Build the word.</b> Hold Space (or the left mouse button on the game board), then tap movement keys. Release to submit.<br><span lang="th">กด Space หรือเมาส์ซ้ายค้าง แล้วเดินเก็บตัวอักษรตามลำดับ ปล่อยเพื่อส่งคำตอบ</span></p></div>
    <section class="practice"><b>Try it: an animal that says “meow”.</b><p>Start on C. Hold Space, tap → twice, then release Space.</p><div class="practice-board" tabindex="0" aria-label="Practice board. C A T. Use arrow keys and hold Space to select."></div><p class="practice-status" role="status">Practice here — no shards or points are used.</p><button type="button" data-reset>Try again</button></section>
    <p><b>Need help?</b> Hint reveals one more letter of your selected quest (◇ 1). Scan highlights a letter for 3 seconds (◇ 1). Earn ◇ 1 for each new solved quest, or inspect Room Discoveries with E.</p>
    <p lang="th">เริ่มด้วย 2 Shards · ตอบโจทย์ใหม่ถูก +1 · สำรวจจุด Room Discoveries แล้วกด E เพื่อรับเพิ่ม คำใบ้จะไม่เปิดตัวอักษรสุดท้าย</p>
    <button type="button" data-close class="adventure-primary">Ready to explore →</button></div>`;
  host.append(dialog);
  const abort = new AbortController(), options = { signal: abort.signal };
  const board = dialog.querySelector<HTMLElement>('.practice-board')!;
  const status = dialog.querySelector<HTMLElement>('.practice-status')!;
  const tiles = [...'CAT'].map(letter => { const tile = document.createElement('span'); tile.textContent = letter; board.append(tile); return tile; });
  let position = 0, path: number[] = [], selecting = false, done = false;
  const draw = () => tiles.forEach((tile, i) => { tile.classList.toggle('is-player', i === position); tile.classList.toggle('is-selected', path.includes(i)); });
  const reset = () => { position = 0; path = []; selecting = false; status.textContent = 'Start on C. Hold Space, tap → twice, then release.'; draw(); board.focus(); };
  const close = () => { if (done) return; done = true; abort.abort(); dialog.close(); dialog.remove(); onClose(); };
  dialog.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.target !== board) return;
    if (!['Space','ArrowRight','ArrowLeft','KeyD','KeyA'].includes(event.code)) return;
    event.preventDefault(); if (event.repeat) return;
    if (event.code === 'Space') { selecting = true; path = [position]; }
    else { const next = Math.max(0, Math.min(2, position + (['ArrowRight','KeyD'].includes(event.code) ? 1 : -1))); if (next !== position) { position = next; if (selecting) { if (path.at(-2) === next) path.pop(); else if (!path.includes(next)) path.push(next); } } }
    draw();
  }, options);
  dialog.addEventListener('keyup', event => {
    event.stopPropagation(); if (event.code !== 'Space' || !selecting) return;
    event.preventDefault(); selecting = false;
    const word = path.map(i => 'CAT'[i]).join('');
    status.textContent = word === 'CAT' ? '✓ CAT — well done! You are ready for the cottage.' : `You made ${word}. Try CAT: start on C and move right twice.`;
  }, options);
  window.addEventListener('blur', () => { selecting = false; path = []; draw(); }, options);
  dialog.querySelector('[data-reset]')!.addEventListener('click', reset, options);
  dialog.querySelector('[data-close]')!.addEventListener('click', close, options);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, options);
  dialog.showModal(); reset();
  return { dispose() { if (!done) { done = true; abort.abort(); dialog.close(); dialog.remove(); } } };
}

export function createAdventureIntro(host: HTMLElement, onStart: () => void) {
  const element = document.createElement('section'); element.className = 'adventure-intro';
  element.innerHTML = `<div class="adventure-cover"><p class="adventure-eyebrow">WORD SEARCH ADVENTURE</p><div class="cottage-emblem" aria-hidden="true"><div class="cottage-roof"></div><div class="cottage-wall"><i></i><b></b><i></i></div><div class="cottage-path"></div></div><p class="adventure-eyebrow">CHAPTER 01 · THE JOURNEY BEGINS</p><h1>The Locked<br>Cottage</h1><p>A quiet room. A locked door.<br>The words you find will bring this place to life.</p><p lang="th">อ่านคำใบ้ เดินต่อคำศัพท์ และค้นหาทางออกจากกระท่อม</p><div class="adventure-actions"><button type="button" data-play class="adventure-primary">Learn & play →</button><button type="button" data-skip>Skip tutorial · เริ่มเล่นเลย</button></div><small>Keyboard & mouse · WASD / arrows + Space<br>Start with ◇ 2 Word Shards · No time limit</small></div>`;
  host.append(element);
  let started = false;
  let tutorial: ReturnType<typeof showTutorial> | undefined;
  const start = () => { if (started) return; started = true; element.remove(); onStart(); };
  element.querySelector('[data-play]')!.addEventListener('click', () => { tutorial = showTutorial(host, start); });
  element.querySelector('[data-skip]')!.addEventListener('click', start);
  element.querySelector<HTMLButtonElement>('[data-play]')!.focus();
  return { dispose() { tutorial?.dispose(); element.remove(); started = true; } };
}
