(() => {
  "use strict";

  const OWNER = "combat/mana-action-resolution";
  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatManaActionResolution must be configured before use.");
    return runtime;
  }

  function configure(next) {
    const required = [
      "getPlayer", "getCurrentEnemy", "getCurrentEnemies", "livingEnemies", "getCombatBusy", "setCombatBusy",
      "spellFor", "classIdentityId", "isClassActive", "clamp", "playerAttack", "invokerActive",
      "invokerGeneratorManaMultiplier", "invokerElementalLance", "identityFlash", "updateCombatUI",
      "animateClassAttack", "rand", "pick", "rollTieredProc", "coreElementIds", "triggerElementEffect",
      "damageEnemy", "healPlayer", "getSetDamageBonus", "getEncounterLead", "chargeUltimate", "setCombatText",
      "critSfx", "delay", "winCombat", "setCurrentEnemy", "resolveEnemyResponse", "getPets", "getMeta",
      "petTurn", "addCombatHistory", "recordManaSpenderCast", "saveMeta", "checkDynamicClassUnlocks"
    ];
    for (const name of required) if (typeof next?.[name] !== "function") throw new Error(`Mana action runtime missing ${name}().`);
    runtime = next;
    return api;
  }

  const player = () => requireRuntime().getPlayer();
  const currentEnemy = () => requireRuntime().getCurrentEnemy();
  const livingEnemies = () => requireRuntime().livingEnemies();

  function manaGain(amount) {
    const rt = requireRuntime(), p = player();
    if (!p.maxMana) return 0;
    const before = p.mana;
    p.mana = rt.clamp(p.mana + amount, 0, p.maxMana);
    return p.mana - before;
  }

  // The original generator transaction. Bonus wrappers below deliberately keep
  // their historical nesting so temporary shared-config mutation is restored on
  // every async exit, while Mana still lands before the underlying Basic Attack.
  async function baseChannelAttack() {
    const rt = requireRuntime(), p = player();
    if (rt.getCombatBusy() || !currentEnemy()) return;
    const cfg = rt.spellFor(rt.classIdentityId());
    if (!cfg) return rt.playerAttack();
    const invoker = rt.isClassActive("invoker") && rt.invokerActive();
    const gained = manaGain(cfg.gain * (invoker ? rt.invokerGeneratorManaMultiplier() : 1));
    p._occultChanneling = true;
    p._occultChannelMultiplier = invoker ? .98 : 0;
    p._invokerPendingGenerator = !!invoker;
    rt.identityFlash(`${cfg.builderIcon} +${gained} Mana`);
    try {
      await rt.playerAttack();
    } finally {
      p._occultChanneling = false;
      p._occultChannelMultiplier = 0;
      p._invokerPendingGenerator = false;
    }
    rt.updateCombatUI();
  }

  async function summonerChannelLayer(...args) {
    const rt = requireRuntime(), p = player();
    if (!rt.isClassActive("summoner") || !(p.summonerManaBonus || 0)) return baseChannelAttack(...args);
    const cfg = rt.spellFor("summoner"), old = cfg.gain;
    cfg.gain = old + (p.summonerManaBonus || 0);
    try {
      return await baseChannelAttack(...args);
    } finally {
      cfg.gain = old;
    }
  }

  async function occultChannelAttack(...args) {
    const rt = requireRuntime(), p = player(), cfg = rt.spellFor(rt.classIdentityId()), bonus = p.manaBuilderBonus || 0;
    if (!cfg || !bonus) return summonerChannelLayer(...args);
    const old = cfg.gain;
    cfg.gain += bonus;
    try {
      return await summonerChannelLayer(...args);
    } finally {
      cfg.gain = old;
    }
  }

  // Base spender used by Sorcerer, Vampire, borrowed Rouge identity and Merchant.
  // Invoker is refunded here and delegated to classes/invoker.js so that owner
  // remains solely responsible for Elemental Lance/orb semantics.
  async function baseSpellAttack() {
    const rt = requireRuntime(), p = player();
    if (rt.getCombatBusy() || !currentEnemy()) return;
    const cfg = rt.spellFor(rt.classIdentityId());
    if (!cfg || p.mana < cfg.cost) return;
    rt.setCombatBusy(true);
    p.guardCooldown = 0;
    p.mana -= cfg.cost;
    p.combatActionCount++;
    if (rt.isClassActive("invoker") && rt.invokerActive()) {
      rt.setCombatBusy(false);
      p.mana += cfg.cost;
      p.combatActionCount--;
      return rt.invokerElementalLance();
    }

    const target = currentEnemy();
    await rt.animateClassAttack("crit");
    let damage = 0, extra = "";
    if (rt.isClassActive("sorcerer")) {
      const echoScale = 1 + Math.max(0, Number(p.doubleStrike) || 0) * .5;
      damage = Math.round((p.attack * 2.15 + rt.rand(4, 9)) * echoScale);
      const key = rt.pick(rt.coreElementIds()), er = rt.triggerElementEffect(key, target, { forced: true, source: "Arcane Lance" });
      p._arcaneLanceElementDamage = Math.max(0, Number(er?.totalDamage) || 0);
      if (er) extra = ` ${er.message}`;
    } else if (rt.isClassActive("vampire")) {
      damage = Math.round(p.attack * 1.95 + rt.rand(3, 7));
    } else if (rt.isClassActive("rouge")) {
      const tiers = rt.rollTieredProc(p.crit + .35);
      damage = Math.round((p.attack * 1.85 + rt.rand(3, 8)) * (1 + tiers));
      if (livingEnemies().length > 1) {
        const splash = Math.max(1, Math.round(damage * .28));
        livingEnemies().filter(enemy => enemy !== target).forEach(enemy => rt.damageEnemy(enemy, splash));
        extra = ` Scarlet paint splashes the rest of the pack for ${splash} each.`;
      }
    } else if (rt.isClassActive("merchant")) {
      damage = Math.round(p.attack * 1.55 + Math.min(220, p.gold * .12) + rt.rand(4, 10));
      extra = ` The ledger converts ${Math.min(220, Math.round(p.gold * .12))} notional gold-value into violence without spending it.`;
    }

    damage = Math.round(damage * (1 + p.damageBonus + rt.getSetDamageBonus()));
    if (rt.getEncounterLead()?.boss) damage = Math.round(damage * (1 + p.bossDamage));
    const dealt = rt.damageEnemy(target, damage);
    if (rt.isClassActive("sorcerer")) {
      const drainDamage = dealt + Math.max(0, Number(p._arcaneLanceElementDamage) || 0);
      const heal = p.lifeSteal > 0 && drainDamage > 0 ? rt.healPlayer(Math.max(1, Math.floor(drainDamage * p.lifeSteal))) : 0;
      p._arcaneLanceElementDamage = 0;
      if (heal) extra += ` Arcane Lance lifesteal restores ${heal} HP.`;
    }
    if (rt.isClassActive("vampire")) {
      const healed = rt.healPlayer(Math.max(1, Math.floor(dealt * .30)));
      extra += ` Grave Lance drains ${healed} HP.`;
    }
    rt.chargeUltimate(Math.max(8, Math.round(p.ultimateAttackGain * .65)));
    rt.setCombatText(`${cfg.spellIcon} ${cfg.spell} spends ${cfg.cost} Mana and deals ${dealt} damage.${extra}`);
    rt.critSfx();
    rt.updateCombatUI();
    await rt.delay(720);
    if (!livingEnemies().length) return rt.winCombat();
    const enemies = rt.getCurrentEnemies();
    rt.setCurrentEnemy(enemies.indexOf(livingEnemies()[0]));
    await rt.resolveEnemyResponse(false);
  }

  // Final shipped Summoner Conjure implementation. The Pet owner remains the
  // damage/formula authority; this action only owns spend/routing/temporary rally
  // state and intentionally calls petTurn through a late-bound callback.
  async function summonerConjure() {
    const rt = requireRuntime(), p = player();
    if (rt.getCombatBusy() || !currentEnemy() || !rt.isClassActive("summoner")) return;
    const cfg = rt.spellFor("summoner");
    if (p.mana < cfg.cost) return;
    rt.setCombatBusy(true);
    const beforeMana = p.mana;
    p.mana -= cfg.cost;
    p.combatActionCount++;
    p.summonerSpirits = p.summonerSpirits || [];
    const pets = rt.getPets(), meta = rt.getMeta(), cap = p.summonerCap || 3;
    const candidates = Object.keys(pets).filter(id => meta.pets?.[id]?.unlocked && !p.summonerSpirits.includes(id));
    const pool = candidates.length ? candidates : Object.keys(pets).filter(id => meta.pets?.[id]?.unlocked);
    const id = pool.length ? rt.pick(pool) : "neutral";
    if (p.summonerSpirits.length >= cap) p.summonerSpirits.shift();
    p.summonerSpirits.push(id);
    rt.identityFlash(`🐾 Conjured ${pets[id].name}`);
    if (p.manaSpendUltimate && beforeMana > p.mana) {
      p.ultimateCharge = rt.clamp(p.ultimateCharge + p.manaSpendUltimate, 0, 100);
      rt.addCombatHistory(`✨ Arcane Overflow converts the Mana spend into +${p.manaSpendUltimate} Ultimate.`);
    }
    rt.setCombatText(`📖 Conjure calls ${pets[id].icon} ${pets[id].name}; the entire companion circle surges forward with empowered attacks.`);
    rt.updateCombatUI();
    await rt.delay(300);
    const oldPet = p.petDamageBonus || 0, oldSpirit = p.summonerSpiritScale || 1;
    p.petDamageBonus = oldPet + 2;
    p.summonerSpiritScale = oldSpirit * 1.20;
    try {
      await rt.petTurn();
    } finally {
      p.petDamageBonus = oldPet;
      p.summonerSpiritScale = oldSpirit;
    }
    if (!livingEnemies().length) return rt.winCombat();
    await rt.delay(240);
    await rt.resolveEnemyResponse(false);
  }

  async function summonerDispatchSpellLayer(...args) {
    const rt = requireRuntime();
    if (rt.isClassActive("summoner")) return summonerConjure(...args);
    return baseSpellAttack(...args);
  }

  // V17 Mana Overflow historically wraps Summoner dispatch and the generic
  // spender. Final Conjure also carries its own earlier compatibility grant;
  // preserving both calls is intentional behavior preservation for this slice.
  async function manaOverflowSpellLayer(...args) {
    const rt = requireRuntime(), p = player(), before = p.mana || 0;
    const result = await summonerDispatchSpellLayer(...args);
    if (p.manaSpendUltimate && p.mana < before) {
      p.ultimateCharge = rt.clamp(p.ultimateCharge + p.manaSpendUltimate, 0, 100);
      rt.updateCombatUI();
    }
    return result;
  }

  // Beta 1.10's direct Rouge replacement sits outside Mana Overflow. Preserve
  // its direct classId test: borrowed Rouge identity continues through the older
  // generic path, while the real Rouge gets doubled Lifesteal and no V17 wrapper.
  async function rougeFinalSpellLayer(...args) {
    const rt = requireRuntime(), p = player();
    if (p.classId !== "rouge") return manaOverflowSpellLayer(...args);
    if (rt.getCombatBusy() || !currentEnemy()) return;
    const cfg = rt.spellFor(p.classId);
    if (!cfg || p.mana < cfg.cost) return;
    rt.setCombatBusy(true);
    p.guardCooldown = 0;
    p.mana -= cfg.cost;
    p.combatActionCount++;
    const target = currentEnemy();
    await rt.animateClassAttack("crit");
    let extra = "";
    const tiers = rt.rollTieredProc(p.crit + .35);
    let damage = Math.round((p.attack * 1.85 + rt.rand(3, 8)) * (1 + tiers));
    if (livingEnemies().length > 1) {
      const splash = Math.max(1, Math.round(damage * .28));
      livingEnemies().filter(enemy => enemy !== target).forEach(enemy => rt.damageEnemy(enemy, splash));
      extra = ` Scarlet paint splashes the rest of the pack for ${splash} each.`;
    }
    damage = Math.round(damage * (1 + p.damageBonus + rt.getSetDamageBonus()));
    if (rt.getEncounterLead()?.boss) damage = Math.round(damage * (1 + p.bossDamage));
    const dealt = rt.damageEnemy(target, damage);
    const heal = Math.max(1, Math.floor(dealt * Math.max(0, p.lifeSteal) * 2));
    if (heal > 0) {
      const restored = rt.healPlayer(heal);
      extra += ` Scarlet Hex drinks back ${restored} HP.`;
    }
    rt.chargeUltimate(Math.max(8, Math.round(p.ultimateAttackGain * .65)));
    rt.setCombatText(`${cfg.spellIcon} ${cfg.spell} spends ${cfg.cost} Mana and deals ${dealt} damage.${extra}`);
    rt.critSfx();
    rt.updateCombatUI();
    await rt.delay(720);
    if (!livingEnemies().length) return rt.winCombat();
    const enemies = rt.getCurrentEnemies();
    rt.setCurrentEnemy(enemies.indexOf(livingEnemies()[0]));
    await rt.resolveEnemyResponse(false);
  }

  // Career tracking is the historical outermost spender layer. The Invoker
  // owner records its own delegated Elemental Lance, preventing double counting.
  async function occultSpellAttack(...args) {
    const rt = requireRuntime(), p = player();
    const beforeMana = Number(p.mana) || 0, beforeActions = Number(p.combatActionCount) || 0;
    const result = await rougeFinalSpellLayer(...args);
    const spent = beforeMana > (Number(p.mana) || 0) && (Number(p.combatActionCount) || 0) > beforeActions;
    if (spent && !rt.isClassActive("invoker")) {
      rt.recordManaSpenderCast();
      rt.saveMeta();
      rt.checkDynamicClassUnlocks();
    }
    return result;
  }

  const api = Object.freeze({
    owner: OWNER,
    configure,
    manaGain,
    occultChannelAttack,
    occultSpellAttack,
    summonerConjure,
    _test: Object.freeze({
      baseChannelAttack,
      summonerChannelLayer,
      baseSpellAttack,
      summonerDispatchSpellLayer,
      manaOverflowSpellLayer,
      rougeFinalSpellLayer
    })
  });

  window.DiceboundCombatManaActionResolution = api;
})();
