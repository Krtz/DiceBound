"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const runtime = path.join(__dirname, "..", "runtime", "js");
const read = (relative) => fs.readFileSync(path.join(runtime, relative), "utf8");
const window = {};
const context = vm.createContext({ window, console, Proxy, Reflect, Object, Array, Math, TypeError });
window.window = window;
vm.runInContext(read("events/reward-policy.js"), context, { filename: "events/reward-policy.js" });
vm.runInContext(read("core/runtime-services.js"), context, { filename: "core/runtime-services.js" });
vm.runInContext(read("powerups/registry.js"), context, { filename: "powerups/registry.js" });

assert.ok(Object.isFrozen(window.DiceboundRuntimeServices));
assert.ok(Object.isFrozen(window.DiceboundPowerupRegistry));

const freshPlayer = () => ({
  level: 1,
  classId: "ranger",
  attack: 10,
  defense: 5,
  maxHp: 100,
  hp: 50,
  gold: 0,
  goldBonus: 0.5,
  ultimateCharge: 90,
  ultimateDamageBonus: 0,
  poisonOnHitChance: 0,
  poisonStackPower: 0.12,
  lifeSteal: 0,
  classElementProcs: {},
});
let activePlayer = freshPlayer();
let nightmare = false;
let healed = 0;
let signatureApplies = 0;
let signatureDescription = "Perfected Signature — Ranger: current live effect.";
const services = window.DiceboundRuntimeServices.createPowerupServices({
  run: { getPlayer: () => activePlayer },
  economy: {
    goldReward: (amount) => Math.round(amount * (1 + activePlayer.goldBonus)),
    goldBaseFor: (source, level, multiplier) => window.DiceboundEventRewards.goldBaseFor(source, level, multiplier),
    isNightmare: () => nightmare,
  },
  combat: { heal: (amount) => { healed += amount; activePlayer.hp = Math.min(activePlayer.maxHp, activePlayer.hp + amount); return amount; } },
  rules: { clamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
  content: {
    elementIds: ["fire", "ice", "electric", "nature", "light", "void"],
    classHasTag: (classId, tag) => tag === "poison" && ["frog", "ouroboros", "ninja", "slime", "slimerouge"].includes(classId),
  },
  signatures: {
    applyCurrent: () => { signatureApplies += 1; return "signature-applied"; },
    describeCurrent: () => signatureDescription,
  },
});
assert.ok(Object.isFrozen(services));
assert.ok(Object.isFrozen(services.economy));
assert.deepEqual(Array.from(services.content.elementIds), ["fire", "ice", "electric", "nature", "light", "void"]);

const registry = window.DiceboundPowerupRegistry.createRegistry(services);
assert.equal(registry.length, 209);
assert.equal(new Set(registry.map((powerup) => powerup.id)).size, 209);
assert.deepEqual(
  JSON.parse(JSON.stringify(registry.filter((powerup) => powerup.classId === "invoker").map((powerup) => [powerup.id, powerup.rarity]))),
  [["invoker_orb_theory", "common"], ["invoker_quas_mastery", "uncommon"], ["invoker_wex_mastery", "uncommon"], ["invoker_exort_mastery", "uncommon"], ["invoker_mnemonic_recursion", "rare"], ["invoker_perfect_formula", "rare"], ["invoker_double_invocation", "epic"], ["invoker_cataclysm", "legendary"]],
);
assert.equal(registry.find((powerup) => powerup.id === "invoker_cataclysm").achievementGate, "achievement:invoker-tenfold-memory");
const statHeist = registry.find((powerup) => powerup.id === "rogue_grand_larceny");
assert.ok(statHeist && statHeist.name === "Stat Heist");
assert.equal(statHeist.rarity, "rare");
assert.equal(statHeist.unique, true);
const packDiscipline = registry.find((powerup) => powerup.id === "beastmaster_pack");
const deeperCircle = registry.find((powerup) => powerup.id === "summoner_deeper_circle");
assert.match(packDiscipline.desc, /additional 10% of your Attack/);
assert.match(deeperCircle.desc, /additional 10% of your Attack/);

const attack = registry.find((powerup) => powerup.id === "attack");
attack.apply();
assert.equal(activePlayer.attack, 11);
const firstPlayer = activePlayer;
activePlayer = freshPlayer();
attack.apply();
assert.equal(activePlayer.attack, 11, "live player port did not follow reset/replacement state");
assert.equal(firstPlayer.attack, 11, "stale player object was mutated after replacement");

const purse = registry.find((powerup) => powerup.id === "purse");
assert.equal(purse.desc, "Gain 74 gold now.");
nightmare = true;
assert.equal(purse.desc, "Gain 74 gold now.", "Heavy Purse copy should expose the resolved reward, not the internal formula");
purse.apply();
assert.equal(activePlayer.gold, 74);
activePlayer.level = 10;
activePlayer.goldBonus = 0.8;
assert.equal(purse.desc, "Gain 315 gold now.");
purse.apply();
assert.equal(activePlayer.gold, 389, "mechanic did not consume the same level-scaled modified reward shown by the description");

const mending = registry.find((powerup) => powerup.id === "mending");
mending.apply();
assert.equal(healed, 25);

const vessel = registry.find((powerup) => powerup.id === "rare_ultimate_vessel");
assert.ok(vessel, "Ultimate Vessel registry ID drifted");
vessel.apply();
assert.equal(activePlayer.ultimateCharge, 100);
assert.equal(activePlayer.ultimateDamageBonus, 0.1);

const elemental = registry.find((powerup) => String(powerup.apply).includes("DIBO_ELEMENTS.forEach"));
assert.ok(elemental, "element-list powerup was not found");
elemental.apply();
for (const id of services.content.elementIds) assert.equal(activePlayer.classElementProcs[id], 0.02);

const throne = registry.find((powerup) => powerup.id === "legendary_venom_throne_v27");
assert.ok(throne, "Throne of Venom registry ID drifted");
throne.apply();
assert.equal(activePlayer.poisonOnHitChance, 0.5);
assert.ok(Math.abs(activePlayer.poisonStackPower - 0.32) < 1e-12, "non-poison classes must receive the intended +20 poison-damage points");
assert.equal(activePlayer.lifeSteal, 0.1);
activePlayer = freshPlayer();
activePlayer.classId = "frog";
throne.apply();
assert.equal(activePlayer.poisonOnHitChance, 0.5);
assert.ok(Math.abs(activePlayer.poisonStackPower - 0.52) < 1e-12, "poison-tagged classes must receive the intended +40 poison-damage points");
assert.equal(activePlayer.lifeSteal, 0.1);

const signature = registry.find((powerup) => powerup.id === "perfected_signature");
assert.equal(signature.apply(), "signature-applied");
assert.equal(signatureApplies, 1);
assert.equal(window.DiceboundPowerupRegistry.describe(signature, services), signatureDescription);
signatureDescription = "Perfected Signature — Sorcerer: recomputed live effect.";
assert.equal(window.DiceboundPowerupRegistry.describe(signature, services), signatureDescription);

const secondRegistry = window.DiceboundPowerupRegistry.createRegistry(services);
registry[0].name = "mutated test copy";
assert.notEqual(secondRegistry[0].name, registry[0].name, "registry factory leaked mutable entry state");

function snapshotValue(value) {
  if (typeof value === "function") return { function: String(value).replace(/\s+/g, " ").trim() };
  if (Array.isArray(value)) return value.map(snapshotValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, snapshotValue(nested)]));
  return value;
}
function snapshotEntry(entry) {
  const result = {};
  for (const key of Reflect.ownKeys(entry)) {
    const descriptor = Object.getOwnPropertyDescriptor(entry, key);
    result[key] = descriptor.get
      ? { getter: String(descriptor.get).replace(/\s+/g, " ").trim() }
      : snapshotValue(descriptor.value);
  }
  return result;
}
const snapshot = JSON.stringify(secondRegistry.map(snapshotEntry));
const digest = crypto.createHash("sha256").update(snapshot).digest("hex");
const expectedDigest = "728b05b1bb9dd9025ce064cc2d4b1e85b9f2a436ba663a669e09167bb31e6598";
assert.equal(digest, expectedDigest, "canonical powerup registry snapshot drifted");

for (const invalid of [{}, { apiVersion: 1 }]) {
  assert.throws(() => window.DiceboundPowerupRegistry.createRegistry(invalid), /requires/);
}

const moduleSource = read("powerups/registry.js");
assert.doesNotMatch(moduleSource, /window\.DiceboundPerfectedSignature/);
assert.doesNotMatch(moduleSource, /\bnightmareMode\b/);
assert.doesNotMatch(moduleSource, /\bCLASSES\b/, "Powerup registry must not reach through to composition-local class data");
assert.doesNotMatch(moduleSource, /modifiedGold\(100\)/, "Heavy Purse must not regress to the flat 100-gold implementation");

console.log(`Powerup service extraction PASS: 209 exact entries, live reset-safe state, class-tag-safe Throne of Venom, digest ${digest}`);
