import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3, Box3 } from 'three';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { stage3 } from '../src/stages/stage3.ts';
import { stage1 } from '../src/stages/stage1.ts';
import { stage2 } from '../src/stages/stage2.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { createGameState, updateMovement } from '../src/simulation/update.ts';
import { requestStageMovement } from '../src/simulation/ForestTraversal.ts';
import { WordSelection } from '../src/selection/WordSelection.ts';
import { WordSelectionInput } from '../src/input/WordSelectionInput.ts';
import { KeyboardInput } from '../src/input/KeyboardInput.ts';
const setup = () => ({ grid: new LetterGrid(stage3.id, stage3.grid, stage3.letterLayout), state: createGameState(stage3.playerStart, stage3.grid) });

test('one full board uses original cardinal movement and cannot leave any edge', () => {
  const {grid,state}=setup();
  assert.equal(grid.tiles.length,49);
  for(const stage of [stage1,stage2]) {
    assert.equal(stage3.grid.rows,stage.grid.rows); assert.equal(stage3.grid.columns,stage.grid.columns);
    assert.equal(stage3.grid.tileSize,stage.grid.tileSize);
  }
  for(const tile of grid.tiles) for(const action of [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}]) {
    state.player.currentTile={row:tile.row,column:tile.column};state.player.targetTile=null;
    const row=tile.row+action.z,column=tile.column+action.x;
    assert.equal(requestStageMovement(state,action,stage3),row>=0&&row<7&&column>=0&&column<7);
    updateMovement(state,.18);
    assert.ok(grid.getTile(state.player.currentTile.row,state.player.currentTile.column));
  }
  assert.equal(requestStageMovement(state,{x:1,z:1},stage3),false);
  assert.equal(stage3.townExploration,undefined);
});

test('all landmarks and every letter fit the fixed frame with no building covering a letter', () => {
  const assets=new PrimitiveAssets();
  try {
    const scene=createDiorama(stage3,assets); scene.updateMatrixWorld(true);
    const {grid}=setup();
    for(const aspect of [16/9,1440/900,390/844,3440/1440]) {
      const span=Math.max(stage3.camera.verticalSpan,stage3.camera.minimumWidth/aspect);
      const camera=new OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,100);
      camera.position.set(...stage3.camera.position);camera.lookAt(...stage3.camera.target);camera.updateMatrixWorld();
      for(const zone of stage3.townBlockout.zones) {
        const box=new Box3().setFromObject(scene.getObjectByName(`${zone.id}-placeholder`));
        const points=[];
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]) {
          const p=new Vector3(x,y,z).project(camera);points.push(p);
          assert.ok(Math.abs(p.x)<.96&&Math.abs(p.y)<.96,`clipped ${zone.id}: ${p.toArray()}`);
        }
        for(const tile of grid.tiles) {
          const p=new Vector3(tile.worldPosition.x,.108,tile.worldPosition.z).project(camera);
          assert.ok(p.x<Math.min(...points.map(p=>p.x))||p.x>Math.max(...points.map(p=>p.x))||p.y<Math.min(...points.map(p=>p.y))||p.y>Math.max(...points.map(p=>p.y)),`occluded by ${zone.id}`);
          assert.ok(Math.abs(p.x)<.9&&Math.abs(p.y)<.9);
        }
      }
    }
  } finally {assets.dispose();}
});

test('mouse/Space holds, WASD/arrows, release and blur keep original selection behavior', () => {
  const saved = {window:globalThis.window,document:globalThis.document,HTMLElement:globalThis.HTMLElement};
  class Element extends EventTarget { closest(){return null;} setPointerCapture(id){this.captured=id;} hasPointerCapture(id){return this.captured===id;} releasePointerCapture(){this.captured=null;} }
  globalThis.window=new EventTarget();globalThis.document=new EventTarget();globalThis.HTMLElement=Element;
  const canvas=new Element();const {grid,state}=setup();const words=[];
  const selection=new WordSelection(grid,s=>words.push(s.word));
  const tile=()=>grid.getTile(state.player.currentTile.row,state.player.currentTile.column)?.id ?? null;
  const keyboard=new KeyboardInput(action=>{if(requestStageMovement(state,action,stage3,selection.isSelecting)){updateMovement(state,.18);selection.enterTile(tile());}});
  const input=new WordSelectionInput(canvas,()=>selection.start(tile()),()=>selection.submit(),()=>selection.cancel());
  const emit=(target,type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);};
  const move=code=>{emit(window,'keydown',{code});emit(window,'keyup',{code});};
  try {
    emit(window,'keydown',{code:'Space'});move('KeyD');move('ArrowLeft');
    assert.equal(selection.currentWord.length,1);emit(window,'keyup',{code:'Space'});assert.equal(words.length,1);
    emit(canvas,'pointerdown',{pointerType:'mouse',button:0,pointerId:1});move('ArrowRight');
    emit(window,'pointerup',{button:0,pointerId:1});assert.equal(words[1].length,2);
    emit(window,'keydown',{code:'Space'});emit(window,'blur');assert.equal(selection.isSelecting,false);
    move('ArrowUp');move('KeyS');move('KeyW');move('ArrowDown');move('KeyA');
    assert.deepEqual(state.player.currentTile,stage3.playerStart);
  } finally {input.dispose();keyboard.dispose();Object.assign(globalThis,saved);}
});
