(() => {
  "use strict";

  const freezeRows = (tables) => Object.freeze(Object.fromEntries(
    Object.entries(tables).map(([board, rows]) => [
      board,
      Object.freeze(rows.map(([rarity, weight]) => Object.freeze([rarity, weight]))),
    ]),
  ));

  const ARTIFACT_RATES = Object.freeze({
    normal: Object.freeze({
      1: Object.freeze({ mini: 0.005, boss: 0.01 }),
      2: Object.freeze({ mini: 0.01, boss: 0.02 }),
      3: Object.freeze({ mini: 0.02, boss: 0.03 }),
      4: Object.freeze({ mini: 0.03, boss: 0.05 }),
      5: Object.freeze({ mini: 0.05, boss: 0.07 }),
      6: Object.freeze({ mini: 0.07, boss: 0.10 }),
    }),
    nightmare: Object.freeze({
      1: Object.freeze({ mini: 0.01, boss: 0.02 }),
      2: Object.freeze({ mini: 0.025, boss: 0.04 }),
      3: Object.freeze({ mini: 0.04, boss: 0.06 }),
      4: Object.freeze({ mini: 0.06, boss: 0.09 }),
      5: Object.freeze({ mini: 0.09, boss: 0.13 }),
      6: Object.freeze({ mini: 0.13, boss: 0.18 }),
    }),
    hell: Object.freeze({
      1: Object.freeze({ mini: 0.02, boss: 0.04 }),
      2: Object.freeze({ mini: 0.05, boss: 0.07 }),
      3: Object.freeze({ mini: 0.07, boss: 0.10 }),
      4: Object.freeze({ mini: 0.10, boss: 0.14 }),
      5: Object.freeze({ mini: 0.14, boss: 0.20 }),
      6: Object.freeze({ mini: 0.20, boss: 0.28 }),
    }),
  });

  const MINI_GEAR_TABLES = freezeRows({
    1: [["common", 55], ["uncommon", 35], ["rare", 10]],
    2: [["common", 40], ["uncommon", 45], ["rare", 15]],
    3: [["common", 18], ["uncommon", 50], ["rare", 29], ["epic", 3]],
    4: [["uncommon", 50], ["rare", 42], ["epic", 7], ["legendary", 1]],
    5: [["uncommon", 32], ["rare", 52], ["epic", 14], ["legendary", 2]],
    6: [["uncommon", 20], ["rare", 60], ["epic", 18], ["legendary", 2]],
  });

  const BOSS_GEAR_TABLES = freezeRows({
    1: [["uncommon", 50], ["rare", 45], ["epic", 5]],
    2: [["uncommon", 35], ["rare", 52], ["epic", 13]],
    3: [["uncommon", 20], ["rare", 55], ["epic", 23], ["legendary", 2]],
    4: [["uncommon", 10], ["rare", 55], ["epic", 31], ["legendary", 4]],
    5: [["rare", 48], ["epic", 47], ["legendary", 5]],
    6: [["rare", 45], ["epic", 50], ["legendary", 5]],
  });

  const GEAR_LADDER = Object.freeze(["poor", "common", "uncommon", "rare", "epic", "legendary"]);
  const MINIBOSS_GEAR_CHANCES = Object.freeze({ normal: 0.85, nightmare: 0.92, hell: 1 });
  const SECRET_SIGNATURE_RATES = Object.freeze({ normal: 0.05, nightmare: 0.10, hell: 0.15 });
  const DEVIL_HORNS_RATE = 0.05;

  function modeKey({ nightmare = false, hell = false } = {}) {
    return hell ? "hell" : nightmare ? "nightmare" : "normal";
  }

  function artifactChance({ defeated, board, nightmare = false, hell = false } = {}) {
    if (!defeated?.miniBoss && !defeated?.finalBoss) return 0;
    const guardian = defeated.miniBoss ? "mini" : "boss";
    return ARTIFACT_RATES[modeKey({ nightmare, hell })]?.[board]?.[guardian] || 0;
  }

  function minibossGearChance({ nightmare = false, hell = false } = {}) {
    return MINIBOSS_GEAR_CHANCES[modeKey({ nightmare, hell })];
  }

  function secretSignatureRate({ kind, nightmare = false, hell = false } = {}) {
    if (kind === "devil") return DEVIL_HORNS_RATE;
    if (kind !== "merchant" && kind !== "bloodmage") return 0;
    return SECRET_SIGNATURE_RATES[modeKey({ nightmare, hell })];
  }

  function weightedRarity(rows, randomFn = Math.random) {
    if (!Array.isArray(rows) || !rows.length) throw new TypeError("DiceboundLoot.weightedRarity requires rows");
    if (typeof randomFn !== "function") throw new TypeError("DiceboundLoot requires a random function");
    let roll = Number(randomFn()) * rows.reduce((sum, row) => sum + row[1], 0);
    let rarity = rows[rows.length - 1][0];
    for (const row of rows) {
      roll -= row[1];
      if (roll <= 0) {
        rarity = row[0];
        break;
      }
    }
    return rarity;
  }

  function promoteRarity(rarity) {
    const index = GEAR_LADDER.indexOf(rarity);
    return index >= 0 ? GEAR_LADDER[Math.min(GEAR_LADDER.length - 1, index + 1)] : rarity;
  }

  function guardianRarity({ defeated, board, nightmare = false, hell = false, randomFn = Math.random } = {}) {
    const table = defeated?.miniBoss ? MINI_GEAR_TABLES : BOSS_GEAR_TABLES;
    const rows = table[board] || BOSS_GEAR_TABLES[6];
    let rarity = weightedRarity(rows, randomFn);
    if (nightmare && Number(randomFn()) < 0.25) rarity = promoteRarity(rarity);
    if (hell && Number(randomFn()) < 0.25) rarity = promoteRarity(rarity);
    return rarity;
  }

  function ordinaryGuardianDrop({ defeated, board, nightmare = false, hell = false, randomFn = Math.random } = {}) {
    if (typeof randomFn !== "function") throw new TypeError("DiceboundLoot requires a random function");
    if (defeated?.miniBoss) {
      if (Number(randomFn()) >= minibossGearChance({ nightmare, hell })) return null;
      return Object.freeze({ kind: "generated-equipment", rarity: guardianRarity({ defeated, board, nightmare, hell, randomFn }) });
    }
    if (defeated?.finalBoss) {
      return Object.freeze({ kind: "generated-equipment", rarity: guardianRarity({ defeated, board, nightmare, hell, randomFn }) });
    }
    if (defeated?.boss) return Object.freeze({ kind: "generated-equipment", rarity: null });
    return null;
  }

  window.DiceboundLoot = Object.freeze({
    apiVersion: 1,
    artifactRates: ARTIFACT_RATES,
    miniGearTables: MINI_GEAR_TABLES,
    bossGearTables: BOSS_GEAR_TABLES,
    gearLadder: GEAR_LADDER,
    minibossGearChances: MINIBOSS_GEAR_CHANCES,
    secretSignatureRates: SECRET_SIGNATURE_RATES,
    devilHornsRate: DEVIL_HORNS_RATE,
    modeKey,
    artifactChance,
    minibossGearChance,
    secretSignatureRate,
    weightedRarity,
    promoteRarity,
    guardianRarity,
    ordinaryGuardianDrop,
  });
})();
