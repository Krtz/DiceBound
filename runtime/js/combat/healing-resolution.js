(() => {
  "use strict";

  const OWNER = "combat/healing-resolution";
  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatHealingResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Healing-resolution runtime is required.");
    const required = [
      "getPlayer", "getCurrentEnemy", "ensureAlphaMeta", "setStatsLastHp", "saveMeta",
      "checkDynamicClassUnlocks", "isClassActive", "clamp", "identityFlash",
      "addCombatHistory", "syncShieldBars", "syncOuroborosAttack"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Healing-resolution runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function player() { return requireRuntime().getPlayer(); }

  // Lifetime healing accounting deliberately happens inside the base healing
  // transaction, before class-resource and overheal-item follow-up layers.
  function recordHealing(amount) {
    const rt = requireRuntime(), p = player();
    amount = Math.max(0, Math.round(amount || 0));
    if (!amount) return 0;
    const stats = rt.ensureAlphaMeta();
    stats.healingDone += amount;
    rt.setStatsLastHp(p.hp);
    rt.saveMeta();
    rt.checkDynamicClassUnlocks();
    return amount;
  }

  function healPlayer(amount, { overheal = true } = {}) {
    const rt = requireRuntime(), p = player();
    const raw = Math.max(0, Math.round(amount || 0));

    // V24 / V26 / V27 all snapshot these values before delegating to the older
    // healing chain. Keeping one shared snapshot preserves their excess-heal
    // calculations while making the historical wrapper order explicit.
    const beforeHp = p.hp;
    const beforeMax = p.maxHp;
    const normalRoom = Math.max(0, beforeMax - beforeHp);
    const beforeFaith = p.clericFaith || 0;
    const beforeGrace = p.paladinGrace || 0;

    let healed = 0;
    if (raw > 0) {
      const missing = Math.max(0, p.maxHp - p.hp);
      const normal = Math.min(missing, raw);
      p.hp += normal;
      let bonus = 0;
      if (overheal && p.bloodOverheal && raw > normal) {
        const room = Math.max(0, 20 - (p.bloodOverhealBonus || 0));
        bonus = Math.min(room, raw - normal);
        if (bonus > 0) {
          p.bloodOverhealBonus = (p.bloodOverhealBonus || 0) + bonus;
          p.maxHp += bonus;
          p.hp += bonus;
        }
      }
      healed = normal + bonus;
      if (healed > 0) recordHealing(healed);
    }

    // Historical V13 then V18 Cleric layers.
    if (rt.isClassActive("cleric") && healed > 0) {
      p.clericFaith = rt.clamp((p.clericFaith || 0) + healed * 2, 0, 100);
    }
    if (rt.isClassActive("cleric") && healed > 0 && p.clericFaithGainBonus) {
      const baseAdded = Math.max(0, (p.clericFaith || 0) - beforeFaith);
      const extra = Math.round(baseAdded * p.clericFaithGainBonus);
      p.clericFaith = rt.clamp((p.clericFaith || 0) + extra, 0, 100);
    }

    // Historical V19 then V21 Paladin layers. The bonus layer intentionally
    // checks literal classId while the base Grace layer uses identity activity.
    if (rt.isClassActive("paladin") && healed > 0) {
      p.paladinGrace = rt.clamp((p.paladinGrace || 0) + healed, 0, 100);
      if (p.hp > beforeHp) rt.identityFlash(`⚜️ Grace ${Math.round(p.paladinGrace)}/100`);
    }
    if (p.classId === "paladin" && healed > 0 && (p.paladinGraceGainBonus || 0) > 0) {
      const normalGain = Math.max(0, (p.paladinGrace || 0) - beforeGrace);
      const extra = Math.round(normalGain * p.paladinGraceGainBonus);
      p.paladinGrace = rt.clamp((p.paladinGrace || 0) + extra, 0, 100);
    }

    const maxGrowth = Math.max(0, p.maxHp - beforeMax);
    const excess = Math.max(0, raw - normalRoom - maxGrowth);

    // Historical V24 Devil's Horns layer.
    if (p.equipment?.hat?.devilHorns && raw > normalRoom && excess > 0) {
      p.energyShield = Math.min(p.maxHp, (p.energyShield || 0) + excess);
      p.energyShieldCap = p.maxHp;
      rt.addCombatHistory(`🔵 Devil's Horns convert ${excess} overhealing into Energy Shield.`);
    }

    // Historical V26 Philosopher's Stone layer.
    if (p.equipment?.amulet?.bloodmageStone && rt.getCurrentEnemy() && raw > normalRoom && excess > 0) {
      const shieldGain = excess * .05;
      const attackGain = excess * .01;
      p.energyShield = Math.min(p.maxHp, (p.energyShield || 0) + shieldGain);
      if (rt.isClassActive("ouroboros")) {
        const echoGain = attackGain * .10;
        p.doubleStrike += echoGain;
        p.v26StoneBattleEcho = (p.v26StoneBattleEcho || 0) + echoGain;
      } else {
        p.attack += attackGain;
        p.v26StoneBattleAttack = (p.v26StoneBattleAttack || 0) + attackGain;
      }
      rt.addCombatHistory(`🜂 Philosopher's Stone transmutes ${excess} overheal into +${shieldGain.toFixed(1)} Energy Shield and +${attackGain.toFixed(2)} temporary Attack${p.classId === 'ouroboros' ? ' (converted to Echo)' : ''}.`);
    }

    // Historical V27 Crimson Aegis is outermost and always refreshes Shield UI.
    const aegisRate = p.legendaryOverhealShieldRate || 0;
    if (aegisRate > 0 && raw > normalRoom && excess > 0) {
      const gain = excess * aegisRate;
      p.energyShield = Math.min(p.maxHp, (p.energyShield || 0) + gain);
      if (rt.getCurrentEnemy()) rt.addCombatHistory(`🩸🔵 Crimson Aegis turns ${excess} overheal into +${gain.toFixed(1)} Energy Shield.`);
    }
    rt.syncShieldBars();
    return healed;
  }

  function clearBloodOverhealTemp() {
    const rt = requireRuntime(), p = player();
    const bonus = Math.max(0, p.bloodOverhealBonus || 0);
    if (!bonus) return;
    p.maxHp = Math.max(1, p.maxHp - bonus);
    p.hp = Math.min(p.hp, p.maxHp);
    p.bloodOverhealBonus = 0;
    rt.setStatsLastHp(p.hp);
  }

  function clearStoneBattle() {
    const rt = requireRuntime(), p = player();
    const attack = Number(p.v26StoneBattleAttack) || 0;
    const echo = Number(p.v26StoneBattleEcho) || 0;
    if (attack) p.attack -= attack;
    if (echo) p.doubleStrike = Math.max(0, p.doubleStrike - echo);
    p.v26StoneBattleAttack = 0;
    p.v26StoneBattleEcho = 0;
    if (rt.isClassActive("ouroboros")) rt.syncOuroborosAttack();
  }

  const api = Object.freeze({
    owner: OWNER,
    configure,
    recordHealing,
    healPlayer,
    clearBloodOverhealTemp,
    clearStoneBattle
  });

  window.DiceboundCombatHealingResolution = api;
})();
