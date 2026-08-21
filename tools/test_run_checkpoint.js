"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const values=new Map(),runtime=path.join(__dirname,"..","runtime","js"),window={};
window.window=window;
window.DiceboundVersion=Object.freeze({version:"0.6.3.0",channel:"Beta"});
window.DiceboundPlatform=Object.freeze({nowIso:()=>"2026-08-20T00:00:00.000Z"});
window.DiceboundStorage=Object.freeze({
  getString:key=>values.get(String(key))??null,
  setString:(key,value)=>{values.set(String(key),String(value));return true;},
  remove:key=>values.delete(String(key)),
  has:key=>values.has(String(key)),
  diagnostics:()=>({backend:"test"}),
});
const context=vm.createContext({window,console,Date,Math,btoa:value=>Buffer.from(value,"binary").toString("base64"),atob:value=>Buffer.from(value,"base64").toString("binary"),escape,unescape,encodeURIComponent,decodeURIComponent});
const run=name=>vm.runInContext(fs.readFileSync(path.join(runtime,name),"utf8"),context,{filename:name});
run("rng.js");run("save-system.js");run(path.join("core","run-checkpoint.js"));

const save=window.DiceboundSave,checkpoints=window.DiceboundRunCheckpoint,rng=window.DiceboundRng;
assert.equal(save.apiVersion,2);assert.equal(checkpoints.apiVersion,1);assert.ok(Object.isFrozen(checkpoints));
assert.equal(checkpoints.uiFix,"browser-camp-resume-v2");
save.saveMeta({level:7,settings:{masterVolume:.4}});
const careerBefore=values.get(save.primaryKey);

function createRun(label,gold){
  const input={
    summary:{className:"Ranger",board:2,tile:14,level:7,gold,difficulty:"Nightmare"},
    meta:{level:7,points:2,settings:{masterVolume:.4}},
    run:{player:{classId:"ranger",position:13,gold,equipment:{weapon:{id:"bow"}},upgradeCounts:{fortune_gold:2}},tiles:[{type:"start",cleared:true},{type:"empty",cleared:true}],boardLevel:2},
  };
  vm.runInContext(`window.__testInput=JSON.parse(${JSON.stringify(JSON.stringify(input))})`,context);
  return vm.runInContext("window.DiceboundRunCheckpoint.create(window.__testInput)",context);
}

rng.seed("resume-seed");rng.random();rng.random();
const first=createRun("first",123),rngAtFirst=JSON.parse(JSON.stringify(first.rng));
checkpoints.store(first);
assert.equal(checkpoints.has(),true);assert.equal(checkpoints.diagnostics().valid,true);
assert.equal(checkpoints.load().checkpoint.run.player.gold,123);

const expected=[rng.random(),rng.random(),rng.random()];
rng.restore(rngAtFirst);
assert.deepEqual([rng.random(),rng.random(),rng.random()],expected,"restored RNG did not continue at the checkpoint cursor");

rng.seed("second-seed");const second=createRun("second",456);checkpoints.store(second);
assert.equal(checkpoints.load().checkpoint.run.player.gold,456);
values.set(save.runPrimaryKey,"{broken json");
const recovered=checkpoints.load();
assert.equal(recovered.recovered,true);assert.equal(recovered.source,"backup-1");assert.equal(recovered.checkpoint.run.player.gold,123);
assert.match(recovered.error,/JSON|position|property|Expected/i);
assert.equal(JSON.parse(values.get(save.runPrimaryKey)).payload.checkpoint.run.player.gold,123,"recovered backup was not restored to primary");

const isolated=checkpoints.load().checkpoint;isolated.run.player.gold=9999;
assert.equal(checkpoints.load().checkpoint.run.player.gold,123,"loaded checkpoints alias persistent data");
assert.throws(()=>vm.runInContext("window.DiceboundRunCheckpoint.create({summary:{},meta:{},run:{player:{bad:()=>1},tiles:[{}]}})",context),/unsupported function data/);
assert.throws(()=>vm.runInContext("window.DiceboundRunCheckpoint.validate({checkpointVersion:99,gameVersion:'0.6.3.0',meta:{},run:{player:{},tiles:[{}]},rng:{mode:'seeded'}})",context),/unsupported/);

// A stale/corrupt browser key is raw stored data, not a resumable expedition.
// The camp must therefore stay in its normal start state instead of showing the
// unreadable-run takeover panel that previously displaced the camp layout.
checkpoints.clear();
values.set(save.runPrimaryKey,"{broken json");
assert.equal(save.hasRunCheckpoint(),true,"fixture should contain raw active-run bytes");
assert.equal(checkpoints.has(),false,"unreadable active-run bytes must not count as a resumable expedition");
const unreadable=checkpoints.diagnostics();
assert.equal(unreadable.present,true);assert.equal(unreadable.resumable,false);assert.equal(unreadable.valid,false);
assert.match(unreadable.error,/JSON|position|property|Expected/i);

checkpoints.clear();
assert.equal(checkpoints.has(),false);assert.equal(values.get(save.primaryKey),careerBefore,"clearing an active run changed the career save");
checkpoints.store(first);save.reset();
assert.equal(save.hasSave(),false);assert.equal(checkpoints.has(),false,"full reset left an active-run checkpoint behind");

const checkpointSource=fs.readFileSync(path.join(runtime,"core","run-checkpoint.js"),"utf8");
assert.match(checkpointSource,/position:absolute!important/,"resume panel must be removed from camp grid flow");
assert.match(checkpointSource,/save\.hasRunCheckpoint\(\).*save\.clearRunCheckpoint\(\)/s,"unrecoverable run bytes must be discarded without touching career save");

const monolith=fs.readFileSync(path.join(runtime,"dicebound.js"),"utf8");
assert.match(monolith,/function dbRunIsStable\(\).*gameStarted.*!rollLocked.*!combatBusy.*!currentEnemy.*pendingLevelUps===0/s);
assert.match(monolith,/meta=normalizeMetaCore\(checkpoint\.meta\)/);
assert.match(monolith,/window\.DiceboundRng\.restore\(checkpoint\.rng\)/);
assert.match(monolith,/Object\.keys\(player\).*Object\.assign\(player/s);
assert.match(monolith,/Starting a new expedition will abandon the saved run/);
assert.match(monolith,/Continue Run/);
assert.match(monolith,/const dbRunShowEndBase=showEnd;showEnd=function/);
assert.match(monolith,/const dbRunCompletePrestigeBase=completePrestige;completePrestige=function/);
assert.doesNotMatch(monolith,/\bpetAttack\b/);
assert.match(monolith,/const db060PetTurnBase=petTurn;\s*petTurn=async function/);
const native=fs.readFileSync(path.join(__dirname,"..","wrapper-source","wrappers","webview2","native-go","main.go"),"utf8");
for(const key of ["dicebound.run.primary","dicebound.run.backup","dicebound.run.backup.2","dicebound.run.backup.3"]){assert.ok(native.includes(`\"${key}\"`),`native storage does not enumerate ${key}`);}

console.log("Active-run checkpoints pass: isolated schema/backups, corrupt-primary recovery, unreadable-key guard, out-of-flow camp resume UI, RNG continuation, clone safety, career isolation and runtime composition guards");
