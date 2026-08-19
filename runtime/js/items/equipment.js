(() => {
  "use strict";

  const rarityApi=window.DiceboundRarities;
  if(!rarityApi)throw new Error("DiceboundEquipment requires DiceboundRarities before loading.");

  const EQUIPMENT_DATA={slots:[
    "weapon",
    "offhand",
    "boots",
    "legs",
    "chest",
    "hat",
    "ring",
    "amulet"
  ],labels:{
    "weapon": "Weapon",
    "offhand": "Offhand",
    "boots": "Boots",
    "legs": "Legs",
    "chest": "Chest",
    "hat": "Hat",
    "ring": "Ring",
    "amulet": "Amulet"
  },rarities:[...rarityApi.ids],ordinaryRarities:["poor","common","uncommon","rare","epic"],special:{
    "axels-coffee-mug": {
      "id": "axels-coffee-mug",
      "name": "Axel's Coffee Mug",
      "slot": "offhand",
      "rarity": "legendary"
    },
    "kratz-headphones": {
      "id": "kratz-headphones",
      "name": "Kratz Headphones",
      "slot": "hat",
      "rarity": "legendary"
    },
    "kellys-jean-jacket": {
      "id": "kellys-jean-jacket",
      "name": "The Jean Jacket Lost at Kelly's",
      "slot": "chest",
      "rarity": "legendary"
    },
    "devils-horns": {
      "id": "devils-horns",
      "name": "The Devil's Horns",
      "slot": "hat",
      "rarity": "omega"
    },
    "impossible-weapon": {
      "id": "impossible-weapon",
      "name": "Impossible Road Weapon",
      "slot": "weapon",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-offhand": {
      "id": "impossible-offhand",
      "name": "Impossible Road Offhand",
      "slot": "offhand",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-boots": {
      "id": "impossible-boots",
      "name": "Impossible Road Boots",
      "slot": "boots",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-legs": {
      "id": "impossible-legs",
      "name": "Impossible Road Legs",
      "slot": "legs",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-hat": {
      "id": "impossible-hat",
      "name": "Impossible Road Hat",
      "slot": "hat",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-ring": {
      "id": "impossible-ring",
      "name": "Impossible Road Ring",
      "slot": "ring",
      "rarity": "artifact",
      "setName": "Impossible Road"
    },
    "impossible-amulet": {
      "id": "impossible-amulet",
      "name": "Impossible Road Amulet",
      "slot": "amulet",
      "rarity": "artifact",
      "setName": "Impossible Road"
    }
  }};

  function createRegistry(){return JSON.parse(JSON.stringify(EQUIPMENT_DATA));}
  window.DiceboundEquipment=Object.freeze({apiVersion:1,createRegistry});
})();
