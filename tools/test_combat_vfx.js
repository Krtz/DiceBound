"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ window: {}, document: undefined, setTimeout, Image: undefined });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "assets.js"), "utf8"), context, { filename: "assets.js" });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "combat", "vfx.js"), "utf8"), context, { filename: "vfx.js" });

const api = context.window.DiceboundCombatVfx;
assert.ok(Object.isFrozen(api));
const defeated = { name: "defeated", hp: 0 };
const living = { name: "living", hp: 12 };
const vfx = api.create({ getEnemies: () => [defeated, living], getPlayer: () => ({ hp: 10 }) });
assert.ok(Object.isFrozen(vfx));
assert.equal(vfx.natureEffect().frameDurationMs, 75);
assert.equal(vfx.donutEffect().durationMs, 1450);
assert.equal(vfx.donutFramePosition(0, 6), "0% 0%");
assert.equal(vfx.donutFramePosition(5, 6), "100% 0%");
assert.deepEqual(JSON.parse(JSON.stringify(vfx.livingNatureTargets())), [living]);
assert.equal(vfx.suppressLegacyElementAnimation("nature"), false);
const result = vfx.withNatureLegacyPresentation("nature", () => {
  assert.equal(vfx.suppressLegacyElementAnimation("nature"), true);
  assert.equal(vfx.suppressLegacyElementAnimation("fire"), false);
  return "resolved";
});
assert.equal(result, "resolved");
assert.equal(vfx.suppressLegacyElementAnimation("nature"), false);
vfx.withNatureLegacyPresentation("donut", () => assert.equal(vfx.suppressLegacyElementAnimation("nature"), false));
assert.deepEqual(JSON.parse(JSON.stringify(vfx.natureEntries())), []);
assert.deepEqual(JSON.parse(JSON.stringify(vfx.donutEntries())), []);

function createDonutDocument() {
  const nodes = [];
  const ids = new Map();
  function node(id = "") {
    const current = {
      id,
      className: "",
      dataset: {},
      style: {},
      children: [],
      connected: true,
      append(child) { child.parentNode = current; current.children.push(child); },
      appendChild(child) { current.append(child); },
      remove() {
        current.connected = false;
        if (current.parentNode) current.parentNode.children = current.parentNode.children.filter(child => child !== current);
      },
    };
    nodes.push(current);
    if (id) ids.set(id, current);
    return current;
  }
  const player = node("combatPlayerIcon");
  const enemy = node();
  enemy.dataset.enemyIndex = "0";
  const document = {
    head: node("head"),
    body: node("body"),
    createElement: () => node(),
    getElementById: id => ids.get(id) || null,
    querySelectorAll: selector => selector === ".db-donut-rain-vfx" ? nodes.filter(current => current.connected && current.className === "db-donut-rain-vfx") : [],
    querySelector: selector => selector.includes(".stage-enemy") ? enemy : null,
  };
  return { document, player, enemy };
}

const donutDom = createDonutDocument();
const donutTimers = [];
const donutContext = vm.createContext({
  window: {},
  document: donutDom.document,
  setTimeout: callback => { donutTimers.push(callback); return donutTimers.length; },
  Image: undefined,
});
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "assets.js"), "utf8"), donutContext, { filename: "assets.js" });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "combat", "vfx.js"), "utf8"), donutContext, { filename: "vfx.js" });
const donutEnemy = { hp: 10 };
const renderedDonuts = donutContext.window.DiceboundCombatVfx.create({ getEnemies: () => [donutEnemy] });
assert.equal(renderedDonuts.playDonutRain({ origin: "player", enemy: donutEnemy }), true);
assert.deepEqual(JSON.parse(JSON.stringify(renderedDonuts.donutEntries())), [
  { src: "assets/combat/effects/donut/donut-proc-rain-spritesheet.png", effect: "donutProcRain", target: "player", origin: "player", frame: 0 },
  { src: "assets/combat/effects/donut/donut-proc-rain-spritesheet.png", effect: "donutProcRain", target: "enemy", origin: "player", frame: 0 },
]);
assert.equal(donutDom.player.children[0].style.backgroundSize, "600% 100%");
assert.equal(donutDom.enemy.children[0].style.backgroundImage, 'url("assets/combat/effects/donut/donut-proc-rain-spritesheet.png")');
donutTimers[0]();
assert.deepEqual(JSON.parse(JSON.stringify(renderedDonuts.donutEntries())).map(entry => entry.frame), [1, 1]);
assert.equal(renderedDonuts.playDonutRain({ origin: "enemy", enemy: donutEnemy }), true);
assert.ok(renderedDonuts.donutEntries().every(entry => entry.origin === "enemy"));

function createProjectileDocument() {
  const nodes = [];
  const ids = new Map();
  function node(id = "", rect = null) {
    const classes = new Set();
    const current = {
      id,
      className: "",
      dataset: {},
      style: {},
      children: [],
      connected: true,
      classList: { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)) },
      append(child) { child.parentNode = current; current.children.push(child); },
      appendChild(child) { current.append(child); if (child.id) ids.set(child.id, child); },
      remove() { current.connected = false; if (current.parentNode) current.parentNode.children = current.parentNode.children.filter(child => child !== current); },
      getBoundingClientRect: () => rect,
    };
    nodes.push(current);
    if (id) ids.set(id, current);
    return current;
  }
  const player = node("combatPlayerIcon", { left: 20, top: 40, width: 80, height: 90 });
  const enemy = node("", { left: 360, top: 110, width: 100, height: 120 });
  enemy.dataset.enemyIndex = "0";
  const document = {
    head: node("head"), body: node("body"), createElement: () => node(), getElementById: id => ids.get(id) || null,
    querySelector: selector => selector.includes(".stage-enemy") ? enemy : null,
    querySelectorAll: selector => nodes.filter(current => current.connected && selector.includes(".db-combat-projectile-vfx") && current.className.includes("db-combat-projectile-vfx")),
  };
  return { document, player, enemy, nodes };
}

const projectileDom = createProjectileDocument();
const projectileTimers = [];
const clearedTimers = [];
const projectileContext = vm.createContext({
  window: {}, document: projectileDom.document,
  setTimeout: callback => { projectileTimers.push(callback); return projectileTimers.length; },
  clearTimeout: timer => clearedTimers.push(timer), Image: undefined,
});
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "assets.js"), "utf8"), projectileContext, { filename: "assets.js" });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "combat", "vfx.js"), "utf8"), projectileContext, { filename: "vfx.js" });
const projectileEnemy = { hp: 10 };
const projectileVfx = projectileContext.window.DiceboundCombatVfx.create({ getEnemies: () => [projectileEnemy], getPlayer: () => ({ hp: 10 }) });
assert.equal(projectileVfx.playProjectileProc("fire", { origin: "player", enemy: projectileEnemy }), true, "Fire must use the authored projectile path");
assert.equal(projectileTimers.length, 3, "Projectile VFX must schedule travel, impact and cleanup once");
assert.equal(projectileVfx.clearTransient(), 1, "Clearing a transition must advance the presentation epoch");
assert.deepEqual(clearedTimers, [1, 2, 3], "Stale projectile callbacks must be cancelled at the combat boundary");

const monolith = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");
assert.match(monolith, /window\.DiceboundCombatVfx\?\.create/, "Combat VFX local-state adapter is missing");
assert.match(monolith, /dbCombatVfx\.playDonutRain\(\{origin:'player',enemy:target\}\)/, "Player-origin Donut presentation is not routed with its real target");
assert.match(monolith, /const db064DonutEnemyElementProcBase=enemyElementProc;/, "Enemy-origin Donut procs are not routed through the authored VFX owner");
assert.match(monolith, /if\(isDonut&&result\)dbCombatVfx\.playDonutRain\(\{origin:'enemy',enemy\}\);/, "Enemy-origin Donut proc must play the authored rain after a real completed proc");
assert.doesNotMatch(monolith, /function dbPlayNatureVfx/, "Nature DOM presentation remained duplicated in the monolith");
assert.doesNotMatch(monolith, /function db064PlayDonutRain/, "Donut DOM presentation remained duplicated in the monolith");
assert.match(monolith, /dbCombatVfx\.clearTransient\?\.\(\)/, "Combat transitions must explicitly clear authored transient VFX");
assert.match(monolith, /dbCombatVfx\.playProjectileProc\?\.\(key,\{origin:'player',enemy:target\}\)/, "Player Fire/Gun procs must use the authored projectile owner");

console.log("Combat VFX ownership PASS: Nature suppression scope, live-target filter, asset contracts and monolith adapters");
