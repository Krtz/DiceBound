/* DiceBound board-transition orchestration owner.
 *
 * This module owns the transition from a completed Board into the next Board:
 * encounter reset, road rebuild, entry recovery, announcement, and delayed
 * movement unlock. Board generation, combat victory resolution, final-run
 * completion, persistence, UI construction, and difficulty rules remain in
 * their established owners and are supplied through this narrow contract.
 */
(function(root){
  'use strict';

  const OWNER='board/transition';
  let runtime={};

  function road(){
    const value=runtime.getRoad?.();
    if(!value?.player||!Number.isFinite(value.boardLevel))throw new Error('DiceboundBoardTransition requires live road state');
    return value;
  }
  function resetEncounter(){
    runtime.resetEncounter?.();
  }
  function entryRecovery(player,definition,before){
    const heal=Number(definition?.entryHeal)||0,potions=Number(definition?.entryPotions)||0;
    player.hp=Math.min(player.maxHp,player.hp+Math.ceil(player.maxHp*heal));
    player.potions+=potions;
    // Board 6 historically reapplied its published entry values from the
    // pre-transition snapshot after the road rebuild. Keep that exact result
    // rather than silently changing the legacy Board 5 -> 6 contract.
    if(definition?.id===6){
      player.hp=Math.min(player.maxHp,before.hp+Math.ceil(player.maxHp*heal));
      player.potions=before.potions+potions;
    }
  }
  function announce(level,definition){
    const name=definition?.name||`Road ${level}`;
    runtime.log?.(`<b>Board Level ${level}: ${name}</b> opens.`);
    runtime.toast?.(`Board ${level}: ${name}`);
    runtime.playHoly?.();
  }
  function unlockMovement(){
    runtime.placePawn?.(false);
    runtime.setRollLocked?.(false);
    runtime.updateHud?.();
  }
  function advance(){
    const beforeRoad=road();
    if(beforeRoad.boardLevel>=6)return runtime.completeFinalRoad?.();
    const before={hp:beforeRoad.player.hp,potions:beforeRoad.player.potions};
    const nextLevel=beforeRoad.boardLevel+1;
    runtime.setBoardLevel?.(nextLevel);
    const state=road(),player=state.player;
    player.position=0;
    resetEncounter();
    runtime.setRollLocked?.(true);
    runtime.applyTheme?.();
    runtime.rebuildBoard?.();
    const definition=runtime.getBoardDefinition?.(nextLevel)||{id:nextLevel,name:`Road ${nextLevel}`};
    entryRecovery(player,definition,before);
    announce(nextLevel,definition);
    runtime.updateHud?.();
    runtime.schedule?.(unlockMovement,350);
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function inspect(){return Object.freeze({owner:OWNER,configured:typeof runtime.getRoad==='function'});}
  const api=Object.freeze({configure,advance,inspect,owner:OWNER});
  window.DiceboundBoardTransition=api;
})(window);
