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
assert.deepEqual([...effect.frames], [
  "assets/combat/effects/donut/donut-proc-rain-01.png",
  "assets/combat/effects/donut/donut-proc-rain-02.png",
  "assets/combat/effects/donut/donut-proc-rain-03.png",
  "assets/combat/effects/donut/donut-proc-rain-04.png",
  "assets/combat/effects/donut/donut-proc-rain-05.png",
  "assets/combat/effects/donut/donut-proc-rain-06.png",
]);
assert.equal(effect.frameWidth, 362);
assert.equal(effect.frameHeight, 724);
assert.equal(effect.durationMs, 1450);
assert.equal(effect.frameDurationMs, 240);
assert.equal(effect.alt, "A magical cloud rains colorful donuts across the battlefield");
for (const frame of effect.frames) assert.ok(fs.existsSync(path.join(root, "runtime", frame)));
assert.equal(context.window.DiceboundAssets.resolveCombatEffect("missing"), null);

console.log("Donut proc VFX registry: canonical per-element battlefield overlay asset and timing pass");
