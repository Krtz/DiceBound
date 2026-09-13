#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const lifecycle=fs.readFileSync(path.join(root,"runtime/js/progression/lifecycle.js"),"utf8");
const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"runtime/js/module-manifest.json"),"utf8"));
const entry=manifest.modules.find(module=>module.id==="progression-lifecycle");
assert.ok(entry,"progression-lifecycle manifest owner is missing");
assert.deepEqual(entry.provides,["DiceboundProgression"]);
assert.match(lifecycle,/owner:OWNER,apiVersion:1/);
for(const adapter of [
  "const talentRank=id=>dbProgression.talentRank(id);",
  "function gameplayTalentRank(id){return dbProgression.gameplayTalentRank(id);}",
  "function grantLegacyXp(amount){return dbProgression.grantLegacyXp(amount);}",
  "function finalizeRun(){return dbProgression.finalizeRun();}",
  "function allocatedTalentPoints(){return dbProgression.allocatedTalentPoints();}",
  "function talentAvailable(t){return dbProgression.talentAvailable(t);}",
  "function purchaseTalentNode(id){return dbProgression.purchaseTalent(id);}",
  "async function prestigeTree(){",
  "return dbProgression.completePrestige(total);"
])assert.ok(monolith.includes(adapter),`missing thin Progression adapter: ${adapter}`);
for(const shadow of [
  "const talentRank=id=>Math.max(0,Number(meta.purchased[id])||0);",
  "function gameplayTalentRank(id){const source=runTalentSnapshot||meta.purchased||{};",
  "meta.xp+=amount;\n    while(meta.xp>=meta.xpNext)",
  "const travelAward=Math.max(0,Math.round(tilesMovedThisRun*(1+player.legacyXpBonus)))",
  "function v27CompletePrestigeNoChoice(total){const rewards=",
  "function openPrestigeHeirloomChoice(data)",
  "function completePrestige(data",
  "completePrestige=function",
  "completePrestigeV24Base",
  "dbRunCompletePrestigeBase",
  "v19PrestigeKeepCapacity",
  "pendingPrestige",
  "prestigeCandidateItems",
  "v27CompletePrestigeNoChoice",
  "function db317AchievementDone(a)",
  "function db317AchievementConditionText(a)",
  "function db317AchievementRewardText(a)",
  "const gateV15=achievementGateUnlocked",
  "achievementGateUnlockedV19Base",
  "db0512AchievementGateBase",
  "db0512AchievementRewardBase",
  "function db064HeroMasteryEntries(classId)",
  "DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,dbClassUnlockContext())",
  "DB_CLASS_UNLOCK_RULES.recordObservedProgress(dbClassUnlockContext())",
  "DB_CLASS_UNLOCK_RULES.resolveDynamic({getContext:()=>dbClassUnlockContext()",
  "function baseClassUnlocked(id){return DB_CLASS_UNLOCK_RULES",
  "if(id===\"bloodmage\"){meta.bloodmageUnlocked=true"
])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);
for(const owned of ["achievementDone","achievementConditionText","achievementRewardText","achievementGateUnlocked","heroMasteryEntries","achievementCount","isClassUnlocked","commitClassUnlock","unlockClass","checkDynamicClassUnlocks"])assert.ok(lifecycle.includes(owned),`Progression owner capability missing: ${owned}`);
assert.ok(monolith.includes("function achievementGateUnlocked(gate){return dbProgression.achievementGateUnlocked(gate);}"),"ordinary powerup gates must route through DiceboundProgression");
assert.ok(monolith.includes("isDone:achievement=>dbProgression.achievementDone(achievement)"),"Achievements UI must consume Progression completion policy");
assert.ok(monolith.includes("function isClassUnlocked(id){return dbProgression.isClassUnlocked(id);}"),"ordinary class eligibility must route through DiceboundProgression");
assert.ok(monolith.includes("function unlockClass(id){return dbProgression.unlockClass(id);}"),"ordinary class unlock commits must route through DiceboundProgression");
assert.ok(monolith.includes("function checkDynamicClassUnlocks(){return dbProgression.checkDynamicClassUnlocks();}"),"dynamic class scans must route through DiceboundProgression");
console.log("Progression owner PASS: Talent/Legacy/Prestige/Achievement/class-unlock orchestration routes through DiceboundProgression.");
