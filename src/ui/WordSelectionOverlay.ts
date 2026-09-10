import type { WordSelection, WordSubmission } from '../selection/WordSelection.ts';

export function createWordSelectionOverlay(host: HTMLElement) {
  const element = document.createElement('div');
  element.className = 'word-selection'; element.hidden = true;
  element.setAttribute('role', 'status'); host.append(element);
  let feedback = '', remaining = 0;
  return {
    submitted(result: WordSubmission) { feedback = `Submitted: ${result.word}`; remaining = 1.8; },
    update(selection: WordSelection, dt: number) {
      if (selection.isSelecting) { feedback = ''; remaining = 0; }
      remaining = Math.max(0, remaining - dt);
      const text = selection.isSelecting ? selection.currentWord : remaining > 0 ? feedback : '';
      if (element.textContent !== text) element.textContent = text;
      element.hidden = !text;
    },
    dispose() { element.remove(); }
  };
}
