import type { QuestDefinition, QuestStatus } from '../quests/types.ts';
import type { WordProgress } from './WordProgress.ts';
import { normalizeWord } from '../validation/WordValidator.ts';
import type { WordValidator } from '../validation/WordValidator.ts';
import type { WordSubmission } from '../selection/WordSelection.ts';
import { resolveWord } from './WordProgress.ts';

export interface QuestProgress {
  readonly definitions: readonly QuestDefinition[];
  discoveredIds: string[];
  presentations: { questId: string; remaining: number }[];
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
    return Object.freeze({ ...quest, targetWord, requires: Object.freeze((quest.requires ?? []).map(normalizeWord)) });
  });
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (quest: QuestDefinition) => {
    if (visiting.has(quest.targetWord)) throw new Error('Cyclic quest dependency.');
    if (visited.has(quest.targetWord)) return;
    visiting.add(quest.targetWord);
    for (const word of quest.requires ?? []) {
      const parent = quests.find(q => q.targetWord === word);
      if (!parent) throw new Error('Missing quest prerequisite.');
      visit(parent);
    }
    visiting.delete(quest.targetWord); visited.add(quest.targetWord);
  };
  quests.forEach(visit);
  const discoveredIds = quests.filter(q => !q.requires.length && !q.requiresWorld).map(q => q.id);
  return { definitions: Object.freeze(quests), discoveredIds, presentations: [], focusedIndex: Math.max(0,quests.findIndex(q => discoveredIds.includes(q.id))), pendingAdvanceId: null };
}
/** Completed words are the single canonical completion ledger. */
export function questStatus(quest: QuestDefinition, words: WordProgress): QuestStatus {
  const completed = new Set(words.completedWords.map(normalizeWord));
  if (completed.has(normalizeWord(quest.targetWord))) return 'COMPLETED';
  return (quest.requires ?? []).every(word => completed.has(normalizeWord(word))) &&
    (!quest.requiresWorld || words.worldConditions?.[quest.requiresWorld]) ? 'AVAILABLE' : 'LOCKED';
}
export function navigateQuest(progress: QuestProgress, direction: -1 | 1): void {
  progress.pendingAdvanceId = null;
  const indices = progress.definitions.flatMap((q,i) => progress.discoveredIds.includes(q.id) ? [i] : []);
  if (indices.length) progress.focusedIndex = indices[(indices.indexOf(progress.focusedIndex) + direction + indices.length) % indices.length];
}
export function queueQuestAdvance(progress: QuestProgress, questId: string): void {
  if (progress.definitions[progress.focusedIndex]?.id === questId) progress.pendingAdvanceId = questId;
}
/** Commits progress before notifying observers. Duplicate/wrong submissions emit nothing. */
export function resolveQuestWord(progress: QuestProgress, words: WordProgress, submission: WordSubmission,
  validate: WordValidator, onQuestCompleted: (questId: string) => void = () => {}) {
  const result = resolveWord(words, submission, validate);
  if (result.status === 'CORRECT') {
    refreshQuestAvailability(progress, words);
    const quest = progress.definitions.find(item => item.targetWord === result.word);
    if (quest) { queueQuestAdvance(progress, quest.id); onQuestCompleted(quest.id); }
  }
  return result;
}
/** Also called after simulation reactions finish, not only after word submissions. */
export function refreshQuestAvailability(progress: QuestProgress, words: WordProgress): void {
  for (const quest of progress.definitions) {
    if (questStatus(quest, words) === 'AVAILABLE' && !progress.discoveredIds.includes(quest.id) &&
      !progress.presentations.some(p => p.questId === quest.id)) {
      progress.presentations.push({ questId: quest.id, remaining: 3.5 });
    }
  }
}
export function finishQuestFeedback(progress: QuestProgress, words: WordProgress): void {
  const id = progress.pendingAdvanceId;
  progress.pendingAdvanceId = null;
  if (!id || progress.definitions[progress.focusedIndex]?.id !== id) return;
  for (let offset = 1; offset < progress.definitions.length; offset++) {
    const index = (progress.focusedIndex + offset) % progress.definitions.length;
    if (progress.discoveredIds.includes(progress.definitions[index].id) && questStatus(progress.definitions[index], words) === 'AVAILABLE') { progress.focusedIndex = index; return; }
  }
}

/** Simulation-owned discovery timing: brief feedback lead, 3s banner, then list insertion. */
export function updateQuestPresentation(progress: QuestProgress, dt: number): boolean {
  const current = progress.presentations[0];
  if (!current || !Number.isFinite(dt) || dt <= 0) return false;
  current.remaining -= dt;
  if (current.remaining > 1e-9) return false;
  if (!progress.discoveredIds.includes(current.questId)) progress.discoveredIds.push(current.questId);
  progress.presentations.shift();
  return true;
}

