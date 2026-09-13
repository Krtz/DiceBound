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

const calls=[];
const treasureOwner={
  owner:"events/treasure",
  configure(runtime){calls.push(["configureTreasure",runtime]);return this;},
  open(...args){calls.push(["openTreasure",...args]);return "openTreasure-result";}
};
const sandbox={window:{DiceboundRoadEventTreasure:treasureOwner},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:FACADE_PATH});
const api=sandbox.window.DiceboundRoadEvents;
assert.ok(api,"DiceboundRoadEvents must be assigned");
assert.ok(Object.isFrozen(api),"DiceboundRoadEvents must be frozen");
assert.equal(api.owner,"events/facade");

const names=["Slot","Wheel","Blessing","Mystic","Bloodwell","Gambler"];
const config={treasure:{fixture:true}};
for(const name of names){const key=`open${name}`;config[key]=(...args)=>{calls.push([key,...args]);return `${key}-result`;};}
assert.equal(api.configure(config),api,"configure must preserve the single facade object");
for(const name of names){const key=`open${name}`;assert.equal(api[key]("fixture",name),`${key}-result`);}
assert.equal(api.openTreasure("fixture","Treasure"),"openTreasure-result");
assert.deepEqual(calls[0],["configureTreasure",config.treasure]);
assert.deepEqual(calls.slice(1),[
  ...names.map(name=>[`open${name}`,"fixture",name]),
  ["openTreasure","fixture","Treasure"]
]);
assert.deepEqual({...api.inspect().configured},{slot:true,wheel:true,treasure:true,blessing:true,mystic:true,bloodwell:true,gambler:true});
assert.equal(api.inspect().internals.treasure,"events/treasure");

// The facade is composition/delegation only. Gameplay RNG, DOM implementation and
// reward values belong to internals, never to this public boundary.
for(const forbidden of ["Math.random","DiceboundRng","document.","getElementById","querySelector","player.","tiles[","setTimeout(","+70 gold","Miracle Engine","Sacrifice 20%"]){
  assert.equal(source.includes(forbidden),false,`Road Events facade absorbed implementation detail: ${forbidden}`);
}

const monolith=fs.readFileSync(MONOLITH_PATH,"utf8");
const manifest=JSON.parse(fs.readFileSync(MANIFEST_PATH,"utf8"));
const treasureModule=manifest.modules.find(m=>m.id==="road-event-treasure");
assert.ok(treasureModule,"module manifest must register road-event-treasure");
assert.equal(treasureModule.path,"js/events/treasure.js");
assert.ok((treasureModule.provides||[]).includes("DiceboundRoadEventTreasure"));
const facadeModule=manifest.modules.find(m=>m.id==="road-events-facade");
assert.ok(facadeModule,"module manifest must register road-events-facade");
assert.equal(facadeModule.path,"js/events/facade.js");
assert.ok((facadeModule.provides||[]).includes("DiceboundRoadEvents"));
assert.ok((facadeModule.requires||[]).includes("road-event-treasure"),"Road Events facade must depend on its Treasure internal");
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
])assert.ok(monolith.includes(required),`dicebound.js is missing Road Events facade routing/composition: ${required}`);

for(const retired of ["openEvent:()=>openEvent()","openWheelEvent:()=>openWheelEvent()"]){
  assert.equal(monolith.split(retired).length-1,0,`Board/Run still routes directly to Road Event implementation: ${retired}`);
}
for(const adapter of [
  "openBlessing:()=>openBlessing()",
  "openMystic:()=>openMystic()",
  "openBloodwell:()=>openBloodwell()",
  "openGambler:()=>openGambler()"
]){
  assert.equal(monolith.split(adapter).length-1,1,`Road Event adapter must occur exactly once behind DiceboundRoadEvents: ${adapter}`);
}
assert.equal(monolith.includes("openTreasure:()=>openTreasure()"),false,"Treasure must no longer fall back to a monolith adapter");

console.log("Road Events facade delegation and routing-boundary tests passed.");
