import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:5178/');
for(const number of [3,1,2,3,3]) {
 await page.getByRole('button',{name:new RegExp(`Skip to Stage ${number}:`)}).click();
 await page.waitForURL(`**/?stage=${number}`);
 await page.waitForFunction(n=>document.querySelector('.stage-runtime')?.getAttribute('data-stage-id')?.startsWith(`stage-${n}-`),number);
 assert.equal(await page.locator('.stage-runtime').count(),1);
 assert.equal(await page.locator('.dev-stage-navigation').count(),1);
 await page.waitForTimeout(300);
}
await page.screenshot({path:'artifacts/dev-stage-skip/desktop.png'});
await page.setViewportSize({width:390,height:844});
await page.getByRole('button',{name:/Skip to Stage 1:/}).click();
await page.waitForTimeout(800);
await page.screenshot({path:'artifacts/dev-stage-skip/narrow.png'});
assert.deepEqual(errors,[]);console.log('Stage skips 3 ? 1 ? 2 ? 3 ? 3 passed; one runtime/control panel; no page errors.');
await browser.close();
