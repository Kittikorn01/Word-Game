import type { QuestDefinition, QuestStatus } from '../quests/types.ts';
import type { WordProgress } from './WordProgress.ts';
import { normalizeWord } from '../validation/WordValidator.ts';
import type { WordValidator } from '../validation/WordValidator.ts';
import type { WordSubmission } from '../selection/WordSelection.ts';
import { resolveWord } from './WordProgress.ts';

export interface QuestProgress {
  readonly definitions: readonly QuestDefinition[];
  focusedIndex: number;
  pendingAdvanceId: string | null;
}
export function createQuestProgress(definitions: readonly QuestDefinition[] = []): QuestProgress {
  const ids = new Set<string>(), targets = new Set<string>();
  const quests = definitions.map(quest => {
    const targetWord = normalizeWord(quest.targetWord);
    if (!quest.id || !quest.clue.trim() || !targetWord || ids.has(quest.id) || targets.has(targetWord)) {
      throw new Error('Quests require unique ids and targets, and nonempty clues.');
    }
    ids.add(quest.id); targets.add(targetWord);
    return Object.freeze({ ...quest, targetWord });
  });
  return { definitions: Object.freeze(quests), focusedIndex: 0, pendingAdvanceId: null };
}
/** Completed words are the single canonical completion ledger. */
export function questStatus(quest: QuestDefinition, words: WordProgress): QuestStatus {
  return words.completedWords.some(word => normalizeWord(word) === quest.targetWord) ? 'COMPLETED' : 'AVAILABLE';
}
export function navigateQuest(progress: QuestProgress, direction: -1 | 1): void {
  progress.pendingAdvanceId = null;
  if (progress.definitions.length) progress.focusedIndex = (progress.focusedIndex + direction + progress.definitions.length) % progress.definitions.length;
}
export function queueQuestAdvance(progress: QuestProgress, questId: string): void {
  if (progress.definitions[progress.focusedIndex]?.id === questId) progress.pendingAdvanceId = questId;
}
/** Commits progress before notifying observers. Duplicate/wrong submissions emit nothing. */
export function resolveQuestWord(progress: QuestProgress, words: WordProgress, submission: WordSubmission,
  validate: WordValidator, onQuestCompleted: (questId: string) => void = () => {}) {
  const result = resolveWord(words, submission, validate);
  if (result.status === 'CORRECT') {
    const quest = progress.definitions.find(item => item.targetWord === result.word);
    if (quest) { queueQuestAdvance(progress, quest.id); onQuestCompleted(quest.id); }
  }
  return result;
}
export function finishQuestFeedback(progress: QuestProgress, words: WordProgress): void {
  const id = progress.pendingAdvanceId;
  progress.pendingAdvanceId = null;
  if (!id || progress.definitions[progress.focusedIndex]?.id !== id) return;
  for (let offset = 1; offset < progress.definitions.length; offset++) {
    const index = (progress.focusedIndex + offset) % progress.definitions.length;
    if (questStatus(progress.definitions[index], words) === 'AVAILABLE') { progress.focusedIndex = index; return; }
  }
}
