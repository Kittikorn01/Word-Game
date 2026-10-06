import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push({text:m.text(),location:m.location()});});
for(const n of [1,2,3,4,5]){await page.goto(`http://127.0.0.1:5174/?stage=${n}`);await page.waitForTimeout(700);await page.screenshot({path:`artifacts/stage5/stage-${n}.png`});}
await page.evaluate(async()=>{const {createStageTransition}=await import('/src/ui/StageTransition.ts');const {stage5}=await import('/src/stages/stage5.ts');const transition=createStageTransition(document.querySelector('#app'));window.introCheck=transition;void transition.showIntro(stage5);});await page.waitForTimeout(300);await page.screenshot({path:'artifacts/stage5/intro.png'});await page.evaluate(()=>window.introCheck.dispose());await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'artifacts/stage5/narrow.png'});
writeFileSync('artifacts/stage5/console.json',JSON.stringify(errors,null,2));console.log(errors);await browser.close();


