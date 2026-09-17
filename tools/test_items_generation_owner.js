#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"runtime/js/items/generation.js"),"utf8");
const monolith=fs.readFileSync(path.join(ROOT,"runtime/js/dicebound.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"runtime/js/module-manifest.json"),"utf8"));
const index=fs.readFileSync(path.join(ROOT,"runtime/index.html"),"utf8");

const context={window:{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:"items/generation.js"});
const owner=context.window.DiceboundItemGeneration;
assert.ok(owner,"DiceboundItemGeneration owner missing");
assert.equal(owner.owner,"items/generation");
assert.equal(Object.isFrozen(owner),true);
assert.equal(owner.effects.length,20,"released Legendary effect registry must remain exact");
assert.equal(owner.effectById.twin_surge.name,"Twin Surge");
assert.equal(owner.effectById.reverse_engineering.name,"Reverse Engineering");

const module=manifest.modules.find(entry=>entry.id==="item-generation");
assert.ok(module,"item-generation missing from module manifest");
assert.equal(module.path,"js/items/generation.js");
assert.ok(module.provides.includes("DiceboundItemGeneration"));
assert.ok(index.includes('<script src="js/items/generation.js"></script>'),"runtime index must load generation owner");
assert.ok(manifest.loadOrder.indexOf("item-generation")<manifest.loadOrder.indexOf("items-facade"),"generation owner must load before Items facade");

// Historical implementation ownership and the call-only root generator adapters
// must stay gone. Ordinary monolith callers invoke DiceboundItems directly while
// composition wires that public facade to the focused generation controller.
for(const forbidden of [
  "const generateEquipmentV13=generateEquipment",
  "const generateEquipmentV24OrdinaryBase=generateEquipment",
  "const generateEquipmentV251Base=generateEquipment",
  "const db060GenerateEquipmentFallback=generateEquipment",
  "function db060RawGeneratedGear(",
  "function db060ChooseEffect(",
  "function db060AttachLegendaryEffect(",
  "generateEquipment=function(forceRarity=null,forcedSlot=null)"
])assert.equal(monolith.includes(forbidden),false,`generator shadow ownership remains in monolith: ${forbidden}`);
assert.doesNotMatch(monolith,/\bfunction\s+generateEquipment\s*\(/,"call-only generateEquipment adapter must stay retired");
assert.doesNotMatch(monolith,/\bfunction\s+generateLegendary\s*\(/,"call-only generateLegendary adapter must stay retired");
assert.ok(monolith.includes("dbItems.generateEquipment("),"ordinary generator callers must route directly through DiceboundItems");
assert.ok(monolith.includes("dbItems.generateLegendary("),"Legendary callers must route directly through DiceboundItems");
assert.ok(monolith.includes("dbItemGenerationOwner.createController({"),"composition must bind focused generation owner");
assert.ok(monolith.includes("generateLegendary:(slot=null,preferUndiscovered=false)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateLegendary(slot,preferUndiscovered);}"),"Items facade Legendary port must delegate to the focused generation controller");

console.log("Items generation owner boundary PASS: historical generator ladder and call-only adapters retired behind DiceboundItems.");
