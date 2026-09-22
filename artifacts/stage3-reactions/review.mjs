import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],knownResourceErrors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'){const x={text:m.text(),location:m.location()};(x.location.url.endsWith('/favicon.ico')?knownResourceErrors:errors).push(x);}});
const paths={BREAD:[[0,0],[0,1],[1,1],[1,2],[1,3]],COIN:[[0,6],[1,6],[2,6],[3,6]],SHOP:[[3,3],[3,2],[3,1],[4,1]],LETTER:[[4,0],[5,0],[5,1],[6,1],[6,2],[5,2]],CLOCK:[[0,3],[0,4],[1,4],[2,4],[2,5]],CARRY:[[4,4],[4,5],[5,5],[5,6],[6,6]]};
const shot=name=>page.screenshot({path:`artifacts/stage3-reactions/${name}.png`});let pos=[6,3];
async function move(to){while(pos[0]!==to[0]||pos[1]!==to[1]){let key;if(pos[0]!==to[0]){key=pos[0]>to[0]?'ArrowUp':'ArrowDown';pos[0]+=pos[0]>to[0]?-1:1;}else{key=pos[1]>to[1]?'ArrowLeft':'ArrowRight';pos[1]+=pos[1]>to[1]?-1:1;}await page.keyboard.press(key);await page.waitForTimeout(220);}}
async function solve(word,{mouse=false,wait=2700}={}){
 const path=paths[word];await move(path[0]);
 if(mouse){await page.mouse.move(720,570);await page.mouse.down();}else await page.keyboard.down('Space');
 await move(path[1]);await move(path[0]);for(const tile of path.slice(1))await move(tile);
 assert.equal(await page.locator('.word-selection__word').textContent(),word);
 if(mouse)await page.mouse.up();else await page.keyboard.up('Space');
 await page.waitForTimeout(wait);
}
try {
 await page.goto('http://127.0.0.1:5177/?stage=3');await page.waitForTimeout(1200);assert.equal(await page.locator('.quest-hud__row').count(),4);await shot('initial');
 await solve('SHOP',{wait:300});assert.equal(await page.locator('.word-selection__status').textContent(),"That word isn't needed here yet.");assert.equal(await page.locator('[data-completed="true"]').count(),0);await page.waitForTimeout(2600);
 await solve('CARRY',{wait:300});assert.equal(await page.locator('.word-selection__status').textContent(),"That word isn't needed here yet.");await page.waitForTimeout(2600);
 await page.locator('[data-action="hint"]').click();await page.waitForTimeout(100);assert.equal(await page.locator('.quest-hud__hint').textContent(),'Hint: B _ _ _ _');
 await page.locator('#scan-letter').fill('C');await page.locator('.scan-tool button').click();await shot('scan');await page.waitForTimeout(3100);await page.locator('.scan-tool button').evaluate(button=>button.blur());
 await solve('BREAD',{wait:650});await shot('bread-pop');await page.waitForTimeout(2300);
 await solve('BREAD',{wait:300});assert.equal(await page.locator('.word-selection__status').textContent(),'Already found.');await page.waitForTimeout(2100);
 await solve('COIN',{wait:600});await shot('coin-spin');await page.waitForTimeout(650);await shot('shop-new-quest');await page.waitForTimeout(2700);assert.equal(await page.locator('.quest-hud__row').count(),5);
 await solve('SHOP',{mouse:true,wait:1000});await shot('shop-opening');await page.waitForTimeout(2100);
 await solve('LETTER',{wait:1100});await shot('letter-flight');await page.waitForTimeout(2800);assert.equal(await page.locator('.quest-hud__row').count(),6);await shot('carry-available');
 await solve('CLOCK',{wait:900});await shot('clock-activation');await page.waitForTimeout(2100);await shot('busy-town');
 await solve('CARRY',{wait:100});assert.equal(await page.locator('.stage-complete').count(),0);
 await page.waitForFunction(()=>document.querySelector('.stage-runtime--locked'));
 assert.equal(await page.locator('canvas').evaluate(e=>e.inert),true);assert.equal(await page.locator('.assistance-hud').evaluate(e=>e.inert),true);
 await shot('carry-pickup-walk');
 // Locked input must not restart selection or change the completed quest count.
 await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space');await page.mouse.click(720,570);
 assert.equal(await page.locator('[data-completed="true"]').count(),6);
 await page.waitForTimeout(1800);await shot('carry-with-parcel');await page.waitForTimeout(1700);await shot('carry-arrival');
 await page.waitForTimeout(2500);assert.ok((await page.locator('body').textContent()).includes('STAGE COMPLETE'));await shot('completed');
 for(const stage of [1,2]){await page.goto(`http://127.0.0.1:5177/?stage=${stage}`);await page.waitForTimeout(1000);await shot(`stage-${stage}`);}
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5177/?stage=3');await page.waitForTimeout(1000);assert.equal(await page.locator('.quest-hud__row').count(),4);await shot('narrow');
 assert.deepEqual(errors,[]);console.log('PASS town browser: locks, unlocks, repeat, hints/scan, mouse/Space/backtracking, reactions, carry input lock and completion; Stage 1/2 boot.');
}finally{writeFileSync('artifacts/stage3-reactions/console.json',JSON.stringify({errors,knownResourceErrors},null,2));await browser.close();}

