(() => {
  "use strict";

  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatGuardResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat guard-resolution runtime is required.");
    const required = [
      "getPlayer", "getCurrentEnemy", "livingEnemies", "getCombatBusy", "setCombatBusy",
      "rollD20Chaos", "chargeUltimate", "healPlayer", "damageEnemy", "triggerElementEffect",
      "getDiboElements", "applyMythicPantsPulse", "updateCombatUI", "setCombatText", "tone", "delay",
      "winCombat", "resolveEnemyResponse", "isClassActive", "classIdentityId", "classHasMechanic",
      "getClassTags", "gameplayTalentRank", "getWeaponElement", "getActivePetElement", "getElementKeys",
      "random", "pick", "clamp", "addCombatHistory", "identityFlash", "manaGain", "hasMythicPiece",
      "hasLegendaryEffect", "rollTieredProc", "dragoonActive", "dragoonLandingReady", "dragoonLanding",
      "tickDragoonCooldown", "invokeGuardAction"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat guard-resolution runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function player() { return requireRuntime().getPlayer(); }
  function livingEnemies() { return requireRuntime().livingEnemies(); }

  // Original Guard body. Action ordering, D20 behavior and the guarded enemy
  // response contract are intentionally frozen for the architecture extraction.
  async function baseGuardAction() {
    const rt = requireRuntime(), p = player();
    if (rt.getCombatBusy() || !rt.getCurrentEnemy() || p.guardCooldown > 0) return;
    rt.setCombatBusy(true);
    const chaos = await rt.rollD20Chaos("guard");
    p.guardCooldown = p.guardDelay;
    rt.chargeUltimate(p.ultimateGuardGain);
    const notes = [`gain ${p.ultimateGuardGain} ultimate charge`];
    if (p.guardHeal > 0) {
      const healed = rt.healPlayer(p.guardHeal);
      if (healed) notes.push(`restore ${healed} HP`);
    }
    if (p.guardShield > 0) {
      p.combatShield += p.guardShield;
      notes.push("raise a Battle Barrier");
    }
    if (p.guardCounter > 0) {
      const target = rt.getCurrentEnemy();
      const counter = rt.damageEnemy(target, Math.max(1, Math.round((p.attack + p.defense * p.defenseAttackScale) * p.guardCounter)));
      notes.push(`riposte for ${counter} damage`);
    }
    if (chaos.forceElement) {
      const result = rt.triggerElementEffect(chaos.forceElement, rt.getCurrentEnemy(), { forced: true, source: "d20 guard" });
      if (result) notes.push(result.message);
    }
    if (chaos.allElements) {
      rt.getDiboElements().forEach(key => {
        const current = rt.getCurrentEnemy();
        rt.triggerElementEffect(key, current?.hp > 0 ? current : livingEnemies()[0], { forced: true, source: "natural twenty guard" });
      });
    }
    const pants = rt.applyMythicPantsPulse();
    if (pants) notes.push(pants);
    rt.updateCombatUI();
    rt.setCombatText(`You brace yourself and ${notes.join(", ")}.`);
    rt.tone(260, .12, "triangle", .03, 180);
    await rt.delay(620);
    if (!livingEnemies().length) return rt.winCombat();
    return await rt.resolveEnemyResponse(true, chaos.guardBonus || 0);
  }

  // Beta 0.6 Legendary Perfect Guard wrapper. Importantly, the Echo roll is
  // still made before the base Guard busy/cooldown rejection, exactly as the
  // historical wrapper did.
  async function perfectGuardAction(...args) {
    const rt = requireRuntime(), p = player();
    if (!rt.hasLegendaryEffect("perfect_guard") || !(p.guardCounter > 0)) return baseGuardAction(...args);
    const oldCounter = p.guardCounter;
    const echoes = rt.rollTieredProc(p.doubleStrike || 0);
    p.guardCounter = oldCounter * (1 + echoes * .70);
    try {
      if (echoes) rt.addCombatHistory(`🛡️🔁 Perfect Guard rolls ${echoes} counter Echo${echoes === 1 ? "" : "es"}.`);
      return await baseGuardAction(...args);
    } finally {
      p.guardCounter = oldCounter;
    }
  }

  // Friends Patch Dragoon interception is the outermost direct Guard layer.
  async function guardAction(...args) {
    const rt = requireRuntime(), p = player();
    if (rt.dragoonActive() && rt.dragoonLandingReady()) return rt.dragoonLanding();
    if (rt.dragoonActive() && !rt.getCombatBusy() && rt.getCurrentEnemy() && p.guardCooldown <= 0) rt.tickDragoonCooldown();
    return perfectGuardAction(...args);
  }

  // Final V16 identity semantics. This deliberately calls the injected dynamic
  // Guard composition seam instead of guardAction() directly so existing test
  // hooks that temporarily replace the lexical guardAction adapter keep working.
  async function v16IdentityGuardAction(...args) {
    const rt = requireRuntime(), p = player();
    if (rt.isClassActive("monk")) p.monkCombo = 0;
    if (rt.isClassActive("fighter")) {
      p.fighterCounterReady = false;
      p.fighterCounterStacks = Math.min(p.fighterCounterMax || 1, (p.fighterCounterStacks || 0) + 1);
      rt.identityFlash(`🛡️ Counterblow ${p.fighterCounterStacks}/${p.fighterCounterMax}`);
    }
    if (rt.isClassActive("turtle")) {
      p.turtleCrushReady = false;
      p.turtleGuardChain = Math.min(p.turtleGuardMax || 5, (p.turtleGuardChain || 0) + 1);
      if (p.turtleGuardChain === 3 || p.turtleGuardChain === 5) {
        p.combatShield++;
        rt.identityFlash(`🐢 Shell wall ×${p.turtleGuardChain} · Barrier`);
      }
      const bonus = Math.max(0, (p.turtleGuardChain - 1) * .05), oldPower = p.guardPower;
      p.guardPower = rt.clamp(oldPower + bonus, 0, .90);
      try {
        return await rt.invokeGuardAction(...args);
      } finally {
        p.guardPower = oldPower;
        rt.updateCombatUI();
      }
    }
    return rt.invokeGuardAction(...args);
  }

  async function v17ResonantGuardAction(...args) {
    const rt = requireRuntime(), p = player(), identityId = rt.classIdentityId();
    const tags = rt.getClassTags(identityId) || [];
    const rank = rt.gameplayTalentRank("turtle_guard_element");
    const chance = (tags.includes("guardian") ? rank * .05 : 0)
      + ((rt.isClassActive("turtle") || rt.isClassActive("slime")) ? (p.guardElementProcBonus || 0) : 0);
    const current = rt.getCurrentEnemy();
    if (chance && current?.hp > 0 && rt.random() < rt.clamp(chance, 0, .75)) {
      const key = rt.getWeaponElement() || rt.getActivePetElement() || rt.pick(rt.getElementKeys());
      const result = rt.triggerElementEffect(key, current, { forced: true, source: "Resonant Guard" });
      if (result) rt.addCombatHistory(`🌈 Resonant Guard: ${result.message}`);
    }
    return v16IdentityGuardAction(...args);
  }

  async function v18ManaGuardAction(...args) {
    const rt = requireRuntime(), p = player();
    if (rt.classHasMechanic("mana") && !rt.getCombatBusy() && rt.getCurrentEnemy()) {
      const gained = rt.manaGain(p.guardManaGain || 6);
      if (gained) {
        rt.addCombatHistory(`🔷 Guard channels +${gained} Mana.`);
        rt.identityFlash(`🛡️ +${gained} Mana`);
      }
    }
    return v17ResonantGuardAction(...args);
  }

  async function v19PaladinGuardAction(...args) {
    const rt = requireRuntime(), p = player();
    if (!rt.isClassActive("paladin")) return v18ManaGuardAction(...args);
    const grace = Math.floor(p.paladinGrace || 0), extraGuard = Math.min(.20, grace * .002), barriers = Math.floor(grace / 25), oldPower = p.guardPower;
    p.paladinGrace = 0;
    p.guardPower = rt.clamp(oldPower + extraGuard, 0, .92);
    if (barriers) p.combatShield = (p.combatShield || 0) + barriers;
    rt.addCombatHistory(`⚜️ Oath Guard consumes ${grace} Grace: +${Math.round(extraGuard * 100)}% Guard power${barriers ? ` and ${barriers} Barrier${barriers === 1 ? "" : "s"}` : ""}.`);
    rt.identityFlash(`⚜️ Oath Guard · ${grace} Grace`);
    try {
      return await v18ManaGuardAction(...args);
    } finally {
      p.guardPower = oldPower;
      rt.updateCombatUI();
    }
  }

  async function identityGuardAction(...args) {
    const rt = requireRuntime(), p = player();
    if (rt.hasMythicPiece("offhand")) {
      p.ultimateCharge = rt.clamp((p.ultimateCharge || 0) + 8, 0, 100);
      p._eventHorizonGuards = (p._eventHorizonGuards || 0) + 1;
      if (p._eventHorizonGuards % 3 === 0) {
        p.combatShield = (p.combatShield || 0) + 1;
        rt.addCombatHistory("🌌 Event Horizon Ward raises a Barrier on the third Guard.");
      }
    }
    return v19PaladinGuardAction(...args);
  }

  const api = Object.freeze({
    owner: "combat/guard-resolution",
    configure,
    guardAction,
    identityGuardAction,
    _test: Object.freeze({
      baseGuardAction,
      perfectGuardAction,
      v16IdentityGuardAction,
      v17ResonantGuardAction,
      v18ManaGuardAction,
      v19PaladinGuardAction
    })
  });

  window.DiceboundCombatGuardResolution = api;
})();
