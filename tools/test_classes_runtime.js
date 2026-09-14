"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const registryPath=path.join(root,"runtime","js","classes","registry.js");
const runtimePath=path.join(root,"runtime","js","classes","runtime.js");
const actionsPath=path.join(root,"runtime","js","classes","actions.js");
const monoPath=path.join(root,"runtime","js","dicebound.js");
const runInitPath=path.join(root,"runtime","js","run","player-initialization.js");
const manifestPath=path.join(root,"runtime","js","module-manifest.json");
const indexPath=path.join(root,"runtime","index.html");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON});
vm.runInContext(fs.readFileSync(registryPath,"utf8"),context,{filename:registryPath});
vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});
vm.runInContext(fs.readFileSync(actionsPath,"utf8"),context,{filename:actionsPath});

const classes=context.window.DiceboundClasses;
assert.ok(classes,"DiceboundClasses facade missing");
assert.equal(classes.apiVersion,2,"registry compatibility apiVersion drifted");
assert.equal(classes.owner,"classes/facade");
assert.equal(context.window.DiceboundClassRuntime,undefined,"focused Classes runtime leaked as a peer public global");
assert.equal(context.window.DiceboundClassActions,undefined,"focused Classes action mechanics leaked as a peer public global");
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

const actionTrace=[];
const actionCallbacks={};
for(const name of ["basicAttack","manaAttack","bloodmageAttack","guard","bloodmageGuard","potion","ultimate","manaSpecial","bloodmageSpecial","rogueSpecial","clericSpecial","beastmasterSpecial","alchemistSpecial"]){
  actionCallbacks[name]=()=>{actionTrace.push(name);return name;};
}
classes.configureActions(actionCallbacks);
function routed(classId,kind){player={classId};actionTrace.length=0;const result=classes.performAction(kind);return {result,trace:[...actionTrace]};}
assert.deepEqual(routed("ranger","attack"),{result:"basicAttack",trace:["basicAttack"]});
assert.deepEqual(routed("sorcerer","attack"),{result:"manaAttack",trace:["manaAttack"]});
assert.deepEqual(routed("bloodmage","attack"),{result:"bloodmageAttack",trace:["bloodmageAttack"]});
assert.deepEqual(routed("ranger","guard"),{result:"guard",trace:["guard"]});
assert.deepEqual(routed("bloodmage","guard"),{result:"bloodmageGuard",trace:["bloodmageGuard"]});
assert.deepEqual(routed("ranger","potion"),{result:"potion",trace:["potion"]});
assert.deepEqual(routed("ranger","ultimate"),{result:"ultimate",trace:["ultimate"]});
assert.deepEqual(routed("sorcerer","special"),{result:"manaSpecial",trace:["manaSpecial"]});
assert.deepEqual(routed("bloodmage","special"),{result:"bloodmageSpecial",trace:["bloodmageSpecial"]});
assert.deepEqual(routed("rogue","special"),{result:"rogueSpecial",trace:["rogueSpecial"]});
assert.deepEqual(routed("cleric","special"),{result:"clericSpecial",trace:["clericSpecial"]});
assert.deepEqual(routed("beastmaster","special"),{result:"beastmasterSpecial",trace:["beastmasterSpecial"]});
assert.deepEqual(routed("alchemist","special"),{result:"alchemistSpecial",trace:["alchemistSpecial"]});
assert.deepEqual(routed("ranger","special"),{result:undefined,trace:[]});
assert.throws(()=>classes.performAction("bogus"),/Unknown Classes combat action/);

const monolith=fs.readFileSync(monoPath,"utf8"),runInit=fs.readFileSync(runInitPath,"utf8");
assert.doesNotMatch(monolith,/const\s+SlimeRougeRuntime\s*=/,"monolith still allocates a raw Slime Rouge runtime alias");
assert.doesNotMatch(monolith,/SlimeRougeRuntime\.(?:pendingIdentity|pendingUltimate|forcedIdentity|forcedUltimate)\s*=/,"monolith still mutates raw Slime Rouge runtime state");
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
assert.match(monolith,/dbClasses\.configureActions\(\{/,'monolith does not compose Classes action routing');
assert.match(monolith,/replaceCombatButton\("attackBtn",\(\)=>dbClasses\.performAction\("attack"\)\)/);
assert.match(monolith,/replaceCombatButton\("guardBtn",\(\)=>dbClasses\.performAction\("guard"\)\)/);
assert.match(monolith,/replaceCombatButton\("potionBtn",\(\)=>dbClasses\.performAction\("potion"\)\)/);
assert.match(monolith,/replaceCombatButton\("ultimateBtn",\(\)=>dbClasses\.performAction\("ultimate"\)\)/);
assert.match(monolith,/specialAttackBtn\.addEventListener\("click",\(\)=>dbClasses\.performAction\("special"\)\)/);
assert.doesNotMatch(monolith,/replaceCombatButton\("attackBtn",\(\)=>\{if\(classIdentityActive\("bloodmage"\)\)/,'historical Attack class-routing branch still lives in monolith');
assert.doesNotMatch(monolith,/specialAttackBtn\.addEventListener\("click",\(\)=>\{if\(classHasMechanic\("mana"\)\)/,'historical Special class-routing branch still lives in monolith');
assert.match(monolith,/dbClasses\.configureActionMechanics\(\{/,'monolith does not configure the Classes action-mechanics owner');
assert.doesNotMatch(monolith,/async function bloodmageBloodletting\(/,'Bloodmage Bloodletting still lives in monolith');
assert.doesNotMatch(monolith,/async function clericConsecration\(/,'Cleric Consecration still lives in monolith');
assert.doesNotMatch(monolith,/function cycleBeastStance\(/,'Beastmaster stance mechanics still live in monolith');
assert.match(monolith,/bloodmageAttack:\(\)=>dbClasses\.bloodmageBloodletting\(\)/);
assert.match(monolith,/clericSpecial:\(\)=>dbClasses\.clericConsecration\(\)/);
assert.match(monolith,/beastmasterSpecial:\(\)=>dbClasses\.cycleBeastStance\(\)/);
assert.match(monolith,/bloodmageGuard:\(\)=>dbClasses\.bloodmageReplenish\(\)/);
assert.match(monolith,/bloodmageSpecial:\(\)=>dbClasses\.bloodmageExsanguinate\(\)/);
assert.match(monolith,/rogueSpecial:\(\)=>dbClasses\.rogueSteal\(\)/);
assert.match(monolith,/alchemistSpecial:\(\)=>dbClasses\.alchemistVolatileFlask\(\)/);
assert.doesNotMatch(monolith,/async function rogueSteal\(/,'Rogue Steal still lives in monolith');
assert.doesNotMatch(monolith,/rogueSteal=async function/,'Rogue Steal override still lives in monolith');
assert.doesNotMatch(monolith,/bloodmageReplenish=async function|async function bloodmageReplenish\(/,'Bloodmage Replenish still lives in monolith');
assert.doesNotMatch(monolith,/bloodmageExsanguinate=async function|async function bloodmageExsanguinate\(/,'Bloodmage Exsanguinate still lives in monolith');
assert.doesNotMatch(monolith,/db060BloodmageBase/,'Blood Price base-capture shadow still lives in monolith');
assert.doesNotMatch(monolith,/alchemistVolatileFlaskV16/,'Alchemist Volatile Flask still lives in monolith');
assert.doesNotMatch(monolith,/beta021RoguePowerStealChance/,'Rogue power-steal helper still lives in monolith');

const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const runtimeModule=manifest.modules.find(entry=>entry.id==="classes-runtime"),actionsModule=manifest.modules.find(entry=>entry.id==="classes-actions");
assert.ok(runtimeModule,"classes-runtime manifest owner missing");assert.equal(runtimeModule.path,"js/classes/runtime.js");assert.deepEqual(runtimeModule.requires,["classes-registry"]);assert.deepEqual(runtimeModule.provides,[],"focused Classes runtime should not publish a peer public facade");
assert.ok(actionsModule,"classes-actions manifest owner missing");assert.equal(actionsModule.path,"js/classes/actions.js");assert.deepEqual(actionsModule.requires,["classes-registry","classes-runtime"]);assert.deepEqual(actionsModule.provides,[],"focused Classes actions should not publish a peer public facade");
const order=manifest.loadOrder;assert.equal(order[order.indexOf("classes-registry")+1],"classes-runtime","Classes runtime must load immediately after registry facade");assert.equal(order[order.indexOf("classes-runtime")+1],"classes-actions","Classes actions must load immediately after runtime owner");
const scripts=[...fs.readFileSync(indexPath,"utf8").matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match=>match[1]);assert.ok(scripts.indexOf("js/classes/registry.js")<scripts.indexOf("js/classes/runtime.js"));assert.ok(scripts.indexOf("js/classes/runtime.js")<scripts.indexOf("js/classes/actions.js"));assert.ok(scripts.indexOf("js/classes/actions.js")<scripts.indexOf("js/dicebound.js"));

console.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle, routing and bespoke action mechanics are owned behind DiceboundClasses");
