(() => {
  "use strict";

  /* Strike semantics are independent from combat state.  The runtime injects
     its RNG-backed roll so an Echo remains non-critical while retaining the
     existing one-roll-per-strike RNG cadence. */
  function resolveCriticalTiers(rollTieredProc, {
    canCrit = true,
    critChance = 0,
    bonusCrit = 0,
  } = {}) {
    if (typeof rollTieredProc !== "function") throw new TypeError("resolveCriticalTiers requires rollTieredProc");
    return canCrit
      ? rollTieredProc(critChance) + Math.max(0, Number(bonusCrit) || 0)
      : rollTieredProc(0);
  }

  function rangerMarkTotal(before, { cap = 3, landed = false } = {}) {
    const current = Math.max(0, Math.floor(Number(before) || 0));
    const maximum = Math.max(1, Math.floor(Number(cap) || 3));
    return landed ? Math.min(maximum, current + 1) : current;
  }

  window.DiceboundStrikePolicy = Object.freeze({
    apiVersion: 1,
    resolveCriticalTiers,
    rangerMarkTotal,
  });
})();
