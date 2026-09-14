"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const registryPath=path.join(root,"runtime","js","classes","registry.js");
const runtimePath=path.join(root,"runtime","js","classes","runtime.js");
const monoPath=path.join(root,"runtime","js","dicebound.js");
const manifestPath=path.join(root,"runtime","js","module-manifest.json");
const indexPath=path.join(root,"runtime","index.html");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON});
vm.runInContext(fs.readFileSync(registryPath,"utf8"),context,{filename:registryPath});
vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});

const classes=context.window.DiceboundClasses;
assert.ok(classes,"DiceboundClasses facade missing");
assert.equal(classes.apiVersion,2,"registry compatibility apiVersion drifted");
assert.equal(classes.owner,"classes/facade");
assert.equal(context.window.DiceboundClassRuntime,undefined,"focused Classes runtime leaked as a peer public global");

let player={classId:"ranger"},selected="sorcerer";
const mechanics=classes.createMechanicsRegistry(),ultimateSupport=classes.createUltimateSupportRegistry();
classes.configure({
  getPlayer:()=>player,
  getSelectedClassId:()=>selected,
  getClassMechanics:id=>mechanics[id]||[],
  getUltimateSupportMechanics:id=>ultimateSupport[id]||[],
});
assert.equal(classes.identityId(),"ranger");
assert.equal(classes.active("ranger"),true);
assert.equal(classes.hasMechanic("marks"),true);
assert.deepEqual(Array.from(classes.mechanicsFor("ranger")),["marks","crit","evasion","ranged"]);
player=null;
assert.equal(classes.identityId(),"sorcerer","selected-class fallback drifted");
player={classId:"slimerouge",slimeRougeIdentityClass:"summoner",slimeRougeUltimateClass:"pokemontrainer"};
assert.equal(classes.identityId(),"summoner");
let caps=new Set(Array.from(classes.capabilities()));
for(const capability of ["randomizer","flex","mana","spirits","roster","ultimate:pokemontrainer"])assert.ok(caps.has(capability),`missing Slime Rouge capability ${capability}`);
const raw=classes._runtimeState();
raw.pendingIdentity="ninja";raw.pendingUltimate="ranger";
assert.equal(classes.identityId(),"ninja");
caps=new Set(Array.from(classes.capabilities()));
assert.ok(caps.has("smoke"));assert.ok(caps.has("marks"));assert.ok(caps.has("ultimate:ranger"));
classes.forceSlimeRouge("cleric","alchemist");
assert.deepEqual(JSON.parse(JSON.stringify(classes.runtimeSnapshot())),{pendingIdentity:"ninja",pendingUltimate:"ranger",forcedIdentity:"cleric",forcedUltimate:"alchemist"});
classes.clearSlimeRougeRuntime();
assert.deepEqual(JSON.parse(JSON.stringify(classes.runtimeSnapshot())),{pendingIdentity:null,pendingUltimate:null,forcedIdentity:null,forcedUltimate:null});

const monolith=fs.readFileSync(monoPath,"utf8");
assert.doesNotMatch(monolith,/const SlimeRougeRuntime=\{pendingIdentity:/,"monolith still allocates Slime Rouge runtime state");
assert.match(monolith,/const dbClasses=window\.DiceboundClasses;/,"monolith is not composing the Classes facade");
assert.match(monolith,/const SlimeRougeRuntime=dbClasses\._runtimeState\(\);/,"compatibility state alias is not sourced from Classes owner");
assert.match(monolith,/function classIdentityId\(\)\{return dbClasses\.identityId\(\);\}/);
assert.match(monolith,/function classIdentityActive\(id\)\{return dbClasses\.active\(id\);\}/);
assert.match(monolith,/function classMechanicsFor\(id\)\{return dbClasses\.mechanicsFor\(id\);\}/);
assert.match(monolith,/function slimeRougeCapabilities\(\)\{return dbClasses\.capabilities\(\);\}/);
assert.match(monolith,/function classHasMechanic\(tag\)\{return dbClasses\.hasMechanic\(tag\);\}/);

const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const runtimeModule=manifest.modules.find(entry=>entry.id==="classes-runtime");
assert.ok(runtimeModule,"classes-runtime manifest owner missing");
assert.equal(runtimeModule.path,"js/classes/runtime.js");
assert.deepEqual(runtimeModule.requires,["classes-registry"]);
assert.deepEqual(runtimeModule.provides,[],"focused Classes runtime should not publish a peer public facade");
const order=manifest.loadOrder;
assert.equal(order[order.indexOf("classes-registry")+1],"classes-runtime","Classes runtime must load immediately after registry facade");
const scripts=[...fs.readFileSync(indexPath,"utf8").matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match=>match[1]);
assert.ok(scripts.indexOf("js/classes/registry.js")<scripts.indexOf("js/classes/runtime.js"));
assert.ok(scripts.indexOf("js/classes/runtime.js")<scripts.indexOf("js/dicebound.js"));

console.log("Classes runtime owner PASS: identity, capability and Slime Rouge state route through DiceboundClasses");
