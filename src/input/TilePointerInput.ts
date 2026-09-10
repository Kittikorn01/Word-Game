export class TilePointerInput {
  private abort = new AbortController();
  private position: { x: number; y: number } | null = null;
  constructor(canvas: HTMLCanvasElement, private pick: (x: number, y: number) => string | null,
    private hover: (id: string | null) => void) {
    const options = { signal: this.abort.signal };
    canvas.addEventListener('pointermove', event => { this.position = { x: event.clientX, y: event.clientY }; this.refresh(); }, options);
    canvas.addEventListener('pointerleave', () => this.clear(), options);
    canvas.addEventListener('pointercancel', () => this.clear(), options);
    window.addEventListener('blur', () => this.clear(), options);
    document.addEventListener('visibilitychange', () => this.clear(), options);
  }
  refresh(): void { if (this.position) this.hover(this.pick(this.position.x, this.position.y)); }
  clear(): void { this.position = null; this.hover(null); }
  dispose(): void { this.abort.abort(); this.clear(); }
}
