(() => {
  "use strict";

  const OWNER = "items/consumables";
  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundConsumables must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Consumables runtime is required.");
    const required = [
      "getPlayer", "getCurrentEnemy", "livingEnemies", "getCombatBusy", "setCombatBusy",
      "isGameStarted", "getRollLocked", "rollD20Chaos", "healPlayer", "playHeal",
      "triggerElementEffect", "getDiboElements", "applyMythicPantsPulse", "setCombatText",
      "updateCombatUI", "delay", "winCombat", "resolveEnemyResponse", "ensureAlphaMeta",
      "checkDynamicClassUnlocks", "saveMeta", "renderClassChooser", "addLog", "showToast",
      "updateHud", "traceCommand", "isClassActive", "dragoonActive", "dragoonLandingReady",
      "dragoonLanding", "tickDragoonCooldown"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Consumables runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function player() { return requireRuntime().getPlayer(); }
  function currentEnemy() { return requireRuntime().getCurrentEnemy(); }
  function livingEnemies() { return requireRuntime().livingEnemies(); }

  // V16 is the published Potion formula used by combat, road drinking and the
  // Alchemist Volatile Flask compatibility seam.
  function potionHealValue(mult = 1) {
    const p = player();
    return Math.max(1, Math.round((10 + p.maxHp * .10) * (1 + p.potionPower) * mult));
  }

  // Career tracking remains a consumable-side effect: one increment per Potion
  // actually consumed. Unlock-rule implementation itself stays outside this owner.
  function recordPotionUse() {
    const rt = requireRuntime(), stats = rt.ensureAlphaMeta();
    stats.potionsUsed = (stats.potionsUsed || 0) + 1;
    rt.checkDynamicClassUnlocks();
    rt.saveMeta();
    if (!rt.isGameStarted()) rt.renderClassChooser();
  }

  // Mature V16 combat transaction, including Double Dose. D20 generation,
  // elemental effects, generic healing, Victory and enemy response are injected.
  async function combatPotionCore() {
    const rt = requireRuntime(), p = player();
    if (rt.getCombatBusy() || !currentEnemy() || p.potions <= 0 || p.hp >= p.maxHp) return;
    rt.setCombatBusy(true);
    p.guardCooldown = 0;
    const maxDrinks = p.doublePotionTurn ? 2 : 1;
    let drinks = 0, totalHeal = 0;
    const chaosNotes = [];
    while (drinks < maxDrinks && p.potions > 0 && p.hp < p.maxHp && livingEnemies().length) {
      const chaos = await rt.rollD20Chaos("potion");
      p.potions--;
      recordPotionUse();
      drinks++;
      totalHeal += rt.healPlayer(potionHealValue(chaos.potionMult || 1));
      rt.playHeal();
      if (chaos.forceElement) {
        const result = rt.triggerElementEffect(
          chaos.forceElement,
          currentEnemy()?.hp > 0 ? currentEnemy() : livingEnemies()[0],
          { forced: true, source: "d20 potion" }
        );
        if (result) chaosNotes.push(result.message);
      }
      if (chaos.allElements) {
        rt.getDiboElements().forEach(key => rt.triggerElementEffect(
          key,
          currentEnemy()?.hp > 0 ? currentEnemy() : livingEnemies()[0],
          { forced: true, source: "natural twenty potion" }
        ));
      }
      if (drinks < maxDrinks && p.potions > 0 && p.hp < p.maxHp && livingEnemies().length) await rt.delay(180);
    }
    const pants = rt.applyMythicPantsPulse();
    const dose = drinks > 1 ? " Double Dose drinks a second potion before the enemy can respond." : "";
    rt.setCombatText(`You drink ${drinks > 1 ? drinks + " potions" : "a potion"} and restore ${totalHeal} HP.${dose}${chaosNotes.length ? " " + chaosNotes.join(" ") : ""}${pants ? ` ${pants}` : ""}`);
    rt.updateCombatUI();
    await rt.delay(630);
    if (!livingEnemies().length) return rt.winCombat();
    await rt.resolveEnemyResponse(false);
  }

  function roadPotionCore() {
    const rt = requireRuntime(), p = player();
    if (!rt.isGameStarted() || rt.getRollLocked() || currentEnemy() || p.potions <= 0 || p.hp >= p.maxHp) return;
    p.potions--;
    recordPotionUse();
    const healed = rt.healPlayer(potionHealValue());
    rt.playHeal();
    rt.addLog(`You drink a potion on the road and restore <b>${healed} HP</b>.`);
    rt.showToast(`+${healed} HP`);
    rt.updateHud();
  }

  // V24's repair wrapper remains deliberately represented even though the V16
  // core now records correctly; it guarantees no duplicate increment while still
  // repairing a future/compatibility path that consumes without recording.
  function v24RoadAccountingLayer(...args) {
    const rt = requireRuntime(), p = player();
    const beforePotions = p.potions, beforeUses = rt.ensureAlphaMeta().potionsUsed || 0;
    const result = roadPotionCore(...args);
    if (p.potions < beforePotions && (rt.ensureAlphaMeta().potionsUsed || 0) === beforeUses) recordPotionUse();
    return result;
  }

  function tracedCombatPotion(args, thisArg) {
    return requireRuntime().traceCommand("usePotion", () => combatPotionCore(...args), "detailed", args, thisArg);
  }

  function tracedRoadPotion(args, thisArg) {
    return requireRuntime().traceCommand("usePotionOutsideCombat", () => v24RoadAccountingLayer(...args), "detailed", args, thisArg);
  }

  // Friends Patch Dragoon is the outermost combat-Potion layer. A pending
  // Landing bypasses the Potion transaction and its command trace entirely.
  async function usePotion(...args) {
    const rt = requireRuntime(), p = player();
    if (rt.dragoonActive() && rt.dragoonLandingReady()) return rt.dragoonLanding();
    if (rt.dragoonActive() && !rt.getCombatBusy() && currentEnemy() && p.potions > 0 && p.hp < p.maxHp) rt.tickDragoonCooldown();
    return tracedCombatPotion(args, this);
  }

  function usePotionOutsideCombat(...args) {
    return tracedRoadPotion(args, this);
  }

  // Final V16 identity dispatch: choosing Potion breaks Monk combo and Turtle
  // guard-chain before the normal Potion/Dragoon transaction is attempted.
  async function identityPotionAction(...args) {
    const rt = requireRuntime(), p = player();
    if (rt.isClassActive("monk")) p.monkCombo = 0;
    if (rt.isClassActive("turtle")) p.turtleGuardChain = 0;
    return usePotion.apply(this, args);
  }

  const api = Object.freeze({
    owner: OWNER,
    configure,
    potionHealValue,
    recordPotionUse,
    usePotion,
    usePotionOutsideCombat,
    identityPotionAction,
    _test: Object.freeze({ combatPotionCore, roadPotionCore, v24RoadAccountingLayer, tracedCombatPotion, tracedRoadPotion })
  });

  window.DiceboundConsumables = api;
})();
