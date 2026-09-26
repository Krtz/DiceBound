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
const apiVersions = { boards: 1, equipment: 4, achievements: 3 };
for (const [name, api] of [["boards", boardsApi], ["equipment", equipmentApi], ["achievements", achievementsApi]]) {
  assert.ok(api, `${name} module did not publish its API`);
  assert.equal(api.apiVersion, apiVersions[name]);
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
snapshot(boards, 1446, "398e75f3d11ce978236ed91a1125e85562829c1f1858b94c567d83fd1bceaaae", "board registry");

const equipment = equipmentApi.createRegistry();
assert.deepEqual(Array.from(equipment.slots), ["weapon", "offhand", "boots", "legs", "chest", "hat", "ring", "amulet"]);
assert.deepEqual(Array.from(equipment.rarities), ["common", "uncommon", "rare", "epic", "legendary", "mythical", "omega", "poor", "artifact"]);
assert.deepEqual(Array.from(equipment.ordinaryRarities), ["poor", "common", "uncommon", "rare", "epic"]);
assert.equal(Object.keys(equipment.special).length, 11);
assert.equal(equipment.special["axels-coffee-mug"].rarity, "mythical");
assert.equal(equipment.special["kratz-headphones"].rarity, "mythical");
assert.equal(equipment.special["kellys-jean-jacket"].rarity, "mythical");
for (const id of ["axels-coffee-mug", "kratz-headphones", "kellys-jean-jacket"]) {
  assert.equal(equipment.special[id].exclusiveSpecial, true, `${id} must remain an exclusive named Mythical base`);
  assert.ok(Object.keys(equipment.special[id].intrinsicBonuses || {}).length > 0, `${id} must own its Intrinsic`);
}
assert.equal(equipment.special["devils-horns"].rarity, "omega");
assert.equal(equipment.special["impossible-weapon"].setName, "Impossible Road");
assert.equal(equipment.identities.length, 98, "all approved authored equipment bases, including the 40 integrated 0.6.9.0 identities, must remain part of the one equipment registry");
assert.equal(equipment.identities.find(identity => identity.id === "bronze-longsword").intrinsicBonuses.attack, 1);
assert.equal(equipment.identities.find(identity => identity.id === "shortbow").art.image, "assets/equipment/weapon/shortbow.png");

const achievements = achievementsApi.createRegistry();
assert.equal(achievements.length, 38);
assert.equal(new Set(achievements.map((entry) => entry.id)).size, achievements.length);
assert.deepEqual(
  achievements.reduce((counts, entry) => ({ ...counts, [entry.category]: (counts[entry.category] || 0) + 1 }), {}),
  { roads: 8, builds: 12, collection: 12, secrets: 6 },
);
for (const achievement of achievements) {
  assert.equal(typeof achievement.id, "string");
  assert.equal(typeof achievement.name, "string");
  assert.equal(typeof achievement.condition, "string");
}
assert.ok(achievements.every(entry => entry.hierarchy && typeof entry.hierarchy.group === "string"), "achievement hierarchy metadata is missing");
snapshot(achievements, 6583, "9b3e9ab19dd605ba0595836741aa36fb0b6ba7a8b0f8972a4a32148c849880e2", "achievement registry");

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
assert.match(monolith, /dbRun\.createBoardRegistry\(\)/);
assert.doesNotMatch(monolith, /window\.DiceboundBoards\?\.createRegistry\?\.\(\)/, "Board registry must be consumed through DiceboundRun rather than the internal Board owner");
assert.match(monolith, /window\.DiceboundEquipment\?\.createRegistry\?\.\(\)/);
assert.match(monolith, /window\.DiceboundAchievements\?\.createRegistry\?\.\(\)/);
assert.doesNotMatch(monolith, /const\s+EQUIPMENT_SLOTS\s*=\s*\["weapon"/, "equipment slots are still duplicated in the monolith");
assert.doesNotMatch(monolith, /const\s+SLOT_LABELS\s*=\s*\{weapon:/, "equipment labels are still duplicated in the monolith");
assert.match(monolith, /const EQUIPMENT_SLOTS=\[\.\.\.DB_EQUIPMENT_CONFIG\.slots\]/);
assert.match(monolith, /const SLOT_LABELS=\{\.\.\.DB_EQUIPMENT_CONFIG\.labels\}/);

console.log("Content registries preserved: boards, equipment, achievements, exact snapshots and isolated clones pass");
