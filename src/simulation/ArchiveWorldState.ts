import type { WordProgress } from './WordProgress.ts';
import { refreshQuestAvailability, type QuestProgress } from './QuestProgress.ts';

export const ARCHIVE_SECONDS = { stone: 3.2, above: 2.8, under: 3, secret: 3.6, read: 4.2, exit: 3.6 } as const;
export const ARCHIVE_QUIET_SECONDS = .45;
export type ArchiveReaction = keyof typeof ARCHIVE_SECONDS;
export const archiveSmooth = (v:number):number => { const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t); };
export interface ArchiveWorldState {
  readingVisible:boolean;
  readingAcknowledged:boolean;
  doorOpened:boolean;
  exitStart:{x:number;z:number}|null;
  playerPose:{x:number;y:number;z:number;heading:number}|null;
  exitElapsed:number;
  fade:number;
  requested: Record<ArchiveReaction,boolean>;
  progress: Record<ArchiveReaction,number>;
  queue: ArchiveReaction[];
  active: ArchiveReaction|null;
  quiet:number;
  stoneInstalled:boolean;
  abovePositionActivated:boolean;
  underCompartmentOpened:boolean;
  secretRevealed:boolean;
  readCompleted:boolean;
  exitCompleted:boolean;
  // Stage 6.3 must explicitly authorize the final sequence before completion.
  finalSequenceCompleted:boolean;
}
export function createArchiveWorldState(words:WordProgress):ArchiveWorldState {
  words.reactionHeldWords=['SECRET','READ','EXIT'];
  return {readingVisible:false,readingAcknowledged:false,doorOpened:false,exitStart:null,playerPose:null,exitElapsed:0,fade:0,requested:{stone:false,above:false,under:false,secret:false,read:false,exit:false},progress:{stone:0,above:0,under:0,secret:0,read:0,exit:0},
    queue:[],active:null,quiet:ARCHIVE_QUIET_SECONDS,stoneInstalled:false,abovePositionActivated:false,
    underCompartmentOpened:false,secretRevealed:false,readCompleted:false,exitCompleted:false,finalSequenceCompleted:false};
}
/** Simulation progress is also the renderer's animation clock. No wall-clock unlock delays. */
export class ArchiveReactionController {
  readonly state:ArchiveWorldState;
  private words:WordProgress;
  private quests:QuestProgress;
  constructor(state:ArchiveWorldState,words:WordProgress,quests:QuestProgress) { this.state=state;this.words=words;this.quests=quests; }
  get isBusy():boolean { return this.state.active!==null||this.state.queue.length>0||this.state.quiet<ARCHIVE_QUIET_SECONDS; }
  get inputLocked():boolean { return (this.state.requested.read&&!this.state.readingAcknowledged)||this.state.requested.exit; }
  acknowledgeReading():void { if(!this.state.readingVisible)return;this.state.readingVisible=false;this.state.readingAcknowledged=true;this.state.quiet=0; }
  get notificationsHeld():boolean { return this.isBusy||this.inputLocked; }
  get canCompleteStage():boolean { return this.state.exitCompleted&&this.state.readingAcknowledged&&this.state.doorOpened&&this.state.finalSequenceCompleted&&this.quests.definitions.every(q=>this.words.completedWords.includes(q.targetWord))&&!this.isBusy; }
  onQuestCompleted=(id:string):void => {
    if(!id.startsWith('archive-'))return;
    const key=id.slice(8);
    if(!this.words.completedWords.includes(key.toUpperCase()))return;
    if(!Object.hasOwn(ARCHIVE_SECONDS,key))return;
    const reaction=key as ArchiveReaction;
    if(this.state.requested[reaction])return;
    this.state.requested[reaction]=true;this.state.queue.push(reaction);this.state.quiet=0;
  };
  update(dt:number):void {
    if(!Number.isFinite(dt)||dt<=0)return;
    while(dt>1e-9){const step=Math.min(dt,1/60);this.step(step);dt-=step;}
  }
  private step(dt:number):void {
    const s=this.state;
    if(!s.active&&s.queue.length)s.active=s.queue.shift()!;
    if(s.active){const key=s.active;s.progress[key]=Math.min(1,s.progress[key]+dt/ARCHIVE_SECONDS[key]);
      if(s.progress[key]>1-1e-9){s.progress[key]=1;s.active=null;if(key==='read'){s.readCompleted=true;s.readingVisible=true;}if(key==='exit'){s.exitCompleted=true;s.doorOpened=true;}}
      s.quiet=0;
    }else{s.quiet=Math.min(ARCHIVE_QUIET_SECONDS,s.quiet+dt);if(s.quiet>ARCHIVE_QUIET_SECONDS-1e-9)s.quiet=ARCHIVE_QUIET_SECONDS;}
    s.stoneInstalled=s.progress.stone===1;s.abovePositionActivated=s.progress.above===1;
    s.underCompartmentOpened=s.progress.under===1;s.secretRevealed=s.progress.secret===1;
    if(s.doorOpened&&s.exitStart&&!s.finalSequenceCompleted){
      s.exitElapsed+=dt;
      const start=s.exitStart;
      const points=[start,{x:0,z:start.z},{x:0,z:-2.7},{x:0,z:-4.25},{x:0,z:-5.08}];
      let travel=Math.max(0,s.exitElapsed-.45)*2.2;
      s.playerPose={...start,y:0,heading:0};
      let arrived=true;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],distance=Math.hypot(b.x-a.x,b.z-a.z);
        if(distance<1e-8)continue;
        const t=Math.min(1,travel/distance);
        s.playerPose={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:0,heading:Math.atan2(b.x-a.x,b.z-a.z)};
        if(travel<distance){arrived=false;break;}travel-=distance;
      }
      if(arrived){s.fade=Math.min(1,travel/2.2/1.2);s.finalSequenceCompleted=s.fade===1;}
    }
    if(!this.isBusy&&!s.readingVisible)this.release();
  }
  private release():void {
    const s=this.state;
    this.words.reactionHeldWords=[...(!s.stoneInstalled||!s.abovePositionActivated||!s.underCompartmentOpened?['SECRET']:[]),
      ...(!s.secretRevealed?['READ']:[]),...(!s.readingAcknowledged?['EXIT']:[])];
    // Preserve immediate HUD discovery, with the existing NEW QUEST banner after the visual buffer.
    const previous=new Set(this.quests.discoveredIds);
    refreshQuestAvailability(this.quests,this.words);
    for(const id of this.quests.discoveredIds)if(!previous.has(id))this.quests.presentations.push({questId:id,remaining:3.2});
  }
}

