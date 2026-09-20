#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"runtime/js/items/facade.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"runtime/js/module-manifest.json"),"utf8"));
const monolith=fs.readFileSync(path.join(ROOT,"runtime/js/dicebound.js"),"utf8");
const index=fs.readFileSync(path.join(ROOT,"runtime/index.html"),"utf8");

const calls=[];
const context={window:{}};vm.createContext(context);vm.runInContext(source,context,{filename:"items/facade.js"});
const api=context.window.DiceboundItems;
assert.ok(api);assert.equal(Object.isFrozen(api),true);assert.equal(api.owner,"items/facade");
assert.throws(()=>api.generateEquipment("rare"),/not configured: generateEquipment/);

const runtime={
  generateEquipment:(rarity,slot)=>{calls.push(["generateEquipment",rarity,slot]);return {rarity,slot};},
  generateLegendary:(slot,prefer)=>{calls.push(["generateLegendary",slot,prefer]);return {slot,prefer};},
  rollGearRarity:bonus=>{calls.push(["rollGearRarity",bonus]);return "epic";},
  openLoot:(item,done)=>{calls.push(["openLoot",item]);return done?.();},
  equip:(item,silent)=>{calls.push(["equip",item,silent]);return item;},
  sellValue:item=>{calls.push(["sellValue",item]);return 22;},
  rawSellValue:item=>{calls.push(["rawSellValue",item]);return 11;},
  score:item=>{calls.push(["score",item]);return 33;},
  formatBonuses:item=>{calls.push(["formatBonuses",item]);return "bonuses";},
  formatComparison:(item,current)=>{calls.push(["formatComparison",item,current]);return "comparison";},
  syncHeirloomState:()=>{calls.push(["syncHeirloomState"]);return {unlocked:true};},
  toggleStoredHeirloomActive:item=>{calls.push(["toggleStoredHeirloomActive",item]);return true;},
  discardStoredHeirloom:item=>{calls.push(["discardStoredHeirloom",item]);return true;},
  toggleRunHeirloomStorage:item=>{calls.push(["toggleRunHeirloomStorage",item]);return true;},
  toggleLegacyHeirloom:item=>{calls.push(["toggleLegacyHeirloom",item]);return true;}
};
assert.equal(api.configure(runtime),api);
assert.deepEqual(api.generateEquipment("rare","weapon"),{rarity:"rare",slot:"weapon"});
assert.deepEqual(api.generateLegendary("ring",true),{slot:"ring",prefer:true});
assert.equal(api.rollGearRarity(.2),"epic");
let continued=false;api.openLoot({id:"loot"},()=>{continued=true;});assert.equal(continued,true);
assert.deepEqual(api.equip({id:"gear"},true),{id:"gear"});
assert.equal(api.sellValue({id:"gear"}),22);assert.equal(api.rawSellValue({id:"gear"}),11);assert.equal(api.score({id:"gear"}),33);
assert.equal(api.formatBonuses({id:"gear"}),"bonuses");assert.equal(api.formatComparison({id:"new"},{id:"old"}),"comparison");
assert.deepEqual(api.syncHeirloomState(),{unlocked:true});
assert.equal(api.toggleStoredHeirloomActive({id:"stored"}),true);
assert.equal(api.discardStoredHeirloom({id:"discard"}),true);
assert.equal(api.toggleRunHeirloomStorage({id:"run"}),true);
assert.equal(api.toggleLegacyHeirloom({id:"legacy"}),true);

const expectedCalls=["generateEquipment","generateLegendary","rollGearRarity","openLoot","equip","sellValue","rawSellValue","score","formatBonuses","formatComparison","syncHeirloomState","toggleStoredHeirloomActive","discardStoredHeirloom","toggleRunHeirloomStorage","toggleLegacyHeirloom"];
assert.deepEqual(calls.map(c=>c[0]),expectedCalls);
for(const value of Object.values(api.inspect().configured))assert.equal(value,true);

for(const forbidden of ["Math.random","DiceboundRng","document.","querySelector","rarityValues","legendaryEffect","player.","Date.now","generateOrdinaryItem"]){
  assert.equal(source.includes(forbidden),false,`Items facade contains implementation detail: ${forbidden}`);
}

const facadeModule=manifest.modules.find(m=>m.id==="items-facade");
const heirloomModule=manifest.modules.find(m=>m.id==="item-heirlooms");
assert.ok(facadeModule);assert.ok(heirloomModule);
assert.equal(heirloomModule.path,"js/items/heirlooms.js");
assert.ok(heirloomModule.provides.includes("DiceboundHeirloomOperations"));
assert.ok(facadeModule.requires.includes("item-heirlooms"));
assert.ok(index.includes('<script src="js/items/heirlooms.js"></script>'));
assert.ok(index.indexOf('js/items/heirlooms.js')<index.indexOf('js/items/facade.js'));

assert.ok(monolith.includes("const dbItems=window.DiceboundItems;"));
assert.ok(monolith.includes("dbItems.configure({"));
assert.ok(monolith.includes("syncStorage:()=>dbItems.syncHeirloomState()"));
assert.ok(monolith.includes("toggleStoredActive:item=>dbItems.toggleStoredHeirloomActive(item)"));
assert.ok(monolith.includes("generateEquipment:rarity=>dbItems.generateEquipment(rarity)"));
assert.ok(monolith.includes("generateLegendary:(slot,preferUndiscovered)=>dbItems.generateLegendary(slot,preferUndiscovered)"));
assert.ok(monolith.includes("rollGearRarity:bonus=>dbItems.rollGearRarity(bonus)"));
assert.ok(monolith.includes("openLoot:(item,done)=>dbItems.openLoot(item,done)"));
assert.ok(monolith.includes("generateEquipment:(rarity,slot)=>dbItems.generateEquipment(rarity,slot)"));
assert.ok(monolith.includes("rawSellValue:item=>dbItems.rawSellValue(item)"));
assert.ok(monolith.includes("equipItem:item=>dbItems.equip(item)"));
assert.ok(monolith.includes("formatBonuses:item=>dbItems.formatBonuses(item)"));

console.log("Items facade PASS: generation/equipment and extracted Heirloom operations route through one public boundary.");
