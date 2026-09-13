#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.join(__dirname,"..");
const monolith=fs.readFileSync(path.join(ROOT,"runtime","js","dicebound.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"runtime","js","module-manifest.json"),"utf8"));
const treasureSource=fs.readFileSync(path.join(ROOT,"runtime","js","events","treasure.js"),"utf8");

const moduleEntry=manifest.modules.find(m=>m.id==="road-event-treasure");
assert.ok(moduleEntry,"runtime manifest must register road-event-treasure");
assert.equal(moduleEntry.path,"js/events/treasure.js");
assert.ok((moduleEntry.provides||[]).includes("DiceboundRoadEventTreasure"));
const facade=manifest.modules.find(m=>m.id==="road-events-facade");
assert.ok((facade?.requires||[]).includes("road-event-treasure"),"Road Events facade must own the Treasure internal dependency");

for(const retired of [
  "function openTreasure(){",
  "openTreasure=function(){",
  "openTreasureV24Base",
  "db060OpenTreasureBase",
  "db060MemoryCacheChance"
])assert.equal(monolith.includes(retired),false,`retired Treasure implementation/shadow remains in dicebound.js: ${retired}`);

for(const required of [
  "treasure:{",
  "generateLegendary:(slot,preferUndiscovered)=>dbItems.generateLegendary(slot,preferUndiscovered)",
  "openTreasure:()=>dbRoadEvents.openTreasure()"
])assert.ok(monolith.includes(required),`Treasure composition is missing: ${required}`);

for(const required of [
  "function openRegular()",
  "function memoryCacheChance()",
  "level>=4&&random()<memoryCacheChance()",
  "return requireFn('openLoot')(item,()=>requireFn('returnToRoad')())"
])assert.ok(treasureSource.includes(required),`extracted Treasure owner is missing final 0.6 behavior: ${required}`);

console.log("Road Event Treasure shadow-drain guard PASS.");
