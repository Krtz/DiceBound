(() => {
  "use strict";

  const OWNER = "combat/mana-action-resolution";
  let runtime = null;
  const SPELLS = {
    sorcerer:{builder:"Channel Bolt",builderIcon:"🔮",spell:"Arcane Lance",spellIcon:"✦",cost:35,gain:28,desc:"Channel Bolt deals slightly reduced normal attack damage and builds Mana. Arcane Lance spends 35 Mana for a heavy spell, converts half of your Echo Strike chance into bonus Lance damage, applies Lifesteal, and guarantees a random core-element eruption."},
    vampire:{builder:"Night Siphon",builderIcon:"🦇",spell:"Grave Lance",spellIcon:"🌑",cost:35,gain:26,desc:"Night Siphon builds Mana while attacking. Grave Lance spends 35 Mana for heavy damage and drains 30% of the direct damage as HP."},
    rouge:{builder:"Crimson Stroke",builderIcon:"🖌️",spell:"Scarlet Hex",spellIcon:"🌹",cost:35,gain:27,desc:"Crimson Stroke paints Mana into existence. Scarlet Hex spends 35 Mana for a high-crit occult strike, converts half of Echo Strike chance into bonus spell damage, splashes the pack, and real Rouge drains doubled Lifesteal from the full Hex."},
    merchant:{builder:"Ledger Tap",builderIcon:"📜",spell:"Foreclosure Hex",spellIcon:"⚖️",cost:40,gain:30,desc:"Ledger Tap builds Mana through deeply questionable accounting. Foreclosure Hex spends 40 Mana and converts part of your current gold into occult damage."},
    invoker:{builder:"Wex Strike",builderIcon:"🟢",spell:"Elemental Lance",spellIcon:"🔴",cost:50,gain:25,desc:"Quas, Wex and Exort Strikes create Blue, Green and Red orbs. Wex also generates Mana. Elemental Lance spends 50 Mana for a stronger Red attack and converts half of current Echo chance into bonus spell damage."},
    summoner:{builder:"Spirit Bolt",builderIcon:"📖",spell:"Conjure Familiar",spellIcon:"🐾",cost:40,gain:26,desc:"Spirit Bolt builds Mana. Spend 40 Mana to conjure a random unlocked companion spirit for this battle, up to three active spirits. Summoned spirits join pet attacks."}
  };


  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatManaActionResolution must be configured before use.");
    return runtime;
  }

  function configure(next) {
    const required = [
      "getPlayer", "getCurrentEnemy", "getCurrentEnemies", "livingEnemies", "getCombatBusy", "setCombatBusy",
      "classIdentityId", "isClassActive", "clamp", "playerAttack", "invokerActive",
      "invokerWexStrike", "invokerElementalLance", "identityFlash", "updateCombatUI",
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
  function spells() { return SPELLS; }
  function spellFor(id) { return SPELLS[id] || null; }
  function isManaClass(id) { return !!SPELLS[id]; }
  function identityNote(id) {
    const spell = spellFor(id);
    return spell ? `Mana class — ${spell.builder} builds Mana; ${spell.spell} spends it.` : null;
  }

  function manaGain(amount) {
    const rt = requireRuntime(), p = player();
    if (!p.maxMana) return 0;
    const before = p.mana;
    p.mana = rt.clamp(p.mana + amount, 0, p.maxMana);
    return p.mana - before;
  }

  // Generator transaction: Mana lands before the underlying Basic Attack.
  async function baseChannelAttack() {
    const rt = requireRuntime(), p = player();
    if (rt.getCombatBusy() || !currentEnemy()) return;
    const cfg = spellFor(rt.classIdentityId());
    if (!cfg) return rt.playerAttack();
    if (rt.isClassActive("invoker") && rt.invokerActive()) return rt.invokerWexStrike();
    const gained = manaGain(cfg.gain);
    p._occultChanneling = true;
    p._occultChannelMultiplier = 0;
    rt.identityFlash(`${cfg.builderIcon} +${gained} Mana`);
    try {
      await rt.playerAttack();
    } finally {
      p._occultChanneling = false;
      p._occultChannelMultiplier = 0;
    }
    rt.updateCombatUI();
  }

  async function summonerChannelLayer(...args) {
    const rt = requireRuntime(), p = player();
    if (!rt.isClassActive("summoner") || !(p.summonerManaBonus || 0)) return baseChannelAttack(...args);
    const cfg = spellFor("summoner"), old = cfg.gain;
    cfg.gain = old + (p.summonerManaBonus || 0);
    try {
      return await baseChannelAttack(...args);
    } finally {
      cfg.gain = old;
    }
  }

  async function occultChannelAttack(...args) {
    const rt = requireRuntime(), p = player(), cfg = spellFor(rt.classIdentityId()), bonus = p.manaBuilderBonus || 0;
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
    const cfg = spellFor(rt.classIdentityId());
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
      const tiers = rt.rollTieredProc(p.crit + .35), echoScale = 1 + Math.max(0, Number(p.doubleStrike) || 0) * .50;
      damage = Math.round((p.attack * 1.85 + rt.rand(3, 8)) * (1 + tiers) * echoScale);
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
    const cfg = spellFor("summoner");
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

  // Mana Overflow grants Ultimate after any qualifying Mana spend.
  async function manaOverflowSpellLayer(...args) {
    const rt = requireRuntime(), p = player(), before = p.mana || 0;
    const result = await summonerDispatchSpellLayer(...args);
    if (p.manaSpendUltimate && p.mana < before) {
      p.ultimateCharge = rt.clamp(p.ultimateCharge + p.manaSpendUltimate, 0, 100);
      rt.updateCombatUI();
    }
    return result;
  }

  // Real Rouge uses doubled Lifesteal; borrowed Rouge identity uses the generic spender.
  async function rougeFinalSpellLayer(...args) {
    const rt = requireRuntime(), p = player();
    if (p.classId !== "rouge") return manaOverflowSpellLayer(...args);
    if (rt.getCombatBusy() || !currentEnemy()) return;
    const cfg = spellFor(p.classId);
    if (!cfg || p.mana < cfg.cost) return;
    rt.setCombatBusy(true);
    p.guardCooldown = 0;
    p.mana -= cfg.cost;
    p.combatActionCount++;
    const target = currentEnemy();
    await rt.animateClassAttack("crit");
    let extra = "", splashTotal = 0;
    const tiers = rt.rollTieredProc(p.crit + .35), echoScale = 1 + Math.max(0, Number(p.doubleStrike) || 0) * .50;
    let damage = Math.round((p.attack * 1.85 + rt.rand(3, 8)) * (1 + tiers) * echoScale);
    if (livingEnemies().length > 1) {
      const splash = Math.max(1, Math.round(damage * .28));
      livingEnemies().filter(enemy => enemy !== target).forEach(enemy => { splashTotal += rt.damageEnemy(enemy, splash); });
      extra = ` Scarlet paint splashes the rest of the pack for ${splash} each.`;
    }
    damage = Math.round(damage * (1 + p.damageBonus + rt.getSetDamageBonus()));
    if (rt.getEncounterLead()?.boss) damage = Math.round(damage * (1 + p.bossDamage));
    const dealt = rt.damageEnemy(target, damage);
    const drainPool = dealt + splashTotal, effectiveLifesteal = Math.max(0, Number(p.lifeSteal) || 0);
    const heal = effectiveLifesteal > 0 && drainPool > 0 ? Math.max(1, Math.floor(drainPool * effectiveLifesteal * 2)) : 0;
    if (heal > 0) {
      const restored = rt.healPlayer(heal);
      extra += ` Scarlet Hex drinks back ${restored} HP from ${drainPool} total Hex damage.`;
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

  // Record one career spend after a successful non-Invoker Mana spender action.
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
    spells,
    spellFor,
    isManaClass,
    identityNote,
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
