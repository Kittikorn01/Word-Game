import type { WordProgress } from './WordProgress.ts';

export const WORKSHOP_SECONDS = { gear: 1.4, repair: 2.6, power: 3.6, lever: 1, start: 1.8, stop: 1.4 } as const;
export type WorkshopReaction = keyof typeof WORKSHOP_SECONDS;
export const PRODUCTION_SECONDS = 7;
export const PRODUCTION_CONDITION = 'workshop.productionFinished';
export const smooth = (value: number): number => { const t = Math.max(0, Math.min(1, value)); return t*t*(3-2*t); };
export interface WorkshopWorldState {
  gearInstalled: boolean; machineRepaired: boolean; powerOn: boolean; leverActivated: boolean;
  machineStarted: boolean; productionFinished: boolean; machineStopped: boolean;
  requested: Record<WorkshopReaction, boolean>;
  progress: Record<WorkshopReaction, number>;
  productionElapsed: number;
  revealQuiet: number;
  finalePhase: 'idle' | 'feedback' | 'shutdown' | 'pause' | 'finished';
  finaleElapsed: number;
  gearSpeed: number; beltSpeed: number; gearAngle: number; beltTravel: number;
}
export function createWorkshopWorldState(words: WordProgress): WorkshopWorldState {
  words.reactionHeldWords = ['POWER','LEVER','START','STOP'];
  words.worldConditions = { ...words.worldConditions, [PRODUCTION_CONDITION]: false };
  return { gearInstalled:false, machineRepaired:false, powerOn:false, leverActivated:false,
    machineStarted:false, productionFinished:false, machineStopped:false,
    requested:{gear:false,repair:false,power:false,lever:false,start:false,stop:false},
    progress:{gear:0,repair:0,power:0,lever:0,start:0,stop:0},
    finalePhase:'idle', finaleElapsed:0, revealQuiet:0, productionElapsed:0,gearSpeed:0,beltSpeed:0,gearAngle:0,beltTravel:0 };
}
/** Stage-local sequence: accepted events queue behind visual prerequisites. No mesh state or wall-clock timers. */
export class WorkshopReactionController {
  readonly state: WorkshopWorldState;
  private words: WordProgress;
  constructor(state: WorkshopWorldState, words: WordProgress) { this.state=state; this.words=words; }
  onQuestCompleted = (id: string): void => {
    const key = id.slice('workshop-'.length) as WorkshopReaction;
    if (id.startsWith('workshop-') && Object.hasOwn(WORKSHOP_SECONDS,key)) {
      if (key === 'stop' && !this.state.requested.stop) this.state.finalePhase = 'feedback';
      this.state.requested[key] = true;
    }
  };
  get isBusy(): boolean {
    const s=this.state;
    return (Object.keys(WORKSHOP_SECONDS) as WorkshopReaction[]).some(k=>s.requested[k] && s.progress[k]<1)
      || (s.machineStarted && !s.productionFinished)
      || (s.requested.stop && s.finalePhase !== 'finished');
  }
  get inputLocked(): boolean { return this.state.requested.stop; }
  get finaleFinished(): boolean { return this.state.finalePhase === 'finished'; }
  get notificationsHeld(): boolean { return this.isBusy || this.state.revealQuiet < .45; }
  update(dt: number, feedbackBusy = false): void {
    if (!Number.isFinite(dt) || dt<=0) return;
    // Substeps preserve sequence boundaries even for a large deterministic test update.
    while (dt>1e-9) { const step=Math.min(dt,1/60); this.step(step, feedbackBusy); dt-=step; }
  }
  private step(dt: number, feedbackBusy: boolean): void {
    const s=this.state,p=s.progress;
    const advance=(key:WorkshopReaction,ready=true) => {
      if (s.requested[key] && ready) {
        p[key]=Math.min(1,p[key]+dt/WORKSHOP_SECONDS[key]);
        if(p[key]>1-1e-9)p[key]=1;
      }
    };
    const wasBusy=this.isBusy;
    const wasRunning=s.machineStarted;
    advance('gear'); advance('repair');
    s.gearInstalled=p.gear===1; s.machineRepaired=p.repair===1;
    advance('power',s.gearInstalled&&s.machineRepaired); s.powerOn=p.power===1;
    advance('lever',s.powerOn); s.leverActivated=p.lever===1;
    advance('start',s.leverActivated); s.machineStarted=p.start===1;
    if(wasRunning && !s.productionFinished) {
      s.productionElapsed=Math.min(PRODUCTION_SECONDS,s.productionElapsed+dt);
      if(s.productionElapsed>PRODUCTION_SECONDS-1e-9)s.productionElapsed=PRODUCTION_SECONDS;
      s.productionFinished=s.productionElapsed===PRODUCTION_SECONDS;
      this.words.worldConditions={ ...this.words.worldConditions, [PRODUCTION_CONDITION]:s.productionFinished };
    }
    if (s.finalePhase === 'feedback' && !feedbackBusy) s.finalePhase = 'shutdown';
    const wasStopped=s.machineStopped;
    advance('stop',s.productionFinished && s.finalePhase !== 'feedback'); s.machineStopped=p.stop===1;
    if(s.machineStopped && s.finalePhase === 'shutdown') s.finalePhase='pause';
    if(wasStopped && s.finalePhase === 'pause') {
      // Together with the shared 0.3 s completion settle, idle remains visible for ~0.95 s.
      s.finaleElapsed=Math.min(.65,s.finaleElapsed+dt);
      if(s.finaleElapsed>.65-1e-9){s.finaleElapsed=.65;s.finalePhase='finished';}
    }
    const shutdown=1-smooth(p.stop);
    s.gearSpeed=smooth((p.start-.12)/.55)*shutdown;
    s.beltSpeed=smooth((p.start-.42)/.58)*shutdown;
    s.gearAngle=(s.gearAngle+s.gearSpeed*dt*2.7)%(Math.PI*2);
    s.beltTravel=(s.beltTravel+s.beltSpeed*dt*.9)%5.4;
    s.revealQuiet=this.isBusy || wasBusy ? 0 : Math.min(.45,s.revealQuiet+dt);
    if(s.revealQuiet>.45-1e-9)s.revealQuiet=.45;
    if(!this.notificationsHeld) {
      this.words.reactionHeldWords=[
        ...(!s.gearInstalled||!s.machineRepaired?['POWER']:[]),
        ...(!s.powerOn?['LEVER']:[]), ...(!s.leverActivated?['START']:[]),
        ...(!s.productionFinished?['STOP']:[])
      ];
    }
  }
}
