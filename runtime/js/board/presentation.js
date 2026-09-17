(()=>{
  "use strict";

  const OWNER="board/presentation";
  const assets=window.DiceboundAssets;
  const guardians=window.DiceboundGuardians;
  if(!assets?.resolveUiIcon||!assets?.resolveGuardianArt||!assets?.resolveEnemyPortraitById)throw new Error("DiceboundBoardPresentation requires DiceboundAssets before loading.");
  if(!guardians?.resolveById||!guardians?.resolveFinal)throw new Error("DiceboundBoardPresentation requires DiceboundGuardians before loading.");

  let runtime=Object.freeze({getBoardLevel:()=>1});
  function configure(next={}){
    if(typeof next.getBoardLevel!=="function")throw new Error("DiceboundBoardPresentation requires getBoardLevel().");
    runtime=Object.freeze({...runtime,...next});
    return api;
  }

  function uiArt(key,label="",klass="db-art-inline"){
    const entry=assets.resolveUiIcon(key)||null;
    if(!entry?.image)return "";
    const alt=(label||entry.alt||key||"").replace(/"/g,"&quot;");
    return `<img class="db-art-icon ${klass}" src="${entry.image}" alt="${alt}">`;
  }

  function enemyArtForId(id,label=""){
    const entry=assets.resolveEnemyPortraitById(id);
    if(!entry)return "";
    const alt=(label||entry.alt||id||"Enemy").replace(/"/g,"&quot;");
    return `<img class="db-art-icon db-art-portrait" src="${entry.src}" alt="${alt}">`;
  }

  function guardianTileArt(id,alt="Guardian"){
    const src=guardians.resolveById(id)?.art?.boardMarker||assets.resolveGuardianArt(id)?.boardMarker;
    return src?`<img class="db060-guardian-tile-art" src="${src}" alt="${alt}" draggable="false">`:"";
  }

  function enemyTileIcon(tile){
    const art=enemyArtForId(tile?.enemyBase?.id,tile?.enemyBase?.name);
    if(art)return art;
    return typeof tile?.enemyBase?.icon==="string"&&tile.enemyBase.icon?tile.enemyBase.icon:"👹";
  }

  function tileMeta(tile,{ready=true}={}){
    if(ready){
      if(tile?.type==="miniboss"&&tile.enemyBase?.id&&guardians.resolveById(tile.enemyBase.id)?.art?.boardMarker){
        return [guardianTileArt(tile.enemyBase.id,tile.enemyBase.name),"Mini Boss · 1 enemy"];
      }
      if(tile?.type==="boss"){
        const boss=guardians.resolveFinal(runtime.getBoardLevel());
        if(boss?.id&&boss.art?.boardMarker)return [guardianTileArt(boss.id,boss.name),"Final Boss · 1 enemy"];
      }
      if(tile?.type==="enemy"&&Number(tile.packSize||1)>1&&tile?.enemyBase){
        const count=Math.max(2,Number(tile.packSize)||2),name=tile.enemyBase.name||"Enemy";
        return [`<span class="db-enemy-pack-art">${enemyTileIcon(tile)}<b>×${count}</b></span>`,`${name} pack · ${count} enemies`];
      }
      if(tile?.type==="enemy"&&tile?.enemyBase&&["bandit","troll"].includes(tile.enemyBase.id)){
        return [enemyTileIcon(tile),`${tile.enemyBase.name} · 1 enemy`];
      }
      if(tile?.type==="treasure")return [uiArt("coins","Treasure","db-art-tile")||"💰","Treasure"];
      if(tile?.type==="gambler")return [uiArt("gambler","Gambler","db-art-tile")||"🪙","Gambler"];
      if(tile?.type==="devilboss")return ["👿🌙","???"];
    }

    if(tile?.type==="enemy"&&tile.enemyBase){
      const count=tile.packSize||1;
      return [count===1?tile.enemyBase.icon:count===2?"👹👹":"👹👹👹",count===1?`${tile.enemyBase.name} · 1 enemy`:`Enemy pack · ${count}`];
    }
    if(tile?.type==="miniboss"&&tile.enemyBase)return [tile.enemyBase.icon,"Mini Boss · 1 enemy"];
    return {
      start:["🏠","Start"],empty:["·","Road"],event:["🎰","Slots"],wheel:["🎡","Wheel"],powerup:["🎁","Powerup"],treasure:["💰","Treasure"],camp:["🔥","Camp"],merchant:["🧔","Merchant"],blessing:["✨","Blessing"],mystic:["🔮","Mystic"],bloodwell:["🩸","Bloodwell"],gambler:["🪙","Gambler"],boss:["🐉","Final Boss · 1"]
    }[tile?.type];
  }

  function isTraversed(tile){return !!tile?.traversed&&tile?.type!=="merchant";}
  function tileClassName(tile,{current=false}={}){
    const classes=["tile",tile?.type||"empty"];
    if(tile?.cleared)classes.push("cleared");
    if(isTraversed(tile))classes.push("traversed");
    if(current)classes.push("current");
    return classes.join(" ");
  }
  function applyTileState(el,tile,{current=false}={}){
    if(!el?.classList)return el;
    el.classList.toggle("current",!!current);
    el.classList.toggle("cleared",!!tile?.cleared);
    el.classList.toggle("traversed",isTraversed(tile));
    return el;
  }

  const api=Object.freeze({owner:OWNER,apiVersion:1,configure,tileMeta,enemyArtForId,isTraversed,tileClassName,applyTileState,inspect:()=>Object.freeze({owner:OWNER,apiVersion:1}),test:Object.freeze({uiArt,guardianTileArt,enemyTileIcon})});
  window.DiceboundBoardPresentation=api;
})();
