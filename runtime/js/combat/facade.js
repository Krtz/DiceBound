(() => {
  "use strict";

  const OWNER="combat/facade";
  let runtime=null;

  const CONTRACT=Object.freeze({
    encounter:["start"],
    attack:["playerAttack"],
    guard:["guardAction","identityGuardAction"],
    mana:["manaGain","occultChannelAttack","occultSpellAttack","summonerConjure"],
    ultimate:["start"],
    petTurn:["petTurn","petDamage","trainerPetDamage","petElementFor","activeTrainerPetId","maybePetElementProc","trainerStrike"],
    turns:["enemyTurn","resolveEnemyResponse","applyPlayerDamage"],
    victory:["winCombat"],
    elements:["triggerElementEffect","currentWeaponElement","triggerWeaponElement","enemyElementProc","affinityElementMultiplier","elementHit","elementHitAll","restoreRadiationDefense","restoreEnemyElementDebuffs","addEnemyBurn"],
    healing:["recordHealing","healPlayer","clearBloodOverhealTemp","clearStoneBattle"],
    d20:["rollD20Chaos","initializePlayerState"],
    strikes:["strikeBaseDamage","performStrike"],
    scaling:["scale"]
  });

  function configure(nextRuntime){
    if(!nextRuntime||typeof nextRuntime!=="object")throw new Error("Combat facade runtime is required.");
    for(const [owner,methods] of Object.entries(CONTRACT)){
      const service=nextRuntime[owner];
      if(!service||typeof service!=="object")throw new Error(`Combat facade missing ${owner} owner.`);
      for(const method of methods)if(typeof service[method]!=="function")throw new Error(`Combat facade ${owner} owner missing ${method}().`);
    }
    runtime=nextRuntime;
    return api;
  }
  function service(name){if(!runtime)throw new Error("DiceboundCombat must be configured before use.");return runtime[name];}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,
    startEncounter:(...args)=>service("encounter").start(...args),
    attack:(...args)=>service("attack").playerAttack(...args),
    guard:(...args)=>service("guard").guardAction(...args),
    identityGuard:(...args)=>service("guard").identityGuardAction(...args),
    manaGain:(...args)=>service("mana").manaGain(...args),
    channel:(...args)=>service("mana").occultChannelAttack(...args),
    spell:(...args)=>service("mana").occultSpellAttack(...args),
    summonerConjure:(...args)=>service("mana").summonerConjure(...args),
    ultimate:(...args)=>service("ultimate").start(...args),
    petTurn:(...args)=>service("petTurn").petTurn(...args),
    petDamage:(...args)=>service("petTurn").petDamage(...args),
    trainerPetDamage:(...args)=>service("petTurn").trainerPetDamage(...args),
    petElementFor:(...args)=>service("petTurn").petElementFor(...args),
    activeTrainerPetId:(...args)=>service("petTurn").activeTrainerPetId(...args),
    maybePetElementProc:(...args)=>service("petTurn").maybePetElementProc(...args),
    trainerStrike:(...args)=>service("petTurn").trainerStrike(...args),
    enemyTurn:(...args)=>service("turns").enemyTurn(...args),
    enemyResponse:(...args)=>service("turns").resolveEnemyResponse(...args),
    applyPlayerDamage:(...args)=>service("turns").applyPlayerDamage(...args),
    win:(...args)=>service("victory").winCombat(...args),
    element:(...args)=>service("elements").triggerElementEffect(...args),
    currentWeaponElement:(...args)=>service("elements").currentWeaponElement(...args),
    triggerWeaponElement:(...args)=>service("elements").triggerWeaponElement(...args),
    enemyElementProc:(...args)=>service("elements").enemyElementProc(...args),
    affinityElementMultiplier:(...args)=>service("elements").affinityElementMultiplier(...args),
    elementHit:(...args)=>service("elements").elementHit(...args),
    elementHitAll:(...args)=>service("elements").elementHitAll(...args),
    restoreRadiationDefense:(...args)=>service("elements").restoreRadiationDefense(...args),
    restoreEnemyElementDebuffs:(...args)=>service("elements").restoreEnemyElementDebuffs(...args),
    addEnemyBurn:(...args)=>service("elements").addEnemyBurn(...args),
    recordHealing:(...args)=>service("healing").recordHealing(...args),
    heal:(...args)=>service("healing").healPlayer(...args),
    clearBloodOverhealTemp:(...args)=>service("healing").clearBloodOverhealTemp(...args),
    clearStoneBattle:(...args)=>service("healing").clearStoneBattle(...args),
    chaos:(...args)=>service("d20").rollD20Chaos(...args),
    initializeD20State:(...args)=>service("d20").initializePlayerState(...args),
    strikeBaseDamage:(...args)=>service("strikes").strikeBaseDamage(...args),
    strike:(...args)=>service("strikes").performStrike(...args),
    scaleEnemy:(...args)=>service("scaling").scale(...args)
  });

  window.DiceboundCombat=api;
})();
