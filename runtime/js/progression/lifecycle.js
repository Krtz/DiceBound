/* DiceBound Progression public subsystem owner.
 *
 * This is the semantic owner for Talent/Legacy progression, final Prestige
 * reset, Achievement policy and class-unlock orchestration. Focused
 * registries/domains remain separate:
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
    const player=call('getPlayer'),tilesMoved=call('getTilesMovedThisRun'),travelAward=Math.max(0,Math.round(tilesMoved*(1+player.legacyXpBonus))),goldAward=Math.max(0,Math.floor(player.gold/10)),award=(travelAward+goldAward)*(call('isNightmare')?5:1),state=meta(),stats=call('ensureAlphaMeta');
    call('setLastGoldLegacyAward',goldAward);call('setLastLegacyAward',award);
    state.runs++;state.bestTiles=Math.max(state.bestTiles,tilesMoved);
    stats.runsFinished++;stats.rolls+=call('getRolls');stats.tilesTraveled+=tilesMoved;stats.highestRunLevel=Math.max(stats.highestRunLevel,player.level);stats.classMaxLevel[player.classId]=Math.max(stats.classMaxLevel[player.classId]||1,player.level);stats.highestGold=Math.max(stats.highestGold,player.gold);
    grantLegacyXp(award);call('saveMeta');call('updateMetaUI');return award;
  }

  function prestigeOffer(total=allocatedTalentPoints()+(meta().points||0)){return Math.max(0,Math.floor(Math.max(0,Number(total)||0)/9));}
  function completePrestige(total){
    const rewards=prestigeOffer(total),remainder=Math.max(0,Number(total)||0)%9;
    if(rewards<1)return false;
    const state=meta();state.prestige=PRESTIGE.award(state.prestige,rewards);state.purchased={};state.level=1;state.xp=0;state.xpNext=legacyXpForLevel(1);state.points=remainder;
    call('hidePrestigeHeirloomOverlay');
    if(call('storageUnlocked'))call('syncStorage');
    const cap=call('getHeirloomSlots');state.heirlooms=(state.heirlooms||[]).slice(0,cap).map(item=>call('normalizeSavedItem',item));
    call('saveMeta');checkDynamicClassUnlocks();call('sfxHoly');call('showToast',`Prestige gained ${rewards} unspent Prestige Point${rewards===1?'':'s'}`);call('renderTalents');call('updateMetaUI');call('openStartScreen');return true;
  }

  function prestigeInspect(){return PRESTIGE.inspect(meta().prestige);}
  function prestigePurchase(id){
    const state=meta(),result=PRESTIGE.purchase(state.prestige,id,()=>call('random'));
    if(result.ok)state.prestige=result.prestige;
    return result;
  }
  function prestigeRefundAll(){const state=meta(),result=PRESTIGE.refundAll(state.prestige);state.prestige=result.prestige;return result;}
  function prestigeFormatStats(stats){return PRESTIGE.formatStats(stats);}

  function achievementRegistry(){return call('getAchievementRegistry');}
  function classes(){return call('getClasses');}
  function upgrades(){return call('getUpgrades');}
  function achievementById(id){return achievementRegistry().find(entry=>entry.id===id)||null;}
  function achievementEntry(input){return typeof input==='string'?achievementById(input):input||null;}
  function anyBoardClear(board){
    const target=Math.max(1,Number(board)||0),stats=call('ensureAlphaMeta'),suffix=`:b${target}`;
    if(Object.entries(stats.boardClears||{}).some(([key,count])=>Number(count)>0&&String(key).endsWith(suffix)))return true;
    // Read-only migration bridge for historical saves. New clears are recorded
    // exclusively in stats.boardClears by the run/progression composition.
    return Number(meta()?.[`board${target}Clears`]||0)>0;
  }

  function achievementDone(input){
    const a=achievementEntry(input);if(!a)return false;
    const state=meta(),stats=call('ensureAlphaMeta'),parts=String(a.condition||'').split(':'),kind=parts[0],player=call('getPlayer');
    if(kind==='runsStarted')return (stats.runsStarted||0)>0||call('getGameStarted');
    if(kind==='boardClear')return call('hasBoardClear',parts[1],Number(parts[2]));
    if(kind==='classUnlocked')return isClassUnlocked(parts[1]);
    if(kind==='nightmareUnlocked')return !!state.nightmareUnlocked;
    if(kind==='anyBoardClear')return anyBoardClear(parts[1]);
    if(kind==='classLevel')return (stats.classMaxLevel?.[parts[1]]||0)>=Number(parts[2]||0);
    if(kind==='healingDone')return (stats.healingDone||0)>=Number(parts[1]||0);
    if(kind==='highestGold')return Math.max(stats.highestGold||0,player?.gold||0)>=Number(parts[1]||0);
    if(kind==='elementProgress')return (state.elementProgress?.[parts[1]]||0)>=Number(parts[2]||0);
    if(kind==='allPetsUnlocked')return Object.values(state.pets||{}).every(pet=>pet.unlocked);
    if(kind==='prestige')return (state.prestige?.count||0)>=Number(parts[1]||0);
    if(kind==='setPieces')return call('mythicalSetCount')>=Number(parts[1]||0);
    if(kind==='merchantKills')return (state.merchantKills||0)>=Number(parts[1]||0);
    if(kind==='hellUnlocked')return !!state.hellUnlocked;
    if(kind==='heirloomStorageUnlocked')return !!state.heirloomStorageUnlocked||call('storageUnlocked');
    if(kind==='legendaryRelics')return (state.legendaryRelics||[]).length>=Number(parts[1]||0);
    if(kind==='devilBossKills')return (state.devilBossKills||0)>=Number(parts[1]||0);
    if(kind==='devilHornsFound')return !!state.devilHornsFound;
    if(kind==='potionsUsed')return (stats.potionsUsed||0)>=Number(parts[1]||0);
    return !!state.achievements?.[a.id];
  }

  function achievementConditionText(input){
    const a=achievementEntry(input);if(!a)return null;
    const p=String(a.condition||'').split(':'),kind=p[0],classRegistry=classes(),elements=call('getElements');
    if(kind==='runsStarted')return 'Begin any run.';
    if(kind==='boardClear')return `Clear Board ${p[2]} as ${classRegistry[p[1]]?.name||p[1]}.`;
    if(kind==='classUnlocked')return `Unlock ${classRegistry[p[1]]?.name||p[1]}.`;
    if(kind==='nightmareUnlocked')return 'Unlock Nightmare Mode.';
    if(kind==='anyBoardClear')return `Clear Board ${Number(p[1])}.`;
    if(kind==='classLevel')return `Reach run level ${p[2]} as ${classRegistry[p[1]]?.name||p[1]}.`;
    if(kind==='healingDone')return `Heal ${Number(p[1]).toLocaleString()} HP across all runs.`;
    if(kind==='highestGold')return `Hold ${Number(p[1]).toLocaleString()} gold at once.`;
    if(kind==='elementProgress')return `Accumulate ${Number(p[2]).toLocaleString()} ${elements[p[1]]?.name||p[1]} damage/healing.`;
    if(kind==='allPetsUnlocked')return 'Unlock every companion.';
    if(kind==='prestige')return `Reach ${p[1]} Prestige.`;
    if(kind==='setPieces')return `Equip ${p[1]} pieces of the Impossible Road set.`;
    if(kind==='merchantKills')return `Defeat the Road Merchant ${p[1]} time${Number(p[1])===1?'':'s'}.`;
    if(kind==='hellUnlocked')return 'Unlock Hell Mode.';
    if(kind==='heirloomStorageUnlocked')return 'Unlock permanent Heirloom Storage.';
    if(kind==='legendaryRelics')return `Discover ${p[1]} named Mythical road relic${Number(p[1])===1?'':'s'}.`;
    if(kind==='devilBossKills')return `Defeat the Pale Devil ${p[1]} time${Number(p[1])===1?'':'s'}.`;
    if(kind==='devilHornsFound')return "Find the Devil's Horns Omega hat.";
    if(kind==='potionsUsed')return `Consume ${p[1]} potions across all runs.`;
    if(kind==='invoker'){
      const copy={
        'first-invoke':'Invoke your first three-orb spell as Invoker.',
        'ten-recipes':'Invoke all ten three-orb recipes at least once.',
        'sun-strike-boss':'Defeat a boss with Sun Strike.',
        'deafening-blast':'Invoke Deafening Blast.'
      };
      if(copy[p[1]])return copy[p[1]];
    }
    return 'Complete this achievement’s authored condition.';
  }

  function achievementRewardText(input){
    const a=achievementEntry(input);if(!a)return null;
    let base='';
    if(a.reward){
      const [type,id]=String(a.reward).split(':'),classRegistry=classes();
      if(type==='class')base=` · unlocks ${classRegistry[id]?.name||id}`;
      else if(type==='powerup')base=` · unlocks ${upgrades().find(upgrade=>upgrade.id===id)?.name||id}`;
    }
    const names=upgrades().filter(upgrade=>String(upgrade.achievementGate||'')===`achievement:${a.id}`)
      .map(upgrade=>upgrade.name).filter(Boolean).filter(name=>!base.includes(name));
    if(!names.length)return base;
    return `${base}${base?' · also':' ·'} unlocks ${names.join(', ')}`;
  }

  function achievementGateConditionText(gate){
    if(!gate)return '';
    const text=String(gate),prefixed=text.startsWith('achievement:')?achievementById(text.slice('achievement:'.length)):null,direct=prefixed||achievementById(text);
    if(direct){
      if(direct.secret&&!achievementDone(direct))return 'Complete a hidden achievement prerequisite.';
      return `Requires: ${direct.name}.`;
    }
    const classGate=/^class_b([2345]):(.*)$/.exec(text);
    if(classGate)return `Clear Board ${classGate[1]} as this hero.`;
    const spec=call('getPowerupGateRegistry')?.[text];
    if(!spec)return 'Complete this hero’s authored unlock condition.';
    if(spec.type==='achievements'){
      const entries=(spec.requirements||[]).map(id=>achievementById(id)).filter(Boolean);
      if(entries.some(entry=>entry.secret&&!achievementDone(entry)))return 'Complete the hidden prerequisite achievements.';
      if(entries.length)return `Requires: ${entries.map(entry=>entry.name).join(' · ')}.`;
    }
    if(spec.type==='prestige')return `Reach ${Number(spec.minimum||0)} Prestige.`;
    if(spec.type==='classUnlocked')return `Unlock ${classes()[spec.classId]?.name||spec.classId}.`;
    if(spec.type==='flag'&&spec.field==='nightmareUnlocked')return 'Unlock Nightmare Mode.';
    if(spec.type==='elementProgress')return `Accumulate ${Number(spec.minimum||0).toLocaleString()} ${call('getElements')[spec.element]?.name||spec.element} damage/healing.`;
    if(spec.type==='boardClear')return `Clear Board ${Number(spec.board)} as ${classes()[spec.classId]?.name||spec.classId}.`;
    if(spec.type==='classLevel')return `Reach run level ${Number(spec.minimum||0)} as ${classes()[spec.classId]?.name||spec.classId}.`;
    if(spec.type==='lifetimeStat'&&spec.stat==='healingDone')return `Heal ${Number(spec.minimum||0).toLocaleString()} HP across all runs.`;
    if(spec.type==='lifetimeStat'&&spec.stat==='highestGold')return `Hold ${Number(spec.minimum||0).toLocaleString()} gold at once.`;
    if(spec.type==='allPetsUnlocked')return 'Unlock every companion.';
    if(spec.type==='boardClears'){
      const names=(spec.requirements||[]).map(requirement=>achievementRegistry().find(entry=>entry.condition===`boardClear:${requirement.classId}:${Number(requirement.board)}`)?.name).filter(Boolean);
      if(names.length)return `Requires: ${names.join(' · ')}.`;
    }
    return 'Complete this hero’s authored unlock condition.';
  }

  function achievementGateUnlocked(gate){
    if(!gate)return true;
    const state=meta(),text=String(gate);
    if(text.startsWith('achievement:')){const achievement=achievementById(text.slice('achievement:'.length));return !!achievement&&achievementDone(achievement);}
    const directAchievement=achievementById(text);if(directAchievement)return achievementDone(directAchievement);
    const classGate=/^class_b([2345]):(.*)$/.exec(text);if(classGate)return call('hasBoardClear',classGate[2],Number(classGate[1]));
    const spec=call('getPowerupGateRegistry')?.[text];
    if(spec){
      if(spec.type==='prestige')return (state.prestige?.count||0)>=Number(spec.minimum||0);
      if(spec.type==='classUnlocked')return isClassUnlocked(spec.classId);
      if(spec.type==='flag')return !!state[spec.field];
      if(spec.type==='counter')return (state[spec.field]||0)>=Number(spec.minimum||0);
      if(spec.type==='elementProgress')return (state.elementProgress?.[spec.element]||0)>=Number(spec.minimum||0);
      if(spec.type==='boardClear')return call('hasBoardClear',spec.classId,Number(spec.board));
      if(spec.type==='classLevel')return (call('ensureAlphaMeta').classMaxLevel?.[spec.classId]||0)>=Number(spec.minimum||0);
      if(spec.type==='lifetimeStat')return (call('ensureAlphaMeta')[spec.stat]||0)>=Number(spec.minimum||0);
      if(spec.type==='allPetsUnlocked')return Object.values(state.pets||{}).every(pet=>pet.unlocked);
      if(spec.type==='achievements')return (spec.requirements||[]).every(id=>{const achievement=achievementById(id);return !!achievement&&achievementDone(achievement);});
      if(spec.type==='boardClears')return (spec.requirements||[]).every(requirement=>call('hasBoardClear',requirement.classId,Number(requirement.board)));
    }
    return !!state.achievements?.[gate];
  }

  function heroMasteryEntries(classId){
    return upgrades().filter(upgrade=>(upgrade.classId===classId||(upgrade.classIds||[]).includes(classId))&&!!upgrade.achievementGate)
      .map(upgrade=>{
        const gate=String(upgrade.achievementGate),condition=achievementGateConditionText(gate);
        return {id:`hero-talent:${classId}:${upgrade.id}`,name:`${upgrade.icon||'✨'} ${upgrade.name}`,description:`${condition} Unlocks this hero-specific talent.`,done:achievementGateUnlocked(gate)};
      });
  }

  function achievementCount(){return achievementRegistry().reduce((count,achievement)=>count+(achievementDone(achievement)?1:0),0);}

  function classUnlockContext(){return call('getClassUnlockContext');}
  function isClassUnlocked(id){return call('classUnlockIsUnlocked',id,classUnlockContext());}
  function commitClassUnlock(id){
    const state=meta(),classRegistry=classes();
    if(id==='bloodmage'){
      state.bloodmageUnlocked=true;state.unlocks=state.unlocks||{};state.unlocks.bloodmage=true;call('saveMeta');call('renderClassChoices');return true;
    }
    if(!classRegistry[id]||state.unlocks?.[id])return false;
    state.unlocks=state.unlocks||{};state.unlocks[id]=true;call('saveMeta');
    const cls=classRegistry[id],unlockFeedback=call('classUnlockFeedback',id);
    if(call('getGameStarted'))call('addLog',`<b>Class unlocked:</b> ${cls.icon} ${cls.name}!`);
    call('showToast',unlockFeedback?.toast||`NEW CLASS UNLOCKED · ${cls.icon} ${cls.name}`,3400,true);call('renderClassChoices');return true;
  }
  function unlockClass(id){if(!call('classUnlockMayCommit',id,classUnlockContext()))return false;return commitClassUnlock(id);}
  function checkDynamicClassUnlocks(){
    const observed=call('classUnlockRecordObservedProgress',classUnlockContext());
    if(observed.changed){const stats=call('ensureAlphaMeta');stats.highestGold=observed.highestGold;meta().classUnlockFacts=observed.facts;}
    call('classUnlockResolveDynamic',{getContext:()=>classUnlockContext(),unlock:id=>unlockClass(id)});
    if(observed.changed)call('saveMeta');
  }

  function inspect(){return Object.freeze({owner:OWNER,configured:Object.freeze(Object.fromEntries(Object.entries(runtime).map(([key,value])=>[key,typeof value==='function'])))});}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,inspect,
    talentRank,gameplayTalentRank,setRunTalentSnapshot,runTalentSnapshot,withRunTalentSnapshot,talentAvailable,allocatedTalentPoints,repairTalentPrerequisites,purchaseTalent,
    legacyXpForLevel,grantLegacyXp,finalizeRun,prestigeOffer,completePrestige,prestigeInspect,prestigePurchase,prestigeRefundAll,prestigeFormatStats,
    achievementDone,achievementConditionText,achievementRewardText,achievementGateConditionText,achievementGateUnlocked,heroMasteryEntries,achievementCount,
    isClassUnlocked,commitClassUnlock,unlockClass,checkDynamicClassUnlocks
  });
  window.DiceboundProgression=api;
})();
