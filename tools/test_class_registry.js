"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "runtime", "js", "classes", "registry.js");
const source = fs.readFileSync(sourcePath, "utf8");
const context = vm.createContext({ window: {} });
vm.runInContext(source, context, { filename: sourcePath });

const classes = context.window.DiceboundClasses;
assert.ok(classes, "class registry did not publish window.DiceboundClasses");
assert.equal(classes.apiVersion, 3);
assert.ok(Object.isFrozen(classes), "public class registry API is mutable");
assert.ok(Object.isFrozen(classes.ids), "public class id list is mutable");
assert.ok(Object.isFrozen(classes.tagVocabulary), "public class tag vocabulary is mutable");

const expectedIds = [
  "ranger", "sorcerer", "fighter", "monk", "clown", "rouge", "berserker",
  "turtle", "frog", "d20", "slime", "vampire", "ninja", "ceo", "merchant",
  "cleric", "paladin", "beastmaster", "rogue", "bloodmage", "summoner",
  "necromancer", "pokemontrainer", "alchemist", "ouroboros", "dragoon", "invoker", "slimerouge",
];
assert.deepEqual(Array.from(classes.ids), expectedIds);

const registry = classes.createRegistry();
assert.deepEqual(Object.keys(registry), expectedIds);
for (const [id, definition] of Object.entries(registry)) {
  assert.equal(definition.id, id, `${id} definition has a mismatched id`);
  assert.equal(typeof definition.name, "string", `${id} has no name`);
  assert.equal(typeof definition.desc, "string", `${id} has no description`);
  assert.equal(typeof definition.base, "object", `${id} has no base stats`);
  assert.equal(typeof definition.ultimate, "object", `${id} has no ultimate metadata`);
}

const serialized = JSON.stringify(registry);
assert.equal(Buffer.byteLength(serialized), 30051, "canonical class registry byte snapshot drifted");
assert.equal(
  crypto.createHash("sha256").update(serialized).digest("hex"),
  "b8c0a14b02b74d97ed3cd93b84d06fbd81b19ee3a554b233d8a726b172465d52",
  "canonical class registry data drifted",
);

assert.equal(registry.ranger.base.maxHp, 37);
assert.equal(registry.ranger.base.crit, 0.15);
assert.equal(registry.rogue.name, "Rogue");
assert.equal(registry.rouge.name, "Rouge");
assert.equal(registry.rouge.unlock, "Reach 10 Prestige points");
assert.equal(registry.alchemist.unlock, "Use 15 potions across all runs");
assert.equal(registry.ouroboros.base.doubleStrike, 1.2);
assert.equal(registry.dragoon.ultimate.name, "Dragon Dive");
assert.equal(registry.invoker.base.maxHp, 32);
assert.deepEqual(Array.from(registry.invoker.tags), ["ranged", "occult", "mana", "elemental", "combo"]);
assert.equal(registry.necromancer.name, "Necromancer");
assert.equal(registry.necromancer.base.maxHp, 34);
assert.equal(registry.necromancer.base.attack, 6);
assert.equal(registry.necromancer.base.defense, 1);
assert.equal(registry.necromancer.ultimate.name, "Army of the Dead");
assert.deepEqual(Array.from(registry.necromancer.tags), ["occult", "mana", "pack", "ranged"]);
assert.equal(registry.slimerouge.ultimate.name, "Stolen Finale");

function snapshot(value, bytes, sha256, label) {
  const data = JSON.stringify(value);
  assert.equal(Buffer.byteLength(data), bytes, `${label} byte snapshot drifted`);
  assert.equal(crypto.createHash("sha256").update(data).digest("hex"), sha256, `${label} data drifted`);
}

const passives = classes.createPassiveRegistry();
const unlocks = classes.createUnlockRegistry();
const mechanics = classes.createMechanicsRegistry();
const ultimateSupport = classes.createUltimateSupportRegistry();
assert.equal(Object.keys(passives).length, 26);
assert.deepEqual(expectedIds.filter((id) => !passives[id]), ["ouroboros", "slimerouge"]);
assert.deepEqual(Object.keys(passives).slice(0, 1), ["invoker"]);
assert.deepEqual(Object.keys(unlocks).sort(), [...expectedIds].sort());
assert.deepEqual(Object.keys(mechanics).sort(), [...expectedIds].sort());
assert.equal(unlocks.sorcerer.guardian, "miniboss");
assert.equal(unlocks.slimerouge.requirements[1].board, 6);
assert.equal(unlocks.slime.type,"unlockedClassCount");
assert.equal(unlocks.slime.minimum,10);
assert.equal(unlocks.rouge.type,"prestige");
assert.equal(unlocks.rouge.count,10);
assert.equal(unlocks.alchemist.type,"lifetimeStat");
assert.equal(unlocks.alchemist.stat,"potionsUsed");
assert.equal(unlocks.alchemist.minimum,15);
assert.equal(unlocks.merchant.minimum,1);
assert.equal(unlocks.rogue.requirements[0].minimum,5000);
assert.equal(unlocks.rogue.requirements[1].board,3);
assert.equal(unlocks.vampire.requirements[0].stat,"maxLifesteal");
assert.equal(unlocks.vampire.requirements[0].greaterThan,1);
assert.equal(unlocks.vampire.requirements[1].board,3);
assert.equal(unlocks.dragoon.type,"guardianDefeat");
assert.equal(unlocks.dragoon.board,4);
assert.equal(unlocks.dragoon.guardian,"miniboss");
assert.equal(unlocks.pokemontrainer.requirements[1].board,5);
assert.equal(Object.hasOwn(unlocks.pokemontrainer.requirements[1],"difficulty"),false);
assert.equal(unlocks.necromancer.type,"enemyDefeats");
assert.equal(unlocks.necromancer.enemyId,"lich");
assert.equal(unlocks.necromancer.minimum,100);
assert.deepEqual(Array.from(mechanics.necromancer),["mana","allies","summons","grave-count","bone-shrapnel"]);
assert.deepEqual(Array.from(mechanics.ranger), ["marks", "crit", "evasion", "ranged"]);
assert.deepEqual(Array.from(ultimateSupport.ranger), ["marks"]);
assert.deepEqual(Array.from(classes.tagVocabulary).slice(0, 4), ["ranged", "precision", "evasive", "occult"]);
snapshot(passives, 4505, "e2b9fb4e3092cd9ab9bc04bd7165e201f8bae2843d13c989dd777a6e9d63e597", "class passive registry");
snapshot(Array.from(classes.tagVocabulary), 324, "69c32f490683a7bb3e2f3858af62440b3784c1eeeffa853ba1929076b588f945", "class tag vocabulary");
snapshot(unlocks, 2107, "020eda7f39dce3fb71c2fd21b354beb134019e0d0cc6c6910aa49a4951b85d56", "class unlock registry");
snapshot(mechanics, 1458, "6ccf29ce30fef0df9994595776e1f79389a35fb26f72e6214fa1a95797931e56", "class mechanics registry");
snapshot(ultimateSupport, 307, "3d6a941f90c1609e96473d6de9f454e2e8fe99b9915620728ef7243946d425e2", "ultimate support registry");

const second = classes.createRegistry();
registry.ranger.name = "mutated";
registry.ranger.base.maxHp = -1;
registry.ranger.tags.push("mutation");
assert.equal(second.ranger.name, "Ranger", "registry clones share mutable class data");
assert.equal(second.ranger.base.maxHp, 37, "nested class stats leaked between clones");
assert.doesNotMatch(second.ranger.tags.join(","), /mutation/, "class arrays leaked between clones");
assert.equal(classes.createRegistry().ranger.name, "Ranger", "module source data was mutated");
passives.ranger.name = "mutated";
unlocks.slimerouge.requirements[1].board = -1;
mechanics.ranger.push("mutation");
ultimateSupport.ranger.push("mutation");
assert.equal(classes.createPassiveRegistry().ranger.name, "Marked Quarry", "passive clones share mutable data");
assert.equal(classes.createUnlockRegistry().slimerouge.requirements[1].board, 6, "unlock clones share mutable data");
assert.doesNotMatch(classes.createMechanicsRegistry().ranger.join(","), /mutation/, "mechanic clones share arrays");
assert.doesNotMatch(classes.createUltimateSupportRegistry().ranger.join(","), /mutation/, "ultimate-support clones share arrays");

const monolithPath = path.join(__dirname, "..", "runtime", "js", "dicebound.js");
const monolith = fs.readFileSync(monolithPath, "utf8");
assert.doesNotMatch(monolith, /const\s+DB317_CLASSES_RAW\s*=\s*\{/, "class data is still owned by the monolith");
assert.match(monolith, /window\.DiceboundClasses\?\.createRegistry\(\)/);
assert.match(monolith, /const CLASSES=DB317_CLASSES_RAW;/, "composition must consume the canonical Classes registry directly");
assert.doesNotMatch(monolith, /db317Readonly\(DB317_CLASSES_RAW\)/, "retired registry compatibility wrapper returned");
assert.match(monolith, /DiceboundClasses must load before dicebound\.js/);
assert.doesNotMatch(monolith, /const\s+DB317_CLASS_PASSIVES_RAW\s*=\s*\{/);
assert.doesNotMatch(monolith, /const\s+CLASS_TAG_VOCABULARY\s*=\s*\[/);
assert.doesNotMatch(monolith, /const\s+DB317_CLASS_UNLOCKS_RAW\s*=\s*\{/);
assert.doesNotMatch(monolith, /const\s+DB317_CLASS_MECHANICS_RAW\s*=\s*\{/);
assert.doesNotMatch(monolith, /const\s+DB317_ULTIMATE_SUPPORT_RAW\s*=\s*\{/);
assert.match(monolith, /window\.DiceboundClasses\?\.createPassiveRegistry\?\.\(\)/);
assert.match(monolith, /window\.DiceboundClasses\?\.createUnlockRegistry\?\.\(\)/);
assert.match(monolith, /window\.DiceboundClasses\?\.createMechanicsRegistry\?\.\(\)/);

console.log("Class registry preserved: definitions, passives, tags, unlocks, mechanics, ultimate support and isolated clones pass");
