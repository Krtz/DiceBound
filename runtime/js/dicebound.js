(() => {
  "use strict";

  const APP_IDENTITY=window.DiceboundVersion;
  if(!APP_IDENTITY)throw new Error("dicebound.js requires DiceboundVersion before loading.");
  const MERCHANT_SPACING = 12;
  const STATIC_CAMP_TILES = [10,30,55,70,90];
  const POWERUP_TILE_COUNT = 5;
  const WHEEL_TILE_COUNT = 5;
  const DB_EQUIPMENT_CONFIG=window.DiceboundEquipment?.createRegistry?.();
  if(!DB_EQUIPMENT_CONFIG)throw new Error("DiceboundEquipment must load before dicebound.js");
  const EQUIPMENT_SLOTS=[...DB_EQUIPMENT_CONFIG.slots];
  const SLOT_LABELS={...DB_EQUIPMENT_CONFIG.labels};
  const ELEMENTS={
    fire:{icon:"🔥",name:"Fire",spell:"Fireball",description:"Deals a burst of bonus damage."},
    ice:{icon:"❄️",name:"Ice",spell:"Ice Nova",description:"Deals damage and freezes the enemy for one turn."},
    electric:{icon:"⚡",name:"Electric",spell:"Thunderbolt",description:"Deals heavy lightning damage."},
    light:{icon:"✨",name:"Light",spell:"Holy",description:"Deals damage and restores HP."},
    void:{icon:"🕳️",name:"Void",spell:"Black Hole",description:"Tears away a percentage of enemy maximum HP."},
    nature:{icon:"🌿",name:"Nature",spell:"Poison Vines",description:"Deals pack damage and adds stackable Poison. Every Poison stack deals a percentage of your Attack each combat round."},
    donut:{icon:"🍩",name:"Donut",spell:"Healing Rain of Donuts",description:"Restores a generous amount of HP. Extremely serious magic."},
    tech:{icon:"🤖",name:"Tech",spell:"Brain Hack",description:"Deals damage and permanently lowers enemy attack."},
    metal:{icon:"🤘",name:"Metal",spell:"Hard Rock Metal Music",description:"Deals sonic damage and grants ultimate charge."},
    coffee:{icon:"☕",name:"Coffee",spell:"Caffeinated Haste",description:"Grants an immediate extra action."}
  };
  const ELEMENT_KEYS=Object.keys(ELEMENTS);
  const DIBO_ELEMENTS=["fire","ice","electric","nature","light","void"];
  const PET_UNLOCK_REQUIREMENT=500;
  const GUARDIAN_SPECIAL_INTERVAL=5;
  const DB_HEIRLOOM_STORAGE_NODE='heirloom-storage';
  const DB_HEIRLOOM_SLOT_I_NODE='heirloom-slot-i';
  const DB_HEIRLOOM_SLOT_II_NODE='heirloom-slot-ii';
  /* ========================================================================
     Alpha v3.1.7 — authoritative content registries
     Final definitions are canonical. Historical patch-era writes later in the
     bundle are compatibility no-ops against these read-only proxy views.
     ======================================================================== */
  const DB317_CONTENT_MUTATORS=new Set(["push","pop","shift","unshift","splice","sort","reverse","copyWithin","fill"]);
  const DB317_READONLY_CACHE=new WeakMap();
  function db317Readonly(value){
    if(!value||(typeof value!=="object"&&typeof value!=="function"))return value;
    if(typeof value==="function")return value;
    if(DB317_READONLY_CACHE.has(value))return DB317_READONLY_CACHE.get(value);
    let proxy;proxy=new Proxy(value,{
      get(target,prop,receiver){if(Array.isArray(target)&&DB317_CONTENT_MUTATORS.has(prop))return (...args)=>{if(prop==="splice")return [];if(prop==="push"||prop==="unshift")return target.length;return receiver;};return db317Readonly(Reflect.get(target,prop,receiver));},
      set(){return true;},defineProperty(){return true;},deleteProperty(){return true;}
    });DB317_READONLY_CACHE.set(value,proxy);return proxy;
  }
  const DB317_CLASSES_RAW=window.DiceboundClasses?.createRegistry();
  if(!DB317_CLASSES_RAW)throw new Error("DiceboundClasses must load before dicebound.js");
  const CLASSES=db317Readonly(DB317_CLASSES_RAW);
  const DB317_PETS_RAW=window.DiceboundPets?.createRegistry();
  if(!DB317_PETS_RAW)throw new Error("DiceboundPets must load before dicebound.js");
  const PETS=db317Readonly(DB317_PETS_RAW);
  const DB_EFFECTIVE_STATS=window.DiceboundEffectiveStats;
  if(!DB_EFFECTIVE_STATS)throw new Error("DiceboundEffectiveStats must load before dicebound.js");
  const DB_POWERUP_SERVICES=window.DiceboundRuntimeServices?.createPowerupServices({
    run:{getPlayer:()=>player},
    economy:{goldReward:amount=>modifiedGold(amount),isNightmare:()=>nightmareMode},
    combat:{heal:amount=>healPlayer(amount)},
    rules:{clamp:(value,min,max)=>clamp(value,min,max)},
    content:{elementIds:DIBO_ELEMENTS},
    signatures:{
      applyCurrent:()=>{
        const service=window.DiceboundPerfectedSignature;
        if(!service?.applyCurrent)throw new Error("Perfected Signature service is unavailable.");
        return service.applyCurrent();
      },
      describeCurrent:()=>window.DiceboundPerfectedSignature?.describeCurrent?.()||"Perfected Signature adapts to the current class."
    }
  });
  const DB317_POWERUPS_RAW=window.DiceboundPowerupRegistry?.createRegistry(DB_POWERUP_SERVICES);
  if(!DB317_POWERUPS_RAW)throw new Error("DiceboundPowerupRegistry must load before dicebound.js");
  const upgrades=db317Readonly(DB317_POWERUPS_RAW);
  const DB317_TALENTS_RAW=window.DiceboundTalents?.createRegistry();
  if(!DB317_TALENTS_RAW)throw new Error("DiceboundTalents must load before dicebound.js");
  const talents=db317Readonly(DB317_TALENTS_RAW);
  const DB317_ENEMY_POOL_RAW=window.DiceboundEnemies?.createNormalRegistry();
  if(!DB317_ENEMY_POOL_RAW)throw new Error("DiceboundEnemies must load before dicebound.js");
  const enemyPool=db317Readonly(DB317_ENEMY_POOL_RAW);
  const DB_RARITIES=window.DiceboundRarities;
  if(!DB_RARITIES?.isPowerupRarityAtLeast)throw new Error("DiceboundRarities must provide powerup rarity policy before dicebound.js");
  const DB317_RARITY_INFO_RAW=window.DiceboundRarities?.createInfoRegistry();
  if(!DB317_RARITY_INFO_RAW)throw new Error("DiceboundRarities must load before dicebound.js");
  const rarityInfo=db317Readonly(DB317_RARITY_INFO_RAW);
  const DB317_RARITY_VALUES_RAW=window.DiceboundRarities?.createValueRegistry();
  if(!DB317_RARITY_VALUES_RAW)throw new Error("DiceboundRarities must load before dicebound.js");
  const rarityValues=db317Readonly(DB317_RARITY_VALUES_RAW);
  const DB317_CLASS_TAGS_RAW=Object.fromEntries(Object.entries(DB317_CLASSES_RAW).map(([id,cls])=>[id,[...(cls.tags||[])]]));
  const CLASS_TAGS=db317Readonly(DB317_CLASS_TAGS_RAW);
  const DB317_CLASS_PASSIVES_RAW=window.DiceboundClasses?.createPassiveRegistry?.();
  if(!DB317_CLASS_PASSIVES_RAW)throw new Error("DiceboundClasses passive registry must load before dicebound.js");
  const CLASS_PASSIVES=db317Readonly(DB317_CLASS_PASSIVES_RAW);
  const DB317_BOARD_REGISTRY_RAW=window.DiceboundBoards?.createRegistry?.();
  if(!DB317_BOARD_REGISTRY_RAW)throw new Error("DiceboundBoards must load before dicebound.js");
  const BOARD_REGISTRY=db317Readonly(DB317_BOARD_REGISTRY_RAW);
  const DB317_SPECIAL_ENEMIES_RAW=window.DiceboundEnemies?.createSpecialRegistry?.();
  if(!DB317_SPECIAL_ENEMIES_RAW)throw new Error("DiceboundEnemies special registry must load before dicebound.js");
  const ENEMY_REGISTRY=db317Readonly(DB317_SPECIAL_ENEMIES_RAW);
  const DB317_EQUIPMENT_REGISTRY_RAW=DB_EQUIPMENT_CONFIG;
  const EQUIPMENT_REGISTRY=db317Readonly(DB317_EQUIPMENT_REGISTRY_RAW);
  const DB317_ACHIEVEMENT_REGISTRY_RAW=window.DiceboundAchievements?.createRegistry?.();
  if(!DB317_ACHIEVEMENT_REGISTRY_RAW)throw new Error("DiceboundAchievements must load before dicebound.js");
  const ACHIEVEMENT_REGISTRY=db317Readonly(DB317_ACHIEVEMENT_REGISTRY_RAW);
  const CLASS_TAG_VOCABULARY=db317Readonly([...(window.DiceboundClasses?.tagVocabulary||[])]);
  if(!CLASS_TAG_VOCABULARY.length)throw new Error("DiceboundClasses tag vocabulary must load before dicebound.js");
  const ELEMENT_ID_VOCABULARY=db317Readonly(["fire","ice","electric","light","void","nature","donut","tech","metal","coffee","gun","radiation"]);
  const POWERUP_GATE_REGISTRY=db317Readonly({
    prestige10:{type:"prestige",minimum:10},
    road2:{type:"classUnlocked",classId:"clown"},
    road3:{type:"flag",field:"nightmareUnlocked"},
    road4:{type:"counter",field:"board4Clears",minimum:1},
    nature_master:{type:"elementProgress",element:"nature",minimum:500},
    merchant1:{type:"counter",field:"merchantKills",minimum:1},
    ranger_b1:{type:"boardClear",classId:"ranger",board:1},
    sorcerer_b2:{type:"boardClear",classId:"sorcerer",board:2},
    slime_lvl5:{type:"classLevel",classId:"slime",minimum:5},
    heal1000:{type:"lifetimeStat",stat:"healingDone",minimum:1000},
    gold1500:{type:"lifetimeStat",stat:"highestGold",minimum:4000},
    menagerie:{type:"allPetsUnlocked"},
    paladin_oath:{type:"boardClears",requirements:[{classId:"fighter",board:3},{classId:"cleric",board:3}]}
  });
  const DB317_CLASS_UNLOCKS_RAW=window.DiceboundClasses?.createUnlockRegistry?.();
  if(!DB317_CLASS_UNLOCKS_RAW)throw new Error("DiceboundClasses unlock registry must load before dicebound.js");
  const CLASS_UNLOCK_REGISTRY=db317Readonly(DB317_CLASS_UNLOCKS_RAW);
  /* Alpha v3.1.9 — hidden mechanic tags. These are runtime capability tags, not player-facing class labels. */
  const DB317_CLASS_MECHANICS_RAW=window.DiceboundClasses?.createMechanicsRegistry?.();
  if(!DB317_CLASS_MECHANICS_RAW)throw new Error("DiceboundClasses mechanics registry must load before dicebound.js");
  const CLASS_MECHANICS_REGISTRY=db317Readonly(DB317_CLASS_MECHANICS_RAW);
  const MECHANIC_TAG_VOCABULARY=db317Readonly([...new Set(Object.values(CLASS_MECHANICS_REGISTRY).flat().concat([...CLASS_TAG_VOCABULARY],DB317_POWERUPS_RAW.flatMap(u=>u.tags||[]),[
    "ultimate","damage","tempo","defense","crit","luck","healing","sustain","elemental","poison","pet","pack","mana","guard","barrier","wealth","potions","alchemy","lifesteal","evasion"
  ]))]);
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
  const POWERUP_MECHANICS_REGISTRY=db317Readonly(Object.fromEntries(DB317_POWERUPS_RAW.map(u=>[u.id,db318InferPowerupMechanics(u)])));
  const DB317_ULTIMATE_SUPPORT_RAW=window.DiceboundClasses?.createUltimateSupportRegistry?.();
  if(!DB317_ULTIMATE_SUPPORT_RAW)throw new Error("DiceboundClasses ultimate-support registry must load before dicebound.js");
  const ULTIMATE_SUPPORT_MECHANICS=db317Readonly(DB317_ULTIMATE_SUPPORT_RAW);
  const DB317_GUARDIANS=window.DiceboundGuardians;
  if(!DB317_GUARDIANS)throw new Error("DiceboundGuardians must load before dicebound.js");
  function db317Enemy(id){const e=ENEMY_REGISTRY[id];return e?{...e}:null;}
  function db317Board(level=boardLevel){return BOARD_REGISTRY[String(level)]||BOARD_REGISTRY["1"];}
  function db317FinalGuardian(level=boardLevel){return DB317_GUARDIANS.resolveFinal(level).combat;}
  function db317MinibossGuardian(level=boardLevel){return DB317_GUARDIANS.resolveMiniboss(level).combat;}
  const DiceboundContentRegistry=db317Readonly({version:3,classes:CLASSES,classUnlocks:CLASS_UNLOCK_REGISTRY,classTagVocabulary:CLASS_TAG_VOCABULARY,powerups:upgrades,powerupGates:POWERUP_GATE_REGISTRY,equipment:EQUIPMENT_REGISTRY,pets:PETS,enemies:{normal:enemyPool,special:ENEMY_REGISTRY},talents,achievements:ACHIEVEMENT_REGISTRY,boards:BOARD_REGISTRY,rarities:rarityInfo,classTags:CLASS_TAGS,classPassives:CLASS_PASSIVES,classMechanics:CLASS_MECHANICS_REGISTRY,mechanicTagVocabulary:MECHANIC_TAG_VOCABULARY,powerupMechanics:POWERUP_MECHANICS_REGISTRY,ultimateSupportMechanics:ULTIMATE_SUPPORT_MECHANICS,elementIds:ELEMENT_ID_VOCABULARY});
  window.DiceboundContent=DiceboundContentRegistry;
  /* Alpha v3.1.7: foundation continues after authoritative registries. */
  const diceFaces = ["⚀","⚁","⚂","⚃","⚄","⚅"];
  const $ = (id) => document.getElementById(id);
  const delay = (ms) => new Promise(resolve => { const cap=Number(window.__DB_FAST_ECHO_CAP__||0); setTimeout(resolve, cap>0 ? Math.min(ms,cap) : (window.__DB_V26_FAST_ECHO__ ? Math.min(ms,55) : ms)); });
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  // Alpha 3.1.9: all gameplay randomness routes through the injectable RNG service.
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
  let currentMysticBuff = null;
  let currentMerchantNotice = "";
  let wheelRotation = 0;
  let wheelBusy = false;
  let pendingPrestige = null;
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
  let pendingDiceChoiceResolve = null;
  let nightmareMode = false;
  let pendingPrestigeKeepIds = new Set();

  const DB_CORE_META=window.DiceboundCoreState?.createMetaService?.({classIds:Object.keys(CLASSES),petIds:Object.keys(PETS),elementIds:ELEMENT_KEYS,petUnlockRequirement:PET_UNLOCK_REQUIREMENT,saveService:window.DiceboundSave});
  if(!DB_CORE_META)throw new Error("DiceboundCoreState must load before dicebound.js");
  const DB_PRESTIGE=window.DiceboundPrestige;
  if(!DB_PRESTIGE)throw new Error("DiceboundPrestige must load before dicebound.js");
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
  function saveMeta(){normalizePrestigeState();syncMutedFromSettings();return DB_CORE_META.save(meta);}
  function unlockClass(id){
    if(!CLASSES[id]||meta.unlocks?.[id])return false;
    meta.unlocks=meta.unlocks||{};meta.unlocks[id]=true;saveMeta();
    const cls=CLASSES[id],unlockFeedback=window.DiceboundClassUnlockFeedback?.onClassUnlocked?.(id);if(gameStarted)addLog(`<b>Class unlocked:</b> ${cls.icon} ${cls.name}!`);showToast(unlockFeedback?.toast||`NEW CLASS UNLOCKED · ${cls.icon} ${cls.name}`,3400,true);renderClassChoices();return true;
  }

  /* ========================================================================
     Alpha v3.1.9 — state/render contracts
     Mutating domain helpers return result objects; render adapters consume
     those results. This is intentionally small and framework-free.
     ======================================================================== */
  const DiceboundStateEvents=window.DiceboundCoreState.createEventBus();

  const SlimeRougeRuntime={pendingIdentity:null,pendingUltimate:null,forcedIdentity:null,forcedUltimate:null};
  function classIdentityId(){
    if(player?.classId==='slimerouge')return SlimeRougeRuntime.pendingIdentity||player.slimeRougeIdentityClass||'slimerouge';
    return player?.classId||selectedClassId||'ranger';
  }
  function classIdentityActive(id){return classIdentityId()===id;}
  function classMechanicsFor(id){return [...(window.DiceboundContent?.classMechanics?.[id]||[])];}
  function slimeRougeCapabilities(){
    if(player?.classId!=='slimerouge')return new Set(classMechanicsFor(classIdentityId()));
    const out=new Set(classMechanicsFor('slimerouge'));
    classMechanicsFor(SlimeRougeRuntime.pendingIdentity||player.slimeRougeIdentityClass).forEach(x=>out.add(x));
    const ult=SlimeRougeRuntime.pendingUltimate||player.slimeRougeUltimateClass;
    (window.DiceboundContent?.ultimateSupportMechanics?.[ult]||[]).forEach(x=>out.add(x));
    if(ult)out.add(`ultimate:${ult}`);
    return out;
  }
  function classHasMechanic(tag){return player?.classId==='slimerouge'?slimeRougeCapabilities().has(tag):classMechanicsFor(classIdentityId()).includes(tag);}

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

  const dbBoardTileDispatch=window.DiceboundBoardTileDispatch?.configure({
    getRoad:()=>({player,tiles,boardLevel,merchantBossPrimed,merchantBossDefeatedThisBoard}),
    setRollLocked:value=>{rollLocked=!!value;},
    setCombatBusy:value=>{combatBusy=!!value;},
    refreshTile,
    updateHud:updateHUD,
    log:addLog,
    toast:showToast,
    returnToRoad:()=>returnToRoad(),
    startCombat:kind=>startCombat(kind),
    openEvent:()=>openEvent(),
    openWheelEvent:()=>openWheelEvent(),
    openFreePowerup:()=>openFreePowerup(),
    openTreasure:()=>openTreasure(),
    useCamp:()=>useCamp(),
    openMerchant:()=>openMerchant(),
    openBlessing:()=>openBlessing(),
    openMystic:()=>openMystic(),
    openBloodwell:()=>openBloodwell(),
    openGambler:()=>openGambler(),
    clearDevilPrimed:()=>{meta.devilPrimed=false;saveMeta();},
    logDiagnostic:(level,category,message,data)=>v25Log(level,category,message,data),
    debugState:()=>v25State(),
    trace:(name,work)=>v25TraceCommand(name,work,'detailed')
  });
  if(!dbBoardTileDispatch)throw new Error('DiceboundBoardTileDispatch must load before dicebound.js');

  const dbBoardGeneration=window.DiceboundBoardGeneration?.configure({
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
    gameplayTalentRank:id=>gameplayTalentRank(id),
    roadTileType:(roll,level)=>window.DiceboundEventRewards.roadTileType(roll,level),
    withRunTalentSnapshot:work=>{
      if(!runTalentSnapshot)return work();
      const live=meta.purchased;
      try{meta.purchased=runTalentSnapshot;return work();}
      finally{meta.purchased=live;}
    },
    setRoad:next=>{tiles=next.tiles;merchantFaceClicks=new Set();merchantBossPrimed=false;merchantBossDefeatedThisBoard=false;merchantFaceTotal=next.merchantFaceTotal;}
  });
  if(!dbBoardGeneration)throw new Error('DiceboundBoardGeneration must load before dicebound.js');

  const dbRunCompletion=window.DiceboundRunCompletion?.configure({
    clearCheckpoint:()=>dbRunClearCheckpoint(),
    isCompleting:()=>v19CompletingSixth,
    beforeCompletion:()=>({unlockSlimeRouge:!!player.v28StartedRandom&&isClassUnlocked('slime')&&!meta.unlocks?.slimerouge}),
    setCompleting:value=>{v19CompletingSixth=!!value;},
    setRunState:next=>{gameStarted=!!next.gameStarted;rollLocked=!!next.rollLocked;},
    isRunFinalized:()=>runFinalized,
    finalizeRun,
    getCompletionContext:()=>({mode:hellMode?'Hell':nightmareMode?'Nightmare':'Normal',level:player.level,gold:player.gold,rolls,legacyAward:lastLegacyAward,goldLegacyAward:lastGoldLegacyAward}),
    updateHud:updateHUD,
    presentTerminalEnd:detail=>dbRunPresentFinalEnd(detail),
    recordFirstCompletion:()=>{ensureAlphaMeta().fullVictories++;meta.board6Clears=(meta.board6Clears||0)+1;saveMeta();},
    afterCompletion:detail=>dbRunApplySixthRoadCompletion(detail)
  });
  if(!dbRunCompletion)throw new Error('DiceboundRunCompletion must load before dicebound.js');

  const dbBoardTransition=window.DiceboundBoardTransition?.configure({
    getRoad:()=>({player,boardLevel}),
    setBoardLevel:value=>{boardLevel=value;},
    resetEncounter:()=>{currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;},
    setRollLocked:value=>{rollLocked=!!value;},
    applyTheme:()=>applyRunTheme(),
    rebuildBoard:()=>{generateBoard();buildBoard();},
    getBoardDefinition:level=>db317Board(level),
    completeFinalRoad:()=>dbRunCompletion.completeFinalRoad(),
    log:addLog,
    toast:showToast,
    playHoly:()=>sfx.holy(),
    updateHud:updateHUD,
    placePawn,
    schedule:(work,ms)=>setTimeout(work,ms)
  });
  if(!dbBoardTransition)throw new Error('DiceboundBoardTransition must load before dicebound.js');

  const dbBoardMovement=window.DiceboundBoardMovement?.configure({
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
    dispatchTile:()=>dbBoardTileDispatch.dispatch()
  });
  if(!dbBoardMovement)throw new Error('DiceboundBoardMovement must load before dicebound.js');

  const dbRunLifecycle=window.DiceboundRunLifecycle?.configure({
    clearCheckpoint:()=>dbRunClearCheckpoint(),
    seedNewRun:()=>dbRunSeedNewRun(),
    beforeFreshRun:options=>options?.beforeFreshRun?.(),
    selectedClassId:()=>selectedClassId,
    isRandomClassMode:()=>window.DiceboundClassChooser?.isRandomMode?.(),
    resolveRandomForRun:()=>window.DiceboundClassChooser?.resolveRandomForRun?.(),
    prepareFreshRun:()=>{
      v19CompletingSixth=false;meta.doubleDiceUnlocked=!!(meta.doubleDiceUnlocked||(meta.board5Clears||0)>0);
      v16CombatKind=null;
    },
    ensureAudio,
    initializePlayer:classId=>resetPlayer(classId),
    setBoardLevel:value=>{boardLevel=value;},
    applyRunTheme:()=>applyRunTheme(),
    generateBoard:()=>generateBoard(),
    buildBoard:()=>buildBoard(),
    setRunState:next=>{gameStarted=!!next.gameStarted;rollLocked=!!next.rollLocked;combatBusy=!!next.combatBusy;},
    clearLog:()=>{const log=$('log');if(log)log.innerHTML='';},
    setDice:value=>{const dice=$('dice');if(dice)dice.textContent=value;},
    hideSurface:id=>$(id)?.classList.add('hidden'),
    getFreshContext:()=>({classId:player.classId,className:CLASSES[player.classId]?.name||player.classId,nightmareMode}),
    log:addLog,
    updateHud:updateHUD,
    schedulePawn:ms=>setTimeout(()=>placePawn(false),ms),
    recordFreshRunStarted:()=>{ensureAlphaMeta().runsStarted++;statsLastHp=player.hp;statsLastGold=player.gold;saveMeta();},
    announceRandomClass:chosen=>addLog(`🎲 Random class selected <b>${chosen.icon} ${chosen.name}</b> for this run.`),
    afterClassStart:detail=>dbRunApplyClassStartEffects(detail),
    scheduleCheckpoint:()=>dbRunScheduleCheckpoint()
  });
  if(!dbRunLifecycle)throw new Error('DiceboundRunLifecycle must load before dicebound.js');

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
  Object.defineProperty(window,'DiceboundStateArchitecture',{value:Object.freeze({events:DiceboundStateEvents,progression:ProgressionState,board:dbBoardMovement.state,victory:BattleVictoryState,victoryUI:BattleVictoryUI,identity:Object.freeze({id:classIdentityId,active:classIdentityActive,hasMechanic:classHasMechanic,capabilities:slimeRougeCapabilities})}),configurable:false});
  const player = {
    classId:"ranger",position:0,level:1,xp:0,xpNext:20,hp:32,maxHp:32,attack:6,defense:1,
    gold:0,potions:1,crit:.15,luck:0,postFightHeal:0,goldBonus:0,
    flatReduction:0,lifeSteal:0,doubleStrike:0,thorns:0,dodge:.08,potionPower:0,
    extraStepChance:0,xpBonus:0,bossDamage:0,revives:0,berserk:0,execute:0,
    shopDiscount:0,blessingBonus:0,firstHitBlocks:0,damageBonus:0,combatShield:0,
    guardPower:.52,classBurst:0,ultimateCharge:0,ultimateAttackGain:17,ultimateGuardGain:29,ultimateDamageBonus:0,petDamageBonus:0,petDoubleChance:0,legacyXpBonus:0,fastTravelBonus:0,cookieBondBonus:0,
    guardHeal:0,guardCounter:0,guardShield:0,guardDelay:0,guardCooldown:0,hasteTurns:0,firstAttackBonus:0,critUltimateGain:0,classUltimateBonus:0,combatAttackCount:0,combatActionCount:0,mythicActionCount:0,diceChoiceChance:0,
    elementProcBonus:0,elementDamageBonus:0,weaknessElementBonus:0,elementEchoChance:0,elementUltimateGain:0,classElementProcs:{},omniElementChance:0,defenseAttackScale:0,defenseDodgeScale:0,equipment:{},runBuffs:[],upgradeCounts:{}
  };

  /* Alpha v3.1.7: normal enemy pool now lives in registries/01-authoritative-content.js. */
  /* Alpha v3.1.7: rarityInfo and upgrades are registry-owned. */
  const gearNames = {
    weapon:{fighter:["Iron Longsword","Mercenary Axe","Knight's Blade","Warhammer"],ranger:["Yew Longbow","Recurve Bow","Hunting Crossbow","Falcon Bow"],sorcerer:["Ashen Staff","Crystal Wand","Star Rod","Runed Scepter"],monk:["Iron Knuckles","Prayer Beads","Dragon Fists","Temple Tonfa"],clown:["Rubber Chicken","Juggling Sabre","Oversized Mallet","Pie Launcher"],rouge:["Crimson Brush","Vermilion Rapier","Scarlet Palette Knife","Rosewood Baton"],berserker:["Bloodaxe","Rage Cleaver","Skullsplitter","War Maul"]},
    offhand:{fighter:["Kite Shield","Tower Shield","Buckler","Lion Guard"],ranger:["Hunter's Quiver","Barbed Quiver","Scout Quiver","Falcon Quiver"],sorcerer:["Spellbook","Arcane Tome","Moon Grimoire","Orb of Focus"],monk:["Meditation Bell","Prayer Wheel","Silk Handwraps","Temple Talisman"],clown:["Bag of Confetti","Emergency Pie","Comedy Mask","Pocket Horn"],rouge:["Rouge Palette","Rose Mirror","Crimson Vial","Velvet Fan"],berserker:["Spiked Buckler","Trophy Skull","Rage Totem","Iron Fist"]},
    boots:{fighter:["Marching Greaves","Lion Sabatons"],ranger:["Trail Boots","Windstep Boots"],sorcerer:["Starwoven Shoes","Astral Slippers"],monk:["Cloudstep Sandals","Temple Footwraps"],clown:["Squeaky Shoes","Impossible Stilts"],rouge:["Velvet Boots","Scarlet Heels"],berserker:["Bloodmarch Boots","Ravager Greaves"]},
    legs:{fighter:["Knight's Cuisses","Chain Leggings"],ranger:["Ranger Trousers","Hunter Legguards"],sorcerer:["Runed Legwraps","Moonweave Trousers"],monk:["Temple Gi Trousers","Flowing Sash"],clown:["Striped Pantaloons","Suspiciously Large Trousers"],rouge:["Crimson Breeches","Velvet Leggings"],berserker:["Warhide Leggings","Ragebound Tassets"]},
    chest:{fighter:["Scale Cuirass","Roadwarden Plate"],ranger:["Leather Jerkin","Falcon Coat"],sorcerer:["Mystic Robe","Constellation Mantle"],monk:["Temple Gi","Iron-Soul Vest"],clown:["Ringmaster Coat","Patchwork Tuxedo"],rouge:["Vermilion Coat","Rose-Dyed Corslet"],berserker:["Ravager Harness","Blood-Iron Cuirass"]},
    hat:{fighter:["Iron Helm","Lion Visor"],ranger:["Feathered Cap","Hunter Hood"],sorcerer:["Circlet","Starcaller Hood"],monk:["Temple Headband","Third-Eye Wrap"],clown:["Jester Crown","Tiny Hat"],rouge:["Rose Beret","Crimson Veil"],berserker:["Horned Helm","Warpaint Crown"]},
    ring:{fighter:["Lion Signet","Iron Oath Ring"],ranger:["Falcon Band","Tracker's Ring"],sorcerer:["Star Ring","Moonstone Loop"],monk:["Jade Band","Ring of Still Water"],clown:["Mood Ring","Ring-Pop of Power"],rouge:["Garnet Ring","Rosegold Band"],berserker:["Ring of Fury","Blood Oath Band"]},
    amulet:{fighter:["Dragon Tooth","Saint's Pendant"],ranger:["Hawkeye Charm","Wolf Fang"],sorcerer:["Moon Amulet","Astral Prism"],monk:["Prayer Beads","Lotus Pendant"],clown:["Honking Medallion","Golden Ticket"],rouge:["Ruby Choker","Heart of Carmine"],berserker:["Wolf-Tooth Fetish","Heart of Rage"]}
  };

  Object.assign(gearNames.weapon,{turtle:["Shellhammer","Tideworn Mace","Ancient Flipper Blade"],frog:["Tongue Lash","Croakstaff","Bog Spear"],d20:["Twenty-Edged Die","Probability Scepter","Chaos Icosahedron"],slime:["Gelatinous Blade","Ooze Wand","Puddle Hammer"]});
  Object.assign(gearNames.offhand,{turtle:["Ancestral Shell","Reef Bulwark"],frog:["Lily Pad","Echo Sac"],d20:["Probability Table","Loaded Fate"],slime:["Smaller Slime","Acid Bubble"]});
  Object.assign(gearNames.boots,{turtle:["Tidecrawler Greaves"],frog:["Springheel Webbing"],d20:["Probability Boots"],slime:["Pseudopod Shoes"]});
  Object.assign(gearNames.legs,{turtle:["Shellbound Tassets"],frog:["Bogstrider Wraps"],d20:["Twenty-Faced Legguards"],slime:["Gel Trousers"]});
  Object.assign(gearNames.chest,{turtle:["Worldshell Carapace"],frog:["Croaking Vest"],d20:["Icosahedral Plate"],slime:["Viscous Cuirass"]});
  Object.assign(gearNames.hat,{turtle:["Tiny Shell Crown"],frog:["Royal Flycatcher"],d20:["Crown of Twenty Faces"],slime:["Bucket"]});
  Object.assign(gearNames.ring,{turtle:["Tidal Ring"],frog:["Pond Circle"],d20:["Ring of Random Integers"],slime:["Gel Loop"]});
  Object.assign(gearNames.amulet,{turtle:["Pearl of Patience"],frog:["Golden Fly"],d20:["Pendant of Natural Twenty"],slime:["Suspicious Droplet"]});
  const rarityPrefixes={common:"Worn",uncommon:"Fine",rare:"Royal",epic:"Mythic",legendary:"Godforged",mythical:"Impossible"};
  /* rarityValues is registry-owned. */

  function gearIcon(slot){const offhand={fighter:"🛡️",ranger:"🪶",sorcerer:"📖",monk:"📿",clown:"🎭",rouge:"🎨",berserker:"💀",turtle:"🐚",frog:"🪷",d20:"🎲",slime:"🫧"};return {weapon:CLASSES[player.classId].attackIcon,offhand:offhand[player.classId]||"📖",boots:"🥾",legs:"👖",chest:"🥋",hat:"🪖",ring:"💍",amulet:"📿"}[slot];}
  function elementChanceForRarity(rarity){return {common:.16,uncommon:.26,rare:.38,epic:.52,legendary:.70,mythical:1}[rarity]||0;}
  function maybeAddElement(item){if(item.slot!=="weapon"||random()>=elementChanceForRarity(item.rarity))return item;item.element=pick(ELEMENT_KEYS);return item;}
  function elementSummary(item){if(!item?.element||!ELEMENTS[item.element])return "";const e=ELEMENTS[item.element],chance=Math.round((.14+rarityValues[item.rarity]*.025)*100);return `${e.icon} ${e.name} element · ${chance}% proc chance · ${e.spell}`;}
  function generateEquipment(forceRarity=null,forcedSlot=null){
    const rarity=forceRarity||rollGearRarity(0),tier=rarityValues[rarity],slot=forcedSlot||pick(EQUIPMENT_SLOTS),progress=Math.floor(player.position/16);
    const names=(gearNames[slot]&&gearNames[slot][player.classId])||gearNames[slot];
    const item={id:`gear_${Date.now()}_${random().toString(36).slice(2,8)}`,slot,rarity,icon:gearIcon(slot),name:`${rarityPrefixes[rarity]} ${pick(names)}`,bonuses:{}};
    const power=tier+Math.floor(progress/2);
    if(slot==="weapon")item.bonuses.attack=Math.max(1,power+rand(0,1));
    if(slot==="offhand"){
      if(player.classId==="fighter")item.bonuses.defense=Math.max(1,Math.ceil(power*.65));
      else if(player.classId==="ranger")item.bonuses.crit=.015*tier+.005*progress;
      else if(player.classId==="sorcerer")item.bonuses.attack=Math.max(1,Math.ceil(power*.55));
      else if(player.classId==="monk"){item.bonuses.doubleStrike=.012*tier;item.bonuses.dodge=.008*tier;}
      else if(player.classId==="clown")item.bonuses.luck=.025*tier;
      else if(player.classId==="rouge")item.bonuses.lifeSteal=.014*tier;
      else if(player.classId==="berserker")item.bonuses.attack=Math.max(1,Math.ceil(power*.55));
      else if(player.classId==="turtle")item.bonuses.defense=Math.max(1,Math.ceil(power*.8));
      else if(player.classId==="frog")item.bonuses.doubleStrike=.015*tier;
      else if(player.classId==="d20")item.bonuses.luck=.03*tier;
      else if(player.classId==="slime")item.bonuses.maxHp=2*tier;
    }
    if(slot==="boots")item.bonuses.dodge=.012*tier+.003*progress;
    if(slot==="legs")item.bonuses.maxHp=3*tier+progress*2;
    if(slot==="chest")item.bonuses.defense=Math.max(1,Math.ceil(tier*.55)+Math.floor(progress/3));
    if(slot==="hat")item.bonuses.crit=.01*tier+.002*progress;
    if(slot==="ring")item.bonuses.goldBonus=.04*tier;
    if(slot==="amulet")item.bonuses.lifeSteal=.018*tier;
    if(tier>=3){
      const secondary=pick(["maxHp","attack","crit","luck","potionPower","bossDamage"]);
      if(secondary==="maxHp")item.bonuses.maxHp=(item.bonuses.maxHp||0)+tier*2;
      if(secondary==="attack")item.bonuses.attack=(item.bonuses.attack||0)+Math.max(1,tier-2);
      if(secondary==="crit")item.bonuses.crit=(item.bonuses.crit||0)+.01*(tier-1);
      if(secondary==="luck")item.bonuses.luck=(item.bonuses.luck||0)+.035*(tier-2);
      if(secondary==="potionPower")item.bonuses.potionPower=(item.bonuses.potionPower||0)+.12*(tier-2);
      if(secondary==="bossDamage")item.bonuses.bossDamage=(item.bonuses.bossDamage||0)+.08*(tier-2);
    }
    return maybeAddElement(item);
  }
  function generateMythicalBoots(){return {id:`mythical_boots_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"boots",rarity:"mythical",mythical:true,mythicPiece:"boots",setName:"Impossible Road",uniqueEffect:"Titanstep: rolling 5 or 6 restores 5% max HP and grants 10 ultimate charge.",icon:"🥾",name:"Titanstep, Boots of the Astral Road",bonuses:{maxHp:20,defense:3,dodge:.15,extraStepChance:.25}};}
  function generateMythicalAmulet(){return {id:`mythical_amulet_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"amulet",rarity:"mythical",mythical:true,mythicPiece:"amulet",setName:"Impossible Road",uniqueEffect:"Devourer's Gaze: once per battle below 35% HP, consume 12% of every living enemy's max HP and heal for half the damage.",icon:"👁️",name:"The Devourer's Last Eye",bonuses:{maxHp:30,attack:8,crit:.15,luck:.20,lifeSteal:.10,bossDamage:.50}};}
  function generateMythicalPants(){return {id:`mythical_legs_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"legs",rarity:"mythical",mythical:true,mythicPiece:"legs",setName:"Impossible Road",uniqueEffect:"Paradox Loop: every third player action restores 6% max HP and grants 15 ultimate charge.",icon:"👖",name:"Paradox Weave, Legguards Outside Time",bonuses:{maxHp:34,defense:5,attack:5,doubleStrike:.16,luck:.14}};}
  function bonusLabel(key,value){
    const names={attack:"Attack",defense:"Defense",maxHp:"Max HP",maxMana:"Mana",crit:"Crit",dodge:"Dodge",lifeSteal:"Lifesteal",luck:"Luck",goldBonus:"Gold",potionPower:"Potion healing",bossDamage:"Boss Damage",flatReduction:"Damage reduction",doubleStrike:"Echo Strike",classBurst:"Signature Burst",extraStepChance:"Extra-step chance",damageBonus:"All damage"};
    if(key==="luck")return `+${Math.round(value*100)} Luck`;
    const pct=["crit","dodge","lifeSteal","goldBonus","potionPower","bossDamage","doubleStrike","classBurst","extraStepChance","damageBonus"].includes(key);
    return `+${pct?Math.round(value*100)+"%":value} ${names[key]||key}`;
  }
  function formatBonuses(item){const stats=Object.entries(item?.bonuses||{}).map(([k,v])=>bonusLabel(k,v));if(item?.element&&ELEMENTS[item.element])stats.push(elementSummary(item));if(item?.uniqueEffect)stats.push(`Unique: ${item.uniqueEffect}`);if(item?.setName)stats.push(`Set: ${item.setName}`);return stats.join(" · ")||"No bonuses";}
  function mythicalSetCount(){return EQUIPMENT_SLOTS.reduce((n,slot)=>n+(player.equipment?.[slot]?.setName==="Impossible Road"?1:0),0);}
  function hasMythicPiece(piece){return EQUIPMENT_SLOTS.some(slot=>player.equipment?.[slot]?.mythicPiece===piece);}
  function applyItemStats(item,sign){
    if(!item)return;
    const oldMax=player.maxHp;
    Object.entries(item.bonuses||{}).forEach(([key,value])=>{if(typeof player[key]==="number")player[key]+=value*sign;});
    player.crit=Math.max(0,player.crit);player.dodge=Math.max(0,player.dodge);player.lifeSteal=clamp(player.lifeSteal,0,.75);player.luck=clamp(player.luck,0,1.50);player.doubleStrike=Math.max(0,player.doubleStrike);
    if(player.maxHp<1)player.maxHp=1;
    if(sign>0&&player.maxHp>oldMax)player.hp+=player.maxHp-oldMax;
    player.hp=clamp(player.hp,1,player.maxHp);
  }
  function gearPowerScore(item){
    if(!item)return 0;const w={attack:7,defense:8,maxHp:.55,crit:45,dodge:38,lifeSteal:45,luck:18,goldBonus:20,potionPower:15,bossDamage:34,doubleStrike:42,classBurst:30,extraStepChance:18,damageBonus:50,flatReduction:11};
    let score=(rarityValues[item.rarity]||0)*3+(item.element?7:0)+(item.mythical?100:0);Object.entries(item.bonuses||{}).forEach(([k,v])=>score+=Math.abs(v)*(w[k]||2));return score;
  }
  function equipItem(item,silent=false){
    const old=player.equipment[item.slot];if(old)applyItemStats(old,-1);
    player.equipment[item.slot]=JSON.parse(JSON.stringify(item));applyItemStats(item,1);
    if(!silent){sfx.level();showToast(`Equipped ${item.name}`);addLog(`Equipped <b>${item.name}</b> (${rarityInfo[item.rarity].label}).`);}
    renderEquipment();updateHUD();
  }
  function renderEquipment(){
    beta043RefreshEquipmentArt?.();return dbEquipmentUi.renderEquipment();
  }
  function itemSellValue(item){return 10+rarityValues[item.rarity]*14+Math.floor(player.position/5);}
  function closeLoot(){
    $("lootOverlay").classList.add("hidden");const cb=pendingLootCallback;pendingLootItem=null;pendingLootCallback=null;if(cb)cb();
  }
  function equipmentDropChance(boss=false){return boss?1:.34+Math.min(.18,player.position*.0025);}
  function formatGearComparison(item,current){
    if(!current)return `<b>Equipped:</b> Empty ${SLOT_LABELS[item.slot]} slot.<br><span class="better">Everything on this item is new.</span>`;
    const keys=new Set([...Object.keys(item.bonuses||{}),...Object.keys(current.bonuses||{})]);
    const deltas=[];
    keys.forEach(key=>{
      const diff=(item.bonuses?.[key]||0)-(current.bonuses?.[key]||0);
      if(Math.abs(diff)<.0001)return;
      const pct=["crit","dodge","lifeSteal","goldBonus","potionPower","bossDamage","doubleStrike","classBurst","extraStepChance","damageBonus"].includes(key);
      const names={attack:"Attack",defense:"Defense",maxHp:"Max HP",crit:"Crit",dodge:"Dodge",lifeSteal:"Lifesteal",luck:"Luck",goldBonus:"Gold",potionPower:"Potion healing",bossDamage:"Boss Damage",flatReduction:"Damage reduction",doubleStrike:"Echo Strike",classBurst:"Signature Burst",extraStepChance:"Extra-step chance",damageBonus:"All damage"};
      const value=key==="luck"?Math.abs(Math.round(diff*100)):pct?`${Math.abs(Math.round(diff*100))}%`:Math.abs(Math.round(diff*100)/100);
      deltas.push(`<span class="${diff>0?"better":"worse"}">${diff>0?"+":"−"}${value} ${names[key]||key}</span>`);
    });
    return `<b>Equipped:</b> ${current.icon} ${current.name}<br>${formatBonuses(current)}<br><b>Change:</b> ${deltas.length?deltas.join(" · "):'<span class="same">No numerical change</span>'}`;
  }

  /* #209 / #40: equipment and Heirloom presentation is owned by
     ui/equipment-heirlooms.js. The monolith supplies runtime facts and the
     existing storage/persistence transactions only. */
  const dbEquipmentUi=window.DiceboundEquipmentHeirlooms;
  if(!dbEquipmentUi)throw new Error('DiceBound requires the equipment and Heirloom UI module before dicebound.js');
  function dbEquipmentUiState(){return {
    equipment:player.equipment||{},heirlooms:meta.heirlooms||[],storage:meta.heirloomStorage||[],
    storageUnlocked:!!v24StorageUnlocked?.(),storageCapacity:v24StorageCapacity?.()||0,
    activeCapacity:getHeirloomSlots(),storageMilestones:v24StorageMilestones?.()||[]
  };}
  function dbEquipmentUiToggleStoredActive(item){
    let hs=[...(meta.heirlooms||[])],index=hs.findIndex(entry=>entry.id===item.id);
    if(index>=0)hs.splice(index,1);
    else{const same=hs.findIndex(entry=>entry.slot===item.slot);if(same>=0)hs.splice(same,1);if(hs.length>=getHeirloomSlots()){showToast(`Active heirloom loadout is full (${getHeirloomSlots()})`);return false;}hs.push(normalizeSavedItem(item));}
    meta.heirlooms=hs;saveMeta();return true;
  }
  function dbEquipmentUiDiscardStored(item){meta.heirloomStorage=(meta.heirloomStorage||[]).filter(entry=>entry.id!==item.id);meta.heirlooms=(meta.heirlooms||[]).filter(entry=>entry.id!==item.id);saveMeta();showToast(`${item.name} removed from Heirloom Storage`);return true;}
  function dbEquipmentUiToggleRunStorage(item){
    let storage=[...(meta.heirloomStorage||[])],index=storage.findIndex(entry=>entry.id===item.id);
    if(index>=0){storage.splice(index,1);meta.heirlooms=(meta.heirlooms||[]).filter(entry=>entry.id!==item.id);}
    else{if(storage.length>=v24StorageCapacity()){showToast('Heirloom Storage is full');return false;}storage.push(normalizeSavedItem(item));}
    meta.heirloomStorage=storage;saveMeta();return true;
  }
  function dbEquipmentUiToggleLegacyHeirloom(item){
    if(!window.DiceboundEquipment.isHeirloomEligible(item)){showToast(`${item.name} cannot become an heirloom`);return false;}
    let heirlooms=[...(meta.heirlooms||[])],index=heirlooms.findIndex(entry=>entry.id===item.id);
    if(index>=0)heirlooms.splice(index,1);
    else{const same=heirlooms.findIndex(entry=>entry.slot===item.slot);if(same>=0)heirlooms.splice(same,1);if(heirlooms.length>=getHeirloomSlots())heirlooms.shift();heirlooms.push(JSON.parse(JSON.stringify(item)));sfx.holy();showToast(`${item.name} bound as heirloom`);}
    meta.heirlooms=heirlooms;saveMeta();return true;
  }
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
    db060MythicalizeNamed?.(item);return true;
  }
  dbEquipmentUi.configure({
    find:$,getSlots:()=>EQUIPMENT_SLOTS,getSlotLabel:slot=>SLOT_LABELS[slot],getRarityInfo:rarity=>rarityInfo[rarity],formatBonuses,
    getState:dbEquipmentUiState,getArtifactSet:()=>({count:mythicalSetCount(),tiers:v24SetTierData().map(tier=>({pieces:tier.pieces,text:tier.text}))}),
    resolveEquipmentArt:item=>window.DiceboundAssets?.resolveEquipmentArt?.(item),itemSellValue,
    syncStorage:()=>v24SyncStorage?.(),toggleStoredActive:dbEquipmentUiToggleStoredActive,discardStored:dbEquipmentUiDiscardStored,
    toggleRunStorage:dbEquipmentUiToggleRunStorage,toggleLegacyHeirloom:dbEquipmentUiToggleLegacyHeirloom,
    isHeirloomEligible:item=>window.DiceboundEquipment.isHeirloomEligible(item),confirm:diceboundConfirm,
    afterStorageChange:()=>updateMetaUI(),lootCopy:dbEquipmentUiLootCopy
  });

  const req=(id,rank=1)=>({id,rank});
  const talentRank=id=>Math.max(0,Number(meta.purchased[id])||0);

  /* Alpha v3.1.7: talents are registry-owned. */
  function repairTalentPrerequisites(){
    const byId=Object.fromEntries(talents.map(t=>[t.id,t]));let changed=true,guard=0;
    while(changed&&guard++<100){changed=false;for(const talent of talents){if(!talentRank(talent.id))continue;for(const r of talent.requires||[]){const reqTalent=byId[r.id];if(reqTalent&&talentRank(r.id)<r.rank){meta.purchased[r.id]=Math.min(reqTalent.maxRank,r.rank);changed=true;}}}}
    if(changed===false)saveMeta();
  }
  repairTalentPrerequisites();

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

  function getHeirloomSlots(){return 1+talentRank("legacy_heirloom")+((meta.prestige?.count||0)>=20?1:0);}
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
    const [icon,label]=tileMeta(tile);
    el.className=`tile ${tile.type}${tile.cleared?" cleared":""}${index===player.position?" current":""}`;
    el.innerHTML=`<span class="tile-number">${index+1}</span><span class="tile-icon">${icon}</span><span class="tile-label">${label}</span>`;
  }
  function refreshBoardHighlights(){
    tileEls.forEach((el,i)=>{el.classList.toggle("current",i===player.position);el.classList.toggle("cleared",tiles[i].cleared);});
  }
  function placePawn(hop=true){
    const tile=tileEls[player.position],wrap=$("boardWrap");if(!tile||!wrap)return;
    const tr=tile.getBoundingClientRect(),wr=wrap.getBoundingClientRect(),pawn=$("pawn");
    pawn.style.left=`${tr.left-wr.left+tr.width/2}px`;pawn.style.top=`${tr.top-wr.top+tr.height/2}px`;
    if(hop){pawn.classList.add("hop");setTimeout(()=>pawn.classList.remove("hop"),150);}
  }

  function activePetDef(){return PETS[meta.activePet]||PETS.neutral;}
  function activePetState(){return meta.pets?.[meta.activePet]||meta.pets.neutral;}
  function petDamage(){const talentBonus=gameStarted?player.petDamageBonus:talentRank("companion_damage")+talentRank("companion_ascendant")*2;return 1+Math.ceil((activePetState()?.level||1)*.8)+talentBonus;}
  function updateMetaUI(){
    const pet=activePetState(),def=activePetDef();
    $("talentPointTop").textContent=meta.points;
    $("petAvatar").textContent=def.icon;$("petName").textContent=def.name;$("combatPet").textContent=def.icon;$("petCookies").textContent=meta.petCookies;
    $("petStats").textContent=`Level ${pet.level} · ${petDamage()} ${def.id==="neutral"?"random core-element":def.element?ELEMENTS[def.element].name:"neutral"} damage · ${pet.xp} / ${pet.xpNext} bond`;
    $("feedPetBtn").disabled=meta.petCookies<=0;$("feedAllPetBtn").disabled=meta.petCookies<=0;
  }
  function rawDodgeChance(){return Math.max(0,player.dodge+player.defense*player.defenseDodgeScale);}
  function effectiveDodgeChance(){const raw=rawDodgeChance();return raw/(1+raw);}
  function addLog(text){const p=document.createElement("p");p.innerHTML=text;$("log").prepend(p);}
  function addCombatHistory(text){const box=$("combatHistory");if(!box)return;const p=document.createElement("p");p.textContent=text;box.appendChild(p);box.scrollTop=box.scrollHeight;}
  function setCombatText(text,record=true){$("combatText").textContent=text;if(record)addCombatHistory(text);}
  const toastQueue=[];let toastActive=false;
  function showToast(text,duration=1900,isUnlock=false){toastQueue.push({text,duration,isUnlock});if(!toastActive)showNextToast();}
  function showNextToast(){const t=$("toast"),entry=toastQueue.shift();if(!entry){toastActive=false;t.classList.remove("show","unlock-toast");return;}toastActive=true;t.textContent=entry.text;t.classList.toggle("unlock-toast",!!entry.isUnlock);t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{t.classList.remove("show");setTimeout(showNextToast,170);},entry.duration);}

  function chooseDieResult(){
    return new Promise(resolve=>{pendingDiceChoiceResolve=resolve;const grid=$("diceChoiceGrid");grid.innerHTML="";diceFaces.forEach((face,i)=>{const b=document.createElement("button");b.textContent=face;b.addEventListener("click",()=>{pendingDiceChoiceResolve=null;$("diceChoiceOverlay").classList.add("hidden");resolve(i+1);});grid.appendChild(b);});$("diceChoiceOverlay").classList.remove("hidden");});
  }
  function returnToRoad(){
    if(pendingLevelUps>0)openLevelUp();else{rollLocked=false;updateHUD();}
  }


  function livingEnemies(){return currentEnemies.filter(e=>e.hp>0);}
  function setCurrentEnemy(index){
    if(!currentEnemies.length){currentEnemy=null;return;}
    const safe=currentEnemies[index]?.hp>0?index:currentEnemies.findIndex(e=>e.hp>0);currentEnemyIndex=safe<0?0:safe;currentEnemy=currentEnemies[currentEnemyIndex]||null;renderEnemyParty();updateCombatUI();
  }
  function updateBossSpecialIndicator(){
    const lead=currentEncounterLead,box=$("bossSpecialIndicator");if(!lead?.guardian||(!lead.miniBoss&&!lead.finalBoss&&!lead.merchantBoss)){box.classList.add("hidden");return;}const remaining=GUARDIAN_SPECIAL_INTERVAL-(currentEncounterTurn%GUARDIAN_SPECIAL_INTERVAL);box.classList.remove("hidden");box.classList.toggle("imminent",remaining<=2);box.textContent=`⚠️ ${lead.specialName||"Guardian special"} in ${remaining} turn${remaining===1?"":"s"}`;
  }
  function describeCurrentUltimate(classId=player.classId){
    const definition=CLASSES[classId]||CLASSES[player.classId];
    return DB_EFFECTIVE_STATS.describeUltimate(classId,definition,player,{setDamageBonus:v19SetDamageBonus(),rageActive:classId==="berserker"&&classIdentityActive("berserker")});
  }
  async function animateClassAttack(mode="normal"){
    const cls=CLASSES[player.classId],icon=$("combatPlayerIcon"),stage=$("enemyIcon"),enemy=stage.querySelector(`.stage-enemy[data-enemy-index="${currentEnemyIndex}"]`)||stage,fx=$("attackFx");icon.classList.remove("attack-lunge");fx.className="attack-fx";void fx.offsetWidth;icon.classList.add("attack-lunge");fx.textContent=mode==="crit"?"💥✦":mode==="echo"?`↯ ${cls.attackIcon}`:(cls.fxIcon||cls.attackIcon);fx.classList.add(mode==="crit"?"crit-attack":mode==="echo"?"echo-attack":player.classId);
    await delay(mode==="crit"?520:mode==="echo"?350:({fighter:360,ranger:460,sorcerer:460,monk:420,clown:500,rouge:450,berserker:500}[player.classId]||460));enemy.classList.add("enemy-hit");await delay(130);enemy.classList.remove("enemy-hit");icon.classList.remove("attack-lunge");
  }
  function chargeUltimate(amount){player.ultimateCharge=clamp(player.ultimateCharge+amount,0,100);updateCombatUI();}
  function trackElementProgress(key,amount){
    if(!key||!ELEMENTS[key]||amount<=0)return;meta.elementProgress[key]=(meta.elementProgress[key]||0)+amount;const state=meta.pets[key];
    if(state&&!state.unlocked&&meta.elementProgress[key]>=PET_UNLOCK_REQUIREMENT){state.unlocked=true;saveMeta();sfx.holy();showToast(`NEW PET UNLOCKED · ${PETS[key].icon} ${PETS[key].name}`,3400,true);addLog(`<b>Elemental companion unlocked:</b> ${PETS[key].name} after ${Math.floor(meta.elementProgress[key])} ${ELEMENTS[key].name} damage/healing.`);}else saveMeta();
  }
  async function petTurn(){
    const targets=livingEnemies();if(!targets.length)return;const target=currentEnemy?.hp>0?currentEnemy:targets[0],def=activePetDef(),pet=$("combatPet");pet.classList.remove("pet-attack");void pet.offsetWidth;pet.classList.add("pet-attack");await delay(300);
    let hits=1,totalBase=petDamage();if(random()<clamp(player.petDoubleChance+(v19SetPetDoubleBonus()),0,.95))hits=2;
    let total=0,element=def.element;
    if(def.id==="neutral")element=pick(DIBO_ELEMENTS);
    for(let i=0;i<hits;i++){let amount=totalBase;if(element&&target.weakness===element)amount=Math.round(amount*1.5);total+=damageEnemy(target,amount);if(element)trackElementProgress(element,amount);}
    tone(520,.08,"triangle",.025,760);setCombatText(`${def.name} ${hits===2?"attacks twice":"attacks"} for ${total} ${element?ELEMENTS[element].name:"neutral"} damage${def.id==="neutral"?` after rolling ${ELEMENTS[element].icon}`:""}.`);if(target.hp<=0)setCurrentEnemy(currentEnemies.indexOf(target));updateCombatUI();await delay(620);pet.classList.remove("pet-attack");
  }

  async function animateUltimate(){
    const fx=$("attackFx"),enemy=$("enemyIcon");fx.className="attack-fx";void fx.offsetWidth;fx.textContent=({fighter:"⚔️",ranger:"➶➶➶➶",sorcerer:"☄️",monk:"👊👊👊👊",clown:"🎪🐔💥",rouge:"🌹🩸",berserker:"🌋🪓",turtle:"🐚💥",frog:"🐸🐸🐸",d20:"🎲20!",slime:"🟢🌊",vampire:"🌑🩸🦇",ninja:"🌘🗡️🗡️",ceo:"📉💥",merchant:"🏦🪙⚖️"}[player.classId]||"💥");fx.classList.add(`ultimate-${player.classId}`);sfx.holy();await delay(({sorcerer:760,monk:690,clown:790,rouge:730,berserker:760}[player.classId]||620));enemy.classList.add("enemy-hit");await delay(190);enemy.classList.remove("enemy-hit");
  }
  function currentWeaponElement(){const weapon=player.equipment?.weapon;return weapon?.element&&ELEMENTS[weapon.element]?weapon.element:null;}
  function damageAll(amount,falloff=1){let total=0;livingEnemies().forEach(e=>{total+=damageEnemy(e,amount*(e===currentEnemy?1:falloff));});return total;}
  function triggerWeaponElement(target=currentEnemy){const key=currentWeaponElement();return key?triggerElementEffect(key,target,{forced:false,source:"weapon"}):null;}
  function triggerStrikeElements(target,chaos=null){
    const results=[];const weapon=triggerWeaponElement(target);if(weapon)results.push(weapon);
    Object.entries(player.classElementProcs||{}).forEach(([key,chance])=>{const times=rollTieredProc(chance);for(let i=0;i<times;i++){const r=triggerElementEffect(key,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"class affinity"});if(r)results.push(r);}});
    const omniTimes=rollTieredProc(player.omniElementChance||0);for(let n=0;n<omniTimes;n++)ELEMENT_KEYS.forEach(key=>{const r=triggerElementEffect(key,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"Prismatic Accident"});if(r)results.push(r);});
    if(chaos?.forceElement){const r=triggerElementEffect(chaos.forceElement,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"d20"});if(r)results.push(r);}
    if(chaos?.allElements)DIBO_ELEMENTS.forEach(key=>{const r=triggerElementEffect(key,target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:"natural twenty"});if(r)results.push(r);});
    return {totalDamage:results.reduce((n,r)=>n+(r.totalDamage||0),0),heal:results.reduce((n,r)=>n+(r.heal||0),0),message:results.map(r=>r.message).join(" ")};
  }

  async function rollD20Chaos(action){
    if(!classIdentityActive("d20"))return {roll:0,mult:1,extraEcho:0,bonusCrit:0,potionMult:1,guardBonus:0};
    let roll=rand(1,20);if(player.d20HighRollChance&&random()<player.d20HighRollChance)roll=rand(17,20);const fx=$("attackFx");fx.className="attack-fx crit-attack";fx.textContent=`🎲 ${roll}`;void fx.offsetWidth;await delay(260);
    const out={roll,mult:1,extraEcho:0,bonusCrit:0,potionMult:1,guardBonus:0,notes:""};
    if(roll===1){const hurt=Math.max(1,Math.ceil(player.maxHp*.12));player.hp=Math.max(1,player.hp-hurt);out.mult=.35;out.potionMult=.5;out.notes=`Natural 1: probability bites back for ${hurt} self-damage.`;}
    else if(roll<=4){out.mult=.7;out.notes=`Roll ${roll}: a distinctly mediocre outcome.`;}
    else if(roll<=7){player.ultimateCharge=clamp(player.ultimateCharge+12,0,100);out.notes=`Roll ${roll}: +12 ultimate charge.`;}
    else if(roll<=10){const h=Math.min(player.maxHp-player.hp,Math.ceil(player.maxHp*.08));player.hp+=h;out.notes=`Roll ${roll}: fate restores ${h} HP.`;}
    else if(roll<=13){out.mult=1.3;out.potionMult=1.3;out.guardBonus=.12;out.notes=`Roll ${roll}: the action is empowered by 30%.`;}
    else if(roll<=16){out.extraEcho=1;player.combatShield++;out.notes=`Roll ${roll}: gain one extra strike and a barrier.`;}
    else if(roll<=18){out.mult=1.65;out.forceElement=pick(DIBO_ELEMENTS);out.notes=`Roll ${roll}: ${ELEMENTS[out.forceElement].icon} ${ELEMENTS[out.forceElement].name} chaos erupts.`;}
    else if(roll===19){out.mult=2;out.bonusCrit=1;out.notes="Roll 19: guaranteed additional critical tier and double power.";}
    else{out.mult=3;out.bonusCrit=2;out.extraEcho=2;out.allElements=true;player.hp=player.maxHp;player.ultimateCharge=100;out.notes="NATURAL 20: full heal, triple power, two extra strikes and all six core elements.";}
    if(player.d20BonusChance&&random()<player.d20BonusChance){const bonus=pick(["echo","barrier","heal","element"]);if(bonus==="echo"){out.extraEcho++;out.notes+=" Probability adds an extra Echo.";}if(bonus==="barrier"){player.combatShield++;out.notes+=" Probability raises a barrier.";}if(bonus==="heal"){const h=Math.min(player.maxHp-player.hp,rand(4,12));player.hp+=h;out.notes+=` Probability heals ${h} HP.`;}if(bonus==="element"){out.forceElement=pick(DIBO_ELEMENTS);out.notes+=` Probability invokes ${ELEMENTS[out.forceElement].icon} ${ELEMENTS[out.forceElement].name}.`;}}
    setCombatText(`🎲 ${action} d20: ${out.notes}`);showToast(`D20 rolled ${roll}`);return out;
  }
  function applyMythicPantsPulse(){
    if(!hasMythicPiece("legs"))return "";player.mythicActionCount++;if(player.mythicActionCount%3)return "";
    const heal=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.06)));player.hp+=heal;player.ultimateCharge=clamp(player.ultimateCharge+15,0,100);const note=`👖 Paradox Loop restores ${heal} HP and grants 15 ultimate.`;addCombatHistory(note);showToast("👖 Paradox Loop");return note;
  }
  async function useUltimate(){
    if(combatBusy||!currentEnemy||player.ultimateCharge<100)return;combatBusy=true;player.guardCooldown=0;player.ultimateCharge=0;const chaos=await rollD20Chaos("ultimate");updateCombatUI();await animateUltimate();let damage=0,text="",aoe=["ranger","sorcerer","clown","berserker","turtle","slime","vampire","ceo","merchant"].includes(player.classId),twoTarget=false;
    if(player.classId==="fighter"){damage=Math.round(player.attack*2.6)+rand(2,5);player.combatShield+=1+(player.titanCleaveBarrierBonus||0);twoTarget=true;text=`Titan Cleave hits up to two enemies for {DAMAGE} total damage and raises ${1+(player.titanCleaveBarrierBonus||0)} barrier${(1+(player.titanCleaveBarrierBonus||0))===1?"":"s"}.`;}else if(player.classId==="ranger"){damage=Math.round(player.attack*3.4)+rand(3,7);text="Arrow Storm sweeps the pack for {DAMAGE}.";}else if(player.classId==="sorcerer"){damage=Math.round(player.attack*3)+rand(4,8);text="Starfall crashes across the pack for {DAMAGE}.";}else if(player.classId==="monk"){damage=Math.round(player.attack*3.25)+rand(3,7);const h=Math.min(player.maxHp-player.hp,Math.ceil(player.maxHp*.10));player.hp+=h;text=`Hundred Fists deals {DAMAGE} and restores ${h} HP.`;}else if(player.classId==="clown"){damage=Math.round(player.attack*(rand(240,420)/100))+rand(2,10);text="Final Punchline devastates the pack for {DAMAGE}.";}else if(player.classId==="berserker"){damage=DB_EFFECTIVE_STATS.ultimateBaseDamage("berserker",player,rand(5,10));text="Ragequake shatters the pack for {DAMAGE}.";}else if(player.classId==="turtle"){damage=Math.round((player.attack+player.defense)*2.4)+rand(4,8);player.combatShield+=2;text="Shellquake deals {DAMAGE} and grants two barriers.";}else if(player.classId==="frog"){const jumps=6+Math.floor(player.doubleStrike*4),scale=.75+player.doubleStrike*.55;let dealt=0;for(let i=0;i<jumps&&livingEnemies().length;i++){const t=pick(livingEnemies());dealt+=damageEnemy(t,(player.attack+rand(0,2))*scale);await animateClassAttack(i?"echo":"normal");}text=`Croak Cascade converts ${Math.round(player.doubleStrike*100)}% Echo into ${jumps} jumps for ${dealt} total damage.`;damage=0;}else if(player.classId==="d20"){damage=Math.round(player.attack*(2.1+chaos.roll*.12))+rand(1,chaos.roll||1);aoe=chaos.roll>=15;text="Natural Twenty warps probability for {DAMAGE}.";}else if(player.classId==="slime"){damage=Math.round(player.attack*2.7)+rand(3,8);text="Ooze Everything washes over the pack for {DAMAGE}.";}else if(player.classId==="vampire"){damage=Math.round(player.attack*3.15)+rand(4,9);text="Crimson Eclipse drains the pack for {DAMAGE}.";}else if(player.classId==="ninja"){let dealt=0;for(let i=0;i<5&&livingEnemies().length;i++){const t=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],crit=rollTieredProc(player.crit)+1,d=Math.round(player.attack*.85*(1+crit));dealt+=damageEnemy(t,d);await animateClassAttack("crit");}text=`Thousand Shadows lands five guaranteed critical strikes for ${dealt} total damage.`;damage=0;}else if(player.classId==="ceo"){damage=Math.round(player.attack*2.8+player.gold*.10)*(1+player.bossDamage);text="Quarterly Annihilation liquidates the pack for {DAMAGE}.";}else if(player.classId==="merchant"){damage=Math.round(player.attack*3+player.gold*.20);player.gold+=50;player.combatShield+=2;text="Market Monopoly deals {DAMAGE}, grants 50 gold and raises two barriers.";}else{damage=Math.round(player.attack*3.1)+rand(4,8);text="Crimson Deluge paints the battlefield for {DAMAGE}.";}
    damage=DB_EFFECTIVE_STATS.scaleUltimateDamage(damage,player,{chaosMultiplier:chaos.mult||1,setDamageBonus:v19SetDamageBonus()});if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));let dealt=0;if(twoTarget){[currentEnemy,...livingEnemies().filter(e=>e!==currentEnemy)].slice(0,2).forEach((e,i)=>dealt+=damageEnemy(e,damage*(i?.85:1)));}else if(!["frog","ninja"].includes(player.classId))dealt=aoe?damageAll(damage,.78):damageEnemy(currentEnemy,damage);const proc=livingEnemies().length?triggerStrikeElements(currentEnemy,chaos):{totalDamage:0,message:""},drain=player.lifeSteal+(player.classId==="sorcerer"?.20:0)+(player.classId==="rouge"?.25:0)+(player.classId==="vampire"?.50:0),healed=drain>0&&(dealt+proc.totalDamage)>0?Math.min(player.maxHp-player.hp,Math.max(1,Math.floor((dealt+proc.totalDamage)*drain))):0;player.hp+=healed;const pants=applyMythicPantsPulse();text=text.replace("{DAMAGE}",dealt)+(proc.message?` ${proc.message}`:"")+(healed?` Lifesteal restores ${healed} HP.`:"")+(pants?` ${pants}`:"");setCombatText(text);sfx.crit();updateCombatUI();await delay(850);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);
  }

  function rollTieredProc(chance){const guaranteed=Math.floor(Math.max(0,chance)),fraction=Math.max(0,chance-guaranteed);return guaranteed+(random()<fraction?1:0);}
  function strikeBaseDamage(echo=false,chaos=null,{canCrit=true}={}){let attack=player.attack+(player.goldAttackScale?Math.floor(player.gold*player.goldAttackScale):0),damage=Math.max(1,Math.round(attack+player.defense*player.defenseAttackScale)+rand(-1,2)),burst="";if(classIdentityActive("sorcerer")&&random()<player.classBurst){damage=Math.round(damage*1.5);burst="Arcane Surge! ";}if(classIdentityActive("monk")&&random()<player.classBurst){damage=Math.round(damage*1.35);player.ultimateCharge=clamp(player.ultimateCharge+6,0,100);burst="Flowing Combo! ";}if(classIdentityActive("clown")&&random()<player.classBurst){damage=Math.round(damage*(.9+random()*1.1));burst="Unlicensed Comedy! ";}if(classIdentityActive("rouge")&&random()<player.classBurst){damage=Math.round(damage*1.45);burst="Crimson Stroke! ";}if(classIdentityActive("berserker")&&random()<player.classBurst){damage=Math.round(damage*1.55);burst="Blood Frenzy! ";}if(classIdentityActive("frog")&&random()<player.classBurst){damage=Math.round(damage*1.35);burst="Resonant Croak! ";}if(classIdentityActive("vampire")&&random()<player.classBurst){damage=Math.round(damage*1.5);burst="Blood Frenzy! ";}if(classIdentityActive("ninja")&&random()<player.classBurst){damage=Math.round(damage*1.6);burst="Perfect Ambush! ";}if(classIdentityActive("ceo")&&random()<player.classBurst){damage=Math.round(damage*1.55);player.gold+=5;burst="Quarterly Growth! ";}if(classIdentityActive("merchant")&&random()<player.classBurst){damage=Math.round(damage*1.6);player.gold+=10;burst="Excellent Margin! ";}if(player.combatAttackCount===0&&player.firstAttackBonus>0)damage=Math.round(damage*(1+player.firstAttackBonus));if(player.hp/player.maxHp<.5)damage=Math.round(damage*(1+player.berserk));if(echo)damage=Math.max(1,Math.round(damage*(player.echoDamageScale||.70)*(canCrit&&player.criticalEchoBonus?1+player.criticalEchoBonus:1)));const weapon=player.equipment?.weapon;if(weapon?.merchantWeapon)damage+=Math.floor(player.gold*(weapon.merchantWeaponScale||1));if(livingEnemies().length>=2&&player.packDamageBonus)damage=Math.round(damage*(1+player.packDamageBonus));damage=Math.round(damage*(chaos?.mult||1)*(1+player.damageBonus+(v19SetDamageBonus())));return {damage,burst};}
  async function performStrike(target,{echo=false,index=0,chaos=null,canCrit=true}={}){
    if(!target||target.hp<=0)target=livingEnemies()[0];if(!target)return {domain:"combat",type:"strike",dealt:0,crit:0,critTiers:0,elementDamage:0};
    const critTiers=window.DiceboundStrikePolicy.resolveCriticalTiers(rollTieredProc,{canCrit,critChance:player.crit,bonusCrit:chaos?.bonusCrit}),mode=critTiers?"crit":echo?"echo":"normal";await animateClassAttack(mode);const base=strikeBaseDamage(echo,chaos,{canCrit});let damage=base.damage;if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));if(target.affinity&&player.elementalEnemyDamage)damage=Math.round(damage*(1+player.elementalEnemyDamage));if(critTiers)damage*=1+critTiers;let dealt=damageEnemy(target,damage),executed=false;if(target.hp>0&&target.hp/target.maxHp<=.2&&player.execute){dealt+=target.hp;target.hp=0;executed=true;}if(target.hp<=0)db0648ReconcileDefeatedTarget(target,"strike");
    let poisonApplied=0;if(target.hp>0&&player.poisonOnHitChance&&random()<clamp(player.poisonOnHitChance,0,.95)){target.poisonStacks=(target.poisonStacks||0)+1;poisonApplied=1;playElementAnimation("nature",target,false);addCombatHistory(`${echo?`Echo ${index}`:"Attack"} applies 1 Poison stack to ${target.name}.`);}
    player.combatAttackCount++;const element=triggerStrikeElements(target,chaos),drainDamage=dealt+(element.totalDamage||0),heal=player.lifeSteal>0&&drainDamage>0?healPlayer(Math.max(1,Math.floor(drainDamage*player.lifeSteal))):0,label=echo?`Echo ${index}`:"Attack";
    const result={domain:"combat",type:"strike",label,echo,index,canCrit,dealt,crit:critTiers,critTiers,executed,heal,poisonApplied,elementDamage:element.totalDamage||0,elementMessage:element.message||"",burst:base.burst||"",targetName:target.name,targetHp:target.hp,presentationTarget:db0648PresentationTargetSnapshot()};DiceboundStateEvents.emit("combat:strike",result);CombatUI.renderStrike(result);await delay(460);return result;
  }

  async function playerAttack(){
    if(combatBusy||!currentEnemy)return;combatBusy=true;player.guardCooldown=0;const chaos=await rollD20Chaos("attack");updateCombatUI();const firstTarget=currentEnemy,echoes=rollTieredProc(player.doubleStrike)+(chaos.extraEcho||0);let totalCrit=0;
    const base=await performStrike(firstTarget,{echo:false,chaos});totalCrit+=base.crit;
    for(let i=1;i<=echoes&&livingEnemies().length;i++){const t=firstTarget.hp>0?firstTarget:(currentEnemy?.hp>0?currentEnemy:livingEnemies()[0]);const r=await performStrike(t,{echo:true,index:i,chaos,canCrit:false});totalCrit+=r.crit;}
    chargeUltimate(player.ultimateAttackGain+player.critUltimateGain*totalCrit);const pants=applyMythicPantsPulse();if(pants)setCombatText(pants);updateCombatUI();if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);
  }
  async function guardAction(){
    if(combatBusy||!currentEnemy||player.guardCooldown>0)return;combatBusy=true;const chaos=await rollD20Chaos("guard");player.guardCooldown=player.guardDelay;chargeUltimate(player.ultimateGuardGain);let notes=[`gain ${player.ultimateGuardGain} ultimate charge`];if(player.guardHeal>0){const h=healPlayer(player.guardHeal);if(h)notes.push(`restore ${h} HP`);}if(player.guardShield>0){player.combatShield+=player.guardShield;notes.push("raise a Battle Barrier");}if(player.guardCounter>0){const counter=damageEnemy(currentEnemy,Math.max(1,Math.round((player.attack+player.defense*player.defenseAttackScale)*player.guardCounter)));notes.push(`riposte for ${counter} damage`);}if(chaos.forceElement){const r=triggerElementEffect(chaos.forceElement,currentEnemy,{forced:true,source:"d20 guard"});if(r)notes.push(r.message);}if(chaos.allElements)DIBO_ELEMENTS.forEach(k=>triggerElementEffect(k,currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],{forced:true,source:"natural twenty guard"}));const pants=applyMythicPantsPulse();if(pants)notes.push(pants);updateCombatUI();setCombatText(`You brace yourself and ${notes.join(", ")}.`);tone(260,.12,"triangle",.03,180);await delay(620);if(!livingEnemies().length)return winCombat();await resolveEnemyResponse(true,(chaos.guardBonus||0));
  }
  async function usePotion(){
    if(combatBusy||!currentEnemy||player.potions<=0||player.hp>=player.maxHp)return;combatBusy=true;player.guardCooldown=0;const chaos=await rollD20Chaos("potion");player.potions--;const base=12+Math.floor(player.level/2),heal=healPlayer(Math.round(base*(1+player.potionPower)*(chaos.potionMult||1)));sfx.heal();let chaosText="";if(chaos.forceElement){const r=triggerElementEffect(chaos.forceElement,currentEnemy,{forced:true,source:"d20 potion"});if(r)chaosText=` ${r.message}`;}if(chaos.allElements)DIBO_ELEMENTS.forEach(k=>triggerElementEffect(k,currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],{forced:true,source:"natural twenty potion"}));const pants=applyMythicPantsPulse();setCombatText(`You drink a potion and restore ${heal} HP.${chaosText}${pants?` ${pants}`:""}`);updateCombatUI();await delay(630);await resolveEnemyResponse(false);
  }
  function usePotionOutsideCombat(){if(!gameStarted||rollLocked||currentEnemy||player.potions<=0||player.hp>=player.maxHp)return;player.potions--;const base=12+Math.floor(player.level/2),heal=healPlayer(Math.round(base*(1+player.potionPower)));sfx.heal();addLog(`You drink a potion on the road and restore <b>${heal} HP</b>.`);showToast(`+${heal} HP`);updateHUD();}

  function handlePlayerDeath(){
    if(player.revives>0){player.revives--;player.hp=Math.max(1,Math.ceil(player.maxHp*.5));combatBusy=false;sfx.holy();addLog("A <b>Phoenix Feather</b> drags you back from death.");setCombatText(`You revive at ${player.hp} HP. Phoenix feathers remaining: ${player.revives}.`);updateCombatUI();return;}
    loseGame();
  }

  function currentGoldSnapshot(){return DB_EFFECTIVE_STATS.goldSnapshot(player,{nightmare:nightmareMode});}
  function modifiedGold(base){return DB_EFFECTIVE_STATS.scaleGold(base,player,{nightmare:nightmareMode});}


  function grantXp(amount){const result=ProgressionState.grantXp(amount);ProgressionUI.render(result);return result;}
  function forceLevels(count){const result=ProgressionState.forceLevels(count);ProgressionUI.render(result);return result;}

  function recordRunBuff(icon,name,desc,rarity="special",source="Road"){
    if(!player.runBuffs)player.runBuffs=[];
    player.runBuffs.push({icon,name,desc,rarity,source});
  }
  function applyUpgrade(up,source="Powerup"){
    player.upgradeCounts=player.upgradeCounts||{};player.upgradeCounts[up.id]=(player.upgradeCounts[up.id]||0)+1;
    let copies=1,chaosNote="";
    if(classIdentityActive("d20")){
      const roll=rand(1,20);
      if(roll===1){const hurt=Math.max(1,Math.ceil(player.maxHp*.10));player.hp=Math.max(1,player.hp-hurt);chaosNote=`Powerup d20 rolled 1: the gift works, but probability bites for ${hurt} HP.`;}
      else if(roll<=4){player.gold=Math.max(0,player.gold-rand(0,12));chaosNote=`Powerup d20 rolled ${roll}: the gift works with a small financial anomaly.`;}
      else if(roll<=9){chaosNote=`Powerup d20 rolled ${roll}: the gift resolves normally.`;}
      else if(roll<=13){const stat=pick(["attack","defense","maxHp","crit","luck"]);if(stat==="attack")player.attack++;if(stat==="defense")player.defense++;if(stat==="maxHp"){player.maxHp+=5;player.hp+=5;}if(stat==="crit")player.crit+=.04;if(stat==="luck")player.luck+=.05;chaosNote=`Powerup d20 rolled ${roll}: normal gift plus a random ${stat} bonus.`;}
      else if(roll<=17){copies=up.unique?1:2;chaosNote=`Powerup d20 rolled ${roll}: probability duplicates the gift${up.unique?" into a safe bonus":""}.`;if(up.unique){player.ultimateCharge=clamp(player.ultimateCharge+25,0,100);}}
      else if(roll===18){copies=up.unique?1:2;player.potions+=2;chaosNote="Powerup d20 rolled 18: doubled gift and two potions.";}
      else if(roll===19){copies=up.unique?1:2;player.attack+=2;player.crit+=.10;chaosNote="Powerup d20 rolled 19: doubled gift, +2 Attack and +10% Crit.";}
      else{copies=up.unique?1:3;player.hp=player.maxHp;meta.petCookies=(meta.petCookies||0)+1;saveMeta();chaosNote=`NATURAL 20: ${up.unique?"the unique gift awakens":"the gift applies three times"}, full heal and +1 pet cookie.`;}
      addLog(`<b>Twenty-Sider powerup roll:</b> ${chaosNote}`);showToast(`🎲 ${chaosNote}`,3000,true);
    }
    for(let i=0;i<copies;i++)up.apply();checkDynamicClassUnlocks();recordRunBuff(up.icon,up.name,`${up.desc}${chaosNote?` · ${chaosNote}`:""}`,up.rarity,source);return up;
  }
  function weightedUpgrade(pool){
    const weighted=pool.map(up=>{
      let weight=rarityInfo[up.rarity].weight, luck=clamp(player.luck,0,1.5),depth=(boardLevel-1)+player.position/Math.max(1,currentTileCount()-1);
      if(up.rarity==="common")weight*=Math.max(.24,1-luck*.45-depth*.04);
      if(up.rarity==="uncommon")weight*=1+luck*.45+depth*.05;
      if(up.rarity==="rare")weight=(weight+Math.min(2.2,player.level*.07)+depth*.35)*(1+luck*2.8);
      if(up.rarity==="epic")weight=(weight+Math.min(.65,player.level*.018)+depth*.10)*(1+luck*4.2);
      if(up.rarity==="legendary")weight=(weight+Math.min(.08,player.level*.0015)+depth*.012)*(1+luck*6.2);
      return {up,weight};
    });
    const total=weighted.reduce((a,b)=>a+b.weight,0);let roll=random()*total;
    for(const entry of weighted){roll-=entry.weight;if(roll<=0)return entry.up;}
    return weighted[weighted.length-1].up;
  }
  function getUpgradeChoices(filter=()=>true){
    const pool=eligibleUpgrades(filter),choices=[];
    while(choices.length<3&&pool.length){const chosen=weightedUpgrade(pool);choices.push(chosen);pool.splice(pool.indexOf(chosen),1);}
    return choices;
  }
  function applyRandomHighRarity(source="Sealed Relic",announce=true){
    const pool=eligibleUpgrades(u=>u.rarity==="rare"||u.rarity==="epic");const up=pick(pool);applyUpgrade(up,source);if(announce){addLog(`A ${source.toLowerCase()} grants <b>${up.name}</b>.`);showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);}return up;
  }
  function openLevelUp(onComplete=null){
    sfx.level();$("levelSubtitle").textContent=pendingLevelUps>1?`Choose a powerup. ${pendingLevelUps} levels are waiting.`:"Choose one powerup for this run.";
    const grid=$("choiceGrid");grid.innerHTML="";
    getUpgradeChoices().forEach(up=>{
      const btn=document.createElement("button");btn.className=`choice-btn ${up.rarity}`;
      btn.innerHTML=`<span class="rarity-badge">${rarityInfo[up.rarity].label}</span><span class="choice-icon">${up.icon}</span><span class="choice-name">${up.name}</span><span class="choice-desc">${up.desc}</span>`;
      btn.addEventListener("click",()=>{applyUpgrade(up,"Level Up");pendingLevelUps--;addLog(`Level ${player.level}: gained <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);updateHUD();
        if(pendingLevelUps>0)openLevelUp(onComplete);else{$("levelOverlay").classList.add("hidden");if(onComplete)onComplete();else{rollLocked=false;updateHUD();}}});
      grid.appendChild(btn);
    });
    $("levelOverlay").classList.remove("hidden");
  }

  function showPowerupChoice(source,onComplete,filter=()=>true,subtitle="Choose one free rarity-based powerup. Your character level does not change."){
    $("powerupTitle").textContent=source;$("powerupSubtitle").textContent=subtitle;
    const grid=$("powerupGrid");grid.innerHTML="";
    getUpgradeChoices(filter).forEach(up=>{
      const btn=document.createElement("button");btn.className=`choice-btn ${up.rarity}`;
      btn.innerHTML=`<span class="rarity-badge">${rarityInfo[up.rarity].label}</span><span class="choice-icon">${up.icon}</span><span class="choice-name">${up.name}</span><span class="choice-desc">${up.desc}</span>`;
      btn.addEventListener("click",()=>{applyUpgrade(up,source);addLog(`<b>${source}:</b> gained ${up.name} (${rarityInfo[up.rarity].label}).`);showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);$("powerupOverlay").classList.add("hidden");updateHUD();onComplete();});
      grid.appendChild(btn);
    });
    $("powerupOverlay").classList.remove("hidden");
  }
  function showLegendaryChoice(source,onComplete){
    showPowerupChoice(source,onComplete,u=>u.rarity==="legendary","The miniboss yields. Choose one guaranteed Legendary powerup.");
  }
  function openFreePowerup(){
    showPowerupChoice("Power Shrine",()=>{tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);returnToRoad();});
    addLog("A <b>Power Shrine</b> offers a free gift.");
  }

  function openTreasure(){
    const base=rand(16,34)+Math.floor(player.position/3),gold=modifiedGold(base);player.gold+=gold;let extra="";
    if(random()<.34){player.potions++;extra=" and a potion";}
    tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);sfx.coin();addLog(`Found a chest with <b>${gold} gold</b>${extra}.`);showToast(`+${gold} gold${extra}`);updateHUD();
    const done=()=>{returnToRoad();};if(random()<.72)openLoot(generateEquipment(),done);else done();
  }
  function useCamp(){
    const heal=Math.max(1,Math.round(player.maxHp*.38)),actual=Math.min(heal,player.maxHp-player.hp);player.hp+=actual;
    tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);sfx.heal();addLog(`Rested by the fire and recovered <b>${actual} HP</b>.`);showToast(`Recovered ${actual} HP`);returnToRoad();
  }

  function openEvent(){
    $("eventOverlay").classList.remove("hidden");$("spinBtn").style.display="block";$("eventContinueBtn").style.display="none";$("slotResult").textContent="The machine waits...";
    [1,2,3].forEach(n=>{$(`reel${n}`).textContent="❔";$(`reel${n}`).classList.remove("spinning");});
  }
  function slotSymbolHTML(symbol){
    if(symbol!=="🪙")return symbol;
    const src=window.DiceboundAssets?.resolveUiIcon?.("coins")?.image||"assets/ui/icons/coins.png";
    return `<img class="slot-coin-art" src="${src}" alt="Gold coins">`;
  }
  function setSlotReelSymbol(reel,symbol){if(reel)reel.innerHTML=slotSymbolHTML(symbol);}
  function generateSlotResult(){
    const symbols=["⚔️","❤️","🪙","🛡️","⭐","💀"],first=pick(symbols),odds=window.DiceboundEventRewards.slotMatchOdds(player.luck);
    const second=random()<odds.secondMatch?first:pick(symbols);let third;
    if(second===first)third=random()<odds.tripleFromPair?first:pick(symbols);else third=random()<odds.pairFromMiss?second:pick(symbols);
    return [first,second,third];
  }
  async function spinEvent(){
    const btn=$("spinBtn");btn.disabled=true;const reels=[$("reel1"),$("reel2"),$("reel3")];reels.forEach(r=>r.classList.add("spinning"));const symbols=["⚔️","❤️","🪙","🛡️","⭐","💀"];
    for(let i=0;i<18;i++){reels.forEach((r,j)=>{if(i<12+j*3)setSlotReelSymbol(r,pick(symbols));});tone(220+i*12,.03,"square",.012);await delay(60+i*5);}
    const result=generateSlotResult();for(let i=0;i<3;i++){setSlotReelSymbol(reels[i],result[i]);reels[i].classList.remove("spinning");tone(480+i*110,.08,"triangle",.025);await delay(180);}
    applySlotReward(result);tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);btn.style.display="none";$("eventContinueBtn").style.display="block";btn.disabled=false;updateHUD();
  }
  function applySlotReward(result){
    const counts={};result.forEach(s=>counts[s]=(counts[s]||0)+1);const triple=Object.keys(counts).find(k=>counts[k]===3),pair=Object.keys(counts).find(k=>counts[k]===2);let text="";
    if(triple){
      switch(triple){
        case "⚔️":player.attack+=3;text="Jackpot! +3 attack permanently.";break;
        case "❤️":player.maxHp+=12;player.hp=Math.min(player.maxHp,player.hp+12);text="Jackpot! +12 max HP and heal 12.";break;
        case "🪙":{const g=modifiedGold(80);player.gold+=g;text=`Jackpot! +${g} gold.`;break;}
        case "🛡️":player.defense+=2;text="Jackpot! +2 defense permanently.";break;
        case "⭐":player.attack+=3;player.maxHp+=10;player.hp+=10;player.crit+=.07;text="Legendary jackpot! +3 attack, +10 max HP and +7% crit.";break;
        case "💀":{const loss=Math.max(1,Math.floor(player.hp*.28));player.hp=Math.max(1,player.hp-loss);text=`Triple skulls! You lose ${loss} HP.`;break;}
      }sfx.level();
    }else if(pair){
      switch(pair){
        case "⚔️":player.attack+=1;text="Two swords: +1 attack permanently.";break;
        case "❤️":{const heal=Math.min(player.maxHp-player.hp,12);player.hp+=heal;text=`Two hearts: heal ${heal} HP.`;break;}
        case "🪙":{const g=modifiedGold(30);player.gold+=g;text=`Two coins: +${g} gold.`;break;}
        case "🛡️":player.flatReduction+=1;text="Two shields: reduce incoming damage by 1.";break;
        case "⭐":player.crit+=.05;text="Two stars: +5% critical chance.";break;
        case "💀":{const loss=Math.max(1,Math.floor(player.hp*.12));player.hp=Math.max(1,player.hp-loss);text=`Two skulls: lose ${loss} HP.`;break;}
      }tone(650,.15,"triangle",.04,950);
    }else{const consolation=modifiedGold(9);player.gold+=consolation;text=`No match. The machine spits out ${consolation} consolation gold.`;sfx.coin();}
    const cookieChance=.09+gameplayTalentRank("fortune_cookie")*.02;
    if(random()<cookieChance){meta.petCookies++;saveMeta();text+=` A rare pet cookie drops from the machine!`;showToast("🍪 Pet cookie found!");}
    $("slotResult").textContent=text;addLog(`<b>Event:</b> ${text}`);updateMetaUI();
  }

  const wheelRewards=[
    {icon:"🪙",name:"Golden Rain",apply(){const g=modifiedGold(70);player.gold+=g;return `The wheel grants ${g} gold.`;}},
    {icon:"❤️",name:"Restoration",apply(){const heal=Math.min(player.maxHp-player.hp,Math.ceil(player.maxHp*.55));player.hp+=heal;return `The wheel restores ${heal} HP.`;}},
    {icon:"🍪",name:"Companion Cookie",apply(){meta.petCookies++;saveMeta();return `A permanent pet cookie drops for ${activePetDef().name}.`;}},
    {icon:"⚔️",name:"Sharpened Fate",apply(){player.attack+=2;return "Gain +2 attack for this run.";}},
    {icon:"🎁",name:"Rare Gift",apply(){const up=applyRandomHighRarity();return `The wheel reveals ${rarityInfo[up.rarity].label} ${up.name}: ${up.desc}`;}},
    {icon:"🧪",name:"Alchemist's Bundle",apply(){player.potions+=3;return "Gain 3 potions.";}},
    {icon:"⭐",name:"Lucky Star",apply(){player.crit+=.08;player.luck+=.08;return "Gain +8% crit and +8 Luck.";}},
    {icon:"💀",name:"Cruel Turn",apply(){const loss=Math.max(1,Math.floor(player.hp*.18));player.hp=Math.max(1,player.hp-loss);return `The wheel takes ${loss} HP.`;}}
  ];
  function openWheelEvent(){
    syncWheelIcons();wheelBusy=false;$("wheelOverlay").classList.remove("hidden");$("wheelSpinBtn").style.display="block";$("wheelContinueBtn").style.display="none";$("wheelResult").textContent="The wheel waits for a victim.";addLog("You find the <b>Wheel of Fortune</b>.");
  }
  function syncWheelIcons(){
    [...$("fortuneWheel").querySelectorAll("span")].forEach((el,i)=>{if(wheelRewards[i])el.textContent=wheelRewards[i].icon;});
  }
  async function spinFortuneWheel(){
    if(wheelBusy)return;wheelBusy=true;$("wheelSpinBtn").disabled=true;const index=rand(0,wheelRewards.length-1),reward=wheelRewards[index];
    const current=((wheelRotation%360)+360)%360,target=((360-(index*45+22.5))%360+360)%360,delta=1440+((target-current+360)%360);
    wheelRotation+=delta;$("fortuneWheel").style.transform=`rotate(${wheelRotation}deg)`;sfx.roll();await delay(2850);
    const result=reward.apply();$("wheelResult").textContent=`${reward.icon} ${reward.name}: ${result}`;addLog(`<b>Wheel:</b> ${reward.name} — ${result}`);showToast(reward.name);sfx.level();
    tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);$("wheelSpinBtn").style.display="none";$("wheelContinueBtn").style.display="block";$("wheelSpinBtn").disabled=false;updateHUD();
  }


  function renderMerchant(){
    $("merchantGold").textContent=player.gold;const notice=$("merchantNotice");notice.classList.toggle("show",!!currentMerchantNotice);notice.innerHTML=currentMerchantNotice;
    const grid=$("shopGrid");grid.innerHTML="";
    currentMerchantItems.forEach(item=>{
      const price=merchantPrice(item.base),btn=document.createElement("button");btn.className=`shop-item${item.sold?" sold":""}`;btn.disabled=item.sold||player.gold<price;
      const comparison=item.gear?`<div class="shop-compare">${formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:"";
      btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${item.sold?"SOLD":price+"g"}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;
      btn.addEventListener("click",()=>{if(item.sold||player.gold<price)return;if(item.gear){const current=player.equipment[item.gear.slot];if(current&&gearPowerScore(item.gear)<gearPowerScore(current)&&!window.DiceboundPlatform.confirm(`${item.gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`))return;}player.gold-=price;const result=item.buy();item.sold=true;sfx.coin();
        if(item.id==="relic"&&result)currentMerchantNotice=`🔮 <b>Sealed Relic opened:</b> ${rarityInfo[result.rarity].label} <b>${result.name}</b><br>${result.desc}`;
        else if(item.gear)currentMerchantNotice=`🧰 Equipped <b>${item.gear.name}</b>.<br>${formatBonuses(item.gear)}`;
        if(["attack","armor","charm"].includes(item.id))recordRunBuff(item.icon,item.name,item.desc,"merchant","Merchant");
        addLog(`Bought <b>${item.name}</b> for ${price} gold.`);showToast(item.id==="relic"&&result?`${rarityInfo[result.rarity].label}: ${result.name}`:item.name);updateHUD();renderMerchant();});grid.appendChild(btn);
    });
  }

  const blessingPool=[
    {icon:"🌟",name:"Divine Ascension",description(){const n=5+player.blessingBonus;return `Instantly gain ${n} levels and choose ${n} powerups`+(player.blessingBonus?` (Favored Mortal total bonus: +${player.blessingBonus} level${player.blessingBonus===1?"":"s"} and +${player.blessingBonus} choice${player.blessingBonus===1?"":"s"}).`:".");},apply(){forceLevels(5+player.blessingBonus);}},
    {icon:"⚔️",name:"Avatar of War",description(){const atk=8+player.blessingBonus*2,hp=25+player.blessingBonus*8;return `Gain +${atk} attack, +2 defense, +${hp} max HP and heal fully`+(player.blessingBonus?` (Favored Mortal total bonus: +${player.blessingBonus*2} attack and +${player.blessingBonus*8} max HP).`:".");},apply(){player.attack+=8+player.blessingBonus*2;player.defense+=2;player.maxHp+=25+player.blessingBonus*8;player.hp=player.maxHp;}},
    {icon:"💰",name:"Saint of Fortune",description(){const gold=150+player.blessingBonus*50,pots=2+player.blessingBonus;return `Gain ${gold} gold, +15% crit, +25 Luck and ${pots} potions`+(player.blessingBonus?` (Favored Mortal total bonus: +${player.blessingBonus*50} gold and +${player.blessingBonus} potion${player.blessingBonus===1?"":"s"}).`:".");},apply(){player.gold+=modifiedGold(150+player.blessingBonus*50);player.crit+=.15;player.luck+=.25;player.potions+=2+player.blessingBonus;}},
    {icon:"🪽",name:"Seraph's Aegis",description(){const revives=2+player.blessingBonus,reduction=2+player.blessingBonus;return `Gain ${revives} revives, block the first hit of every battle and reduce damage by ${reduction}`+(player.blessingBonus?` (Favored Mortal adds +${player.blessingBonus} revive${player.blessingBonus===1?"":"s"} and +${player.blessingBonus} flat damage reduction).`:".");},apply(){player.revives+=2+player.blessingBonus;player.firstHitBlocks+=1;player.flatReduction+=2+player.blessingBonus;}},
    {icon:"🌌",name:"Miracle Engine",description(){const n=3+player.blessingBonus;return `Receive ${n} random Rare or Epic powerups immediately. Every granted buff will be listed by name`+(player.blessingBonus?` (Favored Mortal total bonus: +${player.blessingBonus} powerup${player.blessingBonus===1?"":"s"}).`:".");},apply(){const gifts=[];for(let i=0;i<3+player.blessingBonus;i++)gifts.push(applyRandomHighRarity("Miracle Engine",false));return gifts;}}
  ];

  function openBlessing(){
    sfx.holy();const choices=[];while(choices.length<3){const b=pick(blessingPool);if(!choices.includes(b))choices.push(b);}const grid=$("blessingGrid");grid.innerHTML="";
    choices.forEach(blessing=>{const btn=document.createElement("button");btn.className="blessing-btn";btn.innerHTML=`<span class="blessing-icon">${blessing.icon}</span><span class="blessing-name">${blessing.name}</span><span class="blessing-desc">${blessing.description()}</span>`;
      btn.addEventListener("click",()=>{const result=blessing.apply();recordRunBuff(blessing.icon,blessing.name,blessing.description(),"divine","Blessing from God");tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);$("blessingOverlay").classList.add("hidden");addLog(`Received the divine blessing <b>${blessing.name}</b>.`);if(Array.isArray(result)&&result.length){const names=result.map(up=>`${rarityInfo[up.rarity].label} ${up.name}`).join(", ");addLog(`<b>Miracle Engine granted:</b> ${names}.`);showToast(`Miracle: ${result.map(up=>up.name).join(" · ")}`);}else showToast(blessing.name);updateHUD();returnToRoad();});grid.appendChild(btn);});
    $("blessingOverlay").classList.remove("hidden");addLog("You step into a <b>Blessing from God</b>.");
  }

  function clearMysticTile(){tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);$("mysticOverlay").classList.add("hidden");currentMysticBuff=null;returnToRoad();}
  function openMystic(){
    currentMysticBuff=pick(eligibleUpgrades(u=>u.rarity==="legendary"));
    $("mysticOffer").innerHTML=`<div class="loot-top"><div class="loot-icon">${currentMysticBuff.icon}</div><div><div class="rarity-badge">Legendary</div><div class="loot-name">${currentMysticBuff.name}</div></div></div><div class="loot-bonuses">${currentMysticBuff.desc}</div>`;
    $("mysticOverlay").classList.remove("hidden");addLog("A hooded <b>Mystic</b> offers forbidden power.");
  }

  function grantLegacyXp(amount){
    meta.xp+=amount;
    while(meta.xp>=meta.xpNext){meta.xp-=meta.xpNext;meta.level++;meta.points++;meta.xpNext=legacyXpForLevel(meta.level);}
  }
  function finalizeRun(){
    if(runFinalized)return lastLegacyAward;runFinalized=true;
    const travelAward=Math.max(0,Math.round(tilesMovedThisRun*(1+player.legacyXpBonus)));lastGoldLegacyAward=Math.max(0,Math.floor(player.gold/10));lastLegacyAward=(travelAward+lastGoldLegacyAward)*(nightmareMode?5:1);
    meta.runs++;meta.bestTiles=Math.max(meta.bestTiles,tilesMovedThisRun);grantLegacyXp(lastLegacyAward);saveMeta();updateMetaUI();return lastLegacyAward;
  }
  function allocatedTalentPoints(){return talents.reduce((sum,t)=>sum+talentRank(t.id)*t.cost,0);}

  function talentAvailable(t){return (t.requires||[]).every(r=>talentRank(r.id)>=r.rank);}
  function requirementText(t){return (t.requires||[]).map(r=>{const node=talents.find(x=>x.id===r.id);return `${node?node.name:r.id} rank ${r.rank}`;}).join(" + ");}
  function purchaseTalentNode(id){
    const t=talents.find(node=>node.id===id),rank=talentRank(id);
    if(!t||rank>=t.maxRank||!talentAvailable(t)||meta.points<t.cost)return false;
    meta.points-=t.cost;meta.purchased[t.id]=rank+1;saveMeta();sfx.level();showToast(`${t.name} rank ${rank+1} · activates next run`);
    renderTalents();return true;
  }
  // The extracted owner renders and navigates the Talent destination. These
  // adapters remain because existing lifecycle/composition callers still use
  // the historical function names.
  function renderTalents(){return window.DiceboundTalentTree?.render?.()||null;}
  function openTalentTree(returnOverlay=null){return window.DiceboundTalentTree?.open?.(returnOverlay)||null;}

  // #206 / #209: Pet chooser DOM, portrait presentation and persistent Done
  // chrome live in ui/pet-chooser.js. Historical lifecycle callers retain this
  // one forwarding name while pet mechanics remain in this composition layer.
  function renderPetCollection(){return window.DiceboundPetChooser?.render?.()||null;}
  function feedActivePet(count=1){const state=activePetState(),def=activePetDef(),actual=Math.min(count,meta.petCookies);if(actual<=0)return;meta.petCookies-=actual;state.xp+=actual*(1+player.cookieBondBonus);let levels=0;while(state.xp>=state.xpNext){state.xp-=state.xpNext;state.level++;state.xpNext=2+Math.floor(state.level*.7);levels++;}saveMeta();checkDynamicClassUnlocks();levels?sfx.level():sfx.coin();showToast(levels?`${def.name} gained ${levels} level${levels===1?"":"s"}!`:`${def.name} ate ${actual} cookie${actual===1?"":"s"}`);updateMetaUI();}

  function renderRunBuffs(){
    const grid=$("buffGrid");grid.innerHTML="";const cls=CLASSES[player.classId],gold=currentGoldSnapshot();
    const addCard=(title,body)=>{const card=document.createElement("div");card.className="buff-card";card.innerHTML=`<h3>${title}</h3>${body}`;grid.appendChild(card);};
    addCard(`${cls.icon} ${cls.name} traits`,`<p>${cls.desc}<br><strong>Ultimate:</strong> ${cls.ultimate.name} — ${describeCurrentUltimate(player.classId)}</p>`);
    const mods=[];
    const push=(label,value)=>{if(value)mods.push(`<strong>${label}:</strong> ${value}`);};
    push("Damage reduction",player.flatReduction);push("Effective Dodge",`${Math.round(effectiveDodgeChance()*100)}% (${Math.round(rawDodgeChance()*100)} raw before diminishing returns)`);push("Revives",player.revives);push("Thorns",player.thorns);push("First-hit barriers",player.firstHitBlocks);push("Post-victory healing",player.postFightHeal);
    mods.push(`<span class="effective-gold-line" tabindex="0" data-effective-gold-container data-tip="${gold.description}" title="${gold.description}"><strong>Gold gain:</strong> <span data-effective-gold>${gold.label}</span></span>`);push("Enemy XP bonus",player.xpBonus?`${Math.round(player.xpBonus*100)}%`:0);push("Boss Damage",player.bossDamage?`${Math.round(player.bossDamage*100)}%`:0);push("Luck",player.luck?Math.round(player.luck*100):0);
    push("Potion healing bonus",player.potionPower?`${Math.round(player.potionPower*100)}%`:0);push("Extra-step chance",player.extraStepChance?`${Math.round(player.extraStepChance*100)}%`:0);push("Ultimate damage",player.ultimateDamageBonus?`+${Math.round(player.ultimateDamageBonus*100)}%`:0);
    push("Ultimate charge",`${player.ultimateAttackGain} attack / ${player.ultimateGuardGain} defend`);push("Pet double attack",player.petDoubleChance?`${Math.round(player.petDoubleChance*100)}%`:0);push("Element proc bonus",player.elementProcBonus?`${Math.round(player.elementProcBonus*100)}%`:0);push("Element power",player.elementDamageBonus?`+${Math.round(player.elementDamageBonus*100)}%`:0);push("Weakness element power",player.weaknessElementBonus?`+${Math.round(player.weaknessElementBonus*100)}%`:0);push("Element echo",player.elementEchoChance?`${Math.round(player.elementEchoChance*100)}%`:0);push("Choose-die chance",player.diceChoiceChance?`${Math.round(player.diceChoiceChance*100)}%`:0);push("Active pet",`${activePetDef().icon} ${activePetDef().name} · ${petDamage()} damage`);push("Overflow scaling","Crit and Echo above 100% create guaranteed additional tiers, with the remainder as the chance for another tier.");
    addCard("📊 Active modifiers",`<p>${mods.length?mods.join("<br>"):"No additional modifiers yet."}</p>`);
    const gear=EQUIPMENT_SLOTS.map(slot=>player.equipment[slot]).filter(Boolean);
    addCard("🧰 Equipment",`<p>${gear.length?gear.map(i=>`<strong>${i.icon} ${i.name}</strong> — ${formatBonuses(i)}`).join("<br>"):"No equipment currently worn."}</p>${mythicalSetCount()>0?`<div class="mythic-set-box"><strong>🌈 Impossible Road set</strong><br>${mythicalSetSummary()}</div>`:""}`);
    const list=document.createElement("div");list.className="buff-card";list.style.gridColumn="1/-1";list.innerHTML=`<h3>✨ Acquired powers this run</h3><div class="buff-list">${(player.runBuffs||[]).length?player.runBuffs.map(b=>`<div class="buff-entry"><b>${b.icon} ${b.name}</b> · ${b.source}<br>${b.desc}</div>`).join(""):'<div class="buff-entry">No selected powerups yet.</div>'}</div>`;grid.appendChild(list);
  }
  function openRunBuffs(){if(!gameStarted)return;renderRunBuffs();$("buffOverlay").classList.remove("hidden");}


  function renderEndGear(){
    return dbEquipmentUi.renderEndGear();
  }
  function openDebugMenu(){$("debugOverlay").classList.remove("hidden");}


  function loseGame(){sfx.lose();$("combatOverlay").classList.add("hidden");showEnd(false);}




  /* SEMANTIC OWNER — Class/content expansion, powerups and equipment definitions. Migrated from the retired Alpha legacy stack in 3.1.6. */
  /* ---------- v13: Blood & Fortune systems expansion ---------- */
  Object.assign(CLASSES,{
    vampire:{id:"vampire",name:"Vampire",icon:"🧛",attackIcon:"🦇",fxIcon:"🩸🦇",unlock:"Reach more than 100% Lifesteal during a run",desc:"A blood-drinking duelist whose attacks feed its health and whose ultimate drains the entire pack.",stats:"36 HP · 7 ATK · 18% LIFESTEAL",ultimate:{name:"Crimson Eclipse",icon:"🌑",desc:"Drain the entire pack for heavy damage and heal for 50% of damage dealt."},base:{maxHp:36,attack:7,defense:1,crit:.09,dodge:.03,luck:.02,doubleStrike:.04,guardPower:.56,classBurst:.16,lifeSteal:.18}},
    ninja:{id:"ninja",name:"Ninja",icon:"🥷",attackIcon:"🗡️",fxIcon:"✦🗡️",unlock:"Reach more than 100% Critical chance during a run",desc:"A precision assassin built around overflow critical tiers, smoke and rapid single-target execution.",stats:"29 HP · 8 ATK · 28% CRIT · 12% DODGE",ultimate:{name:"Thousand Shadows",icon:"🌘",desc:"Five independently critical strikes against the selected enemy, spilling to new targets on defeat."},base:{maxHp:29,attack:8,defense:0,crit:.28,dodge:.12,luck:.03,doubleStrike:.12,guardPower:.50,classBurst:.22,lifeSteal:0}},
    ceo:{id:"ceo",secret:true,name:"CEO",icon:"👔",attackIcon:"📈",fxIcon:"📊💥",unlock:"Secret: reach 300% Boss Damage",desc:"The hidden executive class converts ruthless guardian specialization into hostile quarterly growth.",stats:"40 HP · 9 ATK · 35% BOSS DAMAGE",ultimate:{name:"Quarterly Annihilation",icon:"📉",desc:"A boardroom-wide attack scaling with Boss Damage and current gold."},base:{maxHp:40,attack:9,defense:2,crit:.12,dodge:.02,luck:.10,doubleStrike:.05,guardPower:.60,classBurst:.20,lifeSteal:.05,bossDamage:.35}},
    merchant:{id:"merchant",secret:true,name:"Merchant",icon:"🧔",attackIcon:"💰",fxIcon:"🪙⚖️",unlock:"Secret: defeat the Road Merchant five times",desc:"A scandalously strong trader who converts gold into damage and buys reality wholesale.",stats:"45 HP · 10 ATK · 20 LUCK · GOLD SCALING",ultimate:{name:"Market Monopoly",icon:"🏦",desc:"Deals massive pack damage, grants gold and raises two barriers."},base:{maxHp:45,attack:10,defense:3,crit:.15,dodge:.05,luck:.20,doubleStrike:.10,guardPower:.66,classBurst:.22,lifeSteal:.08}}
  });
  CLASSES.d20.secret=true;
  const PUBLIC_SLIME_EXEMPT=new Set(["slime","d20","ceo","merchant"]);
  Object.assign(gearNames.weapon,{vampire:["Sanguine Rapier","Nightfang","Blood Chalice Blade"],ninja:["Moon Kunai","Silent Katana","Storm Shuriken"],ceo:["Executive Pen","Hostile Takeover Briefcase","Quarterly Cleaver"],merchant:["Golden Abacus","Coinblade","Ledger of Ruin"]});
  Object.assign(gearNames.offhand,{vampire:["Blood Goblet","Batwing Mantle"],ninja:["Smoke Bomb Satchel","Shadow Scroll"],ceo:["Expense Account","Golden Parachute"],merchant:["Bottomless Purse","Portable Stall"]});
  for(const slot of ["boots","legs","chest","hat","ring","amulet"]){gearNames[slot]=gearNames[slot]||{};gearNames[slot].vampire=[`Bloodbound ${SLOT_LABELS[slot]}`];gearNames[slot].ninja=[`Shadow ${SLOT_LABELS[slot]}`];gearNames[slot].ceo=[`Executive ${SLOT_LABELS[slot]}`];gearNames[slot].merchant=[`Gilded ${SLOT_LABELS[slot]}`];}
  const evasive=upgrades.find(u=>u.id==="evasive_bulwark");if(evasive){evasive.unique=true;evasive.desc="Unique: every point of Defense adds 1 raw Dodge point before diminishing returns.";}
  upgrades.push(
    {id:"vampire_void_affinity",classId:"vampire",rarity:"uncommon",icon:"🕳️",name:"Night's Hunger",desc:"Stackable: +10% chance for attacks to activate Black Hole.",apply(){player.classElementProcs.void=(player.classElementProcs.void||0)+.10;}},
    {id:"vampire_blood_moon",classId:"vampire",rarity:"legendary",icon:"🌑🩸",name:"Blood Moon",desc:"Gain +30% Lifesteal; overhealing becomes up to 20 temporary max HP for the battle.",apply(){player.lifeSteal+=.30;player.bloodOverheal=true;}},
    {id:"ninja_electric_affinity",classId:"ninja",rarity:"uncommon",icon:"⚡",name:"Lightning Step",desc:"Stackable: +10% chance for attacks to activate Thunderbolt.",apply(){player.classElementProcs.electric=(player.classElementProcs.electric||0)+.10;}},
    {id:"ninja_shadow_clone",classId:"ninja",rarity:"legendary",icon:"🥷🥷",name:"Shadow Parliament",desc:"Gain +35% Crit and +25% Echo Strike. Critical Echoes gain another +25% damage.",apply(){player.crit+=.35;player.doubleStrike+=.25;player.criticalEchoBonus=(player.criticalEchoBonus||0)+.25;}},
    {id:"ceo_tech_affinity",classId:"ceo",rarity:"uncommon",icon:"🤖",name:"Automated Workforce",desc:"Stackable: +10% chance for attacks to activate Brain Hack.",apply(){player.classElementProcs.tech=(player.classElementProcs.tech||0)+.10;}},
    {id:"merchant_coffee_affinity",classId:"merchant",rarity:"uncommon",icon:"☕",name:"Open All Hours",desc:"Stackable: +10% chance for attacks to activate Caffeinated Haste.",apply(){player.classElementProcs.coffee=(player.classElementProcs.coffee||0)+.10;}},
    {id:"legendary_worldheart",rarity:"legendary",unique:true,icon:"🌍",name:"Worldheart",desc:"Gain +35 max HP, +4 defense and heal fully.",apply(){player.maxHp+=35;player.hp=player.maxHp;player.defense+=4;}},
    {id:"legendary_echo_crown",rarity:"legendary",unique:true,icon:"👑↯",name:"Crown of Repetition",desc:"Gain +45% Echo Strike and Echo Strikes deal 20% more damage.",apply(){player.doubleStrike+=.45;player.echoDamageScale=Math.max(player.echoDamageScale||.70,.90);}},
    {id:"legendary_prismatic",rarity:"legendary",unique:true,icon:"🌈",name:"Prismatic Sovereignty",desc:"Gain +20% elemental activation and +35% elemental power.",apply(){player.elementProcBonus+=.20;player.elementDamageBonus+=.35;}},
    {id:"legendary_blood_contract",rarity:"legendary",unique:true,icon:"📜🩸",name:"Blood Contract",desc:"Gain +35% Lifesteal and +25% Boss Damage, but lose 15 max HP.",apply(){player.lifeSteal+=.35;player.bossDamage+=.25;player.maxHp=Math.max(1,player.maxHp-15);player.hp=Math.min(player.hp,player.maxHp);}},
    {id:"legendary_loaded_road",rarity:"legendary",unique:true,icon:"🎲✨",name:"The Road Is Loaded",desc:"Every natural six grants an additional 15 Fast Travel XP and +20 ultimate charge.",apply(){player.loadedSix=true;}},
    {id:"legendary_packbreaker",rarity:"legendary",unique:true,icon:"👹💥",name:"Packbreaker",desc:"Deal +30% damage while two or more enemies remain alive.",apply(){player.packDamageBonus=.30;}},
    {id:"legendary_second_sun",rarity:"legendary",unique:true,icon:"☀️☀️",name:"Second Sun",desc:"The first time you would die each board, survive at 1 HP and unleash Holy on the pack.",apply(){player.secondSun=true;player.secondSunUsedBoards=player.secondSunUsedBoards||{};}},
    {id:"legendary_golden_law",rarity:"legendary",unique:true,icon:"⚖️🪙",name:"Golden Law",desc:"Gain +100% gold and every 100 gold grants +1 attack for this run.",apply(){player.goldBonus+=1;player.goldAttackScale=.01;}}
  );


  /* v14: broader Rare pool and deeper class identities */
  upgrades.push(
    {id:"rare_glass_needle",rarity:"rare",icon:"🪡",name:"Glass Needle",desc:"Gain +18% Crit and +2 Attack, but lose 6 max HP.",apply(){player.crit+=.18;player.attack+=2;player.maxHp=Math.max(1,player.maxHp-6);player.hp=Math.min(player.hp,player.maxHp);}},
    {id:"rare_echo_chamber",rarity:"rare",icon:"🔊",name:"Echo Chamber",desc:"Gain +24% Echo Strike; Echoes deal 5% more damage.",apply(){player.doubleStrike+=.24;player.echoDamageScale=Math.min(1.2,(player.echoDamageScale||.70)+.05);}},
    {id:"rare_dragon_mark",rarity:"rare",icon:"🐉",name:"Dragon Mark",desc:"Gain +25% Boss Damage and +2 Attack.",apply(){player.bossDamage+=.25;player.attack+=2;}},
    {id:"rare_stormstep",rarity:"rare",icon:"🌩️",name:"Stormstep",desc:"Gain +9% raw Dodge and +10 Luck.",apply(){player.dodge+=.09;player.luck+=.10;}},
    {id:"rare_prism_lens",rarity:"rare",icon:"🔍🌈",name:"Prism Lens",desc:"Gain +10% elemental activation and +18% elemental power.",apply(){player.elementProcBonus+=.10;player.elementDamageBonus+=.18;}},
    {id:"rare_pack_hunter",rarity:"rare",icon:"👹🎯",name:"Pack Hunter",desc:"Deal +18% damage while at least two enemies remain.",apply(){player.packDamageBonus=(player.packDamageBonus||0)+.18;}},
    {id:"rare_ultimate_vessel",rarity:"rare",icon:"💜",name:"Ultimate Vessel",desc:"Gain 35 ultimate immediately and +10% ultimate damage.",apply(){player.ultimateCharge=clamp(player.ultimateCharge+35,0,100);player.ultimateDamageBonus+=.10;}},
    {id:"rare_red_flask",rarity:"rare",icon:"🧪🩸",name:"Red Flask",desc:"Gain +16% Lifesteal and two potions.",apply(){player.lifeSteal+=.16;player.potions+=2;}},

    {id:"fighter_battering_line",classId:"fighter",rarity:"rare",icon:"🛡️💥",name:"Battering Line",desc:"Basic attacks gain 35% of Defense as damage and guarding grants +5 ultimate.",apply(){player.defenseAttackScale+=.35;player.ultimateGuardGain+=5;}},
    {id:"fighter_iron_command",classId:"fighter",rarity:"epic",icon:"⚔️🏰",name:"Iron Command",desc:"Gain +4 Defense; Titan Cleave grants one additional barrier.",apply(){player.defense+=4;player.titanCleaveBarrierBonus=(player.titanCleaveBarrierBonus||0)+1;}},
    {id:"ranger_thorn_volley",classId:"ranger",rarity:"rare",icon:"🌿🏹",name:"Thorn Volley",desc:"Gain +14% Crit and +14% Nature activation.",apply(){player.crit+=.14;player.classElementProcs.nature=(player.classElementProcs.nature||0)+.14;}},
    {id:"ranger_high_ground",classId:"ranger",rarity:"epic",icon:"🦅",name:"High Ground",desc:"First attacks deal 80% more damage and gain +12% Echo Strike.",apply(){player.firstAttackBonus+=.80;player.doubleStrike+=.12;}},
    {id:"sorcerer_mana_fracture",classId:"sorcerer",rarity:"rare",icon:"🔮💥",name:"Mana Fracture",desc:"Gain +18% Arcane Surge chance and +12% elemental power.",apply(){player.classBurst+=.18;player.elementDamageBonus+=.12;}},
    {id:"sorcerer_gravity_well",classId:"sorcerer",rarity:"epic",icon:"🕳️☄️",name:"Gravity Well",desc:"Gain +20% Void activation and +25% Boss Damage.",apply(){player.classElementProcs.void=(player.classElementProcs.void||0)+.20;player.bossDamage+=.25;}},
    {id:"monk_afterimage",classId:"monk",rarity:"rare",icon:"🥋💨",name:"Afterimage Kata",desc:"Gain +16% Echo Strike and +7% raw Dodge.",apply(){player.doubleStrike+=.16;player.dodge+=.07;}},
    {id:"monk_perfect_form",classId:"monk",rarity:"epic",icon:"☯️",name:"Perfect Form",desc:"Gain +3 Attack, +3 Defense and +15 ultimate from every Guard.",apply(){player.attack+=3;player.defense+=3;player.ultimateGuardGain+=15;}},
    {id:"clown_banana_law",classId:"clown",rarity:"rare",icon:"🍌",name:"Banana-Peel Law",desc:"Gain +18 Luck and +10% Dodge. This is apparently jurisprudence.",apply(){player.luck+=.18;player.dodge+=.10;}},
    {id:"clown_three_ring",classId:"clown",rarity:"epic",icon:"🎪🎪🎪",name:"Three-Ring Disaster",desc:"Gain +15% Crit, +15% Echo and +0.5% Prismatic Accident.",apply(){player.crit+=.15;player.doubleStrike+=.15;player.omniElementChance=(player.omniElementChance||0)+.005;}},
    {id:"rouge_carmine_veins",classId:"rouge",rarity:"rare",icon:"🌹🩸",name:"Carmine Veins",desc:"Gain +20% Lifesteal and +10% Crit.",apply(){player.lifeSteal+=.20;player.crit+=.10;}},
    {id:"rouge_masterpiece",classId:"rouge",rarity:"epic",icon:"🖼️",name:"Final Masterpiece",desc:"Gain +3 Attack, +18% Boss Damage and +12% Echo Strike.",apply(){player.attack+=3;player.bossDamage+=.18;player.doubleStrike+=.12;}},
    {id:"berserker_blood_roar",classId:"berserker",rarity:"rare",icon:"🩸📣",name:"Blood Roar",desc:"Gain +5 Attack while below half HP and +12% Lifesteal.",apply(){player.berserk+=.55;player.lifeSteal+=.12;}},
    {id:"berserker_unbroken",classId:"berserker",rarity:"epic",icon:"🪓🔥",name:"Unbroken Rampage",desc:"Gain +25 max HP, +20% Echo Strike and one revive.",apply(){player.maxHp+=25;player.hp+=25;player.doubleStrike+=.20;player.revives+=1;}},
    {id:"turtle_shell_memory",classId:"turtle",rarity:"rare",icon:"🐢🧠",name:"Shell Memory",desc:"Gain +5 Defense and heal 3 HP after victories.",apply(){player.defense+=5;player.postFightHeal+=3;}},
    {id:"turtle_continental",classId:"turtle",rarity:"epic",icon:"🌍🐢",name:"Continental Drift",desc:"Gain +35 max HP; add 60% of Defense to attacks.",apply(){player.maxHp+=35;player.hp+=35;player.defenseAttackScale+=.60;}},
    {id:"frog_lingering_croak",classId:"frog",rarity:"rare",icon:"🐸🔊",name:"Lingering Croak",desc:"Gain +28% Echo Strike and Echoes deal 8% more damage.",apply(){player.doubleStrike+=.28;player.echoDamageScale=Math.min(1.25,(player.echoDamageScale||.70)+.08);}},
    {id:"frog_amphibian_loop",classId:"frog",rarity:"epic",icon:"♻️🐸",name:"Amphibian Recursion",desc:"Gain +40% Echo Strike and +12% Crit.",apply(){player.doubleStrike+=.40;player.crit+=.12;}},
    {id:"d20_bent_probability",classId:"d20",rarity:"rare",icon:"🎲↻",name:"Bent Probability",desc:"Every action has a 20% chance to add a random extra Echo, barrier, heal or element.",apply(){player.d20BonusChance=(player.d20BonusChance||0)+.20;}},
    {id:"d20_loaded_corners",classId:"d20",rarity:"epic",icon:"🎲✨",name:"Loaded Corners",desc:"Every d20 action roll has a 12% chance to be replaced by a random roll from 17–20.",apply(){player.d20HighRollChance=(player.d20HighRollChance||0)+.12;}},
    {id:"vampire_red_mist",classId:"vampire",rarity:"rare",icon:"🩸🌫️",name:"Red Mist",desc:"Gain +22% Lifesteal and +8% Dodge.",apply(){player.lifeSteal+=.22;player.dodge+=.08;}},
    {id:"vampire_night_feast",classId:"vampire",rarity:"epic",icon:"🦇🍷",name:"Night Feast",desc:"Gain +4 Attack and +25% Boss Damage; victories heal 6 HP.",apply(){player.attack+=4;player.bossDamage+=.25;player.postFightHeal+=6;}},
    {id:"ninja_smoke_math",classId:"ninja",rarity:"rare",icon:"🥷💨",name:"Smoke Mathematics",desc:"Gain +18% Crit and +9% raw Dodge.",apply(){player.crit+=.18;player.dodge+=.09;}},
    {id:"ninja_five_shadows",classId:"ninja",rarity:"epic",icon:"🌘🗡️",name:"Five Shadows",desc:"Gain +22% Echo Strike and +20% Boss Damage.",apply(){player.doubleStrike+=.22;player.bossDamage+=.20;}},
    {id:"ceo_hostile_synergy",classId:"ceo",rarity:"rare",icon:"📈🤝",name:"Hostile Synergy",desc:"Gain +25% Boss Damage and +35% gold.",apply(){player.bossDamage+=.25;player.goldBonus+=.35;}},
    {id:"ceo_infinite_growth",classId:"ceo",rarity:"epic",icon:"📊♾️",name:"Infinite Growth",desc:"Gain +4 Attack and every 200 gold adds another +1 effective attack.",apply(){player.attack+=4;player.goldAttackScale=Math.max(player.goldAttackScale||0,.005);}},
    {id:"merchant_bulk_discount",classId:"merchant",rarity:"rare",icon:"🧔📦",name:"Bulk Discount Violence",desc:"Gain +50% gold and +15 Luck.",apply(){player.goldBonus+=.50;player.luck+=.15;}},
    {id:"merchant_compound_fury",classId:"merchant",rarity:"epic",icon:"🪙💥",name:"Compound Fury",desc:"Gain +4 Attack, +20% Boss Damage and +15% Echo Strike.",apply(){player.attack+=4;player.bossDamage+=.20;player.doubleStrike+=.15;}},

    {id:"shared_vanguard",classIds:["fighter","berserker","turtle","monk"],rarity:"rare",icon:"⚔️🛡️",name:"Vanguard Doctrine",desc:"Gain +2 Attack, +2 Defense and +10% Boss Damage.",apply(){player.attack+=2;player.defense+=2;player.bossDamage+=.10;}},
    {id:"shared_skirmisher",classIds:["ranger","ninja","frog","monk"],rarity:"rare",icon:"💨🎯",name:"Skirmisher's Tempo",desc:"Gain +10% Crit, +10% Echo Strike and +5% raw Dodge.",apply(){player.crit+=.10;player.doubleStrike+=.10;player.dodge+=.05;}},
    {id:"shared_occult",classIds:["sorcerer","vampire","rouge","d20","clown"],rarity:"rare",icon:"🔮🩸",name:"Occult Convergence",desc:"Gain +10% elemental activation and +10% Lifesteal.",apply(){player.elementProcBonus+=.10;player.lifeSteal+=.10;}}
  );

  let merchantFaceClicks=new Set(),merchantFaceTotal=0,merchantBossPrimed=false,merchantBossDefeatedThisBoard=false,merchantBossBattle=false;
  let prestigeCandidateItems=[];
  const currentTileCount=()=>db317Board(boardLevel).tiles;
  const currentCols=()=>boardLevel>=4?8:10;
  const currentRows=()=>boardLevel>=4?8:10;
  const currentMinibossTile=()=>db317Board(boardLevel).minibossTile;
  const currentCampTiles=()=>boardLevel>=4?[8,20,44,56]:STATIC_CAMP_TILES;
  const currentPowerupCount=()=>boardLevel>=4?3:POWERUP_TILE_COUNT;
  const currentWheelCount=()=>boardLevel>=4?3:WHEEL_TILE_COUNT;

  function v13NormalizeMeta(raw={}){
    const base=defaultMeta(),pets=defaultPets();
    Object.entries(raw.pets||{}).forEach(([id,state])=>{if(pets[id])pets[id]={...pets[id],...state};});
    const unlocks={...Object.fromEntries(Object.keys(CLASSES).map(id=>[id,id==="ranger"])),...(raw.unlocks||{})};
    const out={...base,...raw,version:15,pets,unlocks,elementProgress:{...base.elementProgress,...(raw.elementProgress||{})},prestige:{...defaultPrestige(),...(raw.prestige||{})},heirlooms:(raw.heirlooms||[]).map(normalizeSavedItem),merchantKills:raw.merchantKills||0,infoSeen:!!raw.infoSeen,board4Clears:raw.board4Clears||0,achievements:{...(raw.achievements||{})}};
    out.xpNext=legacyXpForLevel(out.level||1);out.purchased=normalizePurchased(raw.purchased||{});
    let refund=0;const known=new Map(talents.map(t=>[t.id,t]));
    for(const [id,val] of Object.entries(out.purchased)){const rank=Math.max(0,Number(val)||0),t=known.get(id);if(!t){refund+=rank*2;delete out.purchased[id];continue;}if(rank>t.maxRank){refund+=(rank-t.maxRank)*t.cost;out.purchased[id]=t.maxRank;}}
    out.points=(out.points||0)+refund;
    return out;
  }
  function importOldSaveIfNeeded(){
    // Alpha 3.1.4 intentionally starts a new save schema. Legacy localStorage keys are not auto-loaded.
    try{meta=v13NormalizeMeta(meta);saveMeta();}
    catch(e){meta=v13NormalizeMeta({});saveMeta();}
    repairTalentPrerequisites();
  }
  importOldSaveIfNeeded();

  function isClassUnlocked(id){
    if(meta.unlocks?.[id])return true;
    if(id==="slime")return Object.keys(CLASSES).filter(k=>!PUBLIC_SLIME_EXEMPT.has(k)&&!CLASSES[k].secret).every(baseClassUnlocked);
    return baseClassUnlocked(id);
  }
  // Thin composition adapter only.  The real Class chooser, including
  // roster/detail rendering and Random state, is owned by ui/class-chooser.
  function renderClassChoices(){return window.DiceboundClassChooser?.render();}

  function rollGearRarity(bonus=0){
    const p=random(),depth=(boardLevel-1)+player.position/Math.max(1,currentTileCount()-1),boost=bonus+depth*.13+player.luck*.22+(nightmareMode?.08:0);
    if(p<.018+boost*.22)return "legendary";if(p<.08+boost*.40)return "epic";if(p<.23+boost*.68)return "rare";if(p<.53+boost)return "uncommon";return "common";
  }
  function makeMerchantGear(){
    let bonus=boardLevel===4?.82:boardLevel===3?.52:boardLevel===2?.30:.08,rarity=rollGearRarity(bonus);
    if(boardLevel>=2&&rarity==="common")rarity="uncommon";if(boardLevel>=3&&rarity==="uncommon")rarity="rare";if(boardLevel===4&&rarity==="rare"&&random()<.65)rarity="epic";
    const gear=generateEquipment(rarity),base=(boardLevel===4?175:boardLevel===3?115:boardLevel===2?72:38)+rarityValues[rarity]*(boardLevel===4?55:boardLevel===3?42:boardLevel===2?34:28)+Math.floor(player.position/3);return {id:gear.id,icon:gear.icon,name:gear.name,desc:`${SLOT_LABELS[gear.slot]} · ${formatBonuses(gear)}`,gear,base,buy(){equipItem(gear);return gear;}};
  }
  function merchantCatalog(){
    if(boardLevel<4)return boardLevel===3?[
      {id:"potion",icon:"🧪",name:"Impossible Apothecary Chest",desc:"Gain 6 potions and +50% potion power.",base:95+player.position,buy(){player.potions+=6;player.potionPower+=.50;}},{id:"heal",icon:"❤️",name:"Reality Reconstruction",desc:"Restore all HP and gain +14 max HP.",base:135+player.position,buy(){player.maxHp+=14;player.hp=player.maxHp;}},{id:"attack",icon:"⚔️",name:"Nullstar Edge Treatment",desc:"Gain +4 attack.",base:178+player.position,buy(){player.attack+=4;}},{id:"armor",icon:"🛡️",name:"Paradox Armor Plating",desc:"Gain +4 defense and 1 flat reduction.",base:192+player.position,buy(){player.defense+=4;player.flatReduction+=1;}},{id:"charm",icon:"🌈",name:"Impossible Fate Engine",desc:"Gain +20 Luck, +10% Crit and +10% Echo.",base:180+player.position,buy(){player.luck+=.20;player.crit+=.10;player.doubleStrike+=.10;}},{id:"relic",icon:"🌌",name:"Unbound Impossible Relic",desc:"Reveal one Rare+ powerup.",base:285+player.position*2,buy(){const up=pick(eligibleUpgrades(u=>DB_RARITIES.isPowerupRarityAtLeast(u.rarity,"rare")));applyUpgrade(up,"Unbound Impossible Relic");return up;}}
    ]:boardLevel===2?[
      {id:"potion",icon:"🧪",name:"Astral Potion Crate",desc:"Gain 4 potions.",base:58+player.position,buy(){player.potions+=4;}},{id:"heal",icon:"❤️",name:"Devourer-Safe Restoration",desc:"Restore all HP and gain +6 max HP.",base:82+player.position,buy(){player.maxHp+=6;player.hp=player.maxHp;}},{id:"attack",icon:"⚔️",name:"Starforged Whetstone",desc:"Gain +2 attack.",base:112+player.position,buy(){player.attack+=2;}},{id:"armor",icon:"🛡️",name:"Titan Plate Rivets",desc:"Gain +2 defense.",base:126+player.position,buy(){player.defense+=2;}},{id:"charm",icon:"🍀",name:"Astral Fate Prism",desc:"Gain +10 Luck and +5% Crit.",base:108+player.position,buy(){player.luck+=.10;player.crit+=.05;}},{id:"relic",icon:"🌌",name:"Unsealed Astral Relic",desc:"Reveal an Epic or Legendary powerup.",base:190+player.position*2,buy(){const up=pick(eligibleUpgrades(u=>u.rarity==="epic"||u.rarity==="legendary"));applyUpgrade(up,"Astral Relic");return up;}}
    ]:[
      {id:"potion",icon:"🧪",name:"Potion Pack",desc:"Gain 2 potions.",base:24+player.position,buy(){player.potions+=2;}},{id:"heal",icon:"❤️",name:"Full Service Healing",desc:"Restore all HP.",base:32+player.position,buy(){player.hp=player.maxHp;}},{id:"attack",icon:"⚔️",name:"Tempered Whetstone",desc:"Gain +1 attack.",base:58+player.position,buy(){player.attack+=1;}},{id:"armor",icon:"🛡️",name:"Armor Reinforcement",desc:"Gain +1 defense.",base:66+player.position,buy(){player.defense+=1;}},{id:"charm",icon:"🎯",name:"Lucky Charm",desc:"Gain +4% Crit.",base:52+player.position,buy(){player.crit+=.04;}},{id:"relic",icon:"🔮",name:"Sealed Relic",desc:"Reveal a Rare or Epic powerup.",base:105+player.position*2,buy(){return applyRandomHighRarity();}}
    ];
    return [
      {id:"potion",icon:"🧪",name:"Crownroad Pharmacy",desc:"Gain 9 potions and +75% potion healing.",base:185+player.position*2,buy(){player.potions+=9;player.potionPower+=.75;}},{id:"heal",icon:"💖",name:"Total Timeline Restoration",desc:"Restore all HP and gain +25 max HP.",base:240+player.position*2,buy(){player.maxHp+=25;player.hp=player.maxHp;}},{id:"attack",icon:"⚔️",name:"Omega Edge License",desc:"Gain +7 attack and +15% Boss Damage.",base:310+player.position*2,buy(){player.attack+=7;player.bossDamage+=.15;}},{id:"armor",icon:"🏰",name:"Sovereign Plating",desc:"Gain +7 defense and 2 flat reduction.",base:330+player.position*2,buy(){player.defense+=7;player.flatReduction+=2;}},{id:"charm",icon:"🌈",name:"Final-Road Fate Engine",desc:"Gain +30 Luck, +15% Crit, +15% Echo and +15% element power.",base:325+player.position*2,buy(){player.luck+=.30;player.crit+=.15;player.doubleStrike+=.15;player.elementDamageBonus+=.15;}},{id:"relic",icon:"👑",name:"Sovereign Relic",desc:"Choose one of three eligible Legendary powerups immediately.",base:455+player.position*3,alphaChooseLegendary:true,buy(){return null;}}
    ];
  }
  function merchantPrice(base){return player.freeMerchantRun?0:Math.max(1,Math.round(base*(1-clamp(player.shopDiscount,0,.55))));}
  function openMerchant(){
    const catalog=merchantCatalog(),stock=[],catalogCount=boardLevel===4?6:boardLevel===3?5:boardLevel===2?4:3;while(stock.length<catalogCount){const item=pick(catalog);if(!stock.some(s=>s.id===item.id))stock.push({...item,sold:false});}
    const gearCount=boardLevel===4?4:boardLevel===3?3:boardLevel===2?2:1;for(let i=0;i<gearCount;i++)stock.push({...makeMerchantGear(),sold:false});currentMerchantItems=stock;currentMerchantNotice="";$("merchantTitle").textContent=player.freeMerchantRun?"The Merchant Owes You Everything":boardLevel===4?"Crownroad Merchant":boardLevel===3?"Impossible Merchant":boardLevel===2?"Astral Merchant":"Roadside Merchant";$("merchantSubtitle").textContent=player.freeMerchantRun?"After defeating the merchant, every shop item is free for the rest of this run.":boardLevel===4?"Board 4 carries the strongest ordinary stock on the road.":"Compare equipment before buying.";$("merchantOverlay").classList.remove("hidden");renderMerchant();
  }

  function generateMythicalHat(){return {id:`mythical_hat_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"hat",rarity:"mythical",mythical:true,mythicPiece:"hat",setName:"Impossible Road",uniqueEffect:"Crown of the Fourth Road: after surviving a guardian special, restore 10% max HP and gain 25 ultimate charge.",icon:"👑",name:"Crown of the Road That Should Not Exist",bonuses:{maxHp:38,attack:7,defense:5,crit:.18,luck:.18,bossDamage:.45}};}
  function generateMythicalWeapon(){
    if(player.classId==="merchant")return {id:`mythical_merchant_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",uniqueEffect:"Reality Rend and Compound Interest: every fifth attack guarantees an element, and attacks add 10% of current gold.",merchantWeaponScale:.10,icon:"💰",name:"Monopoly, Ledger of the Last Market",element:"coffee",bonuses:{attack:16,luck:.35,goldBonus:.70,bossDamage:.45}};
    if(player.classId==="vampire")return {id:`mythical_vampire_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",uniqueEffect:"Reality Rend: every fifth attack guarantees a strengthened Void activation.",icon:"🩸",name:"Nocturne, Fang of the Empty Sun",element:"void",bonuses:{attack:16,crit:.16,lifeSteal:.35,bossDamage:.40,maxHp:24}};
    if(player.classId==="ninja")return {id:`mythical_ninja_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",uniqueEffect:"Reality Rend: every fifth attack guarantees a strengthened Electric activation.",icon:"🥷",name:"Zero Footstep, Blade Between Frames",element:"electric",bonuses:{attack:16,crit:.35,doubleStrike:.25,dodge:.18,bossDamage:.40}};
    if(player.classId==="ceo")return {id:`mythical_ceo_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",uniqueEffect:"Reality Rend: every fifth attack guarantees Brain Hack; guardian rewards grant 50% more gold.",icon:"📈",name:"The Bottom Line, Executive Reality Cutter",element:"tech",bonuses:{attack:18,bossDamage:.65,goldBonus:.50,crit:.20,luck:.25}};
    const data={fighter:["Worldsplitter, Blade of the Last Road","🗡️",{attack:14,maxHp:24,defense:3,lifeSteal:.12,bossDamage:.35}],ranger:["Starpiercer, Bow Beyond Distance","🏹",{attack:12,crit:.20,dodge:.10,doubleStrike:.25,bossDamage:.35}],sorcerer:["Eventide, Staff of Infinite Sparks","🪄",{attack:15,crit:.12,lifeSteal:.18,classBurst:.20,bossDamage:.35}],monk:["Heaven's Knuckles, Hands of the Silent Road","🥊",{attack:13,dodge:.14,doubleStrike:.28,lifeSteal:.10,bossDamage:.30}],clown:["The Last Laugh, Impossible Rubber Chicken","🐔",{attack:11,crit:.22,luck:.25,doubleStrike:.25,bossDamage:.30}],rouge:["Vermilion, Brush of the Red Beyond","🖌️",{attack:14,crit:.16,lifeSteal:.24,doubleStrike:.16,bossDamage:.35}],berserker:["World-Ender, Axe of Ten Thousand Scars","🪓",{attack:17,maxHp:30,crit:.14,lifeSteal:.15,bossDamage:.40,damageBonus:.20}],turtle:["Atlas Shellbreaker, Hammer of Patient Worlds","🔨",{attack:10,maxHp:42,defense:9,bossDamage:.40,damageBonus:.12}],frog:["Ribbitus Maximus, Spear of Infinite Echoes","🐸",{attack:13,doubleStrike:.45,dodge:.18,crit:.15,bossDamage:.35}],d20:["The Unfair Die, Edge of Twenty Outcomes","🎲",{attack:14,crit:.20,doubleStrike:.20,luck:.30,bossDamage:.35}],slime:["Primordial Puddle, Weapon of Everything","🟢",{attack:14,maxHp:28,crit:.14,doubleStrike:.16,lifeSteal:.14,bossDamage:.35}]}[player.classId]||["Worldsplitter","🗡️",{attack:14,bossDamage:.35}];
    return {id:`mythical_${player.classId}_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",uniqueEffect:"Reality Rend: every fifth basic attack guarantees a strengthened elemental activation.",icon:data[1],name:data[0],element:pick(ELEMENT_KEYS),bonuses:data[2]};
  }
  function mythicalSetSummary(){const count=mythicalSetCount();return `${count}/5 Impossible Road pieces · 3 pieces: +15% all damage and +15% elemental proc chance · 4 pieces: begin battles with at least 50 ultimate, one barrier and +25% pet double chance · 5 pieces: +30% all damage, +25% elemental power, and guardian specials deal 25% less damage.`;}

  function enemyForPosition(index){return dbBoardGeneration.enemyForPosition(index);}
  function generateBoard(){return dbBoardGeneration.generate();}
  function tileMeta(tile){if(tile.type==="enemy"&&tile.enemyBase){const n=tile.packSize||1;return [n===1?tile.enemyBase.icon:n===2?"👹👹":"👹👹👹",n===1?`${tile.enemyBase.name} · 1 enemy`:`Enemy pack · ${n}`];}if(tile.type==="miniboss"&&tile.enemyBase)return [tile.enemyBase.icon,"Mini Boss · 1 enemy"];return {start:["🏠","Start"],empty:["·","Road"],event:["🎰","Slots"],wheel:["🎡","Wheel"],powerup:["🎁","Powerup"],treasure:["💰","Treasure"],camp:["🔥","Camp"],merchant:["🧔","Merchant"],blessing:["✨","Blessing"],mystic:["🔮","Mystic"],bloodwell:["🩸","Bloodwell"],gambler:["🪙","Gambler"],boss:["🐉","Final Boss · 1"]}[tile.type];}
  function buildBoard(){
    const board=$("board"),cols=currentCols(),rows=currentRows();board.innerHTML="";board.style.gridTemplateColumns=`repeat(${cols},1fr)`;board.style.gridTemplateRows=`repeat(${rows},1fr)`;tileEls=[];tiles.forEach((tile,index)=>{const rowFromBottom=Math.floor(index/cols),indexInRow=index%cols,col=rowFromBottom%2===0?indexInRow:(cols-1-indexInRow),visualRow=rows-rowFromBottom,[icon,label]=tileMeta(tile),el=document.createElement("div");el.className=`tile ${tile.type}`;el.style.gridColumn=String(col+1);el.style.gridRow=String(visualRow);el.innerHTML=`<span class="tile-number">${index+1}</span><span class="tile-icon">${icon}</span><span class="tile-label">${label}</span>`;if(tile.type==="merchant"){const face=el.querySelector(".tile-icon");face.title="Click every merchant face on this board for a secret.";face.addEventListener("click",ev=>{ev.stopPropagation();merchantFaceClicks.add(index);face.classList.add("merchant-primed");showToast(`Merchant faces: ${merchantFaceClicks.size}/${merchantFaceTotal}`);if(merchantFaceClicks.size>=merchantFaceTotal&&!merchantBossDefeatedThisBoard){merchantBossPrimed=true;addLog("Every merchant portrait smiles at once. <b>The next merchant is waiting for a fight.</b>");showToast("🧔 Secret merchant boss primed!");}});}board.appendChild(el);tileEls[index]=el;});requestAnimationFrame(()=>placePawn(false));
  }
  function updateHUD(){
    const cls=CLASSES[player.classId]||CLASSES.ranger;$("heroAvatar").textContent=cls.icon;$("heroName").textContent=cls.name;$("pawn").textContent=cls.icon;$("combatPlayerIcon").textContent=cls.icon;$("combatPlayerName").textContent=cls.name;$("combatPet").dataset.name=activePetDef().name;$("levelText").textContent=`Level ${player.level}`;$("hpText").textContent=`${Math.round(player.hp)} / ${Math.round(player.maxHp)}`;$("xpText").textContent=`${player.xp} / ${player.xpNext}`;$("attackText").textContent=Math.round(player.attack+(player.goldAttackScale?player.gold*player.goldAttackScale:0));$("defenseText").textContent=player.defense+player.flatReduction;$("goldText").textContent=player.gold;$("potionText").textContent=player.potions;$("critText").textContent=`${Math.round(player.crit*100)}%`;$("dodgeText").textContent=`${Math.round(effectiveDodgeChance()*100)}%`;$("lifeStealText").textContent=`${Math.round(player.lifeSteal*100)}%`;$("luckText").textContent=`${Math.round(player.luck*100)}`;$("echoText").textContent=`${Math.round(player.doubleStrike*100)}%`;$("bossDamageText").textContent=`${Math.round(player.bossDamage*100)}%`;
    const count=currentTileCount(),mini=currentMinibossTile(),finalName=boardLevel===1?"Dragon":boardLevel===2?"Devourer":boardLevel===3?"Nullstar":"Crown Eater";$("floorText").textContent=`Board ${boardLevel} · ${player.position+1} / ${count}`;$("guardianText").textContent=player.position<mini-1?`Miniboss · tile ${mini}`:`${finalName} · tile ${count}`;$("rollHint").textContent=`High rolls grant Fast Travel XP. The halfway guardian intercepts any roll that crosses tile ${mini}.`;const ult=cls.ultimate;$("ultimateName").textContent=ult.name;$("ultimateText").textContent=`${Math.round(player.ultimateCharge)} / 100`;$("ultimateFill").style.width=`${clamp(player.ultimateCharge,0,100)}%`;$("hpFill").style.width=`${clamp(player.hp/player.maxHp*100,0,100)}%`;$("xpFill").style.width=`${clamp(player.xp/player.xpNext*100,0,100)}%`;$("rollBtn").disabled=rollLocked||!gameStarted;$("potionBtn").disabled=combatBusy||player.potions<=0||player.hp>=player.maxHp;$("outsidePotionBtn").disabled=!gameStarted||rollLocked||!!currentEnemy||player.potions<=0||player.hp>=player.maxHp;$("runBuffBtn").disabled=!gameStarted;checkDynamicClassUnlocks();updateMetaUI();renderEquipment();refreshBoardHighlights();placePawn(false);
  }
  async function rollDice(){
    if(rollLocked||!gameStarted)return;ensureAudio();if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();rollLocked=true;updateHUD();const die=$("dice");die.classList.add("rolling");for(let i=0;i<11;i++){die.textContent=pick(diceFaces);sfx.roll();await delay(55+i*6);}let value=rand(1,6),chosen=false;if(player.diceChoiceChance>0&&random()<player.diceChoiceChance){value=await chooseDieResult();chosen=true;showToast(`🎲 Fate chosen: ${value}`);}let bonus=0;if(!chosen&&random()<clamp(player.extraStepChance,0,.75))bonus=1;die.textContent=diceFaces[value-1];die.classList.remove("rolling");rolls++;let titanstep="";if(hasMythicPiece("boots")&&value>=5){const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.05)));player.hp+=healed;player.ultimateCharge=clamp(player.ultimateCharge+10,0,100);titanstep=` Titanstep restores <b>${healed} HP</b> and grants <b>10 ultimate</b>.`;showToast("🥾 Titanstep!");}addLog(`${chosen?"Fate bends. You choose":"You rolled"} <b>${value}</b>${bonus?" and Long Stride adds <b>+1</b>":""}.${titanstep}`);await dbBoardMovement.move(value+bonus,value,bonus>0,chosen);
  }
  function startCombat(kind="normal"){
    const tile=tiles[player.position];let bases=[];merchantBossBattle=kind==="merchant";
    if(kind==="merchant")bases=[{name:"The Road Merchant",icon:"🧔💰",hp:185+boardLevel*60,attack:28+boardLevel*5,xp:260,gold:500,weakness:"nature",specialName:"Hostile Acquisition",enemyBarrier:4}];
    else if(kind==="final")bases=[boardLevel===4?{name:"Crown-Eater of the Fourth Road",icon:"🐲👑",hp:190,attack:36,xp:290,gold:350,weakness:"light",specialName:"End of All Accounts"}:boardLevel===3?{name:"Nullstar Hydra",icon:"🐉🌑",hp:112,attack:24,xp:145,gold:170,weakness:"light",specialName:"Erasure of All Roads"}:boardLevel===2?{name:"Astral Devourer Dragon",icon:"🐲",hp:74,attack:16,xp:90,gold:105,weakness:"donut",specialName:"Astral Consumption"}:{name:"Ancient Road Dragon",icon:"🐉",hp:48,attack:11,xp:60,gold:70,weakness:"ice",specialName:"Worldfire Breath"}];
    else if(kind==="miniboss")bases=[{...tile.enemyBase,specialName:boardLevel===4?"Crown Audit":boardLevel===3?"Paradox Collapse":boardLevel===2?"Titanic Roadslam":"Roadwarden Rampage"}];else bases=(tile.enemyBases?.length?tile.enemyBases:[tile.enemyBase||enemyForPosition(player.position)]).map(x=>({...x}));
    currentEnemies=bases.map(b=>scaleEnemy(b,kind,bases.length));currentEncounterLead=currentEnemies[0];currentEnemyIndex=0;currentEnemy=currentEnemies[0];currentEnemyTile=player.position;currentEncounterTurn=0;combatBusy=false;player.combatShield=player.firstHitBlocks+(mythicalSetCount()>=5?1:0)+(hasMythicPiece("hat")?1:0);player.combatAttackCount=0;player.combatActionCount=0;player.mythicActionCount=0;player.mythicAmuletUsed=false;if(mythicalSetCount()>=4)player.ultimateCharge=Math.max(player.ultimateCharge,v19SetStartUltimate());$("combatTitle").textContent=kind==="merchant"?"Secret Boss: The Merchant":kind==="final"?"Final Guardian":kind==="miniboss"?"Halfway Miniboss":currentEnemies.length>1?`Enemy Pack ×${currentEnemies.length}`:"Battle!";$("combatSubtitle").textContent=kind==="merchant"?"He closes the shop, raises barriers and begins charging interest.":currentEnemies.length>1?"Every enemy is visible below. The arrow marks your selected target.":"Choose your action.";$("combatHistory").innerHTML="";setCombatText(`${currentEnemies.map(e=>e.name).join(", ")} block the road. Choose your action.`);$("combatOverlay").classList.remove("hidden");addLog(`Combat begins against <b>${currentEnemies.map(e=>e.name).join(", ")}</b>.`);renderEnemyParty();updateCombatUI();
  }
  function damageEnemy(enemy,amount,ignoreDefense=false){if(!enemy||enemy.hp<=0)return 0;if(enemy.enemyBarrier>0&&!ignoreDefense){enemy.enemyBarrier--;addCombatHistory(`${enemy.name}'s merchant barrier cancels the hit. ${enemy.enemyBarrier} remain.`);return 0;}const raw=Math.max(0,Math.round(amount)),actual=Math.max(raw>0?1:0,raw-(ignoreDefense?0:(enemy.defense||0))),dealt=Math.min(enemy.hp,actual);enemy.hp-=dealt;return dealt;}
  function openCombatLootChain(defeated,done){
    const normal=()=>{if(random()<equipmentDropChance(defeated.boss)){const rarity=defeated.finalBoss?pick(["epic","legendary"]):defeated.miniBoss?pick(["rare","epic"]):null;openLoot(generateEquipment(rarity),done);}else done();},specials=[];let weapon=0,boots=0,amulet=0,pants=0,hat=0,merchant=.001;
    if(defeated.merchantBoss){if(random()<merchant*(nightmareMode?2:1))specials.push(generateMerchantWeapon());}
    else if(defeated.miniBoss){if(boardLevel===1)weapon=.005;else if(boardLevel===2){weapon=.075;boots=.01;}else if(boardLevel===3){weapon=.075;boots=.01;pants=.005;}else{weapon=.12;boots=.075;pants=.04;amulet=.005;hat=.005;}}
    else if(defeated.finalBoss){if(boardLevel===1)weapon=.05;else if(boardLevel===2){weapon=.10;boots=.05;amulet=.001;}else if(boardLevel===3){weapon=.10;boots=.05;pants=.02;amulet=.001;}else{weapon=.18;boots=.10;pants=.06;amulet=.01;hat=.02;}}
    const mult=nightmareMode?2:1;if(weapon&&random()<weapon*mult)specials.push(generateMythicalWeapon());if(boots&&random()<boots*mult)specials.push(generateMythicalBoots());if(pants&&random()<pants*mult)specials.push(generateMythicalPants());if(amulet&&random()<amulet*mult)specials.push(generateMythicalAmulet());if(hat&&random()<hat*mult)specials.push(generateMythicalHat());const next=()=>{if(!specials.length)return normal();const item=specials.shift();addLog(`<b>MYTHIC ITEM!</b> ${item.name} drops from ${defeated.name}.`);sfx.holy();openLoot(item,next);};next();
  }
  function openLoot(item,callback){if(!dbEquipmentPrepareLoot(item,callback))return;pendingLootItem=item;pendingLootCallback=callback;return dbEquipmentUi.renderLoot(item);}

  async function winCombat(){
    const defeated=currentEncounterLead||currentEnemy,all=currentEnemies.length?currentEnemies:[defeated],rewardGold=modifiedGold(all.reduce((s,e)=>s+e.gold,0)),rewardXp=Math.max(1,Math.round(all.reduce((s,e)=>s+e.xp,0)*(1+player.xpBonus)));player.gold+=rewardGold;if(player.postFightHeal>0)healPlayer(player.postFightHeal);let cookies=defeated.finalBoss?(boardLevel===4?8:boardLevel===3?6:boardLevel===2?4:2):defeated.miniBoss?(boardLevel===4?7:boardLevel===3?5:boardLevel===2?3:1):0;if(cookies){meta.petCookies+=cookies;saveMeta();showToast(`🍪 +${cookies} cookies`);}if(defeated.merchantBoss){merchantBossBattle=false;merchantBossPrimed=false;merchantBossDefeatedThisBoard=true;player.freeMerchantRun=true;meta.merchantKills=(meta.merchantKills||0)+1;saveMeta();checkDynamicClassUnlocks();addLog("<b>The Road Merchant is defeated.</b> Every merchant item is free for the rest of this run.");showToast("🧔 All shops are free!");}
    if(defeated.miniBoss&&boardLevel===1)unlockClass("sorcerer");if(defeated.finalBoss&&boardLevel===1)unlockClass("fighter");if(defeated.miniBoss&&boardLevel===2)unlockClass("monk");if(defeated.finalBoss&&boardLevel===2)unlockClass("clown");if(tiles[currentEnemyTile]){tiles[currentEnemyTile].cleared=true;if(!defeated.finalBoss){tiles[currentEnemyTile].type="empty";delete tiles[currentEnemyTile].enemyBase;refreshTile(currentEnemyTile);}}setCombatText(`Victory! +${rewardXp} XP, +${rewardGold} gold${cookies?`, +${cookies} cookies`:""}.`);sfx.win();addLog(`Defeated <b>${all.map(e=>e.name).join(", ")}</b>: +${rewardXp} XP, +${rewardGold} gold.`);updateHUD();await delay(900);$("combatOverlay").classList.add("hidden");currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;grantXp(rewardXp);updateHUD();const after=()=>{if(defeated.finalBoss){if(boardLevel===3&&!meta.nightmareUnlocked){meta.nightmareUnlocked=true;saveMeta();showToast("🌑 Nightmare Mode unlocked");addLog("<b>Nightmare Mode unlocked!</b> You may enable it from class selection on future runs.");}if(boardLevel<4)advanceToNextBoard();else{meta.board4Clears=(meta.board4Clears||0)+1;saveMeta();showEnd(true);}}else returnToRoad();},cont=()=>pendingLevelUps>0?openLevelUp(after):after(),loot=()=>openCombatLootChain(defeated,cont);if(defeated.miniBoss){showLegendaryChoice("Miniboss Legendary Reward",loot);}else loot();
  }
  function applyRunTheme(){const themes={1:{bg1:"#071b0d",bg2:"#031008",glow1:"rgba(82,220,118,.24)",glow2:"rgba(175,255,116,.11)",board1:"#173c20",board2:"#0a2111"},2:{bg1:"#2a2105",bg2:"#130f02",glow1:"rgba(255,221,69,.25)",glow2:"rgba(255,152,45,.12)",board1:"#594817",board2:"#2d240b"},3:{bg1:"#2a0709",bg2:"#120305",glow1:"rgba(255,67,76,.25)",glow2:"rgba(255,130,57,.12)",board1:"#5c171b",board2:"#2b090c"},4:{bg1:"#160522",bg2:"#07020b",glow1:"rgba(196,88,255,.30)",glow2:"rgba(255,70,173,.15)",board1:"#3f1357",board2:"#1b0828"}},t=themes[boardLevel]||themes[1],r=document.documentElement.style;for(const [k,v] of Object.entries(t))r.setProperty(`--run-${k.replace(/([A-Z])/g,"-$1").toLowerCase()}`,v);}

  function openBloodwell(){
    const stats=$("bloodwellStats");if(stats)stats.innerHTML=`<div class="stat"><span>HP</span><strong>${Math.round(player.hp)} / ${Math.round(player.maxHp)}</strong></div><div class="stat"><span>Potions</span><strong>${player.potions}</strong></div><div class="stat"><span>Attack</span><strong>${Math.round(player.attack)}</strong></div><div class="stat"><span>Defense</span><strong>${Math.round(player.defense)}</strong></div><div class="stat"><span>Luck</span><strong>${Math.round(player.luck*100)}</strong></div><div class="stat"><span>Crit</span><strong>${Math.round(player.crit*100)}%</strong></div><div class="stat"><span>Dodge</span><strong>${Math.round(effectiveDodgeChance()*100)}%</strong></div><div class="stat"><span>Lifesteal</span><strong>${Math.round(player.lifeSteal*100)}%</strong></div><div class="stat"><span>Echo</span><strong>${Math.round(player.doubleStrike*100)}%</strong></div><div class="stat"><span>Boss dmg</span><strong>${Math.round(player.bossDamage*100)}%</strong></div>`;
    const options=[
      {id:"hp",label:"Sacrifice 20% max HP",ok:player.maxHp>15,apply(){const n=Math.max(5,Math.ceil(player.maxHp*.20));player.maxHp=Math.max(1,player.maxHp-n);player.hp=Math.min(player.hp,player.maxHp);return [`maxHp`,n];}},
      {id:"potion",label:"Sacrifice 1 potion",ok:player.potions>0,apply(){player.potions--;return ["potions",1];}},
      {id:"luck",label:"Sacrifice 5 Luck",ok:player.luck>=.05,apply(){player.luck-=.05;return ["luck",5];}},
      {id:"attack",label:"Sacrifice 2 Attack",ok:player.attack>3,apply(){player.attack-=2;return ["attack",2];}},
      {id:"defense",label:"Sacrifice 2 Defense",ok:player.defense>1,apply(){player.defense-=2;return ["defense",2];}}
    ],grid=$("bloodwellGrid");grid.innerHTML="";options.forEach(o=>{const b=document.createElement("button");b.className="choice-btn rare";b.disabled=!o.ok;b.innerHTML=`<span class="choice-icon">🩸</span><span class="choice-name">${o.label}</span><span class="choice-desc">Receive a random increase in a different stat.</span>`;b.addEventListener("click",()=>{const [lost]=o.apply(),pool=["maxHp","attack","defense","luck","crit","dodge","lifeSteal","doubleStrike","bossDamage","potions"].filter(k=>k!==lost),gain=pick(pool),labels={maxHp:"+12 max HP",attack:"+3 attack",defense:"+3 defense",luck:"+8 Luck",crit:"+12% Crit",dodge:"+12% raw Dodge",lifeSteal:"+15% Lifesteal",doubleStrike:"+15% Echo Strike",bossDamage:"+25% Boss Damage",potions:"+3 potions"};if(gain==="maxHp"){player.maxHp+=12;player.hp+=12;}if(gain==="attack")player.attack+=3;if(gain==="defense")player.defense+=3;if(gain==="luck")player.luck+=.08;if(gain==="crit")player.crit+=.12;if(gain==="dodge")player.dodge+=.12;if(gain==="lifeSteal")player.lifeSteal+=.15;if(gain==="doubleStrike")player.doubleStrike+=.15;if(gain==="bossDamage")player.bossDamage+=.25;if(gain==="potions")player.potions+=3;recordRunBuff("🩸","Bloodwell Exchange",`${o.label} → ${labels[gain]}`,"special","Bloodwell");tiles[player.position].type="empty";tiles[player.position].cleared=true;refreshTile(player.position);$("bloodwellOverlay").classList.add("hidden");showToast(labels[gain]);addLog(`<b>Bloodwell:</b> ${o.label}; received ${labels[gain]}.`);updateHUD();returnToRoad();});grid.appendChild(b);});$("bloodwellOverlay").classList.remove("hidden");
  }
  function openGambler(){const grid=$("gambleGrid");grid.innerHTML="";$("gambleResult").textContent=`You carry ${player.gold} gold.`;[0,.25,.5,1].forEach(p=>{const wager=Math.floor(player.gold*p),b=document.createElement("button");b.className="choice-btn uncommon";b.innerHTML=`<span class="choice-icon">🪙</span><span class="choice-name">Bet ${Math.round(p*100)}%</span><span class="choice-desc">${wager} gold on a coinflip.</span>`;b.addEventListener("click",()=>{if(p===0){finishGambler("You politely decline.");return;}const actual=Math.floor(player.gold*p),win=random()<.5;if(win){player.gold+=actual;finishGambler(`Heads! You win ${actual} gold.`);}else{player.gold-=actual;finishGambler(`Tails! You lose ${actual} gold.`);}});grid.appendChild(b);});$("gamblerOverlay").classList.remove("hidden");}
  function finishGambler(msg){$("gambleResult").textContent=msg;addLog(`<b>Gambler:</b> ${msg}`);showToast(msg);tiles[player.position].type="empty";tiles[player.position].cleared=true;refreshTile(player.position);updateHUD();setTimeout(()=>{$("gamblerOverlay").classList.add("hidden");returnToRoad();},700);}

  function openInfo(){return undefined;}
  function renderInfo(){return undefined;}
  function exportSave(){const data=window.DiceboundSave.exportText(v13NormalizeMeta(meta));$("saveTransferText").value=data;window.DiceboundPlatform.copyText(data).then(ok=>showToast(ok?"Save copied to clipboard":"Save placed in text box")).catch(()=>showToast("Save placed in text box"));}
  function importSave(){try{const raw=$("saveTransferText").value.trim();if(!raw)throw new Error("empty");meta=window.DiceboundSave.importText(raw,{defaultFactory:defaultMeta,normalize:v13NormalizeMeta});repairTalentPrerequisites();renderClassChoices();updateMetaUI();showToast("Save imported");$("infoOverlay").classList.add("hidden");openStartScreen();}catch(e){window.DiceboundPlatform.alert("That save string could not be imported.");}}

  function prestigeSummary(){return DB_PRESTIGE.inspect(meta.prestige||defaultPrestige()).permanentSummary;}
  function openPrestigeHeirloomChoice(data){pendingPrestige=data;pendingPrestigeKeepIds=new Set();const post=(meta.prestige?.count||0)+data.rewards,capacity=1+(post>=20?1:0),byId=new Map();(meta.heirlooms||[]).forEach(i=>byId.set(i.id,normalizeSavedItem(i)));if(gameStarted)EQUIPMENT_SLOTS.map(s=>player.equipment[s]).filter(item=>window.DiceboundEquipment.isHeirloomEligible(item)).forEach(i=>byId.set(i.id,normalizeSavedItem(i)));prestigeCandidateItems=[...byId.values()];data.candidates=prestigeCandidateItems;const grid=$("prestigeHeirloomGrid");grid.innerHTML="";$("prestigeKeepConfirmBtn").textContent=`Confirm 0 / ${capacity} surviving heirlooms`;prestigeCandidateItems.forEach(item=>{const b=document.createElement("button");b.className="prestige-keep-btn";b.innerHTML=`<strong>${item.icon} ${item.name}</strong><span>${SLOT_LABELS[item.slot]} · ${formatBonuses(item)}</span>`;b.addEventListener("click",()=>{if(pendingPrestigeKeepIds.has(item.id)){pendingPrestigeKeepIds.delete(item.id);b.classList.remove("kept");}else{if(pendingPrestigeKeepIds.size>=capacity){showToast(`Choose at most ${capacity}`);return;}pendingPrestigeKeepIds.add(item.id);b.classList.add("kept");}$("prestigeKeepConfirmBtn").textContent=`Confirm ${pendingPrestigeKeepIds.size} / ${capacity} surviving heirlooms`;});grid.appendChild(b);});prestigeOverlay.classList.remove("hidden");}
  function completePrestige(data,keepIds=[]){const {rewards,remainder}=data,keys=["maxHp","attack","defense","crit","dodge","luck","lifeSteal"],gained=[];for(let i=0;i<rewards;i++){const key=pick(keys);meta.prestige[key]=(meta.prestige[key]||0)+1;gained.push(key);}meta.prestige.count=(meta.prestige.count||0)+rewards;const capacity=1+(meta.prestige.count>=20?1:0),pool=data.candidates||meta.heirlooms||[],selected=pool.filter(h=>keepIds.includes(h.id)).slice(0,capacity);meta.heirlooms=selected.map(normalizeSavedItem);meta.purchased={};meta.level=1;meta.xp=0;meta.xpNext=legacyXpForLevel(1);meta.points=remainder+(data.unspent||0);pendingPrestige=null;pendingPrestigeKeepIds=new Set();$("prestigeHeirloomOverlay").classList.add("hidden");saveMeta();checkDynamicClassUnlocks();sfx.holy();showToast(`Prestige gained ${rewards} permanent stat point${rewards===1?"":"s"}`);renderTalents();updateMetaUI();openStartScreen();}
  function prestigeTree(){const allocated=allocatedTalentPoints(),rewards=Math.floor(allocated/10),remainder=allocated%10;if(rewards<1)return;const post=(meta.prestige?.count||0)+rewards,keep=1+(post>=20?1:0),warning=`Prestige ${allocated} allocated points? You gain ${rewards} permanent stat point${rewards===1?"":"s"}, reset talents and Legacy level to 1, and keep up to ${keep} heirloom${keep===1?"":"s"}. ${gameStarted?"THIS ENDS THE CURRENT RUN AND RETURNS TO CLASS SELECTION. Current equipped items may be selected as survivors.":""}`;if(!window.DiceboundPlatform.confirm(warning))return;const data={allocated,rewards,remainder,unspent:meta.points,wasInRun:gameStarted};const pool=[...(meta.heirlooms||[]),...(gameStarted?EQUIPMENT_SLOTS.map(s=>player.equipment[s]).filter(item=>window.DiceboundEquipment.isHeirloomEligible(item)):[])];if(pool.length)openPrestigeHeirloomChoice(data);else completePrestige(data,[]);}

  function openStartScreen(){gameStarted=false;rollLocked=true;if(!isClassUnlocked(selectedClassId))selectedClassId="ranger";["combatOverlay","levelOverlay","eventOverlay","wheelOverlay","powerupOverlay","merchantOverlay","blessingOverlay","mysticOverlay","lootOverlay","endOverlay","talentOverlay","prestigeMoonOverlay","buffOverlay","prestigeHeirloomOverlay","petCollectionOverlay","diceChoiceOverlay","debugOverlay","bloodwellOverlay","gamblerOverlay","achievementOverlay"].forEach(id=>$(id)?.classList.add("hidden"));$("startOverlay").classList.remove("hidden");renderClassChoices();updateMetaUI();}
  function startNewGame(){return dbRunLifecycle.startFreshRun();}
  function showEnd(victory){rollLocked=true;gameStarted=false;const earned=finalizeRun();updateHUD();$("endArt").textContent=victory?"🏆":"☠️";$("endTitle").textContent=victory?"Victory!":"Your journey ends";$("endTitle").className=victory?"victory-title":"danger-title";$("endText").textContent=victory?`You defeated all four final guardians and conquered the 364-tile ${nightmareMode?"Nightmare ":""}journey.`:`The road claimed the adventurer, but every crossed tile strengthened the Legacy.`;$("endLevel").textContent=player.level;$("endGold").textContent=player.gold;$("endTurns").textContent=rolls;$("endLegacyXp").textContent=earned;$("endGoldLegacyXp").textContent=lastGoldLegacyAward;renderEndGear();$("endOverlay").classList.remove("hidden");}


  // ===== v15: Venom & Arsenal systems =====
  ELEMENTS.gun={icon:"🔫",name:"Gun",spell:"Deadeye Volley",description:"Fires a piercing shot for heavy single-target damage, ignoring half of the target's Defense."};
  if(!ELEMENT_KEYS.includes("gun"))ELEMENT_KEYS.push("gun");
  PETS.gun={id:"gun",name:"Trigger",icon:"🦝",element:"gun",desc:"A tiny gunslinger raccoon with extremely questionable licensing."};
  if(!meta.pets.gun)meta.pets.gun=defaultPetState(false);
  if(meta.elementProgress.gun==null)meta.elementProgress.gun=0;
  CLASSES.d20.unlock="Raise DiBo to level 30";
  CLASSES.d20.desc="A hidden avatar of probability, unlocked when DiBo reaches level 30. Every action and every powerup bends around a d20 roll.";

  const ACHIEVEMENT_POWER_GATES={destiny:"prestige10",godslayer:"road2",immortal:"road3",chaos:"road4",plague_lord:"nature_master"};
  for(const [id,gate] of Object.entries(ACHIEVEMENT_POWER_GATES)){const up=upgrades.find(x=>x.id===id);if(up)up.achievementGate=gate;}
  upgrades.push(
    {id:"venom_edge",rarity:"rare",icon:"🐍",name:"Venom Edge",desc:"Each basic or Echo strike has a 15% chance to add 1 Poison stack to its target.",apply(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.15;}},
    {id:"toxicology",rarity:"rare",icon:"🧪🌿",name:"Road Toxicology",desc:"Poison stacks deal +4% of Attack per stack each round.",apply(){player.poisonStackPower=(player.poisonStackPower||.12)+.04;}},
    {id:"thorn_venom",classIds:["ranger","ninja","frog","monk"],rarity:"rare",icon:"🌿🎯",name:"Thorn Venom",desc:"Gain +8% Crit and +10% chance to apply a Poison stack with basic and Echo strikes.",apply(){player.crit+=.08;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.10;}},
    {id:"toxic_bloom",rarity:"epic",icon:"☠️🌺",name:"Toxic Bloom",desc:"Nature activation adds one more poison proc, and Poison deals +3% Attack per stack.",apply(){player.naturePoisonStacks=(player.naturePoisonStacks||1)+1;player.poisonStackPower=(player.poisonStackPower||.12)+.03;}},
    {id:"plague_lord",rarity:"legendary",achievementGate:"nature_master",icon:"👑☠️",name:"Crown of the Green Plague",desc:"Achievement-locked: Nature adds 3 extra Poison stacks and Poison deals +8% Attack per stack.",apply(){player.naturePoisonStacks=(player.naturePoisonStacks||1)+3;player.poisonStackPower=(player.poisonStackPower||.12)+.08;}},
    {id:"gunpowder_luck",rarity:"rare",icon:"🔫🍀",name:"Loaded Chamber",desc:"Gain +10 Luck and every strike has a 7% chance to activate Deadeye Volley.",apply(){player.luck+=.10;player.classElementProcs.gun=(player.classElementProcs.gun||0)+.07;}},
    {id:"elemental_predator",rarity:"epic",icon:"🌈🐺",name:"Elemental Predator",desc:"Deal +20% elemental damage and +10% damage against elemental monsters.",apply(){player.elementDamageBonus+=.20;player.elementalEnemyDamage=(player.elementalEnemyDamage||0)+.10;}}
  );

  function achievementGateUnlocked(gate){
    if(!gate)return true;
    if(gate==="prestige10")return (meta.prestige?.count||0)>=10;
    if(gate==="road2")return isClassUnlocked("clown");
    if(gate==="road3")return !!meta.nightmareUnlocked;
    if(gate==="road4")return (meta.board4Clears||0)>0;
    if(gate==="nature_master")return (meta.elementProgress?.nature||0)>=PET_UNLOCK_REQUIREMENT;
    return !!meta.achievements?.[gate];
  }
  function eligibleUpgrades(filter=()=>true){return upgrades.filter(u=>{const classOk=!u.classId&&!u.classIds||player.classId==="slime"||u.classId===player.classId||(u.classIds||[]).includes(player.classId);return classOk&&achievementGateUnlocked(u.achievementGate)&&(!u.unique||!(player.upgradeCounts?.[u.id]))&&filter(u);});}

  function baseClassUnlocked(id){
    if(id==="ranger")return true;if(meta.unlocks?.[id])return true;
    if(id==="rouge")return (meta.prestige?.count||0)>=10;
    if(id==="berserker")return (meta.damageTaken||0)>=1000;
    if(id==="d20")return (meta.pets?.neutral?.level||1)>=30;
    if(id==="ceo")return false;if(id==="merchant")return (meta.merchantKills||0)>=5;
    return false;
  }
  function checkDynamicClassUnlocks(){
    if((meta.pets?.neutral?.level||1)>=30)unlockClass("d20");
    if(gameStarted&&player.defense>40)unlockClass("turtle");
    if(gameStarted&&player.doubleStrike>=1.5)unlockClass("frog");
    if(gameStarted&&player.lifeSteal>1)unlockClass("vampire");
    if(gameStarted&&player.crit>1)unlockClass("ninja");
    if(gameStarted&&player.bossDamage>=1.5)unlockClass("ceo");
    if((meta.prestige?.count||0)>=10)unlockClass("rouge");
    if((meta.damageTaken||0)>=1000)unlockClass("berserker");
    if((meta.merchantKills||0)>=5)unlockClass("merchant");
    if(Object.keys(CLASSES).filter(k=>!PUBLIC_SLIME_EXEMPT.has(k)&&!CLASSES[k].secret).every(baseClassUnlocked))unlockClass("slime");
  }

  function playElementAnimation(key,target=currentEnemy,enemySource=false){
    const head=document.querySelector("#combatOverlay .combat-head");if(!head||!ELEMENTS[key])return;
    const el=document.createElement("div");el.className=`element-proc-fx ${key}`;
    const art={fire:"🔥☄️",ice:"❄️✳️",electric:"⚡⚡",light:"✨☀️",void:"🕳️🌑",nature:"🌿🪴",donut:"🍩🍩🍩",tech:"🤖📡",metal:"🤘🎸",coffee:"☕💨",gun:"🔫💥"}[key]||ELEMENTS[key].icon;
    el.textContent=enemySource?`${ELEMENTS[key].icon} ${art}`:art;head.appendChild(el);setTimeout(()=>el.remove(),850);
  }

  function statusDotsHTML(barriers=0,poison=0,affinity=null){
    let html="";for(let i=0;i<Math.min(12,barriers||0);i++)html+='<i class="status-dot barrier" title="Barrier"></i>';
    for(let i=0;i<Math.min(16,poison||0);i++)html+='<i class="status-dot poison" title="Poison stack"></i>';
    if(affinity&&ELEMENTS[affinity])html+=`<i class="status-dot element" title="${ELEMENTS[affinity].name} affinity">${ELEMENTS[affinity].icon}</i>`;
    return html;
  }

  function renderEnemyParty(){
    const strip=$("enemyParty"),stage=$("enemyIcon");if(!strip||!stage)return;strip.innerHTML="";stage.className="fighter-icon enemy-stage-icons";
    stage.innerHTML=currentEnemies.map((e,i)=>`<span class="stage-enemy${i===currentEnemyIndex&&e.hp>0?" selected":""}${e.hp<=0?" defeated":""}" data-enemy-index="${i}" title="${e.name} · ${Math.max(0,e.hp)}/${e.maxHp} HP · ${e.defense||0} DEF${e.affinity?` · ${ELEMENTS[e.affinity].name}`:""}"><span class="stage-sprite">${e.icon}</span><span class="stage-affinity">${e.affinity?ELEMENTS[e.affinity].icon:""}</span><span class="stage-mini-status">${statusDotsHTML(e.enemyBarrier||0,e.poisonStacks||0)}</span></span>`).join("");
    currentEnemies.forEach((e,i)=>{const b=document.createElement("button");b.className=`enemy-chip${i===currentEnemyIndex&&e.hp>0?" active":""}${e.hp<=0?" dead":""}`;b.disabled=e.hp<=0;b.title=`${e.name} · ${Math.max(0,e.hp)}/${e.maxHp} HP · ${e.defense||0} DEF`;b.innerHTML=`<strong class="target-number">${i+1}</strong>`;b.addEventListener("click",()=>setCurrentEnemy(i));strip.appendChild(b);});
  }

  function updateCombatUI(){
    if(!currentEnemy)return;const weak=ELEMENTS[currentEnemy.weakness],aff=ELEMENTS[currentEnemy.affinity];
    $("enemyName").textContent=`Target ${currentEnemyIndex+1}: ${currentEnemy.name}`;
    $("enemyWeakness").textContent=`${weak?`Weakness: ${weak.icon} ${weak.name}`:"Weakness: Unknown"}${aff?` · Affinity: ${aff.icon} ${aff.name}`:" · No elemental affinity"}`;
    $("combatPlayerHp").textContent=`${Math.round(player.hp)} / ${Math.round(player.maxHp)}`;$("combatPlayerFill").style.width=`${clamp(player.hp/player.maxHp*100,0,100)}%`;
    $("enemyHpText").textContent=`${Math.max(0,currentEnemy.hp)} / ${currentEnemy.maxHp} · ${currentEnemy.defense||0} DEF`;$("enemyHpFill").style.width=`${clamp(currentEnemy.hp/currentEnemy.maxHp*100,0,100)}%`;
    if($("playerStatusDots"))$("playerStatusDots").innerHTML=statusDotsHTML(player.combatShield||0,0,null);
    if($("enemyStatusDots"))$("enemyStatusDots").innerHTML=statusDotsHTML(currentEnemy.enemyBarrier||0,currentEnemy.poisonStacks||0,currentEnemy.affinity);
    $("attackBtn").disabled=combatBusy;$("guardBtn").disabled=combatBusy||player.guardCooldown>0;$("guardBtn").textContent=player.guardCooldown>0?"🛡️ Guard (1 turn)":"🛡️ Guard";$("potionBtn").disabled=combatBusy||player.potions<=0||player.hp>=player.maxHp;$("ultimateBtn").disabled=combatBusy||player.ultimateCharge<100;$("ultimateBtn").textContent=`${CLASSES[player.classId].ultimate.icon} ${CLASSES[player.classId].ultimate.name}`;
    $("ultimateBtn").dataset.tip=CLASSES[player.classId].ultimate.desc;$("attackBtn").dataset.tip=`Attack the selected enemy. Echo ${Math.round(player.doubleStrike*100)}%, Crit ${Math.round(player.crit*100)}%; every strike rolls crit, Poison and elements separately.`;$("guardBtn").dataset.tip=`Reduce ordinary attacks by ${Math.round(player.guardPower*100)}% and gain ${player.ultimateGuardGain} ultimate. Guardian specials ignore Dodge and barriers, but Guard reduces them.`;$("potionBtn").dataset.tip=`Restore ${Math.round((12+Math.floor(player.level/2))*(1+player.potionPower))} HP using one potion.`;
    renderEnemyParty();updateBossSpecialIndicator();updateHUD();
  }

  function scaleEnemy(base,kind="normal",packSize=1){
    const progress=player.position/Math.max(1,currentTileCount()-1),global=(boardLevel-1)+progress,isMini=kind==="miniboss",isFinal=kind==="final",isMerchant=kind==="merchant",isBoss=isMini||isFinal||isMerchant,levelScale=1+(player.level-1)*.15+global*.84,boardScale=boardLevel===4?2.30:boardLevel===3?1.68:boardLevel===2?1.28:1,packHp=packSize>1?(packSize===2?.78:.66):1,packAtk=packSize>1?(packSize===2?.82:.70):1;
    let hp=Math.round(base.hp*levelScale*boardScale*(isFinal?2.65:isMini?1.66:isMerchant?2.9:1)*packHp),attack=Math.round(base.attack*(1+(player.level-1)*.095+global*.62)*(boardLevel===4?1.82:boardLevel===3?1.48:boardLevel===2?1.22:1)*(isFinal?1.27:isMini?1.12:isMerchant?1.5:1)*packAtk);const archetype=Number(base.defenseBias||0),roadArmor=global*(1.25+Math.max(0,archetype)*.16)+(boardLevel-1)*.75;let defense=Math.max(0,Math.floor(roadArmor+archetype+(isMini?2:isFinal?4:isMerchant?8:0)));if(nightmareMode){hp*=2;attack*=2;defense*=2;}
    const elementalChance=clamp(.04+global*.065+(nightmareMode?.18:0),.04,.62),affinity=isBoss?(base.affinity||pick(ELEMENT_KEYS)):(random()<elementalChance?pick(ELEMENT_KEYS):null),elementProcChance=affinity?clamp((isBoss?.28:.10)+global*.025+(nightmareMode?.08:0),.10,.55):0;
    const scaled={...base,hp,maxHp:hp,attack,defense,xp:Math.round(base.xp*(1+global*.72)*(isFinal?4.4:isMini?2.4:isMerchant?5:1)),gold:Math.round(base.gold*(1+global*.72)*(isFinal?4.5:isMini?2.5:isMerchant?5:1)),boss:isBoss,guardian:isBoss,miniBoss:isMini,finalBoss:isFinal,merchantBoss:isMerchant,skipTurns:0,poisonStacks:0,affinity,elementProcChance};
    if(boardLevel===6){const balance=db317Board(6).balance;scaled.hp=Math.round(scaled.hp*balance.extraHp);scaled.maxHp=scaled.hp;scaled.attack=Math.round(scaled.attack*balance.extraAttack);scaled.defense=Math.round((scaled.defense||0)*balance.extraDefenseMult+balance.extraDefenseFlat);if(kind==="miniboss"||kind==="final"){scaled.hp=Math.round(scaled.hp*balance.guardianHp);scaled.maxHp=scaled.hp;scaled.attack=Math.round(scaled.attack*balance.guardianAttack);}}
    if(scaled.name==="Cultist")scaled.lifeSteal=hellMode?.20:nightmareMode?.10:.01;
    return scaled;
  }

  function triggerElementEffect(key,target=currentEnemy,{forced=false,source="Weapon"}={}){
    if(!key||!ELEMENTS[key]||!target||target.hp<=0)return null;const item=player.equipment.weapon,e=ELEMENTS[key],weak=target.weakness===key,guaranteedRend=!forced&&item?.mythicPiece==="weapon"&&player.combatAttackCount>0&&player.combatAttackCount%5===0;
    if(!forced){if(!item||item.element!==key)return null;const setProc=v19SetProcBonus(),chance=clamp(.14+rarityValues[item.rarity]*.025+player.elementProcBonus+setProc+(weak?.22:0),0,.98);if(!guaranteedRend&&random()>=chance)return null;}
    playElementAnimation(key,target,false);const rendPower=guaranteedRend?1.65:1,setElementPower=v19SetElementPower(),mult=(weak?1.55+player.weaknessElementBonus:1)*(1+player.elementDamageBonus)*rendPower*setElementPower;let totalDamage=0,heal=0,extra=guaranteedRend?" Reality Rend guarantees and strengthens the activation.":"",aoe=["ice","light","nature","metal"].includes(key);const old=currentEnemy;currentEnemy=target;
    if(key==="fire")totalDamage=damageEnemy(target,player.attack*.65*mult);
    if(key==="ice"){totalDamage=damageAll(player.attack*.38*mult,.85);target.skipTurns=(target.skipTurns||0)+1;extra+=" Ice Nova damages the entire pack, but only the selected target is frozen.";}
    if(key==="electric")totalDamage=damageEnemy(target,player.attack*.90*mult);
    if(key==="light"){totalDamage=damageAll(player.attack*.52*mult,.75);heal=Math.min(player.maxHp-player.hp,Math.ceil(player.maxHp*(weak?.15:.09)*(1+player.elementDamageBonus)));player.hp+=heal;extra=heal?` Holy restores ${heal} HP.`:"";}
    if(key==="void")totalDamage=damageEnemy(target,Math.max(1,Math.min(target.maxHp*(weak?.14:.09)*mult,player.attack*4.5*mult)),true);
    if(key==="nature"){totalDamage=damageAll(player.attack*.30*mult,.8);const add=Math.max(1,player.naturePoisonStacks||1);livingEnemies().forEach(x=>x.poisonStacks=(x.poisonStacks||0)+add);extra=` Poison Vines add ${add} Poison stack${add===1?"":"s"} to every living enemy.`;}
    if(key==="donut"){heal=Math.min(player.maxHp-player.hp,Math.ceil(player.maxHp*(weak?.28:.18)*(1+player.elementDamageBonus)));player.hp+=heal;extra=` Healing donuts restore ${heal} HP.`;}
    if(key==="tech"){totalDamage=damageEnemy(target,player.attack*.42*mult);const cut=Math.max(1,Math.ceil(target.attack*(weak?.22:.14)*(1+player.elementDamageBonus)));target.attack=Math.max(1,target.attack-cut);extra=` Brain Hack lowers ${target.name}'s attack by ${cut}.`;}
    if(key==="metal"){totalDamage=damageAll(player.attack*.58*mult,.78);player.ultimateCharge=clamp(player.ultimateCharge+(weak?22:14),0,100);extra=" The riff charges your ultimate.";}
    if(key==="coffee"){totalDamage=damageEnemy(target,player.attack*.34*mult);player.hasteTurns+=1;player.ultimateCharge=clamp(player.ultimateCharge+8,0,100);extra=" Caffeinated Haste deals damage and grants another action.";}
    if(key==="gun"){const armorPierce=Math.ceil((target.defense||0)*.5);totalDamage=damageEnemy(target,player.attack*1.05*mult+armorPierce);extra=" Deadeye Volley ignores roughly half the target's Defense.";}
    currentEnemy=old?.hp>0?old:(livingEnemies()[0]||target);if(weak&&player.elementUltimateGain){player.ultimateCharge=clamp(player.ultimateCharge+player.elementUltimateGain,0,100);extra+=` Weakness Lore grants ${player.elementUltimateGain} ultimate charge.`;}
    const echoed=random()<clamp(player.elementEchoChance,0,.80);if(echoed){playElementAnimation(key,target,false);if(totalDamage){const echoTarget=target.hp>0?target:(livingEnemies()[0]||target),echoDamage=aoe?damageAll(Math.max(1,totalDamage/Math.max(1,currentEnemies.length)),.75):damageEnemy(echoTarget,totalDamage);totalDamage+=echoDamage;}if(heal){const more=Math.min(player.maxHp-player.hp,heal);player.hp+=more;heal+=more;}extra+=" Prismatic Echo repeats the effect!";}
    trackElementProgress(key,totalDamage+heal);const message=`${weak?"WEAKNESS! ":""}${e.icon} ${e.spell}${totalDamage?` deals ${totalDamage} elemental damage${aoe?" across the pack":""}.`:""}${extra}`;addLog(`<b>${e.spell}</b> ${source}${weak?" exploits a weakness":" activates"}${echoed?" and echoes":""}.`);showToast(`${e.icon} ${e.spell}${weak?" — WEAKNESS!":""}${echoed?" ×2":""}`);return {totalDamage,heal,message,weak,echoed,aoe};
  }

  function applyPoisonTick(){
    let total=0,notes=[];for(const e of livingEnemies()){const stacks=e.poisonStacks||0;if(!stacks)continue;const dmg=Math.max(1,Math.round(player.attack*(player.poisonStackPower||.12)*stacks));const dealt=damageEnemy(e,dmg,true);total+=dealt;notes.push(`${e.name}: ${dealt} (${stacks} stack${stacks===1?"":"s"})`);}
    if(total){playElementAnimation("nature",currentEnemy,false);setCombatText(`☠️ Poison ticks — ${notes.join(" · ")}.`);updateCombatUI();}return total;
  }

  function enemyElementProc(enemy){
    if(!enemy?.affinity||random()>enemy.elementProcChance)return "";const key=enemy.affinity,e=ELEMENTS[key];playElementAnimation(key,enemy,true);let note=`${e.icon} ${enemy.name} activates ${e.spell}: `;
    if(key==="fire"){const d=Math.max(1,Math.round(enemy.attack*.30));player.hp=Math.max(0,player.hp-d);note+=`${d} bonus fire damage.`;}
    else if(key==="ice"){player.ultimateCharge=Math.max(0,player.ultimateCharge-8);note+="your Ultimate loses 8 charge.";}
    else if(key==="electric"){const d=Math.max(1,Math.round(enemy.attack*.22));player.hp=Math.max(0,player.hp-d);player.ultimateCharge=Math.max(0,player.ultimateCharge-6);note+=`${d} shock damage and -6 Ultimate.`;}
    else if(key==="light"){const h=Math.min(enemy.maxHp-enemy.hp,Math.max(1,Math.ceil(enemy.maxHp*.08)));enemy.hp+=h;note+=`heals ${h} HP.`;}
    else if(key==="void"){const d=Math.max(1,Math.ceil(player.maxHp*.035));player.hp=Math.max(0,player.hp-d);note+=`${d} void damage based on your max HP.`;}
    else if(key==="nature"){const d=Math.max(1,Math.round(enemy.attack*.24));player.hp=Math.max(0,player.hp-d);note+=`vines deal ${d} bonus damage.`;}
    else if(key==="donut"){const h=Math.min(enemy.maxHp-enemy.hp,Math.max(1,Math.ceil(enemy.maxHp*.12)));enemy.hp+=h;note+=`heals ${h} HP with deeply unfair donuts.`;}
    else if(key==="tech"){player.ultimateCharge=Math.max(0,player.ultimateCharge-12);note+="Brain Hack drains 12 Ultimate charge.";}
    else if(key==="metal"){const d=Math.max(1,Math.round(enemy.attack*.28));player.hp=Math.max(0,player.hp-d);note+=`the riff deals ${d} sonic damage.`;}
    else if(key==="coffee"){const d=Math.max(1,Math.round(enemy.attack*.35));player.hp=Math.max(0,player.hp-d);note+=`Haste grants a rapid extra hit for ${d}.`;}
    else if(key==="gun"){const d=Math.max(1,Math.round(enemy.attack*.45));player.hp=Math.max(0,player.hp-d);note+=`a piercing shot deals ${d} damage.`;}
    addCombatHistory(note);return note;
  }

  async function enemyTurn(guarded,extraGuardPower=0){
    if(!currentEnemy)return;currentEncounterTurn++;let messages=[];const lead=currentEncounterLead,special=!!(lead?.guardian&&(lead.miniBoss||lead.finalBoss||lead.merchantBoss)&&lead.hp>0&&currentEncounterTurn%GUARDIAN_SPECIAL_INTERVAL===0);
    for(const enemy of livingEnemies()){
      if((enemy.skipTurns||0)>0&&!(special&&enemy===lead)){enemy.skipTurns--;messages.push(`${enemy.name} is frozen.`);continue;}let raw=0,landed=false;
      if(special&&enemy===lead){raw=Math.max(1,Math.round(enemy.attack*(enemy.merchantBoss?2.6:2.25))-Math.floor((player.defense+player.flatReduction)*.5));if(guarded)raw=Math.max(0,Math.floor(raw*(1-clamp(player.guardPower+extraGuardPower,0,.9))));if(mythicalSetCount()>=4)raw=Math.floor(raw*v19SetGuardianSpecialMult());messages.push(`⚠️ ${enemy.specialName||"Guardian special"} ignores dodge and barriers${guarded?", but Guard reduces it":""}, dealing ${raw}.`);if(enemy.merchantBoss){const stolen=Math.min(player.gold,Math.ceil(player.gold*.20));player.gold-=stolen;enemy.enemyBarrier=(enemy.enemyBarrier||0)+2;messages.push(`The Merchant steals ${stolen} gold and raises 2 barriers.`);}landed=raw>0;}
      else{if(random()<effectiveDodgeChance()){dbFriendSuccessfulDodgePresentation();messages.push(`You dodge ${enemy.name}.`);continue;}if(player.combatShield>0){player.combatShield--;messages.push(`Barrier blocks ${enemy.name}.`);continue;}raw=Math.max(1,enemy.attack-player.defense-player.flatReduction+rand(-1,1));if(guarded)raw=Math.max(0,Math.floor(raw*(1-clamp(player.guardPower+extraGuardPower,0,.9))));messages.push(guarded?`${enemy.name} hits your guard for ${raw}.`:`${enemy.name} hits for ${raw}.`);if(enemy.merchantBoss){const stolen=Math.min(player.gold,Math.max(1,Math.round(enemy.attack*.6)));player.gold-=stolen;messages.push(`The Merchant steals ${stolen} gold.`);}landed=raw>0;}
      player.hp=Math.max(0,player.hp-raw);meta.damageTaken=(meta.damageTaken||0)+raw;if(player.thorns>0&&raw>0){const returned=damageEnemy(enemy,player.thorns,true);messages.push(`Spikes return ${returned}.`);}if(landed&&!special){const proc=enemyElementProc(enemy);if(proc)messages.push(proc);}if(player.hp<=0)break;
    }
    if(special&&hasMythicPiece("hat")&&player.hp>0){const h=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.10)));player.hp+=h;player.ultimateCharge=clamp(player.ultimateCharge+25,0,100);messages.push(`👑 Crown of the Fourth Road restores ${h} HP and grants 25 ultimate.`);}if(hasMythicPiece("amulet")&&!player.mythicAmuletUsed&&player.hp>0&&player.hp/player.maxHp<=.35){player.mythicAmuletUsed=true;let consumed=0;livingEnemies().forEach(e=>{const d=Math.max(1,Math.floor(e.maxHp*.12));consumed+=damageEnemy(e,d,true);});const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.floor(consumed*.5)));player.hp+=healed;messages.push(`👁️ Devourer's Gaze consumes ${consumed} enemy HP and restores ${healed} HP.`);}checkDynamicClassUnlocks();saveMeta();sfx.hit();setCombatText(messages.join(" "));updateCombatUI();await delay(980);if(!livingEnemies().length)return winCombat();if(player.hp<=0)return handlePlayerDeath();combatBusy=false;updateCombatUI();setCombatText("Choose your next action.",false);
  }

  async function resolveEnemyResponse(guarded=false,extraGuardPower=0){
    await petTurn();if(!livingEnemies().length)return winCombat();applyPoisonTick();await delay(260);if(!livingEnemies().length)return winCombat();if(player.hasteTurns>0){player.hasteTurns--;combatBusy=false;setCombatText("☕ Haste! You act again before the enemy pack can respond.");updateCombatUI();return;}const allFrozen=livingEnemies().every(e=>(e.skipTurns||0)>0);if(allFrozen){livingEnemies().forEach(e=>e.skipTurns--);combatBusy=false;setCombatText("❄️ The entire enemy pack is frozen and loses its turn.");updateCombatUI();return;}await enemyTurn(guarded,extraGuardPower);
  }

  function resetPlayer(classId=selectedClassId){const cls=CLASSES[classId]||CLASSES.ranger;Object.assign(player,{classId:cls.id,position:0,level:1,xp:0,xpNext:20,hp:cls.base.maxHp,maxHp:cls.base.maxHp,attack:cls.base.attack,defense:cls.base.defense,gold:0,potions:1,crit:cls.base.crit,luck:cls.base.luck||0,postFightHeal:0,goldBonus:0,flatReduction:0,lifeSteal:cls.base.lifeSteal||0,doubleStrike:cls.base.doubleStrike||0,thorns:0,dodge:cls.base.dodge,potionPower:0,extraStepChance:0,xpBonus:0,bossDamage:cls.base.bossDamage||0,revives:0,berserk:0,execute:0,shopDiscount:0,blessingBonus:0,firstHitBlocks:0,damageBonus:0,combatShield:0,guardPower:cls.base.guardPower,classBurst:cls.base.classBurst,ultimateCharge:0,ultimateAttackGain:17,ultimateGuardGain:29,ultimateDamageBonus:0,petDamageBonus:0,petDoubleChance:0,legacyXpBonus:0,fastTravelBonus:0,cookieBondBonus:0,guardHeal:0,guardCounter:0,guardShield:0,guardDelay:0,guardCooldown:0,hasteTurns:0,firstAttackBonus:0,critUltimateGain:0,classUltimateBonus:0,combatAttackCount:0,combatActionCount:0,mythicActionCount:0,diceChoiceChance:0,elementProcBonus:0,elementDamageBonus:0,weaknessElementBonus:0,elementEchoChance:0,elementUltimateGain:0,classElementProcs:{},omniElementChance:0,defenseAttackScale:0,defenseDodgeScale:0,equipment:{},runBuffs:[],upgradeCounts:{},freeMerchantRun:false,echoDamageScale:.70,criticalEchoBonus:0,packDamageBonus:0,loadedSix:false,goldAttackScale:0,boardCheatDeaths:0,bloodOverheal:false,d20BonusChance:0,d20HighRollChance:0,poisonOnHitChance:0,poisonStackPower:.12,naturePoisonStacks:1,elementalEnemyDamage:0});applyTalentBonuses();(meta.heirlooms||[]).slice(0,getHeirloomSlots()).forEach(item=>equipItem(item,true));boardLevel=1;rolls=0;tilesMovedThisRun=0;pendingLevelUps=0;currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;currentMerchantItems=[];runFinalized=false;lastLegacyAward=0;lastGoldLegacyAward=0;merchantBossBattle=false;}

  function debugAction(action){if(action==="runxp"&&gameStarted)grantXp(250);if(action==="level"&&gameStarted)forceLevels(5);if(action==="legacy"){for(let i=0;i<5;i++){meta.level++;meta.points++;}meta.xpNext=legacyXpForLevel(meta.level);saveMeta();}if(action==="talents"){meta.points+=25;saveMeta();}if(action==="gold"&&gameStarted)player.gold+=5000;if(action==="cookies"){meta.petCookies+=25;saveMeta();}if(action==="heal"&&gameStarted){player.hp=player.maxHp;player.ultimateCharge=100;}if(action==="unlock"){Object.keys(CLASSES).forEach(k=>meta.unlocks[k]=true);Object.keys(meta.pets).forEach(k=>meta.pets[k].unlocked=true);saveMeta();renderClassChoices();}if(action==="mythic"&&gameStarted){equipItem(generateMythicalWeapon(),true);equipItem(generateMythicalBoots(),true);equipItem(generateMythicalPants(),true);equipItem(generateMythicalAmulet(),true);equipItem(generateMythicalHat(),true);}if(action==="dibo50"){meta.pets.neutral.level=30;saveMeta();checkDynamicClassUnlocks();}if(action==="nightmare"){meta.nightmareUnlocked=true;saveMeta();renderClassChoices();}if(/^board[234]$/.test(action)&&gameStarted){boardLevel=Number(action.slice(-1));player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");}if(action==="boss"&&gameStarted){$("debugOverlay").classList.add("hidden");player.position=currentTileCount()-1;refreshBoardHighlights();placePawn(false);rollLocked=true;dbBoardTileDispatch.dispatch();}updateMetaUI();if(gameStarted)updateHUD();showToast(`Debug: ${action}`);}

  /* SEMANTIC OWNER — Progression, achievements, board expansion and early run lifecycle. Migrated from the retired Alpha legacy stack in 3.1.6. */
  /* ---------- Alpha v1: achievements, classes, stats and combat polish ---------- */
  const ALPHA_COMBAT_DELAY=200;
  let runTalentSnapshot=null,statsLastHp=null,statsLastGold=null;
  const defaultLifetimeStats=()=>({runsStarted:0,runsFinished:0,fullVictories:0,deaths:0,rolls:0,tilesTraveled:0,damageDealt:0,healingDone:0,goldEarned:0,goldSpent:0,highestGold:0,enemiesDefeated:0,bossesDefeated:0,minibossesDefeated:0,powerupsTaken:0,highestRunLevel:1,boardClears:{},classMaxLevel:{}});
  function ensureAlphaMeta(){
    const base=defaultLifetimeStats(),raw=meta.stats||{};meta.stats={...base,...raw,boardClears:{...(raw.boardClears||{})},classMaxLevel:{...(raw.classMaxLevel||{})}};meta.stats.damageTaken=Math.max(Number(meta.stats.damageTaken)||0,Number(meta.damageTaken)||0);meta.achievements={...(meta.achievements||{})};return meta.stats;
  }
  function gameplayTalentRank(id){const source=runTalentSnapshot||meta.purchased||{};return Math.max(0,Number(source[id])||0);}
  function boardClearMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
  function boardClearKey(classId,board,mode=boardClearMode()){return `${classId}:${mode}:b${board}`;}
  function legacyBoardClearKey(classId,board){return `${classId}:b${board}`;}
  function hasBoardClear(classId,board){ensureAlphaMeta();return Object.entries(meta.stats.boardClears).some(([key,count])=>Number(count)>0&&(key===boardClearKey(classId,board,'normal')||key===boardClearKey(classId,board,'nightmare')||key===boardClearKey(classId,board,'hell')||key===legacyBoardClearKey(classId,board)));}
  function recordBoardClear(board,classId){const s=ensureAlphaMeta(),key=boardClearKey(classId,board);s.boardClears[key]=(s.boardClears[key]||0)+1;saveMeta();checkDynamicClassUnlocks();}
  function recordHealing(amount){amount=Math.max(0,Math.round(amount||0));if(!amount)return 0;const s=ensureAlphaMeta();s.healingDone+=amount;statsLastHp=player.hp;saveMeta();checkDynamicClassUnlocks();return amount;}
  function healPlayer(amount,{overheal=true}={}){
    amount=Math.max(0,Math.round(amount||0));if(!amount)return 0;const missing=Math.max(0,player.maxHp-player.hp),normal=Math.min(missing,amount);player.hp+=normal;let bonus=0;
    if(overheal&&player.bloodOverheal&&amount>normal){const room=Math.max(0,20-(player.bloodOverhealBonus||0));bonus=Math.min(room,amount-normal);if(bonus>0){player.bloodOverhealBonus=(player.bloodOverhealBonus||0)+bonus;player.maxHp+=bonus;player.hp+=bonus;}}
    recordHealing(normal+bonus);return normal+bonus;
  }
  function clearBloodOverhealTemp(){const bonus=Math.max(0,player.bloodOverhealBonus||0);if(!bonus)return;player.maxHp=Math.max(1,player.maxHp-bonus);player.hp=Math.min(player.hp,player.maxHp);player.bloodOverhealBonus=0;statsLastHp=player.hp;}
  function recordVitals(){if(!gameStarted)return;const s=ensureAlphaMeta();if(statsLastHp!=null&&player.hp>statsLastHp)recordHealing(player.hp-statsLastHp);statsLastHp=player.hp;if(statsLastGold!=null&&player.gold>statsLastGold)s.goldEarned+=player.gold-statsLastGold;statsLastGold=player.gold;s.highestGold=Math.max(s.highestGold,Math.floor(player.gold));s.highestRunLevel=Math.max(s.highestRunLevel,player.level);s.classMaxLevel[player.classId]=Math.max(s.classMaxLevel[player.classId]||1,player.level);}

  // Preserve v15 save compatibility while enriching imported saves with Alpha fields.
  const normalizeV15=v13NormalizeMeta;
  v13NormalizeMeta=function(raw={}){const out=normalizeV15(raw);const base=defaultLifetimeStats(),r=out.stats||{};out.version="Alpha v1";out.stats={...base,...r,boardClears:{...(r.boardClears||{})},classMaxLevel:{...(r.classMaxLevel||{})}};out.stats.damageTaken=Math.max(Number(out.stats.damageTaken)||0,Number(out.damageTaken)||0);out.achievements={...(out.achievements||{})};return out;};
  ensureAlphaMeta();

  // Four new public classes. Rouge remains the colour; Rogue is the thief.
  Object.assign(CLASSES,{
    cleric:{id:"cleric",name:"Cleric",icon:"⛪",attackIcon:"✨",fxIcon:"✝️✨",unlock:"Heal 1,000 HP across all runs",desc:"A holy sustain specialist. Blessed attacks can restore HP, Light effects are especially valuable, and Divine Reckoning heals while damaging the whole pack.",stats:"40 HP · 5 ATK · 2 DEF · HOLY SUSTAIN",scaleNotes:"Attack scales modestly; healing scales mainly from max HP and repeated actions. Defense and sustain make long guardian fights increasingly favorable.",ultimate:{name:"Divine Reckoning",icon:"☀️",desc:"Holy area damage plus a large self-heal. Overhealing can interact with effects that explicitly allow it."},base:{maxHp:40,attack:5,defense:2,crit:.06,dodge:.02,luck:.03,doubleStrike:.03,guardPower:.64,classBurst:.24,lifeSteal:0}},
    paladin:{id:"paladin",name:"Paladin",icon:"🛡️✨",attackIcon:"⚔️",fxIcon:"⚔️✨",unlock:"Defeat Board 3 with both Fighter and Cleric",desc:"A guardian hybrid that turns Defense into offense, shrugs off attrition and uses Aegis Judgment to damage, heal and raise barriers at once.",stats:"48 HP · 6 ATK · 4 DEF · DEFENSE SCALING",scaleNotes:"Basic attacks gain extra value from Defense. Guard, barriers and max HP scale its effective damage uptime more than raw Crit does.",ultimate:{name:"Aegis Judgment",icon:"⚜️",desc:"Heavy area damage scaling with Attack and Defense, restores HP and raises two barriers."},base:{maxHp:48,attack:6,defense:4,crit:.06,dodge:.01,luck:.02,doubleStrike:.02,guardPower:.74,classBurst:.20,lifeSteal:.02}},
    beastmaster:{id:"beastmaster",name:"Beastmaster",icon:"🐾",attackIcon:"🦴",fxIcon:"🐺➶",unlock:"Unlock every companion",desc:"A companion commander. Its own attacks are steady, but pet level, pet damage talents and double-pet attacks become a second damage engine.",stats:"38 HP · 6 ATK · 1 DEF · PET SCALING",scaleNotes:"Gains more from companion level and pet bonuses than most classes. Pack Call converts current pet damage directly into burst damage.",ultimate:{name:"Call of the Pack",icon:"🐺",desc:"Calls a spectral pack for area damage based on Attack plus several times your active companion's damage."},base:{maxHp:38,attack:6,defense:1,crit:.08,dodge:.06,luck:.05,doubleStrike:.06,guardPower:.56,classBurst:.20,lifeSteal:0}},
    rogue:{id:"rogue",name:"Rogue",icon:"🗡️",attackIcon:"🗡️",fxIcon:"🗡️💨",unlock:"Hold 4,000 gold at one time",desc:"The thief, not the colour. A high-crit evasive striker that rewards hoarding and opportunistic bursts, then steals even more money with Grand Larceny.",stats:"30 HP · 8 ATK · 22% CRIT · 14% DODGE",scaleNotes:"Raw Attack and Crit scale its burst fastest. Gold is also tactical fuel: some Rogue powers and its ultimate turn a rich purse into momentum.",ultimate:{name:"Grand Larceny",icon:"💎",desc:"A brutal single-target strike that steals gold after the hit."},base:{maxHp:30,attack:8,defense:0,crit:.22,dodge:.14,luck:.08,doubleStrike:.12,guardPower:.50,classBurst:.24,lifeSteal:.03}}
  });
  Object.assign(gearNames.weapon,{cleric:["Pilgrim Mace","Sunlit Crozier","Reliquary Hammer"],paladin:["Oathblade","Sunsteel Sword","Aegis Hammer"],beastmaster:["Pack Spear","Beast Hook","Alpha Whip"],rogue:["Cutpurse Dirk","Night Knife","Guild Stiletto"]});
  Object.assign(gearNames.offhand,{cleric:["Prayer Book","Saintly Censer","Sun Disc"],paladin:["Aegis Shield","Oathbound Buckler","Lion Ward"],beastmaster:["Whistle of Command","Treat Satchel","Pack Totem"],rogue:["Lockpick Roll","Smoke Satchel","Second Dagger"]});
  for(const slot of ["boots","legs","chest","hat","ring","amulet"]){gearNames[slot]=gearNames[slot]||{};gearNames[slot].cleric=[`Consecrated ${SLOT_LABELS[slot]}`];gearNames[slot].paladin=[`Oathbound ${SLOT_LABELS[slot]}`];gearNames[slot].beastmaster=[`Packlord ${SLOT_LABELS[slot]}`];gearNames[slot].rogue=[`Guild ${SLOT_LABELS[slot]}`];}

  // Class powers and achievement-hidden Legendaries.
  upgrades.push(
    {id:"cleric_benediction",classId:"cleric",rarity:"uncommon",icon:"🙏",name:"Benediction",desc:"Blessed attack heals are 3 HP stronger and Guard restores 3 HP.",apply(){player.clericHealBonus=(player.clericHealBonus||0)+3;player.guardHeal+=3;}},
    {id:"cleric_radiance",classId:"cleric",rarity:"rare",icon:"☀️",name:"Radiant Doctrine",desc:"Gain +12% Light activation and +20% elemental power.",apply(){player.classElementProcs.light=(player.classElementProcs.light||0)+.12;player.elementDamageBonus+=.20;}},
    {id:"cleric_saint",classId:"cleric",rarity:"legendary",achievementGate:"heal1000",icon:"👼",name:"Saint of a Thousand Wounds",desc:"Achievement-locked: +30 max HP, +25% Light activation and every victory heals 10 HP.",apply(){player.maxHp+=30;player.hp+=30;player.classElementProcs.light=(player.classElementProcs.light||0)+.25;player.postFightHeal+=10;}},
    {id:"paladin_smite",classId:"paladin",rarity:"rare",icon:"⚜️",name:"Oathbound Smite",desc:"Add 70% of Defense to basic and Echo attacks.",apply(){player.defenseAttackScale+=.70;}},
    {id:"paladin_citadel",classId:"paladin",rarity:"legendary",achievementGate:"paladin_oath",icon:"🏰✨",name:"Walking Sanctuary",desc:"Achievement-locked: +5 Defense, +25 max HP and begin every battle with two extra barriers.",apply(){player.defense+=5;player.maxHp+=25;player.hp+=25;player.firstHitBlocks+=2;}},
    {id:"beastmaster_pack",classId:"beastmaster",rarity:"rare",icon:"🐾",name:"Pack Discipline",desc:"Pet attacks deal +6 damage and gain +20% double-attack chance.",apply(){player.petDamageBonus+=6;player.petDoubleChance+=.20;}},
    {id:"beastmaster_alpha",classId:"beastmaster",rarity:"legendary",achievementGate:"menagerie",icon:"🐺👑",name:"Alpha of Every Road",desc:"Achievement-locked: +10 pet damage, +30% pet double chance and +3 Attack.",apply(){player.petDamageBonus+=10;player.petDoubleChance+=.30;player.attack+=3;}},
    {id:"rogue_backstab",classId:"rogue",rarity:"rare",icon:"🗡️💰",name:"Profitable Backstab",desc:"Gain +14% Crit and attacks add 0.2% of current gold as effective Attack.",apply(){player.crit+=.14;player.goldAttackScale=Math.max(player.goldAttackScale||0,.002);}},
    {id:"rogue_kingpin",classId:"rogue",rarity:"legendary",achievementGate:"gold1500",icon:"💎🗡️",name:"Kingpin's Cut",desc:"Achievement-locked: +5 Attack, +20% Crit, +20% Echo and +50% gold.",apply(){player.attack+=5;player.crit+=.20;player.doubleStrike+=.20;player.goldBonus+=.50;}},
    {id:"ranger_crownshot",classId:"ranger",rarity:"legendary",achievementGate:"ranger_b1",icon:"🏹👑",name:"Crownshot",desc:"Achievement-locked: +15% Crit, +20% Boss Damage and Arrow Storm gains another +50% damage.",apply(){player.crit+=.15;player.bossDamage+=.20;player.classUltimateBonus+=.50;}},
    {id:"sorcerer_starcovenant",classId:"sorcerer",rarity:"legendary",achievementGate:"sorcerer_b2",icon:"🌠🔮",name:"Star Covenant",desc:"Achievement-locked: +20% element power, +20% Echo and Starfall gains another +50% damage.",apply(){player.elementDamageBonus+=.20;player.doubleStrike+=.20;player.classUltimateBonus+=.50;}},
    {id:"slime_apotheosis",classId:"slime",rarity:"legendary",achievementGate:"slime_lvl5",icon:"🟢👑",name:"Royal Jelly",desc:"Achievement-locked: +25 max HP, +4 Attack and +18% Echo Strike.",apply(){player.maxHp+=25;player.hp+=25;player.attack+=4;player.doubleStrike+=.18;}}
  );
  const goldenLaw=upgrades.find(u=>u.id==="legendary_golden_law");if(goldenLaw){goldenLaw.achievementGate="merchant1";goldenLaw.desc="Achievement-locked: defeat the Road Merchant once. Gain +100% gold and every 100 gold grants +1 attack for this run.";}

  const gateV15=achievementGateUnlocked;
  achievementGateUnlocked=function(gate){
    if(!gate)return true;ensureAlphaMeta();if(gate==="merchant1")return (meta.merchantKills||0)>=1;if(gate==="ranger_b1")return hasBoardClear("ranger",1);if(gate==="sorcerer_b2")return hasBoardClear("sorcerer",2);if(gate==="slime_lvl5")return (meta.stats.classMaxLevel.slime||0)>=5;if(gate==="heal1000")return meta.stats.healingDone>=1000;if(gate==="gold1500")return meta.stats.highestGold>=4000;if(gate==="menagerie")return Object.values(meta.pets||{}).every(p=>p.unlocked);if(gate==="paladin_oath")return hasBoardClear("fighter",3)&&hasBoardClear("cleric",3);return gateV15(gate);};

  baseClassUnlocked=function(id){
    ensureAlphaMeta();if(id==="ranger")return true;if(meta.unlocks?.[id])return true;if(id==="rouge")return (meta.prestige?.count||0)>=10;if(id==="berserker")return (meta.damageTaken||0)>=1000;if(id==="d20")return (meta.pets?.neutral?.level||1)>=30;if(id==="ceo")return false;if(id==="merchant")return (meta.merchantKills||0)>=5;if(id==="cleric")return meta.stats.healingDone>=1000;if(id==="paladin")return hasBoardClear("fighter",3)&&hasBoardClear("cleric",3);if(id==="beastmaster")return Object.values(meta.pets||{}).every(p=>p.unlocked);if(id==="rogue")return meta.stats.highestGold>=4000;return false;
  };
  checkDynamicClassUnlocks=function(){
    ensureAlphaMeta();if((meta.pets?.neutral?.level||1)>=30)unlockClass("d20");if(gameStarted&&player.defense>40)unlockClass("turtle");if(gameStarted&&player.doubleStrike>=1.5)unlockClass("frog");if(gameStarted&&player.lifeSteal>1)unlockClass("vampire");if(gameStarted&&player.crit>1)unlockClass("ninja");if(gameStarted&&player.bossDamage>=3)unlockClass("ceo");if((meta.prestige?.count||0)>=10)unlockClass("rouge");if((meta.damageTaken||0)>=1000)unlockClass("berserker");if((meta.merchantKills||0)>=5)unlockClass("merchant");if(meta.stats.healingDone>=1000)unlockClass("cleric");if(hasBoardClear("fighter",3)&&hasBoardClear("cleric",3))unlockClass("paladin");if(Object.values(meta.pets||{}).every(p=>p.unlocked))unlockClass("beastmaster");if(meta.stats.highestGold>=4000||gameStarted&&player.gold>=4000)unlockClass("rogue");if(Object.keys(CLASSES).filter(k=>!PUBLIC_SLIME_EXEMPT.has(k)&&!CLASSES[k].secret).every(baseClassUnlocked))unlockClass("slime");
  };
  CLASSES.ceo.unlock="Secret: reach 300% Boss Damage";
  Object.assign(CLASSES.ranger,{scaleNotes:"Attack is the core stat; Crit is unusually valuable because Ranger starts high and Arrow Storm scales directly from Attack. Echo adds more independent arrows between ultimates, while Dodge keeps the glassier hunter alive."});
  Object.assign(CLASSES.sorcerer,{scaleNotes:"Attack and elemental power drive spell damage. Channel Bolt still rolls normal Crit/Echo chains, while Arcane Lance converts half of your total Echo Strike chance into bonus Lance damage and applies Lifesteal to the spell plus its forced elemental eruption. Arcane Surge is the Sorcerer signature burst: each basic or Echo strike has your Signature Burst chance to deal 50% more strike damage. Starfall rewards both Attack and sustain/lifesteal."});
  Object.assign(CLASSES.fighter,{scaleNotes:"Defense is both survival and, with several Fighter powers, offense. Attack still raises baseline damage, but Guard/barrier uptime and Defense scaling are the class's defining growth path."});
  Object.assign(CLASSES.monk,{scaleNotes:"Attack, Echo Strike and Dodge work together: more Echo means more hits and ultimate charge opportunities, while sustain lets Monk survive long enough to exploit them. Hundred Fists scales mostly from Attack."});
  Object.assign(CLASSES.clown,{scaleNotes:"Luck, Crit and Echo are the main chaos multipliers. Clown has high variance rather than one clean stat curve; more Luck also improves the road rewards that feed the build."});
  Object.assign(CLASSES.rouge,{scaleNotes:"Rouge—the colour—likes Attack, Crit and Lifesteal. Its crimson bursts become safer as Lifesteal rises, and Crimson Deluge rewards a damage-heavy build that can immediately drink back lost HP."});
  Object.assign(CLASSES.berserker,{scaleNotes:"Every 1% missing HP grants +1% damage as Rage. Attack raises the base damage while Max HP and Lifesteal help you live in the dangerous high-Rage range."});
  Object.assign(CLASSES.turtle,{scaleNotes:"Defense is the premium stat: it drastically improves survival and can be converted into damage. Turtle scales slowly with raw Attack but explosively once Defense-based powers stack."});
  Object.assign(CLASSES.frog,{scaleNotes:"Echo Strike is the primary engine. Values above 100% create guaranteed extra hits, and Croak Cascade converts high Echo into more jumps. Attack still determines how hard each jump lands."});
  Object.assign(CLASSES.d20,{scaleNotes:"Probability is the mechanic. Attack supplies the floor, while Crit, Echo and Luck make high D20 outcomes increasingly absurd. Exact high-roll interactions remain intentionally undocumented."});
  Object.assign(CLASSES.slime,{scaleNotes:"Slime has no exclusive scaling rule; its strength is access to the broad shared/class power pool. It can become whatever the run offers—Attack bruiser, Echo machine, elemental build or sustain blob."});
  Object.assign(CLASSES.vampire,{scaleNotes:"Lifesteal is the signature multiplier because every damage increase also becomes healing. Attack, Crit and Echo therefore double as sustain stats. Blood Moon can turn excess healing into temporary battle HP."});
  Object.assign(CLASSES.ninja,{scaleNotes:"Crit is king: overflow above 100% creates additional guaranteed critical tiers. Attack multiplies those tiers, while Echo supplies more chances to exploit them. Dodge compensates for very low base durability."});
  Object.assign(CLASSES.ceo,{scaleNotes:"Boss Damage is both an unlock identity and a major multiplier. Gold can become direct combat value through executive powers, so economic growth and guardian specialization feed each other."});
  Object.assign(CLASSES.merchant,{scaleNotes:"Gold is a combat stat. Several attacks and weapons convert the purse directly into damage, while Luck and gold bonuses accelerate the economy that powers the class."});

  // Ranger gets a real tiny portrait instead of only an emoji.
  function rangerPortraitSVG(){return `<svg viewBox="0 0 64 64" role="img" aria-label="Ranger portrait"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2e7d4f"/><stop offset="1" stop-color="#123b32"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#10263a"/><path d="M13 48c7-12 12-17 19-17s13 5 19 17v12H13z" fill="url(#rg)"/><path d="M19 29c2-13 8-20 15-20 8 0 13 8 14 21-6-5-22-5-29-1z" fill="#285f3d"/><path d="M24 23c2-5 6-8 10-8 5 0 8 3 10 9l-3 14H27z" fill="#d7a66b"/><path d="M27 30c4 3 10 3 14 0-1 8-4 12-7 12-4 0-6-4-7-12z" fill="#9b5d3d" opacity=".9"/><circle cx="30" cy="27" r="1.6" fill="#1a2730"/><circle cx="39" cy="27" r="1.6" fill="#1a2730"/><path d="M47 12c8 7 7 24 1 36" fill="none" stroke="#bf8a46" stroke-width="3" stroke-linecap="round"/><path d="M47 14l8 3-7 4" fill="#d7dfe8"/><path d="M49 17L19 50" stroke="#d9c3a0" stroke-width="1.5" opacity=".8"/></svg>`;}
  const updateHUDV15=updateHUD;updateHUD=function(){recordVitals();updateHUDV15();const avatar=$("heroAvatar");if(player.classId==="ranger"){avatar.classList.add("ranger-portrait");avatar.innerHTML=rangerPortraitSVG();}else{avatar.classList.remove("ranger-portrait");avatar.textContent=CLASSES[player.classId]?.icon||"🎲";}checkDynamicClassUnlocks();};

  // Snapshot talent ranks when a run begins; purchases made mid-run stay queued.
  const getHeirloomSlotsV15=getHeirloomSlots;getHeirloomSlots=function(){const source=runTalentSnapshot;if(!source)return getHeirloomSlotsV15();return 1+(Number(source.legacy_heirloom)||0)+((meta.prestige?.count||0)>=20?1:0);};
  const resetPlayerV15=resetPlayer;resetPlayer=function(classId=selectedClassId){runTalentSnapshot=JSON.parse(JSON.stringify(meta.purchased||{}));resetPlayerV15(classId);player.bloodOverhealBonus=0;player.clericHealBonus=0;if(gameplayTalentRank("element_prismatic")&&!player.equipment.weapon){const pr=gameplayTalentRank("element_prismatic"),rr=pr>=3?"rare":pr>=2?"uncommon":"common",starter=generateEquipment(rr,"weapon");starter.provenance="prismatic-birthright";starter.heirloomEligible=false;starter.element=pick(ELEMENT_KEYS);starter.name=`Prismatic ${starter.name}`;equipItem(starter,true);recordRunBuff("🌈","Prismatic Birthright",`Rank ${pr} started with ${starter.name}: ${elementSummary(starter)}`,"legacy","Element Talent");}if(classIdentityActive("beastmaster")){player.petDamageBonus+=4;player.petDoubleChance+=.10;}if(classIdentityActive("paladin"))player.defenseAttackScale+=.35;statsLastHp=player.hp;statsLastGold=player.gold;};
  const openStartScreenV15=openStartScreen;openStartScreen=function(){runTalentSnapshot=null;openStartScreenV15();};

  // Lifetime damage is measured centrally so pets, poison, elements, basic hits and ultimates all count.
  const damageEnemyV15=damageEnemy;damageEnemy=function(enemy,amount,ignoreDefense=false){const dealt=damageEnemyV15(enemy,amount,ignoreDefense);if(gameStarted&&dealt>0){ensureAlphaMeta().damageDealt+=dealt;}return dealt;};
  const applyUpgradeV15=applyUpgrade;applyUpgrade=function(up,source="Powerup"){const result=applyUpgradeV15(up,source);ensureAlphaMeta().powerupsTaken++;saveMeta();return result;};
  const strikeBaseDamageV15=strikeBaseDamage;strikeBaseDamage=function(echo=false,chaos=null){const out=strikeBaseDamageV15(echo,chaos);if(classIdentityActive("cleric")&&random()<player.classBurst){out.damage=Math.round(out.damage*1.25);const h=healPlayer(3+(player.clericHealBonus||0));out.burst=`Blessed Strike${h?` (+${h} HP)`:""}! `;}if(classIdentityActive("paladin")&&random()<player.classBurst){out.damage+=Math.round(player.defense*.9);out.burst="Oath Smite! ";}if(classIdentityActive("beastmaster")&&random()<player.classBurst){out.damage+=Math.round(petDamage()*.75);out.burst="Pack Assist! ";}if(classIdentityActive("rogue")&&random()<player.classBurst){out.damage=Math.round(out.damage*1.75);out.burst="Backstab! ";}return out;};

  // Blood Moon/Crimson Eclipse overheal fix and guardian freeze cooldown.
  const triggerElementEffectV15=triggerElementEffect;triggerElementEffect=function(key,target=currentEnemy,opts={}){
    if(key!=="ice"&&key!=="light"&&key!=="donut")return triggerElementEffectV15(key,target,opts);
    if(!key||!ELEMENTS[key]||!target||target.hp<=0)return null;const {forced=false,source="Weapon"}=opts,item=player.equipment.weapon,e=ELEMENTS[key],weak=target.weakness===key,guaranteedRend=!forced&&item?.mythicPiece==="weapon"&&player.combatAttackCount>0&&player.combatAttackCount%5===0;if(!forced){if(!item||item.element!==key)return null;const setProc=v19SetProcBonus(),chance=clamp(.14+rarityValues[item.rarity]*.025+player.elementProcBonus+setProc+(weak?.22:0),0,.98);if(!guaranteedRend&&random()>=chance)return null;}
    playElementAnimation(key,target,false);const rendPower=guaranteedRend?1.65:1,setElementPower=v19SetElementPower(),mult=(weak?1.55+player.weaknessElementBonus:1)*(1+player.elementDamageBonus)*rendPower*setElementPower;let totalDamage=0,heal=0,extra=guaranteedRend?" Reality Rend guarantees and strengthens the activation.":"",aoe=true,old=currentEnemy;currentEnemy=target;
    if(key==="ice"){totalDamage=damageAll(player.attack*.38*mult,.85);if(target.guardian){if((target.freezeCooldown||0)<=0){target.skipTurns=(target.skipTurns||0)+1;target.freezeCooldown=2;extra+=" The guardian is frozen; Ice Nova cannot freeze it again until it has recovered.";}else extra+=` The guardian resists the freeze (${target.freezeCooldown} response${target.freezeCooldown===1?"":"s"} of freeze resistance remain).`;}else{target.skipTurns=(target.skipTurns||0)+1;extra+=" The selected target is frozen.";}}
    if(key==="light"){totalDamage=damageAll(player.attack*.52*mult,.75);heal=healPlayer(Math.ceil(player.maxHp*(weak?.15:.09)*(1+player.elementDamageBonus)));extra=heal?` Holy restores ${heal} HP.`:"";}
    if(key==="donut"){heal=healPlayer(Math.ceil(player.maxHp*(weak?.28:.18)*(1+player.elementDamageBonus)));extra=` Healing donuts restore ${heal} HP.`;}
    currentEnemy=old?.hp>0?old:(livingEnemies()[0]||target);if(weak&&player.elementUltimateGain){player.ultimateCharge=clamp(player.ultimateCharge+player.elementUltimateGain,0,100);extra+=` Weakness Lore grants ${player.elementUltimateGain} ultimate charge.`;}const echoed=random()<clamp(player.elementEchoChance,0,.80);if(echoed){playElementAnimation(key,target,false);if(totalDamage){const echoTarget=target.hp>0?target:(livingEnemies()[0]||target),echoDamage=damageAll(Math.max(1,totalDamage/Math.max(1,currentEnemies.length)),.75);totalDamage+=echoDamage;}if(heal){heal+=healPlayer(heal);}extra+=" Prismatic Echo repeats the effect!";}trackElementProgress(key,totalDamage+heal);const message=`${weak?"WEAKNESS! ":""}${e.icon} ${e.spell}${totalDamage?` deals ${totalDamage} elemental damage${aoe?" across the pack":""}.`:""}${extra}`;addLog(`<b>${e.spell}</b> ${source}${weak?" exploits a weakness":" activates"}${echoed?" and echoes":""}.`);showToast(`${e.icon} ${e.spell}${weak?" — WEAKNESS!":""}${echoed?" ×2":""}`);return {totalDamage,heal,message,weak,echoed,aoe};
  };
  const resolveEnemyResponseV15=resolveEnemyResponse;resolveEnemyResponse=async function(guarded=false,extraGuardPower=0){livingEnemies().forEach(e=>{if((e.freezeCooldown||0)>0)e.freezeCooldown--;});return resolveEnemyResponseV15(guarded,extraGuardPower);};

  // Custom ultimate art for the new classes.
  animateUltimate=async function(){const fx=$("attackFx"),enemy=$("enemyIcon");fx.className="attack-fx";void fx.offsetWidth;fx.textContent=({fighter:"⚔️",ranger:"➶➶➶➶",sorcerer:"☄️",monk:"👊👊👊👊",clown:"🎪🐔💥",rouge:"🌹🩸",berserker:"🌋🪓",turtle:"🐚💥",frog:"🐸🐸🐸",d20:"🎲20!",slime:"🟢🌊",vampire:"🌑🩸🦇",ninja:"🌘🗡️🗡️",ceo:"📉💥",merchant:"🏦🪙⚖️",cleric:"☀️✝️",paladin:"⚜️🛡️",beastmaster:"🐺🐾🐺",rogue:"💎🗡️"}[player.classId]||"💥");fx.classList.add(`ultimate-${player.classId}`);sfx.holy();await delay(({sorcerer:760,monk:690,clown:790,rouge:730,berserker:760,cleric:720,paladin:720,beastmaster:760,rogue:690}[player.classId]||620)+ALPHA_COMBAT_DELAY);enemy.classList.add("enemy-hit");await delay(190);enemy.classList.remove("enemy-hit");};

  useUltimate=async function(){
    if(combatBusy||!currentEnemy||player.ultimateCharge<100)return;combatBusy=true;player.guardCooldown=0;player.ultimateCharge=0;const chaos=await rollD20Chaos("ultimate");updateCombatUI();await animateUltimate();let damage=0,text="",aoe=["ranger","sorcerer","clown","berserker","turtle","slime","vampire","ceo","merchant","cleric","paladin","beastmaster"].includes(player.classId),twoTarget=false;
    if(player.classId==="fighter"){damage=Math.round(player.attack*2.6)+rand(2,5);player.combatShield+=1+(player.titanCleaveBarrierBonus||0);twoTarget=true;text=`Titan Cleave hits up to two enemies for {DAMAGE} total damage and raises ${1+(player.titanCleaveBarrierBonus||0)} barrier${(1+(player.titanCleaveBarrierBonus||0))===1?"":"s"}.`;}else if(player.classId==="ranger"){damage=Math.round(player.attack*3.4)+rand(3,7);text="Arrow Storm sweeps the pack for {DAMAGE}.";}else if(player.classId==="sorcerer"){damage=Math.round(player.attack*3)+rand(4,8);text="Starfall crashes across the pack for {DAMAGE}.";}else if(player.classId==="monk"){damage=Math.round(player.attack*3.25)+rand(3,7);const h=healPlayer(Math.ceil(player.maxHp*.10));text=`Hundred Fists deals {DAMAGE} and restores ${h} HP.`;}else if(player.classId==="clown"){damage=Math.round(player.attack*(rand(240,420)/100))+rand(2,10);text="Final Punchline devastates the pack for {DAMAGE}.";}else if(player.classId==="berserker"){damage=Math.round(player.attack*2.8)+rand(5,10);text="Ragequake shatters the pack for {DAMAGE}.";}else if(player.classId==="turtle"){damage=Math.round((player.attack+player.defense)*2.4)+rand(4,8);player.combatShield+=2;text="Shellquake deals {DAMAGE} and grants two barriers.";}else if(player.classId==="frog"){const jumps=6+Math.floor(player.doubleStrike*4),scale=.75+player.doubleStrike*.55;let dealt=0;for(let i=0;i<jumps&&livingEnemies().length;i++){const t=pick(livingEnemies());dealt+=damageEnemy(t,(player.attack+rand(0,2))*scale);await animateClassAttack(i?"echo":"normal");await delay(ALPHA_COMBAT_DELAY);}text=`Croak Cascade converts ${Math.round(player.doubleStrike*100)}% Echo into ${jumps} jumps for ${dealt} total damage.`;damage=0;}else if(player.classId==="d20"){damage=Math.round(player.attack*(2.1+chaos.roll*.12))+rand(1,chaos.roll||1);aoe=chaos.roll>=15;text="Natural Twenty warps probability for {DAMAGE}.";}else if(player.classId==="slime"){damage=Math.round(player.attack*2.7)+rand(3,8);text="Ooze Everything washes over the pack for {DAMAGE}.";}else if(player.classId==="vampire"){damage=Math.round(player.attack*3.15)+rand(4,9);text="Crimson Eclipse drains the pack for {DAMAGE}.";}else if(player.classId==="ninja"){let dealt=0;for(let i=0;i<5&&livingEnemies().length;i++){const t=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],crit=rollTieredProc(player.crit)+1,d=Math.round(player.attack*.85*(1+crit));dealt+=damageEnemy(t,d);await animateClassAttack("crit");await delay(ALPHA_COMBAT_DELAY);}text=`Thousand Shadows lands five guaranteed critical strikes for ${dealt} total damage.`;damage=0;}else if(player.classId==="ceo"){damage=Math.round(player.attack*2.8+player.gold*.10)*(1+player.bossDamage);text="Quarterly Annihilation liquidates the pack for {DAMAGE}.";}else if(player.classId==="merchant"){damage=Math.round(player.attack*3+player.gold*.20);player.gold+=50;player.combatShield+=2;text="Market Monopoly deals {DAMAGE}, grants 50 gold and raises two barriers.";}else if(player.classId==="cleric"){damage=Math.round(player.attack*2.45+player.maxHp*.16)+rand(3,7);const h=healPlayer(Math.ceil(player.maxHp*.28));text=`Divine Reckoning deals {DAMAGE} and restores ${h} HP.`;}else if(player.classId==="paladin"){damage=Math.round((player.attack+player.defense*.9)*2.65)+rand(3,8);player.combatShield+=2;const h=healPlayer(Math.ceil(player.maxHp*.15));text=`Aegis Judgment deals {DAMAGE}, restores ${h} HP and raises two barriers.`;}else if(classIdentityActive("beastmaster")){damage=Math.round(player.attack*2+petDamage()*5.5)+rand(4,9);text="Call of the Pack tears through every enemy for {DAMAGE}.";}else if(player.classId==="rogue"){damage=Math.round(player.attack*4.1+player.gold*.025)+rand(4,10);const stolen=75+Math.floor(player.level*5);player.gold+=stolen;text=`Grand Larceny strikes for {DAMAGE} and steals ${stolen} gold.`;}else{damage=Math.round(player.attack*3.1)+rand(4,8);text="Crimson Deluge paints the battlefield for {DAMAGE}.";}
    damage=Math.round(damage*(chaos.mult||1)*(1+player.classUltimateBonus)*(1+player.ultimateDamageBonus)*(1+player.damageBonus+(v19SetDamageBonus())));if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));let dealt=0;if(twoTarget){[currentEnemy,...livingEnemies().filter(e=>e!==currentEnemy)].slice(0,2).forEach((e,i)=>dealt+=damageEnemy(e,damage*(i?.85:1)));}else if(!["frog","ninja"].includes(player.classId))dealt=aoe?damageAll(damage,.78):damageEnemy(currentEnemy,damage);const proc=livingEnemies().length?triggerStrikeElements(currentEnemy,chaos):{totalDamage:0,message:""},drain=player.lifeSteal+(player.classId==="sorcerer"?.20:0)+(player.classId==="rouge"?.25:0)+(player.classId==="vampire"?.50:0),healAmount=drain>0&&(dealt+proc.totalDamage)>0?Math.max(1,Math.floor((dealt+proc.totalDamage)*drain)):0,healed=healPlayer(healAmount);const pants=applyMythicPantsPulse();text=text.replace("{DAMAGE}",dealt)+(proc.message?` ${proc.message}`:"")+(healed?` Lifesteal restores ${healed} HP.`:"")+(pants?` ${pants}`:"");setCombatText(text);sfx.crit();updateCombatUI();await delay(850);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);
  };

  // Board 4 is now intentionally cruel.
  const scaleEnemyV15=scaleEnemy;scaleEnemy=function(base,kind="normal",packSize=1){const e=scaleEnemyV15(base,kind,packSize);if(boardLevel===4){e.hp=Math.round(e.hp*1.45);e.maxHp=e.hp;e.attack=Math.round(e.attack*1.35);e.defense+=e.guardian?6:3;if(e.finalBoss){e.hp=Math.round(e.hp*1.12);e.maxHp=e.hp;e.attack=Math.round(e.attack*1.10);}}return e;};

  // Sovereign Relic now actually lets the player choose one of three Legendaries.
  const merchantCatalogV15=merchantCatalog;merchantCatalog=function(){const catalog=merchantCatalogV15();if(boardLevel===4){const relic=catalog.find(x=>x.id==="relic");if(relic){relic.desc="Choose one of three random Legendary powerups.";relic.alphaChooseLegendary=true;}}return catalog;};
  renderMerchant=function(){
    $("merchantGold").textContent=player.gold;const notice=$("merchantNotice");notice.classList.toggle("show",!!currentMerchantNotice);notice.innerHTML=currentMerchantNotice;const grid=$("shopGrid");grid.innerHTML="";currentMerchantItems.forEach(item=>{const price=merchantPrice(item.base),btn=document.createElement("button");btn.className=`shop-item${item.sold?" sold":""}`;btn.disabled=item.sold||player.gold<price;const comparison=item.gear?`<div class="shop-compare">${formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:"";btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${item.sold?"SOLD":price+"g"}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;btn.addEventListener("click",()=>{if(item.sold||player.gold<price)return;if(item.gear){const current=player.equipment[item.gear.slot];if(current&&gearPowerScore(item.gear)<gearPowerScore(current)&&!window.DiceboundPlatform.confirm(`${item.gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`))return;}player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);if(item.alphaChooseLegendary){currentMerchantNotice="👑 <b>Sovereign Relic purchased.</b> Choose one Legendary power.";renderMerchant();showPowerupChoice("Sovereign Relic",()=>{currentMerchantNotice="👑 <b>Sovereign Relic claimed.</b> The chosen Legendary is active for this run.";updateHUD();renderMerchant();},u=>u.rarity==="legendary","Choose one of three Legendary powers. This time the word choose is legally binding.");return;}const result=item.buy();if(item.id==="relic"&&result)currentMerchantNotice=`🔮 <b>Relic opened:</b> ${rarityInfo[result.rarity].label} <b>${result.name}</b><br>${result.desc}`;else if(item.gear)currentMerchantNotice=`🧰 Equipped <b>${item.gear.name}</b>.<br>${formatBonuses(item.gear)}`;if(["attack","armor","charm"].includes(item.id))recordRunBuff(item.icon,item.name,item.desc,"merchant","Merchant");showToast(item.id==="relic"&&result?`${rarityInfo[result.rarity].label}: ${result.name}`:item.name);updateHUD();renderMerchant();});grid.appendChild(btn);});
  };

  // Track board/class feats and keep the Merchant tile after the secret fight.
  const winCombatV15=winCombat;winCombat=async function(){const defeated=currentEncounterLead||currentEnemy,all=currentEnemies.length?[...currentEnemies]:defeated?[defeated]:[],tileIndex=currentEnemyTile,board=boardLevel,classId=player.classId;if(defeated){const s=ensureAlphaMeta();s.enemiesDefeated+=all.length;if(defeated.boss)s.bossesDefeated++;if(defeated.miniBoss)s.minibossesDefeated++;if(defeated.finalBoss)recordBoardClear(board,classId);}if(player.bloodOverhealBonus)clearBloodOverhealTemp();const result=await winCombatV15();if(defeated?.merchantBoss&&tiles[tileIndex]){tiles[tileIndex].type="merchant";tiles[tileIndex].cleared=false;delete tiles[tileIndex].enemyBase;refreshTile(tileIndex);}saveMeta();return result;};
  const loseGameV15=loseGame;loseGame=function(){clearBloodOverhealTemp();return loseGameV15();};

  // Stats hooks around existing run lifecycle.
  const finalizeRunV15=finalizeRun;finalizeRun=function(){const was=runFinalized,result=finalizeRunV15();if(!was){const s=ensureAlphaMeta();s.runsFinished++;s.rolls+=rolls;s.tilesTraveled+=tilesMovedThisRun;s.highestRunLevel=Math.max(s.highestRunLevel,player.level);s.classMaxLevel[player.classId]=Math.max(s.classMaxLevel[player.classId]||1,player.level);s.highestGold=Math.max(s.highestGold,player.gold);saveMeta();}return result;};
  const showEndV15=showEnd;showEnd=function(victory){const first=!runFinalized;if(first){const s=ensureAlphaMeta();if(victory)s.fullVictories++;else s.deaths++;}return showEndV15(victory);};
  const grantXpV15=grantXp;grantXp=function(amount){const r=grantXpV15(amount);const s=ensureAlphaMeta();s.highestRunLevel=Math.max(s.highestRunLevel,player.level);s.classMaxLevel[player.classId]=Math.max(s.classMaxLevel[player.classId]||1,player.level);checkDynamicClassUnlocks();saveMeta();return r;};

  // Alpha Info: expandable guide categories plus a lifetime stats tab.
  function activateInfoTab(name='guide'){return undefined;}
  function renderLifetimeStats(){return undefined;}

  const openInfoV15=openInfo;openInfo=function(){openInfoV15();activateInfoTab("guide");};

  // Imported Alpha saves also get the stats schema immediately.
  importSave=function(){try{const raw=$("saveTransferText").value.trim();if(!raw)throw new Error("empty");meta=window.DiceboundSave.importText(raw,{defaultFactory:defaultMeta,normalize:x=>v13NormalizeMeta(x)});ensureAlphaMeta();saveMeta();repairTalentPrerequisites();renderClassChoices();updateMetaUI();showToast("Save imported");$("infoOverlay").classList.add("hidden");openStartScreen();}catch(e){window.DiceboundPlatform.alert("That save string could not be imported.");}};

  // Ensure transferred v14 saves gain the new Gun companion/progress fields immediately.
  saveMeta();

  $("startBtn").addEventListener("click",startNewGame);$("nightmareToggle").addEventListener("click",()=>{if(!meta.nightmareUnlocked)return;nightmareMode=!nightmareMode;renderClassChoices();});$("rollBtn").addEventListener("click",rollDice);$("outsidePotionBtn").addEventListener("click",usePotionOutsideCombat);$("attackBtn").addEventListener("click",playerAttack);$("guardBtn").addEventListener("click",guardAction);$("potionBtn").addEventListener("click",usePotion);$("ultimateBtn").addEventListener("click",useUltimate);$("spinBtn").addEventListener("click",spinEvent);$("wheelSpinBtn").addEventListener("click",spinFortuneWheel);
  $("equipLootBtn").addEventListener("click",()=>{if(!pendingLootItem)return;const current=player.equipment[pendingLootItem.slot];if(current&&gearPowerScore(pendingLootItem)<gearPowerScore(current)&&!window.DiceboundPlatform.confirm(`${pendingLootItem.name} appears weaker overall than ${current.name}. Replace it anyway?`))return;equipItem(pendingLootItem);closeLoot();});
  $("sellLootBtn").addEventListener("click",()=>{if(!pendingLootItem)return;const value=itemSellValue(pendingLootItem);player.gold+=value;sfx.coin();addLog(`Sold <b>${pendingLootItem.name}</b> for ${value} gold.`);showToast(`+${value} gold`);updateHUD();closeLoot();});
  $("eventContinueBtn").addEventListener("click",()=>{$("eventOverlay").classList.add("hidden");returnToRoad();});
  $("wheelContinueBtn").addEventListener("click",()=>{$("wheelOverlay").classList.add("hidden");returnToRoad();});
  $("feedPetBtn").addEventListener("click",()=>feedActivePet(1));
  $("feedAllPetBtn").addEventListener("click",()=>feedActivePet(meta.petCookies));
  $("debugTrigger").addEventListener("click",openDebugMenu);$("debugCloseBtn").addEventListener("click",()=>$("debugOverlay").classList.add("hidden"));$("debugGrid").addEventListener("click",e=>{const btn=e.target.closest("[data-debug]");if(btn)debugAction(btn.dataset.debug);});
  $("acceptMysticBtn").addEventListener("click",()=>{
    if(!currentMysticBuff)return;player.maxHp=Math.max(1,player.maxHp-10);player.hp=Math.min(player.hp,player.maxHp);const buff=currentMysticBuff;applyUpgrade(buff,"The Mystic");sfx.holy();addLog(`The Mystic takes <b>10 max HP</b>. You gain <b>${buff.name}</b> (Legendary).`);showToast(`Legendary: ${buff.name}`);clearMysticTile();
  });
  $("declineMysticBtn").addEventListener("click",()=>{addLog("You refuse the Mystic's bargain.");clearMysticTile();});
  $("merchantContinueBtn").addEventListener("click",()=>{tiles[player.position].cleared=false;refreshTile(player.position);$("merchantOverlay").classList.add("hidden");returnToRoad();});
  $("restartBtn").addEventListener("click",async()=>{if(!gameStarted||(await diceboundConfirm("Abandon this run? Traveled tiles will be banked as Legacy XP, but you cannot bind a new heirloom.",{title:"Abandon run?",confirmLabel:"Abandon",danger:true}))){if(gameStarted){const earned=finalizeRun();showToast(`Banked ${earned} Legacy XP`);}openStartScreen();}});
  $("endRestartBtn").addEventListener("click",openStartScreen);$("muteBtn").addEventListener("click",()=>setMuted(!muted));
  $("talentBtn").addEventListener("click",()=>openTalentTree());
  $("runBuffBtn").addEventListener("click",openRunBuffs);$("buffCloseBtn").addEventListener("click",()=>$("buffOverlay").classList.add("hidden"));
  $("prestigeKeepConfirmBtn").addEventListener("click",()=>{if(pendingPrestige)completePrestige(pendingPrestige,[...pendingPrestigeKeepIds]);});$("prestigeCancelBtn").addEventListener("click",()=>{pendingPrestige=null;pendingPrestigeKeepIds=new Set();$("prestigeHeirloomOverlay").classList.add("hidden");});
  window.addEventListener("resize",()=>placePawn(false));
  window.addEventListener("keydown",e=>{if((e.key===" "||e.key==="Enter")&&!rollLocked&&gameStarted&&!currentEnemy){e.preventDefault();rollDice();}});


  $("bloodwellLeaveBtn").addEventListener("click",()=>{tiles[player.position].type="empty";tiles[player.position].cleared=true;refreshTile(player.position);$("bloodwellOverlay").classList.add("hidden");returnToRoad();});
  $("gamblerLeaveBtn").addEventListener("click",()=>{$("gamblerOverlay").classList.add("hidden");tiles[player.position].type="empty";tiles[player.position].cleared=true;refreshTile(player.position);returnToRoad();});

  generateBoard();buildBoard();renderClassChoices();renderEquipment();syncWheelIcons();updateHUD();updateMetaUI();
  if(!meta.infoSeen)setTimeout(openInfo,250);

  /* ---------- Alpha v1.1: portraits, tags, board 5, hell mode and bloodmage ---------- */
  let hellMode=false;
  function ensureV11Meta(){
    ensureAlphaMeta();
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

  document.title=`Dicebound: Alpha v1 — ${pick([
    "blood, rings & tax evasion",
    "the update with too many secret bosses",
    "portraits, power tags and bad blood",
    "five roads and one terrible accountant",
    "now with Hell Mode, probably unwisely"
  ])}`;

  const extraStyle=document.createElement("style");
  extraStyle.textContent=`
    .class-portrait,.combat-portrait{display:flex;align-items:center;justify-content:center;padding:0;overflow:hidden}
    .class-portrait svg,.combat-portrait svg{width:100%;height:100%;display:block}
    .choice-tags,.class-tag-row,.info-tag-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
    .tag-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.03em;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#eef4ff}
    .tag-chip.class-tag{background:rgba(101,220,255,.10);border-color:rgba(101,220,255,.28)}
    .tag-chip.power-tag{background:rgba(245,200,91,.10);border-color:rgba(245,200,91,.28)}
    .choice-btn.omega{border:1px solid rgba(255,255,255,.98);box-shadow:0 0 34px rgba(255,255,255,.22),0 0 16px rgba(168,71,255,.35),inset 0 0 42px rgba(255,255,255,.08);background:linear-gradient(145deg,#1f1934,#362064 55%,#173d5a)}
    .choice-btn.omega .rarity-badge{color:#fff;text-shadow:0 0 10px #fff,0 0 14px #b268ff}
    .equipment-slot.omega{border-color:#fff;box-shadow:0 0 16px rgba(255,255,255,.22),inset 0 0 20px rgba(178,104,255,.12)}
    .loot-card.omega{border-color:#fff;background:linear-gradient(145deg,rgba(54,32,100,.55),rgba(19,61,90,.52));box-shadow:0 0 30px rgba(255,255,255,.18),inset 0 0 26px rgba(178,104,255,.12)}
    .omega-title{color:#fff;text-shadow:0 0 16px #fff,0 0 22px #b268ff}
    .info-class{padding:10px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);margin-bottom:8px}
    .hell-toggle{margin-top:10px}
  `;
  document.head.appendChild(extraStyle);

  rarityInfo.omega={label:"Omega",weight:0};
  rarityValues.omega=9;
  rarityPrefixes.omega="Omega";

  /* Alpha v3.1.7: CLASS_TAGS is registry-owned. */
  Object.assign(CLASSES,{
    bloodmage:{id:"bloodmage",secret:true,name:"Bloodmage",icon:"🩸",attackIcon:"🩸",fxIcon:"🩸💥",unlock:"Secret: defeat the Bloodmage hidden inside a Bloodwell",desc:"A forbidden caster that spends life as fuel. Exsanguinate converts your own blood into damage, Replenish restores both combatants, and its ultimate turns injury into catastrophic area damage.",stats:"34 HP · 9 ATK · 1 DEF · LIFE-FUELLED",scaleNotes:"Attack scales burst damage, while max HP determines how much blood you can safely spend. Healing and lifesteal extend the amount of damage the class can buy with its own veins.",ultimate:{name:"Sanguine Cataclysm",icon:"🩸☄️",desc:"Deals heavy damage to every enemy, then restores a portion of the blood spilled."},base:{maxHp:34,attack:9,defense:1,crit:.12,dodge:.04,luck:.04,doubleStrike:.06,guardPower:.40,classBurst:.22,lifeSteal:.05}}
  });
  Object.entries(CLASS_TAGS).forEach(([id,tags])=>{if(CLASSES[id])CLASSES[id].tags=tags;});

  const isClassUnlockedV11=isClassUnlocked;
  isClassUnlocked=function(id){ensureV11Meta();if(id==="bloodmage")return !!(meta.bloodmageUnlocked||meta.unlocks?.bloodmage);return isClassUnlockedV11(id);};
  const unlockClassV11=unlockClass;
  unlockClass=function(id){if(id==="bloodmage"){meta.bloodmageUnlocked=true;meta.unlocks.bloodmage=true;saveMeta();renderClassChoices();return true;}return unlockClassV11(id);};

  const portraitPalette={
    ranger:["#16344f","#2e7d4f","🏹"],fighter:["#2e3548","#8ea4d2","🛡️"],sorcerer:["#1c1437","#7c59ff","🔮"],monk:["#3e2718","#d89b53","👊"],clown:["#3b1335","#ff5bbd","🤡"],
    berserker:["#321014","#c93e4b","🪓"],turtle:["#183028","#42a66a","🐢"],frog:["#173320","#79d761","🐸"],d20:["#1f2148","#7fd0ff","🎲"],slime:["#173117","#61d96f","🟢"],
    vampire:["#2e1022","#ff587f","🦇"],ninja:["#12161e","#b5c6da","🥷"],rouge:["#4b1322","#ff7f9a","🎨"],ceo:["#2d2110","#f4c85b","💼"],merchant:["#241914","#dba95a","⚖️"],
    cleric:["#172a48","#ffd988","✝️"],paladin:["#1c2641","#f0d27c","⚔️"],beastmaster:["#2a2216","#c79e54","🐾"],rogue:["#17171b","#8bd0ff","🗡️"],bloodmage:["#2e0f19","#ff516e","🩸"]
  };
  function classPortraitSVG(classId){
    const cls=CLASSES[classId]||CLASSES.ranger,p=portraitPalette[classId]||["#1b2740","#65dcff",cls.icon||"🎲"],bg=p[0],accent=p[1],sig=p[2];
    return `<svg viewBox="0 0 64 64" role="img" aria-label="${cls.name} portrait"><defs><linearGradient id="g_${classId}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#09111f"/><rect x="4" y="4" width="56" height="56" rx="12" fill="url(#g_${classId})" opacity=".95"/><circle cx="32" cy="25" r="12" fill="#f0c69b"/><path d="M17 54c4-11 11-16 15-16s11 5 15 16" fill="none" stroke="#122033" stroke-width="11" stroke-linecap="round"/><path d="M20 54c4-9 9-14 12-14 4 0 9 5 12 14" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="9" stroke-linecap="round"/><path d="M18 23c2-10 8-16 14-16 7 0 13 6 15 16-4-3-10-5-15-5-5 0-10 2-14 5z" fill="rgba(12,22,36,.72)"/><circle cx="28" cy="24.5" r="1.5" fill="#1b1b1f"/><circle cx="36" cy="24.5" r="1.5" fill="#1b1b1f"/><path d="M27 30c3 2 7 2 10 0" fill="none" stroke="#8b4b3a" stroke-width="1.6" stroke-linecap="round"/><circle cx="50" cy="50" r="9" fill="rgba(9,17,31,.72)"/><text x="50" y="53" text-anchor="middle" font-size="12">${sig}</text></svg>`;
  }
  function applyClassPortrait(el,classId,combat=false){if(!el)return;el.classList.add(combat?"combat-portrait":"class-portrait");el.innerHTML=classPortraitSVG(classId);}  
  function classBoardMarkerSrc(classId){const root=(window.DiceboundAssets?.paths?.uiClassMarkers)||"assets/ui/class-markers";return `${root}/${classId}.png`;}
  function applyClassBoardMarker(el,classId){
    if(!el)return;
    const cls=CLASSES[classId]||CLASSES.ranger;
    el.setAttribute('aria-label', `${cls.name} board marker`);
    el.innerHTML='';
    const img=document.createElement('img');
    img.alt=`${cls.name} board marker`;
    img.src=classBoardMarkerSrc(classId);
    img.addEventListener('error',()=>{el.innerHTML='';el.textContent=cls.icon||'🎲';});
    el.appendChild(img);
  }
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
    up.tags=[...new Set(tags)];
    return up.tags;
  }
  upgrades.forEach(inferUpgradeTags);
  function choiceHTML(up){inferUpgradeTags(up);return `<span class="rarity-badge">${rarityInfo[up.rarity].label}</span><span class="choice-icon">${up.icon}</span><span class="choice-name">${up.name}</span><span class="choice-desc">${up.desc}</span><span class="choice-tags">${tagChips(up.tags,"power")}</span>`;}

  eligibleUpgrades=function(filter=()=>true){return upgrades.filter(u=>{const classOk=(!u.classId&&!u.classIds)||u.classId===player.classId||(u.classIds||[]).includes(player.classId);return classOk&&achievementGateUnlocked(u.achievementGate)&&(!u.unique||!(player.upgradeCounts?.[u.id]))&&filter(u);});};
  openLevelUp=function(onComplete=null){sfx.level();$("levelSubtitle").textContent=pendingLevelUps>1?`Choose a powerup. ${pendingLevelUps} levels are waiting.`:"Choose one powerup for this run.";const grid=$("choiceGrid");grid.innerHTML="";getUpgradeChoices().forEach(up=>{const btn=document.createElement("button");btn.className=`choice-btn ${up.rarity}`;btn.innerHTML=choiceHTML(up);btn.addEventListener("click",()=>{applyUpgrade(up,"Level Up");pendingLevelUps--;addLog(`Level ${player.level}: gained <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);updateHUD();if(pendingLevelUps>0)openLevelUp(onComplete);else{$("levelOverlay").classList.add("hidden");if(onComplete)onComplete();else{rollLocked=false;updateHUD();}}});grid.appendChild(btn);});$("levelOverlay").classList.remove("hidden");};
  showPowerupChoice=function(source,onComplete,filter=()=>true,subtitle="Choose one free rarity-based powerup. Your character level does not change."){ $("powerupTitle").textContent=source;$("powerupSubtitle").textContent=subtitle;const grid=$("powerupGrid");grid.innerHTML="";getUpgradeChoices(filter).forEach(up=>{const btn=document.createElement("button");btn.className=`choice-btn ${up.rarity}`;btn.innerHTML=choiceHTML(up);btn.addEventListener("click",()=>{applyUpgrade(up,source);addLog(`<b>${source}:</b> gained ${up.name} (${rarityInfo[up.rarity].label}).`);showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);$("powerupOverlay").classList.add("hidden");updateHUD();onComplete();});grid.appendChild(btn);});$("powerupOverlay").classList.remove("hidden");};

  function ensureHellToggle(){
    if($("hellBox")){
      const box=$("hellBox"),btn=$("hellToggle"),text=$("hellText");
      box.classList.toggle("locked",!meta.hellUnlocked);btn.disabled=!meta.hellUnlocked;btn.textContent=!meta.hellUnlocked?"Locked":hellMode?"Hell ON":"Hell OFF";btn.classList.toggle("active",hellMode);text.textContent=!meta.hellUnlocked?"Defeat Nightmare Board 4 to unlock: all enemies gain elemental affinity and become far more dangerous.":"All enemies gain elemental affinity and become brutally stronger. This is a bad idea.";
      return;
    }
    const nbox=$("nightmareBox");if(!nbox)return;const box=document.createElement("div");box.className="nightmare-toggle locked hell-toggle";box.id="hellBox";box.innerHTML=`<div><strong>🔥 Hell Mode</strong><span id="hellText">Defeat Nightmare Board 4 to unlock: all enemies gain elemental affinity and become far more dangerous.</span></div><button class="small-btn" id="hellToggle">Locked</button>`;nbox.after(box);box.querySelector("button").addEventListener("click",e=>{e.preventDefault();if(!meta.hellUnlocked)return;hellMode=!hellMode;renderClassChoices();});ensureHellToggle();
  }

  const updateHUDBase=updateHUD;
  updateHUD=function(){updateHUDBase();const cls=CLASSES[player.classId]||CLASSES.ranger;applyClassPortrait($("heroAvatar"),cls.id,false);applyClassPortrait($("combatPlayerIcon"),cls.id,true);applyClassBoardMarker($("pawn"),cls.id);if(boardLevel===5){$("guardianText").textContent=player.position<currentMinibossTile()-1?`Miniboss · tile ${currentMinibossTile()}`:`Ring Tyrant · tile ${currentTileCount()}`;}if(hellMode&&$("floorText"))$("floorText").textContent=`Board ${boardLevel} · Hell Mode · ${player.position+1} / ${currentTileCount()}`;};
  const updateCombatUIBase=updateCombatUI;
  updateCombatUI=function(){updateCombatUIBase();const cls=CLASSES[player.classId]||CLASSES.ranger;applyClassPortrait($("combatPlayerIcon"),cls.id,true);if(classIdentityActive("bloodmage")){$("attackBtn").textContent="🩸 Exsanguinate";$("guardBtn").textContent="💉 Replenish";$("ultimateBtn").textContent=`${cls.ultimate.icon} ${cls.ultimate.name}`;}else{$("attackBtn").textContent="⚔️ Attack";$("guardBtn").textContent=player.guardCooldown>0?"🛡️ Guard (1 turn)":"🛡️ Guard";}};


  const openStartScreenBase=openStartScreen;openStartScreen=function(){openStartScreenBase();ensureHellToggle();};

  function generateMythicalRing(){return {id:`mythical_ring_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"ring",rarity:"mythical",mythical:true,mythicPiece:"ring",setName:"Impossible Road",uniqueEffect:"Ouroboros Halo: every fourth player action grants 1 barrier and 12 ultimate charge.",icon:"💍",name:"Ouroboros Halo, Ring of the Fifth Road",bonuses:{maxHp:22,attack:6,defense:4,crit:.12,luck:.18,bossDamage:.28}};}
  function generateMerchantWeapon(){return {id:`merchant_omega_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"weapon",rarity:"omega",mythical:true,merchantWeapon:true,icon:"⚖️",name:"The Final Price",uniqueEffect:"Compound Interest: every basic and Echo attack adds flat damage equal to your current gold.",bonuses:{attack:12,luck:.35,goldBonus:.60,bossDamage:.45}};}
  function generatePhilosophersStone(){return {id:`philosopher_stone_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"amulet",rarity:"omega",mythical:true,bloodmageStone:true,icon:"🜂",name:"Philosopher's Stone",uniqueEffect:"Scarlet Transmutation: healing beyond full grants +1 attack for the rest of the battle and blood-fuelled abilities cost less life.",bonuses:{maxHp:28,attack:9,lifeSteal:.18,crit:.16,luck:.16}};}
  mythicalSetSummary=function(){const count=mythicalSetCount();return `${count}/6 Impossible Road pieces · 3 pieces: +15% all damage and +15% elemental proc chance · 4 pieces: begin each battle with at least 50 ultimate, one barrier, and +25% pet double-attack chance · 5 pieces: guardian specials deal 25% less damage and your elemental/ultimate effects strengthen further · 6 pieces: Ouroboros set bonus grants +25% all damage, +1 extra starting barrier, and every fourth action grants 1 barrier + 12 ultimate.`;};
  function applyMythicRingPulse(){if(!(player.equipment?.ring?.mythicPiece==="ring")||player.combatActionCount<1||player.combatActionCount%4!==0)return "";player.combatShield=(player.combatShield||0)+1;player.ultimateCharge=clamp(player.ultimateCharge+12,0,100);return "💍 Ouroboros Halo grants 1 barrier and 12 ultimate.";}
  // v1.9: the former six-piece +25% strike multiplier was removed. Damage now comes
  // exclusively from the graduated 2/3/4/7-piece set table below.

  openCombatLootChain=function(defeated,done){const normal=()=>{if(random()<equipmentDropChance(defeated.boss)){const rarity=defeated.finalBoss?pick(["epic","legendary"]):defeated.miniBoss?pick(["rare","epic"]):null;openLoot(generateEquipment(rarity),done);}else done();};const specials=[];let weapon=0,boots=0,amulet=0,pants=0,hat=0,ring=0;if(defeated.merchantBoss){if(random()<.05*(nightmareMode?2:1)){specials.push(generateMerchantWeapon());meta.merchantOmegaDrops++;saveMeta();}}else if(defeated.bloodmageBoss){if(random()<.05*(nightmareMode?2:1)){specials.push(generatePhilosophersStone());meta.bloodmageOmegaDrops++;saveMeta();}}else if(defeated.miniBoss){if(boardLevel===1)weapon=.005;else if(boardLevel===2){weapon=.075;boots=.01;}else if(boardLevel===3){weapon=.075;boots=.01;pants=.005;}else if(boardLevel===4){weapon=.12;boots=.075;pants=.04;amulet=.005;hat=.005;}else{weapon=.14;boots=.09;pants=.05;amulet=.01;hat=.01;ring=.04;}}else if(defeated.finalBoss){if(boardLevel===1)weapon=.05;else if(boardLevel===2){weapon=.10;boots=.05;amulet=.001;}else if(boardLevel===3){weapon=.10;boots=.05;pants=.02;amulet=.001;}else if(boardLevel===4){weapon=.18;boots=.10;pants=.06;amulet=.01;hat=.02;}else{weapon=.20;boots=.12;pants=.08;amulet=.02;hat=.03;ring=.10;}}const mult=nightmareMode?2:1;if(weapon&&random()<weapon*mult)specials.push(generateMythicalWeapon());if(boots&&random()<boots*mult)specials.push(generateMythicalBoots());if(pants&&random()<pants*mult)specials.push(generateMythicalPants());if(amulet&&random()<amulet*mult)specials.push(generateMythicalAmulet());if(hat&&random()<hat*mult)specials.push(generateMythicalHat());if(ring&&random()<ring*mult)specials.push(generateMythicalRing());const next=()=>{if(!specials.length)return normal();const item=specials.shift();addLog(`<b>${item.rarity==="omega"?"OMEGA ITEM!":"MYTHIC ITEM!"}</b> ${item.name} drops from ${defeated.name}.`);sfx.holy();openLoot(item,next);};next();};

  const scaleEnemyV11=scaleEnemy;scaleEnemy=function(base,kind="normal",packSize=1){const e=scaleEnemyV11(base,kind,packSize);if(boardLevel===5){e.hp=Math.round(e.hp*1.55);e.maxHp=e.hp;e.attack=Math.round(e.attack*1.45);e.defense+=(e.guardian?8:4);}if(hellMode){e.hp=Math.round(e.hp*2.1);e.maxHp=e.hp;e.attack=Math.round(e.attack*1.85);e.defense+=(e.guardian?14:7);e.affinity=e.affinity||pick(ELEMENT_KEYS);e.elementProcChance=Math.max(e.elementProcChance||0,.36);}return e;};

  startCombat=function(kind="normal"){const tile=tiles[player.position];let bases=[];merchantBossBattle=kind==="merchant";if(kind==="merchant"){const m=db317Enemy("road-merchant");m.hp=185+boardLevel*60;m.attack=28+boardLevel*5;bases=[m];}else if(kind==="bloodmage"){const b=db317Enemy("bloodmage-boss");b.hp=210+boardLevel*35;b.attack=34+boardLevel*4;bases=[b];}else if(kind==="final")bases=[db317FinalGuardian(boardLevel)];else if(kind==="miniboss")bases=[db317MinibossGuardian(boardLevel)];else bases=(tile.enemyBases?.length?tile.enemyBases:[tile.enemyBase||enemyForPosition(player.position)]).map(x=>({...x}));currentEnemies=bases.map(b=>scaleEnemy(b,kind,bases.length));if(kind==="bloodmage")currentEnemies.forEach(e=>{e.bloodmageBoss=true;e.guardian=true;e.merchantBoss=false;});currentEncounterLead=currentEnemies[0];currentEnemyIndex=0;currentEnemy=currentEnemies[0];currentEnemyTile=player.position;currentEncounterTurn=0;combatBusy=false;player.combatShield=player.firstHitBlocks+(mythicalSetCount()>=5?1:0)+(hasMythicPiece("hat")?1:0);player.combatAttackCount=0;player.combatActionCount=0;player.mythicActionCount=0;player.mythicAmuletUsed=false;player.omegaRingUsed=false;if(mythicalSetCount()>=4)player.ultimateCharge=Math.max(player.ultimateCharge,v19SetStartUltimate());$("combatTitle").textContent=kind==="bloodmage"?"Secret Boss: The Bloodmage":kind==="merchant"?"Secret Boss: The Merchant":kind==="final"?"Final Guardian":kind==="miniboss"?"Halfway Miniboss":currentEnemies.length>1?`Enemy Pack ×${currentEnemies.length}`:"Battle!";$("combatSubtitle").textContent=kind==="bloodmage"?"The Bloodwell answers with forbidden scholarship.":kind==="merchant"?"He closes the shop, raises barriers and begins charging interest.":currentEnemies.length>1?"Every enemy is visible below. The arrow marks your selected target.":"Choose your action.";$("combatHistory").innerHTML="";setCombatText(`${currentEnemies.map(e=>e.name).join(", ")} block the road. Choose your action.`);$("combatOverlay").classList.remove("hidden");addLog(`Combat begins against <b>${currentEnemies.map(e=>e.name).join(", ")}</b>.`);renderEnemyParty();updateCombatUI();};

  const enemyTurnV11=enemyTurn;enemyTurn=async function(guarded,extraGuardPower=0){await enemyTurnV11(guarded,extraGuardPower);if(player.hp>0&&mythicalSetCount()>=7&&!player.omegaRingUsed&&player.hp/player.maxHp<=.25){player.omegaRingUsed=true;const heal=healPlayer(Math.ceil(player.maxHp*.25));player.combatShield=(player.combatShield||0)+1;setCombatText(`💍 Impossible Road 7-piece bonus restores ${heal} HP and grants 1 barrier.`);updateCombatUI();await delay(220);}};

  async function bloodmageExsanguinate(){if(combatBusy||!currentEnemy)return;combatBusy=true;player.guardCooldown=0;player.combatAttackCount++;player.combatActionCount++;const paid=Math.max(1,Math.ceil(player.maxHp*.12));player.hp=Math.max(1,player.hp-paid);const chaos=await rollD20Chaos("attack");updateCombatUI();await animateClassAttack("crit");let damage=Math.round((player.attack*2.45+paid*1.9)*(chaos.mult||1)*(1+player.damageBonus+v19SetDamageBonus()));if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));const dealt=damageEnemy(currentEnemy,damage);const ring=applyMythicRingPulse();setCombatText(`🩸 Exsanguinate spends ${paid} HP to deal ${dealt} damage.${ring?` ${ring}`:""}`);sfx.hit();updateCombatUI();await delay(820);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);} 
  async function bloodmageReplenish(){if(combatBusy||!currentEnemy)return;combatBusy=true;player.combatActionCount++;const selfHeal=healPlayer(Math.ceil(player.maxHp*.16));const enemyHeal=Math.min(currentEnemy.maxHp-currentEnemy.hp,Math.ceil(currentEnemy.maxHp*.14));currentEnemy.hp+=enemyHeal;player.ultimateCharge=clamp(player.ultimateCharge+20,0,100);const ring=applyMythicRingPulse();setCombatText(`💉 Replenish restores ${selfHeal} HP to you and ${enemyHeal} HP to ${currentEnemy.name}.${ring?` ${ring}`:""}`);updateCombatUI();await delay(700);await resolveEnemyResponse(false);} 
  const useUltimateV11=useUltimate;useUltimate=async function(){if(player.classId!=="bloodmage")return useUltimateV11();if(combatBusy||!currentEnemy||player.ultimateCharge<100)return;combatBusy=true;player.guardCooldown=0;player.ultimateCharge=0;player.combatActionCount++;const chaos=await rollD20Chaos("ultimate");updateCombatUI();await animateUltimate();let damage=Math.round((player.attack*3.4+Math.max(0,player.maxHp-player.hp)*1.4)*(chaos.mult||1)*(1+player.classUltimateBonus)*(1+player.ultimateDamageBonus)*(1+player.damageBonus+(v19SetDamageBonus())));if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));const dealt=damageAll(damage,.82),healed=healPlayer(Math.max(1,Math.floor(dealt*.30)));const ring=applyMythicRingPulse();setCombatText(`🩸☄️ Sanguine Cataclysm drenches the field for ${dealt} total damage and restores ${healed} HP.${ring?` ${ring}`:""}`);sfx.crit();updateCombatUI();await delay(850);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);};
  $("attackBtn").addEventListener("click",e=>{if(classIdentityActive("bloodmage")){e.preventDefault();e.stopImmediatePropagation();bloodmageExsanguinate();}},true);
  $("guardBtn").addEventListener("click",e=>{if(classIdentityActive("bloodmage")){e.preventDefault();e.stopImmediatePropagation();bloodmageReplenish();}},true);
  $("ultimateBtn").addEventListener("click",e=>{if(player.classId==="bloodmage"){e.preventDefault();e.stopImmediatePropagation();useUltimate();}},true);

  const rollDiceV11=rollDice;rollDice=async function(){if(!(meta.debugAlwaysChooseRolls&&gameStarted&&!rollLocked))return rollDiceV11();ensureAudio();rollLocked=true;updateHUD();const die=$("dice");die.classList.add("rolling");for(let i=0;i<8;i++){die.textContent=pick(diceFaces);sfx.roll();await delay(45+i*5);}let value=await chooseDieResult(),bonus=0;die.textContent=diceFaces[value-1];die.classList.remove("rolling");rolls++;ensureAlphaMeta().rolls++;addLog(`Debug fate chooses <b>${value}</b>. Long Stride does not alter chosen fate.`);await dbBoardMovement.move(value,value,false,true);};
  $("rollBtn").addEventListener("click",e=>{if(meta.debugAlwaysChooseRolls&&gameStarted&&!rollLocked){e.preventDefault();e.stopImmediatePropagation();rollDice();}},true);

  function refreshDebugButtons(){const grid=$("debugGrid");if(!grid)return;const defs=[["alwayschoose",()=>`🎯 Always choose rolls: ${meta.debugAlwaysChooseRolls?"ON":"OFF"}`],["board5",()=>"🛣️ Jump to Board 5"],["mythicring",()=>"💍 Add Mythic Ring"],["omega_merchant",()=>"⚖️ Add The Final Price"],["omega_stone",()=>"🜂 Add Philosopher's Stone"]];defs.forEach(([id,labelFn])=>{let btn=grid.querySelector(`[data-debug="${id}"]`);if(!btn){btn=document.createElement("button");btn.dataset.debug=id;btn.className="small-btn";grid.appendChild(btn);}btn.textContent=labelFn();});}
  const openDebugMenuV11=openDebugMenu;openDebugMenu=function(){openDebugMenuV11();refreshDebugButtons();};
  const debugActionV11=debugAction;debugAction=function(action){if(action==="alwayschoose"){meta.debugAlwaysChooseRolls=!meta.debugAlwaysChooseRolls;saveMeta();refreshDebugButtons();showToast(`Always choose rolls ${meta.debugAlwaysChooseRolls?"enabled":"disabled"}`);return;}if(action==="board5"&&gameStarted){boardLevel=5;player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");updateHUD();showToast("Debug: board5");return;}if(action==="mythicring"&&gameStarted){equipItem(generateMythicalRing(),true);updateHUD();showToast("Artifact Ring added");return;}if(action==="omega_merchant"&&gameStarted){equipItem(generateMerchantWeapon(),true);updateHUD();showToast("The Final Price added");return;}if(action==="omega_stone"&&gameStarted){equipItem(generatePhilosophersStone(),true);updateHUD();showToast("Philosopher's Stone added");return;}return debugActionV11(action);};

  completePrestige=function(data,keepIds=[]){const total=data.totalPoints??(allocatedTalentPoints()+(meta.points||0)),rewards=Math.floor(total/10),keys=["maxHp","attack","defense","crit","dodge","luck","lifeSteal"];for(let i=0;i<rewards;i++){const key=pick(keys);meta.prestige[key]=(meta.prestige[key]||0)+1;}meta.prestige.count=(meta.prestige.count||0)+rewards;const capacity=1+(meta.prestige.count>=20?1:0),pool=data.candidates||meta.heirlooms||[],selected=pool.filter(h=>keepIds.includes(h.id)).slice(0,capacity);meta.heirlooms=selected.map(normalizeSavedItem);meta.purchased={};meta.level=1;meta.xp=0;meta.xpNext=legacyXpForLevel(1);meta.points=0;pendingPrestige=null;pendingPrestigeKeepIds=new Set();$("prestigeHeirloomOverlay").classList.add("hidden");saveMeta();checkDynamicClassUnlocks();sfx.holy();showToast(`Prestige gained ${rewards} permanent stat point${rewards===1?"":"s"}`);renderTalents();updateMetaUI();openStartScreen();};
  prestigeTree=function(){const allocated=allocatedTalentPoints(),unspent=meta.points||0,total=allocated+unspent,rewards=Math.floor(total/10);if(rewards<1)return;const post=(meta.prestige?.count||0)+rewards,keep=1+(post>=20?1:0),warning=`Prestige all ${total} talent points? This includes ${unspent} unspent points. You gain ${rewards} permanent stat point${rewards===1?"":"s"}, your talent tree resets, and your leftover points are consumed so you do not keep extra talent points. ${gameStarted?"THIS ENDS THE CURRENT RUN AND RETURNS TO CLASS SELECTION.":""}`;if(!window.DiceboundPlatform.confirm(warning))return;const data={allocated,rewards,remainder:0,unspent:0,totalPoints:total,wasInRun:gameStarted};const pool=[...(meta.heirlooms||[]),...(gameStarted?EQUIPMENT_SLOTS.map(s=>player.equipment[s]).filter(Boolean):[])];if(pool.length)openPrestigeHeirloomChoice(data);else completePrestige(data,[]);};

  winCombat=async function(){const defeated=currentEncounterLead||currentEnemy,all=currentEnemies.length?[...currentEnemies]:defeated?[defeated]:[],tileIndex=currentEnemyTile,board=boardLevel,classId=player.classId;if(defeated){const s=ensureAlphaMeta();s.enemiesDefeated+=all.length;if(defeated.boss)s.bossesDefeated++;if(defeated.miniBoss)s.minibossesDefeated++;if(defeated.finalBoss)recordBoardClear(board,classId);}if(player.bloodOverhealBonus)clearBloodOverhealTemp();const rewardGold=modifiedGold(all.reduce((sum,e)=>sum+(e?.gold||0),0)),rewardXp=Math.max(1,Math.round(all.reduce((sum,e)=>sum+(e?.xp||0),0)*(1+player.xpBonus)));player.gold+=rewardGold;if(player.postFightHeal>0)healPlayer(player.postFightHeal);let cookies=defeated.finalBoss?(boardLevel===5?10:boardLevel===4?8:boardLevel===3?6:boardLevel===2?4:2):defeated.miniBoss?(boardLevel===6?10:boardLevel===5?8:boardLevel===4?7:boardLevel===3?5:boardLevel===2?3:1):0;if(cookies){meta.petCookies+=cookies;saveMeta();showToast(`🍪 +${cookies} cookies`);}if(defeated.merchantBoss){merchantBossBattle=false;merchantBossPrimed=false;merchantBossDefeatedThisBoard=true;player.freeMerchantRun=true;meta.merchantKills=(meta.merchantKills||0)+1;saveMeta();checkDynamicClassUnlocks();addLog("<b>The Road Merchant is defeated.</b> Every merchant item is free for the rest of this run.");showToast("🧔 All shops are free!");}if(defeated.bloodmageBoss){meta.bloodmageKills=(meta.bloodmageKills||0)+1;unlockClass("bloodmage");saveMeta();addLog("<b>The Bloodmage is defeated.</b> Forbidden hemomancy bends the knee.");showToast("🩸 Bloodmage unlocked");}if(defeated.miniBoss&&boardLevel===1)unlockClass("sorcerer");if(defeated.finalBoss&&boardLevel===1)unlockClass("fighter");if(defeated.miniBoss&&boardLevel===2)unlockClass("monk");if(defeated.finalBoss&&boardLevel===2)unlockClass("clown");if(tiles[currentEnemyTile]){tiles[currentEnemyTile].cleared=true;if(!defeated.finalBoss&&!defeated.merchantBoss){tiles[currentEnemyTile].type="empty";delete tiles[currentEnemyTile].enemyBase;refreshTile(currentEnemyTile);}}setCombatText(`Victory! +${rewardXp} XP, +${rewardGold} gold${cookies?`, +${cookies} cookies`:""}.`);sfx.win();addLog(`Defeated <b>${all.map(e=>e.name).join(", ")}</b>: +${rewardXp} XP, +${rewardGold} gold.`);updateHUD();await delay(320);await BattleVictoryUI.present(BattleVictoryState.create({title:'Victory!',defeatedNames:all.map(e=>e.name),xp:rewardXp,gold:rewardGold,cookies,board}));$("combatOverlay").classList.add("hidden");BattleVictoryUI.reset();currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;grantXp(rewardXp);updateHUD();const after=()=>{if(defeated.finalBoss){if(boardLevel===3&&!meta.nightmareUnlocked){meta.nightmareUnlocked=true;saveMeta();showToast("🌑 Nightmare Mode unlocked");addLog("<b>Nightmare Mode unlocked!</b> You may enable it from class selection on future runs.");}if(boardLevel===4&&nightmareMode&&!meta.hellUnlocked){meta.hellUnlocked=true;saveMeta();showToast("🔥 Hell Mode unlocked");addLog("<b>Hell Mode unlocked!</b> Future runs may enable it from class selection.");renderClassChoices();}if(boardLevel<5)advanceToNextBoard();else{meta.board5Clears=(meta.board5Clears||0)+1;saveMeta();showEnd(true);}}else returnToRoad();},cont=()=>pendingLevelUps>0?openLevelUp(after):after(),loot=()=>openCombatLootChain(defeated,cont);if(defeated.miniBoss){showLegendaryChoice("Miniboss Legendary Reward",loot);}else loot();if(defeated?.merchantBoss&&tiles[tileIndex]){tiles[tileIndex].type="merchant";tiles[tileIndex].cleared=false;delete tiles[tileIndex].enemyBase;refreshTile(tileIndex);}saveMeta();};

  const openBloodwellV11=openBloodwell;openBloodwell=function(){openBloodwellV11();if((meta.merchantKills||0)>=1){const grid=$("bloodwellGrid");if(grid&&!grid.querySelector("[data-bloodmage]")){const b=document.createElement("button");b.className="choice-btn legendary";b.dataset.bloodmage="1";b.innerHTML=`<span class="choice-icon">🩸</span><span class="choice-name">Challenge the hidden Bloodmage</span><span class="choice-desc">The blood icon trembles. Begin a secret boss fight. A 5% Omega drop may await.</span>`;b.addEventListener("click",()=>{$("bloodwellOverlay").classList.add("hidden");startCombat("bloodmage");});grid.prepend(b);}}};

  refreshDebugButtons();
  saveMeta();


  /* ---------- Alpha v1.2: identity, clarity, affinity and progression polish ---------- */
  document.title=`Dicebound: Alpha v1.3 — ${pick([
    "the gambler has developed empathy",
    "donuts are weapons now",
    "statistically fewer haunted tooltips",
    "monks dodge your dodge",
    "affinity finally means something"
  ])}`;

  const v12Style=document.createElement("style");
  v12Style.textContent=`
    #achievementOverlay .modal{width:min(1080px,96vw);max-height:92vh}
    #achievementOverlay .achievement-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .achievement-category{grid-column:1/-1;margin:8px 0 0;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,rgba(101,220,255,.12),rgba(181,140,255,.08));border:1px solid rgba(101,220,255,.22);font-size:13px;font-weight:1000;letter-spacing:.04em}
    .achievement-category:first-child{margin-top:0}
    .combat-portrait{width:50px!important;height:50px!important;margin:0 auto 5px!important;border-radius:13px;box-shadow:0 0 0 1px rgba(255,255,255,.10),0 7px 16px rgba(0,0,0,.28)}
    .class-portrait{width:58px!important;height:58px!important;border-radius:15px;box-shadow:0 0 0 1px rgba(255,255,255,.10),0 8px 18px rgba(0,0,0,.24)}
    .enemy-proc-fx{position:absolute;z-index:36;pointer-events:none;left:22%;top:35%;transform:translate(-50%,-50%);padding:7px 10px;border-radius:14px;background:rgba(92,10,22,.88);border:1px solid rgba(255,100,120,.6);font-size:34px;font-weight:1000;filter:drop-shadow(0 8px 14px rgba(0,0,0,.65));animation:enemyProcIncoming .78s ease-out forwards}
    .enemy-proc-fx small{display:block;font-size:8px;letter-spacing:.13em;color:#ffd8dc;margin-top:2px}
    @keyframes enemyProcIncoming{0%{opacity:0;transform:translate(180%,-35%) scale(.45)}45%{opacity:1;transform:translate(-35%,-55%) scale(1.18)}75%{opacity:1;transform:translate(-50%,-45%) scale(1)}100%{opacity:0;transform:translate(-65%,-40%) scale(.8)}}
    .passive-line{display:block;margin-top:6px;padding:6px 8px;border-radius:9px;background:rgba(245,200,91,.08);border:1px solid rgba(245,200,91,.17);font-size:9px;color:#f7e5ab;line-height:1.4}
    .rarity-table{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:8px 0}
    .rarity-note{padding:8px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);font-size:10px}
    @media(max-width:760px){#achievementOverlay .achievement-grid,.rarity-table{grid-template-columns:1fr}.achievement-category{grid-column:auto}.combat-portrait{width:44px!important;height:44px!important}}
  `;
  document.head.appendChild(v12Style);

  /* Alpha v3.1.7: CLASS_PASSIVES is registry-owned. */
  Object.entries(CLASS_PASSIVES).forEach(([id,p])=>{if(CLASSES[id])CLASSES[id].passive=p;});

  classPortraitSVG=function(classId){
    const cls=CLASSES[classId]||CLASSES.ranger;
    const cfg={
      ranger:{bg:"#102b24",accent:"#5ecb76",skin:"#d2a06b",hair:"#5c3827",head:`<path d="M14 29c3-15 10-22 18-22 10 0 16 8 18 22-8-7-27-7-36 0z" fill="#255f3b"/><path d="M47 8c10 10 8 31 2 44" fill="none" stroke="#d09a4f" stroke-width="3"/><path d="M48 12l8 3-8 5" fill="#e9eef2"/>`},
      fighter:{bg:"#182233",accent:"#829ac9",skin:"#c89263",hair:"#3b2b24",head:`<path d="M15 26c1-13 7-20 17-20s17 7 18 20l-5-4H20z" fill="#8797ad"/><path d="M18 21h28v8H18z" fill="#27364b"/><rect x="29" y="7" width="6" height="15" rx="2" fill="#d5ad58"/>`},
      sorcerer:{bg:"#1b1236",accent:"#8c60ff",skin:"#d6a97d",hair:"#443158",head:`<path d="M8 20h48L37 5H27z" fill="#4a287f"/><path d="M15 19c6-4 28-4 35 0" stroke="#d5b0ff" stroke-width="3"/><circle cx="48" cy="11" r="3" fill="#fff2a6"/>`},
      monk:{bg:"#3b2415",accent:"#d7924f",skin:"#c98d5f",hair:"#382117",head:`<path d="M18 16c4-8 24-8 28 0" stroke="#d9553e" stroke-width="5"/><circle cx="32" cy="13" r="8" fill="#c98d5f"/>`},
      clown:{bg:"#35102e",accent:"#ff61bc",skin:"#f5ddd7",hair:"#d93d7d",head:`<circle cx="21" cy="14" r="7" fill="#ff5c55"/><circle cx="43" cy="14" r="7" fill="#5fcfff"/><path d="M21 10c8-8 16-5 21 1" stroke="#ffe265" stroke-width="5"/><circle cx="32" cy="28" r="3" fill="#ee3e4d"/>`},
      berserker:{bg:"#2e0f12",accent:"#d04444",skin:"#b97955",hair:"#4c241d",head:`<path d="M15 20L8 7l14 7M49 20l7-13-14 7" fill="#d9c7a6"/><path d="M14 24c3-13 32-17 37 2" fill="#5e201e"/>`},
      turtle:{bg:"#153027",accent:"#51b46f",skin:"#71b77d",hair:"#22523a",head:`<ellipse cx="32" cy="23" rx="16" ry="13" fill="#74bd82"/><path d="M17 20h30M21 13l7 20M43 13l-7 20" stroke="#27583b" stroke-width="2" opacity=".65"/>`},
      frog:{bg:"#17341d",accent:"#8be26f",skin:"#6fd86a",hair:"#2c7b45",head:`<ellipse cx="32" cy="25" rx="17" ry="13" fill="#6fd86a"/><circle cx="23" cy="14" r="7" fill="#7fe878"/><circle cx="41" cy="14" r="7" fill="#7fe878"/><circle cx="23" cy="14" r="2" fill="#101820"/><circle cx="41" cy="14" r="2" fill="#101820"/>`},
      d20:{bg:"#161b42",accent:"#6fc9ff",skin:"#d4a276",hair:"#22294c",head:`<polygon points="32,5 51,17 44,38 20,38 13,17" fill="#295c9a" stroke="#9ee4ff" stroke-width="2"/><text x="32" y="26" text-anchor="middle" font-size="12" fill="white" font-weight="900">20</text>`},
      slime:{bg:"#12351b",accent:"#61dc72",skin:"#66d977",hair:"#1f6b34",head:`<path d="M14 34c0-16 8-26 18-26s18 10 18 26c0 5-4 8-8 6l-5 5-5-5-5 5-5-5c-4 2-8-1-8-6z" fill="#66d977"/><circle cx="26" cy="25" r="2" fill="#122018"/><circle cx="38" cy="25" r="2" fill="#122018"/>`},
      vampire:{bg:"#2b0c1c",accent:"#ef4c78",skin:"#eee4df",hair:"#25151f",head:`<path d="M14 22c4-13 32-17 37 2-8-4-27-4-37-2z" fill="#20131d"/><path d="M27 33l3 6 2-5 2 5 3-6" fill="#fff"/><path d="M14 40L5 20l16 11M50 40l9-20-16 11" fill="#5c1637"/>`},
      ninja:{bg:"#111820",accent:"#8ca7c8",skin:"#d1a071",hair:"#101317",head:`<path d="M12 18c7-11 32-13 41 0v19H12z" fill="#151b22"/><path d="M17 23h30v9H17z" fill="#a9bfd7" opacity=".85"/>`},
      rouge:{bg:"#491324",accent:"#ff7d9c",skin:"#e0ad82",hair:"#7c2f42",head:`<path d="M17 13c7-8 27-8 32 1-9 3-23 3-32-1z" fill="#c42f52"/><path d="M20 10l18-4 11 7" fill="#d84668"/><path d="M48 31l9-12" stroke="#ffd69e" stroke-width="3"/><path d="M54 17l4-5" stroke="#ff5d89" stroke-width="5"/>`},
      ceo:{bg:"#2c2411",accent:"#e4c258",skin:"#d1a06d",hair:"#4b3823",head:`<path d="M18 15c6-8 24-8 29 1" fill="#5a4935"/><rect x="18" y="23" width="11" height="7" rx="2" fill="none" stroke="#111" stroke-width="2"/><rect x="35" y="23" width="11" height="7" rx="2" fill="none" stroke="#111" stroke-width="2"/><path d="M29 26h6" stroke="#111" stroke-width="2"/><path d="M27 42l5 10 5-10" fill="#df3f4a"/>`},
      merchant:{bg:"#2e1d10",accent:"#d49b4d",skin:"#ca9362",hair:"#654128",head:`<path d="M13 18h38l-8-10H21z" fill="#6e4826"/><path d="M22 31c2 11 18 15 21 0-1 14-5 19-11 19-6 0-10-5-10-19z" fill="#74442f"/><circle cx="50" cy="14" r="7" fill="#e4b54c"/><text x="50" y="17" text-anchor="middle" font-size="8" font-weight="900">G</text>`},
      cleric:{bg:"#162b4c",accent:"#f7d780",skin:"#deb383",hair:"#6a5038",head:`<ellipse cx="32" cy="8" rx="13" ry="4" fill="none" stroke="#ffe891" stroke-width="3"/><path d="M18 18c5-9 23-11 29 0" fill="#e7edf7"/><path d="M32 7v12M25 13h14" stroke="#f6d45f" stroke-width="3"/>`},
      paladin:{bg:"#182440",accent:"#edce72",skin:"#d4a77a",hair:"#544531",head:`<path d="M14 26c2-14 8-21 18-21s16 7 18 21l-5-3H19z" fill="#d1b45e"/><path d="M20 21h24v11H20z" fill="#39445f"/><path d="M32 5v15M26 12h12" stroke="#fff2a8" stroke-width="2"/>`},
      beastmaster:{bg:"#2e2516",accent:"#c49a53",skin:"#ca9469",hair:"#5b3d25",head:`<path d="M16 20l5-13 8 10M48 20L43 7l-8 10" fill="#8b6336"/><path d="M17 20c5-10 26-12 31 0" fill="#6b4828"/><circle cx="51" cy="45" r="8" fill="#2c2117"/><text x="51" y="49" text-anchor="middle" font-size="11">🐾</text>`},
      rogue:{bg:"#10171e",accent:"#76c9f5",skin:"#c99068",hair:"#252a32",head:`<path d="M10 26c5-16 13-21 22-21s17 5 22 21l-8-3H18z" fill="#1f2934"/><path d="M17 25h30v8H17z" fill="#0d131a"/><path d="M49 8l7 18" stroke="#a9d8f3" stroke-width="2"/>`},
      bloodmage:{bg:"#300c18",accent:"#ff4f70",skin:"#e5c0b0",hair:"#501b2b",head:`<path d="M11 28c4-16 12-23 21-23s17 7 21 23l-9-5H20z" fill="#5a1227"/><path d="M32 7l4 8-4 8-4-8z" fill="#ef4461"/><path d="M10 45c8-7 11-10 13-18M54 45c-8-7-11-10-13-18" stroke="#ff6a80" stroke-width="2"/>`}
    }[classId]||{bg:"#1b2740",accent:"#65dcff",skin:"#d3a174",hair:"#403028",head:""};
    const special=["frog","slime","d20"].includes(classId);
    return `<svg viewBox="0 0 64 64" role="img" aria-label="${cls.name} portrait"><defs><linearGradient id="pv12_${classId}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${cfg.bg}"/><stop offset="1" stop-color="${cfg.accent}"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#08101b"/><rect x="3" y="3" width="58" height="58" rx="12" fill="url(#pv12_${classId})"/><circle cx="32" cy="27" r="13" fill="${special?"transparent":cfg.skin}"/>${cfg.head}${special?"":`<circle cx="27.5" cy="26" r="1.5" fill="#181818"/><circle cx="36.5" cy="26" r="1.5" fill="#181818"/><path d="M28 32c3 2 5 2 8 0" fill="none" stroke="#8a4c3c" stroke-width="1.5" stroke-linecap="round"/>`}<path d="M15 58c3-13 10-19 17-19s14 6 17 19" fill="rgba(7,14,24,.76)"/><path d="M20 57c3-10 8-15 12-15 5 0 10 5 12 15" fill="${cfg.accent}" opacity=".28"/></svg>`;
  };


  const resetPlayerV12=resetPlayer;
  resetPlayer=function(classId=selectedClassId){resetPlayerV12(classId);const p=player.classId;if(p==="fighter")player.firstHitBlocks+=1;if(p==="sorcerer")player.elementProcBonus+=.08;if(p==="clown")player.luck+=.10;if(p==="turtle"){player.firstHitBlocks+=1;player.defense+=1;}if(p==="frog")player.doubleStrike+=.10;if(p==="d20")player.luck+=.08;if(p==="slime"){player.maxHp+=10;player.hp+=10;}if(p==="vampire")player.lifeSteal+=.10;if(p==="ninja"){player.dodge+=.05;player.crit+=.05;}if(p==="rouge"){player.luck+=.10;player.crit+=.05;}if(p==="ceo")player.goldBonus+=2;if(p==="cleric")player.classElementProcs.light=(player.classElementProcs.light||0)+.08;if(p==="rogue"){player.goldBonus+=.25;player.dodge+=.05;} };

  const effectiveDodgeChanceV12=effectiveDodgeChance;
  effectiveDodgeChance=function(){const base=effectiveDodgeChanceV12();return classIdentityActive("monk")?1-(1-base)*(1-base):base;};
  const itemSellValueV12=itemSellValue;
  itemSellValue=function(item){const base=itemSellValueV12(item);return classIdentityActive("merchant")?Math.round(base*2):base;};
  const damageEnemyV12=damageEnemy;
  damageEnemy=function(enemy,amount,ignoreDefense=false){if(classIdentityActive("berserker")&&player.maxHp>0)amount=DB_EFFECTIVE_STATS.scaleBerserkerRageDamage(amount,player);return damageEnemyV12(enemy,amount,ignoreDefense);};

  const updateCombatUIV12=updateCombatUI;
  updateCombatUI=function(){updateCombatUIV12();const cls=CLASSES[player.classId]||CLASSES.ranger;applyClassPortrait($("combatPlayerIcon"),cls.id,true);if(classIdentityActive("bloodmage")){$("attackBtn").textContent="🩸 Exsanguinate";$("attackBtn").dataset.tip="Spend 12% of your max HP (you cannot kill yourself with the cost) to deal a heavy blood-fuelled attack.";$("guardBtn").textContent="💉 Replenish";$("guardBtn").dataset.tip="Restore 16% max HP to yourself and 14% max HP to the selected enemy, then gain 20 Ultimate. Replenish does not reduce the enemy's next attack.";}else{$("attackBtn").dataset.tip=`Attack the selected enemy. Echo ${Math.round(player.doubleStrike*100)}%, Crit ${Math.round(player.crit*100)}%; every strike rolls crit, Poison and elements separately.`;} };

  playElementAnimation=function(key,target=currentEnemy,enemySource=false){const head=document.querySelector("#combatOverlay .combat-head");if(!head||!ELEMENTS[key])return;const art={fire:"🔥☄️",ice:"❄️✳️",electric:"⚡⚡",light:"✨☀️",void:"🕳️🌑",nature:"🌿🪴",donut:"🍩🍩🍩",tech:"🤖📡",metal:"🤘🎸",coffee:"☕💨",gun:"🔫💥"}[key]||ELEMENTS[key].icon;if(enemySource){const el=document.createElement("div");el.className="enemy-proc-fx";el.innerHTML=`<span>${target?.icon||"👹"} → ${art}</span><small>ENEMY ELEMENT PROC</small>`;head.appendChild(el);setTimeout(()=>el.remove(),900);return;}const el=document.createElement("div");el.className=`element-proc-fx ${key}`;el.textContent=art;head.appendChild(el);setTimeout(()=>el.remove(),850);};

  function affinityElementMultiplier(enemy,key){return enemy?.affinity===key ? .5 : 1;}
  function elementHit(enemy,key,amount,ignoreDefense=false){return damageEnemy(enemy,amount*affinityElementMultiplier(enemy,key),ignoreDefense);}
  function elementHitAll(key,amount,falloff=1,ignoreDefense=false){let total=0;livingEnemies().forEach(e=>{total+=elementHit(e,key,amount*(e===currentEnemy?1:falloff),ignoreDefense);});return total;}

  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    if(!key||!ELEMENTS[key]||!target||target.hp<=0)return null;const {forced=false,source="Weapon"}=opts,item=player.equipment.weapon,e=ELEMENTS[key],weak=target.weakness===key,guaranteedRend=!forced&&item?.mythicPiece==="weapon"&&player.combatAttackCount>0&&player.combatAttackCount%5===0;if(!forced){if(!item||item.element!==key)return null;const setProc=v19SetProcBonus(),chance=clamp(.14+rarityValues[item.rarity]*.025+player.elementProcBonus+setProc+(weak?.22:0),0,.98);if(!guaranteedRend&&random()>=chance)return null;}
    playElementAnimation(key,target,false);const rendPower=guaranteedRend?1.65:1,setElementPower=v19SetElementPower(),mult=(weak?1.55+player.weaknessElementBonus:1)*(1+player.elementDamageBonus)*rendPower*setElementPower;let totalDamage=0,heal=0,extra=guaranteedRend?" Reality Rend guarantees and strengthens the activation.":"",aoe=["ice","light","nature","metal","donut"].includes(key),old=currentEnemy;currentEnemy=target;
    if(target.affinity===key)extra+=` ${target.name}'s ${e.name} affinity resists half of matching elemental damage.`;
    if(key==="fire")totalDamage=elementHit(target,key,player.attack*.65*mult);
    if(key==="ice"){totalDamage=elementHitAll(key,player.attack*.38*mult,.85);if(target.guardian){if((target.freezeCooldown||0)<=0){target.skipTurns=(target.skipTurns||0)+1;target.freezeCooldown=2;extra+=" The guardian is frozen; Ice Nova cannot freeze it again until it has recovered.";}else extra+=` The guardian resists the freeze (${target.freezeCooldown} response${target.freezeCooldown===1?"":"s"} remain).`;}else{target.skipTurns=(target.skipTurns||0)+1;extra+=" The selected target is frozen.";}}
    if(key==="electric"){totalDamage=elementHit(target,key,player.attack*.90*mult);const stunChance=target.guardian?.075:.15;if(random()<stunChance){if(!target.guardian||(target.freezeCooldown||0)<=0){target.skipTurns=(target.skipTurns||0)+1;if(target.guardian)target.freezeCooldown=1;extra+=" Static Shock stuns the target for one response!";}}}
    if(key==="light"){totalDamage=elementHitAll(key,player.attack*.52*mult,.75);heal=healPlayer(Math.ceil(player.maxHp*(weak?.15:.09)*(1+player.elementDamageBonus)));extra+=heal?` Holy restores ${heal} HP.`:"";}
    if(key==="void")totalDamage=elementHit(target,key,Math.max(1,Math.min(target.maxHp*(weak?.14:.09)*mult,player.attack*4.5*mult)),true);
    if(key==="nature"){totalDamage=elementHitAll(key,player.attack*.30*mult,.8);const add=Math.max(1,player.naturePoisonStacks||1);livingEnemies().forEach(x=>x.poisonStacks=(x.poisonStacks||0)+add);extra+=` Poison Vines add ${add} Poison stack${add===1?"":"s"} to every living enemy.`;}
    if(key==="donut"){totalDamage=elementHitAll(key,player.attack*.30*mult,.75);heal=healPlayer(Math.ceil(player.maxHp*(weak?.28:.18)*(1+player.elementDamageBonus)));extra+=` Donut Rain pelts the pack and restores ${heal} HP.`;}
    if(key==="tech"){totalDamage=elementHit(target,key,player.attack*.42*mult);const cut=Math.max(1,Math.ceil(target.attack*(weak?.22:.14)*(1+player.elementDamageBonus)));target.attack=Math.max(1,target.attack-cut);extra+=` Brain Hack lowers ${target.name}'s attack by ${cut}.`;}
    if(key==="metal"){totalDamage=elementHitAll(key,player.attack*.58*mult,.78);player.ultimateCharge=clamp(player.ultimateCharge+(weak?22:14),0,100);extra+=" The riff charges your ultimate.";}
    if(key==="coffee"){totalDamage=elementHit(target,key,player.attack*.34*mult);player.hasteTurns+=1;player.ultimateCharge=clamp(player.ultimateCharge+8,0,100);extra+=" Caffeinated Haste deals damage and grants another action.";}
    if(key==="gun"){const armorPierce=Math.ceil((target.defense||0)*.5);totalDamage=elementHit(target,key,player.attack*1.05*mult+armorPierce);extra+=" Deadeye Volley ignores roughly half the target's Defense.";}
    currentEnemy=old?.hp>0?old:(livingEnemies()[0]||target);if(weak&&player.elementUltimateGain){player.ultimateCharge=clamp(player.ultimateCharge+player.elementUltimateGain,0,100);extra+=` Weakness Lore grants ${player.elementUltimateGain} ultimate charge.`;}
    const echoed=random()<clamp(player.elementEchoChance,0,.80);if(echoed){playElementAnimation(key,target,false);if(totalDamage){const echoTarget=target.hp>0?target:(livingEnemies()[0]||target),echoDamage=aoe?damageAll(Math.max(1,totalDamage/Math.max(1,livingEnemies().length||1)),.75):damageEnemy(echoTarget,totalDamage);totalDamage+=echoDamage;}if(heal)heal+=healPlayer(heal);extra+=" Prismatic Echo repeats the effect!";}
    trackElementProgress(key,totalDamage+heal);const message=`${weak?"WEAKNESS! ":""}${e.icon} ${e.spell}${totalDamage?` deals ${totalDamage} elemental damage${aoe?" across the pack":""}.`:""}${extra}`;addLog(`<b>${e.spell}</b> ${source}${weak?" exploits a weakness":" activates"}${echoed?" and echoes":""}.`);showToast(`${e.icon} ${e.spell}${weak?" — WEAKNESS!":""}${echoed?" ×2":""}`);return {totalDamage,heal,message,weak,echoed,aoe};
  };

  applyPoisonTick=function(){const selectedBeforeTick=currentEnemy;let total=0,notes=[];for(const e of livingEnemies()){const stacks=e.poisonStacks||0;if(!stacks)continue;let dmg=Math.max(1,Math.round(player.attack*(player.poisonStackPower||.12)*stacks));if(e.affinity==="nature")dmg*=.5;const dealt=damageEnemy(e,dmg,true);total+=dealt;notes.push(`${e.name}: ${dealt} (${stacks} stack${stacks===1?"":"s"})`);}if(selectedBeforeTick?.hp<=0)db0648ReconcileDefeatedTarget(selectedBeforeTick,"poison");if(total){if(currentEnemy?.hp>0)playElementAnimation("nature",currentEnemy,false);setCombatText(`☠️ Poison ticks — ${notes.join(" · ")}.`);updateCombatUI();}return total;};

  petTurn=async function(){const targets=livingEnemies();if(!targets.length)return;const target=currentEnemy?.hp>0?currentEnemy:targets[0],def=activePetDef(),pet=$("combatPet");pet.classList.remove("pet-attack");void pet.offsetWidth;pet.classList.add("pet-attack");await delay(300);let hits=1,totalBase=petDamage();if(random()<clamp(player.petDoubleChance+(v19SetPetDoubleBonus()),0,.95))hits=2;let total=0,element=def.element;if(def.id==="neutral")element=pick(DIBO_ELEMENTS);for(let i=0;i<hits;i++){let amount=totalBase;if(element&&target.weakness===element)amount=Math.round(amount*1.5);if(element&&target.affinity===element)amount=Math.round(amount*.5);total+=damageEnemy(target,amount);if(element)trackElementProgress(element,amount);}tone(520,.08,"triangle",.025,760);setCombatText(`${def.name} ${hits===2?"attacks twice":"attacks"} for ${total} ${element?ELEMENTS[element].name:"neutral"} damage${target.affinity===element?" (affinity resisted half)":""}${def.id==="neutral"?` after rolling ${ELEMENTS[element].icon}`:""}.`);if(target.hp<=0)setCurrentEnemy(currentEnemies.indexOf(target));updateCombatUI();await delay(620);pet.classList.remove("pet-attack");};

  openGambler=function(){const grid=$("gambleGrid");grid.innerHTML="";if(player.gold<=0){player.gold=100;$("gambleResult").textContent="The Gambler stares at your empty purse, sighs theatrically, and hands you 100 gold out of pity.";addLog("<b>Gambler:</b> You had no gold, so the Gambler takes pity and gives you <b>100 gold</b>.");showToast("🪙 Pity fund: +100 gold");updateHUD();}else $("gambleResult").textContent=`You carry ${player.gold} gold.`;[0,.25,.5,1].forEach(p=>{const wager=Math.floor(player.gold*p),b=document.createElement("button");b.className="choice-btn uncommon";b.innerHTML=`<span class="choice-icon">🪙</span><span class="choice-name">Bet ${Math.round(p*100)}%</span><span class="choice-desc">${wager} gold on a coinflip.</span>`;b.addEventListener("click",()=>{if(p===0){finishGambler("You politely decline.");return;}const actual=Math.floor(player.gold*p),win=random()<.5;if(win){player.gold+=actual;finishGambler(`Heads! You win ${actual} gold.`);}else{player.gold-=actual;finishGambler(`Tails! You lose ${actual} gold.`);}});grid.appendChild(b);});$("gamblerOverlay").classList.remove("hidden");};

  const restoration=wheelRewards.find(r=>r.name==="Restoration");if(restoration)restoration.apply=function(){if(player.hp>=player.maxHp){player.maxHp+=10;player.hp+=10;return "You were already at full HP, so Restoration permanently adds +10 max HP for this run instead.";}const heal=healPlayer(Math.ceil(player.maxHp*.55));return `The wheel restores ${heal} HP.`;};



  // Re-render once so the updated class order/portraits are immediately visible.
  renderClassChoices();
  /* SEMANTIC OWNER — Class identity mechanics, combat resources, portraits and action dispatch. Migrated from the retired Alpha legacy stack in 3.1.6. */
  /* ---------- Alpha v1.3: class identities, enemy art and hidden AI simulation harness ---------- */
  document.title=`Dicebound: Alpha v1.3 — ${pick([
    "mana was a terrible idea, so naturally we added it",
    "the bosses have faces now",
    "the rogue has checked your pockets",
    "the d20 insists on rolling again",
    "now internally tested by tiny imaginary adventurers"
  ])}`;

  const v13Style=document.createElement("style");
  v13Style.textContent=`
    .class-resource-wrap{margin:10px 0 2px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.075)}
    .class-resource-wrap.hidden{display:none}
    .class-resource-label{display:flex;justify-content:space-between;gap:10px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:5px}
    .class-resource-bar{height:8px;border-radius:999px;background:rgba(0,0,0,.28);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
    .class-resource-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7658ff,#65dcff);transition:width .18s ease}
    .class-resource-wrap.blood .class-resource-bar i{background:linear-gradient(90deg,#6e1027,#ff4f70)}
    .class-resource-wrap.combo .class-resource-bar i{background:linear-gradient(90deg,#d47a3b,#ffd16f)}
    .class-resource-wrap.smoke .class-resource-bar i{background:linear-gradient(90deg,#394555,#b9d0e6)}
    .class-resource-wrap.rage .class-resource-bar i{background:linear-gradient(90deg,#6d1017,#ff6a47)}
    .class-resource-wrap.mark .class-resource-bar i{background:linear-gradient(90deg,#2c794c,#8ce388)}
    .class-resource-note{font-size:9px;color:#cbd6e7;line-height:1.35;margin-top:5px}
    .combat-actions.has-special{grid-template-columns:repeat(5,1fr)}
    .combat-btn.special{background:linear-gradient(180deg,rgba(122,83,208,.34),rgba(58,37,106,.42));border-color:rgba(181,140,255,.36)}
    .combat-btn.special.steal{background:linear-gradient(180deg,rgba(95,151,189,.28),rgba(27,64,88,.45));border-color:rgba(118,201,245,.38)}
    .combat-btn.special.faith{background:linear-gradient(180deg,rgba(222,187,91,.26),rgba(105,75,22,.45));border-color:rgba(247,215,128,.4)}
    .stage-mark{font-size:11px;line-height:1;color:#dff8e1;font-weight:1000;background:rgba(33,87,50,.7);border:1px solid rgba(115,222,139,.35);padding:2px 5px;border-radius:999px;margin-top:2px}
    .identity-flash{position:absolute;z-index:45;left:50%;top:24%;transform:translate(-50%,-50%);pointer-events:none;font-size:15px;font-weight:1000;padding:8px 12px;border-radius:999px;background:rgba(10,15,28,.92);border:1px solid rgba(181,140,255,.42);box-shadow:0 8px 20px rgba(0,0,0,.45);animation:identityFlash .95s ease-out forwards}
    @keyframes identityFlash{0%{opacity:0;transform:translate(-50%,-25%) scale(.7)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-78%) scale(.94)}}
    @media(max-width:760px){.combat-actions.has-special{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(v13Style);

  // ---- identity descriptions -------------------------------------------------
  const MANA_OCCULT_CLASSES=new Set(["sorcerer","vampire","rouge","merchant"]);
  const OCCULT_SPELLS={
    sorcerer:{builder:"Channel Bolt",builderIcon:"🔮",spell:"Arcane Lance",spellIcon:"✦",cost:35,gain:28,desc:"Channel Bolt deals slightly reduced normal attack damage and builds Mana. Arcane Lance spends 35 Mana for a heavy spell, converts half of your Echo Strike chance into bonus Lance damage, applies Lifesteal, and guarantees a random core-element eruption."},
    vampire:{builder:"Night Siphon",builderIcon:"🦇",spell:"Grave Lance",spellIcon:"🌑",cost:35,gain:26,desc:"Night Siphon builds Mana while attacking. Grave Lance spends 35 Mana for heavy damage and drains 30% of the direct damage as HP."},
    rouge:{builder:"Crimson Stroke",builderIcon:"🖌️",spell:"Scarlet Hex",spellIcon:"🌹",cost:35,gain:27,desc:"Crimson Stroke paints Mana into existence. Scarlet Hex spends 35 Mana for a high-crit occult strike and splashes crimson damage into the pack."},
    merchant:{builder:"Ledger Tap",builderIcon:"📜",spell:"Foreclosure Hex",spellIcon:"⚖️",cost:40,gain:30,desc:"Ledger Tap builds Mana through deeply questionable accounting. Foreclosure Hex spends 40 Mana and converts part of your current gold into occult damage."}
  };

  Object.assign(CLASS_PASSIVES,{
    ranger:{name:"Marked Quarry",desc:"Basic attacks mark their target up to 3 times. Each mark adds Crit against that target; Arrow Storm consumes all marks for extra damage."},
    fighter:{name:"Counterstance",desc:"Guarding primes the Fighter's next basic attack for a heavy counterblow."},
    sorcerer:{name:"Arcane Reservoir",desc:"Uses Mana. Channel Bolt builds it; Arcane Lance spends it, converts Echo Strike chance into damage, and applies Lifesteal."},
    monk:{name:"Flowing Combo",desc:"Consecutive basic attacks build Combo, increasing damage, Echo chance and Dodge. Guarding or drinking a potion resets it."},
    clown:{name:"Opening Gag",desc:"Every battle begins with a random comedy gimmick: shoes, pies, barriers, applause or chickens."},
    berserker:{name:"Blood Rage",desc:"Every 1% missing HP grants +1% damage as Rage. The Rage bar fills as HP falls."},
    turtle:{name:"Shell Discipline",desc:"Guarding primes a crushing shell counter on the next basic attack. Starts with an extra Barrier and +1 Defense."},
    frog:{name:"Predatory Bounce",desc:"Echo-heavy attacks become especially vicious against enemies below half HP."},
    d20:{name:"Probability Leak",desc:"Nearly every combat action rolls a visible d20. The class intentionally pauses so you can witness fate making mistakes."},
    slime:{name:"Borrowed Shapes",desc:"Has no privileged mechanic of its own. Instead it can learn many non-Ultimate class powers from other non-secret classes."},
    vampire:{name:"Night Hunger",desc:"Uses Mana for occult attacks while retaining extreme Lifesteal. Grave Lance converts spell damage back into health."},
    ninja:{name:"Smoke Counter",desc:"Critical hits build Smoke. At 3 Smoke, the next basic attack becomes a defense-piercing execution strike."},
    rouge:{name:"Painted Hexcraft",desc:"Uses Mana. Crimson Stroke builds it; Scarlet Hex spends it on violent battle-art magic."},
    ceo:{name:"Executive Compensation",desc:"All gold gained is increased by +200%. Secret classes are allowed to be financially irresponsible."},
    merchant:{name:"Occult Accounting",desc:"Selling unused gear pays 200% normal value. Ledger Tap and Foreclosure Hex also use Mana."},
    cleric:{name:"Faith",desc:"Healing builds Faith. At full Faith, the Cleric can cast a free Consecration during combat."},
    paladin:{name:"Oathplate",desc:"Defense contributes 35% of its value to ordinary attack damage. The class remains deliberately stable and dependable."},
    beastmaster:{name:"Pack Orders",desc:"Can switch its companion between Aggressive, Defensive and Support stances during battle."},
    rogue:{name:"Sticky Fingers",desc:"Can attempt to Steal once per battle for gold and occasionally a potion. Above 50 Luck, successful Steals can also steal a random powerup. Starts with +25% gold gain and +5% Dodge."},
    bloodmage:{name:"Blood Is Mana",desc:"Uses HP where other occult classes use Mana. Bloodletting restores fuel; Exsanguinate spends life for brutal damage; Replenish heals both sides."}
  });
  Object.entries(CLASS_PASSIVES).forEach(([id,p])=>{if(CLASSES[id])CLASSES[id].passive=p;});

  if(CLASSES.sorcerer){CLASSES.sorcerer.desc="An occult spellcaster with a real Mana cycle: Channel Bolt builds Mana and Arcane Lance spends it on heavy elemental magic. Arcane Lance converts half of Echo Strike chance into bonus spell damage and applies Lifesteal.";CLASSES.sorcerer.stats="27 HP · 7 ATK · 25/100 MANA · 5 LUCK";CLASSES.sorcerer.scaleNotes="Attack powers both Channel Bolt and Arcane Lance. Arcane Lance converts half of your Echo Strike chance into bonus damage and applies Lifesteal to the spell plus its forced elemental eruption. Mana generation determines spell frequency; Crit, elemental power and Luck improve the payoff.";}
  if(CLASSES.vampire){CLASSES.vampire.desc="A lifestealing occult duelist. Night Siphon builds Mana; Grave Lance spends it and drinks the damage back as health.";CLASSES.vampire.stats="36 HP · 7 ATK · 25/100 MANA · 28% LIFESTEAL";}
  if(CLASSES.rouge){CLASSES.rouge.desc="Rouge—the colour, not the thief—is a crimson battle artist whose occult brushwork builds Mana for Scarlet Hex.";CLASSES.rouge.stats="31 HP · 7 ATK · 25/100 MANA · 12% CRIT";}
  if(CLASSES.merchant){CLASSES.merchant.desc="A secret trader using gold, resale margins and actual occult accounting. It builds Mana with Ledger Tap and spends it on Foreclosure Hex.";CLASSES.merchant.stats="45 HP · 10 ATK · 25/100 MANA · 20 LUCK · GOLD SCALING";}
  if(CLASSES.rogue){CLASSES.rogue.desc="A fast opportunist built around Dodge, gold and one Steal attempt per battle. The Rogue wins by making every pocket somebody else's problem.";}
  if(CLASSES.bloodmage){CLASSES.bloodmage.desc="A forbidden occult caster that replaces Mana with HP. Bloodletting restores fuel, Exsanguinate spends life for damage, and Replenish heals both combatants.";}
  if(CLASSES.d20){CLASSES.d20.desc="A hidden avatar of probability. Combat actions visibly roll a d20, pause on the result, and can erupt into absurd outcomes.";}
  if(CLASSES.slime){CLASSES.slime.desc="No true class identity and no exclusive specialty: the Slime survives by borrowing non-Ultimate strengths from many other non-secret classes.";}

  ["sorcerer","vampire","rouge","merchant"].forEach(id=>{if(CLASSES[id])CLASSES[id].tags=[...new Set([...(CLASSES[id].tags||[]),"mana"])];});
  if(CLASSES.bloodmage)CLASSES.bloodmage.tags=[...new Set([...(CLASSES.bloodmage.tags||[]),"blood-fuel"])];

  // ---- even more thematic class portraits -----------------------------------
  const classArtV13={
    ranger:{bg1:"#0b261f",bg2:"#356d3d",skin:"#d2a06b",body:"#1c4d31",motif:`<path d="M7 58Q23 42 59 8" stroke="#d7a454" stroke-width="3" fill="none"/><path d="M50 10l9 3-7 6" fill="#f3ebcf"/>`,head:`<path d="M14 27Q18 6 33 6T51 27Q34 18 14 27" fill="#214f31"/><path d="M18 17Q34 8 47 20" stroke="#6f9e59" stroke-width="3" fill="none"/>`,gear:`<path d="M13 57Q18 39 31 39T51 57" fill="#193b2a"/><path d="M17 53l30-6" stroke="#d9b169" stroke-width="2"/>`},
    fighter:{bg1:"#121b2b",bg2:"#516787",skin:"#c89263",body:"#384862",motif:`<path d="M8 54l13-31 11 10 12-17 12 38" fill="none" stroke="#9eb4d4" stroke-width="2" opacity=".7"/>`,head:`<path d="M14 26Q16 5 32 5T50 26H14" fill="#8fa0b7"/><path d="M18 20h28v10H18z" fill="#263449"/><path d="M29 5h6v15h-6z" fill="#e2bd61"/>`,gear:`<path d="M10 59Q14 38 32 38T54 59" fill="#2f4059"/><path d="M17 45l15 10 15-10" fill="none" stroke="#9fb4d0" stroke-width="3"/>`},
    sorcerer:{bg1:"#140c2b",bg2:"#613cb0",skin:"#d6a97d",body:"#302052",motif:`<circle cx="51" cy="13" r="7" fill="#8d63ff" opacity=".8"/><path d="M51 3v20M41 13h20" stroke="#e9dbff" stroke-width="1.5" opacity=".8"/><circle cx="12" cy="51" r="5" fill="#65dcff" opacity=".6"/>`,head:`<path d="M6 20h52L38 4H26z" fill="#4a287f"/><path d="M14 19Q32 12 51 19" stroke="#d5b0ff" stroke-width="3" fill="none"/>`,gear:`<path d="M11 60Q15 39 32 39T54 60" fill="#271a48"/><path d="M32 40l7 13-7 8-7-8z" fill="#8f68ff"/>`},
    monk:{bg1:"#301a0e",bg2:"#9a562a",skin:"#c98d5f",body:"#8e3e2c",motif:`<circle cx="11" cy="11" r="7" fill="none" stroke="#ffd087" stroke-width="2"/><path d="M6 11h10M11 6v10" stroke="#ffd087" stroke-width="1.5"/>`,head:`<path d="M18 15Q32 7 46 15" stroke="#e0543d" stroke-width="5" fill="none"/><path d="M18 16l-8 8" stroke="#e0543d" stroke-width="3"/>`,gear:`<path d="M11 60Q16 39 32 39T53 60" fill="#8d452d"/><path d="M24 42l8 13 8-13" fill="#e6a35d" opacity=".6"/><circle cx="12" cy="49" r="6" fill="#c88f5c"/><circle cx="52" cy="49" r="6" fill="#c88f5c"/>`},
    clown:{bg1:"#2c0927",bg2:"#b51e7b",skin:"#f5ddd7",body:"#5b1b70",motif:`<circle cx="9" cy="51" r="6" fill="#ffd64d"/><circle cx="55" cy="48" r="7" fill="#5fcfff"/><path d="M7 9l8 5-6 7" fill="#ff5c55"/>`,head:`<path d="M12 17Q19 2 31 14Q43 0 53 17l-8 7H19z" fill="#d43d7c"/><circle cx="17" cy="12" r="5" fill="#ff5c55"/><circle cx="48" cy="11" r="5" fill="#5fcfff"/><circle cx="32" cy="29" r="3" fill="#ef4250"/>`,gear:`<path d="M9 60Q14 39 32 39T55 60" fill="#5d1d72"/><path d="M18 45l14 11 14-11" fill="#ffd64d" opacity=".7"/>`},
    berserker:{bg1:"#26090d",bg2:"#8f1e24",skin:"#b97955",body:"#4b1717",motif:`<path d="M8 55L23 9M56 55L40 10" stroke="#d6c3a0" stroke-width="3"/><path d="M7 55l8-2-5-7M57 55l-8-2 5-7" fill="#a52d31"/>`,head:`<path d="M14 21L7 6l15 9M50 21l7-15-15 9" fill="#dfcfb0"/><path d="M13 25Q32 8 52 25" fill="#5a1717"/>`,gear:`<path d="M7 61Q15 38 32 38T57 61" fill="#501518"/><path d="M12 46l40 9" stroke="#8c2c2e" stroke-width="5"/>`},
    turtle:{bg1:"#0c281f",bg2:"#287b48",skin:"#76bd82",body:"#315f3d",motif:`<circle cx="32" cy="33" r="27" fill="none" stroke="#82d08e" stroke-width="3" opacity=".35"/><path d="M10 33h44M32 6v54M15 15l34 36M49 15L15 51" stroke="#82d08e" stroke-width="1" opacity=".25"/>`,head:`<ellipse cx="32" cy="26" rx="16" ry="13" fill="#77c183"/><circle cx="26" cy="24" r="2" fill="#15221a"/><circle cx="38" cy="24" r="2" fill="#15221a"/>`,gear:`<path d="M9 61Q12 37 32 37T55 61" fill="#356b43"/><path d="M17 50Q32 38 47 50Q32 62 17 50" fill="#274e35" stroke="#83c78b" stroke-width="2"/>`},
    frog:{bg1:"#0d2b17",bg2:"#4a9e42",skin:"#6fd86a",body:"#2f7437",motif:`<path d="M4 52Q15 40 27 51T60 45" fill="none" stroke="#9de67e" stroke-width="2" opacity=".6"/>`,head:`<ellipse cx="32" cy="27" rx="18" ry="14" fill="#71dc6e"/><circle cx="22" cy="14" r="8" fill="#7fe878"/><circle cx="42" cy="14" r="8" fill="#7fe878"/><circle cx="22" cy="14" r="2.5" fill="#101820"/><circle cx="42" cy="14" r="2.5" fill="#101820"/><path d="M24 32Q32 37 40 32" stroke="#22592b" stroke-width="2" fill="none"/>`,gear:`<path d="M8 61Q14 41 32 41T56 61" fill="#326f39"/>`},
    d20:{bg1:"#10143b",bg2:"#326aa0",skin:"#d4a276",body:"#202b65",motif:`<polygon points="9,7 19,13 16,25 5,25 2,13" fill="#295c9a" stroke="#8cd8ff"/><text x="11" y="19" text-anchor="middle" font-size="8" fill="white">?</text><polygon points="55,39 63,44 60,56 49,56 46,44" fill="#6b3ea7" stroke="#d7b9ff"/>`,head:`<polygon points="32,4 52,17 45,39 19,39 12,17" fill="#295c9a" stroke="#a8e7ff" stroke-width="2"/><path d="M12 17h40M19 39l13-35 13 35" stroke="#77b9dd" stroke-width="1"/><text x="32" y="27" text-anchor="middle" font-size="13" fill="white" font-weight="900">20</text>`,gear:`<path d="M11 61Q16 40 32 40T53 61" fill="#222b67"/>`},
    slime:{bg1:"#0a2e13",bg2:"#36a94a",skin:"#66d977",body:"#4cc75c",motif:`<circle cx="10" cy="12" r="4" fill="#8cf595" opacity=".7"/><circle cx="53" cy="50" r="5" fill="#8cf595" opacity=".5"/>`,head:`<path d="M12 37Q12 6 32 6T52 37Q52 45 44 42l-5 6-7-5-7 5-5-6q-8 3-8-5z" fill="#65db74"/><circle cx="26" cy="25" r="2" fill="#122018"/><circle cx="38" cy="25" r="2" fill="#122018"/><path d="M27 31q5 4 10 0" stroke="#2e7d3a" stroke-width="2" fill="none"/>`,gear:`<path d="M14 56q18-11 36 0" stroke="#a4f7aa" stroke-width="3" opacity=".35"/>`},
    vampire:{bg1:"#260717",bg2:"#7c163f",skin:"#eee4df",body:"#331020",motif:`<path d="M4 54L17 18 31 50 46 16 60 55" fill="#5d1233" opacity=".6"/>`,head:`<path d="M13 22Q32 5 51 22Q38 18 32 20Q24 16 13 22" fill="#1d1019"/><path d="M27 33l3 7 2-5 2 5 3-7" fill="#fff"/>`,gear:`<path d="M6 61Q12 35 32 40Q52 35 58 61" fill="#3b0d25"/><path d="M8 42l13 13M56 42L43 55" stroke="#a42a5a" stroke-width="4"/>`},
    ninja:{bg1:"#0a1017",bg2:"#33495f",skin:"#d1a071",body:"#111923",motif:`<path d="M8 11l12 4-9 8zM56 8l-5 13-9-9zM54 52l-13 4 7-11z" fill="#8ca7c8" opacity=".65"/>`,head:`<path d="M10 19Q32 3 54 19v19H10z" fill="#121922"/><path d="M16 23h32v10H16z" fill="#a9bfd7" opacity=".82"/>`,gear:`<path d="M9 61Q15 38 32 38T55 61" fill="#121b25"/><path d="M13 52l39-8M14 44l38 9" stroke="#9fb5c8" stroke-width="2"/>`},
    rouge:{bg1:"#3d0c1e",bg2:"#a12247",skin:"#e0ad82",body:"#6d1734",motif:`<path d="M52 7l5 4-20 42-5-3z" fill="#d8aa69"/><path d="M55 8l5-5 2 7" fill="#ff4e83"/><circle cx="9" cy="51" r="6" fill="#c9345d"/>`,head:`<path d="M14 14Q31 2 50 15Q36 22 14 14" fill="#bc3152"/><path d="M16 16l18-7 16 6" fill="#d34869"/>`,gear:`<path d="M10 61Q15 38 32 39T55 61" fill="#6b1732"/><path d="M18 47q14 9 28 0" stroke="#ff89a6" stroke-width="2"/>`},
    ceo:{bg1:"#211906",bg2:"#78631f",skin:"#d1a06d",body:"#25262c",motif:`<path d="M7 51l9-13 8 6 9-22 8 10 15-23" stroke="#f3d05f" stroke-width="3" fill="none"/><path d="M52 8l5 1-2 5" fill="#f3d05f"/>`,head:`<path d="M17 15Q32 5 48 16" fill="#5a4935"/><rect x="17" y="23" width="12" height="8" rx="2" fill="none" stroke="#111" stroke-width="2"/><rect x="35" y="23" width="12" height="8" rx="2" fill="none" stroke="#111" stroke-width="2"/><path d="M29 27h6" stroke="#111" stroke-width="2"/>`,gear:`<path d="M9 61Q14 39 32 39T55 61" fill="#25272d"/><path d="M27 41l5 14 5-14" fill="#db3948"/><path d="M18 44h9M37 44h9" stroke="#f0d67b" stroke-width="2"/>`},
    merchant:{bg1:"#26170b",bg2:"#8e5f24",skin:"#ca9362",body:"#5d3a1f",motif:`<circle cx="51" cy="13" r="9" fill="#ddb24c"/><text x="51" y="17" text-anchor="middle" font-size="10" font-weight="900" fill="#4e3514">G</text><path d="M5 51h18M9 47v8M18 47v8" stroke="#dfb965" stroke-width="2"/>`,head:`<path d="M12 18h40L44 7H20z" fill="#704827"/><path d="M21 31Q23 49 32 50Q42 49 44 31Q39 40 32 39Q25 40 21 31" fill="#70422d"/>`,gear:`<path d="M8 61Q13 39 32 39T56 61" fill="#5d391f"/><path d="M18 47h28" stroke="#d5a24f" stroke-width="4"/>`},
    cleric:{bg1:"#0e2545",bg2:"#627fb5",skin:"#deb383",body:"#e4e9f1",motif:`<ellipse cx="32" cy="8" rx="15" ry="5" fill="none" stroke="#ffe98c" stroke-width="3"/><path d="M8 49h11M13 44v11M48 14h9M52 10v9" stroke="#ffe98c" stroke-width="2"/>`,head:`<path d="M16 18Q32 7 48 18" fill="#eef2f7"/><path d="M32 6v14M25 13h14" stroke="#f3d45e" stroke-width="3"/>`,gear:`<path d="M9 61Q15 38 32 38T55 61" fill="#edf0f5"/><path d="M32 39v18M24 48h16" stroke="#e0bd4f" stroke-width="3"/>`},
    paladin:{bg1:"#111c36",bg2:"#7d6c32",skin:"#d4a77a",body:"#a99655",motif:`<circle cx="51" cy="50" r="10" fill="none" stroke="#f4dc86" stroke-width="3"/><path d="M51 42v16M43 50h16" stroke="#f4dc86" stroke-width="2"/>`,head:`<path d="M13 26Q15 4 32 4T51 26H13" fill="#cfb45f"/><path d="M19 20h26v13H19z" fill="#39445f"/><path d="M32 5v14M26 12h12" stroke="#fff3a8" stroke-width="2"/>`,gear:`<path d="M8 61Q13 38 32 38T56 61" fill="#a99250"/><path d="M20 43l12 14 12-14" fill="#3c4964"/>`},
    beastmaster:{bg1:"#21190d",bg2:"#6c4c23",skin:"#ca9469",body:"#4a321c",motif:`<circle cx="52" cy="50" r="9" fill="#17120e"/><text x="52" y="55" text-anchor="middle" font-size="13">🐾</text><path d="M5 17l11 5M59 17l-11 5" stroke="#d0a45d" stroke-width="3"/>`,head:`<path d="M15 20l6-14 9 11M49 20L43 6l-9 11" fill="#8c6335"/><path d="M16 20Q32 7 49 20" fill="#654426"/>`,gear:`<path d="M8 61Q14 38 32 38T56 61" fill="#4d341d"/><path d="M12 44l12 8 8-12 8 12 12-8" fill="#8b6336" opacity=".75"/>`},
    rogue:{bg1:"#091018",bg2:"#294d66",skin:"#c99068",body:"#172430",motif:`<path d="M8 52L25 9M56 52L39 9" stroke="#9ed8f4" stroke-width="2"/><path d="M7 53l8-1-5-7M57 53l-8-1 5-7" fill="#9ed8f4"/>`,head:`<path d="M9 27Q14 4 32 4T55 27l-9-4H18z" fill="#1d2934"/><path d="M16 24h32v9H16z" fill="#091018"/>`,gear:`<path d="M8 61Q14 39 32 39T56 61" fill="#17242f"/><path d="M20 43l12 13 12-13" fill="#2e536b"/>`},
    bloodmage:{bg1:"#280712",bg2:"#8f1733",skin:"#e5c0b0",body:"#551126",motif:`<circle cx="32" cy="30" r="26" fill="none" stroke="#ff4969" stroke-width="1.5" opacity=".45"/><path d="M32 4l4 9-4 9-4-9zM6 45l9-2-4 9M58 45l-9-2 4 9" fill="#ff5673"/>`,head:`<path d="M10 28Q15 4 32 4T54 28l-10-5H20z" fill="#5c1128"/><path d="M32 7l5 9-5 9-5-9z" fill="#ef4461"/>`,gear:`<path d="M7 61Q13 37 32 39T57 61" fill="#571126"/><path d="M16 48q16 13 32 0" stroke="#ff5b78" stroke-width="3" fill="none"/>`}
  };

  classPortraitSVG=function(classId){
    const cls=CLASSES[classId]||CLASSES.ranger,cfg=classArtV13[classId]||classArtV13.ranger,special=["frog","slime","d20"].includes(classId),gid=`c13_${classId}`;
    return `<svg viewBox="0 0 64 64" role="img" aria-label="${cls.name} portrait"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${cfg.bg1}"/><stop offset="1" stop-color="${cfg.bg2}"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#060b13"/><rect x="2" y="2" width="60" height="60" rx="13" fill="url(#${gid})"/><g opacity=".9">${cfg.motif||""}</g>${special?"":`<circle cx="32" cy="27" r="13" fill="${cfg.skin}"/><circle cx="27.5" cy="26" r="1.4" fill="#171717"/><circle cx="36.5" cy="26" r="1.4" fill="#171717"/><path d="M28 32q4 2 8 0" stroke="#8a4c3c" stroke-width="1.4" fill="none" stroke-linecap="round"/>`}<g>${cfg.head||""}</g><g>${cfg.gear||""}</g></svg>`;
  };

  // ---- monster and boss portraits -------------------------------------------
  function artHash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return Math.abs(h>>>0);}
  function enemyPortraitSVG(enemy){
    // External artwork is authoritative when present in js/assets.js.
    // It bypasses the procedural SVG renderer completely, preventing old art from showing behind/over it.
    const externalArt=window.DiceboundAssets?.resolveEnemyPortrait?.(enemy?.name||"");
    if(externalArt){
      return `<img class="enemy-art-frame enemy-art-image" src="${externalArt.src}" alt="${externalArt.alt}" draggable="false">`;
    }
    const name=(enemy?.name||"Unknown").toLowerCase(),h=artHash(name),board=boardLevel||1;
    const palettes=[null,["#15271c","#4a724b","#9bc26c"],["#15172e","#51448b","#8eb5ff"],["#1b0d25","#6d275f","#dd6dad"],["#160f21","#755b31","#e3c36c"],["#0b1720","#356c78","#80e1dd"]];
    let [bg1,bg2,accent]=palettes[Math.min(5,Math.max(1,board))];
    let shape="",eye="#fff2a8",frame="";
    const boss=enemy?.guardian||enemy?.boss;
    if(name.includes("ancient road dragon")){bg1="#12261b";bg2="#486332";accent="#d6b567";shape=`<path d="M15 58Q8 37 25 24L15 9l18 9L48 6l-2 18q19 12 6 35z" fill="#365f35" stroke="#8eb36c" stroke-width="2"/><path d="M25 27l8 8 12-9" fill="none" stroke="#d0b064" stroke-width="3"/><path d="M21 43q12-8 25 0" fill="none" stroke="#172419" stroke-width="4"/><circle cx="26" cy="34" r="3" fill="#ffdc67"/><circle cx="43" cy="33" r="3" fill="#ffdc67"/><path d="M17 50l9-5M49 46l9 5" stroke="#bca272" stroke-width="4"/>`;}
    else if(name.includes("astral devourer")){bg1="#0d0c2d";bg2="#482978";accent="#a992ff";shape=`<path d="M13 57Q10 31 27 21L19 6l15 10L49 4l-3 18q19 13 5 35z" fill="#35265f" stroke="#8b6de3" stroke-width="2"/><path d="M22 42q13-14 27 0q-13 16-27 0" fill="#080817"/><circle cx="28" cy="32" r="3" fill="#bce8ff"/><circle cx="44" cy="31" r="3" fill="#bce8ff"/><circle cx="35" cy="44" r="2" fill="#fff"/><circle cx="30" cy="47" r="1" fill="#fff"/><circle cx="40" cy="48" r="1.4" fill="#fff"/>`;}
    else if(name.includes("nullstar hydra")){bg1="#090812";bg2="#351743";accent="#d05cff";shape=`<path d="M11 60q1-23 12-31l-8-17 15 11 2-17 7 16 14-12-7 19q11 11 7 31z" fill="#22132d" stroke="#7a3a91" stroke-width="2"/><circle cx="22" cy="29" r="8" fill="#341941"/><circle cx="36" cy="22" r="9" fill="#3f1c4e"/><circle cx="49" cy="30" r="8" fill="#341941"/><circle cx="22" cy="28" r="2" fill="#ff59df"/><circle cx="36" cy="21" r="2" fill="#ff59df"/><circle cx="49" cy="29" r="2" fill="#ff59df"/><circle cx="35" cy="44" r="11" fill="#050509"/><circle cx="35" cy="44" r="5" fill="#1d1230"/>`;}
    else if(name.includes("crown-eater")){bg1="#140b1f";bg2="#61422c";accent="#f1d46d";shape=`<path d="M12 59q1-25 15-34L19 8l13 8 9-13 6 16 12-5-8 17q10 13 3 28z" fill="#2c1b33" stroke="#b18950" stroke-width="2"/><path d="M19 15l8 5 5-9 7 9 9-6 3 11H18z" fill="#d3aa4f"/><path d="M24 40q10-9 22 0" stroke="#f1d46d" stroke-width="4" fill="none"/><circle cx="27" cy="32" r="2.5" fill="#f5c85b"/><circle cx="44" cy="32" r="2.5" fill="#f5c85b"/>`;}
    else if(name.includes("ring tyrant")){bg1="#071720";bg2="#245f6e";accent="#80e1dd";shape=`<circle cx="36" cy="34" r="25" fill="none" stroke="#8af2e6" stroke-width="5" opacity=".75"/><circle cx="36" cy="34" r="18" fill="none" stroke="#d8c56a" stroke-width="2" opacity=".7"/><path d="M16 58q1-26 17-34L25 9l13 8L49 5l-2 20q15 13 5 33z" fill="#173e48" stroke="#79bfc2" stroke-width="2"/><circle cx="29" cy="33" r="3" fill="#e6ffff"/><circle cx="45" cy="32" r="3" fill="#e6ffff"/><path d="M24 47q13-9 25 0" stroke="#d8c56a" stroke-width="3" fill="none"/>`;}
    else if(name.includes("ogre roadwarden")){shape=`<path d="M13 59q0-23 12-31L18 13l11 8 7-13 8 13 11-8-6 16q12 10 8 30z" fill="#52623b" stroke="#9bb06c" stroke-width="2"/><circle cx="28" cy="33" r="3" fill="#f0c662"/><circle cx="45" cy="33" r="3" fill="#f0c662"/><path d="M25 45h24" stroke="#31281d" stroke-width="5"/><path d="M10 52h12M16 47v10" stroke="#d3a75e" stroke-width="4"/>`;}
    else if(name.includes("titan guard")){bg1="#16172a";bg2="#4b4c72";shape=`<path d="M14 59V24l11-13 11 8 12-9 9 14v35z" fill="#55586d" stroke="#a5a9bd" stroke-width="2"/><path d="M21 23l12 8 13-9" stroke="#c7c8d2" stroke-width="3" fill="none"/><rect x="23" y="34" width="9" height="4" rx="2" fill="#8fe4ff"/><rect x="42" y="34" width="9" height="4" rx="2" fill="#8fe4ff"/><path d="M29 47h18" stroke="#242536" stroke-width="5"/>`;}
    else if(name.includes("paradox warden")){bg1="#160c22";bg2="#60305f";shape=`<circle cx="36" cy="32" r="24" fill="none" stroke="#e2b2ff" stroke-width="2" opacity=".5"/><path d="M36 9v11M36 44v11M13 32h11M48 32h11" stroke="#f0d4ff" stroke-width="2"/><path d="M18 58q0-27 18-39q18 12 18 39z" fill="#44264b" stroke="#b678bd" stroke-width="2"/><path d="M25 28h22v17H25z" fill="#1d1427"/><path d="M27 33l7 4 7-4" stroke="#ff81d7" stroke-width="2" fill="none"/>`;}
    else if(name.includes("ringbound chancellor")){bg1="#0c1821";bg2="#3d6b67";shape=`<circle cx="36" cy="27" r="22" fill="none" stroke="#d7c566" stroke-width="4" opacity=".65"/><path d="M15 59q3-26 21-38 18 12 21 38z" fill="#25484a" stroke="#79b7ae" stroke-width="2"/><path d="M22 22l8-7 6 5 7-6 8 8-4 8H25z" fill="#d0b658"/><path d="M25 34h9M42 34h9" stroke="#d9ffff" stroke-width="3"/>`;}
    else if(name.includes("road merchant")){bg1="#271807";bg2="#83551e";shape=`<path d="M13 58q4-27 23-37 19 10 23 37z" fill="#5a3c20" stroke="#c08d42" stroke-width="2"/><path d="M17 21h38L47 9H25z" fill="#704827"/><path d="M25 32q3 16 11 16t12-16q-5 9-12 8-7 1-11-8z" fill="#70422d"/><circle cx="54" cy="14" r="8" fill="#dfb54c"/><text x="54" y="18" text-anchor="middle" font-size="10" font-weight="900" fill="#523710">G</text>`;}
    else if(name.includes("bloodmage")){bg1="#280713";bg2="#8d1933";shape=`<circle cx="36" cy="34" r="25" fill="none" stroke="#ff4767" stroke-width="2" opacity=".4"/><path d="M12 59q4-28 24-39 20 11 24 39z" fill="#5b1228" stroke="#bd3552" stroke-width="2"/><path d="M17 25Q23 5 36 5t20 20l-9-5H25z" fill="#71132f"/><path d="M36 7l5 9-5 9-5-9z" fill="#ff4c6d"/><circle cx="29" cy="32" r="2.5" fill="#ffd9df"/><circle cx="44" cy="32" r="2.5" fill="#ffd9df"/>`;}
    else if(name.includes("slime")){shape=`<path d="M13 57q-4-10 2-18Q13 13 36 12q22 2 21 27 7 9 0 18l-7-5-7 6-7-6-7 6-7-6z" fill="#5fce69" stroke="#9cf4a5" stroke-width="2"/><circle cx="28" cy="34" r="3" fill="#17311c"/><circle cx="44" cy="34" r="3" fill="#17311c"/>`;}
    else if(name.includes("goblin")){shape=`<path d="M10 30l13-8 3-13 10 10 13-10 1 14 13 7-12 4q4 21-15 24Q17 56 21 34z" fill="#758b42" stroke="#aec76c" stroke-width="2"/><circle cx="29" cy="34" r="3" fill="#ffe26c"/><circle cx="44" cy="33" r="3" fill="#ffe26c"/><path d="M31 47l10-3" stroke="#2c311c" stroke-width="3"/>`;}
    else if(name.includes("skeleton")){shape=`<circle cx="36" cy="30" r="18" fill="#d4cfbd" stroke="#f2eddc" stroke-width="2"/><circle cx="29" cy="28" r="5" fill="#19191c"/><circle cx="44" cy="28" r="5" fill="#19191c"/><path d="M36 34l-3 6h6z" fill="#19191c"/><path d="M25 47h22M28 51h16" stroke="#6a665e" stroke-width="3"/>`;}
    else if(name.includes("bandit")){shape=`<path d="M11 59q1-29 25-43 24 14 25 43z" fill="#202732" stroke="#667488" stroke-width="2"/><path d="M15 29Q21 7 36 7t21 22l-9-5H24z" fill="#121820"/><path d="M22 27h28v9H22z" fill="#080d12"/><path d="M11 53L28 14M59 53L44 14" stroke="#9cb2c8" stroke-width="2"/>`;}
    else if(name.includes("orc")){shape=`<path d="M13 58q0-25 12-35L21 8l13 10 12-9 4 15q12 9 8 34z" fill="#587644" stroke="#9ab977" stroke-width="2"/><circle cx="29" cy="32" r="3" fill="#ffd56a"/><circle cx="45" cy="32" r="3" fill="#ffd56a"/><path d="M26 46l6-6 4 8 5-8 7 6" fill="#e9dfbe"/>`;}
    else if(name.includes("cultist")){shape=`<path d="M10 60q4-34 26-50 22 16 26 50z" fill="#39213f" stroke="#815589" stroke-width="2"/><path d="M19 28Q24 11 36 11t17 17l-8-4H27z" fill="#211329"/><circle cx="29" cy="33" r="2.5" fill="#ed65db"/><circle cx="44" cy="33" r="2.5" fill="#ed65db"/><path d="M36 42l5 8-5 5-5-5z" fill="#a9489d"/>`;}
    else if(name.includes("wraith")){shape=`<path d="M15 59q-5-16 3-27Q18 8 36 8t18 24q8 11 3 27l-8-7-7 8-6-7-6 7-7-8z" fill="#9aa8c2" opacity=".65" stroke="#d5e5ff" stroke-width="2"/><circle cx="29" cy="30" r="3" fill="#243147"/><circle cx="44" cy="30" r="3" fill="#243147"/>`;}
    else if(name.includes("troll")){shape=`<path d="M9 59q2-28 14-34L18 10l14 9 14-10 4 16q13 8 12 34z" fill="#53654b" stroke="#98aa84" stroke-width="2"/><circle cx="28" cy="34" r="3" fill="#efcd68"/><circle cx="45" cy="34" r="3" fill="#efcd68"/><path d="M23 49q13-8 27 0" stroke="#2d3729" stroke-width="5" fill="none"/>`;}
    else if(name.includes("demon")){shape=`<path d="M12 59q0-25 14-35L16 5l17 13L52 4l-6 20q14 10 10 35z" fill="#76273b" stroke="#c95a67" stroke-width="2"/><circle cx="29" cy="33" r="3" fill="#ffdb4c"/><circle cx="45" cy="33" r="3" fill="#ffdb4c"/><path d="M25 47q11-9 24 0" stroke="#3a1019" stroke-width="5"/>`;}
    else if(name.includes("lich")){shape=`<path d="M11 59q3-30 25-42 22 12 25 42z" fill="#2b2848" stroke="#716fa0" stroke-width="2"/><path d="M20 21l5-11 11 7 9-9 7 13-5 7H24z" fill="#7c6aac"/><circle cx="29" cy="33" r="3" fill="#8cf5ff"/><circle cx="44" cy="33" r="3" fill="#8cf5ff"/><path d="M53 14v39M48 18l5-8 5 8" stroke="#b8dfff" stroke-width="3"/>`;}
    else{shape=`<path d="M12 59q2-29 24-43 22 14 24 43z" fill="${bg2}" stroke="${accent}" stroke-width="2"/><circle cx="29" cy="33" r="3" fill="${eye}"/><circle cx="44" cy="33" r="3" fill="${eye}"/>`;}
    if(boss)frame=`<circle cx="36" cy="34" r="31" fill="none" stroke="${accent}" stroke-width="2" opacity=".35"/><path d="M17 8l6 5 5-8 7 7 8-8 6 9 7-5 2 12H14z" fill="${accent}" opacity=".65"/>`;
    const gid=`e13_${h}`;
    return `<svg class="enemy-art-frame" viewBox="0 0 72 72" role="img" aria-label="${enemy?.name||"Enemy"}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect x="2" y="2" width="68" height="68" rx="17" fill="#060a10"/><rect x="4" y="4" width="64" height="64" rx="15" fill="url(#${gid})"/>${frame}<g transform="translate(0 2)">${shape}</g></svg>`;
  }

  renderEnemyParty=function(){
    const strip=$("enemyParty"),stage=$("enemyIcon");if(!strip||!stage)return;strip.innerHTML="";stage.className="fighter-icon enemy-stage-icons";
    stage.innerHTML=currentEnemies.map((e,i)=>`<span class="stage-enemy${i===currentEnemyIndex&&e.hp>0?" selected":""}${e.hp<=0?" defeated":""}${e.guardian?" guardian":""}${e.miniBoss?" miniboss":""}${e.finalBoss?" final-boss":""}" data-enemy-index="${i}" title="${e.name} · ${Math.max(0,e.hp)}/${e.maxHp} HP · ${e.defense||0} DEF${e.affinity?` · ${ELEMENTS[e.affinity].name} affinity`:""}"><span class="stage-sprite">${enemyPortraitSVG(e)}</span><span class="stage-affinity">${e.affinity?ELEMENTS[e.affinity].icon:""}</span>${e.rangerMarks?`<span class="stage-mark">🏹 ×${e.rangerMarks}</span>`:""}<span class="stage-mini-status">${statusDotsHTML(e.enemyBarrier||0,e.poisonStacks||0)}</span></span>`).join("");
    currentEnemies.forEach((e,i)=>{const b=document.createElement("button");b.className=`enemy-chip${i===currentEnemyIndex&&e.hp>0?" active":""}${e.hp<=0?" dead":""}`;b.disabled=e.hp<=0;b.title=`${e.name} · ${Math.max(0,e.hp)}/${e.maxHp} HP · ${e.defense||0} DEF`;b.innerHTML=`<strong class="target-number">${i+1}</strong>`;b.addEventListener("click",()=>setCurrentEnemy(i));strip.appendChild(b);});
  };

  // ---- identity resource UI --------------------------------------------------
  const ultimateWrap=document.querySelector("#combatOverlay .ultimate-wrap"),combatActions=document.querySelector("#combatOverlay .combat-actions");
  let classResourceWrap=$("classResourceWrap");
  if(!classResourceWrap&&ultimateWrap){classResourceWrap=document.createElement("div");classResourceWrap.id="classResourceWrap";classResourceWrap.className="class-resource-wrap hidden";classResourceWrap.innerHTML=`<div class="class-resource-label"><span id="classResourceName">Class resource</span><span id="classResourceText">0 / 100</span></div><div class="class-resource-bar"><i id="classResourceFill"></i></div><div class="class-resource-note" id="classResourceNote"></div>`;ultimateWrap.parentNode.insertBefore(classResourceWrap,ultimateWrap);}
  let specialAttackBtn=$("specialAttackBtn");
  if(!specialAttackBtn&&combatActions){specialAttackBtn=document.createElement("button");specialAttackBtn.id="specialAttackBtn";specialAttackBtn.className="combat-btn special action-tooltip";specialAttackBtn.hidden=true;combatActions.insertBefore(specialAttackBtn,$("guardBtn"));}

  function identityFlash(text){const head=document.querySelector("#combatOverlay .combat-head");if(!head)return;const el=document.createElement("div");el.className="identity-flash";el.textContent=text;head.appendChild(el);setTimeout(()=>el.remove(),1050);}
  function setResourceUI(type,name,value,max,note){if(!classResourceWrap)return;classResourceWrap.className=`class-resource-wrap ${type||""}`;$("classResourceName").textContent=name;$("classResourceText").textContent=`${Math.round(value)} / ${Math.round(max)}`;$("classResourceFill").style.width=`${clamp(max?value/max*100:0,0,100)}%`;$("classResourceNote").textContent=note||"";}
  function hideResourceUI(){if(classResourceWrap)classResourceWrap.className="class-resource-wrap hidden";}

  // ---- reset/setup for identity state ---------------------------------------
  const resetPlayerV13=resetPlayer;
  resetPlayer=function(classId=selectedClassId){
    resetPlayerV13(classId);
    Object.assign(player,{mana:0,maxMana:0,monkCombo:0,ninjaSmoke:0,fighterCounterReady:false,turtleCrushReady:false,rogueStealUsed:false,clericFaith:0,beastStance:"aggressive",clownGimmick:null,clownPieReady:false,_occultChanneling:false,_ninjaExecution:false});
    if(classHasMechanic("mana")){player.maxMana=100;player.mana=25;}
    if(classIdentityActive("slime")){player.maxHp=Math.max(CLASSES.slime.base.maxHp,player.maxHp-10);player.hp=Math.min(player.maxHp,Math.max(1,player.hp-10));}
  };

  // Slime can borrow broad class powers only when the power actually works with
  // mechanics Slime possesses. Pure stat/class-flavour powers remain eligible;
  // mechanic-dependent powers such as Benediction require their real mechanic.
  function db32PowerMechanicsCompatible(u,caps){
    const spec=window.DiceboundContent?.powerupMechanics?.[u.id]||{requires:[]};
    return (spec.requires||[]).every(req=>!req.startsWith("ultimate:")&&caps.has(req));
  }
  eligibleUpgrades=function(filter=()=>true){return upgrades.filter(u=>{let classOk=(!u.classId&&!u.classIds)||u.classId===player.classId||(u.classIds||[]).includes(player.classId);if(classIdentityActive("slime")&&!classOk){const unlocked=["slime",...Object.keys(CLASSES).filter(id=>id!=="slime"&&isClassUnlocked(id))],tags=inferUpgradeTags(u),caps=new Set(classMechanicsFor("slime"));if(window.DiceboundPowerupBorrowing.ownershipAllowed(u,"slime",unlocked)&&!tags.includes("ultimate")&&db32PowerMechanicsCompatible(u,caps))classOk=true;}return classOk&&achievementGateUnlocked(u.achievementGate)&&(!u.unique||!(player.upgradeCounts?.[u.id]))&&filter(u);});};

  // ---- core class identity hooks --------------------------------------------
  const effectiveDodgeChanceV13=effectiveDodgeChance;
  effectiveDodgeChance=function(){let base=effectiveDodgeChanceV13();if(classIdentityActive("monk"))base=clamp(base+(player.monkCombo||0)*.018,0,.92);if(classIdentityActive("clown")&&player.clownGimmick==="Big Shoes")base=clamp(base+.12,0,.92);return base;};

  const strikeBaseDamageV13=strikeBaseDamage;
  strikeBaseDamage=function(echo=false,chaos=null){let r=strikeBaseDamageV13(echo,chaos);if(player._occultChanneling)r.damage=Math.max(1,Math.round(r.damage*.82));if(classIdentityActive("clown")&&player.clownPieReady&&!echo){r.damage=Math.round(r.damage*1.55);player.clownPieReady=false;r.burst=`Exploding Pie! ${r.burst||""}`;}return r;};

  const damageEnemyV13=damageEnemy;
  damageEnemy=function(enemy,amount,ignoreDefense=false){if(player._ninjaExecution){amount*=1.65;ignoreDefense=true;}return damageEnemyV13(enemy,amount,ignoreDefense);};

  const performStrikeV13=performStrike;
  performStrike=async function(target,opts={}){
    const echo=!!opts.echo;let critBoost=0,damageBoost=0,consumeCounter="",execution=false;
    if(classIdentityActive("ranger")&&target?.hp>0){critBoost=(target.rangerMarks||0)*.06;player.crit+=critBoost;}
    if(!echo&&classIdentityActive("fighter")&&player.fighterCounterReady){damageBoost=.55;player.damageBonus+=damageBoost;consumeCounter="fighter";}
    if(!echo&&classIdentityActive("turtle")&&player.turtleCrushReady){damageBoost=.45+Math.min(.55,player.defense*.035);player.damageBonus+=damageBoost;consumeCounter="turtle";}
    if(!echo&&classIdentityActive("ninja")&&(player.ninjaSmoke||0)>=(player.ninjaSmokeNeed||3)){player._ninjaExecution=true;execution=true;}
    let result;
    try{result=await performStrikeV13(target,opts);}finally{if(critBoost)player.crit-=critBoost;if(damageBoost)player.damageBonus-=damageBoost;player._ninjaExecution=false;}
    if(!echo&&target){
      if(classIdentityActive("ranger")&&target.hp>0){target.rangerMarks=Math.min(3,(target.rangerMarks||0)+1);identityFlash(`🏹 Marked Quarry ×${target.rangerMarks}`);}
      if(consumeCounter==="fighter"){player.fighterCounterReady=false;identityFlash("🛡️ Counterblow!");}
      if(consumeCounter==="turtle"){player.turtleCrushReady=false;identityFlash("🐢 Shell Crush!");}
      if(classIdentityActive("ninja")){if(execution){player.ninjaSmoke=0;identityFlash("🌘 Smoke Execution!");}else if(result?.crit){player.ninjaSmoke=Math.min(player.ninjaSmokeNeed||3,(player.ninjaSmoke||0)+1);if(player.ninjaSmoke>=(player.ninjaSmokeNeed||3))identityFlash("🌫️ Smoke ready");}}
    }
    updateCombatUI();return result;
  };

  const playerAttackV13=playerAttack;
  playerAttack=async function(){
    if(classIdentityActive("monk")){
      const combo=player.monkCombo||0,echoBonus=combo*.035,damageBonus=combo*.045;player.doubleStrike+=echoBonus;player.damageBonus+=damageBonus;
      try{await playerAttackV13();}finally{player.doubleStrike-=echoBonus;player.damageBonus-=damageBonus;}
      if(player.hp>0&&currentEnemy)player.monkCombo=Math.min(5,combo+1);updateCombatUI();return;
    }
    if(classIdentityActive("frog")&&currentEnemy?.hp>0&&currentEnemy.hp/currentEnemy.maxHp<.5){player.doubleStrike+=1;try{return await playerAttackV13();}finally{player.doubleStrike-=1;}}
    return playerAttackV13();
  };

  const healPlayerV13=healPlayer;
  healPlayer=function(amount){const healed=healPlayerV13(amount);if(classIdentityActive("cleric")&&healed>0){player.clericFaith=clamp((player.clericFaith||0)+healed*2,0,100);}return healed;};

  const petDamageV13=petDamage;
  petDamage=function(){let d=petDamageV13();if(classIdentityActive("beastmaster")&&player.beastStance==="aggressive")d=Math.round(d*1.5);return d;};
  const petTurnV13=petTurn;
  petTurn=async function(){await petTurnV13();if(!classIdentityActive("beastmaster")||!currentEnemy)return;if(player.beastStance==="defensive"){player.combatShield++;addCombatHistory("🐾 Defensive pack order raises a Barrier.");}else if(player.beastStance==="support"){const h=healPlayer(2+Math.floor(boardLevel/2));if(h)addCombatHistory(`🐾 Support pack order restores ${h} HP.`);}updateCombatUI();};

  const startCombatV13=startCombat;
  startCombat=function(kind="normal"){
    startCombatV13(kind);player.rogueStealUsed=false;player.monkCombo=0;player.fighterCounterReady=false;player.turtleCrushReady=false;player.ninjaSmoke=0;
    if(classIdentityActive("clown")){
      player.clownGimmick=pick(["Big Shoes","Rubber Chicken","Exploding Pie","Safety Net","Standing Ovation"]);player.clownPieReady=player.clownGimmick==="Exploding Pie";
      if(player.clownGimmick==="Safety Net")player.combatShield++;
      if(player.clownGimmick==="Standing Ovation")player.ultimateCharge=clamp(player.ultimateCharge+25,0,100);
      identityFlash(`🤡 ${player.clownGimmick}`);addCombatHistory(`Opening Gag: ${player.clownGimmick}.`);
    }
    if(classIdentityActive("ceo")&&player.gold>=1000){player.combatShield++;addCombatHistory("📈 Platinum Executive tier begins the battle with a Barrier.");}
    updateCombatUI();
  };

  // ---- D20: make every combat roll readable and slightly more chaotic -------
  rollD20Chaos=async function(action){
    if(!classIdentityActive("d20"))return {roll:0,mult:1,extraEcho:0,bonusCrit:0,potionMult:1,guardBonus:0};
    const fx=$("attackFx");fx.className="attack-fx crit-attack";
    for(let i=0;i<4;i++){fx.textContent=`🎲 ${rand(1,20)}`;void fx.offsetWidth;await delay(105+i*18);}
    let roll=rand(1,20);if(player.d20HighRollChance&&random()<player.d20HighRollChance)roll=rand(17,20);fx.textContent=`🎲 ${roll}`;void fx.offsetWidth;await delay(430);
    const out={roll,mult:1,extraEcho:0,bonusCrit:0,potionMult:1,guardBonus:0,notes:""};
    if(roll===1){const hurt=Math.max(1,Math.ceil(player.maxHp*.12));player.hp=Math.max(1,player.hp-hurt);out.mult=.35;out.potionMult=.5;out.notes=`Natural 1: probability bites back for ${hurt} self-damage.`;}
    else if(roll<=3){const curse=pick(["ult","shield","wobble"]);if(curse==="ult"){player.ultimateCharge=Math.max(0,player.ultimateCharge-15);out.notes=`Roll ${roll}: fate steals 15 Ultimate charge.`;}else if(curse==="shield"){out.mult=.65;out.notes=`Roll ${roll}: reality becomes suspiciously soft. This action has reduced power.`;}else{out.mult=.8;out.guardBonus=-.08;out.notes=`Roll ${roll}: the action wobbles sideways through probability.`;}}
    else if(roll<=6){out.mult=.78;out.notes=`Roll ${roll}: a mediocre timeline wins the argument.`;}
    else if(roll<=9){const h=Math.min(player.maxHp-player.hp,Math.ceil(player.maxHp*.08));player.hp+=h;player.ultimateCharge=clamp(player.ultimateCharge+8,0,100);out.notes=`Roll ${roll}: fate restores ${h} HP and 8 Ultimate.`;}
    else if(roll<=12){out.mult=1.25;out.potionMult=1.3;out.guardBonus=.10;out.notes=`Roll ${roll}: the action is empowered.`;}
    else if(roll<=15){out.extraEcho=1;player.combatShield++;out.notes=`Roll ${roll}: gain an extra strike and a Barrier.`;}
    else if(roll<=17){out.mult=1.6;out.forceElement=pick(DIBO_ELEMENTS);out.notes=`Roll ${roll}: ${ELEMENTS[out.forceElement].icon} ${ELEMENTS[out.forceElement].name} chaos erupts.`;}
    else if(roll===18){out.mult=1.8;player.hasteTurns=(player.hasteTurns||0)+1;out.notes="Roll 18: double-ish power and the enemy pack may lose its response to Haste.";}
    else if(roll===19){out.mult=2;out.bonusCrit=1;out.extraEcho=1;out.notes="Roll 19: double power, a critical tier and an extra strike.";}
    else{out.mult=3;out.bonusCrit=2;out.extraEcho=2;out.allElements=true;player.hp=player.maxHp;player.ultimateCharge=100;player.combatShield+=2;out.notes="NATURAL 20: full heal, triple power, two extra strikes, two Barriers and all six core elements.";}
    if(player.d20BonusChance&&random()<player.d20BonusChance){const bonus=pick(["echo","barrier","heal","element","haste","gold"]);if(bonus==="echo"){out.extraEcho++;out.notes+=" Probability adds another Echo.";}if(bonus==="barrier"){player.combatShield++;out.notes+=" Probability raises a Barrier.";}if(bonus==="heal"){const h=Math.min(player.maxHp-player.hp,rand(4,12));player.hp+=h;out.notes+=` Probability heals ${h} HP.`;}if(bonus==="element"){out.forceElement=pick(DIBO_ELEMENTS);out.notes+=` Probability invokes ${ELEMENTS[out.forceElement].icon} ${ELEMENTS[out.forceElement].name}.`;}if(bonus==="haste"){player.hasteTurns=(player.hasteTurns||0)+1;out.notes+=" Probability grants Haste.";}if(bonus==="gold"){const g=rand(5,25);player.gold+=g;out.notes+=` Probability manifests ${g} gold for no defensible reason.`;}}
    setCombatText(`🎲 ${action} d20: ${out.notes}`);showToast(`D20 rolled ${roll}`);await delay(260);return out;
  };

  // ---- occult attacks --------------------------------------------------------
  function manaGain(amount){if(!player.maxMana)return 0;const before=player.mana;player.mana=clamp(player.mana+amount,0,player.maxMana);return player.mana-before;}
  async function occultChannelAttack(){if(combatBusy||!currentEnemy)return;const cfg=OCCULT_SPELLS[classIdentityId()];if(!cfg)return playerAttack();const gained=manaGain(cfg.gain);player._occultChanneling=true;identityFlash(`${cfg.builderIcon} +${gained} Mana`);try{await playerAttack();}finally{player._occultChanneling=false;}updateCombatUI();}
  async function occultSpellAttack(){
    if(combatBusy||!currentEnemy)return;const cfg=OCCULT_SPELLS[classIdentityId()];if(!cfg||player.mana<cfg.cost)return;combatBusy=true;player.guardCooldown=0;player.mana-=cfg.cost;player.combatActionCount++;
    const target=currentEnemy;await animateClassAttack("crit");let damage=0,extra="";
    if(classIdentityActive("sorcerer")){const echoScale=1+Math.max(0,Number(player.doubleStrike)||0)*.5;damage=Math.round((player.attack*2.15+rand(4,9))*echoScale);const key=pick(DIBO_ELEMENTS),er=triggerElementEffect(key,target,{forced:true,source:"Arcane Lance"});player._arcaneLanceElementDamage=Math.max(0,Number(er?.totalDamage)||0);if(er)extra=` ${er.message}`;}
    else if(classIdentityActive("vampire")){damage=Math.round(player.attack*1.95+rand(3,7));}
    else if(classIdentityActive("rouge")){const tiers=rollTieredProc(player.crit+.35);damage=Math.round((player.attack*1.85+rand(3,8))*(1+tiers));if(livingEnemies().length>1){const splash=Math.max(1,Math.round(damage*.28));livingEnemies().filter(e=>e!==target).forEach(e=>damageEnemy(e,splash));extra=` Scarlet paint splashes the rest of the pack for ${splash} each.`;}}
    else if(classIdentityActive("merchant")){damage=Math.round(player.attack*1.55+Math.min(220,player.gold*.12)+rand(4,10));extra=` The ledger converts ${Math.min(220,Math.round(player.gold*.12))} notional gold-value into violence without spending it.`;}
    damage=Math.round(damage*(1+player.damageBonus+v19SetDamageBonus()));if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));const dealt=damageEnemy(target,damage);
    if(classIdentityActive("sorcerer")){const drainDamage=dealt+Math.max(0,Number(player._arcaneLanceElementDamage)||0),heal=player.lifeSteal>0&&drainDamage>0?healPlayer(Math.max(1,Math.floor(drainDamage*player.lifeSteal))):0;player._arcaneLanceElementDamage=0;if(heal)extra+=` Arcane Lance lifesteal restores ${heal} HP.`;}
    if(classIdentityActive("vampire")){const h=healPlayer(Math.max(1,Math.floor(dealt*.30)));extra+=` Grave Lance drains ${h} HP.`;}
    chargeUltimate(Math.max(8,Math.round(player.ultimateAttackGain*.65)));setCombatText(`${cfg.spellIcon} ${cfg.spell} spends ${cfg.cost} Mana and deals ${dealt} damage.${extra}`);sfx.crit();updateCombatUI();await delay(720);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);
  }

  async function bloodmageBloodletting(){if(combatBusy||!currentEnemy)return;const oldLS=player.lifeSteal;player.lifeSteal+=.12;identityFlash("🩸 Bloodletting restores fuel");try{await playerAttack();}finally{player.lifeSteal=oldLS;}updateCombatUI();}

  function beta021RoguePowerStealChance(luck=player.luck){return clamp((Number(luck)||0)-.50,0,.50)*.70;}
  async function rogueSteal(){
    if(combatBusy||!currentEnemy||player.rogueStealUsed)return;combatBusy=true;player.rogueStealUsed=true;player.combatActionCount++;const chance=clamp(.48+player.luck*.22,.48,.78),success=random()<chance;let text="";
    if(success){
      const gold=modifiedGold(rand(10+boardLevel*4,22+boardLevel*8));player.gold+=gold;text=`🗡️ You steal ${gold} gold from ${currentEnemy.name}.`;
      const powerChance=beta021RoguePowerStealChance(player.luck),powerRoll=powerChance>0?random():1;player._beta021LastStealPower={chance:powerChance,roll:powerRoll};
      if(powerChance>0&&powerRoll<powerChance){
        const choices=getUpgradeChoices();const stolen=choices.length?pick(choices):null;
        if(stolen){applyUpgrade(stolen,"Rogue Steal");text+=` <b>Jackpot:</b> you also steal the powerup ${stolen.name}!`;showToast(`🗡️ Stolen powerup: ${stolen.name}`);}
      }
      if(random()<.18){player.potions++;text+=" You also somehow steal a potion.";}
      identityFlash("🪙 Steal succeeded");sfx.coin();
    }else{text=`🗡️ ${currentEnemy.name} catches your hand. You steal absolutely nothing.`;identityFlash("🚫 Caught!");}
    setCombatText(text);updateHUD();updateCombatUI();await delay(620);await resolveEnemyResponse(false);
  }

  async function clericConsecration(){if(combatBusy||!currentEnemy||(player.clericFaith||0)<100)return;combatBusy=true;player.clericFaith=0;player.combatActionCount++;const heal=healPlayer(Math.ceil(player.maxHp*.22));player.combatShield+=1;const dmg=Math.round(player.attack*1.15+player.maxHp*.08),dealt=damageAll(dmg,.75);setCombatText(`☀️ Consecration spends 100 Faith, heals ${heal} HP, raises a Barrier and deals ${dealt} Light-touched damage across the pack.`);identityFlash("☀️ CONSECRATION");sfx.holy();updateCombatUI();await delay(760);if(!livingEnemies().length)return winCombat();await resolveEnemyResponse(false);}

  function cycleBeastStance(){if(!classIdentityActive("beastmaster")||combatBusy)return;const order=["aggressive","defensive","support"],i=order.indexOf(player.beastStance);player.beastStance=order[(i+1)%order.length];identityFlash(`🐾 ${player.beastStance[0].toUpperCase()+player.beastStance.slice(1)} stance`);updateCombatUI();}

  // Guard/potion identity wrappers.
  async function identityGuardAction(){if(classIdentityActive("monk"))player.monkCombo=0;if(classIdentityActive("fighter"))player.fighterCounterReady=true;if(classIdentityActive("turtle"))player.turtleCrushReady=true;return guardAction();}
  async function identityPotionAction(){if(classIdentityActive("monk"))player.monkCombo=0;return usePotion();}

  const useUltimateV13=useUltimate;
  useUltimate=async function(){
    if(!classIdentityActive("ranger"))return useUltimateV13();
    const marks=currentEnemies.reduce((n,e)=>n+(e.rangerMarks||0),0),bonus=Math.min(.75,marks*.12);if(bonus)player.classUltimateBonus+=bonus;
    try{return await useUltimateV13();}finally{if(bonus)player.classUltimateBonus-=bonus;currentEnemies.forEach(e=>e.rangerMarks=0);updateCombatUI();}
  };

  // Replace the four original action buttons once, removing old stacked listeners and giving class identity one clean dispatch path.
  function replaceCombatButton(id,handler){const old=$(id);if(!old)return null;const neo=old.cloneNode(true);old.replaceWith(neo);neo.addEventListener("click",handler);return neo;}
  replaceCombatButton("attackBtn",()=>{if(classIdentityActive("bloodmage"))bloodmageBloodletting();else if(classHasMechanic("mana"))occultChannelAttack();else playerAttack();});
  replaceCombatButton("guardBtn",()=>{if(classIdentityActive("bloodmage"))bloodmageReplenish();else identityGuardAction();});
  replaceCombatButton("potionBtn",()=>identityPotionAction());
  replaceCombatButton("ultimateBtn",()=>useUltimate());
  specialAttackBtn.addEventListener("click",()=>{if(classHasMechanic("mana"))occultSpellAttack();else if(classIdentityActive("bloodmage"))bloodmageExsanguinate();else if(classIdentityActive("rogue"))rogueSteal();else if(classIdentityActive("cleric"))clericConsecration();else if(classIdentityActive("beastmaster"))cycleBeastStance();});

  // ---- combat UI labels/resources -------------------------------------------
  const updateCombatUIV13=updateCombatUI;
  updateCombatUI=function(){
    updateCombatUIV13();const cls=CLASSES[player.classId]||CLASSES.ranger,atk=$("attackBtn"),guard=$("guardBtn"),special=$("specialAttackBtn");if(!atk||!guard||!special)return;
    special.hidden=true;special.className="combat-btn special action-tooltip";combatActions?.classList.remove("has-special");
    if(classHasMechanic("mana")){
      const cfg=OCCULT_SPELLS[classIdentityId()];atk.textContent=`${cfg.builderIcon} ${cfg.builder}`;atk.dataset.tip=`${cfg.builder} is your Mana-building attack. It deals about 82% normal basic damage, still rolls Crit/Echo/elements, and grants up to ${cfg.gain} Mana.`;
      special.hidden=false;combatActions?.classList.add("has-special");special.textContent=`${cfg.spellIcon} ${cfg.spell} (${cfg.cost})`;special.dataset.tip=classIdentityActive("sorcerer")?`${cfg.desc} Current Echo conversion: +${Math.round(Math.max(0,player.doubleStrike||0)*50)}% Arcane Lance damage. Current Lifesteal: ${Math.round(Math.max(0,player.lifeSteal||0)*100)}%.`:cfg.desc;special.disabled=combatBusy||player.mana<cfg.cost;
      setResourceUI("mana","Mana",player.mana,player.maxMana,cfg.desc);
    }else if(classIdentityActive("bloodmage")){
      atk.textContent="🩸 Bloodletting";atk.dataset.tip="A normal basic attack with extra Lifesteal. Bloodletting restores HP so you can spend that HP as fuel on Exsanguinate.";
      guard.textContent="💉 Replenish";guard.dataset.tip="Restore 16% max HP to yourself and 14% max HP to the selected enemy, then gain 20 Ultimate. This does not reduce the next enemy attack.";
      special.hidden=false;combatActions?.classList.add("has-special");special.textContent="🩸 Exsanguinate";special.dataset.tip="Spend 12% max HP without killing yourself to deal a brutal blood-fuelled attack.";special.disabled=combatBusy||player.hp<=1;
      setResourceUI("blood","Blood fuel (HP)",player.hp,player.maxHp,"Bloodmage has no Mana. Your HP bar is your spell resource; Bloodletting restores fuel and Exsanguinate spends it.");
    }else if(classIdentityActive("rogue")){
      special.hidden=false;special.classList.add("steal");combatActions?.classList.add("has-special");special.textContent=player.rogueStealUsed?"🗡️ Steal (used)":"🗡️ Steal";special.dataset.tip="Attempt once per battle. Success scales with Luck and steals gold, can steal a potion, and at high Luck can even steal a random powerup (chance starts above 50 Luck and caps at 35%).";special.disabled=combatBusy||player.rogueStealUsed;
      hideResourceUI();
    }else if(classIdentityActive("cleric")){
      special.hidden=false;special.classList.add("faith");combatActions?.classList.add("has-special");special.textContent="☀️ Consecration";special.dataset.tip="At 100 Faith: heal, raise a Barrier and damage the enemy pack. Healing builds Faith.";special.disabled=combatBusy||(player.clericFaith||0)<100;setResourceUI("mana","Faith",player.clericFaith||0,100,"Healing builds Faith. Consecration becomes available at 100.");
    }else if(classIdentityActive("beastmaster")){
      special.hidden=false;combatActions?.classList.add("has-special");special.textContent=`🐾 ${player.beastStance||"aggressive"}`;special.dataset.tip="Cycle pet orders without spending a combat turn: Aggressive = +50% pet damage, Defensive = Barrier after pet attack, Support = small heal after pet attack.";special.disabled=combatBusy;setResourceUI("mana","Pack order",["aggressive","defensive","support"].indexOf(player.beastStance)+1,3,"Aggressive → Defensive → Support. The button cycles the active companion order.");
    }else if(classIdentityActive("monk"))setResourceUI("combo","Flowing Combo",player.monkCombo||0,5,"Basic attacks build Combo. Each stack increases damage, Echo and Dodge. Guard or Potion resets it.");
    else if(classIdentityActive("ninja"))setResourceUI("smoke","Smoke",player.ninjaSmoke||0,3,"Critical hits build Smoke. At 3, the next basic strike ignores Defense and deals greatly increased damage.");
    else if(classIdentityActive("ranger")){const marks=currentEnemy?.rangerMarks||0;setResourceUI("mark","Marks on target",marks,3,"Basic attacks mark the selected enemy. Marks add Crit against that target; Arrow Storm consumes every mark in the pack for bonus damage.");}
    else if(classIdentityActive("fighter"))setResourceUI("combo","Counterstance",player.fighterCounterReady?1:0,1,"Guard primes the next basic attack for +55% damage.");
    else if(classIdentityActive("turtle"))setResourceUI("combo","Shell Crush",player.turtleCrushReady?1:0,1,"Guard primes the next basic attack for a Defense-scaled crushing counter.");
    else if(classIdentityActive("clown"))setResourceUI("mana","Opening Gag",player.clownGimmick?1:0,1,player.clownGimmick?`This battle's gimmick: ${player.clownGimmick}.`:"A random gimmick appears when combat begins.");
    else if(classIdentityActive("ceo")){const tier=player.gold>=1000?3:player.gold>=500?2:player.gold>=250?1:0;setResourceUI("mana","Executive tier",tier,3,`${player.gold} gold. The class's main identity is an absurd +200% gold engine; 1000+ gold also starts battles with a Barrier.`);}
    else hideResourceUI();
    renderEnemyParty();
  };

  // ---- Info and class cards --------------------------------------------------


  // ---- Hidden AI simulation harness -----------------------------------------
  // This never touches the live player/meta objects. It is deliberately non-enumerable and has no menu button.


  /* SEMANTIC OWNER — Equipment economy, defense, companions, alchemy and fifth-road systems. Migrated from the retired Alpha legacy stack in 3.1.6. */
  /* ---------- Alpha v1.4: affix gear, economy curve & career simulation ---------- */
  document.title=`Dicebound: Alpha v1.4 — ${pick([
    "the loot has developed adjectives",
    "legendary trousers now have a pension plan",
    "the economy has been asked to calm down",
    "tiny imaginary adventurers formed a testing department",
    "prefixes, suffixes and suspicious accounting"
  ])}`;

  const v14Style=document.createElement("style");
  v14Style.textContent=`
    .affix-line{margin-top:7px;font-size:10px;color:#d6c7ff;font-weight:800}
    .affix-line .prefix{color:#ffd881}.affix-line .suffix{color:#9de9ff}
    .item-quality-note{margin-top:6px;font-size:9px;color:var(--muted);line-height:1.4}
  `;
  document.head.appendChild(v14Style);

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
  function v14ClassTags(){return new Set(CLASSES[classIdentityId()]?.tags||[]);}
  function v14WeightedAffix(R,pool,slot){const tags=v14ClassTags(),eligible=pool.filter(a=>a.slots.includes(slot));const weighted=[];eligible.forEach(a=>{let n=3;if((a.tags||[]).some(t=>tags.has(t)))n+=3;for(let i=0;i<n;i++)weighted.push(a);});return v14SPick(R,weighted.length?weighted:eligible);}
  function v14BaseName(slot,R){const names=(gearNames[slot]&&gearNames[slot][player.classId])||gearNames[slot];return Array.isArray(names)&&names.length?v14SPick(R,names):SLOT_LABELS[slot];}
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

  const generateEquipmentV13=generateEquipment;
  generateEquipment=function(forceRarity=null,forcedSlot=null){
    const rarity=forceRarity||rollGearRarity(0);
    if(!V14_RARITY_BUDGETS[rarity])return generateEquipmentV13(forceRarity,forcedSlot);
    const slot=forcedSlot||pick(EQUIPMENT_SLOTS),seed=`${Date.now()}_${random().toString(36).slice(2,10)}_${player.classId}_${boardLevel}_${player.position}`,R=v14SeedRng(seed),range=V14_RARITY_BUDGETS[rarity];
    const depthBonus=Math.min(8,Math.floor((boardLevel-1)*1.5+player.position/32)),budget=v14SInt(R,range[0],range[1])+depthBonus,maxTier=V14_RARITY_AFFIX_TIER[rarity],bonuses={};
    const prefix=v14WeightedAffix(R,V14_PREFIXES,slot),prefixTier=Math.max(1,Math.min(maxTier,v14SInt(R,Math.max(1,maxTier-1),maxTier)));let spent=0;
    if(prefix&&prefix.cost(prefixTier)<=budget){prefix.apply(bonuses,prefixTier);spent+=prefix.cost(prefixTier);}
    let suffix=null,suffixTier=0;const suffixChance={common:.45,uncommon:.72,rare:1,epic:1,legendary:1}[rarity];
    if(R()<suffixChance){suffix=v14WeightedAffix(R,V14_SUFFIXES,slot);suffixTier=Math.max(1,Math.min(maxTier,v14SInt(R,Math.max(1,maxTier-1),maxTier)));while(suffixTier>1&&suffix&&spent+suffix.cost(suffixTier)>budget-4)suffixTier--;if(suffix&&spent+suffix.cost(suffixTier)<=budget){suffix.apply(bonuses,suffixTier);spent+=suffix.cost(suffixTier);}else suffix=null;}
    const item={id:`gear_${v14HashSeed(seed).toString(36)}_${Date.now()}`,seed,itemPower:budget,slot,rarity,icon:gearIcon(slot),name:"",bonuses,prefix:prefix?prefix.names[prefixTier-1]:null,suffix:suffix?suffix.names[suffixTier-1]:null,affixTier:prefixTier,suffixTier};
    spent+=v14SpendBase(item,R,budget-spent);item.spentPower=spent;const base=v14BaseName(slot,R);item.name=`${item.prefix?item.prefix+" ":""}${base}${item.suffix?" "+item.suffix:""}`;
    if(item.slot==="weapon"&&R()<elementChanceForRarity(rarity))item.element=v14SPick(R,ELEMENT_KEYS);
    return item;
  };

  const gearPowerScorePreV14=gearPowerScore;
  function v14FallbackPower(item){if(!item)return 0;if(Number(item.spentPower)>0)return Number(item.spentPower);if(Number(item.itemPower)>0)return Number(item.itemPower);const floor={common:13,uncommon:23,rare:37,epic:58,legendary:90,mythical:135,omega:175}[item.rarity]||25;return Math.max(floor,Math.round(gearPowerScorePreV14(item)*.72));}
  function v14RawSellValue(item){const p=v14FallbackPower(item),mult={common:.80,uncommon:.90,rare:1,epic:1.10,legendary:1.25,mythical:1.45,omega:1.70}[item.rarity]||1;return Math.max(8,Math.round((12+p*1.45+p*p*.042)*mult));}
  itemSellValue=function(item){const base=v14RawSellValue(item);return classIdentityActive("merchant")?Math.round(base*2):base;};

  makeMerchantGear=function(){
    let bonus=boardLevel>=5?1.05:boardLevel===4?.82:boardLevel===3?.52:boardLevel===2?.30:.08,rarity=rollGearRarity(bonus);
    if(boardLevel>=2&&rarity==="common")rarity="uncommon";if(boardLevel>=3&&rarity==="uncommon")rarity="rare";if(boardLevel>=4&&rarity==="rare"&&random()<(boardLevel===5?.82:.65))rarity="epic";
    const gear=generateEquipment(rarity),markup=[0,1.75,1.95,2.20,2.45,2.75][boardLevel]||2.75,base=Math.round(v14RawSellValue(gear)*markup);
    return {id:gear.id,icon:gear.icon,name:gear.name,desc:`${SLOT_LABELS[gear.slot]} · ${formatBonuses(gear)}`,gear,base,buy(){equipItem(gear);return gear;}};
  };

  const merchantCatalogV13=merchantCatalog;
  merchantCatalog=function(){if(boardLevel!==5)return merchantCatalogV13();return [
    {id:"potion",icon:"🧪",name:"Ouroboros Apothecary",desc:"Gain 12 potions and +100% potion healing.",base:520+player.position*4,buy(){player.potions+=12;player.potionPower+=1;}},
    {id:"heal",icon:"💖",name:"Fifth-Road Reconstruction",desc:"Restore all HP and gain +40 max HP.",base:680+player.position*4,buy(){player.maxHp+=40;player.hp=player.maxHp;}},
    {id:"attack",icon:"⚔️",name:"Tyrant Edge Charter",desc:"Gain +10 attack and +25% Boss Damage.",base:890+player.position*5,buy(){player.attack+=10;player.bossDamage+=.25;}},
    {id:"armor",icon:"🏰",name:"Ringbound Sovereign Plating",desc:"Gain +10 defense and 3 flat damage reduction.",base:930+player.position*5,buy(){player.defense+=10;player.flatReduction+=3;}},
    {id:"charm",icon:"🌈",name:"Ouroboros Fate Engine",desc:"Gain +40 Luck, +20% Crit, +20% Echo and +20% element power.",base:940+player.position*5,buy(){player.luck+=.40;player.crit+=.20;player.doubleStrike+=.20;player.elementDamageBonus+=.20;}},
    {id:"relic",icon:"💍",name:"Tyrant's Legendary Contract",desc:"Choose from three random Legendary powerups.",base:1320+player.position*6,alphaChooseLegendary:true,buy(){return null;}}
  ];};

  merchantPrice=function(base){const scale=boardLevel===1?.90:boardLevel===2?1.08:boardLevel===3?1.20:boardLevel===4?1.34:1.48;return player.freeMerchantRun?0:Math.max(1,Math.round(base*scale*(1-clamp(player.shopDiscount,0,.55))));};

  openMerchant=function(){
    const catalog=merchantCatalog(),stock=[],catalogCount=boardLevel>=5?6:boardLevel===4?6:boardLevel===3?5:boardLevel===2?4:3;while(stock.length<Math.min(catalogCount,catalog.length)){const item=pick(catalog);if(!stock.some(s=>s.id===item.id))stock.push({...item,sold:false});}
    const gearCount=boardLevel>=5?5:boardLevel===4?4:boardLevel===3?3:boardLevel===2?2:1;for(let i=0;i<gearCount;i++)stock.push({...makeMerchantGear(),sold:false});currentMerchantItems=stock;currentMerchantNotice="";
    $("merchantTitle").textContent=player.freeMerchantRun?"The Merchant Owes You Everything":boardLevel===5?"Ouroboros Exchange":boardLevel===4?"Crownroad Merchant":boardLevel===3?"Impossible Merchant":boardLevel===2?"Astral Merchant":"Roadside Merchant";
    $("merchantSubtitle").textContent=player.freeMerchantRun?"After defeating the merchant, every shop item is free for the rest of this run.":boardLevel===5?"The final road sells final-road gear at final-road prices.":boardLevel>=4?"Late-road merchants carry exceptional gear, but no longer pretend endgame money is pocket change.":"Compare equipment before buying.";
    $("merchantOverlay").classList.remove("hidden");renderMerchant();
  };

  // Later boards become meaningful progression walls instead of a Board-1 check followed by a snowball.
  const scaleEnemyV14Base=scaleEnemy;
  scaleEnemy=function(base,kind="normal",packSize=1){const e=scaleEnemyV14Base(base,kind,packSize),b=boardLevel,mods={2:[1.12,1.08,1],3:[1.18,1.12,2],4:[1.12,1.08,2],5:[1.16,1.10,3]}[b];if(mods){e.hp=Math.round(e.hp*mods[0]);e.maxHp=e.hp;e.attack=Math.round(e.attack*mods[1]);e.defense+=mods[2];}
    // Replace the runaway reward multiplier with a gentler board curve. Board 1 normals are slightly richer; late bosses stop printing a country's GDP.
    const progress=player.position/Math.max(1,currentTileCount()-1),normalMult=[0,1.40,1.55,1.75,2.00,2.25][b]||2.25;let rewardMult=normalMult*(1+progress*.25);
    if(kind==="miniboss")rewardMult*=2.4;else if(kind==="final")rewardMult=[0,4.4,5.0,5.5,6.0,6.0][b]||6;else if(kind==="merchant"||kind==="bloodmage")rewardMult*=3.5;
    e.gold=Math.max(1,Math.round((base.gold||e.gold||1)*rewardMult));return e;};

  // Better item comparison: actual hidden point budget is useful internally, while players still judge the visible rolls.
  const gearPowerScoreV14Base=gearPowerScorePreV14;
  gearPowerScore=function(item){if(!item)return 0;const visible=gearPowerScoreV14Base(item),budget=v14FallbackPower(item);return visible+budget*.9;};

  // Update rarity/explanation text without exposing the hidden number itself.


  /* ---------- Alpha v1.5: defense, treasure scaling, summon classes & completion hardening ---------- */
  document.title=`Dicebound: Alpha v1.9 — ${pick([
    "treasure learned about inflation",
    "six definitely-not-pocket-monsters entered the road",
    "defense discovered percentages",
    "the fifth road now actually ends",
    "elemental swords are back on the menu"
  ])}`;

  const v15Style=document.createElement("style");
  v15Style.textContent=`
    .seed-code{margin-top:8px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.035);font-size:8px;color:var(--muted);word-break:break-all;line-height:1.35}
  `;
  document.head.appendChild(v15Style);

  meta.beastmasterNightmareBoard5=!!meta.beastmasterNightmareBoard5;
  meta.unlocks=meta.unlocks||{};

  Object.assign(CLASSES,{
    summoner:{id:"summoner",name:"Summoner",icon:"📖",attackIcon:"✨",fxIcon:"🔹🐾",unlock:"Raise any 3 companions to level 10",desc:"A Mana-based pet caster. Spirit Bolt builds Mana; Conjure Familiar spends it to call temporary elemental spirits that join companion attacks for the rest of the battle.",stats:"31 HP · 6 ATK · 35/120 MANA · SUMMONS",ultimate:{name:"Grand Convergence",icon:"🌌",desc:"Calls a temporary full spirit circle and sends every summoned familiar crashing through the enemy pack."},base:{maxHp:31,attack:6,defense:1,crit:.08,dodge:.05,luck:.08,doubleStrike:.05,guardPower:.54,classBurst:.18,lifeSteal:0},tags:["occult","mana","pet","pack","ranged"]},
    pokemontrainer:{id:"pokemontrainer",secret:true,name:"Pokémon Trainer",icon:"🧢",attackIcon:"🔴",fxIcon:"🐾✨",unlock:"Secret: master every companion and prove the Beastmaster on the fifth Nightmare road",desc:"A secret late-game companion master. Six Dicebound creatures are randomly drafted at the start of every run; switch between them freely and unleash the entire roster together.",stats:"40 HP · 8 ATK · 2 DEF · SIX-CREATURE ROSTER",ultimate:{name:"Six-Pack Stampede",icon:"🌈🐾",desc:"Every creature in the six-member roster attacks the entire pack in rapid succession."},base:{maxHp:40,attack:8,defense:2,crit:.12,dodge:.08,luck:.10,doubleStrike:.08,guardPower:.60,classBurst:.26,lifeSteal:.04},tags:["pet","pack","weird","strong","lucky"]}
  });
  CLASS_TAGS.summoner=["occult","mana","pet","pack","ranged"];
  CLASS_TAGS.pokemontrainer=["pet","pack","weird","strong","lucky"];
  CLASS_PASSIVES.summoner={name:"Spirit Circle",desc:"Uses Mana to conjure up to three temporary companion spirits each battle. Summoned spirits attack after your normal companion."};
  CLASS_PASSIVES.pokemontrainer={name:"Six-Creature Draft",desc:"At run start, six companions are randomly drafted into a roster. The active roster creature attacks much harder and may call an assist."};
  CLASSES.summoner.passive=CLASS_PASSIVES.summoner;CLASSES.pokemontrainer.passive=CLASS_PASSIVES.pokemontrainer;
  MANA_OCCULT_CLASSES.add("summoner");
  OCCULT_SPELLS.summoner={builder:"Spirit Bolt",builderIcon:"📖",spell:"Conjure Familiar",spellIcon:"🐾",cost:40,gain:26,desc:"Spirit Bolt builds Mana. Spend 40 Mana to conjure a random unlocked companion spirit for this battle, up to three active spirits. Summoned spirits join pet attacks."};
  Object.assign(gearNames.weapon,{summoner:["Conjurer's Crook","Pact Tome","Astral Bell"],pokemontrainer:["Trainer Baton","Red Capture Orb","Champion Whistle"]});
  Object.assign(gearNames.offhand,{summoner:["Spirit Ledger","Familiar Seal","Summoning Grimoire"],pokemontrainer:["Creature Index","Treat Belt","Six-Slot Harness"]});
  for(const slot of ["boots","legs","chest","hat","ring","amulet"]){gearNames[slot]=gearNames[slot]||{};gearNames[slot].summoner=[`Pactbound ${SLOT_LABELS[slot]}`];gearNames[slot].pokemontrainer=[`Champion ${SLOT_LABELS[slot]}`];}

  upgrades.push(
    {id:"summoner_deeper_circle",classId:"summoner",rarity:"uncommon",icon:"🔷",name:"Deeper Circle",desc:"Conjured spirits deal +3 damage and Spirit Bolt generates +6 Mana.",tags:["pet","mana"],apply(){player.petDamageBonus+=3;player.summonerManaBonus=(player.summonerManaBonus||0)+6;}},
    {id:"summoner_twin_pact",classId:"summoner",rarity:"rare",icon:"🐾🐾",name:"Twin Pact",desc:"Summoned spirits gain +25% damage and a 15% chance to attack twice.",tags:["pet","pack"],apply(){player.summonerSpiritScale=(player.summonerSpiritScale||1)+.25;player.summonerSpiritDouble=(player.summonerSpiritDouble||0)+.15;}},
    {id:"summoner_archpact",classId:"summoner",rarity:"legendary",icon:"🌌📖",name:"Archpact",desc:"Begin every battle with one random spirit already conjured, +20 max Mana and +5 pet damage.",tags:["pet","mana","legendary"],apply(){player.summonerAutoSpirit=true;player.maxMana+=20;player.mana=Math.min(player.maxMana,player.mana+20);player.petDamageBonus+=5;}},
    {id:"trainer_double_battle",classId:"pokemontrainer",rarity:"rare",icon:"🐾⚔️",name:"Double Battle",desc:"Roster assist chance rises by 20% and assists deal more damage.",tags:["pet","pack"],apply(){player.trainerAssistBonus=(player.trainerAssistBonus||0)+.20;player.trainerAssistScale=(player.trainerAssistScale||.65)+.20;}},
    {id:"trainer_champion",classId:"pokemontrainer",rarity:"legendary",icon:"🏆🐾",name:"Road Champion",desc:"Every roster creature gains +5 effective pet damage and the Six-Pack Stampede is 35% stronger.",tags:["pet","pack","legendary"],apply(){player.petDamageBonus+=5;player.trainerUltimateBonus=(player.trainerUltimateBonus||0)+.35;}}
  );

  function petLevel10Count(){return Object.values(meta.pets||{}).filter(p=>(p?.level||1)>=10).length;}
  function allPetsLevel10(){const ids=Object.keys(PETS);return ids.length>0&&ids.every(id=>(meta.pets?.[id]?.level||1)>=10);}
  const baseClassUnlockedV15Patch=baseClassUnlocked;
  baseClassUnlocked=function(id){if(id==="summoner")return !!meta.unlocks?.summoner||petLevel10Count()>=3;if(id==="pokemontrainer")return !!meta.unlocks?.pokemontrainer||(allPetsLevel10()&&!!meta.beastmasterNightmareBoard5);return baseClassUnlockedV15Patch(id);};
  const checkDynamicClassUnlocksV15Patch=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(){checkDynamicClassUnlocksV15Patch();if(petLevel10Count()>=3)unlockClass("summoner");if(allPetsLevel10()&&meta.beastmasterNightmareBoard5)unlockClass("pokemontrainer");};

  // ---- Defense becomes diminishing percentage reduction --------------------
  function defenseDamageReduction(defense=player.defense){const d=Math.max(0,Number(defense)||0);return clamp(d/(d+25),0,.82);}
  enemyTurn=async function(guarded,extraGuardPower=0){
    if(!currentEnemy)return;currentEncounterTurn++;let messages=[];const lead=currentEncounterLead,special=!!(lead?.guardian&&(lead.miniBoss||lead.finalBoss||lead.merchantBoss)&&lead.hp>0&&currentEncounterTurn%GUARDIAN_SPECIAL_INTERVAL===0);
    for(const enemy of livingEnemies()){
      if((enemy.skipTurns||0)>0&&!(special&&enemy===lead)){enemy.skipTurns--;messages.push(`${enemy.name} is frozen.`);continue;}
      let raw=0,landed=false;
      if(special&&enemy===lead){const partialDR=defenseDamageReduction()*.55,base=Math.max(1,enemy.attack*(enemy.merchantBoss?2.6:2.25));raw=Math.max(1,Math.round(base*(1-partialDR)-player.flatReduction*.5));if(guarded)raw=Math.max(0,Math.floor(raw*(1-clamp(player.guardPower+extraGuardPower,0,.9))));if(mythicalSetCount()>=4)raw=Math.floor(raw*v19SetGuardianSpecialMult());messages.push(`⚠️ ${enemy.specialName||"Guardian special"} partially pierces Defense (${Math.round(partialDR*100)}% reduction applies)${guarded?", but Guard reduces it further":""}, dealing ${raw}.`);if(enemy.merchantBoss){const stolen=Math.min(player.gold,Math.ceil(player.gold*.20));player.gold-=stolen;enemy.enemyBarrier=(enemy.enemyBarrier||0)+2;messages.push(`The Merchant steals ${stolen} gold and raises 2 barriers.`);}landed=raw>0;}
      else{if(random()<effectiveDodgeChance()){messages.push(`You dodge ${enemy.name}.`);continue;}if(player.combatShield>0){player.combatShield--;messages.push(`Barrier blocks ${enemy.name}.`);continue;}const base=Math.max(1,enemy.attack+rand(-1,1)),dr=defenseDamageReduction();raw=Math.max(1,Math.round(base*(1-dr)-player.flatReduction));if(guarded)raw=Math.max(0,Math.floor(raw*(1-clamp(player.guardPower+extraGuardPower,0,.9))));messages.push(guarded?`${enemy.name} hits your guard for ${raw} (${Math.round(dr*100)}% Defense DR).`:`${enemy.name} hits for ${raw} after ${Math.round(dr*100)}% Defense DR.`);if(enemy.merchantBoss){const stolen=Math.min(player.gold,Math.max(1,Math.round(enemy.attack*.6)));player.gold-=stolen;messages.push(`The Merchant steals ${stolen} gold.`);}landed=raw>0;}
      player.hp=Math.max(0,player.hp-raw);meta.damageTaken=(meta.damageTaken||0)+raw;if(player.thorns>0&&raw>0){const returned=damageEnemy(enemy,player.thorns,true);messages.push(`Spikes return ${returned}.`);}if(landed&&!special){const proc=enemyElementProc(enemy);if(proc)messages.push(proc);}if(player.hp<=0)break;
    }
    if(special&&hasMythicPiece("hat")&&player.hp>0){const h=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.10)));player.hp+=h;player.ultimateCharge=clamp(player.ultimateCharge+25,0,100);messages.push(`👑 Crown of the Fourth Road restores ${h} HP and grants 25 ultimate.`);}
    if(hasMythicPiece("amulet")&&!player.mythicAmuletUsed&&player.hp>0&&player.hp/player.maxHp<=.35){player.mythicAmuletUsed=true;let consumed=0;livingEnemies().forEach(e=>{const d=Math.max(1,Math.floor(e.maxHp*.12));consumed+=damageEnemy(e,d,true);});const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.floor(consumed*.5)));player.hp+=healed;messages.push(`👁️ Devourer's Gaze consumes ${consumed} enemy HP and restores ${healed} HP.`);}
    if(player.hp>0&&mythicalSetCount()>=7&&!player.omegaRingUsed&&player.hp/player.maxHp<=.25){player.omegaRingUsed=true;const heal=healPlayer(Math.ceil(player.maxHp*.25));player.combatShield=(player.combatShield||0)+1;messages.push(`💍 Impossible Road 7-piece restores ${heal} HP and grants 1 barrier.`);}
    checkDynamicClassUnlocks();saveMeta();sfx.hit();setCombatText(messages.join(" "));updateCombatUI();await delay(980);if(!livingEnemies().length)return winCombat();if(player.hp<=0)return handlePlayerDeath();combatBusy=false;updateCombatUI();setCombatText("Choose your next action.",false);
  };

  // ---- Rarity/Luck and deterministic v1.5 seed codes -----------------------
  elementChanceForRarity=function(rarity){return {common:.28,uncommon:.39,rare:.52,epic:.66,legendary:.80,mythical:1,omega:1}[rarity]||.25;};
  rollGearRarity=function(bonus=0){const progress=player.position/Math.max(1,currentTileCount()-1),luck=Math.max(0,player.luck||0),luckDiminishing=1-Math.exp(-luck*.80),q=clamp((boardLevel-1)*.026+progress*.016+Math.max(0,bonus)*.075+luckDiminishing*.035+(nightmareMode?.014:0),0,.34),legendary=.0025+q*.012,epic=.018+q*.055,rare=.085+q*.16,uncommon=.27+q*.18,p=random();if(p<legendary)return "legendary";if(p<legendary+epic)return "epic";if(p<legendary+epic+rare)return "rare";if(p<legendary+epic+rare+uncommon)return "uncommon";return "common";};
  weightedUpgrade=function(pool){const weighted=pool.map(up=>{let weight=rarityInfo[up.rarity].weight,rawLuck=Math.max(0,player.luck||0),luck=1-Math.exp(-rawLuck*.72),depth=(boardLevel-1)+player.position/Math.max(1,currentTileCount()-1);if(up.rarity==="common")weight*=Math.max(.38,1-luck*.22-depth*.025);if(up.rarity==="uncommon")weight*=1+luck*.18+depth*.035;if(up.rarity==="rare")weight=(weight+Math.min(1.4,player.level*.045)+depth*.20)*(1+luck*.72);if(up.rarity==="epic")weight=(weight+Math.min(.35,player.level*.010)+depth*.055)*(1+luck*1.05);if(up.rarity==="legendary")weight=(weight+Math.min(.035,player.level*.0008)+depth*.006)*(1+luck*1.40);return {up,weight};});const total=weighted.reduce((a,b)=>a+b.weight,0);let roll=random()*total;for(const entry of weighted){roll-=entry.weight;if(roll<=0)return entry.up;}return weighted[weighted.length-1].up;};

  function v15SafeClassId(id){return CLASSES[id]?id:"ranger";}
  function v15SeedCode(rarity,slot,classId,qualityBoost,core){return `D15|${rarity}|${slot}|${classId}|q${qualityBoost}|${core}`;}
  function v15ParseSeedCode(code){const m=String(code||"").trim().match(/^D15\|(poor|common|uncommon|rare|epic|legendary)\|(weapon|offhand|boots|legs|chest|hat|ring|amulet)\|([a-z0-9_]+)\|q(\d+)\|([a-z0-9_-]+)$/i);if(!m)return null;return {rarity:m[1].toLowerCase(),slot:m[2].toLowerCase(),classId:v15SafeClassId(m[3].toLowerCase()),qualityBoost:clamp(Number(m[4])||0,0,8),core:m[5]};}
  function v15GenerateEquipmentFromSeedCode(code){return window.DiceboundEquipment.generateOrdinaryFromSeedCode(code,{parseSeedCode:v15ParseSeedCode,seedRng:v14SeedRng,seedInt:v14SInt,seedPick:v14SPick,hashSeed:v14HashSeed,rarityBudgets:V14_RARITY_BUDGETS,affixTiers:V14_RARITY_AFFIX_TIER,prefixes:V14_PREFIXES,suffixes:V14_SUFFIXES,elementKeys:ELEMENT_KEYS,elementChanceForRarity,pickAffix:window.DiceboundEquipment.pickOrdinaryAffix,spendBase:v14SpendBase,gearIcon,baseName:window.DiceboundEquipment.ordinaryBaseName});}
  generateEquipment=function(forceRarity=null,forcedSlot=null){const rarity=forceRarity||rollGearRarity(0);if(!V14_RARITY_BUDGETS[rarity])return generateEquipmentV13(forceRarity,forcedSlot);const slot=forcedSlot||pick(EQUIPMENT_SLOTS),classId=player.classId,qualityBoost=Math.min(8,Math.floor((boardLevel-1)*1.5+player.position/32)),core=`${Math.floor(random()*0xffffffff).toString(36)}${Math.floor(random()*0xffffffff).toString(36)}`,code=v15SeedCode(rarity,slot,classId,qualityBoost,core);return v15GenerateEquipmentFromSeedCode(code);};

  const gearPowerScoreV15Visible=gearPowerScorePreV14;
  gearPowerScore=function(item){if(!item)return 0;const visible=gearPowerScoreV15Visible(item),actual=v14FallbackPower(item),elementBonus=item.element?10:0;return visible+actual*2.15+elementBonus;};
  formatGearComparison=function(item,current){if(!current)return `<b>Empty slot.</b> Equipping this item will not replace anything.`;const score=gearPowerScore(item)-gearPowerScore(current),deltas=[];const keys=new Set([...Object.keys(current.bonuses||{}),...Object.keys(item.bonuses||{})]);keys.forEach(k=>{const d=(item.bonuses?.[k]||0)-(current.bonuses?.[k]||0);if(Math.abs(d)>.0001)deltas.push(`${STAT_LABELS[k]||k} ${formatBonusValue(k,d)}`);});const quality=score>12?'<span class="better">Overall quality: stronger</span>':score<-12?'<span class="worse">Overall quality: weaker</span>':'<span class="same">Overall quality: similar</span>';return `${quality}<br>${deltas.length?deltas.join(" · "):'<span class="same">No numerical stat change</span>'}`;};

  makeMerchantGear=function(){const b=boardLevel,bonus={1:.05,2:.18,3:.34,4:.52,5:.72}[b]||.72;let rarity=rollGearRarity(bonus);if(b>=2&&rarity==="common"&&random()<.55)rarity="uncommon";if(b>=3&&rarity==="common")rarity="uncommon";if(b>=3&&rarity==="uncommon"&&random()<(b===3?.20:b===4?.32:.42))rarity="rare";if(b>=4&&rarity==="rare"&&random()<(b===4?.08:.14))rarity="epic";const gear=generateEquipment(rarity),markup=[0,1.75,1.95,2.20,2.45,2.75][b]||2.75,base=Math.round(v14RawSellValue(gear)*markup);return {id:gear.id,icon:gear.icon,name:gear.name,desc:`${SLOT_LABELS[gear.slot]} · ${formatBonuses(gear)}`,gear,base,buy(){equipItem(gear);return gear;}};};

  const equipItemV15Patch=equipItem;
  equipItem=function(item,silent=false){const old=player.equipment?.[item.slot],willSell=!silent&&old&&old.id!==item.id,sale=willSell?itemSellValue(old):0;equipItemV15Patch(item,silent);if(willSell){player.gold+=sale;ensureAlphaMeta().goldEarned+=sale;statsLastGold=player.gold;sfx.coin();addLog(`Auto-sold replaced <b>${old.name}</b> for <b>${sale} gold</b>.`);showToast(`Equipped ${item.name} · old gear +${sale}g`);updateHUD();}};
  {const oldBtn=$("equipLootBtn");if(oldBtn){const neo=oldBtn.cloneNode(true);oldBtn.replaceWith(neo);neo.addEventListener("click",async()=>{if(!pendingLootItem)return;const current=player.equipment[pendingLootItem.slot],delta=current?gearPowerScore(pendingLootItem)-gearPowerScore(current):999;if(current&&delta<0&&!(await diceboundConfirm(`${pendingLootItem.name} rolls lower overall quality than ${current.name} after considering its hidden quality budget and visible stats. Replace it anyway? ${current.name} will automatically be sold for ${itemSellValue(current)} gold.`,{title:"Replace stronger gear?",confirmLabel:"Replace anyway",danger:true})))return;equipItem(pendingLootItem);closeLoot();});}}

  openTreasure=function(){const progress=player.position/Math.max(1,currentTileCount()-1),mult=[0,1,1.35,1.72,2.12,2.58][boardLevel]||2.58,base=rand(18,36)+Math.round(progress*16),gold=modifiedGold(Math.round(base*mult));player.gold+=gold;let extras=[];const potionChance=.28+(boardLevel-1)*.055;if(random()<potionChance){const count=boardLevel>=4&&random()<.20?2:1;player.potions+=count;extras.push(`${count} potion${count===1?"":"s"}`);}tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);sfx.coin();addLog(`Board ${boardLevel} treasure yields <b>${gold} gold</b>${extras.length?` and ${extras.join(", ")}`:""}.`);showToast(`Treasure: +${gold} gold${extras.length?` · ${extras.join(", ")}`:""}`);updateHUD();const gearChance=clamp(.68+(boardLevel-1)*.055,0,.92),done=()=>returnToRoad();if(random()<gearChance){const rarity=rollGearRarity(.05+(boardLevel-1)*.10+progress*.06);openLoot(generateEquipment(rarity),done);}else done();};

  // ---- Summoner & Pokémon Trainer runtime ----------------------------------
  function shuffledPetIds(){const arr=Object.keys(PETS);for(let i=arr.length-1;i>0;i--){const j=rand(0,i),t=arr[i];arr[i]=arr[j];arr[j]=t;}return arr;}
  function trainerPetDamage(id){const lvl=Math.max(1,meta.pets?.[id]?.level||1),base=1+Math.ceil(lvl*.82)+player.petDamageBonus;return Math.max(1,base);}
  function petElementFor(id){const def=PETS[id]||PETS.neutral;return def.id==="neutral"?pick(DIBO_ELEMENTS):def.element;}
  function activeTrainerPetId(){const r=player.trainerRoster||[];return r.length?r[(player.trainerActiveIndex||0)%r.length]:meta.activePet;}
  async function maybePetElementProc(id,target,source="Companion Spark"){const rank=gameplayTalentRank("companion_element_proc");if(!rank||!target||target.hp<=0||random()>=rank*.025)return null;const key=petElementFor(id),result=triggerElementEffect(key,target,{forced:true,source});if(result){addCombatHistory(`🌈 ${PETS[id]?.name||"Companion"} triggers ${ELEMENTS[key].name} through Primal Spark.`);await delay(180);}return result;}
  async function trainerStrike(id,target,scale=1,label="attacks"){if(!target||target.hp<=0)return 0;const def=PETS[id]||PETS.neutral,element=petElementFor(id);let amount=Math.round(trainerPetDamage(id)*scale);if(element&&target.weakness===element)amount=Math.round(amount*1.5);if(element&&target.affinity===element)amount=Math.round(amount*.5);const dealt=damageEnemy(target,amount);if(element)trackElementProgress(element,dealt);addCombatHistory(`${def.icon} ${def.name} ${label} for ${dealt} ${element?ELEMENTS[element].name:"neutral"} damage.`);await maybePetElementProc(id,target,`${def.name} companion proc`);return dealt;}
  async function summonerConjure(){if(combatBusy||!currentEnemy||!classIdentityActive("summoner"))return;const cfg=OCCULT_SPELLS.summoner;if(player.mana<cfg.cost)return;combatBusy=true;player.mana-=cfg.cost;player.combatActionCount++;player.summonerSpirits=player.summonerSpirits||[];const cap=player.summonerCap||3,candidates=Object.keys(PETS).filter(id=>meta.pets?.[id]?.unlocked&&!player.summonerSpirits.includes(id)),pool=candidates.length?candidates:Object.keys(PETS).filter(id=>meta.pets?.[id]?.unlocked),id=pool.length?pick(pool):"neutral";if(player.summonerSpirits.length>=cap)player.summonerSpirits.shift();player.summonerSpirits.push(id);identityFlash(`🐾 Conjured ${PETS[id].name}`);setCombatText(`📖 You spend ${cfg.cost} Mana to conjure ${PETS[id].icon} ${PETS[id].name}. ${player.summonerSpirits.length}/${cap} spirit slots are active.`);updateCombatUI();await delay(520);await resolveEnemyResponse(false);}
  const occultChannelAttackV15Patch=occultChannelAttack;
  occultChannelAttack=async function(){if(!classIdentityActive("summoner")||!(player.summonerManaBonus||0))return occultChannelAttackV15Patch();const cfg=OCCULT_SPELLS.summoner,old=cfg.gain;cfg.gain=old+(player.summonerManaBonus||0);try{return await occultChannelAttackV15Patch();}finally{cfg.gain=old;}};
  const occultSpellAttackV15Patch=occultSpellAttack;
  occultSpellAttack=async function(){if(classIdentityActive("summoner"))return summonerConjure();return occultSpellAttackV15Patch();};
  function cycleTrainerPokemon(){if(!classIdentityActive("pokemontrainer")||combatBusy)return;const roster=player.trainerRoster||[];if(!roster.length)return;player.trainerActiveIndex=((player.trainerActiveIndex||0)+1)%roster.length;const id=activeTrainerPetId();identityFlash(`${PETS[id].icon} Go, ${PETS[id].name}!`);setCombatText(`🧢 You switch to ${PETS[id].icon} ${PETS[id].name}. Switching does not spend your turn.`);updateCombatUI();}
  $("specialAttackBtn")?.addEventListener("click",e=>{if(classIdentityActive("pokemontrainer")){e.preventDefault();e.stopImmediatePropagation();cycleTrainerPokemon();}},true);

  const resetPlayerV15Patch=resetPlayer;
  resetPlayer=function(classId=selectedClassId){resetPlayerV15Patch(classId);player.summonerSpirits=[];player.summonerCap=3;player.summonerSpiritScale=1;player.summonerSpiritDouble=0;player.summonerManaBonus=0;player.summonerAutoSpirit=false;player.trainerRoster=[];player.trainerActiveIndex=0;player.trainerAssistBonus=0;player.trainerAssistScale=.65;player.trainerUltimateBonus=0;if(classIdentityActive("summoner")){player.maxMana=120;player.mana=35;}if(classIdentityActive("pokemontrainer")){player.trainerRoster=shuffledPetIds().slice(0,6);player.trainerActiveIndex=rand(0,Math.max(0,player.trainerRoster.length-1));}};
  const startCombatV15Patch=startCombat;
  startCombat=function(kind="normal"){startCombatV15Patch(kind);if(classIdentityActive("summoner")){player.summonerSpirits=[];if(player.summonerAutoSpirit){const pool=Object.keys(PETS).filter(id=>meta.pets?.[id]?.unlocked);if(pool.length)player.summonerSpirits=[pick(pool)];}}updateCombatUI();};
  const petTurnV15Patch=petTurn;
  petTurn=async function(){if(classIdentityActive("pokemontrainer")){const targets=livingEnemies();if(!targets.length)return;let target=currentEnemy?.hp>0?currentEnemy:targets[0],id=activeTrainerPetId();await trainerStrike(id,target,1.65,"leads the roster");if(target.hp<=0){target=livingEnemies()[0];if(target)setCurrentEnemy(currentEnemies.indexOf(target));}if(target&&random()<clamp(.28+(player.trainerAssistBonus||0),0,.80)){const others=(player.trainerRoster||[]).filter(x=>x!==id),assist=others.length?pick(others):id;await trainerStrike(assist,target,player.trainerAssistScale||.65,"jumps in to assist");}updateCombatUI();await delay(380);return;}await petTurnV15Patch();if(!livingEnemies().length)return;if(classIdentityActive("summoner")&&(player.summonerSpirits||[]).length){for(const id of [...player.summonerSpirits]){const target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0];if(!target)break;const scale=.62*(player.summonerSpiritScale||1),hits=random()<clamp(player.summonerSpiritDouble||0,0,.75)?2:1;for(let h=0;h<hits;h++){await trainerStrike(id,target,scale,hits>1?"answers the pact twice":"answers the pact");if(!target.hp)break;}if(target.hp<=0&&livingEnemies().length)setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));}}else{const target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0];if(target)await maybePetElementProc(meta.activePet||"neutral",target);}updateCombatUI();};

  const useUltimateV15Patch=useUltimate;
  useUltimate=async function(){if(!classIdentityActive("summoner")&&!classIdentityActive("pokemontrainer"))return useUltimateV15Patch();if(combatBusy||!currentEnemy||player.ultimateCharge<100)return;combatBusy=true;player.guardCooldown=0;player.ultimateCharge=0;player.combatActionCount++;await animateUltimate();let dealt=0;if(classIdentityActive("summoner")){let ids=[...(player.summonerSpirits||[])],pool=Object.keys(PETS).filter(id=>meta.pets?.[id]?.unlocked);while(ids.length<3&&pool.length){const id=pick(pool);if(!ids.includes(id)||pool.length<=ids.length)ids.push(id);else pool=pool.filter(x=>x!==id);}const per=Math.round((player.attack*1.25+petDamage()*1.7)*(1+player.classUltimateBonus));dealt=damageAll(per+ids.length*petDamage(),.82);setCombatText(`🌌 Grand Convergence calls ${Math.max(1,ids.length)} spirits through the pact for ${dealt} total damage.`);}else{const ids=player.trainerRoster||[],rosterPower=ids.reduce((sum,id)=>sum+trainerPetDamage(id),0),per=Math.round((player.attack*1.2+rosterPower*1.25)*(1+(player.trainerUltimateBonus||0))*(1+player.classUltimateBonus));dealt=damageAll(per,.88);setCombatText(`🌈🐾 Six-Pack Stampede sends ${ids.map(id=>PETS[id]?.icon||"🐾").join("")} across the battlefield for ${dealt} total damage.`);}sfx.crit();updateCombatUI();await delay(900);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);};

  const updateCombatUIV15Patch=updateCombatUI;
  updateCombatUI=function(){updateCombatUIV15Patch();const special=$("specialAttackBtn");if(!special)return;if(classIdentityActive("summoner")){const cfg=OCCULT_SPELLS.summoner,spirits=player.summonerSpirits||[],gain=cfg.gain+(player.summonerManaBonus||0);const atk=$("attackBtn");if(atk){atk.dataset.tip=`Spirit Bolt is your Mana-building attack. It deals about 82% normal basic damage and grants up to ${gain} Mana.`;}special.textContent=`🐾 Conjure (${cfg.cost}) · ${spirits.length}/${player.summonerCap||3}`;special.dataset.tip=`Spend ${cfg.cost} Mana to conjure a random unlocked companion spirit for this battle. Up to ${player.summonerCap||3} spirits join your normal companion after player actions.`;special.disabled=combatBusy||player.mana<cfg.cost;setResourceUI("mana","Mana / Spirit Circle",player.mana,player.maxMana,`${cfg.desc} Active spirits: ${spirits.length?spirits.map(id=>`${PETS[id].icon} ${PETS[id].name}`).join(", "):"none"}.`);}else if(classIdentityActive("pokemontrainer")){const roster=player.trainerRoster||[],id=activeTrainerPetId();special.hidden=false;combatActions?.classList.add("has-special");special.textContent=`🔄 Switch · ${PETS[id]?.icon||"🐾"} ${PETS[id]?.name||"Creature"}`;special.dataset.tip="Switch to the next creature in your six-member roster without spending a combat turn. The active creature attacks harder and can call a roster assist.";special.disabled=combatBusy||!roster.length;setResourceUI("mana","Six-creature roster",(player.trainerActiveIndex||0)+1,Math.max(1,roster.length),`Run roster: ${roster.map((x,i)=>`${i===player.trainerActiveIndex?"▶ ":""}${PETS[x]?.icon||"🐾"} ${PETS[x]?.name||x}`).join(" · ")}`);}};

  if(!talents.some(t=>t.id==="companion_element_proc"))talents.push({id:"companion_element_proc",branch:"Companion",icon:"🌈🐾",name:"Primal Spark",cost:3,maxRank:3,desc:"Each rank gives companion and summoned-creature hits a 2.5% chance to trigger their element's full proc.",requires:[req("companion_ascendant",1),req("element_attunement",1)]});

  function d20ResultTitle(roll){if(roll===1)return "CATASTROPHE";if(roll<=3)return "BAD OMEN";if(roll<=6)return "WEAK TIMELINE";if(roll<=9)return "PATCH-UP";if(roll<=12)return "EMPOWERED";if(roll<=15)return "ECHO + BARRIER";if(roll<=17)return "ELEMENTAL CHAOS";if(roll===18)return "HASTE";if(roll===19)return "CRITICAL MIRACLE";return "NATURAL TWENTY";}
  const rollD20ChaosV15Patch=rollD20Chaos;
  rollD20Chaos=async function(action){const out=await rollD20ChaosV15Patch(action);if(classIdentityActive("d20")&&out?.roll){const title=d20ResultTitle(out.roll);identityFlash(`🎲 ${out.roll}/20 — ${title}`);addCombatHistory(`🎲 ${action.toUpperCase()} ROLL: ${out.roll}/20 — ${title}. ${out.notes||""}`);setCombatText(`🎲 Twenty-Sider ${action}: ${out.roll}/20 — ${title}. ${out.notes||""}`);showToast(`🎲 ${out.roll}/20: ${title}`);await delay(260);}return out;};

  const winCombatV15Patch=winCombat;
  winCombat=async function(){const defeated=currentEncounterLead||currentEnemy,boardAtWin=boardLevel,classAtWin=player.classId,wasNightmare=nightmareMode,isFinal=!!defeated?.finalBoss;if(isFinal&&boardAtWin===5&&classAtWin==="beastmaster"&&wasNightmare){meta.beastmasterNightmareBoard5=true;saveMeta();}const result=await winCombatV15Patch();checkDynamicClassUnlocks();return result;};

  // ---- Debug: all Mythic pieces + item seed recreation ----------------------
  const refreshDebugButtonsV15Patch=refreshDebugButtons;
  refreshDebugButtons=function(){refreshDebugButtonsV15Patch();const grid=$("debugGrid");if(!grid)return;const defs=[["mythic_weapon","🌈 Mythic Weapon"],["mythic_boots","🌈 Mythic Boots"],["mythic_legs","🌈 Mythic Legguards"],["mythic_amulet","🌈 Mythic Amulet"],["mythic_hat","🌈 Mythic Hat"],["mythic_ring","🌈 Mythic Ring"],["seed_item","🧬 Add item by seed code"]];for(const [id,label] of defs){let btn=grid.querySelector(`[data-debug="${id}"]`);if(!btn){btn=document.createElement("button");btn.dataset.debug=id;btn.className="small-btn";grid.appendChild(btn);}btn.textContent=label;}};
  const debugActionV15Patch=debugAction;
  debugAction=function(action){const mythics={mythic_weapon:generateMythicalWeapon,mythic_boots:generateMythicalBoots,mythic_legs:generateMythicalPants,mythic_amulet:generateMythicalAmulet,mythic_hat:generateMythicalHat,mythic_ring:generateMythicalRing};if(mythics[action]){if(!gameStarted){showToast("Start a run first");return;}equipItem(mythics[action](),true);updateHUD();showToast(`${action.replace("mythic_","")} Mythic added`);return;}if(action==="seed_item"){if(!gameStarted){showToast("Start a run first");return;}const code=window.DiceboundPlatform.prompt("Paste a Dicebound v1.5 item seed code (starts with D15|):","");if(code==null)return;const item=v15GenerateEquipmentFromSeedCode(code);if(!item){window.DiceboundPlatform.alert("That seed code is not a valid Dicebound v1.5 ordinary-item seed.");return;}$("debugOverlay").classList.add("hidden");openLoot(item,()=>{});return;}return debugActionV15Patch(action);};

  // ---- New class portraits and sensible selection order --------------------
  const classPortraitV15Patch=classPortraitSVG;
  classPortraitSVG=function(classId){
    if(classId==="summoner")return `<svg viewBox="0 0 64 64" role="img" aria-label="Summoner portrait"><defs><linearGradient id="sum15" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111936"/><stop offset="1" stop-color="#7047b8"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#07101c"/><rect x="3" y="3" width="58" height="58" rx="12" fill="url(#sum15)"/><circle cx="32" cy="25" r="12" fill="#d6a77e"/><path d="M14 22c4-13 31-18 38 0l-9-4H21z" fill="#37245f"/><path d="M17 57c2-13 9-19 15-19 7 0 14 6 16 19" fill="#281b49"/><path d="M8 46l14-7v18L8 52zM56 46l-14-7v18l14-5z" fill="#d5c2ff" stroke="#6e50aa"/><circle cx="13" cy="18" r="5" fill="#79d7ff" opacity=".8"/><circle cx="51" cy="15" r="4" fill="#ffcb71" opacity=".85"/><circle cx="27" cy="26" r="1.5"/><circle cx="37" cy="26" r="1.5"/></svg>`;
    if(classId==="pokemontrainer")return `<svg viewBox="0 0 64 64" role="img" aria-label="Pokemon Trainer portrait"><defs><linearGradient id="pt15" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#163152"/><stop offset="1" stop-color="#d84343"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#08101b"/><rect x="3" y="3" width="58" height="58" rx="12" fill="url(#pt15)"/><circle cx="32" cy="27" r="12" fill="#d6a477"/><path d="M15 19c5-11 27-15 35-3l-5 5H18z" fill="#d63e45"/><path d="M31 11h14v7H31z" fill="#f0ece1"/><path d="M15 58c3-13 10-19 17-19s14 6 17 19" fill="#17365a"/><circle cx="12" cy="49" r="7" fill="#f3f3ef" stroke="#d23c43" stroke-width="4"/><circle cx="52" cy="48" r="7" fill="#f3f3ef" stroke="#d23c43" stroke-width="4"/><circle cx="12" cy="49" r="2" fill="#1b2430"/><circle cx="52" cy="48" r="2" fill="#1b2430"/><circle cx="27" cy="27" r="1.5"/><circle cx="37" cy="27" r="1.5"/></svg>`;
    return classPortraitV15Patch(classId);
  };




  /* ---------- Alpha v1.6: refinement, alchemy, radiation and fifth-road hard stop ---------- */
  document.title=`Dicebound: Alpha v1.9 — ${pick([
    "the turtle has discovered patience",
    "radiation is now a build choice",
    "potions may be thrown at management",
    "the fifth road has been legally prohibited from looping",
    "clown ultimates now respect comedy continuity"
  ])}`;

  const v16Style=document.createElement("style");
  v16Style.textContent=`
    .combat-btn.special.faith.ready{background:linear-gradient(180deg,rgba(255,230,126,.78),rgba(183,118,25,.70))!important;border-color:rgba(255,244,178,.96)!important;color:#fffbea!important;box-shadow:0 0 18px rgba(255,218,92,.48),inset 0 0 12px rgba(255,255,225,.16)!important;filter:brightness(1.18)}
    .combat-btn.special.faith.ready:hover{filter:brightness(1.32);box-shadow:0 0 24px rgba(255,218,92,.62)!important}
    .class-resource-wrap.gag .class-resource-bar{display:none}.class-resource-wrap.gag .class-resource-label{margin-bottom:2px}.class-resource-wrap.gag #classResourceText{color:#ffd5ff;white-space:normal;text-align:right}
    .powerup-reroll-btn{grid-column:1/-1;margin-top:5px;background:linear-gradient(180deg,rgba(57,112,169,.36),rgba(27,58,92,.5));border:1px solid rgba(112,186,246,.32);color:#dff3ff;border-radius:12px;padding:9px 12px;font-weight:900;cursor:pointer}
    .powerup-reroll-btn:disabled{opacity:.38;cursor:not-allowed}
    .pet-stat-boost{display:block;margin-top:5px;color:#9eeec7;font-weight:800;font-size:9px}
    .radiation-note{color:#b9ff73}.defense-tooltip{cursor:help;text-decoration:underline dotted rgba(255,255,255,.28);text-underline-offset:3px}
    .alchemist-special{background:linear-gradient(180deg,rgba(83,177,112,.42),rgba(31,86,54,.52))!important;border-color:rgba(121,245,159,.44)!important}
  `;
  document.head.appendChild(v16Style);

  // ---- Radiation ------------------------------------------------------------
  if(!ELEMENTS.radiation){
    ELEMENTS.radiation={name:"Radiation",icon:"☢️",spell:"Irradiate",description:"Deals light elemental damage and permanently lowers the target's Defense for the current battle."};
    if(!ELEMENT_KEYS.includes("radiation"))ELEMENT_KEYS.push("radiation");
    PETS.radiation={id:"radiation",name:"Glowbug",icon:"☢️🐛",element:"radiation",desc:"A suspiciously luminous companion. Slightly stronger than DiBo and grants a small Element Power bonus while active."};
  }
  const radiationWeakling=enemyPool.find(e=>e.name==="Demon");if(radiationWeakling)radiationWeakling.weakness="radiation";
  meta.pets=meta.pets||{};if(!meta.pets.radiation)meta.pets.radiation=defaultPetState(false);
  meta.elementProgress=meta.elementProgress||{};if(meta.elementProgress.radiation==null)meta.elementProgress.radiation=0;
  meta.stats=meta.stats||defaultLifetimeStats();if(meta.stats.potionsUsed==null)meta.stats.potionsUsed=0;
  meta.unlocks=meta.unlocks||{};if(meta.unlocks.alchemist==null)meta.unlocks.alchemist=false;

  const triggerElementEffectV16Base=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    if(key!=="radiation")return triggerElementEffectV16Base(key,target,opts);
    if(!target||target.hp<=0)return null;const {forced=false,source="Weapon"}=opts,item=player.equipment?.weapon,weak=target.weakness===key;
    if(!forced){if(!item||item.element!==key)return null;const setProc=v19SetProcBonus(),chance=clamp(.14+rarityValues[item.rarity]*.025+player.elementProcBonus+setProc+(weak?.22:0),0,.98);if(random()>=chance)return null;}
    playElementAnimation(key,target,false);const mult=(weak?1.55+player.weaknessElementBonus:1)*(1+player.elementDamageBonus),damage=elementHit(target,key,player.attack*.34*mult),before=target.defense||0,shred=Math.min(before,Math.max(1,Math.round(1+(weak?1:0)+player.elementDamageBonus*2)));target.defense=Math.max(0,before-shred);trackElementProgress(key,damage);const message=`${weak?"WEAKNESS! ":""}☢️ Irradiate deals ${damage} damage and lowers ${target.name}'s Defense by ${shred}.`;
    addLog(`<b>Irradiate</b> ${source} ${weak?"exploits a weakness":"activates"}.`);showToast(`☢️ -${shred} DEF`);renderEnemyParty();updateCombatUI();return {totalDamage:damage,heal:0,message};
  };
  const enemyElementProcV16Base=enemyElementProc;
  enemyElementProc=function(enemy){
    if(enemy?.affinity!=="radiation")return enemyElementProcV16Base(enemy);
    if(random()>enemy.elementProcChance)return "";playElementAnimation("radiation",enemy,true);const loss=Math.min(Math.max(0,player.defense),1);if(loss){player.defense-=loss;player.radiationDefenseLost=(player.radiationDefenseLost||0)+loss;}const note=`☢️ ${enemy.name} activates Irradiate: ${loss?`your Defense falls by ${loss} for this battle.`:"your Defense is already at 0."}`;addCombatHistory(note);updateHUD();return note;
  };
  function restoreRadiationDefenseV16(){if(player.radiationDefenseLost){player.defense+=player.radiationDefenseLost;player.radiationDefenseLost=0;}}

  // Enemy affinity can never contradict its weakness.
  const scaleEnemyV16Base=scaleEnemy;
  scaleEnemy=function(base,kind="normal",packSize=1){const e=scaleEnemyV16Base(base,kind,packSize);if(e.affinity&&e.affinity===e.weakness){const pool=ELEMENT_KEYS.filter(k=>k!==e.weakness);e.affinity=pool.length?pick(pool):null;}return e;};

  // ---- New Alchemist class --------------------------------------------------
  CLASSES.alchemist={id:"alchemist",name:"Alchemist",icon:"⚗️",attackIcon:"🧪",fxIcon:"🧪💥",unlock:"Use 100 potions across all runs",desc:"A potion engineer who brews replacements during combat and can drink potions for healing or throw them as volatile weapons. Offensive flask damage scales directly with Potion Healing bonuses.",stats:"34 HP · 6 ATK · 1 DEF · +25% POTION HEALING",ultimate:{name:"Grand Distillation",icon:"⚗️✨",desc:"Creates three potions, restores health and detonates an oversized restorative formula across the enemy pack."},base:{maxHp:34,attack:6,defense:1,crit:.08,dodge:.04,luck:.06,doubleStrike:.04,guardPower:.54,classBurst:.14,lifeSteal:0},tags:["alchemy","sustain","ranged","weird"]};
  CLASS_TAGS.alchemist=["alchemy","sustain","ranged","weird"];
  CLASS_PASSIVES.alchemist={name:"Combat Distillery",desc:"Every third basic attack brews a potion. Potions can heal normally or be consumed as Volatile Flasks whose damage scales with Potion Healing."};CLASSES.alchemist.passive=CLASS_PASSIVES.alchemist;
  Object.assign(gearNames.weapon,{alchemist:["Catalyst Rod","Glassbreaker","Distillation Staff"]});Object.assign(gearNames.offhand,{alchemist:["Reagent Case","Portable Still","Unlabelled Flask Rack"]});for(const slot of ["boots","legs","chest","hat","ring","amulet"]){gearNames[slot]=gearNames[slot]||{};gearNames[slot].alchemist=[`Distiller's ${SLOT_LABELS[slot]}`];}
  upgrades.push(
    {id:"alchemist_quick_brew",classId:"alchemist",rarity:"uncommon",icon:"🧪⚙️",name:"Quick Brew",desc:"Combat Distillery creates a potion every 2 basic attacks instead of every 3.",tags:["alchemy","sustain"],apply(){player.alchemistBrewNeed=2;}},
    {id:"alchemist_volatile_formula",classId:"alchemist",rarity:"rare",icon:"💥🧪",name:"Volatile Formula",desc:"Volatile Flask deals +35% damage and has a 20% chance to trigger a random element.",tags:["alchemy","damage","elemental"],apply(){player.alchemistFlaskBonus=(player.alchemistFlaskBonus||0)+.35;player.alchemistElementChance=(player.alchemistElementChance||0)+.20;}},
    {id:"alchemist_panacea_engine",classId:"alchemist",rarity:"legendary",icon:"⚗️🌈",name:"Panacea Engine",desc:"+75% Potion Healing. Volatile Flask has a 30% chance not to consume its potion.",tags:["alchemy","sustain","legendary"],apply(){player.potionPower+=.75;player.alchemistFreeFlask=(player.alchemistFreeFlask||0)+.30;}}
  );
  const baseClassUnlockedV16=baseClassUnlocked;baseClassUnlocked=function(id){if(id==="alchemist")return !!meta.unlocks?.alchemist||(meta.stats?.potionsUsed||0)>=100;return baseClassUnlockedV16(id);};
  const checkDynamicClassUnlocksV16=checkDynamicClassUnlocks;checkDynamicClassUnlocks=function(){checkDynamicClassUnlocksV16();if((meta.stats?.potionsUsed||0)>=100)unlockClass("alchemist");};

  function v16PotionHealValue(mult=1){return Math.max(1,Math.round((10+player.maxHp*.10)*(1+player.potionPower)*mult));}
  function recordPotionUseV16(){const s=ensureAlphaMeta();s.potionsUsed=(s.potionsUsed||0)+1;checkDynamicClassUnlocks();saveMeta();if(!gameStarted)window.DiceboundClassChooser?.render?.();}
  usePotion=async function(){
    if(combatBusy||!currentEnemy||player.potions<=0||player.hp>=player.maxHp)return;
    combatBusy=true;player.guardCooldown=0;
    const maxDrinks=player.doublePotionTurn?2:1;let drinks=0,totalHeal=0,chaosNotes=[];
    while(drinks<maxDrinks&&player.potions>0&&player.hp<player.maxHp&&livingEnemies().length){
      const chaos=await rollD20Chaos("potion");player.potions--;recordPotionUseV16();drinks++;
      totalHeal+=healPlayer(v16PotionHealValue(chaos.potionMult||1));sfx.heal();
      if(chaos.forceElement){const r=triggerElementEffect(chaos.forceElement,currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],{forced:true,source:"d20 potion"});if(r)chaosNotes.push(r.message);}
      if(chaos.allElements)DIBO_ELEMENTS.forEach(k=>triggerElementEffect(k,currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],{forced:true,source:"natural twenty potion"}));
      if(drinks<maxDrinks&&player.potions>0&&player.hp<player.maxHp&&livingEnemies().length)await delay(180);
    }
    const pants=applyMythicPantsPulse(),dose=drinks>1?' Double Dose drinks a second potion before the enemy can respond.':'';
    setCombatText(`You drink ${drinks>1?drinks+' potions':'a potion'} and restore ${totalHeal} HP.${dose}${chaosNotes.length?' '+chaosNotes.join(' '):''}${pants?` ${pants}`:""}`);
    updateCombatUI();await delay(630);if(!livingEnemies().length)return winCombat();await resolveEnemyResponse(false);
  };
  usePotionOutsideCombat=function(){if(!gameStarted||rollLocked||currentEnemy||player.potions<=0||player.hp>=player.maxHp)return;player.potions--;recordPotionUseV16();const heal=healPlayer(v16PotionHealValue());sfx.heal();addLog(`You drink a potion on the road and restore <b>${heal} HP</b>.`);showToast(`+${heal} HP`);updateHUD();};
  async function alchemistVolatileFlaskV16(){if(combatBusy||!currentEnemy||player.potions<=0)return;combatBusy=true;player.guardCooldown=0;const free=random()<clamp(player.alchemistFreeFlask||0,0,.8);if(!free){player.potions--;recordPotionUseV16();}const healing=v16PotionHealValue(),raw=Math.round((healing*1.35+player.attack*.9)*(1+(player.alchemistFlaskBonus||0))),dealt=damageAll(raw,.72);let extra=free?" Panacea Engine preserves the potion.":"";if(random()<clamp(player.alchemistElementChance||0,0,.75)){const key=pick(ELEMENT_KEYS),target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],r=triggerElementEffect(key,target,{forced:true,source:"Volatile Flask"});if(r)extra+=` ${r.message}`;}player.combatActionCount++;chargeUltimate(Math.round(player.ultimateAttackGain*.75));sfx.crit();setCombatText(`🧪 Volatile Flask consumes restorative potency as violence for ${dealt} total damage.${extra}`);updateCombatUI();await delay(720);if(!livingEnemies().length)return winCombat();await resolveEnemyResponse(false);}

  // ---- Talents --------------------------------------------------------------
  const v16Talents=[
    {id:"fortune_powerup_rerolls",branch:"Fortune",icon:"🔄✨",name:"Second Opinion",cost:1,maxRank:5,desc:"Each rank adds 1 Powerup Reroll at the start of every run.",requires:[req("fortune_luck",1)]},
    {id:"fighter_counter_reserve",branch:"Power",icon:"🛡️🛡️",name:"Counter Reserve",cost:2,maxRank:1,desc:"Fighter can bank up to 2 Counterblow stacks instead of 1.",requires:[req("power_attack",2)]},
    {id:"ranger_deep_marks",branch:"Power",icon:"🏹🎯",name:"Deep Quarry",cost:1,maxRank:3,desc:"Each rank increases Ranger's maximum Marks per enemy by 1.",requires:[req("power_crit",2)]},
    {id:"monk_flow_ceiling",branch:"Power",icon:"🥋🔥",name:"Endless Form",cost:1,maxRank:3,desc:"Each rank increases Monk's maximum Combo by 1.",requires:[req("power_echo",1)]},
    {id:"turtle_guard_element",branch:"Elements",icon:"🐢🌈",name:"Resonant Carapace",cost:2,maxRank:3,desc:"Each rank gives Guardian-tagged classes a 5% chance to trigger an elemental proc whenever they Guard.",requires:[req("element_attunement",1),req("survival_armor",1)]}
  ];for(const t of v16Talents)if(!talents.some(x=>x.id===t.id))talents.push(t);

  // ---- Per-run identity state ----------------------------------------------
  const resetPlayerV16Base=resetPlayer;
  resetPlayer=function(classId=selectedClassId){resetPlayerV16Base(classId);v16CombatKind=null;player.powerupRerolls=gameplayTalentRank("fortune_powerup_rerolls");player.rangerMarkMax=3+gameplayTalentRank("ranger_deep_marks");player.monkComboMax=5+gameplayTalentRank("monk_flow_ceiling");player.fighterCounterStacks=0;player.fighterCounterMax=1+Math.min(1,gameplayTalentRank("fighter_counter_reserve"));player.fighterCounterReady=false;player.turtleCrushReady=false;player.turtleGuardChain=0;player.turtleGuardMax=5;player.secondSun=false;player.secondSunUsedBoards={};player.radiationDefenseLost=0;player.alchemistBrewCounter=0;player.alchemistBrewNeed=3;player.alchemistFlaskBonus=0;player.alchemistElementChance=0;player.alchemistFreeFlask=0;player._activePetBonusId=null;if(classIdentityActive("alchemist")){player.potions+=2;if(player.classId!=="alchemist")player.potionPower+=.50;}syncActivePetBonusV16(true);};

  // ---- Companion differentiation -------------------------------------------
  const PET_STAT_BONUSES={
    fire:{label:"+1 Attack",apply(s){player.attack+=s},remove(s){player.attack-=s},v:1},ice:{label:"+1 Defense",apply(s){player.defense+=s},remove(s){player.defense-=s},v:1},electric:{label:"+3% Crit",apply(s){player.crit+=s},remove(s){player.crit-=s},v:.03},light:{label:"+5 Max HP",apply(s){player.maxHp+=s;player.hp+=s},remove(s){player.maxHp=Math.max(1,player.maxHp-s);player.hp=Math.min(player.hp,player.maxHp)},v:5},void:{label:"+3% Echo",apply(s){player.doubleStrike+=s},remove(s){player.doubleStrike-=s},v:.03},nature:{label:"+10% Potion Healing",apply(s){player.potionPower+=s},remove(s){player.potionPower-=s},v:.10},donut:{label:"+3 Max HP & +5% Potion Healing",apply(){player.maxHp+=3;player.hp+=3;player.potionPower+=.05},remove(){player.maxHp=Math.max(1,player.maxHp-3);player.hp=Math.min(player.hp,player.maxHp);player.potionPower-=.05},v:0},tech:{label:"+8% Boss Damage",apply(s){player.bossDamage+=s},remove(s){player.bossDamage-=s},v:.08},metal:{label:"+1 Flat Damage Reduction",apply(s){player.flatReduction+=s},remove(s){player.flatReduction-=s},v:1},coffee:{label:"+4 Luck",apply(s){player.luck+=s},remove(s){player.luck-=s},v:.04},radiation:{label:"+6% Element Power",apply(s){player.elementDamageBonus+=s},remove(s){player.elementDamageBonus-=s},v:.06}
  };
  function syncActivePetBonusV16(force=false){if(!gameStarted&&!force)return;const next=meta.activePet||"neutral",prev=player._activePetBonusId;if(prev===next&&!force)return;if(prev&&prev!=="neutral"&&PET_STAT_BONUSES[prev]){const b=PET_STAT_BONUSES[prev];b.remove(b.v);}player._activePetBonusId=next;if(next!=="neutral"&&PET_STAT_BONUSES[next]){const b=PET_STAT_BONUSES[next];b.apply(b.v);}}
  const petDamageV16Base=petDamage;petDamage=function(){return petDamageV16Base()+(meta.activePet&&meta.activePet!=="neutral"?2:0);};
  if(typeof trainerPetDamage==="function"){const trainerPetDamageV16Base=trainerPetDamage;trainerPetDamage=function(id){return trainerPetDamageV16Base(id)+(id&&id!=="neutral"?2:0);};}

  // ---- Powerup rerolls ------------------------------------------------------
  function attachPowerupRerollV16(grid,reroll){if(!grid)return;const b=document.createElement("button");b.className="powerup-reroll-btn";b.disabled=(player.powerupRerolls||0)<=0;b.textContent=`🔄 Reroll choices · ${player.powerupRerolls||0} remaining`;b.addEventListener("click",()=>{if((player.powerupRerolls||0)<=0)return;player.powerupRerolls--;sfx.roll();reroll();});grid.appendChild(b);}
  const openLevelUpV16Base=openLevelUp;openLevelUp=function(onComplete=null){openLevelUpV16Base(onComplete);attachPowerupRerollV16($("choiceGrid"),()=>openLevelUp(onComplete));};
  const showPowerupChoiceV16Base=showPowerupChoice;showPowerupChoice=function(source,onComplete,filter=()=>true,subtitle="Choose one free rarity-based powerup. Your character level does not change."){showPowerupChoiceV16Base(source,onComplete,filter,subtitle);attachPowerupRerollV16($("powerupGrid"),()=>showPowerupChoice(source,onComplete,filter,subtitle));};

  // ---- Ranger / Fighter / Monk / Turtle identities -------------------------
  const performStrikeV16Base=performStrike;
  performStrike=async function(target,opts={}){const echo=!!opts.echo,beforeMarks=target?.rangerMarks||0;let temp=0,consumeFighter=false,consumeTurtle=false;if(!echo&&classIdentityActive("fighter")&&(player.fighterCounterStacks||0)>0){player.fighterCounterReady=false;temp=.55;player.damageBonus+=temp;consumeFighter=true;}if(!echo&&classIdentityActive("turtle")&&(player.turtleGuardChain||0)>0){player.turtleCrushReady=false;temp=Math.min(.90,(player.turtleGuardChain||0)*.18);player.damageBonus+=temp;consumeTurtle=true;}let result;try{result=await performStrikeV16Base(target,opts);}finally{if(temp)player.damageBonus-=temp;}if(!echo&&classIdentityActive("fighter")&&consumeFighter){player.fighterCounterStacks=Math.max(0,(player.fighterCounterStacks||0)-1);identityFlash(`🛡️ Counterblow · ${player.fighterCounterStacks} stored`);}if(!echo&&classIdentityActive("ranger")&&target?.hp>0&&(player.rangerMarkMax||3)>3&&beforeMarks>=3)target.rangerMarks=Math.min(player.rangerMarkMax,beforeMarks+1);if(!echo&&classIdentityActive("turtle")&&consumeTurtle){identityFlash(`🐢 Shell Momentum ×${player.turtleGuardChain}`);player.turtleGuardChain=0;}return result;};
  const playerAttackV16Base=playerAttack;
  playerAttack=async function(){const cls=classIdentityId(),comboBefore=player.monkCombo||0,chicken=cls==="clown"&&player.clownGimmick==="Rubber Chicken",turtleChain=player.turtleGuardChain||0;if(chicken)player.doubleStrike+=.20;if(cls==="alchemist"&&!combatBusy&&currentEnemy){player.alchemistBrewCounter=(player.alchemistBrewCounter||0)+1;if(player.alchemistBrewCounter>=player.alchemistBrewNeed){player.alchemistBrewCounter=0;player.potions++;showToast("🧪 Brewed +1 potion");addCombatHistory("⚗️ Combat Distillery completes a fresh potion.");}}try{const r=await playerAttackV16Base();if(cls==="monk"&&(player.monkComboMax||5)>5)player.monkCombo=Math.min(player.monkComboMax,comboBefore+1);return r;}finally{if(chicken)player.doubleStrike-=.20;updateCombatUI();}};
  identityGuardAction=async function(){if(classIdentityActive("monk"))player.monkCombo=0;if(classIdentityActive("fighter")){player.fighterCounterReady=false;player.fighterCounterStacks=Math.min(player.fighterCounterMax||1,(player.fighterCounterStacks||0)+1);identityFlash(`🛡️ Counterblow ${player.fighterCounterStacks}/${player.fighterCounterMax}`);}if(classIdentityActive("turtle")){player.turtleCrushReady=false;player.turtleGuardChain=Math.min(player.turtleGuardMax||5,(player.turtleGuardChain||0)+1);if(player.turtleGuardChain===3||player.turtleGuardChain===5){player.combatShield++;identityFlash(`🐢 Shell wall ×${player.turtleGuardChain} · Barrier`);}const rank=0;const bonus=Math.max(0,(player.turtleGuardChain-1)*.05),old=player.guardPower;player.guardPower=clamp(old+bonus,0,.90);try{return await guardAction();}finally{player.guardPower=old;updateCombatUI();}}return guardAction();};
  identityPotionAction=async function(){if(classIdentityActive("monk"))player.monkCombo=0;if(classIdentityActive("turtle"))player.turtleGuardChain=0;return usePotion();};

  // ---- Clown gag continuity -------------------------------------------------
  const GAG_INFO={"Big Shoes":"+12% Dodge while active. Final Punchline raises extra barriers.","Rubber Chicken":"Basic attacks gain +20% Echo chance. Final Punchline hits harder.","Exploding Pie":"Your next basic attack deals +55% damage. Final Punchline becomes an enormous explosion.","Safety Net":"Opening the gag grants a Barrier. Final Punchline reinforces the net with more barriers.","Standing Ovation":"Opening the gag grants +25 Ultimate. Final Punchline leaves applause behind as 45 Ultimate."};
  function rerollClownGagV16(){const old=player.clownGimmick,pool=Object.keys(GAG_INFO).filter(x=>x!==old);player.clownGimmick=pick(pool.length?pool:Object.keys(GAG_INFO));player.clownPieReady=player.clownGimmick==="Exploding Pie";if(player.clownGimmick==="Safety Net")player.combatShield++;if(player.clownGimmick==="Standing Ovation")player.ultimateCharge=clamp(player.ultimateCharge+25,0,100);identityFlash(`🤡 New gag: ${player.clownGimmick}`);addCombatHistory(`Opening Gag rerolled: ${player.clownGimmick} — ${GAG_INFO[player.clownGimmick]}`);}

  // ---- Ultimate extensions --------------------------------------------------
  const useUltimateV16Base=useUltimate;
  useUltimate=async function(){
    if(classIdentityActive("alchemist")){if(combatBusy||!currentEnemy||player.ultimateCharge<100)return;combatBusy=true;player.guardCooldown=0;player.ultimateCharge=0;player.combatActionCount++;await animateUltimate();player.potions+=3;const healing=v16PotionHealValue(.65),heal=healPlayer(healing),damage=damageAll(Math.round(v16PotionHealValue()*1.55+player.attack*1.4),.86);sfx.holy();setCombatText(`⚗️ Grand Distillation brews 3 potions, restores ${heal} HP and detonates restorative chemistry for ${damage} total damage.`);updateCombatUI();await delay(850);if(!livingEnemies().length)return winCombat();return resolveEnemyResponse(false);}
    let extra=0,gag=null,ovation=false,turtleUltimateBonus=0;if(classIdentityActive("clown")){gag=player.clownGimmick;if(gag==="Big Shoes"){player.combatShield+=2;extra=.10;}if(gag==="Rubber Chicken")extra=.35;if(gag==="Exploding Pie")extra=.65;if(gag==="Safety Net"){player.combatShield+=3;extra=.10;}if(gag==="Standing Ovation"){extra=.22;ovation=true;}player.classUltimateBonus+=extra;}if(classIdentityActive("turtle")&&(player.turtleGuardChain||0)>0){turtleUltimateBonus=Math.min(.75,player.turtleGuardChain*.12);player.classUltimateBonus+=turtleUltimateBonus;}
    if(classIdentityActive("ranger")){const marks=currentEnemies.reduce((n,e)=>n+(e.rangerMarks||0),0),old=Math.min(.75,marks*.12),desired=Math.min(1.20,marks*.12),bonus=Math.max(0,desired-old);if(bonus)player.classUltimateBonus+=bonus;try{return await useUltimateV16Base();}finally{if(bonus)player.classUltimateBonus-=bonus;}}
    try{const r=await useUltimateV16Base();if(gag&&currentEnemy&&player.hp>0){if(ovation)player.ultimateCharge=clamp(player.ultimateCharge+45,0,100);rerollClownGagV16();updateCombatUI();}if(turtleUltimateBonus){player.turtleGuardChain=0;identityFlash("🐢 Shell Momentum released!");updateCombatUI();}return r;}finally{if(extra)player.classUltimateBonus-=extra;if(turtleUltimateBonus)player.classUltimateBonus-=turtleUltimateBonus;}
  };

  // ---- Combat UI clarity ----------------------------------------------------
  const updateCombatUIV16Base=updateCombatUI;
  updateCombatUI=function(){updateCombatUIV16Base();const special=$("specialAttackBtn");if($("enemyHpText")&&currentEnemy)$("enemyHpText").textContent=`${Math.max(0,currentEnemy.hp)} / ${currentEnemy.maxHp} · ${currentEnemy.attack||0} ATK · ${currentEnemy.defense||0} DEF`;document.querySelectorAll(".stage-enemy").forEach((el,i)=>{const e=currentEnemies[i];if(e)el.title=`${e.name} · ${Math.max(0,e.hp)}/${e.maxHp} HP · ${e.attack||0} ATK · ${e.defense||0} DEF${e.affinity?` · ${ELEMENTS[e.affinity]?.name||e.affinity} affinity`:""}`;});
    if(special&&classIdentityActive("cleric"))special.classList.toggle("ready",!special.disabled&&(player.clericFaith||0)>=100);
    if(classIdentityActive("fighter"))setResourceUI("combo","Counterblows",player.fighterCounterStacks||0,player.fighterCounterMax||1,"Guard stores one Counterblow. Each stored stack empowers one future basic attack by +55% damage.");
    if(classIdentityActive("ranger"))setResourceUI("mark","Marks on target",currentEnemy?.rangerMarks||0,player.rangerMarkMax||3,`Basic attacks mark the selected enemy up to ${player.rangerMarkMax||3}. Marks add Crit; Arrow Storm consumes the pack's marks for bonus damage.`);
    if(classIdentityActive("monk"))setResourceUI("combo","Flowing Combo",player.monkCombo||0,player.monkComboMax||5,`Consecutive basics build up to ${player.monkComboMax||5} Combo. Each stack adds damage, Echo and Dodge; Guard or Potion resets it.`);
    if(classIdentityActive("turtle"))setResourceUI("combo","Shell Momentum",player.turtleGuardChain||0,player.turtleGuardMax||5,"Consecutive Guards build Shell Momentum. Later Guards are stronger; stacks 3 and 5 raise a Barrier. Your next basic attack consumes the chain for +18% damage per stack.");
    if(classIdentityActive("clown")&&classResourceWrap){classResourceWrap.className="class-resource-wrap gag";$("classResourceName").textContent="Opening Gag";$("classResourceText").textContent=player.clownGimmick||"No gag yet";$("classResourceFill").style.width="0%";$("classResourceNote").textContent=player.clownGimmick?GAG_INFO[player.clownGimmick]:"A random gag appears when combat begins.";}
    if(classIdentityActive("alchemist")&&special){special.hidden=false;combatActions?.classList.add("has-special");special.className="combat-btn special action-tooltip alchemist-special";special.textContent=`🧪 Volatile Flask (${player.potions})`;special.dataset.tip=`Consume 1 potion to damage the enemy pack. Damage scales with the same Potion Healing bonuses that increase your ${v16PotionHealValue()} HP drink.`;special.disabled=combatBusy||player.potions<=0;setResourceUI("mana","Combat Distillery",player.alchemistBrewCounter||0,player.alchemistBrewNeed||3,`Every ${player.alchemistBrewNeed||3} basic attacks creates a potion. Drink them to heal or throw them with Volatile Flask.`);}
  };
  $("specialAttackBtn")?.addEventListener("click",e=>{if(!classIdentityActive("alchemist"))return;e.preventDefault();e.stopImmediatePropagation();alchemistVolatileFlaskV16();},true);

  const updateHUDV16Base=updateHUD;updateHUD=function(){updateHUDV16Base();const d=$("defenseText");if(d){const pct=Math.round(defenseDamageReduction(player.defense)*100);d.classList.add("defense-tooltip");d.title=`${Math.round(player.defense)} Defense currently reduces ordinary incoming damage by about ${pct}%. Defense has diminishing returns; guardian specials receive only part of this reduction.`;const box=d.closest(".stat");if(box)box.title=d.title;}checkDynamicClassUnlocks();};

  // ---- Second Sun actually works -------------------------------------------
  const handlePlayerDeathV16Base=handlePlayerDeath;
  handlePlayerDeath=function(){if(player.hp<=0&&player.secondSun&&!player.secondSunUsedBoards?.[boardLevel]){player.secondSunUsedBoards=player.secondSunUsedBoards||{};player.secondSunUsedBoards[boardLevel]=true;player.hp=1;combatBusy=false;sfx.holy();const target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0];let holy="";if(target){const r=triggerElementEffect("light",target,{forced:true,source:"Second Sun"});holy=r?.message||"Holy erupts across the pack.";}addLog(`<b>Second Sun!</b> Death is refused on Board ${boardLevel}.`);setCombatText(`☀️☀️ Second Sun returns you at 1 HP. ${holy}`);updateCombatUI();if(!livingEnemies().length)return winCombat();return;}return handlePlayerDeathV16Base();};

  // ---- Slot rewards scale modestly -----------------------------------------
  applySlotReward=function(result){const counts={};result.forEach(s=>counts[s]=(counts[s]||0)+1);const triple=Object.keys(counts).find(k=>counts[k]===3),pair=Object.keys(counts).find(k=>counts[k]===2),progress=player.position/Math.max(1,currentTileCount()-1),scale=1+(boardLevel-1)*.12+progress*.08;let text="";
    if(triple){switch(triple){case "⚔️":{const n=3+(boardLevel>=4?1:0);player.attack+=n;text=`Jackpot! +${n} attack permanently.`;break;}case "❤️":{const n=Math.round(12*scale);player.maxHp+=n;player.hp=Math.min(player.maxHp,player.hp+n);text=`Jackpot! +${n} max HP and heal ${n}.`;break;}case "🪙":{const g=modifiedGold(Math.round(80*scale));player.gold+=g;text=`Jackpot! +${g} gold.`;break;}case "🛡️":{const n=2+(boardLevel>=4?1:0);player.defense+=n;text=`Jackpot! +${n} defense permanently.`;break;}case "⭐":{const hp=Math.round(10*scale),crit=.07+(boardLevel-1)*.005;player.attack+=3+(boardLevel>=5?1:0);player.maxHp+=hp;player.hp+=hp;player.crit+=crit;text=`Legendary jackpot! Attack, +${hp} max HP and +${Math.round(crit*100)}% crit scale with the road.`;break;}case "💀":{const loss=Math.max(1,Math.floor(player.hp*.28));player.hp=Math.max(1,player.hp-loss);text=`Triple skulls! You lose ${loss} HP.`;break;}}sfx.level();}
    else if(pair){switch(pair){case "⚔️":{const n=1+(boardLevel>=5?1:0);player.attack+=n;text=`Two swords: +${n} attack permanently.`;break;}case "❤️":{const amount=Math.round(12*scale),heal=Math.min(player.maxHp-player.hp,amount);player.hp+=heal;text=`Two hearts: heal ${heal} HP.`;break;}case "🪙":{const g=modifiedGold(Math.round(30*scale));player.gold+=g;text=`Two coins: +${g} gold.`;break;}case "🛡️":{const n=1+(boardLevel>=4?1:0);player.flatReduction+=n;text=`Two shields: reduce incoming damage by ${n}.`;break;}case "⭐":{const c=.05+(boardLevel-1)*.004;player.crit+=c;text=`Two stars: +${Math.round(c*100)}% critical chance.`;break;}case "💀":{const loss=Math.max(1,Math.floor(player.hp*.12));player.hp=Math.max(1,player.hp-loss);text=`Two skulls: lose ${loss} HP.`;break;}}tone(650,.15,"triangle",.04,950);}
    else{const consolation=modifiedGold(Math.round(9*scale));player.gold+=consolation;text=`No match. The machine spits out ${consolation} consolation gold.`;sfx.coin();}const cookieChance=.09+gameplayTalentRank("fortune_cookie")*.02+Math.min(.06,(boardLevel-1)*.012);if(random()<cookieChance){meta.petCookies++;saveMeta();text+=` A rare pet cookie drops from the machine!`;showToast("🍪 Pet cookie found!");}$("slotResult").textContent=text;addLog(`<b>Event:</b> ${text}`);updateMetaUI();};

  // ---- Sovereign Relic: force a visible choice flow ------------------------
  renderMerchant=function(){$("merchantGold").textContent=player.gold;const notice=$("merchantNotice");notice.classList.toggle("show",!!currentMerchantNotice);notice.innerHTML=currentMerchantNotice;const grid=$("shopGrid");grid.innerHTML="";currentMerchantItems.forEach(item=>{const price=merchantPrice(item.base),btn=document.createElement("button");btn.className=`shop-item${item.sold?" sold":""}`;btn.disabled=item.sold||player.gold<price;const comparison=item.gear?`<div class="shop-compare">${formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:"";btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${item.sold?"SOLD":price+"g"}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;btn.addEventListener("click",()=>{if(item.sold||player.gold<price)return;if(item.gear){const current=player.equipment[item.gear.slot];if(current&&gearPowerScore(item.gear)<gearPowerScore(current)&&!window.DiceboundPlatform.confirm(`${item.gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`))return;}player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);if(item.alphaChooseLegendary||item.id==="relic"&&/Sovereign|Legendary Contract/.test(item.name||"")){currentMerchantNotice="👑 <b>Sovereign Relic purchased.</b> Your Legendary choice is waiting.";renderMerchant();$("merchantOverlay").classList.add("hidden");setTimeout(()=>showPowerupChoice("Sovereign Relic",()=>{currentMerchantNotice="👑 <b>Sovereign Relic claimed.</b> The chosen Legendary is active for this run.";$("merchantOverlay").classList.remove("hidden");updateHUD();renderMerchant();},u=>u.rarity==="legendary","Choose one of three Legendary powers. No random auto-pick."),0);return;}const result=item.buy();if(item.id==="relic"&&result)currentMerchantNotice=`🔮 <b>Relic opened:</b> ${rarityInfo[result.rarity].label} <b>${result.name}</b><br>${result.desc}`;else if(item.gear)currentMerchantNotice=`🧰 Equipped <b>${item.gear.name}</b>.<br>${formatBonuses(item.gear)}`;if(["attack","armor","charm"].includes(item.id))recordRunBuff(item.icon,item.name,item.desc,"merchant","Merchant");showToast(item.id==="relic"&&result?`${rarityInfo[result.rarity].label}: ${result.name}`:item.name);updateHUD();renderMerchant();});grid.appendChild(btn);});};

  // ---- Preserve valuable end-run gear warnings -----------------------------
  let v16PreciousWarningAcknowledged=false;
  function unboundPreciousGearV16(){const bound=meta.heirlooms||[];return EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]).filter(i=>i&&(i.rarity==="mythical"||i.rarity==="omega")&&!bound.some(h=>h.id===i.id||(h.seed&&i.seed&&h.seed===i.seed)));}
  async function preciousGuardV16(e){if(v16PreciousWarningAcknowledged)return;const items=unboundPreciousGearV16();if(!items.length)return;e.preventDefault();e.stopImmediatePropagation();const target=e.currentTarget||e.target;const ok=await diceboundConfirm(`WARNING: You are about to leave behind ${items.length} unbound Legendary/Artifact/Mythical/Omega item${items.length===1?"":"s"}:\n\n${items.map(i=>`• ${i.name}`).join("\n")}\n\nStart/leave this run without binding one as an heirloom anyway?`,{title:"Leave valuable gear?",confirmLabel:"Leave anyway",danger:true});if(!ok)return;v16PreciousWarningAcknowledged=true;target?.click?.();}
  ["restartBtn","endRestartBtn","startBtn"].forEach(id=>$(id)?.addEventListener("click",preciousGuardV16,true));$("startBtn")?.addEventListener("click",()=>setTimeout(()=>v16PreciousWarningAcknowledged=false,0));

  // ---- Alchemist art and class ordering ------------------------------------
  const classPortraitV16Base=classPortraitSVG;classPortraitSVG=function(classId){if(classId!=="alchemist")return classPortraitV16Base(classId);return `<svg viewBox="0 0 64 64" role="img" aria-label="Alchemist portrait"><defs><linearGradient id="alc16" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#193d2b"/><stop offset="1" stop-color="#713c82"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#08120d"/><rect x="3" y="3" width="58" height="58" rx="12" fill="url(#alc16)"/><circle cx="31" cy="25" r="11" fill="#d8a97f"/><path d="M17 20c6-12 28-13 34 0l-8-2H23z" fill="#292133"/><circle cx="27" cy="25" r="2" fill="#8cff9d"/><circle cx="36" cy="25" r="2" fill="#8cff9d"/><path d="M16 58c2-14 9-20 16-20s14 6 17 20" fill="#243d30"/><path d="M44 37l7 17H38z" fill="#b9ff73" opacity=".75" stroke="#efffcf"/><path d="M43 36h6v5h-6z" fill="#dfe8e4"/><circle cx="12" cy="15" r="4" fill="#db69ff" opacity=".8"/><circle cx="54" cy="19" r="3" fill="#77ffab" opacity=".9"/></svg>`;};

  // Combat-kind metadata remains available to existing final-combat routing.
  // Board 5 terminal ownership was retired: Board 5 advances into Board 6.
  let v16CombatKind=null;
  const startCombatV16Base=startCombat;startCombat=function(kind="normal"){v16CombatKind=kind;return startCombatV16Base(kind);};
  const winCombatV16Base=winCombat;
  winCombat=async function(){const result=await winCombatV16Base();restoreRadiationDefenseV16();return result;};
  // ---- Info additions -------------------------------------------------------

  try{Object.defineProperty(window,"DiceboundV16Regression",{value:{
    state:()=>({boardLevel,gameStarted,runFinalized,playerClass:player.classId,gold:player.gold,gear:EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]?.name).filter(Boolean),endVisible:!$("endOverlay").classList.contains("hidden"),powerVisible:!$("powerupOverlay").classList.contains("hidden")}),
    prepareSovereign:()=>{boardLevel=4;gameStarted=true;player.gold=99999;currentMerchantNotice="";currentMerchantItems=[{id:"relic",icon:"👑",name:"Sovereign Relic",desc:"Choose one of three random Legendary powerups.",base:1,sold:false,alphaChooseLegendary:true,buy(){return null;}}];$("merchantOverlay").classList.remove("hidden");renderMerchant();return true;},
    prepareAlchemist:()=>{meta.stats.potionsUsed=100;checkDynamicClassUnlocks();renderClassChoices();return isClassUnlocked("alchemist");},
    forceFifthWin:async()=>{gameStarted=true;runFinalized=false;boardLevel=5;player.position=0;player.gold=0;player.level=1;player.xp=0;player.xpNext=20;player.equipment=player.equipment||{};player.equipment.ring=generateMythicalRing();generateBoard();player.position=tiles.length-1;currentEnemyTile=tiles.length-1;const e={name:"Regression Ring Tyrant",icon:"💍🐉",hp:0,maxHp:1,attack:1,defense:0,xp:0,gold:0,finalBoss:true,boss:true,guardian:true};currentEnemies=[e];currentEncounterLead=e;currentEnemy=e;v16CombatKind="final";const oldRandom=Math.random;Math.random=()=>1;try{await winCombat();await new Promise(r=>setTimeout(r,80));return {boardLevel,gameStarted,runFinalized,gear:player.equipment.ring?.name,endVisible:!$("endOverlay").classList.contains("hidden")};}finally{Math.random=oldRandom;}}
  },enumerable:false,configurable:false,writable:false});}catch(e){}

  saveMeta();checkDynamicClassUnlocks();renderClassChoices();renderInfo();refreshDebugButtons();updateHUD();


  saveMeta();checkDynamicClassUnlocks();refreshDebugButtons();renderClassChoices();renderInfo();

  // Refresh visible UI once the new identity/art layer is active.
  renderClassChoices();
  renderInfo();


  /* SEMANTIC OWNER — Late class mechanics, talents, Ouroboros and meta progression. Migrated from the retired Alpha legacy stack in 3.1.6. */
  /* ---------- Alpha v1.7: late-road curve, pet bonds, ninja smoke & reliable relic choices ---------- */
  document.title=`Dicebound: Alpha v1.9 — ${pick([
    "the wheel finally understands inflation",
    "ninjas are now legally made of smoke",
    "the bloodwell icon knows something you do not",
    "late roads have been put back in numerical order",
    "summoners brought visual paperwork"
  ])}`;

  const v17Style=document.createElement("style");
  v17Style.textContent=`
    .summoner-spirit-row{display:flex;justify-content:center;gap:5px;min-height:28px;margin:-2px auto 7px;flex-wrap:wrap}
    .summoner-spirit-token{font-size:21px;line-height:1;padding:3px 5px;border-radius:999px;background:rgba(121,93,210,.16);border:1px solid rgba(181,155,255,.22);filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))}
    #bloodwellOverlay .start-art.bloodmage-secret-ready{cursor:pointer;filter:drop-shadow(0 0 12px rgba(255,55,92,.38));transition:.16s ease}
    #bloodwellOverlay .start-art.bloodmage-secret-ready:hover{transform:scale(1.08);filter:drop-shadow(0 0 20px rgba(255,55,92,.66))}
    .poison-count-compact{font-weight:950;color:#a9f08b;letter-spacing:-.02em}
  `;document.head.appendChild(v17Style);

  // ---- Pet bond scaling ----------------------------------------------------
  function v17PetBondLevel(id){return Math.max(1,Number(meta.pets?.[id]?.level)||1);}
  function v17PetBonusScale(id){return 1+Math.min(.50,Math.floor((v17PetBondLevel(id)-1)/5)*.08);}
  function v17PetDamageExtra(id){return id&&id!=="neutral"?2+Math.floor((v17PetBondLevel(id)-1)/10):0;}
  function v17PetBonusText(id){const b=PET_STAT_BONUSES[id],lv=v17PetBondLevel(id),scale=v17PetBonusScale(id);if(!b)return `Bonus: +${v17PetDamageExtra(id)} base pet damage · Bond Lv ${lv}`;return `Bonus: +${v17PetDamageExtra(id)} base pet damage · ${b.label} (${Math.round(scale*100)}% bond scaling) · Bond Lv ${lv}`;}
  // Replace the v1.6 flat active-pet bonus with a slowly bond-scaled version.
  syncActivePetBonusV16=function(force=false){if(!gameStarted&&!force)return;const next=meta.activePet||"neutral",prev=player._activePetBonusId,prevScale=player._v17PetBonusScale||1;if(prev&&prev!=="neutral"&&PET_STAT_BONUSES[prev]){const b=PET_STAT_BONUSES[prev];if(prev==="donut"){player.maxHp=Math.max(1,player.maxHp-3*prevScale);player.hp=Math.min(player.hp,player.maxHp);player.potionPower-=.05*prevScale;}else b.remove(b.v*prevScale);}player._activePetBonusId=next;player._v17PetBonusScale=v17PetBonusScale(next);if(next!=="neutral"&&PET_STAT_BONUSES[next]){const b=PET_STAT_BONUSES[next],scale=player._v17PetBonusScale;if(next==="donut"){player.maxHp+=3*scale;player.hp+=3*scale;player.potionPower+=.05*scale;}else b.apply(b.v*scale);}};
  const petDamageV17Base=petDamage;petDamage=function(){const current=petDamageV17Base(),id=meta.activePet||"neutral";return current+(id!=="neutral"?(v17PetDamageExtra(id)-2):0);};
  if(typeof trainerPetDamage==="function"){const trainerPetDamageV17Base=trainerPetDamage;trainerPetDamage=function(id){return trainerPetDamageV17Base(id)+(id&&id!=="neutral"?Math.max(0,v17PetDamageExtra(id)-2):0);};}

  // ---- Guardian elemental Guard talent + Turtle/Slime powerup -------------
  const resonantTalent=talents.find(t=>t.id==="turtle_guard_element");if(resonantTalent){resonantTalent.name="Resonant Carapace";resonantTalent.desc="Each rank gives Guardian-tagged classes a 5% chance to trigger an elemental proc whenever they Guard.";resonantTalent.maxRank=3;}
  if(!upgrades.some(u=>u.id==="reactive_carapace"))upgrades.push({id:"reactive_carapace",classIds:["turtle","slime"],rarity:"rare",icon:"🐢🌈",name:"Reactive Carapace",desc:"Guard gains +12% chance to trigger an elemental proc.",tags:["guardian","elemental"],apply(){player.guardElementProcBonus=(player.guardElementProcBonus||0)+.12;}});
  const identityGuardActionV17Base=identityGuardAction;identityGuardAction=async function(){const tags=CLASSES[classIdentityId()]?.tags||[],rank=gameplayTalentRank("turtle_guard_element"),chance=(tags.includes("guardian")?rank*.05:0)+((classIdentityActive("turtle")||classIdentityActive("slime"))?(player.guardElementProcBonus||0):0);if(chance&&currentEnemy?.hp>0&&random()<clamp(chance,0,.75)){const key=player.equipment?.weapon?.element||activePetDef().element||pick(ELEMENT_KEYS);const r=triggerElementEffect(key,currentEnemy,{forced:true,source:"Resonant Guard"});if(r)addCombatHistory(`🌈 Resonant Guard: ${r.message}`);}return identityGuardActionV17Base();};

  // ---- Potion / Echo tooltips ----------------------------------------------
  const updateCombatUIV17Base=updateCombatUI;updateCombatUI=function(){updateCombatUIV17Base();const p=$("potionBtn");if(p)p.dataset.tip=`Consume ${player.doublePotionTurn?'up to 2 potions before the enemy responds':'1 potion'} to restore ${v16PotionHealValue()} HP each. Current Potion Healing bonus: +${Math.round((player.potionPower||0)*100)}%. Base formula: 10 + 10% max HP.${player.doublePotionTurn?' Double Dose only consumes the second potion if you are still injured.':''}`;const e=$("echoText");if(e){const scale=Math.round((player.echoDamageScale||.70)*100);e.title=`${Math.round(player.doubleStrike*100)}% Echo Strike chance. Each Echo currently deals ${scale}% of normal strike damage.${scale>70?` (${scale-70}% points above the normal 70% Echo damage.)`:""}`;const box=e.closest(".stat");if(box)box.title=e.title;}v17RenderSummonerSpirits();v17CompactPoisonMarkers();};

  // ---- Reliable Legendary choice flow -------------------------------------
  function v17LegendaryPool(){return eligibleUpgrades(u=>u.rarity==="legendary");}
  function v17LegendaryChoices(){const pool=[...v17LegendaryPool()],out=[];while(pool.length&&out.length<3){const i=rand(0,pool.length-1);out.push(pool.splice(i,1)[0]);}return out;}
  function v17OpenLegendaryChoice(source,onComplete=()=>{}){$("powerupTitle").textContent=source;$('powerupSubtitle').textContent="Choose one of three Legendary powers. The purchase is already paid for.";const grid=$("powerupGrid");grid.innerHTML="";const choices=v17LegendaryChoices();if(!choices.length){const d=document.createElement("div");d.className="merchant-notice show";d.innerHTML="No eligible Legendary powers remain for this class this run. The contract refunds 100% of its price.";grid.appendChild(d);$("powerupOverlay").classList.remove("hidden");setTimeout(()=>{$("powerupOverlay").classList.add("hidden");onComplete(false);},650);return;}choices.forEach(up=>{const btn=document.createElement("button");btn.className=`choice-btn legendary`;btn.innerHTML=choiceHTML(up);btn.addEventListener("click",()=>{applyUpgrade(up,source);addLog(`<b>${source}:</b> chose <b>${up.name}</b>.`);showToast(`Legendary: ${up.name}`);$("powerupOverlay").classList.add("hidden");updateHUD();onComplete(up);});grid.appendChild(btn);});$("merchantOverlay")?.classList.add("hidden");$("powerupOverlay").classList.remove("hidden");}
  renderMerchant=function(){$("merchantGold").textContent=player.gold;const notice=$("merchantNotice");notice.classList.toggle("show",!!currentMerchantNotice);notice.innerHTML=currentMerchantNotice;const grid=$("shopGrid");grid.innerHTML="";currentMerchantItems.forEach(item=>{const price=merchantPrice(item.base),btn=document.createElement("button");btn.className=`shop-item${item.sold?" sold":""}`;btn.disabled=item.sold||player.gold<price;const comparison=item.gear?`<div class="shop-compare">${formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:"";btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${item.sold?"SOLD":price+"g"}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;btn.addEventListener("click",()=>{if(item.sold||player.gold<price)return;if(item.gear){const current=player.equipment[item.gear.slot];if(current&&gearPowerScore(item.gear)<gearPowerScore(current)&&!window.DiceboundPlatform.confirm(`${item.gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`))return;}player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);const chooser=item.alphaChooseLegendary||(/Sovereign Relic|Legendary Contract/i.test(item.name||""));if(chooser){currentMerchantNotice=`👑 <b>${item.name} purchased.</b> Choose one Legendary power.`;renderMerchant();v17OpenLegendaryChoice(item.name,chosen=>{if(!chosen){player.gold+=price;item.sold=false;currentMerchantNotice=`👑 No eligible Legendary remained, so ${price} gold was refunded.`;}else currentMerchantNotice=`👑 <b>${item.name} claimed:</b> ${chosen.name}.`;$("merchantOverlay").classList.remove("hidden");updateHUD();renderMerchant();});return;}const result=item.buy?.();if(item.id==="relic"&&result)currentMerchantNotice=`🔮 <b>Relic opened:</b> ${rarityInfo[result.rarity].label} <b>${result.name}</b><br>${result.desc}`;else if(item.gear)currentMerchantNotice=`🧰 Equipped <b>${item.gear.name}</b>.<br>${formatBonuses(item.gear)}`;if(["attack","armor","charm"].includes(item.id))recordRunBuff(item.icon,item.name,item.desc,"merchant","Merchant");showToast(item.id==="relic"&&result?`${rarityInfo[result.rarity].label}: ${result.name}`:item.name);updateHUD();renderMerchant();});grid.appendChild(btn);});};

  // ---- Wheel scales with road depth ---------------------------------------
  function v17WheelScale(){return 1+(boardLevel-1)*.24+(player.position/Math.max(1,currentTileCount()-1))*.16;}
  const wGold=wheelRewards.find(x=>x.name==="Golden Rain");if(wGold)wGold.apply=function(){const g=modifiedGold(Math.round(70*v17WheelScale()));player.gold+=g;return `The wheel grants ${g} gold.`;};
  const wRest=wheelRewards.find(x=>x.name==="Restoration");if(wRest)wRest.apply=function(){const sc=v17WheelScale();if(player.hp>=player.maxHp){const hp=Math.max(10,Math.round(10*sc));player.maxHp+=hp;player.hp+=hp;return `Full health converts Restoration into +${hp} max HP.`;}const heal=Math.min(player.maxHp-player.hp,Math.ceil(player.maxHp*Math.min(.85,.50+.06*boardLevel)));player.hp+=heal;return `The wheel restores ${heal} HP.`;};
  const wCookie=wheelRewards.find(x=>x.name==="Companion Cookie");if(wCookie)wCookie.apply=function(){const n=1+Math.floor((boardLevel-1)/2);meta.petCookies+=n;saveMeta();return `${n} permanent pet cookie${n===1?"":"s"} drop for ${activePetDef().name}.`;};
  const wAtk=wheelRewards.find(x=>x.name==="Sharpened Fate");if(wAtk)wAtk.apply=function(){const n=2+Math.floor((boardLevel-1)/2);player.attack+=n;return `Gain +${n} attack for this run.`;};
  const wGift=wheelRewards.find(x=>x.name==="Rare Gift");if(wGift)wGift.apply=function(){const filter=boardLevel>=5?(u=>u.rarity==="legendary"):boardLevel>=3?(u=>u.rarity==="epic"||u.rarity==="legendary"):(u=>u.rarity==="rare"||u.rarity==="epic"||u.rarity==="legendary"),pool=eligibleUpgrades(filter),up=pool.length?pick(pool):applyRandomHighRarity();if(pool.length)applyUpgrade(up,"Wheel of Fortune");return `The wheel reveals ${rarityInfo[up.rarity].label} ${up.name}: ${up.desc}`;};
  const wPots=wheelRewards.find(x=>x.name==="Alchemist's Bundle");if(wPots)wPots.apply=function(){const n=3+Math.floor((boardLevel-1)*1.5);player.potions+=n;return `Gain ${n} potions.`;};
  const wLuck=wheelRewards.find(x=>x.name==="Lucky Star");if(wLuck)wLuck.apply=function(){const c=.08+(boardLevel-1)*.012,l=.08+(boardLevel-1)*.015;player.crit+=c;player.luck+=l;return `Gain +${Math.round(c*100)}% Crit and +${Math.round(l*100)} Luck.`;};

  // ---- Explicit late-road difficulty curve --------------------------------
  const scaleEnemyV17Base=scaleEnemy;scaleEnemy=function(base,kind="normal",packSize=1){const e=scaleEnemyV17Base(base,kind,packSize),mods={2:[1.04,1.03,0],3:[1.05,1.04,0],4:[1.16,1.11,2],5:[1.34,1.22,4]}[boardLevel];if(mods){e.hp=Math.round(e.hp*mods[0]);e.maxHp=e.hp;e.attack=Math.round(e.attack*mods[1]);e.defense+=mods[2];}return e;};
  // Soften the historical Board-4-only overboost by compensating it, then let v1.7's monotonic layer rebuild the curve.
  const scaleEnemyV17Normalized=scaleEnemy;scaleEnemy=function(base,kind="normal",packSize=1){const e=scaleEnemyV17Normalized(base,kind,packSize);if(boardLevel===4){e.hp=Math.max(1,Math.round(e.hp/1.85));e.maxHp=e.hp;e.attack=Math.max(1,Math.round(e.attack/1.55));}return e;};

  // ---- Ninja Smoke ---------------------------------------------------------
  if(!upgrades.some(u=>u.id==="ninja_smoke_step"))upgrades.push({id:"ninja_smoke_step",classId:"ninja",rarity:"epic",unique:true,icon:"🌫️🥷",name:"Vanishing Point",desc:"Unique: Smoke Execution needs one fewer Smoke stack.",tags:["dodgy","precision","unique"],apply(){player.ninjaSmokeNeed=2;player.ninjaSmoke=Math.min(player.ninjaSmoke||0,2);}});
  const resetPlayerV17Base=resetPlayer;resetPlayer=function(classId=selectedClassId){resetPlayerV17Base(classId);player.ninjaSmokeNeed=3;player.guardElementProcBonus=0;};
  const performStrikeV17Base=performStrike;performStrike=async function(target,opts={}){const before=player.ninjaSmoke||0,result=await performStrikeV17Base(target,opts);if(classIdentityActive("ninja")&&result?.crit){const need=player.ninjaSmokeNeed||3;if(opts.echo){player.ninjaSmoke=Math.min(need,(player.ninjaSmoke||0)+1);if(player.ninjaSmoke!==before)identityFlash(`🌫️ Smoke ${player.ninjaSmoke}/${need}`);}if((player.ninjaSmoke||0)>=need)identityFlash("🌫️ Smoke Execution ready");updateCombatUI();}return result;};
  const useUltimateV17Base=useUltimate;useUltimate=async function(){const ninja=classIdentityActive("ninja"),before=ninja?(player.ninjaSmoke||0):0,r=await useUltimateV17Base();if(ninja){const need=player.ninjaSmokeNeed||3;player.ninjaSmoke=Math.min(need,before+5);addCombatHistory(`🌘 Thousand Shadows' five guaranteed critical strikes build Smoke to ${player.ninjaSmoke}/${need}.`);updateCombatUI();}return r;};
  const updateCombatUIV17SmokeBase=updateCombatUI;updateCombatUI=function(){updateCombatUIV17SmokeBase();if(classIdentityActive("ninja"))setResourceUI("smoke","Smoke",player.ninjaSmoke||0,player.ninjaSmokeNeed||3,`Every critical strike — including critical Echoes — grants 1 Smoke. At ${player.ninjaSmokeNeed||3}, the next basic strike ignores Defense and is empowered.`);};

  // ---- Prismatic Birthright runtime migration -----------------------------
  const prismaticTalent=talents.find(t=>t.id==="element_prismatic");if(prismaticTalent){prismaticTalent.cost=2;prismaticTalent.maxRank=3;prismaticTalent.desc="Start each run with an elemental class weapon unless an heirloom weapon replaces it. Rank 1 Common · Rank 2 Uncommon · Rank 3 Rare.";prismaticTalent.requires=[req("element_attunement",2)];}

  // ---- Poison marker compacting -------------------------------------------
  function v17CompactPoisonMarkers(){document.querySelectorAll('.stage-enemy').forEach(el=>{const i=Number(el.dataset.enemyIndex),enemy=currentEnemies[i];if(!enemy)return;const n=enemy.poisonStacks||0,host=el.querySelector('.stage-mini-status')||el;host.querySelectorAll('.v17-poison-count').forEach(x=>x.remove());if(n<10)return;host.querySelectorAll('.status-dot.poison').forEach(x=>x.remove());const badge=document.createElement('span');badge.className='v17-poison-count poison-count-compact';badge.textContent=`${n}×☠️`;badge.title=`${n} Poison stacks`;host.appendChild(badge);});}
  const renderEnemyPartyV17Base=renderEnemyParty;renderEnemyParty=function(){renderEnemyPartyV17Base();v17CompactPoisonMarkers();};

  // ---- Camp full-health consolation ---------------------------------------
  useCamp=function(){const tile=tiles[player.position];if(player.hp>=player.maxHp){tile.cleared=true;tile.type="empty";refreshTile(player.position);const pool=eligibleUpgrades(u=>u.rarity==="common"||u.rarity==="uncommon");if(pool.length){const up=pick(pool);applyUpgrade(up,"Campfire Inspiration");sfx.holy();addLog(`<b>Camp:</b> Already fully rested, so the quiet fire grants <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);showToast(`🔥 ${up.name}`);}else{player.maxHp+=5;player.hp+=5;showToast("🔥 +5 max HP");}updateHUD();returnToRoad();return;}const heal=Math.max(1,Math.round(player.maxHp*.38)),actual=Math.min(heal,player.maxHp-player.hp);player.hp+=actual;tile.cleared=true;tile.type="empty";refreshTile(player.position);sfx.heal();addLog(`Rested by the fire and recovered <b>${actual} HP</b>.`);showToast(`Recovered ${actual} HP`);returnToRoad();};

  // ---- Bloodmage secrecy + boss tuning ------------------------------------
  const openBloodwellV17Base=openBloodwell;openBloodwell=function(){openBloodwellV17Base();const grid=$("bloodwellGrid"),old=grid?.querySelector('[data-bloodmage]');if(old)old.remove();const art=$("bloodwellOverlay")?.querySelector('.start-art');if(!art)return;art.classList.toggle('bloodmage-secret-ready',(meta.merchantKills||0)>=1);art.title=(meta.merchantKills||0)>=1?"The blood icon seems to be watching you.":"";if((meta.merchantKills||0)>=1&&!art.dataset.v17Bloodmage){art.dataset.v17Bloodmage="1";art.addEventListener('click',()=>{if((meta.merchantKills||0)<1||$("bloodwellOverlay").classList.contains("hidden"))return;$("bloodwellOverlay").classList.add("hidden");startCombat("bloodmage");});}};
  const startCombatV17Base=startCombat;startCombat=function(kind="normal"){const r=startCombatV17Base(kind);if(kind==="bloodmage"&&currentEnemy){currentEnemies.forEach(e=>{e.hp=Math.round(e.hp*1.42);e.maxHp=e.hp;e.attack=Math.round(e.attack*1.16);e.defense=(e.defense||0)+3;e.enemyBarrier=(e.enemyBarrier||0)+2;});renderEnemyParty();updateCombatUI();addCombatHistory("🩸 The Bloodmage is stronger than the Merchant who revealed the path to this fight.");}return r;};

  // ---- D20: show the roll, pause, then let the calling attack resolve ------
  const rollD20ChaosV17Base=rollD20Chaos;rollD20Chaos=async function(action){const out=await rollD20ChaosV17Base(action);if(classIdentityActive("d20")&&out?.roll){setCombatText(`🎲 ${action.toUpperCase()} ROLL: ${out.roll}/20 — ${d20ResultTitle(out.roll)}. Resolving...`);await delay(300);}return out;};

  // ---- More Mana augments --------------------------------------------------
  [
    {id:"mana_deep_reservoir",classIds:["sorcerer","vampire","rouge","merchant","summoner"],rarity:"uncommon",icon:"🔷",name:"Deep Reservoir",desc:"+25 max Mana and restore 25 Mana immediately.",tags:["mana","occult"],apply(){player.maxMana=(player.maxMana||0)+25;player.mana=Math.min(player.maxMana,(player.mana||0)+25);}},
    {id:"mana_quick_channel",classIds:["sorcerer","vampire","rouge","merchant","summoner"],rarity:"rare",icon:"⚡🔮",name:"Quick Channel",desc:"Mana-building attacks generate +8 Mana.",tags:["mana","tempo"],apply(){player.manaBuilderBonus=(player.manaBuilderBonus||0)+8;}},
    {id:"mana_overflow",classIds:["sorcerer","vampire","rouge","merchant","summoner"],rarity:"epic",icon:"🌊🔮",name:"Arcane Overflow",desc:"+35 max Mana. Spending Mana grants 8 Ultimate charge.",tags:["mana","ultimate"],apply(){player.maxMana=(player.maxMana||0)+35;player.mana=Math.min(player.maxMana,(player.mana||0)+35);player.manaSpendUltimate=(player.manaSpendUltimate||0)+8;}}
  ].forEach(u=>{if(!upgrades.some(x=>x.id===u.id))upgrades.push(u);});
  const occultChannelAttackV17Base=occultChannelAttack;occultChannelAttack=async function(){const cfg=OCCULT_SPELLS[classIdentityId()],bonus=player.manaBuilderBonus||0;if(!cfg||!bonus)return occultChannelAttackV17Base();const old=cfg.gain;cfg.gain+=bonus;try{return await occultChannelAttackV17Base();}finally{cfg.gain=old;}};
  const occultSpellAttackV17Base=occultSpellAttack;occultSpellAttack=async function(){const before=player.mana||0,r=await occultSpellAttackV17Base();if(player.manaSpendUltimate&&player.mana<before){player.ultimateCharge=clamp(player.ultimateCharge+player.manaSpendUltimate,0,100);updateCombatUI();}return r;};

  // ---- Summoner spirits become visible in combat --------------------------
  function v17RenderSummonerSpirits(){let row=$("v17SummonerSpirits");if(!classIdentityActive("summoner")){row?.remove();return;}if(!row){row=document.createElement('div');row.id='v17SummonerSpirits';row.className='summoner-spirit-row';const pet=$("combatPet");pet?.parentElement?.insertBefore(row,pet.nextSibling);}const ids=player.summonerSpirits||[];row.innerHTML=ids.map(id=>`<span class="summoner-spirit-token" title="${PETS[id]?.name||id}">${PETS[id]?.icon||"🐾"}</span>`).join('');}

  // ---- Toxic Bloom wording -------------------------------------------------
  const toxic=upgrades.find(u=>u.name==="Toxic Bloom");if(toxic)toxic.desc="Nature activation adds one more poison proc, and Poison deals +3% Attack per stack.";


  // ---- v1.7 final consistency fixes --------------------------------------
  // Mana-spend augments also apply to the Summoner's bespoke Conjure action.
  const summonerConjureV17ManaBase=summonerConjure;
  summonerConjure=async function(){
    const beforeMana=classIdentityActive("summoner")?(player.mana||0):0;
    const out=await summonerConjureV17ManaBase();
    if(classIdentityActive("summoner")&&beforeMana>(player.mana||0)&&(player.manaSpendUltimate||0)){
      player.ultimateCharge=clamp((player.ultimateCharge||0)+player.manaSpendUltimate,0,100);
      addCombatHistory(`✨ Arcane Overflow converts the Mana spend into +${player.manaSpendUltimate} Ultimate.`);
      updateCombatUI();
    }
    return out;
  };

  // Status-dot rendering itself knows how to collapse double-digit poison counts.
  statusDotsHTML=function(barriers=0,poison=0,affinity=null){
    let html="";
    for(let i=0;i<Math.min(12,barriers||0);i++)html+='<i class="status-dot barrier" title="Barrier"></i>';
    if((poison||0)>=10)html+=`<span class="v17-poison-count poison-count-compact" title="${poison} Poison stacks">${poison}×☠️</span>`;
    else for(let i=0;i<(poison||0);i++)html+='<i class="status-dot poison" title="Poison stack"></i>';
    if(affinity&&ELEMENTS[affinity])html+=`<i class="status-dot element" title="${ELEMENTS[affinity].name} affinity">${ELEMENTS[affinity].icon}</i>`;
    return html;
  };

  // Hidden regression helpers: these never appear in the player UI/debug menu.
  Object.defineProperty(window,"DiceboundV17Regression",{configurable:true,value:{
    prepareSovereign:()=>{player.gold=99999;currentMerchantItems=[{id:"v17_sovereign_test",icon:"👑",name:"Sovereign Relic",desc:"Choose from three random Legendary powerups.",base:1,sold:false,alphaChooseLegendary:true,buy(){return null;}}];$("merchantOverlay").classList.remove("hidden");renderMerchant();return true;},
    prepareContract:()=>{player.gold=99999;currentMerchantItems=[{id:"v17_contract_test",icon:"📜",name:"Tyrant's Legendary Contract",desc:"Choose from three random Legendary powerups.",base:1,sold:false,alphaChooseLegendary:true,buy(){return null;}}];$("merchantOverlay").classList.remove("hidden");renderMerchant();return true;},
    legendaryState:()=>({merchantHidden:$("merchantOverlay").classList.contains("hidden"),powerupVisible:!$("powerupOverlay").classList.contains("hidden"),choices:$("powerupGrid").querySelectorAll("button.choice-btn").length,subtitle:$("powerupSubtitle").textContent}),
    difficulty:(level=10)=>{const saveBoard=boardLevel,saveLevel=player.level;player.level=level;const out={};for(const b of [2,3,4,5]){boardLevel=b;const e=scaleEnemy({name:"Regression Enemy",icon:"👾",hp:50,attack:10,xp:1,gold:1,weakness:"fire"},"normal",1);out[b]={hp:e.maxHp,attack:e.attack,defense:e.defense||0};}boardLevel=saveBoard;player.level=saveLevel;return out;},
    bossDifficulty:(level=10)=>{const saveBoard=boardLevel,saveLevel=player.level;player.level=level;const defs={2:{name:"Astral Devourer Dragon",hp:74,attack:16,weakness:"donut"},3:{name:"Nullstar Hydra",hp:112,attack:24,weakness:"light"},4:{name:"Crown-Eater",hp:162,attack:31,weakness:"nature"},5:{name:"Ring Tyrant of the Fifth Road",hp:248,attack:44,weakness:"radiation"}};const out={};for(const b of [2,3,4,5]){boardLevel=b;const e=scaleEnemy({...defs[b],icon:"👑",xp:1,gold:1},"final",1);out[b]={hp:e.maxHp,attack:e.attack,defense:e.defense||0};}boardLevel=saveBoard;player.level=saveLevel;return out;}
  }});


  /* ========================================================================
     Alpha v1.8 — Identity, tooltip and reliability pass
     ------------------------------------------------------------------------
     This section intentionally lives as a documented compatibility layer on
     top of the older Alpha systems. The project has grown through many small
     versions, so keeping the newest behavior together makes future audits much
     easier: each wrapper below states exactly which older behavior it extends.
     ======================================================================== */

  // ---- Live board-stat tooltips --------------------------------------------
  // Native `title` tooltips can cache stale text in Chromium/Edge. These CSS
  // tooltips read `data-tip` every time they are shown, so Potion/Defense/Echo
  // always reflect the current player state after gear, talents and powerups.
  const v18Style=document.createElement("style");
  v18Style.textContent=`
    .stat.v18-stat-tooltip{position:relative;cursor:help;overflow:visible}
    .stat.v18-stat-tooltip:hover::after,.stat.v18-stat-tooltip:focus-within::after{
      content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 8px);
      transform:translateX(-50%);width:250px;padding:9px 11px;border-radius:10px;
      background:#080d17;border:1px solid rgba(255,255,255,.16);color:#f5f1e8;
      font-size:10px;line-height:1.45;font-weight:650;z-index:120;
      box-shadow:0 12px 35px rgba(0,0,0,.52);pointer-events:none;text-transform:none;
      letter-spacing:normal;text-align:left;
    }
    .achievement-reward{display:block;margin-top:5px;color:#ffe59a;font-size:9px;font-weight:900}
    .attack-fx.ouroboros{opacity:1;animation:echoSlash .56s ease-out forwards;font-size:46px;filter:drop-shadow(0 0 20px #9df26d)}
    .attack-fx.ultimate-ouroboros{opacity:1;animation:ultimateSorcerer .9s ease-in forwards;font-size:78px;filter:drop-shadow(0 0 30px #bfff79)}
  `;
  document.head.appendChild(v18Style);

  function v18PotionTooltip(){
    const heal=v16PotionHealValue();
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
  CLASSES.ouroboros={
    id:"ouroboros",secret:true,name:"Ouroboros",icon:"🐍♾️",attackIcon:"🐍",fxIcon:"♾️🐍",
    unlock:"Secret: reach 400% Echo Strike during a run",
    desc:"A recursive serpent that refuses normal Attack scaling. Attack is fixed at 10; every point of Attack gained or lost becomes 10% Echo Strike instead. Its best powers turn absurd Echo into poison and elemental recursion.",
    stats:"42 HP · 10 STATIC ATK · 120% ECHO · 8% CRIT",
    scaleNotes:"Attack cannot move from 10. Attack bonuses convert into Echo Strike at 10% per point; Echo, Poison and elemental effects are the real scaling engines.",
    ultimate:{name:"Infinite Return",icon:"♾️☠️",desc:"A chain of serpent strikes whose hit count scales with Echo Strike. Every hit adds Poison and can bounce through the pack."},
    base:{maxHp:42,attack:10,defense:2,crit:.08,dodge:.06,luck:.04,doubleStrike:1.20,guardPower:.56,classBurst:.14,lifeSteal:.04}
  };
  CLASS_TAGS.ouroboros=["secret","weird","echo","poison","elemental","dodgy"];
  CLASSES.ouroboros.tags=CLASS_TAGS.ouroboros;
  gearNames.weapon.ouroboros=["Tailbite Fang","Recursive Fang","Serpent Loopblade"];
  gearNames.offhand.ouroboros=["Shed Scale","Venom Ouroboros Idol","Looped Egg"];
  for(const slot of ["boots","legs","chest","hat","ring","amulet"]){
    gearNames[slot]=gearNames[slot]||{};gearNames[slot].ouroboros=[`Recursive ${SLOT_LABELS[slot]}`];
  }

  const ouroborosPowers=[
    {id:"ouro_venom_coil",classId:"ouroboros",rarity:"rare",icon:"🐍☠️",name:"Venom Coil",desc:"Gain +35% Echo Strike, +15% Poison-on-hit chance and +4% Attack damage per Poison stack.",tags:["echo","poison"],apply(){player.doubleStrike+=.35;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.15;player.poisonStackPower=(player.poisonStackPower||.12)+.04;}},
    {id:"ouro_irradiated_molt",classId:"ouroboros",rarity:"rare",icon:"☢️🐍",name:"Irradiated Molt",desc:"Gain +25% Echo Strike, +10% elemental activation and +15% Element Power.",tags:["echo","elemental"],apply(){player.doubleStrike+=.25;player.elementProcBonus+=.10;player.elementDamageBonus+=.15;}},
    {id:"ouro_recursive_toxin",classId:"ouroboros",rarity:"epic",icon:"♾️☠️",name:"Recursive Toxin",desc:"Gain +60% Echo Strike. Poison gains +8% Attack damage per stack and Echoes gain +12% Poison chance.",tags:["echo","poison"],apply(){player.doubleStrike+=.60;player.poisonStackPower=(player.poisonStackPower||.12)+.08;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.12;}},
    {id:"ouro_elemental_molting",classId:"ouroboros",rarity:"epic",icon:"🌈🐍",name:"Elemental Molting",desc:"Gain +40% Echo Strike, +20% Element Power and 6% chance for attacks to trigger an additional random element.",tags:["echo","elemental"],apply(){player.doubleStrike+=.40;player.elementDamageBonus+=.20;player.omniElementChance=(player.omniElementChance||0)+.06;}},
    {id:"ouro_tail_world",classId:"ouroboros",rarity:"legendary",unique:true,icon:"👑♾️",name:"The Tail Devours the World",desc:"Gain +100% Echo Strike. Poison gains +15% Attack damage per stack, +20% Poison-on-hit and +10% random-element chance.",tags:["echo","poison","elemental","legendary"],apply(){player.doubleStrike+=1;player.poisonStackPower=(player.poisonStackPower||.12)+.15;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.20;player.omniElementChance=(player.omniElementChance||0)+.10;}}
  ];
  ouroborosPowers.forEach(u=>{if(!upgrades.some(x=>x.id===u.id))upgrades.push(u);});

  // A one-copy identity power that complements the broader Endless Form talent.
  if(!upgrades.some(x=>x.id==="perfected_signature"))upgrades.push({
    id:"perfected_signature",rarity:"epic",unique:true,icon:"✨🧬",name:"Perfected Signature",
    desc:"Unique: sharply strengthens your current class's signature resource or technique.",
    apply(){
      const id=classIdentityId();
      if(id==="ranger")player.rangerMarkMax=(player.rangerMarkMax||3)+2;
      else if(id==="fighter")player.fighterCounterPowerBonus=(player.fighterCounterPowerBonus||0)+.30;
      else if(id==="monk")player.monkComboMax=(player.monkComboMax||5)+2;
      else if(id==="turtle")player.turtleGuardMax=(player.turtleGuardMax||5)+2;
      else if(id==="cleric")player.clericFaithGainBonus=(player.clericFaithGainBonus||0)+.35;
      else if(id==="summoner")player.summonerSpiritScale=(player.summonerSpiritScale||1)+.30;
      else if(id==="alchemist")player.alchemistFlaskBonus=(player.alchemistFlaskBonus||0)+.35;
      else if(MANA_OCCULT_CLASSES.has(id)){player.maxMana=(player.maxMana||0)+25;player.mana=Math.min(player.maxMana,(player.mana||0)+25);player.manaBuilderBonus=(player.manaBuilderBonus||0)+5;}
      else if(id==="ninja")player.ninjaSmokeNeed=Math.max(2,(player.ninjaSmokeNeed||3)-1);
      else {player.ultimateDamageBonus=(player.ultimateDamageBonus||0)+.25;player.elementDamageBonus=(player.elementDamageBonus||0)+.15;}
    }
  });

  // ---- Talent revisions and new fourth-choice node -------------------------
  const nuzzleTalent=talents.find(t=>t.id==="companion_recovery");
  if(nuzzleTalent)nuzzleTalent.desc="Your active pet restores 1 HP after each pet turn per rank.";
  const endlessTalent=talents.find(t=>t.id==="monk_flow_ceiling");
  if(endlessTalent){
    endlessTalent.name="Endless Form";
    endlessTalent.desc="Each rank improves many class signatures: Ranger Marks, Monk Combo, Turtle Guard chain, Fighter Counterblow power, Mana building, Cleric Faith gain, Summoner spirits and Alchemist flasks.";
  }
  if(!talents.some(t=>t.id==="fortune_extra_choice"))talents.push({
    id:"fortune_extra_choice",branch:"Fortune",icon:"🃏✨",name:"Expanded Horizons",cost:3,maxRank:1,
    desc:"Level-ups offer 4 powerup choices instead of 3.",requires:[req("fortune_powerup_rerolls",3)]
  });

  // ---- Per-run state and class-passive normalization -----------------------
  function v18SyncOuroborosAttack(){
    if(!classIdentityActive("ouroboros"))return;
    const delta=(Number(player.attack)||0)-10;
    if(Math.abs(delta)>.0001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=10;}
  }
  function v18SyncBloodmageHpPassive(initial=false){
    if(!classIdentityActive("bloodmage"))return;
    if(initial){
      const base=CLASSES.bloodmage.base.maxHp,bonus=Math.max(0,(player.maxHp||base)-base);
      if(bonus>0){player.maxHp+=bonus;player.hp+=bonus;}
      player._v18BloodmageMaxHp=player.maxHp;return;
    }
    const last=Number(player._v18BloodmageMaxHp||player.maxHp||0),now=Number(player.maxHp||0);
    if(now>last){const extra=now-last;player.maxHp+=extra;player.hp=Math.min(player.maxHp,player.hp+extra);}
    player._v18BloodmageMaxHp=player.maxHp;
  }
  const resetPlayerV18Base=resetPlayer;
  resetPlayer=function(classId=selectedClassId){
    resetPlayerV18Base(classId);
    const form=gameplayTalentRank("monk_flow_ceiling"),nuzzle=gameplayTalentRank("companion_recovery");
    // Healing Nuzzle used to be post-battle healing; remove that old contribution.
    player.postFightHeal=Math.max(0,(player.postFightHeal||0)-nuzzle);player.petTurnHeal=nuzzle;
    player.levelChoiceBonus=gameplayTalentRank("fortune_extra_choice");
    player.guardManaGain=6;
    player.fighterCounterPowerBonus=(player.fighterCounterPowerBonus||0)+form*.10;
    player.rangerMarkMax=(player.rangerMarkMax||3)+form;
    player.turtleGuardMax=(player.turtleGuardMax||5)+form;
    player.clericFaithGainBonus=(player.clericFaithGainBonus||0)+form*.15;
    player.manaBuilderBonus=(player.manaBuilderBonus||0)+(classHasMechanic("mana")?form*2:0);
    player.summonerSpiritScale=(player.summonerSpiritScale||1)+(classIdentityActive("summoner")?form*.10:0);
    player.alchemistFlaskBonus=(player.alchemistFlaskBonus||0)+(classIdentityActive("alchemist")?form*.10:0);
    player._v18BloodmageMaxHp=null;
    v18SyncBloodmageHpPassive(true);v18SyncOuroborosAttack();
  };

  // ---- Guard, Replenish and pet-turn behavior ------------------------------
  const identityGuardActionV18Base=identityGuardAction;
  identityGuardAction=async function(){
    if(classHasMechanic("mana")&&!combatBusy&&currentEnemy){const gained=manaGain(player.guardManaGain||6);if(gained){addCombatHistory(`🔷 Guard channels +${gained} Mana.`);identityFlash(`🛡️ +${gained} Mana`);}}
    return identityGuardActionV18Base();
  };

  // Replenish is a real defensive action now: the enemy response receives the
  // same `guarded=true` flag as Guard, so ordinary hits and guardian specials
  // are reduced by the Bloodmage's Guard Power after the mutual healing.
  bloodmageReplenish=async function(){
    if(combatBusy||!currentEnemy)return;combatBusy=true;player.combatActionCount++;
    const selfHeal=healPlayer(Math.ceil(player.maxHp*.16)),enemyHeal=Math.min(currentEnemy.maxHp-currentEnemy.hp,Math.ceil(currentEnemy.maxHp*.14));
    currentEnemy.hp+=enemyHeal;player.ultimateCharge=clamp(player.ultimateCharge+20,0,100);const ring=applyMythicRingPulse();
    setCombatText(`💉 Replenish restores ${selfHeal} HP to you and ${enemyHeal} HP to ${currentEnemy.name}, then braces like Guard.${ring?` ${ring}`:""}`);
    updateCombatUI();await delay(700);await resolveEnemyResponse(true);
  };

  // Exsanguinate keeps full damage on the selected enemy and splashes 65% of
  // the calculated hit into one additional living enemy when a pack is present.
  bloodmageExsanguinate=async function(){
    if(combatBusy||!currentEnemy)return;combatBusy=true;player.guardCooldown=0;player.combatAttackCount++;player.combatActionCount++;
    const paid=Math.max(1,Math.ceil(player.maxHp*.12));player.hp=Math.max(1,player.hp-paid);const chaos=await rollD20Chaos("attack");updateCombatUI();await animateClassAttack("crit");
    let damage=Math.round((player.attack*2.45+paid*1.9)*(chaos.mult||1)*(1+player.damageBonus+v19SetDamageBonus()));if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));
    const primary=currentEnemy,first=damageEnemy(primary,damage),second=livingEnemies().find(e=>e!==primary);let splash=0;if(second)splash=damageEnemy(second,Math.round(damage*.65));
    const ring=applyMythicRingPulse(),total=first+splash;setCombatText(`🩸 Exsanguinate spends ${paid} HP to deal ${first} to ${primary.name}${second?` and ${splash} to ${second.name}`:""} (${total} total).${ring?` ${ring}`:""}`);
    sfx.hit();updateCombatUI();await delay(820);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);
  };

  const petTurnV18Base=petTurn;
  petTurn=async function(){
    await petTurnV18Base();
    if((player.petTurnHeal||0)>0&&player.hp>0){const healed=healPlayer(player.petTurnHeal);if(healed)addCombatHistory(`💗 Healing Nuzzle restores ${healed} HP.`);updateCombatUI();}
  };

  // Conjure now immediately rallies the whole companion circle. The normal
  // active companion and every summoned spirit attack once with a modest
  // temporary empowerment before the enemy receives its response.
  summonerConjure=async function(){
    if(combatBusy||!currentEnemy||!classIdentityActive("summoner"))return;const cfg=OCCULT_SPELLS.summoner;if(player.mana<cfg.cost)return;
    combatBusy=true;const beforeMana=player.mana;player.mana-=cfg.cost;player.combatActionCount++;player.summonerSpirits=player.summonerSpirits||[];
    const cap=player.summonerCap||3,candidates=Object.keys(PETS).filter(id=>meta.pets?.[id]?.unlocked&&!player.summonerSpirits.includes(id)),pool=candidates.length?candidates:Object.keys(PETS).filter(id=>meta.pets?.[id]?.unlocked),id=pool.length?pick(pool):"neutral";
    if(player.summonerSpirits.length>=cap)player.summonerSpirits.shift();player.summonerSpirits.push(id);identityFlash(`🐾 Conjured ${PETS[id].name}`);
    if(player.manaSpendUltimate&&beforeMana>player.mana){player.ultimateCharge=clamp(player.ultimateCharge+player.manaSpendUltimate,0,100);addCombatHistory(`✨ Arcane Overflow converts the Mana spend into +${player.manaSpendUltimate} Ultimate.`);}
    setCombatText(`📖 Conjure calls ${PETS[id].icon} ${PETS[id].name}; the entire companion circle surges forward with empowered attacks.`);updateCombatUI();await delay(300);
    const oldPet=player.petDamageBonus||0,oldSpirit=player.summonerSpiritScale||1;player.petDamageBonus=oldPet+2;player.summonerSpiritScale=oldSpirit*1.20;
    try{await petTurn();}finally{player.petDamageBonus=oldPet;player.summonerSpiritScale=oldSpirit;}
    if(!livingEnemies().length)return winCombat();await delay(240);await resolveEnemyResponse(false);
  };

  // ---- Endless Form support hooks ------------------------------------------
  const performStrikeV18Base=performStrike;
  performStrike=async function(target,opts={}){
    const counterBoost=!opts.echo&&classIdentityActive("fighter")&&(player.fighterCounterStacks||0)>0?(player.fighterCounterPowerBonus||0):0;
    if(counterBoost)player.damageBonus+=counterBoost;
    try{return await performStrikeV18Base(target,opts);}finally{if(counterBoost)player.damageBonus-=counterBoost;}
  };
  const healPlayerV18Base=healPlayer;
  healPlayer=function(amount){
    const beforeFaith=player.clericFaith||0,healed=healPlayerV18Base(amount);
    if(classIdentityActive("cleric")&&healed>0&&player.clericFaithGainBonus){const baseAdded=Math.max(0,(player.clericFaith||0)-beforeFaith),extra=Math.round(baseAdded*player.clericFaithGainBonus);player.clericFaith=clamp((player.clericFaith||0)+extra,0,100);}
    return healed;
  };

  // ---- Level-up fourth choice ----------------------------------------------
  function v18LevelChoices(){
    const count=3+(player.levelChoiceBonus?1:0),pool=eligibleUpgrades(),choices=[];
    while(choices.length<count&&pool.length){const chosen=weightedUpgrade(pool);choices.push(chosen);pool.splice(pool.indexOf(chosen),1);}return choices;
  }
  openLevelUp=function(onComplete=null){
    sfx.level();const count=3+(player.levelChoiceBonus?1:0);$("levelSubtitle").textContent=pendingLevelUps>1?`Choose 1 of ${count} powerups. ${pendingLevelUps} levels are waiting.`:`Choose 1 of ${count} powerups for this run.`;
    const grid=$("choiceGrid");grid.innerHTML="";v18LevelChoices().forEach(up=>{const btn=document.createElement("button");btn.className=`choice-btn ${up.rarity}`;btn.innerHTML=choiceHTML(up);btn.addEventListener("click",()=>{applyUpgrade(up,"Level Up");pendingLevelUps--;addLog(`Level ${player.level}: gained <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);updateHUD();if(pendingLevelUps>0)openLevelUp(onComplete);else{$("levelOverlay").classList.add("hidden");if(onComplete)onComplete();else{rollLocked=false;updateHUD();}}});grid.appendChild(btn);});
    attachPowerupRerollV16(grid,()=>openLevelUp(onComplete));$("levelOverlay").classList.remove("hidden");
  };

  // ---- CEO wealth barriers --------------------------------------------------
  // Older logic grants the first barrier at 1,000 gold. These are additive
  // thresholds: a CEO entering combat with 25k starts with three total.
  const startCombatV18Base=startCombat;
  startCombat=function(kind="normal"){
    const out=startCombatV18Base(kind);
    if(classIdentityActive("ceo")&&currentEnemy){let extra=0;if(player.gold>=10000)extra++;if(player.gold>=25000)extra++;if(extra){player.combatShield=(player.combatShield||0)+extra;addCombatHistory(`📈 Executive liquidity adds ${extra} extra Barrier${extra===1?"":"s"} (${player.gold>=25000?"25,000+":"10,000+"} gold tier).`);updateCombatUI();}}
    return out;
  };

  // ---- Ouroboros ultimate ---------------------------------------------------
  const useUltimateV18Base=useUltimate;
  useUltimate=async function(){
    if(!classIdentityActive("ouroboros"))return useUltimateV18Base();
    if(combatBusy||!currentEnemy||player.ultimateCharge<100)return;combatBusy=true;player.guardCooldown=0;player.ultimateCharge=0;player.combatActionCount++;v18SyncOuroborosAttack();await animateUltimate();
    const hits=Math.min(14,4+Math.floor((player.doubleStrike||0)*1.5));let total=0;for(let i=0;i<hits&&livingEnemies().length;i++){const target=(i===0&&currentEnemy?.hp>0)?currentEnemy:pick(livingEnemies()),raw=Math.round(player.attack*(1.15+(player.doubleStrike||0)*.08)+rand(1,4));total+=damageEnemy(target,raw);target.poisonStacks=(target.poisonStacks||0)+1;await animateClassAttack(i?"echo":"normal");}
    setCombatText(`♾️☠️ Infinite Return loops ${hits} times for ${total} total damage and leaves one Poison stack per bite.`);sfx.crit();updateCombatUI();await petTurn();await delay(500);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);
  };

  const animateUltimateV18Base=animateUltimate;
  animateUltimate=async function(){
    if(!classIdentityActive("ouroboros"))return animateUltimateV18Base();
    const fx=$("attackFx"),enemy=$("enemyIcon");fx.className="attack-fx";void fx.offsetWidth;fx.textContent="♾️🐍☠️";fx.classList.add("ultimate-ouroboros");sfx.holy();await delay(760);enemy.classList.add("enemy-hit");await delay(190);enemy.classList.remove("enemy-hit");
  };

  // ---- Dynamic secret unlock and class-selection clarity -------------------
  const baseClassUnlockedV18Base=baseClassUnlocked;
  baseClassUnlocked=function(id){if(id==="ouroboros")return !!meta.unlocks?.ouroboros;return baseClassUnlockedV18Base(id);};
  const checkDynamicClassUnlocksV18Base=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(){checkDynamicClassUnlocksV18Base();if(gameStarted&&(player.doubleStrike||0)>=4)unlockClass("ouroboros");};

  const classPortraitV18Base=classPortraitSVG;
  classPortraitSVG=function(classId){
    if(classId!=="ouroboros")return classPortraitV18Base(classId);
    return `<svg viewBox="0 0 64 64" role="img" aria-label="Ouroboros portrait"><defs><linearGradient id="ouro18" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#123326"/><stop offset="1" stop-color="#5c256e"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#07110d"/><rect x="3" y="3" width="58" height="58" rx="12" fill="url(#ouro18)"/><circle cx="32" cy="32" r="20" fill="none" stroke="#9df26d" stroke-width="7"/><path d="M47 18c9 5 10 16 5 22l-8-5 5 11c-9 7-23 8-31 0" fill="none" stroke="#e0ff8b" stroke-width="4" stroke-linecap="round"/><path d="M47 18l9-4-4 9z" fill="#f0ff9b"/><circle cx="48" cy="18" r="1.7" fill="#231124"/><text x="32" y="37" text-anchor="middle" font-size="17" fill="#f2d9ff">∞</text></svg>`;
  };


  // ---- Reliable Sovereign/Contract choice for Edge -------------------------
  // The choice uses delegated pointer/click handling (more robust in Edge),
  // then performs an integrity check. If the overlay failed to render buttons,
  // it safely grants one random eligible Legendary rather than doing nothing.
  let v18LegendaryChoiceToken=0;
  v17OpenLegendaryChoice=function(source,onComplete=()=>{}){
    const token=++v18LegendaryChoiceToken,title=$("powerupTitle"),subtitle=$("powerupSubtitle"),grid=$("powerupGrid"),overlay=$("powerupOverlay");
    let settled=false;const choices=v17LegendaryChoices();
    const finish=(up,reason="chosen")=>{if(settled)return;settled=true;if(up){applyUpgrade(up,source);addLog(`<b>${source}:</b> ${reason==="fallback"?"fallback granted":"chose"} <b>${up.name}</b>.`);showToast(`Legendary: ${up.name}`);}overlay?.classList.add("hidden");updateHUD();onComplete(up||false);};
    const fallback=()=>{if(settled)return;const pool=choices.length?choices:eligibleUpgrades(u=>u.rarity==="legendary");const up=pool.length?pick(pool):null;if(up){showToast("⚠️ Choice UI fallback: random Legendary granted");finish(up,"fallback");}else finish(false,"fallback");};
    try{
      title.textContent=source;subtitle.textContent="Choose one of three Legendary powers. If this browser cannot render the chooser, a random Legendary is granted automatically.";grid.innerHTML="";
      if(!choices.length){const d=document.createElement("div");d.className="merchant-notice show";d.textContent="No eligible Legendary powers remain for this class this run.";grid.appendChild(d);overlay.classList.remove("hidden");setTimeout(()=>finish(false),450);return;}
      choices.forEach((up,i)=>{const btn=document.createElement("button");btn.type="button";btn.className="choice-btn legendary";btn.dataset.v18LegendaryIndex=String(i);btn.innerHTML=choiceHTML(up);grid.appendChild(btn);});
      const chooseFromEvent=e=>{const btn=e.target.closest?.('button[data-v18-legendary-index]');if(!btn||settled)return;e.preventDefault();const up=choices[Number(btn.dataset.v18LegendaryIndex)];if(up)finish(up);};
      grid.onpointerup=chooseFromEvent;grid.onclick=chooseFromEvent;$("merchantOverlay")?.classList.add("hidden");overlay.classList.remove("hidden");
      requestAnimationFrame(()=>setTimeout(()=>{if(token!==v18LegendaryChoiceToken||settled)return;const rendered=!overlay.classList.contains("hidden")&&grid.querySelectorAll('button[data-v18-legendary-index]').length===choices.length;if(!rendered)fallback();},120));
    }catch(err){console.error("Legendary chooser failed; using v1.8 fallback.",err);fallback();}
  };

  // ---- Live HUD refresh, hidden passives and tooltips -----------------------
  const updateHUDV18Base=updateHUD;
  updateHUD=function(){
    v18SyncBloodmageHpPassive(false);v18SyncOuroborosAttack();updateHUDV18Base();
    v18ApplyStatTooltip("potionText",v18PotionTooltip());v18ApplyStatTooltip("defenseText",v18DefenseTooltip());v18ApplyStatTooltip("echoText",v18EchoTooltip());
  };
  const updateCombatUIV18Base=updateCombatUI;
  updateCombatUI=function(){
    updateCombatUIV18Base();
    const guard=$("guardBtn"),potion=$("potionBtn"),special=$("specialAttackBtn");
    if(guard&&classHasMechanic("mana"))guard.dataset.tip+=` Guard also channels up to ${player.guardManaGain||6} Mana.`;
    if(guard&&classIdentityActive("bloodmage"))guard.dataset.tip="Replenish heals you and the selected enemy, grants 20 Ultimate, and counts as Guard for the incoming enemy response.";
    if(special&&classIdentityActive("summoner"))special.dataset.tip=`Spend ${OCCULT_SPELLS.summoner.cost} Mana to conjure a spirit. Conjure immediately makes your active companion and every spirit attack with a small temporary damage boost.`;
    if(potion)potion.dataset.tip=v18PotionTooltip();
  };

  // ---- Info/documentation updates ------------------------------------------


  // ---- Regression helpers (not visible in normal UI) -----------------------
  // These functions make browser checks reproducible without exposing another
  // player-facing debug button. They are safe to ignore during normal play.
  Object.defineProperty(window,"DiceboundV18Regression",{configurable:true,value:{
    tooltipState:()=>({potion:$("potionText")?.closest('.stat')?.dataset.tip,defense:$("defenseText")?.closest('.stat')?.dataset.tip,echo:$("echoText")?.closest('.stat')?.dataset.tip}),
    unlockOuroboros:()=>{meta.unlocks.ouroboros=true;saveMeta();renderClassChoices();return isClassUnlocked("ouroboros");},
    alchemistCounter:()=>{renderClassChoices();const progress=window.DiceboundClassChooser?.alchemistProgress?.();return progress?`Potion uses: ${progress.used} / ${progress.required}`:"";},
    sovereign:()=>{player.gold=99999;currentMerchantItems=[{id:"v18_sovereign",icon:"👑",name:"Sovereign Relic",desc:"Choose one Legendary.",base:1,sold:false,alphaChooseLegendary:true,buy(){return null;}}];$("merchantOverlay").classList.remove("hidden");renderMerchant();return true;},
    ouroborosConversion:()=>{meta.unlocks.ouroboros=true;resetPlayer("ouroboros");const before=player.doubleStrike;player.attack+=5;updateHUD();return {attack:player.attack,before,after:player.doubleStrike,unlocked:isClassUnlocked("ouroboros")};},
    bloodmageHp:()=>{meta.unlocks.bloodmage=true;resetPlayer("bloodmage");const before=player.maxHp;player.maxHp+=10;player.hp+=10;updateHUD();return {before,after:player.maxHp,delta:player.maxHp-before};},
    levelChoices:()=>{resetPlayer("ranger");player.levelChoiceBonus=1;pendingLevelUps=1;openLevelUp();return {choices:$("choiceGrid").querySelectorAll("button.choice-btn").length,reroll:!!$("choiceGrid").querySelector(".powerup-reroll-btn")};},
    replenishGuard:async()=>{meta.unlocks.bloodmage=true;resetPlayer("bloodmage");currentEnemies=[{name:"Dummy",hp:100,maxHp:100,attack:10,defense:0}];currentEnemy=currentEnemies[0];combatBusy=false;let guarded=null;const old=resolveEnemyResponse;resolveEnemyResponse=async g=>{guarded=g;combatBusy=false;};try{await bloodmageReplenish();return {guarded,hp:player.hp,enemyHp:currentEnemy.hp};}finally{resolveEnemyResponse=old;}},
    conjureRally:async()=>{meta.unlocks.summoner=true;Object.values(meta.pets).forEach(p=>p.unlocked=true);resetPlayer("summoner");player.mana=100;currentEnemies=[{name:"Dummy",hp:100,maxHp:100,attack:10,defense:0}];currentEnemy=currentEnemies[0];combatBusy=false;let pet=0,response=0;const oldPet=petTurn,oldResponse=resolveEnemyResponse;petTurn=async()=>{pet++;};resolveEnemyResponse=async()=>{response++;combatBusy=false;};try{await summonerConjure();return {pet,response,spirits:player.summonerSpirits.length,mana:player.mana};}finally{petTurn=oldPet;resolveEnemyResponse=oldResponse;}},
    guardMana:async()=>{meta.unlocks.sorcerer=true;resetPlayer("sorcerer");player.mana=0;currentEnemies=[{name:"Dummy",hp:100,maxHp:100,attack:10,defense:0}];currentEnemy=currentEnemies[0];combatBusy=false;const old=guardAction;guardAction=async()=>{combatBusy=false;};try{await identityGuardAction();return {mana:player.mana,gain:player.guardManaGain};}finally{guardAction=old;}},
    exsanguinateTwo:async()=>{meta.unlocks.bloodmage=true;resetPlayer("bloodmage");currentEnemies=[{name:"Dummy A",hp:1000,maxHp:1000,attack:1,defense:0},{name:"Dummy B",hp:1000,maxHp:1000,attack:1,defense:0}];currentEnemy=currentEnemies[0];currentEnemyIndex=0;currentEncounterLead={boss:false};combatBusy=false;const oldResponse=resolveEnemyResponse,oldChaos=rollD20Chaos,oldAnim=animateClassAttack;resolveEnemyResponse=async()=>{combatBusy=false;};rollD20Chaos=async()=>({mult:1});animateClassAttack=async()=>{};try{await bloodmageExsanguinate();return {firstDamage:1000-currentEnemies[0].hp,secondDamage:1000-currentEnemies[1].hp};}finally{resolveEnemyResponse=oldResponse;rollD20Chaos=oldChaos;animateClassAttack=oldAnim;}},
    healingNuzzle:async()=>{resetPlayer("ranger");player.petTurnHeal=2;player.hp=Math.max(1,player.maxHp-8);currentEnemies=[{name:"Dummy",hp:5000,maxHp:5000,attack:1,defense:0,weakness:"fire"}];currentEnemy=currentEnemies[0];currentEnemyIndex=0;combatBusy=false;const before=player.hp,oldUpdate=updateCombatUI;updateCombatUI=()=>{};try{await petTurn();return {before,after:player.hp,healed:player.hp-before};}finally{updateCombatUI=oldUpdate;}}
  }});


  /* SEMANTIC OWNER — Prestige, Double Dice, Board 6, set bonuses and road runtime. Migrated from the retired Alpha legacy stack in 3.1.6. */
  /* ========================================================================
     Alpha v1.9 — Between-Runs Hub, Double Dice and Sixth Road
     ------------------------------------------------------------------------
     This patch deliberately centralizes several systems that had accumulated
     wrappers across older alpha versions. New v1.9 behavior lives here so the
     authoritative rules are easy to audit: late-road progression, Prestige,
     set bonuses, Edge-safe Legendary contracts, pet switching and Paladin
     Grace. Older functions remain for save compatibility but these definitions
     are the runtime authority from this point onward.
     ======================================================================== */

  // ---- Save/schema enrichment ---------------------------------------------
  meta.unlocks=meta.unlocks||{};
  meta.doubleDiceUnlocked=!!(meta.doubleDiceUnlocked||(meta.board5Clears||0)>0);
  meta.board6Clears=meta.board6Clears||0;
  meta.prestige=meta.prestige||defaultPrestige();
  meta.stats=meta.stats||{};
  meta.stats.boardClears=meta.stats.boardClears||{};

  // CEO is intentionally a later secret now. Existing unlocked saves remain
  // unlocked; only future unlock checks use the new 300% threshold.
  if(CLASSES.ceo){CLASSES.ceo.unlock="Secret: reach 300% Boss Damage";CLASSES.ceo.desc="The hidden executive class converts extreme guardian specialization into hostile quarterly growth.";}
  const checkDynamicClassUnlocksV19Base=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(){
    checkDynamicClassUnlocksV19Base();
    if(gameStarted&&(player.bossDamage||0)>=3)unlockClass("ceo");
  };

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
    talents.splice(deepQuarryIndex,1);
  }
  const endless19=talents.find(t=>t.id==="monk_flow_ceiling");
  if(endless19){
    endless19.name="Endless Form";
    endless19.desc="Each rank improves many class signatures: Ranger Mark cap, Monk Combo cap, Turtle Guard chain, Fighter Counterblow power, Mana building, Cleric/Paladin healing resources, Summoner spirits and Alchemist flasks.";
  }

  // ---- Trigger companion finally gets a reason to be selected -------------
  // Gun pet was the only elemental companion without an active stat identity.
  if(PETS.gun&&!PET_STAT_BONUSES.gun){
    PET_STAT_BONUSES.gun={label:"+5% Crit & +2 Luck",v:1,apply(s){player.crit+=.05*s;player.luck+=.02*s;},remove(s){player.crit-=.05*s;player.luck-=.02*s;}};
  }

  // ---- Powerup wording and mastery gates ----------------------------------
  // Character powerups only last for the current run. Avoid saying
  // "permanently" in their descriptions; account-level systems retain that
  // word where it is actually true (pets, Prestige, heirlooms, unlocks).
  upgrades.forEach(up=>{if(typeof up.desc==="string")up.desc=up.desc.replace(/\bpermanently\b/gi,"this run");});

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
      if(epic){epic.achievementGate=`class_b3:${id}`;classMasteryGate[epic.id]={board:3,id};if(!/Board 3 mastery/i.test(epic.desc))epic.desc=`Board 3 mastery: ${epic.desc}`;}
      if(leg){leg.achievementGate=`class_b4:${id}`;classMasteryGate[leg.id]={board:4,id};if(!/Board 4 mastery/i.test(leg.desc))leg.desc=`Board 4 mastery: ${leg.desc}`;}
    });
  }
  const achievementGateUnlockedV19Base=achievementGateUnlocked;
  achievementGateUnlocked=function(gate){
    if(typeof gate==="string"&&gate.startsWith("class_b3:"))return hasBoardClear(gate.slice(9),3);
    if(typeof gate==="string"&&gate.startsWith("class_b4:"))return hasBoardClear(gate.slice(9),4);
    return achievementGateUnlockedV19Base(gate);
  };
  v19AssignMasteryGates();

  // ---- Impossible Road: seven-piece progression ---------------------------
  function v19SetDamageBonus(){const n=mythicalSetCount();return n>=7?.28:n>=4?.10:n>=3?.07:n>=2?.03:0;}
  function v19SetProcBonus(){const n=mythicalSetCount();return n>=7?.18:n>=4?.08:n>=3?.06:0;}
  function v19SetPetDoubleBonus(){const n=mythicalSetCount();return n>=7?.20:n>=4?.12:0;}
  function v19SetElementPower(){return mythicalSetCount()>=7?1.22:1;}
  function v19SetStartBarrier(){return mythicalSetCount()>=5?1:0;}
  function v19SetStartUltimate(){return mythicalSetCount()>=4?35:0;}
  function v19SetGuardianSpecialMult(){const n=mythicalSetCount();return n>=7?.72:n>=4?.90:1;}
  mythicalSetSummary=function(){
    const n=mythicalSetCount();
    return `${n}/7 Impossible Road pieces · 2: +3% all damage · 3: +7% all damage and +6% elemental proc chance · 4: +10% all damage, +8% proc chance, begin battles with 35 Ultimate, one Barrier, +12% pet double chance, and guardian specials deal 10% less damage · 7: +28% all damage, +18% elemental proc chance, +22% elemental power, +20% pet double chance, guardian specials deal 28% less damage, and once per battle at ≤25% HP restore 25% max HP + gain 1 Barrier.`;
  };

  // Board 6 adds the seventh Impossible Road slot.
  function generateMythicalOffhand(){return {id:`mythical_offhand_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"offhand",rarity:"mythical",mythical:true,mythicPiece:"offhand",setName:"Impossible Road",uniqueEffect:"Event Horizon Ward: Guard grants 8 additional Ultimate; every third Guard also raises one Barrier.",icon:"🌌🛡️",name:"Event Horizon Ward, Offhand Beyond the Sixth Road",bonuses:{maxHp:30,defense:7,attack:7,crit:.10,doubleStrike:.12,bossDamage:.32,flatReduction:2}};}

  // ---- Prestige: 9 points per reward and extra 60-Prestige heirloom -------
  function v19PrestigeKeepCapacity(count=meta.prestige?.count||0){return 1+(count>=20?1:0)+(count>=60?1:0);}
  getHeirloomSlots=function(){return 1+talentRank("legacy_heirloom")+((meta.prestige?.count||0)>=20?1:0)+((meta.prestige?.count||0)>=60?1:0);};
  completePrestige=function(data,keepIds=[]){
    const total=data.totalPoints??(allocatedTalentPoints()+(meta.points||0)),rewards=Math.floor(total/9),keys=["maxHp","attack","defense","crit","dodge","luck","lifeSteal"];
    for(let i=0;i<rewards;i++){const key=pick(keys);meta.prestige[key]=(meta.prestige[key]||0)+1;}
    meta.prestige.count=(meta.prestige.count||0)+rewards;
    const capacity=v19PrestigeKeepCapacity(meta.prestige.count),pool=data.candidates||prestigeCandidateItems||meta.heirlooms||[],selected=pool.filter(h=>keepIds.includes(h.id)).slice(0,capacity);
    const remainder=total%9;
    meta.heirlooms=selected.map(normalizeSavedItem);meta.purchased={};meta.level=1;meta.xp=0;meta.xpNext=legacyXpForLevel(1);meta.points=remainder;pendingPrestige=null;pendingPrestigeKeepIds=new Set();
    $("prestigeHeirloomOverlay")?.classList.add("hidden");saveMeta();checkDynamicClassUnlocks();sfx.holy();showToast(`Prestige gained ${rewards} permanent stat point${rewards===1?"":"s"}`);renderTalents();updateMetaUI();openStartScreen();
  };
  openPrestigeHeirloomChoice=function(data){
    const post=(meta.prestige?.count||0)+data.rewards,capacity=v19PrestigeKeepCapacity(post);
    const pool=[...(meta.heirlooms||[]),...(data.wasInRun?EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]).filter(Boolean):[])];
    const dedupe=new Map(pool.map(i=>[i.id,i]));prestigeCandidateItems=[...dedupe.values()];data.candidates=prestigeCandidateItems;pendingPrestige=data;pendingPrestigeKeepIds=new Set();
    const prestigeOverlay=$("prestigeHeirloomOverlay"),prestigeGrid=$("prestigeKeepGrid")||$("prestigeHeirloomGrid"),prestigeConfirm=$("prestigeConfirmBtn")||$("prestigeKeepConfirmBtn"),prestigeSubtitle=$("prestigeHeirloomSubtitle")||$("prestigeHeirloomOverlay")?.querySelector(".subtitle");
    if(!prestigeOverlay||!prestigeGrid||!prestigeConfirm)return;
    if(prestigeSubtitle)prestigeSubtitle.textContent=`Choose up to ${capacity} survivor${capacity===1?"":"s"}. Selected items glow gold and show a large check mark.`;
    const grid=prestigeGrid;grid.innerHTML="";
    prestigeCandidateItems.forEach(item=>{const b=document.createElement("button");b.type="button";b.className="prestige-keep-btn";b.dataset.keepId=item.id;b.innerHTML=`<strong>${item.icon} ${item.name}</strong><span>${SLOT_LABELS[item.slot]} · ${formatBonuses(item)}</span><em class="prestige-selected-label">Not selected</em>`;b.addEventListener("click",()=>{if(pendingPrestigeKeepIds.has(item.id))pendingPrestigeKeepIds.delete(item.id);else{if(pendingPrestigeKeepIds.size>=capacity){showToast(`Keep at most ${capacity}`);return;}pendingPrestigeKeepIds.add(item.id);}const on=pendingPrestigeKeepIds.has(item.id);b.classList.toggle("kept",on);b.querySelector(".prestige-selected-label").textContent=on?"✓ SELECTED":"Not selected";prestigeConfirm.textContent=`Confirm ${pendingPrestigeKeepIds.size}/${capacity} selected`;});grid.appendChild(b);});
    prestigeConfirm.textContent=`Confirm 0/${capacity} selected`;$("prestigeHeirloomOverlay").classList.remove("hidden");
  };
  prestigeTree=function(){
    const allocated=allocatedTalentPoints(),unspent=meta.points||0,total=allocated+unspent,rewards=Math.floor(total/9);if(rewards<1)return;
    const post=(meta.prestige?.count||0)+rewards,keep=v19PrestigeKeepCapacity(post),remainder=total%9,warning=`Prestige all ${total} talent points? Every 9 points becomes 1 permanent Prestige point (${rewards} reward${rewards===1?"":"s"}). ${remainder?`${remainder} leftover talent point${remainder===1?"":"s"} will be returned after the reset. `:""}Talents and Legacy level reset, and you may keep up to ${keep} heirloom${keep===1?"":"s"}.${gameStarted?" THIS ENDS THE CURRENT RUN AND RETURNS TO THE BETWEEN-RUNS HUB.":""}`;
    if(!window.DiceboundPlatform.confirm(warning))return;const data={allocated,rewards,remainder:0,unspent:0,totalPoints:total,wasInRun:gameStarted};const pool=[...(meta.heirlooms||[]),...(gameStarted?EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]).filter(Boolean):[])];if(pool.length)openPrestigeHeirloomChoice(data);else completePrestige(data,[]);
  };


  // ---- Compact status markers ---------------------------------------------
  // Once stacks become numerous, a number is much more readable than a row of
  // dots. Under five, dots preserve the quick visual language.
  statusDotsHTML=function(barriers=0,poison=0,affinity=null){
    let html="";
    if(barriers>=5)html+=`<span class="status-count barrier-count" title="${barriers} Barrier stacks">${barriers}×🛡️</span>`;else for(let i=0;i<barriers;i++)html+=`<span class="status-dot barrier" title="Barrier"></span>`;
    if(poison>=5)html+=`<span class="status-count poison-count" title="${poison} Poison stacks">${poison}×☠️</span>`;else for(let i=0;i<poison;i++)html+=`<span class="status-dot poison" title="Poison"></span>`;
    if(affinity&&ELEMENTS[affinity])html+=`<span class="status-affinity" title="${ELEMENTS[affinity].name} affinity">${ELEMENTS[affinity].icon}</span>`;
    return html;
  };

  // ---- Haste: one-turn lockout --------------------------------------------
  // Haste may grant one immediate extra action, but cannot chain itself again
  // until one normal enemy response has elapsed. This mirrors Freeze's anti-
  // lock behavior without removing Haste's tempo identity.
  const triggerElementEffectV19Base=triggerElementEffect;
  triggerElementEffect=function(key,target,opts={}){
    const before=player.hasteTurns||0,out=triggerElementEffectV19Base(key,target,opts);
    if(key==="coffee"&&(player.hasteCooldown||0)>0&&(player.hasteTurns||0)>before){player.hasteTurns=before;if(out)out.message=`${out.message||"Coffee crackles."} Haste is cooling down, so no extra action is granted.`;}
    return out;
  };
  const rollD20ChaosV19Base=rollD20Chaos;
  rollD20Chaos=async function(action){const before=player.hasteTurns||0,out=await rollD20ChaosV19Base(action);if((player.hasteCooldown||0)>0&&(player.hasteTurns||0)>before)player.hasteTurns=before;return out;};
  const resolveEnemyResponseV19Base=resolveEnemyResponse;
  resolveEnemyResponse=async function(guarded=false){
    const hadHaste=(player.hasteTurns||0)>0,cd=player.hasteCooldown||0,out=await resolveEnemyResponseV19Base(guarded);
    if(hadHaste&&(player.hasteTurns||0)<1)player.hasteCooldown=1;else if(!hadHaste&&cd>0)player.hasteCooldown=Math.max(0,cd-1);
    return out;
  };

  // ---- Sovereign Relic / Legendary Contract ------------------------------
  // The final runtime owner now uses Dicebound's visual powerup-choice overlay.
  // Older prompt/random-fallback logic was the reason Board 6 ignored the newer
  // chooser even though the UI existed earlier in the bundle.
  function v19OpenLegendaryContract(source,onComplete=()=>{}){
    return v17OpenLegendaryChoice(source,onComplete);
  }
  renderMerchant=function(){
    $("merchantGold").textContent=player.gold;const notice=$("merchantNotice");notice.classList.toggle("show",!!currentMerchantNotice);notice.innerHTML=currentMerchantNotice;const grid=$("shopGrid");grid.innerHTML="";
    currentMerchantItems.forEach(item=>{const price=merchantPrice(item.base),btn=document.createElement("button");btn.className=`shop-item${item.sold?" sold":""}`;btn.disabled=item.sold||player.gold<price;const comparison=item.gear?`<div class="shop-compare">${formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:"";btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${item.sold?"SOLD":price+"g"}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;
      btn.addEventListener("click",async()=>{if(item.sold||player.gold<price)return;if(item.gear){const current=player.equipment[item.gear.slot];if(current&&gearPowerScore(item.gear)<gearPowerScore(current)&&!(await diceboundConfirm(`${item.gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`,{title:"Buy weaker gear?",confirmLabel:"Buy anyway",danger:true})))return;}
        player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);
        const chooser=item.alphaChooseLegendary||/Sovereign Relic|Legendary Contract/i.test(item.name||"");
        if(chooser){
          currentMerchantNotice=`👑 <b>${item.name} purchased.</b> Choose one Legendary power.`;renderMerchant();
          v19OpenLegendaryContract(item.name||"Legendary Contract",chosen=>{
            if(!chosen){player.gold+=price;item.sold=false;currentMerchantNotice=`👑 No eligible Legendary powers remain; ${price} gold was refunded.`;}
            else currentMerchantNotice=`👑 <b>${item.name} claimed:</b> ${chosen.name}.`;
            $("merchantOverlay").classList.remove("hidden");showToast(chosen?`Legendary: ${chosen.name}`:"Relic refunded");updateHUD();renderMerchant();
          });
          return;
        }
        const result=item.buy?.();if(item.id==="relic"&&result)currentMerchantNotice=`🔮 <b>Relic opened:</b> ${rarityInfo[result.rarity].label} <b>${result.name}</b><br>${result.desc}`;else if(item.gear)currentMerchantNotice=`🧰 Equipped <b>${item.gear.name}</b>.<br>${formatBonuses(item.gear)}`;if(["attack","armor","charm"].includes(item.id))recordRunBuff(item.icon,item.name,item.desc,"merchant","Merchant");showToast(item.id==="relic"&&result?`${rarityInfo[result.rarity].label}: ${result.name}`:item.name);updateHUD();renderMerchant();
      });grid.appendChild(btn);
    });
  };

  // ---- Pet switching rules -------------------------------------------------
  // Beastmaster predates the class-tag pass, so make its pet identity explicit.
  // Summoner and Pokémon Trainer already carry the `pet` tag in their definitions.
  CLASSES.beastmaster.tags=Array.from(new Set([...(CLASSES.beastmaster.tags||[]),"pet"]));
  function v19PetTaggedClass(){return classHasMechanic("pet");}
  function v19CanSwitchPet(petId){return !gameStarted||v19PetTaggedClass()||meta.activePet===petId;}

  // ---- Paladin: healing stores Grace, Grace empowers Guard ----------------
  // This deliberately fuses Cleric's healing feedback loop with Fighter's
  // defensive tempo. Healing stores up to 100 Grace. Guard consumes it for
  // stronger Guard and barriers, turning sustain into deliberate defense.
  if(CLASSES.paladin){
    CLASSES.paladin.desc="A holy guardian hybrid. Healing stores Oath Grace; Guard consumes that Grace for stronger mitigation and barriers, while Defense still contributes to offense.";
    CLASSES.paladin.scaleNotes="Healing and max HP build Oath Grace; Defense makes each empowered Guard more valuable. The class blends Cleric sustain with Fighter-style defensive tempo.";
    CLASSES.paladin.ultimate.desc="Heavy holy area damage scaling with Attack and Defense, heals the Paladin and feeds Oath Grace, then raises barriers.";
  }
  const healPlayerV19Base=healPlayer;
  healPlayer=function(amount){const before=player.hp,healed=healPlayerV19Base(amount);if(classIdentityActive("paladin")&&healed>0){player.paladinGrace=clamp((player.paladinGrace||0)+healed,0,100);if(player.hp>before)identityFlash(`⚜️ Grace ${Math.round(player.paladinGrace)}/100`);}return healed;};
  const identityGuardActionV19Base=identityGuardAction;
  identityGuardAction=async function(){
    if(!classIdentityActive("paladin"))return identityGuardActionV19Base();
    const grace=Math.floor(player.paladinGrace||0),extraGuard=Math.min(.20,grace*.002),barriers=Math.floor(grace/25),oldPower=player.guardPower;player.paladinGrace=0;player.guardPower=clamp(oldPower+extraGuard,0,.92);if(barriers)player.combatShield=(player.combatShield||0)+barriers;addCombatHistory(`⚜️ Oath Guard consumes ${grace} Grace: +${Math.round(extraGuard*100)}% Guard power${barriers?` and ${barriers} Barrier${barriers===1?"":"s"}`:""}.`);identityFlash(`⚜️ Oath Guard · ${grace} Grace`);try{return await identityGuardActionV19Base();}finally{player.guardPower=oldPower;updateCombatUI();}
  };

  // ---- Runtime reset hooks -------------------------------------------------
  const resetPlayerV19Base=resetPlayer;
  resetPlayer=function(classId=selectedClassId){
    resetPlayerV19Base(classId);player.hasteCooldown=0;player.titanCleaveBarrierBonus=player.titanCleaveBarrierBonus||0;player.paladinGrace=0;
    // Deep Quarry no longer exists. Endless Form is the sole talent source for
    // additional Ranger Mark cap beyond powerups.
    if(classIdentityActive("ranger"))player.rangerMarkMax=Math.max(3,3+gameplayTalentRank("monk_flow_ceiling"));
  };

  // Show Paladin Grace through the standard class resource component.
  const updateCombatUIV19Base=updateCombatUI;
  updateCombatUI=function(){updateCombatUIV19Base();if(classIdentityActive("paladin"))setResourceUI("faith","Oath Grace",player.paladinGrace||0,100,"Healing stores Grace. Guard consumes it for up to +20% Guard power and 1 Barrier per 25 Grace.");};

  // ---- Between-runs hub ----------------------------------------------------

  // ---- Double Dice ---------------------------------------------------------
  function v19EnsureDoubleDiceButton(){
    if($("roll2Btn"))return;const one=$("rollBtn");if(!one)return;one.textContent="🎲 Roll 1d6";const two=document.createElement("button");two.id="roll2Btn";two.className="main-btn double-dice-btn";two.textContent="🎲🎲 Roll 2d6";two.addEventListener("click",rollTwoDice);one.parentElement.insertBefore(two,one.nextSibling);
  }
  async function rollTwoDice(){
    if(rollLocked||!gameStarted||!meta.doubleDiceUnlocked)return;ensureAudio();rollLocked=true;updateHUD();const die=$("dice");die.classList.add("rolling","double-mode");for(let i=0;i<10;i++){die.textContent=`${pick(diceFaces)} + ${pick(diceFaces)}`;sfx.roll();await delay(45+i*5);}let a=rand(1,6),b=rand(1,6),chosen=false;if(player.diceChoiceChance>0&&random()<player.diceChoiceChance){a=await chooseDieResult();b=await chooseDieResult();chosen=true;showToast(`🎲🎲 Fate chosen: ${a}+${b}=${a+b}`);}let bonus=0;if(!chosen&&random()<clamp(player.extraStepChance,0,.75))bonus=1;die.textContent=`${diceFaces[a-1]} + ${diceFaces[b-1]}`;die.classList.remove("rolling");rolls++;ensureAlphaMeta().rolls++;if(hasMythicPiece("boots")&&(a>=5||b>=5)){const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.05)));player.hp+=healed;player.ultimateCharge=clamp(player.ultimateCharge+10,0,100);showToast("🥾 Titanstep!");}const total=a+b;addLog(`${chosen?"Fate bends. You choose":"Double Dice rolls"} <b>${a} + ${b} = ${total}</b>${bonus?" and Long Stride adds <b>+1</b>":""}.`);await dbBoardMovement.move(total+bonus,total,bonus>0,chosen);
  }
  v19EnsureDoubleDiceButton();
  const updateHUDV19Base=updateHUD;
  updateHUD=function(){updateHUDV19Base();v19EnsureDoubleDiceButton();const b=$("roll2Btn");if(b){b.style.display=meta.doubleDiceUnlocked?"block":"none";b.disabled=rollLocked||!gameStarted;}const one=$("rollBtn");if(one)one.textContent=meta.doubleDiceUnlocked?"🎲 Roll 1d6":"🎲 Roll the dice";};

  // ---- Board 6 -------------------------------------------------------------
  const scaleEnemyV19Base=scaleEnemy;
  scaleEnemy=function(base,kind="normal",packSize=1){const e=scaleEnemyV19Base(base,kind,packSize);if(boardLevel===6){e.hp=Math.round(e.hp*1.85);e.maxHp=e.hp;e.attack=Math.round(e.attack*1.58);e.defense=Math.round((e.defense||0)*1.25+10);e.xp=Math.round((e.xp||1)*1.35);e.gold=Math.round((e.gold||1)*1.18);}return e;};
  const startCombatV19Base=startCombat;
  startCombat=function(kind="normal"){
    const out=startCombatV19Base(kind);if(boardLevel!==6||!currentEnemies.length)return out;
    if(kind==="final"){
      const base=db317FinalGuardian(6);currentEnemies=[scaleEnemy(base,"final",1)];currentEncounterLead=currentEnemies[0];currentEnemyIndex=0;currentEnemy=currentEnemies[0];
    }else if(kind==="miniboss"){
      currentEnemies[0].name="Abyssal Custodian";currentEnemies[0].specialName="Sixth Seal Collapse";currentEncounterLead=currentEnemies[0];currentEnemy=currentEnemies[0];
    }
    $("combatTitle").textContent=kind==="final"?"Sixth Road Final Guardian":kind==="miniboss"?"Sixth Road Miniboss":$("combatTitle").textContent;renderEnemyParty();updateCombatUI();return out;
  };
  const applyRunThemeV19Base=applyRunTheme;
  applyRunTheme=function(){
    applyRunThemeV19Base();
    const themeByBoard={
      1:{bg1:"#071b0d",bg2:"#031008",glow1:"rgba(82,220,118,.24)",glow2:"rgba(175,255,116,.11)",board1:"#173c20",board2:"#0a2111"},
      2:{bg1:"#1c1708",bg2:"#0c0b05",glow1:"rgba(255,217,123,.23)",glow2:"rgba(137,193,255,.14)",board1:"#43371a",board2:"#1d1910"},
      3:{bg1:"#2a0709",bg2:"#120305",glow1:"rgba(255,67,76,.25)",glow2:"rgba(255,130,57,.12)",board1:"#5c171b",board2:"#2b090c"},
      4:{bg1:"#221109",bg2:"#0d0604",glow1:"rgba(255,118,62,.26)",glow2:"rgba(164,47,36,.16)",board1:"#4f2416",board2:"#20100a"},
      5:{bg1:"#140721",bg2:"#06020d",glow1:"rgba(189,98,255,.28)",glow2:"rgba(87,130,255,.16)",board1:"#351048",board2:"#13061d"},
      6:{bg1:"#03050d",bg2:"#000104",glow1:"rgba(71,92,255,.30)",glow2:"rgba(210,55,255,.17)",board1:"#111947",board2:"#070a1d"}
    };
    const root=document.documentElement.style,theme=themeByBoard[boardLevel]||themeByBoard[1],scene=window.DiceboundAssets?.resolveBoardBackground?.(boardLevel),sceneUrl=scene?.image?`url("${scene.image}")`:'none';
    for(const [key,value] of Object.entries(theme))root.setProperty(`--run-${key.replace(/([A-Z])/g,'-$1').toLowerCase()}`,value);
    root.setProperty("--run-scene-image",sceneUrl); // fallback / future filter composition
    root.setProperty("--run-scene-focus",scene?.focus||"50% 50%");
    const sceneEl=$("boardSceneBg");
    if(sceneEl){
      if(scene?.image&&sceneEl.getAttribute('src')!==scene.image)sceneEl.setAttribute('src',scene.image);
      sceneEl.style.objectPosition=scene?.focus||"50% 50%";
      sceneEl.dataset.board=String(boardLevel||1);
    }
    document.body?.setAttribute('data-board-level',String(boardLevel||1));
  };

  // Sixth-road merchant: much richer stock and distinctly higher cost.
  const merchantCatalogV19Base=merchantCatalog;
  merchantCatalog=function(){if(boardLevel!==6)return merchantCatalogV19Base();return [
    {id:"heal6",icon:"❤️‍🔥",name:"Impossible Restoration",desc:"Restore all HP and gain +12 max HP this run.",base:520,buy(){player.maxHp+=12;player.hp=player.maxHp;}},
    {id:"potion6",icon:"🧪",name:"Grand Flask Case",desc:"Gain 7 potions.",base:430,buy(){player.potions+=7;}},
    {id:"attack6",icon:"⚔️",name:"Sixth-Road Edge",desc:"Gain +5 Attack this run.",base:720,buy(){player.attack+=5;}},
    {id:"armor6",icon:"🛡️",name:"Abyssal Plate",desc:"Gain +5 Defense and +2 flat reduction this run.",base:760,buy(){player.defense+=5;player.flatReduction+=2;}},
    {id:"charm6",icon:"🌈",name:"Entropy Prism",desc:"Gain +20% elemental proc and +25% elemental power this run.",base:840,buy(){player.elementProcBonus+=.20;player.elementDamageBonus+=.25;}},
    {id:"contract6",icon:"👑",name:"Tyrant's Legendary Contract",desc:"Choose one Legendary power.",base:1050,alphaChooseLegendary:true,buy(){return null;}}
  ];};
  const makeMerchantGearV19Base=makeMerchantGear;
  makeMerchantGear=function(){if(boardLevel!==6)return makeMerchantGearV19Base();let rarity=rollGearRarity(.95);if(["common","uncommon"].includes(rarity))rarity="rare";if(rarity==="rare"&&random()<.38)rarity="epic";const gear=generateEquipment(rarity),base=Math.round(v14RawSellValue(gear)*3.45);return {id:gear.id,icon:gear.icon,name:gear.name,desc:`${SLOT_LABELS[gear.slot]} · ${formatBonuses(gear)}`,gear,base,buy(){equipItem(gear);return gear;}};};
  const openMerchantV19Base=openMerchant;
  openMerchant=function(){if(boardLevel!==6)return openMerchantV19Base();const catalog=merchantCatalog(),stock=[];catalog.forEach(i=>stock.push({...i,sold:false}));for(let i=0;i<6;i++)stock.push({...makeMerchantGear(),sold:false});currentMerchantItems=stock;currentMerchantNotice="";$("merchantTitle").textContent="Merchant at the End of Mathematics";$("merchantSubtitle").textContent="Board 6 stock is exceptional. Its prices assume you survived five roads to reach it.";$("merchantOverlay").classList.remove("hidden");renderMerchant();};

  // Mythical drop table: Board 6 inherits a stronger late-road table and adds
  // the seventh set piece offhand at exactly 0.5% / 5% before Nightmare's x2.
  openCombatLootChain=function(defeated,done){
    const normal=()=>{if(random()<equipmentDropChance(defeated.boss)){const rarity=defeated.finalBoss?pick(["epic","legendary"]):defeated.miniBoss?pick(["rare","epic"]):null;openLoot(generateEquipment(rarity),done);}else done();};
    const specials=[];let weapon=0,boots=0,amulet=0,pants=0,hat=0,ring=0,offhand=0;
    if(defeated.merchantBoss){if(random()<.05*(nightmareMode?2:1))specials.push(generateMerchantWeapon());}
    else if(defeated.bloodmageBoss){if(random()<.05*(nightmareMode?2:1))specials.push(generatePhilosophersStone());}
    else if(defeated.miniBoss){if(boardLevel===1)weapon=.005;else if(boardLevel===2){weapon=.075;boots=.01;}else if(boardLevel===3){weapon=.075;boots=.01;pants=.005;}else if(boardLevel===4){weapon=.12;boots=.075;pants=.04;amulet=.005;hat=.005;}else if(boardLevel===5){weapon=.14;boots=.09;pants=.05;amulet=.01;hat=.01;ring=.04;}else{weapon=.18;boots=.12;pants=.075;amulet=.015;hat=.025;ring=.07;offhand=.005;}}
    else if(defeated.finalBoss){if(boardLevel===1)weapon=.05;else if(boardLevel===2){weapon=.10;boots=.05;amulet=.001;}else if(boardLevel===3){weapon=.10;boots=.05;pants=.02;amulet=.001;}else if(boardLevel===4){weapon=.18;boots=.10;pants=.06;amulet=.01;hat=.02;}else if(boardLevel===5){weapon=.20;boots=.12;pants=.08;amulet=.02;hat=.03;ring=.10;}else{weapon=.25;boots=.16;pants=.11;amulet=.03;hat=.05;ring=.14;offhand=.05;}}
    const mult=nightmareMode?2:1;if(weapon&&random()<weapon*mult)specials.push(generateMythicalWeapon());if(boots&&random()<boots*mult)specials.push(generateMythicalBoots());if(pants&&random()<pants*mult)specials.push(generateMythicalPants());if(amulet&&random()<amulet*mult)specials.push(generateMythicalAmulet());if(hat&&random()<hat*mult)specials.push(generateMythicalHat());if(ring&&random()<ring*mult)specials.push(generateMythicalRing());if(offhand&&random()<offhand*mult)specials.push(generateMythicalOffhand());
    const next=()=>{if(!specials.length)return normal();const item=specials.shift();addLog(`<b>${item.rarity==="omega"?"OMEGA ITEM!":"MYTHIC ITEM!"}</b> ${item.name} drops from ${defeated.name}.`);sfx.holy();openLoot(item,next);};next();
  };

  // The historical callers still use this name, but board-transition.js now
  // owns the complete Board 5 -> 6 / final-road transition contract.
  function advanceToNextBoard(){return dbBoardTransition.advance();}
  let v19CompletingSixth=false;
  function dbRunPresentFinalEnd({earned,context}){
    const modePrefix=context.mode==='Normal'?'':`${context.mode} `;
    $("startOverlay")?.classList.add("hidden");$("combatOverlay")?.classList.add("hidden");
    $("endArt").textContent="♾️🏆";$("endTitle").textContent="The Sixth Road Falls!";$("endTitle").className="victory-title";
    $("endText").textContent=`You conquered all six ${modePrefix}roads. ${earned} Legacy XP is banked. Your equipped gear remains available below for heirloom binding.`;
    $("endLevel").textContent=context.level;$("endGold").textContent=context.gold;$("endTurns").textContent=context.rolls;$("endLegacyXp").textContent=earned;$("endGoldLegacyXp").textContent=context.goldLegacyAward;
    renderEndGear();$("endOverlay").classList.remove("hidden");
  }
  function dbRunApplySixthRoadCompletion({before}){
    if(!before?.unlockSlimeRouge)return;
    unlockClass('slimerouge');addLog('<b>🔴 Something red crawls out of the random road.</b> Slime Rouge has been unlocked.');showToast('🔴 SECRET CLASS UNLOCKED · Slime Rouge',3800,true);
  }
  function completeSixthRoadV19(){return dbRunCompletion.completeFinalRoad();}

  // Custom final resolution for Boards 5 and 6 bypasses all historical v16
  // Board-5 terminal wrappers. Other encounters continue through the mature
  // existing combat-resolution pipeline.
  const winCombatV19Base=winCombat;
  async function v19ResolveLateFinal(defeated,boardAtWin){
    const all=currentEnemies.length?[...currentEnemies]:[defeated],tileIndex=currentEnemyTile,classId=player.classId,s=ensureAlphaMeta();s.enemiesDefeated+=all.length;s.bossesDefeated++;recordBoardClear(boardAtWin,classId);const rewardGold=modifiedGold(all.reduce((sum,e)=>sum+(e?.gold||0),0)),rewardXp=Math.max(1,Math.round(all.reduce((sum,e)=>sum+(e?.xp||0),0)*(1+player.xpBonus)));player.gold+=rewardGold;if(player.postFightHeal>0)healPlayer(player.postFightHeal);const cookies=boardAtWin===6?15:10;meta.petCookies+=cookies;if(boardAtWin===5){meta.board5Clears=(meta.board5Clears||0)+1;meta.doubleDiceUnlocked=true;if(classId==="beastmaster"&&nightmareMode)meta.beastmasterNightmareBoard5=true;showToast("🎲🎲 Double Dice unlocked!",2600,true);}saveMeta();checkDynamicClassUnlocks();if(tiles[tileIndex])tiles[tileIndex].cleared=true;setCombatText(`${boardAtWin===6?"Sixth":"Fifth"} Road victory! +${rewardXp} XP, +${rewardGold} gold, +${cookies} cookies.`);sfx.win();addLog(`<b>${defeated.name} defeated.</b> +${rewardXp} XP, +${rewardGold} gold and +${cookies} cookies.`);updateHUD();await delay(320);await BattleVictoryUI.present(BattleVictoryState.create({title:`${boardAtWin===6?'Sixth':'Fifth'} Road Victory!`,defeatedNames:all.map(e=>e.name),xp:rewardXp,gold:rewardGold,cookies,board:boardAtWin}));$("combatOverlay").classList.add("hidden");BattleVictoryUI.reset();currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;grantXp(rewardXp);updateHUD();const finish=()=>boardAtWin===6?completeSixthRoadV19():advanceToNextBoard(),afterLevels=()=>pendingLevelUps>0?openLevelUp(finish):finish();openCombatLootChain(defeated,afterLevels);
  }
  winCombat=async function(){const defeated=currentEncounterLead||currentEnemy,isFinal=!!defeated?.finalBoss||v16CombatKind==="final"||tiles[currentEnemyTile]?.type==="boss";if(isFinal&&(boardLevel===5||boardLevel===6))return v19ResolveLateFinal(defeated,boardLevel);return winCombatV19Base();};
  // Board-6 guardian labels in the road HUD.
  const updateHUDV19RoadBase=updateHUD;
  updateHUD=function(){updateHUDV19RoadBase();if(boardLevel===6&&gameStarted){const count=currentTileCount(),mini=currentMinibossTile();$("floorText").textContent=`Board 6 · ${player.position+1} / ${count}`;$("guardianText").textContent=player.position<mini-1?`Abyssal Custodian · tile ${mini}`:`The Last Equation · tile ${count}`;}};
  // Keep the road HUD on the same final guardian identity used for combat,
  // including Boards 4-6 where legacy labels previously drifted.
  const updateHUDV20GuardianBase=updateHUD;
  updateHUD=function(){updateHUDV20GuardianBase();if(!gameStarted)return;const guardian=DB317_GUARDIANS.resolveFinal(boardLevel),count=currentTileCount(),mini=currentMinibossTile();if(guardian&&player.position>=mini-1)$("guardianText").textContent=`${guardian.name} · tile ${count}`;};

  // ---- Set bonuses: runtime hooks ------------------------------------------
  // Normalize old hard-coded thresholds by wrapping the two main combat entry
  // points. This keeps v1.9's weaker 2/3/4 bonuses and strong 7-piece finish.
  const startCombatV19SetBase=startCombat;
  startCombat=function(kind="normal"){
    const out=startCombatV19SetBase(kind);if(!currentEnemy)return out;
    // Old code may have granted the former 4-piece values. Normalize to v1.9.
    const n=mythicalSetCount();if(n>=4){player.ultimateCharge=Math.max(player.ultimateCharge,v19SetStartUltimate());}
    return out;
  };
  const petTurnV19Base=petTurn;
  petTurn=async function(){const bonus=v19SetPetDoubleBonus(),old=player.petDoubleChance||0;player.petDoubleChance=old+bonus;try{return await petTurnV19Base();}finally{player.petDoubleChance=old;}};
  // Base strike/ultimate/element formulas already call v19SetDamageBonus() directly.
  // Do not wrap strikeBaseDamage again here: doing so risks double-counting set power.

  // Offhand unique effect and Paladin Guard behavior share Guard entry.
  const identityGuardActionV19OffhandBase=identityGuardAction;
  identityGuardAction=async function(){if(hasMythicPiece("offhand")){player.ultimateCharge=clamp((player.ultimateCharge||0)+8,0,100);player._eventHorizonGuards=(player._eventHorizonGuards||0)+1;if(player._eventHorizonGuards%3===0){player.combatShield=(player.combatShield||0)+1;addCombatHistory("🌌 Event Horizon Ward raises a Barrier on the third Guard.");}}return identityGuardActionV19OffhandBase();};

  // ---- Debug additions -----------------------------------------------------
  const debugActionV19Base=debugAction;
  debugAction=function(action){if(action==="mythic_offhand"){if(!gameStarted){showToast("Start a run first");return;}equipItem(generateMythicalOffhand(),true);updateHUD();showToast("Artifact offhand added");return;}if(action==="board6"&&gameStarted){boardLevel=6;player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");updateHUD();showToast("Debug: board6");return;}if(action==="double_dice"){meta.doubleDiceUnlocked=true;saveMeta();updateHUD();showToast("Double Dice unlocked");return;}return debugActionV19Base(action);};
  function v19AddDebugButton(action,label){const grid=$("debugOverlay")?.querySelector(".debug-grid");if(!grid||grid.querySelector(`[data-v19-action="${action}"]`))return;const b=document.createElement("button");b.className="small-btn";b.dataset.v19Action=action;b.textContent=label;b.addEventListener("click",()=>debugAction(action));grid.appendChild(b);}
  v19AddDebugButton("board6","Board 6");v19AddDebugButton("mythic_offhand","Artifact offhand");v19AddDebugButton("double_dice","Unlock 2d6");

  // ---- Info / visual polish ------------------------------------------------


  // Styling added in JS keeps the single-file build self-contained.
  const v19Style=document.createElement("style");v19Style.textContent=`
    .status-count{display:inline-flex;align-items:center;justify-content:center;min-width:27px;height:18px;padding:0 5px;border-radius:999px;font-size:9px;font-weight:950;margin:0 2px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
    .barrier-count{background:rgba(65,151,255,.22);color:#a9d3ff}.poison-count{background:rgba(79,193,105,.20);color:#aaffb5}
    .prestige-keep-btn{position:relative}.prestige-keep-btn.kept{border:2px solid var(--gold)!important;background:linear-gradient(145deg,#4b4120,#2c3550)!important;box-shadow:0 0 0 3px rgba(245,200,91,.18),0 0 24px rgba(245,200,91,.18)!important;transform:translateY(-1px)}
    .prestige-keep-btn.kept::after{content:"✓";position:absolute;right:10px;top:8px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--gold);color:#22180a;font-weight:1000;font-size:18px}
    .prestige-selected-label{display:block;margin-top:8px;font-size:9px;font-style:normal;font-weight:950;color:var(--muted)}.prestige-keep-btn.kept .prestige-selected-label{color:#ffeaa0}
    .between-runs-modal{width:min(1040px,97vw)!important}.between-runs-hub{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0 18px}.hub-card{display:flex;flex-direction:column;gap:7px;min-height:128px;padding:12px;border-radius:14px;background:linear-gradient(180deg,rgba(44,57,90,.74),rgba(19,28,48,.86));border:1px solid rgba(255,255,255,.08)}.hub-card>b{font-size:12px;color:#f1e8ff}.hub-card>span{font-size:10px;line-height:1.42;color:var(--muted);flex:1}.hub-mini-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.hub-class-heading{text-align:center;margin:17px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#ded6ed}
    .travel-actions:has(#roll2Btn){display:grid!important;grid-template-columns:1fr 1fr;gap:7px}.travel-actions:has(#roll2Btn) .road-status,.travel-actions:has(#roll2Btn) .hint,.travel-actions:has(#roll2Btn) .run-buff-btn{grid-column:1/-1}.double-dice-btn{background:linear-gradient(180deg,#e2c1ff,#9066d2)!important;color:#24162d!important}.dice.double-mode{font-size:29px!important;white-space:nowrap}
    .achievement-category-head{grid-column:1/-1;margin:14px 0 2px;padding:7px 10px;border-radius:10px;background:rgba(181,140,255,.11);border:1px solid rgba(181,140,255,.2);font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.11em}
    @media(max-width:800px){.between-runs-hub{grid-template-columns:1fr 1fr}}@media(max-width:520px){.between-runs-hub{grid-template-columns:1fr}.travel-actions:has(#roll2Btn){grid-template-columns:1fr}}
  `;document.head.appendChild(v19Style);

  // ---- Regression helpers --------------------------------------------------
  Object.defineProperty(window,"DiceboundV19Regression",{configurable:true,value:{
    sovereign:()=>{meta.unlocks.ranger=true;resetPlayer("ranger");player.gold=99999;currentMerchantItems=[{id:"v19_relic",icon:"👑",name:"Sovereign Relic",desc:"Choose one Legendary.",base:1,sold:false,alphaChooseLegendary:true,buy(){return null;}}];renderMerchant();return true;},
    board6:()=>{gameStarted=true;runFinalized=false;boardLevel=6;player.position=0;generateBoard();buildBoard();return {tiles:tiles.length,mini:tiles[currentMinibossTile()-1]?.enemyBase?.name,last:tiles.at(-1)?.type};},
    doubleDice:()=>{meta.doubleDiceUnlocked=true;updateHUD();return {visible:$("roll2Btn")?.style.display!=="none",label:$("roll2Btn")?.textContent};},
    prestige:()=>({pointsPerPrestige:9,capacity20:v19PrestigeKeepCapacity(20),capacity60:v19PrestigeKeepCapacity(60),tenPointRemainder:10%9}),
    set:()=>({summary:mythicalSetSummary(),offhand:generateMythicalOffhand()}),
    petSwitch:()=>({classId:player.classId,petTagged:v19PetTaggedClass(),gameStarted,beastmasterTagged:(CLASSES.beastmaster.tags||[]).includes("pet")}),
    paladinGrace:()=>{meta.unlocks.paladin=true;resetPlayer("paladin");player.hp=Math.max(1,player.maxHp-20);healPlayer(10);return {grace:player.paladinGrace,hp:player.hp};},
    outsidePotion:()=>{meta.unlocks.ranger=true;resetPlayer("ranger");gameStarted=true;runFinalized=false;rollLocked=false;boardLevel=1;player.position=0;generateBoard();buildBoard();player.hp=Math.max(1,player.maxHp-10);player.potions=1;const before=ensureAlphaMeta().potionsUsed||0;usePotionOutsideCombat();return {used:(ensureAlphaMeta().potionsUsed||0)-before,potions:player.potions};},
    statusCounts:()=>statusDotsHTML(5,7),
    haste:async()=>{meta.unlocks.ranger=true;resetPlayer("ranger");gameStarted=true;player.maxHp=999;player.hp=999;const e={name:"Cooldown Dummy",icon:"🎯",hp:9999,maxHp:9999,attack:1,defense:0,weakness:"fire",affinity:null,poisonStacks:0,enemyBarrier:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyTile=0;player.hasteTurns=1;player.hasteCooldown=0;await resolveEnemyResponse(false);const afterUse=player.hasteCooldown;const beforeBlocked=player.hasteTurns;triggerElementEffect("coffee",e,{forced:true,source:"Regression"});const blocked=player.hasteTurns===beforeBlocked;await resolveEnemyResponse(false);return {afterUse,blocked,afterEnemyTurn:player.hasteCooldown};},
    forceFifthWin:async()=>{meta.unlocks.ranger=true;resetPlayer("ranger");gameStarted=true;runFinalized=false;v19CompletingSixth=false;boardLevel=5;player.position=0;generateBoard();buildBoard();player.position=currentTileCount()-1;currentEnemyTile=player.position;currentEnemies=[{name:"Regression Ring Tyrant",icon:"💍🐉",hp:0,maxHp:1,attack:1,defense:0,xp:0,gold:0,boss:true,guardian:true,finalBoss:true}];currentEnemy=currentEncounterLead=currentEnemies[0];v16CombatKind="final";const oldRandom=Math.random;Math.random=()=>1;try{await winCombat();await delay(80);}finally{Math.random=oldRandom;}return {boardLevel,gameStarted,doubleDice:!!meta.doubleDiceUnlocked,endHidden:$('endOverlay')?.classList.contains('hidden')};},
    forceSixthWin:async()=>{meta.unlocks.ranger=true;resetPlayer("ranger");gameStarted=true;runFinalized=false;v19CompletingSixth=false;boardLevel=6;player.position=0;generateBoard();buildBoard();player.position=currentTileCount()-1;currentEnemyTile=player.position;currentEnemies=[{name:"Regression Last Equation",icon:"♾️🐉",hp:0,maxHp:1,attack:1,defense:0,xp:0,gold:0,boss:true,guardian:true,finalBoss:true}];currentEnemy=currentEncounterLead=currentEnemies[0];v16CombatKind="final";const oldRandom=Math.random;Math.random=()=>1;try{await winCombat();await delay(80);}finally{Math.random=oldRandom;}return {boardLevel,gameStarted,runFinalized,endHidden:$('endOverlay')?.classList.contains('hidden')};}
  }});


  // Final refresh.
  upgrades.forEach(inferUpgradeTags);saveMeta();renderTalents();renderPetCollection();renderClassChoices();renderInfo();updateHUD();


  /* SEMANTIC OWNER — Campsite hub, Perfected Signatures and powerup selection UI. Migrated from the retired Alpha legacy stack in 3.1.6. */
/* ---------- Alpha v2.0: camp hub, set readability and alchemy tuning ---------- */
(function(){
  const V="Alpha v2.0";
  document.title=`Dicebound: ${V}`;
  const brandTitle=document.querySelector('.brand h1');if(brandTitle)brandTitle.textContent=`Dicebound: ${V}`;
  const brandSub=document.querySelector('.brand p');if(brandSub)brandSub.textContent=`${V} · Six roads, impossible builds and a proper between-runs camp.`;

  const alchemistRequirement=50;
  if(CLASSES.alchemist)CLASSES.alchemist.unlock=`Use ${alchemistRequirement} potions across all runs`;
  const baseClassUnlockedV110=baseClassUnlocked;
  baseClassUnlocked=function(id){if(id==="alchemist")return !!meta.unlocks?.alchemist||((meta.stats?.potionsUsed||0)>=alchemistRequirement);return baseClassUnlockedV110(id);};
  const checkDynamicClassUnlocksV110=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(){checkDynamicClassUnlocksV110();if((meta.stats?.potionsUsed||0)>=alchemistRequirement)unlockClass("alchemist");};

  generatePhilosophersStone=function(){return {id:`philosopher_stone_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:"amulet",rarity:"omega",mythical:true,bloodmageStone:true,icon:"🜂",name:"Philosopher's Stone",uniqueEffect:"Scarlet Transmutation: healing beyond full grants +2 attack for the rest of the battle and blood-fuelled abilities cost less life.",bonuses:{maxHp:36,attack:12,lifeSteal:.24,crit:.20,luck:.20,bossDamage:.18}};};

  const occultSpellAttackV110Base=occultSpellAttack;
  occultSpellAttack=async function(){
    if(player.classId!=="rouge")return occultSpellAttackV110Base();
    if(combatBusy||!currentEnemy)return;const cfg=OCCULT_SPELLS[player.classId];if(!cfg||player.mana<cfg.cost)return;combatBusy=true;player.guardCooldown=0;player.mana-=cfg.cost;player.combatActionCount++;
    const target=currentEnemy;await animateClassAttack("crit");let damage=0,extra="";
    const tiers=rollTieredProc(player.crit+.35);damage=Math.round((player.attack*1.85+rand(3,8))*(1+tiers));
    if(livingEnemies().length>1){const splash=Math.max(1,Math.round(damage*.28));livingEnemies().filter(e=>e!==target).forEach(e=>damageEnemy(e,splash));extra=` Scarlet paint splashes the rest of the pack for ${splash} each.`;}
    damage=Math.round(damage*(1+player.damageBonus+v19SetDamageBonus()));if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));const dealt=damageEnemy(target,damage);
    const heal=Math.max(1,Math.floor(dealt*Math.max(0,player.lifeSteal)*2));if(heal>0){const restored=healPlayer(heal);extra+=` Scarlet Hex drinks back ${restored} HP.`;}
    chargeUltimate(Math.max(8,Math.round(player.ultimateAttackGain*.65)));setCombatText(`${cfg.spellIcon} ${cfg.spell} spends ${cfg.cost} Mana and deals ${dealt} damage.${extra}`);sfx.crit();updateCombatUI();await delay(720);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);
  };

  const debugActionV110Base=debugAction;
  debugAction=function(action){
    const result=debugActionV110Base(action);
    if(action==="mythic"&&gameStarted){[generateMythicalRing,generateMythicalOffhand].forEach(fn=>equipItem(fn(),true));renderEquipment();updateHUD();showToast("Full seven-piece Impossible Road set equipped");}
    if(action==="omega_stone"&&gameStarted){renderEquipment();updateHUD();}
    return result;
  };


  // Camp DOM/presentation ownership moved to runtime/js/ui/camp.js.  These
  // compatibility-shaped callers preserve current lifecycle order only.
  function v110EnsureCampScene(){return window.DiceboundCamp?.ensure();}
  function v110UpdateCampScene(){return window.DiceboundCamp?.refresh();}


  const openStartScreenV110Base=openStartScreen;
  openStartScreen=function(){const result=openStartScreenV110Base();v110EnsureCampScene();v110UpdateCampScene();return result;};
  const updateMetaUIV110Base=updateMetaUI;
  updateMetaUI=function(){const result=updateMetaUIV110Base();v110EnsureCampScene();v110UpdateCampScene();return result;};

  // The module is configured after all legacy action owners have initialized;
  // this timer deliberately runs after that deterministic bootstrap boundary.
  setTimeout(()=>{v110EnsureCampScene();v110UpdateCampScene();renderEquipment();},0);
})();


/* ---------- Alpha v2.1: Perfected Signatures + full eligible powerup chooser ---------- */
(function(){
  const VERSION="Alpha v2.1";
  document.title=`Dicebound: ${VERSION}`;
  const brandTitle=document.querySelector('.brand h1');if(brandTitle)brandTitle.textContent=`Dicebound: ${VERSION}`;
  const brandSub=document.querySelector('.brand p');if(brandSub)brandSub.textContent=`${VERSION} · Every class has a perfected signature, and the road can expose the whole eligible power pool.`;

  const style=document.createElement('style');
  style.textContent=`
    #powerupOverlay.all-powerup-selection .modal{max-width:min(1180px,96vw)}
    #powerupOverlay.all-powerup-selection #powerupGrid{max-height:68vh;overflow:auto;padding-right:5px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
    .all-powerup-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 12px}
    .all-powerup-search{flex:1;min-width:220px;border:1px solid rgba(255,255,255,.14);background:rgba(5,9,18,.62);color:var(--ink);border-radius:11px;padding:10px 12px;font:inherit;outline:none}
    .all-powerup-search:focus{border-color:rgba(101,169,255,.55);box-shadow:0 0 0 2px rgba(101,169,255,.08)}
    .all-powerup-count{font-size:11px;color:var(--muted);white-space:nowrap}
    .choice-desc.signature-current{color:#fff}
  `;
  document.head.appendChild(style);

  /*
    Every class gets one deliberately explicit Perfected Signature definition.
    The description and application live together here so UI text can never
    silently drift away from the actual effect for a class.
  */
  const PERFECTED_SIGNATURES={
    ranger:{desc:'Perfected Signature — Ranger: maximum Marks +2.',apply(){player.rangerMarkMax=(player.rangerMarkMax||3)+2;}},
    sorcerer:{desc:'Perfected Signature — Sorcerer: +25 Max Mana, +6 Mana from Channel Bolt, and +10% Arcane Surge chance.',apply(){player.maxMana=(player.maxMana||100)+25;player.mana=Math.min(player.maxMana,(player.mana||0)+25);player.manaBuilderBonus=(player.manaBuilderBonus||0)+6;player.classBurst+=.10;}},
    fighter:{desc:'Perfected Signature — Fighter: store +1 Counterblow and each stored Counterblow deals +20% more damage.',apply(){player.fighterCounterMax=(player.fighterCounterMax||1)+1;player.fighterCounterPowerBonus=(player.fighterCounterPowerBonus||0)+.20;}},
    monk:{desc:'Perfected Signature — Monk: maximum Flowing Combo +2.',apply(){player.monkComboMax=(player.monkComboMax||5)+2;}},
    clown:{desc:'Perfected Signature — Clown: +12% Unlicensed Comedy chance and Final Punchline deals +25% damage.',apply(){player.classBurst+=.12;player.classUltimateBonus+=.25;}},
    rouge:{desc:'Perfected Signature — Rouge: +25 Max Mana, +6 Mana from Crimson Stroke, and +10% Lifesteal.',apply(){player.maxMana=(player.maxMana||100)+25;player.mana=Math.min(player.maxMana,(player.mana||0)+25);player.manaBuilderBonus=(player.manaBuilderBonus||0)+6;player.lifeSteal+=.10;}},
    berserker:{desc:'Perfected Signature — Berserker: below half HP, Blood Rage deals another +25% damage; also gain +12 Max HP.',apply(){player.berserk=(player.berserk||0)+.25;player.maxHp+=12;player.hp+=12;}},
    turtle:{desc:'Perfected Signature — Turtle: maximum Shell Momentum +2 and +4% base Guard power.',apply(){player.turtleGuardMax=(player.turtleGuardMax||5)+2;player.guardPower=clamp(player.guardPower+.04,0,.90);}},
    frog:{desc:'Perfected Signature — Frog: +40% Echo Strike and Echo Strikes deal +10% more damage.',apply(){player.doubleStrike+=.40;player.echoDamageScale=(player.echoDamageScale||.70)+.10;}},
    d20:{desc:'Perfected Signature — Twenty-Sider: +15% chance for an extra probability bonus and +8% chance to force a 17–20 roll.',apply(){player.d20BonusChance=(player.d20BonusChance||0)+.15;player.d20HighRollChance=(player.d20HighRollChance||0)+.08;}},
    slime:{desc:'Perfected Signature — Slime: Borrowed Shapes gains +12% all damage, +12% Echo Strike, and +8% elemental activation.',apply(){player.damageBonus+=.12;player.doubleStrike+=.12;player.elementProcBonus+=.08;}},
    vampire:{desc:'Perfected Signature — Vampire: +20% Lifesteal, +20 Max Mana, and +5 Mana from Night Siphon.',apply(){player.lifeSteal+=.20;player.maxMana=(player.maxMana||100)+20;player.mana=Math.min(player.maxMana,(player.mana||0)+20);player.manaBuilderBonus=(player.manaBuilderBonus||0)+5;}},
    ninja:{desc:'Perfected Signature — Ninja: Smoke Execution needs 1 fewer Smoke and critical Echoes deal +15% damage.',apply(){player.ninjaSmokeNeed=Math.max(1,(player.ninjaSmokeNeed||3)-1);player.ninjaSmoke=Math.min(player.ninjaSmoke||0,player.ninjaSmokeNeed);player.criticalEchoBonus=(player.criticalEchoBonus||0)+.15;}},
    ceo:{desc:'Perfected Signature — CEO: +20% Boss Damage and every 400 gold adds +1 effective Attack.',apply(){player.bossDamage+=.20;player.goldAttackScale=Math.max(player.goldAttackScale||0,.0025);}},
    merchant:{desc:'Perfected Signature — Merchant: +50% gold, +15% shop discount, and +5 Mana from Ledger Tap.',apply(){player.goldBonus+=.50;player.shopDiscount+=.15;player.manaBuilderBonus=(player.manaBuilderBonus||0)+5;}},
    cleric:{desc:'Perfected Signature — Cleric: healing generates 35% more Faith and Blessed attack heals gain +2 HP.',apply(){player.clericFaithGainBonus=(player.clericFaithGainBonus||0)+.35;player.clericHealBonus=(player.clericHealBonus||0)+2;}},
    paladin:{desc:'Perfected Signature — Paladin: healing generates 50% more Oath Grace and base Guard power increases by 4%.',apply(){player.paladinGraceGainBonus=(player.paladinGraceGainBonus||0)+.50;player.guardPower=clamp(player.guardPower+.04,0,.90);}},
    beastmaster:{desc:'Perfected Signature — Beastmaster: companion attacks gain +6 damage and +20% double-attack chance.',apply(){player.petDamageBonus+=6;player.petDoubleChance+=.20;}},
    rogue:{desc:'Perfected Signature — Rogue: Steal gains +15% success chance and successful steals yield 50% more gold.',apply(){player.rogueStealChanceBonus=(player.rogueStealChanceBonus||0)+.15;player.rogueStealGoldMult=(player.rogueStealGoldMult||1)*1.50;}},
    bloodmage:{desc:'Perfected Signature — Bloodmage: Exsanguinate costs 25% less HP and deals 25% more damage.',apply(){player.bloodmageExsanguinateCostMult=(player.bloodmageExsanguinateCostMult||1)*.75;player.bloodmageExsanguinateDamageMult=(player.bloodmageExsanguinateDamageMult||1)*1.25;}},
    summoner:{desc:'Perfected Signature — Summoner: Spirit Circle holds +1 spirit and summoned spirits deal +25% damage.',apply(){player.summonerCap=(player.summonerCap||3)+1;player.summonerSpiritScale=(player.summonerSpiritScale||1)+.25;}},
    pokemontrainer:{desc:'Perfected Signature — Pokémon Trainer: +20% roster assist chance, assists deal +25% more damage, and Six-Pack Stampede gains +15% damage.',apply(){player.trainerAssistBonus=(player.trainerAssistBonus||0)+.20;player.trainerAssistScale=(player.trainerAssistScale||.65)+.25;player.trainerUltimateBonus=(player.trainerUltimateBonus||0)+.15;}},
    alchemist:{desc:'Perfected Signature — Alchemist: Combat Distillery needs 1 fewer basic attack to brew and Volatile Flask deals +35% damage.',apply(){player.alchemistBrewNeed=Math.max(1,(player.alchemistBrewNeed||3)-1);player.alchemistFlaskBonus=(player.alchemistFlaskBonus||0)+.35;}},
    ouroboros:{desc:'Perfected Signature — Ouroboros: +75% Echo Strike, Poison gains +8% Attack damage per stack, and +5% random-element chance.',apply(){player.doubleStrike+=.75;player.poisonStackPower=(player.poisonStackPower||.12)+.08;player.omniElementChance=(player.omniElementChance||0)+.05;}}
  };

  function perfectedSignatureSourceClassId(){
    if(player.classId==='slimerouge')return player.slimeRougeIdentityClass||'slime';
    return player.classId;
  }
  function perfectedSignatureForCurrentClass(){
    const sourceId=perfectedSignatureSourceClassId(),sourceClass=CLASSES[sourceId],entry=PERFECTED_SIGNATURES[sourceId]||{desc:`Perfected Signature — ${sourceClass?.name||'Current identity'}: +20% Ultimate damage.`,apply(){player.ultimateDamageBonus+=.20;}};
    if(player.classId==='slimerouge'&&sourceId!=='slimerouge'){
      const detail=String(entry.desc||'').replace(/^Perfected Signature\s*—\s*[^:]+:\s*/,'');
      return {desc:`Perfected Signature — Slime Rouge (${sourceClass?.name||sourceId} identity): ${detail}`,apply:entry.apply,sourceId};
    }
    return {...entry,sourceId};
  }
  function applyPerfectedSignatureSafe(){
    const entry=perfectedSignatureForCurrentClass(),sourceId=entry.sourceId||player.classId;
    if(sourceId==='ranger')player.rangerMarkMax=Math.max(3,player.rangerMarkMax||3);
    if(sourceId==='fighter')player.fighterCounterMax=Math.max(1,player.fighterCounterMax||1);
    if(sourceId==='summoner')player.summonerCap=Math.max(3,player.summonerCap||3);
    if(sourceId==='alchemist')player.alchemistBrewNeed=Math.max(1,player.alchemistBrewNeed||3);
    if(sourceId==='ninja')player.ninjaSmokeNeed=Math.max(1,player.ninjaSmokeNeed||3);
    entry.apply();
    return entry;
  }
  function powerupDisplayDesc(up){return window.DiceboundPowerupRegistry.describe(up,DB_POWERUP_SERVICES);}

  // The authoritative registry is intentionally read-only. Its Perfected
  // Signature entry calls this stable runtime service instead of reaching into
  // this nested UI scope directly (the old cross-scope call made the card
  // visible but unpickable in 3.2.4).
  Object.defineProperty(window,'DiceboundPerfectedSignature',{configurable:true,value:Object.freeze({
    applyCurrent:()=>applyPerfectedSignatureSafe(),
    describeCurrent:()=>perfectedSignatureForCurrentClass().desc,
    sourceClassId:()=>perfectedSignatureSourceClassId()
  })});
  // Every powerup card goes through the live description resolver. This means
  // Perfected Signature updates immediately with the current class and never
  // prints the effects for unrelated classes.
  choiceHTML=function(up){
    inferUpgradeTags(up);
    const signature=up?.id==='perfected_signature';
    return `<span class="rarity-badge">${rarityInfo[up.rarity].label}</span><span class="choice-icon">${up.icon}</span><span class="choice-name">${up.name}</span><span class="choice-desc${signature?' signature-current':''}">${powerupDisplayDesc(up)}</span><span class="choice-tags">${tagChips(up.tags,'power')}</span>`;
  };

  // Paladin's existing Grace gain happens inside the current healPlayer chain.
  // Add only the bonus portion afterwards so old healing/Faith hooks remain intact.
  const healPlayerV21Base=healPlayer;
  healPlayer=function(amount){
    const beforeGrace=player.paladinGrace||0,healed=healPlayerV21Base(amount);
    if(player.classId==='paladin'&&healed>0&&(player.paladinGraceGainBonus||0)>0){
      const normalGain=Math.max(0,(player.paladinGrace||0)-beforeGrace),extra=Math.round(normalGain*player.paladinGraceGainBonus);
      player.paladinGrace=clamp((player.paladinGrace||0)+extra,0,100);
    }
    return healed;
  };

  // Rogue: keep the established once-per-battle Steal cadence, but let the
  // Perfected Signature directly improve the thing the button actually does.
  rogueSteal=async function(){
    if(combatBusy||!currentEnemy||player.rogueStealUsed)return;
    combatBusy=true;player.rogueStealUsed=true;player.combatActionCount++;
    const chance=clamp(.48+player.luck*.22+(player.rogueStealChanceBonus||0),.48,.93),success=random()<chance;let text='';
    if(success){
      const raw=rand(10+boardLevel*4,22+boardLevel*8),gold=modifiedGold(Math.max(1,Math.round(raw*(player.rogueStealGoldMult||1))));
      player.gold+=gold;text=`🗡️ You steal ${gold} gold from ${currentEnemy.name}.`;
      const powerChance=beta021RoguePowerStealChance(player.luck),powerRoll=powerChance>0?random():1;player._beta021LastStealPower={chance:powerChance,roll:powerRoll};
      if(powerChance>0&&powerRoll<powerChance){
        const choices=getUpgradeChoices(),stolen=choices.length?pick(choices):null;
        if(stolen){applyUpgrade(stolen,'Rogue Steal');text+=` <b>Jackpot:</b> you also steal the powerup ${stolen.name}!`;showToast(`🗡️ Stolen powerup: ${stolen.name}`);}
      }
      if(random()<.18){player.potions++;text+=' You also somehow steal a potion.';}
      identityFlash('🪙 Steal succeeded');sfx.coin();
    }else{text=`🗡️ ${currentEnemy.name} catches your hand. You steal absolutely nothing.`;identityFlash('🚫 Caught!');}
    setCombatText(text);updateHUD();updateCombatUI();await delay(620);await resolveEnemyResponse(false);
  };

  // Bloodmage: centralize Exsanguinate's signature multipliers in the action,
  // so the card's 25% cheaper / 25% stronger wording is literally true.
  bloodmageExsanguinate=async function(){
    if(combatBusy||!currentEnemy)return;combatBusy=true;player.guardCooldown=0;player.combatAttackCount++;player.combatActionCount++;
    const costMult=player.bloodmageExsanguinateCostMult||1,damageMult=player.bloodmageExsanguinateDamageMult||1;
    const paid=Math.max(1,Math.ceil(player.maxHp*.12*costMult));player.hp=Math.max(1,player.hp-paid);const chaos=await rollD20Chaos('attack');updateCombatUI();await animateClassAttack('crit');
    let damage=Math.round((player.attack*2.45+paid*1.9)*(chaos.mult||1)*(1+player.damageBonus+v19SetDamageBonus())*damageMult);if(currentEncounterLead?.boss)damage=Math.round(damage*(1+player.bossDamage));
    const primary=currentEnemy,first=damageEnemy(primary,damage),second=livingEnemies().find(e=>e!==primary);let splash=0;if(second)splash=damageEnemy(second,Math.round(damage*.65));
    const ring=applyMythicRingPulse(),total=first+splash;setCombatText(`🩸 Exsanguinate spends ${paid} HP to deal ${first} to ${primary.name}${second?` and ${splash} to ${second.name}`:''} (${total} total).${ring?` ${ring}`:''}`);
    sfx.hit();updateCombatUI();await delay(820);if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);
  };

  const resetPlayerV21Base=resetPlayer;
  resetPlayer=function(classId=selectedClassId){
    resetPlayerV21Base(classId);
    player.paladinGraceGainBonus=0;
    player.rogueStealChanceBonus=0;player.rogueStealGoldMult=1;
    player.bloodmageExsanguinateCostMult=1;player.bloodmageExsanguinateDamageMult=1;
  };

  /*
    Full eligible-powerup picker. Unlike getUpgradeChoices(), this deliberately
    does not sample or weight the pool: every powerup currently returned by
    eligibleUpgrades() is displayed once. That automatically respects class,
    achievement, unique-taken and Slime borrowing rules.
  */
  function showAllEligiblePowerupSelection(source='Special Powerup Selection',onComplete=()=>{},filter=()=>true){
    if(!gameStarted){showToast('Start a run before opening the full powerup list.');return false;}
    const pool=eligibleUpgrades(filter).slice();
    const rarityOrder={legendary:0,epic:1,rare:2,uncommon:3,common:4};
    pool.sort((a,b)=>(rarityOrder[a.rarity]??9)-(rarityOrder[b.rarity]??9)||a.name.localeCompare(b.name));
    $('powerupTitle').textContent=source;
    $('powerupSubtitle').innerHTML=`Choose <b>one</b> powerup from every option currently eligible for ${CLASSES[player.classId]?.icon||''} ${CLASSES[player.classId]?.name||'this run'}. Locked, class-ineligible and already-consumed Unique powers are omitted.`;
    const overlay=$('powerupOverlay'),grid=$('powerupGrid');overlay.classList.add('all-powerup-selection');grid.innerHTML='';
    let tools=overlay.querySelector('.all-powerup-tools');if(tools)tools.remove();
    tools=document.createElement('div');tools.className='all-powerup-tools';tools.innerHTML=`<input class="all-powerup-search" type="search" placeholder="Search eligible powerups…"><span class="all-powerup-count"></span>`;grid.before(tools);
    const count=tools.querySelector('.all-powerup-count'),search=tools.querySelector('.all-powerup-search');
    const cards=[];
    for(const up of pool){
      const btn=document.createElement('button');btn.className=`choice-btn ${up.rarity}`;btn.dataset.search=`${up.name} ${powerupDisplayDesc(up)} ${up.rarity} ${(up.tags||[]).join(' ')}`.toLowerCase();btn.innerHTML=choiceHTML(up);
      btn.addEventListener('click',()=>{applyUpgrade(up,source);addLog(`<b>${source}:</b> chose ${up.name} (${rarityInfo[up.rarity].label}) from the full eligible pool.`);showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);overlay.classList.add('hidden');overlay.classList.remove('all-powerup-selection');tools.remove();updateHUD();onComplete(up);});
      cards.push(btn);grid.appendChild(btn);
    }
    const updateCount=()=>{const visible=cards.filter(c=>c.style.display!=='none').length;count.textContent=`${visible} / ${pool.length} eligible`;};
    search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();cards.forEach(c=>c.style.display=!q||c.dataset.search.includes(q)?'':'none');updateCount();});
    updateCount();overlay.classList.remove('hidden');setTimeout(()=>search.focus(),0);return true;
  }
  window.DiceboundPowerups=Object.freeze({
    openAllEligible:(source='Special Powerup Selection',onComplete=()=>{},filter=()=>true)=>showAllEligiblePowerupSelection(source,onComplete,filter),
    eligible:()=>eligibleUpgrades().slice(),
    perfectedSignature:()=>({...perfectedSignatureForCurrentClass(),apply:undefined})
  });

  // Debug access makes the reusable selector easy to regression-test in an
  // ordinary run without manufacturing a special event first.
  const refreshDebugButtonsV21Base=refreshDebugButtons;
  refreshDebugButtons=function(){
    refreshDebugButtonsV21Base();const grid=$('debugGrid');if(!grid)return;
    let btn=grid.querySelector('[data-debug="all_powerups"]');if(!btn){btn=document.createElement('button');btn.dataset.debug='all_powerups';btn.className='small-btn';grid.appendChild(btn);}btn.textContent='🎁 Choose any eligible powerup';
  };
  const debugActionV21Base=debugAction;
  debugAction=function(action){if(action==='all_powerups'){if(!gameStarted){showToast('Start a run first');return;}$('debugOverlay').classList.add('hidden');showAllEligiblePowerupSelection('Debug · Full Eligible Powerup List',()=>{});return;}return debugActionV21Base(action);};
  refreshDebugButtons();

  // Tiny regression hooks kept out of visible UI.

})();


  /* SEMANTIC OWNER — Fullscreen camp, talent presentation and guardian/UI refinements. Migrated from the retired Alpha legacy stack in 3.1.6. */
/* ---------- Alpha v2.2: full-screen camp, progressive set tiers and 2d6 fate ---------- */
(function(){
  const V='Alpha v2.2';
  document.title=`Dicebound: ${V}`;
  const h=document.querySelector('.brand h1');if(h)h.textContent=`Dicebound: ${V}`;
  const p=document.querySelector('.brand p');if(p)p.textContent=`${V} · The Legacy Camp is now a real full-screen between-runs state, with cleaner meta-progression and fate controls.`;

  // Older class-render layers still write the legacy start button label. The
  // visual camp no longer uses that button, but keeping a hidden compatibility
  // target prevents those inherited renderers from dereferencing null.
  if(!$('startBtn')){const compat=document.createElement('button');compat.id='startBtn';compat.className='camp-hidden';compat.type='button';compat.setAttribute('aria-hidden','true');$('startOverlay')?.querySelector('.start-modal')?.appendChild(compat);}

  // ----- Impossible Road now has a continuous 2/3/4/5/6/7-piece curve. -----
  v19SetDamageBonus=function(){const n=mythicalSetCount();return n>=7?.28:n>=6?.19:n>=5?.14:n>=4?.10:n>=3?.07:n>=2?.03:0;};
  v19SetProcBonus=function(){const n=mythicalSetCount();return n>=7?.18:n>=6?.14:n>=5?.10:n>=4?.08:n>=3?.06:0;};
  v19SetPetDoubleBonus=function(){const n=mythicalSetCount();return n>=7?.20:n>=6?.17:n>=5?.14:n>=4?.12:0;};
  v19SetElementPower=function(){const n=mythicalSetCount();return n>=7?1.22:n>=6?1.14:n>=5?1.08:1;};
  v19SetStartUltimate=function(){const n=mythicalSetCount();return n>=7?50:n>=6?45:n>=5?40:n>=4?35:0;};
  v19SetGuardianSpecialMult=function(){const n=mythicalSetCount();return n>=7?.72:n>=6?.79:n>=5?.85:n>=4?.90:1;};
  mythicalSetSummary=function(){const n=mythicalSetCount();return `${n}/7 Impossible Road pieces · 2: +3% all damage · 3: +7% all damage and +6% elemental proc chance · 4: +10% damage, +8% proc, 35 starting Ultimate, 1 Barrier, +12% pet double chance, 10% less guardian-special damage · 5: +14% damage, +10% proc, +8% elemental power, 40 starting Ultimate, +14% pet double chance, 15% less guardian-special damage · 6: +19% damage, +14% proc, +14% elemental power, 45 starting Ultimate, +17% pet double chance, 21% less guardian-special damage · 7: +28% damage, +18% proc, +22% elemental power, 50 starting Ultimate, +20% pet double chance, 28% less guardian-special damage, plus the low-HP recovery/barrier effect.`;};
  function v22CampSummaryText(){return `Legacy Lv ${meta.level} · ${meta.points} unspent · Prestige ${meta.prestige?.count||0} · ${meta.doubleDiceUnlocked?'Double Dice ready':'Clear Board 5 to unlock Double Dice'}`;}
  // Camp presentation stays behind the existing names while its DOM, layout,
  // art and click-target ownership live in DiceboundCamp.
  function v22UpdateCamp(){return window.DiceboundCamp?.refresh();}
  function v22EnsureCompatStartBtn(){return window.DiceboundCamp?.ensureCompatStartButton();}
  function openPrestigeMoon(){return window.DiceboundPrestigeMoon?.open?.()||null;}

  const updateMetaUIV22Base=updateMetaUI;
  updateMetaUI=function(){const result=updateMetaUIV22Base();v22UpdateCamp();return result;};
  const openStartScreenV22Base=openStartScreen;
  openStartScreen=function(){const result=openStartScreenV22Base();v22UpdateCamp();return result;};

  // This adapter intentionally lives in the v2.2 lexical scope: it supplies
  // presentation data/actions, while ui/camp.js remains the sole DOM/layout
  // owner and keeps domain mechanics in their existing modules.
  window.DiceboundCamp?.configure({
    find:$,
    getViewModel:()=>{
      const randomClass=!!window.DiceboundClassChooser?.isRandomMode?.(),cls=randomClass?{id:'random',name:'Random',icon:'🎲'}:(CLASSES[selectedClassId]||CLASSES.ranger),pet=PETS[meta.activePet]||PETS.neutral,state=meta.pets?.[meta.activePet]||{level:1};
      return {
        classId:cls.id,className:cls.name,classIcon:cls.icon,
        petId:pet.id,petName:pet.name,petIcon:pet.icon,petLine:`${pet.icon} ${pet.name} · Bond Lv ${state.level}`,
        summary:v22CampSummaryText(),
        prestigeSummary:`${prestigeSummary()} · ${allocatedTalentPoints()+(meta.points||0)} total talent points · every 9 becomes 1 Prestige point.`,
        ...dbEquipmentUi.campView(),
        reveals:{...(meta.campReveals||{})},heirloomStorageUnlocked:!!meta.heirloomStorageUnlocked||!!v24StorageUnlocked?.(),
        nightmareUnlocked:!!meta.nightmareUnlocked,nightmareMode:!!nightmareMode,
        hellUnlocked:!!meta.hellUnlocked,hellMode:!!hellMode
      };
    },
    actions:{
      showClassChoices:()=>renderClassChoices(),
      renderEquipment:()=>renderEquipment(),
      renderTalents:()=>renderTalents(),
      openTalents:()=>openTalentTree('startOverlay'),
      openPrestigeMoon:()=>openPrestigeMoon(),
      openInfo:()=>openInfo(),
      openAchievements:()=>window.DiceboundAchievementsUi?.open?.(),
      openPets:()=>window.DiceboundPetChooser?.open(),
      startRun:()=>startNewGame(),
      toggleNightmare:()=>{if(!meta.nightmareUnlocked){showToast('Nightmare is still locked');return;}nightmareMode=!nightmareMode;if(!nightmareMode)hellMode=false;renderClassChoices();showToast(`Nightmare ${nightmareMode?'enabled':'disabled'}`);},
      toggleHell:()=>{if(!meta.hellUnlocked){showToast('Hell is still locked');return;}hellMode=!hellMode;if(hellMode)nightmareMode=true;renderClassChoices();showToast(`Hell ${hellMode?'enabled':'disabled'}`);},
      resetProgress:async()=>{if(await diceboundConfirm('Reset all Dicebound progress, achievements, pets, heirlooms and unlocks? This cannot be undone.',{title:'Reset ALL Dicebound progress?',confirmLabel:'Reset everything',danger:true})){window.DiceboundSave?.reset();window.DiceboundPlatform?.reload();}}
    }
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
    isUnlocked:id=>isClassUnlocked(id),
    ensureDynamicUnlocks:()=>checkDynamicClassUnlocks(),
    setSelectedClassId:id=>{selectedClassId=id;},
    pick,
    tagChips,
    resolveClassArt:id=>window.DiceboundAssets?.resolveClassArt?.(id),
    getAlchemistProgress:()=>{
      const used=Math.floor(meta.stats?.potionsUsed||0),match=String(CLASSES.alchemist?.unlock||'').match(/(\d+)\s+potions/i);
      return {used,required:Number(match?.[1])||15};
    },
    identityNote:cls=>{
      if(MANA_OCCULT_CLASSES.has(cls.id)){const spell=OCCULT_SPELLS[cls.id];return spell?`Mana class — ${spell.builder} builds Mana; ${spell.spell} spends it.`:'Mana class.';}
      if(cls.id==='bloodmage')return 'Occult blood-fuel class — HP replaces Mana.';
      if(cls.id==='rogue')return 'Extra combat action — Steal once per battle.';
      if(cls.id==='beastmaster')return 'Extra combat control — switch pet stance.';
      if(cls.id==='cleric')return 'Healing builds Faith for Consecration.';
      if(cls.id==='summoner')return 'Mana pet-caster — build a temporary spirit circle every battle.';
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
    getState:()=>({
      pets:Object.values(PETS),petStates:meta.pets||{},elementProgress:meta.elementProgress||{},
      activePetId:meta.activePet,cookies:meta.petCookies||0,unlockRequirement:PET_UNLOCK_REQUIREMENT,
      runActive:!!gameStarted
    }),
    canSwitch:id=>v19CanSwitchPet(id),
    damageFor:(id,state)=>{
      const petState=state.petStates?.[id]||{level:1};
      return 1+Math.ceil((petState.level||1)*.8)+(id!=='neutral'?v17PetDamageExtra(id):0);
    },
    bonusFor:(id)=>id==='neutral'?'Neutral companion · no stat bonus':v17PetBonusText(id),
    elementName:id=>ELEMENTS[id]?.name||'elemental',
    resolvePetArt:id=>window.DiceboundAssets?.resolvePetArt?.(id),
    selectPet:id=>{
      if(!v19CanSwitchPet(id)||meta.activePet===id||!meta.pets?.[id]?.unlocked)return false;
      const def=PETS[id]||PETS.neutral;meta.activePet=id;saveMeta();if(gameStarted)syncActivePetBonusV16();updateMetaUI();updateHUD();showToast(`${def.icon} ${def.name} selected`);return true;
    },
    feed:count=>feedActivePet(count),
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
      return {level:meta.level,points:meta.points,runs:meta.runs,petLabel:`${pet.name} Lv ${petState.level||1}`,heirlooms:`${(meta.heirlooms||[]).length} / ${getHeirloomSlots()}`};
    },
    rankFor:talentRank,
    isAvailable:talentAvailable,
    canPurchase:t=>talentRank(t.id)<t.maxRank&&talentAvailable(t)&&meta.points>=t.cost,
    isVisible:()=>true,
    requirementText,
    purchase:id=>purchaseTalentNode(id),
    resetProgress:async()=>{if(await diceboundConfirm('Reset all Legacy XP, talents, elemental pet progress, cookies, unlocks and heirlooms?',{title:'Reset Legacy progress?',confirmLabel:'Reset',danger:true})){window.DiceboundSave.reset();meta=defaultMeta();saveMeta();renderTalents();showToast('Legacy progress reset');}},
    afterRender:()=>updateMetaUI()
  });
  // #178 / #209: the Moon destination owns only presentation. This adapter
  // exposes the authoritative Prestige transaction/state boundary and keeps
  // saves, effective stats, reset semantics and RNG in their existing owners.
  const db064PrestigeMoon=window.DiceboundPrestigeMoon;
  if(!db064PrestigeMoon)throw new Error('DiceBound requires the Prestige Moon UI module before dicebound.js');
  db064PrestigeMoon.configure({
    find:$,
    getState:()=>{
      const total=allocatedTalentPoints()+(meta.points||0),offer=db0633PrestigeOfferPoints(total);
      return {prestige:DB_PRESTIGE.inspect(meta.prestige),canPrestige:offer>0,prestigeOffer:offer,prestigeDescription:'Every 9 total Talent Points becomes one unspent Prestige Point. Each unspent point grants one held stat point.',status:'Moon Forge cost is intentionally TBD until balance review.'};
    },
    prestige:()=>prestigeTree(),
    purchase:id=>{
      if(gameStarted){showToast('Spend Prestige Points between runs.');return Object.freeze({ok:false,reason:'Prestige Moon purchases are available between runs.'});}
      const result=DB_PRESTIGE.purchase(meta.prestige,id,random);
      if(!result.ok){showToast(result.reason);return result;}
      meta.prestige=result.prestige;
      const storagePurchase=[DB_HEIRLOOM_STORAGE_NODE,DB_HEIRLOOM_SLOT_I_NODE,DB_HEIRLOOM_SLOT_II_NODE].includes(id);
      if(storagePurchase){if(id===DB_HEIRLOOM_STORAGE_NODE)meta.heirloomStorageUnlocked=true;v24SyncStorage();dbEquipmentUi.renderCampStorage();v24RefreshCamp();showToast(`${result.node.label} purchased.`);}else showToast(`${result.node.label}: ${DB_PRESTIGE.formatStats(result.stats)}.`);
      saveMeta();updateMetaUI();return result;
    },
    refundAll:async()=>{
      if(gameStarted){showToast('Refund Prestige Points between runs.');return false;}
      const current=DB_PRESTIGE.inspect(meta.prestige);
      if(!current.refundableSpent)return false;
      if(!(await diceboundConfirm(`Refund ${current.refundableSpent} refundable Prestige Point${current.refundableSpent===1?'':'s'}? Permanent Heirloom purchases stay unlocked.`,{title:'Refund Prestige stats?',confirmLabel:'Refund stats',danger:true})))return false;
      const result=DB_PRESTIGE.refundAll(meta.prestige);meta.prestige=result.prestige;saveMeta();updateMetaUI();showToast(`Refunded ${result.refunded} Prestige Point${result.refunded===1?'':'s'}.`);return true;
    },
    afterClose:()=>v22UpdateCamp()
  });
  renderPetCollection();
  setTimeout(()=>renderClassChoices(),0);

  // ----- Debug menu: class and pet unlocks are separate destructive cheats. --
  function v22EnsureDebugUnlockButtons(){
    const grid=$('debugGrid');if(!grid)return;
    const old=grid.querySelector('[data-debug="unlock"]');if(old){old.dataset.debug='unlockclasses';old.textContent='🔓 Unlock all classes';}
    let pets=grid.querySelector('[data-debug="unlockpets"]');if(!pets){pets=document.createElement('button');pets.className='small-btn';pets.dataset.debug='unlockpets';pets.textContent='🐾 Unlock all pets';if(old)old.after(pets);else grid.appendChild(pets);}
  }
  const refreshDebugButtonsV22Base=refreshDebugButtons;
  refreshDebugButtons=function(){refreshDebugButtonsV22Base();v22EnsureDebugUnlockButtons();};
  const debugActionV22Base=debugAction;
  debugAction=function(action){
    if(action==='unlockclasses'){meta.unlocks=meta.unlocks||{};Object.keys(CLASSES).forEach(id=>meta.unlocks[id]=true);saveMeta();renderClassChoices();showToast('Debug: all classes unlocked');return;}
    if(action==='unlockpets'){meta.pets=meta.pets||defaultPets();Object.keys(PETS).forEach(id=>{meta.pets[id]=meta.pets[id]||defaultPetState(false);meta.pets[id].unlocked=true;});ELEMENT_KEYS.forEach(k=>meta.elementProgress[k]=Math.max(meta.elementProgress[k]||0,PET_UNLOCK_REQUIREMENT));saveMeta();renderPetCollection();updateMetaUI();showToast('Debug: all pets unlocked');return;}
    return debugActionV22Base(action);
  };
  refreshDebugButtons();

  // ----- Shared fate chooser for 1d6 and 2d6. -------------------------------
  async function v22ChooseDice(count,reason='Fate'){
    const values=[];for(let i=0;i<count;i++){showToast(count===2?`${reason}: choose die ${i+1} of 2`:`${reason}: choose the die`);values.push(await chooseDieResult());}return values;
  }
  function v22ShouldChooseRoll(){return !!meta.debugAlwaysChooseRolls||(player.diceChoiceChance>0&&random()<player.diceChoiceChance);}
  async function v22RollTwoDice(){
    if(rollLocked||!gameStarted||!meta.doubleDiceUnlocked)return;ensureAudio();rollLocked=true;updateHUD();const die=$('dice');die.classList.add('rolling','double-mode');for(let i=0;i<10;i++){die.textContent=`${pick(diceFaces)} + ${pick(diceFaces)}`;sfx.roll();await delay(45+i*5);}
    let a=rand(1,6),b=rand(1,6),chosen=false;if(v22ShouldChooseRoll()){[a,b]=await v22ChooseDice(2,meta.debugAlwaysChooseRolls?'Debug fate':'Fate');chosen=true;showToast(`🎲🎲 Fate chosen: ${a}+${b}=${a+b}`);}
    let bonus=0;if(!chosen&&random()<clamp(player.extraStepChance,0,.75))bonus=1;die.textContent=`${diceFaces[a-1]} + ${diceFaces[b-1]}`;die.classList.remove('rolling');rolls++;ensureAlphaMeta().rolls++;
    if(hasMythicPiece('boots')&&(a>=5||b>=5)){const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.05)));player.hp+=healed;player.ultimateCharge=clamp(player.ultimateCharge+10,0,100);showToast('🥾 Titanstep!');}
    const total=a+b;addLog(`${chosen?(meta.debugAlwaysChooseRolls?'Debug fate chooses':'Fate bends. You choose'):'Double Dice rolls'} <b>${a} + ${b} = ${total}</b>${bonus?' and Long Stride adds <b>+1</b>':''}.`);await dbBoardMovement.move(total+bonus,total,bonus>0,chosen);
  }
  function v22WireDoubleDice(){
    const old=$('roll2Btn');if(!old||old.dataset.v22Wired)return;const fresh=old.cloneNode(true);fresh.dataset.v22Wired='1';old.replaceWith(fresh);fresh.addEventListener('click',v22RollTwoDice);
  }
  const ensureDoubleV22Base=v19EnsureDoubleDiceButton;
  v19EnsureDoubleDiceButton=function(){ensureDoubleV22Base();v22WireDoubleDice();};
  v22WireDoubleDice();
  const updateHUDV22Base=updateHUD;
  updateHUD=function(){updateHUDV22Base();v19EnsureDoubleDiceButton();};

  // Public regression hooks for this patch.

  setTimeout(()=>{v22EnsureDebugUnlockButtons();v22WireDoubleDice();v22UpdateCamp();},0);
})();


/* ---------- Alpha v2.3: talents, guardian attack patterns and camp polish ---------- */
(function(){
  const V='Alpha v2.3';
  document.title=`Dicebound: ${V}`;
  const brandH=document.querySelector('.brand h1');if(brandH)brandH.textContent=`Dicebound: ${V}`;
  const brandP=document.querySelector('.brand p');if(brandP)brandP.textContent=`${V} · Cleaner talents, repaired Prestige, richer bosses and a more readable camp.`;

  const style=document.createElement('style');
  style.textContent=`
    /* Prestige survivor selection must sit above the full-screen camp. */
    #prestigeHeirloomOverlay{z-index:140!important}
    #prestigeHeirloomOverlay .modal{max-height:92vh;overflow-y:auto}
    .talent-link[data-v23-link="1"]{transition:stroke .16s ease,opacity .16s ease,stroke-width .16s ease}
    .talent-link[data-v23-link="1"].active{stroke-width:5px}
    .node-req.always-visible{display:block;margin-top:7px;color:#d9c9ff}
  `;
  document.head.appendChild(style);

  // ----- Impossible Road: 4-piece no longer grants the starting Barrier. ----
  mythicalSetSummary=function(){const n=mythicalSetCount();return `${n}/7 Impossible Road pieces · 2: +3% damage · 3: +7% damage and +6% proc · 4: +10% damage, +8% proc, 35 starting Ultimate, +12% pet double chance, 10% less Guardian-special damage · 5: +14% damage, +10% proc, +8% elemental power, 40 starting Ultimate, 1 Barrier, +14% pet double chance, 15% less Guardian-special damage · 6: +19% damage, +14% proc, +14% elemental power, 45 starting Ultimate, 1 Barrier, +17% pet double chance, 21% less Guardian-special damage · 7: +28% damage, +18% proc, +22% elemental power, 50 starting Ultimate, 1 Barrier, +20% pet double chance, 28% less Guardian-special damage and the emergency heal/barrier effect.`;};
  v19SetStartBarrier=function(){return mythicalSetCount()>=5?1:0;};

  // ----- Road Wisdom and talent prerequisite clarity. -----------------------
  const roadWisdom=talents.find(t=>t.id==='legacy_travel');
  if(roadWisdom){
    roadWisdom.desc='High rolls grant +3 additional Fast Travel XP per rank.';
    roadWisdom.requires=[req('legacy_heirloom',1)]; // sibling of Living Legend, not behind it
  }
  const flowTalent=talents.find(t=>t.id==='power_ultimate_flow');
  if(flowTalent)flowTalent.desc='Attack and Defend generate 10% more ultimate charge per rank. Unlock requirement: Stored Power rank 1.';

  // Base talent code already grants +1 Fast Travel XP/rank; add two more here
  // so Road Wisdom's real total is the documented +3/rank.
  const resetPlayerV23TalentBase=resetPlayer;
  resetPlayer=function(classId=selectedClassId){const r=resetPlayerV23TalentBase(classId);player.fastTravelBonus+=(gameplayTalentRank('legacy_travel')||0)*2;return r;};

  // Camp owns its own scene dimensions and refresh.  Keep only the inherited
  // domain refreshes that this historical checkpoint still needs.
  setTimeout(()=>{renderTalents();renderEquipment();},0);


})();


  /* ========================================================================
     Alpha v2.4 — rarity rebuild, heirloom storage and the Pale Devil
     ------------------------------------------------------------------------
     This patch intentionally remains one Edge-friendly HTML file. New systems
     are grouped into extraction-ready modules so they can later move into
     separate JS files without changing save semantics or gameplay APIs.
     ======================================================================== */
  const DB24={version:'2.4',modules:{}};

  if($('restartBtn'))$('restartBtn').textContent='⛺ Back to camp';

  const v24Style=document.createElement('style');
  v24Style.textContent=`
    /* v2.4 rarity palette. Ordinary gear stops at Epic; Legendary+ is handcrafted. */
    .choice-btn.poor,.equipment-slot.poor,.loot-card.poor{border-color:#a8adb7;background:linear-gradient(145deg,rgba(142,148,160,.14),rgba(70,75,86,.12))}
    .choice-btn.common,.equipment-slot.common,.loot-card.common{border-color:#f3f4f7;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(150,158,171,.08))}
    .choice-btn.uncommon,.equipment-slot.uncommon,.loot-card.uncommon{border-color:#82c7ff;background:linear-gradient(145deg,rgba(82,167,232,.18),rgba(35,76,120,.12))}
    .choice-btn.rare,.equipment-slot.rare,.loot-card.rare{border-color:#438bd8;background:linear-gradient(145deg,rgba(39,105,179,.23),rgba(25,55,104,.15))}
    .choice-btn.epic,.equipment-slot.epic,.loot-card.epic{border-color:#f2e49a;background:linear-gradient(145deg,rgba(230,210,99,.19),rgba(112,91,24,.13))}
    .choice-btn.legendary,.equipment-slot.legendary,.loot-card.legendary{border-color:#ffd45f;box-shadow:0 0 18px rgba(255,212,95,.18),inset 0 0 20px rgba(255,212,95,.06);background:linear-gradient(145deg,rgba(255,209,77,.24),rgba(121,77,16,.16))}
    .choice-btn.artifact,.equipment-slot.artifact,.loot-card.artifact{border-color:#ff982f;box-shadow:0 0 20px rgba(255,126,35,.20),inset 0 0 22px rgba(255,126,35,.08);background:linear-gradient(145deg,rgba(185,76,16,.29),rgba(85,36,18,.20))}
    .choice-btn.mythical,.equipment-slot.mythical,.loot-card.mythical{border-color:#bd83ff;box-shadow:0 0 22px rgba(181,105,255,.22),inset 0 0 24px rgba(181,105,255,.08);background:linear-gradient(145deg,rgba(103,44,170,.30),rgba(45,25,82,.24))}
    .choice-btn.omega,.equipment-slot.omega,.loot-card.omega{border-color:#fff;box-shadow:0 0 30px rgba(255,255,255,.22),0 0 18px rgba(168,71,255,.30),inset 0 0 28px rgba(255,255,255,.08)}
    .choice-btn.poor .rarity-badge,.loot-card.poor .rarity-badge{color:#c4c8cf}.choice-btn.common .rarity-badge,.loot-card.common .rarity-badge{color:#fff}
    .choice-btn.uncommon .rarity-badge,.loot-card.uncommon .rarity-badge{color:#a9dbff}.choice-btn.rare .rarity-badge,.loot-card.rare .rarity-badge{color:#69adff}
    .choice-btn.epic .rarity-badge,.loot-card.epic .rarity-badge{color:#f5e9a8}.choice-btn.legendary .rarity-badge,.loot-card.legendary .rarity-badge{color:#ffd45f;text-shadow:0 0 9px rgba(255,212,95,.48)}
    .choice-btn.artifact .rarity-badge,.loot-card.artifact .rarity-badge{color:#ff9c38;text-shadow:0 0 9px rgba(255,126,35,.40)}
    .choice-btn.mythical .rarity-badge,.loot-card.mythical .rarity-badge{color:#d6b4ff}.choice-btn.omega .rarity-badge,.loot-card.omega .rarity-badge{color:#fff}
    .artifact-title{color:#ff9c38;text-shadow:0 0 14px rgba(255,126,35,.42)}
    .legendary-title{color:#ffd45f;text-shadow:0 0 14px rgba(255,212,95,.40)}
    .gear-keep-btn.poor .journey-gear-name{color:#c4c8cf}.gear-keep-btn.common .journey-gear-name{color:#fff}
    .gear-keep-btn.uncommon .journey-gear-name{color:#a9dbff}.gear-keep-btn.rare .journey-gear-name{color:#69adff}
    .gear-keep-btn.epic .journey-gear-name{color:#f5e9a8}.gear-keep-btn.legendary .journey-gear-name{color:#ffd45f;text-shadow:0 0 8px rgba(255,212,95,.38)}
    .gear-keep-btn.artifact .journey-gear-name{color:#ff9c38;text-shadow:0 0 8px rgba(255,126,35,.36)}.gear-keep-btn.mythical .journey-gear-name{color:#d6b4ff}
    .gear-keep-btn.omega .journey-gear-name{color:#fff;text-shadow:0 0 8px rgba(168,71,255,.55)}
    .energy-shield-fill{position:absolute!important;left:0;top:0;bottom:0;height:100%;background:linear-gradient(90deg,rgba(78,171,255,.94),rgba(105,211,255,.82));box-shadow:0 0 14px rgba(73,173,255,.65);z-index:3;pointer-events:none;transition:width .18s ease;border-radius:inherit}
    .hpbar{position:relative;overflow:hidden}.hpbar>i:not(.energy-shield-fill){position:relative;z-index:2}
    .storage-locked{padding:12px;border-radius:13px;background:rgba(255,255,255,.04);color:var(--muted);line-height:1.5}
    .devil-ritual-armed{animation:v24DevilPulse .7s ease-in-out infinite alternate}@keyframes v24DevilPulse{from{filter:drop-shadow(0 0 4px #f44)}to{filter:drop-shadow(0 0 18px #ff4422) brightness(1.35)}}
  `;
  document.head.appendChild(v24Style);

  /* MODULE: save migration ------------------------------------------------- */
  meta.heirloomStorageUnlocked=!!meta.heirloomStorageUnlocked;
  meta.heirloomStorage=Array.isArray(meta.heirloomStorage)?meta.heirloomStorage.map(normalizeSavedItem):[];
  meta.devilPrimed=!!meta.devilPrimed;meta.devilBossKills=Number(meta.devilBossKills)||0;meta.devilHornsFound=Number(meta.devilHornsFound)||0;
  meta.legendaryRelics=Array.isArray(meta.legendaryRelics)?meta.legendaryRelics:[];
  function v24MigrateItemRarity(item){
    if(!item||item.v24Rarity)return item;
    const old=item.rarity;
    if(item.setName==='Impossible Road')item.rarity='artifact';
    else item.rarity=({common:'poor',uncommon:'common',rare:'uncommon',epic:'rare',legendary:'epic'}[old]||old);
    item.v24Rarity=true;return item;
  }
  if(!meta.raritySchemaV24){
    (meta.heirlooms||[]).forEach(v24MigrateItemRarity);meta.heirloomStorage.forEach(v24MigrateItemRarity);meta.raritySchemaV24=true;saveMeta();
  }

  /* MODULE: rarity schema -------------------------------------------------- */
  Object.assign(rarityInfo,{
    poor:{label:'Poor',weight:68},common:{label:'Common',weight:25},uncommon:{label:'Uncommon',weight:7.5},rare:{label:'Rare',weight:1.9},epic:{label:'Epic',weight:.42},legendary:{label:'Legendary',weight:.028},artifact:{label:'Artifact',weight:.003},mythical:{label:'Mythical',weight:0},omega:{label:'Omega',weight:0}
  });
  Object.assign(rarityValues,{poor:1,common:2,uncommon:3,rare:4,epic:5,legendary:7,artifact:9,mythical:11,omega:14});
  Object.assign(rarityPrefixes,{poor:'Worn',common:'Reliable',uncommon:'Fine',rare:'Royal',epic:'Godforged',legendary:'Legendary',artifact:'Artifact',mythical:'Mythical',omega:'Omega'});
  Object.keys(V14_RARITY_BUDGETS).forEach(k=>delete V14_RARITY_BUDGETS[k]);
  Object.assign(V14_RARITY_BUDGETS,{poor:[11,18],common:[20,31],uncommon:[34,49],rare:[54,76],epic:[84,116]});
  Object.keys(V14_RARITY_AFFIX_TIER).forEach(k=>delete V14_RARITY_AFFIX_TIER[k]);
  Object.assign(V14_RARITY_AFFIX_TIER,{poor:1,common:2,uncommon:3,rare:4,epic:5});
  elementChanceForRarity=function(rarity){return {poor:.14,common:.24,uncommon:.36,rare:.50,epic:.67,legendary:.90,artifact:1,mythical:1,omega:1}[rarity]||0;};
  rollGearRarity=function(bonus=0){
    const p=random(),depth=(boardLevel-1)+player.position/Math.max(1,currentTileCount()-1),rawLuck=Math.max(0,player.luck||0),luck=1-Math.exp(-rawLuck*.55),boost=bonus+depth*.055+luck*.44+(nightmareMode?.035:0)+(hellMode?.035:0);
    if(p<.006+boost*.055)return 'epic';
    if(p<.038+boost*.14)return 'rare';
    if(p<.145+boost*.31)return 'uncommon';
    if(p<.45+boost*.58)return 'common';
    return 'poor';
  };
  v14RawSellValue=function(item){const p=v14FallbackPower(item),mult={poor:.68,common:.82,uncommon:.98,rare:1.16,epic:1.40,legendary:2.15,artifact:2.6,mythical:3.1,omega:4.2}[item?.rarity]||1;return Math.max(6,Math.round((10+p*1.45+p*p*.042)*mult));};
  itemSellValue=function(item){return v14RawSellValue(item);};

  // Board merchants understand the shifted ordinary rarity ladder. They can
  // sell Poor→Epic generated gear; handcrafted Legendary+ pieces never enter
  // ordinary merchant inventory.
  makeMerchantGear=function(){
    const b=boardLevel,bonus={1:.05,2:.18,3:.34,4:.52,5:.72,6:.95}[b]||.95;let rarity=rollGearRarity(bonus);
    if(b>=2&&rarity==='poor'&&random()<.60)rarity='common';if(b>=3&&rarity==='poor')rarity='common';
    if(b>=3&&rarity==='common'&&random()<(b===3?.22:b===4?.34:.48))rarity='uncommon';
    if(b>=4&&rarity==='uncommon'&&random()<(b===4?.12:b===5?.20:.32))rarity='rare';if(b>=5&&rarity==='rare'&&random()<(b===5?.08:.18))rarity='epic';
    const gear=generateEquipment(rarity),markup=[0,1.7,1.9,2.15,2.45,2.75,3.25][b]||3.25,base=Math.round(v14RawSellValue(gear)*markup);return {id:gear.id,icon:gear.icon,name:gear.name,desc:`${SLOT_LABELS[gear.slot]} · ${formatBonuses(gear)}`,gear,base,buy(){equipItem(gear);return gear;}};
  };

  /* MODULE: powerup tier rebuild ------------------------------------------ */
  const V24_POWER_SHIFT={common:'poor',uncommon:'common',rare:'uncommon',epic:'rare',legendary:'epic'};
  upgrades.forEach(up=>{if(!up.v24Tiered){up.rarity=V24_POWER_SHIFT[up.rarity]||up.rarity;up.v24Tiered=true;}const dd=Object.getOwnPropertyDescriptor(up,'desc');if(dd&&Object.prototype.hasOwnProperty.call(dd,'value')&&dd.writable!==false&&typeof dd.value==='string')up.desc=dd.value.replace(/permanently/gi,'this run');});
  function v24EditUpgrade(id,desc,apply){const up=upgrades.find(x=>x.id===id);if(up){up.desc=desc;if(apply)up.apply=apply;}return up;}
  v24EditUpgrade('attack','Gain +1 Attack this run.',function(){player.attack+=1;});
  v24EditUpgrade('hp','Gain +5 max HP and heal 5 HP this run.',function(){player.maxHp+=5;player.hp=Math.min(player.maxHp,player.hp+5);});
  v24EditUpgrade('defense','Gain +1 Defense this run.',function(){player.defense+=1;});
  v24EditUpgrade('potion','Gain 1 potion immediately.',function(){player.potions+=1;});
  v24EditUpgrade('purse','Gain 18 gold, increased by your Gold bonus.',function(){player.gold+=modifiedGold(18);});
  v24EditUpgrade('mending','Heal 25% of your maximum HP.',function(){healPlayer(Math.ceil(player.maxHp*.25));});
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
  v24NewPowerups.forEach(up=>{if(!upgrades.some(x=>x.id===up.id))upgrades.push(up);});
  weightedUpgrade=function(pool){
    const order={poor:0,common:1,uncommon:2,rare:3,epic:4,legendary:5,artifact:6,mythical:7,omega:8};
    const weighted=pool.map(up=>{const tier=order[up.rarity]??0,base=Math.max(0,rarityInfo[up.rarity]?.weight||0),rawLuck=Math.max(0,player.luck||0),luck=1-Math.exp(-rawLuck*.68),depth=(boardLevel-1)+player.position/Math.max(1,currentTileCount()-1);let weight=base;if(tier<=1)weight*=Math.max(.30,1-luck*.20-depth*.018);else weight*=1+(tier-1)*(luck*.20+depth*.018);if(up.rarity==='legendary')weight+=Math.min(.018,player.level*.00035)+depth*.0016;return {up,weight};});
    const total=weighted.reduce((s,x)=>s+x.weight,0);if(total<=0)return pool[0];let roll=random()*total;for(const e of weighted){roll-=e.weight;if(roll<=0)return e.up;}return weighted[weighted.length-1].up;
  };

  /* MODULE: handcrafted Legendary relics ---------------------------------- */
  function generateAxelsCoffeeMug(){return {id:`legend_mug_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'offhand',rarity:'legendary',specialLegendary:true,coffeeActionProc:.18,icon:'☕',name:"Axel's Coffee Mug",uniqueEffect:'Every combat action has an 18% chance to trigger an empowered Coffee elemental proc.',bonuses:{doubleStrike:.75,attack:30,crit:.30,defense:-5,bossDamage:.34,lifeSteal:.10}};}
  function generateKratzHeadphones(){return {id:`legend_headphones_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'hat',rarity:'legendary',specialLegendary:true,oneHitPerRound:true,icon:'🎧',name:'Kratz Headphones',uniqueEffect:'Once an attack actually reaches you in an enemy round, every later hit that round is drowned out. Dodges and Barriers do not consume this protection.',bonuses:{dodge:.25,defense:25,doubleStrike:-.25,attack:15,bossDamage:.25,crit:.25,goldBonus:-.50}};}
  function generateKellysJeanJacket(){return {id:`legend_jacket_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'chest',rarity:'legendary',specialLegendary:true,softDefenseCurve:true,icon:'🧥',name:"The Jean Jacket Lost at Kelly's",uniqueEffect:'Defense suffers dramatically less diminishing returns while this jacket is equipped.',bonuses:{dodge:.30,defense:30,luck:-.50,doubleStrike:.15,lifeSteal:.15,attack:-10}};}
  const V24_LEGENDARY_RELICS=[generateAxelsCoffeeMug,generateKratzHeadphones,generateKellysJeanJacket];
  function v24HasLegendaryRelic(id){return (meta.legendaryRelics||[]).includes(id)||(meta.heirloomStorage||[]).some(x=>x?.specialLegendary&&x.name===id)||(meta.heirlooms||[]).some(x=>x?.specialLegendary&&x.name===id);}
  function v24RandomLegendaryRelic(){const candidates=V24_LEGENDARY_RELICS.map(fn=>fn()).filter(i=>!v24HasLegendaryRelic(i.name));return candidates.length?pick(candidates):pick(V24_LEGENDARY_RELICS)();}

  const openTreasureV24Base=openTreasure;
  openTreasure=function(){
    // Memory Cache is intentionally microscopic. Legendary relics are special
    // discoveries, not the next ordinary loot rarity.
    if(boardLevel>=4&&random()<(hellMode?.0025:.0015)){
      const item=v24RandomLegendaryRelic();if(tiles[player.position]){tiles[player.position].cleared=true;tiles[player.position].type='empty';refreshTile(player.position);}addLog(`<b>The treasure chest contains no gold.</b> Inside is something strangely familiar: ${item.icon} <b>${item.name}</b>.`);showToast('🌟 A memory from another road…',3000,true);return openLoot(item,()=>returnToRoad());
    }
    return openTreasureV24Base();
  };

  /* MODULE: Artifact-tier Impossible Road --------------------------------- */
  function v24Artifactize(item){
    if(!item)return item;item.rarity='artifact';item.artifact=true;item.mythical=false;item.v24Rarity=true;
    Object.keys(item.bonuses||{}).forEach(k=>{const v=item.bonuses[k];if(typeof v!=='number')return;item.bonuses[k]=Math.abs(v)<1?Math.round(v*.86*1000)/1000:Math.round(v*.86);});return item;
  }
  const v24MythWeapon=generateMythicalWeapon,v24MythBoots=generateMythicalBoots,v24MythPants=generateMythicalPants,v24MythAmulet=generateMythicalAmulet,v24MythHat=generateMythicalHat,v24MythRing=generateMythicalRing,v24MythOffhand=generateMythicalOffhand;
  generateMythicalWeapon=function(){return v24Artifactize(v24MythWeapon());};generateMythicalBoots=function(){return v24Artifactize(v24MythBoots());};generateMythicalPants=function(){return v24Artifactize(v24MythPants());};generateMythicalAmulet=function(){return v24Artifactize(v24MythAmulet());};generateMythicalHat=function(){return v24Artifactize(v24MythHat());};generateMythicalRing=function(){return v24Artifactize(v24MythRing());};generateMythicalOffhand=function(){return v24Artifactize(v24MythOffhand());};
  v19SetDamageBonus=function(){const n=mythicalSetCount();return n>=7?.20:n>=6?.14:n>=5?.10:n>=4?.07:n>=3?.04:n>=2?.02:0;};
  v19SetProcBonus=function(){const n=mythicalSetCount();return n>=7?.13:n>=6?.10:n>=5?.07:n>=4?.05:n>=3?.04:0;};
  v19SetPetDoubleBonus=function(){const n=mythicalSetCount();return n>=7?.16:n>=6?.13:n>=5?.10:n>=4?.08:0;};
  v19SetElementPower=function(){const n=mythicalSetCount();return n>=7?1.14:n>=6?1.09:n>=5?1.05:1;};
  v19SetStartUltimate=function(){const n=mythicalSetCount();return n>=7?40:n>=6?35:n>=5?30:n>=4?25:0;};
  v19SetGuardianSpecialMult=function(){const n=mythicalSetCount();return n>=7?.80:n>=6?.85:n>=5?.90:n>=4?.95:1;};
  function v24SetTierData(){return [
    {pieces:2,text:'+2% all damage.'},{pieces:3,text:'+4% all damage and +4% elemental proc chance.'},{pieces:4,text:'+7% all damage, +5% elemental proc chance, 25 starting Ultimate, +8% pet double-attack chance and 5% less Guardian-special damage.'},{pieces:5,text:'+10% all damage, +7% elemental proc chance, +5% elemental power, 30 starting Ultimate, 1 starting Barrier, +10% pet double-attack chance and 10% less Guardian-special damage.'},{pieces:6,text:'+14% all damage, +10% elemental proc chance, +9% elemental power, 35 starting Ultimate, +13% pet double-attack chance and 15% less Guardian-special damage.'},{pieces:7,text:'+20% all damage, +13% elemental proc chance, +14% elemental power, 40 starting Ultimate, +16% pet double-attack chance, 20% less Guardian-special damage, and once per battle at ≤25% HP restore 18% max HP + gain 1 Barrier.'}
  ];}
  mythicalSetSummary=function(){const n=mythicalSetCount();return `${n}/7 Artifact-tier Impossible Road pieces · `+v24SetTierData().map(t=>`${t.pieces}: ${t.text}`).join(' · ');};

  // A slightly leaner Artifact table. Board 6's offhand is now 0.4% / 4%.
  openCombatLootChain=function(defeated,done){
    const normal=()=>{if(random()<equipmentDropChance(defeated.boss)){const rarity=defeated.finalBoss?(random()<.28?'epic':'rare'):defeated.miniBoss?(random()<.30?'rare':'uncommon'):null;openLoot(generateEquipment(rarity),done);}else done();};
    const specials=[];
    if(defeated?.devilBoss){if(random()<.05){specials.push(generateDevilsHorns());meta.devilHornsFound=(meta.devilHornsFound||0)+1;saveMeta();}}
    else if(defeated?.merchantBoss){if(random()<.05*(nightmareMode?2:1))specials.push(generateMerchantWeapon());}
    else if(defeated?.bloodmageBoss){if(random()<.05*(nightmareMode?2:1))specials.push(generatePhilosophersStone());}
    else {let weapon=0,boots=0,amulet=0,pants=0,hat=0,ring=0,offhand=0;
      if(defeated?.miniBoss){if(boardLevel===1)weapon=.004;else if(boardLevel===2){weapon=.055;boots=.008;}else if(boardLevel===3){weapon=.055;boots=.008;pants=.004;}else if(boardLevel===4){weapon=.09;boots=.055;pants=.03;amulet=.004;hat=.004;}else if(boardLevel===5){weapon=.105;boots=.067;pants=.038;amulet=.008;hat=.008;ring=.03;}else{weapon=.135;boots=.09;pants=.055;amulet=.012;hat=.018;ring=.052;offhand=.004;}}
      else if(defeated?.finalBoss){if(boardLevel===1)weapon=.04;else if(boardLevel===2){weapon=.075;boots=.038;amulet=.0008;}else if(boardLevel===3){weapon=.075;boots=.038;pants=.015;amulet=.0008;}else if(boardLevel===4){weapon=.135;boots=.075;pants=.045;amulet=.008;hat=.015;}else if(boardLevel===5){weapon=.15;boots=.09;pants=.06;amulet=.015;hat=.022;ring=.075;}else{weapon=.19;boots=.12;pants=.082;amulet=.022;hat=.038;ring=.105;offhand=.04;}}
      const mult=nightmareMode?2:1;if(weapon&&random()<weapon*mult)specials.push(generateMythicalWeapon());if(boots&&random()<boots*mult)specials.push(generateMythicalBoots());if(pants&&random()<pants*mult)specials.push(generateMythicalPants());if(amulet&&random()<amulet*mult)specials.push(generateMythicalAmulet());if(hat&&random()<hat*mult)specials.push(generateMythicalHat());if(ring&&random()<ring*mult)specials.push(generateMythicalRing());if(offhand&&random()<offhand*mult)specials.push(generateMythicalOffhand());
    }
    const next=()=>{if(!specials.length)return normal();const item=specials.shift();addLog(`<b>${rarityInfo[item.rarity]?.label?.toUpperCase()||'SPECIAL'} ITEM!</b> ${item.name} drops from ${defeated.name}.`);sfx.holy();openLoot(item,next);};next();
  };

  unboundPreciousGearV16=function(){const bound=[...(meta.heirlooms||[]),...(meta.heirloomStorage||[])];return EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]).filter(i=>i&&['legendary','artifact','mythical','omega'].includes(i.rarity)&&!bound.some(h=>h.id===i.id||(h.seed&&i.seed&&h.seed===i.seed)));};

  /* MODULE: class tuning / Alchemist counter ------------------------------- */
  if(CLASSES.fighter){CLASSES.fighter.base.attack=5;CLASSES.fighter.base.guardPower=.67;CLASSES.fighter.stats='38 HP · 5 ATK · 2 DEF';}
  if(CLASSES.paladin){CLASSES.paladin.base.maxHp=52;CLASSES.paladin.base.attack=7;CLASSES.paladin.base.defense=5;CLASSES.paladin.base.guardPower=.78;CLASSES.paladin.stats='52 HP · 7 ATK · 5 DEF · DEFENSE/HEALING SCALING';}
  if(CLASSES.beastmaster){CLASSES.beastmaster.base.maxHp=42;CLASSES.beastmaster.base.attack=7;CLASSES.beastmaster.base.crit=.10;CLASSES.beastmaster.stats='42 HP · 7 ATK · 1 DEF · STRONG PET SCALING';CLASSES.beastmaster.desc='A late-unlock companion commander. Its own attacks are reliable, while pet Bond, pet damage and double-pet attacks become a genuinely dangerous second damage engine.';}
  const resetPlayerV24Base=resetPlayer;
  resetPlayer=function(classId=selectedClassId){const out=resetPlayerV24Base(classId);player.energyShield=0;player.energyShieldCap=player.maxHp;if(classIdentityActive('beastmaster')){player.petDamageBonus=(player.petDamageBonus||0)+3;player.petDoubleChance=(player.petDoubleChance||0)+.08;}return out;};
  const usePotionOutsideCombatV24Base=usePotionOutsideCombat;
  usePotionOutsideCombat=function(){const beforePotions=player.potions,beforeUses=ensureAlphaMeta().potionsUsed||0,result=usePotionOutsideCombatV24Base();if(player.potions<beforePotions&&(ensureAlphaMeta().potionsUsed||0)===beforeUses){recordPotionUseV16();}return result;};

  /* MODULE: permanent Heirloom Storage ------------------------------------ */
  function v24StorageUnlocked(){return DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_STORAGE_NODE);}
  function v24StorageCapacity(){if(!v24StorageUnlocked())return 0;let n=EQUIPMENT_SLOTS.length;if((meta.board5Clears||0)>0)n++;if(DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_SLOT_I_NODE))n++;if(DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_SLOT_II_NODE))n++;if((meta.merchantKills||0)>=1)n++;return n;}
  function v24SyncStorage(){
    if(!v24StorageUnlocked())return;const byId=new Map((meta.heirloomStorage||[]).map(i=>[i.id,normalizeSavedItem(i)]));(meta.heirlooms||[]).forEach(i=>byId.set(i.id,normalizeSavedItem(i)));meta.heirloomStorage=[...byId.values()].slice(0,v24StorageCapacity());const ids=new Set(meta.heirloomStorage.map(i=>i.id));meta.heirlooms=(meta.heirlooms||[]).filter(i=>ids.has(i.id)).slice(0,getHeirloomSlots());saveMeta();
  }
  function v24StorageMilestones(){return [{on:(meta.board5Clears||0)>0,text:'Board 5 cleared'},{on:DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_SLOT_I_NODE),text:'Storage Slot I purchased'},{on:DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_SLOT_II_NODE),text:'Storage Slot II purchased'},{on:(meta.merchantKills||0)>=1,text:'Road Merchant defeated'}];}
  const completePrestigeV24Base=completePrestige;
  completePrestige=function(data,keepIds=[]){const unlocked=v24StorageUnlocked(),before=(meta.heirloomStorage||[]).map(normalizeSavedItem),chosen=(data?.candidates||[]).filter(i=>keepIds.includes(i.id)).map(normalizeSavedItem);const result=completePrestigeV24Base(data,keepIds);if(unlocked){meta.heirloomStorageUnlocked=true;const map=new Map([...before,...chosen].map(i=>[i.id,i]));meta.heirloomStorage=[...map.values()].slice(0,v24StorageCapacity());const ids=new Set(meta.heirloomStorage.map(i=>i.id));meta.heirlooms=(meta.heirlooms||[]).filter(i=>ids.has(i.id)).slice(0,getHeirloomSlots());saveMeta();dbEquipmentUi.renderCampStorage();updateMetaUI();}return result;};

  /* MODULE: Pale Devil ritual / secret boss ------------------------------- */
  function generateDevilsHorns(){return {id:`omega_devils_horns_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'hat',rarity:'omega',mythical:true,devilHorns:true,icon:'👿',name:"The Devil's Horns",uniqueEffect:'First/basic hits have a 0.5% chance to instantly kill their target; Echo Strikes cannot trigger it. Overhealing becomes Energy Shield up to 100% of max HP.',bonuses:{maxHp:32,attack:10,crit:.18,bossDamage:.30,lifeSteal:.12}};}
  let v24DanceArmed=false,v24DanceLastAngle=null,v24DanceAccum=0,v24DanceDirection=0,v24DanceTimer=null,v24SuppressHellClickUntil=0;
  function v24ArmDance(){if(!hellMode||!meta.hellUnlocked)return;v24DanceArmed=true;v24DanceLastAngle=null;v24DanceAccum=0;v24DanceDirection=0;const icon=$('campHellBtn')?.querySelector('.camp-icon');icon?.classList.add('devil-ritual-armed');$('campScene')?.classList.add('devil-ritual-tracking');clearTimeout(v24DanceTimer);v24DanceTimer=setTimeout(v24CancelDance,14000);showToast('The devil watches the fire. Circle the bonfire three times with mouse or finger.',2200);}
  function v24CancelDance(){v24DanceArmed=false;v24DanceLastAngle=null;v24DanceAccum=0;v24DanceDirection=0;$('campHellBtn')?.querySelector('.camp-icon')?.classList.remove('devil-ritual-armed');$('campScene')?.classList.remove('devil-ritual-tracking');}
  function v24TrackDance(e){if(!v24DanceArmed||!hellMode)return;const fire=document.querySelector('#campScene .camp-bonfire');if(!fire)return v24CancelDance();const r=fire.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,dist=Math.hypot(dx,dy);if(dist<45||dist>330)return;const angle=Math.atan2(dy,dx);if(v24DanceLastAngle==null){v24DanceLastAngle=angle;return;}let d=angle-v24DanceLastAngle;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;v24DanceLastAngle=angle;if(Math.abs(d)>.75)return;const dir=Math.sign(d);if(!dir)return;if(!v24DanceDirection)v24DanceDirection=dir;if(dir!==v24DanceDirection){v24DanceAccum=Math.max(0,v24DanceAccum-Math.abs(d)*2);return;}v24DanceAccum+=Math.abs(d);if(v24DanceAccum>=Math.PI*6){meta.devilPrimed=true;saveMeta();v24CancelDance();sfx.holy();showToast('🌙 Something dances back.',3200,true);}}
  document.addEventListener('pointermove',v24TrackDance,{passive:true});
  document.addEventListener('pointercancel',()=>{if(v24DanceArmed)v24CancelDance();},{passive:true});
  document.addEventListener('pointerdown',e=>{const icon=e.target.closest?.('#campHellBtn .camp-icon');if(icon&&hellMode){v24SuppressHellClickUntil=Date.now()+900;e.preventDefault();e.stopImmediatePropagation();v24ArmDance();}},true);
  document.addEventListener('click',e=>{const icon=e.target.closest?.('#campHellBtn .camp-icon');if(!icon||!hellMode)return;if(Date.now()<v24SuppressHellClickUntil){e.preventDefault();e.stopImmediatePropagation();return;}if(e.detail===0){e.preventDefault();e.stopImmediatePropagation();v24ArmDance();}},true);
  const tileMetaV24Base=tileMeta;tileMeta=function(tile){if(tile?.type==='devilboss')return ['👿🌙','???'];return tileMetaV24Base(tile);};
  const startCombatV24Base=startCombat;
  startCombat=function(kind='normal'){const out=startCombatV24Base(kind);if(kind==='devil'&&currentEnemy){currentEnemies.forEach(e=>{e.devilBoss=true;e.boss=true;e.guardian=true;e.specialName='Pale Moon Waltz';e.hp=Math.round(e.hp*1.75);e.maxHp=e.hp;e.attack=Math.round(e.attack*1.35);e.defense=(e.defense||0)+8;});currentEncounterLead=currentEnemies[0];currentEnemy=currentEnemies[currentEnemyIndex]||currentEnemies[0];$('combatTitle').textContent='Secret Boss: The Pale Devil';$('combatSubtitle').textContent='You danced around the fire. Something accepted the invitation.';updateBossSpecialIndicator();updateCombatUI();}return out;};
  const winCombatV24Base=winCombat;winCombat=async function(){const defeated=currentEncounterLead||currentEnemy;if(defeated?.devilBoss){meta.devilBossKills=(meta.devilBossKills||0)+1;saveMeta();showToast('👿 The Pale Devil bows.',3000,true);}return winCombatV24Base();};
  function v24AttackPattern(enemy){
    const turn=currentEncounterTurn||1,name=enemy?.name||'';
    if(enemy?.devilBoss)return turn%2?{name:"Devil's Two-Step",hits:[.72,.72]}:{name:'Temptation',hits:[1.18],drain:.18};
    if(enemy?.bloodmageBoss)return turn%2?{name:'Blood Needles',hits:[.62,.62]}:{name:'Sanguine Drain',hits:[1.05],drain:.30};
    if(name.includes('Nullstar Hydra'))return turn%2?{name:'Hydra Heads',hits:[.46,.46,.46]}:{name:'Null Bite',hits:[1.12]};
    if(name.includes('Crown-Eater'))return turn%2?{name:'Royal Talons',hits:[.64,.64]}:{name:'Crown Bite',hits:[1.12]};
    if(name.includes('Ring Tyrant'))return turn%2?{name:'Looping Fangs',hits:[.68,.68]}:{name:'Tyrant Bite',hits:[1.14]};
    if(name.includes('Abyssal Custodian'))return turn%2?{name:'Twin Seal Bash',hits:[.68,.68]}:{name:'Custodian Crush',hits:[1.12]};
    if(name.includes('Last Equation'))return turn%2?{name:'Division Sequence',hits:[.50,.50,.50]}:{name:'Proof Strike',hits:[1.22]};
    if(name.includes('Astral Devourer')&&turn%3===0)return {name:'Devouring Claws',hits:[.64,.64]};
    return {name:'Attack',hits:[1]};
  }
  const updateBossSpecialIndicatorV24Base=updateBossSpecialIndicator;updateBossSpecialIndicator=function(){const lead=currentEncounterLead,box=$('bossSpecialIndicator');if(lead?.devilBoss){const remaining=GUARDIAN_SPECIAL_INTERVAL-(currentEncounterTurn%GUARDIAN_SPECIAL_INTERVAL);box.classList.remove('hidden');box.classList.toggle('imminent',remaining<=2);box.textContent=`⚠️ ${lead.specialName} in ${remaining} turn${remaining===1?'':'s'}`;return;}return updateBossSpecialIndicatorV24Base();};

  /* MODULE: Energy Shield / special Legendary combat hooks ---------------- */
  function v24HasHorns(){return !!player.equipment?.hat?.devilHorns;}
  function v24HasHeadphones(){return !!player.equipment?.hat?.oneHitPerRound;}
  function v24HasJeanJacket(){return !!player.equipment?.chest?.softDefenseCurve;}
  const defenseDamageReductionV24Base=defenseDamageReduction;defenseDamageReduction=function(defense=player.defense){if(v24HasJeanJacket()){const d=Math.max(0,Number(defense)||0);return clamp(d/(d+13),0,.90);}return defenseDamageReductionV24Base(defense);};
  const healPlayerV24Base=healPlayer;healPlayer=function(amount,opts){const beforeHp=player.hp,beforeMax=player.maxHp,raw=Math.max(0,Math.round(amount||0)),normalRoom=Math.max(0,beforeMax-beforeHp),healed=healPlayerV24Base(amount,opts);if(v24HasHorns()&&raw>normalRoom){const maxGrowth=Math.max(0,player.maxHp-beforeMax),over=Math.max(0,raw-normalRoom-maxGrowth);if(over>0){player.energyShield=Math.min(player.maxHp,(player.energyShield||0)+over);player.energyShieldCap=player.maxHp;addCombatHistory(`🔵 Devil's Horns convert ${over} overhealing into Energy Shield.`);}}return healed;};
  function v24ApplyDamage(raw){raw=Math.max(0,Math.round(raw||0));let shield=Math.min(player.energyShield||0,raw);if(shield){player.energyShield-=shield;raw-=shield;}const hp=Math.min(player.hp,raw);player.hp=Math.max(0,player.hp-hp);meta.damageTaken=(meta.damageTaken||0)+shield+hp;return {shield,hp,total:shield+hp};}
  async function v24ResolveNormalHits(enemy,guarded,extraGuardPower,messages,roundState={hit:false}){
    const pattern=v24AttackPattern(enemy),dr=defenseDamageReduction();let totalHpDamage=0,totalDamage=0,landedAny=false,blocked=0,dodged=0;
    for(let i=0;i<pattern.hits.length;i++){
      if(v24HasHeadphones()&&roundState.hit){messages.push(`🎧 Kratz Headphones drown out ${enemy.name}'s ${pattern.name}${pattern.hits.length>1?` hit ${i+1}`:''}.`);continue;}
      if(random()<effectiveDodgeChance()){dodged++;messages.push(`${enemy.name} ${pattern.hits.length>1?`${pattern.name} hit ${i+1}`:pattern.name} is dodged.`);continue;}
      if(player.combatShield>0){player.combatShield--;blocked++;messages.push(`Barrier blocks ${enemy.name}'s ${pattern.hits.length>1?`${pattern.name} hit ${i+1}`:pattern.name}.`);continue;}
      const base=Math.max(1,(enemy.attack+rand(-1,1))*pattern.hits[i]);let raw=Math.max(1,Math.round(base*(1-dr)-player.flatReduction));if(guarded)raw=Math.max(0,Math.floor(raw*(1-clamp(player.guardPower+extraGuardPower,0,.9))));const hit=v24ApplyDamage(raw);if(hit.total>0)roundState.hit=true;totalDamage+=hit.total;totalHpDamage+=hit.hp;landedAny=landedAny||hit.total>0;messages.push(`${enemy.name}'s ${pattern.name}${pattern.hits.length>1?` hit ${i+1}/${pattern.hits.length}`:''} ${guarded?'hits your guard':'hits'} for ${hit.total}${hit.shield?` (${hit.shield} absorbed by Energy Shield)`:''}.`);if(player.thorns>0&&hit.total>0){const returned=damageEnemy(enemy,player.thorns,true);messages.push(`Spikes return ${returned}.`);}if(player.hp<=0)break;
    }
    if(pattern.drain&&totalDamage>0&&enemy.hp>0){const heal=Math.min(enemy.maxHp-enemy.hp,Math.max(1,Math.floor(totalDamage*pattern.drain)));enemy.hp+=heal;if(heal)messages.push(`🩸 ${pattern.name} restores ${heal} HP to ${enemy.name}.`);}
    if(enemy.lifeSteal>0&&totalDamage>0&&enemy.hp>0&&enemy.hp<enemy.maxHp){const exact=totalDamage*enemy.lifeSteal+(enemy._lifeStealCarry||0),whole=Math.floor(exact),heal=Math.min(enemy.maxHp-enemy.hp,whole);enemy._lifeStealCarry=exact-whole;if(heal>0){enemy.hp+=heal;messages.push(`🩸 ${enemy.name} steals ${heal} HP back.`);}}else if(enemy.hp>=enemy.maxHp)enemy._lifeStealCarry=0;
    if(landedAny){const proc=enemyElementProc(enemy);if(proc)messages.push(proc);}return {landedAny,totalHpDamage,totalDamage,blocked,dodged};
  }
  enemyTurn=async function(guarded,extraGuardPower=0){
    if(!currentEnemy)return;currentEncounterTurn++;let messages=[],roundState={hit:false};const lead=currentEncounterLead,special=!!(lead?.guardian&&(lead.miniBoss||lead.finalBoss||lead.merchantBoss||lead.bloodmageBoss||lead.devilBoss)&&lead.hp>0&&currentEncounterTurn%GUARDIAN_SPECIAL_INTERVAL===0);
    for(const enemy of livingEnemies()){
      if((enemy.skipTurns||0)>0&&!(special&&enemy===lead)){enemy.skipTurns--;messages.push(`${enemy.name} is frozen.`);continue;}
      if(special&&enemy===lead){
        const partialDR=defenseDamageReduction()*.55;
        if(enemy.bloodmageBoss||enemy.devilBoss){const pulses=enemy.devilBoss?3:2,totalMult=enemy.devilBoss?.72:.98;let total=0;for(let i=0;i<pulses;i++){if(v24HasHeadphones()&&roundState.hit){messages.push(`🎧 Kratz Headphones drown out ${enemy.specialName} pulse ${i+1}.`);continue;}const base=Math.max(1,enemy.attack*totalMult),rawBase=Math.max(1,Math.round(base*(1-partialDR)-player.flatReduction*.35));let raw=guarded?Math.max(0,Math.floor(rawBase*(1-clamp(player.guardPower+extraGuardPower,0,.9)))):rawBase;if(mythicalSetCount()>=4)raw=Math.floor(raw*v19SetGuardianSpecialMult());const hit=v24ApplyDamage(raw);if(hit.total>0)roundState.hit=true;total+=hit.total;messages.push(`⚠️ ${enemy.specialName} pulse ${i+1}/${pulses} pierces barriers for ${hit.total}${hit.shield?` (${hit.shield} Energy Shield)`:''}.`);if(player.hp<=0)break;}if(total>0&&enemy.hp>0){const heal=Math.min(enemy.maxHp-enemy.hp,Math.max(1,Math.floor(total*(enemy.devilBoss?.12:.22))));enemy.hp+=heal;if(heal)messages.push(`${enemy.name} restores ${heal} HP.`);}}
        else{if(v24HasHeadphones()&&roundState.hit){messages.push(`🎧 Kratz Headphones drown out ${enemy.specialName||'Guardian special'}.`);}else{const base=Math.max(1,enemy.attack*(enemy.merchantBoss?2.6:2.25));let raw=Math.max(1,Math.round(base*(1-partialDR)-player.flatReduction*.5));if(guarded)raw=Math.max(0,Math.floor(raw*(1-clamp(player.guardPower+extraGuardPower,0,.9))));if(mythicalSetCount()>=4)raw=Math.floor(raw*v19SetGuardianSpecialMult());const hit=v24ApplyDamage(raw);if(hit.total>0)roundState.hit=true;messages.push(`⚠️ ${enemy.specialName||'Guardian special'} partially pierces Defense and ignores barriers${guarded?', but Guard reduces it further':''}, dealing ${hit.total}${hit.shield?` (${hit.shield} Energy Shield)`:''}.`);if(enemy.merchantBoss){const stolen=Math.min(player.gold,Math.ceil(player.gold*.20));player.gold-=stolen;enemy.enemyBarrier=(enemy.enemyBarrier||0)+2;messages.push(`The Merchant steals ${stolen} gold and raises 2 barriers.`);}}}
      }else{await v24ResolveNormalHits(enemy,guarded,extraGuardPower,messages,roundState);if(enemy.merchantBoss){const stolen=Math.min(player.gold,Math.max(1,Math.round(enemy.attack*.6)));player.gold-=stolen;messages.push(`The Merchant steals ${stolen} gold.`);}}
      if(player.hp<=0)break;
    }
    if(special&&hasMythicPiece('hat')&&player.hp>0&&!v24HasHorns()){const heal=healPlayer(Math.max(1,Math.ceil(player.maxHp*.10)));player.ultimateCharge=clamp(player.ultimateCharge+25,0,100);messages.push(`👑 Crown of the Fourth Road restores ${heal} HP and grants 25 ultimate.`);}if(hasMythicPiece('amulet')&&!player.mythicAmuletUsed&&player.hp>0&&player.hp/player.maxHp<=.35){player.mythicAmuletUsed=true;let consumed=0;livingEnemies().forEach(e=>{const d=Math.max(1,Math.floor(e.maxHp*.12));consumed+=damageEnemy(e,d,true);});const healed=healPlayer(Math.max(1,Math.floor(consumed*.5)));messages.push(`👁️ Devourer's Gaze consumes ${consumed} enemy HP and restores ${healed} HP.`);}if(player.hp>0&&mythicalSetCount()>=7&&!player.omegaRingUsed&&player.hp/player.maxHp<=.25){player.omegaRingUsed=true;const heal=healPlayer(Math.ceil(player.maxHp*.18));player.combatShield=(player.combatShield||0)+1;messages.push(`🌈 Impossible Road 7-piece restores ${heal} HP and grants 1 barrier.`);}checkDynamicClassUnlocks();saveMeta();sfx.hit();setCombatText(messages.join(' '));updateCombatUI();await delay(980);if(!livingEnemies().length)return winCombat();if(player.hp<=0)return handlePlayerDeath();combatBusy=false;updateCombatUI();setCombatText('Choose your next action.',false);
  };
  const performStrikeV24Base=performStrike;performStrike=async function(target,opts={}){const result=await performStrikeV24Base(target,opts);if(!opts.echo&&target?.hp>0&&v24HasHorns()&&random()<.005){const killed=damageEnemy(target,target.hp,true);result.dealt=(result.dealt||0)+killed;setCombatText(`👿 The Devil's Horns find the one impossible angle. ${target.name} is instantly slain.`);addCombatHistory(`👿 INSTANT KILL · ${target.name}`);sfx.holy();updateCombatUI();}return result;};
  const resolveEnemyResponseV24Base=resolveEnemyResponse;resolveEnemyResponse=async function(guarded=false,extraGuardPower=0){const mug=player.equipment?.offhand;if(mug?.coffeeActionProc&&currentEnemy&&random()<mug.coffeeActionProc){const old=player.elementDamageBonus||0;player.elementDamageBonus=old+.50;try{const r=triggerElementEffect('coffee',currentEnemy,{forced:true,source:"Axel's Coffee Mug"});if(r)addCombatHistory(`☕ ${r.message}`);}finally{player.elementDamageBonus=old;}}return resolveEnemyResponseV24Base(guarded,extraGuardPower);};
  function v24EnsureShieldBars(){[['hpFill','energyShieldFill'],['combatPlayerFill','combatEnergyShieldFill']].forEach(([base,id])=>{const fill=$(base),bar=fill?.parentElement;if(bar&&!$(id)){const shield=document.createElement('i');shield.id=id;shield.className='energy-shield-fill';shield.style.width='0%';bar.appendChild(shield);}});}
  function v24UpdateShieldBars(){v24EnsureShieldBars();const pct=clamp((player.energyShield||0)/Math.max(1,player.maxHp)*100,0,100);if($('energyShieldFill'))$('energyShieldFill').style.width=`${pct}%`;if($('combatEnergyShieldFill'))$('combatEnergyShieldFill').style.width=`${pct}%`;if((player.energyShield||0)>0){if($('hpText'))$('hpText').textContent=`${Math.round(player.hp)} / ${Math.round(player.maxHp)} · 🔵 ${Math.round(player.energyShield)}`;if($('combatPlayerHp'))$('combatPlayerHp').textContent=`${Math.round(player.hp)} / ${Math.round(player.maxHp)} · 🔵 ${Math.round(player.energyShield)}`;}}
  const updateHUDV24Base=updateHUD;updateHUD=function(){updateHUDV24Base();v24UpdateShieldBars();};const updateCombatUIV24Base=updateCombatUI;updateCombatUI=function(){updateCombatUIV24Base();v24UpdateShieldBars();};

  /* MODULE: camp synchronization ------------------------------------------ */
  function v24RefreshCamp(){
    const overlay=$('startOverlay'),modal=overlay?.querySelector('.start-modal');if(modal){const h=modal.querySelector('h2');if(h)h.textContent='Campsite';const sub=modal.querySelector('.subtitle');if(sub)sub.innerHTML='Between expeditions. Choose who leaves camp, what they carry, and which terrible idea to enable next.';}overlay?.querySelector('.camp-help')?.remove();
    const hell=$('campHellBtn');if(hell){const icon=hell.querySelector('.camp-icon'),sub=hell.querySelector('.camp-sub');if(icon)icon.textContent=hellMode?'👿':'😈';if(sub&&meta.hellUnlocked)sub.innerHTML=`${hellMode?'HELL ON':'HELL OFF'} <span class="camp-mode-state">${hellMode?'ON':'OFF'}</span>`;hell.setAttribute('aria-pressed',String(!!hellMode));}
    dbEquipmentUi.renderEquipment();
  }
  DB24.modules.camp={refresh:v24RefreshCamp,armDevil:v24ArmDance};
  const updateMetaUIV24CampBase=updateMetaUI;updateMetaUI=function(){updateMetaUIV24CampBase();v24RefreshCamp();};const openStartScreenV24CampBase=openStartScreen;openStartScreen=function(){const r=openStartScreenV24CampBase();v24RefreshCamp();return r;};
  document.addEventListener('click',e=>{if(e.target.closest?.('#campHellBtn')&&!e.target.closest?.('#campHellBtn .camp-icon'))setTimeout(v24RefreshCamp,0);},true);

  /* MODULE: info ----------------------------------------------------------- */

  /* MODULE: v2.4 smoke/regression helpers --------------------------------- */
  function v24TalentAudit(){return window.DiceboundTalentTree?.layoutAudit?.();}
  window.DiceboundV24Test=Object.freeze({
    rarity:()=>({labels:Object.fromEntries(['poor','common','uncommon','rare','epic','legendary','artifact','mythical','omega'].map(k=>[k,rarityInfo[k]?.label])),ordinary:Object.keys(V14_RARITY_BUDGETS),powerups:Object.fromEntries(['poor','common','uncommon','rare','epic','legendary','artifact','mythical','omega'].map(k=>[k,upgrades.filter(u=>u.rarity===k).length]))}),
    storage:()=>({unlocked:v24StorageUnlocked(),capacity:v24StorageCapacity(),stored:(meta.heirloomStorage||[]).length,active:(meta.heirlooms||[]).length}),
    storageTalentGate:()=>({beforeBoard3:false,afterBoard3:false,retired:true}),
    devilRitual:()=>{const oldH=meta.hellUnlocked,oldMode=hellMode,oldPrime=meta.devilPrimed;meta.hellUnlocked=true;hellMode=true;meta.devilPrimed=false;v24RefreshCamp();v24ArmDance();const fire=document.querySelector('#campScene .camp-bonfire'),r=fire.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rad=Math.max(70,Math.min(130,Math.max(r.width,r.height)));for(let a=0;a<=Math.PI*6.4;a+=.18)v24TrackDance({clientX:cx+Math.cos(a)*rad,clientY:cy+Math.sin(a)*rad});const primed=meta.devilPrimed,icon=$('campHellBtn')?.querySelector('.camp-icon')?.textContent;meta.hellUnlocked=oldH;hellMode=oldMode;meta.devilPrimed=oldPrime;v24CancelDance();v24RefreshCamp();return {primed,hellOnIcon:icon};},
    classTuning:()=>({fighter:{...CLASSES.fighter.base},paladin:{...CLASSES.paladin.base},beastmaster:{...CLASSES.beastmaster.base}}),
    storageMilestones:()=>{const old={u:meta.heirloomStorageUnlocked,b5:meta.board5Clears,p:DB_PRESTIGE.clone(meta.prestige),m:meta.merchantKills};let test=DB_PRESTIGE.normalize({count:20,moon:{legacySpent:0,purchases:[]}});test=DB_PRESTIGE.grantLegacyPurchase(test,DB_HEIRLOOM_STORAGE_NODE);meta.prestige=test;meta.heirloomStorageUnlocked=true;const vals=[];meta.board5Clears=0;meta.merchantKills=0;vals.push(v24StorageCapacity());meta.board5Clears=1;vals.push(v24StorageCapacity());meta.prestige=DB_PRESTIGE.grantLegacyPurchase(meta.prestige,DB_HEIRLOOM_SLOT_I_NODE);vals.push(v24StorageCapacity());meta.prestige=DB_PRESTIGE.grantLegacyPurchase(meta.prestige,DB_HEIRLOOM_SLOT_II_NODE);vals.push(v24StorageCapacity());meta.merchantKills=1;vals.push(v24StorageCapacity());Object.assign(meta,{heirloomStorageUnlocked:old.u,board5Clears:old.b5,merchantKills:old.m});meta.prestige=old.p;return vals;},
    talentAudit:v24TalentAudit,
    alchemistOutside:()=>{resetPlayer('ranger');gameStarted=true;rollLocked=false;currentEnemy=null;player.potions=1;player.hp=Math.max(1,player.maxHp-10);const b=ensureAlphaMeta().potionsUsed||0;usePotionOutsideCombat();return (ensureAlphaMeta().potionsUsed||0)-b;},
    setBonuses:()=>[2,3,4,5,6,7].map(n=>({n,damage:(()=>{const old=player.equipment;player.equipment={};EQUIPMENT_SLOTS.slice(0,n).forEach((s,i)=>player.equipment[s]={slot:s,setName:'Impossible Road',rarity:'artifact',bonuses:{},id:`x${i}`});const v=v19SetDamageBonus();player.equipment=old;return v;})()})),
    hornOverheal:()=>{resetPlayer('ranger');player.equipment.hat=generateDevilsHorns();player.hp=player.maxHp-2;player.energyShield=0;healPlayer(12);return {hp:player.hp,maxHp:player.maxHp,shield:player.energyShield};},
    legendaryItems:()=>V24_LEGENDARY_RELICS.map(fn=>{const x=fn();return {name:x.name,slot:x.slot,rarity:x.rarity,effect:x.uniqueEffect};})
  });
  DB24.modules={rarity:{info:rarityInfo},storage:{capacity:v24StorageCapacity,render:()=>dbEquipmentUi.renderCampStorage()},camp:DB24.modules.camp,testing:window.DiceboundV24Test};
  try{Object.defineProperty(window,'DiceboundModules24',{value:Object.freeze(DB24),enumerable:false,configurable:false,writable:false});}catch(e){}
  setTimeout(()=>{if(v24StorageUnlocked())v24SyncStorage();v24RefreshCamp();renderTalents();renderEquipment();v24EnsureShieldBars();},0);


  /* v2.4 compatibility hardening: old callers cannot generate random
     handcrafted Legendary gear, Merchant keeps double resale, and the board
     set card uses the authoritative Artifact-tier table. */
  const generateEquipmentV24OrdinaryBase=generateEquipment;
  generateEquipment=function(forceRarity=null,forcedSlot=null){
    if(forceRarity&&['legendary','artifact','mythical','omega'].includes(forceRarity))forceRarity='epic';
    return generateEquipmentV24OrdinaryBase(forceRarity,forcedSlot);
  };
  itemSellValue=function(item){const base=v14RawSellValue(item);return classIdentityActive('merchant')?Math.round(base*2):base;};

  /* v2.4 final presentation consistency ----------------------------------- */
  function v24RefreshDebugLabels(){
    const mythicBtn=document.querySelector('[data-debug="mythic"]');if(mythicBtn)mythicBtn.textContent='Equip full Artifact set';
    const offhandBtn=document.querySelector('[data-debug="mythic_offhand"]');if(offhandBtn)offhandBtn.textContent='Artifact offhand';
  }
  const openDebugMenuV24PresentationBase=openDebugMenu;
  openDebugMenu=function(){const r=openDebugMenuV24PresentationBase();v24RefreshDebugLabels();return r;};

  v24RefreshDebugLabels();


  /* ========================================================================
     Alpha v2.5 — reliability, current guide, debug logging and combat tuning
     ======================================================================== */
  const DB25={version:'2.5.1',modules:{}};

  const v25Style=document.createElement('style');
  v25Style.textContent=`
    #endOverlay .modal{width:min(1120px,96vw);max-height:92vh;overflow:auto;padding:24px}
    #endOverlay .gear-keep-grid{grid-template-columns:repeat(auto-fit,minmax(250px,1fr));max-height:none}
    #endTalentBtn{display:none!important}
    .debug-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.debug-tabs .small-btn.active{border-color:var(--gold);color:#fff;background:rgba(245,200,91,.13)}
    #debugGrid{display:block}.debug-tab-panel{display:none}.debug-tab-panel.active{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
    .debug-log-panel{display:none}.debug-log-panel.active{display:block}
    .debug-log-levels{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.debug-log-levels button.active{border-color:var(--gold);color:#fff}
    .debug-log-output{width:100%;height:330px;overflow:auto;white-space:pre-wrap;word-break:break-word;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.11);background:#070b13;color:#cfd9ec;font:10px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}
    .debug-log-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.debug-log-note{font-size:10px;color:var(--muted);line-height:1.4;margin:8px 0}
    .debug-class-unlock{grid-column:1/-1;display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:8px;padding:10px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(0,0,0,.12)}
    .debug-class-unlock label{grid-column:1/-1;font-size:10px;font-weight:900;color:var(--gold);text-transform:uppercase;letter-spacing:.08em}.debug-class-unlock select{min-width:0;border:1px solid rgba(255,255,255,.15);background:#0b1120;color:var(--ink);border-radius:10px;padding:9px 10px;font:inherit}
    .burn-status{display:inline-flex;align-items:center;gap:2px;margin-left:5px;font-size:11px;font-weight:900;color:#ff845b;text-shadow:0 0 8px rgba(255,80,30,.48)}
    .debug-recovered{animation:v25RecoveryFlash .8s ease}@keyframes v25RecoveryFlash{50%{box-shadow:0 0 28px rgba(98,215,154,.7)}}
  `;
  document.head.appendChild(v25Style);

  /* POWERUP BALANCE ------------------------------------------------------- */
  function v25Upgrade(id){return upgrades.find(u=>u.id===id);}
  function v25SetUpgrade(id,changes={}){const u=v25Upgrade(id);if(!u)return null;Object.assign(u,changes);return u;}

  // Frog / Echo progression.
  v25SetUpgrade('frog_lingering_croak',{rarity:'rare'});
  const amphib=v25Upgrade('frog_amphibian_loop');if(amphib){amphib.rarity='epic';amphib.desc='Gain +50% Echo Strike and +12% Crit.';amphib.apply=function(){player.doubleStrike+=.50;player.crit+=.12;};}
  const echoChamber=v25Upgrade('rare_echo_chamber');if(echoChamber){echoChamber.rarity='rare';echoChamber.desc='Gain +30% Echo Strike; Echoes deal 8% more damage.';echoChamber.apply=function(){player.doubleStrike+=.30;player.echoDamageScale=(player.echoDamageScale||.70)+.08;};}
  const echoing=v25Upgrade('echo');if(echoing){echoing.rarity='common';echoing.desc='Gain +12% Echo Strike this run.';echoing.apply=function(){player.doubleStrike+=.12;};}
  const doubleVision=v25Upgrade('echo_uncommon_v24');if(doubleVision){doubleVision.rarity='uncommon';doubleVision.desc='Gain +20% Echo Strike and Echo Strikes deal 3% more damage this run.';doubleVision.apply=function(){player.doubleStrike+=.20;player.echoDamageScale=(player.echoDamageScale||.70)+.03;};}

  // Gold / treasure progression.
  const treasure=v25Upgrade('gold');if(treasure){treasure.rarity='poor';treasure.desc='Enemies and chests grant 20% more gold this run.';treasure.apply=function(){player.goldBonus+=.20;};}
  if(!v25Upgrade('treasure_sense_common_v25'))upgrades.push({id:'treasure_sense_common_v25',rarity:'common',icon:'💰',name:'Treasure Sense+',desc:'Enemies and chests grant 40% more gold this run.',apply(){player.goldBonus+=.40;}});
  if(!v25Upgrade('treasure_sense_uncommon_v25'))upgrades.push({id:'treasure_sense_uncommon_v25',rarity:'uncommon',icon:'💰✨',name:'Treasure Sense++',desc:'Enemies and chests grant 60% more gold this run.',apply(){player.goldBonus+=.60;}});
  const friend=v25Upgrade('merchant');if(friend)friend.rarity='common';

  // Poison progression and overflow-ready values.
  const venom=v25Upgrade('venom_edge');if(venom){venom.rarity='common';venom.desc='Basic and Echo strikes gain +10% Poison-stack chance. Poison chance can exceed 100% for guaranteed extra stacks.';venom.apply=function(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.10;};}
  if(!v25Upgrade('venom_edge_rare_v25'))upgrades.push({id:'venom_edge_rare_v25',rarity:'rare',icon:'🐍☠️',name:'Venom Edge: Black Fang',desc:'Basic and Echo strikes gain +35% Poison-stack chance. Chance above 100% guarantees stacks and rolls the remainder for another.',apply(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.35;}});

  // Upper-tier corrections.
  const rep=v25Upgrade('true_legend_echo_v24');if(rep){rep.desc='Gain +80% Echo Strike and Echo Strikes deal 30% more damage this run.';rep.apply=function(){player.doubleStrike+=.80;player.echoDamageScale=(player.echoDamageScale||.70)+.30;};}
  const prism=v25Upgrade('true_legend_element_v24');if(prism){prism.desc='Gain +35% elemental proc chance and +60% elemental power this run.';prism.apply=function(){player.elementProcBonus=(player.elementProcBonus||0)+.35;player.elementDamageBonus=(player.elementDamageBonus||0)+.60;};}
  const bloodContract=v25Upgrade('legendary_blood_contract');if(bloodContract){bloodContract.desc='Gain +35% Lifesteal and +25% Boss Damage, but lose 10% of current max HP this run.';bloodContract.apply=function(){player.lifeSteal+=.35;player.bossDamage+=.25;const loss=Math.max(1,Math.ceil(player.maxHp*.10));player.maxHp=Math.max(1,player.maxHp-loss);player.hp=Math.min(player.hp,player.maxHp);};}
  const plague=v25Upgrade('plague_lord');if(plague){plague.desc='Achievement-locked: Nature adds 3 extra Poison stacks, Poison deals +8% Attack per stack, and attacks gain +1% Nature activation.';plague.apply=function(){player.naturePoisonStacks=(player.naturePoisonStacks||1)+3;player.poisonStackPower=(player.poisonStackPower||.12)+.08;player.classElementProcs.nature=(player.classElementProcs.nature||0)+.01;};}
  const golden=v25Upgrade('legendary_golden_law');if(golden)golden.rarity='legendary';
  const destiny=v25Upgrade('destiny');if(destiny){destiny.desc='Gain +25% extra-step chance, +25 Luck and +5% Crit this run.';destiny.apply=function(){player.extraStepChance+=.25;player.luck+=.25;player.crit+=.05;};}
  const pack=v25Upgrade('legendary_packbreaker');if(pack){pack.desc='Deal +50% damage while two or more enemies remain alive and gain +5% Echo Strike.';pack.apply=function(){player.packDamageBonus=(player.packDamageBonus||0)+.50;player.doubleStrike+=.05;};}
  const loaded=v25Upgrade('legendary_loaded_road');if(loaded){loaded.desc='Natural sixes grant +30 Fast Travel XP, +30 Ultimate charge and 25 bonus gold this run.';loaded.apply=function(){player.loadedSix=true;player.loadedSixBonusXp=30;player.loadedSixUltimate=30;player.loadedSixGold=25;};}

  // Poison chance now uses the same overflow model as Crit/Echo: 125% means
  // one guaranteed stack plus a 25% chance for a second; 240% means two
  // guaranteed stacks plus a 40% chance for a third.
  const performStrikeV25PoisonBase=performStrike;
  performStrike=async function(target,opts={}){
    const chance=Math.max(0,player.poisonOnHitChance||0);player.poisonOnHitChance=0;
    try{
      const result=await performStrikeV25PoisonBase(target,opts);
      if(target?.hp>0&&chance>0){const stacks=rollTieredProc(chance);if(stacks>0){target.poisonStacks=(target.poisonStacks||0)+stacks;playElementAnimation('nature',target,false);addCombatHistory(`${opts.echo?`Echo ${opts.index||''}`:'Attack'} applies ${stacks} Poison stack${stacks===1?'':'s'} (${Math.round(chance*100)}% Poison chance).`);updateCombatUI();}}
      return result;
    }finally{player.poisonOnHitChance=chance;}
  };

  // Endless Form makes Croak Cascade poisonous: each jump gets an independent
  // 5% chance per Endless Form rank to leave one Poison stack.
  const damageEnemyV25CroakBase=damageEnemy;
  damageEnemy=function(enemy,amount,ignoreDefense=false){
    const dealt=damageEnemyV25CroakBase(enemy,amount,ignoreDefense);
    if(player._v25CroakHitsRemaining>0){player._v25CroakHitsRemaining--;const rank=gameplayTalentRank('monk_flow_ceiling'),chance=rank*.05;if(enemy?.hp>0&&rank>0&&random()<chance){enemy.poisonStacks=(enemy.poisonStacks||0)+1;addCombatHistory(`🐸☠️ Croak Cascade leaves 1 Poison stack (${Math.round(chance*100)}% from Endless Form rank ${rank}).`);}}
    return dealt;
  };
  const useUltimateV25CroakBase=useUltimate;
  useUltimate=async function(){if(!classIdentityActive("frog"))return useUltimateV25CroakBase();player._v25CroakHitsRemaining=Math.max(0,6+Math.floor((player.doubleStrike||0)*4));try{return await useUltimateV25CroakBase();}finally{player._v25CroakHitsRemaining=0;}};

  /* PALE DEVIL: later Hell encounter, barriers, varied attacks and Hellfire ---- */
  const startCombatV25DevilBase=startCombat;
  startCombat=function(kind='normal'){
    const out=startCombatV25DevilBase(kind);
    player.devilBurnStacks=0;
    if(kind==='devil'&&currentEnemy){currentEnemies.forEach(e=>{e.enemyBarrier=Math.max(5,e.enemyBarrier||0);e.devilBoss=true;e.boss=true;e.guardian=true;e.specialName='Pale Moon Waltz';});player.devilBurnStacks=0;addCombatHistory('👿 The Pale Devil arrives behind five infernal barriers. Its attacks leave infinitely stacking Hellfire.');renderEnemyParty();updateCombatUI();}
    return out;
  };
  v24AttackPattern=function(enemy){
    const turn=currentEncounterTurn||1,name=enemy?.name||'';
    if(enemy?.devilBoss){
      if((player.combatShield||0)>0)return {name:'Pitchfork Rake',hits:[.46,.46,.46],burn:1};
      const phase=turn%4;if(phase===0)return {name:'Pale Moon Verdict',hits:[1.48],burn:2};if(phase===1)return {name:'False Step',hits:[.34,1.08],burn:1};if(phase===2)return {name:'Ember Waltz',hits:[.58,.58],burn:1};return {name:'Ashen Kiss',hits:[.92],burn:2,drain:.20};
    }
    if(enemy?.bloodmageBoss)return turn%2?{name:'Blood Needles',hits:[.62,.62]}:{name:'Sanguine Drain',hits:[1.05],drain:.30};
    if(name.includes('Nullstar Hydra'))return turn%2?{name:'Hydra Heads',hits:[.46,.46,.46]}:{name:'Null Bite',hits:[1.12]};
    if(name.includes('Crown-Eater'))return turn%2?{name:'Royal Talons',hits:[.64,.64]}:{name:'Crown Bite',hits:[1.12]};
    if(name.includes('Ring Tyrant'))return turn%2?{name:'Looping Fangs',hits:[.68,.68]}:{name:'Tyrant Bite',hits:[1.14]};
    if(name.includes('Abyssal Custodian'))return turn%2?{name:'Twin Seal Bash',hits:[.68,.68]}:{name:'Custodian Crush',hits:[1.12]};
    if(name.includes('Last Equation'))return turn%2?{name:'Division Sequence',hits:[.50,.50,.50]}:{name:'Proof Strike',hits:[1.22]};
    if(name.includes('Astral Devourer')&&turn%3===0)return {name:'Devouring Claws',hits:[.64,.64]};
    return {name:'Attack',hits:[1]};
  };
  const v24ResolveNormalHitsV25Base=v24ResolveNormalHits;
  v24ResolveNormalHits=async function(enemy,guarded,extraGuardPower,messages,roundState={hit:false}){const pattern=v24AttackPattern(enemy),result=await v24ResolveNormalHitsV25Base(enemy,guarded,extraGuardPower,messages,roundState);if(enemy?.devilBoss&&result.totalDamage>0&&pattern.burn){player.devilBurnStacks=(player.devilBurnStacks||0)+pattern.burn;messages.push(`🔥 ${pattern.name} adds ${pattern.burn} Hellfire stack${pattern.burn===1?'':'s'} (${player.devilBurnStacks} total).`);}return result;};
  function beta03TickEnemyBurns(){let burned=false,total=0,targets=0;if(player.hp<=0||!currentEnemies?.length)return {burned,total,targets,living:livingEnemies().length};for(const e of livingEnemies()){const stacks=Math.min(10,Math.max(0,e.burnStacks||0));if(!stacks)continue;const raw=Math.max(1,Math.ceil(e.maxHp*.01*stacks)),dealt=damageEnemy(e,raw,true);burned=true;targets++;total+=dealt;addCombatHistory(`🔥 Burn ${stacks}/10 scorches ${e.name} for ${dealt} (${stacks}% max HP).`);}return {burned,total,targets,living:livingEnemies().length};}
  const enemyTurnV25DevilBase=enemyTurn;
  enemyTurn=async function(guarded,extraGuardPower=0){const devil=!!currentEncounterLead?.devilBoss,special=devil&&((currentEncounterTurn+1)%GUARDIAN_SPECIAL_INTERVAL===0),r=await enemyTurnV25DevilBase(guarded,extraGuardPower);if(devil&&player.hp>0&&currentEnemy){if(special){player.devilBurnStacks=(player.devilBurnStacks||0)+2;addCombatHistory(`🔥 Pale Moon Waltz adds 2 Hellfire stacks (${player.devilBurnStacks} total).`);}const stacks=player.devilBurnStacks||0;if(stacks>0){const raw=Math.max(1,Math.ceil(player.maxHp*.01*stacks)),hit=v24ApplyDamage(raw);addCombatHistory(`🔥 Hellfire ${stacks} deals ${hit.total} damage${hit.shield?` (${hit.shield} absorbed by Energy Shield)`:''}.`);updateCombatUI();if(player.hp<=0)return handlePlayerDeath();}}if(player.hp>0&&currentEnemies?.length){const burn=beta03TickEnemyBurns();if(burn.burned){const living=livingEnemies();if(!living.length)return winCombat();if(!currentEnemy||currentEnemy.hp<=0)setCurrentEnemy(currentEnemies.indexOf(living[0]));renderEnemyParty();updateCombatUI();}}return r;};
  const updateCombatUIV25BurnBase=updateCombatUI;
  updateCombatUI=function(){updateCombatUIV25BurnBase();if($('playerStatusDots')&&(player.devilBurnStacks||0)>0)$('playerStatusDots').insertAdjacentHTML('beforeend',`<span class="burn-status" title="${player.devilBurnStacks} Hellfire stacks · uncapped · 1% max HP each">🔥×${player.devilBurnStacks}</span>`);};

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
  function v25DownloadLog(){const now=window.DiceboundPlatform.nowIso(),header=`Dicebound debug log\nLogging level: ${meta.debugLogLevel}\nGenerated: ${now}\n\n`,text=header+v25LogBuffer.join('\n'),filename=`dicebound_debug_${window.DiceboundPlatform.nowMs()}.txt`;return window.DiceboundPlatform.downloadText(filename,text);}
  async function v25CopyLog(){const text=v25LogBuffer.join('\n');try{await window.DiceboundPlatform.copyText(text);showToast('Debug log copied');}catch(e){showToast('Could not copy debug log');}}
  window.addEventListener('error',e=>v25Log('errors','window',e.message,{file:e.filename,line:e.lineno,col:e.colno,state:v25State()}));window.addEventListener('unhandledrejection',e=>v25Log('errors','promise',String(e.reason),v25State()));
  document.addEventListener('click',e=>{if((V25_LOG_LEVELS[meta.debugLogLevel]||0)>=4){const t=e.target.closest?.('button,[data-debug],[data-tile-index],.camp-spot')||e.target;v25Log('all','input','click',{id:t?.id||'',debug:t?.dataset?.debug||'',text:(t?.textContent||'').trim().slice(0,100),state:v25State()});}},true);
  document.addEventListener('keydown',e=>{if((V25_LOG_LEVELS[meta.debugLogLevel]||0)>=4)v25Log('all','input','keydown',{key:e.key,code:e.code,state:v25State()});},true);
  ['log','warn','error'].forEach(method=>{const original=console[method]?.bind(console);if(!original)return;console[method]=(...args)=>{try{const level=method==='error'?'errors':'all';v25Log(level,'console',args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '));}catch(e){}return original(...args);};});
  const addLogV25Base=addLog;addLog=function(html){v25Log('events','adventure',String(html).replace(/<[^>]*>/g,''),v25State());return addLogV25Base(html);};
  const addCombatHistoryV25Base=addCombatHistory;addCombatHistory=function(text){v25Log('detailed','combat-history',text,v25State());return addCombatHistoryV25Base(text);};
  const setCombatTextV25Base=setCombatText;setCombatText=function(text,...args){v25Log('detailed','combat-text',text,v25State());return setCombatTextV25Base(text,...args);};
  const saveMetaV25Base=saveMeta;saveMeta=function(){v25Log('all','save','saveMeta()',v25State());return saveMetaV25Base();};
  window.DiceboundDebugLog=Object.freeze({setLevel:v25SetLogLevel,getLevel:()=>meta.debugLogLevel,lines:()=>[...v25LogBuffer],snapshot:()=>v25State(),download:v25DownloadLog,clear:()=>{v25LogBuffer.length=0;v25RefreshLogOutput();}});
  window.DiceboundDebugClasses=Object.freeze({unlock:id=>v25DebugUnlockClass(id),list:()=>Object.values(CLASSES).map(c=>({id:c.id,name:c.name,unlocked:isClassUnlocked(c.id)}))});

  /* DEBUG MENU TABS + NEW DEBUG ACTIONS ----------------------------------- */
  function v25DebugUnlockClass(id){
    if(!CLASSES[id])return false;
    meta.unlocks=meta.unlocks||{};meta.unlocks[id]=true;
    if(id==='bloodmage')meta.bloodmageUnlocked=true;
    saveMeta();renderClassChoices();updateMetaUI();
    showToast(`🧪 Debug unlocked ${CLASSES[id].icon} ${CLASSES[id].name}`);
    return isClassUnlocked(id);
  }
  function v25EnsureDebugControls(){
    const modal=$('debugOverlay')?.querySelector('.modal'),grid=$('debugGrid');if(!modal||!grid)return;
    let nav=$('debugTabs');if(!nav){nav=document.createElement('div');nav.id='debugTabs';nav.className='debug-tabs';nav.innerHTML=`<button class="small-btn active" data-debug-tab="player">Player</button><button class="small-btn" data-debug-tab="progress">Progression</button><button class="small-btn" data-debug-tab="gear">Gear</button><button class="small-btn" data-debug-tab="navigation">Navigation</button><button class="small-btn" data-debug-tab="logging">Logging</button>`;grid.before(nav);nav.addEventListener('click',e=>{const b=e.target.closest('[data-debug-tab]');if(!b)return;v25ShowDebugTab(b.dataset.debugTab);});}
    const categories={player:new Set(['runxp','level','gold','heal','cookies','all_powerups']),progress:new Set(['legacy','talents','unlockclasses','unlockpets','dibo50','nightmare','unlock_hell','double_dice']),gear:new Set(['mythic','mythic_weapon','mythic_boots','mythic_legs','mythic_amulet','mythic_hat','mythic_ring','mythic_offhand','omega_merchant','omega_stone','seed_item','legend_mug_v25','legend_headphones_v25','legend_jacket_v25','omega_horns_v25']),navigation:new Set(['alwayschoose','board2','board3','board4','board5','board6','boss','recover_road_v25'])};
    const ensurePanel=(id)=>{let p=grid.querySelector(`[data-debug-panel="${id}"]`);if(!p){p=document.createElement('div');p.className='debug-tab-panel';p.dataset.debugPanel=id;grid.appendChild(p);}return p;};['player','progress','gear','navigation'].forEach(ensurePanel);
    const addBtn=(id,label)=>{let b=grid.querySelector(`[data-debug="${id}"]`);if(!b){b=document.createElement('button');b.className='small-btn';b.dataset.debug=id;b.textContent=label;grid.appendChild(b);}return b;};
    addBtn('legend_mug_v25',"☕ Axel's Coffee Mug");addBtn('legend_headphones_v25','🎧 Kratz Headphones');addBtn('legend_jacket_v25',"🧥 Kelly's Jean Jacket");addBtn('omega_horns_v25',"👿 Devil's Horns");addBtn('recover_road_v25','🛠️ Recover road state');
    [...grid.querySelectorAll('[data-debug]')].forEach(btn=>{let cat='player';for(const [name,set] of Object.entries(categories))if(set.has(btn.dataset.debug)){cat=name;break;}ensurePanel(cat).appendChild(btn);});
    const progressPanel=ensurePanel('progress');let picker=$('debugClassUnlocker');if(!picker){picker=document.createElement('div');picker.id='debugClassUnlocker';picker.className='debug-class-unlock';progressPanel.prepend(picker);picker.addEventListener('click',e=>{if(e.target.id!=='debugUnlockSelectedClass')return;const id=$('debugClassUnlockSelect')?.value;if(id)v25DebugUnlockClass(id);});}
    const classOptions=Object.values(CLASSES).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${c.icon} ${c.name}${isClassUnlocked(c.id)?' · unlocked':''}</option>`).join('');picker.innerHTML=`<label for="debugClassUnlockSelect">Unlock one class</label><select id="debugClassUnlockSelect">${classOptions}</select><button class="small-btn" id="debugUnlockSelectedClass" type="button">Unlock selected class</button>`;
    let logPanel=$('debugLogPanel');if(!logPanel){logPanel=document.createElement('div');logPanel.id='debugLogPanel';logPanel.className='debug-log-panel';logPanel.dataset.debugPanel='logging';logPanel.innerHTML=`<div class="debug-log-levels">${Object.keys(V25_LOG_LEVELS).map(l=>`<button class="small-btn" data-log-level="${l}">${l[0].toUpperCase()+l.slice(1)}</button>`).join('')}</div><div class="debug-log-note"><b>Errors</b> captures faults. <b>Events</b> adds important game events. <b>Detailed</b> adds combat/state transitions. <b>All</b> records every routed game command, UI input, save call and state snapshot; use it only while reproducing a bug because it is intentionally noisy.</div><pre class="debug-log-output" id="debugLogOutput"></pre><div class="debug-log-actions"><button class="small-btn" id="debugLogSnapshot">Add state snapshot</button><button class="small-btn" id="debugLogCopy">Copy log</button><button class="small-btn" id="debugLogDownload">Download .txt</button><button class="small-btn" id="debugLogClear">Clear</button></div>`;grid.appendChild(logPanel);logPanel.addEventListener('click',e=>{const level=e.target.closest('[data-log-level]')?.dataset.logLevel;if(level)return v25SetLogLevel(level);if(e.target.id==='debugLogSnapshot')v25Log('errors','snapshot','Manual state snapshot',v25State());if(e.target.id==='debugLogCopy')v25CopyLog();if(e.target.id==='debugLogDownload')v25DownloadLog();if(e.target.id==='debugLogClear'){v25LogBuffer.length=0;v25RefreshLogOutput();}});}
    v25ShowDebugTab(nav.querySelector('.active')?.dataset.debugTab||'player');v25RefreshLogOutput();
  }
  function v25ShowDebugTab(id){document.querySelectorAll('#debugTabs [data-debug-tab]').forEach(b=>b.classList.toggle('active',b.dataset.debugTab===id));document.querySelectorAll('#debugGrid [data-debug-panel]').forEach(p=>p.classList.toggle('active',p.dataset.debugPanel===id));}
  const openDebugMenuV25Base=openDebugMenu;openDebugMenu=function(){const r=openDebugMenuV25Base();v25EnsureDebugControls();return r;};
  const debugActionV25Base=debugAction;debugAction=function(action){
    v25Log('events','debug',`debugAction(${action})`,v25State());
    if(['legend_mug_v25','legend_headphones_v25','legend_jacket_v25','omega_horns_v25'].includes(action)){if(!gameStarted){showToast('Start a run first');return;}const item=action==='legend_mug_v25'?generateAxelsCoffeeMug():action==='legend_headphones_v25'?generateKratzHeadphones():action==='legend_jacket_v25'?generateKellysJeanJacket():generateDevilsHorns();equipItem(item,true);renderEquipment();updateHUD();showToast(`${item.name} added`);return;}
    if(action==='recover_road_v25'){v25RecoverRoadState('manual');return;}
    return debugActionV25Base(action);
  };

  /* ROAD SOFT-LOCK WATCHDOG ------------------------------------------------ */
  const v25BlockingOverlayIds=['combatOverlay','levelOverlay','eventOverlay','wheelOverlay','powerupOverlay','merchantOverlay','blessingOverlay','mysticOverlay','lootOverlay','talentOverlay','prestigeMoonOverlay','buffOverlay','prestigeHeirloomOverlay','petCollectionOverlay','diceChoiceOverlay','debugOverlay','bloodwellOverlay','gamblerOverlay','achievementOverlay','infoOverlay','endOverlay'];
  let v25StuckSince=0,v25Recoveries=0,v25LastRecovery=0;
  function v25VisibleBlocker(){return v25BlockingOverlayIds.find(id=>{const el=$(id);return el&&!el.classList.contains('hidden');})||null;}
  function v25RecoverRoadState(reason='watchdog'){
    if(!gameStarted)return false;const blocker=v25VisibleBlocker();if(blocker||combatBusy||currentEnemy){v25Log('detailed','recovery','Recovery skipped: legitimate blocker',{reason,blocker,state:v25State()});return false;}
    const die=$('dice');if(die?.classList.contains('rolling'))return false;
    v25Recoveries++;v25LastRecovery=Date.now();v25Log('errors','recovery','Recovering stuck road state',{reason,tile:tiles[player.position],state:v25State()});
    if(pendingLevelUps>0){openLevelUp();return true;}
    const tile=tiles[player.position];if(tile&&!tile.cleared&&!['empty','start'].includes(tile.type)){rollLocked=true;try{dbBoardTileDispatch.dispatch();}catch(e){v25Log('errors','recovery','resolveTile failed during recovery',{error:String(e),state:v25State()});rollLocked=false;updateHUD();}return true;}
    rollLocked=false;updateHUD();$('rollBtn')?.classList.add('debug-recovered');setTimeout(()=>$('rollBtn')?.classList.remove('debug-recovered'),900);showToast('🛠️ Road state recovered');return true;
  }
  setInterval(()=>{if(!gameStarted||!rollLocked||combatBusy||currentEnemy||v25VisibleBlocker()||$('dice')?.classList.contains('rolling')){v25StuckSince=0;return;}if(!v25StuckSince)v25StuckSince=Date.now();if(Date.now()-v25StuckSince>4200&&Date.now()-v25LastRecovery>5000){v25RecoverRoadState('automatic watchdog');v25StuckSince=0;}},1000);
  window.DiceboundRoadRecovery=Object.freeze({recover:()=>v25RecoverRoadState('console/manual'),status:()=>({recoveries:v25Recoveries,stuckSince:v25StuckSince,state:v25State()})});

  // Install logging around high-level commands after all gameplay overrides.
  function v25TraceCommand(name,fn,level='detailed',args=[],thisArg=undefined){
    v25Log(level,'command',`${name}()`,{args:args.map(x=>typeof x==='object'?'[object]':x),before:v25State()});let result;try{result=fn.apply(thisArg,args);}catch(e){v25Log('errors','command',`${name} threw`,{error:String(e),state:v25State()});throw e;}if(result&&typeof result.then==='function')return result.then(v=>{v25Log('all','command',`${name}() complete`,v25State());return v;},e=>{v25Log('errors','command',`${name} rejected`,{error:String(e),state:v25State()});throw e;});v25Log('all','command',`${name}() complete`,v25State());return result;
  }
  function v25WrapCommand(name,level='detailed'){
    const fn=({rollDice,rollTwoDice,returnToRoad,startCombat,winCombat,applyUpgrade,equipItem,usePotion,usePotionOutsideCombat,identityGuardAction})[name];if(typeof fn!=='function')return;
    const wrapped=function(...args){return v25TraceCommand(name,fn,level,args,this);};
    if(name==='rollDice')rollDice=wrapped;else if(name==='rollTwoDice')rollTwoDice=wrapped;else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='startCombat')startCombat=wrapped;else if(name==='winCombat')winCombat=wrapped;else if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;else if(name==='usePotion')usePotion=wrapped;else if(name==='usePotionOutsideCombat')usePotionOutsideCombat=wrapped;else if(name==='identityGuardAction')identityGuardAction=wrapped;
  }
  ['rollDice','rollTwoDice','returnToRoad','startCombat','winCombat','applyUpgrade','equipItem','usePotion','usePotionOutsideCombat','identityGuardAction'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'||n==='startCombat'||n==='winCombat'?'events':'detailed'));

  /* Final UI sync / tests -------------------------------------------------- */
  const refreshDebugButtonsV25Base=refreshDebugButtons;refreshDebugButtons=function(){const r=refreshDebugButtonsV25Base();v25EnsureDebugControls();return r;};
  DB25.modules={logging:{log:v25Log,setLevel:v25SetLogLevel,state:v25State},recovery:{recover:v25RecoverRoadState},guide:{render:renderInfo}};
  try{Object.defineProperty(window,'DiceboundModules25',{value:Object.freeze(DB25),enumerable:false});}catch(e){}

  setTimeout(()=>{if($('endRestartBtn'))$('endRestartBtn').textContent='Return to camp';v25EnsureDebugControls();renderInfo();},0);


  /* ========================================================================
     Alpha v2.5.1 — combat/loot soft-lock hotfix
     ------------------------------------------------------------------------
     Root cause found from an Edge debug log: the v2.4 rarity migration added
     ordinary Poor gear, but the older D15 seed parser did not accept "poor".
     Poor equipment therefore occasionally decoded to null. Combat victory had
     already cleared the enemy by then, so openLoot(null) threw on item.slot and
     stranded rollLocked/combatBusy. This hotfix fixes the schema mismatch and
     makes the victory/road cleanup defensive so the same class of failure can
     never permanently lock a run again.
     ======================================================================== */

  // Accept the complete current ordinary-rarity ladder in item seed codes.
  // Fall back to the historical parser for old saved/hand-entered seed codes.
  const v15ParseSeedCodeV251Historical=v15ParseSeedCode;
  v15ParseSeedCode=function(code){
    const m=String(code||'').trim().match(/^D15\|(poor|common|uncommon|rare|epic)\|(weapon|offhand|boots|legs|chest|hat|ring|amulet)\|([a-z0-9_]+)\|q(\d+)\|([a-z0-9_-]+)$/i);
    if(!m)return v15ParseSeedCodeV251Historical(code);
    return {rarity:m[1].toLowerCase(),slot:m[2].toLowerCase(),classId:v15SafeClassId(m[3].toLowerCase()),qualityBoost:clamp(Number(m[4])||0,0,8),core:m[5]};
  };

  // Equipment generation should *never* return null to a caller. If any future
  // rarity/parser mismatch slips through, transparently fall back to a Common
  // item and log enough context to identify the bad request.
  const generateEquipmentV251Base=generateEquipment;
  generateEquipment=function(forceRarity=null,forcedSlot=null){
    let item=null;
    try{item=generateEquipmentV251Base(forceRarity,forcedSlot);}catch(e){
      v25Log('errors','loot','Equipment generation threw',{error:String(e),stack:e?.stack||'',forceRarity,forcedSlot,state:v25State()});
    }
    if(item&&EQUIPMENT_SLOTS.includes(item.slot))return item;
    v25Log('errors','loot','Invalid/null generated equipment; using Common fallback',{forceRarity,forcedSlot,item,state:v25State()});
    try{item=generateEquipmentV251Base('common',forcedSlot||pick(EQUIPMENT_SLOTS));}catch(e){
      v25Log('errors','loot','Common equipment fallback threw',{error:String(e),stack:e?.stack||'',state:v25State()});
    }
    if(item&&EQUIPMENT_SLOTS.includes(item.slot))return item;
    // Last-resort valid object. This should never be reached, but keeping the
    // contract intact is preferable to bricking a career because loot failed.
    const slot=forcedSlot&&EQUIPMENT_SLOTS.includes(forcedSlot)?forcedSlot:pick(EQUIPMENT_SLOTS);
    return {id:`gear_failsafe_${Date.now()}_${random().toString(36).slice(2,7)}`,slot,rarity:'common',icon:gearIcon(slot),name:`Reliable ${SLOT_LABELS[slot]}`,bonuses:{maxHp:5},failsafe:true};
  };

  // Loot UI is also defensive now. Invalid rewards are skipped and their
  // continuation callback still fires so victory resolution can finish.
  // Returning to the board is, by definition, no longer combat. Older layers
  // only unlocked the dice and left combatBusy=true. That stale bit prevented
  // the v2.5 watchdog from recognising the exact soft-lock seen in the log.
  const returnToRoadV251Base=returnToRoad;
  returnToRoad=function(...args){
    if(!currentEnemy)combatBusy=false;
    const result=returnToRoadV251Base.apply(this,args);
    if(!currentEnemy)combatBusy=false;
    return result;
  };

  // Contain reward-side failures after an enemy is already dead. The actual
  // null-item cause above is fixed, but this prevents a future optional reward,
  // animation or UI callback from permanently locking a completed battle.
  const winCombatV251Base=winCombat;
  winCombat=async function(...args){
    const defeated=currentEncounterLead||currentEnemy;
    try{
      const result=await winCombatV251Base.apply(this,args);
      if(!currentEnemy&&$('combatOverlay')?.classList.contains('hidden'))combatBusy=false;
      return result;
    }catch(e){
      const battleFinished=!currentEnemy&&(!currentEnemies?.length||currentEnemies.every(x=>!x||x.hp<=0));
      v25Log('errors','hotfix','winCombat failure contained',{error:String(e),stack:e?.stack||'',battleFinished,defeated:defeated?.name||null,state:v25State()});
      if(!battleFinished)throw e;
      combatBusy=false;
      $('combatOverlay')?.classList.add('hidden');
      currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;
      const continueAfterError=()=>{
        try{
          if(defeated?.finalBoss){
            // Existing board-transition wrappers retain authority over how a
            // late-road final victory completes the journey.
            advanceToNextBoard();
          }else{
            rollLocked=false;updateHUD();
          }
        }catch(inner){
          v25Log('errors','hotfix','Post-victory recovery continuation failed',{error:String(inner),stack:inner?.stack||'',state:v25State()});
          rollLocked=false;combatBusy=false;updateHUD();
        }
      };
      if(pendingLevelUps>0)openLevelUp(continueAfterError);else continueAfterError();
      showToast('🛠️ Victory reward error contained — road recovered',3200,true);
      return null;
    }
  };

  // Lightweight state healer for saves/runs already carrying the stale
  // combatBusy flag. It never runs while an enemy or combat overlay exists.
  setInterval(()=>{
    if(gameStarted&&combatBusy&&!currentEnemy&&$('combatOverlay')?.classList.contains('hidden')){
      combatBusy=false;
      v25Log('detailed','hotfix','Cleared stale combatBusy flag',v25State());
    }
  },750);


  v25Log('events','hotfix','Alpha v2.5.1 hotfix loaded',{fixes:['poor-seed-parser','null-loot-guard','combatBusy-cleanup','victory-error-containment']});


  /* ========================================================================
     Alpha v2.6 — progression reliability, poison visibility and secret polish
     ======================================================================== */
  document.title='Dicebound: Alpha v2.6';
  const v26Brand=document.querySelector('.brand h1');if(v26Brand)v26Brand.textContent='Dicebound: Alpha v2.6';
  const v26Sub=document.querySelector('.brand p');if(v26Sub)v26Sub.textContent='The road grows stranger: sturdier talents, clearer poison, sharper secrets and cleaner debug tools.';

  const v26Upgrade=id=>upgrades.find(u=>u.id===id);
  function v26EnsureUpgrade(def){if(!upgrades.some(u=>u.id===def.id))upgrades.push(def);return v26Upgrade(def.id);}

  /* POWERUP LADDER / RARITY CLEANUP --------------------------------------- */
  const purse26=v26Upgrade('purse');if(purse26){purse26.rarity='poor';purse26.desc='Gain 100 gold, increased by your Gold bonus.';purse26.apply=function(){player.gold+=modifiedGold(100);};}
  const scholar26=v26Upgrade('scholar');if(scholar26){scholar26.rarity='poor';scholar26.name="Scholar's Sigil";scholar26.desc='Gain +10% enemy XP this run.';scholar26.apply=function(){player.xpBonus+=.10;};}
  v26EnsureUpgrade({id:'scholar_common_v26',rarity:'common',icon:'📘',name:"Scholar's Sigil+",desc:'Gain +20% enemy XP this run.',apply(){player.xpBonus+=.20;}});
  v26EnsureUpgrade({id:'scholar_uncommon_v26',rarity:'uncommon',icon:'📚',name:"Scholar's Sigil++",desc:'Gain +35% enemy XP this run.',apply(){player.xpBonus+=.35;}});
  const ward26=v26Upgrade('ward');if(ward26)ward26.rarity='common';
  const wind26=v26Upgrade('heal');if(wind26)wind26.rarity='poor';
  const thorns26=v26Upgrade('thorns');if(thorns26){thorns26.rarity='poor';thorns26.name='Spiked Armor';thorns26.desc='Enemies take 3 damage whenever they hit you.';thorns26.apply=function(){player.thorns+=3;};}
  v26EnsureUpgrade({id:'thorns_common_v26',rarity:'common',icon:'🦔',name:'Barbed Armor',desc:'Enemies take 7 damage whenever they hit you.',apply(){player.thorns+=7;}});
  const venomCoil26=v26Upgrade('ouro_venom_coil');if(venomCoil26){venomCoil26.rarity='rare';venomCoil26.desc='Gain +35% Echo Strike, +15% Poison Chance and +20% Poison damage.';venomCoil26.apply=function(){player.doubleStrike+=.35;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.15;player.poisonStackPower=(player.poisonStackPower||.12)+.20;};}
  const blackFang26=v26Upgrade('venom_edge_rare_v25');if(blackFang26){blackFang26.rarity='epic';blackFang26.name='Venom Edge: Black Fang';blackFang26.desc='Gain +35% Poison Chance and +30% Poison damage.';blackFang26.apply=function(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.35;player.poisonStackPower=(player.poisonStackPower||.12)+.30;};}
  const pack26=v26Upgrade('legendary_packbreaker');if(pack26){pack26.rarity='epic';pack26.desc='Deal +50% damage while two or more enemies remain alive and gain +5% Echo Strike.';}

  /* SECOND OPINION / EXPANDED HORIZONS ------------------------------------ */
  // Keep a stable per-run snapshot. Rerolls track consumption separately, so
  // refreshing a chooser cannot erase or accidentally refill the talent.
  const resetPlayerV26TalentBase=resetPlayer;
  resetPlayer=function(classId=selectedClassId){
    const r=resetPlayerV26TalentBase(classId);
    player.v26SecondOpinionRank=gameplayTalentRank('fortune_powerup_rerolls');
    player.v26SecondOpinionSpent=0;
    player.powerupRerolls=player.v26SecondOpinionRank;
    player.v26ExpandedHorizons=gameplayTalentRank('fortune_extra_choice')>0;
    player.levelChoiceBonus=player.v26ExpandedHorizons?1:0;
    const form=gameplayTalentRank('monk_flow_ceiling');
    player.fighterCounterMax=Math.max(1,1+form);
    return r;
  };
  attachPowerupRerollV16=function(grid,reroll){
    if(!grid)return;grid.querySelectorAll('.powerup-reroll-btn').forEach(x=>x.remove());
    const total=Math.max(0,Number(player.v26SecondOpinionRank??gameplayTalentRank('fortune_powerup_rerolls'))||0),spent=Math.max(0,Number(player.v26SecondOpinionSpent)||0),remaining=Math.max(0,total-spent);player.powerupRerolls=remaining;
    const b=document.createElement('button');b.className='powerup-reroll-btn';b.disabled=remaining<=0;b.textContent=`🔄 Reroll choices · ${remaining} remaining`;b.addEventListener('click',()=>{if((player.v26SecondOpinionSpent||0)>=total)return;player.v26SecondOpinionSpent=(player.v26SecondOpinionSpent||0)+1;player.powerupRerolls=Math.max(0,total-player.v26SecondOpinionSpent);sfx.roll();reroll();});grid.appendChild(b);
  };
  const openLevelUpV26Base=openLevelUp;openLevelUp=function(onComplete=null){if(gameStarted&&player.v26ExpandedHorizons)player.levelChoiceBonus=1;return openLevelUpV26Base(onComplete);};

  /* COUNTER RESERVE -> ENDLESS FORM --------------------------------------- */
  const v26CounterIdx=talents.findIndex(t=>t.id==='fighter_counter_reserve');
  if(v26CounterIdx>=0){const t=talents[v26CounterIdx],rank=Math.max(0,Number(meta.purchased?.fighter_counter_reserve)||0);if(rank){meta.points=(meta.points||0)+rank*(t.cost||2);delete meta.purchased.fighter_counter_reserve;showToast('Counter Reserve refunded — its effect moved into Endless Form');}if(runTalentSnapshot?.fighter_counter_reserve)delete runTalentSnapshot.fighter_counter_reserve;talents.splice(v26CounterIdx,1);saveMeta();}
  const endless26=talents.find(t=>t.id==='monk_flow_ceiling');if(endless26)endless26.desc='Each rank improves many class signatures: Ranger Marks, Monk Combo, Turtle Guard chain, Fighter Counterblow damage and +1 stored Counterblow, Mana building, Cleric Faith gain, Summoner spirits and Alchemist flasks.';

  /* HIGH-LUCK POOR SUPPRESSION -------------------------------------------- */
  const rollGearRarityV26Base=rollGearRarity;rollGearRarity=function(...args){let r=rollGearRarityV26Base.apply(this,args);if((player.luck||0)>1&&r==='poor'&&random()<.97)r='common';return r;};
  const weightedUpgradeV26Base=weightedUpgrade;weightedUpgrade=function(pool){let u=weightedUpgradeV26Base(pool);if((player.luck||0)>1&&u?.rarity==='poor'&&random()<.97){const better=pool.filter(x=>x?.rarity!=='poor');if(better.length)u=weightedUpgradeV26Base(better);}return u;};

  /* LONG STRIDE: FATE CHOICES ARE EXACT ----------------------------------- */
  // The legacy debug 1d6 capture path predates the shared fate rule. Replace
  // it with a capture handler that never grants Long Stride on chosen results.
  $('rollBtn')?.addEventListener('click',async e=>{
    if(!(meta.debugAlwaysChooseRolls&&gameStarted&&!rollLocked))return;
    e.preventDefault();e.stopImmediatePropagation();ensureAudio();rollLocked=true;updateHUD();const die=$('dice');die.classList.add('rolling');for(let i=0;i<8;i++){die.textContent=pick(diceFaces);sfx.roll();await delay(45+i*5);}const value=await chooseDieResult();die.textContent=diceFaces[value-1];die.classList.remove('rolling');rolls++;ensureAlphaMeta().rolls++;addLog(`Debug fate chooses <b>${value}</b>. Long Stride does not alter chosen fate.`);await dbBoardMovement.move(value,value,false,true);
  },true);

  /* POISON AS A FIRST-CLASS VISIBLE STAT ---------------------------------- */
  function v26EnsurePoisonStat(){if($('poisonChanceText'))return;const echo=$('echoText')?.closest('.stat'),grid=echo?.parentElement;if(!grid)return;const box=document.createElement('div');box.className='stat v18-stat-tooltip';box.id='poisonChanceStat';box.innerHTML='<span>Poison Chance</span><strong id="poisonChanceText">0%</strong>';echo.after(box);}
  function v26PoisonStackDamage(){return Math.max(1,Math.round((player.attack||0)*(player.poisonStackPower||.12)));}
  const updateHUDV26PoisonBase=updateHUD;updateHUD=function(){if(classIdentityActive('ouroboros'))v18SyncOuroborosAttack();const r=updateHUDV26PoisonBase();v26EnsurePoisonStat();const t=$('poisonChanceText'),box=$('poisonChanceStat');if(t)t.textContent=`${Math.round((player.poisonOnHitChance||0)*100)}%`;if(box)box.dataset.tip=`${Math.round((player.poisonOnHitChance||0)*100)}% Poison Chance per eligible strike. Chance above 100% guarantees stacks and rolls the overflow for extra stacks. One Poison stack currently deals ${v26PoisonStackDamage()} damage each Poison tick before affinity modifiers.`;return r;};

  /* LEGENDARY REWARD EXHAUSTION ------------------------------------------- */
  showLegendaryChoice=function(source,onComplete=()=>{}){const pool=eligibleUpgrades(u=>u.rarity==='legendary');if(!pool.length){const gold=modifiedGold(250);player.gold+=gold;player.potions+=2;addLog(`<b>${source}:</b> every eligible Legendary power is already owned this run. The guardian converts the exhausted boon into <b>${gold} gold</b> and <b>2 potions</b>.`);showToast(`👑 Legendary pool exhausted · +${gold} gold · +2 potions`,3000,true);updateHUD();setTimeout(()=>onComplete(false),0);return;}showPowerupChoice(source,onComplete,u=>u.rarity==='legendary','The guardian yields. Choose one guaranteed Legendary powerup.');};

  /* OUROBOROS: ATTACK IS A CURRENCY FOR ECHO, NOT NORMAL DAMAGE ----------- */
  v18SyncOuroborosAttack=function(){if(!classIdentityActive('ouroboros'))return;const delta=(Number(player.attack)||0)-10;if(Math.abs(delta)>.0001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=10;}};
  const strikeBaseDamageV26OuroBase=strikeBaseDamage;strikeBaseDamage=function(echo=false,chaos=null){if(!classIdentityActive('ouroboros'))return strikeBaseDamageV26OuroBase(echo,chaos);v18SyncOuroborosAttack();const goldScale=player.goldAttackScale;player.goldAttackScale=0;try{return strikeBaseDamageV26OuroBase(echo,chaos);}finally{player.goldAttackScale=goldScale;player.attack=10;}};
  const performStrikeV26SpeedBase=performStrike;performStrike=async function(target,opts={}){const turbo=classIdentityActive('ouroboros')&&(player.doubleStrike||0)>10;if(turbo)window.__DB_V26_FAST_ECHO__=true;try{return await performStrikeV26SpeedBase(target,opts);}finally{if(turbo)window.__DB_V26_FAST_ECHO__=false;}};

  /* PHILOSOPHER'S STONE ---------------------------------------------------- */
  generatePhilosophersStone=function(){return {id:`philosopher_stone_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'amulet',rarity:'omega',mythical:true,bloodmageStone:true,icon:'🜂',name:"Philosopher's Stone",uniqueEffect:'Scarlet Transmutation: overhealing converts 5% of the excess into Energy Shield and 1% into temporary Attack for this battle. Blood-fuelled abilities cost less life.',bonuses:{maxHp:36,attack:12,lifeSteal:.24,crit:.20,luck:.20,bossDamage:.18}};};
  function v26HasStone(){return !!player.equipment?.amulet?.bloodmageStone;}
  function v26ClearStoneBattle(){const atk=Number(player.v26StoneBattleAttack)||0,echo=Number(player.v26StoneBattleEcho)||0;if(atk)player.attack-=atk;if(echo)player.doubleStrike=Math.max(0,player.doubleStrike-echo);player.v26StoneBattleAttack=0;player.v26StoneBattleEcho=0;if(classIdentityActive('ouroboros'))v18SyncOuroborosAttack();}
  const healPlayerV26StoneBase=healPlayer;healPlayer=function(amount,opts){const raw=Math.max(0,Math.round(amount||0)),beforeHp=player.hp,beforeMax=player.maxHp,room=Math.max(0,beforeMax-beforeHp),healed=healPlayerV26StoneBase(amount,opts);if(v26HasStone()&&currentEnemy&&raw>room){const maxGrowth=Math.max(0,player.maxHp-beforeMax),over=Math.max(0,raw-room-maxGrowth);if(over>0){const shieldGain=over*.05,attackGain=over*.01;player.energyShield=Math.min(player.maxHp,(player.energyShield||0)+shieldGain);if(classIdentityActive('ouroboros')){const echoGain=attackGain*.10;player.doubleStrike+=echoGain;player.v26StoneBattleEcho=(player.v26StoneBattleEcho||0)+echoGain;}else{player.attack+=attackGain;player.v26StoneBattleAttack=(player.v26StoneBattleAttack||0)+attackGain;}addCombatHistory(`🜂 Philosopher's Stone transmutes ${over} overheal into +${shieldGain.toFixed(1)} Energy Shield and +${attackGain.toFixed(2)} temporary Attack${player.classId==='ouroboros'?' (converted to Echo)':''}.`);}}return healed;};
  const startCombatV26StoneBase=startCombat;startCombat=function(kind='normal'){v26ClearStoneBattle();return startCombatV26StoneBase(kind);};

  /* SECRET BOSS LEGACY PAYOUTS -------------------------------------------- */
  const winCombatV26Base=winCombat;winCombat=async function(...args){const defeated=currentEncounterLead||currentEnemy,secret=defeated?.devilBoss?'devil':defeated?.bloodmageBoss?'bloodmage':defeated?.merchantBoss?'merchant':null;const r=await winCombatV26Base.apply(this,args);v26ClearStoneBattle();if(secret){const base={merchant:400,bloodmage:650,devil:1200}[secret],gain=Math.max(1,Math.round(base*(1+(player.legacyXpBonus||0))));grantLegacyXp(gain);saveMeta();updateMetaUI();addLog(`<b>Secret legacy:</b> defeating ${defeated?.name||secret} grants <b>+${gain} Legacy XP</b>.`);showToast(`🌟 Secret boss · +${gain} Legacy XP`,3200,true);}return r;};
  const returnToRoadV26Base=returnToRoad;returnToRoad=function(...args){const r=returnToRoadV26Base.apply(this,args);if(!currentEnemy)v26ClearStoneBattle();return r;};


  /* DEBUG MENU CLEANUP / DEATH SIMULATION / CURRENT ARTIFACT GEAR --------- */
  const v25EnsureDebugControlsV26Base=v25EnsureDebugControls;v25EnsureDebugControls=function(){v25EnsureDebugControlsV26Base();const grid=$('debugGrid');if(!grid)return;
    // Remove the three legacy v1.9 orphan controls; recreate them as ordinary
    // data-debug controls so the tab router owns them exactly once.
    grid.querySelectorAll('[data-v19-action]').forEach(b=>b.remove());grid.querySelector('[data-debug="mythicring"]')?.remove();
    const ensure=(id,label)=>{let b=grid.querySelector(`[data-debug="${id}"]`);if(!b){b=document.createElement('button');b.className='small-btn';b.dataset.debug=id;grid.appendChild(b);}b.textContent=label;return b;};
    ensure('board6','🛣️ Jump to Board 6');ensure('mythic_offhand','🟧 Artifact Offhand');ensure('double_dice','🎲 Unlock 2d6');ensure('kill_character_v26','☠️ Kill character');
    const labels={mythic:'🟧 Equip full Artifact set',mythic_weapon:'🟧 Artifact Weapon',mythic_boots:'🟧 Artifact Boots',mythic_legs:'🟧 Artifact Legguards',mythic_amulet:'🟧 Artifact Amulet',mythic_hat:'🟧 Artifact Hat',mythic_ring:'🟧 Artifact Ring',mythicring:'🟧 Artifact Ring',mythic_offhand:'🟧 Artifact Offhand'};Object.entries(labels).forEach(([id,label])=>{const b=grid.querySelector(`[data-debug="${id}"]`);if(b)b.textContent=label;});
    const playerPanel=grid.querySelector('[data-debug-panel="player"]'),progressPanel=grid.querySelector('[data-debug-panel="progress"]'),gearPanel=grid.querySelector('[data-debug-panel="gear"]'),navPanel=grid.querySelector('[data-debug-panel="navigation"]');const move=(id,p)=>{const b=grid.querySelector(`[data-debug="${id}"]`);if(b&&p)p.appendChild(b);};move('kill_character_v26',playerPanel);move('double_dice',progressPanel);['mythic','mythic_weapon','mythic_boots','mythic_legs','mythic_amulet','mythic_hat','mythic_ring','mythicring','mythic_offhand'].forEach(id=>move(id,gearPanel));move('board6',navPanel);v25ShowDebugTab(document.querySelector('#debugTabs .active')?.dataset.debugTab||'player');};
  const debugActionV26Base=debugAction;debugAction=function(action){if(action==='kill_character_v26'){if(!gameStarted){showToast('Start a run first');return;}$('debugOverlay')?.classList.add('hidden');const damage=Math.max(1,Math.ceil(player.hp+player.maxHp));meta.damageTaken=(meta.damageTaken||0)+damage;player.hp=0;addLog('<b>Debug monster</b> deals lethal damage. Running the normal death/revive pipeline.');showToast('☠️ Debug monster attacks');handlePlayerDeath();updateHUD();return;}const artifactFns={mythic_weapon:generateMythicalWeapon,mythic_offhand:generateMythicalOffhand,mythic_boots:generateMythicalBoots,mythic_legs:generateMythicalPants,mythic_amulet:generateMythicalAmulet,mythic_hat:generateMythicalHat,mythic_ring:generateMythicalRing};if(artifactFns[action]){if(!gameStarted){showToast('Start a run first');return;}const item=artifactFns[action]();equipItem(item,true);renderEquipment();updateHUD();showToast(`Artifact ${SLOT_LABELS[item.slot]} added`);return;}if(action==='mythic'){if(!gameStarted){showToast('Start a run first');return;}[generateMythicalWeapon,generateMythicalOffhand,generateMythicalBoots,generateMythicalPants,generateMythicalAmulet,generateMythicalHat,generateMythicalRing].forEach(fn=>equipItem(fn(),true));renderEquipment();updateHUD();showToast('Full current seven-piece Artifact set equipped');return;}return debugActionV26Base(action);};
  const refreshDebugButtonsV26Base=refreshDebugButtons;refreshDebugButtons=function(){const r=refreshDebugButtonsV26Base();v25EnsureDebugControls();return r;};

  /* Regression helpers ---------------------------------------------------- */

  setTimeout(()=>{v26EnsurePoisonStat();v25EnsureDebugControls();updateHUD();renderTalents();},0);

  /* ========================================================================
     Alpha v2.7 — rarity rewards, nightmare defenses, Ouroboros & UI polish
     ======================================================================== */
  document.title='Dicebound: Alpha v2.7';
  const v27Brand=document.querySelector('.brand h1');if(v27Brand)v27Brand.textContent='Dicebound: Alpha v2.7';
  const v27Sub=document.querySelector('.brand p');if(v27Sub)v27Sub.textContent='The road fights back: smarter rewards, tougher difficulties, cleaner shields and faster impossible snakes.';

  const v27Upgrade=id=>upgrades.find(u=>u.id===id);
  function v27EnsureUpgrade(def){if(!upgrades.some(u=>u.id===def.id))upgrades.push(def);return v27Upgrade(def.id);}

  /* QUIETER COMBAT FEEDBACK ------------------------------------------------ */
  // Elemental activations remain in the combat text/history and animations,
  // but no longer create a toast in the middle of every proc chain.
  const showToastV27Base=showToast;
  showToast=function(text,...args){
    const s=String(text??'');
    const procToast=Object.values(ELEMENTS).some(e=>s.startsWith(`${e.icon} ${e.spell}`))||/^☢️\s*-?\d+\s*DEF/.test(s);
    if(procToast)return;
    return showToastV27Base(text,...args);
  };
  // Feeding and pet level-ups are quiet too. The campsite/pet card updates
  // immediately, which is enough feedback without queueing extra toasts.
  feedActivePet=function(count=1){
    const state=activePetState(),def=activePetDef(),actual=Math.min(Math.max(0,Math.floor(count||0)),meta.petCookies||0);if(actual<=0)return;
    meta.petCookies-=actual;state.xp+=actual*(1+(player.cookieBondBonus||0));let levels=0;
    while(state.xp>=state.xpNext){state.xp-=state.xpNext;state.level++;state.xpNext=2+Math.floor(state.level*.7);levels++;}
    saveMeta();checkDynamicClassUnlocks();levels?sfx.level():sfx.coin();
    addLog(`${def.icon} ${def.name} ate <b>${actual}</b> cookie${actual===1?'':'s'}${levels?` and gained <b>${levels}</b> level${levels===1?'':'s'}`:''}.`);
    updateMetaUI();renderPetCollection?.();
  };

  /* LEGENDARY DESIGN: RARITY != UNIQUE ------------------------------------ */
  ['legendary_worldheart','legendary_echo_crown','legendary_prismatic','legendary_blood_contract','true_legend_attack_v24','true_legend_echo_v24','true_legend_guard_v24','true_legend_element_v24'].forEach(id=>{const u=v27Upgrade(id);if(u)u.unique=false;});
  const golden27=v27Upgrade('legendary_golden_law');if(golden27){golden27.unique=true;golden27.desc='Gain +100% gold. Every 100 gold grants +1 effective Attack; Ouroboros converts that growth into +10% Echo Strike instead.';}

  v27EnsureUpgrade({id:'legendary_crimson_aegis_v27',rarity:'legendary',unique:true,icon:'🩸🔵',name:'Crimson Aegis',desc:'Gain +30% Lifesteal. Overhealing converts 1% of the excess into Energy Shield.',apply(){player.lifeSteal+=.30;player.legendaryOverhealShieldRate=Math.max(player.legendaryOverhealShieldRate||0,.01);}});
  v27EnsureUpgrade({id:'legendary_star_eater_v27',rarity:'legendary',icon:'🌠🗡️',name:"Star-Eater's Rhythm",desc:'Gain +35% Crit, +60% Echo Strike and +20% Boss Damage.',apply(){player.crit+=.35;player.doubleStrike+=.60;player.bossDamage+=.20;}});
  v27EnsureUpgrade({id:'legendary_adamant_v27',rarity:'legendary',icon:'🛡️🌟',name:'Adamant Testament',desc:'Gain +10 Defense, +35 max HP and +2 flat damage reduction.',apply(){player.defense+=10;player.maxHp+=35;player.hp+=35;player.flatReduction+=2;}});
  v27EnsureUpgrade({id:'legendary_venom_throne_v27',rarity:'legendary',icon:'☠️👑',name:'Throne of Venom',desc:'Gain +50% Poison Chance, +40% Poison damage and +10% Lifesteal.',apply(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.50;player.poisonStackPower=(player.poisonStackPower||.12)+.40;player.lifeSteal+=.10;}});
  v27EnsureUpgrade({id:'legendary_kings_ransom_v27',rarity:'legendary',icon:'👑🪙',name:"King's Ransom",desc:'Gain +150% gold, +25 Luck and +30% Boss Damage.',apply(){player.goldBonus+=1.50;player.luck+=.25;player.bossDamage+=.30;}});
  v27EnsureUpgrade({id:'legendary_prismatic_choir_v27',rarity:'legendary',icon:'🌈🎼',name:'Prismatic Choir',desc:'Gain +30% elemental proc chance, +75% elemental power and +10 Ultimate whenever you exploit a weakness.',apply(){player.elementProcBonus+=.30;player.elementDamageBonus+=.75;player.elementUltimateGain=(player.elementUltimateGain||0)+10;}});
  v27EnsureUpgrade({id:'legendary_wanderer_v27',rarity:'legendary',icon:'🥾🌟',name:'Legend of the Endless Mile',desc:'Gain +25 Luck, +20% Dodge, +30% Boss Damage and +30 starting Ultimate.',apply(){player.luck+=.25;player.dodge+=.20;player.bossDamage+=.30;player.ultimateCharge=clamp(player.ultimateCharge+30,0,100);}});

  /* OUROBOROS: EVERY ATTACK SOURCE BECOMES ECHO --------------------------- */
  function v27SyncOuroborosEconomy(){
    if(!classIdentityActive('ouroboros'))return;
    // Any gold->Attack scaling source is converted into the mathematically
    // equivalent dynamic Echo scaling: +1 effective Attack == +10% Echo.
    if((player.goldAttackScale||0)!==0){player.v27OuroGoldEchoScale=(player.v27OuroGoldEchoScale||0)+player.goldAttackScale*.10;player.goldAttackScale=0;}
    const desired=(player.gold||0)*(player.v27OuroGoldEchoScale||0),old=player.v27OuroGoldEchoApplied||0;
    if(Math.abs(desired-old)>.0000001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+(desired-old));player.v27OuroGoldEchoApplied=desired;}
    v18SyncOuroborosAttack();
  }
  const resetPlayerV27Base=resetPlayer;resetPlayer=function(classId=selectedClassId){const r=resetPlayerV27Base(classId);player.legendaryOverhealShieldRate=0;player.v27OuroGoldEchoScale=0;player.v27OuroGoldEchoApplied=0;v27SyncOuroborosEconomy();return r;};
  const applyUpgradeV27Base=applyUpgrade;applyUpgrade=function(up,source){const r=applyUpgradeV27Base(up,source);v27SyncOuroborosEconomy();return r;};
  const updateHUDV27OuroBase=updateHUD;updateHUD=function(){v27SyncOuroborosEconomy();const r=updateHUDV27OuroBase();if(classIdentityActive('ouroboros')&&$('attackText'))$('attackText').textContent='10';return r;};

  /* EXTREME ECHO SPEED ----------------------------------------------------- */
  // delay() reads this cap. Normal Ouroboros attacks become faster above
  // 1,000% Echo and dramatically faster above 5,000%, while other classes
  // keep the normal readable action cadence.
  const performStrikeV27SpeedDodgeBase=performStrike;
  performStrike=async function(target,opts={}){
    const oldCap=window.__DB_FAST_ECHO_CAP__||0,echo=player.doubleStrike||0;
    if(classIdentityActive('ouroboros')){window.__DB_FAST_ECHO_CAP__=echo>=50?10:echo>=10?32:0;v27SyncOuroborosEconomy();}
    try{
      if(target?.hp>0&&(target.dodge||0)>0&&random()<target.dodge){
        await animateClassAttack(opts.echo?'echo':'normal');player.combatAttackCount++;
        setCombatText(`${target.name} dodges ${opts.echo?`Echo ${opts.index||''}`:'the attack'}.`);addCombatHistory(`🌫️ ${target.name} dodges (${Math.round(target.dodge*100)}% enemy Dodge).`);updateCombatUI();await delay(classIdentityActive('ouroboros')?35:220);return {dealt:0,crit:0,elementDamage:0,dodged:true};
      }
      return await performStrikeV27SpeedDodgeBase(target,opts);
    }finally{window.__DB_FAST_ECHO_CAP__=oldCap;}
  };
  const useUltimateV27SpeedBase=useUltimate;useUltimate=async function(){if(player.classId!=='ouroboros')return useUltimateV27SpeedBase();const oldCap=window.__DB_FAST_ECHO_CAP__||0,echo=player.doubleStrike||0;window.__DB_FAST_ECHO_CAP__=echo>=50?8:echo>=10?28:90;try{return await useUltimateV27SpeedBase();}finally{window.__DB_FAST_ECHO_CAP__=oldCap;}};

  /* ENERGY SHIELD ---------------------------------------------------------- */
  const healPlayerV27AegisBase=healPlayer;healPlayer=function(amount,opts){const raw=Math.max(0,Math.round(amount||0)),beforeHp=player.hp,beforeMax=player.maxHp,room=Math.max(0,beforeMax-beforeHp),r=healPlayerV27AegisBase(amount,opts),rate=player.legendaryOverhealShieldRate||0;if(rate>0&&raw>room){const growth=Math.max(0,player.maxHp-beforeMax),over=Math.max(0,raw-room-growth);if(over>0){const gain=over*rate;player.energyShield=Math.min(player.maxHp,(player.energyShield||0)+gain);if(currentEnemy)addCombatHistory(`🩸🔵 Crimson Aegis turns ${over} overheal into +${gain.toFixed(1)} Energy Shield.`);}}v24UpdateShieldBars?.();return r;};

  /* POISON COUNTER CLEANUP ------------------------------------------------- */
  v17CompactPoisonMarkers=function(){};
  statusDotsHTML=function(barriers=0,poison=0,affinity=null){let html='';if(barriers>=5)html+=`<span class="status-count barrier-count" title="${barriers} Barrier stacks">🛡️ ${barriers}</span>`;else for(let i=0;i<barriers;i++)html+='<span class="status-dot barrier" title="Barrier"></span>';if(poison>=5)html+=`<span class="status-count poison-count" title="${poison} Poison stacks">☠️ ${poison}</span>`;else for(let i=0;i<poison;i++)html+='<span class="status-dot poison" title="Poison"></span>';if(affinity&&ELEMENTS[affinity])html+=`<span class="status-affinity" title="${ELEMENTS[affinity].name} affinity">${ELEMENTS[affinity].icon}</span>`;return html;};

  /* MYSTIC & MINIBOSS POWERUP REWARDS ------------------------------------- */
  function v27FallbackRarityPool(wanted){const order=['legendary','epic','rare','uncommon','common','poor'],start=Math.max(0,order.indexOf(wanted));for(let i=start;i<order.length;i++){const pool=eligibleUpgrades(u=>u.rarity===order[i]);if(pool.length)return {rarity:order[i],pool};}for(let i=start-1;i>=0;i--){const pool=eligibleUpgrades(u=>u.rarity===order[i]);if(pool.length)return {rarity:order[i],pool};}return {rarity:null,pool:[]};}
  function beta03RollMysticRarity(){const p=random();return p<.10?'legendary':p<.40?'epic':'rare';}
  openMystic=function(){const wanted=beta03RollMysticRarity(),choice=v27FallbackRarityPool(wanted);currentMysticBuff=choice.pool.length?pick(choice.pool):null;if(!currentMysticBuff){addLog('<b>Mystic:</b> no eligible powerups remain. The Mystic leaves without taking your HP.');returnToRoad();return;}const label=rarityInfo[currentMysticBuff.rarity]?.label||currentMysticBuff.rarity;$('mysticOffer').className=`loot-card ${currentMysticBuff.rarity}`;$('mysticOffer').innerHTML=`<div class="loot-top"><div class="loot-icon">${currentMysticBuff.icon}</div><div><div class="rarity-badge">${label}</div><div class="loot-name">${currentMysticBuff.name}</div></div></div><div class="loot-bonuses">${currentMysticBuff.desc}</div>`;const sub=$('mysticOverlay')?.querySelector('.subtitle');if(sub)sub.textContent=`Mystic rarity: 60% Rare · 30% Epic · 10% Legendary. Lose 10% maximum HP for the rest of this run to accept this ${label} gift.`;$('mysticOverlay').classList.remove('hidden');addLog(`A hooded <b>Mystic</b> rolls a ${label} power from the 60/30/10 forbidden table.`);};

  function beta03MinibossBaseTable(level=boardLevel){return level<=1?{legendary:.08,epic:.32,rare:.76,uncommon:.95}:level===2?{legendary:.14,epic:.58,rare:.86,uncommon:.97}:{legendary:.22,epic:.58,rare:.86,uncommon:.97};}
  function beta03MinibossOddsText(level=boardLevel){return level<=1?'8% Legendary · 24% Epic · 44% Rare · 19% Uncommon · 5% Common':level===2?'14% Legendary · 44% Epic · 28% Rare · 11% Uncommon · 3% Common':'22% Legendary · 36% Epic · 28% Rare · 11% Uncommon · 3% Common';}
  function v27RollMinibossRarity(){const luck=Math.min(.12,Math.max(0,player.luck||0)*.025),bonus=(nightmareMode?.04:0)+(hellMode?.05:0),p=random(),t=beta03MinibossBaseTable();if(p<t.legendary+luck+bonus)return 'legendary';if(p<t.epic+luck+bonus)return 'epic';if(p<t.rare+luck*.5)return 'rare';if(p<t.uncommon)return 'uncommon';return 'common';}
  function v27MinibossChoices(){const count=Math.max(3,3+(player.levelChoiceBonus||0)),out=[],used=new Set();for(let i=0;i<count;i++){let wanted=v27RollMinibossRarity(),found=v27FallbackRarityPool(wanted),pool=found.pool.filter(u=>!used.has(u.id));if(!pool.length)pool=found.pool;if(!pool.length)break;const u=pick(pool);used.add(u.id);out.push(u);}return out;}
  function v27ShowMinibossReward(source,onComplete=()=>{}){const overlay=$('powerupOverlay'),grid=$('powerupGrid');if(!overlay||!grid){onComplete(false);return;}const render=()=>{grid.innerHTML='';const choices=v27MinibossChoices();if(!choices.length){addLog('<b>Miniboss boon:</b> no eligible powerups remain.');overlay.classList.add('hidden');onComplete(false);return;}$('powerupTitle').textContent='👑 Guardian Boon';$('powerupSubtitle').textContent=`Guardian reward base odds on Board ${boardLevel}: ${beta03MinibossOddsText()}. Luck and harder modes can still improve the roll.`;choices.forEach(up=>{const b=document.createElement('button');b.className=`choice-btn ${up.rarity}`;b.innerHTML=choiceHTML(up);b.addEventListener('click',()=>{applyUpgrade(up,source);addLog(`<b>${source}:</b> chose ${rarityInfo[up.rarity]?.label||up.rarity} <b>${up.name}</b>.`);overlay.classList.add('hidden');updateHUD();onComplete(up);});grid.appendChild(b);});attachPowerupRerollV16?.(grid,render);overlay.classList.remove('hidden');};render();}
  const showLegendaryChoiceV27Base=showLegendaryChoice;showLegendaryChoice=function(source,onComplete=()=>{}){if(String(source).toLowerCase().includes('miniboss'))return v27ShowMinibossReward(source,onComplete);const legends=eligibleUpgrades(u=>u.rarity==='legendary');if(!legends.length){const epics=eligibleUpgrades(u=>u.rarity==='epic');if(epics.length)return showPowerupChoice(source,onComplete,u=>u.rarity==='epic','Every eligible Legendary is exhausted. Choose an Epic power instead.');}return showLegendaryChoiceV27Base(source,onComplete);};

  /* NIGHTMARE / HELL ENEMY DEFENSES --------------------------------------- */
  const startCombatV27DifficultyBase=startCombat;startCombat=function(kind='normal'){const r=startCombatV27DifficultyBase(kind);if(currentEnemies?.length){currentEnemies.forEach(e=>{if((nightmareMode||hellMode)){const baseDodge=(e.boss?.015:.02)+Math.max(0,boardLevel-1)*.004+(hellMode?.02:0);e.dodge=Math.max(e.dodge||0,Math.min(.10,baseDodge));}if(nightmareMode&&e.boss)e.enemyBarrier=Math.max(1,e.enemyBarrier||0);if(hellMode&&boardLevel>1)e.enemyBarrier=Math.max(1,e.enemyBarrier||0);});renderEnemyParty();updateCombatUI();}return r;};
  const updateCombatUIV27EnemyBase=updateCombatUI;updateCombatUI=function(){const r=updateCombatUIV27EnemyBase();if(currentEnemy&&$('enemyHpText')&&(currentEnemy.dodge||0)>0)$('enemyHpText').textContent+=` · ${Math.round(currentEnemy.dodge*100)}% DODGE`;if(currentEnemy&&$('enemyStatusDots')&&(currentEnemy.burnStacks||0)>0)$('enemyStatusDots').insertAdjacentHTML('beforeend',`<span class="burn-status" title="Burn ${currentEnemy.burnStacks}/${BETA03_BURN_CAP}: takes ${currentEnemy.burnStacks}% max HP damage each turn">🔥×${currentEnemy.burnStacks}</span>`);return r;};

  /* BRAIN HACK / RADIATION ------------------------------------------------- */
  const BETA03_FIREBALL_BURN_CHANCE=.15,BETA03_BURN_CAP=10;
  function beta03AddBurn(target,stacks=1){if(!target||target.hp<=0)return 0;target.burnStacks=Math.min(BETA03_BURN_CAP,Math.max(0,target.burnStacks||0)+Math.max(0,stacks||0));return target.burnStacks;}
  const triggerElementEffectV27Base=triggerElementEffect;triggerElementEffect=function(key,target=currentEnemy,opts={}){const beforeAttack=target?.attack,beforeDefense=target?.defense,out=triggerElementEffectV27Base(key,target,opts);if(!out||!target)return out;if(key==='fire'&&target.hp>0&&random()<BETA03_FIREBALL_BURN_CHANCE){const stacks=beta03AddBurn(target,1);out.message=`${out.message||'🔥 Fireball erupts.'} 🔥 Burn applied (${stacks}/${BETA03_BURN_CAP}).`;addCombatHistory(`🔥 Fireball ignites ${target.name}: Burn ${stacks}/${BETA03_BURN_CAP}.`);}if(key==='tech'&&Number.isFinite(beforeAttack)){const cut=Math.max(1,Math.ceil(beforeAttack*.10));target.attack=Math.max(1,beforeAttack-cut);if(out.message)out.message=out.message.replace(/Brain Hack lowers .*? attack by \d+\./,`Brain Hack lowers ${target.name}'s attack by ${beforeAttack-target.attack} (10%).`);renderEnemyParty();updateCombatUI();}if(key==='radiation'&&Number.isFinite(beforeDefense)&&beforeDefense<=0){target.defense=beforeDefense-1;out.message=`${target.weakness==='radiation'?'WEAKNESS! ':''}☢️ Irradiate deals ${out.totalDamage||0} damage and drives ${target.name}'s Defense from ${beforeDefense} to ${target.defense}, increasing later damage.`;renderEnemyParty();updateCombatUI();}return out;};
  if(ELEMENTS.fire)ELEMENTS.fire.description='Fireball deals elemental damage and has a 15% chance to add 1 Burn stack. Burn deals 1% enemy max HP per stack each turn and caps at 10 stacks.';
  if(ELEMENTS.tech)ELEMENTS.tech.description='Deals damage and lowers the target\'s current Attack by about 10% for the battle.';
  if(ELEMENTS.radiation)ELEMENTS.radiation.description='Deals light elemental damage and shreds Defense. At 0 Defense or below it keeps pushing Defense negative, making later hits deal more damage.';

  /* RANDOM CLASS ----------------------------------------------------------- */
  /* PRESTIGE: STORAGE REPLACES SURVIVOR CHOICE ----------------------------- */
  function v27CompletePrestigeNoChoice(total){const rewards=db0633PrestigeOfferPoints(total),remainder=total%9;if(rewards<1)return false;meta.prestige=DB_PRESTIGE.award(meta.prestige,rewards);meta.purchased={};meta.level=1;meta.xp=0;meta.xpNext=legacyXpForLevel(1);meta.points=remainder;pendingPrestige=null;pendingPrestigeKeepIds=new Set();$('prestigeHeirloomOverlay')?.classList.add('hidden');if(v24StorageUnlocked?.()){v24SyncStorage?.();const cap=getHeirloomSlots();meta.heirlooms=(meta.heirlooms||[]).slice(0,cap).map(normalizeSavedItem);}else meta.heirlooms=(meta.heirlooms||[]).slice(0,getHeirloomSlots()).map(normalizeSavedItem);saveMeta();checkDynamicClassUnlocks();sfx.holy();showToast(`Prestige gained ${rewards} unspent Prestige Point${rewards===1?'':'s'}`);renderTalents();updateMetaUI();openStartScreen();return true;}
  prestigeTree=async function(){const total=allocatedTalentPoints()+(meta.points||0),rewards=db0633PrestigeOfferPoints(total),remainder=total%9;if(rewards<1)return false;const warning=`Prestige all ${total} talent points? Every 9 points becomes 1 unspent Prestige Point (${rewards} reward${rewards===1?'':'s'}). ${remainder?`${remainder} leftover point${remainder===1?'':'s'} will remain after the reset. `:''}Purchased Heirloom Storage and your stored collection persist; there is no survivor-pick step.${gameStarted?' THIS ENDS THE CURRENT RUN.':''}`;if(!(await diceboundConfirm(warning,{title:'Prestige?',confirmLabel:'Prestige',danger:true})))return false;return v27CompletePrestigeNoChoice(total);};

  /* ROADKEEPER RARITY GUIDE ------------------------------------------------ */

  /* UI STYLES -------------------------------------------------------------- */
  const v27Style=document.createElement('style');v27Style.textContent=`
    .energy-shield-fill{background:linear-gradient(90deg,rgba(62,154,255,.42),rgba(99,208,255,.58))!important;box-shadow:inset 0 0 0 1px rgba(150,225,255,.35),0 0 10px rgba(65,170,255,.28)!important;z-index:4!important}
    .hpbar>i:not(.energy-shield-fill){z-index:2!important}
    .stage-mini-status .status-count{height:12px!important;min-width:18px!important;padding:0 3px!important;font-size:7px!important;margin:0 1px!important;line-height:12px!important}
    .status-count.poison-count{color:#baf3a5;background:rgba(56,118,48,.32)}.status-count.barrier-count{color:#a8dfff;background:rgba(44,97,151,.32)}
  `;document.head.appendChild(v27Style);

  // Camp/Prestige presentation now has dedicated UI owners. This retained
  // startup hook refreshes unrelated live combat and Info surfaces only.
  setTimeout(()=>{v24EnsureShieldBars?.();v24UpdateShieldBars?.();renderInfo();},0);

  window.DiceboundV27Test=Object.freeze({
    legendaries:()=>upgrades.filter(u=>u.rarity==='legendary').map(u=>({id:u.id,name:u.name,unique:!!u.unique})),
    minibossSample:(n=10000)=>{const out={poor:0,common:0,uncommon:0,rare:0,epic:0,legendary:0};for(let i=0;i<n;i++)out[v27RollMinibossRarity()]++;return out;},
    ouroSync:(attack=20,gold=1000,scale=.01)=>{meta.unlocks.ouroboros=true;resetPlayer('ouroboros');player.attack=attack;player.gold=gold;player.goldAttackScale=scale;const before=player.doubleStrike;v27SyncOuroborosEconomy();return {attack:player.attack,echoBefore:before,echoAfter:player.doubleStrike,goldScale:player.goldAttackScale,ouroGoldEchoScale:player.v27OuroGoldEchoScale};},
    status:()=>statusDotsHTML(6,14,'radiation'),
    goldenLawOuro:()=>{meta.unlocks.ouroboros=true;resetPlayer('ouroboros');player.gold=1000;const u=v27Upgrade('legendary_golden_law');applyUpgrade(u,'test');updateHUD();return {attack:player.attack,echo:player.doubleStrike,goldScale:player.goldAttackScale,ouroScale:player.v27OuroGoldEchoScale};},
    shieldAegis:()=>{resetPlayer('ranger');gameStarted=true;currentEnemies=[{name:'Heal Dummy',icon:'x',hp:100,maxHp:100,attack:1,defense:0}];currentEnemy=currentEncounterLead=currentEnemies[0];applyUpgrade(v27Upgrade('legendary_crimson_aegis_v27'),'test');player.hp=player.maxHp-1;player.energyShield=0;healPlayer(101);v24UpdateShieldBars();return {hp:player.hp,maxHp:player.maxHp,shield:player.energyShield,style:getComputedStyle($('energyShieldFill')).backgroundImage};},
    nightmareBoss:()=>{resetPlayer('ranger');gameStarted=true;boardLevel=2;nightmareMode=true;hellMode=false;generateBoard();buildBoard();player.position=tiles.length-1;startCombat('final');return {barrier:currentEnemy.enemyBarrier||0,dodge:currentEnemy.dodge||0,boss:!!currentEnemy.boss};},
    mysticFallback:()=>{const states=upgrades.filter(u=>u.rarity==='legendary').map(u=>[u,u.unique]);const oldCounts=player.upgradeCounts||{};player.upgradeCounts={...oldCounts};states.forEach(([u])=>{u.unique=true;player.upgradeCounts[u.id]=1;});openMystic();const r=currentMysticBuff?.rarity||null;$('mysticOverlay')?.classList.add('hidden');states.forEach(([u,x])=>u.unique=x);player.upgradeCounts=oldCounts;currentMysticBuff=null;return r;},
    prestigeFlow:()=>{const oldConfirm=window.confirm,before=meta.prestige?.count||0;window.confirm=()=>true;meta.points=9;meta.heirloomStorageUnlocked=true;meta.heirloomStorage=[{id:'keep',slot:'ring',rarity:'common',name:'Stored Test Ring',icon:'💍',bonuses:{}}];meta.heirlooms=[normalizeSavedItem(meta.heirloomStorage[0])];prestigeTree();window.confirm=oldConfirm;return {prestige:(meta.prestige?.count||0)-before,storage:(meta.heirloomStorage||[]).length,chooserVisible:!$('prestigeHeirloomOverlay').classList.contains('hidden')};},
    flatAttackOuro:()=>{meta.unlocks.ouroboros=true;resetPlayer('ouroboros');const before=player.doubleStrike;applyUpgrade(v27Upgrade('attack_uncommon_v24'),'test');return {attack:player.attack,deltaEcho:player.doubleStrike-before};},
    exhaustedFallback:()=>{const oldCounts=player.upgradeCounts||{},states=upgrades.filter(u=>u.rarity==='legendary').map(u=>[u,u.unique]);player.upgradeCounts={...oldCounts};states.forEach(([u])=>{u.unique=true;player.upgradeCounts[u.id]=1;});const f=v27FallbackRarityPool('legendary');states.forEach(([u,x])=>u.unique=x);player.upgradeCounts=oldCounts;return {rarity:f.rarity,count:f.pool.length};},
    randomPool:()=>window.DiceboundClassChooser?.unlockedPoolIds?.()||[],
    forceFiveClasses:()=>{['ranger','sorcerer','fighter','monk','clown'].forEach(id=>meta.unlocks[id]=true);renderClassChoices();return {count:document.querySelectorAll('.random-class-card').length,text:document.querySelector('.random-class-card')?.textContent.trim().slice(0,100)};},
    difficultyDummy:()=>{resetPlayer('ranger');gameStarted=true;boardLevel=2;nightmareMode=true;hellMode=true;generateBoard();buildBoard();player.position=1;tiles[1]={type:'enemy',cleared:false,packSize:1,enemyBase:{name:'Dummy',icon:'👹',hp:20,attack:5,xp:1,gold:1,weakness:'fire'}};startCombat('normal');return currentEnemies.map(e=>({barrier:e.enemyBarrier||0,dodge:e.dodge||0,boss:!!e.boss}));},
    radiationNegative:()=>{const e={name:'Rad Dummy',icon:'👹',hp:100,maxHp:100,attack:5,defense:0,weakness:'ice',affinity:null};currentEnemies=[e];currentEnemy=currentEncounterLead=e;player.attack=10;const r=triggerElementEffect('radiation',e,{forced:true,source:'test'});return {def:e.defense,msg:r?.message||''};},
    brainHack:()=>{const e={name:'Tech Dummy',icon:'👹',hp:100,maxHp:100,attack:50,defense:0,weakness:'ice',affinity:null};currentEnemies=[e];currentEnemy=currentEncounterLead=e;player.attack=10;const r=triggerElementEffect('tech',e,{forced:true,source:'test'});return {attack:e.attack,msg:r?.message||''};},
    rarityGuide:()=>{renderInfo();return {count:document.querySelectorAll('#v27RarityGuide').length,omega:document.querySelector('#v27RarityGuide')?.textContent.includes('Omega')};},
    prestigeUsesChooser:()=>false
  });


  /* ========================================================================
     Alpha v3.1.3 — caravan camp control and wrapper-ready platform boundary
     ======================================================================== */
  document.title='Dicebound: Beta v0.4';
  const v28Brand=document.querySelector('.brand h1');if(v28Brand)v28Brand.textContent='Dicebound: Beta v0.4';
  const v28Sub=document.querySelector('.brand p');if(v28Sub)v28Sub.textContent='Split development source · stable Edge bundle · campsite gathered around the bonfire.';

  /* ALCHEMIST: REAL PLAYTEST PACING --------------------------------------- */
  const V28_ALCHEMIST_REQUIREMENT=25;
  if(CLASSES.alchemist)CLASSES.alchemist.unlock=`Use ${V28_ALCHEMIST_REQUIREMENT} potions across all runs`;
  const baseClassUnlockedV28Base=baseClassUnlocked;
  baseClassUnlocked=function(id){
    if(id==='alchemist')return !!meta.unlocks?.alchemist||((meta.stats?.potionsUsed||0)>=V28_ALCHEMIST_REQUIREMENT);
    if(id==='slimerouge')return !!meta.unlocks?.slimerouge;
    return baseClassUnlockedV28Base(id);
  };
  const checkDynamicClassUnlocksV28Base=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(){const r=checkDynamicClassUnlocksV28Base();if((meta.stats?.potionsUsed||0)>=V28_ALCHEMIST_REQUIREMENT)unlockClass('alchemist');return r;};

  /* HEAVY PURSE / VAMPIRIC EDGE ------------------------------------------- */
  const purse28=upgrades.find(u=>u.id==='purse');
  if(purse28){
    purse28.rarity='poor';
    purse28.apply=function(){player.gold+=modifiedGold(100);};
    try{Object.defineProperty(purse28,'desc',{configurable:true,enumerable:true,get(){const total=modifiedGold(100),bonus=Math.round((player.goldBonus||0)*100);return `Gain ${total} gold now (100 base${bonus?`, ${bonus}% Gold bonus`:''}${nightmareMode?', Nightmare reward reduction included':''}).`;}});}catch(e){purse28.desc='Gain 100 base gold, scaled by your current Gold bonus.';}
  }
  const vampEdge28=upgrades.find(u=>u.id==='vampire');
  if(vampEdge28){vampEdge28.rarity='rare';vampEdge28.desc='Gain +25% Lifesteal. A pure sustain pick: more Lifesteal than Red Flask, but no potions.';vampEdge28.apply=function(){player.lifeSteal+=.25;};}

  /* POISON CLASS TAGS / THRONE OF VENOM ---------------------------------- */
  function v28AddClassTag(id,tag){if(!CLASSES[id])return;const tags=new Set(CLASSES[id].tags||[]);tags.add(tag);CLASSES[id].tags=[...tags];if(CLASS_TAGS[id])CLASS_TAGS[id]=[...new Set([...CLASS_TAGS[id],tag])];else CLASS_TAGS[id]=[...tags];}
  ['frog','ouroboros','ninja','slime'].forEach(id=>v28AddClassTag(id,'poison'));
  const venomThrone28=upgrades.find(u=>u.id==='legendary_venom_throne_v27');
  if(venomThrone28){
    venomThrone28.desc='Gain +50% Poison Chance and +10% Lifesteal. Poison-tagged classes gain +40% Poison damage; all other classes gain +20%.';
    venomThrone28.apply=function(){const poisonClass=(CLASSES[player.classId]?.tags||[]).includes('poison');player.poisonOnHitChance=(player.poisonOnHitChance||0)+.50;player.poisonStackPower=(player.poisonStackPower||.12)+(poisonClass?.40:.20);player.lifeSteal+=.10;};
  }

  /* NINJA: ONE SMOKE PER CRITICAL TIER ------------------------------------ */
  const performStrikeV28SmokeBase=performStrike;
  performStrike=async function(target,opts={}){
    const ninja=classIdentityActive('ninja'),before=ninja?(player.ninjaSmoke||0):0,need=ninja?(player.ninjaSmokeNeed||3):0,execution=ninja&&!opts.echo&&before>=need;
    const result=await performStrikeV28SmokeBase(target,opts);
    if(ninja&&result?.crit){
      const start=execution?0:before,wanted=Math.min(need,start+Math.max(1,Math.floor(result.crit)));if((player.ninjaSmoke||0)<wanted)player.ninjaSmoke=wanted;
      if((player.ninjaSmoke||0)>=need)identityFlash('🌫️ Smoke Execution ready');else if(player.ninjaSmoke!==before)identityFlash(`🌫️ Smoke ${player.ninjaSmoke}/${need}`);
      updateCombatUI();
    }
    return result;
  };
  const updateCombatUIV28SmokeBase=updateCombatUI;
  updateCombatUI=function(){const r=updateCombatUIV28SmokeBase();if(classIdentityActive('ninja'))setResourceUI('smoke','Smoke',player.ninjaSmoke||0,player.ninjaSmokeNeed||3,`Every critical tier grants 1 Smoke — a double crit grants 2, triple crit 3, including Echoes. At ${player.ninjaSmokeNeed||3}, the next basic strike becomes Smoke Execution.`);return r;};

  /* SLIME ROUGE ------------------------------------------------------------ */
  /* SLIME ROUGE ------------------------------------------------------------ */
  // Alpha 3.1.9: the class definition/tags are registry-owned. Only generated
  // gear-name presentation remains here; runtime identity lives below.
  for(const slot of EQUIPMENT_SLOTS){gearNames[slot]=gearNames[slot]||{};gearNames[slot].slimerouge=[...(gearNames[slot].slime||[`Rouge Slime ${SLOT_LABELS[slot]}`])].map(n=>`Rouge ${n}`);}

  const isClassUnlockedV28Base=isClassUnlocked;
  isClassUnlocked=function(id){if(id==='slimerouge')return !!meta.unlocks?.slimerouge;return isClassUnlockedV28Base(id);};

  /* SLIME ROUGE 3.1.8 — real random identity + real borrowed ultimate ------- */
  function v318SlimeRougeDonorPool(){return Object.values(CLASSES).filter(c=>c.id!=='slime'&&c.id!=='slimerouge'&&isClassUnlocked(c.id));}
  function v318SlimeRougePowerCompatible(u){
    if(!u)return false;const owners=[u.classId,...(u.classIds||[])].filter(Boolean),unlocked=['slimerouge',...Object.keys(CLASSES).filter(id=>id!=='slimerouge'&&isClassUnlocked(id))];
    if(!window.DiceboundPowerupBorrowing.ownershipAllowed(u,'slimerouge',unlocked))return false;
    if(!owners.length||owners.includes('slimerouge'))return true;
    const spec=window.DiceboundContent?.powerupMechanics?.[u.id]||{requires:[]};const caps=slimeRougeCapabilities();
    return (spec.requires||[]).every(req=>req.startsWith('ultimate:')?player.slimeRougeUltimateClass===req.slice(9):caps.has(req));
  }
  function v318InitUltimateSupport(id){
    const support=new Set(window.DiceboundContent?.ultimateSupportMechanics?.[id]||[]);
    if(support.has('spirits')){player.summonerSpirits=player.summonerSpirits||[];player.summonerCap=player.summonerCap||3;player.summonerSpiritScale=player.summonerSpiritScale||1;}
    if(support.has('roster')&&!(player.trainerRoster||[]).length){const pool=typeof shuffledPetIds==='function'?shuffledPetIds():Object.keys(PETS);player.trainerRoster=pool.slice(0,6);player.trainerActiveIndex=Math.min(player.trainerActiveIndex||0,Math.max(0,player.trainerRoster.length-1));player.trainerAssistScale=player.trainerAssistScale||.65;}
    if(support.has('mana')&&!player.maxMana){player.maxMana=100;player.mana=Math.max(player.mana||0,25);}
    if(support.has('alchemy')){player.alchemistBrewCounter=player.alchemistBrewCounter||0;player.alchemistBrewNeed=player.alchemistBrewNeed||3;player.alchemistFlaskBonus=player.alchemistFlaskBonus||0;}
    if(support.has('smoke')){player.ninjaSmoke=player.ninjaSmoke||0;player.ninjaSmokeNeed=player.ninjaSmokeNeed||3;}
  }
  function v32InitIdentitySupport(id){
    const mechanics=new Set(classMechanicsFor(id));
    if(mechanics.has('mana')){
      const desiredMax=id==='summoner'?120:100,desiredStart=id==='summoner'?35:25;
      if((player.maxMana||0)<desiredMax)player.maxMana=desiredMax;
      if((player.mana||0)<=0)player.mana=desiredStart;
      else player.mana=Math.min(player.maxMana,Math.max(player.mana,desiredStart));
    }
    if(mechanics.has('spirits')){player.summonerSpirits=player.summonerSpirits||[];player.summonerCap=player.summonerCap||3;player.summonerSpiritScale=player.summonerSpiritScale||1;player.summonerSpiritDouble=player.summonerSpiritDouble||0;player.summonerManaBonus=player.summonerManaBonus||0;}
    if(mechanics.has('roster')&&!(player.trainerRoster||[]).length){const pool=typeof shuffledPetIds==='function'?shuffledPetIds():Object.keys(PETS);player.trainerRoster=pool.slice(0,6);player.trainerActiveIndex=Math.min(player.trainerActiveIndex||0,Math.max(0,player.trainerRoster.length-1));player.trainerAssistScale=player.trainerAssistScale||.65;}
    if(mechanics.has('faith'))player.clericFaith=player.clericFaith||0;
    if(mechanics.has('smoke')){player.ninjaSmoke=player.ninjaSmoke||0;player.ninjaSmokeNeed=player.ninjaSmokeNeed||3;}
    if(mechanics.has('alchemy')){player.alchemistBrewCounter=player.alchemistBrewCounter||0;player.alchemistBrewNeed=player.alchemistBrewNeed||3;player.alchemistFlaskBonus=player.alchemistFlaskBonus||0;}
  }
  const resetPlayerV28Base=resetPlayer;
  resetPlayer=function(classId=selectedClassId){
    let identity=null,ultimate=null;const wantsRouge=classId==='slimerouge';
    if(wantsRouge){const pool=v318SlimeRougeDonorPool();if(pool.length){identity=pool.find(c=>c.id===SlimeRougeRuntime.forcedIdentity)||pick(pool);ultimate=pool.find(c=>c.id===SlimeRougeRuntime.forcedUltimate)||pick(pool);SlimeRougeRuntime.pendingIdentity=identity.id;SlimeRougeRuntime.pendingUltimate=ultimate.id;}}
    const r=resetPlayerV28Base(classId);player.v28StartedRandom=false;player.v28BorrowedPassiveClass=null;player.v28BorrowedUltimateClass=null;player.v28BorrowedPassiveName='';
    if(player.classId==='slimerouge'&&identity&&ultimate){
      player.slimeRougeIdentityClass=identity.id;player.slimeRougeUltimateClass=ultimate.id;player.v28BorrowedPassiveClass=identity.id;player.v28BorrowedUltimateClass=ultimate.id;player.v28BorrowedPassiveName=CLASS_PASSIVES[identity.id]?.name||identity.name;v32InitIdentitySupport(identity.id);v318InitUltimateSupport(ultimate.id);player.slimeRougeRunSummary=`🔴 Slime Rouge rolled ${identity.icon} ${identity.name} identity + ${ultimate.ultimate.icon} ${ultimate.ultimate.name} ultimate`;
      const identityMechanics=classMechanicsFor(identity.id),ultimateSupport=window.DiceboundContent?.ultimateSupportMechanics?.[ultimate.id]||[];
      recordRunBuff?.('🔴','Random Identity',`${identity.icon} ${identity.name}: ${CLASS_PASSIVES[identity.id]?.name||'class identity'} · mechanics: ${identityMechanics.join(', ')}`,'class','Slime Rouge');
      recordRunBuff?.('🎭','Random Ultimate',`${ultimate.icon} ${ultimate.ultimate.name} · real ${ultimate.name} ultimate${ultimateSupport.length?` · support: ${ultimateSupport.join(', ')}`:''}`,'class','Slime Rouge');
      addLog(`🔴 Slime Rouge becomes <b>${identity.icon} ${identity.name}</b> for this run and independently rolls <b>${ultimate.icon} ${ultimate.ultimate.name}</b>. Both use their real class mechanics.`);
    }
    SlimeRougeRuntime.pendingIdentity=null;SlimeRougeRuntime.pendingUltimate=null;SlimeRougeRuntime.forcedIdentity=null;SlimeRougeRuntime.forcedUltimate=null;return r;
  };

  const eligibleUpgradesV28Base=eligibleUpgrades;
  eligibleUpgrades=function(filter=()=>true){
    if(player.classId!=='slimerouge')return eligibleUpgradesV28Base(filter);
    return upgrades.filter(u=>v318SlimeRougePowerCompatible(u)&&achievementGateUnlocked(u.achievementGate)&&(!u.unique||!(player.upgradeCounts?.[u.id]))&&filter(u));
  };

  async function v318UseSlimeRougeUltimate(){
    if(combatBusy||!currentEnemy||player.ultimateCharge<100)return;const donorId=player.slimeRougeUltimateClass||player.v28BorrowedUltimateClass||'ranger',identityId=player.slimeRougeIdentityClass||player.v28BorrowedPassiveClass;
    const originalClass=player.classId;let borrowedMarkBonus=0,consumeBorrowedMarks=false;
    if(identityId==='ranger'&&donorId!=='ranger'){
      const marks=currentEnemies.reduce((n,e)=>n+(e.rangerMarks||0),0);borrowedMarkBonus=Math.min(1.20,marks*.12);if(borrowedMarkBonus)player.classUltimateBonus+=borrowedMarkBonus;consumeBorrowedMarks=marks>0;
    }
    player.classId=donorId;player._slimeRougeCastingUltimate=true;
    try{return await useUltimate();}
    finally{
      player.classId=originalClass;player._slimeRougeCastingUltimate=false;if(borrowedMarkBonus)player.classUltimateBonus-=borrowedMarkBonus;if(consumeBorrowedMarks)currentEnemies.forEach(e=>e.rangerMarks=0);updateCombatUI();
    }
  }

  /* FROG / OUROBOROS EXTREME SPEED ---------------------------------------- */
  function v28FrogEchoCap(echo){echo=Math.max(0,Number(echo)||0);return echo>=50?8:echo>=10?20:echo>=5?34:echo>=2?58:echo>=1?85:0;}
  const useUltimateV28Base=useUltimate;
  useUltimate=async function(){
    if(player.classId==='slimerouge')return v318UseSlimeRougeUltimate();
    if(player.classId!=='frog')return useUltimateV28Base();
    const oldCap=window.__DB_FAST_ECHO_CAP__||0,cap=v28FrogEchoCap(player.doubleStrike||0);
    if(cap)window.__DB_FAST_ECHO_CAP__=cap;
    try{return await useUltimateV28Base();}finally{window.__DB_FAST_ECHO_CAP__=oldCap;}
  };
  const updateCombatUIV28RougeBase=updateCombatUI;
  updateCombatUI=function(){const r=updateCombatUIV28RougeBase();if(player.classId==='slimerouge'&&(player.slimeRougeUltimateClass||player.v28BorrowedUltimateClass)){const d=CLASSES[player.slimeRougeUltimateClass||player.v28BorrowedUltimateClass];if($('ultimateName'))$('ultimateName').textContent=`${d.icon} ${d.ultimate.name}`;if($('ultimateBtn')){$('ultimateBtn').textContent=`${d.ultimate.icon} ${d.ultimate.name}`;$('ultimateBtn').dataset.tip=`Borrowed ${d.name} ultimate — ${describeCurrentUltimate(d.id)}`;}}if(classIdentityActive('berserker')){const rage=Math.round(DB_EFFECTIVE_STATS.berserkerRageBonus(player)*100);setResourceUI('rage','Rage',rage,100,`Every 1% missing HP grants +1% damage. Current Rage bonus: +${rage}% damage.`);}return r;};

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

  setTimeout(()=>{renderClassChoices();renderInfo();updateHUD();},0);



  window.DiceboundV318Test=Object.freeze({
    forceRun:(identity='summoner',ultimate='pokemontrainer')=>{[identity,ultimate,'slimerouge'].forEach(id=>{if(id&&meta.unlocks)meta.unlocks[id]=true;});SlimeRougeRuntime.forcedIdentity=identity;SlimeRougeRuntime.forcedUltimate=ultimate;resetPlayer('slimerouge');return {identity:player.slimeRougeIdentityClass,ultimate:player.slimeRougeUltimateClass,mechanics:[...slimeRougeCapabilities()],mana:player.mana,maxMana:player.maxMana,spirits:Array.isArray(player.summonerSpirits),roster:(player.trainerRoster||[]).length};},
    compatiblePowers:(identity='summoner',ultimate='pokemontrainer')=>{window.DiceboundV318Test.forceRun(identity,ultimate);const ids=new Set(eligibleUpgrades(()=>true).map(u=>u.id));return {identity,ultimate,summonerSpirit:ids.has('summoner_deeper_circle'),trainerRoster:ids.has('trainer_double_battle'),ninjaSmoke:ids.has('ninja_smoke_step'),count:ids.size};},
    rangerMarks:async()=>{window.DiceboundV318Test.forceRun('ranger','pokemontrainer');const e={name:'Mark Dummy',icon:'👹',hp:9999,maxHp:9999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const result=await performStrike(e,{echo:false,index:0});return {identity:player.slimeRougeIdentityClass,marks:e.rangerMarks||0,resultType:result?.type,domain:result?.domain};},
    summonerConjure:async()=>{window.DiceboundV318Test.forceRun('summoner','ranger');player.mana=100;const e={name:'Spirit Dummy',icon:'👹',hp:9999,maxHp:9999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const oldResponse=resolveEnemyResponse;resolveEnemyResponse=async()=>{combatBusy=false;};try{const before=player.mana;await summonerConjure();return {identity:player.slimeRougeIdentityClass,beforeMana:before,afterMana:player.mana,spirits:(player.summonerSpirits||[]).length};}finally{resolveEnemyResponse=oldResponse;}},
    realUltimate:async(identity='summoner',ultimate='pokemontrainer')=>{window.DiceboundV318Test.forceRun(identity,ultimate);player.ultimateCharge=100;const e={name:'Ultimate Dummy',icon:'👹',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const oldResponse=resolveEnemyResponse;resolveEnemyResponse=async()=>{combatBusy=false;};try{const before=e.hp;await useUltimate();return {identity:player.slimeRougeIdentityClass,ultimate:player.slimeRougeUltimateClass,damage:before-e.hp,classRestored:player.classId==='slimerouge',charge:player.ultimateCharge,roster:(player.trainerRoster||[]).length};}finally{resolveEnemyResponse=oldResponse;}},
    rangerUltimate:async(ultimate='ranger')=>{window.DiceboundV318Test.forceRun('ranger',ultimate);player.ultimateCharge=100;const e={name:'Marked Ultimate Dummy',icon:'👹',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0,rangerMarks:4};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const oldResponse=resolveEnemyResponse;resolveEnemyResponse=async()=>{combatBusy=false;};try{const before=e.hp;await useUltimate();return {ultimate,damage:before-e.hp,marksAfter:e.rangerMarks||0,classRestored:player.classId==='slimerouge'};}finally{resolveEnemyResponse=oldResponse;}},
    ninjaIdentityStrike:async()=>{window.DiceboundV318Test.forceRun('ninja','ranger');player.crit=2;player.ninjaSmoke=0;player.ninjaSmokeNeed=3;const e={name:'Rouge Smoke Dummy',icon:'👹',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;const result=await performStrike(e,{echo:false,index:0});return {critTiers:result?.critTiers||result?.crit||0,smoke:player.ninjaSmoke||0,identity:player.slimeRougeIdentityClass};},
    ouroborosIdentityStrike:async()=>{window.DiceboundV318Test.forceRun('ouroboros','ranger');const beforeEcho=player.doubleStrike||0;player.attack=20;const e={name:'Rouge Ouro Dummy',icon:'👹',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,dodge:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;currentEnemyIndex=0;gameStarted=true;combatBusy=false;await performStrike(e,{echo:false,index:0});return {attack:player.attack,echoGain:(player.doubleStrike||0)-beforeEcho,identity:player.slimeRougeIdentityClass};},
    stateContract:()=>{resetPlayer('ranger');const result=ProgressionState.grantXp(25);return {domain:result.domain,type:result.type,applied:result.applied,levelsGained:result.levelsGained};}
  });



  /* ========================================================================
     Alpha v3.1.9 — poison card cleanup
     ======================================================================== */
  const db315VenomEdge=upgrades.find(u=>u.id==='venom_edge');
  if(db315VenomEdge){
    db315VenomEdge.rarity='common';
    db315VenomEdge.desc='Gain +10% Poison Chance.';
    db315VenomEdge.apply=function(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.10;};
  }
  const db315RoadToxicology=upgrades.find(u=>u.id==='toxicology');
  if(db315RoadToxicology){
    db315RoadToxicology.rarity='uncommon';
    db315RoadToxicology.desc='Gain +10% Poison damage and +1% Poison Chance.';
    db315RoadToxicology.apply=function(){
      player.poisonStackPower=(player.poisonStackPower||.12)+.10;
      player.poisonOnHitChance=(player.poisonOnHitChance||0)+.01;
    };
  }

  /* ========================================================================
     Beta 0.1 — difficulty atmosphere boundary
     ------------------------------------------------------------------------
     Board artwork remains board-specific. The page/world behind the board is
     difficulty-specific so Nightmare/Hell can visually transform every road
     without baking mode effects into the six source background images.
     ======================================================================== */
  function dbBeta01DifficultyMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
  function dbBeta01SyncDifficultyAtmosphere(){
    const mode=dbBeta01DifficultyMode();
    document.body?.setAttribute('data-run-mode',mode);
    return mode;
  }
  const applyRunThemeBeta01Base=applyRunTheme;
  applyRunTheme=function(){const out=applyRunThemeBeta01Base();dbBeta01SyncDifficultyAtmosphere();return out;};
  document.addEventListener('click',event=>{
    const id=event.target?.closest?.('button')?.id||event.target?.id||'';
    if(['nightmareToggle','hellToggle','campNightmareBtn','campHellBtn'].includes(id))setTimeout(dbBeta01SyncDifficultyAtmosphere,0);
  },true);
  dbBeta01SyncDifficultyAtmosphere();
  window.DiceboundBeta01=Object.freeze({difficultyMode:dbBeta01DifficultyMode,syncDifficultyAtmosphere:dbBeta01SyncDifficultyAtmosphere});
  /* ========================================================================
     Alpha v3.1.7 — registry-driven achievement presentation
     Milestone achievement content comes only from ACHIEVEMENT_REGISTRY.
     Class unlock cards derive from CLASSES + CLASS_UNLOCK_REGISTRY and class
     mastery cards derive from canonical powerup achievementGate metadata.
     ======================================================================== */
  function db317AchievementDone(a){
    const stats=ensureAlphaMeta(),parts=String(a.condition||"").split(":"),kind=parts[0];
    if(kind==="runsStarted")return (stats.runsStarted||0)>0||gameStarted;
    if(kind==="boardClear")return hasBoardClear(parts[1],Number(parts[2]));
    if(kind==="classUnlocked")return isClassUnlocked(parts[1]);
    if(kind==="nightmareUnlocked")return !!meta.nightmareUnlocked;
    if(kind==="board4Clears")return (meta.board4Clears||0)>0;
    if(kind==="board5Clears")return (meta.board5Clears||0)>0;
    if(kind==="classLevel")return (stats.classMaxLevel?.[parts[1]]||0)>=Number(parts[2]||0);
    if(kind==="healingDone")return (stats.healingDone||0)>=Number(parts[1]||0);
    if(kind==="highestGold")return Math.max(stats.highestGold||0,player?.gold||0)>=Number(parts[1]||0);
    if(kind==="elementProgress")return (meta.elementProgress?.[parts[1]]||0)>=Number(parts[2]||0);
    if(kind==="allPetsUnlocked")return Object.values(meta.pets||{}).every(p=>p.unlocked);
    if(kind==="prestige")return (meta.prestige?.count||0)>=Number(parts[1]||0);
    if(kind==="setPieces")return mythicalSetCount()>=Number(parts[1]||0);
    if(kind==="merchantKills")return (meta.merchantKills||0)>=Number(parts[1]||0);
    if(kind==="hellUnlocked")return !!meta.hellUnlocked;
    if(kind==="heirloomStorageUnlocked")return !!meta.heirloomStorageUnlocked||v24StorageUnlocked?.();
    if(kind==="legendaryRelics")return (meta.legendaryRelics||[]).length>=Number(parts[1]||0);
    if(kind==="devilBossKills")return (meta.devilBossKills||0)>=Number(parts[1]||0);
    if(kind==="devilHornsFound")return !!meta.devilHornsFound;
    if(kind==="potionsUsed")return (stats.potionsUsed||0)>=Number(parts[1]||0);
    return !!meta.achievements?.[a.id];
  }
  function db317AchievementConditionText(a){
    const p=String(a.condition||"").split(":"),kind=p[0];
    if(kind==="runsStarted")return "Begin any run.";
    if(kind==="boardClear")return `Clear Board ${p[2]} as ${CLASSES[p[1]]?.name||p[1]}.`;
    if(kind==="classUnlocked")return `Unlock ${CLASSES[p[1]]?.name||p[1]}.`;
    if(kind==="nightmareUnlocked")return "Unlock Nightmare Mode.";
    if(kind==="board4Clears")return "Clear Board 4.";
    if(kind==="board5Clears")return "Clear Board 5.";
    if(kind==="classLevel")return `Reach run level ${p[2]} as ${CLASSES[p[1]]?.name||p[1]}.`;
    if(kind==="healingDone")return `Heal ${Number(p[1]).toLocaleString()} HP across all runs.`;
    if(kind==="highestGold")return `Hold ${Number(p[1]).toLocaleString()} gold at once.`;
    if(kind==="elementProgress")return `Accumulate ${Number(p[2]).toLocaleString()} ${ELEMENTS[p[1]]?.name||p[1]} damage/healing.`;
    if(kind==="allPetsUnlocked")return "Unlock every companion.";
    if(kind==="prestige")return `Reach ${p[1]} Prestige.`;
    if(kind==="setPieces")return `Equip ${p[1]} pieces of the Impossible Road set.`;
    if(kind==="merchantKills")return `Defeat the Road Merchant ${p[1]} time${Number(p[1])===1?"":"s"}.`;
    if(kind==="hellUnlocked")return "Unlock Hell Mode.";
    if(kind==="heirloomStorageUnlocked")return "Unlock permanent Heirloom Storage.";
    if(kind==="legendaryRelics")return `Discover ${p[1]} named Mythical road relic${Number(p[1])===1?"":"s"}.`;
    if(kind==="devilBossKills")return `Defeat the Pale Devil ${p[1]} time${Number(p[1])===1?"":"s"}.`;
    if(kind==="devilHornsFound")return "Find the Devil's Horns Omega hat.";
    if(kind==="potionsUsed")return `Consume ${p[1]} potions across all runs.`;
    return "Complete the listed achievement condition.";
  }
  function db317AchievementRewardText(a){
    if(!a.reward)return "";const [type,id]=String(a.reward).split(":");
    if(type==="class")return ` · unlocks ${CLASSES[id]?.name||id}`;
    if(type==="powerup")return ` · unlocks ${upgrades.find(u=>u.id===id)?.name||id}`;
    return "";
  }
  /* ========================================================================
     Alpha v3.2.4 — touch/mobile UI contract
     ======================================================================== */
  let db322DialogPending=null;
  function diceboundConfirm(message,{title='Confirm',confirmLabel='Confirm',cancelLabel='Cancel',danger=false}={}){
    const overlay=$('appConfirmOverlay'),heading=$('appConfirmTitle'),body=$('appConfirmMessage'),yes=$('appConfirmAccept'),no=$('appConfirmCancel');
    if(!overlay||!heading||!body||!yes||!no)return Promise.resolve(!!window.DiceboundPlatform?.confirm?.(String(message)));
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
  /* ========================================================================
     Beta 0.2 — responsive game-window controller
     ------------------------------------------------------------------------
     Dicebound is still a normal browser app, but the main road view now sizes
     itself like a game surface. On desktop the board uses whichever is smaller:
     the available panel width or the vertical space left after Travel controls.
     Stacked/mobile layouts remain width-driven. Resize events also reposition
     the pawn because its coordinates are derived from tile geometry.
     ======================================================================== */
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
    root?.style?.setProperty('--db-window-width',`${width}px`);root?.style?.setProperty('--db-window-height',`${height}px`);
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
  window.DiceboundResponsive=Object.freeze({apiVersion:1,calculateBoardSize:dbBeta02CalculateBoardSize,layoutName:dbBeta02LayoutName,heightName:dbBeta02HeightName,measure:dbBeta02MeasureNow,schedule:dbBeta02Schedule,diagnostics:()=>dbBeta02Last});

  /* ======================================================================
     Beta 0.2.1 — final campsite interaction layer.
     This file is intentionally last in the normal UI build order, so these
     listeners cannot be silently replaced by older popup-era camp handlers.
     ====================================================================== */


  // Beta 0.2.1 regression hooks. Hidden from normal UI; these exercise the
  // real combat and Steal implementations instead of reimplementing formulas.
  Object.defineProperty(window,'DiceboundBeta021Test',{configurable:true,value:Object.freeze({
    rageDamage(missing=.40){
      meta.unlocks.berserker=true;resetPlayer('berserker');player.maxHp=100;player.hp=Math.max(1,100-Math.round(clamp(missing,0,.99)*100));
      const enemy={name:'Rage Dummy',hp:1000,maxHp:1000,defense:0,poisonStacks:0},dealt=damageEnemy(enemy,100,true);
      return {missing:Math.round((1-player.hp/player.maxHp)*100),dealt};
    },
    roguePowerChance(luck=1){return beta021RoguePowerStealChance(luck);},
    async rogueStealTrial(seed='beta021-rogue'){
      meta.unlocks.rogue=true;resetPlayer('rogue');player.luck=1;currentEnemies=[{name:'Pocket Dummy',hp:1000,maxHp:1000,attack:1,defense:0,gold:0,xp:0,weakness:'fire'}];currentEnemy=currentEnemies[0];currentEnemyIndex=0;currentEncounterLead=currentEnemy;combatBusy=false;player.rogueStealUsed=false;
      const before=Object.values(player.upgradeCounts||{}).reduce((n,v)=>n+(Number(v)||0),0),oldResponse=resolveEnemyResponse,snap=window.DiceboundRng?.snapshot?.();
      resolveEnemyResponse=async()=>{combatBusy=false;};window.DiceboundRng?.seed?.(seed);
      try{await rogueSteal();const after=Object.values(player.upgradeCounts||{}).reduce((n,v)=>n+(Number(v)||0),0);return {stolePowerup:after>before,before,after,gold:player.gold,potions:player.potions,luck:player.luck,powerChance:beta021RoguePowerStealChance(player.luck),rng:window.DiceboundRng?.snapshot?.(),stealRoll:player._beta021LastStealPower||null,text:$('combatText')?.textContent||''};}
      finally{resolveEnemyResponse=oldResponse;if(snap)window.DiceboundRng?.restore?.(snap);combatBusy=false;}
    },
    ui(){return {systemGuide:[...document.querySelectorAll('#startOverlay .rule')].some(el=>/Systems guide/i.test(el.textContent||'')),petChooser:!!window.DiceboundPetChooser,classGrid:!!document.getElementById('classGrid')};}
  })});
  /* ========================================================================
     Beta 0.4 — native-wrapper game boundary + world-board presentation
     ======================================================================== */

  document.title='Dicebound: Beta v0.4.9';
  const db04Brand=document.querySelector('.brand h1');if(db04Brand)db04Brand.textContent='Dicebound: Beta v0.4.9';
  const db04Sub=document.querySelector('.brand p');if(db04Sub)db04Sub.textContent='Beta v0.4.9 · integrated icon art, custom-sound prep and a real volume slider.';

  /* Ranger identity: each qualifying hit establishes exactly one Mark.
     Echoes are separate strikes, never multi-Mark packets. */
  const performStrikeBeta04Base=performStrike;
  performStrike=async function(target,opts={}){
    const ranger=classIdentityActive('ranger')&&target?.hp>0,before=ranger?(target.rangerMarks||0):0;
    const result=await performStrikeBeta04Base(target,opts);
    if(ranger&&target?.hp>0&&!result?.dodged){
      const cap=Math.max(3,Number(player.rangerMarkMax)||3);
      target.rangerMarks=window.DiceboundStrikePolicy.rangerMarkTotal(before,{cap,landed:true});
      if(target.rangerMarks!==before)identityFlash(`🏹 Marked Quarry ×${target.rangerMarks}${opts.echo?' · Echo +1':''}`);
      updateCombatUI();
    }
    return result;
  };
  const updateCombatUIBeta04Base=updateCombatUI;
  updateCombatUI=function(){
    const r=updateCombatUIBeta04Base();
    if(classIdentityActive('ranger')){
      const marks=currentEnemy?.rangerMarks||0,cap=Math.max(3,Number(player.rangerMarkMax)||3);
      setResourceUI('mark','Marks on target',marks,cap,`Each landed basic strike or Echo adds 1 Mark. Marks add Crit against that target; Arrow Storm consumes every mark in the pack. Current cap: ${cap}.`);
    }
    return r;
  };

  /* Debug progression shortcut. This is intentionally a late owner so older
     layered debugAction implementations cannot swallow it. */
  const debugActionBeta04Base=debugAction;
  debugAction=function(action){
    if(action==='unlock_hell'){
      meta.nightmareUnlocked=true;meta.hellUnlocked=true;saveMeta();
      try{renderClassChoices();}catch(_){}
      showToast('🔥 Hell Mode unlocked (debug)');
      return;
    }
    return debugActionBeta04Base(action);
  };

  /* Native file-save affordance. Hidden in the secondary browser build. */
  function beta04SyncNativeControls(){
    const btn=document.getElementById('saveFolderBtn'),supported=!!window.DiceboundPlatform?.capabilities?.openSaveFolder;
    if(btn){btn.hidden=!supported;btn.title=supported?'Open %LOCALAPPDATA%\\Dicebound\\saves in File Explorer':'Available in the native Windows wrapper';}
    document.body?.setAttribute('data-runtime-kind',window.DiceboundPlatform?.kind||'browser');
    return supported;
  }
  document.getElementById('saveFolderBtn')?.addEventListener('click',()=>{
    try{const ok=window.DiceboundPlatform?.openSaveFolder?.();if(ok&&typeof ok.then==='function')ok.then(v=>showToast(v?'📂 Save folder opened':'Could not open save folder'));else showToast(ok?'📂 Save folder opened':'Could not open save folder');}
    catch(e){showToast('Could not open save folder');window.DiceboundPlatform?.log?.('error','Open Save Folder failed',{message:e?.message||String(e)});}
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
  const applyRunThemeBeta04Base=applyRunTheme;
  applyRunTheme=function(){const r=applyRunThemeBeta04Base();beta04SyncWorldScene();return r;};
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
    window.DiceboundResponsive?.schedule?.();return mode;
  }
  function beta04ScheduleHud(){if(beta04HudFrame)cancelAnimationFrame(beta04HudFrame);beta04HudFrame=requestAnimationFrame(beta04SyncHud);}
  window.addEventListener('resize',beta04ScheduleHud,{passive:true});window.addEventListener('orientationchange',beta04ScheduleHud,{passive:true});document.addEventListener('fullscreenchange',beta04ScheduleHud,true);

  setTimeout(()=>{beta04SyncNativeControls();beta04SyncWorldScene();beta04SyncHud();},0);

  Object.defineProperty(window,'DiceboundBeta04Test',{configurable:true,value:Object.freeze({
    rangerMarkGain:async function({echo=false,start=0,cap=5}={}){
      meta.unlocks.ranger=true;resetPlayer('ranger');player.rangerMarkMax=cap;gameStarted=true;
      const enemy={name:'Mark Dummy',icon:'🎯',hp:1000000,maxHp:1000000,attack:0,defense:0,gold:0,xp:0,weakness:'fire',rangerMarks:start,poisonStacks:0,enemyBarrier:0,dodge:0};
      currentEnemies=[enemy];currentEnemy=currentEncounterLead=enemy;currentEnemyIndex=0;
      const result=await performStrike(enemy,{echo,index:echo?1:0});
      return {before:start,after:enemy.rangerMarks||0,gain:(enemy.rangerMarks||0)-start,cap:player.rangerMarkMax||3,dodged:!!result?.dodged};
    },
    unlockHell(){meta.nightmareUnlocked=false;meta.hellUnlocked=false;debugAction('unlock_hell');return {nightmare:!!meta.nightmareUnlocked,hell:!!meta.hellUnlocked};},
    hudMode:beta04HudMode,
    nativeControls:()=>({kind:window.DiceboundPlatform?.kind||'browser',saveFolderVisible:!document.getElementById('saveFolderBtn')?.hidden,supported:!!window.DiceboundPlatform?.capabilities?.openSaveFolder}),
    world:beta04SyncWorldScene
  })});


  /* ======================================================================
     Beta 0.4.3 — options menu, camp cleanup and home-PC HUD follow-up
     ====================================================================== */
  const classPortraitBeta042Base=classPortraitSVG;
  classPortraitSVG=function(classId){
    if(classId!=='slimerouge')return classPortraitBeta042Base(classId);
    return `<svg viewBox="0 0 64 64" role="img" aria-label="Slime Rouge portrait"><defs><linearGradient id="sr042" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2c0f14"/><stop offset="1" stop-color="#7f1826"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#09060a"/><rect x="3" y="3" width="58" height="58" rx="12" fill="url(#sr042)"/><path d="M14 45c0-14 8-22 18-22 6 0 11 2 15 6 2 3 4 8 4 16v10H14z" fill="#d92d47" stroke="#ff8a9d" stroke-width="2"/><path d="M18 28c5-7 13-11 21-11 7 0 12 2 16 6-4-10-14-15-24-15-11 0-21 8-25 20z" fill="#b3142a" opacity=".9"/><path d="M20 24l7 4 6-5 7 4 6-5 4 7-6 5-8-3-7 5-7-4-6 4-3-7z" fill="#181321" stroke="#ffd0d7" stroke-width="1.4" stroke-linejoin="round"/><circle cx="27" cy="35" r="3" fill="#fff3ee"/><circle cx="42" cy="35" r="3" fill="#fff3ee"/><circle cx="27" cy="35" r="1.3" fill="#1a0b0f"/><circle cx="42" cy="35" r="1.3" fill="#1a0b0f"/><path d="M27 45q5 3 10 0" stroke="#5d0f18" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M48 44l9 2-6 7-5-3z" fill="#f4d0a4" stroke="#fff3de" stroke-width="1.3"/><path d="M46 43l5 3-7 5-4-2z" fill="#d9dadf" stroke="#fff" stroke-width="1.1"/><path d="M11 50q6-2 12 5" stroke="#ff98aa" stroke-width="2" fill="none" stroke-linecap="round" opacity=".75"/></svg>`;
  };

  const beta042Style=document.createElement('style');
  beta042Style.textContent=`
    body[data-run-mode="nightmare"] .world-atmosphere-layer{opacity:.21!important}
    body[data-run-mode="hell"] .world-atmosphere-layer{opacity:.24!important}
    body[data-hud-flow="expanded"] .sidebar>.card:first-child{grid-column:1;grid-row:1}
    body[data-hud-flow="expanded"] .sidebar>.equipment-card{grid-column:2;grid-row:1}
    body[data-hud-flow="expanded"][data-sidebar-companion="adjacent"] .sidebar>.pet-card{grid-column:2;grid-row:2}
    body[data-hud-flow="expanded"][data-sidebar-companion="below"] .sidebar>.pet-card{grid-column:1;grid-row:2}
    body[data-hud-flow="expanded"] .sidebar>.log-card{grid-column:1/-1;grid-row:3}
    body[data-hud-flow="landscape-2"][data-sidebar-companion="adjacent"] .sidebar>.pet-card{grid-column:2;grid-row:2!important}
    body[data-hud-flow="landscape-2"][data-sidebar-companion="below"] .sidebar>.pet-card{grid-column:1;grid-row:2!important}
    body[data-hud-flow="landscape-2"] .sidebar>.log-card{grid-column:1/-1!important;grid-row:3!important}
    body[data-hud-flow="landscape-3"] .sidebar>.card:first-child{grid-column:1;grid-row:1}
    body[data-hud-flow="landscape-3"] .sidebar>.equipment-card{grid-column:2;grid-row:1}
    body[data-hud-flow="landscape-3"][data-sidebar-companion="adjacent"] .sidebar>.pet-card{grid-column:2;grid-row:2!important}
    body[data-hud-flow="landscape-3"][data-sidebar-companion="below"] .sidebar>.pet-card{grid-column:1;grid-row:2!important}
    body[data-hud-flow="landscape-3"] .sidebar>.log-card{grid-column:1/-1!important;grid-row:3!important}
  `;
  document.head.appendChild(beta042Style);

  function beta042CampSummary(){
    const parts=[`Legacy Lv ${meta.level}`,`${meta.points||0} unspent`,`Prestige ${meta.prestige?.count||0}`];
    if(meta.doubleDiceUnlocked)parts.push('Double Dice ready');
    return parts.join(' · ');
  }
  function beta042SyncSidebarLayout(){
    const hasSet=typeof mythicalSetCount==='function'&&mythicalSetCount()>0;
    document.body?.setAttribute('data-sidebar-companion',hasSet?'below':'adjacent');
    return hasSet;
  }
  const dbOptionsUi=window.DiceboundOptionsUi?.configure({
    find:$,
    getSettings:()=>({muted,masterVolume:meta.settings?.masterVolume??.70,soundPack:meta.settings?.soundPack||'synth'}),
    nativeSaveSupported:()=>!!window.DiceboundPlatform?.capabilities?.openSaveFolder,
    openSaveFolder:()=>{const button=$('saveFolderBtn');button?.click();return !!button;},
    toggleMuted:()=>{$('muteBtn')?.click();return muted;},
    setVolume:value=>{meta.settings=meta.settings||defaultSettings();meta.settings.masterVolume=clamp(Number(value),0,1);saveMeta();return meta.settings.masterVolume;},
    setSoundPack:pack=>{meta.settings=meta.settings||defaultSettings();meta.settings.soundPack=pack==='custom'?'custom':'synth';saveMeta();return meta.settings.soundPack;},
    playPreview:()=>{try{sfx.coin();}catch(_){}},
    resetProgress:()=>window.DiceboundTalentTree?.resetProgress?.()
  });
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

  const beta04SyncHudBeta042Base=beta04SyncHud;
  beta04SyncHud=function(){const mode=beta04SyncHudBeta042Base();beta042SyncSidebarLayout();return mode;};

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

  /* ========================================================================
     Beta 0.4.3 — integrated UI art assets + custom-sound hooks follow-up
     ======================================================================== */

  const beta043ArtStyle=document.createElement('style');
  beta043ArtStyle.textContent=`
    .db-art-icon{display:inline-block;vertical-align:middle;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.32))}
    .db-art-inline{width:1.2em;height:1.2em}
    .db-art-tile{width:30px;height:30px}
    .db-art-choice{width:42px;height:42px}
    .db-art-portrait{width:56px;height:56px}
    .db-art-camp{width:54px;height:54px}
    .tile-icon .db-art-icon{margin-top:1px}
    .choice-icon .db-art-icon{display:block;margin:0 auto}
    .enemy-card-icon .db-art-icon{width:42px;height:42px}
    .camp-spot .camp-icon .db-art-icon{filter:drop-shadow(0 3px 10px rgba(0,0,0,.38))}
    #gamblerOverlay .gambler-art{display:flex;align-items:center;justify-content:center;gap:10px;margin:2px 0 12px}
    #gamblerOverlay .gambler-art .db-art-icon:first-child{width:68px;height:68px}
    #gamblerOverlay .gambler-art .db-art-icon:last-child{width:48px;height:48px}
  `;
  document.head.appendChild(beta043ArtStyle);

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
  function beta043RefreshEquipmentArt(){
    EQUIPMENT_SLOTS.forEach(slot=>{
      const item=player?.equipment?.[slot];
      if(item?.slot==='hat')item.icon=beta043Art('helmet','Helmet','db-art-inline')||item.icon;
    });
    (meta.heirlooms||[]).forEach(item=>{if(item?.slot==='hat')item.icon=beta043Art('helmet','Helmet','db-art-inline')||item.icon;});
    (meta.heirloomStorage||[]).forEach(item=>{if(item?.slot==='hat')item.icon=beta043Art('helmet','Helmet','db-art-inline')||item.icon;});
  }
  function beta043ApplyArtMutations(){
    if(beta043ApplyArtMutations.done)return;beta043ApplyArtMutations.done=true;
    beta043ReplaceByName(upgrades,'Heavy Purse','heavyPurse');
    beta043ReplaceByName(upgrades,'Quickdraw','quickdraw');
    beta043ReplaceByName(upgrades,'Glass Needle','glassNeedle');
    const richGoldIds=new Set(['gold','treasure_sense_common_v25','treasure_sense_uncommon_v25']);
    upgrades.filter(u=>richGoldIds.has(u.id)).forEach(u=>u.icon=beta043Art('coins',u.name,'db-art-choice')||u.icon);
    Object.values(ENEMY_REGISTRY||{}).forEach(e=>{
      if(!e?.name)return;
      if(/bandit/i.test(e.name))e.icon=beta043Art('bandit',e.name,'db-art-portrait')||e.icon;
      if(/troll/i.test(e.name))e.icon=beta043Art('troll',e.name,'db-art-portrait')||e.icon;
    });
  }
  beta043ApplyArtMutations();

  const gearIconBeta043Base=gearIcon;
  gearIcon=function(slot){
    if(slot==='hat')return beta043Art('helmet','Helmet','db-art-inline')||gearIconBeta043Base(slot);
    return gearIconBeta043Base(slot);
  };

  const tileMetaBeta043Base=tileMeta;
  tileMeta=function(tile){
    if(tile?.type==='treasure')return [beta043Art('coins','Treasure','db-art-tile')||'💰','Treasure'];
    if(tile?.type==='gambler')return [beta043Art('gambler','Gambler','db-art-tile')||'🪙','Gambler'];
    return tileMetaBeta043Base(tile);
  };

  openGambler=function(){
    const grid=$('gambleGrid');grid.innerHTML='';
    $('gambleResult').textContent=`You carry ${player.gold} gold.`;
    [0,.25,.5,1].forEach(p=>{
      const wager=Math.floor(player.gold*p),b=document.createElement('button');
      b.className='choice-btn uncommon';
      b.innerHTML=`<span class="choice-icon">${beta043Art('coins','Coins','db-art-choice')||'🪙'}</span><span class="choice-name">Bet ${Math.round(p*100)}%</span><span class="choice-desc">${wager} gold on a coinflip.</span>`;
      b.addEventListener('click',()=>{
        if(p===0){finishGambler('You politely decline.');return;}
        const actual=Math.floor(player.gold*p),win=random()<.5;
        if(win){player.gold+=actual;finishGambler(`Heads! You win ${actual} gold.`);}else{player.gold-=actual;finishGambler(`Tails! You lose ${actual} gold.`);}
      });
      grid.appendChild(b);
    });
    const subtitle=document.querySelector('#gamblerOverlay .subtitle');
    if(subtitle&&!document.querySelector('#gamblerOverlay .gambler-art'))subtitle.insertAdjacentHTML('afterend',`<div class="gambler-art">${beta043Art('gambler','Gambler','db-art-portrait')}${beta043Art('coins','Coins','db-art-choice')}</div>`);
    $('gamblerOverlay').classList.remove('hidden');
  };





  setTimeout(beta043RefreshEquipmentArt,0);
  /* ========================================================================
     Beta 0.4.4 — small balance + Sovereign chooser reliability
     ======================================================================== */

  /* Keep the historical v19 merchant contract boundary for compatibility,
     but make its late-resolved v17 chooser route through the final shared
     Legendary chooser. This removes the old Edge-specific fallback layer and
     ensures Sovereign Relic / Tyrant's Contract use the same maintained UI. */
  v17OpenLegendaryChoice=function(source,onComplete=()=>{}){
    return showLegendaryChoice(source,onComplete);
  };

  Object.defineProperty(window,'DiceboundBeta044Test',{configurable:true,value:Object.freeze({
    classBaseHp:()=>Object.fromEntries(Object.values(CLASSES).map(c=>[c.id,c.base.maxHp])),
    cultistRates:()=>({normal:.01,nightmare:.10,hell:.20}),
    sovereignUsesFinalChooser:()=>String(v17OpenLegendaryChoice).includes('showLegendaryChoice')
  })});
  /* ========================================================================
     Beta 0.4.5 — board-balance pass, camp cleanup and harness ordering
     ======================================================================== */

  // ----- Version-visible cosmetics ----------------------------------------
  document.title='Dicebound: Beta v0.4.5';
  const db045Brand=document.querySelector('.brand h1');if(db045Brand)db045Brand.textContent='Dicebound: Beta v0.4.5';
  const db045Sub=document.querySelector('.brand p');if(db045Sub)db045Sub.textContent='Beta v0.4.5 · board balance pass, camp layout cleanup and harness-driven class ordering.';

  const beta045Style=document.createElement('style');
  beta045Style.textContent=`
    .gear-keep-btn .journey-gear-name.common{color:#e7edf7}
    .gear-keep-btn .journey-gear-name.uncommon{color:#8cf3a8}
    .gear-keep-btn .journey-gear-name.rare{color:#72b8ff}
    .gear-keep-btn .journey-gear-name.epic{color:#d2a3ff}
    .gear-keep-btn .journey-gear-name.legendary{color:#ffd86d}
    .gear-keep-btn .journey-gear-name.mythical{color:#ff95bf}
    .gear-keep-btn .journey-gear-name.omega{color:#9ef0ff}
  `;
  document.head.appendChild(beta045Style);

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
      cls.base.maxHp=after;
      if(typeof cls.stats==='string')cls.stats=cls.stats.replace(/^(\d+) HP\b/,`${after} HP`);
    });
  }

  // ----- Board pass: ensure late boards climb cleanly ---------------------
  const scaleEnemyBeta045Base=scaleEnemy;
  scaleEnemy=function(base,kind='normal',packSize=1){
    const e=scaleEnemyBeta045Base(base,kind,packSize);
    const tune={
      1:[1.00,1.00,0],
      2:[1.02,1.01,0],
      3:[1.05,1.04,1],
      4:[0.99,1.00,0],
      5:[1.20,1.14,2],
      6:[1.08,1.06,1]
    }[boardLevel]||[1,1,0];
    e.hp=Math.max(1,Math.round(e.hp*tune[0]));e.maxHp=e.hp;
    e.attack=Math.max(1,Math.round(e.attack*tune[1]));
    e.defense=Math.max(0,(e.defense||0)+tune[2]);
    if(e.name==='Cultist')e.lifeSteal=hellMode?.20:nightmareMode?.10:.01;
    const art=beta045EnemyArtForName(e.name);
    if(art)e.icon=art;
    return e;
  };
  if(typeof db317Board==='function'){
    const beta045Board6=db317Board(6),beta045Board5=db317Board(5),beta045Board4=db317Board(4),beta045Board3=db317Board(3),beta045Board2=db317Board(2);
    if(beta045Board2){beta045Board2.entryHeal=.14;beta045Board2.entryPotions=1;}
    if(beta045Board3){beta045Board3.entryHeal=.20;beta045Board3.entryPotions=1;}
    if(beta045Board4){beta045Board4.entryHeal=.28;beta045Board4.entryPotions=2;}
    if(beta045Board5){beta045Board5.entryHeal=.24;beta045Board5.entryPotions=2;beta045Board5.extraHp=.38;beta045Board5.extraAttack=.26;beta045Board5.extraDefense=5;beta045Board5.threePackChance=.30;}
    if(beta045Board6){beta045Board6.entryHeal=.30;beta045Board6.entryPotions=2;beta045Board6.extraHp=Math.max(beta045Board6.extraHp||0,.48);beta045Board6.extraAttack=Math.max(beta045Board6.extraAttack||0,.34);beta045Board6.extraDefense=Math.max(beta045Board6.extraDefense||0,6);}
  }

  // ----- Haste anti-lock: never queue more than one skipped response ------
  function beta045ClampQueuedHaste(before=0){
    const pending=Math.max(0,player.hasteTurns||0);
    if(before>=1&&pending>before)player.hasteTurns=before;
    else if(pending>1)player.hasteTurns=1;
  }
  const triggerElementEffectBeta045Base=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const before=player.hasteTurns||0,out=triggerElementEffectBeta045Base(key,target,opts);
    if(key==='coffee')beta045ClampQueuedHaste(before);
    return out;
  };
  const rollD20ChaosBeta045Base=rollD20Chaos;
  rollD20Chaos=async function(action){
    const before=player.hasteTurns||0,out=await rollD20ChaosBeta045Base(action);beta045ClampQueuedHaste(before);return out;
  };
  const resolveEnemyResponseBeta045Base=resolveEnemyResponse;
  resolveEnemyResponse=async function(guarded=false){
    if((player.hasteTurns||0)>1)player.hasteTurns=1;
    const out=await resolveEnemyResponseBeta045Base(guarded);
    if((player.hasteTurns||0)>1)player.hasteTurns=1;
    return out;
  };

  // ----- Bandit / troll board presentation fallback -----------------------
  const tileMetaBeta045Base=tileMeta;
  tileMeta=function(tile){
    if(tile?.enemyBase?.name){
      const art=beta045EnemyArtForName(tile.enemyBase.name);
      if(art&&tile.type==='enemy'){
        const count=tile.packSize||1;
        return [count>1?`${art}${art}`:art,count>1?`${tile.enemyBase.name} pack ×${count}`:`${tile.enemyBase.name} · 1 enemy`];
      }
      if(art&&tile.type==='miniboss')return [art,'Mini Boss · 1 enemy'];
    }
    return tileMetaBeta045Base(tile);
  };

  // ----- Sovereign / Contract hardening -----------------------------------
  const db0646MerchantTransaction=window.DiceboundMerchantTransaction;
  if(!db0646MerchantTransaction)throw new Error('DiceboundMerchantTransaction must load before dicebound.js');
  let db0646MerchantVisit=null;
  function db0646MerchantVisitForCurrentStock(){
    if(!db0646MerchantVisit||(!db0646MerchantTransaction.hasActiveChoice(db0646MerchantVisit)&&!db0646MerchantTransaction.ownsOffers(db0646MerchantVisit,currentMerchantItems))){db0646MerchantVisit=db0646MerchantTransaction.createVisit(currentMerchantItems);}
    return db0646MerchantVisit;
  }
  const db0646OpenMerchantBase=openMerchant;
  openMerchant=function(){
    if(db0646MerchantTransaction.hasActiveChoice(db0646MerchantVisit))return false;
    const result=db0646OpenMerchantBase.apply(this,arguments);
    db0646MerchantVisit=db0646MerchantTransaction.beginVisit(null,currentMerchantItems);
    return result;
  };
  function db0410LegendaryChoices(){const pool=[...eligibleUpgrades(u=>u.rarity==='legendary')],out=[];while(pool.length&&out.length<3){const i=rand(0,pool.length-1);out.push(pool.splice(i,1)[0]);}return out;}
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
    choices.forEach(up=>{const btn=document.createElement('button');btn.type='button';btn.className='choice-btn legendary';btn.innerHTML=choiceHTML(up);btn.addEventListener('click',()=>{if(settled)return;settled=true;applyUpgrade(up,source);addLog(`<b>${source}:</b> chose <b>${up.name}</b>.`);showToast(`Legendary: ${up.name}`);overlay.classList.add('hidden');updateHUD();onComplete(up);},{once:true});grid.appendChild(btn);});
    $('merchantOverlay')?.classList.add('hidden');overlay.classList.remove('hidden');
  }
  renderMerchant=function(){
    $('merchantGold').textContent=player.gold;const notice=$('merchantNotice');notice.classList.toggle('show',!!currentMerchantNotice);notice.innerHTML=currentMerchantNotice;const grid=$('shopGrid');grid.innerHTML='';
    currentMerchantItems.forEach(item=>{const price=merchantPrice(item.base),btn=document.createElement('button');btn.className=`shop-item${item.sold?' sold':''}`;btn.disabled=item.sold||player.gold<price;const comparison=item.gear?`<div class="shop-compare">${formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:'';btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${item.sold?'SOLD':price+'g'}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;
      btn.addEventListener('click',async()=>{if(item.sold||player.gold<price)return;if(item.gear){const current=player.equipment[item.gear.slot];if(current&&gearPowerScore(item.gear)<gearPowerScore(current)&&!(await diceboundConfirm(`${item.gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`,{title:'Buy weaker gear?',confirmLabel:'Buy anyway',danger:true})))return;}
        player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);
        const chooser=item.alphaChooseLegendary||/Sovereign Relic|Legendary Contract/i.test(item.name||'');
        if(chooser){
          currentMerchantNotice=`👑 <b>${item.name} purchased.</b> Choose one Legendary power.`;renderMerchant();
          $('merchantOverlay').classList.add('hidden');
          setTimeout(()=>db0410OpenSovereignChoice(item.name||'Legendary Contract',chosen=>{
            if(!chosen){player.gold+=price;item.sold=false;currentMerchantNotice=`👑 No eligible Legendary powers remain; ${price} gold was refunded.`;}
            else currentMerchantNotice=`👑 <b>${item.name} claimed:</b> ${chosen.name}.`;
            $('merchantOverlay').classList.remove('hidden');showToast(chosen?`Legendary: ${chosen.name}`:'Relic refunded');updateHUD();renderMerchant();
          }),0);
          return;
        }
        const result=item.buy?.();if(item.id==='relic'&&result)currentMerchantNotice=`🔮 <b>Relic opened:</b> ${rarityInfo[result.rarity].label} <b>${result.name}</b><br>${result.desc}`;else if(item.gear)currentMerchantNotice=`🧰 Equipped <b>${item.gear.name}</b>.<br>${formatBonuses(item.gear)}`;if(['attack','armor','charm'].includes(item.id))recordRunBuff(item.icon,item.name,item.desc,'merchant','Merchant');showToast(item.id==='relic'&&result?`${rarityInfo[result.rarity].label}: ${result.name}`:item.name);updateHUD();renderMerchant();
      });grid.appendChild(btn);
    });
  };

  // Final Merchant renderer: transaction ownership lives in
  // DiceboundMerchantTransaction, not in transient buttons or delayed UI.
  renderMerchant=function(){
    const visit=db0646MerchantVisitForCurrentStock();
    $('merchantGold').textContent=player.gold;const notice=$('merchantNotice');notice.classList.toggle('show',!!currentMerchantNotice);notice.innerHTML=currentMerchantNotice;const grid=$('shopGrid');grid.innerHTML='';
    currentMerchantItems.forEach((item,index)=>{const key=db0646MerchantTransaction.offerKey(item,index),price=merchantPrice(item.base),sold=item.sold||!db0646MerchantTransaction.canPurchase(visit,key),btn=document.createElement('button');btn.className=`shop-item${sold?' sold':''}`;btn.disabled=sold||player.gold<price;const comparison=item.gear?`<div class="shop-compare">${formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:'';btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${sold?'SOLD':price+'g'}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;
      btn.addEventListener('click',async()=>{
        if(item.sold||player.gold<price)return;
        const reservation=db0646MerchantTransaction.reservePurchase(visit,key);if(!reservation.ok)return;
        if(item.gear){const current=player.equipment[item.gear.slot];if(current&&gearPowerScore(item.gear)<gearPowerScore(current)&&!(await diceboundConfirm(`${item.gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`,{title:'Buy weaker gear?',confirmLabel:'Buy anyway',danger:true}))){db0646MerchantTransaction.cancelReservation(visit,reservation.token);renderMerchant();return;}}
        if(player.gold<price){db0646MerchantTransaction.cancelReservation(visit,reservation.token);renderMerchant();return;}
        const chooser=item.alphaChooseLegendary||/Sovereign Relic|Legendary Contract/i.test(item.name||''),purchase=chooser?db0646MerchantTransaction.beginChoice(visit,reservation.token):db0646MerchantTransaction.commitPurchase(visit,reservation.token);if(!purchase.ok){db0646MerchantTransaction.cancelReservation(visit,reservation.token);return;}
        player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);
        if(chooser){
          currentMerchantNotice=`<b>${item.name} purchased.</b> Choose one Legendary power.`;renderMerchant();$('merchantOverlay').classList.add('hidden');
          setTimeout(()=>{if(!db0646MerchantTransaction.hasActiveChoice(visit))return;db0410OpenSovereignChoice(item.name||'Legendary Contract',chosen=>{
            if(!db0646MerchantTransaction.settleChoice(visit,purchase.token).ok)return;
            if(!chosen){player.gold+=price;currentMerchantNotice=`No eligible Legendary powers remain; ${price} gold was refunded. This Merchant offer remains sold.`;}
            else currentMerchantNotice=`<b>${item.name} claimed:</b> ${chosen.name}.`;
            $('merchantOverlay').classList.remove('hidden');showToast(chosen?`Legendary: ${chosen.name}`:'Relic refunded');updateHUD();renderMerchant();
          });},0);
          return;
        }
        const result=item.buy?.();if(item.id==='relic'&&result)currentMerchantNotice=`<b>Relic opened:</b> ${rarityInfo[result.rarity].label} <b>${result.name}</b><br>${result.desc}`;else if(item.gear)currentMerchantNotice=`Equipped <b>${item.gear.name}</b>.<br>${formatBonuses(item.gear)}`;if(['attack','armor','charm'].includes(item.id))recordRunBuff(item.icon,item.name,item.desc,'merchant','Merchant');showToast(item.id==='relic'&&result?`${rarityInfo[result.rarity].label}: ${result.name}`:item.name);updateHUD();renderMerchant();
      });grid.appendChild(btn);
    });
  };

  window.DiceboundMerchantTransactionTest=Object.freeze({
    prepareSovereign:()=>{
      player.gold=99999;currentMerchantNotice='';currentMerchantItems=[{id:'merchant-transaction-sovereign',icon:'C',name:'Sovereign Relic',desc:'Choose one Legendary power.',base:1,sold:false,alphaChooseLegendary:true,buy(){return null;}}];db0646MerchantVisit=db0646MerchantTransaction.createVisit(currentMerchantItems);$('merchantOverlay').classList.remove('hidden');renderMerchant();return window.DiceboundMerchantTransactionTest.state();
    },
    attemptDelayedReopen:()=>{
      const stock=currentMerchantItems,result=openMerchant();return {result,sameStock:stock===currentMerchantItems,state:window.DiceboundMerchantTransactionTest.state()};
    },
    state:()=>({visit:db0646MerchantTransaction.snapshot(db0646MerchantVisit),merchantHidden:$('merchantOverlay').classList.contains('hidden'),choiceVisible:!$('sovereignChoiceOverlay')?.classList.contains('hidden'),items:currentMerchantItems.map(item=>({id:item.id,sold:!!item.sold}))})
  });

  // ----- Simple diagnostics for the harness/tooling layer -----------------

  /* ========================================================================
     Beta 0.4.6 — missing art assets, camp centering, board pass and haste fix
     ======================================================================== */

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
      if(art)e.icon=art;
    });
  }
  db046ApplyAssetBindings();

  // Alchemist should unlock much earlier and the UI should say so.
  if(CLASSES.alchemist){CLASSES.alchemist.unlock='Use 15 potions in total';}
  const db046BaseClassUnlocked=baseClassUnlocked;
  baseClassUnlocked=function(id){
    if(id==='alchemist')return !!meta.unlocks?.alchemist||((meta.stats?.potionsUsed||0)>=15);
    return db046BaseClassUnlocked(id);
  };
  const db046CheckDynamicClassUnlocks=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(){db046CheckDynamicClassUnlocks();if((meta.stats?.potionsUsed||0)>=15)unlockClass('alchemist');};
  if(window.DiceboundV16Debug?.prepareAlchemist)window.DiceboundV16Debug.prepareAlchemist=()=>{meta.stats.potionsUsed=15;checkDynamicClassUnlocks();renderClassChoices();return isClassUnlocked('alchemist');};

  // Board balance pass. Goal: a smoother climb with Board 5 clearly harder than Board 4.
  const DB046_BOARD_OVERRIDES={
    2:{entryHeal:.12,entryPotions:1},
    3:{entryHeal:.18,entryPotions:1},
    4:{entryHeal:.22,entryPotions:2},
    5:{entryHeal:.18,entryPotions:2,extraHp:.52,extraAttack:.34,extraDefense:6,threePackChance:.42},
    6:{entryHeal:.22,entryPotions:2,extraHp:.62,extraAttack:.42,extraDefense:7}
  };
  if(typeof db317Board==='function'){
    const db046BoardBase=db317Board;
    db317Board=function(level=boardLevel){const base=db046BoardBase(level),ov=DB046_BOARD_OVERRIDES[level]||DB046_BOARD_OVERRIDES[String(level)]||null;return ov?Object.assign({},base,ov):base;};
  }

  const db046ScaleEnemyBase=scaleEnemy;
  scaleEnemy=function(base,kind='normal',packSize=1){
    const e=db046ScaleEnemyBase(base,kind,packSize);
    const tune={
      1:[1.00,1.00,0],
      2:[1.03,1.02,0],
      3:[1.07,1.05,1],
      4:[1.10,1.08,2],
      5:[1.30,1.20,4],
      6:[1.12,1.10,2]
    }[boardLevel]||[1,1,0];
    e.hp=Math.max(1,Math.round(e.hp*tune[0]));
    e.maxHp=e.hp;
    e.attack=Math.max(1,Math.round(e.attack*tune[1]));
    e.defense=Math.max(0,(e.defense||0)+tune[2]);
    const art=db046EnemyArtForName(e.name);
    if(art)e.icon=art;
    return e;
  };

  // Hard anti-lock: only one haste skip can be banked before an enemy actually acts.
  // Coffee still deals damage, but if Haste has already been granted in this response chain,
  // additional coffee procs cannot create another skipped enemy response.
  const db046TriggerElementBase=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const beforeTurns=player.hasteTurns||0,beforeCd=player.hasteCooldown||0,beforeLock=!!player._db046HasteLocked;
    const out=db046TriggerElementBase(key,target,opts);
    if(key==='coffee'){
      const gained=(player.hasteTurns||0)>beforeTurns;
      const blocked=beforeLock||beforeCd>0||beforeTurns>0;
      if(gained&&blocked){
        player.hasteTurns=beforeTurns;
        if(out)out.message=`${out.message||'Coffee crackles.'} Haste is already primed, so no extra action is granted.`;
      }else if(gained){
        player.hasteTurns=1;
        player._db046HasteLocked=true;
      }
    }
    return out;
  };
  const db046RollD20Base=rollD20Chaos;
  rollD20Chaos=async function(action){
    const beforeTurns=player.hasteTurns||0,beforeCd=player.hasteCooldown||0,beforeLock=!!player._db046HasteLocked;
    const out=await db046RollD20Base(action);
    if((player.hasteTurns||0)>beforeTurns){
      if(beforeLock||beforeCd>0||beforeTurns>0)player.hasteTurns=beforeTurns;
      else {player.hasteTurns=1;player._db046HasteLocked=true;}
    }
    return out;
  };
  const db046ResolveEnemyBase=resolveEnemyResponse;
  resolveEnemyResponse=async function(guarded=false,extraGuardPower=0){
    const hadHaste=(player.hasteTurns||0)>0;
    const out=await db046ResolveEnemyBase(guarded,extraGuardPower);
    if(hadHaste){
      player.hasteTurns=Math.min(player.hasteTurns||0,1);
      player.hasteCooldown=Math.max(player.hasteCooldown||0,2);
    }else{
      player._db046HasteLocked=false;
      if((player.hasteCooldown||0)>0)player.hasteCooldown=Math.max(0,(player.hasteCooldown||0)-1);
    }
    return out;
  };
  const db046ResetPlayerBase=resetPlayer;
  resetPlayer=function(classId=selectedClassId){const r=db046ResetPlayerBase(classId);player._db046HasteLocked=false;return r;};

  const db046TileMetaBase=tileMeta;
  tileMeta=function(tile){
    if(tile?.enemyBase?.name){
      const art=db046EnemyArtForName(tile.enemyBase.name);
      if(art&&tile.type==='enemy'){
        const count=tile.packSize||1;
        return [count>1?`${art}${art}`:art,count>1?`${tile.enemyBase.name} pack ×${count}`:`${tile.enemyBase.name} · 1 enemy`];
      }
      if(art&&tile.type==='miniboss')return [art,'Mini Boss · 1 enemy'];
    }
    return db046TileMetaBase(tile);
  };

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
  /* ========================================================================
     Beta 0.4.7 — explicit user-requested fixes pass
     ======================================================================== */

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
        if(up?.name==='Glass Needle')up.icon=glass||up.icon;
      });
    }
  }
  db047ApplyKnownArt();

  const db047TileMetaBase=tileMeta;
  function db047CompactEnemyTile(icon,enemyName,count=1){
    const n=Math.max(1,Number(count)||1);
    const visual=n>1?`<span class="db-enemy-pack-art">${icon}<b>×${n}</b></span>`:icon;
    return [visual,n>1?`${enemyName} · ${n} enemies`:`${enemyName} · 1 enemy`];
  }
  tileMeta=function(tile){
    const enemyName=tile?.enemyBase?.name||'';
    if(enemyName){
      if(/bandit/i.test(enemyName)){const icon=db047UiArt('bandit',enemyName,'db-art-portrait');if(icon)return db047CompactEnemyTile(icon,enemyName,tile.packSize||1);}
      if(/troll/i.test(enemyName)){const icon=db047UiArt('troll',enemyName,'db-art-portrait');if(icon)return db047CompactEnemyTile(icon,enemyName,tile.packSize||1);}
    }
    return db047TileMetaBase(tile);
  };

  // --- alchemist requirement hard override ---------------------------------
  const DB047_ALCHEMIST_REQUIREMENT=15;
  if(CLASSES?.alchemist)CLASSES.alchemist.unlock=`Use ${DB047_ALCHEMIST_REQUIREMENT} potions across all runs`;
  const db047BaseClassUnlocked=baseClassUnlocked;
  baseClassUnlocked=function(id){
    if(id==='alchemist')return !!meta.unlocks?.alchemist||((meta.stats?.potionsUsed||0)>=DB047_ALCHEMIST_REQUIREMENT);
    return db047BaseClassUnlocked(id);
  };
  const db047CheckDynamicClassUnlocks=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(){
    const out=db047CheckDynamicClassUnlocks();
    if((meta.stats?.potionsUsed||0)>=DB047_ALCHEMIST_REQUIREMENT)unlockClass('alchemist');
    return out;
  };

  // --- board pass: make the climb smoother and Board 5 > Board 4 ----------
  const DB047_BOARD_OVERRIDES={
    1:{entryHeal:.10,entryPotions:1},
    2:{entryHeal:.12,entryPotions:1,extraHp:.05,extraAttack:.03,extraDefense:0},
    3:{entryHeal:.16,entryPotions:1,extraHp:.11,extraAttack:.07,extraDefense:1},
    4:{entryHeal:.20,entryPotions:2,extraHp:.18,extraAttack:.12,extraDefense:2,threePackChance:.24},
    5:{entryHeal:.16,entryPotions:2,extraHp:.38,extraAttack:.26,extraDefense:5,threePackChance:.46},
    6:{entryHeal:.20,entryPotions:2,extraHp:.56,extraAttack:.38,extraDefense:7,threePackChance:.58}
  };
  const db047BoardBase=db317Board;
  db317Board=function(level=boardLevel){
    const base=db047BoardBase(level);
    const ov=DB047_BOARD_OVERRIDES[level]||null;
    return ov?Object.assign({},base,ov):base;
  };

  const db047ScaleEnemyBase=scaleEnemy;
  scaleEnemy=function(base,kind='normal',packSize=1){
    const enemy=db047ScaleEnemyBase(base,kind,packSize);
    const perBoard={1:[1.00,1.00,0],2:[1.03,1.02,0],3:[1.08,1.06,1],4:[1.15,1.10,2],5:[1.38,1.24,5],6:[1.55,1.33,7]}[boardLevel]||[1,1,0];
    enemy.hp=Math.max(1,Math.round(enemy.hp*perBoard[0]));
    enemy.maxHp=enemy.hp;
    enemy.attack=Math.max(1,Math.round(enemy.attack*perBoard[1]));
    enemy.defense=Math.max(0,(enemy.defense||0)+perBoard[2]);
    const name=(enemy.name||'').toLowerCase();
    if(name.includes('bandit'))enemy.icon=db047UiArt('bandit',enemy.name,'db-art-portrait')||enemy.icon;
    if(name.includes('troll'))enemy.icon=db047UiArt('troll',enemy.name,'db-art-portrait')||enemy.icon;
    return enemy;
  };

  // --- haste anti-lock: never queue more than one skipped response ---------
  player._db047HastePrimed=false;
  const db047TriggerElementBase=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const beforeTurns=player.hasteTurns||0;
    const beforeCd=player.hasteCooldown||0;
    const out=db047TriggerElementBase(key,target,opts);
    if(key==='coffee'){
      if((player.hasteTurns||0)>beforeTurns){
        if(beforeTurns>0 || beforeCd>0 || player._db047HastePrimed){
          player.hasteTurns=beforeTurns;
          if(out)out.message=`${out.message||'Coffee crackles.'} Haste is already primed, so no extra action is granted.`;
        }else{
          player.hasteTurns=1;
          player._db047HastePrimed=true;
        }
      }
    }
    return out;
  };
  const db047RollD20Base=rollD20Chaos;
  rollD20Chaos=async function(action){
    const beforeTurns=player.hasteTurns||0;
    const beforeCd=player.hasteCooldown||0;
    const beforePrimed=!!player._db047HastePrimed;
    const out=await db047RollD20Base(action);
    if((player.hasteTurns||0)>beforeTurns){
      if(beforeTurns>0 || beforeCd>0 || beforePrimed){
        player.hasteTurns=beforeTurns;
      }else{
        player.hasteTurns=1;
        player._db047HastePrimed=true;
      }
    }
    return out;
  };
  const db047ResolveEnemyBase=resolveEnemyResponse;
  resolveEnemyResponse=async function(guarded=false,extraGuardPower=0){
    const skipped=(player.hasteTurns||0)>0;
    const out=await db047ResolveEnemyBase(guarded,extraGuardPower);
    if(skipped){
      player.hasteTurns=0;
      player.hasteCooldown=Math.max(2,player.hasteCooldown||0);
    }else{
      if((player.hasteCooldown||0)>0)player.hasteCooldown=Math.max(0,(player.hasteCooldown||0)-1);
      player._db047HastePrimed=false;
    }
    return out;
  };
  const db047ResetPlayerBase=resetPlayer;
  resetPlayer=function(classId=selectedClassId){const out=db047ResetPlayerBase(classId);player._db047HastePrimed=false;return out;};


  /* ========================================================================
     Beta 0.4.9 — class order, compact pack icons and road-space polish
     ======================================================================== */

  document.title='Dicebound: Beta v0.4.9';
  const db048Brand=document.querySelector('.brand h1');if(db048Brand)db048Brand.textContent='Dicebound: Beta v0.4.9';
  const db048Sub=document.querySelector('.brand p');if(db048Sub)db048Sub.textContent='Beta v0.4.9 · compact travel controls, better board space, smaller enemy art and cleaner pack icons.';

  const db048Style=document.createElement('style');
  db048Style.textContent=`
    /* Large portrait assets are great in combat, but were overpowering 10×10 board tiles. */
    .tile .db-art-portrait{width:clamp(25px,2.15vw,35px)!important;height:clamp(25px,2.15vw,35px)!important;object-fit:contain!important}
    .tile .db-enemy-pack-art{display:inline-flex;align-items:center;justify-content:center;gap:2px;line-height:1;white-space:nowrap}
    .tile .db-enemy-pack-art .db-art-portrait{width:clamp(23px,1.95vw,32px)!important;height:clamp(23px,1.95vw,32px)!important}
    .tile .db-enemy-pack-art b{font-size:clamp(9px,.82vw,12px);color:#fff2c0;text-shadow:0 2px 4px #000;letter-spacing:-.02em}

    /* Desktop Travel becomes a compact control strip. The responsive board
       controller measures its real height, so every pixel saved here is
       automatically offered back to the square board. */
    @media (min-width:901px){
      .game-panel{gap:clamp(5px,.7vh,8px)!important}
      .road-controls{grid-template-columns:64px minmax(0,1fr)!important;grid-template-rows:auto!important;padding:7px 10px!important;gap:6px 9px!important;border-radius:15px!important}
      .road-controls h2{display:none!important}
      .road-controls .dice{grid-row:1!important;width:56px!important;height:56px!important;font-size:36px!important;border-radius:14px!important;margin:0!important}
      .road-controls .travel-actions{grid-row:1!important;gap:4px!important}
      .road-controls .main-btn{padding:9px 11px!important;border-radius:10px!important}
      .road-status{gap:6px!important;margin-top:1px!important}
      .road-status .stat{padding:5px 8px!important;border-radius:9px!important}
      .road-status .stat span{font-size:8px!important}
      .road-status .stat strong{font-size:10px!important;margin-top:1px!important}
      .road-controls .hint{font-size:9px!important;line-height:1.2!important;margin-top:1px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .travel-actions:has(#roll2Btn){gap:4px!important}
      .travel-actions:has(#roll2Btn) .main-btn{padding:9px 10px!important}
      .board{gap:5px!important}
    }

    /* On genuinely large screens we can lean even harder into the board and
       keep Travel visually secondary without making it tiny. */
    @media (min-width:1450px) and (min-height:800px){
      .road-controls{grid-template-columns:60px minmax(0,1fr)!important;padding:6px 9px!important}
      .road-controls .dice{width:52px!important;height:52px!important;font-size:34px!important}
      .road-controls .main-btn{padding:8px 10px!important}
      .board{gap:4px!important}
    }
  `;
  document.head.appendChild(db048Style);

  // Travel height changed; make the responsive controller immediately
  // recalculate the board instead of waiting for the next manual resize.
  setTimeout(()=>window.DiceboundResponsive?.schedule?.(),0);
  /* ========================================================================
     Beta 0.4.9 — battle art, pack counters and slimmed travel strip
     ======================================================================== */

  document.title='Dicebound: Beta v0.4.9';
  const db049Brand=document.querySelector('.brand h1');if(db049Brand)db049Brand.textContent='Dicebound: Beta v0.4.9';
  const db049Sub=document.querySelector('.brand p');if(db049Sub)db049Sub.textContent='Beta v0.4.9 · troll/bandit battle art, all-pack counters, slimmer travel box and restored Glass Needle art.';

  const db049Style=document.createElement('style');
  db049Style.textContent=`
    /* Board enemy portraits were still a little too dominant on tiles. */
    .tile .db-art-portrait{width:clamp(20px,1.82vw,28px)!important;height:clamp(20px,1.82vw,28px)!important;object-fit:contain!important}
    .tile .db-enemy-pack-art{display:inline-flex;align-items:center;justify-content:center;gap:3px;line-height:1;white-space:nowrap}
    .tile .db-enemy-pack-art .db-art-portrait{width:clamp(19px,1.68vw,26px)!important;height:clamp(19px,1.68vw,26px)!important}
    .tile .db-enemy-pack-art b{font-size:clamp(9px,.82vw,12px);color:#fff2c0;text-shadow:0 2px 4px #000;letter-spacing:-.02em}

    /* Glass Needle used a non-transparent source art and looked like a white sliver.
       Give it a slightly larger dedicated presentation inside powerup cards. */
    .choice-icon .db-art-glass-needle{width:58px!important;height:58px!important;filter:drop-shadow(0 4px 10px rgba(38,177,255,.35))}

    /* Keep Travel tighter and visually aligned with the centered square board. */
    @media (min-width:901px){
      .road-controls{width:min(100%,calc(var(--db-board-size) - clamp(10px,.8vw,24px)))!important;align-self:center!important;margin-inline:auto!important}
    }
  `;
  document.head.appendChild(db049Style);

  function db049UiArt(key,label='',klass='db-art-inline'){
    const entry=window.DiceboundAssets?.resolveUiIcon?.(key)||null;
    if(!entry?.image)return '';
    const alt=(label||entry.alt||key||'').replace(/"/g,'&quot;');
    return `<img class="db-art-icon ${klass}" src="${entry.image}" alt="${alt}">`;
  }
  function db049EnemyTileIcon(tile){
    const name=tile?.enemyBase?.name||'';
    if(/bandit/i.test(name))return db049UiArt('bandit',name,'db-art-portrait')||tile?.enemyBase?.icon||'👹';
    if(/troll/i.test(name))return db049UiArt('troll',name,'db-art-portrait')||tile?.enemyBase?.icon||'👹';
    const icon=tile?.enemyBase?.icon;
    if(typeof icon==='string'&&icon.trim()){
      if(icon.includes('db-enemy-pack-art'))return '👹';
      if(icon==='👹👹'||icon==='👹👹👹')return '👹';
      return icon;
    }
    return '👹';
  }
  function db049ApplyArtBindings(){
    const glass=db049UiArt('glassNeedle','Glass Needle','db-art-choice db-art-glass-needle');
    if(Array.isArray(window.upgrades))window.upgrades.forEach(up=>{if(up?.name==='Glass Needle')up.icon=glass||up.icon;});
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

  const db049TileMetaBase=tileMeta;
  tileMeta=function(tile){
    if(tile?.type==='enemy'&&Number(tile.packSize||1)>1&&tile?.enemyBase){
      const count=Math.max(2,Number(tile.packSize)||2),name=tile.enemyBase.name||'Enemy';
      return [`<span class="db-enemy-pack-art">${db049EnemyTileIcon(tile)}<b>×${count}</b></span>`,`${name} pack · ${count} enemies`];
    }
    if(tile?.type==='enemy'&&tile?.enemyBase&&(/bandit|troll/i.test(tile.enemyBase.name||''))){
      return [db049EnemyTileIcon(tile),`${tile.enemyBase.name} · 1 enemy`];
    }
    return db049TileMetaBase(tile);
  };

  // Travel width changed; immediately offer the reclaimed space to the square board.
  setTimeout(()=>window.DiceboundResponsive?.schedule?.(),0);
  /* ========================================================================
     Beta 0.5.10 — wider HUD, larger road view and Legacy Constellation polish
     ======================================================================== */

  document.title='Dicebound: Beta v0.5.12';
  const db050Brand=document.querySelector('.brand h1');if(db050Brand)db050Brand.textContent='Dicebound: Beta v0.5.10';
  const db050Sub=document.querySelector('.brand p');if(db050Sub)db050Sub.textContent='Beta v0.5.12 · campsite placement and expanded achievement-gated Epic/Legendary progression.';

  const db050Style=document.createElement('style');
  db050Style.textContent=`
    /* --- Desktop road/HUD pass ----------------------------------------- */
    @media (min-width:1200px) and (min-height:780px){
      body[data-hud-flow="rail"] .app{grid-template-columns:minmax(0,1fr) clamp(350px,26vw,410px)!important}
      body[data-hud-flow="expanded"] .app{grid-template-columns:minmax(0,1fr) clamp(600px,40vw,760px)!important}
      body[data-hud-flow="expanded"] .stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
      body[data-hud-flow="expanded"] .stat{padding:7px 8px!important}
      body[data-hud-flow="expanded"] .stat strong{font-size:15px!important}
      body[data-hud-flow="expanded"] .card{padding:11px 12px!important}
      body[data-hud-flow="expanded"] .hero-line{margin-bottom:8px!important}
      body[data-hud-flow="expanded"] .equipment-grid{gap:6px!important}
      body[data-hud-flow="expanded"] .equipment-slot{padding:7px 8px!important;min-height:52px!important}
      body[data-hud-flow="expanded"] .pet-card{padding-top:10px!important;padding-bottom:10px!important}
      body[data-hud-flow="expanded"] .pet-actions{gap:6px!important}
      body[data-hud-flow="expanded"] .sidebar{gap:8px!important}
      .app{padding:clamp(6px,.75vw,12px)!important;gap:clamp(6px,.65vw,10px)!important}
      .game-panel{gap:4px!important;padding:3px 5px!important}
      .board-wrap{padding:2px!important}
      .road-controls{padding:5px 8px!important;gap:4px 7px!important}
      .road-controls .dice{width:48px!important;height:48px!important;font-size:31px!important}
      .road-controls .main-btn{padding:7px 9px!important}
      .road-status .stat{padding:4px 7px!important}
      .road-controls .hint{font-size:8px!important}
    }

    /* Landscape cards become wider before they become taller. */
    @media (min-width:1260px) and (max-height:779px){
      body[data-hud-flow="landscape-3"] .app{grid-template-columns:minmax(390px,1fr) minmax(610px,48vw)!important}
      body[data-hud-flow="landscape-2"] .app{grid-template-columns:minmax(390px,1fr) minmax(520px,46vw)!important}
      body[data-hud-flow="landscape-2"] .stats-grid,
      body[data-hud-flow="landscape-3"] .stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
    }

    /* --- Camp heirloom actions ---------------------------------------- */

  `;
  document.head.appendChild(db050Style);

  // Layout geometry changed: immediately let the board claim the reclaimed pixels.
  setTimeout(()=>window.DiceboundResponsive?.schedule?.(),0);
  /* ========================================================================
     Beta 0.5.10 — authoritative class artwork
     ======================================================================== */
  const DB054_CLASS_ART_IDS=Object.freeze([
    'ranger','sorcerer','fighter','monk','clown','rouge','berserker','turtle','frog','d20',
    'slime','vampire','ninja','ceo','merchant','cleric','paladin','beastmaster','rogue','bloodmage',
    'summoner','pokemontrainer','alchemist','ouroboros','slimerouge'
  ]);
  function db054ClassArt(classId){
    const id=DB054_CLASS_ART_IDS.includes(String(classId))?String(classId):'ranger';
    const fromRegistry=window.DiceboundAssets?.resolveClassArt?.(id);
    return fromRegistry||{
      headshot:`assets/ui/class-art/headshots/${id}.png`,
      marker:`assets/ui/class-markers/${id}.png`,
      battle:`assets/ui/class-art/battle/${id}.png`,
      alt:CLASSES[id]?.name||id
    };
  }
  function db054ClassImageHtml(classId,kind='headshot'){
    const cls=CLASSES[classId]||CLASSES.ranger,art=db054ClassArt(cls.id),src=kind==='battle'?art.battle:art.headshot;
    return `<img class="db054-class-art db054-class-art-${kind}" src="${src}" alt="${cls.name}" draggable="false">`;
  }
  const db054LegacyPortraitSVG=classPortraitSVG;
  classPortraitSVG=function(classId){
    const cls=CLASSES[classId]||CLASSES.ranger;
    return db054ClassImageHtml(cls.id,'headshot');
  };
  applyClassPortrait=function(el,classId,combat=false){
    if(!el)return;
    const cls=CLASSES[classId]||CLASSES.ranger,kind=combat?'battle':'headshot';
    el.classList.remove('ranger-portrait');
    el.classList.add(combat?'combat-portrait':'class-portrait','db054-art-frame');
    el.dataset.classArt=cls.id;
    el.innerHTML=db054ClassImageHtml(cls.id,kind);
    const img=el.querySelector('img');
    if(img)img.addEventListener('error',()=>{
      el.classList.remove('db054-art-frame');
      el.innerHTML='';
      try{el.innerHTML=db054LegacyPortraitSVG(cls.id);}catch(_){el.textContent=cls.icon||'🎲';}
    },{once:true});
  };
  // Existing HUD and combat owners already call classPortraitSVG/applyClassPortrait.
  // Keeping the art swap below those owner boundaries prevents another late-patch ownership fight.
  const db054Style=document.createElement('style');
  db054Style.textContent=`
    .db054-art-frame{font-size:0!important;line-height:0!important;background:transparent!important}
    .db054-class-art{display:block;width:100%;height:100%;object-fit:contain;object-position:center;pointer-events:none;user-select:none}
    .hero-avatar.class-portrait{width:58px!important;height:58px!important;padding:0!important;overflow:hidden!important;border-radius:15px!important;background:linear-gradient(145deg,rgba(35,51,81,.95),rgba(16,25,43,.95))!important}
    .hero-avatar.class-portrait .db054-class-art-headshot{object-fit:cover}
    #campClassIcon.class-portrait{overflow:hidden!important}
    #campClassIcon.class-portrait .db054-class-art-headshot{object-fit:cover}
    #combatOverlay .modal{width:min(780px,calc(100vw - 30px))!important}
    #combatOverlay .combat-head{align-items:flex-end!important;gap:12px!important}
    #combatPlayerIcon.combat-portrait{width:190px!important;height:230px!important;margin:0 auto 7px!important;padding:0!important;overflow:visible!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;filter:drop-shadow(0 15px 18px rgba(0,0,0,.42))}
    #combatPlayerIcon.combat-portrait .db054-class-art-battle{object-fit:contain;object-position:center bottom}
    #combatOverlay .fighter:first-child{min-width:220px}
    #combatOverlay .fighter:first-child .fighter-name{margin-top:-2px}
    .pawn .db054-board-marker{width:100%;height:100%;object-fit:cover;display:block;border-radius:50%}
    @media(max-width:760px){
      #combatOverlay .modal{width:min(700px,calc(100vw - 16px))!important;padding:15px!important}
      #combatPlayerIcon.combat-portrait{width:130px!important;height:160px!important}
      #combatOverlay .fighter:first-child{min-width:145px}
    }
    @media(max-height:650px){
      #combatPlayerIcon.combat-portrait{width:125px!important;height:145px!important}
      #combatOverlay .combat-head{margin-bottom:8px!important}
    }
  `;
  document.head.appendChild(db054Style);
  /* ========================================================================
     Beta 0.5.10 — campsite environment art & alchemist scaling presentation
     ======================================================================== */
  /* ========================================================================
     Beta 0.5.10 — campsite spatial composition + wheel-zoom talent atlas
     ======================================================================== */
  /* ========================================================================
     Beta 0.5.10 — campsite spatial refinement
     ======================================================================== */
  /* ========================================================================
     Beta 0.5.10 — campsite art replacement + selected-class figure
     ======================================================================== */
  /* ========================================================================
     Beta 0.5.10 — pet artwork + campsite composition tuning
     ======================================================================== */
  const db059Style=document.createElement('style');
  db059Style.textContent=`
    /* Pet artwork --------------------------------------------------------- */
    .db059-pet-art{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none;filter:drop-shadow(0 5px 7px rgba(0,0,0,.34))}
    .pet-avatar{overflow:visible!important}
    .pet-avatar .db059-pet-art{width:54px;height:54px;max-width:none;max-height:none}
    #combatPet{width:78px;height:78px;font-size:0!important;display:block!important;margin:5px auto 4px!important;overflow:visible!important}
    #combatPet .db059-pet-art{width:78px;height:78px;filter:drop-shadow(0 8px 8px rgba(0,0,0,.42))}
    #campPetIcon{width:96px!important;height:96px!important;font-size:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:visible!important}
    #campPetIcon .db059-pet-art{width:96px;height:96px}
    .summoner-spirit-token .db059-pet-art{width:28px;height:28px}

    @media(max-width:999px){
      #combatPet{width:62px;height:62px}
      #combatPet .db059-pet-art{width:62px;height:62px}
    }
    body[data-window-height="very-short"] #combatPet,
    body[data-window-height="very-short"] #combatPet .db059-pet-art{width:50px!important;height:50px!important}
  `;
  document.head.appendChild(db059Style);

  function db059PetArtEntry(petId){
    const id=String(petId||'neutral');
    return window.DiceboundAssets?.resolvePetArt?.(id)||{portrait:`assets/pets/portraits/${id}.png`,alt:PETS[id]?.name||id};
  }
  function db059SetPetArt(el,petId,extraClass='',context='portrait'){
    if(!el)return;
    const def=PETS[petId]||PETS.neutral,entry=db059PetArtEntry(def.id),src=entry?.[context]||entry?.portrait||`assets/pets/portraits/${def.id}.png`;
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
  /* ========================================================================
     Beta 0.5.10 — campsite placement refinement + Arcane Lance scaling pass
     ======================================================================== */
  /* ========================================================================
     Alpha 3.1.9 — deterministic actual-system regression API
     ------------------------------------------------------------------------
     This is intentionally thin: tests call the real character, board, combat,
     equipment, prestige, storage and save systems. No approximate simulator.
     ======================================================================== */
  function v319ResetCareer(){
    window.DiceboundSave?.reset?.();
    meta=normalizeMetaCore(defaultMeta());
    if(typeof ensureAlphaMeta==='function')ensureAlphaMeta();
    selectedClassId='ranger';boardLevel=1;nightmareMode=false;hellMode=false;gameStarted=false;rollLocked=true;combatBusy=false;pendingLevelUps=0;currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;tiles=[];tileEls=[];
    return meta;
  }
  function v319BoardDigest(){return tiles.map((t,i)=>({i,type:t?.type||null,pack:t?.packSize||1,enemy:t?.enemyBase?.name||null}));}
  async function v319ActualFlow(seed='flow-319'){
    window.DiceboundRng.seed(seed);v319ResetCareer();resetPlayer('ranger');boardLevel=1;generateBoard();
    const board=v319BoardDigest(),enemyIndex=tiles.findIndex((t,i)=>i>0&&t?.type==='enemy'&&(t.packSize||1)===1);
    if(enemyIndex<0)throw new Error('Deterministic flow could not find a normal encounter');
    player.position=enemyIndex;player.attack=999;startCombat('normal');
    let strikes=0;while(livingEnemies().length&&strikes<12){const target=livingEnemies()[0];setCurrentEnemy(currentEnemies.indexOf(target));await performStrike(target,{echo:false,index:0});strikes++;}
    const encounterResolved=!livingEnemies().length;
    const item=generateEquipment('uncommon','weapon');equipItem(item,true);
    meta.runs=17;meta.petCookies=3;meta.bestTiles=Math.max(meta.bestTiles||0,enemyIndex);saveMeta();
    meta.runs=999;meta.petCookies=999;
    const loaded=window.DiceboundSave.loadMeta({defaultFactory:defaultMeta,normalize:normalizeMetaCore});meta=loaded.meta;
    return {seed,board,enemyIndex,strikes,encounterResolved,loot:{slot:item.slot,rarity:item.rarity,name:item.name},reload:{source:loaded.source,runs:meta.runs,petCookies:meta.petCookies,bestTiles:meta.bestTiles},rng:window.DiceboundRng.snapshot()};
  }
  function v319LegendaryFallback(){
    v319ResetCareer();resetPlayer('ranger');const original=eligibleUpgrades;
    try{eligibleUpgrades=(filter=()=>true)=>original(u=>u.rarity!=='legendary'&&filter(u));const result=v27FallbackRarityPool('legendary');return {rarity:result.rarity,count:result.pool.length};}
    finally{eligibleUpgrades=original;}
  }
  function v319RoadLockRecovery(){
    v319ResetCareer();resetPlayer('ranger');gameStarted=true;generateBoard();buildBoard();player.position=Math.min(5,tiles.length-2);tiles[player.position]={type:'definitely-corrupt',cleared:false};rollLocked=true;combatBusy=true;dbBoardTileDispatch.dispatch();return {type:tiles[player.position].type,cleared:!!tiles[player.position].cleared,rollLocked,combatBusy};
  }
  function v319PoorItems(n=500){v319ResetCareer();resetPlayer('ranger');let nulls=0,badSlots=0,wrongRarity=0;for(let i=0;i<n;i++){const item=generateEquipment('poor');if(!item)nulls++;else{if(!EQUIPMENT_SLOTS.includes(item.slot))badSlots++;if(item.rarity!=='poor')wrongRarity++;}}return {n,nulls,badSlots,wrongRarity};}
  function v319EnergyShield(){
    v319ResetCareer();resetPlayer('ranger');gameStarted=true;currentEnemies=[{name:'Shield Dummy',icon:'👹',hp:100,maxHp:100,attack:1,defense:0}];currentEnemy=currentEncounterLead=currentEnemies[0];const aegis=upgrades.find(u=>u.id==='legendary_crimson_aegis_v27');applyUpgrade(aegis,'deterministic test');player.hp=player.maxHp-1;player.energyShield=0;healPlayer(101);return {hp:player.hp,maxHp:player.maxHp,shield:player.energyShield};
  }
  function v319PoisonOverflow(seed='poison-319',chance=2.4,n=1000){window.DiceboundRng.seed(seed);v319ResetCareer();resetPlayer('ranger');const vals=[];for(let i=0;i<n;i++)vals.push(rollTieredProc(chance));return {seed,chance,n,min:Math.min(...vals),max:Math.max(...vals),average:vals.reduce((a,b)=>a+b,0)/n,first:vals.slice(0,20)};}
  function v319Prestige(seed='prestige-319'){
    window.DiceboundRng.seed(seed);v319ResetCareer();meta.points=18;const before=meta.prestige.count||0;v27CompletePrestigeNoChoice(18);const permanent=['maxHp','attack','defense','crit','dodge','luck','lifeSteal'].reduce((n,k)=>n+(meta.prestige[k]||0),0);return {before,after:meta.prestige.count,permanent,points:meta.points,level:meta.level};
  }
  function v319StorageSaveReload(){
    v319ResetCareer();meta.heirloomStorageUnlocked=true;meta.board5Clears=1;meta.prestige.count=5;meta.merchantKills=1;const item={id:'test_heirloom_319',slot:'weapon',rarity:'epic',icon:'🧪',name:'Regression Blade',bonuses:{attack:9}};meta.heirloomStorage=[item];meta.heirlooms=[item];const capacity=v24StorageCapacity();saveMeta();meta.heirloomStorage=[];meta.heirlooms=[];const loaded=window.DiceboundSave.loadMeta({defaultFactory:defaultMeta,normalize:normalizeMetaCore});meta=loaded.meta;return {capacity,stored:(meta.heirloomStorage||[]).length,active:(meta.heirlooms||[]).length,id:meta.heirloomStorage?.[0]?.id||null};
  }
  function v319RandomClass(seed='random-class-319'){
    window.DiceboundRng.seed(seed);v319ResetCareer();['ranger','sorcerer','fighter','monk','clown'].forEach(id=>meta.unlocks[id]=true);window.DiceboundClassChooser?.setRandomMode?.(true);startNewGame();const chosen=player.classId;window.DiceboundClassChooser?.setRandomMode?.(false);return {seed,chosen};
  }
  function v319SecretBossRitual(){return window.DiceboundV24Test?.devilRitual?.()||{primed:false};}
  function v319SlimeRouge(seed='slime-rouge-319'){
    window.DiceboundRng.seed(seed);v319ResetCareer();Object.keys(CLASSES).forEach(id=>meta.unlocks[id]=true);selectedClassId='slimerouge';startNewGame();return {seed,identity:player.slimeRougeIdentityClass,ultimate:player.slimeRougeUltimateClass,summary:player.slimeRougeRunSummary||'',classId:player.classId};
  }
  window.DiceboundV319Test=Object.freeze({
    seed:value=>window.DiceboundRng.seed(value),rng:()=>window.DiceboundRng.snapshot(),fresh:v319ResetCareer,
    board:(seed='board-319')=>{window.DiceboundRng.seed(seed);v319ResetCareer();resetPlayer('ranger');generateBoard();return v319BoardDigest();},
    actualFlow:v319ActualFlow,legendaryFallback:v319LegendaryFallback,roadLock:v319RoadLockRecovery,poorItems:v319PoorItems,energyShield:v319EnergyShield,
    ouroboros:()=>window.DiceboundV318Test.ouroborosIdentityStrike(),poisonOverflow:v319PoisonOverflow,prestige:v319Prestige,storage:v319StorageSaveReload,
    randomClass:v319RandomClass,secretBoss:v319SecretBossRitual,slimeRouge:v319SlimeRouge
  });


  /* ========================================================================
     Alpha 3.2 — wrapper-boundary / mechanic-eligibility regression API
     ======================================================================== */
  function v32SlimeRougeSummonerMana(){
    window.DiceboundV318Test.forceRun('merchant','ranger');
    const previous={identity:player.slimeRougeIdentityClass,mana:player.mana,maxMana:player.maxMana};
    const current=window.DiceboundV318Test.forceRun('summoner','ranger');
    return {previous,current,playerMana:player.mana,playerMaxMana:player.maxMana,hasMana:classHasMechanic('mana'),hasSpirits:classHasMechanic('spirits')};
  }
  function v32BenedictionEligibility(){
    v319ResetCareer();meta.unlocks.slime=true;meta.unlocks.cleric=true;meta.unlocks.slimerouge=true;
    const ben=upgrades.find(u=>u.id==='cleric_benediction');
    resetPlayer('slime');const slime=eligibleUpgrades(()=>true).some(u=>u.id==='cleric_benediction');
    resetPlayer('cleric');const cleric=eligibleUpgrades(()=>true).some(u=>u.id==='cleric_benediction');
    window.DiceboundV318Test.forceRun('cleric','ranger');const rouge=eligibleUpgrades(()=>true).some(u=>u.id==='cleric_benediction');
    const spec=window.DiceboundContent?.powerupMechanics?.cleric_benediction||{};
    return {slime,cleric,slimeRougeCleric:rouge,requires:[...(spec.requires||[])],clericMechanics:classMechanicsFor('cleric'),description:ben?.desc||''};
  }
  window.DiceboundV32Test=Object.freeze({
    slimeRougeSummonerMana:v32SlimeRougeSummonerMana,
    benedictionEligibility:v32BenedictionEligibility,
    infrastructure:()=>({platform:window.DiceboundPlatform?.runtimeInfo?.(),storage:window.DiceboundStorage?.diagnostics?.(),save:window.DiceboundSave?.diagnostics?.(),wrapper:window.DiceboundPlatform?.wrapperDiagnostics?.()})
  });

  /* Beta 0.3 — final-runtime regression API. */
  function beta03RewardOdds(level){const t=beta03MinibossBaseTable(level),legendary=t.legendary,epic=t.epic-t.legendary,rare=t.rare-t.epic,uncommon=t.uncommon-t.rare,common=1-t.uncommon;return {legendary,epic,rare,uncommon,common};}
  function beta03MysticSample(seed='beta03-mystic',n=20000){window.DiceboundRng.seed(seed);const out={legendary:0,epic:0,rare:0};for(let i=0;i<n;i++)out[beta03RollMysticRarity()]++;return {...out,n};}
  function beta03MinibossSample(level=1,seed='beta03-miniboss',n=20000){window.DiceboundRng.seed(seed);v319ResetCareer();resetPlayer('ranger');boardLevel=level;nightmareMode=false;hellMode=false;player.luck=0;const out={legendary:0,epic:0,rare:0,uncommon:0,common:0};for(let i=0;i<n;i++)out[v27RollMinibossRarity()]++;return {...out,n};}
  function beta03BurnCap(){const e={name:'Burn Dummy',hp:1000,maxHp:1000,attack:0,defense:0,burnStacks:0};return {after20:beta03AddBurn(e,20),cap:BETA03_BURN_CAP,chance:BETA03_FIREBALL_BURN_CHANCE};}
  function beta03FireSample(seed='beta03-fire',n=10000){window.DiceboundRng.seed(seed);v319ResetCareer();resetPlayer('ranger');gameStarted=true;player.attack=1;player.elementEchoChance=0;const e={name:'Fire Dummy',icon:'🎯',hp:1000000000,maxHp:1000000000,attack:1,defense:0,weakness:'ice',affinity:null,poisonStacks:0,enemyBarrier:0,burnStacks:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;let burns=0;for(let i=0;i<n;i++){e.burnStacks=0;triggerElementEffect('fire',e,{forced:true,source:'Beta 0.3 regression'});if(e.burnStacks)burns++;}return {seed,n,burns,rate:burns/n};}
  function beta03BurnTick(){v319ResetCareer();resetPlayer('ranger');gameStarted=true;player.hp=player.maxHp;const e={name:'Burn Dummy',icon:'🎯',hp:1000,maxHp:1000,attack:0,defense:0,burnStacks:3,poisonStacks:0,enemyBarrier:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;const before=e.hp,result=beta03TickEnemyBurns();return {before,after:e.hp,dealt:before-e.hp,result};}
  function beta03BerserkerPowers(){v319ResetCareer();resetPlayer('berserker');const before={attack:player.attack,berserk:player.berserk},pain=upgrades.find(u=>u.id==='berserker_pain'),roar=upgrades.find(u=>u.id==='berserker_blood_roar');pain.apply();const afterPain={attack:player.attack,berserk:player.berserk};roar.apply();return {before,afterPain,afterRoar:{attack:player.attack,berserk:player.berserk},painDesc:pain.desc,roarDesc:roar.desc};}
  async function beta03DoubleDose(){window.DiceboundRng.seed('beta03-double-dose');v319ResetCareer();meta.purchased.survival_prepared=2;meta.purchased.survival_alchemy=2;meta.purchased.survival_double_dose=1;resetPlayer('ranger');gameStarted=true;player.maxHp=200;player.hp=1;player.potions=2;const e={name:'Potion Dummy',icon:'🎯',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'ice',affinity:null,poisonStacks:0,enemyBarrier:0};currentEnemies=[e];currentEnemy=currentEncounterLead=e;combatBusy=false;let responses=0;const baseResponse=resolveEnemyResponse;resolveEnemyResponse=async function(){responses++;combatBusy=false;};try{const before={hp:player.hp,potions:player.potions,used:meta.stats?.potionsUsed||0};await usePotion();return {before,after:{hp:player.hp,potions:player.potions,used:meta.stats?.potionsUsed||0},responses,enabled:player.doublePotionTurn,talent:talents.find(t=>t.id==='survival_double_dose')};}finally{resolveEnemyResponse=baseResponse;combatBusy=false;}}
  window.DiceboundBeta03Test=Object.freeze({rewardOdds:beta03RewardOdds,mysticSample:beta03MysticSample,minibossSample:beta03MinibossSample,burnCap:beta03BurnCap,fireSample:beta03FireSample,burnTick:beta03BurnTick,berserkerPowers:beta03BerserkerPowers,doubleDose:beta03DoubleDose,talentAudit:()=>window.DiceboundTalentTree?.layoutAudit?.()});
  /* ========================================================================
     Alpha 3.2.4 — touch/mobile + victory/eligibility regression API
     ======================================================================== */
  function v322ArcaneEligibility(){
    const powerId='sorcerer_resonance';
    v319ResetCareer();meta.unlocks.slime=true;meta.unlocks.sorcerer=true;meta.unlocks.slimerouge=true;
    resetPlayer('slime');const slime=eligibleUpgrades(()=>true).some(u=>u.id===powerId);
    window.DiceboundV318Test.forceRun('ranger','ranger');const rougeRanger=eligibleUpgrades(()=>true).some(u=>u.id===powerId);
    window.DiceboundV318Test.forceRun('sorcerer','ranger');const rougeSorcerer=eligibleUpgrades(()=>true).some(u=>u.id===powerId);
    resetPlayer('sorcerer');const sorcerer=eligibleUpgrades(()=>true).some(u=>u.id===powerId);
    return {slime,rougeRanger,rougeSorcerer,sorcerer,requires:[...(window.DiceboundContent?.powerupMechanics?.[powerId]?.requires||[])]};
  }
  function v322UltimateTooltip(identity='summoner',ultimate='pokemontrainer'){
    window.DiceboundV318Test.forceRun(identity,ultimate);updateCombatUI();
    const donor=CLASSES[ultimate];
    return {identity,ultimate,button:$('ultimateBtn')?.textContent||'',tip:$('ultimateBtn')?.dataset?.tip||'',expected:donor?.ultimate?.desc||''};
  }
  async function v322VictoryAliveBlocked(){
    BattleVictoryUI.reset();currentEnemies=[{name:'Still Alive',hp:12,maxHp:12}];currentEnemy=currentEncounterLead=currentEnemies[0];
    const result=BattleVictoryState.create({title:'Impossible Victory',defeatedNames:[],xp:0,gold:0,cookies:0,board:1});
    await BattleVictoryUI.present(result);
    const hidden=$('battleVictory')?.classList?.contains('hidden');
    currentEnemies=[];currentEnemy=currentEncounterLead=null;BattleVictoryUI.reset();return {hidden};
  }
  async function v322VictoryCookies(cookies=0){
    BattleVictoryUI.reset();currentEnemies=[];currentEnemy=currentEncounterLead=null;
    const result=BattleVictoryState.create({title:'Cookie Test',defeatedNames:['Dummy'],xp:1,gold:1,cookies,board:1});
    const pending=BattleVictoryUI.present(result);const hidden=$('battleVictoryCookieBox')?.classList?.contains('hidden');$('battleVictoryContinue')?.click?.();await pending;BattleVictoryUI.reset();return {cookies,hidden};
  }
  window.DiceboundV322Test=Object.freeze({
    arcaneEligibility:v322ArcaneEligibility,
    ultimateTooltip:v322UltimateTooltip,
    victoryAliveBlocked:v322VictoryAliveBlocked,
    victoryCookies:v322VictoryCookies,
    touchContract:()=>({dialog:!!window.DiceboundDialogs?.confirm,touchInfo:!!window.DiceboundTouchInfo?.show})
  });

  /* ========================================================================
     Beta 0.5.11 — full-screen combat, elemental parity & progression fixes
     ======================================================================== */

  const db0511Style=document.createElement('style');
  db0511Style.id='dicebound-beta-0-5-11-style';
  db0511Style.textContent=`
    /* Combat is now a game screen rather than a floating desktop modal. */
    #combatOverlay{
      padding:0!important;
      align-items:stretch!important;
      justify-content:stretch!important;
      background:
        radial-gradient(circle at 50% 28%,rgba(45,66,113,.38),rgba(7,12,25,.94) 64%),
        linear-gradient(180deg,rgba(10,18,35,.96),rgba(5,9,19,.99))!important;
      backdrop-filter:none!important;
    }
    #combatOverlay>.modal{
      width:100vw!important;
      max-width:none!important;
      min-height:100dvh!important;
      height:100dvh!important;
      max-height:none!important;
      margin:0!important;
      padding:clamp(16px,2.2vh,30px) clamp(18px,4vw,72px)!important;
      border:0!important;
      border-radius:0!important;
      box-shadow:none!important;
      overflow:auto!important;
      background:
        radial-gradient(circle at 50% 30%,rgba(65,89,142,.22),transparent 45%),
        linear-gradient(180deg,rgba(25,38,68,.80),rgba(10,17,33,.92))!important;
    }
    #combatOverlay>.modal>h2,
    #combatOverlay>.modal>.subtitle,
    #combatOverlay .combat-head,
    #combatOverlay .enemy-party,
    #combatOverlay .boss-special,
    #combatOverlay .combat-text,
    #combatOverlay .battle-victory,
    #combatOverlay .combat-history,
    #combatOverlay .ultimate-wrap,
    #combatOverlay .combat-actions{
      width:min(1220px,100%)!important;
      max-width:1220px!important;
      margin-left:auto!important;
      margin-right:auto!important;
    }
    #combatOverlay>.modal>h2{text-align:center;margin-top:0!important}
    #combatOverlay>.modal>.subtitle{text-align:center}
    #combatOverlay .combat-head{min-height:clamp(250px,39vh,500px)!important}
    #combatOverlay .combat-history{height:clamp(92px,15vh,180px)!important;max-height:180px!important}
    #combatOverlay .combat-actions{padding-bottom:12px}
    @media(max-height:760px) and (min-width:800px){
      #combatOverlay>.modal{padding-top:10px!important;padding-bottom:10px!important}
      #combatOverlay .combat-head{min-height:215px!important}
      #combatOverlay .combat-history{height:82px!important}
    }

    .db0511-player-status{display:inline-flex;align-items:center;gap:4px;margin-left:5px;padding:2px 6px;border-radius:999px;background:rgba(0,0,0,.24);font-size:9px;font-weight:900;white-space:nowrap}
  `;
  document.head.appendChild(db0511Style);

  // GLASS NEEDLE — the asset existed, but older code looked for window.upgrades
  // even though upgrades is lexical. Render it at the final card boundary so
  // every level-up/free/miniboss/contract choice uses the real art.
  const db0511GlassNeedleArt=window.DiceboundAssets?.resolveUiIcon?.('glassNeedle')?.image||'';
  const db0511ChoiceHTMLBase=choiceHTML;
  choiceHTML=function(up){
    if(up?.name!=='Glass Needle'||!db0511GlassNeedleArt)return db0511ChoiceHTMLBase(up);
    const old=up.icon;
    up.icon=`<img class="db-art-icon db-art-choice db-art-glass-needle" src="${db0511GlassNeedleArt}" alt="Glass Needle">`;
    try{return db0511ChoiceHTMLBase(up);}finally{up.icon=old;}
  };
  const db0511GlassNeedle=upgrades.find?.(u=>u?.name==='Glass Needle');
  if(db0511GlassNeedle&&db0511GlassNeedleArt)db0511GlassNeedle.icon=`<img class="db-art-icon db-art-choice db-art-glass-needle" src="${db0511GlassNeedleArt}" alt="Glass Needle">`;

  // ALCHEMIST — the outside-potion DOM listener was registered against an old
  // function object before later tracking wrappers replaced usePotionOutsideCombat.
  // Capture the click and route it through the current live function instead.
  const db0511OutsidePotionBtn=$('outsidePotionBtn');
  if(db0511OutsidePotionBtn&&!db0511OutsidePotionBtn.dataset.db0511LivePotion){
    db0511OutsidePotionBtn.dataset.db0511LivePotion='1';
    db0511OutsidePotionBtn.addEventListener('click',event=>{
      const usable=gameStarted&&!rollLocked&&!currentEnemy&&player.potions>0&&player.hp<player.maxHp;
      if(!usable)return;
      event.preventDefault();event.stopImmediatePropagation();
      usePotionOutsideCombat();
      const counter=document.querySelector('.v18-potion-counter');
      if(counter)counter.textContent=`Potion uses: ${Math.floor(meta.stats?.potionsUsed||0)} / 15`;
      checkDynamicClassUnlocks();
    },true);
  }

  // ENEMY ELEMENTAL PARITY — enemy affinities now use mirrored versions of the
  // player's elemental effects instead of the old unrelated penalty table.
  function db0511PlayerElementDamage(raw){
    return v24ApplyDamage(Math.max(1,Math.round(raw||0)));
  }
  function db0511AddPlayerBurn(stacks=1){
    player.db0511BurnStacks=Math.min(10,Math.max(0,(player.db0511BurnStacks||0)+stacks));
    return player.db0511BurnStacks;
  }
  function db0511AddPlayerPoison(stacks=1,power=.12){
    player.db0511PoisonStacks=Math.max(0,(player.db0511PoisonStacks||0)+stacks);
    player.db0511PoisonPower=Math.max(player.db0511PoisonPower||0,power||.12);
    return player.db0511PoisonStacks;
  }
  function db0511QueueControl(label){
    if(player._db0511SuppressControlProc)return false;
    // Multiple proc sources in the same enemy pack still cost only one action.
    if(!player._db0511SkipAction)player._db0511SkipAction=label;
    return true;
  }
  enemyElementProc=function(enemy){
    if(!enemy?.affinity||!ELEMENTS[enemy.affinity]||random()>enemy.elementProcChance)return '';
    const key=enemy.affinity,e=ELEMENTS[key];
    playElementAnimation(key,enemy,true);
    let note=`${e.icon} ${enemy.name} activates ${e.spell}: `,hit=null;
    if(key==='fire'){
      hit=db0511PlayerElementDamage(enemy.attack*.65);note+=`${hit.total} Fire damage.`;
      if(random()<.15){const stacks=db0511AddPlayerBurn(1);note+=` Burn ${stacks}/10 applied.`;}
    }else if(key==='ice'){
      hit=db0511PlayerElementDamage(enemy.attack*.38);db0511QueueControl('❄️ Frozen by Ice Nova');note+=`${hit.total} Ice damage and you are Frozen for your next action.`;
    }else if(key==='electric'){
      hit=db0511PlayerElementDamage(enemy.attack*.90);note+=`${hit.total} Electric damage.`;
      if(random()<.15&&db0511QueueControl('⚡ Stunned by Static Shock'))note+=' Static Shock stuns your next action.';
    }else if(key==='light'){
      hit=db0511PlayerElementDamage(enemy.attack*.52);const heal=Math.min(enemy.maxHp-enemy.hp,Math.max(1,Math.ceil(enemy.maxHp*.09)));enemy.hp+=heal;note+=`${hit.total} Light damage and restores ${heal} HP to ${enemy.name}.`;
    }else if(key==='void'){
      const raw=Math.max(1,Math.min(player.maxHp*.09,enemy.attack*4.5));hit=db0511PlayerElementDamage(raw);note+=`${hit.total} Void damage based on your max HP.`;
    }else if(key==='nature'){
      hit=db0511PlayerElementDamage(enemy.attack*.30);const stacks=db0511AddPlayerPoison(1,.12);note+=`${hit.total} Nature damage and Poison Vines add a Poison stack (${stacks}).`;
    }else if(key==='donut'){
      hit=db0511PlayerElementDamage(enemy.attack*.30);const heal=Math.min(enemy.maxHp-enemy.hp,Math.max(1,Math.ceil(enemy.maxHp*.18)));enemy.hp+=heal;note+=`${hit.total} Donut damage and restores ${heal} HP to ${enemy.name}.`;
    }else if(key==='tech'){
      hit=db0511PlayerElementDamage(enemy.attack*.42);const before=player.attack,cut=Math.max(1,Math.ceil(Math.max(1,before)*.10));player.attack=Math.max(1,before-cut);const actual=Math.max(0,before-player.attack);player.db0511TechAttackLost=(player.db0511TechAttackLost||0)+actual;note+=`${hit.total} Tech damage and Brain Hack lowers your Attack by ${actual} for this battle.`;
    }else if(key==='metal'){
      hit=db0511PlayerElementDamage(enemy.attack*.58);if(currentEncounterLead?.guardian){currentEncounterTurn+=1;note+=`${hit.total} Metal damage and advances the Guardian special clock.`;}else{const gain=Math.max(1,Math.round(enemy.attack*.05));enemy.attack+=gain;note+=`${hit.total} Metal damage and powers ${enemy.name} up by ${gain} Attack for this battle.`;}
    }else if(key==='coffee'){
      hit=db0511PlayerElementDamage(enemy.attack*.34);const extra=db0511PlayerElementDamage(enemy.attack*.34);note+=`${hit.total+extra.total} Coffee damage as Caffeinated Haste grants ${enemy.name} an immediate extra hit.`;
    }else if(key==='gun'){
      const pierce=Math.ceil(Math.max(0,player.defense)*.5);hit=db0511PlayerElementDamage(enemy.attack*1.05+pierce);note+=`${hit.total} piercing damage, bypassing roughly half your Defense.`;
    }else if(key==='radiation'){
      hit=db0511PlayerElementDamage(enemy.attack*.34);const loss=Math.min(Math.max(0,player.defense),1);if(loss){player.defense-=loss;player.radiationDefenseLost=(player.radiationDefenseLost||0)+loss;}note+=`${hit.total} Radiation damage${loss?` and your Defense falls by ${loss} for this battle`:''}.`;
    }
    addCombatHistory(note);updateCombatUI();return note;
  };

  function db0511TickPlayerElementStatuses(){
    if(player.hp<=0)return '';
    const notes=[];
    if((player.db0511BurnStacks||0)>0){const stacks=Math.min(10,player.db0511BurnStacks),raw=Math.max(1,Math.ceil(player.maxHp*.01*stacks)),hit=db0511PlayerElementDamage(raw);notes.push(`🔥 Burn ${stacks}/10 scorches you for ${hit.total} (${stacks}% max HP).`);}
    if((player.db0511PoisonStacks||0)>0){const stacks=player.db0511PoisonStacks,raw=Math.max(1,Math.round(Math.max(1,player.maxHp*.025)*(player.db0511PoisonPower||.12)*stacks)),hit=db0511PlayerElementDamage(raw);notes.push(`☠️ Poison ${stacks} deals ${hit.total} damage.`);}
    notes.forEach(addCombatHistory);return notes.join(' ');
  }

  const db0511ResolveEnemyResponseBase=resolveEnemyResponse;
  resolveEnemyResponse=async function(guarded=false,extraGuardPower=0){
    const status=db0511TickPlayerElementStatuses();
    if(player.hp<=0){if(status)setCombatText(status);updateCombatUI();return handlePlayerDeath();}
    return db0511ResolveEnemyResponseBase(guarded,extraGuardPower);
  };

  const db0511EnemyTurnBase=enemyTurn;
  enemyTurn=async function(guarded=false,extraGuardPower=0){
    const result=await db0511EnemyTurnBase(guarded,extraGuardPower);
    if(!player._db0511SkipAction||player.hp<=0||!livingEnemies().length)return result;
    const reason=player._db0511SkipAction;player._db0511SkipAction='';
    player._db0511SuppressControlProc=true;combatBusy=true;
    setCombatText(`${reason}. You lose this action and the enemy pack acts again.`);updateCombatUI();await delay(620);
    try{return await db0511EnemyTurnBase(false,0);}finally{player._db0511SuppressControlProc=false;player._db0511SkipAction='';}
  };

  function db0511RestoreEnemyElementDebuffs(){
    if(player.db0511TechAttackLost){player.attack+=player.db0511TechAttackLost;player.db0511TechAttackLost=0;}
    restoreRadiationDefenseV16?.();
    player.db0511BurnStacks=0;player.db0511PoisonStacks=0;player.db0511PoisonPower=0;player._db0511SkipAction='';player._db0511SuppressControlProc=false;
  }
  const db0511StartCombatBase=startCombat;
  startCombat=function(...args){db0511RestoreEnemyElementDebuffs();const r=db0511StartCombatBase.apply(this,args);player.db0511BurnStacks=0;player.db0511PoisonStacks=0;player.db0511PoisonPower=0;return r;};
  const db0511WinCombatBase=winCombat;
  winCombat=async function(...args){const r=await db0511WinCombatBase.apply(this,args);db0511RestoreEnemyElementDebuffs();return r;};
  const db0511HandleDeathBase=handlePlayerDeath;
  handlePlayerDeath=function(...args){const r=db0511HandleDeathBase.apply(this,args);if(player.hp<=0)db0511RestoreEnemyElementDebuffs();return r;};

  const db0511UpdateCombatUIBase=updateCombatUI;
  updateCombatUI=function(){
    const r=db0511UpdateCombatUIBase();const host=$('playerStatusDots');if(host){
      if((player.db0511BurnStacks||0)>0)host.insertAdjacentHTML('beforeend',`<span class="db0511-player-status" title="Burn: 1% max HP per stack each action">🔥×${player.db0511BurnStacks}</span>`);
      if((player.db0511PoisonStacks||0)>0)host.insertAdjacentHTML('beforeend',`<span class="db0511-player-status" title="Enemy Poison">☠️×${player.db0511PoisonStacks}</span>`);
      if(player._db0511SkipAction)host.insertAdjacentHTML('beforeend',`<span class="db0511-player-status">${player._db0511SkipAction.startsWith('❄️')?'❄️ FROZEN':'⚡ STUNNED'}</span>`);
    }return r;
  };

  // Small exposed checks for future regression work.
  window.DiceboundBeta0511Test=Object.freeze({
    frogThreshold:()=>({requiredEcho:1.5,unlocked:!!meta.unlocks?.frog,currentEcho:player.doubleStrike||0}),
    arcaneLanceEchoBonus:()=>Math.max(0,player.doubleStrike||0)*.5,
    alchemistPotions:()=>({used:meta.stats?.potionsUsed||0,required:15,unlocked:!!meta.unlocks?.alchemist}),
    glassNeedleArt:()=>({path:db0511GlassNeedleArt,rendered:choiceHTML(upgrades.find(u=>u?.name==='Glass Needle')||{rarity:'rare',icon:'',name:'Glass Needle',desc:'',tags:[]}).includes('glass-needle')})
  });

  /* ========================================================================
     Beta 0.5.12 — campsite placement + achievement powerup progression
     ======================================================================== */

  // ACHIEVEMENT GATES — 0.5.12 expands the long-term reward pool. Existing
  // saves unlock these immediately if the corresponding achievement is already
  // complete; no progress is reset or re-earned.
  const db0512GlobalPowerGates=Object.freeze({
    toxic_bloom:'nature-master',
    elemental_predator:'road3',
    mana_overflow:'prestige5',
    true_legend_attack_v24:'road4',
    true_legend_guard_v24:'road5',
    legendary_star_eater_v27:'prestige20',
    legendary_venom_throne_v27:'nature-master',
    legendary_kings_ransom_v27:'gold4000',
    legendary_prismatic_choir_v27:'mythic5',
    legendary_echo_crown:'legendary3',
    legendary_blood_contract:'blood-well',
    legendary_loaded_road:'double-dice',
    legendary_packbreaker:'menagerie',
    legendary_second_sun:'hell-gate',
    perfected_signature:'road3'
  });

  const db0512GateRewards={};
  function db0512RememberReward(achievementId,up){
    if(!achievementId||!up)return;
    (db0512GateRewards[achievementId]??=[]).push(up.id);
  }
  Object.entries(db0512GlobalPowerGates).forEach(([id,achievementId])=>{
    const up=upgrades.find(u=>u.id===id);if(!up)return;
    up.achievementGate=`achievement:${achievementId}`;
    db0512RememberReward(achievementId,up);
  });

  // One additional Epic per class is earned by clearing Board 2 with that
  // class; if a class has a second ungated Legendary, that becomes a Board 5
  // mastery reward. v19 already owns the Board 3 Epic / Board 4 Legendary pair.
  const db0512ClassMastery={};
  Object.keys(CLASSES).forEach(id=>{
    const owned=upgrades.filter(u=>u.classId===id||(u.classIds||[]).includes(id));
    const epic=owned.filter(u=>u.rarity==='epic'&&!u.achievementGate).slice(-1)[0];
    if(epic){epic.achievementGate=`class_b2:${id}`;(db0512ClassMastery[id]??=[]).push({board:2,id:epic.id});}
    const legendary=owned.filter(u=>u.rarity==='legendary'&&!u.achievementGate).slice(-1)[0];
    if(legendary){legendary.achievementGate=`class_b5:${id}`;(db0512ClassMastery[id]??=[]).push({board:5,id:legendary.id});}
  });

  const db0512AchievementGateBase=achievementGateUnlocked;
  achievementGateUnlocked=function(gate){
    if(typeof gate==='string'&&gate.startsWith('achievement:')){
      const id=gate.slice('achievement:'.length),a=ACHIEVEMENT_REGISTRY.find(x=>x.id===id);
      return !!a&&db317AchievementDone(a);
    }
    if(typeof gate==='string'&&gate.startsWith('class_b2:'))return hasBoardClear(gate.slice(9),2);
    if(typeof gate==='string'&&gate.startsWith('class_b5:'))return hasBoardClear(gate.slice(9),5);
    return db0512AchievementGateBase(gate);
  };

  // Achievement completion state also controls the newly-gated powerups.
  const db0512AchievementRewardBase=db317AchievementRewardText;
  db317AchievementRewardText=function(a){
    const base=db0512AchievementRewardBase(a),ids=db0512GateRewards[a?.id]||[];
    const names=ids.map(id=>upgrades.find(u=>u.id===id)?.name).filter(Boolean).filter(name=>!base.includes(name));
    if(!names.length)return base;
    return `${base}${base?' · also':' ·'} unlocks ${names.join(', ')}`;
  };

  window.DiceboundBeta0512Test=Object.freeze({
    globalGates:()=>Object.entries(db0512GlobalPowerGates).map(([id,a])=>({id,name:upgrades.find(u=>u.id===id)?.name,achievement:a,unlocked:achievementGateUnlocked(`achievement:${a}`)})),
    classGates:()=>JSON.parse(JSON.stringify(db0512ClassMastery)),
    eligibleLegendaryCount:()=>eligibleUpgrades(u=>u.rarity==='legendary').length,
    eligibleEpicCount:()=>eligibleUpgrades(u=>u.rarity==='epic').length
  });

  /* ========================================================================
     Alpha v3.1.7 — infrastructure boundary: platform / storage / save schema
     ======================================================================== */
  document.title='Dicebound: Beta v0.5.12';
  const db314Brand=document.querySelector('.brand h1');if(db314Brand)db314Brand.textContent='Dicebound: Beta v0.5.12';
  const db0410BrandSub=document.querySelector('.brand p');if(db0410BrandSub)db0410BrandSub.textContent='Beta v0.5.12 · campsite placement and expanded achievement-gated Epic/Legendary progression.';
  window.DiceboundInfrastructure=Object.freeze({
    version:APP_IDENTITY.version,
    channel:APP_IDENTITY.channel,
    platform:()=>window.DiceboundPlatform?.runtimeInfo?.(),
    storage:()=>window.DiceboundStorage?.diagnostics?.(),
    save:()=>window.DiceboundSave?.diagnostics?.(),
    wrapper:()=>window.DiceboundPlatform?.wrapperDiagnostics?.(),
    load:()=>window.__DiceboundSaveLoadResult||null
  });


  /* ========================================================================
     Beta 0.6 — gear rarity, Legendary effects and explicit guardian loot tables
     ======================================================================== */

  // VERSION -----------------------------------------------------------------
  document.title=APP_IDENTITY.displayTitle;
  const db060Brand=document.querySelector('.brand h1');if(db060Brand)db060Brand.textContent=APP_IDENTITY.displayTitle;
  const db060Sub=document.querySelector('.brand p');if(db060Sub)db060Sub.textContent=APP_IDENTITY.subtitle;

  // 0.5.13 integration repair ------------------------------------------------
  // The original 0.5.13 handoff appended these bindings outside the runtime
  // closure. Keep the art/assets, but bind them here where the live combat and
  // camp owners actually exist.
  const db060GuardianArt=id=>DB317_GUARDIANS.resolveById(id)?.art||window.DiceboundAssets.resolveGuardianArt(id)||null;
  const db060EnemyPortraitBase=enemyPortraitSVG;
  enemyPortraitSVG=function(enemy){
    const src=db060GuardianArt(enemy?.id)?.battle;
    if(src)return `<img class="enemy-art-frame enemy-art-image db060-guardian-art" src="${src}" alt="${enemy?.name||'Guardian'}" draggable="false">`;
    return db060EnemyPortraitBase(enemy);
  };
  function db060GuardianTileArt(id,alt='Guardian'){
    const src=db060GuardianArt(id)?.boardMarker;
    return src?`<img class="db060-guardian-tile-art" src="${src}" alt="${alt}" draggable="false">`:'';
  }
  const db060TileMetaBase=tileMeta;
  tileMeta=function(tile){
    if(tile?.type==='miniboss'&&tile.enemyBase?.id&&db060GuardianArt(tile.enemyBase.id))return [db060GuardianTileArt(tile.enemyBase.id,tile.enemyBase.name),'Mini Boss · 1 enemy'];
    if(tile?.type==='boss'){
      const boss=DB317_GUARDIANS.resolveFinal(boardLevel);
      if(boss?.id&&boss.art?.boardMarker)return [db060GuardianTileArt(boss.id,boss.name),'Final Boss · 1 enemy'];
    }
    return db060TileMetaBase(tile);
  };

  const db060GuardianArtStyle=document.createElement('style');
  db060GuardianArtStyle.id='dicebound-beta-0-6-guardian-art-style';
  db060GuardianArtStyle.textContent=`
    .db060-guardian-tile-art{display:block;width:42px;height:42px;object-fit:cover;object-position:center;border-radius:10px;box-shadow:0 5px 14px rgba(0,0,0,.42)}
    .db060-guardian-art{object-fit:cover!important;object-position:center!important}
  `;
  document.head.appendChild(db060GuardianArtStyle);

  // RARITY BODY -------------------------------------------------------------
  // Exact 0.6 item-power ranges. Road depth now improves rarity odds rather
  // than pushing a generated item beyond the advertised range.
  Object.keys(V14_RARITY_BUDGETS).forEach(k=>delete V14_RARITY_BUDGETS[k]);
  Object.assign(V14_RARITY_BUDGETS,{poor:[11,25],common:[26,45],uncommon:[46,70],rare:[71,105],epic:[106,150],legendary:[151,210]});
  Object.keys(V14_RARITY_AFFIX_TIER).forEach(k=>delete V14_RARITY_AFFIX_TIER[k]);
  Object.assign(V14_RARITY_AFFIX_TIER,{poor:1,common:2,uncommon:3,rare:4,epic:5,legendary:5});
  Object.assign(rarityInfo,{legendary:{label:'Legendary',weight:.028},mythical:{label:'Mythical',weight:0}});
  Object.assign(rarityValues,{legendary:7,mythical:11});

  // New seed parser accepts the full generated ladder including Legendary.
  const db060SeedParserBase=v15ParseSeedCode;
  v15ParseSeedCode=function(code){
    const m=String(code||'').trim().match(/^D15\|(poor|common|uncommon|rare|epic|legendary)\|(weapon|offhand|boots|legs|chest|hat|ring|amulet)\|([a-z0-9_]+)\|q(\d+)\|([a-z0-9_-]+)$/i);
    if(!m)return db060SeedParserBase(code);
    return {rarity:m[1].toLowerCase(),slot:m[2].toLowerCase(),classId:v15SafeClassId(m[3].toLowerCase()),qualityBoost:clamp(Number(m[4])||0,0,8),core:m[5]};
  };

  const DB060_LEGENDARY_EFFECTS=Object.freeze([
    Object.freeze({id:'twin_surge',name:'Twin Surge',icon:'⚡⚡',classes:['sorcerer'],desc:'Arcane Surge hits twice. Each hit deals 70% of the normal Surge hit.'}),
    Object.freeze({id:'sword_and_shield',name:'Sword and Shield',icon:'⚔️🛡️',desc:'Powerups that increase Attack also grant the same Defense; Defense increases also grant the same Attack.'}),
    Object.freeze({id:'perfect_specimen',name:'Perfect Specimen',icon:'♾️💪',classes:['ouroboros'],desc:'Ouroboros stabilizes at 30 Attack instead of 10 before excess Attack converts into Echo.'}),
    Object.freeze({id:'echo_chamber',name:'Echo Chamber',icon:'🎯➡️🔁',desc:'During attacks, all Crit chance is converted one-for-one into Echo Strike chance.'}),
    Object.freeze({id:'critical_feedback',name:'Critical Feedback',icon:'💥🔋',desc:'Every critical Echo Strike grants 8 Ultimate charge.'}),
    Object.freeze({id:'blood_price',name:'Blood Price',icon:'🩸📈',classes:['bloodmage'],desc:'Exsanguinate deals 15% more damage and permanently builds +8% all damage for the rest of that battle.'}),
    Object.freeze({id:'glass_fortress',name:'Glass Fortress',icon:'🏰🪟',desc:'Defense counts double against incoming damage, but maximum HP is reduced by 30% while equipped.'}),
    Object.freeze({id:'second_barrel',name:'Second Barrel',icon:'🔫🔫',desc:'Gun elemental procs fire a second shot at 65% elemental power.'}),
    Object.freeze({id:'elemental_roulette',name:'Elemental Roulette',icon:'🎰🌈',desc:'Every non-Echo basic strike guarantees one random elemental proc.'}),
    Object.freeze({id:'prismatic_weapon',name:'Prismatic Weapon',icon:'🌈⚔️',desc:'Whenever your weapon element activates, all six DiBo core elements also erupt at 40% power.'}),
    Object.freeze({id:'loaded_sixes',name:'Loaded Sixes',icon:'🎲6️⃣',desc:'A movement roll totaling exactly 6 gains +6 additional movement.'}),
    Object.freeze({id:'last_stand',name:'Last Stand',icon:'❤️‍🔥🛡️',desc:'Once per battle, lethal damage instead leaves you at 25% HP and raises 3 Barriers.'}),
    Object.freeze({id:'vampires_bargain',name:"Vampire's Bargain",icon:'🧛📜',desc:'Lifesteal above 100% becomes an equal bonus to strike damage.'}),
    Object.freeze({id:'iron_echo',name:'Iron Echo',icon:'🔁🛡️',desc:'Every damaging Echo grants +1 Defense for the rest of the battle.'}),
    Object.freeze({id:'recursive_poison',name:'Recursive Poison',icon:'☠️♻️',desc:'After Poison ticks, every surviving poisoned enemy has a 35% chance to gain another Poison stack.'}),
    Object.freeze({id:'perfect_guard',name:'Perfect Guard',icon:'🛡️🔁',desc:'Guard counter damage can Echo using your Echo Strike chance.'}),
    Object.freeze({id:'hoarders_arsenal',name:"Hoarder's Arsenal",icon:'💰⚔️',desc:'Every 500 gold adds +1 damage to every basic and Echo strike, regardless of class.'}),
    Object.freeze({id:'unstable_ultimate',name:'Unstable Ultimate',icon:'💥70',desc:'Ultimates can be used at 70 charge, but deal 75% normal damage.'}),
    Object.freeze({id:'pet_mirror',name:'Pet Mirror',icon:'🐾🪞',desc:'After your companion attacks, it has a 25% chance to repeat your most recent elemental proc at 65% power.'}),
    Object.freeze({id:'reverse_engineering',name:'Reverse Engineering',icon:'⚙️↔️',desc:'All Attack and Defense granted by equipped gear swap places while this item is equipped.'})
  ]);
  const DB060_EFFECT_BY_ID=Object.freeze(Object.fromEntries(DB060_LEGENDARY_EFFECTS.map(e=>[e.id,e])));
  function db060HasEffect(id){return Object.values(player.equipment||{}).some(item=>item?.legendaryEffectId===id);}
  function db060EligibleEffects(){const id=classIdentityId();return DB060_LEGENDARY_EFFECTS.filter(e=>!e.classes||e.classes.includes(id));}
  meta.legendaryEffectsDiscovered=Array.isArray(meta.legendaryEffectsDiscovered)?meta.legendaryEffectsDiscovered:[];
  function db060ChooseEffect(preferUndiscovered=false){
    let pool=db060EligibleEffects();
    if(preferUndiscovered){const unseen=pool.filter(e=>!meta.legendaryEffectsDiscovered.includes(e.id));if(unseen.length)pool=unseen;}
    return pick(pool.length?pool:DB060_LEGENDARY_EFFECTS);
  }
  function db060AttachLegendaryEffect(item,effect=null){
    if(!item)return item;const e=effect||db060ChooseEffect(false);item.rarity='legendary';item.legendaryGenerated=true;item.legendaryEffectId=e.id;item.legendaryEffectName=e.name;item.legendaryEffectDesc=e.desc;item.uniqueEffect=`${e.icon} ${e.name}: ${e.desc}`;item.v24Rarity=true;return item;
  }
  function db060RawGeneratedGear(rarity,forcedSlot=null){
    return window.DiceboundEquipment.generateOrdinaryItem({rarity,forcedSlot,slots:EQUIPMENT_SLOTS,pick,random,classId:player.classId,seedCode:v15SeedCode,generateFromSeedCode:v15GenerateEquipmentFromSeedCode,rarityBudgets:V14_RARITY_BUDGETS,clamp});
  }
  function db060GenerateLegendary(forcedSlot=null,preferUndiscovered=false){
    let item=db060RawGeneratedGear('legendary',forcedSlot);if(!item){item=db060RawGeneratedGear('epic',forcedSlot);if(item)item.rarity='legendary';}
    return db060AttachLegendaryEffect(item,db060ChooseEffect(preferUndiscovered));
  }
  const db060GenerateEquipmentFallback=generateEquipment;
  generateEquipment=function(forceRarity=null,forcedSlot=null){
    const rarity=forceRarity||rollGearRarity(0);
    if(rarity==='legendary')return db060GenerateLegendary(forcedSlot,false);
    if(['poor','common','uncommon','rare','epic'].includes(rarity))return db060RawGeneratedGear(rarity,forcedSlot)||db060GenerateEquipmentFallback(rarity,forcedSlot);
    return db060GenerateEquipmentFallback(forceRarity,forcedSlot);
  };

  // Generated Legendary effects count as real item value in comparisons.
  const db060GearScoreBase=gearPowerScore;
  gearPowerScore=function(item){return db060GearScoreBase(item)+(item?.legendaryEffectId?180:0);};
  const db060FormatBonusesBase=formatBonuses;
  formatBonuses=function(item){const base=db060FormatBonusesBase(item);if(!item?.legendaryEffectId)return base;const e=DB060_EFFECT_BY_ID[item.legendaryEffectId];return `${base} · LEGENDARY EFFECT: ${e?.name||item.legendaryEffectName} — ${e?.desc||item.legendaryEffectDesc||''}`;};

  // CURRENT NAMED LEGENDARIES -> MYTHICAL ----------------------------------
  const db060NamedMythicals=new Set(["Axel's Coffee Mug",'Kratz Headphones',"The Jean Jacket Lost at Kelly's"]);
  function db060MythicalizeNamed(item){if(!item||!db060NamedMythicals.has(item.name))return item;item.rarity='mythical';item.specialMythical=true;item.specialLegendary=true;item.v24Rarity=true;return item;}
  const db060MugBase=generateAxelsCoffeeMug,db060HeadphonesBase=generateKratzHeadphones,db060JacketBase=generateKellysJeanJacket;
  generateAxelsCoffeeMug=function(){return db060MythicalizeNamed(db060MugBase());};
  generateKratzHeadphones=function(){return db060MythicalizeNamed(db060HeadphonesBase());};
  generateKellysJeanJacket=function(){return db060MythicalizeNamed(db060JacketBase());};
  V24_LEGENDARY_RELICS.splice(0,V24_LEGENDARY_RELICS.length,generateAxelsCoffeeMug,generateKratzHeadphones,generateKellysJeanJacket);
  let db060MigratedNamed=false;
  for(const list of [meta.heirlooms||[],meta.heirloomStorage||[]])for(const item of list)if(db060NamedMythicals.has(item?.name)&&item.rarity!=='mythical'){db060MythicalizeNamed(item);db060MigratedNamed=true;}
  for(const item of Object.values(player.equipment||{}))if(db060NamedMythicals.has(item?.name)&&item.rarity!=='mythical'){db060MythicalizeNamed(item);db060MigratedNamed=true;}
  if(db060MigratedNamed)saveMeta();

  // MEMORY CACHE ------------------------------------------------------------
  // Board 4+ Treasure: Normal 1/450, Nightmare 1/300, Hell 1/200.
  function db060MemoryCacheChance(){return hellMode?1/200:nightmareMode?1/300:1/450;}
  // Bypass the retired v24 Memory Cache wrapper; otherwise a failed 0.6 cache roll
  // could still fall through into the old named-Legendary cache roll.
  const db060OpenTreasureBase=openTreasureV24Base;
  openTreasure=function(){
    if(boardLevel>=4&&random()<db060MemoryCacheChance()){
      const item=db060GenerateLegendary(null,true);if(tiles[player.position]){tiles[player.position].cleared=true;tiles[player.position].type='empty';refreshTile(player.position);}addLog(`<b>MEMORY CACHE.</b> The chest remembers a version of this road where ${item.icon} <b>${item.name}</b> was Legendary.`);showToast('🌟 MEMORY CACHE · Legendary gear',3200,true);return openLoot(item,()=>returnToRoad());
    }
    return db060OpenTreasureBase();
  };
  // ARTIFACT LOOT TABLE -----------------------------------------------------
  // One Artifact roll per guardian. A successful roll chooses EXACTLY ONE
  // weighted set piece from this table; independent slot rolls are retired.
  const DB060_ARTIFACT_TABLE=window.DiceboundArtifacts?.entries;
  if(!DB060_ARTIFACT_TABLE)throw new Error('DiceboundArtifacts must load before dicebound.js');
  const DB060_LOOT=window.DiceboundLoot;
  if(!DB060_LOOT)throw new Error('DiceboundLoot must load before dicebound.js');
  const DB060_ARTIFACT_FACTORIES=Object.freeze({
    weapon:()=>generateMythicalWeapon(),
    boots:()=>generateMythicalBoots(),
    legs:()=>generateMythicalPants(),
    ring:()=>generateMythicalRing(),
    hat:()=>generateMythicalHat(),
    amulet:()=>generateMythicalAmulet(),
    offhand:()=>generateMythicalOffhand()
  });
  function db060RollArtifact(){const entry=window.DiceboundArtifacts.pick(random),make=DB060_ARTIFACT_FACTORIES[entry.slot];if(typeof make!=='function')throw new Error(`No Artifact item factory registered for ${entry.slot}`);const item=make();item.artifactTableSlot=entry.slot;return item;}

  // Guardian ordinary item tables. Miniboss ordinary gear is no longer a
  // 100% automatic reward on Normal: 85% Normal, 92% Nightmare, 100% Hell.
  function db060GuardianOrdinary(defeated,done){
    const drop=DB060_LOOT.ordinaryGuardianDrop({defeated,board:boardLevel,nightmare:nightmareMode,hell:hellMode,randomFn:random});
    if(!drop)return done();
    // Secret bosses keep one ordinary loot roll in addition to their signature item.
    return openLoot(drop.rarity?generateEquipment(drop.rarity):generateEquipment(),done);
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
  const db060EquipItemBase=equipItem;
  equipItem=function(item,silent=false){db060ClearGearTransform();const r=db060EquipItemBase(item,silent);db060ApplyGearTransform();renderEquipment();updateHUD();return r;};
  const db060ResetPlayerBase=resetPlayer;
  resetPlayer=function(classId=selectedClassId){const r=db060ResetPlayerBase(classId);player._db060GearSwapAttackAdj=0;player._db060GearSwapDefenseAdj=0;player._db060GlassHpPenalty=0;player._db060IronEchoDefense=0;player._db060BloodPriceStacks=0;player._db060LastStandUsed=false;player._db060LastElement=null;db060ApplyGearTransform();return r;};

  // Attack/Defense powerup cross-feed.
  const db060ApplyUpgradeBase=applyUpgrade;
  applyUpgrade=function(up,source){const active=db060HasEffect('sword_and_shield'),a0=player.attack,d0=player.defense,r=db060ApplyUpgradeBase(up,source);if(active){const a=Math.max(0,player.attack-a0),d=Math.max(0,player.defense-d0);if(a>0)player.defense+=a;if(d>0)player.attack+=d;if(a||d){addLog(`<b>⚔️🛡️ Sword and Shield:</b> converts the upgrade into +${d} Attack and +${a} Defense.`);showToast('⚔️🛡️ Sword and Shield');}}return r;};

  // Ouroboros base-30 identity.
  const db060OuroSyncBase=v18SyncOuroborosAttack;
  v18SyncOuroborosAttack=function(){if(!classIdentityActive('ouroboros')||!db060HasEffect('perfect_specimen'))return db060OuroSyncBase();const delta=(Number(player.attack)||0)-30;if(delta>0){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=30;}else if(player.attack<30)player.attack=30;};

  // Strike-level effects.
  const db060StrikeBaseDamageBase=strikeBaseDamage;
  strikeBaseDamage=function(echo=false,chaos=null){
    const r=db060StrikeBaseDamageBase(echo,chaos);
    if(db060HasEffect('twin_surge')&&classIdentityActive('sorcerer')&&String(r.burst||'').includes('Arcane Surge')){r.damage=Math.max(1,Math.round(r.damage*.70));r.burst='Twin Arcane Surge! ';r.db060TwinSurge=true;}
    if(db060HasEffect('vampires_bargain')&&(player.lifeSteal||0)>1)r.damage=Math.max(1,Math.round(r.damage*(1+((player.lifeSteal||0)-1))));
    if(db060HasEffect('hoarders_arsenal'))r.damage+=Math.floor(Math.max(0,player.gold||0)/500);
    return r;
  };
  // Echo Chamber must be active before playerAttack rolls Echo count.  Doing
  // the conversion only inside performStrike is too late for that roll.
  const db060PlayerAttackBase=playerAttack;
  playerAttack=async function(...args){
    if(!db060HasEffect('echo_chamber'))return db060PlayerAttackBase.apply(this,args);
    const savedCrit=player.crit,savedEcho=player.doubleStrike;
    player.crit=0;player.doubleStrike=savedEcho+savedCrit;player._db060EchoChamberActive=true;
    try{return await db060PlayerAttackBase.apply(this,args);}
    finally{player.crit=savedCrit;player.doubleStrike=savedEcho;player._db060EchoChamberActive=false;}
  };
  const db060PerformStrikeBase=performStrike;
  performStrike=async function(target,opts={}){
    const useEchoChamber=db060HasEffect('echo_chamber')&&!player._db060EchoChamberActive,savedCrit=player.crit,savedEcho=player.doubleStrike;
    if(useEchoChamber){player.crit=0;player.doubleStrike=savedEcho+savedCrit;}
    let r;try{r=await db060PerformStrikeBase(target,opts);}finally{if(useEchoChamber){player.crit=savedCrit;player.doubleStrike=savedEcho;}}
    if(!r)return r;
    if(db060HasEffect('twin_surge')&&String(r.burst||'').includes('Twin Arcane Surge')&&target?.hp>0){const second=damageEnemy(target,Math.max(1,r.dealt||1),true);r.dealt+=second;addCombatHistory(`⚡⚡ Twin Surge repeats Arcane Surge for ${second} damage.`);updateCombatUI();await delay(160);}
    if(db060HasEffect('critical_feedback')&&opts.echo&&r.critTiers>0){chargeUltimate(8);addCombatHistory('💥🔋 Critical Feedback grants 8 Ultimate.');}
    if(db060HasEffect('iron_echo')&&opts.echo&&(r.dealt||0)>0){player.defense+=1;player._db060IronEchoDefense=(player._db060IronEchoDefense||0)+1;addCombatHistory(`🔁🛡️ Iron Echo grants +1 Defense (${player._db060IronEchoDefense} this battle).`);}
    if(db060HasEffect('elemental_roulette')&&!opts.echo&&livingEnemies().length){const t=target?.hp>0?target:livingEnemies()[0],key=pick(ELEMENT_KEYS);triggerElementEffect(key,t,{forced:true,source:'Elemental Roulette'});}
    return r;
  };

  // Weapon-proc effects and Pet Mirror element memory.
  const db060TriggerElementBase=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const oldBonus=player.elementDamageBonus||0,r=db060TriggerElementBase(key,target,opts);if(r)player._db060LastElement=key;
    if(r&&key==='gun'&&db060HasEffect('second_barrel')&&!player._db060SecondBarrel){player._db060SecondBarrel=true;try{player.elementDamageBonus=(1+oldBonus)*.65-1;const extra=db060TriggerElementBase('gun',target?.hp>0?target:(livingEnemies()[0]||target),{forced:true,source:'Second Barrel'});if(extra)r.totalDamage=(r.totalDamage||0)+(extra.totalDamage||0);}finally{player.elementDamageBonus=oldBonus;player._db060SecondBarrel=false;}}
    return r;
  };
  const db060TriggerWeaponBase=triggerWeaponElement;
  triggerWeaponElement=function(target=currentEnemy){const r=db060TriggerWeaponBase(target);if(r&&db060HasEffect('prismatic_weapon')&&!player._db060PrismaticWeapon){player._db060PrismaticWeapon=true;const old=player.elementDamageBonus||0;try{player.elementDamageBonus=(1+old)*.40-1;for(const key of DIBO_ELEMENTS){const t=target?.hp>0?target:(livingEnemies()[0]||target);if(!t)break;triggerElementEffect(key,t,{forced:true,source:'Prismatic Weapon'});}}finally{player.elementDamageBonus=old;player._db060PrismaticWeapon=false;}}return r;};

  // Poison recursion.
  const db060PoisonTickBase=applyPoisonTick;
  applyPoisonTick=function(){const r=db060PoisonTickBase();if(db060HasEffect('recursive_poison'))for(const e of livingEnemies())if((e.poisonStacks||0)>0&&random()<.35){e.poisonStacks++;addCombatHistory(`☠️♻️ Recursive Poison adds a stack to ${e.name}.`);}return r;};

  // Guard Echo.
  const db060GuardActionBase=guardAction;
  guardAction=async function(){if(!db060HasEffect('perfect_guard')||!(player.guardCounter>0))return db060GuardActionBase();const old=player.guardCounter,echoes=rollTieredProc(player.doubleStrike||0);player.guardCounter=old*(1+echoes*.70);try{if(echoes)addCombatHistory(`🛡️🔁 Perfect Guard rolls ${echoes} counter Echo${echoes===1?'':'es'}.`);return await db060GuardActionBase();}finally{player.guardCounter=old;}};

  // Blood Price.
  const db060BloodmageBase=bloodmageExsanguinate;
  bloodmageExsanguinate=async function(){if(!db060HasEffect('blood_price'))return db060BloodmageBase();const old=player.damageBonus||0;player.damageBonus=old+.15;try{return await db060BloodmageBase();}finally{player.damageBonus=(player.damageBonus||0)-.15;player.damageBonus+=.08;player._db060BloodPriceStacks=(player._db060BloodPriceStacks||0)+1;addCombatHistory(`🩸📈 Blood Price: +8% battle damage (${player._db060BloodPriceStacks} stack${player._db060BloodPriceStacks===1?'':'s'}).`);}};

  // Defense doubling during actual incoming attacks.
  const db060EnemyTurnBase=enemyTurn;
  enemyTurn=async function(...args){if(!db060HasEffect('glass_fortress'))return db060EnemyTurnBase(...args);const old=player.defense;player.defense=old*2;try{return await db060EnemyTurnBase(...args);}finally{player.defense=old;}};

  // Unstable Ultimate: 70 charge threshold, 75% damage.
  const db060UseUltimateBase=useUltimate;
  useUltimate=async function(){if(!db060HasEffect('unstable_ultimate'))return db060UseUltimateBase();if(combatBusy||!currentEnemy||player.ultimateCharge<70)return;const actual=player.ultimateCharge,oldBonus=player.classUltimateBonus||0;player.ultimateCharge=100;player.classUltimateBonus=oldBonus-.25;try{return await db060UseUltimateBase();}finally{player.classUltimateBonus=oldBonus;player.ultimateCharge=Math.max(0,player.ultimateCharge);}};
  const db060UpdateCombatUIBase=updateCombatUI;
  updateCombatUI=function(){const r=db060UpdateCombatUIBase();if(db060HasEffect('unstable_ultimate')){const b=$('ultimateBtn');if(b){b.disabled=combatBusy||!currentEnemy||player.ultimateCharge<70;b.dataset.tip=`Unstable Ultimate: usable at 70 charge for 75% normal damage. Current charge: ${Math.round(player.ultimateCharge)}.`;}}return r;};

  // Pet Mirror.
  const db060PetTurnBase=petTurn;
  petTurn=async function(...args){const r=await db060PetTurnBase(...args);if(db060HasEffect('pet_mirror')&&player._db060LastElement&&livingEnemies().length&&random()<.25){const old=player.elementDamageBonus||0;try{player.elementDamageBonus=(1+old)*.65-1;triggerElementEffect(player._db060LastElement,livingEnemies()[0],{forced:true,source:'Pet Mirror'});addCombatHistory(`🐾🪞 Pet Mirror repeats ${ELEMENTS[player._db060LastElement]?.name||player._db060LastElement}.`);}finally{player.elementDamageBonus=old;}}return r;};

  // Battle-lifetime Legendary state cleanup + Last Stand.
  function db060ClearBattleLegendaryTemps(){if(player._db060IronEchoDefense){player.defense=Math.max(0,player.defense-player._db060IronEchoDefense);player._db060IronEchoDefense=0;}if(player._db060BloodPriceStacks){player.damageBonus=Math.max(0,(player.damageBonus||0)-player._db060BloodPriceStacks*.08);player._db060BloodPriceStacks=0;}player._db060LastStandUsed=false;}
  const db060StartCombatBase=startCombat;
  startCombat=function(...args){db060ClearBattleLegendaryTemps();player._db060LastElement=null;return db060StartCombatBase(...args);};
  const db060HandleDeathBase=handlePlayerDeath;
  handlePlayerDeath=function(...args){if(player.hp<=0&&db060HasEffect('last_stand')&&!player._db060LastStandUsed){player._db060LastStandUsed=true;player.hp=Math.max(1,Math.ceil(player.maxHp*.25));player.combatShield=(player.combatShield||0)+3;combatBusy=false;addCombatHistory('❤️‍🔥🛡️ Last Stand refuses death: 25% HP and 3 Barriers.');showToast('❤️‍🔥 LAST STAND',2400,true);updateCombatUI();return;}return db060HandleDeathBase(...args);};
  const db060WinCombatBase=winCombat;
  winCombat=async function(...args){const r=await db060WinCombatBase(...args);db060ClearBattleLegendaryTemps();return r;};

  // Board 6 miniboss cookie correction. The mature victory owner still uses
  // the explicit sequence 1/3/5/7/8, so patch its live 6th-road fallback by
  // topping it up from 1 to 10 after the reward is resolved.
  // (The literal formula is also replaced in the source packaging script.)

  // GUIDE / DEBUG -----------------------------------------------------------
  window.DiceboundBeta06Test=Object.freeze({
    budgets:()=>JSON.parse(JSON.stringify(V14_RARITY_BUDGETS)),
    legendaryEffects:()=>DB060_LEGENDARY_EFFECTS.map(e=>({id:e.id,name:e.name,classes:e.classes||null,desc:e.desc})),
    generatedLegendary:()=>{const x=db060GenerateLegendary(null,false);return {name:x.name,slot:x.slot,rarity:x.rarity,itemPower:x.itemPower,effect:x.legendaryEffectName,seed:x.seedCode};},
    memoryCacheOdds:()=>({normal:1/450,nightmare:1/300,hell:1/200}),
    artifactTable:()=>DB060_ARTIFACT_TABLE.map(x=>({slot:x.slot,weight:x.weight,label:x.label})),
    artifactRates:()=>JSON.parse(JSON.stringify(DB060_LOOT.artifactRates)),
    minibossGearChance:()=>JSON.parse(JSON.stringify(DB060_LOOT.minibossGearChances)),
    secretSignatureRates:()=>JSON.parse(JSON.stringify(DB060_LOOT.secretSignatureRates)),
    namedMythicals:()=>[generateAxelsCoffeeMug(),generateKratzHeadphones(),generateKellysJeanJacket()].map(x=>({name:x.name,rarity:x.rarity,slot:x.slot})),
    artifactRollSample:(n=10000)=>{const out={};for(let i=0;i<n;i++){const x=window.DiceboundArtifacts.pick(random);out[x.slot]=(out[x.slot]||0)+1;}return out;}
  });

  /* ACTIVE-RUN CHECKPOINT COMPOSITION -------------------------------------
     The extracted checkpoint service owns validation/storage. This adapter
     owns the final live monolith variables until those state domains move. */
  const DB_RUN_CHECKPOINT=window.DiceboundRunCheckpoint;
  if(!DB_RUN_CHECKPOINT)throw new Error('DiceboundRunCheckpoint must load before dicebound.js');
  const DB_RUN_BLOCKING_OVERLAYS=['combatOverlay','levelOverlay','eventOverlay','wheelOverlay','powerupOverlay','merchantOverlay','blessingOverlay','mysticOverlay','lootOverlay','bloodwellOverlay','gamblerOverlay','diceChoiceOverlay','endOverlay','prestigeHeirloomOverlay','prestigeMoonOverlay'];
  let dbRunCheckpointEpoch=0,dbRunCheckpointTimer=null,dbRunCheckpointRestoring=false,dbRunOwnedSeed=null,dbRunLastResult=DB_RUN_CHECKPOINT.load();
  const dbRunClone=value=>JSON.parse(JSON.stringify(value));
  function dbRunHasBlockingOverlay(){return DB_RUN_BLOCKING_OVERLAYS.some(id=>{const el=$(id);return el&&!el.classList.contains('hidden');})||!$('battleVictory')?.classList.contains('hidden');}
  function dbRunIsStable(){return gameStarted&&!runFinalized&&!rollLocked&&!combatBusy&&!currentEnemy&&pendingLevelUps===0&&!dbRunHasBlockingOverlay();}
  function dbRunSummary(){return {classId:player.classId,className:CLASSES[player.classId]?.name||player.classId,board:boardLevel,tile:Number(player.position||0)+1,level:player.level,gold:player.gold,difficulty:hellMode?'Hell':nightmareMode?'Nightmare':'Normal'};}
  function dbRunSnapshot(){
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
      currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEncounterTurn=0;currentEnemyTile=null;currentMerchantItems=[];currentMysticBuff=null;currentMerchantNotice='';pendingLevelUps=0;pendingLootItem=null;pendingLootCallback=null;pendingPrestige=null;pendingPrestigeKeepIds=new Set();pendingDiceChoiceResolve=null;wheelBusy=false;combatBusy=false;runFinalized=false;v16CombatKind=null;v19CompletingSixth=false;
      window.DiceboundRng.restore(checkpoint.rng);dbRunOwnedSeed=checkpoint.rng.seed;
      gameStarted=true;rollLocked=false;dbRunCloseOverlays();applyRunTheme();buildBoard();
      if($('log'))$('log').innerHTML=String(run.logHtml||'');
      saveMeta();renderEquipment();renderTalents();renderPetCollection();renderClassChoices();updateMetaUI();updateHUD();refreshBoardHighlights();setTimeout(()=>placePawn(false),30);
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
    const style=document.createElement('style');style.id='runResumeStyle';style.textContent=`.run-resume-panel{margin:0 0 14px;padding:12px 14px;border:1px solid rgba(125,211,252,.35);border-radius:14px;background:rgba(5,15,30,.72);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.run-resume-copy{min-width:220px;flex:1}.run-resume-copy strong{display:block;color:#dff6ff;margin-bottom:4px}.run-resume-copy span{color:var(--muted);font-size:11px}.run-resume-actions{display:flex;gap:8px;flex-wrap:wrap}.run-resume-actions button{min-height:42px}`;document.head.appendChild(style);
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

  const dbRunUpdateHudBase=updateHUD;updateHUD=function(...args){const result=dbRunUpdateHudBase.apply(this,args);dbRunScheduleCheckpoint();return result;};
  const dbRunOpenStartBase=openStartScreen;openStartScreen=function(...args){dbRunClearCheckpoint();const result=dbRunOpenStartBase.apply(this,args);dbRunRefreshControls();return result;};
  const dbRunShowEndBase=showEnd;showEnd=function(...args){dbRunClearCheckpoint();return dbRunShowEndBase.apply(this,args);};
  const dbRunCompletePrestigeBase=completePrestige;completePrestige=function(...args){dbRunClearCheckpoint();return dbRunCompletePrestigeBase.apply(this,args);};
  document.addEventListener('click',event=>{const go=event.target?.closest?.('#campGoBtn');if(!go||!DB_RUN_CHECKPOINT.has())return;event.preventDefault();event.stopImmediatePropagation();(async()=>{if(await diceboundConfirm('Starting a new expedition will abandon the saved run. Continue?',{title:'Start a new run?',confirmLabel:'Abandon and start',danger:true})){dbRunLifecycle.startFreshRun({beforeFreshRun:()=>{$('startOverlay')?.classList.add('hidden');document.querySelectorAll('.camp-panel').forEach(panel=>panel.classList.remove('active'));}});}})();},true);
  window.DiceboundRunResumeTest=Object.freeze({isStable:dbRunIsStable,snapshot:dbRunSnapshot,save:dbRunWriteCheckpoint,load:()=>DB_RUN_CHECKPOINT.load(),restore:checkpoint=>dbRunRestore(checkpoint||DB_RUN_CHECKPOINT.load().checkpoint),clear:dbRunClearCheckpoint,state:()=>({gameStarted,rollLocked,combatBusy,boardLevel,position:player.position,player:dbRunClone(player),rng:window.DiceboundRng.snapshot(),summary:dbRunSummary()})});
  // Test-only exercise of the live final-boss path. It deliberately resets the
  // ephemeral test session after each capture; it is never exposed to player UI.
  function dbGuardianIdentityExercise(board,mode="normal",resume=false){
    const level=Math.floor(Number(board));if(!DB317_GUARDIANS.resolveFinal(level))throw new Error(`Unknown final guardian Board ${board}`);
    window.DiceboundRng.seed(`guardian-identity-${level}-${mode}`);resetPlayer("ranger");boardLevel=level;nightmareMode=mode==="nightmare";hellMode=mode==="hell";gameStarted=true;rollLocked=false;runFinalized=false;combatBusy=false;generateBoard();buildBoard();player.position=currentTileCount()-1;
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

  window.DiceboundInfrastructure=Object.freeze({version:APP_IDENTITY.version,channel:APP_IDENTITY.channel,platform:()=>window.DiceboundPlatform?.runtimeInfo?.(),storage:()=>window.DiceboundStorage?.diagnostics?.(),save:()=>window.DiceboundSave?.diagnostics?.(),runCheckpoint:()=>DB_RUN_CHECKPOINT.diagnostics(),wrapper:()=>window.DiceboundPlatform?.wrapperDiagnostics?.(),load:()=>window.__DiceboundSaveLoadResult||null});



  /* BETA 0.6.3.1 — class progression, Slime ownership, neutral ordinary gear */
  const db0631Rules=window.DiceboundClassUnlockRules;
  if(!db0631Rules||!window.DiceboundPowerupBorrowing||!window.DiceboundEquipment?.pickOrdinaryAffix)throw new Error('Beta 0.6.3.1 rule modules must load before dicebound.js');
  const db0631TargetIds=new Set(db0631Rules.targetIds);
  function db0631Facts(){
    meta.classUnlockFacts=db0631Rules.normalizeFacts(meta.classUnlockFacts||{});return meta.classUnlockFacts;
  }
  const db0631IsClassUnlockedBase=isClassUnlocked;
  function db0631Context(includeUnlocked=false){
    const stats=ensureAlphaMeta(),facts=db0631Facts(),petIds=Object.keys(PETS),petLevels={};petIds.forEach(id=>petLevels[id]=meta.pets?.[id]?.level||1);
    const ctx={facts,petIds,petLevels,highestGold:Math.max(Number(stats.highestGold)||0,gameStarted?(Number(player.gold)||0):0),unlockedClassIds:[]};
    if(includeUnlocked)ctx.unlockedClassIds=Object.keys(CLASSES).filter(id=>id!=='slime'&&db0631EligibleWithoutSlime(id));
    return ctx;
  }
  function db0631EligibleWithoutSlime(id){
    if(meta.unlocks?.[id])return true;if(!CLASSES[id])return false;
    if(db0631TargetIds.has(id)&&id!=='slime'){const result=db0631Rules.isEligible(id,db0631Context(false));if(result!==null)return result;}
    return db0631IsClassUnlockedBase(id);
  }
  function db0631RuleEligible(id){
    if(meta.unlocks?.[id])return true;if(!CLASSES[id])return false;
    const result=db0631Rules.isEligible(id,db0631Context(id==='slime'));return result===null?db0631IsClassUnlockedBase(id):result;
  }
  const db0631BaseClassUnlockedBase=baseClassUnlocked;
  baseClassUnlocked=function(id){if(db0631TargetIds.has(id)&&CLASSES[id])return db0631RuleEligible(id);return db0631BaseClassUnlockedBase(id);};
  isClassUnlocked=function(id){if(db0631TargetIds.has(id)&&CLASSES[id])return db0631RuleEligible(id);return db0631IsClassUnlockedBase(id);};
  const db0631UnlockClassBase=unlockClass;
  unlockClass=function(id){if(db0631TargetIds.has(id)&&CLASSES[id]&&!db0631RuleEligible(id))return false;return db0631UnlockClassBase(id);};
  function db0631RecordObservedProgress(){
    if(!gameStarted)return false;const stats=ensureAlphaMeta(),facts=db0631Facts(),gold=Math.max(Number(stats.highestGold)||0,Number(player.gold)||0),life=Math.max(Number(facts.maxLifesteal)||0,Number(player.lifeSteal)||0);let changed=false;
    if(gold!==(Number(stats.highestGold)||0)){stats.highestGold=gold;changed=true;}if(life!==(Number(facts.maxLifesteal)||0)){facts.maxLifesteal=life;changed=true;}return changed;
  }
  const db0631CheckDynamicBase=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(...args){const changed=db0631RecordObservedProgress(),result=db0631CheckDynamicBase.apply(this,args);['pokemontrainer','rogue','merchant','slime','vampire','invoker','dragoon'].forEach(id=>{if(CLASSES[id]&&db0631RuleEligible(id))unlockClass(id);});if(changed)saveMeta();return result;};
  const db0631WinCombatBase=winCombat;
  winCombat=async function(...args){
    const defeated=currentEncounterLead||currentEnemy,board=boardLevel,classId=player.classId,isFinal=!!defeated?.finalBoss||v16CombatKind==='final'||tiles[currentEnemyTile]?.type==='boss';
    meta.classUnlockFacts=db0631Rules.recordCombatFacts(db0631Facts(),{board,classId,miniBoss:!!defeated?.miniBoss,finalBoss:isFinal,merchantBoss:!!defeated?.merchantBoss,mode:hellMode?'hell':nightmareMode?'nightmare':'normal'});saveMeta();
    const result=await db0631WinCombatBase.apply(this,args);checkDynamicClassUnlocks();saveMeta();return result;
  };
  const db0631OccultSpellAttackBase=occultSpellAttack;
  occultSpellAttack=async function(...args){const beforeMana=Number(player.mana)||0,beforeActions=Number(player.combatActionCount)||0,result=await db0631OccultSpellAttackBase.apply(this,args),spent=beforeMana>(Number(player.mana)||0)&&(Number(player.combatActionCount)||0)>beforeActions;if(spent){meta.classUnlockFacts=db0631Rules.recordManaSpenderCast(db0631Facts(),true);saveMeta();checkDynamicClassUnlocks();}return result;};
  if(CLASSES.pokemontrainer)CLASSES.pokemontrainer.unlock='Secret: raise every companion to level 10 and clear Board 5 with Beastmaster on any difficulty';
  if(CLASSES.rogue)CLASSES.rogue.unlock='Hold 5,000 gold at one time and defeat the Board 3 miniboss';
  if(CLASSES.merchant)CLASSES.merchant.unlock='Defeat the Road Merchant secret boss once';
  if(CLASSES.slime)CLASSES.slime.unlock='Unlock 10 classes in total';
  if(CLASSES.vampire)CLASSES.vampire.unlock='Exceed 100% Lifesteal and defeat the Board 3 final boss';
  checkDynamicClassUnlocks();

  /* BETA 0.6.3.3 — #109 progressive Camp reveals.
     This intentionally stays in the existing Camp owner. The persisted facts
     are one-way, while the achievement/Legacy/Prestige inputs remain the
     authoritative progression systems that already existed before this UI. */
  const DB0633_CAMP_TROPHY_TIERS=Object.freeze([
    Object.freeze({id:'current-trophy',minimumAchievementCount:2})
  ]);
  function db0633TrophyTierForAchievementCount(count){
    const earned=Math.max(0,Math.floor(Number(count)||0));
    let tier=null;
    for(const candidate of DB0633_CAMP_TROPHY_TIERS)if(earned>=candidate.minimumAchievementCount)tier=candidate;
    return tier;
  }
  function db0633PrestigeOfferPoints(total=allocatedTalentPoints()+(meta.points||0)){
    return Math.max(0,Math.floor(Math.max(0,Number(total)||0)/9));
  }
  function db0633ReconcileCampRevealState(current={},facts={}){
    const prior={achievementTrophy:!!current.achievementTrophy,talentStar:!!current.talentStar,prestigeMoon:!!current.prestigeMoon};
    const achievementCount=Math.max(0,Math.floor(Number(facts.achievementCount)||0));
    const legacyLevel=Math.max(1,Math.floor(Number(facts.legacyLevel)||1));
    const prestigeCount=Math.max(0,Math.floor(Number(facts.prestigeCount)||0));
    const prestigeOfferPoints=Math.max(0,Math.floor(Number(facts.prestigeOfferPoints)||0));
    return {
      achievementTrophy:prior.achievementTrophy||!!db0633TrophyTierForAchievementCount(achievementCount),
      talentStar:prior.talentStar||!!facts.legacyLevelGained||legacyLevel>1||prestigeCount>0,
      prestigeMoon:prior.prestigeMoon||prestigeOfferPoints>=1||prestigeCount>0
    };
  }
  function db0633CurrentCampRevealState(){
    const state=meta.campReveals;
    return {achievementTrophy:!!state?.achievementTrophy,talentStar:!!state?.talentStar,prestigeMoon:!!state?.prestigeMoon};
  }
  function db0633AchievementCount(){
    return ACHIEVEMENT_REGISTRY.reduce((count,achievement)=>count+(db317AchievementDone(achievement)?1:0),0);
  }
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
    for(const key of ['achievementTrophy','talentStar','prestigeMoon']){
      if(next[key]&&!current[key]){
        if(!meta.campReveals||typeof meta.campReveals!=='object')meta.campReveals={};
        meta.campReveals[key]=true;changed=true;
      }
    }
    return {changed,state:db0633CurrentCampRevealState()};
  }
  function db0633SyncCampObjects(){
    const state=db0633CurrentCampRevealState();
    return window.DiceboundCamp?.syncProgressionReveals?.(state)||state;
  }
  function db0633RefreshCampProgression(options={}){
    const result=db0633ReconcileCampReveals(options);if(result.changed)saveMeta();db0633SyncCampObjects();return result;
  }
  const db0633GrantLegacyXpBase=grantLegacyXp;
  grantLegacyXp=function(...args){
    const before=Math.max(1,Math.floor(Number(meta.level)||1)),result=db0633GrantLegacyXpBase.apply(this,args);
    db0633RefreshCampProgression({legacyLevelGained:Math.max(1,Math.floor(Number(meta.level)||1))>before});return result;
  };
  const db0633OpenStartScreenBase=openStartScreen;
  openStartScreen=function(...args){const result=db0633OpenStartScreenBase.apply(this,args);db0633SyncCampObjects();return result;};
  const db0633UpdateMetaUIBase=updateMetaUI;
  updateMetaUI=function(...args){const result=db0633UpdateMetaUIBase.apply(this,args);db0633RefreshCampProgression();return result;};
  window.DiceboundCampProgressionTest=Object.freeze({
    trophyTiers:()=>DB0633_CAMP_TROPHY_TIERS.map(tier=>({...tier})),
    trophyTierForAchievementCount:db0633TrophyTierForAchievementCount,
    prestigeOfferPoints:db0633PrestigeOfferPoints,
    reconcile:(current,facts)=>db0633ReconcileCampRevealState(current,facts),
    current:db0633CurrentCampRevealState,
    campObjectIds:()=>window.DiceboundCamp?.progressionRevealObjectIds?.().filter(id=>!!$(id))||[]
  });
  setTimeout(()=>db0633RefreshCampProgression(),0);

  /* BETA 0.6.3.5 — #115 Normal-mode combat backgrounds.
     Board environment resolves independently from combatants and difficulty
     presentation. The supplied artwork is Normal-only; mode variants remain
     an explicit future #88 asset decision rather than a generated filter. */
  const db0635CombatBackgroundStyle=document.createElement('style');
  db0635CombatBackgroundStyle.id='dicebound-normal-combat-background-style';
  db0635CombatBackgroundStyle.textContent=`
    #combatOverlay[data-combat-background]{isolation:isolate;overflow:hidden;background:#07101c!important}
    #combatOverlay[data-combat-background]::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background-image:var(--db0635-combat-background-image);background-size:cover;background-position:center;transform:scale(1.01)}
    #combatOverlay[data-combat-background]::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(4,9,19,.22),rgba(4,9,19,.48))}
    #combatOverlay[data-combat-background]>.modal{position:relative;z-index:2;background:linear-gradient(180deg,rgba(19,31,54,.55),rgba(7,14,28,.72))!important}
  `;
  document.head.appendChild(db0635CombatBackgroundStyle);
  function db0635CombatMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
  function db0635ApplyCombatBackground(){
    const overlay=$('combatOverlay'),mode=db0635CombatMode(),entry=window.DiceboundAssets?.resolveCombatBackground?.(boardLevel,mode)||null;
    if(!overlay)return entry;
    if(entry?.image){overlay.dataset.combatBackground=`board-${boardLevel}-normal`;overlay.style.setProperty('--db0635-combat-background-image',`url("${entry.image}")`);}
    else {delete overlay.dataset.combatBackground;overlay.style.removeProperty('--db0635-combat-background-image');}
    return entry;
  }
  const db0635StartCombatBase=startCombat;
  startCombat=function(...args){const result=db0635StartCombatBase.apply(this,args);db0635ApplyCombatBackground();return result;};
  window.DiceboundCombatBackgrounds=Object.freeze({mode:db0635CombatMode,resolve:(board,mode='normal')=>window.DiceboundAssets?.resolveCombatBackground?.(board,mode)||null,active:db0635ApplyCombatBackground});
  /* BETA 0.6.3.6 — #81 Slime Board battle progression.
     The assets owner resolves transparent Board base art. This integration
     deliberately knows only the current visual mode, so difficulty aura never
     leaks into the physical Board-progression files or board-marker resolver. */
  function db0636CurrentCombatMode(){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
  function db0636TieredEnemyMarkup(enemy){
    const art=window.DiceboundAssets?.resolveEnemyBattleArt?.(enemy?.name||'',boardLevel);
    if(!art)return null;
    const aura=window.DiceboundAssets.resolveEnemyModeAura(db0636CurrentCombatMode());
    return `<span class="db0636-tiered-enemy-art ${aura.className}" data-enemy-battle-art="${art.key}" data-enemy-battle-board="${art.board}" data-enemy-battle-mode="${aura.id}"><img class="enemy-art-frame enemy-art-image db0636-tiered-enemy-image" src="${art.src}" alt="${art.alt} · Board ${art.board}" draggable="false"></span>`;
  }
  const db0636EnemyPortraitBase=enemyPortraitSVG;
  enemyPortraitSVG=function(enemy){return db0636TieredEnemyMarkup(enemy)||db0636EnemyPortraitBase(enemy);};
  const db0636RenderEnemyPartyBase=renderEnemyParty;
  renderEnemyParty=function(...args){
    const result=db0636RenderEnemyPartyBase.apply(this,args),stage=$('enemyIcon');
    stage?.classList.toggle('db0636-tiered-enemy-stage',!!stage.querySelector('.db0636-tiered-enemy-art'));
    return result;
  };
  if(!document.getElementById('dicebound-0636-slime-battle-art-style')){
    const style=document.createElement('style');style.id='dicebound-0636-slime-battle-art-style';style.textContent=`
      #enemyIcon.enemy-stage-icons.db0636-tiered-enemy-stage{min-height:clamp(224px,35vh,430px)!important;align-items:flex-end!important;gap:clamp(8px,2vw,28px)!important;padding-top:24px!important;overflow:visible!important}
      #enemyIcon.db0636-tiered-enemy-stage .stage-enemy{min-width:clamp(100px,18vw,250px)!important;min-height:clamp(205px,32vh,400px)!important;justify-content:flex-end!important;overflow:visible!important}
      #enemyIcon.db0636-tiered-enemy-stage .stage-sprite{display:block!important;width:min(22vw,260px)!important;height:clamp(200px,31vh,390px)!important;line-height:0!important;overflow:visible!important}
      #enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"]),#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="wolf"]){min-width:clamp(86px,14.5vw,205px)!important;min-height:clamp(164px,25vh,315px)!important}
      #enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"]) .stage-sprite,#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="wolf"]) .stage-sprite{width:min(17vw,200px)!important;height:clamp(160px,25vh,310px)!important}
      .db0636-tiered-enemy-art{position:relative;display:block;width:100%;height:100%;isolation:isolate;overflow:visible}
      .db0636-tiered-enemy-image{position:relative;z-index:1;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center bottom!important;overflow:visible!important;border-radius:0!important;filter:drop-shadow(0 14px 13px rgba(0,0,0,.56))}
      .db0636-tiered-enemy-art::before{content:"";position:absolute;z-index:0;inset:13% 12% 8%;border-radius:50%;opacity:0;filter:blur(18px);pointer-events:none}
      .db0636-tiered-enemy-art.db-enemy-mode-nightmare::before{opacity:.52;background:radial-gradient(ellipse,rgba(129,69,179,.64),rgba(41,17,71,.38) 48%,transparent 74%)}
      .db0636-tiered-enemy-art.db-enemy-mode-hell::before{opacity:.56;background:radial-gradient(ellipse,rgba(230,84,43,.68),rgba(135,25,24,.42) 50%,transparent 75%)}
      #enemyIcon.db0636-tiered-enemy-stage .stage-enemy.selected .db0636-tiered-enemy-image{filter:drop-shadow(0 0 15px rgba(245,200,91,.34)) drop-shadow(0 14px 13px rgba(0,0,0,.56))}
      @media(max-width:760px){#enemyIcon.enemy-stage-icons.db0636-tiered-enemy-stage{min-height:clamp(172px,32vh,270px)!important;gap:4px!important;padding-top:18px!important}#enemyIcon.db0636-tiered-enemy-stage .stage-enemy{min-width:calc((100vw - 48px)/3)!important;min-height:clamp(150px,28vh,235px)!important}#enemyIcon.db0636-tiered-enemy-stage .stage-sprite{width:calc((100vw - 48px)/3)!important;height:clamp(146px,27vh,225px)!important}#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"]),#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="wolf"]){min-width:calc((100vw - 82px)/3)!important;min-height:clamp(120px,23vh,190px)!important}#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"]) .stage-sprite,#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="wolf"]) .stage-sprite{width:calc((100vw - 82px)/3)!important;height:clamp(116px,22vh,182px)!important}.db0636-tiered-enemy-art::before{filter:blur(12px)}}
    `;document.head.appendChild(style);
  }
  window.DiceboundEnemyBattleArt=Object.freeze({
    mode:db0636CurrentCombatMode,
    resolve:(name,board=boardLevel)=>window.DiceboundAssets?.resolveEnemyBattleArt?.(name,board)||null,
    active:()=>[...document.querySelectorAll('.db0636-tiered-enemy-art')].map(node=>({key:node.dataset.enemyBattleArt,board:Number(node.dataset.enemyBattleBoard),mode:node.dataset.enemyBattleMode}))
  });


  /* Nature Poison Vines combat VFX (#80, #71).
     Presentation observes completed proc outcomes only: combat damage, targeting,
     RNG and turns remain owned by the live combat pipeline. */
  const dbCombatVfx=window.DiceboundCombatVfx?.create({getEnemies:()=>currentEnemies,getPlayer:()=>player});
  if(!dbCombatVfx)throw new Error('DiceBound requires the combat VFX module.');
  dbCombatVfx.prepareNature();
  const dbNatureLegacyAnimationBase=playElementAnimation;
  playElementAnimation=function(key,target=currentEnemy,enemySource=false){
    // The authored vine sequence replaces (rather than stacks on) the old
    // Nature emoji burst for a real Nature elemental proc. Other uses of the
    // generic Nature cue, such as a normal poison tick, are intentionally
    // untouched, as are all other elements.
    if(dbCombatVfx.suppressLegacyElementAnimation(key))return false;
    return dbNatureLegacyAnimationBase(key,target,enemySource);
  };
  const dbTriggerElementBase=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const candidates=key==='nature'?dbCombatVfx.livingNatureTargets(livingEnemies()):[];
    const result=dbCombatVfx.withNatureLegacyPresentation(key,()=>dbTriggerElementBase(key,target,opts));
    if(key==='nature'&&result)candidates.forEach(enemy=>dbCombatVfx.playNatureOnEnemy(enemy));
    return result;
  };
  const dbEnemyElementProcBase=enemyElementProc;
  enemyElementProc=function(enemy){const result=dbCombatVfx.withNatureLegacyPresentation(enemy?.affinity,()=>dbEnemyElementProcBase(enemy));if(enemy?.affinity==='nature'&&result&&player.hp>0)dbCombatVfx.playNatureOnPlayer();return result;};
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
    $('combatOverlay')?.classList.remove('hidden');renderEnemyParty();
    const result=triggerElementEffect(key,targets[0],{forced:true,source:'Nature VFX regression exercise'});
    return {activated:!!result,key,enemies:targets.map((enemy,index)=>({index,hp:enemy.hp,poisonStacks:enemy.poisonStacks||0})),vfx:dbCombatVfx.natureEntries(),projectiles:[...document.querySelectorAll('.db-combat-projectile-vfx')].map(node=>({effect:node.dataset.effect,origin:node.dataset.origin})),legacyPresentation:{nature:document.querySelectorAll('.element-proc-fx.nature').length,fire:document.querySelectorAll('.element-proc-fx.fire').length,enemy:document.querySelectorAll('.enemy-proc-fx').length}};
  }
  function dbCombatPresentationExercise(kind='final'){
    document.querySelectorAll('.db-nature-vines-vfx').forEach(node=>node.remove());
    const tiered=kind==='slime'||kind==='wolf';
    const enemy={name:tiered?(kind==='slime'?'Slime':'Wolf'):(kind==='miniboss'?'Ogre Roadwarden':'Ancient Road Dragon'),icon:'👹',hp:100,maxHp:100,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:0,guardian:!tiered,miniBoss:kind==='miniboss',finalBoss:kind==='final'};
    currentEnemies=[enemy];currentEnemyIndex=-1;currentEnemy=enemy;currentEncounterLead=enemy;currentEncounterTurn=0;gameStarted=true;combatBusy=false;
    $('combatOverlay')?.classList.remove('hidden');renderEnemyParty();
    const stage=$('enemyIcon'),host=stage?.querySelector('.stage-enemy'),sprite=host?.querySelector('.stage-sprite'),art=host?.querySelector('.enemy-art-frame'),player=$('combatPlayerIcon');
    const rect=node=>{const box=node?.getBoundingClientRect();return box?{width:Math.round(box.width),height:Math.round(box.height)}:null;};
    return {kind,narrow:window.matchMedia('(max-width:760px)').matches,viewportHeight:window.innerHeight,stageClasses:stage?.className||'',hostClasses:host?.className||'',sprite:rect(sprite),art:rect(art),player:rect(player)};
  }
  window.DiceboundNatureVfxTest=Object.freeze({
    effect:dbCombatVfx.natureEffect,
    livingTargets:enemies=>dbCombatVfx.livingNatureTargets(enemies).map(enemy=>enemy.name||''),
    previewPlayer:dbCombatVfx.playNatureOnPlayer,
    exerciseProc:dbNatureProcRegressionExercise,
    exercisePresentation:dbCombatPresentationExercise,
    active:dbCombatVfx.natureEntries
  });

  /* #128/#83 authored equipment identities.
     The extracted equipment domain selects and owns stable base IDs, intrinsic
     stats and visual metadata. This adapter deliberately keeps live combat,
     saves and the ordinary rolled-point budget in their existing owners. */
  const db06314Equipment=window.DiceboundEquipment;
  if(!db06314Equipment?.identityForItem||!db06314Equipment?.allBonusesForItem)throw new Error('DiceBound requires the equipment identity domain.');
  function db06314Identity(item){return db06314Equipment.identityForItem(item);}
  function db06314BonusLabel(key,value){return key==='maxMana'?`+${value} Mana`:bonusLabel(key,value);}
  function db06314IntrinsicParts(item){
    const identity=db06314Identity(item),bonuses=db06314Equipment.intrinsicBonusesForItem(item);
    const values=Object.entries(bonuses).map(([key,value])=>db06314BonusLabel(key,value));
    return identity&&values.length?{identity,values}:null;
  }
  applyItemStats=function(item,sign){
    const oldMax=player.maxHp;
    Object.entries(db06314Equipment.allBonusesForItem(item)).forEach(([key,value])=>{if(typeof player[key]==='number')player[key]+=value*sign;});
    player.crit=Math.max(0,player.crit);player.dodge=Math.max(0,player.dodge);player.lifeSteal=clamp(player.lifeSteal,0,.75);player.luck=clamp(player.luck,0,1.50);player.doubleStrike=Math.max(0,player.doubleStrike);
    if(player.maxHp<1)player.maxHp=1;
    if(sign>0&&player.maxHp>oldMax)player.hp+=player.maxHp-oldMax;
    player.hp=clamp(player.hp,1,player.maxHp);
    if(typeof player.maxMana==='number'){
      player.maxMana=Math.max(0,player.maxMana);
      if(typeof player.mana==='number')player.mana=clamp(player.mana,0,player.maxMana);
    }
  };
  const db06314FormatBonusesBase=formatBonuses;
  formatBonuses=function(item){
    const base=db06314FormatBonusesBase(item),intrinsic=db06314IntrinsicParts(item);
    return intrinsic?`${base} · INTRINSIC (${intrinsic.identity.displayName}): ${intrinsic.values.join(' · ')}`:base;
  };
  const db06314GearScoreBase=gearPowerScore;
  gearPowerScore=function(item){
    const weights={attack:7,defense:8,maxHp:.55,maxMana:.7,crit:45,dodge:38,lifeSteal:45,luck:18,goldBonus:20,potionPower:15,bossDamage:34,doubleStrike:42,classBurst:30,extraStepChance:18,damageBonus:50,flatReduction:11,elementProcBonus:45};
    return db06314GearScoreBase(item)+Object.entries(db06314Equipment.intrinsicBonusesForItem(item)).reduce((score,[key,value])=>score+Math.abs(value)*(weights[key]||2),0);
  };
  formatGearComparison=function(item,current){
    if(!current)return '<b>Empty slot.</b> Equipping this item will not replace anything.';
    const score=gearPowerScore(item)-gearPowerScore(current),incoming=db06314Equipment.allBonusesForItem(item),equipped=db06314Equipment.allBonusesForItem(current),deltas=[];
    const keys=new Set([...Object.keys(equipped),...Object.keys(incoming)]);
    keys.forEach(key=>{const delta=(incoming[key]||0)-(equipped[key]||0);if(Math.abs(delta)>.0001){const label=db06314BonusLabel(key,Math.abs(delta)).replace(/^\+/,'');deltas.push(`<span class="${delta>0?'better':'worse'}">${delta>0?'+':'−'}${label}</span>`);}});
    const quality=score>12?'<span class="better">Overall quality: stronger</span>':score<-12?'<span class="worse">Overall quality: weaker</span>':'<span class="same">Overall quality: similar</span>';
    return `${quality}<br>${deltas.length?deltas.join(' · '):'<span class="same">No numerical stat change</span>'}`;
  };
  window.DiceboundEquipmentIdentityTest=Object.freeze({
    identity:id=>db06314Equipment.equipmentIdentity(id),
    art:item=>window.DiceboundAssets?.resolveEquipmentArt?.(item)||null,
    intrinsic:item=>db06314Equipment.intrinsicBonusesForItem(item),
    total:item=>db06314Equipment.allBonusesForItem(item),
    generate:(rarity='common',slot='weapon')=>generateEquipment(rarity,slot)
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
  const db06421EquipItemBase=equipItem;
  equipItem=function(item,silent=false){
    const priorEquipmentMana=db06421UsesMana()?db06421EquipmentMana():0,baseMaxMana=Math.max(0,(Number(player.maxMana)||0)-priorEquipmentMana),currentMana=Number(player.mana)||0;
    const result=db06421EquipItemBase(item,silent);
    db06421SyncMana({baseMaxMana,currentMana});
    return result;
  };
  const db06421ResetPlayerBase=resetPlayer;
  resetPlayer=function(classId=selectedClassId){
    const result=db06421ResetPlayerBase(classId);
    // The historical reset chain mounts heirlooms before it initializes each
    // class resource, so rebuild the effective cap once that base is final.
    db06421SyncMana({baseMaxMana:player.maxMana,currentMana:player.mana});
    return result;
  };
  function db06421ManaEquipmentExercise(){
    try{
      window.DiceboundRng.seed('db06421-mana-equipment');resetPlayer('sorcerer');gameStarted=true;rollLocked=false;generateBoard();buildBoard();
      const base={maxMana:player.maxMana,mana:player.mana};player.mana=17;
      equipItem({id:'db06421-spellbook',slot:'offhand',rarity:'common',equipmentId:'spellbook',bonuses:{}},true);
      const one={maxMana:player.maxMana,mana:player.mana};
      equipItem({id:'db06421-mana-ring',slot:'ring',rarity:'rare',bonuses:{maxMana:7}},true);
      const multiple={maxMana:player.maxMana,mana:player.mana};
      const checkpoint=dbRunSnapshot();player.maxMana=1;player.mana=1;dbRunRestore(JSON.parse(JSON.stringify(checkpoint)));
      const restored={maxMana:player.maxMana,mana:player.mana};
      equipItem({id:'db06421-plain-offhand',slot:'offhand',rarity:'common',bonuses:{}},true);
      const removedOne={maxMana:player.maxMana,mana:player.mana};player.mana=removedOne.maxMana;
      equipItem({id:'db06421-plain-ring',slot:'ring',rarity:'common',bonuses:{}},true);
      const removedAll={maxMana:player.maxMana,mana:player.mana};
      resetPlayer('ranger');
      equipItem({id:'db06421-ranger-spellbook',slot:'offhand',rarity:'common',equipmentId:'spellbook',bonuses:{}},true);
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
      const starter=JSON.parse(JSON.stringify(player.equipment.weapon));renderEndGear();
      const endStarterCandidates=[...document.querySelectorAll('#endGearGrid .gear-keep-btn')].map(button=>button.textContent);
      gameStarted=true;const prestigeStarter={rewards:1};openPrestigeHeirloomChoice(prestigeStarter);
      const prestigeStarterCandidates=(prestigeStarter.candidates||[]).map(item=>({id:item.id,name:item.name,eligible:db06314Equipment.isHeirloomEligible(item)}));
      const ordinary=generateEquipment('common','weapon');equipItem(ordinary,true);renderEndGear();
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
  function db064IsStandardDevil(enemy){return /\bdevil\b/i.test(String(enemy?.name||''))&&!/\bpale\s+devil\b/i.test(String(enemy?.name||''));}
  const db064ScaleEnemyBase=scaleEnemy;
  scaleEnemy=function(...args){
    const enemy=db064ScaleEnemyBase.apply(this,args);
    if(db064IsStandardDevil(enemy)){
      enemy.innateElement='fire';
      enemy.elementProcChance=db064EnemyPolicy.standardDevilFlameChance(boardLevel,db064CombatMode());
    }
    return enemy;
  };
  const db064EnemyElementProcBase=enemyElementProc;
  enemyElementProc=function(enemy){
    const innate=enemy?.innateElement;
    if(!innate)return db064EnemyElementProcBase(enemy);
    const originalAffinity=enemy.affinity;
    enemy.affinity=innate;
    try{return db064EnemyElementProcBase(enemy);}
    finally{if(originalAffinity===undefined)delete enemy.affinity;else enemy.affinity=originalAffinity;}
  };
  async function db064ResolveWolfEchoes(){
    const chance=db064EnemyPolicy.wolfEchoChance(boardLevel,db064CombatMode());
    if(!chance||player.hp<=0)return {notes:[],defeated:false};
    const notes=[];
    for(const wolf of livingEnemies().filter(enemy=>/\bwolf\b/i.test(String(enemy?.name||''))&&!enemy.guardian)){
      if(random()>=chance)continue;
      if(random()<effectiveDodgeChance()){dbFriendSuccessfulDodgePresentation();notes.push(`🐺 ${wolf.name}'s Echo Strike is dodged.`);continue;}
      if(player.combatShield>0){player.combatShield--;notes.push(`🐺 Barrier blocks ${wolf.name}'s Echo Strike.`);continue;}
      const base=Math.max(1,wolf.attack+rand(-1,1)),raw=Math.max(1,Math.round(base*(1-defenseDamageReduction())-player.flatReduction)),hit=v24ApplyDamage(raw);
      meta.damageTaken=(meta.damageTaken||0)+hit.total;
      notes.push(`🐺 ${wolf.name}'s Echo Strike hits for ${hit.total}${hit.shield?` (${hit.shield} absorbed by Energy Shield)`:''}.`);
      if(player.thorns>0&&hit.total>0){const returned=damageEnemy(wolf,player.thorns,true);notes.push(`Spikes return ${returned}.`);}
      if(player.hp<=0)break;
    }
    if(notes.length){notes.forEach(addCombatHistory);setCombatText(notes.join(' '));updateCombatUI();await delay(380);}
    return {notes,defeated:player.hp<=0};
  }
  const db064EnemyTurnBase=enemyTurn;
  enemyTurn=async function(...args){
    const result=await db064EnemyTurnBase.apply(this,args);
    if(!currentEnemy||player.hp<=0||!livingEnemies().length)return result;
    combatBusy=true;
    const echo=await db064ResolveWolfEchoes();
    if(echo.defeated)return handlePlayerDeath();
    combatBusy=false;updateCombatUI();
    return result;
  };
  window.DiceboundEnemyMechanicsTest=Object.freeze({
    wolfEchoChance:(board,mode)=>db064EnemyPolicy.wolfEchoChance(board,mode),
    devilFlameChance:(board,mode)=>db064EnemyPolicy.standardDevilFlameChance(board,mode),
    isStandardDevil:db064IsStandardDevil
  });

  /* #145 Donut Rain is a non-blocking battlefield presentation.  It observes
     a real completed Donut proc and never changes its target, timing or RNG. */
  const db064DonutTriggerElementBase=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const result=db064DonutTriggerElementBase(key,target,opts);
    if(key==='donut'&&result)dbCombatVfx.playDonutRain({origin:'player',enemy:target});
    return result;
  };
  const db064DonutEnemyElementProcBase=enemyElementProc;
  enemyElementProc=function(enemy){
    const isDonut=enemy?.affinity==='donut';
    const result=db064DonutEnemyElementProcBase(enemy);
    if(isDonut&&result)dbCombatVfx.playDonutRain({origin:'enemy',enemy});
    return result;
  };
  window.DiceboundDonutVfxTest=Object.freeze({
    effect:dbCombatVfx.donutEffect,
    play:dbCombatVfx.playDonutRain,
    active:dbCombatVfx.donutEntries
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
  const db064StartCombatBase=startCombat;
  startCombat=function(...args){const result=db064StartCombatBase.apply(this,args);db064SyncBattleLog();return result;};

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
  window.DiceboundCombatUiTest=Object.freeze({
    battleLogCollapsed:db064BattleLogCollapsed,
    setBattleLogCollapsed:db064SetBattleLogCollapsed,
    tooltip:()=>({active:!!db064TooltipTarget,text:db064TooltipLayer()?.textContent||'',hidden:db064TooltipLayer()?.classList.contains('hidden')??true}),
    positionTooltip:db064PositionTooltip
  });

  // Isolated browser-harness coverage for the #123 semantic contract.  This
  // exercises the live composed strike pipeline, including the Ranger wrapper.
  window.DiceboundEchoStrikeTest=Object.freeze({
    async highCritRangerEchoes(){
      if(meta.unlocks)meta.unlocks.ranger=true;
      resetPlayer('ranger');
      Object.assign(player,{attack:1,crit:3.5,doubleStrike:2,criticalEchoBonus:1,combatAttackCount:0});
      const enemy={name:'Echo Regression Dummy',icon:'🎯',hp:99999,maxHp:99999,attack:1,defense:0,weakness:'fire',affinity:null,poisonStacks:0,rangerMarks:0};
      currentEnemies=[enemy];currentEnemy=enemy;currentEnemyIndex=0;currentEncounterLead=enemy;currentEncounterTurn=0;gameStarted=true;combatBusy=false;
      const strikes=[];
      for(let index=1;index<=3;index++)strikes.push(await performStrike(enemy,{echo:true,index,canCrit:false}));
      return {crits:strikes.map(strike=>strike.critTiers),canCrit:strikes.map(strike=>strike.canCrit),marks:enemy.rangerMarks,expectedMarks:3};
    }
  });

  /* #75 / #122 — one source for the level-aware event Gold family.  The
     runtime applies its existing effective-Gold calculation exactly once. */
  const db064FriendsEventRewards=window.DiceboundEventRewards;
  if(!db064FriendsEventRewards)throw new Error('DiceBound requires the event reward policy domain.');
  function db064EventGold(source,multiplier=1){
    return modifiedGold(db064FriendsEventRewards.goldBaseFor(source,player.level,multiplier));
  }
  function db064ApplySlotReward(result){
    const counts={};result.forEach(symbol=>counts[symbol]=(counts[symbol]||0)+1);
    const triple=Object.keys(counts).find(symbol=>counts[symbol]===3),pair=Object.keys(counts).find(symbol=>counts[symbol]===2);let text='';
    if(triple){
      switch(triple){
        case '⚔️':player.attack+=5;text='Jackpot! +5 attack permanently.';break;
        case '❤️':player.maxHp+=20;player.hp=Math.min(player.maxHp,player.hp+20);text='Jackpot! +20 max HP and heal 20.';break;
        case '🪙':{const gold=db064EventGold('slotJackpot');player.gold+=gold;text=`Jackpot! +${gold} gold.`;break;}
        case '🛡️':player.defense+=4;text='Jackpot! +4 defense permanently.';break;
        case '⭐':player.attack+=5;player.maxHp+=18;player.hp+=18;player.crit+=.10;text='Legendary jackpot! +5 attack, +18 max HP and +10% crit.';break;
        case '💀':{const loss=Math.max(1,Math.floor(player.hp*.25));player.hp=Math.max(1,player.hp-loss);text=`Triple skulls! You lose ${loss} HP.`;break;}
      }
      sfx.level();
    }else if(pair){
      switch(pair){
        case '⚔️':player.attack+=2;text='Two swords: +2 attack permanently.';break;
        case '❤️':{const heal=Math.min(player.maxHp-player.hp,18);player.hp+=heal;text=`Two hearts: heal ${heal} HP.`;break;}
        case '🪙':{const gold=db064EventGold('slotPair');player.gold+=gold;text=`Two coins: +${gold} gold.`;break;}
        case '🛡️':player.flatReduction+=2;text='Two shields: reduce incoming damage by 2.';break;
        case '⭐':player.crit+=.08;text='Two stars: +8% critical chance.';break;
        case '💀':{const loss=Math.max(1,Math.floor(player.hp*.10));player.hp=Math.max(1,player.hp-loss);text=`Two skulls: lose ${loss} HP.`;break;}
      }
      tone(650,.15,'triangle',.04,950);
    }else{
      const gold=db064EventGold('slotPity');player.gold+=gold;text=`No match. The machine pays ${gold} consolation gold.`;sfx.coin();
    }
    const cookieChance=.14+gameplayTalentRank('fortune_cookie')*.03;
    if(random()<cookieChance){meta.petCookies++;saveMeta();text+=' A rare pet cookie drops from the machine!';showToast('🍪 Pet cookie found!');}
    $('slotResult').textContent=text;addLog(`<b>Slots:</b> ${text}`);updateMetaUI();
  }
  applySlotReward=db064ApplySlotReward;
  const db064GoldenRain=wheelRewards.find(reward=>reward.name==='Golden Rain');
  if(db064GoldenRain)db064GoldenRain.apply=function(){const gold=db064EventGold('wheel');player.gold+=gold;return `The wheel grants ${gold} gold.`;};
  const db064PurseTalent=talents.find(talent=>talent.id==='fortune_gold');
  if(db064PurseTalent)db064PurseTalent.desc='Each rank adds 35% of the level-scaled event-Gold reward at run start (25 Gold per rank at level 1) and +5% Gold Gain.';
  window.DiceboundEventRewardTest=Object.freeze({
    gold:(source,level=player.level,multiplier=1,goldModifier=1)=>Math.round(db064FriendsEventRewards.goldBaseFor(source,level,multiplier)*goldModifier),
    slotOdds:luck=>db064FriendsEventRewards.slotMatchOdds(luck),
    tileType:(roll,board)=>db064FriendsEventRewards.roadTileType(roll,board),
    sources:()=>Object.keys(db064FriendsEventRewards.gold.sourceMultiplier)
  });

  /* #78 / #209 — achievement rules and mastery state remain here until their
     domain moves. The Trophy destination itself is owned by ui/achievements. */
  function db064AchievementUiSettings(){
    if(!meta.settings||typeof meta.settings!=='object')meta.settings={};
    if(!meta.settings.achievementGroups||typeof meta.settings.achievementGroups!=='object')meta.settings.achievementGroups={};
    return meta.settings.achievementGroups;
  }
  function db064PowerupGateDone(gate){return achievementGateUnlocked(gate);}
  function db064HeroMasteryEntries(classId){
    return upgrades.filter(upgrade=>(upgrade.classId===classId||(upgrade.classIds||[]).includes(classId))&&!!upgrade.achievementGate)
      .map(upgrade=>{
        const gate=String(upgrade.achievementGate),match=/^class_b(\d+):/.exec(gate),achievement=gate.startsWith('achievement:')?ACHIEVEMENT_REGISTRY.find(entry=>entry.id===gate.slice('achievement:'.length)):ACHIEVEMENT_REGISTRY.find(entry=>entry.id===gate);
        const condition=match?`Clear Board ${match[1]} as this hero.`:achievement?db317AchievementConditionText(achievement):'Complete this hero’s listed unlock condition.';
        return {id:`hero-talent:${classId}:${upgrade.id}`,name:`${upgrade.icon||'✨'} ${upgrade.name}`,description:`${condition} Unlocks this hero-specific talent.`,done:db064PowerupGateDone(gate)};
      });
  }
  const dbAchievementsUi=window.DiceboundAchievementsUi;
  if(!dbAchievementsUi)throw new Error('DiceBound requires the Achievements UI module before dicebound.js');
  dbAchievementsUi.configure({
    find:$,
    getRegistry:()=>ACHIEVEMENT_REGISTRY,
    getClasses:()=>Object.values(CLASSES),
    isClassUnlocked,
    isDone:db317AchievementDone,
    descriptionFor:achievement=>db317AchievementConditionText(achievement)+db317AchievementRewardText(achievement),
    heroMasteryEntries:db064HeroMasteryEntries,
    getOpenState:db064AchievementUiSettings,
    setOpenState:(id,open)=>{db064AchievementUiSettings()[id]=!!open;saveMeta();}
  });

  /* #185: the extracted Camp owner consumes live domain data/actions without
     duplicating class, pet, progression, storage, save or mode ownership. */
  const db064Camp=window.DiceboundCamp;
  if(!db064Camp)throw new Error('DiceBound requires the Camp UI module before dicebound.js');
  window.DiceboundCampHitTargetTest=Object.freeze({inspect:()=>db064Camp.inspectHitTargets()});
  const db064FriendsUpdateMetaUiBase=updateMetaUI;
  updateMetaUI=function(...args){const result=db064FriendsUpdateMetaUiBase.apply(this,args);db064Camp.scheduleHitTargetSync();return result;};
  db064Camp.scheduleHitTargetSync();

  /* #124: keep the recorder independent from game ownership. The compatibility
     monolith supplies a read-only live context; sampling/retention/UI controls
     stay in the extracted core owner and do not wrap combat or timer behavior. */
  const db064MemoryDiagnostics=window.DiceboundMemoryDiagnostics;
  if(!db064MemoryDiagnostics)throw new Error('DiceBound requires the memory diagnostics core module.');
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
    renderEnemyParty();
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
  const db0648TriggerElementBase=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const result=db0648TriggerElementBase(key,target,opts);
    if(target?.hp<=0)db0648ReconcileDefeatedTarget(target,`element:${key}`);
    return result;
  };
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
    try{await playerAttack();return {captures,events,afterDelay:db0648SelectedTargetSurfaces(),living:livingEnemies().map(enemy=>enemy.name)};}
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
    const index=Math.min(1,Math.max(0,tiles.length-1)),base=enemyForPosition(index);
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

  /* Beta 0.6.4.29 — Friends Patch presentation and Dragoon integration.
     These adapters consume the authoritative combat/state owners above. */
  function dbFriendSuccessfulDodgePresentation(){
    const icon=$('combatPlayerIcon');if(!icon)return false;
    icon.classList.remove('db-dodge-backflip');void icon.offsetWidth;icon.classList.add('db-dodge-backflip');
    setTimeout(()=>icon.classList.remove('db-dodge-backflip'),420);return true;
  }

  dbCombatVfx.prepareProjectileEffects?.();
  const dbFriendLegacyElementPresentation=playElementAnimation;
  playElementAnimation=function(key,target=currentEnemy,enemySource=false){
    if(key==='fire'||key==='gun')return false;
    return dbFriendLegacyElementPresentation(key,target,enemySource);
  };
  const dbFriendElementProcBase=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const result=dbFriendElementProcBase(key,target,opts);
    if(result&&(key==='fire'||key==='gun'))dbCombatVfx.playProjectileProc?.(key,{origin:'player',enemy:target});
    return result;
  };
  const dbFriendEnemyElementProcBase=enemyElementProc;
  enemyElementProc=function(enemy){
    const key=enemy?.affinity,result=dbFriendEnemyElementProcBase(enemy);
    if(result&&(key==='fire'||key==='gun'))dbCombatVfx.playProjectileProc?.(key,{origin:'enemy',enemy});
    return result;
  };
  function dbFriendClearCombatPresentation(){
    dbCombatVfx.clearTransient?.();
    clearTimeout(dbFriendDragoonLandingTimer);
    document.querySelectorAll('.element-proc-fx,.enemy-proc-fx,.db-combat-projectile-vfx').forEach(node=>node.remove());
    const fx=$('attackFx');if(fx){fx.className='attack-fx';fx.replaceChildren();}
    $('combatPlayerIcon')?.classList.remove('attack-lunge','db-dodge-backflip','db-dragoon-airborne','db-dragoon-landing');
  }
  const dbFriendStartCombatBase=startCombat;
  startCombat=function(...args){dbFriendClearCombatPresentation();const result=dbFriendStartCombatBase.apply(this,args);db059RefreshActivePetArt?.();return result;};
  const dbFriendReturnToRoadBase=returnToRoad;
  returnToRoad=function(...args){dbFriendClearCombatPresentation();return dbFriendReturnToRoadBase.apply(this,args);};

  const dbFriendUpdateMetaUiBase=updateMetaUI;
  updateMetaUI=function(...args){const result=dbFriendUpdateMetaUiBase.apply(this,args);db059RefreshActivePetArt?.();return result;};
  const dbFriendFeedActivePetBase=feedActivePet;
  feedActivePet=function(count=1){
    const state=activePetState?.(),beforeCookies=Number(meta.petCookies)||0,beforeXp=Number(state?.xp)||0,beforeLevel=Number(state?.level)||1;
    const result=dbFriendFeedActivePetBase(count),after=activePetState?.(),changed=(Number(meta.petCookies)||0)!==beforeCookies||Number(after?.xp)!==beforeXp||Number(after?.level)!==beforeLevel;
    db059RefreshActivePetArt?.();return changed?Object.freeze({ok:true,spent:Math.max(0,beforeCookies-(Number(meta.petCookies)||0)),level:Number(after?.level)||1}):false;
  };
  function dbFriendHealAtCamp(){
    const max=Math.max(1,Math.floor(Number(player?.maxHp)||1));
    if(Number(player?.hp)>=max)return false;
    player.hp=max;updateHUD();return true;
  }
  const dbFriendOpenStartScreenBase=openStartScreen;
  openStartScreen=function(...args){const result=dbFriendOpenStartScreenBase.apply(this,args);dbFriendHealAtCamp();dbFriendClearCombatPresentation();db059RefreshActivePetArt?.();return result;};
  function dbFriendCampRecoveryExercise(){resetPlayer('ranger');player.hp=1;openStartScreen();return Object.freeze({hp:player.hp,maxHp:player.maxHp,campVisible:!$('startOverlay')?.classList.contains('hidden')});}
  function dbFriendBoardClearModeRegressionExercise(){
    const before={...(ensureAlphaMeta().boardClears||{})},modes={nightmare:nightmareMode,hell:hellMode};
    try{
      meta.stats.boardClears={};nightmareMode=false;hellMode=false;recordBoardClear(2,'ranger');recordBoardClear(4,'ranger');nightmareMode=true;recordBoardClear(3,'ranger');hellMode=true;recordBoardClear(5,'ranger');renderLifetimeStats();
      return Object.freeze({keys:Object.keys(meta.stats.boardClears).sort(),hasNormal:hasBoardClear('ranger',4),hasNightmare:hasBoardClear('ranger',3),hasHell:hasBoardClear('ranger',5),text:$('lifetimeStats')?.textContent||''});
    }finally{meta.stats.boardClears=before;nightmareMode=modes.nightmare;hellMode=modes.hell;saveMeta();renderLifetimeStats();}
  }

  /* Dragoon #97 — one semantic airborne window and one forced landing action. */
  const dbFriendDragoonTalentId='dragoon_aerial_discipline';
  const dbFriendDragoonActive=()=>player?.classId==='dragoon';
  const dbFriendDragoonCooldown=()=>Math.max(2,6-gameplayTalentRank(dbFriendDragoonTalentId));
  let dbFriendDragoonLandingTimer=0;
  function dbFriendSyncDragoonPresentation(){const icon=$('combatPlayerIcon'),airborne=dbFriendDragoonActive()&&(player.dragoonAirborneResponses>0||player.dragoonLandingReady);if(icon){if(airborne)icon.classList.remove('db-dragoon-landing');icon.classList.toggle('db-dragoon-airborne',airborne);}}
  function dbFriendDragoonLandPresentation(){const icon=$('combatPlayerIcon');if(!icon)return;icon.classList.remove('db-dragoon-airborne');icon.classList.add('db-dragoon-landing');clearTimeout(dbFriendDragoonLandingTimer);dbFriendDragoonLandingTimer=setTimeout(()=>icon.classList.remove('db-dragoon-landing'),240);}
  function dbFriendResetDragoonState(){Object.assign(player,{dragoonJumpCooldown:0,dragoonAirborneResponses:0,dragoonLandingReady:false});dbFriendSyncDragoonPresentation();}
  const dbFriendResetPlayerBase=resetPlayer;
  resetPlayer=function(...args){const result=dbFriendResetPlayerBase.apply(this,args);dbFriendResetDragoonState();return result;};
  function dbFriendEnsureDragoonJumpButton(){
    const actions=document.querySelector('#combatOverlay .combat-actions');if(!actions)return null;let button=$('dragoonJumpBtn');
    if(!button){button=document.createElement('button');button.id='dragoonJumpBtn';button.type='button';button.className='combat-btn special action-tooltip';button.addEventListener('click',dbFriendDragoonJump);actions.insertBefore(button,$('guardBtn')||null);}
    return button;
  }
  async function dbFriendDragoonLanding(){
    if(!dbFriendDragoonActive()||combatBusy||!currentEnemy||!player.dragoonLandingReady)return false;
    combatBusy=true;player.guardCooldown=0;player.dragoonLandingReady=false;player.dragoonAirborneResponses=0;dbFriendDragoonLandPresentation();
    const target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0];if(!target){combatBusy=false;return false;}
    const critTiers=rollTieredProc(player.crit),base=Math.max(1,Math.round((player.attack+rand(2,6))*2.45)),damage=Math.round(base*(1+critTiers)*(currentEncounterLead?.boss?1+player.bossDamage:1)),dealt=damageEnemy(target,damage);
    player.combatAttackCount++;chargeUltimate(player.ultimateAttackGain+player.critUltimateGain*critTiers);await animateClassAttack(critTiers?'crit':'normal');
    const proc=target.hp>0?triggerStrikeElements(target):{message:'',totalDamage:0};
    setCombatText(`🐉 Dragoon lands for ${dealt}${critTiers?` with ${critTiers} critical tier${critTiers===1?'':'s'}`:''}.${proc?.message?` ${proc.message}`:''}`);updateCombatUI();await delay(480);
    if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);return true;
  }
  async function dbFriendDragoonJump(){
    if(!dbFriendDragoonActive()||combatBusy||!currentEnemy||player.dragoonLandingReady||player.dragoonAirborneResponses>0||player.dragoonJumpCooldown>0)return false;
    combatBusy=true;player.guardCooldown=0;player.dragoonJumpCooldown=dbFriendDragoonCooldown();player.dragoonAirborneResponses=1;dbFriendSyncDragoonPresentation();
    setCombatText(`🐉 Jump! Dragoon is Airborne through one enemy response. Landing will use the next player action.`);updateCombatUI();await delay(260);await resolveEnemyResponse(false);
    if(player.hp>0&&livingEnemies().length){player.dragoonLandingReady=true;updateCombatUI();setCombatText('🐉 Airborne window complete — use your next action to land.');}return true;
  }
  const dbFriendEnemyTurnBase=enemyTurn;
  enemyTurn=async function(...args){
    if(dbFriendDragoonActive()&&player.dragoonAirborneResponses>0&&!livingEnemies().some(enemy=>enemy.canHitAirborne===true)){
      player.dragoonAirborneResponses-=1;if(player.dragoonAirborneResponses===0)player.dragoonLandingReady=true;currentEncounterTurn++;setCombatText('🐉 Dragoon is Airborne — ordinary attacks cannot reach the landing zone.');await delay(420);combatBusy=false;updateCombatUI();return;
    }
    return dbFriendEnemyTurnBase.apply(this,args);
  };
  function dbFriendTickDragoonCooldown(){if(dbFriendDragoonActive()&&player.dragoonJumpCooldown>0)player.dragoonJumpCooldown-=1;}
  const dbFriendPlayerAttackBase=playerAttack;
  playerAttack=async function(...args){if(dbFriendDragoonActive()&&player.dragoonLandingReady)return dbFriendDragoonLanding();if(dbFriendDragoonActive()&&!combatBusy&&currentEnemy)dbFriendTickDragoonCooldown();return dbFriendPlayerAttackBase.apply(this,args);};
  const dbFriendGuardActionBase=guardAction;
  guardAction=async function(...args){if(dbFriendDragoonActive()&&player.dragoonLandingReady)return dbFriendDragoonLanding();if(dbFriendDragoonActive()&&!combatBusy&&currentEnemy&&player.guardCooldown<=0)dbFriendTickDragoonCooldown();return dbFriendGuardActionBase.apply(this,args);};
  const dbFriendPotionBase=usePotion;
  usePotion=async function(...args){if(dbFriendDragoonActive()&&player.dragoonLandingReady)return dbFriendDragoonLanding();if(dbFriendDragoonActive()&&!combatBusy&&currentEnemy&&player.potions>0&&player.hp<player.maxHp)dbFriendTickDragoonCooldown();return dbFriendPotionBase.apply(this,args);};
  async function dbFriendDragonDive(){
    if(!dbFriendDragoonActive()||combatBusy||!currentEnemy||player.ultimateCharge<100)return false;
    combatBusy=true;player.guardCooldown=0;player.ultimateCharge=0;const target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],critTiers=rollTieredProc(player.crit),damage=Math.round((player.attack*4.4+rand(5,11))*(1+critTiers)*(currentEncounterLead?.boss?1+player.bossDamage:1)),dealt=damageEnemy(target,damage);
    await animateUltimate();const proc=target?.hp>0?triggerStrikeElements(target):{message:''};setCombatText(`🐉 Dragon Dive deals ${dealt}${critTiers?` with ${critTiers} critical tier${critTiers===1?'':'s'}`:''}.${proc?.message?` ${proc.message}`:''}`);sfx.crit();updateCombatUI();await delay(720);
    if(!livingEnemies().length)return winCombat();setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0]));await resolveEnemyResponse(false);return true;
  }
  const dbFriendUltimateBase=useUltimate;
  useUltimate=async function(...args){if(dbFriendDragoonActive()&&player.dragoonLandingReady)return dbFriendDragoonLanding();if(dbFriendDragoonActive())return dbFriendDragonDive();dbFriendTickDragoonCooldown();return dbFriendUltimateBase.apply(this,args);};
  const dbFriendUpdateCombatUiBase=updateCombatUI;
  updateCombatUI=function(...args){
    const result=dbFriendUpdateCombatUiBase.apply(this,args),jump=dbFriendEnsureDragoonJumpButton(),active=dbFriendDragoonActive(),landing=active&&player.dragoonLandingReady;dbFriendSyncDragoonPresentation();
    if(jump){jump.hidden=!active;jump.disabled=!active||combatBusy||landing||player.dragoonAirborneResponses>0||player.dragoonJumpCooldown>0;jump.textContent=player.dragoonAirborneResponses>0?'🐉 Airborne':player.dragoonJumpCooldown>0?`🐉 Jump (${player.dragoonJumpCooldown})`:'🐉 Jump';}
    if(active){const attack=$('attackBtn'),guard=$('guardBtn'),potion=$('potionBtn'),ultimate=$('ultimateBtn');if(attack)attack.textContent=landing?'🐉 Land':'⚔️ Attack';[guard,potion,ultimate].forEach(button=>{if(button&&landing)button.disabled=true;});}
    return result;
  };
  async function dbFriendDragoonRegressionExercise(){
    const enemy={name:'Airborne Exercise Guardian',icon:'🐲',hp:999,maxHp:999,attack:999,defense:0,weakness:'ice',affinity:null,poisonStacks:0,guardian:true,finalBoss:true,specialName:'Exercise Skybreaker'};
    try{
      resetPlayer('dragoon');gameStarted=true;rollLocked=false;combatBusy=false;currentEnemies=[enemy];currentEnemy=enemy;currentEnemyIndex=0;currentEncounterLead=enemy;currentEnemyTile=null;currentEncounterTurn=Math.max(0,GUARDIAN_SPECIAL_INTERVAL-1);
      $('combatOverlay')?.classList.remove('hidden');renderEnemyParty();updateCombatUI();
      const hpBefore=player.hp,jumpButton=$('dragoonJumpBtn'),jumpVisible=!!jumpButton&&!jumpButton.hidden,jumped=await dbFriendDragoonJump();
      const airborne={hp:player.hp,cooldown:player.dragoonJumpCooldown,landingReady:!!player.dragoonLandingReady,airborneResponses:player.dragoonAirborneResponses,turn:currentEncounterTurn,artRaised:$('combatPlayerIcon')?.classList.contains('db-dragoon-airborne')===true};
      const enemyHpBeforeLanding=enemy.hp,landed=await playerAttack();
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
    feedPet:count=>feedActivePet(count),
    petCombatArt:()=>$('combatPet')?.querySelector('img')?.getAttribute('src')||null
  });

  /* INFO / ROADKEEPER'S GUIDE ------------------------------------------------
     Presentation is owned by ui/info-guide.js. Runtime facts, save transfer and
     progression state remain here as injected callbacks. */
  const dbInfoGuide=window.DiceboundInfoGuide;
  if(!dbInfoGuide)throw new Error('DiceBound requires the Info Guide UI module before dicebound.js');
  function dbInfoExportSave(){
    const data=window.DiceboundSave.exportText(v13NormalizeMeta(meta));
    window.DiceboundPlatform.copyText(data).then(ok=>showToast(ok?'Save copied to clipboard':'Save placed in text box')).catch(()=>showToast('Save placed in text box'));
    return data;
  }
  function dbInfoImportSave(raw){
    try{
      const text=String(raw||'').trim();if(!text)throw new Error('empty');
      meta=window.DiceboundSave.importText(text,{defaultFactory:defaultMeta,normalize:x=>v13NormalizeMeta(x)});
      ensureAlphaMeta();saveMeta();repairTalentPrerequisites();renderClassChoices();updateMetaUI();showToast('Save imported');dbInfoGuide.close();openStartScreen();return true;
    }catch(error){window.DiceboundPlatform.alert('That save string could not be imported.');return false;}
  }
  dbInfoGuide.configure({
    find:$,
    getClasses:()=>Object.values(CLASSES),
    isClassUnlocked,
    getElements:()=>ELEMENTS,
    getArtifactSet:()=>({count:mythicalSetCount(),tiers:v24SetTierData().map(tier=>({pieces:tier.pieces,text:tier.text}))}),
    getLifetimeStats:()=>ensureAlphaMeta(),
    getMetaDamageTaken:()=>meta.damageTaken||0,
    getGoldSnapshot:currentGoldSnapshot,
    isGameStarted:()=>gameStarted,
    exportSave:dbInfoExportSave,
    importSave:dbInfoImportSave,
    onOpen:()=>{meta.infoSeen=true;saveMeta();}
  });
  renderInfo=function(){return dbInfoGuide.render();};
  renderLifetimeStats=function(){return dbInfoGuide.renderStats();};
  activateInfoTab=function(name='guide'){return dbInfoGuide.activateTab(name);};
  openInfo=function(){return dbInfoGuide.open();};
  exportSave=dbInfoExportSave;
  importSave=dbInfoImportSave;
  DB25.modules.guide={render:()=>dbInfoGuide.render()};

})();
