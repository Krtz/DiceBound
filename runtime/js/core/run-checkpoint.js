(() => {
  "use strict";
  const save=window.DiceboundSave,rng=window.DiceboundRng,identity=window.DiceboundVersion;
  if(!save)throw new Error("DiceboundRunCheckpoint requires DiceboundSave before loading.");
  if(!rng)throw new Error("DiceboundRunCheckpoint requires DiceboundRng before loading.");
  if(!identity)throw new Error("DiceboundRunCheckpoint requires DiceboundVersion before loading.");
  const CHECKPOINT_VERSION=1;
  const CAMP_RESUME_UI_FIX="browser-camp-resume-v2";

  function cloneJson(value,path="checkpoint",seen=new Set()){
    if(value===null||typeof value==="string"||typeof value==="boolean")return value;
    if(typeof value==="number"){
      if(!Number.isFinite(value))throw new TypeError(`${path} contains a non-finite number`);
      return value;
    }
    if(typeof value!=="object")throw new TypeError(`${path} contains unsupported ${typeof value} data`);
    if(seen.has(value))throw new TypeError(`${path} contains a cycle`);
    seen.add(value);
    let result;
    if(Array.isArray(value))result=value.map((item,index)=>cloneJson(item,`${path}[${index}]`,seen));
    else {
      const proto=Object.getPrototypeOf(value);
      if(proto!==Object.prototype&&proto!==null)throw new TypeError(`${path} contains a non-plain object`);
      result={};
      for(const [key,item] of Object.entries(value))result[key]=cloneJson(item,`${path}.${key}`,seen);
    }
    seen.delete(value);return result;
  }
  function validate(value){
    const checkpoint=cloneJson(value);
    if(Number(checkpoint.checkpointVersion)!==CHECKPOINT_VERSION)throw new Error(`Checkpoint version ${checkpoint.checkpointVersion} is unsupported`);
    if(typeof checkpoint.gameVersion!=="string"||!checkpoint.gameVersion)throw new Error("Checkpoint game version is missing");
    if(!checkpoint.run||typeof checkpoint.run!=="object")throw new Error("Checkpoint run state is missing");
    if(!checkpoint.meta||typeof checkpoint.meta!=="object")throw new Error("Checkpoint career state is missing");
    if(!checkpoint.rng||checkpoint.rng.mode!=="seeded")throw new Error("Checkpoint deterministic RNG state is missing");
    if(!Array.isArray(checkpoint.run.tiles)||!checkpoint.run.tiles.length)throw new Error("Checkpoint board tiles are missing");
    if(!checkpoint.run.player||typeof checkpoint.run.player!=="object")throw new Error("Checkpoint player state is missing");
    return checkpoint;
  }
  function create({run,meta,summary={}}={()){
    return validate({checkpointVersion:CHECKPOINT_VERSION,gameVersion:identity.version,channel:identity.channel,createdAt:new Date().toISOString(),summary,run,meta,rng:rng.snapshot()});
  }
  function store(input){const checkpoint=validate(input);save.saveRunCheckpoint(checkpoint);return cloneJson(checkpoint);}
  function capture(input){return store(create(input));}
  function load(){
    const result=save.loadRunCheckpoint();
    if(!result.checkpoint)return {...result,checkpoint:null};
    try{return {...result,checkpoint:validate(result.checkpoint)};}
    catch(error){return {...result,checkpoint:null,error:error.message};}
  }
  function clear(){return save.clearRunCheckpoint();}
  // UI callers use has() to decide whether an expedition should take over the
  // campsite. Raw storage bytes are not enough: old, corrupt or incompatible
  // checkpoint keys must not hide the normal camp when no run can be resumed.
  function has(){return !!load().checkpoint;}
  function diagnostics(){const loaded=load();return Object.freeze({apiVersion:1,checkpointVersion:CHECKPOINT_VERSION,gameVersion:identity.version,present:save.hasRunCheckpoint(),resumable:!!loaded.checkpoint,valid:!!loaded.checkpoint,source:loaded.source,recovered:loaded.recovered,error:loaded.error||null,summary:loaded.checkpoint?.summary||null,uiFix:CAMP_RESUME_UI_FIX});}

  /* The modern campsite is a spatial grid. The 0.6.3.0 resume adapter inserts
     its panel as campScene's first child; in normal flow that becomes a new
     grid item and can displace most of the actual camp off-screen. Keep the
     panel absolutely positioned instead, and remove any unrecoverable run
     bytes/panel without touching the independent career save. */
  function installCampResumeUiGuard(){
    if(typeof document==="undefined")return;
    const style=document.createElement("style");
    style.id="dicebound-camp-resume-layout-fix";
    style.textContent=`
      #startOverlay.camp-fullscreen #runResumePanel.run-resume-panel{
        position:absolute!important;
        top:max(8px,env(safe-area-inset-top))!important;
        left:50%!important;
        transform:translateX(-50%)!important;
        z-index:40!important;
        width:min(720px,calc(100vw - 28px))!important;
        max-width:720px!important;
        margin:0!important;
        padding:9px 12px!important;
        box-shadow:0 14px 38px rgba(0,0,0,.38)!important;
        backdrop-filter:blur(10px)!important;
      }
      #startOverlay.camp-fullscreen #runResumePanel .run-resume-copy{min-width:180px!important}
      #startOverlay.camp-fullscreen #runResumePanel .run-resume-actions button{min-height:36px!important;padding:8px 10px!important}
      @media(max-width:760px){
        #startOverlay.camp-fullscreen #runResumePanel.run-resume-panel{top:6px!important;width:calc(100vw - 16px)!important;padding:7px 8px!important;gap:6px!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);

    let scheduled=false;
    const repair=()=>{
      scheduled=false;
      const panel=document.getElementById("runResumePanel");
      const loaded=load();
      if(!loaded.checkpoint){
        // An unreadable active run has no recoverable player value. Remove
        // only dicebound.run.* data; career/Legacy state lives elsewhere.
        if(save.hasRunCheckpoint())save.clearRunCheckpoint();
        if(panel)panel.remove();
        return;
      }
      if(panel){
        panel.classList.remove("hidden");
        if(panel.dataset.resumeUiFix!==CAMP_RESUME_UI_FIX)panel.dataset.resumeUiFix=CAMP_RESUME_UI_FIX;
      }
    };
    const schedule=()=>{if(scheduled)return;scheduled=true;setTimeout(repair,0);};
    if(typeof MutationObserver==="function"){
      const observer=new MutationObserver(schedule);
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }
    document.addEventListener("click",schedule,true);
    window.addEventListener?.("pageshow",schedule);
    schedule();
    setTimeout(repair,120);
  }

  window.DiceboundRunCheckpoint=Object.freeze({apiVersion:1,checkpointVersion:CHECKPOINT_VERSION,uiFix:CAMP_RESUME_UI_FIX,create,validate,store,capture,load,clear,has,diagnostics});
  installCampResumeUiGuard();
})();
