#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/progression/career-history.js"),"utf8");
const context={window:{},console};context.window.window=context.window;
vm.createContext(context);vm.runInContext(source,context,{filename:"career-history.js"});
const career=context.window.DiceboundCareerHistory;
assert.ok(career);assert.equal(career.owner,"progression/career-history");assert.equal(career.HISTORY_LIMIT,30);

const old={stats:{runsStarted:7,runsFinished:6,boardClears:{"ranger:normal:b3":2},classMaxLevel:{ranger:18}}};
career.ensure(old);
assert.equal(old.stats.runsStarted,7);
assert.equal(old.stats.largestHit,0);
assert.equal(old.stats.summonsCreated,0);
assert.equal(old.stats.summonDeaths,0);
assert.equal(old.stats.summonKills,0);
assert.equal(old.stats.highestSimultaneousSummons,0);
assert.deepEqual([...career.history(old)],[],"historical saves must not fabricate old run records");
assert.equal(old.career.nextRunId,1);

const legacy={runs:14,board6Clears:3,damageTaken:777,stats:{runsStarted:0,runsFinished:0,fullVictories:0,damageTaken:20}};
career.ensure(legacy);
assert.equal(legacy.stats.runsFinished,0,'ordinary Career reads must not reinterpret live legacy counters');
career.migrateLegacy(legacy);
assert.equal(legacy.stats.runsFinished,14,'load-boundary migration must preserve trustworthy completed-run count');
assert.equal(legacy.stats.runsStarted,14,'runs started must never fall below trustworthy completed-run history');
assert.equal(legacy.stats.fullVictories,3,'historical Board 6 clears are trustworthy full victories');
assert.equal(legacy.stats.damageTaken,777,'top-level historical damage taken must survive load normalization');
assert.deepEqual([...career.history(legacy)],[],'migration must not fabricate individual run records');

const meta={};
const first=career.beginRun(meta,{classId:"ranger",mode:"nightmare",petId:"fire",version:"0.6.7.16"});
assert.equal(first.id,"run-000001");
assert.equal(meta.stats.runsStarted,1);
assert.equal(meta.stats.classRuns.ranger,1);
assert.equal(career.inspect(meta).activeRunId,"run-000001");

career.recordDamage(meta,42);
career.recordDamage(meta,17);
assert.equal(meta.stats.damageDealt,59);
assert.equal(meta.stats.largestHit,42);
career.recordDamageTaken(meta,9);career.recordHealing(meta,7);
career.recordGoldEarned(meta,100);career.recordGoldSpent(meta,35);
career.recordPotion(meta);career.recordPowerup(meta);career.recordElementProc(meta,2);
career.recordStrike(meta,{critTiers:2,echo:false});
career.recordStrike(meta,{critTiers:0,echo:true});
assert.equal(meta.stats.damageTaken,9);
assert.equal(meta.stats.healingDone,7);
assert.equal(meta.stats.goldEarned,100);
assert.equal(meta.stats.goldSpent,35);
assert.equal(meta.stats.potionsUsed,1);
assert.equal(meta.stats.powerupsTaken,1);
assert.equal(meta.stats.elementalProcs,2);
assert.equal(meta.stats.criticalStrikes,1);
assert.equal(meta.stats.echoStrikes,1);

career.recordSummonCreated(meta,{livingCount:1});
career.recordSummonCreated(meta,{livingCount:2});
career.recordSummonDeath(meta,1);
career.recordSummonKill(meta,3);
career.recordSummonReplacement(meta,2);
career.recordSummonDamageDealt(meta,123);
career.recordSummonDamageTaken(meta,45);
career.recordSummonHealing(meta,17);
career.recordHighestSimultaneousSummons(meta,2);
assert.equal(meta.stats.summonsCreated,2);
assert.equal(meta.stats.summonDeaths,1);
assert.equal(meta.stats.summonKills,3);
assert.equal(meta.stats.summonReplacements,2);
assert.equal(meta.stats.summonDamageDealt,123);
assert.equal(meta.stats.summonDamageTaken,45);
assert.equal(meta.stats.summonHealingReceived,17);
assert.equal(meta.stats.highestSimultaneousSummons,2);

career.recordEnemyDefeats(meta,[
  {id:"demon",name:"Demon of Fire"},
  {id:"demon",name:"Demon the Completely Different Epithet"},
  {id:"pale-devil",name:"The Pale Devil"}
],{boss:true,miniboss:false});
assert.equal(meta.stats.enemiesDefeated,3);
assert.equal(meta.stats.bossesDefeated,1);
assert.deepEqual({...meta.stats.enemyDefeats},{demon:2,"pale-devil":1},"generated names must never fragment the semantic defeat ledger");

career.recordBoardClear(meta,{classId:"ranger",board:4,mode:"nightmare"});
career.recordBoardClear(meta,{classId:"ranger",board:2,mode:"normal"});
assert.equal(career.hasBoardClear(meta,"ranger",4),true);
assert.equal(career.hasBoardClear(meta,"ranger",5),false);

const record=career.finalizeRun(meta,{
  outcome:"death",boardReached:4,position:29,level:17,gold:321,rolls:44,tilesMoved:93,legacyXp:888,
  prestigeCount:12,legacyLevel:33,
  equipment:[{slot:"weapon",id:"sword-x",name:"Sword X",rarity:"legendary",element:"fire",transient:{huge:true}}],
  powerups:[{id:"loaded_fate",count:2,rawRuntimeObject:{bad:true}}],
  finalStats:{maxHp:100,hp:0,attack:88,defense:20,crit:.5,dodge:.1,lifeSteal:.2,luck:.3,echo:.4,bossDamage:.5,garbage:"no"}
});
assert.equal(record.id,"run-000001");
assert.equal(record.outcome,"death");
assert.equal(meta.stats.runsFinished,1);
assert.equal(meta.stats.deaths,1);
assert.equal(meta.stats.fullVictories,0);
assert.equal(meta.stats.rolls,44);
assert.equal(meta.stats.tilesTraveled,93);
assert.equal(meta.stats.classMaxLevel.ranger,17);
assert.equal(career.inspect(meta).activeRunId,null);
assert.equal(meta.career.history.length,1);
assert.deepEqual(Object.keys(meta.career.history[0].equipment[0]).sort(),["element","id","name","rarity","slot"]);
assert.deepEqual(Object.keys(meta.career.history[0].powerups[0]).sort(),["count","id"]);
assert.equal("garbage" in meta.career.history[0].finalStats,false);

// Replaying terminal settlement without a live active identity must never
// duplicate the already-committed record. Progression's runFinalized guard is
// the first line of defense; the domain also dedupes by active run identity.
meta.career.activeRun={...first};
career.finalizeRun(meta,{outcome:"death",boardReached:4});
assert.equal(meta.career.history.length,1,"same run identity must never duplicate history");

// New runs advance deterministically and outcomes remain distinct.
career.beginRun(meta,{classId:"sorcerer",mode:"hell",petId:"neutral",version:"0.6.7.16"});
career.finalizeRun(meta,{outcome:"victory",boardReached:6,level:22,rolls:10,tilesMoved:20});
career.beginRun(meta,{classId:"fighter",mode:"normal",petId:"ice",version:"0.6.7.16"});
career.finalizeRun(meta,{outcome:"abandoned",boardReached:2,level:4,rolls:4,tilesMoved:9});
assert.equal(meta.stats.fullVictories,1);
assert.equal(meta.stats.abandonedRuns,1);
assert.equal(meta.stats.classRuns.sorcerer,1);
assert.equal(meta.stats.classRuns.fighter,1);

// Retention is an exact newest-30 bound.
for(let i=0;i<35;i++){
  career.beginRun(meta,{classId:"ranger",mode:"normal",version:"0.6.7.16"});
  career.finalizeRun(meta,{outcome:"ended",boardReached:1,level:1,rolls:1,tilesMoved:1});
}
assert.equal(meta.career.history.length,30);
assert.equal(meta.career.history[0].sequence,38);
assert.equal(meta.career.history[29].sequence,9);
assert.ok(meta.career.history.every(entry=>entry.id&&entry.classId&&entry.mode));

console.log("Career history PASS: truthful normalization, semantic defeats, resolved telemetry, exactly-once settlement and bounded 30-run retention");
