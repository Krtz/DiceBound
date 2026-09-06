const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ownerPath = path.join(__dirname, '..', 'runtime', 'js', 'combat', 'guard-resolution.js');
const source = fs.readFileSync(ownerPath, 'utf8');
assert(source.includes('window.DiceboundCombatGuardResolution = api;'), 'Guard owner must use canonical direct global assignment');

const sandbox = { window: {}, console, Object, Math, Promise, Set, Map };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerPath });
const owner = sandbox.window.DiceboundCombatGuardResolution;
assert(owner && owner.owner === 'combat/guard-resolution', 'Guard owner did not initialize');

function makeEnemy(name = 'Dummy', hp = 1000) {
  return { name, hp, maxHp: hp, defense: 0 };
}

function makeHarness(options = {}) {
  const trace = [];
  const enemy = options.enemy || makeEnemy();
  const enemies = options.enemies || [enemy];
  let combatBusy = !!options.combatBusy;
  const effects = new Set(options.effects || []);
  const randomValues = [...(options.randomValues || [0])];
  const tierValues = [...(options.tierValues || [0])];
  const player = Object.assign({
    classId: options.classId || 'ranger',
    attack: 10, defense: 4, defenseAttackScale: .2,
    maxHp: 100, hp: 90,
    guardCooldown: 0, guardDelay: 2, guardPower: .2,
    ultimateCharge: 0, ultimateGuardGain: 14,
    guardHeal: 0, guardShield: 0, guardCounter: 0,
    combatShield: 0, doubleStrike: 0,
    monkCombo: 3,
    fighterCounterReady: false, fighterCounterStacks: 0, fighterCounterMax: 2,
    turtleCrushReady: false, turtleGuardChain: 0, turtleGuardMax: 5,
    guardElementProcBonus: 0,
    guardManaGain: 6, mana: 0, maxMana: 100,
    paladinGrace: 0,
    _eventHorizonGuards: 0,
    equipment: { weapon: null, offhand: null }
  }, options.player || {});

  function livingEnemies() { return enemies.filter(e => e.hp > 0); }
  function classActive(id) { return options.isClassActive ? options.isClassActive(id, player) : player.classId === id; }
  function traceCall(name, ...args) { trace.push([name, ...args]); }

  const rt = {
    getPlayer: () => player,
    getCurrentEnemy: () => livingEnemies()[0] || null,
    livingEnemies,
    getCombatBusy: () => combatBusy,
    setCombatBusy: value => { combatBusy = !!value; traceCall('busy', combatBusy); },
    rollD20Chaos: async action => { traceCall('chaos', action); return options.chaos || {}; },
    chargeUltimate: amount => { player.ultimateCharge = Math.max(0, Math.min(100, player.ultimateCharge + amount)); traceCall('charge', amount); },
    healPlayer: amount => { const before = player.hp; player.hp = Math.min(player.maxHp, player.hp + amount); const healed = player.hp - before; traceCall('heal', amount, healed); return healed; },
    damageEnemy: (target, amount) => { const dealt = Math.min(target?.hp || 0, Math.max(0, Number(amount) || 0)); if (target) target.hp -= dealt; traceCall('damage', amount, dealt); return dealt; },
    triggerElementEffect: (key, target, meta) => { traceCall('element', key, target?.name || null, meta?.source || null); return { message: `${key} proc` }; },
    getDiboElements: () => options.diboElements || ['fire', 'ice'],
    applyMythicPantsPulse: () => { traceCall('pants'); return options.pants || ''; },
    updateCombatUI: () => traceCall('ui'),
    setCombatText: text => traceCall('text', text),
    tone: (...args) => traceCall('tone', ...args),
    delay: async ms => traceCall('delay', ms),
    winCombat: async () => { traceCall('win'); return 'win'; },
    resolveEnemyResponse: async (guarded, bonus) => { traceCall('response', guarded, bonus); combatBusy = false; return 'response'; },
    isClassActive: classActive,
    classIdentityId: () => options.identityId || player.classId,
    classHasMechanic: tag => !!options.mechanics?.includes(tag),
    getClassTags: id => options.classTags?.[id] || [],
    gameplayTalentRank: id => options.talentRanks?.[id] || 0,
    getWeaponElement: () => options.weaponElement ?? player.equipment?.weapon?.element ?? null,
    getActivePetElement: () => options.petElement ?? null,
    getElementKeys: () => options.elementKeys || ['fire', 'ice', 'void'],
    random: () => { const value = randomValues.length ? randomValues.shift() : 0; traceCall('random', value); return value; },
    pick: list => { const value = list[options.pickIndex || 0]; traceCall('pick', value); return value; },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    addCombatHistory: text => traceCall('history', text),
    identityFlash: text => traceCall('flash', text),
    manaGain: amount => { const before = player.mana || 0; player.mana = Math.min(player.maxMana || 100, before + amount); const gained = player.mana - before; traceCall('mana', amount, gained); return gained; },
    hasMythicPiece: slot => options.mythicSlots?.includes(slot) || false,
    hasLegendaryEffect: id => effects.has(id),
    rollTieredProc: chance => { const value = tierValues.length ? tierValues.shift() : 0; traceCall('tier', chance, value); return value; },
    dragoonActive: () => options.dragoonActive != null ? !!options.dragoonActive : player.classId === 'dragoon',
    dragoonLandingReady: () => !!player.dragoonLandingReady,
    dragoonLanding: async () => { traceCall('dragoonLanding'); return 'landing'; },
    tickDragoonCooldown: () => { player.dragoonJumpCooldown = Math.max(0, (player.dragoonJumpCooldown || 0) - 1); traceCall('dragoonTick'); },
    invokeGuardAction: async (...args) => {
      if (options.invokeGuardAction) return options.invokeGuardAction({ player, trace, args, rt });
      traceCall('invokeGuard');
      return owner.guardAction(...args);
    }
  };

  owner.configure(rt);
  return { player, enemy, enemies, trace, rt, effects, get combatBusy() { return combatBusy; } };
}

async function run() {
  // Ordinary Guard order and enemy-response contract, including the historical
  // implicit undefined return after awaiting the enemy response.
  {
    const h = makeHarness({
      chaos: { guardBonus: .25 }, pants: 'pants pulse',
      player: { guardHeal: 5, guardShield: 1, guardCounter: .5 }
    });
    const result = await owner.guardAction();
    assert.strictEqual(result, undefined);
    assert.strictEqual(h.player.guardCooldown, 2);
    assert.strictEqual(h.player.ultimateCharge, 14);
    assert.strictEqual(h.player.hp, 95);
    assert.strictEqual(h.player.combatShield, 1);
    assert.strictEqual(h.trace.find(x => x[0] === 'delay')[1], 620);
    assert.deepStrictEqual(h.trace.find(x => x[0] === 'response').slice(1), [true, .25]);
    assert.deepStrictEqual(
      h.trace.filter(x => ['chaos','charge','heal','damage','pants','ui','text','tone','delay','response'].includes(x[0])).map(x => x[0]),
      ['chaos','charge','heal','damage','pants','ui','text','tone','delay','response']
    );
  }

  // Busy and cooldown rejection remain inside the base Guard body.
  {
    const busy = makeHarness({ combatBusy: true });
    await owner.guardAction();
    assert(!busy.trace.some(x => x[0] === 'chaos'), 'busy Guard must not roll D20 chaos');
    const cooldown = makeHarness({ player: { guardCooldown: 1 } });
    await owner.guardAction();
    assert(!cooldown.trace.some(x => x[0] === 'chaos'), 'cooldown Guard must not roll D20 chaos');
  }

  // D20 forced element occurs before natural-twenty all-element sweep.
  {
    const h = makeHarness({ chaos: { forceElement: 'void', allElements: true }, diboElements: ['fire', 'ice'] });
    await owner.guardAction();
    assert.deepStrictEqual(h.trace.filter(x => x[0] === 'element').map(x => x[1]), ['void', 'fire', 'ice']);
  }

  // Perfect Guard rolls before base rejection and restores guardCounter afterward.
  {
    const h = makeHarness({ effects: ['perfect_guard'], tierValues: [2], combatBusy: true, player: { guardCounter: .5, doubleStrike: 1.4 } });
    await owner.guardAction();
    assert.deepStrictEqual(h.trace.filter(x => ['tier','history','chaos'].includes(x[0])).map(x => x[0]), ['tier','history']);
    assert.strictEqual(h.player.guardCounter, .5);
  }
  {
    const h = makeHarness({ effects: ['perfect_guard'], tierValues: [2], player: { guardCounter: .5, doubleStrike: 1.4 } });
    await owner.guardAction();
    const damage = h.trace.find(x => x[0] === 'damage');
    assert.strictEqual(damage[1], 13, 'Perfect Guard counter scaling drifted');
    assert.strictEqual(h.player.guardCounter, .5, 'Perfect Guard must restore guardCounter');
  }

  // Dragoon forced landing bypasses Perfect Guard/base Guard; ordinary Guard ticks Jump cooldown first.
  {
    const landing = makeHarness({ dragoonActive: true, effects: ['perfect_guard'], player: { dragoonLandingReady: true, guardCounter: 1 } });
    assert.strictEqual(await owner.guardAction(), 'landing');
    assert.deepStrictEqual(landing.trace.map(x => x[0]), ['dragoonLanding']);
    const tick = makeHarness({ dragoonActive: true, player: { dragoonJumpCooldown: 3 } });
    await owner.guardAction();
    assert.strictEqual(tick.player.dragoonJumpCooldown, 2);
    assert(tick.trace.findIndex(x => x[0] === 'dragoonTick') < tick.trace.findIndex(x => x[0] === 'chaos'));
  }

  // Fighter identity stores Counterblow and keeps the dynamic Guard composition seam.
  {
    const h = makeHarness({ classId: 'fighter', invokeGuardAction: ({ player, trace }) => { trace.push(['hook', player.fighterCounterStacks]); return 'hooked'; } });
    assert.strictEqual(await owner.identityGuardAction(), 'hooked');
    assert.strictEqual(h.player.fighterCounterStacks, 1);
    assert.strictEqual(h.player.fighterCounterReady, false);
    assert.deepStrictEqual(h.trace.filter(x => ['flash','hook'].includes(x[0])).map(x => x[0]), ['flash','hook']);
    assert(!h.trace.some(x => x[0] === 'chaos'), 'dynamic hook must be able to replace direct Guard resolution');
  }

  // Turtle Shell Momentum raises the threshold Barrier, applies temporary Guard Power and restores it.
  {
    let seenPower = null;
    const h = makeHarness({ classId: 'turtle', player: { turtleGuardChain: 2, guardPower: .2, combatShield: 0 }, invokeGuardAction: ({ player }) => { seenPower = player.guardPower; return 'guard'; } });
    await owner.identityGuardAction();
    assert.strictEqual(h.player.turtleGuardChain, 3);
    assert.strictEqual(h.player.combatShield, 1);
    assert(Math.abs(seenPower - .3) < 1e-12, `temporary Guard Power drifted: ${seenPower}`);
    assert.strictEqual(h.player.guardPower, .2);
  }

  // Resonant Guard consumes RNG before the dynamic Guard call and prefers weapon -> pet -> random element.
  {
    const h = makeHarness({
      classId: 'turtle', classTags: { turtle: ['guardian'] }, talentRanks: { turtle_guard_element: 1 },
      weaponElement: 'ice', randomValues: [0], invokeGuardAction: ({ trace }) => { trace.push(['hook']); return 'guard'; }
    });
    await owner.identityGuardAction();
    assert.deepStrictEqual(h.trace.filter(x => ['random','element','hook'].includes(x[0])).map(x => x[0]), ['random','element','hook']);
    assert.strictEqual(h.trace.find(x => x[0] === 'element')[1], 'ice');
    assert(!h.trace.some(x => x[0] === 'pick'));
  }
  {
    const h = makeHarness({
      classId: 'slime', classTags: { slime: ['guardian'] }, talentRanks: { turtle_guard_element: 1 },
      weaponElement: null, petElement: null, randomValues: [0], pickIndex: 2,
      invokeGuardAction: () => 'guard'
    });
    await owner.identityGuardAction();
    assert.strictEqual(h.trace.find(x => x[0] === 'pick')[1], 'void');
  }

  // Mana Guard happens outside Resonant/V16 and before the Guard composition seam.
  {
    const h = makeHarness({ classId: 'sorcerer', mechanics: ['mana'], invokeGuardAction: ({ trace }) => { trace.push(['hook']); return 'guard'; } });
    await owner.identityGuardAction();
    assert.strictEqual(h.player.mana, 6);
    assert(h.trace.findIndex(x => x[0] === 'mana') < h.trace.findIndex(x => x[0] === 'hook'));
  }

  // Paladin consumes Grace, adds Barriers, exposes temporary power to lower layers, then restores it.
  {
    let seenPower = null;
    const h = makeHarness({ classId: 'paladin', player: { paladinGrace: 50, guardPower: .2, combatShield: 0 }, invokeGuardAction: ({ player }) => { seenPower = player.guardPower; return 'guard'; } });
    await owner.identityGuardAction();
    assert.strictEqual(h.player.paladinGrace, 0);
    assert.strictEqual(h.player.combatShield, 2);
    assert(Math.abs(seenPower - .3) < 1e-12, `temporary Guard Power drifted: ${seenPower}`);
    assert.strictEqual(h.player.guardPower, .2);
  }

  // Event Horizon offhand executes before Paladin/Mana/Resonant and raises every third Guard Barrier.
  {
    const h = makeHarness({ mythicSlots: ['offhand'], player: { ultimateCharge: 90, _eventHorizonGuards: 2, combatShield: 0 }, invokeGuardAction: ({ trace }) => { trace.push(['hook']); return 'guard'; } });
    await owner.identityGuardAction();
    assert.strictEqual(h.player.ultimateCharge, 98);
    assert.strictEqual(h.player._eventHorizonGuards, 3);
    assert.strictEqual(h.player.combatShield, 1);
    assert(h.trace.findIndex(x => x[0] === 'history') < h.trace.findIndex(x => x[0] === 'hook'));
  }

  console.log('Combat Guard Resolution deterministic contract: PASS');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
