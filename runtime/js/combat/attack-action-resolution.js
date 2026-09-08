(() => {
  "use strict";

  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatAttackActionResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat attack-action runtime is required.");
    const required = [
      "getPlayer", "getCurrentEnemy", "getCurrentEnemies", "livingEnemies", "getCombatBusy", "setCombatBusy",
      "rollD20Chaos", "updateCombatUI", "rollTieredProc", "performStrike", "chargeUltimate",
      "applyMythicPantsPulse", "setCombatText", "winCombat", "setCurrentEnemy", "resolveEnemyResponse",
      "isClassActive", "classIdentityId", "hasLegendaryEffect", "showToast", "addCombatHistory",
      "dragoonActive", "dragoonLandingReady", "dragoonLanding", "tickDragoonCooldown"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat attack-action runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function player() { return requireRuntime().getPlayer(); }
  function currentEnemy() { return requireRuntime().getCurrentEnemy(); }
  function livingEnemies() { return requireRuntime().livingEnemies(); }

  // Original Basic Attack transaction. Individual strike math remains owned by
  // combat/strike-resolution; this layer only owns action-level orchestration.
  async function baseAttackAction() {
    const rt = requireRuntime(), p = player();
    if (rt.getCombatBusy() || !currentEnemy()) return;
    rt.setCombatBusy(true);
    p.guardCooldown = 0;
    const chaos = await rt.rollD20Chaos("attack");
    rt.updateCombatUI();
    const firstTarget = currentEnemy();
    const actionBonus = typeof rt.actionBonuses === "function" ? rt.actionBonuses() : null;
    const echoes = rt.rollTieredProc(p.doubleStrike + (actionBonus?.echo || 0)) + (chaos.extraEcho || 0);
    let totalCrit = 0;
    const base = await rt.performStrike(firstTarget, { echo: false, chaos });
    totalCrit += base.crit;
    for (let i = 1; i <= echoes && livingEnemies().length; i++) {
      const selected = currentEnemy();
      const target = firstTarget.hp > 0 ? firstTarget : (selected?.hp > 0 ? selected : livingEnemies()[0]);
      const result = await rt.performStrike(target, { echo: true, index: i, chaos, canCrit: false });
      totalCrit += result.crit;
    }
    rt.chargeUltimate(p.ultimateAttackGain + p.critUltimateGain * totalCrit);
    const pants = rt.applyMythicPantsPulse();
    if (pants) rt.setCombatText(pants);
    // A class action's post-state is committed after every strike/Echo but
    // before the ordinary enemy response.
    if (typeof rt.afterPlayerAction === "function") rt.afterPlayerAction("attack");
    rt.updateCombatUI();
    if (!livingEnemies().length) return rt.winCombat();
    const enemies = rt.getCurrentEnemies();
    rt.setCurrentEnemy(enemies.indexOf(livingEnemies()[0]));
    await rt.resolveEnemyResponse(false);
  }

  // V13 class wrapper: Monk temporarily converts combo into Echo/damage and
  // Frog gains one guaranteed Echo against enemies below half HP.
  async function v13ClassAttackAction(...args) {
    const rt = requireRuntime(), p = player();
    if (rt.isClassActive("monk")) {
      const combo = p.monkCombo || 0, echoBonus = combo * .035, damageBonus = combo * .045;
      p.doubleStrike += echoBonus;
      p.damageBonus += damageBonus;
      try {
        await baseAttackAction(...args);
      } finally {
        p.doubleStrike -= echoBonus;
        p.damageBonus -= damageBonus;
      }
      if (p.hp > 0 && currentEnemy()) p.monkCombo = Math.min(5, combo + 1);
      rt.updateCombatUI();
      return;
    }
    const enemy = currentEnemy();
    if (rt.isClassActive("frog") && enemy?.hp > 0 && enemy.hp / enemy.maxHp < .5) {
      p.doubleStrike += 1;
      try {
        return await baseAttackAction(...args);
      } finally {
        p.doubleStrike -= 1;
      }
    }
    return baseAttackAction(...args);
  }

  // V16 action-identity wrapper. Keep its exact historical outer position over
  // the V13 class layer, including the high-combo Monk overwrite after return.
  async function v16IdentityAttackAction(...args) {
    const rt = requireRuntime(), p = player();
    const cls = rt.classIdentityId(), comboBefore = p.monkCombo || 0;
    const chicken = cls === "clown" && p.clownGimmick === "Rubber Chicken";
    if (chicken) p.doubleStrike += .20;
    if (cls === "alchemist" && !rt.getCombatBusy() && currentEnemy()) {
      p.alchemistBrewCounter = (p.alchemistBrewCounter || 0) + 1;
      if (p.alchemistBrewCounter >= p.alchemistBrewNeed) {
        p.alchemistBrewCounter = 0;
        p.potions++;
        rt.showToast("🧪 Brewed +1 potion");
        rt.addCombatHistory("⚗️ Combat Distillery completes a fresh potion.");
      }
    }
    try {
      const result = await v13ClassAttackAction(...args);
      if (cls === "monk" && (p.monkComboMax || 5) > 5) p.monkCombo = Math.min(p.monkComboMax, comboBefore + 1);
      return result;
    } finally {
      if (chicken) p.doubleStrike -= .20;
      rt.updateCombatUI();
    }
  }

  // Beta 0.6 Echo Chamber must wrap the identity layers so Crit is converted
  // into Echo before the action's Echo-count RNG is consumed.
  async function echoChamberAttackAction(...args) {
    const rt = requireRuntime(), p = player();
    if (!rt.hasLegendaryEffect("echo_chamber")) return v16IdentityAttackAction(...args);
    const savedCrit = p.crit, savedEcho = p.doubleStrike;
    p.crit = 0;
    p.doubleStrike = savedEcho + savedCrit;
    p._db060EchoChamberActive = true;
    try {
      return await v16IdentityAttackAction(...args);
    } finally {
      p.crit = savedCrit;
      p.doubleStrike = savedEcho;
      p._db060EchoChamberActive = false;
    }
  }

  // Friends Patch Dragoon interception is the outermost direct Basic Attack
  // layer. Landing bypasses the ordinary attack transaction completely.
  async function playerAttack(...args) {
    const rt = requireRuntime();
    if (rt.dragoonActive() && rt.dragoonLandingReady()) return rt.dragoonLanding();
    if (rt.dragoonActive() && !rt.getCombatBusy() && currentEnemy()) rt.tickDragoonCooldown();
    return echoChamberAttackAction(...args);
  }

  const api = Object.freeze({
    owner: "combat/attack-action-resolution",
    configure,
    playerAttack,
    _test: Object.freeze({
      baseAttackAction,
      v13ClassAttackAction,
      v16IdentityAttackAction,
      echoChamberAttackAction
    })
  });

  window.DiceboundCombatAttackActionResolution = api;
})();
