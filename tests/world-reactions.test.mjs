import test from 'node:test';
import assert from 'node:assert/strict';
import { paths } from './stage1-paths.mjs';
import { stage1 } from '../src/stages/stage1.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { createGameState, requestMovement, updateMovement, STEP_DURATION } from '../src/simulation/update.ts';
import { resolveQuestWord } from '../src/simulation/QuestProgress.ts';
import { createQuestValidator } from '../src/validation/QuestValidator.ts';
import { createStageWorldState, WorldReactionController } from '../src/simulation/WorldReactionController.ts';
import { WorldReactionView } from '../src/render/WorldReactionView.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';

for (const [word, path] of Object.entries(paths)) test(`movement + selection + quest + reaction: ${word}`, () => {
  const [[row,column]] = path, state = createGameState({row,column}, stage1.grid, stage1.quests);
  const grid = new LetterGrid(stage1.id, stage1.grid, stage1.letterLayout);
  const controller = new WorldReactionController(state.world, stage1.worldReactions);
  if (word === 'OPEN') resolveQuestWord(state.quests,state.words,{word:'DOOR',selectedTileIds:[],path:[]},createQuestValidator(stage1.quests));
  const select = new WordSelection(grid, s => assert.equal(resolveQuestWord(state.quests, state.words, s, createQuestValidator(stage1.quests), controller.onQuestCompleted).status, 'CORRECT'));
  select.start(grid.getTile(row,column).id);
  const directions = [];
  for (const [r,c] of path.slice(1)) {
    const action = {x:c-state.player.currentTile.column, z:r-state.player.currentTile.row}; directions.push(`${action.x},${action.z}`);
    assert.equal(Math.abs(action.x)+Math.abs(action.z), 1);
    assert.equal(requestMovement(state, action, stage1.grid), true);
    assert.equal(updateMovement(state, STEP_DURATION), true);
    select.enterTile(grid.getTile(state.player.currentTile.row,state.player.currentTile.column).id);
  }
  assert.equal(select.currentWord, word); assert.equal(new Set(select.selectedTileIds).size, word.length);
  if (['WATER','BOOK','OPEN'].includes(word)) assert.ok(new Set(directions).size > 1);
  if (word==='DOOR') assert.ok(directions.every(d => d==='0,-1'));
  if (word==='LIGHT') assert.ok(directions.every(d => d==='0,1'));
  select.submit(); assert.ok(Object.values(state.world).every(v=>!v));
  controller.update(.2); assert.ok(Object.values(state.world).every(v=>!v));
  controller.update(.05); assert.equal(Object.values(state.world).filter(Boolean).length,1);
});

test('all 720 quest orders converge, duplicate/wrong submissions and events never replay', () => {
  function* permutations(values) { if (!values.length) yield []; else for (const v of values) for (const rest of permutations(values.filter(x=>x!==v))) yield [v,...rest]; }
  for (const order of permutations(stage1.vocabulary)) {
    const state = createGameState(stage1.playerStart,stage1.grid,stage1.quests);
    const controller = new WorldReactionController(state.world,stage1.worldReactions);
    let events = 0;
    const submit = word => resolveQuestWord(state.quests,state.words,{word,selectedTileIds:[],path:[]},createQuestValidator(stage1.quests),id=>{ events++; controller.onQuestCompleted(id); });
    for (const word of order) {
      const locked = word === 'OPEN' && !state.words.completedWords.includes('DOOR');
      assert.equal(submit(word).status,locked ? 'WRONG' : 'CORRECT'); controller.update(.25);
    }
    if (!state.words.completedWords.includes('OPEN')) assert.equal(submit('OPEN').status,'CORRECT');
    controller.update(.25); controller.update(2);
    assert.ok(Object.values(state.world).every(Boolean));
    for (const word of order) assert.equal(submit(word).status,'ALREADY_COMPLETED');
    assert.equal(submit('CAT').status,'WRONG'); assert.equal(events,6);
    controller.onQuestCompleted('key-quest'); controller.onQuestCompleted('unknown'); controller.update(1);
    assert.ok(Object.values(state.world).every(Boolean));
  }
});

test('renderer projects supplied state safely and normal door opening animates', () => {
  const assets = new PrimitiveAssets(), view = new WorldReactionView(assets,stage1.worldObjects), state = createStageWorldState();
  view.update(state,0); assert.equal(view.objects.door.visible,false);
  state.doorOpen=true; view.update(state,.3); assert.equal(view.objects.door.visible,false);
  state.doorRevealed=true; view.update(state,.016);
  assert.equal(view.objects.door.visible,true); assert.equal(view.objects.hinge.rotation.y,-Math.PI/3);
  const normal = new WorldReactionView(assets,stage1.worldObjects), s = createStageWorldState();
  normal.update(s,0); s.doorRevealed=true; normal.update(s,1);
  assert.equal(normal.objects.hinge.rotation.y,0); s.doorOpen=true; normal.update(s,.1);
  assert.ok(normal.objects.hinge.rotation.y<0 && normal.objects.hinge.rotation.y>-Math.PI/3);
  const final = {...Object.fromEntries(Object.keys(state).map(k=>[k,true])),keyAcquisitionProgress:1};
  const rebuilt = new WorldReactionView(assets,stage1.worldObjects); rebuilt.update(final,0);
  assert.equal(rebuilt.objects.key.visible,false); assert.equal(rebuilt.objects.book.visible,true);
  assert.equal(rebuilt.objects.door.visible,true); assert.equal(rebuilt.objects.hinge.rotation.y,-Math.PI/3);
  assert.equal(rebuilt.objects.light.intensity,5); assert.ok(rebuilt.objects.growth.scale.x>1);
  const scale = rebuilt.objects.key.scale.x; rebuilt.update(final,1); assert.equal(rebuilt.objects.key.scale.x,scale);
  view.dispose(); normal.dispose(); rebuilt.dispose(); assets.dispose();
});


