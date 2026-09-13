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
  "function v27CompletePrestigeNoChoice(total){return dbProgression.completePrestige(total);}"
])assert.ok(monolith.includes(adapter),`missing thin Progression adapter: ${adapter}`);
for(const shadow of [
  "const talentRank=id=>Math.max(0,Number(meta.purchased[id])||0);",
  "function gameplayTalentRank(id){const source=runTalentSnapshot||meta.purchased||{};",
  "meta.xp+=amount;\n    while(meta.xp>=meta.xpNext)",
  "const travelAward=Math.max(0,Math.round(tilesMovedThisRun*(1+player.legacyXpBonus)))",
  "function v27CompletePrestigeNoChoice(total){const rewards="
])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);
console.log("Progression owner PASS: Talent/Legacy/final Prestige semantics route through DiceboundProgression.");
