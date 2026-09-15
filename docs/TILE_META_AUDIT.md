# Exact released `tileMeta` generation audit

Found **8** generations in source order.

## 1. `BASE`

```js
function tileMeta(tile){if(tile.type==="enemy"&&tile.enemyBase){const n=tile.packSize||1;return [n===1?tile.enemyBase.icon:n===2?"👹👹":"👹👹👹",n===1?`${tile.enemyBase.name} · 1 enemy`:`Enemy pack · ${n}`];}if(tile.type==="miniboss"&&tile.enemyBase)return [tile.enemyBase.icon,"Mini Boss · 1 enemy"];return {start:["🏠","Start"],empty:["·","Road"],event:["🎰","Slots"],wheel:["🎡","Wheel"],powerup:["🎁","Powerup"],treasure:["💰","Treasure"],camp:["🔥","Camp"],merchant:["🧔","Merchant"],blessing:["✨","Blessing"],mystic:["🔮","Mystic"],bloodwell:["🩸","Bloodwell"],gambler:["🪙","Gambler"],boss:["🐉","Final Boss · 1"]}[tile.type];}
```

## 2. `tileMetaV24Base`

```js
const tileMetaV24Base=tileMeta;tileMeta=function(tile){if(tile?.type==='devilboss')return ['👿🌙','???'];return tileMetaV24Base(tile);}
```

## 3. `tileMetaBeta043Base`

```js
const tileMetaBeta043Base=tileMeta;
  tileMeta=function(tile){
    if(tile?.type==='treasure')return [beta043Art('coins','Treasure','db-art-tile')||'💰','Treasure'];
    if(tile?.type==='gambler')return [beta043Art('gambler','Gambler','db-art-tile')||'🪙','Gambler'];
    return tileMetaBeta043Base(tile);
  }
```

## 4. `tileMetaBeta045Base`

```js
const tileMetaBeta045Base=tileMeta;
  tileMeta=function(tile){
    if(tile?.enemyBase?.name){
      const art=beta045EnemyArtForName(tile.enemyBase.name);
      if(art&&tile.type==='enemy'){
        const count=tile.packSize||1;
        return [count>1?`${art}${art}`:art,count>1?`${tile.enemyBase.name} pack ×${count}`:`${tile.enemyBase.name} · 1 enemy`];
      }
      if(art&&tile.type==='miniboss')return [art,'Mini Boss · 1 enemy'];
    }
    return tileMetaBeta045Base(tile);
  }
```

## 5. `db046TileMetaBase`

```js
const db046TileMetaBase=tileMeta;
  tileMeta=function(tile){
    if(tile?.enemyBase?.name){
      const art=db046EnemyArtForName(tile.enemyBase.name);
      if(art&&tile.type==='enemy'){
        const count=tile.packSize||1;
        return [count>1?`${art}${art}`:art,count>1?`${tile.enemyBase.name} pack ×${count}`:`${tile.enemyBase.name} · 1 enemy`];
      }
      if(art&&tile.type==='miniboss')return [art,'Mini Boss · 1 enemy'];
    }
    return db046TileMetaBase(tile);
  }
```

## 6. `db047TileMetaBase`

```js
const db047TileMetaBase=tileMeta;
  function db047CompactEnemyTile(icon,enemyName,count=1){
    const n=Math.max(1,Number(count)||1);
    const visual=n>1?`<span class="db-enemy-pack-art">${icon}<b>×${n}</b></span>`:icon;
    return [visual,n>1?`${enemyName} · ${n} enemies`:`${enemyName} · 1 enemy`];
  }
  tileMeta=function(tile){
    const enemyName=tile?.enemyBase?.name||'';
    if(enemyName){
      if(/bandit/i.test(enemyName)){const icon=db047UiArt('bandit',enemyName,'db-art-portrait');if(icon)return db047CompactEnemyTile(icon,enemyName,tile.packSize||1);}
      if(/troll/i.test(enemyName)){const icon=db047UiArt('troll',enemyName,'db-art-portrait');if(icon)return db047CompactEnemyTile(icon,enemyName,tile.packSize||1);}
    }
    return db047TileMetaBase(tile);
  }
```

## 7. `db049TileMetaBase`

```js
const db049TileMetaBase=tileMeta;
  tileMeta=function(tile){
    if(tile?.type==='enemy'&&Number(tile.packSize||1)>1&&tile?.enemyBase){
      const count=Math.max(2,Number(tile.packSize)||2),name=tile.enemyBase.name||'Enemy';
      return [`<span class="db-enemy-pack-art">${db049EnemyTileIcon(tile)}<b>×${count}</b></span>`,`${name} pack · ${count} enemies`];
    }
    if(tile?.type==='enemy'&&tile?.enemyBase&&(/bandit|troll/i.test(tile.enemyBase.name||''))){
      return [db049EnemyTileIcon(tile),`${tile.enemyBase.name} · 1 enemy`];
    }
    return db049TileMetaBase(tile);
  }
```

## 8. `db060TileMetaBase`

```js
const db060TileMetaBase=tileMeta;
  tileMeta=function(tile){
    if(tile?.type==='miniboss'&&tile.enemyBase?.id&&db060GuardianArt(tile.enemyBase.id))return [db060GuardianTileArt(tile.enemyBase.id,tile.enemyBase.name),'Mini Boss · 1 enemy'];
    if(tile?.type==='boss'){
      const boss=DB317_GUARDIANS.resolveFinal(boardLevel);
      if(boss?.id&&boss.art?.boardMarker)return [db060GuardianTileArt(boss.id,boss.name),'Final Boss · 1 enemy'];
    }
    return db060TileMetaBase(tile);
  }
```
