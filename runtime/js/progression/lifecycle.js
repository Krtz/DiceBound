/* DiceBound Progression public subsystem owner.
 *
 * This is the semantic owner for Talent/Legacy progression and the final
 * Prestige reset transaction. Focused registries/domains remain separate:
 * progression/talents.js owns Talent data and progression/prestige.js owns
 * Prestige currency/Moon purchase math. The compatibility runtime supplies
 * composition callbacks for persistence, presentation and active-run state.
 */
(() => {
  'use strict';

  const OWNER='progression/facade';
  const PRESTIGE=window.DiceboundPrestige;
  if(!PRESTIGE?.award)throw new Error('DiceboundProgression requires DiceboundPrestige.');

  let runtime=Object.freeze({});
  function configure(nextRuntime={}){runtime=Object.freeze({...runtime,...nextRuntime});return api;}
  function requireCapability(name){const fn=runtime[name];if(typeof fn!=='function')throw new Error(`DiceboundProgression capability is not configured: ${name}`);return fn;}
  function call(name,...args){return requireCapability(name)(...args);}
  function meta(){return call('getMeta');}
  function talents(){return call('getTalents');}

  function talentRank(id){return Math.max(0,Number(meta().purchased?.[id])||0);}
  function gameplayTalentRank(id){const source=call('getRunTalentSnapshot')||meta().purchased||{};return Math.max(0,Number(source[id])||0);}
  function setRunTalentSnapshot(value){return call('setRunTalentSnapshot',value);}
  function runTalentSnapshot(){return call('getRunTalentSnapshot');}
  function withRunTalentSnapshot(work){
    if(typeof work!=='function')throw new TypeError('DiceboundProgression.withRunTalentSnapshot requires a callback.');
    const snapshot=runTalentSnapshot();
    if(!snapshot)return work();
    const state=meta(),live=state.purchased;
    try{state.purchased=snapshot;return work();}
    finally{state.purchased=live;}
  }
  function talentAvailable(input){
    const talent=typeof input==='string'?talents().find(entry=>entry.id===input):input;
    return !!talent&&(talent.requires||[]).every(requirement=>talentRank(requirement.id)>=requirement.rank);
  }
  function allocatedTalentPoints(){return talents().reduce((sum,talent)=>sum+talentRank(talent.id)*talent.cost,0);}
  function repairTalentPrerequisites(){
    const entries=talents(),byId=Object.fromEntries(entries.map(talent=>[talent.id,talent]));let changed=true,guard=0;
    while(changed&&guard++<100){changed=false;for(const talent of entries){if(!talentRank(talent.id))continue;for(const requirement of talent.requires||[]){const requiredTalent=byId[requirement.id];if(requiredTalent&&talentRank(requirement.id)<requirement.rank){meta().purchased[requirement.id]=Math.min(requiredTalent.maxRank,requirement.rank);changed=true;}}}}
    if(changed===false)call('saveMeta');
  }
  function purchaseTalent(id){
    const talent=talents().find(node=>node.id===id),rank=talentRank(id),state=meta();
    if(!talent||rank>=talent.maxRank||!talentAvailable(talent)||state.points<talent.cost)return false;
    state.points-=talent.cost;state.purchased[talent.id]=rank+1;call('saveMeta');call('sfxLevel');call('showToast',`${talent.name} rank ${rank+1} · activates next run`);call('renderTalents');return true;
  }

  function legacyXpForLevel(level){return call('legacyXpForLevel',level);}
  function grantLegacyXp(amount){
    const state=meta();state.xp+=amount;
    while(state.xp>=state.xpNext){state.xp-=state.xpNext;state.level++;state.points++;state.xpNext=legacyXpForLevel(state.level);}
  }
  function finalizeRun(){
    if(call('isRunFinalized'))return call('getLastLegacyAward');
    call('setRunFinalized',true);
    const player=call('getPlayer'),travelAward=Math.max(0,Math.round(call('getTilesMovedThisRun')*(1+player.legacyXpBonus))),goldAward=Math.max(0,Math.floor(player.gold/10)),award=(travelAward+goldAward)*(call('isNightmare')?5:1),state=meta();
    call('setLastGoldLegacyAward',goldAward);call('setLastLegacyAward',award);
    state.runs++;state.bestTiles=Math.max(state.bestTiles,call('getTilesMovedThisRun'));grantLegacyXp(award);call('saveMeta');call('updateMetaUI');return award;
  }

  function prestigeOffer(total=allocatedTalentPoints()+(meta().points||0)){return Math.max(0,Math.floor(Math.max(0,Number(total)||0)/9));}
  function completePrestige(total){
    const rewards=prestigeOffer(total),remainder=Math.max(0,Number(total)||0)%9;
    if(rewards<1)return false;
    const state=meta();state.prestige=PRESTIGE.award(state.prestige,rewards);state.purchased={};state.level=1;state.xp=0;state.xpNext=legacyXpForLevel(1);state.points=remainder;
    call('hidePrestigeHeirloomOverlay');
    if(call('storageUnlocked'))call('syncStorage');
    const cap=call('getHeirloomSlots');state.heirlooms=(state.heirlooms||[]).slice(0,cap).map(item=>call('normalizeSavedItem',item));
    call('saveMeta');call('checkDynamicClassUnlocks');call('sfxHoly');call('showToast',`Prestige gained ${rewards} unspent Prestige Point${rewards===1?'':'s'}`);call('renderTalents');call('updateMetaUI');call('openStartScreen');return true;
  }

  function inspect(){return Object.freeze({owner:OWNER,configured:Object.freeze(Object.fromEntries(Object.entries(runtime).map(([key,value])=>[key,typeof value==='function'])))});}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,inspect,
    talentRank,gameplayTalentRank,setRunTalentSnapshot,runTalentSnapshot,withRunTalentSnapshot,talentAvailable,allocatedTalentPoints,repairTalentPrerequisites,purchaseTalent,
    legacyXpForLevel,grantLegacyXp,finalizeRun,prestigeOffer,completePrestige
  });
  window.DiceboundProgression=api;
})();
