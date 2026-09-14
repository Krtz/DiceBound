from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]


def read(path):
    return (root / path).read_text(encoding="utf-8")


def write(path, text):
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise AssertionError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


facade_source = r'''(() => {
  "use strict";

  const identity = window.DiceboundVersion;
  const platform = window.DiceboundPlatform;
  const storage = window.DiceboundStorage;
  const save = window.DiceboundSave;
  const runCheckpoint = window.DiceboundRunCheckpoint;
  const coreState = window.DiceboundCoreState;
  const runtimeServices = window.DiceboundRuntimeServices;
  const memoryDiagnostics = window.DiceboundMemoryDiagnostics;

  const requireOwner = (value, label) => {
    if (!value) throw new Error(`DiceboundRuntime requires ${label} before loading.`);
    return value;
  };
  requireOwner(identity, "DiceboundVersion");
  requireOwner(platform, "DiceboundPlatform");
  requireOwner(storage, "DiceboundStorage");
  requireOwner(save, "DiceboundSave");
  requireOwner(runCheckpoint, "DiceboundRunCheckpoint");
  requireOwner(coreState, "DiceboundCoreState");
  requireOwner(runtimeServices, "DiceboundRuntimeServices");
  requireOwner(memoryDiagnostics, "DiceboundMemoryDiagnostics");

  function createMetaService(options = {}) {
    if (!options || typeof options !== "object") throw new TypeError("DiceboundRuntime meta-service options must be an object");
    return coreState.createMetaService({ ...options, saveService: save });
  }

  function createEventBus() {
    return coreState.createEventBus();
  }

  function createPowerupServices(ports) {
    return runtimeServices.createPowerupServices(ports);
  }

  function diagnostics() {
    return Object.freeze({
      apiVersion: 1,
      identity: Object.freeze({ version: identity.version, channel: identity.channel }),
      platform: platform.runtimeInfo(),
      storage: storage.diagnostics(),
      save: save.diagnostics(),
      runCheckpoint: runCheckpoint.diagnostics(),
      wrapper: platform.wrapperDiagnostics(),
      memory: memoryDiagnostics.diagnostics(),
    });
  }

  window.DiceboundRuntime = Object.freeze({
    apiVersion: 1,
    identity,
    platform,
    storage,
    save,
    runCheckpoint,
    memoryDiagnostics,
    createMetaService,
    createEventBus,
    createPowerupServices,
    diagnostics,
  });
})();
'''
write("runtime/js/core/facade.js", facade_source)

mono_path = "runtime/js/dicebound.js"
mono = read(mono_path)
mono = replace_once(
    mono,
    '  const APP_IDENTITY=window.DiceboundVersion;\n  if(!APP_IDENTITY)throw new Error("dicebound.js requires DiceboundVersion before loading.");',
    '  const dbRuntime=window.DiceboundRuntime;\n  if(!dbRuntime)throw new Error("dicebound.js requires DiceboundRuntime before loading.");\n  const APP_IDENTITY=dbRuntime.identity;',
    "Runtime facade bootstrap",
)
mono = replace_once(
    mono,
    '  const DB_POWERUP_SERVICES=window.DiceboundRuntimeServices?.createPowerupServices({',
    '  const DB_POWERUP_SERVICES=dbRuntime.createPowerupServices({',
    "Powerup runtime service composition",
)
mono = replace_once(
    mono,
    '  const DB_CORE_META=window.DiceboundCoreState?.createMetaService?.({classIds:Object.keys(CLASSES),petIds:Object.keys(PETS),elementIds:ELEMENT_KEYS,petUnlockRequirement:PET_UNLOCK_REQUIREMENT,saveService:window.DiceboundSave});\n  if(!DB_CORE_META)throw new Error("DiceboundCoreState must load before dicebound.js");',
    '  const DB_CORE_META=dbRuntime.createMetaService({classIds:Object.keys(CLASSES),petIds:Object.keys(PETS),elementIds:ELEMENT_KEYS,petUnlockRequirement:PET_UNLOCK_REQUIREMENT});\n  if(!DB_CORE_META)throw new Error("DiceboundRuntime must provide career-state composition before dicebound.js");',
    "Career meta-service composition",
)
mono = replace_once(
    mono,
    '  const DiceboundStateEvents=window.DiceboundCoreState.createEventBus();',
    '  const DiceboundStateEvents=dbRuntime.createEventBus();',
    "State event-bus composition",
)
mono = replace_once(
    mono,
    "  const DB_RUN_CHECKPOINT=window.DiceboundRunCheckpoint;\n  if(!DB_RUN_CHECKPOINT)throw new Error('DiceboundRunCheckpoint must load before dicebound.js');",
    "  const DB_RUN_CHECKPOINT=dbRuntime.runCheckpoint;\n  if(!DB_RUN_CHECKPOINT)throw new Error('DiceboundRuntime must provide active-run checkpoint infrastructure');",
    "Run checkpoint composition",
)
mono = replace_once(
    mono,
    "  const db064MemoryDiagnostics=window.DiceboundMemoryDiagnostics;\n  if(!db064MemoryDiagnostics)throw new Error('DiceBound requires the memory diagnostics core module.');",
    "  const db064MemoryDiagnostics=dbRuntime.memoryDiagnostics;\n  if(!db064MemoryDiagnostics)throw new Error('DiceBound requires Runtime memory diagnostics.');",
    "Memory diagnostics composition",
)
for old, new in [
    ("window.DiceboundSave", "dbRuntime.save"),
    ("window.DiceboundPlatform", "dbRuntime.platform"),
    ("window.DiceboundStorage", "dbRuntime.storage"),
]:
    mono = mono.replace(old, new)

for forbidden in [
    "window.DiceboundVersion",
    "window.DiceboundPlatform",
    "window.DiceboundStorage",
    "window.DiceboundSave",
    "window.DiceboundRunCheckpoint",
    "window.DiceboundCoreState",
    "window.DiceboundRuntimeServices",
    "window.DiceboundMemoryDiagnostics",
]:
    if forbidden in mono:
        raise AssertionError(f"monolith still coordinates peer Runtime owner {forbidden}")
if mono.count("window.DiceboundRuntime") != 1:
    raise AssertionError("monolith must acquire DiceboundRuntime exactly once")
write(mono_path, mono)

project_path = root / "wrapper-source/config/project.json"
project = json.loads(project_path.read_text(encoding="utf-8"))
scripts = project["runtimeScripts"]
facade_script = "js/core/facade.js"
if facade_script not in scripts:
    index = scripts.index("js/core/memory-diagnostics.js") + 1
    scripts.insert(index, facade_script)
project_path.write_text(json.dumps(project, indent=2) + "\n", encoding="utf-8")

manifest_path = root / "runtime/js/module-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
load_order = manifest["loadOrder"]
facade_id = "runtime-facade"
if facade_id not in load_order:
    load_order.insert(load_order.index("memory-diagnostics") + 1, facade_id)
modules = manifest["modules"]
by_id = {module["id"]: module for module in modules}
if facade_id not in by_id:
    memory_index = next(i for i, module in enumerate(modules) if module["id"] == "memory-diagnostics")
    modules.insert(memory_index + 1, {
        "id": facade_id,
        "path": facade_script,
        "domain": "runtime/public-core-persistence-composition-facade",
        "status": "extracted",
        "requires": [
            "version",
            "platform",
            "storage",
            "save-system",
            "run-checkpoint",
            "core-state",
            "runtime-services",
            "memory-diagnostics",
        ],
        "provides": ["DiceboundRuntime"],
    })
by_id = {module["id"]: module for module in modules}
monolith = by_id["dicebound-monolith"]
peer_runtime_dependencies = {
    "version",
    "wrapper-contract",
    "platform",
    "storage",
    "save-system",
    "run-checkpoint",
    "core-state",
    "runtime-services",
    "memory-diagnostics",
}
requires = [item for item in monolith.get("requires", []) if item not in peer_runtime_dependencies and item != facade_id]
insert_at = requires.index("rng") + 1 if "rng" in requires else 0
requires.insert(insert_at, facade_id)
monolith["requires"] = requires
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

index_path = root / "runtime/index.html"
index_html = index_path.read_text(encoding="utf-8")
needle = '<script src="js/core/memory-diagnostics.js"></script>\n'
addition = needle + '<script src="js/core/facade.js"></script>\n'
if '<script src="js/core/facade.js"></script>' not in index_html:
    if index_html.count(needle) != 1:
        raise AssertionError("runtime/index.html memory-diagnostics script anchor drifted")
    index_html = index_html.replace(needle, addition, 1)
index_path.write_text(index_html, encoding="utf-8")

test_source = r'''"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const runtime = path.join(root, "runtime", "js");
const source = relative => fs.readFileSync(path.join(runtime, relative), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));

let metaOptions = null;
let eventBusCalls = 0;
let powerupPorts = null;
const metaService = Object.freeze({ kind: "meta-service" });
const eventBus = Object.freeze({ kind: "event-bus" });
const powerupServices = Object.freeze({ kind: "powerup-services" });
const identity = Object.freeze({ apiVersion: 1, version: "0.6.6.34", channel: "Beta" });
const platform = Object.freeze({
  apiVersion: 3,
  kind: "browser",
  isWrapped: false,
  capabilities: Object.freeze({ openSaveFolder: false }),
  runtimeInfo: () => Object.freeze({ kind: "browser", isWrapped: false }),
  wrapperDiagnostics: () => Object.freeze({ contractVersion: 1, isWrapped: false }),
});
const storage = Object.freeze({ diagnostics: () => Object.freeze({ backend: "memory" }) });
const save = Object.freeze({ diagnostics: () => Object.freeze({ schemaVersion: 2 }) });
const runCheckpoint = Object.freeze({ diagnostics: () => Object.freeze({ valid: false }) });
const coreState = Object.freeze({
  createMetaService(options) { metaOptions = options; return metaService; },
  createEventBus() { eventBusCalls += 1; return eventBus; },
});
const runtimeServices = Object.freeze({
  createPowerupServices(ports) { powerupPorts = ports; return powerupServices; },
});
const memoryDiagnostics = Object.freeze({ diagnostics: () => Object.freeze({ recording: false }) });
const window = { DiceboundVersion: identity, DiceboundPlatform: platform, DiceboundStorage: storage, DiceboundSave: save, DiceboundRunCheckpoint: runCheckpoint, DiceboundCoreState: coreState, DiceboundRuntimeServices: runtimeServices, DiceboundMemoryDiagnostics: memoryDiagnostics };
window.window = window;
const context = vm.createContext({ window, console, Object, TypeError });
vm.runInContext(source(path.join("core", "facade.js")), context, { filename: "core/facade.js" });

const api = window.DiceboundRuntime;
assert.ok(api, "Runtime facade did not publish window.DiceboundRuntime");
assert.equal(api.apiVersion, 1);
assert.ok(Object.isFrozen(api));
assert.equal(api.identity, identity);
assert.equal(api.platform, platform);
assert.equal(api.storage, storage);
assert.equal(api.save, save);
assert.equal(api.runCheckpoint, runCheckpoint);
assert.equal(api.memoryDiagnostics, memoryDiagnostics);

assert.equal(api.createMetaService({ classIds: ["ranger"], petIds: ["neutral"], elementIds: ["fire"], saveService: "shadow" }), metaService);
assert.deepEqual(plain({ classIds: metaOptions.classIds, petIds: metaOptions.petIds, elementIds: metaOptions.elementIds }), { classIds: ["ranger"], petIds: ["neutral"], elementIds: ["fire"] });
assert.equal(metaOptions.saveService, save, "Runtime facade must inject the authoritative Save owner");
assert.throws(() => api.createMetaService(null), /options must be an object/);
assert.equal(api.createEventBus(), eventBus);
assert.equal(eventBusCalls, 1);
const ports = { run: { getPlayer() { return {}; } } };
assert.equal(api.createPowerupServices(ports), powerupServices);
assert.equal(powerupPorts, ports);
assert.deepEqual(plain(api.diagnostics()), {
  apiVersion: 1,
  identity: { version: "0.6.6.34", channel: "Beta" },
  platform: { kind: "browser", isWrapped: false },
  storage: { backend: "memory" },
  save: { schemaVersion: 2 },
  runCheckpoint: { valid: false },
  wrapper: { contractVersion: 1, isWrapped: false },
  memory: { recording: false },
});
assert.ok(Object.isFrozen(api.diagnostics()));

const monolith = source("dicebound.js");
assert.match(monolith, /const dbRuntime=window\.DiceboundRuntime;/);
assert.match(monolith, /const APP_IDENTITY=dbRuntime\.identity;/);
assert.match(monolith, /const DB_CORE_META=dbRuntime\.createMetaService\(/);
assert.match(monolith, /const DiceboundStateEvents=dbRuntime\.createEventBus\(\);/);
assert.match(monolith, /const DB_POWERUP_SERVICES=dbRuntime\.createPowerupServices\(/);
assert.match(monolith, /const DB_RUN_CHECKPOINT=dbRuntime\.runCheckpoint;/);
assert.match(monolith, /const db064MemoryDiagnostics=dbRuntime\.memoryDiagnostics;/);
assert.doesNotMatch(monolith, /window\.Dicebound(?:Version|Platform|Storage|Save|RunCheckpoint|CoreState|RuntimeServices|MemoryDiagnostics)\b/, "monolith still coordinates a peer Runtime/Core/Persistence global");
assert.equal((monolith.match(/window\.DiceboundRuntime\b/g) || []).length, 1, "monolith must acquire one Runtime facade");
assert.doesNotMatch(source(path.join("core", "facade.js")), /DiceboundRng/, "Runtime facade must not hide deterministic gameplay RNG");

const manifest = JSON.parse(fs.readFileSync(path.join(runtime, "module-manifest.json"), "utf8"));
const modules = Object.fromEntries(manifest.modules.map(module => [module.id, module]));
assert.deepEqual(modules["runtime-facade"].requires, ["version", "platform", "storage", "save-system", "run-checkpoint", "core-state", "runtime-services", "memory-diagnostics"]);
assert.deepEqual(modules["runtime-facade"].provides, ["DiceboundRuntime"]);
const monolithRequires = modules["dicebound-monolith"].requires;
assert.ok(monolithRequires.includes("runtime-facade"));
for (const peer of ["version", "wrapper-contract", "platform", "storage", "save-system", "run-checkpoint", "core-state", "runtime-services", "memory-diagnostics"]) {
  assert.ok(!monolithRequires.includes(peer), `compatibility monolith still declares peer Runtime dependency ${peer}`);
}
assert.ok(manifest.loadOrder.indexOf("memory-diagnostics") < manifest.loadOrder.indexOf("runtime-facade"));
assert.ok(manifest.loadOrder.indexOf("runtime-facade") < manifest.loadOrder.indexOf("dicebound-monolith"));

const project = JSON.parse(fs.readFileSync(path.join(root, "wrapper-source", "config", "project.json"), "utf8"));
const manifestScripts = manifest.loadOrder.map(id => modules[id].path);
assert.deepEqual(project.runtimeScripts, manifestScripts, "project runtimeScripts must exactly follow the authoritative module manifest");
const buildInfo = JSON.parse(fs.readFileSync(path.join(root, "runtime", "build-info.json"), "utf8"));
assert.deepEqual(buildInfo.runtimeScripts, project.runtimeScripts, "build-info runtimeScripts drifted from project/manifest composition");
const html = fs.readFileSync(path.join(root, "runtime", "index.html"), "utf8");
assert.match(html, /js\/core\/memory-diagnostics\.js[\s\S]*js\/core\/facade\.js[\s\S]*js\/combat\/effective-stats\.js/);

console.log("Runtime facade owner PASS: career/save composition, event bus, service ports, diagnostics, load graph and monolith peer-global drain are authoritative");
'''
write("tools/test_runtime_facade.js", test_source)

print("Runtime facade materialization applied")
