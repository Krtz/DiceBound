"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ window: {}, document: undefined, setTimeout, Image: undefined });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "assets.js"), "utf8"), context, { filename: "assets.js" });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "combat", "vfx.js"), "utf8"), context, { filename: "vfx.js" });

const api = context.window.DiceboundCombatVfx;
assert.ok(Object.isFrozen(api));
const defeated = { name: "defeated", hp: 0 };
const living = { name: "living", hp: 12 };
const vfx = api.create({ getEnemies: () => [defeated, living], getPlayer: () => ({ hp: 10 }) });
assert.ok(Object.isFrozen(vfx));
assert.equal(vfx.natureEffect().frameDurationMs, 75);
assert.equal(vfx.donutEffect().durationMs, 1450);
assert.deepEqual(JSON.parse(JSON.stringify(vfx.livingNatureTargets())), [living]);
assert.equal(vfx.suppressLegacyElementAnimation("nature"), false);
const result = vfx.withNatureLegacyPresentation("nature", () => {
  assert.equal(vfx.suppressLegacyElementAnimation("nature"), true);
  assert.equal(vfx.suppressLegacyElementAnimation("fire"), false);
  return "resolved";
});
assert.equal(result, "resolved");
assert.equal(vfx.suppressLegacyElementAnimation("nature"), false);
vfx.withNatureLegacyPresentation("donut", () => assert.equal(vfx.suppressLegacyElementAnimation("nature"), false));
assert.deepEqual(JSON.parse(JSON.stringify(vfx.natureEntries())), []);
assert.deepEqual(JSON.parse(JSON.stringify(vfx.donutEntries())), []);

const monolith = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");
assert.match(monolith, /window\.DiceboundCombatVfx\?\.create/, "Combat VFX local-state adapter is missing");
assert.match(monolith, /dbCombatVfx\.playDonutRain\(\)/, "Donut presentation is not routed through the VFX owner");
assert.match(monolith, /const db064DonutEnemyElementProcBase=enemyElementProc;/, "Enemy-origin Donut procs are not routed through the authored VFX owner");
assert.match(monolith, /if\(isDonut&&result\)dbCombatVfx\.playDonutRain\(\);/, "Enemy-origin Donut proc must play the authored rain after a real completed proc");
assert.doesNotMatch(monolith, /function dbPlayNatureVfx/, "Nature DOM presentation remained duplicated in the monolith");
assert.doesNotMatch(monolith, /function db064PlayDonutRain/, "Donut DOM presentation remained duplicated in the monolith");

console.log("Combat VFX ownership PASS: Nature suppression scope, live-target filter, asset contracts and monolith adapters");
