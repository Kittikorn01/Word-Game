/** One press edge, independent of movement. No repeats, typing fields or modifier shortcuts. */
export class ExitInput {
  private down = false;
  private abort = new AbortController();
  constructor(onInteract: () => void) {
    const options = {signal:this.abort.signal};
    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyE' || event.ctrlKey || event.altKey || event.metaKey ||
          (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
      event.preventDefault();
      if (event.repeat || this.down) return;
      this.down = true; onInteract();
    },options);
    window.addEventListener('keyup', event => { if (event.code === 'KeyE') this.clear(); },options);
    window.addEventListener('blur', () => this.clear(),options);
    document.addEventListener('visibilitychange', () => this.clear(),options);
  }
  clear(): void { this.down = false; }
  dispose(): void { this.abort.abort(); this.clear(); }
}
