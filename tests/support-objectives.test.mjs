import test from 'node:test';
import assert from 'node:assert/strict';
import { SupportObjectives } from '../src/simulation/SupportObjectives.ts';
import { createPlayerResources } from '../src/simulation/AssistanceState.ts';
import { stage1 } from '../src/stages/stage1.ts';
import { createGameState } from '../src/simulation/update.ts';
import { WordShardView } from '../src/render/WordShardView.ts';

test('two reachable support objectives require explicit inspection, grant once and preserve main state', () => {
 const resources=createPlayerResources(), support=new SupportObjectives(resources,stage1.supportObjectives);
 const state=createGameState(stage1.playerStart,stage1.grid,stage1.quests), before=JSON.stringify(state);
 assert.equal(support.definitions.length,2);
 assert.equal(support.inspect(stage1.playerStart,false),undefined);
 for (const d of support.definitions) {
  assert.ok(d.tile.row >=0 && d.tile.row < stage1.grid.rows && d.tile.column >=0 && d.tile.column <stage1.grid.columns);
  const shards=resources.wordShards;
  assert.equal(support.nearby(d.tile),d); support.update(1); assert.equal(resources.wordShards,shards);
  assert.equal(support.inspect(d.tile,true),undefined); assert.equal(resources.wordShards,shards);
  assert.equal(support.inspect(d.tile,false),d); assert.equal(resources.wordShards,shards+1);
  assert.equal(support.inspect(d.tile,false),undefined); assert.equal(resources.wordShards,shards+1);
 }
 assert.equal(support.completedIds.size,2); assert.equal(JSON.stringify(state),before);
 support.update(3); assert.equal(support.rewardVisual,null);
 assert.equal(support.completedIds.size,2);
});
test('reward crystal only appears after inspection and clears with reward timer', () => {
 const resources=createPlayerResources(), support=new SupportObjectives(resources,stage1.supportObjectives), view=new WordShardView(stage1);
 view.update(0,null); assert.ok(view.root.children.every(c=>!c.visible));
 support.inspect(support.definitions[0].tile,false); support.update(.2); view.update(.2,support.rewardVisual);
 assert.equal(view.root.children.filter(c=>c.visible).length,1);
 assert.ok(view.root.children[0].children[0].position.y>=1);
 support.update(3); view.update(3,support.rewardVisual); assert.ok(view.root.children.every(c=>!c.visible));
 view.dispose(); assert.equal(view.root.children.length,0);
});
test('support definitions reject duplicate IDs and invalid rewards', () => {
 const d=stage1.supportObjectives[0], resources=createPlayerResources();
 assert.throws(()=>new SupportObjectives(resources,[d,d]));
 for(const reward of [0,-1,1.5,NaN]) assert.throws(()=>new SupportObjectives(resources,[{...d,reward}]));
 const empty=new SupportObjectives(resources); assert.equal(empty.inspect({row:0,column:0},false),undefined);
});
