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

let effectPlayer={classId:"ranger",equipment:{}};
const effectMeta={legendaryEffectsDiscovered:[]};
const effectController=owner.createController({
  getPlayer:()=>effectPlayer,
  getMeta:()=>effectMeta,
  getClassIdentityId:()=>effectPlayer.classId,
  slots:["weapon"],
  rollGearRarity:()=>"legendary",
  pick:list=>list[0],
  random:()=>.5,
  clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
  seedCode:()=>"effect-test-seed",
  generateFromSeedCode:()=>({id:"effect-test",slot:"weapon",rarity:"legendary",bonuses:{}}),
  rarityBudgets:{poor:[1,1],common:[1,1],uncommon:[1,1],rare:[1,1],epic:[1,1],legendary:[1,1]},
  ordinaryApi:{generateOrdinaryItem:()=>({id:"effect-test",slot:"weapon",rarity:"legendary",bonuses:{}})}
});
assert.equal(effectController.hasEffect("hoarders_arsenal"),false);
assert.match(effectController.effectDescription({legendaryEffectId:"hoarders_arsenal"}),/current 0 gold, it grants \+0 damage/);
effectPlayer.gold=1250;
assert.match(effectController.effectDescription({legendaryEffectId:"hoarders_arsenal"}),/current 1250 gold, it grants \+2 damage/,"Hoarder's Arsenal presentation must expose the same live floor(gold\/500) bonus as combat");
assert.equal(effectController.effectDescription({legendaryEffectId:"reverse_engineering"}),owner.effectById.reverse_engineering.desc,"other Legendary descriptions must remain canonical and static");
effectPlayer.equipment.weapon={id:"hoarder-test",slot:"weapon",legendaryEffectId:"hoarders_arsenal"};
assert.equal(effectController.hasEffect("hoarders_arsenal"),true,"equipped Hoarder's Arsenal must aggregate by stable effect ID");
effectPlayer=JSON.parse(JSON.stringify(effectPlayer));
assert.equal(effectController.hasEffect("hoarders_arsenal"),true,"Hoarder's Arsenal effect identity must survive save/checkpoint-style serialization");
effectPlayer.equipment.weapon={id:"replacement",slot:"weapon",legendaryEffectId:"reverse_engineering"};
assert.equal(effectController.hasEffect("hoarders_arsenal"),false,"replacing Hoarder's Arsenal must remove the effect exactly once");

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
assert.ok(monolith.includes("dbItemGeneration.effectDescription(item)"),"Legendary equipment presentation must consume the Items owner's live effect description");
assert.ok(monolith.includes("generateLegendary:(slot=null,preferUndiscovered=false)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateLegendary(slot,preferUndiscovered);}"),"Items facade Legendary port must delegate to the focused generation controller");

console.log("Items generation owner boundary PASS: historical generator ladder and call-only adapters retired behind DiceboundItems.");
