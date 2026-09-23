#!/usr/bin/env node
"use strict";

/* Real Edge regression for the in-run Character Stats/Gear panel. */
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,".."),RUNTIME=path.join(ROOT,"runtime");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=19424;
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,"http://127.0.0.1").pathname),relative=pathname==="/"?"index.html":pathname.replace(/^\/+/,''),file=path.resolve(RUNTIME,relative);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){response.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});response.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`Timed out waiting for ${url}`);}
async function connect(url){const origin=new URL(url).origin,deadline=Date.now()+15000;let target;while(Date.now()<deadline&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge Character page target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}
async function pointerClick(page,selector){const target=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height};})()`);if(!target)throw new Error(`Missing Character pointer target ${selector}`);await page.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:target.x,y:target.y});await page.send("Input.dispatchMouseEvent",{type:"mousePressed",x:target.x,y:target.y,button:"left",clickCount:1});await page.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:target.x,y:target.y,button:"left",clickCount:1});await sleep(100);}

async function snapshot(page){return page.evaluate(`(()=>{const card=document.getElementById('characterCard'),stats=document.getElementById('characterStatsPanel'),gear=document.getElementById('characterGearPanel'),grid=document.getElementById('equipmentGrid'),board=document.getElementById('boardWrap'),controls=document.querySelector('.road-controls'),panel=document.querySelector('.game-panel'),pet=document.querySelector('.sidebar>.pet-card'),log=document.querySelector('.sidebar>.log-card'),roll=document.getElementById('rollBtn'),rect=card?.getBoundingClientRect(),gridRect=grid?.getBoundingClientRect(),boardRect=board?.getBoundingClientRect(),controlsRect=controls?.getBoundingClientRect(),panelRect=panel?.getBoundingClientRect(),petRect=pet?.getBoundingClientRect(),logRect=log?.getBoundingClientRect(),rollRect=roll?.getBoundingClientRect();return {card:{width:rect?.width||0,height:rect?.height||0,left:rect?.left||0,right:rect?.right||0,top:rect?.top||0,bottom:rect?.bottom||0},statsHidden:!!stats?.hidden,gearHidden:!!gear?.hidden,gearDisplay:gear?getComputedStyle(gear).display:null,grid:{width:gridRect?.width||0,height:gridRect?.height||0},slots:grid?.querySelectorAll('.character-gear-slot').length||0,activeTab:document.querySelector('#characterTabs [data-character-tab].active')?.dataset.characterTab||null,duplicateEquipmentCards:document.querySelectorAll('.equipment-card').length,playFlow:document.body.dataset.playFlow||'',travelDensity:document.body.dataset.travelDensity||'',hudFlow:document.body.dataset.hudFlow||'',sidebarFlow:document.body.dataset.sidebarFlow||'',roll:{text:roll?.textContent?.trim()||'',width:rollRect?.width||0,height:rollRect?.height||0},board:{left:boardRect?.left||0,right:boardRect?.right||0,top:boardRect?.top||0,bottom:boardRect?.bottom||0,width:boardRect?.width||0,height:boardRect?.height||0},controls:{left:controlsRect?.left||0,right:controlsRect?.right||0,top:controlsRect?.top||0,bottom:controlsRect?.bottom||0,width:controlsRect?.width||0,height:controlsRect?.height||0},panel:{left:panelRect?.left||0,right:panelRect?.right||0,top:panelRect?.top||0,bottom:panelRect?.bottom||0,width:panelRect?.width||0,height:panelRect?.height||0},pet:{left:petRect?.left||0,right:petRect?.right||0,top:petRect?.top||0,bottom:petRect?.bottom||0,width:petRect?.width||0,height:petRect?.height||0},log:{left:logRect?.left||0,right:logRect?.right||0,top:logRect?.top||0,bottom:logRect?.bottom||0,width:logRect?.width||0,height:logRect?.height||0}};})()`);}

async function main(){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-character-browser-")),{server,url}=await serveRuntime();let child,page;
 try{
   child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
   page=await connect(url);await page.send("Runtime.enable");
   const sizes=[[1680,1000],[1100,720],[1200,620]];
   for(const [width,height] of sizes){
     await page.send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});
     const deadline=Date.now()+20000;let ready=false;while(Date.now()<deadline){ready=await page.evaluate("document.readyState==='complete'&&!document.documentElement.classList.contains('db-booting')&&!!window.DiceboundEquipmentHeirlooms&&document.querySelectorAll('#equipmentGrid .character-gear-slot').length===8");if(ready)break;await sleep(100);}if(!ready)throw new Error(`Character UI never became ready at ${width}x${height}`);
     await page.evaluate("document.getElementById('startOverlay')?.classList.add('hidden')");
     let state=await snapshot(page);
     if(state.activeTab!=="stats"||state.statsHidden||!state.gearHidden)throw new Error(`Stats tab default state failed at ${width}x${height}: ${JSON.stringify(state)}`);
     if(state.duplicateEquipmentCards!==0)throw new Error("Standalone Equipment card returned");
     await pointerClick(page,'#characterTabs [data-character-tab="gear"]');
     state=await snapshot(page);
     if(state.activeTab!=="gear"||!state.statsHidden||state.gearHidden||state.gearDisplay==="none"||state.grid.width<=0||state.grid.height<=0||state.slots!==8)throw new Error(`Gear tab unusable at ${width}x${height}: ${JSON.stringify(state)}`);
     if(state.card.right>width+1||state.card.left<-1)throw new Error(`Character card escaped viewport at ${width}x${height}: ${JSON.stringify(state)}`);
     if(width===1680&&height===1000&&state.grid.height<220)throw new Error(`Normal desktop Character Gear lost the spatial paper doll at ${width}x${height}: ${JSON.stringify(state)}`);
     if(height<780&&state.grid.height>=190)throw new Error(`Short-landscape Character Gear compact fallback is too tall at ${width}x${height}: ${JSON.stringify(state)}`);
     await pointerClick(page,'#characterTabs [data-character-tab="stats"]');
   }
   await page.send("Emulation.setDeviceMetricsOverride",{width:1715,height:886,deviceScaleFactor:1,mobile:false});await sleep(180);
   const widePlay=await snapshot(page);
   if(widePlay.playFlow||widePlay.travelDensity)throw new Error(`Retired side-Travel state leaked into live DOM: ${JSON.stringify(widePlay)}`);
   if(Math.abs(widePlay.board.width-widePlay.board.height)>2)throw new Error(`Roomy desktop Board stopped being square: ${JSON.stringify(widePlay)}`);
   if(widePlay.controls.top<widePlay.board.bottom-2)throw new Error(`Road controls must stay below the Board: ${JSON.stringify(widePlay)}`);
   if(widePlay.roll.text!=="Roll the dice")throw new Error(`Road control lost the canonical Roll label: ${JSON.stringify(widePlay)}`);
   if(widePlay.hudFlow==="expanded"){
     if(widePlay.sidebarFlow!=="masonry")throw new Error(`Wide HUD did not preserve measured masonry packing: ${JSON.stringify(widePlay)}`);
     if(Math.abs(widePlay.pet.top-widePlay.card.top)>3)throw new Error(`Companion did not pack beside Character at the top: ${JSON.stringify(widePlay)}`);
     if(widePlay.log.top<widePlay.pet.bottom-2||Math.abs(widePlay.log.left-widePlay.pet.left)>3||Math.abs(widePlay.log.width-widePlay.pet.width)>4)throw new Error(`Adventure Log did not pack directly below Companion: ${JSON.stringify(widePlay)}`);
   }
   await page.send("Emulation.setDeviceMetricsOverride",{width:2100,height:1000,deviceScaleFactor:1,mobile:false});await sleep(180);
   const widerPlay=await snapshot(page);
   if(widerPlay.controls.top<widerPlay.board.bottom-2||widerPlay.roll.text!=="Roll the dice")throw new Error(`Very-wide desktop must still keep Road controls below the Board: ${JSON.stringify(widerPlay)}`);
   await page.send("Emulation.setDeviceMetricsOverride",{width:1200,height:620,deviceScaleFactor:1,mobile:false});await sleep(180);
   const shortPlay=await snapshot(page);
   if(shortPlay.controls.top<shortPlay.board.bottom-2||shortPlay.roll.text!=="Roll the dice")throw new Error(`Short-wide desktop must keep Road controls below the Board: ${JSON.stringify(shortPlay)}`);
   await page.send("Emulation.setDeviceMetricsOverride",{width:1680,height:1000,deviceScaleFactor:1,mobile:false});await sleep(180);
   await pointerClick(page,'#characterTabs [data-character-tab="gear"]');
   const tooltipProbe=await page.evaluate(`(()=>{const item={id:'character-tooltip-probe',slot:'amulet',name:'Equipment',equipmentId:'hawkeye-charm',icon:'◇',rarity:'common',bonuses:{attack:3}};window.DiceboundItems.equip(item,true);window.DiceboundEquipmentHeirlooms.renderEquipment();const slot=document.querySelector('#equipmentGrid .slot-amulet');slot?.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));const pop=document.getElementById('dbEquipmentDetailPopover'),rootTip=document.getElementById('appTooltipLayer'),art=pop?.querySelector('.db-equipment-detail-art');return {modernTip:slot?.dataset.tip||'',slotKey:slot?.dataset.equipmentSlot||'',aria:slot?.getAttribute('aria-label')||'',visible:!!pop&&!pop.classList.contains('hidden'),name:pop?.querySelector('.db-equipment-detail-name')?.textContent||'',meta:pop?.querySelector('.db-equipment-detail-meta')?.textContent||'',stats:pop?.querySelector('.db-equipment-detail-stats')?.textContent||'',artSrc:art?.getAttribute('src')||'',rootHidden:rootTip?.classList.contains('hidden')??true};})()`);
   if(!tooltipProbe.visible||tooltipProbe.modernTip||tooltipProbe.slotKey!=="amulet"||tooltipProbe.name!=="Hawkeye Charm"||tooltipProbe.meta!=="COMMON · AMULET"||!tooltipProbe.stats.includes("+3 Attack")||!tooltipProbe.stats.includes("INTRINSIC (Hawkeye Charm)")||!tooltipProbe.stats.includes("Crit")||!tooltipProbe.stats.includes("Dodge")||tooltipProbe.stats.includes("No bonuses")||!tooltipProbe.artSrc.endsWith("/equipment/amulet/hawkeye-charm.png")||!tooltipProbe.aria.startsWith("Hawkeye Charm\nCOMMON · AMULET\n")||!tooltipProbe.rootHidden)throw new Error(`Character rich Gear detail lost semantic identity/stats/art: ${JSON.stringify(tooltipProbe)}`);
   await page.send("Emulation.setDeviceMetricsOverride",{width:1040,height:640,deviceScaleFactor:1,mobile:false});await sleep(120);
   const resized=await snapshot(page);
   if(resized.activeTab!=="gear"||resized.gearHidden||resized.grid.width<=0||resized.slots!==8)throw new Error(`Live resize lost Gear state: ${JSON.stringify(resized)}`);
   await page.evaluate("window.DiceboundOptionsUi.open()");
   await pointerClick(page,'#optionsCharacterLayoutBtn');
   await page.evaluate("window.DiceboundOptionsUi.close()");
   const classic=await page.evaluate(`(()=>{const card=document.getElementById('characterCard'),stats=document.getElementById('characterStatsPanel'),gear=document.getElementById('characterGearPanel'),grid=document.getElementById('equipmentGrid');return {layout:card?.dataset.characterLayout,bodyLayout:document.body.dataset.characterLayout,statsHidden:!!stats?.hidden,gearHidden:!!gear?.hidden,tabsDisplay:getComputedStyle(document.querySelector('.character-card-head')).display,paperSlots:grid?.querySelectorAll('.character-gear-slot').length||0,namedSlots:grid?.querySelectorAll('.slot-label').length||0};})()`);
   if(classic.layout!=="classic"||classic.bodyLayout!=="classic"||classic.statsHidden||classic.gearHidden||classic.tabsDisplay!=="none"||classic.paperSlots!==0||classic.namedSlots!==8)throw new Error(`Options Classic layout failed: ${JSON.stringify(classic)}`);
   await page.evaluate("window.DiceboundOptionsUi.open()");
   await pointerClick(page,'#optionsCharacterLayoutBtn');
   await page.evaluate("window.DiceboundOptionsUi.close()");
   const modernAgain=await page.evaluate(`(()=>{const card=document.getElementById('characterCard'),grid=document.getElementById('equipmentGrid');return {layout:card?.dataset.characterLayout,bodyLayout:document.body.dataset.characterLayout,paperSlots:grid?.querySelectorAll('.character-gear-slot').length||0};})()`);
   if(modernAgain.layout!=="modern"||modernAgain.bodyLayout!=="modern"||modernAgain.paperSlots!==8)throw new Error(`Options Modern restore failed: ${JSON.stringify(modernAgain)}`);
   console.log("Character Edge PASS: rich semantic Gear popover, intrinsic stats, measured HUD packing, Road controls below Board, live resize and Classic fallback");
 }finally{
   try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
