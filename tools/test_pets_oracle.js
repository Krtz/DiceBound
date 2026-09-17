#!/usr/bin/env node
"use strict";

// Beta 0.6.6.27 Pets characterization/oracle harness.
// This intentionally exercises the released runtime's final Pet lifecycle and
// chooser behavior before DiceboundPets ownership moves. Capture mode prints the fixture.

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const RUNTIME=path.join(ROOT,"runtime");
const FIXTURE_PATH=path.join(__dirname,"fixtures","pets_0_6_6_27.json");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_PETS_DEBUG_PORT||19428);
const CAPTURE=process.env.DICEBOUND_CAPTURE_PETS==="1";
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname),rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,""),file=path.resolve(RUNTIME,rel);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const r=await fetch(url);if(r.ok)return r.json();}catch(_){}await sleep(100);}throw new Error(`timeout ${url}`);}
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const xs=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=xs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl&&x.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",ev=>{const m=JSON.parse(String(ev.data)),p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}return {socket,send,evaluate};}

function assertCoverage(actual){
  assert.equal(actual.baselineVersion,"0.6.6.27");
  const formula=actual.cases.filter(c=>c.kind==="formula");
  for(const level of [1,6,11,36])assert.ok(formula.some(c=>c.level===level),`missing pet formula level ${level}`);
  assert.ok(actual.cases.some(c=>c.kind==="feed"&&c.name==="feed-multi-level"),"missing multi-level feed case");
  assert.ok(actual.cases.some(c=>c.name==="unlock-below-threshold"),"missing below-threshold unlock case");
  assert.ok(actual.cases.some(c=>c.name==="unlock-at-threshold"),"missing threshold unlock case");
  assert.ok(actual.cases.some(c=>c.name==="switch-run-nonpet-denied"),"missing normal-class run switch restriction");
  assert.ok(actual.cases.some(c=>c.name==="switch-run-petclass-allowed"),"missing pet-tag run switch allowance");
  assert.ok(actual.cases.some(c=>c.name==="bonus-fire-swap"),"missing Fire active-stat bonus case");
  assert.ok(actual.cases.some(c=>c.name==="bonus-donut-swap"),"missing Donut active-stat bonus case");
  assert.ok(actual.cases.some(c=>c.kind==="view"),"missing Pet chooser view-model case");
  assert.ok(actual.cases.some(c=>c.kind==="trainer"),"missing Trainer shuffle case");
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Pets fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-pets-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;let ready=false;while(Date.now()<end){ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundPetsOracleTest&&!!window.DiceboundPetChooser&&!!window.DiceboundRng");if(ready)break;await sleep(100);}assert.ok(ready,"Pet oracle runtime surface did not become ready");

    // Keep UI boot timing out of the characterization expression. A long-lived
    // async Runtime.evaluate promise is occasionally collected by headless Edge.
    await page.evaluate("document.getElementById('campGoBtn')?.click();true");
    await sleep(300);
    await page.evaluate("document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');true");

    const actual=await page.evaluate(`(()=>{
      window.DiceboundRng.seed('pets-template');const template=window.DiceboundRunResumeTest.snapshot();
      const outputs=[],pet=window.DiceboundPetsOracleTest;
      const restore=(name,{classId='ranger',activePet='neutral',runActive=true}={})=>{const cp=structuredClone(template);cp.run.player.classId=classId;cp.meta.activePet=activePet;for(const id of Object.keys(cp.meta.pets||{})){cp.meta.pets[id].unlocked=true;cp.meta.pets[id].level=1;cp.meta.pets[id].xp=0;cp.meta.pets[id].xpNext=2;}cp.meta.petCookies=20;for(const key of Object.keys(cp.meta.elementProgress||{}))cp.meta.elementProgress[key]=0;window.DiceboundRunResumeTest.restore(cp);pet.setRunActive(runActive);window.DiceboundRng.seed('pets-oracle:'+name);return window.DiceboundRng.snapshot();};
      const finish=(record,before)=>{const after=window.DiceboundRng.snapshot();outputs.push({...record,rngCalls:after.calls-before.calls,rngState:after.state});};
      const snap=()=>pet.snapshot();

      for(const [name,id,level] of [['neutral-baseline','neutral',1],['bond-level-1','fire',1],['bond-level-6','fire',6],['bond-level-11','fire',11],['bond-cap-36','fire',36]]){const before=restore(name,{activePet:id,runActive:false});pet.setPetLevel(id,level);finish({name,kind:'formula',id,level,damage:pet.damage(id),bonusScale:pet.bonusScale(id),damageExtra:pet.damageExtra(id),bonusText:pet.bonusText(id)},before);}

      {const before=restore('feed-single',{activePet:'fire',runActive:false});pet.feed(1);finish({name:'feed-single',kind:'feed',state:snap()},before);}
      {const before=restore('feed-multi-level',{activePet:'fire',runActive:false});pet.setPetState('fire',{level:1,xp:1,xpNext:2,unlocked:true});pet.feed(6);finish({name:'feed-multi-level',kind:'feed',state:snap()},before);}
      {const before=restore('feed-cookie-bonus',{activePet:'fire',runActive:false});pet.setCookieBondBonus(1);pet.feed(2);finish({name:'feed-cookie-bonus',kind:'feed',state:snap()},before);}

      {const before=restore('unlock-below-threshold',{activePet:'neutral',runActive:false});pet.lockPet('fire');pet.trackElement('fire',499);finish({name:'unlock-below-threshold',kind:'unlock',state:snap()},before);}
      {const before=restore('unlock-at-threshold',{activePet:'neutral',runActive:false});pet.lockPet('fire');pet.trackElement('fire',500);finish({name:'unlock-at-threshold',kind:'unlock',state:snap()},before);}

      {const before=restore('switch-camp',{classId:'ranger',activePet:'neutral',runActive:false});const allowed=pet.canSwitch('fire'),selected=pet.select('fire');finish({name:'switch-camp',kind:'switch',allowed,selected,state:snap()},before);}
      {const before=restore('switch-run-nonpet-denied',{classId:'ranger',activePet:'neutral',runActive:true});const allowed=pet.canSwitch('fire'),selected=pet.select('fire');finish({name:'switch-run-nonpet-denied',kind:'switch',allowed,selected,state:snap()},before);}
      {const before=restore('switch-run-petclass-allowed',{classId:'beastmaster',activePet:'neutral',runActive:true});const allowed=pet.canSwitch('fire'),selected=pet.select('fire');finish({name:'switch-run-petclass-allowed',kind:'switch',allowed,selected,state:snap()},before);}

      {const before=restore('bonus-fire-swap',{classId:'ranger',activePet:'neutral',runActive:true});pet.setPetLevel('fire',11);pet.syncBonus(true);const beforeStats=pet.playerStats();pet.forceActivePet('fire');pet.syncBonus();const afterStats=pet.playerStats();finish({name:'bonus-fire-swap',kind:'bonus',beforeStats,afterStats,state:snap()},before);}
      {const before=restore('bonus-donut-swap',{classId:'ranger',activePet:'neutral',runActive:true});pet.setPetLevel('donut',6);pet.syncBonus(true);const beforeStats=pet.playerStats();pet.forceActivePet('donut');pet.syncBonus();const afterStats=pet.playerStats();finish({name:'bonus-donut-swap',kind:'bonus',beforeStats,afterStats,state:snap()},before);}
      {const before=restore('bonus-neutral-remove',{classId:'ranger',activePet:'fire',runActive:true});pet.setPetLevel('fire',6);pet.syncBonus(true);const beforeStats=pet.playerStats();pet.forceActivePet('neutral');pet.syncBonus();const afterStats=pet.playerStats();finish({name:'bonus-neutral-remove',kind:'bonus',beforeStats,afterStats,state:snap()},before);}

      {const before=restore('chooser-viewmodel',{classId:'ranger',activePet:'fire',runActive:false});pet.setPetLevel('fire',6);const model=window.DiceboundPetChooser.viewModel();finish({name:'chooser-viewmodel',kind:'view',active:model.activePet?.id||null,cookies:model.cookies,runActive:model.runActive,fire:model.pets.find(p=>p.id==='fire')||null,neutral:model.pets.find(p=>p.id==='neutral')||null},before);}
      {const before=restore('trainer-roster',{classId:'pokemontrainer',activePet:'neutral',runActive:true});const roster=pet.shuffledPetIds();finish({name:'trainer-roster',kind:'trainer',roster},before);}

      return {baselineVersion:'0.6.6.27',runtimeVersion:window.DiceboundVersion?.version||null,cases:outputs};
    })()`);
    assertCoverage(actual);
    if(CAPTURE){console.log("PETS_FIXTURE_BEGIN");console.log(JSON.stringify(actual,null,2));console.log("PETS_FIXTURE_END");return;}
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.equal(fixture.baselineVersion,"0.6.6.27","Pets fixture must remain the released 0.6.6.27 baseline");
    assert.deepEqual(actual.cases,fixture.cases);
    console.log(`Pets oracle PASS: ${actual.cases.length} exact released-output/state/RNG cases match ${fixture.baselineVersion} baseline on runtime ${actual.runtimeVersion}.`);
  } finally {
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(r=>server.close(r));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});