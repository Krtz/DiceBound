#!/usr/bin/env node
"use strict";

// Beta 0.6.6.25 Road Events characterization/oracle harness.
//
// IMPORTANT: this first slice intentionally exercises the released runtime as-is.
// It does not move event lifecycle ownership. Run with DICEBOUND_CAPTURE_ROAD_EVENTS=1
// to print a fixture candidate while establishing the frozen baseline; normal mode
// compares against tools/fixtures/road_events_0_6_6_25.json once that fixture exists.

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const RUNTIME=path.join(ROOT,"runtime");
const FIXTURE_PATH=path.join(__dirname,"fixtures","road_events_0_6_6_25.json");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_ROAD_EVENTS_DEBUG_PORT||19426);
const CAPTURE=process.env.DICEBOUND_CAPTURE_ROAD_EVENTS==="1";
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname),rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,""),file=path.resolve(RUNTIME,rel);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const r=await fetch(url);if(r.ok)return r.json();}catch(_){}await sleep(100);}throw new Error(`timeout ${url}`);}
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const xs=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=xs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl&&x.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",ev=>{const m=JSON.parse(String(ev.data)),p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}return {socket,send,evaluate};}

function assertCoverage(actual){
  const slots=actual.cases.filter(c=>c.name.startsWith("slot-"));
  assert.ok(slots.some(c=>/^No match\./.test(c.result)),"slot oracle must include a miss/consolation path");
  assert.ok(slots.some(c=>/^Two /.test(c.result)),"slot oracle must include a pair path");
  assert.ok(slots.some(c=>/Jackpot|Triple skulls/.test(c.result)),"slot oracle must include a triple path");
  assert.ok(slots.some(c=>c.name==="slot-lucky"&&c.player.luck===0.5),"slot oracle must include elevated Luck");
  const gambler=actual.cases.filter(c=>c.name.startsWith("gambler-"));
  assert.ok(gambler.some(c=>/^Heads!/.test(c.result)),"Gambler oracle must include a win");
  assert.ok(gambler.some(c=>/^Tails!/.test(c.result)),"Gambler oracle must include a loss");
  const decline=gambler.find(c=>c.name==="gambler-decline");
  assert.equal(decline?.rngCalls,0,"declining the Gambler must not consume RNG");
  const mystics=actual.cases.filter(c=>c.name.startsWith("mystic-"));
  assert.ok(mystics.some(c=>c.offer?.rarity==="Legendary"),"Mystic oracle must include a Legendary offer");
  for(const c of actual.cases.filter(c=>c.name.startsWith("blessing-")))assert.equal(new Set(c.offers).size,c.offers.length,`${c.name}: blessing offers must stay unique`);
  assert.ok(actual.cases.some(c=>c.name.startsWith("blessing-")&&c.offers?.[0]==="Miracle Engine"),"Blessing oracle must apply Miracle Engine in at least one case");
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Road Events fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-road-events-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;while(Date.now()<end){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundRun&&!!window.DiceboundRng&&!!window.DiceboundEventRewards"))break;await sleep(100);}
    const actual=await page.evaluate(`(async()=>{
      const originalSetTimeout=window.setTimeout;
      const wait=()=>new Promise(r=>originalSetTimeout(r,0));
      const until=async(pred,label)=>{for(let i=0;i<500;i++){if(pred())return;await wait();}throw new Error('timed out settling '+label);};
      const fnv=text=>{let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');};
      // Keep every shipped animation iteration/RNG draw but collapse presentation waits.
      window.setTimeout=(fn,_ms,...args)=>originalSetTimeout(()=>fn(...args),0);
      window.DiceboundRng.seed('road-events-template');
      document.getElementById('campGoBtn')?.click();await new Promise(r=>originalSetTimeout(r,250));
      document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');
      const template=window.DiceboundRunResumeTest.snapshot();
      const outputs=[];
      const restore=(name,type,mutate)=>{const cp=structuredClone(template),idx=Math.min(8,cp.run.tiles.length-2);cp.run.player.position=idx;cp.run.player.gold=600;cp.run.player.hp=Math.min(cp.run.player.maxHp,Math.max(20,cp.run.player.maxHp-9));cp.run.player.potions=4;cp.run.player.luck=0;cp.run.tiles[idx]={type,cleared:false,packSize:1};cp.meta.petCookies=cp.meta.petCookies||0;mutate?.(cp);window.DiceboundRunResumeTest.restore(cp);window.DiceboundRng.seed('road-events-oracle:'+name);return {before:window.DiceboundRng.snapshot()};};
      const snap=(name,before,extra={})=>{const after=window.DiceboundRng.snapshot(),cp=window.DiceboundRunResumeTest.snapshot(),p=cp.run.player,tile=cp.run.tiles[p.position],view={name,player:{hp:p.hp,maxHp:p.maxHp,attack:p.attack,defense:p.defense,gold:p.gold,potions:p.potions,luck:p.luck,crit:p.crit,dodge:p.dodge,lifeSteal:p.lifeSteal,doubleStrike:p.doubleStrike,bossDamage:p.bossDamage},petCookies:cp.meta.petCookies,tile:{type:tile?.type,cleared:!!tile?.cleared},rngCalls:after.calls-before.calls,rngState:after.state,...extra};outputs.push({...view,signature:fnv(JSON.stringify(view))});};
      const dispatch=()=>window.DiceboundRun.dispatchTile();
      const click=selector=>{const node=document.querySelector(selector);if(!node)throw new Error('missing selector '+selector);node.click();return node;};
      const reel=el=>el?.querySelector('img')?.alt||el?.textContent?.trim()||'';

      // Slot seeds freeze the full shipped spin, including every animation RNG draw.
      for(const seedName of ['slot-a','slot-b','slot-c','slot-d','slot-e','slot-f','slot-g','slot-h','slot-i','slot-j','slot-lucky']){
        const x=restore(seedName,'event',cp=>{if(seedName==='slot-lucky')cp.run.player.luck=.5;});dispatch();click('#spinBtn');await until(()=>document.getElementById('eventContinueBtn')?.style.display==='block'&&!document.getElementById('spinBtn')?.disabled,'slot '+seedName);const symbols=[1,2,3].map(n=>reel(document.getElementById('reel'+n)));snap(seedName,x.before,{symbols,result:document.getElementById('slotResult')?.textContent||''});document.getElementById('eventOverlay')?.classList.add('hidden');
      }

      // Wheel seeds freeze selected segment plus reward-side effects.
      for(const seedName of ['wheel-a','wheel-b','wheel-c']){
        const x=restore(seedName,'wheel');dispatch();click('#wheelSpinBtn');await until(()=>document.getElementById('wheelContinueBtn')?.style.display==='block','wheel '+seedName);snap(seedName,x.before,{result:document.getElementById('wheelResult')?.textContent||''});document.getElementById('wheelOverlay')?.classList.add('hidden');
      }

      // 0.6.7.13 fast presentation must preserve the exact result and RNG stream.
      const equivalenceSnapshot=(before,result)=>{const after=window.DiceboundRng.snapshot(),cp=window.DiceboundRunResumeTest.snapshot(),p=cp.run.player,tile=cp.run.tiles[p.position];return {result,player:{hp:p.hp,maxHp:p.maxHp,attack:p.attack,defense:p.defense,gold:p.gold,potions:p.potions,luck:p.luck,crit:p.crit,dodge:p.dodge,lifeSteal:p.lifeSteal,doubleStrike:p.doubleStrike,bossDamage:p.bossDamage},petCookies:cp.meta.petCookies,tile:{type:tile?.type,cleared:!!tile?.cleared},rngCalls:after.calls-before.calls,rngState:after.state};};
      const runFastEquivalent=async(kind,fast)=>{
        const type=kind==='slot'?'event':'wheel',seedName='fast-equivalence-'+kind,x=restore(seedName,type,cp=>{cp.meta.settings=cp.meta.settings||{};cp.meta.settings.fastWheelSlots=fast;cp.meta.stats=cp.meta.stats||{};cp.meta.stats.boardClears=cp.meta.stats.boardClears||{};cp.meta.stats.boardClears['ranger:normal:b6']=1;});
        dispatch();
        if(kind==='slot'){click('#spinBtn');await until(()=>document.getElementById('eventContinueBtn')?.style.display==='block'&&!document.getElementById('spinBtn')?.disabled,'fast-equivalence slot');const symbols=[1,2,3].map(n=>reel(document.getElementById('reel'+n)));const result={symbols,text:document.getElementById('slotResult')?.textContent||''};document.getElementById('eventOverlay')?.classList.add('hidden');return equivalenceSnapshot(x.before,result);}
        click('#wheelSpinBtn');await until(()=>document.getElementById('wheelContinueBtn')?.style.display==='block','fast-equivalence wheel');const result=document.getElementById('wheelResult')?.textContent||'';document.getElementById('wheelOverlay')?.classList.add('hidden');return equivalenceSnapshot(x.before,result);
      };
      const fastEquivalence={slot:{normal:await runFastEquivalent('slot',false),fast:await runFastEquivalent('slot',true)},wheel:{normal:await runFastEquivalent('wheel',false),fast:await runFastEquivalent('wheel',true)}};

      // Treasure seeds capture potion/no-potion and loot/no-loot behavior.
      for(const seedName of ['treasure-a','treasure-b','treasure-c','treasure-d']){
        const x=restore(seedName,'treasure');dispatch();await wait();const lootVisible=!document.getElementById('lootOverlay')?.classList.contains('hidden');const loot=lootVisible?{name:document.querySelector('#lootCard .loot-name')?.textContent||'',rarity:document.querySelector('#lootCard .rarity-badge')?.textContent||'',bonuses:document.querySelector('#lootCard .loot-bonuses')?.textContent?.trim()||''}:null;snap(seedName,x.before,{lootVisible,loot});document.getElementById('lootOverlay')?.classList.add('hidden');
      }

      // Blessing captures unique offers and applies the first. blessing-d is intentionally
      // retained because released 0.6.6.25 offers Miracle Engine first for this seed.
      for(const seedName of ['blessing-a','blessing-b','blessing-c','blessing-d']){
        const x=restore(seedName,'blessing');dispatch();await wait();const offers=[...document.querySelectorAll('#blessingGrid .blessing-name')].map(n=>n.textContent||'');click('#blessingGrid .blessing-btn');await wait();snap(seedName,x.before,{offers});document.getElementById('blessingOverlay')?.classList.add('hidden');
      }

      // Wider fixed seed set guarantees characterization includes the 10% Legendary path.
      for(const suffix of ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o']){
        const seedName='mystic-'+suffix,x=restore(seedName,'mystic');dispatch();await wait();const offer={rarity:document.querySelector('#mysticOffer .rarity-badge')?.textContent||'',name:document.querySelector('#mysticOffer .loot-name')?.textContent||''};click('#acceptMysticBtn');await wait();snap(seedName,x.before,{offer});document.getElementById('mysticOverlay')?.classList.add('hidden');
      }

      // Bloodwell freezes two different sacrifice->different-stat-reward flows.
      for(const c of [{name:'bloodwell-hp',needle:'20%'},{name:'bloodwell-potion',needle:'1 potion'}]){
        const x=restore(c.name,'bloodwell');dispatch();await wait();const buttons=[...document.querySelectorAll('#bloodwellGrid button')],btn=buttons.find(b=>(b.textContent||'').includes(c.needle));if(!btn)throw new Error('Bloodwell option missing: '+c.needle);btn.click();await wait();snap(c.name,x.before,{choice:(btn.textContent||'').trim()});document.getElementById('bloodwellOverlay')?.classList.add('hidden');
      }

      // Decline plus several fixed wagers guarantee both coinflip outcomes are frozen.
      for(const c of [{name:'gambler-decline',index:0},...['a','b','c','d','e','f'].map(s=>({name:'gambler-'+s,index:2}))]){
        const x=restore(c.name,'gambler');dispatch();await wait();const buttons=[...document.querySelectorAll('#gambleGrid button')];if(!buttons[c.index])throw new Error('Gambler option missing: '+c.index);buttons[c.index].click();await wait();snap(c.name,x.before,{result:document.getElementById('gambleResult')?.textContent||''});document.getElementById('gamblerOverlay')?.classList.add('hidden');
      }

      window.setTimeout=originalSetTimeout;
      return {version:window.DiceboundVersion?.version||'0.6.6.25',cases:outputs,fastEquivalence};
    })()`);

    assertCoverage(actual);
    assert.deepEqual(actual.fastEquivalence.slot.fast,actual.fastEquivalence.slot.normal,'Fast Slots must preserve result, player state, tile state and exact RNG state/call count');
    assert.deepEqual(actual.fastEquivalence.wheel.fast,actual.fastEquivalence.wheel.normal,'Fast Wheel must preserve result, player state, tile state and exact RNG state/call count');
    if(CAPTURE){console.log("ROAD_EVENTS_FIXTURE_BEGIN");console.log(JSON.stringify(actual,null,2));console.log("ROAD_EVENTS_FIXTURE_END");return;}
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.equal(fixture.version,"0.6.6.25","Road Events fixture must remain the released 0.6.6.25 baseline");
    assert.ok(actual.version,"runtime version must be exposed while executing the baseline oracle");

    // 0.6.7.22 approved #202 downstream delta:
    // blessing-d applies Miracle Engine first, which grants three random
    // Sealed-Relic-style high-rarity Powerups. Expanding that canonical floor
    // from Rare+ to Uncommon+ changes only the resulting player stats/signature;
    // the offer set plus exact RNG call count/state remain frozen.
    const expected=structuredClone(fixture.cases);
    {
      const record=expected.find(c=>c.name==="blessing-d");
      assert.ok(record,"missing frozen blessing-d Road Events case");
      record.player.luck=0;
      record.player.crit=.27;
      record.player.doubleStrike=.40;
      record.signature="823d4f05";
    }
    for(const actualCase of actual.cases){
      const expectedCase=expected.find(c=>c.name===actualCase.name);
      assert.ok(expectedCase,"unexpected Road Events case "+actualCase.name);
      assert.deepEqual(actualCase,expectedCase,"Road Events oracle mismatch: "+actualCase.name);
    }
    assert.equal(actual.cases.length,expected.length,"Road Events case count changed unexpectedly");
    console.log(`Road Events oracle PASS: ${actual.cases.length} exact released-output/state/RNG cases match ${fixture.version} baseline on runtime ${actual.version}.`);
  } finally {
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(r=>server.close(r));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
