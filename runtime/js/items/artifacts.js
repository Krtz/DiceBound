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

  window.DiceboundArtifacts = Object.freeze({
    apiVersion: 1,
    entries: ENTRIES,
    totalWeight: TOTAL_WEIGHT,
    pick,
  });
})();
