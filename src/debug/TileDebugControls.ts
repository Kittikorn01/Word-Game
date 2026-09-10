import type { LetterGrid } from '../grid/LetterGrid.ts';

/** Temporary Prompt 1 input adapter. Remove this binding for real word selection. */
export function bindTileDebugControls(canvas: HTMLCanvasElement, grid: LetterGrid,
  pick: (x: number, y: number) => string | null): () => void {
  const abort = new AbortController(), options = { signal: abort.signal };
  canvas.addEventListener('click', event => {
    if (event.button !== 0) return;
    const id = pick(event.clientX, event.clientY);
    if (id) grid.toggleSelected(id);
  }, options);
  window.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
      (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
    if (event.code === 'KeyC') grid.playCorrectOnSelected();
    if (event.code === 'KeyR') grid.reset();
  }, options);
  return () => abort.abort();
}
