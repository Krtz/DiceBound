"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ window: {}, document: undefined });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "assets.js"), "utf8"), context, { filename: "assets.js" });
const effect = context.window.DiceboundAssets.resolveCombatEffect("donutProcRain");

assert.ok(Object.isFrozen(effect));
assert.equal(effect.image, "assets/combat/effects/donut/donut-proc-rain-spritesheet.png");
assert.equal(effect.durationMs, 1450);
assert.equal(effect.alt, "A magical cloud rains colorful donuts across the battlefield");
assert.ok(fs.existsSync(path.join(root, "runtime", effect.image)));
assert.equal(context.window.DiceboundAssets.resolveCombatEffect("missing"), null);

console.log("Donut proc VFX registry: canonical per-element battlefield overlay asset and timing pass");
