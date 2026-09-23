#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const plain=value=>JSON.parse(JSON.stringify(value));
const store=new Map();
const exportsSeen=[];
const storage=Object.freeze({
  getString:key=>store.has(String(key))?store.get(String(key)):null,
  setString:(key,value)=>{store.set(String(key),String(value));return true;},
  remove:key=>{store.delete(String(key));return true;},
  has:key=>store.has(String(key)),
  keys:(prefix="")=>[...store.keys()].filter(key=>key.startsWith(prefix)).sort(),
  diagnostics:()=>Object.freeze({backend:"test",persistent:true,keys:[...store.keys()].sort()})
});
const platform=Object.freeze({
  capabilities:Object.freeze({debugBundle:true}),
  nowIso:()=>"2026-09-23T19:00:00.000Z",
  runtimeInfo:()=>Object.freeze({kind:"native-webview2",isWrapped:true,debugBundleSupported:true}),
  wrapperDiagnostics:()=>Object.freeze({contractVersion:1,isWrapped:true}),
  exportDebugBundle:payload=>{exportsSeen.push(plain(payload));return {ok:true,filename:"DiceBound-debug-test.zip",path:"C:/debug/DiceBound-debug-test.zip",includedSave:!!payload.includeSave};}
});
const window={
  DiceboundVersion:Object.freeze({version:"0.6.7.32",channel:"Beta"}),
  DiceboundPlatform:platform,
  DiceboundStorage:storage,
  DiceboundMemoryDiagnostics:Object.freeze({diagnostics:()=>Object.freeze({recording:false,sampleCount:0})})
};
window.window=window;
const context=vm.createContext({
  window,console,Date,JSON,Object,Number,String,Array,Math,URLSearchParams,
  location:{search:"?diceboundNative=1&build=abc123def456"},
  btoa:value=>Buffer.from(value,"binary").toString("base64"),
  atob:value=>Buffer.from(value,"base64").toString("binary"),
  escape:global.escape,unescape:global.unescape
});
vm.runInContext(read("runtime/js/save-system.js"),context,{filename:"save-system.js"});
const save=window.DiceboundSave;
assert.ok(save?.health,"Save owner must publish save health");

store.set(save.primaryKey,JSON.stringify({
  format:"dicebound-save",schemaVersion:2,gameVersion:"0.6.7.31",savedAt:"2026-09-23T18:00:00.000Z",
  profile:{id:"primary"},payload:{meta:{secretProgress:"NEVER_INCLUDE_ME",prestige:999}}
}));
store.set(save.backupKeys[0],JSON.stringify({
  format:"dicebound-save",schemaVersion:2,gameVersion:"0.6.7.31",savedAt:"2026-09-23T17:30:00.000Z",
  profile:{id:"primary"},payload:{meta:{secretProgress:"BACKUP_SECRET"}}
}));
store.set(save.backupKeys[1],"{broken-json");

const health=plain(save.health(Date.parse("2026-09-23T19:00:00.000Z")));
assert.equal(health.current.schemaVersion,2);
assert.equal(health.primary.present,true);
assert.equal(health.primary.valid,true);
assert.equal(health.primary.savedAt,"2026-09-23T18:00:00.000Z");
assert.equal(health.primary.ageMs,60*60*1000);
assert.equal(health.backups[0].valid,true);
assert.equal(health.backups[0].ageMs,90*60*1000);
assert.equal(health.backups[1].present,true);
assert.equal(health.backups[1].valid,false);
assert.equal(health.newestValidBackup.slot,1);
assert.equal(store.get(save.primaryKey).includes("NEVER_INCLUDE_ME"),true,"health inspection must not rewrite the primary save");

vm.runInContext(read("runtime/js/core/debug-bundle.js"),context,{filename:"debug-bundle.js"});
const api=window.DiceboundDebugBundle;
assert.ok(api);
assert.equal(api.supported(),true);
const report=plain(api.report());
assert.equal(report.identity.buildKey,"abc123def456");
assert.equal(report.privacy.saveIncluded,false);
assert.equal(report.privacy.savePayloadEmbeddedInReport,false);
assert.equal(report.saveHealth.primary.savedAt,"2026-09-23T18:00:00.000Z");
const serialized=JSON.stringify(report);
assert.doesNotMatch(serialized,/NEVER_INCLUDE_ME|BACKUP_SECRET|prestige/, "default debug report leaked save/progression payload");
assert.doesNotMatch(serialized,/"meta"\s*:/, "debug report must not embed the save meta object");
assert.doesNotMatch(serialized,/"checkpoint"\s*:/, "debug report must not embed an active-run checkpoint");

void (async()=>{
  const safe=await api.exportBundle();
  assert.equal(safe.ok,true);
  assert.equal(safe.includedSave,false);
  assert.equal(exportsSeen[0].includeSave,false,"save inclusion must default false");
  assert.equal(exportsSeen[0].report.privacy.saveIncluded,false);
  assert.doesNotMatch(JSON.stringify(exportsSeen[0].report),/NEVER_INCLUDE_ME|BACKUP_SECRET/);

  const opted=await api.exportBundle({includeSave:true});
  assert.equal(opted.ok,true);
  assert.equal(opted.includedSave,true);
  assert.equal(exportsSeen[1].includeSave,true,"explicit save opt-in must cross the native boundary");
  assert.equal(exportsSeen[1].report.privacy.saveIncluded,true);
  assert.doesNotMatch(JSON.stringify(exportsSeen[1].report),/NEVER_INCLUDE_ME|BACKUP_SECRET/,"even opted-in save contents belong to native ZIP entries, never the metadata report");

  console.log("Debug bundle PASS: save health is non-mutating and default reports contain no save/progression payload");
})().catch(error=>{console.error(error);process.exitCode=1;});
