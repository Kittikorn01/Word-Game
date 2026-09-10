import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, requestMovement, updateMovement, STEP_DURATION } from '../src/simulation/update.ts';
import { gridToWorld } from '../src/stages/types.ts';
import { stage1 } from '../src/stages/stage1.ts';
import { KeyboardInput } from '../src/input/KeyboardInput.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
const grid=stage1.grid, right={x:1,z:0}, left={x:-1,z:0};
const create=()=>createGameState({row:0,column:0},grid);
test('one command interpolates then commits exactly one tile and stops',()=>{
  const s=create(); assert.equal(requestMovement(s,right,grid),true);
  assert.equal(updateMovement(s,STEP_DURATION/2),false);
  assert.deepEqual(s.player.currentTile,{row:0,column:0});
  assert.deepEqual(s.player.targetTile,{row:0,column:1});
  assert.equal(requestMovement(s,right,grid),false);
  assert.equal(updateMovement(s,STEP_DURATION/2),true);
  assert.deepEqual(s.player.currentTile,{row:0,column:1});
  assert.equal(s.player.targetTile,null);
  const before=structuredClone(s); updateMovement(s,10); assert.deepEqual(s,before);
});
test('reject diagonal, malformed and all four boundary commands',()=>{
  for(const action of [{x:1,z:1},{x:0,z:0},{x:2,z:0},{x:NaN,z:0},{x:0.5,z:0.5}]) assert.equal(requestMovement(create(),action,grid),false);
  for(const [start,action] of [[{row:0,column:0},left],[{row:0,column:0},{x:0,z:-1}],[{row:6,column:6},right],[{row:6,column:6},{x:0,z:1}]]) {
    const s=createGameState(start,grid), before=structuredClone(s); assert.equal(requestMovement(s,action,grid),false); assert.deepEqual(s,before);
  }
});
test('stage start validated and completion independent of update frequency',()=>{
  assert.deepEqual(gridToWorld(stage1.playerStart.column,stage1.playerStart.row,grid),{x:0,z:1});
  assert.throws(()=>createGameState({row:-1,column:0},grid));
  const a=create(), b=create(); requestMovement(a,right,grid); requestMovement(b,right,grid);
  updateMovement(a,1); for(let i=0;i<60;i++) updateMovement(b,1/60);
  assert.deepEqual(a,b);
  requestMovement(a,right,grid); const before=structuredClone(a);
  for(const dt of [-1,NaN,Infinity,0]) updateMovement(a,dt);
  assert.deepEqual(a,before);
});
test('keyboard press only, first event wins, no queue, aliases and teardown',()=>{
  globalThis.window=new EventTarget(); globalThis.document=new EventTarget(); globalThis.HTMLElement=class {};
  const s=createGameState({row:3,column:3},grid), input=new KeyboardInput(action=>requestMovement(s,action,grid));
  const key=(type,code,repeat=false)=>window.dispatchEvent(Object.assign(new Event(type),{code,repeat}));
  key('keydown','KeyW'); key('keydown','KeyD');
  assert.deepEqual(s.player.targetTile,{row:2,column:3}); updateMovement(s,1);
  key('keydown','KeyW',true); key('keydown','KeyD',true); assert.equal(s.player.targetTile,null);
  key('keyup','KeyD'); key('keydown','KeyD'); updateMovement(s,1);
  assert.deepEqual(s.player.currentTile,{row:2,column:4});
  key('keydown','ArrowRight'); updateMovement(s,1); assert.equal(s.player.currentTile.column,5);
  input.dispose(); key('keydown','ArrowDown'); assert.equal(s.player.targetTile,null);
  delete globalThis.window; delete globalThis.document; delete globalThis.HTMLElement;
});
test('arrival builds KEY, backtracks; mid-step release submits only committed path',()=>{
  const board=new LetterGrid(stage1.id,grid,stage1.letterLayout), s=create(), submissions=[];
  const selection=new WordSelection(board,result=>submissions.push(result));
  const id=()=>board.getTile(s.player.currentTile.row,s.player.currentTile.column).id;
  const arrive=()=>{ if(updateMovement(s,1)) selection.enterTile(id()); };
  selection.start(id()); requestMovement(s,right,grid); arrive(); requestMovement(s,right,grid); arrive();
  assert.equal(selection.currentWord,'KEY'); requestMovement(s,left,grid); arrive(); assert.equal(selection.currentWord,'KE');
  requestMovement(s,right,grid); updateMovement(s,0.05); selection.submit(); arrive();
  assert.equal(submissions[0].word,'KE'); assert.equal(selection.isSelecting,false); assert.equal(s.player.currentTile.column,2);
  requestMovement(s,left,grid); selection.start(id()); assert.equal(selection.currentWord,'Y'); arrive(); assert.equal(selection.currentWord,'YE');
});
