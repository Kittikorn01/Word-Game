import type { WordSubmission } from '../selection/WordSelection.ts';

export type WordStatus = 'CORRECT' | 'WRONG' | 'ALREADY_COMPLETED';
export interface WordResult {
  readonly status: WordStatus;
  readonly word: string;
  readonly selectedTileIds: readonly string[];
  readonly reason?: 'LOCKED';
}
export type WordValidator = (submission: WordSubmission, completedWords: readonly string[]) => WordResult;
export const normalizeWord = (word: string): string => word.trim().toUpperCase();

/** Replace this policy at composition time when active quests become available. */
export function createStageWordValidator(vocabulary: readonly string[]): WordValidator {
  const targets = new Set(vocabulary.map(normalizeWord));
  return (submission, completedWords) => {
    const word = normalizeWord(submission.word);
    const status: WordStatus = !word || !targets.has(word) ? 'WRONG'
      : completedWords.some(completed => normalizeWord(completed) === word) ? 'ALREADY_COMPLETED' : 'CORRECT';
    return Object.freeze({ status, word, selectedTileIds: Object.freeze([...submission.selectedTileIds]) });
  };
}
