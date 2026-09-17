import type { WordSelection } from '../selection/WordSelection.ts';
import type { WordResult, WordStatus } from '../validation/WordValidator.ts';

const presentation: Record<WordStatus, { tone: string; label: string; seconds: number }> = {
  CORRECT: { tone: 'correct', label: 'WORD FOUND', seconds: 2.3 },
  ALREADY_COMPLETED: { tone: 'already', label: 'Already found.', seconds: 2.0 },
  WRONG: { tone: 'wrong', label: "That word isn't needed here.", seconds: 2.8 }
};

export function createWordSelectionOverlay(host: HTMLElement, onFeedbackFinished: () => void = () => {}) {
  const element = document.createElement('div');
  element.className = 'word-selection'; element.hidden = true;
  element.setAttribute('role', 'status'); element.setAttribute('aria-atomic', 'true');
  const heading = document.createElement('div'); heading.className = 'word-selection__heading';
  const word = document.createElement('div'); word.className = 'word-selection__word';
  const status = document.createElement('div'); status.className = 'word-selection__status';
  status.hidden = true; element.append(heading, word, status); host.append(element);
  let remaining = 0;
  let wordAnimation: Animation | undefined;
  const reveal = () => {
    wordAnimation?.cancel();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      wordAnimation = word.animate([{ opacity: .65, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 140, easing: 'ease-out' });
    }
  };
  const clear = () => {
    const wasShowing = remaining > 0;
    remaining = 0; element.hidden = true;
    if (wasShowing) onFeedbackFinished();
  };
  return {
    show(result: WordResult) {
      clear();
      const style = presentation[result.status];
      heading.textContent = result.status === 'CORRECT' ? '? WORD FOUND' : result.status === 'ALREADY_COMPLETED' ? '? ALREADY FOUND' : '? NOT NEEDED';
      word.textContent = result.word; status.textContent = style.label;
      reveal();
      status.hidden = false; element.dataset.tone = style.tone;
      remaining = style.seconds; element.hidden = false;
    },
    update(selection: WordSelection, dt: number) {
      // A fresh selection takes priority over the previous result in this shared HUD.
      if (selection.isSelecting) {
        clear(); status.hidden = true; element.dataset.tone = '';
        heading.textContent = 'CURRENT WORD';
        if (word.textContent !== selection.currentWord) { word.textContent = selection.currentWord; reveal(); }
        element.hidden = !selection.currentWord;
        return;
      }
      if (Number.isFinite(dt) && dt > 0 && remaining > 0) {
        if (dt >= remaining) clear(); else remaining -= dt;
      }
      element.hidden = remaining <= 0;
    },
    clear,
    dispose() { wordAnimation?.cancel(); element.remove(); }
  };
}
