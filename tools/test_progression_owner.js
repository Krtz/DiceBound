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

// These used to be one-line compatibility adapters in dicebound.js.  The
// composition root now calls DiceboundProgression directly; do not rebuild a
// forwarding layer merely to satisfy an architecture test.
const retiredForwarders=[
  "achievementGateUnlocked","allocatedTalentPoints","checkDynamicClassUnlocks",
  "commitClassUnlock","gameplayTalentRank","isClassUnlocked",
  "repairTalentPrerequisites","unlockClass"
];
for(const name of retiredForwarders){
  assert.ok(!new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(monolith),`retired Progression forwarding adapter returned: ${name}`);
}
for(const direct of [
  "dbProgression.achievementGateUnlocked(",
  "dbProgression.allocatedTalentPoints(",
  "dbProgression.checkDynamicClassUnlocks(",
  "dbProgression.commitClassUnlock(",
  "dbProgression.gameplayTalentRank(",
  "dbProgression.isClassUnlocked(",
  "dbProgression.repairTalentPrerequisites(",
  "dbProgression.unlockClass("
])assert.ok(monolith.includes(direct),`composition no longer routes directly through Progression owner: ${direct}`);

// These three remain first-class seams because the released runtime passes them
// around as values/hooks.  They may be thin, but deleting them would erase an
// intentional interception surface rather than a redundant call-only wrapper.
for(const seam of [
  "function grantLegacyXp(amount){return dbProgression.grantLegacyXp(amount);}",
  "function finalizeRun(){return dbProgression.finalizeRun();}",
  "function talentAvailable(t){return dbProgression.talentAvailable(t);}"
])assert.ok(monolith.includes(seam),`required Progression hook/value seam missing: ${seam}`);

// Small composition helpers that own UI interaction rather than call-only
// forwarding remain legitimate.  Their semantic work must still terminate in
// DiceboundProgression.
for(const adapter of [
  "const talentRank=id=>dbProgression.talentRank(id);",
  "function purchaseTalentNode(id){return dbProgression.purchaseTalent(id);}",
  "async function prestigeTree(){",
  "return dbProgression.completePrestige(total);"
])assert.ok(monolith.includes(adapter),`missing Progression composition helper: ${adapter}`);

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

for(const owned of [
  "prestigeInspect","prestigePurchase","prestigeRefundAll","prestigeFormatStats",
  "achievementDone","achievementConditionText","achievementRewardText","achievementGateUnlocked",
  "heroMasteryEntries","achievementCount","isClassUnlocked","commitClassUnlock","unlockClass",
  "checkDynamicClassUnlocks","repairTalentPrerequisites","gameplayTalentRank","allocatedTalentPoints"
])assert.ok(lifecycle.includes(owned),`Progression owner capability missing: ${owned}`);

assert.ok(monolith.includes("function prestigeSummary(){return dbProgression.prestigeInspect().permanentSummary;}"),"Prestige summary must route through DiceboundProgression");
assert.ok(monolith.includes("const result=dbProgression.prestigePurchase(id);"),"Prestige Moon purchases must route through DiceboundProgression");
assert.ok(monolith.includes("const result=dbProgression.prestigeRefundAll();"),"Prestige Moon refunds must route through DiceboundProgression");
for(const shadow of ["DB_PRESTIGE.purchase(meta.prestige,id,random)","DB_PRESTIGE.refundAll(meta.prestige)","DB_PRESTIGE.inspect(meta.prestige)"])assert.ok(!monolith.includes(shadow),`ordinary Prestige Moon shadow remains: ${shadow}`);
assert.ok(monolith.includes("isDone:achievement=>dbProgression.achievementDone(achievement)"),"Achievements UI must consume Progression completion policy");

console.log("Progression owner PASS: call-only compatibility adapters are retired; intentional hooks/UI helpers and all Progression semantics route through DiceboundProgression.");
