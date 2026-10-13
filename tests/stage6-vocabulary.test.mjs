import test from 'node:test';
import assert from 'node:assert/strict';
import { stage6 } from '../src/stages/stage6.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { createGameState, requestMovement, updateMovement } from '../src/simulation/update.ts';
import { questStatus, resolveQuestWord, refreshQuestAvailability } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { AssistanceState } from '../src/simulation/AssistanceState.ts';
import { WorldReactionController } from '../src/simulation/WorldReactionController.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { KeyboardInput } from '../src/input/KeyboardInput.ts';
import { WordSelectionInput } from '../src/input/WordSelectionInput.ts';
import { createQuestOverlay } from '../src/ui/QuestOverlay.ts';

const paths = {
  STONE: [[0,0],[0,1],[1,1],[2,1],[2,2]],
  ABOVE: [[0,4],[0,5],[0,6],[1,6],[2,6]],
  UNDER: [[3,6],[3,5],[4,5],[4,4],[3,4]],
  SECRET: [[6,0],[5,0],[5,1],[4,1],[4,2],[3,2]],
  READ: [[1,3],[1,4],[2,4],[2,3]],
  EXIT: [[6,6],[6,5],[5,5],[5,4]]
};
const order = Object.keys(paths);
function setup() {
  const grid = new LetterGrid(stage6.id, stage6.grid, stage6.letterLayout);
  const state = createGameState(stage6.playerStart, stage6.grid, stage6.quests, stage6.questPresentation);
  const selection = new WordSelection(grid);
  const validate = createQuestValidator(state.quests.definitions, state.words);
  const submit = (word, callback) => {
    const tiles = paths[word].map(([r,c]) => grid.getTile(r,c));
    selection.start(tiles[0].id);
    tiles.slice(1).forEach(tile => selection.enterTile(tile.id));
    assert.equal(selection.currentWord, word);
    return resolveQuestWord(state.quests, state.words, selection.submit(), validate, callback);
  };
  return { grid, state, selection, submit };
}
function solutions(grid, word) {
  const found = [];
  function visit(tile, path) {
    if (!tile || path.includes(tile) || tile.letter !== word[path.length]) return;
    const next = [...path, tile];
    if (next.length === word.length) { found.push(next.map(t => [t.row,t.column])); return; }
    for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) visit(grid.getTile(tile.row+dr,tile.column+dc), next);
  }
  grid.tiles.forEach(tile => visit(tile, []));
  return found;
}
for (const [word, path] of Object.entries(paths)) test(`archive ${word}: unique cardinal path, movement, backtracking and reusable tiles`, () => {
  const { grid, state, selection, submit } = setup();
  assert.deepEqual(solutions(grid,word),[path]);
  const tiles = path.map(([r,c]) => grid.getTile(r,c));
  state.player.currentTile = { row:path[0][0], column:path[0][1] };
  selection.start(tiles[0].id);
  selection.enterTile(tiles[1].id); selection.enterTile(tiles[0].id);
  assert.equal(selection.currentWord,word[0]);
  for (let i=1;i<path.length;i++) {
    assert.equal(requestMovement(state,{x:path[i][1]-path[i-1][1],z:path[i][0]-path[i-1][0]},stage6.grid),true);
    assert.equal(updateMovement(state,1),true);
    selection.enterTile(tiles[i].id);
  }
  assert.equal(selection.currentWord,word);
  assert.equal(new Set(selection.selectedTileIds).size,word.length);
  selection.cancel();
  for (const prior of order.slice(0,order.indexOf(word))) assert.equal(submit(prior).status,'CORRECT');
  assert.equal(submit(word).status,'CORRECT');
  assert.equal(submit(word).status,'ALREADY_COMPLETED');
  assert.deepEqual(solutions(grid,word),[path]);
});
function permutations(items) { return items.length ? items.flatMap((item,i)=>permutations(items.filter((_,j)=>j!==i)).map(rest=>[item,...rest])) : [[]]; }
for (const early of permutations(order.slice(0,3))) test('archive progression: '+early.join(' -> '), () => {
  const { state, submit } = setup();
  const statuses = () => state.quests.definitions.map(q=>questStatus(q,state.words));
  assert.deepEqual(stage6.vocabulary,order);
  assert.deepEqual(statuses(),['AVAILABLE','AVAILABLE','AVAILABLE','LOCKED','LOCKED','LOCKED']);
  const before = structuredClone(state.world);
  const reactions = new WorldReactionController(state.world,stage6.worldReactions);
  const completion = new StageCompletionController(stage6.id,()=>assert.fail('final ending triggered'),stage6.completionMode !== 'manual');
  for (const [i,word] of [...early,...order.slice(3)].entries()) {
    for (const quest of state.quests.definitions.filter(q=>questStatus(q,state.words)==='LOCKED')) {
      const ledger = structuredClone(state.words), ids = [...state.quests.discoveredIds];
      assert.equal(submit(quest.targetWord,()=>assert.fail('locked completion')).reason,'LOCKED');
      assert.deepEqual(state.words,ledger); assert.deepEqual(state.quests.discoveredIds,ids);
    }
    assert.equal(submit(word,reactions.onQuestCompleted).status,'CORRECT'); reactions.update(10);
    assert.deepEqual(state.quests.definitions.map(q=>q.targetWord),order);
    assert.equal(statuses()[3],i<2?'LOCKED':i===2?'AVAILABLE':'COMPLETED');
    assert.equal(statuses()[4],i<3?'LOCKED':i===3?'AVAILABLE':'COMPLETED');
    assert.equal(statuses()[5],i<4?'LOCKED':i===4?'AVAILABLE':'COMPLETED');
    for (const quest of state.quests.definitions.filter(q=>questStatus(q,state.words)==='AVAILABLE')) assert.ok(state.quests.discoveredIds.includes(quest.id));
    assert.deepEqual(state.quests.presentations,[]); // No synthetic reaction or unlock delay.
    completion.check(state.quests,state.words); completion.update(100,false,false);
  }
  assert.deepEqual(state.words.completedWords,[...early,...order.slice(3)]);
  assert.deepEqual(state.world,before); assert.equal(reactions.isBusy,false);
});
test('archive hints reveal progressive prefixes for all six available quests; scan matches every E including decoys', () => {
  const { grid, state, submit } = setup();
  const resources = {wordShards:100}, assistance = new AssistanceState(resources);
  for (let i=3;i<6;i++) {
    state.quests.focusedIndex=i;
    assert.equal(assistance.requestHint(state.quests,state.words,false),'Hint unavailable for this quest');
    assert.equal(assistance.hintText(state.quests,state.words),'');
  }
  assert.equal(resources.wordShards,100);
  for (const [i,quest] of state.quests.definitions.entries()) {
    state.quests.focusedIndex=i;
    assert.ok(!quest.clue.toUpperCase().includes(quest.targetWord));
    for (let level=1;level<quest.targetWord.length;level++) {
      assert.equal(assistance.requestHint(state.quests,state.words,false),'');
      assert.equal(assistance.hintText(state.quests,state.words),[...quest.targetWord].map((ch,j)=>j<level?ch:'_').join(' '));
    }
    assert.equal(assistance.requestHint(state.quests,state.words,false),'No more hints for this word');
    assert.equal(submit(quest.targetWord).status,'CORRECT');
    assert.equal(assistance.hintText(state.quests,state.words),'');
    assert.equal(assistance.requestHint(state.quests,state.words,false),'Hint unavailable for this quest');
  }
  const ledger = [...state.words.completedWords];
  assert.equal(assistance.requestScan('e',grid,false),'');
  assert.deepEqual([...assistance.scanState.tileIds],grid.findLetter('E').map(t=>t.id));
  assert.ok(assistance.scanState.tileIds.has(grid.getTile(4,3).id)); // E outside all target paths.
  assistance.update(3); assert.equal(assistance.scanState,null);
  assert.deepEqual(state.words.completedWords,ledger);
});
test('archive preserves reaction-completion gating for future reactions', () => {
  const { state, submit } = setup();
  state.words.reactionHeldWords=['SECRET'];
  for (const word of order.slice(0,3)) submit(word);
  assert.equal(questStatus(state.quests.definitions[3],state.words),'LOCKED');
  assert.equal(submit('SECRET').reason,'LOCKED');
  state.words.reactionHeldWords=[];
  refreshQuestAvailability(state.quests,state.words);
  assert.equal(questStatus(state.quests.definitions[3],state.words),'AVAILABLE');
  assert.ok(state.quests.discoveredIds.includes('archive-secret'));
});
test('archive spawn reaches all 49 tiles; rejects diagonal and non-backtracking reuse; approved framing unchanged', () => {
  const { grid, state, selection } = setup();
  const start = stage6.playerStart;
  assert.equal(grid.getTile(start.row,start.column).letter,'M');
  assert.ok(!Object.values(paths).flat().some(([r,c])=>r===start.row&&c===start.column));
  const queue=[start], seen=new Set([`${start.row},${start.column}`]);
  for (const current of queue) for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const next={row:current.row+dr,column:current.column+dc}, key=`${next.row},${next.column}`;
    if (!grid.getTile(next.row,next.column)||seen.has(key)) continue;
    const s=createGameState(current,stage6.grid);
    assert.equal(requestMovement(s,{x:dc,z:dr},stage6.grid),true);
    updateMovement(s,1); assert.deepEqual(s.player.currentTile,next);
    seen.add(key); queue.push(next);
  }
  assert.equal(seen.size,49);
  assert.equal(requestMovement(state,{x:1,z:-1},stage6.grid),false);
  selection.start(grid.getTile(0,0).id); selection.enterTile(grid.getTile(1,1).id);
  assert.equal(selection.currentWord,'S');
  for (const [r,c] of [[0,1],[1,1],[1,0]]) selection.enterTile(grid.getTile(r,c).id);
  const word=selection.currentWord; selection.enterTile(grid.getTile(0,0).id);
  assert.equal(selection.currentWord,word);
  assert.deepEqual(stage6.grid,{rows:7,columns:7,tileSize:1,origin:{x:0,z:1}});
  assert.deepEqual(stage6.camera,{position:[0,17,11.7],target:[0,0,-.3],verticalSpan:13,minimumWidth:14});
});

test('archive real input adapters: WASD/arrows, Space/mouse holds, release, backtracking and submission', () => {
  const saved = {window:globalThis.window,document:globalThis.document,HTMLElement:globalThis.HTMLElement};
  class Element extends EventTarget {
    closest(){return null;}
    setPointerCapture(id){this.captured=id;}
    hasPointerCapture(id){return this.captured===id;}
    releasePointerCapture(){this.captured=null;}
  }
  globalThis.window=new EventTarget(); globalThis.document=new EventTarget(); globalThis.HTMLElement=Element;
  const canvas=new Element(), {grid,state}=setup(), submitted=[];
  const validate=createQuestValidator(state.quests.definitions,state.words);
  const selection=new WordSelection(grid,submission=>submitted.push(resolveQuestWord(state.quests,state.words,submission,validate)));
  const tile=()=>grid.getTile(state.player.currentTile.row,state.player.currentTile.column).id;
  const keyboard=new KeyboardInput(action=>{
    if(requestMovement(state,action,stage6.grid)) { updateMovement(state,.18); selection.enterTile(tile()); }
  });
  const input=new WordSelectionInput(canvas,()=>selection.start(tile()),()=>selection.submit(),()=>selection.cancel());
  const emit=(target,type,props={})=>target.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),props));
  const move=code=>{emit(window,'keydown',{code});emit(window,'keyup',{code});};
  try {
    // Walk from the approved spawn to STONE without selecting.
    for(let i=0;i<6;i++) move('KeyW');
    for(let i=0;i<3;i++) move('KeyA');
    emit(window,'keydown',{code:'Space'});
    move('KeyD'); move('ArrowLeft'); assert.equal(selection.currentWord,'S');
    move('ArrowRight'); move('KeyS'); move('ArrowDown'); move('KeyD');
    assert.equal(selection.currentWord,'STONE'); assert.equal(submitted.length,0);
    emit(window,'keyup',{code:'Space'}); assert.equal(submitted[0].status,'CORRECT');
    // Mouse hold selects from the player's tile; movement extends the path.
    move('KeyW'); move('ArrowUp'); move('ArrowRight'); move('KeyD');
    emit(canvas,'pointerdown',{pointerType:'mouse',button:0,pointerId:1});
    move('ArrowRight'); move('KeyD'); move('KeyS'); move('ArrowDown');
    assert.equal(selection.currentWord,'ABOVE'); assert.equal(submitted.length,1);
    emit(window,'pointerup',{button:0,pointerId:1}); assert.equal(submitted[1].status,'CORRECT');
    emit(window,'keydown',{code:'Space'}); emit(window,'blur');
    assert.equal(selection.isSelecting,false); assert.equal(submitted.length,2);
  } finally {input.dispose();keyboard.dispose();Object.assign(globalThis,saved);}
});

test('archive HUD keeps six row identities in definition order and conceals locked clues and targets', () => {
  const saved=globalThis.document;
  // Minimal DOM surface used by the existing HUD, without a browser dependency.
  class Element extends EventTarget {
    children=[]; attributes={}; dataset={}; textContent=''; hidden=false; disabled=false;
    append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
    setAttribute(key,value){this.attributes[key]=value;}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
    querySelector(selector){
      const name=selector.slice(1);
      for(const child of this.children){if(child.className===name)return child;const found=child.querySelector(selector);if(found)return found;}
      return null;
    }
    set innerHTML(value){
      const counter=new Element();counter.className='quest-hud__progress';
      const list=new Element();list.className='quest-hud__list';
      const content=new Element();content.className='quest-hud__content';
      const clue=new Element();clue.className='quest-hud__clue';content.append(clue);
      this.append(counter,list,content);
    }
  }
  globalThis.document={createElement:()=>new Element()};
  const host=new Element(), {state,submit}=setup();
  const ui=createQuestOverlay(host,index=>{state.quests.focusedIndex=index;},true);
  try {
    ui.render(state.quests,state.words);
    const list=host.querySelector('.quest-hud__list'), original=[...list.children];
    assert.equal(original.length,6);
    const verify=()=>{
      ui.render(state.quests,state.words);
      assert.deepEqual(list.children,original);
      list.children.forEach((item,i)=>{
        const button=item.children[0], quest=state.quests.definitions[i];
        const locked=questStatus(quest,state.words)==='LOCKED';
        assert.equal(button.disabled,locked);
        assert.equal(button.querySelector('.quest-hud__summary').textContent,locked?'Locked':quest.clue);
        const displayed=[button.attributes['aria-label'],...button.children.map(child=>child.textContent)].join(' ');
        for(const word of order) assert.ok(!new RegExp(`\\b${word}\\b`,'i').test(displayed));
      });
    };
    verify();
    for(const word of ['UNDER','STONE','ABOVE','SECRET','READ','EXIT']) {submit(word);verify();}
    assert.equal(host.querySelector('.quest-hud__progress').textContent,'6 / 6');
  } finally {ui.dispose();globalThis.document=saved;}
});
