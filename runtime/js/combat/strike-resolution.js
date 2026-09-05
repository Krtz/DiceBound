(() => {
  "use strict";

  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatStrikeResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat strike-resolution runtime is required.");
    const required = [
      "getPlayer","getEncounterLead","livingEnemies","isClassActive","random","rand","pick","clamp","rollTieredProc",
      "resolveCriticalTiers","rangerMarkTotal","setDamageBonus","petDamage","healPlayer","damageEnemy","animateClassAttack",
      "playElementAnimation","addCombatHistory","updateCombatUI","setCombatText","playHolySfx","triggerStrikeElements",
      "triggerElementEffect","identityFlash","reconcileDefeatedTarget","presentationTargetSnapshot","emitStrike","renderStrike",
      "delay","chargeUltimate","hasDevilsHorns","hasLegendaryEffect","syncOuroborosAttack","syncOuroborosEconomy",
      "getFastEchoCap","setFastEchoCap","getV26FastEcho","setV26FastEcho","getElementKeys"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat strike-resolution runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function player() { return requireRuntime().getPlayer(); }
  function livingEnemies() { return requireRuntime().livingEnemies(); }

  // This is the original strikeBaseDamage body. It deliberately receives a
  // canCrit value that is always true through the historical wrapper stack:
  // V13/V15/V26/DB060 all dropped the third argument before reaching this
  // body. That means criticalEchoBonus still scales Echo damage even when the
  // calling strike itself has canCrit:false. 0.6.6.3 preserves that behavior.
  function baseStrikeDamage(echo = false, chaos = null, { canCrit = true } = {}) {
    const rt = requireRuntime(), p = player();
    let attack = p.attack + (p.goldAttackScale ? Math.floor(p.gold * p.goldAttackScale) : 0);
    let damage = Math.max(1, Math.round(attack + p.defense * p.defenseAttackScale) + rt.rand(-1, 2)), burst = "";
    if (rt.isClassActive("sorcerer") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.5); burst = "Arcane Surge! "; }
    if (rt.isClassActive("monk") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.35); p.ultimateCharge = rt.clamp(p.ultimateCharge + 6, 0, 100); burst = "Flowing Combo! "; }
    if (rt.isClassActive("clown") && rt.random() < p.classBurst) { damage = Math.round(damage * (.9 + rt.random() * 1.1)); burst = "Unlicensed Comedy! "; }
    if (rt.isClassActive("rouge") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.45); burst = "Crimson Stroke! "; }
    if (rt.isClassActive("berserker") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.55); burst = "Blood Frenzy! "; }
    if (rt.isClassActive("frog") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.35); burst = "Resonant Croak! "; }
    if (rt.isClassActive("vampire") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.5); burst = "Blood Frenzy! "; }
    if (rt.isClassActive("ninja") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.6); burst = "Perfect Ambush! "; }
    if (rt.isClassActive("ceo") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.55); p.gold += 5; burst = "Quarterly Growth! "; }
    if (rt.isClassActive("merchant") && rt.random() < p.classBurst) { damage = Math.round(damage * 1.6); p.gold += 10; burst = "Excellent Margin! "; }
    if (p.combatAttackCount === 0 && p.firstAttackBonus > 0) damage = Math.round(damage * (1 + p.firstAttackBonus));
    if (p.hp / p.maxHp < .5) damage = Math.round(damage * (1 + p.berserk));
    if (echo) damage = Math.max(1, Math.round(damage * (p.echoDamageScale || .70) * (canCrit && p.criticalEchoBonus ? 1 + p.criticalEchoBonus : 1)));
    const weapon = p.equipment?.weapon;
    if (weapon?.merchantWeapon) damage += Math.floor(p.gold * (weapon.merchantWeaponScale || 1));
    if (livingEnemies().length >= 2 && p.packDamageBonus) damage = Math.round(damage * (1 + p.packDamageBonus));
    damage = Math.round(damage * (chaos?.mult || 1) * (1 + p.damageBonus + rt.setDamageBonus()));
    return { damage, burst };
  }

  function v13StrikeBaseDamage(echo = false, chaos = null) {
    const rt = requireRuntime(), p = player(), result = baseStrikeDamage(echo, chaos);
    if (p._occultChanneling) result.damage = Math.max(1, Math.round(result.damage * .82));
    if (rt.isClassActive("clown") && p.clownPieReady && !echo) {
      result.damage = Math.round(result.damage * 1.55);
      p.clownPieReady = false;
      result.burst = `Exploding Pie! ${result.burst || ""}`;
    }
    return result;
  }

  function v15StrikeBaseDamage(echo = false, chaos = null) {
    const rt = requireRuntime(), p = player(), out = v13StrikeBaseDamage(echo, chaos);
    if (rt.isClassActive("cleric") && rt.random() < p.classBurst) {
      out.damage = Math.round(out.damage * 1.25);
      const healed = rt.healPlayer(3 + (p.clericHealBonus || 0));
      out.burst = `Blessed Strike${healed ? ` (+${healed} HP)` : ""}! `;
    }
    if (rt.isClassActive("paladin") && rt.random() < p.classBurst) { out.damage += Math.round(p.defense * .9); out.burst = "Oath Smite! "; }
    if (rt.isClassActive("beastmaster") && rt.random() < p.classBurst) { out.damage += Math.round(rt.petDamage() * .75); out.burst = "Pack Assist! "; }
    if (rt.isClassActive("rogue") && rt.random() < p.classBurst) { out.damage = Math.round(out.damage * 1.75); out.burst = "Backstab! "; }
    return out;
  }

  function v26OuroborosStrikeBaseDamage(echo = false, chaos = null) {
    const rt = requireRuntime(), p = player();
    if (!rt.isClassActive("ouroboros")) return v15StrikeBaseDamage(echo, chaos);
    rt.syncOuroborosAttack();
    const goldScale = p.goldAttackScale;
    p.goldAttackScale = 0;
    try { return v15StrikeBaseDamage(echo, chaos); }
    finally { p.goldAttackScale = goldScale; p.attack = 10; }
  }

  function strikeBaseDamage(echo = false, chaos = null) {
    const rt = requireRuntime(), p = player(), result = v26OuroborosStrikeBaseDamage(echo, chaos);
    if (rt.hasLegendaryEffect("twin_surge") && rt.isClassActive("sorcerer") && String(result.burst || "").includes("Arcane Surge")) {
      result.damage = Math.max(1, Math.round(result.damage * .70));
      result.burst = "Twin Arcane Surge! ";
      result.db060TwinSurge = true;
    }
    if (rt.hasLegendaryEffect("vampires_bargain") && (p.lifeSteal || 0) > 1) result.damage = Math.max(1, Math.round(result.damage * (1 + ((p.lifeSteal || 0) - 1))));
    if (rt.hasLegendaryEffect("hoarders_arsenal")) result.damage += Math.floor(Math.max(0, p.gold || 0) / 500);
    return result;
  }

  async function corePerformStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player();
    const echo = !!opts.echo, index = opts.index || 0, chaos = opts.chaos ?? null, canCrit = opts.canCrit !== false;
    let resolvedTarget = target;
    if (!resolvedTarget || resolvedTarget.hp <= 0) resolvedTarget = livingEnemies()[0];
    if (!resolvedTarget) return { domain: "combat", type: "strike", dealt: 0, crit: 0, critTiers: 0, elementDamage: 0 };

    const critTiers = rt.resolveCriticalTiers(rt.rollTieredProc, { canCrit, critChance: p.crit, bonusCrit: chaos?.bonusCrit });
    const mode = critTiers ? "crit" : echo ? "echo" : "normal";
    await rt.animateClassAttack(mode);
    // Historical wrappers discard canCrit before base-damage calculation.
    const base = strikeBaseDamage(echo, chaos);
    let damage = base.damage;
    if (rt.getEncounterLead()?.boss) damage = Math.round(damage * (1 + p.bossDamage));
    if (resolvedTarget.affinity && p.elementalEnemyDamage) damage = Math.round(damage * (1 + p.elementalEnemyDamage));
    if (critTiers) damage *= 1 + critTiers;

    let dealt = rt.damageEnemy(resolvedTarget, damage), executed = false;
    if (resolvedTarget.hp > 0 && resolvedTarget.hp / resolvedTarget.maxHp <= .2 && p.execute) {
      dealt += resolvedTarget.hp;
      resolvedTarget.hp = 0;
      executed = true;
    }
    if (resolvedTarget.hp <= 0) rt.reconcileDefeatedTarget(resolvedTarget, "strike");

    // V25 always zeros poisonOnHitChance while this historical base body runs,
    // so the base one-stack poison branch is semantically unreachable in the
    // final stack. Tiered Poison is applied by v25PoisonStrike() after Horns.
    const poisonApplied = 0;
    p.combatAttackCount++;
    const element = rt.triggerStrikeElements(resolvedTarget, chaos);
    const drainDamage = dealt + (element.totalDamage || 0);
    const heal = p.lifeSteal > 0 && drainDamage > 0 ? rt.healPlayer(Math.max(1, Math.floor(drainDamage * p.lifeSteal))) : 0;
    const label = echo ? `Echo ${index}` : "Attack";
    const result = {
      domain: "combat", type: "strike", label, echo, index, canCrit, dealt,
      crit: critTiers, critTiers, executed, heal, poisonApplied,
      elementDamage: element.totalDamage || 0, elementMessage: element.message || "", burst: base.burst || "",
      targetName: resolvedTarget.name, targetHp: resolvedTarget.hp, presentationTarget: rt.presentationTargetSnapshot()
    };
    rt.emitStrike(result);
    rt.renderStrike(result);
    await rt.delay(460);
    return result;
  }

  async function v13IdentityStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), echo = !!opts.echo;
    let critBoost = 0, damageBoost = 0, consumeCounter = "", execution = false;
    if (rt.isClassActive("ranger") && target?.hp > 0) { critBoost = (target.rangerMarks || 0) * .06; p.crit += critBoost; }
    if (!echo && rt.isClassActive("fighter") && p.fighterCounterReady) { damageBoost = .55; p.damageBonus += damageBoost; consumeCounter = "fighter"; }
    if (!echo && rt.isClassActive("turtle") && p.turtleCrushReady) { damageBoost = .45 + Math.min(.55, p.defense * .035); p.damageBonus += damageBoost; consumeCounter = "turtle"; }
    if (!echo && rt.isClassActive("ninja") && (p.ninjaSmoke || 0) >= (p.ninjaSmokeNeed || 3)) { p._ninjaExecution = true; execution = true; }
    let result;
    try { result = await corePerformStrike(target, opts); }
    finally {
      if (critBoost) p.crit -= critBoost;
      if (damageBoost) p.damageBonus -= damageBoost;
      p._ninjaExecution = false;
    }
    if (!echo && target) {
      if (rt.isClassActive("ranger") && target.hp > 0) { target.rangerMarks = Math.min(3, (target.rangerMarks || 0) + 1); rt.identityFlash(`🏹 Marked Quarry ×${target.rangerMarks}`); }
      if (consumeCounter === "fighter") { p.fighterCounterReady = false; rt.identityFlash("🛡️ Counterblow!"); }
      if (consumeCounter === "turtle") { p.turtleCrushReady = false; rt.identityFlash("🐢 Shell Crush!"); }
      if (rt.isClassActive("ninja")) {
        if (execution) { p.ninjaSmoke = 0; rt.identityFlash("🌘 Smoke Execution!"); }
        else if (result?.crit) { p.ninjaSmoke = Math.min(p.ninjaSmokeNeed || 3, (p.ninjaSmoke || 0) + 1); if (p.ninjaSmoke >= (p.ninjaSmokeNeed || 3)) rt.identityFlash("🌫️ Smoke ready"); }
      }
    }
    rt.updateCombatUI();
    return result;
  }

  async function v16IdentityStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), echo = !!opts.echo, beforeMarks = target?.rangerMarks || 0;
    let temp = 0, consumeFighter = false, consumeTurtle = false;
    if (!echo && rt.isClassActive("fighter") && (p.fighterCounterStacks || 0) > 0) { p.fighterCounterReady = false; temp = .55; p.damageBonus += temp; consumeFighter = true; }
    if (!echo && rt.isClassActive("turtle") && (p.turtleGuardChain || 0) > 0) { p.turtleCrushReady = false; temp = Math.min(.90, (p.turtleGuardChain || 0) * .18); p.damageBonus += temp; consumeTurtle = true; }
    let result;
    try { result = await v13IdentityStrike(target, opts); }
    finally { if (temp) p.damageBonus -= temp; }
    if (!echo && rt.isClassActive("fighter") && consumeFighter) { p.fighterCounterStacks = Math.max(0, (p.fighterCounterStacks || 0) - 1); rt.identityFlash(`🛡️ Counterblow · ${p.fighterCounterStacks} stored`); }
    if (!echo && rt.isClassActive("ranger") && target?.hp > 0 && (p.rangerMarkMax || 3) > 3 && beforeMarks >= 3) target.rangerMarks = Math.min(p.rangerMarkMax, beforeMarks + 1);
    if (!echo && rt.isClassActive("turtle") && consumeTurtle) { rt.identityFlash(`🐢 Shell Momentum ×${p.turtleGuardChain}`); p.turtleGuardChain = 0; }
    return result;
  }

  async function v17NinjaStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), before = p.ninjaSmoke || 0;
    const result = await v16IdentityStrike(target, opts);
    if (rt.isClassActive("ninja") && result?.crit) {
      const need = p.ninjaSmokeNeed || 3;
      if (opts.echo) {
        p.ninjaSmoke = Math.min(need, (p.ninjaSmoke || 0) + 1);
        if (p.ninjaSmoke !== before) rt.identityFlash(`🌫️ Smoke ${p.ninjaSmoke}/${need}`);
      }
      if ((p.ninjaSmoke || 0) >= need) rt.identityFlash("🌫️ Smoke Execution ready");
      rt.updateCombatUI();
    }
    return result;
  }

  async function v18CounterStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player();
    const counterBoost = !opts.echo && rt.isClassActive("fighter") && (p.fighterCounterStacks || 0) > 0 ? (p.fighterCounterPowerBonus || 0) : 0;
    if (counterBoost) p.damageBonus += counterBoost;
    try { return await v17NinjaStrike(target, opts); }
    finally { if (counterBoost) p.damageBonus -= counterBoost; }
  }

  async function v24DevilsHornsStrike(target, opts = {}) {
    const rt = requireRuntime();
    const result = await v18CounterStrike(target, opts);
    if (!opts.echo && target?.hp > 0 && rt.hasDevilsHorns() && rt.random() < .005) {
      const killed = rt.damageEnemy(target, target.hp, true);
      result.dealt = (result.dealt || 0) + killed;
      rt.setCombatText(`👿 The Devil's Horns find the one impossible angle. ${target.name} is instantly slain.`);
      rt.addCombatHistory(`👿 INSTANT KILL · ${target.name}`);
      rt.playHolySfx();
      rt.updateCombatUI();
    }
    return result;
  }

  async function v25PoisonStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), chance = Math.max(0, p.poisonOnHitChance || 0);
    p.poisonOnHitChance = 0;
    try {
      const result = await v24DevilsHornsStrike(target, opts);
      if (target?.hp > 0 && chance > 0) {
        const stacks = rt.rollTieredProc(chance);
        if (stacks > 0) {
          target.poisonStacks = (target.poisonStacks || 0) + stacks;
          rt.playElementAnimation("nature", target, false);
          rt.addCombatHistory(`${opts.echo ? `Echo ${opts.index || ""}` : "Attack"} applies ${stacks} Poison stack${stacks === 1 ? "" : "s"} (${Math.round(chance * 100)}% Poison chance).`);
          rt.updateCombatUI();
        }
      }
      return result;
    } finally { p.poisonOnHitChance = chance; }
  }

  async function v26FastEchoStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), turbo = rt.isClassActive("ouroboros") && (p.doubleStrike || 0) > 10;
    if (turbo) rt.setV26FastEcho(true);
    try { return await v25PoisonStrike(target, opts); }
    finally { if (turbo) rt.setV26FastEcho(false); }
  }

  async function v27DodgeAndSpeedStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), oldCap = rt.getFastEchoCap() || 0, echo = p.doubleStrike || 0;
    if (rt.isClassActive("ouroboros")) {
      rt.setFastEchoCap(echo >= 50 ? 10 : echo >= 10 ? 32 : 0);
      rt.syncOuroborosEconomy();
    }
    try {
      if (target?.hp > 0 && (target.dodge || 0) > 0 && rt.random() < target.dodge) {
        await rt.animateClassAttack(opts.echo ? "echo" : "normal");
        p.combatAttackCount++;
        rt.setCombatText(`${target.name} dodges ${opts.echo ? `Echo ${opts.index || ""}` : "the attack"}.`);
        rt.addCombatHistory(`🌫️ ${target.name} dodges (${Math.round(target.dodge * 100)}% enemy Dodge).`);
        rt.updateCombatUI();
        await rt.delay(rt.isClassActive("ouroboros") ? 35 : 220);
        return { dealt: 0, crit: 0, elementDamage: 0, dodged: true };
      }
      return await v26FastEchoStrike(target, opts);
    } finally { rt.setFastEchoCap(oldCap); }
  }

  async function v28NinjaSmokeStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), ninja = rt.isClassActive("ninja"), before = ninja ? (p.ninjaSmoke || 0) : 0, need = ninja ? (p.ninjaSmokeNeed || 3) : 0, execution = ninja && !opts.echo && before >= need;
    const result = await v27DodgeAndSpeedStrike(target, opts);
    if (ninja && result?.crit) {
      const start = execution ? 0 : before, wanted = Math.min(need, start + Math.max(1, Math.floor(result.crit)));
      if ((p.ninjaSmoke || 0) < wanted) p.ninjaSmoke = wanted;
      if ((p.ninjaSmoke || 0) >= need) rt.identityFlash("🌫️ Smoke Execution ready");
      else if (p.ninjaSmoke !== before) rt.identityFlash(`🌫️ Smoke ${p.ninjaSmoke}/${need}`);
      rt.updateCombatUI();
    }
    return result;
  }

  async function beta04RangerMarkStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), ranger = rt.isClassActive("ranger") && target?.hp > 0, before = ranger ? (target.rangerMarks || 0) : 0;
    const result = await v28NinjaSmokeStrike(target, opts);
    if (ranger && target?.hp > 0 && !result?.dodged) {
      const cap = Math.max(3, Number(p.rangerMarkMax) || 3);
      target.rangerMarks = rt.rangerMarkTotal(before, { cap, landed: true });
      if (target.rangerMarks !== before) rt.identityFlash(`🏹 Marked Quarry ×${target.rangerMarks}${opts.echo ? " · Echo +1" : ""}`);
      rt.updateCombatUI();
    }
    return result;
  }

  async function performStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player();
    const useEchoChamber = rt.hasLegendaryEffect("echo_chamber") && !p._db060EchoChamberActive;
    const savedCrit = p.crit, savedEcho = p.doubleStrike;
    if (useEchoChamber) { p.crit = 0; p.doubleStrike = savedEcho + savedCrit; }
    let result;
    try { result = await beta04RangerMarkStrike(target, opts); }
    finally { if (useEchoChamber) { p.crit = savedCrit; p.doubleStrike = savedEcho; } }
    if (!result) return result;

    if (rt.hasLegendaryEffect("twin_surge") && String(result.burst || "").includes("Twin Arcane Surge") && target?.hp > 0) {
      const second = rt.damageEnemy(target, Math.max(1, result.dealt || 1), true);
      result.dealt += second;
      rt.addCombatHistory(`⚡⚡ Twin Surge repeats Arcane Surge for ${second} damage.`);
      rt.updateCombatUI();
      await rt.delay(160);
    }
    if (rt.hasLegendaryEffect("critical_feedback") && opts.echo && result.critTiers > 0) {
      rt.chargeUltimate(8);
      rt.addCombatHistory("💥🔋 Critical Feedback grants 8 Ultimate.");
    }
    if (rt.hasLegendaryEffect("iron_echo") && opts.echo && (result.dealt || 0) > 0) {
      p.defense += 1;
      p._db060IronEchoDefense = (p._db060IronEchoDefense || 0) + 1;
      rt.addCombatHistory(`🔁🛡️ Iron Echo grants +1 Defense (${p._db060IronEchoDefense} this battle).`);
    }
    if (rt.hasLegendaryEffect("elemental_roulette") && !opts.echo && livingEnemies().length) {
      const rouletteTarget = target?.hp > 0 ? target : livingEnemies()[0], key = rt.pick(rt.getElementKeys());
      rt.triggerElementEffect(key, rouletteTarget, { forced: true, source: "Elemental Roulette" });
    }
    return result;
  }

  const api = Object.freeze({
    owner: "combat/strike-resolution",
    configure,
    strikeBaseDamage,
    performStrike
  });

  window.DiceboundCombatStrikeResolution = api;
})();
