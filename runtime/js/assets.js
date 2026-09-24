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
    audio:`${ROOT}/audio`,audioCustom:`${ROOT}/audio/custom`
  });
  const CLASSES=["ranger","sorcerer","fighter","monk","clown","rouge","berserker","turtle","frog","d20","slime","vampire","ninja","ceo","merchant","cleric","paladin","beastmaster","rogue","bloodmage","summoner","pokemontrainer","alchemist","ouroboros","slimerouge","dragoon","invoker"];
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
    scarletCombustion:{image:`${paths.powerupClassSpecific}/scarlet-combustion.png`,alt:"Scarlet Combustion"},glacialShell:{image:`${paths.powerupClassSpecific}/glacial-shell.png`,alt:"Glacial Shell"},orbTheory:{image:`${paths.powerupClassSpecific}/orb-theory.png`,alt:"Orb Theory"}
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
  const manifest=Object.freeze({version:25,
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
    classes:Object.freeze(classes),randomClass:Object.freeze({campsite:`${ROOT}/characters/random-class/campsite/random-class.png`,alt:"Random class"}),pets:Object.freeze(pets),powerups,
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
    weapon:Object.freeze(["bronze-longsword","shortbow","rubber-chicken","crimson-brush","tongue-lash","10th-birthday-balloons","ashen-staff","birthday-cake","ashcore-pyrestaff","oak-shortbow","bronze-battleaxe","abyssal-wand","adamant-halberd","adamant-crossbow","adamant-claws"]),
    offhand:Object.freeze(["candlecrown-gateau","bronze-round-shield","iron-round-shield","spellbook","arcane-tome","bag-of-confetti","acid-bubble","barbed-quiver","axels-coffee-mug"]),
    hat:Object.freeze(["bronze-full-helm","hunter-hood","basinet","bucket","crimson-veil","crown","kratz-headphones"]),
    chest:Object.freeze(["bronze-platebody","leather-harness","band-t-shirt","boneweave","cardigan","blood-iron-cuirass"]),
    legs:Object.freeze(["bronze-platelegs","ranger-trousers","bogstrider-wraps","executive-legs","chain-leggings","distillers-legs"]),
    boots:Object.freeze(["bronze-armoured-boots","trail-boots","astral-slippers","bloodmarch-boots","cloudstep-sandals","demonhide-boots"]),
    ring:Object.freeze(["mood-ring","gel-loop","lion-signet","falcon-band","jade-band"]),
    amulet:Object.freeze(["decennial-jubilee-balloons","hawkeye-charm","distillers-amulet","dragon-tooth","astral-prism","golden-fly"])
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
  const resolveClassArt=id=>manifest.classes[String(id)]||null; const resolveRandomClassArt=()=>manifest.randomClass; const resolvePetArt=id=>manifest.pets[String(id)]||manifest.pets.neutral;
  const resolveCampObject=key=>manifest.camp.objects[key]||null; const resolveCampBackground=key=>manifest.camp.backgrounds[key]||manifest.camp.backgrounds.campsite;
  const resolveUiIcon=key=>manifest.ui.icons[key]||manifest.powerups[key]||null;
  const resolvePowerupArt=key=>manifest.powerups[key]||manifest.ui.icons[key]||null;
  const resolvePowerupArtFor=powerup=>resolvePowerupArt(POWERUP_ID_KEYS[String(powerup?.id||"")]||String(powerup?.artKey||""));
  const resolveBoardBackground=level=>manifest.board.backgrounds[String(Number(level)||1)]||manifest.board.backgrounds["1"];
  const resolveCombatBackground=(level,mode="normal")=>{const normalized=String(mode||"normal").toLowerCase(),backgrounds=manifest.combat.backgrounds[normalized];return backgrounds?.[String(Number(level)||1)]||backgrounds?.["1"]||null};
  const resolveCombatEffect=key=>manifest.combat.effects[key]||null;
  const resolveEquipmentArt=itemOrId=>{
    const equipment=window.DiceboundEquipment;
    const identity=typeof itemOrId==="string"?equipment?.equipmentIdentity?.(itemOrId):equipment?.identityForItem?.(itemOrId);
    return identity?.art?Object.freeze({key:identity.id,image:identity.art.image,alt:identity.art.alt||identity.displayName,visual:identity.visual||null}):null;
  };
  const resolveSoundEffect=(name,pack="custom")=>{const e=manifest.audio.sfx[name];return !e||pack!=="custom"?null:Object.freeze({key:name,pack,candidates:buildSoundCandidates(e.customBase),alt:e.alt||String(name)})};
  window.DiceboundAssets=Object.freeze({root:ROOT,paths,manifest,files:Object.freeze(files),powerupIdKeys:POWERUP_ID_KEYS,soundExtensions:SOUND_EXTENSIONS,resolveEnemyPortrait,resolveEnemyBattleArt,resolveEnemyMarker,resolveEnemyPortraitById,resolveEnemyBattleArtById,resolveEnemyMarkerById,resolveEnemyModeAura,resolveMarkerByName,resolveGuardianArt,resolveClassArt,resolveRandomClassArt,resolvePetArt,resolveCampObject,resolveCampBackground,resolveUiIcon,resolvePowerupArt,resolvePowerupArtFor,resolveBoardBackground,resolveCombatBackground,resolveCombatEffect,resolveEquipmentArt,resolveSoundEffect});

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
