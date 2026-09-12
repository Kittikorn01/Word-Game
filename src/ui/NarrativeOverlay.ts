import type { QuestProgress } from '../simulation/QuestProgress.ts';
export function createNarrativeOverlay(host: HTMLElement) {
  const banner = document.createElement('aside'), heading = document.createElement('strong'), clue = document.createElement('p');
  banner.className = 'new-quest'; banner.setAttribute('role','status'); banner.setAttribute('aria-live','polite');
  heading.textContent = 'NEW QUEST'; banner.append(heading,clue); banner.hidden = true;
  host.append(banner);
  return {
    update(quests: QuestProgress) {
      const current = quests.presentations[0];
      const visible = !!current && current.remaining <= 3.2;
      banner.hidden = !visible;
      if (visible) {
        const text = quests.definitions.find(q => q.id === current.questId)!.clue;
        if (clue.textContent !== text) clue.textContent = text;
        const opacity = Math.min(1,(3.2-current.remaining)/.2,current.remaining/.25);
        banner.style.opacity = String(Math.max(0,opacity));
        banner.style.transform = `translate(-50%,${-6*(1-opacity)}px) scale(${.98+.02*opacity})`;
      }
    },
    dispose() { banner.remove(); }
  };
}
