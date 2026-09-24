/* DiceBound Heirloom inventory and Vault operation owner.
 *
 * Progression supplies capacity/unlock policy. This Items-internal controller
 * owns stored/active inventory mutations and persistence-safe synchronization.
 */
(function(){
  'use strict';

  const OWNER='items/heirlooms';

  function createController(services={}){
    const {getMeta,normalizeItem,isEligible,storageUnlocked,storageCapacity,activeCapacity,saveMeta,showToast,sfxHoly}=services;
    const required={getMeta,normalizeItem,isEligible,storageUnlocked,storageCapacity,activeCapacity,saveMeta,showToast,sfxHoly};
    for(const [name,value] of Object.entries(required))if(typeof value!=='function')throw new Error(`DiceboundHeirloomOperations requires ${name}.`);

    const meta=()=>getMeta();
    const clone=item=>JSON.parse(JSON.stringify(item));

    function sync(){
      const state=meta(),activeCap=Math.max(0,Number(activeCapacity())||0);
      state.heirlooms=(state.heirlooms||[]).map(normalizeItem).filter(isEligible);
      if(!storageUnlocked()){
        state.heirlooms=state.heirlooms.slice(0,activeCap);
        saveMeta();
        return Object.freeze({unlocked:false,active:state.heirlooms.length,activeCapacity:activeCap});
      }
      const cap=Math.max(0,Number(storageCapacity())||0),byId=new Map((state.heirloomStorage||[]).map(normalizeItem).filter(isEligible).map(item=>[item.id,item]));
      state.heirlooms.forEach(item=>byId.set(item.id,normalizeItem(item)));
      state.heirloomStorage=[...byId.values()].slice(0,cap);
      const storedIds=new Set(state.heirloomStorage.map(item=>item.id));
      state.heirlooms=state.heirlooms.filter(item=>storedIds.has(item.id)).slice(0,activeCap);
      saveMeta();
      return Object.freeze({unlocked:true,stored:state.heirloomStorage.length,storageCapacity:cap,active:state.heirlooms.length,activeCapacity:activeCap});
    }

    function toggleStoredActive(item){
      if(!isEligible(item)){showToast(`${item.name} cannot become an heirloom`);return false;}
      if(!storageUnlocked()){showToast('Unlock the Heirloom Vault first.');return false;}
      const state=meta(),cap=Math.max(0,Number(activeCapacity())||0),active=[...(state.heirlooms||[])];
      const index=active.findIndex(entry=>entry.id===item.id);
      if(index>=0)active.splice(index,1);
      else{
        const sameSlot=active.findIndex(entry=>entry.slot===item.slot);
        if(sameSlot>=0)active.splice(sameSlot,1);
        if(active.length>=cap){showToast(`Active heirloom loadout is full (${cap})`);return false;}
        active.push(normalizeItem(item));
      }
      state.heirlooms=active;saveMeta();return true;
    }

    function discardStored(item){
      const state=meta();
      state.heirloomStorage=(state.heirloomStorage||[]).filter(entry=>entry.id!==item.id);
      state.heirlooms=(state.heirlooms||[]).filter(entry=>entry.id!==item.id);
      saveMeta();showToast(`${item.name} removed from Heirloom Vault`);return true;
    }

    function toggleRunStorage(item){
      if(!isEligible(item)){showToast(`${item.name} cannot become an heirloom`);return false;}
      if(!storageUnlocked()){showToast('Unlock the Heirloom Vault first.');return false;}
      const state=meta(),storage=[...(state.heirloomStorage||[])],index=storage.findIndex(entry=>entry.id===item.id);
      if(index>=0){
        storage.splice(index,1);
        state.heirlooms=(state.heirlooms||[]).filter(entry=>entry.id!==item.id);
      }else{
        const cap=Math.max(0,Number(storageCapacity())||0);
        if(storage.length>=cap){showToast('Heirloom Vault is full');return false;}
        storage.push(normalizeItem(item));
      }
      state.heirloomStorage=storage;saveMeta();return true;
    }

    function toggleLegacy(item){
      if(!isEligible(item)){showToast(`${item.name} cannot become an heirloom`);return false;}
      const state=meta(),cap=Math.max(0,Number(activeCapacity())||0),active=[...(state.heirlooms||[])],index=active.findIndex(entry=>entry.id===item.id);
      if(index>=0)active.splice(index,1);
      else{
        const sameSlot=active.findIndex(entry=>entry.slot===item.slot);
        if(sameSlot>=0)active.splice(sameSlot,1);
        if(active.length>=cap)active.shift();
        active.push(clone(item));sfxHoly();showToast(`${item.name} bound as heirloom`);
      }
      state.heirlooms=active;saveMeta();return true;
    }

    return Object.freeze({owner:OWNER,sync,toggleStoredActive,discardStored,toggleRunStorage,toggleLegacy});
  }

  window.DiceboundHeirloomOperations=Object.freeze({apiVersion:2,owner:OWNER,createController});
})();
