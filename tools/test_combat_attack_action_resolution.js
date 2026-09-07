const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ownerPath = path.join(__dirname, '..', 'runtime', 'js', 'combat', 'attack-action-resolution.js');
const source = fs.readFileSync(ownerPath, 'utf8');
assert(source.includes('window.DiceboundCombatAttackActionResolution = api;'), 'Attack-action owner must use canonical direct global assignment');

const sandbox = { window: {}, console, Object, Math, Promise, Set, Map };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerPath });
const owner = sandbox.window.DiceboundCombatAttackActionResolution;
assert(owner && owner.owner === 'combat/attack-action-resolution', 'Attack-action owner did not initialize');

function makeEnemy(name = 'Dummy', hp = 1000) {
  return { name, hp, maxHp: hp, defense: 0 };
}

function makeHarness(options = {}) {
  const trace = [];
  const enemies = options.enemies || [makeEnemy()];
  let currentEnemy = options.currentEnemy || enemies[0] || null;
  let combatBusy = !!options.combatBusy;
  const effects = new Set(options.effects || []);
  const tierValues = [...(options.tierValues || [0])];
  const strikeResults = [...(options.strikeResults || [])];
  const player = Object.assign({
    classId: options.classId || 'ranger',
    hp: 100, maxHp: 100,
    attack: 10, damageBonus: 0,
    crit: .10, doubleStrike: 0,
    guardCooldown: 2,
    ultimateCharge: 0, ultimateAttackGain: 12, critUltimateGain: 4,
    monkCombo: 0, monkComboMax: 5,
    clownGimmick: null,
    alchemistBrewCounter: 0, alchemistBrewNeed: 3,
    potions: 1,
    dragoonJumpCooldown: 0, dragoonLandingReady: false,
    _db060EchoChamberActive: false
  }, options.player || {});

  function livingEnemies() { return enemies.filter(enemy => enemy.hp > 0); }
  function classActive(id) { return options.isClassActive ? options.isClassActive(id, player) : player.classId === id; }
  function traceCall(name, ...args) { trace.push([name, ...args]); }

  const rt = {
    getPlayer: () => player,
    getCurrentEnemy: () => currentEnemy,
    getCurrentEnemies: () => enemies,
    livingEnemies,
    getCombatBusy: () => combatBusy,
    setCombatBusy: value => { combatBusy = !!value; traceCall('busy', combatBusy); },
    rollD20Chaos: async action => { traceCall('chaos', action); return options.chaos || {}; },
    updateCombatUI: () => traceCall('ui'),
    rollTieredProc: chance => { const value = tierValues.length ? tierValues.shift() : 0; traceCall('tier', chance, value); return value; },
    performStrike: async (target, meta) => {
      traceCall('strike', target?.name || null, !!meta?.echo, meta?.index || 0, meta?.canCrit);
      if (options.performStrike) return options.performStrike({ target, meta, player, trace, enemies, getCurrentEnemy: () => currentEnemy, setCurrentEnemy: value => { currentEnemy = value; } });
      const configured = strikeResults.length ? strikeResults.shift() : null;
      const damage = configured?.damage == null ? 10 : configured.damage;
      if (target && damage > 0) target.hp = Math.max(0, target.hp - damage);
      return { crit: configured?.crit == null ? (meta?.echo ? 0 : 1) : configured.crit };
    },
    chargeUltimate: amount => { player.ultimateCharge = Math.max(0, Math.min(100, player.ultimateCharge + amount)); traceCall('charge', amount); },
    applyMythicPantsPulse: () => { traceCall('pants'); return options.pants || ''; },
    setCombatText: text => traceCall('text', text),
    winCombat: async () => { traceCall('win'); currentEnemy = null; return options.winResult || 'win'; },
    setCurrentEnemy: index => { currentEnemy = enemies[index] || null; traceCall('select', index, currentEnemy?.name || null); },
    resolveEnemyResponse: async guarded => { traceCall('response', guarded); combatBusy = false; return options.responseResult || 'response'; },
    isClassActive: classActive,
    classIdentityId: () => options.identityId || player.classId,
    hasLegendaryEffect: id => effects.has(id),
    showToast: text => traceCall('toast', text),
    addCombatHistory: text => traceCall('history', text),
    dragoonActive: () => options.dragoonActive != null ? !!options.dragoonActive : player.classId === 'dragoon',
    dragoonLandingReady: () => !!player.dragoonLandingReady,
    dragoonLanding: async () => { traceCall('dragoonLanding'); return 'landing'; },
    tickDragoonCooldown: () => { player.dragoonJumpCooldown = Math.max(0, (player.dragoonJumpCooldown || 0) - 1); traceCall('dragoonTick'); }
  };

  owner.configure(rt);
  return {
    player, enemies, trace, rt, effects,
    get currentEnemy() { return currentEnemy; },
    get combatBusy() { return combatBusy; }
  };
}

async function run() {
  // Ordinary action order: D20 -> UI -> Echo count -> strikes -> charge ->
  // Pants -> UI -> target reconciliation -> enemy response.
  {
    const h = makeHarness({
      enemies: [makeEnemy('A', 100), makeEnemy('B', 100)],
      chaos: { extraEcho: 1 }, tierValues: [1], pants: 'pants pulse',
      player: { doubleStrike: .4, ultimateAttackGain: 10, critUltimateGain: 3 },
      strikeResults: [{ crit: 2, damage: 5 }, { crit: 0, damage: 5 }, { crit: 0, damage: 5 }]
    });
    const result = await owner.playerAttack();
    assert.strictEqual(result, undefined);
    assert.strictEqual(h.player.guardCooldown, 0);
    assert.strictEqual(h.player.ultimateCharge, 16);
    assert.deepStrictEqual(
      h.trace.filter(x => ['busy','chaos','ui','tier','strike','charge','pants','text','select','response'].includes(x[0])).map(x => x[0]),
      ['busy','chaos','ui','tier','strike','strike','strike','charge','pants','text','ui','select','response']
    );
    assert(h.trace.filter(x => x[0] === 'strike').slice(1).every(x => x[4] === false), 'Echoes must remain non-critical at action dispatch');
  }

  // Busy rejection stays inside the base transaction: no D20/Echo RNG is consumed.
  {
    const h = makeHarness({ combatBusy: true, tierValues: [2] });
    await owner.playerAttack();
    assert(!h.trace.some(x => x[0] === 'chaos'));
    assert(!h.trace.some(x => x[0] === 'tier'));
  }

  // Echo targeting abandons a defeated first target and falls through to the
  // first living enemy while preserving Echo index/order.
  {
    const a = makeEnemy('A', 5), b = makeEnemy('B', 40);
    const h = makeHarness({
      enemies: [a, b], tierValues: [2],
      strikeResults: [{ crit: 0, damage: 5 }, { crit: 0, damage: 4 }, { crit: 0, damage: 4 }]
    });
    await owner.playerAttack();
    assert.deepStrictEqual(h.trace.filter(x => x[0] === 'strike').map(x => x[1]), ['A', 'B', 'B']);
    assert.deepStrictEqual(h.trace.filter(x => x[0] === 'strike').map(x => x[3]), [0, 1, 2]);
  }

  // Victory exits before target advance/enemy response and preserves win result.
  {
    const enemy = makeEnemy('Last', 5);
    const h = makeHarness({ enemies: [enemy], tierValues: [0], strikeResults: [{ crit: 0, damage: 5 }] });
    assert.strictEqual(await owner.playerAttack(), 'win');
    assert(h.trace.some(x => x[0] === 'win'));
    assert(!h.trace.some(x => x[0] === 'select'));
    assert(!h.trace.some(x => x[0] === 'response'));
  }

  // Monk temporary Echo/damage modifiers are visible to lower layers, restored,
  // and the historical <=5 combo increment remains conditional on combat state.
  {
    let seen = null;
    const h = makeHarness({
      classId: 'monk', tierValues: [0],
      player: { monkCombo: 3, monkComboMax: 5, doubleStrike: .10, damageBonus: .20 },
      performStrike: ({ target, player }) => { seen = { echo: player.doubleStrike, damage: player.damageBonus }; target.hp -= 1; return { crit: 0 }; }
    });
    assert.strictEqual(await owner.playerAttack(), undefined);
    assert(Math.abs(seen.echo - .205) < 1e-12, `Monk temporary Echo drifted: ${seen.echo}`);
    assert(Math.abs(seen.damage - .335) < 1e-12, `Monk temporary damage drifted: ${seen.damage}`);
    assert.strictEqual(h.player.doubleStrike, .10);
    assert.strictEqual(h.player.damageBonus, .20);
    assert.strictEqual(h.player.monkCombo, 4);
  }

  // V16's high-combo Monk overwrite remains outside the V13 layer and can rise
  // beyond the historical 5-stack cap.
  {
    const h = makeHarness({ classId: 'monk', tierValues: [0], player: { monkCombo: 5, monkComboMax: 8 } });
    await owner.playerAttack();
    assert.strictEqual(h.player.monkCombo, 6);
  }

  // Frog below half HP adds one guaranteed Echo only for the duration of attack.
  {
    const enemy = makeEnemy('Half', 100); enemy.hp = 40;
    const h = makeHarness({ classId: 'frog', enemies: [enemy], tierValues: [0], player: { doubleStrike: .2 } });
    await owner.playerAttack();
    assert(Math.abs(h.trace.find(x => x[0] === 'tier')[1] - 1.2) < 1e-12);
    assert.strictEqual(h.player.doubleStrike, .2);
  }

  // Rubber Chicken and Combat Distillery remain V16 action-level effects.
  {
    const clown = makeHarness({ classId: 'clown', tierValues: [0], player: { clownGimmick: 'Rubber Chicken', doubleStrike: .3 } });
    await owner.playerAttack();
    assert(Math.abs(clown.trace.find(x => x[0] === 'tier')[1] - .5) < 1e-12);
    assert.strictEqual(clown.player.doubleStrike, .3);

    const alchemist = makeHarness({ classId: 'alchemist', tierValues: [0], player: { alchemistBrewCounter: 2, alchemistBrewNeed: 3, potions: 1 } });
    await owner.playerAttack();
    assert.strictEqual(alchemist.player.alchemistBrewCounter, 0);
    assert.strictEqual(alchemist.player.potions, 2);
    assert(alchemist.trace.findIndex(x => x[0] === 'toast') < alchemist.trace.findIndex(x => x[0] === 'chaos'));
    assert(alchemist.trace.some(x => x[0] === 'history'));
  }

  // Echo Chamber conversion is outer to V16/V13, so the Echo-count roll sees
  // converted Crit plus lower-layer modifiers, while strike Crit is zeroed.
  {
    let seenCrit = null, seenFlag = null;
    const h = makeHarness({
      effects: ['echo_chamber'], tierValues: [0],
      player: { crit: .25, doubleStrike: .40 },
      performStrike: ({ target, player }) => { seenCrit = player.crit; seenFlag = player._db060EchoChamberActive; target.hp -= 1; return { crit: 0 }; }
    });
    await owner.playerAttack();
    assert(Math.abs(h.trace.find(x => x[0] === 'tier')[1] - .65) < 1e-12);
    assert.strictEqual(seenCrit, 0);
    assert.strictEqual(seenFlag, true);
    assert.strictEqual(h.player.crit, .25);
    assert.strictEqual(h.player.doubleStrike, .40);
    assert.strictEqual(h.player._db060EchoChamberActive, false);
  }

  // All nested temporary modifiers restore even when strike resolution rejects.
  {
    const h = makeHarness({
      classId: 'clown', effects: ['echo_chamber'], tierValues: [0],
      player: { clownGimmick: 'Rubber Chicken', crit: .2, doubleStrike: .3 },
      performStrike: async () => { throw new Error('forced strike failure'); }
    });
    await assert.rejects(owner.playerAttack(), /forced strike failure/);
    assert.strictEqual(h.player.crit, .2);
    assert.strictEqual(h.player.doubleStrike, .3);
    assert.strictEqual(h.player._db060EchoChamberActive, false);
  }

  // Dragoon landing is the outermost bypass; ordinary Dragoon attacks tick Jump
  // cooldown before D20 chaos.
  {
    const landing = makeHarness({ dragoonActive: true, player: { dragoonLandingReady: true, dragoonJumpCooldown: 3 } });
    assert.strictEqual(await owner.playerAttack(), 'landing');
    assert.deepStrictEqual(landing.trace.map(x => x[0]), ['dragoonLanding']);

    const tick = makeHarness({ dragoonActive: true, tierValues: [0], player: { dragoonJumpCooldown: 3 } });
    await owner.playerAttack();
    assert.strictEqual(tick.player.dragoonJumpCooldown, 2);
    assert(tick.trace.findIndex(x => x[0] === 'dragoonTick') < tick.trace.findIndex(x => x[0] === 'chaos'));
  }

  // Runtime callbacks stay late-bound: deterministic/debug exercises may replace
  // enemy response after configuration and the action owner must call the new seam.
  {
    const h = makeHarness({ tierValues: [0] });
    h.rt.resolveEnemyResponse = async guarded => { h.trace.push(['replacementResponse', guarded]); };
    await owner.playerAttack();
    assert(h.trace.some(x => x[0] === 'replacementResponse'));
    assert(!h.trace.some(x => x[0] === 'response'));
  }

  // Permanent architecture guard: the retired Basic Attack assignment/capture
  // ladder must not creep back into the compatibility monolith.
  const monolith = fs.readFileSync(path.join(__dirname, '..', 'runtime', 'js', 'dicebound.js'), 'utf8');
  for (const retired of [
    'const playerAttackV13=playerAttack',
    'const playerAttackV16Base=playerAttack',
    'const db060PlayerAttackBase=playerAttack',
    'const dbFriendPlayerAttackBase=playerAttack',
    'playerAttack=async function'
  ]) assert(!monolith.includes(retired), `Retired Basic Attack shadow ownership returned: ${retired}`);
  assert(monolith.includes('DiceboundCombatAttackActionResolution'), 'Monolith must configure the extracted Attack-action owner');

  const index = fs.readFileSync(path.join(__dirname, '..', 'runtime', 'index.html'), 'utf8');
  assert(index.includes('js/combat/attack-action-resolution.js'), 'Runtime index must load the Attack-action owner');

  console.log('Combat Basic Attack action-resolution deterministic contract: PASS');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
