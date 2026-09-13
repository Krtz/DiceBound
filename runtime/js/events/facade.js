/* DiceBound Road Events public subsystem facade.
 *
 * Board + Run owns arrival/routing. DiceboundRoadEvents is the single ordinary
 * public boundary; focused internal owners implement event lifecycle behind it.
 */
(function(){
  'use strict';

  const OWNER='events/facade';
  const treasure=window.DiceboundRoadEventTreasure;
  const lifecycle=window.DiceboundRoadEventLifecycle;
  if(!treasure?.configure)throw new Error('DiceboundRoadEvents requires DiceboundRoadEventTreasure before loading.');
  if(!lifecycle?.configure)throw new Error('DiceboundRoadEvents requires DiceboundRoadEventLifecycle before loading.');

  function configure(nextRuntime={}){
    if(nextRuntime.treasure)treasure.configure(nextRuntime.treasure);
    if(nextRuntime.lifecycle)lifecycle.configure(nextRuntime.lifecycle);
    return api;
  }
  function openSlot(...args){return lifecycle.openSlot(...args);}
  function openWheel(...args){return lifecycle.openWheel(...args);}
  function openTreasure(...args){return treasure.open(...args);}
  function openBlessing(...args){return lifecycle.openBlessing(...args);}
  function openMystic(...args){return lifecycle.openMystic(...args);}
  function openBloodwell(...args){return lifecycle.openBloodwell(...args);}
  function openGambler(...args){return lifecycle.openGambler(...args);}
  function resetTransient(...args){return lifecycle.resetTransient(...args);}
  function inspect(){
    return Object.freeze({
      owner:OWNER,
      configured:Object.freeze({slot:true,wheel:true,treasure:true,blessing:true,mystic:true,bloodwell:true,gambler:true}),
      internals:Object.freeze({treasure:treasure.owner,lifecycle:lifecycle.owner})
    });
  }

  const api=Object.freeze({configure,openSlot,openWheel,openTreasure,openBlessing,openMystic,openBloodwell,openGambler,resetTransient,inspect,owner:OWNER});
  window.DiceboundRoadEvents=api;
})();
