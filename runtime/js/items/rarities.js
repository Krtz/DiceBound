(() => {
  "use strict";

  const RARITY_INFO_DATA={
    "common": {
      "label": "Common",
      "weight": 25
    },
    "uncommon": {
      "label": "Uncommon",
      "weight": 7.5
    },
    "rare": {
      "label": "Rare",
      "weight": 1.9
    },
    "epic": {
      "label": "Epic",
      "weight": 0.42
    },
    "legendary": {
      "label": "Legendary",
      "weight": 0.028
    },
    "mythical": {
      "label": "Mythical",
      "weight": 0
    },
    "omega": {
      "label": "Omega",
      "weight": 0
    },
    "poor": {
      "label": "Poor",
      "weight": 68
    },
    "artifact": {
      "label": "Artifact",
      "weight": 0.003
    }
  };

  const RARITY_VALUE_DATA={
    "common": 2,
    "uncommon": 3,
    "rare": 4,
    "epic": 5,
    "legendary": 7,
    "mythical": 11,
    "omega": 14,
    "poor": 1,
    "artifact": 9
  };

  const RARITY_IDS=Object.freeze(Object.keys(RARITY_INFO_DATA));
  // Powerup offers deliberately use the normal progression only. Artifact and
  // Omega are distinct content types, so their display order must never make
  // them implicitly eligible for a "Rare+" reward.
  const POWERUP_PROGRESSION=Object.freeze(["common","uncommon","rare","epic","legendary","mythical"]);
  const ORDINARY_LOOT_PROGRESSION=Object.freeze(["poor","common","uncommon","rare","epic"]);
  const RARITY_LADDER=Object.freeze(["poor","common","uncommon","rare","epic","legendary","mythical","artifact","omega"]);
  const LUCK_RARITY_POLICY=Object.freeze({
    displayedPerInternal:100,
    shiftPerDisplayedPoint:.005
  });

  function clamp01(value){return Math.max(0,Math.min(1,Number(value)||0));}
  function createInfoRegistry(){return JSON.parse(JSON.stringify(RARITY_INFO_DATA));}
  function createValueRegistry(){return JSON.parse(JSON.stringify(RARITY_VALUE_DATA));}
  function isPowerupRarityAtLeast(rarity,floor="rare"){
    const rarityIndex=POWERUP_PROGRESSION.indexOf(String(rarity||"").toLowerCase());
    const floorIndex=POWERUP_PROGRESSION.indexOf(String(floor||"").toLowerCase());
    return rarityIndex>=0&&floorIndex>=0&&rarityIndex>=floorIndex;
  }

  // Luck is stored internally as a decimal: 1.00 == 100 displayed Luck.
  // Every displayed Luck point contributes exactly 0.5 percentage points of
  // upward rarity-shift budget. The budget drains the lowest available tier,
  // redistributes that mass proportionally across all higher available tiers,
  // then continues into the next tier once the lower one reaches zero.
  function luckShiftBudget(luck){
    return Math.max(0,Number(luck)||0)*LUCK_RARITY_POLICY.displayedPerInternal*LUCK_RARITY_POLICY.shiftPerDisplayedPoint;
  }
  function cascadeLuckRows(rows,luck,progression=RARITY_LADDER){
    if(!Array.isArray(rows))return [];
    const out=rows.map(row=>[String(row?.[0]||"").toLowerCase(),Math.max(0,Number(row?.[1])||0)]);
    const total=out.reduce((sum,row)=>sum+row[1],0);
    if(total<=0)return out;
    let budget=luckShiftBudget(luck)*total;
    if(budget<=0)return out;
    const indexById=new Map(out.map((row,index)=>[row[0],index]));
    const ordered=(Array.isArray(progression)?progression:RARITY_LADDER).map(id=>String(id||"").toLowerCase()).filter(id=>indexById.has(id));
    for(let tierIndex=0;tierIndex<ordered.length-1&&budget>1e-12;tierIndex++){
      const id=ordered[tierIndex],rowIndex=indexById.get(id),available=out[rowIndex][1];
      if(available<=1e-12)continue;
      const higher=ordered.slice(tierIndex+1).map(higherId=>indexById.get(higherId));
      if(!higher.length)break;
      const drained=Math.min(available,budget);
      const higherTotal=higher.reduce((sum,index)=>sum+out[index][1],0);
      out[rowIndex][1]=Math.max(0,available-drained);
      if(higherTotal>1e-12){
        for(const index of higher)out[index][1]+=drained*(out[index][1]/higherTotal);
      }else{
        out[higher[0]][1]+=drained;
      }
      budget-=drained;
    }
    return out;
  }

  // Compatibility helpers remain callable for older focused consumers, but the
  // canonical selection paths use cascadeLuckRows directly.
  function lowTierSuppression(luck){return clamp01(luckShiftBudget(luck)/.55);}
  function lowTierWeightMultiplier(rarity,luck){return String(rarity||"").toLowerCase()==="poor"?1-lowTierSuppression(luck):1;}
  function luckFloor(luck){
    const rows=ordinaryGearRows({luck});
    for(const id of ORDINARY_LOOT_PROGRESSION){
      const row=rows.find(entry=>entry[0]===id);
      if((row?.[1]||0)>1e-12)return id;
    }
    return ORDINARY_LOOT_PROGRESSION.at(-1);
  }
  function promoteOrdinaryRarityForLuck(rarity,luck){
    const index=ORDINARY_LOOT_PROGRESSION.indexOf(String(rarity||"").toLowerCase()),floor=ORDINARY_LOOT_PROGRESSION.indexOf(luckFloor(luck));
    return index<0?rarity:ORDINARY_LOOT_PROGRESSION[Math.max(index,floor)];
  }
  function filterPowerupPoolForLuck(pool){return Array.isArray(pool)?pool:[];}
  function suppressLowTierRows(rows,luck){return cascadeLuckRows(rows,luck,RARITY_LADDER);}

  function ordinaryGearRows({bonus=0,depth=0,luck=0,nightmare=false,hell=false}={}){
    const rawLuck=Math.max(0,Number(luck)||0);
    const boost=(Number(bonus)||0)+(Number(depth)||0)*.055+(nightmare?.035:0)+(hell?.035:0);
    const epic=clamp01(.006+boost*.055);
    const rare=Math.max(epic,clamp01(.038+boost*.14));
    const uncommon=Math.max(rare,clamp01(.145+boost*.31));
    const common=Math.max(uncommon,clamp01(.45+boost*.58));
    return cascadeLuckRows([
      ["epic",epic],
      ["rare",rare-epic],
      ["uncommon",uncommon-rare],
      ["common",common-uncommon],
      ["poor",1-common]
    ],rawLuck,ORDINARY_LOOT_PROGRESSION);
  }
  function weightedRarityFromRows(rows,roll){
    if(!Array.isArray(rows)||!rows.length)throw new TypeError("weightedRarityFromRows requires rows.");
    const total=rows.reduce((sum,row)=>sum+Math.max(0,Number(row?.[1])||0),0);
    if(total<=0)return rows[rows.length-1][0];
    let cursor=clamp01(roll)*total;
    let fallback=rows[rows.length-1][0];
    for(const row of rows){
      const weight=Math.max(0,Number(row?.[1])||0);
      if(weight<=0)continue;
      fallback=row[0];
      cursor-=weight;
      if(cursor<=0)return row[0];
    }
    return fallback;
  }
  function rollOrdinaryGearRarity({roll=0,bonus=0,depth=0,luck=0,nightmare=false,hell=false}={}){
    return weightedRarityFromRows(ordinaryGearRows({bonus,depth,luck,nightmare,hell}),roll);
  }

  window.DiceboundRarities=Object.freeze({
    apiVersion:2,
    ids:RARITY_IDS,
    powerupProgression:POWERUP_PROGRESSION,
    ordinaryLootProgression:ORDINARY_LOOT_PROGRESSION,
    luckPolicy:LUCK_RARITY_POLICY,
    rarityLadder:RARITY_LADDER,
    createInfoRegistry,
    createValueRegistry,
    isPowerupRarityAtLeast,
    luckShiftBudget,
    cascadeLuckRows,
    lowTierSuppression,
    lowTierWeightMultiplier,
    luckFloor,
    promoteOrdinaryRarityForLuck,
    filterPowerupPoolForLuck,
    suppressLowTierRows,
    ordinaryGearRows,
    weightedRarityFromRows,
    rollOrdinaryGearRarity
  });
})();
