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
assert.match(lifecycle,/owner:OWNER,apiVersion:2/);
assert.ok(entry.requires.includes('progression-echo-crucible'),'Progression facade must declare the Echo Crucible domain dependency');

// These used to be one-line compatibility adapters in dicebound.js.  The
// composition root now calls DiceboundProgression directly where a caller
// exists; unused adapters are simply gone.
const retiredForwarders=[
  "achievementGateUnlocked","allocatedTalentPoints","checkDynamicClassUnlocks",
  "commitClassUnlock","finalizeRun","gameplayTalentRank","isClassUnlocked",
  "purchaseTalentNode","repairTalentPrerequisites","unlockClass"
];
for(const name of retiredForwarders){
  assert.ok(!new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(monolith),`retired Progression forwarding adapter returned: ${name}`);
}
for(const direct of [
  "dbProgression.achievementGateUnlocked(",
  "dbProgression.allocatedTalentPoints(",
  "dbProgression.checkDynamicClassUnlocks(",
  "dbProgression.finalizeRun(",
  "dbProgression.gameplayTalentRank(",
  "dbProgression.isClassUnlocked(",
  "dbProgression.purchaseTalent(",
  "dbProgression.repairTalentPrerequisites(",
  "dbProgression.unlockClass("
])assert.ok(monolith.includes(direct),`composition no longer routes directly through Progression owner: ${direct}`);

// commitClassUnlock's old composition adapter had no callers at all.  The
// capability remains owned by Progression, but a dead root-level alias must not
// be recreated just to make an architecture test happy.
assert.ok(lifecycle.includes("commitClassUnlock"),"Progression commitClassUnlock capability missing");

// These two remain first-class seams because the released runtime passes them
// around as values/hooks.  They may be thin, but deleting them would erase an
// intentional interception surface rather than a redundant call-only wrapper.
for(const seam of [
  "function grantLegacyXp(amount){return dbProgression.grantLegacyXp(amount);}",
  "function talentAvailable(t){return dbProgression.talentAvailable(t);}"
])assert.ok(monolith.includes(seam),`required Progression hook/value seam missing: ${seam}`);

// Small composition helpers that own UI interaction rather than call-only
// forwarding remain legitimate.  Their semantic work must still terminate in
// DiceboundProgression.
for(const adapter of [
  "const talentRank=id=>dbProgression.talentRank(id);",
  "purchase:id=>dbProgression.purchaseTalent(id),",
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
  "if(id===\"bloodmage\"){meta.bloodmageUnlocked=true",
  "function defaultLifetimeStats(){",
  "function ensureAlphaMeta(){",
  "function boardClearMode(){",
  "function boardClearKey(",
  "function hasBoardClear(",
  "function recordBoardClear("
])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);

for(const owned of [
  "prestigeInspect","prestigePurchase","prestigeRefundAll","prestigeFormatStats",
  "crucibleNormalize","crucibleBuilt","crucibleInspect","crucibleWarning","crucibleRunEffectId","crucibleView","crucibleSacrificePreview","crucibleSacrifice","crucibleSelect",
  "achievementDone","achievementConditionText","achievementRewardText","achievementGateUnlocked",
  "heroMasteryEntries","achievementCount","isClassUnlocked","commitClassUnlock","unlockClass",
  "checkDynamicClassUnlocks","repairTalentPrerequisites","gameplayTalentRank","allocatedTalentPoints",
  "heirloomLoadoutCapacity","heirloomStorageUnlocked","heirloomStorageCapacity","heirloomStorageMilestones",
  "careerStats","runHistory","recordRunStarted","recordBoardClear","hasBoardClear","recordDamageDealt","recordHealing","recordDamageTaken","recordGoldEarned","recordGoldSpent","recordPotionUse","recordPowerupTaken","recordElementProc","recordStrike","recordEnemyDefeats","recordVitals"
])assert.ok(lifecycle.includes(owned),`Progression owner capability missing: ${owned}`);

assert.ok(monolith.includes("function prestigeSummary(){return dbProgression.prestigeInspect().permanentSummary;}"),"Prestige summary must route through DiceboundProgression");
assert.ok(monolith.includes("const result=dbProgression.prestigePurchase(id);"),"Prestige Moon purchases must route through DiceboundProgression");
assert.ok(monolith.includes("const result=dbProgression.prestigeRefundAll();"),"Prestige Moon refunds must route through DiceboundProgression");
assert.ok(monolith.includes("dbProgression.crucibleView({classId:selectedClassId})"),"Moon Crucible state must route through DiceboundProgression");
assert.ok(monolith.includes("const result=dbProgression.crucibleSacrifice(itemId);"),"Crucible sacrifice must route through DiceboundProgression");
assert.ok(monolith.includes("const result=dbProgression.crucibleSelect(effectId||null);"),"Crucible selection must route through DiceboundProgression");
for(const shadow of ["DB_PRESTIGE.purchase(meta.prestige,id,random)","DB_PRESTIGE.refundAll(meta.prestige)","DB_PRESTIGE.inspect(meta.prestige)","DB_ECHO_CRUCIBLE=window.DiceboundEchoCrucible","dbEchoCrucible.sacrifice(","dbEchoCrucible.select(","function db068CrucibleView("])assert.ok(!monolith.includes(shadow),`ordinary Prestige Moon shadow remains: ${shadow}`);
assert.ok(monolith.includes("isDone:achievement=>dbProgression.achievementDone(achievement)"),"Achievements UI must consume Progression completion policy");

const career=fs.readFileSync(path.join(root,"runtime/js/progression/career-history.js"),"utf8");
assert.match(career,/owner:OWNER,HISTORY_LIMIT/);
assert.match(career,/HISTORY_LIMIT=30/);
assert.ok(monolith.includes("dbProgression.recordEnemyDefeats("),"semantic combat defeats must route through Progression");
assert.ok(monolith.includes("dbProgression.recordRunStarted("),"run-start identity must route through Progression");
assert.ok(monolith.includes("dbProgression.finalizeRun({outcome:"),"terminal outcomes must route through Progression");

console.log("Progression owner PASS: Career telemetry/history and existing Progression semantics route through canonical owners with composition shadows drained.");
