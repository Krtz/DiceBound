(() => {
  "use strict";

  const rarityApi=window.DiceboundRarities;
  if(!rarityApi)throw new Error("DiceboundEquipment requires DiceboundRarities before loading.");

  const EQUIPMENT_DATA={slots:[
    "weapon",
    "offhand",
    "boots",
    "legs",
    "chest",
    "hat",
    "ring",
    "amulet"
  ],labels:{
    "weapon": "Weapon",
    "offhand": "Offhand",
    "boots": "Boots",
    "legs": "Legs",
    "chest": "Chest",
    "hat": "Hat",
    "ring": "Ring",
    "amulet": "Amulet"
  },rarities:[...rarityApi.ids],ordinaryRarities:["poor","common","uncommon","rare","epic"],special:{
    "axels-coffee-mug": {
      "id": "axels-coffee-mug",
      "name": "Axel's Coffee Mug",
      "slot": "offhand",
      "rarity": "legendary"
    },
    "kratz-headphones": {
      "id": "kratz-headphones",
      "name": "Kratz Headphones",
      "slot": "hat",
      "rarity": "legendary"
    },
    "kellys-jean-jacket": {
      "id": "kellys-jean-jacket",
      "name": "The Jean Jacket Lost at Kelly's",
      "slot": "chest",
      "rarity": "legendary"
    },
    "devils-horns": {
      "id": "devils-horns",
      "name": "The Devil's Horns",
      "slot": "hat",
      "rarity": "omega"
    },
    "impossible-weapon": {
      "id": "impossible-weapon",
      "name": "Impossible Road Weapon",
      "slot": "weapon",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-offhand": {
      "id": "impossible-offhand",
      "name": "Impossible Road Offhand",
      "slot": "offhand",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-boots": {
      "id": "impossible-boots",
      "name": "Impossible Road Boots",
      "slot": "boots",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-legs": {
      "id": "impossible-legs",
      "name": "Impossible Road Legs",
      "slot": "legs",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-hat": {
      "id": "impossible-hat",
      "name": "Impossible Road Hat",
      "slot": "hat",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-ring": {
      "id": "impossible-ring",
      "name": "Impossible Road Ring",
      "slot": "ring",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-amulet": {
      "id": "impossible-amulet",
      "name": "Impossible Road Amulet",
      "slot": "amulet",
      "rarity": "artifact",
      "setName": "Impossible Road"
    }
  }};

  function createRegistry(){return JSON.parse(JSON.stringify(EQUIPMENT_DATA));}
  function ordinaryBaseName(slot){return EQUIPMENT_DATA.labels[slot]||String(slot||"Equipment");}
  function eligibleOrdinaryAffixes(pool,slot){return (pool||[]).filter(affix=>Array.isArray(affix?.slots)&&affix.slots.includes(slot));}
  function pickOrdinaryAffix(random,pool,slot){const eligible=eligibleOrdinaryAffixes(pool,slot);if(!eligible.length)return null;const roll=Math.max(0,Math.min(.999999999,Number(random?.())||0));return eligible[Math.floor(roll*eligible.length)];}

  // The runtime owns its current mutable balance tables and compatibility helpers;
  // this module owns the ordinary-item construction algorithm. Keeping those inputs
  // injected lets late compatibility patches update tables without recreating a
  // second live generator in dicebound.js.
  function generateOrdinaryFromSeedCode(code,deps){
    const parsed=deps.parseSeedCode(code);if(!parsed)return null;
    const {rarity,slot,classId,qualityBoost,core}=parsed,R=deps.seedRng(code),range=deps.rarityBudgets[rarity],budget=deps.seedInt(R,range[0],range[1])+qualityBoost,maxTier=deps.affixTiers[rarity],bonuses={};let spent=0,elementReserve=0,element=null;
    if(slot==="weapon"&&R()<deps.elementChanceForRarity(rarity)){elementReserve=rarity==="common"?4:5;element=deps.seedPick(R,deps.elementKeys);}
    const available=Math.max(4,budget-elementReserve),prefix=deps.pickAffix(R,deps.prefixes,slot),prefixTier=Math.max(1,Math.min(maxTier,deps.seedInt(R,Math.max(1,maxTier-1),maxTier)));
    if(prefix&&prefix.cost(prefixTier)<=available){prefix.apply(bonuses,prefixTier);spent+=prefix.cost(prefixTier);}
    let suffix=null,suffixTier=0;const suffixChance={common:.40,uncommon:.68,rare:.94,epic:1,legendary:1}[rarity];
    if(R()<suffixChance){suffix=deps.pickAffix(R,deps.suffixes,slot);suffixTier=Math.max(1,Math.min(maxTier,deps.seedInt(R,Math.max(1,maxTier-1),maxTier)));while(suffixTier>1&&suffix&&spent+suffix.cost(suffixTier)>available-4)suffixTier--;if(suffix&&spent+suffix.cost(suffixTier)<=available){suffix.apply(bonuses,suffixTier);spent+=suffix.cost(suffixTier);}else suffix=null;}
    const item={id:`gear_${deps.hashSeed(code).toString(36)}_${core}`,seed:code,seedCode:code,itemPower:budget,slot,rarity,icon:deps.gearIcon(slot),name:"",bonuses,prefix:prefix?prefix.names[prefixTier-1]:null,suffix:suffix?suffix.names[suffixTier-1]:null,affixTier:prefixTier,suffixTier,elementPowerCost:elementReserve};
    spent+=deps.spendBase(item,R,Math.max(0,available-spent));if(element){item.element=element;spent+=elementReserve;}item.spentPower=Math.min(budget,spent);const base=deps.baseName(slot);item.name=`${item.prefix?item.prefix+" ":""}${base}${item.suffix?" "+item.suffix:""}`;return item;
  }

  function generateOrdinaryItem({rarity,forcedSlot=null,slots,pick,random,classId,seedCode,generateFromSeedCode,rarityBudgets,clamp}){
    const slot=forcedSlot&&slots.includes(forcedSlot)?forcedSlot:pick(slots),core=`${Math.floor(random()*0xffffffff).toString(36)}${Math.floor(random()*0xffffffff).toString(36)}`;
    const code=seedCode(rarity,slot,classId,0,core);let item=generateFromSeedCode(code);
    if(!item||!slots.includes(item.slot))return null;
    item.itemPower=clamp(Number(item.itemPower)||rarityBudgets[rarity][0],rarityBudgets[rarity][0],rarityBudgets[rarity][1]);return item;
  }

  window.DiceboundEquipment=Object.freeze({apiVersion:1,createRegistry,ordinaryBaseName,eligibleOrdinaryAffixes,pickOrdinaryAffix,generateOrdinaryFromSeedCode,generateOrdinaryItem});
})();
