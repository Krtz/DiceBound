const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "runtime/js/combat/allied-entities.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context, { filename: "allied-entities.js" });
const allies = context.window.DiceboundCombatAllies;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let roster = allies.createRoster({ capacity: 2 });
let out = allies.spawn(roster, {
  archetypeId: "skeleton-warrior",
  name: "Skeleton",
  maxHp: 20,
  hp: 20,
  attack: 5,
  defense: 2,
  threatWeight: 1,
  actsOnSummonTurn: true
}, { turn: 4 });
roster = out.roster;
assert(out.entity.instanceId === "ally-1", "first summon should get ally-1");
assert(allies.canActThisPhase(out.entity, 4) === true, "actsOnSummonTurn summon should act immediately");

out = allies.spawn(roster, {
  archetypeId: "slow-summon",
  maxHp: 10,
  hp: 10,
  actsOnSummonTurn: false,
  threatWeight: 2
}, { turn: 4 });
roster = out.roster;
assert(allies.canActThisPhase(out.entity, 4) === false, "delayed summon must wait on creation turn");
assert(allies.canActThisPhase(out.entity, 5) === true, "delayed summon should act on later turn");

out = allies.spawn(roster, {
  archetypeId: "replacement",
  maxHp: 12,
  hp: 12
}, { turn: 5 });
roster = out.roster;
assert(out.reason === "replaced-oldest", "full roster should FIFO-replace");
assert(out.replaced.instanceId === "ally-1", "FIFO must replace oldest living summon");
assert(roster.allies.length === 2, "roster must stay at capacity");

const threat = allies.weightedThreat(roster.allies);
assert(threat.length === 2, "both living targetable summons should contribute threat");
assert(threat[0].weight === 2, "explicit threat weight should survive normalization");

const persistent = allies.spawn(allies.createRoster({ capacity: 2 }), {
  archetypeId: "persistent-test",
  persistence: "run",
  maxHp: 30,
  hp: 17,
  resources: { mana: 6 },
  attack: 7,
  defense: 4,
  statuses: { burn: 3, attackLost: 2, defenseLost: 1 }
}, { turn: 1 }).roster;
const saved = allies.serializeRunPersistent(persistent);
assert(saved.length === 1 && saved[0].hp === 17, "run-persistent HP must serialize");
assert(saved[0].resources.mana === 6, "run-persistent resources must serialize");
assert(Object.keys(saved[0].statuses).length === 0, "encounter statuses must be discarded on persistence");
assert(saved[0].attack === 9 && saved[0].defense === 5, "encounter-only stat reductions must be restored before persistence");
const restored = allies.rehydrateRunPersistent(saved, { capacity: 2 });
assert(restored.allies[0].hp === 17 && restored.allies[0].resources.mana === 6, "run-persistent HP/resources must rehydrate");
assert(restored.allies[0].attack === 9 && restored.allies[0].defense === 5, "rehydrated run ally must not carry encounter-only stat debuffs");

assert(allies.reviveTargetMatches("hero", "hero"), "hero revive should target hero");
assert(!allies.reviveTargetMatches("hero", "summon"), "hero revive must not target summons");
assert(allies.reviveTargetMatches("summon", "summon"), "summon revive should target summon");
assert(allies.reviveTargetMatches("both", "hero") && allies.reviveTargetMatches("both", "summon"), "both revive should target both");

console.log("Allied entity foundation: PASS");
