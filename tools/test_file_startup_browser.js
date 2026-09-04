"use strict";

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const os=require("node:os");
const path=require("node:path");
const {pathToFileURL}=require("node:url");

const ROOT=path.join(__dirname,"..");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_EDGE_DEBUG_PORT||19359);
const URL=pathToFileURL(path.join(ROOT,"runtime","index.html")).href;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function json(url){const response=await fetch(url);if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);return response.json();}
async function connect(){
  const deadline=Date.now()+15000;let target;
  while(Date.now()<deadline&&!target){try{const targets=await json(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith("file:"));}catch(_){}if(!target)await sleep(100);}
  if(!target)throw new Error("Edge did not expose the local-file page target");
  const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),events=[];let id=0;
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  socket.addEventListener("message",event=>{const msg=JSON.parse(String(event.data)),req=pending.get(msg.id);if(!req){events.push(msg);return;}pending.delete(msg.id);clearTimeout(req.timer);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result);});
  function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id,timer=setTimeout(()=>{if(pending.delete(requestId))reject(new Error(`CDP timeout: ${method}`));},10000);pending.set(requestId,{resolve,reject,timer});socket.send(JSON.stringify({id:requestId,method,params}));});}
  async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  return {socket,send,evaluate,events};
}

(async()=>{
  const profile=path.join(os.tmpdir(),`dicebound-file-smoke-${process.pid}-${Date.now()}`);
  const child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--allow-file-access-from-files","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,URL],{stdio:"ignore",windowsHide:true});
  let page;
  try{
    page=await connect();await page.send("Runtime.enable");await page.send("Log.enable");
    const deadline=Date.now()+18000;let state;
    while(Date.now()<deadline){
      state=await page.evaluate(`(()=>{const overlay=document.getElementById('startOverlay'),scene=document.getElementById('campScene'),legacy=document.querySelector('#startOverlay .start-art'),begin=document.getElementById('startBtn');return {ready:document.readyState,campApi:!!window.DiceboundCamp,scene:!!scene,campFullscreen:!!overlay?.classList.contains('camp-fullscreen'),overlayHidden:!!overlay?.classList.contains('hidden'),legacyVisible:!!legacy&&getComputedStyle(legacy).display!=='none'&&getComputedStyle(legacy).visibility!=='hidden',beginVisible:!!begin&&getComputedStyle(begin).display!=='none'&&getComputedStyle(begin).visibility!=='hidden',bodyText:(overlay?.innerText||'').slice(0,500)};})()`);
      if(state.scene&&state.campFullscreen)break;
      await sleep(150);
    }
    const diagnostics=page.events.filter(event=>event.method==='Runtime.exceptionThrown'||event.method==='Log.entryAdded').map(event=>event.params?.exceptionDetails?.exception?.description||event.params?.exceptionDetails?.text||event.params?.entry?.text||event.method);
    console.log(JSON.stringify({url:URL,state,diagnostics},null,2));
    assert.equal(state?.scene,true,"local file startup must construct the Camp scene");
    assert.equal(state?.campFullscreen,true,"local file startup must transform the between-runs destination into full-screen Camp");
    assert.equal(state?.legacyVisible,false,"obsolete Alpha start presentation must never be visible");
    assert.equal(state?.beginVisible,false,"obsolete Begin button must never be visible");
    assert.equal(diagnostics.length,0,`local file startup emitted runtime errors: ${diagnostics.join(' | ')}`);
    console.log("Local file Camp startup PASS");
  }finally{
    try{if(page)await page.send("Browser.close");}catch(_){}
    try{page?.socket.close();}catch(_){}
    if(child.exitCode===null)child.kill();
    try{require("node:fs").rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
