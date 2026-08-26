"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ window: {} });
const sourcePath = path.join(__dirname, "..", "runtime", "js", "combat", "strike-policy.js");
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });
const policy = context.window.DiceboundStrikePolicy;

assert.ok(policy);
assert.equal(policy.apiVersion, 1);
assert.ok(Object.isFrozen(policy));

let calls = 0;
const roll = chance => { calls += 1; return chance >= 1 ? 3 : chance > 0 ? 1 : 0; };
assert.equal(policy.resolveCriticalTiers(roll, { canCrit: true, critChance: 3.2, bonusCrit: 2 }), 5);
assert.equal(calls, 1, "ordinary strikes roll Crit once");
calls = 0;
assert.equal(policy.resolveCriticalTiers(roll, { canCrit: false, critChance: 99, bonusCrit: 7 }), 0);
assert.equal(calls, 1, "non-critical Echoes preserve one crit-roll RNG draw");

assert.equal(policy.rangerMarkTotal(0, { cap: 3, landed: true }), 1);
assert.equal(policy.rangerMarkTotal(1, { cap: 3, landed: true }), 2, "each Echo earns exactly one Mark");
assert.equal(policy.rangerMarkTotal(2, { cap: 3, landed: true }), 3, "distinct Echoes each earn one Mark");
assert.equal(policy.rangerMarkTotal(3, { cap: 3, landed: true }), 3, "Marks respect the cap");
assert.equal(policy.rangerMarkTotal(2, { cap: 3, landed: false }), 2, "missed strikes do not add a Mark");

console.log("Strike policy passes high-Crit Echo and Ranger multi-Echo boundaries");
