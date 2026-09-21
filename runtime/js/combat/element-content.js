(() => {
  "use strict";

  // Canonical elemental content metadata. Mechanics remain in the existing
  // Combat/Pets/Progression owners; this focused content module only owns the
  // authored IDs, labels, spells and player-facing descriptions.
  const DATA = Object.freeze({
    fire:Object.freeze({icon:"🔥",name:"Fire",spell:"Fireball",description:"Deals a burst of bonus damage."}),
    ice:Object.freeze({icon:"❄️",name:"Ice",spell:"Ice Nova",description:"Deals damage and freezes the enemy for one turn."}),
    electric:Object.freeze({icon:"⚡",name:"Electric",spell:"Thunderbolt",description:"Deals heavy lightning damage."}),
    light:Object.freeze({icon:"✨",name:"Light",spell:"Holy",description:"Deals damage and restores HP."}),
    void:Object.freeze({icon:"🕳️",name:"Void",spell:"Black Hole",description:"Tears away a percentage of enemy maximum HP."}),
    nature:Object.freeze({icon:"🌿",name:"Nature",spell:"Poison Vines",description:"Deals pack damage and adds stackable Poison. Every Poison stack deals a percentage of your Attack each combat round."}),
    donut:Object.freeze({icon:"🍩",name:"Donut",spell:"Healing Rain of Donuts",description:"Restores a generous amount of HP. Extremely serious magic."}),
    tech:Object.freeze({icon:"🤖",name:"Tech",spell:"Brain Hack",description:"Deals damage and permanently lowers enemy attack."}),
    metal:Object.freeze({icon:"🤘",name:"Metal",spell:"Hard Rock Metal Music",description:"Deals sonic damage and grants ultimate charge."}),
    coffee:Object.freeze({icon:"☕",name:"Coffee",spell:"Caffeinated Haste",description:"Grants an immediate extra action."}),
    gun:Object.freeze({icon:"🔫",name:"Gun",spell:"Deadeye Volley",description:"Fires a piercing shot for heavy single-target damage, ignoring most of the target's Defense."}),
    radiation:Object.freeze({name:"Radiation",icon:"☢️",spell:"Irradiate",description:"Deals elemental damage and lowers the target's Defense by 10% for the current battle."}),
    math:Object.freeze({name:"Math",icon:"🧮",spell:"Weaponized Equation",description:"Deals damage and may Confuse the target, forcing its next offensive action to misfire into itself or an ally."})
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
