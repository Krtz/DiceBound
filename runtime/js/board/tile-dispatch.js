/* DiceBound board tile-dispatch ownership.
 *
 * This module owns arrival-time tile inspection, safety recovery and the
 * selection of an existing destination. Destination implementations (combat,
 * events, merchant transactions, rewards, UI and persistence) remain in their
 * current domain owners and are entered through this narrow contract.
 */
(function(){
  'use strict';

  const OWNER='board/tile-dispatch';
  const KNOWN_TILE_TYPES=Object.freeze(['start','empty','enemy','miniboss','boss','event','wheel','powerup','treasure','camp','merchant','blessing','mystic','bloodwell','gambler','devilboss']);
  const KNOWN_TILE_TYPE_SET=new Set(KNOWN_TILE_TYPES);
  let runtime={};

  function road(){
    const value=runtime.getRoad?.();
    if(!value?.player||!Array.isArray(value.tiles))throw new Error('DiceboundBoardTileDispatch requires live road state');
    return value;
  }
  function recoverUnknown(tile,state){
    runtime.logDiagnostic?.('errors','road',`Unknown tile type: ${tile.type}`,{position:state.player.position,board:state.boardLevel,tile});
    tile.type='empty';tile.cleared=true;
    runtime.refreshTile?.(state.player.position);
    runtime.setRollLocked?.(false);runtime.setCombatBusy?.(false);runtime.updateHud?.();
    runtime.toast?.('🛠️ Corrupt road tile repaired');
  }
  function recoverError(error,tile){
    runtime.logDiagnostic?.('errors','road','resolveTile threw',{error:String(error),state:runtime.debugState?.(),tile});
    runtime.setRollLocked?.(false);runtime.setCombatBusy?.(false);runtime.updateHud?.();
    runtime.toast?.('🛠️ Road recovered after tile error');
  }
  function dispatchKnown(tile,state){
    if(tile?.type==='devilboss'){runtime.clearDevilPrimed?.();return runtime.startCombat?.('devil');}
    if(!tile){runtime.setRollLocked?.(false);runtime.updateHud?.();return;}
    if(tile.cleared||tile.type==='empty'||tile.type==='start'){runtime.log?.('The road is quiet. For now.');return runtime.returnToRoad?.();}
    if(tile.type==='enemy')return runtime.startCombat?.('normal');
    if(tile.type==='miniboss')return runtime.startCombat?.('miniboss');
    if(tile.type==='boss')return runtime.startCombat?.('final');
    if(tile.type==='event')return runtime.openEvent?.();
    if(tile.type==='wheel')return runtime.openWheelEvent?.();
    if(tile.type==='powerup')return runtime.openFreePowerup?.();
    if(tile.type==='treasure')return runtime.openTreasure?.();
    if(tile.type==='camp')return runtime.useCamp?.();
    if(tile.type==='merchant')return state.merchantBossPrimed&&!state.merchantBossDefeatedThisBoard?runtime.startCombat?.('merchant'):runtime.openMerchant?.();
    if(tile.type==='blessing')return runtime.openBlessing?.();
    if(tile.type==='mystic')return runtime.openMystic?.();
    if(tile.type==='bloodwell')return runtime.openBloodwell?.();
    if(tile.type==='gambler')return runtime.openGambler?.();
  }
  function dispatch(){
    const state=road(),tile=state.tiles[state.player.position];
    if(tile&&!KNOWN_TILE_TYPE_SET.has(tile.type)){recoverUnknown(tile,state);return;}
    const invoke=()=>dispatchKnown(tile,state);
    try{return typeof runtime.trace==='function'?runtime.trace('resolveTile',invoke):invoke();}
    catch(error){recoverError(error,tile);}
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function inspect(){return Object.freeze({owner:OWNER,configured:typeof runtime.getRoad==='function',knownTileTypes:[...KNOWN_TILE_TYPES]});}
  const state=Object.freeze({knownTileTypes:KNOWN_TILE_TYPES});
  const api=Object.freeze({configure,dispatch,inspect,state,owner:OWNER});
  window.DiceboundBoardTileDispatch=api;
})();
