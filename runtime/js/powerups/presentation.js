(function(){
/* DiceBound Powerup presentation owner.
 *
 * Owns Perfected Signature definitions and the exhaustive eligible-powerup
 * chooser. Registry, borrowing, eligibility, application, mutable state and
 * HUD are supplied by their respective authoritative owners.
 */
  const OWNER="powerups/presentation";
  let runtime=Object.freeze({});
  function configure(nextRuntime={}){runtime=Object.freeze({...runtime,...nextRuntime});return api;}
  function requireCapability(name){const value=runtime[name];if(typeof value!=="function")throw new Error("DiceboundPowerupPresentation capability is not configured: "+name);return value;}
  function call(name,...args){return requireCapability(name)(...args);}
  const player=new Proxy({}, {get:(_,key)=>call("getPlayer")[key],set:(_,key,value)=>{call("getPlayer")[key]=value;return true;}});
  const CLASSES=new Proxy({}, {get:(_,key)=>call("getClasses")[key]});
  const rarityInfo=new Proxy({}, {get:(_,key)=>call("getRarityInfo")[key]});
  function $(id){return requireCapability("find")(id);}
  function eligibleUpgrades(filter=()=>true){return call("eligible",filter);}
  function powerupDisplayDesc(powerup){return call("describe",powerup);}
  function choiceHTML(powerup){return call("choiceHtml",powerup);}
  function applyUpgrade(powerup,source){return call("apply",powerup,source);}
  function addLog(html){return call("addLog",html);}
  function showToast(...args){return call("showToast",...args);}
  function updateHUD(){return call("updateHud");}

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
    invoker:{desc:'Perfected Signature — Invoker: Orb passive bonuses are 25% stronger and the first Invoke each combat gains 25% spell potency.',apply(){player.invokerPerfected=true;}},
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
    const sourceId=perfectedSignatureSourceClassId(),sourceClass=CLASSES[sourceId],entry=PERFECTED_SIGNATURES[sourceId];if(!sourceClass||!entry)throw new Error(`Missing Perfected Signature owner for class: ${sourceId}`);
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

  // The authoritative registry is intentionally read-only. Its Perfected
  // Signature entry calls this stable runtime service instead of reaching into
  // this nested UI scope directly (the old cross-scope call made the card
  // visible but unpickable in 3.2.4).
  window.DiceboundPerfectedSignature=Object.freeze({
    applyCurrent:()=>applyPerfectedSignatureSafe(),
    describeCurrent:()=>perfectedSignatureForCurrentClass().desc,
    sourceClassId:()=>perfectedSignatureSourceClassId()
  });
  const api=Object.freeze({
    apiVersion:1,owner:OWNER,configure,
    sourceClassId:perfectedSignatureSourceClassId,
    currentSignature:perfectedSignatureForCurrentClass,
    applyCurrent:applyPerfectedSignatureSafe,
    describeCurrent:()=>perfectedSignatureForCurrentClass().desc,
    openAllEligible:showAllEligiblePowerupSelection,
    inspect:()=>Object.freeze({owner:OWNER,apiVersion:1,signatureCount:Object.keys(PERFECTED_SIGNATURES).length})
  });
  window.DiceboundPowerupPresentation=api;

  // Every powerup card goes through the live description resolver. This means
  // Perfected Signature updates immediately with the current class and never
  // prints the effects for unrelated classes.

  // Paladin's existing Grace gain happens inside the current healPlayer chain.
  // Add only the bonus portion afterwards so old healing/Faith hooks remain intact.

  // Rogue Steal and final Bloodmage Exsanguinate signature behavior are owned by DiceboundClasses.

  /*
    Full eligible-powerup picker. Unlike getUpgradeChoices(), this deliberately
    does not sample or weight the pool: every powerup currently returned by
    eligibleUpgrades() is displayed once. That automatically respects class,
    achievement, unique-taken and Slime borrowing rules.
  */
  function showAllEligiblePowerupSelection(source='Special Powerup Selection',onComplete=()=>{},filter=()=>true){
    if(!call("isGameStarted")){showToast('Start a run before opening the full powerup list.');return false;}
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
})();
