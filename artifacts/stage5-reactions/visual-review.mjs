import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.route('**/reaction-review',route=>route.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><div id="app" style="width:100vw;height:100vh"></div></body></html>'}));
try {
await page.goto('http://127.0.0.1:5174/reaction-review');
await page.evaluate(async()=>{
 const [{GameView},{stage5},{LetterGrid},{createGameState},{createStormWorldState,StormReactionController},{resolveQuestWord},{createQuestValidator}]=await Promise.all([import('/src/render/GameView.ts'),import('/src/stages/stage5.ts'),import('/src/grid/LetterGrid.ts'),import('/src/simulation/update.ts'),import('/src/simulation/StormWorldState.ts'),import('/src/simulation/QuestProgress.ts'),import('/src/validation/QuestValidator.ts')]);
 const state=createGameState(stage5.playerStart,stage5.grid,stage5.quests),controller=new StormReactionController(state.storm=createStormWorldState(state.words),state.words);
 const grid=new LetterGrid(stage5.id,stage5.grid,stage5.letterLayout),view=new GameView(document.querySelector('#app'),stage5,grid),validate=createQuestValidator(state.quests.definitions,state.words);
 window.review={state,controller,view,submit:word=>resolveQuestWord(state.quests,state.words,{word,selectedTileIds:[]},validate,controller.onQuestCompleted)};
 view.render(state,0);
});
async function capture(name){await page.evaluate(()=>review.view.render(review.state,0));await page.screenshot({path:'artifacts/stage5-reactions/'+name+'.png'});}
async function advance(dt){await page.evaluate(dt=>{review.controller.update(dt);review.view.render(review.state,dt)},dt);}
await capture('initial');
for(const [word,duration] of [['RAIN',3.2],['SHELTER',3.4],['FIRE',2.8],['WARM',3.6],['SAFE',3],['RESCUE',8]]) {
 console.log(word,await page.evaluate(word=>({result:review.submit(word),held:review.state.words.reactionHeldWords,quiet:review.state.storm.quiet,progress:review.state.storm.progress}),word));
 await advance(duration*.47);await capture(word.toLowerCase()+'-active');
 await advance(duration*.53+.5);await capture(word.toLowerCase()+'-settled');
}
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);await capture('final-narrow');
console.log(errors);writeFileSync('artifacts/stage5-reactions/visual-errors.json',JSON.stringify(errors));
await page.evaluate(()=>review.view.dispose());
}finally{await browser.close();}
