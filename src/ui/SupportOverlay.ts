import type { SupportObjectives } from '../simulation/SupportObjectives.ts';
import type { GridCoordinate } from '../grid/types.ts';
export function createSupportOverlay(host: HTMLElement, support: SupportObjectives) {
  const element = document.createElement('aside'); element.className = 'support-hud';
  element.setAttribute('aria-label', 'Optional support objectives');
  const heading = document.createElement('strong'); heading.textContent = 'ROOM DISCOVERIES';
  const list = document.createElement('div'), prompt = document.createElement('p'); prompt.setAttribute('role', 'status');
  const rows = support.definitions.map(d => { const row = document.createElement('p'); list.append(row); return { d, row }; });
  element.append(heading, list, prompt); (host.querySelector('.assistance-hud') ?? host).append(element); element.hidden = !rows.length;
  return {
    render(tile: GridCoordinate, blocked: boolean) {
      for (const {d,row} of rows) {
        const done = support.completedIds.has(d.id);
        const text = `${done ? '\u2713' : '\u25c7'} ${d.label} ${done ? '' : 'Reward: \u25c7' + d.reward}`;
        if (row.textContent !== text) row.textContent = text; row.dataset.complete = String(done);
      }
      const near = support.nearby(tile);
      const text = near ? blocked ? 'Finish selection or movement to inspect.' : `[E] ${near.label}` : 'Explore the north wall. Press E near an object.';
      if (prompt.textContent !== text) prompt.textContent = text;
    }, dispose() { element.remove(); }
  };
}
