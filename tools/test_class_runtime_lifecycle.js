"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON,Math,Number});
const load=rel=>vm.runInContext(fs.readFileSync(path.join(root,rel),"utf8"),context,{filename:rel});
load("runtime/js/classes/registry.js");
load("runtime/js/classes/runtime.js");
const classes=context.window.DiceboundClasses;
const registry=classes.createRegistry(),mechanics=classes.createMechanicsRegistry(),ultimate=classes.createUltimateSupportRegistry();
let player={classId:"ranger"},selected="ranger",shuffleCalls=0;
const pets=["neutral","fire","ice","electric","nature","light","void","donut"];
classes.configure({
  getPlayer:()=>player,getSelectedClassId:()=>selected,
  getClassMechanics:id=>mechanics[id]||[],getUltimateSupportMechanics:id=>ultimate[id]||[],
  getClassBase:id=>registry[id]?.base||null,
  shuffledPetIds:()=>{shuffleCalls++;return [...pets];},getPetIds:()=>[...pets]
});

// Identity support preserves exact resource defaults and only consumes the
// roster collaborator when a roster is actually needed.
player={classId:"summoner",maxMana:0,mana:0,summonerSpirits:null,summonerCap:0,summonerSpiritScale:0,summonerSpiritDouble:0,summonerManaBonus:0};
classes.initIdentitySupport("summoner");
assert.equal(player.maxMana,120);assert.equal(player.mana,35);assert.deepEqual(Array.from(player.summonerSpirits),[]);assert.equal(player.summonerCap,3);assert.equal(player.summonerSpiritScale,1);assert.equal(player.summonerSpiritDouble,0);assert.equal(player.summonerManaBonus,0);assert.equal(shuffleCalls,0);

player={classId:"pokemontrainer",trainerRoster:[],trainerActiveIndex:9,trainerAssistScale:0};
classes.initIdentitySupport("pokemontrainer");
assert.deepEqual(Array.from(player.trainerRoster),pets.slice(0,6));assert.equal(player.trainerActiveIndex,5);assert.equal(player.trainerAssistScale,.65);assert.equal(shuffleCalls,1);

player={classId:"alchemist",alchemistBrewCounter:0,alchemistBrewNeed:0,alchemistFlaskBonus:0};
classes.initIdentitySupport("alchemist");assert.equal(player.alchemistBrewCounter,0);assert.equal(player.alchemistBrewNeed,3);assert.equal(player.alchemistFlaskBonus,0);
player={classId:"ninja",ninjaSmoke:0,ninjaSmokeNeed:0};classes.initIdentitySupport("ninja");assert.equal(player.ninjaSmoke,0);assert.equal(player.ninjaSmokeNeed,3);
player={classId:"cleric",clericFaith:0};classes.initIdentitySupport("cleric");assert.equal(player.clericFaith,0);

// Ultimate support intentionally uses the Ultimate donor's support metadata,
// including the older 100/25 Mana defaults rather than Summoner identity rules.
player={classId:"slimerouge",maxMana:0,mana:0,summonerSpirits:null,summonerCap:0,summonerSpiritScale:0};
classes.initUltimateSupport("summoner");assert.equal(player.maxMana,100);assert.equal(player.mana,25);assert.deepEqual(Array.from(player.summonerSpirits),[]);assert.equal(player.summonerCap,3);assert.equal(player.summonerSpiritScale,1);
player={classId:"slimerouge",trainerRoster:[],trainerActiveIndex:7,trainerAssistScale:0};classes.initUltimateSupport("pokemontrainer");assert.deepEqual(Array.from(player.trainerRoster),pets.slice(0,6));assert.equal(player.trainerActiveIndex,5);assert.equal(player.trainerAssistScale,.65);assert.equal(shuffleCalls,2);
assert.deepEqual(Array.from(classes.ultimateSupportFor("pokemontrainer")),Array.from(ultimate.pokemontrainer));

// Bloodmage HP normalization keeps the shipped double-growth bookkeeping.
const bloodBase=registry.bloodmage.base.maxHp;
player={classId:"bloodmage",maxHp:bloodBase+10,hp:20,_v18BloodmageMaxHp:null};
classes.syncBloodmageHpPassive(true);assert.equal(player.maxHp,bloodBase+20);assert.equal(player.hp,30);assert.equal(player._v18BloodmageMaxHp,bloodBase+20);
player.maxHp+=5;classes.syncBloodmageHpPassive(false);assert.equal(player.maxHp,bloodBase+30);assert.equal(player.hp,35);assert.equal(player._v18BloodmageMaxHp,bloodBase+30);

const mono=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
assert.doesNotMatch(mono,/function\s+v18SyncBloodmageHpPassive\s*\(/);
assert.doesNotMatch(mono,/function\s+v318InitUltimateSupport\s*\(/);
assert.doesNotMatch(mono,/function\s+v32InitIdentitySupport\s*\(/);
assert.match(mono,/syncBloodmageHpPassive:initial=>dbClasses\.syncBloodmageHpPassive\(initial\)/);
assert.match(mono,/initIdentitySupport:id=>dbClasses\.initIdentitySupport\(id\)/);
assert.match(mono,/initUltimateSupport:id=>dbClasses\.initUltimateSupport\(id\)/);
assert.match(mono,/getUltimateSupportMechanics:id=>dbClasses\.ultimateSupportFor\(id\)/);
console.log("Classes lifecycle PASS: Bloodmage HP normalization and borrowed identity/Ultimate support initialization are owned behind DiceboundClasses");
