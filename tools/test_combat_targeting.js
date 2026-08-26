"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ window: {} });
const sourcePath = path.join(__dirname, "..", "runtime", "js", "combat", "targeting.js");
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });
const targeting = context.window.DiceboundCombatTargeting;

assert.ok(targeting);
assert.ok(Object.isFrozen(targeting));
assert.equal(targeting.apiVersion, 1);

const pack = [
  { name: "A", hp: 0 },
  { name: "B", hp: 8 },
  { name: "C", hp: 5 },
  { name: "D", hp: 0 },
];

assert.equal(targeting.isLiving(pack[1]), true);
assert.equal(targeting.isLiving(pack[0]), false);
assert.equal(targeting.resolveLivingIndex(pack, 1), 1, "a living selected target remains selected");
assert.equal(targeting.resolveLivingIndex(pack, 0), 1, "a defeated target advances to the next living enemy");
assert.equal(targeting.resolveLivingIndex(pack, 3), 1, "target selection wraps after the last defeated enemy");
assert.equal(targeting.nextLivingTarget(pack, 0).enemy, pack[1]);
assert.equal(targeting.nextLivingTarget(pack, 1).enemy, pack[2]);
assert.equal(targeting.nextLivingTarget(pack, 2).enemy, pack[1], "a later defeat wraps to the first surviving enemy");
assert.equal(targeting.resolveLivingIndex([], 0), -1);
const noTarget = targeting.resolveLivingTarget([{ name: "dead", hp: 0 }], 0);
assert.equal(noTarget.index, -1);
assert.equal(noTarget.enemy, null);

console.log("Combat targeting preserves living selections and advances past defeated enemies");
