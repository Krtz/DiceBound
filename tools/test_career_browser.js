#!/usr/bin/env node
"use strict";

/* Real Edge regression for the Camp Career destination.
 * Uses actual pointer events so the authored Camp hit target and full-screen
 * Career chrome/tabs are player-reachable, not merely callable in JS.
 */
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,".."),RUNTIME=path.join(ROOT,"runtime");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=19415;
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,"http://127.0.0.1").pathname),relative=pathname==="/"?"index.html":pathname.replace(/^\/+/,''),file=path.resolve(RUNTIME,relative);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){response.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});response.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`Timed out waiting for ${url}`);}
async function connect(url){const origin=new URL(url).origin,deadline=Date.now()+15000;let target;while(Date.now()<deadline&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge Career page target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}
async function pointerClick(page,selector){const target=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,top=document.elementFromPoint(x,y);return {x,y,width:r.width,height:r.height,topId:top?.id||'',topClass:top?.className||'',topTag:top?.tagName||''};})()`);if(!target)throw new Error(`Missing Career pointer target ${selector}`);await page.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:target.x,y:target.y});await page.send("Input.dispatchMouseEvent",{type:"mousePressed",x:target.x,y:target.y,button:"left",clickCount:1});await page.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:target.x,y:target.y,button:"left",clickCount:1});await sleep(100);return target;}

async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-career-browser-")),{server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");await page.send("Emulation.setDeviceMetricsOverride",{width:1680,height:1000,deviceScaleFactor:1,mobile:false});
    const deadline=Date.now()+20000;while(Date.now()<deadline){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundCareerUi&&!!window.DiceboundProgression&&!!document.getElementById('campCareerBtn')"))break;await sleep(100);}
    await page.evaluate(`(()=>{const seed={level:42,runs:8,bestTiles:321,board6Clears:2,damageTaken:999,prestige:{count:3},stats:{runsStarted:1,runsFinished:0,fullVictories:0,deaths:1,abandonedRuns:1,rolls:77,tilesTraveled:654,damageDealt:12345,damageTaken:12,healingDone:4321,goldEarned:6789,goldSpent:2345,highestGold:4567,enemiesDefeated:88,bossesDefeated:9,minibossesDefeated:6,powerupsTaken:44,potionsUsed:13,highestRunLevel:27,largestHit:777,criticalStrikes:31,echoStrikes:22,elementalProcs:19,boardClears:{'ranger:normal:b1':1,'ranger:normal:b4':1},classMaxLevel:{ranger:27},classRuns:{ranger:5},enemyDefeats:{demon:4}},career:{nextRunId:2,activeRun:null,history:[{id:'run-000001',sequence:1,classId:'ranger',mode:'normal',outcome:'victory',boardReached:4,level:27,gold:4567,rolls:77,tilesMoved:321,legacyXp:900,petId:'neutral',prestigeCount:3,legacyLevel:42,equipment:[],powerups:[],finalStats:{maxHp:100,hp:100,attack:50,defense:20,crit:.2,dodge:.1,lifeSteal:.05,luck:.1,echo:.5,bossDamage:.2}}]}};window.DiceboundSave.reset();window.DiceboundSave.saveMeta(seed);location.reload();return true;})()`);
    const reloadDeadline=Date.now()+20000;let reloadReady=false;while(Date.now()<reloadDeadline){reloadReady=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundCareerUi&&!!window.DiceboundProgression&&!!window.DiceboundCamp&&document.getElementById('campCareerBtn')?.dataset?.dbCampWired==='1'");if(reloadReady)break;await sleep(100);}if(!reloadReady)throw new Error("Career reload never reached a fully wired Camp surface");
    await page.evaluate(`(()=>{window.__careerErrors=[];window.addEventListener('error',event=>window.__careerErrors.push(String(event.error?.stack||event.message||event.error||'window error')));document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');return true;})()`);
    const artDeadline=Date.now()+5000;let campArt=null;while(Date.now()<artDeadline){campArt=await page.evaluate(`(()=>{const career=document.getElementById('campCareerBtn'),careerFrame=career?.querySelector('.db058-camp-art-frame'),careerImg=careerFrame?.querySelector('img'),trophy=document.getElementById('campAchievementBtn'),trophyFrame=trophy?.querySelector('.db058-camp-art-frame'),trophyImg=trophyFrame?.querySelector('img'),cr=career?.getBoundingClientRect(),cfr=careerFrame?.getBoundingClientRect(),tr=trophy?.getBoundingClientRect(),tfr=trophyFrame?.getBoundingClientRect(),count=window.DiceboundProgression?.achievementCount?.()||0,tier=window.DiceboundAchievements?.campTrophyTierForCount?.(count)||null;return {count,tier:tier?.id||null,career:{target:career?.dataset.db064HitTarget||'',src:careerImg?.getAttribute('src')||'',aria:career?.getAttribute('aria-label')||'',w:cr?.width||0,h:cr?.height||0,fw:cfr?.width||0,fh:cfr?.height||0},trophy:{present:!!trophy,target:trophy?.dataset.db064HitTarget||'',src:trophyImg?.getAttribute('src')||'',aria:trophy?.getAttribute('aria-label')||'',tier:trophy?.dataset.achievementTier||'',w:tr?.width||0,h:tr?.height||0,fw:tfr?.width||0,fh:tfr?.height||0}};})()`);if(campArt?.career?.target==='painted-object'&&(!campArt.trophy.present||campArt.trophy.target==='painted-object'))break;await sleep(100);}
    if(!campArt?.career?.src.endsWith('/assets/camp/interactions/career-tent.png')||campArt.career.aria!=='Career'||Math.abs(campArt.career.w-campArt.career.fw)>3||Math.abs(campArt.career.h-campArt.career.fh)>3)throw new Error(`Career tent art/hitbox regression: ${JSON.stringify(campArt)}`);
    if(campArt.count<2||!campArt.trophy.present||campArt.tier!=='tier-1'||campArt.trophy.tier!=='tier-1'||!campArt.trophy.src.endsWith('/assets/camp/interactions/achievements/tier-1.png')||campArt.trophy.aria!=='Achievements'||Math.abs(campArt.trophy.w-campArt.trophy.fw)>3||Math.abs(campArt.trophy.h-campArt.trophy.fh)>3)throw new Error(`Achievement tier art/hitbox regression: ${JSON.stringify(campArt)}`);

    const hit=await pointerClick(page,"#campCareerBtn");
    const opened=await page.evaluate(`(()=>{const overlay=document.getElementById('careerOverlay');return {open:!!overlay&&!overlay.classList.contains('hidden'),inspect:window.DiceboundCareerUi?.inspect?.(),infoStats:!!document.querySelector('#infoOverlay [data-info-tab="stats"]'),semanticDismiss:!!overlay?.querySelector('[data-career-done][data-app-dismiss]')};})()`);
    if(!opened.open)throw new Error(`Career pointer click did not open destination; hit=${JSON.stringify(hit)} state=${JSON.stringify(opened)}`);
    if(opened.infoStats)throw new Error("Lifetime Career Stats still exist as a duplicate Info tab");
    if(!opened.semanticDismiss)throw new Error("Career Done is missing the shared Escape dismissal semantic");
    if(!opened.inspect?.open||opened.inspect?.activeTab!=="overview")throw new Error(`Career owner did not retain the visible Overview surface: ${JSON.stringify(opened)}`);

    const overview=await page.evaluate(`(()=>{const panel=document.querySelector('[data-career-panel="overview"]'),style=panel?getComputedStyle(panel):null,rect=panel?.getBoundingClientRect();return {cards:document.querySelectorAll('#careerOverlay .career-card').length,text:panel?.textContent||'',clearSection:document.querySelector('#careerOverlay .career-clear-grid')?.textContent||'',display:style?.display||null,visibility:style?.visibility||null,width:rect?.width||0,height:rect?.height||0};})()`);
    if(overview.cards<20)throw new Error(`Career Overview did not render lifetime cards: ${JSON.stringify(overview)}`);
    if(overview.display==='none'||overview.visibility==='hidden'||overview.width<=0||overview.height<=0)throw new Error(`Career Overview rendered DOM but is not visibly presented: ${JSON.stringify(overview)}`);
    for(const expected of ['42','Prestige','3','Completed runs','8','321 tiles','12,345','4,321','999'])if(!overview.text.includes(expected))throw new Error(`Career Overview lost persisted value ${expected}: ${JSON.stringify(overview)}`);
    if(!overview.clearSection.includes('Ranger')||!overview.clearSection.includes('Normal: 4'))throw new Error(`Career class clear ledger did not render seeded authoritative fact: ${JSON.stringify(overview)}`);

    await pointerClick(page,'#careerOverlay [data-career-tab="enemies"]');
    const enemies=await page.evaluate(`(()=>{const panel=document.querySelector('[data-career-panel="enemies"]'),style=panel?getComputedStyle(panel):null,rect=panel?.getBoundingClientRect(),overview=document.querySelector('[data-career-panel="overview"]');return {tab:window.DiceboundCareerUi?.inspect?.().activeTab,text:panel?.textContent||'',display:style?.display||null,width:rect?.width||0,height:rect?.height||0,overviewDisplay:overview?getComputedStyle(overview).display:null};})()`);
    if(enemies.tab!=="enemies"||!enemies.text||enemies.display==='none'||enemies.width<=0||enemies.height<=0||enemies.overviewDisplay!=='none')throw new Error(`Enemy Ledger tab is not exclusively visible: ${JSON.stringify(enemies)}`);

    await pointerClick(page,'#careerOverlay [data-career-tab="runs"]');
    const runs=await page.evaluate(`(()=>{const panel=document.querySelector('[data-career-panel="runs"]'),style=panel?getComputedStyle(panel):null,rect=panel?.getBoundingClientRect(),enemy=document.querySelector('[data-career-panel="enemies"]');return {tab:window.DiceboundCareerUi?.inspect?.().activeTab,text:panel?.textContent||'',display:style?.display||null,width:rect?.width||0,height:rect?.height||0,enemyDisplay:enemy?getComputedStyle(enemy).display:null};})()`);
    if(runs.tab!=="runs"||!runs.text.includes("Ranger")||!runs.text.includes("Victory")||!runs.text.includes("Board 4")||runs.display==='none'||runs.width<=0||runs.height<=0||runs.enemyDisplay!=='none')throw new Error(`Persisted Career Run History is not exclusively visible: ${JSON.stringify(runs)}`);

    await pointerClick(page,"#careerOverlay [data-career-done]");
    if(!(await page.evaluate("document.getElementById('careerOverlay')?.classList.contains('hidden')")))throw new Error("Career Done pointer did not close destination");

    // Reproduce the real 0.6.7.18 failure shape: owned chrome survives but
    // the owned tabs/panels are missing. The owner marker must never prevent
    // the Career UI from reconstructing its complete surface on the next open.
    const damaged=await page.evaluate(`(()=>{const overlay=document.getElementById('careerOverlay'),body=overlay?.querySelector('.career-body');if(!overlay||!body)return false;body.remove();return overlay.dataset.careerOwner==='ui/career'&&!!overlay.querySelector('.career-chrome')&&!overlay.querySelector('.career-body');})()`);
    if(!damaged)throw new Error("Career damaged-surface regression fixture could not be created");
    await pointerClick(page,"#campCareerBtn");
    const repaired=await page.evaluate(`(()=>{const overlay=document.getElementById('careerOverlay'),tabs=[...overlay.querySelectorAll('[data-career-tab]')].map(node=>node.dataset.careerTab),panels=[...overlay.querySelectorAll('[data-career-panel]')].map(node=>node.dataset.careerPanel),text=overlay.querySelector('[data-career-panel="overview"]')?.textContent||'';return {open:!overlay.classList.contains('hidden'),owner:overlay.dataset.careerOwner,tabs,panels,cards:overlay.querySelectorAll('.career-card').length,text};})()`);
    if(!repaired.open||repaired.owner!=="ui/career"||repaired.tabs.length!==3||repaired.panels.length!==3||repaired.cards<20||!repaired.text.includes("12,345"))throw new Error(`Career owner did not self-repair a damaged owned surface: ${JSON.stringify(repaired)}`);
    await pointerClick(page,"#careerOverlay [data-career-done]");

    const errors=await page.evaluate("window.__careerErrors||[]");if(errors.length)throw new Error(`Career destination raised runtime errors: ${JSON.stringify(errors)}`);
    console.log("Career Edge PASS: Career tent + Achievement tier hitboxes, persisted values and damaged-surface repair are player-visible through Camp");
  }finally{
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

