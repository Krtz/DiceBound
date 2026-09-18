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
  const LUCK_RARITY_POLICY=Object.freeze({
    lowTierSuppressionStart:1,
    lowTierSuppressionFull:2
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
  // The original 0.6.6.6 contract made 200 Luck the deterministic Uncommon
  // floor. 0.6.7.7 keeps that endpoint but removes the 100->200 dead zone:
  // Poor/Common probability now fades linearly from 100 Luck and reaches zero
  // at 200, without consuming an additional gameplay RNG draw.
  function lowTierSuppression(luck){
    const value=Math.max(0,Number(luck)||0);
    const start=LUCK_RARITY_POLICY.lowTierSuppressionStart,full=LUCK_RARITY_POLICY.lowTierSuppressionFull;
    return clamp01((value-start)/Math.max(.000001,full-start));
  }
  function lowTierWeightMultiplier(rarity,luck){
    const id=String(rarity||"").toLowerCase();
    return id==="poor"||id==="common"?1-lowTierSuppression(luck):1;
  }
  function luckFloor(luck){return lowTierSuppression(luck)>=1?"uncommon":"poor";}
  function promoteOrdinaryRarityForLuck(rarity,luck){
    const index=ORDINARY_LOOT_PROGRESSION.indexOf(String(rarity||"").toLowerCase()),floor=ORDINARY_LOOT_PROGRESSION.indexOf(luckFloor(luck));
    return index<0?rarity:ORDINARY_LOOT_PROGRESSION[Math.max(index,floor)];
  }
  function filterPowerupPoolForLuck(pool,luck){
    if(!Array.isArray(pool)||lowTierSuppression(luck)<1)return Array.isArray(pool)?pool:[];
    const eligible=pool.filter(entry=>!["poor","common"].includes(String(entry?.rarity||"").toLowerCase()));
    return eligible.length?eligible:pool;
  }

  function suppressLowTierRows(rows,luck){
    if(!Array.isArray(rows))return [];
    const suppression=lowTierSuppression(luck);
    const out=rows.map(row=>[String(row?.[0]||""),Math.max(0,Number(row?.[1])||0)]);
    if(suppression<=0)return out;
    let moved=0,uncommonIndex=-1;
    for(let i=0;i<out.length;i++){
      const id=out[i][0];
      if(id==="uncommon")uncommonIndex=i;
      if(id!=="poor"&&id!=="common")continue;
      const removed=out[i][1]*suppression;
      out[i][1]-=removed;
      moved+=removed;
    }
    if(moved>0){
      if(uncommonIndex>=0)out[uncommonIndex][1]+=moved;
      else out.push(["uncommon",moved]);
    }
    return out;
  }

  function ordinaryGearRows({bonus=0,depth=0,luck=0,nightmare=false,hell=false}={}){
    const rawLuck=Math.max(0,Number(luck)||0),luckCurve=1-Math.exp(-rawLuck*.55);
    const boost=(Number(bonus)||0)+(Number(depth)||0)*.055+luckCurve*.44+(nightmare?.035:0)+(hell?.035:0);
    const epic=clamp01(.006+boost*.055);
    const rare=Math.max(epic,clamp01(.038+boost*.14));
    const uncommon=Math.max(rare,clamp01(.145+boost*.31));
    const common=Math.max(uncommon,clamp01(.45+boost*.58));
    return suppressLowTierRows([
      ["epic",epic],
      ["rare",rare-epic],
      ["uncommon",uncommon-rare],
      ["common",common-uncommon],
      ["poor",1-common]
    ],rawLuck);
  }
  function weightedRarityFromRows(rows,roll){
    if(!Array.isArray(rows)||!rows.length)throw new TypeError("weightedRarityFromRows requires rows.");
    const total=rows.reduce((sum,row)=>sum+Math.max(0,Number(row?.[1])||0),0);
    if(total<=0)return rows[rows.length-1][0];
    let cursor=clamp01(roll)*total;
    for(const row of rows){
      cursor-=Math.max(0,Number(row?.[1])||0);
      if(cursor<=0)return row[0];
    }
    return rows[rows.length-1][0];
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
    createInfoRegistry,
    createValueRegistry,
    isPowerupRarityAtLeast,
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
