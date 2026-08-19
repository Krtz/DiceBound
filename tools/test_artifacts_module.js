"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "runtime", "js", "items", "artifacts.js");
const source = fs.readFileSync(sourcePath, "utf8");
const context = vm.createContext({ window: {} });
vm.runInContext(source, context, { filename: sourcePath });

const artifacts = context.window.DiceboundArtifacts;
assert.ok(artifacts, "artifacts module did not publish window.DiceboundArtifacts");
assert.equal(artifacts.apiVersion, 1);
assert.equal(artifacts.totalWeight, 100);
assert.ok(Object.isFrozen(artifacts));
assert.ok(Object.isFrozen(artifacts.entries));
assert.ok(artifacts.entries.every(Object.isFrozen));

const expectedEntries = [
  { slot: "weapon", weight: 30, label: "Impossible Road class weapon" },
  { slot: "boots", weight: 20, label: "Titanstep, Boots of the Astral Road" },
  { slot: "legs", weight: 16, label: "Paradox Weave, Legguards Outside Time" },
  { slot: "ring", weight: 14, label: "Ouroboros Halo, Ring of the Fifth Road" },
  { slot: "hat", weight: 9, label: "Crown of the Road That Should Not Exist" },
  { slot: "amulet", weight: 7, label: "The Devourer's Last Eye" },
  { slot: "offhand", weight: 4, label: "Event Horizon Ward, Offhand Beyond the Sixth Road" },
];
assert.deepEqual(JSON.parse(JSON.stringify(artifacts.entries)), expectedEntries);

const boundaryCases = [
  [0, "weapon"],
  [0.3, "weapon"],
  [0.300001, "boots"],
  [0.5, "boots"],
  [0.500001, "legs"],
  [0.66, "legs"],
  [0.660001, "ring"],
  [0.8, "ring"],
  [0.800001, "hat"],
  [0.89, "hat"],
  [0.890001, "amulet"],
  [0.96, "amulet"],
  [0.960001, "offhand"],
  [1, "offhand"],
];
for (const [roll, expectedSlot] of boundaryCases) {
  assert.equal(artifacts.pick(() => roll).slot, expectedSlot, `unexpected slot at roll ${roll}`);
}
assert.throws(() => artifacts.pick(null), /requires a random function/);

function legacyPick(randomValue) {
  let roll = randomValue * expectedEntries.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of expectedEntries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return expectedEntries[expectedEntries.length - 1];
}
for (let i = 0; i <= 10000; i += 1) {
  const roll = i / 10000;
  assert.equal(
    artifacts.pick(() => roll).slot,
    legacyPick(roll).slot,
    `extracted picker differs from the legacy algorithm at roll ${roll}`,
  );
}

const monolithPath = path.join(__dirname, "..", "runtime", "js", "dicebound.js");
const monolith = fs.readFileSync(monolithPath, "utf8");
assert.doesNotMatch(monolith, /function\s+db060WeightedPick\b/, "legacy weighted picker is still live");
assert.match(monolith, /window\.DiceboundArtifacts\.pick\(random\)/);
const factoryBlock = monolith.match(/const DB060_ARTIFACT_FACTORIES=Object\.freeze\(\{([\s\S]*?)\n\s*\}\);/);
assert.ok(factoryBlock, "Artifact factory adapter is missing");
const factorySlots = [...factoryBlock[1].matchAll(/^\s*([a-z]+):\(\)=>/gm)].map((match) => match[1]);
assert.deepEqual(factorySlots, expectedEntries.map((entry) => entry.slot));

console.log("Artifact module behavior preserved: weights, 10,001 legacy-equivalence rolls and factory coverage pass");
