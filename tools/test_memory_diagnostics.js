"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const plain = value => JSON.parse(JSON.stringify(value));

const nodes = new Array(37).fill({});
let intervals = 0;
let clearedIntervals = 0;
const downloads = [];
const context = vm.createContext({
  window: {
    DiceboundVersion: Object.freeze({ version: "0.6.4.1", channel: "Beta" }),
    DiceboundAssets: Object.freeze({ sample: "assets/example.png", nested: Object.freeze({ other: "assets/other.png" }) }),
    DiceboundPlatform: Object.freeze({
      downloadText: async (filename, text, mimeType) => {
        downloads.push({ filename, text, mimeType });
        return true;
      },
    }),
  },
  performance: { memory: { usedJSHeapSize: 12 * 1048576, totalJSHeapSize: 20 * 1048576, jsHeapSizeLimit: 1024 * 1048576 } },
  document: {
    body: null,
    querySelectorAll: () => [],
    getElementsByTagName: () => nodes,
    getElementById: () => null,
  },
  setInterval: () => ++intervals,
  clearInterval: () => { clearedIntervals += 1; },
  setTimeout: () => 1,
  clearTimeout: () => {},
});

const source = fs.readFileSync(path.join(__dirname, "..", "runtime", "js", "core", "memory-diagnostics.js"), "utf8");
vm.runInContext(source, context, { filename: "memory-diagnostics.js" });
const api = context.window.DiceboundMemoryDiagnostics;

assert.ok(api, "memory diagnostics did not publish its API");
assert.equal(api.apiVersion, 1);
assert.ok(Object.isFrozen(api));
api.configure({ maxSampleCount: 10, sampleIntervalMs: 5000, getContext: () => ({ screen: "Camp", board: 1, adventurerLevel: 4, difficulty: "Normal", runActive: false, enemyCount: 0, livingEnemyCount: 0, battleLogEntries: 0, tileCount: 100, position: 0 }) });

const first = api.snapshot("manual");
assert.equal(first.reason, "manual");
assert.deepEqual(plain(first.identity), { version: "0.6.4.1", channel: "Beta", buildId: null, buildIdAvailable: false });
assert.deepEqual(plain(first.state), { screen: "Camp", board: 1, adventurerLevel: 4, difficulty: "Normal", runActive: false, enemyCount: 0, livingEnemyCount: 0, battleLogEntries: 0, tileCount: 100, position: 0 });
assert.deepEqual(plain(first.heap), { available: true, usedBytes: 12 * 1048576, totalBytes: 20 * 1048576, limitBytes: 1024 * 1048576 });
assert.equal(first.dom.nodeCount, 37);
assert.deepEqual(plain(first.assets), { registeredPathCount: 2, loadedCacheEntries: null, cacheAvailable: false });
assert.deepEqual(plain(first.timers), { available: false, activeCount: null }, "untracked timers must be unavailable, not fabricated as zero");
assert.deepEqual(plain(first.listeners), { available: false, activeCount: null }, "untracked listeners must be unavailable, not fabricated as zero");
assert.deepEqual(plain(first.nativeProcess), { available: false, privateWorkingSetBytes: null }, "native process memory must be unavailable without a real host API");

assert.equal(api.setRecording(true), true);
assert.equal(api.diagnostics().recording, true);
assert.equal(intervals, 1, "recording should create exactly one bounded periodic sampler");
assert.equal(api.setRecording(false), false);
assert.equal(api.diagnostics().recording, false);
assert.equal(clearedIntervals, 1, "stopping recording should clear its periodic sampler");

for (let index = 0; index < 14; index += 1) api.snapshot(`sample-${index}`);
assert.equal(api.samples().length, 10, "memory diagnostics log must remain bounded");
assert.equal(api.samples()[0].reason, "sample-4");
const beforeExport = plain(api.samples());
const log = api.formatLog("2026-08-27T00:00:00.000Z");
assert.match(log, /^DiceBound Memory Diagnostics\nGenerated: 2026-08-27T00:00:00.000Z\nVersion: 0.6.4.1\nChannel: Beta\nBuild ID: unavailable \(not exposed by this runtime\)\nSamples: 10\/10\n/);
assert.match(log, /sample-4 \| Camp \| Board 1 \| 12 MiB heap \| 37 DOM nodes/);

const equivalent = api.summarizeEquivalentState([
  { timestamp: "baseline", reason: "camp:baseline", state: { screen: "Camp", runActive: false }, dom: { nodeCount: 100 }, heap: { usedBytes: 1000 } },
  { timestamp: "ignored", reason: "board", state: { screen: "Board", runActive: true }, dom: { nodeCount: 140 }, heap: { usedBytes: 1500 } },
  { timestamp: "cycle", reason: "camp:cycle-1", state: { screen: "Camp", runActive: false }, dom: { nodeCount: 103 }, heap: { usedBytes: 1100 } },
], { screen: "Camp", runActive: false });
assert.deepEqual(plain(equivalent.criteria), { screen: "Camp", runActive: false });
assert.equal(equivalent.sampleCount, 2);
assert.deepEqual(plain(equivalent.samples), [
  { timestamp: "baseline", reason: "camp:baseline", domNodeCount: 100, heapUsedBytes: 1000 },
  { timestamp: "cycle", reason: "camp:cycle-1", domNodeCount: 103, heapUsedBytes: 1100 },
]);
assert.deepEqual(plain(equivalent.domNodeDeltas), [0, 3]);
assert.deepEqual(plain(equivalent.heapUsedByteDeltas), [0, 100]);
assert.ok(Object.isFrozen(equivalent), "equivalent-state summaries must not be mutable diagnostic state");

void (async () => {
  assert.equal(await api.exportLog(), true, "memory log export did not use the authoritative platform text-save contract");
  assert.equal(downloads.length, 1);
  assert.match(downloads[0].filename, /^dicebound_memory_\d+\.log$/);
  assert.equal(downloads[0].mimeType, "text/plain;charset=utf-8");
  const generated = /^Generated: (.+)$/m.exec(downloads[0].text)?.[1];
  assert.ok(generated, "export must include its generated timestamp");
  assert.equal(downloads[0].text, api.formatLog(generated), "export must contain the same complete authoritative log text");
  assert.deepEqual(plain(api.samples()), beforeExport, "export must not mutate bounded in-memory samples");
  assert.equal(api.clear(), 0);
  assert.equal(api.samples().length, 0);
  console.log("Memory diagnostics tests pass: bounded time-series, capability truthfulness, off-by-default recording, and non-mutating export");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
