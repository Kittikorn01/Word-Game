import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3 } from '../src/stages/stage3.ts';
import { stages } from '../src/stages/registry.ts';
import { StageManager } from '../src/app/StageManager.ts';
import { createGameState } from '../src/simulation/update.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';

test('Stage 2 uses the existing intro flow to mount the empty Stage 3 runtime', async () => {
  const events = [];
  const manager = new StageManager(stages, stages[1].id, stage => {
    events.push(stage.id); return { lock() {}, unlock() {}, dispose() {} };
  }, { async fadeOut() {}, async fadeIn() {}, async showIntro(stage) {
    assert.equal(stage.stageNumber, 3); assert.equal(stage.title, 'A Busy Little Town'); events.push('intro');
  }, dispose() {} });
  manager.start(); assert.equal(await manager.next(), true);
  assert.deepEqual(events, [stages[1].id, 'intro', stage3.id]);
  assert.equal(await manager.next(), false); manager.dispose();
  const state = createGameState(stage3.playerStart, stage3.grid, stage3.quests);
  const completion = new StageCompletionController(stage3.id, () => assert.fail('blockout completed'));
  completion.check(state.quests, state.words); completion.update(100, false, false);
  assert.deepEqual(stage3.quests, []); assert.deepEqual(stage3.vocabulary, []);
  assert.equal(stage3.worldObjects, undefined); assert.equal(stage3.worldReactions, undefined);
  assert.equal(stage3.forestProgression, undefined);
});

