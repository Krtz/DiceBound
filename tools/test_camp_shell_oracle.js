#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const RUNTIME=path.join(ROOT,"runtime");
const FIXTURE_PATH=path.join(__dirname,"fixtures","camp_shell_0_6_6_35.json");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_CAMP_SHELL_DEBUG_PORT||19436);
const CAPTURE=process.env.DICEBOUND_CAPTURE_CAMP_SHELL==="1";
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname),rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,""),file=path.resolve(RUNTIME,rel);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}await sleep(100);}throw new Error(`timeout ${url}`);}
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(entry=>entry.type==="page"&&entry.webSocketDebuggerUrl&&entry.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),listeners=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(request){pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);return;}for(const handler of listeners.get(message.method)||[])handler(message.params||{});});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}function on(method,handler){const set=listeners.get(method)||new Set();set.add(handler);listeners.set(method,set);return()=>set.delete(handler);}return {socket,send,evaluate,on};}

function assertCoverage(actual){
  assert.equal(actual.baselineVersion,"0.6.6.35");
  const expected=["startup-camp","camp-recovery","camp-entry-checkpoint-reset","camp-entry-reset","meta-refresh","hud-board5-premini","hud-board5-final","hud-board6-premini","hud-board6-final","hud-hell-floor","hud-stat-sync","hud-checkpoint-schedule","camp-art-refresh"];
  assert.deepEqual(actual.cases.map(entry=>entry.name),expected,"Camp/App-Shell oracle case set drifted");
  for(const entry of actual.cases){if(Object.hasOwn(entry.result||{},"actionRngCalls"))assert.equal(entry.result.actionRngCalls,0,`${entry.name} shell action consumed gameplay RNG`);}
  const startup=actual.cases[0].result;assert.equal(startup.scene,true);assert.equal(startup.campFullscreen,true);assert.ok(startup.requiredCount>=8);assert.ok(startup.presentRequired.length>=7,'released starter Camp must expose its seven always-available semantic controls');
  const recovery=actual.cases.find(entry=>entry.name==="camp-recovery").result;assert.equal(recovery.result.hp,recovery.result.maxHp);assert.equal(recovery.result.campVisible,true);
  const checkpoint=actual.cases.find(entry=>entry.name==="camp-entry-checkpoint-reset").result;assert.equal(checkpoint.saved,true);assert.equal(checkpoint.hadBefore,true);assert.equal(checkpoint.hasAfter,false);assert.equal(checkpoint.hp,checkpoint.maxHp);
  const reset=actual.cases.find(entry=>entry.name==="camp-entry-reset").result;assert.equal(reset.hp,reset.maxHp);assert.equal(reset.shell.combatHidden,true);assert.notDeepEqual(reset.invokerBefore,reset.invokerAfter,"Camp entry must reset Invoker combat state");
  const b5pre=actual.cases.find(entry=>entry.name==="hud-board5-premini").result.shell.guardianText,b5final=actual.cases.find(entry=>entry.name==="hud-board5-final").result.shell.guardianText;assert.notEqual(b5pre,b5final);
  const b6pre=actual.cases.find(entry=>entry.name==="hud-board6-premini").result.shell.guardianText,b6final=actual.cases.find(entry=>entry.name==="hud-board6-final").result.shell.guardianText;assert.notEqual(b6pre,b6final);assert.match(b6pre,/Abyssal Custodian/);assert.match(b6final,/Last Equation/);
  assert.match(actual.cases.find(entry=>entry.name==="hud-hell-floor").result.shell.floorText,/Hell Mode/);
  const scheduled=actual.cases.find(entry=>entry.name==="hud-checkpoint-schedule").result;assert.equal(scheduled.immediate,false);assert.equal(scheduled.afterDelay,true);assert.equal(scheduled.loaded,true);
  const art=actual.cases.find(entry=>entry.name==="camp-art-refresh").result;assert.ok(art.after.classArt);assert.ok(art.after.petArt);
}

async function startupDiagnostics(page){
  const exceptions=[],consoleMessages=[];
  const offException=page.on("Runtime.exceptionThrown",params=>{const details=params.exceptionDetails||{},exception=details.exception||{};exceptions.push(exception.description||details.text||"unknown runtime exception");});
  const offConsole=page.on("Runtime.consoleAPICalled",params=>{if(!["error","warning"].includes(params.type))return;consoleMessages.push((params.args||[]).map(arg=>arg.value??arg.description??"").join(" "));});
  try{
    await page.send("Page.enable");await page.send("Runtime.enable");await page.send("Page.reload",{ignoreCache:true});
    await sleep(3500);
    const state=await page.evaluate(`(()=>({readyState:document.readyState,globals:{Camp:!!window.DiceboundCamp,CampShellOracle:!!window.DiceboundCampShellOracleTest,RunResume:!!window.DiceboundRunResumeTest,Classes:!!window.DiceboundClasses,Rng:!!window.DiceboundRng,Progression:!!window.DiceboundProgression,Run:!!window.DiceboundRun,Combat:!!window.DiceboundCombat,ElementContent:!!window.DiceboundElementContent},diceboundGlobals:Object.keys(window).filter(key=>key.startsWith('Dicebound')).sort()}))()`);
    return {state,exceptions,consoleMessages};
  }finally{offException();offConsole();}
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Camp/App-Shell fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-camp-shell-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    // Match the permanent browser smoke's isolated Edge launch contract. The
    // temporary headless profile must tolerate local Chromium child-process
    // sandbox denials without changing the shipped WebView2 wrapper.
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--disable-gpu-sandbox","--no-sandbox","--no-first-run","--no-default-browser-check","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;let ready=false;while(Date.now()<end){ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundCamp&&!!window.DiceboundCampShellOracleTest&&!!window.DiceboundRunResumeTest&&!!window.DiceboundClasses&&!!window.DiceboundRng");if(ready)break;await sleep(100);}if(!ready){const diagnostic=await startupDiagnostics(page);assert.fail(`Camp/App-Shell oracle runtime surface did not become ready\n${JSON.stringify(diagnostic,null,2)}`);}
    const actual=await page.evaluate(`(async()=>{const api=window.DiceboundCampShellOracleTest,out=[];const add=(name,result)=>out.push({name,result:result==null?result:JSON.parse(JSON.stringify(result))});add('startup-camp',api.startup());add('camp-recovery',api.recovery());add('camp-entry-checkpoint-reset',api.checkpointReset());add('camp-entry-reset',api.campReset());add('meta-refresh',api.metaRefresh());add('hud-board5-premini',api.hudBoard5Pre());add('hud-board5-final',api.hudBoard5Final());add('hud-board6-premini',api.hudBoard6Pre());add('hud-board6-final',api.hudBoard6Final());add('hud-hell-floor',api.hudHell());add('hud-stat-sync',api.hudStats());add('hud-checkpoint-schedule',await api.hudCheckpoint());add('camp-art-refresh',api.artRefresh());api.cleanup();return {baselineVersion:'0.6.6.35',runtimeVersion:window.DiceboundVersion?.version||null,cases:out};})()`);
    assertCoverage(actual);
    if(CAPTURE){fs.mkdirSync(path.dirname(FIXTURE_PATH),{recursive:true});fs.writeFileSync(FIXTURE_PATH,JSON.stringify(actual,null,2)+"\n","utf8");console.log(`Camp/App-Shell fixture captured: ${FIXTURE_PATH}`);return;}
    // The fixture remains the release-oracle baseline, with deliberate
    // presentation deltas (such as art-only Camp labels) updated explicitly.
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));assert.equal(fixture.baselineVersion,"0.6.6.35");assert.deepEqual(actual.cases,fixture.cases);console.log(`Camp/App-Shell oracle PASS: ${actual.cases.length} exact released-0.6.6.35 cases`);
  }finally{try{page?.socket?.close();}catch(_){}try{child?.kill();}catch(_){}await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}}
}
main().catch(error=>{console.error(error?.stack||error);process.exitCode=1;});
