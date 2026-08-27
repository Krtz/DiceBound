(() => {
  "use strict";

  // #124: a deliberately small, bounded time-series recorder. It samples only
  // when asked or when optional recording is enabled; it is not a heap profiler.
  const API_VERSION = 1;
  const DEFAULT_INTERVAL_MS = 15000;
  const DEFAULT_MAX_SAMPLES = 500;

  let contextProvider = () => ({});
  let maxSamples = DEFAULT_MAX_SAMPLES;
  let intervalMs = DEFAULT_INTERVAL_MS;
  let recording = false;
  let intervalId = null;
  let observer = null;
  let lifecycleTimer = null;
  let lastLifecycleKey = "";
  const samples = [];

  function asFiniteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  }

  function activeOverlays() {
    if (!globalThis.document?.querySelectorAll) return [];
    return [...document.querySelectorAll(".overlay:not(.hidden)")]
      .map(overlay => String(overlay.id || "overlay"))
      .sort();
  }

  function domNodeCount() {
    if (!globalThis.document?.getElementsByTagName) return null;
    return document.getElementsByTagName("*").length;
  }

  function heap() {
    const memory = globalThis.performance?.memory;
    const usedBytes = asFiniteNumber(memory?.usedJSHeapSize);
    const totalBytes = asFiniteNumber(memory?.totalJSHeapSize);
    const limitBytes = asFiniteNumber(memory?.jsHeapSizeLimit);
    return freeze({
      available: usedBytes !== null || totalBytes !== null || limitBytes !== null,
      usedBytes,
      totalBytes,
      limitBytes,
    });
  }

  function registeredAssetPathCount() {
    const root = globalThis.window?.DiceboundAssets;
    if (!root || typeof root !== "object") return null;
    const seen = new WeakSet();
    const paths = new Set();
    const visit = value => {
      if (typeof value === "string") {
        if (/^assets\//.test(value)) paths.add(value);
        return;
      }
      if (!value || typeof value !== "object" || seen.has(value)) return;
      seen.add(value);
      for (const child of Object.values(value)) visit(child);
    };
    visit(root);
    return paths.size;
  }

  function safeContext() {
    try {
      const value = contextProvider?.();
      return value && typeof value === "object" ? value : {};
    } catch (error) {
      return { contextError: String(error?.message || error) };
    }
  }

  function screenFor(context, overlays) {
    if (typeof context.screen === "string" && context.screen.trim()) return context.screen;
    if (overlays.includes("combatOverlay")) return "Combat";
    if (overlays.length) return "Modal";
    return context.runActive ? "Board" : "Camp";
  }

  function identityFor(context) {
    const identity = globalThis.window?.DiceboundVersion || {};
    return freeze({
      version: String(identity.version || context.version || "unavailable"),
      channel: String(identity.channel || context.channel || "unavailable"),
      // build-info.json is intentionally not loaded into the runtime. Do not
      // invent a build ID when the supported host has not exposed one.
      buildId: typeof context.buildId === "string" && context.buildId ? context.buildId : null,
      buildIdAvailable: typeof context.buildId === "string" && !!context.buildId,
    });
  }

  function lifecycleKey(context, overlays) {
    return JSON.stringify({
      screen: screenFor(context, overlays),
      board: context.board ?? null,
      runActive: !!context.runActive,
      enemyCount: context.enemyCount ?? null,
      overlays,
    });
  }

  function renderControls() {
    if (!globalThis.document?.getElementById) return;
    const toggle = document.getElementById("memoryDiagnosticsRecord");
    const status = document.getElementById("memoryDiagnosticsStatus");
    const count = document.getElementById("memoryDiagnosticsCount");
    const output = document.getElementById("memoryDiagnosticsLog");
    if (toggle) toggle.checked = recording;
    if (count) count.textContent = `${samples.length}/${maxSamples} samples`;
    const latest = samples.at(-1);
    if (status) {
      const heapState = latest?.heap.available ? "heap available" : "heap unavailable";
      status.textContent = `${recording ? "Recording every 15 seconds and lifecycle changes" : "Recording off"} · ${heapState}`;
    }
    if (output) {
      output.textContent = samples.slice(-8).map(formatSampleLine).join("\n");
    }
  }

  // This is deliberately the one sample representation for both the Debug
  // panel and exports. A player can therefore attach a complete log without
  // losing the concise, directly comparable text they saw in the game.
  function formatSampleLine(sample) {
    const heapUsed = sample?.heap?.usedBytes === null || sample?.heap?.usedBytes === undefined
      ? "heap unavailable"
      : `${Math.round(sample.heap.usedBytes / 1048576)} MiB heap`;
    return `${sample?.timestamp || "unavailable timestamp"} | ${sample?.reason || "manual"} | ${sample?.state?.screen || "unavailable screen"} | Board ${sample?.state?.board ?? "unavailable"} | ${heapUsed} | ${sample?.dom?.nodeCount ?? "unavailable"} DOM nodes`;
  }

  // A baseline only means something when the compared samples describe the
  // same lifecycle state. Keep this small, pure summary in the diagnostics
  // owner so browser/native stress drivers do not each invent their own
  // filtering or accidentally call unrelated samples a memory trend.
  function summarizeEquivalentState(sourceSamples, expectedState = {}) {
    const criteria = Object.entries(expectedState || {}).filter(([, value]) => value !== undefined);
    const matching = (Array.isArray(sourceSamples) ? sourceSamples : []).filter(sample => criteria.every(([key, value]) => sample?.state?.[key] === value));
    const values = matching.map(sample => freeze({
      timestamp: sample?.timestamp || null,
      reason: sample?.reason || "manual",
      domNodeCount: asFiniteNumber(sample?.dom?.nodeCount),
      heapUsedBytes: asFiniteNumber(sample?.heap?.usedBytes),
    }));
    const baselineDomNodeCount = values[0]?.domNodeCount ?? null;
    const baselineHeapUsedBytes = values[0]?.heapUsedBytes ?? null;
    return freeze({
      criteria: freeze(Object.fromEntries(criteria)),
      sampleCount: values.length,
      samples: values,
      domNodeDeltas: values.map(value => baselineDomNodeCount === null || value.domNodeCount === null ? null : value.domNodeCount - baselineDomNodeCount),
      heapUsedByteDeltas: values.map(value => baselineHeapUsedBytes === null || value.heapUsedBytes === null ? null : value.heapUsedBytes - baselineHeapUsedBytes),
    });
  }

  function exportIdentity() {
    const latest = samples.at(-1)?.identity;
    return latest || identityFor(safeContext());
  }

  function formatLog(exportedAt = new Date().toISOString()) {
    const identity = exportIdentity();
    const buildId = identity.buildIdAvailable ? identity.buildId : "unavailable (not exposed by this runtime)";
    const header = [
      "DiceBound Memory Diagnostics",
      `Generated: ${String(exportedAt)}`,
      `Version: ${identity.version}`,
      `Channel: ${identity.channel}`,
      `Build ID: ${buildId}`,
      `Samples: ${samples.length}/${maxSamples}`,
      "",
    ];
    return `${header.concat(samples.map(formatSampleLine)).join("\n")}\n`;
  }

  async function exportLog() {
    const platform = globalThis.window?.DiceboundPlatform;
    if (typeof platform?.downloadText !== "function") return false;
    const filename = `dicebound_memory_${Date.now()}.log`;
    return !!(await platform.downloadText(filename, formatLog(), "text/plain;charset=utf-8"));
  }

  function snapshot(reason = "manual") {
    const context = safeContext();
    const overlays = activeOverlays();
    const sample = freeze({
      timestamp: new Date().toISOString(),
      reason: String(reason || "manual"),
      identity: identityFor(context),
      state: freeze({
        screen: screenFor(context, overlays),
        board: asFiniteNumber(context.board),
        adventurerLevel: asFiniteNumber(context.adventurerLevel),
        difficulty: typeof context.difficulty === "string" ? context.difficulty : "unavailable",
        runActive: !!context.runActive,
        enemyCount: asFiniteNumber(context.enemyCount),
        livingEnemyCount: asFiniteNumber(context.livingEnemyCount),
        battleLogEntries: asFiniteNumber(context.battleLogEntries),
        tileCount: asFiniteNumber(context.tileCount),
        position: asFiniteNumber(context.position),
      }),
      heap: heap(),
      dom: freeze({ nodeCount: domNodeCount() }),
      overlays: freeze(overlays),
      assets: freeze({
        registeredPathCount: registeredAssetPathCount(),
        loadedCacheEntries: asFiniteNumber(context.loadedAssetCacheEntries),
        cacheAvailable: asFiniteNumber(context.loadedAssetCacheEntries) !== null,
      }),
      timers: freeze({ available: false, activeCount: null }),
      listeners: freeze({ available: false, activeCount: null }),
      nativeProcess: freeze({ available: false, privateWorkingSetBytes: null }),
      contextError: typeof context.contextError === "string" ? context.contextError : null,
    });
    samples.push(sample);
    while (samples.length > maxSamples) samples.shift();
    renderControls();
    return sample;
  }

  function recordLifecycle(reason = "lifecycle") {
    if (!recording) return null;
    return snapshot(reason);
  }

  function scheduleLifecycleSample() {
    if (!recording || lifecycleTimer !== null) return;
    lifecycleTimer = globalThis.setTimeout(() => {
      lifecycleTimer = null;
      const context = safeContext();
      const overlays = activeOverlays();
      const key = lifecycleKey(context, overlays);
      if (key === lastLifecycleKey) return;
      lastLifecycleKey = key;
      snapshot(`lifecycle:${screenFor(context, overlays).toLowerCase()}`);
    }, 0);
  }

  function stopRecording() {
    if (intervalId !== null) globalThis.clearInterval(intervalId);
    if (lifecycleTimer !== null) globalThis.clearTimeout(lifecycleTimer);
    intervalId = null;
    lifecycleTimer = null;
    observer?.disconnect?.();
    observer = null;
    recording = false;
    renderControls();
    return false;
  }

  function setRecording(enabled) {
    if (!enabled) return stopRecording();
    if (recording) return true;
    recording = true;
    const context = safeContext();
    const overlays = activeOverlays();
    lastLifecycleKey = lifecycleKey(context, overlays);
    snapshot("recording-enabled");
    intervalId = globalThis.setInterval(() => snapshot("periodic"), intervalMs);
    if (typeof globalThis.MutationObserver === "function" && globalThis.document?.body) {
      observer = new MutationObserver(scheduleLifecycleSample);
      observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    }
    renderControls();
    return true;
  }

  function clear() {
    samples.length = 0;
    renderControls();
    return 0;
  }

  function attachDebugControls(root = globalThis.document) {
    if (!root?.getElementById) return false;
    const panel = root.getElementById("memoryDiagnosticsPanel");
    if (!panel || panel.dataset.memoryDiagnosticsBound === "true") return !!panel;
    const snapshotButton = root.getElementById("memoryDiagnosticsSnapshot");
    const recordToggle = root.getElementById("memoryDiagnosticsRecord");
    const clearButton = root.getElementById("memoryDiagnosticsClear");
    const exportButton = root.getElementById("memoryDiagnosticsExport");
    snapshotButton?.addEventListener("click", () => snapshot("manual"));
    recordToggle?.addEventListener("change", event => setRecording(!!event.currentTarget?.checked));
    clearButton?.addEventListener("click", clear);
    exportButton?.addEventListener("click", () => { void exportLog(); });
    panel.dataset.memoryDiagnosticsBound = "true";
    renderControls();
    return true;
  }

  function configure({ getContext, maxSampleCount = DEFAULT_MAX_SAMPLES, sampleIntervalMs = DEFAULT_INTERVAL_MS } = {}) {
    if (typeof getContext === "function") contextProvider = getContext;
    const requestedMax = Math.floor(Number(maxSampleCount));
    const requestedInterval = Math.floor(Number(sampleIntervalMs));
    if (Number.isFinite(requestedMax)) maxSamples = Math.max(10, Math.min(2000, requestedMax));
    if (Number.isFinite(requestedInterval)) intervalMs = Math.max(5000, Math.min(60000, requestedInterval));
    attachDebugControls();
    return diagnostics();
  }

  function diagnostics() {
    return freeze({
      apiVersion: API_VERSION,
      recording,
      sampleCount: samples.length,
      maxSamples,
      intervalMs,
      heapSupported: !!globalThis.performance?.memory,
      nativeProcessMetricsSupported: false,
      activeTimerMetricsSupported: false,
      activeListenerMetricsSupported: false,
    });
  }

  window.DiceboundMemoryDiagnostics = Object.freeze({
    apiVersion: API_VERSION,
    configure,
    snapshot,
    recordLifecycle,
    setRecording,
    clear,
    samples: () => Object.freeze([...samples]),
    formatSampleLine,
    summarizeEquivalentState,
    formatLog,
    exportLog,
    diagnostics,
    attachDebugControls,
  });
})();
