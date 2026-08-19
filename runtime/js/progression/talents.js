(() => {
  "use strict";

  const TALENT_DATA=[
    {
      "id": "roadborn",
      "branch": "Root",
      "icon": "🛤️",
      "name": "Roadborn",
      "cost": 1,
      "maxRank": 1,
      "desc": "The root of the Legacy tree. Start each run with +5 max HP, +2 Attack and +2 Defense.",
      "requires": []
    },
    {
      "id": "survival_vitality",
      "branch": "Survival",
      "icon": "❤️",
      "name": "Vitality Training",
      "cost": 1,
      "maxRank": 5,
      "desc": "Each rank grants +4 starting max HP.",
      "requires": [
        {
          "id": "roadborn",
          "rank": 1
        }
      ]
    },
    {
      "id": "survival_armor",
      "branch": "Survival",
      "icon": "🛡️",
      "name": "Armor Drills",
      "cost": 2,
      "maxRank": 3,
      "desc": "Each rank grants +1 starting defense.",
      "requires": [
        {
          "id": "survival_vitality",
          "rank": 2
        }
      ]
    },
    {
      "id": "survival_recovery",
      "branch": "Survival",
      "icon": "🩹",
      "name": "Victory Recovery",
      "cost": 2,
      "maxRank": 3,
      "desc": "Heal 2 HP after every victory per rank.",
      "requires": [
        {
          "id": "survival_armor",
          "rank": 1
        }
      ]
    },
    {
      "id": "survival_dodge",
      "branch": "Survival",
      "icon": "🌫️",
      "name": "Evasive Footwork",
      "cost": 2,
      "maxRank": 4,
      "desc": "Each rank grants +2% starting dodge.",
      "requires": [
        {
          "id": "survival_vitality",
          "rank": 2
        }
      ]
    },
    {
      "id": "survival_prepared",
      "branch": "Survival",
      "icon": "🧪",
      "name": "Prepared Packs",
      "cost": 1,
      "maxRank": 3,
      "desc": "Each rank adds one starting potion.",
      "requires": [
        {
          "id": "survival_vitality",
          "rank": 1
        }
      ]
    },
    {
      "id": "survival_alchemy",
      "branch": "Survival",
      "icon": "⚗️",
      "name": "Potion Mastery",
      "cost": 2,
      "maxRank": 2,
      "desc": "Each rank makes potions heal 50% more. Maximum: +100% healing.",
      "requires": [
        {
          "id": "survival_prepared",
          "rank": 2
        }
      ]
    },
    {
      "id": "survival_double_dose",
      "branch": "Survival",
      "icon": "🧪🧪",
      "name": "Double Dose",
      "cost": 3,
      "maxRank": 1,
      "desc": "A combat Potion action can drink up to 2 potions before the enemy responds. The second potion is only consumed if you are still injured.",
      "requires": [
        {
          "id": "survival_alchemy",
          "rank": 2
        }
      ]
    },
    {
      "id": "survival_revive",
      "branch": "Survival",
      "icon": "🔥",
      "name": "Last Embers",
      "cost": 3,
      "maxRank": 2,
      "desc": "Each rank grants one revive at the start of every run.",
      "requires": [
        {
          "id": "survival_recovery",
          "rank": 2
        },
        {
          "id": "survival_alchemy",
          "rank": 2
        }
      ]
    },
    {
      "id": "power_attack",
      "branch": "Power",
      "icon": "⚔️",
      "name": "Weapon Training",
      "cost": 1,
      "maxRank": 5,
      "desc": "Each rank grants +1 starting attack.",
      "requires": [
        {
          "id": "roadborn",
          "rank": 1
        }
      ]
    },
    {
      "id": "power_boss",
      "branch": "Power",
      "icon": "🐉",
      "name": "Dragonbane",
      "cost": 2,
      "maxRank": 3,
      "desc": "Each rank deals 10% more damage to bosses and minibosses.",
      "requires": [
        {
          "id": "power_attack",
          "rank": 2
        }
      ]
    },
    {
      "id": "power_lifesteal",
      "branch": "Power",
      "icon": "🩸",
      "name": "Bloodline",
      "cost": 2,
      "maxRank": 4,
      "desc": "Each rank grants +2% starting lifesteal.",
      "requires": [
        {
          "id": "power_boss",
          "rank": 1
        }
      ]
    },
    {
      "id": "power_crit",
      "branch": "Power",
      "icon": "🎯",
      "name": "Critical Discipline",
      "cost": 1,
      "maxRank": 5,
      "desc": "Each rank grants +2% starting critical chance.",
      "requires": [
        {
          "id": "power_attack",
          "rank": 1
        }
      ]
    },
    {
      "id": "power_ultimate_start",
      "branch": "Power",
      "icon": "💜",
      "name": "Stored Power",
      "cost": 2,
      "maxRank": 3,
      "desc": "Begin runs with 10 ultimate charge per rank.",
      "requires": [
        {
          "id": "power_crit",
          "rank": 2
        }
      ]
    },
    {
      "id": "power_ultimate_flow",
      "branch": "Power",
      "icon": "⚡",
      "name": "Relentless Flow",
      "cost": 2,
      "maxRank": 3,
      "desc": "Attack and Defend generate 10% more ultimate charge per rank. Unlock requirement: Stored Power rank 1.",
      "requires": [
        {
          "id": "power_ultimate_start",
          "rank": 1
        }
      ]
    },
    {
      "id": "power_echo",
      "branch": "Power",
      "icon": "🗡️",
      "name": "Ancestral Echo",
      "cost": 2,
      "maxRank": 4,
      "desc": "Each rank grants +3% starting Echo Strike chance.",
      "requires": [
        {
          "id": "power_ultimate_flow",
          "rank": 1
        }
      ]
    },
    {
      "id": "power_apex",
      "branch": "Power",
      "icon": "💥",
      "name": "Apex Technique",
      "cost": 3,
      "maxRank": 3,
      "desc": "Class ultimates deal 15% more damage per rank.",
      "requires": [
        {
          "id": "power_boss",
          "rank": 2
        },
        {
          "id": "power_ultimate_flow",
          "rank": 2
        }
      ]
    },
    {
      "id": "fortune_gold",
      "branch": "Fortune",
      "icon": "🪙",
      "name": "Hidden Purse",
      "cost": 1,
      "maxRank": 4,
      "desc": "Each rank adds 25 starting gold and +5% gold gain.",
      "requires": [
        {
          "id": "roadborn",
          "rank": 1
        }
      ]
    },
    {
      "id": "fortune_discount",
      "branch": "Fortune",
      "icon": "🧔",
      "name": "Merchant Contacts",
      "cost": 1,
      "maxRank": 3,
      "desc": "Merchant prices are 5% lower per rank.",
      "requires": [
        {
          "id": "fortune_gold",
          "rank": 1
        }
      ]
    },
    {
      "id": "fortune_luck",
      "branch": "Fortune",
      "icon": "🍀",
      "name": "Luck Training",
      "cost": 1,
      "maxRank": 5,
      "desc": "Each rank grants +3 starting Luck.",
      "requires": [
        {
          "id": "fortune_discount",
          "rank": 1
        }
      ]
    },
    {
      "id": "fortune_cookie",
      "branch": "Fortune",
      "icon": "🍪",
      "name": "Cookie Scent",
      "cost": 2,
      "maxRank": 3,
      "desc": "Each rank adds 2% to event cookie drop chance.",
      "requires": [
        {
          "id": "fortune_luck",
          "rank": 2
        }
      ]
    },
    {
      "id": "fortune_blessing",
      "branch": "Fortune",
      "icon": "✨",
      "name": "Divine Favor",
      "cost": 2,
      "maxRank": 3,
      "desc": "Each rank strengthens every Blessing from God.",
      "requires": [
        {
          "id": "fortune_gold",
          "rank": 2
        }
      ]
    },
    {
      "id": "fortune_omens",
      "branch": "Fortune",
      "icon": "☯️",
      "name": "Twin Omens",
      "cost": 3,
      "maxRank": 1,
      "desc": "Every board gains a second Blessing and a second Mystic.",
      "requires": [
        {
          "id": "fortune_blessing",
          "rank": 2
        },
        {
          "id": "fortune_luck",
          "rank": 3
        }
      ]
    },
    {
      "id": "fortune_impossible",
      "branch": "Fortune",
      "icon": "🌈",
      "name": "Impossible Odds",
      "cost": 3,
      "maxRank": 3,
      "desc": "Each rank grants another +4 starting Luck.",
      "requires": [
        {
          "id": "fortune_omens",
          "rank": 1
        }
      ]
    },
    {
      "id": "legacy_heirloom",
      "branch": "Heirlooms",
      "icon": "🧰",
      "name": "Heirloom Vault",
      "cost": 2,
      "maxRank": 4,
      "desc": "Each rank unlocks one additional permanent heirloom slot, up to five total.",
      "requires": [
        {
          "id": "roadborn",
          "rank": 1
        }
      ]
    },
    {
      "id": "legacy_xp",
      "branch": "Heirlooms",
      "icon": "📜",
      "name": "Living Legend",
      "cost": 2,
      "maxRank": 4,
      "desc": "Gain 10% more Legacy XP after runs per rank.",
      "requires": [
        {
          "id": "legacy_heirloom",
          "rank": 1
        }
      ]
    },
    {
      "id": "legacy_travel",
      "branch": "Heirlooms",
      "icon": "🥾",
      "name": "Road Wisdom",
      "cost": 2,
      "maxRank": 3,
      "desc": "High rolls grant +3 additional Fast Travel XP per rank.",
      "requires": [
        {
          "id": "legacy_heirloom",
          "rank": 1
        }
      ]
    },
    {
      "id": "legacy_scholar",
      "branch": "Heirlooms",
      "icon": "📘",
      "name": "Old Lessons",
      "cost": 2,
      "maxRank": 3,
      "desc": "Enemies grant 10% more run XP per rank.",
      "requires": [
        {
          "id": "legacy_travel",
          "rank": 1
        }
      ]
    },
    {
      "id": "companion_damage",
      "branch": "Companion",
      "icon": "🦊",
      "name": "Companion Training",
      "cost": 1,
      "maxRank": 5,
      "desc": "Your active pet deals +1 damage per rank.",
      "requires": [
        {
          "id": "roadborn",
          "rank": 1
        }
      ]
    },
    {
      "id": "companion_double",
      "branch": "Companion",
      "icon": "🐾",
      "name": "Feral Loyalty",
      "cost": 2,
      "maxRank": 3,
      "desc": "Your active pet gains +7% chance to attack twice per rank.",
      "requires": [
        {
          "id": "companion_damage",
          "rank": 2
        }
      ]
    },
    {
      "id": "companion_bond",
      "branch": "Companion",
      "icon": "🍪",
      "name": "Bonded Feast",
      "cost": 2,
      "maxRank": 3,
      "desc": "Every cookie grants +1 additional bond XP per rank.",
      "requires": [
        {
          "id": "companion_damage",
          "rank": 2
        }
      ]
    },
    {
      "id": "companion_recovery",
      "branch": "Companion",
      "icon": "💗",
      "name": "Healing Nuzzle",
      "cost": 2,
      "maxRank": 3,
      "desc": "Your active pet restores 1 HP after each pet turn per rank.",
      "requires": [
        {
          "id": "companion_double",
          "rank": 1
        }
      ]
    },
    {
      "id": "companion_ascendant",
      "branch": "Companion",
      "icon": "🔥",
      "name": "Ember Ascendant",
      "cost": 3,
      "maxRank": 3,
      "desc": "Your active pet deals +2 additional damage per rank.",
      "requires": [
        {
          "id": "companion_double",
          "rank": 2
        },
        {
          "id": "companion_bond",
          "rank": 2
        }
      ]
    },
    {
      "id": "element_attunement",
      "branch": "Elements",
      "icon": "🌈",
      "name": "Elemental Attunement",
      "cost": 1,
      "maxRank": 5,
      "desc": "Each rank adds 3% to elemental weapon activation chance.",
      "requires": [
        {
          "id": "roadborn",
          "rank": 1
        }
      ]
    },
    {
      "id": "element_power",
      "branch": "Elements",
      "icon": "💫",
      "name": "Spell Amplifier",
      "cost": 2,
      "maxRank": 4,
      "desc": "Each rank makes elemental effects deal and heal 8% more.",
      "requires": [
        {
          "id": "element_attunement",
          "rank": 2
        }
      ]
    },
    {
      "id": "element_weakness",
      "branch": "Elements",
      "icon": "🎯",
      "name": "Weakness Lore",
      "cost": 2,
      "maxRank": 3,
      "desc": "Each rank adds 4% proc chance and 12% power when exploiting an enemy weakness.",
      "requires": [
        {
          "id": "element_attunement",
          "rank": 3
        }
      ]
    },
    {
      "id": "element_echo",
      "branch": "Elements",
      "icon": "🌈",
      "name": "Prismatic Echo",
      "cost": 3,
      "maxRank": 3,
      "desc": "Each rank adds a 5% chance for an elemental effect to echo a second time.",
      "requires": [
        {
          "id": "element_power",
          "rank": 2
        },
        {
          "id": "element_weakness",
          "rank": 1
        }
      ]
    },
    {
      "id": "element_conduit",
      "branch": "Elements",
      "icon": "⚡",
      "name": "Elemental Conduit",
      "cost": 2,
      "maxRank": 3,
      "desc": "Exploiting a weakness grants 6 ultimate charge per rank.",
      "requires": [
        {
          "id": "element_weakness",
          "rank": 2
        }
      ]
    },
    {
      "id": "element_prismatic",
      "branch": "Elements",
      "icon": "🗡️",
      "name": "Prismatic Birthright",
      "cost": 2,
      "maxRank": 3,
      "desc": "Start each run with an elemental class weapon unless an heirloom weapon replaces it. Rank 1 Common · Rank 2 Uncommon · Rank 3 Rare.",
      "requires": [
        {
          "id": "element_attunement",
          "rank": 2
        }
      ]
    },
    {
      "id": "companion_element_proc",
      "branch": "Companion",
      "icon": "🌈🐾",
      "name": "Primal Spark",
      "cost": 3,
      "maxRank": 3,
      "desc": "Each rank gives companion and summoned-creature hits a 2.5% chance to trigger their element's full proc.",
      "requires": [
        {
          "id": "companion_ascendant",
          "rank": 1
        },
        {
          "id": "element_attunement",
          "rank": 1
        }
      ]
    },
    {
      "id": "fortune_powerup_rerolls",
      "branch": "Fortune",
      "icon": "🔄✨",
      "name": "Second Opinion",
      "cost": 1,
      "maxRank": 5,
      "desc": "Each rank adds 1 Powerup Reroll at the start of every run.",
      "requires": [
        {
          "id": "fortune_luck",
          "rank": 1
        }
      ]
    },
    {
      "id": "monk_flow_ceiling",
      "branch": "Power",
      "icon": "🥋🔥",
      "name": "Endless Form",
      "cost": 1,
      "maxRank": 3,
      "desc": "Each rank improves many class signatures: Ranger Marks, Monk Combo, Turtle Guard chain, Fighter Counterblow damage and +1 stored Counterblow, Mana building, Cleric Faith gain, Summoner spirits and Alchemist flasks.",
      "requires": [
        {
          "id": "power_echo",
          "rank": 1
        }
      ]
    },
    {
      "id": "turtle_guard_element",
      "branch": "Elements",
      "icon": "🐢🌈",
      "name": "Resonant Carapace",
      "cost": 2,
      "maxRank": 3,
      "desc": "Each rank gives Guardian-tagged classes a 5% chance to trigger an elemental proc whenever they Guard.",
      "requires": [
        {
          "id": "element_attunement",
          "rank": 1
        },
        {
          "id": "survival_armor",
          "rank": 1
        }
      ]
    },
    {
      "id": "fortune_extra_choice",
      "branch": "Fortune",
      "icon": "🃏✨",
      "name": "Expanded Horizons",
      "cost": 3,
      "maxRank": 1,
      "desc": "Level-ups offer 4 powerup choices instead of 3.",
      "requires": [
        {
          "id": "fortune_powerup_rerolls",
          "rank": 3
        }
      ]
    },
    {
      "id": "legacy_storage",
      "branch": "Heirlooms",
      "icon": "🗄️",
      "name": "Heirloom Storage",
      "cost": 3,
      "maxRank": 1,
      "desc": "Permanently unlock Heirloom Storage at the Campsite. It begins with one storage slot per equipment slot; major milestones add more.",
      "requires": [
        {
          "id": "legacy_xp",
          "rank": 1
        }
      ]
    }
  ];

  const TALENT_IDS=Object.freeze(TALENT_DATA.map(talent=>talent.id));

  function createRegistry(){
    return JSON.parse(JSON.stringify(TALENT_DATA));
  }

  window.DiceboundTalents=Object.freeze({
    apiVersion:1,
    ids:TALENT_IDS,
    createRegistry,
  });
})();
