(() => {
  "use strict";

  const ULTIMATE_BASE_MULTIPLIERS = Object.freeze({
    berserker: 2.8,
  });

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function percent(value) {
    return Math.round(number(value) * 100);
  }

  function ultimateBaseMultiplier(classId) {
    return ULTIMATE_BASE_MULTIPLIERS[classId] || null;
  }

  function ultimateBaseDamage(classId, run, flatDamage = 0) {
    const multiplier = ultimateBaseMultiplier(classId);
    if (multiplier === null) throw new RangeError(`No computed Ultimate profile for ${classId}`);
    return Math.round(number(run?.attack) * multiplier) + number(flatDamage);
  }

  function commonUltimateMultiplier(run, { chaosMultiplier = 1, setDamageBonus = 0 } = {}) {
    return number(chaosMultiplier, 1)
      * (1 + number(run?.classUltimateBonus))
      * (1 + number(run?.ultimateDamageBonus))
      * (1 + number(run?.damageBonus) + number(setDamageBonus));
  }

  function scaleUltimateDamage(baseDamage, run, options = {}) {
    return Math.round(number(baseDamage) * commonUltimateMultiplier(run, options));
  }

  function berserkerRageBonus(run) {
    const maxHp = Math.max(1, number(run?.maxHp, 1));
    const hp = number(run?.hp, maxHp);
    return Math.max(0, Math.min(0.99, 1 - hp / maxHp));
  }

  function berserkerRageMultiplier(run) {
    return 1 + berserkerRageBonus(run);
  }

  function scaleBerserkerRageDamage(damage, run) {
    return number(damage) * berserkerRageMultiplier(run);
  }

  function goldMultiplier(run, { nightmare = false } = {}) {
    return (1 + number(run?.goldBonus)) * (nightmare ? 0.5 : 1);
  }

  function scaleGold(baseGold, run, options = {}) {
    return Math.max(1, Math.round(number(baseGold) * goldMultiplier(run, options)));
  }

  function goldSnapshot(run, { nightmare = false } = {}) {
    const bonusMultiplier = 1 + number(run?.goldBonus);
    const difficultyMultiplier = nightmare ? 0.5 : 1;
    const effectiveMultiplier = bonusMultiplier * difficultyMultiplier;
    const effectivePercent = percent(effectiveMultiplier);
    return Object.freeze({
      baselinePercent: 100,
      bonusPercent: percent(number(run?.goldBonus)),
      bonusMultiplierPercent: percent(bonusMultiplier),
      difficultyMultiplierPercent: percent(difficultyMultiplier),
      effectiveMultiplier,
      effectivePercent,
      label: `${effectivePercent}%`,
      description: `Gold gain is ${effectivePercent}% of base rewards. 100% is baseline; Gold bonuses currently multiply that to ${percent(bonusMultiplier)}%, then ${nightmare ? "Nightmare/Hell" : "Normal"} difficulty applies ${percent(difficultyMultiplier)}%.`,
    });
  }

  function equipmentStatTotal(equipment, key, bonusesForItem = (item) => item?.bonuses || {}) {
    if (!equipment || typeof equipment !== "object") return 0;
    return Object.values(equipment).reduce((total, item) => {
      const bonuses = bonusesForItem(item);
      return total + number(bonuses?.[key]);
    }, 0);
  }

  function manaResourceSnapshot({
    baseMaxMana = 0,
    currentMana = 0,
    usesMana = false,
    equipmentMana = 0,
  } = {}) {
    const base = Math.max(0, number(baseMaxMana));
    const bonus = usesMana ? number(equipmentMana) : 0;
    const maxMana = usesMana ? Math.max(0, base + bonus) : 0;
    return Object.freeze({
      baseMaxMana: base,
      equipmentMana: bonus,
      maxMana,
      mana: Math.max(0, Math.min(maxMana, number(currentMana))),
    });
  }

  function berserkerUltimateSnapshot(run, { setDamageBonus = 0, rageActive = true } = {}) {
    const baseMultiplier = ultimateBaseMultiplier("berserker");
    const commonMultiplier = commonUltimateMultiplier(run, { setDamageBonus });
    const rageBonus = rageActive ? berserkerRageBonus(run) : 0;
    const rageMultiplier = 1 + rageBonus;
    const damageForFlat = (flatDamage) => Math.round(
      scaleUltimateDamage(ultimateBaseDamage("berserker", run, flatDamage), run, { setDamageBonus })
      * rageMultiplier,
    );
    return Object.freeze({
      baseMultiplier,
      commonMultiplier,
      rageBonus,
      effectiveAttackMultiplier: baseMultiplier * commonMultiplier * rageMultiplier,
      damageMin: damageForFlat(5),
      damageMax: damageForFlat(10),
    });
  }

  function describeUltimate(classId, classDefinition, run, options = {}) {
    if (classId !== "berserker") return String(classDefinition?.ultimate?.desc || "");
    const snapshot = berserkerUltimateSnapshot(run, options);
    const modifiers = [
      `Rage +${percent(snapshot.rageBonus)}%`,
      `Ultimate +${percent(run?.ultimateDamageBonus)}%`,
      `class Ultimate +${percent(run?.classUltimateBonus)}%`,
      `all damage +${percent(number(run?.damageBonus) + number(options.setDamageBonus))}%`,
    ];
    return `Ragequake smashes the enemy pack. Current core scaling: ${percent(snapshot.effectiveAttackMultiplier)}% Attack; current pre-defense hit: ${snapshot.damageMin}–${snapshot.damageMax}. ${modifiers.join(" · ")}.`;
  }

  window.DiceboundEffectiveStats = Object.freeze({
    apiVersion: 1,
    ultimateBaseMultiplier,
    ultimateBaseDamage,
    commonUltimateMultiplier,
    scaleUltimateDamage,
    berserkerRageBonus,
    berserkerRageMultiplier,
    scaleBerserkerRageDamage,
    berserkerUltimateSnapshot,
    describeUltimate,
    goldMultiplier,
    scaleGold,
    goldSnapshot,
    equipmentStatTotal,
    manaResourceSnapshot,
  });
})();
