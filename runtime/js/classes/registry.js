(() => {
  "use strict";

  const CLASS_DATA={
    "ranger": {
      "id": "ranger",
      "name": "Ranger",
      "icon": "🏹",
      "attackIcon": "🏹",
      "fxIcon": "➶➶➶",
      "unlock": "Always unlocked",
      "desc": "The starting hero: a precise hunter with high Crit Chance, natural evasion and a devastating four-arrow ultimate.",
      "stats": "37 HP · 6 ATK · 15% CRIT CHANCE · 8% DODGE",
      "ultimate": {
        "name": "Arrow Storm",
        "icon": "🌧️",
        "desc": "Four rapid arrows dealing roughly 340% total damage to the entire pack."
      },
      "base": {
        "maxHp": 37,
        "attack": 6,
        "defense": 1,
        "crit": 0.15,
        "dodge": 0.08,
        "luck": 0,
        "doubleStrike": 0,
        "guardPower": 0.52,
        "classBurst": 0,
        "lifeSteal": 0
      },
      "scaleNotes": "Attack is the core stat; Crit Chance is unusually valuable because Ranger starts high and Arrow Storm scales directly from Attack. Echo adds more independent arrows between ultimates, while Dodge keeps the glassier hunter alive.",
      "tags": [
        "ranged",
        "precision",
        "evasive"
      ],
      "passive": {
        "name": "Marked Quarry",
        "desc": "Basic attacks mark their target up to 3 times. Each mark adds Crit against that target; Arrow Storm consumes all marks for extra damage."
      }
    },
    "sorcerer": {
      "id": "sorcerer",
      "name": "Sorcerer",
      "icon": "🔮",
      "attackIcon": "✨",
      "fxIcon": "✦",
      "unlock": "Defeat the Board 1 miniboss",
      "desc": "An occult spellcaster with a real Mana cycle. Channel Bolt builds Mana; Arcane Lance spends it on a Crit-capable spell that converts half of Echo chance into bonus damage, applies Echo-weighted Poison, Lifesteal, and guarantees a random core-element eruption. Sorcerer's Signature Burst is Arcane Surge: when it procs, that basic or Echo strike deals 50% more damage.",
      "stats": "31 HP · 7 ATK · 25/100 MANA · 5 LUCK",
      "ultimate": {
        "name": "Starfall",
        "icon": "☄️",
        "desc": "A 300% meteor that strikes the entire pack, restores 20% of damage dealt as HP, and restores 33% of maximum Mana."
      },
      "base": {
        "maxHp": 31,
        "attack": 7,
        "defense": 0,
        "crit": 0.09,
        "dodge": 0,
        "luck": 0.05,
        "doubleStrike": 0.05,
        "guardPower": 0.5,
        "classBurst": 0.2,
        "lifeSteal": 0
      },
      "scaleNotes": "Attack powers both Channel Bolt and Arcane Lance. Arcane Lance can Crit, converts half of Echo chance into bonus spell damage, applies Poison at Echo × Poison chance, and Lifesteals from the spell plus its forced elemental eruption. Prismatic Echo can repeat that eruption. Mana generation determines spell frequency; Crit, Echo, Poison and elemental power all improve the payoff.",
      "tags": [
        "ranged",
        "occult",
        "elemental",
        "mana"
      ],
      "passive": {
        "name": "Arcane Reservoir",
        "desc": "Uses Mana. Channel Bolt builds it; Arcane Lance spends it, can Crit, converts half of Echo chance into bonus damage, applies Echo-weighted Poison and Lifesteals from its forced elemental eruption."
      }
    },
    "fighter": {
      "id": "fighter",
      "name": "Fighter",
      "icon": "🛡️",
      "attackIcon": "⚔️",
      "fxIcon": "⚔️",
      "unlock": "Defeat the Board 1 dragon",
      "desc": "A durable front-line warrior. Guarding is exceptional and Titan Cleave strikes two enemies while granting a barrier.",
      "stats": "44 HP · 5 ATK · 2 DEF",
      "ultimate": {
        "name": "Titan Cleave",
        "icon": "💥",
        "desc": "A 260% cleave that hits up to two enemies and grants a Battle Barrier."
      },
      "base": {
        "maxHp": 44,
        "attack": 5,
        "defense": 2,
        "crit": 0.05,
        "dodge": 0,
        "luck": 0,
        "doubleStrike": 0,
        "guardPower": 0.67,
        "classBurst": 0,
        "lifeSteal": 0
      },
      "scaleNotes": "Defense is both survival and, with several Fighter powers, offense. Attack still raises baseline damage, but Guard/barrier uptime and Defense scaling are the class's defining growth path.",
      "tags": [
        "melee",
        "armored",
        "guardian"
      ],
      "passive": {
        "name": "Counterstance",
        "desc": "Guarding primes the Fighter's next basic attack for a heavy counterblow."
      }
    },
    "monk": {
      "id": "monk",
      "name": "Monk",
      "icon": "🥋",
      "attackIcon": "🥊",
      "fxIcon": "👊👊",
      "unlock": "Defeat the Board 2 miniboss",
      "desc": "A rapid martial artist who mixes Echo Strikes, evasion and self-healing into relentless pressure.",
      "stats": "39 HP · 7 ATK · 6% DODGE · 8% ECHO",
      "ultimate": {
        "name": "Hundred Fists",
        "icon": "👊",
        "desc": "A storm of blows dealing 325% damage and restoring 10% max HP."
      },
      "base": {
        "maxHp": 39,
        "attack": 7,
        "defense": 1,
        "crit": 0.08,
        "dodge": 0.06,
        "luck": 0,
        "doubleStrike": 0.08,
        "guardPower": 0.58,
        "classBurst": 0.14,
        "lifeSteal": 0
      },
      "scaleNotes": "Attack, Echo Strike and Dodge work together: every real base hit and Echo Strike advances Flowing Combo after the action, so Echo directly accelerates the class engine. Hundred Fists scales mostly from Attack.",
      "tags": [
        "melee",
        "combo",
        "disciplined"
      ],
      "passive": {
        "name": "Flowing Combo",
        "desc": "Every real basic hit and Echo Strike advances Combo after the action, increasing damage, Echo chance and Dodge. Guarding or drinking a potion resets it."
      }
    },
    "clown": {
      "id": "clown",
      "name": "Clown",
      "icon": "🤡",
      "attackIcon": "🐔",
      "fxIcon": "🐔",
      "unlock": "Defeat the Board 2 dragon",
      "desc": "A chaotic trickster powered by Luck, Crit Chance and weapons that should not legally count as weapons.",
      "stats": "34 HP · 6 ATK · 12% CRIT CHANCE · 8 LUCK",
      "ultimate": {
        "name": "Final Punchline",
        "icon": "🎪",
        "desc": "A wildly variable area catastrophe that always grants a bonus effect."
      },
      "base": {
        "maxHp": 34,
        "attack": 6,
        "defense": 1,
        "crit": 0.12,
        "dodge": 0.05,
        "luck": 0.08,
        "doubleStrike": 0.05,
        "guardPower": 0.5,
        "classBurst": 0.18,
        "lifeSteal": 0
      },
      "scaleNotes": "Luck, Crit Chance and Echo are the main chaos multipliers. Clown has high variance rather than one clean stat curve; more Luck also improves the road rewards that feed the build.",
      "tags": [
        "weird",
        "chaotic",
        "burst"
      ],
      "passive": {
        "name": "Opening Gag",
        "desc": "Every battle begins with a random comedy gimmick: shoes, pies, barriers, applause or chickens."
      }
    },
    "rouge": {
      "id": "rouge",
      "name": "Rouge",
      "icon": "🟥",
      "attackIcon": "🖌️",
      "fxIcon": "🩸",
      "unlock": "Reach 10 Prestige points",
      "desc": "Rouge—the colour, not the thief—is a crimson battle artist whose occult brushwork builds Mana for Scarlet Hex.",
      "stats": "36 HP · 7 ATK · 25/100 MANA · 12% CRIT CHANCE",
      "ultimate": {
        "name": "Crimson Deluge",
        "icon": "🌹",
        "desc": "A 310% scarlet strike with powerful innate lifesteal."
      },
      "base": {
        "maxHp": 36,
        "attack": 7,
        "defense": 1,
        "crit": 0.12,
        "dodge": 0.04,
        "luck": 0.05,
        "doubleStrike": 0.04,
        "guardPower": 0.54,
        "classBurst": 0.18,
        "lifeSteal": 0.05
      },
      "scaleNotes": "Rouge—the colour—likes Attack, Crit Chance, Echo, Poison and Lifesteal. Scarlet Hex converts half of Echo chance into spell damage, applies Poison at Echo × Poison chance, and real Rouge drains doubled Lifesteal from its full primary-plus-splash damage package.",
      "tags": [
        "weird",
        "artful",
        "occult",
        "mana"
      ],
      "passive": {
        "name": "Painted Hexcraft",
        "desc": "Uses Mana. Crimson Stroke builds it; Scarlet Hex spends it on high-Crit battle-art magic that converts half of Echo chance into bonus damage, applies Echo-weighted Poison and drains doubled Lifesteal from the full Hex."
      }
    },
    "berserker": {
      "id": "berserker",
      "name": "Berserker",
      "icon": "🪓",
      "attackIcon": "🪓",
      "fxIcon": "💢🪓",
      "unlock": "Take 1,000 total damage",
      "desc": "A battle-scarred engine of rage. Missing HP becomes Rage: every 1% missing HP increases damage by 1%, and Ragequake pulverizes every enemy.",
      "stats": "51 HP · 8 ATK · 5% CRIT CHANCE · RAGE",
      "ultimate": {
        "name": "Ragequake",
        "icon": "🌋",
        "desc": "An area smash dealing 280% damage. Your current Rage multiplies it like all other Berserker damage."
      },
      "base": {
        "maxHp": 51,
        "attack": 8,
        "defense": 1,
        "crit": 0.05,
        "dodge": 0,
        "luck": 0,
        "doubleStrike": 0.03,
        "guardPower": 0.56,
        "classBurst": 0.22,
        "lifeSteal": 0.03
      },
      "scaleNotes": "Every 1% missing HP becomes 1% Rage damage. Attack raises the base being multiplied; Max HP widens the dangerous Rage window; Lifesteal helps you hover there without dying.",
      "tags": [
        "melee",
        "vampiric",
        "reckless"
      ],
      "passive": {
        "name": "Blood Rage",
        "desc": "Every 1% missing HP grants +1% damage as Rage. The bar fills as your HP falls."
      }
    },
    "turtle": {
      "id": "turtle",
      "name": "Turtle",
      "icon": "🐢",
      "attackIcon": "🛡️",
      "fxIcon": "🐚",
      "unlock": "Reach more than 40 Defense during a run",
      "desc": "A living fortress with enormous defense. Its shell turns patience into crushing counterpressure.",
      "stats": "55 HP · 4 ATK · 6 DEF",
      "ultimate": {
        "name": "Shellquake",
        "icon": "🐚",
        "desc": "An area shell slam dealing 240% damage and granting two barriers."
      },
      "base": {
        "maxHp": 55,
        "attack": 4,
        "defense": 6,
        "crit": 0.03,
        "dodge": 0,
        "luck": 0,
        "doubleStrike": 0,
        "guardPower": 0.78,
        "classBurst": 0,
        "lifeSteal": 0
      },
      "scaleNotes": "Defense is the premium stat: it drastically improves survival and can be converted into damage. Turtle scales slowly with raw Attack but explosively once Defense-based powers stack.",
      "tags": [
        "armored",
        "slow",
        "guardian"
      ],
      "passive": {
        "name": "Shell Discipline",
        "desc": "Guarding primes a crushing shell counter on the next basic attack. Starts with an extra Barrier and +1 Defense."
      }
    },
    "frog": {
      "id": "frog",
      "name": "Frog",
      "icon": "🐸",
      "attackIcon": "👅",
      "fxIcon": "🐸↯",
      "unlock": "Reach 150% Echo Strike during a run",
      "desc": "An impossible amphibian built around chained Echo Strikes and increasingly aggressive croaking.",
      "stats": "38 HP · 6 ATK · 30% ECHO · 8% DODGE",
      "ultimate": {
        "name": "Croak Cascade",
        "icon": "🌊",
        "desc": "Six jumping strikes that independently target living enemies."
      },
      "base": {
        "maxHp": 38,
        "attack": 6,
        "defense": 1,
        "crit": 0.08,
        "dodge": 0.08,
        "luck": 0.03,
        "doubleStrike": 0.3,
        "guardPower": 0.54,
        "classBurst": 0.16,
        "lifeSteal": 0
      },
      "scaleNotes": "Echo Strike is the primary engine. Values above 100% create guaranteed extra hits, and Croak Cascade converts high Echo into more jumps. Attack still determines how hard each jump lands.",
      "tags": [
        "weird",
        "dodgy",
        "echo",
        "poison"
      ],
      "passive": {
        "name": "Predatory Bounce",
        "desc": "Echo-heavy attacks become especially vicious against enemies below half HP."
      }
    },
    "d20": {
      "id": "d20",
      "secret": true,
      "name": "The Twenty-Sider",
      "icon": "🎲",
      "attackIcon": "🎲",
      "fxIcon": "20?",
      "unlock": "Raise DiBo to level 30",
      "desc": "A hidden avatar of probability. Combat actions visibly roll a d20, pause on the result, and can erupt into absurd outcomes.",
      "stats": "40 HP · 6 ATK · CHAOS D20",
      "ultimate": {
        "name": "Natural Twenty",
        "icon": "🌠",
        "desc": "Roll the action d20, then release a wildly scaling reality burst."
      },
      "base": {
        "maxHp": 40,
        "attack": 6,
        "defense": 1,
        "crit": 0.1,
        "dodge": 0.05,
        "luck": 0.1,
        "doubleStrike": 0.1,
        "guardPower": 0.55,
        "classBurst": 0,
        "lifeSteal": 0
      },
      "scaleNotes": "Probability is the mechanic. Attack supplies the floor, while Crit, Echo and Luck make high D20 outcomes increasingly absurd. Exact high-roll interactions remain intentionally undocumented.",
      "tags": [
        "weird",
        "chaotic",
        "lucky"
      ],
      "passive": {
        "name": "Probability Leak",
        "desc": "Nearly every combat action rolls a visible d20. The class intentionally pauses so you can witness fate making mistakes."
      }
    },
    "slime": {
      "id": "slime",
      "name": "Slime",
      "icon": "🟢",
      "attackIcon": "💧",
      "fxIcon": "SPLAT",
      "unlock": "Unlock 10 classes in total",
      "desc": "No true class identity and no exclusive specialty: the Slime survives by borrowing non-Ultimate strengths from many other non-secret classes.",
      "stats": "39 HP · 6 ATK · 1 DEF",
      "ultimate": {
        "name": "Ooze Everything",
        "icon": "🫠",
        "desc": "A 270% wave of slime that strikes the entire enemy pack."
      },
      "base": {
        "maxHp": 39,
        "attack": 6,
        "defense": 1,
        "crit": 0.07,
        "dodge": 0.04,
        "luck": 0.04,
        "doubleStrike": 0.04,
        "guardPower": 0.54,
        "classBurst": 0,
        "lifeSteal": 0
      },
      "scaleNotes": "Slime has no exclusive scaling rule; its strength is access to the broad shared/class power pool. It can become whatever the run offers—Attack bruiser, Echo machine, elemental build or sustain blob.",
      "tags": [
        "weird",
        "sticky",
        "durable",
        "poison"
      ],
      "passive": {
        "name": "Borrowed Shapes",
        "desc": "Has no privileged mechanic of its own. Instead it can learn many non-Ultimate class powers from other non-secret classes."
      }
    },
    "vampire": {
      "id": "vampire",
      "name": "Vampire",
      "icon": "🧛",
      "attackIcon": "🦇",
      "fxIcon": "🩸🦇",
      "unlock": "Exceed 100% Lifesteal and defeat the Board 3 final boss",
      "desc": "A lifestealing occult duelist. Night Siphon builds Mana; Grave Lance spends it on a Crit-capable strike that scales from Lifesteal and Echo, rolls normal elements and Poison, then drinks the damage back at doubled Lifesteal.",
      "stats": "41 HP · 7 ATK · 25/100 MANA · 28% LIFESTEAL",
      "ultimate": {
        "name": "Crimson Eclipse",
        "icon": "🌑",
        "desc": "Drain the entire pack with damage that scales from Lifesteal and Echo; healing also scales from current Lifesteal."
      },
      "base": {
        "maxHp": 41,
        "attack": 7,
        "defense": 1,
        "crit": 0.09,
        "dodge": 0.03,
        "luck": 0.02,
        "doubleStrike": 0.04,
        "guardPower": 0.56,
        "classBurst": 0.16,
        "lifeSteal": 0.18
      },
      "scaleNotes": "Lifesteal is now both offense and sustain: Grave Lance gains damage from current Lifesteal, converts 80% of Echo chance into bonus damage, uses 120% of normal Poison chance, can Crit and rolls normal elements. Crimson Eclipse also converts Lifesteal and Echo into pack damage, while its drain rises with current Lifesteal.",
      "tags": [
        "vampiric",
        "occult",
        "sustain",
        "mana"
      ],
      "passive": {
        "name": "Night Hunger",
        "desc": "Uses Mana for occult attacks while retaining extreme Lifesteal. Grave Lance scales from Lifesteal and Echo, can Crit, rolls normal elements and Poison, and drains doubled Lifesteal."
      }
    },
    "ninja": {
      "id": "ninja",
      "name": "Ninja",
      "icon": "🥷",
      "attackIcon": "🗡️",
      "fxIcon": "✦🗡️",
      "unlock": "Reach more than 100% Critical chance during a run",
      "desc": "A precision assassin built around overflow critical tiers, smoke and rapid single-target execution.",
      "stats": "33 HP · 8 ATK · 28% CRIT CHANCE · 12% DODGE",
      "ultimate": {
        "name": "Thousand Shadows",
        "icon": "🌘",
        "desc": "Five independently critical strikes against the selected enemy, spilling to new targets on defeat."
      },
      "base": {
        "maxHp": 33,
        "attack": 8,
        "defense": 0,
        "crit": 0.28,
        "dodge": 0.12,
        "luck": 0.03,
        "doubleStrike": 0.12,
        "guardPower": 0.5,
        "classBurst": 0.22,
        "lifeSteal": 0
      },
      "scaleNotes": "Crit is king: overflow above 100% creates additional guaranteed critical tiers. Attack multiplies those tiers, while Echo supplies more chances to exploit them. Dodge compensates for very low base durability.",
      "tags": [
        "melee",
        "dodgy",
        "precision",
        "poison"
      ],
      "passive": {
        "name": "Smoke Counter",
        "desc": "Critical hits build Smoke. At 3 Smoke, the next basic attack becomes a defense-piercing execution strike."
      }
    },
    "ceo": {
      "id": "ceo",
      "secret": true,
      "name": "CEO",
      "icon": "👔",
      "attackIcon": "📈",
      "fxIcon": "📊💥",
      "unlock": "Secret: reach 300% Boss Damage",
      "desc": "The hidden executive class converts extreme guardian specialization into hostile quarterly growth.",
      "stats": "46 HP · 9 ATK · 35% BOSS DAMAGE",
      "ultimate": {
        "name": "Quarterly Annihilation",
        "icon": "📉",
        "desc": "A boardroom-wide attack scaling with Boss Damage and current gold."
      },
      "base": {
        "maxHp": 46,
        "attack": 9,
        "defense": 2,
        "crit": 0.12,
        "dodge": 0.02,
        "luck": 0.1,
        "doubleStrike": 0.05,
        "guardPower": 0.6,
        "classBurst": 0.2,
        "lifeSteal": 0.05,
        "bossDamage": 0.35
      },
      "scaleNotes": "Boss Damage is both an unlock identity and a major multiplier. Gold can become direct combat value through executive powers, so economic growth and guardian specialization feed each other.",
      "tags": [
        "weird",
        "wealth",
        "ranged"
      ],
      "passive": {
        "name": "Executive Compensation",
        "desc": "All gold gained is increased by +200%. Secret classes are allowed to be financially irresponsible."
      }
    },
    "merchant": {
      "id": "merchant",
      "secret": true,
      "name": "Merchant",
      "icon": "🧔",
      "attackIcon": "💰",
      "fxIcon": "🪙⚖️",
      "unlock": "Defeat the Road Merchant secret boss once",
      "desc": "A secret trader using gold, resale margins and actual occult accounting. It builds Mana with Ledger Tap and spends it on Foreclosure Hex.",
      "stats": "52 HP · 10 ATK · 25/100 MANA · 20 LUCK · GOLD SCALING",
      "ultimate": {
        "name": "Market Monopoly",
        "icon": "🏦",
        "desc": "Deals massive pack damage, grants gold and raises two barriers."
      },
      "base": {
        "maxHp": 52,
        "attack": 10,
        "defense": 3,
        "crit": 0.15,
        "dodge": 0.05,
        "luck": 0.2,
        "doubleStrike": 0.1,
        "guardPower": 0.66,
        "classBurst": 0.22,
        "lifeSteal": 0.08
      },
      "scaleNotes": "Gold is a combat stat. Foreclosure Hex adds 5% of current gold with no cap, then multiplies that damage by current Crit Chance and Echo instead of rolling Crit. It also keeps normal Poison and elemental proc chances, so wealth builds still benefit from combat stats.",
      "tags": [
        "wealth",
        "occult",
        "weird",
        "mana"
      ],
      "passive": {
        "name": "Occult Accounting",
        "desc": "Selling unused gear pays 200% normal value. Ledger Tap builds Mana; Foreclosure Hex spends it, adds uncapped gold scaling, multiplies with Crit/Echo, and keeps normal Poison/element procs."
      }
    },
    "cleric": {
      "id": "cleric",
      "name": "Cleric",
      "icon": "⛪",
      "attackIcon": "✨",
      "fxIcon": "✝️✨",
      "unlock": "Heal 1,000 HP across all runs",
      "desc": "A holy sustain specialist. Blessed attacks can restore HP, Light effects are especially valuable, and Divine Reckoning heals while damaging the whole pack.",
      "stats": "46 HP · 5 ATK · 2 DEF · HOLY SUSTAIN",
      "scaleNotes": "Attack scales modestly; healing scales mainly from max HP and repeated actions. Defense and sustain make long guardian fights increasingly favorable.",
      "ultimate": {
        "name": "Divine Reckoning",
        "icon": "☀️",
        "desc": "Holy area damage plus a large self-heal. Overhealing can interact with effects that explicitly allow it."
      },
      "base": {
        "maxHp": 46,
        "attack": 5,
        "defense": 2,
        "crit": 0.06,
        "dodge": 0.02,
        "luck": 0.03,
        "doubleStrike": 0.03,
        "guardPower": 0.64,
        "classBurst": 0.24,
        "lifeSteal": 0
      },
      "tags": [
        "holy",
        "sustain",
        "guardian"
      ],
      "passive": {
        "name": "Faith",
        "desc": "Healing builds Faith. At full Faith, the Cleric can cast a free Consecration during combat."
      }
    },
    "paladin": {
      "id": "paladin",
      "name": "Paladin",
      "icon": "🛡️✨",
      "attackIcon": "⚔️",
      "fxIcon": "⚔️✨",
      "unlock": "Defeat Board 3 with both Fighter and Cleric",
      "desc": "A holy guardian hybrid. Healing stores Oath Grace; Guard consumes that Grace for stronger mitigation and barriers, while Defense still contributes to offense.",
      "stats": "60 HP · 7 ATK · 5 DEF · DEFENSE/HEALING SCALING",
      "scaleNotes": "Healing and max HP build Oath Grace; Defense makes each empowered Guard more valuable. The class blends Cleric sustain with Fighter-style defensive tempo.",
      "ultimate": {
        "name": "Aegis Judgment",
        "icon": "⚜️",
        "desc": "Heavy holy area damage scaling with Attack and Defense, heals the Paladin and feeds Oath Grace, then raises barriers."
      },
      "base": {
        "maxHp": 60,
        "attack": 7,
        "defense": 5,
        "crit": 0.06,
        "dodge": 0.01,
        "luck": 0.02,
        "doubleStrike": 0.02,
        "guardPower": 0.78,
        "classBurst": 0.2,
        "lifeSteal": 0.02
      },
      "tags": [
        "holy",
        "armored",
        "guardian"
      ],
      "passive": {
        "name": "Oathplate",
        "desc": "Defense contributes 35% of its value to ordinary attack damage. The class remains deliberately stable and dependable."
      }
    },
    "beastmaster": {
      "id": "beastmaster",
      "name": "Beastmaster",
      "icon": "🐾",
      "attackIcon": "🦴",
      "fxIcon": "🐺➶",
      "unlock": "Unlock every companion",
      "desc": "A late-unlock companion commander. Its own attacks are reliable, while pet Bond, pet damage and double-pet attacks become a genuinely dangerous second damage engine.",
      "stats": "48 HP · 7 ATK · 1 DEF · STRONG PET SCALING",
      "scaleNotes": "Gains more from companion level and pet bonuses than most classes. Pack Call converts current pet damage directly into burst damage.",
      "ultimate": {
        "name": "Call of the Pack",
        "icon": "🐺",
        "desc": "Calls a spectral pack for area damage based on Attack plus several times your active companion's damage."
      },
      "base": {
        "maxHp": 48,
        "attack": 7,
        "defense": 1,
        "crit": 0.1,
        "dodge": 0.06,
        "luck": 0.05,
        "doubleStrike": 0.06,
        "guardPower": 0.56,
        "classBurst": 0.2,
        "lifeSteal": 0
      },
      "tags": [
        "pet",
        "ranged",
        "pack"
      ],
      "passive": {
        "name": "Pack Orders",
        "desc": "Can switch its companion between Aggressive, Defensive and Support stances during battle."
      }
    },
    "rogue": {
      "id": "rogue",
      "name": "Rogue",
      "icon": "🗡️",
      "attackIcon": "🗡️",
      "fxIcon": "🗡️💨",
      "unlock": "Hold 5,000 gold at one time and defeat the Board 3 miniboss",
      "desc": "A fast opportunist built around Dodge, gold and one Steal attempt per battle. Stat Heist can upgrade successful Steals to borrow 10% of a target's ATK and DEF for that battle.",
      "stats": "34 HP · 8 ATK · 22% CRIT CHANCE · 14% DODGE",
      "scaleNotes": "Raw Attack and Crit scale its burst fastest. Gold is also tactical fuel: some Rogue powers and its ultimate turn a rich purse into momentum.",
      "ultimate": {
        "name": "Grand Larceny",
        "icon": "💎",
        "desc": "A brutal single-target strike that steals gold after the hit."
      },
      "base": {
        "maxHp": 34,
        "attack": 8,
        "defense": 0,
        "crit": 0.22,
        "dodge": 0.14,
        "luck": 0.08,
        "doubleStrike": 0.12,
        "guardPower": 0.5,
        "classBurst": 0.24,
        "lifeSteal": 0.03
      },
      "tags": [
        "melee",
        "dodgy",
        "wealth"
      ],
      "passive": {
        "name": "Sticky Fingers",
        "desc": "Can attempt to Steal once per battle for gold and occasionally a potion. Above 50 Luck, successful Steals can snatch a random powerup; Grand Larceny can also steal battle-only ATK/DEF. Starts with +25% gold gain and +5% Dodge."
      }
    },
    "bloodmage": {
      "id": "bloodmage",
      "secret": true,
      "name": "Bloodmage",
      "icon": "🩸",
      "attackIcon": "🩸",
      "fxIcon": "🩸💥",
      "unlock": "Secret: defeat the Bloodmage hidden inside a Bloodwell",
      "desc": "A forbidden occult caster that replaces Mana with HP. Bloodletting restores fuel, Exsanguinate spends life on a Crit-capable attack that converts half of Echo chance into damage and can proc Poison/elements, and Replenish heals both combatants.",
      "stats": "39 HP · 9 ATK · 1 DEF · LIFE-FUELLED",
      "scaleNotes": "Attack and max HP scale Exsanguinate's blood-fuel base; Crit multiplies it, half of Echo chance becomes deterministic bonus damage, and Poison uses (50% Echo) × Poison chance. Normal elemental procs still fire from the landing hit.",
      "ultimate": {
        "name": "Sanguine Cataclysm",
        "icon": "🩸☄️",
        "desc": "Deals heavy damage to every enemy, then restores a portion of the blood spilled."
      },
      "base": {
        "maxHp": 39,
        "attack": 9,
        "defense": 1,
        "crit": 0.12,
        "dodge": 0.04,
        "luck": 0.04,
        "doubleStrike": 0.06,
        "guardPower": 0.4,
        "classBurst": 0.22,
        "lifeSteal": 0.05
      },
      "tags": [
        "occult",
        "vampiric",
        "weird",
        "blood-fuel"
      ],
      "passive": {
        "name": "Blood Is Mana",
        "desc": "Uses HP where other occult classes use Mana. Bloodletting restores fuel; Exsanguinate spends life for Crit/Echo/Poison/element-scaled damage; Replenish heals both sides."
      }
    },
    "summoner": {
      "id": "summoner",
      "name": "Summoner",
      "icon": "📖",
      "attackIcon": "✨",
      "fxIcon": "🔹🐾",
      "unlock": "Raise any 3 companions to level 10",
      "desc": "A Mana-based pet caster. Spirit Bolt builds Mana; Conjure Familiar spends it to call temporary elemental spirits that join companion attacks. The companion circle converts 10% of Summoner Attack into pet damage before class powerups.",
      "stats": "36 HP · 6 ATK · 35/120 MANA · SUMMONS",
      "ultimate": {
        "name": "Grand Convergence",
        "icon": "🌌",
        "desc": "Calls a temporary full spirit circle and sends every summoned familiar crashing through the enemy pack."
      },
      "base": {
        "maxHp": 36,
        "attack": 6,
        "defense": 1,
        "crit": 0.08,
        "dodge": 0.05,
        "luck": 0.08,
        "doubleStrike": 0.05,
        "guardPower": 0.54,
        "classBurst": 0.18,
        "lifeSteal": 0
      },
      "tags": [
        "occult",
        "mana",
        "pet",
        "pack",
        "ranged"
      ],
      "passive": {
        "name": "Spirit Circle",
        "desc": "Uses Mana to conjure up to three temporary companion spirits each battle. The companion circle converts 10% of player Attack into pet damage, and Summoned spirits attack after the normal companion."
      }
    },
    "necromancer": {
      "id": "necromancer",
      "name": "Necromancer",
      "icon": "☠️",
      "attackIcon": "🦴",
      "fxIcon": "🟣☠️",
      "unlock": "Defeat 100 Liches across your career",
      "desc": "A Mana necromancer who raises real targetable Skeleton allies. Grave Coil builds Mana; Summon Skeleton spends it to build an expendable front line whose deaths erupt in Bone Shrapnel.",
      "stats": "34 HP · 6 ATK · 1 DEF · 30/110 MANA · 2 SUMMONS",
      "scaleNotes": "Attack, Defense and max HP feed Skeleton inheritance when each summon is created. Summons then own their own combat stats and effects rather than mirroring the Necromancer live.",
      "ultimate": {
        "name": "Army of the Dead",
        "icon": "💀⚔️",
        "desc": "After enough qualifying summons, every living summon attacks with overwhelming force and empty summon slots contribute spectral Skeleton strikes."
      },
      "base": {
        "maxHp": 34,
        "attack": 6,
        "defense": 1,
        "crit": 0.08,
        "dodge": 0.04,
        "luck": 0.05,
        "doubleStrike": 0.05,
        "guardPower": 0.5,
        "classBurst": 0,
        "lifeSteal": 0
      },
      "tags": ["occult","mana","pack","ranged"],
      "passive": {
        "name": "Bone Shrapnel",
        "desc": "Skeleton Warriors explode on true death, spraying enemies and the allied side with bone shards. Replacing a summon is not a death."
      }
    },
    "pokemontrainer": {
      "id": "pokemontrainer",
      "secret": true,
      "name": "Pokémon Trainer",
      "icon": "🧢",
      "attackIcon": "🔴",
      "fxIcon": "🐾✨",
      "unlock": "Secret: raise every companion to level 10 and clear Board 5 with Beastmaster on any difficulty",
      "desc": "A secret late-game companion master. Six Dicebound creatures are randomly drafted at the start of every run; switch between them freely and unleash the entire roster together.",
      "stats": "46 HP · 8 ATK · 2 DEF · SIX-CREATURE ROSTER",
      "ultimate": {
        "name": "Six-Pack Stampede",
        "icon": "🌈🐾",
        "desc": "Every creature in the six-member roster attacks the entire pack in rapid succession."
      },
      "base": {
        "maxHp": 46,
        "attack": 8,
        "defense": 2,
        "crit": 0.12,
        "dodge": 0.08,
        "luck": 0.1,
        "doubleStrike": 0.08,
        "guardPower": 0.6,
        "classBurst": 0.26,
        "lifeSteal": 0.04
      },
      "tags": [
        "pet",
        "pack",
        "weird",
        "strong",
        "lucky"
      ],
      "passive": {
        "name": "Six-Creature Draft",
        "desc": "At run start, six companions are randomly drafted into a roster. The active roster creature attacks much harder and may call an assist."
      }
    },
    "alchemist": {
      "id": "alchemist",
      "name": "Alchemist",
      "icon": "⚗️",
      "attackIcon": "🧪",
      "fxIcon": "🧪💥",
      "unlock": "Use 15 potions across all runs",
      "desc": "A potion engineer who brews replacements during combat and can drink potions for healing or throw them as volatile weapons. Volatile Flask deals 150% Potion Healing + 100% Attack, can Crit, and uses 250% of current Poison chance.",
      "stats": "39 HP · 6 ATK · 1 DEF · +50% POTION HEALING · +5%/LEVEL",
      "ultimate": {
        "name": "Grand Distillation",
        "icon": "⚗️✨",
        "desc": "Creates three potions, restores health and detonates an oversized restorative formula across the enemy pack."
      },
      "base": {
        "maxHp": 39,
        "attack": 6,
        "defense": 1,
        "crit": 0.08,
        "dodge": 0.04,
        "luck": 0.06,
        "doubleStrike": 0.04,
        "guardPower": 0.54,
        "classBurst": 0.14,
        "lifeSteal": 0
      },
      "tags": [
        "alchemy",
        "sustain",
        "ranged",
        "weird"
      ],
      "passive": {
        "name": "Combat Distillery",
        "desc": "Every third basic attack brews a potion. Volatile Flask converts 150% Potion Healing + 100% Attack into pack damage, can Crit and uses 250% Poison chance."
      }
    },
    "ouroboros": {
      "id": "ouroboros",
      "secret": true,
      "name": "Ouroboros",
      "icon": "🐍♾️",
      "attackIcon": "🐍",
      "fxIcon": "♾️🐍",
      "unlock": "Secret: reach 400% Echo Strike during a run",
      "desc": "A recursive serpent that refuses normal Attack scaling. Attack is fixed at 10; every point of Attack gained or lost becomes 10% Echo Strike instead. Its best powers turn absurd Echo into poison and elemental recursion.",
      "stats": "48 HP · 10 STATIC ATK · 120% ECHO · 8% CRIT CHANCE",
      "scaleNotes": "Attack cannot move from 10. Attack bonuses convert into Echo Strike at 10% per point; Echo, Poison and elemental effects are the real scaling engines.",
      "ultimate": {
        "name": "Infinite Return",
        "icon": "♾️☠️",
        "desc": "A chain of serpent strikes whose hit count scales with Echo Strike. Every hit adds Poison and can bounce through the pack."
      },
      "base": {
        "maxHp": 48,
        "attack": 10,
        "defense": 2,
        "crit": 0.08,
        "dodge": 0.06,
        "luck": 0.04,
        "doubleStrike": 1.2,
        "guardPower": 0.56,
        "classBurst": 0.14,
        "lifeSteal": 0.04
      },
      "tags": [
        "secret",
        "weird",
        "echo",
        "poison",
        "elemental",
        "dodgy"
      ]
    },
    "dragoon": {
      "id": "dragoon",
      "name": "Dragoon",
      "icon": "🐉",
      "attackIcon": "🗡️",
      "fxIcon": "🪂💥",
      "unlock": "Defeat the Board 4 miniboss once",
      "desc": "A lance fighter who uses Jump to become Airborne through one enemy response, then spends the following action on a powerful landing strike.",
      "stats": "56 HP · 11 ATK · 3 DEF · 10% CRIT CHANCE · JUMP",
      "scaleNotes": "Attack drives both ordinary strikes and the landing hit. Landing rolls normal Crit, Poison and elemental effects, while Aerial Discipline shortens Jump's six-turn cooldown.",
      "ultimate": {
        "name": "Dragon Dive",
        "icon": "🐉💥",
        "desc": "A direct, decisive aerial dive against the selected target that uses the normal Ultimate and elemental rules."
      },
      "base": {
        "maxHp": 56,
        "attack": 11,
        "defense": 3,
        "crit": 0.10,
        "dodge": 0.04,
        "luck": 0.04,
        "doubleStrike": 0.04,
        "guardPower": 0.60,
        "classBurst": 0.12,
        "lifeSteal": 0.02
      },
      "tags": [
        "melee",
        "precision",
        "evasive",
        "burst"
      ]
    },
    "invoker": {
      "id": "invoker",
      "name": "Invoker",
      "icon": "🔵🟢🔴",
      "attackIcon": "✨",
      "fxIcon": "🔵🟢🔴",
      "unlock": "Cast 100 Mana-spender spells across your career.",
      "desc": "A grand occultist with three offensive orb strikes: Quas uses 70% Echo and forms Blue, Wex uses 120% Echo and generates Mana/Green, and Exort uses 70% Echo and forms Red. Elemental Lance spends Mana for a Crit/Poison/element/Lifesteal-scaled Red attack, and Invoke combines the current three orbs into one of ten battle spells.",
      "stats": "32 HP · 6 ATK · 25/100 MANA · THREE ORBS",
      "ultimate": {"name":"Invoke","icon":"🔵🟢🔴","desc":"At 100 Ultimate, invoke the spell determined by your current three-orb formula."},
      "base": {"maxHp":32,"attack":6,"defense":0,"crit":0.08,"dodge":0.02,"luck":0.05,"doubleStrike":0.05,"guardPower":0.50,"classBurst":0,"lifeSteal":0},
      "tags": ["ranged","occult","mana","elemental","combo"]
    },
    "slimerouge": {
      "id": "slimerouge",
      "secret": true,
      "name": "Slime Rouge",
      "icon": "🔴",
      "attackIcon": "🩸",
      "fxIcon": "🔴💥",
      "unlock": "Secret: clear Board 6 after beginning the run with Random while Slime is already unlocked",
      "desc": "A late-game red randomizer. Every run it becomes one random unlocked class identity with that class's real mechanics, then independently rolls one random unlocked class ultimate. Compatible class powers are offered only when the run can actually use them.",
      "stats": "44 HP · 7 ATK · 1 DEF · RANDOM IDENTITY · RANDOM ULTIMATE",
      "scaleNotes": "Its base body stays generalist, but the selected identity activates real class resources and mechanics such as Marks, Smoke, Mana, Spirits or Combo. Its independently selected ultimate executes the donor class's actual ultimate implementation.",
      "ultimate": {
        "name": "Stolen Finale",
        "icon": "🎭",
        "desc": "A random unlocked class ultimate is selected independently at the beginning of every run and executes with the donor class's real behavior."
      },
      "base": {
        "maxHp": 44,
        "attack": 7,
        "defense": 1,
        "crit": 0.1,
        "dodge": 0.06,
        "luck": 0.06,
        "doubleStrike": 0.1,
        "guardPower": 0.56,
        "classBurst": 0.1,
        "lifeSteal": 0.05
      },
      "tags": [
        "secret",
        "weird",
        "sticky",
        "poison",
        "flex"
      ]
    }
  };

  const CLASS_PASSIVE_DATA={
    "invoker": {"name":"Orb Invocation","desc":"Quas and Exort use 70% Echo chance; Wex uses 120%. They form Blue/Green/Red, Guard can still form Blue, and Elemental Lance forms Red. Three active orbs empower you and define Invoke."},
    "ranger": {
      "name": "Marked Quarry",
      "desc": "Basic attacks mark their target up to 3 times. Each mark adds Crit against that target; Arrow Storm consumes all marks for extra damage."
    },
    "sorcerer": {
      "name": "Arcane Reservoir",
      "desc": "Uses Mana. Channel Bolt builds it; Arcane Lance can Crit, converts half of Echo chance into bonus damage, applies Echo-weighted Poison and Lifesteals from its forced elemental eruption."
    },
    "fighter": {
      "name": "Counterstance",
      "desc": "Guarding primes the Fighter's next basic attack for a heavy counterblow."
    },
    "monk": {
      "name": "Flowing Combo",
      "desc": "Every real basic hit and Echo Strike advances Combo after the action, increasing damage, Echo chance and Dodge. Guarding or drinking a potion resets it."
    },
    "clown": {
      "name": "Opening Gag",
      "desc": "Every battle begins with a random comedy gimmick: shoes, pies, barriers, applause or chickens."
    },
    "rouge": {
      "name": "Painted Hexcraft",
      "desc": "Uses Mana. Crimson Stroke builds it; Scarlet Hex spends it on high-Crit magic with Echo damage, Echo-weighted Poison and doubled Lifesteal."
    },
    "berserker": {
      "name": "Blood Rage",
      "desc": "Every 1% missing HP grants +1% damage as Rage. The bar fills as your HP falls."
    },
    "turtle": {
      "name": "Shell Discipline",
      "desc": "Guarding primes a crushing shell counter on the next basic attack. Starts with an extra Barrier and +1 Defense."
    },
    "frog": {
      "name": "Predatory Bounce",
      "desc": "Echo-heavy attacks become especially vicious against enemies below half HP."
    },
    "d20": {
      "name": "Probability Leak",
      "desc": "Nearly every combat action rolls a visible d20. The class intentionally pauses so you can witness fate making mistakes."
    },
    "slime": {
      "name": "Borrowed Shapes",
      "desc": "Has no privileged mechanic of its own. Instead it can learn many non-Ultimate class powers from other non-secret classes."
    },
    "vampire": {
      "name": "Night Hunger",
      "desc": "Uses Mana for occult attacks while retaining extreme Lifesteal. Grave Lance scales from Lifesteal/Echo, rolls Crit/Poison/elements and drains doubled Lifesteal."
    },
    "ninja": {
      "name": "Smoke Counter",
      "desc": "Critical hits build Smoke. At 3 Smoke, the next basic attack becomes a defense-piercing execution strike."
    },
    "ceo": {
      "name": "Executive Compensation",
      "desc": "All gold gained is increased by +200%. Secret classes are allowed to be financially irresponsible."
    },
    "merchant": {
      "name": "Occult Accounting",
      "desc": "Selling unused gear pays 200% normal value. Foreclosure Hex adds uncapped gold scaling, deterministic Crit/Echo multipliers and normal Poison/element procs."
    },
    "cleric": {
      "name": "Faith",
      "desc": "Healing builds Faith. At full Faith, the Cleric can cast a free Consecration during combat."
    },
    "paladin": {
      "name": "Oathplate",
      "desc": "Defense contributes 35% of its value to ordinary attack damage. The class remains deliberately stable and dependable."
    },
    "beastmaster": {
      "name": "Pack Orders",
      "desc": "Can switch its companion between Aggressive, Defensive and Support stances during battle."
    },
    "rogue": {
      "name": "Sticky Fingers",
      "desc": "Can attempt to Steal once per battle for gold and occasionally a potion. High Luck can steal a powerup, and Stat Heist can steal battle-only ATK/DEF. Starts with +25% gold gain and +5% Dodge."
    },
    "bloodmage": {
      "name": "Blood Is Mana",
      "desc": "Uses HP where other occult classes use Mana. Exsanguinate spends life on Crit/Echo/Poison/element-scaled damage; Replenish heals both sides."
    },
    "summoner": {
      "name": "Spirit Circle",
      "desc": "Uses Mana to conjure up to three temporary companion spirits each battle. Summoner converts 10% of Attack into pet damage before upgrades."
    },
    "necromancer": {
      "name": "Bone Shrapnel",
      "desc": "Skeleton Warriors explode on true death for 20% of current Necromancer Attack to enemies and 10% to the hero and other living allied summons."
    },
    "pokemontrainer": {
      "name": "Six-Creature Draft",
      "desc": "At run start, six companions are randomly drafted into a roster. The active roster creature attacks much harder and may call an assist."
    },
    "alchemist": {
      "name": "Combat Distillery",
      "desc": "Every third basic attack brews a potion. Volatile Flask uses 150% Potion Healing + 100% Attack, can Crit and uses 250% Poison chance."
    },
    "dragoon": {
      "name": "Aerial Discipline",
      "desc": "Jump is a real Airborne state: ordinary attacks cannot hit through one enemy response, then the next player action lands exactly once for a heavy strike."
    }
  };

  const CLASS_TAG_VOCABULARY=["ranged","precision","evasive","occult","elemental","mana","melee","armored","guardian","combo","disciplined","weird","chaotic","burst","artful","vampiric","reckless","slow","dodgy","echo","poison","lucky","sticky","durable","sustain","wealth","holy","pet","pack","blood-fuel","strong","alchemy","secret","flex","airborne"];

  const CLASS_UNLOCK_DATA={
    invoker:{type:"manaSpenderCasts",minimum:100},
    ranger:{type:"always"},
    sorcerer:{type:"guardianDefeat",board:1,guardian:"miniboss"},
    fighter:{type:"guardianDefeat",board:1,guardian:"boss"},
    monk:{type:"guardianDefeat",board:2,guardian:"miniboss"},
    clown:{type:"guardianDefeat",board:2,guardian:"boss"},
    rouge:{type:"prestige",count:10},
    berserker:{type:"lifetimeStat",stat:"damageTaken",minimum:1000},
    turtle:{type:"runStat",stat:"defense",greaterThan:40},
    frog:{type:"runStat",stat:"doubleStrike",greaterThan:1.499999},
    d20:{type:"petLevel",pet:"neutral",minimum:30},
    slime:{type:"unlockedClassCount",minimum:10},
    vampire:{type:"compound",requirements:[{type:"careerStat",stat:"maxLifesteal",greaterThan:1},{type:"guardianDefeat",board:3,guardian:"boss"}]},
    ninja:{type:"runStat",stat:"crit",greaterThan:1},
    ceo:{type:"runStat",stat:"bossDamage",minimum:3},
    merchant:{type:"secretBossKills",boss:"road-merchant",minimum:1},
    cleric:{type:"lifetimeStat",stat:"healingDone",minimum:1000},
    paladin:{type:"boardClears",requirements:[{classId:"fighter",board:3},{classId:"cleric",board:3}]},
    beastmaster:{type:"allPetsUnlocked"},
    rogue:{type:"compound",requirements:[{type:"lifetimeStat",stat:"highestGold",minimum:5000},{type:"guardianDefeat",board:3,guardian:"miniboss"}]},
    bloodmage:{type:"secretBossKills",boss:"bloodmage-boss",minimum:1},
    summoner:{type:"petsAtLevel",count:3,level:10},
    necromancer:{type:"enemyDefeats",enemyId:"lich",minimum:100},
    pokemontrainer:{type:"compound",requirements:[{type:"allPetsAtLevel",level:10},{type:"boardClear",classId:"beastmaster",board:5}]},
    alchemist:{type:"lifetimeStat",stat:"potionsUsed",minimum:15},
    ouroboros:{type:"runStat",stat:"doubleStrike",minimum:4},
    dragoon:{type:"guardianDefeat",board:4,guardian:"miniboss"},
    slimerouge:{type:"compound",requirements:[{type:"classUnlocked",classId:"slime"},{type:"randomRunBoardClear",board:6}]}
  };

  const CLASS_MECHANICS_DATA={
    invoker:["mana","orb-sequence","ultimate","elemental","guard"],
    ranger:["marks","crit","evasion","ranged"],
    sorcerer:["mana","occult-spell","elemental","ranged","arcane-surge"],
    fighter:["counter","guard","barrier","melee"],
    monk:["combo","echo","evasion","melee"],
    clown:["chaos-gimmick","luck","burst"],
    rouge:["mana","occult-spell","crit","lifesteal"],
    berserker:["rage","low-hp","lifesteal","melee"],
    turtle:["guard-chain","guard","barrier","defense"],
    frog:["echo","poison","evasion","cascade"],
    d20:["d20-chaos","luck","echo"],
    slime:["flex","poison","generic-borrowing"],
    vampire:["mana","occult-spell","lifesteal","sustain"],
    ninja:["smoke","crit","evasion","poison"],
    ceo:["wealth","barrier","boss-damage"],
    merchant:["mana","occult-spell","wealth","shop"],
    cleric:["faith","healing","barrier","holy","blessed-attack"],
    paladin:["faith","healing","guard","holy","defense"],
    beastmaster:["pet","pet-switch","pack","stances"],
    rogue:["steal","wealth","evasion"],
    bloodmage:["blood-fuel","lifesteal","occult-spell"],
    summoner:["mana","pet","pack","spirits","conjure"],
    necromancer:["mana","allies","summons","grave-count","bone-shrapnel"],
    pokemontrainer:["pet","pack","roster","trainer-assist"],
    alchemist:["alchemy","flasks","potions","sustain"],
    ouroboros:["echo","poison","elemental","ouroboros-conversion"],
    dragoon:["airborne","jump","landing","melee"],
    slimerouge:["randomizer","flex","poison","generic-borrowing"]
  };

  const ULTIMATE_SUPPORT_DATA={
    ranger:["marks"],summoner:["spirits","pet","mana"],pokemontrainer:["roster","pet"],alchemist:["alchemy","potions"],cleric:["faith","healing"],paladin:["faith","healing"],ninja:["smoke","crit"],frog:["echo","cascade"],ouroboros:["echo","poison","ouroboros-conversion"],d20:["d20-chaos"]
  };

  const CLASS_IDS=Object.freeze(Object.keys(CLASS_DATA));

  const clone=value=>JSON.parse(JSON.stringify(value));
  function createRegistry(){return clone(CLASS_DATA);}
  function createPassiveRegistry(){return clone(CLASS_PASSIVE_DATA);}
  function createUnlockRegistry(){return clone(CLASS_UNLOCK_DATA);}
  function createMechanicsRegistry(){return clone(CLASS_MECHANICS_DATA);}
  function createUltimateSupportRegistry(){return clone(ULTIMATE_SUPPORT_DATA);}

  let runtimeOwner=null,runtime=null,actionsOwner=null,actionsRuntime=null,hooksOwner=null,hooksRuntime=null,invokerOwner=null,invokerRuntime=null;
  function installRuntime(owner){
    if(!owner||typeof owner.configure!=="function")throw new Error("DiceboundClasses runtime owner is invalid.");
    runtimeOwner=owner;
    return api;
  }
  function configure(next={}){
    if(!runtimeOwner)throw new Error("DiceboundClasses runtime owner has not been installed.");
    runtime=runtimeOwner.configure(next);
    return api;
  }
  function installActions(owner){
    if(!owner||typeof owner.configure!=="function")throw new Error("DiceboundClasses action-mechanics owner is invalid.");
    actionsOwner=owner;
    return api;
  }
  function configureActionMechanics(next={}){
    if(!actionsOwner)throw new Error("DiceboundClasses action-mechanics owner has not been installed.");
    actionsRuntime=actionsOwner.configure(next);
    return api;
  }
  function requireActions(name){
    const fn=actionsRuntime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses action mechanic ${name}() is not configured.`);
    return fn;
  }
  function callAction(name,...args){return requireActions(name)(...args);}
  function installHooks(owner){
    if(!owner||typeof owner.configure!=="function")throw new Error("DiceboundClasses runtime-hooks owner is invalid.");
    hooksOwner=owner;
    return api;
  }
  function configureRuntimeHooks(next={}){
    if(!hooksOwner)throw new Error("DiceboundClasses runtime-hooks owner has not been installed.");
    hooksRuntime=hooksOwner.configure(next);
    return api;
  }
  function requireHook(name){
    const fn=hooksRuntime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses runtime hook ${name}() is not configured.`);
    return fn;
  }
  function callHook(name,...args){return requireHook(name)(...args);}
  function installInvoker(owner){
    if(!owner||typeof owner.configure!=="function")throw new Error("DiceboundClasses Invoker owner is invalid.");
    invokerOwner=owner;
    return api;
  }
  function configureInvoker(next={}){
    if(!invokerOwner)throw new Error("DiceboundClasses Invoker owner has not been installed.");
    invokerRuntime=invokerOwner.configure(next);
    return api;
  }
  function requireInvoker(name){
    const fn=invokerRuntime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses Invoker capability ${name}() is not configured.`);
    return fn;
  }
  function callInvoker(name,...args){return requireInvoker(name)(...args);}
  function requireInvokerTest(name){
    const fn=invokerRuntime?._test?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses Invoker test capability ${name}() is not configured.`);
    return fn;
  }
  function requireRuntime(name){
    const fn=runtime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses runtime capability ${name}() is not configured.`);
    return fn;
  }
  function call(name,...args){return requireRuntime(name)(...args);}

  const api=Object.freeze({
    owner:"classes/facade",apiVersion:3,
    ids:CLASS_IDS,
    tagVocabulary:Object.freeze([...CLASS_TAG_VOCABULARY]),
    createRegistry,
    createPassiveRegistry,
    createUnlockRegistry,
    createMechanicsRegistry,
    createUltimateSupportRegistry,
    configure,
    configureActionMechanics,
    configureRuntimeHooks,
    configureInvoker,
    configureActions:next=>call("configureActions",next),
    performAction:kind=>call("performAction",kind),
    bloodmageBloodletting:()=>callAction("bloodmageBloodletting"),
    roguePowerStealChance:luck=>callAction("roguePowerStealChance",luck),
    rogueSteal:()=>callAction("rogueSteal"),
    clearRogueStolenStats:()=>callAction("clearRogueStolenStats"),
    clericConsecration:()=>callAction("clericConsecration"),
    cycleBeastStance:()=>callAction("cycleBeastStance"),
    bloodmageReplenish:()=>callAction("bloodmageReplenish"),
    bloodmageExsanguinate:()=>callAction("bloodmageExsanguinate"),
    alchemistVolatileFlask:()=>callAction("alchemistVolatileFlask"),
    dragoonCooldown:()=>callAction("dragoonCooldown"),
    dragoonTickCooldown:()=>callAction("dragoonTickCooldown"),
    dragoonResetState:()=>callAction("dragoonResetState"),
    dragoonLanding:()=>callAction("dragoonLanding"),
    dragoonJump:()=>callAction("dragoonJump"),
    legacyMonkDodge:base=>callHook("legacyMonkDodge",base),
    identityDodgeAdjustments:base=>callHook("identityDodgeAdjustments",base),
    berserkerDamage:amount=>callHook("berserkerDamage",amount),
    ninjaExecutionDamage:(amount,ignoreDefense=false)=>callHook("ninjaExecutionDamage",amount,ignoreDefense),
    syncOuroborosAttack:()=>callHook("syncOuroborosAttack"),
    syncOuroborosEconomy:()=>callHook("syncOuroborosEconomy"),
    invokerActive:()=>invokerRuntime?.active?.()||false,
    invokerRecipeFor:orbs=>callInvoker("recipeFor",orbs),
    invokerRecipeInfo:()=>callInvoker("recipeInfo"),
    invokerOrbBonuses:()=>callInvoker("orbBonuses"),
    invokerActionBonuses:()=>invokerRuntime?.actionBonuses?.()||null,
    invokerOutgoingMultiplier:()=>invokerRuntime?.outgoingMultiplier?.()||1,
    invokerGeneratorManaMultiplier:()=>invokerRuntime?.generatorManaMultiplier?.()||1,
    invokerAfterPlayerAction:kind=>invokerRuntime?.afterPlayerAction?.(kind),
    invokerAfterPlayerHit:(target,options)=>invokerRuntime?.afterPlayerHit?.(target,options),
    invokerResponseModifier:()=>invokerRuntime?.responseModifier?.()||null,
    invokerAttackSpec:key=>invokerRuntime?.ATTACK?.[key]||null,
    invokerQuasStrike:()=>callInvoker("quasStrike"),
    invokerWexStrike:()=>callInvoker("wexStrike"),
    invokerExortStrike:()=>callInvoker("exortStrike"),
    invokerElementalLance:()=>callInvoker("elementalLance"),
    invokerUltimate:()=>callInvoker("invokeUltimate"),
    invokerBeginCombat:()=>invokerRuntime?.beginCombat?.(),
    invokerResetCombat:(...args)=>invokerRuntime?.resetCombat?.(...args),
    invokerRender:()=>invokerRuntime?.render?.(),
    identityId:()=>call("identityId"),
    active:id=>call("active",id),
    mechanicsFor:id=>call("mechanicsFor",id),
    ultimateSupportFor:id=>call("ultimateSupportFor",id),
    capabilities:()=>call("capabilities"),
    hasMechanic:tag=>call("hasMechanic",tag),
    initIdentitySupport:id=>call("initIdentitySupport",id),
    initUltimateSupport:id=>call("initUltimateSupport",id),
    syncBloodmageHpPassive:(initial=false)=>call("syncBloodmageHpPassive",initial),
    forceSlimeRouge:(identity=null,ultimate=null)=>call("forceSlimeRouge",identity,ultimate),
    prepareSlimeRougeBorrowing:(pool,pick)=>call("prepareSlimeRougeBorrowing",pool,pick),
    finishSlimeRougeBorrowing:()=>call("finishSlimeRougeBorrowing"),
    clearSlimeRougeRuntime:()=>call("clearSlimeRougeRuntime"),
    runtimeSnapshot:()=>call("snapshot"),
    _invokerTest:Object.freeze({
      addOrb:orb=>requireInvokerTest("addOrb")(orb),
      state:(create=true)=>requireInvokerTest("state")(create),
      scale:(raw,options)=>requireInvokerTest("scale")(raw,options)
    }),
    _installRuntime:installRuntime,
    _installActions:installActions,
    _installHooks:installHooks,
    _installInvoker:installInvoker,
  });
  window.DiceboundClasses=api;
})();
