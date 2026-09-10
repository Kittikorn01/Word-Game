import type { WordSelection } from '../selection/WordSelection.ts';
import type { WordResult, WordStatus } from '../validation/WordValidator.ts';

const presentation: Record<WordStatus, { tone: string; label: string; seconds: number }> = {
  CORRECT: { tone: 'correct', label: 'WORD FOUND', seconds: 2.3 },
  ALREADY_COMPLETED: { tone: 'already', label: 'Already found.', seconds: 2.0 },
  WRONG: { tone: 'wrong', label: "That word isn't needed here.", seconds: 2.8 }
};

export function createWordSelectionOverlay(host: HTMLElement) {
  const element = document.createElement('div');
  element.className = 'word-selection'; element.hidden = true;
  element.setAttribute('role', 'status'); element.setAttribute('aria-atomic', 'true');
  const word = document.createElement('div'); word.className = 'word-selection__word';
  const status = document.createElement('div'); status.className = 'word-selection__status';
  status.hidden = true; element.append(word, status); host.append(element);
  let remaining = 0;
  const clear = () => { remaining = 0; element.hidden = true; };
  return {
    show(result: WordResult) {
      const style = presentation[result.status];
      word.textContent = result.word; status.textContent = style.label;
      status.hidden = false; element.dataset.tone = style.tone;
      remaining = style.seconds; element.hidden = false;
    },
    update(selection: WordSelection, dt: number) {
      // A fresh selection takes priority over the previous result in this shared HUD.
      if (selection.isSelecting) {
        remaining = 0; status.hidden = true; element.dataset.tone = '';
        if (word.textContent !== selection.currentWord) word.textContent = selection.currentWord;
        element.hidden = !selection.currentWord;
        return;
      }
      if (Number.isFinite(dt) && dt > 0) remaining = Math.max(0, remaining - dt);
      element.hidden = remaining <= 0;
    },
    clear,
    dispose() { element.remove(); }
  };
}
