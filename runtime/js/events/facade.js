/* DiceBound Road Events public subsystem facade.
 *
 * Board + Run owns arrival/routing. This facade is the single ordinary public
 * destination boundary for road-event lifecycle. During migration it delegates
 * to the existing authoritative lifecycle implementations; those implementations
 * are drained behind this boundary incrementally under the frozen 0.6.6.25 oracle.
 */
(function(){
  'use strict';

  const OWNER='events/facade';
  let runtime={};

  function requireHandler(name){
    const handler=runtime[name];
    if(typeof handler!=='function')throw new Error(`DiceboundRoadEvents ${name} handler is not configured.`);
    return handler;
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function openSlot(...args){return requireHandler('openSlot')(...args);}
  function openWheel(...args){return requireHandler('openWheel')(...args);}
  function openTreasure(...args){return requireHandler('openTreasure')(...args);}
  function openBlessing(...args){return requireHandler('openBlessing')(...args);}
  function openMystic(...args){return requireHandler('openMystic')(...args);}
  function openBloodwell(...args){return requireHandler('openBloodwell')(...args);}
  function openGambler(...args){return requireHandler('openGambler')(...args);}
  function inspect(){
    return Object.freeze({
      owner:OWNER,
      configured:Object.freeze({
        slot:typeof runtime.openSlot==='function',
        wheel:typeof runtime.openWheel==='function',
        treasure:typeof runtime.openTreasure==='function',
        blessing:typeof runtime.openBlessing==='function',
        mystic:typeof runtime.openMystic==='function',
        bloodwell:typeof runtime.openBloodwell==='function',
        gambler:typeof runtime.openGambler==='function'
      })
    });
  }

  const api=Object.freeze({
    configure,
    openSlot,
    openWheel,
    openTreasure,
    openBlessing,
    openMystic,
    openBloodwell,
    openGambler,
    inspect,
    owner:OWNER
  });
  window.DiceboundRoadEvents=api;
})();
