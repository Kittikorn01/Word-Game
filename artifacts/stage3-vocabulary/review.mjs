import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[], knownResourceErrors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'){const item={text:m.text(),location:m.location()};if(item.location.url.endsWith('/favicon.ico'))knownResourceErrors.push(item);else errors.push(item);}});
const base='http://127.0.0.1:5177/';
const paths={BREAD:[[0,0],[0,1],[1,1],[1,2],[1,3]],COIN:[[0,6],[1,6],[2,6],[3,6]],SHOP:[[3,3],[3,2],[3,1],[4,1]],LETTER:[[4,0],[5,0],[5,1],[6,1],[6,2],[5,2]],CLOCK:[[0,3],[0,4],[1,4],[2,4],[2,5]],CARRY:[[4,4],[4,5],[5,5],[5,6],[6,6]]};
try {
 for(const stage of [1,2,3]){await page.goto(`${base}?stage=${stage}`);await page.waitForTimeout(1200);await page.screenshot({path:`artifacts/stage3-vocabulary/stage-${stage}-desktop.png`});}
 assert.equal(await page.locator('.quest-hud__row').count(),6);
 await page.locator('[data-action="hint"]').click();await page.waitForTimeout(100);assert.equal(await page.locator('.quest-hud__hint').textContent(),'Hint: B _ _ _ _');
 await page.locator('[data-action="hint"]').click();await page.waitForTimeout(100);assert.equal(await page.locator('.quest-hud__hint').textContent(),'Hint: B R _ _ _');
 await page.reload();await page.waitForTimeout(900);await page.locator('#scan-letter').fill('c');await page.locator('.scan-tool button').click();await page.waitForTimeout(200);await page.screenshot({path:'artifacts/stage3-vocabulary/scan-c.png'});
 await page.reload();await page.waitForTimeout(900);
 let pos=[6,3],count=0;
 async function move(to){while(pos[0]!==to[0]||pos[1]!==to[1]){let key;if(pos[0]!==to[0]){key=pos[0]>to[0]?'ArrowUp':'ArrowDown';pos[0]+=pos[0]>to[0]?-1:1;}else{key=pos[1]>to[1]?'ArrowLeft':'ArrowRight';pos[1]+=pos[1]>to[1]?-1:1;}await page.keyboard.press(key);await page.waitForTimeout(240);}}
 for(const [word,path]of Object.entries(paths)){
  await move(path[0]);
  const mouse=word==='SHOP';
  if(mouse){await page.mouse.move(720,570);await page.mouse.down();}else await page.keyboard.down('Space');
  await move(path[1]);await move(path[0]); // exercise backtracking before solving
  for(const tile of path.slice(1))await move(tile);
  if(mouse)await page.mouse.up();else await page.keyboard.up('Space');
  await page.waitForTimeout(2000);count++;
  assert.equal(await page.locator('.quest-hud__row[data-completed="true"]').count(),count,word);
 }
 await page.screenshot({path:'artifacts/stage3-vocabulary/completed.png'});
 await page.setViewportSize({width:390,height:844});await page.goto(`${base}?stage=3`);await page.waitForTimeout(900);await page.screenshot({path:'artifacts/stage3-vocabulary/stage-3-narrow.png'});
 assert.deepEqual(errors,[]);console.log('PASS: all 6 words via keyboard/mouse with backtracking; hints; scan; stages 1/2/3 boot; no gameplay console errors (existing missing favicon recorded separately).');
}finally{writeFileSync('artifacts/stage3-vocabulary/console.json',JSON.stringify({errors,knownResourceErrors},null,2));await browser.close();}

