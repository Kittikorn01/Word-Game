import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, OrthographicCamera, Vector3, Raycaster } from 'three';
import { stages } from '../src/stages/registry.ts';
import { stage4 } from '../src/stages/stage4.ts';
import { StageManager } from '../src/app/StageManager.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
import { createGameState } from '../src/simulation/update.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';

test('Stage 3 transitions through the existing intro to an empty, non-completing Stage 4', async () => {
  const events=[];
  const manager=new StageManager(stages,stages[2].id,s=>{events.push(s.id);return {lock(){},unlock(){},dispose(){}};},
    {async fadeOut(){},async fadeIn(){},async showIntro(s){events.push(s.title);},dispose(){}});
  manager.start();assert.equal(await manager.next(),true);
  assert.deepEqual(events,[stages[2].id,'The Silent Workshop',stage4.id]);
  assert.equal(await manager.next(),false);manager.dispose();
  const state=createGameState(stage4.playerStart,stage4.grid,stage4.quests);
  const completion=new StageCompletionController(stage4.id,()=>assert.fail('empty stage completed'));
  completion.check(state.quests,state.words);completion.update(100,false,false);
  assert.equal(state.quests.definitions.length,0);
  assert.equal(stage4.worldReactions,undefined);assert.equal(stage4.vocabulary,undefined);
});

test('workshop fits desktop/narrow frames and leaves every letter surface unobstructed', () => {
  const assets=new PrimitiveAssets();
  try {
    const scene=createDiorama(stage4,assets);scene.updateMatrixWorld(true);
    const grid=new LetterGrid(stage4.id,stage4.grid,stage4.letterLayout);
    assert.equal(grid.tiles.length,49);
    for(const aspect of [1440/900,390/844,16/9]) {
      const span=Math.max(stage4.camera.verticalSpan,stage4.camera.minimumWidth/aspect);
      const camera=new OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,100);
      camera.position.set(...stage4.camera.position);camera.lookAt(...stage4.camera.target);camera.updateMatrixWorld();
      for(const name of ['main-machine','gear-area-empty-slot','stationary-conveyor','inactive-power-box','lever-at-rest','output-receiving-platform']) {
        const node=scene.getObjectByName(name);assert.ok(node);
        const box=new Box3().setFromObject(node);
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]) {
          const p=new Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<.96&&Math.abs(p.y)<.96,`clipped ${name}`);
        }
      }
      const direction=camera.getWorldDirection(new Vector3());
      for(const tile of grid.tiles)for(const dx of [-.4,0,.4])for(const dz of [-.4,0,.4]) {
        const point=new Vector3(tile.worldPosition.x+dx,.115,tile.worldPosition.z+dz);
        const ray=new Raycaster(point.clone().addScaledVector(direction,-40),direction,0,39.99);
        assert.equal(ray.intersectObject(scene,true).length,0,`obscured ${tile.id}`);
      }
    }
  } finally {assets.dispose();}
});
