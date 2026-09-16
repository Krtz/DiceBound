(() => {
  "use strict";

  const ENTRIES = Object.freeze([
    Object.freeze({ slot: "boots", weight: 30, label: "Titanstep, Boots of the Astral Road" }),
    Object.freeze({ slot: "legs", weight: 20, label: "Paradox Weave, Legguards Outside Time" }),
    Object.freeze({ slot: "ring", weight: 16, label: "Ouroboros Halo, Ring of the Fifth Road" }),
    Object.freeze({ slot: "hat", weight: 14, label: "Crown of the Road That Should Not Exist" }),
    Object.freeze({ slot: "amulet", weight: 9, label: "The Devourer's Last Eye" }),
    Object.freeze({ slot: "offhand", weight: 7, label: "Event Horizon Ward, Offhand Beyond the Sixth Road" }),
    Object.freeze({ slot: "weapon", weight: 4, label: "Impossible Road class weapon" }),
  ]);

  const TOTAL_WEIGHT = ENTRIES.reduce((sum, entry) => sum + entry.weight, 0);
  if (TOTAL_WEIGHT !== 100) {
    throw new Error(`DiceboundArtifacts weights must total 100, got ${TOTAL_WEIGHT}`);
  }
  const minimumEntries = ENTRIES.filter(
    (entry) => entry.weight === Math.min(...ENTRIES.map((candidate) => candidate.weight)),
  );
  if (minimumEntries.length !== 1 || minimumEntries[0].slot !== "weapon") {
    throw new Error("DiceboundArtifacts weapon weight must be the unique minimum");
  }

  let deps = null;
  function configure(next = {}) {
    for (const name of ["getPlayer", "random", "pick", "getElementKeys"]) {
      if (typeof next?.[name] !== "function") {
        throw new Error(`DiceboundArtifacts factories require ${name}().`);
      }
    }
    deps = next;
    return api;
  }
  function runtime() {
    if (!deps) throw new Error("DiceboundArtifacts factories must be configured before use.");
    return deps;
  }

  function pick(randomFn = Math.random) {
    if (typeof randomFn !== "function") {
      throw new TypeError("DiceboundArtifacts.pick requires a random function");
    }
    let roll = Number(randomFn()) * TOTAL_WEIGHT;
    for (const entry of ENTRIES) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }
    return ENTRIES[ENTRIES.length - 1];
  }

  function artifactize(item) {
    if (!item) return item;
    item.rarity = "artifact";
    item.artifact = true;
    item.mythical = false;
    item.v24Rarity = true;
    Object.keys(item.bonuses || {}).forEach((key) => {
      const value = item.bonuses[key];
      if (typeof value !== "number") return;
      item.bonuses[key] = Math.abs(value) < 1
        ? Math.round(value * .86 * 1000) / 1000
        : Math.round(value * .86);
    });
    return item;
  }

  function rawWeapon() {
    const rt = runtime(), player = rt.getPlayer(), classId = player.classId;
    if (classId === "merchant") return {
      id:`mythical_merchant_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",
      uniqueEffect:"Reality Rend and Compound Interest: every fifth attack guarantees an element, and attacks add 10% of current gold.",merchantWeaponScale:.10,
      icon:"💰",name:"Monopoly, Ledger of the Last Market",element:"coffee",bonuses:{attack:16,luck:.35,goldBonus:.70,bossDamage:.45}
    };
    if (classId === "vampire") return {
      id:`mythical_vampire_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",
      uniqueEffect:"Reality Rend: every fifth attack guarantees a strengthened Void activation.",icon:"🩸",name:"Nocturne, Fang of the Empty Sun",element:"void",
      bonuses:{attack:16,crit:.16,lifeSteal:.35,bossDamage:.40,maxHp:24}
    };
    if (classId === "ninja") return {
      id:`mythical_ninja_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",
      uniqueEffect:"Reality Rend: every fifth attack guarantees a strengthened Electric activation.",icon:"🥷",name:"Zero Footstep, Blade Between Frames",element:"electric",
      bonuses:{attack:16,crit:.35,doubleStrike:.25,dodge:.18,bossDamage:.40}
    };
    if (classId === "ceo") return {
      id:`mythical_ceo_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",
      uniqueEffect:"Reality Rend: every fifth attack guarantees Brain Hack; guardian rewards grant 50% more gold.",icon:"📈",name:"The Bottom Line, Executive Reality Cutter",element:"tech",
      bonuses:{attack:18,bossDamage:.65,goldBonus:.50,crit:.20,luck:.25}
    };
    const data={
      fighter:["Worldsplitter, Blade of the Last Road","🗡️",{attack:14,maxHp:24,defense:3,lifeSteal:.12,bossDamage:.35}],
      ranger:["Starpiercer, Bow Beyond Distance","🏹",{attack:12,crit:.20,dodge:.10,doubleStrike:.25,bossDamage:.35}],
      sorcerer:["Eventide, Staff of Infinite Sparks","🪄",{attack:15,crit:.12,lifeSteal:.18,classBurst:.20,bossDamage:.35}],
      monk:["Heaven's Knuckles, Hands of the Silent Road","🥊",{attack:13,dodge:.14,doubleStrike:.28,lifeSteal:.10,bossDamage:.30}],
      clown:["The Last Laugh, Impossible Rubber Chicken","🐔",{attack:11,crit:.22,luck:.25,doubleStrike:.25,bossDamage:.30}],
      rouge:["Vermilion, Brush of the Red Beyond","🖌️",{attack:14,crit:.16,lifeSteal:.24,doubleStrike:.16,bossDamage:.35}],
      berserker:["World-Ender, Axe of Ten Thousand Scars","🪓",{attack:17,maxHp:30,crit:.14,lifeSteal:.15,bossDamage:.40,damageBonus:.20}],
      turtle:["Atlas Shellbreaker, Hammer of Patient Worlds","🔨",{attack:10,maxHp:42,defense:9,bossDamage:.40,damageBonus:.12}],
      frog:["Ribbitus Maximus, Spear of Infinite Echoes","🐸",{attack:13,doubleStrike:.45,dodge:.18,crit:.15,bossDamage:.35}],
      d20:["The Unfair Die, Edge of Twenty Outcomes","🎲",{attack:14,crit:.20,doubleStrike:.20,luck:.30,bossDamage:.35}],
      slime:["Primordial Puddle, Weapon of Everything","🟢",{attack:14,maxHp:28,crit:.14,doubleStrike:.16,lifeSteal:.14,bossDamage:.35}],
    }[classId] || ["Worldsplitter","🗡️",{attack:14,bossDamage:.35}];
    return {
      id:`mythical_${classId}_${Date.now()}`,slot:"weapon",rarity:"mythical",mythical:true,mythicPiece:"weapon",setName:"Impossible Road",
      uniqueEffect:"Reality Rend: every fifth basic attack guarantees a strengthened elemental activation.",icon:data[1],name:data[0],
      element:rt.pick(rt.getElementKeys()),bonuses:data[2]
    };
  }

  function rawForSlot(slot) {
    const rt = runtime(), suffix = () => rt.random().toString(36).slice(2,6);
    switch (slot) {
      case "weapon": return rawWeapon();
      case "boots": return {id:`mythical_boots_${Date.now()}_${suffix()}`,slot:"boots",rarity:"mythical",mythical:true,mythicPiece:"boots",setName:"Impossible Road",uniqueEffect:"Titanstep: rolling 5 or 6 restores 5% max HP and grants 10 ultimate charge.",icon:"🥾",name:"Titanstep, Boots of the Astral Road",bonuses:{maxHp:20,defense:3,dodge:.15,extraStepChance:.25}};
      case "legs": return {id:`mythical_legs_${Date.now()}_${suffix()}`,slot:"legs",rarity:"mythical",mythical:true,mythicPiece:"legs",setName:"Impossible Road",uniqueEffect:"Paradox Loop: every third player action restores 6% max HP and grants 15 ultimate charge.",icon:"👖",name:"Paradox Weave, Legguards Outside Time",bonuses:{maxHp:34,defense:5,attack:5,doubleStrike:.16,luck:.14}};
      case "ring": return {id:`mythical_ring_${Date.now()}_${suffix()}`,slot:"ring",rarity:"mythical",mythical:true,mythicPiece:"ring",setName:"Impossible Road",uniqueEffect:"Ouroboros Halo: every fourth player action grants 1 barrier and 12 ultimate charge.",icon:"💍",name:"Ouroboros Halo, Ring of the Fifth Road",bonuses:{maxHp:22,attack:6,defense:4,crit:.12,luck:.18,bossDamage:.28}};
      case "hat": return {id:`mythical_hat_${Date.now()}_${suffix()}`,slot:"hat",rarity:"mythical",mythical:true,mythicPiece:"hat",setName:"Impossible Road",uniqueEffect:"Crown of the Fourth Road: after surviving a guardian special, restore 10% max HP and gain 25 ultimate charge.",icon:"👑",name:"Crown of the Road That Should Not Exist",bonuses:{maxHp:38,attack:7,defense:5,crit:.18,luck:.18,bossDamage:.45}};
      case "amulet": return {id:`mythical_amulet_${Date.now()}_${suffix()}`,slot:"amulet",rarity:"mythical",mythical:true,mythicPiece:"amulet",setName:"Impossible Road",uniqueEffect:"Devourer's Gaze: once per battle below 35% HP, consume 12% of every living enemy's max HP and heal for half the damage.",icon:"👁️",name:"The Devourer's Last Eye",bonuses:{maxHp:30,attack:8,crit:.15,luck:.20,lifeSteal:.10,bossDamage:.50}};
      case "offhand": return {id:`mythical_offhand_${Date.now()}_${suffix()}`,slot:"offhand",rarity:"mythical",mythical:true,mythicPiece:"offhand",setName:"Impossible Road",uniqueEffect:"Event Horizon Ward: Guard grants 8 additional Ultimate; every third Guard also raises one Barrier.",icon:"🌌🛡️",name:"Event Horizon Ward, Offhand Beyond the Sixth Road",bonuses:{maxHp:30,defense:7,attack:7,crit:.10,doubleStrike:.12,bossDamage:.32,flatReduction:2}};
      default: throw new Error(`Unknown Artifact item slot: ${slot}`);
    }
  }

  function create(slot) {
    return artifactize(rawForSlot(slot));
  }

  const api = Object.freeze({
    apiVersion: 1,
    entries: ENTRIES,
    totalWeight: TOTAL_WEIGHT,
    pick,
    configure,
    create,
  });
  window.DiceboundArtifacts = api;
})();
