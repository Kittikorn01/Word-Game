import type { WordSubmission } from '../selection/WordSelection.ts';
import type { WordResult, WordValidator } from '../validation/WordValidator.ts';

/** Session gameplay data; never stored in UI or meshes. */
export interface WordProgress { completedWords: readonly string[] }
export function createWordProgress(): WordProgress { return { completedWords: Object.freeze([]) }; }
export function resolveWord(progress: WordProgress, submission: WordSubmission, validate: WordValidator): WordResult {
  const result = validate(submission, progress.completedWords);
  if (result.status === 'CORRECT' && !progress.completedWords.includes(result.word)) {
    progress.completedWords = Object.freeze([...progress.completedWords, result.word]);
  }
  return result;
}
