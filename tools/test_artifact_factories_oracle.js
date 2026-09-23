#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.join(__dirname,"..");
const raritySource=fs.readFileSync(path.join(ROOT,"runtime","js","items","rarities.js"),"utf8");
const equipmentSource=fs.readFileSync(path.join(ROOT,"runtime","js","items","equipment.js"),"utf8");
const source=fs.readFileSync(path.join(ROOT,"runtime","js","items","artifacts.js"),"utf8");
const context={window:{},console,Date:{now:()=>1700000000000}};
vm.createContext(context);
vm.runInContext(raritySource,context,{filename:"runtime/js/items/rarities.js"});
vm.runInContext(equipmentSource,context,{filename:"runtime/js/items/equipment.js"});
vm.runInContext(source,context,{filename:"runtime/js/items/artifacts.js"});
const equipment=context.window.DiceboundEquipment,artifacts=context.window.DiceboundArtifacts;
assert.ok(artifacts?.configure&&artifacts?.create,"Artifact owner must expose configured final factories");

const player={classId:"ranger"};
let calls=0;
const elements=["fire","ice","electric","light","void","nature","coffee","metal","tech","donut","shadow","radiant"];
artifacts.configure({
  getPlayer:()=>player,
  random:()=>{calls++;return .25;},
  pick:list=>{calls++;assert.deepEqual(Array.from(list),elements);return list[1];},
  getElementKeys:()=>elements,
  ensureEquipmentIdentity:(item,options)=>equipment.ensureEquipmentIdentity(item,options),
});

function stable(item){
  return {
    id:String(item.id).replace("1700000000000","<time>").replace(/_<time>_[a-z0-9]+$/,"_<time>_<rng>"),
    slot:item.slot,rarity:item.rarity,artifact:item.artifact,mythical:item.mythical,v24Rarity:item.v24Rarity,
    mythicPiece:item.mythicPiece,setName:item.setName,name:item.name,icon:item.icon,element:item.element??null,
    merchantWeaponScale:item.merchantWeaponScale??null,uniqueEffect:item.uniqueEffect,bonuses:JSON.parse(JSON.stringify(item.bonuses||{})),
  };
}
function make(slot,classId="ranger"){
  player.classId=classId;calls=0;const created=artifacts.create(slot),identity=equipment.identityForItem(created);
  assert.ok(identity,`Artifact ${slot} must carry a valid modern equipmentId`);
  assert.equal(identity.slot,slot,`Artifact ${slot} base identity used the wrong slot`);
  assert.ok(Object.keys(equipment.intrinsicBonusesForItem(created)).length>0,`Artifact ${slot} must carry a real intrinsic bonus package`);
  const item=stable(created);return {item,calls};
}
const shared=(slot,name,icon,uniqueEffect,bonuses,id)=>({
  id,slot,rarity:"artifact",artifact:true,mythical:false,v24Rarity:true,mythicPiece:slot,setName:"Impossible Road",name,icon,element:null,
  merchantWeaponScale:null,uniqueEffect,bonuses,
});

assert.deepEqual(make("boots"),{calls:1,item:shared("boots","Titanstep, Boots of the Astral Road","🥾","Titanstep: rolling 5 or 6 restores 5% max HP and grants 10 ultimate charge.",{maxHp:17,defense:3,dodge:.129,extraStepChance:.215},"mythical_boots_<time>_<rng>")});
assert.deepEqual(make("legs"),{calls:1,item:shared("legs","Paradox Weave, Legguards Outside Time","👖","Paradox Loop: every third player action restores 6% max HP and grants 15 ultimate charge.",{maxHp:29,defense:4,attack:4,doubleStrike:.138,luck:.12},"mythical_legs_<time>_<rng>")});
assert.deepEqual(make("ring"),{calls:1,item:shared("ring","Ouroboros Halo, Ring of the Fifth Road","💍","Ouroboros Halo: every fourth player action grants 1 barrier and 12 ultimate charge.",{maxHp:19,attack:5,defense:3,crit:.103,luck:.155,bossDamage:.241},"mythical_ring_<time>_<rng>")});
assert.deepEqual(make("hat"),{calls:1,item:shared("hat","Crown of the Road That Should Not Exist","👑","Crown of the Fourth Road: after surviving a guardian special, restore 10% max HP and gain 25 ultimate charge.",{maxHp:33,attack:6,defense:4,crit:.155,luck:.155,bossDamage:.387},"mythical_hat_<time>_<rng>")});
assert.deepEqual(make("amulet"),{calls:1,item:shared("amulet","The Devourer's Last Eye","👁️","Devourer's Gaze: once per battle below 35% HP, consume 12% of every living enemy's max HP and heal for half the damage.",{maxHp:26,attack:7,crit:.129,luck:.172,lifeSteal:.086,bossDamage:.43},"mythical_amulet_<time>_<rng>")});
assert.deepEqual(make("offhand"),{calls:1,item:shared("offhand","Event Horizon Ward, Offhand Beyond the Sixth Road","🌌🛡️","Event Horizon Ward: Guard grants 8 additional Ultimate; every third Guard also raises one Barrier.",{maxHp:26,defense:6,attack:6,crit:.086,doubleStrike:.103,bossDamage:.275,flatReduction:2},"mythical_offhand_<time>_<rng>")});

const ranger=make("weapon","ranger");
assert.equal(ranger.calls,1);
assert.deepEqual(ranger.item,{...shared("weapon","Starpiercer, Bow Beyond Distance","🏹","Reality Rend: every fifth basic attack guarantees a strengthened elemental activation.",{attack:10,crit:.172,dodge:.086,doubleStrike:.215,bossDamage:.301},"mythical_ranger_<time>"),element:"ice"});

const merchant=make("weapon","merchant");
assert.equal(merchant.calls,0);
assert.deepEqual(merchant.item,{...shared("weapon","Monopoly, Ledger of the Last Market","💰","Reality Rend and Compound Interest: every fifth attack guarantees an element, and attacks add 10% of current gold.",{attack:14,luck:.301,goldBonus:.602,bossDamage:.387},"mythical_merchant_<time>"),element:"coffee",merchantWeaponScale:.10});
const vampire=make("weapon","vampire");assert.equal(vampire.calls,0);assert.equal(vampire.item.element,"void");assert.deepEqual(vampire.item.bonuses,{attack:14,crit:.138,lifeSteal:.301,bossDamage:.344,maxHp:21});
const ninja=make("weapon","ninja");assert.equal(ninja.calls,0);assert.equal(ninja.item.element,"electric");assert.deepEqual(ninja.item.bonuses,{attack:14,crit:.301,doubleStrike:.215,dodge:.155,bossDamage:.344});
const ceo=make("weapon","ceo");assert.equal(ceo.calls,0);assert.equal(ceo.item.element,"tech");assert.deepEqual(ceo.item.bonuses,{attack:15,bossDamage:.559,goldBonus:.43,crit:.172,luck:.215});
const fallback=make("weapon","paladin");assert.equal(fallback.calls,1);assert.equal(fallback.item.name,"Worldsplitter");assert.equal(fallback.item.element,"ice");assert.deepEqual(fallback.item.bonuses,{attack:12,bossDamage:.301});

assert.throws(()=>artifacts.create("chest"),/Unknown Artifact item slot/);
let tableCalls=0;
assert.equal(artifacts.pick(()=>{tableCalls++;return 0;}).slot,"boots");
assert.equal(tableCalls,1);
assert.equal(artifacts.totalWeight,100);
assert.deepEqual(Array.from(artifacts.entries,entry=>entry.slot),["boots","legs","ring","hat","amulet","offhand","weapon"]);

console.log("Artifact factory oracle PASS: seven final Artifact factories keep exact gameplay RNG/scaling while each carries a modern slot-valid equipmentId + Intrinsic.");
