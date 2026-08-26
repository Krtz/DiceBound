"use strict";

const assert = require("node:assert/strict");
global.window = {};
require("../runtime/js/events/reward-policy.js");
const policy = window.DiceboundEventRewards;

assert.equal(policy.baseGold(1), 70);
assert.equal(policy.baseGold(5), 150);
assert.equal(policy.baseGold(10), 250);
assert.equal(policy.baseGold(25), 550);
assert.equal(policy.goldBaseFor("heavyPurse", 1), 49);
assert.equal(policy.goldBaseFor("heavyPurse", 10), 175);
assert.equal(policy.goldBaseFor("slotPair", 5), 150);
assert.equal(policy.goldBaseFor("slotPity", 5), 38);
assert.equal(policy.goldBaseFor("talentRank", 1, 4), 98);
assert.deepEqual(policy.roadTileCutoffs(1), { enemy: 0.72, slot: 0.80, treasure: 0.98 });
assert.deepEqual(policy.roadTileCutoffs(5), { enemy: 0.75, slot: 0.82, treasure: 0.98 });
assert.equal(policy.roadTileType(0.799, 1), "event");
assert.equal(policy.roadTileType(0.8, 1), "treasure");
assert.equal(policy.roadTileType(0.819, 5), "event");
assert.equal(policy.roadTileType(0.82, 5), "treasure");
assert.deepEqual(policy.slotMatchOdds(0), { secondMatch: 0.30, tripleFromPair: 0.42, pairFromMiss: 0.30 });
assert.deepEqual(policy.slotMatchOdds(0.5), { secondMatch: 0.78, tripleFromPair: 0.88, pairFromMiss: 0.575 });

console.log("event reward policy tests passed");
