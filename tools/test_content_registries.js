"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ window: {} });
for (const relative of [
  ["items", "rarities.js"],
  ["items", "equipment.js"],
  ["board", "registry.js"],
  ["progression", "achievements.js"],
]) {
  const sourcePath = path.join(__dirname, "..", "runtime", "js", ...relative);
  vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });
}

const boardsApi = context.window.DiceboundBoards;
const equipmentApi = context.window.DiceboundEquipment;
const achievementsApi = context.window.DiceboundAchievements;
for (const [name, api] of [["boards", boardsApi], ["equipment", equipmentApi], ["achievements", achievementsApi]]) {
  assert.ok(api, `${name} module did not publish its API`);
  assert.equal(api.apiVersion, 1);
  assert.ok(Object.isFrozen(api), `${name} API is mutable`);
}

function snapshot(value, bytes, sha256, label) {
  const serialized = JSON.stringify(value);
  assert.equal(Buffer.byteLength(serialized), bytes, `${label} byte snapshot drifted`);
  assert.equal(crypto.createHash("sha256").update(serialized).digest("hex"), sha256, `${label} data drifted`);
}

const boards = boardsApi.createRegistry();
assert.deepEqual(Object.keys(boards), ["1", "2", "3", "4", "5", "6"]);
assert.equal(boards["1"].tiles, 100);
assert.equal(boards["6"].tiles, 64);
assert.equal(boards["6"].bossId, "last-equation");
assert.equal(boards["6"].balance.threePackChance, 0.95);
snapshot(boards, 1122, "0da53093300c77c15098e7a5b472a396165ebdf991f024d7767319d6aab47fa0", "board registry");

const equipment = equipmentApi.createRegistry();
assert.deepEqual(Array.from(equipment.slots), ["weapon", "offhand", "boots", "legs", "chest", "hat", "ring", "amulet"]);
assert.deepEqual(Array.from(equipment.rarities), ["common", "uncommon", "rare", "epic", "legendary", "mythical", "omega", "poor", "artifact"]);
assert.deepEqual(Array.from(equipment.ordinaryRarities), ["poor", "common", "uncommon", "rare", "epic"]);
assert.equal(Object.keys(equipment.special).length, 11);
assert.equal(equipment.special["axels-coffee-mug"].rarity, "legendary");
assert.equal(equipment.special["devils-horns"].rarity, "omega");
assert.equal(equipment.special["impossible-weapon"].setName, "Impossible Road");
snapshot(equipment, 1792, "2d702405c8a749527f3f8fbffe8dc409bfdabe76acab3be8c7a47054723e8f0f", "equipment registry");

const achievements = achievementsApi.createRegistry();
assert.equal(achievements.length, 31);
assert.equal(new Set(achievements.map((entry) => entry.id)).size, achievements.length);
assert.deepEqual(
  achievements.reduce((counts, entry) => ({ ...counts, [entry.category]: (counts[entry.category] || 0) + 1 }), {}),
  { roads: 8, builds: 6, collection: 12, secrets: 5 },
);
for (const achievement of achievements) {
  assert.equal(typeof achievement.id, "string");
  assert.equal(typeof achievement.name, "string");
  assert.equal(typeof achievement.condition, "string");
}
snapshot(achievements, 3327, "0ac574cd73141a7d0ac2f8d98790c9da145480777a565347d8819584d3d4af03", "achievement registry");

boards["6"].balance.threePackChance = -1;
equipment.special["devils-horns"].rarity = "poor";
achievements[0].name = "mutated";
assert.equal(boardsApi.createRegistry()["6"].balance.threePackChance, 0.95, "board clones share nested data");
assert.equal(equipmentApi.createRegistry().special["devils-horns"].rarity, "omega", "equipment clones share nested data");
assert.equal(achievementsApi.createRegistry()[0].name, "First Footfall", "achievement clones share data");

const monolith = fs.readFileSync(path.join(__dirname, "..", "runtime", "js", "dicebound.js"), "utf8");
for (const owner of ["BOARD_REGISTRY", "EQUIPMENT_REGISTRY", "ACHIEVEMENT_REGISTRY"]) {
  assert.doesNotMatch(monolith, new RegExp(`const\\s+DB317_${owner}_RAW\\s*=\\s*[\\[{]`), `${owner} data is still owned by the monolith`);
}
assert.match(monolith, /window\.DiceboundBoards\?\.createRegistry\?\.\(\)/);
assert.match(monolith, /window\.DiceboundEquipment\?\.createRegistry\?\.\(\)/);
assert.match(monolith, /window\.DiceboundAchievements\?\.createRegistry\?\.\(\)/);
assert.doesNotMatch(monolith, /const\s+EQUIPMENT_SLOTS\s*=\s*\["weapon"/, "equipment slots are still duplicated in the monolith");
assert.doesNotMatch(monolith, /const\s+SLOT_LABELS\s*=\s*\{weapon:/, "equipment labels are still duplicated in the monolith");
assert.match(monolith, /const EQUIPMENT_SLOTS=\[\.\.\.DB_EQUIPMENT_CONFIG\.slots\]/);
assert.match(monolith, /const SLOT_LABELS=\{\.\.\.DB_EQUIPMENT_CONFIG\.labels\}/);

console.log("Content registries preserved: boards, equipment, achievements, exact snapshots and isolated clones pass");
