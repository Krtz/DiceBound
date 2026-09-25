const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.createContext(context);
for (const file of ["runtime/js/combat/allied-entities.js","runtime/js/combat/targeting.js","runtime/js/combat/allied-resolution.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const allies = context.window.DiceboundCombatAllies;
const resolution = context.window.DiceboundCombatAllyResolution;
let roster = allies.createRoster({ capacity: 2 });
const player = { name: "Hero", hp: 30, maxHp: 30 };
const enemies = [
  { id: "a", name: "A", hp: 4, maxHp: 4, defense: 0 },
  { id: "b", name: "B", hp: 20, maxHp: 20, defense: 0 }
];
let current = enemies[0], turn = 3, spawns = 0, deaths = 0, kills = 0, damageDealt = 0;

function assert(condition, message) { if (!condition) throw new Error(message); }
function livingEnemies() { return enemies.filter(enemy => enemy.hp > 0); }

resolution.configure({
  getRoster: () => roster,
  setRoster: value => { roster = value; },
  getPlayer: () => player,
  getEncounterTurn: () => turn,
  getCurrentEnemy: () => current,
  getCurrentEnemies: () => enemies,
  livingEnemies,
  selectEnemy: index => { current = enemies[index] || null; },
  random: () => 0.9,
  rollTieredProc: chance => chance >= 1 ? Math.floor(chance) : 0,
  defenseDamageReduction: defense => Math.min(.8, defense * .03),
  damageEnemy: (enemy, raw) => { const dealt = Math.min(enemy.hp, Math.max(0, Math.round(raw))); enemy.hp -= dealt; return dealt; },
  setCombatText: () => {},
  addCombatHistory: () => {},
  updateCombatUI: () => {},
  delay: async () => {},
  onSpawn: () => { spawns++; },
  onDeath: () => { deaths++; },
  onKill: () => { kills++; },
  onDamageDealt: (_entity, amount) => { damageDealt += amount; }
});

const first = resolution.spawn({ archetypeId: "skeleton-warrior", name: "Skeleton 1", maxHp: 10, hp: 10, attack: 5, defense: 2, actsOnSummonTurn: true }, { turn });
const second = resolution.spawn({ archetypeId: "slow", name: "Slow", maxHp: 10, hp: 10, attack: 9, actsOnSummonTurn: false }, { turn });
assert(spawns === 2 && resolution.living().length === 2, "spawn callbacks and roster should be live");

(async () => {
  const phase = await resolution.automaticPhase();
  assert(phase.length === 1, "only summon eligible on creation turn should act");
  assert(enemies[0].hp === 0, "first automatic summon should kill selected enemy");
  assert(current === enemies[1], "summon kill should reconcile selected enemy");
  assert(kills === 1 && damageDealt === 4, "summon kill/damage attribution should be exact");

  turn = 4;
  await resolution.automaticPhase();
  assert(enemies[1].hp < 20, "delayed summon should join later phase");

  const victim = resolution.living()[0];
  const hit = resolution.damage(victim.instanceId, 999, { source: "test" });
  assert(hit.defeated && deaths === 1, "real HP death should resolve once");
  resolution.damage(victim.instanceId, 999, { source: "test-repeat" });
  assert(deaths === 1, "dead summon must not double-fire death callback");

  const survivor = resolution.living()[0];
  survivor.hp = Math.max(1, survivor.hp - 3);
  roster = allies.normalizeRoster(roster);
  const before = resolution.living()[0].hp;
  const healed = resolution.heal(survivor.instanceId, 2, { source: "test" });
  assert(healed === 2 && resolution.living()[0].hp === before + 2, "summon healing should use own HP");

  console.log("Allied combat resolution: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
