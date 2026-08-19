(() => {
  "use strict";

  const PET_DATA={
    "neutral": {
      "id": "neutral",
      "name": "DiBo",
      "icon": "🎲",
      "element": null,
      "desc": "A cheerful d6 that rolls Fire, Ice, Electric, Nature, Light or Void for every attack."
    },
    "fire": {
      "id": "fire",
      "name": "Ember",
      "icon": "🦊",
      "element": "fire",
      "desc": "A Roadfox whose bite carries Fire."
    },
    "ice": {
      "id": "ice",
      "name": "Frostbite",
      "icon": "🐧",
      "element": "ice",
      "desc": "A tiny penguin with an Ice Nova sneeze."
    },
    "electric": {
      "id": "electric",
      "name": "Zapp",
      "icon": "🐭",
      "element": "electric",
      "desc": "A storm mouse crackling with Electric damage."
    },
    "light": {
      "id": "light",
      "name": "Halo",
      "icon": "🕊️",
      "element": "light",
      "desc": "A luminous dove that deals Light damage."
    },
    "void": {
      "id": "void",
      "name": "Nox",
      "icon": "🐈‍⬛",
      "element": "void",
      "desc": "A voidcat that stares directly through reality."
    },
    "nature": {
      "id": "nature",
      "name": "Sprig",
      "icon": "🦌",
      "element": "nature",
      "desc": "A green fawn whose vines strike enemies."
    },
    "donut": {
      "id": "donut",
      "name": "Sprinkle",
      "icon": "🍩",
      "element": "donut",
      "desc": "A sentient donut. It is somehow a combat pet."
    },
    "tech": {
      "id": "tech",
      "name": "Bit",
      "icon": "🤖",
      "element": "tech",
      "desc": "A small robot specialized in brain hacking."
    },
    "metal": {
      "id": "metal",
      "name": "Riff",
      "icon": "🐐",
      "element": "metal",
      "desc": "A metal goat that attacks with aggressively loud riffs."
    },
    "coffee": {
      "id": "coffee",
      "name": "Mocha",
      "icon": "🦉",
      "element": "coffee",
      "desc": "A caffeinated owl that refuses to blink."
    },
    "gun": {
      "id": "gun",
      "name": "Trigger",
      "icon": "🦝",
      "element": "gun",
      "desc": "A tiny gunslinger raccoon with extremely questionable licensing."
    },
    "radiation": {
      "id": "radiation",
      "name": "Glowbug",
      "icon": "☢️🐛",
      "element": "radiation",
      "desc": "A suspiciously luminous companion. Slightly stronger than DiBo and grants a small Element Power bonus while active."
    }
  };

  const PET_IDS=Object.freeze(Object.keys(PET_DATA));
  function createRegistry(){return JSON.parse(JSON.stringify(PET_DATA));}
  window.DiceboundPets=Object.freeze({apiVersion:1,ids:PET_IDS,createRegistry});
})();
