#!/usr/bin/env node
"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/items/equipment.js"),"utf8");
const context={window:{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:"equipment.js"});
const equipment=context.window.DiceboundEquipment;
assert(equipment,"DiceboundEquipment must load");

const contaminated='<img class="db-art-icon db-art-inline" src="assets/equipment/hat/helmet.png" alt="Helmet">';

const ordinary={slot:"hat",icon:contaminated};
assert.equal(equipment.safeIconForItem(ordinary),"🪖","contaminated ordinary Hat icon must resolve to scalar fallback");
assert.equal(equipment.repairPresentationFields(ordinary),true,"contaminated ordinary Hat must be repaired");
assert.equal(ordinary.icon,"🪖");
assert.equal(equipment.iconContainsMarkup(ordinary.icon),false);
assert.equal(equipment.repairPresentationFields(ordinary),false,"repair must be idempotent");

const crown={slot:"hat",setName:"Impossible Road",mythicPiece:"hat",icon:contaminated};
assert.equal(equipment.safeIconForItem(crown),"👑","Impossible Road Crown must recover its semantic icon");
assert.equal(equipment.repairPresentationFields(crown),true);
assert.equal(crown.icon,"👑");

const headphones={slot:"hat",oneHitPerRound:true,icon:contaminated};
equipment.repairPresentationFields(headphones);
assert.equal(headphones.icon,"🎧","Kratz Headphones semantic flag must recover headphones icon");

const horns={slot:"hat",devilHorns:true,icon:contaminated};
equipment.repairPresentationFields(horns);
assert.equal(horns.icon,"👿","Pale Devil horns semantic flag must recover horns icon");

const clean={slot:"hat",icon:"🎩"};
assert.equal(equipment.safeIconForItem(clean),"🎩");
assert.equal(equipment.repairPresentationFields(clean),false,"clean scalar icon must not be rewritten");

assert.equal(equipment.iconContainsMarkup("&lt;img src=x&gt;"),true,"escaped historical markup must be treated as contamination");
console.log("Equipment icon safety PASS: HTML presentation contamination is repaired to scalar item data");
