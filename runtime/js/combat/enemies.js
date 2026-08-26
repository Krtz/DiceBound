(() => {
  "use strict";

  const ENEMY_DATA=[
    {
      "name": "Slime",
      "icon": "🟢",
      "hp": 9,
      "attack": 3,
      "defenseBias": -0.8,
      "xp": 8,
      "gold": 7,
      "weakness": "electric"
    },
    {
      "name": "Goblin",
      "icon": "👺",
      "hp": 12,
      "attack": 4,
      "defenseBias": 0,
      "xp": 10,
      "gold": 9,
      "weakness": "donut"
    },
    {
      "name": "Skeleton",
      "icon": "💀",
      "hp": 15,
      "attack": 5,
      "defenseBias": 0.8,
      "xp": 12,
      "gold": 11,
      "weakness": "light"
    },
    {
      "name": "Wolf",
      "icon": "🐺",
      "hp": 17,
      "attack": 6,
      "defenseBias": -0.2,
      "xp": 13,
      "gold": 12,
      "weakness": "fire"
    },
    {
      "name": "Bandit",
      "icon": "🥷",
      "hp": 20,
      "attack": 7,
      "defenseBias": 0.4,
      "xp": 15,
      "gold": 17,
      "weakness": "tech"
    },
    {
      "name": "Orc",
      "icon": "👹",
      "hp": 23,
      "attack": 8,
      "defenseBias": 1.5,
      "xp": 17,
      "gold": 16,
      "weakness": "ice"
    },
    {
      "name": "Cultist",
      "icon": "🧛",
      "hp": 26,
      "attack": 9,
      "defenseBias": 0.1,
      "xp": 19,
      "gold": 19,
      "weakness": "coffee",
      "lifeSteal": 0.01
    },
    {
      "name": "Wraith",
      "icon": "👻",
      "hp": 29,
      "attack": 10,
      "defenseBias": -0.5,
      "xp": 21,
      "gold": 21,
      "weakness": "nature"
    },
    {
      "name": "Troll",
      "icon": "🧌",
      "hp": 34,
      "attack": 11,
      "defenseBias": 2.1,
      "xp": 24,
      "gold": 24,
      "weakness": "void"
    },
    {
      "name": "Devil",
      "icon": "😈",
      "hp": 38,
      "attack": 13,
      "defenseBias": 2.7,
      "xp": 28,
      "gold": 28,
      "weakness": "radiation"
    },
    {
      "name": "Lich",
      "icon": "🧙‍♀️",
      "hp": 43,
      "attack": 14,
      "defenseBias": -0.7,
      "xp": 32,
      "gold": 32,
      "weakness": "metal"
    }
  ];

  const SPECIAL_ENEMY_DATA={
    "ogre-roadwarden": {
      "id": "ogre-roadwarden",
      "name": "Ogre Roadwarden",
      "icon": "👑🧌",
      "hp": 52,
      "attack": 12,
      "xp": 42,
      "gold": 45,
      "weakness": "metal",
      "specialName": "Roadwarden Rampage"
    },
    "ancient-road-dragon": {
      "id": "ancient-road-dragon",
      "name": "Ancient Road Dragon",
      "icon": "🐉",
      "hp": 48,
      "attack": 11,
      "xp": 60,
      "gold": 70,
      "weakness": "ice",
      "specialName": "Worldfire Breath"
    },
    "titan-guard": {
      "id": "titan-guard",
      "name": "Titan Guard",
      "icon": "👑🗿",
      "hp": 72,
      "attack": 16,
      "xp": 60,
      "gold": 64,
      "weakness": "coffee",
      "specialName": "Titanic Roadslam"
    },
    "astral-devourer-dragon": {
      "id": "astral-devourer-dragon",
      "name": "Astral Devourer Dragon",
      "icon": "🐲",
      "hp": 74,
      "attack": 16,
      "xp": 90,
      "gold": 105,
      "weakness": "donut",
      "specialName": "Astral Consumption"
    },
    "paradox-warden": {
      "id": "paradox-warden",
      "name": "Paradox Warden",
      "icon": "👑⏳",
      "hp": 98,
      "attack": 22,
      "xp": 90,
      "gold": 95,
      "weakness": "tech",
      "specialName": "Paradox Collapse"
    },
    "nullstar-hydra": {
      "id": "nullstar-hydra",
      "name": "Nullstar Hydra",
      "icon": "🐉🌑",
      "hp": 112,
      "attack": 24,
      "xp": 145,
      "gold": 170,
      "weakness": "light",
      "specialName": "Erasure of All Roads"
    },
    "crownless-auditor": {
      "id": "crownless-auditor",
      "name": "Crownless Auditor",
      "icon": "👑📜",
      "hp": 145,
      "attack": 31,
      "xp": 190,
      "gold": 220,
      "weakness": "void",
      "specialName": "Crown Audit"
    },
    "crown-eater": {
      "id": "crown-eater",
      "name": "Crown-Eater of the Fourth Road",
      "icon": "🐲👑",
      "hp": 190,
      "attack": 36,
      "xp": 290,
      "gold": 350,
      "weakness": "light",
      "specialName": "End of All Accounts"
    },
    "ringbound-chancellor": {
      "id": "ringbound-chancellor",
      "name": "Ringbound Chancellor",
      "icon": "👑💍",
      "hp": 192,
      "attack": 38,
      "xp": 250,
      "gold": 300,
      "weakness": "metal",
      "specialName": "Chancery of Ruin"
    },
    "ring-tyrant": {
      "id": "ring-tyrant",
      "name": "Ring Tyrant of the Fifth Road",
      "icon": "💍🐉",
      "hp": 248,
      "attack": 44,
      "xp": 360,
      "gold": 420,
      "weakness": "void",
      "specialName": "Ouroboros Verdict"
    },
    "abyssal-custodian": {
      "id": "abyssal-custodian",
      "name": "Abyssal Custodian",
      "icon": "🜏🛡️",
      "hp": 330,
      "attack": 60,
      "xp": 520,
      "gold": 430,
      "defenseBias": 8,
      "weakness": "radiation",
      "specialName": "Sixth Seal Collapse"
    },
    "last-equation": {
      "id": "last-equation",
      "name": "The Last Equation",
      "icon": "♾️🐉",
      "hp": 520,
      "attack": 82,
      "xp": 820,
      "gold": 700,
      "defenseBias": 12,
      "weakness": "gun",
      "specialName": "Proof of Extinction"
    },
    "road-merchant": {
      "id": "road-merchant",
      "name": "The Road Merchant",
      "icon": "🧔💰",
      "formula": true,
      "weakness": "nature",
      "specialName": "Hostile Acquisition",
      "enemyBarrier": 4
    },
    "bloodmage-boss": {
      "id": "bloodmage-boss",
      "name": "The Bloodmage",
      "icon": "🩸🔮",
      "formula": true,
      "weakness": "light",
      "specialName": "Hemorrhagic Tide",
      "bloodmageBoss": true
    },
    "pale-devil": {
      "id": "pale-devil",
      "name": "The Pale Devil",
      "icon": "👿🌙",
      "hp": 175,
      "attack": 31,
      "defenseBias": 5,
      "xp": 520,
      "gold": 666,
      "weakness": "light",
      "specialName": "Pale Moon Waltz",
      "devilBoss": true
    }
  };

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function createNormalRegistry(){return clone(ENEMY_DATA);}
  function createSpecialRegistry(){return clone(SPECIAL_ENEMY_DATA);}
  window.DiceboundEnemies=Object.freeze({apiVersion:2,createNormalRegistry,createSpecialRegistry});
})();
