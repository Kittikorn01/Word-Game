import { chromium } from 'file:///C:/Users/kitti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
await page.goto('http://127.0.0.1:5174/?stage=3');await page.waitForTimeout(500);
const board=['BRACLEC','NEADORO','RAEOCKI','LOHSCAN','LPEACAT','ETRNERR','OTENLOY'];let pos=[6,3];
async function step(r,c){const key=r<pos[0]?'ArrowUp':r>pos[0]?'ArrowDown':c<pos[1]?'ArrowLeft':'ArrowRight';await page.keyboard.press(key);await page.waitForTimeout(210);pos=[r,c];}
async function go(r,c){while(pos[0]!==r)await step(pos[0]+Math.sign(r-pos[0]),pos[1]);while(pos[1]!==c)await step(pos[0],pos[1]+Math.sign(c-pos[1]));}
function path(word){function find(r,c,i,seen){if(r<0||r>6||c<0||c>6||board[r][c]!==word[i]||seen.some(p=>p[0]===r&&p[1]===c))return;const next=[...seen,[r,c]];if(i===word.length-1)return next;for(const [dr,dc]of [[1,0],[-1,0],[0,1],[0,-1]]){const result=find(r+dr,c+dc,i+1,next);if(result)return result;}}for(let r=0;r<7;r++)for(let c=0;c<7;c++){const result=find(r,c,0,[]);if(result)return result;}}
async function submit(word){const p=path(word);await go(...p[0]);await page.keyboard.down('Space');for(const cell of p.slice(1))await step(...cell);await page.keyboard.up('Space');await page.waitForTimeout(180);}
await page.keyboard.press('Space');await page.waitForTimeout(200);await page.screenshot({path:'artifacts/stage3-polish/wrong-live.png'});await page.waitForTimeout(1200);
for(const word of ['BREAD','COIN','SHOP','LETTER','CLOCK','CARRY']){await submit(word);await page.screenshot({path:`artifacts/stage3-polish/live-${word}.png`});await page.waitForTimeout(3700);if(word==='BREAD'){await submit(word);await page.screenshot({path:'artifacts/stage3-polish/already-live.png'});await page.waitForTimeout(2400);}}
await page.waitForTimeout(12000);await page.screenshot({path:'artifacts/stage3-polish/ending-live.png'});
if(!await page.locator('.stage-complete').count())throw Error('CARRY did not complete');
for(const stage of [1,2]){await page.goto(`http://127.0.0.1:5174/?stage=${stage}`);await page.waitForTimeout(500);await page.screenshot({path:`artifacts/stage3-polish/stage-${stage}.png`});}
console.log(JSON.stringify({completed:true,errors}));await browser.close();
