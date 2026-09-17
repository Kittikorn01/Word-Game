export class WordSelectionInput {
  private abort = new AbortController();
  private spaceSelecting = false;
  private pointerId: number | null = null;
  private canvas: HTMLCanvasElement;
  private submit: () => void;
  private cancel: () => void;
  constructor(canvas: HTMLCanvasElement, start: () => boolean,
    submit: () => void, cancel: () => void) {
    this.canvas = canvas; this.submit = submit; this.cancel = cancel;
    const options = { signal: this.abort.signal };
    window.addEventListener('keydown', event => {
      if (event.code !== 'Space' || event.repeat || this.pointerId !== null || this.spaceSelecting) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input,textarea,select,button'))) return;
      if (start()) { event.preventDefault(); this.spaceSelecting = true; }
    }, options);
    window.addEventListener('keyup', event => {
      if (event.code !== 'Space' || !this.spaceSelecting) return;
      event.preventDefault(); this.spaceSelecting = false; this.submit();
    }, options);
    canvas.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || this.pointerId !== null || this.spaceSelecting) return;
      if (!start()) return;
      event.preventDefault(); this.pointerId = event.pointerId;
      try { canvas.setPointerCapture(event.pointerId); } catch { this.reset(); }
    }, options);
    window.addEventListener('pointerup', event => {
      if (event.pointerId === this.pointerId && event.button === 0) this.finish(true);
    }, options);
    // Also catches a missed left release while another mouse button remains held.
    window.addEventListener('pointermove', event => {
      if (event.pointerId === this.pointerId && !(event.buttons & 1)) this.finish(true);
    }, options);
    canvas.addEventListener('lostpointercapture', () => this.reset(), options);
    window.addEventListener('pointercancel', event => {
      if (event.pointerId === this.pointerId) this.reset();
    }, options);
    window.addEventListener('blur', () => this.reset(), options);
    document.addEventListener('visibilitychange', () => this.reset(), options);
  }
  private finish(submitted: boolean): void {
    const id = this.pointerId;
    if (id === null) return;
    this.pointerId = null;
    if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    if (submitted) this.submit(); else this.cancel();
  }
  reset(): void {
    if (this.spaceSelecting) { this.spaceSelecting = false; this.cancel(); }
    this.finish(false);
  }
  dispose(): void { this.reset(); this.abort.abort(); }
}
