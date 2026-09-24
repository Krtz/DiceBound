"use strict";
const assert = require("assert"), fs = require("fs"), vm = require("vm"), path = require("path");
const context = vm.createContext({ window: {}, console, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../runtime/js/classes/registry.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../runtime/js/classes/invoker.js"), "utf8"), context);
const classes = context.window.DiceboundClasses, registry = classes.createRegistry();
assert.equal(context.window.DiceboundInvoker, undefined, "focused Invoker owner leaked as a peer public global");
assert.equal(registry.invoker.name, "Invoker");
assert.deepEqual([...registry.invoker.tags], ["ranged", "occult", "mana", "elemental", "combo"]);
assert.equal(registry.invoker.base.maxHp, 32); assert.equal(registry.invoker.base.attack, 6);
let player = { classId: "invoker", attack: 10, maxHp: 32, hp: 32, mana: 25, maxMana: 100, defense: 0, dodge: .02, combatShield: 0, damageBonus: 0, bossDamage: 0, crit: 0, doubleStrike: 0, poisonOnHitChance: 0, lifeSteal: 0, _invoker: null };
const enemies = [{ name: "test", hp: 999, maxHp: 999, defense: 0 }]; let turn = 4, spent = 0, attackCalls = [], histories = [], attackGate = null;
let unstableActive=false,unstableRule={name:"Unstable Ultimate",chargeThreshold:70,damageMultiplier:.75};
classes.configureInvoker({
  getPlayer: () => player, getMeta: () => ({}), isClassActive: id => id === "invoker", getCurrentEnemy: () => enemies[0], getCurrentEnemies: () => enemies, livingEnemies: () => enemies.filter(x => x.hp > 0), getCombatBusy: () => false, setCombatBusy: () => {},
  damageEnemy: (enemy, amount) => { enemy.hp -= Math.round(amount); return Math.round(amount); }, damageAll: amount => enemies.reduce((n, enemy) => n + Math.round(amount), 0), healPlayer: amount => amount, addEnemyBurn: () => 0,
  updateCombatUI: () => {}, setCombatText: () => {}, addCombatHistory: text => histories.push(text), identityFlash: () => {}, delay: async () => {}, winCombat: () => {}, resolveEnemyResponse: () => {}, selectEnemy: () => {}, animateUltimate: async () => {}, animateClassAttack: async () => {}, clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)), getEncounterLead: () => ({}), getSetDamageBonus: () => 0, getEncounterTurn: () => turn, setEncounterTurn: value => { turn = value; }, recordManaSpenderCast: () => { spent++; }, saveMeta: () => {}, checkDynamicClassUnlocks: () => {}, document: () => ({ getElementById: () => null }),
  playerAttack: async options => { attackCalls.push({ options: { ...(options || {}) }, multiplier: options?.damageMultiplier || 1 }); if(attackGate)await attackGate; classes.invokerAfterPlayerAction(options?.postActionKind || "attack"); return options; },
  manaGain: amount => { const before = player.mana || 0; player.mana = Math.min(player.maxMana || 0, before + amount); return player.mana - before; },
  resolveManaBuilderGain: (id,{multiplier=1}={}) => ((id==="invoker"?25:0)+Math.max(0,Number(player.manaBuilderBonus)||0))*Math.max(0,Number(multiplier)||0),
  rollTieredProc: () => 0,
  triggerStrikeElements: () => ({ totalDamage: 0, message: "" }),
  playElementAnimation: () => {},
  hasLegendaryEffect: id => id==="unstable_ultimate"&&unstableActive,
  legendaryEffect: id => id==="unstable_ultimate"?unstableRule:null
});
for (const [input, expected] of [["bbb", "bbb"], ["bgb", "bbg"], ["rbb", "bbr"], ["ggg", "ggg"], ["gbg", "bgg"], ["rgg", "ggr"], ["rrr", "rrr"], ["rbr", "brr"], ["rgr", "grr"], ["brg", "bgr"]]) { player._invoker = { orbs: input.split("").map(x => ({ b: "blue", g: "green", r: "red" }[x])) }; assert.equal(classes.invokerRecipeFor(), expected, input); assert.ok(classes.invokerRecipeInfo()); }
player._invoker = null; classes._invokerTest.addOrb("blue"); classes._invokerTest.addOrb("green"); classes._invokerTest.addOrb("red"); classes._invokerTest.addOrb("red"); assert.deepEqual([...player._invoker.orbs], ["green", "red", "red"]);
player._invoker = { orbs: ["blue", "blue", "blue"] }; assert.deepEqual(JSON.parse(JSON.stringify(classes.invokerOrbBonuses())), { blue: 3, green: 0, red: 0, defense: 3, guardPower: .12, echo: 0, manaGeneration: 0, damage: 0 });
player._invoker = { orbs: ["green", "green", "green"] }; assert.equal(classes.invokerGeneratorManaMultiplier(), 1.3); assert.ok(Math.abs(classes.invokerActionBonuses().echo - .15) < 1e-12);
player._invoker = { orbs: ["red", "red", "red"] }; assert.equal(classes.invokerOutgoingMultiplier(), 1.21);
player._invoker = { orbs: [] }; classes.invokerAfterPlayerAction("attack"); assert.equal(player._invoker.orbs.length, 0, "ordinary attack adds no orb"); classes.invokerAfterPlayerAction("guard"); assert.deepEqual([...player._invoker.orbs], ["blue"]); classes.invokerAfterPlayerAction("generator"); assert.deepEqual([...player._invoker.orbs], ["blue", "green"]); classes.invokerAfterPlayerAction("spender"); assert.deepEqual([...player._invoker.orbs], ["blue", "green", "red"]);

(async () => {
  player._invoker = { orbs: [], alacrity: 0, ghostDodge: 0, spirit: 0, spiritShred: {} };
  player.mana = 10; player.maxMana = 100; player.manaBuilderBonus = 5; attackCalls = []; histories = [];
  await classes.invokerQuasStrike();
  assert.deepEqual([...player._invoker.orbs], ["blue"]);
  assert.equal(attackCalls[0].options.echoMultiplier, .70); assert.equal(attackCalls[0].options.postActionKind, "orb:blue"); assert.equal(attackCalls[0].multiplier, .85);
  await classes.invokerWexStrike();
  assert.deepEqual([...player._invoker.orbs], ["blue", "green"]);
  assert.equal(player.mana, 40, "Wex Strike must add 25 base Mana plus builder bonus before the Green orb exists");
  assert(histories.some(text=>text.includes("Wex Strike generates 30 Mana")),"Wex must report its actual resolved Mana gain");
  assert.equal(attackCalls[1].options.echoMultiplier, 1.20); assert.equal(attackCalls[1].options.postActionKind, "orb:green"); assert.equal(attackCalls[1].multiplier, .85);
  await classes.invokerExortStrike();
  assert.deepEqual([...player._invoker.orbs], ["blue", "green", "red"]);
  assert.equal(attackCalls[2].options.echoMultiplier, .70); assert.equal(attackCalls[2].options.postActionKind, "orb:red"); assert.equal(attackCalls[2].multiplier, 1.20);

  // #411: Wex is a direct Invoker route, so it needs its own in-flight guard.
  player._invoker = { orbs: [], alacrity: 0, ghostDodge: 0, spirit: 0, spiritShred: {} };
  player.mana=0;player.manaBuilderBonus=16;attackCalls=[];histories=[];
  let releaseAttack;attackGate=new Promise(resolve=>{releaseAttack=resolve;});
  const firstWex=classes.invokerWexStrike();await Promise.resolve();
  const secondWex=classes.invokerWexStrike();await Promise.resolve();
  assert.equal(player.mana,41,"stacked Quick Channel must resolve once as 25 + 16 Mana");
  assert.equal(attackCalls.length,1,"rapid Wex re-entry must not start a second attack or Mana grant");
  releaseAttack();await firstWex;await secondWex;attackGate=null;
  assert(histories.some(text=>text.includes("Wex Strike generates 41 Mana")));

  player._invoker = { orbs: [], alacrity: 0, ghostDodge: 0, spirit: 0, spiritShred: {} };
  player.attack = 10; player.doubleStrike = 1; player.damageBonus = 0; player.bossDamage = 0; player.mana = 100; enemies[0].hp = 999; spent = 0;
  await classes.invokerElementalLance();
  assert.equal(999 - enemies[0].hp, 27, "Elemental Lance must convert half of 100% Echo into +50% spell damage");
  assert.equal(player.mana, 50); assert.equal(spent, 1); assert.deepEqual([...player._invoker.orbs], ["red"]);

  // Timed effects spend successful player actions but never manufacture an
  // orb from Potion or Invoke. This is the critical no-shadow-action rule.
  player._invoker = { orbs: ["blue"], alacrity: 2, ghostDodge: 0, spirit: 0, spiritShred: {} };
  classes.invokerAfterPlayerAction("potion");
  assert.deepEqual([...player._invoker.orbs], ["blue"]);
  assert.equal(player._invoker.alacrity, 1);
  classes.invokerAfterPlayerAction("invoke");
  assert.equal(player._invoker.alacrity, 0);

  // #337: Unstable Ultimate source values govern Invoke threshold and damaging formula potency.
  unstableActive=true;unstableRule={name:"Unstable Ultimate",chargeThreshold:63,damageMultiplier:.42};
  player.invokerDoubleInvocation=false;player.invokerPerfected=false;player.damageBonus=0;player.bossDamage=0;player.attack=10;
  player._invoker={orbs:["red","red","red"],alacrity:0,ghostDodge:0,spirit:0,spiritShred:{},firstTrinity:false,previousRecipe:"",doubleInvoke:false};
  enemies[0].hp=999;player.ultimateCharge=62;
  assert.equal(await classes.invokerUltimate(),false,"Invoke must use the Legendary owner's charge threshold");
  assert.equal(enemies[0].hp,999);assert.equal(player.ultimateCharge,62);
  player.ultimateCharge=63;await classes.invokerUltimate();
  assert.equal(999-enemies[0].hp,22,"Sun Strike damage must use the Legendary owner's 42% multiplier exactly once");
  assert.equal(player.ultimateCharge,0);

  // Utility-only Invoke formulae use the threshold but keep their authored utility values.
  player.combatShield=0;player.dodge=.02;player.ultimateCharge=63;
  player._invoker={orbs:["blue","blue","green"],alacrity:0,ghostDodge:0,spirit:0,spiritShred:{},firstTrinity:false,previousRecipe:"",doubleInvoke:false};
  await classes.invokerUltimate();
  assert.equal(player.combatShield,2,"Unstable Ultimate must not scale Ghost Walk barriers");
  assert.ok(Math.abs(player._invoker.ghostDodge-.35)<1e-12,"Unstable Ultimate must not scale Ghost Walk Dodge");
  unstableActive=false;

  // Double Invocation applies a named authored equivalent to Ghost Walk:
  // one additional Barrier, while the temporary Dodge remains its fixed value.
  player.dodge = .02; player.combatShield = 0; player.ultimateCharge = 100;
  player.invokerDoubleInvocation = true;
  player._invoker = { orbs: ["blue", "blue", "green"], alacrity: 0, ghostDodge: 0, spirit: 0, spiritShred: {}, firstTrinity: false, previousRecipe: "", doubleInvoke: false };
  await classes.invokerUltimate();
  assert.equal(player.combatShield, 3);
  assert.ok(Math.abs(player.dodge - .37) < 1e-12);
  assert.equal(player._invoker.ghostDodge, .35);

  classes.invokerResetCombat();
  assert.equal(player._invoker, undefined, "combat-only orb state must not survive reset");
  console.log("Invoker deterministic registry, recipes, three-strike orb actions, Echo-scaled Lance, passives, timed-effect and double-invocation contracts: PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
