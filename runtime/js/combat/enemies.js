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
      "name": "Demon",
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

  function createNormalRegistry(){return JSON.parse(JSON.stringify(ENEMY_DATA));}
  window.DiceboundEnemies=Object.freeze({apiVersion:1,createNormalRegistry});
})();
