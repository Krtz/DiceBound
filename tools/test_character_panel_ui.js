#!/usr/bin/env node
"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"runtime/index.html"),"utf8").replace(/\r\n/g,"\n");
const owner=fs.readFileSync(path.join(root,"runtime/js/ui/equipment-heirlooms.js"),"utf8").replace(/\r\n/g,"\n");

assert.ok(html.includes('class="card character-card" id="characterCard"'),"Stats and Gear must share one Character card");
assert.ok(html.includes('data-character-tab="stats"')&&html.includes('data-character-tab="gear"'),"Character card must expose Stats and Gear tabs");
assert.ok(html.includes('id="characterStatsPanel"')&&html.includes('id="characterGearPanel"'),"Character tab panels are missing");
assert.equal((html.match(/id="equipmentGrid"/g)||[]).length,1,"equipment grid must have one canonical DOM owner");
assert.ok(!html.includes('class="card equipment-card"'),"retired standalone Equipment card returned");
for(const id of ["attackText","defenseText","goldText","goldGainText","potionText","critText","dodgeText","lifeStealText","luckText","echoText","bossDamageText"]){
  assert.ok(html.includes(`id="${id}"`),`authoritative HUD stat target missing: ${id}`);
}
assert.ok(owner.includes("activateCharacterTab"),"Equipment UI owner must own Character tab presentation state");
assert.ok(owner.includes("gearIconMarkup(item,'db-equipment-slot-art')"),"Character Gear must use image-first slot rendering");
assert.ok(owner.includes("character-gear-slot slot-${slot} ${item?.rarity||'empty'}"),"Character Gear slot classes must carry slot + rarity identity");
assert.ok(!/entry\.innerHTML=.*itemNameMarkup\(item,'db-equipment-slot-art'\)/.test(owner),"Character Gear must not regress to visible item-name text inside occupied slots");

console.log("Character panel UI PASS: one Stats/Gear card, authoritative stat targets, image-only rarity-framed paper doll");
