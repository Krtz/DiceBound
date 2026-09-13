/* DiceBound Road Event: Treasure lifecycle owner.
 *
 * This module preserves the final Beta 0.6.6.25 Treasure pipeline exactly:
 * current 0.6 Memory Cache first on Board 4+, otherwise scaled ordinary treasure.
 * The retired v24 named-relic Memory Cache wrapper is intentionally not reproduced.
 */
(function(){
  'use strict';

  const OWNER='events/treasure';
  let runtime={};

  function requireFn(name){
    const fn=runtime[name];
    if(typeof fn!=='function')throw new Error(`DiceboundRoadEventTreasure ${name} is not configured.`);
    return fn;
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function player(){return requireFn('getPlayer')();}
  function boardLevel(){return requireFn('getBoardLevel')();}
  function tiles(){return requireFn('getTiles')();}
  function random(){return requireFn('random')();}
  function memoryCacheChance(){
    return requireFn('isHell')()?1/200:requireFn('isNightmare')()?1/300:1/450;
  }
  function clearCurrentTile(position){
    const tile=tiles()[position];
    if(tile){tile.cleared=true;tile.type='empty';requireFn('refreshTile')(position);}
  }

  function openRegular(){
    const p=player(),level=boardLevel(),position=p.position;
    const progress=position/Math.max(1,requireFn('currentTileCount')()-1);
    const mult=[0,1,1.35,1.72,2.12,2.58][level]||2.58;
    const base=requireFn('rand')(18,36)+Math.round(progress*16);
    const gold=requireFn('modifiedGold')(Math.round(base*mult));
    p.gold+=gold;
    const extras=[];
    const potionChance=.28+(level-1)*.055;
    if(random()<potionChance){
      const count=level>=4&&random()<.20?2:1;
      p.potions+=count;
      extras.push(`${count} potion${count===1?'':'s'}`);
    }
    clearCurrentTile(position);
    requireFn('coin')();
    requireFn('addLog')(`Board ${level} treasure yields <b>${gold} gold</b>${extras.length?` and ${extras.join(', ')}`:''}.`);
    requireFn('showToast')(`Treasure: +${gold} gold${extras.length?` · ${extras.join(', ')}`:''}`);
    requireFn('updateHUD')();
    const gearChance=requireFn('clamp')(.68+(level-1)*.055,0,.92);
    const done=()=>requireFn('returnToRoad')();
    if(random()<gearChance){
      const rarity=requireFn('rollGearRarity')(.05+(level-1)*.10+progress*.06);
      return requireFn('openLoot')(requireFn('generateEquipment')(rarity),done);
    }
    return done();
  }

  function open(){
    const p=player(),level=boardLevel();
    if(level>=4&&random()<memoryCacheChance()){
      const item=requireFn('generateLegendary')(null,true);
      clearCurrentTile(p.position);
      requireFn('addLog')(`<b>MEMORY CACHE.</b> The chest remembers a version of this road where ${item.icon} <b>${item.name}</b> was Legendary.`);
      requireFn('showToast')('🌟 MEMORY CACHE · Legendary gear',3200,true);
      return requireFn('openLoot')(item,()=>requireFn('returnToRoad')());
    }
    return openRegular();
  }

  function inspect(){return Object.freeze({owner:OWNER,memoryCache:Object.freeze({normal:1/450,nightmare:1/300,hell:1/200})});}
  const api=Object.freeze({configure,open,openRegular,memoryCacheChance,inspect,owner:OWNER});
  window.DiceboundRoadEventTreasure=api;
})();
