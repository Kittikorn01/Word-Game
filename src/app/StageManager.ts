import type { StageDefinition } from '../stages/types.ts';

export interface StageRuntime { lock(): void; unlock?(): void; dispose(): void }
export interface StageTransition { fadeOut(): Promise<void>; fadeIn(): Promise<void>; dispose(): void }

/** Application lifetime; each mounted runtime owns all stage-specific state/resources. */
export class StageManager {
  private registry: Map<string, StageDefinition>;
  private runtime?: StageRuntime;
  private transitioning = false;
  private disposed = false;
  currentStageId: string;
  private mount: (stage: StageDefinition) => StageRuntime;
  private transition: StageTransition;
  get currentStage(): StageDefinition { return this.registry.get(this.currentStageId)!; }
  get nextStageId(): string | undefined { return this.currentStage.nextStageId; }
  get isTransitioning(): boolean { return this.transitioning; }
  constructor(stages: readonly StageDefinition[], initialId: string,
    mount: (stage: StageDefinition) => StageRuntime, transition: StageTransition) {
    this.mount = mount; this.transition = transition;
    this.registry = new Map(stages.map(stage => [stage.id, stage]));
    if (this.registry.size !== stages.length || !this.registry.has(initialId)) throw new Error('Invalid stage registry.');
    for (const stage of stages) if (stage.nextStageId && !this.registry.has(stage.nextStageId)) throw new Error('Missing next stage.');
    this.currentStageId = initialId;
  }
  start(): void { if (!this.runtime && !this.disposed) this.runtime = this.mount(this.currentStage); }
  async next(): Promise<boolean> {
    if (this.disposed || this.transitioning || !this.runtime || !this.nextStageId) return false;
    const nextId = this.nextStageId;
    this.transitioning = true;
    this.runtime.lock();
    try {
      await this.transition.fadeOut();
      if (this.disposed) return false;
      this.runtime.dispose(); this.runtime = undefined;
      this.currentStageId = nextId;
      this.runtime = this.mount(this.currentStage);
      this.runtime.lock();
      await this.transition.fadeIn();
      if (!this.disposed) this.runtime?.unlock?.();
      return !this.disposed;
    } finally { this.transitioning = false; }
  }
  dispose(): void { this.disposed = true; this.runtime?.dispose(); this.runtime = undefined; this.transition.dispose(); }
}
