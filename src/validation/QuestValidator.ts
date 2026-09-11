import type { QuestDefinition } from '../quests/types.ts';
import { normalizeWord, type WordValidator } from './WordValidator.ts';

/** All stage quests are completable; focus is deliberately absent from this policy. */
export function createQuestValidator(quests: readonly QuestDefinition[]): WordValidator {
  const targets = new Set(quests.map(quest => normalizeWord(quest.targetWord)));
  return (submission, completedWords) => {
    const word = normalizeWord(submission.word);
    const status = !word || !targets.has(word) ? 'WRONG'
      : completedWords.some(value => normalizeWord(value) === word) ? 'ALREADY_COMPLETED' : 'CORRECT';
    return Object.freeze({ status, word, selectedTileIds: Object.freeze([...submission.selectedTileIds]) });
  };
}
