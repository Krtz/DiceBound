#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"runtime/js/items/operations.js"),"utf8");
const monolith=fs.readFileSync(path.join(ROOT,"runtime/js/dicebound.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"runtime/js/module-manifest.json"),"utf8"));
const index=fs.readFileSync(path.join(ROOT,"runtime/index.html"),"utf8");

const context={window:{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:"items/operations.js"});
const owner=context.window.DiceboundItemOperations;
assert.ok(owner,"DiceboundItemOperations owner missing");
assert.equal(owner.owner,"items/operations");
assert.equal(Object.isFrozen(owner),true);

const events=[];
const player={equipment:{weapon:{id:"old",slot:"weapon",rarity:"common",name:"Old",bonuses:{attack:2}}},gold:100,maxMana:120,mana:70};
const alpha={goldEarned:0};
const api=owner.createController({
  getPlayer:()=>player,getMeta:()=>({}),rarityValues:{poor:1,common:2,uncommon:3,rare:4,epic:5,legendary:6},
  equipmentApi:{
    intrinsicBonusesForItem:item=>item?.intrinsic||{},
    allBonusesForItem:item=>({...item?.bonuses,...item?.intrinsic})
  },
  classIdentityActive:id=>id==="merchant",
  bonusLabel:(key,value)=>`+${value} ${key}`,
  applyItemStats:(item,sign)=>events.push(`stats:${item.id}:${sign}`),
  clearGearTransform:()=>events.push("transform:clear"),applyGearTransform:()=>events.push("transform:apply"),
  usesMana:()=>{events.push("mana:uses");return true;},equipmentMana:()=>{events.push("mana:equipment");return 20;},
  syncMana:snapshot=>events.push(`mana:sync:${snapshot.baseMaxMana}:${snapshot.currentMana}`),
  recordCareerGoldEarned:amount=>{alpha.goldEarned+=amount;},setStatsLastGold:value=>events.push(`lastGold:${value}`),rarityLabel:rarity=>rarity,
  sfxLevel:()=>events.push("sfx:level"),sfxCoin:()=>events.push("sfx:coin"),
  showToast:text=>events.push(`toast:${text}`),addLog:text=>events.push(`log:${text}`),
  renderEquipment:()=>events.push("render"),updateHUD:()=>events.push("hud")
});

const incoming={id:"new",slot:"weapon",rarity:"rare",name:"New",bonuses:{attack:5},itemPower:80,legendaryEffectId:"x",intrinsic:{maxMana:10}};
assert.equal(api.baseVisibleScore(incoming),4*3+5*7);
assert.equal(api.fallbackPower(incoming),80);
assert.equal(api.rawSellValue(incoming),Math.max(6,Math.round((10+80*1.45+80*80*.042)*1.16)));
assert.equal(api.sellValue(incoming),api.rawSellValue(incoming)*2,"Merchant resale multiplier must remain 2x");
assert.equal(api.score(incoming),api.baseVisibleScore(incoming)+80*2.15+180+10*.7,"final score must include hidden budget, Legendary effect and Intrinsic Mana");
assert.match(api.formatComparison(incoming,player.equipment.weapon),/Overall quality: stronger/);

api.equip(incoming,false);
assert.equal(player.equipment.weapon.id,"new");
assert.equal(alpha.goldEarned,api.sellValue({id:"old",slot:"weapon",rarity:"common",name:"Old",bonuses:{attack:2}}));
const positions=Object.fromEntries(events.map((event,index)=>[event,index]));
assert.ok(positions["mana:uses"]<positions["transform:clear"],"Mana snapshot must remain outermost");
assert.ok(positions["transform:clear"]<positions["stats:old:-1"],"old Legendary transform must clear before gear stats change");
assert.ok(positions["stats:old:-1"]<positions["stats:new:1"],"old stats must leave before new stats enter");
assert.ok(positions["stats:new:1"]<positions["sfx:coin"],"replacement sale must remain after base equip");
assert.ok(positions["sfx:coin"]<positions["transform:apply"],"new Legendary transform must apply after replacement sale");
assert.ok(events.at(-1).startsWith("mana:sync:"),"Mana sync must remain the final outer operation");

const module=manifest.modules.find(entry=>entry.id==="item-operations");
assert.ok(module,"item-operations missing from module manifest");
assert.equal(module.path,"js/items/operations.js");
assert.ok(module.provides.includes("DiceboundItemOperations"));
assert.ok(index.includes('<script src="js/items/operations.js"></script>'),"runtime index must load Items operations owner");
assert.ok(manifest.loadOrder.indexOf("item-operations")<manifest.loadOrder.indexOf("items-facade"),"operations owner must load before Items facade");

for(const forbidden of [
  "const itemSellValueV12=itemSellValue",
  "const gearPowerScorePreV14=gearPowerScore",
  "const gearPowerScoreV14Base=gearPowerScorePreV14",
  "const gearPowerScoreV15Visible=gearPowerScorePreV14",
  "const equipItemV15Patch=equipItem",
  "const db060GearScoreBase=gearPowerScore",
  "const db060EquipItemBase=equipItem",
  "const db06314GearScoreBase=gearPowerScore",
  "const db06421EquipItemBase=equipItem",
  "gearPowerScore=function",
  "itemSellValue=function",
  "equipItem=function",
  "formatGearComparison=function"
])assert.equal(monolith.includes(forbidden),false,`operations shadow ownership remains in monolith: ${forbidden}`);

// Score, sale value and comparison are ordinary read-only operations and now route
// directly through DiceboundItems. Their call-only monolith adapters must stay gone.
assert.doesNotMatch(monolith,/\bfunction\s+gearPowerScore\s*\(/,"retired gearPowerScore adapter returned");
assert.doesNotMatch(monolith,/\bfunction\s+itemSellValue\s*\(/,"retired itemSellValue adapter returned");
assert.doesNotMatch(monolith,/\bfunction\s+formatGearComparison\s*\(/,"retired formatGearComparison adapter returned");
assert.ok(monolith.includes("dbItems.score("),"score callers must route directly through DiceboundItems");
assert.ok(monolith.includes("dbItems.sellValue("),"sell-value callers must route directly through DiceboundItems");
assert.ok(monolith.includes("dbItems.formatComparison("),"comparison callers must route directly through DiceboundItems");

// Equip still forms a small semantic seam used by final composition paths.
assert.ok(monolith.includes("function equipItem(item,silent=false){return dbItems.equip(item,silent);}"),"equipItem semantic seam must remain routed through DiceboundItems");
assert.ok(monolith.includes("dbItemOperationsOwner.createController({"),"composition must bind focused operations owner");

for(const forbidden of ["document.","querySelector","getElementById"]){
  assert.equal(source.includes(forbidden),false,`Items operations owner contains direct DOM access: ${forbidden}`);
}
console.log("Items operations owner boundary PASS: score/value/comparison adapters retired, equip seam preserved behind DiceboundItems.");
