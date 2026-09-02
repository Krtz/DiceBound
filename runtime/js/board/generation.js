/* DiceBound Board-generation ownership.
 *
 * This module owns deterministic road/tile-array construction, enemy and pack
 * generation, Board-specific placement/pack overlays, and final Pale Devil
 * placement. DOM tile rendering, combat entry, movement, arrival dispatch,
 * Board transition, persistence and UI listeners remain in their existing
 * owners and enter through this narrow runtime contract.
 */
(function(){
  'use strict';

  const OWNER='board/generation';
  let runtime={};
  let finalRulesActive=false;

  function state(){
    const value=runtime.getState?.();
    if(!value||!Number.isFinite(value.boardLevel))throw new Error('DiceboundBoardGeneration requires live board state');
    return finalRulesActive?{...value,...(runtime.getModeState?.()||{})}:value;
  }
  function random(){return runtime.random?.();}
  function rand(min,max){return runtime.rand?.(min,max);}
  function pick(values){return runtime.pick?.(values);}
  function board(level){return runtime.getBoardDefinition?.(level)||{id:level,name:`Road ${level}`};}
  function drawSpecialIndexes(candidates,count){
    const chosen=[];
    for(let i=0;i<count&&candidates.length;i++){
      const at=rand(0,candidates.length-1);chosen.push(candidates.splice(at,1)[0]);
    }
    return chosen;
  }
  function enemyForPosition(index){
    const current=state(),pool=runtime.getEnemyPool?.()||[],level=current.boardLevel;
    const local=Math.floor(index/7)+1,floor=level===4?pool.length-3:level===3?Math.floor(pool.length*.76):level===2?Math.floor(pool.length*.55):0;
    const maxIndex=Math.min(pool.length-1,Math.max(floor,local+(level===4?11:level===3?8:level===2?5:0)));
    const enemy={...(pool[rand(Math.max(floor,maxIndex-3),maxIndex)]||{})};
    if(level===4)enemy.name=`${pick(['Crowned','Omega','Doomed','Sovereign'])} ${enemy.name}`;
    else if(level===3)enemy.name=`${pick(['Fractured','Impossible','Paradox','Nullborn'])} ${enemy.name}`;
    else if(level===2)enemy.name=`${pick(['Elder','Voidtouched','Ascended','Nightmare'])} ${enemy.name}`;
    if(level===5){
      enemy.name=`Ringbound ${enemy.name}`;
      enemy.hp=Math.round(enemy.hp*1.35);enemy.attack=Math.round(enemy.attack*1.25);enemy.defenseBias=(enemy.defenseBias||0)+2;
      enemy.weakness=enemy.weakness||pick(runtime.elementKeys?.()||[]);
    }
    return enemy;
  }
  function plannedPackSize(index){
    const level=state().boardLevel;
    if(level===5){const r=random();return r<.58?3:r<.92?2:1;}
    if(index<runtime.currentMinibossTile?.()-1)return 1;
    const r=random();
    if(level===4)return r<.50?3:r<.88?2:1;
    if(level===3)return r<.30?3:r<.72?2:1;
    if(level===2)return r<.20?3:r<.57?2:1;
    return r<.12?3:r<.38?2:1;
  }
  function merchantIndexes(count){
    const indexes=new Set(),spacing=runtime.merchantSpacing?.()||1;
    for(let n=spacing;n<count;n+=spacing)indexes.add(n-1);
    return indexes;
  }
  function populateEnemy(tile,index,packSize,extraOffset=5){
    tile.type='enemy';tile.packSize=packSize;tile.enemyBases=[enemyForPosition(index)];
    while(tile.enemyBases.length<tile.packSize)tile.enemyBases.push(enemyForPosition(index+rand(0,extraOffset)));
    tile.enemyBase=tile.enemyBases[0];
  }
  function ensureEnemyPack(tile,index,extraOffset=5){
    tile.enemyBases=tile.enemyBases&&tile.enemyBases.length?tile.enemyBases:[tile.enemyBase||enemyForPosition(index)];
    while(tile.enemyBases.length<(tile.packSize||1))tile.enemyBases.push(enemyForPosition(index+rand(0,extraOffset)));
    tile.enemyBase=tile.enemyBases[0];
  }
  function buildRoad({boardLevel,bloodwells,gamblers,minibossLevel=boardLevel}){
    const count=runtime.currentTileCount?.(),mini=runtime.currentMinibossTile?.()-1,merchants=merchantIndexes(count);
    const camps=new Set((runtime.currentCampTiles?.()||[]).filter(n=>n<count).map(n=>n-1));
    const reserved=new Set([0,count-1,mini,...merchants,...camps]),candidates=[];
    for(let i=5;i<count-4;i++)if(!reserved.has(i))candidates.push(i);
    const blessings=new Set(drawSpecialIndexes(candidates,runtime.gameplayTalentRank?.('fortune_omens')?2:1));
    const mystics=new Set(drawSpecialIndexes(candidates,runtime.gameplayTalentRank?.('fortune_omens')?2:1));
    const powerups=new Set(drawSpecialIndexes(candidates,runtime.currentPowerupCount?.()));
    const wheels=new Set(drawSpecialIndexes(candidates,runtime.currentWheelCount?.()));
    const bloodwellIndexes=new Set(drawSpecialIndexes(candidates,bloodwells));
    const gamblerIndexes=new Set(drawSpecialIndexes(candidates,gamblers));
    const tiles=[];
    for(let i=0;i<count;i++){
      let tile={type:'empty',cleared:false,packSize:1};
      if(i===0)tile.type='start';
      else if(i===count-1)tile.type='boss';
      else if(i===mini){tile.type='miniboss';tile.enemyBase=runtime.enemyById?.(board(minibossLevel).minibossId);}
      else if(merchants.has(i))tile.type='merchant';
      else if(camps.has(i))tile.type='camp';
      else if(blessings.has(i))tile.type='blessing';
      else if(mystics.has(i))tile.type='mystic';
      else if(powerups.has(i))tile.type='powerup';
      else if(wheels.has(i))tile.type='wheel';
      else if(bloodwellIndexes.has(i))tile.type='bloodwell';
      else if(gamblerIndexes.has(i))tile.type='gambler';
      else{
        const kind=runtime.roadTileType?.(random(),boardLevel);
        if(kind==='enemy')populateEnemy(tile,i,plannedPackSize(i));else tile.type=kind;
      }
      tiles.push(tile);
    }
    return {tiles,merchantFaceTotal:merchants.size};
  }
  function forceBoardOnePlacement(tiles){
    const mini=runtime.currentMinibossTile?.()-1;
    const forceEarly=(type,avoid=[])=>{
      const before=tiles.findIndex((tile,index)=>index>2&&index<mini&&tile.type===type);if(before>=0)return;
      const source=tiles.findIndex((tile,index)=>index>mini&&tile.type===type);if(source<0)return;
      const destination=tiles.findIndex((tile,index)=>index>4&&index<mini&&!avoid.includes(index)&&['enemy','event','treasure','empty','wheel','powerup'].includes(tile.type));if(destination<0)return;
      const swap=tiles[destination];tiles[destination]=tiles[source];tiles[source]=swap;avoid.push(destination);
    };
    const used=[];forceEarly('blessing',used);forceEarly('mystic',used);
  }
  function retainRetiredBoardOneDevilCleanup(tiles,current){
    // The published V24/V25 chain briefly placed the invitation encounter on
    // Board 1 and then cleared that same tile.  The encounter is retired, but
    // its final empty-road result is observable and therefore remains part of
    // the generation contract (with no RNG consumption).
    if(!(current.hellMode&&current.devilPrimed&&current.boardLevel===1))return;
    let index=tiles.findIndex((tile,at)=>at>=28&&at<=42&&['enemy','event','treasure','empty'].includes(tile.type));
    if(index<0)index=Math.min(34,tiles.length-2);
    tiles[index]={type:'empty',cleared:false};
  }
  function resetBoardSixPack(tile,index,offset){
    tile.enemyBases=[];
    for(let n=0;n<tile.packSize;n++){
      const enemy=enemyForPosition(index+n+offset);enemy.name=`${pick(['Abyssal','Final','Worldless','Entropy-Bound'])} ${enemy.name}`;tile.enemyBases.push(enemy);
    }
    tile.enemyBase=tile.enemyBases[0];
  }
  function applyBoardSixFirstPass(tiles){
    const mini=runtime.currentMinibossTile?.()-1,last=runtime.currentTileCount?.()-1;
    tiles[mini]={type:'miniboss',cleared:false,packSize:1,enemyBase:runtime.enemyById?.(board(6).minibossId)};
    tiles[last]={type:'boss',cleared:false,packSize:1};
    tiles.forEach((tile,index)=>{if(tile.type!=='enemy')return;tile.packSize=index<mini?1:(random()<.66?3:2);resetBoardSixPack(tile,index,12);});
  }
  function applyBoardSixSecondPass(tiles){
    const mini=runtime.currentMinibossTile?.()-1,balance=board(6).balance||{};
    tiles.forEach((tile,index)=>{
      if(tile.type!=='enemy'||index<mini)return;
      const target=random()<(balance.threePackChance||0)?3:2;
      if(tile.packSize===target&&tile.enemyBases?.length===target)return;
      tile.packSize=target;resetBoardSixPack(tile,index,14);
    });
  }
  function applyPaleDevil(tiles,current){
    if(!(current.hellMode&&current.devilPrimed&&current.boardLevel===2)||tiles.some(tile=>tile?.type==='devilboss'))return;
    const mini=runtime.currentMinibossTile?.()-1,lo=Math.max(mini+10,Math.floor(tiles.length*.62)),hi=Math.min(tiles.length-3,Math.floor(tiles.length*.82)),candidates=[];
    for(let i=lo;i<=hi;i++)if(['enemy','event','treasure','empty'].includes(tiles[i]?.type))candidates.push(i);
    const index=candidates.length?pick(candidates):Math.min(tiles.length-3,mini+18);
    tiles[index]={type:'devilboss',cleared:false,packSize:1,enemyBase:{name:'The Pale Devil',icon:'👿🌙',hp:260,attack:39,defenseBias:8,xp:740,gold:666,weakness:'light',specialName:'Pale Moon Waltz',devilBoss:true,enemyBarrier:5}};
  }
  function applyBoardFourFivePass046(tiles,current){
    const mini=runtime.currentMinibossTile?.()-1;
    if(current.boardLevel===5){
      tiles.forEach((tile,index)=>{
        if(!tile||index===0||index===tiles.length-1||index===mini||['merchant','camp','blessing','mystic','powerup','wheel','bloodwell','gambler'].includes(tile.type))return;
        if(index>mini){
          if(tile.type==='event'&&random()<.45)populateEnemy(tile,index,random()<.55?3:2);
          else if(tile.type==='treasure'&&random()<.28)populateEnemy(tile,index,random()<.45?3:2);
          else if(tile.type==='enemy'){tile.packSize=Math.max(tile.packSize||1,random()<.62?3:2);ensureEnemyPack(tile,index);}
        }
      });
    }else if(current.boardLevel===4){
      tiles.forEach((tile,index)=>{
        if(!tile||index<=mini||tile.type!=='enemy')return;
        tile.packSize=Math.max(tile.packSize||1,random()<.35?3:2);ensureEnemyPack(tile,index);
      });
    }
  }
  function applyBoardFourFivePass047(tiles,current){
    const mini=runtime.currentMinibossTile?.()-1;
    if(current.boardLevel===5){
      tiles.forEach((tile,index)=>{
        if(!tile||index<=mini||index>=tiles.length-1)return;
        if(tile.type==='event'&&random()<.52){tile.type='enemy';tile.packSize=random()<.68?3:2;}
        else if(tile.type==='treasure'&&random()<.35){tile.type='enemy';tile.packSize=random()<.60?3:2;}
        else if(tile.type==='enemy')tile.packSize=Math.max(tile.packSize||1,random()<.72?3:2);
        if(tile.type==='enemy')ensureEnemyPack(tile,index);
      });
    }
    if(current.boardLevel===4){
      tiles.forEach((tile,index)=>{
        if(!tile||index<=mini||tile.type!=='enemy')return;
        if(random()<.38){tile.packSize=Math.max(tile.packSize||1,2);ensureEnemyPack(tile,index,4);}
      });
    }
  }
  function build(){
    const current=state(),road=current.boardLevel===5
      ?buildRoad({boardLevel:5,bloodwells:1,gamblers:1,minibossLevel:5})
      :buildRoad({boardLevel:current.boardLevel,bloodwells:current.boardLevel===4?1:2,gamblers:current.boardLevel===4?1:2});
    const tiles=road.tiles;
    // The compatibility monolith first built its preview Board 1 before the
    // later Board-specific patches were defined.  Keep that startup phase
    // base-only, then activate the final published rule set at the precise
    // former DB047 boundary for all actual runs and later rebuilds.
    if(finalRulesActive){
      if(current.boardLevel===1)forceBoardOnePlacement(tiles);
      retainRetiredBoardOneDevilCleanup(tiles,current);
      if(current.boardLevel===6){applyBoardSixFirstPass(tiles);applyBoardSixSecondPass(tiles);}
      applyPaleDevil(tiles,current);
      applyBoardFourFivePass046(tiles,current);
      applyBoardFourFivePass047(tiles,current);
    }
    runtime.setRoad?.({tiles,merchantFaceTotal:road.merchantFaceTotal});
  }
  function generate(){
    const work=()=>build();
    return runtime.withRunTalentSnapshot?runtime.withRunTalentSnapshot(work):work();
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function activateFinalRules(){finalRulesActive=true;return api;}
  function inspect(){return Object.freeze({owner:OWNER,configured:typeof runtime.getState==='function',finalRulesActive});}
  const api=Object.freeze({configure,generate,enemyForPosition,activateFinalRules,inspect,owner:OWNER});
  window.DiceboundBoardGeneration=api;
})();
