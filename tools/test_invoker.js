"use strict";
const assert = require("assert"), fs = require("fs"), vm = require("vm"), path = require("path");
const context = vm.createContext({ window: {}, console, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../runtime/js/classes/registry.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../runtime/js/classes/invoker.js"), "utf8"), context);
const registry = context.window.DiceboundClasses.createRegistry(), invoker = context.window.DiceboundInvoker;
assert.equal(registry.invoker.name, "Invoker");
assert.deepEqual([...registry.invoker.tags], ["ranged", "occult", "mana", "elemental", "combo"]);
assert.equal(registry.invoker.base.maxHp, 32); assert.equal(registry.invoker.base.attack, 6);
let player = { classId: "invoker", attack: 10, maxHp: 32, hp: 32, mana: 25, maxMana: 100, defense: 0, dodge: .02, combatShield: 0, damageBonus: 0, bossDamage: 0, _invoker: null };
const enemies = [{ name: "test", hp: 999, maxHp: 999, defense: 0 }]; let turn = 4, spent = 0;
invoker.configure({
  getPlayer: () => player, getMeta: () => ({}), isClassActive: id => id === "invoker", getCurrentEnemy: () => enemies[0], getCurrentEnemies: () => enemies, livingEnemies: () => enemies.filter(x => x.hp > 0), getCombatBusy: () => false, setCombatBusy: () => {},
  damageEnemy: (enemy, amount) => { enemy.hp -= Math.round(amount); return Math.round(amount); }, damageAll: amount => enemies.reduce((n, enemy) => n + Math.round(amount), 0), healPlayer: amount => amount, addEnemyBurn: () => 0,
  updateCombatUI: () => {}, setCombatText: () => {}, addCombatHistory: () => {}, identityFlash: () => {}, delay: async () => {}, winCombat: () => {}, resolveEnemyResponse: () => {}, selectEnemy: () => {}, animateUltimate: async () => {}, animateClassAttack: async () => {}, clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)), getEncounterLead: () => ({}), getSetDamageBonus: () => 0, getEncounterTurn: () => turn, setEncounterTurn: value => { turn = value; }, recordManaSpenderCast: () => { spent++; }, saveMeta: () => {}, checkDynamicClassUnlocks: () => {}, document: () => ({ getElementById: () => null })
});
for (const [input, expected] of [["bbb", "bbb"], ["bgb", "bbg"], ["rbb", "bbr"], ["ggg", "ggg"], ["gbg", "bgg"], ["rgg", "ggr"], ["rrr", "rrr"], ["rbr", "brr"], ["rgr", "grr"], ["brg", "bgr"]]) { player._invoker = { orbs: input.split("").map(x => ({ b: "blue", g: "green", r: "red" }[x])) }; assert.equal(invoker.recipeFor(), expected, input); assert.ok(invoker.recipeInfo()); }
player._invoker = null; invoker._test.addOrb("blue"); invoker._test.addOrb("green"); invoker._test.addOrb("red"); invoker._test.addOrb("red"); assert.deepEqual([...player._invoker.orbs], ["green", "red", "red"]);
player._invoker = { orbs: ["blue", "blue", "blue"] }; assert.deepEqual(JSON.parse(JSON.stringify(invoker.orbBonuses())), { blue: 3, green: 0, red: 0, defense: 3, guardPower: .12, echo: 0, manaGeneration: 0, damage: 0 });
player._invoker = { orbs: ["green", "green", "green"] }; assert.equal(invoker.generatorManaMultiplier(), 1.3); assert.ok(Math.abs(invoker.actionBonuses().echo - .15) < 1e-12);
player._invoker = { orbs: ["red", "red", "red"] }; assert.equal(invoker.outgoingMultiplier(), 1.21);
player._invoker = { orbs: [] }; invoker.afterPlayerAction("attack"); assert.equal(player._invoker.orbs.length, 0, "ordinary attack adds no orb"); invoker.afterPlayerAction("guard"); assert.deepEqual([...player._invoker.orbs], ["blue"]); invoker.afterPlayerAction("generator"); assert.deepEqual([...player._invoker.orbs], ["blue", "green"]); invoker.afterPlayerAction("spender"); assert.deepEqual([...player._invoker.orbs], ["blue", "green", "red"]);

(async () => {
  // Timed effects spend successful player actions but never manufacture an
  // orb from Potion or Invoke. This is the critical no-shadow-action rule.
  player._invoker = { orbs: ["blue"], alacrity: 2, ghostDodge: 0, spirit: 0, spiritShred: {} };
  invoker.afterPlayerAction("potion");
  assert.deepEqual([...player._invoker.orbs], ["blue"]);
  assert.equal(player._invoker.alacrity, 1);
  invoker.afterPlayerAction("invoke");
  assert.equal(player._invoker.alacrity, 0);

  // Double Invocation applies a named authored equivalent to Ghost Walk:
  // one additional Barrier, while the temporary Dodge remains its fixed value.
  player.dodge = .02; player.combatShield = 0; player.ultimateCharge = 100;
  player.invokerDoubleInvocation = true;
  player._invoker = { orbs: ["blue", "blue", "green"], alacrity: 0, ghostDodge: 0, spirit: 0, spiritShred: {}, firstTrinity: false, previousRecipe: "", doubleInvoke: false };
  await invoker.invokeUltimate();
  assert.equal(player.combatShield, 3);
  assert.ok(Math.abs(player.dodge - .37) < 1e-12);
  assert.equal(player._invoker.ghostDodge, .35);

  invoker.resetCombat();
  assert.equal(player._invoker, undefined, "combat-only orb state must not survive reset");
  console.log("Invoker deterministic registry, recipes, FIFO, passives, action-orb, timed-effect and double-invocation contracts: PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
