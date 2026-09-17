import type { StageTransition } from '../app/StageManager.ts';

export function createStageTransition(host: HTMLElement): StageTransition {
  const element = document.createElement('div'); element.className = 'stage-transition';
  element.setAttribute('aria-hidden', 'true'); element.hidden = true; host.append(element);
  const intro = document.createElement('div'); intro.className = 'stage-intro';
  intro.setAttribute('role', 'status'); intro.setAttribute('aria-live', 'polite');
  intro.setAttribute('aria-atomic', 'true');
  const number = document.createElement('p'), title = document.createElement('h1');
  number.className = 'stage-intro__number'; title.className = 'stage-intro__title';
  intro.append(number, title); element.append(intro); intro.hidden = true;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finishHold: (() => void) | undefined;
  const animations = new Set<Animation>();
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function animate(target: HTMLElement, frames: Keyframe[], duration: number) {
    if (disposed) return;
    const animation = target.animate(frames, {
      duration: reducedMotion() ? 0 : duration, easing: 'ease-in-out', fill: 'forwards'
    });
    animations.add(animation);
    try { await animation.finished; } catch { /* Disposal cancels pending animations. */ }
    if (!disposed) {
      // Persist only opacity; clear finished animation objects after each phase.
      target.style.opacity = String(frames[frames.length - 1].opacity);
    }
    animation.cancel(); animations.delete(animation);
  }
  async function fade(from: number, to: number) {
    if (disposed) return;
    element.hidden = false;
    await animate(element, [{ opacity: from }, { opacity: to }], 420);
  }
  return {
    fadeOut: () => fade(0, 1),
    async showIntro(stage) {
      if (disposed) return;
      element.hidden = false; element.style.opacity = '1';
      element.removeAttribute('aria-hidden');
      number.textContent = stage.stageNumber === undefined ? 'STAGE' : `STAGE ${stage.stageNumber}`;
      title.textContent = stage.title ?? stage.id;
      intro.style.opacity = '0'; intro.hidden = false;
      await animate(intro, [{ opacity: 0 }, { opacity: 1 }], 200);
      if (disposed) return;
      await new Promise<void>(resolve => {
        finishHold = resolve;
        timer = setTimeout(() => { timer = undefined; finishHold = undefined; resolve(); }, reducedMotion() ? 1800 : 1400);
      });
      if (disposed) return;
      await animate(intro, [{ opacity: 1 }, { opacity: 0 }], 200);
      intro.hidden = true; element.setAttribute('aria-hidden', 'true');
    },
    async fadeIn() { await fade(1, 0); element.hidden = true; },
    dispose() {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      finishHold?.(); finishHold = undefined;
      animations.forEach(animation => animation.cancel()); animations.clear(); element.remove();
    }
  };
}
