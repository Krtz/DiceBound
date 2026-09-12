/* DiceBound Board + Run public subsystem facade.
 *
 * #322 / #209 / #40: ordinary callers should depend on one coherent Run
 * owner instead of coordinating Board/Run micro-modules directly. The facade
 * deliberately contains no gameplay state or RNG logic: every operation below
 * delegates to the already-authoritative internal owner.
 */
(function(root){
  'use strict';

  const OWNER='run';

  function requireOwner(name,value){
    if(!value)throw new Error(`DiceboundRun requires ${name}`);
    return value;
  }

  const internal=Object.freeze({
    boards:requireOwner('DiceboundBoards',root.DiceboundBoards),
    movement:requireOwner('DiceboundBoardMovement',root.DiceboundBoardMovement),
    tileDispatch:requireOwner('DiceboundBoardTileDispatch',root.DiceboundBoardTileDispatch),
    generation:requireOwner('DiceboundBoardGeneration',root.DiceboundBoardGeneration),
    transition:requireOwner('DiceboundBoardTransition',root.DiceboundBoardTransition),
    playerInitialization:requireOwner('DiceboundPlayerInitialization',root.DiceboundPlayerInitialization),
    lifecycle:requireOwner('DiceboundRunLifecycle',root.DiceboundRunLifecycle),
    completion:requireOwner('DiceboundRunCompletion',root.DiceboundRunCompletion)
  });

  function configure(parts={}){
    if(parts.movement)internal.movement.configure(parts.movement);
    if(parts.tileDispatch)internal.tileDispatch.configure(parts.tileDispatch);
    if(parts.generation)internal.generation.configure(parts.generation);
    if(parts.transition)internal.transition.configure(parts.transition);
    if(parts.lifecycle)internal.lifecycle.configure(parts.lifecycle);
    if(parts.completion)internal.completion.configure(parts.completion);
    return api;
  }

  function createBoardRegistry(){return internal.boards.createRegistry();}
  function configurePlayerInitialization(deps={}){return internal.playerInitialization.configure(deps);}
  function move(...args){return internal.movement.move(...args);}
  function planMove(...args){return internal.movement.planMove(...args);}
  function dispatchTile(...args){return internal.tileDispatch.dispatch(...args);}
  function generateBoard(...args){return internal.generation.generate(...args);}
  function activateFinalBoardRules(...args){return internal.generation.activateFinalRules(...args);}
  function enemyForPosition(...args){return internal.generation.enemyForPosition(...args);}
  function advanceBoard(...args){return internal.transition.advance(...args);}
  function startFreshRun(...args){return internal.lifecycle.startFreshRun(...args);}
  function completeFinalRoad(...args){return internal.completion.completeFinalRoad(...args);}

  function inspect(){
    return Object.freeze({
      owner:OWNER,
      internalOwners:Object.freeze({
        boards:internal.boards.owner||'board/registry',
        movement:internal.movement.owner,
        tileDispatch:internal.tileDispatch.owner,
        generation:internal.generation.owner,
        transition:internal.transition.owner,
        playerInitialization:internal.playerInitialization.owner,
        lifecycle:internal.lifecycle.owner,
        completion:internal.completion.owner
      })
    });
  }

  const api=Object.freeze({
    apiVersion:1,
    owner:OWNER,
    configure,
    createBoardRegistry,
    configurePlayerInitialization,
    move,
    planMove,
    dispatchTile,
    generateBoard,
    activateFinalBoardRules,
    enemyForPosition,
    advanceBoard,
    startFreshRun,
    completeFinalRoad,
    inspect
  });

  window.DiceboundRun=api;
})(window);
