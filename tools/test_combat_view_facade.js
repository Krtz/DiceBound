"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const facadePath = path.join(root, "runtime", "js", "combat", "view-facade.js");
const facadeSource = fs.readFileSync(facadePath, "utf8");
assert(!facadeSource.includes("Math.random"), "Combat View facade must not consume RNG");
assert(!/\brandom\s*\(/.test(facadeSource), "Combat View facade must not call game random()");
assert(!/\brand\s*\(/.test(facadeSource), "Combat View facade must not call game rand()");
assert(!/\bpick\s*\(/.test(facadeSource), "Combat View facade must not call game pick()");
assert(!/window\.DiceboundCombat\s*[;,]/.test(facadeSource), "Combat View facade must not absorb Combat Engine ownership");

const calls = [];
const presentationApi = Object.freeze({
  applyCombatBackground: (...args) => { calls.push(["presentation.applyCombatBackground", ...args]); return "background"; },
  update: (...args) => { calls.push(["presentation.update", ...args]); return "updated"; },
  renderEnemyParty: (...args) => { calls.push(["presentation.renderEnemyParty", ...args]); return "party"; },
  renderBossSpecialIndicator: (...args) => { calls.push(["presentation.renderBossSpecialIndicator", ...args]); return "boss"; },
  statusDotsHTML: (...args) => { calls.push(["presentation.statusDotsHTML", ...args]); return "dots"; },
  syncEnergyShieldBars: (...args) => { calls.push(["presentation.syncEnergyShieldBars", ...args]); return "shield"; },
  dodge: (...args) => { calls.push(["presentation.dodge", ...args]); return true; },
  clearDodgePresentation: (...args) => { calls.push(["presentation.clearDodgePresentation", ...args]); return "dodge-clear"; },
  syncDragoonPresentation: (...args) => { calls.push(["presentation.syncDragoonPresentation", ...args]); return "dragoon-sync"; },
  dragoonLandPresentation: (...args) => { calls.push(["presentation.dragoonLandPresentation", ...args]); return "dragoon-land"; },
  ensureDragoonJumpButton: (...args) => { calls.push(["presentation.ensureDragoonJumpButton", ...args]); return "jump"; },
  clearDragoonPresentation: (...args) => { calls.push(["presentation.clearDragoonPresentation", ...args]); return "dragoon-clear"; },
});
const vfxApi = Object.freeze({
  prepareNature: (...args) => { calls.push(["vfx.prepareNature", ...args]); return "nature-ready"; },
  natureEffect: (...args) => { calls.push(["vfx.natureEffect", ...args]); return { id: "nature" }; },
  donutEffect: (...args) => { calls.push(["vfx.donutEffect", ...args]); return { id: "donut" }; },
  livingNatureTargets: (...args) => { calls.push(["vfx.livingNatureTargets", ...args]); return ["living"]; },
  natureEntries: (...args) => { calls.push(["vfx.natureEntries", ...args]); return ["nature-entry"]; },
  playNatureOnEnemy: (...args) => { calls.push(["vfx.playNatureOnEnemy", ...args]); return true; },
  playNatureOnPlayer: (...args) => { calls.push(["vfx.playNatureOnPlayer", ...args]); return true; },
  withNatureLegacyPresentation: (...args) => { calls.push(["vfx.withNatureLegacyPresentation", ...args.slice(0, 1)]); return args[1](); },
  suppressLegacyElementAnimation: (...args) => { calls.push(["vfx.suppressLegacyElementAnimation", ...args]); return args[0] === "nature"; },
  donutEntries: (...args) => { calls.push(["vfx.donutEntries", ...args]); return ["donut-entry"]; },
  playDonutRain: (...args) => { calls.push(["vfx.playDonutRain", ...args]); return true; },
  prepareProjectileEffects: (...args) => { calls.push(["vfx.prepareProjectileEffects", ...args]); return true; },
  playProjectileProc: (...args) => { calls.push(["vfx.playProjectileProc", ...args]); return true; },
  clearTransient: (...args) => { calls.push(["vfx.clearTransient", ...args]); return 7; },
});
let configuredPresentationRuntime = null;
let configuredVfxRuntime = null;
const sandbox = {
  window: {
    DiceboundCombatPresentation: Object.freeze({
      owner: "combat/presentation",
      configure(runtime) { configuredPresentationRuntime = runtime; return presentationApi; },
    }),
    DiceboundCombatVfx: Object.freeze({
      create(runtime) { configuredVfxRuntime = runtime; return vfxApi; },
    }),
  },
  console,
};
vm.createContext(sandbox);
vm.runInContext(facadeSource, sandbox, { filename: facadePath });
const view = sandbox.window.DiceboundCombatView;
assert(view && Object.isFrozen(view), "DiceboundCombatView was not published as a frozen facade");
assert.equal(view.owner, "combat/view-facade");
assert.equal(view.apiVersion, 1);
assert.equal(view.isPresentationConfigured(), false);
assert.equal(view.isVfxConfigured(), false);
assert.throws(() => view.applyCombatBackground(), /presentation must be configured/);
assert.throws(() => view.update(), /presentation must be configured/);
assert.throws(() => view.playDonutRain({}), /VFX must be configured/);
assert.equal(view.syncDragoonPresentation(), undefined, "startup-safe presentation helper must remain a no-op before configuration");

const vfxRuntime = { getEnemies: () => [], getPlayer: () => null };
assert.equal(view.configureVfx(vfxRuntime), view);
assert.equal(configuredVfxRuntime, vfxRuntime);
assert.equal(view.isVfxConfigured(), true);
assert.equal(view.prepareNature(), "nature-ready");
assert.equal(view.playDonutRain({ origin: "player" }), true);
assert.equal(view.playProjectileProc("fire", { origin: "player" }), true);
assert.equal(view.clearTransient("pre-presentation"), 7);
assert(!calls.some(call => call[0] === "presentation.clearDragoonPresentation"), "VFX-only startup cleanup must not require presentation configuration");

const resolveCombatBackground = (board, mode) => ({ board, mode });
const presentationRuntime = { document: {}, resolveCombatBackground };
assert.equal(view.configurePresentation(presentationRuntime), view);
assert.notEqual(configuredPresentationRuntime, presentationRuntime, "facade must compose a dedicated Presentation runtime object");
assert.equal(configuredPresentationRuntime.document, presentationRuntime.document);
assert.equal(configuredPresentationRuntime.resolveCombatBackground, resolveCombatBackground, "facade must preserve an explicitly supplied background resolver");
assert.equal(view.isPresentationConfigured(), true);
assert.equal(view.applyCombatBackground("frame"), "background");
assert.deepEqual(calls.at(-1), ["presentation.applyCombatBackground", "frame"]);
assert.equal(view.update("frame"), "updated");
assert.equal(view.renderEnemyParty(), "party");
assert.equal(view.renderBossSpecialIndicator(), "boss");
assert.equal(view.statusDotsHTML(2, 3, "fire"), "dots");
assert.equal(view.syncEnergyShieldBars(), "shield");
assert.equal(view.dodge("player"), true);
assert.deepEqual(calls.at(-1), ["presentation.dodge", "player"]);
assert.equal(view.syncDragoonPresentation(), "dragoon-sync");
assert.equal(view.dragoonLandPresentation(), "dragoon-land");
assert.equal(view.ensureDragoonJumpButton(), "jump");
const clearStart = calls.length;
assert.equal(view.clearTransient("transition"), 7);
assert.deepEqual(calls.slice(clearStart).map(call => call[0]), ["vfx.clearTransient", "presentation.clearDodgePresentation", "presentation.clearDragoonPresentation"], "transition cleanup must clear VFX, Dodge and Dragoon presentation state");

const monolith = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");
assert.match(monolith, /const dbCombatView=window\.DiceboundCombatView;/, "monolith must bind the Combat View facade");
assert.match(monolith, /dbCombatView\.configureVfx\(\{getEnemies:\(\)=>currentEnemies,getPlayer:\(\)=>player\}\);/, "monolith must configure VFX through the facade");
assert.match(monolith, /dbCombatView\.configurePresentation\(\{/, "monolith must configure presentation through the facade");
assert.match(monolith, /function updateCombatUI\(\)\{const result=dbCombatView\.update\(\);updateHUD\(\);return result;\}/, "updateCombatUI is a real HUD-coupled seam and must stay singular");
assert.doesNotMatch(monolith, /\bfunction renderEnemyParty\s*\(/, "call-only renderEnemyParty adapter must stay retired");
assert.match(monolith, /withNatureLegacyPresentation:\(key,work\)=>dbCombatView\.withNatureLegacyPresentation\(key,work\)/, "element composition must route Nature presentation through Combat View");
assert.match(monolith, /playDonutRain:payload=>dbCombatView\.playDonutRain\(payload\)/, "element composition must route Donut presentation through Combat View");
assert.match(monolith, /playProjectileProc:\(key,payload\)=>dbCombatView\.playProjectileProc\?\.\(key,payload\)/, "element composition must route projectile presentation through Combat View");
assert.doesNotMatch(monolith, /window\.DiceboundCombatPresentation/, "monolith must not bind the focused Presentation owner directly");
assert.doesNotMatch(monolith, /window\.DiceboundCombatVfx/, "monolith must not bind the focused VFX owner directly");
assert.doesNotMatch(monolith, /\bdbCombatPresentation\b/, "peer-public Presentation variable must not survive in the monolith");
assert.doesNotMatch(monolith, /\bdbCombatVfx\b/, "peer-public VFX variable must not survive in the monolith");
assert.doesNotMatch(monolith, /dbFriendSuccessfulDodgePresentation/, "generic Dodge presentation must not be owned by the monolith");
assert.match(monolith, /dodge:unit=>dbCombatView\.dodge\(unit\)/, "Turn composition must route generic Dodge through Combat View");

const manifest = JSON.parse(fs.readFileSync(path.join(root, "runtime", "js", "module-manifest.json"), "utf8"));
const viewModule = manifest.modules.find(item => item.id === "combat-view-facade");
assert(viewModule, "combat-view-facade is missing from the module manifest");
assert.equal(viewModule.path, "js/combat/view-facade.js");
assert.equal(viewModule.domain, "combat/public-presentation-vfx-facade");
assert.equal(viewModule.status, "extracted");
assert.deepEqual(viewModule.requires, ["combat-presentation", "combat-vfx"]);
assert.deepEqual(viewModule.provides, ["DiceboundCombatView"]);
const order = manifest.loadOrder;
assert(order.indexOf("combat-presentation") < order.indexOf("combat-view-facade"));
assert(order.indexOf("combat-vfx") < order.indexOf("combat-view-facade"));
assert(order.indexOf("combat-view-facade") < order.indexOf("dicebound-monolith"));

const index = fs.readFileSync(path.join(root, "runtime", "index.html"), "utf8");
assert(index.indexOf('js/combat/vfx.js') < index.indexOf('js/combat/view-facade.js'));
assert(index.indexOf('js/combat/view-facade.js') < index.indexOf('js/dicebound.js'));

console.log("Combat View facade ownership contract: PASS — battle-background, presentation and VFX routing stay behind the public facade");
