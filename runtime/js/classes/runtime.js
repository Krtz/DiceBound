(() => {
  "use strict";

  const OWNER="classes/runtime-identity-capability";
  const slimeRougeState={pendingIdentity:null,pendingUltimate:null,forcedIdentity:null,forcedUltimate:null};
  let deps=null,actionDeps=null;

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
  function prepareSlimeRougeBorrowing(pool=[],pick){
    if(!Array.isArray(pool)||!pool.length)return Object.freeze({identity:null,ultimate:null});
    if(typeof pick!=="function")throw new Error("Classes Slime Rouge borrowing requires pick().");
    const identity=pool.find(candidate=>candidate?.id===slimeRougeState.forcedIdentity)||pick(pool);
    const ultimate=pool.find(candidate=>candidate?.id===slimeRougeState.forcedUltimate)||pick(pool);
    slimeRougeState.pendingIdentity=identity.id;
    slimeRougeState.pendingUltimate=ultimate.id;
    return Object.freeze({identity,ultimate});
  }
  function finishSlimeRougeBorrowing(){
    slimeRougeState.pendingIdentity=null;
    slimeRougeState.pendingUltimate=null;
    slimeRougeState.forcedIdentity=null;
    slimeRougeState.forcedUltimate=null;
    return snapshot();
  }
  function clearSlimeRougeRuntime(){return finishSlimeRougeBorrowing();}
  function snapshot(){return Object.freeze({...slimeRougeState});}

  function configureActions(next={}){
    for(const name of [
      "basicAttack","manaAttack","bloodmageAttack","guard","bloodmageGuard","potion","ultimate",
      "manaSpecial","bloodmageSpecial","rogueSpecial","clericSpecial","beastmasterSpecial","alchemistSpecial"
    ]){
      if(typeof next?.[name]!=="function")throw new Error(`Classes action routing requires ${name}().`);
    }
    actionDeps=next;
    return api;
  }
  function actions(){if(!actionDeps)throw new Error("Classes action routing must be configured before use.");return actionDeps;}
  function performAction(kind){
    const action=actions();
    if(kind==="attack"){
      if(active("bloodmage"))return action.bloodmageAttack();
      if(hasMechanic("mana"))return action.manaAttack();
      return action.basicAttack();
    }
    if(kind==="guard")return active("bloodmage")?action.bloodmageGuard():action.guard();
    if(kind==="potion")return action.potion();
    if(kind==="ultimate")return action.ultimate();
    if(kind==="special"){
      if(hasMechanic("mana"))return action.manaSpecial();
      if(active("bloodmage"))return action.bloodmageSpecial();
      if(active("rogue"))return action.rogueSpecial();
      if(active("cleric"))return action.clericSpecial();
      if(active("beastmaster"))return action.beastmasterSpecial();
      if(active("alchemist"))return action.alchemistSpecial();
      return undefined;
    }
    throw new Error(`Unknown Classes combat action: ${kind}`);
  }

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,configureActions,identityId,active,mechanicsFor,capabilities,hasMechanic,performAction,
    forceSlimeRouge,prepareSlimeRougeBorrowing,finishSlimeRougeBorrowing,clearSlimeRougeRuntime,snapshot
  });

  const facade=window.DiceboundClasses;
  if(!facade?._installRuntime)throw new Error("classes/runtime.js requires DiceboundClasses facade before loading.");
  facade._installRuntime(api);
})();
