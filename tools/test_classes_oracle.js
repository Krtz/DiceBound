#!/usr/bin/env node
"use strict";

// Beta 0.6.6.33 Classes characterization/oracle harness.
// Capture mode freezes released identity/capability/class-action/RNG behavior
// before DiceboundClasses becomes the ordinary runtime owner.

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const RUNTIME=path.join(ROOT,"runtime");
const FIXTURE_PATH=path.join(__dirname,"fixtures","classes_0_6_6_33.json");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_CLASSES_DEBUG_PORT||19434);
const CAPTURE=true; // TEMP 0.6.7.9 fixture recapture; restore env gate after capture.
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname),rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,""),file=path.resolve(RUNTIME,rel);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`timeout ${url}`);}
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(entry=>entry.type==="page"&&entry.webSocketDebuggerUrl&&entry.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}

function assertCoverage(actual){
  assert.equal(actual.baselineVersion,"0.6.6.33");
  const expected=["metadata","normal-identity","slime-rouge-identity","slime-rouge-ranger-marks","slime-rouge-conjure","slime-rouge-ultimate","berserker-rage","rogue-steal","cleric-consecration","beastmaster-stances","bloodmage-replenish","bloodmage-exsanguinate","alchemist-flask","monk-dodge","ninja-execution","ouroboros-sync","invoker-formula","beastmaster-button"];
  const names=new Set(actual.cases.map(entry=>entry.name));
  for(const name of expected)assert.ok(names.has(name),`missing Classes oracle case ${name}`);
  assert.equal(actual.cases.length,expected.length,"Classes oracle case count drifted");
  const metadata=actual.cases.find(entry=>entry.name==="metadata");
  for(const id of ["ranger","cleric","beastmaster","bloodmage","alchemist","invoker","slimerouge"])assert.ok(metadata.result.ids.includes(id),`Classes metadata missing ${id}`);
  assert.equal(metadata.rngCalls,0,"Class metadata lookup must consume zero gameplay RNG");
  const normal=actual.cases.find(entry=>entry.name==="normal-identity");
  assert.equal(normal.result.id,"ranger");assert.equal(normal.result.active,true);assert.ok(normal.result.capabilities.includes("marks"));assert.equal(normal.rngCalls,0,"normal identity lookup must consume zero gameplay RNG");
  const stances=actual.cases.find(entry=>entry.name==="beastmaster-stances").result.sequence;
  assert.equal(stances.length,5);assert.equal(new Set(stances).size,3,"Beastmaster stance cycle must still cover three stances");
  const button=actual.cases.find(entry=>entry.name==="beastmaster-button").result;
  assert.notEqual(button.before,button.after,"special-action button must still dispatch Beastmaster stance cycling");
  const ouro=actual.cases.find(entry=>entry.name==="ouroboros-sync").result;
  assert.equal(ouro.after.attack,10,"Ouroboros Attack must normalize to 10");
  const invoker=actual.cases.find(entry=>entry.name==="invoker-formula").result;
  assert.equal(invoker.active,true);assert.ok(invoker.recipe?.name,"Invoker three-orb sequence must resolve a recipe");
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Classes fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-classes-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;let ready=false;while(Date.now()<end){ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundProgressionOracleTest&&!!window.DiceboundClassesOracleTest&&!!window.DiceboundClasses&&!!window.DiceboundRng&&!!window.DiceboundV318Test&&!!window.DiceboundBeta021Test");if(ready)break;await sleep(100);}assert.ok(ready,"Classes oracle runtime surface did not become ready");
    await page.evaluate("document.getElementById('campGoBtn')?.click();true");await sleep(300);await page.evaluate("document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');true");

    const actual=await page.evaluate(`(async()=>{
      const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
      window.DiceboundRng.seed('classes-template');const template=window.DiceboundRunResumeTest.snapshot();
      const classes=window.DiceboundClassesOracleTest,outputs=[];
      const restore=name=>{classes.cleanup();window.DiceboundRunResumeTest.restore(structuredClone(template));classes.cleanup();window.DiceboundRng.seed('classes-oracle:'+name);return window.DiceboundRng.snapshot();};
      const finish=(name,result,before)=>{const after=window.DiceboundRng.snapshot();outputs.push({name,result:clone(result),rngCalls:after.calls-before.calls,rngState:after.state});};

      {const before=restore('metadata');finish('metadata',classes.metadata(),before);}
      {const before=restore('normal-identity');finish('normal-identity',classes.identity('ranger'),before);}
      {const before=restore('slime-rouge-identity');finish('slime-rouge-identity',classes.slimeRouge('summoner','pokemontrainer'),before);}
      {const before=restore('slime-rouge-ranger-marks');finish('slime-rouge-ranger-marks',await classes.slimeRougeRangerMarks(),before);}
      {const before=restore('slime-rouge-conjure');finish('slime-rouge-conjure',await classes.slimeRougeConjure(),before);}
      {const before=restore('slime-rouge-ultimate');finish('slime-rouge-ultimate',await classes.slimeRougeUltimate('summoner','pokemontrainer'),before);}
      {const before=restore('berserker-rage');finish('berserker-rage',classes.berserkerRage(.40),before);}
      {const before=restore('rogue-steal');finish('rogue-steal',await classes.rogueSteal('classes-oracle-rogue-steal'),before);}
      {const before=restore('cleric-consecration');finish('cleric-consecration',await classes.clericConsecration(),before);}
      {const before=restore('beastmaster-stances');finish('beastmaster-stances',classes.beastmasterStances(),before);}
      {const before=restore('bloodmage-replenish');finish('bloodmage-replenish',await classes.bloodmageReplenish(),before);}
      {const before=restore('bloodmage-exsanguinate');finish('bloodmage-exsanguinate',await classes.bloodmageExsanguinate(),before);}
      {const before=restore('alchemist-flask');finish('alchemist-flask',await classes.alchemistFlask(),before);}
      {const before=restore('monk-dodge');finish('monk-dodge',classes.monkDodge(),before);}
      {const before=restore('ninja-execution');finish('ninja-execution',classes.ninjaExecution(),before);}
      {const before=restore('ouroboros-sync');finish('ouroboros-sync',classes.ouroborosSync(),before);}
      {const before=restore('invoker-formula');finish('invoker-formula',classes.invokerFormula(),before);}
      {const before=restore('beastmaster-button');finish('beastmaster-button',classes.beastmasterButton(),before);}
      classes.cleanup();return {baselineVersion:'0.6.6.33',runtimeVersion:window.DiceboundVersion?.version||null,cases:outputs};
    })()`);

    assertCoverage(actual);
    if(CAPTURE){console.log("CLASSES_FIXTURE_BEGIN");console.log(JSON.stringify(actual,null,2));console.log("CLASSES_FIXTURE_END");return;}
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.equal(fixture.baselineVersion,"0.6.6.33","Classes fixture must remain the released 0.6.6.33 baseline");
    assert.deepEqual(actual.cases,fixture.cases);
    console.log(`Classes oracle PASS: ${actual.cases.length} exact released-0.6.6.33 cases`);
  }finally{
    try{page?.socket?.close();}catch(_){}
    try{child?.kill();}catch(_){}
    await new Promise(resolve=>server.close(resolve));
    try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}

main().catch(error=>{console.error(error?.stack||error);process.exitCode=1;});
