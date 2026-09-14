"use strict";

const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const runtime=path.join(__dirname,"..","runtime","js");
const results=[];
function pass(name,fn){fn();results.push(name);}
function run(context,relative){const file=path.join(runtime,relative);vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});}
function json(value){return JSON.parse(JSON.stringify(value));}
function btoaNode(value){return Buffer.from(String(value),"binary").toString("base64");}
function atobNode(value){return Buffer.from(String(value),"base64").toString("binary");}

function makePersistenceContext(){
  const values=new Map(),window={};window.window=window;
  window.DiceboundVersion=Object.freeze({version:"0.6.6.34",channel:"Beta"});
  window.DiceboundPlatform=Object.freeze({nowIso:()=>"2026-09-14T18:00:00.000Z"});
  window.DiceboundStorage=Object.freeze({
    getString:key=>values.get(String(key))??null,
    setString:(key,value)=>{values.set(String(key),String(value));return true;},
    remove:key=>{values.delete(String(key));return true;},
    has:key=>values.has(String(key)),
    keys:(prefix="")=>[...values.keys()].filter(key=>String(key).startsWith(String(prefix))).sort(),
    diagnostics:()=>({backend:"oracle"}),
  });
  const context=vm.createContext({window,console,Date,Math,btoa:btoaNode,atob:atobNode,escape,unescape,encodeURIComponent,decodeURIComponent});
  run(context,"rng.js");run(context,"save-system.js");run(context,path.join("core","run-checkpoint.js"));run(context,path.join("core","state.js"));
  return {context,window,values};
}

pass("save-backup-rotation",()=>{
  const {window,values}=makePersistenceContext(),save=window.DiceboundSave;
  save.saveMeta({slot:"A",level:1});save.saveMeta({slot:"B",level:2});save.saveMeta({slot:"C",level:3});
  const primary=JSON.parse(values.get(save.primaryKey));
  const backup1=JSON.parse(values.get(save.backupKeys[0]));
  const backup2=JSON.parse(values.get(save.backupKeys[1]));
  assert.equal(primary.payload.meta.slot,"C");assert.equal(backup1.payload.meta.slot,"B");assert.equal(backup2.payload.meta.slot,"A");
  assert.equal(primary.schemaVersion,2);assert.equal(primary.gameVersion,"0.6.6.34");
});

pass("save-corrupt-primary-recovery",()=>{
  const {window,values}=makePersistenceContext(),save=window.DiceboundSave;
  save.saveMeta({slot:"A"});save.saveMeta({slot:"B"});values.set(save.primaryKey,"{broken json");
  const loaded=save.loadMeta({defaultFactory:()=>({slot:"new"}),normalize:value=>({...value,normalized:true})});
  assert.equal(loaded.source,"backup-1");assert.equal(loaded.recovered,true);assert.equal(loaded.meta.slot,"A");assert.equal(loaded.meta.normalized,true);
  assert.match(String(loaded.error),/JSON|position|property|Expected/i);
  assert.equal(JSON.parse(values.get(save.primaryKey)).payload.meta.slot,"A");
});

pass("save-export-import-roundtrip",()=>{
  const {window}=makePersistenceContext(),save=window.DiceboundSave;
  const original={level:17,purchased:{roadborn:1},nested:{a:[1,2,3]}};
  const text=save.exportText(original);assert.ok(text.startsWith("DICEBOUND_SAVE_V2:"));
  const imported=save.importText(text,{normalize:value=>({...value,normalized:true})});
  assert.equal(JSON.stringify(imported),JSON.stringify({...original,normalized:true}));
  assert.equal(save.loadMeta({defaultFactory:()=>({}),normalize:value=>value}).meta.level,17);
});

pass("active-run-checkpoint-rng-continuation",()=>{
  const {context,window}=makePersistenceContext(),rng=window.DiceboundRng,cp=window.DiceboundRunCheckpoint;
  rng.seed("runtime-oracle");rng.random();rng.random();
  const fixture={summary:{board:3},meta:{level:9},run:{player:{classId:"ranger",gold:77},tiles:[{type:"start"}]}};
  vm.runInContext(`window.__runtimeOracleCheckpoint=JSON.parse(${JSON.stringify(JSON.stringify(fixture))})`,context);
  const created=vm.runInContext("window.DiceboundRunCheckpoint.create(window.__runtimeOracleCheckpoint)",context);
  const snap=json(created.rng);cp.store(created);const expected=[rng.random(),rng.random(),rng.random()];rng.restore(snap);
  assert.equal(JSON.stringify([rng.random(),rng.random(),rng.random()]),JSON.stringify(expected));
  const loaded=cp.load();assert.equal(loaded.checkpoint.run.player.gold,77);assert.equal(loaded.checkpoint.summary.board,3);assert.equal(cp.has(),true);cp.clear();assert.equal(cp.has(),false);
});

pass("checkpoint-validation-errors",()=>{
  const {context,window}=makePersistenceContext(),cp=window.DiceboundRunCheckpoint;
  assert.throws(()=>vm.runInContext("window.DiceboundRunCheckpoint.validate({checkpointVersion:99,gameVersion:'0.6.6.34',meta:{},run:{player:{},tiles:[{}]},rng:{mode:'seeded'}})",context),/unsupported/);
  assert.throws(()=>vm.runInContext("window.DiceboundRunCheckpoint.create({meta:{},run:{player:{bad:()=>1},tiles:[{}]}})",context),/unsupported function data/);
  assert.equal(cp.uiFix,"browser-camp-resume-v2");
});

pass("core-default-career",()=>{
  const {window}=makePersistenceContext();
  const service=window.DiceboundCoreState.createMetaService({classIds:["ranger","fighter","sorcerer"],petIds:["neutral","fire","ice"],elementIds:["fire","ice"],petUnlockRequirement:500,saveService:null});
  const defaults=service.defaultMeta(),serialized=JSON.stringify(defaults);
  assert.equal(Buffer.byteLength(serialized),864);
  assert.equal(crypto.createHash("sha256").update(serialized).digest("hex"),"792efe9975270b9abf6ad7acaa22a3724662fac68407d135c12549fa538fe488");
  assert.equal(JSON.stringify([1,10,11,25,26,50,51,100,101].map(service.legacyXpForLevel)),JSON.stringify([10,28,32,88,93,213,221,613,624]));
});

pass("core-normalization",()=>{
  const {window}=makePersistenceContext();
  const service=window.DiceboundCoreState.createMetaService({classIds:["ranger","fighter"],petIds:["neutral","fire"],elementIds:["fire"],petUnlockRequirement:500,saveService:null});
  const meta=service.normalizeMeta({level:26,xpNext:999,purchased:{fortune_gold:2},elementProgress:{fire:500},settings:{masterVolume:2,soundPack:"custom",muted:true}});
  assert.equal(meta.xpNext,93);assert.equal(meta.purchased.roadborn,1);assert.equal(meta.pets.fire.unlocked,true);assert.equal(meta.settings.masterVolume,1);assert.equal(meta.settings.soundPack,"custom");assert.equal(meta.settings.muted,true);
});

pass("core-event-bus",()=>{
  const errors=[];
  const context=vm.createContext({window:{},console:{error:(...args)=>errors.push(args)}});run(context,path.join("core","state.js"));
  const bus=context.window.DiceboundCoreState.createEventBus(),calls=[];const off=bus.on("tick",v=>calls.push(`a:${v}`));bus.on("tick",()=>{throw new Error("boom");});bus.on("tick",v=>calls.push(`b:${v}`));
  assert.equal(bus.emit("tick",7),7);off();bus.emit("tick",8);assert.equal(JSON.stringify(calls),JSON.stringify(["a:7","b:7","b:8"]));assert.equal(errors.length,2);assert.throws(()=>bus.on("tick",null),/listener must be a function/);
});

pass("runtime-services-live-player",()=>{
  const window={},context=vm.createContext({window,console});run(context,path.join("core","runtime-services.js"));
  let player={gold:10,hp:20,heal(n){this.hp+=n;return this.hp;}};
  const services=window.DiceboundRuntimeServices.createPowerupServices({run:{getPlayer:()=>player},economy:{goldReward:n=>n*2,isNightmare:()=>false},combat:{heal:n=>n},rules:{clamp:(n,a,b)=>Math.max(a,Math.min(b,n))},content:{elementIds:["fire","ice"]},signatures:{applyCurrent:()=>"ok",describeCurrent:()=>"sig"}});
  assert.equal(services.run.player.gold,10);services.run.player.gold=15;assert.equal(player.gold,15);assert.equal(services.run.player.heal(5),25);player={gold:3,hp:7};assert.equal(services.run.player.gold,3);assert.equal(JSON.stringify(services.content.elementIds),JSON.stringify(["fire","ice"]));assert.ok(Object.isFrozen(services));
});

pass("storage-memory-backend",()=>{
  const window={};window.window=window;window.DiceboundWrapper=null;
  const localStorage={setItem(){throw new Error("blocked");},removeItem(){},getItem(){return null;},get length(){return 0;},key(){return null;}};
  const context=vm.createContext({window,localStorage,console,Map,Array,Object,String});run(context,"storage.js");const storage=window.DiceboundStorage;
  assert.equal(storage.backend,"memory");assert.equal(storage.isPersistent,false);storage.setString("dicebound.z","1");storage.setString("dicebound.a","2");assert.equal(JSON.stringify(storage.keys("dicebound.")),JSON.stringify(["dicebound.a","dicebound.z"]));assert.equal(storage.diagnostics().persistent,false);
});

pass("platform-browser-diagnostics",()=>{
  const window={};window.window=window;window.DiceboundVersion=Object.freeze({version:"0.6.6.34",channel:"Beta"});window.DiceboundWrapper=null;window.open=()=>null;window.alert=()=>{};window.confirm=()=>true;window.prompt=()=>"";
  const document={fullscreenElement:null,visibilityState:"visible",body:{appendChild(){}},documentElement:{requestFullscreen:null},createElement:()=>({style:{},setAttribute(){},select(){},remove(){},click(){}}),execCommand:()=>true,exitFullscreen:async()=>{}};
  const navigator={userAgent:"runtime-oracle",language:"en",onLine:true,clipboard:null};const location={protocol:"file:",reload(){}};
  const context=vm.createContext({window,document,navigator,location,console,Blob:function(){},URL:{createObjectURL:()=>"blob:x",revokeObjectURL(){}},FileReader:function(){},setTimeout});run(context,"platform.js");
  const info=window.DiceboundPlatform.runtimeInfo();assert.equal(info.kind,"browser");assert.equal(info.isWrapped,false);assert.equal(info.protocol,"file:");assert.equal(info.userAgent,"runtime-oracle");assert.equal(info.nativeTextSaveSupported,false);assert.equal(window.DiceboundPlatform.appInfo().appVersion,"0.6.6.34");
});

pass("memory-diagnostics-pure-summary",()=>{
  const window={DiceboundVersion:{version:"0.6.6.34",channel:"Beta"},DiceboundAssets:{a:"assets/a.png",b:{c:"assets/b.png"}}};
  const context=vm.createContext({window,console,performance:{},setTimeout,clearTimeout,setInterval,clearInterval,Date});run(context,path.join("core","memory-diagnostics.js"));const api=window.DiceboundMemoryDiagnostics;
  const summary=api.summarizeEquivalentState([{timestamp:"a",reason:"x",state:{screen:"Camp",board:1},dom:{nodeCount:10},heap:{usedBytes:100}},{timestamp:"b",reason:"y",state:{screen:"Camp",board:1},dom:{nodeCount:13},heap:{usedBytes:140}},{timestamp:"c",reason:"z",state:{screen:"Board",board:1},dom:{nodeCount:99},heap:{usedBytes:999}}],{screen:"Camp",board:1});
  assert.equal(summary.sampleCount,2);assert.equal(JSON.stringify(summary.domNodeDeltas),JSON.stringify([0,3]));assert.equal(JSON.stringify(summary.heapUsedByteDeltas),JSON.stringify([0,40]));assert.equal(api.diagnostics().recording,false);
});

assert.equal(results.length,12);
console.log(`Runtime oracle PASS: ${results.length} exact released-0.6.6.34 cases (${results.join(", ")})`);
