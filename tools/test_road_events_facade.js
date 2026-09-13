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
const treasureOwner={owner:"events/treasure",configure(runtime){calls.push(["configureTreasure",runtime]);return this;},open(...args){calls.push(["openTreasure",...args]);return "treasure-result";}};
const lifecycleOwner={
  owner:"events/lifecycle",
  configure(runtime){calls.push(["configureLifecycle",runtime]);return this;},
  openSlot(...args){calls.push(["openSlot",...args]);return "slot-result";},
  openWheel(...args){calls.push(["openWheel",...args]);return "wheel-result";},
  openBlessing(...args){calls.push(["openBlessing",...args]);return "blessing-result";},
  openMystic(...args){calls.push(["openMystic",...args]);return "mystic-result";},
  openBloodwell(...args){calls.push(["openBloodwell",...args]);return "bloodwell-result";},
  openGambler(...args){calls.push(["openGambler",...args]);return "gambler-result";},
  resetTransient(...args){calls.push(["resetTransient",...args]);return "reset-result";}
};
const sandbox={window:{DiceboundRoadEventTreasure:treasureOwner,DiceboundRoadEventLifecycle:lifecycleOwner},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:FACADE_PATH});
const api=sandbox.window.DiceboundRoadEvents;
assert.ok(api,"DiceboundRoadEvents must be assigned");
assert.ok(Object.isFrozen(api),"DiceboundRoadEvents must be frozen");
assert.equal(api.owner,"events/facade");

const config={treasure:{fixture:"treasure"},lifecycle:{fixture:"lifecycle"}};
assert.equal(api.configure(config),api);
assert.equal(api.openSlot(1),"slot-result");
assert.equal(api.openWheel(2),"wheel-result");
assert.equal(api.openTreasure(3),"treasure-result");
assert.equal(api.openBlessing(4),"blessing-result");
assert.equal(api.openMystic(5),"mystic-result");
assert.equal(api.openBloodwell(6),"bloodwell-result");
assert.equal(api.openGambler(7),"gambler-result");
assert.equal(api.resetTransient("resume"),"reset-result");
assert.deepEqual(calls,[
  ["configureTreasure",config.treasure],["configureLifecycle",config.lifecycle],
  ["openSlot",1],["openWheel",2],["openTreasure",3],["openBlessing",4],["openMystic",5],["openBloodwell",6],["openGambler",7],["resetTransient","resume"]
]);
assert.deepEqual({...api.inspect().configured},{slot:true,wheel:true,treasure:true,blessing:true,mystic:true,bloodwell:true,gambler:true});
assert.deepEqual({...api.inspect().internals},{treasure:"events/treasure",lifecycle:"events/lifecycle"});

for(const forbidden of ["Math.random","DiceboundRng","document.","getElementById","querySelector","player.","tiles[","setTimeout(","Miracle Engine","Sacrifice 20%"]){
  assert.equal(source.includes(forbidden),false,`Road Events facade absorbed implementation detail: ${forbidden}`);
}

const monolith=fs.readFileSync(MONOLITH_PATH,"utf8");
const manifest=JSON.parse(fs.readFileSync(MANIFEST_PATH,"utf8"));
const treasureModule=manifest.modules.find(m=>m.id==="road-event-treasure");
const lifecycleModule=manifest.modules.find(m=>m.id==="road-event-lifecycle");
const facadeModule=manifest.modules.find(m=>m.id==="road-events-facade");
assert.ok(treasureModule&&lifecycleModule&&facadeModule,"Road Events internals and facade must all be registered");
assert.equal(treasureModule.path,"js/events/treasure.js");
assert.equal(lifecycleModule.path,"js/events/lifecycle.js");
assert.ok((treasureModule.provides||[]).includes("DiceboundRoadEventTreasure"));
assert.ok((lifecycleModule.provides||[]).includes("DiceboundRoadEventLifecycle"));
assert.ok((facadeModule.provides||[]).includes("DiceboundRoadEvents"));
assert.ok((facadeModule.requires||[]).includes("road-event-treasure"));
assert.ok((facadeModule.requires||[]).includes("road-event-lifecycle"));
const monolithModule=manifest.modules.find(m=>m.id==="dicebound-monolith");
assert.ok((monolithModule.requires||[]).includes("road-events-facade"));
for(const required of [
  "const dbRoadEvents=window.DiceboundRoadEvents;","treasure:{","lifecycle:{",
  "openEvent:()=>dbRoadEvents.openSlot()","openWheelEvent:()=>dbRoadEvents.openWheel()","openTreasure:()=>dbRoadEvents.openTreasure()",
  "openBlessing:()=>dbRoadEvents.openBlessing()","openMystic:()=>dbRoadEvents.openMystic()","openBloodwell:()=>dbRoadEvents.openBloodwell()","openGambler:()=>dbRoadEvents.openGambler()"
])assert.ok(monolith.includes(required),`dicebound.js is missing Road Events facade routing/composition: ${required}`);
for(const retired of [
  "openEvent:()=>openEvent()","openWheelEvent:()=>openWheelEvent()","openTreasure:()=>openTreasure()","openBlessing:()=>openBlessing()",
  "openMystic:()=>openMystic()","openBloodwell:()=>openBloodwell()","openGambler:()=>openGambler()"
])assert.equal(monolith.includes(retired),false,`Road Events direct implementation adapter remains: ${retired}`);

console.log("Road Events facade delegation and routing-boundary tests passed.");
