"use strict";

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
