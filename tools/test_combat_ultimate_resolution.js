const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ownerPath = path.join(__dirname, '..', 'runtime', 'js', 'combat', 'ultimate-resolution.js');
const source = fs.readFileSync(ownerPath, 'utf8');
assert(source.includes('DiceboundCombatUltimateResolution'), 'Ultimate owner global missing');
assert(source.includes('getCombatBusy'), 'Ultimate owner must consume authoritative combatBusy state, not player state');

const sandbox = { window: {}, console, Object, Math, Promise, Set, Map };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerPath });
const owner = sandbox.window.DiceboundCombatUltimateResolution;
assert(owner && owner.owner === 'combat/ultimate-resolution', 'Ultimate owner did not initialize');

function makeEnemy(name = 'Dummy', hp = 100000) {
  return { name, hp, maxHp: hp, defense: 0, poisonStacks: 0, rangerMarks: 0 };
}

function makeHarness(options = {}) {
  const trace = [];
  let combatBusy = !!options.combatBusy;
  let currentIndex = 0;
  let fastEchoCap = options.fastEchoCap || 0;
  const enemies = options.enemies || [makeEnemy()];
  const player = Object.assign({
    classId: options.classId || 'ranger', attack: 100, defense: 20, maxHp: 200, hp: 200, gold: 0, level: 10,
    ultimateCharge: 100, classUltimateBonus: 0, ultimateDamageBonus: 0, damageBonus: 0, bossDamage: 0,
    lifeSteal: 0, doubleStrike: 0, crit: 0, combatShield: 0, combatActionCount: 0, guardCooldown: 1,
    potions: 0, mythicActionCount: 0, ninjaSmoke: 0, ninjaSmokeNeed: 3, turtleGuardChain: 0,
    trainerRoster: [], trainerUltimateBonus: 0, summonerSpirits: [],
  }, options.player || {});
  // Pre-materialization compatibility: the first draft intentionally gets fixed
  // by the materializer to read the authoritative lexical combatBusy callback.
  player.combatBusy = combatBusy;
  const meta = options.meta || { pets: { fire: { unlocked: true }, ice: { unlocked: true }, wind: { unlocked: true }, earth: { unlocked: true } } };
  const pets = options.pets || { fire: { icon: 'F' }, ice: { icon: 'I' }, wind: { icon: 'W' }, earth: { icon: 'E' } };
  const effects = new Set(options.effects || []);
  const randValues = [...(options.randValues || [])];
  const pickIndexes = [...(options.pickIndexes || [])];
  const critValues = [...(options.critValues || [])];
  const chaos = options.chaos || { roll: 10, mult: 1 };
  let slimeDepth = 0;

  function living() { return enemies.filter(e => e.hp > 0); }
  function damageEnemy(enemy, amount) {
    trace.push(['damageEnemy', enemy?.name, amount, player.classUltimateBonus, player._v25CroakHitsRemaining || 0]);
    if (!enemy) return 0;
    const dealt = Math.min(enemy.hp, Math.max(0, Number(amount) || 0)); enemy.hp -= dealt; return dealt;
  }
  function damageAll(amount, secondary = 1) {
    trace.push(['damageAll', amount, secondary, player.classUltimateBonus]);
    let total = 0; living().slice().forEach((e, i) => { total += damageEnemy(e, amount * (i ? secondary : 1)); }); return total;
  }
  function healPlayer(amount) {
    trace.push(['heal', amount]);
    const before = player.hp, gain = Math.max(0, Math.min(player.maxHp - before, Math.round(Number(amount) || 0))); player.hp += gain; return gain;
  }

  const rt = {
    getPlayer: () => player, getMeta: () => meta, getCurrentEnemy: () => enemies[currentIndex] || null,
    getCurrentEnemies: () => enemies, getEncounterLead: () => options.encounterLead || enemies[0] || null,
    livingEnemies: living, getCombatBusy: () => combatBusy,
    setCombatBusy: value => { combatBusy = !!value; player.combatBusy = combatBusy; trace.push(['busy', combatBusy]); },
    selectEnemy: index => { currentIndex = index; trace.push(['select', index]); },
    isClassActive: id => options.isClassActive ? options.isClassActive(id, player) : player.classId === id,
    hasLegendaryEffect: id => effects.has(id),
    random: () => { trace.push(['random']); return 0; },
    rand: (min, max) => { const value = randValues.length ? randValues.shift() : min; trace.push(['rand', min, max, value]); return value; },
    pick: list => { const index = pickIndexes.length ? pickIndexes.shift() : 0, value = list[index % list.length]; trace.push(['pick', list.map(x => x?.name || x), index, value?.name || value]); return value; },
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    rollTieredProc: chance => { const value = critValues.length ? critValues.shift() : 0; trace.push(['crit', chance, value]); return value; },
    getSetDamageBonus: () => options.setDamageBonus || 0,
    ultimateBaseDamage: (classId, actor, bonus) => { trace.push(['ultimateBaseDamage', classId, bonus]); return Math.round(actor.attack * 2.8) + bonus; },
    scaleUltimateDamage: (damage, actor, opts) => { trace.push(['scaleUltimateDamage', damage, opts.chaosMultiplier, opts.setDamageBonus]); return Math.round(damage * (opts.chaosMultiplier || 1) * (1 + actor.classUltimateBonus) * (1 + actor.ultimateDamageBonus) * (1 + actor.damageBonus + (opts.setDamageBonus || 0))); },
    damageEnemy, damageAll, healPlayer,
    triggerStrikeElements: (target, incomingChaos) => { trace.push(['elements', target?.name, incomingChaos?.roll || null]); return options.elementResult || { totalDamage: 0, message: '' }; },
    petDamage: () => options.petDamage || 10,
    trainerPetDamage: id => (options.trainerDamage?.[id] || 10),
    syncOuroborosAttack: () => trace.push(['syncOuroboros']),
    rollD20Chaos: async action => { trace.push(['chaos', action, player.classUltimateBonus]); return chaos; },
    updateCombatUI: () => trace.push(['ui']), animateUltimate: async () => trace.push(['animateUltimate']),
    animateClassAttack: async mode => trace.push(['animateClass', mode]), setCombatText: text => trace.push(['text', text]),
    addCombatHistory: text => trace.push(['history', text]), identityFlash: text => trace.push(['flash', text]),
    playCritSfx: () => trace.push(['sfxCrit']), playHolySfx: () => trace.push(['sfxHoly']),
    delay: async ms => trace.push(['delay', ms]), getCombatActionDelay: () => 200, winCombat: async () => { trace.push(['win']); return 'win'; },
    resolveEnemyResponse: async guard => { trace.push(['enemyResponse', guard]); combatBusy = false; player.combatBusy = false; return 'response'; },
    petTurn: async () => trace.push(['petTurn']), applyMythicPantsPulse: () => options.pants || '',
    applyMythicRingPulse: () => options.ring || '', potionHealValue: fraction => fraction == null ? 40 : Math.round(40 * fraction),
    getPets: () => pets, getGagInfo: () => ({
      'Big Shoes': 'big', 'Rubber Chicken': 'chicken', 'Exploding Pie': 'pie', 'Safety Net': 'net', 'Standing Ovation': 'ovation'
    }),
    getFastEchoCap: () => fastEchoCap, setFastEchoCap: value => { fastEchoCap = value; trace.push(['fastCap', value]); },
    frogEchoCap: echo => echo >= 50 ? 8 : echo >= 10 ? 20 : echo >= 5 ? 34 : echo >= 2 ? 58 : echo >= 1 ? 85 : 0,
    dragoonActive: () => options.dragoonActive != null ? !!options.dragoonActive : player.classId === 'dragoon',
    dragoonLandingReady: () => !!player.dragoonLandingReady,
    dragoonLanding: async () => { trace.push(['dragoonLanding']); return 'landing'; },
    tickDragoonCooldown: () => trace.push(['dragoonTick']),
    slimeRougeUltimate: async () => {
      trace.push(['slimeRouge', ++slimeDepth, player.classUltimateBonus]);
      const original = player.classId; player.classId = options.slimeDonor || 'ranger';
      try { return await owner.start(); } finally { player.classId = original; slimeDepth--; }
    },
  };
  owner.configure(rt);
  return { player, enemies, trace, rt, effects, get busy() { return combatBusy; }, get fastEchoCap() { return fastEchoCap; } };
}

async function run() {
  // Generic single-target formula and action order.
  {
    const h = makeHarness({ classId: 'ranger', randValues: [3] });
    await owner._test.genericUltimate();
    const dmg = h.trace.find(x => x[0] === 'damageEnemy');
    assert.strictEqual(dmg[2], 343, 'Ranger base Ultimate formula drifted');
    assert.deepStrictEqual(h.trace.filter(x => ['chaos','animateUltimate','damageEnemy','elements','delay','enemyResponse'].includes(x[0])).map(x => x[0]), ['chaos','animateUltimate','damageEnemy','elements','delay','enemyResponse']);
  }

  // Fighter two-target path preserves 85% second target packet.
  {
    const h = makeHarness({ classId: 'fighter', enemies: [makeEnemy('A'), makeEnemy('B')], randValues: [2] });
    await owner._test.genericUltimate();
    const packets = h.trace.filter(x => x[0] === 'damageEnemy');
    assert.strictEqual(packets.length, 2); assert.strictEqual(packets[0][2], 262); assert.strictEqual(packets[1][2], 262 * .85);
  }

  // Berserker generic Ultimate delegates base and final scaling to the effective-stat service.
  {
    const h = makeHarness({ classId: 'berserker', randValues: [5] });
    await owner._test.genericUltimate();
    assert(h.trace.some(x => x[0] === 'ultimateBaseDamage' && x[1] === 'berserker' && x[2] === 5));
    assert(h.trace.some(x => x[0] === 'scaleUltimateDamage'));
  }

  // D20 chaos is consumed before its class-specific rand.
  {
    const h = makeHarness({ classId: 'd20', chaos: { roll: 16, mult: 1 }, randValues: [5], enemies: [makeEnemy('A'), makeEnemy('B')] });
    await owner._test.genericUltimate();
    const chaosAt = h.trace.findIndex(x => x[0] === 'chaos'), randAt = h.trace.findIndex(x => x[0] === 'rand'), aoeAt = h.trace.findIndex(x => x[0] === 'damageAll');
    assert(chaosAt >= 0 && chaosAt < randAt && randAt < aoeAt, 'D20 Ultimate RNG/order drifted');
  }

  // Bloodmage uses missing HP before the AoE and heals 30% after damage.
  {
    const h = makeHarness({ classId: 'bloodmage', player: { hp: 100, maxHp: 200, attack: 100 } });
    await owner._test.v11BloodmageUltimate();
    const aoe = h.trace.find(x => x[0] === 'damageAll'), heal = h.trace.find(x => x[0] === 'heal');
    assert.strictEqual(aoe[1], 480); assert(heal && heal[1] > 0); assert(h.trace.findIndex(x => x[0] === 'damageAll') < h.trace.findIndex(x => x[0] === 'heal'));
  }

  // Ranger marks are added in V16/V13 layers and always cleared in V13 finally, even on a no-op lower cast.
  {
    const a = makeEnemy('A'), b = makeEnemy('B'); a.rangerMarks = 5; b.rangerMarks = 3;
    const h = makeHarness({ classId: 'ranger', enemies: [a, b], player: { ultimateCharge: 0, classUltimateBonus: .2 } });
    await owner.start();
    assert.strictEqual(a.rangerMarks, 0); assert.strictEqual(b.rangerMarks, 0); assert(Math.abs(h.player.classUltimateBonus - .2) < 1e-9);
  }

  // Summoner missing-spirit fill consumes pick RNG in the historical loop before damage.
  {
    const h = makeHarness({ classId: 'summoner', player: { summonerSpirits: ['fire'] }, pickIndexes: [1, 1] });
    await owner._test.v15CompanionUltimate();
    const picks = h.trace.filter(x => x[0] === 'pick'); assert.strictEqual(picks.length, 4, 'Summoner duplicate-spirit retries must preserve all four seeded pick RNG draws'); assert(h.trace.findIndex(x => x[0] === 'pick') < h.trace.findIndex(x => x[0] === 'damageAll'));
  }

  // Pokémon Trainer path uses roster power and does not consume pick RNG.
  {
    const h = makeHarness({ classId: 'pokemontrainer', player: { trainerRoster: ['fire','ice'], trainerUltimateBonus: .2 }, trainerDamage: { fire: 10, ice: 20 } });
    await owner._test.v15CompanionUltimate();
    assert.strictEqual(h.trace.filter(x => x[0] === 'pick').length, 0); assert(h.trace.some(x => x[0] === 'damageAll'));
  }

  // Alchemist: animate -> +potions/heal -> AoE -> holy -> delay/response.
  {
    const h = makeHarness({ classId: 'alchemist', player: { potions: 2, hp: 100, maxHp: 200 } });
    await owner._test.v16IdentityUltimate();
    assert.strictEqual(h.player.potions, 5); const names = h.trace.map(x => x[0]);
    assert(names.indexOf('animateUltimate') < names.indexOf('heal') && names.indexOf('heal') < names.indexOf('damageAll') && names.indexOf('damageAll') < names.indexOf('sfxHoly'));
  }

  // Clown's pre/post wrapper quirks survive even when the lower Ultimate cannot fire.
  {
    const h = makeHarness({ classId: 'clown', player: { ultimateCharge: 0, clownGimmick: 'Big Shoes', combatShield: 0 }, pickIndexes: [0] });
    await owner.start();
    assert.strictEqual(h.player.combatShield, 2, 'Clown pre-barriers should happen before lower eligibility');
    assert.notStrictEqual(h.player.clownGimmick, 'Big Shoes', 'Clown gag should reroll after lower no-op');
    assert(Math.abs(h.player.classUltimateBonus) < 1e-9);
  }

  // Turtle momentum is likewise consumed by the historical wrapper after a lower no-op.
  {
    const h = makeHarness({ classId: 'turtle', player: { ultimateCharge: 0, turtleGuardChain: 4 } });
    await owner.start(); assert.strictEqual(h.player.turtleGuardChain, 0); assert(Math.abs(h.player.classUltimateBonus) < 1e-9);
  }

  // Ninja V17 adds five Smoke after a lower no-op; this bizarre behavior is intentional compatibility.
  {
    const h = makeHarness({ classId: 'ninja', player: { ultimateCharge: 0, ninjaSmoke: 0, ninjaSmokeNeed: 3 } });
    await owner.start(); assert.strictEqual(h.player.ninjaSmoke, 3); assert(h.trace.some(x => x[0] === 'history' && /five guaranteed critical strikes/.test(x[1])));
  }

  // Ninja charged Ultimate preserves five 200ms per-hit pauses before the final 850ms handoff.
  {
    const h = makeHarness({ classId: 'ninja', player: { ultimateCharge: 100, ninjaSmoke: 0, ninjaSmokeNeed: 3 }, critValues: [0,0,0,0,0] });
    await owner.start();
    const delays = h.trace.filter(x => x[0] === 'delay').map(x => x[1]);
    assert.deepStrictEqual(delays, [200,200,200,200,200,850], 'Ninja charged Ultimate preserves five 200ms per-hit pauses');
  }

  // Ouroboros bypasses lower generic/D20 logic, picks only after its first target, rolls once per hit, then calls petTurn.
  {
    const h = makeHarness({ classId: 'ouroboros', enemies: [makeEnemy('A'), makeEnemy('B')], player: { doubleStrike: 0 }, randValues: [1,1,1,1], pickIndexes: [1,0,1] });
    await owner.start();
    assert.strictEqual(h.trace.filter(x => x[0] === 'chaos').length, 0); assert.strictEqual(h.trace.filter(x => x[0] === 'rand').length, 4); assert.strictEqual(h.trace.filter(x => x[0] === 'pick').length, 3);
    assert(h.trace.findIndex(x => x[0] === 'petTurn') > h.trace.map(x => x[0]).lastIndexOf('animateClass'));
  }

  // Frog owns both speed-cap lifetime and Croak poison-hit lifetime around the lower generic loop.
  {
    const h = makeHarness({ classId: 'frog', fastEchoCap: 77, player: { doubleStrike: 1 }, randValues: Array(10).fill(0), pickIndexes: Array(10).fill(0) });
    await owner.start();
    assert.strictEqual(h.fastEchoCap, 77); const caps = h.trace.filter(x => x[0] === 'fastCap').map(x => x[1]); assert.deepStrictEqual(caps, [85, 77]);
    const packets = h.trace.filter(x => x[0] === 'damageEnemy'); assert(packets.length > 0 && packets.every(x => x[4] > 0), 'Croak hit lifetime must surround damage calls'); assert.strictEqual(h.player._v25CroakHitsRemaining, 0);
    const frogDelays = h.trace.filter(x => x[0] === 'delay').map(x => x[1]); assert.deepStrictEqual(frogDelays, [...Array(10).fill(200),850], 'Frog charged Ultimate preserves ten 200ms per-hit pauses');
  }

  // Unstable Ultimate promotes 70 charge to 100, applies -25% temporary class bonus, then restores state.
  {
    const h = makeHarness({ classId: 'fighter', effects: ['unstable_ultimate'], player: { ultimateCharge: 70, classUltimateBonus: .4 }, randValues: [2] });
    await owner.start(); const chaos = h.trace.find(x => x[0] === 'chaos'); assert(Math.abs(chaos[2] - .15) < 1e-9); assert(Math.abs(h.player.classUltimateBonus - .4) < 1e-9); assert.strictEqual(h.player.ultimateCharge, 0);
  }

  // Slime Rouge recursion re-enters the whole owner; Unstable therefore nests twice before donor cast.
  {
    const h = makeHarness({ classId: 'slimerouge', effects: ['unstable_ultimate'], slimeDonor: 'ranger', player: { ultimateCharge: 70, classUltimateBonus: .5 }, randValues: [3] });
    await owner.start(); const chaos = h.trace.find(x => x[0] === 'chaos'); assert(chaos && Math.abs(chaos[2] - 0) < 1e-9, `expected double Unstable reduction, saw ${chaos && chaos[2]}`); assert(Math.abs(h.player.classUltimateBonus - .5) < 1e-9);
    assert.strictEqual(h.trace.filter(x => x[0] === 'slimeRouge').length, 1);
  }

  // Dragoon is outermost and bypasses Unstable/D20 entirely; landing-ready intercept wins even earlier.
  {
    const h = makeHarness({ classId: 'dragoon', dragoonActive: true, effects: ['unstable_ultimate'], player: { classUltimateBonus: .5, crit: 0 }, randValues: [5], critValues: [1] });
    await owner.start(); assert.strictEqual(h.trace.filter(x => x[0] === 'chaos').length, 0); assert.strictEqual(h.player.classUltimateBonus, .5); assert(h.trace.some(x => x[0] === 'crit'));
  }
  {
    const h = makeHarness({ classId: 'dragoon', dragoonActive: true, effects: ['unstable_ultimate'], player: { dragoonLandingReady: true } });
    const result = await owner.start(); assert.strictEqual(result, 'landing'); assert.deepStrictEqual(h.trace.filter(x => ['dragoonLanding','chaos','crit'].includes(x[0])).map(x => x[0]), ['dragoonLanding']);
  }

  console.log('Combat Ultimate-resolution owner PASS: generic, D20, Bloodmage, Marks, companions, Alchemist, Clown/Turtle/Ninja quirks, Ouroboros, Frog, Unstable, Slime Rouge recursion and Dragoon ordering are deterministic');
}

run().catch(error => { console.error(error); process.exit(1); });
