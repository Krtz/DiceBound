#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const facadePath=path.join(root,"runtime","js","powerups","facade.js");
const source=fs.readFileSync(facadePath,"utf8");

assert.match(source,/OWNER="powerups\/facade"/);
assert.match(source,/window\.DiceboundPowerups=api/);
assert.doesNotMatch(source,/Math\.random/);

const fakeCatalog=[
  {id:"generic",rarity:"common",name:"Generic",apply(){state.player.attack+=1;}},
  {id:"ranger",classId:"ranger",rarity:"rare",name:"Ranger",apply(){state.player.attack+=2;}},
  {id:"fighter",classId:"fighter",rarity:"rare",name:"Fighter",apply(){state.player.defense+=2;}},
  {id:"unique",rarity:"epic",unique:true,name:"Unique",apply(){state.player.maxHp+=5;}},
  {id:"gated",rarity:"legendary",achievementGate:"gate",name:"Gated",apply(){state.player.luck+=1;}},
];
const context={window:{}};
context.window.DiceboundPowerupRegistry={
  apiVersion:1,
  createRegistry:services=>{assert.equal(services.token,"services");return fakeCatalog;},
  describe:(up,services)=>`${services.token}:${up?.name||""}`
};
context.window.DiceboundPowerupBorrowing={
  apiVersion:1,
  ownerIds:up=>[up.classId].filter(Boolean),
  ownershipAllowed:(up,borrower,unlocked)=>!up.classId||up.classId===borrower||unlocked.includes(up.classId)
};
vm.createContext(context);
vm.runInContext(source,context,{filename:facadePath});
const power=context.window.DiceboundPowerups;
assert.ok(Object.isFrozen(power));
assert.equal(power.apiVersion,1);
assert.equal(power.owner,"powerups/facade");
assert.equal(power.createRegistry({token:"services"}),fakeCatalog);
assert.equal(power.describe(fakeCatalog[0]),"services:Generic");
assert.deepEqual(Array.from(power.ownerIds(fakeCatalog[1])),["ranger"]);

const events=[];
let gate=false,randomCalls=0;
const state={
  player:{classId:"ranger",level:10,position:0,hp:50,maxHp:50,attack:5,defense:2,luck:0,gold:0,goldBonus:0,crit:0,doubleStrike:0,bossDamage:0,lifeSteal:0,elementProcBonus:0,elementDamageBonus:0,levelChoiceBonus:0,upgradeCounts:{},runBuffs:[],potions:0,ultimateCharge:0},
  meta:{petCookies:0},
};
power.configure({
  getPlayer:()=>state.player,getMeta:()=>state.meta,getRarityInfo:()=>({poor:{weight:10,label:"Poor"},common:{weight:8,label:"Common"},uncommon:{weight:6,label:"Uncommon"},rare:{weight:4,label:"Rare"},epic:{weight:2,label:"Epic"},legendary:{weight:1,label:"Legendary"}}),
  achievementGateUnlocked:id=>!id||gate,
  slimeIdentityActive:()=>state.player.classId==="slime",
  slimePowerCompatible:up=>up.id==="fighter",
  slimeRougePowerCompatible:up=>up.id!=="fighter",
  filterPowerupPoolForLuck:pool=>pool,
  getBoardLevel:()=>1,currentTileCount:()=>10,random:()=>{randomCalls++;return .25;},rand:(a,b)=>a,pick:list=>list[0],clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
  classIdentityActive:id=>id==="d20"&&state.player.classId==="d20",
  hasLegendaryEffect:()=>false,saveMeta:()=>events.push("save"),addLog:text=>events.push(["log",text]),showToast:text=>events.push(["toast",text]),
  checkDynamicClassUnlocks:()=>events.push("unlock-check"),recordRunBuff:(...args)=>{state.player.runBuffs.push(args);events.push("buff");},recordPowerupTaken:()=>events.push("taken"),syncOuroborosEconomy:()=>events.push("ouro-sync"),
  isNightmare:()=>false,isHell:()=>false,isGameStarted:()=>false,
  renderLevelUp:()=>"level",renderPowerupChoice:()=>"choice",renderLegendaryChoice:()=>"legendary",renderAllEligible:()=>"all",perfectedSignature:()=>({id:"perfected_signature"})
});

assert.deepEqual(power.eligible().map(up=>up.id),["generic","ranger","unique"]);
gate=true;
assert.deepEqual(power.eligible().map(up=>up.id),["generic","ranger","unique","gated"]);
state.player.upgradeCounts.unique=1;
assert.deepEqual(power.eligible().map(up=>up.id),["generic","ranger","gated"]);
state.player.classId="slime";state.player.upgradeCounts={};
assert.deepEqual(power.eligible().map(up=>up.id),["generic","fighter","unique","gated"]);
state.player.classId="slimerouge";
assert.deepEqual(power.eligible().map(up=>up.id),["generic","ranger","unique","gated"]);

state.player.classId="ranger";state.player.upgradeCounts={};randomCalls=0;
assert.ok(power.weighted(power.eligible()));
assert.equal(randomCalls,1,"weighted selection must consume exactly one configured RNG draw");
randomCalls=0;
assert.equal(power.choices(()=>true,3).length,3);
assert.equal(randomCalls,3,"three weighted choices must consume exactly three RNG draws");

const beforeAttack=state.player.attack;
events.length=0;
power.apply(fakeCatalog[0],"Facade Test");
assert.equal(state.player.attack,beforeAttack+1);
assert.equal(state.player.upgradeCounts.generic,1);
assert.deepEqual(events,["unlock-check","buff","taken","ouro-sync"]);

state.player.classId="d20";state.player.upgradeCounts={};events.length=0;
const d20Attack=state.player.attack;
power.apply(fakeCatalog[0],"D20 Test");
assert.equal(state.player.attack,d20Attack+1);
assert.equal(state.player.upgradeCounts.generic,1);
assert.ok(events.some(event=>Array.isArray(event)&&event[0]==="log"),"D20 application keeps presentation hook ordering");
assert.ok(events.includes("unlock-check"));
assert.ok(events.includes("taken"));

state.player.classId="ranger";state.player.levelChoiceBonus=1;randomCalls=0;
assert.equal(power.levelChoices().length,4);
assert.equal(randomCalls,4);
assert.equal(power.openLevelUp(),"level");
assert.equal(power.openChoice("x",()=>{}),"choice");
assert.equal(power.openLegendary("x"),"legendary");
assert.equal(power.openAllEligible(),"all");
assert.equal(power.perfectedSignature().id,"perfected_signature");
assert.equal(power.inspect().owner,"powerups/facade");


const monolith=fs.readFileSync(path.join(root,"runtime","js","dicebound.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"runtime","js","module-manifest.json"),"utf8"));
assert.match(monolith,/const dbPowerups=window\.DiceboundPowerups/);
assert.doesNotMatch(monolith,/window\.DiceboundPowerups=Object\.freeze/);
assert.doesNotMatch(monolith,/window\.DiceboundPowerupRegistry/);
assert.doesNotMatch(monolith,/window\.DiceboundPowerupBorrowing/);
for(const retired of ["applyUpgradeV15","applyUpgradeV27Base","db060ApplyUpgradeBase","weightedUpgradeV26Base","eligibleUpgradesV28Base"])assert.ok(!monolith.includes(retired),`retired Powerup wrapper remains: ${retired}`);
assert.match(monolith,/eligibleUpgrades:filter=>dbPowerups\.eligible\(filter\)/);
assert.match(monolith,/applyUpgrade:\(up,source\)=>dbPowerups\.apply\(up,source\)/);
assert.match(monolith,/function applyUpgrade\(up,source="Powerup"\)\{return dbPowerups\.apply\(up,source\);\}/);
assert.match(monolith,/dbPowerups\.weighted\(pool\)/,'permanent Powerups oracle must route weighted selection directly through the facade');
assert.doesNotMatch(monolith,/function\s+weightedUpgrade\s*\(/,'retired weightedUpgrade call-only adapter returned to the monolith');
const facadeModule=manifest.modules.find(m=>m.id==="powerup-facade");
assert.ok(facadeModule);
assert.deepEqual(facadeModule.requires,["powerup-registry","powerup-borrowing"]);
assert.deepEqual(facadeModule.provides,["DiceboundPowerups"]);
assert.ok(manifest.loadOrder.indexOf("powerup-borrowing")<manifest.loadOrder.indexOf("powerup-facade"));
assert.ok(manifest.loadOrder.indexOf("powerup-facade")<manifest.loadOrder.indexOf("dicebound-monolith"));

console.log("Powerups facade owner PASS: registry/borrowing composition, eligibility, weighted RNG, application ordering and public UI boundary are deterministic");
