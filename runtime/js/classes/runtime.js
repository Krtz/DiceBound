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
  function ultimateSupportFor(id){return [...(runtime().getUltimateSupportMechanics(id)||[])];}
  function rosterPool(){
    const rt=runtime();
    if(typeof rt.shuffledPetIds==="function")return rt.shuffledPetIds();
    if(typeof rt.getPetIds==="function")return [...(rt.getPetIds()||[])];
    return [];
  }
  function initUltimateSupport(id){
    const player=runtime().getPlayer(),support=new Set(ultimateSupportFor(id));
    if(support.has('spirits')){player.summonerSpirits=player.summonerSpirits||[];player.summonerCap=player.summonerCap||3;player.summonerSpiritScale=player.summonerSpiritScale||1;}
    if(support.has('roster')&&!(player.trainerRoster||[]).length){const pool=rosterPool();player.trainerRoster=pool.slice(0,6);player.trainerActiveIndex=Math.min(player.trainerActiveIndex||0,Math.max(0,player.trainerRoster.length-1));player.trainerAssistScale=player.trainerAssistScale||.65;}
    if(support.has('mana')&&!player.maxMana){player.maxMana=100;player.mana=Math.max(player.mana||0,25);}
    if(support.has('alchemy')){player.alchemistBrewCounter=player.alchemistBrewCounter||0;player.alchemistBrewNeed=player.alchemistBrewNeed||3;player.alchemistFlaskBonus=player.alchemistFlaskBonus||0;}
    if(support.has('smoke')){player.ninjaSmoke=player.ninjaSmoke||0;player.ninjaSmokeNeed=player.ninjaSmokeNeed||3;}
  }
  function initIdentitySupport(id){
    const player=runtime().getPlayer(),mechanics=new Set(mechanicsFor(id));
    if(mechanics.has('mana')){
      const desiredMax=id==='summoner'?120:100,desiredStart=id==='summoner'?35:25;
      if((player.maxMana||0)<desiredMax)player.maxMana=desiredMax;
      if((player.mana||0)<=0)player.mana=desiredStart;
      else player.mana=Math.min(player.maxMana,Math.max(player.mana,desiredStart));
    }
    if(mechanics.has('spirits')){player.summonerSpirits=player.summonerSpirits||[];player.summonerCap=player.summonerCap||3;player.summonerSpiritScale=player.summonerSpiritScale||1;player.summonerSpiritDouble=player.summonerSpiritDouble||0;player.summonerManaBonus=player.summonerManaBonus||0;}
    if(mechanics.has('roster')&&!(player.trainerRoster||[]).length){const pool=rosterPool();player.trainerRoster=pool.slice(0,6);player.trainerActiveIndex=Math.min(player.trainerActiveIndex||0,Math.max(0,player.trainerRoster.length-1));player.trainerAssistScale=player.trainerAssistScale||.65;}
    if(mechanics.has('faith'))player.clericFaith=player.clericFaith||0;
    if(mechanics.has('smoke')){player.ninjaSmoke=player.ninjaSmoke||0;player.ninjaSmokeNeed=player.ninjaSmokeNeed||3;}
    if(mechanics.has('alchemy')){player.alchemistBrewCounter=player.alchemistBrewCounter||0;player.alchemistBrewNeed=player.alchemistBrewNeed||3;player.alchemistFlaskBonus=player.alchemistFlaskBonus||0;}
  }
  function syncBloodmageHpPassive(initial=false){
    const rt=runtime(),player=rt.getPlayer();
    if(!active("bloodmage"))return;
    if(initial){
      if(typeof rt.getClassBase!=="function")throw new Error("Classes Bloodmage lifecycle requires getClassBase().");
      const base=rt.getClassBase("bloodmage").maxHp,bonus=Math.max(0,(player.maxHp||base)-base);
      if(bonus>0){player.maxHp+=bonus;player.hp+=bonus;}
      player._v18BloodmageMaxHp=player.maxHp;return;
    }
    const last=Number(player._v18BloodmageMaxHp||player.maxHp||0),now=Number(player.maxHp||0);
    if(now>last){const extra=now-last;player.maxHp+=extra;player.hp=Math.min(player.maxHp,player.hp+extra);}
    player._v18BloodmageMaxHp=player.maxHp;
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
      "basicAttack","manaAttack","bloodmageAttack","invokerQuasAttack","invokerWexAttack","invokerExortAttack","guard","bloodmageGuard","potion","ultimate",
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
      if(active("invoker"))return action.invokerWexAttack();
      if(hasMechanic("mana"))return action.manaAttack();
      return action.basicAttack();
    }
    if(kind==="invoker-quas"){if(active("invoker"))return action.invokerQuasAttack();return undefined;}
    if(kind==="invoker-wex"){if(active("invoker"))return action.invokerWexAttack();return undefined;}
    if(kind==="invoker-exort"){if(active("invoker"))return action.invokerExortAttack();return undefined;}
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
    owner:OWNER,apiVersion:1,configure,configureActions,identityId,active,mechanicsFor,ultimateSupportFor,capabilities,hasMechanic,performAction,
    initIdentitySupport,initUltimateSupport,syncBloodmageHpPassive,
    forceSlimeRouge,prepareSlimeRougeBorrowing,finishSlimeRougeBorrowing,clearSlimeRougeRuntime,snapshot
  });

  const facade=window.DiceboundClasses;
  if(!facade?._installRuntime)throw new Error("classes/runtime.js requires DiceboundClasses facade before loading.");
  facade._installRuntime(api);
})();
