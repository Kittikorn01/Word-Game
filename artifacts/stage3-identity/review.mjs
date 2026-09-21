import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page = await browser.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push({text:m.text(),location:m.location()});});
await page.setViewportSize({width:1440,height:900});
for(const stage of [1,2,3]) {
 await page.goto(`http://127.0.0.1:5175/?stage=${stage}`);await page.waitForTimeout(1500);
 await page.screenshot({path:`artifacts/stage3-identity/stage-${stage}-desktop.png`});
}
await page.keyboard.down('Space');await page.keyboard.press('ArrowRight');await page.waitForTimeout(250);await page.keyboard.press('ArrowUp');await page.waitForTimeout(250);
await page.screenshot({path:'artifacts/stage3-identity/selection.png'});await page.keyboard.up('Space');
await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5175/?stage=3');await page.waitForTimeout(1500);await page.screenshot({path:'artifacts/stage3-identity/stage-3-narrow.png'});
writeFileSync('artifacts/stage3-identity/console.json',JSON.stringify(errors,null,2));console.log(errors);
await browser.close();


