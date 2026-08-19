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
  { slot: "boots", weight: 30, label: "Titanstep, Boots of the Astral Road" },
  { slot: "legs", weight: 20, label: "Paradox Weave, Legguards Outside Time" },
  { slot: "ring", weight: 16, label: "Ouroboros Halo, Ring of the Fifth Road" },
  { slot: "hat", weight: 14, label: "Crown of the Road That Should Not Exist" },
  { slot: "amulet", weight: 9, label: "The Devourer's Last Eye" },
  { slot: "offhand", weight: 7, label: "Event Horizon Ward, Offhand Beyond the Sixth Road" },
  { slot: "weapon", weight: 4, label: "Impossible Road class weapon" },
];
assert.deepEqual(JSON.parse(JSON.stringify(artifacts.entries)), expectedEntries);
const minimumWeight = Math.min(...artifacts.entries.map((entry) => entry.weight));
const minimumSlots = artifacts.entries
  .filter((entry) => entry.weight === minimumWeight)
  .map((entry) => entry.slot);
assert.equal(minimumSlots.length, 1, "Artifact table must have exactly one minimum-weight slot");
assert.equal(minimumSlots[0], "weapon", "weapon must be the unique minimum-weight Artifact");

const boundaryCases = [
  [0, "boots"],
  [0.3, "boots"],
  [0.300001, "legs"],
  [0.5, "legs"],
  [0.500001, "ring"],
  [0.66, "ring"],
  [0.660001, "hat"],
  [0.8, "hat"],
  [0.800001, "amulet"],
  [0.89, "amulet"],
  [0.890001, "offhand"],
  [0.96, "offhand"],
  [0.960001, "weapon"],
  [1, "weapon"],
];
for (const [roll, expectedSlot] of boundaryCases) {
  assert.equal(artifacts.pick(() => roll).slot, expectedSlot, `unexpected slot at roll ${roll}`);
}
assert.throws(() => artifacts.pick(null), /requires a random function/);

let randomCalls = 0;
assert.equal(artifacts.pick(() => { randomCalls += 1; return 0.5; }).slot, "legs");
assert.equal(randomCalls, 1, "Artifact slot selection must use exactly one random draw");

const deterministicCounts = Object.fromEntries(expectedEntries.map((entry) => [entry.slot, 0]));
for (let i = 0; i < 10000; i += 1) {
  const slot = artifacts.pick(() => (i + 0.5) / 10000).slot;
  deterministicCounts[slot] += 1;
}
assert.deepEqual(deterministicCounts, {
  boots: 3000,
  legs: 2000,
  ring: 1600,
  hat: 1400,
  amulet: 900,
  offhand: 700,
  weapon: 400,
});

const monolithPath = path.join(__dirname, "..", "runtime", "js", "dicebound.js");
const monolith = fs.readFileSync(monolithPath, "utf8");
assert.doesNotMatch(monolith, /function\s+db060WeightedPick\b/, "legacy weighted picker is still live");
assert.match(monolith, /window\.DiceboundArtifacts\.pick\(random\)/);
const factoryBlock = monolith.match(/const DB060_ARTIFACT_FACTORIES=Object\.freeze\(\{([\s\S]*?)\n\s*\}\);/);
assert.ok(factoryBlock, "Artifact factory adapter is missing");
const factorySlots = [...factoryBlock[1].matchAll(/^\s*([a-z]+):\(\)=>/gm)].map((match) => match[1]);
assert.deepEqual(factorySlots.sort(), expectedEntries.map((entry) => entry.slot).sort());

console.log("Artifact weights validated: exact table, unique weapon minimum, boundaries, one-draw selection and deterministic distribution pass");
