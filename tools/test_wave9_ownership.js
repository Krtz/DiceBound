#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.join(__dirname,"..");
const read=rel=>fs.readFileSync(path.join(ROOT,rel),"utf8");

function load(rel,extra={}){
  const context={window:{},console,setTimeout,clearTimeout,...extra};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(read(rel),context,{filename:rel});
  return context;
}

function testConsumables(){
  const ctx=load("runtime/js/items/consumables.js");
  const api=ctx.window.DiceboundConsumables;
  assert.ok(api,"Consumables owner did not load");
  assert.equal(api._test.v24RoadAccountingLayer,undefined,"obsolete road accounting repair returned");

  const player={potions:2,hp:50,maxHp:100,potionPower:0,guardCooldown:0};
  const stats={potionsUsed:14};
  const calls={unlock:0,save:0,log:0,toast:0,hud:0,trace:[]};
  const runtime={
    getPlayer:()=>player,getCurrentEnemy:()=>null,livingEnemies:()=>[],getCombatBusy:()=>false,setCombatBusy:()=>{},
    isGameStarted:()=>true,getRollLocked:()=>false,rollD20Chaos:async()=>({}),
    healPlayer:amount=>{const healed=Math.min(amount,player.maxHp-player.hp);player.hp+=healed;return healed;},playHeal:()=>{},
    triggerElementEffect:()=>null,getDiboElements:()=>[],applyMythicPantsPulse:()=>"",setCombatText:()=>{},updateCombatUI:()=>{},
    delay:async()=>{},winCombat:()=>{},resolveEnemyResponse:async()=>{},
    recordCareerPotionUse:()=>{stats.potionsUsed++;return stats.potionsUsed;},
    checkDynamicClassUnlocks:()=>{calls.unlock++;},saveMeta:()=>{calls.save++;},renderClassChooser:()=>{},
    addLog:()=>{calls.log++;},showToast:()=>{calls.toast++;},updateHud:()=>{calls.hud++;},
    traceCommand:(name,fn)=>{calls.trace.push(name);return fn();},isClassActive:()=>false,
    dragoonActive:()=>false,dragoonLandingReady:()=>false,dragoonLanding:()=>{},tickDragoonCooldown:()=>{}
  };
  api.configure(runtime);
  assert.equal(api.potionHealValue(),20,"Potion formula drifted");
  api.usePotionOutsideCombat();
  assert.equal(player.potions,1,"road Potion must consume exactly one Potion");
  assert.equal(player.hp,70,"road Potion healing drifted");
  assert.equal(stats.potionsUsed,15,"road Potion must record exactly one Alchemist career use");
  assert.deepEqual(calls.trace,["usePotionOutsideCombat"],"road Potion trace drifted");
  assert.deepEqual({unlock:calls.unlock,save:calls.save,log:calls.log,toast:calls.toast,hud:calls.hud},{unlock:1,save:1,log:1,toast:1,hud:1},"road Potion side effects drifted");
}

function testManaDescriptors(){
  const ctx=load("runtime/js/combat/mana-action-resolution.js");
  const api=ctx.window.DiceboundCombatManaActionResolution;
  assert.ok(api,"Mana action owner did not load");
  const sorcerer=api.spellFor("sorcerer"),summoner=api.spellFor("summoner");
  assert.equal(sorcerer.builder,"Channel Bolt");
  assert.equal(sorcerer.spell,"Arcane Lance");
  assert.equal(sorcerer.cost,35);
  assert.equal(sorcerer.gain,28);
  assert.equal(summoner.builder,"Spirit Bolt");
  assert.equal(summoner.spell,"Conjure Familiar");
  assert.equal(summoner.cost,40);
  assert.equal(summoner.gain,26);
  assert.equal(api.spells().summoner,summoner,"Mana owner spell table must expose canonical Summoner descriptor");
  assert.equal(api.spells().sorcerer,sorcerer,"Mana owner spell table must expose canonical Sorcerer descriptor");
  assert.equal(api.isManaClass("invoker"),true);
  assert.equal(api.isManaClass("ninja"),false);
  assert.equal(api.identityNote("summoner"),"Mana class — Spirit Bolt builds Mana; Conjure Familiar spends it.");
  assert.equal(api.identityNote("ninja"),null);
}

function testThroneOfVenom(){
  const player={classId:"frog",poisonOnHitChance:0,poisonStackPower:.12,lifeSteal:0};
  const ctx=load("runtime/js/powerups/registry.js");
  const services={
    apiVersion:1,
    run:{player},
    economy:{goldReward:n=>n,goldBaseFor:(source,level,multiplier)=>Math.round((50+20*Math.max(1,Number(level)||1))*(multiplier??(source==="heavyPurse"?.7:1))),isNightmare:()=>false},
    combat:{heal:n=>n},
    rules:{clamp:(v,min,max)=>Math.max(min,Math.min(max,v))},
    signatures:{applyCurrent:()=>{},describeCurrent:()=>""},
    content:{
      elementIds:["fire","ice","electric","light","void","nature"],
      classHasTag:(classId,tag)=>tag==="poison"&&["frog","ouroboros","ninja","slime","slimerouge"].includes(classId)
    }
  };
  const registry=ctx.window.DiceboundPowerupRegistry.createRegistry(services);
  const throne=registry.find(power=>power.id==="legendary_venom_throne_v27");
  assert.ok(throne,"Throne of Venom missing from canonical registry");
  assert.equal(throne.desc,"Gain +50% Poison Chance and +10% Lifesteal. Poison-tagged classes gain +40% Poison damage; all other classes gain +20%.");
  throne.apply();
  assert.equal(player.poisonOnHitChance,.5);
  assert.equal(player.poisonStackPower,.52,"poison class must gain +40% Poison damage");
  assert.equal(player.lifeSteal,.10);
  player.classId="ranger";player.poisonOnHitChance=0;player.poisonStackPower=.12;player.lifeSteal=0;
  throne.apply();
  assert.equal(player.poisonOnHitChance,.5);
  assert.equal(player.poisonStackPower,.32,"non-poison class must gain +20% Poison damage");
  assert.equal(player.lifeSteal,.10);
}

function testSourceOwnership(){
  const monolith=read("runtime/js/dicebound.js"),consumables=read("runtime/js/items/consumables.js"),mana=read("runtime/js/combat/mana-action-resolution.js");
  for(const marker of ["db0511OutsidePotionBtn","v16PotionHealValue","MANA_OCCULT_CLASSES","OCCULT_SPELLS","v27EnsureUpgrade","venomThrone28"]){
    assert.equal(monolith.includes(marker),false,`historical monolith marker returned: ${marker}`);
  }
  assert.equal(consumables.includes("v24RoadAccountingLayer"),false,"Consumables road-accounting repair returned");
  assert.equal(mana.includes('"spellFor",'),false,"Mana owner regained monolith spell registry dependency");
  assert.ok(monolith.includes("dbCombatManaActionResolution.identityNote(cls.id)"),"class chooser does not use Mana owner descriptions");
  assert.ok(monolith.includes("getOccultSpells:()=>dbCombatManaActionResolution.spells()"),"combat presentation does not use Mana owner spell table");
}

testConsumables();
testManaDescriptors();
testThroneOfVenom();
testSourceOwnership();
console.log("Wave 9 ownership PASS: canonical Potion accounting, Mana descriptors and Throne of Venom behavior");
