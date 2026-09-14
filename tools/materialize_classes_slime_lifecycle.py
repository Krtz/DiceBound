#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RUNTIME=ROOT/'runtime/js/classes/runtime.js'
REGISTRY=ROOT/'runtime/js/classes/registry.js'
RUN_INIT=ROOT/'runtime/js/run/player-initialization.js'
MONO=ROOT/'runtime/js/dicebound.js'
PLAYER_TEST=ROOT/'tools/test_player_initialization.js'
CLASSES_TEST=ROOT/'tools/test_classes_runtime.js'


def replace_once(path:Path,old:str,new:str,label:str):
    source=path.read_text(encoding='utf-8')
    count=source.count(old)
    if count!=1:raise SystemExit(f'{label}: expected one match, found {count}')
    path.write_text(source.replace(old,new,1),encoding='utf-8')

runtime=RUNTIME.read_text(encoding='utf-8')
replace_once(RUNTIME,
'''  function forceSlimeRouge(identity=null,ultimate=null){
    slimeRougeState.forcedIdentity=identity;
    slimeRougeState.forcedUltimate=ultimate;
    return snapshot();
  }
  function clearSlimeRougeRuntime(){
    slimeRougeState.pendingIdentity=null;
    slimeRougeState.pendingUltimate=null;
    slimeRougeState.forcedIdentity=null;
    slimeRougeState.forcedUltimate=null;
    return snapshot();
  }
  function snapshot(){return Object.freeze({...slimeRougeState});}
  function runtimeState(){return slimeRougeState;}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,identityId,active,mechanicsFor,capabilities,hasMechanic,
    forceSlimeRouge,clearSlimeRougeRuntime,snapshot,_runtimeState:runtimeState
  });
''',
'''  function forceSlimeRouge(identity=null,ultimate=null){
    slimeRougeState.forcedIdentity=identity;
    slimeRougeState.forcedUltimate=ultimate;
    return snapshot();
  }
  function prepareSlimeRougeBorrowing(pool=[],pick){
    if(!Array.isArray(pool)||!pool.length)return Object.freeze({identity:null,ultimate:null});
    if(typeof pick!=="function")throw new Error("Classes Slime Rouge borrowing requires pick().");
    const identity=pool.find(candidate=>candidate?.id===slimeRougeState.forcedIdentity)||pick(pool);
    const ultimate=pool.find(candidate=>candidate?.id===slimeRougeState.forcedUltimate)||pick(pool);
    slimeRougeState.pendingIdentity=identity.id;
    slimeRougeState.pendingUltimate=ultimate.id;
    return Object.freeze({identity,ultimate});
  }
  function finishSlimeRougeBorrowing(){
    slimeRougeState.pendingIdentity=null;
    slimeRougeState.pendingUltimate=null;
    slimeRougeState.forcedIdentity=null;
    slimeRougeState.forcedUltimate=null;
    return snapshot();
  }
  function clearSlimeRougeRuntime(){return finishSlimeRougeBorrowing();}
  function snapshot(){return Object.freeze({...slimeRougeState});}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,identityId,active,mechanicsFor,capabilities,hasMechanic,
    forceSlimeRouge,prepareSlimeRougeBorrowing,finishSlimeRougeBorrowing,clearSlimeRougeRuntime,snapshot
  });
''','Classes runtime lifecycle')

replace_once(REGISTRY,
'''    forceSlimeRouge:(identity=null,ultimate=null)=>call("forceSlimeRouge",identity,ultimate),
    clearSlimeRougeRuntime:()=>call("clearSlimeRougeRuntime"),
    runtimeSnapshot:()=>call("snapshot"),
    _runtimeState:()=>call("_runtimeState"),
    _installRuntime:installRuntime,
''',
'''    forceSlimeRouge:(identity=null,ultimate=null)=>call("forceSlimeRouge",identity,ultimate),
    prepareSlimeRougeBorrowing:(pool,pick)=>call("prepareSlimeRougeBorrowing",pool,pick),
    finishSlimeRougeBorrowing:()=>call("finishSlimeRougeBorrowing"),
    clearSlimeRougeRuntime:()=>call("clearSlimeRougeRuntime"),
    runtimeSnapshot:()=>call("snapshot"),
    _installRuntime:installRuntime,
''','Classes facade lifecycle')

replace_once(RUN_INIT,
'''    for(const name of ["setRunTalentSnapshot","applyTalentBonuses","getHeirloomSlots","equipItem","gameplayTalentRank","generateEquipment","pick","rand","recordRunBuff","elementSummary","classIdentityActive","classHasMechanic","shuffledPetIds","setCombatKind","syncActivePetBonus","syncBloodmageHpPassive","syncOuroborosAttack","syncOuroborosEconomy","slimeRougeDonorPool","getSlimeRougeRuntime","initIdentitySupport","initUltimateSupport","classMechanicsFor","getUltimateSupportMechanics","addLog","applyGearTransform","syncMana","resetDragoonState","setStatsLast","setRunGlobals","initializeD20State"]){
''',
'''    for(const name of ["setRunTalentSnapshot","applyTalentBonuses","getHeirloomSlots","equipItem","gameplayTalentRank","generateEquipment","pick","rand","recordRunBuff","elementSummary","classIdentityActive","classHasMechanic","shuffledPetIds","setCombatKind","syncActivePetBonus","syncBloodmageHpPassive","syncOuroborosAttack","syncOuroborosEconomy","prepareSlimeRougeBorrowing","finishSlimeRougeBorrowing","initIdentitySupport","initUltimateSupport","classMechanicsFor","getUltimateSupportMechanics","addLog","applyGearTransform","syncMana","resetDragoonState","setStatsLast","setRunGlobals","initializeD20State"]){
''','Run dependency list')
replace_once(RUN_INIT,
'''      let identity=null,ultimate=null;
      const slimeRuntime=deps.getSlimeRougeRuntime();
      if(classId==='slimerouge'){
        const pool=deps.slimeRougeDonorPool();
        if(pool.length){
          identity=pool.find(c=>c.id===slimeRuntime.forcedIdentity)||deps.pick(pool);
          ultimate=pool.find(c=>c.id===slimeRuntime.forcedUltimate)||deps.pick(pool);
          slimeRuntime.pendingIdentity=identity.id;slimeRuntime.pendingUltimate=ultimate.id;
        }
      }
''',
'''      let identity=null,ultimate=null;
      if(classId==='slimerouge')({identity,ultimate}=deps.prepareSlimeRougeBorrowing());
''','Run Slime Rouge pre-stage')
replace_once(RUN_INIT,
'''      slimeRuntime.pendingIdentity=null;slimeRuntime.pendingUltimate=null;slimeRuntime.forcedIdentity=null;slimeRuntime.forcedUltimate=null;
''',
'''      deps.finishSlimeRougeBorrowing();
''','Run Slime Rouge finish')

replace_once(MONO,
'''  const SlimeRougeRuntime=dbClasses._runtimeState();
  function classIdentityId(){return dbClasses.identityId();}
''',
'''  function classIdentityId(){return dbClasses.identityId();}
''','monolith raw state alias')
replace_once(MONO,
'''    forceRun:(identity='summoner',ultimate='pokemontrainer')=>{[identity,ultimate,'slimerouge'].forEach(id=>{if(id&&meta.unlocks)meta.unlocks[id]=true;});SlimeRougeRuntime.forcedIdentity=identity;SlimeRougeRuntime.forcedUltimate=ultimate;resetPlayer('slimerouge');return {identity:player.slimeRougeIdentityClass,ultimate:player.slimeRougeUltimateClass,mechanics:[...slimeRougeCapabilities()],mana:player.mana,maxMana:player.maxMana,spirits:Array.isArray(player.summonerSpirits),roster:(player.trainerRoster||[]).length};},
''',
'''    forceRun:(identity='summoner',ultimate='pokemontrainer')=>{[identity,ultimate,'slimerouge'].forEach(id=>{if(id&&meta.unlocks)meta.unlocks[id]=true;});dbClasses.forceSlimeRouge(identity,ultimate);resetPlayer('slimerouge');return {identity:player.slimeRougeIdentityClass,ultimate:player.slimeRougeUltimateClass,mechanics:[...slimeRougeCapabilities()],mana:player.mana,maxMana:player.maxMana,spirits:Array.isArray(player.summonerSpirits),roster:(player.trainerRoster||[]).length};},
''','V318 force facade')
replace_once(MONO,
'''    syncActivePetBonus:force=>dbPets.syncActiveBonus(force),syncBloodmageHpPassive:initial=>v18SyncBloodmageHpPassive(initial),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),
    slimeRougeDonorPool:()=>v318SlimeRougeDonorPool(),getSlimeRougeRuntime:()=>SlimeRougeRuntime,initIdentitySupport:id=>v32InitIdentitySupport(id),initUltimateSupport:id=>v318InitUltimateSupport(id),
''',
'''    syncActivePetBonus:force=>dbPets.syncActiveBonus(force),syncBloodmageHpPassive:initial=>v18SyncBloodmageHpPassive(initial),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),
    prepareSlimeRougeBorrowing:()=>dbClasses.prepareSlimeRougeBorrowing(v318SlimeRougeDonorPool(),pick),finishSlimeRougeBorrowing:()=>dbClasses.finishSlimeRougeBorrowing(),initIdentitySupport:id=>v32InitIdentitySupport(id),initUltimateSupport:id=>v318InitUltimateSupport(id),
''','Run composition facade lifecycle')
replace_once(MONO,
'''  function dbClassesOracleClearIdentityRuntime(){
    SlimeRougeRuntime.pendingIdentity=null;SlimeRougeRuntime.pendingUltimate=null;SlimeRougeRuntime.forcedIdentity=null;SlimeRougeRuntime.forcedUltimate=null;
  }
''',
'''  function dbClassesOracleClearIdentityRuntime(){dbClasses.clearSlimeRougeRuntime();}
''','oracle facade clear')

# The Player Initialization oracle keeps a local model of the historical runtime
# so its released fixture remains exact, but the extracted owner now receives
# explicit lifecycle operations instead of the mutable object.
replace_once(PLAYER_TEST,
'''  const slimeRougeDonorPool=()=>Object.values(CLASSES).filter(c=>c.id!=='slime'&&c.id!=='slimerouge'&&!!meta.unlocks[c.id]);
''',
'''  const slimeRougeDonorPool=()=>Object.values(CLASSES).filter(c=>c.id!=='slime'&&c.id!=='slimerouge'&&!!meta.unlocks[c.id]);
  const prepareSlimeRougeBorrowing=()=>{const pool=slimeRougeDonorPool();let identity=null,ultimate=null;if(pool.length){identity=pool.find(c=>c.id===SlimeRougeRuntime.forcedIdentity)||pick(pool);ultimate=pool.find(c=>c.id===SlimeRougeRuntime.forcedUltimate)||pick(pool);SlimeRougeRuntime.pendingIdentity=identity.id;SlimeRougeRuntime.pendingUltimate=ultimate.id;}return {identity,ultimate};};
  const finishSlimeRougeBorrowing=()=>{SlimeRougeRuntime.pendingIdentity=null;SlimeRougeRuntime.pendingUltimate=null;SlimeRougeRuntime.forcedIdentity=null;SlimeRougeRuntime.forcedUltimate=null;};
''','player oracle lifecycle model')
replace_once(PLAYER_TEST,
'''    syncBloodmageHpPassive,syncOuroborosAttack,syncOuroborosEconomy,slimeRougeDonorPool,getSlimeRougeRuntime:()=>SlimeRougeRuntime,
''',
'''    syncBloodmageHpPassive,syncOuroborosAttack,syncOuroborosEconomy,prepareSlimeRougeBorrowing,finishSlimeRougeBorrowing,
''','player oracle dependencies')

CLASSES_TEST.write_text(r'''"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const registryPath=path.join(root,"runtime","js","classes","registry.js");
const runtimePath=path.join(root,"runtime","js","classes","runtime.js");
const monoPath=path.join(root,"runtime","js","dicebound.js");
const runInitPath=path.join(root,"runtime","js","run","player-initialization.js");
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
assert.equal(classes._runtimeState,undefined,"raw Classes runtime state leaked through the public facade");

let player={classId:"ranger"},selected="sorcerer";
const mechanics=classes.createMechanicsRegistry(),ultimateSupport=classes.createUltimateSupportRegistry();
classes.configure({getPlayer:()=>player,getSelectedClassId:()=>selected,getClassMechanics:id=>mechanics[id]||[],getUltimateSupportMechanics:id=>ultimateSupport[id]||[]});
assert.equal(classes.identityId(),"ranger");
assert.equal(classes.active("ranger"),true);
assert.equal(classes.hasMechanic("marks"),true);
assert.deepEqual(Array.from(classes.mechanicsFor("ranger")),["marks","crit","evasion","ranged"]);
player=null;assert.equal(classes.identityId(),"sorcerer","selected-class fallback drifted");
player={classId:"slimerouge",slimeRougeIdentityClass:"summoner",slimeRougeUltimateClass:"pokemontrainer"};
assert.equal(classes.identityId(),"summoner");
let caps=new Set(Array.from(classes.capabilities()));
for(const capability of ["randomizer","flex","mana","spirits","roster","ultimate:pokemontrainer"])assert.ok(caps.has(capability),`missing Slime Rouge capability ${capability}`);

const pool=[{id:"ranger"},{id:"cleric"},{id:"alchemist"}];
classes.forceSlimeRouge("cleric","alchemist");
let pickCalls=0;
let prepared=classes.prepareSlimeRougeBorrowing(pool,()=>{pickCalls++;return pool[0];});
assert.equal(prepared.identity.id,"cleric");assert.equal(prepared.ultimate.id,"alchemist");assert.equal(pickCalls,0,"forced borrowing consumed RNG");
assert.deepEqual(JSON.parse(JSON.stringify(classes.runtimeSnapshot())),{pendingIdentity:"cleric",pendingUltimate:"alchemist",forcedIdentity:"cleric",forcedUltimate:"alchemist"});
classes.finishSlimeRougeBorrowing();
assert.deepEqual(JSON.parse(JSON.stringify(classes.runtimeSnapshot())),{pendingIdentity:null,pendingUltimate:null,forcedIdentity:null,forcedUltimate:null});
const picks=[pool[0],pool[2]];pickCalls=0;prepared=classes.prepareSlimeRougeBorrowing(pool,()=>picks[pickCalls++]);
assert.equal(prepared.identity.id,"ranger");assert.equal(prepared.ultimate.id,"alchemist");assert.equal(pickCalls,2,"unforced borrowing must preserve two-pick RNG order");
assert.equal(classes.identityId(),"ranger","pending borrowed identity must become active during initialization");
classes.clearSlimeRougeRuntime();

const monolith=fs.readFileSync(monoPath,"utf8"),runInit=fs.readFileSync(runInitPath,"utf8");
assert.doesNotMatch(monolith,/SlimeRougeRuntime/,"monolith still holds a raw Slime Rouge runtime alias");
assert.match(monolith,/const dbClasses=window\.DiceboundClasses;/,"monolith is not composing the Classes facade");
assert.match(monolith,/function classIdentityId\(\)\{return dbClasses\.identityId\(\);\}/);
assert.match(monolith,/function classIdentityActive\(id\)\{return dbClasses\.active\(id\);\}/);
assert.match(monolith,/function classMechanicsFor\(id\)\{return dbClasses\.mechanicsFor\(id\);\}/);
assert.match(monolith,/function slimeRougeCapabilities\(\)\{return dbClasses\.capabilities\(\);\}/);
assert.match(monolith,/function classHasMechanic\(tag\)\{return dbClasses\.hasMechanic\(tag\);\}/);
assert.match(monolith,/dbClasses\.forceSlimeRouge\(identity,ultimate\)/,"Slime Rouge test force path bypasses Classes facade");
assert.match(monolith,/prepareSlimeRougeBorrowing:\(\)=>dbClasses\.prepareSlimeRougeBorrowing/,"Run composition does not delegate borrowing to Classes");
assert.doesNotMatch(runInit,/getSlimeRougeRuntime|slimeRuntime\.|pendingIdentity\s*=|forcedIdentity/,"Run initialization still mutates raw Slime Rouge runtime state");
assert.match(runInit,/deps\.prepareSlimeRougeBorrowing\(\)/);
assert.match(runInit,/deps\.finishSlimeRougeBorrowing\(\)/);

const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const runtimeModule=manifest.modules.find(entry=>entry.id==="classes-runtime");
assert.ok(runtimeModule,"classes-runtime manifest owner missing");assert.equal(runtimeModule.path,"js/classes/runtime.js");assert.deepEqual(runtimeModule.requires,["classes-registry"]);assert.deepEqual(runtimeModule.provides,[],"focused Classes runtime should not publish a peer public facade");
const order=manifest.loadOrder;assert.equal(order[order.indexOf("classes-registry")+1],"classes-runtime","Classes runtime must load immediately after registry facade");
const scripts=[...fs.readFileSync(indexPath,"utf8").matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match=>match[1]);assert.ok(scripts.indexOf("js/classes/registry.js")<scripts.indexOf("js/classes/runtime.js"));assert.ok(scripts.indexOf("js/classes/runtime.js")<scripts.indexOf("js/dicebound.js"));

console.log("Classes runtime owner PASS: identity, capabilities and Slime Rouge borrowing lifecycle route through DiceboundClasses without raw state sharing");
''',encoding='utf-8')

print('Classes Slime Rouge lifecycle ownership drain materialized')
