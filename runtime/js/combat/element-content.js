(() => {
  "use strict";

  // Canonical elemental content metadata. Mechanics remain in the existing
  // Combat/Pets/Progression owners; this focused content module only owns the
  // authored IDs, labels, spells and player-facing descriptions.
  const DATA = Object.freeze({
    fire:Object.freeze({icon:"🔥",name:"Fire",spell:"Fireball",description:"Deals 70% Attack damage and has a 25% chance to apply Burn."}),
    ice:Object.freeze({icon:"❄️",name:"Ice",spell:"Ice Nova",description:"Deals 70% Attack AoE damage and has a 25% chance to Freeze the selected target."}),
    electric:Object.freeze({icon:"⚡",name:"Electric",spell:"Thunderbolt",description:"Deals 70% Attack damage and has a 25% chance to Stun."}),
    light:Object.freeze({icon:"✨",name:"Light",spell:"Holy",description:"Deals 70% Attack damage to one target and heals the user's allied side."}),
    void:Object.freeze({icon:"🕳️",name:"Void",spell:"Black Hole",description:"Tears away a percentage of enemy maximum HP."}),
    nature:Object.freeze({icon:"🌿",name:"Nature",spell:"Poison Vines",description:"Deals pack damage and adds stackable Poison. Every Poison stack deals a percentage of your Attack each combat round."}),
    donut:Object.freeze({icon:"🍩",name:"Donut",spell:"Healing Rain of Donuts",description:"Deals AoE damage and gives focused single-target healing. Extremely serious magic."}),
    tech:Object.freeze({icon:"🤖",name:"Tech",spell:"Brain Hack",description:"Deals 30% Attack damage and lowers the target's Attack by 10% for the battle."}),
    metal:Object.freeze({icon:"🤘",name:"Metal",spell:"Hard Rock Metal Music",description:"Deals 70% Attack AoE damage and grants ultimate charge."}),
    coffee:Object.freeze({icon:"☕",name:"Coffee",spell:"Caffeinated Haste",description:"Grants an immediate extra action."}),
    gun:Object.freeze({icon:"🔫",name:"Gun",spell:"Deadeye Volley",description:"Deals 120% Attack single-target damage while piercing 75% of the target's Defense."}),
    radiation:Object.freeze({name:"Radiation",icon:"☢️",spell:"Irradiate",description:"Deals 40% Attack damage and lowers the target's Defense by 10% for the current battle."}),
    math:Object.freeze({name:"Math",icon:"🧮",spell:"Weaponized Equation",description:"Deals 30% Attack damage and has a 25% chance to Confuse, forcing the next offensive action to misfire into the attacker or an ally."})
  });
  const IDS=Object.freeze(Object.keys(DATA));
  const CORE_IDS=Object.freeze(["fire","ice","electric","nature","light","void"]);

  function createRegistry(){
    return Object.fromEntries(Object.entries(DATA).map(([id,value])=>[id,{...value}]));
  }

  window.DiceboundElementContent=Object.freeze({
    createRegistry,
    ids:IDS,
    coreIds:CORE_IDS
  });
})();
