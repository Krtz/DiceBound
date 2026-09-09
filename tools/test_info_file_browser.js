#!/usr/bin/env node
"use strict";

/* Manual branch testing commonly opens runtime/index.html directly from an
 * extracted GitHub ZIP. Keep that file:// path covered separately from the
 * HTTP/native-host browser smoke so UI ownership bugs cannot hide behind an
 * origin difference.
 */
const childProcess=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {pathToFileURL}=require("node:url");

const ROOT=path.join(__dirname,".."),RUNTIME=path.join(ROOT,"runtime");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=19409;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitJson(url,timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`Timed out waiting for ${url}`);}
async function connect(){const deadline=Date.now()+15000;let target;while(Date.now()<deadline&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith("file:"));if(!target)await sleep(100);}if(!target)throw new Error("Edge file page target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}
async function pointerClick(page,selector){const target=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,top=document.elementFromPoint(x,y);return {x,y,topId:top?.id||'',topClass:top?.className||'',topTag:top?.tagName||''};})()`);if(!target)throw new Error(`Missing pointer target ${selector}`);await page.send("Input.dispatchMouseEvent",{type:"mousePressed",x:target.x,y:target.y,button:"left",clickCount:1});await page.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:target.x,y:target.y,button:"left",clickCount:1});await sleep(80);return target;}

async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-info-file-browser-")),url=pathToFileURL(path.join(RUNTIME,"index.html")).href;let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--allow-file-access-from-files","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect();await page.send("Runtime.enable");await page.send("Emulation.setDeviceMetricsOverride",{width:1680,height:1000,deviceScaleFactor:1,mobile:false});
    const deadline=Date.now()+20000;while(Date.now()<deadline){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundInfoGuide&&!!document.getElementById('campInfoBtn')"))break;await sleep(100);}
    const loaded=await page.evaluate(`(()=>({version:window.DiceboundVersion?.version,ready:document.readyState,booting:document.documentElement.classList.contains('db-booting'),camp:!!document.getElementById('campInfoBtn'),road:!!document.getElementById('infoBtn')}))()`);if(loaded.booting||!loaded.camp||!loaded.road)throw new Error(`file:// runtime did not finish boot: ${JSON.stringify(loaded)}`);
    const campHit=await pointerClick(page,"#campInfoBtn"),campOpen=!(await page.evaluate("document.getElementById('infoOverlay')?.classList.contains('hidden')"));if(!campOpen)throw new Error(`file:// Camp Info did not open; hit=${JSON.stringify(campHit)}`);
    await pointerClick(page,"#infoOverlay [data-info-done]");
    await page.evaluate(`(async()=>{document.getElementById('campGoBtn')?.click();await new Promise(resolve=>setTimeout(resolve,260));document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');})()`);
    const roadHit=await pointerClick(page,"#infoBtn"),roadOpen=!(await page.evaluate("document.getElementById('infoOverlay')?.classList.contains('hidden')"));if(!roadOpen)throw new Error(`file:// Road Info did not open; hit=${JSON.stringify(roadHit)}`);
    await pointerClick(page,'#infoOverlay [data-info-tab="stats"]');if((await page.evaluate("window.DiceboundInfoGuide?.inspect?.().activeTab"))!=="stats")throw new Error("file:// Info Stats tab did not activate");
    await pointerClick(page,"#infoOverlay [data-info-done]");
    console.log(`Info file Edge PASS: ${loaded.version} Camp + Road Info pointer controls work from runtime/index.html`);
  }finally{try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
