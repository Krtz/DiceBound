#!/usr/bin/env node
"use strict";

/* Real Edge regression for the Merchant arrival path.
 * This test exists because the unit-level tile dispatcher and transaction
 * tests both stayed green while the actual shop crashed during gear formatting.
 */
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,".."),RUNTIME=path.join(ROOT,"runtime");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=19407;
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,"http://127.0.0.1").pathname),relative=pathname==="/"?"index.html":pathname.replace(/^\/+/,"");const file=path.resolve(RUNTIME,relative);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){response.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});response.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`Timed out waiting for ${url}`);}
async function connect(url){const origin=new URL(url).origin,deadline=Date.now()+15000;let target;while(Date.now()<deadline&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge page target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}

async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-merchant-browser-")),{server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const deadline=Date.now()+20000;
    while(Date.now()<deadline){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundBoardTileDispatch&&!!window.DiceboundEquipmentIdentityTest"))break;await sleep(100);}
    const result=await page.evaluate(`(async()=>{
      window.DiceboundDebugLog?.setLevel?.('all');
      window.DiceboundRng.seed('merchant-browser-regression');
      document.getElementById('campGoBtn')?.click();
      await new Promise(resolve=>setTimeout(resolve,240));
      document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');
      const checkpoint=window.DiceboundRunResumeTest.snapshot(),slots=['weapon','offhand','boots','legs','chest','hat','ring','amulet'];
      checkpoint.run.player.gold=99999;checkpoint.run.player.equipment={};
      for(const slot of slots)checkpoint.run.player.equipment[slot]=window.DiceboundEquipmentIdentityTest.generate('common',slot);
      const index=Math.min(23,checkpoint.run.tiles.length-2);checkpoint.run.player.position=index;
      checkpoint.run.tiles[index]={...(checkpoint.run.tiles[index]||{}),type:'merchant',cleared:false};
      checkpoint.run.merchant={faceClicks:[],faceTotal:1,bossPrimed:false,bossDefeatedThisBoard:false};
      window.DiceboundRunResumeTest.restore(checkpoint);
      await new Promise(resolve=>setTimeout(resolve,80));window.DiceboundDebugLog?.clear?.();
      window.DiceboundBoardTileDispatch.dispatch();await new Promise(resolve=>setTimeout(resolve,100));
      const shop=[...document.querySelectorAll('#shopGrid .shop-item')],ordinary=shop.find(button=>!button.querySelector('.shop-compare')&&!button.disabled),goldBefore=Number(document.getElementById('merchantGold')?.textContent||0);
      ordinary?.click();await new Promise(resolve=>setTimeout(resolve,100));
      const debug=window.DiceboundDebugLog?.lines?.()||[];
      return {version:window.DiceboundVersion?.version,merchantHidden:document.getElementById('merchantOverlay')?.classList.contains('hidden'),shopItems:shop.length,comparisons:document.querySelectorAll('#shopGrid .shop-compare').length,comparisonText:document.querySelector('#shopGrid .shop-compare')?.textContent||'',sold:document.querySelectorAll('#shopGrid .shop-item.sold').length,goldBefore,goldAfter:Number(document.getElementById('merchantGold')?.textContent||0),debug};
    })()`);
    if(result.merchantHidden)throw new Error(`Merchant overlay did not open: ${JSON.stringify(result)}`);
    if(result.shopItems<4)throw new Error(`Merchant stock did not render: ${JSON.stringify(result)}`);
    if(result.comparisons<1)throw new Error(`Merchant gear comparison did not render: ${JSON.stringify(result)}`);
    if(result.sold<1||!(result.goldAfter<result.goldBefore))throw new Error(`Merchant purchase transaction did not complete: ${JSON.stringify(result)}`);
    if(result.debug.some(line=>/resolveTile threw|ReferenceError|TypeError/.test(line)))throw new Error(`Merchant arrival logged a runtime error: ${JSON.stringify(result)}`);
    console.log(`Merchant Edge PASS: ${result.shopItems} offers, ${result.comparisons} gear comparison(s), purchase committed, no road recovery`);
  }finally{
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
