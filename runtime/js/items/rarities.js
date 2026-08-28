(() => {
  "use strict";

  const RARITY_INFO_DATA={
    "common": {
      "label": "Common",
      "weight": 25
    },
    "uncommon": {
      "label": "Uncommon",
      "weight": 7.5
    },
    "rare": {
      "label": "Rare",
      "weight": 1.9
    },
    "epic": {
      "label": "Epic",
      "weight": 0.42
    },
    "legendary": {
      "label": "Legendary",
      "weight": 0.028
    },
    "mythical": {
      "label": "Mythical",
      "weight": 0
    },
    "omega": {
      "label": "Omega",
      "weight": 0
    },
    "poor": {
      "label": "Poor",
      "weight": 68
    },
    "artifact": {
      "label": "Artifact",
      "weight": 0.003
    }
  };

  const RARITY_VALUE_DATA={
    "common": 2,
    "uncommon": 3,
    "rare": 4,
    "epic": 5,
    "legendary": 7,
    "mythical": 11,
    "omega": 14,
    "poor": 1,
    "artifact": 9
  };

  const RARITY_IDS=Object.freeze(Object.keys(RARITY_INFO_DATA));
  // Powerup offers deliberately use the normal progression only. Artifact and
  // Omega are distinct content types, so their display order must never make
  // them implicitly eligible for a "Rare+" reward.
  const POWERUP_PROGRESSION=Object.freeze(["common","uncommon","rare","epic","legendary","mythical"]);
  function createInfoRegistry(){return JSON.parse(JSON.stringify(RARITY_INFO_DATA));}
  function createValueRegistry(){return JSON.parse(JSON.stringify(RARITY_VALUE_DATA));}
  function isPowerupRarityAtLeast(rarity,floor="rare"){
    const rarityIndex=POWERUP_PROGRESSION.indexOf(String(rarity||"").toLowerCase());
    const floorIndex=POWERUP_PROGRESSION.indexOf(String(floor||"").toLowerCase());
    return rarityIndex>=0&&floorIndex>=0&&rarityIndex>=floorIndex;
  }
  window.DiceboundRarities=Object.freeze({apiVersion:1,ids:RARITY_IDS,powerupProgression:POWERUP_PROGRESSION,createInfoRegistry,createValueRegistry,isPowerupRarityAtLeast});
})();
