import type { WordProgress } from './WordProgress.ts';

export const STORM_SECONDS = { rain: 3.2, shelter: 3.4, fire: 2.8, warm: 3.6, safe: 3, rescue: 8 } as const;
export const STORM_QUIET_SECONDS = .45;
export type StormReaction = keyof typeof STORM_SECONDS;
export const stormSmooth = (value: number): number => { const t=Math.max(0,Math.min(1,value)); return t*t*(3-2*t); };
export const RESCUE_ROUTE = [
  [4.9,5.25], [4.55,1.55], [4.4,-1.15], [4.05,-2.85], [3.05,-3.12], [1.25,-3.12], [-.3,-3.55]
] as const;
export interface StormWorldState {
  requested: Record<StormReaction,boolean>;
  progress: Record<StormReaction,number>;
  queue: StormReaction[];
  active: StormReaction | null;
  quiet: number;
  elapsed: number;
  rainIntensified: boolean; shelterHighlighted: boolean; fireLit: boolean;
  warmState: boolean; safeState: boolean; travelerRescued: boolean;
  travelerVisible: boolean;
  traveler: { x:number; y:number; z:number; heading:number; walking:boolean };
}
export function createStormWorldState(words: WordProgress): StormWorldState {
  words.reactionHeldWords=['WARM','SAFE','RESCUE'];
  return {
    requested:{rain:false,shelter:false,fire:false,warm:false,safe:false,rescue:false},
    progress:{rain:0,shelter:0,fire:0,warm:0,safe:0,rescue:0},
    queue:[],active:null,quiet:STORM_QUIET_SECONDS,elapsed:0,
    rainIntensified:false,shelterHighlighted:false,fireLit:false,warmState:false,safeState:false,travelerRescued:false,
    travelerVisible:false,traveler:{x:4.9,y:.03,z:5.25,heading:Math.PI,walking:false}
  };
}
/** Distance-weighted scripted route. No renderer, navigation AI, timers or physics. */
export function stormTravelerPose(progress:number): StormWorldState['traveler'] {
  const t=stormSmooth((progress-.12)/.7);
  const lengths=RESCUE_ROUTE.slice(1).map((b,i)=>Math.hypot(b[0]-RESCUE_ROUTE[i][0],b[1]-RESCUE_ROUTE[i][1]));
  let distance=t*lengths.reduce((a,b)=>a+b,0);
  for(let i=0;i<lengths.length;i++) {
    if(distance<=lengths[i] || i===lengths.length-1) {
      const a=RESCUE_ROUTE[i],b=RESCUE_ROUTE[i+1],f=Math.min(1,distance/lengths[i]);
      const x=f===1?b[0]:a[0]+(b[0]-a[0])*f,z=f===1?b[1]:a[1]+(b[1]-a[1])*f;
      return {x,z,y:.03+.105*stormSmooth((-z-3.02)/.25),heading:Math.atan2(b[0]-a[0],b[1]-a[1]),walking:t>0&&t<1};
    }
    distance-=lengths[i];
  }
  throw new Error('Empty rescue route');
}
/** Accepted quests queue once. Unlock gates follow the finished visual state plus a quiet interval. */
export class StormReactionController {
  readonly state:StormWorldState;
  private words:WordProgress;
  constructor(state:StormWorldState, words:WordProgress) { this.state=state;this.words=words; }
  onQuestCompleted = (id:string):void => {
    if(!id.startsWith('storm-'))return;
    const key=id.slice(6) as StormReaction;
    if(!Object.hasOwn(STORM_SECONDS,key)||this.state.requested[key]||!this.words.completedWords.includes(key.toUpperCase()))return;
    this.state.requested[key]=true;this.state.queue.push(key);this.state.quiet=0;
  };
  get inputLocked():boolean { return this.state.requested.rescue; }
  get isBusy():boolean { return this.state.active!==null || this.state.queue.length>0 || this.state.quiet<STORM_QUIET_SECONDS; }
  get notificationsHeld():boolean { return this.isBusy; }
  update(dt:number):void {
    if(!Number.isFinite(dt)||dt<=0)return;
    while(dt>1e-9){const step=Math.min(dt,1/60);this.step(step);dt-=step;}
  }
  private step(dt:number):void {
    const s=this.state;s.elapsed=(s.elapsed+dt)%1000;
    if(!s.active&&s.queue.length)s.active=s.queue.shift()!;
    if(s.active) {
      const key=s.active;s.progress[key]=Math.min(1,s.progress[key]+dt/STORM_SECONDS[key]);
      if(s.progress[key]>1-1e-9){s.progress[key]=1;s.active=null;}
      s.quiet=0;
    } else {
      s.quiet=Math.min(STORM_QUIET_SECONDS,s.quiet+dt);
      if(s.quiet>STORM_QUIET_SECONDS-1e-9)s.quiet=STORM_QUIET_SECONDS;
    }
    s.rainIntensified=s.progress.rain===1;s.shelterHighlighted=s.progress.shelter===1;s.fireLit=s.progress.fire===1;
    s.warmState=s.progress.warm===1;s.safeState=s.progress.safe===1;s.travelerRescued=s.progress.rescue===1;
    s.traveler=stormTravelerPose(s.progress.rescue);
    if(!this.notificationsHeld) {
      this.words.reactionHeldWords=[
        ...(!s.rainIntensified||!s.shelterHighlighted||!s.fireLit?['WARM']:[]),
        ...(!s.warmState?['SAFE']:[]),...(!s.safeState?['RESCUE']:[])
      ];
      s.travelerVisible=s.safeState;
    }
  }
}
