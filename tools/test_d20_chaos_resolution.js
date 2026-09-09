const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'runtime', 'js', 'combat', 'd20-chaos-resolution.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'd20-chaos-resolution.js' });
const owner = context.window.DiceboundCombatD20ChaosResolution;
assert(owner, 'D20 chaos owner must export DiceboundCombatD20ChaosResolution');

const ELEMENTS = {
  fire: { icon: '🔥', name: 'Fire' }, ice: { icon: '❄️', name: 'Ice' }, electric: { icon: '⚡', name: 'Electric' },
  nature: { icon: '🌿', name: 'Nature' }, light: { icon: '✨', name: 'Light' }, void: { icon: '🕳️', name: 'Void' }
};
const CORE = ['fire', 'ice', 'electric', 'nature', 'light', 'void'];

function makeHarness({ d20 = true, rand = [], random = [], pick = [], player = {} } = {}) {
  const p = Object.assign({
    classId: d20 ? 'd20' : 'ranger', hp: 100, maxHp: 100, ultimateCharge: 50,
    combatShield: 0, hasteTurns: 0, hasteCooldown: 0, gold: 20,
    d20HighRollChance: 0, d20BonusChance: 0, _db046HasteLocked: false, _db047HastePrimed: false
  }, player);
  const randQueue = [...rand], randomQueue = [...random], pickQueue = [...pick];
  const events = [];
  let fxClass = '', fxText = '';
  const fx = {};
  Object.defineProperties(fx, {
    className: { get: () => fxClass, set: value => { fxClass = value; events.push(`fx-class:${value}`); } },
    textContent: { get: () => fxText, set: value => { fxText = value; events.push(`fx-text:${value}`); } },
    offsetWidth: { get: () => { events.push('fx-reflow'); return 10; } }
  });

  const rt = {
    getPlayer: () => p,
    classIdentityActive: id => d20 && id === 'd20',
    rand: (min, max) => {
      assert(randQueue.length, `unexpected rand(${min}, ${max})`);
      const value = randQueue.shift();
      events.push(`rand:${min}-${max}:${value}`);
      return value;
    },
    random: () => {
      assert(randomQueue.length, 'unexpected random()');
      const value = randomQueue.shift();
      events.push(`random:${value}`);
      return value;
    },
    pick: values => {
      assert(pickQueue.length, `unexpected pick(${values.join(',')})`);
      const requested = pickQueue.shift();
      const value = typeof requested === 'number' ? values[requested] : requested;
      assert(values.includes(value), `queued pick ${value} not in ${values.join(',')}`);
      events.push(`pick:${values.join(',')}:${value}`);
      return value;
    },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    getAttackFx: () => fx,
    delay: async ms => events.push(`delay:${ms}`),
    getElements: () => ELEMENTS,
    getCoreElements: () => CORE,
    setCombatText: text => events.push(`text:${text}`),
    showToast: text => events.push(`toast:${text}`),
    identityFlash: text => events.push(`flash:${text}`),
    addCombatHistory: text => events.push(`history:${text}`),
    clampQueuedHaste: before => {
      events.push(`clamp-haste:${before}`);
      const pending = Math.max(0, p.hasteTurns || 0);
      if (before >= 1 && pending > before) p.hasteTurns = before;
      else if (pending > 1) p.hasteTurns = 1;
      return p.hasteTurns || 0;
    }
  };
  owner.configure(rt);
  return { p, events, randQueue, randomQueue, pickQueue, fx };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function standardRand(roll) { return [11, 12, 13, 14, roll]; }
function assertQueuesDrained(h) {
  assert.deepStrictEqual(h.randQueue, [], 'all queued rand draws must be consumed');
  assert.deepStrictEqual(h.randomQueue, [], 'all queued random draws must be consumed');
  assert.deepStrictEqual(h.pickQueue, [], 'all queued picks must be consumed');
}

(async () => {
  await test('result titles preserve the shipped ten recipe bands', async () => {
    const expected = new Map([[1,'CATASTROPHE'],[2,'BAD OMEN'],[3,'BAD OMEN'],[4,'WEAK TIMELINE'],[6,'WEAK TIMELINE'],[7,'PATCH-UP'],[9,'PATCH-UP'],[10,'EMPOWERED'],[12,'EMPOWERED'],[13,'ECHO + BARRIER'],[15,'ECHO + BARRIER'],[16,'ELEMENTAL CHAOS'],[17,'ELEMENTAL CHAOS'],[18,'HASTE'],[19,'CRITICAL MIRACLE'],[20,'NATURAL TWENTY']]);
    for (const [roll, title] of expected) assert.strictEqual(owner.d20ResultTitle(roll), title);
  });

  await test('non-D20 identity returns neutral result without D20 RNG or presentation', async () => {
    const h = makeHarness({ d20: false });
    const out = await owner.rollD20Chaos('attack');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(out)), { roll:0, mult:1, extraEcho:0, bonusCrit:0, potionMult:1, guardBonus:0 });
    assert.deepStrictEqual(h.events, ['clamp-haste:0']);
  });

  await test('initializePlayerState replaces both historical reset wrappers', async () => {
    const h = makeHarness({ player: { _db046HasteLocked: true, _db047HastePrimed: true } });
    owner.initializePlayerState();
    assert.strictEqual(h.p._db046HasteLocked, false);
    assert.strictEqual(h.p._db047HastePrimed, false);
  });

  await test('decorative rolls consume four RNG draws before real roll and preserve all presentation delays', async () => {
    const h = makeHarness({ rand: standardRand(10) });
    const out = await owner.rollD20Chaos('attack');
    assert.strictEqual(out.roll, 10);
    assert.strictEqual(out.mult, 1.25);
    const rng = h.events.filter(e => e.startsWith('rand:'));
    assert.deepStrictEqual(rng, ['rand:1-20:11','rand:1-20:12','rand:1-20:13','rand:1-20:14','rand:1-20:10']);
    assert.deepStrictEqual(h.events.filter(e => e.startsWith('delay:')), ['delay:105','delay:123','delay:141','delay:159','delay:430','delay:260','delay:260','delay:300']);
    assert(h.events.indexOf('fx-text:🎲 14') < h.events.indexOf('rand:1-20:10'));
    assert(h.events.some(e => e === 'flash:🎲 10/20 — EMPOWERED'));
    assert(h.events.some(e => e.startsWith('history:🎲 ATTACK ROLL: 10/20 — EMPOWERED.')));
    assert.strictEqual(h.events.filter(e => e.startsWith('text:')).at(-1), 'text:🎲 ATTACK ROLL: 10/20 — EMPOWERED. Resolving...');
    assertQueuesDrained(h);
  });

  await test('High Roll Chance checks after the real roll and rerolls 17-20 before outcome resolution', async () => {
    const h = makeHarness({ rand: [...standardRand(4), 20], random: [0.10], player: { d20HighRollChance: .5 } });
    const out = await owner.rollD20Chaos('guard');
    assert.strictEqual(out.roll, 20);
    assert.strictEqual(out.mult, 3);
    assert.strictEqual(h.p.hp, 100);
    assert.strictEqual(h.p.ultimateCharge, 100);
    assert.strictEqual(h.p.combatShield, 2);
    const realIndex = h.events.indexOf('rand:1-20:4');
    const checkIndex = h.events.indexOf('random:0.1');
    const rerollIndex = h.events.indexOf('rand:17-20:20');
    assert(realIndex < checkIndex && checkIndex < rerollIndex);
    assertQueuesDrained(h);
  });

  await test('Natural 1 applies floor-safe self damage and potion/action multipliers', async () => {
    const h = makeHarness({ rand: standardRand(1), player: { hp: 8, maxHp: 100 } });
    const out = await owner.rollD20Chaos('potion');
    assert.strictEqual(h.p.hp, 1);
    assert.strictEqual(out.mult, .35);
    assert.strictEqual(out.potionMult, .5);
    assert(out.notes.includes('12 self-damage'));
    assertQueuesDrained(h);
  });

  for (const [curse, expected] of [
    ['ult', { ultimateCharge: 35, mult: 1, guardBonus: 0, text: 'fate steals 15 Ultimate charge' }],
    ['shield', { ultimateCharge: 50, mult: .65, guardBonus: 0, text: 'reality becomes suspiciously soft' }],
    ['wobble', { ultimateCharge: 50, mult: .8, guardBonus: -.08, text: 'wobbles sideways' }]
  ]) {
    await test(`roll 2-3 ${curse} curse preserves exact branch`, async () => {
      const h = makeHarness({ rand: standardRand(2), pick: [curse] });
      const out = await owner.rollD20Chaos('attack');
      assert.strictEqual(h.p.ultimateCharge, expected.ultimateCharge);
      assert.strictEqual(out.mult, expected.mult);
      assert.strictEqual(out.guardBonus, expected.guardBonus);
      assert(out.notes.includes(expected.text));
      assertQueuesDrained(h);
    });
  }

  await test('PATCH-UP restores capped HP and exactly eight Ultimate', async () => {
    const h = makeHarness({ rand: standardRand(8), player: { hp: 95, ultimateCharge: 97 } });
    const out = await owner.rollD20Chaos('attack');
    assert.strictEqual(h.p.hp, 100);
    assert.strictEqual(h.p.ultimateCharge, 100);
    assert(out.notes.includes('restores 5 HP and 8 Ultimate'));
    assertQueuesDrained(h);
  });

  await test('Echo + Barrier band grants one Echo and one Barrier', async () => {
    const h = makeHarness({ rand: standardRand(14), player: { combatShield: 2 } });
    const out = await owner.rollD20Chaos('attack');
    assert.strictEqual(out.extraEcho, 1);
    assert.strictEqual(h.p.combatShield, 3);
    assertQueuesDrained(h);
  });

  await test('Elemental Chaos picks the core element after the real roll', async () => {
    const h = makeHarness({ rand: standardRand(16), pick: ['void'] });
    const out = await owner.rollD20Chaos('attack');
    assert.strictEqual(out.forceElement, 'void');
    assert.strictEqual(out.mult, 1.6);
    assert(out.notes.includes('🕳️ Void chaos erupts'));
    assert(h.events.indexOf('rand:1-20:16') < h.events.findIndex(e => e.startsWith('pick:fire,ice,electric')));
    assertQueuesDrained(h);
  });

  await test('Natural 20 preserves full reset, two Barriers and all-elements marker', async () => {
    const h = makeHarness({ rand: standardRand(20), player: { hp: 17, ultimateCharge: 3, combatShield: 4 } });
    const out = await owner.rollD20Chaos('ultimate');
    assert.strictEqual(out.mult, 3);
    assert.strictEqual(out.bonusCrit, 2);
    assert.strictEqual(out.extraEcho, 2);
    assert.strictEqual(out.allElements, true);
    assert.strictEqual(h.p.hp, 100);
    assert.strictEqual(h.p.ultimateCharge, 100);
    assert.strictEqual(h.p.combatShield, 6);
    assertQueuesDrained(h);
  });

  const probabilityCases = [
    ['echo', {}, h => assert.strictEqual(h.out.extraEcho, 1)],
    ['barrier', {}, h => assert.strictEqual(h.p.combatShield, 1)],
    ['heal', { randTail: [7], player: { hp: 50 } }, h => assert.strictEqual(h.p.hp, 57)],
    ['element', { pickTail: ['ice'] }, h => assert.strictEqual(h.out.forceElement, 'ice')],
    ['haste', {}, h => { assert.strictEqual(h.p.hasteTurns, 1); assert.strictEqual(h.p._db046HasteLocked, true); assert.strictEqual(h.p._db047HastePrimed, true); }],
    ['gold', { randTail: [17] }, h => assert.strictEqual(h.p.gold, 37)]
  ];
  for (const [bonus, opts, check] of probabilityCases) {
    await test(`Probability ${bonus} branch preserves branch-specific RNG and side effect`, async () => {
      const picks = [bonus, ...(opts.pickTail || [])];
      const h = makeHarness({
        rand: [...standardRand(10), ...(opts.randTail || [])], random: [0], pick: picks,
        player: Object.assign({ d20BonusChance: 1 }, opts.player || {})
      });
      const out = await owner.rollD20Chaos('attack');
      check({ ...h, out });
      assert(out.notes.includes('Probability'));
      assertQueuesDrained(h);
    });
  }

  await test('roll 18 Haste is cancelled by historical V19 cooldown gate before later locks', async () => {
    const h = makeHarness({ rand: standardRand(18), player: { hasteCooldown: 1 } });
    await owner.rollD20Chaos('attack');
    assert.strictEqual(h.p.hasteTurns, 0);
    assert.strictEqual(h.p._db046HasteLocked, false);
    assert.strictEqual(h.p._db047HastePrimed, false);
    assertQueuesDrained(h);
  });

  await test('DB046 existing lock cancels a fresh Haste grant', async () => {
    const h = makeHarness({ rand: standardRand(18), player: { _db046HasteLocked: true } });
    await owner.rollD20Chaos('attack');
    assert.strictEqual(h.p.hasteTurns, 0);
    assert.strictEqual(h.p._db046HasteLocked, true);
    assert.strictEqual(h.p._db047HastePrimed, false);
    assertQueuesDrained(h);
  });

  await test('DB047 primed state remains the outermost Haste veto after DB046 sees a legal grant', async () => {
    const h = makeHarness({ rand: standardRand(18), player: { _db047HastePrimed: true } });
    await owner.rollD20Chaos('attack');
    assert.strictEqual(h.p.hasteTurns, 0);
    assert.strictEqual(h.p._db046HasteLocked, true, 'inner DB046 lock mutation remains even when outer DB047 removes Haste');
    assert.strictEqual(h.p._db047HastePrimed, true);
    assertQueuesDrained(h);
  });

  await test('already queued Haste cannot bank another skipped response', async () => {
    const h = makeHarness({ rand: standardRand(18), player: { hasteTurns: 1 } });
    await owner.rollD20Chaos('attack');
    assert.strictEqual(h.p.hasteTurns, 1);
    assertQueuesDrained(h);
  });

  console.log('D20 chaos resolution deterministic contract passed.');
})();
