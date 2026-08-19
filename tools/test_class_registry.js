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
assert.equal(classes.apiVersion, 2);
assert.ok(Object.isFrozen(classes), "public class registry API is mutable");
assert.ok(Object.isFrozen(classes.ids), "public class id list is mutable");
assert.ok(Object.isFrozen(classes.tagVocabulary), "public class tag vocabulary is mutable");

const expectedIds = [
  "ranger", "sorcerer", "fighter", "monk", "clown", "rouge", "berserker",
  "turtle", "frog", "d20", "slime", "vampire", "ninja", "ceo", "merchant",
  "cleric", "paladin", "beastmaster", "rogue", "bloodmage", "summoner",
  "pokemontrainer", "alchemist", "ouroboros", "slimerouge",
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
assert.equal(Buffer.byteLength(serialized), 25804, "canonical class registry byte snapshot drifted");
assert.equal(
  crypto.createHash("sha256").update(serialized).digest("hex"),
  "aa5c6fb4a9f1e457f219293a74e3d6f57802d92a73e4493f7e661d1bb2f091c0",
  "canonical class registry data drifted",
);

assert.equal(registry.ranger.base.maxHp, 37);
assert.equal(registry.ranger.base.crit, 0.15);
assert.equal(registry.rogue.name, "Rogue");
assert.equal(registry.rouge.name, "Rouge");
assert.equal(registry.ouroboros.base.doubleStrike, 1.2);
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
assert.equal(Object.keys(passives).length, 23);
assert.deepEqual(expectedIds.filter((id) => !passives[id]), ["ouroboros", "slimerouge"]);
assert.deepEqual(Object.keys(unlocks), expectedIds);
assert.deepEqual(Object.keys(mechanics), expectedIds);
assert.equal(unlocks.sorcerer.guardian, "miniboss");
assert.equal(unlocks.slimerouge.requirements[1].board, 6);
assert.deepEqual(Array.from(mechanics.ranger), ["marks", "crit", "evasion", "ranged"]);
assert.deepEqual(Array.from(ultimateSupport.ranger), ["marks"]);
assert.deepEqual(Array.from(classes.tagVocabulary).slice(0, 4), ["ranged", "precision", "evasive", "occult"]);
snapshot(passives, 3630, "f7242b22f9ae8a85c7e8d7f428c7b3de21d2f5f4672afbe80b1b53bd5f8b5419", "class passive registry");
snapshot(Array.from(classes.tagVocabulary), 313, "c2ca5574c84743aec2e8a25632dde27cb8cb2dc7bfb7c4fa63e2fd472c065a4b", "class tag vocabulary");
snapshot(unlocks, 1739, "5bc622765899acd073d758ac19a909e5ad8f66a63686c56841c7bf609f5988e5", "class unlock registry");
snapshot(mechanics, 1273, "d3d4a386c6a7108fe7ec2924a1b5e6c9caa0e9aa6013a8d74f16d6316f956299", "class mechanics registry");
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
assert.match(monolith, /const CLASSES=db317Readonly\(DB317_CLASSES_RAW\)/);
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
