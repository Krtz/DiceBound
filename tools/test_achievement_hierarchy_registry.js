"use strict";

const assert = require("node:assert/strict");
global.window = {};
require("../runtime/js/progression/achievements.js");
const registry = window.DiceboundAchievements.createRegistry();

assert.equal(window.DiceboundAchievements.apiVersion, 2);
assert.equal(registry.length, 31);
assert.ok(registry.every(entry => entry.hierarchy && entry.hierarchy.group));
assert.deepEqual(registry.find(entry => entry.id === "ranger-b1").hierarchy, {group:"hero-mastery",subgroup:"hero-milestones",heroId:"ranger"});
assert.deepEqual(registry.find(entry => entry.id === "pale-devil").hierarchy, {group:"secrets",subgroup:null,heroId:null});
assert.deepEqual(window.DiceboundAchievements.groups.map(group => group.id), ["roads","builds","legacy","secrets","hero-mastery"]);

console.log("achievement hierarchy registry tests passed");
