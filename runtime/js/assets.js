(() => {
  "use strict";
  const ROOT="assets";
  const paths=Object.freeze({
    classCampsite:`${ROOT}/characters/classes/campsite`,classBattle:`${ROOT}/characters/classes/battle`,classMarkers:`${ROOT}/characters/classes/markers`,
    uiClassMarkers:`${ROOT}/characters/classes/markers`,petPortraits:`${ROOT}/characters/pets/portraits`,petBattle:`${ROOT}/characters/pets/battle`,normalEnemyBattle:`${ROOT}/enemies/normal/battle`,normalEnemyMarkers:`${ROOT}/enemies/normal/board-markers`,
    minibossBattle:`${ROOT}/enemies/minibosses/battle`,minibossMarkers:`${ROOT}/enemies/minibosses/board-markers`,bossBattle:`${ROOT}/enemies/bosses/battle`,bossMarkers:`${ROOT}/enemies/bosses/board-markers`,secretBossBattle:`${ROOT}/enemies/secret-bosses/battle`,secretBossMarkers:`${ROOT}/enemies/secret-bosses/board-markers`,
    equipmentHat:`${ROOT}/equipment/hat`,powerupPoor:`${ROOT}/powerups/poor`,powerupCommon:`${ROOT}/powerups/common`,powerupUncommon:`${ROOT}/powerups/uncommon`,
    powerupRare:`${ROOT}/powerups/rare`,powerupEpic:`${ROOT}/powerups/epic`,powerupLegendary:`${ROOT}/powerups/legendary`,powerupShared:`${ROOT}/powerups/shared`,powerupClassSpecific:`${ROOT}/powerups/class-specific`,
    campBackground:`${ROOT}/camp/background`,campInteractions:`${ROOT}/camp/interactions`,campDecorations:`${ROOT}/camp/decorations`,nightmareToggle:`${ROOT}/camp/mode-toggles/nightmare`,hellToggle:`${ROOT}/camp/mode-toggles/hell`,
    boardBackgrounds:`${ROOT}/board/backgrounds`,boardEventTiles:`${ROOT}/board/tiles/events`,combatBackgrounds:`${ROOT}/combat/backgrounds`,combatEffects:`${ROOT}/combat/effects`,uiCurrencies:`${ROOT}/ui/currencies`,installerIcons:`${ROOT}/installer/icons`,
    necromancer:`${ROOT}/necromancer`,audio:`${ROOT}/audio`,audioCustom:`${ROOT}/audio/custom`
  });
  const CLASSES=["ranger","sorcerer","fighter","monk","clown","rouge","berserker","turtle","frog","d20","slime","vampire","ninja","ceo","merchant","cleric","paladin","beastmaster","rogue","bloodmage","summoner","pokemontrainer","alchemist","ouroboros","slimerouge","dragoon","invoker","necromancer"];
  const PETS=["neutral","fire","ice","electric","light","void","nature","donut","tech","metal","coffee","gun","radiation","math"];
  const MINI=["ogre-roadwarden","titan-guard","paradox-warden","crownless-auditor","ringbound-chancellor","abyssal-custodian"];
  const BOSS=["ancient-road-dragon","astral-devourer-dragon","nullstar-hydra","crown-eater","ring-tyrant","last-equation"];
  const SECRET=["road-merchant","bloodmage-boss","pale-devil"];
  // Camp's selected-class scene uses the approved full-body artwork through
  // campFigure. Existing chooser/reveal cards retain their campsite/headshot
  // semantic, so the Camp scene cannot silently substitute a portrait.
  const classes=Object.fromEntries(CLASSES.map(id=>[id,Object.freeze({campsite:`${paths.classCampsite}/${id}.png`,headshot:`${paths.classCampsite}/${id}.png`,campFigure:`${paths.classBattle}/${id}.png`,battle:`${paths.classBattle}/${id}.png`,marker:`${paths.classMarkers}/${id}.png`,alt:id})]));
  classes.rouge=Object.freeze({...classes.rouge,campFigure:classes.rouge.campsite,alt:"Rouge"});
  classes.invoker=Object.freeze({...classes.invoker,orbSystem:`${ROOT}/characters/classes/invoker/orb-system-emblem.png`,projectile:`${ROOT}/characters/classes/invoker/tri-element-projectile.png`,grimoire:`${ROOT}/characters/classes/invoker/triad-grimoire-emblem.png`,alt:"Invoker"});
  classes.necromancer=Object.freeze({
    campsite:`${paths.necromancer}/class-necromancer.png`,
    headshot:`${paths.necromancer}/portrait-necromancer.png`,
    campFigure:`${paths.necromancer}/player-necromancer.png`,
    battle:`${paths.necromancer}/player-necromancer.png`,
    cast:`${paths.necromancer}/player-necromancer-cast.png`,
    marker:`${paths.necromancer}/class-necromancer-icon.png`,
    portrait:`${paths.necromancer}/portrait-necromancer.png`,
    portraitCloseup:`${paths.necromancer}/portrait-necromancer-closeup.png`,
    alt:"Necromancer"
  });
  const alliedSummons=Object.freeze({
    "skeleton-warrior":Object.freeze({battle:`${paths.necromancer}/summon-skeleton-warrior.png`,alt:"Skeleton Warrior"}),
    "spectral-skeleton":Object.freeze({battle:`${paths.necromancer}/summon-spectral-skeleton.png`,alt:"Spectral Skeleton"}),
    "skeleton-mage":Object.freeze({battle:`${paths.necromancer}/summon-skeleton-mage.png`,alt:"Skeleton Mage"}),
    "skeleton-guardian":Object.freeze({battle:`${paths.necromancer}/summon-skeleton-guardian.png`,alt:"Skeleton Guardian"}),
    "skeleton-rogue":Object.freeze({battle:`${paths.necromancer}/summon-skeleton-rogue.png`,alt:"Skeleton Rogue"}),
    "skeleton-archer":Object.freeze({battle:`${paths.necromancer}/summon-skeleton-archer.png`,alt:"Skeleton Archer"}),
    "skeleton-priest":Object.freeze({battle:`${paths.necromancer}/summon-skeleton-priest.png`,alt:"Skeleton Priest"})
  });
  const necromancerArt=Object.freeze({
    actions:Object.freeze({
      graveCoil:Object.freeze({image:`${paths.necromancer}/icon-grave-coil.png`,alt:"Grave Coil"}),
      summonSkeleton:Object.freeze({image:`${paths.necromancer}/icon-summon-skeleton.png`,alt:"Summon Skeleton"}),
      armyOfTheDead:Object.freeze({image:`${paths.necromancer}/icon-army-of-the-dead.png`,alt:"Army of the Dead"}),
      graveCount:Object.freeze({image:`${paths.necromancer}/icon-grave-count.png`,alt:"Grave Count"})
    }),
    effects:Object.freeze({
      boneShrapnel:Object.freeze({image:`${paths.necromancer}/effect-bone-shrapnel.png`,alt:"Bone Shrapnel"}),
      necromancyCast:Object.freeze({image:`${paths.necromancer}/effect-necromancy-cast.png`,alt:"Necromancy cast"}),
      summonCircle:Object.freeze({image:`${paths.necromancer}/effect-summon-circle.png`,alt:"Summoning circle"}),
      graveBurst:Object.freeze({image:`${paths.necromancer}/effect-grave-burst.png`,alt:"Grave burst"}),
      soulBurst:Object.freeze({image:`${paths.necromancer}/effect-soul-burst.png`,alt:"Soul burst"}),
      undeadDeathBurst:Object.freeze({image:`${paths.necromancer}/effect-undead-death-burst.png`,alt:"Undead death burst"})
    })
  });
  // The currently approved Pet finals are shared between portrait and battle
  // contexts. Keep both semantic paths explicit so combat never falls back to
  // a UI-context filename when dedicated battle variants arrive later.
  const pets=Object.fromEntries(PETS.map(id=>[id,Object.freeze({portrait:`${paths.petPortraits}/${id}.png`,battle:`${paths.petBattle}/${id}.png`,alt:id})]));
  const guardians=(ids,battleBase,markerBase)=>Object.fromEntries(ids.map(id=>[id,Object.freeze({battle:`${battleBase}/${id}.png`,boardMarker:`${markerBase}/${id}.png`,dedicatedBoardMarker:true,alt:id})]));
  const bossGuardians=guardians(BOSS,paths.bossBattle,paths.bossMarkers);
  bossGuardians["astral-devourer-dragon"]=Object.freeze({...bossGuardians["astral-devourer-dragon"],battle:`${paths.bossBattle}/astral-devourer-dragon-2.png`});
  const normalEnemyBattleArt=(id,file)=>`${paths.normalEnemyBattle}/${id}/${file}`;
  const normalEnemy=(id,alt,portrait=null)=>Object.freeze({portrait,boardMarker:`${paths.normalEnemyMarkers}/${id}.png`,alt});
  const tieredNormalEnemy=(id,alt,portrait=null)=>Object.freeze({...(portrait?{portrait}:{}),battleByBoard:Object.freeze(Object.fromEntries([1,2,3,4,5,6].map(board=>[String(board),normalEnemyBattleArt(id,`board-${board}.png`)]))),boardMarker:`${paths.normalEnemyMarkers}/${id}.png`,alt});
  const powerups=Object.freeze({
    secondWind:{image:`${paths.powerupPoor}/second-wind.png`,alt:"Second Wind"},fieldAlchemy:{image:`${paths.powerupPoor}/field-alchemy.png`,alt:"Field Alchemy"},
    sharperBlade:{image:`${paths.powerupPoor}/sharper-blade.png`,alt:"Sharper Blade"},faintEcho:{image:`${paths.powerupPoor}/faint-echo.png`,alt:"Faint Echo"},
    monsterNotes:{image:`${paths.powerupPoor}/monster-notes.png`,alt:"Monster Notes"},luckyPebble:{image:`${paths.powerupPoor}/lucky-pebble.png`,alt:"Lucky Pebble"},
    heavyPurse:{image:`${paths.powerupPoor}/heavy-purse.png`,alt:"Heavy Purse"},spikedArmor:{image:`${paths.powerupPoor}/spiked-armor.png`,alt:"Spiked Armor"},
    quickdraw:{image:`${paths.powerupCommon}/quickdraw.png`,alt:"Quickdraw"},strongBrew:{image:`${paths.powerupCommon}/strong-brew.png`,alt:"Strong Brew"},
    temperedGuard:{image:`${paths.powerupCommon}/tempered-guard.png`,alt:"Tempered Guard"},stoutHeart:{image:`${paths.powerupCommon}/stout-heart.png`,alt:"Stout Heart"},
    barbedArmor:{image:`${paths.powerupCommon}/barbed-armor.png`,alt:"Barbed Armor"},fieldSurgeon:{image:`${paths.powerupUncommon}/field-surgeon.png`,alt:"Field Surgeon"},
    fortuneBroker:{image:`${paths.powerupUncommon}/fortune-broker.png`,alt:"Fortune Broker"},glassNeedle:{image:`${paths.powerupRare}/glass-needle.png`,alt:"Glass Needle"},
    walkingFortress:{image:`${paths.powerupRare}/walking-fortress.png`,alt:"Walking Fortress"},executioner:{image:`${paths.powerupEpic}/executioner.png`,alt:"Executioner"},
    phoenixFeather:{image:`${paths.powerupEpic}/phoenix-feather.png`,alt:"Phoenix Feather"},worldheart:{image:`${paths.powerupLegendary}/worldheart.png`,alt:"Worldheart"},
    treasureSense:{image:`${paths.powerupShared}/treasure-sense.png`,alt:"Treasure Sense"},scholarsSigil:{image:`${paths.powerupShared}/scholars-sigil.png`,alt:"Scholar's Sigil"},
    toughness:{image:`${paths.powerupPoor}/toughness.png`,alt:"Toughness"},ironSkin:{image:`${paths.powerupPoor}/iron-skin.png`,alt:"Iron Skin"},
    roadsideMending:{image:`${paths.powerupPoor}/roadside-mending.png`,alt:"Roadside Mending"},crackedScope:{image:`${paths.powerupPoor}/cracked-scope.png`,alt:"Cracked Scope"},weakTonic:{image:`${paths.powerupPoor}/weak-tonic.png`,alt:"Weak Tonic"},
    foldedRoadMap:{image:`${paths.powerupShared}/folded-road-map.png`,alt:"Folded Road Map"},cheapVenom:{image:`${paths.powerupShared}/cheap-venom.png`,alt:"Cheap Venom"},keenEye:{image:`${paths.powerupShared}/keen-eye.png`,alt:"Keen Eye"},
    loadedFate:{image:`${paths.powerupCommon}/loaded-fate.png`,alt:"Loaded Fate"},merchantsFriend:{image:`${paths.powerupCommon}/merchants-friend.png`,alt:"Merchant's Friend"},
    pocketConfetti:{image:`${paths.powerupClassSpecific}/pocket-confetti.png`,alt:"Pocket Confetti"},crimsonPrimer:{image:`${paths.powerupClassSpecific}/crimson-primer.png`,alt:"Crimson Primer"},
    scarletCombustion:{image:`${paths.powerupClassSpecific}/scarlet-combustion.png`,alt:"Scarlet Combustion"},glacialShell:{image:`${paths.powerupClassSpecific}/glacial-shell.png`,alt:"Glacial Shell"},orbTheory:{image:`${paths.powerupClassSpecific}/orb-theory.png`,alt:"Orb Theory"},
    "fighter_resolve":{image:"assets/powerups/class-specific/resolute-guard.png",alt:"Resolute Guard"},
    "monk_flow":{image:"assets/powerups/class-specific/flowing-guard.png",alt:"Flowing Guard"},
    "sorcerer_meditation":{image:"assets/powerups/class-specific/arcane-meditation.png",alt:"Arcane Meditation"},
    "berserker_pain":{image:"assets/powerups/class-specific/pain-is-fuel.png",alt:"Pain Is Fuel"},
    "fighter_metal_affinity":{image:"assets/powerups/class-specific/iron-resonance.png",alt:"Iron Resonance"},
    "ranger_nature_affinity":{image:"assets/powerups/class-specific/verdant-arrowheads.png",alt:"Verdant Arrowheads"},
    "sorcerer_void_affinity":{image:"assets/powerups/class-specific/void-channel.png",alt:"Void Channel"},
    "monk_electric_affinity":{image:"assets/powerups/class-specific/storm-kata.png",alt:"Storm Kata"},
    "berserker_fire_affinity":{image:"assets/powerups/class-specific/volcanic-temper.png",alt:"Volcanic Temper"},
    "frog_electric_affinity":{image:"assets/powerups/class-specific/storm-croak.png",alt:"Storm Croak"},
    "vampire_void_affinity":{image:"assets/powerups/class-specific/nights-hunger.png",alt:"Night's Hunger"},
    "ninja_electric_affinity":{image:"assets/powerups/class-specific/lightning-step.png",alt:"Lightning Step"},
    "ceo_tech_affinity":{image:"assets/powerups/class-specific/automated-workforce.png",alt:"Automated Workforce"},
    "merchant_coffee_affinity":{image:"assets/powerups/class-specific/open-all-hours.png",alt:"Open All Hours"},
    "cleric_benediction":{image:"assets/powerups/class-specific/benediction.png",alt:"Benediction"},
    "summoner_deeper_circle":{image:"assets/powerups/class-specific/deeper-circle.png",alt:"Deeper Circle"},
    "dodge":{image:"assets/powerups/uncommon/mist-step.png",alt:"Mist Step"},
    "barrier":{image:"assets/powerups/uncommon/battle-barrier.png",alt:"Battle Barrier"},
    "ranger_echo":{image:"assets/powerups/class-specific/twin-fletching.png",alt:"Twin Fletching"},
    "fighter_riposte":{image:"assets/powerups/class-specific/shield-riposte.png",alt:"Shield Riposte"},
    "monk_palm":{image:"assets/powerups/shared/open-palm-rhythm.png",alt:"Open Palm Rhythm"},
    "sorcerer_resonance":{image:"assets/powerups/shared/arcane-resonance.png",alt:"Arcane Resonance"},
    "rouge_velvet":{image:"assets/powerups/class-specific/velvet-cut.png",alt:"Velvet Cut"},
    "clown_chicken":{image:"assets/powerups/class-specific/rubber-chicken-doctrine.png",alt:"Rubber Chicken Doctrine"},
    "clown_fate":{image:"assets/powerups/class-specific/obviously-loaded-dice.png",alt:"Obviously Loaded Dice"},
    "berserker_counter":{image:"assets/powerups/class-specific/violent-patience.png",alt:"Violent Patience"},
    "clown_prismatic_affinity":{image:"assets/powerups/class-specific/prismatic-accident.png",alt:"Prismatic Accident"},
    "armored_assault":{image:"assets/powerups/class-specific/armored-assault.png",alt:"Armored Assault"},
    "d20_chaos_affinity":{image:"assets/powerups/class-specific/chromatic-twenty.png",alt:"Chromatic Twenty"},
    "rare_dragon_mark":{image:"assets/powerups/uncommon/dragon-mark.png",alt:"Dragon Mark"},
    "evasive_bulwark":{image:"assets/powerups/class-specific/evasive-bulwark.png",alt:"Evasive Bulwark"},
    "rare_prism_lens":{image:"assets/powerups/shared/prism-lens.png",alt:"Prism Lens"},
    "rare_stormstep":{image:"assets/powerups/uncommon/stormstep.png",alt:"Stormstep"},
    "rare_pack_hunter":{image:"assets/powerups/uncommon/pack-hunter.png",alt:"Pack Hunter"},
    "rare_ultimate_vessel":{image:"assets/powerups/uncommon/ultimate-vessel.png",alt:"Ultimate Vessel"},
    "rare_red_flask":{image:"assets/powerups/uncommon/red-flask.png",alt:"Red Flask"},
    "fighter_battering_line":{image:"assets/powerups/class-specific/battering-line.png",alt:"Battering Line"},
    "ranger_thorn_volley":{image:"assets/powerups/class-specific/thorn-volley.png",alt:"Thorn Volley"},
    "clown_banana_law":{image:"assets/powerups/class-specific/banana-peel-law.png",alt:"Banana-Peel Law"},
    "rouge_carmine_veins":{image:"assets/powerups/class-specific/carmine-veins.png",alt:"Carmine Veins"},
    "turtle_shell_memory":{image:"assets/powerups/class-specific/shell-memory.png",alt:"Shell Memory"},
    "d20_bent_probability":{image:"assets/powerups/class-specific/bent-probability.png",alt:"Bent Probability"},
    "vampire_red_mist":{image:"assets/powerups/class-specific/red-mist.png",alt:"Red Mist"},
    "ninja_smoke_math":{image:"assets/powerups/class-specific/smoke-mathematics.png",alt:"Smoke Mathematics"},
    "ceo_hostile_synergy":{image:"assets/powerups/class-specific/hostile-synergy.png",alt:"Hostile Synergy"},
    "merchant_bulk_discount":{image:"assets/powerups/class-specific/bulk-discount-violence.png",alt:"Bulk Discount Violence"},
    "shared_vanguard":{image:"assets/powerups/class-specific/vanguard-doctrine.png",alt:"Vanguard Doctrine"},
    "shared_skirmisher":{image:"assets/powerups/class-specific/skirmishers-tempo.png",alt:"Skirmisher's Tempo"},
    "shared_occult":{image:"assets/powerups/class-specific/occult-convergence.png",alt:"Occult Convergence"},
    "toxicology":{image:"assets/powerups/uncommon/road-toxicology.png",alt:"Road Toxicology"},
    "thorn_venom":{image:"assets/powerups/class-specific/thorn-venom.png",alt:"Thorn Venom"},
    "gunpowder_luck":{image:"assets/powerups/uncommon/loaded-chamber.png",alt:"Loaded Chamber"},
    "cleric_radiance":{image:"assets/powerups/class-specific/radiant-doctrine.png",alt:"Radiant Doctrine"},
    "paladin_smite":{image:"assets/powerups/class-specific/oathbound-smite.png",alt:"Oathbound Smite"},
    "beastmaster_pack":{image:"assets/powerups/class-specific/pack-discipline.png",alt:"Pack Discipline"},
    "rogue_backstab":{image:"assets/powerups/class-specific/profitable-backstab.png",alt:"Profitable Backstab"},
    "summoner_twin_pact":{image:"assets/powerups/class-specific/twin-pact.png",alt:"Twin Pact"},
    "trainer_double_battle":{image:"assets/powerups/class-specific/double-battle.png",alt:"Double Battle"},
    "alchemist_volatile_formula":{image:"assets/powerups/class-specific/volatile-formula.png",alt:"Volatile Formula"},
    "reactive_carapace":{image:"assets/powerups/class-specific/reactive-carapace.png",alt:"Reactive Carapace"},
    "mana_deep_reservoir":{image:"assets/powerups/class-specific/deep-reservoir.png",alt:"Deep Reservoir"},
    "mana_quick_channel":{image:"assets/powerups/class-specific/quick-channel.png",alt:"Quick Channel"},
    "invoker_quas_mastery":{image:"assets/powerups/class-specific/quas-mastery.png",alt:"Quas Mastery"},
    "invoker_wex_mastery":{image:"assets/powerups/class-specific/wex-mastery.png",alt:"Wex Mastery"},
    "invoker_exort_mastery":{image:"assets/powerups/class-specific/exort-mastery.png",alt:"Exort Mastery"},
    "ouro_irradiated_molt":{image:"assets/powerups/class-specific/irradiated-molt.png",alt:"Irradiated Molt"},
    "uncommon_boss_badge_v514":{image:"assets/powerups/uncommon/boss-hunters-badge.png",alt:"Boss Hunter's Badge"},
    "uncommon_leeching_fang_v514":{image:"assets/powerups/uncommon/leeching-fang.png",alt:"Leeching Fang"}
  });
  const POWERUP_ID_KEYS=Object.freeze({
    heal:"secondWind",potion:"fieldAlchemy",attack:"sharperBlade",attack_common_v24:"sharperBlade",
    brew:"strongBrew",alchemist_quick_brew:"strongBrew",defense_common_v24:"temperedGuard",ward:"temperedGuard",hp_common_v24:"stoutHeart",
    thorns:"spikedArmor",thorns_common_v26:"barbedArmor",poor_faint_echo_v514:"faintEcho",poor_monster_notes_v514:"monsterNotes",poor_lucky_pebble_v514:"luckyPebble",
    purse:"heavyPurse",uncommon_field_surgeon_v514:"fieldSurgeon",execute:"executioner",fighter_fortress:"walkingFortress",legendary_worldheart:"worldheart",
    phoenix:"phoenixFeather",uncommon_fortune_broker_v514:"fortuneBroker",gold:"treasureSense",treasure_sense_common_v25:"treasureSense",treasure_sense_uncommon_v25:"treasureSense",
    scholar:"scholarsSigil",scholar_common_v26:"scholarsSigil",scholar_uncommon_v26:"scholarsSigil",ranger_quickdraw:"quickdraw",rare_glass_needle:"glassNeedle",
    hp:"toughness",defense:"ironSkin",mending:"roadsideMending",poor_cracked_scope_v514:"crackedScope",poor_weak_tonic_v514:"weakTonic",
    poor_folded_map_v514:"foldedRoadMap",poor_cheap_venom_v514:"cheapVenom",crit:"keenEye",luck:"loadedFate",merchant:"merchantsFriend",
    clown_confetti:"pocketConfetti",rouge_primer:"crimsonPrimer",rouge_fire_affinity:"scarletCombustion",turtle_ice_affinity:"glacialShell",invoker_orb_theory:"orbTheory",
    echo:"faintEcho",stride:"foldedRoadMap",venom_edge:"cheapVenom"
  });
  const manifest=Object.freeze({version:26,
    enemies:Object.freeze({
      // Battle base art evolves by Board, while board-marker identity and
      // Nightmare/Hell presentation deliberately stay separate concerns.
      slime:tieredNormalEnemy("slime","Slime"),
      goblin:tieredNormalEnemy("goblin","Goblin"),skeleton:tieredNormalEnemy("skeleton","Skeleton"),
      wolf:tieredNormalEnemy("wolf","Wolf",normalEnemyBattleArt("wolf","portrait.png")),bandit:tieredNormalEnemy("bandit","Bandit",normalEnemyBattleArt("bandit","portrait.png")),
      orc:tieredNormalEnemy("orc","Orc"),cultist:tieredNormalEnemy("cultist","Cultist"),wraith:tieredNormalEnemy("wraith","Wraith"),
      troll:tieredNormalEnemy("troll","Troll",normalEnemyBattleArt("troll","portrait.png")),demon:tieredNormalEnemy("demon","Demon"),lich:tieredNormalEnemy("lich","Lich")
    }),
    minibosses:Object.freeze(guardians(MINI,paths.minibossBattle,paths.minibossMarkers)),bosses:Object.freeze(bossGuardians),secretBosses:Object.freeze(guardians(SECRET,paths.secretBossBattle,paths.secretBossMarkers)),
    classes:Object.freeze(classes),randomClass:Object.freeze({campsite:`${ROOT}/characters/random-class/campsite/random-class.png`,alt:"Random class"}),pets:Object.freeze(pets),allies:alliedSummons,necromancer:necromancerArt,powerups,
    camp:Object.freeze({objects:Object.freeze({bonfire:{image:`${paths.campDecorations}/bonfire.png`,alt:"Bonfire"},roadCaravan:{image:`${paths.campInteractions}/road-caravan.png`,alt:"Horse pulling a modern caravan"},infoBooks:{image:`${paths.campInteractions}/info-books.png`,alt:"Stack of books and scrolls"},talentStar:{image:`${paths.campInteractions}/talent-star.png`,alt:"Northern star of talents"},prestigeMoon:{image:`${paths.campInteractions}/prestige-moon.png`,alt:"Glowing full moon"},careerTent:{image:`${paths.campInteractions}/career-tent.png`,alt:"Career tent and records"},achievementTier1:{image:`${paths.campInteractions}/achievements/tier-1.png`,alt:"Achievement trophy tier 1"},achievementTier2:{image:`${paths.campInteractions}/achievements/tier-2.png`,alt:"Achievement trophy tier 2"},achievementTier3:{image:`${paths.campInteractions}/achievements/tier-3.png`,alt:"Achievement trophy tier 3"},achievementTier4:{image:`${paths.campInteractions}/achievements/tier-4.png`,alt:"Achievement trophy tier 4"},achievementTier5:{image:`${paths.campInteractions}/achievements/tier-5.png`,alt:"Achievement trophy tier 5"},achievementTier6:{image:`${paths.campInteractions}/achievements/tier-6.png`,alt:"Achievement trophy tier 6"},achievementKeg:{image:`${paths.campInteractions}/achievement-keg.png`,alt:"Legacy ale keg and trophy"},optionsCog:{image:`${paths.campInteractions}/options-cog.png`,alt:"Steampunk options cog"},nightmareOff:{image:`${paths.nightmareToggle}/off.png`,alt:"Nightmare creature hidden"},nightmareOn:{image:`${paths.nightmareToggle}/on.png`,alt:"Nightmare creature emerged"},hellOn:{image:`${paths.hellToggle}/on.png`,alt:"Active Hell volcano with a dancing devil"},chest:{image:`${paths.campInteractions}/chest.png`,alt:"Treasure chest"}}),backgrounds:Object.freeze({campsite:{image:`${paths.campBackground}/campsite.png`,alt:"Star-lit campsite clearing",focus:"50% 50%"}})}),
    board:Object.freeze({backgrounds:Object.freeze(Object.fromEntries([1,2,3,4,5,6].map((n,i)=>[String(n),{image:`${paths.boardBackgrounds}/board-${n}-${["green-road","astral-road","fractured-road","crown-road","oblivion-ringroad","end-of-mathematics"][i]}.png`,alt:`Board ${n}`}]))),events:Object.freeze({gambler:{image:`${paths.boardEventTiles}/gambler.png`,alt:"Gambler"}})}),
    combat:Object.freeze({backgrounds:Object.freeze({normal:Object.freeze(Object.fromEntries([1,2,3,4,5,6].map(n=>[String(n),Object.freeze({image:`${paths.combatBackgrounds}/board-${n}-normal.png`,alt:`Board ${n} Normal battle background`,focus:"50% 50%"})]))),nightmare:Object.freeze(Object.fromEntries([1,2,3,4,5,6].map(n=>[String(n),Object.freeze({image:`${paths.combatBackgrounds}/board-${n}-nightmare.png`,alt:`Board ${n} Nightmare battle background`,focus:"50% 50%"})]))),hell:Object.freeze(Object.fromEntries([1,2,3,4,5,6].map(n=>[String(n),Object.freeze({image:`${paths.combatBackgrounds}/board-${n}-hell.png`,alt:`Board ${n} Hell battle background`,focus:"50% 50%"})])))} ),effects:Object.freeze({naturePoisonVines:Object.freeze({frames:Object.freeze([1,2,3,4,5,6,7,8].map(frame=>`${paths.combatEffects}/nature/nature-poison-vines-${String(frame).padStart(2,"0")}.png`)),frameDurationMs:75,alt:"Thorny poison vines erupt, lash, and recede"}),donutProcRain:Object.freeze({frames:Object.freeze([1,2,3,4,5,6].map(frame=>`${paths.combatEffects}/donut/donut-proc-rain-${String(frame).padStart(2,"0")}.png`)),frameWidth:362,frameHeight:724,frameDurationMs:240,durationMs:1450,alt:"A magical cloud rains colorful donuts across the battlefield"}),gunProc:Object.freeze({frames:Object.freeze(["gun_spawn_01_no_arm.png","gun_fire_02_no_arm.png","gun_muzzle_smoke_03.png","gun_muzzle_flash_04.png","gun_bullet_tracer_05.png","gun_bullet_trail_06.png","gun_shell_casing_07.png","gun_impact_burst_08.png","gun_blood_burst_09.png","gun_blood_splatter_10.png"].map(file=>`${paths.combatEffects}/gun/${file}`)),frameDurationMs:78,alt:"A gun materializes, fires toward its target, and leaves an impact burst"}),fireProc:Object.freeze({frames:Object.freeze(["fire_embers_01.png","fire_impact_01.png","fire_impact_02.png","fire_impact_03.png","fire_launch_01.png","fire_launch_02.png","fire_trail_overlay_01.png","fire_travel_01.png","fire_travel_02.png"].map(file=>`${paths.combatEffects}/fire/${file.replaceAll("_","-")}`)),frameDurationMs:78,alt:"A fireball launches from the attacker, travels to its target, and explodes"})})}),
    equipment:Object.freeze({hat:Object.freeze({helmet:{image:`${paths.equipmentHat}/helmet.png`,alt:"Helmet"}})}),
    ui:Object.freeze({icons:Object.freeze({chest:{image:`${paths.campInteractions}/chest.png`,alt:"Treasure chest"},coins:{image:`${paths.uiCurrencies}/coins.png`,alt:"Coins"},troll:{image:normalEnemyBattleArt("troll","portrait.png"),alt:"Troll"},helmet:{image:`${paths.equipmentHat}/helmet.png`,alt:"Helmet"},quickdraw:powerups.quickdraw,heavyPurse:powerups.heavyPurse,bandit:{image:normalEnemyBattleArt("bandit","portrait.png"),alt:"Bandit"},gambler:{image:`${paths.boardEventTiles}/gambler.png`,alt:"Gambler"},glassNeedle:powerups.glassNeedle})}),
    audio:Object.freeze({sfx:Object.freeze(Object.fromEntries(["roll","step","hit","crit","coin","heal","lose","level","win","holy"].map(x=>[x,{customBase:x,alt:x}])) )})
  });
  const files=[]; const add=x=>{if(x&&!files.includes(x))files.push(x)}; const walk=x=>{if(!x)return;if(typeof x==="string"&&x.startsWith("assets/")&&/\.(png|ico)$/i.test(x))add(x);else if(Array.isArray(x))x.forEach(walk);else if(typeof x==="object")Object.values(x).forEach(walk)}; walk(manifest);
  // assets.js is deliberately loadable on its own for release auditing, so it
  // cannot inspect DiceboundEquipment yet. Keep the required preload mirror
  // compact and grouped by slot instead of repeating full paths.
  const EQUIPMENT_PRELOAD=Object.freeze({
    weapon:Object.freeze(["bronze-longsword","shortbow","rubber-chicken","crimson-brush","tongue-lash","10th-birthday-balloons","ashen-staff","birthday-cake","ashcore-pyrestaff","oak-shortbow","bronze-battleaxe","abyssal-wand","adamant-halberd","adamant-crossbow","adamant-claws","abyssal-whip","adamant-scimitar","air-battlestaff","adamant-2h-sword","adamant-battleaxe"]),
    offhand:Object.freeze(["candlecrown-gateau","bronze-round-shield","iron-round-shield","spellbook","arcane-tome","bag-of-confetti","acid-bubble","barbed-quiver","axels-coffee-mug","ancestral-shell","bottomless-purse","blood-goblet","abyssal-orb","aegis-shield"]),
    hat:Object.freeze(["bronze-full-helm","hunter-hood","basinet","bucket","crimson-veil","crown","kratz-headphones","bloodbound-hat","crown-of-twenty-faces","feathered-cap","adamant-full-helm","champion-hat"]),
    chest:Object.freeze(["bronze-platebody","leather-harness","band-t-shirt","boneweave","cardigan","blood-iron-cuirass","ancient-armour","constellation-mantle","croaking-vest","archon-plate","balrog-skin"]),
    legs:Object.freeze(["bronze-platelegs","ranger-trousers","bogstrider-wraps","executive-legs","chain-leggings","distillers-legs","bane-platelegs","moonweave-trousers","gel-trousers","bloodbound-legs","consecrated-legs"]),
    boots:Object.freeze(["bronze-armoured-boots","trail-boots","astral-slippers","bloodmarch-boots","cloudstep-sandals","demonhide-boots","adamant-armoured-boots","impossible-stilts","lion-sabatons","bane-armoured-boots","champion-boots"]),
    ring:Object.freeze(["mood-ring","gel-loop","lion-signet","falcon-band","jade-band","distillers-ring","ring-of-random-integers","ring-pop-of-power","blood-oath-band","consecrated-ring"]),
    amulet:Object.freeze(["decennial-jubilee-balloons","hawkeye-charm","distillers-amulet","dragon-tooth","astral-prism","golden-fly","executive-amulet","honking-medallion","lotus-pendant","bloodbound-amulet","champion-amulet"])
  });
  Object.entries(EQUIPMENT_PRELOAD).forEach(([slot,names])=>names.forEach(name=>add(`${ROOT}/equipment/${slot}/${name}.png`)));
  // Retired source art remains inventoried but is never returned by a resolver.
  add(`${ROOT}/powerups/_legacy/heavy-purse-beta-0.6.png`); add(`${paths.installerIcons}/dicebound-launcher.ico`); add(`${paths.installerIcons}/dicebound-launcher.png`);
  const SOUND_EXTENSIONS=Object.freeze(["ogg","mp3","wav","webm"]); const buildSoundCandidates=base=>SOUND_EXTENSIONS.map(ext=>`${paths.audioCustom}/${base}.${ext}`);
  const matchers=[{key:"slime",test:/\bslime\b/i},{key:"goblin",test:/\bgoblin\b/i},{key:"skeleton",test:/\bskeleton\b/i},{key:"wolf",test:/\bwolf\b/i},{key:"bandit",test:/\bbandit\b/i},{key:"orc",test:/\borc\b/i},{key:"cultist",test:/\bcultist\b/i},{key:"wraith",test:/\bwraith\b/i},{key:"troll",test:/\btroll\b/i},{key:"demon",test:/\b(?:demon|devil)\b/i},{key:"lich",test:/\blich\b/i}];
  const GUARDIAN_MARKER_MATCHERS=Object.freeze([
    {key:"ogre-roadwarden",test:/ogre\s+roadwarden/i},{key:"titan-guard",test:/titan\s+guard/i},{key:"paradox-warden",test:/paradox\s+warden/i},
    {key:"crownless-auditor",test:/crownless\s+auditor/i},{key:"ringbound-chancellor",test:/ringbound\s+chancellor/i},{key:"abyssal-custodian",test:/abyssal\s+custodian/i},
    {key:"ancient-road-dragon",test:/ancient\s+road\s+dragon/i},{key:"astral-devourer-dragon",test:/astral\s+devourer\s+dragon/i},{key:"nullstar-hydra",test:/nullstar\s+hydra/i},
    {key:"crown-eater",test:/crown[-\s]?eater/i},{key:"ring-tyrant",test:/ring\s+tyrant/i},{key:"last-equation",test:/last\s+equation/i},
    {key:"road-merchant",test:/road\s+merchant/i},{key:"bloodmage-boss",test:/\bbloodmage\b/i},{key:"pale-devil",test:/pale\s+devil/i}
  ]);
  const matchEnemy=name=>/\bpale\s+devil\b/i.test(String(name))?null:matchers.find(x=>x.test.test(String(name)));
  const normalizeBattleBoard=level=>Math.min(6,Math.max(1,Math.floor(Number(level)||1)));
  const ENEMY_MODE_AURAS=Object.freeze({normal:Object.freeze({id:"normal",className:""}),nightmare:Object.freeze({id:"nightmare",className:"db-enemy-mode-nightmare"}),hell:Object.freeze({id:"hell",className:"db-enemy-mode-hell"})});
  const normalizeEnemyMode=mode=>String(mode||"normal").toLowerCase()==="hell"?"hell":String(mode||"normal").toLowerCase()==="nightmare"?"nightmare":"normal";
  const normalEnemyEntry=id=>manifest.enemies[String(id)]||null;
  const resolveEnemyPortraitById=id=>{const e=normalEnemyEntry(id);return e?.portrait?Object.freeze({key:String(id),src:e.portrait,alt:e.alt||String(id)}):null};
  const resolveEnemyBattleArtById=(id,level=1)=>{const e=normalEnemyEntry(id);if(!e)return null;const board=normalizeBattleBoard(level),src=e.battleByBoard?.[String(board)]||null;return src?Object.freeze({key:String(id),src,alt:e.alt||String(id),board}):null};
  const resolveEnemyMarkerById=id=>{const e=normalEnemyEntry(id);return e?.boardMarker?Object.freeze({key:String(id),src:e.boardMarker,alt:e.alt||String(id)}):null};
  const resolveEnemyPortrait=name=>{const m=matchEnemy(name);if(!m)return null;const e=manifest.enemies[m.key];return e.portrait?Object.freeze({key:m.key,src:e.portrait,alt:e.alt||String(name)}):null};
  const resolveEnemyBattleArt=(name,level=1)=>{const m=matchEnemy(name);if(!m)return null;const e=manifest.enemies[m.key],board=normalizeBattleBoard(level),src=e.battleByBoard?.[String(board)]||null;return src?Object.freeze({key:m.key,src,alt:e.alt||String(name),board}):null};
  const resolveEnemyMarker=name=>{const m=matchEnemy(name);if(!m)return null;const e=manifest.enemies[m.key];return e.boardMarker?Object.freeze({key:m.key,src:e.boardMarker,alt:e.alt||String(name)}):null};
  const resolveEnemyModeAura=mode=>ENEMY_MODE_AURAS[normalizeEnemyMode(mode)];
  const resolveGuardianArt=id=>manifest.minibosses[String(id)]||manifest.bosses[String(id)]||manifest.secretBosses[String(id)]||null;
  const resolveMarkerByName=name=>{const normal=resolveEnemyMarker(name);if(normal)return normal;const m=GUARDIAN_MARKER_MATCHERS.find(x=>x.test.test(String(name)));if(!m)return null;const e=resolveGuardianArt(m.key);return e?Object.freeze({key:m.key,src:e.boardMarker,alt:e.alt||String(name)}):null};
  const resolveClassArt=id=>manifest.classes[String(id)]||null; const resolveRandomClassArt=()=>manifest.randomClass; const resolvePetArt=id=>manifest.pets[String(id)]||manifest.pets.neutral; const resolveAllyArt=id=>manifest.allies[String(id)]||null; const resolveNecromancerArt=(group,key)=>manifest.necromancer?.[String(group)]?.[String(key)]||null;
  const resolveCampObject=key=>manifest.camp.objects[key]||null; const resolveCampBackground=key=>manifest.camp.backgrounds[key]||manifest.camp.backgrounds.campsite;
  const resolveUiIcon=key=>manifest.ui.icons[key]||manifest.powerups[key]||null;
  const resolvePowerupArt=key=>manifest.powerups[key]||manifest.ui.icons[key]||null;
  const resolvePowerupArtFor=powerup=>resolvePowerupArt(String(powerup?.id||""))||resolvePowerupArt(POWERUP_ID_KEYS[String(powerup?.id||"")]||String(powerup?.artKey||""));
  const resolveBoardBackground=level=>manifest.board.backgrounds[String(Number(level)||1)]||manifest.board.backgrounds["1"];
  const resolveCombatBackground=(level,mode="normal")=>{const normalized=String(mode||"normal").toLowerCase(),backgrounds=manifest.combat.backgrounds[normalized];return backgrounds?.[String(Number(level)||1)]||backgrounds?.["1"]||null};
  const resolveCombatEffect=key=>manifest.combat.effects[key]||null;
  const resolveEquipmentArt=itemOrId=>{
    const equipment=window.DiceboundEquipment;
    const identity=typeof itemOrId==="string"?equipment?.equipmentIdentity?.(itemOrId):equipment?.identityForItem?.(itemOrId);
    return identity?.art?Object.freeze({key:identity.id,image:identity.art.image,alt:identity.art.alt||identity.displayName,visual:identity.visual||null}):null;
  };
  const resolveSoundEffect=(name,pack="custom")=>{const e=manifest.audio.sfx[name];return !e||pack!=="custom"?null:Object.freeze({key:name,pack,candidates:buildSoundCandidates(e.customBase),alt:e.alt||String(name)})};
  window.DiceboundAssets=Object.freeze({root:ROOT,paths,manifest,files:Object.freeze(files),powerupIdKeys:POWERUP_ID_KEYS,soundExtensions:SOUND_EXTENSIONS,resolveEnemyPortrait,resolveEnemyBattleArt,resolveEnemyMarker,resolveEnemyPortraitById,resolveEnemyBattleArtById,resolveEnemyMarkerById,resolveEnemyModeAura,resolveMarkerByName,resolveGuardianArt,resolveClassArt,resolveRandomClassArt,resolvePetArt,resolveAllyArt,resolveNecromancerArt,resolveCampObject,resolveCampBackground,resolveUiIcon,resolvePowerupArt,resolvePowerupArtFor,resolveBoardBackground,resolveCombatBackground,resolveCombatEffect,resolveEquipmentArt,resolveSoundEffect});

  // Powerup cards resolve art directly from stable registry IDs. Road-marker
  // decoration remains DOM-observed until the Board renderer is fully semantic.
  function markerImage(entry,alt,klass='db-art-icon db-art-portrait db-road-marker'){
    const img=document.createElement('img');img.className=klass;img.src=entry.src;img.alt=alt||entry.alt||entry.key;img.draggable=false;img.dataset.roadMarker=entry.key;return img;
  }
  function markerEntryForGuardianTile(tile){
    const img=tile.querySelector('.tile-icon img');
    const src=img?.getAttribute('src')||'';
    const fromSrc=src.split('/').pop()?.replace(/\.png(?:\?.*)?$/i,'');
    if(fromSrc){const entry=resolveGuardianArt(fromSrc);if(entry)return Object.freeze({key:fromSrc,src:entry.boardMarker,alt:img?.alt||fromSrc});}
    return resolveMarkerByName(img?.alt||'');
  }
  function decorateBoardTile(node){
    if(!node.matches?.('.tile'))return;
    const icon=node.querySelector('.tile-icon');if(!icon)return;
    let entry=null,count=1;
    if(node.classList.contains('enemy')){
      const label=node.querySelector('.tile-label')?.textContent||'';
      entry=resolveEnemyMarker(label);
      // Current Beta 0.6 mixed packs expose only "Enemy pack · N" in the DOM,
      // so leave their generic pack glyph intact instead of showing the wrong creature.
      if(!entry)return;
      count=Number(icon.querySelector('b')?.textContent?.replace(/\D/g,''))||Number(label.match(/(\d+)\s+enemies/i)?.[1])||Number(label.match(/×\s*(\d+)/)?.[1])||Number(label.match(/pack\s*·\s*(\d+)/i)?.[1])||1;
    }else if(node.classList.contains('miniboss')||node.classList.contains('boss'))entry=markerEntryForGuardianTile(node);
    else if(node.classList.contains('devilboss'))entry={key:'pale-devil',src:manifest.secretBosses['pale-devil'].boardMarker,alt:'Pale Devil'};
    if(!entry||icon.dataset.roadMarker===entry.key)return;
    icon.dataset.roadMarker=entry.key;
    if(count>1){const wrap=document.createElement('span');wrap.className='db-enemy-pack-art';wrap.append(markerImage(entry,entry.alt));const badge=document.createElement('b');badge.textContent=`×${count}`;wrap.append(badge);icon.replaceChildren(wrap);}
    else icon.replaceChildren(markerImage(entry,entry.alt,((node.classList.contains('miniboss')||node.classList.contains('boss')||node.classList.contains('devilboss'))?'db060-guardian-tile-art ':'')+'db-road-marker'));
  }
  function decorateCombatTarget(chip){
    if(!chip.matches?.('.enemy-chip'))return;
    const entry=resolveMarkerByName(chip.getAttribute('title')||chip.textContent||'');if(!entry)return;
    let img=chip.querySelector('img.db-road-target-image');
    if(img?.dataset.roadMarker===entry.key)return;
    if(!img){img=markerImage(entry,entry.alt,'db-road-target-image');chip.prepend(img);}
    else{img.src=entry.src;img.alt=entry.alt||entry.key;img.dataset.roadMarker=entry.key;}
  }
  function decorateRoadMarkers(root=document){
    const nodes=[];
    if(root?.matches?.('.tile,.enemy-chip'))nodes.push(root);
    root?.querySelectorAll?.('.tile,.enemy-chip').forEach(n=>nodes.push(n));
    nodes.forEach(n=>n.matches('.enemy-chip')?decorateCombatTarget(n):decorateBoardTile(n));
  }
  function installRoadMarkerObserver(){
    if(!document.body||document.body.dataset.diceboundRoadMarkerObserver==='1')return false;
    document.body.dataset.diceboundRoadMarkerObserver='1';
    if(!document.getElementById('dicebound-road-marker-style')){const style=document.createElement('style');style.id='dicebound-road-marker-style';style.textContent='.db-road-marker{display:block;object-fit:contain;max-width:100%;max-height:100%;margin:auto}.tile-icon>.db-road-marker,.db-enemy-pack-art .db-road-marker{width:42px;height:42px}#combatOverlay .enemy-chip img.db-road-target-image{display:block!important;width:28px;height:28px;object-fit:contain;margin:0 auto 3px}';document.head?.appendChild(style);}
    const observer=new MutationObserver(records=>records.forEach(r=>{const tile=r.target?.closest?.('.tile');if(tile)decorateBoardTile(tile);const chip=r.target?.closest?.('.enemy-chip');if(chip)decorateCombatTarget(chip);r.addedNodes.forEach(n=>{if(n.nodeType===1)decorateRoadMarkers(n);});}));
    observer.observe(document.body,{subtree:true,childList:true});
    setTimeout(()=>decorateRoadMarkers(document),0);
    return true;
  }
  if(typeof MutationObserver==='function'){
    if(!installRoadMarkerObserver())document.addEventListener('DOMContentLoaded',installRoadMarkerObserver,{once:true});
  }
  window.DiceboundRoadMarkerArt=Object.freeze({version:2,refresh:()=>decorateRoadMarkers(document),resolveMarkerByName});
})();
