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
async function fetchWithTimeout(url,timeout=1500){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{signal:controller.signal});}finally{clearTimeout(timer);}}

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
  while(Date.now()<deadline){try{const response=await fetchWithTimeout(url);if(response.ok)return response.json();last=new Error(`${response.status} ${response.statusText}`);}catch(error){last=error;}await sleep(100);}
  throw last||new Error(`Timed out waiting for ${url}`);
}
async function connectPage(expectedUrl){
  const origin=new URL(expectedUrl).origin,deadline=Date.now()+15000;let target=null;
  while(Date.now()<deadline&&!target){const targets=await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl&&item.url.startsWith(origin));if(!target)await sleep(100);}
  if(!target)throw new Error("Edge did not expose a page target");
  const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});
  function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id,timer=setTimeout(()=>{if(pending.delete(requestId))reject(new Error(`DevTools request timed out: ${method}`));},20000);pending.set(requestId,{resolve,reject,timer});socket.send(JSON.stringify({id:requestId,method,params}));});}
  async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  return {socket,send,evaluate};
}
async function launch(profile,url){
  const child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
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
    const memoryCamp=await first.evaluate(`(()=>{const api=window.DiceboundMemoryDiagnostics;api.clear();const sample=api.snapshot('edge:fresh-camp');return {sample,runtimeVersion:window.DiceboundVersion.version,diagnostics:api.diagnostics(),controls:['memoryDiagnosticsSnapshot','memoryDiagnosticsRecord','memoryDiagnosticsClear'].every(id=>!!document.getElementById(id))};})()`);
    assert.equal(memoryCamp.controls,true,"Memory Diagnostics Debug controls are missing");assert.equal(memoryCamp.sample.identity.version,memoryCamp.runtimeVersion);assert.equal(memoryCamp.sample.state.screen,"Camp");assert.ok(memoryCamp.sample.dom.nodeCount>0,"Memory Diagnostics did not count the live DOM");assert.equal(memoryCamp.sample.timers.available,false,"untracked timers must remain unavailable instead of fabricated");assert.equal(memoryCamp.sample.nativeProcess.available,false,"browser diagnostics must not fabricate native process memory");console.log(`Edge Memory Diagnostics Camp baseline: heap=${memoryCamp.sample.heap.usedBytes===null?'unavailable':memoryCamp.sample.heap.usedBytes} DOM=${memoryCamp.sample.dom.nodeCount}`);
    await first.evaluate(`new Promise(resolve=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)),180))`);
    const friendsUi=await first.evaluate(`(()=>{const groups=window.DiceboundAchievementHierarchyTest.render(),camp=window.DiceboundCampHitTargetTest.inspect();return {groups,camp,classCount:Object.keys(window.DiceboundContent.classes).length};})()`);
    assert.deepEqual(friendsUi.groups.map(group=>group.id),['top:roads','top:builds','top:legacy','top:secrets','top:hero-mastery']);assert.equal(friendsUi.groups.at(-1).subgroups,friendsUi.classCount,"Hero Mastery must reserve one subgroup per playable class without revealing secrets");assert.ok(friendsUi.camp.filter(item=>item.present).every(item=>item.semantic&&item.focusable),"a visible Camp interaction lost its semantic button/focus target");assert.ok(friendsUi.camp.filter(item=>item.present&&item.painted).every(item=>item.button.width<=item.painted.width+3&&item.button.height<=item.painted.height+3),`Camp has a detached visual hit target: ${JSON.stringify(friendsUi.camp)}`);
    const combatBackgrounds=await first.evaluate(`(()=>{const normal=[1,2,3,4,5,6].map(board=>window.DiceboundCombatBackgrounds?.resolve(board,'normal')?.image||null),nightmare=window.DiceboundCombatBackgrounds?.resolve(3,'nightmare')||null,active=window.DiceboundCombatBackgrounds?.active()?.image||null,overlay=document.getElementById('combatOverlay');return {normal,nightmare,active,attribute:overlay?.dataset.combatBackground||null,style:overlay?.style.getPropertyValue('--db0635-combat-background-image')||null};})()`);
    assert.deepEqual(combatBackgrounds.normal,[1,2,3,4,5,6].map(board=>`assets/combat/backgrounds/board-${board}-normal.png`));assert.equal(combatBackgrounds.nightmare,null,"Nightmare must not use an invented Normal background");assert.equal(combatBackgrounds.active,'assets/combat/backgrounds/board-1-normal.png');assert.equal(combatBackgrounds.attribute,'board-1-normal');assert.match(combatBackgrounds.style,/board-1-normal\.png/);
    const created=await first.evaluate(`(async()=>{
      window.DiceboundRng.seed('edge-resume-seed');document.getElementById('campGoBtn').click();
      await new Promise(resolve=>setTimeout(resolve,240));
      const automaticSaved=!!window.DiceboundRunCheckpoint.load().checkpoint;
      const checkpoint=window.DiceboundRunResumeTest.snapshot();checkpoint.run.player.gold=321;checkpoint.run.player.position=Math.min(2,checkpoint.run.tiles.length-1);checkpoint.summary.gold=321;checkpoint.summary.tile=checkpoint.run.player.position+1;
      window.DiceboundRunCheckpoint.store(checkpoint);const expected=[window.DiceboundRng.random(),window.DiceboundRng.random(),window.DiceboundRng.random()];
      const markerSources=[...document.querySelectorAll('.tile.enemy img.db-road-marker')].map(image=>image.getAttribute('src'));
      return {title:document.title,expectedTitle:'Dicebound: '+window.DiceboundVersion.channel+' v'+window.DiceboundVersion.version,checkpoint,expected,stable:window.DiceboundRunResumeTest.isStable(),automaticSaved,markerSources};
    })()`);
    assert.equal(created.title,created.expectedTitle);assert.equal(created.stable,true);assert.equal(created.automaticSaved,true,"starting a stable run did not autosave");assert.equal(created.checkpoint.run.player.gold,321);
    const memoryRun=await first.evaluate(`(async()=>{const api=window.DiceboundMemoryDiagnostics;api.setRecording(true);const overlay=document.getElementById('infoOverlay');overlay.classList.remove('hidden');await new Promise(resolve=>setTimeout(resolve,35));overlay.classList.add('hidden');await new Promise(resolve=>setTimeout(resolve,35));const sample=api.snapshot('edge:board');const samples=api.samples();api.setRecording(false);return {sample,reasons:samples.map(entry=>entry.reason),screens:samples.map(entry=>entry.state.screen),diagnostics:api.diagnostics()};})()`);
    assert.equal(memoryRun.sample.state.screen,"Board");assert.ok(memoryRun.reasons.includes('recording-enabled'),"recording did not create its initial bounded sample");assert.ok(memoryRun.screens.includes('Modal'),"recording did not capture a major overlay lifecycle state");assert.equal(memoryRun.diagnostics.recording,false,"recording toggle did not stop its sampler");console.log(`Edge Memory Diagnostics Board baseline: heap=${memoryRun.sample.heap.usedBytes===null?'unavailable':memoryRun.sample.heap.usedBytes} DOM=${memoryRun.sample.dom.nodeCount} samples=${memoryRun.reasons.length}`);
    const vines=await first.evaluate(`(async()=>{const api=window.DiceboundNatureVfxTest,effect=api.effect(),load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;}),frames=await Promise.all(effect.frames.map(load)),targets=api.livingTargets([{name:'defeated',hp:0},{name:'living',hp:4},{name:'missing'}]),preview=api.previewPlayer();await new Promise(resolve=>setTimeout(resolve,110));const active=api.active();await new Promise(resolve=>setTimeout(resolve,620));return {frames,targets,preview,active,after:api.active(),style:!!document.getElementById('dicebound-nature-vfx-style')};})()`);
    assert.equal(vines.style,true,"Nature VFX stylesheet is missing");assert.equal(vines.preview,true);assert.deepEqual(vines.targets,['living']);assert.equal(vines.frames.length,8);for(const frame of vines.frames)assert.deepEqual(frame,{width:272,height:724});assert.equal(vines.active.length,1);assert.equal(vines.active[0].target,'player');assert.deepEqual(vines.after,[]);
    const donuts=await first.evaluate(`(async()=>{const api=window.DiceboundDonutVfxTest,effect=api.effect(),played=api.play();await new Promise(resolve=>setTimeout(resolve,120));const active=api.active();await new Promise(resolve=>setTimeout(resolve,1600));return {effect,played,active,after:api.active()};})()`);
    assert.equal(donuts.effect.image,'assets/combat/effects/donut-proc-rain-spritesheet.png');assert.equal(donuts.played,true,"Donut VFX did not attach to the combat presentation host");assert.deepEqual(donuts.active,[{src:'assets/combat/effects/donut-proc-rain-spritesheet.png',effect:'donutProcRain'}]);assert.deepEqual(donuts.after,[],"Donut VFX did not clean up after its authored duration");
    const natureProc=await first.evaluate(`(async()=>{const api=window.DiceboundNatureVfxTest,nature=api.exerciseProc('nature');await new Promise(resolve=>setTimeout(resolve,110));const active=api.active();const ordinary=api.exerciseProc('fire');return {nature,active,ordinary,afterOrdinary:api.active()};})()`);
    assert.equal(natureProc.nature.activated,true,"forced Nature proc did not activate");assert.deepEqual(natureProc.nature.enemies.map(enemy=>enemy.hp),[0,8,8]);assert.deepEqual(natureProc.nature.enemies.map(enemy=>enemy.poisonStacks),[0,1,1]);assert.deepEqual(natureProc.active.map(effect=>effect.enemyIndex),[1,2],"Nature VFX must follow living targets actually affected by the pack proc");assert.ok(natureProc.active.every(effect=>effect.target==='enemy'));assert.equal(natureProc.nature.legacyPresentation.nature,0,"authored Nature vines must replace the legacy generic Nature effect");
    assert.equal(natureProc.ordinary.activated,true,"ordinary forced proc did not activate");assert.deepEqual(natureProc.afterOrdinary,[],"ordinary non-Nature proc created a Nature VFX overlay");assert.ok(natureProc.ordinary.legacyPresentation.fire>0,"ordinary Fire proc lost its generic elemental presentation");assert.equal(natureProc.ordinary.legacyPresentation.nature,0,"Fire proc created a legacy Nature presentation");
    const presentation=await first.evaluate(`(()=>['miniboss','final','slime','wolf'].map(kind=>window.DiceboundNatureVfxTest.exercisePresentation(kind)))()`);
    const byKind=Object.fromEntries(presentation.map(entry=>[entry.kind,entry]));const narrow=byKind.final.narrow,minimumMini=narrow?{width:190,height:200}:{width:250,height:250},minimumFinal=narrow?{width:250,height:265}:{width:320,height:330};assert.match(byKind.miniboss.hostClasses,/miniboss/);assert.match(byKind.final.hostClasses,/final-boss/);assert.ok(byKind.miniboss.art.width>=minimumMini.width&&byKind.miniboss.art.height>=minimumMini.height,`miniboss frame regressed below the approved visual floor: ${JSON.stringify(byKind.miniboss)}`);assert.ok(byKind.final.art.width>=minimumFinal.width&&byKind.final.art.height>=minimumFinal.height,`final-boss frame regressed below the approved visual floor: ${JSON.stringify(byKind.final)}`);assert.ok(byKind.final.art.width>byKind.miniboss.art.width&&byKind.final.art.height>byKind.miniboss.art.height,`final boss must remain more imposing than miniboss: ${JSON.stringify({miniboss:byKind.miniboss,final:byKind.final})}`);assert.ok(byKind.final.art.width>byKind.final.player.width,`final boss portrait must be larger than the player portrait: ${JSON.stringify(byKind.final)}`);assert.match(byKind.slime.stageClasses,/db0636-tiered-enemy-stage/);assert.match(byKind.wolf.stageClasses,/db0636-tiered-enemy-stage/);assert.ok(byKind.slime.sprite.width>0&&byKind.slime.sprite.height>0,`Slime tier art did not render: ${JSON.stringify(byKind.slime)}`);assert.deepEqual(byKind.wolf.sprite,byKind.slime.sprite,"Wolf and Slime tier art must share the ordinary-enemy responsive stage");assert.ok(byKind.slime.sprite.height<byKind.miniboss.art.height,"tiered ordinary-enemy art must remain vertically smaller than guardian art");
    assert.ok(created.markerSources.length>0,"board did not render any semantic ordinary-enemy markers");assert.ok(created.markerSources.every(src=>/assets\/enemies\/normal\/board-markers\/[a-z-]+\.png$/.test(src||'')),"board used a non-semantic ordinary-enemy marker source");
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
