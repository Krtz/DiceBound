const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'runtime/js/combat/presentation.js');
const source = fs.readFileSync(sourcePath, 'utf8');
assert(!source.includes('Math.random'), 'presentation owner must not use Math.random');
assert(!/\brandom\s*\(/.test(source), 'presentation owner must not call game random()');
assert(!/\brand\s*\(/.test(source), 'presentation owner must not call game rand()');
assert(!/\bpick\s*\(/.test(source), 'presentation owner must not call game pick()');

const sandbox = { window: {}, console, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });
const owner = sandbox.window.DiceboundCombatPresentation;
assert(owner && owner.owner === 'combat/presentation', 'combat presentation owner was not published');

const elements = {
  fire: { icon: '🔥', name: 'Fire' },
  ice: { icon: '❄️', name: 'Ice' },
  nature: { icon: '🌿', name: 'Nature' }
};
const classes = {
  ranger: { id: 'ranger', name: 'Ranger', icon: '🏹', ultimate: { icon: '🌧️', name: 'Arrow Storm', desc: 'Arrows.' } },
  ninja: { id: 'ninja', name: 'Ninja', icon: '🥷', ultimate: { icon: '🌘', name: 'Thousand Shadows', desc: 'Shadows.' } },
  bloodmage: { id: 'bloodmage', name: 'Bloodmage', icon: '🩸', ultimate: { icon: '☄️', name: 'Sanguine Cataclysm', desc: 'Blood.' } },
  summoner: { id: 'summoner', name: 'Summoner', icon: '🌌', ultimate: { icon: '🌌', name: 'Grand Convergence', desc: 'Spirits.' } },
  pokemontrainer: { id: 'pokemontrainer', name: 'Trainer', icon: '🧢', ultimate: { icon: '🌈', name: 'Stampede', desc: 'Roster.' } },
  paladin: { id: 'paladin', name: 'Paladin', icon: '⚔️', ultimate: { icon: '✨', name: 'Oath', desc: 'Grace.' } },
  berserker: { id: 'berserker', name: 'Berserker', icon: '🪓', ultimate: { icon: '💢', name: 'Rage', desc: 'Rage.' } },
  slimerouge: { id: 'slimerouge', name: 'Slime Rouge', icon: '🔴', ultimate: { icon: '🎭', name: 'Borrow', desc: 'Borrowed.' } },
  dragoon: { id: 'dragoon', name: 'Dragoon', icon: '🐉', ultimate: { icon: '🐲', name: 'Dragon Dive', desc: 'Dive.' } }
};
const pets = {
  fire: { icon: '🔥', name: 'Ember' },
  ice: { icon: '❄️', name: 'Frost' },
  nature: { icon: '🌿', name: 'Sprout' }
};
const occult = {
  summoner: { builderIcon: '✨', builder: 'Spirit Bolt', spellIcon: '🐾', spell: 'Conjure', cost: 35, gain: 18, desc: 'Build a spirit circle.' }
};

let rngCalls = 0;
let active = new Set(['ranger']);
let mechanics = new Set();
let legendary = new Set();
let state = {
  player: {
    classId: 'ranger', hp: 80, maxHp: 100, potions: 2, level: 8, doubleStrike: .25, crit: .2,
    guardCooldown: 0, guardPower: .5, ultimateGuardGain: 20, ultimateCharge: 100, potionPower: .1,
    rangerMarkMax: 5, energyShield: 0
  },
  currentEnemy: { name: 'Wolf', hp: 70, maxHp: 100, attack: 12, defense: 4, weakness: 'fire', affinity: 'ice', dodge: .15, rangerMarks: 4 },
  currentEnemies: [], currentEnemyIndex: 0, currentEncounterLead: null, currentEncounterTurn: 0, combatBusy: false,
  boardLevel: 1, nightmareMode: false, hellMode: false
};
state.currentEnemies = [state.currentEnemy];

function fakeStyle() {
  const props = Object.create(null);
  return {
    setProperty(name, value) { props[name] = String(value); },
    removeProperty(name) { delete props[name]; },
    getPropertyValue(name) { return props[name] || ''; },
    _props: props
  };
}

function fakeClassList() {
  const values = new Set();
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    toggle(name, force) { if (force === undefined ? !values.has(name) : force) values.add(name); else values.delete(name); },
    contains(name) { return values.has(name); }
  };
}
const documentNodes = new Map();
const combatOverlay = { dataset: {}, style: fakeStyle(), classList: fakeClassList() };
const combatPlayerIcon = { classList: fakeClassList(), offsetWidth: 42 };
const combatEnemyIcon = { classList: fakeClassList(), offsetWidth: 42 };
const fakeDocument = {
  head: {
    children: [],
    appendChild(node) { this.children.push(node); if (node.id) documentNodes.set(node.id, node); return node; }
  },
  createElement() { return { classList: { add(){}, remove(){}, toggle(){} }, style: fakeStyle(), dataset: {}, addEventListener(){}, appendChild(){}, insertBefore(){}, parentElement: null, textContent: '', id: '' }; },
  getElementById(id) { return documentNodes.get(id) || null; },
  querySelector() { return null; }
};

function runtime() {
  return {
    document: fakeDocument,
    getState: () => state,
    find: id => id === 'combatOverlay' ? combatOverlay : id === 'combatPlayerIcon' ? combatPlayerIcon : id === 'enemyIcon' ? combatEnemyIcon : null,
    getClasses: () => classes,
    getElements: () => elements,
    getPets: () => pets,
    getOccultSpells: () => occult,
    getGagInfo: () => ({}),
    enemyBattleArtById: () => null,
    enemyPortraitById: () => null,
    enemyModeAura: mode => ({ id: mode, className: `mode-${mode}` }),
    guardianBattleArt: () => null,
    resolveCombatBackground: (board, mode) => mode === 'hell' ? null : ({ image: `assets/combat/backgrounds/board-${board}-${mode}.png`, focus: '50% 50%' }),
    isClassActive: id => active.has(id),
    hasClassMechanic: id => mechanics.has(id),
    classIdentityId: () => state.player.classId,
    applyClassPortrait() {},
    potionHealValue: () => 23,
    potionTooltip: () => 'Potions currently restore about 23 HP. Potion Healing bonus: +10%. Base healing is 10 + 10% of max HP.',
    describeUltimate: id => `description:${id}`,
    berserkerRageBonus: () => .42,
    hasLegendaryEffect: id => legendary.has(id),
    activeTrainerPetId: () => 'ice',
    selectEnemy() {},
    dragoonActive: () => active.has('dragoon'),
    dragoonJumpCooldown: () => 4,
    onDragoonJump() {},
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    random: () => { rngCalls++; return .5; },
    rand: () => { rngCalls++; return 1; },
    pick: values => { rngCalls++; return values[0]; },
    guardianSpecialInterval: 5
  };
}
owner.configure(runtime());

function model() {
  const beforePlayer = JSON.stringify(state.player), beforeEnemy = JSON.stringify(state.currentEnemy), beforeRng = rngCalls;
  const out = owner._test.buildViewModel();
  assert.strictEqual(JSON.stringify(state.player), beforePlayer, 'building presentation model mutated player state');
  assert.strictEqual(JSON.stringify(state.currentEnemy), beforeEnemy, 'building presentation model mutated enemy state');
  assert.strictEqual(rngCalls, beforeRng, 'building presentation model consumed RNG');
  return out;
}

let out = model();
assert.strictEqual(out.resource.name, 'Marks on target');
assert.strictEqual(out.resource.value, 4);
assert.strictEqual(out.resource.max, 5);
assert(out.resource.note.includes('Current cap: 5'));
assert(out.enemyHpText.includes('12 ATK · 4 DEF · 15% DODGE'));

active = new Set(['ninja']); state.player.classId = 'ninja'; state.player.ninjaSmoke = 2; state.player.ninjaSmokeNeed = 3;
out = model();
assert.strictEqual(out.resource.name, 'Smoke');
assert(out.resource.note.includes('double crit grants 2'));

active = new Set(['bloodmage']); state.player.classId = 'bloodmage'; state.player.hp = 51;
out = model();
assert.strictEqual(out.attack.text, '🩸 Bloodletting');
assert.strictEqual(out.guard.text, '💉 Replenish');
assert(out.guard.tip.includes('counts as Guard for the incoming enemy response'));
assert.strictEqual(out.special.text, '🩸 Exsanguinate');
assert.strictEqual(out.resource.name, 'Blood fuel (HP)');

active = new Set(['summoner']); mechanics = new Set(['mana']); state.player.classId = 'summoner'; state.player.mana = 40; state.player.maxMana = 120; state.player.summonerSpirits = ['fire']; state.player.summonerCap = 3; state.player.summonerManaBonus = 2;
out = model();
assert.strictEqual(out.special.text, '🐾 Conjure (35) · 1/3');
assert(out.special.tip.includes('immediately makes your active companion'));
assert.strictEqual(out.resource.name, 'Mana / Spirit Circle');
assert(out.resource.note.includes('🔥 Ember'));
assert(out.guard.tip.includes('channels up to'));

active = new Set(['pokemontrainer']); mechanics = new Set(); state.player.classId = 'pokemontrainer'; state.player.trainerRoster = ['fire','ice','nature']; state.player.trainerActiveIndex = 1;
out = model();
assert.strictEqual(out.special.text, '🔄 Switch · ❄️ Frost');
assert.strictEqual(out.resource.name, 'Six-creature roster');

active = new Set(['paladin']); state.player.classId = 'paladin'; state.player.paladinGrace = 75;
out = model(); assert.strictEqual(out.resource.name, 'Oath Grace'); assert.strictEqual(out.resource.value, 75);

active = new Set(['berserker']); state.player.classId = 'berserker';
out = model(); assert.strictEqual(out.resource.name, 'Rage'); assert.strictEqual(out.resource.value, 42);

active = new Set(); state.player.classId = 'slimerouge'; state.player.slimeRougeUltimateClass = 'ranger';
out = model(); assert.strictEqual(out.ultimate.text, '🌧️ Arrow Storm'); assert(out.ultimate.tip.includes('Borrowed Ranger ultimate'));

active = new Set(['ranger']); state.player.classId = 'ranger'; state.player.slimeRougeUltimateClass = null; state.player.ultimateCharge = 69; legendary = new Set(['unstable_ultimate']);
out = model(); assert.strictEqual(out.ultimate.disabled, true); assert(out.ultimate.tip.includes('usable at 70 charge'));
state.player.ultimateCharge = 70; out = model(); assert.strictEqual(out.ultimate.disabled, false);

legendary = new Set(); active = new Set(['dragoon']); state.player.classId = 'dragoon'; state.player.dragoonLandingReady = true; state.player.dragoonAirborneResponses = 0; state.player.dragoonJumpCooldown = 0;
out = model(); assert.strictEqual(out.attack.text, '🐉 Land'); assert.strictEqual(out.guard.disabled, true); assert.strictEqual(out.potion.disabled, true); assert.strictEqual(out.ultimate.disabled, true);

assert(owner.statusDotsHTML(2, 3, 'fire').includes('Fire affinity'));

assert.strictEqual(owner.dodge('player'), true);
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), true);
assert.strictEqual(owner.dodge('player'), true, 'rapid repeated Dodge must retrigger cleanly');
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), true);
assert.strictEqual(owner.dodge('enemy'), true, 'the animation API is generic to a combat unit, not Wolf-specific');
assert.strictEqual(combatEnemyIcon.classList.contains('db-dodge-backflip'), true);
owner.clearDodgePresentation();
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), false);
assert.strictEqual(combatEnemyIcon.classList.contains('db-dodge-backflip'), false);

state.boardLevel = 1; state.nightmareMode = false; state.hellMode = false;
let background = owner.applyCombatBackground();
assert.strictEqual(background.image, 'assets/combat/backgrounds/board-1-normal.png');
assert.strictEqual(combatOverlay.dataset.combatBackground, 'board-1-normal');
assert.strictEqual(combatOverlay.style.getPropertyValue('--db-combat-background-image'), 'url("assets/combat/backgrounds/board-1-normal.png")');
const backgroundStyle = fakeDocument.getElementById('dicebound-combat-background-style');
assert(backgroundStyle, 'combat background presentation style was not installed');
assert(backgroundStyle.textContent.includes('background-size:cover'), 'combat background must cover the overlay');
assert(backgroundStyle.textContent.includes('rgba(19,31,54,.55)'), 'combat modal translucency contract was lost');

state.nightmareMode = true;
background = owner.applyCombatBackground();
assert.strictEqual(background.image, 'assets/combat/backgrounds/board-1-nightmare.png');
assert.strictEqual(combatOverlay.dataset.combatBackground, 'board-1-nightmare');

state.nightmareMode = false; state.hellMode = true;
background = owner.applyCombatBackground();
assert.strictEqual(background, null, 'Hell must keep its explicit no-authored-background contract');
assert.strictEqual(combatOverlay.dataset.combatBackground, undefined, 'Hell must clear stale Normal/Nightmare background identity');
assert.strictEqual(combatOverlay.style.getPropertyValue('--db-combat-background-image'), '', 'Hell must clear stale background image');

assert.strictEqual(rngCalls, 0, 'combat presentation test consumed RNG');
console.log('Combat presentation owner PASS: final class controls, stable-ID art ports, battle backgrounds, statuses, thresholds and zero-RNG view models are deterministic');
