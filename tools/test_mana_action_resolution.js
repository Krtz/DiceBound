const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'runtime', 'js', 'combat', 'mana-action-resolution.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'mana-action-resolution.js' });
const owner = context.window.DiceboundCombatManaActionResolution;
assert(owner, 'Mana action owner must export DiceboundCombatManaActionResolution');

const SPELLS = {
  sorcerer: { builder: 'Channel Bolt', builderIcon: '🔮', spell: 'Arcane Lance', spellIcon: '✦', cost: 35, gain: 28 },
  vampire: { builder: 'Night Siphon', builderIcon: '🦇', spell: 'Grave Lance', spellIcon: '🌑', cost: 35, gain: 26 },
  rouge: { builder: 'Crimson Stroke', builderIcon: '🖌️', spell: 'Scarlet Hex', spellIcon: '🌹', cost: 35, gain: 27 },
  merchant: { builder: 'Ledger Tap', builderIcon: '📜', spell: 'Foreclosure Hex', spellIcon: '⚖️', cost: 40, gain: 30 },
  summoner: { builder: 'Spirit Bolt', builderIcon: '📖', spell: 'Conjure Familiar', spellIcon: '🐾', cost: 40, gain: 26 },
  invoker: { builder: 'Arcane Current', builderIcon: '🟢', spell: 'Elemental Lance', spellIcon: '🔴', cost: 50, gain: 25 }
};

function makeHarness({ classId = 'sorcerer', identity = classId, mana = 100, maxMana = 100, enemies = null, playerAttack = null, petTurn = null } = {}) {
  const p = {
    classId, mana, maxMana, combatActionCount: 0, guardCooldown: 9,
    attack: 10, damageBonus: 0, bossDamage: 0, doubleStrike: 0, crit: 0,
    lifeSteal: 0, gold: 0, ultimateAttackGain: 10, ultimateCharge: 0,
    manaBuilderBonus: 0, manaSpendUltimate: 0, summonerManaBonus: 0,
    summonerSpirits: [], summonerCap: 3, petDamageBonus: 0, summonerSpiritScale: 1,
    hp: 50, maxHp: 100
  };
  const foes = enemies || [{ name: 'Dummy', hp: 10000, maxHp: 10000, defense: 0 }];
  let current = foes[0], busy = false;
  const events = [];
  const counters = { response: 0, win: 0, career: 0, save: 0, unlockCheck: 0, pet: 0, attack: 0, ui: 0 };
  const meta = { pets: { neutral: { unlocked: true }, fire: { unlocked: true }, ice: { unlocked: true } } };
  const pets = {
    neutral: { name: 'DiBo', icon: '🎲' },
    fire: { name: 'Ember', icon: '🔥' },
    ice: { name: 'Frost', icon: '❄️' }
  };

  const rt = {
    getPlayer: () => p,
    getCurrentEnemy: () => current,
    getCurrentEnemies: () => foes,
    livingEnemies: () => foes.filter(enemy => enemy.hp > 0),
    getCombatBusy: () => busy,
    setCombatBusy: value => { busy = !!value; events.push(`busy:${busy}`); },
    spellFor: id => SPELLS[id],
    classIdentityId: () => identity,
    isClassActive: id => identity === id,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    playerAttack: async () => {
      counters.attack++;
      events.push(`attack:mana=${p.mana}:channel=${p._occultChanneling}:pending=${p._invokerPendingGenerator}`);
      if (playerAttack) return playerAttack({ p, events, counters, setBusy: value => { busy = !!value; } });
    },
    invokerActive: () => identity === 'invoker',
    invokerGeneratorManaMultiplier: () => 1.5,
    invokerElementalLance: async () => {
      events.push('invoker-lance');
      p.mana -= 50;
      p.combatActionCount++;
      counters.career++;
      counters.save++;
      counters.unlockCheck++;
      return 'invoker-result';
    },
    identityFlash: text => events.push(`flash:${text}`),
    updateCombatUI: () => { counters.ui++; events.push('ui'); },
    animateClassAttack: async mode => events.push(`animate:${mode}`),
    rand: (min, max) => { events.push(`rand:${min}-${max}`); return min; },
    pick: values => { events.push(`pick:${values.join(',')}`); return values[0]; },
    rollTieredProc: chance => { events.push(`tier:${chance}`); return 1; },
    coreElementIds: () => ['fire', 'ice', 'electric', 'nature', 'light', 'void'],
    triggerElementEffect: (key, target, options) => { events.push(`element:${key}:${options.source}`); return { totalDamage: 5, message: 'erupts' }; },
    damageEnemy: (enemy, amount) => { events.push(`damage:${enemy.name}:${amount}`); const dealt = Math.min(enemy.hp, Math.max(0, amount)); enemy.hp -= dealt; return dealt; },
    healPlayer: amount => { events.push(`heal:${amount}`); const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + amount); return p.hp - before; },
    getSetDamageBonus: () => 0,
    getEncounterLead: () => ({ boss: false }),
    chargeUltimate: amount => { p.ultimateCharge = Math.min(100, p.ultimateCharge + amount); events.push(`charge:${amount}`); },
    setCombatText: text => events.push(`text:${text}`),
    critSfx: () => events.push('sfx:crit'),
    delay: async ms => events.push(`delay:${ms}`),
    winCombat: async () => { counters.win++; events.push('win'); busy = false; return 'win'; },
    setCurrentEnemy: index => { current = foes[index]; events.push(`target:${index}`); },
    resolveEnemyResponse: async guarded => { counters.response++; events.push(`response:${guarded}`); busy = false; },
    getPets: () => pets,
    getMeta: () => meta,
    petTurn: async () => {
      counters.pet++;
      events.push(`pet:bonus=${p.petDamageBonus}:spirit=${p.summonerSpiritScale}`);
      if (petTurn) return petTurn({ p, foes, events, counters });
    },
    addCombatHistory: text => events.push(`history:${text}`),
    recordManaSpenderCast: () => { counters.career++; events.push('career'); },
    saveMeta: () => { counters.save++; events.push('save'); },
    checkDynamicClassUnlocks: () => { counters.unlockCheck++; events.push('unlock-check'); }
  };

  owner.configure(rt);
  return { p, foes, events, counters, meta, pets, rt, get busy() { return busy; } };
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

(async () => {
  await test('manaGain clamps at maximum Mana', async () => {
    const h = makeHarness({ mana: 95 });
    assert.strictEqual(owner.manaGain(20), 5);
    assert.strictEqual(h.p.mana, 100);
  });

  await test('Sorcerer generator applies manaBuilderBonus before Basic Attack and restores config', async () => {
    const h = makeHarness({ classId: 'sorcerer', mana: 0 });
    h.p.manaBuilderBonus = 8;
    const original = SPELLS.sorcerer.gain;
    await owner.occultChannelAttack();
    assert.strictEqual(h.p.mana, 36);
    assert.strictEqual(SPELLS.sorcerer.gain, original);
    assert(h.events.some(event => event.startsWith('attack:mana=36:channel=true')));
    assert.strictEqual(h.p._occultChanneling, false);
    assert.strictEqual(h.p._occultChannelMultiplier, 0);
    assert.strictEqual(h.p._invokerPendingGenerator, false);
  });

  await test('Summoner generator preserves nested Summoner + generic gain bonuses', async () => {
    const h = makeHarness({ classId: 'summoner', mana: 0 });
    h.p.manaBuilderBonus = 8;
    h.p.summonerManaBonus = 7;
    const original = SPELLS.summoner.gain;
    await owner.occultChannelAttack();
    assert.strictEqual(h.p.mana, 41);
    assert.strictEqual(SPELLS.summoner.gain, original);
  });

  await test('Invoker generator multiplies effective gain before Green-orb action hook', async () => {
    const h = makeHarness({ classId: 'invoker', mana: 0 });
    h.p.manaBuilderBonus = 5;
    await owner.occultChannelAttack();
    assert.strictEqual(h.p.mana, 45);
    assert(h.events.some(event => event === 'attack:mana=45:channel=true:pending=true'));
    assert.strictEqual(h.p._invokerPendingGenerator, false);
  });

  await test('Generator temporary state and shared gain restore after async failure', async () => {
    const original = SPELLS.summoner.gain;
    const h = makeHarness({ classId: 'summoner', mana: 0, playerAttack: async () => { throw new Error('boom'); } });
    h.p.manaBuilderBonus = 4;
    h.p.summonerManaBonus = 3;
    await assert.rejects(() => owner.occultChannelAttack(), /boom/);
    assert.strictEqual(SPELLS.summoner.gain, original);
    assert.strictEqual(h.p._occultChanneling, false);
    assert.strictEqual(h.p._occultChannelMultiplier, 0);
    assert.strictEqual(h.p._invokerPendingGenerator, false);
  });

  await test('Insufficient Mana is a no-op and does not record career progress', async () => {
    const h = makeHarness({ classId: 'sorcerer', mana: 20 });
    const result = await owner.occultSpellAttack();
    assert.strictEqual(result, undefined);
    assert.strictEqual(h.p.mana, 20);
    assert.strictEqual(h.p.combatActionCount, 0);
    assert.strictEqual(h.counters.career, 0);
    assert.strictEqual(h.counters.response, 0);
  });

  await test('Sorcerer Arcane Lance preserves RNG order, spend, Overflow and career count', async () => {
    const h = makeHarness({ classId: 'sorcerer', mana: 100 });
    h.p.manaSpendUltimate = 8;
    await owner.occultSpellAttack();
    assert.strictEqual(h.p.mana, 65);
    assert.strictEqual(h.p.combatActionCount, 1);
    assert.strictEqual(h.p.ultimateCharge, 16); // 8 spell charge + 8 Arcane Overflow
    assert.strictEqual(h.counters.career, 1);
    assert.strictEqual(h.counters.response, 1);
    assert(h.events.indexOf('rand:4-9') < h.events.findIndex(event => event.startsWith('pick:fire,ice')));
    assert(h.events.findIndex(event => event.startsWith('pick:fire,ice')) < h.events.indexOf('element:fire:Arcane Lance'));
  });

  await test('Vampire Grave Lance drains and resolves one qualifying spender', async () => {
    const h = makeHarness({ classId: 'vampire', mana: 100 });
    h.p.hp = 20;
    h.p.manaSpendUltimate = 8;
    await owner.occultSpellAttack();
    assert.strictEqual(h.p.mana, 65);
    assert(h.p.hp > 20);
    assert.strictEqual(h.p.ultimateCharge, 16);
    assert.strictEqual(h.counters.career, 1);
  });

  await test('Merchant Foreclosure Hex preserves gold scaling without spending gold', async () => {
    const h = makeHarness({ classId: 'merchant', mana: 100 });
    h.p.gold = 1000;
    await owner.occultSpellAttack();
    assert.strictEqual(h.p.gold, 1000);
    assert.strictEqual(h.p.mana, 60);
    assert(h.events.some(event => event.includes('notional gold-value')));
    assert.strictEqual(h.counters.career, 1);
  });

  await test('Real Rouge final Scarlet Hex preserves direct-class layer outside Mana Overflow', async () => {
    const foes = [{ name: 'A', hp: 10000, maxHp: 10000 }, { name: 'B', hp: 10000, maxHp: 10000 }];
    const h = makeHarness({ classId: 'rouge', identity: 'rouge', mana: 100, enemies: foes });
    h.p.lifeSteal = .25;
    h.p.manaSpendUltimate = 8;
    await owner.occultSpellAttack();
    assert.strictEqual(h.p.mana, 65);
    assert.strictEqual(h.p.ultimateCharge, 8, 'historical Rouge replacement bypasses V17 Mana Overflow');
    assert.strictEqual(h.counters.career, 1);
    assert(foes[1].hp < foes[1].maxHp, 'Scarlet splash must hit the pack');
    assert(h.events.indexOf('tier:0.6') < h.events.indexOf('rand:3-8'));
    assert(h.events.some(event => event.startsWith('heal:')));
  });

  await test('Borrowed Rouge identity keeps generic older path and Mana Overflow', async () => {
    const h = makeHarness({ classId: 'slimerouge', identity: 'rouge', mana: 100 });
    h.p.manaSpendUltimate = 8;
    await owner.occultSpellAttack();
    assert.strictEqual(h.p.mana, 65);
    assert.strictEqual(h.p.ultimateCharge, 16);
    assert.strictEqual(h.counters.career, 1);
  });

  await test('Summoner normal spender preserves Conjure rally and shipped double Overflow layering', async () => {
    const h = makeHarness({ classId: 'summoner', mana: 100 });
    h.p.manaSpendUltimate = 8;
    await owner.occultSpellAttack();
    assert.strictEqual(h.p.mana, 60);
    assert.strictEqual(h.p.combatActionCount, 1);
    assert.strictEqual(h.p.ultimateCharge, 16, 'Conjure manual grant + outer V17 grant are both live today');
    assert.strictEqual(h.counters.pet, 1);
    assert.strictEqual(h.counters.response, 1);
    assert.strictEqual(h.counters.career, 1);
    assert.strictEqual(h.p.petDamageBonus, 0);
    assert.strictEqual(h.p.summonerSpiritScale, 1);
    assert(h.events.some(event => event === 'pet:bonus=2:spirit=1.2'));
  });

  await test('Direct Summoner Conjure preserves one manual Overflow and no outer career wrapper', async () => {
    const h = makeHarness({ classId: 'summoner', mana: 100 });
    h.p.manaSpendUltimate = 8;
    await owner.summonerConjure();
    assert.strictEqual(h.p.ultimateCharge, 8);
    assert.strictEqual(h.counters.career, 0);
    assert.strictEqual(h.counters.pet, 1);
  });

  await test('Summoner rally restores temporary Pet state on exceptional exit', async () => {
    const h = makeHarness({ classId: 'summoner', mana: 100, petTurn: async () => { throw new Error('pet boom'); } });
    await assert.rejects(() => owner.summonerConjure(), /pet boom/);
    assert.strictEqual(h.p.petDamageBonus, 0);
    assert.strictEqual(h.p.summonerSpiritScale, 1);
  });

  await test('Invoker spender delegates without preliminary double spend and records career once', async () => {
    const h = makeHarness({ classId: 'invoker', mana: 100 });
    h.p.manaSpendUltimate = 8;
    const result = await owner.occultSpellAttack();
    assert.strictEqual(result, 'invoker-result');
    assert.strictEqual(h.p.mana, 50);
    assert.strictEqual(h.p.combatActionCount, 1);
    assert.strictEqual(h.p.ultimateCharge, 8);
    assert.strictEqual(h.counters.career, 1, 'delegated Invoker owner records once; outer career layer must skip');
    assert.strictEqual(h.events.filter(event => event === 'invoker-lance').length, 1);
  });

  await test('Generic spender reconciles target and performs exactly one enemy response', async () => {
    const foes = [{ name: 'Dead Soon', hp: 1, maxHp: 1 }, { name: 'Alive', hp: 10000, maxHp: 10000 }];
    const h = makeHarness({ classId: 'merchant', mana: 100, enemies: foes });
    h.p.attack = 100;
    await owner.occultSpellAttack();
    assert.strictEqual(h.counters.response, 1);
    assert(h.events.includes('target:1'));
  });

  await test('Summoner Pet kill routes to Victory and skips enemy response', async () => {
    const foes = [{ name: 'Pet Victim', hp: 10, maxHp: 10 }];
    const h = makeHarness({ classId: 'summoner', mana: 100, enemies: foes, petTurn: async ({ foes }) => { foes[0].hp = 0; } });
    await owner.occultSpellAttack();
    assert.strictEqual(h.counters.win, 1);
    assert.strictEqual(h.counters.response, 0);
    assert.strictEqual(h.counters.career, 1);
  });

  console.log('PASS Mana / Occult action-resolution deterministic matrix');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
