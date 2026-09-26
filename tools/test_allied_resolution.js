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
const player = { name: "Hero", hp: 30, maxHp: 30, defense: 0, flatReduction: 0 };
const enemies = [
  { id: "a", name: "A", hp: 4, maxHp: 4, defense: 0 },
  { id: "b", name: "B", hp: 20, maxHp: 20, defense: 0 }
];
let current = enemies[0], turn = 3, spawns = 0, deaths = 0, kills = 0, damageDealt = 0, randomValue = 0.9;

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
  random: () => randomValue,
  rollTieredProc: chance => chance >= 1 ? Math.floor(chance) : 0,
  defenseDamageReduction: defense => Math.min(.8, defense * .03),
  damageEnemy: (enemy, raw) => { const dealt = Math.min(enemy.hp, Math.max(0, Math.round(raw))); enemy.hp -= dealt; return dealt; },
  damageHero: raw => { const dealt = Math.min(player.hp, Math.max(0, Math.round(raw))); player.hp -= dealt; return { total: dealt, hp: dealt }; },
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

  // A summon death effect is still damage by that summon even though its own HP is already zero.
  const killsBeforeEffect=kills,damageBeforeEffect=damageDealt;
  enemies[1].hp=3;current=enemies[1];
  const deathEffectSource={...first.entity,hp:0};
  const deathEffect=resolution.effectDamage(deathEffectSource,enemies[1],5,{source:"death-effect",deathEffect:true});
  assert(deathEffect.total===3&&deathEffect.killed,"allied death effect must resolve enemy damage and kill");
  assert(kills===killsBeforeEffect+1&&damageDealt===damageBeforeEffect+3,"allied death effect must retain summon damage/kill attribution");

  enemies[1].hp=20;current=enemies[1];
  turn = 4;
  await resolution.automaticPhase();
  assert(enemies[1].hp < 20, "delayed summon should join later phase");

  const victim = resolution.living()[0];
  const hit = resolution.damage(victim.instanceId, 999, { source: "test" });
  assert(hit.defeated && deaths === 1, "real HP death should resolve once");
  resolution.damage(victim.instanceId, 999, { source: "test-repeat" });
  assert(deaths === 1, "dead summon must not double-fire death callback");

  const survivor = resolution.living()[0];
  resolution.damage(survivor.instanceId, 3, { source: "test-chip", ignoreDefense: true });
  const before = resolution.living()[0].hp;
  const healed = resolution.heal(survivor.instanceId, 2, { source: "test" });
  assert(healed === 2 && resolution.living()[0].hp === before + 2, "summon healing should use own HP");

  // Harmful summon statuses resolve on the summon action phase.
  roster = allies.createRoster({ capacity: 2 });
  enemies[0].hp = 50; enemies[0].maxHp = 50; enemies[1].hp = 0; current = enemies[0]; turn = 10;
  const statusSummon = resolution.spawn({
    archetypeId:"status-test",name:"Status Skeleton",maxHp:20,hp:20,attack:4,defense:0,actsOnSummonTurn:true
  },{turn}).entity;
  resolution.applyStatus(statusSummon.instanceId,"burn",{stacks:2});
  resolution.applyStatus(statusSummon.instanceId,"poison",{stacks:2,power:.12});
  const hpBeforeDots=resolution.living()[0].hp;
  await resolution.automaticPhase();
  assert(resolution.living()[0].hp < hpBeforeDots,"Burn/Poison must damage summons before their action");

  const enemyBeforeSkip=enemies[0].hp;
  resolution.applyStatus(statusSummon.instanceId,"skip",{actions:1});
  await resolution.automaticPhase();
  assert(enemies[0].hp === enemyBeforeSkip,"Frozen/Stunned summon must lose its action");
  assert((resolution.statusSnapshot(statusSummon.instanceId).skipActions||0)===0,"control skip must consume exactly one action");

  // Confusion is same-side and can hit the hero.
  resolution.applyStatus(statusSummon.instanceId,"confusion",{actions:1});
  const heroBefore=player.hp; randomValue=0;
  const heroConfusion=await resolution.resolveEntityTurnStatus(resolution.living().find(x=>x.instanceId===statusSummon.instanceId));
  assert(heroConfusion.reason==="confusion"&&heroConfusion.confusion.targetKind==="hero","confused summon must be able to target the hero");
  assert(player.hp < heroBefore,"confused summon hero-target must deal damage");
  assert((resolution.statusSnapshot(statusSummon.instanceId).confusionActions||0)===0,"summon Confusion must consume exactly one action");

  // With one summon, the other valid same-side target is itself.
  resolution.applyStatus(statusSummon.instanceId,"confusion",{actions:1});
  const selfBefore=resolution.living()[0].hp; randomValue=.999;
  const selfConfusion=await resolution.resolveEntityTurnStatus(resolution.living()[0]);
  assert(selfConfusion.confusion.targetKind==="summon"&&selfConfusion.confusion.target===statusSummon.instanceId,"confused summon must be able to hit itself");
  assert(resolution.living()[0].hp < selfBefore,"self-targeted Confusion must damage the summon");

  // With two summons, a confused later summon can strike the other summon.
  const other=resolution.spawn({archetypeId:"other",name:"Other Skeleton",maxHp:20,hp:20,attack:3,actsOnSummonTurn:true},{turn}).entity;
  resolution.applyStatus(other.instanceId,"confusion",{actions:1});
  const firstBefore=resolution.living().find(x=>x.instanceId===statusSummon.instanceId).hp; randomValue=.5;
  const otherConfusion=await resolution.resolveEntityTurnStatus(resolution.living().find(x=>x.instanceId===other.instanceId));
  assert(otherConfusion.confusion.target===statusSummon.instanceId,"confused summon must be able to target another summon");
  assert(resolution.living().find(x=>x.instanceId===statusSummon.instanceId).hp < firstBefore,"other-summon Confusion target must take damage");

  console.log("Allied combat resolution: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
