const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ownerPath = path.join(__dirname, '..', 'runtime', 'js', 'combat', 'pet-turn-resolution.js');
const source = fs.readFileSync(ownerPath, 'utf8');
assert(source.includes('window.DiceboundCombatPetTurnResolution=api;'), 'Pet owner must use canonical direct global assignment');

const sandbox = { window: {}, console, Object, Math, Promise, Set, Map };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerPath });
const owner = sandbox.window.DiceboundCombatPetTurnResolution;
assert(owner && owner.owner === 'combat/pet-turn-resolution', 'Pet turn-resolution owner did not initialize');

function enemy(name = 'Dummy', hp = 1000, extra = {}) {
  return { name, hp, maxHp: hp, attack: 1, defense: 0, ...extra };
}

function makeHarness(options = {}) {
  const trace = [];
  const pets = options.pets || {
    neutral: { id: 'neutral', name: 'DiBo', icon: '🎲', element: null },
    fire: { id: 'fire', name: 'Ember', icon: '🔥', element: 'fire' },
    ice: { id: 'ice', name: 'Rime', icon: '❄️', element: 'ice' },
    light: { id: 'light', name: 'Gleam', icon: '✨', element: 'light' }
  };
  const elements = options.elements || {
    fire: { name: 'Fire', icon: '🔥' }, ice: { name: 'Ice', icon: '❄️' }, light: { name: 'Light', icon: '✨' },
    electric: { name: 'Electric', icon: '⚡' }, nature: { name: 'Nature', icon: '🌿' }, void: { name: 'Void', icon: '🕳️' }
  };
  const currentEnemies = options.enemies || [enemy('Dummy', 1000, options.enemyExtra || {})];
  let currentEnemy = options.currentEnemy || currentEnemies[0] || null;
  const randomValues = [...(options.randomValues || [0.99])];
  const pickValues = [...(options.pickValues || [])];
  const effects = new Set(options.effects || []);
  const activeClasses = new Set(options.activeClasses || (options.classId ? [options.classId] : []));
  const player = Object.assign({
    classId: options.classId || 'ranger', hp: 90, maxHp: 100,
    petDamageBonus: 0, petDoubleChance: 0, petTurnHeal: 0,
    beastStance: 'aggressive', combatShield: 0,
    trainerRoster: [], trainerActiveIndex: 0, trainerAssistBonus: 0, trainerAssistScale: .65,
    summonerSpirits: [], summonerSpiritScale: 1, summonerSpiritDouble: 0,
    elementDamageBonus: 0
  }, options.player || {});
  const meta = options.meta || {
    activePet: options.activePet || 'fire',
    pets: {
      neutral: { level: 1 }, fire: { level: 1 }, ice: { level: 1 }, light: { level: 1 }
    }
  };
  const bondLevels = { neutral: 1, fire: 1, ice: 1, light: 1, ...(options.bondLevels || {}) };
  const talentRanks = { ...(options.talentRanks || {}) };
  const gameplayRanks = { ...(options.gameplayRanks || {}) };
  const diboElements = options.diboElements || ['fire', 'ice', 'electric', 'nature', 'light', 'void'];
  const setBonus = Number(options.setBonus || 0);
  let lastElement = options.lastElement || null;

  const rt = {
    getPlayer: () => player,
    getMeta: () => meta,
    getPets: () => pets,
    getElements: () => elements,
    getDiboElements: () => diboElements,
    getBoardLevel: () => options.boardLevel || 1,
    isGameStarted: () => options.gameStarted !== false,
    talentRank: id => talentRanks[id] || 0,
    gameplayTalentRank: id => gameplayRanks[id] || 0,
    isClassActive: id => activeClasses.has(id),
    livingEnemies: () => currentEnemies.filter(e => e.hp > 0),
    getCurrentEnemy: () => currentEnemy,
    getCurrentEnemies: () => currentEnemies,
    setCurrentEnemy: index => { currentEnemy = currentEnemies[index] || null; trace.push(['target', index, currentEnemy?.name || null]); },
    animatePetAttack: async (duration, active = true) => trace.push(['animate', duration, active]),
    delay: async ms => trace.push(['delay', ms]),
    random: () => { const value = randomValues.length ? randomValues.shift() : .99; trace.push(['random', value]); return value; },
    pick: list => {
      const requested = pickValues.length ? pickValues.shift() : undefined;
      const value = requested !== undefined && list.includes(requested) ? requested : list[0];
      trace.push(['pick', value]);
      return value;
    },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    damageEnemy: (target, amount) => {
      const dealt = Math.min(target?.hp || 0, Math.max(0, Number(amount) || 0));
      if (target) target.hp -= dealt;
      trace.push(['damage', target?.name || null, amount, dealt]);
      return dealt;
    },
    trackElementProgress: (key, amount) => trace.push(['progress', key, amount]),
    tone: (...args) => trace.push(['tone', ...args]),
    setCombatText: text => trace.push(['text', text]),
    updateCombatUI: () => trace.push(['ui']),
    addCombatHistory: text => trace.push(['history', text]),
    healPlayer: amount => {
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + amount);
      const healed = player.hp - before;
      trace.push(['heal', amount, healed]);
      return healed;
    },
    triggerElementEffect: (key, target, info) => {
      lastElement = key;
      trace.push(['element', key, target?.name || null, info?.source || null, player.elementDamageBonus]);
      return { message: `${key} proc` };
    },
    setPetDoubleBonus: () => setBonus,
    petBondLevel: id => bondLevels[id] || 1,
    hasLegendaryEffect: id => effects.has(id),
    getLastElement: () => lastElement
  };

  owner.configure(rt);
  return { player, meta, pets, currentEnemies, trace, rt, get currentEnemy() { return currentEnemy; } };
}

async function run() {
  // Final ordinary Pet formula, sequential weakness/affinity rounding, and presentation order.
  {
    const h = makeHarness({ activePet: 'fire', enemyExtra: { weakness: 'fire', affinity: 'fire' }, randomValues: [.99] });
    assert.strictEqual(owner.petDamage(), 4, 'elemental Pet base/bond damage drifted');
    await owner.petTurn();
    assert.deepStrictEqual(h.trace.find(x => x[0] === 'damage').slice(2), [3, 3], 'weakness + affinity rounding drifted');
    assert.strictEqual(h.trace.find(x => x[0] === 'progress')[2], 3, 'ordinary Pet progress must credit attempted post-multiplier damage');
    assert.deepStrictEqual(h.trace.filter(x => ['animate','random','damage','tone','text','ui','delay','animate'].includes(x[0])).map(x => x[0]).slice(0, 8), ['animate','random','damage','tone','text','ui','delay','animate']);
  }

  // Neutral DiBo preserves double-roll BEFORE the one neutral element pick.
  {
    const h = makeHarness({ activePet: 'neutral', player: { petDoubleChance: .5 }, randomValues: [.2], pickValues: ['ice'] });
    await owner.petTurn();
    const order = h.trace.filter(x => ['random','pick'].includes(x[0])).map(x => x[0]);
    assert.deepStrictEqual(order, ['random','pick']);
    assert.strictEqual(h.trace.filter(x => x[0] === 'damage').length, 2, 'Pet double hit drifted');
    assert(h.trace.find(x => x[0] === 'text')[1].includes('after rolling ❄️'));
  }

  // Defeating the selected target reconciles through the existing index seam.
  {
    const first = enemy('A', 1), second = enemy('B', 100);
    const h = makeHarness({ enemies: [first, second], activePet: 'fire', randomValues: [.99] });
    await owner.petTurn();
    assert.strictEqual(first.hp, 0);
    assert(h.trace.some(x => x[0] === 'target' && x[1] === 0), 'defeated-target reconciliation drifted');
  }

  // Beastmaster damage and stance follow-up remain outside/after the base Pet strike.
  {
    const h = makeHarness({ classId: 'beastmaster', activeClasses: ['beastmaster'], activePet: 'fire', player: { beastStance: 'aggressive' } });
    assert.strictEqual(owner.petDamage(), 5, 'Beastmaster aggressive Pet damage drifted');
    h.player.beastStance = 'defensive';
    await owner.petTurn();
    assert.strictEqual(h.player.combatShield, 1);
    assert(h.trace.findIndex(x => x[0] === 'damage') < h.trace.findIndex(x => x[0] === 'history' && x[1].includes('Defensive pack order')));
  }
  {
    const h = makeHarness({ classId: 'beastmaster', activeClasses: ['beastmaster'], activePet: 'fire', boardLevel: 4, player: { beastStance: 'support', hp: 50 } });
    await owner.petTurn();
    assert.strictEqual(h.player.hp, 54, 'Beastmaster support heal drifted');
  }

  // Pokémon Trainer replaces the ordinary active-Pet turn and rolls assist chance before assist-pet pick.
  {
    const h = makeHarness({
      classId: 'pokemontrainer', activeClasses: ['pokemontrainer'], activePet: 'fire', randomValues: [.1], pickValues: ['ice'],
      player: { trainerRoster: ['fire', 'ice'], trainerActiveIndex: 0, trainerAssistBonus: 0, trainerAssistScale: .65 }
    });
    await owner.petTurn();
    assert.strictEqual(h.trace.filter(x => x[0] === 'damage').length, 2, 'Trainer lead + assist count drifted');
    assert.deepStrictEqual(h.trace.filter(x => ['random','pick'].includes(x[0])).map(x => x[0]), ['random','pick']);
    assert.strictEqual(owner.activeTrainerPetId(), 'fire');
  }

  // Summoner keeps ordinary active Pet first, then per-spirit double roll and strikes.
  {
    const h = makeHarness({
      classId: 'summoner', activeClasses: ['summoner'], activePet: 'fire', randomValues: [.99, .1],
      player: { summonerSpirits: ['ice'], summonerSpiritScale: 1, summonerSpiritDouble: .5 }
    });
    await owner.petTurn();
    assert.strictEqual(h.trace.filter(x => x[0] === 'damage').length, 3, 'Summoner ordinary + double spirit sequence drifted');
    assert.strictEqual(h.trace.filter(x => x[0] === 'random').length, 2, 'Summoner RNG cursor drifted');
  }

  // Primal Spark rolls only when eligible and then uses the Pet element.
  {
    const h = makeHarness({ activePet: 'fire', gameplayRanks: { companion_element_proc: 1 }, randomValues: [.99, .01] });
    await owner.petTurn();
    assert(h.trace.some(x => x[0] === 'element' && x[1] === 'fire' && x[3] === 'Companion Spark'), 'Primal Spark did not use semantic Pet element');
  }

  // Healing Nuzzle and the historical temporary set-double mutation both restore correctly.
  {
    const h = makeHarness({ activePet: 'fire', setBonus: .2, randomValues: [.99], player: { hp: 50, petTurnHeal: 3, petDoubleChance: .1 } });
    await owner.petTurn();
    assert.strictEqual(h.player.hp, 53);
    assert.strictEqual(h.player.petDoubleChance, .1, 'set Pet-double bonus leaked after turn');
  }

  // Pet Mirror is post-turn, uses last element, and restores temporary element-damage scaling.
  {
    const h = makeHarness({ activePet: 'fire', effects: ['pet_mirror'], lastElement: 'ice', randomValues: [.99, .1], player: { elementDamageBonus: .2 } });
    await owner.petTurn();
    const mirror = h.trace.find(x => x[0] === 'element' && x[3] === 'Pet Mirror');
    assert(mirror && mirror[1] === 'ice', 'Pet Mirror element/order drifted');
    assert.strictEqual(h.player.elementDamageBonus, .2, 'Pet Mirror temporary element bonus leaked');
  }

  // Bond scaling is authoritative for both active and Trainer/Summoner damage.
  {
    makeHarness({ activePet: 'fire', bondLevels: { fire: 21 }, meta: { activePet: 'fire', pets: { neutral: { level: 1 }, fire: { level: 11 }, ice: { level: 1 }, light: { level: 1 } } } });
    assert.strictEqual(owner.petDamage(), 14, 'active Pet Bond scaling drifted');
    assert.strictEqual(owner.trainerPetDamage('fire'), 15, 'Trainer Pet Bond scaling drifted');
  }

  console.log('Combat Pet Turn Resolution deterministic contract: PASS');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
