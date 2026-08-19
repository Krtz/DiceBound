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
assert.equal(classes.apiVersion, 1);
assert.ok(Object.isFrozen(classes), "public class registry API is mutable");
assert.ok(Object.isFrozen(classes.ids), "public class id list is mutable");

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

const second = classes.createRegistry();
registry.ranger.name = "mutated";
registry.ranger.base.maxHp = -1;
registry.ranger.tags.push("mutation");
assert.equal(second.ranger.name, "Ranger", "registry clones share mutable class data");
assert.equal(second.ranger.base.maxHp, 37, "nested class stats leaked between clones");
assert.doesNotMatch(second.ranger.tags.join(","), /mutation/, "class arrays leaked between clones");
assert.equal(classes.createRegistry().ranger.name, "Ranger", "module source data was mutated");

const monolithPath = path.join(__dirname, "..", "runtime", "js", "dicebound.js");
const monolith = fs.readFileSync(monolithPath, "utf8");
assert.doesNotMatch(monolith, /const\s+DB317_CLASSES_RAW\s*=\s*\{/, "class data is still owned by the monolith");
assert.match(monolith, /window\.DiceboundClasses\?\.createRegistry\(\)/);
assert.match(monolith, /const CLASSES=db317Readonly\(DB317_CLASSES_RAW\)/);
assert.match(monolith, /DiceboundClasses must load before dicebound\.js/);

console.log("Class registry preserved: 25-class snapshot, isolated clones and monolith ownership removal pass");
