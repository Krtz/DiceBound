#!/usr/bin/env node
"use strict";

/* Real Edge regression for the Info / Roadkeeper's Guide controls.
 * This exercises the actual button wiring and modal DOM because ownership
 * cleanup can leave unit-level view-model tests green while clicks do nothing.
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

async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-info-browser-")),{server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const deadline=Date.now()+20000;
    while(Date.now()<deadline){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundInfoGuide&&!!document.getElementById('infoBtn')"))break;await sleep(100);}
    const result=await page.evaluate(`(async()=>{
      const errors=[];
      window.addEventListener('error',event=>errors.push(String(event.error?.stack||event.message||event.error||'window error')));
      const button=document.getElementById('infoBtn'),overlay=document.getElementById('infoOverlay');
      const before={wired:button?.dataset.infoGuideWired||null,hidden:overlay?.classList.contains('hidden'),inspect:window.DiceboundInfoGuide?.inspect?.()};
      button?.click();await new Promise(resolve=>setTimeout(resolve,100));
      const opened={hidden:overlay?.classList.contains('hidden'),inspect:window.DiceboundInfoGuide?.inspect?.(),tabs:[...overlay.querySelectorAll('[data-info-tab]')].map(node=>node.dataset.infoTab)};
      overlay.querySelector('[data-info-tab="stats"]')?.click();await new Promise(resolve=>setTimeout(resolve,40));
      const stats={inspect:window.DiceboundInfoGuide?.inspect?.(),cards:overlay.querySelectorAll('.lifetime-stat').length};
      overlay.querySelector('[data-info-tab="elements"]')?.click();await new Promise(resolve=>setTimeout(resolve,40));
      const elements={inspect:window.DiceboundInfoGuide?.inspect?.(),rows:overlay.querySelectorAll('.element-row').length};
      overlay.querySelector('[data-info-tab="guide"]')?.click();await new Promise(resolve=>setTimeout(resolve,40));
      const firstSummary=overlay.querySelector('[data-guide-section] summary');firstSummary?.click();await new Promise(resolve=>setTimeout(resolve,20));
      const detailsOpen=!!firstSummary?.closest('details')?.open;
      overlay.querySelector('[data-info-done]')?.click();await new Promise(resolve=>setTimeout(resolve,40));
      return {version:window.DiceboundVersion?.version,before,opened,stats,elements,detailsOpen,closed:overlay?.classList.contains('hidden'),errors};
    })()`);
    if(result.before.wired!=="1")throw new Error(`Info trigger was not wired: ${JSON.stringify(result)}`);
    if(result.opened.hidden)throw new Error(`Info button did not open the Guide: ${JSON.stringify(result)}`);
    if(result.opened.inspect?.sections<1)throw new Error(`Info Guide content did not render: ${JSON.stringify(result)}`);
    if(result.stats.inspect?.activeTab!=="stats"||result.stats.cards<1)throw new Error(`Info Stats button did not work: ${JSON.stringify(result)}`);
    if(result.elements.inspect?.activeTab!=="elements"||result.elements.rows<1)throw new Error(`Info Elements button did not work: ${JSON.stringify(result)}`);
    if(!result.detailsOpen)throw new Error(`Info section disclosure did not work: ${JSON.stringify(result)}`);
    if(!result.closed)throw new Error(`Info Done button did not close the Guide: ${JSON.stringify(result)}`);
    if(result.errors.length)throw new Error(`Info controls raised runtime errors: ${JSON.stringify(result)}`);
    console.log(`Info Edge PASS: trigger, tabs, disclosure and Done all work (${result.opened.inspect.sections} guide sections)`);
  }finally{
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
