import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Raycaster, Vector3 } from 'three';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createCottage } from '../src/render/createCottage.ts';
import { WorldReactionView } from '../src/render/WorldReactionView.ts';
import { createStageWorldState } from '../src/simulation/WorldReactionController.ts';
import { stage1 } from '../src/stages/stage1.ts';

function fixture() {
  const assets = new PrimitiveAssets(), view = new WorldReactionView(assets,stage1.worldObjects);
  const shell = createCottage(stage1,assets), root = new Group(), state = createStageWorldState();
  root.add(shell,view.objects.root); view.update(state,0);
  const meshes = () => {
    root.updateMatrixWorld(true);
    const result = []; root.traverseVisible(object => { if (object.isMesh) result.push(object); });
    return result;
  };
  return { assets, view, shell, state, meshes, dispose: () => { view.dispose(); assets.dispose(); } };
}

test('door reveal stays backed by full plaster on every frame; OPEN reveals an opaque recess', () => {
  const f = fixture(), {view,state,assets} = f;
  for (const x of [1.9,2.2,2.8,3.4,3.7]) for (const y of [.4,1,1.6,2.1]) {
    const hit = new Raycaster(new Vector3(x,y,-3.7),new Vector3(0,0,-1)).intersectObjects(f.meshes(),false)[0];
    assert.equal(hit?.object.material,assets.material.plaster);
    assert.ok(Math.abs(hit.point.z-(-4.45))<1e-6);
  }
  assert.equal(view.objects.door.visible,false);
  state.doorRevealed = true;
  for (let frame=0;frame<60;frame++) {
    view.update(state,1/60);
    assert.equal(view.objects.door.visible,true);
    assert.equal(view.objects.wallCover.visible,true);
    assert.equal(view.objects.wallCover.scale.y,1);
    assert.equal(view.objects.doorway.visible,false);
    assert.equal(view.objects.hinge.rotation.y,0);
    for (const x of [2.2,2.4,2.8,3.2,3.4]) for (const y of [.3,.7,1.2,1.6]) {
      const hit = new Raycaster(new Vector3(x,y,-3.7),new Vector3(0,0,-1)).intersectObjects(f.meshes(),false)[0];
      assert.ok(hit,`uncovered doorway at reveal frame ${frame}, ${x},${y}`);
    }
  }
  const closed = new Raycaster(new Vector3(2.8,1,-3.7),new Vector3(0,0,-1)).intersectObjects(f.meshes(),false)[0];
  assert.equal(closed.object.parent,view.objects.hinge);
  state.doorOpen = true;
  for (let frame=0;frame<90;frame++) {
    view.update(state,1/60);
    assert.equal(view.objects.wallCover.visible,false);
    assert.equal(view.objects.doorway.visible,true);
    const hits = new Raycaster(new Vector3(2.8,1,-3.7),new Vector3(0,0,-1)).intersectObjects(f.meshes(),false);
    assert.ok(hits.length>0,`unbacked opening at frame ${frame}`);
  }
  const opened = new Raycaster(new Vector3(2.8,1,-3.7),new Vector3(0,0,-1)).intersectObjects(f.meshes(),false)[0];
  assert.equal(opened.object.parent,view.objects.doorway);
  f.dispose();
});

test('perimeter meshes leave all letter footprints clear throughout room reactions at the fixed camera angle', () => {
  const f = fixture();
  const towardCamera = new Vector3(0,16,11).normalize();
  for (let frame=0;frame<16;frame++) {
    if (frame===1) Object.assign(f.state,{bookSpawned:true,plantWatered:true,lightOn:true,doorRevealed:true});
    if (frame===10) f.state.doorOpen = true;
    f.view.update(f.state,.15);
    const meshes = f.meshes();
    for (let row=0;row<7;row++) for (let column=0;column<7;column++) {
      for (const dx of [-.4,0,.4]) for (const dz of [-.4,0,.4]) {
        const point = new Vector3(column-3+dx,.11,row-3+dz);
        const origin = point.clone().addScaledVector(towardCamera,30);
        const hits = new Raycaster(origin,towardCamera.clone().negate(),0,29.99).intersectObjects(meshes,false);
        assert.equal(hits.length,0,`frame ${frame}, tile ${row},${column}: ${hits[0]?.object.parent.name}`);
      }
    }
  }
  f.dispose();
});

test('BOOK reacts across the shelf before the featured book, then settles without lighting other props', () => {
  const f = fixture(), objects = f.view.objects;
  const shelf = objects.root.getObjectByName('bookshelf');
  assert.equal(shelf.children.filter(o=>o.name==='shelf-book' || o.name==='reaction-book').length,27);
  const pot = objects.root.getObjectByName('plant').children[0];
  f.state.bookSpawned = true; f.view.update(f.state,.3);
  assert.ok(objects.shelfMaterials.every(surface=>surface.emissiveIntensity>.2));
  assert.ok(objects.shelfBooks.every(({object,home})=>object.position.y>home.y));
  assert.deepEqual(objects.book.position,objects.bookHome);
  f.view.update(f.state,.6);
  assert.ok(objects.book.position.z>objects.bookHome.z+.25);
  assert.ok(objects.book.position.y>objects.bookHome.y+.2);
  assert.ok(objects.bookCover.emissiveIntensity>.3);
  assert.equal(pot.material.emissiveIntensity,1);
  assert.equal(pot.material.emissive.getHex(),0);
  assert.equal(objects.frame.children[0].material.emissive.getHex(),0);
  f.view.update(f.state,2);
  for (const {object,home} of objects.shelfBooks) assert.ok(object.position.distanceTo(home)<1e-10);
  const pose = objects.book.position.clone(); f.view.update(f.state,1);
  assert.deepEqual(objects.book.position,pose);
  f.dispose();
});

test('KEY materializes by the player and its world position converges on a moving player', () => {
  const f = fixture(), objects = f.view.objects;
  f.state.keySpawned = true; f.state.keyAcquisitionProgress = .3;
  f.view.update(f.state,.1,{x:-2,z:1});
  assert.equal(objects.keyStand.children.length,1);
  assert.equal(objects.keyStand.position.x,-1.45);
  assert.ok(objects.key.position.y>1.5);
  f.state.keyAcquisitionProgress = .99;
  f.view.update(f.state,.1,{x:2,z:2}); f.meshes();
  assert.ok(objects.key.getWorldPosition(new Vector3()).distanceTo(new Vector3(2,.65,2))<.02);
  const snapshot = structuredClone(f.state); f.view.update(f.state,.2);
  assert.deepEqual(f.state,snapshot);
  f.state.hasKey = true; f.view.update(f.state,0); assert.equal(objects.key.visible,false);
  f.dispose();
});
