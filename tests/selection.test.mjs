import test from 'node:test';
import assert from 'node:assert/strict';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { stage1 } from '../src/stages/stage1.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { PlayerTileTracker } from '../src/simulation/PlayerTileTracker.ts';
import { WordSelectionInput } from '../src/input/WordSelectionInput.ts';
const setup = () => {
  const grid = new LetterGrid(stage1.id, stage1.grid, stage1.letterLayout), submissions = [];
  return { grid, submissions, selection: new WordSelection(grid, value => submissions.push(value)), id: (r,c) => grid.getTile(r,c).id };
};
test('current-tile start, KEY, immutable submission and no double submit', () => {
  const { selection:s, id, submissions } = setup();
  assert.equal(s.start('missing'),false);
  assert.equal(s.start(null),false);
  assert.equal(s.start(id(0,0)),true);
  assert.equal(s.currentWord,'K');
  s.enterTile(id(0,1)); assert.equal(s.currentWord,'KE');
  s.enterTile(id(0,2)); assert.equal(s.currentWord,'KEY');
  const result=s.submit();
  assert.equal(result.word,'KEY');
  assert.deepEqual(result.path.map(t=>[t.row,t.column]),[[0,0],[0,1],[0,2]]);
  assert.equal(Object.isFrozen(result.path[0]),true);
  assert.equal(s.isSelecting,false); assert.equal(s.currentWord,'');
  assert.equal(s.submit(),null); assert.equal(submissions.length,1);
});
test('backtrack immediately, preserve invalid path, disallow reuse, recover', () => {
  const { selection:s,id }=setup(); s.start(id(0,0));
  s.enterTile(id(0,1)); s.enterTile(id(0,2)); s.enterTile(id(0,1));
  assert.equal(s.currentWord,'KE'); s.enterTile(id(0,0)); assert.equal(s.currentWord,'K');
  for(const invalid of [null,id(1,1),id(0,3)]) s.enterTile(invalid);
  assert.equal(s.currentWord,'K');
  s.enterTile(id(0,1)); s.enterTile(id(1,1)); s.enterTile(id(1,0));
  const before=s.currentWord; s.enterTile(id(0,0)); assert.equal(s.currentWord,before);
  s.enterTile(id(2,0)); assert.equal(s.currentWord,before+'W');
  s.cancel(); assert.equal(s.isSelecting,false); assert.deepEqual(s.selectedTileIds,[]);
});
test('coordinate tracking reads committed logical grid; hover cannot mutate path', () => {
  const {grid,selection:s,id}=setup(), tracker=new PlayerTileTracker(grid);
  assert.equal(tracker.update({row:0,column:0}),true);
  assert.equal(tracker.currentPlayerTile,id(0,0));
  assert.equal(tracker.update({row:0,column:0}),false);
  s.start(id(0,0)); grid.setHovered(id(6,6));
  assert.equal(s.currentWord,'K');
  tracker.update({row:100,column:100}); assert.equal(tracker.currentPlayerTile,null);
});
test('real input adapter: left mouse, capture, release outside, blur, visibility, cancel and teardown', () => {
  globalThis.window=new EventTarget(); globalThis.document=new EventTarget();
  class Canvas extends EventTarget {
    captured=null;
    setPointerCapture(id) { this.captured=id; }
    hasPointerCapture(id) { return this.captured===id; }
    releasePointerCapture() { this.captured=null; this.dispatchEvent(new Event('lostpointercapture')); }
  }
  const canvas=new Canvas(), {selection:s,id,submissions}=setup();
  const input=new WordSelectionInput(canvas,()=>s.start(id(0,0)),()=>s.submit(),()=>s.cancel());
  const emit=(target,type,extra={})=>target.dispatchEvent(Object.assign(new Event(type),{pointerId:1,pointerType:'mouse',button:0,buttons:1,clientX:0,clientY:0,...extra}));
  emit(canvas,'pointerdown',{button:2}); assert.equal(s.isSelecting,false);
  emit(canvas,'pointerdown',{pointerType:'touch'}); assert.equal(s.isSelecting,false);
  emit(canvas,'pointerdown'); emit(canvas,'pointerleave'); assert.equal(s.isSelecting,true);
  emit(window,'pointerup'); assert.equal(s.isSelecting,false); assert.equal(submissions.length,1);
  for (const [target,event] of [[window,'blur'],[document,'visibilitychange'],[window,'pointercancel'],[canvas,'lostpointercapture']]) {
    emit(canvas,'pointerdown'); assert.equal(s.isSelecting,true); emit(target,event); assert.equal(s.isSelecting,false);
  }
  emit(canvas,'pointerdown'); emit(window,'pointermove',{buttons:0}); assert.equal(s.isSelecting,false);
  assert.equal(submissions.length,2);
  emit(canvas,'pointerdown'); input.dispose(); assert.equal(s.isSelecting,false);
  emit(canvas,'pointerdown'); assert.equal(s.isSelecting,false);
  delete globalThis.window; delete globalThis.document;
});
