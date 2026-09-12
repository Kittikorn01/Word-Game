import type { QuestProgress } from '../simulation/QuestProgress.ts';
import type { ExitState } from '../simulation/ExitInteraction.ts';
export function createNarrativeOverlay(host: HTMLElement) {
  const banner = document.createElement('aside'), heading = document.createElement('strong'), clue = document.createElement('p');
  banner.className = 'new-quest'; banner.setAttribute('role','status'); banner.setAttribute('aria-live','polite');
  heading.textContent = 'NEW QUEST'; banner.append(heading,clue); banner.hidden = true;
  const prompt = document.createElement('div'); prompt.className = 'exit-prompt'; prompt.setAttribute('role','status'); prompt.hidden = true;
  host.append(banner,prompt);
  return {
    update(quests: QuestProgress, exit: ExitState) {
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
      prompt.hidden = !exit.nearby || exit.completed;
      const message = exit.canInteractWithExit ? 'Press E to leave' : 'There is still something to do here.';
      if (prompt.textContent !== message) prompt.textContent = message;
    },
    dispose() { banner.remove(); prompt.remove(); }
  };
}
