/* DiceBound Camp / App-Shell lifecycle and HUD policy owner.
 *
 * This focused internal owns only orchestration/order. Camp DOM/layout remains
 * in ui/camp.js; Run, Classes, Progression, Combat View and Pets remain the
 * authoritative mechanics/data owners supplied here as collaborators.
 */
(function(root){
  'use strict';

  const camp=root.DiceboundCamp;
  if(!camp?._installShell)throw new Error('camp-shell.js requires DiceboundCamp before loading.');

  let runtime={};
  function configure(next={}){runtime={...runtime,...next};return api;}
  function invoke(name,...args){const fn=runtime[name];return typeof fn==='function'?fn(...args):undefined;}
  function applyBase(base,thisArg,args){if(typeof base!=='function')throw new Error('Camp shell requires a base function.');return Reflect.apply(base,thisArg,args||[]);}

  // Preserve the exact released wrapper unwind order. In particular Run owns
  // checkpoint clearing, while Camp owns when that collaborator is invoked.
  function enter(base,thisArg,args=[]){
    invoke('clearCheckpoint');
    invoke('clearRunTalentSnapshot');
    const result=applyBase(base,thisArg,args);
    invoke('ensureHellToggle');
    invoke('ensureCampScene');
    invoke('refreshCampV110');
    invoke('refreshCampV22');
    invoke('refreshCampV24');
    invoke('refreshRunControls');
    invoke('syncCampProgressionObjects');
    invoke('resetInvokerCombat');
    invoke('healAtCamp');
    invoke('clearCombatPresentation');
    invoke('refreshActivePetArt');
    return result;
  }

  function refreshMeta(base,thisArg,args=[]){
    const result=applyBase(base,thisArg,args);
    invoke('ensureCampScene');
    invoke('refreshCampV110');
    invoke('refreshCampV22');
    invoke('refreshCampV24');
    invoke('refreshCampProgression');
    invoke('scheduleCampHitTargetSync');
    invoke('refreshActivePetArt');
    return result;
  }

  function refreshHud(base,thisArg,args=[]){
    // Historical outer pre-hooks first.
    invoke('syncOuroborosEconomy');
    if(invoke('isOuroboros'))invoke('syncOuroborosAttack');
    invoke('syncBloodmageHpPassive',false);
    invoke('syncOuroborosAttack');
    invoke('recordVitals');

    const result=applyBase(base,thisArg,args);

    // Historical inner-to-outer post-hooks, kept deliberately explicit so a
    // later change cannot silently reorder UI/state synchronization.
    invoke('refreshLegacyHeroAvatar');
    invoke('checkDynamicClassUnlocks');
    invoke('refreshClassHudAndRoadLabels');
    invoke('refreshDefenseTooltip');
    invoke('checkDynamicClassUnlocks');
    invoke('refreshStatTooltips');
    invoke('refreshDoubleDiceControls');
    invoke('refreshBoard6RoadLabels');
    invoke('refreshFinalGuardianLabel');
    invoke('ensureDoubleDiceButton');
    invoke('refreshShieldBars');
    invoke('refreshPoisonStat');
    invoke('syncGoldGainStat');
    if(invoke('isOuroboros'))invoke('forceOuroborosAttackLabel');
    invoke('scheduleRunCheckpoint');
    return result;
  }

  const api=Object.freeze({apiVersion:1,configure,enter,refreshMeta,refreshHud});
  camp._installShell(api);
})(window);
