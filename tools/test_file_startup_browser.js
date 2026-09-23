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

    // #453: selected Class, Nightmare, Chest and Pet are art-only semantic
    // Camp controls. Fresh-save mode/storage locks may physically remove
    // Nightmare/Chest, so verify present controls and their accessible names.
    const campControls=await page.evaluate(`(()=>{const spec={campClassBtn:'Class',campNightmareBtn:'Nightmare',campChestBtn:'Heirloom Vault',campPetBtn:'Companion'},out={};for(const [id,label] of Object.entries(spec)){const node=document.getElementById(id);if(!node){out[id]={present:false,label};continue;}const r=node.getBoundingClientRect(),visual=node.querySelector('.camp-icon')?.getBoundingClientRect();out[id]={present:true,label:node.getAttribute('aria-label')||'',text:(node.innerText||'').trim(),button:{w:r.width,h:r.height},visual:visual?{w:visual.width,h:visual.height}:null,painted:node.dataset.db064HitTarget||''};}return out;})()`);
    for(const [id,expected] of Object.entries({campClassBtn:'Class',campNightmareBtn:'Nightmare',campChestBtn:'Heirloom Vault',campPetBtn:'Companion'})){
      const item=campControls[id];if(!item.present)continue;
      assert.equal(item.label,expected,`${id} lost its accessible name`);
      assert.equal(item.text,'',`${id} must be visually art-only`);
      assert.equal(item.painted,'painted-object',`${id} must use painted-object hit targeting`);
      if(item.visual){assert.ok(Math.abs(item.button.w-item.visual.w)<6&&Math.abs(item.button.h-item.visual.h)<6,`${id} click box drifted away from visible art: ${JSON.stringify(item)}`);}
    }

    // #236: verify the actual Camp Class chooser in real Edge across the three
    // desktop regimes and while resizing live. It must own one persistent Done.
    const opened=await page.evaluate(`(()=>{document.getElementById('campClassBtn')?.click();return true;})()`);assert.equal(opened,true);
    await sleep(220);
    async function chooserSnapshot(){
      return page.evaluate(`(()=>{const panel=document.getElementById('campClassPanel'),popup=document.getElementById('campPopupLayer'),shell=panel?.querySelector('.class-chooser-shell'),done=panel?.querySelector('[data-class-chooser-done]'),allDone=panel?.querySelectorAll('[data-app-dismiss]')||[],pr=panel?.getBoundingClientRect(),rr=popup?.getBoundingClientRect(),sr=shell?.getBoundingClientRect(),dr=done?.getBoundingClientRect(),visible=node=>!!node&&node.getClientRects().length>0&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden';return {vw:innerWidth,vh:innerHeight,active:!!panel?.classList.contains('active'),panel:pr?{left:pr.left,right:pr.right,top:pr.top,bottom:pr.bottom,width:pr.width,height:pr.height}:null,popup:rr?{left:rr.left,right:rr.right,top:rr.top,bottom:rr.bottom,width:rr.width,height:rr.height}:null,shell:sr?{left:sr.left,right:sr.right,top:sr.top,bottom:sr.bottom,width:sr.width,height:sr.height}:null,done:dr?{left:dr.left,right:dr.right,top:dr.top,bottom:dr.bottom,width:dr.width,height:dr.height,visible:visible(done)}:null,dismissCount:allDone.length};})()`);
    }
    async function assertChooser(width,height,label){
      await page.send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});await sleep(220);
      const snap=await chooserSnapshot();
      assert.equal(snap.active,true,`${label}: Class chooser closed during live resize`);
      assert.ok(snap.popup&&Math.abs((snap.popup.left+snap.popup.right)/2-snap.vw/2)<=3,`${label}: popup is not horizontally centered: ${JSON.stringify(snap)}`);
      assert.ok(snap.panel&&snap.panel.left>=-2&&snap.panel.right<=snap.vw+2,`${label}: panel escapes viewport horizontally: ${JSON.stringify(snap)}`);
      assert.ok(snap.shell&&snap.shell.width>300&&snap.shell.height>180,`${label}: chooser shell is unusable: ${JSON.stringify(snap)}`);
      assert.ok(snap.done?.visible&&snap.done.top>=-2&&snap.done.bottom<=snap.vh+2&&snap.done.right<=snap.vw+2,`${label}: persistent Done is clipped/unreachable: ${JSON.stringify(snap)}`);
      assert.equal(snap.dismissCount,1,`${label}: Class chooser must own exactly one visible semantic Done action`);
      return snap;
    }
    await assertChooser(1680,1000,'wide desktop');
    await assertChooser(1200,800,'compact desktop');
    await assertChooser(1200,620,'short-wide desktop');
    await assertChooser(1680,1000,'live resize restore');

    await page.evaluate(`(()=>{window.__classChooserDoneClicks=0;const done=document.querySelector('#campClassPanel [data-class-chooser-done]');done?.addEventListener('click',()=>window.__classChooserDoneClicks++,{capture:true});})()`);
    await page.send("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
    await page.send("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
    await sleep(180);
    const escaped=await page.evaluate(`(()=>({active:document.getElementById('campClassPanel')?.classList.contains('active')||false,doneClicks:window.__classChooserDoneClicks||0}))()`);
    assert.equal(escaped.active,false,"Escape must dismiss the open Class chooser");
    assert.equal(escaped.doneClicks,1,"Escape must invoke the visible Class chooser Done action exactly once");
    console.log("Class chooser Edge PASS: wide/compact/short-wide centering, live resize, persistent Done and Escape dismissal");

    const art=await page.evaluate(`(async()=>{const assets=window.DiceboundAssets,load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas'),context=canvas.getContext('2d');canvas.width=canvas.height=1;context.drawImage(image,0,0,1,1);resolve({src,width:image.naturalWidth,height:image.naturalHeight,cornerAlpha:context.getImageData(0,0,1,1).data[3]});};image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;});const pet=assets.resolvePetArt('math'),goblin=[1,2,3,4,5,6].map(board=>assets.resolveEnemyBattleArtById('goblin',board)),skeleton=[1,2,3,4,5,6].map(board=>assets.resolveEnemyBattleArtById('skeleton',board)),sources=[pet.portrait,pet.battle,...goblin.map(entry=>entry.src),...skeleton.map(entry=>entry.src)];return {pet,goblin,skeleton,loaded:await Promise.all(sources.map(load))};})()`);
    assert.deepEqual(art.pet,{portrait:"assets/characters/pets/portraits/math.png",battle:"assets/characters/pets/battle/math.png",alt:"math"});
    for(const [index,entry] of art.goblin.entries())assert.deepEqual(entry,{key:"goblin",src:`assets/enemies/normal/battle/goblin/board-${index+1}.png`,alt:"Goblin",board:index+1});
    for(const [index,entry] of art.skeleton.entries())assert.deepEqual(entry,{key:"skeleton",src:`assets/enemies/normal/battle/skeleton/board-${index+1}.png`,alt:"Skeleton",board:index+1});
    assert.equal(art.loaded.length,14,"all imported Euler, Goblin and Skeleton assets must be loaded by Edge");
    for(const loaded of art.loaded){assert.ok(loaded.width>=1000&&loaded.height>=1000,`imported artwork did not retain its full-resolution dimensions: ${loaded.src}`);assert.ok(loaded.cornerAlpha<255,`imported artwork has an opaque corner/matte: ${loaded.src}`);}
    console.log("Local file authored-art PASS: Euler plus Goblin/Skeleton Board 1--6 assets resolve and load with transparency");

    // #455: reproduce the 0.6.7.29 live regression with an old-style special
    // Hat while also proving the new rule: Impossible Road is named Artifact
    // gear layered over a real modern equipment identity + Intrinsic.
    const gearDetail=await page.evaluate(`(()=>{const item=window.DiceboundArtifacts.create('hat'),generatedId=item.equipmentId||null,generatedIdentity=window.DiceboundEquipment.identityForItem(item),generatedIntrinsic=window.DiceboundEquipment.intrinsicBonusesForItem(item);delete item.equipmentId;item.rarity='mythical';item.name='Equipment';item.icon='<img class="db-art-icon db-art-inline" src="assets/equipment/hat/helmet.png" alt="Helmet">';const before=window.DiceboundRunResumeTest.state().player;window.DiceboundItems.equip(item,true);window.DiceboundEquipmentHeirlooms.activateCharacterTab('gear');const after=window.DiceboundRunResumeTest.state().player,equipped=after.equipment?.hat||{},identity=window.DiceboundEquipment.identityForItem(equipped),intrinsic=window.DiceboundEquipment.intrinsicBonusesForItem(equipped),total=window.DiceboundEquipment.allBonusesForItem(equipped),intrinsicKey=Object.keys(intrinsic)[0]||null;const slot=document.querySelector('#equipmentGrid .slot-hat'),tip=slot?.dataset?.tip||'';slot?.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));const layer=document.getElementById('appTooltipLayer'),art=slot?.querySelector('img.db-equipment-slot-art');return {html:slot?.innerHTML||'',tip,aria:slot?.getAttribute('aria-label')||'',tooltip:layer?.textContent||'',storedIcon:equipped.icon||'',generatedId,generatedSlot:generatedIdentity?.slot||null,generatedIntrinsicCount:Object.keys(generatedIntrinsic).length,equipmentId:equipped.equipmentId||null,identityName:identity?.displayName||null,intrinsic,intrinsicKey,expectedDelta:intrinsicKey!=null?Number(total[intrinsicKey]||0):null,actualDelta:intrinsicKey!=null&&Number.isFinite(Number(before[intrinsicKey]))&&Number.isFinite(Number(after[intrinsicKey]))?Number(after[intrinsicKey])-Number(before[intrinsicKey]):null,artSrc:art?.getAttribute('src')||null};})()`);
    assert.ok(gearDetail.generatedId,"Impossible Road factory must assign a modern equipmentId before presentation");
    assert.equal(gearDetail.generatedSlot,'hat',"Impossible Road factory selected a wrong-slot identity");
    assert.ok(gearDetail.generatedIntrinsicCount>0,"Impossible Road factory base identity must carry an Intrinsic");
    assert.equal(gearDetail.equipmentId,gearDetail.generatedId,"old special save migration must deterministically recover the generated base identity");
    assert.ok(gearDetail.identityName,"migrated special Hat lost its modern base identity");
    assert.ok(Object.keys(gearDetail.intrinsic).length>0,"migrated Impossible Road Hat has no Intrinsic");
    assert.ok(Math.abs(gearDetail.actualDelta-gearDetail.expectedDelta)<1e-9,`modern equipment Intrinsic did not reach the live equip stat transaction: ${JSON.stringify(gearDetail)}`);
    assert.equal(gearDetail.storedIcon,'👑',"historical Hat HTML icon contamination must be repaired in live item state");
    assert.match(gearDetail.artSrc||'',/^assets\/equipment\/hat\//,"Impossible Road Hat must render art from its modern equipmentId");
    assert.doesNotMatch(gearDetail.html,/<img class="db-art-icon|&lt;img|<img class=\"db-art-icon/i,"Character Gear must never render persisted HTML icon text");
    assert.match(gearDetail.tip,/Crown of the Road That Should Not Exist/,"generic special-item names must recover canonical Artifact identity");
    assert.match(gearDetail.tip,/MYTHICAL · HAT/,"Gear detail must identify rarity and real slot");
    assert.match(gearDetail.tip,/INTRINSIC \(/,"Gear detail must expose the modern base identity Intrinsic");
    assert.match(gearDetail.tip,/Unique: Crown of the Fourth Road/,"Gear detail must include unique effect");
    assert.match(gearDetail.tip,/Set: Impossible Road/,"Gear detail must include set identity");
    assert.equal(gearDetail.aria,gearDetail.tip,"accessible Gear detail must match hover detail");
    assert.equal(gearDetail.tooltip,gearDetail.tip,"shared root tooltip must render the authoritative Gear detail");
    assert.doesNotMatch(gearDetail.tooltip,/<img|&lt;img/i,"Gear tooltip must never contain presentation markup");
    console.log("Character Gear Edge PASS: Impossible Road modern base identity + Intrinsic + old-save HTML repair");

    console.log("Local file Camp startup PASS");
  }finally{
    try{if(page)await page.send("Browser.close");}catch(_){}
    try{page?.socket.close();}catch(_){}
    if(child.exitCode===null)child.kill();
    try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
