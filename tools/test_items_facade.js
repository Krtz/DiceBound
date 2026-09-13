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
const context={window:{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:"items/facade.js"});
const api=context.window.DiceboundItems;
assert.ok(api,"DiceboundItems public facade missing");
assert.equal(Object.isFrozen(api),true,"Items facade must be frozen");
assert.equal(api.owner,"items/facade");

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
  formatComparison:(item,current)=>{calls.push(["formatComparison",item,current]);return "comparison";}
};
assert.equal(api.configure(runtime),api);
assert.deepEqual(api.generateEquipment("rare","weapon"),{rarity:"rare",slot:"weapon"});
assert.deepEqual(api.generateLegendary("ring",true),{slot:"ring",prefer:true});
assert.equal(api.rollGearRarity(.2),"epic");
let continued=false;api.openLoot({id:"loot"},()=>{continued=true;});assert.equal(continued,true);
assert.deepEqual(api.equip({id:"gear"},true),{id:"gear"});
assert.equal(api.sellValue({id:"gear"}),22);
assert.equal(api.rawSellValue({id:"gear"}),11);
assert.equal(api.score({id:"gear"}),33);
assert.equal(api.formatBonuses({id:"gear"}),"bonuses");
assert.equal(api.formatComparison({id:"new"},{id:"old"}),"comparison");
assert.deepEqual(calls.map(c=>c[0]),["generateEquipment","generateLegendary","rollGearRarity","openLoot","equip","sellValue","rawSellValue","score","formatBonuses","formatComparison"]);
const inspected=api.inspect();
assert.equal(inspected.owner,"items/facade");
for(const value of Object.values(inspected.configured))assert.equal(value,true);

// The facade is dependency routing only. Gameplay/RNG/DOM implementation must
// not migrate into this public file.
for(const forbidden of ["Math.random","DiceboundRng","document.","querySelector","rarityValues","legendaryEffect","player.","Date.now","generateOrdinaryItem"]){
  assert.equal(source.includes(forbidden),false,`Items facade contains implementation detail: ${forbidden}`);
}

const module=manifest.modules.find(m=>m.id==="items-facade");
assert.ok(module,"items-facade missing from module manifest");
assert.equal(module.path,"js/items/facade.js");
assert.ok(module.provides.includes("DiceboundItems"));
assert.ok(index.includes('<script src="js/items/facade.js"></script>'),"runtime/index.html must load Items facade");
assert.ok(monolith.includes("const dbItems=window.DiceboundItems;"),"monolith must obtain public Items facade");
assert.ok(monolith.includes("dbItems.configure({"),"monolith must configure public Items facade");

// First caller migration: cross-subsystem Road Events and Merchant stock should
// use the public Items boundary, not direct legacy generator/value callbacks.
assert.ok(monolith.includes("generateEquipment:rarity=>dbItems.generateEquipment(rarity)"),"Road Event Treasure generation must route through DiceboundItems");
assert.ok(monolith.includes("generateLegendary:(slot,preferUndiscovered)=>dbItems.generateLegendary(slot,preferUndiscovered)"),"Road Event Treasure Legendary generation must route through DiceboundItems");
assert.ok(monolith.includes("rollGearRarity:bonus=>dbItems.rollGearRarity(bonus)"),"Road Event Treasure rarity roll must route through DiceboundItems");
assert.ok(monolith.includes("openLoot:(item,done)=>dbItems.openLoot(item,done)"),"Road Event Treasure loot handoff must route through DiceboundItems");
assert.ok(monolith.includes("generateEquipment:(rarity,slot)=>dbItems.generateEquipment(rarity,slot)"),"Merchant stock generation must route through DiceboundItems");
assert.ok(monolith.includes("rawSellValue:item=>dbItems.rawSellValue(item)"),"Merchant stock value policy must route through DiceboundItems");
assert.ok(monolith.includes("equipItem:item=>dbItems.equip(item)"),"Merchant stock equip collaboration must route through DiceboundItems");
assert.ok(monolith.includes("formatBonuses:item=>dbItems.formatBonuses(item)"),"Merchant stock formatting collaboration must route through DiceboundItems");

console.log("Items facade delegation and first caller-boundary migration PASS.");
