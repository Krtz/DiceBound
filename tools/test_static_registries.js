"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ window: {} });
for (const relative of [
  ["pets", "registry.js"],
  ["combat", "enemies.js"],
  ["items", "rarities.js"],
  ["classes", "registry.js"],
]) {
  const sourcePath = path.join(__dirname, "..", "runtime", "js", ...relative);
  vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });
}

const petsApi = context.window.DiceboundPets;
const enemiesApi = context.window.DiceboundEnemies;
const raritiesApi = context.window.DiceboundRarities;
for (const [name, api] of [["pets", petsApi], ["enemies", enemiesApi], ["rarities", raritiesApi]]) {
  assert.ok(api, `${name} module did not publish its API`);
  assert.equal(api.apiVersion, name === "enemies" ? 2 : 1);
  assert.ok(Object.isFrozen(api), `${name} API is mutable`);
}
assert.ok(Object.isFrozen(petsApi.ids));
assert.ok(Object.isFrozen(raritiesApi.ids));

function snapshot(value, bytes, sha256, label) {
  const serialized = JSON.stringify(value);
  assert.equal(Buffer.byteLength(serialized), bytes, `${label} byte snapshot drifted`);
  assert.equal(crypto.createHash("sha256").update(serialized).digest("hex"), sha256, `${label} data drifted`);
}

const petIds = ["neutral", "fire", "ice", "electric", "light", "void", "nature", "donut", "tech", "metal", "coffee", "gun", "radiation"];
const pets = petsApi.createRegistry();
assert.deepEqual(Array.from(petsApi.ids), petIds);
assert.deepEqual(Object.keys(pets), petIds);
for (const [id, pet] of Object.entries(pets)) {
  assert.equal(pet.id, id);
  assert.equal(typeof pet.name, "string");
  assert.equal(typeof pet.desc, "string");
  assert.ok(pet.element === null || typeof pet.element === "string");
}
snapshot(pets, 1758, "dc0f9488eebfcbab4b81a68207fe4dbfa1e0efe38745d0a10bb28fe7b01efe8e", "pet registry");

const enemies = enemiesApi.createNormalRegistry();
assert.equal(enemies.length, 11);
assert.equal(new Set(enemies.map((enemy) => enemy.name)).size, enemies.length);
for (const enemy of enemies) {
  for (const field of ["hp", "attack", "xp", "gold"]) assert.ok(Number.isFinite(enemy[field]) && enemy[field] > 0, `${enemy.name} has invalid ${field}`);
  assert.ok(Number.isFinite(enemy.defenseBias), `${enemy.name} has invalid defenseBias`);
  assert.equal(typeof enemy.weakness, "string");
}
snapshot(enemies, 1192, "e2b7a7bd0e5d9be437d57249028b208265544ac7ae3b641cd443f218634e93fb", "ordinary enemy registry");

const specialEnemies = enemiesApi.createSpecialRegistry();
assert.equal(Object.keys(specialEnemies).length, 15);
assert.equal(specialEnemies["ogre-roadwarden"].specialName, "Roadwarden Rampage");
assert.equal(specialEnemies["last-equation"].hp, 520);
assert.equal(specialEnemies["road-merchant"].formula, true);
assert.equal(specialEnemies["bloodmage-boss"].bloodmageBoss, true);
snapshot(specialEnemies, 2770, "8bd040fffed44cb1e90ca42f700fcfcdab567e4448a23cec55338137057d1d00", "special enemy registry");

const rarityIds = ["common", "uncommon", "rare", "epic", "legendary", "mythical", "omega", "poor", "artifact"];
const rarityInfo = raritiesApi.createInfoRegistry();
const rarityValues = raritiesApi.createValueRegistry();
assert.deepEqual(Array.from(raritiesApi.ids), rarityIds);
assert.deepEqual(Object.keys(rarityInfo), rarityIds);
assert.deepEqual(Object.keys(rarityValues), rarityIds);
for (const id of rarityIds) {
  assert.equal(typeof rarityInfo[id].label, "string");
  assert.ok(Number.isFinite(rarityInfo[id].weight) && rarityInfo[id].weight >= 0);
  assert.ok(Number.isFinite(rarityValues[id]) && rarityValues[id] > 0);
}
snapshot(rarityInfo, 373, "0021f2cd1704fb1a166b635daef19a15581eabde347fd232e1b7ff7832c862eb", "rarity info");
snapshot(rarityValues, 104, "979528d13f2cbf11dd002d5930004e048996ee0ec5159e272712453c30448d7c", "rarity values");

const secondPets = petsApi.createRegistry();
pets.neutral.name = "mutated";
assert.equal(secondPets.neutral.name, "DiBo");
const secondEnemies = enemiesApi.createNormalRegistry();
enemies[0].hp = -1;
assert.equal(secondEnemies[0].hp, 9);
specialEnemies["last-equation"].hp = -1;
assert.equal(enemiesApi.createSpecialRegistry()["last-equation"].hp, 520);
rarityInfo.common.weight = -1;
assert.equal(raritiesApi.createInfoRegistry().common.weight, 25);

const classes = context.window.DiceboundClasses.createRegistry();
const derivedTags = Object.fromEntries(Object.entries(classes).map(([id, value]) => [id, value.tags]));
snapshot(derivedTags, 1122, "b5eb3c11a7d0d8c8a3c846d0682dd9d063b4a8ef22aa01a47256378f29735159", "derived class tags");

const monolithPath = path.join(__dirname, "..", "runtime", "js", "dicebound.js");
const monolith = fs.readFileSync(monolithPath, "utf8");
for (const [rawOwner, opener] of [["PETS", "\\{"], ["ENEMY_POOL", "\\["], ["RARITY_INFO", "\\{"], ["RARITY_VALUES", "\\{"]]) {
  assert.doesNotMatch(monolith, new RegExp(`const\\s+DB317_${rawOwner}_RAW\\s*=\\s*${opener}`), `${rawOwner} data is still owned by the monolith`);
}
assert.doesNotMatch(monolith, /const\s+DB317_CLASS_TAGS_RAW\s*=\s*\{/);
assert.match(monolith, /DB317_CLASS_TAGS_RAW=Object\.fromEntries\(Object\.entries\(DB317_CLASSES_RAW\)/);
assert.match(monolith, /window\.DiceboundPets\?\.createRegistry\(\)/);
assert.match(monolith, /window\.DiceboundEnemies\?\.createNormalRegistry\(\)/);
assert.match(monolith, /window\.DiceboundEnemies\?\.createSpecialRegistry\?\.\(\)/);
assert.match(monolith, /window\.DiceboundRarities\?\.createInfoRegistry\(\)/);
assert.doesNotMatch(monolith, /const\s+DB317_SPECIAL_ENEMIES_RAW\s*=\s*\{/);

console.log("Static registries preserved: pets, ordinary/special enemies, rarities, isolated clones and canonical class tags pass");
