"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const presentationPath = path.join(root, "runtime", "js", "combat", "presentation.js");
const vfxPath = path.join(root, "runtime", "js", "combat", "vfx.js");
const assetsPath = path.join(root, "runtime", "js", "assets.js");
const fixturePath = path.join(root, "tools", "fixtures", "combat_view_0_6_6_31.json");
const updateFixture = process.env.DB_UPDATE_COMBAT_VIEW_ORACLE === "1";

const presentationSource = fs.readFileSync(presentationPath, "utf8");
const vfxSource = fs.readFileSync(vfxPath, "utf8");
for (const [label, source] of [["presentation", presentationSource], ["VFX", vfxSource]]) {
  assert(!source.includes("Math.random"), `${label} must not use Math.random`);
  assert(!/\brandom\s*\(/.test(source), `${label} must not call game random()`);
  assert(!/\brand\s*\(/.test(source), `${label} must not call game rand()`);
  assert(!/\bpick\s*\(/.test(source), `${label} must not call game pick()`);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function summarizeModel(model) {
  const summary = {
    attack: model.attack,
    guard: model.guard,
    potion: model.potion,
    ultimate: model.ultimate,
    special: model.special,
    hasSpecial: model.hasSpecial,
    resource: model.resource,
    enemyHpText: model.enemyHpText,
  };
  if (model.invokerAttacks?.active) summary.invokerAttacks = model.invokerAttacks;
  return plain(summary);
}

function collectPresentation() {
  const sandbox = { window: {}, console, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(presentationSource, sandbox, { filename: presentationPath });
  const owner = sandbox.window.DiceboundCombatPresentation;
  assert(owner && owner.owner === "combat/presentation", "combat presentation owner missing");

  const elements = {
    fire: { icon: "🔥", name: "Fire" },
    ice: { icon: "❄️", name: "Ice" },
    nature: { icon: "🌿", name: "Nature" },
  };
  const classes = {};
  for (const [id, name, icon, ultIcon, ultName] of [
    ["ranger", "Ranger", "🏹", "🌧️", "Arrow Storm"],
    ["ninja", "Ninja", "🥷", "🌘", "Thousand Shadows"],
    ["bloodmage", "Bloodmage", "🩸", "☄️", "Sanguine Cataclysm"],
    ["summoner", "Summoner", "🌌", "🌌", "Grand Convergence"],
    ["pokemontrainer", "Trainer", "🧢", "🌈", "Stampede"],
    ["paladin", "Paladin", "⚔️", "✨", "Oath"],
    ["berserker", "Berserker", "🪓", "💢", "Rage"],
    ["slimerouge", "Slime Rouge", "🔴", "🎭", "Borrow"],
    ["dragoon", "Dragoon", "🐉", "🐲", "Dragon Dive"],
    ["invoker", "Invoker", "🔮", "🌀", "Grand Invocation"],
    ["cleric", "Cleric", "☀️", "✨", "Divine Intervention"],
    ["alchemist", "Alchemist", "🧪", "⚗️", "Grand Elixir"],
  ]) classes[id] = { id, name, icon, ultimate: { icon: ultIcon, name: ultName, desc: `${name} ultimate.` } };

  const pets = {
    fire: { icon: "🔥", name: "Ember" },
    ice: { icon: "❄️", name: "Frost" },
    nature: { icon: "🌿", name: "Sprout" },
  };
  const occult = {
    summoner: { builderIcon: "✨", builder: "Spirit Bolt", spellIcon: "🐾", spell: "Conjure", cost: 35, gain: 18, desc: "Build a spirit circle." },
    invoker: { builderIcon: "🟢", builder: "Wex Strike", spellIcon: "🔴", spell: "Elemental Lance", cost: 50, gain: 25, desc: "Three orb attacks build Invoke formulas." },
  };

  let rngCalls = 0;
  let active = new Set(["ranger"]);
  let mechanics = new Set();
  let legendary = new Set();
  const state = {
    player: {
      classId: "ranger", hp: 80, maxHp: 100, potions: 2, level: 8,
      doubleStrike: 0.25, crit: 0.2, guardCooldown: 0, guardPower: 0.5,
      ultimateGuardGain: 20, ultimateCharge: 100, potionPower: 0.1,
      rangerMarkMax: 5, energyShield: 0,
    },
    currentEnemy: { name: "Wolf", hp: 70, maxHp: 100, attack: 12, defense: 4, weakness: "fire", affinity: "ice", dodge: 0.15, rangerMarks: 4 },
    currentEnemies: [], currentEnemyIndex: 0, currentEncounterLead: null,
    currentEncounterTurn: 0, combatBusy: false,
  };
  state.currentEnemies = [state.currentEnemy];

  const fakeDocument = {
    createElement() { return { classList: { add(){}, remove(){}, toggle(){} }, style: {}, dataset: {}, addEventListener(){}, appendChild(){}, insertBefore(){}, parentElement: null }; },
    querySelector() { return null; },
  };

  owner.configure({
    document: fakeDocument,
    getState: () => state,
    find: () => null,
    getClasses: () => classes,
    getElements: () => elements,
    getPets: () => pets,
    getOccultSpells: () => occult,
    getGagInfo: () => ({}),
    enemyBattleArtById: () => null,
    enemyPortraitById: () => null,
    enemyModeAura: mode => ({ id: mode || "normal", className: "" }),
    guardianBattleArt: () => null,
    resolveCombatBackground: () => null,
    isClassActive: id => active.has(id),
    hasClassMechanic: id => mechanics.has(id),
    classIdentityId: () => state.player.classId,
    applyClassPortrait() {},
    enemyPortraitHTML: enemy => enemy.icon || "x",
    potionHealValue: () => 23,
    potionTooltip: () => "Potions currently restore about 23 HP. Potion Healing bonus: +10%. Base healing is 10 + 10% of max HP.",
    describeUltimate: id => `description:${id}`,
    berserkerRageBonus: () => 0.42,
    hasLegendaryEffect: id => legendary.has(id),
    legendaryEffect: id => id === "unstable_ultimate" ? { id, name: "Unstable Ultimate", chargeThreshold: 63, damageMultiplier: 0.42 } : null,
    invokerAttackSpec: key => ({quas:{damage:.85,echoMultiplier:.70},wex:{damage:.85,echoMultiplier:1.20},exort:{damage:1.20,echoMultiplier:.70}}[key]||null),
    activeTrainerPetId: () => "ice",
    selectEnemy() {},
    dragoonActive: () => active.has("dragoon"),
    dragoonJumpCooldown: () => 4,
    onDragoonJump() {},
    performClassAction() {},
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    delay: async () => {},
    random: () => { rngCalls += 1; return 0.5; },
    rand: () => { rngCalls += 1; return 1; },
    pick: values => { rngCalls += 1; return values[0]; },
    guardianSpecialInterval: 5,
  });

  function model(name, configure) {
    configure();
    const beforeState = JSON.stringify(state);
    const beforeRng = rngCalls;
    const result = summarizeModel(owner._test.buildViewModel());
    assert.equal(JSON.stringify(state), beforeState, `${name} presentation mutated combat state`);
    assert.equal(rngCalls, beforeRng, `${name} presentation consumed RNG`);
    return result;
  }

  const cases = {};
  cases.ranger = model("ranger", () => {
    active = new Set(["ranger"]); mechanics = new Set(); legendary = new Set();
    state.combatBusy = false; state.player.classId = "ranger"; state.player.hp = 80; state.player.maxHp = 100;
    state.player.potions = 2; state.player.ultimateCharge = 100; state.player.rangerMarkMax = 5;
    state.player.slimeRougeUltimateClass = null; state.currentEnemy.rangerMarks = 4;
  });
  cases.ninja = model("ninja", () => {
    active = new Set(["ninja"]); mechanics = new Set(); state.player.classId = "ninja";
    state.player.ninjaSmoke = 2; state.player.ninjaSmokeNeed = 3;
  });
  cases.bloodmage = model("bloodmage", () => {
    active = new Set(["bloodmage"]); mechanics = new Set(); state.player.classId = "bloodmage"; state.player.hp = 51;
  });
  cases.summoner = model("summoner", () => {
    active = new Set(["summoner"]); mechanics = new Set(["mana"]); state.player.classId = "summoner";
    state.player.mana = 40; state.player.maxMana = 120; state.player.guardManaGain = 6;
    state.player.summonerSpirits = ["fire"]; state.player.summonerCap = 3; state.player.summonerManaBonus = 2;
  });
  cases.trainer = model("trainer", () => {
    active = new Set(["pokemontrainer"]); mechanics = new Set(); state.player.classId = "pokemontrainer";
    state.player.trainerRoster = ["fire", "ice", "nature"]; state.player.trainerActiveIndex = 1;
  });
  cases.invoker = model("invoker", () => {
    active = new Set(["invoker"]); mechanics = new Set(["mana"]); state.player.classId = "invoker";
    state.player.mana = 75; state.player.maxMana = 100; state.player.guardManaGain = 6;
  });
  cases.clericReady = model("clericReady", () => {
    active = new Set(["cleric"]); mechanics = new Set(); state.player.classId = "cleric"; state.player.clericFaith = 100;
  });
  cases.alchemist = model("alchemist", () => {
    active = new Set(["alchemist"]); mechanics = new Set(); state.player.classId = "alchemist";
    state.player.potions = 3; state.player.alchemistBrewCounter = 2; state.player.alchemistBrewNeed = 3;
  });
  cases.slimeBorrowedUltimate = model("slimeBorrowedUltimate", () => {
    active = new Set(); mechanics = new Set(); state.player.classId = "slimerouge";
    state.player.slimeRougeUltimateClass = "ranger"; state.player.ultimateCharge = 100;
  });
  cases.unstableUltimate70 = model("unstableUltimate70", () => {
    active = new Set(["ranger"]); mechanics = new Set(); legendary = new Set(["unstable_ultimate"]);
    state.player.classId = "ranger"; state.player.slimeRougeUltimateClass = null; state.player.ultimateCharge = 70;
  });
  cases.dragoonLanding = model("dragoonLanding", () => {
    active = new Set(["dragoon"]); mechanics = new Set(); legendary = new Set(); state.player.classId = "dragoon";
    state.player.dragoonLandingReady = true; state.player.dragoonAirborneResponses = 0; state.player.dragoonJumpCooldown = 0;
  });
  cases.busyRanger = model("busyRanger", () => {
    active = new Set(["ranger"]); state.player.classId = "ranger"; state.player.dragoonLandingReady = false;
    state.player.ultimateCharge = 100; state.combatBusy = true;
  });

  return {
    owner: owner.owner,
    cases,
    statuses: {
      compact: owner.statusDotsHTML(2, 3, "fire"),
      counted: owner.statusDotsHTML(5, 6, "ice"),
      empty: owner.statusDotsHTML(0, 0, null),
    },
    rngCalls,
  };
}

function createDonutDocument() {
  const nodes = [];
  const ids = new Map();
  function node(id = "") {
    const current = {
      id, className: "", dataset: {}, style: {}, children: [], connected: true,
      append(child) { child.parentNode = current; current.children.push(child); },
      appendChild(child) { current.append(child); if (child.id) ids.set(child.id, child); },
      remove() { current.connected = false; if (current.parentNode) current.parentNode.children = current.parentNode.children.filter(child => child !== current); },
    };
    nodes.push(current); if (id) ids.set(id, current); return current;
  }
  const player = node("combatPlayerIcon");
  const enemy = node(); enemy.dataset.enemyIndex = "0";
  const document = {
    head: node("head"), body: node("body"), createElement: () => node(),
    getElementById: id => ids.get(id) || null,
    querySelectorAll: selector => selector === ".db-donut-rain-vfx" ? nodes.filter(current => current.connected && current.className === "db-donut-rain-vfx") : [],
    querySelector: selector => selector.includes(".stage-enemy") ? enemy : null,
  };
  return { document, player, enemy };
}

function createProjectileDocument() {
  const nodes = [];
  const ids = new Map();
  function node(id = "", rect = null) {
    const classes = new Set();
    const current = {
      id, className: "", dataset: {}, style: {}, children: [], connected: true,
      classList: { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)) },
      append(child) { child.parentNode = current; current.children.push(child); },
      appendChild(child) { current.append(child); if (child.id) ids.set(child.id, child); },
      remove() { current.connected = false; if (current.parentNode) current.parentNode.children = current.parentNode.children.filter(child => child !== current); },
      getBoundingClientRect: () => rect,
    };
    nodes.push(current); if (id) ids.set(id, current); return current;
  }
  const player = node("combatPlayerIcon", { left: 20, top: 40, width: 80, height: 90 });
  const enemy = node("", { left: 360, top: 110, width: 100, height: 120 }); enemy.dataset.enemyIndex = "0";
  const document = {
    head: node("head"), body: node("body"), createElement: () => node(), getElementById: id => ids.get(id) || null,
    querySelector: selector => selector.includes(".stage-enemy") ? enemy : null,
    querySelectorAll: selector => nodes.filter(current => current.connected && selector.includes(".db-combat-projectile-vfx") && current.className.includes("db-combat-projectile-vfx")),
  };
  return { document, player, enemy, nodes };
}

function loadVfx(context) {
  vm.runInContext(fs.readFileSync(assetsPath, "utf8"), context, { filename: assetsPath });
  vm.runInContext(vfxSource, context, { filename: vfxPath });
  return context.window.DiceboundCombatVfx;
}

function collectVfx() {
  const baseContext = vm.createContext({ window: {}, document: undefined, setTimeout, clearTimeout, Image: undefined });
  const baseApi = loadVfx(baseContext);
  const defeated = { name: "defeated", hp: 0 }, living = { name: "living", hp: 12 };
  const base = baseApi.create({ getEnemies: () => [defeated, living], getPlayer: () => ({ hp: 10 }) });
  const suppression = {};
  suppression.before = base.suppressLegacyElementAnimation("nature");
  suppression.during = base.withNatureLegacyPresentation("nature", () => base.suppressLegacyElementAnimation("nature"));
  suppression.after = base.suppressLegacyElementAnimation("nature");

  const donutDom = createDonutDocument();
  const donutTimers = [];
  const donutContext = vm.createContext({
    window: { matchMedia: () => ({ matches: false }) }, document: donutDom.document,
    setTimeout: callback => { donutTimers.push(callback); return donutTimers.length; }, clearTimeout() {}, Image: undefined,
  });
  const donutApi = loadVfx(donutContext);
  const donutEnemy = { hp: 10 };
  const donut = donutApi.create({ getEnemies: () => [donutEnemy], getPlayer: () => ({ hp: 10 }) });
  const donutPlayed = donut.playDonutRain({ origin: "player", enemy: donutEnemy });
  const donutInitial = plain(donut.donutEntries());
  const donutTimerCount = donutTimers.length;
  donutTimers[0]();
  const donutFrameOne = plain(donut.donutEntries());

  const reducedDom = createDonutDocument();
  const reducedTimers = [];
  const reducedContext = vm.createContext({
    window: { matchMedia: () => ({ matches: true }) }, document: reducedDom.document,
    setTimeout: callback => { reducedTimers.push(callback); return reducedTimers.length; }, clearTimeout() {}, Image: undefined,
  });
  const reducedApi = loadVfx(reducedContext);
  const reduced = reducedApi.create({ getEnemies: () => [donutEnemy], getPlayer: () => ({ hp: 10 }) });
  const reducedPlayed = reduced.playDonutRain({ origin: "enemy", enemy: donutEnemy });

  const projectileDom = createProjectileDocument();
  const projectileTimers = [];
  const clearedTimers = [];
  const projectileContext = vm.createContext({
    window: {}, document: projectileDom.document,
    setTimeout: callback => { projectileTimers.push(callback); return projectileTimers.length; },
    clearTimeout: timer => clearedTimers.push(timer), Image: undefined,
  });
  const projectileApi = loadVfx(projectileContext);
  const projectileEnemy = { hp: 10 };
  const projectile = projectileApi.create({ getEnemies: () => [projectileEnemy], getPlayer: () => ({ hp: 10 }) });
  const firePlayed = projectile.playProjectileProc("fire", { origin: "player", enemy: projectileEnemy });
  const fireNode = projectileDom.document.body.children.at(-1);
  const fireInitial = { src: fireNode.children[0].src, left: fireNode.style.left, top: fireNode.style.top, transform: fireNode.style.transform, timerCount: projectileTimers.length };
  const epoch = projectile.clearTransient();
  const cancelled = [...clearedTimers];
  const gunPlayed = projectile.playProjectileProc("gun", { origin: "player", enemy: projectileEnemy });
  const gunNode = projectileDom.document.body.children.at(-1);
  const gunInitial = { src: gunNode.children[0].src, left: gunNode.style.left, top: gunNode.style.top, transform: gunNode.style.transform, timerCount: projectileTimers.length };
  projectileTimers[3]();
  const gunFire = { src: gunNode.children[0].src, phase: gunNode.dataset.phase, transform: gunNode.style.transform };
  projectileTimers[4]();
  const gunTravel = { src: gunNode.children[0].src, phase: gunNode.dataset.phase, left: gunNode.style.left, top: gunNode.style.top, transform: gunNode.style.transform };

  return plain({
    effects: {
      nature: base.natureEffect(),
      donut: base.donutEffect(),
      livingNatureTargets: base.livingNatureTargets().map(enemy => enemy.name),
      suppression,
    },
    donut: { played: donutPlayed, initial: donutInitial, timerCount: donutTimerCount, frameOne: donutFrameOne },
    reducedMotionDonut: { played: reducedPlayed, timerCount: reducedTimers.length, initial: reduced.donutEntries() },
    projectile: { firePlayed, fireInitial, clearEpoch: epoch, cancelledTimers: cancelled, gunPlayed, gunInitial, gunFire, gunTravel },
  });
}

const actual = {
  baseline: "0.6.6.31",
  presentation: collectPresentation(),
  vfx: collectVfx(),
};
assert.equal(actual.presentation.rngCalls, 0, "Combat View characterization consumed gameplay RNG");

if (updateFixture) {
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, JSON.stringify(actual, null, 2) + "\n", "utf8");
  console.log(`Combat View fixture written: ${path.relative(root, fixturePath)}`);
} else {
  assert(fs.existsSync(fixturePath), "Combat View fixture is missing; materialize it from released 0.6.6.31 before facade work");
  const expected = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.deepStrictEqual(actual, expected, "Combat View output/DOM/VFX characterization drifted from released 0.6.6.31");
  console.log("Combat View oracle PASS: released 0.6.6.31 presentation/VFX outputs and zero-gameplay-RNG contract are exact");
}