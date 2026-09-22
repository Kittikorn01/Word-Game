import type { QuestProgress } from '../simulation/QuestProgress.ts';
import { questStatus } from '../simulation/QuestProgress.ts';
import type { WordProgress } from '../simulation/WordProgress.ts';

export function createQuestOverlay(host: HTMLElement, onFocus: (index: number) => void, fixedSlots = false) {
  const element = document.createElement('section');
  element.className = 'quest-hud'; element.setAttribute('aria-label', 'Quests');
  element.innerHTML = '<div class="quest-hud__heading"><strong>QUESTS</strong><span class="quest-hud__progress"></span></div><ul class="quest-hud__list" aria-label="Stage quests"></ul><div class="quest-hud__content" aria-live="polite" aria-atomic="true"><p class="quest-hud__clue"></p></div>';
  const list = element.querySelector<HTMLUListElement>('.quest-hud__list')!;
  const clue = element.querySelector<HTMLElement>('.quest-hud__clue')!;
  const hint = document.createElement('p'); hint.className = 'quest-hud__hint'; hint.hidden = true;
  element.querySelector('.quest-hud__content')!.append(hint);
  const counter = element.querySelector<HTMLElement>('.quest-hud__progress')!;
  const rows = new Map<string, { item: HTMLLIElement; button: HTMLButtonElement; mark: HTMLElement; text: HTMLElement }>();
  const abort = new AbortController();
  host.append(element);
  return {
    render(progress: QuestProgress, words: WordProgress) {
      const visible = progress.definitions.filter(q => fixedSlots || progress.discoveredIds.includes(q.id));
      element.hidden = !visible.length;
      for (const [id,row] of rows) if (!visible.some(q => q.id === id)) { row.item.remove(); rows.delete(id); }
      for (const definition of visible) {
        let row = rows.get(definition.id);
        if (!row) {
          const item = document.createElement('li'), button = document.createElement('button');
          button.type = 'button'; button.className = 'quest-hud__row';
          const mark = document.createElement('span'), text = document.createElement('span');
          mark.className = 'quest-hud__mark'; mark.setAttribute('aria-hidden','true'); text.className = 'quest-hud__summary';
          button.append(mark,text); item.append(button); list.append(item);
          button.addEventListener('click', () => onFocus(progress.definitions.findIndex(q => q.id === definition.id)), {signal:abort.signal});
          row = {item,button,mark,text}; rows.set(definition.id,row);
        }
        const state = questStatus(definition,words);
        const completed = state === 'COMPLETED';
        const locked = fixedSlots && state === 'LOCKED';
        row.mark.textContent = completed ? '\u2713' : '\u25a1'; row.text.textContent = locked ? 'Locked' : definition.clue;
        if (locked) row.mark.textContent = '\uD83D\uDD12';
        row.button.disabled = locked;
        row.button.dataset.state = state;
        if (fixedSlots) {
          let badge = row.button.querySelector<HTMLElement>('.quest-hud__state');
          if (!badge) { badge = document.createElement('span'); badge.className = 'quest-hud__state'; row.button.append(badge); }
          badge.textContent = locked ? '' : state;
        }
        row.button.dataset.completed = String(completed);
        row.button.setAttribute('aria-pressed',String(progress.definitions[progress.focusedIndex]?.id === definition.id));
        row.button.setAttribute('aria-label', locked ? 'Locked quest' : `${definition.clue} ? ${completed ? 'Completed' : 'Available'}`);
      }
      const focused = progress.definitions[progress.focusedIndex];
      clue.textContent = focused && progress.discoveredIds.includes(focused.id) ? focused.clue : '';
      const completed = visible.filter(q => questStatus(q,words) === 'COMPLETED').length;
      counter.textContent = `${completed} / ${visible.length}`;
      counter.setAttribute('aria-label',`${completed} of ${visible.length} ${fixedSlots ? '' : 'discovered '}quests completed`);
    },
    renderHint(text: string) { hint.hidden = !text; const value = text ? `Hint: ${text}` : ''; if (hint.textContent !== value) hint.textContent = value; },
    dispose() { abort.abort(); element.remove(); }
  };
}

