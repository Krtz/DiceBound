/* DiceBound terminal-run completion ownership.
 *
 * This module owns the ordered, idempotent completion of the Sixth Road:
 * checkpoint retirement, terminal run state, final accounting, end-screen
 * handoff, first-clear accounting and post-completion hooks. Combat rewards,
 * loot/level-up sequencing, end-gear presentation, achievements, persistence
 * implementation and class-specific completion effects remain injected
 * responsibilities. Board 5 is deliberately outside this terminal owner.
 */
(function(){
  'use strict';

  const OWNER='run/completion';
  let runtime={};

  function completionContext(){
    const value=runtime.getCompletionContext?.()||{};
    return Object.freeze({
      mode:['Normal','Nightmare','Hell'].includes(value.mode)?value.mode:'Normal',
      level:Math.max(1,Number(value.level)||1),
      gold:Math.max(0,Number(value.gold)||0),
      rolls:Math.max(0,Number(value.rolls)||0),
      legacyAward:Math.max(0,Number(value.legacyAward)||0),
      goldLegacyAward:Math.max(0,Number(value.goldLegacyAward)||0)
    });
  }

  function completeFinalRoad(){
    // The published checkpoint wrapper clears first, including when a duplicate
    // terminal signal arrives after the end state is already visible.
    runtime.clearCheckpoint?.();
    if(runtime.isCompleting?.())return Object.freeze({domain:'run',type:'terminal-completion',completed:false,duplicate:true});
    const before=runtime.beforeCompletion?.()||null;
    runtime.setCompleting?.(true);
    runtime.setRunState?.({gameStarted:false,rollLocked:true});
    const first=!runtime.isRunFinalized?.();
    const earned=Number(runtime.finalizeRun?.())||0;
    const context=completionContext();
    const detail=Object.freeze({domain:'run',type:'terminal-completion',completed:true,road:6,first,earned,context,before});
    runtime.updateHud?.();
    runtime.presentTerminalEnd?.(detail);
    if(first)runtime.recordFirstCompletion?.(detail);
    runtime.afterCompletion?.(detail);
    return detail;
  }

  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function inspect(){return Object.freeze({owner:OWNER,configured:typeof runtime.finalizeRun==='function'});}
  const api=Object.freeze({configure,completeFinalRoad,inspect,owner:OWNER});
  window.DiceboundRunCompletion=api;
})();
