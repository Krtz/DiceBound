/* DiceBound Items public subsystem facade.
 *
 * Ordinary callers should depend on DiceboundItems rather than coordinating the
 * equipment, loot and legacy generator surfaces directly. During migration the
 * monolith configures the still-authoritative released implementations behind
 * this boundary; focused Items internals will replace those callbacks in place.
 */
(function(){
  'use strict';

  const OWNER='items/facade';
  let runtime=Object.freeze({});

  function requireCapability(name){
    const fn=runtime[name];
    if(typeof fn!=='function')throw new Error(`DiceboundItems capability is not configured: ${name}`);
    return fn;
  }
  function configure(nextRuntime={}){
    runtime=Object.freeze({...runtime,...nextRuntime});
    return api;
  }
  function generateEquipment(rarity=null,slot=null){return requireCapability('generateEquipment')(rarity,slot);}
  function generateLegendary(slot=null,preferUndiscovered=false){return requireCapability('generateLegendary')(slot,preferUndiscovered);}
  function rollGearRarity(bonus=0){return requireCapability('rollGearRarity')(bonus);}
  function openLoot(item,done){return requireCapability('openLoot')(item,done);}
  function equip(item,silent=false){return requireCapability('equip')(item,silent);}
  function sellValue(item){return requireCapability('sellValue')(item);}
  function rawSellValue(item){return requireCapability('rawSellValue')(item);}
  function score(item){return requireCapability('score')(item);}
  function formatBonuses(item){return requireCapability('formatBonuses')(item);}
  function formatComparison(item,current){return requireCapability('formatComparison')(item,current);}
  function inspect(){
    return Object.freeze({
      owner:OWNER,
      configured:Object.freeze({
        generateEquipment:typeof runtime.generateEquipment==='function',
        generateLegendary:typeof runtime.generateLegendary==='function',
        rollGearRarity:typeof runtime.rollGearRarity==='function',
        openLoot:typeof runtime.openLoot==='function',
        equip:typeof runtime.equip==='function',
        sellValue:typeof runtime.sellValue==='function',
        rawSellValue:typeof runtime.rawSellValue==='function',
        score:typeof runtime.score==='function',
        formatBonuses:typeof runtime.formatBonuses==='function',
        formatComparison:typeof runtime.formatComparison==='function'
      })
    });
  }

  const api=Object.freeze({configure,generateEquipment,generateLegendary,rollGearRarity,openLoot,equip,sellValue,rawSellValue,score,formatBonuses,formatComparison,inspect,owner:OWNER});
  window.DiceboundItems=api;
})();
