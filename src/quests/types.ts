export interface QuestDefinition {
  readonly id: string;
  readonly clue: string;
  readonly targetWord: string;
}
export type QuestStatus = 'AVAILABLE' | 'COMPLETED';
