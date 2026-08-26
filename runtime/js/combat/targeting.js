(() => {
  "use strict";

  function isLiving(enemy) {
    return Number(enemy?.hp) > 0;
  }

  function normalizedIndex(enemies, requestedIndex = 0) {
    const length = Array.isArray(enemies) ? enemies.length : 0;
    if (!length) return -1;
    const numeric = Number.isFinite(Number(requestedIndex)) ? Math.trunc(Number(requestedIndex)) : 0;
    return ((numeric % length) + length) % length;
  }

  // Starting at the requested index is intentional: a living selected target
  // stays selected, while a defeated one advances forward through the pack and
  // wraps only when needed. This is policy, not DOM state.
  function resolveLivingIndex(enemies, requestedIndex = 0) {
    const length = Array.isArray(enemies) ? enemies.length : 0;
    const start = normalizedIndex(enemies, requestedIndex);
    if (start < 0) return -1;
    for (let offset = 0; offset < length; offset += 1) {
      const index = (start + offset) % length;
      if (isLiving(enemies[index])) return index;
    }
    return -1;
  }

  function resolveLivingTarget(enemies, requestedIndex = 0) {
    const index = resolveLivingIndex(enemies, requestedIndex);
    return Object.freeze({ index, enemy: index < 0 ? null : enemies[index] });
  }

  function nextLivingTarget(enemies, defeatedIndex = 0) {
    return resolveLivingTarget(enemies, Number(defeatedIndex) + 1);
  }

  window.DiceboundCombatTargeting = Object.freeze({
    apiVersion: 1,
    isLiving,
    normalizedIndex,
    resolveLivingIndex,
    resolveLivingTarget,
    nextLivingTarget,
  });
})();
