/* DiceBound player / per-run initialization ownership.
 *
 * #311 / #40 / #209: this module replaces the historical resetPlayer
 * last-definition-wins tower. The stages below intentionally preserve the
 * exact shipped wrapper order from Beta 0.6.6.20. Do not reorder apparently
 * redundant assignments: Talent snapshots, heirloom equipment, class-resource
 * setup, Slime Rouge borrowing and post-equipment reconciliation have observable
 * state and RNG ordering contracts.
 */
(() => {
  "use strict";

  const OWNER="run/player-initialization";

  function configure(deps={}){
    const getPlayer=deps.getPlayer,getMeta=deps.getMeta,getClasses=deps.getClasses;
    const getClassPassives=deps.getClassPassives,getElementKeys=deps.getElementKeys;
    if(typeof getPlayer!=="function"||typeof getMeta!=="function"||typeof getClasses!=="function")throw new Error("Player initialization requires player/meta/class state callbacks.");
    for(const name of ["setRunTalentSnapshot","applyTalentBonuses","getHeirloomSlots","equipItem","gameplayTalentRank","generateEquipment","pick","rand","recordRunBuff","elementSummary","classIdentityActive","classHasMechanic","shuffledPetIds","setCombatKind","syncActivePetBonus","syncBloodmageHpPassive","syncOuroborosAttack","syncOuroborosEconomy","slimeRougeDonorPool","getSlimeRougeRuntime","initIdentitySupport","initUltimateSupport","classMechanicsFor","getUltimateSupportMechanics","addLog","applyGearTransform","syncMana","resetDragoonState","setStatsLast","setRunGlobals","initializeD20State"]){
      if(typeof deps[name]!=="function")throw new Error(`Player initialization requires ${name}().`);
    }

    function initialize(classId){
      const player=getPlayer(),meta=getMeta(),CLASSES=getClasses(),CLASS_PASSIVES=getClassPassives?.()||{},ELEMENT_KEYS=[...(getElementKeys?.()||[])];
      if(!player||!meta)throw new Error("Player initialization state is unavailable.");
      if(!ELEMENT_KEYS.length)throw new Error("Player initialization requires element ids.");

      // Outermost historical v2.8 pre-stage: Slime Rouge rolls its identity and
      // Ultimate before the inner reset chain consumes any RNG.
      let identity=null,ultimate=null;
      const slimeRuntime=deps.getSlimeRougeRuntime();
      if(classId==='slimerouge'){
        const pool=deps.slimeRougeDonorPool();
        if(pool.length){
          identity=pool.find(c=>c.id===slimeRuntime.forcedIdentity)||deps.pick(pool);
          ultimate=pool.find(c=>c.id===slimeRuntime.forcedUltimate)||deps.pick(pool);
          slimeRuntime.pendingIdentity=identity.id;slimeRuntime.pendingUltimate=ultimate.id;
        }
      }

      // Historical v1.5 pre-stage: snapshot Talents before the canonical reset.
      deps.setRunTalentSnapshot(JSON.parse(JSON.stringify(meta.purchased||{})));

      // Canonical Beta reset -------------------------------------------------
      const cls=CLASSES[classId]||CLASSES.ranger;
      Object.assign(player,{classId:cls.id,position:0,level:1,xp:0,xpNext:20,hp:cls.base.maxHp,maxHp:cls.base.maxHp,attack:cls.base.attack,defense:cls.base.defense,gold:0,potions:1,crit:cls.base.crit,luck:cls.base.luck||0,postFightHeal:0,goldBonus:0,flatReduction:0,lifeSteal:cls.base.lifeSteal||0,doubleStrike:cls.base.doubleStrike||0,thorns:0,dodge:cls.base.dodge,potionPower:0,extraStepChance:0,xpBonus:0,bossDamage:cls.base.bossDamage||0,revives:0,berserk:0,execute:0,shopDiscount:0,blessingBonus:0,firstHitBlocks:0,damageBonus:0,combatShield:0,guardPower:cls.base.guardPower,classBurst:cls.base.classBurst,ultimateCharge:0,ultimateAttackGain:17,ultimateGuardGain:29,ultimateDamageBonus:0,petDamageBonus:0,petDoubleChance:0,legacyXpBonus:0,fastTravelBonus:0,cookieBondBonus:0,guardHeal:0,guardCounter:0,guardShield:0,guardDelay:0,guardCooldown:0,hasteTurns:0,firstAttackBonus:0,critUltimateGain:0,classUltimateBonus:0,combatAttackCount:0,combatActionCount:0,mythicActionCount:0,diceChoiceChance:0,elementProcBonus:0,elementDamageBonus:0,weaknessElementBonus:0,elementEchoChance:0,elementUltimateGain:0,classElementProcs:{},omniElementChance:0,defenseAttackScale:0,defenseDodgeScale:0,equipment:{},runBuffs:[],upgradeCounts:{},freeMerchantRun:false,echoDamageScale:.70,criticalEchoBonus:0,packDamageBonus:0,loadedSix:false,goldAttackScale:0,boardCheatDeaths:0,bloodOverheal:false,d20BonusChance:0,d20HighRollChance:0,poisonOnHitChance:0,poisonStackPower:.12,naturePoisonStacks:1,elementalEnemyDamage:0});
      deps.applyTalentBonuses();
      (meta.heirlooms||[]).slice(0,deps.getHeirloomSlots()).forEach(item=>deps.equipItem(item,true));
      deps.setRunGlobals({boardLevel:1,rolls:0,tilesMovedThisRun:0,pendingLevelUps:0,currentEnemy:null,currentEnemies:[],currentEncounterLead:null,currentEnemyTile:null,currentMerchantItems:[],runFinalized:false,lastLegacyAward:0,lastGoldLegacyAward:0,merchantBossBattle:false});
      deps.initializeD20State();

      // Unwind historical reset wrappers in their exact runtime order. -------
      // v1.5
      player.bloodOverhealBonus=0;player.clericHealBonus=0;
      if(deps.gameplayTalentRank("element_prismatic")&&!player.equipment.weapon){
        const pr=deps.gameplayTalentRank("element_prismatic"),rr=pr>=3?"rare":pr>=2?"uncommon":"common",starter=deps.generateEquipment(rr,"weapon");
        starter.provenance="prismatic-birthright";starter.heirloomEligible=false;starter.element=deps.pick(ELEMENT_KEYS);starter.name=`Prismatic ${starter.name}`;deps.equipItem(starter,true);
        deps.recordRunBuff("🌈","Prismatic Birthright",`Rank ${pr} started with ${starter.name}: ${deps.elementSummary(starter)}`,"legacy","Element Talent");
      }
      if(deps.classIdentityActive("beastmaster")){player.petDamageBonus+=4;player.petDoubleChance+=.10;}
      if(deps.classIdentityActive("paladin"))player.defenseAttackScale+=.35;
      deps.setStatsLast({hp:player.hp,gold:player.gold});

      // v1.2 class starting passives
      {const p=player.classId;if(p==="fighter")player.firstHitBlocks+=1;if(p==="sorcerer")player.elementProcBonus+=.08;if(p==="clown")player.luck+=.10;if(p==="turtle"){player.firstHitBlocks+=1;player.defense+=1;}if(p==="frog")player.doubleStrike+=.10;if(p==="d20")player.luck+=.08;if(p==="slime"){player.maxHp+=10;player.hp+=10;}if(p==="vampire")player.lifeSteal+=.10;if(p==="ninja"){player.dodge+=.05;player.crit+=.05;}if(p==="rouge"){player.luck+=.10;player.crit+=.05;}if(p==="ceo")player.goldBonus+=2;if(p==="cleric")player.classElementProcs.light=(player.classElementProcs.light||0)+.08;if(p==="rogue"){player.goldBonus+=.25;player.dodge+=.05;}}

      // v1.3 identity/resource state
      Object.assign(player,{mana:0,maxMana:0,monkCombo:0,ninjaSmoke:0,fighterCounterReady:false,turtleCrushReady:false,rogueStealUsed:false,clericFaith:0,beastStance:"aggressive",clownGimmick:null,clownPieReady:false,_occultChanneling:false,_ninjaExecution:false});
      if(deps.classHasMechanic("mana")){player.maxMana=100;player.mana=25;}
      if(deps.classIdentityActive("slime")){player.maxHp=Math.max(CLASSES.slime.base.maxHp,player.maxHp-10);player.hp=Math.min(player.maxHp,Math.max(1,player.hp-10));}

      // v1.5 Summoner / Trainer state
      player.summonerSpirits=[];player.summonerCap=3;player.summonerSpiritScale=1;player.summonerSpiritDouble=0;player.summonerManaBonus=0;player.summonerAutoSpirit=false;player.trainerRoster=[];player.trainerActiveIndex=0;player.trainerAssistBonus=0;player.trainerAssistScale=.65;player.trainerUltimateBonus=0;
      if(deps.classIdentityActive("summoner")){player.maxMana=120;player.mana=35;}
      if(deps.classIdentityActive("pokemontrainer")){player.trainerRoster=deps.shuffledPetIds().slice(0,6);player.trainerActiveIndex=deps.rand(0,Math.max(0,player.trainerRoster.length-1));}

      // v1.6 class counters / Pet bonus
      deps.setCombatKind(null);player.powerupRerolls=deps.gameplayTalentRank("fortune_powerup_rerolls");player.rangerMarkMax=3+deps.gameplayTalentRank("ranger_deep_marks");player.monkComboMax=5+deps.gameplayTalentRank("monk_flow_ceiling");player.fighterCounterStacks=0;player.fighterCounterMax=1+Math.min(1,deps.gameplayTalentRank("fighter_counter_reserve"));player.fighterCounterReady=false;player.turtleCrushReady=false;player.turtleGuardChain=0;player.turtleGuardMax=5;player.secondSun=false;player.secondSunUsedBoards={};player.radiationDefenseLost=0;player.alchemistBrewCounter=0;player.alchemistBrewNeed=3;player.alchemistFlaskBonus=0;player.alchemistElementChance=0;player.alchemistFreeFlask=0;player._activePetBonusId=null;if(deps.classIdentityActive("alchemist")){player.potions+=2;if(player.classId!=="alchemist")player.potionPower+=.50;}deps.syncActivePetBonus(true);

      // v1.7
      player.ninjaSmokeNeed=3;player.guardElementProcBonus=0;

      // v1.8 normalized run fields
      {const form=deps.gameplayTalentRank("monk_flow_ceiling"),nuzzle=deps.gameplayTalentRank("companion_recovery");player.postFightHeal=Math.max(0,(player.postFightHeal||0)-nuzzle);player.petTurnHeal=nuzzle;player.levelChoiceBonus=deps.gameplayTalentRank("fortune_extra_choice");player.guardManaGain=6;player.fighterCounterPowerBonus=(player.fighterCounterPowerBonus||0)+form*.10;player.rangerMarkMax=(player.rangerMarkMax||3)+form;player.turtleGuardMax=(player.turtleGuardMax||5)+form;player.clericFaithGainBonus=(player.clericFaithGainBonus||0)+form*.15;player.manaBuilderBonus=(player.manaBuilderBonus||0)+(deps.classHasMechanic("mana")?form*2:0);player.summonerSpiritScale=(player.summonerSpiritScale||1)+(deps.classIdentityActive("summoner")?form*.10:0);player.alchemistFlaskBonus=(player.alchemistFlaskBonus||0)+(deps.classIdentityActive("alchemist")?form*.10:0);player._v18BloodmageMaxHp=null;deps.syncBloodmageHpPassive(true);deps.syncOuroborosAttack();}

      // v1.9
      player.hasteCooldown=0;player.titanCleaveBarrierBonus=player.titanCleaveBarrierBonus||0;player.paladinGrace=0;if(deps.classIdentityActive("ranger"))player.rangerMarkMax=Math.max(3,3+deps.gameplayTalentRank("monk_flow_ceiling"));

      // v2.1
      player.paladinGraceGainBonus=0;player.rogueStealChanceBonus=0;player.rogueStealGoldMult=1;player.bloodmageExsanguinateCostMult=1;player.bloodmageExsanguinateDamageMult=1;

      // v2.3 Road Wisdom adjustment
      player.fastTravelBonus+=(deps.gameplayTalentRank('legacy_travel')||0)*2;

      // v2.4 Energy Shield / Beastmaster tuning
      player.energyShield=0;player.energyShieldCap=player.maxHp;if(deps.classIdentityActive('beastmaster')){player.petDamageBonus=(player.petDamageBonus||0)+3;player.petDoubleChance=(player.petDoubleChance||0)+.08;}

      // v2.6 stable per-run Talent state
      player.v26SecondOpinionRank=deps.gameplayTalentRank('fortune_powerup_rerolls');player.v26SecondOpinionSpent=0;player.powerupRerolls=player.v26SecondOpinionRank;player.v26ExpandedHorizons=deps.gameplayTalentRank('fortune_extra_choice')>0;player.levelChoiceBonus=player.v26ExpandedHorizons?1:0;{const form=deps.gameplayTalentRank('monk_flow_ceiling');player.fighterCounterMax=Math.max(1,1+form);}

      // v2.7 Ouroboros economy bookkeeping
      player.legendaryOverhealShieldRate=0;player.v27OuroGoldEchoScale=0;player.v27OuroGoldEchoApplied=0;deps.syncOuroborosEconomy();

      // v2.8 Slime Rouge post-stage
      player.v28StartedRandom=false;player.v28BorrowedPassiveClass=null;player.v28BorrowedUltimateClass=null;player.v28BorrowedPassiveName='';
      if(player.classId==='slimerouge'&&identity&&ultimate){
        player.slimeRougeIdentityClass=identity.id;player.slimeRougeUltimateClass=ultimate.id;player.v28BorrowedPassiveClass=identity.id;player.v28BorrowedUltimateClass=ultimate.id;player.v28BorrowedPassiveName=CLASS_PASSIVES[identity.id]?.name||identity.name;deps.initIdentitySupport(identity.id);deps.initUltimateSupport(ultimate.id);player.slimeRougeRunSummary=`🔴 Slime Rouge rolled ${identity.icon} ${identity.name} identity + ${ultimate.ultimate.icon} ${ultimate.ultimate.name} ultimate`;
        const identityMechanics=deps.classMechanicsFor(identity.id),ultimateSupport=deps.getUltimateSupportMechanics(ultimate.id)||[];
        deps.recordRunBuff?.('🔴','Random Identity',`${identity.icon} ${identity.name}: ${CLASS_PASSIVES[identity.id]?.name||'class identity'} · mechanics: ${identityMechanics.join(', ')}`,'class','Slime Rouge');
        deps.recordRunBuff?.('🎭','Random Ultimate',`${ultimate.icon} ${ultimate.ultimate.name} · real ${ultimate.name} ultimate${ultimateSupport.length?` · support: ${ultimateSupport.join(', ')}`:''}`,'class','Slime Rouge');
        deps.addLog(`🔴 Slime Rouge becomes <b>${identity.icon} ${identity.name}</b> for this run and independently rolls <b>${ultimate.icon} ${ultimate.ultimate.name}</b>. Both use their real class mechanics.`);
      }
      slimeRuntime.pendingIdentity=null;slimeRuntime.pendingUltimate=null;slimeRuntime.forcedIdentity=null;slimeRuntime.forcedUltimate=null;

      // Beta 0.6 Legendary/Artifact transform transient state
      player._db060GearSwapAttackAdj=0;player._db060GearSwapDefenseAdj=0;player._db060GlassHpPenalty=0;player._db060IronEchoDefense=0;player._db060BloodPriceStacks=0;player._db060LastStandUsed=false;player._db060LastElement=null;deps.applyGearTransform();

      // Beta 0.6.4.21 post-heirloom Mana reconciliation
      deps.syncMana({baseMaxMana:player.maxMana,currentMana:player.mana});

      // Friends Patch Dragoon transient state and presentation sync
      deps.resetDragoonState();
    }

    return Object.freeze({initialize,owner:OWNER});
  }

  window.DiceboundPlayerInitialization=Object.freeze({apiVersion:1,configure,owner:OWNER});
})();
