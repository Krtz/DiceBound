"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const rarityContext = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "items", "rarities.js"), "utf8"), rarityContext, { filename: "rarities.js" });
const rarities = rarityContext.window.DiceboundRarities;

for (const rarity of ["rare", "epic", "legendary", "mythical"]) assert.equal(rarities.isPowerupRarityAtLeast(rarity, "rare"), true, `${rarity} must be eligible for Rare+`);
for (const rarity of ["common", "uncommon", "artifact", "omega", "missing"]) assert.equal(rarities.isPowerupRarityAtLeast(rarity, "rare"), false, `${rarity} must not be eligible for Rare+`);
assert.equal(rarities.isPowerupRarityAtLeast("epic", "epic"), true);
assert.equal(rarities.isPowerupRarityAtLeast("rare", "epic"), false);

const monolith = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");
const equipment = fs.readFileSync(path.join(root, "runtime", "js", "items", "equipment.js"), "utf8");
assert.match(monolith, /name:"Unbound Impossible Relic",desc:"Reveal one Rare\+ powerup\."/);
assert.match(monolith, /DB_RARITIES\.isPowerupRarityAtLeast\(u\.rarity,"rare"\)/, "Unbound Impossible Relic must use the rarity policy owner");
assert.doesNotMatch(monolith, /Prefix: \$\{item\.prefix\}/, "player-facing gear details still print a standalone Prefix line");
assert.doesNotMatch(monolith, /Suffix: \$\{item\.suffix\}/, "player-facing gear details still print a standalone Suffix line");
assert.match(equipment, /prefix:/, "equipment must retain semantic prefix data");
assert.match(equipment, /suffix:/, "equipment must retain semantic suffix data");
assert.match(equipment, /item\.name=`\$\{item\.prefix/, "equipment must retain the affixed display name");
assert.match(monolith, /db0648ReconcileDefeatedTarget\(selectedBeforeTick,"poison"\)/, "Poison must reconcile through the targeting owner");
assert.match(monolith, /passivePoisonDeath:db06420PassivePoisonTargetExercise/, "Poison target reconciliation needs a browser/native regression fixture");

console.log("Playtest follow-ups PASS: rarity policy, affix presentation, and passive-target reconciliation ownership");
