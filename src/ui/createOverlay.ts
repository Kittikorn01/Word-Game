export function createOverlay(host: HTMLElement) {
  const overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<p class="controls"><kbd>W A S D</kbd><span>or</span><kbd>↑ ← ↓ →</kbd><span>one press, one tile</span></p><p class="selection-hint">Hold left mouse on the playfield &middot; Tap directions to spell &middot; Release to submit</p><p class="notice" role="status" hidden></p>';
  host.append(overlay);
  const notice = overlay.querySelector<HTMLElement>('.notice')!;
  return {
    message(text: string) { notice.textContent = text; notice.hidden = !text; },
    dispose() { overlay.remove(); }
  };
}

