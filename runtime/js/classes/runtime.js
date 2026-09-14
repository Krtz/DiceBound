(() => {
  "use strict";

  const OWNER="classes/runtime-identity-capability";
  const slimeRougeState={pendingIdentity:null,pendingUltimate:null,forcedIdentity:null,forcedUltimate:null};
  let deps=null;

  function configure(next={}){
    for(const name of ["getPlayer","getSelectedClassId","getClassMechanics","getUltimateSupportMechanics"]){
      if(typeof next?.[name]!=="function")throw new Error(`Classes runtime requires ${name}().`);
    }
    deps=next;
    return api;
  }
  function runtime(){if(!deps)throw new Error("Classes runtime must be configured before use.");return deps;}
  function identityId(){
    const player=runtime().getPlayer();
    if(player?.classId==='slimerouge')return slimeRougeState.pendingIdentity||player.slimeRougeIdentityClass||'slimerouge';
    return player?.classId||runtime().getSelectedClassId()||'ranger';
  }
  function active(id){return identityId()===id;}
  function mechanicsFor(id){return [...(runtime().getClassMechanics(id)||[])];}
  function capabilities(){
    const player=runtime().getPlayer();
    if(player?.classId!=='slimerouge')return new Set(mechanicsFor(identityId()));
    const out=new Set(mechanicsFor('slimerouge'));
    mechanicsFor(slimeRougeState.pendingIdentity||player.slimeRougeIdentityClass).forEach(value=>out.add(value));
    const ultimate=slimeRougeState.pendingUltimate||player.slimeRougeUltimateClass;
    (runtime().getUltimateSupportMechanics(ultimate)||[]).forEach(value=>out.add(value));
    if(ultimate)out.add(`ultimate:${ultimate}`);
    return out;
  }
  function hasMechanic(tag){
    const player=runtime().getPlayer();
    return player?.classId==='slimerouge'?capabilities().has(tag):mechanicsFor(identityId()).includes(tag);
  }
  function forceSlimeRouge(identity=null,ultimate=null){
    slimeRougeState.forcedIdentity=identity;
    slimeRougeState.forcedUltimate=ultimate;
    return snapshot();
  }
  function clearSlimeRougeRuntime(){
    slimeRougeState.pendingIdentity=null;
    slimeRougeState.pendingUltimate=null;
    slimeRougeState.forcedIdentity=null;
    slimeRougeState.forcedUltimate=null;
    return snapshot();
  }
  function snapshot(){return Object.freeze({...slimeRougeState});}
  function runtimeState(){return slimeRougeState;}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,identityId,active,mechanicsFor,capabilities,hasMechanic,
    forceSlimeRouge,clearSlimeRougeRuntime,snapshot,_runtimeState:runtimeState
  });

  const facade=window.DiceboundClasses;
  if(!facade?._installRuntime)throw new Error("classes/runtime.js requires DiceboundClasses facade before loading.");
  facade._installRuntime(api);
})();
