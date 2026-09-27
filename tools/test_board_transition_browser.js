#!/usr/bin/env node
"use strict";

/* Real Edge regression for Beta 0.6.9.1 Board transitions.
 * Proves a live Nightmare Board advance preserves equipped Luck/Lifesteal in
 * player state and the real HUD after Board regeneration/repaint.
 */
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,".."),RUNTIME=path.join(ROOT,"runtime");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=19423;
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,"http://127.0.0.1").pathname),relative=pathname==="/"?"index.html":pathname.replace(/^\/+/,''),file=path.resolve(RUNTIME,relative);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){response.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});response.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`Timed out waiting for ${url}`);}
async function connect(url){const origin=new URL(url).origin,deadline=Date.now()+15000;let target;while(Date.now()<deadline&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge Board-transition page target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}

async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-board-transition-edge-")),{server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const deadline=Date.now()+20000;let ready=false;
    while(Date.now()<deadline){
      ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundCombatOracleTest&&!!window.DiceboundItemsOracleTest&&!!window.DiceboundRun&&!!window.DiceboundRunResumeTest&&!!document.getElementById('luckText')&&!!document.getElementById('lifeStealText')");
      if(ready)break;
      await sleep(100);
    }
    if(!ready)throw new Error("Board-transition Edge test never reached a wired runtime");

    const before=await page.evaluate(`(()=>{const combat=window.DiceboundCombatOracleTest;combat.setup({classId:'ranger',board:1,nightmare:true,player:{luck:.17,lifeSteal:.13},enemies:[{id:'edge-transition-dummy',name:'Transition Dummy',hp:999,maxHp:999,attack:1,defense:0}],tileIndex:1});combat.cleanup();window.DiceboundItemsOracleTest.equip({id:'edge-luck-ring',slot:'ring',rarity:'rare',equipmentId:'distillers-ring',name:'Edge Luck Ring',icon:'💍',bonuses:{luck:.12}});window.DiceboundItemsOracleTest.equip({id:'edge-lifesteal-amulet',slot:'amulet',rarity:'rare',equipmentId:'bloodbound-amulet',name:'Edge Lifesteal Amulet',icon:'📿',bonuses:{lifeSteal:.14}});const s=window.DiceboundRunResumeTest.state();return {board:s.boardLevel,nightmare:window.DiceboundCombatOracleTest.snapshot().nightmareMode,luck:s.player.luck,lifeSteal:s.player.lifeSteal,ring:s.player.equipment?.ring?.id||null,amulet:s.player.equipment?.amulet?.id||null};})()`);
    if(before.board!==1||!before.nightmare)throw new Error(`Nightmare transition fixture is invalid: ${JSON.stringify(before)}`);
    if(before.ring!=='edge-luck-ring'||before.amulet!=='edge-lifesteal-amulet')throw new Error(`Transition fixture did not equip stat-bearing gear: ${JSON.stringify(before)}`);
    if(before.luck<=.17||before.lifeSteal<=.13)throw new Error(`Equipment bonuses were not reflected before transition: ${JSON.stringify(before)}`);

    await page.evaluate("window.DiceboundRun.advanceBoard(); true");
    await sleep(500);

    const after=await page.evaluate(`(()=>{const s=window.DiceboundRunResumeTest.state(),c=window.DiceboundCombatOracleTest.snapshot();return {board:s.boardLevel,position:s.position,rollLocked:s.rollLocked,nightmare:c.nightmareMode,luck:s.player.luck,lifeSteal:s.player.lifeSteal,ring:s.player.equipment?.ring?.id||null,amulet:s.player.equipment?.amulet?.id||null,luckHud:document.getElementById('luckText')?.textContent||'',lifeStealHud:document.getElementById('lifeStealText')?.textContent||''};})()`);
    const same=(a,b)=>Math.abs(Number(a)-Number(b))<1e-9;
    if(after.board!==2||after.position!==0||after.rollLocked)throw new Error(`Board advance did not finish normally: ${JSON.stringify(after)}`);
    if(!after.nightmare)throw new Error(`Nightmare mode was lost across Board transition: ${JSON.stringify(after)}`);
    if(!same(after.luck,before.luck)||!same(after.lifeSteal,before.lifeSteal))throw new Error(`Nightmare Board advance changed Luck/Lifesteal: ${JSON.stringify({before,after})}`);
    if(after.ring!==before.ring||after.amulet!==before.amulet)throw new Error(`Board advance changed equipped stat sources: ${JSON.stringify({before,after})}`);
    if(after.luckHud!==String(Math.round(after.luck*100))||after.lifeStealHud!==`${Math.round(after.lifeSteal*100)}%`)throw new Error(`HUD diverged from preserved Luck/Lifesteal after Board advance: ${JSON.stringify(after)}`);

    console.log("Board transition Edge PASS: real Nightmare advance preserves equipped Luck/Lifesteal in player state and HUD");
  }finally{
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
