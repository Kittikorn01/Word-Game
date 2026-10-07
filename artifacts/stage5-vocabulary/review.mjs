import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[], knownResourceErrors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'){const item={text:m.text(),location:m.location()};if(item.location.url.endsWith('/favicon.ico'))knownResourceErrors.push(item);else errors.push(item);}});
const base='http://127.0.0.1:5174/';
const paths={"RAIN":[[0,0],[0,1],[0,2],[0,3]],"SHELTER":[[0,6],[1,6],[1,5],[2,5],[2,4],[3,4],[3,5]],"FIRE":[[2,0],[3,0],[3,1],[2,1]],"WARM":[[5,0],[4,0],[4,1],[5,1]],"SAFE":[[6,6],[6,5],[5,5],[5,4]],"RESCUE":[[6,2],[6,3],[5,3],[5,2],[4,2],[4,3]]};
try {
 for(const stage of [1,2,3,4,5]){await page.goto(`${base}?stage=${stage}`);await page.waitForTimeout(1200);await page.screenshot({path:`artifacts/stage5-vocabulary/stage-${stage}-desktop.png`});}
 assert.equal(await page.locator('.quest-hud__row').count(),6);
 assert.deepEqual(await page.locator('.quest-hud__row').evaluateAll(rows=>rows.map(r=>r.dataset.state)),['AVAILABLE','AVAILABLE','AVAILABLE','LOCKED','LOCKED','LOCKED']);
 assert.deepEqual(await page.locator('.quest-hud__row:disabled .quest-hud__summary').allTextContents(),['Locked','Locked','Locked']);
 await page.locator('[data-action="hint"]').click();await page.waitForTimeout(100);assert.equal(await page.locator('.quest-hud__hint').textContent(),'Hint: R _ _ _');
 await page.locator('[data-action="hint"]').click();await page.waitForTimeout(100);assert.equal(await page.locator('.quest-hud__hint').textContent(),'Hint: R A _ _');
 await page.reload();await page.waitForTimeout(900);await page.locator('#scan-letter').fill('r');await page.locator('.scan-tool button').click();await page.waitForTimeout(200);await page.screenshot({path:'artifacts/stage5-vocabulary/scan-r.png'});
 await page.reload();await page.waitForTimeout(900);
 let pos=[6,0],count=0;
 async function move(to){while(pos[0]!==to[0]||pos[1]!==to[1]){let key;if(pos[0]!==to[0]){key=pos[0]>to[0]?'ArrowUp':'ArrowDown';pos[0]+=pos[0]>to[0]?-1:1;}else{key=pos[1]>to[1]?'ArrowLeft':'ArrowRight';pos[1]+=pos[1]>to[1]?-1:1;}await page.keyboard.press(key);await page.waitForTimeout(240);}}
 for (const word of ['WARM','SAFE','RESCUE']) {
  await move(paths[word][0]);await page.keyboard.down('Space');for(const tile of paths[word].slice(1))await move(tile);await page.keyboard.up('Space');await page.waitForTimeout(150);
  assert.equal(await page.locator('.word-selection__status').textContent(),"That word isn't needed here yet.");
  assert.equal(await page.locator('.quest-hud__row[data-completed="true"]').count(),0);await page.waitForTimeout(3000);
 }
 for(const [word,path]of Object.entries(paths)){
  await move(path[0]);
  const mouse=word==='SHELTER';
  if(mouse){await page.mouse.move(720,570);await page.mouse.down();}else await page.keyboard.down('Space');
  await move(path[1]);await move(path[0]); // exercise backtracking before solving
  for(const tile of path.slice(1))await move(tile);
  if(mouse)await page.mouse.up();else await page.keyboard.up('Space');
  await page.waitForTimeout(4000);count++;
  assert.equal(await page.locator('.quest-hud__row[data-completed="true"]').count(),count,word);
  const expected=["RAIN","SHELTER","FIRE","WARM","SAFE","RESCUE"].map((w,i)=>count>i?'COMPLETED':i<3||i===3&&count>=3||i===4&&count>=4||i===5&&count>=5?'AVAILABLE':'LOCKED');
  assert.deepEqual(await page.locator('.quest-hud__row').evaluateAll(rows=>rows.map(r=>r.dataset.state)),expected);
  await page.screenshot({path:'artifacts/stage5-vocabulary/after-'+word+'.png'});
 }
 await page.screenshot({path:'artifacts/stage5-vocabulary/completed.png'});
 await page.setViewportSize({width:390,height:844});await page.goto(`${base}?stage=5`);await page.waitForTimeout(900);await page.screenshot({path:'artifacts/stage5-vocabulary/stage-5-narrow.png'});
 assert.deepEqual(errors,[]);console.log('PASS: all 6 words via keyboard/mouse with backtracking; hints; scan; stages 1–5 boot; fixed HUD order; locked submissions; no gameplay console errors (existing missing favicon recorded separately).');
}finally{writeFileSync('artifacts/stage5-vocabulary/console.json',JSON.stringify({errors,knownResourceErrors},null,2));await browser.close();}

