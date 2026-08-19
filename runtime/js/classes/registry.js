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
      "desc": "The starting hero: a precise hunter with high crit, natural evasion and a devastating four-arrow ultimate.",
      "stats": "37 HP · 6 ATK · 15% CRIT · 8% DODGE",
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
      "scaleNotes": "Attack is the core stat; Crit is unusually valuable because Ranger starts high and Arrow Storm scales directly from Attack. Echo adds more independent arrows between ultimates, while Dodge keeps the glassier hunter alive.",
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
      "desc": "An occult spellcaster with a real Mana cycle. Channel Bolt builds Mana; Arcane Lance spends it, converts half of your Echo Strike chance into bonus spell damage, and benefits from Lifesteal. Sorcerer's Signature Burst is Arcane Surge: when it procs, that basic or Echo strike deals 50% more damage.",
      "stats": "31 HP · 7 ATK · 25/100 MANA · 5 LUCK",
      "ultimate": {
        "name": "Starfall",
        "icon": "☄️",
        "desc": "A 300% meteor that strikes the entire pack and restores 20% of damage dealt."
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
      "scaleNotes": "Attack powers both Channel Bolt and Arcane Lance. Arcane Lance converts half of your Echo Strike chance into bonus spell damage and applies Lifesteal to the spell plus its forced elemental eruption. Mana generation determines spell frequency; Crit, elemental power and Luck improve the payoff. Arcane Surge is the Sorcerer signature burst: each basic or Echo strike has your Signature Burst chance to deal 50% more strike damage.",
      "tags": [
        "ranged",
        "occult",
        "elemental",
        "mana"
      ],
      "passive": {
        "name": "Arcane Reservoir",
        "desc": "Uses Mana. Channel Bolt builds it; Arcane Lance spends it, converts half of Echo Strike chance into bonus damage, and applies Lifesteal. Arcane Surge is a Signature Burst: each basic or Echo strike has your Signature Burst chance to deal 50% more damage."
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
      "scaleNotes": "Attack, Echo Strike and Dodge work together: more Echo means more hits and ultimate charge opportunities, while sustain lets Monk survive long enough to exploit them. Hundred Fists scales mostly from Attack.",
      "tags": [
        "melee",
        "combo",
        "disciplined"
      ],
      "passive": {
        "name": "Flowing Combo",
        "desc": "Consecutive basic attacks build Combo, increasing damage, Echo chance and Dodge. Guarding or drinking a potion resets it."
      }
    },
    "clown": {
      "id": "clown",
      "name": "Clown",
      "icon": "🤡",
      "attackIcon": "🐔",
      "fxIcon": "🐔",
      "unlock": "Defeat the Board 2 dragon",
      "desc": "A chaotic trickster powered by Luck, crits and weapons that should not legally count as weapons.",
      "stats": "34 HP · 6 ATK · 12% CRIT · 8 LUCK",
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
      "scaleNotes": "Luck, Crit and Echo are the main chaos multipliers. Clown has high variance rather than one clean stat curve; more Luck also improves the road rewards that feed the build.",
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
      "stats": "36 HP · 7 ATK · 25/100 MANA · 12% CRIT",
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
      "scaleNotes": "Rouge—the colour—likes Attack, Crit and Lifesteal. Its crimson bursts become safer as Lifesteal rises, and Crimson Deluge rewards a damage-heavy build that can immediately drink back lost HP.",
      "tags": [
        "weird",
        "artful",
        "occult",
        "mana"
      ],
      "passive": {
        "name": "Painted Hexcraft",
        "desc": "Uses Mana. Crimson Stroke builds it; Scarlet Hex spends it on violent battle-art magic."
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
      "stats": "51 HP · 8 ATK · 5% CRIT · RAGE",
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
      "unlock": "Unlock every non-secret class",
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
      "unlock": "Reach more than 100% Lifesteal during a run",
      "desc": "A lifestealing occult duelist. Night Siphon builds Mana; Grave Lance spends it and drinks the damage back as health.",
      "stats": "41 HP · 7 ATK · 25/100 MANA · 28% LIFESTEAL",
      "ultimate": {
        "name": "Crimson Eclipse",
        "icon": "🌑",
        "desc": "Drain the entire pack for heavy damage and heal for 50% of damage dealt."
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
      "scaleNotes": "Lifesteal is the signature multiplier because every damage increase also becomes healing. Attack, Crit and Echo therefore double as sustain stats. Blood Moon can turn excess healing into temporary battle HP.",
      "tags": [
        "vampiric",
        "occult",
        "sustain",
        "mana"
      ],
      "passive": {
        "name": "Night Hunger",
        "desc": "Uses Mana for occult attacks while retaining extreme Lifesteal. Grave Lance converts spell damage back into health."
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
      "stats": "33 HP · 8 ATK · 28% CRIT · 12% DODGE",
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
      "unlock": "Secret: defeat the Road Merchant five times",
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
      "scaleNotes": "Gold is a combat stat. Several attacks and weapons convert the purse directly into damage, while Luck and gold bonuses accelerate the economy that powers the class.",
      "tags": [
        "wealth",
        "occult",
        "weird",
        "mana"
      ],
      "passive": {
        "name": "Occult Accounting",
        "desc": "Selling unused gear pays 200% normal value. Ledger Tap and Foreclosure Hex also use Mana."
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
      "unlock": "Hold 4,000 gold at one time",
      "desc": "A fast opportunist built around Dodge, gold and one Steal attempt per battle. The Rogue wins by making every pocket somebody else's problem.",
      "stats": "34 HP · 8 ATK · 22% CRIT · 14% DODGE",
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
        "desc": "Can attempt to Steal once per battle for gold and occasionally a potion. Above 50 Luck, successful Steals can also snatch a random powerup. Starts with +25% gold gain and +5% Dodge."
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
      "desc": "A forbidden occult caster that replaces Mana with HP. Bloodletting restores fuel, Exsanguinate spends life for damage, and Replenish heals both combatants.",
      "stats": "39 HP · 9 ATK · 1 DEF · LIFE-FUELLED",
      "scaleNotes": "Attack scales burst damage, while max HP determines how much blood you can safely spend. Healing and lifesteal extend the amount of damage the class can buy with its own veins.",
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
        "desc": "Uses HP where other occult classes use Mana. Bloodletting restores fuel; Exsanguinate spends life for brutal damage; Replenish heals both sides."
      }
    },
    "summoner": {
      "id": "summoner",
      "name": "Summoner",
      "icon": "📖",
      "attackIcon": "✨",
      "fxIcon": "🔹🐾",
      "unlock": "Raise any 3 companions to level 10",
      "desc": "A Mana-based pet caster. Spirit Bolt builds Mana; Conjure Familiar spends it to call temporary elemental spirits that join companion attacks for the rest of the battle.",
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
        "desc": "Uses Mana to conjure up to three temporary companion spirits each battle. Summoned spirits attack after your normal companion."
      }
    },
    "pokemontrainer": {
      "id": "pokemontrainer",
      "secret": true,
      "name": "Pokémon Trainer",
      "icon": "🧢",
      "attackIcon": "🔴",
      "fxIcon": "🐾✨",
      "unlock": "Secret: master every companion and prove the Beastmaster on the fifth Nightmare road",
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
      "unlock": "Use 25 potions across all runs",
      "desc": "A potion engineer who brews replacements during combat and can drink potions for healing or throw them as volatile weapons. Starts with +50% Potion Healing and gains another +5% Potion Healing every level. Offensive flask damage scales directly with Potion Healing bonuses.",
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
        "desc": "Every third basic attack brews a potion. Potions can heal normally or be consumed as Volatile Flasks whose damage scales with Potion Healing."
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
      "stats": "48 HP · 10 STATIC ATK · 120% ECHO · 8% CRIT",
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

  const CLASS_IDS=Object.freeze(Object.keys(CLASS_DATA));

  function createRegistry(){
    return JSON.parse(JSON.stringify(CLASS_DATA));
  }

  window.DiceboundClasses=Object.freeze({
    apiVersion:1,
    ids:CLASS_IDS,
    createRegistry,
  });
})();
