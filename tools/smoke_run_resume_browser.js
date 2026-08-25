"use strict";

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,".."),RUNTIME=path.join(ROOT,"runtime");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_EDGE_DEBUG_PORT||19357);
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){
  return new Promise((resolve,reject)=>{
    const server=http.createServer((request,response)=>{
      const pathname=decodeURIComponent(new URL(request.url,"http://127.0.0.1").pathname),relative=pathname==="/"?"index.html":pathname.replace(/^\/+/,"");
      const file=path.resolve(RUNTIME,relative);
      if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){response.writeHead(403).end();return;}
      fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});response.end(data);});
    });
    server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));
  });
}
async function waitForJson(url,timeout=15000){
  const deadline=Date.now()+timeout;let last;
  while(Date.now()<deadline){try{const response=await fetch(url);if(response.ok)return response.json();last=new Error(`${response.status} ${response.statusText}`);}catch(error){last=error;}await sleep(100);}
  throw last||new Error(`Timed out waiting for ${url}`);
}
async function connectPage(expectedUrl){
  const origin=new URL(expectedUrl).origin,deadline=Date.now()+15000;let target=null;
  while(Date.now()<deadline&&!target){const targets=await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith(origin));if(!target)await sleep(100);}
  if(!target)throw new Error("Edge did not expose a page target");
  const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});
  function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}
  async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  return {socket,send,evaluate};
}
async function launch(profile,url){
  const child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
  const page=await connectPage(url);
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest"))return {child,...page};await sleep(100);}
  throw new Error("DiceBound runtime did not finish loading in Edge");
}
async function closeEdge(edge){try{await Promise.race([edge.send("Browser.close"),sleep(750)]);}catch(_){}try{edge.socket.close();}catch(_){}if(edge.child.exitCode===null)await Promise.race([new Promise(resolve=>edge.child.once("exit",resolve)),sleep(5000)]);if(edge.child.exitCode===null)edge.child.kill();}

(async()=>{
  assert.ok(fs.existsSync(EDGE),`Microsoft Edge was not found at ${EDGE}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-run-resume-edge-"));
  const {server,url}=await serveRuntime();let first=null,second=null;
  try{
    first=await launch(profile,url);console.log("Edge pass 1 loaded; checking fresh Camp then writing deterministic checkpoint");
    const freshCamp=await first.evaluate(`(()=>{const ids=['campAchievementBtn','campTalentBtn','campMoonBtn'];return {objects:window.DiceboundCampProgressionTest?.campObjectIds?.()||null,absent:ids.every(id=>!document.getElementById(id))};})()`);
    assert.deepEqual(freshCamp.objects,[],"a fresh career must not render Camp progression objects");assert.equal(freshCamp.absent,true,"fresh Camp objects must be absent rather than invisible controls");
    const created=await first.evaluate(`(async()=>{
      window.DiceboundRng.seed('edge-resume-seed');document.getElementById('campGoBtn').click();
      await new Promise(resolve=>setTimeout(resolve,240));
      const automaticSaved=!!window.DiceboundRunCheckpoint.load().checkpoint;
      const checkpoint=window.DiceboundRunResumeTest.snapshot();checkpoint.run.player.gold=321;checkpoint.run.player.position=Math.min(2,checkpoint.run.tiles.length-1);checkpoint.summary.gold=321;checkpoint.summary.tile=checkpoint.run.player.position+1;
      window.DiceboundRunCheckpoint.store(checkpoint);const expected=[window.DiceboundRng.random(),window.DiceboundRng.random(),window.DiceboundRng.random()];
      return {title:document.title,expectedTitle:'Dicebound: '+window.DiceboundVersion.channel+' v'+window.DiceboundVersion.version,checkpoint,expected,stable:window.DiceboundRunResumeTest.isStable(),automaticSaved};
    })()`);
    assert.equal(created.title,created.expectedTitle);assert.equal(created.stable,true);assert.equal(created.automaticSaved,true,"starting a stable run did not autosave");assert.equal(created.checkpoint.run.player.gold,321);
    const tieredArt=await first.evaluate(`(async()=>{const assets=window.DiceboundAssets,battle=window.DiceboundEnemyBattleArt,load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;});const families=await Promise.all(['slime','wolf'].map(async identity=>({identity,forms:await Promise.all([1,2,3,4,5,6].map(async board=>{const art=battle.resolve(identity==='slime'?'Nightmare Slime':'Ascended Wolf',board),size=await load(art.src);return {board,src:art.src,resolvedBoard:art.board,size};}))})));return {families,modes:['normal','nightmare','hell'].map(mode=>assets.resolveEnemyModeAura(mode)),style:!!document.getElementById('dicebound-0636-slime-battle-art-style')};})()`);
    assert.equal(tieredArt.style,true,"tiered ordinary-enemy battle-art presentation stylesheet is missing");
    for(const family of tieredArt.families){assert.deepEqual(family.forms.map(x=>x.resolvedBoard),[1,2,3,4,5,6]);assert.deepEqual(family.forms.map(x=>x.src),[1,2,3,4,5,6].map(board=>`assets/enemies/normal/battle/${family.identity}-board-${board}.png`));for(const form of family.forms)assert.deepEqual(form.size,{width:1086,height:1448});}
    assert.deepEqual(tieredArt.modes,[{id:'normal',className:''},{id:'nightmare',className:'db-enemy-mode-nightmare'},{id:'hell',className:'db-enemy-mode-hell'}]);
    await closeEdge(first);first=null;console.log("Edge pass 1 closed; relaunching the same profile");

    second=await launch(profile,url);console.log("Edge pass 2 loaded; continuing saved run");
    const camp=await second.evaluate(`({visible:!document.getElementById('runResumePanel').classList.contains('hidden'),enabled:!document.getElementById('runResumeBtn').disabled,summary:document.getElementById('runResumeSummary').textContent})`);
    assert.equal(camp.visible,true);assert.equal(camp.enabled,true);assert.match(camp.summary,/321 gold/);
    const resumed=await second.evaluate(`(async()=>{document.getElementById('runResumeBtn').click();await new Promise(resolve=>setTimeout(resolve,180));const state=window.DiceboundRunResumeTest.state();return {state,next:[window.DiceboundRng.random(),window.DiceboundRng.random(),window.DiceboundRng.random()],startHidden:document.getElementById('startOverlay').classList.contains('hidden')};})()`);
    assert.equal(resumed.state.gameStarted,true);assert.equal(resumed.state.rollLocked,false);assert.equal(resumed.state.player.gold,321);assert.equal(resumed.state.position,created.checkpoint.run.player.position);assert.deepEqual(resumed.next,created.expected);assert.equal(resumed.startHidden,true);
    const transientBlocked=await second.evaluate(`(()=>{document.getElementById('eventOverlay').classList.remove('hidden');const saved=window.DiceboundRunResumeTest.save();document.getElementById('eventOverlay').classList.add('hidden');return saved;})()`);
    assert.equal(transientBlocked,false,"an unsafe overlay allowed a replacement checkpoint");
    console.log(`Edge active-run relaunch PASS: ${camp.summary}; exact RNG cursor and transient-state guard preserved`);
  } finally {
    if(first)await closeEdge(first);if(second)await closeEdge(second);await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
