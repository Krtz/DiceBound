(() => {
  "use strict";

  /*
   * Event rewards deliberately own only the pure numbers and probabilities.
   * The live runtime supplies its already-authoritative Gold modifier when it
   * pays a result, so this module cannot accidentally introduce a second
   * multiplier or consume RNG.
   */
  const EVENT_GOLD = Object.freeze({
    base: 50,
    perLevel: 20,
    sourceMultiplier: Object.freeze({
      talentRank: 0.35,
      slotPair: 1,
      slotJackpot: 1.6,
      slotPity: 0.25,
      wheel: 1.25
    })
  });

  function adventurerLevel(level) {
    return Math.max(1, Math.floor(Number(level) || 1));
  }

  function baseGold(level) {
    return EVENT_GOLD.base + EVENT_GOLD.perLevel * adventurerLevel(level);
  }

  function goldBaseFor(source, level, multiplier = 1) {
    const sourceMultiplier = EVENT_GOLD.sourceMultiplier[source];
    if (!Number.isFinite(sourceMultiplier)) throw new Error(`Unknown event-Gold source: ${source}`);
    return Math.max(1, Math.round(baseGold(level) * sourceMultiplier * Math.max(0, Number(multiplier) || 0)));
  }

  /* Fixed cutoffs preserve the one road-tile RNG roll.  Slots become roughly
   * half as common, while the reclaimed space becomes ordinary encounters. */
  function roadTileCutoffs(board) {
    return Number(board) >= 5
      ? Object.freeze({ enemy: 0.75, slot: 0.82, treasure: 0.98 })
      : Object.freeze({ enemy: 0.72, slot: 0.80, treasure: 0.98 });
  }

  function roadTileType(roll, board) {
    const cutoffs = roadTileCutoffs(board), value = Number(roll) || 0;
    if (value < cutoffs.enemy) return "enemy";
    if (value < cutoffs.slot) return "event";
    if (value < cutoffs.treasure) return "treasure";
    return "empty";
  }

  /* The number and order of rolls stay unchanged; only their thresholds grow
   * so a rare slot visit has meaningfully better match odds. */
  function slotMatchOdds(luck = 0) {
    const value = Math.max(0, Number(luck) || 0);
    return Object.freeze({
      secondMatch: Math.min(0.78, 0.30 + value),
      tripleFromPair: Math.min(0.88, 0.42 + value),
      pairFromMiss: Math.min(0.72, 0.30 + value * 0.55)
    });
  }

  window.DiceboundEventRewards = Object.freeze({
    apiVersion: 1,
    gold: EVENT_GOLD,
    adventurerLevel,
    baseGold,
    goldBaseFor,
    roadTileCutoffs,
    roadTileType,
    slotMatchOdds
  });
})();
