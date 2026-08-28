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

const monolith = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");
assert.match(monolith, /window\.DiceboundCombatVfx\?\.create/, "Combat VFX local-state adapter is missing");
assert.match(monolith, /dbCombatVfx\.playDonutRain\(\{origin:'player',enemy:target\}\)/, "Player-origin Donut presentation is not routed with its real target");
assert.match(monolith, /const db064DonutEnemyElementProcBase=enemyElementProc;/, "Enemy-origin Donut procs are not routed through the authored VFX owner");
assert.match(monolith, /if\(isDonut&&result\)dbCombatVfx\.playDonutRain\(\{origin:'enemy',enemy\}\);/, "Enemy-origin Donut proc must play the authored rain after a real completed proc");
assert.doesNotMatch(monolith, /function dbPlayNatureVfx/, "Nature DOM presentation remained duplicated in the monolith");
assert.doesNotMatch(monolith, /function db064PlayDonutRain/, "Donut DOM presentation remained duplicated in the monolith");

console.log("Combat VFX ownership PASS: Nature suppression scope, live-target filter, asset contracts and monolith adapters");
