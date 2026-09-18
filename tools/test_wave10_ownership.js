"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
global.window = global;

function load(rel) {
  const filename = path.join(ROOT, rel);
  vm.runInThisContext(fs.readFileSync(filename, "utf8"), { filename });
}

load("runtime/js/combat/enemies.js");
const normal = window.DiceboundEnemies.createNormalRegistry();
assert.deepEqual(normal.map(enemy => enemy.id), ["slime","goblin","skeleton","wolf","bandit","orc","cultist","wraith","troll","devil","lich"]);
assert.equal(new Set(normal.map(enemy => enemy.id)).size, normal.length, "ordinary enemy ids must be unique");

load("runtime/js/assets.js");
assert.match(window.DiceboundAssets.resolveEnemyPortraitById("bandit").src, /bandit\.png$/);
assert.match(window.DiceboundAssets.resolveEnemyBattleArtById("slime", 3).src, /slime-board-3\.png$/);
assert.match(window.DiceboundAssets.resolveEnemyMarkerById("goblin").src, /goblin\.png$/);
assert.equal(window.DiceboundAssets.resolveEnemyPortraitById("goblin"), null, "missing dedicated portrait is explicit, not a guessed fallback");
assert.equal(window.DiceboundAssets.resolveEnemyPortraitById("not-an-enemy"), null);

load("runtime/js/combat/strike-resolution.js");
assert.equal(window.DiceboundCombatStrikeResolution.echoDelayCap, undefined, "retired global Echo delay-cap API must stay gone");
load("runtime/js/combat/presentation.js");
const timing = window.DiceboundCombatPresentation._test.playerAttackTiming;
assert.equal(typeof timing, "function");
for (const [ordinal, expected] of [[1,180],[2,177],[5,168],[10,153],[41,60],[125,60]]) {
  assert.equal(timing("echo","ranger",ordinal).totalMs, expected, `Echo #${ordinal} should use explicit presentation cadence ${expected}ms`);
}
assert.equal(timing("normal","ranger",1).totalMs,590,"ordinary Ranger attack timing must not inherit Echo acceleration");
assert.equal(timing("crit","ranger",1).totalMs,650,"Crit timing must not inherit Echo acceleration");

const monolith = fs.readFileSync(path.join(ROOT, "runtime/js/dicebound.js"), "utf8");
for (const retired of ["enemyPortraitSVG", "db0636TieredEnemyMarkup", "v28FrogEchoCap", "__DB_V26_FAST_ECHO__", "__DB_FAST_ECHO_CAP__", "getFastEchoCap", "setFastEchoCap", "enemyArtForName:name"]) {
  assert.ok(!monolith.includes(retired), `${retired} must not return to the monolith`);
}
const boardPresentation = fs.readFileSync(path.join(ROOT, "runtime/js/board/presentation.js"), "utf8");
assert.ok(boardPresentation.includes("enemyArtForId"));
assert.ok(!boardPresentation.includes("enemyArtForName"));
const scaling = fs.readFileSync(path.join(ROOT, "runtime/js/combat/enemy-scaling-resolution.js"), "utf8");
assert.ok(!scaling.includes("enemyArtForName"), "enemy scaling must not mutate presentation art");

const itemsOracle = fs.readFileSync(path.join(ROOT, "tools/test_items_oracle.js"), "utf8");
const rejectMarker = "for(const rarity of ['artifact','mythical','omega','bogus'])";
assert.equal(itemsOracle.split(rejectMarker).length - 1, 1, "Items strict rejection loop must remain single-copy across replay runs");

console.log("WAVE10_OWNERSHIP_ORACLE PASS enemy ids + explicit art + explicit Echo presentation timing + idempotent Items oracle");
