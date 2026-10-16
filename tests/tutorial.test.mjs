import test from 'node:test';
import assert from 'node:assert/strict';
import { showTutorial } from '../src/ui/AdventureIntro.ts';

// Minimal DOM adapter exercises the actual dialog event handlers without WebGL.
class Element extends EventTarget {
  children = []; nodes = new Map(); textContent = ''; classList = { toggle() {} };
  setAttribute() {} append(child) { this.children.push(child); }
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
  focus() {} showModal() {} close() {} remove() { this.removed = true; }
}
function fixture(introductory = true) {
  globalThis.document = { createElement: () => new Element() };
  globalThis.window = new EventTarget();
  const host = new Element(); let completed = 0;
  const api = showTutorial(host, () => completed++, { introductory });
  const dialog = host.children[0], board = dialog.querySelector('.practice-board');
  function fire(target, type, props = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(props)) Object.defineProperty(event, key, { value });
    target.dispatchEvent(event);
  }
  const key = (code, type = 'keydown') => fire(dialog, type, { target: board, code, repeat: false });
  return { api, dialog, board, key, fire, completed: () => completed };
}
test('START requires all five letters and release, then completes exactly once', () => {
  const f = fixture();
  f.key('ArrowRight'); f.key('Space');
  for (let i = 0; i < 4; i++) f.key('ArrowRight');
  assert.equal(f.dialog.querySelector('.practice-word').textContent, 'START');
  assert.equal(f.completed(), 0);
  f.key('Space', 'keyup'); f.key('Space', 'keyup');
  assert.equal(f.completed(), 1); assert.equal(f.dialog.removed, true);
});
test('partial submission retries and backtracking removes the last letter', () => {
  const f = fixture(); f.key('KeyD'); f.key('Space'); f.key('KeyD'); f.key('Space', 'keyup');
  assert.equal(f.completed(), 0);
  f.key('Space'); f.key('KeyD'); f.key('KeyA');
  assert.equal(f.dialog.querySelector('.practice-word').textContent, 'S');
  for (let i = 0; i < 4; i++) f.key('KeyD');
  f.key('Space', 'keyup'); assert.equal(f.completed(), 1);
});
test('mouse selection works and focus loss cancels an unfinished selection', () => {
  const f = fixture(); f.key('KeyD');
  f.fire(f.board, 'mousedown', { button: 0 }); f.key('KeyD');
  f.fire(window, 'blur'); f.fire(window, 'mouseup', { button: 0 });
  assert.equal(f.completed(), 0);
  f.key('KeyA'); f.fire(f.board, 'mousedown', { button: 0 });
  for (let i = 0; i < 4; i++) f.key('KeyD');
  f.fire(window, 'mouseup', { button: 0 }); assert.equal(f.completed(), 1);
});
test('cancelling intro does not start game; closing in-game help resumes game', () => {
  const intro = fixture(); intro.fire(intro.dialog, 'cancel'); assert.equal(intro.completed(), 0);
  const help = fixture(false); help.fire(help.dialog, 'cancel'); assert.equal(help.completed(), 1);
});
