#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const context={window:{},console};context.window.window=context.window;
vm.createContext(context);
for(const rel of ["runtime/js/progression/talents.js","runtime/js/progression/prestige.js","runtime/js/progression/lifecycle.js","runtime/js/items/heirlooms.js"]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),"utf8"),context,{filename:rel});
}

const talents=context.window.DiceboundTalents.createRegistry();
const prestige=context.window.DiceboundPrestige;
const progression=context.window.DiceboundProgression;
const heirloomOwner=context.window.DiceboundHeirloomOperations;
assert.ok(prestige&&progression&&heirloomOwner);

let meta={
  level:1,xp:0,xpNext:999999,points:0,runs:0,bestTiles:0,
  purchased:{legacy_heirloom:4},
  prestige:{count:0,moon:{legacySpent:0,purchases:[]}},
  heirlooms:[],heirloomStorage:[],
  board5Clears:0,merchantKills:0,bloodmageKills:0,devilBossKills:0
};
let finalized=false,lastAward=0,lastGold=0,saves=0;
const stats={runsFinished:0,rolls:0,tilesTraveled:0,highestRunLevel:0,classMaxLevel:{},highestGold:0};
const player={classId:"ranger",level:10,gold:100,legacyXpBonus:0};

progression.configure({
  getMeta:()=>meta,
  getTalents:()=>talents,
  getEquipmentSlotCount:()=>8,
  saveMeta:()=>{saves++;},
  legacyXpForLevel:()=>999999,
  isRunFinalized:()=>finalized,
  setRunFinalized:v=>{finalized=!!v;},
  getLastLegacyAward:()=>lastAward,
  setLastLegacyAward:v=>{lastAward=v;},
  setLastGoldLegacyAward:v=>{lastGold=v;},
  getPlayer:()=>player,
  getTilesMovedThisRun:()=>10,
  getRolls:()=>7,
  isNightmare:()=>false,
  ensureAlphaMeta:()=>stats,
  updateMetaUI:()=>{},
  getRunTalentSnapshot:()=>null,
  setRunTalentSnapshot:()=>null
});

assert.equal(progression.heirloomLoadoutCapacity(),5,"four Legacy ranks should allow five carried heirlooms before Prestige");
meta.prestige=prestige.purchase(prestige.purchase(prestige.purchase(
  prestige.purchase(prestige.normalize({count:20,moon:{legacySpent:0,purchases:[]}}),"heirloom-storage",()=>0).prestige,
  "heirloom-loadout",()=>0).prestige,
  "heirloom-loadout",()=>0).prestige,
  "heirloom-loadout",()=>0).prestige;
assert.equal(progression.heirloomLoadoutCapacity(),8,"three Prestige Loadout ranks should complete the eight-piece run loadout");

let vault=prestige.normalize({count:80,moon:{legacySpent:0,purchases:[]}});
vault=prestige.purchase(vault,"heirloom-storage",()=>0).prestige;
for(let i=0;i<7;i++)vault=prestige.purchase(vault,"heirloom-vault-expansion",()=>0).prestige;
meta.prestige=vault;
assert.equal(progression.heirloomStorageCapacity(),36,"full PP Vault path should be 8 base + 28 expansion slots");
meta.board5Clears=1;meta.merchantKills=1;meta.bloodmageKills=1;meta.devilBossKills=1;
assert.equal(progression.heirloomStorageCapacity(),40,"four one-time milestones should bring the Vault to exactly 40");
const milestones=progression.heirloomStorageMilestones();
assert.deepEqual(Array.from(milestones,m=>m.on),[true,true,true,true,true]);
assert.match(milestones[0].text,/7\/7 \(\+28\)/);

meta.purchased={legacy_heirloom:4,legacy_storage:1};meta.points=2;saves=0;
progression.repairTalentPrerequisites();
assert.equal(meta.purchased.legacy_storage,undefined,"retired storage Talent must be removed from current state");
assert.equal(meta.points,5,"retired 3-point storage Talent must refund its Talent Point cost once");
assert.ok(saves>0);

meta.purchased={};meta.prestige=prestige.normalize({count:10,moon:{legacySpent:0,purchases:[]}});
meta.level=1;meta.xp=0;meta.xpNext=999999;meta.runs=0;meta.bestTiles=0;finalized=false;lastAward=0;
const award=progression.finalizeRun();
assert.equal(lastGold,10);
assert.equal(award,30,"10 tiles + 10 Gold Legacy XP at lifetime Prestige 10 must receive +50% to the whole final award");
assert.equal(meta.xp,30);

const slots=["weapon","offhand","boots","legs","chest","hat","ring","amulet"];
meta.prestige=vault;meta.board5Clears=1;meta.merchantKills=1;meta.bloodmageKills=1;meta.devilBossKills=1;
meta.purchased={legacy_heirloom:4};
meta.heirloomStorage=Array.from({length:42},(_,i)=>({id:`item-${i}`,slot:slots[i%slots.length],name:`Item ${i}`,rarity:"common"}));
meta.heirlooms=meta.heirloomStorage.slice(0,10);
const heirlooms=heirloomOwner.createController({
  getMeta:()=>meta,
  normalizeItem:item=>({...item}),
  isEligible:()=>true,
  storageUnlocked:()=>progression.heirloomStorageUnlocked(),
  storageCapacity:()=>progression.heirloomStorageCapacity(),
  activeCapacity:()=>progression.heirloomLoadoutCapacity(),
  saveMeta:()=>{},
  showToast:()=>{},
  sfxHoly:()=>{}
});
const synced=heirlooms.sync();
assert.equal(synced.storageCapacity,40);
assert.equal(meta.heirloomStorage.length,40);
assert.equal(meta.heirlooms.length,8);

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
for(const retired of ["function getHeirloomSlots(","function v24StorageUnlocked(","function v24StorageCapacity(","function v24SyncStorage(","function v24StorageMilestones(","dbEquipmentUiToggleStoredActive","dbEquipmentUiDiscardStored","dbEquipmentUiToggleRunStorage","dbEquipmentUiToggleLegacyHeirloom"]){
  assert.equal(monolith.includes(retired),false,`retired Heirloom ownership returned to dicebound.js: ${retired}`);
}

console.log("Heirloom progression PASS: 5→8 loadout, 8→40 Vault, retired Talent refund, lifetime PP acceleration and extracted inventory ownership");
