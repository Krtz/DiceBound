"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON,Math,Number});
for(const rel of ["runtime/js/classes/registry.js","runtime/js/classes/runtime.js","runtime/js/classes/hooks.js"]){
  const file=path.join(root,rel);vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const classes=context.window.DiceboundClasses;
assert.ok(classes,"DiceboundClasses missing");
assert.equal(context.window.DiceboundClassHooks,undefined,"focused hooks leaked as peer public global");
let player={classId:"ranger"},effects=new Set(),berserkerCalls=[];
classes.configureRuntimeHooks({
  getPlayer:()=>player,
  isClassActive:id=>player.classId===id,
  clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
  scaleBerserkerRageDamage:(amount,p)=>{berserkerCalls.push({amount,hp:p.hp,maxHp:p.maxHp});return amount*1.75;},
  hasEffect:id=>effects.has(id)
});

assert.equal(classes.legacyMonkDodge(.2),.2);
player={classId:"monk",monkCombo:3};
assert.ok(Math.abs(classes.legacyMonkDodge(.2)-.36)<1e-12);
assert.ok(Math.abs(classes.identityDodgeAdjustments(.36)-.414)<1e-12);
player={classId:"clown",clownGimmick:"Big Shoes"};
assert.ok(Math.abs(classes.identityDodgeAdjustments(.2)-.32)<1e-12);

player={classId:"berserker",hp:25,maxHp:100};berserkerCalls=[];
assert.equal(classes.berserkerDamage(40),70);assert.equal(berserkerCalls.length,1);assert.equal(berserkerCalls[0].amount,40);
player={classId:"ranger",hp:25,maxHp:100};assert.equal(classes.berserkerDamage(40),40);

player={classId:"ninja",_ninjaExecution:true};let adjusted=classes.ninjaExecutionDamage(100,false);
assert.equal(adjusted.amount,165);assert.equal(adjusted.ignoreDefense,true);
player._ninjaExecution=false;adjusted=classes.ninjaExecutionDamage(100,false);assert.equal(adjusted.amount,100);assert.equal(adjusted.ignoreDefense,false);

player={classId:"ouroboros",attack:37,doubleStrike:1.20,gold:0,goldAttackScale:0};effects.clear();
assert.equal(classes.syncOuroborosAttack(),true);assert.equal(player.attack,10);assert.ok(Math.abs(player.doubleStrike-3.90)<1e-12);
player={classId:"ouroboros",attack:37,doubleStrike:1.20,gold:0,goldAttackScale:0};effects=new Set(["perfect_specimen"]);
classes.syncOuroborosAttack();assert.equal(player.attack,30);assert.ok(Math.abs(player.doubleStrike-1.90)<1e-12);
player={classId:"ouroboros",attack:10,doubleStrike:1,gold:400,goldAttackScale:.0025,v27OuroGoldEchoScale:0,v27OuroGoldEchoApplied:0};effects.clear();
classes.syncOuroborosEconomy();assert.equal(player.goldAttackScale,0);assert.ok(Math.abs(player.v27OuroGoldEchoScale-.00025)<1e-12);assert.ok(Math.abs(player.v27OuroGoldEchoApplied-.1)<1e-12);assert.ok(Math.abs(player.doubleStrike-1.1)<1e-12);assert.equal(player.attack,10);
player={classId:"ranger",attack:37,doubleStrike:1.2,gold:400,goldAttackScale:.0025};assert.equal(classes.syncOuroborosEconomy(),false);assert.equal(player.goldAttackScale,.0025);assert.equal(player.attack,37);

const mono=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
assert.match(mono,/function effectiveDodgeChance\(\)\{const raw=rawDodgeChance\(\),base=raw\/\(1\+raw\);return dbClasses\.identityDodgeAdjustments\(dbClasses\.legacyMonkDodge\(base\)\);\}/);
assert.doesNotMatch(mono,/effectiveDodgeChanceV12/);
assert.doesNotMatch(mono,/effectiveDodgeChanceV13/);
assert.match(mono,/const adjusted=dbClasses\.ninjaExecutionDamage\(amount,ignoreDefense\);\s*amount=dbClasses\.berserkerDamage\(adjusted\.amount\);\s*ignoreDefense=adjusted\.ignoreDefense/,"damageEnemy must still compose Ninja execution then Berserker scaling before resolution");
assert.match(mono,/function v18SyncOuroborosAttack\(\)\{return dbClasses\.syncOuroborosAttack\(\);\}/);
assert.match(mono,/function v27SyncOuroborosEconomy\(\)\{return dbClasses\.syncOuroborosEconomy\(\);\}/);
assert.doesNotMatch(mono,/classIdentityActive\("monk"\)\?1-\(1-base\)\*\(1-base\):base/);
assert.doesNotMatch(mono,/player\.monkCombo\|\|0\)\*\.018/);
assert.doesNotMatch(mono,/player\.clownGimmick==="Big Shoes"/);
assert.doesNotMatch(mono,/scaleBerserkerRageDamage\(amount,player\)/);
assert.doesNotMatch(mono,/if\(player\._ninjaExecution\)\{amount\*=1\.65/);
assert.doesNotMatch(mono,/db060OuroSyncBase/);
assert.doesNotMatch(mono,/v27OuroGoldEchoScale=\(player\.v27OuroGoldEchoScale/);

const manifest=JSON.parse(fs.readFileSync(path.join(root,"runtime/js/module-manifest.json"),"utf8"));
const hook=manifest.modules.find(entry=>entry.id==="classes-hooks");assert.ok(hook);assert.equal(hook.path,"js/classes/hooks.js");assert.deepEqual(hook.provides,[]);
assert.equal(manifest.loadOrder[manifest.loadOrder.indexOf("classes-actions")+1],"classes-hooks");
assert.equal(manifest.loadOrder[manifest.loadOrder.indexOf("classes-hooks")+1],"classes-invoker");
console.log("Classes runtime hooks PASS: Monk/Clown Dodge, Berserker, Ninja and Ouroboros policy are owned behind DiceboundClasses");
