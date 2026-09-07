const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ownerPath = path.join(__dirname, '..', 'runtime', 'js', 'combat', 'victory-resolution.js');
const source = fs.readFileSync(ownerPath, 'utf8');
assert(source.includes('window.DiceboundCombatVictoryResolution = api;'), 'Victory owner must use canonical direct global assignment');
assert(!/Math\.random\s*\(|\brandom\s*\(/.test(source), 'Victory owner must not introduce direct RNG draws');

const sandbox = { window: {}, console, Object, Math, Promise, Set, Map, Error, String, Number };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerPath });
const owner = sandbox.window.DiceboundCombatVictoryResolution;
assert(owner && owner.owner === 'combat/victory-resolution', 'Victory owner did not initialize');

function enemy(name='Dummy', extra={}) {
  return Object.assign({ name, hp: 0, maxHp: 100, gold: 20, xp: 10, boss: false, miniBoss: false, finalBoss: false }, extra);
}

function makeHarness(options={}) {
  const trace = [];
  const meta = Object.assign({
    petCookies: 0, merchantKills: 0, bloodmageKills: 0, devilBossKills: 0, classUnlockFacts: {},
    board5Clears: 0, doubleDiceUnlocked: false, nightmareUnlocked: false, hellUnlocked: false,
    stats: { enemiesDefeated: 0, bossesDefeated: 0, minibossesDefeated: 0 }
  }, options.meta || {});
  const player = Object.assign({
    classId: 'ranger', gold: 5, xpBonus: 0, postFightHeal: 0, bloodOverhealBonus: 0,
    freeMerchantRun: false, legacyXpBonus: 0
  }, options.player || {});
  let currentEnemies = options.enemies ? [...options.enemies] : [enemy()];
  let currentEnemy = options.currentEnemy === undefined ? (currentEnemies[0] || null) : options.currentEnemy;
  let currentEncounterLead = options.currentEncounterLead === undefined ? currentEnemy : options.currentEncounterLead;
  let currentEnemyTile = options.currentEnemyTile === undefined ? 0 : options.currentEnemyTile;
  let combatBusy = options.combatBusy === undefined ? true : !!options.combatBusy;
  let rollLocked = options.rollLocked === undefined ? true : !!options.rollLocked;
  const tiles = options.tiles || [{ type: options.tileType || 'enemy', cleared: false, enemyBase: { name: 'base' } }];
  const unlocked = [];
  let legacyXp = 0;

  const state = () => ({
    player, meta, boardLevel: options.boardLevel || 1, nightmareMode: !!options.nightmareMode, hellMode: !!options.hellMode,
    combatKind: options.combatKind || null, tiles,
    currentEnemy, currentEnemies, currentEncounterLead, currentEnemyTile
  });
  const push = (name, ...args) => trace.push([name, ...args]);

  const rt = {
    getState: state,
    ensureAlphaMeta: () => meta.stats,
    recordBoardClear: (board, classId) => push('boardClear', board, classId),
    clearBloodOverhealTemp: () => { player.bloodOverhealBonus = 0; push('clearBloodOverheal'); },
    modifiedGold: amount => { push('modifiedGold', amount); return options.modifiedGold ? options.modifiedGold(amount) : amount; },
    healPlayer: amount => { push('heal', amount); return amount; },
    saveMeta: () => push('saveMeta'),
    showToast: (...args) => push('toast', ...args),
    checkDynamicClassUnlocks: () => push('checkUnlocks'),
    addLog: text => push('log', text),
    unlockClass: id => { unlocked.push(id); push('unlock', id); },
    refreshTile: index => push('refreshTile', index),
    setCombatText: text => push('combatText', text),
    playWin: () => push('playWin'),
    updateHud: () => push('hud'),
    delay: async ms => push('delay', ms),
    presentVictory: async payload => { push('victoryUi', payload.title, payload.cookies); if (options.throwAt === 'victoryUi') throw new Error('forced victory UI failure'); },
    hideCombatOverlay: () => push('hideCombat'),
    resetVictoryPresentation: () => push('resetVictoryUi'),
    clearEncounterState: () => { currentEnemy = null; currentEnemies = []; currentEncounterLead = null; currentEnemyTile = null; push('clearEncounter'); },
    grantXp: xp => push('grantXp', xp),
    getPendingLevelUps: () => options.pendingLevelUps || 0,
    openLevelUp: done => { push('levelUp'); if (options.autoContinue !== false) return done?.(); },
    openCombatLootChain: (defeated, done) => { push('loot', defeated?.name || null); if (options.throwAt === 'loot') throw new Error('forced loot failure'); if (options.autoContinue !== false) return done?.(); },
    showLegendaryChoice: (title, done) => { push('legendaryChoice', title); if (options.autoContinue !== false) return done?.(); },
    advanceToNextBoard: () => push('advanceBoard'),
    completeFinalRoad: () => push('completeFinalRoad'),
    returnToRoad: () => push('returnRoad'),
    renderClassChoices: () => push('renderClasses'),
    setMerchantBossFlags: flags => push('merchantFlags', JSON.stringify(flags)),
    restoreRadiationDefense: () => push('restoreRadiation'),
    traceCommand: (name, fn, level, args) => {
      push('traceStart', name, level, args.length);
      let value;
      try { value = fn(); } catch (error) { push('traceReject', name); throw error; }
      if (value && typeof value.then === 'function') return value.then(result => { push('traceComplete', name); return result; }, error => { push('traceReject', name); throw error; });
      push('traceComplete', name); return value;
    },
    logDebug: (level, category, message) => push('debug', level, category, message),
    debugState: () => ({ currentEnemy: currentEnemy?.name || null, combatBusy }),
    setCombatBusy: value => { combatBusy = !!value; push('combatBusy', combatBusy); },
    isCombatOverlayHidden: () => true,
    setRollLocked: value => { rollLocked = !!value; push('rollLocked', rollLocked); },
    clearStoneBattle: () => push('clearStone'),
    grantLegacyXp: gain => { legacyXp += gain; push('legacyXp', gain); },
    updateMetaUi: () => push('metaUi'),
    restoreEnemyElementDebuffs: () => push('restoreEnemyDebuffs'),
    clearLegendaryBattleTemps: () => push('clearLegendaryTemps'),
    getClassUnlockFacts: () => meta.classUnlockFacts || {},
    recordCombatFacts: (facts, payload) => { push('recordCombatFacts', payload.board, payload.classId, payload.mode); return Object.assign({}, facts, { lastCombat: payload }); }
  };

  owner.configure(rt);
  return {
    trace, meta, player, tiles, unlocked, rt,
    get currentEnemy() { return currentEnemy; },
    get currentEnemies() { return currentEnemies; },
    get combatBusy() { return combatBusy; },
    get rollLocked() { return rollLocked; },
    get legacyXp() { return legacyXp; }
  };
}

function names(trace) { return trace.map(entry => entry[0]); }

async function run() {
  // Ordinary miniboss: exact reward formula/cookie table, statistics, tile
  // clearing, Legendary -> loot -> level-up -> road continuation sequencing.
  {
    const defeated = enemy('Mini', { miniBoss: true, gold: 21, xp: 11 });
    const h = makeHarness({ boardLevel: 2, enemies: [defeated], pendingLevelUps: 1, player: { xpBonus: .5 } });
    await owner.winCombat();
    assert.strictEqual(h.player.gold, 26);
    assert.strictEqual(h.meta.petCookies, 3);
    assert.strictEqual(h.meta.stats.enemiesDefeated, 1);
    assert.strictEqual(h.meta.stats.minibossesDefeated, 1);
    assert.strictEqual(h.tiles[0].type, 'empty');
    assert(h.unlocked.includes('monk'));
    const order = names(h.trace);
    for (const [a,b] of [['combatText','victoryUi'],['victoryUi','clearEncounter'],['clearEncounter','grantXp'],['grantXp','legendaryChoice'],['legendaryChoice','loot'],['loot','levelUp'],['levelUp','returnRoad']]) {
      assert(order.indexOf(a) < order.indexOf(b), `${a} must occur before ${b}`);
    }
    assert(order.indexOf('restoreRadiation') < order.indexOf('traceComplete'), 'V16 cleanup must remain inside command trace');
    assert(order.indexOf('traceComplete') < order.indexOf('clearStone'), 'v2.6 Stone cleanup must remain outside command trace');
    assert(order.indexOf('clearStone') < order.indexOf('restoreEnemyDebuffs'));
    assert(order.indexOf('restoreEnemyDebuffs') < order.indexOf('clearLegendaryTemps'));
    assert(order.indexOf('recordCombatFacts') < order.indexOf('traceStart'), 'class unlock facts must record before the historical victory stack');
  }

  // Board 5 final uses the separate late-final algorithm, continues to Board 6,
  // grants ten cookies and announces Double Dice only on first unlock.
  {
    const final = enemy('Fifth Guardian', { boss: true, finalBoss: true, gold: 50, xp: 30 });
    const first = makeHarness({ boardLevel: 5, nightmareMode: true, enemies: [final], player: { classId: 'beastmaster' } });
    await owner.winCombat();
    assert.strictEqual(first.meta.petCookies, 10);
    assert.strictEqual(first.meta.board5Clears, 1);
    assert.strictEqual(first.meta.doubleDiceUnlocked, true);
    assert.strictEqual(first.meta.beastmasterNightmareBoard5, true);
    assert(names(first.trace).includes('advanceBoard'));
    assert(!names(first.trace).includes('completeFinalRoad'));
    assert(first.trace.some(x => x[0] === 'toast' && x[1] === '🎲🎲 Double Dice unlocked!'));

    const repeatFinal = enemy('Fifth Guardian Again', { boss: true, finalBoss: true });
    const repeat = makeHarness({ boardLevel: 5, enemies: [repeatFinal], meta: { doubleDiceUnlocked: true, board5Clears: 4 } });
    await owner.winCombat();
    assert.strictEqual(repeat.meta.board5Clears, 5);
    assert(!repeat.trace.some(x => x[0] === 'toast' && x[1] === '🎲🎲 Double Dice unlocked!'), 'repeat Board 5 clear must suppress Double Dice toast');
  }

  // Board 6 final remains terminal and hands off only after loot/level ordering.
  {
    const final = enemy('Last Equation', { boss: true, finalBoss: true, gold: 80, xp: 50 });
    const h = makeHarness({ boardLevel: 6, enemies: [final], pendingLevelUps: 1 });
    await owner.winCombat();
    assert.strictEqual(h.meta.petCookies, 15);
    const order = names(h.trace);
    assert(order.indexOf('loot') < order.indexOf('levelUp'));
    assert(order.indexOf('levelUp') < order.indexOf('completeFinalRoad'));
    assert(!order.includes('advanceBoard'));
  }

  // Ordinary Board-6 miniboss keeps the published 10-cookie correction.
  {
    const mini = enemy('Abyssal Custodian', { miniBoss: true });
    const h = makeHarness({ boardLevel: 6, enemies: [mini] });
    await owner.winCombat();
    assert.strictEqual(h.meta.petCookies, 10);
  }

  // Secret-boss wrapper nesting: Pale Devil bookkeeping is before the traced
  // core; Legacy payout and battle cleanups happen after a successful/contained
  // inner victory, in the historical order.
  {
    const devil = enemy('Pale Devil', { boss: true, devilBoss: true, gold: 1, xp: 1 });
    const h = makeHarness({ boardLevel: 3, enemies: [devil], player: { legacyXpBonus: .25 } });
    await owner.winCombat();
    assert.strictEqual(h.meta.devilBossKills, 1);
    assert.strictEqual(h.legacyXp, 1500);
    const order = names(h.trace);
    assert(order.indexOf('traceStart') < order.indexOf('toast'));
    assert(order.indexOf('traceComplete') < order.indexOf('clearStone'));
    assert(order.indexOf('clearStone') < order.indexOf('legacyXp'));
    assert(order.indexOf('legacyXp') < order.indexOf('restoreEnemyDebuffs'));
    assert(order.indexOf('restoreEnemyDebuffs') < order.indexOf('clearLegendaryTemps'), 'outer cleanup order');
  }

  // Reward failure after encounter teardown is contained. Road state recovers,
  // and outer Stone/element/Legendary cleanup still executes.
  {
    const defeated = enemy('Broken Reward Dummy', { gold: 1, xp: 1 });
    const h = makeHarness({ enemies: [defeated], throwAt: 'loot' });
    const result = await owner.winCombat();
    assert.strictEqual(result, null);
    assert.strictEqual(h.currentEnemy, null);
    assert.strictEqual(h.combatBusy, false);
    assert.strictEqual(h.rollLocked, false);
    const order = names(h.trace);
    assert(order.includes('traceReject'));
    assert(order.includes('debug'));
    assert(order.includes('clearStone'));
    assert(order.includes('restoreEnemyDebuffs'));
    assert(order.includes('clearLegendaryTemps'));
    assert(h.trace.some(x => x[0] === 'toast' && String(x[1]).includes('Victory reward error contained')));
  }

  // A failure before encounter teardown is NOT swallowed and therefore does
  // not run the successful outer cleanup chain.
  {
    const defeated = enemy('UI Failure Dummy');
    const h = makeHarness({ enemies: [defeated], throwAt: 'victoryUi' });
    await assert.rejects(owner.winCombat(), /forced victory UI failure/);
    assert(!names(h.trace).includes('clearStone'));
    assert(!names(h.trace).includes('restoreEnemyDebuffs'));
    assert(!names(h.trace).includes('clearLegendaryTemps'));
  }

  console.log('Combat Victory / Reward resolution deterministic contract: PASS');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
