#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.join(__dirname,"..");
const mono=fs.readFileSync(path.join(ROOT,"runtime","js","dicebound.js"),"utf8");
const lifecycle=fs.readFileSync(path.join(ROOT,"runtime","js","events","lifecycle.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"runtime","js","module-manifest.json"),"utf8"));

const entry=manifest.modules.find(m=>m.id==="road-event-lifecycle");
assert.ok(entry,"runtime manifest must register road-event-lifecycle");
assert.equal(entry.path,"js/events/lifecycle.js");
assert.ok((entry.provides||[]).includes("DiceboundRoadEventLifecycle"));
const facade=manifest.modules.find(m=>m.id==="road-events-facade");
assert.ok((facade?.requires||[]).includes("road-event-lifecycle"));

for(const retired of [
  "function openEvent(){","function slotSymbolHTML(","function setSlotReelSymbol(","function generateSlotResult(){","async function spinEvent(){",
  "function applySlotReward(","function db064ApplySlotReward(","const wheelRewards=[","function openWheelEvent(){","function syncWheelIcons(){","async function spinFortuneWheel(){",
  "const blessingPool=[","function openBlessing(){","function clearMysticTile(){","function openMystic(){","openMystic=function(){","function beta03RollMysticRarity(){",
  "function openBloodwell(){","openBloodwellV11","openBloodwellV17Base","function openGambler(){","openGambler=function(){","function finishGambler(msg)",
  '$("spinBtn").addEventListener("click",spinEvent)','$("wheelSpinBtn").addEventListener("click",spinFortuneWheel)','$("acceptMysticBtn").addEventListener("click",()=>{'
])assert.equal(mono.includes(retired),false,`retired Road Events lifecycle/shadow remains in dicebound.js: ${retired}`);

for(const required of [
  "function openSlot()","async function spinSlot()","function applySlotReward(result)","function openWheel()","async function spinWheel()",
  "function openBlessing()","function openMystic()","function acceptMystic()","function openBloodwell()","function openGambler()","function finishGambler(msg)",
  "window.DiceboundRoadEventLifecycle=api"
])assert.ok(lifecycle.includes(required),`lifecycle owner missing authoritative behavior: ${required}`);

// Generic fallback helper stays in the monolith because miniboss choices also use it.
assert.ok(mono.includes("function v27FallbackRarityPool(wanted)"),"shared miniboss/Mystic rarity fallback helper was incorrectly removed");
console.log("Road Events lifecycle shadow-drain guard PASS.");
