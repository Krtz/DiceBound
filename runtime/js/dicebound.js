(() => {
  "use strict";

  const dbRuntime=window.DiceboundRuntime;
  if(!dbRuntime)throw new Error("dicebound.js requires DiceboundRuntime before loading.");
  const APP_IDENTITY=dbRuntime.identity;
  let dbDebugLogSink=null;
  const dbCombatOwner=window.DiceboundCombat;
  if(!dbCombatOwner)throw new Error("dicebound.js requires DiceboundCombat before loading.");
  let dbCombat=null;
  const dbCombatView=window.DiceboundCombatView;
  if(!dbCombatView)throw new Error("dicebound.js requires DiceboundCombatView before loading.");
  const dbRun=window.DiceboundRun;
  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");
  const dbBoardPresentation=window.DiceboundBoardPresentation;
  if(!dbBoardPresentation?.configure||!dbBoardPresentation?.tileMeta)throw new Error("dicebound.js requires DiceboundBoardPresentation before loading.");
  dbBoardPresentation.configure({getBoardLevel:()=>boardLevel});
  const dbProgressionOwner=window.DiceboundProgression;
  if(!dbProgressionOwner)throw new Error("dicebound.js requires DiceboundProgression before loading.");
  let dbProgression=null;
  const dbPowerups=window.DiceboundPowerups;
  if(!dbPowerups)throw new Error("dicebound.js requires DiceboundPowerups before loading.");
  const dbPets=window.DiceboundPets;
  if(!dbPets)throw new Error("dicebound.js requires DiceboundPets before loading.");
  const dbPetLifecycleOwner=window.DiceboundPetLifecycle;
  if(!dbPetLifecycleOwner)throw new Error("dicebound.js requires DiceboundPetLifecycle before loading.");
  let dbPetLifecycle=null;
  const dbItemGenerationOwner=window.DiceboundItemGeneration;
  if(!dbItemGenerationOwner)throw new Error("dicebound.js requires DiceboundItemGeneration before loading.");
  const dbItemOperationsOwner=window.DiceboundItemOperations;
  if(!dbItemOperationsOwner)throw new Error("dicebound.js requires DiceboundItemOperations before loading.");
  const dbHeirloomOperationsOwner=window.DiceboundHeirloomOperations;
  if(!dbHeirloomOperationsOwner)throw new Error("dicebound.js requires DiceboundHeirloomOperations before loading.");
  const dbItems=window.DiceboundItems;
  if(!dbItems)throw new Error("dicebound.js requires DiceboundItems before loading.");
  let dbItemGeneration=null,dbItemOperations=null,dbHeirloomOperations=null;

  let elementChanceForRarity,rollGearRarity,generatePhilosophersStone;
  let v19SetDamageBonus,v19SetProcBonus,v19SetPetDoubleBonus;
  let v19SetElementPower,v19SetStartUltimate,v19SetGuardianSpecialMult;
  let openCombatLootChain,v17OpenLegendaryChoice;
  dbItems.configure({
    generateEquipment:(rarity=null,slot=null)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateEquipment(rarity,slot);},
    generateLegendary:(slot=null,preferUndiscovered=false)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateLegendary(slot,preferUndiscovered);},
    rollGearRarity:bonus=>rollGearRarity(bonus),
    openLoot:(item,done)=>openLoot(item,done),
    equip:(item,silent=false)=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.equip(item,silent);},
    sellValue:item=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.sellValue(item);},
    rawSellValue:item=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.rawSellValue(item);},
    score:item=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.score(item);},
    formatBonuses:item=>formatBonuses(item),
    formatComparison:(item,current)=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.formatComparison(item,current);},
    syncHeirloomState:options=>{if(!dbHeirloomOperations)throw new Error('Heirloom operations owner is not configured.');return dbHeirloomOperations.sync(options);},
    toggleStoredHeirloomActive:item=>{if(!dbHeirloomOperations)throw new Error('Heirloom operations owner is not configured.');return dbHeirloomOperations.toggleStoredActive(item);},
    discardStoredHeirloom:item=>{if(!dbHeirloomOperations)throw new Error('Heirloom operations owner is not configured.');return dbHeirloomOperations.discardStored(item);},
    toggleRunHeirloomStorage:item=>{if(!dbHeirloomOperations)throw new Error('Heirloom operations owner is not configured.');return dbHeirloomOperations.toggleRunStorage(item);},
    toggleLegacyHeirloom:item=>{if(!dbHeirloomOperations)throw new Error('Heirloom operations owner is not configured.');return dbHeirloomOperations.toggleLegacy(item);}
  });
  const dbRoadEvents=window.DiceboundRoadEvents;
  if(!dbRoadEvents)throw new Error("dicebound.js requires DiceboundRoadEvents before loading.");
  dbRoadEvents.configure({
    treasure:{
      getPlayer:()=>player,
      getBoardLevel:()=>boardLevel,
      getTiles:()=>tiles,
      currentTileCount:()=>currentTileCount(),
      isHell:()=>hellMode,
      isNightmare:()=>nightmareMode,
      random:()=>random(),
      rand:(a,b)=>rand(a,b),
      modifiedGold:value=>modifiedGold(value),
      clamp:(value,min,max)=>clamp(value,min,max),
      refreshTile:index=>refreshTile(index),
      coin:()=>sfx.coin(),
      addLog:text=>addLog(text),
      showToast:(...args)=>showToast(...args),
      updateHUD:()=>updateHUD(),
      returnToRoad:()=>returnToRoad(),
      rollGearRarity:bonus=>dbItems.rollGearRarity(bonus),
      generateEquipment:rarity=>dbItems.generateEquipment(rarity),
      openLoot:(item,done)=>dbItems.openLoot(item,done),
      generateLegendary:(slot,preferUndiscovered)=>dbItems.generateLegendary(slot,preferUndiscovered)
    },
    lifecycle:{
      $:id=>$(id),
      getPlayer:()=>player,
      getMeta:()=>meta,
      getTiles:()=>tiles,
      getBoardLevel:()=>boardLevel,
      currentTileCount:()=>currentTileCount(),
      random:()=>random(),
      rand:(a,b)=>rand(a,b),
      pick:values=>pick(values),
      delay:ms=>delay(ms),
      fastWheelSlots:()=>dbProgression.hasAnyBoardClear(6)&&!!meta.settings?.fastWheelSlots,
      tone:(...args)=>tone(...args),
      sfxRoll:()=>sfx.roll(),
      sfxLevel:()=>sfx.level(),
      sfxCoin:()=>sfx.coin(),
      sfxHoly:()=>sfx.holy(),
      modifiedGold:value=>modifiedGold(value),
      gameplayTalentRank:id=>dbProgression.gameplayTalentRank(id),
      saveMeta:()=>saveMeta(),
      updateMetaUI:()=>updateMetaUI(),
      refreshTile:index=>refreshTile(index),
      addLog:text=>addLog(text),
      showToast:(...args)=>showToast(...args),
      updateHUD:()=>updateHUD(),
      returnToRoad:()=>returnToRoad(),
      activePetName:()=>dbPets.activeDefinition().name,
      eligibleUpgrades:filter=>dbPowerups.eligible(filter),
      applyRandomHighRarity:(...args)=>dbPowerups.applyRandomHighRarity(...args),
      applyUpgrade:(...args)=>dbPowerups.apply(...args),
      describePowerup:up=>dbPowerups.describe(up),
      rarityLabel:rarity=>rarityInfo[rarity]?.label||rarity,
      forceLevels:n=>forceLevels(n),
      recordRunBuff:(...args)=>recordRunBuff(...args),
      effectiveDodgeChance:()=>effectiveDodgeChance(),
      fallbackRarityPool:wanted=>dbPowerups.fallbackRarityPool(wanted),
      startCombat:kind=>startCombat(kind),
      art:(...args)=>beta043Art(...args)
    }
  });
  const dbMerchantOwner=window.DiceboundMerchant;
  if(!dbMerchantOwner)throw new Error("dicebound.js requires DiceboundMerchant before loading.");
  let dbMerchant=null;
  const MERCHANT_SPACING = 12;
  const STATIC_CAMP_TILES = [10,30,55,70,90];
  const POWERUP_TILE_COUNT = 5;
  const WHEEL_TILE_COUNT = 5;

  let dbInfoGuide=null;
  const DB_EQUIPMENT_CONFIG=window.DiceboundEquipment?.createRegistry?.();
  if(!DB_EQUIPMENT_CONFIG)throw new Error("DiceboundEquipment must load before dicebound.js");
  const EQUIPMENT_SLOTS=[...DB_EQUIPMENT_CONFIG.slots];
  const SLOT_LABELS={...DB_EQUIPMENT_CONFIG.labels};
  const DB_ELEMENT_CONTENT=window.DiceboundElementContent;
  if(!DB_ELEMENT_CONTENT)throw new Error("DiceboundElementContent must load before dicebound.js");
  const ELEMENTS=DB_ELEMENT_CONTENT.createRegistry();
  const ELEMENT_KEYS=[...DB_ELEMENT_CONTENT.ids];
  const DIBO_ELEMENTS=[...DB_ELEMENT_CONTENT.coreIds];
  const PET_UNLOCK_REQUIREMENT=dbPetLifecycleOwner.unlockRequirement;
  const GUARDIAN_SPECIAL_INTERVAL=5;

        const DB317_CLASSES_RAW=window.DiceboundClasses?.createRegistry();
  if(!DB317_CLASSES_RAW)throw new Error("DiceboundClasses must load before dicebound.js");
  const CLASSES=DB317_CLASSES_RAW;
  const dbClassPresentation=window.DiceboundClassPresentation;
  if(!dbClassPresentation?.configure)throw new Error("DiceboundClassPresentation must load before dicebound.js");
  dbClassPresentation.configure({
    document,find:id=>document.getElementById(id),getClass:id=>CLASSES[id]||null,
    resolveClassArt:id=>window.DiceboundAssets?.resolveClassArt?.(id)||null
  });
  const DB317_PETS_RAW=dbPets.createRegistry?.();
  if(!DB317_PETS_RAW)throw new Error("DiceboundPets must load before dicebound.js");
  const PETS=DB317_PETS_RAW;
  dbPetLifecycle=dbPetLifecycleOwner.configure({
    getMeta:()=>meta,getPlayer:()=>player,getPets:()=>PETS,getElements:()=>ELEMENTS,isRunActive:()=>!!gameStarted,
    classHasMechanic:id=>classHasMechanic(id),talentRank:id=>talentRank(id),rand:(min,max)=>rand(min,max),
    saveMeta:()=>saveMeta(),checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks(),
    sfxLevel:()=>sfx.level(),sfxCoin:()=>sfx.coin(),sfxHoly:()=>sfx.holy(),showToast:(...args)=>showToast(...args),
    addLog:text=>addLog(text),updateMetaUI:()=>updateMetaUI(),updateHUD:()=>updateHUD(),
    renderPetCollection:()=>window.DiceboundPetChooser.render(),refreshActivePetArt:()=>db059RefreshActivePetArt?.()
  });
  dbPets.configure({
    activeDefinition:()=>dbPetLifecycle.activeDefinition(),activeState:()=>dbPetLifecycle.activeState(),bondLevel:id=>dbPetLifecycle.bondLevel(id),
    bonusScale:id=>dbPetLifecycle.bonusScale(id),damageExtra:id=>dbPetLifecycle.damageExtra(id),displayDamage:id=>dbPetLifecycle.displayDamage(id),
    bonusText:id=>dbPetLifecycle.bonusText(id),chooserState:()=>dbPetLifecycle.chooserState(),elementName:id=>dbPetLifecycle.elementName(id),
    canSwitch:id=>dbPetLifecycle.canSwitch(id),select:id=>dbPetLifecycle.select(id),feed:count=>dbPetLifecycle.feed(count),
    trackElementProgress:(key,amount)=>dbPetLifecycle.trackElementProgress(key,amount),syncActiveBonus:force=>dbPetLifecycle.syncActiveBonus(force),
    shuffledPetIds:()=>dbPetLifecycle.shuffledPetIds()
  });
  const DB_EFFECTIVE_STATS=window.DiceboundEffectiveStats;
  if(!DB_EFFECTIVE_STATS)throw new Error("DiceboundEffectiveStats must load before dicebound.js");
  const DB_POWERUP_SERVICES=dbRuntime.createPowerupServices({
    run:{getPlayer:()=>player},
    economy:{goldReward:amount=>modifiedGold(amount),goldBaseFor:(source,level,multiplier)=>window.DiceboundEventRewards.goldBaseFor(source,level,multiplier),isNightmare:()=>nightmareMode},
    combat:{heal:amount=>dbCombat.heal(amount)},
    rules:{clamp:(value,min,max)=>clamp(value,min,max)},
    content:{elementIds:DIBO_ELEMENTS,classHasTag:(classId,tag)=>(CLASSES[classId]?.tags||[]).includes(tag)},
    signatures:{
      applyCurrent:()=>{
        const service=window.DiceboundPerfectedSignature;
        if(!service?.applyCurrent)throw new Error("Perfected Signature service is unavailable.");
        return service.applyCurrent();
      },
      describeCurrent:()=>window.DiceboundPerfectedSignature?.describeCurrent?.()||"Perfected Signature adapts to the current class."
    }
  });
  const DB317_POWERUPS_RAW=dbPowerups.createRegistry(DB_POWERUP_SERVICES);
  if(!DB317_POWERUPS_RAW)throw new Error("DiceboundPowerups must provide the powerup registry before dicebound.js");
  const upgrades=DB317_POWERUPS_RAW;
  const DB317_TALENTS_RAW=window.DiceboundTalents?.createRegistry();
  if(!DB317_TALENTS_RAW)throw new Error("DiceboundTalents must load before dicebound.js");
  const talents=DB317_TALENTS_RAW;
  const DB317_ENEMY_POOL_RAW=window.DiceboundEnemies?.createNormalRegistry();
  if(!DB317_ENEMY_POOL_RAW)throw new Error("DiceboundEnemies must load before dicebound.js");
  const enemyPool=DB317_ENEMY_POOL_RAW;
  const DB_RARITIES=window.DiceboundRarities;
  if(!DB_RARITIES?.isPowerupRarityAtLeast||!DB_RARITIES?.cascadeLuckRows||!DB_RARITIES?.rollOrdinaryGearRarity)throw new Error("DiceboundRarities must provide rarity and Luck policy before dicebound.js");
  const DB317_RARITY_INFO_RAW=window.DiceboundRarities?.createInfoRegistry();
  if(!DB317_RARITY_INFO_RAW)throw new Error("DiceboundRarities must load before dicebound.js");
  const rarityInfo=DB317_RARITY_INFO_RAW;
  const DB317_RARITY_VALUES_RAW=window.DiceboundRarities?.createValueRegistry();
  if(!DB317_RARITY_VALUES_RAW)throw new Error("DiceboundRarities must load before dicebound.js");
  const rarityValues=DB317_RARITY_VALUES_RAW;
  const DB317_CLASS_TAGS_RAW=Object.fromEntries(Object.entries(DB317_CLASSES_RAW).map(([id,cls])=>[id,[...(cls.tags||[])]]));
  const CLASS_TAGS=DB317_CLASS_TAGS_RAW;
  const DB317_CLASS_PASSIVES_RAW=window.DiceboundClasses?.createPassiveRegistry?.();
  if(!DB317_CLASS_PASSIVES_RAW)throw new Error("DiceboundClasses passive registry must load before dicebound.js");
  const CLASS_PASSIVES=DB317_CLASS_PASSIVES_RAW;
  const DB317_BOARD_REGISTRY_RAW=dbRun.createBoardRegistry();
  if(!DB317_BOARD_REGISTRY_RAW)throw new Error("DiceboundRun must provide the board registry before dicebound.js");
  const BOARD_REGISTRY=DB317_BOARD_REGISTRY_RAW;
  const DB317_SPECIAL_ENEMIES_RAW=window.DiceboundEnemies?.createSpecialRegistry?.();
  if(!DB317_SPECIAL_ENEMIES_RAW)throw new Error("DiceboundEnemies special registry must load before dicebound.js");
  const ENEMY_REGISTRY=DB317_SPECIAL_ENEMIES_RAW;
  const DB317_EQUIPMENT_REGISTRY_RAW=DB_EQUIPMENT_CONFIG;
  const EQUIPMENT_REGISTRY=DB317_EQUIPMENT_REGISTRY_RAW;
  const DB317_ACHIEVEMENT_REGISTRY_RAW=window.DiceboundAchievements?.createRegistry?.();
  if(!DB317_ACHIEVEMENT_REGISTRY_RAW)throw new Error("DiceboundAchievements must load before dicebound.js");
  const ACHIEVEMENT_REGISTRY=DB317_ACHIEVEMENT_REGISTRY_RAW;
  if(!window.DiceboundClasses?.tagVocabulary?.length)throw new Error("DiceboundClasses tag vocabulary must load before dicebound.js");
  const ELEMENT_ID_VOCABULARY=[...DB_ELEMENT_CONTENT.ids];
  const POWERUP_GATE_REGISTRY={
    prestige10:{type:"prestige",minimum:10},
    road2:{type:"classUnlocked",classId:"clown"},
    road3:{type:"flag",field:"nightmareUnlocked"},
    nature_master:{type:"elementProgress",element:"nature",minimum:500},
    merchant1:{type:"counter",field:"merchantKills",minimum:1},
    ranger_b1:{type:"boardClear",classId:"ranger",board:1},
    sorcerer_b2:{type:"boardClear",classId:"sorcerer",board:2},
    slime_lvl5:{type:"classLevel",classId:"slime",minimum:5},
    heal1000:{type:"lifetimeStat",stat:"healingDone",minimum:1000},
    gold1500:{type:"lifetimeStat",stat:"highestGold",minimum:4000},
    menagerie:{type:"allPetsUnlocked"},
    paladin_oath:{type:"achievements",requirements:["fighter-b3","cleric-b3"]}
  };
  const DB317_CLASS_UNLOCKS_RAW=window.DiceboundClasses?.createUnlockRegistry?.();
  if(!DB317_CLASS_UNLOCKS_RAW)throw new Error("DiceboundClasses unlock registry must load before dicebound.js");
  const CLASS_UNLOCK_REGISTRY=DB317_CLASS_UNLOCKS_RAW;

  const DB317_CLASS_MECHANICS_RAW=window.DiceboundClasses?.createMechanicsRegistry?.();
  if(!DB317_CLASS_MECHANICS_RAW)throw new Error("DiceboundClasses mechanics registry must load before dicebound.js");
  const CLASS_MECHANICS_REGISTRY=DB317_CLASS_MECHANICS_RAW;
  const MECHANIC_TAG_VOCABULARY=[...new Set(Object.values(CLASS_MECHANICS_REGISTRY).flat().concat([...window.DiceboundClasses.tagVocabulary],DB317_POWERUPS_RAW.flatMap(u=>u.tags||[]),[
    "ultimate","damage","tempo","defense","crit","luck","healing","sustain","elemental","poison","pet","pack","mana","guard","barrier","wealth","potions","alchemy","lifesteal","evasion"
  ]))];
  function db318InferPowerupMechanics(u){
    let descText="";try{const dd=Object.getOwnPropertyDescriptor(u,"desc");if(dd&&Object.prototype.hasOwnProperty.call(dd,"value"))descText=String(dd.value||"");}catch(_){}
    const tags=new Set([...(u.tags||[])]),requires=new Set(),owners=[u.classId,...(u.classIds||[])].filter(Boolean),text=`${u.id||""} ${u.name||""} ${descText}`.toLowerCase();
    const add=(...xs)=>xs.forEach(x=>x&&tags.add(x));
    if(/crit/.test(text)||tags.has("precision"))add("crit");
    if(/echo/.test(text)||tags.has("tempo"))add("echo","tempo");
    if(/poison|venom|toxic|plague/.test(text)||tags.has("poison"))add("poison");
    if(/mana/.test(text)||tags.has("mana"))add("mana");
    if(/heal|lifesteal|restore hp|overheal/.test(text))add("healing","sustain");
    if(/barrier|guard|defen/.test(text)||tags.has("guardian"))add("guard","defense");
    if(/pet|companion|spirit|summon|pack/.test(text)||tags.has("pet")||tags.has("pack"))add("pet","pack");
    if(/gold|merchant|shop/.test(text)||tags.has("wealth"))add("wealth");
    if(/potion|flask|brew|alchemist/.test(text)||tags.has("alchemy"))add("potions","alchemy");
    if(/ultimate/.test(text)||tags.has("ultimate"))add("ultimate");
    if(/element|fire|ice|electric|light|void|nature|coffee|metal|tech|donut/.test(text)||tags.has("elemental"))add("elemental");
    if(owners.includes("sorcerer")&&/arcane surge|arcane resonance/.test(text))requires.add("arcane-surge");
    if(owners.includes("ranger")&&/mark|quarry/.test(text))requires.add("marks");
    if(owners.includes("fighter")&&/counter|counterblow|riposte/.test(text))requires.add("counter");
    if(owners.includes("monk")&&/combo|flow|form/.test(text))requires.add("combo");
    if(owners.includes("turtle")&&/shell|guard chain|momentum/.test(text))requires.add("guard-chain");
    if(owners.includes("ninja")&&/smoke|shadow|execution/.test(text))requires.add("smoke");
    if(owners.includes("summoner")&&/spirit|summon|conjur|pact|circle/.test(text))requires.add("spirits");
    if(owners.includes("pokemontrainer")&&/roster|trainer|battle|stampede|pok/.test(text))requires.add("roster");
    if(owners.includes("alchemist")&&/flask|brew|alchemist|potion/.test(text))requires.add("alchemy");
    if(owners.includes("rogue")&&/steal|theft|sticky finger/.test(text))requires.add("steal");
    if(owners.includes("cleric")&&/faith|consecr/.test(text))requires.add("faith");
    if(owners.includes("cleric")&&/blessed attack|benediction/.test(text))requires.add("blessed-attack");
    if(owners.includes("bloodmage")&&/blood|exsangu|replenish/.test(text))requires.add("blood-fuel");
    if(owners.includes("ouroboros")&&/ouro|infinite|return|serpent/.test(text))requires.add("ouroboros-conversion");
    if(owners.some(id=>["sorcerer","vampire","rouge","merchant","summoner"].includes(id))&&/mana|channel|lance|hex|reservoir|conjur/.test(text))requires.add("mana");
    if(tags.has("ultimate")&&owners.length)owners.forEach(id=>requires.add(`ultimate:${id}`));
    return {id:u.id,tags:[...tags],requires:[...requires],owners};
  }
  const POWERUP_MECHANICS_REGISTRY=Object.fromEntries(DB317_POWERUPS_RAW.map(u=>[u.id,db318InferPowerupMechanics(u)]));
  const DB317_ULTIMATE_SUPPORT_RAW=window.DiceboundClasses?.createUltimateSupportRegistry?.();
  if(!DB317_ULTIMATE_SUPPORT_RAW)throw new Error("DiceboundClasses ultimate-support registry must load before dicebound.js");
  const ULTIMATE_SUPPORT_MECHANICS=DB317_ULTIMATE_SUPPORT_RAW;
  const DB317_GUARDIANS=window.DiceboundGuardians;
  if(!DB317_GUARDIANS)throw new Error("DiceboundGuardians must load before dicebound.js");
  function db317Enemy(id){const e=ENEMY_REGISTRY[id];return e?{...e}:null;}
  function db317Board(level=boardLevel){return BOARD_REGISTRY[String(level)]||BOARD_REGISTRY["1"];}
  function db317FinalGuardian(level=boardLevel){return DB317_GUARDIANS.resolveFinal(level).combat;}
  function db317MinibossGuardian(level=boardLevel){return DB317_GUARDIANS.resolveMiniboss(level).combat;}
  const DiceboundContentRegistry={version:3,classes:CLASSES,classUnlocks:CLASS_UNLOCK_REGISTRY,classTagVocabulary:window.DiceboundClasses.tagVocabulary,powerups:upgrades,powerupGates:POWERUP_GATE_REGISTRY,equipment:EQUIPMENT_REGISTRY,pets:PETS,enemies:{normal:enemyPool,special:ENEMY_REGISTRY},talents,achievements:ACHIEVEMENT_REGISTRY,boards:BOARD_REGISTRY,rarities:rarityInfo,classTags:CLASS_TAGS,classPassives:CLASS_PASSIVES,classMechanics:CLASS_MECHANICS_REGISTRY,mechanicTagVocabulary:MECHANIC_TAG_VOCABULARY,powerupMechanics:POWERUP_MECHANICS_REGISTRY,ultimateSupportMechanics:ULTIMATE_SUPPORT_MECHANICS,elementIds:ELEMENT_ID_VOCABULARY};
  window.DiceboundContent=DiceboundContentRegistry;

  const $ = (id) => document.getElementById(id);
  const delay = (ms) => new Promise(resolve => setTimeout(resolve,ms));
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

  const random = () => window.DiceboundRng?.random?.() ?? Math.random();
  const rand = (min,max) => window.DiceboundRng?.int?.(min,max) ?? Math.floor(random()*(max-min+1))+min;
  const pick = (arr) => window.DiceboundRng?.pick?.(arr) ?? arr[Math.floor(random()*arr.length)];

  let audioCtx = null;
  let muted = false;
  let gameStarted = false;
  let rollLocked = true;
  let combatBusy = false;
  let pendingLevelUps = 0;
  let currentEnemy = null;
  let currentEnemies = [];
  let currentEnemyIndex = 0;
  let currentEncounterLead = null;
  let currentEncounterTurn = 0;
  let currentEnemyTile = null;
  let currentMerchantItems = [];
  let currentMerchantNotice = "";
  let selectedClassId = "ranger";
  let pendingLootItem = null;
  let pendingLootCallback = null;
  let rolls = 0;
  let tilesMovedThisRun = 0;
  let runFinalized = true;
  let lastLegacyAward = 0;
  let lastGoldLegacyAward = 0;
  let boardLevel = 1;
  let tileEls = [];
  let tiles = [];
  let nightmareMode = false;

  const DB_CORE_META=dbRuntime.createMetaService({classIds:Object.keys(CLASSES),petIds:Object.keys(PETS),elementIds:ELEMENT_KEYS,petUnlockRequirement:PET_UNLOCK_REQUIREMENT});
  if(!DB_CORE_META)throw new Error("DiceboundRuntime must provide career-state composition before dicebound.js");
  const DB_PRESTIGE=window.DiceboundPrestige;
  if(!DB_PRESTIGE)throw new Error("DiceboundPrestige must load before dicebound.js");
  const DB_CLASS_UNLOCK_RULES=window.DiceboundClassUnlockRules;
  if(!DB_CLASS_UNLOCK_RULES)throw new Error("DiceboundClassUnlockRules must load before dicebound.js");
  const {legacyXpForLevel,defaultPrestige,defaultPetState,defaultPets,defaultSettings,defaultMeta,normalizePurchased,normalizeSavedItem}=DB_CORE_META;
  const normalizeMetaCore=DB_CORE_META.normalizeMeta;
  function loadMeta(){
    const result=DB_CORE_META.load();
    window.__DiceboundSaveLoadResult=result;
    return result.meta;
  }
  let meta=loadMeta();
  syncMutedFromSettings();
  function normalizePrestigeState(){meta.prestige=DB_PRESTIGE.normalize(meta.prestige);return meta.prestige;}
  normalizePrestigeState();
  function saveMeta(){dbDebugLogSink?.log('all','save','saveMeta()',dbDebugLogSink.state());repairEquipmentPresentationData?.();normalizePrestigeState();dbProgression?.crucibleNormalize?.();syncMutedFromSettings();return DB_CORE_META.save(meta);}

  const DiceboundStateEvents=dbRuntime.createEventBus();

  // Classes owns runtime identity/capability policy. These thin local names remain

  const dbClasses=window.DiceboundClasses;
  if(!dbClasses?.configure)throw new Error("Dicebound.js requires the DiceboundClasses runtime facade.");
  dbClasses.configure({
    getPlayer:()=>player,
    getSelectedClassId:()=>selectedClassId,
    getClassMechanics:id=>[...(window.DiceboundContent?.classMechanics?.[id]||[])],
    getUltimateSupportMechanics:id=>[...(window.DiceboundContent?.ultimateSupportMechanics?.[id]||[])],
    getClassBase:id=>CLASSES[id]?.base||null,
    shuffledPetIds:()=>dbPets.shuffledPetIds(),
    getPetIds:()=>Object.keys(PETS)
  });
  dbClasses.configureRuntimeHooks({
    getPlayer:()=>player,
    isClassActive:id=>classIdentityActive(id),
    clamp:(value,min,max)=>clamp(value,min,max),
    scaleBerserkerRageDamage:(amount,targetPlayer)=>DB_EFFECTIVE_STATS.scaleBerserkerRageDamage(amount,targetPlayer),
    hasEffect:id=>db060HasEffect(id)
  });

  function classIdentityId(){return dbClasses.identityId();}
  function classIdentityActive(id){return dbClasses.active(id);}
  function classMechanicsFor(id){return dbClasses.mechanicsFor(id);}
  function slimeRougeCapabilities(){return dbClasses.capabilities();}
  function classHasMechanic(tag){return dbClasses.hasMechanic(tag);}

  const ProgressionState=Object.freeze({
    grantXp(amount){
      const requested=Number(amount)||0,before={xp:player.xp,level:player.level,xpNext:player.xpNext,pending:pendingLevelUps};
      const applied=Math.max(1,Math.floor(requested*(nightmareMode?.5:1)));player.xp+=applied;let levelsGained=0;
      while(player.xp>=player.xpNext){player.xp-=player.xpNext;player.level++;levelsGained++;player.xpNext=Math.round(player.xpNext*1.30+4);pendingLevelUps++;if(classIdentityActive('alchemist'))player.potionPower+=.05;}
      return DiceboundStateEvents.emit('progression:xp',{domain:'progression',type:'xp',requested,applied,levelsGained,before,after:{xp:player.xp,level:player.level,xpNext:player.xpNext,pending:pendingLevelUps}});
    },
    forceLevels(count){const before=player.level;for(let i=0;i<count;i++){player.level++;player.xpNext=Math.round(player.xpNext*1.30+4);pendingLevelUps++;if(classIdentityActive('alchemist'))player.potionPower+=.05;}return DiceboundStateEvents.emit('progression:force-levels',{domain:'progression',type:'force-levels',count,levelBefore:before,levelAfter:player.level,pendingLevelUps});}
  });
  const ProgressionUI=Object.freeze({render(result){updateHUD?.();return result;}});

  dbRun.configure({tileDispatch:{
    getRoad:()=>({player,tiles,boardLevel,merchantBossPrimed,merchantBossDefeatedThisBoard}),
    setRollLocked:value=>{rollLocked=!!value;},
    setCombatBusy:value=>{combatBusy=!!value;},
    refreshTile,
    updateHud:updateHUD,
    log:addLog,
    toast:showToast,
    returnToRoad:()=>returnToRoad(),
    startCombat:kind=>startCombat(kind),
    openEvent:()=>dbRoadEvents.openSlot(),
    openWheelEvent:()=>dbRoadEvents.openWheel(),
    openFreePowerup:()=>openFreePowerup(),
    openTreasure:()=>dbRoadEvents.openTreasure(),
    useCamp:()=>useCamp(),
    openMerchant:()=>dbMerchant.open(),
    openBlessing:()=>dbRoadEvents.openBlessing(),
    openMystic:()=>dbRoadEvents.openMystic(),
    openBloodwell:()=>dbRoadEvents.openBloodwell(),
    openGambler:()=>dbRoadEvents.openGambler(),
    clearDevilPrimed:()=>{meta.devilPrimed=false;saveMeta();},
    logDiagnostic:(level,category,message,data)=>v25Log(level,category,message,data),
    debugState:()=>v25State(),
    trace:(name,work)=>v25TraceCommand(name,work,'detailed')
  }});

  dbRun.configure({generation:{
    getState:()=>({boardLevel}),
    getModeState:()=>({hellMode,devilPrimed:!!meta.devilPrimed}),
    getEnemyPool:()=>enemyPool,
    getBoardDefinition:level=>db317Board(level),
    enemyById:id=>db317Enemy(id),
    elementKeys:()=>ELEMENT_KEYS,
    random,
    rand,
    pick,
    currentTileCount:()=>currentTileCount(),
    currentMinibossTile:()=>currentMinibossTile(),
    currentCampTiles:()=>currentCampTiles(),
    currentPowerupCount:()=>currentPowerupCount(),
    currentWheelCount:()=>currentWheelCount(),
    merchantSpacing:()=>MERCHANT_SPACING,
    gameplayTalentRank:id=>dbProgression.gameplayTalentRank(id),
    roadTileType:(roll,level)=>window.DiceboundEventRewards.roadTileType(roll,level),
    withRunTalentSnapshot:work=>dbProgression.withRunTalentSnapshot(work),
    setRoad:next=>{tiles=next.tiles;merchantFaceClicks=new Set();merchantBossPrimed=false;merchantBossDefeatedThisBoard=false;merchantFaceTotal=next.merchantFaceTotal;}
  }});

  dbRun.configure({completion:{
    clearCheckpoint:()=>dbRunClearCheckpoint(),
    isCompleting:()=>v19CompletingSixth,
    beforeCompletion:()=>({unlockSlimeRouge:!!player.v28StartedRandom&&dbProgression.isClassUnlocked('slime')&&!meta.unlocks?.slimerouge}),
    setCompleting:value=>{v19CompletingSixth=!!value;},
    setRunState:next=>{gameStarted=!!next.gameStarted;rollLocked=!!next.rollLocked;},
    isRunFinalized:()=>runFinalized,
    finalizeRun:options=>dbProgression.finalizeRun(options),
    getCompletionContext:()=>({mode:hellMode?'Hell':nightmareMode?'Nightmare':'Normal',level:player.level,gold:player.gold,rolls,legacyAward:lastLegacyAward,goldLegacyAward:lastGoldLegacyAward}),
    updateHud:updateHUD,
    presentTerminalEnd:detail=>dbRunPresentFinalEnd(detail),
    recordFirstCompletion:()=>{meta.board6Clears=(meta.board6Clears||0)+1;saveMeta();},
    afterCompletion:detail=>dbRunApplySixthRoadCompletion(detail)
  }});

  dbRun.configure({transition:{
    getRoad:()=>({player,boardLevel}),
    setBoardLevel:value=>{boardLevel=value;},
    resetEncounter:()=>{currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;},
    setRollLocked:value=>{rollLocked=!!value;},
    applyTheme:()=>applyRunTheme(),
    rebuildBoard:()=>{dbRun.generateBoard();buildBoard();},
    getBoardDefinition:level=>db317Board(level),
    completeFinalRoad:()=>dbRun.completeFinalRoad(),
    log:addLog,
    toast:showToast,
    playHoly:()=>sfx.holy(),
    updateHud:updateHUD,
    placePawn,
    schedule:(work,ms)=>setTimeout(work,ms)
  }});

  dbRun.configure({movement:{
    getRoad:()=>({player,tiles,boardLevel,hellMode,devilPrimed:!!meta.devilPrimed}),
    currentTileCount:()=>currentTileCount(),
    currentMinibossTile:()=>currentMinibossTile(),
    incrementTilesMoved:()=>++tilesMovedThisRun,
    emit:(name,payload)=>DiceboundStateEvents.emit(name,payload),
    hasEffect:id=>db060HasEffect(id),
    clamp,
    modifiedGold,
    grantXp,
    log:addLog,
    toast:showToast,
    playStep:()=>sfx.step(),
    refreshBoardHighlights,
    placePawn,
    updateHud:updateHUD,
    delay,
    dispatchTile:()=>dbRun.dispatchTile()
  }});

  dbRun.configure({lifecycle:{
    clearCheckpoint:()=>dbRunClearCheckpoint(),
    seedNewRun:()=>dbRunSeedNewRun(),
    beforeFreshRun:options=>options?.beforeFreshRun?.(),
    selectedClassId:()=>selectedClassId,
    isRandomClassMode:()=>window.DiceboundClassChooser?.isRandomMode?.(),
    resolveRandomForRun:()=>window.DiceboundClassChooser?.resolveRandomForRun?.(),
    prepareFreshRun:()=>{
      v19CompletingSixth=false;runFinalized=false;lastLegacyAward=0;lastGoldLegacyAward=0;meta.doubleDiceUnlocked=!!(meta.doubleDiceUnlocked||(meta.board5Clears||0)>0);
      v16CombatKind=null;
    },
    ensureAudio,
    initializePlayer:classId=>resetPlayer(classId),
    setBoardLevel:value=>{boardLevel=value;},
    applyRunTheme:()=>applyRunTheme(),
    generateBoard:()=>dbRun.generateBoard(),
    buildBoard:()=>buildBoard(),
    setRunState:next=>{gameStarted=!!next.gameStarted;rollLocked=!!next.rollLocked;combatBusy=!!next.combatBusy;},
    clearLog:()=>{const log=$('log');if(log)log.innerHTML='';},
    setDice:value=>{const dice=$('dice');if(dice)dice.textContent=value;},
    hideSurface:id=>$(id)?.classList.add('hidden'),
    getFreshContext:()=>({classId:player.classId,className:CLASSES[player.classId]?.name||player.classId,nightmareMode}),
    log:addLog,
    updateHud:updateHUD,
    schedulePawn:ms=>setTimeout(()=>placePawn(false),ms),
    recordFreshRunStarted:()=>{dbProgression.recordRunStarted({classId:player.classId,mode:dbCareerRunMode(),petId:meta.activePet||null,version:APP_IDENTITY.version,seed:dbRunOwnedSeed||null});statsLastHp=player.hp;statsLastGold=player.gold;},
    announceRandomClass:chosen=>addLog(`🎲 Random class selected <b>${chosen.icon} ${chosen.name}</b> for this run.`),
    afterClassStart:detail=>dbRunApplyClassStartEffects(detail),
    scheduleCheckpoint:()=>dbRunScheduleCheckpoint()
  }});

  const CombatUI=Object.freeze({
    renderStrike(result){const critNote=result.critTiers?` · Critical ×${result.critTiers+1}`:'',execNote=result.executed?' · EXECUTION':'';setCombatText(`${result.burst||''}${result.label}${critNote}: ${result.dealt} damage${execNote}${result.heal?` · ${result.heal} lifesteal`:''}.${result.elementMessage?` ${result.elementMessage}`:''}`);result.critTiers?sfx.crit():sfx.hit();updateCombatUI();return result;}
  });

  const BattleVictoryState=Object.freeze({
    create({title='Victory!',defeatedNames=[],xp=0,gold=0,cookies=0,board=boardLevel}={}){
      return DiceboundStateEvents.emit('combat:victory',{domain:'combat',type:'victory',title:String(title||'Victory!'),defeatedNames:[...(defeatedNames||[])],xp:Math.max(0,Math.round(Number(xp)||0)),gold:Math.max(0,Math.round(Number(gold)||0)),cookies:Math.max(0,Math.round(Number(cookies)||0)),board:Number(board)||1});
    }
  });
  const BattleVictoryUI=Object.freeze({
    reset(){
      const overlay=$('combatOverlay'),panel=$('battleVictory');overlay?.classList.remove('battle-won');panel?.classList.add('hidden');
      const btn=$('battleVictoryContinue');if(btn)btn.onclick=null;
    },
    async present(result){
      const overlay=$('combatOverlay'),panel=$('battleVictory'),btn=$('battleVictoryContinue');
      if(!overlay||!panel||!btn)return result;
      // Victory is presentation of an already-resolved combat state, never a speculative overlay.
      if((currentEnemies||[]).some(enemy=>enemy&&enemy.hp>0)){this.reset();console.warn('Victory presentation blocked while enemies are still alive.');return result;}
      $('battleVictoryTitle').textContent=`🏆 ${result.title}`;
      $('battleVictoryDefeated').textContent=result.defeatedNames.length?`Defeated: ${result.defeatedNames.join(', ')}`:'The road is clear.';
      $('battleVictoryXp').textContent=`+${result.xp}`;$('battleVictoryGold').textContent=`+${result.gold}`;$('battleVictoryCookies').textContent=`+${result.cookies}`;
      $('battleVictoryCookieBox')?.classList.toggle('hidden',result.cookies<=0);
      overlay.classList.add('battle-won');panel.classList.remove('hidden');
      $('combatTitle').textContent='Victory!';$('combatSubtitle').textContent='Rewards secured. Review the battle log or continue when ready.';
      setCombatText('Battle complete. The full combat log remains available below.',false);
      await new Promise(resolve=>{btn.onclick=()=>{btn.onclick=null;resolve();};});
      return result;
    }
  });
  Object.defineProperty(window,'DiceboundStateArchitecture',{value:Object.freeze({events:DiceboundStateEvents,progression:ProgressionState,board:dbRun.boardState,victory:BattleVictoryState,victoryUI:BattleVictoryUI,identity:Object.freeze({id:classIdentityId,active:classIdentityActive,hasMechanic:classHasMechanic,capabilities:slimeRougeCapabilities})}),configurable:false});
  const player = {
    classId:"ranger",position:0,level:1,xp:0,xpNext:20,hp:32,maxHp:32,attack:6,defense:1,
    gold:0,potions:1,crit:.15,luck:0,postFightHeal:0,goldBonus:0,
    flatReduction:0,lifeSteal:0,doubleStrike:0,thorns:0,dodge:.08,potionPower:0,
    extraStepChance:0,xpBonus:0,bossDamage:0,revives:0,berserk:0,execute:0,
    shopDiscount:0,blessingBonus:0,firstHitBlocks:0,damageBonus:0,combatShield:0,
    guardPower:.52,classBurst:0,ultimateCharge:0,ultimateAttackGain:17,ultimateGuardGain:29,ultimateDamageBonus:0,petDamageBonus:0,petDoubleChance:0,legacyXpBonus:0,fastTravelBonus:0,cookieBondBonus:0,
    guardHeal:0,guardCounter:0,guardShield:0,guardDelay:0,guardCooldown:0,hasteTurns:0,firstAttackBonus:0,critUltimateGain:0,classUltimateBonus:0,combatAttackCount:0,combatActionCount:0,mythicActionCount:0,diceChoiceChance:0,
    elementProcBonus:0,elementDamageBonus:0,weaknessElementBonus:0,elementEchoChance:0,elementUltimateGain:0,classElementProcs:{},equipmentElementProcs:{},omniElementChance:0,defenseAttackScale:0,defenseDodgeScale:0,equipment:{},runBuffs:[],upgradeCounts:{},crucibleEchoEffectId:null
  };

  const dbEquipmentIdentityOwner=window.DiceboundEquipment;
  if(!dbEquipmentIdentityOwner?.ensureEquipmentIdentity)throw new Error('DiceboundEquipment modern identity owner must load before Dicebound artifacts.');
  function ensureModernEquipmentIdentity(item,{classId=player?.classId||selectedClassId,requireIntrinsic=true}={}){
    if(!item)return item;
    dbEquipmentIdentityOwner.ensureEquipmentIdentity(item,{classId,rarity:"legendary",seed:item.seedCode||item.seed||item.id||item.name,requireIntrinsic});
    return item;
  }
  const dbArtifacts=window.DiceboundArtifacts;
  if(!dbArtifacts?.configure||!dbArtifacts?.create)throw new Error('DiceboundArtifacts final factory owner must load before dicebound.js');
  dbArtifacts.configure({getPlayer:()=>player,random:()=>random(),pick:values=>pick(values),getElementKeys:()=>ELEMENT_KEYS,ensureEquipmentIdentity:(item,options)=>dbEquipmentIdentityOwner.ensureEquipmentIdentity(item,options)});

                    /* rarityValues is registry-owned. */

      function elementSummary(item){if(!item?.element||!ELEMENTS[item.element])return "";const e=ELEMENTS[item.element],chance=Math.round((.14+rarityValues[item.rarity]*.025)*100);return `${e.icon} ${e.name} element · ${chance}% proc chance · ${e.spell}`;}
          function bonusLabel(key,value){
    const names={attack:"Attack",defense:"Defense",maxHp:"Max HP",maxMana:"Mana",crit:"Crit",dodge:"Dodge",lifeSteal:"Lifesteal",luck:"Luck",goldBonus:"Gold",potionPower:"Potion healing",bossDamage:"Boss Damage",flatReduction:"Damage reduction",doubleStrike:"Echo Strike",classBurst:"Signature Burst",extraStepChance:"Extra-step chance",damageBonus:"All damage",thorns:"Thorns"};
    const amount=Number(value)||0,sign=amount<0?"−":"+",magnitude=Math.abs(amount);
    if(key==="luck")return `${sign}${Math.round(magnitude*100)} Luck`;
    if(String(key).startsWith("elementProc:")){const id=String(key).slice("elementProc:".length),element=ELEMENTS[id];return `${sign}${Math.round(magnitude*100)}% ${element?.name||id} proc`;}
    const pct=["crit","dodge","lifeSteal","goldBonus","potionPower","bossDamage","doubleStrike","classBurst","extraStepChance","damageBonus"].includes(key);
    return `${sign}${pct?Math.round(magnitude*100)+"%":magnitude} ${names[key]||key}`;
  }
  function formatBonuses(item){
    const stats=Object.entries(item?.bonuses||{}).map(([k,v])=>bonusLabel(k,v));
    const identity=dbEquipmentIdentityOwner.identityForItem?.(item),intrinsic=dbEquipmentIdentityOwner.intrinsicBonusesForItem?.(item)||{},elementProcs=dbEquipmentIdentityOwner.elementProcBonusesForItem?.(item)||{};
    const intrinsicText=[...Object.entries(intrinsic).map(([k,v])=>bonusLabel(k,v)),...Object.entries(elementProcs).map(([k,v])=>bonusLabel(`elementProc:${k}`,v))];
    if(identity&&intrinsicText.length)stats.push(`INTRINSIC (${identity.displayName}): ${intrinsicText.join(" · ")}`);
    if(item?.element&&ELEMENTS[item.element])stats.push(elementSummary(item));
    if(item?.uniqueEffect)stats.push(`Unique: ${item.uniqueEffect}`);
    if(item?.setName)stats.push(`Set: ${item.setName}`);
    return stats.join(" · ")||"No bonuses";
  }
  function mythicalSetCount(){return EQUIPMENT_SLOTS.reduce((n,slot)=>n+(player.equipment?.[slot]?.setName==="Impossible Road"?1:0),0);}
  function hasMythicPiece(piece){return EQUIPMENT_SLOTS.some(slot=>player.equipment?.[slot]?.mythicPiece===piece);}
  function applyItemStats(item,sign){
    if(!item)return;
    const oldMax=player.maxHp,total=dbEquipmentIdentityOwner.allBonusesForItem?.(item)||item.bonuses||{};
    Object.entries(total).forEach(([key,value])=>{if(typeof player[key]==="number")player[key]+=value*sign;});
    player.equipmentElementProcs=player.equipmentElementProcs||{};
    for(const [element,value] of Object.entries(dbEquipmentIdentityOwner.elementProcBonusesForItem?.(item)||{})){
      player.equipmentElementProcs[element]=Math.max(0,(player.equipmentElementProcs[element]||0)+value*sign);
      if(player.equipmentElementProcs[element]<=.000001)delete player.equipmentElementProcs[element];
    }
    player.crit=Math.max(0,player.crit);player.dodge=Math.max(0,player.dodge);player.lifeSteal=clamp(player.lifeSteal,0,.75);player.luck=clamp(player.luck,0,1.50);player.doubleStrike=Math.max(0,player.doubleStrike);
    if(player.maxHp<1)player.maxHp=1;
    if(sign>0&&player.maxHp>oldMax)player.hp+=player.maxHp-oldMax;
    player.hp=clamp(player.hp,1,player.maxHp);
  }
    function equipItem(item,silent=false){return dbItems.equip(item,silent);}
  function repairEquipmentPresentationData(){
    const repair=window.DiceboundEquipment?.repairPresentationFields;
    if(typeof repair!=="function")return 0;
    let repaired=0;const seen=new Set();
    const visit=item=>{if(!item||typeof item!=="object"||seen.has(item))return;seen.add(item);if(repair(item,{classId:player?.classId||selectedClassId}))repaired++;};
    Object.values(player?.equipment||{}).forEach(visit);
    (meta?.heirlooms||[]).forEach(visit);
    (meta?.heirloomStorage||[]).forEach(visit);
    return repaired;
  }
  function renderEquipment(){
    repairEquipmentPresentationData();
    return dbEquipmentUi.renderEquipment();
  }
    function closeLoot(){
    $("lootOverlay").classList.add("hidden");const cb=pendingLootCallback;pendingLootItem=null;pendingLootCallback=null;if(cb)cb();
  }

  const dbEquipmentUi=window.DiceboundEquipmentHeirlooms;
  if(!dbEquipmentUi)throw new Error('DiceBound requires the equipment and Heirloom UI module before dicebound.js');
  function dbEquipmentUiState(){return {
    equipment:player.equipment||{},heirlooms:meta.heirlooms||[],storage:meta.heirloomStorage||[],
    storageUnlocked:dbProgression.heirloomStorageUnlocked(),storageCapacity:dbProgression.heirloomStorageCapacity(),
    activeCapacity:dbProgression.heirloomLoadoutCapacity(),storageMilestones:dbProgression.heirloomStorageMilestones()
  };}
  function dbEquipmentUiLootCopy(item){
    if(item?.rarity==='legendary')return {title:'LEGENDARY ITEM FOUND!',subtitle:'A 151–210 point generated item carrying one build-changing Legendary Effect.'};
    if(item?.rarity==='mythical'&&db060NamedMythicals?.has?.(item.name))return {subtitle:'A named Mythical relic. Prestige crafting will become its long-term reconstruction path.'};
    return null;
  }
  function dbEquipmentPrepareLoot(item,callback){
    if(!item||typeof item!=='object'||!EQUIPMENT_SLOTS.includes(item.slot)){
      v25Log?.('errors','loot','Invalid loot reward skipped',{item:item?String(item):null,state:v25State?.()});
      if(typeof callback==='function')setTimeout(()=>{try{callback();}catch(error){v25Log?.('errors','loot','Loot continuation failed',{error:String(error),stack:error?.stack||'',state:v25State?.()});}},0);
      return false;
    }
    if(item.specialLegendary&&!meta.legendaryRelics.includes(item.name)){meta.legendaryRelics.push(item.name);saveMeta();}
    if(item.legendaryEffectId&&!meta.legendaryEffectsDiscovered.includes(item.legendaryEffectId)){meta.legendaryEffectsDiscovered.push(item.legendaryEffectId);saveMeta();}
    return true;
  }
  dbEquipmentUi.configure({
    find:$,getSlots:()=>EQUIPMENT_SLOTS,getSlotLabel:slot=>SLOT_LABELS[slot],getRarityInfo:rarity=>rarityInfo[rarity],formatBonuses,formatDetailBonuses:item=>formatBonuses(item),getEquipmentIdentity:item=>window.DiceboundEquipment?.identityForItem?.(item),getSpecialEquipmentIdentity:item=>{if(item?.setName!=="Impossible Road")return null;const slot=item?.mythicPiece||item?.slot,entry=dbArtifacts.entries?.find?.(candidate=>candidate.slot===slot);return entry?{displayName:entry.label,slot:entry.slot}:null;},getSafeEquipmentIcon:item=>window.DiceboundEquipment?.safeIconForItem?.(item),getAllBonuses:item=>window.DiceboundEquipment?.allBonusesForItem?.(item),formatBonus:(key,value)=>bonusLabel(key,value),
    getState:dbEquipmentUiState,getArtifactSet:()=>({count:mythicalSetCount(),tiers:v24SetTierData().map(tier=>({pieces:tier.pieces,text:tier.text}))}),
    resolveEquipmentArt:item=>window.DiceboundAssets?.resolveEquipmentArt?.(item),itemSellValue:(...args)=>dbItems.sellValue(...args),
    syncStorage:()=>dbItems.syncHeirloomState(),toggleStoredActive:item=>dbItems.toggleStoredHeirloomActive(item),discardStored:item=>dbItems.discardStoredHeirloom(item),
    toggleRunStorage:item=>dbItems.toggleRunHeirloomStorage(item),toggleLegacyHeirloom:item=>dbItems.toggleLegacyHeirloom(item),
    isHeirloomEligible:item=>window.DiceboundEquipment.isHeirloomEligible(item),confirm:diceboundConfirm,
    getCharacterLayout:()=>meta.settings?.characterLayout==='classic'?'classic':'modern',
    afterStorageChange:()=>updateMetaUI(),afterCharacterPresentationChange:()=>setTimeout(()=>beta042ScheduleSidebarLayout(),0),lootCopy:dbEquipmentUiLootCopy
  });

  const req=(id,rank=1)=>({id,rank});
  dbProgression=dbProgressionOwner.configure({
    legacyXpForLevel:level=>legacyXpForLevel(level),getMeta:()=>meta,getPlayer:()=>player,getTalents:()=>talents,getRunTalentSnapshot:()=>runTalentSnapshot,setRunTalentSnapshot:value=>{runTalentSnapshot=value;return runTalentSnapshot;},
    saveMeta:()=>saveMeta(),sfxLevel:()=>sfx.level(),showToast:(...args)=>showToast(...args),renderTalents:()=>window.DiceboundTalentTree.render(),
    isRunFinalized:()=>runFinalized,setRunFinalized:value=>{runFinalized=!!value;},getLastLegacyAward:()=>lastLegacyAward,setLastLegacyAward:value=>{lastLegacyAward=value;},setLastGoldLegacyAward:value=>{lastGoldLegacyAward=value;},
    getTilesMovedThisRun:()=>tilesMovedThisRun,getRolls:()=>rolls,isNightmare:()=>!!nightmareMode,random:()=>random(),updateMetaUI:()=>updateMetaUI(),
    getRunMode:()=>dbCareerRunMode(),getCareerRunSnapshot:()=>dbCareerRunSnapshot(),
    hidePrestigeHeirloomOverlay:()=>$('prestigeHeirloomOverlay')?.classList.add('hidden'),
    getEquipmentSlotCount:()=>EQUIPMENT_SLOTS.length,syncHeirloomState:options=>dbItems.syncHeirloomState(options),getLegendaryEffects:()=>dbItemGenerationOwner.effects,
    getAchievementRegistry:()=>ACHIEVEMENT_REGISTRY,getPowerupGateRegistry:()=>POWERUP_GATE_REGISTRY,getClasses:()=>CLASSES,getUpgrades:()=>upgrades,getElements:()=>ELEMENTS,
    mythicalSetCount:()=>mythicalSetCount(),getGameStarted:()=>!!gameStarted,
    getClassUnlockContext:()=>dbClassUnlockContext(),classUnlockIsUnlocked:(id,ctx)=>DB_CLASS_UNLOCK_RULES.isUnlocked(id,ctx),classUnlockMayCommit:(id,ctx)=>DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,ctx),
    classUnlockRecordObservedProgress:ctx=>DB_CLASS_UNLOCK_RULES.recordObservedProgress(ctx),classUnlockResolveDynamic:options=>DB_CLASS_UNLOCK_RULES.resolveDynamic(options),
    classUnlockFeedback:id=>window.DiceboundClassUnlockFeedback?.onClassUnlocked?.(id),renderClassChoices:()=>window.DiceboundClassChooser.render(),addLog:html=>addLog(html),
    sfxHoly:()=>sfx.holy(),openStartScreen:()=>openStartScreen()
  });
  dbProgression.crucibleNormalize();
  dbHeirloomOperations=dbHeirloomOperationsOwner.createController({
    getMeta:()=>meta,normalizeItem:item=>normalizeSavedItem(item),isEligible:item=>window.DiceboundEquipment.isHeirloomEligible(item),
    storageUnlocked:()=>dbProgression.heirloomStorageUnlocked(),storageCapacity:()=>dbProgression.heirloomStorageCapacity(),activeCapacity:()=>dbProgression.heirloomLoadoutCapacity(),
    saveMeta:()=>saveMeta(),showToast:(...args)=>showToast(...args),sfxHoly:()=>sfx.holy()
  });
  const talentRank=id=>dbProgression.talentRank(id);

    dbProgression.repairTalentPrerequisites();

  const customSoundState={};
  function ensureAudio(){
    if(audioCtx)return;
    try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}
  }
  function syncMutedFromSettings(){
    const settings=meta.settings=meta.settings||defaultSettings();
    settings.muted=!!settings.muted;muted=settings.muted;
    const muteButton=$("muteBtn");if(muteButton)muteButton.textContent=muted?"🔇":"🔊";
    return muted;
  }
  function setMuted(next){
    const settings=meta.settings=meta.settings||defaultSettings();
    settings.muted=!!next;saveMeta();return muted;
  }
  function soundSettings(){
    const raw=meta?.settings||{};
    return {masterVolume:clamp(Number(raw.masterVolume),0,1),soundPack:raw.soundPack==='custom'?'custom':'synth'};
  }
  function masterVolume(multiplier=1){return clamp(soundSettings().masterVolume,0,1)*Math.max(0,Number(multiplier)||0);}
  function tone(freq=440,duration=.08,type="sine",volume=.035,slide=null){
    if(muted||!audioCtx)return;
    const scaled=masterVolume(volume);
    if(scaled<=0)return;
    const t=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,t);
    if(slide)osc.frequency.exponentialRampToValueAtTime(slide,t+duration);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(scaled,t+.01);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain).connect(audioCtx.destination);osc.start(t);osc.stop(t+duration+.02);
  }
  function playCustomSound(name,volume=1){
    if(muted)return false;
    const cfg=window.DiceboundAssets?.resolveSoundEffect?.(name,'custom');
    if(!cfg?.candidates?.length)return false;
    let state=customSoundState[name];
    if(state?.failed)return false;
    if(!state)state=customSoundState[name]={index:0,url:null,failed:false};
    while(state.index<cfg.candidates.length){
      state.url=cfg.candidates[state.index];
      try{
        const audio=new Audio(state.url);audio.preload='auto';audio.volume=clamp(masterVolume(volume),0,1);
        const markFailed=()=>{if(state.url===cfg.candidates[state.index])state.index++;};
        audio.addEventListener('error',markFailed,{once:true});
        const playResult=audio.play();
        if(playResult&&typeof playResult.catch==='function')playResult.catch(()=>{state.index++;});
        return true;
      }catch(_){state.index++;}
    }
    state.failed=true;return false;
  }
  function playSfx(name,fallback,customVolume=1){
    const settings=soundSettings();
    if(settings.masterVolume<=0||muted)return;
    if(settings.soundPack==='custom'&&playCustomSound(name,customVolume))return;
    ensureAudio();fallback();
  }
  const sfx={
    roll(){playSfx('roll',()=>tone(240,.07,"square",.03,420),.8)},
    step(){playSfx('step',()=>tone(220+random()*60,.045,"triangle",.02),.55)},
    hit(){playSfx('hit',()=>tone(130,.1,"sawtooth",.045,75),1)},
    crit(){playSfx('crit',()=>tone(700,.12,"triangle",.05,1200),1)},
    coin(){playSfx('coin',()=>tone(700,.09,"sine",.035,1100),.85)},
    heal(){playSfx('heal',()=>tone(420,.16,"sine",.035,760),.75)},
    lose(){playSfx('lose',()=>tone(180,.4,"sawtooth",.04,60),.9)},
    level(){playSfx('level',()=>{[523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,.12,"triangle",.04),i*90));},.95)},
    win(){playSfx('win',()=>{[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.13,"triangle",.045),i*85));},1)},
    holy(){playSfx('holy',()=>{[392,523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.23,"sine",.045),i*115));},1)}
  };

  function applyTalentBonuses(){
    const rank=talentRank;
    if(rank("roadborn")){player.maxHp+=5;player.hp+=5;player.attack+=2;player.defense+=2;}
    player.maxHp+=rank("survival_vitality")*4;player.hp+=rank("survival_vitality")*4;
    player.potions+=rank("survival_prepared");
    player.defense+=rank("survival_armor");
    player.potionPower+=rank("survival_alchemy")*.50;
    player.doublePotionTurn=rank("survival_double_dose")>0;
    player.postFightHeal+=rank("survival_recovery")*2;
    player.dodge+=rank("survival_dodge")*.02;
    player.revives+=rank("survival_revive");

    player.attack+=rank("power_attack");
    player.crit+=rank("power_crit")*.02;
    player.bossDamage+=rank("power_boss")*.10;
    player.ultimateCharge=rank("power_ultimate_start")*10;
    const flow=1+rank("power_ultimate_flow")*.10;
    player.ultimateAttackGain=Math.round(player.ultimateAttackGain*flow);player.ultimateGuardGain=Math.round(player.ultimateGuardGain*flow);
    player.lifeSteal+=rank("power_lifesteal")*.02;
    player.doubleStrike+=rank("power_echo")*.03;
    player.ultimateDamageBonus+=rank("power_apex")*.15;

    player.goldBonus+=rank("fortune_gold")*.05;
    player.gold+=modifiedGold(window.DiceboundEventRewards.goldBaseFor("talentRank",player.level,rank("fortune_gold")));
    player.shopDiscount+=rank("fortune_discount")*.05;
    player.blessingBonus+=rank("fortune_blessing");
    player.luck+=rank("fortune_luck")*.03+rank("fortune_impossible")*.04;

    player.legacyXpBonus+=rank("legacy_xp")*.10;
    player.fastTravelBonus+=rank("legacy_travel");
    player.xpBonus+=rank("legacy_scholar")*.10;

    player.petDamageBonus+=rank("companion_damage")+rank("companion_ascendant")*2;
    player.petDoubleChance+=rank("companion_double")*.07;
    player.cookieBondBonus+=rank("companion_bond");
    player.postFightHeal+=rank("companion_recovery");

    player.elementProcBonus+=rank("element_attunement")*.03;
    player.elementDamageBonus+=rank("element_power")*.08;
    player.weaknessElementBonus+=rank("element_weakness")*.12;
    player.elementProcBonus+=rank("element_weakness")*.04;
    player.elementEchoChance+=rank("element_echo")*.05;
    player.elementUltimateGain+=rank("element_conduit")*6;

    const p=DB_PRESTIGE.statTotals(meta.prestige||defaultPrestige());
    player.maxHp+=p.maxHp*3;player.hp+=p.maxHp*3;player.attack+=p.attack;player.defense+=p.defense;
    player.crit+=p.crit*.01;player.dodge+=p.dodge*.01;player.luck+=p.luck*.02;player.lifeSteal+=p.lifeSteal*.01;
  }
  function refreshTile(index){
    const tile=tiles[index],el=tileEls[index];if(!tile||!el)return;
    const [icon,label]=dbBoardPresentation.tileMeta(tile,{ready:dbTileMetaFinalReady});
    el.className=dbBoardPresentation.tileClassName(tile,{current:index===player.position});
    el.innerHTML=`<span class="tile-number">${index+1}</span><span class="tile-icon">${icon}</span><span class="tile-label">${label}</span>`;
    dbMerchant?.bindRoadTileInteraction?.(el,tile,index);
  }
  function refreshBoardHighlights(){
    tileEls.forEach((el,i)=>dbBoardPresentation.applyTileState(el,tiles[i],{current:i===player.position}));
  }
  function placePawn(hop=true){
    const tile=tileEls[player.position],wrap=$("boardWrap");if(!tile||!wrap)return;
    const tr=tile.getBoundingClientRect(),wr=wrap.getBoundingClientRect(),pawn=$("pawn");
    pawn.style.left=`${tr.left-wr.left+tr.width/2}px`;pawn.style.top=`${tr.top-wr.top+tr.height/2}px`;
    if(hop){pawn.classList.add("hop");setTimeout(()=>pawn.classList.remove("hop"),150);}
  }

      function petDamage(){if(dbCombat)return dbCombat.petDamage();const talentBonus=gameStarted?player.petDamageBonus:talentRank("companion_damage")+talentRank("companion_ascendant")*2;return 1+Math.ceil((dbPets.activeState()?.level||1)*.8)+talentBonus;}
  function updateMetaUI(){
    const pet=dbPets.activeState(),def=dbPets.activeDefinition();
    $("talentPointTop").textContent=meta.points;
    $("petAvatar").textContent=def.icon;$("petName").textContent=def.name;$("combatPet").textContent=def.icon;$("petCookies").textContent=meta.petCookies;
    $("petStats").textContent=`Level ${pet.level} · ${petDamage()} ${def.id==="neutral"?"random core-element":def.element?ELEMENTS[def.element].name:"neutral"} damage · ${pet.xp} / ${pet.xpNext} bond`;
    $("feedPetBtn").disabled=meta.petCookies<=0;$("feedAllPetBtn").disabled=meta.petCookies<=0;
  }
  function rawDodgeChance(){return Math.max(0,player.dodge+player.defense*player.defenseDodgeScale);}
  function effectiveDodgeChance(){const raw=rawDodgeChance(),base=raw/(1+raw);return dbClasses.identityDodgeAdjustments(dbClasses.legacyMonkDodge(base));}
  function addLog(text){dbDebugLogSink?.log('events','adventure',String(text).replace(/<[^>]*>/g,''),dbDebugLogSink.state());const p=document.createElement("p");p.innerHTML=text;$("log").prepend(p);}
  function addCombatHistory(text){dbDebugLogSink?.log('detailed','combat-history',text,dbDebugLogSink.state());const box=$("combatHistory");if(!box)return;const p=document.createElement("p");p.textContent=text;box.appendChild(p);box.scrollTop=box.scrollHeight;}
  function setCombatText(text,record=true){dbDebugLogSink?.log('detailed','combat-text',text,dbDebugLogSink.state());$("combatText").textContent=text;if(record)addCombatHistory(text);}
  const toastQueue=[];let toastActive=false;
  function showToast(text,duration=1900,isUnlock=false){const value=String(text??''),procToast=Object.values(ELEMENTS).some(e=>value.startsWith(`${e.icon} ${e.spell}`))||/^☢️\s*-?\d+\s*DEF/.test(value);if(procToast)return;toastQueue.push({text,duration,isUnlock});if(!toastActive)showNextToast();}
  function showNextToast(){const t=$("toast"),entry=toastQueue.shift();if(!entry){toastActive=false;t.classList.remove("show","unlock-toast");return;}toastActive=true;t.textContent=entry.text;t.classList.toggle("unlock-toast",!!entry.isUnlock);t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{t.classList.remove("show");setTimeout(showNextToast,170);},entry.duration);}

  let dbReturnToRoadTraceReady=false,dbReturnToRoadSafetyReady=false,dbReturnToRoadStoneReady=false,dbReturnToRoadFriendReady=false;
function returnToRoad(...args){
  if(dbReturnToRoadFriendReady){dbClasses.invokerResetCombat();dbFriendClearCombatPresentation();}
  if(dbReturnToRoadSafetyReady&&!currentEnemy)combatBusy=false;
  const core=()=>{if(pendingLevelUps>0)dbPowerups.openLevelUp();else{rollLocked=false;updateHUD();}};
  const result=dbReturnToRoadTraceReady?v25TraceCommand('returnToRoad',core,'detailed',args,this):core();
  if(dbReturnToRoadSafetyReady&&!currentEnemy)combatBusy=false;
  if(dbReturnToRoadStoneReady&&!currentEnemy)v26ClearStoneBattle();
  return result;
}

  function livingEnemies(){return currentEnemies.filter(e=>e.hp>0);}
  function setCurrentEnemy(index){
    if(!currentEnemies.length){currentEnemy=null;return;}
    const safe=currentEnemies[index]?.hp>0?index:currentEnemies.findIndex(e=>e.hp>0);currentEnemyIndex=safe<0?0:safe;currentEnemy=currentEnemies[currentEnemyIndex]||null;dbCombatView.renderEnemyParty();updateCombatUI();
  }
    function describeCurrentUltimate(classId=player.classId){
    const definition=CLASSES[classId];
    return DB_EFFECTIVE_STATS.describeUltimate(classId,definition,player,{setDamageBonus:v19SetDamageBonus(),rageActive:classId==="berserker"&&classIdentityActive("berserker")});
  }
  function animateClassAttack(mode="normal",options={}){return dbCombatView.playerAttack(mode,options);}
  function chargeUltimate(amount){player.ultimateCharge=clamp(player.ultimateCharge+amount,0,100);updateCombatUI();}

  async function animateUltimate(){
    const fx=$("attackFx"),enemy=$("enemyIcon");fx.className="attack-fx";void fx.offsetWidth;
    if(classIdentityActive("ouroboros")){
      fx.textContent="♾️🐍☠️";fx.classList.add("ultimate-ouroboros");sfx.holy();await delay(760);enemy.classList.add("enemy-hit");await delay(190);enemy.classList.remove("enemy-hit");return;
    }
    fx.textContent=({fighter:"⚔️",ranger:"➶➶➶➶",sorcerer:"☄️",monk:"👊👊👊👊",clown:"🎪🐔💥",rouge:"🌹🩸",berserker:"🌋🪓",turtle:"🐚💥",frog:"🐸🐸🐸",d20:"🎲20!",slime:"🟢🌊",vampire:"🌑🩸🦇",ninja:"🌘🗡️🗡️",ceo:"📉💥",merchant:"🏦🪙⚖️",cleric:"☀️✝️",paladin:"⚜️🛡️",beastmaster:"🐺🐾🐺",rogue:"💎🗡️"}[player.classId]||"💥");
    fx.classList.add(`ultimate-${player.classId}`);sfx.holy();await delay(({sorcerer:760,monk:690,clown:790,rouge:730,berserker:760,cleric:720,paladin:720,beastmaster:760,rogue:690}[player.classId]||620)+ALPHA_COMBAT_DELAY);enemy.classList.add("enemy-hit");await delay(190);enemy.classList.remove("enemy-hit");
  }
    function damageAll(amount,falloff=1){let total=0;livingEnemies().forEach(e=>{total+=damageEnemy(e,amount*(e===currentEnemy?1:falloff));});return total;}
    function triggerStrikeElements(target,chaos=null){
    const results=[];const weapon=dbCombat.triggerWeaponElement(target);if(weapon)results.push(weapon);
    Object.entries(player.classElementProcs||{}).forEach(([key,chance])=>{const times=rollTieredProc(chance);for(let i=0;i<times;i++){const r=dbCombat.element(key,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"class affinity"});if(r)results.push(r);}});
    Object.entries(player.equipmentElementProcs||{}).forEach(([key,chance])=>{const times=rollTieredProc(chance);for(let i=0;i<times;i++){const r=dbCombat.element(key,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"equipment intrinsic"});if(r)results.push(r);}});
    const omniTimes=rollTieredProc(player.omniElementChance||0);for(let n=0;n<omniTimes;n++)ELEMENT_KEYS.forEach(key=>{const r=dbCombat.element(key,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"Prismatic Accident"});if(r)results.push(r);});
    if(chaos?.forceElement){const r=dbCombat.element(chaos.forceElement,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"d20"});if(r)results.push(r);}
    if(chaos?.allElements)DIBO_ELEMENTS.forEach(key=>{const r=dbCombat.element(key,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"natural twenty"});if(r)results.push(r);});
    return {totalDamage:results.reduce((n,r)=>n+(r.totalDamage||0),0),heal:results.reduce((n,r)=>n+(r.heal||0),0),message:results.map(r=>r.message).join(" ")};
  }

    function applyMythicPantsPulse(){
    if(!hasMythicPiece("legs"))return "";player.mythicActionCount++;if(player.mythicActionCount%3)return "";
    const heal=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.06)));player.hp+=heal;player.ultimateCharge=clamp(player.ultimateCharge+15,0,100);const note=`👖 Paradox Loop restores ${heal} HP and grants 15 ultimate.`;addCombatHistory(note);showToast("👖 Paradox Loop");return note;
  }

  function rollTieredProc(chance){const guaranteed=Math.floor(Math.max(0,chance)),fraction=Math.max(0,chance-guaranteed);return guaranteed+(random()<fraction?1:0);}

  let dbCombatElementResolution=null;
  let dbCombatHealingResolution=null;
  let dbConsumablesResolution=null;
  let dbCombatVictoryResolution=null;
  let dbCombatAttackResolution=null;

  function handlePlayerDeath(){
    if(player.hp<=0&&db060HasEffect('last_stand')&&!player._db060LastStandUsed){player._db060LastStandUsed=true;player.hp=Math.max(1,Math.ceil(player.maxHp*.25));player.combatShield=(player.combatShield||0)+3;combatBusy=false;addCombatHistory('❤️‍🔥🛡️ Last Stand refuses death: 25% HP and 3 Barriers.');showToast('❤️‍🔥 LAST STAND',2400,true);updateCombatUI();return;}
    if(player.hp<=0&&player.secondSun&&!player.secondSunUsedBoards?.[boardLevel]){player.secondSunUsedBoards=player.secondSunUsedBoards||{};player.secondSunUsedBoards[boardLevel]=true;player.hp=1;combatBusy=false;sfx.holy();const target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0];let holy="";if(target){const r=dbCombat.element("light",target,{forced:true,source:"Second Sun"});holy=r?.message||"Holy erupts across the pack.";}addLog(`<b>Second Sun!</b> Death is refused on Board ${boardLevel}.`);setCombatText(`☀️☀️ Second Sun returns you at 1 HP. ${holy}`);updateCombatUI();if(!livingEnemies().length)return dbCombat.win();return;}
    if(player.revives>0){player.revives--;player.hp=Math.max(1,Math.ceil(player.maxHp*.5));combatBusy=false;sfx.holy();addLog("A <b>Phoenix Feather</b> drags you back from death.");setCombatText(`You revive at ${player.hp} HP. Phoenix feathers remaining: ${player.revives}.`);updateCombatUI();return;}
    loseGame();if(player.hp<=0)db0511RestoreEnemyElementDebuffs();
  }

  function currentGoldSnapshot(){return DB_EFFECTIVE_STATS.goldSnapshot(player,{nightmare:nightmareMode});}
  function modifiedGold(base){return DB_EFFECTIVE_STATS.scaleGold(base,player,{nightmare:nightmareMode});}

  function grantXp(amount){const result=ProgressionState.grantXp(amount);ProgressionUI.render(result);dbProgression.recordVitals({previousHp:player.hp,currentHp:player.hp,previousGold:player.gold,currentGold:player.gold,classId:player.classId,level:player.level});dbProgression.checkDynamicClassUnlocks();saveMeta();return result;}
  function forceLevels(count){const result=ProgressionState.forceLevels(count);ProgressionUI.render(result);return result;}

  function recordRunBuff(icon,name,desc,rarity="special",source="Road",powerupId=null){
    if(!player.runBuffs)player.runBuffs=[];
    player.runBuffs.push({icon,name,desc,rarity,source,...(powerupId?{powerupId}: {})});
  }
  function runBuffDescription(buff){
    if(buff?.powerupId){
      const powerup=upgrades.find(up=>up.id===buff.powerupId);
      if(powerup)return dbPowerups.describe(powerup);
    }
    return buff?.desc||"";
  }
  function applyUpgrade(up,source="Powerup"){return dbPowerups.apply(up,source);}

  function choiceHTML(up){
    inferUpgradeTags(up);
    const signature=up?.id==='perfected_signature',art=window.DiceboundAssets?.resolvePowerupArtFor?.(up);
    const icon=art?.image?`<img class="db-art-icon db-art-choice" src="${art.image}" alt="${String(art.alt||up.name||'Powerup').replace(/"/g,'&quot;')}">`:up.icon;
    return `<span class="rarity-badge">${rarityInfo[up.rarity].label}</span><span class="choice-icon" data-powerup-id="${up.id}">${icon}</span><span class="choice-name">${up.name}</span><span class="choice-desc${signature?' signature-current':''}">${dbPowerups.describe(up)}</span><span class="choice-tags">${tagChips(up.tags,'power')}</span>`;
  }

  function attachPowerupReroll(grid,reroll){
    if(!grid)return;
    grid.querySelectorAll('.powerup-reroll-btn').forEach(x=>x.remove());
    const total=Math.max(0,Number(player.v26SecondOpinionRank??dbProgression.gameplayTalentRank('fortune_powerup_rerolls'))||0);
    const spent=Math.max(0,Number(player.v26SecondOpinionSpent)||0);
    const remaining=Math.max(0,total-spent);
    player.powerupRerolls=remaining;
    const b=document.createElement('button');
    b.className='powerup-reroll-btn';
    b.disabled=remaining<=0;
    b.textContent=`🔄 Reroll choices · ${remaining} remaining`;
    b.addEventListener('click',()=>{
      if((player.v26SecondOpinionSpent||0)>=total)return;
      player.v26SecondOpinionSpent=(player.v26SecondOpinionSpent||0)+1;
      player.powerupRerolls=Math.max(0,total-player.v26SecondOpinionSpent);
      sfx.roll();
      reroll();
    });
    grid.appendChild(b);
  }

  function renderLevelUpChoices(onComplete=null){
    sfx.level();
    const count=3+(player.levelChoiceBonus?1:0);
    $('levelSubtitle').textContent=pendingLevelUps>1
      ?`Choose 1 of ${count} powerups. ${pendingLevelUps} levels are waiting.`
      :`Choose 1 of ${count} powerups for this run.`;
    const grid=$('choiceGrid');
    grid.innerHTML='';
    dbPowerups.levelChoices().forEach(up=>{
      const btn=document.createElement('button');
      btn.className=`choice-btn ${up.rarity}`;
      btn.innerHTML=choiceHTML(up);
      btn.addEventListener('click',()=>{
        dbPowerups.apply(up,'Level Up');
        pendingLevelUps--;
        addLog(`Level ${player.level}: gained <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);
        showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);
        updateHUD();
        if(pendingLevelUps>0)dbPowerups.openLevelUp(onComplete);
        else{
          $('levelOverlay').classList.add('hidden');
          if(onComplete)onComplete();
          else{rollLocked=false;updateHUD();}
        }
      });
      grid.appendChild(btn);
    });
    attachPowerupReroll(grid,()=>dbPowerups.openLevelUp(onComplete));
    $('levelOverlay').classList.remove('hidden');
  }

  function renderPowerupChoiceOverlay(source,onComplete,filter=()=>true,subtitle='Choose one free rarity-based powerup. Your character level does not change.'){
    $('powerupTitle').textContent=source;
    $('powerupSubtitle').textContent=subtitle;
    const grid=$('powerupGrid');
    grid.innerHTML='';
    dbPowerups.choices(filter).forEach(up=>{
      const btn=document.createElement('button');
      btn.className=`choice-btn ${up.rarity}`;
      btn.innerHTML=choiceHTML(up);
      btn.addEventListener('click',()=>{
        dbPowerups.apply(up,source);
        addLog(`<b>${source}:</b> gained ${up.name} (${rarityInfo[up.rarity].label}).`);
        showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);
        $('powerupOverlay').classList.add('hidden');
        updateHUD();
        onComplete();
      });
      grid.appendChild(btn);
    });

    $('powerupOverlay').classList.remove('hidden');
    attachPowerupReroll(grid,()=>dbPowerups.openChoice(source,onComplete,filter,subtitle));
  }

  function renderLegendaryChoice(source,onComplete=()=>{}){
    if(String(source).toLowerCase().includes('miniboss'))return v27ShowMinibossReward(source,onComplete);
    const legends=eligibleUpgrades(u=>u.rarity==='legendary');
    if(!legends.length){
      const epics=eligibleUpgrades(u=>u.rarity==='epic');
      if(epics.length)return dbPowerups.openChoice(source,onComplete,u=>u.rarity==='epic','Every eligible Legendary is exhausted. Choose an Epic power instead.');
      const gold=modifiedGold(250);
      player.gold+=gold;
      player.potions+=2;
      addLog(`<b>${source}:</b> every eligible Legendary power is already owned this run. The guardian converts the exhausted boon into <b>${gold} gold</b> and <b>2 potions</b>.`);
      showToast(`👑 Legendary pool exhausted · +${gold} gold · +2 potions`,3000,true);
      updateHUD();
      setTimeout(()=>onComplete(false),0);
      return;
    }
    return dbPowerups.openChoice(source,onComplete,u=>u.rarity==='legendary','The guardian yields. Choose one guaranteed Legendary powerup.');
  }

  function openFreePowerup(){
    dbPowerups.openChoice("Power Shrine",()=>{tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);returnToRoad();});
    addLog("A <b>Power Shrine</b> offers a free gift.");
  }

  function useCamp(){const tile=tiles[player.position];if(player.hp>=player.maxHp){tile.cleared=true;tile.type="empty";refreshTile(player.position);const pool=eligibleUpgrades(u=>u.rarity==="common"||u.rarity==="uncommon");if(pool.length){const up=pick(pool);dbPowerups.apply(up,"Campfire Inspiration");sfx.holy();addLog(`<b>Camp:</b> Already fully rested, so the quiet fire grants <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);showToast(`🔥 ${up.name}`);}else{player.maxHp+=5;player.hp+=5;showToast("🔥 +5 max HP");}updateHUD();returnToRoad();return;}const heal=Math.max(1,Math.round(player.maxHp*.38)),actual=Math.min(heal,player.maxHp-player.hp);player.hp+=actual;tile.cleared=true;tile.type="empty";refreshTile(player.position);sfx.heal();addLog(`Rested by the fire and recovered <b>${actual} HP</b>.`);showToast(`Recovered ${actual} HP`);returnToRoad();}

  // Merchant presentation is reached through the subsystem facade.

  function grantLegacyXp(amount){return dbProgression.grantLegacyXp(amount);}

  function talentAvailable(t){return dbProgression.talentAvailable(t);}
  function requirementText(t){return (t.requires||[]).map(r=>{const node=talents.find(x=>x.id===r.id);return `${node?node.name:r.id} rank ${r.rank}`;}).join(" + ");}
    // The extracted owner renders and navigates the Talent destination. These
  // adapters remain because existing lifecycle/composition callers still use

  // #206 / #209: Pet chooser DOM, portrait presentation and persistent Done

  // one forwarding name while pet mechanics remain in this composition layer.

  function renderRunBuffs(){
    const grid=$("buffGrid");grid.innerHTML="";const cls=CLASSES[player.classId],gold=currentGoldSnapshot();
    const addCard=(title,body)=>{const card=document.createElement("div");card.className="buff-card";card.innerHTML=`<h3>${title}</h3>${body}`;grid.appendChild(card);};
    addCard(`${cls.icon} ${cls.name} traits`,`<p>${cls.desc}<br><strong>Ultimate:</strong> ${cls.ultimate.name} — ${describeCurrentUltimate(player.classId)}</p>`);
    const mods=[];
    const push=(label,value)=>{if(value)mods.push(`<strong>${label}:</strong> ${value}`);};
    push("Damage reduction",player.flatReduction);push("Effective Dodge",`${Math.round(effectiveDodgeChance()*100)}% (${Math.round(rawDodgeChance()*100)} raw before diminishing returns)`);push("Revives",player.revives);push("Thorns",player.thorns);push("First-hit barriers",player.firstHitBlocks);push("Post-victory healing",player.postFightHeal);
    mods.push(`<span class="effective-gold-line" tabindex="0" data-effective-gold-container data-tip="${gold.description}" title="${gold.description}"><strong>Gold gain:</strong> <span data-effective-gold>${gold.label}</span></span>`);push("Enemy XP bonus",player.xpBonus?`${Math.round(player.xpBonus*100)}%`:0);push("Boss Damage",player.bossDamage?`${Math.round(player.bossDamage*100)}%`:0);push("Luck",player.luck?Math.round(player.luck*100):0);
    push("Potion healing bonus",player.potionPower?`${Math.round(player.potionPower*100)}%`:0);push("Extra-step chance",player.extraStepChance?`${Math.round(player.extraStepChance*100)}%`:0);push("Ultimate damage",player.ultimateDamageBonus?`+${Math.round(player.ultimateDamageBonus*100)}%`:0);
    push("Ultimate charge",`${player.ultimateAttackGain} attack / ${player.ultimateGuardGain} defend`);push("Pet double attack",player.petDoubleChance?`${Math.round(player.petDoubleChance*100)}%`:0);push("Element proc bonus",player.elementProcBonus?`${Math.round(player.elementProcBonus*100)}%`:0);push("Element power",player.elementDamageBonus?`+${Math.round(player.elementDamageBonus*100)}%`:0);push("Weakness element power",player.weaknessElementBonus?`+${Math.round(player.weaknessElementBonus*100)}%`:0);push("Element echo",player.elementEchoChance?`${Math.round(player.elementEchoChance*100)}%`:0);push("Choose-die chance",player.diceChoiceChance?`${Math.round(player.diceChoiceChance*100)}%`:0);push("Active pet",`${dbPets.activeDefinition().icon} ${dbPets.activeDefinition().name} · ${petDamage()} damage`);push("Overflow scaling","Crit and Echo above 100% create guaranteed additional tiers, with the remainder as the chance for another tier.");
    addCard("📊 Active modifiers",`<p>${mods.length?mods.join("<br>"):"No additional modifiers yet."}</p>`);
    const gear=EQUIPMENT_SLOTS.map(slot=>player.equipment[slot]).filter(Boolean);
    addCard("🧰 Equipment",`<p>${gear.length?gear.map(i=>`<strong>${i.icon} ${i.name}</strong> — ${formatBonuses(i)}`).join("<br>"):"No equipment currently worn."}</p>${mythicalSetCount()>0?`<div class="mythic-set-box"><strong>🌈 Impossible Road set</strong><br>${mythicalSetSummary()}</div>`:""}`);
    const list=document.createElement("div");list.className="buff-card";list.style.gridColumn="1/-1";list.innerHTML=`<h3>✨ Acquired powers this run</h3><div class="buff-list">${(player.runBuffs||[]).length?player.runBuffs.map(b=>`<div class="buff-entry"><b>${b.icon} ${b.name}</b> · ${b.source}<br>${runBuffDescription(b)}</div>`).join(""):'<div class="buff-entry">No selected powerups yet.</div>'}</div>`;grid.appendChild(list);
  }
  function openRunBuffs(){if(!gameStarted)return;renderRunBuffs();$("buffOverlay").classList.remove("hidden");}

    function openDebugMenu(){
    $("debugOverlay").classList.remove("hidden");
    refreshDebugButtons();
    v24RefreshDebugLabels();
    v25EnsureDebugControls();
  }

  function loseGame(){dbCombat.clearBloodOverhealTemp();sfx.lose();$("combatOverlay").classList.add("hidden");showEnd(false);}

  const PUBLIC_SLIME_EXEMPT=new Set(["slime","d20","ceo","merchant"]);

  let merchantFaceClicks=new Set(),merchantFaceTotal=0,merchantBossPrimed=false,merchantBossDefeatedThisBoard=false,merchantBossBattle=false;
  const currentTileCount=()=>db317Board(boardLevel).tiles;
  const currentCols=()=>boardLevel>=4?8:10;
  const currentRows=()=>boardLevel>=4?8:10;
  const currentMinibossTile=()=>db317Board(boardLevel).minibossTile;
  const currentCampTiles=()=>boardLevel>=4?[8,20,44,56]:STATIC_CAMP_TILES;
  const currentPowerupCount=()=>boardLevel>=4?3:POWERUP_TILE_COUNT;
  const currentWheelCount=()=>boardLevel>=4?3:WHEEL_TILE_COUNT;

  function normalizeCareerMeta(raw={}){
    const base=defaultMeta(),pets=defaultPets();
    Object.entries(raw.pets||{}).forEach(([id,state])=>{if(pets[id])pets[id]={...pets[id],...state};});
    const unlocks={...Object.fromEntries(Object.keys(CLASSES).map(id=>[id,id==="ranger"])),...(raw.unlocks||{})};
    const out={...base,...raw,version:15,pets,unlocks,elementProgress:{...base.elementProgress,...(raw.elementProgress||{})},prestige:{...defaultPrestige(),...(raw.prestige||{})},heirlooms:(raw.heirlooms||[]).map(normalizeSavedItem),merchantKills:raw.merchantKills||0,infoSeen:!!raw.infoSeen,board4Clears:raw.board4Clears||0,achievements:{...(raw.achievements||{})}};
    out.xpNext=legacyXpForLevel(out.level||1);out.purchased=normalizePurchased(raw.purchased||{});
    let refund=0;const known=new Map(talents.map(t=>[t.id,t]));
    for(const [id,val] of Object.entries(out.purchased)){const rank=Math.max(0,Number(val)||0),t=known.get(id);if(!t){refund+=rank*2;delete out.purchased[id];continue;}if(rank>t.maxRank){refund+=(rank-t.maxRank)*t.cost;out.purchased[id]=t.maxRank;}}
    out.points=(out.points||0)+refund;
    out.version="Alpha v1";
    window.DiceboundCareerHistory.migrateLegacy(out);
    out.achievements={...(out.achievements||{})};
    return out;
  }
  try{meta=normalizeCareerMeta(meta);}catch(e){meta=normalizeCareerMeta({});}
  saveMeta();
  function dbCareerRunMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
  function dbCareerRunSnapshot(){
    const equipment=Object.entries(player.equipment||{}).filter(([,item])=>!!item).map(([slot,item])=>({slot,id:item.id||item.templateId||item.legendaryId||'',name:item.name||item.id||slot,rarity:item.rarity||'',element:item.element||null}));
    const powerups=Object.entries(player.upgradeCounts||{}).filter(([,count])=>Number(count)>0).map(([id,count])=>({id,count:Number(count)||1}));
    return {
      version:APP_IDENTITY.version,classId:player.classId||selectedClassId||'ranger',mode:dbCareerRunMode(),
      boardReached:Math.max(1,Number(boardLevel)||1),position:Math.max(0,(Number(player.position)||0)+1),
      level:Math.max(1,Number(player.level)||1),gold:Math.max(0,Number(player.gold)||0),petId:meta.activePet||null,
      prestigeCount:Math.max(0,Number(meta.prestige?.count)||0),legacyLevel:Math.max(1,Number(meta.level)||1),
      equipment,powerups,
      finalStats:{
        maxHp:Math.max(0,Number(player.maxHp)||0),hp:Math.max(0,Number(player.hp)||0),
        attack:Math.max(0,Number(player.attack+(player.goldAttackScale?player.gold*player.goldAttackScale:0))||0),
        defense:Math.max(0,Number(player.defense+player.flatReduction)||0),crit:Math.max(0,Number(player.crit)||0),
        dodge:Math.max(0,Number(effectiveDodgeChance())||0),lifeSteal:Math.max(0,Number(player.lifeSteal)||0),
        luck:Math.max(0,Number(player.luck)||0),echo:Math.max(0,Number(player.doubleStrike)||0),bossDamage:Math.max(0,Number(player.bossDamage)||0)
      }
    };
  }

  dbProgression.repairTalentPrerequisites();

      function mythicalSetSummary(){
  const n=mythicalSetCount();
  return `${n}/7 Artifact-tier Impossible Road pieces · `+v24SetTierData().map(t=>`${t.pieces}: ${t.text}`).join(' · ');
}

      let dbTileMetaFinalReady=false;
    function buildBoard(){
    const board=$("board"),cols=currentCols(),rows=currentRows();board.innerHTML="";board.style.gridTemplateColumns=`repeat(${cols},1fr)`;board.style.gridTemplateRows=`repeat(${rows},1fr)`;tileEls=[];tiles.forEach((tile,index)=>{const rowFromBottom=Math.floor(index/cols),indexInRow=index%cols,col=rowFromBottom%2===0?indexInRow:(cols-1-indexInRow),visualRow=rows-rowFromBottom,[icon,label]=dbBoardPresentation.tileMeta(tile,{ready:dbTileMetaFinalReady}),el=document.createElement("div");    el.className=dbBoardPresentation.tileClassName(tile,{current:index===player.position});el.style.gridColumn=String(col+1);el.style.gridRow=String(visualRow);el.innerHTML=`<span class="tile-number">${index+1}</span><span class="tile-icon">${icon}</span><span class="tile-label">${label}</span>`;dbMerchant?.bindRoadTileInteraction?.(el,tile,index);board.appendChild(el);tileEls[index]=el;});requestAnimationFrame(()=>placePawn(false));
  }
  function updateHUD(){
    const cls=CLASSES[player.classId];dbClassPresentation.syncActive(player.classId);$("heroName").textContent=cls.name;$("combatPlayerName").textContent=cls.name;$("combatPet").dataset.name=dbPets.activeDefinition().name;$("levelText").textContent=`Level ${player.level}`;$("hpText").textContent=`${Math.round(player.hp)} / ${Math.round(player.maxHp)}`;$("xpText").textContent=`${player.xp} / ${player.xpNext}`;$("attackText").textContent=Math.round(player.attack+(player.goldAttackScale?player.gold*player.goldAttackScale:0));$("defenseText").textContent=player.defense+player.flatReduction;$("goldText").textContent=player.gold;$("potionText").textContent=player.potions;$("critText").textContent=`${Math.round(player.crit*100)}%`;$("dodgeText").textContent=`${Math.round(effectiveDodgeChance()*100)}%`;$("lifeStealText").textContent=`${Math.round(player.lifeSteal*100)}%`;$("luckText").textContent=`${Math.round(player.luck*100)}`;$("echoText").textContent=`${Math.round(player.doubleStrike*100)}%`;$("bossDamageText").textContent=`${Math.round(player.bossDamage*100)}%`;
    const count=currentTileCount(),mini=currentMinibossTile(),finalName=boardLevel===1?"Dragon":boardLevel===2?"Devourer":boardLevel===3?"Nullstar":"Crown Eater";$("floorText").textContent=`Board ${boardLevel} · ${player.position+1} / ${count}`;$("guardianText").textContent=player.position<mini-1?`Miniboss · tile ${mini}`:`${finalName} · tile ${count}`;$("rollHint").textContent=`High rolls grant Fast Travel XP. The halfway guardian intercepts any roll that crosses tile ${mini}.`;const ult=cls.ultimate;$("ultimateName").textContent=ult.name;$("ultimateText").textContent=`${Math.round(player.ultimateCharge)} / 100`;$("ultimateFill").style.width=`${clamp(player.ultimateCharge,0,100)}%`;$("hpFill").style.width=`${clamp(player.hp/player.maxHp*100,0,100)}%`;$("xpFill").style.width=`${clamp(player.xp/player.xpNext*100,0,100)}%`;window.DiceboundRunDice?.refreshControls?.();$("potionBtn").disabled=combatBusy||player.potions<=0||player.hp>=player.maxHp;$("outsidePotionBtn").disabled=!gameStarted||rollLocked||!!currentEnemy||player.potions<=0||player.hp>=player.maxHp;$("runBuffBtn").disabled=!gameStarted;dbProgression.checkDynamicClassUnlocks();updateMetaUI();renderEquipment();refreshBoardHighlights();placePawn(false);
  }
  // ---- Road Dice composition ------------------------------------------------
  // Configure the canonical owner before any bootstrap HUD refresh or input
  // binding can ask it for live state. Road-dice gameplay stays in run/dice.js.
  const dbRunDice=window.DiceboundRunDice;
  if(!dbRunDice?.configure)throw new Error("DiceBound requires the run/dice owner before dicebound.js");
  dbRunDice.configure({
    getDocument:()=>document,find:selector=>$(selector),getMeta:()=>meta,getPlayer:()=>player,
    isRollLocked:()=>!!rollLocked,setRollLocked:value=>{rollLocked=!!value;},isGameStarted:()=>!!gameStarted,hasCurrentEnemy:()=>!!currentEnemy,
    ensureAudio:()=>ensureAudio(),resumeAudio:()=>{if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();},updateHud:()=>updateHUD(),
    pick:list=>pick(list),rollSound:()=>sfx.roll(),delay:ms=>delay(ms),rand:(min,max)=>rand(min,max),random:()=>random(),
    clamp:(value,min,max)=>clamp(value,min,max),incrementRolls:()=>{rolls++;},
    hasMythicPiece:id=>hasMythicPiece(id),showToast:(...args)=>showToast(...args),addLog:html=>addLog(html),
    traceCommand:(name,fn)=>v25TraceCommand(name,fn,name==="rollDice"||name==="rollTwoDice"?"events":"detailed"),move:(...args)=>dbRun.move(...args)
  });
  dbRunDice.bindPrimaryButton();dbRunDice.ensureButton();
  window.DiceboundCamp.configureShell({refreshDoubleDiceControls:()=>dbRunDice.refreshControls()});

  function startCombat(kind="normal"){return dbCombat.startEncounter(kind);}
  function damageEnemy(enemy,amount,ignoreDefense=false){
    const adjusted=dbClasses.ninjaExecutionDamage(amount,ignoreDefense);
    amount=dbClasses.berserkerDamage(adjusted.amount);
    ignoreDefense=adjusted.ignoreDefense;
    let dealt=0,blocked=false;
    if(enemy&&enemy.hp>0){
      if(enemy.enemyBarrier>0&&!ignoreDefense){
        enemy.enemyBarrier--;
        blocked=true;
        addCombatHistory(`${enemy.name}'s merchant barrier cancels the hit. ${enemy.enemyBarrier} remain.`);
      }else{
        const raw=Math.max(0,Math.round(amount));
        const actual=Math.max(raw>0?1:0,raw-(ignoreDefense?0:(enemy.defense||0)));
        dealt=Math.min(enemy.hp,actual);
        enemy.hp-=dealt;
      }
    }
    const enemyIndex=currentEnemies.indexOf(enemy);
    if(enemyIndex>=0){
      const target={unit:'enemy',enemy,enemyIndex};
      if(blocked)dbCombatView.floatCombatText?.({kind:'blocked',target,label:'Barrier'});
      else if(dealt>0)dbCombatView.floatCombatText?.({kind:'damage',amount:dealt,target});
    }
    if(gameStarted&&dealt>0)dbProgression.recordDamageDealt(dealt);
    if(player._v25CroakHitsRemaining>0){
      player._v25CroakHitsRemaining--;
      const rank=dbProgression.gameplayTalentRank('monk_flow_ceiling'),chance=rank*.05;
      if(enemy?.hp>0&&rank>0&&random()<chance){
        enemy.poisonStacks=(enemy.poisonStacks||0)+1;
        addCombatHistory(`🐸☠️ Croak Cascade leaves 1 Poison stack (${Math.round(chance*100)}% from Endless Form rank ${rank}).`);
      }
    }
    return dealt;
  }
  function openLoot(item,callback){if(!dbEquipmentPrepareLoot(item,callback))return;pendingLootItem=item;pendingLootCallback=callback;return dbEquipmentUi.renderLoot(item);}

    function applyRunTheme(){
  const themeByBoard={
    1:{bg1:"#071b0d",bg2:"#031008",glow1:"rgba(82,220,118,.24)",glow2:"rgba(175,255,116,.11)",board1:"#173c20",board2:"#0a2111"},
    2:{bg1:"#1c1708",bg2:"#0c0b05",glow1:"rgba(255,217,123,.23)",glow2:"rgba(137,193,255,.14)",board1:"#43371a",board2:"#1d1910"},
    3:{bg1:"#2a0709",bg2:"#120305",glow1:"rgba(255,67,76,.25)",glow2:"rgba(255,130,57,.12)",board1:"#5c171b",board2:"#2b090c"},
    4:{bg1:"#221109",bg2:"#0d0604",glow1:"rgba(255,118,62,.26)",glow2:"rgba(164,47,36,.16)",board1:"#4f2416",board2:"#20100a"},
    5:{bg1:"#140721",bg2:"#06020d",glow1:"rgba(189,98,255,.28)",glow2:"rgba(87,130,255,.16)",board1:"#351048",board2:"#13061d"},
    6:{bg1:"#03050d",bg2:"#000104",glow1:"rgba(71,92,255,.30)",glow2:"rgba(210,55,255,.17)",board1:"#111947",board2:"#070a1d"}
  };
  const rootStyle=document.documentElement.style,theme=themeByBoard[boardLevel]||themeByBoard[1],scene=window.DiceboundAssets?.resolveBoardBackground?.(boardLevel),sceneUrl=scene?.image?`url("${scene.image}")`:'none';
  for(const [key,value] of Object.entries(theme))rootStyle.setProperty(`--run-${key.replace(/([A-Z])/g,'-$1').toLowerCase()}`,value);
  rootStyle.setProperty("--run-scene-image",sceneUrl);
  rootStyle.setProperty("--run-scene-focus",scene?.focus||"50% 50%");
  const sceneEl=$("boardSceneBg");
  if(sceneEl){
    if(scene?.image&&sceneEl.getAttribute('src')!==scene.image)sceneEl.setAttribute('src',scene.image);
    sceneEl.style.objectPosition=scene?.focus||"50% 50%";
    sceneEl.dataset.board=String(boardLevel||1);
  }
  document.body?.setAttribute('data-board-level',String(boardLevel||1));
  dbBeta01SyncDifficultyAtmosphere();
  beta04SyncWorldScene();
}

  function openInfo(){return dbInfoGuide?.open();}
  function renderInfo(){return dbInfoGuide?.render();}
  function activateInfoTab(name='guide'){return dbInfoGuide?.activateTab(name);}
  function openCareer(tab='overview'){return dbCareerUi?.open(tab);}

  function prestigeSummary(){return dbProgression.prestigeInspect().permanentSummary;}

  function openStartScreen(){gameStarted=false;rollLocked=true;if(!dbProgression.isClassUnlocked(selectedClassId))selectedClassId="ranger";["combatOverlay","levelOverlay","eventOverlay","wheelOverlay","powerupOverlay","merchantOverlay","blessingOverlay","mysticOverlay","lootOverlay","endOverlay","talentOverlay","prestigeMoonOverlay","buffOverlay","prestigeHeirloomOverlay","petCollectionOverlay","diceChoiceOverlay","debugOverlay","bloodwellOverlay","gamblerOverlay","achievementOverlay","careerOverlay"].forEach(id=>$(id)?.classList.add("hidden"));$("startOverlay").classList.remove("hidden");window.DiceboundClassChooser.render();updateMetaUI();}
  async function db068ConfirmEchoForRun(){
    const warning=dbProgression.crucibleWarning({classId:selectedClassId,randomClass:!!window.DiceboundClassChooser?.isRandomMode?.()});
    if(!warning)return true;
    return diceboundConfirm(`${warning}\n\nStart the run anyway?`,{title:'Echo Crucible compatibility',confirmLabel:'Start anyway'});
  }
  async function startNewGame(options={}){
    if(!(await db068ConfirmEchoForRun()))return false;
    return dbRun.startFreshRun(options);
  }
  function showEnd(victory){dbRunClearCheckpoint();rollLocked=true;gameStarted=false;const earned=dbProgression.finalizeRun({outcome:victory?'victory':'death',boardReached:boardLevel});updateHUD();$("endArt").textContent=victory?"🏆":"☠️";$("endTitle").textContent=victory?"Victory!":"Your journey ends";$("endTitle").className=victory?"victory-title":"danger-title";$("endText").textContent=victory?`You defeated all four final guardians and conquered the 364-tile ${nightmareMode?"Nightmare ":""}journey.`:`The road claimed the adventurer, but every crossed tile strengthened the Legacy.`;$("endLevel").textContent=player.level;$("endGold").textContent=player.gold;$("endTurns").textContent=rolls;$("endLegacyXp").textContent=earned;$("endGoldLegacyXp").textContent=lastGoldLegacyAward;dbEquipmentUi.renderEndGear();$("endOverlay").classList.remove("hidden");}

    dbPowerups.configure({
    getPlayer:()=>player,getMeta:()=>meta,getRarityInfo:()=>rarityInfo,achievementGateUnlocked:gate=>dbProgression.achievementGateUnlocked(gate),
    slimeIdentityActive:()=>classIdentityActive("slime"),
    slimePowerCompatible:u=>{const unlocked=["slime",...Object.keys(CLASSES).filter(id=>id!=="slime"&&dbProgression.isClassUnlocked(id))],tags=inferUpgradeTags(u),caps=new Set(classMechanicsFor("slime"));return dbPowerups.ownershipAllowed(u,"slime",unlocked)&&!tags.includes("ultimate")&&db32PowerMechanicsCompatible(u,caps);},
    slimeRougePowerCompatible:u=>v318SlimeRougePowerCompatible(u),
    cascadeLuckRows:(rows,luck,progression)=>DB_RARITIES.cascadeLuckRows(rows,luck,progression),
    isPowerupRarityAtLeast:(rarity,floor)=>DB_RARITIES.isPowerupRarityAtLeast(rarity,floor),
    getBoardLevel:()=>boardLevel,currentTileCount:()=>currentTileCount(),random:()=>random(),rand:(min,max)=>rand(min,max),pick:list=>pick(list),clamp:(value,min,max)=>clamp(value,min,max),
    classIdentityActive:id=>classIdentityActive(id),hasLegendaryEffect:id=>db060HasEffect(id),saveMeta:()=>saveMeta(),addLog:html=>addLog(html),showToast:(...args)=>showToast(...args),
    checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks(),recordRunBuff:(...args)=>recordRunBuff(...args),recordPowerupTaken:()=>{dbProgression.recordPowerupTaken();saveMeta();},syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),
    isNightmare:()=>!!nightmareMode,isHell:()=>!!hellMode,isGameStarted:()=>!!gameStarted
  });
  function eligibleUpgrades(filter=()=>true){return dbPowerups.eligible(filter);}

  function dbClassUnlockFacts(){meta.classUnlockFacts=DB_CLASS_UNLOCK_RULES.normalizeFacts(meta.classUnlockFacts||{});return meta.classUnlockFacts;}
  function dbClassUnlockContext(){
    const stats=dbProgression.careerStats(),facts=dbClassUnlockFacts(),petIds=Object.keys(PETS),petLevels={},petUnlocked={},classIds=Object.keys(CLASSES),classSecret={};
    petIds.forEach(id=>{petLevels[id]=meta.pets?.[id]?.level||1;petUnlocked[id]=!!meta.pets?.[id]?.unlocked;});
    classIds.forEach(id=>classSecret[id]=!!CLASSES[id]?.secret);
    const currentPlayer=player||{};
    return {
      classIds,classSecret,persistedUnlocks:meta.unlocks||{},bloodmageUnlocked:!!meta.bloodmageUnlocked,
      prestigeCount:Number(meta.prestige?.count)||0,damageTaken:Number(meta.damageTaken)||0,merchantKills:Number(meta.merchantKills)||0,
      stats:{healingDone:Number(stats.healingDone)||0,highestGold:Number(stats.highestGold)||0,potionsUsed:Number(stats.potionsUsed)||0},
      storedHighestGold:Number(stats.highestGold)||0,highestGold:Math.max(Number(stats.highestGold)||0,gameStarted?(Number(currentPlayer.gold)||0):0),facts,
      petIds,petLevels,petUnlocked,gameStarted:!!gameStarted,
      player:{gold:Number(currentPlayer.gold)||0,defense:Number(currentPlayer.defense)||0,doubleStrike:Number(currentPlayer.doubleStrike)||0,lifeSteal:Number(currentPlayer.lifeSteal)||0,crit:Number(currentPlayer.crit)||0,bossDamage:Number(currentPlayer.bossDamage)||0},
      hasBoardClear:(classId,board)=>dbProgression.hasBoardClear(classId,board)
    };
  }

  function playElementAnimation(key,target=currentEnemy,enemySource=false){
    if(key==='fire'||key==='gun'||key==='donut'||key==='math'||dbCombatView.suppressLegacyElementAnimation(key))return false;
    const head=document.querySelector("#combatOverlay .combat-head");if(!head||!ELEMENTS[key])return;
    const el=document.createElement("div");el.className=`element-proc-fx ${key}`;
    const art={fire:"🔥☄️",ice:"❄️✳️",electric:"⚡⚡",light:"✨☀️",void:"🕳️🌑",nature:"🌿🪴",donut:"🍩🍩🍩",tech:"🤖📡",metal:"🤘🎸",coffee:"☕💨",gun:"🔫💥"}[key]||ELEMENTS[key].icon;
    el.textContent=enemySource?`${ELEMENTS[key].icon} ${art}`:art;head.appendChild(el);setTimeout(()=>el.remove(),850);
  }

      function updateCombatUI(){const result=dbCombatView.update();updateHUD();return result;}

  // #309: enemy scaling/difficulty now has one authoritative owner.
  let dbEnemyScalingResolution=null;
  function scaleEnemy(...args){return dbCombat.scaleEnemy(...args);}

  function applyPoisonTick(){
    let total=0,notes=[];for(const e of livingEnemies()){const stacks=e.poisonStacks||0;if(!stacks)continue;const dmg=Math.max(1,Math.round(player.attack*(player.poisonStackPower||.12)*stacks));const dealt=damageEnemy(e,dmg,true);total+=dealt;notes.push(`${e.name}: ${dealt} (${stacks} stack${stacks===1?"":"s"})`);}
    if(total){playElementAnimation("nature",currentEnemy,false);setCombatText(`☠️ Poison ticks — ${notes.join(" · ")}.`);updateCombatUI();}return total;
  }

  // combat/turn-resolution.js. These lexical adapters stay mutable so the

  // a second production owner.
  let dbCombatStrikes=null;
  let dbCombatUltimateResolution=null;
  let dbCombatGuardResolution=null;
  let dbCombatPetTurnResolution=null;
  let dbCombatEncounterLifecycle=null;
  let dbCombatD20ChaosResolution=null;
  let dbCombatConfusionResolution=null;
  let dbCombatTurns=null;
    async function resolveEnemyResponse(...args){return dbCombat.enemyResponse(...args);}
  function applyCombatPlayerDamage(raw){return dbCombat.applyPlayerDamage(raw);}

  function resetPlayer(classId=selectedClassId){return dbRun.initializePlayer(classId);}

  function debugAction(action){

    if(action==='unlock_hell'){
      meta.nightmareUnlocked=true;meta.hellUnlocked=true;saveMeta();
      try{window.DiceboundClassChooser.render();}catch(_){}
      showToast('🔥 Hell Mode unlocked (debug)');
      return;
    }

    if(action==='kill_character_v26'){
      if(!gameStarted){showToast('Start a run first');return;}
      $('debugOverlay')?.classList.add('hidden');
      const damage=Math.max(1,Math.ceil(player.hp+player.maxHp));
      meta.damageTaken=(meta.damageTaken||0)+damage;player.hp=0;
      addLog('<b>Debug monster</b> deals lethal damage. Running the normal death/revive pipeline.');
      showToast('☠️ Debug monster attacks');handlePlayerDeath();updateHUD();return;
    }
    const artifactSlots={mythic_weapon:'weapon',mythic_offhand:'offhand',mythic_boots:'boots',mythic_legs:'legs',mythic_amulet:'amulet',mythic_hat:'hat',mythic_ring:'ring'};
    if(artifactSlots[action]){
      if(!gameStarted){showToast('Start a run first');return;}
      const item=dbArtifacts.create(artifactSlots[action]);dbItems.equip(item,true);renderEquipment();updateHUD();showToast(`Artifact ${SLOT_LABELS[item.slot]} added`);return;
    }
    if(action==='mythic'){
      if(!gameStarted){showToast('Start a run first');return;}
      ['weapon','offhand','boots','legs','amulet','hat','ring'].forEach(slot=>dbItems.equip(dbArtifacts.create(slot),true));
      renderEquipment();updateHUD();showToast('Full current seven-piece Artifact set equipped');return;
    }

    v25Log('events','debug',`debugAction(${action})`,v25State());
    if(['legend_mug_v25','legend_headphones_v25','legend_jacket_v25','omega_horns_v25'].includes(action)){
      if(!gameStarted){showToast('Start a run first');return;}
      const item=action==='legend_mug_v25'?generateAxelsCoffeeMug():action==='legend_headphones_v25'?generateKratzHeadphones():action==='legend_jacket_v25'?generateKellysJeanJacket():generateDevilsHorns();
      dbItems.equip(item,true);renderEquipment();updateHUD();showToast(`${item.name} added`);return;
    }
    if(action==='recover_road_v25'){v25RecoverRoadState('manual');return;}

    if(action==='unlockclasses'){
      meta.unlocks=meta.unlocks||{};Object.keys(CLASSES).forEach(id=>meta.unlocks[id]=true);saveMeta();window.DiceboundClassChooser.render();showToast('Debug: all classes unlocked');return;
    }
    if(action==='unlockpets'){
      meta.pets=meta.pets||defaultPets();Object.keys(PETS).forEach(id=>{meta.pets[id]=meta.pets[id]||defaultPetState(false);meta.pets[id].unlocked=true;});
      ELEMENT_KEYS.forEach(k=>meta.elementProgress[k]=Math.max(meta.elementProgress[k]||0,PET_UNLOCK_REQUIREMENT));saveMeta();window.DiceboundPetChooser.render();updateMetaUI();showToast('Debug: all pets unlocked');return;
    }
    if(action==='all_powerups'){
      if(!gameStarted){showToast('Start a run first');return;}
      $('debugOverlay').classList.add('hidden');dbPowerups.openAllEligible('Debug · Full Eligible Powerup List',()=>{});return;
    }

    if(action==="board6"&&gameStarted){boardLevel=6;player.position=0;applyRunTheme();dbRun.generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");updateHUD();showToast("Debug: board6");return;}
    if(action==="double_dice"){meta.doubleDiceUnlocked=true;saveMeta();updateHUD();showToast("Double Dice unlocked");return;}
    if(action==="seed_item"){
      if(!gameStarted){showToast("Start a run first");return;}
      const code=dbRuntime.platform.prompt("Paste a Dicebound v1.5 item seed code (starts with D15|):","");if(code==null)return;
      const item=v15GenerateEquipmentFromSeedCode(code);if(!item){dbRuntime.platform.alert("That seed code is not a valid Dicebound v1.5 ordinary-item seed.");return;}
      $("debugOverlay").classList.add("hidden");openLoot(item,()=>{});return;
    }
    if(action==="alwayschoose"){meta.debugAlwaysChooseRolls=!meta.debugAlwaysChooseRolls;saveMeta();refreshDebugButtons();showToast(`Always choose rolls ${meta.debugAlwaysChooseRolls?"enabled":"disabled"}`);return;}
    if(action==="board5"&&gameStarted){boardLevel=5;player.position=0;applyRunTheme();dbRun.generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");updateHUD();showToast("Debug: board5");return;}
    if(action==="mythicring"&&gameStarted){dbItems.equip(dbArtifacts.create('ring'),true);updateHUD();showToast("Artifact Ring added");return;}
    if(action==="omega_merchant"&&gameStarted){dbItems.equip(generateMerchantWeapon(),true);updateHUD();showToast("The Final Price added");return;}
    if(action==="omega_stone"&&gameStarted){
      dbItems.equip(generatePhilosophersStone(),true);updateHUD();showToast("Philosopher's Stone added");

      // the older handler returned; keep that order exactly once.
      renderEquipment();updateHUD();return;
    }

    // Original debug dispatcher. These actions intentionally fall through to the
    // common meta/HUD refresh and generic toast, exactly as released.
    if(action==="runxp"&&gameStarted)grantXp(250);
    if(action==="level"&&gameStarted)forceLevels(5);
    if(action==="legacy"){for(let i=0;i<5;i++){meta.level++;meta.points++;}meta.xpNext=legacyXpForLevel(meta.level);saveMeta();}
    if(action==="talents"){meta.points+=25;saveMeta();}
    if(action==="gold"&&gameStarted)player.gold+=5000;
    if(action==="cookies"){meta.petCookies+=25;saveMeta();}
    if(action==="heal"&&gameStarted){player.hp=player.maxHp;player.ultimateCharge=100;}
    if(action==="unlock"){Object.keys(CLASSES).forEach(k=>meta.unlocks[k]=true);Object.keys(meta.pets).forEach(k=>meta.pets[k].unlocked=true);saveMeta();window.DiceboundClassChooser.render();}
    if(action==="dibo50"){meta.pets.neutral.level=30;saveMeta();dbProgression.checkDynamicClassUnlocks();}
    if(action==="nightmare"){meta.nightmareUnlocked=true;saveMeta();window.DiceboundClassChooser.render();}
    if(/^board[234]$/.test(action)&&gameStarted){boardLevel=Number(action.slice(-1));player.position=0;applyRunTheme();dbRun.generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");}
    if(action==="boss"&&gameStarted){$("debugOverlay").classList.add("hidden");player.position=currentTileCount()-1;refreshBoardHighlights();placePawn(false);rollLocked=true;dbRun.dispatchTile();}
    updateMetaUI();if(gameStarted)updateHUD();showToast(`Debug: ${action}`);
  }

  const ALPHA_COMBAT_DELAY=200;
  let runTalentSnapshot=null,statsLastHp=null,statsLastGold=null;
  function recordVitals(){
    if(!gameStarted)return;
    dbProgression.recordVitals({previousHp:statsLastHp,currentHp:player.hp,previousGold:statsLastGold,currentGold:player.gold,classId:player.classId,level:player.level});
    statsLastHp=player.hp;statsLastGold=player.gold;
  }


  // Four new public classes. Rouge remains the colour; Rogue is the thief.

  // Class powers and achievement-hidden Legendaries.

  const goldenLaw=upgrades.find(u=>u.id==="legendary_golden_law");if(goldenLaw){}

  // Ranger gets a real tiny portrait instead of only an emoji.
  window.DiceboundCamp.configureShell({recordVitals:()=>recordVitals(),checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks()});

  // Snapshot talent ranks when a run begins; purchases made mid-run stay queued.

  window.DiceboundCamp.configureShell({clearRunTalentSnapshot:()=>{runTalentSnapshot=null;}});

  // Board 4 is now intentionally cruel.

  // Sovereign Relic now actually lets the player choose one of three Legendaries.

  // Stats hooks around existing run lifecycle.

  saveMeta();

  $("startBtn").addEventListener("click",startNewGame);$("nightmareToggle").addEventListener("click",()=>{if(!meta.nightmareUnlocked)return;nightmareMode=!nightmareMode;window.DiceboundClassChooser.render();});$("outsidePotionBtn").addEventListener("click",()=>dbConsumablesResolution.usePotionOutsideCombat());$("attackBtn").addEventListener("click",()=>dbCombat.attack());$("guardBtn").addEventListener("click",()=>dbCombat.guard());$("potionBtn").addEventListener("click",()=>dbConsumablesResolution.usePotion());$("ultimateBtn").addEventListener("click",()=>dbCombat.ultimate());
  $("equipLootBtn").addEventListener("click",()=>{if(!pendingLootItem)return;const current=player.equipment[pendingLootItem.slot];if(current&&dbItems.score(pendingLootItem)<dbItems.score(current)&&!dbRuntime.platform.confirm(`${pendingLootItem.name} appears weaker overall than ${current.name}. Replace it anyway?`))return;dbItems.equip(pendingLootItem);closeLoot();});
  $("sellLootBtn").addEventListener("click",()=>{if(!pendingLootItem)return;const value=dbItems.sellValue(pendingLootItem);player.gold+=value;sfx.coin();addLog(`Sold <b>${pendingLootItem.name}</b> for ${value} gold.`);showToast(`+${value} gold`);updateHUD();closeLoot();});

  $("feedPetBtn").addEventListener("click",()=>dbPets.feed(1));
  $("feedAllPetBtn").addEventListener("click",()=>dbPets.feed(meta.petCookies));
  $("debugTrigger").addEventListener("click",openDebugMenu);$("debugCloseBtn").addEventListener("click",()=>$("debugOverlay").classList.add("hidden"));$("debugGrid").addEventListener("click",e=>{const btn=e.target.closest("[data-debug]");if(btn)debugAction(btn.dataset.debug);});
  $("merchantContinueBtn").addEventListener("click",()=>{tiles[player.position].cleared=false;refreshTile(player.position);$("merchantOverlay").classList.add("hidden");returnToRoad();});
  $("restartBtn").addEventListener("click",async()=>{if(!gameStarted||(await diceboundConfirm("Abandon this run? Traveled tiles will be banked as Legacy XP, but you cannot bind a new heirloom.",{title:"Abandon run?",confirmLabel:"Abandon",danger:true}))){if(gameStarted){const earned=dbProgression.finalizeRun({outcome:'abandoned',boardReached:boardLevel});showToast(`Banked ${earned} Legacy XP`);}openStartScreen();}});
  $("endRestartBtn").addEventListener("click",openStartScreen);$("muteBtn").addEventListener("click",()=>setMuted(!muted));
  $("talentBtn").addEventListener("click",()=>window.DiceboundTalentTree.open());
  $("runBuffBtn").addEventListener("click",openRunBuffs);$("buffCloseBtn").addEventListener("click",()=>$("buffOverlay").classList.add("hidden"));

  window.addEventListener("resize",()=>placePawn(false));

  dbRun.generateBoard();buildBoard();window.DiceboundClassChooser.render();renderEquipment();updateHUD();updateMetaUI();

  // the surface. Keep that timing contract explicit now that openInfo is a

  if(!meta.infoSeen)setTimeout(()=>activateInfoTab("guide"),250);

  let hellMode=false;
  function ensureV11Meta(){
    dbProgression.careerStats();
    meta.hellUnlocked=!!meta.hellUnlocked;
    meta.debugAlwaysChooseRolls=!!meta.debugAlwaysChooseRolls;
    meta.bloodmageUnlocked=!!meta.bloodmageUnlocked;
    meta.bloodmageKills=Number(meta.bloodmageKills)||0;
    meta.merchantOmegaDrops=Number(meta.merchantOmegaDrops)||0;
    meta.bloodmageOmegaDrops=Number(meta.bloodmageOmegaDrops)||0;
    meta.board5Clears=Number(meta.board5Clears)||0;
    meta.unlocks=meta.unlocks||{};
    if(meta.bloodmageUnlocked)meta.unlocks.bloodmage=true;
    return meta;
  }
  ensureV11Meta();
  random();

  function tagChips(tags,kind="power"){return (tags||[]).map(t=>`<span class="tag-chip ${kind}-tag">${t}</span>`).join("");}

  function inferUpgradeTags(up){
    if(up.tags)return up.tags;
    const tags=[];const txt=`${up.name} ${up.desc} ${up.id}`.toLowerCase();
    if(up.classId)tags.push(...(CLASSES[up.classId]?.tags||[]));
    if(/ultimate|charge|storm|reckoning|judgment|cascade|larceny|eclipse|deluge|monopoly|cataclysm/.test(txt))tags.push("ultimate");
    if(/heal|max hp|restor|lifesteal|blood|replenish|potion/.test(txt))tags.push("sustain");
    if(/gold|shop|merchant|coin|wealth/.test(txt))tags.push("wealth");
    if(/dodge|echo|double|speed|haste/.test(txt))tags.push("tempo");
    if(/element|ice|fire|nature|light|void|coffee|metal|electric|tech|donut|gun/.test(txt))tags.push("elemental");
    if(/pet|companion|pack/.test(txt))tags.push("pet");
    if(/attack|crit|damage|boss/.test(txt))tags.push("damage");
    if(!tags.length)tags.push(up.rarity);

    return up.tags;
  }
  upgrades.forEach(inferUpgradeTags);

  function ensureHellToggle(){
    if($("hellBox")){
      const box=$("hellBox"),btn=$("hellToggle"),text=$("hellText");
      box.classList.toggle("locked",!meta.hellUnlocked);btn.disabled=!meta.hellUnlocked;btn.textContent=!meta.hellUnlocked?"Locked":hellMode?"Hell ON":"Hell OFF";btn.classList.toggle("active",hellMode);text.textContent=!meta.hellUnlocked?"Defeat Nightmare Board 4 to unlock: all enemies gain elemental affinity and become far more dangerous.":"All enemies gain elemental affinity and become brutally stronger. This is a bad idea.";
      return;
    }
    const nbox=$("nightmareBox");if(!nbox)return;const box=document.createElement("div");box.className="nightmare-toggle locked hell-toggle";box.id="hellBox";box.innerHTML=`<div><strong>🔥 Hell Mode</strong><span id="hellText">Defeat Nightmare Board 4 to unlock: all enemies gain elemental affinity and become far more dangerous.</span></div><button class="small-btn" id="hellToggle">Locked</button>`;nbox.after(box);box.querySelector("button").addEventListener("click",e=>{e.preventDefault();if(!meta.hellUnlocked)return;hellMode=!hellMode;window.DiceboundClassChooser.render();});ensureHellToggle();
  }

  window.DiceboundCamp.configureShell({refreshClassHudAndRoadLabels:()=>{const cls=CLASSES[player.classId];dbClassPresentation.syncActive(cls.id);if(boardLevel===5){$("guardianText").textContent=player.position<currentMinibossTile()-1?`Miniboss · tile ${currentMinibossTile()}`:`Ring Tyrant · tile ${currentTileCount()}`;}if(hellMode&&$("floorText"))$("floorText").textContent=`Board ${boardLevel} · Hell Mode · ${player.position+1} / ${currentTileCount()}`;}});

  window.DiceboundCamp.configureShell({ensureHellToggle:()=>ensureHellToggle()});

    function generateMerchantWeapon(){return ensureModernEquipmentIdentity({id:`merchant_omega_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"weapon",rarity:"omega",mythical:true,merchantWeapon:true,icon:"⚖️",name:"The Final Price",uniqueEffect:"Compound Interest: every basic and Echo attack adds flat damage equal to your current gold.",bonuses:{attack:12,luck:.35,goldBonus:.60,bossDamage:.45}});}
  function applyMythicRingPulse(){if(!(player.equipment?.ring?.mythicPiece==="ring")||player.combatActionCount<1||player.combatActionCount%4!==0)return "";player.combatShield=(player.combatShield||0)+1;player.ultimateCharge=clamp(player.ultimateCharge+12,0,100);return "💍 Ouroboros Halo grants 1 barrier and 12 ultimate.";}

  let dbDebugUiReady=false;
  function refreshDebugButtons(){
    const grid=$("debugGrid");if(!grid)return;
    const ensure=(id,label)=>{let btn=grid.querySelector(`[data-debug="${id}"]`);if(!btn){btn=document.createElement("button");btn.dataset.debug=id;btn.className="small-btn";grid.appendChild(btn);}btn.textContent=label;return btn;};

    ensure("alwayschoose",`${meta.debugAlwaysChooseRolls?"☑":"☐"} Always choose dice`);
    ensure("board5","Board 5");
    ensure("mythicring","Artifact Ring");
    ensure("omega_merchant","The Final Price");
    ensure("omega_stone","Philosopher's Stone");
    for(const [id,label] of [
      ["mythic_weapon","🌈 Mythic Weapon"],["mythic_boots","🌈 Mythic Boots"],["mythic_legs","🌈 Mythic Legguards"],
      ["mythic_amulet","🌈 Mythic Amulet"],["mythic_hat","🌈 Mythic Hat"],["mythic_ring","🌈 Mythic Ring"],["seed_item","🧬 Add item by seed code"],
      ["all_powerups","🎁 Choose any eligible powerup"]
    ])ensure(id,label);

    const old=grid.querySelector('[data-debug="unlock"]');
    if(old){old.dataset.debug="unlockclasses";old.textContent="🔓 Unlock all classes";}
    else ensure("unlockclasses","🔓 Unlock all classes");
    ensure("unlockpets","🐾 Unlock all pets");

    // yet. Once the final debug UI generation has initialized, every ordinary
    // refresh also performs the current tab/control sync exactly once.
    if(dbDebugUiReady)v25EnsureDebugControls();
  }

  refreshDebugButtons();
  saveMeta();

  random();

  // replaced by the semantic-art owner. Keep its single lexical binding so
  // early startup assignments remain valid in strict mode.

  playElementAnimation=function(key,target=currentEnemy,enemySource=false){const head=document.querySelector("#combatOverlay .combat-head");if(!head||!ELEMENTS[key])return;const art={fire:"🔥☄️",ice:"❄️✳️",electric:"⚡⚡",light:"✨☀️",void:"🕳️🌑",nature:"🌿🪴",donut:"🍩🍩🍩",tech:"🤖📡",metal:"🤘🎸",coffee:"☕💨",gun:"🔫💥"}[key]||ELEMENTS[key].icon;if(enemySource){const el=document.createElement("div");el.className="enemy-proc-fx";el.innerHTML=`<span>${target?.icon||"👹"} → ${art}</span><small>ENEMY ELEMENT PROC</small>`;head.appendChild(el);setTimeout(()=>el.remove(),900);return;}const el=document.createElement("div");el.className=`element-proc-fx ${key}`;el.textContent=art;head.appendChild(el);setTimeout(()=>el.remove(),850);};

  applyPoisonTick=function(){const selectedBeforeTick=currentEnemy;let total=0,notes=[];for(const e of livingEnemies()){const stacks=e.poisonStacks||0;if(!stacks)continue;let dmg=Math.max(1,Math.round(player.attack*(player.poisonStackPower||.12)*stacks));if(e.affinity==="nature")dmg*=.5;const dealt=damageEnemy(e,dmg,true);total+=dealt;notes.push(`${e.name}: ${dealt} (${stacks} stack${stacks===1?"":"s"})`);}if(selectedBeforeTick?.hp<=0)db0648ReconcileDefeatedTarget(selectedBeforeTick,"poison");if(total){if(currentEnemy?.hp>0)playElementAnimation("nature",currentEnemy,false);setCombatText(`☠️ Poison ticks — ${notes.join(" · ")}.`);updateCombatUI();}return total;};

  // Re-render once so the updated class order/portraits are immediately visible.
  window.DiceboundClassChooser.render();

  random();

  // ---- identity descriptions -------------------------------------------------

  // ---- even more thematic class portraits -----------------------------------

  // ---- monster and boss portraits -------------------------------------------

  // ---- identity resource UI --------------------------------------------------
  const combatActions=document.querySelector("#combatOverlay .combat-actions");
  let specialAttackBtn=$("specialAttackBtn");
  if(!specialAttackBtn&&combatActions){specialAttackBtn=document.createElement("button");specialAttackBtn.id="specialAttackBtn";specialAttackBtn.className="combat-btn special action-tooltip";specialAttackBtn.hidden=true;combatActions.insertBefore(specialAttackBtn,$("guardBtn"));}

  function identityFlash(text){const head=document.querySelector("#combatOverlay .combat-head");if(!head)return;const el=document.createElement("div");el.className="identity-flash";el.textContent=text;head.appendChild(el);setTimeout(()=>el.remove(),1050);}

  // ---- reset/setup for identity state ---------------------------------------

  // Slime can borrow broad class powers only when the power actually works with
  // mechanics Slime possesses. Pure stat/class-flavour powers remain eligible;
  // mechanic-dependent powers such as Benediction require their real mechanic.
  function db32PowerMechanicsCompatible(u,caps){
    const spec=window.DiceboundContent?.powerupMechanics?.[u.id]||{requires:[]};
    return (spec.requires||[]).every(req=>!req.startsWith("ultimate:")&&caps.has(req));
  }

  // ---- core class identity hooks --------------------------------------------

  // ---- D20: make every combat roll readable and slightly more chaotic -------

  // ---- occult attacks --------------------------------------------------------

  // Guard/potion identity wrappers.
  async function identityGuardAction(...args){
    const invoke=(...inner)=>dbCombat.identityGuard(...inner);
    if(typeof v25TraceCommand==='function')return v25TraceCommand('identityGuardAction',invoke,'detailed',args,this);
    return invoke(...args);
  }
  async function identityPotionAction(...args){if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.identityPotionAction.apply(this,args);}

  // Classes owns class-action selection policy. Generic Combat/Consumable/Ultimate
  // resolution remains in its existing owners and is injected as collaborators.
  dbClasses.configureActionMechanics({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    getBoardLevel:()=>boardLevel,
    getEncounterLead:()=>currentEncounterLead,
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    basicAttack:()=>dbCombat.attack(),
    identityFlash:text=>identityFlash(text),
    updateCombatUI:()=>updateCombatUI(),
    healPlayer:amount=>dbCombat.heal(amount),
    damageAll:(amount,falloff=1)=>damageAll(amount,falloff),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    setCombatText:text=>setCombatText(text),
    updateHUD:()=>updateHUD(),
    sfxHoly:()=>sfx.holy(),
    sfxCoin:()=>sfx.coin(),
    sfxHit:()=>sfx.hit(),
    sfxCrit:()=>sfx.crit(),
    delay:ms=>delay(ms),
    livingEnemies:()=>livingEnemies(),
    winCombat:()=>dbCombat.win(),
    resolveEnemyResponse:guarded=>resolveEnemyResponse(guarded),
    isClassActive:id=>classIdentityActive(id),
    random:()=>random(),
    rand:(min,max)=>rand(min,max),
    clamp:(value,min,max)=>clamp(value,min,max),
    modifiedGold:value=>modifiedGold(value),
    getUpgradeChoices:()=>dbPowerups.choices(),
    pick:values=>pick(values),
    applyUpgrade:(upgrade,source)=>dbPowerups.apply(upgrade,source),
    showToast:(...args)=>showToast(...args),
    rollD20Chaos:kind=>dbCombat.chaos(kind),
    animateClassAttack:mode=>animateClassAttack(mode),
    getSetDamageBonus:()=>v19SetDamageBonus(),
    applyMythicRingPulse:()=>applyMythicRingPulse(),
    selectFirstLivingEnemy:()=>setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0])),
    hasEffect:id=>db060HasEffect(id),
    addCombatHistory:text=>addCombatHistory(text),
    potionHealValue:mult=>dbConsumablesResolution.potionHealValue(mult),
    recordPotionUse:()=>{if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.recordPotionUse();},
    chargeUltimate:amount=>chargeUltimate(amount),
    pickElementKey:()=>pick(ELEMENT_KEYS),
    triggerElementEffect:(key,target,options)=>dbCombat.element(key,target,options),
    rollTieredProc:chance=>rollTieredProc(chance),
    triggerStrikeElements:(target,chaos)=>triggerStrikeElements(target,chaos),
    playElementAnimation:(key,target,fromEnemy)=>playElementAnimation(key,target,fromEnemy),
    gameplayTalentRank:id=>dbProgression.gameplayTalentRank(id),
    dragoonActive:()=>player?.classId==='dragoon',
    syncDragoonPresentation:()=>dbCombatView.syncDragoonPresentation(),
    dragoonLandPresentation:()=>dbCombatView.dragoonLandPresentation(),
    resolvePlayerConfusionOffense:label=>dbCombatConfusionResolution.resolvePlayerOffense(label)
  });
  dbClasses.configureActions({
    basicAttack:()=>dbCombat.attack(),
    manaAttack:()=>dbCombat.channel(),
    bloodmageAttack:()=>dbClasses.bloodmageBloodletting(),
    invokerQuasAttack:()=>dbCombat.offense("Quas Strike",()=>dbClasses.invokerQuasStrike()),
    invokerWexAttack:()=>dbCombat.offense("Wex Strike",()=>dbClasses.invokerWexStrike()),
    invokerExortAttack:()=>dbCombat.offense("Exort Strike",()=>dbClasses.invokerExortStrike()),
    guard:()=>identityGuardAction(),
    bloodmageGuard:()=>dbClasses.bloodmageReplenish(),
    potion:()=>identityPotionAction(),
    ultimate:()=>dbCombat.ultimate(),
    manaSpecial:()=>dbCombat.spell(),
    bloodmageSpecial:()=>dbClasses.bloodmageExsanguinate(),
    rogueSpecial:()=>dbClasses.rogueSteal(),
    clericSpecial:()=>dbClasses.clericConsecration(),
    beastmasterSpecial:()=>dbClasses.cycleBeastStance(),
    alchemistSpecial:()=>dbClasses.alchemistVolatileFlask()
  });

  // Replace the four original action buttons once, removing old stacked listeners.
  function replaceCombatButton(id,handler){const old=$(id);if(!old)return null;const neo=old.cloneNode(true);old.replaceWith(neo);neo.addEventListener("click",handler);return neo;}
  replaceCombatButton("attackBtn",()=>dbClasses.performAction("attack"));
  replaceCombatButton("guardBtn",()=>dbClasses.performAction("guard"));
  replaceCombatButton("potionBtn",()=>dbClasses.performAction("potion"));
  replaceCombatButton("ultimateBtn",()=>dbClasses.performAction("ultimate"));
  specialAttackBtn.addEventListener("click",()=>dbClasses.performAction("special"));

  // ---- combat UI labels/resources -------------------------------------------

  // ---- Info and class cards --------------------------------------------------

  // ---- Hidden AI simulation harness -----------------------------------------
  // This never touches the live player/meta objects. It is deliberately non-enumerable and has no menu button.

  random();

  const V14_RARITY_BUDGETS={common:[10,16],uncommon:[18,28],rare:[30,44],epic:[48,68],legendary:[75,105]};
  const V14_RARITY_AFFIX_TIER={common:1,uncommon:2,rare:3,epic:4,legendary:5};
  const V14_SLOT_BASE={weapon:"attack",offhand:"defense",boots:"dodge",legs:"maxHp",chest:"defense",hat:"crit",ring:"luck",amulet:"lifeSteal"};
  const V14_PREFIXES=[
    {id:"offense",names:["Sharp","Vicious","Savage","Brutal","Godslayer"],slots:["weapon","hat","ring"],tags:["melee","ranged","precision"],cost:t=>6+t*5,apply:(b,t)=>{b.attack=(b.attack||0)+Math.ceil(t*.8);b.crit=(b.crit||0)+.008*t;}},
    {id:"fortified",names:["Sturdy","Fortified","Adamant","Immovable","Worldforged"],slots:["offhand","legs","chest","hat"],tags:["armored","guardian"],cost:t=>6+t*5,apply:(b,t)=>{b.defense=(b.defense||0)+Math.ceil(t*.45);b.maxHp=(b.maxHp||0)+3*t;}},
    {id:"occult",names:["Runed","Arcane","Eldritch","Forbidden","Abyssal"],slots:["weapon","offhand","hat","ring","amulet"],tags:["occult","vampiric"],cost:t=>7+t*5,apply:(b,t)=>{b.attack=(b.attack||0)+Math.ceil(t*.45);b.lifeSteal=(b.lifeSteal||0)+.008*t;b.classBurst=(b.classBurst||0)+.008*t;}},
    {id:"wealth",names:["Coppered","Gilded","Loaded","Sovereign","Midas-Touched"],slots:["boots","hat","ring","amulet"],tags:["wealth","lucky"],cost:t=>6+t*5,apply:(b,t)=>{b.luck=(b.luck||0)+.018*t;b.goldBonus=(b.goldBonus||0)+.025*t;}},
    {id:"evasive",names:["Nimble","Fleet","Shadowed","Untouchable","Ghoststep"],slots:["boots","legs","chest","hat"],tags:["dodgy","evasive"],cost:t=>6+t*5,apply:(b,t)=>{b.dodge=(b.dodge||0)+.009*t;b.crit=(b.crit||0)+.004*t;}},
    {id:"echo",names:["Quick","Resonant","Reverberating","Recursive","Infinite"],slots:["weapon","offhand","ring"],tags:["combo","echo","weird"],cost:t=>7+t*5,apply:(b,t)=>{b.doubleStrike=(b.doubleStrike||0)+.016*t;b.attack=(b.attack||0)+Math.floor(t/3);}},
    {id:"vital",names:["Healthy","Vigorous","Titanic","Deathless","Immortal"],slots:["legs","chest","amulet"],tags:["sustain","durable"],cost:t=>5+t*5,apply:(b,t)=>{b.maxHp=(b.maxHp||0)+5*t;b.lifeSteal=(b.lifeSteal||0)+.003*t;}}
  ];
  const V14_SUFFIXES=[
    {id:"precision",names:["of Aim","of Precision","of the Hawkeye","of Perfect Aim","of the Unerring Star"],slots:["weapon","hat","ring"],cost:t=>5+t*4,apply:(b,t)=>{b.crit=(b.crit||0)+.012*t;}},
    {id:"leech",names:["of Sipping","of the Leech","of Hunger","of Blood","of Endless Thirst"],slots:["weapon","amulet","ring"],cost:t=>6+t*5,apply:(b,t)=>{b.lifeSteal=(b.lifeSteal||0)+.012*t;}},
    {id:"bulwark",names:["of Guarding","of the Bulwark","of the Bastion","of the Fortress","of the Last Wall"],slots:["offhand","legs","chest","hat"],cost:t=>6+t*5,apply:(b,t)=>{b.defense=(b.defense||0)+Math.ceil(t*.55);b.maxHp=(b.maxHp||0)+2*t;}},
    {id:"fortune",names:["of Chance","of Fortune","of Loaded Fate","of Royal Luck","of Impossible Fortune"],slots:["boots","hat","ring","amulet"],cost:t=>5+t*4,apply:(b,t)=>{b.luck=(b.luck||0)+.026*t;}},
    {id:"echoes",names:["of Rhythm","of Echoes","of Repetition","of Recursion","of Infinite Echoes"],slots:["weapon","offhand","ring"],cost:t=>6+t*5,apply:(b,t)=>{b.doubleStrike=(b.doubleStrike||0)+.019*t;}},
    {id:"slayer",names:["of Hunting","of Slaying","of Dragonbane","of the Godslayer","of Final Judgment"],slots:["weapon","ring","amulet"],cost:t=>6+t*5,apply:(b,t)=>{b.bossDamage=(b.bossDamage||0)+.025*t;}},
    {id:"alchemy",names:["of Tonic","of Recovery","of Alchemy","of Miracles","of Bottomless Medicine"],slots:["offhand","legs","amulet"],cost:t=>5+t*4,apply:(b,t)=>{b.potionPower=(b.potionPower||0)+.05*t;b.maxHp=(b.maxHp||0)+2*t;}},
    {id:"greed",names:["of Coin","of Greed","of Profit","of the Treasury","of Unethical Accounting"],slots:["ring","amulet","hat"],cost:t=>5+t*4,apply:(b,t)=>{b.goldBonus=(b.goldBonus||0)+.035*t;b.luck=(b.luck||0)+.008*t;}}
  ];
  function v14HashSeed(seed){let h=2166136261>>>0;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function v14SeedRng(seed){let x=v14HashSeed(seed)||1;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function v14SPick(R,a){return a[Math.floor(R()*a.length)];}
  function v14SInt(R,a,b){return Math.floor(R()*(b-a+1))+a;}
      function v14SpendBase(item,R,remaining){const b=item.bonuses,key=V14_SLOT_BASE[item.slot];let spent=0;
    const add=(k,val,cost)=>{if(remaining-spent<cost)return false;b[k]=(b[k]||0)+val;spent+=cost;return true;};
    while(remaining-spent>=4){
      if(key==="attack"){if(!add("attack",1,7))break;}
      else if(key==="defense"){if(!add("defense",1,8))break;}
      else if(key==="maxHp"){if(!add("maxHp",4,5))break;}
      else if(key==="dodge"){if(!add("dodge",.01,6))break;}
      else if(key==="crit"){if(!add("crit",.012,6))break;}
      else if(key==="luck"){if(!add("luck",.025,6))break;}
      else if(key==="lifeSteal"){if(!add("lifeSteal",.012,6))break;}
      if(R()<.28&&remaining-spent>=7){const extra=v14SPick(R,["maxHp","attack","crit","luck","bossDamage"]);if(extra==="maxHp")add(extra,4,5);else if(extra==="attack")add(extra,1,7);else if(extra==="crit")add(extra,.01,6);else if(extra==="luck")add(extra,.02,6);else add(extra,.02,7);}
    }
    return spent;
  }

  // Later boards become meaningful progression walls instead of a Board-1 check followed by a snowball.

  // Update rarity/explanation text without exposing the hidden number itself.

  random();

  meta.unlocks=meta.unlocks||{};

  // ---- Defense becomes diminishing percentage reduction --------------------
  function defenseDamageReduction(defense=player.defense){const d=Math.max(0,Number(defense)||0);return v24HasJeanJacket()?clamp(d/(d+13),0,.90):clamp(d/(d+25),0,.82);}
  // ---- Rarity/Luck and deterministic v1.5 seed codes -----------------------

  function v15SafeClassId(id){if(!CLASSES[id])throw new Error(`Unknown equipment seed class: ${id}`);return id;}
  function v15SeedCode(rarity,slot,classId,qualityBoost,core){return `D15|${rarity}|${slot}|${classId}|q${qualityBoost}|${core}`;}
  function v15ParseSeedCode(code){const m=String(code||"").trim().match(/^D15\|(poor|common|uncommon|rare|epic|legendary)\|(weapon|offhand|boots|legs|chest|hat|ring|amulet)\|([a-z0-9_]+)\|q(\d+)\|([a-z0-9_-]+)$/i);if(!m)return null;return {rarity:m[1].toLowerCase(),slot:m[2].toLowerCase(),classId:v15SafeClassId(m[3].toLowerCase()),qualityBoost:clamp(Number(m[4])||0,0,8),core:m[5]};}
  function v15GenerateEquipmentFromSeedCode(code){return window.DiceboundEquipment.generateOrdinaryFromSeedCode(code,{parseSeedCode:v15ParseSeedCode,seedRng:v14SeedRng,seedInt:v14SInt,seedPick:v14SPick,hashSeed:v14HashSeed,rarityBudgets:V14_RARITY_BUDGETS,affixTiers:V14_RARITY_AFFIX_TIER,prefixes:V14_PREFIXES,suffixes:V14_SUFFIXES,elementKeys:ELEMENT_KEYS,elementChanceForRarity,pickAffix:window.DiceboundEquipment.pickOrdinaryAffix,spendBase:v14SpendBase,gearIcon:slot=>{const parsed=v15ParseSeedCode(code);if(!parsed||!CLASSES[parsed.classId])throw new Error(`Invalid equipment seed class: ${parsed?.classId||"unknown"}`);const offhand={fighter:"🛡️",ranger:"🪶",sorcerer:"📖",monk:"📿",clown:"🎭",rouge:"🎨",berserker:"💀",turtle:"🐚",frog:"🪷",d20:"🎲",slime:"🫧"};const icon={weapon:CLASSES[parsed.classId].attackIcon,offhand:Object.prototype.hasOwnProperty.call(offhand,parsed.classId)?offhand[parsed.classId]:"📖",boots:"🥾",legs:"👖",chest:"🥋",hat:"🪖",ring:"💍",amulet:"📿"}[slot];if(!icon)throw new Error(`Missing equipment icon policy for slot: ${slot}`);return icon;},baseName:window.DiceboundEquipment.ordinaryBaseName});}

  {const oldBtn=$("equipLootBtn");if(oldBtn){const neo=oldBtn.cloneNode(true);oldBtn.replaceWith(neo);neo.addEventListener("click",async()=>{if(!pendingLootItem)return;const current=player.equipment[pendingLootItem.slot],delta=current?dbItems.score(pendingLootItem)-dbItems.score(current):999;if(current&&delta<0&&!(await diceboundConfirm(`${pendingLootItem.name} rolls lower overall quality than ${current.name} after considering its hidden quality budget and visible stats. Replace it anyway? ${current.name} will automatically be sold for ${dbItems.sellValue(current)} gold.`,{title:"Replace stronger gear?",confirmLabel:"Replace anyway",danger:true})))return;dbItems.equip(pendingLootItem);closeLoot();});}}

  // ---- Summoner & Pokémon Trainer runtime ----------------------------------
                function cycleTrainerPokemon(){if(!classIdentityActive("pokemontrainer")||combatBusy)return;const roster=player.trainerRoster||[];if(!roster.length)return;player.trainerActiveIndex=((player.trainerActiveIndex||0)+1)%roster.length;const id=dbCombat.activeTrainerPetId();identityFlash(`${PETS[id].icon} Go, ${PETS[id].name}!`);setCombatText(`🧢 You switch to ${PETS[id].icon} ${PETS[id].name}. Switching does not spend your turn.`);updateCombatUI();}
  $("specialAttackBtn")?.addEventListener("click",e=>{if(classIdentityActive("pokemontrainer")){e.preventDefault();e.stopImmediatePropagation();cycleTrainerPokemon();}},true);

  // ---- Debug: all Mythic pieces + item seed recreation ----------------------

  // ---- New class portraits and sensible selection order --------------------

  random();

  // ---- Radiation ------------------------------------------------------------

  function restoreRadiationDefenseV16(...args){return dbCombat.restoreRadiationDefense(...args);}

  // Enemy affinity can never contradict its weakness.

  // ---- New Alchemist class --------------------------------------------------

  // ---- Talents --------------------------------------------------------------  // ---- Talents --------------------------------------------------------------

  // ---- Per-run identity state ----------------------------------------------

  // ---- Companion differentiation -------------------------------------------

  function syncActivePetBonusV16(force=false){return dbPets.syncActiveBonus(force);}

  // ---- Powerup rerolls ------------------------------------------------------

  // ---- Ranger / Fighter / Monk / Turtle identities -------------------------

  // ---- Clown gag continuity -------------------------------------------------
  const GAG_INFO={"Big Shoes":"+12% Dodge while active. Final Punchline raises extra barriers.","Rubber Chicken":"Basic attacks gain +20% Echo chance. Final Punchline hits harder.","Exploding Pie":"Your next basic attack deals +55% damage. Final Punchline becomes an enormous explosion.","Safety Net":"Opening the gag grants a Barrier. Final Punchline reinforces the net with more barriers.","Standing Ovation":"Opening the gag grants +25 Ultimate. Final Punchline leaves applause behind as 45 Ultimate."};

  // ---- Combat UI clarity ----------------------------------------------------
  // Alchemist Special now uses the shared DiceboundClasses action route.

  window.DiceboundCamp.configureShell({refreshDefenseTooltip:()=>{const d=$("defenseText");if(d){const pct=Math.round(defenseDamageReduction(player.defense)*100);d.classList.add("defense-tooltip");d.title=`${Math.round(player.defense)} Defense currently reduces ordinary incoming damage by about ${pct}%. Defense has diminishing returns; guardian specials receive only part of this reduction.`;const box=d.closest(".stat");if(box)box.title=d.title;}}});

  // ---- Second Sun actually works -------------------------------------------

  // ---- Sovereign Relic: force a visible choice flow ------------------------

  // ---- Preserve valuable end-run gear warnings -----------------------------
  let v16PreciousWarningAcknowledged=false;
  function unboundPreciousGearV16(){const bound=[...(meta.heirlooms||[]),...(meta.heirloomStorage||[])];return EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]).filter(i=>i&&["legendary","artifact","mythical","omega"].includes(i.rarity)&&!bound.some(h=>h.id===i.id||(h.seed&&i.seed&&h.seed===i.seed)));}
  async function preciousGuardV16(e){if(v16PreciousWarningAcknowledged)return;const items=unboundPreciousGearV16();if(!items.length)return;e.preventDefault();e.stopImmediatePropagation();const target=e.currentTarget||e.target;const ok=await diceboundConfirm(`WARNING: You are about to leave behind ${items.length} unbound Legendary/Artifact/Mythical/Omega item${items.length===1?"":"s"}:\n\n${items.map(i=>`• ${i.name}`).join("\n")}\n\nStart/leave this run without binding one as an heirloom anyway?`,{title:"Leave valuable gear?",confirmLabel:"Leave anyway",danger:true});if(!ok)return;v16PreciousWarningAcknowledged=true;target?.click?.();}
  ["restartBtn","endRestartBtn","startBtn"].forEach(id=>$(id)?.addEventListener("click",preciousGuardV16,true));$("startBtn")?.addEventListener("click",()=>setTimeout(()=>v16PreciousWarningAcknowledged=false,0));

  // ---- Alchemist art and class ordering ------------------------------------

  // Combat-kind metadata remains available to existing final-combat routing.

  let v16CombatKind=null;
  // ---- Info additions -------------------------------------------------------

  saveMeta();dbProgression.checkDynamicClassUnlocks();window.DiceboundClassChooser.render();renderInfo();refreshDebugButtons();updateHUD();

  saveMeta();dbProgression.checkDynamicClassUnlocks();refreshDebugButtons();window.DiceboundClassChooser.render();renderInfo();

  // Refresh visible UI once the new identity/art layer is active.
  window.DiceboundClassChooser.render();
  renderInfo();

  random();

  // ---- Guardian elemental Guard talent + Turtle/Slime powerup -------------
  // ---- Potion / Echo tooltips ----------------------------------------------

  // ---- Reliable Legendary choice flow -------------------------------------
    function v17LegendaryChoices(){return dbPowerups.legendaryChoices();}
  // ---- Explicit late-road difficulty curve --------------------------------

  // ---- Ninja Smoke ---------------------------------------------------------

  // ---- Poison marker compacting -------------------------------------------

  // ---- Camp full-health consolation ---------------------------------------

  // ---- Bloodmage secrecy + boss tuning ------------------------------------

  // ---- D20: show the roll, pause, then let the calling attack resolve ------

  // ---- Summoner spirits become visible in combat --------------------------

  // ---- Toxic Bloom wording -------------------------------------------------
  const toxic=upgrades.find(u=>u.name==="Toxic Bloom");

  // ---- Live board-stat tooltips --------------------------------------------
  // Native `title` tooltips can cache stale text in Chromium/Edge. These CSS
  // tooltips read `data-tip` every time they are shown, so Potion/Defense/Echo
  // always reflect the current player state after gear, talents and powerups.

  function v18PotionTooltip(){
    const heal=dbConsumablesResolution.potionHealValue();
    return `Potions currently restore about ${heal} HP. Potion Healing bonus: +${Math.round((player.potionPower||0)*100)}%. Base healing is 10 + 10% of max HP.`;
  }
  function v18DefenseTooltip(){
    const dr=Math.round(defenseDamageReduction(player.defense||0)*100);
    return `${Math.round(player.defense||0)} Defense gives about ${dr}% ordinary damage reduction. Diminishing returns apply; flat reduction (${Math.round(player.flatReduction||0)}) is applied separately. Guardian specials only receive part of Defense reduction.`;
  }
  function v18EchoTooltip(){
    const chance=Math.round((player.doubleStrike||0)*100);
    const baseScale=(player.echoDamageScale||.70);
    const critEcho=(player.criticalEchoBonus||0);
    const effectiveScale=Math.round(baseScale*(1+critEcho)*100);
    return `${chance}% Echo Strike chance. Each Echo currently deals about ${effectiveScale}% of a normal strike before its own Crit and elemental rolls.${critEcho?` Critical-Echo bonuses contribute +${Math.round(critEcho*100)}% multiplicative Echo damage.`:""}`;
  }
  function v18ApplyStatTooltip(id,text){
    const el=$(id),box=el?.closest('.stat');if(!el||!box)return;
    box.classList.add('v18-stat-tooltip');box.dataset.tip=text;el.removeAttribute('title');box.removeAttribute('title');
  }

  // ---- Ouroboros: hidden Echo-overflow secret class ------------------------
  // Attack is deliberately fixed at 10. Any system that tries to add/remove
  // Attack is translated into +/-10% Echo per Attack point instead. This hook
  // makes talents, gear, Bloodwell exchanges and powerups all obey one rule.

  // A one-copy identity power that complements the broader Endless Form talent.

  // ---- Talent revisions and new fourth-choice node -------------------------

  const endlessTalent=talents.find(t=>t.id==="monk_flow_ceiling");
  if(endlessTalent){

  }

  // ---- Per-run state and class-passive normalization -----------------------

  function v18SyncOuroborosAttack(){return dbClasses.syncOuroborosAttack();}

  // ---- Guard, Replenish and pet-turn behavior ------------------------------

  // ---- Endless Form support hooks ------------------------------------------

  // ---- Level-up fourth choice ----------------------------------------------

  // ---- CEO wealth barriers --------------------------------------------------
  // Older logic grants the first barrier at 1,000 gold. These are additive
  // thresholds: a CEO entering combat with 25k starts with three total.
  // ---- Ouroboros ultimate ---------------------------------------------------

  // ---- Reliable Sovereign/Contract choice for Edge -------------------------
  // The choice uses delegated pointer/click handling (more robust in Edge),
  // then performs an integrity check. If the overlay failed to render buttons,
  // ---- Live HUD refresh, hidden passives and tooltips -----------------------
  window.DiceboundCamp.configureShell({syncBloodmageHpPassive:initial=>dbClasses.syncBloodmageHpPassive(initial),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),refreshStatTooltips:()=>{v18ApplyStatTooltip("potionText",v18PotionTooltip());v18ApplyStatTooltip("defenseText",v18DefenseTooltip());v18ApplyStatTooltip("echoText",v18EchoTooltip());}});

  // ---- Info/documentation updates ------------------------------------------

  // These functions make browser checks reproducible without exposing another
  // player-facing debug button. They are safe to ignore during normal play.

  // ---- Save/schema enrichment ---------------------------------------------
  meta.unlocks=meta.unlocks||{};
  meta.doubleDiceUnlocked=!!(meta.doubleDiceUnlocked||(meta.board5Clears||0)>0);
  meta.board6Clears=meta.board6Clears||0;
  meta.prestige=meta.prestige||defaultPrestige();
  dbProgression.careerStats();

  // CEO is intentionally a later secret now. Existing unlocked saves remain
  // unlocked; only future unlock checks use the new 300% threshold.
  // ---- Gear point budgets --------------------------------------------------
  // Hidden point budgets are a little wider at every ordinary rarity. Mythic
  // and Omega pieces remain handcrafted rather than budget-generated.
  Object.assign(V14_RARITY_BUDGETS,{
    common:[11,18],uncommon:[20,31],rare:[34,49],epic:[54,76],legendary:[84,116]
  });

  // ---- Deep Quarry retirement / Endless Form consolidation ----------------
  // Deep Quarry was too narrow for its location. Refund old ranks and remove
  // the node; Endless Form already raises Ranger Mark cap and now owns that
  // progression as part of its broad class-signature package.
  const deepQuarryIndex=talents.findIndex(t=>t.id==="ranger_deep_marks");
  if(deepQuarryIndex>=0){
    const oldRank=Math.max(0,Number(meta.purchased?.ranger_deep_marks)||0);
    if(oldRank){meta.points=(meta.points||0)+oldRank*(talents[deepQuarryIndex].cost||1);delete meta.purchased.ranger_deep_marks;}
    if(runTalentSnapshot?.ranger_deep_marks)delete runTalentSnapshot.ranger_deep_marks;

  }
  const endless19=talents.find(t=>t.id==="monk_flow_ceiling");
  if(endless19){

  }

  // ---- Powerup wording and mastery gates ----------------------------------
  // Character powerups only last for the current run. Avoid saying
  // "permanently" in their descriptions; account-level systems retain that
  // word where it is actually true (pets, Prestige, heirlooms, unlocks).
  upgrades.forEach(up=>{});

  // Lock one or two of the strongest class-specific powers behind mastery of
  // that class. This creates a reason to revisit classes without walling off
  // their entire identity. Slime can use class powers only when the source
  // class's mastery gate has been earned too.
  const classMasteryGate={};
  function v19AssignMasteryGates(){
    const groups={};
    upgrades.forEach(u=>{const ids=u.classId?[u.classId]:(u.classIds||[]);ids.forEach(id=>{if(!CLASSES[id])return;(groups[id]??=[]).push(u);});});
    Object.entries(groups).forEach(([id,list])=>{
      const epic=list.filter(u=>u.rarity==="epic"&&!u.achievementGate).slice(-1)[0];
      const leg=list.filter(u=>u.rarity==="legendary"&&!u.achievementGate).slice(-1)[0];
      if(epic)classMasteryGate[epic.id]={board:3,id};
      if(leg)classMasteryGate[leg.id]={board:4,id};
    });
  }
  v19AssignMasteryGates();

  // ---- Impossible Road: seven-piece progression ---------------------------
  function v19SetStartBarrier(){return mythicalSetCount()>=5?1:0;}

  // Board 6 adds the seventh Impossible Road slot.

  // ---- Haste: one-turn lockout --------------------------------------------
  // Haste may grant one immediate extra action, but cannot chain itself again
  // until one normal enemy response has elapsed. This mirrors Freeze's anti-
  // lock behavior without removing Haste's tempo identity.

  // ---- Sovereign Relic / Legendary Contract ------------------------------
  // The final runtime owner now uses Dicebound's visual powerup-choice overlay.
  // Older prompt/random-fallback logic was the reason Board 6 ignored the newer
  // chooser even though the UI existed earlier in the bundle.

  // ---- Pet switching rules -------------------------------------------------
  // Beastmaster predates the class-tag pass, so make its pet identity explicit.
  // Summoner and Pokémon Trainer already carry the `pet` tag in their definitions.

  function v19PetTaggedClass(){return classHasMechanic("pet");}

  // ---- Paladin: healing stores Grace, Grace empowers Guard ----------------
  // This deliberately fuses Cleric's healing feedback loop with Fighter's
  // defensive tempo. Healing stores up to 100 Grace. Guard consumes it for
  // stronger Guard and barriers, turning sustain into deliberate defense.

  // ---- Runtime reset hooks -------------------------------------------------

  // Show Paladin Grace through the standard class resource component.

  // ---- Between-runs hub ----------------------------------------------------

  // ---- Board 6 -------------------------------------------------------------

  // Sixth-road merchant: much richer stock and distinctly higher cost.

  // owns the complete Board 5 -> 6 / final-road transition contract.
  function advanceToNextBoard(){return dbRun.advanceBoard();}
  let v19CompletingSixth=false;
  function dbRunPresentFinalEnd({earned,context}){
    const modePrefix=context.mode==='Normal'?'':`${context.mode} `;
    $("startOverlay")?.classList.add("hidden");$("combatOverlay")?.classList.add("hidden");
    $("endArt").textContent="♾️🏆";$("endTitle").textContent="The Sixth Road Falls!";$("endTitle").className="victory-title";
    $("endText").textContent=`You conquered all six ${modePrefix}roads. ${earned} Legacy XP is banked. Your equipped gear remains available below for heirloom binding.`;
    $("endLevel").textContent=context.level;$("endGold").textContent=context.gold;$("endTurns").textContent=context.rolls;$("endLegacyXp").textContent=earned;$("endGoldLegacyXp").textContent=context.goldLegacyAward;
    dbEquipmentUi.renderEndGear();$("endOverlay").classList.remove("hidden");
  }
  function dbRunApplySixthRoadCompletion({before}){
    if(!before?.unlockSlimeRouge)return;
    dbProgression.unlockClass('slimerouge');addLog('<b>🔴 Something red crawls out of the random road.</b> Slime Rouge has been unlocked.');showToast('🔴 SECRET CLASS UNLOCKED · Slime Rouge',3800,true);
  }
  function completeSixthRoadV19(){return dbRun.completeFinalRoad();}

  // Board-6 guardian labels in the road HUD.
  window.DiceboundCamp.configureShell({refreshBoard6RoadLabels:()=>{if(boardLevel===6&&gameStarted){const count=currentTileCount(),mini=currentMinibossTile();$("floorText").textContent=`Board 6 · ${player.position+1} / ${count}`;$("guardianText").textContent=player.position<mini-1?`Abyssal Custodian · tile ${mini}`:`The Last Equation · tile ${count}`;}}});
  // Keep the road HUD on the same final guardian identity used for combat,

  window.DiceboundCamp.configureShell({refreshFinalGuardianLabel:()=>{if(!gameStarted)return;const guardian=DB317_GUARDIANS.resolveFinal(boardLevel),count=currentTileCount(),mini=currentMinibossTile();if(guardian&&player.position>=mini-1)$("guardianText").textContent=`${guardian.name} · tile ${count}`;}});

  // ---- Set bonuses: runtime hooks ------------------------------------------
  // Normalize old hard-coded thresholds by wrapping the two main combat entry
  // points. This keeps v1.9's weaker 2/3/4 bonuses and strong 7-piece finish.
  // Base strike/ultimate/element formulas already call v19SetDamageBonus() directly.
  // Do not wrap strikeBaseDamage again here: doing so risks double-counting set power.

  // Offhand unique effect and Paladin Guard behavior share Guard entry.

  // ---- Debug additions -----------------------------------------------------
    function v19AddDebugButton(action,label){const grid=$("debugOverlay")?.querySelector(".debug-grid");if(!grid||grid.querySelector(`[data-v19-action="${action}"]`))return;const b=document.createElement("button");b.className="small-btn";b.dataset.v19Action=action;b.textContent=label;b.addEventListener("click",()=>debugAction(action));grid.appendChild(b);}
  v19AddDebugButton("board6","Board 6");v19AddDebugButton("mythic_offhand","Artifact offhand");v19AddDebugButton("double_dice","Unlock 2d6");

  // ---- Info / visual polish ------------------------------------------------

  // Styling added in JS keeps the single-file build self-contained.

  // Final refresh.
  upgrades.forEach(inferUpgradeTags);saveMeta();window.DiceboundTalentTree.render();window.DiceboundPetChooser.render();window.DiceboundClassChooser.render();renderInfo();updateHUD();

(function(){
  const V="Alpha v2.0";

  // Camp DOM/presentation ownership moved to runtime/js/ui/camp.js.  These

  function v110EnsureCampScene(){return window.DiceboundCamp?.ensure();}
  function v110UpdateCampScene(){return window.DiceboundCamp?.refresh();}

  window.DiceboundCamp.configureShell({ensureCampScene:()=>v110EnsureCampScene(),refreshCampV110:()=>v110UpdateCampScene()});

  // this timer deliberately runs after that deterministic bootstrap boundary.
  setTimeout(()=>{v110EnsureCampScene();v110UpdateCampScene();renderEquipment();},0);
})();

/* ---------- Powerups presentation facade configuration ---------- */
(function(){
  const dbPowerupPresentation=window.DiceboundPowerupPresentation;
  if(!dbPowerupPresentation?.configure)throw new Error("DiceBound Powerup presentation owner is unavailable.");
  dbPowerupPresentation.configure({
    getDocument:()=>document,find:selector=>$(selector),getPlayer:()=>player,getClasses:()=>CLASSES,clamp:(value,min,max)=>clamp(value,min,max),
    isGameStarted:()=>!!gameStarted,eligible:filter=>eligibleUpgrades(filter),describe:powerup=>dbPowerups.describe(powerup),
    getRarityInfo:()=>rarityInfo,choiceHtml:powerup=>choiceHTML(powerup),apply:(powerup,source)=>dbPowerups.apply(powerup,source),
    addLog:html=>addLog(html),showToast:(...args)=>showToast(...args),updateHud:()=>updateHUD()
  });

  // It exposes the final released 0.6.6.32 behavior without changing ordinary
  // callers so capture/replay can freeze eligibility, choice, application and

  const dbPowerupsOracleSummary=up=>up?({id:up.id,name:up.name,rarity:up.rarity,classId:up.classId||null,classIds:[...(up.classIds||[])],unique:!!up.unique,achievementGate:up.achievementGate||null}):null;
  const dbPowerupsOracleState=()=>({
    boardLevel,nightmareMode:!!nightmareMode,hellMode:!!hellMode,pendingLevelUps,
    player:{
      classId:player.classId,level:player.level,position:player.position,hp:player.hp,maxHp:player.maxHp,attack:player.attack,defense:player.defense,
      luck:player.luck,gold:player.gold,goldBonus:player.goldBonus,crit:player.crit,doubleStrike:player.doubleStrike,bossDamage:player.bossDamage,
      lifeSteal:player.lifeSteal,elementProcBonus:player.elementProcBonus,elementDamageBonus:player.elementDamageBonus,levelChoiceBonus:player.levelChoiceBonus||0,
      rangerMarkMax:player.rangerMarkMax||0,loadedSix:!!player.loadedSix,goldAttackScale:player.goldAttackScale||0,
      upgradeCounts:dbRunClone(player.upgradeCounts||{}),runBuffs:dbRunClone(player.runBuffs||[])
    },
    meta:{petCookies:meta.petCookies||0,achievements:dbRunClone(meta.achievements||{})}
  });
  window.DiceboundPowerupsOracleTest=Object.freeze({
    apiVersion:1,
    state:()=>dbPowerupsOracleState(),
    catalog:()=>upgrades.map(dbPowerupsOracleSummary),
    eligible:(rarity=null)=>eligibleUpgrades(rarity?u=>u.rarity===rarity:()=>true).map(dbPowerupsOracleSummary),
    weighted:(ids=null)=>{const pool=ids?ids.map(id=>upgrades.find(u=>u.id===id)).filter(Boolean):eligibleUpgrades();return dbPowerupsOracleSummary(dbPowerups.weighted(pool));},
    choices:(rarity=null)=>dbPowerups.choices(rarity?u=>u.rarity===rarity:()=>true).map(dbPowerupsOracleSummary),
    levelChoices:()=>dbPowerups.levelChoices().map(dbPowerupsOracleSummary),
    apply:(id,source='Powerups Oracle')=>{const up=upgrades.find(u=>u.id===id);if(!up)throw new Error(`unknown powerup ${id}`);return dbPowerupsOracleSummary(dbPowerups.apply(up,source));},
    randomHigh:(source='Powerups Oracle')=>dbPowerupsOracleSummary(dbPowerups.applyRandomHighRarity(source,false)),
    legendaryChoices:()=>v17LegendaryChoices().map(dbPowerupsOracleSummary),
    sovereignChoices:()=>db0410LegendaryChoices().map(dbPowerupsOracleSummary),
    fallbackRarity:wanted=>{const found=v27FallbackRarityPool(wanted);return {rarity:found.rarity,ids:found.pool.map(u=>u.id)};},
    minibossRarity:()=>v27RollMinibossRarity(),
    minibossChoices:()=>v27MinibossChoices().map(dbPowerupsOracleSummary),
    setBoardLevel:value=>{boardLevel=Math.max(1,Number(value)||1);return boardLevel;},
    setModes:(nightmare=false,hell=false)=>{nightmareMode=!!nightmare;hellMode=!!hell;return {nightmareMode,hellMode};},
    setPendingLevelUps:value=>{pendingLevelUps=Math.max(0,Number(value)||0);return pendingLevelUps;},
    levelUi:()=>{dbPowerups.openLevelUp(()=>{});const grid=$("choiceGrid");return {subtitle:$("levelSubtitle")?.textContent||"",choices:[...grid.querySelectorAll("button.choice-btn")].map(b=>({name:b.querySelector('.choice-name')?.textContent||'',rarity:[...b.classList].find(x=>rarityInfo[x])||null})),reroll:grid.querySelector('.powerup-reroll-btn')?.textContent||null,overlayHidden:$("levelOverlay")?.classList.contains("hidden")??true};},
    allEligibleUi:()=>{dbPowerupPresentation.openAllEligible('Powerups Oracle',()=>{});const grid=$("powerupGrid");return {title:$("powerupTitle")?.textContent||"",subtitle:$("powerupSubtitle")?.textContent||"",names:[...grid.querySelectorAll("button.choice-btn")].map(b=>b.querySelector('.choice-name')?.textContent||''),countText:grid.querySelector('.powerup-selector-count')?.textContent||'',overlayHidden:$("powerupOverlay")?.classList.contains("hidden")??true};},
    perfectedSignature:()=>{const up=dbPowerupPresentation.currentSignature();return {name:up.name,desc:up.desc,classId:player.classId};},
    closeOverlays:()=>{$("levelOverlay")?.classList.add("hidden");$("powerupOverlay")?.classList.add("hidden");return true;}
  });
  dbPowerups.configure({
    renderLevelUp:onComplete=>renderLevelUpChoices(onComplete),
    renderPowerupChoice:(source,onComplete,filter,subtitle)=>renderPowerupChoiceOverlay(source,onComplete,filter,subtitle),
    renderLegendaryChoice:(source,onComplete)=>renderLegendaryChoice(source,onComplete),
    renderAllEligible:(source,onComplete,filter)=>dbPowerupPresentation.openAllEligible(source,onComplete,filter),
    perfectedSignature:()=>({...dbPowerupPresentation.currentSignature(),apply:undefined})
  });

  // ordinary run without manufacturing a special event first.
      refreshDebugButtons();

})();

(function(){
  const V='Alpha v2.2';

  // target prevents those inherited renderers from dereferencing null.
  if(!$('startBtn')){const compat=document.createElement('button');compat.id='startBtn';compat.className='camp-hidden';compat.type='button';compat.setAttribute('aria-hidden','true');$('startOverlay')?.querySelector('.start-modal')?.appendChild(compat);}

  function v22CampSummaryText(){return `Legacy Lv ${meta.level} · ${meta.points} unspent · Prestige ${meta.prestige?.count||0} · ${meta.doubleDiceUnlocked?'Double Dice ready':'Clear Board 5 to unlock Double Dice'}`;}
  // Camp presentation stays behind the existing names while its DOM, layout,
  // art and click-target ownership live in DiceboundCamp.
  function v22UpdateCamp(){return window.DiceboundCamp?.refresh();}
  function v22EnsureCompatStartBtn(){return window.DiceboundCamp?.ensureCompatStartButton();}
  function openPrestigeMoon(){return window.DiceboundPrestigeMoon?.open?.()||null;}

  window.DiceboundCamp.configureShell({refreshCampV22:()=>v22UpdateCamp()});

  // This adapter intentionally lives in the v2.2 lexical scope: it supplies
  // presentation data/actions, while ui/camp.js remains the sole DOM/layout
  // owner and keeps domain mechanics in their existing modules.
  window.DiceboundCamp?.configure({
    find:$,
    getViewModel:()=>{
      const randomClass=!!window.DiceboundClassChooser?.isRandomMode?.(),cls=randomClass?{id:'random',name:'Random',icon:'🎲'}:(CLASSES[selectedClassId]||CLASSES.ranger),pet=PETS[meta.activePet]||PETS.neutral,state=meta.pets?.[meta.activePet]||{level:1};
      const achievementTrophyTier=window.DiceboundAchievements?.campTrophyTierForCount?.(dbProgression.achievementCount())||null;
      return {
        classId:cls.id,className:cls.name,classIcon:cls.icon,
        petId:pet.id,petName:pet.name,petIcon:pet.icon,petLine:`${pet.icon} ${pet.name} · Bond Lv ${state.level}`,
        summary:v22CampSummaryText(),
        prestigeSummary:`${prestigeSummary()} · ${dbProgression.allocatedTalentPoints()+(meta.points||0)} total talent points · every 9 becomes 1 Prestige point.`,
        ...dbEquipmentUi.campView(),
        achievementTrophyTier,reveals:{...(meta.campReveals||{}),achievementTrophy:!!achievementTrophyTier},heirloomStorageUnlocked:dbProgression.heirloomStorageUnlocked(),
        nightmareUnlocked:!!meta.nightmareUnlocked,nightmareMode:!!nightmareMode,
        hellUnlocked:!!meta.hellUnlocked,hellMode:!!hellMode
      };
    },
    actions:{
      showClassChoices:()=>window.DiceboundClassChooser.render(),
      renderEquipment:()=>renderEquipment(),
      renderTalents:()=>window.DiceboundTalentTree.render(),
      openTalents:()=>window.DiceboundTalentTree.open('startOverlay'),
      openPrestigeMoon:()=>openPrestigeMoon(),
      openInfo:()=>openInfo(),
      openCareer:()=>openCareer(),
      openAchievements:()=>window.DiceboundAchievementsUi?.open?.(),
      openPets:()=>window.DiceboundPetChooser?.open(),
      startRun:()=>startNewGame(),
      toggleNightmare:()=>{if(!meta.nightmareUnlocked){showToast('Nightmare is still locked');return;}nightmareMode=!nightmareMode;if(!nightmareMode)hellMode=false;window.DiceboundClassChooser.render();showToast(`Nightmare ${nightmareMode?'enabled':'disabled'}`);},
      toggleHell:()=>{if(!meta.hellUnlocked){showToast('Hell is still locked');return;}hellMode=!hellMode;if(hellMode)nightmareMode=true;window.DiceboundClassChooser.render();showToast(`Hell ${hellMode?'enabled':'disabled'}`);},
      resetProgress:async()=>{if(await diceboundConfirm('Reset all Dicebound progress, achievements, pets, heirlooms and unlocks? This cannot be undone.',{title:'Reset ALL Dicebound progress?',confirmLabel:'Reset everything',danger:true})){dbRuntime.save?.reset();dbRuntime.platform?.reload();}}
    },
    canPrimePaleDevil:()=>!!hellMode&&!!meta.hellUnlocked,
    primePaleDevil:()=>{if(!hellMode||!meta.hellUnlocked)return false;meta.devilPrimed=true;saveMeta();return true;},
    playPaleDevilSecret:()=>sfx.holy(),
    paleDevilToast:(...args)=>showToast(...args)
  });

  // #199 / #209: the Class chooser owns live roster/detail presentation and
  // Random selection.  This monolith block supplies domain data/actions only.
  const db064ClassChooser=window.DiceboundClassChooser;
  if(!db064ClassChooser)throw new Error('DiceBound requires the Class chooser UI module before dicebound.js');
  db064ClassChooser.configure({
    find:$,
    getState:()=>({
      classes:Object.values(CLASSES),selectedClassId,
      nightmareUnlocked:!!meta.nightmareUnlocked,nightmareMode:!!nightmareMode,
      hellUnlocked:!!meta.hellUnlocked,hellMode:!!hellMode
    }),
    isUnlocked:id=>dbProgression.isClassUnlocked(id),
    ensureDynamicUnlocks:()=>dbProgression.checkDynamicClassUnlocks(),
    setSelectedClassId:id=>{selectedClassId=id;},
    pick,
    tagChips,
    resolveClassArt:id=>window.DiceboundAssets?.resolveClassArt?.(id),
    getAlchemistProgress:()=>{
      const used=Math.floor(meta.stats?.potionsUsed||0),match=String(CLASSES.alchemist?.unlock||'').match(/(\d+)\s+potions/i);
      return {used,required:Number(match?.[1])||15};
    },
    identityNote:cls=>{
      const manaNote=dbCombatManaActionResolution.identityNote(cls.id);if(manaNote)return manaNote;
      if(cls.id==='bloodmage')return 'Occult blood-fuel class — HP replaces Mana.';
      if(cls.id==='rogue')return 'Extra combat action — Steal once per battle.';
      if(cls.id==='beastmaster')return 'Extra combat control — switch pet stance.';
      if(cls.id==='cleric')return 'Healing builds Faith for Consecration.';
      if(cls.id==='pokemontrainer')return 'Secret six-creature roster — randomized once at the beginning of each run.';
      if(cls.id==='alchemist')return 'Potion engineer — brew, drink or weaponize your restorative stock.';
      return cls.passive?`Identity: ${cls.passive.name}.`:'';
    },
    dismiss:()=>window.DiceboundCamp?.closePanels(),
    afterRender:()=>{v22EnsureCompatStartBtn();ensureHellToggle();v22UpdateCamp();}
  });
  // #206 / #209: Pet mechanics stay in their existing progression/combat
  // paths. This adapter supplies read-only state plus actions to the sole
  // Pet chooser presentation owner.
  const db064PetChooser=window.DiceboundPetChooser;
  if(!db064PetChooser)throw new Error('DiceBound requires the Pet chooser UI module before dicebound.js');
  db064PetChooser.configure({
    find:$,
    getState:()=>dbPets.chooserState(),
    canSwitch:id=>dbPets.canSwitch(id),
    damageFor:id=>dbPets.displayDamage(id),
    bonusFor:id=>id==='neutral'?'Neutral companion · no stat bonus':dbPets.bonusText(id),
    elementName:id=>dbPets.elementName(id),
    resolvePetArt:id=>window.DiceboundAssets?.resolvePetArt?.(id),
    selectPet:id=>dbPets.select(id),
    feed:count=>dbPets.feed(count),
    afterRender:()=>{db059RefreshActivePetArt();v22UpdateCamp();}
  });
  // #186 / #209: the extracted Talent owner owns the constellation surface,
  // geometry and controls. This adapter deliberately supplies only live
  // progression state plus domain actions; it does not render Talent UI.
  const db064TalentTree=window.DiceboundTalentTree;
  if(!db064TalentTree)throw new Error('DiceBound requires the Talent tree UI module before dicebound.js');
  db064TalentTree.configure({
    find:$,
    getTalents:()=>talents,
    getState:()=>{
      const pet=PETS[meta.activePet]||PETS.neutral,petState=meta.pets?.[meta.activePet]||{level:1};
      return {level:meta.level,points:meta.points,runs:meta.runs,petLabel:`${pet.name} Lv ${petState.level||1}`,heirlooms:`${(meta.heirlooms||[]).length} / ${dbProgression.heirloomLoadoutCapacity()}`};
    },
    rankFor:talentRank,
    isAvailable:talentAvailable,
    canPurchase:t=>talentRank(t.id)<t.maxRank&&dbProgression.talentAvailable(t)&&meta.points>=t.cost,
    isVisible:()=>true,
    requirementText,
    purchase:id=>dbProgression.purchaseTalent(id),
    resetProgress:async()=>{if(await diceboundConfirm('Reset all Legacy XP, talents, elemental pet progress, cookies, unlocks and heirlooms?',{title:'Reset Legacy progress?',confirmLabel:'Reset',danger:true})){dbRuntime.save.reset();meta=defaultMeta();saveMeta();window.DiceboundTalentTree.render();showToast('Legacy progress reset');}},
    afterRender:()=>updateMetaUI()
  });
  // #178 / #209: the Moon destination owns only presentation. This adapter
  // exposes the authoritative Prestige transaction/state boundary and keeps
  // saves, effective stats, reset semantics and RNG in their existing owners.
  const db064PrestigeMoon=window.DiceboundPrestigeMoon;
  if(!db064PrestigeMoon)throw new Error('DiceBound requires the Prestige Moon UI module before dicebound.js');
  async function db068SacrificeCrucibleItem(itemId){
    const preview=dbProgression.crucibleSacrificePreview(itemId);
    if(!preview.ok){showToast(preview.reason);return false;}
    const {item,effect,reward}=preview;
    if(!(await diceboundConfirm(`Sacrifice ${item.name||'this Legendary'}?\n\n${effect?.name||item.legendaryEffectName||'Legendary Effect'} — ${effect?.desc||item.legendaryEffectDesc||''}\n\n${reward}\n\nThe physical item will be destroyed.`,{title:'Sacrifice Legendary?',confirmLabel:'Sacrifice',danger:true})))return false;
    const result=dbProgression.crucibleSacrifice(itemId);
    if(!result.ok){showToast(result.reason);return false;}
    dbEquipmentUi.renderCampStorage();updateMetaUI();
    showToast(result.outcome==='learned'?`Echo learned: ${result.effect.name}`:`Duplicate ${result.effect.name} converted to 1 Moon Metal.`,3200,true);return result;
  }
  function db068SelectCrucibleEcho(effectId){
    const result=dbProgression.crucibleSelect(effectId||null);
    if(!result.ok){showToast(result.reason);return false;}
    updateMetaUI();showToast(result.effect?`Active Echo: ${result.effect.name}`:'Echo cleared.');return result;
  }
  db064PrestigeMoon.configure({
    find:$,
    getState:()=>{
      const total=dbProgression.allocatedTalentPoints()+(meta.points||0),offer=db0633PrestigeOfferPoints(total);
      return {prestige:dbProgression.prestigeInspect(),crucible:dbProgression.crucibleView({classId:selectedClassId}),canPrestige:offer>0,prestigeOffer:offer,prestigeDescription:'Every 9 total Talent Points becomes one unspent Prestige Point. Every lifetime PP adds +5% Legacy XP per run; each unspent PP also grants one held stat point.',status:dbProgression.crucibleBuilt()?'The Echo Crucible is online. Moon Forge crafting comes next.':'The Echo Crucible costs 20 PP and unlocks Legendary Effect extraction.'};
    },
    prestige:()=>prestigeTree(),
    purchase:id=>{
      if(gameStarted){showToast('Spend Prestige Points between runs.');return Object.freeze({ok:false,reason:'Prestige Moon purchases are available between runs.'});}
      const result=dbProgression.prestigePurchase(id);
      if(!result.ok){showToast(result.reason);return result;}
      const heirloomPurchase=['heirloom-storage','heirloom-vault-expansion','heirloom-loadout'].includes(result.node.kind);
      if(heirloomPurchase){dbItems.syncHeirloomState();dbEquipmentUi.renderCampStorage();v24RefreshCamp();showToast(`${result.node.label} ${result.rank>1?`rank ${result.rank} `:''}purchased.`);}
      else if(result.node.kind==='structure')showToast(`${result.node.label} built.`,3200,true);
      else showToast(`${result.node.label}: ${dbProgression.prestigeFormatStats(result.stats)}.`);
      saveMeta();updateMetaUI();return result;
    },
    sacrificeCrucible:itemId=>db068SacrificeCrucibleItem(itemId),
    selectCrucible:effectId=>db068SelectCrucibleEcho(effectId),
    refundAll:async()=>{
      if(gameStarted){showToast('Refund Prestige Points between runs.');return false;}
      const current=dbProgression.prestigeInspect();
      if(!current.refundableSpent)return false;
      if(!(await diceboundConfirm(`Refund ${current.refundableSpent} refundable Prestige Point${current.refundableSpent===1?'':'s'}? Permanent structural Moon upgrades stay unlocked.`,{title:'Refund Prestige stats?',confirmLabel:'Refund stats',danger:true})))return false;
      const result=dbProgression.prestigeRefundAll();saveMeta();updateMetaUI();showToast(`Refunded ${result.refunded} Prestige Point${result.refunded===1?'':'s'}.`);return true;
    },
    afterClose:()=>v22UpdateCamp()
  });
  window.DiceboundPetChooser.render();
  setTimeout(()=>window.DiceboundClassChooser.render(),0);

  // ----- Debug menu: class and pet unlocks are separate destructive cheats. --
  function v22EnsureDebugUnlockButtons(){
    const grid=$('debugGrid');if(!grid)return;
    const old=grid.querySelector('[data-debug="unlock"]');if(old){old.dataset.debug='unlockclasses';old.textContent='🔓 Unlock all classes';}
    let pets=grid.querySelector('[data-debug="unlockpets"]');if(!pets){pets=document.createElement('button');pets.className='small-btn';pets.dataset.debug='unlockpets';pets.textContent='🐾 Unlock all pets';if(old)old.after(pets);else grid.appendChild(pets);}
  }
      refreshDebugButtons();

  // Debug/Camp refresh remains here; road-dice controls are initialized once by DiceboundRunDice composition above.
  setTimeout(()=>{v22EnsureDebugUnlockButtons();v22UpdateCamp();},0);

})();

(function(){
  const V='Alpha v2.3';
  const brandH=document.querySelector('.brand h1');if(brandH)brandH.textContent=`Dicebound: ${V}`;
  const brandP=document.querySelector('.brand p');if(brandP)brandP.textContent=`${V} · Cleaner talents, repaired Prestige, richer bosses and a more readable camp.`;

  v19SetStartBarrier=function(){return mythicalSetCount()>=5?1:0;};

  // ----- Road Wisdom and talent prerequisite clarity. -----------------------
  const roadWisdom=talents.find(t=>t.id==='legacy_travel');
  if(roadWisdom){

     // sibling of Living Legend, not behind it
  }

  // Base talent code already grants +1 Fast Travel XP/rank; add two more here
  // so Road Wisdom's real total is the documented +3/rank.

  // Camp owns its own scene dimensions and refresh.  Keep only the inherited

  setTimeout(()=>{window.DiceboundTalentTree.render();renderEquipment();},0);

})();

  const DB24={version:'2.4',modules:{}};

  if($('restartBtn'))$('restartBtn').textContent='⛺ Back to camp';

  meta.heirloomStorage=Array.isArray(meta.heirloomStorage)?meta.heirloomStorage.map(normalizeSavedItem):[];
  meta.devilPrimed=!!meta.devilPrimed;meta.devilBossKills=Number(meta.devilBossKills)||0;meta.devilHornsFound=Number(meta.devilHornsFound)||0;
  meta.legendaryRelics=Array.isArray(meta.legendaryRelics)?meta.legendaryRelics:[];

    Object.keys(V14_RARITY_BUDGETS).forEach(k=>delete V14_RARITY_BUDGETS[k]);
  Object.assign(V14_RARITY_BUDGETS,{poor:[11,18],common:[20,31],uncommon:[34,49],rare:[54,76],epic:[84,116]});
  Object.keys(V14_RARITY_AFFIX_TIER).forEach(k=>delete V14_RARITY_AFFIX_TIER[k]);
  Object.assign(V14_RARITY_AFFIX_TIER,{poor:1,common:2,uncommon:3,rare:4,epic:5});
  elementChanceForRarity=function(rarity){return {poor:.14,common:.24,uncommon:.36,rare:.50,epic:.67,legendary:.90,artifact:1,mythical:1,omega:1}[rarity]||0;};
  rollGearRarity=function(bonus=0){
    const depth=(boardLevel-1)+player.position/Math.max(1,currentTileCount()-1);
    return DB_RARITIES.rollOrdinaryGearRarity({roll:random(),bonus,depth,luck:player.luck,nightmare:nightmareMode,hell:hellMode});
  };

  // Board merchants understand the shifted ordinary rarity ladder. They can
  // sell Poor→Epic generated gear; handcrafted Legendary+ pieces never enter
  // ordinary merchant inventory.

  const V24_POWER_SHIFT={common:'poor',uncommon:'common',rare:'uncommon',epic:'rare',legendary:'epic'};
  upgrades.forEach(up=>{if(!up.v24Tiered){}const dd=Object.getOwnPropertyDescriptor(up,'desc');});
  function v24EditUpgrade(id,desc,apply){const up=upgrades.find(x=>x.id===id);if(up){}return up;}
  v24EditUpgrade('attack','Gain +1 Attack this run.',function(){player.attack+=1;});
  v24EditUpgrade('hp','Gain +5 max HP and heal 5 HP this run.',function(){player.maxHp+=5;player.hp=Math.min(player.maxHp,player.hp+5);});
  v24EditUpgrade('defense','Gain +1 Defense this run.',function(){player.defense+=1;});
  v24EditUpgrade('potion','Gain 1 potion immediately.',function(){player.potions+=1;});
  v24EditUpgrade('purse','Gain 18 gold, increased by your Gold bonus.',function(){player.gold+=modifiedGold(18);});
  v24EditUpgrade('mending','Heal 25% of your maximum HP.',function(){dbCombat.heal(Math.ceil(player.maxHp*.25));});
  const v24NewPowerups=[
    {id:'attack_common_v24',rarity:'common',icon:'⚔️',name:'Sharpened Steel',desc:'Gain +2 Attack this run.',apply(){player.attack+=2;}},
    {id:'attack_uncommon_v24',rarity:'uncommon',icon:'⚔️✨',name:'Roadforged Edge',desc:'Gain +4 Attack this run.',apply(){player.attack+=4;}},
    {id:'hp_common_v24',rarity:'common',icon:'❤️',name:'Stout Heart',desc:'Gain +9 max HP and heal 9 HP this run.',apply(){player.maxHp+=9;player.hp+=9;}},
    {id:'hp_uncommon_v24',rarity:'uncommon',icon:'❤️✨',name:'Giant Constitution',desc:'Gain +16 max HP and heal 16 HP this run.',apply(){player.maxHp+=16;player.hp+=16;}},
    {id:'defense_common_v24',rarity:'common',icon:'🛡️',name:'Tempered Guard',desc:'Gain +2 Defense this run.',apply(){player.defense+=2;}},
    {id:'defense_uncommon_v24',rarity:'uncommon',icon:'🛡️✨',name:'Roadplate',desc:'Gain +4 Defense this run.',apply(){player.defense+=4;}},
    {id:'crit_uncommon_v24',rarity:'uncommon',icon:'🎯✨',name:'Predatory Focus',desc:'Gain +12% Crit this run.',apply(){player.crit+=.12;}},
    {id:'echo_uncommon_v24',rarity:'uncommon',icon:'🔁✨',name:'Double Vision',desc:'Gain +16% Echo Strike this run.',apply(){player.doubleStrike+=.16;}},
    {id:'true_legend_attack_v24',rarity:'legendary',icon:'🗡️🌟',name:'Legend of the First Blow',unique:true,desc:'Gain +14 Attack, +18% Crit and +20% Boss Damage this run.',apply(){player.attack+=14;player.crit+=.18;player.bossDamage+=.20;}},
    {id:'true_legend_echo_v24',rarity:'legendary',icon:'♾️🌟',name:'Legend of Repetition',unique:true,desc:'Gain +55% Echo Strike and Echo Strikes deal 15% more damage this run.',apply(){player.doubleStrike+=.55;player.echoDamageScale=(player.echoDamageScale||.70)+.15;}},
    {id:'true_legend_guard_v24',rarity:'legendary',icon:'🏰🌟',name:'Legend of the Last Wall',unique:true,desc:'Gain +12 Defense and start every battle with 2 additional Barriers this run.',apply(){player.defense+=12;player.firstHitBlocks=(player.firstHitBlocks||0)+2;}},
    {id:'true_legend_element_v24',rarity:'legendary',icon:'🌈🌟',name:'Legend of the Prismatic Road',unique:true,desc:'Gain +20% elemental proc chance and +35% elemental power this run.',apply(){player.elementProcBonus=(player.elementProcBonus||0)+.20;player.elementDamageBonus=(player.elementDamageBonus||0)+.35;}}
  ];

  function generateAxelsCoffeeMug(){return ensureModernEquipmentIdentity({id:`legend_mug_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'offhand',rarity:'mythical',equipmentId:'axels-coffee-mug',specialMythical:true,specialLegendary:true,coffeeActionProc:.18,icon:'☕',name:"Axel's Coffee Mug",uniqueEffect:'Every combat action has an 18% chance to trigger an empowered Coffee elemental proc.',bonuses:{doubleStrike:.75,attack:30,crit:.30,defense:-5,bossDamage:.34,lifeSteal:.10}});}
  function generateKratzHeadphones(){return ensureModernEquipmentIdentity({id:`legend_headphones_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'hat',rarity:'mythical',equipmentId:'kratz-headphones',specialMythical:true,specialLegendary:true,oneHitPerRound:true,icon:'🎧',name:'Kratz Headphones',uniqueEffect:'Once an attack actually reaches you in an enemy round, every later hit that round is drowned out. Dodges and Barriers do not consume this protection.',bonuses:{dodge:.25,defense:25,doubleStrike:-.25,attack:15,bossDamage:.25,crit:.25,goldBonus:-.50}});}
  function generateKellysJeanJacket(){return ensureModernEquipmentIdentity({id:`legend_jacket_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'chest',rarity:'mythical',equipmentId:'kellys-jean-jacket',specialMythical:true,specialLegendary:true,softDefenseCurve:true,icon:'🧥',name:"The Jean Jacket Lost at Kelly's",uniqueEffect:'Defense suffers dramatically less diminishing returns while this jacket is equipped.',bonuses:{dodge:.30,defense:30,luck:-.50,doubleStrike:.15,lifeSteal:.15,attack:-10}});}
  const V24_LEGENDARY_RELICS=[generateAxelsCoffeeMug,generateKratzHeadphones,generateKellysJeanJacket];
  function v24HasLegendaryRelic(id){return (meta.legendaryRelics||[]).includes(id)||(meta.heirloomStorage||[]).some(x=>x?.specialLegendary&&x.name===id)||(meta.heirlooms||[]).some(x=>x?.specialLegendary&&x.name===id);}
  function v24RandomLegendaryRelic(){const candidates=V24_LEGENDARY_RELICS.map(fn=>fn()).filter(i=>!v24HasLegendaryRelic(i.name));return candidates.length?pick(candidates):pick(V24_LEGENDARY_RELICS)();}

        v19SetDamageBonus=function(){const n=mythicalSetCount();return n>=7?.20:n>=6?.14:n>=5?.10:n>=4?.07:n>=3?.04:n>=2?.02:0;};
  v19SetProcBonus=function(){const n=mythicalSetCount();return n>=7?.13:n>=6?.10:n>=5?.07:n>=4?.05:n>=3?.04:0;};
  v19SetPetDoubleBonus=function(){const n=mythicalSetCount();return n>=7?.16:n>=6?.13:n>=5?.10:n>=4?.08:0;};
  v19SetElementPower=function(){const n=mythicalSetCount();return n>=7?1.14:n>=6?1.09:n>=5?1.05:1;};
  v19SetStartUltimate=function(){const n=mythicalSetCount();return n>=7?40:n>=6?35:n>=5?30:n>=4?25:0;};
  v19SetGuardianSpecialMult=function(){const n=mythicalSetCount();return n>=7?.80:n>=6?.85:n>=5?.90:n>=4?.95:1;};
  function v24SetTierData(){return [
    {pieces:2,text:'+2% all damage.'},{pieces:3,text:'+4% all damage and +4% elemental proc chance.'},{pieces:4,text:'+7% all damage, +5% elemental proc chance, 25 starting Ultimate, +8% pet double-attack chance and 5% less Guardian-special damage.'},{pieces:5,text:'+10% all damage, +7% elemental proc chance, +5% elemental power, 30 starting Ultimate, 1 starting Barrier, +10% pet double-attack chance and 10% less Guardian-special damage.'},{pieces:6,text:'+14% all damage, +10% elemental proc chance, +9% elemental power, 35 starting Ultimate, +13% pet double-attack chance and 15% less Guardian-special damage.'},{pieces:7,text:'+20% all damage, +13% elemental proc chance, +14% elemental power, 40 starting Ultimate, +16% pet double-attack chance, 20% less Guardian-special damage, and once per battle at ≤25% HP restore 18% max HP + gain 1 Barrier.'}
  ];}

  function generateDevilsHorns(){return ensureModernEquipmentIdentity({id:`omega_devils_horns_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'hat',rarity:'omega',mythical:true,devilHorns:true,icon:'👿',name:"The Devil's Horns",uniqueEffect:'First/basic hits have a 0.5% chance to instantly kill their target; Echo Strikes cannot trigger it. Overhealing becomes Energy Shield up to 100% of max HP.',bonuses:{maxHp:32,attack:10,crit:.18,bossDamage:.30,lifeSteal:.12}});}
  function v24HasHorns(){return !!player.equipment?.hat?.devilHorns;}
  function v24HasHeadphones(){return !!player.equipment?.hat?.oneHitPerRound;}
  function v24HasJeanJacket(){return !!player.equipment?.chest?.softDefenseCurve;}
    function v24UpdateShieldBars(){if(!dbCombatView.isPresentationConfigured())return;return dbCombatView.syncEnergyShieldBars();}
  window.DiceboundCamp.configureShell({refreshShieldBars:()=>v24UpdateShieldBars()});

  function v24RefreshCamp(){
    const overlay=$('startOverlay'),modal=overlay?.querySelector('.start-modal');if(modal){const h=modal.querySelector('h2');if(h)h.textContent='Campsite';const sub=modal.querySelector('.subtitle');if(sub)sub.innerHTML='Between expeditions. Choose who leaves camp, what they carry, and which terrible idea to enable next.';}overlay?.querySelector('.camp-help')?.remove();
    renderEquipment();
  }
  DB24.modules.camp={refresh:v24RefreshCamp};
  window.DiceboundCamp.configureShell({refreshCampV24:()=>v24RefreshCamp()});

      DB24.modules={rarity:{info:rarityInfo},storage:{capacity:()=>dbProgression.heirloomStorageCapacity(),render:()=>dbEquipmentUi.renderCampStorage()},camp:DB24.modules.camp,testing:window.DiceboundV24Test};
  try{Object.defineProperty(window,'DiceboundModules24',{value:Object.freeze(DB24),enumerable:false,configurable:false,writable:false});}catch(e){}
  setTimeout(()=>{if(dbProgression.heirloomStorageUnlocked())dbItems.syncHeirloomState();v24RefreshCamp();window.DiceboundTalentTree.render();renderEquipment();v24UpdateShieldBars();},0);

  /* v2.4 final presentation consistency ----------------------------------- */
  function v24RefreshDebugLabels(){
    const mythicBtn=document.querySelector('[data-debug="mythic"]');if(mythicBtn)mythicBtn.textContent='Equip full Artifact set';
    const offhandBtn=document.querySelector('[data-debug="mythic_offhand"]');if(offhandBtn)offhandBtn.textContent='Artifact offhand';
  }

  v24RefreshDebugLabels();

  const DB25={version:'2.5.1',modules:{}};

  /* POWERUP BALANCE ------------------------------------------------------- */
  function v25Upgrade(id){return upgrades.find(u=>u.id===id);}
  function v25SetUpgrade(id,changes={}){const u=v25Upgrade(id);if(!u)return null;return u;}

  // Frog / Echo progression.
  v25SetUpgrade('frog_lingering_croak',{rarity:'rare'});
  const amphib=v25Upgrade('frog_amphibian_loop');if(amphib){}
  const echoChamber=v25Upgrade('rare_echo_chamber');if(echoChamber){}
  const echoing=v25Upgrade('echo');if(echoing){}
  const doubleVision=v25Upgrade('echo_uncommon_v24');if(doubleVision){}

  // Gold / treasure progression.
  const treasure=v25Upgrade('gold');if(treasure){}

  // Poison progression and overflow-ready values.
  const venom=v25Upgrade('venom_edge');if(venom){}

  // Upper-tier corrections.
  const rep=v25Upgrade('true_legend_echo_v24');if(rep){}
  const prism=v25Upgrade('true_legend_element_v24');if(prism){}
  const bloodContract=v25Upgrade('legendary_blood_contract');if(bloodContract){}
  const plague=v25Upgrade('plague_lord');if(plague){}
  const destiny=v25Upgrade('destiny');if(destiny){}
  const pack=v25Upgrade('legendary_packbreaker');if(pack){}
  const loaded=v25Upgrade('legendary_loaded_road');if(loaded){}

  // Poison chance now uses the same overflow model as Crit/Echo: 125% means
  // one guaranteed stack plus a 25% chance for a second; 240% means two
  // guaranteed stacks plus a 40% chance for a third.

  /* PALE DEVIL: later Hell encounter, barriers, varied attacks and Hellfire ---- */

  /* JOURNEY END: larger storage-focused management ------------------------ */
  if($('endRestartBtn'))$('endRestartBtn').textContent='Return to camp';
  /* ROADKEEPER'S GUIDE: one current source of truth, no patch archaeology -- */

  /* DEBUG LOGGING ---------------------------------------------------------- */
  const V25_LOG_LEVELS={off:0,errors:1,events:2,detailed:3,all:4};
  meta.debugLogLevel=V25_LOG_LEVELS[meta.debugLogLevel]!=null?meta.debugLogLevel:'off';
  const v25LogBuffer=[];const V25_LOG_MAX=30000;
  function v25State(){return {gameStarted,rollLocked,combatBusy,board:boardLevel,position:player.position,level:player.level,hp:Math.round(player.hp),maxHp:Math.round(player.maxHp),shield:Math.round(player.energyShield||0),gold:Math.round(player.gold),potions:player.potions,classId:player.classId,enemy:currentEnemy?.name||null,enemyHp:currentEnemy?Math.round(currentEnemy.hp):null,pendingLevelUps,overlay:[...document.querySelectorAll('.overlay:not(.hidden)')].map(x=>x.id)};}
  function v25Log(level,category,message,data){const need=V25_LOG_LEVELS[level]??2,current=V25_LOG_LEVELS[meta.debugLogLevel]??0;if(current<need)return;let suffix='';if(data!==undefined){try{suffix=' | '+JSON.stringify(data);}catch(e){suffix=' | [unserializable]';}}const line=`${new Date().toISOString()} [${level.toUpperCase()}] [${category}] ${String(message)}${suffix}`;v25LogBuffer.push(line);if(v25LogBuffer.length>V25_LOG_MAX)v25LogBuffer.splice(0,v25LogBuffer.length-V25_LOG_MAX);v25RefreshLogOutput();}
  function v25RefreshLogOutput(){const out=$('debugLogOutput');if(out){out.textContent=v25LogBuffer.join('\n');out.scrollTop=out.scrollHeight;}document.querySelectorAll('[data-log-level]').forEach(b=>b.classList.toggle('active',b.dataset.logLevel===meta.debugLogLevel));}
  function v25SetLogLevel(level){if(V25_LOG_LEVELS[level]==null)return;meta.debugLogLevel=level;saveMeta();v25Log('events','logging',`Logging level changed to ${level}.`,v25State());v25RefreshLogOutput();}
  function v25DownloadLog(){const now=dbRuntime.platform.nowIso(),header=`Dicebound debug log\nLogging level: ${meta.debugLogLevel}\nGenerated: ${now}\n\n`,text=header+v25LogBuffer.join('\n'),filename=`dicebound_debug_${dbRuntime.platform.nowMs()}.txt`;return dbRuntime.platform.downloadText(filename,text);}
  async function v25CopyLog(){const text=v25LogBuffer.join('\n');try{await dbRuntime.platform.copyText(text);showToast('Debug log copied');}catch(e){showToast('Could not copy debug log');}}
  dbDebugLogSink=Object.freeze({log:(...args)=>v25Log(...args),state:()=>v25State()});
  window.addEventListener('error',e=>v25Log('errors','window',e.message,{file:e.filename,line:e.lineno,col:e.colno,state:v25State()}));window.addEventListener('unhandledrejection',e=>v25Log('errors','promise',String(e.reason),v25State()));
  document.addEventListener('click',e=>{if((V25_LOG_LEVELS[meta.debugLogLevel]||0)>=4){const t=e.target.closest?.('button,[data-debug],[data-tile-index],.camp-spot')||e.target;v25Log('all','input','click',{id:t?.id||'',debug:t?.dataset?.debug||'',text:(t?.textContent||'').trim().slice(0,100),state:v25State()});}},true);
  document.addEventListener('keydown',e=>{if((V25_LOG_LEVELS[meta.debugLogLevel]||0)>=4)v25Log('all','input','keydown',{key:e.key,code:e.code,state:v25State()});},true);
  ['log','warn','error'].forEach(method=>{const original=console[method]?.bind(console);if(!original)return;console[method]=(...args)=>{try{const level=method==='error'?'errors':'all';v25Log(level,'console',args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '));}catch(e){}return original(...args);};});
  window.DiceboundDebugLog=Object.freeze({setLevel:v25SetLogLevel,getLevel:()=>meta.debugLogLevel,lines:()=>[...v25LogBuffer],snapshot:()=>v25State(),download:v25DownloadLog,clear:()=>{v25LogBuffer.length=0;v25RefreshLogOutput();}});
  window.DiceboundDebugClasses=Object.freeze({unlock:id=>v25DebugUnlockClass(id),list:()=>Object.values(CLASSES).map(c=>({id:c.id,name:c.name,unlocked:dbProgression.isClassUnlocked(c.id)}))});

  /* DEBUG MENU TABS + NEW DEBUG ACTIONS ----------------------------------- */
  function v25DebugUnlockClass(id){
    if(!CLASSES[id])return false;
    meta.unlocks=meta.unlocks||{};meta.unlocks[id]=true;
    if(id==='bloodmage')meta.bloodmageUnlocked=true;
    saveMeta();window.DiceboundClassChooser.render();updateMetaUI();
    showToast(`🧪 Debug unlocked ${CLASSES[id].icon} ${CLASSES[id].name}`);
    return dbProgression.isClassUnlocked(id);
  }
  function v25EnsureDebugControls(){
    const modal=$('debugOverlay')?.querySelector('.modal'),grid=$('debugGrid');
    if(modal&&grid){
    let nav=$('debugTabs');if(!nav){nav=document.createElement('div');nav.id='debugTabs';nav.className='debug-tabs';nav.innerHTML=`<button class="small-btn active" data-debug-tab="player">Player</button><button class="small-btn" data-debug-tab="progress">Progression</button><button class="small-btn" data-debug-tab="gear">Gear</button><button class="small-btn" data-debug-tab="navigation">Navigation</button><button class="small-btn" data-debug-tab="logging">Logging</button>`;grid.before(nav);nav.addEventListener('click',e=>{const b=e.target.closest('[data-debug-tab]');if(!b)return;v25ShowDebugTab(b.dataset.debugTab);});}
    const categories={player:new Set(['runxp','level','gold','heal','cookies','all_powerups']),progress:new Set(['legacy','talents','unlockclasses','unlockpets','dibo50','nightmare','unlock_hell','double_dice']),gear:new Set(['mythic','mythic_weapon','mythic_boots','mythic_legs','mythic_amulet','mythic_hat','mythic_ring','mythic_offhand','omega_merchant','omega_stone','seed_item','legend_mug_v25','legend_headphones_v25','legend_jacket_v25','omega_horns_v25']),navigation:new Set(['alwayschoose','board2','board3','board4','board5','board6','boss','recover_road_v25'])};
    const ensurePanel=(id)=>{let p=grid.querySelector(`[data-debug-panel="${id}"]`);if(!p){p=document.createElement('div');p.className='debug-tab-panel';p.dataset.debugPanel=id;grid.appendChild(p);}return p;};['player','progress','gear','navigation'].forEach(ensurePanel);
    const addBtn=(id,label)=>{let b=grid.querySelector(`[data-debug="${id}"]`);if(!b){b=document.createElement('button');b.className='small-btn';b.dataset.debug=id;b.textContent=label;grid.appendChild(b);}return b;};
    addBtn('legend_mug_v25',"☕ Axel's Coffee Mug");addBtn('legend_headphones_v25','🎧 Kratz Headphones');addBtn('legend_jacket_v25',"🧥 Kelly's Jean Jacket");addBtn('omega_horns_v25',"👿 Devil's Horns");addBtn('recover_road_v25','🛠️ Recover road state');
    [...grid.querySelectorAll('[data-debug]')].forEach(btn=>{let cat='player';for(const [name,set] of Object.entries(categories))if(set.has(btn.dataset.debug)){cat=name;break;}ensurePanel(cat).appendChild(btn);});
    const progressPanel=ensurePanel('progress');let picker=$('debugClassUnlocker');if(!picker){picker=document.createElement('div');picker.id='debugClassUnlocker';picker.className='debug-class-unlock';progressPanel.prepend(picker);picker.addEventListener('click',e=>{if(e.target.id!=='debugUnlockSelectedClass')return;const id=$('debugClassUnlockSelect')?.value;if(id)v25DebugUnlockClass(id);});}
    const classOptions=Object.values(CLASSES).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${c.icon} ${c.name}${dbProgression.isClassUnlocked(c.id)?' · unlocked':''}</option>`).join('');picker.innerHTML=`<label for="debugClassUnlockSelect">Unlock one class</label><select id="debugClassUnlockSelect">${classOptions}</select><button class="small-btn" id="debugUnlockSelectedClass" type="button">Unlock selected class</button>`;
    let logPanel=$('debugLogPanel');if(!logPanel){logPanel=document.createElement('div');logPanel.id='debugLogPanel';logPanel.className='debug-log-panel';logPanel.dataset.debugPanel='logging';logPanel.innerHTML=`<div class="debug-log-levels">${Object.keys(V25_LOG_LEVELS).map(l=>`<button class="small-btn" data-log-level="${l}">${l[0].toUpperCase()+l.slice(1)}</button>`).join('')}</div><div class="debug-log-note"><b>Errors</b> captures faults. <b>Events</b> adds important game events. <b>Detailed</b> adds combat/state transitions. <b>All</b> records every routed game command, UI input, save call and state snapshot; use it only while reproducing a bug because it is intentionally noisy.</div><pre class="debug-log-output" id="debugLogOutput"></pre><div class="debug-log-actions"><button class="small-btn" id="debugLogSnapshot">Add state snapshot</button><button class="small-btn" id="debugLogCopy">Copy log</button><button class="small-btn" id="debugLogDownload">Download .txt</button><button class="small-btn" id="debugLogClear">Clear</button></div>`;grid.appendChild(logPanel);logPanel.addEventListener('click',e=>{const level=e.target.closest('[data-log-level]')?.dataset.logLevel;if(level)return v25SetLogLevel(level);if(e.target.id==='debugLogSnapshot')v25Log('errors','snapshot','Manual state snapshot',v25State());if(e.target.id==='debugLogCopy')v25CopyLog();if(e.target.id==='debugLogDownload')v25DownloadLog();if(e.target.id==='debugLogClear'){v25LogBuffer.length=0;v25RefreshLogOutput();}});}
    v25ShowDebugTab(nav.querySelector('.active')?.dataset.debugTab||'player');v25RefreshLogOutput();

    }
    {
      const grid=$('debugGrid');if(!grid)return;

          // data-debug controls so the tab router owns them exactly once.
          grid.querySelectorAll('[data-v19-action]').forEach(b=>b.remove());grid.querySelector('[data-debug="mythicring"]')?.remove();
          const ensure=(id,label)=>{let b=grid.querySelector(`[data-debug="${id}"]`);if(!b){b=document.createElement('button');b.className='small-btn';b.dataset.debug=id;grid.appendChild(b);}b.textContent=label;return b;};
          ensure('board6','🛣️ Jump to Board 6');ensure('mythic_offhand','🟧 Artifact Offhand');ensure('double_dice','🎲 Unlock 2d6');ensure('kill_character_v26','☠️ Kill character');
          const labels={mythic:'🟧 Equip full Artifact set',mythic_weapon:'🟧 Artifact Weapon',mythic_boots:'🟧 Artifact Boots',mythic_legs:'🟧 Artifact Legguards',mythic_amulet:'🟧 Artifact Amulet',mythic_hat:'🟧 Artifact Hat',mythic_ring:'🟧 Artifact Ring',mythicring:'🟧 Artifact Ring',mythic_offhand:'🟧 Artifact Offhand'};Object.entries(labels).forEach(([id,label])=>{const b=grid.querySelector(`[data-debug="${id}"]`);if(b)b.textContent=label;});
          const playerPanel=grid.querySelector('[data-debug-panel="player"]'),progressPanel=grid.querySelector('[data-debug-panel="progress"]'),gearPanel=grid.querySelector('[data-debug-panel="gear"]'),navPanel=grid.querySelector('[data-debug-panel="navigation"]');const move=(id,p)=>{const b=grid.querySelector(`[data-debug="${id}"]`);if(b&&p)p.appendChild(b);};move('kill_character_v26',playerPanel);move('double_dice',progressPanel);['mythic','mythic_weapon','mythic_boots','mythic_legs','mythic_amulet','mythic_hat','mythic_ring','mythicring','mythic_offhand'].forEach(id=>move(id,gearPanel));move('board6',navPanel);v25ShowDebugTab(document.querySelector('#debugTabs .active')?.dataset.debugTab||'player');
    }
  }  function v25ShowDebugTab(id){document.querySelectorAll('#debugTabs [data-debug-tab]').forEach(b=>b.classList.toggle('active',b.dataset.debugTab===id));document.querySelectorAll('#debugGrid [data-debug-panel]').forEach(p=>p.classList.toggle('active',p.dataset.debugPanel===id));}

  /* ROAD SOFT-LOCK WATCHDOG ------------------------------------------------ */
  const v25BlockingOverlayIds=['combatOverlay','levelOverlay','eventOverlay','wheelOverlay','powerupOverlay','merchantOverlay','blessingOverlay','mysticOverlay','lootOverlay','talentOverlay','prestigeMoonOverlay','buffOverlay','prestigeHeirloomOverlay','petCollectionOverlay','diceChoiceOverlay','debugOverlay','bloodwellOverlay','gamblerOverlay','achievementOverlay','infoOverlay','endOverlay'];
  let v25StuckSince=0,v25Recoveries=0,v25LastRecovery=0;
  function v25VisibleBlocker(){return v25BlockingOverlayIds.find(id=>{const el=$(id);return el&&!el.classList.contains('hidden');})||null;}
  function v25RecoverRoadState(reason='watchdog'){
    if(!gameStarted)return false;const blocker=v25VisibleBlocker();if(blocker||combatBusy||currentEnemy){v25Log('detailed','recovery','Recovery skipped: legitimate blocker',{reason,blocker,state:v25State()});return false;}
    const die=$('dice');if(die?.classList.contains('rolling'))return false;
    v25Recoveries++;v25LastRecovery=Date.now();v25Log('errors','recovery','Recovering stuck road state',{reason,tile:tiles[player.position],state:v25State()});
    if(pendingLevelUps>0){dbPowerups.openLevelUp();return true;}
    const tile=tiles[player.position];if(tile&&!tile.cleared&&!['empty','start'].includes(tile.type)){rollLocked=true;try{dbRun.dispatchTile();}catch(e){v25Log('errors','recovery','resolveTile failed during recovery',{error:String(e),state:v25State()});rollLocked=false;updateHUD();}return true;}
    rollLocked=false;updateHUD();$('rollBtn')?.classList.add('debug-recovered');setTimeout(()=>$('rollBtn')?.classList.remove('debug-recovered'),900);showToast('🛠️ Road state recovered');return true;
  }
  setInterval(()=>{if(!gameStarted||!rollLocked||combatBusy||currentEnemy||v25VisibleBlocker()||$('dice')?.classList.contains('rolling')){v25StuckSince=0;return;}if(!v25StuckSince)v25StuckSince=Date.now();if(Date.now()-v25StuckSince>4200&&Date.now()-v25LastRecovery>5000){v25RecoverRoadState('automatic watchdog');v25StuckSince=0;}},1000);
  window.DiceboundRoadRecovery=Object.freeze({recover:()=>v25RecoverRoadState('console/manual'),status:()=>({recoveries:v25Recoveries,stuckSince:v25StuckSince,state:v25State()})});

  // Install logging around high-level commands after all gameplay overrides.
  function v25TraceCommand(name,fn,level='detailed',args=[],thisArg=undefined){
    v25Log(level,'command',`${name}()`,{args:args.map(x=>typeof x==='object'?'[object]':x),before:v25State()});let result;try{result=fn.apply(thisArg,args);}catch(e){v25Log('errors','command',`${name} threw`,{error:String(e),state:v25State()});throw e;}if(result&&typeof result.then==='function')return result.then(v=>{v25Log('all','command',`${name}() complete`,v25State());return v;},e=>{v25Log('errors','command',`${name} rejected`,{error:String(e),state:v25State()});throw e;});v25Log('all','command',`${name}() complete`,v25State());return result;
  }
  function v25WrapCommand(name,level='detailed'){
  const fn=({applyUpgrade:(...args)=>dbPowerups.apply(...args),equipItem:(...args)=>dbItems.equip(...args)})[name];if(typeof fn!=='function')return;
  const wrapped=function(...args){return v25TraceCommand(name,fn,level,args,this);};
  if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;
}
['applyUpgrade','equipItem'].forEach(n=>v25WrapCommand(n,'detailed'));
dbReturnToRoadTraceReady=true;

  /* Final UI sync / tests -------------------------------------------------- */
    DB25.modules={logging:{log:v25Log,setLevel:v25SetLogLevel,state:v25State},recovery:{recover:v25RecoverRoadState},guide:{render:renderInfo}};
  try{Object.defineProperty(window,'DiceboundModules25',{value:Object.freeze(DB25),enumerable:false});}catch(e){}

  setTimeout(()=>{if($('endRestartBtn'))$('endRestartBtn').textContent='Return to camp';v25EnsureDebugControls();renderInfo();},0);

  // Loot UI is also defensive now. Invalid rewards are skipped and their
  // continuation callback still fires so victory resolution can finish.
  // Returning to the board is, by definition, no longer combat. Older layers
  // only unlocked the dice and left combatBusy=true. That stale bit prevented
  // the v2.5 watchdog from recognising the exact soft-lock seen in the log.
  dbReturnToRoadSafetyReady=true;

  // Victory reward-side failure containment moved to combat/victory-resolution.

  // Lightweight state healer for saves/runs already carrying the stale
  // combatBusy flag. It never runs while an enemy or combat overlay exists.
  setInterval(()=>{
    if(gameStarted&&combatBusy&&!currentEnemy&&$('combatOverlay')?.classList.contains('hidden')){
      combatBusy=false;
      v25Log('detailed','hotfix','Cleared stale combatBusy flag',v25State());
    }
  },750);

  v25Log('events','hotfix','Alpha v2.5.1 hotfix loaded',{fixes:['poor-seed-parser','null-loot-guard','combatBusy-cleanup','victory-error-containment']});

  document.title='Dicebound: Alpha v2.6';
  const v26Brand=document.querySelector('.brand h1');if(v26Brand)v26Brand.textContent='Dicebound: Alpha v2.6';
  const v26Sub=document.querySelector('.brand p');if(v26Sub)v26Sub.textContent='The road grows stranger: sturdier talents, clearer poison, sharper secrets and cleaner debug tools.';

  const v26Upgrade=id=>upgrades.find(u=>u.id===id);
  function v26EnsureUpgrade(def){return v26Upgrade(def.id);}

  /* POWERUP LADDER / RARITY CLEANUP --------------------------------------- */
  const purse26=v26Upgrade('purse');if(purse26){}
  const scholar26=v26Upgrade('scholar');if(scholar26){}
  v26EnsureUpgrade({id:'scholar_common_v26',rarity:'common',icon:'📘',name:"Scholar's Sigil+",desc:'Gain +20% enemy XP this run.',apply(){player.xpBonus+=.20;}});
  v26EnsureUpgrade({id:'scholar_uncommon_v26',rarity:'uncommon',icon:'📚',name:"Scholar's Sigil++",desc:'Gain +35% enemy XP this run.',apply(){player.xpBonus+=.35;}});
  const thorns26=v26Upgrade('thorns');if(thorns26){}
  v26EnsureUpgrade({id:'thorns_common_v26',rarity:'common',icon:'🦔',name:'Barbed Armor',desc:'Enemies take 7 damage whenever they hit you.',apply(){player.thorns+=7;}});
  const venomCoil26=v26Upgrade('ouro_venom_coil');if(venomCoil26){}
  const blackFang26=v26Upgrade('venom_edge_rare_v25');if(blackFang26){}
  const pack26=v26Upgrade('legendary_packbreaker');if(pack26){}

  /* SECOND OPINION / EXPANDED HORIZONS ------------------------------------ */
  // Keep a stable per-run snapshot. Rerolls track consumption separately, so
  // refreshing a chooser cannot erase or accidentally refill the talent.

  /* COUNTER RESERVE -> ENDLESS FORM --------------------------------------- */

  /* HIGH-LUCK POOR SUPPRESSION -------------------------------------------- */

  /* LONG STRIDE: FATE CHOICES ARE EXACT ----------------------------------- */

  // it with a capture handler that never grants Long Stride on chosen results.

  /* POISON AS A FIRST-CLASS VISIBLE STAT ---------------------------------- */
  function v26EnsurePoisonStat(){if($('poisonChanceText'))return;const echo=$('echoText')?.closest('.stat'),grid=echo?.parentElement;if(!grid)return;const box=document.createElement('div');box.className='stat v18-stat-tooltip';box.id='poisonChanceStat';box.innerHTML='<span>Poison Chance</span><strong id="poisonChanceText">0%</strong>';echo.after(box);}
  function v26PoisonStackDamage(){return Math.max(1,Math.round((player.attack||0)*(player.poisonStackPower||.12)));}
  window.DiceboundCamp.configureShell({isOuroboros:()=>classIdentityActive('ouroboros'),refreshPoisonStat:()=>{v26EnsurePoisonStat();const t=$('poisonChanceText'),box=$('poisonChanceStat');if(t)t.textContent=`${Math.round((player.poisonOnHitChance||0)*100)}%`;if(box)box.dataset.tip=`${Math.round((player.poisonOnHitChance||0)*100)}% Poison Chance per eligible strike. Chance above 100% guarantees stacks and rolls the overflow for extra stacks. One Poison stack currently deals ${v26PoisonStackDamage()} damage each Poison tick before affinity modifiers.`;}});

  function v266SyncGoldGainStat(){const snapshot=currentGoldSnapshot(),text=$('goldGainText'),box=$('goldGainStat');if(text)text.textContent=snapshot.label||'100%';if(box){box.dataset.tip=snapshot.description||'Gold gain is shown as a percentage of base rewards.';box.title=box.dataset.tip;}}
  window.DiceboundCamp.configureShell({syncGoldGainStat:()=>v266SyncGoldGainStat()});

  /* LEGENDARY REWARD EXHAUSTION ------------------------------------------- */

  /* OUROBOROS: ATTACK IS A CURRENCY FOR ECHO, NOT NORMAL DAMAGE ----------- */

  /* PHILOSOPHER'S STONE ---------------------------------------------------- */
  generatePhilosophersStone=function(){return ensureModernEquipmentIdentity({id:`philosopher_stone_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'amulet',rarity:'omega',mythical:true,bloodmageStone:true,icon:'🜂',name:"Philosopher's Stone",uniqueEffect:'Scarlet Transmutation: overhealing converts 5% of the excess into Energy Shield and 1% into temporary Attack for this battle. Blood-fuelled abilities cost less life.',bonuses:{maxHp:36,attack:12,lifeSteal:.24,crit:.20,luck:.20,bossDamage:.18}});};
  function v26ClearStoneBattle(...args){return dbCombat.clearStoneBattle(...args);}

  dbReturnToRoadStoneReady=true;

  /* DEBUG MENU CLEANUP / DEATH SIMULATION / CURRENT ARTIFACT GEAR --------- */

  dbDebugUiReady=true;refreshDebugButtons();

  setTimeout(()=>{v26EnsurePoisonStat();v25EnsureDebugControls();updateHUD();window.DiceboundTalentTree.render();},0);

  document.title='Dicebound: Alpha v2.7';
  const v27Brand=document.querySelector('.brand h1');if(v27Brand)v27Brand.textContent='Dicebound: Alpha v2.7';
  const v27Sub=document.querySelector('.brand p');if(v27Sub)v27Sub.textContent='The road fights back: smarter rewards, tougher difficulties, cleaner shields and faster impossible snakes.';

  const v27Upgrade=id=>upgrades.find(u=>u.id===id);

  /* QUIETER COMBAT FEEDBACK ------------------------------------------------ */
  // Elemental activations remain in the combat text/history and animations,
  // but no longer create a toast in the middle of every proc chain.

  /* LEGENDARY DESIGN: RARITY != UNIQUE ------------------------------------ */

  /* OUROBOROS: EVERY ATTACK SOURCE BECOMES ECHO --------------------------- */

  function v27SyncOuroborosEconomy(){return dbClasses.syncOuroborosEconomy();}

  window.DiceboundCamp.configureShell({syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),forceOuroborosAttackLabel:()=>{if($('attackText'))$('attackText').textContent='10';}});

  /* EXTREME ECHO SPEED ----------------------------------------------------- */
  // delay() reads this cap. Normal Ouroboros attacks become faster above
  // 1,000% Echo and dramatically faster above 5,000%, while other classes
  // keep the normal readable action cadence.

  /* ENERGY SHIELD ---------------------------------------------------------- */

  /* POISON COUNTER CLEANUP ------------------------------------------------- */

  /* MYSTIC & MINIBOSS POWERUP REWARDS ------------------------------------- */
  function v27FallbackRarityPool(wanted){return dbPowerups.fallbackRarityPool(wanted);}

  function beta03MinibossOddsText(level=boardLevel){return dbPowerups.minibossOddsText(level);}
  function v27RollMinibossRarity(){return dbPowerups.rollMinibossRarity();}
  function v27MinibossChoices(){return dbPowerups.minibossChoices();}
  function v27ShowMinibossReward(source,onComplete=()=>{}){const overlay=$('powerupOverlay'),grid=$('powerupGrid');if(!overlay||!grid){onComplete(false);return;}const render=()=>{grid.innerHTML='';const choices=v27MinibossChoices();if(!choices.length){addLog('<b>Miniboss boon:</b> no eligible powerups remain.');overlay.classList.add('hidden');onComplete(false);return;}$('powerupTitle').textContent='👑 Guardian Boon';$('powerupSubtitle').textContent=`Guardian reward base odds on Board ${boardLevel}: ${beta03MinibossOddsText()}. Luck and harder modes can still improve the roll.`;choices.forEach(up=>{const b=document.createElement('button');b.className=`choice-btn ${up.rarity}`;b.innerHTML=choiceHTML(up);b.addEventListener('click',()=>{dbPowerups.apply(up,source);addLog(`<b>${source}:</b> chose ${rarityInfo[up.rarity]?.label||up.rarity} <b>${up.name}</b>.`);overlay.classList.add('hidden');updateHUD();onComplete(up);});grid.appendChild(b);});attachPowerupReroll?.(grid,render);overlay.classList.remove('hidden');};render();}

  /* NIGHTMARE / HELL ENEMY DEFENSES --------------------------------------- */

  /* BRAIN HACK / RADIATION ------------------------------------------------- */
  const BETA03_FIREBALL_BURN_CHANCE=window.DiceboundCombatElementResolution.fireBurnChance,BETA03_BURN_CAP=window.DiceboundCombatElementResolution.fireBurnCap;
  if(ELEMENTS.fire)ELEMENTS.fire.description='Fireball deals elemental damage and has a 15% chance to add 1 Burn stack. Burn deals 1% enemy max HP per stack each turn and caps at 10 stacks.';
  if(ELEMENTS.tech)ELEMENTS.tech.description='Deals damage and lowers the target\'s current Attack by about 10% for the battle.';
  if(ELEMENTS.radiation)ELEMENTS.radiation.description='Deals light elemental damage and shreds Defense. At 0 Defense or below it keeps pushing Defense negative, making later hits deal more damage.';

  /* RANDOM CLASS ----------------------------------------------------------- */
  /* PRESTIGE: STORAGE REPLACES SURVIVOR CHOICE ----------------------------- */
  async function prestigeTree(){const total=dbProgression.allocatedTalentPoints()+(meta.points||0),rewards=db0633PrestigeOfferPoints(total),remainder=total%9;if(rewards<1)return false;const warning=`Prestige all ${total} talent points? Every 9 points becomes 1 unspent Prestige Point (${rewards} reward${rewards===1?'':'s'}). ${remainder?`${remainder} leftover point${remainder===1?'':'s'} will remain after the reset. `:''}Purchased Heirloom Vault and your stored collection persist; there is no survivor-pick step.${gameStarted?' THIS ENDS THE CURRENT RUN.':''}`;if(!(await diceboundConfirm(warning,{title:'Prestige?',confirmLabel:'Prestige',danger:true})))return false;return dbProgression.completePrestige(total);}

  /* ROADKEEPER RARITY GUIDE ------------------------------------------------ */

  /* UI STYLES -------------------------------------------------------------- */

  // Camp/Prestige presentation now has dedicated UI owners. This retained
  // startup hook refreshes unrelated live combat and Info surfaces only.
  setTimeout(()=>{v24UpdateShieldBars?.();renderInfo();},0);

  window.DiceboundV27Test=Object.freeze({
    legendaries:()=>upgrades.filter(u=>u.rarity==='legendary').map(u=>({id:u.id,name:u.name,unique:!!u.unique})),
    minibossSample:(n=10000)=>{const out={poor:0,common:0,uncommon:0,rare:0,epic:0,legendary:0};for(let i=0;i<n;i++)out[v27RollMinibossRarity()]++;return out;},
    ouroSync:(attack=20,gold=1000,scale=.01)=>{meta.unlocks.ouroboros=true;resetPlayer('ouroboros');player.attack=attack;player.gold=gold;player.goldAttackScale=scale;const before=player.doubleStrike;v27SyncOuroborosEconomy();return {attack:player.attack,echoBefore:before,echoAfter:player.doubleStrike,goldScale:player.goldAttackScale,ouroGoldEchoScale:player.v27OuroGoldEchoScale};},
    status:()=>dbCombatView.statusDotsHTML(6,14,'radiation'),
    goldenLawOuro:()=>{meta.unlocks.ouroboros=true;resetPlayer('ouroboros');player.gold=1000;const u=v27Upgrade('legendary_golden_law');dbPowerups.apply(u,'test');updateHUD();return {attack:player.attack,echo:player.doubleStrike,goldScale:player.goldAttackScale,ouroScale:player.v27OuroGoldEchoScale};},
    shieldAegis:()=>{resetPlayer('ranger');gameStarted=true;currentEnemies=[{name:'Heal Dummy',icon:'x',hp:100,maxHp:100,attack:1,defense:0}];currentEnemy=currentEncounterLead=currentEnemies[0];dbPowerups.apply(v27Upgrade('legendary_crimson_aegis_v27'),'test');player.hp=player.maxHp-1;player.energyShield=0;dbCombat.heal(101);v24UpdateShieldBars();return {hp:player.hp,maxHp:player.maxHp,shield:player.energyShield,style:getComputedStyle($('energyShieldFill')).backgroundImage};},
    nightmareBoss:()=>{resetPlayer('ranger');gameStarted=true;boardLevel=2;nightmareMode=true;hellMode=false;dbRun.generateBoard();buildBoard();player.position=tiles.length-1;startCombat('final');return {barrier:currentEnemy.enemyBarrier||0,dodge:currentEnemy.dodge||0,boss:!!currentEnemy.boss};},
    mysticFallback:()=>{const states=upgrades.filter(u=>u.rarity==='legendary').map(u=>[u,u.unique]);const oldCounts=player.upgradeCounts||{};player.upgradeCounts={...oldCounts};states.forEach(([u])=>{player.upgradeCounts[u.id]=1;});dbRoadEvents.openMystic();const r=window.DiceboundRoadEventLifecycle.inspect().mysticRarity;$('mysticOverlay')?.classList.add('hidden');player.upgradeCounts=oldCounts;dbRoadEvents.resetTransient();return r;},
    prestigeFlow:()=>{const oldConfirm=window.confirm,before=meta.prestige?.count||0;window.confirm=()=>true;meta.points=9;meta.heirloomStorageUnlocked=true;meta.heirloomStorage=[{id:'keep',slot:'ring',rarity:'common',name:'Stored Test Ring',icon:'💍',bonuses:{}}];meta.heirlooms=[normalizeSavedItem(meta.heirloomStorage[0])];prestigeTree();window.confirm=oldConfirm;return {prestige:(meta.prestige?.count||0)-before,storage:(meta.heirloomStorage||[]).length,chooserVisible:!$('prestigeHeirloomOverlay').classList.contains('hidden')};},
    flatAttackOuro:()=>{meta.unlocks.ouroboros=true;resetPlayer('ouroboros');const before=player.doubleStrike;dbPowerups.apply(v27Upgrade('attack_uncommon_v24'),'test');return {attack:player.attack,deltaEcho:player.doubleStrike-before};},
    exhaustedFallback:()=>{const oldCounts=player.upgradeCounts||{},states=upgrades.filter(u=>u.rarity==='legendary').map(u=>[u,u.unique]);player.upgradeCounts={...oldCounts};states.forEach(([u])=>{player.upgradeCounts[u.id]=1;});const f=v27FallbackRarityPool('legendary');player.upgradeCounts=oldCounts;return {rarity:f.rarity,count:f.pool.length};},
    randomPool:()=>window.DiceboundClassChooser?.unlockedPoolIds?.()||[],
    forceFiveClasses:()=>{['ranger','sorcerer','fighter','monk','clown'].forEach(id=>meta.unlocks[id]=true);window.DiceboundClassChooser.render();return {count:document.querySelectorAll('.random-class-card').length,text:document.querySelector('.random-class-card')?.textContent.trim().slice(0,100)};},
    difficultyDummy:()=>{resetPlayer('ranger');gameStarted=true;boardLevel=2;nightmareMode=true;hellMode=true;dbRun.generateBoard();buildBoard();player.position=1;tiles[1]={type:'enemy',cleared:false,packSize:1,enemyBase:{name:'Dummy',icon:'👹',hp:20,attack:5,xp:1,gold:1,weakness:'fire'}};startCombat('normal');return currentEnemies.map(e=>({barrier:e.enemyBarrier||0,dodge:e.dodge||0,boss:!!e.boss}));},
    radiationNegative:()=>{const e={name:'Rad Dummy',icon:'👹',hp:100,maxHp:100,attack:5,defense:0,weakness:'ice',affinity:null};currentEnemies=[e];currentEnemy=currentEncounterLead=e;player.attack=10;const r=dbCombat.element('radiation',e,{forced:true,source:'test'});return {def:e.defense,msg:r?.message||''};},
    brainHack:()=>{const e={name:'Tech Dummy',icon:'👹',hp:100,maxHp:100,attack:50,defense:0,weakness:'ice',affinity:null};currentEnemies=[e];currentEnemy=currentEncounterLead=e;player.attack=10;const r=dbCombat.element('tech',e,{forced:true,source:'test'});return {attack:e.attack,msg:r?.message||''};},
    rarityGuide:()=>{renderInfo();return {count:document.querySelectorAll('#v27RarityGuide').length,omega:document.querySelector('#v27RarityGuide')?.textContent.includes('Omega')};},
    prestigeUsesChooser:()=>false
  });

  document.title='Dicebound: Beta v0.4';
  const v28Brand=document.querySelector('.brand h1');if(v28Brand)v28Brand.textContent='Dicebound: Beta v0.4';
  const v28Sub=document.querySelector('.brand p');if(v28Sub)v28Sub.textContent='Split development source · stable Edge bundle · campsite gathered around the bonfire.';

  /* HEAVY PURSE / VAMPIRIC EDGE ------------------------------------------- */
  const purse28=upgrades.find(u=>u.id==='purse');
  if(purse28){

    try{Object.defineProperty(purse28,'desc',{configurable:true,enumerable:true,get(){const total=modifiedGold(100),bonus=Math.round((player.goldBonus||0)*100);return `Gain ${total} gold now (100 base${bonus?`, ${bonus}% Gold bonus`:''}${nightmareMode?', Nightmare reward reduction included':''}).`;}});}catch(e){}
  }
  /* POISON CLASS TAGS / THRONE OF VENOM ---------------------------------- */
  /* NINJA: ONE SMOKE PER CRITICAL TIER ------------------------------------ */

  /* SLIME ROUGE ------------------------------------------------------------ */
  /* SLIME ROUGE ------------------------------------------------------------ */

  // gear-name presentation remains here; runtime identity lives below.

  /* SLIME ROUGE 3.1.8 — real random identity + real borrowed ultimate ------- */
  function v318SlimeRougeDonorPool(){return Object.values(CLASSES).filter(c=>c.id!=='slime'&&c.id!=='slimerouge'&&dbProgression.isClassUnlocked(c.id));}
  function v318SlimeRougePowerCompatible(u){
    if(!u)return false;const owners=[u.classId,...(u.classIds||[])].filter(Boolean),unlocked=['slimerouge',...Object.keys(CLASSES).filter(id=>id!=='slimerouge'&&dbProgression.isClassUnlocked(id))];
    if(!dbPowerups.ownershipAllowed(u,'slimerouge',unlocked))return false;
    if(!owners.length||owners.includes('slimerouge'))return true;
    const spec=window.DiceboundContent?.powerupMechanics?.[u.id]||{requires:[]};const caps=slimeRougeCapabilities();
    return (spec.requires||[]).every(req=>req.startsWith('ultimate:')?player.slimeRougeUltimateClass===req.slice(9):caps.has(req));
  }

  async function v318UseSlimeRougeUltimate(){
    if(combatBusy||!currentEnemy||player.ultimateCharge<100)return;const donorId=player.slimeRougeUltimateClass||player.v28BorrowedUltimateClass||'ranger',identityId=player.slimeRougeIdentityClass||player.v28BorrowedPassiveClass;
    const originalClass=player.classId;let borrowedMarkBonus=0,consumeBorrowedMarks=false;
    if(identityId==='ranger'&&donorId!=='ranger'){
      const marks=currentEnemies.reduce((n,e)=>n+(e.rangerMarks||0),0);borrowedMarkBonus=Math.min(1.20,marks*.12);if(borrowedMarkBonus)player.classUltimateBonus+=borrowedMarkBonus;consumeBorrowedMarks=marks>0;
    }
    player.classId=donorId;player._slimeRougeCastingUltimate=true;
    try{return await dbCombat.ultimate();}
    finally{
      player.classId=originalClass;player._slimeRougeCastingUltimate=false;if(borrowedMarkBonus)player.classUltimateBonus-=borrowedMarkBonus;updateCombatUI();
    }
  }

  /* FROG / OUROBOROS EXTREME SPEED ---------------------------------------- */

  /* RANDOM -> BOARD 6 -> SLIME ROUGE SECRET ------------------------------- */
  function dbRunApplyClassStartEffects({wasRandom}){
    player.v28StartedRandom=!!wasRandom;
    if(player.classId==='slimerouge'&&player.slimeRougeRunSummary){
      const identity=CLASSES[player.slimeRougeIdentityClass],ultimate=CLASSES[player.slimeRougeUltimateClass];
      addLog(`<b>${player.slimeRougeRunSummary}</b>. Identity mechanics and the borrowed ultimate are both active for this run.`);
      showToast(player.slimeRougeRunSummary,5200,true);
      if(identity&&ultimate)recordRunBuff?.('🎲','This run',`${identity.icon} ${identity.name} identity · ${ultimate.ultimate.icon} ${ultimate.ultimate.name} ultimate`,'class','Slime Rouge');
    }
  }
  /* SIXTH ROAD: ACTUALLY LATER THAN THE FIFTH ----------------------------- */

  /* INFO POLISH ----------------------------------------------------------- */

  setTimeout(()=>{window.DiceboundClassChooser.render();renderInfo();updateHUD();},0);

  window.DiceboundV318Test=Object.freeze({
    forceRun:(identity='summoner',ultimate='pokemontrainer')=>{[identity,ultimate,'slimerouge'].forEach(id=>{if(id&&meta.unlocks)meta.unlocks[id]=true;});dbClasses.forceSlimeRouge(identity,ultimate);resetPlayer('slimerouge');return {identity:player.slimeRougeIdentityClass,ultimate:player.slimeRougeUltimateClass,mechanics:[...slimeRougeCapabilities()],mana:player.mana,maxMana:player.maxMana,spirits:Array.isArray(player.summonerSpirits),roster:(player.trainerRoster||[]).length};},
    compatiblePowers:(identity='summoner',ultimate='pokemontrainer')=>{window.DiceboundV318Test.forceRun(identity,ultimate);const ids=new Set(eligibleUpgrades(()=>true).map(u=>u.id));return {identity,ultimate,summonerSpirit:ids.has('summoner_deeper_circle'),trainerRoster:ids.has('trainer_double_battle'),ninjaSmoke:ids.has('ninja_smoke_step'),count:ids.size};},
    rangerMarks:async()=>{window.DiceboundV318Test.forceRun('ranger','pokemontrainer');const e={name:'Mark Dummy',icon:'👹',hp:9999,maxHp:9999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const result=await dbCombat.strike(e,{echo:false,index:0});return {identity:player.slimeRougeIdentityClass,marks:e.rangerMarks||0,resultType:result?.type,domain:result?.domain};},
    summonerConjure:async()=>{window.DiceboundV318Test.forceRun('summoner','ranger');player.mana=100;const e={name:'Spirit Dummy',icon:'👹',hp:9999,maxHp:9999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const oldResponse=resolveEnemyResponse;resolveEnemyResponse=async()=>{combatBusy=false;};try{const before=player.mana;await dbCombat.summonerConjure();return {identity:player.slimeRougeIdentityClass,beforeMana:before,afterMana:player.mana,spirits:(player.summonerSpirits||[]).length};}finally{resolveEnemyResponse=oldResponse;}},
    realUltimate:async(identity='summoner',ultimate='pokemontrainer')=>{window.DiceboundV318Test.forceRun(identity,ultimate);player.ultimateCharge=100;const e={name:'Ultimate Dummy',icon:'👹',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const oldResponse=resolveEnemyResponse;resolveEnemyResponse=async()=>{combatBusy=false;};try{const before=e.hp;await dbCombat.ultimate();return {identity:player.slimeRougeIdentityClass,ultimate:player.slimeRougeUltimateClass,damage:before-e.hp,classRestored:player.classId==='slimerouge',charge:player.ultimateCharge,roster:(player.trainerRoster||[]).length};}finally{resolveEnemyResponse=oldResponse;}},
    rangerUltimate:async(ultimate='ranger')=>{window.DiceboundV318Test.forceRun('ranger',ultimate);player.ultimateCharge=100;const e={name:'Marked Ultimate Dummy',icon:'👹',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0,rangerMarks:4};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const oldResponse=resolveEnemyResponse;resolveEnemyResponse=async()=>{combatBusy=false;};try{const before=e.hp;await dbCombat.ultimate();return {ultimate,damage:before-e.hp,marksAfter:e.rangerMarks||0,classRestored:player.classId==='slimerouge'};}finally{resolveEnemyResponse=oldResponse;}},
    ninjaIdentityStrike:async()=>{window.DiceboundV318Test.forceRun('ninja','ranger');player.crit=2;player.ninjaSmoke=0;player.ninjaSmokeNeed=3;const e={name:'Rouge Smoke Dummy',icon:'👹',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const result=await dbCombat.strike(e,{echo:false,index:0});return {critTiers:result?.critTiers||result?.crit||0,smoke:player.ninjaSmoke||0,identity:player.slimeRougeIdentityClass};},
    ouroborosIdentityStrike:async()=>{window.DiceboundV318Test.forceRun('ouroboros','ranger');const beforeEcho=player.doubleStrike||0;player.attack=20;const e={name:'Rouge Ouro Dummy',icon:'👹',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;await dbCombat.strike(e,{echo:false,index:0});return {attack:player.attack,echoGain:(player.doubleStrike||0)-beforeEcho,identity:player.slimeRougeIdentityClass};},
    stateContract:()=>{resetPlayer('ranger');const result=ProgressionState.grantXp(25);return {domain:result.domain,type:result.type,applied:result.applied,levelsGained:result.levelsGained};}
  });

  function dbBeta01DifficultyMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
  function dbBeta01SyncDifficultyAtmosphere(){
    const mode=dbBeta01DifficultyMode();
    document.body?.setAttribute('data-run-mode',mode);
    return mode;
  }
  document.addEventListener('click',event=>{
    const id=event.target?.closest?.('button')?.id||event.target?.id||'';
    if(['nightmareToggle','hellToggle','campNightmareBtn','campHellBtn'].includes(id))setTimeout(dbBeta01SyncDifficultyAtmosphere,0);
  },true);
  dbBeta01SyncDifficultyAtmosphere();
  window.DiceboundBeta01=Object.freeze({difficultyMode:dbBeta01DifficultyMode,syncDifficultyAtmosphere:dbBeta01SyncDifficultyAtmosphere});

  let db322DialogPending=null;
  function diceboundConfirm(message,{title='Confirm',confirmLabel='Confirm',cancelLabel='Cancel',danger=false}={}){
    const overlay=$('appConfirmOverlay'),heading=$('appConfirmTitle'),body=$('appConfirmMessage'),yes=$('appConfirmAccept'),no=$('appConfirmCancel');
    if(!overlay||!heading||!body||!yes||!no)return Promise.resolve(!!dbRuntime.platform?.confirm?.(String(message)));
    if(db322DialogPending){db322DialogPending(false);db322DialogPending=null;}
    heading.textContent=String(title);body.textContent=String(message);yes.textContent=String(confirmLabel);no.textContent=String(cancelLabel);yes.classList.toggle('danger',!!danger);overlay.classList.remove('hidden');
    return new Promise(resolve=>{
      const finish=value=>{if(!db322DialogPending)return;overlay.classList.add('hidden');yes.onclick=null;no.onclick=null;overlay.onclick=null;document.removeEventListener('keydown',onKey,true);const done=db322DialogPending;db322DialogPending=null;done(!!value);};
      const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(false);}else if(e.key==='Enter'&&!e.repeat){e.preventDefault();finish(true);}};
      db322DialogPending=resolve;yes.onclick=()=>finish(true);no.onclick=()=>finish(false);overlay.onclick=e=>{if(e.target===overlay)finish(false);};document.addEventListener('keydown',onKey,true);setTimeout(()=>no.focus?.(),0);
    });
  }
  const DiceboundTouchInfo=(()=>{
    let armed=null,armedUntil=0,suppress=null,timer=null;const pop=()=>$('touchTipPopover');const textFor=el=>el?.dataset?.tip||el?.getAttribute?.('title')||'';
    function hide(){const p=pop();p?.classList.add('hidden');if(p)p.textContent='';clearTimeout(timer);}
    function show(el){const text=textFor(el);if(!text)return;const p=pop();if(!p)return;p.textContent=text;p.classList.remove('hidden');clearTimeout(timer);timer=setTimeout(hide,5200);}
    document.addEventListener('pointerdown',e=>{if(!e.pointerType||e.pointerType==='mouse')return;const el=e.target.closest?.('[data-tip], [title]');if(!el)return;const action=el.matches?.('.action-tooltip[data-tip]');if(action){const now=Date.now();if(armed===el&&now<armedUntil){armed=null;armedUntil=0;suppress=null;hide();return;}armed=el;armedUntil=now+4500;suppress=el;show(el);return;}show(el);},true);
    document.addEventListener('click',e=>{if(!suppress)return;const el=e.target.closest?.('.action-tooltip[data-tip]');if(el===suppress){e.preventDefault();e.stopImmediatePropagation();suppress=null;}},true);
    document.addEventListener('pointerdown',e=>{const p=pop();if(p&&!p.classList.contains('hidden')&&!e.target.closest?.('[data-tip], [title]'))hide();},false);
    return Object.freeze({show,hide,textFor});
  })();
  Object.defineProperty(window,'DiceboundDialogs',{value:Object.freeze({confirm:diceboundConfirm}),configurable:false});
  Object.defineProperty(window,'DiceboundTouchInfo',{value:DiceboundTouchInfo,configurable:false});

  const DB_BETA02_STACK_BREAKPOINT=900;
  const DB_BETA02_COMPACT_BREAKPOINT=1120;
  let dbBeta02Frame=0,dbBeta02Last=null;

  function dbBeta02Number(value,fallback=0){const n=Number.parseFloat(value);return Number.isFinite(n)?n:fallback;}
  function dbBeta02CalculateBoardSize({panelWidth=0,panelHeight=0,controlsHeight=0,paddingX=0,paddingY=0,gap=12,minSize=180,maxSize=1400}={}){
    const usableWidth=Math.max(0,dbBeta02Number(panelWidth)-dbBeta02Number(paddingX));
    const usableHeight=Math.max(0,dbBeta02Number(panelHeight)-dbBeta02Number(paddingY)-dbBeta02Number(controlsHeight)-dbBeta02Number(gap));
    const raw=Math.floor(Math.min(usableWidth,usableHeight));
    if(raw<=0)return 0;
    return Math.max(Math.min(raw,dbBeta02Number(maxSize,1400)),Math.min(raw,dbBeta02Number(minSize,180)));
  }
  function dbBeta02LayoutName(width){return width<=DB_BETA02_STACK_BREAKPOINT?'stacked':width<=DB_BETA02_COMPACT_BREAKPOINT?'compact':'wide';}
  function dbBeta02HeightName(height){return height<650?'very-short':height<780?'short':'normal';}

  function dbBeta02MeasureNow(){
    const root=document.documentElement,body=document.body,app=document.querySelector('.app'),panel=document.querySelector('.game-panel'),controls=document.querySelector('.road-controls');
    const width=Math.max(0,window.innerWidth||root?.clientWidth||0),height=Math.max(0,window.innerHeight||root?.clientHeight||0),layout=dbBeta02LayoutName(width),heightMode=dbBeta02HeightName(height);
    body?.setAttribute('data-window-layout',layout);body?.setAttribute('data-window-height',heightMode);
    body?.removeAttribute('data-play-flow');body?.removeAttribute('data-travel-density');
    root?.style?.setProperty('--db-window-width',`${width}px`);root?.style?.setProperty('--db-window-height',`${height}px`);root?.style?.removeProperty('--db-road-side-width');
    const rollButton=document.getElementById('rollBtn');if(rollButton){rollButton.textContent='Roll the dice';rollButton.setAttribute('aria-label','Roll the dice');}
    let boardSize=0;
    if(layout==='stacked'){
      root?.style?.removeProperty('--db-board-size');
    }else if(panel){
      const style=typeof getComputedStyle==='function'?getComputedStyle(panel):{};
      const paddingX=dbBeta02Number(style.paddingLeft)+dbBeta02Number(style.paddingRight),paddingY=dbBeta02Number(style.paddingTop)+dbBeta02Number(style.paddingBottom),gap=dbBeta02Number(style.rowGap||style.gap,12);
      const rect=panel.getBoundingClientRect?.()||{};
      boardSize=dbBeta02CalculateBoardSize({panelWidth:panel.clientWidth||rect.width||0,panelHeight:panel.clientHeight||rect.height||0,controlsHeight:controls?.offsetHeight||controls?.getBoundingClientRect?.().height||0,paddingX,paddingY,gap});
      if(boardSize>0)root?.style?.setProperty('--db-board-size',`${boardSize}px`);
    }
    const result=Object.freeze({width,height,layout,heightMode,boardSize,appWidth:app?.clientWidth||0,panelWidth:panel?.clientWidth||0,panelHeight:panel?.clientHeight||0});
    dbBeta02Last=result;
    if(typeof gameStarted!=='undefined'&&gameStarted&&typeof placePawn==='function')requestAnimationFrame(()=>{try{placePawn(false);}catch(_){}});
    return result;
  }
  function dbBeta02Schedule(){if(dbBeta02Frame)cancelAnimationFrame(dbBeta02Frame);dbBeta02Frame=requestAnimationFrame(()=>{dbBeta02Frame=0;dbBeta02MeasureNow();});}

  window.addEventListener('resize',dbBeta02Schedule,{passive:true});
  window.addEventListener('orientationchange',dbBeta02Schedule,{passive:true});
  document.addEventListener('fullscreenchange',dbBeta02Schedule,true);
  if(typeof ResizeObserver!=='undefined'){
    const observer=new ResizeObserver(dbBeta02Schedule);
    for(const el of [document.querySelector('.app'),document.querySelector('.game-panel'),document.querySelector('.road-controls'),document.querySelector('.topbar')])if(el)observer.observe(el);
  }
  setTimeout(dbBeta02Schedule,0);
  window.DiceboundResponsive=Object.freeze({apiVersion:2,calculateBoardSize:dbBeta02CalculateBoardSize,layoutName:dbBeta02LayoutName,heightName:dbBeta02HeightName,measure:dbBeta02MeasureNow,schedule:dbBeta02Schedule,diagnostics:()=>dbBeta02Last});

  // real combat and Steal implementations instead of reimplementing formulas.
  Object.defineProperty(window,'DiceboundBeta021Test',{configurable:true,value:Object.freeze({
    rageDamage(missing=.40){
      meta.unlocks.berserker=true;resetPlayer('berserker');player.maxHp=100;player.hp=Math.max(1,100-Math.round(clamp(missing,0,.99)*100));
      const enemy={name:'Rage Dummy',hp:1000,maxHp:1000,defense:0,poisonStacks:0},dealt=damageEnemy(enemy,100,true);
      return {missing:Math.round((1-player.hp/player.maxHp)*100),dealt};
    },
    roguePowerChance(luck=1){return dbClasses.roguePowerStealChance(luck);},
    async rogueStealTrial(seed='beta021-rogue'){
      meta.unlocks.rogue=true;resetPlayer('rogue');player.luck=1;currentEnemies=[{name:'Pocket Dummy',hp:1000,maxHp:1000,attack:1,defense:0,gold:0,xp:0,weakness:'fire'}];currentEnemy=currentEnemies[0];currentEnemyIndex=0;currentEncounterLead=currentEnemy;combatBusy=false;player.rogueStealUsed=false;
      const before=Object.values(player.upgradeCounts||{}).reduce((n,v)=>n+(Number(v)||0),0),oldResponse=resolveEnemyResponse,snap=window.DiceboundRng?.snapshot?.();
      resolveEnemyResponse=async()=>{combatBusy=false;};window.DiceboundRng?.seed?.(seed);
      try{await dbClasses.rogueSteal();const after=Object.values(player.upgradeCounts||{}).reduce((n,v)=>n+(Number(v)||0),0);return {stolePowerup:after>before,before,after,gold:player.gold,potions:player.potions,luck:player.luck,powerChance:dbClasses.roguePowerStealChance(player.luck),rng:window.DiceboundRng?.snapshot?.(),stealRoll:player._beta021LastStealPower||null,text:$('combatText')?.textContent||''};}
      finally{resolveEnemyResponse=oldResponse;if(snap)window.DiceboundRng?.restore?.(snap);combatBusy=false;}
    },
    ui(){return {systemGuide:[...document.querySelectorAll('#startOverlay .rule')].some(el=>/Systems guide/i.test(el.textContent||'')),petChooser:!!window.DiceboundPetChooser,classGrid:!!document.getElementById('classGrid')};}
  })});

  document.title='Dicebound: Beta v0.4.9';
  const db04Brand=document.querySelector('.brand h1');if(db04Brand)db04Brand.textContent='Dicebound: Beta v0.4.9';
  const db04Sub=document.querySelector('.brand p');if(db04Sub)db04Sub.textContent='Beta v0.4.9 · integrated icon art, custom-sound prep and a real volume slider.';

  /* Ranger identity: each qualifying hit establishes exactly one Mark.
     Echoes are separate strikes, never multi-Mark packets. */

  /* Debug progression shortcut. This is intentionally a late owner so older
     layered debugAction implementations cannot swallow it. */

  /* Native file-save affordance. Hidden in the secondary browser build. */
  function beta04SyncNativeControls(){
    const btn=document.getElementById('saveFolderBtn'),supported=!!dbRuntime.platform?.capabilities?.openSaveFolder;
    if(btn){btn.hidden=!supported;btn.title=supported?'Open %LOCALAPPDATA%\\Dicebound\\saves in File Explorer':'Available in the native Windows wrapper';}
    document.body?.setAttribute('data-runtime-kind',dbRuntime.platform?.kind||'browser');
    return supported;
  }
  document.getElementById('saveFolderBtn')?.addEventListener('click',()=>{
    try{const ok=dbRuntime.platform?.openSaveFolder?.();if(ok&&typeof ok.then==='function')ok.then(v=>showToast(v?'📂 Save folder opened':'Could not open save folder'));else showToast(ok?'📂 Save folder opened':'Could not open save folder');}
    catch(e){showToast('Could not open save folder');dbRuntime.platform?.log?.('error','Open Save Folder failed',{message:e?.message||String(e)});}
  });

  /* Board art is now the world, not an image trapped inside board-wrap. The
     existing applyRunTheme owner still selects the correct one of six images;
     CSS paints --run-scene-image over the full native/browser viewport. */
  function beta04SyncWorldScene(){
    const mode=hellMode?'hell':nightmareMode?'nightmare':'normal',level=boardLevel||1;
    const scene=window.DiceboundAssets?.resolveBoardBackground?.(level);
    const root=document.documentElement?.style,layer=document.getElementById('worldSceneLayer');
    if(scene?.image){
      const sceneUrl=`url("${scene.image}")`;
      root?.setProperty('--run-scene-image',sceneUrl);
      root?.setProperty('--run-scene-focus',scene.focus||'50% 50%');
      if(layer){layer.style.backgroundImage=sceneUrl;layer.style.backgroundPosition=scene.focus||'50% 50%';layer.dataset.board=String(level);}
    }
    document.body?.setAttribute('data-run-mode',mode);
    document.body?.setAttribute('data-world-board',String(level));
    return {mode,board:level,image:scene?.image||null};
  }
  setTimeout(beta04SyncWorldScene,0);

  /* Responsive HUD flow. The board and cards get different arrangements for
     stacked, rail, expanded, and short-landscape windows. */
  let beta04HudFrame=0,beta04HudLast='';
  function beta04HudMode(){
    const w=window.innerWidth||document.documentElement.clientWidth||0,h=window.innerHeight||document.documentElement.clientHeight||0;
    if(w<=900)return 'stacked';
    if(h<780&&w>=901)return w>=1260?'landscape-3':'landscape-2';
    if(w>=1550)return 'expanded';
    return 'rail';
  }
  function beta04SyncHud(){
    beta04HudFrame=0;const mode=beta04HudMode();beta04HudLast=mode;document.body?.setAttribute('data-hud-flow',mode);
    window.DiceboundResponsive?.schedule?.();beta042SyncSidebarLayout();return mode;
  }
  function beta04ScheduleHud(){if(beta04HudFrame)cancelAnimationFrame(beta04HudFrame);beta04HudFrame=requestAnimationFrame(beta04SyncHud);}
  window.addEventListener('resize',beta04ScheduleHud,{passive:true});window.addEventListener('orientationchange',beta04ScheduleHud,{passive:true});document.addEventListener('fullscreenchange',beta04ScheduleHud,true);

  setTimeout(()=>{beta04SyncNativeControls();beta04SyncWorldScene();beta04SyncHud();},0);

  Object.defineProperty(window,'DiceboundBeta04Test',{configurable:true,value:Object.freeze({
    rangerMarkGain:async function({echo=false,start=0,cap=5}={}){
      meta.unlocks.ranger=true;resetPlayer('ranger');player.rangerMarkMax=cap;gameStarted=true;
      const enemy={name:'Mark Dummy',icon:'🎯',hp:1000000,maxHp:1000000,attack:0,defense:0,gold:0,xp:0,weakness:'fire',rangerMarks:start,poisonStacks:0,enemyBarrier:0,dodge:0};
      currentEnemies=[enemy];currentEnemy=currentEncounterLead=enemy;currentEnemyIndex=0;
      const result=await dbCombat.strike(enemy,{echo,index:echo?1:0});
      return {before:start,after:enemy.rangerMarks||0,gain:(enemy.rangerMarks||0)-start,cap:player.rangerMarkMax||3,dodged:!!result?.dodged};
    },
    unlockHell(){meta.nightmareUnlocked=false;meta.hellUnlocked=false;debugAction('unlock_hell');return {nightmare:!!meta.nightmareUnlocked,hell:!!meta.hellUnlocked};},
    hudMode:beta04HudMode,
    nativeControls:()=>({kind:dbRuntime.platform?.kind||'browser',saveFolderVisible:!document.getElementById('saveFolderBtn')?.hidden,supported:!!dbRuntime.platform?.capabilities?.openSaveFolder}),
    world:beta04SyncWorldScene
  })});

  function beta042CampSummary(){
    const parts=[`Legacy Lv ${meta.level}`,`${meta.points||0} unspent`,`Prestige ${meta.prestige?.count||0}`];
    if(meta.doubleDiceUnlocked)parts.push('Double Dice ready');
    return parts.join(' · ');
  }
  let beta042SidebarFrame=0,beta042SidebarObserver=null;
  function beta042SidebarSnapshot(){
    const sidebar=document.querySelector('.sidebar'),character=$('characterCard'),pet=document.querySelector('.sidebar>.pet-card'),log=document.querySelector('.sidebar>.log-card');
    const gap=sidebar&&typeof getComputedStyle==='function'?Number.parseFloat(getComputedStyle(sidebar).gap)||10:10;
    const width=sidebar?.getBoundingClientRect?.().width||0,characterHeight=character?.getBoundingClientRect?.().height||0,petHeight=pet?.getBoundingClientRect?.().height||0,logHeight=log?.getBoundingClientRect?.().height||0,columnWidth=(width-gap)/2;
    const columns=width>=560&&columnWidth>=255,mode=!columns?'stacked':characterHeight>=petHeight+80?'masonry':'paired';
    return Object.freeze({mode,width,columnWidth,characterHeight,petHeight,logHeight,gap});
  }
  function beta042EnsureSidebarObserver(){
    if(beta042SidebarObserver||typeof ResizeObserver==='undefined')return;
    beta042SidebarObserver=new ResizeObserver(()=>beta042ScheduleSidebarLayout());
    for(const el of [document.querySelector('.sidebar'),$('characterCard'),document.querySelector('.sidebar>.pet-card'),document.querySelector('.sidebar>.log-card')])if(el)beta042SidebarObserver.observe(el);
  }
  function beta042SyncSidebarLayout(){
    beta042SidebarFrame=0;
    const hasSet=typeof mythicalSetCount==='function'&&mythicalSetCount()>0,snapshot=beta042SidebarSnapshot();
    document.body?.setAttribute('data-sidebar-companion',hasSet?'below':'adjacent');
    document.body?.setAttribute('data-sidebar-flow',snapshot.mode);
    beta042EnsureSidebarObserver();
    return Object.freeze({...snapshot,hasSet});
  }
  function beta042ScheduleSidebarLayout(){if(beta042SidebarFrame)cancelAnimationFrame(beta042SidebarFrame);beta042SidebarFrame=requestAnimationFrame(beta042SyncSidebarLayout);}
  const dbInputRouter=window.DiceboundInputRouter;
  if(!dbInputRouter?.configure)throw new Error("DiceBound requires the app input router before dicebound.js");
  const dbOptionsUi=window.DiceboundOptionsUi?.configure({
    find:$,
    getSettings:()=>({muted,masterVolume:meta.settings?.masterVolume??.70,soundPack:meta.settings?.soundPack||'synth',characterLayout:meta.settings?.characterLayout==='classic'?'classic':'modern',floatingCombatNumbers:meta.settings?.floatingCombatNumbers!==false,fastWheelSlots:!!meta.settings?.fastWheelSlots,fastWheelSlotsUnlocked:dbProgression.hasAnyBoardClear(6)}),
    nativeSaveSupported:()=>!!dbRuntime.platform?.capabilities?.openSaveFolder,
    debugBundleSupported:()=>!!dbRuntime.debugBundle?.supported?.(),
    getDebugReport:()=>dbRuntime.debugBundle?.report?.()||null,
    exportDebugBundle:options=>dbRuntime.debugBundle?.exportBundle?.(options),
    openSaveFolder:()=>{const button=$('saveFolderBtn');button?.click();return !!button;},
    toggleMuted:()=>{$('muteBtn')?.click();return muted;},
    setVolume:value=>{meta.settings=meta.settings||defaultSettings();meta.settings.masterVolume=clamp(Number(value),0,1);saveMeta();return meta.settings.masterVolume;},
    setSoundPack:pack=>{meta.settings=meta.settings||defaultSettings();meta.settings.soundPack=pack==='custom'?'custom':'synth';saveMeta();return meta.settings.soundPack;},
    setCharacterLayout:value=>{meta.settings=meta.settings||defaultSettings();meta.settings.characterLayout=value==='classic'?'classic':'modern';saveMeta();dbEquipmentUi.syncCharacterLayout?.();dbEquipmentUi.renderEquipment?.();return meta.settings.characterLayout;},
    setFloatingCombatNumbers:value=>{meta.settings=meta.settings||defaultSettings();meta.settings.floatingCombatNumbers=!!value;saveMeta();return meta.settings.floatingCombatNumbers;},
    setFastWheelSlots:value=>{if(!dbProgression.hasAnyBoardClear(6))return false;meta.settings=meta.settings||defaultSettings();meta.settings.fastWheelSlots=!!value;saveMeta();return meta.settings.fastWheelSlots;},
    playPreview:()=>{try{sfx.coin();}catch(_){}},
    resetProgress:()=>window.DiceboundTalentTree?.resetProgress?.()
  });
  dbInputRouter.configure({
    getDocument:()=>document,
    getWindow:()=>window,
    openOptions:()=>dbOptionsUi?.open?.(),
    handleRoadKeydown:event=>dbRunDice.handleRoadKeydown(event)
  });
  dbInputRouter.bind();
  function beta042EnsureCampOptions(){return window.DiceboundCamp?.ensureOptionsButton();}
  function beta042RefreshCampAndHud(){
    dbOptionsUi?.ensureTopAction?.();
    dbOptionsUi?.sync?.();
    beta042SyncSidebarLayout();
    const scene=$('campScene');
    if(scene){
      beta042EnsureCampOptions();
      const legacy=$('campLegacyLine');if(legacy)legacy.textContent=beta042CampSummary();
      const petLine=$('campPetLine');if(petLine){petLine.textContent='';petLine.hidden=true;}
      const resetBtn=$('campResetProgressBtn');if(resetBtn)resetBtn.remove();
      window.DiceboundCamp?.refreshArt?.();
    }
  }

  let beta042RefreshFrame=0;
  function beta042ScheduleRefresh(){
    if(beta042RefreshFrame)return;
    beta042RefreshFrame=requestAnimationFrame(()=>{beta042RefreshFrame=0;beta042RefreshCampAndHud();});
  }
  const beta042Observer=(typeof MutationObserver==='function')?new MutationObserver(()=>beta042ScheduleRefresh()):null;
  if(beta042Observer&&document.body)beta042Observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  document.addEventListener('click',beta042ScheduleRefresh,true);
  window.addEventListener('resize',beta042ScheduleRefresh,{passive:true});
  setTimeout(beta042RefreshCampAndHud,0);

  function beta043AssetEntry(key){return window.DiceboundAssets?.resolveUiIcon?.(key)||null;}
  function beta043Art(key,label='',className='db-art-inline'){
    const entry=beta043AssetEntry(key);
    if(!entry?.image)return '';
    const alt=(label||entry.alt||key||'').replace(/"/g,'&quot;');
    return `<img class="db-art-icon ${className}" src="${entry.image}" alt="${alt}">`;
  }
  function beta043ReplaceByName(list,name,key,klass='db-art-choice'){
    const entry=list?.find?.(x=>x&&x.name===name);
    if(entry)entry.icon=beta043Art(key,name,klass)||entry.icon;
  }
  function beta043ApplyArtMutations(){
    if(beta043ApplyArtMutations.done)return;beta043ApplyArtMutations.done=true;
    beta043ReplaceByName(upgrades,'Heavy Purse','heavyPurse');
    beta043ReplaceByName(upgrades,'Quickdraw','quickdraw');
    beta043ReplaceByName(upgrades,'Glass Needle','glassNeedle');
    const richGoldIds=new Set(['gold','treasure_sense_common_v25','treasure_sense_uncommon_v25']);

    Object.values(ENEMY_REGISTRY||{}).forEach(e=>{
      if(!e?.name)return;

    });
  }
  beta043ApplyArtMutations();

  v17OpenLegendaryChoice=function(source,onComplete=()=>{}){
    return dbPowerups.openLegendary(source,onComplete);
  };

  Object.defineProperty(window,'DiceboundBeta044Test',{configurable:true,value:Object.freeze({
    classBaseHp:()=>Object.fromEntries(Object.values(CLASSES).map(c=>[c.id,c.base.maxHp])),
    cultistRates:()=>({normal:.01,nightmare:.10,hell:.20}),
    sovereignUsesFinalChooser:()=>String(v17OpenLegendaryChoice).includes('showLegendaryChoice')
  })});

  // ----- Version-visible cosmetics ----------------------------------------
  document.title='Dicebound: Beta v0.4.5';
  const db045Brand=document.querySelector('.brand h1');if(db045Brand)db045Brand.textContent='Dicebound: Beta v0.4.5';
  const db045Sub=document.querySelector('.brand p');if(db045Sub)db045Sub.textContent='Beta v0.4.5 · board balance pass, camp layout cleanup and harness-driven class ordering.';

  function beta045UiIconArt(key,label='',klass='db-art-inline'){
    const entry=window.DiceboundAssets?.resolveUiIcon?.(key)||null;
    if(!entry?.image)return '';
    const alt=(label||entry.alt||key||'').replace(/"/g,'&quot;');
    return `<img class="db-art-icon ${klass}" src="${entry.image}" alt="${alt}">`;
  }
  function beta045EnemyArtForName(name){
    if(/bandit/i.test(name||''))return beta045UiIconArt('bandit',name,'db-art-portrait');
    if(/troll/i.test(name||''))return beta045UiIconArt('troll',name,'db-art-portrait');
    return '';
  }

  // ----- Base HP pass + displayed stat refresh ----------------------------
  if(!window.__db045BaseHpApplied){
    window.__db045BaseHpApplied=true;
    Object.values(CLASSES||{}).forEach(cls=>{
      if(!cls?.base||!Number.isFinite(cls.base.maxHp))return;
      const before=Math.round(cls.base.maxHp);
      const after=Math.max(before+1,Math.round(before*1.15));

    });
  }

  // ----- Board pass: ensure late boards climb cleanly ---------------------
  if(typeof db317Board==='function'){
    const beta045Board6=db317Board(6),beta045Board5=db317Board(5),beta045Board4=db317Board(4),beta045Board3=db317Board(3),beta045Board2=db317Board(2);
    if(beta045Board2){beta045Board2.entryHeal=.14;beta045Board2.entryPotions=1;}
    if(beta045Board3){beta045Board3.entryHeal=.20;beta045Board3.entryPotions=1;}
    if(beta045Board4){beta045Board4.entryHeal=.28;beta045Board4.entryPotions=2;}
    if(beta045Board5){beta045Board5.entryHeal=.24;beta045Board5.entryPotions=2;beta045Board5.extraHp=.38;beta045Board5.extraAttack=.26;beta045Board5.extraDefense=5;beta045Board5.threePackChance=.30;}
    if(beta045Board6){beta045Board6.entryHeal=.30;beta045Board6.entryPotions=2;beta045Board6.extraHp=Math.max(beta045Board6.extraHp||0,.48);beta045Board6.extraAttack=Math.max(beta045Board6.extraAttack||0,.34);beta045Board6.extraDefense=Math.max(beta045Board6.extraDefense||0,6);}
  }

  // ----- Bandit / troll board presentation fallback -----------------------

  // ----- Sovereign / Contract hardening -----------------------------------

  function db0410LegendaryChoices(){return dbPowerups.legendaryChoices();}
  function db0410EnsureSovereignOverlay(){
    let overlay=$('sovereignChoiceOverlay');if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='sovereignChoiceOverlay';overlay.className='overlay hidden';
    overlay.innerHTML='<div class="modal sovereign-choice-modal"><h2 id="sovereignChoiceTitle">👑 Sovereign Relic</h2><p class="subtitle" id="sovereignChoiceSubtitle">Choose one Legendary power. The purchase is already paid for.</p><div class="sovereign-choice-grid" id="sovereignChoiceGrid"></div></div>';
    document.body.appendChild(overlay);return overlay;
  }
  function db0410OpenSovereignChoice(source,onComplete=()=>{}){
    const overlay=db0410EnsureSovereignOverlay(),grid=$('sovereignChoiceGrid'),title=$('sovereignChoiceTitle'),subtitle=$('sovereignChoiceSubtitle'),choices=db0410LegendaryChoices();
    title.textContent=`👑 ${source}`;subtitle.textContent='Choose one of up to three eligible Legendary powers. There is no random auto-pick.';grid.innerHTML='';
    if(!choices.length){const box=document.createElement('div');box.className='merchant-notice show';box.textContent='No eligible Legendary powers remain for this class this run. The purchase will be refunded.';grid.appendChild(box);overlay.classList.remove('hidden');setTimeout(()=>{overlay.classList.add('hidden');onComplete(false);},700);return;}
    let settled=false;
    choices.forEach(up=>{const btn=document.createElement('button');btn.type='button';btn.className='choice-btn legendary';btn.innerHTML=choiceHTML(up);btn.addEventListener('click',()=>{if(settled)return;settled=true;dbPowerups.apply(up,source);addLog(`<b>${source}:</b> chose <b>${up.name}</b>.`);showToast(`Legendary: ${up.name}`);overlay.classList.add('hidden');updateHUD();onComplete(up);},{once:true});grid.appendChild(btn);});
    $('merchantOverlay')?.classList.add('hidden');overlay.classList.remove('hidden');
  }

  // Merchant subsystem composition: focused stock, transaction and UI owners live
  // behind one ordinary public DiceboundMerchant boundary.
  dbMerchant=dbMerchantOwner.configure({
    stock:{
      getPlayer:()=>player,getBoardLevel:()=>boardLevel,random:()=>random(),pick:list=>pick(list),
      rollGearRarity:bonus=>dbItems.rollGearRarity(bonus),generateEquipment:(rarity,slot)=>dbItems.generateEquipment(rarity,slot),
      rawSellValue:item=>dbItems.rawSellValue(item),equipItem:item=>dbItems.equip(item),formatBonuses:item=>dbItems.formatBonuses(item),
      getSlotLabel:slot=>SLOT_LABELS[slot],clamp:(value,min,max)=>clamp(value,min,max),eligibleUpgrades:filter=>dbPowerups.eligible(filter),
      isPowerupRarityAtLeast:(rarity,floor)=>DB_RARITIES.isPowerupRarityAtLeast(rarity,floor),
      applyUpgrade:(up,source)=>dbPowerups.apply(up,source),applyRandomHighRarity:(source,announce)=>dbPowerups.applyRandomHighRarity(source,announce)
    },
    state:{
      getItems:()=>currentMerchantItems,setItems:value=>{currentMerchantItems=value;},
      getNotice:()=>currentMerchantNotice,setNotice:value=>{currentMerchantNotice=value;},
      setTitle:value=>{$('merchantTitle').textContent=value;},setSubtitle:value=>{$('merchantSubtitle').textContent=value;},
      setVisible:visible=>$('merchantOverlay').classList.toggle('hidden',!visible)
    },
    ui:{
      $:id=>$(id),getPlayer:()=>player,
      formatGearComparison:(item,current)=>dbItems.formatComparison(item,current),gearNameMarkup:item=>window.DiceboundEquipmentHeirlooms.rarityNameMarkup(item),gearPowerScore:item=>dbItems.score(item),
      confirmWeakerGear:(gear,current)=>diceboundConfirm(`${gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`,{title:'Buy weaker gear?',confirmLabel:'Buy anyway',danger:true}),
      chargeOffer:(item,price)=>{player.gold-=price;dbProgression.recordGoldSpent(price);statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);},
      refundOffer:price=>{player.gold+=price;},applyOffer:item=>item.buy?.(),
      recordRunBuff:item=>recordRunBuff(item.icon,item.name,item.desc,'merchant','Merchant'),formatBonuses:item=>formatBonuses(item),
      rarityInfoFor:rarity=>rarityInfo[rarity],showToast:(...args)=>showToast(...args),updateHud:()=>updateHUD(),
      openLegendaryChoice:(source,done)=>db0410OpenSovereignChoice(source,done),schedule:(fn,ms)=>setTimeout(fn,ms)
    },
    secret:{
      isFaceActivated:index=>merchantFaceClicks.has(index),
      activateFace:index=>{
        const before=merchantFaceClicks.size;merchantFaceClicks.add(index);const count=merchantFaceClicks.size;
        const primedNow=count>=merchantFaceTotal&&!merchantBossDefeatedThisBoard&&!merchantBossPrimed;
        if(primedNow)merchantBossPrimed=true;
        return {count,total:merchantFaceTotal,added:count>before,primedNow};
      },
      toast:(...args)=>showToast(...args),log:text=>addLog(text)
    }
  });

  window.DiceboundMerchantTransactionTest=Object.freeze({
    prepareSovereign:()=>{
      player.gold=99999;currentMerchantNotice='';currentMerchantItems=[{id:'merchant-transaction-sovereign',icon:'C',name:'Sovereign Relic',desc:'Choose one Legendary power.',base:1,sold:false,alphaChooseLegendary:true,buy(){return null;}}];dbMerchant.testing.createVisitForCurrentStock();$('merchantOverlay').classList.remove('hidden');dbMerchant.render();return window.DiceboundMerchantTransactionTest.state();
    },
    attemptDelayedReopen:()=>{
      const stock=currentMerchantItems,result=dbMerchant.open();return {result,sameStock:stock===currentMerchantItems,state:window.DiceboundMerchantTransactionTest.state()};
    },
    state:()=>({visit:dbMerchant.testing.snapshotVisit(),merchantHidden:$('merchantOverlay').classList.contains('hidden'),choiceVisible:!$('sovereignChoiceOverlay')?.classList.contains('hidden'),items:currentMerchantItems.map(item=>({id:item.id,sold:!!item.sold}))})
  });

  // ----- Simple diagnostics for the harness/tooling layer -----------------

  document.title='Dicebound: Beta v0.4.6';
  const db046Brand=document.querySelector('.brand h1');if(db046Brand)db046Brand.textContent='Dicebound: Beta v0.4.6';
  const db046Sub=document.querySelector('.brand p');if(db046Sub)db046Sub.textContent='Beta v0.4.6 · missing art restored, camp centered, haste anti-lock tightened, and a full board balance pass.';

  function db046UiArt(key,label='',klass='db-art-inline'){
    const entry=window.DiceboundAssets?.resolveUiIcon?.(key)||null;
    if(!entry?.image)return '';
    const alt=(label||entry.alt||key||'').replace(/"/g,'&quot;');
    return `<img class="db-art-icon ${klass}" src="${entry.image}" alt="${alt}">`;
  }
  function db046EnemyArtForName(name){
    if(/bandit/i.test(name||''))return db046UiArt('bandit',name,'db-art-portrait');
    if(/troll/i.test(name||''))return db046UiArt('troll',name,'db-art-portrait');
    return '';
  }

  // Ensure the uploaded art assets are actually used in live UI.
  function db046ApplyAssetBindings(){
    const glass=upgrades?.find?.(u=>u&&u.name==='Glass Needle');
    if(glass)glass.icon=db046UiArt('glassNeedle','Glass Needle','db-art-choice')||glass.icon;
    Object.values(ENEMY_REGISTRY||{}).forEach(e=>{
      if(!e?.name)return;
      const art=db046EnemyArtForName(e.name);

    });
  }
  db046ApplyAssetBindings();

  // Alchemist's final shipped unlock copy is presentation only; resolution lives in class-unlock-rules.

  if(window.DiceboundV16Debug?.prepareAlchemist)window.DiceboundV16Debug.prepareAlchemist=()=>{meta.stats.potionsUsed=15;dbProgression.checkDynamicClassUnlocks();window.DiceboundClassChooser.render();return dbProgression.isClassUnlocked('alchemist');};

  // Hard anti-lock: only one haste skip can be banked before an enemy actually acts.
  // Coffee still deals damage, but if Haste has already been granted in this response chain,
  // additional coffee procs cannot create another skipped enemy response.

  window.DiceboundBeta046Debug=Object.freeze({
    boardTuning:()=>({
      2:{entryHeal:db317Board?.(2)?.entryHeal,entryPotions:db317Board?.(2)?.entryPotions},
      3:{entryHeal:db317Board?.(3)?.entryHeal,entryPotions:db317Board?.(3)?.entryPotions},
      4:{entryHeal:db317Board?.(4)?.entryHeal,entryPotions:db317Board?.(4)?.entryPotions},
      5:{entryHeal:db317Board?.(5)?.entryHeal,entryPotions:db317Board?.(5)?.entryPotions},
      6:{entryHeal:db317Board?.(6)?.entryHeal,entryPotions:db317Board?.(6)?.entryPotions}
    }),
    hasteState:()=>({turns:player.hasteTurns||0,cooldown:player.hasteCooldown||0,locked:!!player._db046HasteLocked}),
    alchemist:()=>({potionsUsed:meta.stats?.potionsUsed||0,unlocked:!!meta.unlocks?.alchemist,threshold:15})
  });

  document.title='Dicebound: Beta v0.4.7';
  const db047Brand=document.querySelector('.brand h1');if(db047Brand)db047Brand.textContent='Dicebound: Beta v0.4.7';
  const db047Sub=document.querySelector('.brand p');if(db047Sub)db047Sub.textContent='Beta v0.4.7 · requested icon fixes, centered camp, tougher Board 5, haste anti-lock and Alchemist at 15 potions.';

  function db047UiArt(key,label='',klass='db-art-inline'){
    const entry=window.DiceboundAssets?.resolveUiIcon?.(key)||null;
    if(!entry?.image)return '';
    const alt=(label||entry.alt||key||'').replace(/"/g,'&quot;');
    return `<img class="db-art-icon ${klass}" src="${entry.image}" alt="${alt}">`;
  }
  function db047ApplyKnownArt(){
    const bandit=db047UiArt('bandit','Bandit','db-art-portrait');
    const troll=db047UiArt('troll','Troll','db-art-portrait');
    const glass=db047UiArt('glassNeedle','Glass Needle','db-art-choice');
    if(window.ENEMY_REGISTRY){
      Object.values(ENEMY_REGISTRY).forEach(enemy=>{
        const name=(enemy?.name||'').toLowerCase();
        if(name.includes('bandit'))enemy.icon=bandit||enemy.icon;
        if(name.includes('troll'))enemy.icon=troll||enemy.icon;
      });
    }
    if(Array.isArray(window.upgrades)){
      window.upgrades.forEach(up=>{

      });
    }
  }
  db047ApplyKnownArt();

  // --- haste anti-lock: never queue more than one skipped response ---------

  document.title='Dicebound: Beta v0.4.9';
  const db048Brand=document.querySelector('.brand h1');if(db048Brand)db048Brand.textContent='Dicebound: Beta v0.4.9';
  const db048Sub=document.querySelector('.brand p');if(db048Sub)db048Sub.textContent='Beta v0.4.9 · compact travel controls, better board space, smaller enemy art and cleaner pack icons.';

  // Travel height changed; make the responsive controller immediately
  // recalculate the board instead of waiting for the next manual resize.
  setTimeout(()=>window.DiceboundResponsive?.schedule?.(),0);

  document.title='Dicebound: Beta v0.4.9';
  const db049Brand=document.querySelector('.brand h1');if(db049Brand)db049Brand.textContent='Dicebound: Beta v0.4.9';
  const db049Sub=document.querySelector('.brand p');if(db049Sub)db049Sub.textContent='Beta v0.4.9 · troll/bandit battle art, all-pack counters, slimmer travel box and restored Glass Needle art.';

  function db049UiArt(key,label='',klass='db-art-inline'){
    const entry=window.DiceboundAssets?.resolveUiIcon?.(key)||null;
    if(!entry?.image)return '';
    const alt=(label||entry.alt||key||'').replace(/"/g,'&quot;');
    return `<img class="db-art-icon ${klass}" src="${entry.image}" alt="${alt}">`;
  }
    function db049ApplyArtBindings(){
    const glass=db049UiArt('glassNeedle','Glass Needle','db-art-choice db-art-glass-needle');
    if(Array.isArray(window.upgrades))window.upgrades.forEach(up=>{});
    if(window.ENEMY_REGISTRY){
      Object.values(ENEMY_REGISTRY).forEach(enemy=>{
        const name=(enemy?.name||'').toLowerCase();
        if(name.includes('bandit'))enemy.icon=db049UiArt('bandit',enemy.name,'db-art-portrait')||enemy.icon;
        if(name.includes('troll'))enemy.icon=db049UiArt('troll',enemy.name,'db-art-portrait')||enemy.icon;
      });
    }
  }
  db049ApplyArtBindings();
  setTimeout(db049ApplyArtBindings,0);

  // Travel width changed; immediately offer the reclaimed space to the square board.
  setTimeout(()=>window.DiceboundResponsive?.schedule?.(),0);

  document.title='Dicebound: Beta v0.5.12';
  const db050Brand=document.querySelector('.brand h1');if(db050Brand)db050Brand.textContent='Dicebound: Beta v0.5.10';
  const db050Sub=document.querySelector('.brand p');if(db050Sub)db050Sub.textContent='Beta v0.5.12 · campsite placement and expanded achievement-gated Epic/Legendary progression.';

  // Layout geometry changed: immediately let the board claim the reclaimed pixels.
  setTimeout(()=>window.DiceboundResponsive?.schedule?.(),0);

  function db059PetArtEntry(petId){
    const id=String(petId||'neutral');
    return window.DiceboundAssets?.manifest?.pets?.[id]||null;
  }
  function db059SetPetArt(el,petId,extraClass='',context='portrait'){
    if(!el)return;
    const def=PETS[petId]||PETS.neutral,entry=db059PetArtEntry(def.id);
    if(!entry){el.innerHTML='';el.textContent=def.icon||'🐾';return;}
    const src=entry?.[context]||entry?.portrait;
    let img=el.querySelector(':scope > img.db059-pet-art');
    if(!img){el.innerHTML='';img=document.createElement('img');el.appendChild(img);}
    img.className=`db059-pet-art ${extraClass}`.trim();img.alt=def.name;img.draggable=false;
    if(img.getAttribute('src')!==src)img.src=src;
    img.onerror=()=>{img.remove();el.textContent=def.icon||'🐾';};
  }
  function db059RefreshActivePetArt(){
    const id=meta?.activePet||'neutral',def=PETS[id]||PETS.neutral;
    db059SetPetArt($('petAvatar'),def.id);
    db059SetPetArt($('combatPet'),def.id,'','battle');
    const combat=$('combatPet');if(combat)combat.dataset.name=def.name;
  }
  setTimeout(db059RefreshActivePetArt,0);

  function v319ResetCareer(){
    dbRuntime.save?.reset?.();
    meta=normalizeCareerMeta(normalizeMetaCore(defaultMeta()));
    dbProgression.careerStats();
    selectedClassId='ranger';boardLevel=1;nightmareMode=false;hellMode=false;gameStarted=false;rollLocked=true;combatBusy=false;pendingLevelUps=0;currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;tiles=[];tileEls=[];
    return meta;
  }
  function v319BoardDigest(){return tiles.map((t,i)=>({i,type:t?.type||null,pack:t?.packSize||1,enemy:t?.enemyBase?.name||null}));}

  // ALCHEMIST — the outside-potion DOM listener was registered against an old
  // function object before later tracking wrappers replaced usePotionOutsideCombat.
  // Capture the click and route it through the current live function instead.

  function db0511RestoreEnemyElementDebuffs(...args){return dbCombat.restoreEnemyElementDebuffs(...args);}

  // mutation/copy passes into the canonical registry during startup.
  const DB0512_GLOBAL_POWER_IDS=Object.freeze([
    'toxic_bloom','elemental_predator','mana_overflow','true_legend_attack_v24','true_legend_guard_v24',
    'legendary_star_eater_v27','legendary_venom_throne_v27','legendary_kings_ransom_v27','legendary_prismatic_choir_v27',
    'legendary_echo_crown','legendary_blood_contract','legendary_loaded_road','legendary_packbreaker','legendary_second_sun','perfected_signature'
  ]);

  document.title='Dicebound: Beta v0.5.12';
  const db314Brand=document.querySelector('.brand h1');if(db314Brand)db314Brand.textContent='Dicebound: Beta v0.5.12';
  const db0410BrandSub=document.querySelector('.brand p');if(db0410BrandSub)db0410BrandSub.textContent='Beta v0.5.12 · campsite placement and expanded achievement-gated Epic/Legendary progression.';
  window.DiceboundInfrastructure=Object.freeze({
    version:APP_IDENTITY.version,
    channel:APP_IDENTITY.channel,
    platform:()=>dbRuntime.platform?.runtimeInfo?.(),
    storage:()=>dbRuntime.storage?.diagnostics?.(),
    save:()=>dbRuntime.save?.diagnostics?.(),
    wrapper:()=>dbRuntime.platform?.wrapperDiagnostics?.(),
    load:()=>window.__DiceboundSaveLoadResult||null
  });

  // VERSION -----------------------------------------------------------------
  document.title=APP_IDENTITY.displayTitle;
  const db060Brand=document.querySelector('.brand h1');if(db060Brand)db060Brand.textContent=APP_IDENTITY.displayTitle;
  const db060Sub=document.querySelector('.brand p');if(db060Sub)db060Sub.textContent=APP_IDENTITY.subtitle;

  // 0.5.13 integration repair ------------------------------------------------
  // The original 0.5.13 handoff appended these bindings outside the runtime
  // closure. Keep the art/assets, but bind them here where the live combat and
  // camp owners actually exist.

  dbTileMetaFinalReady=true;

  // RARITY BODY -------------------------------------------------------------
  // Exact 0.6 item-power ranges. Road depth now improves rarity odds rather
  // than pushing a generated item beyond the advertised range.
  Object.keys(V14_RARITY_BUDGETS).forEach(k=>delete V14_RARITY_BUDGETS[k]);
  Object.assign(V14_RARITY_BUDGETS,{poor:[11,25],common:[26,45],uncommon:[46,70],rare:[71,105],epic:[106,150],legendary:[151,210]});
  Object.keys(V14_RARITY_AFFIX_TIER).forEach(k=>delete V14_RARITY_AFFIX_TIER[k]);
  Object.assign(V14_RARITY_AFFIX_TIER,{poor:1,common:2,uncommon:3,rare:4,epic:5,legendary:5});

  const DB060_LEGENDARY_EFFECTS=dbItemGenerationOwner.effects;
  const DB060_EFFECT_BY_ID=dbItemGenerationOwner.effectById;
  meta.legendaryEffectsDiscovered=Array.isArray(meta.legendaryEffectsDiscovered)?meta.legendaryEffectsDiscovered:[];
  dbItemGeneration=dbItemGenerationOwner.createController({
    getPlayer:()=>player,getMeta:()=>meta,getClassIdentityId:()=>classIdentityId(),slots:EQUIPMENT_SLOTS,
    rollGearRarity:bonus=>rollGearRarity(bonus),pick:list=>pick(list),random:()=>random(),clamp:(value,min,max)=>clamp(value,min,max),
    seedCode:v15SeedCode,generateFromSeedCode:v15GenerateEquipmentFromSeedCode,rarityBudgets:V14_RARITY_BUDGETS,ordinaryApi:window.DiceboundEquipment
  });
  function db060HasEffect(id){return dbItemGeneration.hasEffect(id);}

  // Generated Legendary effects count as real item value in comparisons.
  const db060FormatBonusesBase=formatBonuses;
  formatBonuses=function(item){const base=db060FormatBonusesBase(item);if(!item?.legendaryEffectId)return base;const e=DB060_EFFECT_BY_ID[item.legendaryEffectId],desc=dbItemGeneration.effectDescription(item);return `${base} · LEGENDARY EFFECT: ${e?.name||item.legendaryEffectName} — ${desc||item.legendaryEffectDesc||''}`;};

  // CURRENT NAMED LEGENDARIES -> MYTHICAL ----------------------------------
  const db060NamedMythicals=new Set(["Axel's Coffee Mug",'Kratz Headphones',"The Jean Jacket Lost at Kelly's"]);

  // ARTIFACT LOOT TABLE -----------------------------------------------------
  // One Artifact roll per guardian. A successful roll chooses EXACTLY ONE

  const DB060_ARTIFACT_TABLE=dbArtifacts.entries;
  const DB060_LOOT=window.DiceboundLoot;
  if(!DB060_LOOT)throw new Error('DiceboundLoot must load before dicebound.js');
  function db060RollArtifact(){const entry=dbArtifacts.pick(random),item=dbArtifacts.create(entry.slot);item.artifactTableSlot=entry.slot;return item;}

  // Guardian ordinary item tables. Miniboss ordinary gear is no longer a
  // 100% automatic reward on Normal: 85% Normal, 92% Nightmare, 100% Hell.
  function db060GuardianOrdinary(defeated,done){
    const drop=DB060_LOOT.ordinaryGuardianDrop({defeated,board:boardLevel,nightmare:nightmareMode,hell:hellMode,luck:player.luck,randomFn:random});
    if(!drop)return done();
    // Secret bosses keep one ordinary loot roll in addition to their signature item.
    return openLoot(drop.rarity?dbItems.generateEquipment(drop.rarity):dbItems.generateEquipment(),done);
  }

  // Secret signature item rates: 5% Normal, 10% Nightmare, 15% Hell for
  // The Final Price and Philosopher's Stone. Pale Devil Horns remain 5%.
  openCombatLootChain=function(defeated,done){
    const specials=[];
    if(defeated?.devilBoss){if(random()<DB060_LOOT.secretSignatureRate({kind:'devil',nightmare:nightmareMode,hell:hellMode})){specials.push(generateDevilsHorns());meta.devilHornsFound=(meta.devilHornsFound||0)+1;saveMeta();}}
    else if(defeated?.merchantBoss){if(random()<DB060_LOOT.secretSignatureRate({kind:'merchant',nightmare:nightmareMode,hell:hellMode})){specials.push(generateMerchantWeapon());meta.merchantOmegaDrops=(meta.merchantOmegaDrops||0)+1;saveMeta();}}
    else if(defeated?.bloodmageBoss){if(random()<DB060_LOOT.secretSignatureRate({kind:'bloodmage',nightmare:nightmareMode,hell:hellMode})){specials.push(generatePhilosophersStone());meta.bloodmageOmegaDrops=(meta.bloodmageOmegaDrops||0)+1;saveMeta();}}
    else if((defeated?.miniBoss||defeated?.finalBoss)&&random()<DB060_LOOT.artifactChance({defeated,board:boardLevel,nightmare:nightmareMode,hell:hellMode})){specials.push(db060RollArtifact());}
    const next=()=>{if(!specials.length)return db060GuardianOrdinary(defeated,done);const item=specials.shift();addLog(`<b>${(rarityInfo[item.rarity]?.label||item.rarity).toUpperCase()} ITEM!</b> ${item.name} drops from ${defeated.name}.`);sfx.holy();openLoot(item,next);};next();
  };

  // LEGENDARY EFFECT RUNTIME ------------------------------------------------
  // Remove/reapply the two effects that transform base character stats so
  // equipment swaps do not accumulate phantom values.
  function db060ClearGearTransform(){
    if(player._db060GearSwapAttackAdj){player.attack-=player._db060GearSwapAttackAdj;player._db060GearSwapAttackAdj=0;}
    if(player._db060GearSwapDefenseAdj){player.defense-=player._db060GearSwapDefenseAdj;player._db060GearSwapDefenseAdj=0;}
    if(player._db060GlassHpPenalty){player.maxHp+=player._db060GlassHpPenalty;player.hp=Math.min(player.maxHp,player.hp+player._db060GlassHpPenalty);player._db060GlassHpPenalty=0;}
  }
  function db060ApplyGearTransform(){
    if(db060HasEffect('reverse_engineering')){const totals=Object.values(player.equipment||{}).reduce((a,i)=>{a.attack+=Number(i?.bonuses?.attack)||0;a.defense+=Number(i?.bonuses?.defense)||0;return a;},{attack:0,defense:0});const aAdj=totals.defense-totals.attack,dAdj=totals.attack-totals.defense;player.attack+=aAdj;player.defense+=dAdj;player._db060GearSwapAttackAdj=aAdj;player._db060GearSwapDefenseAdj=dAdj;}
    if(db060HasEffect('glass_fortress')){const penalty=Math.max(1,Math.floor(player.maxHp*.30));player.maxHp=Math.max(1,player.maxHp-penalty);player.hp=Math.min(player.hp,player.maxHp);player._db060GlassHpPenalty=penalty;}
  }

  // Attack/Defense powerup cross-feed.

  // Ouroboros Perfect Specimen baseline is applied inside DiceboundClasses.

  // Individual strike-level effects remain owned by combat/strike-resolution.

  // Poison recursion.
  const db060PoisonTickBase=applyPoisonTick;
  applyPoisonTick=function(){const r=db060PoisonTickBase();if(db060HasEffect('recursive_poison'))for(const e of livingEnemies())if((e.poisonStacks||0)>0&&random()<.35){e.poisonStacks++;addCombatHistory(`☠️♻️ Recursive Poison adds a stack to ${e.name}.`);}return r;};

  // Guard Echo.

  // Blood Price is applied inside the DiceboundClasses Bloodmage action owner.

  // Defense doubling during actual incoming attacks.

  // Unstable Ultimate: 70 charge threshold, 75% damage.

  // Pet Mirror.

  // Battle-lifetime Legendary state cleanup + Last Stand.
  function db060ClearBattleLegendaryTemps(){if(player._db060IronEchoDefense){player.defense=Math.max(0,player.defense-player._db060IronEchoDefense);player._db060IronEchoDefense=0;}if(player._db060BloodPriceStacks){player.damageBonus=Math.max(0,(player.damageBonus||0)-player._db060BloodPriceStacks*.08);player._db060BloodPriceStacks=0;}player._db060LastStandUsed=false;}

  // Board 6 miniboss cookie correction. The mature victory owner still uses
  // the explicit sequence 1/3/5/7/8, so patch its live 6th-road fallback by
  // topping it up from 1 to 10 after the reward is resolved.
  // (The literal formula is also replaced in the source packaging script.)

  // It deliberately exposes the current final Pet lifecycle wrappers without changing ordinary callers.
  window.DiceboundPetsOracleTest=Object.freeze({
    snapshot:()=>({
      activePet:meta.activePet,petCookies:meta.petCookies,gameStarted:!!gameStarted,classId:player.classId,
      activeState:JSON.parse(JSON.stringify(dbPets.activeState()||null)),
      elementProgress:JSON.parse(JSON.stringify(meta.elementProgress||{})),
      player:{attack:player.attack,defense:player.defense,crit:player.crit,doubleStrike:player.doubleStrike,maxHp:player.maxHp,hp:player.hp,potionPower:player.potionPower,bossDamage:player.bossDamage,flatReduction:player.flatReduction,luck:player.luck,elementDamageBonus:player.elementDamageBonus,cookieBondBonus:player.cookieBondBonus,_activePetBonusId:player._activePetBonusId||null,_v17PetBonusScale:player._v17PetBonusScale||null}
    }),
    setRunActive:value=>{gameStarted=!!value;return gameStarted;},
    setPetLevel:(id,level)=>{const state=meta.pets?.[id];if(!state)return false;state.level=level;return true;},
    setPetState:(id,next)=>{if(!meta.pets?.[id])return false;Object.assign(meta.pets[id],next||{});return true;},
    setCookieBondBonus:value=>{player.cookieBondBonus=Number(value)||0;return player.cookieBondBonus;},
    lockPet:id=>{if(!meta.pets?.[id])return false;meta.pets[id].unlocked=false;return true;},
    feed:count=>dbPets.feed(count),
    trackElement:(key,amount)=>dbPets.trackElementProgress(key,amount),
    canSwitch:id=>dbPets.canSwitch(id),
    select:id=>window.DiceboundPetChooser.select(id),
    damage:(id=meta.activePet)=>{const previous=meta.activePet;meta.activePet=id;try{return petDamage();}finally{meta.activePet=previous;}},
    bonusScale:id=>dbPets.bonusScale(id),
    damageExtra:id=>dbPets.damageExtra(id),
    bonusText:id=>dbPets.bonusText(id),
    syncBonus:(force=false)=>dbPets.syncActiveBonus(force),
    forceActivePet:id=>{meta.activePet=id;return meta.activePet;},
    playerStats:()=>({attack:player.attack,defense:player.defense,crit:player.crit,doubleStrike:player.doubleStrike,maxHp:player.maxHp,hp:player.hp,potionPower:player.potionPower,bossDamage:player.bossDamage,flatReduction:player.flatReduction,luck:player.luck,elementDamageBonus:player.elementDamageBonus,_activePetBonusId:player._activePetBonusId||null,_v17PetBonusScale:player._v17PetBonusScale||null}),
    shuffledPetIds:()=>dbPets.shuffledPetIds()
  });

  // It deliberately exposes the current final wrappers without changing ordinary callers.
  window.DiceboundItemsOracleTest=Object.freeze({
    generateEquipment:(rarity=null,slot=null)=>dbItems.generateEquipment(rarity,slot),
    generateLegendary:(slot=null,preferUndiscovered=false)=>dbItems.generateLegendary(slot,preferUndiscovered),
    sellValue:item=>dbItems.sellValue(item),
    score:item=>dbItems.score(item),
    formatComparison:(item,current)=>dbItems.formatComparison(item,current),
    equip:(item,silent=true)=>{dbItems.equip(item,silent);return JSON.parse(JSON.stringify(player.equipment[item.slot]));}
  });

  // GUIDE / DEBUG -----------------------------------------------------------
  window.DiceboundBeta06Test=Object.freeze({
    budgets:()=>JSON.parse(JSON.stringify(V14_RARITY_BUDGETS)),
    legendaryEffects:()=>DB060_LEGENDARY_EFFECTS.map(e=>({id:e.id,name:e.name,classes:e.classes||null,desc:e.desc})),
    generatedLegendary:()=>{const x=dbItems.generateLegendary(null,false);return {name:x.name,slot:x.slot,rarity:x.rarity,itemPower:x.itemPower,effect:x.legendaryEffectName,seed:x.seedCode};},
    memoryCacheOdds:()=>({normal:1/450,nightmare:1/300,hell:1/200}),
    artifactTable:()=>DB060_ARTIFACT_TABLE.map(x=>({slot:x.slot,weight:x.weight,label:x.label})),
    artifactRates:()=>JSON.parse(JSON.stringify(DB060_LOOT.artifactRates)),
    minibossGearChance:()=>JSON.parse(JSON.stringify(DB060_LOOT.minibossGearChances)),
    secretSignatureRates:()=>JSON.parse(JSON.stringify(DB060_LOOT.secretSignatureRates)),
    namedMythicals:()=>[generateAxelsCoffeeMug(),generateKratzHeadphones(),generateKellysJeanJacket()].map(x=>({name:x.name,rarity:x.rarity,slot:x.slot,equipmentId:x.equipmentId,intrinsic:dbEquipmentIdentityOwner.intrinsicBonusesForItem(x),bonuses:{...(x.bonuses||{})},total:dbEquipmentIdentityOwner.allBonusesForItem(x),baseName:dbEquipmentIdentityOwner.identityForItem(x)?.displayName||null})),
    artifactRollSample:(n=10000)=>{const out={};for(let i=0;i<n;i++){const x=dbArtifacts.pick(random);out[x.slot]=(out[x.slot]||0)+1;}return out;}
  });

  /* ACTIVE-RUN CHECKPOINT COMPOSITION -------------------------------------
     The extracted checkpoint service owns validation/storage. This adapter
     owns the final live monolith variables until those state domains move. */
  const DB_RUN_CHECKPOINT=dbRuntime.runCheckpoint;
  if(!DB_RUN_CHECKPOINT)throw new Error('DiceboundRuntime must provide active-run checkpoint infrastructure');
  const DB_RUN_BLOCKING_OVERLAYS=['combatOverlay','levelOverlay','eventOverlay','wheelOverlay','powerupOverlay','merchantOverlay','blessingOverlay','mysticOverlay','lootOverlay','bloodwellOverlay','gamblerOverlay','diceChoiceOverlay','endOverlay','prestigeHeirloomOverlay','prestigeMoonOverlay'];
  let dbRunCheckpointEpoch=0,dbRunCheckpointTimer=null,dbRunCheckpointRestoring=false,dbRunOwnedSeed=null,dbRunLastResult=DB_RUN_CHECKPOINT.load();
  const dbRunClone=value=>JSON.parse(JSON.stringify(value));
  function dbRunHasBlockingOverlay(){return DB_RUN_BLOCKING_OVERLAYS.some(id=>{const el=$(id);return el&&!el.classList.contains('hidden');})||!$('battleVictory')?.classList.contains('hidden');}
  function dbRunIsStable(){return gameStarted&&!runFinalized&&!rollLocked&&!combatBusy&&!currentEnemy&&pendingLevelUps===0&&!dbRunHasBlockingOverlay();}
  function dbRunSummary(){return {classId:player.classId,className:CLASSES[player.classId]?.name||player.classId,board:boardLevel,tile:Number(player.position||0)+1,level:player.level,gold:player.gold,difficulty:hellMode?'Hell':nightmareMode?'Nightmare':'Normal'};}
  function dbRunSnapshot(){
    repairEquipmentPresentationData();
    return DB_RUN_CHECKPOINT.create({
      summary:dbRunSummary(),
      meta,
      run:{
        player,tiles,boardLevel,selectedClassId,nightmareMode,hellMode,rolls,tilesMovedThisRun,runTalentSnapshot,statsLastHp,statsLastGold,
        merchant:{faceClicks:[...merchantFaceClicks],faceTotal:merchantFaceTotal,bossPrimed:merchantBossPrimed,bossDefeatedThisBoard:merchantBossDefeatedThisBoard},
        logHtml:$('log')?.innerHTML||''
      }
    });
  }
  function dbRunWriteCheckpoint(){
    if(dbRunCheckpointRestoring||!dbRunIsStable())return false;
    try{dbRunLastResult={checkpoint:DB_RUN_CHECKPOINT.store(dbRunSnapshot()),source:'primary',recovered:false,error:null};dbRunRefreshControls();return true;}
    catch(error){console.error('DiceBound active-run checkpoint failed',error);dbRunLastResult={checkpoint:null,source:'error',recovered:false,error:error.message};dbRunRefreshControls();return false;}
  }
  function dbRunScheduleCheckpoint(){
    if(dbRunCheckpointRestoring)return;
    const epoch=dbRunCheckpointEpoch;
    clearTimeout(dbRunCheckpointTimer);
    dbRunCheckpointTimer=setTimeout(()=>{if(epoch===dbRunCheckpointEpoch)dbRunWriteCheckpoint();},80);
  }
  function dbRunClearCheckpoint(){
    dbRunCheckpointEpoch++;clearTimeout(dbRunCheckpointTimer);DB_RUN_CHECKPOINT.clear();dbRunLastResult={checkpoint:null,source:'none',recovered:false,error:null};dbRunRefreshControls();return true;
  }
  function dbRunSeedNewRun(){
    const existing=window.DiceboundRng.snapshot();
    if(existing.mode==='seeded'&&existing.seed!==dbRunOwnedSeed){dbRunOwnedSeed=existing.seed;return existing;}
    const generated=window.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}-${performance?.now?.()||0}`;
    const seeded=window.DiceboundRng.seed(`run-${generated}`);dbRunOwnedSeed=seeded.seed;return seeded;
  }
  function dbRunCloseOverlays(){
    ['startOverlay',...DB_RUN_BLOCKING_OVERLAYS,'talentOverlay','prestigeMoonOverlay','buffOverlay','petCollectionOverlay','debugOverlay','achievementOverlay','infoOverlay'].forEach(id=>$(id)?.classList.add('hidden'));
    BattleVictoryUI.reset();document.querySelectorAll('.camp-panel').forEach(panel=>panel.classList.remove('active'));
  }
  function dbRunRestore(checkpoint=dbRunLastResult?.checkpoint){
    checkpoint=DB_RUN_CHECKPOINT.validate(checkpoint);dbRunCheckpointRestoring=true;dbRunCheckpointEpoch++;clearTimeout(dbRunCheckpointTimer);
    try{
      const currentSettings=dbRunClone(meta.settings||{}),run=checkpoint.run;
      meta=normalizeMetaCore(checkpoint.meta);meta.settings={...meta.settings,...currentSettings};
      Object.keys(player).forEach(key=>delete player[key]);Object.assign(player,dbRunClone(run.player));
      tiles=dbRunClone(run.tiles);boardLevel=Number(run.boardLevel)||1;selectedClassId=String(run.selectedClassId||player.classId||'ranger');nightmareMode=!!run.nightmareMode;hellMode=!!run.hellMode;
      rolls=Math.max(0,Number(run.rolls)||0);tilesMovedThisRun=Math.max(0,Number(run.tilesMovedThisRun)||0);runTalentSnapshot=dbRunClone(run.runTalentSnapshot);statsLastHp=run.statsLastHp??null;statsLastGold=run.statsLastGold??null;
      merchantFaceClicks=new Set(run.merchant?.faceClicks||[]);merchantFaceTotal=Math.max(0,Number(run.merchant?.faceTotal)||0);merchantBossPrimed=!!run.merchant?.bossPrimed;merchantBossDefeatedThisBoard=!!run.merchant?.bossDefeatedThisBoard;merchantBossBattle=false;
      currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEncounterTurn=0;currentEnemyTile=null;currentMerchantItems=[];currentMerchantNotice='';pendingLevelUps=0;pendingLootItem=null;pendingLootCallback=null;dbRoadEvents.resetTransient();combatBusy=false;runFinalized=false;v16CombatKind=null;v19CompletingSixth=false;
      window.DiceboundRng.restore(checkpoint.rng);dbRunOwnedSeed=checkpoint.rng.seed;
      gameStarted=true;rollLocked=false;dbRunCloseOverlays();applyRunTheme();buildBoard();
      if($('log'))$('log').innerHTML=String(run.logHtml||'');
      saveMeta();renderEquipment();window.DiceboundTalentTree.render();window.DiceboundPetChooser.render();window.DiceboundClassChooser.render();updateMetaUI();updateHUD();refreshBoardHighlights();setTimeout(()=>placePawn(false),30);
      showToast(`▶ Continued ${checkpoint.summary?.className||'saved'} run · Board ${boardLevel}, tile ${player.position+1}`,3200,true);
      dbRunLastResult={checkpoint,source:dbRunLastResult?.source||'primary',recovered:!!dbRunLastResult?.recovered,error:dbRunLastResult?.error||null};return true;
    } finally {dbRunCheckpointRestoring=false;dbRunRefreshControls();}
  }
  function dbRunPanelText(result){
    if(result?.checkpoint){const s=result.checkpoint.summary||{};return `${s.className||s.classId||'Adventurer'} · ${s.difficulty||'Normal'} · Board ${s.board||'?'} · Tile ${s.tile||'?'} · Level ${s.level||'?'} · ${s.gold||0} gold${result.recovered?' · recovered backup':''}`;}
    return result?.error?`Saved run could not be read: ${result.error}`:'No active expedition is saved.';
  }
  function dbRunEnsureControls(){
    const scene=$('campScene');if(!scene)return null;
    let panel=$('runResumePanel');if(panel)return panel;

    panel=document.createElement('div');panel.id='runResumePanel';panel.className='run-resume-panel';panel.innerHTML='<div class="run-resume-copy"><strong id="runResumeTitle">Continue expedition</strong><span id="runResumeSummary"></span></div><div class="run-resume-actions"><button class="small-btn" id="runResumeBtn">▶ Continue Run</button><button class="small-btn danger" id="runAbandonBtn">Abandon saved run</button></div>';
    scene.insertBefore(panel,scene.firstElementChild);
    $('runResumeBtn').addEventListener('click',()=>{dbRunLastResult=DB_RUN_CHECKPOINT.load();if(dbRunLastResult.checkpoint)dbRunRestore(dbRunLastResult.checkpoint);else{showToast('Saved run is unavailable');dbRunRefreshControls();}});
    $('runAbandonBtn').addEventListener('click',async()=>{if(await diceboundConfirm('Abandon the saved expedition? Your career progress and settings remain safe.',{title:'Abandon saved run?',confirmLabel:'Abandon run',danger:true})){dbRunClearCheckpoint();showToast('Saved expedition abandoned');}});
    return panel;
  }
  function dbRunRefreshControls(){
    const panel=dbRunEnsureControls();if(!panel)return;
    dbRunLastResult=DB_RUN_CHECKPOINT.load();const valid=!!dbRunLastResult.checkpoint,present=DB_RUN_CHECKPOINT.has();panel.classList.toggle('hidden',!present);
    const title=$('runResumeTitle'),summary=$('runResumeSummary'),resume=$('runResumeBtn'),abandon=$('runAbandonBtn');if(title)title.textContent=valid?'Continue expedition':'Saved expedition needs attention';if(summary)summary.textContent=dbRunPanelText(dbRunLastResult);if(resume)resume.disabled=!valid;if(abandon)abandon.textContent=valid?'Abandon saved run':'Discard unreadable run';
  }

  window.DiceboundCamp.configureShell({scheduleRunCheckpoint:()=>dbRunScheduleCheckpoint(),clearCheckpoint:()=>dbRunClearCheckpoint(),refreshRunControls:()=>dbRunRefreshControls()});
  document.addEventListener('click',event=>{const go=event.target?.closest?.('#campGoBtn');if(!go||!DB_RUN_CHECKPOINT.has())return;event.preventDefault();event.stopImmediatePropagation();(async()=>{if(await diceboundConfirm('Starting a new expedition will abandon the saved run. Continue?',{title:'Start a new run?',confirmLabel:'Abandon and start',danger:true})){await startNewGame({beforeFreshRun:()=>{$('startOverlay')?.classList.add('hidden');document.querySelectorAll('.camp-panel').forEach(panel=>panel.classList.remove('active'));}});}})();},true);
  window.DiceboundRunResumeTest=Object.freeze({isStable:dbRunIsStable,snapshot:dbRunSnapshot,save:dbRunWriteCheckpoint,load:()=>DB_RUN_CHECKPOINT.load(),restore:checkpoint=>dbRunRestore(checkpoint||DB_RUN_CHECKPOINT.load().checkpoint),clear:dbRunClearCheckpoint,state:()=>({gameStarted,rollLocked,combatBusy,boardLevel,position:player.position,player:dbRunClone(player),rng:window.DiceboundRng.snapshot(),summary:dbRunSummary()})});
  window.DiceboundEchoCrucibleTest=Object.freeze({view:()=>dbRunClone(db068CrucibleView()),hasEffect:id=>db060HasEffect(id),player:()=>dbRunClone(player)});
  // Test-only exercise of the live final-boss path. It deliberately resets the
  // ephemeral test session after each capture; it is never exposed to player UI.
  function dbGuardianIdentityExercise(board,mode="normal",resume=false){
    const level=Math.floor(Number(board));if(!DB317_GUARDIANS.resolveFinal(level))throw new Error(`Unknown final guardian Board ${board}`);
    window.DiceboundRng.seed(`guardian-identity-${level}-${mode}`);resetPlayer("ranger");boardLevel=level;nightmareMode=mode==="nightmare";hellMode=mode==="hell";gameStarted=true;rollLocked=false;runFinalized=false;combatBusy=false;dbRun.generateBoard();buildBoard();player.position=currentTileCount()-1;
    if(resume)dbRunRestore(dbRunSnapshot());
    startCombat("final");
    const enemy=currentEncounterLead,art=$("enemyIcon")?.querySelector("img.db060-guardian-art")?.getAttribute("src")||null;
    return {board:boardLevel,mode:hellMode?"hell":nightmareMode?"nightmare":"normal",resumed:!!resume,id:enemy?.id||null,name:enemy?.name||null,weakness:enemy?.weakness||null,specialName:enemy?.specialName||null,art,hud:$("guardianText")?.textContent||""};
  }
  function dbGuardianIdentityMatrix(){
    try{return [dbGuardianIdentityExercise(1,"normal"),dbGuardianIdentityExercise(3,"nightmare",true),dbGuardianIdentityExercise(6,"hell")];}
    finally{dbRunClearCheckpoint();currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;combatBusy=false;gameStarted=false;rollLocked=true;nightmareMode=false;hellMode=false;boardLevel=1;resetPlayer("ranger");$("combatOverlay")?.classList.add("hidden");}
  }
  window.DiceboundGuardianIdentityTest=Object.freeze({matrix:dbGuardianIdentityMatrix});
  setTimeout(dbRunRefreshControls,0);

  window.DiceboundInfrastructure=Object.freeze({version:APP_IDENTITY.version,channel:APP_IDENTITY.channel,platform:()=>dbRuntime.platform?.runtimeInfo?.(),storage:()=>dbRuntime.storage?.diagnostics?.(),save:()=>dbRuntime.save?.diagnostics?.(),runCheckpoint:()=>DB_RUN_CHECKPOINT.diagnostics(),wrapper:()=>dbRuntime.platform?.wrapperDiagnostics?.(),load:()=>window.__DiceboundSaveLoadResult||null});

  if(!dbPowerups||!window.DiceboundEquipment?.pickOrdinaryAffix)throw new Error('Powerups/progression/equipment rule modules must load before dicebound.js');

  dbProgression.checkDynamicClassUnlocks();

  function db0633TrophyTierForAchievementCount(count){return window.DiceboundAchievements?.campTrophyTierForCount?.(count)||null;}
  function db0633PrestigeOfferPoints(total=dbProgression.allocatedTalentPoints()+(meta.points||0)){return dbProgression.prestigeOffer(total);}
  function db0633ReconcileCampRevealState(current={},facts={}){
    const prior={achievementTrophy:!!current.achievementTrophy,talentStar:!!current.talentStar,prestigeMoon:!!current.prestigeMoon};
    const achievementCount=Math.max(0,Math.floor(Number(facts.achievementCount)||0));
    const legacyLevel=Math.max(1,Math.floor(Number(facts.legacyLevel)||1));
    const prestigeCount=Math.max(0,Math.floor(Number(facts.prestigeCount)||0));
    const prestigeOfferPoints=Math.max(0,Math.floor(Number(facts.prestigeOfferPoints)||0));
    return {
      achievementTrophy:!!db0633TrophyTierForAchievementCount(achievementCount),
      talentStar:prior.talentStar||!!facts.legacyLevelGained||legacyLevel>1||prestigeCount>0,
      prestigeMoon:prior.prestigeMoon||prestigeOfferPoints>=1||prestigeCount>0
    };
  }
  function db0633CurrentCampRevealState(){
    const state=meta.campReveals;
    return {achievementTrophy:!!db0633TrophyTierForAchievementCount(db0633AchievementCount()),talentStar:!!state?.talentStar,prestigeMoon:!!state?.prestigeMoon};
  }
  function db0633AchievementCount(){return dbProgression.achievementCount();}
  function db0633ReconcileCampReveals(options={}){
    const current=db0633CurrentCampRevealState();
    const next=db0633ReconcileCampRevealState(current,{
      achievementCount:db0633AchievementCount(),
      legacyLevel:meta.level,
      legacyLevelGained:!!options.legacyLevelGained,
      prestigeCount:meta.prestige?.count,
      prestigeOfferPoints:db0633PrestigeOfferPoints()
    });
    let changed=false;
    if(meta.campReveals&&Object.prototype.hasOwnProperty.call(meta.campReveals,'achievementTrophy')){delete meta.campReveals.achievementTrophy;changed=true;}
    for(const key of ['talentStar','prestigeMoon']){
      if(next[key]&&!current[key]){
        if(!meta.campReveals||typeof meta.campReveals!=='object')meta.campReveals={};
        meta.campReveals[key]=true;changed=true;
      }
    }
    return {changed,state:db0633CurrentCampRevealState()};
  }
  function db0633SyncCampObjects(){
    const state=db0633CurrentCampRevealState(),synced=window.DiceboundCamp?.syncProgressionReveals?.(state)||state;
    window.DiceboundCamp?.refreshArt?.();
    return synced;
  }
  function db0633RefreshCampProgression(options={}){
    const result=db0633ReconcileCampReveals(options);if(result.changed)saveMeta();db0633SyncCampObjects();return result;
  }
  const db0633GrantLegacyXpBase=grantLegacyXp;
  grantLegacyXp=function(...args){
    const before=Math.max(1,Math.floor(Number(meta.level)||1)),result=db0633GrantLegacyXpBase.apply(this,args);
    db0633RefreshCampProgression({legacyLevelGained:Math.max(1,Math.floor(Number(meta.level)||1))>before});return result;
  };
  window.DiceboundCamp.configureShell({syncCampProgressionObjects:()=>db0633SyncCampObjects(),refreshCampProgression:()=>db0633RefreshCampProgression()});
  window.DiceboundCampProgressionTest=Object.freeze({
    trophyTiers:()=>[...(window.DiceboundAchievements?.campTrophyTiers||[])].map(tier=>({...tier})),
    trophyTierForAchievementCount:db0633TrophyTierForAchievementCount,
    prestigeOfferPoints:db0633PrestigeOfferPoints,
    reconcile:(current,facts)=>db0633ReconcileCampRevealState(current,facts),
    current:db0633CurrentCampRevealState,
    campObjectIds:()=>window.DiceboundCamp?.progressionRevealObjectIds?.().filter(id=>!!$(id))||[]
  });
  setTimeout(()=>db0633RefreshCampProgression(),0);

  function db0635CombatMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
  function db0635ApplyCombatBackground(){
    const overlay=$('combatOverlay'),mode=db0635CombatMode(),entry=window.DiceboundAssets?.resolveCombatBackground?.(boardLevel,mode)||null;
    if(!overlay)return entry;
    if(entry?.image){overlay.dataset.combatBackground=`board-${boardLevel}-${mode}`;overlay.style.setProperty('--db0635-combat-background-image',`url("${entry.image}")`);}
    else {delete overlay.dataset.combatBackground;overlay.style.removeProperty('--db0635-combat-background-image');}
    return entry;
  }
  window.DiceboundCombatBackgrounds=Object.freeze({mode:db0635CombatMode,resolve:(board,mode='normal')=>window.DiceboundAssets?.resolveCombatBackground?.(board,mode)||null,active:db0635ApplyCombatBackground});

  function db0636CurrentCombatMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}

  window.DiceboundEnemyBattleArt=Object.freeze({
    mode:db0636CurrentCombatMode,
    resolve:(name,board=boardLevel)=>window.DiceboundAssets?.resolveEnemyBattleArt?.(name,board)||null,
    active:()=>[...document.querySelectorAll('.db0636-tiered-enemy-art')].map(node=>({key:node.dataset.enemyBattleArt,board:Number(node.dataset.enemyBattleBoard),mode:node.dataset.enemyBattleMode}))
  });

  /* Nature Poison Vines combat VFX (#80, #71).
     Presentation observes completed proc outcomes only: combat damage, targeting,
     RNG and turns remain owned by the live combat pipeline. */
  dbCombatView.configureVfx({getEnemies:()=>currentEnemies,getPlayer:()=>player,getFloatingCombatNumbersEnabled:()=>meta.settings?.floatingCombatNumbers!==false});
  dbCombatView.prepareNature();
  // Browser/native smoke adapter for the authored Nature VFX.  This owns no
  // gameplay: it drives the already-configured element-resolution and VFX

  function dbNatureProcRegressionExercise(key='nature'){
    document.querySelectorAll('.db-nature-vines-vfx,.element-proc-fx,.enemy-proc-fx').forEach(node=>node.remove());
    resetPlayer('ranger');
    Object.assign(player,{attack:10,elementDamageBonus:0,naturePoisonStacks:1,combatAttackCount:0});
    player.equipment.weapon={...(player.equipment.weapon||{}),element:key,rarity:'common'};
    const targets=[
      {name:'Nature VFX Defeated Target',icon:'👹',hp:3,maxHp:3,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:0},
      {name:'Nature VFX Living Target A',icon:'👹',hp:10,maxHp:10,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:0},
      {name:'Nature VFX Living Target B',icon:'👹',hp:10,maxHp:10,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:0}
    ];
    currentEnemies=targets;currentEnemyIndex=0;currentEnemy=targets[0];currentEncounterLead=targets[0];currentEncounterTurn=0;gameStarted=true;combatBusy=false;
    $('combatOverlay')?.classList.remove('hidden');dbCombatView.renderEnemyParty();
    const result=dbCombat.element(key,targets[0],{forced:true,source:'Nature VFX regression exercise'});
    return {activated:!!result,key,enemies:targets.map((enemy,index)=>({index,hp:enemy.hp,poisonStacks:enemy.poisonStacks||0})),vfx:dbCombatView.natureEntries(),projectiles:[...document.querySelectorAll('.db-combat-projectile-vfx')].map(node=>({effect:node.dataset.effect,origin:node.dataset.origin})),legacyPresentation:{nature:document.querySelectorAll('.element-proc-fx.nature').length,fire:document.querySelectorAll('.element-proc-fx.fire').length,enemy:document.querySelectorAll('.enemy-proc-fx').length}};
  }
  function dbCombatPresentationExercise(kind='final'){
    document.querySelectorAll('.db-nature-vines-vfx').forEach(node=>node.remove());
    const tiered=kind==='slime'||kind==='wolf';
    const enemy={name:tiered?(kind==='slime'?'Slime':'Wolf'):(kind==='miniboss'?'Ogre Roadwarden':'Ancient Road Dragon'),icon:'👹',hp:100,maxHp:100,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:0,guardian:!tiered,miniBoss:kind==='miniboss',finalBoss:kind==='final'};
    currentEnemies=[enemy];currentEnemyIndex=-1;currentEnemy=enemy;currentEncounterLead=enemy;currentEncounterTurn=0;gameStarted=true;combatBusy=false;
    $('combatOverlay')?.classList.remove('hidden');dbCombatView.renderEnemyParty();
    const stage=$('enemyIcon'),host=stage?.querySelector('.stage-enemy'),sprite=host?.querySelector('.stage-sprite'),art=host?.querySelector('.enemy-art-frame'),player=$('combatPlayerIcon');
    const rect=node=>{const box=node?.getBoundingClientRect();return box?{width:Math.round(box.width),height:Math.round(box.height)}:null;};
    return {kind,narrow:window.matchMedia('(max-width:760px)').matches,viewportHeight:window.innerHeight,stageClasses:stage?.className||'',hostClasses:host?.className||'',sprite:rect(sprite),art:rect(art),player:rect(player)};
  }
  window.DiceboundNatureVfxTest=Object.freeze({
    effect:dbCombatView.natureEffect,
    livingTargets:enemies=>dbCombatView.livingNatureTargets(enemies).map(enemy=>enemy.name||''),
    previewPlayer:dbCombatView.playNatureOnPlayer,
    exerciseProc:dbNatureProcRegressionExercise,
    exercisePresentation:dbCombatPresentationExercise,
    active:dbCombatView.natureEntries
  });

  const db06314Equipment=window.DiceboundEquipment;
  if(!db06314Equipment)throw new Error('DiceBound requires the equipment identity owner before dicebound.js');
  window.DiceboundEquipmentIdentityTest=Object.freeze({
    identity:id=>db06314Equipment.equipmentIdentity(id),
    art:item=>window.DiceboundAssets?.resolveEquipmentArt?.(item)||null,
    intrinsic:item=>db06314Equipment.intrinsicBonusesForItem(item),
    total:item=>db06314Equipment.allBonusesForItem(item),
    generate:(rarity='common',slot='weapon')=>dbItems.generateEquipment(rarity,slot)
  });

  /* #215 — one effective Mana-cap policy for ordinary and authored equipment.
     Equipment continues to own the item's bonuses; effective-stats owns the
     pure resource calculation; this adapter only applies that result to the
     live player at the equipment and reset lifecycle boundaries. */
  function db06421UsesMana(){return classHasMechanic('mana');}
  function db06421EquipmentMana(){return DB_EFFECTIVE_STATS.equipmentStatTotal(player.equipment,'maxMana',db06314Equipment.allBonusesForItem);}
  function db06421SyncMana({baseMaxMana=player.maxMana,currentMana=player.mana}={}){
    const snapshot=DB_EFFECTIVE_STATS.manaResourceSnapshot({baseMaxMana,currentMana,usesMana:db06421UsesMana(),equipmentMana:db06421EquipmentMana()});
    player.maxMana=snapshot.maxMana;player.mana=snapshot.mana;return snapshot;
  }
  dbItemOperations=dbItemOperationsOwner.createController({
    getPlayer:()=>player,getMeta:()=>meta,rarityValues,equipmentApi:db06314Equipment,
    classIdentityActive:id=>classIdentityActive(id),bonusLabel:(key,value)=>bonusLabel(key,value),
    applyItemStats:(item,sign)=>applyItemStats(item,sign),clearGearTransform:()=>db060ClearGearTransform(),applyGearTransform:()=>db060ApplyGearTransform(),
    usesMana:()=>db06421UsesMana(),equipmentMana:()=>db06421EquipmentMana(),syncMana:snapshot=>db06421SyncMana(snapshot),
    recordCareerGoldEarned:amount=>dbProgression.recordGoldEarned(amount),setStatsLastGold:value=>{statsLastGold=value;},rarityLabel:rarity=>rarityInfo[rarity].label,
    sfxLevel:()=>sfx.level(),sfxCoin:()=>sfx.coin(),showToast:text=>showToast(text),addLog:text=>addLog(text),
    renderEquipment:()=>renderEquipment(),updateHUD:()=>updateHUD()
  });

  function db06421ManaEquipmentExercise(){
    try{
      window.DiceboundRng.seed('db06421-mana-equipment');resetPlayer('sorcerer');gameStarted=true;rollLocked=false;dbRun.generateBoard();buildBoard();
      const base={maxMana:player.maxMana,mana:player.mana};player.mana=17;
      dbItems.equip({id:'db06421-spellbook',slot:'offhand',rarity:'common',equipmentId:'spellbook',bonuses:{}},true);
      const one={maxMana:player.maxMana,mana:player.mana};
      dbItems.equip({id:'db06421-mana-ring',slot:'ring',rarity:'rare',bonuses:{maxMana:7}},true);
      const multiple={maxMana:player.maxMana,mana:player.mana};
      const checkpoint=dbRunSnapshot();player.maxMana=1;player.mana=1;dbRunRestore(JSON.parse(JSON.stringify(checkpoint)));
      const restored={maxMana:player.maxMana,mana:player.mana};
      dbItems.equip({id:'db06421-plain-offhand',slot:'offhand',rarity:'common',bonuses:{}},true);
      const removedOne={maxMana:player.maxMana,mana:player.mana};player.mana=removedOne.maxMana;
      dbItems.equip({id:'db06421-plain-ring',slot:'ring',rarity:'common',bonuses:{}},true);
      const removedAll={maxMana:player.maxMana,mana:player.mana};
      resetPlayer('ranger');
      dbItems.equip({id:'db06421-ranger-spellbook',slot:'offhand',rarity:'common',equipmentId:'spellbook',bonuses:{}},true);
      const nonMana={maxMana:player.maxMana,mana:player.mana};
      return {base,one,multiple,restored,removedOne,removedAll,nonMana};
    } finally {
      dbRunClearCheckpoint();currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;combatBusy=false;gameStarted=false;rollLocked=true;resetPlayer('ranger');openStartScreen();
    }
  }
  window.DiceboundManaEquipmentTest=Object.freeze({
    equipmentMana:db06421EquipmentMana,
    snapshot:options=>DB_EFFECTIVE_STATS.manaResourceSnapshot(options),
    exercise:db06421ManaEquipmentExercise
  });

  /* #210 — Prismatic Birthright is useful run gear, not a permanent account
     reward. The test runs the real reset, end-run and Prestige candidate paths. */
  function db06422PrismaticBirthrightExercise(){
    try{
      window.DiceboundRng.seed('db06422-prismatic-birthright');v319ResetCareer();
      meta.purchased.element_prismatic=1;resetPlayer('ranger');
      const starter=JSON.parse(JSON.stringify(player.equipment.weapon));dbEquipmentUi.renderEndGear();
      const endStarterCandidates=[...document.querySelectorAll('#endGearGrid .gear-keep-btn')].map(button=>button.textContent);
      gameStarted=true;

      // persistent storage stays account-owned, so characterize that current
      // candidate set directly instead of reviving the removed UI helper.
      const prestigeStarterCandidates=(meta.heirlooms||[]).map(item=>({id:item.id,name:item.name,eligible:db06314Equipment.isHeirloomEligible(item)}));
      const ordinary=dbItems.generateEquipment('common','weapon');dbItems.equip(ordinary,true);dbEquipmentUi.renderEndGear();
      const endReplacementCandidates=[...document.querySelectorAll('#endGearGrid .gear-keep-btn')].map(button=>button.textContent);
      v319ResetCareer();const existing={id:'db06422-existing-heirloom',slot:'weapon',rarity:'common',icon:'⚔️',name:'Historic Bound Weapon',bonuses:{attack:1}};
      meta.heirlooms=[existing];meta.purchased.element_prismatic=3;resetPlayer('ranger');
      return {
        starter:{id:starter?.id,rarity:starter?.rarity,element:starter?.element,provenance:starter?.provenance,heirloomEligible:starter?.heirloomEligible,eligible:db06314Equipment.isHeirloomEligible(starter)},
        endStarterCandidates,prestigeStarterCandidates,
        replacement:{id:ordinary.id,eligible:db06314Equipment.isHeirloomEligible(ordinary),endCandidate:endReplacementCandidates.some(text=>text.includes(ordinary.name))},
        existingHeirloom:{id:player.equipment.weapon?.id,provenance:player.equipment.weapon?.provenance||null,starterGenerated:player.equipment.weapon?.provenance==='prismatic-birthright'}
      };
    } finally {
      v319ResetCareer();resetPlayer('ranger');openStartScreen();
    }
  }
  window.DiceboundPrismaticBirthrightTest=Object.freeze({exercise:db06422PrismaticBirthrightExercise,eligible:item=>db06314Equipment.isHeirloomEligible(item)});

  /* #91 / #144 ordinary-enemy mechanics.  The extracted policy owns the
     tables; this live adapter only supplies combat-state application. */
  const db064EnemyPolicy=window.DiceboundEnemyPolicy;
  if(!db064EnemyPolicy)throw new Error('DiceBound requires the enemy policy domain.');
  function db064CombatMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
  const dbEnemyScalingOwner=window.DiceboundEnemyScalingResolution;
  if(!dbEnemyScalingOwner)throw new Error('DiceBound requires the enemy scaling-resolution owner.');
  dbEnemyScalingResolution=dbEnemyScalingOwner.configure({
    getState:()=>({player,boardLevel,nightmareMode,hellMode}),currentTileCount,clamp,random,pick,
    getBoard:level=>db317Board(level),enemyPolicy:db064EnemyPolicy,elementKeys:ELEMENT_KEYS
  });

  /* #145 Donut Rain is a non-blocking battlefield presentation.  It observes
     a real completed Donut proc and never changes its target, timing or RNG. */
  window.DiceboundDonutVfxTest=Object.freeze({
    effect:dbCombatView.donutEffect,
    play:dbCombatView.playDonutRain,
    active:dbCombatView.donutEntries
  });

  /* #54 Battle log stays below the action controls and can be minimized
     without becoming unreachable.  The preference lives with normal UI
     settings so it survives the next combat without affecting run state. */
  function db064BattleLogCollapsed(){return !!meta.settings?.battleLogCollapsed;}
  function db064SyncBattleLog(){
    const wrap=$('combatHistoryWrap'),button=$('combatHistoryToggle'),collapsed=db064BattleLogCollapsed();
    wrap?.classList.toggle('is-collapsed',collapsed);
    if(button){button.textContent=collapsed?'Show log':'Collapse log';button.setAttribute('aria-expanded',String(!collapsed));}
    return collapsed;
  }
  function db064SetBattleLogCollapsed(collapsed){
    if(!meta.settings||typeof meta.settings!=='object')meta.settings={};
    meta.settings.battleLogCollapsed=!!collapsed;db064SyncBattleLog();saveMeta();return !!collapsed;
  }
  $('combatHistoryToggle')?.addEventListener('click',()=>db064SetBattleLogCollapsed(!db064BattleLogCollapsed()));

  /* #55 Root tooltip portal.  The tooltip is a root sibling instead of a
     child of a scrolling panel, so overflow and local stacking contexts can
     no longer clip it. */
  let db064TooltipTarget=null;
  function db064TooltipLayer(){return $('appTooltipLayer');}
  function db064TooltipText(target){return String(target?.dataset?.tip||target?.dataset?.tooltip||'').trim();}
  function db064PositionTooltip(){
    const target=db064TooltipTarget,layer=db064TooltipLayer();if(!target||!layer||layer.classList.contains('hidden'))return false;
    const rect=target.getBoundingClientRect(),gap=10,margin=8,layerRect=layer.getBoundingClientRect();
    let left=rect.left+rect.width/2-layerRect.width/2,top=rect.top-layerRect.height-gap;
    left=Math.min(window.innerWidth-layerRect.width-margin,Math.max(margin,left));
    if(top<margin)top=Math.min(window.innerHeight-layerRect.height-margin,rect.bottom+gap);
    layer.style.left=`${Math.round(left)}px`;layer.style.top=`${Math.round(Math.max(margin,top))}px`;
    return true;
  }
  function db064ShowTooltip(target){
    const text=db064TooltipText(target),layer=db064TooltipLayer();if(!text||!layer)return false;
    db064TooltipTarget=target;layer.textContent=text;layer.classList.remove('hidden');db064PositionTooltip();return true;
  }
  function db064HideTooltip(target=null){
    if(target&&target!==db064TooltipTarget)return false;
    db064TooltipTarget=null;const layer=db064TooltipLayer();layer?.classList.add('hidden');return true;
  }
  document.addEventListener('pointerover',event=>{const target=event.target?.closest?.('[data-tip],[data-tooltip]');if(target&&target!==db064TooltipTarget)db064ShowTooltip(target);});
  document.addEventListener('pointerout',event=>{const target=event.target?.closest?.('[data-tip],[data-tooltip]');if(target&&target===db064TooltipTarget&&!target.contains(event.relatedTarget))db064HideTooltip(target);});
  document.addEventListener('focusin',event=>{const target=event.target?.closest?.('[data-tip],[data-tooltip]');if(target)db064ShowTooltip(target);});
  document.addEventListener('focusout',event=>{const target=event.target?.closest?.('[data-tip],[data-tooltip]');if(target&&target===db064TooltipTarget)db064HideTooltip(target);});
  window.addEventListener('resize',db064PositionTooltip);window.addEventListener('scroll',db064PositionTooltip,true);

  // Isolated browser-harness coverage for the #123 semantic contract.  This
  // exercises the live composed strike pipeline, including the Ranger wrapper.

  /* #75 / #122 — one source for the level-aware event Gold family.  The
     runtime applies its existing effective-Gold calculation exactly once. */
  const db064FriendsEventRewards=window.DiceboundEventRewards;
  if(!db064FriendsEventRewards)throw new Error('DiceBound requires the event reward policy domain.');

  function db064AchievementUiSettings(){
    if(!meta.settings||typeof meta.settings!=='object')meta.settings={};
    if(!meta.settings.achievementGroups||typeof meta.settings.achievementGroups!=='object')meta.settings.achievementGroups={};
    return meta.settings.achievementGroups;
  }
  const dbAchievementsUi=window.DiceboundAchievementsUi;
  if(!dbAchievementsUi)throw new Error('DiceBound requires the Achievements UI module before dicebound.js');
  dbAchievementsUi.configure({
    find:$,
    getRegistry:()=>ACHIEVEMENT_REGISTRY,
    getClasses:()=>Object.values(CLASSES),
    isClassUnlocked:(...args)=>dbProgression.isClassUnlocked(...args),
    isDone:achievement=>dbProgression.achievementDone(achievement),
    descriptionFor:achievement=>dbProgression.achievementConditionText(achievement)+dbProgression.achievementRewardText(achievement),
    heroMasteryEntries:classId=>dbProgression.heroMasteryEntries(classId),
    getOpenState:db064AchievementUiSettings,
    setOpenState:(id,open)=>{db064AchievementUiSettings()[id]=!!open;saveMeta();}
  });

  /* #185: the extracted Camp owner consumes live domain data/actions without
     duplicating class, pet, progression, storage, save or mode ownership. */
  const db064Camp=window.DiceboundCamp;
  if(!db064Camp)throw new Error('DiceBound requires the Camp UI module before dicebound.js');
  window.DiceboundCampHitTargetTest=Object.freeze({inspect:()=>db064Camp.inspectHitTargets()});
  window.DiceboundCamp.configureShell({scheduleCampHitTargetSync:()=>db064Camp.scheduleHitTargetSync()});
  db064Camp.scheduleHitTargetSync();

  const db064MemoryDiagnostics=dbRuntime.memoryDiagnostics;
  if(!db064MemoryDiagnostics)throw new Error('DiceBound requires Runtime memory diagnostics.');
  db064MemoryDiagnostics.configure({getContext:()=>{
    const combatOpen=!$('combatOverlay')?.classList.contains('hidden'),activeOverlays=[...document.querySelectorAll('.overlay:not(.hidden)')].map(overlay=>overlay.id),hasNonCampOverlay=activeOverlays.some(id=>id!=='startOverlay');
    return {
      screen:combatOpen?'Combat':!gameStarted?'Camp':hasNonCampOverlay?'Modal':'Board',
      board:boardLevel,
      adventurerLevel:player?.level,
      difficulty:hellMode?'Hell':nightmareMode?'Nightmare':'Normal',
      runActive:!!gameStarted,
      enemyCount:currentEnemies?.length||0,
      livingEnemyCount:currentEnemies?.filter(enemy=>enemy?.hp>0).length||0,
      battleLogEntries:$('combatHistory')?.querySelectorAll('p').length||0,
      tileCount:tiles?.length||0,
      position:player?.position,
    };
  }});

  /* #73: one live target-selection adapter over the extracted pure resolver.
     A lethal hit switches every selected-target surface before strike events,
     floating-number listeners, VFX, or later chained hits observe state. */
  const db0648Targeting=window.DiceboundCombatTargeting;
  if(!db0648Targeting)throw new Error('DiceBound requires the combat targeting domain.');
  function db0648ClearTargetPresentation(){
    dbCombatView.renderEnemyParty();
    const name=$('enemyName'),weakness=$('enemyWeakness'),hp=$('enemyHpText'),fill=$('enemyHpFill'),status=$('enemyStatusDots');
    if(name)name.textContent='No living targets';
    if(weakness)weakness.textContent='All enemies defeated';
    if(hp)hp.textContent='0 / 0 HP';
    if(fill)fill.style.width='0%';
    if(status)status.replaceChildren();
  }
  function db0648ApplyPresentationTarget(requestedIndex=currentEnemyIndex){
    const resolved=db0648Targeting.resolveLivingTarget(currentEnemies,requestedIndex);
    currentEnemyIndex=resolved.index;currentEnemy=resolved.enemy;
    if(currentEnemy)updateCombatUI();else db0648ClearTargetPresentation();
    return resolved;
  }
  function db0648ReconcileDefeatedTarget(target,reason='defeated-target'){
    const defeatedIndex=currentEnemies.indexOf(target);
    if(defeatedIndex<0||target?.hp>0)return false;
    const resolved=db0648ApplyPresentationTarget(defeatedIndex+1);
    DiceboundStateEvents.emit('combat:target-advanced',{domain:'combat',type:'target-advanced',reason,defeatedIndex,targetIndex:resolved.index,targetName:resolved.enemy?.name||null});
    return true;
  }
  function db0648PresentationTargetSnapshot(){
    return Object.freeze({index:currentEnemyIndex,name:currentEnemy?.name||null,alive:!!currentEnemy&&currentEnemy.hp>0});
  }
  setCurrentEnemy=function(index){return db0648ApplyPresentationTarget(index);};
  function db0648SelectedTargetSurfaces(){
    const stage=$('enemyIcon'),selected=stage?.querySelector('.stage-enemy.selected'),chips=[...($('enemyParty')?.querySelectorAll('.enemy-chip.active')||[])];
    return {currentIndex:currentEnemyIndex,currentName:currentEnemy?.name||null,stageIndex:selected?Number(selected.dataset.enemyIndex):null,activeChipCount:chips.length,enemyName:$('enemyName')?.textContent||'',enemyHp:$('enemyHpText')?.textContent||'',hostIndex:selected?Number(selected.dataset.enemyIndex):null};
  }
  async function db0648ChainedTargetPresentationExercise(){
    resetPlayer('fighter');
    Object.assign(player,{attack:100,crit:0,doubleStrike:2,criticalEchoBonus:0,combatAttackCount:0,poisonOnHitChance:0,execute:0,classElementProcs:{},omniElementChance:0,equipment:{}});
    const enemies=['A','B','C','D'].map((name,index)=>{const hp=1+index;return {name:`Target ${name}`,icon:'🎯',hp,maxHp:hp,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:0,rangerMarks:0,gold:0,xp:0};});
    currentEnemies=enemies;currentEnemyIndex=0;currentEnemy=enemies[0];currentEncounterLead=enemies[0];currentEncounterTurn=0;gameStarted=true;combatBusy=false;
    $('combatOverlay')?.classList.remove('hidden');updateCombatUI();
    const captures=[],events=[],baseAnimate=animateClassAttack,baseResponse=resolveEnemyResponse,stop=DiceboundStateEvents.on('combat:strike',result=>events.push({targetName:result.targetName,targetHp:result.targetHp,presentationTarget:result.presentationTarget,surfaces:db0648SelectedTargetSurfaces()}));
    animateClassAttack=async mode=>{captures.push({mode,surfaces:db0648SelectedTargetSurfaces()});await delay(35);};
    resolveEnemyResponse=async()=>{combatBusy=false;};
    try{await dbCombat.attack();return {captures,events,afterDelay:db0648SelectedTargetSurfaces(),living:livingEnemies().map(enemy=>enemy.name)};}
    finally{stop();animateClassAttack=baseAnimate;resolveEnemyResponse=baseResponse;combatBusy=false;}
  }
  function db06420PassivePoisonTargetExercise(){
    resetPlayer('fighter');
    Object.assign(player,{attack:100,poisonStackPower:.12,classElementProcs:{},omniElementChance:0,equipment:{}});
    const defeated={name:'Poison Target A',icon:'🎯',hp:1,maxHp:1,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:1,rangerMarks:0,gold:0,xp:0};
    const survivor={name:'Poison Target B',icon:'🎯',hp:20,maxHp:20,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:0,rangerMarks:0,gold:0,xp:0};
    currentEnemies=[defeated,survivor];currentEnemyIndex=0;currentEnemy=defeated;currentEncounterLead=defeated;currentEncounterTurn=0;gameStarted=true;combatBusy=false;
    $('combatOverlay')?.classList.remove('hidden');updateCombatUI();
    const events=[],stop=DiceboundStateEvents.on('combat:target-advanced',event=>events.push({reason:event.reason,defeatedIndex:event.defeatedIndex,targetIndex:event.targetIndex,targetName:event.targetName}));
    try{const dealt=applyPoisonTick();return {dealt,defeatedHp:defeated.hp,surfaces:db0648SelectedTargetSurfaces(),events,living:livingEnemies().map(enemy=>enemy.name)};}
    finally{stop();combatBusy=false;}
  }
  window.DiceboundTargetPresentationTest=Object.freeze({
    resolver:()=>({apiVersion:db0648Targeting.apiVersion}),
    surfaces:db0648SelectedTargetSurfaces,
    chainedKills:db0648ChainedTargetPresentationExercise,
    passivePoisonDeath:db06420PassivePoisonTargetExercise
  });

  /* #124: a test-only, real-runtime cycle for comparing like with like.
     It intentionally records observations rather than declaring any node/heap
     increase a leak. The temporary run is discarded through the existing
     checkpoint owner before and after the exercise, and it is never exposed
     through the player-facing Debug menu. */
  const DB06411_MEMORY_STRESS_MAX_CYCLES=12;
  const db06411NextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  function db06411ResetMemoryStressSession(){
    dbRunClearCheckpoint();
    currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;currentEnemyIndex=0;currentEncounterTurn=0;
    combatBusy=false;gameStarted=false;rollLocked=true;$('combatOverlay')?.classList.add('hidden');
    openStartScreen();
  }
  function db06411PrepareSingleEnemyCombat(){
    const index=Math.min(1,Math.max(0,tiles.length-1)),base=dbRun.enemyForPosition(index);
    if(!base)throw new Error('Memory stress exercise could not resolve its ordinary-enemy fixture.');
    tiles[index]={...(tiles[index]||{}),type:'enemy',cleared:false,enemyBase:{...base},enemyBases:undefined};
    player.position=index;refreshBoardHighlights();
    startCombat('normal');
    if(!currentEnemy||currentEnemies.length!==1)throw new Error('Memory stress exercise did not enter a single ordinary-enemy combat.');
  }
  function db06411LeaveStressCombat(){
    const tile=tiles[player.position];
    if(tile){tile.cleared=true;tile.type='empty';delete tile.enemyBase;delete tile.enemyBases;refreshTile(player.position);}
    $('combatOverlay')?.classList.add('hidden');
    currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;currentEnemyIndex=0;currentEncounterTurn=0;combatBusy=false;
    returnToRoad();
  }
  async function db06411RunMemoryStressCycles(requestedCycles=3){
    const cycles=Math.max(1,Math.min(DB06411_MEMORY_STRESS_MAX_CYCLES,Math.floor(Number(requestedCycles)||3))),api=db064MemoryDiagnostics,wasRecording=api.diagnostics().recording,samples=[];
    if(wasRecording)api.setRecording(false);
    const capture=reason=>{const sample=api.snapshot(reason);samples.push(sample);return sample;};
    try{
      db06411ResetMemoryStressSession();await db06411NextFrame();capture('stress:camp:baseline');
      for(let cycle=1;cycle<=cycles;cycle++){
        startNewGame();await db06411NextFrame();capture(`stress:cycle-${cycle}:board:started`);
        db06411PrepareSingleEnemyCombat();await db06411NextFrame();capture(`stress:cycle-${cycle}:combat:ordinary`);
        db06411LeaveStressCombat();await db06411NextFrame();capture(`stress:cycle-${cycle}:board:after-combat`);
        db06411ResetMemoryStressSession();await db06411NextFrame();capture(`stress:cycle-${cycle}:camp`);
      }
      const camp=api.summarizeEquivalentState(samples,{screen:'Camp',runActive:false}),board=api.summarizeEquivalentState(samples,{screen:'Board',runActive:true}),combat=api.summarizeEquivalentState(samples,{screen:'Combat',runActive:true});
      return Object.freeze({cycles,samples:Object.freeze([...samples]),equivalent:Object.freeze({camp,board,combat}),notes:Object.freeze(['Equivalent-state deltas are measurements, not leak conclusions.','The test fixture uses one ordinary enemy per cycle and clears its temporary active-run checkpoint.'])});
    }finally{
      db06411ResetMemoryStressSession();
      if(wasRecording)api.setRecording(true);
    }
  }
  window.DiceboundMemoryDiagnosticsStressTest=Object.freeze({
    maxCycles:DB06411_MEMORY_STRESS_MAX_CYCLES,
    run:db06411RunMemoryStressCycles
  });


  dbCombatView.prepareProjectileEffects?.();
  function dbFriendClearCombatPresentation(){
    dbCombatView.clearTransient();
    document.querySelectorAll('.element-proc-fx,.enemy-proc-fx,.db-combat-projectile-vfx').forEach(node=>node.remove());
    const fx=$('attackFx');if(fx){fx.className='attack-fx';fx.replaceChildren();}
    $('combatPlayerIcon')?.classList.remove('attack-lunge','db-dodge-backflip','db-dragoon-airborne','db-dragoon-landing');
  }
  dbReturnToRoadFriendReady=true;

  window.DiceboundCamp.configureShell({refreshActivePetArt:()=>db059RefreshActivePetArt?.()});
  function dbFriendHealAtCamp(){
    const max=Math.max(1,Math.floor(Number(player?.maxHp)||1));
    if(Number(player?.hp)>=max)return false;
    player.hp=max;updateHUD();return true;
  }
  window.DiceboundCamp.configureShell({resetInvokerCombat:()=>dbClasses.invokerResetCombat(),healAtCamp:()=>dbFriendHealAtCamp(),clearCombatPresentation:()=>dbFriendClearCombatPresentation()});
  function dbFriendCampRecoveryExercise(){resetPlayer('ranger');player.hp=1;openStartScreen();return Object.freeze({hp:player.hp,maxHp:player.maxHp,campVisible:!$('startOverlay')?.classList.contains('hidden')});}
  function dbFriendBoardClearModeRegressionExercise(){
    const before={...(dbProgression.careerStats().boardClears||{})},modes={nightmare:nightmareMode,hell:hellMode};
    try{
      meta.stats.boardClears={};nightmareMode=false;hellMode=false;dbProgression.recordBoardClear(2,'ranger');dbProgression.recordBoardClear(4,'ranger');nightmareMode=true;dbProgression.recordBoardClear(3,'ranger');hellMode=true;dbProgression.recordBoardClear(5,'ranger');
      return Object.freeze({keys:Object.keys(meta.stats.boardClears).sort(),hasNormal:dbProgression.hasBoardClear('ranger',4),hasNightmare:dbProgression.hasBoardClear('ranger',3),hasHell:dbProgression.hasBoardClear('ranger',5)});
    }finally{meta.stats.boardClears=before;nightmareMode=modes.nightmare;hellMode=modes.hell;saveMeta();}
  }

  /* Dragoon #97 — class-action ownership lives in DiceboundClasses. */
  const dbFriendDragoonActive=()=>player?.classId==='dragoon';
  const dbFriendDragoonCooldown=()=>dbClasses.dragoonCooldown();
  function dbFriendSyncDragoonPresentation(){return dbCombatView.syncDragoonPresentation();}
  function dbFriendDragoonLandPresentation(){return dbCombatView.dragoonLandPresentation();}
  function dbFriendResetDragoonState(){return dbClasses.dragoonResetState();}
  async function dbFriendDragoonLanding(){return dbClasses.dragoonLanding();}
  async function dbFriendDragoonJump(){return dbClasses.dragoonJump();}
  function dbFriendTickDragoonCooldown(){return dbClasses.dragoonTickCooldown();}
  async function dbFriendDragoonRegressionExercise(){
    const enemy={name:'Airborne Exercise Guardian',icon:'🐲',hp:999,maxHp:999,attack:999,defense:0,weakness:'ice',affinity:null,poisonStacks:0,guardian:true,finalBoss:true,specialName:'Exercise Skybreaker'};
    try{
      resetPlayer('dragoon');gameStarted=true;rollLocked=false;combatBusy=false;currentEnemies=[enemy];currentEnemy=enemy;currentEnemyIndex=0;currentEncounterLead=enemy;currentEnemyTile=null;currentEncounterTurn=Math.max(0,GUARDIAN_SPECIAL_INTERVAL-1);
      $('combatOverlay')?.classList.remove('hidden');dbCombatView.renderEnemyParty();updateCombatUI();
      const hpBefore=player.hp,jumpButton=$('dragoonJumpBtn'),jumpVisible=!!jumpButton&&!jumpButton.hidden,jumped=await dbFriendDragoonJump();
      const airborne={hp:player.hp,cooldown:player.dragoonJumpCooldown,landingReady:!!player.dragoonLandingReady,airborneResponses:player.dragoonAirborneResponses,turn:currentEncounterTurn,artRaised:$('combatPlayerIcon')?.classList.contains('db-dragoon-airborne')===true};
      const enemyHpBeforeLanding=enemy.hp,landed=await dbCombat.attack();
      return Object.freeze({jumped,jumpVisible,hpBefore,airborne,landed:!!landed,landingDamage:Math.max(0,enemyHpBeforeLanding-enemy.hp),cooldown:player.dragoonJumpCooldown,landingReady:!!player.dragoonLandingReady,artRestored:$('combatPlayerIcon')?.classList.contains('db-dragoon-airborne')===false});
    }finally{
      dbFriendClearCombatPresentation();currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;currentEnemyIndex=0;combatBusy=false;gameStarted=false;rollLocked=true;openStartScreen();
    }
  }
  window.DiceboundFriendsPatchTest=Object.freeze({
    dragoon:()=>Object.freeze({active:dbFriendDragoonActive(),cooldown:dbFriendDragoonCooldown(),airborneResponses:player?.dragoonAirborneResponses||0,landingReady:!!player?.dragoonLandingReady}),
    exerciseDragoon:dbFriendDragoonRegressionExercise,
    exerciseCampRecovery:dbFriendCampRecoveryExercise,
    exerciseBoardClearModes:dbFriendBoardClearModeRegressionExercise,
    clearCombatPresentation:dbFriendClearCombatPresentation,
    feedPet:count=>dbPets.feed(count),
    petCombatArt:()=>$('combatPet')?.querySelector('img')?.getAttribute('src')||null
  });

  const dbCombatElementOwner=window.DiceboundCombatElementResolution;
  if(!dbCombatElementOwner)throw new Error('DiceBound requires the combat Element-resolution owner before dicebound.js');
  dbCombatElementResolution=dbCombatElementOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    setCurrentEnemy:value=>{currentEnemy=value;},
    livingEnemies:()=>livingEnemies(),
    getEncounterLead:()=>currentEncounterLead,
    getEncounterTurn:()=>currentEncounterTurn,
    setEncounterTurn:value=>{currentEncounterTurn=value;},
    getElements:()=>ELEMENTS,
    getRarityValues:()=>rarityValues,
    getCoreElements:()=>DIBO_ELEMENTS,
    random:()=>random(),
    clamp:(value,min,max)=>clamp(value,min,max),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    applyPlayerDamage:raw=>applyCombatPlayerDamage(raw),
    healPlayer:(...args)=>dbCombat.heal(...args),
    trackElementProgress:(key,amount)=>dbPets.trackElementProgress(key,amount),
    playElementAnimation:(key,target,enemySource)=>playElementAnimation(key,target,enemySource),
    addLog:text=>addLog(text),
    showToast:(...args)=>showToast(...args),
    addCombatHistory:text=>addCombatHistory(text),
    renderEnemyParty:()=>dbCombatView.renderEnemyParty(),
    updateCombatUI:()=>updateCombatUI(),
    updateHUD:()=>updateHUD(),
    setProcBonus:()=>v19SetProcBonus(),
    setElementPower:()=>v19SetElementPower(),
    hasLegendaryEffect:id=>db060HasEffect(id),
    reconcileDefeatedTarget:(target,reason)=>db0648ReconcileDefeatedTarget(target,reason),
    withNatureLegacyPresentation:(key,work)=>dbCombatView.withNatureLegacyPresentation(key,work),
    livingNatureTargets:list=>dbCombatView.livingNatureTargets(list),
    playNatureOnEnemy:enemy=>dbCombatView.playNatureOnEnemy(enemy),
    playNatureOnPlayer:()=>dbCombatView.playNatureOnPlayer(),
    playDonutRain:payload=>dbCombatView.playDonutRain(payload),
    playProjectileProc:(key,payload)=>dbCombatView.playProjectileProc?.(key,payload),
    playMathFormula:payload=>dbCombatView.playMathFormula?.(payload),
    applyEnemyConfusion:enemy=>dbCombatConfusionResolution.applyEnemy(enemy),
    applyPlayerConfusion:()=>dbCombatConfusionResolution.applyPlayer(),
    clearPlayerConfusion:()=>dbCombatConfusionResolution.clearPlayer(),
    recordCareerElementProc:()=>dbProgression.recordElementProc(1)
  });

  const dbCombatHealingOwner=window.DiceboundCombatHealingResolution;
  if(!dbCombatHealingOwner)throw new Error('DiceBound requires the combat Healing-resolution owner before dicebound.js');
  dbCombatHealingResolution=dbCombatHealingOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    recordCareerHealing:amount=>dbProgression.recordHealing(amount),
    setStatsLastHp:value=>{statsLastHp=value;},
    saveMeta:()=>saveMeta(),
    checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks(),
    isClassActive:id=>classIdentityActive(id),
    clamp:(value,min,max)=>clamp(value,min,max),
    identityFlash:text=>identityFlash(text),
    addCombatHistory:text=>addCombatHistory(text),
    floatCombatText:fact=>dbCombatView.floatCombatText?.(fact),
    syncShieldBars:()=>v24UpdateShieldBars(),
    syncOuroborosAttack:()=>v18SyncOuroborosAttack()
  });

  const dbCombatPetTurnOwner=window.DiceboundCombatPetTurnResolution;
  if(!dbCombatPetTurnOwner)throw new Error('DiceBound requires the combat Pet turn-resolution owner before dicebound.js');
  dbCombatPetTurnResolution=dbCombatPetTurnOwner.configure({
    getPlayer:()=>player,
    getMeta:()=>meta,
    getPets:()=>PETS,
    getElements:()=>ELEMENTS,
    getDiboElements:()=>DIBO_ELEMENTS,
    getBoardLevel:()=>boardLevel,
    isGameStarted:()=>gameStarted,
    talentRank:id=>talentRank(id),
    gameplayTalentRank:id=>dbProgression.gameplayTalentRank(id),
    isClassActive:id=>classIdentityActive(id),
    livingEnemies:()=>livingEnemies(),
    getCurrentEnemy:()=>currentEnemy,
    getCurrentEnemies:()=>currentEnemies,
    setCurrentEnemy:index=>setCurrentEnemy(index),
    animatePetAttack:async(duration=300,active=true)=>{const pet=$("combatPet");if(!pet)return;if(active){pet.classList.remove("pet-attack");void pet.offsetWidth;pet.classList.add("pet-attack");if(duration>0)await delay(duration);}else pet.classList.remove("pet-attack");},
    delay:ms=>delay(ms),
    random:()=>random(),
    pick:list=>pick(list),
    clamp:(value,min,max)=>clamp(value,min,max),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    trackElementProgress:(key,amount)=>dbPets.trackElementProgress(key,amount),
    tone:(frequency,duration,type,gain,slide)=>tone(frequency,duration,type,gain,slide),
    setCombatText:text=>setCombatText(text),
    updateCombatUI:()=>updateCombatUI(),
    addCombatHistory:text=>addCombatHistory(text),
    healPlayer:amount=>dbCombat.heal(amount),
    triggerElementEffect:(key,target,options)=>dbCombat.element(key,target,options),
    setPetDoubleBonus:()=>v19SetPetDoubleBonus(),
    petBondLevel:id=>dbPets.bondLevel(id),
    hasLegendaryEffect:id=>db060HasEffect(id),
    getLastElement:()=>player._db060LastElement
  });

  const dbConsumablesOwner=window.DiceboundConsumables;
  if(!dbConsumablesOwner)throw new Error('DiceBound requires the Consumables owner before dicebound.js');
  dbConsumablesResolution=dbConsumablesOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    livingEnemies:()=>livingEnemies(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    isGameStarted:()=>gameStarted,
    getRollLocked:()=>rollLocked,
    rollD20Chaos:action=>dbCombat.chaos(action),
    healPlayer:amount=>dbCombat.heal(amount),
    playHeal:()=>sfx.heal(),
    triggerElementEffect:(...args)=>dbCombat.element(...args),
    getDiboElements:()=>DIBO_ELEMENTS,
    applyMythicPantsPulse:()=>applyMythicPantsPulse(),
    setCombatText:text=>setCombatText(text),
    updateCombatUI:()=>updateCombatUI(),
    delay:ms=>delay(ms),
    winCombat:()=>dbCombat.win(),
    resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),
    recordCareerPotionUse:()=>dbProgression.recordPotionUse(),
    checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks(),
    saveMeta:()=>saveMeta(),
    renderClassChooser:()=>window.DiceboundClassChooser?.render?.(),
    addLog:html=>addLog(html),
    showToast:(...args)=>showToast(...args),
    updateHud:()=>updateHUD(),
    traceCommand:(name,fn,level,args,thisArg)=>v25TraceCommand(name,fn,level,args,thisArg),
    isClassActive:id=>classIdentityActive(id),
    dragoonActive:()=>dbFriendDragoonActive(),
    dragoonLandingReady:()=>!!player.dragoonLandingReady,
    dragoonLanding:()=>dbFriendDragoonLanding(),
    tickDragoonCooldown:()=>dbFriendTickDragoonCooldown(),
    afterPlayerAction:kind=>dbClasses.invokerAfterPlayerAction(kind)
  });

  const dbCombatVictoryOwner=window.DiceboundCombatVictoryResolution;
  if(!dbCombatVictoryOwner)throw new Error('DiceBound requires the combat Victory-resolution owner before dicebound.js');
  dbCombatVictoryResolution=dbCombatVictoryOwner.configure({
    getState:()=>({player,meta,boardLevel,nightmareMode,hellMode,combatKind:v16CombatKind,tiles,currentEnemy,currentEnemies,currentEncounterLead,currentEnemyTile}),
    recordEnemyDefeats:(enemies,context)=>dbProgression.recordEnemyDefeats(enemies,context),
    recordBoardClear:(board,classId)=>dbProgression.recordBoardClear(board,classId),
    clearBloodOverhealTemp:()=>dbCombat.clearBloodOverhealTemp(),
    modifiedGold:amount=>modifiedGold(amount),
    healPlayer:amount=>dbCombat.heal(amount),
    saveMeta:()=>saveMeta(),
    showToast:(...args)=>showToast(...args),
    checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks(),
    addLog:html=>addLog(html),
    unlockClass:id=>dbProgression.unlockClass(id),
    refreshTile:index=>refreshTile(index),
    setCombatText:text=>setCombatText(text),
    playWin:()=>sfx.win(),
    updateHud:()=>updateHUD(),
    delay:ms=>delay(ms),
    presentVictory:payload=>BattleVictoryUI.present(BattleVictoryState.create(payload)),
    hideCombatOverlay:()=>$('combatOverlay')?.classList.add('hidden'),
    resetVictoryPresentation:()=>BattleVictoryUI.reset(),
    clearEncounterState:()=>{currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;},
    grantXp:xp=>grantXp(xp),
    getPendingLevelUps:()=>pendingLevelUps,
    openLevelUp:done=>dbPowerups.openLevelUp(done),
    openCombatLootChain:(defeated,done)=>openCombatLootChain(defeated,done),
    showLegendaryChoice:(source,done)=>dbPowerups.openLegendary(source,done),
    advanceToNextBoard:()=>advanceToNextBoard(),
    completeFinalRoad:()=>completeSixthRoadV19(),
    returnToRoad:()=>returnToRoad(),
    renderClassChoices:()=>window.DiceboundClassChooser.render(),
    setMerchantBossFlags:flags=>{merchantBossBattle=!!flags.battle;merchantBossPrimed=!!flags.primed;merchantBossDefeatedThisBoard=!!flags.defeatedThisBoard;},
    restoreRadiationDefense:()=>restoreRadiationDefenseV16(),
    traceCommand:(name,fn,level,args,thisArg)=>v25TraceCommand(name,fn,level,args,thisArg),
    logDebug:(level,category,message,data)=>v25Log(level,category,message,data),
    debugState:()=>v25State(),
    setCombatBusy:value=>{combatBusy=!!value;},
    isCombatOverlayHidden:()=>!!$('combatOverlay')?.classList.contains('hidden'),
    setRollLocked:value=>{rollLocked=!!value;},
    clearStoneBattle:()=>v26ClearStoneBattle(),
    grantLegacyXp:gain=>dbProgression.grantLegacyXp(gain),
    updateMetaUi:()=>updateMetaUI(),
    restoreEnemyElementDebuffs:()=>db0511RestoreEnemyElementDebuffs(),
    clearLegendaryBattleTemps:()=>db060ClearBattleLegendaryTemps(),
    getClassUnlockFacts:()=>dbClassUnlockFacts(),
    recordCombatFacts:(facts,payload)=>DB_CLASS_UNLOCK_RULES.recordCombatFacts(facts,payload),
    clearRogueStolenStats:()=>dbClasses.clearRogueStolenStats()
  });

  const dbCombatAttackOwner=window.DiceboundCombatAttackActionResolution;
  if(!dbCombatAttackOwner)throw new Error('DiceBound requires the combat Attack-action owner before dicebound.js');
  dbCombatAttackResolution=dbCombatAttackOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    getCurrentEnemies:()=>currentEnemies,
    livingEnemies:()=>livingEnemies(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    rollD20Chaos:(...args)=>dbCombat.chaos(...args),
    updateCombatUI:()=>updateCombatUI(),
    rollTieredProc:chance=>rollTieredProc(chance),
    performStrike:(...args)=>dbCombat.strike(...args),
    chargeUltimate:amount=>chargeUltimate(amount),
    applyMythicPantsPulse:()=>applyMythicPantsPulse(),
    setCombatText:text=>setCombatText(text),
    winCombat:(...args)=>dbCombat.win(...args),
    setCurrentEnemy:index=>setCurrentEnemy(index),
    resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),
    isClassActive:id=>classIdentityActive(id),
    classIdentityId:()=>classIdentityId(),
    hasLegendaryEffect:id=>db060HasEffect(id),
    showToast:text=>showToast(text),
    addCombatHistory:text=>addCombatHistory(text),
    actionBonuses:()=>dbClasses.invokerActionBonuses(),
    afterPlayerAction:kind=>dbClasses.invokerAfterPlayerAction(kind),
    dragoonActive:()=>dbFriendDragoonActive(),
    dragoonLandingReady:()=>!!player.dragoonLandingReady,
    dragoonLanding:()=>dbFriendDragoonLanding(),
    tickDragoonCooldown:()=>dbFriendTickDragoonCooldown()
  });

  const dbCombatManaActionOwner=window.DiceboundCombatManaActionResolution;
  if(!dbCombatManaActionOwner)throw new Error('DiceBound requires the combat Mana action owner before dicebound.js');
  const dbCombatManaActionResolution=dbCombatManaActionOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    getCurrentEnemies:()=>currentEnemies,
    livingEnemies:()=>livingEnemies(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    classIdentityId:()=>classIdentityId(),
    isClassActive:id=>classIdentityActive(id),
    clamp:(value,min,max)=>clamp(value,min,max),
    playerAttack:(...args)=>dbCombat.attack(...args),
    invokerActive:()=>dbClasses.invokerActive(),
    invokerWexStrike:()=>dbClasses.invokerWexStrike(),
    invokerElementalLance:()=>dbClasses.invokerElementalLance(),
    identityFlash:text=>identityFlash(text),
    updateCombatUI:()=>updateCombatUI(),
    animateClassAttack:mode=>animateClassAttack(mode),
    rand:(min,max)=>rand(min,max),
    pick:values=>pick(values),
    rollTieredProc:chance=>rollTieredProc(chance),
    coreElementIds:()=>DIBO_ELEMENTS,
    triggerElementEffect:(...args)=>dbCombat.element(...args),
    triggerStrikeElements:(target,chaos)=>triggerStrikeElements(target,chaos),
    playElementAnimation:(key,target,fromEnemy)=>playElementAnimation(key,target,fromEnemy),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    healPlayer:amount=>dbCombat.heal(amount),
    getSetDamageBonus:()=>v19SetDamageBonus(),
    getEncounterLead:()=>currentEncounterLead,
    chargeUltimate:amount=>chargeUltimate(amount),
    setCombatText:text=>setCombatText(text),
    critSfx:()=>sfx.crit(),
    delay:ms=>delay(ms),
    winCombat:(...args)=>dbCombat.win(...args),
    setCurrentEnemy:index=>setCurrentEnemy(index),
    resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),
    getPets:()=>PETS,
    getMeta:()=>meta,
    petTurn:(...args)=>dbCombat.petTurn(...args),
    addCombatHistory:text=>addCombatHistory(text),
    recordManaSpenderCast:()=>{meta.classUnlockFacts=DB_CLASS_UNLOCK_RULES.recordManaSpenderCast(dbClassUnlockFacts(),true);},
    saveMeta:()=>saveMeta(),
    checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks()
  });

  const dbCombatGuardOwner=window.DiceboundCombatGuardResolution;
  if(!dbCombatGuardOwner)throw new Error('DiceBound requires the combat Guard-resolution owner before dicebound.js');
  dbCombatGuardResolution=dbCombatGuardOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    livingEnemies:()=>livingEnemies(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    rollD20Chaos:action=>dbCombat.chaos(action),
    chargeUltimate:amount=>chargeUltimate(amount),
    healPlayer:amount=>dbCombat.heal(amount),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    triggerElementEffect:(key,target,options)=>dbCombat.element(key,target,options),
    getDiboElements:()=>DIBO_ELEMENTS,
    applyMythicPantsPulse:()=>applyMythicPantsPulse(),
    updateCombatUI:()=>updateCombatUI(),
    setCombatText:text=>setCombatText(text),
    tone:(frequency,duration,type,gain,slide)=>tone(frequency,duration,type,gain,slide),
    delay:ms=>delay(ms),
    winCombat:()=>dbCombat.win(),
    resolveEnemyResponse:(guarded,bonus)=>resolveEnemyResponse(guarded,bonus),
    isClassActive:id=>classIdentityActive(id),
    classIdentityId:()=>classIdentityId(),
    classHasMechanic:tag=>classHasMechanic(tag),
    getClassTags:id=>CLASSES[id]?.tags||[],
    gameplayTalentRank:id=>dbProgression.gameplayTalentRank(id),
    getWeaponElement:()=>player.equipment?.weapon?.element||null,
    getActivePetElement:()=>dbPets.activeDefinition().element,
    getElementKeys:()=>ELEMENT_KEYS,
    random:()=>random(),
    pick:list=>pick(list),
    clamp:(value,min,max)=>clamp(value,min,max),
    addCombatHistory:text=>addCombatHistory(text),
    identityFlash:text=>identityFlash(text),
    manaGain:amount=>dbCombat.manaGain(amount),
    hasMythicPiece:slot=>hasMythicPiece(slot),
    hasLegendaryEffect:id=>db060HasEffect(id),
    rollTieredProc:chance=>rollTieredProc(chance),
    afterPlayerAction:kind=>dbClasses.invokerAfterPlayerAction(kind),
    dragoonActive:()=>dbFriendDragoonActive(),
    dragoonLandingReady:()=>!!player.dragoonLandingReady,
    dragoonLanding:()=>dbFriendDragoonLanding(),
    tickDragoonCooldown:()=>dbFriendTickDragoonCooldown(),
    invokeGuardAction:(...args)=>dbCombat.guard(...args)
  });

  const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;
  if(!dbCombatStrikeOwner)throw new Error('DiceBound requires the combat strike-resolution owner before dicebound.js');
  dbCombatStrikes=dbCombatStrikeOwner.configure({
    getPlayer:()=>player,getEncounterLead:()=>currentEncounterLead,livingEnemies:()=>livingEnemies(),isClassActive:id=>classIdentityActive(id),
    random,rand,pick,clamp,rollTieredProc,
    resolveCriticalTiers:(roller,options)=>window.DiceboundStrikePolicy.resolveCriticalTiers(roller,options),
    rangerMarkTotal:(before,options)=>window.DiceboundStrikePolicy.rangerMarkTotal(before,options),
    setDamageBonus:()=>v19SetDamageBonus(),petDamage:()=>petDamage(),healPlayer:amount=>dbCombat.heal(amount),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),animateClassAttack:(mode,options)=>animateClassAttack(mode,options),
    playElementAnimation:(key,target,fromEnemy)=>playElementAnimation(key,target,fromEnemy),addCombatHistory:text=>addCombatHistory(text),
    updateCombatUI:()=>updateCombatUI(),setCombatText:text=>setCombatText(text),playHolySfx:()=>sfx.holy(),
    triggerStrikeElements:(target,chaos)=>triggerStrikeElements(target,chaos),triggerElementEffect:(key,target,options)=>dbCombat.element(key,target,options),
    identityFlash:text=>identityFlash(text),reconcileDefeatedTarget:(target,reason)=>db0648ReconcileDefeatedTarget(target,reason),
    presentationTargetSnapshot:()=>db0648PresentationTargetSnapshot(),emitStrike:result=>DiceboundStateEvents.emit('combat:strike',result),
    renderStrike:result=>CombatUI.renderStrike(result),delay:ms=>delay(ms),chargeUltimate:amount=>chargeUltimate(amount),
    hasDevilsHorns:()=>v24HasHorns(),hasLegendaryEffect:id=>db060HasEffect(id),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),
    syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),getElementKeys:()=>ELEMENT_KEYS,
    recordCareerStrike:result=>dbProgression.recordStrike(result),
    outgoingDamageMultiplier:()=>dbClasses.invokerOutgoingMultiplier(),
    afterPlayerHit:(target,options)=>dbClasses.invokerAfterPlayerHit(target,options)
  });

  const dbCombatUltimateOwner=window.DiceboundCombatUltimateResolution;
  if(!dbCombatUltimateOwner)throw new Error('DiceboundCombatUltimateResolution must load before dicebound.js');
  dbCombatUltimateResolution=dbCombatUltimateOwner.configure({
    getPlayer:()=>player,
    getMeta:()=>meta,
    getCurrentEnemy:()=>currentEnemy,
    getCurrentEnemies:()=>currentEnemies,
    getEncounterLead:()=>currentEncounterLead,
    livingEnemies:()=>livingEnemies(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    selectEnemy:index=>setCurrentEnemy(index),
    isClassActive:id=>classIdentityActive(id),
    hasLegendaryEffect:id=>db060HasEffect(id),legendaryEffect:id=>DB060_EFFECT_BY_ID[id],
    random:()=>random(),
    rand:(min,max)=>rand(min,max),
    pick:list=>pick(list),
    clamp:(value,min,max)=>clamp(value,min,max),
    rollTieredProc:chance=>rollTieredProc(chance),
    getSetDamageBonus:()=>v19SetDamageBonus(),
    ultimateBaseDamage:(classId,actor,bonus)=>DB_EFFECTIVE_STATS.ultimateBaseDamage(classId,actor,bonus),
    scaleUltimateDamage:(damage,actor,opts)=>DB_EFFECTIVE_STATS.scaleUltimateDamage(damage,actor,opts),
    damageEnemy:(enemy,amount,ignoreDefense)=>damageEnemy(enemy,amount,ignoreDefense),
    damageAll:(amount,secondary)=>damageAll(amount,secondary),
    healPlayer:(amount,opts)=>dbCombat.heal(amount,opts),
    manaGain:amount=>dbCombat.manaGain(amount),
    triggerStrikeElements:(target,chaos)=>triggerStrikeElements(target,chaos),
    petDamage:()=>petDamage(),
    trainerPetDamage:id=>dbCombat.trainerPetDamage(id),
    syncOuroborosAttack:()=>v18SyncOuroborosAttack(),
    rollD20Chaos:action=>dbCombat.chaos(action),
    updateCombatUI:()=>updateCombatUI(),
    animateUltimate:()=>animateUltimate(),
    animateClassAttack:mode=>animateClassAttack(mode),
    setCombatText:text=>setCombatText(text),
    addCombatHistory:text=>addCombatHistory(text),
    identityFlash:text=>identityFlash(text),
    playCritSfx:()=>sfx.crit(),
    playHolySfx:()=>sfx.holy(),
    delay:ms=>delay(ms),
    getCombatActionDelay:()=>ALPHA_COMBAT_DELAY,
    winCombat:()=>dbCombat.win(),
    resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),
    petTurn:(...args)=>dbCombat.petTurn(...args),
    applyMythicPantsPulse:()=>applyMythicPantsPulse(),
    applyMythicRingPulse:()=>applyMythicRingPulse(),
    potionHealValue:fraction=>dbConsumablesResolution.potionHealValue(fraction),
    getPets:()=>PETS,
    getGagInfo:()=>GAG_INFO,
    slimeRougeUltimate:()=>v318UseSlimeRougeUltimate(),
    dragoonActive:()=>dbFriendDragoonActive(),
    dragoonLandingReady:()=>!!player.dragoonLandingReady,
    dragoonLanding:()=>dbFriendDragoonLanding(),
    tickDragoonCooldown:()=>dbFriendTickDragoonCooldown(),
    invokeUltimate:()=>dbClasses.invokerUltimate(),
  });

  dbCombatView.configurePresentation({
    document,
    guardianSpecialInterval:GUARDIAN_SPECIAL_INTERVAL,
    getState:()=>({player,currentEnemy,currentEnemies,currentEnemyIndex,currentEncounterLead,currentEncounterTurn,combatBusy,boardLevel,nightmareMode,hellMode}),
    find:$,
    getClasses:()=>CLASSES,
    getElements:()=>ELEMENTS,
    getPets:()=>PETS,
    getOccultSpells:()=>dbCombatManaActionResolution.spells(),
    getGagInfo:()=>GAG_INFO,
    isClassActive:id=>classIdentityActive(id),
    hasClassMechanic:id=>classHasMechanic(id),
    classIdentityId:()=>classIdentityId(),
    applyClassPortrait:(...args)=>dbClassPresentation.applyPortrait(...args),
    enemyBattleArtById:(id,level)=>window.DiceboundAssets.resolveEnemyBattleArtById(id,level),
    enemyPortraitById:id=>window.DiceboundAssets.resolveEnemyPortraitById(id),
    enemyModeAura:mode=>window.DiceboundAssets.resolveEnemyModeAura(mode),
    guardianBattleArt:id=>DB317_GUARDIANS.resolveById(id)?.art?.battle||window.DiceboundAssets.resolveGuardianArt(id)?.battle||null,
    potionHealValue:()=>dbConsumablesResolution.potionHealValue(),
    potionTooltip:()=>v18PotionTooltip(),
    describeUltimate:id=>describeCurrentUltimate(id),
    berserkerRageBonus:()=>DB_EFFECTIVE_STATS.berserkerRageBonus(player),
    hasLegendaryEffect:id=>db060HasEffect(id),legendaryEffect:id=>DB060_EFFECT_BY_ID[id],
    activeTrainerPetId:()=>dbCombat.activeTrainerPetId(),
    invokerAttackSpec:key=>dbClasses.invokerAttackSpec(key),
    selectEnemy:index=>setCurrentEnemy(index),
    dragoonActive:()=>dbFriendDragoonActive(),
    dragoonJumpCooldown:()=>dbFriendDragoonCooldown(),
    onDragoonJump:()=>dbFriendDragoonJump(),
    performClassAction:kind=>dbClasses.performAction(kind),
    clamp:(value,min,max)=>clamp(value,min,max),
    delay:ms=>delay(ms)
  });

  const dbCombatEncounterOwner=window.DiceboundCombatEncounterLifecycle;
  if(!dbCombatEncounterOwner)throw new Error('DiceBound requires the combat encounter-lifecycle owner before dicebound.js');
  dbCombatEncounterLifecycle=dbCombatEncounterOwner.configure({
    getPlayer:()=>player,
    getMeta:()=>meta,
    getTile:()=>tiles[player.position],
    getPosition:()=>player.position,
    getBoardLevel:()=>boardLevel,
    isNightmare:()=>nightmareMode,
    isHell:()=>hellMode,
    isClassActive:id=>classIdentityActive(id),
    petIds:()=>Object.keys(PETS),
    isPetUnlocked:(state,id)=>!!state.pets?.[id]?.unlocked,
    enemyById:id=>db317Enemy(id),
    finalGuardian:level=>db317FinalGuardian(level),
    minibossGuardian:level=>db317MinibossGuardian(level),
    enemyForPosition:index=>dbRun.enemyForPosition(index),
    scaleEnemy:(...args)=>scaleEnemy(...args),
    setMerchantBossBattle:value=>{merchantBossBattle=!!value;},
    setCombatKind:value=>{v16CombatKind=value;},
    setEncounterState:state=>{currentEnemies=state.enemies;currentEncounterLead=state.lead;currentEnemyIndex=state.index;currentEnemy=state.current;currentEnemyTile=state.tile;currentEncounterTurn=state.turn;combatBusy=state.busy;},
    getEncounterState:()=>({enemies:currentEnemies,lead:currentEncounterLead,index:currentEnemyIndex,current:currentEnemy,tile:currentEnemyTile,turn:currentEncounterTurn,busy:combatBusy}),
    setEncounterSelection:state=>{currentEnemies=state.enemies;currentEncounterLead=state.lead;currentEnemyIndex=state.index;currentEnemy=state.current;},
    mythicalSetCount:()=>mythicalSetCount(),
    hasMythicPiece:slot=>hasMythicPiece(slot),
    startUltimate:()=>v19SetStartUltimate(),
    setCombatTitle:value=>{$('combatTitle').textContent=value;},
    getCombatTitle:()=>$('combatTitle').textContent,
    setCombatSubtitle:value=>{$('combatSubtitle').textContent=value;},
    clearCombatHistory:()=>{$('combatHistory').innerHTML='';},
    setCombatText:(...args)=>setCombatText(...args),
    showCombatOverlay:()=>$('combatOverlay').classList.remove('hidden'),
    addLog:text=>addLog(text),
    renderEnemyParty:()=>dbCombatView.renderEnemyParty(),
    updateCombatUI:()=>updateCombatUI(),
    pick:values=>pick(values),
    clamp:(value,min,max)=>clamp(value,min,max),
    identityFlash:text=>identityFlash(text),
    addCombatHistory:text=>addCombatHistory(text),
    updateBossSpecialIndicator:()=>dbCombatView.renderBossSpecialIndicator(),
    clearStoneBattle:()=>v26ClearStoneBattle(),
    restoreEnemyElementDebuffs:()=>db0511RestoreEnemyElementDebuffs(),
    clearBattleLegendaryTemps:()=>db060ClearBattleLegendaryTemps(),
    traceCoreStart:(kind,work)=>v25TraceCommand('startCombat',work,'events',[kind]),
    onCombatStart:()=>dbClasses.invokerBeginCombat(),
    applyCombatBackground:()=>db0635ApplyCombatBackground(),
    syncBattleLog:()=>db064SyncBattleLog(),
    clearCombatPresentation:()=>dbFriendClearCombatPresentation(),
    refreshActivePetArt:()=>db059RefreshActivePetArt?.(),
    clearRogueStolenStats:()=>dbClasses.clearRogueStolenStats()
  });

  const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;
  if(!dbCombatTurnOwner)throw new Error('DiceBound requires the combat turn-resolution owner before dicebound.js');
  dbCombatTurns=dbCombatTurnOwner.configure({
    guardianSpecialInterval:GUARDIAN_SPECIAL_INTERVAL,
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    getCurrentEnemies:()=>currentEnemies,
    getEncounterLead:()=>currentEncounterLead,
    getEncounterTurn:()=>currentEncounterTurn,
    setEncounterTurn:value=>{currentEncounterTurn=value;},
    setCombatBusy:value=>{combatBusy=value;},
    livingEnemies:()=>livingEnemies(),
    selectEnemy:index=>setCurrentEnemy(index),
    random:()=>random(),
    rand:(min,max)=>rand(min,max),
    clamp:(value,min,max)=>clamp(value,min,max),
    delay:ms=>delay(ms),
    petTurn:()=>dbCombat.petTurn(),
    applyPoisonTick:()=>applyPoisonTick(),
    winCombat:()=>dbCombat.win(),
    handlePlayerDeath:()=>handlePlayerDeath(),
    setCombatText:(...args)=>setCombatText(...args),
    updateCombatUI:()=>updateCombatUI(),
    addCombatHistory:text=>addCombatHistory(text),
    renderEnemyParty:()=>dbCombatView.renderEnemyParty(),
    triggerElementEffect:(...args)=>dbCombat.element(...args),
    defenseDamageReduction:value=>defenseDamageReduction(value),
    effectiveDodgeChance:()=>effectiveDodgeChance(),
    enemyElementProc:enemy=>dbCombat.enemyElementProc(enemy),
    damageEnemy:(...args)=>damageEnemy(...args),
    healPlayer:(...args)=>dbCombat.heal(...args),
    mythicalSetCount:()=>mythicalSetCount(),
    guardianSpecialMultiplier:()=>v19SetGuardianSpecialMult(),
    hasMythicPiece:slot=>hasMythicPiece(slot),
    hasDevilsHorns:()=>v24HasHorns(),
    hasHeadphones:()=>v24HasHeadphones(),
    hasLegendaryEffect:id=>db060HasEffect(id),
    checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks(),
    saveMeta:()=>saveMeta(),
    playHitSfx:()=>sfx.hit(),
    recordDamageTaken:amount=>{const value=Math.max(0,Number(amount)||0);meta.damageTaken=(meta.damageTaken||0)+value;dbProgression.recordDamageTaken(value);},
    wolfEchoChance:()=>db064EnemyPolicy.wolfEchoChance(boardLevel,db064CombatMode()),
    presentEnemyAttack:fact=>dbCombatView.enemyAttack(fact),
    floatCombatText:fact=>dbCombatView.floatCombatText?.(fact),
    dodge:unit=>dbCombatView.dodge(unit),
    dragoonActive:()=>dbFriendDragoonActive(),
    responseModifier:()=>dbClasses.invokerResponseModifier(),
    consumeEnemyConfusionTarget:enemy=>dbCombatConfusionResolution.consumeEnemyTarget(enemy)
  });

  const dbCombatConfusionOwner=window.DiceboundCombatConfusionResolution;
  if(!dbCombatConfusionOwner)throw new Error('DiceBound requires the combat Confusion-resolution owner before dicebound.js');
  dbCombatConfusionResolution=dbCombatConfusionOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    livingEnemies:()=>livingEnemies(),
    playerSideTargets:()=>[{kind:'player',id:'player',name:'you',entity:player}],
    random:()=>random(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    defenseDamageReduction:value=>defenseDamageReduction(value),
    applyPlayerDamage:raw=>applyCombatPlayerDamage(raw),
    damageFriendlyTarget:(target,raw)=>target?.entity===player?applyCombatPlayerDamage(raw):{total:0},
    setCombatText:text=>setCombatText(text),
    addCombatHistory:text=>addCombatHistory(text),
    updateCombatUI:()=>updateCombatUI(),
    delay:ms=>delay(ms),
    resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),
    handlePlayerDeath:()=>handlePlayerDeath()
  });

  dbClasses.configureInvoker({
    getPlayer:()=>player,getMeta:()=>meta,isClassActive:id=>classIdentityActive(id),getCurrentEnemy:()=>currentEnemy,getCurrentEnemies:()=>currentEnemies,
    livingEnemies:()=>livingEnemies(),getCombatBusy:()=>combatBusy,setCombatBusy:value=>{combatBusy=!!value;},
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),damageAll:(amount,falloff=1)=>damageAll(amount,falloff),healPlayer:amount=>dbCombat.heal(amount),
    addEnemyBurn:(enemy,stacks)=>dbCombatElementResolution.addEnemyBurn(enemy,stacks),updateCombatUI:()=>updateCombatUI(),setCombatText:text=>setCombatText(text),addCombatHistory:text=>addCombatHistory(text),identityFlash:text=>identityFlash(text),
    delay:ms=>delay(ms),winCombat:()=>dbCombat.win(),resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),selectEnemy:index=>setCurrentEnemy(index),animateUltimate:()=>animateUltimate(),animateClassAttack:mode=>animateClassAttack(mode),
    clamp:(value,min,max)=>clamp(value,min,max),getEncounterLead:()=>currentEncounterLead,getSetDamageBonus:()=>v19SetDamageBonus(),getEncounterTurn:()=>currentEncounterTurn,setEncounterTurn:value=>{currentEncounterTurn=value;},
    recordManaSpenderCast:()=>{meta.classUnlockFacts=DB_CLASS_UNLOCK_RULES.recordManaSpenderCast(dbClassUnlockFacts(),true);},saveMeta:()=>saveMeta(),checkDynamicClassUnlocks:()=>dbProgression.checkDynamicClassUnlocks(),document:()=>document,
    playerAttack:options=>dbCombat.attack(options),manaGain:amount=>dbCombat.manaGain(amount),
    resolveManaBuilderGain:(id,options)=>dbCombatManaActionResolution.resolvedBuilderGain(id,options),
    rollTieredProc:chance=>rollTieredProc(chance),
    triggerStrikeElements:(target,chaos)=>triggerStrikeElements(target,chaos),
    playElementAnimation:(key,target,fromEnemy)=>playElementAnimation(key,target,fromEnemy),
    hasLegendaryEffect:id=>db060HasEffect(id),legendaryEffect:id=>DB060_EFFECT_BY_ID[id]
  });

  dbInfoGuide=window.DiceboundInfoGuide;
  if(!dbInfoGuide)throw new Error('DiceBound requires the Info Guide UI module before dicebound.js');
  function dbInfoExportSave(){
    const data=dbRuntime.save.exportText(normalizeCareerMeta(meta));
    dbRuntime.platform.copyText(data).then(ok=>showToast(ok?'Save copied to clipboard':'Save placed in text box')).catch(()=>showToast('Save placed in text box'));
    return data;
  }
  function dbInfoImportSave(raw){
    try{
      const text=String(raw||'').trim();if(!text)throw new Error('empty');
      meta=dbRuntime.save.importText(text,{defaultFactory:defaultMeta,normalize:x=>normalizeCareerMeta(x)});
      dbProgression.careerStats();saveMeta();dbProgression.repairTalentPrerequisites();window.DiceboundClassChooser.render();updateMetaUI();showToast('Save imported');dbInfoGuide.close();openStartScreen();return true;
    }catch(error){dbRuntime.platform.alert('That save string could not be imported.');return false;}
  }
  dbInfoGuide.configure({
    find:$,
    getClasses:()=>Object.values(CLASSES),
    isClassUnlocked:(...args)=>dbProgression.isClassUnlocked(...args),
    getElements:()=>ELEMENTS,
    getArtifactSet:()=>({count:mythicalSetCount(),tiers:v24SetTierData().map(tier=>({pieces:tier.pieces,text:tier.text}))}),
    isGameStarted:()=>gameStarted,
    exportSave:dbInfoExportSave,
    importSave:dbInfoImportSave,
    onOpen:()=>{meta.infoSeen=true;saveMeta();}
  });
  DB25.modules.guide={render:()=>dbInfoGuide.render()};

  const dbCareerUi=window.DiceboundCareerUi;
  if(!dbCareerUi)throw new Error('DiceBound requires the Career UI module before dicebound.js');
  dbCareerUi.configure({
    find:$,document:()=>document,
    getCareerStats:()=>dbProgression.careerStats(),
    getCareerContext:()=>({legacyLevel:meta.level||1,prestigeCount:meta.prestige?.count||0,completedRuns:meta.runs||0,bestTiles:meta.bestTiles||0}),
    getRunHistory:()=>dbProgression.runHistory(),
    getClasses:()=>Object.values(CLASSES),
    getEnemies:()=>[...enemyPool,...Object.values(ENEMY_REGISTRY||{})],
    getPowerups:()=>upgrades,
    getPets:()=>Object.values(PETS),
    onOpen:()=>saveMeta()
  });

  /* SEMANTIC OWNER — D20 / Twenty-Sider chaos resolution. */
  const dbCombatD20ChaosOwner=window.DiceboundCombatD20ChaosResolution;
  if(!dbCombatD20ChaosOwner)throw new Error("DiceBound requires the D20 chaos-resolution owner before dicebound.js");
  dbCombatD20ChaosResolution=dbCombatD20ChaosOwner.configure({
    getPlayer:()=>player,
    classIdentityActive:id=>classIdentityActive(id),
    rand:(min,max)=>rand(min,max),
    random:()=>random(),
    pick:values=>pick(values),
    clamp:(value,min,max)=>clamp(value,min,max),
    getAttackFx:()=>$("attackFx"),
    delay:ms=>delay(ms),
    getElements:()=>ELEMENTS,
    getCoreElements:()=>DIBO_ELEMENTS,
    setCombatText:(text,record=true)=>setCombatText(text,record),
    addCombatHistory:text=>addCombatHistory(text),
    clampQueuedHaste:before=>dbCombatElementResolution.clampQueuedHaste(before)
  });
  dbCombatD20ChaosResolution.initializePlayerState();

  // resolution modules remain authoritative internals; presentation/VFX stay
  // outside this facade for the separate Combat View ownership wave.
  dbCombat=dbCombatOwner.configure({
    encounter:dbCombatEncounterLifecycle,attack:dbCombatAttackResolution,guard:dbCombatGuardResolution,mana:dbCombatManaActionResolution,
    ultimate:dbCombatUltimateResolution,petTurn:dbCombatPetTurnResolution,turns:dbCombatTurns,confusion:dbCombatConfusionResolution,victory:dbCombatVictoryResolution,
    elements:dbCombatElementResolution,healing:dbCombatHealingResolution,d20:dbCombatD20ChaosResolution,strikes:dbCombatStrikes,
    scaling:dbEnemyScalingResolution
  });

  /* SEMANTIC OWNER — Player / per-run initialization (#311). */
  dbRun.configurePlayerInitialization({
    getPlayer:()=>player,getMeta:()=>meta,getClasses:()=>CLASSES,getClassPassives:()=>CLASS_PASSIVES,getElementKeys:()=>ELEMENT_KEYS,getRunEchoEffectId:()=>dbProgression.crucibleRunEffectId(),
    setRunTalentSnapshot:value=>{runTalentSnapshot=value;},applyTalentBonuses:()=>applyTalentBonuses(),getHeirloomSlots:()=>dbProgression.heirloomLoadoutCapacity(),
    equipItem:(item,silent=false)=>dbItems.equip(item,silent),gameplayTalentRank:id=>dbProgression.gameplayTalentRank(id),generateEquipment:(rarity,slot)=>dbItems.generateEquipment(rarity,slot),
    pick:values=>pick(values),rand:(min,max)=>rand(min,max),recordRunBuff:(...args)=>recordRunBuff(...args),elementSummary:item=>elementSummary(item),
    classIdentityActive:id=>classIdentityActive(id),classHasMechanic:id=>classHasMechanic(id),shuffledPetIds:()=>dbPets.shuffledPetIds(),setCombatKind:value=>{v16CombatKind=value;},
    syncActivePetBonus:force=>dbPets.syncActiveBonus(force),syncBloodmageHpPassive:initial=>dbClasses.syncBloodmageHpPassive(initial),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),
    prepareSlimeRougeBorrowing:()=>dbClasses.prepareSlimeRougeBorrowing(v318SlimeRougeDonorPool(),pick),finishSlimeRougeBorrowing:()=>dbClasses.finishSlimeRougeBorrowing(),initIdentitySupport:id=>dbClasses.initIdentitySupport(id),initUltimateSupport:id=>dbClasses.initUltimateSupport(id),
    classMechanicsFor:id=>dbClasses.mechanicsFor(id),getUltimateSupportMechanics:id=>dbClasses.ultimateSupportFor(id),addLog:text=>addLog(text),
    applyGearTransform:()=>db060ApplyGearTransform(),syncMana:args=>db06421SyncMana(args),resetDragoonState:()=>dbFriendResetDragoonState(),
    setStatsLast:({hp,gold})=>{statsLastHp=hp;statsLastGold=gold;},
    setRunGlobals:next=>{boardLevel=next.boardLevel;rolls=next.rolls;tilesMovedThisRun=next.tilesMovedThisRun;pendingLevelUps=next.pendingLevelUps;currentEnemy=next.currentEnemy;currentEnemies=next.currentEnemies;currentEncounterLead=next.currentEncounterLead;currentEnemyTile=next.currentEnemyTile;currentMerchantItems=next.currentMerchantItems;runFinalized=next.runFinalized;lastLegacyAward=next.lastLegacyAward;lastGoldLegacyAward=next.lastGoldLegacyAward;merchantBossBattle=next.merchantBossBattle;},
    initializeD20State:()=>dbCombatD20ChaosResolution.initializePlayerState()
  });

  // becomes the ordinary public facade. It is never wired to player-facing UI.
  function dbCombatOracleClone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function dbCombatOracleEnemy(spec={},index=0){
    const hp=Math.max(0,Number(spec.hp??100)||0),maxHp=Math.max(hp,Number(spec.maxHp??hp)||hp||1);
    return Object.assign({id:`combat-oracle-${index}`,name:`Combat Oracle ${index+1}`,icon:'🎯',hp,maxHp,attack:1,defense:0,gold:0,xp:0,weakness:null,affinity:null,poisonStacks:0,rangerMarks:0,boss:false,miniBoss:false,finalBoss:false,guardian:false},dbCombatOracleClone(spec));
  }
  function dbCombatOraclePlayerState(){
    const keys=['classId','level','hp','maxHp','attack','defense','gold','xp','xpNext','crit','doubleStrike','damageBonus','bossDamage','lifeSteal','luck','ultimateCharge','ultimateAttackGain','critUltimateGain','guardCooldown','combatShield','mana','maxMana','potions','combatActionCount','combatAttackCount','poisonStacks','energyShield','hasteQueued','hastePrimed','skipNextEnemyResponse','petDoubleChance','petDamageBonus','elementDamageBonus','monkCombo','clownGimmick','beastStance','summonerSpirits','trainerRoster','dragoonJumpCooldown','dragoonAirborneResponses','dragoonLandingReady'];
    const out={};for(const key of keys)if(player[key]!==undefined)out[key]=dbCombatOracleClone(player[key]);return out;
  }
  function dbCombatOracleSnapshot(){
    const stats=meta?.stats||{};
    return dbCombatOracleClone({
      boardLevel,nightmareMode:!!nightmareMode,hellMode:!!hellMode,gameStarted:!!gameStarted,rollLocked:!!rollLocked,combatBusy:!!combatBusy,combatKind:v16CombatKind,
      encounterTurn:currentEncounterTurn,currentEnemyIndex,currentEnemyName:currentEnemy?.name||null,currentEnemyTile,
      player:dbCombatOraclePlayerState(),enemies:(currentEnemies||[]).map(enemy=>dbCombatOracleClone(enemy)),
      meta:{activePet:meta?.activePet||null,petCookies:meta?.petCookies||0,classUnlockFacts:dbCombatOracleClone(meta?.classUnlockFacts||{}),stats:{enemiesDefeated:stats.enemiesDefeated||0,bossesDefeated:stats.bossesDefeated||0,minibossesDefeated:stats.minibossesDefeated||0}},
      text:String($('combatText')?.textContent||''),history:String($('combatHistory')?.textContent||''),overlayHidden:$('combatOverlay')?.classList.contains('hidden')!==false,lootVisible:$('lootOverlay')?.classList.contains('hidden')===false,pendingLevelUps
    });
  }
  function dbCombatOracleDismissTransient(){
    $('lootOverlay')?.classList.add('hidden');$('legendaryChoiceOverlay')?.classList.add('hidden');$('levelUpOverlay')?.classList.add('hidden');
    pendingLootItem=null;pendingLootCallback=null;return true;
  }
  function dbCombatOracleCleanup(){
    dbCombatOracleDismissTransient();
    currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;currentEnemyIndex=0;currentEncounterTurn=0;combatBusy=false;
    $('combatOverlay')?.classList.add('hidden');
    if($('combatHistory'))$('combatHistory').innerHTML='';if($('combatText'))$('combatText').textContent='';
    return true;
  }
  function dbCombatOracleSetup(spec={}){
    dbCombatOracleCleanup();
    resetPlayer(spec.classId||'ranger');
    Object.assign(player,dbCombatOracleClone(spec.player||{}));
    boardLevel=Math.max(1,Math.min(6,Math.floor(Number(spec.board)||1)));nightmareMode=!!spec.nightmare;hellMode=!!spec.hell;gameStarted=true;rollLocked=false;combatBusy=!!spec.busy;runFinalized=false;
    const enemySpecs=Array.isArray(spec.enemies)&&spec.enemies.length?spec.enemies:[{}];currentEnemies=enemySpecs.map((enemy,index)=>dbCombatOracleEnemy(enemy,index));currentEnemyIndex=Math.max(0,Math.min(currentEnemies.length-1,Math.floor(Number(spec.currentIndex)||0)));currentEnemy=currentEnemies[currentEnemyIndex]||null;currentEncounterLead=currentEnemies[0]||currentEnemy;
    if(currentEncounterLead&&spec.lead)Object.assign(currentEncounterLead,dbCombatOracleClone(spec.lead));
    currentEncounterTurn=Math.max(0,Math.floor(Number(spec.turn)||0));v16CombatKind=String(spec.combatKind||'normal');
    const tileIndex=Math.max(0,Math.floor(Number(spec.tileIndex)||Math.max(1,Number(player.position)||1)));player.position=tileIndex;while(tiles.length<=tileIndex)tiles.push({type:'empty',cleared:false});tiles[tileIndex]={type:String(spec.tileType||'enemy'),cleared:false,enemyBase:dbCombatOracleClone(currentEncounterLead)};currentEnemyTile=tileIndex;
    meta.activePet='neutral';meta.pets=meta.pets||{};meta.pets.neutral=Object.assign({unlocked:true,level:1,xp:0},meta.pets.neutral||{});
    if($('combatHistory'))$('combatHistory').innerHTML='';if($('combatText'))$('combatText').textContent='';$('combatOverlay')?.classList.remove('hidden');
    updateCombatUI();return dbCombatOracleSnapshot();
  }
  function dbCombatOraclePrepareEncounter(spec={}){
    dbCombatOracleCleanup();resetPlayer(spec.classId||'ranger');Object.assign(player,dbCombatOracleClone(spec.player||{}));
    boardLevel=Math.max(1,Math.min(6,Math.floor(Number(spec.board)||1)));nightmareMode=!!spec.nightmare;hellMode=!!spec.hell;gameStarted=true;rollLocked=false;combatBusy=false;runFinalized=false;v16CombatKind='normal';
    const tileIndex=Math.max(1,Math.floor(Number(spec.tileIndex)||1));player.position=tileIndex;while(tiles.length<=tileIndex)tiles.push({type:'empty',cleared:false});const base=dbRun.enemyForPosition(tileIndex);if(!base)throw new Error('Combat oracle could not resolve ordinary encounter base.');tiles[tileIndex]={type:'enemy',cleared:false,enemyBase:dbCombatOracleClone(base)};currentEnemyTile=null;return dbCombatOracleClone(base);
  }
  window.DiceboundCombatOracleTest=Object.freeze({
    snapshot:dbCombatOracleSnapshot,cleanup:dbCombatOracleCleanup,dismissTransient:dbCombatOracleDismissTransient,setup:dbCombatOracleSetup,prepareEncounter:dbCombatOraclePrepareEncounter,
    onEvent:(name,listener)=>DiceboundStateEvents.on(name,listener),
    startEncounter:kind=>startCombat(kind||'normal'),attack:(...args)=>dbCombat.attack(...args),guard:(...args)=>dbCombat.guard(...args),channel:(...args)=>dbCombat.channel(...args),spell:(...args)=>dbCombat.spell(...args),ultimate:(...args)=>dbCombat.ultimate(...args),petTurn:(...args)=>dbCombat.petTurn(...args),enemyResponse:(...args)=>resolveEnemyResponse(...args),
    element:(key,options={})=>dbCombat.element(key,currentEnemy,options),heal:(amount,options)=>dbCombat.heal(amount,options),chaos:action=>dbCombat.chaos(action),win:(...args)=>dbCombat.win(...args),select:index=>setCurrentEnemy(index),patchPlayer:patch=>Object.assign(player,dbCombatOracleClone(patch||{})),patchEnemy:(index,patch)=>Object.assign(currentEnemies[index],dbCombatOracleClone(patch||{}))
  });

  // It exposes the final released 0.6.6.28 behavior without changing ordinary

  window.DiceboundProgressionOracleTest=Object.freeze({
    snapshot:()=>({
      gameStarted:!!gameStarted,
      runTalentSnapshot:dbRunClone(runTalentSnapshot),
      meta:{
        level:meta.level,xp:meta.xp,xpNext:meta.xpNext,points:meta.points,
        purchased:dbRunClone(meta.purchased||{}),prestige:dbRunClone(meta.prestige||{}),
        heirlooms:dbRunClone(meta.heirlooms||[]),heirloomStorage:dbRunClone(meta.heirloomStorage||[]),heirloomStorageUnlocked:!!meta.heirloomStorageUnlocked,
        unlocks:dbRunClone(meta.unlocks||{}),classUnlockFacts:dbRunClone(meta.classUnlockFacts||{}),
        stats:dbRunClone(meta.stats||{}),elementProgress:dbRunClone(meta.elementProgress||{}),
        devilHornsFound:!!meta.devilHornsFound,nightmareUnlocked:!!meta.nightmareUnlocked,hellUnlocked:!!meta.hellUnlocked,
        runs:meta.runs,bestTiles:meta.bestTiles
      }
    }),
    setRunActive:value=>{gameStarted=!!value;return gameStarted;},
    patchMeta:patch=>{Object.assign(meta,dbRunClone(patch||{}));return true;},
    patchPlayer:patch=>{Object.assign(player,dbRunClone(patch||{}));return true;},
    setTalentState:({points,purchased}={})=>{if(points!==undefined)meta.points=Math.max(0,Number(points)||0);if(purchased!==undefined)meta.purchased=dbRunClone(purchased||{});return true;},
    setPurchasedRank:(id,rank)=>{meta.purchased=meta.purchased||{};meta.purchased[id]=Math.max(0,Number(rank)||0);return meta.purchased[id];},
    setLegacyState:({level,xp,xpNext,points}={})=>{if(level!==undefined)meta.level=Math.max(1,Number(level)||1);if(xp!==undefined)meta.xp=Math.max(0,Number(xp)||0);if(xpNext!==undefined)meta.xpNext=Math.max(1,Number(xpNext)||1);if(points!==undefined)meta.points=Math.max(0,Number(points)||0);return true;},
    setRunTalentSnapshot:value=>{runTalentSnapshot=value==null?null:dbRunClone(value);return dbRunClone(runTalentSnapshot);},
    talentRank:id=>talentRank(id),
    gameplayTalentRank:id=>dbProgression.gameplayTalentRank(id),
    talentAvailable:id=>{const talent=talents.find(entry=>entry.id===id);return !!talent&&dbProgression.talentAvailable(talent);},
    purchaseTalent:id=>dbProgression.purchaseTalent(id),
    repairTalentPrerequisites:()=>dbProgression.repairTalentPrerequisites(),
    allocatedTalentPoints:()=>dbProgression.allocatedTalentPoints(),
    legacyXpForLevel:level=>legacyXpForLevel(level),
    grantLegacyXp:amount=>dbProgression.grantLegacyXp(amount),
    finalizeRun:()=>dbProgression.finalizeRun(),
    prestigeOffer:total=>db0633PrestigeOfferPoints(total),
    completePrestige:total=>dbProgression.completePrestige(total),
    setPrestige:value=>{meta.prestige=DB_PRESTIGE.normalize(dbRunClone(value||{}));return dbRunClone(meta.prestige);},
    rawPrestige:()=>dbRunClone(meta.prestige||{}),
    prestigeInspect:()=>dbRunClone(dbProgression.prestigeInspect()),
    prestigeDomainPurchase:id=>dbRunClone(dbProgression.prestigePurchase(id)),
    prestigeDomainRefund:()=>dbRunClone(dbProgression.prestigeRefundAll()),
    checkpointHas:()=>DB_RUN_CHECKPOINT.has(),
    achievementDone:id=>dbProgression.achievementDone(id),
    achievementConditionText:id=>dbProgression.achievementConditionText(id),
    achievementRewardText:id=>dbProgression.achievementRewardText(id),
    achievementGate:gate=>dbProgression.achievementGateUnlocked(gate),
    heroMastery:classId=>dbRunClone(dbProgression.heroMasteryEntries(classId)),
    achievementCount:()=>dbProgression.achievementCount(),
    unlockClass:id=>dbProgression.unlockClass(id),
    classUnlockFeedbackState:()=>dbRunClone(window.DiceboundClassUnlockFeedback?.state?.()||null),
    logHtml:()=>String($('log')?.innerHTML||'')
  });

  db064Camp.configureShell({});
  const dbCampOpenStartCore=openStartScreen;
  openStartScreen=function(...args){return db064Camp.enterShell(dbCampOpenStartCore,this,args);};
  const dbCampMetaUiCore=updateMetaUI;
  updateMetaUI=function(...args){return db064Camp.refreshMetaShell(dbCampMetaUiCore,this,args);};
  const dbCampHudCore=updateHUD;
  updateHUD=function(...args){return db064Camp.refreshHudShell(dbCampHudCore,this,args);};

  const dbCampShellOracleClone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  function dbCampShellOracleRng(action){
    const before=window.DiceboundRng.snapshot(),result=action(),after=window.DiceboundRng.snapshot();
    return {result:dbCampShellOracleClone(result),actionRngCalls:after.calls-before.calls,actionRngState:after.state};
  }
  function dbCampShellOracleHideBlocking(){
    DB_RUN_BLOCKING_OVERLAYS.forEach(id=>$(id)?.classList.add('hidden'));
    $('battleVictory')?.classList.add('hidden');
    currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;pendingLevelUps=0;combatBusy=false;
  }
  function dbCampShellOracleStableRun(classId='ranger',board=3){
    dbRunClearCheckpoint();dbClasses.clearSlimeRougeRuntime();resetPlayer(classId);boardLevel=board;nightmareMode=false;hellMode=false;
    gameStarted=true;runFinalized=false;rollLocked=false;combatBusy=false;currentEnemy=null;pendingLevelUps=0;player.position=0;
    dbCampShellOracleHideBlocking();$('startOverlay')?.classList.add('hidden');
    return dbCampShellOracleShellState();
  }
  function dbCampShellOracleImg(id){const root=$(id);return root?.querySelector?.('img')?.getAttribute('src')||null;}
  function dbCampShellOracleShellState(){
    const camp=window.DiceboundCamp,required=typeof camp?.requiredSemanticIds==='function'?camp.requiredSemanticIds():[],present=required.filter(id=>!!$(id));
    return {
      gameStarted:!!gameStarted,rollLocked:!!rollLocked,combatBusy:!!combatBusy,boardLevel,position:player?.position??null,
      overlayHidden:!!$('startOverlay')?.classList.contains('hidden'),campFullscreen:!!$('startOverlay')?.classList.contains('camp-fullscreen'),scene:!!$('campScene'),
      requiredCount:required.length,presentRequired:present,
      classStatus:String($('campClassStatus')?.textContent||''),petStatus:String($('campPetStatus')?.textContent||''),
      nightmareStatus:String($('campNightmareBtn')?.querySelector('.camp-sub')?.textContent||''),hellStatus:String($('campHellBtn')?.querySelector('.camp-sub')?.textContent||''),
      classArt:dbCampShellOracleImg('campClassIcon'),petArt:dbCampShellOracleImg('campPetIcon'),
      floorText:String($('floorText')?.textContent||''),guardianText:String($('guardianText')?.textContent||''),
      hpText:String($('hpText')?.textContent||''),attackText:String($('attackText')?.textContent||''),defenseText:String($('defenseText')?.textContent||''),goldText:String($('goldText')?.textContent||''),potionText:String($('potionText')?.textContent||''),
      critText:String($('critText')?.textContent||''),dodgeText:String($('dodgeText')?.textContent||''),lifeStealText:String($('lifeStealText')?.textContent||''),luckText:String($('luckText')?.textContent||''),echoText:String($('echoText')?.textContent||''),bossDamageText:String($('bossDamageText')?.textContent||''),
      heroArt:dbCampShellOracleImg('heroAvatar'),pawnArt:dbCampShellOracleImg('pawn'),combatArt:dbCampShellOracleImg('combatPlayerIcon'),
      combatHidden:!!$('combatOverlay')?.classList.contains('hidden'),victoryHidden:!!$('battleVictory')?.classList.contains('hidden'),checkpoint:DB_RUN_CHECKPOINT.has()
    };
  }
  function dbCampShellOracleStartup(){return dbCampShellOracleShellState();}
  function dbCampShellOracleRecovery(){
    window.DiceboundRng.seed('camp-shell-recovery-setup');
    const before=window.DiceboundRng.snapshot(),result=window.DiceboundFriendsPatchTest.exerciseCampRecovery(),after=window.DiceboundRng.snapshot();
    return {result:dbCampShellOracleClone(result),actionRngCalls:after.calls-before.calls,actionRngState:after.state,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleCheckpointReset(){
    dbCampShellOracleStableRun('ranger',3);player.hp=1;const saved=dbRunWriteCheckpoint(),hadBefore=DB_RUN_CHECKPOINT.has();
    const action=dbCampShellOracleRng(()=>openStartScreen());
    return {saved,hadBefore,hasAfter:DB_RUN_CHECKPOINT.has(),hp:player.hp,maxHp:player.maxHp,actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleCampReset(){
    dbCampShellOracleStableRun('invoker',3);dbClasses.invokerBeginCombat();dbClasses.invokerAfterPlayerAction('guard');
    const invokerBefore=dbCampShellOracleClone(dbClasses._invokerTest.state(false));player.hp=Math.max(1,player.maxHp-7);
    $('combatOverlay')?.classList.remove('hidden');$('battleVictory')?.classList.remove('hidden');if($('combatText'))$('combatText').textContent='Camp shell oracle combat residue';
    const action=dbCampShellOracleRng(()=>openStartScreen()),invokerAfter=dbCampShellOracleClone(dbClasses._invokerTest.state(false));
    return {invokerBefore,invokerAfter,hp:player.hp,maxHp:player.maxHp,combatText:String($('combatText')?.textContent||''),actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleMetaRefresh(){
    dbCampShellOracleStableRun('ranger',3);openStartScreen();
    const action=dbCampShellOracleRng(()=>updateMetaUI());
    return {actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleHud(board,position,mode='normal'){
    dbCampShellOracleStableRun('ranger',board);nightmareMode=mode==='nightmare'||mode==='hell';hellMode=mode==='hell';player.position=position;
    const action=dbCampShellOracleRng(()=>updateHUD());
    return {mode,mini:currentMinibossTile(),count:currentTileCount(),actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleHudBoard5Pre(){return dbCampShellOracleHud(5,0,'normal');}
  function dbCampShellOracleHudBoard5Final(){dbCampShellOracleStableRun('ranger',5);return dbCampShellOracleHud(5,currentMinibossTile()-1,'normal');}
  function dbCampShellOracleHudBoard6Pre(){return dbCampShellOracleHud(6,0,'normal');}
  function dbCampShellOracleHudBoard6Final(){dbCampShellOracleStableRun('ranger',6);return dbCampShellOracleHud(6,currentMinibossTile()-1,'normal');}
  function dbCampShellOracleHudHell(){return dbCampShellOracleHud(3,4,'hell');}
  function dbCampShellOracleHudStats(){
    dbCampShellOracleStableRun('ranger',3);Object.assign(player,{hp:23,maxHp:47,attack:17,defense:6,flatReduction:2,gold:123,potions:4,crit:.37,dodge:.11,lifeSteal:.19,luck:.42,doubleStrike:.88,bossDamage:.31});
    const action=dbCampShellOracleRng(()=>updateHUD());
    return {actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  async function dbCampShellOracleHudCheckpoint(){
    dbCampShellOracleStableRun('ranger',3);dbRunClearCheckpoint();const action=dbCampShellOracleRng(()=>updateHUD());const immediate=DB_RUN_CHECKPOINT.has();
    await new Promise(resolve=>setTimeout(resolve,260));
    return {immediate,afterDelay:DB_RUN_CHECKPOINT.has(),loaded:!!DB_RUN_CHECKPOINT.load()?.checkpoint,actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  function dbCampShellOracleArtRefresh(){
    dbCampShellOracleStableRun('ranger',2);const before={classArt:dbCampShellOracleImg('campClassIcon'),petArt:dbCampShellOracleImg('campPetIcon')};
    const action=dbCampShellOracleRng(()=>openStartScreen());
    return {before,after:{classArt:dbCampShellOracleImg('campClassIcon'),petArt:dbCampShellOracleImg('campPetIcon')},actionRngCalls:action.actionRngCalls,actionRngState:action.actionRngState,shell:dbCampShellOracleShellState()};
  }
  window.DiceboundCampShellOracleTest=Object.freeze({
    apiVersion:1,state:()=>dbCampShellOracleShellState(),startup:dbCampShellOracleStartup,recovery:dbCampShellOracleRecovery,checkpointReset:dbCampShellOracleCheckpointReset,campReset:dbCampShellOracleCampReset,metaRefresh:dbCampShellOracleMetaRefresh,
    hudBoard5Pre:dbCampShellOracleHudBoard5Pre,hudBoard5Final:dbCampShellOracleHudBoard5Final,hudBoard6Pre:dbCampShellOracleHudBoard6Pre,hudBoard6Final:dbCampShellOracleHudBoard6Final,hudHell:dbCampShellOracleHudHell,hudStats:dbCampShellOracleHudStats,hudCheckpoint:dbCampShellOracleHudCheckpoint,artRefresh:dbCampShellOracleArtRefresh,
    cleanup:()=>{dbRunClearCheckpoint();dbClasses.invokerResetCombat();dbCampShellOracleHideBlocking();openStartScreen();return true;}
  });

  // before ordinary runtime ownership moves behind DiceboundClasses.
  const dbClassesOracleClone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  function dbClassesOracleEnemy(index=0,patch={}){
    return Object.assign({name:`Class Oracle Dummy ${index+1}`,icon:'👹',hp:5000,maxHp:5000,attack:1,defense:0,gold:0,xp:0,weakness:'fire',affinity:null,dodge:0,poisonStacks:0,enemyBarrier:0,guardian:false,boss:false},dbClassesOracleClone(patch||{}));
  }
  function dbClassesOracleClearIdentityRuntime(){dbClasses.clearSlimeRougeRuntime();}
  function dbClassesOracleSetup(classId='ranger',playerPatch={},enemyPatches=[{}]){
    dbClassesOracleClearIdentityRuntime();resetPlayer(classId);Object.assign(player,dbClassesOracleClone(playerPatch||{}));
    boardLevel=3;nightmareMode=false;hellMode=false;gameStarted=true;rollLocked=false;combatBusy=false;runFinalized=false;currentEncounterTurn=0;v16CombatKind='normal';
    currentEnemies=(Array.isArray(enemyPatches)&&enemyPatches.length?enemyPatches:[{}]).map((patch,index)=>dbClassesOracleEnemy(index,patch));currentEnemyIndex=0;currentEnemy=currentEnemies[0]||null;currentEncounterLead=currentEnemy;currentEnemyTile=1;player.position=1;
    while(tiles.length<=1)tiles.push({type:'empty',cleared:false});tiles[1]={type:'enemy',cleared:false,enemyBase:dbClassesOracleClone(currentEnemy)};
    if($('combatText'))$('combatText').textContent='';if($('combatHistory'))$('combatHistory').innerHTML='';$('combatOverlay')?.classList.remove('hidden');
    return dbClassesOracleState();
  }
  function dbClassesOracleState(){
    return {
      boardLevel,nightmareMode:!!nightmareMode,hellMode:!!hellMode,combatBusy:!!combatBusy,
      identity:classIdentityId(),capabilities:[...slimeRougeCapabilities()],
      player:{
        classId:player.classId,hp:player.hp,maxHp:player.maxHp,attack:player.attack,defense:player.defense,dodge:player.dodge,crit:player.crit,doubleStrike:player.doubleStrike,lifeSteal:player.lifeSteal,
        gold:player.gold,potions:player.potions,mana:player.mana,maxMana:player.maxMana,ultimateCharge:player.ultimateCharge,combatShield:player.combatShield,combatActionCount:player.combatActionCount,
        clericFaith:player.clericFaith,beastStance:player.beastStance,monkCombo:player.monkCombo,slimeRougeIdentityClass:player.slimeRougeIdentityClass,slimeRougeUltimateClass:player.slimeRougeUltimateClass,
        summonerSpirits:dbClassesOracleClone(player.summonerSpirits||[]),trainerRoster:dbClassesOracleClone(player.trainerRoster||[]),upgradeCounts:dbClassesOracleClone(player.upgradeCounts||{})
      },
      enemies:currentEnemies.map(enemy=>({name:enemy.name,hp:enemy.hp,maxHp:enemy.maxHp,attack:enemy.attack,defense:enemy.defense,barrier:enemy.enemyBarrier||0,poisonStacks:enemy.poisonStacks||0,rangerMarks:enemy.rangerMarks||0})),
      text:String($('combatText')?.textContent||''),
      meta:{potionsUsed:meta.stats?.potionsUsed||0,manaSpenderCasts:meta.classUnlockFacts?.manaSpenderCasts||0}
    };
  }
  async function dbClassesOracleWithoutResponse(action){
    const oldResponse=resolveEnemyResponse;resolveEnemyResponse=async()=>{combatBusy=false;return {suppressed:true};};
    try{return await action();}finally{resolveEnemyResponse=oldResponse;combatBusy=false;}
  }
  function dbClassesOracleMetadata(){
    const api=window.DiceboundClasses,registry=api.createRegistry(),passives=api.createPassiveRegistry(),unlocks=api.createUnlockRegistry(),mechanics=api.createMechanicsRegistry(),ultimateSupport=api.createUltimateSupportRegistry();
    return {apiVersion:api.apiVersion,ids:[...api.ids],tagVocabulary:[...api.tagVocabulary],classes:Object.fromEntries(api.ids.map(id=>{const c=registry[id];return [id,{id:c.id,name:c.name,secret:!!c.secret,unlock:c.unlock,stats:c.stats,tags:[...(c.tags||[])],base:dbClassesOracleClone(c.base),passive:dbClassesOracleClone(c.passive),ultimate:dbClassesOracleClone(c.ultimate)}];})),passives,unlocks,mechanics,ultimateSupport};
  }
  window.DiceboundClassesOracleTest=Object.freeze({
    apiVersion:1,
    cleanup:()=>{dbClassesOracleClearIdentityRuntime();combatBusy=false;currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;$('combatOverlay')?.classList.add('hidden');return true;},
    state:()=>dbClassesOracleState(),metadata:()=>dbClassesOracleMetadata(),
    identity:(classId='ranger',patch={})=>{dbClassesOracleSetup(classId,patch);return {classId:player.classId,id:classIdentityId(),active:classIdentityActive(classId),mechanics:classMechanicsFor(classIdentityId()),capabilities:[...slimeRougeCapabilities()]};},
    slimeRouge:(identity='summoner',ultimate='pokemontrainer')=>dbClassesOracleClone(window.DiceboundV318Test.forceRun(identity,ultimate)),
    slimeRougeRangerMarks:()=>window.DiceboundV318Test.rangerMarks(),
    slimeRougeConjure:()=>window.DiceboundV318Test.summonerConjure(),
    slimeRougeUltimate:(identity='summoner',ultimate='pokemontrainer')=>window.DiceboundV318Test.realUltimate(identity,ultimate),
    berserkerRage:(missing=.40)=>dbClassesOracleClone(window.DiceboundBeta021Test.rageDamage(missing)),
    rogueSteal:(seed='classes-oracle-rogue')=>window.DiceboundBeta021Test.rogueStealTrial(seed),
    clericConsecration:async()=>{dbClassesOracleSetup('cleric',{maxHp:100,hp:40,attack:20,clericFaith:100,combatShield:0,combatActionCount:0},[{hp:5000,maxHp:5000},{hp:5000,maxHp:5000}]);await dbClassesOracleWithoutResponse(()=>dbClasses.clericConsecration());return dbClassesOracleState();},
    beastmasterStances:()=>{dbClassesOracleSetup('beastmaster');const sequence=[player.beastStance];for(let i=0;i<4;i++){dbClasses.cycleBeastStance();sequence.push(player.beastStance);}return {sequence,state:dbClassesOracleState()};},
    bloodmageReplenish:async()=>{dbClassesOracleSetup('bloodmage',{maxHp:100,hp:40,ultimateCharge:0,combatActionCount:0},[{hp:600,maxHp:1000}]);await dbClassesOracleWithoutResponse(()=>dbClasses.bloodmageReplenish());return dbClassesOracleState();},
    bloodmageExsanguinate:async()=>{dbClassesOracleSetup('bloodmage',{maxHp:100,hp:100,attack:20,ultimateCharge:0,combatActionCount:0},[{hp:5000,maxHp:5000,defense:3}]);await dbClassesOracleWithoutResponse(()=>dbClasses.bloodmageExsanguinate());return dbClassesOracleState();},
    alchemistFlask:async()=>{dbClassesOracleSetup('alchemist',{maxHp:100,hp:100,attack:15,potions:3,potionPower:.50,alchemistFreeFlask:0,alchemistElementChance:0,combatActionCount:0},[{hp:5000,maxHp:5000},{hp:5000,maxHp:5000}]);await dbClassesOracleWithoutResponse(()=>dbClasses.alchemistVolatileFlask());return dbClassesOracleState();},
    monkDodge:()=>{dbClassesOracleSetup('monk',{dodge:.10,monkCombo:3});return {chance:effectiveDodgeChance(),state:dbClassesOracleState()};},
    ninjaExecution:()=>{dbClassesOracleSetup('ninja',{attack:20,_ninjaExecution:true},[{hp:1000,maxHp:1000,defense:12}]);const dealt=damageEnemy(currentEnemy,100,false);return {dealt,state:dbClassesOracleState()};},
    ouroborosSync:()=>{dbClassesOracleSetup('ouroboros',{attack:37,doubleStrike:1.20});const before={attack:player.attack,doubleStrike:player.doubleStrike};dbClasses.syncOuroborosAttack();return {before,after:{attack:player.attack,doubleStrike:player.doubleStrike},state:dbClassesOracleState()};},
    invokerFormula:()=>{dbClassesOracleSetup('invoker');dbClasses.invokerAfterPlayerAction('guard');dbClasses.invokerAfterPlayerAction('generator');dbClasses.invokerAfterPlayerAction('spender');return {active:dbClasses.invokerActive(),state:dbClassesOracleClone(dbClasses._invokerTest.state(false)),recipe:dbClassesOracleClone(dbClasses.invokerRecipeInfo()),bonuses:dbClassesOracleClone(dbClasses.invokerActionBonuses()),identity:classIdentityId()};},
    beastmasterButton:()=>{dbClassesOracleSetup('beastmaster');const before=player.beastStance,button=$('specialAttackBtn');button?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return {before,after:player.beastStance,state:dbClassesOracleState()};}
  });

})();
