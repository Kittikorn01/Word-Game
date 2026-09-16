import { normalizeScanLetter } from '../simulation/AssistanceState.ts';

export function createAssistanceOverlay(host: HTMLElement, actions: {
  hint(): string; scan(letter: string): string; opening(): void;
}) {
  const element = document.createElement('section'); element.className = 'assistance-hud';
  element.setAttribute('aria-label', 'Word Shard assistance');
  element.innerHTML = '<header><span>WORD SHARDS</span><strong></strong></header><div class="assistance-tools"><div class="hint-tool"><button type="button" data-action="hint">&#10022; Hint</button><small>Cost &#9671; 1</small></div><form novalidate><label for="scan-letter">SCAN <small>one letter</small></label><div class="scan-tool"><input id="scan-letter" aria-label="Scan one letter A to Z" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="_" size="1"><button type="submit">Go</button></div><small>Cost &#9671; 1</small></form></div><p role="status" hidden></p>';
  const count = element.querySelector('strong')!, hint = element.querySelector<HTMLButtonElement>('[data-action="hint"]')!;
  const form = element.querySelector('form')!, input = element.querySelector('input')!, scan = form.querySelector('button')!, notice = element.querySelector('p')!;
  const abort = new AbortController(), options = { signal: abort.signal };
  let hintReason = '', scanReason = '', remaining = 0;
  const message = (text: string) => { notice.textContent = text; notice.hidden = !text; remaining = 2.5; };
  const close = () => { input.value = ''; if (document.activeElement === input) input.blur(); };
  // aria-disabled keeps unavailable actions focusable so attempts can explain why.
  hint.addEventListener('click', () => message(hintReason || actions.hint() || 'A little clue, revealed.'), options);
  input.addEventListener('focus', actions.opening, options);
  input.addEventListener('input', () => {
    const letter = normalizeScanLetter(input.value);
    if (letter) input.value = letter;
    else if (input.value) { input.value = ''; message('Enter exactly one letter A–Z'); }
  }, options);
  // Reject a whole invalid paste, never silently truncate a word to its first letter.
  input.addEventListener('paste', event => {
    event.preventDefault();
    const letter = normalizeScanLetter(event.clipboardData?.getData('text') ?? '');
    input.value = letter ?? ''; if (!letter) message('Enter exactly one letter A–Z');
  }, options);
  form.addEventListener('submit', event => {
    event.preventDefault(); const reason = scanReason || actions.scan(input.value);
    if (reason) message(reason); else { close(); message('Scan active · 3 seconds'); }
  }, options);
  element.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (event.target === input || event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  }, options);
  element.addEventListener('pointerdown', event => event.stopPropagation(), options);
  host.append(element);
  return {
    message, close,
    render(shards: number, hintDisabled: string, scanDisabled: string, dt: number) {
      const text = `\u25c7 ${shards}`; if (count.textContent !== text) { count.textContent = text; count.setAttribute("aria-label", `${shards} Word Shards`); }
      hintReason = hintDisabled; scanReason = scanDisabled;
      for (const [button, reason] of [[hint, hintReason], [scan, scanReason]] as const) {
        button.setAttribute('aria-disabled', String(!!reason)); button.title = reason || 'Cost: ◇ 1';
      }
      input.disabled = !!scanReason;
      remaining -= dt; if (remaining <= 0) notice.hidden = true;
    },
    dispose() { abort.abort(); element.remove(); }
  };
}
