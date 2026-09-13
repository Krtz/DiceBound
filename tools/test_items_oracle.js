#!/usr/bin/env node
"use strict";

// Beta 0.6.6.26 Items characterization/oracle harness.
// This intentionally exercises the released runtime's final generator/equip/value
// behavior before DiceboundItems ownership moves. Capture mode prints the fixture.

const assert=require("node:assert/strict");
const childProcess=require("node:child_process");
const fs=require("node:fs");
const http=require("node:http");
const os=require("node:os");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const RUNTIME=path.join(ROOT,"runtime");
const FIXTURE_PATH=path.join(__dirname,"fixtures","items_0_6_6_26.json");
const EDGE=process.env.DICEBOUND_EDGE||"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT=Number(process.env.DICEBOUND_ITEMS_DEBUG_PORT||19427);
const CAPTURE=process.env.DICEBOUND_CAPTURE_ITEMS==="1";
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".wav":"audio/wav"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function serveRuntime(){return new Promise((resolve,reject)=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname),rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,""),file=path.resolve(RUNTIME,rel);if(!file.startsWith(`${RUNTIME}${path.sep}`)&&file!==path.join(RUNTIME,"index.html")){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/index.html`}));});}
async function waitJson(url,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const r=await fetch(url);if(r.ok)return r.json();}catch(_){}await sleep(100);}throw new Error(`timeout ${url}`);}
async function connect(url){const origin=new URL(url).origin,end=Date.now()+15000;let target;while(Date.now()<end&&!target){const xs=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);target=xs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl&&x.url.startsWith(origin));if(!target)await sleep(100);}if(!target)throw new Error("Edge target missing");const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});socket.addEventListener("message",ev=>{const m=JSON.parse(String(ev.data)),p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);});function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}return {socket,send,evaluate};}

function assertCoverage(actual){
  assert.equal(actual.baselineVersion,"0.6.6.26");
  const generated=actual.cases.filter(c=>c.kind==="generate");
  for(const rarity of ["poor","common","uncommon","rare","epic","legendary"])assert.ok(generated.some(c=>c.requestedRarity===rarity),`missing ${rarity} generation case`);
  assert.ok(generated.some(c=>c.forcedSlot==="weapon"),"missing forced weapon generation");
  assert.ok(generated.some(c=>c.forcedSlot==="ring"||c.forcedSlot==="chest"),"missing forced non-weapon generation");
  assert.ok(generated.some(c=>c.item?.slot==="weapon"&&c.item?.element),"missing elemental weapon result");
  assert.ok(generated.some(c=>c.item?.slot==="weapon"&&!c.item?.element),"missing non-elemental weapon result");
  assert.ok(generated.some(c=>c.requestedRarity==="artifact"),"missing Artifact compatibility case");
  assert.ok(generated.some(c=>c.requestedRarity==="mythical"),"missing Mythical compatibility case");
  assert.ok(generated.some(c=>c.requestedRarity==="omega"),"missing Omega compatibility case");
  assert.ok(generated.some(c=>c.requestedRarity==="bogus"&&c.item),"invalid rarity compatibility path must remain non-null");
  const leg=actual.cases.filter(c=>c.kind==="legendary");
  assert.ok(leg.some(c=>c.preferUndiscovered===false));
  assert.ok(leg.some(c=>c.preferUndiscovered===true&&c.discoveredMode==="some"));
  assert.ok(leg.some(c=>c.preferUndiscovered===true&&c.discoveredMode==="all"));
  assert.ok(leg.every(c=>c.item?.legendaryGenerated&&c.item?.legendaryEffectId),"generated Legendary fields missing");
  const value=actual.cases.find(c=>c.kind==="equip-value");
  assert.ok(value?.emptyComparison&&value?.occupiedComparison,"missing comparison characterization");
  assert.ok(value?.merchantSell>value?.normalSell,"Merchant sell multiplier not characterized");
  assert.ok(actual.cases.some(c=>c.kind==="treasure"&&c.lootVisible),"missing real Treasure generated-loot handoff");
}

async function main(){
  if(!CAPTURE)assert.ok(fs.existsSync(FIXTURE_PATH),`missing frozen Items fixture: ${FIXTURE_PATH}`);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"dicebound-items-oracle-"));
  const {server,url}=await serveRuntime();let child,page;
  try{
    child=childProcess.spawn(EDGE,["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-allow-origins=*",`--user-data-dir=${profile}`,`--remote-debugging-port=${DEBUG_PORT}`,url],{stdio:"ignore",windowsHide:true});
    page=await connect(url);await page.send("Runtime.enable");
    const end=Date.now()+20000;while(Date.now()<end){if(await page.evaluate("document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundRng&&!!window.DiceboundBeta06Test&&!!window.DiceboundItemsOracleTest"))break;await sleep(100);}
    const actual=await page.evaluate(`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
      const compactItem=item=>item?{id:item.id,seed:item.seed||null,seedCode:item.seedCode||null,equipmentId:item.equipmentId||null,name:item.name,slot:item.slot,rarity:item.rarity,itemPower:item.itemPower??null,spentPower:item.spentPower??null,prefix:item.prefix??null,suffix:item.suffix??null,affixTier:item.affixTier??null,suffixTier:item.suffixTier??null,element:item.element??null,bonuses:clone(item.bonuses||{}),legendaryGenerated:!!item.legendaryGenerated,legendaryEffectId:item.legendaryEffectId||null,legendaryEffectName:item.legendaryEffectName||null,legendaryEffectDesc:item.legendaryEffectDesc||null,uniqueEffect:item.uniqueEffect||null,v24Rarity:!!item.v24Rarity}:null;
      document.getElementById('campGoBtn')?.click();await wait(250);document.getElementById('classUnlockRevealOverlay')?.classList.add('hidden');
      window.DiceboundRng.seed('items-template');const template=window.DiceboundRunResumeTest.snapshot();
      const outputs=[];
      const restore=(name,{classId='ranger',board=1,position=8,discovered=[]}={})=>{const cp=structuredClone(template);cp.run.player.classId=classId;cp.run.boardLevel=board;cp.run.player.position=Math.min(position,cp.run.tiles.length-2);cp.meta.legendaryEffectsDiscovered=[...discovered];window.DiceboundRunResumeTest.restore(cp);window.DiceboundRng.seed('items-oracle:'+name);return window.DiceboundRng.snapshot();};
      const finish=(record,before)=>{const after=window.DiceboundRng.snapshot();outputs.push({...record,rngCalls:after.calls-before.calls,rngState:after.state});};
      const gen=window.DiceboundItemsOracleTest;
      const genCases=[
        ['poor-weapon-ranger','poor','weapon','ranger',1,5],['common-ring-fighter','common','ring','fighter',2,18],['uncommon-random-sorcerer','uncommon',null,'sorcerer',3,30],['rare-random-ranger','rare',null,'ranger',4,42],['epic-weapon-fighter','epic','weapon','fighter',5,54],
        ['weapon-element-a','rare','weapon','ranger',4,40],['weapon-element-b','epic','weapon','sorcerer',5,50],['weapon-element-c','common','weapon','fighter',2,20],['weapon-element-d','poor','weapon','ranger',1,8],
        ['legendary-random','legendary',null,'ranger',5,50],['legendary-ring','legendary','ring','fighter',6,60],
        ['compat-artifact','artifact',null,'ranger',4,40],['compat-mythical','mythical','chest','fighter',4,40],['compat-omega','omega','ring','sorcerer',4,40],['invalid-bogus','bogus',null,'ranger',2,20],
        ['repeat-a','rare','ring','ranger',3,30],['repeat-b','rare','ring','ranger',3,30]
      ];
      for(const [name,rarity,slot,classId,board,position] of genCases){const before=restore(name,{classId,board,position});const item=gen.generateEquipment(rarity,slot);finish({name,kind:'generate',requestedRarity:rarity,forcedSlot:slot,classId,board,position,item:compactItem(item)},before);}
      const allEffects=window.DiceboundBeta06Test.legendaryEffects().map(e=>e.id);
      const legCases=[['legendary-normal',null,false,'none',[]],['legendary-forced-weapon','weapon',false,'none',[]],['legendary-undiscovered','ring',true,'some',allEffects.slice(0,Math.max(1,Math.floor(allEffects.length/2)))],['legendary-all-seen','chest',true,'all',allEffects]];
      for(const [name,slot,preferUndiscovered,discoveredMode,discovered] of legCases){const before=restore(name,{classId:'ranger',board:5,position:50,discovered});const item=gen.generateLegendary(slot,preferUndiscovered);finish({name,kind:'legendary',forcedSlot:slot,preferUndiscovered,discoveredMode,discovered:[...discovered],item:compactItem(item)},before);}
      {
        const before=restore('equip-value',{classId:'ranger',board:4,position:40});const first=gen.generateEquipment('rare','weapon'),second=gen.generateEquipment('epic','weapon');const emptyComparison=gen.formatComparison(first,null);const normalSell=gen.sellValue(first);const equipped=gen.equip(first,true);const occupiedComparison=gen.formatComparison(second,equipped);const cp=window.DiceboundRunResumeTest.snapshot();cp.run.player.classId='merchant';window.DiceboundRunResumeTest.restore(cp);const merchantSell=gen.sellValue(first);finish({name:'equip-value',kind:'equip-value',first:compactItem(first),second:compactItem(second),equipped:compactItem(equipped),emptyComparison,occupiedComparison,normalSell,merchantSell},before);
      }
      {
        restore('treasure-generated',{classId:'ranger',board:3,position:8});const cp=window.DiceboundRunResumeTest.snapshot();cp.run.tiles[cp.run.player.position]={type:'treasure',cleared:false,packSize:1};window.DiceboundRunResumeTest.restore(cp);window.DiceboundRng.seed('items-oracle:treasure-generated');const treasureBefore=window.DiceboundRng.snapshot();window.DiceboundRun.dispatchTile();await wait(40);const lootVisible=!document.getElementById('lootOverlay')?.classList.contains('hidden');const loot=lootVisible?{name:document.querySelector('#lootCard .loot-name')?.textContent||'',rarity:document.querySelector('#lootCard .rarity-badge')?.textContent||'',bonuses:document.querySelector('#lootCard .loot-bonuses')?.textContent?.trim()||''}:null;finish({name:'treasure-generated',kind:'treasure',lootVisible,loot},treasureBefore);document.getElementById('lootOverlay')?.classList.add('hidden');
      }
      return {baselineVersion:'0.6.6.26',runtimeVersion:window.DiceboundVersion?.version||null,cases:outputs};
    })()`);
    assertCoverage(actual);
    if(CAPTURE){console.log("ITEMS_FIXTURE_BEGIN");console.log(JSON.stringify(actual,null,2));console.log("ITEMS_FIXTURE_END");return;}
    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.equal(fixture.baselineVersion,"0.6.6.26","Items fixture must remain the released 0.6.6.26 baseline");
    assert.deepEqual(actual.cases,fixture.cases);
    console.log(`Items oracle PASS: ${actual.cases.length} exact released-output/state/RNG cases match ${fixture.baselineVersion} baseline on runtime ${actual.runtimeVersion}.`);
  } finally {
    try{await page?.send("Browser.close");}catch(_){}try{page?.socket.close();}catch(_){}if(child?.exitCode===null)child.kill();await new Promise(r=>server.close(r));try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
