"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ window: {} });
const sourcePath = path.join(__dirname, "..", "runtime", "js", "combat", "enemy-policy.js");
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });
const policy = context.window.DiceboundEnemyPolicy;

assert.ok(policy);
assert.equal(policy.apiVersion, 1);
assert.ok(Object.isFrozen(policy));
for (const mode of ["normal", "nightmare", "hell"]) {
  for (let board = 1; board <= 4; board += 1) assert.equal(policy.wolfEchoChance(board, mode), 0, `Wolf Board ${board} must not Echo`);
}
assert.deepEqual(
  ["normal", "nightmare", "hell"].map(mode => policy.wolfEchoChance(5, mode)),
  [0.25, 0.35, 0.45],
);
assert.deepEqual(
  ["normal", "nightmare", "hell"].map(mode => policy.wolfEchoChance(6, mode)),
  [0.30, 0.40, 0.50],
);
assert.deepEqual(
  [1, 2, 3, 4, 5, 6].map(board => ["normal", "nightmare", "hell"].map(mode => policy.standardDevilFlameChance(board, mode))),
  [[0.05, 0.35, 0.65], [0.10, 0.40, 0.70], [0.15, 0.45, 0.75], [0.20, 0.50, 0.80], [0.25, 0.55, 0.85], [0.30, 0.60, 0.90]],
);
assert.equal(policy.standardDevilFlameChance(99, "hell"), 0.90, "Devil chance is safely capped");
assert.deepEqual(
  [0, 1, 4, 10, 20, 99].map(kills => policy.slimeRadiationChance(kills)),
  [0, 0.05, 0.20, 0.50, 1, 1],
  "Slime Radiation should gain exactly 5 percentage points per prior Slime kill and cap at 100%",
);
assert.equal(policy.slimeRadiationChance(-4), 0);
assert.equal(policy.slimeRadiationChance(2.9), 0.10, "Only completed Slime kills count");

console.log("Enemy policy passes Wolf, Devil and Slime escalation boundaries");
