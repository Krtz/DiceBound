#!/usr/bin/env node
"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"runtime/index.html"),"utf8").replace(/\r\n/g,"\n");
const owner=fs.readFileSync(path.join(root,"runtime/js/ui/equipment-heirlooms.js"),"utf8").replace(/\r\n/g,"\n");

assert.ok(html.includes('class="card character-card" id="characterCard" data-character-layout="modern"'),"Modern tabbed Character layout must be the default");
assert.ok(html.includes('data-character-tab="stats"')&&html.includes('data-character-tab="gear"'),"Character card must expose Stats and Gear tabs");
assert.ok(html.includes('id="characterStatsPanel"')&&html.includes('id="characterGearPanel"'),"Character tab panels are missing");
assert.equal((html.match(/id="equipmentGrid"/g)||[]).length,1,"equipment grid must have one canonical DOM owner");
assert.ok(html.includes('character-classic-title">Adventurer')&&html.includes('character-classic-title">Equipment'),"Classic fallback must retain the familiar Adventurer and Equipment headings");
for(const id of ["attackText","defenseText","goldText","goldGainText","potionText","critText","dodgeText","lifeStealText","luckText","echoText","bossDamageText"]){
  assert.ok(html.includes(`id="${id}"`),`authoritative HUD stat target missing: ${id}`);
}
assert.ok(owner.includes("syncCharacterLayout"),"Equipment UI owner must own Modern/Classic layout switching");
assert.ok(owner.includes("layout===\'classic\'"),"Equipment renderer must preserve a Classic named-grid path");
assert.ok(owner.includes("activateCharacterTab"),"Equipment UI owner must own Character tab presentation state");
assert.ok(owner.includes("gearIconMarkup(item,'db-equipment-slot-art')"),"Character Gear must use image-first slot rendering");
assert.ok(owner.includes("character-gear-slot slot-${slot} ${item?.rarity||'empty'}"),"Character Gear slot classes must carry slot + rarity identity");
assert.ok(owner.includes("entry.innerHTML=item?gearIconMarkup(item,'db-equipment-slot-art')"),"Modern Character Gear must render image-only occupied slots");
assert.ok(owner.includes("entry.dataset.tip=detail"),"Character Gear must publish hover/focus detail through the shared root tooltip contract");
assert.ok(owner.includes("displayName(item)"),"Character Gear detail must have semantic equipment-identity fallback");
assert.match(owner,/grid-template-columns:repeat\(5,minmax\(42px,1fr\)\).*grid-template-areas:"\. \. hat \. \." "\. amulet chest ring \." "weapon \. chest \. offhand" "\. \. legs \. \." "\. \. boots \. \."/s,"Normal desktop Modern Gear must preserve the spatial paper-doll layout");
assert.ok(owner.includes('body[data-hud-flow="landscape-2"] .character-gear-grid')&&owner.includes('body[data-hud-flow="landscape-3"] .character-gear-grid'),"narrow short-landscape HUD cards must retain a compact fallback without replacing the normal spatial paper doll");
assert.ok(owner.includes("item?itemNameMarkup(item,'db-equipment-slot-art')"),"Classic Character Gear must preserve the named equipment-row renderer");

const stateSource=fs.readFileSync(path.join(root,"runtime/js/core/state.js"),"utf8");
assert.match(stateSource,/characterLayout:"modern"/,"saved Character layout must default to Modern");
console.log("Character panel UI PASS: Modern tabbed paper doll default plus persistent Classic fallback");
