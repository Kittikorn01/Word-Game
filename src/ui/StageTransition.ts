import type { StageTransition } from '../app/StageManager.ts';

export function createStageTransition(host: HTMLElement): StageTransition {
  const element = document.createElement('div'); element.className = 'stage-transition';
  element.setAttribute('aria-hidden', 'true'); element.hidden = true; host.append(element);
  let animation: Animation | undefined;
  async function fade(from: number, to: number) {
    element.hidden = false;
    animation = element.animate([{ opacity: from }, { opacity: to }], {
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420,
      easing: 'ease-in-out', fill: 'forwards'
    });
    try { await animation.finished; } catch { /* Runtime disposal cancels the transition. */ }
  }
  return {
    fadeOut: () => fade(0, 1),
    async fadeIn() { await fade(1, 0); element.hidden = true; },
    dispose() { animation?.cancel(); element.remove(); }
  };
}
