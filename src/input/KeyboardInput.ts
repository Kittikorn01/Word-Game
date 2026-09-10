import type { MoveAction } from '../simulation/types.ts';
const bindings: Record<string, MoveAction> = {
  KeyW: { x: 0, z: -1 }, ArrowUp: { x: 0, z: -1 },
  KeyS: { x: 0, z: 1 }, ArrowDown: { x: 0, z: 1 },
  KeyA: { x: -1, z: 0 }, ArrowLeft: { x: -1, z: 0 },
  KeyD: { x: 1, z: 0 }, ArrowRight: { x: 1, z: 0 }
};
export class KeyboardInput {
  private pressed = new Set<string>();
  private abort = new AbortController();
  constructor() {
    const options = { signal: this.abort.signal };
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (bindings[event.code]) { event.preventDefault(); this.pressed.add(event.code); }
    }, options);
    window.addEventListener('keyup', event => this.pressed.delete(event.code), options);
    window.addEventListener('blur', () => this.clear(), options);
    document.addEventListener('visibilitychange', () => this.clear(), options);
  }
  read(): MoveAction {
    const active = [...this.pressed].map(key => bindings[key]);
    return {
      x: Number(active.some(a => a.x === 1)) - Number(active.some(a => a.x === -1)),
      z: Number(active.some(a => a.z === 1)) - Number(active.some(a => a.z === -1))
    };
  }
  clear(): void { this.pressed.clear(); }
  dispose(): void { this.abort.abort(); this.clear(); }
}
