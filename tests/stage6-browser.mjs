// Optional real-input QA: set PLAYWRIGHT_MODULE to an installed Playwright module URL.
// Screenshots are returned in memory only; no artifact files are written.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox'],timeout:15000});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const images=[];
try {
 await page.goto('http://127.0.0.1:5173/?stage=6');await page.waitForTimeout(4500);
 let row=6,col=3;
 const move=async(r,c)=>{while(row!==r||col!==c){const key=row>r?'ArrowUp':row<r?'ArrowDown':col>c?'ArrowLeft':'ArrowRight';await page.keyboard.press(key);await page.waitForTimeout(210);if(row!==r)row+=row<r?1:-1;else col+=col<c?1:-1;}};
 const paths={STONE:[[0,0],[0,1],[1,1],[2,1],[2,2]],ABOVE:[[0,4],[0,5],[0,6],[1,6],[2,6]],UNDER:[[3,6],[3,5],[4,5],[4,4],[3,4]],SECRET:[[6,0],[5,0],[5,1],[4,1],[4,2],[3,2]],READ:[[1,3],[1,4],[2,4],[2,3]],EXIT:[[6,6],[6,5],[5,5],[5,4]]};
 for(const [word,path] of Object.entries(paths)){
   await move(...path[0]);await page.keyboard.down('Space');for(const point of path.slice(1))await move(...point);await page.keyboard.up('Space');
   if(word==='READ'){
     await page.locator('.archive-reading:not([hidden])').waitFor({timeout:10000});assert.equal(await page.locator('#archive-message').textContent(),'You did not just find words. You gave them meaning.');
     await page.locator('.archive-reading').evaluate(e=>{e.tabIndex=-1;e.focus();});await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');await page.waitForTimeout(6000);assert.equal(await page.locator('.archive-reading').isVisible(),true);
     images.push((await page.screenshot({type:'jpeg',quality:45})).toString('base64'));
     await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForTimeout(800);
   }else if(word==='EXIT'){
     assert.equal(await page.locator('.archive-complete').count(),0);await page.waitForTimeout(4000);assert.equal(await page.locator('.archive-complete').count(),0);
     await page.locator('.archive-complete').waitFor({timeout:15000});
   }else await page.waitForTimeout(4300);
 }
 assert.equal(await page.locator('.archive-recap section').count(),6);
 assert.match(await page.locator('.archive-summary').textContent(),/6 \/ 6 Stages Completed.*36 \/ 36 Words Discovered/);
 images.push((await page.screenshot({type:'jpeg',quality:45})).toString('base64'));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const box=await page.locator('.archive-journal').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=844);
 await page.locator('.archive-recap').focus();await page.keyboard.press('End');await page.waitForTimeout(300);
 assert.ok(await page.locator('.archive-recap').evaluate(e=>e.scrollTop>0));
 images.push((await page.screenshot({type:'jpeg',quality:55})).toString('base64'));
 await page.reload();await page.waitForTimeout(4500);assert.equal(await page.locator('.archive-complete').count(),0);assert.equal(await page.locator('.archive-reading').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'Real keyboard path through all six words, reading wait, Continue, door/walk timing, final summary, mobile scroll, reload reset and browser errors passed.',images:process.env.QA_IMAGES?images:undefined}));
} finally {await browser.close();}
