/* DiceBound fresh-run lifecycle ownership.
 *
 * This module owns the ordered orchestration that begins a new expedition:
 * checkpoint replacement, seed ownership, class/player initialization,
 * Board 1 construction, visible run entry and checkpoint scheduling. It
 * deliberately receives class mechanics, player reset, Board construction,
 * persistence, UI primitives and post-start class hooks through its runtime
 * contract. Checkpoint restore/resume remains in the checkpoint composition
 * owner and must never enter this fresh-run path.
 */
(function(){
  'use strict';

  const OWNER='run/lifecycle';
  const FRESH_RUN_SURFACES=Object.freeze([
    'startOverlay','combatOverlay','levelOverlay','eventOverlay','wheelOverlay',
    'powerupOverlay','merchantOverlay','blessingOverlay','mysticOverlay',
    'lootOverlay','endOverlay','talentOverlay','prestigeMoonOverlay','buffOverlay',
    'prestigeHeirloomOverlay','petCollectionOverlay','diceChoiceOverlay','debugOverlay',
    'bloodwellOverlay','gamblerOverlay','achievementOverlay','infoOverlay'
  ]);
  let runtime={};

  function freshContext(){
    const value=runtime.getFreshContext?.()||{};
    return {
      classId:String(value.classId||'ranger'),
      className:String(value.className||value.classId||'Adventurer'),
      nightmareMode:!!value.nightmareMode
    };
  }
  function setRunState(){runtime.setRunState?.({gameStarted:true,rollLocked:false,combatBusy:false});}
  function clearPresentation(){
    runtime.clearLog?.();runtime.setDice?.('⚀');
    FRESH_RUN_SURFACES.forEach(id=>runtime.hideSurface?.(id));
  }
  function announce(context){
    runtime.log?.(`<b>${context.className}</b> begins the ${context.nightmareMode?'Nightmare ':''}four-road adventure.`);
  }
  function startFreshRun(options={}){
    // Keep the published checkpoint/seed order: a new run takes ownership of
    // the active checkpoint before Random Class or Board construction can
    // consume the run RNG.
    runtime.clearCheckpoint?.();runtime.seedNewRun?.();runtime.beforeFreshRun?.(options);
    const wasRandom=!!runtime.isRandomClassMode?.();
    const chosen=runtime.resolveRandomForRun?.()||null;
    runtime.prepareFreshRun?.();
    runtime.ensureAudio?.();
    runtime.initializePlayer?.(runtime.selectedClassId?.()||'ranger');
    runtime.setBoardLevel?.(1);runtime.applyRunTheme?.();runtime.generateBoard?.();runtime.buildBoard?.();
    setRunState();clearPresentation();
    const context=freshContext();announce(context);runtime.updateHud?.();runtime.schedulePawn?.(60);
    runtime.recordFreshRunStarted?.();runtime.updateHud?.();
    if(chosen)runtime.announceRandomClass?.(chosen);
    runtime.afterClassStart?.({wasRandom,chosen,context});runtime.scheduleCheckpoint?.();
    return Object.freeze({domain:'run',type:'fresh-start',classId:context.classId,wasRandom,randomClass:chosen?.id||null});
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function inspect(){return Object.freeze({owner:OWNER,configured:typeof runtime.initializePlayer==='function',freshRunSurfaces:[...FRESH_RUN_SURFACES]});}
  const api=Object.freeze({configure,startFreshRun,inspect,owner:OWNER});
  window.DiceboundRunLifecycle=api;
})();
