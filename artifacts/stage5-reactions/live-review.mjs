import {chromium} from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],knownResourceErrors=[],timings=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'){const item={text:m.text(),location:m.location()};(item.location.url.endsWith('/favicon.ico')?knownResourceErrors:errors).push(item);}});
const paths={RAIN:[[0,0],[0,1],[0,2],[0,3]],SHELTER:[[0,6],[1,6],[1,5],[2,5],[2,4],[3,4],[3,5]],FIRE:[[2,0],[3,0],[3,1],[2,1]],WARM:[[5,0],[4,0],[4,1],[5,1]],SAFE:[[6,6],[6,5],[5,5],[5,4]],RESCUE:[[6,2],[6,3],[5,3],[5,2],[4,2],[4,3]]};
const durations={RAIN:3200,SHELTER:3400,FIRE:2800,WARM:3600,SAFE:3000,RESCUE:8000};
let pos=[6,0];
async function capture(name){await page.screenshot({path:'artifacts/stage5-reactions/live-'+name+'.png'});}
async function move(to){while(pos[0]!==to[0]||pos[1]!==to[1]){let key;if(pos[0]!==to[0]){key=pos[0]>to[0]?'ArrowUp':'ArrowDown';pos[0]+=pos[0]>to[0]?-1:1;}else{key=pos[1]>to[1]?'ArrowLeft':'ArrowRight';pos[1]+=pos[1]>to[1]?-1:1;}await page.keyboard.press(key);await page.waitForTimeout(240);}}
async function solve(word){await move(paths[word][0]);const mouse=word==='FIRE';if(mouse){await page.mouse.move(720,570);await page.mouse.down();}else await page.keyboard.down('Space');await move(paths[word][1]);await move(paths[word][0]);for(const tile of paths[word].slice(1))await move(tile);if(mouse)await page.mouse.up();else await page.keyboard.up('Space');}
try {
 for(const stage of [1,2,3,4,5]){await page.goto('http://127.0.0.1:5174/?stage='+stage);await page.waitForTimeout(600);await capture('stage-'+stage);}
 assert.deepEqual(await page.locator('.quest-hud__row').evaluateAll(r=>r.map(x=>x.dataset.state)),['AVAILABLE','AVAILABLE','AVAILABLE','LOCKED','LOCKED','LOCKED']);
 await page.locator('[data-action="hint"]').click();await page.waitForTimeout(100);assert.equal(await page.locator('.quest-hud__hint').textContent(),'Hint: R _ _ _');
 await page.locator('#scan-letter').fill('r');await page.locator('.scan-tool button').click();await page.waitForTimeout(150);await capture('scan');
 await page.reload();await page.waitForTimeout(700);
 let count=0;
 for(const word of ['FIRE','SHELTER','RAIN','WARM','SAFE','RESCUE']) {
  await solve(word);count++;
  await page.evaluate(()=>{window.started=performance.now();window.firstBanner=null;window.watch=setInterval(()=>{const n=document.querySelector('.new-quest');if(n&&!n.hidden&&window.firstBanner===null)window.firstBanner=performance.now()-window.started;},16);});
  assert.equal(await page.locator('.quest-hud__row[data-completed="true"]').count(),count,word);
  if(word==='RESCUE'){
    assert.equal(await page.locator('canvas').evaluate(n=>n.inert),true);
    assert.equal(await page.locator('.assistance-hud').evaluate(n=>n.inert),true);
    await page.keyboard.press('ArrowLeft');await page.keyboard.press('w');await page.keyboard.press('Space');await page.mouse.click(720,570);
  }
  await page.waitForTimeout(durations[word]*.47);await capture(word.toLowerCase()+'-active');
  assert.equal(await page.locator('.new-quest').isVisible(),false,'notification during '+word);
  assert.equal(await page.locator('.stage-complete').count(),0,'premature completion '+word);
  const next={RAIN:3,WARM:4,SAFE:5}[word];
  if(next!==undefined)assert.equal(await page.locator('.quest-hud__row').nth(next).getAttribute('data-state'),'LOCKED');
  await page.waitForTimeout(durations[word]*.53+650);
  if(next!==undefined){await page.waitForFunction(i=>document.querySelectorAll('.quest-hud__row')[i].dataset.state==='AVAILABLE',next);assert.equal(await page.locator('.new-quest').isVisible(),true);}
  const firstBanner=await page.evaluate(()=>{clearInterval(window.watch);return window.firstBanner;});
  if(firstBanner!==null)assert.ok(firstBanner>=durations[word]+380,'early NEW QUEST '+word+' '+firstBanner);
  timings.push({word,firstBanner,minimumReactionMs:durations[word]});await capture(word.toLowerCase()+'-settled');
  if(next!==undefined)await page.waitForTimeout(3300);
 }
 await page.locator('.stage-complete').waitFor({state:'visible'});
 assert.deepEqual(await page.locator('.stage-complete__words li').allTextContents(),Object.keys(paths));await capture('complete');
 await page.goto('http://127.0.0.1:5174/?stage=5');await page.waitForTimeout(600);await capture('reset');
 assert.deepEqual(await page.locator('.quest-hud__row').evaluateAll(r=>r.map(x=>x.dataset.state)),['AVAILABLE','AVAILABLE','AVAILABLE','LOCKED','LOCKED','LOCKED']);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await capture('narrow');
 assert.deepEqual(errors,[]);console.log('PASS: real-input six-word playthrough, delayed notifications, rescue lock/completion, reset, assistance and Stages 1–5 boot.');
}catch(error){writeFileSync('artifacts/stage5-reactions/live-failure.txt',String(error.stack));throw error;}finally{writeFileSync('artifacts/stage5-reactions/live-console.json',JSON.stringify({errors,knownResourceErrors,timings},null,2));await browser.close();}
