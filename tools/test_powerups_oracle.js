#!/usr/bin/env node
"use strict";

// Beta 0.6.6.32 Powerups characterization/oracle harness.
// Capture mode freezes the released eligibility/selection/application/UI/RNG
// behavior before DiceboundPowerups ownership moves.

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const RUNTIME=path.join(ROOT,"runtime");
const FIXTURE_PATH=path.join(__dirname,"fixtures","powerups_0_6_6_32.json");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_POWERUPS_DEBUG_PORT||19433);
const CAPTURE=process.env.DICEBOUND_CAPTURE_POWERUPS==="1";
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname),rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,""),file=path.resolve(RUNTIME,rel);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const r=await fetch(url);if(r.ok)return r.json();}catch(_){}await sleep(100);}throw new Error(`timeout ${url}`);}
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const xs=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=xs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl&&x.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",ev=>{const m=JSON.parse(String(ev.data)),p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}return {socket,send,evaluate};}

function assertCoverage(actual){
  assert.equal(actual.baselineVersion,"0.6.6.32");
  const names=new Set(actual.cases.map(c=>c.name));
  for(const name of ["catalog","ranger-eligibility","slime-borrowing","slime-rouge-compatibility","achievement-gate","unique-exclusion","weighted-three","weighted-four","apply-normal","apply-unique","apply-d20","random-high-rarity","legendary-choices","legendary-repeatable-pool","fallback-rarity","miniboss-three","miniboss-four","level-ui-three","level-ui-four","all-eligible-ui","perfected-signature"])assert.ok(names.has(name),`missing Powerups oracle case ${name}`);
  assert.equal(actual.cases.find(c=>c.name==="catalog")?.count,209,"canonical Powerup count drifted after approved 0.6.7.9 Stat Heist addition");
  assert.equal(actual.cases.find(c=>c.name==="weighted-three")?.rngCalls,3,"three weighted choices must consume exactly three RNG draws");
  assert.equal(actual.cases.find(c=>c.name==="weighted-four")?.rngCalls,4,"four weighted choices must consume exactly four RNG draws");
  assert.equal(actual.cases.find(c=>c.name==="apply-normal")?.rngCalls,0,"ordinary non-D20 Powerup application must not consume RNG");
  assert.equal(actual.cases.find(c=>c.name==="apply-d20")?.rngCalls,1,"D20 Powerup application must consume exactly one RNG draw");
  assert.deepEqual({locked:actual.cases.find(c=>c.name==="achievement-gate")?.locked,unlocked:actual.cases.find(c=>c.name==="achievement-gate")?.unlocked,gateBefore:actual.cases.find(c=>c.name==="achievement-gate")?.gateBefore,gateAfter:actual.cases.find(c=>c.name==="achievement-gate")?.gateAfter},{locked:false,unlocked:true,gateBefore:false,gateAfter:true},"nature_master must stay locked at 499 Nature progress and unlock exactly at 500");
  assert.deepEqual({initial:actual.cases.find(c=>c.name==="unique-exclusion")?.initial,after:actual.cases.find(c=>c.name==="unique-exclusion")?.after},{initial:true,after:false},"ungated Unique power execute must be eligible once then excluded by upgradeCounts");
  assert.equal(actual.cases.find(c=>c.name==="random-high-rarity")?.rngCalls,1,"random Uncommon+ reward must consume one selection RNG draw for non-D20");
  assert.equal(actual.cases.find(c=>c.name==="legendary-choices")?.rngCalls,3,"three Legendary choices must consume exactly three RNG draws");
  assert.equal(actual.cases.find(c=>c.name==="miniboss-three")?.rngCalls,6,"three miniboss choices must consume rarity+pick RNG per choice");
  assert.equal(actual.cases.find(c=>c.name==="miniboss-four")?.rngCalls,8,"four miniboss choices must consume rarity+pick RNG per choice");
  for(const name of ["catalog","ranger-eligibility","slime-borrowing","slime-rouge-compatibility","achievement-gate","unique-exclusion","fallback-rarity","all-eligible-ui","perfected-signature"])assert.equal(actual.cases.find(c=>c.name===name)?.rngCalls,0,`${name} must consume zero gameplay RNG`);
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Powerups fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-powerups-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;let ready=false;while(Date.now()<end){ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundProgressionOracleTest&&!!window.DiceboundPowerupsOracleTest&&!!window.DiceboundPowerups&&!!window.DiceboundRng");if(ready)break;await sleep(100);}assert.ok(ready,"Powerups oracle runtime surface did not become ready");
    await page.evaluate("document.getElementById('campGoBtn')?.click();true");await sleep(300);await page.evaluate("document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');true");

    const actual=await page.evaluate(`(()=>{
      const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
      window.DiceboundRng.seed('powerups-template');const template=window.DiceboundRunResumeTest.snapshot();
      const power=window.DiceboundPowerupsOracleTest,progression=window.DiceboundProgressionOracleTest,outputs=[];
      const restore=(name,{classId='ranger',playerPatch={},metaPatch={},board=1,nightmare=false,hell=false}={})=>{
        const cp=structuredClone(template);cp.run.player.classId=classId;cp.run.selectedClassId=classId;window.DiceboundRunResumeTest.restore(cp);
        progression.patchPlayer({classId,...clone(playerPatch)});if(metaPatch&&Object.keys(metaPatch).length)progression.patchMeta(clone(metaPatch));
        power.setBoardLevel(board);power.setModes(nightmare,hell);power.closeOverlays();window.DiceboundRng.seed('powerups-oracle:'+name);return window.DiceboundRng.snapshot();
      };
      const finish=(record,before,includeState=false)=>{const after=window.DiceboundRng.snapshot();outputs.push({...record,rngCalls:after.calls-before.calls,rngState:after.state,...(includeState?{state:power.state()}:{})});};
      const ids=xs=>xs.map(x=>x.id);

      {const before=restore('catalog');const catalog=power.catalog();finish({name:'catalog',count:catalog.length,uniqueCount:catalog.filter(x=>x.unique).length,gatedCount:catalog.filter(x=>x.achievementGate).length,first:catalog.slice(0,5),last:catalog.slice(-5)},before);}
      {const before=restore('ranger-eligibility');const list=power.eligible();finish({name:'ranger-eligibility',count:list.length,ids:ids(list)},before);}
      {const before=restore('slime-borrowing',{classId:'slime',metaPatch:{unlocks:{ranger:true,fighter:true,ninja:true,slime:true}}});const list=power.eligible();finish({name:'slime-borrowing',count:list.length,ninja:list.filter(x=>x.classId==='ninja'||x.classIds.includes('ninja')).map(x=>x.id),fighter:list.filter(x=>x.classId==='fighter'||x.classIds.includes('fighter')).map(x=>x.id)},before);}
      {const before=restore('slime-rouge-compatibility',{classId:'slimerouge',playerPatch:{slimeRougeIdentityClass:'ninja',slimeRougeUltimateClass:'fighter'},metaPatch:{unlocks:{ranger:true,fighter:true,ninja:true,slime:true,slimerouge:true}}});const list=power.eligible();finish({name:'slime-rouge-compatibility',count:list.length,classOwned:list.filter(x=>x.classId||x.classIds.length).map(x=>x.id)},before);}
      {const before=restore('achievement-gate',{metaPatch:{elementProgress:{nature:499}}});const locked=power.eligible().some(x=>x.id==='plague_lord'),gateBefore=progression.achievementGate('nature_master');progression.patchMeta({elementProgress:{nature:500}});const unlocked=power.eligible().some(x=>x.id==='plague_lord'),gateAfter=progression.achievementGate('nature_master');finish({name:'achievement-gate',locked,unlocked,gateBefore,gateAfter},before);}
      {const before=restore('unique-exclusion',{playerPatch:{upgradeCounts:{}}});const initial=power.eligible().some(x=>x.id==='execute');progression.patchPlayer({upgradeCounts:{execute:1}});const after=power.eligible().some(x=>x.id==='execute');finish({name:'unique-exclusion',id:'execute',initial,after},before);}
      {const before=restore('weighted-three',{playerPatch:{luck:.37,level:18,position:11},board:3});const choices=power.choices();finish({name:'weighted-three',choices},before);}
      {const before=restore('weighted-four',{playerPatch:{luck:.37,level:18,position:11,levelChoiceBonus:1},board:3});const choices=power.levelChoices();finish({name:'weighted-four',choices},before);}
      {const before=restore('apply-normal',{playerPatch:{attack:10,upgradeCounts:{},runBuffs:[]}});const applied=power.apply('attack','Oracle Normal');finish({name:'apply-normal',applied},before,true);}
      {const before=restore('apply-unique',{playerPatch:{goldBonus:.5,upgradeCounts:{},runBuffs:[]}});const applied=power.apply('legendary_golden_law','Oracle Unique');finish({name:'apply-unique',applied},before,true);}
      {const before=restore('apply-d20',{classId:'d20',playerPatch:{attack:10,hp:100,maxHp:100,upgradeCounts:{},runBuffs:[]}});const applied=power.apply('attack','Oracle D20');finish({name:'apply-d20',applied},before,true);}
      {const before=restore('random-high-rarity',{playerPatch:{upgradeCounts:{},runBuffs:[]}});const applied=power.randomHigh('Oracle Relic');finish({name:'random-high-rarity',applied},before,true);}
      {const before=restore('legendary-choices');const choices=power.legendaryChoices();finish({name:'legendary-choices',choices},before);}
      {const before=restore('legendary-repeatable-pool',{playerPatch:{upgradeCounts:{legendary_golden_law:1,legendary_crimson_aegis_v27:1,legendary_loaded_road:1,legendary_packbreaker:1,legendary_second_sun:1}}});const list=power.eligible('legendary');finish({name:'legendary-repeatable-pool',count:list.length,ids:ids(list)},before);}
      {const before=restore('fallback-rarity');finish({name:'fallback-rarity',legendary:power.fallbackRarity('legendary'),epic:power.fallbackRarity('epic'),poor:power.fallbackRarity('poor')},before);}
      {const before=restore('miniboss-three',{playerPatch:{luck:.2,levelChoiceBonus:0},board:2});const choices=power.minibossChoices();finish({name:'miniboss-three',choices},before);}
      {const before=restore('miniboss-four',{playerPatch:{luck:.2,levelChoiceBonus:1},board:4,nightmare:true});const choices=power.minibossChoices();finish({name:'miniboss-four',choices},before);}
      {const before=restore('level-ui-three',{playerPatch:{levelChoiceBonus:0,v26ExpandedHorizons:false},board:2});power.setPendingLevelUps(1);const ui=power.levelUi();finish({name:'level-ui-three',ui},before);power.closeOverlays();}
      {const before=restore('level-ui-four',{playerPatch:{levelChoiceBonus:1,v26ExpandedHorizons:false},board:2});power.setPendingLevelUps(2);const ui=power.levelUi();finish({name:'level-ui-four',ui},before);power.closeOverlays();}
      {const before=restore('all-eligible-ui');const ui=power.allEligibleUi();finish({name:'all-eligible-ui',ui:{title:ui.title,subtitle:ui.subtitle,countText:ui.countText,count:ui.names.length,first:ui.names.slice(0,8),last:ui.names.slice(-8),overlayHidden:ui.overlayHidden}},before);power.closeOverlays();}
      {const before=restore('perfected-signature',{classId:'ranger'});const ranger=power.perfectedSignature();progression.patchPlayer({classId:'sorcerer'});const sorcerer=power.perfectedSignature();finish({name:'perfected-signature',ranger,sorcerer},before);}
      return {baselineVersion:'0.6.6.32',runtimeVersion:window.DiceboundVersion?.version||null,cases:outputs};
    })()`);
    assertCoverage(actual);
    if(CAPTURE){console.log("POWERUPS_FIXTURE_BEGIN");console.log(JSON.stringify(actual,null,2));console.log("POWERUPS_FIXTURE_END");return;}
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.equal(fixture.baselineVersion,"0.6.6.32","Powerups fixture must remain the released 0.6.6.32 baseline");
    const expected=structuredClone(fixture.cases);
    // Beta 0.6.7.34 keeps the semantic Powerup id on run-buff records so
    // presentation can recompute live descriptions instead of freezing copy at
    // acquisition time. Preserve the frozen baseline and normalize only that
    // intentional metadata addition.
    for(const [caseName,powerupId] of [["apply-normal","attack"],["apply-unique","legendary_golden_law"],["apply-d20","attack"],["random-high-rarity","ranger_echo"]]){
      const record=expected.find(entry=>entry.name===caseName);
      for(const buff of record?.state?.player?.runBuffs||[])buff.powerupId=powerupId;
    }
    const approvedLuckChoices=new Map([
      ["weighted-three",[
        {id:"dodge",name:"Mist Step",rarity:"uncommon",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"poor_monster_notes_v514",name:"Monster Notes",rarity:"poor",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"venom_edge",name:"Venom Edge",rarity:"common",classId:null,classIds:[],unique:false,achievementGate:null}
      ]],
      ["weighted-four",[
        {id:"scholar_common_v26",name:"Scholar's Sigil+",rarity:"common",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"rare_ultimate_vessel",name:"Ultimate Vessel",rarity:"uncommon",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"thorns",name:"Spiked Armor",rarity:"poor",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"attack_common_v24",name:"Sharpened Steel",rarity:"common",classId:null,classIds:[],unique:false,achievementGate:null}
      ]],
      ["miniboss-three",[
        {id:"vampire",name:"Vampiric Edge",rarity:"rare",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"berserk",name:"Berserker Heart",rarity:"rare",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"godslayer",name:"Godslayer",rarity:"epic",classId:null,classIds:[],unique:false,achievementGate:null}
      ]],
      ["miniboss-four",[
        {id:"phoenix",name:"Phoenix Feather",rarity:"epic",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"legendary_crimson_aegis_v27",name:"Crimson Aegis",rarity:"legendary",classId:null,classIds:[],unique:true,achievementGate:null},
        {id:"vampire",name:"Vampiric Edge",rarity:"rare",classId:null,classIds:[],unique:false,achievementGate:null},
        {id:"venom_edge_rare_v25",name:"Venom Edge: Black Fang",rarity:"epic",classId:null,classIds:[],unique:false,achievementGate:null}
      ]]
    ]);
    for(const [name,choices] of approvedLuckChoices){
      const record=expected.find(c=>c.name===name);
      assert.ok(record,"missing frozen Luck-sensitive Powerups case "+name);
      record.choices=choices;
    }

    // 0.6.7.22 approved #202 delta: Sealed Relic now uses an Uncommon+
    // floor through the canonical Powerup rarity order. The same frozen RNG
    // draw therefore resolves Twin Fletching instead of Executioner; RNG call
    // count/state and every unrelated oracle case must remain exact.
    {
      const record=expected.find(c=>c.name==="random-high-rarity");
      assert.ok(record,"missing frozen random-high-rarity Powerups case");
      record.applied={
        id:"ranger_echo",name:"Twin Fletching",rarity:"uncommon",
        classId:"ranger",classIds:[],unique:false,achievementGate:null
      };
      record.state.player.doubleStrike=.18;
      record.state.player.upgradeCounts={ranger_echo:1};
      record.state.player.runBuffs=[{
        icon:"🏹",
        name:"Twin Fletching",
        desc:"Gain +18% Echo Strike chance.",
        rarity:"uncommon",
        source:"Oracle Relic"
      }];
    }
    assert.deepEqual(actual.cases,expected);
    console.log(`Powerups oracle PASS: ${actual.cases.length} exact released-output/state/RNG cases match ${fixture.baselineVersion} baseline on runtime ${actual.runtimeVersion}.`);
  } finally {try{page?.socket?.close();}catch(_){}try{child?.kill();}catch(_){}if(process.platform==='win32'&&child?.pid){try{childProcess.spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch(_){}}await sleep(500);await new Promise(r=>server.close(r));try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:12,retryDelay:150});}catch(err){console.warn(`Powerups oracle temp-profile cleanup warning: ${err.message}`);}}
}
main().catch(err=>{console.error(err);process.exit(1);});
