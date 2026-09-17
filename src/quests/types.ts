export interface QuestDefinition {
  readonly id: string;
  readonly clue: string;
  readonly targetWord: string;
  /** Semantic reaction identifier; dispatch remains owned by stage simulation. */
  readonly worldReactionId?: string;
  /** Target words that must already be completed; stage-owned dependency data. */
  readonly requires?: readonly string[];
  readonly requiresWorld?: 'bridgeBuilt';
}
export type QuestStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
