import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, updateMovement, PLAYER_RADIUS } from '../src/simulation/update.ts';
import { gridToWorld, movementBounds } from '../src/stages/types.ts';
import { prototypeStage } from '../src/stages/prototype.ts';
const bounds = movementBounds(prototypeStage);
test('diagonal movement has the same speed as cardinal movement', () => {
  const a = createGameState({x:0,z:0}), b = createGameState({x:0,z:0});
  updateMovement(a,{x:1,z:0},0.5,bounds); updateMovement(b,{x:1,z:1},0.5,bounds);
  assert.ok(Math.abs(a.player.x - Math.hypot(b.player.x,b.player.z)) < 1e-10);
});
test('player stays within all four edges including body radius', () => {
  for (const sign of [-1,1]) {
    const state = createGameState({x:0,z:0}); updateMovement(state,{x:sign,z:sign},100,bounds);
    assert.equal(state.player.x, sign * (bounds.maxX - PLAYER_RADIUS));
    assert.equal(state.player.z, sign * (bounds.maxZ - PLAYER_RADIUS));
  }
});
test('movement is independent of update frequency', () => {
  const a = createGameState({x:0,z:0}), b = createGameState({x:0,z:0});
  updateMovement(a,{x:1,z:0},1,bounds);
  for(let i=0;i<60;i++) updateMovement(b,{x:1,z:0},1/60,bounds);
  assert.ok(Math.abs(a.player.x-b.player.x)<1e-10);
});
test('idle and invalid elapsed time do not move the player', () => {
  const state=createGameState(prototypeStage.spawn), before=structuredClone(state);
  updateMovement(state,{x:0,z:0},1,bounds);
  for(const dt of [-1,NaN,Infinity]) updateMovement(state,{x:1,z:0},dt,bounds);
  assert.deepEqual(state,before);
});
test('grid centers align with centered world bounds', () => {
  assert.deepEqual(gridToWorld(3,3,prototypeStage.grid),{x:0,z:0});
  assert.deepEqual(gridToWorld(0,0,prototypeStage.grid),{x:-3,z:-3});
  assert.equal(bounds.maxX,3.5);
});
