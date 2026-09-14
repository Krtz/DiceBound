(() => {
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
