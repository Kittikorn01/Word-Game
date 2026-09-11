import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1 } from '../src/stages/stage1.ts';
import { createGameState } from '../src/simulation/update.ts';
import { questStatus, navigateQuest, finishQuestFeedback, resolveQuestWord, createQuestProgress } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
const setup = () => {
  const state = createGameState(stage1.playerStart, stage1.grid, stage1.quests);
  const validate = createQuestValidator(state.quests.definitions), events = [];
  return { ...state, events, submit: word => resolveQuestWord(state.quests, state.words, { word, selectedTileIds: [], path: [] }, validate, id => {
    assert.equal(questStatus(state.quests.definitions.find(q => q.id === id), state.words), 'COMPLETED');
    events.push(id);
  }) };
};
test('six available data-driven clues contain no own target; navigation wraps and preserves progress', () => {
  const s = setup();
  assert.equal(s.quests.definitions.length, 6);
  for (const q of s.quests.definitions) {
    assert.equal(questStatus(q, s.words), 'AVAILABLE');
    assert.ok(!q.clue.toUpperCase().includes(q.targetWord));
    assert.equal(s.quests.definitions[s.quests.focusedIndex].id, q.id);
    navigateQuest(s.quests, 1);
  }
  assert.equal(s.quests.focusedIndex, 0);
  navigateQuest(s.quests, -1); assert.equal(s.quests.focusedIndex, 5);
  assert.deepEqual(s.words.completedWords, []);
});
test('non-focused WATER completes; wrong and duplicate keep focus/progress and emit no completion', () => {
  const s = setup();
  assert.equal(s.submit(' water ').status, 'CORRECT');
  finishQuestFeedback(s.quests, s.words);
  assert.equal(s.quests.focusedIndex, 0);
  assert.equal(questStatus(s.quests.definitions[2], s.words), 'COMPLETED');
  assert.equal(s.submit('WATER').status, 'ALREADY_COMPLETED');
  assert.equal(s.submit('CAT').status, 'WRONG');
  assert.deepEqual(s.words.completedWords, ['WATER']);
  assert.deepEqual(s.events, ['water-quest']);
});
test('focused completion waits for feedback, skips completed, supports revisiting and manual override', () => {
  const s = setup();
  s.submit('LIGHT'); s.submit('KEY');
  assert.equal(s.quests.focusedIndex, 0);
  finishQuestFeedback(s.quests, s.words); assert.equal(s.quests.focusedIndex, 2);
  navigateQuest(s.quests, -1);
  assert.equal(questStatus(s.quests.definitions[s.quests.focusedIndex], s.words), 'COMPLETED');
  navigateQuest(s.quests, 1); s.submit('WATER'); navigateQuest(s.quests, 1);
  finishQuestFeedback(s.quests, s.words); assert.equal(s.quests.focusedIndex, 3);
});
test('all 720 quest orders complete exactly once with no stage transition', () => {
  function* permutations(values) {
    if (!values.length) { yield []; return; }
    for (const value of values) for (const rest of permutations(values.filter(v => v !== value))) yield [value, ...rest];
  }
  for (const order of permutations(stage1.vocabulary)) {
    const s = setup();
    for (const word of order) { assert.equal(s.submit(word).status, 'CORRECT'); finishQuestFeedback(s.quests, s.words); }
    assert.ok(s.quests.definitions.every(q => questStatus(q, s.words) === 'COMPLETED'));
    const focus = s.quests.focusedIndex;
    for (const word of order) assert.equal(s.submit(word).status, 'ALREADY_COMPLETED');
    finishQuestFeedback(s.quests, s.words);
    assert.equal(s.quests.focusedIndex, focus);
    assert.equal(s.events.length, 6); assert.equal(s.words.completedWords.length, 6);
  }
});
test('quest policy rejects vocabulary words without a quest and malformed quest mappings', () => {
  const validate = createQuestValidator([stage1.quests[0]]);
  assert.equal(validate({ word: 'BOOK', selectedTileIds: [] }, []).status, 'WRONG');
  assert.throws(() => createQuestProgress([stage1.quests[0], stage1.quests[0]]));
  const empty = createQuestProgress(); navigateQuest(empty, 1); finishQuestFeedback(empty, { completedWords: [] });
  assert.equal(empty.focusedIndex, 0);
});
