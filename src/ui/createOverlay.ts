export function createOverlay(host: HTMLElement) {
  const overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<p class="notice" role="status" hidden></p>';
  host.append(overlay);
  const notice = overlay.querySelector<HTMLElement>('.notice')!;
  return {
    message(text: string) { notice.textContent = text; notice.hidden = !text; },
    dispose() { overlay.remove(); }
  };
}

