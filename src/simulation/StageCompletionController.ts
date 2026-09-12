import { questStatus, type QuestProgress } from './QuestProgress.ts';
import type { WordProgress } from './WordProgress.ts';

/** Simulation-owned one-shot event. Empty placeholder stages never auto-complete. */
export class StageCompletionController {
  private pending = false;
  private emitted = false;
  private settle = 0;
  private stageId: string;
  private onCompleted: (id: string) => void;
  constructor(stageId: string, onCompleted: (id: string) => void) { this.stageId = stageId; this.onCompleted = onCompleted; }
  check(quests: QuestProgress, words: WordProgress): void {
    if (this.pending || this.emitted) return;
    this.pending = quests.definitions.length > 0 && quests.definitions.every(q => questStatus(q, words) === 'COMPLETED');
  }
  update(dt: number, reactionsBusy: boolean, feedbackBusy: boolean): void {
    if (!this.pending || this.emitted || !Number.isFinite(dt) || dt <= 0) return;
    if (reactionsBusy || feedbackBusy) { this.settle = 0; return; }
    this.settle += dt;
    if (this.settle + 1e-9 < .3) return;
    this.emitted = true;
    this.onCompleted(this.stageId);
  }
}
