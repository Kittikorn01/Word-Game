import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, OrthographicCamera, Vector3, Raycaster } from 'three';
import { stage5 } from '../src/stages/stage5.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { LetterGrid } from '../src/grid/LetterGrid.ts';
test('storm clearing fits desktop/narrow frames and leaves every letter surface unobstructed', () => {
  const assets=new PrimitiveAssets();
  try {
    const scene=createDiorama(stage5,assets);scene.updateMatrixWorld(true);
    const grid=new LetterGrid(stage5.id,stage5.grid,stage5.letterLayout);
    assert.equal(grid.tiles.length,49);
    for(const aspect of [1440/900,390/844,16/9]) {
      const span=Math.max(stage5.camera.verticalSpan,stage5.camera.minimumWidth/aspect);
      const camera=new OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,100);
      camera.position.set(...stage5.camera.position);camera.lookAt(...stage5.camera.target);camera.updateMatrixWorld();
      for(const name of ['forest-shelter','unlit-fire-area','safe-dry-zone','rescue-entry-path','forest-framing']) {
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


test('Stage 5 stays a scenery blockout with no quests, reactions or completion', async () => {
  const { createGameState } = await import('../src/simulation/update.ts');
  const { StageCompletionController } = await import('../src/simulation/StageCompletionController.ts');
  const state = createGameState(stage5.playerStart, stage5.grid, stage5.quests);
  assert.equal(state.quests.definitions.length, 0);
  for (const key of ['vocabulary','worldReactions','worldObjects','supportObjectives','wordShardSpawns','exit','nextStageId','forestProgression','townProgression']) assert.equal(stage5[key], undefined, key);
  const completion = new StageCompletionController(stage5.id, () => assert.fail('blockout completed'));
  completion.check(state.quests, state.words); completion.update(100, false, false);
});
