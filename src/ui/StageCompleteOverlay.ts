export interface StageCompleteContent { title: string; vocabulary: readonly string[]; hasNextStage: boolean }

/** Presentation only: receives a completed stage snapshot from the runtime. */
export function createStageCompleteOverlay(host: HTMLElement, content: StageCompleteContent, onNext: () => void, onExplore?: () => void) {
  const element = document.createElement('section');
  element.className = 'stage-complete'; element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true'); element.setAttribute('aria-labelledby', 'stage-complete-heading');
  element.innerHTML = '<div class="stage-complete__paper"><span class="stage-complete__ornament" aria-hidden="true">✦</span><h1 id="stage-complete-heading">STAGE COMPLETE</h1><h2></h2><p class="stage-complete__label">Words discovered</p><ul class="stage-complete__words"></ul><button type="button">Next Stage <span aria-hidden="true"></span></button></div>';
  element.querySelector('h2')!.textContent = content.title;
  const list = element.querySelector('ul')!;
  content.vocabulary.forEach((word, index) => {
    const item = document.createElement('li'); item.textContent = word;
    item.style.setProperty('--reveal-delay', `${100 + index * 40}ms`); list.append(item);
  });
  const button = element.querySelector('button')!;
  button.hidden = !content.hasNextStage && !onExplore;
  if (onExplore && !content.hasNextStage) button.textContent = 'Explore Forest';
  element.tabIndex = -1;
  const abort = new AbortController();
  button.addEventListener('click', () => { if (button.disabled) return; button.disabled = true; if (content.hasNextStage) onNext(); else onExplore?.(); }, { signal: abort.signal });
  element.addEventListener('keydown', event => {
    if (event.key === 'Tab') { event.preventDefault(); (!button.hidden ? button : element).focus(); }
  }, { signal: abort.signal });
  host.append(element); (!button.hidden ? button : element).focus();
  return { dispose() { abort.abort(); element.remove(); } };
}
