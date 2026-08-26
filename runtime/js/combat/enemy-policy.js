(() => {
  "use strict";

  const WOLF_ECHO_CHANCES = Object.freeze({
    5: Object.freeze({ normal: 0.25, nightmare: 0.35, hell: 0.45 }),
    6: Object.freeze({ normal: 0.30, nightmare: 0.40, hell: 0.50 }),
  });
  const DEVIL_FLAME_MODE_BONUSES = Object.freeze({ normal: 0, nightmare: 0.30, hell: 0.60 });

  function boardNumber(board) {
    return Math.min(6, Math.max(1, Math.floor(Number(board) || 1)));
  }

  function modeId(mode) {
    const value = String(mode || "normal").toLowerCase();
    return value === "hell" ? "hell" : value === "nightmare" ? "nightmare" : "normal";
  }

  function wolfEchoChance(board, mode = "normal") {
    return WOLF_ECHO_CHANCES[boardNumber(board)]?.[modeId(mode)] || 0;
  }

  function standardDevilFlameChance(board, mode = "normal") {
    return Number(Math.min(0.90, boardNumber(board) * 0.05 + DEVIL_FLAME_MODE_BONUSES[modeId(mode)]).toFixed(2));
  }

  // #156: standard Slimes scale their innate Radiation chance from Slimes
  // defeated earlier in the current expedition. The combat/run owner supplies
  // that persisted per-run count; this policy remains pure and deterministic.
  function slimeRadiationChance(slimesKilledEarlierThisRun = 0) {
    const kills = Math.max(0, Math.floor(Number(slimesKilledEarlierThisRun) || 0));
    return Number(Math.min(1, kills * 0.05).toFixed(2));
  }

  window.DiceboundEnemyPolicy = Object.freeze({
    apiVersion: 1,
    boardNumber,
    modeId,
    wolfEchoChance,
    standardDevilFlameChance,
    slimeRadiationChance,
  });
})();
