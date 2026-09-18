#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("fs");
const path=require("path");
const vm=require("vm");
const root=path.resolve(__dirname,"..");

const context={window:{}};
context.window.DiceboundPowerupRegistry={apiVersion:1,createRegistry:()=>[],describe:up=>up?.name||""};
context.window.DiceboundPowerupBorrowing={apiVersion:1,ownerIds:()=>[],ownershipAllowed:()=>true};
vm.createContext(context);
for(const relative of [["items","rarities.js"],["powerups","facade.js"]]){
  const file=path.join(root,"runtime","js",...relative);
  vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const rarities=context.window.DiceboundRarities,power=context.window.DiceboundPowerups;
assert.ok(rarities&&power);

function approx(actual,expected,epsilon=1e-10,label="value"){
  assert.ok(Math.abs(actual-expected)<=epsilon,`${label}: expected ${expected}, got ${actual}`);
}
function lcg(seed=0xD1CEB0){
  let state=seed>>>0,calls=0;
  return {random(){state=(Math.imul(state,1664525)+1013904223)>>>0;calls++;return state/0x100000000;},calls:()=>calls};
}
function rowMap(rows){return Object.fromEntries(Array.from(rows,row=>[row[0],row[1]]));}
function sumRows(rows){return Array.from(rows).reduce((sum,row)=>sum+row[1],0);}

assert.equal(rarities.luckPolicy.shiftPerDisplayedPoint,.005);
assert.equal(rarities.luckPolicy.displayedPerInternal,100);
approx(rarities.luckShiftBudget(.01),.005,1e-12,"1 displayed Luck shift");
approx(rarities.luckShiftBudget(1.10),.55,1e-12,"110 displayed Luck shift");

const base=rowMap(rarities.ordinaryGearRows({luck:0}));
approx(base.poor,.55,1e-12,"baseline Poor");
approx(base.common,.305,1e-12,"baseline Common");
approx(base.uncommon,.107,1e-12,"baseline Uncommon");
approx(base.rare,.032,1e-12,"baseline Rare");
approx(base.epic,.006,1e-12,"baseline Epic");
approx(sumRows(rarities.ordinaryGearRows({luck:0})),1,1e-12,"baseline total");

const oneLuck=rowMap(rarities.ordinaryGearRows({luck:.01}));
approx(oneLuck.poor,.545,1e-12,"1 Luck removes 0.5 percentage points from Poor");
approx(sumRows(rarities.ordinaryGearRows({luck:.01})),1,1e-12,"1 Luck total");

const at110=rowMap(rarities.ordinaryGearRows({luck:1.10}));
approx(at110.poor,0,1e-12,"110 Luck eliminates baseline Poor");
approx(sumRows(rarities.ordinaryGearRows({luck:1.10})),1,1e-12,"110 Luck total");
const at111=rowMap(rarities.ordinaryGearRows({luck:1.11}));
approx(at111.poor,0,1e-12,"Poor stays eliminated above 110 Luck");
approx(at110.common-at111.common,.005,1e-12,"111th Luck point starts draining Common");
const at246=rowMap(rarities.ordinaryGearRows({luck:2.46}));
approx(at246.poor,0,1e-12,"246 Luck Poor");
approx(at246.common,0,1e-12,"Luck waterfall continues until Common is exhausted");
assert.ok(at246.uncommon>0&&at246.rare>0&&at246.epic>0,"removed Common mass must be redistributed upward");
const at400=rowMap(rarities.ordinaryGearRows({luck:4}));
approx(at400.poor,0,1e-12);approx(at400.common,0,1e-12);approx(at400.uncommon,0,1e-12);
const at600=rowMap(rarities.ordinaryGearRows({luck:6}));
approx(at600.poor,0,1e-12);approx(at600.common,0,1e-12);approx(at600.uncommon,0,1e-12);approx(at600.rare,0,1e-12);
approx(at600.epic,1,1e-10,"extreme ordinary Luck concentrates in highest available tier");

const customRows=[["poor",55],["common",30.5],["uncommon",10.7],["rare",3.2],["epic",.6]];
const custom110=rowMap(rarities.cascadeLuckRows(customRows,1.10,rarities.ordinaryLootProgression));
approx(custom110.poor,0,1e-10,"weighted-row waterfall Poor");
approx(sumRows(rarities.cascadeLuckRows(customRows,1.10,rarities.ordinaryLootProgression)),100,1e-9,"weighted-row total");

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
    poor:{weight:55},common:{weight:30.5},uncommon:{weight:10.7},rare:{weight:3.2},epic:{weight:.6},legendary:{weight:0}
  }),
  achievementGateUnlocked:()=>true,slimeIdentityActive:()=>false,slimePowerCompatible:()=>true,slimeRougePowerCompatible:()=>true,
  cascadeLuckRows:(rows,luck,progression)=>rarities.cascadeLuckRows(rows,luck,progression),
  getBoardLevel:()=>1,currentTileCount:()=>10,random:()=>activeRng.random(),rand:(a)=>a,pick:items=>items[0],clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
  classIdentityActive:()=>false,hasLegendaryEffect:()=>false,saveMeta:()=>{},addLog:()=>{},showToast:()=>{},checkDynamicClassUnlocks:()=>{},
  recordRunBuff:()=>{},recordPowerupTaken:()=>{},syncOuroborosEconomy:()=>{},isNightmare:()=>false,isHell:()=>false,isGameStarted:()=>false
});
function samplePowerups(displayLuck,n=10000){
  player.luck=displayLuck/100;activeRng=lcg(0x720000+displayLuck);
  const counts={poor:0,common:0,uncommon:0,rare:0,epic:0};
  for(let i=0;i<n;i++){const up=power.weighted(pool);counts[up.rarity]++;}
  return {counts,calls:activeRng.calls()};
}
const samples=[0,50,100,110,111,246,400,600].map(luck=>[luck,samplePowerups(luck)]);
for(const [luck,result] of samples)assert.equal(result.calls,10000,`Powerup ${luck} Luck must retain one RNG draw per weighted choice`);
assert.equal(samples.find(([luck])=>luck===110)[1].counts.poor,0,"Powerup waterfall with the same 55% baseline must eliminate Poor at 110 Luck");
assert.equal(samples.find(([luck])=>luck===246)[1].counts.common,0,"Powerup waterfall must continue from Poor into Common");
assert.equal(samples.find(([luck])=>luck===600)[1].counts.epic,10000,"extreme Powerup Luck must concentrate in highest available tier");

// Zero-probability leading tiers may never win even when RNG returns exactly 0.
player.luck=1.10;
activeRng={random:()=>0,calls:()=>1};
assert.equal(power.weighted(pool).rarity,"common","zero-weight Poor must not win at the exact zero RNG boundary");

console.log("Luck rarity waterfall PASS: 0.5 percentage points per displayed Luck cascade upward for gear and Powerups with exact RNG count");
