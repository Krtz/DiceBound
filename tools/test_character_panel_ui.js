#!/usr/bin/env node
"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"runtime/index.html"),"utf8").replace(/\r\n/g,"\n");
const owner=fs.readFileSync(path.join(root,"runtime/js/ui/equipment-heirlooms.js"),"utf8").replace(/\r\n/g,"\n");
const composition=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");

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
assert.ok(owner.includes("DETAIL_POPOVER_ID=\'dbEquipmentDetailPopover\'")&&owner.includes("showDetailPopover(target)"),"Modern Character Gear must own an explicit rich detail popover");
assert.ok(owner.includes("entry.dataset.equipmentSlot=slot"),"Modern Character Gear must publish the authoritative equipment slot key");
assert.ok(owner.includes("entry.dataset.tip=detail")&&owner.includes("if(layout==='classic')"),"Classic Gear may retain the shared text-tooltip contract");
assert.ok(owner.includes("delete entry.dataset.tip")&&owner.includes("entry.dataset.equipmentSlot=slot"),"Modern Gear must explicitly clear the generic tooltip contract and publish its semantic slot key");
assert.ok(owner.includes("displayName(item,slot)"),"Character Gear detail must resolve semantic equipment identity using the actual rendered slot");
assert.ok(owner.includes("/^equipment$/i.test(raw)")&&owner.includes("semantic?.displayName"),"generic Equipment names must fall back to semantic identity");
assert.ok(owner.includes("runtime.getAllBonuses?.(item)")&&owner.includes("runtime.formatBonus?.(key,value)"),"Character Gear detail must recover canonical total stats when composed copy is empty");
assert.ok(owner.includes("String(rarityLabel).toUpperCase()")&&owner.includes("\\n${stats}"),"Accessible Character Gear detail must separate identity, rarity/slot and stats into readable lines");
assert.ok(owner.includes("db-equipment-detail-name")&&owner.includes("db-equipment-detail-meta")&&owner.includes("db-equipment-detail-stats"),"rich Gear detail must render identity, rarity/slot and stat sections");
assert.ok(owner.includes("detailStatsMarkup(item)")&&owner.includes("artMarkup(item,\'db-equipment-detail-art\')"),"rich Gear detail must include canonical stats and equipment art");
assert.ok(owner.includes("runtime.getSafeEquipmentIcon?.(item)"),"Character Gear must resolve scalar icon data through the Equipment owner");
assert.ok(owner.includes("runtime.getSpecialEquipmentIdentity?.(item)"),"special/Artifact gear must have a semantic identity fallback when equipmentId is absent");
assert.equal(composition.includes("beta043RefreshEquipmentArt"),false,"retired Beta 0.4.3 Hat HTML mutation must not return");
assert.ok(composition.includes("repairEquipmentPresentationData()"),"composition must repair already-contaminated current equipment before render/persistence");
assert.ok(composition.includes("getSafeEquipmentIcon:item=>window.DiceboundEquipment?.safeIconForItem?.(item)"),"Equipment UI must receive the canonical safe-icon resolver");
assert.ok(owner.includes('grid-template-areas:". . hat . ." "amulet . chest . ring" "weapon . chest . offhand" ". . legs . ." ". . boots . ."'),"Normal desktop Modern Gear must preserve the spatial paper-doll layout");

assert.ok(owner.includes('body[data-hud-flow="landscape-2"] .character-gear-grid')&&owner.includes('body[data-hud-flow="landscape-3"] .character-gear-grid'),"narrow short-landscape HUD cards must retain a compact fallback without replacing the normal spatial paper doll");
assert.ok(owner.includes("item?itemNameMarkup(item,'db-equipment-slot-art')"),"Classic Character Gear must preserve the named equipment-row renderer");

const stateSource=fs.readFileSync(path.join(root,"runtime/js/core/state.js"),"utf8");
assert.match(stateSource,/characterLayout:"modern"/,"saved Character layout must default to Modern");
console.log("Character panel UI PASS: Modern paper doll owns rich semantic Gear detail plus persistent Classic fallback");
