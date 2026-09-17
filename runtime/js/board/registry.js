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
      "entryHeal": 0.10,
      "entryPotions": 1
    },
    "2": {
      "id": 2,
      "name": "Astral Road",
      "tiles": 100,
      "minibossTile": 50,
      "minibossId": "titan-guard",
      "bossId": "astral-devourer-dragon",
      "entryHeal": 0.12,
      "entryPotions": 1,
      "extraHp": 0.05,
      "extraAttack": 0.03,
      "extraDefense": 0
    },
    "3": {
      "id": 3,
      "name": "Fractured Road",
      "tiles": 100,
      "minibossTile": 50,
      "minibossId": "paradox-warden",
      "bossId": "nullstar-hydra",
      "entryHeal": 0.16,
      "entryPotions": 1,
      "extraHp": 0.11,
      "extraAttack": 0.07,
      "extraDefense": 1
    },
    "4": {
      "id": 4,
      "name": "Crown Road",
      "tiles": 64,
      "minibossTile": 32,
      "minibossId": "crownless-auditor",
      "bossId": "crown-eater",
      "entryHeal": 0.20,
      "entryPotions": 2,
      "extraHp": 0.18,
      "extraAttack": 0.12,
      "extraDefense": 2,
      "threePackChance": 0.24
    },
    "5": {
      "id": 5,
      "name": "Oblivion Ringroad",
      "tiles": 64,
      "minibossTile": 32,
      "minibossId": "ringbound-chancellor",
      "bossId": "ring-tyrant",
      "entryHeal": 0.16,
      "entryPotions": 2,
      "extraHp": 0.38,
      "extraAttack": 0.26,
      "extraDefense": 5,
      "threePackChance": 0.46
    },
    "6": {
      "id": 6,
      "name": "The Sixth Road · End of Mathematics",
      "tiles": 64,
      "minibossTile": 32,
      "minibossId": "abyssal-custodian",
      "bossId": "last-equation",
      "entryHeal": 0.20,
      "entryPotions": 2,
      "extraHp": 0.56,
      "extraAttack": 0.38,
      "extraDefense": 7,
      "threePackChance": 0.58,
      "balance": {"extraHp":1.65,"extraAttack":1.38,"extraDefenseMult":1.22,"extraDefenseFlat":12,"guardianHp":1.35,"guardianAttack":1.22,"threePackChance":0.95}
    }
  };

  function createRegistry(){return JSON.parse(JSON.stringify(BOARD_DATA));}
  window.DiceboundBoards=Object.freeze({apiVersion:1,createRegistry});
})();
