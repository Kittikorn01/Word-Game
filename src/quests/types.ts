export interface QuestDefinition {
  readonly id: string;
  readonly clue: string;
  readonly targetWord: string;
  /** Target words that must already be completed; stage-owned dependency data. */
  readonly requires?: readonly string[];
}
export type QuestStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
