import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} ${m.location().url}`)});
await page.goto('http://127.0.0.1:5174/?stage=3');await page.waitForTimeout(800);
await page.screenshot({path:'artifacts/stage3-polish/initial.png'});
// Isolated deterministic visual fixture using the production renderer and overlays.
await page.evaluate(async()=>{
const [{GameView},{stage3},{LetterGrid},{createGameState},{createTownWorldState},{createQuestOverlay},{createWordSelectionOverlay},{resolveQuestWord},{createQuestValidator}]=await Promise.all([
import('/src/render/GameView.ts'),import('/src/stages/stage3.ts'),import('/src/grid/LetterGrid.ts'),import('/src/simulation/update.ts'),import('/src/simulation/TownWorldState.ts'),import('/src/ui/QuestOverlay.ts'),import('/src/ui/WordSelectionOverlay.ts'),import('/src/simulation/QuestProgress.ts'),import('/src/validation/QuestValidator.ts')]);
const host=document.createElement('div');host.className='stage-runtime';host.dataset.stageId=stage3.id;host.style.zIndex='200';document.querySelector('#app').append(host);
const grid=new LetterGrid(stage3.id,stage3.grid,stage3.letterLayout), state=createGameState(stage3.playerStart,stage3.grid,stage3.quests);state.town=createTownWorldState();
const view=new GameView(host,stage3,grid),quest=createQuestOverlay(host,()=>{},true),word=createWordSelectionOverlay(host);
window.fixture={host,state,view,quest,word,submit(w){return resolveQuestWord(state.quests,state.words,{word:w,selectedTileIds:[],path:[]},createQuestValidator(state.quests.definitions,state.words))},draw(){quest.render(state.quests,state.words);view.render(state,0)}};fixture.draw();
});
const lockedLabels=await page.locator('.stage-runtime').last().locator('[data-state=LOCKED]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
if(lockedLabels.length!==2||lockedLabels.some(label=>label!=='Locked quest'))throw Error('Locked clue exposed');
const initial=await page.locator('.stage-runtime').last().locator('.quest-hud__row').evaluateAll(es=>es.map(e=>({text:e.textContent,top:e.getBoundingClientRect().top})));
for(const [name,progress] of [['shop',.3],['letter',.2],['letter-flight',.52],['clock',.5],['active',1]]){
await page.evaluate(({name,progress})=>{const f=fixture;for(const k of ['bread','coin','shop','letter','clock']){f.state.town.started[k]=true;f.state.town.progress[k]=name==='active'?1:k===name.split('-')[0]?progress:0;}f.word.show({status:'CORRECT',word:name.startsWith('letter')?'LETTER':name.toUpperCase(),selectedTileIds:[]});f.draw();},{name,progress});
await page.screenshot({path:`artifacts/stage3-polish/${name}.png`});
}
await page.evaluate(()=>{for(const w of ['COIN','BREAD','LETTER','SHOP','CLOCK','CARRY'])fixture.submit(w);fixture.draw()});
const after=await page.locator('.stage-runtime').last().locator('.quest-hud__row').evaluateAll(es=>es.map(e=>({text:e.textContent,top:e.getBoundingClientRect().top})));
if(initial.length!==6||after.length!==6||initial.some((r,i)=>r.top!==after[i].top))throw Error('Quest rows moved');
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);await page.evaluate(()=>{fixture.word.show({status:'WRONG',word:'CLOCK',selectedTileIds:[]});fixture.draw()});await page.screenshot({path:'artifacts/stage3-polish/narrow.png'});
console.log(JSON.stringify({initial,after,errors},null,2));await browser.close();

