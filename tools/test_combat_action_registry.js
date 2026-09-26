const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "runtime/js/combat/action-registry.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context, { filename: "action-registry.js" });
const api = context.window.DiceboundCombatActions;
const registry = api.createRegistry();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

registry.register({
  id: "universal",
  priority: 10,
  getActions: () => [
    { id: "attack", label: "Attack", order: 10, targetPolicy: "selectedEnemy", execute: () => "attack" },
    { id: "guard", label: "Guard", order: 90, targetPolicy: "hero", execute: () => "guard" }
  ]
});

registry.register({
  id: "necromancer",
  priority: 20,
  getActions: state => [
    { id: "grave-coil", label: "Grave Coil", order: 20, targetPolicy: "selectedEnemy", cost: () => ({ resource: "mana", amount: 0 }), execute: () => "coil" },
    { id: "summon-skeleton", label: "Summon Skeleton", order: 30, targetPolicy: "none", enabled: () => state.mana >= 40, cost: () => ({ resource: "mana", amount: 40 }), execute: () => "skeleton" }
  ]
});

registry.register({
  id: "epic-powerup",
  priority: 30,
  getActions: state => state.hasMage ? [
    { id: "summon-mage-skeleton", label: "Summon Mage Skeleton", order: 31, targetPolicy: "none", execute: () => "mage" }
  ] : []
});

let view = registry.view({ mana: 30, hasMage: false });
assert(view.map(action => action.id).join(",") === "attack,grave-coil,summon-skeleton,guard", "base action order should be deterministic");
assert(view.find(action => action.id === "summon-skeleton").enabled === false, "live enabled state should reflect context");

view = registry.view({ mana: 80, hasMage: true });
assert(view.some(action => action.id === "summon-mage-skeleton"), "Powerup provider should add a real action");
assert(view.find(action => action.id === "summon-skeleton").cost.amount === 40, "live cost should render from descriptor");

registry.register({
  id: "legendary-override",
  priority: 40,
  getActions: () => [
    { id: "summon-skeleton", label: "Blood Summon", order: 30, targetPolicy: "none", cost: () => ({ resource: "hp", amount: 12 }), execute: () => "blood" }
  ]
});
view = registry.view({ mana: 0, hasMage: false });
const summon = view.find(action => action.id === "summon-skeleton");
assert(summon.providerId === "legendary-override", "higher-priority stable ID should intentionally override action");
assert(summon.cost.resource === "hp", "resource-cost override must not require a second button/resolver identity");

registry.register({
  id: "hidden",
  priority: 50,
  getActions: () => [{ id: "secret", visible: () => false, execute: () => "nope" }]
});
assert(!registry.view({}).some(action => action.id === "secret"), "hidden actions must not render");

const compositionSource=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
const fixedStart=compositionSource.indexOf("function performFixedCombatSlot(");
const fixedEnd=compositionSource.indexOf("replaceCombatButton(\"attackBtn\"",fixedStart);
const fixedAdapter=compositionSource.slice(fixedStart,fixedEnd);
assert(fixedStart>=0&&fixedEnd>fixedStart,"fixed combat-slot composition adapter must remain explicit");
assert(fixedAdapter.includes("dbActionForFixedSlot(slot)"),"fixed combat slots must consult the composable action registry");
assert(!/necromancer/i.test(fixedAdapter),"fixed combat-slot routing must stay class-agnostic rather than reopening a Necromancer branch");

(async () => {
  const result = await registry.execute("grave-coil", { mana: 80 });
  assert(result.ok && result.result === "coil", "registry should execute authoritative resolver");
  console.log("Combat action registry: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
