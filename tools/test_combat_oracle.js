#!/usr/bin/env node
"use strict";

// Beta 0.6.6.30 integrated Combat characterization/oracle harness.
// Capture mode is used once on the released baseline before DiceboundCombat
// ownership moves; replay mode permanently freezes state/event/RNG behavior.

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const RUNTIME=path.join(ROOT,"runtime");
const FIXTURE_PATH=path.join(__dirname,"fixtures","combat_0_6_6_30.json");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_COMBAT_DEBUG_PORT||19430);
const CAPTURE=process.env.DICEBOUND_CAPTURE_COMBAT==="1";
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname),rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,""),file=path.resolve(RUNTIME,rel);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const r=await fetch(url);if(r.ok)return r.json();}catch(_){}await sleep(100);}throw new Error(`timeout ${url}`);}
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const xs=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=xs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl&&x.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",ev=>{const m=JSON.parse(String(ev.data)),p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}return {socket,send,evaluate};}

function assertCoverage(actual){
  assert.equal(actual.baselineVersion,"0.6.6.30");
  const names=new Set(actual.cases.map(c=>c.name));
  for(const name of ["encounter-start","attack-ranger","attack-target-advance","attack-busy-denied","guard-fighter","mana-sorcerer","mana-denied","ultimate-ranger","pet-neutral","enemy-response","element-fire","healing-overheal","d20-chaos","victory-ordinary"])assert.ok(names.has(name),`missing Combat oracle case ${name}`);
  const busy=actual.cases.find(c=>c.name==="attack-busy-denied");
  assert.equal(busy?.rngCalls,0,"busy-denied Basic Attack must consume zero RNG");
  const denied=actual.cases.find(c=>c.name==="mana-denied");
  assert.equal(denied?.rngCalls,0,"denied Mana spender must consume zero RNG");
  const advance=actual.cases.find(c=>c.name==="attack-target-advance");
  assert.ok(advance?.events?.some(e=>e.type==="combat:target-advanced"),"target-advance event was not characterized");
  const attack=actual.cases.find(c=>c.name==="attack-ranger");
  assert.ok(attack?.events?.some(e=>e.type==="combat:strike"),"strike event was not characterized");
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Combat fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-combat-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;let ready=false;while(Date.now()<end){ready=await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundCombatOracleTest&&!!window.DiceboundRng");if(ready)break;await sleep(100);}assert.ok(ready,"Combat oracle runtime surface did not become ready");
    await page.evaluate("document.getElementById('campGoBtn')?.click();window.__DB_FAST_ECHO_CAP__=1;window.__DB_V26_FAST_ECHO__=true;true");
    await sleep(250);
    await page.evaluate("document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');true");

    const actual=await page.evaluate(`(async()=>{
      const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
      const combat=window.DiceboundCombatOracleTest,outputs=[];
      window.DiceboundRng.seed('combat-template');const template=window.DiceboundRunResumeTest.snapshot();
      const eventsFor=async work=>{const events=[],stops=[];const add=(type,payload)=>events.push({type,...clone(payload)});stops.push(combat.onEvent('combat:strike',e=>add('combat:strike',{targetName:e.targetName??null,targetHp:e.targetHp??null,presentationTarget:e.presentationTarget??null,damage:e.damage??null,crit:e.crit??null,echo:!!e.echo,index:e.index??null})));stops.push(combat.onEvent('combat:target-advanced',e=>add('combat:target-advanced',{reason:e.reason??null,defeatedIndex:e.defeatedIndex??null,targetIndex:e.targetIndex??null,targetName:e.targetName??null})));try{return {result:await work(),events};}finally{stops.forEach(stop=>stop?.());}};
      const restore=name=>{window.DiceboundRunResumeTest.restore(structuredClone(template));window.__DB_FAST_ECHO_CAP__=1;window.__DB_V26_FAST_ECHO__=true;combat.cleanup();window.DiceboundRng.seed('combat-oracle:'+name);return window.DiceboundRng.snapshot();};
      const finish=(record,before)=>{const after=window.DiceboundRng.snapshot();outputs.push({...record,state:combat.snapshot(),rngCalls:after.calls-before.calls,rngState:after.state});};
      const setup=(name,spec)=>{const before=restore(name);combat.setup(spec);window.DiceboundRng.seed('combat-oracle:'+name);return window.DiceboundRng.snapshot();};

      {
        const before=restore('encounter-start');combat.prepareEncounter({classId:'ranger',board:2,tileIndex:1});window.DiceboundRng.seed('combat-oracle:encounter-start');const observed=await eventsFor(()=>combat.startEncounter('normal'));finish({name:'encounter-start',kind:'encounter',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('attack-ranger',{classId:'ranger',player:{hp:500,maxHp:500,attack:24,defense:100,crit:.35,doubleStrike:.65,ultimateCharge:0},enemies:[{name:'Oracle A',hp:350,maxHp:350,attack:1,defense:1},{name:'Oracle B',hp:350,maxHp:350,attack:1,defense:1}]});const observed=await eventsFor(()=>combat.attack());finish({name:'attack-ranger',kind:'attack',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('attack-target-advance',{classId:'ranger',player:{hp:500,maxHp:500,attack:80,defense:100,crit:0,doubleStrike:2,ultimateCharge:0},enemies:[{name:'Fragile A',hp:5,maxHp:5,attack:1,defense:0},{name:'Durable B',hp:1000,maxHp:1000,attack:1,defense:0}]});const observed=await eventsFor(()=>combat.attack());finish({name:'attack-target-advance',kind:'attack',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('attack-busy-denied',{classId:'ranger',busy:true,player:{attack:20,crit:.9,doubleStrike:2},enemies:[{name:'Busy Dummy',hp:200,maxHp:200,attack:1,defense:0}]});const observed=await eventsFor(()=>combat.attack());finish({name:'attack-busy-denied',kind:'denied',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('guard-fighter',{classId:'fighter',player:{hp:500,maxHp:500,attack:22,defense:40,ultimateCharge:10,combatShield:0},enemies:[{name:'Guard Dummy',hp:300,maxHp:300,attack:14,defense:2}]});const observed=await eventsFor(()=>combat.guard());finish({name:'guard-fighter',kind:'guard',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('mana-sorcerer',{classId:'sorcerer',player:{hp:500,maxHp:500,attack:25,defense:100,mana:100,maxMana:100,ultimateCharge:0},enemies:[{name:'Mana Dummy',hp:1200,maxHp:1200,attack:1,defense:1}]});const observed=await eventsFor(()=>combat.spell());finish({name:'mana-sorcerer',kind:'mana',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('mana-denied',{classId:'sorcerer',player:{mana:0,maxMana:100},enemies:[{name:'Dry Dummy',hp:500,maxHp:500,attack:1,defense:0}]});const observed=await eventsFor(()=>combat.spell());finish({name:'mana-denied',kind:'denied',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('ultimate-ranger',{classId:'ranger',player:{hp:500,maxHp:500,attack:30,defense:100,crit:.2,doubleStrike:.1,ultimateCharge:100,bossDamage:.15},enemies:[{name:'Ult A',hp:1500,maxHp:1500,attack:1,defense:2},{name:'Ult B',hp:1500,maxHp:1500,attack:1,defense:2}]});const observed=await eventsFor(()=>combat.ultimate());finish({name:'ultimate-ranger',kind:'ultimate',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('pet-neutral',{classId:'ranger',player:{hp:500,maxHp:500,defense:100,petDoubleChance:.35,petDamageBonus:2},enemies:[{name:'Pet Dummy',hp:500,maxHp:500,attack:1,defense:0,weakness:'fire'}]});const observed=await eventsFor(()=>combat.petTurn());finish({name:'pet-neutral',kind:'pet',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('enemy-response',{classId:'fighter',player:{hp:500,maxHp:500,defense:12,combatShield:1},turn:3,enemies:[{name:'Response Dummy',hp:500,maxHp:500,attack:20,defense:0}]});const observed=await eventsFor(()=>combat.enemyResponse(false));finish({name:'enemy-response',kind:'turn',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('element-fire',{classId:'ranger',player:{hp:500,maxHp:500,attack:20,defense:100,elementDamageBonus:.1},enemies:[{name:'Fire Dummy',hp:500,maxHp:500,attack:1,defense:0,weakness:'fire'}]});const observed=await eventsFor(()=>Promise.resolve(combat.element('fire',{forced:true,source:'Combat Oracle'})));finish({name:'element-fire',kind:'element',result:clone(observed.result??null),events:observed.events},before);
      }
      {
        const before=setup('healing-overheal',{classId:'ranger',player:{hp:40,maxHp:100,energyShield:0},enemies:[{name:'Heal Dummy',hp:500,maxHp:500,attack:1,defense:0}]});const observed=await eventsFor(()=>Promise.resolve(combat.heal(90)));finish({name:'healing-overheal',kind:'healing',result:observed.result??null,events:observed.events},before);
      }
      {
        const before=setup('d20-chaos',{classId:'d20',player:{hp:500,maxHp:500,defense:100,ultimateCharge:20},enemies:[{name:'Chaos Dummy',hp:500,maxHp:500,attack:1,defense:0}]});const observed=await eventsFor(()=>combat.chaos('attack'));finish({name:'d20-chaos',kind:'d20',result:clone(observed.result??null),events:observed.events},before);
      }
      {
        const before=setup('victory-ordinary',{classId:'ranger',player:{hp:500,maxHp:500,defense:100,gold:0,xp:0,xpNext:999999,postFightHeal:0},enemies:[{name:'Victory Dummy',hp:0,maxHp:25,attack:1,defense:0,gold:11,xp:7}]});const clicker=setInterval(()=>document.getElementById('battleVictoryContinue')?.click(),5);let observed;try{observed=await eventsFor(()=>combat.win());}finally{clearInterval(clicker);}await new Promise(r=>setTimeout(r,20));finish({name:'victory-ordinary',kind:'victory',result:observed.result??null,events:observed.events},before);combat.dismissTransient();
      }
      combat.cleanup();
      return {baselineVersion:'0.6.6.30',runtimeVersion:window.DiceboundVersion?.version||null,cases:outputs};
    })()`);

    assertCoverage(actual);

    // #72/#412 real Edge visibility/geometry gate. Synthetic DOM tests are not
    // enough: exercise the shipped combat DOM, wait for an actual paint, and
    // prove the floating value is visible over the semantic pack target while
    // the static HUD remains above grounded combatants.
    const visual=await page.evaluate(`(async()=>{
      const combat=window.DiceboundCombatOracleTest;
      combat.setup({
        classId:'ranger',currentIndex:1,
        player:{hp:500,maxHp:500,attack:30,defense:100},
        enemies:[
          {name:'Visual A',hp:500,maxHp:500,attack:1,defense:0,weakness:'ice'},
          {name:'Visual B',hp:500,maxHp:500,attack:1,defense:0,weakness:'fire'}
        ]
      });
      window.DiceboundProgressionOracleTest.patchMeta({settings:{floatingCombatNumbers:true}});
      window.DiceboundCombatView?.clearTransient?.();
      combat.element('fire',{forced:true,source:'Edge visibility gate'});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(resolve,90))));
      const node=document.querySelector('.db-combat-float-vfx');
      const target=document.querySelector('#enemyIcon .stage-enemy[data-enemy-index="1"]');
      const chooser=document.getElementById('enemyParty'),hud=document.querySelector('#combatOverlay .combat-hud'),stage=document.querySelector('#combatOverlay .combat-head');
      const playerIcon=document.getElementById('combatPlayerIcon'),enemyIcon=document.getElementById('enemyIcon');
      const playerBar=document.getElementById('combatPlayerFill')?.parentElement,enemyBar=document.getElementById('enemyHpFill')?.parentElement;
      const rect=el=>el?.getBoundingClientRect?.()||null;
      const style=node?getComputedStyle(node):null;
      const beforeOff=document.querySelectorAll('.db-combat-float-vfx').length;
      const out={
        node:node?{text:node.textContent,target:node.dataset.target,left:parseFloat(node.style.left)||0,top:parseFloat(node.style.top)||0,display:style.display,visibility:style.visibility,opacity:Number(style.opacity)}:null,
        target:rect(target),chooser:rect(chooser),hud:rect(hud),stage:rect(stage),playerIcon:rect(playerIcon),enemyIcon:rect(enemyIcon),playerBar:rect(playerBar),enemyBar:rect(enemyBar),beforeOff
      };
      window.DiceboundCombatView?.clearTransient?.();
      window.DiceboundProgressionOracleTest.patchMeta({settings:{floatingCombatNumbers:false}});
      combat.element('fire',{forced:true,source:'Edge disabled visibility gate'});
      await new Promise(resolve=>setTimeout(resolve,80));
      out.afterOff=document.querySelectorAll('.db-combat-float-vfx').length;
      window.DiceboundProgressionOracleTest.patchMeta({settings:{floatingCombatNumbers:true}});
      combat.cleanup();
      return out;
    })()`);
    assert.ok(visual.node,"real Edge combat must render a floating-combat-text node");
    assert.equal(visual.node.target,"enemy:1","floating value must identify the actual second pack member");
    assert.ok(visual.node.text&&visual.node.text!=="-0","floating value must contain a resolved readable amount");
    assert.notEqual(visual.node.display,"none","floating value must not be display:none");
    assert.notEqual(visual.node.visibility,"hidden","floating value must not be visibility:hidden");
    assert.ok(visual.node.opacity>0,"floating value must have visible opacity after paint");
    assert.ok(Math.abs(visual.node.left-(visual.target.left+visual.target.width/2))<=3,"floating value must anchor to the semantic target center");
    assert.ok(visual.beforeOff>=1&&visual.afterOff===0,"Options Off must suppress floating values in real Edge combat");
    assert.ok(Math.abs(visual.playerBar.top-visual.enemyBar.top)<=3,"player/enemy HP bars must remain parallel in the static HUD");
    assert.ok(visual.chooser.top<=visual.hud.top&&visual.hud.top<visual.stage.top+visual.stage.height*.25,"target chooser and static HP HUD must stay above the battlefield models");
    assert.ok(visual.playerIcon.bottom>=visual.stage.bottom-80&&visual.enemyIcon.bottom>=visual.stage.bottom-80,"player/enemy models must occupy the lower ground region of the real combat stage");

    if(CAPTURE){fs.mkdirSync(path.dirname(FIXTURE_PATH),{recursive:true});fs.writeFileSync(FIXTURE_PATH,JSON.stringify(actual,null,2)+"\n","utf8");console.log(`Combat fixture captured: ${actual.cases.length} cases -> ${FIXTURE_PATH}`);return;}
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.equal(fixture.baselineVersion,"0.6.6.30","Combat fixture must remain the released 0.6.6.30 baseline");
    const expected=structuredClone(fixture.cases);
    const encounter=expected.find(c=>c.name==="encounter-start");
    assert.equal(encounter?.state?.enemies?.[0]?.name,"Ascended Cultist","Combat roster extension must start from the frozen Cultist encounter");
    // Beta 0.6.7.11 deliberately gives every Road the Board 1 ordinary-family
    // selection window. Preserve the historical fixture, then transform only
    // the one encounter whose semantic family is intentionally different.
    encounter.state.currentEnemyName="Ascended Slime";
    encounter.state.enemies[0]={
      id:"slime",name:"Ascended Slime",icon:"🟢",hp:28,attack:6,defenseBias:-0.8,
      xp:14,gold:11,weakness:"electric",maxHp:28,defense:2,boss:false,guardian:false,
      miniBoss:false,finalBoss:false,merchantBoss:false,skipTurns:0,poisonStacks:0,
      affinity:"metal",elementProcChance:0.12525252525252525
    };
    encounter.state.text="Ascended Slime block the road. Choose your action.";
    encounter.state.history=encounter.state.text;
    // 0.6.7.18 deliberately collapses Twenty-Sider's duplicate toast/flash/text
    // layers into one concrete battle announcement plus one history record.
    // Keep the frozen mechanics/RNG/state fixture and transform only those
    // approved presentation fields.
    const d20Case=expected.find(c=>c.name==="d20-chaos");
    d20Case.state.text="🎲 18/20 — HASTE: double-ish power and the enemy pack may lose its response to Haste. Attack power: 180%.";
    d20Case.state.history="ATTACK: 🎲 18/20 — HASTE: double-ish power and the enemy pack may lose its response to Haste. Attack power: 180%.";
    assert.deepEqual(actual.cases,expected);
    console.log(`Combat oracle PASS: ${actual.cases.length} exact released-output/state/event/RNG cases match ${fixture.baselineVersion} baseline on runtime ${actual.runtimeVersion}.`);
  } finally {
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(r=>server.close(r));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
