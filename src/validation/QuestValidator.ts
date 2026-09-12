import { questStatus } from '../simulation/QuestProgress.ts';
import type { QuestDefinition } from '../quests/types.ts';
import { normalizeWord, type WordValidator } from './WordValidator.ts';

/** Prerequisites gate validation; quest focus and presentation timing do not. */
export function createQuestValidator(quests: readonly QuestDefinition[]): WordValidator {
  const targets = new Map(quests.map(quest => [normalizeWord(quest.targetWord), quest]));
  return (submission, completedWords) => {
    const word = normalizeWord(submission.word);
    const status = !word || !targets.has(word) || questStatus(targets.get(word)!, { completedWords: [...completedWords] }) === 'LOCKED' ? 'WRONG'
      : completedWords.some(value => normalizeWord(value) === word) ? 'ALREADY_COMPLETED' : 'CORRECT';
    return Object.freeze({ status, word, selectedTileIds: Object.freeze([...submission.selectedTileIds]) });
  };
}


