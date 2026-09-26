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

  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const unitRatio = unit => {
    const maxHp = Math.max(1, Number(unit?.entity?.maxHp ?? unit?.maxHp) || 1);
    return Math.max(0, Number(unit?.entity?.hp ?? unit?.hp) || 0) / maxHp;
  };
  const roll01 = random => Math.max(0, Math.min(.999999999, Number(random?.()) || 0));

  function playerSideCandidates(hero, allies = []) {
    const result = [];
    if (hero && Number(hero.hp) > 0) {
      result.push(Object.freeze({
        kind: "hero",
        id: "hero",
        name: hero.name || "you",
        entity: hero,
        threatWeight: 1
      }));
    }
    for (const ally of Array.isArray(allies) ? allies : []) {
      if (!ally || Number(ally.hp) <= 0 || ally.targetable === false) continue;
      const threatWeight = Math.max(0, Number(ally.threatWeight) || 0);
      if (threatWeight <= 0) continue;
      result.push(Object.freeze({
        kind: "summon",
        id: String(ally.instanceId || ally.id || ""),
        name: ally.name || ally.archetypeId || "summon",
        entity: ally,
        threatWeight
      }));
    }
    return Object.freeze(result);
  }

  function weightedSummon(candidates, normalizedRoll) {
    const summons = candidates.filter(candidate => candidate.kind === "summon" && candidate.threatWeight > 0);
    if (!summons.length) return null;
    const total = summons.reduce((sum, candidate) => sum + candidate.threatWeight, 0);
    let cursor = Math.max(0, Math.min(.999999999, Number(normalizedRoll) || 0)) * total;
    for (const summon of summons) {
      cursor -= summon.threatWeight;
      if (cursor < 0) return summon;
    }
    return summons[summons.length - 1];
  }

  // One RNG draw is enough for the whole default bucket policy. Keeping the
  // residual roll inside the summon bucket makes threat changes deterministic
  // without adding a second random draw.
  function resolvePlayerSideSingleTarget({
    hero,
    allies = [],
    random = Math.random,
    policy = "weighted",
    heroShare = .5
  } = {}) {
    const candidates = playerSideCandidates(hero, allies);
    if (!candidates.length) return null;
    const heroTarget = candidates.find(candidate => candidate.kind === "hero") || null;
    const summons = candidates.filter(candidate => candidate.kind === "summon");
    if (!summons.length) return heroTarget || candidates[0];

    if (policy === "heroOnly") return heroTarget;
    if (policy === "summonOnly") return weightedSummon(candidates, roll01(random));
    if (policy === "lowestHp") {
      return candidates.slice().sort((a, b) => unitRatio(a) - unitRatio(b) || String(a.id).localeCompare(String(b.id)))[0] || null;
    }
    if (policy === "randomAlly") {
      return candidates[Math.floor(roll01(random) * candidates.length)] || candidates[candidates.length - 1];
    }

    const share = heroTarget ? clamp01(heroShare) : 0;
    const roll = roll01(random);
    if (heroTarget && roll < share) return heroTarget;
    const residual = share >= 1 ? 0 : (roll - share) / Math.max(Number.EPSILON, 1 - share);
    return weightedSummon(candidates, residual) || heroTarget;
  }

  function resolvePlayerSideTargets({ hero, allies = [], policy = "allAllies" } = {}) {
    const candidates = playerSideCandidates(hero, allies);
    if (policy === "heroOnly") return Object.freeze(candidates.filter(candidate => candidate.kind === "hero"));
    if (policy === "summonOnly") return Object.freeze(candidates.filter(candidate => candidate.kind === "summon"));
    return candidates;
  }

  window.DiceboundCombatTargeting = Object.freeze({
    apiVersion: 2,
    isLiving,
    normalizedIndex,
    resolveLivingIndex,
    resolveLivingTarget,
    nextLivingTarget,
    playerSideCandidates,
    resolvePlayerSideSingleTarget,
    resolvePlayerSideTargets
  });
})();
