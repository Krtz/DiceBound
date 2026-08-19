(() => {
  "use strict";

  const BOARD_DATA={
    "1": {
      "id": 1,
      "name": "Green Road",
      "tiles": 100,
      "minibossTile": 50,
      "minibossId": "ogre-roadwarden",
      "bossId": "ancient-road-dragon",
      "entryHeal": 0,
      "entryPotions": 0
    },
    "2": {
      "id": 2,
      "name": "Astral Road",
      "tiles": 100,
      "minibossTile": 50,
      "minibossId": "titan-guard",
      "bossId": "astral-devourer-dragon",
      "entryHeal": 0.35,
      "entryPotions": 1
    },
    "3": {
      "id": 3,
      "name": "Fractured Road",
      "tiles": 100,
      "minibossTile": 50,
      "minibossId": "paradox-warden",
      "bossId": "nullstar-hydra",
      "entryHeal": 0.28,
      "entryPotions": 2
    },
    "4": {
      "id": 4,
      "name": "Crown Road",
      "tiles": 64,
      "minibossTile": 32,
      "minibossId": "crownless-auditor",
      "bossId": "crown-eater",
      "entryHeal": 0.22,
      "entryPotions": 3
    },
    "5": {
      "id": 5,
      "name": "Oblivion Ringroad",
      "tiles": 64,
      "minibossTile": 32,
      "minibossId": "ringbound-chancellor",
      "bossId": "ring-tyrant",
      "entryHeal": 0.18,
      "entryPotions": 3
    },
    "6": {
      "id": 6,
      "name": "The Sixth Road · End of Mathematics",
      "tiles": 64,
      "minibossTile": 32,
      "minibossId": "abyssal-custodian",
      "bossId": "last-equation",
      "entryHeal": 0.03,
      "entryPotions": 1,
      "balance": {"extraHp":1.65,"extraAttack":1.38,"extraDefenseMult":1.22,"extraDefenseFlat":12,"guardianHp":1.35,"guardianAttack":1.22,"threePackChance":0.95}
    }
  };

  function createRegistry(){return JSON.parse(JSON.stringify(BOARD_DATA));}
  window.DiceboundBoards=Object.freeze({apiVersion:1,createRegistry});
})();
