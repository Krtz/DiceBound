(() => {
  "use strict";
  const identity=window.DiceboundVersion;
  if(!identity)throw new Error("DiceboundHost requires DiceboundVersion before loading.");
  if(typeof URLSearchParams==="undefined")return;
  const params=new URLSearchParams(location.search||"");
  if(params.get("diceboundNative")!=="1" || !/^https?:$/.test(location.protocol))return;

  function request(method,path,body=null){
    const xhr=new XMLHttpRequest(); xhr.open(method,path,false);
    try{xhr.send(body);}catch(e){throw new Error(`Dicebound native bridge unavailable: ${e?.message||e}`);}
    if(xhr.status<200||xhr.status>=300){if(xhr.status===404)return null;throw new Error(`Dicebound native bridge ${method} ${path} failed (${xhr.status})`);}
    return xhr.responseText;
  }
  try{if(request("GET","/__dicebound/health")!=="dicebound-native-webview2")return;}catch(_){return;}
  const q=value=>encodeURIComponent(String(value));
  const storage={
    getString(key){return request("GET",`/__dicebound/storage/get?key=${q(key)}`);},
    setString(key,value){request("POST",`/__dicebound/storage/set?key=${q(key)}`,String(value));return true;},
    remove(key){request("POST",`/__dicebound/storage/remove?key=${q(key)}`);return true;},
    keys(){const raw=request("GET","/__dicebound/storage/keys")||"[]";return JSON.parse(raw);},
    flush(){return true;}
  };
  const platform={
    openSaveFolder(){return request("POST","/__dicebound/platform/open-save-folder")==="ok";},
    openAppDataFolder(){return request("POST","/__dicebound/platform/open-app-data-folder")==="ok";},
    repairRuntime(){return request("POST","/__dicebound/platform/repair-runtime")==="ok";},
    quit(){request("POST","/__dicebound/platform/quit");return true;},
    reload(){location.reload();return true;},
    openExternal(url){return request("POST","/__dicebound/platform/open-external",String(url))==="ok";},
    log(payload){try{request("POST","/__dicebound/platform/log",JSON.stringify(payload??{}));}catch(_){}return true;},
    getWindowState(){return {fullscreen:!!document.fullscreenElement,visibility:document.visibilityState||"visible",width:innerWidth||0,height:innerHeight||0,devicePixelRatio:devicePixelRatio||1};}
  };
  window.DiceboundHost={contractVersion:1,metadata:{kind:"native-webview2",wrapperVersion:identity.version,platform:"windows",architecture:"x64",channel:identity.channel,appVersion:identity.version},platform,storage};

  function ready(){try{request("POST","/__dicebound/platform/ready",JSON.stringify({version:identity.version,channel:identity.channel,href:location.href,userAgent:navigator.userAgent||""}));}catch(_){}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});else ready();
})();
