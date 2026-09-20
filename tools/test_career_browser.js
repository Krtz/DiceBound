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
    await page.evaluate(`(()=>{window.__careerErrors=[];window.addEventListener('error',event=>window.__careerErrors.push(String(event.error?.stack||event.message||event.error||'window error')));})()`);

    const hit=await pointerClick(page,"#campCareerBtn");
    const opened=await page.evaluate(`(()=>({open:!document.getElementById('careerOverlay')?.classList.contains('hidden'),inspect:window.DiceboundCareerUi?.inspect?.(),infoStats:!!document.querySelector('#infoOverlay [data-info-tab="stats"]')}))()`);
    if(!opened.open)throw new Error(`Career pointer click did not open destination; hit=${JSON.stringify(hit)} state=${JSON.stringify(opened)}`);
    if(opened.infoStats)throw new Error("Lifetime Career Stats still exist as a duplicate Info tab");
    if(opened.inspect?.activeTab!=="overview")throw new Error(`Career did not open on Overview: ${JSON.stringify(opened)}`);

    const overview=await page.evaluate(`(()=>({cards:document.querySelectorAll('#careerOverlay .career-card').length,clearSection:document.querySelector('#careerOverlay .career-clear-grid')?.textContent||''}))()`);
    if(overview.cards<10)throw new Error(`Career Overview did not render lifetime cards: ${JSON.stringify(overview)}`);

    await pointerClick(page,'#careerOverlay [data-career-tab="enemies"]');
    const enemies=await page.evaluate(`(()=>({tab:window.DiceboundCareerUi?.inspect?.().activeTab,text:document.querySelector('[data-career-panel="enemies"]')?.textContent||''}))()`);
    if(enemies.tab!=="enemies"||!enemies.text)throw new Error(`Enemy Ledger tab did not render: ${JSON.stringify(enemies)}`);

    await pointerClick(page,'#careerOverlay [data-career-tab="runs"]');
    const runs=await page.evaluate(`(()=>({tab:window.DiceboundCareerUi?.inspect?.().activeTab,text:document.querySelector('[data-career-panel="runs"]')?.textContent||''}))()`);
    if(runs.tab!=="runs"||!runs.text.includes("Run History begins"))throw new Error(`Fresh Career Run History did not render truthful empty state: ${JSON.stringify(runs)}`);

    await pointerClick(page,"#careerOverlay [data-career-done]");
    if(!(await page.evaluate("document.getElementById('careerOverlay')?.classList.contains('hidden')")))throw new Error("Career Done pointer did not close destination");
    const errors=await page.evaluate("window.__careerErrors||[]");if(errors.length)throw new Error(`Career destination raised runtime errors: ${JSON.stringify(errors)}`);
    console.log("Career Edge PASS: Camp hit target, Overview, semantic Enemy Ledger, bounded Run History and Done are player-reachable");
  }finally{
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
