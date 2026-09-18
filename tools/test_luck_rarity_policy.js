#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("fs");
const path=require("path");
const vm=require("vm");
const root=path.resolve(__dirname,"..");

const context={window:{}};
context.window.DiceboundPowerupRegistry={
  apiVersion:1,
  createRegistry:()=>[],
  describe:up=>up?.name||""
};
context.window.DiceboundPowerupBorrowing={
  apiVersion:1,
  ownerIds:()=>[],
  ownershipAllowed:()=>true
};
vm.createContext(context);
for(const relative of [["items","rarities.js"],["powerups","facade.js"]]){
  const file=path.join(root,"runtime","js",...relative);
  vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const rarities=context.window.DiceboundRarities,power=context.window.DiceboundPowerups;
assert.ok(rarities&&power);

function lcg(seed=0xD1CEB0){
  let state=seed>>>0,calls=0;
  return {
    random(){state=(Math.imul(state,1664525)+1013904223)>>>0;calls++;return state/0x100000000;},
    calls:()=>calls
  };
}
const displayLuck=[0,25,50,100,125,150,175,200,500];
const internal=displayLuck.map(value=>value/100);

function sampleGear(luck,n=20000){
  const rng=lcg(0x610000+Math.round(luck*100)),counts={poor:0,common:0,uncommon:0,rare:0,epic:0};
  for(let i=0;i<n;i++){
    const rarity=rarities.rollOrdinaryGearRarity({roll:rng.random(),luck,depth:0,bonus:0,nightmare:false,hell:false});
    counts[rarity]=(counts[rarity]||0)+1;
  }
  return {counts,low:(counts.poor||0)+(counts.common||0),calls:rng.calls()};
}

const pool=[
  {id:"poor",rarity:"poor",name:"Poor"},
  {id:"common",rarity:"common",name:"Common"},
  {id:"uncommon",rarity:"uncommon",name:"Uncommon"},
  {id:"rare",rarity:"rare",name:"Rare"},
  {id:"epic",rarity:"epic",name:"Epic"}
];
const player={classId:"ranger",level:10,position:0,luck:0,upgradeCounts:{}};
let activeRng=lcg();
power.configure({
  getPlayer:()=>player,getMeta:()=>({}),getRarityInfo:()=>({
    poor:{weight:68},common:{weight:25},uncommon:{weight:7.5},rare:{weight:1.9},epic:{weight:.42},legendary:{weight:.028}
  }),
  achievementGateUnlocked:()=>true,slimeIdentityActive:()=>false,slimePowerCompatible:()=>true,slimeRougePowerCompatible:()=>true,
  filterPowerupPoolForLuck:(items,luck)=>rarities.filterPowerupPoolForLuck(items,luck),
  lowTierSuppression:luck=>rarities.lowTierSuppression(luck),
  lowTierWeightMultiplier:(rarity,luck)=>rarities.lowTierWeightMultiplier(rarity,luck),
  getBoardLevel:()=>1,currentTileCount:()=>10,random:()=>activeRng.random(),rand:(a)=>a,pick:items=>items[0],clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
  classIdentityActive:()=>false,hasLegendaryEffect:()=>false,saveMeta:()=>{},addLog:()=>{},showToast:()=>{},checkDynamicClassUnlocks:()=>{},
  recordRunBuff:()=>{},recordPowerupTaken:()=>{},syncOuroborosEconomy:()=>{},isNightmare:()=>false,isHell:()=>false,isGameStarted:()=>false
});
function samplePowerups(luck,n=20000){
  player.luck=luck;activeRng=lcg(0x720000+Math.round(luck*100));
  const counts={poor:0,common:0,uncommon:0,rare:0,epic:0};
  for(let i=0;i<n;i++){const up=power.weighted(pool);counts[up.rarity]++;}
  return {counts,low:counts.poor+counts.common,calls:activeRng.calls()};
}

const gearRows=internal.map(luck=>sampleGear(luck));
const powerRows=internal.map(luck=>samplePowerups(luck));
for(let i=0;i<internal.length;i++){
  assert.equal(gearRows[i].calls,20000,`gear sample at ${displayLuck[i]} Luck must use one caller RNG draw per rarity`);
  assert.equal(powerRows[i].calls,20000,`Powerup sample at ${displayLuck[i]} Luck must use one RNG draw per choice`);
}
for(const rows of [gearRows,powerRows]){
  const at100=rows[displayLuck.indexOf(100)].low;
  const at125=rows[displayLuck.indexOf(125)].low;
  const at150=rows[displayLuck.indexOf(150)].low;
  const at175=rows[displayLuck.indexOf(175)].low;
  assert.ok(at125<at100,`125 Luck must reduce low-tier outcomes: ${at125} < ${at100}`);
  assert.ok(at150<at125,`150 Luck must reduce low-tier outcomes: ${at150} < ${at125}`);
  assert.ok(at175<at150,`175 Luck must reduce low-tier outcomes: ${at175} < ${at150}`);
  assert.equal(rows[displayLuck.indexOf(200)].low,0,"200 Luck must eliminate Poor/Common outcomes");
  assert.equal(rows[displayLuck.indexOf(500)].low,0,"very high Luck must not reintroduce Poor/Common outcomes");
}

assert.deepEqual(displayLuck.map((luck,i)=>[luck,gearRows[i].low,powerRows[i].low]),displayLuck.map((luck,i)=>[luck,gearRows[i].low,powerRows[i].low]));
console.log("Luck rarity policy PASS:",displayLuck.map((luck,i)=>({luck,gearLow:gearRows[i].low,powerupLow:powerRows[i].low})));
