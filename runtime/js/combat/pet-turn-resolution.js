(() => {
  "use strict";

  let runtime = null;

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Pet turn-resolution runtime is required.");
    const required = [
      "getPlayer","getMeta","getPets","getElements","getDiboElements","getBoardLevel","isGameStarted",
      "talentRank","gameplayTalentRank","isClassActive","livingEnemies","getCurrentEnemy","getCurrentEnemies","setCurrentEnemy",
      "animatePetAttack","delay","random","pick","clamp","damageEnemy","trackElementProgress","tone","setCombatText",
      "updateCombatUI","addCombatHistory","healPlayer","triggerElementEffect","setPetDoubleBonus","petBondLevel",
      "hasLegendaryEffect","getLastElement"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Pet turn-resolution runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function rt(){if(!runtime)throw new Error("DiceboundCombatPetTurnResolution must be configured before use.");return runtime;}
  function player(){return rt().getPlayer();}
  function meta(){return rt().getMeta();}
  function pets(){return rt().getPets();}
  function elements(){return rt().getElements();}

  function activePetDef(){const m=meta(),registry=pets();return registry[m.activePet]||registry.neutral;}
  function activePetState(){const m=meta();return m.pets?.[m.activePet]||m.pets?.neutral;}
  function petBondDamageExtra(id){return id&&id!=="neutral"?2+Math.floor((rt().petBondLevel(id)-1)/10):0;}

  // Final live petDamage stack: base -> Beastmaster aggressive -> v1.6 +2 ->
  // v1.7 replaces that flat +2 with the bond-scaled extra. Rounding of the
  // aggressive 1.5x happens before the elemental-Pet extra and is intentional.
  function petDamage(){
    const r=rt(),p=player(),m=meta();
    const talentBonus=r.isGameStarted()?p.petDamageBonus:r.talentRank("companion_damage")+r.talentRank("companion_ascendant")*2;
    let damage=1+Math.ceil((activePetState()?.level||1)*.8)+talentBonus;
    if(r.isClassActive("beastmaster")&&p.beastStance==="aggressive")damage=Math.round(damage*1.5);
    const id=m.activePet||"neutral";
    if(id!=="neutral")damage+=petBondDamageExtra(id);
    return damage;
  }

  // Trainer/Summoner strikes use their own historical .82 bond coefficient,
  // then the same elemental-Pet bond extra that replaced v1.6's flat +2.
  function trainerPetDamage(id){
    const r=rt(),p=player(),m=meta(),level=Math.max(1,m.pets?.[id]?.level||1);
    return Math.max(1,1+Math.ceil(level*.82)+p.petDamageBonus+(id&&id!=="neutral"?petBondDamageExtra(id):0));
  }

  function petElementFor(id){const r=rt(),def=pets()[id]||pets().neutral;return def.id==="neutral"?r.pick(r.getDiboElements()):def.element;}
  function activeTrainerPetId(){const p=player(),roster=p.trainerRoster||[];return roster.length?roster[(p.trainerActiveIndex||0)%roster.length]:meta().activePet;}

  async function maybePetElementProc(id,target,source="Companion Spark"){
    const r=rt(),rank=r.gameplayTalentRank("companion_element_proc");
    if(!rank||!target||target.hp<=0||r.random()>=rank*.025)return null;
    const key=petElementFor(id),result=r.triggerElementEffect(key,target,{forced:true,source});
    if(result){r.addCombatHistory(`🌈 ${pets()[id]?.name||"Companion"} triggers ${elements()[key].name} through Primal Spark.`);await r.delay(180);}
    return result;
  }

  async function trainerStrike(id,target,scale=1,label="attacks"){
    const r=rt();if(!target||target.hp<=0)return 0;
    const def=pets()[id]||pets().neutral,element=petElementFor(id);
    let amount=Math.round(trainerPetDamage(id)*scale);
    if(element&&target.weakness===element)amount=Math.round(amount*1.5);
    if(element&&target.affinity===element)amount=Math.round(amount*.5);
    const dealt=r.damageEnemy(target,amount);
    if(element)r.trackElementProgress(element,dealt);
    r.addCombatHistory(`${def.icon} ${def.name} ${label} for ${dealt} ${element?elements()[element].name:"neutral"} damage.`);
    await maybePetElementProc(id,target,`${def.name} companion proc`);
    return dealt;
  }

  async function basePetTurn(){
    const r=rt(),p=player(),targets=r.livingEnemies();if(!targets.length)return;
    const target=r.getCurrentEnemy()?.hp>0?r.getCurrentEnemy():targets[0],def=activePetDef();
    await r.animatePetAttack(300);
    let hits=1,totalBase=petDamage();
    // Historical quirk: the final V19 wrapper also temporarily adds this same
    // set bonus to petDoubleChance, while the base body still adds it inline.
    if(r.random()<r.clamp(p.petDoubleChance+r.setPetDoubleBonus(),0,.95))hits=2;
    let total=0,element=def.element;
    if(def.id==="neutral")element=r.pick(r.getDiboElements());
    for(let i=0;i<hits;i++){
      let amount=totalBase;
      if(element&&target.weakness===element)amount=Math.round(amount*1.5);
      if(element&&target.affinity===element)amount=Math.round(amount*.5);
      total+=r.damageEnemy(target,amount);
      // Ordinary Pet turns historically credit attempted post-multiplier damage,
      // whereas trainerStrike credits the actual dealt value.
      if(element)r.trackElementProgress(element,amount);
    }
    r.tone(520,.08,"triangle",.025,760);
    r.setCombatText(`${def.name} ${hits===2?"attacks twice":"attacks"} for ${total} ${element?elements()[element].name:"neutral"} damage${target.affinity===element?" (affinity resisted half)":""}${def.id==="neutral"?` after rolling ${elements()[element].icon}`:""}.`);
    if(target.hp<=0)r.setCurrentEnemy(r.getCurrentEnemies().indexOf(target));
    r.updateCombatUI();await r.delay(620);r.animatePetAttack(0,false);
  }

  async function beastmasterLayer(){
    const r=rt(),p=player();await basePetTurn();
    if(!r.isClassActive("beastmaster")||!r.getCurrentEnemy())return;
    if(p.beastStance==="defensive"){p.combatShield++;r.addCombatHistory("🐾 Defensive pack order raises a Barrier.");}
    else if(p.beastStance==="support"){const healed=r.healPlayer(2+Math.floor(r.getBoardLevel()/2));if(healed)r.addCombatHistory(`🐾 Support pack order restores ${healed} HP.`);}
    r.updateCombatUI();
  }

  async function trainerAndSummonerLayer(){
    const r=rt(),p=player();
    if(r.isClassActive("pokemontrainer")){
      const targets=r.livingEnemies();if(!targets.length)return;
      let target=r.getCurrentEnemy()?.hp>0?r.getCurrentEnemy():targets[0],id=activeTrainerPetId();
      await trainerStrike(id,target,1.65,"leads the roster");
      if(target.hp<=0){target=r.livingEnemies()[0];if(target)r.setCurrentEnemy(r.getCurrentEnemies().indexOf(target));}
      if(target&&r.random()<r.clamp(.28+(p.trainerAssistBonus||0),0,.80)){
        const others=(p.trainerRoster||[]).filter(x=>x!==id),assist=others.length?r.pick(others):id;
        await trainerStrike(assist,target,p.trainerAssistScale||.65,"jumps in to assist");
      }
      r.updateCombatUI();await r.delay(380);return;
    }
    await beastmasterLayer();
    if(!r.livingEnemies().length)return;
    if(r.isClassActive("summoner")&&(p.summonerSpirits||[]).length){
      for(const id of [...p.summonerSpirits]){
        const target=r.getCurrentEnemy()?.hp>0?r.getCurrentEnemy():r.livingEnemies()[0];if(!target)break;
        const scale=.62*(p.summonerSpiritScale||1),hits=r.random()<r.clamp(p.summonerSpiritDouble||0,0,.75)?2:1;
        for(let h=0;h<hits;h++){await trainerStrike(id,target,scale,hits>1?"answers the pact twice":"answers the pact");if(!target.hp)break;}
        if(target.hp<=0&&r.livingEnemies().length)r.setCurrentEnemy(r.getCurrentEnemies().indexOf(r.livingEnemies()[0]));
      }
    }else{
      const target=r.getCurrentEnemy()?.hp>0?r.getCurrentEnemy():r.livingEnemies()[0];if(target)await maybePetElementProc(meta().activePet||"neutral",target);
    }
    r.updateCombatUI();
  }

  async function healingNuzzleLayer(){
    const r=rt(),p=player();await trainerAndSummonerLayer();
    if((p.petTurnHeal||0)>0&&p.hp>0){const healed=r.healPlayer(p.petTurnHeal);if(healed)r.addCombatHistory(`💗 Healing Nuzzle restores ${healed} HP.`);r.updateCombatUI();}
  }

  async function setBonusLayer(){
    const r=rt(),p=player(),bonus=r.setPetDoubleBonus(),old=p.petDoubleChance||0;p.petDoubleChance=old+bonus;
    try{return await healingNuzzleLayer();}finally{p.petDoubleChance=old;}
  }

  async function petTurn(...args){
    const r=rt(),p=player(),result=await setBonusLayer(...args);
    if(r.hasLegendaryEffect("pet_mirror")&&r.getLastElement()&&r.livingEnemies().length&&r.random()<.25){
      const old=p.elementDamageBonus||0;
      try{p.elementDamageBonus=(1+old)*.65-1;const key=r.getLastElement();r.triggerElementEffect(key,r.livingEnemies()[0],{forced:true,source:"Pet Mirror"});r.addCombatHistory(`🐾🪞 Pet Mirror repeats ${elements()[key]?.name||key}.`);}
      finally{p.elementDamageBonus=old;}
    }
    return result;
  }

  const api=Object.freeze({owner:"combat/pet-turn-resolution",apiVersion:1,configure,petDamage,trainerPetDamage,petElementFor,trainerStrike,maybePetElementProc,petTurn});
  window.DiceboundCombatPetTurnResolution=api;
})();
