/* DiceBound Items generation owner.
 *
 * Owns canonical ordinary generation plus generated Legendary effects. Invalid
 * rarities and broken generators fail loudly; compatibility demotion/retry/
 * fabricated-item ladders are intentionally retired in 0.6.7.0.
 */
(function(){
  'use strict';

  const OWNER='items/generation';
  const ORDINARY_RARITIES=Object.freeze(['poor','common','uncommon','rare','epic']);
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
    Object.freeze({id:'unstable_ultimate',name:'Unstable Ultimate',icon:'💥',chargeThreshold:70,damageMultiplier:.75,get desc(){return `Ultimates can be used at ${this.chargeThreshold} charge, but deal ${Math.round(this.damageMultiplier*100)}% normal damage.`;}}),
    Object.freeze({id:'pet_mirror',name:'Pet Mirror',icon:'🐾🪞',desc:'After your companion attacks, it has a 25% chance to repeat your most recent elemental proc at 65% power.'}),
    Object.freeze({id:'reverse_engineering',name:'Reverse Engineering',icon:'⚙️↔️',desc:'All Attack and Defense granted by equipped gear swap places while this item is equipped.'})
  ]);
  const EFFECT_BY_ID=Object.freeze(Object.fromEntries(EFFECTS.map(effect=>[effect.id,effect])));

  function createController(services={}){
    const {getPlayer,getMeta,getClassIdentityId,slots,rollGearRarity,pick,random,clamp,seedCode,generateFromSeedCode,rarityBudgets,ordinaryApi}=services;
    const requiredFunctions={getPlayer,getMeta,getClassIdentityId,rollGearRarity,pick,random,clamp,seedCode,generateFromSeedCode};
    for(const [name,value] of Object.entries(requiredFunctions))if(typeof value!=='function')throw new Error(`DiceboundItemGeneration requires ${name}.`);
    if(!Array.isArray(slots)||!slots.length)throw new Error('DiceboundItemGeneration requires equipment slots.');
    if(!ordinaryApi?.generateOrdinaryItem)throw new Error('DiceboundItemGeneration requires DiceboundEquipment ordinary generation.');
    if(!rarityBudgets)throw new Error('DiceboundItemGeneration requires rarity budgets.');

    const player=()=>getPlayer(),meta=()=>getMeta();
    function rawGeneratedGear(rarity,forcedSlot=null){
      if(rarity!=='legendary'&&!ORDINARY_RARITIES.includes(rarity))throw new RangeError(`Unsupported generated gear rarity: ${rarity}`);
      if(forcedSlot!=null&&!slots.includes(forcedSlot))throw new RangeError(`Unsupported equipment slot: ${forcedSlot}`);
      const p=player(),item=ordinaryApi.generateOrdinaryItem({rarity,forcedSlot,slots,pick,random,classId:p.classId,seedCode,generateFromSeedCode,rarityBudgets,clamp});
      if(!item||!slots.includes(item.slot))throw new Error(`Canonical equipment generation failed for ${rarity}${forcedSlot?`/${forcedSlot}`:''}.`);
      return item;
    }
    function eligibleEffects(){const id=getClassIdentityId();return EFFECTS.filter(effect=>!effect.classes||effect.classes.includes(id));}
    function discoveredEffects(){const m=meta();if(!Array.isArray(m.legendaryEffectsDiscovered))m.legendaryEffectsDiscovered=[];return m.legendaryEffectsDiscovered;}
    function chooseEffect(preferUndiscovered=false){
      let pool=eligibleEffects();
      if(preferUndiscovered){const seen=discoveredEffects(),unseen=pool.filter(effect=>!seen.includes(effect.id));if(unseen.length)pool=unseen;}
      if(!pool.length)throw new Error('No Legendary effects are eligible for the active class.');
      return pick(pool);
    }
    function attachLegendaryEffect(item,effect){
      if(!item)throw new Error('Cannot attach a Legendary effect to missing equipment.');
      if(!effect)throw new Error('Legendary effect selection returned no effect.');
      item.rarity='legendary';item.legendaryGenerated=true;item.legendaryEffectId=effect.id;item.legendaryEffectName=effect.name;item.legendaryEffectDesc=effect.desc;item.uniqueEffect=`${effect.icon} ${effect.name}: ${effect.desc}`;item.v24Rarity=true;return item;
    }
    function generateLegendary(forcedSlot=null,preferUndiscovered=false){return attachLegendaryEffect(rawGeneratedGear('legendary',forcedSlot),chooseEffect(preferUndiscovered));}
    function generateEquipment(forceRarity=null,forcedSlot=null){
      const rarity=forceRarity||rollGearRarity(0);
      if(rarity==='legendary')return generateLegendary(forcedSlot,false);
      if(!ORDINARY_RARITIES.includes(rarity))throw new RangeError(`Unsupported generated gear rarity: ${rarity}`);
      return rawGeneratedGear(rarity,forcedSlot);
    }
    function effectCompatible(id,classId=getClassIdentityId()){
      const effect=EFFECT_BY_ID[String(id||"")];
      return !!effect&&(!Array.isArray(effect.classes)||!effect.classes.length||effect.classes.includes(String(classId||"")));
    }
    function hasEffect(id){
      if(Object.values(player().equipment||{}).some(item=>item?.legendaryEffectId===id))return true;
      return player().crucibleEchoEffectId===id&&effectCompatible(id);
    }
    function effectDescription(item){
      const effect=EFFECT_BY_ID[item?.legendaryEffectId],fallback=item?.legendaryEffectDesc||'';
      if(!effect)return fallback;
      if(effect.id!=='hoarders_arsenal')return effect.desc;
      const gold=Math.max(0,Math.floor(Number(player().gold)||0)),bonus=Math.floor(gold/500);
      return `${effect.desc} At your current ${gold} gold, it grants +${bonus} damage per basic and Echo strike while equipped.`;
    }
    return Object.freeze({generateEquipment,generateLegendary,hasEffect,effectCompatible,effectDescription,eligibleEffects,chooseEffect,rawGeneratedGear,owner:OWNER});
  }

  window.DiceboundItemGeneration=Object.freeze({apiVersion:2,owner:OWNER,effects:EFFECTS,effectById:EFFECT_BY_ID,createController});
})();
