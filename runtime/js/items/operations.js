/* DiceBound Items operation owner.
 * Owns the released score/value/comparison/equip semantics while composition
 * supplies runtime state, UI effects and the few cross-domain transformations.
 */
(function(){
  'use strict';

  const OWNER='items/operations';
  const BASE_WEIGHTS=Object.freeze({attack:7,defense:8,maxHp:.55,crit:45,dodge:38,lifeSteal:45,luck:18,goldBonus:20,potionPower:15,bossDamage:34,doubleStrike:42,classBurst:30,extraStepChance:18,damageBonus:50,flatReduction:11});
  const INTRINSIC_WEIGHTS=Object.freeze({...BASE_WEIGHTS,maxMana:.7,petDamageScale:34,elementProcBonus:45});
  const POWER_FLOORS=Object.freeze({common:13,uncommon:23,rare:37,epic:58,legendary:90,mythical:135,omega:175});
  const SELL_MULTIPLIERS=Object.freeze({poor:.68,common:.82,uncommon:.98,rare:1.16,epic:1.40,legendary:2.15,artifact:2.6,mythical:3.1,omega:4.2});

  function createController(services={}){
    const {
      getPlayer,getMeta,rarityValues,equipmentApi,classIdentityActive,bonusLabel,
      applyItemStats,clearGearTransform,applyGearTransform,usesMana,equipmentMana,syncMana,
      recordCareerGoldEarned,setStatsLastGold,rarityLabel,sfxLevel,sfxCoin,showToast,addLog,
      renderEquipment,updateHUD
    }=services;
    const required={getPlayer,getMeta,classIdentityActive,bonusLabel,applyItemStats,clearGearTransform,applyGearTransform,usesMana,equipmentMana,syncMana,recordCareerGoldEarned,setStatsLastGold,rarityLabel,sfxLevel,sfxCoin,showToast,addLog,renderEquipment,updateHUD};
    for(const [name,value] of Object.entries(required))if(typeof value!=='function')throw new Error(`DiceboundItemOperations requires ${name}.`);
    if(!rarityValues)throw new Error('DiceboundItemOperations requires rarity values.');
    if(!equipmentApi?.intrinsicBonusesForItem||!equipmentApi?.elementProcBonusesForItem||!equipmentApi?.allBonusesForItem)throw new Error('DiceboundItemOperations requires equipment identity bonus helpers.');

    function player(){return getPlayer();}

    function baseVisibleScore(item){
      if(!item)return 0;
      let score=(rarityValues[item.rarity]||0)*3+(item.element?7:0)+(item.mythical?100:0);
      for(const [key,value] of Object.entries(item.bonuses||{}))score+=Math.abs(value)*(BASE_WEIGHTS[key]||2);
      return score;
    }

    function fallbackPower(item){
      if(!item)return 0;
      if(Number(item.spentPower)>0)return Number(item.spentPower);
      if(Number(item.itemPower)>0)return Number(item.itemPower);
      const floor=POWER_FLOORS[item.rarity]||25;
      return Math.max(floor,Math.round(baseVisibleScore(item)*.72));
    }

    function rawSellValue(item){
      const power=fallbackPower(item),multiplier=SELL_MULTIPLIERS[item?.rarity]||1;
      return Math.max(6,Math.round((10+power*1.45+power*power*.042)*multiplier));
    }

    function sellValue(item){
      const base=rawSellValue(item);
      return classIdentityActive('merchant')?Math.round(base*2):base;
    }

    function score(item){
      if(!item)return 0;
      let total=baseVisibleScore(item)+fallbackPower(item)*2.15+(item.element?10:0)+(item.legendaryEffectId?180:0);
      for(const [key,value] of Object.entries(equipmentApi.intrinsicBonusesForItem(item)||{}))total+=Math.abs(value)*(INTRINSIC_WEIGHTS[key]||2);
      for(const value of Object.values(equipmentApi.elementProcBonusesForItem(item)||{}))total+=Math.abs(value)*INTRINSIC_WEIGHTS.elementProcBonus;
      return total;
    }

    function formatComparison(item,current){
      if(!current)return '<b>Empty slot.</b> Equipping this item will not replace anything.';
      const deltaScore=score(item)-score(current),incoming=equipmentApi.allBonusesForItem(item),equipped=equipmentApi.allBonusesForItem(current),deltas=[];
      const keys=new Set([...Object.keys(equipped),...Object.keys(incoming)]);
      keys.forEach(key=>{
        const delta=(incoming[key]||0)-(equipped[key]||0);
        if(Math.abs(delta)>.0001){
          const label=bonusLabel(key,Math.abs(delta)).replace(/^\+/, '');
          deltas.push(`<span class="${delta>0?'better':'worse'}">${delta>0?'+':'−'}${label}</span>`);
        }
      });
      const incomingProcs=equipmentApi.elementProcBonusesForItem(item)||{},equippedProcs=equipmentApi.elementProcBonusesForItem(current)||{};
      new Set([...Object.keys(equippedProcs),...Object.keys(incomingProcs)]).forEach(element=>{
        const delta=(incomingProcs[element]||0)-(equippedProcs[element]||0);
        if(Math.abs(delta)>.0001){
          const label=bonusLabel(`elementProc:${element}`,Math.abs(delta)).replace(/^\+/,'');
          deltas.push(`<span class="${delta>0?'better':'worse'}">${delta>0?'+':'−'}${label}</span>`);
        }
      });
      const quality=deltaScore>12?'<span class="better">Overall quality: stronger</span>':deltaScore<-12?'<span class="worse">Overall quality: weaker</span>':'<span class="same">Overall quality: similar</span>';
      return `${quality}<br>${deltas.length?deltas.join(' · '):'<span class="same">No numerical stat change</span>'}`;
    }

    function equip(item,silent=false){
      const p=player();
      // Special/Artifact gear must receive its modern base identity before any
      // stat transaction so its Intrinsic is real gameplay, not presentation.
      equipmentApi.repairPresentationFields?.(item,{classId:p.classId});
      // 0.6.4.21 was the outermost historical wrapper: snapshot the non-gear
      // Mana pool before any old/new gear mutation or Legendary transform.
      const priorEquipmentMana=usesMana()?equipmentMana():0;
      const baseMaxMana=Math.max(0,(Number(p.maxMana)||0)-priorEquipmentMana),currentMana=Number(p.mana)||0;

      // 0.6 Legendary transforms wrapped the v1.5 replacement transaction.
      clearGearTransform();
      const old=p.equipment?.[item.slot],willSell=!silent&&old&&old.id!==item.id,sale=willSell?sellValue(old):0;

      // Original equip transaction.
      if(old)applyItemStats(old,-1);
      p.equipment[item.slot]=JSON.parse(JSON.stringify(item));
      applyItemStats(item,1);
      if(!silent){
        sfxLevel();
        showToast(`Equipped ${item.name}`);
        addLog(`Equipped <b>${item.name}</b> (${rarityLabel(item.rarity)}).`);
      }
      renderEquipment();
      updateHUD();

      // v1.5 automatic sale of replaced gear occurred after the base equip.
      if(willSell){
        p.gold+=sale;
        recordCareerGoldEarned(sale);
        setStatsLastGold(p.gold);
        sfxCoin();
        addLog(`Auto-sold replaced <b>${old.name}</b> for <b>${sale} gold</b>.`);
        showToast(`Equipped ${item.name} · old gear +${sale}g`);
        updateHUD();
      }

      applyGearTransform();
      renderEquipment();
      updateHUD();

      // Mana synchronization remained the final outer step.
      syncMana({baseMaxMana,currentMana});
      return undefined;
    }

    return Object.freeze({owner:OWNER,baseVisibleScore,fallbackPower,rawSellValue,sellValue,score,formatComparison,equip});
  }

  window.DiceboundItemOperations=Object.freeze({apiVersion:2,owner:OWNER,createController});
})();
