"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const plain = value => JSON.parse(JSON.stringify(value));

const nodes = new Array(37).fill({});
let intervals = 0;
let clearedIntervals = 0;
const context = vm.createContext({
  window: {
    DiceboundVersion: Object.freeze({ version: "0.6.4.1", channel: "Beta" }),
    DiceboundAssets: Object.freeze({ sample: "assets/example.png", nested: Object.freeze({ other: "assets/other.png" }) }),
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
assert.equal(api.clear(), 0);
assert.equal(api.samples().length, 0);

console.log("Memory diagnostics tests pass: bounded time-series, capability truthfulness, and off-by-default recording");
