(() => {
  "use strict";

  const CONTRACT_VERSION = 1;
  const APP_VERSION = "0.6";
  const HOST_GLOBAL = "DiceboundHost";

  const platformMethods = Object.freeze({
    copyText: "async",
    saveTextFile: "async",
    pickTextFile: "async",
    setFullscreen: "async",
    reload: "sync-or-async",
    quit: "sync-or-async",
    openExternal: "sync-or-async",
    alert: "sync",
    confirm: "sync",
    prompt: "sync",
    log: "sync-or-async",
    getWindowState: "sync",
    setWindowState: "sync-or-async",
    openSaveFolder: "sync-or-async"
  });
  const storageMethods = Object.freeze({
    getString: "sync",
    setString: "sync",
    remove: "sync",
    keys: "sync",
    flush: "optional-async"
  });

  const allowedHostKeys = new Set(["contractVersion", "metadata", "platform", "storage"]);
  const allowedMetadataKeys = new Set(["kind", "wrapperVersion", "platform", "architecture", "channel", "appVersion"]);
  const allowedPlatformKeys = new Set(Object.keys(platformMethods));
  const allowedStorageKeys = new Set(Object.keys(storageMethods));

  function unknownKeys(obj, allowed) {
    if (!obj || typeof obj !== "object") return [];
    return Object.keys(obj).filter(key => !allowed.has(key));
  }
  function methodErrors(obj, required, label) {
    const errors=[];
    for (const name of required) if (typeof obj?.[name] !== "function") errors.push(`${label}.${name} must be a function`);
    return errors;
  }

  function legacyHost() {
    const oldPlatform=window.DiceboundNativePlatform||null, oldStorage=window.DiceboundNativeStorage||null;
    if (!oldPlatform && !oldStorage) return null;
    const platform=oldPlatform ? {
      copyText:oldPlatform.copyText,
      saveTextFile:oldPlatform.saveTextFile || (oldPlatform.downloadText ? (({filename,text,mimeType})=>oldPlatform.downloadText(filename,text,mimeType)) : undefined),
      pickTextFile:oldPlatform.pickTextFile,
      setFullscreen:oldPlatform.setFullscreen,
      reload:oldPlatform.reload,
      quit:oldPlatform.quit,
      openExternal:oldPlatform.openExternal,
      alert:oldPlatform.alert,
      confirm:oldPlatform.confirm,
      prompt:oldPlatform.prompt,
      log:oldPlatform.log,
      getWindowState:oldPlatform.getWindowState,
      setWindowState:oldPlatform.setWindowState
    } : undefined;
    return {
      contractVersion:CONTRACT_VERSION,
      metadata:{kind:oldPlatform?.kind||"legacy-wrapper",wrapperVersion:"legacy-adapter",appVersion:APP_VERSION},
      platform,
      storage:oldStorage||undefined
    };
  }

  const supplied=window[HOST_GLOBAL]||legacyHost();
  const errors=[],warnings=[];
  if (supplied) {
    if (Number(supplied.contractVersion)!==CONTRACT_VERSION) errors.push(`DiceboundHost contractVersion must be ${CONTRACT_VERSION}`);
    if (!supplied.metadata || typeof supplied.metadata!=="object") errors.push("DiceboundHost.metadata is required for wrapped runtimes");
    else if (!String(supplied.metadata.kind||"").trim()) errors.push("DiceboundHost.metadata.kind is required");
    unknownKeys(supplied,allowedHostKeys).forEach(k=>warnings.push(`Unknown DiceboundHost key: ${k}`));
    unknownKeys(supplied.metadata,allowedMetadataKeys).forEach(k=>warnings.push(`Unknown DiceboundHost.metadata key: ${k}`));
    if (supplied.platform!=null) {
      if (typeof supplied.platform!=="object") errors.push("DiceboundHost.platform must be an object when supplied");
      else unknownKeys(supplied.platform,allowedPlatformKeys).forEach(k=>warnings.push(`Unsupported platform method/key: ${k}`));
    }
    if (supplied.storage!=null) {
      if (typeof supplied.storage!=="object") errors.push("DiceboundHost.storage must be an object when supplied");
      else {
        errors.push(...methodErrors(supplied.storage,["getString","setString","remove","keys"],"DiceboundHost.storage"));
        unknownKeys(supplied.storage,allowedStorageKeys).forEach(k=>warnings.push(`Unsupported storage method/key: ${k}`));
      }
    }
  }

  if (errors.length) throw new Error(`Dicebound wrapper contract rejected host: ${errors.join("; ")}`);
  const host=supplied ? Object.freeze({
    contractVersion:CONTRACT_VERSION,
    metadata:Object.freeze({...supplied.metadata,appVersion:supplied.metadata?.appVersion||APP_VERSION}),
    platform:supplied.platform||null,
    storage:supplied.storage||null
  }) : null;

  const spec=Object.freeze({
    contractVersion:CONTRACT_VERSION,
    appVersion:APP_VERSION,
    injectionGlobal:HOST_GLOBAL,
    loadRule:"A wrapper may define window.DiceboundHost before wrapper-contract.js loads. Browser builds define nothing and use browser fallbacks.",
    platformMethods,
    storageMethods,
    storageRule:"Native storage is optional. If supplied in contract v1, getString/setString/remove/keys are synchronous. A wrapper may omit native storage and let Dicebound use browser localStorage.",
    gameplayRule:"Gameplay may call DiceboundPlatform, DiceboundStorage and DiceboundSave only. It must never reference DiceboundHost or wrapper-specific APIs directly."
  });

  window.DiceboundWrapperContract=spec;
  window.DiceboundWrapper=Object.freeze({
    contractVersion:CONTRACT_VERSION,
    appVersion:APP_VERSION,
    isWrapped:!!host,
    host,
    warnings:Object.freeze([...warnings]),
    diagnostics(){return Object.freeze({contractVersion:CONTRACT_VERSION,appVersion:APP_VERSION,isWrapped:!!host,metadata:host?.metadata||null,hasPlatform:!!host?.platform,hasStorage:!!host?.storage,warnings:[...warnings]});}
  });
})();
