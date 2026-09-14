from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / "runtime" / "js" / "dicebound.js"
TEST = ROOT / "tools" / "test_camp_shell_oracle.js"

source = MONOLITH.read_text(encoding="utf-8")
if "DiceboundCampShellOracleTest" in source:
    raise SystemExit("Camp/App-Shell oracle seam already exists")

marker = "\n\n  // Test-only characterization surface for the Classes subsystem migration."
if marker not in source:
    raise SystemExit("Classes characterization marker not found")

seam = r'''

  // Test-only characterization surface for the Camp / App Shell convergence.
  // It freezes released 0.6.6.35 shell lifecycle/HUD behavior before the
  // historical openStartScreen/updateMetaUI/updateHUD wrapper ladders move.
  const dbCampShellOracleClone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  function dbCampShellOracleRng(action){
    const before=window.DiceboundRng.snapshot(),result=action(),after=window.DiceboundRng.snapshot();
    return {result:dbCampShellOracleClone(result),actionRngCalls:after.calls-before.calls,actionRngState:after.state};
  }
  function dbCampShellOracleHideBlocking(){
    DB_RUN_BLOCKING_OVERLAYS.forEach(id=>$(id)?.classList.add('hidden'));
    $('battleVictory')?.classList.add('hidden');
    currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;pendingLevelUps=0;combatBusy=false;
  }
  function dbCampShellOracleStableRun(classId='ranger',board=3){
    dbRunClearCheckpoint();dbClasses.clearSlimeRougeRuntime();resetPlayer(classId);boardLevel=board;nightmareMode=false;hellMode=false;
    gameStarted=true;runFinalized=false;rollLocked=false;combatBusy=false;currentEnemy=null;pendingLevelUps=0;player.position=0;
    dbCampShellOracleHideBlocking();$('startOverlay')?.classList.add('hidden');
    return dbCampShellOracleShellState();
  }
  function dbCampShellOracleImg(id){const root=$(id);return root?.querySelector?.('img')?.getAttribute('src')||null;}
  function dbCampShellOracleShellState(){
    const camp=window.DiceboundCamp,required=[...(camp?.requiredSemanticIds||[])],present=required.filter(id=>!!$(id));
    return {
      gameStarted:!!gameStarted,rollLocked:!!rollLocked,combatBusy:!!combatBusy,boardLevel,position:player?.position??null,
      overlayHidden:!!$('startOverlay')?.classList.contains('hidden'),campFullscreen:!!$('startOverlay')?.classList.contains('camp-fullscreen'),scene:!!$('campScene'),
      requiredCount:required.length,presentRequired:present,
      classStatus:String($('campClassStatus')?.textContent||''),petStatus:String($('campPetStatus')?.textContent||''),
      nightmareStatus:String($('campNightmareBtn')?.querySelector('.camp-sub')?.textContent||''),hellStatus:String($('campHellBtn')?.querySelector('.camp-sub')?.textContent||''),
      classArt:dbCampShellOracleImg('campClassFigure'),petArt:dbCampShellOracleImg('campPetFigure'),
      floorText:String($('floorText')?.textContent||''),guardianText:String($('guardianText')?.textContent||''),
      hpText:String($('hpText')?.textContent||''),attackText:String($('attackText')?.textContent||''),defenseText:String($('defenseText')?.textContent||''),goldText:String($('goldText')?.textContent||''),potionText:String($('potionText')?.textContent||''),
      critText:String($('critText')?.textContent||''),dodgeText:String($('dodgeText')?.textContent||''),lifeStealText:String($('lifeStealText')?.textContent||''),luckText:String($('luckText')?.textContent||''),echoText:String($('echoText')?.textContent||''),bossDamageText:String($('bossDamageText')?.textContent||''),
      heroArt:dbCampShellOracleImg('heroAvatar'),pawnArt:dbCampShellOracleImg('pawn'),combatArt:dbCampShellOracleImg('combatPlayerIcon'),
      combatHidden:!!$('combatOverlay')?.classList.contains('hidden'),victoryHidden:!!$('battleVictory')?.classList.contains('hidden'),checkpoint:DB_RUN_CHECKPOINT.has()
    };
  }
  function dbCampShellOracleStartup(){return dbCampShellOracleShellState();}
  function dbCampShellOracleRecovery(){
    window.DiceboundRng.seed('camp-shell-recovery-setup');
    const before=window.DiceboundRng.snapshot(),result=window.DiceboundFriendsPatchTest.exerciseCampRecovery(),after=window.DiceboundRng.snapshot();
    return {result:dbCampShellOracleClone(result),actionRngCalls:after.calls-before.calls,actionRngState:after.state,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleCheckpointReset(){
    dbCampShellOracleStableRun('ranger',3);player.hp=1;const saved=dbRunWriteCheckpoint(),hadBefore=DB_RUN_CHECKPOINT.has();
    const action=dbCampShellOracleRng(()=>openStartScreen());
    return {saved,hadBefore,hasAfter:DB_RUN_CHECKPOINT.has(),hp:player.hp,maxHp:player.maxHp,actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleCampReset(){
    dbCampShellOracleStableRun('invoker',3);dbClasses.invokerBeginCombat();dbClasses.invokerAfterPlayerAction('guard');
    const invokerBefore=dbCampShellOracleClone(dbClasses._invokerTest.state(false));player.hp=Math.max(1,player.maxHp-7);
    $('combatOverlay')?.classList.remove('hidden');$('battleVictory')?.classList.remove('hidden');if($('combatText'))$('combatText').textContent='Camp shell oracle combat residue';
    const action=dbCampShellOracleRng(()=>openStartScreen()),invokerAfter=dbCampShellOracleClone(dbClasses._invokerTest.state(false));
    return {invokerBefore,invokerAfter,hp:player.hp,maxHp:player.maxHp,combatText:String($('combatText')?.textContent||''),actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleMetaRefresh(){
    dbCampShellOracleStableRun('ranger',3);openStartScreen();
    const action=dbCampShellOracleRng(()=>updateMetaUI());
    return {actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleHud(board,position,mode='normal'){
    dbCampShellOracleStableRun('ranger',board);nightmareMode=mode==='nightmare'||mode==='hell';hellMode=mode==='hell';player.position=position;
    const action=dbCampShellOracleRng(()=>updateHUD());
    return {mode,mini:currentMinibossTile(),count:currentTileCount(),actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleHudBoard5Pre(){return dbCampShellOracleHud(5,0,'normal');}
  function dbCampShellOracleHudBoard5Final(){dbCampShellOracleStableRun('ranger',5);return dbCampShellOracleHud(5,currentMinibossTile()-1,'normal');}
  function dbCampShellOracleHudBoard6Pre(){return dbCampShellOracleHud(6,0,'normal');}
  function dbCampShellOracleHudBoard6Final(){dbCampShellOracleStableRun('ranger',6);return dbCampShellOracleHud(6,currentMinibossTile()-1,'normal');}
  function dbCampShellOracleHudHell(){return dbCampShellOracleHud(3,4,'hell');}
  function dbCampShellOracleHudStats(){
    dbCampShellOracleStableRun('ranger',3);Object.assign(player,{hp:23,maxHp:47,attack:17,defense:6,flatReduction:2,gold:123,potions:4,crit:.37,dodge:.11,lifeSteal:.19,luck:.42,doubleStrike:.88,bossDamage:.31});
    const action=dbCampShellOracleRng(()=>updateHUD());
    return {actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  async function dbCampShellOracleHudCheckpoint(){
    dbCampShellOracleStableRun('ranger',3);dbRunClearCheckpoint();const action=dbCampShellOracleRng(()=>updateHUD());const immediate=DB_RUN_CHECKPOINT.has();
    await new Promise(resolve=>setTimeout(resolve,260));
    return {immediate,afterDelay:DB_RUN_CHECKPOINT.has(),loaded:!!DB_RUN_CHECKPOINT.load()?.checkpoint,actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleArtRefresh(){
    dbCampShellOracleStableRun('ranger',2);const before={classArt:dbCampShellOracleImg('campClassFigure'),petArt:dbCampShellOracleImg('campPetFigure')};
    const action=dbCampShellOracleRng(()=>openStartScreen());
    return {before,after:{classArt:dbCampShellOracleImg('campClassFigure'),petArt:dbCampShellOracleImg('campPetFigure')},actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  window.DiceboundCampShellOracleTest=Object.freeze({
    apiVersion:1,state:()=>dbCampShellOracleShellState(),startup:dbCampShellOracleStartup,recovery:dbCampShellOracleRecovery,checkpointReset:dbCampShellOracleCheckpointReset,campReset:dbCampShellOracleCampReset,metaRefresh:dbCampShellOracleMetaRefresh,
    hudBoard5Pre:dbCampShellOracleHudBoard5Pre,hudBoard5Final:dbCampShellOracleHudBoard5Final,hudBoard6Pre:dbCampShellOracleHudBoard6Pre,hudBoard6Final:dbCampShellOracleHudBoard6Final,hudHell:dbCampShellOracleHudHell,hudStats:dbCampShellOracleHudStats,hudCheckpoint:dbCampShellOracleHudCheckpoint,artRefresh:dbCampShellOracleArtRefresh,
    cleanup:()=>{dbRunClearCheckpoint();dbClasses.invokerResetCombat();dbCampShellOracleHideBlocking();openStartScreen();return true;}
  });
'''

source = source.replace(marker, seam + marker, 1)
MONOLITH.write_text(source, encoding="utf-8", newline="\n")

TEST.write_text(r'''#!/usr/bin/env node
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
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const targets=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=targets.find(entry=>entry.type==="page"&&entry.webSocketDebuggerUrl&&entry.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",event=>{const message=JSON.parse(String(event.data)),request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});}async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}return {socket,send,evaluate};}

function assertCoverage(actual){
  assert.equal(actual.baselineVersion,"0.6.6.35");
  const expected=["startup-camp","camp-recovery","camp-entry-checkpoint-reset","camp-entry-reset","meta-refresh","hud-board5-premini","hud-board5-final","hud-board6-premini","hud-board6-final","hud-hell-floor","hud-stat-sync","hud-checkpoint-schedule","camp-art-refresh"];
  assert.deepEqual(actual.cases.map(entry=>entry.name),expected,"Camp/App-Shell oracle case set drifted");
  for(const entry of actual.cases){if(Object.hasOwn(entry.result||{},"actionRngCalls"))assert.equal(entry.result.actionRngCalls,0,`${entry.name} shell action consumed gameplay RNG`);}
  const startup=actual.cases[0].result;assert.equal(startup.scene,true);assert.equal(startup.campFullscreen,true);assert.ok(startup.requiredCount>=8);assert.equal(startup.presentRequired.length,startup.requiredCount);
  const recovery=actual.cases.find(entry=>entry.name==="camp-recovery").result;assert.equal(recovery.result.hp,recovery.result.maxHp);assert.equal(recovery.result.campVisible,true);
  const checkpoint=actual.cases.find(entry=>entry.name==="camp-entry-checkpoint-reset").result;assert.equal(checkpoint.saved,true);assert.equal(checkpoint.hadBefore,true);assert.equal(checkpoint.hasAfter,false);assert.equal(checkpoint.hp,checkpoint.maxHp);
  const reset=actual.cases.find(entry=>entry.name==="camp-entry-reset").result;assert.equal(reset.hp,reset.maxHp);assert.equal(reset.shell.combatHidden,true);assert.equal(reset.shell.victoryHidden,true);assert.notDeepEqual(reset.invokerBefore,reset.invokerAfter,"Camp entry must reset Invoker combat state");
  const b5pre=actual.cases.find(entry=>entry.name==="hud-board5-premini").result.shell.guardianText,b5final=actual.cases.find(entry=>entry.name==="hud-board5-final").result.shell.guardianText;assert.notEqual(b5pre,b5final);
  const b6pre=actual.cases.find(entry=>entry.name==="hud-board6-premini").result.shell.guardianText,b6final=actual.cases.find(entry=>entry.name==="hud-board6-final").result.shell.guardianText;assert.notEqual(b6pre,b6final);assert.match(b6pre,/Abyssal Custodian/);assert.match(b6final,/Last Equation/);
  assert.match(actual.cases.find(entry=>entry.name==="hud-hell-floor").result.shell.floorText,/Hell Mode/);
  const scheduled=actual.cases.find(entry=>entry.name==="hud-checkpoint-schedule").result;assert.equal(scheduled.immediate,false);assert.equal(scheduled.afterDelay,true);assert.equal(scheduled.loaded,true);
  const art=actual.cases.find(entry=>entry.name==="camp-art-refresh").result;assert.ok(art.after.classArt);assert.ok(art.after.petArt);
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Camp/App-Shell fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-camp-shell-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;let ready=false;while(Date.now()<end){ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundCamp&&!!window.DiceboundCampShellOracleTest&&!!window.DiceboundRunResumeTest&&!!window.DiceboundClasses&&!!window.DiceboundRng");if(ready)break;await sleep(100);}assert.ok(ready,"Camp/App-Shell oracle runtime surface did not become ready");
    const actual=await page.evaluate(`(async()=>{const api=window.DiceboundCampShellOracleTest,out=[];const add=(name,result)=>out.push({name,result:result==null?result:JSON.parse(JSON.stringify(result))});add('startup-camp',api.startup());add('camp-recovery',api.recovery());add('camp-entry-checkpoint-reset',api.checkpointReset());add('camp-entry-reset',api.campReset());add('meta-refresh',api.metaRefresh());add('hud-board5-premini',api.hudBoard5Pre());add('hud-board5-final',api.hudBoard5Final());add('hud-board6-premini',api.hudBoard6Pre());add('hud-board6-final',api.hudBoard6Final());add('hud-hell-floor',api.hudHell());add('hud-stat-sync',api.hudStats());add('hud-checkpoint-schedule',await api.hudCheckpoint());add('camp-art-refresh',api.artRefresh());api.cleanup();return {baselineVersion:'0.6.6.35',runtimeVersion:window.DiceboundVersion?.version||null,cases:out};})()`);
    assertCoverage(actual);
    if(CAPTURE){fs.mkdirSync(path.dirname(FIXTURE_PATH),{recursive:true});fs.writeFileSync(FIXTURE_PATH,JSON.stringify(actual,null,2)+"\n","utf8");console.log(`Camp/App-Shell fixture captured: ${FIXTURE_PATH}`);return;}
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));assert.equal(fixture.baselineVersion,"0.6.6.35");assert.deepEqual(actual.cases,fixture.cases);console.log(`Camp/App-Shell oracle PASS: ${actual.cases.length} exact released-0.6.6.35 cases`);
  }finally{try{page?.socket?.close();}catch(_){}try{child?.kill();}catch(_){}await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}}
}
main().catch(error=>{console.error(error?.stack||error);process.exitCode=1;});
''', encoding="utf-8", newline="\n")

print("Camp/App-Shell characterization seam and oracle materialized")
