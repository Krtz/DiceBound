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
  },identities:[
    {id:"bronze-longsword",displayName:"Bronze Longsword",slot:"weapon",family:"sword",material:"bronze",weight:"medium",tags:["martial","material-tier"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{fighter:1.6,paladin:1.8},intrinsicBonuses:{attack:1},art:{image:"assets/equipment/weapon/bronze-longsword.png",alt:"Worn bronze longsword"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"shortbow",displayName:"Shortbow",slot:"weapon",family:"shortbow",material:"wood",weight:"light",tags:["ranged","starter"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{ranger:2,beastmaster:1.35},intrinsicBonuses:{attack:1,crit:.01},art:{image:"assets/equipment/weapon/shortbow.png",alt:"Worn wooden shortbow"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"rubber-chicken",displayName:"Rubber Chicken",slot:"weapon",family:"improvised",material:"rubber",weight:"light",tags:["weird","clown"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{clown:2},intrinsicBonuses:{attack:1},art:{image:"assets/equipment/weapon/rubber-chicken.png",alt:"Battered yellow rubber chicken"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"crimson-brush",displayName:"Crimson Brush",slot:"weapon",family:"brush",material:"redwood-bristle",weight:"light",tags:["artist","crimson","weird"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{rouge:2},intrinsicBonuses:{attack:1,elementProcBonus:.01},art:{image:"assets/equipment/weapon/crimson-brush.png",alt:"Crimson paint brush"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"tongue-lash",displayName:"Tongue Lash",slot:"weapon",family:"whip",material:"flesh",weight:"light",tags:["frog","weird"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{frog:2},intrinsicBonuses:{attack:1,doubleStrike:.02},art:{image:"assets/equipment/weapon/tongue-lash.png",alt:"Slimy frog-tongue whip"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"bronze-round-shield",displayName:"Bronze Round Shield",slot:"offhand",family:"round-shield",material:"bronze-wood",weight:"medium",tags:["martial","guardian","material-tier"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{fighter:1.6,paladin:1.9,turtle:1.45},intrinsicBonuses:{defense:1},art:{image:"assets/equipment/offhand/bronze-round-shield.png",alt:"Battered bronze-rimmed round shield"},visual:{rig:"humanoid-v1",anchor:"offhand",layer:40}},
    {id:"bronze-armoured-boots",displayName:"Bronze Armoured Boots",slot:"boots",family:"armoured-boots",material:"bronze-leather",weight:"medium",tags:["martial","plate","material-tier"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{fighter:1.45,paladin:1.7},intrinsicBonuses:{defense:1},art:{image:"assets/equipment/boots/bronze-armoured-boots.png",alt:"Worn bronze armoured boots"},visual:{rig:"humanoid-v1",anchor:"feet",layer:20}},
    {id:"bronze-platelegs",displayName:"Bronze Platelegs",slot:"legs",family:"platelegs",material:"bronze",weight:"medium",tags:["martial","plate","material-tier"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{fighter:1.45,paladin:1.7},intrinsicBonuses:{defense:1},art:{image:"assets/equipment/legs/bronze-platelegs.png",alt:"Worn bronze platelegs"},visual:{rig:"humanoid-v1",anchor:"legs",layer:20}},
    {id:"bronze-platebody",displayName:"Bronze Platebody",slot:"chest",family:"platebody",material:"bronze",weight:"heavy",tags:["martial","plate","material-tier"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{fighter:1.6,paladin:1.9},intrinsicBonuses:{defense:2},art:{image:"assets/equipment/chest/bronze-platebody.png",alt:"Worn bronze platebody"},visual:{rig:"humanoid-v1",anchor:"torso",layer:30}},
    {id:"bronze-full-helm",displayName:"Bronze Full Helm",slot:"hat",family:"full-helm",material:"bronze",weight:"medium",tags:["martial","plate","material-tier"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{fighter:1.45,paladin:1.7},intrinsicBonuses:{defense:1},art:{image:"assets/equipment/hat/bronze-full-helm.png",alt:"Worn bronze full helm"},visual:{rig:"humanoid-v1",anchor:"head",layer:60}},
    {id:"oak-shortbow",displayName:"Oak Shortbow",slot:"weapon",family:"shortbow",material:"wood",weight:"light",tags:["ranged","bow","starter"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{ranger:2,beastmaster:1.35},intrinsicBonuses:{attack:2,crit:.01},art:{image:"assets/equipment/weapon/oak-shortbow.png",alt:"Worn oak shortbow"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"bronze-battleaxe",displayName:"Bronze Battleaxe",slot:"weapon",family:"battleaxe",material:"bronze",weight:"heavy",tags:["martial","material-tier","battleaxe"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{fighter:1.4,paladin:1.25,berserker:1.8},intrinsicBonuses:{attack:3,dodge:-.01},art:{image:"assets/equipment/weapon/bronze-battleaxe.png",alt:"Battered bronze battleaxe"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"iron-round-shield",displayName:"Iron Round Shield",slot:"offhand",family:"round-shield",material:"iron",weight:"medium",tags:["martial","guardian","material-tier"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{fighter:1.5,paladin:1.8,turtle:1.5},intrinsicBonuses:{defense:2},art:{image:"assets/equipment/offhand/iron-round-shield.png",alt:"Battered iron-rimmed round shield"},visual:{rig:"humanoid-v1",anchor:"offhand",layer:40}},
    {id:"spellbook",displayName:"Spellbook",slot:"offhand",family:"spellbook",material:"paper-leather",weight:"light",tags:["arcane","caster"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{sorcerer:2,rouge:1.35,summoner:1.4},intrinsicBonuses:{maxMana:5},art:{image:"assets/equipment/offhand/spellbook.png",alt:"Worn starter spellbook"},visual:{rig:"humanoid-v1",anchor:"offhand",layer:40}},
    {id:"hunter-hood",displayName:"Hunter Hood",slot:"hat",family:"hood",material:"cloth-leather",weight:"light",tags:["ranger","hunting"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{ranger:2,beastmaster:1.3,rogue:1.2},intrinsicBonuses:{dodge:.02,crit:.01},art:{image:"assets/equipment/hat/hunter-hood.png",alt:"Weathered hunter hood"},visual:{rig:"humanoid-v1",anchor:"head",layer:60}},
    {id:"leather-harness",displayName:"Leather Harness",slot:"chest",family:"harness",material:"leather",weight:"light",tags:["ranger","agile"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{ranger:1.55,rogue:1.45,beastmaster:1.35},intrinsicBonuses:{dodge:.01},art:{image:"assets/equipment/chest/leather-harness.png",alt:"Rugged leather harness"},visual:{rig:"humanoid-v1",anchor:"torso",layer:30}},
    {id:"ranger-trousers",displayName:"Ranger Trousers",slot:"legs",family:"trousers",material:"cloth-leather",weight:"light",tags:["ranger","agile"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{ranger:1.8,rogue:1.35,beastmaster:1.3},intrinsicBonuses:{dodge:.01},art:{image:"assets/equipment/legs/ranger-trousers.png",alt:"Patchwork ranger trousers"},visual:{rig:"humanoid-v1",anchor:"legs",layer:20}},
    {id:"trail-boots",displayName:"Trail Boots",slot:"boots",family:"boots",material:"leather",weight:"light",tags:["ranger","trail"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{ranger:1.8,rogue:1.35,beastmaster:1.3},intrinsicBonuses:{dodge:.01},art:{image:"assets/equipment/boots/trail-boots.png",alt:"Scuffed trail boots"},visual:{rig:"humanoid-v1",anchor:"feet",layer:20}},
    {id:"mood-ring",displayName:"Mood Ring",slot:"ring",family:"ring",material:"metal-glass",weight:"light",tags:["clown","weird"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{clown:2},intrinsicBonuses:{luck:.01},art:{image:"assets/equipment/ring/mood-ring.png",alt:"Copper and glass mood ring"},visual:{rig:"humanoid-v1",anchor:"ring",layer:70}},
    {id:"hawkeye-charm",displayName:"Hawkeye Charm",slot:"amulet",family:"charm",material:"bone-metal",weight:"light",tags:["ranger","precision"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{ranger:2,beastmaster:1.35},intrinsicBonuses:{crit:.02,dodge:.01},art:{image:"assets/equipment/amulet/hawkeye-charm.png",alt:"Bone and turquoise Hawkeye Charm"},visual:{rig:"humanoid-v1",anchor:"neck",layer:70}}
  ]};

  function deepFreeze(value){
    if(value&&typeof value==="object"&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(deepFreeze);}return value;
  }
  deepFreeze(EQUIPMENT_DATA);
  const IDENTITY_BY_ID=Object.freeze(Object.fromEntries(EQUIPMENT_DATA.identities.map(identity=>[identity.id,identity])));
  const clone=value=>JSON.parse(JSON.stringify(value));

  function createRegistry(){return clone(EQUIPMENT_DATA);}
  function ordinaryBaseName(slot){return EQUIPMENT_DATA.labels[slot]||String(slot||"Equipment");}
  function eligibleOrdinaryAffixes(pool,slot){return (pool||[]).filter(affix=>Array.isArray(affix?.slots)&&affix.slots.includes(slot));}
  function pickOrdinaryAffix(random,pool,slot){const eligible=eligibleOrdinaryAffixes(pool,slot);if(!eligible.length)return null;const roll=Math.max(0,Math.min(.999999999,Number(random?.())||0));return eligible[Math.floor(roll*eligible.length)];}
  function equipmentIdentity(id){return IDENTITY_BY_ID[String(id||"")]||null;}
  function identityForItem(item){const identity=equipmentIdentity(item?.equipmentId);return identity&&identity.slot===item?.slot?identity:null;}
  function eligibleEquipmentIdentities({slot,rarity}={}){return EQUIPMENT_DATA.identities.filter(identity=>identity.slot===slot&&identity.rarityEligibility.includes(rarity));}
  function hashIdentitySeed(seed){let h=2166136261>>>0;for(const char of String(seed||"")){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function identityWeight(identity,classId){return Math.max(0,Number(identity?.rollWeight)||0)*Math.max(0,Number(identity?.classRollModifiers?.[classId])||1);}
  function selectEquipmentIdentity({slot,rarity,classId,seed}={}){
    const eligible=eligibleEquipmentIdentities({slot,rarity}),weighted=eligible.map(identity=>({identity,weight:identityWeight(identity,classId)})).filter(entry=>entry.weight>0);
    if(!weighted.length)return null;
    const total=weighted.reduce((sum,entry)=>sum+entry.weight,0),roll=(hashIdentitySeed(`${seed}|equipment-identity`) / 0x100000000)*total;
    let cursor=roll;for(const entry of weighted){cursor-=entry.weight;if(cursor<0)return entry.identity;}return weighted[weighted.length-1].identity;
  }
  function intrinsicBonusesForItem(item){return {...(identityForItem(item)?.intrinsicBonuses||{})};}
  function allBonusesForItem(item){const combined={...(item?.bonuses||{})};for(const [key,value] of Object.entries(intrinsicBonusesForItem(item)))combined[key]=(combined[key]||0)+value;return combined;}

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
    const identity=selectEquipmentIdentity({slot,rarity,classId,seed:code});
    const item={id:`gear_${deps.hashSeed(code).toString(36)}_${core}`,seed:code,seedCode:code,itemPower:budget,slot,rarity,equipmentId:identity?.id||null,icon:deps.gearIcon(slot),name:"",bonuses,prefix:prefix?prefix.names[prefixTier-1]:null,suffix:suffix?suffix.names[suffixTier-1]:null,affixTier:prefixTier,suffixTier,elementPowerCost:elementReserve};
    spent+=deps.spendBase(item,R,Math.max(0,available-spent));if(element){item.element=element;spent+=elementReserve;}item.spentPower=Math.min(budget,spent);const base=identity?.displayName||deps.baseName(slot);item.name=`${item.prefix?item.prefix+" ":""}${base}${item.suffix?" "+item.suffix:""}`;return item;
  }

  function generateOrdinaryItem({rarity,forcedSlot=null,slots,pick,random,classId,seedCode,generateFromSeedCode,rarityBudgets,clamp}){
    const slot=forcedSlot&&slots.includes(forcedSlot)?forcedSlot:pick(slots),core=`${Math.floor(random()*0xffffffff).toString(36)}${Math.floor(random()*0xffffffff).toString(36)}`;
    const code=seedCode(rarity,slot,classId,0,core);let item=generateFromSeedCode(code);
    if(!item||!slots.includes(item.slot))return null;
    item.itemPower=clamp(Number(item.itemPower)||rarityBudgets[rarity][0],rarityBudgets[rarity][0],rarityBudgets[rarity][1]);return item;
  }

  window.DiceboundEquipment=Object.freeze({apiVersion:2,createRegistry,ordinaryBaseName,eligibleOrdinaryAffixes,pickOrdinaryAffix,equipmentIdentity,identityForItem,eligibleEquipmentIdentities,identityWeight,selectEquipmentIdentity,intrinsicBonusesForItem,allBonusesForItem,generateOrdinaryFromSeedCode,generateOrdinaryItem});
})();
