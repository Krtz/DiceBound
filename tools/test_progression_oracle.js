#!/usr/bin/env node
"use strict";

// Beta 0.6.6.28 Progression characterization/oracle harness.
// Capture mode freezes the released Talent/Legacy/Prestige/Achievement behavior
// before DiceboundProgression ownership moves.

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const RUNTIME=path.join(ROOT,"runtime");
const FIXTURE_PATH=path.join(__dirname,"fixtures","progression_0_6_6_28.json");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_PROGRESSION_DEBUG_PORT||19429);
const CAPTURE=process.env.DICEBOUND_CAPTURE_PROGRESSION==="1";
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname),rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,""),file=path.resolve(RUNTIME,rel);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const r=await fetch(url);if(r.ok)return r.json();}catch(_){}await sleep(100);}throw new Error(`timeout ${url}`);}
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const xs=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=xs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl&&x.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",ev=>{const m=JSON.parse(String(ev.data)),p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}return {socket,send,evaluate};}

function assertCoverage(actual){
  assert.equal(actual.baselineVersion,"0.6.6.28");
  const names=new Set(actual.cases.map(c=>c.name));
  for(const name of [
    "talent-baseline","talent-prereq-denied","talent-purchase","talent-max-denied","talent-repair","talent-accounting","talent-run-snapshot",
    "legacy-below","legacy-one-level","legacy-multi-level","run-finalize-legacy",
    "prestige-offers","prestige-reset-exact","prestige-reset-remainder","prestige-storage-checkpoint",
    "moon-held","moon-random-stats","moon-storage-chain","moon-refund","moon-normalize",
    "achievement-run","achievement-board","achievement-nature","achievement-prestige","achievement-secret","achievement-copy","achievement-gates","hero-mastery","achievement-count",
    "class-unlock-commit"
  ])assert.ok(names.has(name),`missing Progression oracle case ${name}`);
  const randomStats=actual.cases.find(c=>c.name==="moon-random-stats");
  assert.equal(randomStats?.rngCalls,5,"Prestige random-stat purchase must consume exactly five RNG draws");
  for(const c of actual.cases.filter(c=>c.name.startsWith("prestige-reset")))assert.equal(c.rngCalls,0,`${c.name} must not consume RNG`);
  const snapshot=actual.cases.find(c=>c.name==="talent-run-snapshot");
  assert.equal(snapshot?.duringRun?.liveRank,1);
  assert.equal(snapshot?.duringRun?.gameplayRank,0);
  assert.equal(snapshot?.nextRun?.gameplayRank,1);
  const unlock=actual.cases.find(c=>c.name==="class-unlock-commit");
  assert.equal(unlock?.result,true);
  assert.equal(unlock?.unlocked,true);
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Progression fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-progression-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;let ready=false;while(Date.now()<end){ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundProgressionOracleTest&&!!window.DiceboundRng&&!!window.DiceboundPrestige&&!!window.DiceboundProgression");if(ready)break;await sleep(100);}assert.ok(ready,"Progression oracle runtime surface did not become ready");

    await page.evaluate("document.getElementById('campGoBtn')?.click();true");
    await sleep(300);
    await page.evaluate("document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');true");

    const actual=await page.evaluate(`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
      window.DiceboundRng.seed('progression-template');const template=window.DiceboundRunResumeTest.snapshot();
      const progression=window.DiceboundProgressionOracleTest,outputs=[];
      const restore=(name,{runActive=false,classId='ranger',metaPatch=null,runPatch=null}={})=>{
        const cp=structuredClone(template);cp.run.player.classId=classId;cp.run.selectedClassId=classId;
        if(runPatch)Object.assign(cp.run,structuredClone(runPatch));
        window.DiceboundRunResumeTest.restore(cp);progression.setRunActive(runActive);progression.setRunTalentSnapshot(null);
        if(metaPatch)progression.patchMeta(metaPatch);
        window.DiceboundRng.seed('progression-oracle:'+name);return window.DiceboundRng.snapshot();
      };
      const finish=(record,before)=>{const after=window.DiceboundRng.snapshot();outputs.push({...record,rngCalls:after.calls-before.calls,rngState:after.state});};
      const state=()=>progression.snapshot();

      {const before=restore('talent-baseline');progression.setTalentState({points:0,purchased:{}});finish({name:'talent-baseline',kind:'talent',roadborn:progression.talentRank('roadborn'),missing:progression.talentRank('does-not-exist'),allocated:progression.allocatedTalentPoints(),state:state()},before);}
      {const before=restore('talent-prereq-denied');progression.setTalentState({points:10,purchased:{}});const available=progression.talentAvailable('survival_vitality'),result=progression.purchaseTalent('survival_vitality');finish({name:'talent-prereq-denied',kind:'talent',available,result,state:state()},before);}
      {const before=restore('talent-purchase');progression.setTalentState({points:3,purchased:{}});const available=progression.talentAvailable('roadborn'),result=progression.purchaseTalent('roadborn');finish({name:'talent-purchase',kind:'talent',available,result,state:state()},before);}
      {const before=restore('talent-max-denied');progression.setTalentState({points:3,purchased:{roadborn:1}});const result=progression.purchaseTalent('roadborn');finish({name:'talent-max-denied',kind:'talent',result,state:state()},before);}
      {const before=restore('talent-repair');progression.setTalentState({points:0,purchased:{survival_armor:1}});const result=progression.repairTalentPrerequisites();finish({name:'talent-repair',kind:'talent',result,state:state()},before);}
      {const before=restore('talent-accounting');progression.setTalentState({points:7,purchased:{roadborn:1,survival_vitality:2,power_attack:3}});finish({name:'talent-accounting',kind:'talent',allocated:progression.allocatedTalentPoints(),unspent:state().meta.points,total:progression.allocatedTalentPoints()+state().meta.points,state:state()},before);}
      {const before=restore('talent-run-snapshot',{runActive:true});progression.setTalentState({points:10,purchased:{roadborn:1}});progression.setRunTalentSnapshot({roadborn:1});progression.setPurchasedRank('power_attack',1);const duringRun={liveRank:progression.talentRank('power_attack'),gameplayRank:progression.gameplayTalentRank('power_attack')};progression.setRunTalentSnapshot(null);const nextRun={gameplayRank:progression.gameplayTalentRank('power_attack')};finish({name:'talent-run-snapshot',kind:'talent',duringRun,nextRun,state:state()},before);}

      {const before=restore('legacy-below');progression.setLegacyState({level:1,xp:0,xpNext:progression.legacyXpForLevel(1),points:0});const amount=progression.legacyXpForLevel(1)-1;progression.grantLegacyXp(amount);finish({name:'legacy-below',kind:'legacy',amount,state:state()},before);}
      {const before=restore('legacy-one-level');progression.setLegacyState({level:1,xp:0,xpNext:progression.legacyXpForLevel(1),points:0});const amount=progression.legacyXpForLevel(1);progression.grantLegacyXp(amount);finish({name:'legacy-one-level',kind:'legacy',amount,state:state()},before);}
      {const before=restore('legacy-multi-level');progression.setLegacyState({level:1,xp:0,xpNext:progression.legacyXpForLevel(1),points:0});const amount=progression.legacyXpForLevel(1)+progression.legacyXpForLevel(2)+1;progression.grantLegacyXp(amount);finish({name:'legacy-multi-level',kind:'legacy',amount,state:state()},before);}
      {const before=restore('run-finalize-legacy',{runActive:true,runPatch:{tilesMovedThisRun:17}});progression.patchPlayer({gold:245,legacyXpBonus:.1});const award=progression.finalizeRun();finish({name:'run-finalize-legacy',kind:'legacy',award,state:state()},before);}

      {const before=restore('prestige-offers');finish({name:'prestige-offers',kind:'prestige',offers:[0,8,9,17,18,20,27].map(total=>[total,progression.prestigeOffer(total)])},before);}
      {const before=restore('prestige-reset-exact',{runActive:false});progression.setTalentState({points:0,purchased:{roadborn:1,power_attack:5,survival_vitality:3}});progression.setLegacyState({level:9,xp:7,xpNext:999,points:0});progression.setPrestige({count:2});const total=progression.allocatedTalentPoints();const result=progression.completePrestige(total);finish({name:'prestige-reset-exact',kind:'prestige',total,result,state:state()},before);}
      {const before=restore('prestige-reset-remainder',{runActive:false});progression.setTalentState({points:8,purchased:{roadborn:1,power_attack:2}});progression.setLegacyState({level:7,xp:3,xpNext:777,points:8});progression.setPrestige({count:1});const total=progression.allocatedTalentPoints()+state().meta.points,result=progression.completePrestige(total);finish({name:'prestige-reset-remainder',kind:'prestige',total,result,state:state()},before);}
      {const before=restore('prestige-storage-checkpoint',{runActive:true});progression.setTalentState({points:8,purchased:{roadborn:1}});progression.setLegacyState({level:5,xp:2,xpNext:555,points:8});progression.setPrestige({count:4});progression.patchMeta({heirloomStorageUnlocked:true,heirloomStorage:[{id:'oracle-ring',slot:'ring',rarity:'rare',name:'Oracle Ring',icon:'💍',bonuses:{attack:1}}],heirlooms:[{id:'oracle-ring',slot:'ring',rarity:'rare',name:'Oracle Ring',icon:'💍',bonuses:{attack:1}}]});window.DiceboundRunResumeTest.save();const checkpointBefore=progression.checkpointHas();const total=progression.allocatedTalentPoints()+state().meta.points,result=progression.completePrestige(total),checkpointAfter=progression.checkpointHas();finish({name:'prestige-storage-checkpoint',kind:'prestige',total,result,checkpointBefore,checkpointAfter,state:state()},before);}

      {const before=restore('moon-held');progression.setPrestige({count:3,moon:{legacySpent:0,purchases:[]}});finish({name:'moon-held',kind:'moon',inspect:progression.prestigeInspect()},before);}
      {const before=restore('moon-random-stats');progression.setPrestige({count:1,moon:{legacySpent:0,purchases:[]}});const result=progression.prestigeDomainPurchase('five-random-stats');finish({name:'moon-random-stats',kind:'moon',result,inspect:progression.prestigeInspect()},before);}
      {const before=restore('moon-storage-chain');progression.setPrestige({count:8,moon:{legacySpent:0,purchases:[]}});const a=progression.prestigeDomainPurchase('heirloom-storage'),b=progression.prestigeDomainPurchase('heirloom-vault-expansion'),c=progression.prestigeDomainPurchase('heirloom-vault-expansion');finish({name:'moon-storage-chain',kind:'moon',results:[a,b,c],inspect:progression.prestigeInspect()},before);}
      {const before=restore('moon-refund');progression.setPrestige({count:5,moon:{legacySpent:0,purchases:[]}});const a=progression.prestigeDomainPurchase('heirloom-storage'),b=progression.prestigeDomainPurchase('five-random-stats'),refund=progression.prestigeDomainRefund();finish({name:'moon-refund',kind:'moon',results:[a,b],refund,inspect:progression.prestigeInspect()},before);}
      {const before=restore('moon-normalize');progression.setPrestige({count:4,moon:{legacySpent:0,purchases:[{nodeId:'five-random-stats',cost:1,stats:{attack:2,crit:1,luck:2}},{nodeId:'heirloom-storage',cost:1,stats:{}}]}});const first=progression.prestigeInspect();progression.setPrestige(progression.rawPrestige());const second=progression.prestigeInspect();finish({name:'moon-normalize',kind:'moon',first,second},before);}

      {const before=restore('achievement-run',{runActive:true});finish({name:'achievement-run',kind:'achievement',done:progression.achievementDone('first-footfall')},before);}
      {const before=restore('achievement-board');progression.patchMeta({stats:{boardClears:{'ranger:normal:b1':1}}});finish({name:'achievement-board',kind:'achievement',done:progression.achievementDone('ranger-b1')},before);}
      {const before=restore('achievement-nature');progression.patchMeta({elementProgress:{nature:500}});finish({name:'achievement-nature',kind:'achievement',done:progression.achievementDone('nature-master')},before);}
      {const before=restore('achievement-prestige');progression.setPrestige({count:10});finish({name:'achievement-prestige',kind:'achievement',done:progression.achievementDone('prestige10')},before);}
      {const before=restore('achievement-secret');progression.patchMeta({devilHornsFound:true});finish({name:'achievement-secret',kind:'achievement',done:progression.achievementDone('devil-horns')},before);}
      {const before=restore('achievement-copy');finish({name:'achievement-copy',kind:'achievement',condition:progression.achievementConditionText('ranger-b1'),reward:progression.achievementRewardText('ranger-b1'),secretCondition:progression.achievementConditionText('devil-horns')},before);}
      {const before=restore('achievement-gates');progression.patchMeta({stats:{boardClears:{'ranger:normal:b1':1,'ranger:normal:b2':1,'ranger:normal:b5':1}}});finish({name:'achievement-gates',kind:'achievement',achievement:progression.achievementGate('achievement:ranger-b1'),classB2:progression.achievementGate('class_b2:ranger'),classB5:progression.achievementGate('class_b5:ranger')},before);}
      {const before=restore('hero-mastery');progression.patchMeta({stats:{boardClears:{'ranger:normal:b1':1,'ranger:normal:b2':1,'ranger:normal:b5':1}}});finish({name:'hero-mastery',kind:'achievement',entries:progression.heroMastery('ranger')},before);}
      {const before=restore('achievement-count');progression.patchMeta({stats:{runsStarted:1,boardClears:{'ranger:normal:b1':1}},elementProgress:{nature:500},devilHornsFound:true});finish({name:'achievement-count',kind:'achievement',count:progression.achievementCount()},before);}

      {const before=restore('class-unlock-commit',{runActive:true});progression.patchMeta({classUnlockFacts:{manaSpenderCasts:100},unlocks:{}});const result=progression.unlockClass('invoker'),feedback=progression.classUnlockFeedbackState();finish({name:'class-unlock-commit',kind:'class-unlock',result,unlocked:!!state().meta.unlocks.invoker,feedback,log:progression.logHtml()},before);}

      return {baselineVersion:'0.6.6.28',runtimeVersion:window.DiceboundVersion?.version||null,cases:outputs};
    })()`);
    assertCoverage(actual);
    if(CAPTURE){console.log("PROGRESSION_FIXTURE_BEGIN");console.log(JSON.stringify(actual,null,2));console.log("PROGRESSION_FIXTURE_END");return;}
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.equal(fixture.baselineVersion,"0.6.6.28","Progression fixture must remain the released 0.6.6.28 baseline");
    // 0.6.7.12 deliberately replaces the vague #388 Hero Mastery prerequisite
    // copy while preserving every other frozen Progression output/state/RNG fact.
    const expected=structuredClone(fixture.cases);
    const heroMastery=expected.find(entry=>entry.name==="hero-mastery");
    const crownshot=heroMastery?.entries?.find(entry=>entry.id==="hero-talent:ranger:ranger_crownshot");
    assert.ok(crownshot,"frozen Progression fixture lost Ranger Crownshot");
    crownshot.description="Clear Board 1 as Ranger. Unlocks this hero-specific talent.";
    // #330 deliberately redesigns Moon Heirloom nodes and adds derived lifetime
    // Prestige acceleration fields. Preserve the old oracle for every unrelated
    // Progression behavior while focused #330 tests own the changed semantics.
    const canonicalizePurchase=result=>{
      if(!result||typeof result!=="object")return result;
      const copy=structuredClone(result);
      delete copy.rank;
      delete copy.cost;
      if(copy.node){
        copy.node={
          id:copy.node.id,
          cost:copy.node.cost,
          refundable:copy.node.refundable,
          kind:copy.node.kind,
          placement:copy.node.placement
        };
      }
      return copy;
    };
    const careerOnlyStatFields=new Set(["abandonedRuns","classRuns","criticalStrikes","echoStrikes","elementalProcs","enemyDefeats","largestHit"]);
    const stripPostBaselineCareerSchema=value=>{
      if(Array.isArray(value))return value.map(stripPostBaselineCareerSchema);
      if(!value||typeof value!=="object")return value;
      const copy={};
      for(const [key,child] of Object.entries(value)){
        // #8/#157 add an orthogonal Career schema after the frozen 0.6.6.28
        // baseline. Their exact behavior is owned by test_career_history.js;
        // do not rewrite this historical fixture to pretend these fields
        // existed in 0.6.6.28.
        if(key==="career")continue;
        if(key==="elementProgress"&&child&&typeof child==="object"){
          const progress=stripPostBaselineCareerSchema(child);
          delete progress.math;
          copy[key]=progress;
          continue;
        }
        if(key==="stats"&&child&&typeof child==="object"){
          const stats=stripPostBaselineCareerSchema(child);
          for(const field of careerOnlyStatFields)delete stats[field];
          copy[key]=stats;
          continue;
        }
        copy[key]=stripPostBaselineCareerSchema(child);
      }
      return copy;
    };
    const canonicalize=cases=>stripPostBaselineCareerSchema(structuredClone(cases)).map(entry=>{
      if(entry.name==="moon-storage-chain")return {name:entry.name,kind:entry.kind,rngCalls:entry.rngCalls,rngState:entry.rngState};
      if(entry.kind==="moon"){
        if(entry.result)entry.result=canonicalizePurchase(entry.result);
        if(Array.isArray(entry.results))entry.results=entry.results.map(canonicalizePurchase);
        for(const key of ["inspect","first","second"]){
          const view=entry[key];if(!view)continue;
          delete view.nodes;delete view.legacyXpMultiplier;delete view.legacyXpBonusPercent;
        }
      }
      return entry;
    });
    assert.deepEqual(canonicalize(actual.cases),canonicalize(expected));
    console.log(`Progression oracle PASS: ${actual.cases.length} released behavior cases preserve all unrelated output/state/RNG facts from ${fixture.baselineVersion}; #330 Moon and post-baseline Career schema are covered by focused tests.`);
  } finally {
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(r=>server.close(r));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});