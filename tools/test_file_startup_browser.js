"use strict";

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {pathToFileURL}=require("node:url");

const ROOT=path.join(__dirname,"..");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_EDGE_DEBUG_PORT||19359);
const INDEX_PATH=path.join(ROOT,"runtime","index.html");
const URL=pathToFileURL(INDEX_PATH).href;
const CDP_COMMAND_TIMEOUT_MS=30000;
const CDP_STABILIZATION_MS=350;
const CDP_HANDSHAKE_ATTEMPTS=3;
const indexSource=fs.readFileSync(INDEX_PATH,"utf8");
const chooserSource=fs.readFileSync(path.join(ROOT,"runtime","js","ui","class-chooser.js"),"utf8");
assert.doesNotMatch(indexSource,/Welcome to <b>Alpha v1<\/b>/,"obsolete Alpha-v1 setup copy must be deleted from runtime/index.html");
assert.doesNotMatch(indexSource,/Begin as Ranger/,"obsolete Begin-as-Ranger CTA must be deleted from runtime/index.html");
assert.doesNotMatch(chooserSource,/updateLegacyControls|Begin as a random unlocked class|Begin as \$/, "Class chooser must not write to the retired setup CTA");
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function json(url){const response=await fetch(url);if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);return response.json();}
async function cdpMessage(data){
  if(typeof data==="string")return JSON.parse(data);
  if(data instanceof ArrayBuffer)return JSON.parse(Buffer.from(data).toString("utf8"));
  if(ArrayBuffer.isView(data))return JSON.parse(Buffer.from(data.buffer,data.byteOffset,data.byteLength).toString("utf8"));
  if(typeof data?.text==="function")return JSON.parse(await data.text());
  return JSON.parse(String(data));
}
async function connect(){
  const deadline=Date.now()+15000;let target;
  while(Date.now()<deadline&&!target){try{const targets=await json(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith("file:"));}catch(_){}if(!target)await sleep(100);}
  if(!target)throw new Error("Edge did not expose the local-file page target");
  const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),events=[];let id=0;
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  function rejectPending(error){for(const request of pending.values()){clearTimeout(request.timer);request.reject(error);}pending.clear();}
  socket.addEventListener("message",event=>{void cdpMessage(event.data).then(msg=>{const req=pending.get(msg.id);if(!req){events.push(msg);return;}pending.delete(msg.id);clearTimeout(req.timer);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result);}).catch(error=>rejectPending(new Error(`CDP response parse failure: ${error.message}`)));});
  socket.addEventListener("close",()=>rejectPending(new Error("CDP socket closed before the command completed")));
  socket.addEventListener("error",()=>rejectPending(new Error("CDP socket error before the command completed")));
  function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id,timer=setTimeout(()=>{if(pending.delete(requestId))reject(new Error(`CDP timeout after ${CDP_COMMAND_TIMEOUT_MS}ms: ${method}`));},CDP_COMMAND_TIMEOUT_MS);pending.set(requestId,{resolve,reject,timer});socket.send(JSON.stringify({id:requestId,method,params}));});}
  async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  return {socket,send,evaluate,events};
}

async function connectWithHandshake(){
  let lastError;
  for(let attempt=1;attempt<=CDP_HANDSHAKE_ATTEMPTS;attempt++){
    let page;
    try{
      page=await connect();
      await sleep(CDP_STABILIZATION_MS);
      await page.send("Runtime.enable");
      await page.send("Log.enable");
      return page;
    }catch(error){
      lastError=error;
      try{page?.socket.close();}catch(_){}
      if(attempt<CDP_HANDSHAKE_ATTEMPTS){
        console.warn(`CDP startup handshake attempt ${attempt}/${CDP_HANDSHAKE_ATTEMPTS} failed: ${error.message}; reconnecting`);
        await sleep(CDP_STABILIZATION_MS*attempt);
      }
    }
  }
  throw new Error(`CDP startup handshake failed after ${CDP_HANDSHAKE_ATTEMPTS} attempts: ${lastError?.message||"unknown error"}`);
}

(async()=>{
  const profile=path.join(os.tmpdir(),`dicebound-file-smoke-${process.pid}-${Date.now()}`);
  // This is an isolated, temporary file:// test profile. The local CI sandbox
  // denies Chromium child-process sandbox access, so keep that launcher-only
  // accommodation here rather than changing the shipped WebView2 wrapper.
  const child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--allow-file-access-from-files","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,URL],{stdio:"ignore",windowsHide:true});
  let page;
  try{
    page=await connectWithHandshake();
    const deadline=Date.now()+18000;let state;
    while(Date.now()<deadline){
      state=await page.evaluate(`(()=>{const overlay=document.getElementById('startOverlay'),scene=document.getElementById('campScene'),legacy=document.querySelector('#startOverlay .start-art'),begin=document.getElementById('startBtn'),visible=node=>!!node&&node.getClientRects().length>0&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden';return {ready:document.readyState,campApi:!!window.DiceboundCamp,scene:!!scene,campFullscreen:!!overlay?.classList.contains('camp-fullscreen'),overlayHidden:!!overlay?.classList.contains('hidden'),legacyVisible:visible(legacy),beginVisible:visible(begin),bodyText:(overlay?.innerText||'').slice(0,500)};})()`);
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
    try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
