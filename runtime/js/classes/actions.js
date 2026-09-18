(() => {
  "use strict";

  const OWNER="classes/runtime-action-mechanics";
  let deps=null;

  function configure(next={}){
    for(const name of [
      "getPlayer","getCurrentEnemy","getBoardLevel","getEncounterLead","getCombatBusy","setCombatBusy",
      "basicAttack","identityFlash","updateCombatUI","healPlayer","damageAll","damageEnemy","setCombatText","updateHUD",
      "sfxHoly","sfxCoin","sfxHit","sfxCrit","delay","livingEnemies","winCombat","resolveEnemyResponse","isClassActive",
      "random","rand","clamp","modifiedGold","getUpgradeChoices","pick","applyUpgrade","showToast",
      "rollD20Chaos","animateClassAttack","getSetDamageBonus","applyMythicRingPulse","selectFirstLivingEnemy",
      "hasEffect","addCombatHistory","potionHealValue","recordPotionUse","chargeUltimate","pickElementKey","triggerElementEffect",
      "rollTieredProc","triggerStrikeElements","playElementAnimation","gameplayTalentRank","dragoonActive","syncDragoonPresentation","dragoonLandPresentation"
    ]){
      if(typeof next?.[name]!=="function")throw new Error(`Classes action mechanics requires ${name}().`);
    }
    deps=next;
    return api;
  }
  function runtime(){if(!deps)throw new Error("Classes action mechanics must be configured before use.");return deps;}

  function positive(value){return Math.max(0,Number(value)||0);}
  function critMultiplier(chance=runtime().getPlayer()?.crit){return 1+runtime().rollTieredProc(positive(chance));}
  function applyPoisonProc(target,chance,source){
    const rt=runtime();
    if(!target||target.hp<=0)return 0;
    const stacks=rt.rollTieredProc(positive(chance));
    if(stacks<=0)return 0;
    target.poisonStacks=(target.poisonStacks||0)+stacks;
    rt.playElementAnimation("nature",target,false);
    rt.addCombatHistory(`☠️ ${source} applies ${stacks} Poison stack${stacks===1?"":"s"} (${Math.round(positive(chance)*100)}% effective Poison chance).`);
    rt.updateCombatUI();
    return stacks;
  }
  function normalElementProc(target){
    if(!target||target.hp<=0)return {totalDamage:0,message:""};
    return runtime().triggerStrikeElements(target)||{totalDamage:0,message:""};
  }
  function clearRogueStolenStats(){
    const player=runtime().getPlayer(),attack=positive(player._rogueStolenAttack),defense=positive(player._rogueStolenDefense);
    if(attack)player.attack=Math.max(0,player.attack-attack);
    if(defense)player.defense-=defense;
    player._rogueStolenAttack=0;player._rogueStolenDefense=0;
    return {attack,defense};
  }

  async function bloodmageBloodletting(){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.getCombatBusy()||!rt.getCurrentEnemy())return;
    const oldLS=player.lifeSteal;
    player.lifeSteal+=.12;
    rt.identityFlash("🩸 Bloodletting restores fuel");
    try{await rt.basicAttack();}
    finally{player.lifeSteal=oldLS;}
    rt.updateCombatUI();
  }

  function roguePowerStealChance(luck=runtime().getPlayer()?.luck){
    return runtime().clamp((Number(luck)||0)-.50,0,.50)*.70;
  }

  async function rogueSteal(){
    const rt=runtime(),player=rt.getPlayer(),enemy=rt.getCurrentEnemy();
    if(rt.getCombatBusy()||!enemy||player.rogueStealUsed)return;
    rt.setCombatBusy(true);player.rogueStealUsed=true;player.combatActionCount++;
    const chance=rt.clamp(.48+player.luck*.22+(player.rogueStealChanceBonus||0),.48,.93),success=rt.random()<chance;
    let text="";
    if(success){
      const raw=rt.rand(10+rt.getBoardLevel()*4,22+rt.getBoardLevel()*8),gold=rt.modifiedGold(Math.max(1,Math.round(raw*(player.rogueStealGoldMult||1))));
      player.gold+=gold;text=`🗡️ You steal ${gold} gold from ${enemy.name}.`;
      const powerChance=roguePowerStealChance(player.luck),powerRoll=powerChance>0?rt.random():1;
      player._beta021LastStealPower={chance:powerChance,roll:powerRoll};
      if(powerChance>0&&powerRoll<powerChance){
        const choices=rt.getUpgradeChoices(),stolen=choices.length?rt.pick(choices):null;
        if(stolen){rt.applyUpgrade(stolen,"Rogue Steal");text+=` <b>Jackpot:</b> you also steal the powerup ${stolen.name}!`;rt.showToast(`🗡️ Stolen powerup: ${stolen.name}`);}
      }
      if(rt.random()<.18){player.potions++;text+=" You also somehow steal a potion.";}
      const statFraction=positive(player.rogueStealStatFraction);
      if(statFraction>0){
        const attackAvailable=Math.max(0,(enemy.attack||0)-1),defenseAvailable=Math.max(0,enemy.defense||0);
        const attackSteal=Math.min(attackAvailable,attackAvailable>0?Math.max(1,Math.round((enemy.attack||0)*statFraction)):0);
        const defenseSteal=Math.min(defenseAvailable,defenseAvailable>0?Math.max(1,Math.round(defenseAvailable*statFraction)):0);
        if(attackSteal||defenseSteal){
          enemy.attack-=attackSteal;enemy.defense-=defenseSteal;
          player.attack+=attackSteal;player.defense+=defenseSteal;
          player._rogueStolenAttack=(player._rogueStolenAttack||0)+attackSteal;
          player._rogueStolenDefense=(player._rogueStolenDefense||0)+defenseSteal;
          text+=` Grand Larceny steals ${attackSteal} ATK and ${defenseSteal} DEF for this battle.`;
        }
      }
      rt.identityFlash("🪙 Steal succeeded");rt.sfxCoin();
    }else{
      text=`🗡️ ${enemy.name} catches your hand. You steal absolutely nothing.`;rt.identityFlash("🚫 Caught!");
    }
    rt.setCombatText(text);rt.updateHUD();rt.updateCombatUI();await rt.delay(620);await rt.resolveEnemyResponse(false);
  }

  async function clericConsecration(){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.getCombatBusy()||!rt.getCurrentEnemy()||(player.clericFaith||0)<100)return;
    rt.setCombatBusy(true);
    player.clericFaith=0;
    player.combatActionCount++;
    const heal=rt.healPlayer(Math.ceil(player.maxHp*.22));
    player.combatShield+=1;
    const critTiers=rt.rollTieredProc(positive(player.crit));
    const dmg=Math.round((player.attack*1.15+player.maxHp*.08)*(1+critTiers)),dealt=rt.damageAll(dmg,.75);
    rt.setCombatText(`☀️ Consecration spends 100 Faith, heals ${heal} HP, raises a Barrier and deals ${dealt} Light-touched damage across the pack${critTiers?` with ${critTiers} critical tier${critTiers===1?"":"s"}`:""}.`);
    rt.identityFlash("☀️ CONSECRATION");
    rt.sfxHoly();
    rt.updateCombatUI();
    await rt.delay(760);
    if(!rt.livingEnemies().length)return rt.winCombat();
    await rt.resolveEnemyResponse(false);
  }

  function cycleBeastStance(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.isClassActive("beastmaster")||rt.getCombatBusy())return;
    const order=["aggressive","defensive","support"],i=order.indexOf(player.beastStance);
    player.beastStance=order[(i+1)%order.length];
    rt.identityFlash(`🐾 ${player.beastStance[0].toUpperCase()+player.beastStance.slice(1)} stance`);
    rt.updateCombatUI();
  }

  async function bloodmageReplenish(){
    const rt=runtime(),player=rt.getPlayer(),enemy=rt.getCurrentEnemy();
    if(rt.getCombatBusy()||!enemy)return;
    rt.setCombatBusy(true);player.combatActionCount++;
    const selfHeal=rt.healPlayer(Math.ceil(player.maxHp*.16)),enemyHeal=Math.min(enemy.maxHp-enemy.hp,Math.ceil(enemy.maxHp*.14));
    enemy.hp+=enemyHeal;player.ultimateCharge=rt.clamp(player.ultimateCharge+20,0,100);const ring=rt.applyMythicRingPulse();
    rt.setCombatText(`💉 Replenish restores ${selfHeal} HP to you and ${enemyHeal} HP to ${enemy.name}, then braces like Guard.${ring?` ${ring}`:""}`);
    rt.updateCombatUI();await rt.delay(700);await rt.resolveEnemyResponse(true);
  }

  async function bloodmageExsanguinateBase(){
    const rt=runtime(),player=rt.getPlayer(),enemy=rt.getCurrentEnemy();
    if(rt.getCombatBusy()||!enemy)return;
    rt.setCombatBusy(true);player.guardCooldown=0;player.combatAttackCount++;player.combatActionCount++;
    const costMult=player.bloodmageExsanguinateCostMult||1,damageMult=player.bloodmageExsanguinateDamageMult||1;
    const paid=Math.max(1,Math.ceil(player.maxHp*.12*costMult));player.hp=Math.max(1,player.hp-paid);
    const chaos=await rt.rollD20Chaos("attack"),critTiers=rt.rollTieredProc(positive(player.crit)),echoScale=1+positive(player.doubleStrike)*.50;
    rt.updateCombatUI();await rt.animateClassAttack(critTiers?"crit":"normal");
    let damage=Math.round((player.attack*2.45+paid*1.9)*echoScale*(1+critTiers)*(chaos.mult||1)*(1+player.damageBonus+rt.getSetDamageBonus())*damageMult);
    if(rt.getEncounterLead()?.boss)damage=Math.round(damage*(1+player.bossDamage));
    const primary=rt.getCurrentEnemy(),first=rt.damageEnemy(primary,damage),second=rt.livingEnemies().find(candidate=>candidate!==primary);let splash=0;
    if(second)splash=rt.damageEnemy(second,Math.round(damage*.65));
    const element=normalElementProc(primary);
    applyPoisonProc(primary,positive(player.doubleStrike)*.50*positive(player.poisonOnHitChance),"Exsanguinate");
    const ring=rt.applyMythicRingPulse(),total=first+splash+(element.totalDamage||0);
    rt.setCombatText(`🩸 Exsanguinate spends ${paid} HP to deal ${first} to ${primary.name}${second?` and ${splash} to ${second.name}`:""}${critTiers?` with ${critTiers} critical tier${critTiers===1?"":"s"}`:""} (${total} total).${element.message?` ${element.message}`:""}${ring?` ${ring}`:""}`);
    rt.sfxHit();rt.updateCombatUI();await rt.delay(820);
    if(!rt.livingEnemies().length)return rt.winCombat();
    rt.selectFirstLivingEnemy();await rt.resolveEnemyResponse(false);
  }

  async function bloodmageExsanguinate(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.hasEffect("blood_price"))return bloodmageExsanguinateBase();
    const old=player.damageBonus||0;player.damageBonus=old+.15;
    try{return await bloodmageExsanguinateBase();}
    finally{
      player.damageBonus=(player.damageBonus||0)-.15;player.damageBonus+=.08;
      player._db060BloodPriceStacks=(player._db060BloodPriceStacks||0)+1;
      rt.addCombatHistory(`🩸📈 Blood Price: +8% battle damage (${player._db060BloodPriceStacks} stack${player._db060BloodPriceStacks===1?"":"s"}).`);
    }
  }

  async function alchemistVolatileFlask(){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.getCombatBusy()||!rt.getCurrentEnemy()||player.potions<=0)return;
    rt.setCombatBusy(true);player.guardCooldown=0;
    const free=rt.random()<rt.clamp(player.alchemistFreeFlask||0,0,.8);
    if(!free){player.potions--;rt.recordPotionUse();}
    const targets=[...rt.livingEnemies()],healing=rt.potionHealValue(),critTiers=rt.rollTieredProc(positive(player.crit));
    const raw=Math.round((healing*1.50+player.attack)*(1+(player.alchemistFlaskBonus||0))*(1+critTiers)),dealt=rt.damageAll(raw,.72);
    let extra=free?" Panacea Engine preserves the potion.":"";
    const poisonChance=positive(player.poisonOnHitChance)*2.50;
    targets.filter(target=>target.hp>0).forEach(target=>applyPoisonProc(target,poisonChance,"Volatile Flask"));
    if(rt.random()<rt.clamp(player.alchemistElementChance||0,0,.75)){
      const key=rt.pickElementKey(),target=rt.getCurrentEnemy()?.hp>0?rt.getCurrentEnemy():rt.livingEnemies()[0],result=rt.triggerElementEffect(key,target,{forced:true,source:"Volatile Flask"});
      if(result)extra+=` ${result.message}`;
    }
    player.combatActionCount++;rt.chargeUltimate(Math.round(player.ultimateAttackGain*.75));rt.sfxCrit();
    rt.setCombatText(`🧪 Volatile Flask converts 150% Potion Healing + 100% Attack into ${dealt} total damage${critTiers?` with ${critTiers} critical tier${critTiers===1?"":"s"}`:""}.${extra}`);rt.updateCombatUI();await rt.delay(720);
    if(!rt.livingEnemies().length)return rt.winCombat();
    await rt.resolveEnemyResponse(false);
  }

  function dragoonCooldown(){return Math.max(2,6-runtime().gameplayTalentRank("dragoon_aerial_discipline"));}
  function dragoonTickCooldown(){
    const player=runtime().getPlayer();
    if(runtime().dragoonActive()&&player.dragoonJumpCooldown>0)player.dragoonJumpCooldown-=1;
    return player.dragoonJumpCooldown||0;
  }
  function dragoonResetState(){
    const rt=runtime(),player=rt.getPlayer();
    Object.assign(player,{dragoonJumpCooldown:0,dragoonAirborneResponses:0,dragoonLandingReady:false});
    rt.syncDragoonPresentation();
  }
  async function dragoonLanding(){
    const rt=runtime(),player=rt.getPlayer(),enemy=rt.getCurrentEnemy();
    if(!rt.dragoonActive()||rt.getCombatBusy()||!enemy||!player.dragoonLandingReady)return false;
    rt.setCombatBusy(true);player.guardCooldown=0;player.dragoonLandingReady=false;player.dragoonAirborneResponses=0;rt.dragoonLandPresentation();
    const target=enemy.hp>0?enemy:rt.livingEnemies()[0];if(!target){rt.setCombatBusy(false);return false;}
    const critTiers=rt.rollTieredProc(positive(player.crit)),base=Math.max(1,Math.round((player.attack+rt.rand(2,6))*2.45)),damage=Math.round(base*(1+critTiers)*(rt.getEncounterLead()?.boss?1+player.bossDamage:1)),dealt=rt.damageEnemy(target,damage);
    player.combatAttackCount++;rt.chargeUltimate(player.ultimateAttackGain+player.critUltimateGain*critTiers);await rt.animateClassAttack(critTiers?"crit":"normal");
    const proc=normalElementProc(target);applyPoisonProc(target,positive(player.poisonOnHitChance),"Dragoon Landing");
    rt.setCombatText(`🐉 Dragoon lands for ${dealt}${critTiers?` with ${critTiers} critical tier${critTiers===1?"":"s"}`:""}.${proc.message?` ${proc.message}`:""}`);rt.updateCombatUI();await rt.delay(480);
    if(!rt.livingEnemies().length)return rt.winCombat();rt.selectFirstLivingEnemy();await rt.resolveEnemyResponse(false);return true;
  }
  async function dragoonJump(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.dragoonActive()||rt.getCombatBusy()||!rt.getCurrentEnemy()||player.dragoonLandingReady||player.dragoonAirborneResponses>0||player.dragoonJumpCooldown>0)return false;
    rt.setCombatBusy(true);player.guardCooldown=0;player.dragoonJumpCooldown=dragoonCooldown();player.dragoonAirborneResponses=1;rt.syncDragoonPresentation();
    rt.setCombatText("🐉 Jump! Dragoon is Airborne through one enemy response. Landing will use the next player action.");rt.updateCombatUI();await rt.delay(260);await rt.resolveEnemyResponse(false);
    if(player.hp>0&&rt.livingEnemies().length){player.dragoonLandingReady=true;rt.updateCombatUI();rt.setCombatText("🐉 Airborne window complete — use your next action to land.");}
    return true;
  }

  const api=Object.freeze({
    owner:OWNER,apiVersion:3,configure,bloodmageBloodletting,roguePowerStealChance,rogueSteal,clearRogueStolenStats,clericConsecration,cycleBeastStance,
    bloodmageReplenish,bloodmageExsanguinate,alchemistVolatileFlask,dragoonCooldown,dragoonTickCooldown,dragoonResetState,dragoonLanding,dragoonJump
  });
  const facade=window.DiceboundClasses;
  if(!facade?._installActions)throw new Error("classes/actions.js requires DiceboundClasses facade before loading.");
  facade._installActions(api);
})();
