/* DiceBound Items public subsystem facade.
 *
 * Ordinary callers depend on DiceboundItems rather than coordinating focused
 * generation, equipment and Heirloom internals directly.
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
  function configure(nextRuntime={}){runtime=Object.freeze({...runtime,...nextRuntime});return api;}
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
  function syncHeirloomState(options){return requireCapability('syncHeirloomState')(options);}
  function toggleStoredHeirloomActive(item){return requireCapability('toggleStoredHeirloomActive')(item);}
  function discardStoredHeirloom(item){return requireCapability('discardStoredHeirloom')(item);}
  function toggleRunHeirloomStorage(item){return requireCapability('toggleRunHeirloomStorage')(item);}
  function toggleLegacyHeirloom(item){return requireCapability('toggleLegacyHeirloom')(item);}
  function inspect(){
    return Object.freeze({
      owner:OWNER,
      configured:Object.freeze(Object.fromEntries([
        'generateEquipment','generateLegendary','rollGearRarity','openLoot','equip','sellValue','rawSellValue','score','formatBonuses','formatComparison',
        'syncHeirloomState','toggleStoredHeirloomActive','discardStoredHeirloom','toggleRunHeirloomStorage','toggleLegacyHeirloom'
      ].map(name=>[name,typeof runtime[name]==='function'])))
    });
  }

  const api=Object.freeze({
    configure,generateEquipment,generateLegendary,rollGearRarity,openLoot,equip,sellValue,rawSellValue,score,formatBonuses,formatComparison,
    syncHeirloomState,toggleStoredHeirloomActive,discardStoredHeirloom,toggleRunHeirloomStorage,toggleLegacyHeirloom,
    inspect,owner:OWNER
  });
  window.DiceboundItems=api;
})();
