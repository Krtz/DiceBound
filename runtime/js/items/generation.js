/* DiceBound Items generation owner.
 *
 * Owns the released ordinary-generation compatibility ladder and generated
 * Legendary effect selection. The monolith supplies runtime state/RNG adapters;
 * callers reach this owner through DiceboundItems.
 */
(function(){
  'use strict';

  const OWNER='items/generation';
  const ORDINARY_RARITIES=Object.freeze(['poor','common','uncommon','rare','epic']);
  const COMPAT_DEMOTE_RARITIES=Object.freeze(['legendary','artifact','mythical','omega']);

  const EFFECTS=Object.freeze([
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
  const EFFECT_BY_ID=Object.freeze(Object.fromEntries(EFFECTS.map(effect=>[effect.id,effect])));

  function createController(services={}){
    const {
      getPlayer,getMeta,getBoardLevel,getClassIdentityId,
      slots,slotLabels,rarityValues,gearNames,rarityPrefixes,rarityBudgets,elementKeys,
      rollGearRarity,pick,random,rand,clamp,gearIcon,elementChanceForRarity,
      seedCode,generateFromSeedCode,ordinaryApi,logError,stateForLog
    }=services;
    const requiredFunctions={getPlayer,getMeta,getBoardLevel,getClassIdentityId,rollGearRarity,pick,random,rand,clamp,gearIcon,elementChanceForRarity,seedCode,generateFromSeedCode,logError,stateForLog};
    for(const [name,value] of Object.entries(requiredFunctions))if(typeof value!=='function')throw new Error(`DiceboundItemGeneration requires ${name}.`);
    if(!Array.isArray(slots)||!slots.length)throw new Error('DiceboundItemGeneration requires equipment slots.');
    if(!ordinaryApi?.generateOrdinaryItem)throw new Error('DiceboundItemGeneration requires DiceboundEquipment ordinary generation.');
    if(!rarityBudgets||!rarityValues||!gearNames||!rarityPrefixes||!slotLabels||!Array.isArray(elementKeys))throw new Error('DiceboundItemGeneration requires released item registries.');

    function player(){return getPlayer();}
    function meta(){return getMeta();}
    function boardLevel(){return Number(getBoardLevel())||1;}

    // Exact pre-v1.4 fallback. This looks odd on invalid rarity by design: the
    // 0.6.6.26 oracle freezes that shipped compatibility behavior.
    function legacyGenerate(forceRarity=null,forcedSlot=null){
      const p=player(),rarity=forceRarity||rollGearRarity(0),tier=rarityValues[rarity],slot=forcedSlot||pick(slots),progress=Math.floor(p.position/16);
      const names=(gearNames[slot]&&gearNames[slot][p.classId])||gearNames[slot];
      const item={id:`gear_${Date.now()}_${random().toString(36).slice(2,8)}`,slot,rarity,icon:gearIcon(slot),name:`${rarityPrefixes[rarity]} ${pick(names)}`,bonuses:{}};
      const power=tier+Math.floor(progress/2);
      if(slot==='weapon')item.bonuses.attack=Math.max(1,power+rand(0,1));
      if(slot==='offhand'){
        if(p.classId==='fighter')item.bonuses.defense=Math.max(1,Math.ceil(power*.65));
        else if(p.classId==='ranger')item.bonuses.crit=.015*tier+.005*progress;
        else if(p.classId==='sorcerer')item.bonuses.attack=Math.max(1,Math.ceil(power*.55));
        else if(p.classId==='monk'){item.bonuses.doubleStrike=.012*tier;item.bonuses.dodge=.008*tier;}
        else if(p.classId==='clown')item.bonuses.luck=.025*tier;
        else if(p.classId==='rouge')item.bonuses.lifeSteal=.014*tier;
        else if(p.classId==='berserker')item.bonuses.attack=Math.max(1,Math.ceil(power*.55));
        else if(p.classId==='turtle')item.bonuses.defense=Math.max(1,Math.ceil(power*.8));
        else if(p.classId==='frog')item.bonuses.doubleStrike=.015*tier;
        else if(p.classId==='d20')item.bonuses.luck=.03*tier;
        else if(p.classId==='slime')item.bonuses.maxHp=2*tier;
      }
      if(slot==='boots')item.bonuses.dodge=.012*tier+.003*progress;
      if(slot==='legs')item.bonuses.maxHp=3*tier+progress*2;
      if(slot==='chest')item.bonuses.defense=Math.max(1,Math.ceil(tier*.55)+Math.floor(progress/3));
      if(slot==='hat')item.bonuses.crit=.01*tier+.002*progress;
      if(slot==='ring')item.bonuses.goldBonus=.04*tier;
      if(slot==='amulet')item.bonuses.lifeSteal=.018*tier;
      if(tier>=3){
        const secondary=pick(['maxHp','attack','crit','luck','potionPower','bossDamage']);
        if(secondary==='maxHp')item.bonuses.maxHp=(item.bonuses.maxHp||0)+tier*2;
        if(secondary==='attack')item.bonuses.attack=(item.bonuses.attack||0)+Math.max(1,tier-2);
        if(secondary==='crit')item.bonuses.crit=(item.bonuses.crit||0)+.01*(tier-1);
        if(secondary==='luck')item.bonuses.luck=(item.bonuses.luck||0)+.035*(tier-2);
        if(secondary==='potionPower')item.bonuses.potionPower=(item.bonuses.potionPower||0)+.12*(tier-2);
        if(secondary==='bossDamage')item.bonuses.bossDamage=(item.bonuses.bossDamage||0)+.08*(tier-2);
      }
      if(item.slot==='weapon'&&random()<elementChanceForRarity(item.rarity))item.element=pick(elementKeys);
      return item;
    }

    // Released v1.5 ordinary path. Unsupported rarity intentionally falls to
    // the old generator rather than inventing a new compatibility rule.
    function ordinaryV15(forceRarity=null,forcedSlot=null){
      const p=player(),rarity=forceRarity||rollGearRarity(0);
      if(!rarityBudgets[rarity])return legacyGenerate(forceRarity,forcedSlot);
      const slot=forcedSlot||pick(slots),classId=p.classId,qualityBoost=Math.min(8,Math.floor((boardLevel()-1)*1.5+p.position/32));
      const core=`${Math.floor(random()*0xffffffff).toString(36)}${Math.floor(random()*0xffffffff).toString(36)}`;
      return generateFromSeedCode(seedCode(rarity,slot,classId,qualityBoost,core));
    }

    function compatibilityV24(forceRarity=null,forcedSlot=null){
      if(forceRarity&&COMPAT_DEMOTE_RARITIES.includes(forceRarity))forceRarity='epic';
      return ordinaryV15(forceRarity,forcedSlot);
    }

    function safeCompatibility(forceRarity=null,forcedSlot=null){
      let item=null;
      try{item=compatibilityV24(forceRarity,forcedSlot);}catch(error){
        logError('Equipment generation threw',{error:String(error),stack:error?.stack||'',forceRarity,forcedSlot,state:stateForLog()});
      }
      if(item&&slots.includes(item.slot))return item;
      logError('Invalid/null generated equipment; using Common fallback',{forceRarity,forcedSlot,item,state:stateForLog()});
      try{item=compatibilityV24('common',forcedSlot||pick(slots));}catch(error){
        logError('Common equipment fallback threw',{error:String(error),stack:error?.stack||'',state:stateForLog()});
      }
      if(item&&slots.includes(item.slot))return item;
      const slot=forcedSlot&&slots.includes(forcedSlot)?forcedSlot:pick(slots);
      return {id:`gear_failsafe_${Date.now()}_${random().toString(36).slice(2,7)}`,slot,rarity:'common',icon:gearIcon(slot),name:`Reliable ${slotLabels[slot]}`,bonuses:{maxHp:5},failsafe:true};
    }

    function rawGeneratedGear(rarity,forcedSlot=null){
      const p=player();
      return ordinaryApi.generateOrdinaryItem({rarity,forcedSlot,slots,pick,random,classId:p.classId,seedCode,generateFromSeedCode,rarityBudgets,clamp});
    }

    function eligibleEffects(){
      const id=getClassIdentityId();
      return EFFECTS.filter(effect=>!effect.classes||effect.classes.includes(id));
    }
    function discoveredEffects(){
      const m=meta();
      if(!Array.isArray(m.legendaryEffectsDiscovered))m.legendaryEffectsDiscovered=[];
      return m.legendaryEffectsDiscovered;
    }
    function chooseEffect(preferUndiscovered=false){
      let pool=eligibleEffects();
      if(preferUndiscovered){const seen=discoveredEffects(),unseen=pool.filter(effect=>!seen.includes(effect.id));if(unseen.length)pool=unseen;}
      return pick(pool.length?pool:EFFECTS);
    }
    function attachLegendaryEffect(item,effect=null){
      if(!item)return item;
      const chosen=effect||chooseEffect(false);
      item.rarity='legendary';item.legendaryGenerated=true;item.legendaryEffectId=chosen.id;item.legendaryEffectName=chosen.name;item.legendaryEffectDesc=chosen.desc;item.uniqueEffect=`${chosen.icon} ${chosen.name}: ${chosen.desc}`;item.v24Rarity=true;
      return item;
    }
    function generateLegendary(forcedSlot=null,preferUndiscovered=false){
      let item=rawGeneratedGear('legendary',forcedSlot);
      if(!item){item=rawGeneratedGear('epic',forcedSlot);if(item)item.rarity='legendary';}
      return attachLegendaryEffect(item,chooseEffect(preferUndiscovered));
    }
    function generateEquipment(forceRarity=null,forcedSlot=null){
      const rarity=forceRarity||rollGearRarity(0);
      if(rarity==='legendary')return generateLegendary(forcedSlot,false);
      if(ORDINARY_RARITIES.includes(rarity))return rawGeneratedGear(rarity,forcedSlot)||safeCompatibility(rarity,forcedSlot);
      return safeCompatibility(forceRarity,forcedSlot);
    }
    function hasEffect(id){return Object.values(player().equipment||{}).some(item=>item?.legendaryEffectId===id);}

    return Object.freeze({generateEquipment,generateLegendary,hasEffect,eligibleEffects,chooseEffect,rawGeneratedGear,owner:OWNER});
  }

  window.DiceboundItemGeneration=Object.freeze({apiVersion:1,owner:OWNER,effects:EFFECTS,effectById:EFFECT_BY_ID,createController});
})();
