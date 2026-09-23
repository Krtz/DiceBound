"use strict";

const assert = require("node:assert/strict");
global.window = {};
require("../runtime/js/progression/achievements.js");
const registry = window.DiceboundAchievements.createRegistry();

assert.equal(window.DiceboundAchievements.apiVersion, 3);
assert.equal(registry.length, 37);
assert.ok(registry.every(entry => entry.hierarchy && entry.hierarchy.group));
assert.deepEqual(registry.find(entry => entry.id === "ranger-b1").hierarchy, {group:"hero-mastery",subgroup:"hero-milestones",heroId:"ranger"});
assert.equal(registry.find(entry => entry.id === "beastmaster-b5-roster")?.name, "A Bigger Roster");
assert.equal(registry.find(entry => entry.id === "beastmaster-b5-roster")?.condition, "boardClear:beastmaster:5");
assert.deepEqual(registry.find(entry => entry.id === "pale-devil").hierarchy, {group:"secrets",subgroup:null,heroId:null});
assert.deepEqual(registry.find(entry => entry.id === "invoker-grand-magus").hierarchy, {group:"builds",subgroup:null,heroId:null});
assert.deepEqual(window.DiceboundAchievements.groups.map(group => group.id), ["roads","builds","legacy","secrets","hero-mastery"]);

console.log("achievement hierarchy registry tests passed");
