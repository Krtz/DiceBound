"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "runtime", "js", "progression", "talents.js");
const source = fs.readFileSync(sourcePath, "utf8");
const context = vm.createContext({ window: {} });
vm.runInContext(source, context, { filename: sourcePath });

const talents = context.window.DiceboundTalents;
assert.ok(talents, "talent module did not publish window.DiceboundTalents");
assert.equal(talents.apiVersion, 1);
assert.ok(Object.isFrozen(talents), "public talent API is mutable");
assert.ok(Object.isFrozen(talents.ids), "public talent id list is mutable");

const expectedIds = [
  "roadborn", "survival_vitality", "survival_armor", "survival_recovery",
  "survival_dodge", "survival_prepared", "survival_alchemy", "survival_double_dose",
  "survival_revive", "power_attack", "power_boss", "power_lifesteal", "power_crit",
  "power_ultimate_start", "power_ultimate_flow", "power_echo", "power_apex",
  "fortune_gold", "fortune_discount", "fortune_luck", "fortune_cookie",
  "fortune_blessing", "fortune_omens", "fortune_impossible", "legacy_heirloom",
  "legacy_xp", "legacy_travel", "legacy_scholar", "companion_damage",
  "companion_double", "companion_bond", "companion_recovery", "companion_ascendant",
  "element_attunement", "element_power", "element_weakness", "element_echo",
  "element_conduit", "element_prismatic", "companion_element_proc",
  "fortune_powerup_rerolls", "monk_flow_ceiling", "turtle_guard_element",
  "fortune_extra_choice", "legacy_storage",
];
assert.deepEqual(Array.from(talents.ids), expectedIds);

const registry = talents.createRegistry();
assert.equal(registry.length, 45);
assert.deepEqual(Array.from(registry, (talent) => talent.id), expectedIds);
const serialized = JSON.stringify(registry);
assert.equal(Buffer.byteLength(serialized), 10269, "canonical talent registry byte snapshot drifted");
assert.equal(
  crypto.createHash("sha256").update(serialized).digest("hex"),
  "1776e21d156f68ec177a659c11bff09cd33bb0d9c54c59a70401cd69bfea0a0c",
  "canonical talent registry data drifted",
);

const byId = new Map();
for (const talent of registry) {
  assert.ok(talent.id && !byId.has(talent.id), `duplicate or empty talent id: ${talent.id}`);
  assert.ok(Number.isInteger(talent.cost) && talent.cost > 0, `${talent.id} has invalid cost`);
  assert.ok(Number.isInteger(talent.maxRank) && talent.maxRank > 0, `${talent.id} has invalid maxRank`);
  assert.equal(typeof talent.branch, "string", `${talent.id} has no branch`);
  assert.equal(typeof talent.desc, "string", `${talent.id} has no description`);
  assert.ok(Array.isArray(talent.requires), `${talent.id} prerequisites are not an array`);
  byId.set(talent.id, talent);
}
for (const talent of registry) {
  for (const requirement of talent.requires) {
    const prerequisite = byId.get(requirement.id);
    assert.ok(prerequisite, `${talent.id} requires missing talent ${requirement.id}`);
    assert.ok(Number.isInteger(requirement.rank) && requirement.rank > 0, `${talent.id} has invalid prerequisite rank`);
    assert.ok(requirement.rank <= prerequisite.maxRank, `${talent.id} requires an impossible ${requirement.id} rank`);
  }
}

const visiting = new Set();
const visited = new Set();
function visit(id) {
  if (visiting.has(id)) throw new Error(`talent prerequisite cycle at ${id}`);
  if (visited.has(id)) return;
  visiting.add(id);
  for (const requirement of byId.get(id).requires) visit(requirement.id);
  visiting.delete(id);
  visited.add(id);
}
for (const id of expectedIds) visit(id);
assert.equal(visited.size, expectedIds.length);

const second = talents.createRegistry();
registry[0].name = "mutated";
registry[1].requires[0].rank = 999;
assert.equal(second[0].name, "Roadborn", "talent clones share mutable definitions");
assert.equal(second[1].requires[0].rank, 1, "talent prerequisite arrays leaked between clones");
assert.equal(talents.createRegistry()[0].name, "Roadborn", "module source data was mutated");

const monolithPath = path.join(__dirname, "..", "runtime", "js", "dicebound.js");
const monolith = fs.readFileSync(monolithPath, "utf8");
assert.doesNotMatch(monolith, /const\s+DB317_TALENTS_RAW\s*=\s*\[/, "talent data is still owned by the monolith");
assert.match(monolith, /window\.DiceboundTalents\?\.createRegistry\(\)/);
assert.match(monolith, /const talents=db317Readonly\(DB317_TALENTS_RAW\)/);
assert.match(monolith, /DiceboundTalents must load before dicebound\.js/);

console.log("Talent registry preserved: exact 45-node snapshot, valid acyclic prerequisites and isolated clones pass");
