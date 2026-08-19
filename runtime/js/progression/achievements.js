(() => {
  "use strict";

  const ACHIEVEMENT_DATA=[
    {
      "id": "first-footfall",
      "category": "roads",
      "name": "First Footfall",
      "condition": "runsStarted"
    },
    {
      "id": "ranger-b1",
      "category": "roads",
      "name": "Green Road Hunter",
      "condition": "boardClear:ranger:1",
      "reward": "powerup:ranger_crownshot"
    },
    {
      "id": "sorcerer-b2",
      "category": "roads",
      "name": "Astral Graduate",
      "condition": "boardClear:sorcerer:2",
      "reward": "powerup:sorcerer_starcovenant"
    },
    {
      "id": "road1",
      "category": "roads",
      "name": "Dragon Down",
      "condition": "classUnlocked:fighter"
    },
    {
      "id": "road2",
      "category": "roads",
      "name": "Astral Collapse",
      "condition": "classUnlocked:clown"
    },
    {
      "id": "road3",
      "category": "roads",
      "name": "Nightmare Key",
      "condition": "nightmareUnlocked"
    },
    {
      "id": "road4",
      "category": "roads",
      "name": "Fourth Road Conqueror",
      "condition": "board4Clears"
    },
    {
      "id": "road5",
      "category": "roads",
      "name": "Fifth Road Conqueror",
      "condition": "board5Clears"
    },
    {
      "id": "slime-l5",
      "category": "builds",
      "name": "Blob With Ambition",
      "condition": "classLevel:slime:5"
    },
    {
      "id": "heal1000",
      "category": "builds",
      "name": "Thousand Wounds Mended",
      "condition": "healingDone:1000",
      "reward": "class:cleric"
    },
    {
      "id": "gold4000",
      "category": "builds",
      "name": "Walking Bank Vault",
      "condition": "highestGold:4000",
      "reward": "class:rogue"
    },
    {
      "id": "fighter-b3",
      "category": "builds",
      "name": "Iron Through the Fracture",
      "condition": "boardClear:fighter:3"
    },
    {
      "id": "cleric-b3",
      "category": "builds",
      "name": "Faith Through the Fracture",
      "condition": "boardClear:cleric:3"
    },
    {
      "id": "nature-master",
      "category": "collection",
      "name": "Green Plague Scholar",
      "condition": "elementProgress:nature:500",
      "reward": "powerup:plague_lord"
    },
    {
      "id": "menagerie",
      "category": "collection",
      "name": "Full Menagerie",
      "condition": "allPetsUnlocked",
      "reward": "class:beastmaster"
    },
    {
      "id": "prestige10",
      "category": "collection",
      "name": "Red Horizon",
      "condition": "prestige:10",
      "reward": "powerup:destiny"
    },
    {
      "id": "prestige20",
      "category": "collection",
      "name": "Double Legacy",
      "condition": "prestige:20"
    },
    {
      "id": "mythic5",
      "category": "collection",
      "name": "Impossible Wardrobe",
      "condition": "setPieces:5"
    },
    {
      "id": "mythic7",
      "category": "collection",
      "name": "The Complete Impossible Road",
      "condition": "setPieces:7"
    },
    {
      "id": "merchant1",
      "category": "secrets",
      "name": "Hostile Customer",
      "condition": "merchantKills:1",
      "secret": true
    },
    {
      "id": "hell-gate",
      "category": "secrets",
      "name": "Through Hell's Gate",
      "condition": "hellUnlocked",
      "secret": true
    },
    {
      "id": "blood-well",
      "category": "secrets",
      "name": "Blood in the Well",
      "condition": "classUnlocked:bloodmage",
      "secret": true
    },
    {
      "id": "storage",
      "category": "collection",
      "name": "The Long Box",
      "condition": "heirloomStorageUnlocked"
    },
    {
      "id": "double-dice",
      "category": "collection",
      "name": "Two Fists Full of Dice",
      "condition": "board5Clears"
    },
    {
      "id": "prestige5",
      "category": "collection",
      "name": "Five Lives Later",
      "condition": "prestige:5"
    },
    {
      "id": "prestige50",
      "category": "collection",
      "name": "Deep Legacy",
      "condition": "prestige:50"
    },
    {
      "id": "legendary1",
      "category": "collection",
      "name": "Familiar Object",
      "condition": "legendaryRelics:1"
    },
    {
      "id": "legendary3",
      "category": "collection",
      "name": "Lost & Found",
      "condition": "legendaryRelics:3"
    },
    {
      "id": "pale-devil",
      "category": "secrets",
      "name": "Pale Moonlight",
      "condition": "devilBossKills:1",
      "secret": true
    },
    {
      "id": "devil-horns",
      "category": "secrets",
      "name": "The Horns Are Real",
      "condition": "devilHornsFound",
      "secret": true
    },
    {
      "id": "potions50",
      "category": "builds",
      "name": "Roadside Pharmacist",
      "condition": "potionsUsed:50"
    }
  ];

  function createRegistry(){return JSON.parse(JSON.stringify(ACHIEVEMENT_DATA));}
  window.DiceboundAchievements=Object.freeze({apiVersion:1,createRegistry});
})();
