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
      "displayName": "Axel's Coffee Mug",
      "slot": "offhand",
      "rarity": "mythical",
      "exclusiveSpecial": true,
      "intrinsicBonuses": {"doubleStrike": 0.05},
      "visual": {"rig":"humanoid-v1","anchor":"offhand","layer":40}
    },
    "kratz-headphones": {
      "id": "kratz-headphones",
      "name": "Kratz Headphones",
      "displayName": "Kratz Headphones",
      "slot": "hat",
      "rarity": "mythical",
      "exclusiveSpecial": true,
      "intrinsicBonuses": {"dodge": 0.02},
      "visual": {"rig":"humanoid-v1","anchor":"head","layer":60}
    },
    "kellys-jean-jacket": {
      "id": "kellys-jean-jacket",
      "name": "The Jean Jacket Lost at Kelly's",
      "displayName": "The Jean Jacket Lost at Kelly's",
      "slot": "chest",
      "rarity": "mythical",
      "exclusiveSpecial": true,
      "intrinsicBonuses": {"defense": 2},
      "visual": {"rig":"humanoid-v1","anchor":"torso","layer":30}
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
    {id:"crimson-brush",displayName:"Crimson Brush",slot:"weapon",family:"brush",material:"redwood-bristle",weight:"light",tags:["artist","crimson","weird"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{rouge:2},intrinsicBonuses:{attack:1},elementProcBonuses:{fire:.01},art:{image:"assets/equipment/weapon/crimson-brush.png",alt:"Crimson paint brush"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"tongue-lash",displayName:"Tongue Lash",slot:"weapon",family:"whip",material:"flesh",weight:"light",tags:["frog","weird"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{frog:2},intrinsicBonuses:{attack:1,doubleStrike:.02},art:{image:"assets/equipment/weapon/tongue-lash.png",alt:"Slimy frog-tongue whip"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"10th-birthday-balloons",displayName:"10th Birthday Balloons",slot:"weapon",family:"balloon",material:"rubber",weight:"light",tags:["weird","toy","festival","holiday"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{clown:1.5},intrinsicBonuses:{dodge:.03,doubleStrike:.02,luck:1},art:{image:"assets/equipment/weapon/10th-birthday-balloons.png",alt:"Modest 10th birthday balloons"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"ashen-staff",displayName:"Ashen Staff",slot:"weapon",family:"staff",material:"wood",weight:"medium",tags:["arcane","caster"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{sorcerer:1.6,cleric:1.35,alchemist:1.3,summoner:1.25},intrinsicBonuses:{maxMana:5},art:{image:"assets/equipment/weapon/ashen-staff.png",alt:"Plain ashen staff"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"birthday-cake",displayName:"Birthday Cake",slot:"weapon",family:"food-weapon",material:"cake",weight:"light",tags:["weird","food","holiday"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{clown:1.5},intrinsicBonuses:{attack:2,maxHp:5},art:{image:"assets/equipment/weapon/birthday-cake.png",alt:"Modest birthday cake weapon"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
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
    {id:"hawkeye-charm",displayName:"Hawkeye Charm",slot:"amulet",family:"charm",material:"bone-metal",weight:"light",tags:["ranger","precision"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,classRollModifiers:{ranger:2,beastmaster:1.35},intrinsicBonuses:{crit:.02,dodge:.01},art:{image:"assets/equipment/amulet/hawkeye-charm.png",alt:"Bone and turquoise Hawkeye Charm"},visual:{rig:"humanoid-v1",anchor:"neck",layer:70}},
    {id:"abyssal-wand",displayName:"Abyssal Wand",slot:"weapon",family:"wand",material:"abyssal",weight:"light",tags:["arcane","void"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{maxMana:13,doubleStrike:.02},elementProcBonuses:{void:.01},art:{image:"assets/equipment/weapon/abyssal-wand.png",alt:"Abyssal Wand"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"adamant-halberd",displayName:"Adamant Halberd",slot:"weapon",family:"halberd",material:"adamant",weight:"heavy",tags:["martial","polearm"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{attack:6,crit:.01,dodge:-.01,defense:1},art:{image:"assets/equipment/weapon/adamant-halberd.png",alt:"Adamant Halberd"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"adamant-crossbow",displayName:"Adamant Crossbow",slot:"weapon",family:"crossbow",material:"adamant",weight:"medium",tags:["ranged","precision"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{attack:6,crit:.02},art:{image:"assets/equipment/weapon/adamant-crossbow.png",alt:"Adamant Crossbow"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"adamant-claws",displayName:"Adamant Claws",slot:"weapon",family:"claws",material:"adamant",weight:"light",tags:["martial","agile","echo"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{attack:5,crit:.02,doubleStrike:.01},art:{image:"assets/equipment/weapon/adamant-claws.png",alt:"Adamant Claws"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"arcane-tome",displayName:"Arcane Tome",slot:"offhand",family:"tome",material:"arcane-paper",weight:"light",tags:["arcane","caster","echo"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{maxMana:8,doubleStrike:.01},art:{image:"assets/equipment/offhand/arcane-tome.png",alt:"Arcane Tome"},visual:{rig:"humanoid-v1",anchor:"offhand",layer:40}},
    {id:"bag-of-confetti",displayName:"Bag of Confetti",slot:"offhand",family:"bag",material:"festival-paper",weight:"light",tags:["festival","weird","fortune"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{luck:.01},art:{image:"assets/equipment/offhand/bag-of-confetti.png",alt:"Bag of Confetti"},visual:{rig:"humanoid-v1",anchor:"offhand",layer:40}},
    {id:"acid-bubble",displayName:"Acid Bubble",slot:"offhand",family:"bubble",material:"alchemical",weight:"light",tags:["nature","thorns","weird"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{thorns:2},elementProcBonuses:{nature:.01},art:{image:"assets/equipment/offhand/acid-bubble.png",alt:"Acid Bubble"},visual:{rig:"humanoid-v1",anchor:"offhand",layer:40}},
    {id:"barbed-quiver",displayName:"Barbed Quiver",slot:"offhand",family:"quiver",material:"leather-metal",weight:"light",tags:["ranged","precision"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{attack:2,crit:.02},art:{image:"assets/equipment/offhand/barbed-quiver.png",alt:"Barbed Quiver"},visual:{rig:"humanoid-v1",anchor:"offhand",layer:40}},
    {id:"basinet",displayName:"Basinet",slot:"hat",family:"helmet",material:"steel",weight:"medium",tags:["martial","guardian"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:2,maxHp:5},art:{image:"assets/equipment/hat/basinet.png",alt:"Basinet"},visual:{rig:"humanoid-v1",anchor:"head",layer:60}},
    {id:"bucket",displayName:"Bucket",slot:"hat",family:"improvised-helmet",material:"metal",weight:"medium",tags:["weird","guardian"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:2,dodge:-.01},art:{image:"assets/equipment/hat/bucket.png",alt:"Bucket"},visual:{rig:"humanoid-v1",anchor:"head",layer:60}},
    {id:"crimson-veil",displayName:"Crimson Veil",slot:"hat",family:"veil",material:"cloth",weight:"light",tags:["crimson","agile","fire"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{dodge:.02,crit:.02},elementProcBonuses:{fire:.01},art:{image:"assets/equipment/hat/crimson-veil.png",alt:"Crimson Veil"},visual:{rig:"humanoid-v1",anchor:"head",layer:60}},
    {id:"crown",displayName:"Crown",slot:"hat",family:"crown",material:"gold",weight:"light",tags:["royal","fortune"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:2,luck:.01},art:{image:"assets/equipment/hat/crown.png",alt:"Crown"},visual:{rig:"humanoid-v1",anchor:"head",layer:60}},
    {id:"band-t-shirt",displayName:"Band T-Shirt",slot:"chest",family:"shirt",material:"cotton",weight:"light",tags:["weird","agile","metal"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{dodge:.04,thorns:1,doubleStrike:.02},elementProcBonuses:{metal:.01},art:{image:"assets/equipment/chest/band-t-shirt.png",alt:"Band T-Shirt"},visual:{rig:"humanoid-v1",anchor:"torso",layer:30}},
    {id:"boneweave",displayName:"Boneweave",slot:"chest",family:"bone-armour",material:"bone",weight:"medium",tags:["occult","void","sustain"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:2,lifeSteal:.02},elementProcBonuses:{void:.01},art:{image:"assets/equipment/chest/boneweave.png",alt:"Boneweave"},visual:{rig:"humanoid-v1",anchor:"torso",layer:30}},
    {id:"cardigan",displayName:"Cardigan",slot:"chest",family:"cardigan",material:"wool",weight:"light",tags:["cozy","sustain"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{maxHp:5,defense:1},art:{image:"assets/equipment/chest/cardigan.png",alt:"Cardigan"},visual:{rig:"humanoid-v1",anchor:"torso",layer:30}},
    {id:"blood-iron-cuirass",displayName:"Blood-Iron Cuirass",slot:"chest",family:"cuirass",material:"blood-iron",weight:"heavy",tags:["martial","blood","thorns"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{attack:4,defense:4,thorns:1,dodge:-.02},art:{image:"assets/equipment/chest/blood-iron-cuirass.png",alt:"Blood-Iron Cuirass"},visual:{rig:"humanoid-v1",anchor:"torso",layer:30}},
    {id:"bogstrider-wraps",displayName:"Bogstrider Wraps",slot:"legs",family:"wraps",material:"bog-cloth",weight:"light",tags:["nature","agile","echo"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{dodge:.03,doubleStrike:.01},elementProcBonuses:{nature:.01},art:{image:"assets/equipment/legs/bogstrider-wraps.png",alt:"Bogstrider Wraps"},visual:{rig:"humanoid-v1",anchor:"legs",layer:20}},
    {id:"executive-legs",displayName:"Executive Legs",slot:"legs",family:"trousers",material:"tailored-cloth",weight:"light",tags:["wealth","executive"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:3,goldBonus:.05},art:{image:"assets/equipment/legs/executive-legs.png",alt:"Executive Legs"},visual:{rig:"humanoid-v1",anchor:"legs",layer:20}},
    {id:"chain-leggings",displayName:"Chain Leggings",slot:"legs",family:"chainmail",material:"chain",weight:"medium",tags:["martial","agile"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:2,dodge:.01},art:{image:"assets/equipment/legs/chain-leggings.png",alt:"Chain Leggings"},visual:{rig:"humanoid-v1",anchor:"legs",layer:20}},
    {id:"distillers-legs",displayName:"Distiller's Legs",slot:"legs",family:"alchemist-trousers",material:"treated-cloth",weight:"light",tags:["alchemy","mana","potions"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:2,potionPower:.15,maxMana:5},art:{image:"assets/equipment/legs/distillers-legs.png",alt:"Distiller's Legs"},visual:{rig:"humanoid-v1",anchor:"legs",layer:20}},
    {id:"astral-slippers",displayName:"Astral Slippers",slot:"boots",family:"slippers",material:"astral-cloth",weight:"light",tags:["mana","light","agile"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{maxMana:8,dodge:.02},elementProcBonuses:{light:.01},art:{image:"assets/equipment/boots/astral-slippers.png",alt:"Astral Slippers"},visual:{rig:"humanoid-v1",anchor:"feet",layer:20}},
    {id:"bloodmarch-boots",displayName:"Bloodmarch Boots",slot:"boots",family:"boots",material:"blood-leather",weight:"medium",tags:["blood","sustain","martial"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{attack:2,maxHp:5,lifeSteal:.01},art:{image:"assets/equipment/boots/bloodmarch-boots.png",alt:"Bloodmarch Boots"},visual:{rig:"humanoid-v1",anchor:"feet",layer:20}},
    {id:"cloudstep-sandals",displayName:"Cloudstep Sandals",slot:"boots",family:"sandals",material:"cloudsilk",weight:"light",tags:["agile","echo"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{dodge:.02,doubleStrike:.01},art:{image:"assets/equipment/boots/cloudstep-sandals.png",alt:"Cloudstep Sandals"},visual:{rig:"humanoid-v1",anchor:"feet",layer:20}},
    {id:"demonhide-boots",displayName:"Demonhide Boots",slot:"boots",family:"boots",material:"demonhide",weight:"medium",tags:["fire","void","occult"],rarityEligibility:["uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:2,dodge:.02},elementProcBonuses:{fire:.01,void:.01},art:{image:"assets/equipment/boots/demonhide-boots.png",alt:"Demonhide Boots"},visual:{rig:"humanoid-v1",anchor:"feet",layer:20}},
    {id:"gel-loop",displayName:"Gel Loop",slot:"ring",family:"ring",material:"gel",weight:"light",tags:["slime","echo"],rarityEligibility:["poor","common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{maxHp:5,doubleStrike:.01},art:{image:"assets/equipment/ring/gel-loop.png",alt:"Gel Loop"},visual:{rig:"humanoid-v1",anchor:"ring",layer:70}},
    {id:"lion-signet",displayName:"Lion Signet",slot:"ring",family:"signet",material:"gold",weight:"light",tags:["martial","royal"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{defense:1,attack:1},art:{image:"assets/equipment/ring/lion-signet.png",alt:"Lion Signet"},visual:{rig:"humanoid-v1",anchor:"ring",layer:70}},
    {id:"falcon-band",displayName:"Falcon Band",slot:"ring",family:"band",material:"silver",weight:"light",tags:["precision","agile"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{crit:.01,dodge:.01},art:{image:"assets/equipment/ring/falcon-band.png",alt:"Falcon Band"},visual:{rig:"humanoid-v1",anchor:"ring",layer:70}},
    {id:"jade-band",displayName:"Jade Band",slot:"ring",family:"band",material:"jade",weight:"light",tags:["echo","martial"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{attack:1,doubleStrike:.01},art:{image:"assets/equipment/ring/jade-band.png",alt:"Jade Band"},visual:{rig:"humanoid-v1",anchor:"ring",layer:70}},
    {id:"distillers-amulet",displayName:"Distiller's Amulet",slot:"amulet",family:"amulet",material:"alchemical-glass",weight:"light",tags:["alchemy","potions","mana"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{potionPower:.20,maxMana:8,luck:.01},art:{image:"assets/equipment/amulet/distillers-amulet.png",alt:"Distiller's Amulet"},visual:{rig:"humanoid-v1",anchor:"neck",layer:70}},
    {id:"dragon-tooth",displayName:"Dragon Tooth",slot:"amulet",family:"tooth",material:"dragon-bone",weight:"light",tags:["martial","precision"],rarityEligibility:["common","uncommon","rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{attack:2,crit:.01},art:{image:"assets/equipment/amulet/dragon-tooth.png",alt:"Dragon Tooth"},visual:{rig:"humanoid-v1",anchor:"neck",layer:70}},
    {id:"astral-prism",displayName:"Astral Prism",slot:"amulet",family:"prism",material:"astral-crystal",weight:"light",tags:["mana","light","echo"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{maxMana:10,doubleStrike:.02},elementProcBonuses:{light:.01},art:{image:"assets/equipment/amulet/astral-prism.png",alt:"Astral Prism"},visual:{rig:"humanoid-v1",anchor:"neck",layer:70}},
    {id:"golden-fly",displayName:"Golden Fly",slot:"amulet",family:"talisman",material:"gold",weight:"light",tags:["fortune","nature","echo"],rarityEligibility:["rare","epic","legendary"],rollWeight:1,intrinsicBonuses:{luck:.02,doubleStrike:.03},elementProcBonuses:{nature:.01},art:{image:"assets/equipment/amulet/golden-fly.png",alt:"Golden Fly"},visual:{rig:"humanoid-v1",anchor:"neck",layer:70}},
    {id:"decennial-jubilee-balloons",displayName:"Decennial Jubilee Balloons",slot:"amulet",family:"balloon",material:"festival-rubber",weight:"light",tags:["festival","holiday","fortune","epic-visual"],rarityEligibility:["epic","legendary"],rollWeight:1,intrinsicBonuses:{luck:.02,goldBonus:.05},art:{image:"assets/equipment/amulet/decennial-jubilee-balloons.png",alt:"Extravagant Decennial Jubilee Balloons"},visual:{rig:"humanoid-v1",anchor:"neck",layer:70}},
    {id:"ashcore-pyrestaff",displayName:"Ashcore Pyrestaff",slot:"weapon",family:"staff",material:"emberwood",weight:"medium",tags:["arcane","caster","ember","epic-visual"],rarityEligibility:["epic","legendary"],rollWeight:1,classRollModifiers:{sorcerer:1.6,cleric:1.35,alchemist:1.3,summoner:1.25},intrinsicBonuses:{maxMana:10,doubleStrike:.02},art:{image:"assets/equipment/weapon/ashcore-pyrestaff.png",alt:"Extravagant Ashcore Pyrestaff"},visual:{rig:"humanoid-v1",anchor:"weapon-hand",layer:50}},
    {id:"candlecrown-gateau",displayName:"Candlecrown Gateau",slot:"offhand",family:"gateau",material:"cake",weight:"light",tags:["food","holiday","sustain","epic-visual"],rarityEligibility:["epic","legendary"],rollWeight:1,intrinsicBonuses:{maxHp:5,potionPower:.15},art:{image:"assets/equipment/offhand/candlecrown-gateau.png",alt:"Extravagant Candlecrown Gateau"},visual:{rig:"humanoid-v1",anchor:"offhand",layer:40}}
  ]};

  function deepFreeze(value){
    if(value&&typeof value==="object"&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(deepFreeze);}return value;
  }
  deepFreeze(EQUIPMENT_DATA);
  const IDENTITY_BY_ID=Object.freeze(Object.fromEntries([
    ...EQUIPMENT_DATA.identities.map(identity=>[identity.id,identity]),
    ...Object.values(EQUIPMENT_DATA.special).filter(identity=>identity?.exclusiveSpecial).map(identity=>[identity.id,identity])
  ]));
  const clone=value=>JSON.parse(JSON.stringify(value));

  function createRegistry(){return clone(EQUIPMENT_DATA);}
  function ordinaryBaseName(slot){return EQUIPMENT_DATA.labels[slot]||String(slot||"Equipment");}
  function eligibleOrdinaryAffixes(pool,slot){return (pool||[]).filter(affix=>Array.isArray(affix?.slots)&&affix.slots.includes(slot));}
  function pickOrdinaryAffix(random,pool,slot){const eligible=eligibleOrdinaryAffixes(pool,slot);if(!eligible.length)return null;const roll=Math.max(0,Math.min(.999999999,Number(random?.())||0));return eligible[Math.floor(roll*eligible.length)];}
  function equipmentIdentity(id){return IDENTITY_BY_ID[String(id||"")]||null;}
  function identityForItem(item){const identity=equipmentIdentity(item?.equipmentId);return identity&&identity.slot===item?.slot?identity:null;}
  const SLOT_ICON_FALLBACK=Object.freeze({weapon:"⚔️",offhand:"🛡️",boots:"🥾",legs:"👖",chest:"🥋",hat:"🪖",ring:"💍",amulet:"📿"});
  function iconContainsMarkup(value){const raw=String(value??"");return /<[^>]+>/.test(raw)||/&lt;\s*(?:img|span)\b/i.test(raw);}
  function fallbackIconForItem(item){
    if(item?.devilHorns)return "👿";
    if(item?.oneHitPerRound)return "🎧";
    if(item?.mythicPiece==="hat"&&item?.setName==="Impossible Road")return "👑";
    return SLOT_ICON_FALLBACK[item?.slot]||"◇";
  }
  function safeIconForItem(item){
    const raw=String(item?.icon??"").trim();
    return raw&&!iconContainsMarkup(raw)?raw:fallbackIconForItem(item);
  }
  function hasIntrinsicIdentity(identity){return !!identity&&(Object.keys(identity.intrinsicBonuses||{}).length>0||Object.keys(identity.elementProcBonuses||{}).length>0);}
  function eligibleEquipmentIdentities({slot,rarity,requireIntrinsic=false}={}){
    return EQUIPMENT_DATA.identities.filter(identity=>identity.slot===slot&&identity.rarityEligibility.includes(rarity)&&(!requireIntrinsic||hasIntrinsicIdentity(identity)));
  }
  function hashIdentitySeed(seed){let h=2166136261>>>0;for(const char of String(seed||"")){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function identityWeight(identity,classId){return Math.max(0,Number(identity?.rollWeight)||0)*Math.max(0,Number(identity?.classRollModifiers?.[classId])||1);}
  function selectEquipmentIdentity({slot,rarity,classId,seed,requireIntrinsic=false}={}){
    const eligible=eligibleEquipmentIdentities({slot,rarity,requireIntrinsic}),weighted=eligible.map(identity=>({identity,weight:identityWeight(identity,classId)})).filter(entry=>entry.weight>0);
    if(!weighted.length)return null;
    const total=weighted.reduce((sum,entry)=>sum+entry.weight,0),roll=(hashIdentitySeed(`${seed}|equipment-identity`) / 0x100000000)*total;
    let cursor=roll;for(const entry of weighted){cursor-=entry.weight;if(cursor<0)return entry.identity;}return weighted[weighted.length-1].identity;
  }
  function fixedSpecialEquipmentId(item){
    if(item?.coffeeActionProc)return "axels-coffee-mug";
    if(item?.oneHitPerRound)return "kratz-headphones";
    if(item?.softDefenseCurve)return "kellys-jean-jacket";
    return null;
  }
  function ensureEquipmentIdentity(item,{classId=null,rarity=null,seed=null,requireIntrinsic=false}={}){
    if(!item||typeof item!=="object"||!EQUIPMENT_DATA.slots.includes(item.slot))return null;
    const fixedId=fixedSpecialEquipmentId(item);
    if(fixedId){
      const fixed=equipmentIdentity(fixedId);
      if(fixed&&fixed.slot===item.slot){item.equipmentId=fixed.id;return fixed;}
    }
    const existing=identityForItem(item);
    if(existing&&(!requireIntrinsic||Object.keys(existing.intrinsicBonuses||{}).length>0))return existing;
    const requested=rarity||item.rarity,usable=eligibleEquipmentIdentities({slot:item.slot,rarity:requested,requireIntrinsic}).length?requested:"legendary";
    const identity=selectEquipmentIdentity({slot:item.slot,rarity:usable,classId,seed:seed||item.seedCode||item.seed||item.id||`${item.name||"equipment"}|${item.slot}`,requireIntrinsic});
    if(identity)item.equipmentId=identity.id;
    return identity;
  }
  function shouldRepairSpecialIdentity(item){
    return !!(fixedSpecialEquipmentId(item)||item?.artifact||item?.setName==="Impossible Road"||item?.merchantWeapon||item?.devilHorns||item?.bloodmageStone);
  }
  function repairPresentationFields(item,{classId=null}={}){
    if(!item||typeof item!=="object")return false;
    let changed=false;
    if(iconContainsMarkup(item.icon)){item.icon=fallbackIconForItem(item);changed=true;}
    const fixedId=fixedSpecialEquipmentId(item);
    if(fixedId&&item.equipmentId!==fixedId){
      const before=item.equipmentId||null;
      ensureEquipmentIdentity(item,{classId,rarity:"mythical",requireIntrinsic:true});
      if((item.equipmentId||null)!==before)changed=true;
    }else if(shouldRepairSpecialIdentity(item)){
      const current=identityForItem(item),hasIntrinsic=hasIntrinsicIdentity(current);
      if(!hasIntrinsic){
        const before=item.equipmentId||null;
        ensureEquipmentIdentity(item,{classId,rarity:"legendary",requireIntrinsic:true});
        if((item.equipmentId||null)!==before)changed=true;
      }
    }
    return changed;
  }
  function intrinsicBonusesForItem(item){return {...(identityForItem(item)?.intrinsicBonuses||{})};}
  function elementProcBonusesForItem(item){return {...(identityForItem(item)?.elementProcBonuses||{})};}
  function allBonusesForItem(item){const combined={...(item?.bonuses||{})};for(const [key,value] of Object.entries(intrinsicBonusesForItem(item)))combined[key]=(combined[key]||0)+value;return combined;}
  // Ordinary generated equipment and existing saved heirlooms remain eligible
  // unless an item explicitly opts out through semantic item metadata. This
  // avoids fragile display-name rules for temporary run-only equipment.
  function isHeirloomEligible(item){return !!item&&item.heirloomEligible!==false;}

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

  window.DiceboundEquipment=Object.freeze({apiVersion:4,createRegistry,ordinaryBaseName,eligibleOrdinaryAffixes,pickOrdinaryAffix,equipmentIdentity,identityForItem,fixedSpecialEquipmentId,iconContainsMarkup,safeIconForItem,repairPresentationFields,eligibleEquipmentIdentities,identityWeight,selectEquipmentIdentity,ensureEquipmentIdentity,intrinsicBonusesForItem,elementProcBonusesForItem,allBonusesForItem,isHeirloomEligible,generateOrdinaryFromSeedCode,generateOrdinaryItem});
})();
