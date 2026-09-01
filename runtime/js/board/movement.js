/* DiceBound board movement orchestration owner.
 *
 * This module owns the resolved movement pipeline: plan/guardian interception,
 * Pale Devil interception, Loaded Sixes, per-step progression, travel XP and
 * final tile handoff. Board generation, tile dispatch, combat, save/checkpoint
 * persistence and UI rendering remain in their established owners and enter
 * through this deliberately narrow runtime contract.
 */
(function(root){
  'use strict';

  const OWNER='board/movement';
  let runtime={};

  function road(){
    const value=runtime.getRoad?.();
    if(!value?.player||!Array.isArray(value.tiles))throw new Error('DiceboundBoardMovement requires live road state');
    return value;
  }
  function planMove(steps,naturalRoll=steps){
    const state=road(),start=state.player.position;
    const cappedDestination=Math.min(runtime.currentTileCount()-1,state.player.position+steps),minibossIndex=runtime.currentMinibossTile()-1;
    let destination=cappedDestination,intercepted=false;
    if(state.player.position<minibossIndex&&cappedDestination>minibossIndex&&!state.tiles[minibossIndex]?.cleared){destination=minibossIndex;intercepted=true;}
    return {domain:'board',type:'move-plan',start,steps,naturalRoll,originalDestination:cappedDestination,destination,intercepted,actualSteps:destination-start};
  }
  function advanceStep(){
    const state=road(),from=state.player.position;
    state.player.position++;
    const tilesMovedThisRun=runtime.incrementTilesMoved?.();
    return runtime.emit?.('board:step',{domain:'board',type:'step',from,to:state.player.position,tilesMovedThisRun});
  }
  function renderPlan(plan){
    if(plan.intercepted)runtime.log?.(`<b>${road().tiles[plan.destination]?.enemyBase?.name||'The miniboss'} intercepts your roll!</b> Movement stops at tile ${plan.destination+1}.`);
    return plan;
  }
  function renderStep(result){runtime.playStep?.();runtime.refreshBoardHighlights?.();runtime.placePawn?.(true);runtime.updateHud?.();return result;}
  async function move(steps,naturalRoll=steps,extraStep=false,chosen=false){
    if(runtime.hasEffect?.('loaded_sixes')&&Number(naturalRoll)===6){steps+=6;runtime.log?.('<b>🎲 Loaded Sixes:</b> the six counts twice for movement (+6).');runtime.toast?.('🎲6️⃣ Loaded Sixes · +6 movement');}
    const beforeInterception=road();
    if(beforeInterception.hellMode&&beforeInterception.devilPrimed&&beforeInterception.boardLevel===2){
      const index=beforeInterception.tiles.findIndex((tile,i)=>i>beforeInterception.player.position&&tile?.type==='devilboss'&&!tile.cleared);
      const destination=Math.min(runtime.currentTileCount()-1,beforeInterception.player.position+steps);
      if(index>=0&&destination>=index){steps=index-beforeInterception.player.position;extraStep=false;runtime.log?.('<b>👿 The Pale Devil steps onto the road.</b> Your movement is intercepted; once invited, he cannot be accidentally skipped.');runtime.toast?.('👿 The dance has an answer');}
    }
    const player=road().player;
    if(player.loadedSix&&naturalRoll===6&&!chosen){
      const wanted=player.loadedSixBonusXp||30,already=extraStep?15:0,extra=Math.max(0,wanted-already);
      if(extra)runtime.grantXp?.(extra);
      const ultimate=player.loadedSixUltimate||30,gold=runtime.modifiedGold?.(player.loadedSixGold||25)??(player.loadedSixGold||25);
      player.ultimateCharge=runtime.clamp?.(player.ultimateCharge+ultimate,0,100)??Math.min(100,Math.max(0,player.ultimateCharge+ultimate));
      player.gold+=gold;
      runtime.log?.(`🎲✨ The Road Is Loaded: +${wanted} bonus travel XP, +${ultimate} Ultimate and +${gold} gold.`);
    }
    const plan=planMove(steps,naturalRoll);renderPlan(plan);
    while(road().player.position<plan.destination){const stepResult=advanceStep();renderStep(stepResult);await runtime.delay?.(180);}
    const movedPlayer=road().player;
    let fast=naturalRoll>=4?(naturalRoll-3)*3+movedPlayer.fastTravelBonus:0;
    if(extraStep)fast+=naturalRoll===6?9:3;
    if(extraStep&&naturalRoll===6&&movedPlayer.loadedSix)fast+=15;
    const travel=plan.actualSteps+fast;
    if(travel>0){const xpResult=runtime.grantXp?.(travel)||{applied:travel};runtime.log?.(`Travel grants <b>${xpResult.applied} XP</b>${fast?` including <b>${fast} Fast Travel XP</b>${extraStep&&naturalRoll===6?' for a six-powered extra step':''}`:''}.`);}
    if(plan.intercepted)runtime.toast?.('👑 Miniboss intercept!');
    runtime.emit?.('board:move-complete',{...plan,domain:'board',type:'move-complete',fastTravelXp:fast,travelXp:travel,chosen,extraStep});
    await runtime.delay?.(150);
    runtime.dispatchTile?.();
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function inspect(){return Object.freeze({owner:OWNER,configured:typeof runtime.getRoad==='function'});}
  const state=Object.freeze({planMove,advanceStep});
  const api=Object.freeze({configure,planMove,advanceStep,move,inspect,state,owner:OWNER});
  window.DiceboundBoardMovement=api;
})(window);
