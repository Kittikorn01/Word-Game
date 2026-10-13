import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { stage6 } from '../src/stages/stage6.ts';
import { createGameState } from '../src/simulation/update.ts';
import { createArchiveWorldState, ArchiveReactionController, ARCHIVE_SECONDS } from '../src/simulation/ArchiveWorldState.ts';
import { StageCompletionController } from '../src/simulation/StageCompletionController.ts';
import { PrimitiveAssets } from '../src/assets/PrimitiveAssets.ts';
import { createDiorama } from '../src/render/createDiorama.ts';
import { ArchiveReactionView } from '../src/render/ArchiveReactionView.ts';
import { vocabularyJourney, ARCHIVE_MESSAGE } from '../src/ui/ArchiveFinaleOverlay.ts';
function setup(){const game=createGameState(stage6.playerStart,stage6.grid,stage6.quests,stage6.questPresentation);const state=game.archive=createArchiveWorldState(game.words);const controller=new ArchiveReactionController(state,game.words,game.quests);const submit=word=>{game.words.completedWords=[...game.words.completedWords,word];controller.onQuestCompleted('archive-'+word.toLowerCase());};return {game,state,controller,submit};}
function prepare(){const t=setup();for(const word of ['STONE','ABOVE','UNDER','SECRET']){t.submit(word);t.controller.update(ARCHIVE_SECONDS[word.toLowerCase()]+.45);}return t;}
test('READ waits for actual acknowledgement indefinitely; EXIT waits for door, walk, fade, and every word, once only',()=>{
 const {state,game,controller,submit}=prepare();submit('READ');controller.acknowledgeReading();assert.equal(state.readingAcknowledged,false);assert.equal(controller.inputLocked,true);
 controller.update(4.19);assert.equal(state.readingVisible,false);controller.update(.01);assert.equal(state.readingVisible,true);
 controller.update(600);assert.equal(state.readingVisible,true);assert.ok(game.words.reactionHeldWords.includes('EXIT'));assert.equal(controller.canCompleteStage,false);
 controller.acknowledgeReading();assert.equal(controller.inputLocked,false);controller.update(.44);assert.ok(game.words.reactionHeldWords.includes('EXIT'));controller.update(.01);assert.ok(!game.words.reactionHeldWords.includes('EXIT'));
 submit('EXIT');state.exitStart={x:1,z:3};state.playerPose={x:1,z:3,y:0,heading:0};
 let events=0;const complete=new StageCompletionController(stage6.id,()=>events++);complete.check(game.quests,game.words);
 controller.update(3.59);assert.equal(state.doorOpened,false);assert.deepEqual(state.playerPose,{x:1,z:3,y:0,heading:0});
 controller.update(.01);assert.equal(state.doorOpened,true);assert.equal(controller.canCompleteStage,false);
 let previous={...state.playerPose};
 for(let i=0;i<600;i++){controller.update(1/60);const pose=state.playerPose;assert.ok(Math.hypot(pose.x-previous.x,pose.z-previous.z)<=2.2/60+1e-8);previous={...pose};if(state.fade>0)assert.equal(pose.z,-5.08);complete.update(1/60,!controller.canCompleteStage,false);}
 assert.equal(events,1);assert.equal(state.finalSequenceCompleted,true);assert.equal(state.fade,1);
 const before=structuredClone(state);for(const word of stage6.vocabulary)controller.onQuestCompleted('archive-'+word.toLowerCase());controller.update(100);complete.update(100,false,false);assert.deepEqual(state,before);assert.equal(events,1);
 game.words.completedWords=game.words.completedWords.slice(0,-1);assert.equal(controller.canCompleteStage,false);
});
test('finale lights are localized, book opens physically, door separates, fresh state and disposal restore all owned changes',()=>{
 const assets=new PrimitiveAssets(),scene=new Scene();scene.add(createDiorama(stage6,assets));const book=scene.getObjectByName('book-upper-cover'),originalParent=book.parent,originalPosition=book.position.clone();const view=new ArchiveReactionView(scene,assets),{state}=setup();
 const lights=[];scene.traverse(n=>{if(n.isPointLight&&n.intensity===0)lights.push(n);});assert.equal(lights.length,6);
 try{for(const [i,key] of Object.keys(ARCHIVE_SECONDS).entries()){
   state.progress[key]=.5;view.update(state);assert.equal(lights.filter(l=>l.intensity>1).length,1);
   state.progress[key]=1;view.update(state);assert.equal(lights.filter(l=>l.intensity>1).length,0);
 }
 assert.ok(scene.getObjectByName('book-cover-hinge').rotation.z>2.8);assert.equal(scene.getObjectByName('closed-book-clasp').visible,false);
 assert.ok(scene.getObjectByName('closed-door-leaf').position.x<-1.5);assert.equal(scene.getObjectByName('warm-open-doorway').visible,true);
 view.update(setup().state);assert.equal(scene.getObjectByName('book-cover-hinge').rotation.z,0);assert.equal(scene.getObjectByName('closed-door-leaf').position.x,-.49);assert.equal(scene.getObjectByName('warm-open-doorway').visible,false);assert.ok(lights.every(l=>l.intensity===0));
 }finally{view.dispose();assert.equal(book.parent,originalParent);assert.deepEqual(book.position,originalPosition);assets.dispose();}
});
test('recap uses six real stages with exactly the approved 36 words and grouping',()=>{
 const expected=['KEY LIGHT WATER BOOK DOOR OPEN','TREE WOOD ROPE RIVER BRIDGE CLIMB','BREAD COIN SHOP LETTER CLOCK CARRY','GEAR REPAIR POWER LEVER START STOP','RAIN SHELTER FIRE WARM SAFE RESCUE','STONE ABOVE UNDER SECRET READ EXIT'];
 const journey=vocabularyJourney();assert.equal(journey.length,6);assert.deepEqual(journey.map(s=>s.words.join(' ')),expected);assert.equal(new Set(journey.flatMap(s=>s.words)).size,36);assert.equal(ARCHIVE_MESSAGE,'You did not just find words. You gave them meaning.');
});
