import { stages } from '../stages/registry.ts';
import type { ArchiveWorldState } from '../simulation/ArchiveWorldState.ts';

export const ARCHIVE_MESSAGE = 'You did not just find words. You gave them meaning.';
export const vocabularyJourney = () => stages.filter(s => s.kind !== 'placeholder').map(s => ({
  number:s.stageNumber, title:s.title, words:[...(s.vocabulary ?? s.quests?.map(q=>q.targetWord) ?? [])]
}));

/** DOM presentation only; acknowledgement and completion belong to simulation. */
export function createArchiveFinaleOverlay(host:HTMLElement, acknowledge:()=>void) {
  const reading=document.createElement('section');reading.className='archive-reading';reading.hidden=true;
  reading.setAttribute('role','dialog');reading.setAttribute('aria-modal','true');reading.setAttribute('aria-labelledby','archive-message');
  reading.innerHTML='<div class="archive-paper"><span class="archive-eyebrow">The Word Archive</span><span class="archive-ornament" aria-hidden="true">&#10023;</span><h1 id="archive-message"></h1><button type="button">Continue</button></div>';
  reading.querySelector('h1')!.textContent=ARCHIVE_MESSAGE;
  const button=reading.querySelector('button')!;
  const fade=document.createElement('div');fade.className='archive-fade';fade.setAttribute('aria-hidden','true');
  const abort=new AbortController();let final:HTMLElement|undefined;
  button.addEventListener('click',()=>{if(reading.hidden)return;acknowledge();reading.hidden=true;},{signal:abort.signal});
  reading.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Tab'){e.preventDefault();button.focus();}},{signal:abort.signal});
  host.append(fade,reading);
  return {
    update(state:ArchiveWorldState){
      if(state.readingVisible&&reading.hidden){reading.hidden=false;button.focus();}
      if(!state.readingVisible)reading.hidden=true;
      fade.style.opacity=String(state.fade);
    },
    complete(){
      if(final)return;
      final=document.createElement('section');final.className='archive-complete';final.setAttribute('role','dialog');final.setAttribute('aria-modal','true');final.setAttribute('aria-labelledby','archive-complete-title');
      final.innerHTML='<div class="archive-paper archive-journal"><header><span class="archive-ornament" aria-hidden="true">&#10023;</span><h1 id="archive-complete-title">GAME COMPLETE</h1><h2>The Word Archive</h2><p>You completed the journey.</p><p class="archive-summary"></p></header><h3>Your Vocabulary Journey</h3><div class="archive-recap" tabindex="0" role="region" aria-label="Your Vocabulary Journey"></div></div>';
      const journey=vocabularyJourney(),total=journey.reduce((n,s)=>n+s.words.length,0);
      final.querySelector('.archive-summary')!.textContent=`${journey.length} / ${journey.length} Stages Completed \u00b7 ${total} / ${total} Words Discovered`;
      const recap=final.querySelector<HTMLElement>('.archive-recap')!;
      for(const stage of journey){const section=document.createElement('section'),heading=document.createElement('h4'),words=document.createElement('p');heading.textContent=`Stage ${stage.number} \u2014 ${stage.title}`;words.textContent=stage.words.join(' \u00b7 ');section.append(heading,words);recap.append(section);}
      final.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Tab'){e.preventDefault();recap.focus();}},{signal:abort.signal});
      final.tabIndex=-1;host.append(final);final.focus();
    },
    dispose(){abort.abort();reading.remove();fade.remove();final?.remove();}
  };
}
