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

const sandbox={window:{},console};
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

// The facade is composition/delegation only. Gameplay RNG, DOM implementation and
// reward values belong to internals/monolith during migration, never to this boundary.
for(const forbidden of ["Math.random","DiceboundRng","document.","getElementById","querySelector","player.","tiles[","setTimeout(","+70 gold","Miracle Engine","Sacrifice 20%"]){
  assert.equal(source.includes(forbidden),false,`Road Events facade absorbed implementation detail: ${forbidden}`);
}

const monolith=fs.readFileSync(MONOLITH_PATH,"utf8");
const manifest=JSON.parse(fs.readFileSync(MANIFEST_PATH,"utf8"));
const facadeModule=manifest.modules.find(m=>m.id==="road-events-facade");
assert.ok(facadeModule,"module manifest must register road-events-facade");
assert.equal(facadeModule.path,"js/events/facade.js");
assert.ok((facadeModule.provides||[]).includes("DiceboundRoadEvents"));
const monolithModule=manifest.modules.find(m=>m.id==="dicebound-monolith");
assert.ok((monolithModule.requires||[]).includes("road-events-facade"),"monolith must depend on the public Road Events boundary");
for(const required of [
  "const dbRoadEvents=window.DiceboundRoadEvents;",
  "openEvent:()=>dbRoadEvents.openSlot()",
  "openWheelEvent:()=>dbRoadEvents.openWheel()",
  "openTreasure:()=>dbRoadEvents.openTreasure()",
  "openBlessing:()=>dbRoadEvents.openBlessing()",
  "openMystic:()=>dbRoadEvents.openMystic()",
  "openBloodwell:()=>dbRoadEvents.openBloodwell()",
  "openGambler:()=>dbRoadEvents.openGambler()"
])assert.ok(monolith.includes(required),`dicebound.js is missing Road Events facade routing: ${required}`);
for(const retired of [
  "openEvent:()=>openEvent()",
  "openWheelEvent:()=>openWheelEvent()",
  "openTreasure:()=>openTreasure()",
  "openBlessing:()=>openBlessing()",
  "openMystic:()=>openMystic()",
  "openBloodwell:()=>openBloodwell()",
  "openGambler:()=>openGambler()"
])assert.equal(monolith.includes(retired),false,`Board/Run still routes directly to Road Event implementation: ${retired}`);

console.log("Road Events facade delegation and routing-boundary tests passed.");
