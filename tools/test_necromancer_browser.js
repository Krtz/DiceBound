#!/usr/bin/env node
"use strict";

/* Real Edge regression for Beta 0.6.9.0 allied combat.
 * Proves the live Combat View can present hero + two authored summons against
 * a three-enemy pack while the composable action registry contributes a real
 * extra button. This is geometry/presentation proof, not a DOM-only mock.
 */
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,".."),RUNTIME=path.join(ROOT,"runtime");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=19419;
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,"http://127.0.0.1").pathname),relative=pathname==="/"?"index.html":pathname.replace(/^\/+/,''),file=path.resolve(RUNTIME,relative);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){response.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});response.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`Timed out waiting for ${url}`);}
async function connect(url){const origin=new URL(url).origin,deadline=Date.now()+15000;let target;while(Date.now()<deadline&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge Necromancer page target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}
async function pointerClick(page,selector){const target=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};})()`);if(!target)throw new Error(`Missing pointer target ${selector}`);await page.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:target.x,y:target.y});await page.send("Input.dispatchMouseEvent",{type:"mousePressed",x:target.x,y:target.y,button:"left",clickCount:1});await page.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:target.x,y:target.y,button:"left",clickCount:1});await sleep(80);return target;}

function validateGeometry(view,label){
  if(!view||view.overlay.hidden||view.overlay.w<500||view.overlay.h<300)throw new Error(`${label}: combat overlay is not visibly presented: ${JSON.stringify(view?.overlay)}`);
  if(view.allies.length!==2)throw new Error(`${label}: expected exactly two living allied summons: ${JSON.stringify(view.allies)}`);
  if(view.enemies.length!==3)throw new Error(`${label}: expected exactly three visible enemies: ${JSON.stringify(view.enemies)}`);
  if(view.dynamic.length!==1)throw new Error(`${label}: dynamic action duplicated or disappeared: ${JSON.stringify(view.dynamic)}`);
  if(!view.dynamic[0].text.includes("Summon Mage Skeleton")||!view.dynamic[0].text.includes("55 mana"))throw new Error(`${label}: dynamic action lost semantic label/cost: ${JSON.stringify(view.dynamic[0])}`);
  if(!view.fixed.attack.includes("Grave Coil")||!view.fixed.special.includes("Summon Skeleton")||!view.fixed.ultimate.includes("Army of the Dead")||!view.fixed.ultimate.includes("/5"))throw new Error(`${label}: Necromancer fixed actions are not authoritative: ${JSON.stringify(view.fixed)}`);
  for(const ally of view.allies){
    if(ally.w<45||ally.h<80||ally.spriteW<40||ally.spriteH<55||ally.hpW<30||ally.hpH<4)throw new Error(`${label}: allied unit/HP anchor is too small or collapsed: ${JSON.stringify(ally)}`);
    if(!ally.src.endsWith("assets/necromancer/summon-skeleton-warrior.png"))throw new Error(`${label}: ally is not using authored player-side Skeleton art: ${JSON.stringify(ally)}`);
    if(!ally.name.includes("Skeleton"))throw new Error(`${label}: allied semantic name is not visible: ${JSON.stringify(ally)}`);
  }
  for(const enemy of view.enemies)if(enemy.w<30||enemy.h<45)throw new Error(`${label}: enemy stage collapsed: ${JSON.stringify(enemy)}`);
  const uniqueAllyCenters=new Set(view.allies.map(x=>Math.round(x.cx/5)*5));
  const uniqueEnemyCenters=new Set(view.enemies.map(x=>Math.round(x.cx/5)*5));
  if(uniqueAllyCenters.size!==2||uniqueEnemyCenters.size!==3)throw new Error(`${label}: combatants overlap onto indistinguishable anchors: ${JSON.stringify({allies:view.allies,enemies:view.enemies})}`);
  if(view.crossSideOverlap>1)throw new Error(`${label}: player-side summon art overlaps enemy combatants: ${view.crossSideOverlap}px²`);
  if(view.actionOverlap>1)throw new Error(`${label}: combat action buttons overlap: ${view.actionOverlap}px²`);
}

async function inspect(page){
  return page.evaluate(`(()=>{const rect=el=>{if(!el)return {x:0,y:0,w:0,h:0,r:0,b:0,cx:0,cy:0};const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,r:r.right,b:r.bottom,cx:r.left+r.width/2,cy:r.top+r.height/2};};const overlap=(a,b)=>Math.max(0,Math.min(a.r,b.r)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.b,b.b)-Math.max(a.y,b.y));const overlay=document.getElementById('combatOverlay'),ov=rect(overlay);const hero=rect(document.getElementById('combatPlayerIcon'));const allies=[...document.querySelectorAll('#alliedParty .stage-ally')].map(el=>{const r=rect(el),sprite=rect(el.querySelector('.stage-ally-sprite')),hp=rect(el.querySelector('.stage-ally-hp')),img=el.querySelector('.stage-ally-sprite img');return {...r,spriteW:sprite.w,spriteH:sprite.h,hpW:hp.w,hpH:hp.h,name:el.querySelector('.stage-ally-name')?.textContent||'',src:img?.getAttribute('src')||''};});const enemies=[...document.querySelectorAll('#enemyIcon .stage-enemy')].map(el=>rect(el));const dynamic=[...document.querySelectorAll('[data-dynamic-combat-action="1"]')].map(el=>({...rect(el),id:el.dataset.combatActionId||'',text:el.textContent||'',disabled:!!el.disabled}));const actionEls=[...document.querySelectorAll('#combatOverlay .combat-actions button')].filter(el=>getComputedStyle(el).display!=='none'&&!el.hidden),actionRects=actionEls.map(rect);let actionOverlap=0;for(let i=0;i<actionRects.length;i++)for(let j=i+1;j<actionRects.length;j++)actionOverlap+=overlap(actionRects[i],actionRects[j]);let crossSideOverlap=0;for(const ally of allies)for(const enemy of enemies)crossSideOverlap+=overlap(ally,enemy);return {overlay:{...ov,hidden:overlay?.classList.contains('hidden')!==false},hero,allies,enemies,dynamic,fixed:{attack:document.getElementById('attackBtn')?.textContent||'',special:document.getElementById('specialAttackBtn')?.textContent||'',ultimate:document.getElementById('ultimateBtn')?.textContent||''},actionOverlap,crossSideOverlap,errors:window.__necroErrors||[]};})()`);
}

async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-necromancer-browser-")),{server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");await page.send("Emulation.setDeviceMetricsOverride",{width:1680,height:1000,deviceScaleFactor:1,mobile:false});
    const deadline=Date.now()+20000;let ready=false;while(Date.now()<deadline){ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundCombatOracleTest&&!!window.DiceboundCombatPresentation&&!!document.getElementById('combatOverlay')");if(ready)break;await sleep(100);}if(!ready)throw new Error("Necromancer browser test never reached a wired Combat runtime");

    const setup=await page.evaluate(`(()=>{window.__necroErrors=[];window.addEventListener('error',event=>window.__necroErrors.push(String(event.error?.stack||event.message||event.error||'window error')));const api=window.DiceboundCombatOracleTest;api.setup({classId:'necromancer',player:{mana:100,maxMana:110,maxActiveAllies:2},enemies:[{id:'edge-a',name:'Edge Target A',hp:999,maxHp:999,attack:1,defense:0},{id:'edge-b',name:'Edge Target B',hp:999,maxHp:999,attack:1,defense:0},{id:'edge-c',name:'Edge Target C',hp:999,maxHp:999,attack:1,defense:0}]});const base={archetypeId:'skeleton-warrior',ownerClassId:'necromancer',controlMode:'automatic',persistence:'encounter',actsOnSummonTurn:true,targetable:true,healable:true,threatWeight:1,countsAsSummon:true,maxHp:20,hp:20,attack:6,defense:2,crit:.05,dodge:.02,artId:'skeleton-warrior'};api.spawnAlly({...base,instanceId:'edge-skel-1',name:'Skeleton Warrior I'});api.spawnAlly({...base,instanceId:'edge-skel-2',name:'Skeleton Warrior II'});api.registerActionProvider({id:'edge-necromancer-extra',priority:30,getActions:()=>[{id:'summon-mage-skeleton',label:'Summon Mage Skeleton',icon:'🪄',description:'Edge dynamic action geometry probe',category:'class',order:31,targetPolicy:'none',enabled:()=>true,cost:()=>({resource:'mana',amount:55}),execute:()=>({ok:true})}]});api.refresh();api.refresh();api.refresh();return {allies:api.allies().length,actionIds:api.actionView().map(x=>x.id)};})()`);
    if(setup.allies!==2||!setup.actionIds.includes("summon-mage-skeleton"))throw new Error(`Necromancer browser fixture failed: ${JSON.stringify(setup)}`);
    await sleep(250);

    let view=await inspect(page);validateGeometry(view,"desktop 1680x1000");
    if(view.errors.length)throw new Error(`Desktop Necromancer presentation raised runtime errors: ${JSON.stringify(view.errors)}`);

    const floating=await page.evaluate(`(()=>{const api=window.DiceboundCombatOracleTest;api.damageAlly('edge-skel-1',4,{ignoreDefense:true,source:'edge-float'});api.healAlly('edge-skel-2',3,{source:'edge-float'});return api.floatingEntries();})()`);
    const floatingFacts=floating.map(entry=>[entry.kind,entry.target,entry.amount]);
    if(!floatingFacts.some(entry=>entry[0]==='damage'&&entry[1]==='ally:edge-skel-1'&&entry[2]>0)||!floatingFacts.some(entry=>entry[0]==='heal'&&entry[1]==='ally:edge-skel-2'&&entry[2]===3))throw new Error(`Allied floating combat numbers lost exact summon anchors: ${JSON.stringify(floating)}`);

    await pointerClick(page,'[data-dynamic-combat-action="1"][data-combat-action-id="summon-mage-skeleton"]');
    await sleep(100);
    view=await inspect(page);
    if(view.dynamic.length!==1)throw new Error(`Dynamic action duplicated after real click/refresh: ${JSON.stringify(view.dynamic)}`);

    await page.send("Emulation.setDeviceMetricsOverride",{width:1100,height:650,deviceScaleFactor:1,mobile:false});
    await page.evaluate("window.DiceboundResponsive?.schedule?.();window.DiceboundCombatOracleTest.refresh();true");
    await sleep(300);
    view=await inspect(page);validateGeometry(view,"short-wide 1100x650");
    if(view.errors.length)throw new Error(`Short-wide Necromancer presentation raised runtime errors: ${JSON.stringify(view.errors)}`);

    console.log("Necromancer Edge PASS: real 3v3 allied geometry, authored Skeleton anchors and composable combat actions remain readable on desktop + short-wide");
  }finally{
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
