import { questStatus } from '../simulation/QuestProgress.ts';
import type { QuestDefinition } from '../quests/types.ts';
import { normalizeWord, type WordValidator } from './WordValidator.ts';
import type { WordProgress } from '../simulation/WordProgress.ts';

/** Prerequisites gate validation; quest focus and presentation timing do not. */
export function createQuestValidator(quests: readonly QuestDefinition[], progress?: WordProgress): WordValidator {
  const targets = new Map(quests.map(quest => [normalizeWord(quest.targetWord), quest]));
  return (submission, completedWords) => {
    const word = normalizeWord(submission.word);
    const locked = !!targets.get(word) && questStatus(targets.get(word)!, { completedWords: [...completedWords], worldConditions: progress?.worldConditions }) === 'LOCKED';
    const status = !word || !targets.has(word) || locked ? 'WRONG'
      : completedWords.some(value => normalizeWord(value) === word) ? 'ALREADY_COMPLETED' : 'CORRECT';
    return Object.freeze({ status, word, ...(locked ? { reason: 'LOCKED' as const } : {}), selectedTileIds: Object.freeze([...submission.selectedTileIds]) });
  };
}


