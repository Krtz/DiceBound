#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const context=vm.createContext({window:{},console});context.window.window=context.window;
for(const rel of ["runtime/js/progression/echo-crucible.js","runtime/js/core/state.js"]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),"utf8"),context,{filename:rel});
}
const owner=context.window.DiceboundEchoCrucible;
assert.ok(owner?.createController,"Echo Crucible domain owner missing");
assert.equal(owner.owner,"progression/echo-crucible");
assert.equal(owner.apiVersion,1);

const effects=[
  {id:"generic_echo",name:"Generic Echo",icon:"✨",desc:"Generic effect."},
  {id:"sorcerer_echo",name:"Sorcerer Echo",icon:"⚡",classes:["sorcerer"],desc:"Sorcerer-only effect."}
];
const crucible=owner.createController({effects});
let state=crucible.normalize({learnedEffectIds:["generic_echo","missing","generic_echo"],selectedEffectId:"missing",moonMetal:2.9});
assert.deepEqual(JSON.parse(JSON.stringify(state)),{learnedEffectIds:["generic_echo"],selectedEffectId:null,moonMetal:2});
assert.equal(crucible.select(state,"sorcerer_echo").ok,false,"unlearned effects cannot be selected");
let selected=crucible.select(state,"generic_echo");
assert.equal(selected.ok,true);state={...selected.state};assert.equal(state.selectedEffectId,"generic_echo");

const legendary=id=>({id,slot:"weapon",rarity:"legendary",legendaryGenerated:true,legendaryEffectId:"sorcerer_echo",name:`Legendary ${id}`});
let storage=[legendary("first"),legendary("second")];
let result=crucible.sacrifice({state,storage,activeHeirlooms:[],itemId:"first"});
assert.equal(result.ok,true);assert.equal(result.outcome,"learned");assert.equal(result.moonMetalGained,0);
assert.equal(result.storage.length,1);assert.ok(result.state.learnedEffectIds.includes("sorcerer_echo"));
state={...result.state};storage=[...result.storage];

const replay=crucible.sacrifice({state,storage,activeHeirlooms:[],itemId:"first"});
assert.equal(replay.ok,false,"destroyed item cannot be sacrificed twice");
assert.equal(replay.state.moonMetal,state.moonMetal,"failed replay cannot mint Moon Metal");

result=crucible.sacrifice({state,storage,activeHeirlooms:[],itemId:"second"});
assert.equal(result.ok,true);assert.equal(result.outcome,"moon-metal");assert.equal(result.moonMetalGained,1);
assert.equal(result.state.moonMetal,state.moonMetal+1,"duplicate effect must mint exactly one Moon Metal");

const active=legendary("active");
const blocked=crucible.sacrifice({state,storage:[active],activeHeirlooms:[active],itemId:"active"});
assert.equal(blocked.ok,false);assert.match(blocked.reason,/remove this item from the active heirloom loadout/i);
assert.equal(blocked.storage.length,1,"blocked active item must not be destroyed");
assert.equal(crucible.isEligibleItem({...active,rarity:"artifact"}),false);
assert.equal(crucible.isEligibleItem({...active,rarity:"mythical"}),false);
assert.equal(crucible.isEligibleItem({...active,legendaryGenerated:false}),false);

state={learnedEffectIds:["generic_echo","sorcerer_echo"],selectedEffectId:"sorcerer_echo",moonMetal:0};
assert.equal(crucible.inspect(state,{classId:"ranger"}).selectedCompatible,false);
assert.equal(crucible.inspect(state,{classId:"sorcerer"}).selectedCompatible,true);
assert.match(crucible.warning(state,{classId:"ranger"}),/incompatible/i);
assert.match(crucible.warning(state,{classId:"ranger",randomClass:true}),/Random Class may roll an incompatible hero/i);

const core=context.window.DiceboundCoreState.createMetaService({classIds:["ranger"],petIds:["neutral"],elementIds:["fire"]});
const normalized=core.normalizeMeta({echoCrucible:{learnedEffectIds:["generic_echo","generic_echo"],selectedEffectId:"generic_echo",moonMetal:3.8},heirloomStorage:[active]});
assert.deepEqual(JSON.parse(JSON.stringify(normalized.echoCrucible)),{learnedEffectIds:["generic_echo"],selectedEffectId:"generic_echo",moonMetal:3});
assert.equal(normalized.heirloomStorage.length,1,"Vault must survive Meta normalization");

const manifest=JSON.parse(fs.readFileSync(path.join(root,"runtime/js/module-manifest.json"),"utf8"));
const index=fs.readFileSync(path.join(root,"runtime/index.html"),"utf8");
const moduleEntry=manifest.modules.find(entry=>entry.id==="progression-echo-crucible");
assert.ok(moduleEntry,"Echo Crucible missing from runtime module manifest");
assert.equal(moduleEntry.path,"js/progression/echo-crucible.js");
assert.ok(index.includes('<script src="js/progression/echo-crucible.js"></script>'));
assert.ok(manifest.loadOrder.indexOf("progression-prestige")<manifest.loadOrder.indexOf("progression-echo-crucible"));
assert.ok(manifest.loadOrder.indexOf("progression-echo-crucible")<manifest.loadOrder.indexOf("progression-achievements"));

console.log("Echo Crucible PASS: persistent library, atomic sacrifice outcomes, Moon Metal, compatibility and runtime registration");
