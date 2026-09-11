import type { QuestProgress } from '../simulation/QuestProgress.ts';
import { questStatus } from '../simulation/QuestProgress.ts';
import type { WordProgress } from '../simulation/WordProgress.ts';

export function createQuestOverlay(host: HTMLElement, onFocus: (index: number) => void) {
  const element = document.createElement('section');
  element.className = 'quest-hud'; element.setAttribute('aria-label', 'Quests');
  element.innerHTML = '<div class="quest-hud__heading"><strong>QUESTS</strong><span class="quest-hud__progress"></span></div><ul class="quest-hud__list" aria-label="Stage quests"></ul><div class="quest-hud__content" aria-live="polite" aria-atomic="true"><p class="quest-hud__clue"></p></div>';
  const list = element.querySelector<HTMLUListElement>('.quest-hud__list')!;
  const clue = element.querySelector<HTMLElement>('.quest-hud__clue')!;
  const counter = element.querySelector<HTMLElement>('.quest-hud__progress')!;
  const rows: { button: HTMLButtonElement; mark: HTMLElement; text: HTMLElement }[] = [];
  const abort = new AbortController();
  // Delegate within the HUD. No canvas pointer event is dispatched by a row click.
  list.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    const index = rows.findIndex(row => row.button === button);
    if (index >= 0) onFocus(index);
  }, { signal: abort.signal });
  host.append(element);
  return {
    render(progress: QuestProgress, words: WordProgress) {
      const quest = progress.definitions[progress.focusedIndex];
      element.hidden = !quest;
      if (!quest) return;
      // Retain row nodes across renders so keyboard focus and list scroll survive.
      if (rows.length !== progress.definitions.length) {
        list.replaceChildren(); rows.length = 0;
        progress.definitions.forEach(() => {
          const item = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'quest-hud__row';
          const mark = document.createElement('span');
          mark.className = 'quest-hud__mark'; mark.setAttribute('aria-hidden', 'true');
          const text = document.createElement('span'); text.className = 'quest-hud__summary';
          button.append(mark, text); item.append(button); list.append(item);
          rows.push({ button, mark, text });
        });
      }
      let completedCount = 0;
      progress.definitions.forEach((definition, index) => {
        const completed = questStatus(definition, words) === 'COMPLETED';
        const row = rows[index];
        if (completed) completedCount++;
        row.mark.textContent = completed ? '\u2713' : '\u25a1';
        row.text.textContent = definition.clue;
        row.button.dataset.completed = String(completed);
        row.button.setAttribute('aria-pressed', String(index === progress.focusedIndex));
        row.button.setAttribute('aria-label', `${definition.clue} — ${completed ? 'Completed' : 'Available'}`);
      });
      if (clue.textContent !== quest.clue) clue.textContent = quest.clue;
      counter.textContent = `${completedCount} / ${progress.definitions.length}`;
      counter.setAttribute('aria-label', `${completedCount} of ${progress.definitions.length} quests completed`);
    },
    dispose() { abort.abort(); element.remove(); }
  };
}
