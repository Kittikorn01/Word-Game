export function createOverlay(host: HTMLElement) {
  const overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="scene-label">WOODLAND CLEARING <span>Foundation prototype</span></div><p class="controls"><kbd>W A S D</kbd><span>or</span><kbd>↑ ← ↓ →</kbd><span>to explore</span></p><p class="notice" role="status" hidden></p>';
  host.append(overlay);
  const notice = overlay.querySelector<HTMLElement>('.notice')!;
  return {
    message(text: string) { notice.textContent = text; notice.hidden = !text; },
    dispose() { overlay.remove(); }
  };
}
