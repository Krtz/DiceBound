(() => {
  "use strict";
  const ROOT="assets";
  const paths=Object.freeze({
    classCampsite:`${ROOT}/characters/classes/campsite`,classBattle:`${ROOT}/characters/classes/battle`,classMarkers:`${ROOT}/characters/classes/markers`,
    uiClassMarkers:`${ROOT}/characters/classes/markers`,petPortraits:`${ROOT}/characters/pets/portraits`,normalEnemyBattle:`${ROOT}/enemies/normal/battle`,
    minibossBattle:`${ROOT}/enemies/minibosses/battle`,bossBattle:`${ROOT}/enemies/bosses/battle`,secretBossBattle:`${ROOT}/enemies/secret-bosses/battle`,
    equipmentHat:`${ROOT}/equipment/hat`,powerupPoor:`${ROOT}/powerups/poor`,powerupCommon:`${ROOT}/powerups/common`,powerupUncommon:`${ROOT}/powerups/uncommon`,
    powerupRare:`${ROOT}/powerups/rare`,powerupEpic:`${ROOT}/powerups/epic`,powerupLegendary:`${ROOT}/powerups/legendary`,powerupShared:`${ROOT}/powerups/shared`,
    campBackground:`${ROOT}/camp/background`,campInteractions:`${ROOT}/camp/interactions`,campDecorations:`${ROOT}/camp/decorations`,nightmareToggle:`${ROOT}/camp/mode-toggles/nightmare`,
    boardBackgrounds:`${ROOT}/board/backgrounds`,boardEventTiles:`${ROOT}/board/tiles/events`,uiCurrencies:`${ROOT}/ui/currencies`,installerIcons:`${ROOT}/installer/icons`,
    audio:`${ROOT}/audio`,audioCustom:`${ROOT}/audio/custom`
  });
  const CLASSES=["ranger","sorcerer","fighter","monk","clown","rouge","berserker","turtle","frog","d20","slime","vampire","ninja","ceo","merchant","cleric","paladin","beastmaster","rogue","bloodmage","summoner","pokemontrainer","alchemist","ouroboros","slimerouge"];
  const PETS=["neutral","fire","ice","electric","light","void","nature","donut","tech","metal","coffee","gun","radiation"];
  const MINI=["ogre-roadwarden","titan-guard","paradox-warden","crownless-auditor","ringbound-chancellor","abyssal-custodian"];
  const BOSS=["ancient-road-dragon","astral-devourer-dragon","nullstar-hydra","crown-eater","ring-tyrant","last-equation"];
  const SECRET=["road-merchant","bloodmage-boss","pale-devil"];
  const classes=Object.fromEntries(CLASSES.map(id=>[id,Object.freeze({campsite:`${paths.classCampsite}/${id}.png`,headshot:`${paths.classCampsite}/${id}.png`,battle:`${paths.classBattle}/${id}.png`,marker:`${paths.classMarkers}/${id}.png`,alt:id})]));
  const pets=Object.fromEntries(PETS.map(id=>[id,Object.freeze({portrait:`${paths.petPortraits}/${id}.png`,alt:id})]));
  const guardians=(ids,base)=>Object.fromEntries(ids.map(id=>[id,Object.freeze({battle:`${base}/${id}.png`,boardMarker:`${base}/${id}.png`,dedicatedBoardMarker:false,alt:id})]));
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
    treasureSense:{image:`${paths.powerupShared}/treasure-sense.png`,alt:"Treasure Sense"},scholarsSigil:{image:`${paths.powerupShared}/scholars-sigil.png`,alt:"Scholar's Sigil"}
  });
  const manifest=Object.freeze({version:8,
    enemies:Object.freeze({wolf:{portrait:`${paths.normalEnemyBattle}/wolf.png`,alt:"Wolf"},bandit:{portrait:`${paths.normalEnemyBattle}/bandit.png`,alt:"Bandit"},troll:{portrait:`${paths.normalEnemyBattle}/troll.png`,alt:"Troll"}}),
    minibosses:Object.freeze(guardians(MINI,paths.minibossBattle)),bosses:Object.freeze(guardians(BOSS,paths.bossBattle)),secretBosses:Object.freeze(guardians(SECRET,paths.secretBossBattle)),
    classes:Object.freeze(classes),pets:Object.freeze(pets),powerups,
    camp:Object.freeze({objects:Object.freeze({bonfire:{image:`${paths.campDecorations}/bonfire.png`,alt:"Bonfire"},roadCaravan:{image:`${paths.campInteractions}/road-caravan.png`,alt:"Horse pulling a modern caravan"},infoBooks:{image:`${paths.campInteractions}/info-books.png`,alt:"Stack of books and scrolls"},talentStar:{image:`${paths.campInteractions}/talent-star.png`,alt:"Northern star of talents"},prestigeMoon:{image:`${paths.campInteractions}/prestige-moon.png`,alt:"Glowing full moon"},achievementKeg:{image:`${paths.campInteractions}/achievement-keg.png`,alt:"Ale keg and trophy"},optionsCog:{image:`${paths.campInteractions}/options-cog.png`,alt:"Steampunk options cog"},nightmareOff:{image:`${paths.nightmareToggle}/off.png`,alt:"Nightmare creature hidden"},nightmareOn:{image:`${paths.nightmareToggle}/on.png`,alt:"Nightmare creature emerged"},chest:{image:`${paths.campInteractions}/chest.png`,alt:"Treasure chest"}}),backgrounds:Object.freeze({campsite:{image:`${paths.campBackground}/campsite.png`,alt:"Star-lit campsite clearing",focus:"50% 50%"}})}),
    board:Object.freeze({backgrounds:Object.freeze(Object.fromEntries([1,2,3,4,5,6].map((n,i)=>[String(n),{image:`${paths.boardBackgrounds}/board-${n}-${["green-road","astral-road","fractured-road","crown-road","oblivion-ringroad","end-of-mathematics"][i]}.png`,alt:`Board ${n}`}]))),events:Object.freeze({gambler:{image:`${paths.boardEventTiles}/gambler.png`,alt:"Gambler"}})}),
    equipment:Object.freeze({hat:Object.freeze({helmet:{image:`${paths.equipmentHat}/helmet.png`,alt:"Helmet"}})}),
    ui:Object.freeze({icons:Object.freeze({chest:{image:`${paths.campInteractions}/chest.png`,alt:"Treasure chest"},coins:{image:`${paths.uiCurrencies}/coins.png`,alt:"Coins"},troll:{image:`${paths.normalEnemyBattle}/troll.png`,alt:"Troll"},helmet:{image:`${paths.equipmentHat}/helmet.png`,alt:"Helmet"},quickdraw:powerups.quickdraw,heavyPurse:powerups.heavyPurse,bandit:{image:`${paths.normalEnemyBattle}/bandit.png`,alt:"Bandit"},gambler:{image:`${paths.boardEventTiles}/gambler.png`,alt:"Gambler"},glassNeedle:powerups.glassNeedle})}),
    audio:Object.freeze({sfx:Object.freeze(Object.fromEntries(["roll","step","hit","crit","coin","heal","lose","level","win","holy"].map(x=>[x,{customBase:x,alt:x}])) )})
  });
  const files=[]; const add=x=>{if(x&&!files.includes(x))files.push(x)}; const walk=x=>{if(!x)return;if(typeof x==="string"&&x.startsWith("assets/")&&/\.(png|ico)$/i.test(x))add(x);else if(Array.isArray(x))x.forEach(walk);else if(typeof x==="object")Object.values(x).forEach(walk)}; walk(manifest);
  // Retired source art remains inventoried but is never returned by a resolver.
  add(`${ROOT}/powerups/_legacy/heavy-purse-beta-0.6.png`); add(`${paths.installerIcons}/dicebound-launcher.ico`); add(`${paths.installerIcons}/dicebound-launcher.png`);
  const SOUND_EXTENSIONS=Object.freeze(["ogg","mp3","wav","webm"]); const buildSoundCandidates=base=>SOUND_EXTENSIONS.map(ext=>`${paths.audioCustom}/${base}.${ext}`);
  const matchers=[{key:"wolf",test:/\bwolf\b/i},{key:"bandit",test:/\bbandit\b/i},{key:"troll",test:/\btroll\b/i}];
  const resolveEnemyPortrait=name=>{const m=matchers.find(x=>x.test.test(String(name)));if(!m)return null;const e=manifest.enemies[m.key];return Object.freeze({key:m.key,src:e.portrait,alt:e.alt||String(name)})};
  const resolveGuardianArt=id=>manifest.minibosses[String(id)]||manifest.bosses[String(id)]||manifest.secretBosses[String(id)]||null;
  const resolveClassArt=id=>manifest.classes[String(id)]||manifest.classes.ranger; const resolvePetArt=id=>manifest.pets[String(id)]||manifest.pets.neutral;
  const resolveCampObject=key=>manifest.camp.objects[key]||null; const resolveCampBackground=key=>manifest.camp.backgrounds[key]||manifest.camp.backgrounds.campsite;
  const resolveUiIcon=key=>manifest.ui.icons[key]||manifest.powerups[key]||null; const resolvePowerupArt=key=>manifest.powerups[key]||manifest.ui.icons[key]||null;
  const resolveBoardBackground=level=>manifest.board.backgrounds[String(Number(level)||1)]||manifest.board.backgrounds["1"];
  const resolveSoundEffect=(name,pack="custom")=>{const e=manifest.audio.sfx[name];return !e||pack!=="custom"?null:Object.freeze({key:name,pack,candidates:buildSoundCandidates(e.customBase),alt:e.alt||String(name)})};
  window.DiceboundAssets=Object.freeze({root:ROOT,paths,manifest,files:Object.freeze(files),soundExtensions:SOUND_EXTENSIONS,resolveEnemyPortrait,resolveGuardianArt,resolveClassArt,resolvePetArt,resolveCampObject,resolveCampBackground,resolveUiIcon,resolvePowerupArt,resolveBoardBackground,resolveSoundEffect});

  // Art bridge for the recovered monolith's closure-owned powerup objects.
  // It decorates rendered powerup choices from the authoritative registry,
  // avoiding a second art-path table inside the 0.6 gameplay bundle.
  const POWERUP_NAME_KEYS=Object.freeze({
    "Second Wind":"secondWind","Field Alchemy":"fieldAlchemy","Sharper Blade":"sharperBlade","Sharpened Steel":"sharperBlade",
    "Strong Brew":"strongBrew","Quick Brew":"strongBrew","Tempered Guard":"temperedGuard","Runic Ward":"temperedGuard","Stout Heart":"stoutHeart",
    "Spiked Armor":"spikedArmor","Barbed Armor":"barbedArmor","Faint Echo":"faintEcho","Monster Notes":"monsterNotes","Lucky Pebble":"luckyPebble",
    "Heavy Purse":"heavyPurse","Field Surgeon":"fieldSurgeon","Executioner":"executioner","Walking Fortress":"walkingFortress","Worldheart":"worldheart",
    "Phoenix Feather":"phoenixFeather","Fortune Broker":"fortuneBroker","Treasure Sense+":"treasureSense","Treasure Sense++":"treasureSense",
    "Scholar's Sigil":"scholarsSigil","Scholar's Sigil+":"scholarsSigil","Scholar's Sigil++":"scholarsSigil","Quickdraw":"quickdraw","Glass Needle":"glassNeedle"
  });
  function decoratePowerupChoices(root=document){
    root.querySelectorAll?.('.choice-name').forEach(nameEl=>{
      const name=nameEl.textContent?.trim(),key=POWERUP_NAME_KEYS[name],entry=key&&resolvePowerupArt(key);
      if(!entry?.image)return;
      const host=nameEl.parentElement?.querySelector?.('.choice-icon');
      if(!host||host.dataset.assetArchitecture==='1')return;
      const img=document.createElement('img');img.className='db-art-icon db-art-choice';img.src=entry.image;img.alt=entry.alt||name;img.draggable=false;
      host.replaceChildren(img);host.dataset.assetArchitecture='1';
    });
  }
  if(typeof MutationObserver==='function'&&document.body){
    new MutationObserver(rs=>rs.forEach(r=>r.addedNodes.forEach(n=>n.nodeType===1&&decoratePowerupChoices(n)))).observe(document.body,{subtree:true,childList:true});
    setTimeout(()=>decoratePowerupChoices(document),0);
  }
  window.DiceboundPowerupArt=Object.freeze({version:1,nameKeys:POWERUP_NAME_KEYS,refresh:()=>decoratePowerupChoices(document)});
})();
