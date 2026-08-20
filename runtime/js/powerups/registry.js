(() => {
  "use strict";

  function requireServices(services) {
    if (services?.apiVersion !== 1) throw new TypeError("DiceboundPowerupRegistry requires runtime service API v1");
    for (const [value, label] of [
      [services.run?.player, "run.player"],
      [services.economy?.goldReward, "economy.goldReward"],
      [services.economy?.isNightmare, "economy.isNightmare"],
      [services.combat?.heal, "combat.heal"],
      [services.rules?.clamp, "rules.clamp"],
      [services.signatures?.applyCurrent, "signatures.applyCurrent"],
      [services.signatures?.describeCurrent, "signatures.describeCurrent"],
    ]) {
      const valid = label === "run.player" ? value && typeof value === "object" : typeof value === "function";
      if (!valid) throw new TypeError(`DiceboundPowerupRegistry requires ${label}`);
    }
    if (!Array.isArray(services.content?.elementIds) || !services.content.elementIds.length) {
      throw new TypeError("DiceboundPowerupRegistry requires content.elementIds");
    }
    return services;
  }

  function createRegistry(runtimeServices) {
    const services = requireServices(runtimeServices);
    const player = services.run.player;
    const modifiedGold = services.economy.goldReward;
    const healPlayer = services.combat.heal;
    const clamp = services.rules.clamp;
    const DIBO_ELEMENTS = services.content.elementIds;
    const registry=[
    {
      "id": "hp",
      "rarity": "poor",
      "icon": "❤️",
      "name": "Toughness",
      "desc": "Gain +5 max HP and heal 5 HP this run.",
      "apply": function(){player.maxHp+=5;player.hp=Math.min(player.maxHp,player.hp+5);},
      "tags": [
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "attack",
      "rarity": "poor",
      "icon": "⚔️",
      "name": "Sharper Blade",
      "desc": "Gain +1 Attack this run.",
      "apply": function(){player.attack+=1;},
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "defense",
      "rarity": "poor",
      "icon": "🛡️",
      "name": "Iron Skin",
      "desc": "Gain +1 Defense this run.",
      "apply": function(){player.defense+=1;},
      "tags": [
        "common"
      ],
      "v24Tiered": true
    },
    {
      "id": "potion",
      "rarity": "poor",
      "icon": "🧪",
      "name": "Field Alchemy",
      "desc": "Gain 1 potion immediately.",
      "apply": function(){player.potions+=1;},
      "tags": [
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "purse",
      "rarity": "poor",
      "icon": "🪙",
      "name": "Heavy Purse",
      get desc(){const total=modifiedGold(100),bonus=Math.round((player.goldBonus||0)*100);return `Gain ${total} gold now (100 base${bonus?`, ${bonus}% Gold bonus`:''}${services.economy.isNightmare()?', Nightmare reward reduction included':''}).`;},
      "apply": function(){player.gold+=modifiedGold(100);},
      "tags": [
        "wealth"
      ],
      "v24Tiered": true
    },
    {
      "id": "mending",
      "rarity": "poor",
      "icon": "🩹",
      "name": "Roadside Mending",
      "desc": "Heal 25% of your maximum HP.",
      "apply": function(){healPlayer(Math.ceil(player.maxHp*.25));},
      "tags": [
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "crit",
      "rarity": "common",
      "icon": "🎯",
      "name": "Keen Eye",
      "desc": "Gain +7% critical-hit chance.",
      apply(){player.crit+=.07;},
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "luck",
      "rarity": "common",
      "icon": "🍀",
      "name": "Loaded Fate",
      "desc": "Gain +12 Luck.",
      apply(){player.luck+=.12;},
      "tags": [
        "uncommon"
      ],
      "v24Tiered": true
    },
    {
      "id": "heal",
      "rarity": "poor",
      "icon": "✨",
      "name": "Second Wind",
      "desc": "Heal 3 HP after every victory.",
      apply(){player.postFightHeal+=3;},
      "tags": [
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "gold",
      "rarity": "poor",
      "icon": "💰",
      "name": "Treasure Sense",
      "desc": "Enemies and chests grant 20% more gold this run.",
      "apply": function(){player.goldBonus+=.20;},
      "tags": [
        "wealth"
      ],
      "v24Tiered": true
    },
    {
      "id": "brew",
      "rarity": "common",
      "icon": "⚗️",
      "name": "Strong Brew",
      "desc": "Potions heal 30% more.",
      apply(){player.potionPower+=.30;},
      "tags": [
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "stride",
      "rarity": "common",
      "icon": "🥾",
      "name": "Long Stride",
      "desc": "15% chance to move one extra tile after rolling.",
      apply(){player.extraStepChance+=.15;},
      "tags": [
        "uncommon"
      ],
      "v24Tiered": true
    },
    {
      "id": "scholar",
      "rarity": "poor",
      "icon": "📘",
      "name": "Scholar's Sigil",
      "desc": "Gain +10% enemy XP this run.",
      "apply": function(){player.xpBonus+=.10;},
      "tags": [
        "uncommon"
      ],
      "v24Tiered": true
    },
    {
      "id": "vampire",
      "rarity": "rare",
      "icon": "🩸",
      "name": "Vampiric Edge",
      "desc": "Gain 28% Lifesteal.",
      "apply": function(){player.lifeSteal+=.28;},
      "tags": [
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "echo",
      "rarity": "common",
      "icon": "⚔️",
      "name": "Echoing Strike",
      "desc": "Gain +12% Echo Strike this run.",
      "apply": function(){player.doubleStrike+=.12;},
      "tags": [
        "tempo",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "thorns",
      "rarity": "poor",
      "icon": "🌵",
      "name": "Spiked Armor",
      "desc": "Enemies take 3 damage whenever they hit you.",
      "apply": function(){player.thorns+=3;},
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "dodge",
      "rarity": "uncommon",
      "icon": "🌫️",
      "name": "Mist Step",
      "desc": "Gain a 10% chance to dodge enemy attacks.",
      apply(){player.dodge+=.10;},
      "tags": [
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ward",
      "rarity": "common",
      "icon": "🔰",
      "name": "Runic Ward",
      "desc": "Reduce all incoming damage by 1.",
      apply(){player.flatReduction+=1;},
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "barrier",
      "rarity": "uncommon",
      "icon": "🔷",
      "name": "Battle Barrier",
      "desc": "Block the first enemy hit in every battle.",
      apply(){player.firstHitBlocks+=1;},
      "tags": [
        "rare"
      ],
      "v24Tiered": true
    },
    {
      "id": "merchant",
      "rarity": "common",
      "icon": "🤝",
      "name": "Merchant's Friend",
      "desc": "All shop prices are 10% lower.",
      apply(){player.shopDiscount+=.10;},
      "tags": [
        "wealth",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "berserk",
      "rarity": "rare",
      "icon": "💢",
      "name": "Berserker Heart",
      "desc": "Deal 40% more damage while below half HP.",
      apply(){player.berserk+=.40;},
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "execute",
      "rarity": "epic",
      "unique": true,
      "icon": "🪓",
      "name": "Executioner",
      "desc": "Unique: automatically execute enemies at or below 20% HP.",
      apply(){player.execute=1;},
      "tags": [
        "epic"
      ],
      "v24Tiered": true
    },
    {
      "id": "phoenix",
      "rarity": "epic",
      "icon": "🔥",
      "name": "Phoenix Feather",
      "desc": "Revive once at half HP when you would die.",
      apply(){player.revives+=1;},
      "tags": [
        "epic"
      ],
      "v24Tiered": true
    },
    {
      "id": "idol",
      "rarity": "rare",
      "icon": "🗿",
      "name": "Golden Idol",
      "desc": "Gain +65% gold and +15 Luck.",
      apply(){player.goldBonus+=.65;player.luck+=.15;},
      "tags": [
        "wealth"
      ],
      "v24Tiered": true
    },
    {
      "id": "titan",
      "rarity": "rare",
      "icon": "🦾",
      "name": "Titan's Blood",
      "desc": "Gain +24 max HP, +4 Attack and heal fully.",
      apply(){player.maxHp+=24;player.attack+=4;player.hp=player.maxHp;},
      "tags": [
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "destiny",
      "rarity": "epic",
      "icon": "🎲",
      "name": "Dice of Destiny",
      "desc": "Gain +25% extra-step chance, +25 Luck and +5% Crit this run.",
      "apply": function(){player.extraStepChance+=.25;player.luck+=.25;player.crit+=.05;},
      "achievementGate": "prestige10",
      "tags": [
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "godslayer",
      "rarity": "epic",
      "icon": "⚡",
      "name": "Godslayer",
      "desc": "Deal +50% damage to bosses and gain +10% crit.",
      apply(){player.bossDamage+=.50;player.crit+=.10;},
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "immortal",
      "rarity": "epic",
      "icon": "👑",
      "name": "Immortal Crown",
      "desc": "Gain 2 revives, +2 defense and +12 max HP.",
      apply(){player.revives+=2;player.defense+=2;player.maxHp+=12;player.hp+=12;},
      "achievementGate": "road3",
      "tags": [
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "chaos",
      "rarity": "epic",
      "icon": "🌌",
      "name": "Chaos Engine",
      "desc": "Gain +4 attack, 20% Echo Strike and 15% lifesteal.",
      apply(){player.attack+=4;player.doubleStrike+=.20;player.lifeSteal+=.15;},
      "achievementGate": "road4",
      "tags": [
        "sustain",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "fighter_resolve",
      "classId": "fighter",
      "rarity": "common",
      "icon": "🛡️",
      "name": "Resolute Guard",
      "desc": "Fighter restores 5 HP whenever Defend is used.",
      apply(){player.guardHeal+=5;},
      "tags": [
        "melee",
        "armored",
        "guardian",
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "fighter_riposte",
      "classId": "fighter",
      "rarity": "uncommon",
      "icon": "↩️",
      "name": "Shield Riposte",
      "desc": "Defending counterattacks for 50% of Fighter attack.",
      apply(){player.guardCounter+=.50;},
      "tags": [
        "melee",
        "armored",
        "guardian",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "fighter_fortress",
      "classId": "fighter",
      "rarity": "rare",
      "unique": true,
      "icon": "🏰",
      "name": "Walking Fortress",
      "desc": "Defend grants a Battle Barrier and heals 3 additional HP, but Defend then has a 1-turn cooldown.",
      apply(){player.guardShield+=1;player.guardHeal+=3;player.guardDelay=Math.max(player.guardDelay,1);},
      "tags": [
        "melee",
        "armored",
        "guardian",
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "fighter_colossus",
      "classId": "fighter",
      "rarity": "epic",
      "icon": "🗿",
      "name": "Colossus of War",
      "desc": "Board 4 mastery: Titan Cleave deals 100% more damage and Fighter gains +2 defense.",
      apply(){player.classUltimateBonus+=1;player.defense+=2;},
      "tags": [
        "melee",
        "armored",
        "guardian",
        "damage"
      ],
      "achievementGate": "class_b4:fighter",
      "v24Tiered": true
    },
    {
      "id": "ranger_quickdraw",
      "classId": "ranger",
      "rarity": "common",
      "icon": "🪶",
      "name": "Quickdraw",
      "desc": "The first attack of every battle deals 45% more damage.",
      apply(){player.firstAttackBonus+=.45;},
      "tags": [
        "ranged",
        "precision",
        "evasive",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ranger_echo",
      "classId": "ranger",
      "rarity": "uncommon",
      "icon": "🏹",
      "name": "Twin Fletching",
      "desc": "Gain +18% Echo Strike chance.",
      apply(){player.doubleStrike+=.18;},
      "tags": [
        "ranged",
        "precision",
        "evasive",
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "ranger_predator",
      "classId": "ranger",
      "rarity": "rare",
      "icon": "🦅",
      "name": "Predator's Rhythm",
      "desc": "Critical hits generate 15 additional ultimate charge.",
      apply(){player.critUltimateGain+=15;},
      "tags": [
        "ranged",
        "precision",
        "evasive",
        "ultimate",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ranger_tempest",
      "classId": "ranger",
      "rarity": "epic",
      "icon": "🌪️",
      "name": "Tempest Archer",
      "desc": "Board 4 mastery: Arrow Storm deals 100% more damage and gain +8% crit.",
      apply(){player.classUltimateBonus+=1;player.crit+=.08;},
      "tags": [
        "ranged",
        "precision",
        "evasive",
        "ultimate",
        "damage"
      ],
      "achievementGate": "class_b4:ranger",
      "v24Tiered": true
    },
    {
      "id": "sorcerer_meditation",
      "classId": "sorcerer",
      "rarity": "common",
      "icon": "🌀",
      "name": "Arcane Meditation",
      "desc": "Defending restores 4 HP and grants 8 extra ultimate charge.",
      apply(){player.guardHeal+=4;player.ultimateGuardGain+=8;},
      "tags": [
        "ranged",
        "occult",
        "elemental",
        "ultimate",
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "sorcerer_resonance",
      "classId": "sorcerer",
      "rarity": "uncommon",
      "icon": "🔮",
      "name": "Arcane Resonance",
      "desc": "Gain +15% Arcane Surge chance. Arcane Surge makes a basic or Echo strike deal 50% more damage.",
      apply(){player.classBurst+=.15;},
      "tags": [
        "ranged",
        "occult",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "sorcerer_siphon",
      "classId": "sorcerer",
      "rarity": "rare",
      "icon": "🌙",
      "name": "Astral Siphon",
      "desc": "Gain +22% Lifesteal and +3 Attack.",
      apply(){player.lifeSteal+=.22;player.attack+=3;},
      "tags": [
        "ranged",
        "occult",
        "elemental",
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "sorcerer_cosmos",
      "classId": "sorcerer",
      "rarity": "epic",
      "icon": "🌠",
      "name": "Cosmic Overload",
      "desc": "Board 4 mastery: Starfall deals 100% more damage and heals 10% of max HP when used.",
      apply(){player.classUltimateBonus+=1;player.postFightHeal+=0;},
      "tags": [
        "ranged",
        "occult",
        "elemental",
        "sustain",
        "damage"
      ],
      "achievementGate": "class_b4:sorcerer",
      "v24Tiered": true
    },
    {
      "id": "monk_flow",
      "classId": "monk",
      "rarity": "common",
      "icon": "☯️",
      "name": "Flowing Guard",
      "desc": "Defend restores 3 HP and grants 10 additional ultimate charge.",
      apply(){player.guardHeal+=3;player.ultimateGuardGain+=10;},
      "tags": [
        "melee",
        "combo",
        "disciplined",
        "ultimate",
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "monk_palm",
      "classId": "monk",
      "rarity": "uncommon",
      "icon": "🖐️",
      "name": "Open Palm Rhythm",
      "desc": "Gain +15% Echo Strike and +5% dodge.",
      apply(){player.doubleStrike+=.15;player.dodge+=.05;},
      "tags": [
        "melee",
        "combo",
        "disciplined",
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "monk_peace",
      "classId": "monk",
      "rarity": "rare",
      "icon": "🪷",
      "name": "Inner Peace",
      "desc": "Potions heal 60% more and victories restore 5 additional HP.",
      apply(){player.potionPower+=.60;player.postFightHeal+=5;},
      "tags": [
        "melee",
        "combo",
        "disciplined",
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "monk_hundred",
      "classId": "monk",
      "rarity": "epic",
      "icon": "👊",
      "name": "Hundred-Hand Saint",
      "desc": "Board 4 mastery: Hundred Fists deals 100% more damage and gain +3 attack.",
      apply(){player.classUltimateBonus+=1;player.attack+=3;},
      "tags": [
        "melee",
        "combo",
        "disciplined",
        "damage"
      ],
      "achievementGate": "class_b4:monk",
      "v24Tiered": true
    },
    {
      "id": "clown_confetti",
      "classId": "clown",
      "rarity": "common",
      "icon": "🎊",
      "name": "Pocket Confetti",
      "desc": "Gain +8 Luck and +5% critical chance.",
      apply(){player.luck+=.08;player.crit+=.05;},
      "tags": [
        "weird",
        "chaotic",
        "burst",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "clown_chicken",
      "classId": "clown",
      "rarity": "uncommon",
      "icon": "🐔",
      "name": "Rubber Chicken Doctrine",
      "desc": "Gain +20% Echo Strike and +1 attack. Nobody can explain why.",
      apply(){player.doubleStrike+=.20;player.attack+=1;},
      "tags": [
        "weird",
        "chaotic",
        "burst",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "clown_laugh",
      "classId": "clown",
      "rarity": "rare",
      "icon": "😂",
      "name": "Last Laugh",
      "desc": "Gain one revive, +8% dodge and +8 Luck.",
      apply(){player.revives+=1;player.dodge+=.08;player.luck+=.08;},
      "tags": [
        "weird",
        "chaotic",
        "burst",
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "clown_circus",
      "classId": "clown",
      "rarity": "epic",
      "icon": "🎪",
      "name": "Circus Apocalypse",
      "desc": "Board 4 mastery: Final Punchline deals 100% more damage and gain +20 Luck.",
      apply(){player.classUltimateBonus+=1;player.luck+=.20;},
      "tags": [
        "weird",
        "chaotic",
        "burst",
        "damage"
      ],
      "achievementGate": "class_b4:clown",
      "v24Tiered": true
    },
    {
      "id": "rouge_primer",
      "classId": "rouge",
      "rarity": "common",
      "icon": "🖌️",
      "name": "Crimson Primer",
      "desc": "Gain +8% lifesteal and +1 attack.",
      apply(){player.lifeSteal+=.08;player.attack+=1;},
      "tags": [
        "weird",
        "artful",
        "occult",
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rouge_velvet",
      "classId": "rouge",
      "rarity": "uncommon",
      "icon": "🌹",
      "name": "Velvet Cut",
      "desc": "Gain +3 attack and +8% critical chance.",
      apply(){player.attack+=3;player.crit+=.08;},
      "tags": [
        "weird",
        "artful",
        "occult",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rouge_hunger",
      "classId": "rouge",
      "rarity": "rare",
      "icon": "🩸",
      "name": "Scarlet Hunger",
      "desc": "Gain +22% Lifesteal and +25% Boss Damage.",
      apply(){player.lifeSteal+=.22;player.bossDamage+=.25;},
      "tags": [
        "weird",
        "artful",
        "occult",
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rouge_deluge",
      "classId": "rouge",
      "rarity": "epic",
      "icon": "🟥",
      "name": "Paint the World Red",
      "desc": "Crimson Deluge deals 100% more damage and gain +15% Echo Strike.",
      apply(){player.classUltimateBonus+=1;player.doubleStrike+=.15;},
      "achievementGate": "class_b2:rouge",
      "tags": [
        "weird",
        "artful",
        "occult",
        "ultimate",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ranger_fate",
      "classId": "ranger",
      "rarity": "rare",
      "icon": "🎲",
      "name": "Called Shot at Fate",
      "desc": "Each roll has a 16% chance to let you choose the die result.",
      apply(){player.diceChoiceChance+=.16;},
      "tags": [
        "ranged",
        "precision",
        "evasive"
      ],
      "v24Tiered": true
    },
    {
      "id": "clown_fate",
      "classId": "clown",
      "rarity": "uncommon",
      "icon": "🎲",
      "name": "Obviously Loaded Dice",
      "desc": "Each roll has a 14% chance to let you choose the die result.",
      apply(){player.diceChoiceChance+=.14;},
      "tags": [
        "weird",
        "chaotic",
        "burst",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "rouge_fate",
      "classId": "rouge",
      "rarity": "epic",
      "icon": "🎲",
      "name": "Painted Destiny",
      "desc": "Board 4 mastery: Each roll has a 20% chance to let you choose the die result.",
      apply(){player.diceChoiceChance+=.20;},
      "tags": [
        "weird",
        "artful",
        "occult"
      ],
      "achievementGate": "class_b4:rouge",
      "v24Tiered": true
    },
    {
      "id": "berserker_pain",
      "classId": "berserker",
      "rarity": "common",
      "icon": "🩸",
      "name": "Pain Is Fuel",
      "desc": "Gain +2 Attack and +3% damage while below 50% HP.",
      apply(){player.attack+=2;player.berserk+=.03;},
      "tags": [
        "melee",
        "vampiric",
        "reckless",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "berserker_counter",
      "classId": "berserker",
      "rarity": "uncommon",
      "icon": "💢",
      "name": "Violent Patience",
      "desc": "Defending counterattacks for 80% attack damage.",
      apply(){player.guardCounter+=.80;},
      "tags": [
        "melee",
        "vampiric",
        "reckless",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "berserker_echo",
      "classId": "berserker",
      "rarity": "rare",
      "icon": "🪓",
      "name": "Avalanche of Axes",
      "desc": "Gain +35% Echo Strike and +10% lifesteal.",
      apply(){player.doubleStrike+=.35;player.lifeSteal+=.10;},
      "tags": [
        "melee",
        "vampiric",
        "reckless",
        "sustain",
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "berserker_apocalypse",
      "classId": "berserker",
      "rarity": "epic",
      "icon": "🌋",
      "name": "Apocalypse Temper",
      "desc": "Board 4 mastery: Ragequake deals 100% more damage and gain +30% Boss Damage.",
      apply(){player.classUltimateBonus+=1;player.bossDamage+=.30;},
      "tags": [
        "melee",
        "vampiric",
        "reckless",
        "damage"
      ],
      "achievementGate": "class_b4:berserker",
      "v24Tiered": true
    },
    {
      "id": "fighter_metal_affinity",
      "classId": "fighter",
      "rarity": "common",
      "icon": "🤘",
      "name": "Iron Resonance",
      "desc": "Stackable: each copy gives attacks +10% chance to activate Hard Rock Metal Music.",
      apply(){player.classElementProcs.metal=(player.classElementProcs.metal||0)+.10;},
      "tags": [
        "melee",
        "armored",
        "guardian",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ranger_nature_affinity",
      "classId": "ranger",
      "rarity": "common",
      "icon": "🌿",
      "name": "Verdant Arrowheads",
      "desc": "Stackable: each copy gives attacks +10% chance to activate Poison Vines.",
      apply(){player.classElementProcs.nature=(player.classElementProcs.nature||0)+.10;},
      "tags": [
        "ranged",
        "precision",
        "evasive",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "sorcerer_void_affinity",
      "classId": "sorcerer",
      "rarity": "common",
      "icon": "🕳️",
      "name": "Void Channel",
      "desc": "Stackable: each copy gives attacks +10% chance to activate Black Hole.",
      apply(){player.classElementProcs.void=(player.classElementProcs.void||0)+.10;},
      "tags": [
        "ranged",
        "occult",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "monk_electric_affinity",
      "classId": "monk",
      "rarity": "common",
      "icon": "⚡",
      "name": "Storm Kata",
      "desc": "Stackable: each copy gives attacks +10% chance to activate Thunderbolt.",
      apply(){player.classElementProcs.electric=(player.classElementProcs.electric||0)+.10;},
      "tags": [
        "melee",
        "combo",
        "disciplined",
        "ultimate",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "clown_prismatic_affinity",
      "classId": "clown",
      "rarity": "uncommon",
      "icon": "🌈",
      "name": "Prismatic Accident",
      "desc": "Stackable: each copy gives a 0.5% chance for one strike to activate all eleven elemental effects at once.",
      apply(){player.omniElementChance=(player.omniElementChance||0)+.005;},
      "tags": [
        "weird",
        "chaotic",
        "burst",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "rouge_fire_affinity",
      "classId": "rouge",
      "rarity": "common",
      "icon": "🔥",
      "name": "Scarlet Combustion",
      "desc": "Stackable: each copy gives attacks +10% chance to activate Fireball.",
      apply(){player.classElementProcs.fire=(player.classElementProcs.fire||0)+.10;},
      "tags": [
        "weird",
        "artful",
        "occult",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "berserker_fire_affinity",
      "classId": "berserker",
      "rarity": "common",
      "icon": "🔥",
      "name": "Volcanic Temper",
      "desc": "Stackable: each copy gives attacks +10% chance to activate Fireball.",
      apply(){player.classElementProcs.fire=(player.classElementProcs.fire||0)+.10;},
      "tags": [
        "melee",
        "vampiric",
        "reckless",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "turtle_ice_affinity",
      "classId": "turtle",
      "rarity": "common",
      "icon": "❄️",
      "name": "Glacial Shell",
      "desc": "Stackable: each copy gives attacks +10% chance to activate Ice Nova.",
      apply(){player.classElementProcs.ice=(player.classElementProcs.ice||0)+.10;},
      "tags": [
        "armored",
        "slow",
        "guardian",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "frog_electric_affinity",
      "classId": "frog",
      "rarity": "common",
      "icon": "⚡",
      "name": "Storm Croak",
      "desc": "Stackable: each copy gives attacks +10% chance to activate Thunderbolt.",
      apply(){player.classElementProcs.electric=(player.classElementProcs.electric||0)+.10;},
      "tags": [
        "weird",
        "dodgy",
        "echo",
        "ultimate",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "d20_chaos_affinity",
      "classId": "d20",
      "rarity": "uncommon",
      "icon": "🎲",
      "name": "Chromatic Twenty",
      "desc": "Stackable: each copy gives all six core elements a separate 2% activation chance on every strike.",
      apply(){DIBO_ELEMENTS.forEach(k=>player.classElementProcs[k]=(player.classElementProcs[k]||0)+.02);},
      "tags": [
        "weird",
        "chaotic",
        "lucky",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "armored_assault",
      "classIds": [
        "fighter",
        "berserker",
        "turtle",
        "monk"
      ],
      "rarity": "uncommon",
      "icon": "🛡️⚔️",
      "name": "Armored Assault",
      "desc": "Stackable: add 30% of Defense to every basic and Echo attack.",
      apply(){player.defenseAttackScale+=.30;},
      "tags": [
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "evasive_bulwark",
      "classIds": [
        "ranger",
        "monk",
        "frog",
        "rouge",
        "clown"
      ],
      "rarity": "uncommon",
      "icon": "🌫️🛡️",
      "name": "Evasive Bulwark",
      "desc": "Unique: every point of Defense adds 1 raw Dodge point before diminishing returns.",
      apply(){player.defenseDodgeScale+=.01;},
      "unique": true,
      "tags": [
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "vampire_void_affinity",
      "classId": "vampire",
      "rarity": "common",
      "icon": "🕳️",
      "name": "Night's Hunger",
      "desc": "Stackable: +10% chance for attacks to activate Black Hole.",
      apply(){player.classElementProcs.void=(player.classElementProcs.void||0)+.10;},
      "tags": [
        "vampiric",
        "occult",
        "sustain",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "vampire_blood_moon",
      "classId": "vampire",
      "rarity": "epic",
      "icon": "🌑🩸",
      "name": "Blood Moon",
      "desc": "Board 4 mastery: Gain +30% Lifesteal; overhealing becomes up to 20 temporary max HP for the battle.",
      apply(){player.lifeSteal+=.30;player.bloodOverheal=true;},
      "tags": [
        "vampiric",
        "occult",
        "sustain"
      ],
      "achievementGate": "class_b4:vampire",
      "v24Tiered": true
    },
    {
      "id": "ninja_electric_affinity",
      "classId": "ninja",
      "rarity": "common",
      "icon": "⚡",
      "name": "Lightning Step",
      "desc": "Stackable: +10% chance for attacks to activate Thunderbolt.",
      apply(){player.classElementProcs.electric=(player.classElementProcs.electric||0)+.10;},
      "tags": [
        "melee",
        "dodgy",
        "precision",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ninja_shadow_clone",
      "classId": "ninja",
      "rarity": "epic",
      "icon": "🥷🥷",
      "name": "Shadow Parliament",
      "desc": "Board 4 mastery: Gain +35% Crit and +25% Echo Strike. Critical Echoes gain another +25% damage.",
      apply(){player.crit+=.35;player.doubleStrike+=.25;player.criticalEchoBonus=(player.criticalEchoBonus||0)+.25;},
      "tags": [
        "melee",
        "dodgy",
        "precision",
        "tempo",
        "damage"
      ],
      "achievementGate": "class_b4:ninja",
      "v24Tiered": true
    },
    {
      "id": "ceo_tech_affinity",
      "classId": "ceo",
      "rarity": "common",
      "icon": "🤖",
      "name": "Automated Workforce",
      "desc": "Stackable: +10% chance for attacks to activate Brain Hack.",
      apply(){player.classElementProcs.tech=(player.classElementProcs.tech||0)+.10;},
      "tags": [
        "weird",
        "wealth",
        "ranged",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "merchant_coffee_affinity",
      "classId": "merchant",
      "rarity": "common",
      "icon": "☕",
      "name": "Open All Hours",
      "desc": "Stackable: +10% chance for attacks to activate Caffeinated Haste.",
      apply(){player.classElementProcs.coffee=(player.classElementProcs.coffee||0)+.10;},
      "tags": [
        "wealth",
        "occult",
        "weird",
        "tempo",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "legendary_worldheart",
      "rarity": "legendary",
      "unique": false,
      "icon": "🌍",
      "name": "Worldheart",
      "desc": "Gain +45 max HP, +6 Defense and heal fully.",
      apply(){player.maxHp+=45;player.hp=player.maxHp;player.defense+=6;},
      "tags": [
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "legendary_echo_crown",
      "rarity": "legendary",
      "unique": false,
      "icon": "👑↯",
      "name": "Crown of Repetition",
      "desc": "Gain +60% Echo Strike and Echo Strikes deal 25% more damage.",
      apply(){player.doubleStrike+=.60;player.echoDamageScale=Math.max(player.echoDamageScale||.70,.95);},
      "achievementGate": "achievement:legendary3",
      "tags": [
        "tempo",
        "pet",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "legendary_prismatic",
      "rarity": "legendary",
      "unique": false,
      "icon": "🌈",
      "name": "Prismatic Sovereignty",
      "desc": "Gain +25% elemental activation and +50% elemental power.",
      apply(){player.elementProcBonus+=.25;player.elementDamageBonus+=.50;},
      "tags": [
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "legendary_blood_contract",
      "rarity": "legendary",
      "unique": false,
      "icon": "📜🩸",
      "name": "Blood Contract",
      "desc": "Gain +45% Lifesteal and +35% Boss Damage, but lose 12% of current max HP this run.",
      "apply": function(){player.lifeSteal+=.45;player.bossDamage+=.35;const loss=Math.max(1,Math.ceil(player.maxHp*.12));player.maxHp=Math.max(1,player.maxHp-loss);player.hp=Math.min(player.hp,player.maxHp);},
      "achievementGate": "achievement:blood-well",
      "tags": [
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "legendary_loaded_road",
      "rarity": "legendary",
      "unique": true,
      "icon": "🎲✨",
      "name": "The Road Is Loaded",
      "desc": "Natural sixes grant +40 Fast Travel XP, +35 Ultimate charge and 40 bonus gold this run.",
      "apply": function(){player.loadedSix=true;player.loadedSixBonusXp=40;player.loadedSixUltimate=35;player.loadedSixGold=40;},
      "achievementGate": "achievement:double-dice",
      "tags": [
        "ultimate"
      ],
      "v24Tiered": true
    },
    {
      "id": "legendary_packbreaker",
      "rarity": "legendary",
      "unique": true,
      "icon": "👹💥",
      "name": "Packbreaker",
      "desc": "Deal +65% damage while two or more enemies remain alive and gain +15% Echo Strike.",
      "apply": function(){player.packDamageBonus=(player.packDamageBonus||0)+.65;player.doubleStrike+=.15;},
      "achievementGate": "achievement:menagerie",
      "tags": [
        "pet",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "legendary_second_sun",
      "rarity": "legendary",
      "unique": true,
      "icon": "☀️☀️",
      "name": "Second Sun",
      "desc": "The first time you would die each board, survive at 1 HP and unleash Holy on the pack.",
      apply(){player.secondSun=true;player.secondSunUsedBoards=player.secondSunUsedBoards||{};},
      "achievementGate": "achievement:hell-gate",
      "tags": [
        "pet"
      ],
      "v24Tiered": true
    },
    {
      "id": "legendary_golden_law",
      "rarity": "legendary",
      "unique": true,
      "icon": "⚖️🪙",
      "name": "Golden Law",
      "desc": "Gain +100% gold. Every 100 gold grants +1 effective Attack; Ouroboros converts that growth into +10% Echo Strike instead.",
      apply(){player.goldBonus+=1;player.goldAttackScale=.01;},
      "achievementGate": "merchant1",
      "tags": [
        "wealth",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rare_glass_needle",
      "rarity": "uncommon",
      "icon": "🪡",
      "name": "Glass Needle",
      "desc": "Gain +14% Crit and +2 Attack, but lose 6 max HP.",
      apply(){player.crit+=.14;player.attack+=2;player.maxHp=Math.max(1,player.maxHp-6);player.hp=Math.min(player.hp,player.maxHp);},
      "tags": [
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rare_echo_chamber",
      "rarity": "epic",
      "icon": "🔊",
      "name": "Echo Chamber",
      "desc": "Gain +40% Echo Strike; Echoes deal 15% more damage.",
      "apply": function(){player.doubleStrike+=.40;player.echoDamageScale=(player.echoDamageScale||.70)+.15;},
      "tags": [
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rare_dragon_mark",
      "rarity": "uncommon",
      "icon": "🐉",
      "name": "Dragon Mark",
      "desc": "Gain +18% Boss Damage and +2 Attack.",
      apply(){player.bossDamage+=.18;player.attack+=2;},
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rare_stormstep",
      "rarity": "uncommon",
      "icon": "🌩️",
      "name": "Stormstep",
      "desc": "Gain +7% raw Dodge and +10 Luck.",
      apply(){player.dodge+=.07;player.luck+=.10;},
      "tags": [
        "ultimate",
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "rare_prism_lens",
      "rarity": "uncommon",
      "icon": "🔍🌈",
      "name": "Prism Lens",
      "desc": "Gain +8% elemental activation and +15% elemental power.",
      apply(){player.elementProcBonus+=.08;player.elementDamageBonus+=.15;},
      "tags": [
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "rare_pack_hunter",
      "rarity": "uncommon",
      "icon": "👹🎯",
      "name": "Pack Hunter",
      "desc": "Deal +18% damage while at least two enemies remain.",
      apply(){player.packDamageBonus=(player.packDamageBonus||0)+.18;},
      "tags": [
        "pet",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rare_ultimate_vessel",
      "rarity": "uncommon",
      "icon": "💜",
      "name": "Ultimate Vessel",
      "desc": "Gain 35 ultimate immediately and +10% ultimate damage.",
      apply(){player.ultimateCharge=clamp(player.ultimateCharge+35,0,100);player.ultimateDamageBonus+=.10;},
      "tags": [
        "ultimate",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rare_red_flask",
      "rarity": "uncommon",
      "icon": "🧪🩸",
      "name": "Red Flask",
      "desc": "Gain +12% Lifesteal and two potions.",
      apply(){player.lifeSteal+=.12;player.potions+=2;},
      "tags": [
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "fighter_battering_line",
      "classId": "fighter",
      "rarity": "uncommon",
      "icon": "🛡️💥",
      "name": "Battering Line",
      "desc": "Basic attacks gain 30% of Defense as damage and guarding grants +5 Ultimate.",
      apply(){player.defenseAttackScale+=.30;player.ultimateGuardGain+=5;},
      "tags": [
        "melee",
        "armored",
        "guardian",
        "ultimate",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "fighter_iron_command",
      "classId": "fighter",
      "rarity": "rare",
      "icon": "⚔️🏰",
      "name": "Iron Command",
      "desc": "Board 3 mastery: Gain +4 Defense; Titan Cleave grants one additional barrier.",
      apply(){player.defense+=4;player.titanCleaveBarrierBonus=(player.titanCleaveBarrierBonus||0)+1;},
      "tags": [
        "melee",
        "armored",
        "guardian"
      ],
      "achievementGate": "class_b3:fighter",
      "v24Tiered": true
    },
    {
      "id": "ranger_thorn_volley",
      "classId": "ranger",
      "rarity": "uncommon",
      "icon": "🌿🏹",
      "name": "Thorn Volley",
      "desc": "Gain +10% Crit and +12% Nature activation.",
      apply(){player.crit+=.10;player.classElementProcs.nature=(player.classElementProcs.nature||0)+.12;},
      "tags": [
        "ranged",
        "precision",
        "evasive",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ranger_high_ground",
      "classId": "ranger",
      "rarity": "rare",
      "icon": "🦅",
      "name": "High Ground",
      "desc": "Board 3 mastery: First attacks deal 80% more damage and gain +12% Echo Strike.",
      apply(){player.firstAttackBonus+=.80;player.doubleStrike+=.12;},
      "tags": [
        "ranged",
        "precision",
        "evasive",
        "tempo",
        "damage"
      ],
      "achievementGate": "class_b3:ranger",
      "v24Tiered": true
    },
    {
      "id": "sorcerer_mana_fracture",
      "classId": "sorcerer",
      "rarity": "uncommon",
      "icon": "🔮💥",
      "name": "Mana Fracture",
      "desc": "Gain +15% Arcane Surge chance and +12% elemental power. Arcane Surge makes a basic or Echo strike deal 50% more damage.",
      apply(){player.classBurst+=.15;player.elementDamageBonus+=.12;},
      "tags": [
        "ranged",
        "occult",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "sorcerer_gravity_well",
      "classId": "sorcerer",
      "rarity": "rare",
      "icon": "🕳️☄️",
      "name": "Gravity Well",
      "desc": "Gain +20% Void activation and +25% Boss Damage.",
      apply(){player.classElementProcs.void=(player.classElementProcs.void||0)+.20;player.bossDamage+=.25;},
      "tags": [
        "ranged",
        "occult",
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "monk_afterimage",
      "classId": "monk",
      "rarity": "uncommon",
      "icon": "🥋💨",
      "name": "Afterimage Kata",
      "desc": "Gain +15% Echo Strike and +6% raw Dodge.",
      apply(){player.doubleStrike+=.15;player.dodge+=.06;},
      "tags": [
        "melee",
        "combo",
        "disciplined",
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "monk_perfect_form",
      "classId": "monk",
      "rarity": "rare",
      "icon": "☯️",
      "name": "Perfect Form",
      "desc": "Board 3 mastery: Gain +3 Attack, +3 Defense and +15 ultimate from every Guard.",
      apply(){player.attack+=3;player.defense+=3;player.ultimateGuardGain+=15;},
      "tags": [
        "melee",
        "combo",
        "disciplined",
        "ultimate",
        "damage"
      ],
      "achievementGate": "class_b3:monk",
      "v24Tiered": true
    },
    {
      "id": "clown_banana_law",
      "classId": "clown",
      "rarity": "uncommon",
      "icon": "🍌",
      "name": "Banana-Peel Law",
      "desc": "Gain +16 Luck and +7% Dodge. This is apparently jurisprudence.",
      apply(){player.luck+=.16;player.dodge+=.07;},
      "tags": [
        "weird",
        "chaotic",
        "burst",
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "clown_three_ring",
      "classId": "clown",
      "rarity": "rare",
      "icon": "🎪🎪🎪",
      "name": "Three-Ring Disaster",
      "desc": "Board 3 mastery: Gain +15% Crit, +15% Echo and +0.5% Prismatic Accident.",
      apply(){player.crit+=.15;player.doubleStrike+=.15;player.omniElementChance=(player.omniElementChance||0)+.005;},
      "tags": [
        "weird",
        "chaotic",
        "burst",
        "tempo",
        "damage"
      ],
      "achievementGate": "class_b3:clown",
      "v24Tiered": true
    },
    {
      "id": "rouge_carmine_veins",
      "classId": "rouge",
      "rarity": "uncommon",
      "icon": "🌹🩸",
      "name": "Carmine Veins",
      "desc": "Gain +16% Lifesteal and +8% Crit.",
      apply(){player.lifeSteal+=.16;player.crit+=.08;},
      "tags": [
        "weird",
        "artful",
        "occult",
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rouge_masterpiece",
      "classId": "rouge",
      "rarity": "rare",
      "icon": "🖼️",
      "name": "Final Masterpiece",
      "desc": "Board 3 mastery: Gain +3 Attack, +18% Boss Damage and +12% Echo Strike.",
      apply(){player.attack+=3;player.bossDamage+=.18;player.doubleStrike+=.12;},
      "tags": [
        "weird",
        "artful",
        "occult",
        "tempo",
        "damage"
      ],
      "achievementGate": "class_b3:rouge",
      "v24Tiered": true
    },
    {
      "id": "berserker_blood_roar",
      "classId": "berserker",
      "rarity": "uncommon",
      "icon": "🩸📣",
      "name": "Blood Roar",
      "desc": "Gain +5 Attack and +5% damage while below 50% HP.",
      apply(){player.attack+=5;player.berserk+=.05;},
      "tags": [
        "melee",
        "vampiric",
        "reckless",
        "sustain",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "berserker_unbroken",
      "classId": "berserker",
      "rarity": "rare",
      "icon": "🪓🔥",
      "name": "Unbroken Rampage",
      "desc": "Board 3 mastery: Gain +25 max HP, +20% Echo Strike and one revive.",
      apply(){player.maxHp+=25;player.hp+=25;player.doubleStrike+=.20;player.revives+=1;},
      "tags": [
        "melee",
        "vampiric",
        "reckless",
        "sustain",
        "tempo"
      ],
      "achievementGate": "class_b3:berserker",
      "v24Tiered": true
    },
    {
      "id": "turtle_shell_memory",
      "classId": "turtle",
      "rarity": "uncommon",
      "icon": "🐢🧠",
      "name": "Shell Memory",
      "desc": "Gain +4 Defense and heal 3 HP after victories.",
      apply(){player.defense+=4;player.postFightHeal+=3;},
      "tags": [
        "armored",
        "slow",
        "guardian",
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "turtle_continental",
      "classId": "turtle",
      "rarity": "rare",
      "icon": "🌍🐢",
      "name": "Continental Drift",
      "desc": "Board 3 mastery: Gain +35 max HP; add 60% of Defense to attacks.",
      apply(){player.maxHp+=35;player.hp+=35;player.defenseAttackScale+=.60;},
      "tags": [
        "armored",
        "slow",
        "guardian",
        "sustain",
        "damage"
      ],
      "achievementGate": "class_b3:turtle",
      "v24Tiered": true
    },
    {
      "id": "frog_lingering_croak",
      "classId": "frog",
      "rarity": "rare",
      "icon": "🐸🔊",
      "name": "Lingering Croak",
      "desc": "Gain +32% Echo Strike and Echoes deal 10% more damage.",
      apply(){player.doubleStrike+=.32;player.echoDamageScale=Math.min(1.25,(player.echoDamageScale||.70)+.10);},
      "tags": [
        "weird",
        "dodgy",
        "echo",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "frog_amphibian_loop",
      "classId": "frog",
      "rarity": "epic",
      "icon": "♻️🐸",
      "name": "Amphibian Recursion",
      "desc": "Gain +50% Echo Strike and +12% Crit.",
      "apply": function(){player.doubleStrike+=.50;player.crit+=.12;},
      "tags": [
        "weird",
        "dodgy",
        "echo",
        "tempo",
        "damage"
      ],
      "achievementGate": "class_b3:frog",
      "v24Tiered": true
    },
    {
      "id": "d20_bent_probability",
      "classId": "d20",
      "rarity": "uncommon",
      "icon": "🎲↻",
      "name": "Bent Probability",
      "desc": "Every action has a 20% chance to add a random extra Echo, barrier, heal or element.",
      apply(){player.d20BonusChance=(player.d20BonusChance||0)+.20;},
      "tags": [
        "weird",
        "chaotic",
        "lucky",
        "sustain",
        "tempo",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "d20_loaded_corners",
      "classId": "d20",
      "rarity": "rare",
      "icon": "🎲✨",
      "name": "Loaded Corners",
      "desc": "Board 3 mastery: Every d20 action roll has a 12% chance to be replaced by a random roll from 17–20.",
      apply(){player.d20HighRollChance=(player.d20HighRollChance||0)+.12;},
      "tags": [
        "weird",
        "chaotic",
        "lucky"
      ],
      "achievementGate": "class_b3:d20",
      "v24Tiered": true
    },
    {
      "id": "vampire_red_mist",
      "classId": "vampire",
      "rarity": "uncommon",
      "icon": "🩸🌫️",
      "name": "Red Mist",
      "desc": "Gain +18% Lifesteal and +6% Dodge.",
      apply(){player.lifeSteal+=.18;player.dodge+=.06;},
      "tags": [
        "vampiric",
        "occult",
        "sustain",
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "vampire_night_feast",
      "classId": "vampire",
      "rarity": "rare",
      "icon": "🦇🍷",
      "name": "Night Feast",
      "desc": "Board 3 mastery: Gain +4 Attack and +25% Boss Damage; victories heal 6 HP.",
      apply(){player.attack+=4;player.bossDamage+=.25;player.postFightHeal+=6;},
      "tags": [
        "vampiric",
        "occult",
        "sustain",
        "damage"
      ],
      "achievementGate": "class_b3:vampire",
      "v24Tiered": true
    },
    {
      "id": "ninja_smoke_math",
      "classId": "ninja",
      "rarity": "uncommon",
      "icon": "🥷💨",
      "name": "Smoke Mathematics",
      "desc": "Gain +16% Crit and +6% raw Dodge.",
      apply(){player.crit+=.16;player.dodge+=.06;},
      "tags": [
        "melee",
        "dodgy",
        "precision",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ninja_five_shadows",
      "classId": "ninja",
      "rarity": "rare",
      "icon": "🌘🗡️",
      "name": "Five Shadows",
      "desc": "Gain +25% Echo Strike and +22% Boss Damage.",
      apply(){player.doubleStrike+=.25;player.bossDamage+=.22;},
      "tags": [
        "melee",
        "dodgy",
        "precision",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ceo_hostile_synergy",
      "classId": "ceo",
      "rarity": "uncommon",
      "icon": "📈🤝",
      "name": "Hostile Synergy",
      "desc": "Gain +20% Boss Damage and +30% gold.",
      apply(){player.bossDamage+=.20;player.goldBonus+=.30;},
      "tags": [
        "weird",
        "wealth",
        "ranged",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ceo_infinite_growth",
      "classId": "ceo",
      "rarity": "rare",
      "icon": "📊♾️",
      "name": "Infinite Growth",
      "desc": "Board 3 mastery: Gain +4 Attack and every 200 gold adds another +1 effective attack.",
      apply(){player.attack+=4;player.goldAttackScale=Math.max(player.goldAttackScale||0,.005);},
      "tags": [
        "weird",
        "wealth",
        "ranged",
        "damage"
      ],
      "achievementGate": "class_b3:ceo",
      "v24Tiered": true
    },
    {
      "id": "merchant_bulk_discount",
      "classId": "merchant",
      "rarity": "uncommon",
      "icon": "🧔📦",
      "name": "Bulk Discount Violence",
      "desc": "Gain +40% gold and +12 Luck.",
      apply(){player.goldBonus+=.40;player.luck+=.12;},
      "tags": [
        "wealth",
        "occult",
        "weird"
      ],
      "v24Tiered": true
    },
    {
      "id": "merchant_compound_fury",
      "classId": "merchant",
      "rarity": "rare",
      "icon": "🪙💥",
      "name": "Compound Fury",
      "desc": "Board 3 mastery: Gain +4 Attack, +20% Boss Damage and +15% Echo Strike.",
      apply(){player.attack+=4;player.bossDamage+=.20;player.doubleStrike+=.15;},
      "tags": [
        "wealth",
        "occult",
        "weird",
        "tempo",
        "damage"
      ],
      "achievementGate": "class_b3:merchant",
      "v24Tiered": true
    },
    {
      "id": "shared_vanguard",
      "classIds": [
        "fighter",
        "berserker",
        "turtle",
        "monk"
      ],
      "rarity": "uncommon",
      "icon": "⚔️🛡️",
      "name": "Vanguard Doctrine",
      "desc": "Gain +2 Attack, +2 Defense and +10% Boss Damage.",
      apply(){player.attack+=2;player.defense+=2;player.bossDamage+=.10;},
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "shared_skirmisher",
      "classIds": [
        "ranger",
        "ninja",
        "frog",
        "monk"
      ],
      "rarity": "uncommon",
      "icon": "💨🎯",
      "name": "Skirmisher's Tempo",
      "desc": "Gain +8% Crit, +8% Echo Strike and +4% raw Dodge.",
      apply(){player.crit+=.08;player.doubleStrike+=.08;player.dodge+=.04;},
      "tags": [
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "shared_occult",
      "classIds": [
        "sorcerer",
        "vampire",
        "rouge",
        "d20",
        "clown"
      ],
      "rarity": "uncommon",
      "icon": "🔮🩸",
      "name": "Occult Convergence",
      "desc": "Gain +8% elemental activation and +8% Lifesteal.",
      apply(){player.elementProcBonus+=.08;player.lifeSteal+=.08;},
      "tags": [
        "sustain",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "venom_edge",
      "rarity": "common",
      "icon": "🐍",
      "name": "Venom Edge",
      "desc": "Gain +10% Poison Chance.",
      "apply": function(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.10;},
      "tags": [
        "tempo"
      ],
      "v24Tiered": true
    },
    {
      "id": "toxicology",
      "rarity": "uncommon",
      "icon": "🧪🌿",
      "name": "Road Toxicology",
      "desc": "Gain +15% Poison damage and +8% Poison Chance.",
      "apply": function(){
      player.poisonStackPower=(player.poisonStackPower||.12)+.15;
      player.poisonOnHitChance=(player.poisonOnHitChance||0)+.08;
    },
      "tags": [
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "thorn_venom",
      "classIds": [
        "ranger",
        "ninja",
        "frog",
        "monk"
      ],
      "rarity": "uncommon",
      "icon": "🌿🎯",
      "name": "Thorn Venom",
      "desc": "Gain +8% Crit and +10% chance to apply a Poison stack with basic and Echo strikes.",
      apply(){player.crit+=.08;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.10;},
      "tags": [
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "toxic_bloom",
      "rarity": "rare",
      "icon": "☠️🌺",
      "name": "Toxic Bloom",
      "desc": "Nature activation adds one more poison proc, and Poison deals +3% Attack per stack.",
      apply(){player.naturePoisonStacks=(player.naturePoisonStacks||1)+1;player.poisonStackPower=(player.poisonStackPower||.12)+.03;},
      "achievementGate": "achievement:nature-master",
      "tags": [
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "plague_lord",
      "rarity": "epic",
      "achievementGate": "nature_master",
      "icon": "👑☠️",
      "name": "Crown of the Green Plague",
      "desc": "Achievement-locked: Nature adds 3 extra Poison stacks, Poison deals +8% Attack per stack, and attacks gain +1% Nature activation.",
      "apply": function(){player.naturePoisonStacks=(player.naturePoisonStacks||1)+3;player.poisonStackPower=(player.poisonStackPower||.12)+.08;player.classElementProcs.nature=(player.classElementProcs.nature||0)+.01;},
      "tags": [
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "gunpowder_luck",
      "rarity": "uncommon",
      "icon": "🔫🍀",
      "name": "Loaded Chamber",
      "desc": "Gain +10 Luck and every strike has a 7% chance to activate Deadeye Volley.",
      apply(){player.luck+=.10;player.classElementProcs.gun=(player.classElementProcs.gun||0)+.07;},
      "tags": [
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "elemental_predator",
      "rarity": "rare",
      "icon": "🌈🐺",
      "name": "Elemental Predator",
      "desc": "Gain +25% elemental power and deal +12% damage against elemental monsters.",
      apply(){player.elementDamageBonus+=.25;player.elementalEnemyDamage=(player.elementalEnemyDamage||0)+.12;},
      "achievementGate": "achievement:road3",
      "tags": [
        "elemental",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "cleric_benediction",
      "classId": "cleric",
      "rarity": "common",
      "icon": "🙏",
      "name": "Benediction",
      "desc": "Blessed attack heals are 3 HP stronger and Guard restores 3 HP.",
      apply(){player.clericHealBonus=(player.clericHealBonus||0)+3;player.guardHeal+=3;},
      "tags": [
        "holy",
        "sustain",
        "guardian",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "cleric_radiance",
      "classId": "cleric",
      "rarity": "uncommon",
      "icon": "☀️",
      "name": "Radiant Doctrine",
      "desc": "Gain +12% Light activation and +20% elemental power.",
      apply(){player.classElementProcs.light=(player.classElementProcs.light||0)+.12;player.elementDamageBonus+=.20;},
      "tags": [
        "holy",
        "sustain",
        "guardian",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "cleric_saint",
      "classId": "cleric",
      "rarity": "epic",
      "achievementGate": "heal1000",
      "icon": "👼",
      "name": "Saint of a Thousand Wounds",
      "desc": "Achievement-locked: +30 max HP, +25% Light activation and every victory heals 10 HP.",
      apply(){player.maxHp+=30;player.hp+=30;player.classElementProcs.light=(player.classElementProcs.light||0)+.25;player.postFightHeal+=10;},
      "tags": [
        "holy",
        "sustain",
        "guardian",
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "paladin_smite",
      "classId": "paladin",
      "rarity": "uncommon",
      "icon": "⚜️",
      "name": "Oathbound Smite",
      "desc": "Add 50% of Defense to basic and Echo attacks.",
      apply(){player.defenseAttackScale+=.50;},
      "tags": [
        "holy",
        "armored",
        "guardian",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "paladin_citadel",
      "classId": "paladin",
      "rarity": "epic",
      "achievementGate": "paladin_oath",
      "icon": "🏰✨",
      "name": "Walking Sanctuary",
      "desc": "Achievement-locked: +5 Defense, +25 max HP and begin every battle with two extra barriers.",
      apply(){player.defense+=5;player.maxHp+=25;player.hp+=25;player.firstHitBlocks+=2;},
      "tags": [
        "holy",
        "armored",
        "guardian",
        "sustain"
      ],
      "v24Tiered": true
    },
    {
      "id": "beastmaster_pack",
      "classId": "beastmaster",
      "rarity": "uncommon",
      "icon": "🐾",
      "name": "Pack Discipline",
      "desc": "Pet attacks deal +6 damage and gain +20% double-attack chance.",
      apply(){player.petDamageBonus+=6;player.petDoubleChance+=.20;},
      "tags": [
        "pet",
        "ranged",
        "pack",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "beastmaster_alpha",
      "classId": "beastmaster",
      "rarity": "epic",
      "achievementGate": "menagerie",
      "icon": "🐺👑",
      "name": "Alpha of Every Road",
      "desc": "Achievement-locked: +10 pet damage, +30% pet double chance and +3 Attack.",
      apply(){player.petDamageBonus+=10;player.petDoubleChance+=.30;player.attack+=3;},
      "tags": [
        "pet",
        "ranged",
        "pack",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rogue_backstab",
      "classId": "rogue",
      "rarity": "uncommon",
      "icon": "🗡️💰",
      "name": "Profitable Backstab",
      "desc": "Gain +14% Crit and attacks add 0.2% of current gold as effective Attack.",
      apply(){player.crit+=.14;player.goldAttackScale=Math.max(player.goldAttackScale||0,.002);},
      "tags": [
        "melee",
        "dodgy",
        "wealth",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "rogue_kingpin",
      "classId": "rogue",
      "rarity": "epic",
      "achievementGate": "gold1500",
      "icon": "💎🗡️",
      "name": "Kingpin's Cut",
      "desc": "Achievement-locked: +5 Attack, +20% Crit, +20% Echo and +50% gold.",
      apply(){player.attack+=5;player.crit+=.20;player.doubleStrike+=.20;player.goldBonus+=.50;},
      "tags": [
        "melee",
        "dodgy",
        "wealth",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "ranger_crownshot",
      "classId": "ranger",
      "rarity": "epic",
      "achievementGate": "ranger_b1",
      "icon": "🏹👑",
      "name": "Crownshot",
      "desc": "Achievement-locked: +15% Crit, +20% Boss Damage and Arrow Storm gains another +50% damage.",
      apply(){player.crit+=.15;player.bossDamage+=.20;player.classUltimateBonus+=.50;},
      "tags": [
        "ranged",
        "precision",
        "evasive",
        "ultimate",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "sorcerer_starcovenant",
      "classId": "sorcerer",
      "rarity": "epic",
      "achievementGate": "sorcerer_b2",
      "icon": "🌠🔮",
      "name": "Star Covenant",
      "desc": "Achievement-locked: +20% element power, +20% Echo and Starfall gains another +50% damage.",
      apply(){player.elementDamageBonus+=.20;player.doubleStrike+=.20;player.classUltimateBonus+=.50;},
      "tags": [
        "ranged",
        "occult",
        "elemental",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "slime_apotheosis",
      "classId": "slime",
      "rarity": "epic",
      "achievementGate": "slime_lvl5",
      "icon": "🟢👑",
      "name": "Royal Jelly",
      "desc": "Achievement-locked: +25 max HP, +4 Attack and +18% Echo Strike.",
      apply(){player.maxHp+=25;player.hp+=25;player.attack+=4;player.doubleStrike+=.18;},
      "tags": [
        "weird",
        "sticky",
        "durable",
        "sustain",
        "tempo",
        "damage"
      ],
      "v24Tiered": true
    },
    {
      "id": "summoner_deeper_circle",
      "classId": "summoner",
      "rarity": "common",
      "icon": "🔷",
      "name": "Deeper Circle",
      "desc": "Conjured spirits deal +3 damage and Spirit Bolt generates +6 Mana.",
      "tags": [
        "pet",
        "mana"
      ],
      apply(){player.petDamageBonus+=3;player.summonerManaBonus=(player.summonerManaBonus||0)+6;},
      "v24Tiered": true
    },
    {
      "id": "summoner_twin_pact",
      "classId": "summoner",
      "rarity": "uncommon",
      "icon": "🐾🐾",
      "name": "Twin Pact",
      "desc": "Summoned spirits gain +25% damage and a 15% chance to attack twice.",
      "tags": [
        "pet",
        "pack"
      ],
      apply(){player.summonerSpiritScale=(player.summonerSpiritScale||1)+.25;player.summonerSpiritDouble=(player.summonerSpiritDouble||0)+.15;},
      "v24Tiered": true
    },
    {
      "id": "summoner_archpact",
      "classId": "summoner",
      "rarity": "epic",
      "icon": "🌌📖",
      "name": "Archpact",
      "desc": "Board 4 mastery: Begin every battle with one random spirit already conjured, +20 max Mana and +5 pet damage.",
      "tags": [
        "pet",
        "mana",
        "legendary"
      ],
      apply(){player.summonerAutoSpirit=true;player.maxMana+=20;player.mana=Math.min(player.maxMana,player.mana+20);player.petDamageBonus+=5;},
      "achievementGate": "class_b4:summoner",
      "v24Tiered": true
    },
    {
      "id": "trainer_double_battle",
      "classId": "pokemontrainer",
      "rarity": "uncommon",
      "icon": "🐾⚔️",
      "name": "Double Battle",
      "desc": "Roster assist chance rises by 20% and assists deal more damage.",
      "tags": [
        "pet",
        "pack"
      ],
      apply(){player.trainerAssistBonus=(player.trainerAssistBonus||0)+.20;player.trainerAssistScale=(player.trainerAssistScale||.65)+.20;},
      "v24Tiered": true
    },
    {
      "id": "trainer_champion",
      "classId": "pokemontrainer",
      "rarity": "epic",
      "icon": "🏆🐾",
      "name": "Road Champion",
      "desc": "Board 4 mastery: Every roster creature gains +5 effective pet damage and the Six-Pack Stampede is 35% stronger.",
      "tags": [
        "pet",
        "pack",
        "legendary"
      ],
      apply(){player.petDamageBonus+=5;player.trainerUltimateBonus=(player.trainerUltimateBonus||0)+.35;},
      "achievementGate": "class_b4:pokemontrainer",
      "v24Tiered": true
    },
    {
      "id": "alchemist_quick_brew",
      "classId": "alchemist",
      "rarity": "uncommon",
      "icon": "🧪⚙️",
      "name": "Quick Brew",
      "desc": "Combat Distillery creates a potion every 2 basic attacks instead of every 3.",
      "tags": [
        "alchemy",
        "sustain"
      ],
      apply(){player.alchemistBrewNeed=2;},
      "v24Tiered": true
    },
    {
      "id": "alchemist_volatile_formula",
      "classId": "alchemist",
      "rarity": "uncommon",
      "icon": "💥🧪",
      "name": "Volatile Formula",
      "desc": "Volatile Flask deals +35% damage and has a 20% chance to trigger a random element.",
      "tags": [
        "alchemy",
        "damage",
        "elemental"
      ],
      apply(){player.alchemistFlaskBonus=(player.alchemistFlaskBonus||0)+.35;player.alchemistElementChance=(player.alchemistElementChance||0)+.20;},
      "v24Tiered": true
    },
    {
      "id": "alchemist_panacea_engine",
      "classId": "alchemist",
      "rarity": "epic",
      "icon": "⚗️🌈",
      "name": "Panacea Engine",
      "desc": "Board 4 mastery: +75% Potion Healing. Volatile Flask has a 30% chance not to consume its potion.",
      "tags": [
        "alchemy",
        "sustain",
        "legendary"
      ],
      apply(){player.potionPower+=.75;player.alchemistFreeFlask=(player.alchemistFreeFlask||0)+.30;},
      "achievementGate": "class_b4:alchemist",
      "v24Tiered": true
    },
    {
      "id": "reactive_carapace",
      "classIds": [
        "turtle",
        "slime"
      ],
      "rarity": "uncommon",
      "icon": "🐢🌈",
      "name": "Reactive Carapace",
      "desc": "Guard gains +12% chance to trigger an elemental proc.",
      "tags": [
        "guardian",
        "elemental"
      ],
      apply(){player.guardElementProcBonus=(player.guardElementProcBonus||0)+.12;},
      "v24Tiered": true
    },
    {
      "id": "ninja_smoke_step",
      "classId": "ninja",
      "rarity": "rare",
      "unique": true,
      "icon": "🌫️🥷",
      "name": "Vanishing Point",
      "desc": "Board 3 mastery: Unique: Smoke Execution needs one fewer Smoke stack.",
      "tags": [
        "dodgy",
        "precision",
        "unique"
      ],
      apply(){player.ninjaSmokeNeed=2;player.ninjaSmoke=Math.min(player.ninjaSmoke||0,2);},
      "achievementGate": "class_b3:ninja",
      "v24Tiered": true
    },
    {
      "id": "mana_deep_reservoir",
      "classIds": [
        "sorcerer",
        "vampire",
        "rouge",
        "merchant",
        "summoner"
      ],
      "rarity": "uncommon",
      "icon": "🔷",
      "name": "Deep Reservoir",
      "desc": "+25 max Mana and restore 25 Mana immediately.",
      "tags": [
        "mana",
        "occult"
      ],
      apply(){player.maxMana=(player.maxMana||0)+25;player.mana=Math.min(player.maxMana,(player.mana||0)+25);},
      "v24Tiered": true
    },
    {
      "id": "mana_quick_channel",
      "classIds": [
        "sorcerer",
        "vampire",
        "rouge",
        "merchant",
        "summoner"
      ],
      "rarity": "uncommon",
      "icon": "⚡🔮",
      "name": "Quick Channel",
      "desc": "Mana-building attacks generate +8 Mana.",
      "tags": [
        "mana",
        "tempo"
      ],
      apply(){player.manaBuilderBonus=(player.manaBuilderBonus||0)+8;},
      "v24Tiered": true
    },
    {
      "id": "mana_overflow",
      "classIds": [
        "sorcerer",
        "vampire",
        "rouge",
        "merchant",
        "summoner"
      ],
      "rarity": "rare",
      "icon": "🌊🔮",
      "name": "Arcane Overflow",
      "desc": "Board 3 mastery: +35 max Mana. Spending Mana grants 8 Ultimate charge.",
      "tags": [
        "mana",
        "ultimate"
      ],
      apply(){player.maxMana=(player.maxMana||0)+35;player.mana=Math.min(player.maxMana,(player.mana||0)+35);player.manaSpendUltimate=(player.manaSpendUltimate||0)+8;},
      "achievementGate": "achievement:prestige5",
      "v24Tiered": true
    },
    {
      "id": "ouro_venom_coil",
      "classId": "ouroboros",
      "rarity": "rare",
      "icon": "🐍☠️",
      "name": "Venom Coil",
      "desc": "Gain +35% Echo Strike, +15% Poison Chance and +20% Poison damage.",
      "tags": [
        "echo",
        "poison"
      ],
      "apply": function(){player.doubleStrike+=.35;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.15;player.poisonStackPower=(player.poisonStackPower||.12)+.20;},
      "v24Tiered": true
    },
    {
      "id": "ouro_irradiated_molt",
      "classId": "ouroboros",
      "rarity": "uncommon",
      "icon": "☢️🐍",
      "name": "Irradiated Molt",
      "desc": "Gain +25% Echo Strike, +10% elemental activation and +15% Element Power.",
      "tags": [
        "echo",
        "elemental"
      ],
      apply(){player.doubleStrike+=.25;player.elementProcBonus+=.10;player.elementDamageBonus+=.15;},
      "v24Tiered": true
    },
    {
      "id": "ouro_recursive_toxin",
      "classId": "ouroboros",
      "rarity": "epic",
      "icon": "♾️☠️",
      "name": "Recursive Toxin",
      "desc": "Gain +65% Echo Strike. Poison gains +10% Attack damage per stack and Echoes gain +15% Poison chance.",
      "tags": [
        "echo",
        "poison"
      ],
      apply(){player.doubleStrike+=.65;player.poisonStackPower=(player.poisonStackPower||.12)+.10;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.15;},
      "v24Tiered": true
    },
    {
      "id": "ouro_elemental_molting",
      "classId": "ouroboros",
      "rarity": "epic",
      "icon": "🌈🐍",
      "name": "Elemental Molting",
      "desc": "Board 3 mastery: Gain +40% Echo Strike, +20% Element Power and 6% chance for attacks to trigger an additional random element.",
      "tags": [
        "echo",
        "elemental"
      ],
      apply(){player.doubleStrike+=.40;player.elementDamageBonus+=.20;player.omniElementChance=(player.omniElementChance||0)+.06;},
      "achievementGate": "class_b3:ouroboros",
      "v24Tiered": true
    },
    {
      "id": "ouro_tail_world",
      "classId": "ouroboros",
      "rarity": "epic",
      "unique": true,
      "icon": "👑♾️",
      "name": "The Tail Devours the World",
      "desc": "Board 4 mastery: Gain +100% Echo Strike. Poison gains +15% Attack damage per stack, +20% Poison-on-hit and +10% random-element chance.",
      "tags": [
        "echo",
        "poison",
        "elemental",
        "legendary"
      ],
      apply(){player.doubleStrike+=1;player.poisonStackPower=(player.poisonStackPower||.12)+.15;player.poisonOnHitChance=(player.poisonOnHitChance||0)+.20;player.omniElementChance=(player.omniElementChance||0)+.10;},
      "achievementGate": "class_b4:ouroboros",
      "v24Tiered": true
    },
    {
      "id": "perfected_signature",
      "rarity": "epic",
      "unique": true,
      "icon": "✨🧬",
      "name": "Perfected Signature",
      "desc": "Adapts to your current class and perfects its signature mechanic.",
      "apply": function(){
        const service=services.signatures;
        if(!service?.applyCurrent)throw new Error("Perfected Signature service is unavailable.");
        return service.applyCurrent();
      },
      "achievementGate": "achievement:road3",
      "tags": [
        "elemental"
      ],
      "v24Tiered": true
    },
    {
      "id": "attack_common_v24",
      "rarity": "common",
      "icon": "⚔️",
      "name": "Sharpened Steel",
      "desc": "Gain +2 Attack this run.",
      apply(){player.attack+=2;}
    },
    {
      "id": "attack_uncommon_v24",
      "rarity": "uncommon",
      "icon": "⚔️✨",
      "name": "Roadforged Edge",
      "desc": "Gain +4 Attack this run.",
      apply(){player.attack+=4;}
    },
    {
      "id": "hp_common_v24",
      "rarity": "common",
      "icon": "❤️",
      "name": "Stout Heart",
      "desc": "Gain +9 max HP and heal 9 HP this run.",
      apply(){player.maxHp+=9;player.hp+=9;}
    },
    {
      "id": "hp_uncommon_v24",
      "rarity": "uncommon",
      "icon": "❤️✨",
      "name": "Giant Constitution",
      "desc": "Gain +16 max HP and heal 16 HP this run.",
      apply(){player.maxHp+=16;player.hp+=16;}
    },
    {
      "id": "defense_common_v24",
      "rarity": "common",
      "icon": "🛡️",
      "name": "Tempered Guard",
      "desc": "Gain +2 Defense this run.",
      apply(){player.defense+=2;}
    },
    {
      "id": "defense_uncommon_v24",
      "rarity": "uncommon",
      "icon": "🛡️✨",
      "name": "Roadplate",
      "desc": "Gain +4 Defense this run.",
      apply(){player.defense+=4;}
    },
    {
      "id": "crit_uncommon_v24",
      "rarity": "uncommon",
      "icon": "🎯✨",
      "name": "Predatory Focus",
      "desc": "Gain +12% Crit this run.",
      apply(){player.crit+=.12;}
    },
    {
      "id": "echo_uncommon_v24",
      "rarity": "uncommon",
      "icon": "🔁✨",
      "name": "Double Vision",
      "desc": "Gain +20% Echo Strike and Echo Strikes deal 3% more damage this run.",
      "apply": function(){player.doubleStrike+=.20;player.echoDamageScale=(player.echoDamageScale||.70)+.03;}
    },
    {
      "id": "true_legend_attack_v24",
      "rarity": "legendary",
      "icon": "🗡️🌟",
      "name": "Legend of the First Blow",
      "unique": false,
      "desc": "Gain +14 Attack, +18% Crit and +20% Boss Damage this run.",
      apply(){player.attack+=14;player.crit+=.18;player.bossDamage+=.20;}
    ,
      "achievementGate": "achievement:road4"
    },
    {
      "id": "true_legend_echo_v24",
      "rarity": "legendary",
      "icon": "♾️🌟",
      "name": "Legend of Repetition",
      "unique": false,
      "desc": "Gain +80% Echo Strike and Echo Strikes deal 30% more damage this run.",
      "apply": function(){player.doubleStrike+=.80;player.echoDamageScale=(player.echoDamageScale||.70)+.30;}
    },
    {
      "id": "true_legend_guard_v24",
      "rarity": "legendary",
      "icon": "🏰🌟",
      "name": "Legend of the Last Wall",
      "unique": false,
      "desc": "Gain +12 Defense and start every battle with 2 additional Barriers this run.",
      apply(){player.defense+=12;player.firstHitBlocks=(player.firstHitBlocks||0)+2;}
    ,
      "achievementGate": "achievement:road5"
    },
    {
      "id": "true_legend_element_v24",
      "rarity": "legendary",
      "icon": "🌈🌟",
      "name": "Legend of the Prismatic Road",
      "unique": false,
      "desc": "Gain +35% elemental proc chance and +60% elemental power this run.",
      "apply": function(){player.elementProcBonus=(player.elementProcBonus||0)+.35;player.elementDamageBonus=(player.elementDamageBonus||0)+.60;}
    },
    {
      "id": "treasure_sense_common_v25",
      "rarity": "common",
      "icon": "💰",
      "name": "Treasure Sense+",
      "desc": "Enemies and chests grant 40% more gold this run.",
      apply(){player.goldBonus+=.40;}
    },
    {
      "id": "treasure_sense_uncommon_v25",
      "rarity": "uncommon",
      "icon": "💰✨",
      "name": "Treasure Sense++",
      "desc": "Enemies and chests grant 60% more gold this run.",
      apply(){player.goldBonus+=.60;}
    },
    {
      "id": "venom_edge_rare_v25",
      "rarity": "epic",
      "icon": "🐍☠️",
      "name": "Venom Edge: Black Fang",
      "desc": "Gain +45% Poison Chance and +45% Poison damage.",
      "apply": function(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.45;player.poisonStackPower=(player.poisonStackPower||.12)+.45;}
    },
    {
      "id": "scholar_common_v26",
      "rarity": "common",
      "icon": "📘",
      "name": "Scholar's Sigil+",
      "desc": "Gain +20% enemy XP this run.",
      apply(){player.xpBonus+=.20;}
    },
    {
      "id": "scholar_uncommon_v26",
      "rarity": "uncommon",
      "icon": "📚",
      "name": "Scholar's Sigil++",
      "desc": "Gain +35% enemy XP this run.",
      apply(){player.xpBonus+=.35;}
    },
    {
      "id": "thorns_common_v26",
      "rarity": "common",
      "icon": "🦔",
      "name": "Barbed Armor",
      "desc": "Enemies take 7 damage whenever they hit you.",
      apply(){player.thorns+=7;}
    },
    {
      "id": "legendary_crimson_aegis_v27",
      "rarity": "legendary",
      "unique": true,
      "icon": "🩸🔵",
      "name": "Crimson Aegis",
      "desc": "Gain +30% Lifesteal. Overhealing converts 1% of the excess into Energy Shield.",
      apply(){player.lifeSteal+=.30;player.legendaryOverhealShieldRate=Math.max(player.legendaryOverhealShieldRate||0,.01);}
    },
    {
      "id": "legendary_star_eater_v27",
      "rarity": "legendary",
      "icon": "🌠🗡️",
      "name": "Star-Eater's Rhythm",
      "desc": "Gain +35% Crit, +60% Echo Strike and +20% Boss Damage.",
      apply(){player.crit+=.35;player.doubleStrike+=.60;player.bossDamage+=.20;}
    ,
      "achievementGate": "achievement:prestige20"
    },
    {
      "id": "legendary_adamant_v27",
      "rarity": "legendary",
      "icon": "🛡️🌟",
      "name": "Adamant Testament",
      "desc": "Gain +10 Defense, +35 max HP and +2 flat damage reduction.",
      apply(){player.defense+=10;player.maxHp+=35;player.hp+=35;player.flatReduction+=2;}
    },
    {
      "id": "legendary_venom_throne_v27",
      "rarity": "legendary",
      "icon": "☠️👑",
      "name": "Throne of Venom",
      "desc": "Gain +50% Poison Chance and +10% Lifesteal. Poison-tagged classes gain +40% Poison damage; all other classes gain +20%.",
      "apply": function(){const poisonClass=(CLASSES[player.classId]?.tags||[]).includes('poison');player.poisonOnHitChance=(player.poisonOnHitChance||0)+.50;player.poisonStackPower=(player.poisonStackPower||.12)+(poisonClass?.40:.20);player.lifeSteal+=.10;}
    ,
      "achievementGate": "achievement:nature-master"
    },
    {
      "id": "legendary_kings_ransom_v27",
      "rarity": "legendary",
      "icon": "👑🪙",
      "name": "King's Ransom",
      "desc": "Gain +150% gold, +25 Luck and +30% Boss Damage.",
      apply(){player.goldBonus+=1.50;player.luck+=.25;player.bossDamage+=.30;}
    ,
      "achievementGate": "achievement:gold4000"
    },
    {
      "id": "legendary_prismatic_choir_v27",
      "rarity": "legendary",
      "icon": "🌈🎼",
      "name": "Prismatic Choir",
      "desc": "Gain +30% elemental proc chance, +75% elemental power and +10 Ultimate whenever you exploit a weakness.",
      apply(){player.elementProcBonus+=.30;player.elementDamageBonus+=.75;player.elementUltimateGain=(player.elementUltimateGain||0)+10;}
    ,
      "achievementGate": "achievement:mythic5"
    },
    {
      "id": "legendary_wanderer_v27",
      "rarity": "legendary",
      "icon": "🥾🌟",
      "name": "Legend of the Endless Mile",
      "desc": "Gain +25 Luck, +20% Dodge, +30% Boss Damage and +30 starting Ultimate.",
      apply(){player.luck+=.25;player.dodge+=.20;player.bossDamage+=.30;player.ultimateCharge=clamp(player.ultimateCharge+30,0,100);}
    }

    ,{
      "id": "poor_lucky_pebble_v514",
      "rarity": "poor",
      "icon": "🪨✨",
      "name": "Lucky Pebble",
      "desc": "Gain +5 Luck this run.",
      apply(){player.luck+=.05;},
      "tags": ["wealth","tempo"],
      "v24Tiered": true
    },
    {
      "id": "poor_cracked_scope_v514",
      "rarity": "poor",
      "icon": "🔭",
      "name": "Cracked Scope",
      "desc": "Gain +4% Crit this run.",
      apply(){player.crit+=.04;},
      "tags": ["damage","tempo"],
      "v24Tiered": true
    },
    {
      "id": "poor_faint_echo_v514",
      "rarity": "poor",
      "icon": "〰️",
      "name": "Faint Echo",
      "desc": "Gain +6% Echo Strike this run.",
      apply(){player.doubleStrike+=.06;},
      "tags": ["tempo","damage"],
      "v24Tiered": true
    },
    {
      "id": "poor_weak_tonic_v514",
      "rarity": "poor",
      "icon": "🧴",
      "name": "Weak Tonic",
      "desc": "Potions heal 15% more.",
      apply(){player.potionPower+=.15;},
      "tags": ["sustain","potions"],
      "v24Tiered": true
    },
    {
      "id": "poor_monster_notes_v514",
      "rarity": "poor",
      "icon": "📓",
      "name": "Monster Notes",
      "desc": "Gain +8% Boss Damage this run.",
      apply(){player.bossDamage+=.08;},
      "tags": ["guardian","damage"],
      "v24Tiered": true
    },
    {
      "id": "poor_folded_map_v514",
      "rarity": "poor",
      "icon": "🗺️",
      "name": "Folded Road Map",
      "desc": "Gain +6% chance to move one extra tile after rolling.",
      apply(){player.extraStepChance+=.06;},
      "tags": ["tempo","travel"],
      "v24Tiered": true
    },
    {
      "id": "poor_cheap_venom_v514",
      "rarity": "poor",
      "icon": "🧪☠️",
      "name": "Cheap Venom",
      "desc": "Gain +4% Poison Chance.",
      apply(){player.poisonOnHitChance=(player.poisonOnHitChance||0)+.04;},
      "tags": ["poison","damage"],
      "v24Tiered": true
    },
    {
      "id": "uncommon_field_surgeon_v514",
      "rarity": "uncommon",
      "icon": "🩹🧪",
      "name": "Field Surgeon",
      "desc": "Potions heal 45% more and gain 1 potion immediately.",
      apply(){player.potionPower+=.45;player.potions+=1;},
      "tags": ["sustain","potions"],
      "v24Tiered": true
    },
    {
      "id": "uncommon_boss_badge_v514",
      "rarity": "uncommon",
      "icon": "🎖️🐉",
      "name": "Boss Hunter's Badge",
      "desc": "Gain +18% Boss Damage and +6% Crit.",
      apply(){player.bossDamage+=.18;player.crit+=.06;},
      "tags": ["guardian","damage"],
      "v24Tiered": true
    },
    {
      "id": "uncommon_elemental_relay_v514",
      "rarity": "uncommon",
      "icon": "🔗🌈",
      "name": "Elemental Relay",
      "desc": "Gain +7% elemental activation and +15% Element Power.",
      apply(){player.elementProcBonus+=.07;player.elementDamageBonus+=.15;},
      "tags": ["elemental","damage"],
      "v24Tiered": true
    },
    {
      "id": "uncommon_leeching_fang_v514",
      "rarity": "uncommon",
      "icon": "🦷🩸",
      "name": "Leeching Fang",
      "desc": "Gain +12% Lifesteal and +1 Attack.",
      apply(){player.lifeSteal+=.12;player.attack+=1;},
      "tags": ["sustain","damage"],
      "v24Tiered": true
    },
    {
      "id": "uncommon_fortune_broker_v514",
      "rarity": "uncommon",
      "icon": "📈🪙",
      "name": "Fortune Broker",
      "desc": "Gain +30% gold, +8 Luck and 5% shop discount.",
      apply(){player.goldBonus+=.30;player.luck+=.08;player.shopDiscount+=.05;},
      "tags": ["wealth","tempo"],
      "v24Tiered": true
    }
  ];
    return registry;
  }

  function describe(powerup, runtimeServices) {
    const services = requireServices(runtimeServices);
    if (!powerup) return "";
    if (powerup.id === "perfected_signature") return String(services.signatures.describeCurrent() || "");
    return String(powerup.desc || "");
  }

  window.DiceboundPowerupRegistry = Object.freeze({
    apiVersion: 1,
    createRegistry,
    describe,
  });
})();
