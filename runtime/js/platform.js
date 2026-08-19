(() => {
  "use strict";

  const identity=window.DiceboundVersion;
  if(!identity)throw new Error("DiceboundPlatform requires DiceboundVersion before loading.");
  const wrapper=window.DiceboundWrapper||null;
  const native=wrapper?.host?.platform||null;
  const metadata=wrapper?.host?.metadata||null;
  function requireSync(value,name){if(value&&typeof value.then==="function")throw new Error(`DiceboundHost.platform.${name} must be synchronous in contract v1`);return value;}

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = String(text ?? "");
    ta.setAttribute("readonly", "");
    Object.assign(ta.style,{position:"fixed",left:"-9999px",top:"0",opacity:"0"});
    document.body.appendChild(ta);
    ta.select();
    const ok = !!document.execCommand?.("copy");
    ta.remove();
    return ok;
  }

  async function copyText(text) {
    if (native?.copyText) return !!(await native.copyText(String(text ?? "")));
    const value = String(text ?? "");
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(value); return true; } catch (_) {}
    }
    return fallbackCopy(value);
  }

  async function downloadText(filename, text, type = "text/plain;charset=utf-8") {
    if (native?.saveTextFile) return !!(await native.saveTextFile({filename:String(filename),text:String(text ?? ""),mimeType:String(type)}));
    const blob = new Blob([String(text ?? "")], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
    return true;
  }

  function downloadJson(filename, value) {
    return downloadText(filename, JSON.stringify(value, null, 2), "application/json;charset=utf-8");
  }

  function pickTextFile({ accept = ".txt,.json,.save", encoding = "utf-8" } = {}) {
    if (native?.pickTextFile) return Promise.resolve(native.pickTextFile({accept,encoding}));
    return new Promise((resolve,reject)=>{
      const input=document.createElement("input");
      input.type="file"; input.accept=accept; input.style.display="none";
      input.addEventListener("change",()=>{
        const file=input.files?.[0];
        if(!file){input.remove();resolve(null);return;}
        const reader=new FileReader();
        reader.onload=()=>{input.remove();resolve({name:file.name,text:String(reader.result??"")});};
        reader.onerror=()=>{input.remove();reject(reader.error||new Error("Unable to read file"));};
        reader.readAsText(file,encoding);
      },{once:true});
      document.body.appendChild(input); input.click();
    });
  }

  async function setFullscreen(enabled) {
    if (native?.setFullscreen) return !!(await native.setFullscreen(!!enabled));
    if (enabled) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } else if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    return !!document.fullscreenElement;
  }

  async function toggleFullscreen() { return setFullscreen(!document.fullscreenElement); }
  function reload() { if(native?.reload)return native.reload(); location.reload(); return true; }
  function quit() { if(native?.quit)return native.quit(); return false; }
  function openExternal(url) { if(native?.openExternal)return native.openExternal(String(url)); return window.open(String(url),"_blank","noopener,noreferrer"); }
  function alertUser(message) { if(native?.alert)return requireSync(native.alert(String(message)),"alert"); return window.alert(String(message)); }
  function confirmUser(message) { if(native?.confirm)return !!requireSync(native.confirm(String(message)),"confirm"); return window.confirm(String(message)); }
  function promptUser(message, initial = "") { if(native?.prompt)return requireSync(native.prompt(String(message),String(initial)),"prompt"); return window.prompt(String(message),String(initial)); }
  function log(level="info",message="",context=null){
    const lvl=String(level||"info").toLowerCase(),msg=String(message??"");
    if(native?.log)return native.log({level:lvl,message:msg,context:context??null});
    const fn=console[lvl]||console.log;fn.call(console,`[Dicebound:${lvl}] ${msg}`,context??"");return true;
  }
  function getWindowState(){
    if(native?.getWindowState)return requireSync(native.getWindowState(),"getWindowState");
    return Object.freeze({fullscreen:!!document.fullscreenElement,visibility:document.visibilityState||"visible",width:window.innerWidth||0,height:window.innerHeight||0,devicePixelRatio:window.devicePixelRatio||1});
  }
  function setWindowState(state={}){if(native?.setWindowState)return native.setWindowState({...state});if(Object.prototype.hasOwnProperty.call(state,"fullscreen"))return setFullscreen(!!state.fullscreen);return false;}
  function openSaveFolder(){if(native?.openSaveFolder)return native.openSaveFolder();return false;}
  function openAppDataFolder(){if(native?.openAppDataFolder)return native.openAppDataFolder();return false;}
  function repairRuntime(){if(native?.repairRuntime)return native.repairRuntime();return false;}
  function appInfo(){return Object.freeze({appVersion:wrapper?.appVersion||identity.version,contractVersion:wrapper?.contractVersion||1,kind:metadata?.kind||"browser",wrapperVersion:metadata?.wrapperVersion||null,platform:metadata?.platform||null,architecture:metadata?.architecture||null,channel:metadata?.channel||identity.channel,isWrapped:!!wrapper?.isWrapped});}

  function runtimeInfo() {
    const info=appInfo();
    return Object.freeze({
      apiVersion: 3,
      contractVersion:info.contractVersion,
      appVersion:info.appVersion,
      kind: info.kind,
      wrapperVersion:info.wrapperVersion,
      platform:info.platform,
      architecture:info.architecture,
      isWrapped: info.isWrapped,
      protocol: location.protocol,
      userAgent: navigator.userAgent,
      language: navigator.language || "",
      online: navigator.onLine !== false,
      fullscreenSupported: !!(native?.setFullscreen || document.documentElement.requestFullscreen),
      clipboardSupported: !!(native?.copyText || navigator.clipboard?.writeText || document.execCommand),
      filePickerSupported: !!(native?.pickTextFile || window.FileReader),
      nativeTextSaveSupported:!!native?.saveTextFile,
      quitSupported:!!native?.quit,
      nativeWindowStateSupported:!!native?.getWindowState,
      nativeSaveFolderSupported:!!native?.openSaveFolder,nativeAppDataFolderSupported:!!native?.openAppDataFolder,runtimeRepairSupported:!!native?.repairRuntime,
      wrapperWarnings:[...(wrapper?.warnings||[])]
    });
  }

  window.DiceboundPlatform = Object.freeze({
    apiVersion: 3,
    contractVersion:wrapper?.contractVersion||1,
    kind: metadata?.kind || "browser",
    isWrapped: !!wrapper?.isWrapped,
    capabilities: Object.freeze({clipboard:true,textDownload:true,textFilePicker:true,fullscreen:true,reload:true,quit:!!native?.quit,dialogs:true,externalLinks:true,logging:true,windowState:true,openSaveFolder:!!native?.openSaveFolder,openAppDataFolder:!!native?.openAppDataFolder,repairRuntime:!!native?.repairRuntime}),
    copyText, downloadText, downloadJson, pickTextFile,
    setFullscreen, toggleFullscreen, reload, quit, openExternal,
    alert: alertUser, confirm: confirmUser, prompt: promptUser,
    log,getWindowState,setWindowState,openSaveFolder,openAppDataFolder,repairRuntime,appInfo,
    nowIso: () => new Date().toISOString(),
    nowMs: () => Date.now(),
    runtimeInfo,
    wrapperDiagnostics:()=>wrapper?.diagnostics?.()||Object.freeze({contractVersion:1,appVersion:identity.version,isWrapped:false,metadata:null,hasPlatform:false,hasStorage:false,warnings:[]})
  });
})();
