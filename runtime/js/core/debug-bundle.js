(() => {
  "use strict";

  const identity=window.DiceboundVersion;
  const platform=window.DiceboundPlatform;
  const storage=window.DiceboundStorage;
  const save=window.DiceboundSave;
  const memory=window.DiceboundMemoryDiagnostics;
  if(!identity||!platform||!storage||!save||!memory)throw new Error("DiceboundDebugBundle requires Version, Platform, Storage, Save and Memory Diagnostics.");

  function freeze(value){
    if(!value||typeof value!=="object"||Object.isFrozen(value))return value;
    for(const child of Object.values(value))freeze(child);
    return Object.freeze(value);
  }
  function buildKey(){
    try{return new URLSearchParams(location.search||"").get("build")||null;}catch(_){return null;}
  }
  function report({includeSave=false}={}){
    return freeze({
      format:"dicebound-debug-report",
      schemaVersion:1,
      generatedAt:platform.nowIso?.()||new Date().toISOString(),
      privacy:freeze({
        saveIncluded:!!includeSave,
        savePayloadEmbeddedInReport:false,
        note:includeSave
          ?"Save files were explicitly requested by the player and are added by the native ZIP owner outside this metadata report."
          :"Save/progression file contents are excluded by default."
      }),
      identity:freeze({
        version:identity.version,
        channel:identity.channel,
        buildKey:buildKey()
      }),
      platform:platform.runtimeInfo(),
      wrapper:platform.wrapperDiagnostics(),
      storage:storage.diagnostics(),
      saveHealth:save.health(),
      saveDiagnostics:save.diagnostics(),
      memory:memory.diagnostics()
    });
  }
  function supported(){return !!platform.capabilities?.debugBundle;}
  async function exportBundle({includeSave=false}={}){
    if(!supported())return Object.freeze({ok:false,unsupported:true,includedSave:false});
    const payload={includeSave:!!includeSave,report:report({includeSave})};
    const result=await Promise.resolve(platform.exportDebugBundle(payload));
    if(!result||result.ok!==true)return Object.freeze({ok:false,unsupported:false,includedSave:!!includeSave});
    return freeze({...result,unsupported:false});
  }
  function diagnostics(){return freeze({apiVersion:1,supported:supported(),saveOptInDefault:false});}

  window.DiceboundDebugBundle=Object.freeze({apiVersion:1,supported,report,exportBundle,diagnostics});
})();
