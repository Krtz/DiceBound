#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.join(__dirname,"..");
const FACADE_PATH=path.join(ROOT,"runtime","js","events","facade.js");
const MONOLITH_PATH=path.join(ROOT,"runtime","js","dicebound.js");
const MANIFEST_PATH=path.join(ROOT,"runtime","js","module-manifest.json");
const source=fs.readFileSync(FACADE_PATH,"utf8");

let treasureConfig=null;
const treasureCalls=[];
const treasureApi=Object.freeze({owner:"events/treasure",open:(...args)=>{treasureCalls.push(args);return "internal-treasure-result";}});
const sandbox={window:{DiceboundRoadEventTreasure:{configure(config){treasureConfig=config;return treasureApi;}}},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:FACADE_PATH});
const api=sandbox.window.DiceboundRoadEvents;
assert.ok(api,"DiceboundRoadEvents must be assigned");
assert.ok(Object.isFrozen(api),"DiceboundRoadEvents must be frozen");
assert.equal(api.owner,"events/facade");

const calls=[];
const names=["Slot","Wheel","Treasure","Blessing","Mystic","Bloodwell","Gambler"];
const config={};
for(const name of names){const key=`open${name}`;config[key]=(...args)=>{calls.push([key,...args]);return `${key}-result`;};}
assert.equal(api.configure(config),api,"configure must preserve the single facade object");
for(const name of names){const key=`open${name}`;assert.equal(api[key]("fixture",name),`${key}-result`);}
assert.deepEqual(calls,names.map(name=>[`open${name}`,"fixture",name]));
assert.deepEqual({...api.inspect().configured},{slot:true,wheel:true,treasure:true,blessing:true,mystic:true,bloodwell:true,gambler:true});

// Once an extracted Treasure runtime is supplied, the facade must prefer its internal
// owner over the migration fallback callback while keeping the same public API.
const treasureRuntime={fixture:true};
assert.equal(api.configure({treasure:treasureRuntime}),api);
assert.equal(treasureConfig,treasureRuntime);
assert.equal(api.openTreasure("internal"),"internal-treasure-result");
assert.deepEqual(treasureCalls,[["internal"]]);
assert.equal(api.inspect().internals.treasure,"events/treasure");

// The facade is composition/delegation only. Gameplay RNG, DOM implementation and
// reward values belong to internal owners/remaining migration code, never the facade.
for(const forbidden of ["Math.random","DiceboundRng","document.","getElementById","querySelector","player.","tiles[","setTimeout(","+70 gold","Miracle Engine","Sacrifice 20%"]){
  assert.equal(source.includes(forbidden),false,`Road Events facade absorbed implementation detail: ${forbidden}`);
}

const monolith=fs.readFileSync(MONOLITH_PATH,"utf8");
const manifest=JSON.parse(fs.readFileSync(MANIFEST_PATH,"utf8"));
const facadeModule=manifest.modules.find(m=>m.id==="road-events-facade");
assert.ok(facadeModule,"module manifest must register road-events-facade");
assert.equal(facadeModule.path,"js/events/facade.js");
assert.ok((facadeModule.provides||[]).includes("DiceboundRoadEvents"));
assert.ok((facadeModule.requires||[]).includes("road-event-treasure"),"Road Events facade must declare its extracted Treasure internal");
const monolithModule=manifest.modules.find(m=>m.id==="dicebound-monolith");
assert.ok((monolithModule.requires||[]).includes("road-events-facade"),"monolith must depend on the public Road Events boundary");
for(const required of [
  "const dbRoadEvents=window.DiceboundRoadEvents;",
  "treasure:{",
  "openEvent:()=>dbRoadEvents.openSlot()",
  "openWheelEvent:()=>dbRoadEvents.openWheel()",
  "openTreasure:()=>dbRoadEvents.openTreasure()",
  "openBlessing:()=>dbRoadEvents.openBlessing()",
  "openMystic:()=>dbRoadEvents.openMystic()",
  "openBloodwell:()=>dbRoadEvents.openBloodwell()",
  "openGambler:()=>dbRoadEvents.openGambler()"
])assert.ok(monolith.includes(required),`dicebound.js is missing Road Events facade composition/routing: ${required}`);

for(const retired of ["openEvent:()=>openEvent()","openWheelEvent:()=>openWheelEvent()","openTreasure:()=>openTreasure()"]){
  assert.equal(monolith.split(retired).length-1,0,`Road Events extraction still exposes a retired direct adapter: ${retired}`);
}
// The four not-yet-extracted same-name lifecycles remain exactly once as private facade
// adapters. A second occurrence would mean Board/Run bypassed the facade.
for(const adapter of [
  "openBlessing:()=>openBlessing()",
  "openMystic:()=>openMystic()",
  "openBloodwell:()=>openBloodwell()",
  "openGambler:()=>openGambler()"
]){
  assert.equal(monolith.split(adapter).length-1,1,`Road Event migration adapter must occur exactly once behind DiceboundRoadEvents: ${adapter}`);
}

console.log("Road Events facade delegation, extracted Treasure composition and routing-boundary tests passed.");
