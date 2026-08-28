"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "runtime", "js", "combat", "effective-stats.js"), "utf8");
const window = {};
vm.runInNewContext(source, { window, Object, Number, Math, RangeError, String }, { filename: "combat/effective-stats.js" });
const stats = window.DiceboundEffectiveStats;
assert.ok(Object.isFrozen(stats));

const berserker = { ultimate: { desc: "stale base description" } };
const run = {
  attack: 10,
  hp: 100,
  maxHp: 100,
  classUltimateBonus: 0,
  ultimateDamageBonus: 0,
  damageBonus: 0,
};

assert.equal(stats.ultimateBaseMultiplier("berserker"), 2.8);
assert.equal(stats.ultimateBaseDamage("berserker", run, 5), 33);
assert.equal(stats.scaleUltimateDamage(33, run), 33);
assert.equal(stats.berserkerRageBonus(run), 0);
assert.equal(stats.berserkerUltimateSnapshot(run).effectiveAttackMultiplier, 2.8);
assert.match(stats.describeUltimate("berserker", berserker, run), /280% Attack/);
assert.match(stats.describeUltimate("berserker", berserker, run), /33–38/);

run.ultimateDamageBonus = 0.25;
assert.equal(stats.scaleUltimateDamage(33, run), 41);
assert.match(stats.describeUltimate("berserker", berserker, run), /350% Attack/);
assert.match(stats.describeUltimate("berserker", berserker, run), /41–48/);

run.hp = 60;
run.classUltimateBonus = 1;
run.damageBonus = 0.2;
const snapshot = stats.berserkerUltimateSnapshot(run, { setDamageBonus: 0.1 });
assert.equal(snapshot.rageBonus, 0.4);
assert.equal(Math.round(snapshot.effectiveAttackMultiplier * 100), 1274);
assert.equal(snapshot.damageMin, 150);
assert.equal(snapshot.damageMax, 174);
const description = stats.describeUltimate("berserker", berserker, run, { setDamageBonus: 0.1 });
assert.match(description, /1274% Attack/);
assert.match(description, /Rage \+40%/);
assert.match(description, /Ultimate \+25%/);
assert.match(description, /class Ultimate \+100%/);
assert.match(description, /all damage \+30%/);

assert.equal(stats.describeUltimate("ranger", { ultimate: { desc: "Static base explanation." } }, run), "Static base explanation.");
assert.throws(() => stats.ultimateBaseDamage("unknown", run), /computed Ultimate profile/);

run.goldBonus = 0;
assert.equal(stats.goldMultiplier(run), 1);
assert.equal(stats.scaleGold(17, run), 17);
assert.equal(stats.goldSnapshot(run).label, "100%");
assert.match(stats.goldSnapshot(run).description, /100% is baseline/);

run.goldBonus = 0.5;
assert.equal(stats.goldMultiplier(run), 1.5);
assert.equal(stats.scaleGold(17, run), 26);
let gold = stats.goldSnapshot(run);
assert.equal(gold.bonusPercent, 50);
assert.equal(gold.effectivePercent, 150);
assert.match(gold.description, /Gold bonuses currently multiply that to 150%/);

assert.equal(stats.goldMultiplier(run, { nightmare: true }), 0.75);
assert.equal(stats.scaleGold(17, run, { nightmare: true }), 13);
gold = stats.goldSnapshot(run, { nightmare: true });
assert.equal(gold.difficultyMultiplierPercent, 50);
assert.equal(gold.effectivePercent, 75);
assert.match(gold.description, /Nightmare\/Hell difficulty applies 50%/);

const manaEquipment = {
  offhand: { bonuses: { maxMana: 5 } },
  ring: { bonuses: { maxMana: 7 } },
  chest: { bonuses: { attack: 3 } },
};
assert.equal(stats.equipmentStatTotal(manaEquipment, "maxMana"), 12);
assert.equal(stats.equipmentStatTotal(manaEquipment, "attack"), 3);
assert.equal(stats.equipmentStatTotal(null, "maxMana"), 0);
let mana = stats.manaResourceSnapshot({ baseMaxMana: 100, currentMana: 17, usesMana: true, equipmentMana: 5 });
assert.deepEqual(JSON.parse(JSON.stringify(mana)), { baseMaxMana: 100, equipmentMana: 5, maxMana: 105, mana: 17 }, "equipping Mana must raise only the cap, not refill current Mana");
mana = stats.manaResourceSnapshot({ baseMaxMana: 120, currentMana: 17, usesMana: true, equipmentMana: 12 });
assert.equal(mana.maxMana, 132, "class and Powerup Mana bases must compose with all equipped Mana bonuses");
assert.equal(mana.mana, 17, "multiple Mana gear pieces must not grant a free refill");
mana = stats.manaResourceSnapshot({ baseMaxMana: 100, currentMana: 107, usesMana: true, equipmentMana: 0 });
assert.deepEqual(JSON.parse(JSON.stringify(mana)), { baseMaxMana: 100, equipmentMana: 0, maxMana: 100, mana: 100 }, "removing Mana gear must clamp safely");
mana = stats.manaResourceSnapshot({ baseMaxMana: 0, currentMana: 9, usesMana: false, equipmentMana: 12 });
assert.deepEqual(JSON.parse(JSON.stringify(mana)), { baseMaxMana: 0, equipmentMana: 0, maxMana: 0, mana: 0 }, "non-Mana classes must not gain a hidden Mana resource from gear");

const monolith = fs.readFileSync(path.join(__dirname, "..", "runtime", "js", "dicebound.js"), "utf8");
assert.match(monolith, /DB_EFFECTIVE_STATS\.ultimateBaseDamage\("berserker"/);
assert.match(monolith, /DB_EFFECTIVE_STATS\.scaleUltimateDamage/);
assert.match(monolith, /DB_EFFECTIVE_STATS\.scaleBerserkerRageDamage/);
assert.match(monolith, /DB_EFFECTIVE_STATS\.describeUltimate/);
assert.match(monolith, /function modifiedGold\(base\)\{return DB_EFFECTIVE_STATS\.scaleGold\(base,player,\{nightmare:nightmareMode\}\);\}/);
assert.match(monolith, /data-effective-gold/);
assert.match(monolith, /DB_EFFECTIVE_STATS\.manaResourceSnapshot/);
assert.match(monolith, /function db06421SyncMana/);

console.log("Effective stats PASS: authoritative Berserker scaling, Gold rewards and live UI snapshots agree");
