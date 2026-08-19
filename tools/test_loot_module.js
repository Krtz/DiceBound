"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "runtime", "js", "items", "loot.js");
const source = fs.readFileSync(sourcePath, "utf8");
const context = vm.createContext({ window: {} });
vm.runInContext(source, context, { filename: sourcePath });

const loot = context.window.DiceboundLoot;
assert.ok(loot, "loot module did not publish window.DiceboundLoot");
assert.equal(loot.apiVersion, 1);
assert.ok(Object.isFrozen(loot));

const plain = (value) => JSON.parse(JSON.stringify(value));
const expectedArtifactRates = {
  normal: {
    1: { mini: 0.005, boss: 0.01 }, 2: { mini: 0.01, boss: 0.02 },
    3: { mini: 0.02, boss: 0.03 }, 4: { mini: 0.03, boss: 0.05 },
    5: { mini: 0.05, boss: 0.07 }, 6: { mini: 0.07, boss: 0.10 },
  },
  nightmare: {
    1: { mini: 0.01, boss: 0.02 }, 2: { mini: 0.025, boss: 0.04 },
    3: { mini: 0.04, boss: 0.06 }, 4: { mini: 0.06, boss: 0.09 },
    5: { mini: 0.09, boss: 0.13 }, 6: { mini: 0.13, boss: 0.18 },
  },
  hell: {
    1: { mini: 0.02, boss: 0.04 }, 2: { mini: 0.05, boss: 0.07 },
    3: { mini: 0.07, boss: 0.10 }, 4: { mini: 0.10, boss: 0.14 },
    5: { mini: 0.14, boss: 0.20 }, 6: { mini: 0.20, boss: 0.28 },
  },
};
const expectedMiniTables = {
  1: [["common", 55], ["uncommon", 35], ["rare", 10]],
  2: [["common", 40], ["uncommon", 45], ["rare", 15]],
  3: [["common", 18], ["uncommon", 50], ["rare", 29], ["epic", 3]],
  4: [["uncommon", 50], ["rare", 42], ["epic", 7], ["legendary", 1]],
  5: [["uncommon", 32], ["rare", 52], ["epic", 14], ["legendary", 2]],
  6: [["uncommon", 20], ["rare", 60], ["epic", 18], ["legendary", 2]],
};
const expectedBossTables = {
  1: [["uncommon", 50], ["rare", 45], ["epic", 5]],
  2: [["uncommon", 35], ["rare", 52], ["epic", 13]],
  3: [["uncommon", 20], ["rare", 55], ["epic", 23], ["legendary", 2]],
  4: [["uncommon", 10], ["rare", 55], ["epic", 31], ["legendary", 4]],
  5: [["rare", 48], ["epic", 47], ["legendary", 5]],
  6: [["rare", 45], ["epic", 50], ["legendary", 5]],
};
const ladder = ["poor", "common", "uncommon", "rare", "epic", "legendary"];

assert.deepEqual(plain(loot.artifactRates), expectedArtifactRates);
assert.deepEqual(plain(loot.miniGearTables), expectedMiniTables);
assert.deepEqual(plain(loot.bossGearTables), expectedBossTables);
assert.deepEqual(plain(loot.gearLadder), ladder);
assert.deepEqual(plain(loot.minibossGearChances), { normal: 0.85, nightmare: 0.92, hell: 1 });
assert.deepEqual(plain(loot.secretSignatureRates), { normal: 0.05, nightmare: 0.10, hell: 0.15 });
assert.equal(loot.devilHornsRate, 0.05);

function assertDeepFrozen(value, label) {
  if (!value || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value), `${label} is mutable`);
  for (const [key, nested] of Object.entries(value)) assertDeepFrozen(nested, `${label}.${key}`);
}
for (const key of ["artifactRates", "miniGearTables", "bossGearTables", "gearLadder", "minibossGearChances", "secretSignatureRates"]) {
  assertDeepFrozen(loot[key], key);
}

assert.equal(loot.modeKey(), "normal");
assert.equal(loot.modeKey({ nightmare: true }), "nightmare");
assert.equal(loot.modeKey({ hell: true }), "hell");
assert.equal(loot.modeKey({ nightmare: true, hell: true }), "hell");

for (const [mode, flags] of Object.entries({ normal: {}, nightmare: { nightmare: true }, hell: { hell: true } })) {
  for (let board = 1; board <= 6; board += 1) {
    assert.equal(loot.artifactChance({ defeated: { miniBoss: true }, board, ...flags }), expectedArtifactRates[mode][board].mini);
    assert.equal(loot.artifactChance({ defeated: { finalBoss: true }, board, ...flags }), expectedArtifactRates[mode][board].boss);
  }
}
assert.equal(loot.artifactChance({ defeated: { boss: true }, board: 6, hell: true }), 0);
assert.equal(loot.artifactChance({ defeated: { miniBoss: true }, board: 7, hell: true }), 0);
assert.equal(loot.minibossGearChance(), 0.85);
assert.equal(loot.minibossGearChance({ nightmare: true }), 0.92);
assert.equal(loot.minibossGearChance({ hell: true }), 1);
assert.equal(loot.minibossGearChance({ nightmare: true, hell: true }), 1);
assert.equal(loot.secretSignatureRate({ kind: "devil", nightmare: true, hell: true }), 0.05);
assert.equal(loot.secretSignatureRate({ kind: "merchant" }), 0.05);
assert.equal(loot.secretSignatureRate({ kind: "merchant", nightmare: true }), 0.10);
assert.equal(loot.secretSignatureRate({ kind: "bloodmage", hell: true }), 0.15);
assert.equal(loot.secretSignatureRate({ kind: "unknown", hell: true }), 0);

const miniBoardOne = loot.miniGearTables[1];
for (const [roll, rarity] of [[0, "common"], [0.549999, "common"], [0.55, "uncommon"], [0.90, "uncommon"], [0.900001, "rare"], [1, "rare"]]) {
  let calls = 0;
  assert.equal(loot.weightedRarity(miniBoardOne, () => { calls += 1; return roll; }), rarity, `weighted boundary ${roll}`);
  assert.equal(calls, 1, "weighted rarity must consume one RNG draw");
}
assert.throws(() => loot.weightedRarity([], () => 0), /requires rows/);
assert.throws(() => loot.weightedRarity(miniBoardOne, null), /random function/);
for (let index = 0; index < ladder.length - 1; index += 1) assert.equal(loot.promoteRarity(ladder[index]), ladder[index + 1]);
assert.equal(loot.promoteRarity("legendary"), "legendary");
assert.equal(loot.promoteRarity("mythical"), "mythical");

function sequence(values) {
  let calls = 0;
  return {
    random() {
      const value = values[Math.min(calls, values.length - 1)];
      calls += 1;
      return value;
    },
    calls: () => calls,
  };
}

function legacyWeightedRarity(rows, randomFn) {
  let roll = randomFn() * rows.reduce((sum, row) => sum + row[1], 0);
  let rarity = rows[rows.length - 1][0];
  for (const row of rows) {
    roll -= row[1];
    if (roll <= 0) { rarity = row[0]; break; }
  }
  return rarity;
}
function legacyPromote(rarity) {
  const index = ladder.indexOf(rarity);
  return index >= 0 ? ladder[Math.min(ladder.length - 1, index + 1)] : rarity;
}
function legacyGuardianRarity({ defeated, board, nightmare, hell, randomFn }) {
  const table = defeated.miniBoss ? expectedMiniTables : expectedBossTables;
  const rows = table[board] || expectedBossTables[6];
  let rarity = legacyWeightedRarity(rows, randomFn);
  if (nightmare && randomFn() < 0.25) rarity = legacyPromote(rarity);
  if (hell && randomFn() < 0.25) rarity = legacyPromote(rarity);
  return rarity;
}
function legacyOrdinaryDrop({ defeated, board, nightmare, hell, randomFn }) {
  if (defeated.miniBoss) {
    const chance = hell ? 1 : nightmare ? 0.92 : 0.85;
    if (randomFn() >= chance) return null;
    return { kind: "generated-equipment", rarity: legacyGuardianRarity({ defeated, board, nightmare, hell, randomFn }) };
  }
  if (defeated.finalBoss) return { kind: "generated-equipment", rarity: legacyGuardianRarity({ defeated, board, nightmare, hell, randomFn }) };
  if (defeated.boss) return { kind: "generated-equipment", rarity: null };
  return null;
}

const modes = [
  { nightmare: false, hell: false },
  { nightmare: true, hell: false },
  { nightmare: false, hell: true },
  { nightmare: true, hell: true },
];
const rollSequences = [
  [0, 0, 0], [0.249999, 0.249999, 0.249999], [0.25, 0.25, 0.25],
  [0.549999, 0.1, 0.9], [0.849999, 0.9, 0.1], [0.919999, 0.1, 0.1], [0.999999, 0.9, 0.9],
];
for (let board = 1; board <= 6; board += 1) {
  for (const defeated of [{ miniBoss: true }, { finalBoss: true }]) {
    for (const mode of modes) {
      for (const values of rollSequences) {
        const actualRng = sequence(values);
        const legacyRng = sequence(values);
        const actual = loot.guardianRarity({ defeated, board, ...mode, randomFn: actualRng.random });
        const expected = legacyGuardianRarity({ defeated, board, ...mode, randomFn: legacyRng.random });
        assert.equal(actual, expected, `guardian rarity drift at board ${board}`);
        assert.equal(actualRng.calls(), legacyRng.calls(), `guardian rarity RNG drift at board ${board}`);
      }
    }
  }
}

for (let board = 1; board <= 6; board += 1) {
  for (const defeated of [{ miniBoss: true }, { finalBoss: true }, { boss: true }, {}]) {
    for (const mode of modes) {
      for (const values of rollSequences) {
        const actualRng = sequence(values);
        const legacyRng = sequence(values);
        const actual = plain(loot.ordinaryGuardianDrop({ defeated, board, ...mode, randomFn: actualRng.random }));
        const expected = legacyOrdinaryDrop({ defeated, board, ...mode, randomFn: legacyRng.random });
        assert.deepEqual(actual, expected, `ordinary drop drift at board ${board}`);
        assert.equal(actualRng.calls(), legacyRng.calls(), `ordinary drop RNG drift at board ${board}`);
      }
    }
  }
}

const monolithPath = path.join(__dirname, "..", "runtime", "js", "dicebound.js");
const monolith = fs.readFileSync(monolithPath, "utf8");
for (const removedOwner of [
  "DB060_ARTIFACT_RATES", "DB060_MINI_GEAR_TABLES", "DB060_BOSS_GEAR_TABLES",
  "DB060_GEAR_LADDER", "db060WeightedRarity", "db060PromoteRarity",
  "db060GuardianRarity", "db060SecretSignatureRate",
]) assert.doesNotMatch(monolith, new RegExp(`\\b${removedOwner}\\b`), `${removedOwner} is still owned by the monolith`);
assert.match(monolith, /DB060_LOOT\.ordinaryGuardianDrop/);
assert.match(monolith, /window\.DiceboundLoot/);
assert.match(monolith, /DB060_LOOT\.artifactChance/);
assert.match(monolith, /DB060_LOOT\.secretSignatureRate/);

console.log("Loot policy behavior preserved: exact tables, boundaries, promotions, RNG order and monolith ownership removal pass");
