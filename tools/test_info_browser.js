#!/usr/bin/env node
"use strict";

/* Real Edge regression for the Info / Roadkeeper's Guide controls.
 * This uses actual CDP pointer events for both Camp and Road Info buttons,
 * because programmatic element.click() can pass while a real hit target is
 * covered or otherwise unreachable to the player.
 */
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,".."),RUNTIME=path.join(ROOT,"runtime");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=19408;
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,"http://127.0.0.1").pathname),relative=pathname==="/"?"index.html":pathname.replace(/^\/+/,"");const file=path.resolve(RUNTIME,relative);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){response.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});response.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`Timed out waiting for ${url}`);}
async function connect(url){const origin=new URL(url).origin,deadline=Date.now()+15000;let target;while(Date.now()<deadline&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge page target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}

async function pointerClick(page,selector){
  const target=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,top=document.elementFromPoint(x,y);return {x,y,width:r.width,height:r.height,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,pointerEvents:getComputedStyle(el).pointerEvents,topId:top?.id||'',topClass:top?.className||'',topTag:top?.tagName||''};})()`);
  if(!target)throw new Error(`Missing pointer target ${selector}`);
  await page.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:target.x,y:target.y});
  await page.send("Input.dispatchMouseEvent",{type:"mousePressed",x:target.x,y:target.y,button:"left",clickCount:1});
  await page.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:target.x,y:target.y,button:"left",clickCount:1});
  await sleep(80);
  return target;
}

async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-info-browser-")),{server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride",{width:1680,height:1000,deviceScaleFactor:1,mobile:false});
    const deadline=Date.now()+20000;
    while(Date.now()<deadline){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundInfoGuide&&!!document.getElementById('infoBtn')&&!!document.getElementById('campInfoBtn')"))break;await sleep(100);}
    await page.evaluate(`(()=>{window.__infoBrowserErrors=[];window.addEventListener('error',event=>window.__infoBrowserErrors.push(String(event.error?.stack||event.message||event.error||'window error')));})()`);

    const campHit=await pointerClick(page,"#campInfoBtn");
    const campOpened=await page.evaluate(`(()=>({hidden:document.getElementById('infoOverlay')?.classList.contains('hidden'),inspect:window.DiceboundInfoGuide?.inspect?.()}))()`);
    if(campOpened.hidden)throw new Error(`Camp Info pointer click did not open Guide; hit=${JSON.stringify(campHit)} state=${JSON.stringify(campOpened)}`);
    await pointerClick(page,"#infoOverlay [data-info-done]");
    if(!(await page.evaluate("document.getElementById('infoOverlay')?.classList.contains('hidden')")))throw new Error("Info Done pointer click did not close Camp Guide");

    await page.evaluate(`(async()=>{document.getElementById('campGoBtn')?.click();await new Promise(resolve=>setTimeout(resolve,260));document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');})()`);
    const roadHit=await pointerClick(page,"#infoBtn");
    const roadOpened=await page.evaluate(`(()=>({hidden:document.getElementById('infoOverlay')?.classList.contains('hidden'),inspect:window.DiceboundInfoGuide?.inspect?.(),startHidden:document.getElementById('startOverlay')?.classList.contains('hidden')}))()`);
    if(roadOpened.hidden)throw new Error(`Road Info pointer click did not open Guide; hit=${JSON.stringify(roadHit)} state=${JSON.stringify(roadOpened)}`);
    if(roadOpened.inspect?.sections<1)throw new Error(`Info Guide content did not render: ${JSON.stringify(roadOpened)}`);

    await pointerClick(page,'#infoOverlay [data-info-tab="stats"]');
    const stats=await page.evaluate(`(()=>({inspect:window.DiceboundInfoGuide?.inspect?.(),cards:document.querySelectorAll('#infoOverlay .lifetime-stat').length}))()`);
    if(stats.inspect?.activeTab!=="stats"||stats.cards<1)throw new Error(`Info Stats pointer button did not work: ${JSON.stringify(stats)}`);
    await pointerClick(page,'#infoOverlay [data-info-tab="elements"]');
    const elements=await page.evaluate(`(()=>({inspect:window.DiceboundInfoGuide?.inspect?.(),rows:document.querySelectorAll('#infoOverlay .element-row').length}))()`);
    if(elements.inspect?.activeTab!=="elements"||elements.rows<1)throw new Error(`Info Elements pointer button did not work: ${JSON.stringify(elements)}`);
    await pointerClick(page,'#infoOverlay [data-info-tab="guide"]');
    await pointerClick(page,'#infoOverlay [data-guide-section] summary');
    if(!(await page.evaluate("!!document.querySelector('#infoOverlay [data-guide-section]')?.open")))throw new Error("Info section disclosure pointer click did not work");
    await pointerClick(page,"#infoOverlay [data-info-done]");
    if(!(await page.evaluate("document.getElementById('infoOverlay')?.classList.contains('hidden')")))throw new Error("Info Done pointer click did not close Road Guide");
    const errors=await page.evaluate("window.__infoBrowserErrors||[]");
    if(errors.length)throw new Error(`Info controls raised runtime errors: ${JSON.stringify(errors)}`);
    console.log(`Info Edge PASS: Camp + Road pointer targets, tabs, disclosure and Done all work (${roadOpened.inspect.sections} guide sections)`);
  }finally{
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
