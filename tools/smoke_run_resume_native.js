"use strict";

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,".."),EXE=process.env.DICEBOUND_NATIVE_EXE||path.join(ROOT,"wrapper-source","release","DiceBound.exe"),DEBUG_PORT=Number(process.env.DICEBOUND_NATIVE_DEBUG_PORT||19358);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForTargets(timeout=25000){const deadline=Date.now()+timeout;let last;while(Date.now()<deadline){try{const response=await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);if(response.ok)return response.json();}catch(error){last=error;}await sleep(100);}throw last||new Error("Native WebView2 DevTools endpoint did not start");}
async function connectNative(){
  const deadline=Date.now()+25000;let target=null;
  while(Date.now()<deadline&&!target){const targets=await waitForTargets();target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.includes("diceboundNative=1"));if(!target)await sleep(100);}
  if(!target)throw new Error("Native DiceBound page target was not exposed");
  const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});
  function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}
  async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  return {socket,evaluate};
}
async function launch(localAppData){
  const env={...process.env,LOCALAPPDATA:localAppData,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${DEBUG_PORT}`,DICEBOUND_WEBVIEW2_LOADER:""};
  const child=childProcess.spawn(EXE,[],{env,stdio:"ignore",windowsHide:true}),page=await connectNative(),deadline=Date.now()+25000;
  while(Date.now()<deadline){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest"))return {child,...page};await sleep(100);}
  child.kill();throw new Error("Native DiceBound runtime did not complete startup");
}
async function stop(instance){try{instance.socket.close();}catch(_){}if(instance.child.exitCode===null)instance.child.kill();if(instance.child.exitCode===null)await Promise.race([new Promise(resolve=>instance.child.once("exit",resolve)),sleep(5000)]);}

(async()=>{
  assert.ok(fs.existsSync(EXE),`Native DiceBound EXE was not found at ${EXE}`);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-native-resume-")),localAppData=path.join(root,"LocalAppData");fs.mkdirSync(localAppData,{recursive:true});let first=null,second=null;
  try{
    first=await launch(localAppData);console.log("Native pass 1 loaded through WebView2; checking fresh Camp then writing deterministic checkpoint");
    const freshCamp=await first.evaluate(`(()=>{const ids=['campAchievementBtn','campTalentBtn','campMoonBtn'];return {objects:window.DiceboundCampProgressionTest?.campObjectIds?.()||null,absent:ids.every(id=>!document.getElementById(id))};})()`);
    assert.deepEqual(freshCamp.objects,[],"a fresh native career must not render Camp progression objects");assert.equal(freshCamp.absent,true,"fresh native Camp objects must be absent rather than invisible controls");
    const combatBackgrounds=await first.evaluate(`(()=>{const normal=[1,2,3,4,5,6].map(board=>window.DiceboundCombatBackgrounds?.resolve(board,'normal')?.image||null),nightmare=window.DiceboundCombatBackgrounds?.resolve(3,'nightmare')||null,active=window.DiceboundCombatBackgrounds?.active()?.image||null,overlay=document.getElementById('combatOverlay');return {normal,nightmare,active,attribute:overlay?.dataset.combatBackground||null,style:overlay?.style.getPropertyValue('--db0635-combat-background-image')||null};})()`);
    assert.deepEqual(combatBackgrounds.normal,[1,2,3,4,5,6].map(board=>`assets/combat/backgrounds/board-${board}-normal.png`));assert.equal(combatBackgrounds.nightmare,null,"native Nightmare must not use an invented Normal background");assert.equal(combatBackgrounds.active,'assets/combat/backgrounds/board-1-normal.png');assert.equal(combatBackgrounds.attribute,'board-1-normal');assert.match(combatBackgrounds.style,/board-1-normal\.png/);
    const created=await first.evaluate(`(async()=>{window.DiceboundRng.seed('native-resume-seed');document.getElementById('campGoBtn').click();await new Promise(resolve=>setTimeout(resolve,240));const automaticSaved=!!window.DiceboundRunCheckpoint.load().checkpoint;const checkpoint=window.DiceboundRunResumeTest.snapshot();checkpoint.run.player.gold=654;checkpoint.run.player.position=Math.min(3,checkpoint.run.tiles.length-1);checkpoint.summary.gold=654;checkpoint.summary.tile=checkpoint.run.player.position+1;window.DiceboundRunCheckpoint.store(checkpoint);const expected=[window.DiceboundRng.random(),window.DiceboundRng.random(),window.DiceboundRng.random()];const version=window.DiceboundVersion.version,channel=window.DiceboundVersion.channel;const markerSources=[...document.querySelectorAll('.tile.enemy img.db-road-marker')].map(image=>image.getAttribute('src'));return {title:document.title,expectedTitle:'Dicebound: '+channel+' v'+version,readyLog:'Frontend ready handshake received for '+channel+' '+version+'.',storage:window.DiceboundStorage.diagnostics(),checkpoint,expected,automaticSaved,markerSources};})()`);
    assert.equal(created.title,created.expectedTitle);assert.equal(created.storage.backend,"wrapper-native");assert.equal(created.automaticSaved,true,"starting a stable native run did not autosave");
    assert.ok(created.markerSources.length>0,"native board did not render any semantic ordinary-enemy markers");assert.ok(created.markerSources.every(src=>/assets\/enemies\/normal\/board-markers\/[a-z-]+\.png$/.test(src||'')),"native board used a non-semantic ordinary-enemy marker source");
    await stop(first);first=null;await sleep(800);

    second=await launch(localAppData);console.log("Native pass 2 relaunched the same isolated app-data; continuing saved run");
    const camp=await second.evaluate(`({visible:!document.getElementById('runResumePanel').classList.contains('hidden'),enabled:!document.getElementById('runResumeBtn').disabled,summary:document.getElementById('runResumeSummary').textContent})`);
    assert.equal(camp.visible,true);assert.equal(camp.enabled,true);assert.match(camp.summary,/654 gold/);
    const resumed=await second.evaluate(`(async()=>{document.getElementById('runResumeBtn').click();await new Promise(resolve=>setTimeout(resolve,180));return {state:window.DiceboundRunResumeTest.state(),next:[window.DiceboundRng.random(),window.DiceboundRng.random(),window.DiceboundRng.random()]};})()`);
    assert.equal(resumed.state.gameStarted,true);assert.equal(resumed.state.player.gold,654);assert.equal(resumed.state.position,created.checkpoint.run.player.position);assert.deepEqual(resumed.next,created.expected);
    const log=fs.readFileSync(path.join(localAppData,"Dicebound","logs","native-wrapper.log"),"utf8");assert.match(log,/WebView2 bootstrap mode=official-loader/);assert.ok(log.split(created.readyLog).length-1>=2,"both native launches did not report frontend-ready");
    console.log(`Native WebView2 active-run relaunch PASS: ${camp.summary}; official loader, native storage and exact RNG cursor verified`);
  } finally {if(first)await stop(first);if(second)await stop(second);await sleep(500);fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
