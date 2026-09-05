(() => {
  "use strict";

  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatUltimateResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat Ultimate-resolution runtime is required.");
    const required = [
      "getPlayer","getMeta","getCurrentEnemy","getCurrentEnemies","getEncounterLead","livingEnemies","getCombatBusy","setCombatBusy","selectEnemy",
      "isClassActive","hasLegendaryEffect","random","rand","pick","clamp","rollTieredProc","getSetDamageBonus","ultimateBaseDamage","scaleUltimateDamage",
      "damageEnemy","damageAll","healPlayer","triggerStrikeElements","petDamage","trainerPetDamage","syncOuroborosAttack",
      "rollD20Chaos","updateCombatUI","animateUltimate","animateClassAttack","setCombatText","addCombatHistory","identityFlash",
      "playCritSfx","playHolySfx","delay","getCombatActionDelay","winCombat","resolveEnemyResponse","petTurn","applyMythicPantsPulse","applyMythicRingPulse",
      "potionHealValue","getPets","getGagInfo","slimeRougeUltimate","getFastEchoCap","setFastEchoCap","frogEchoCap",
      "dragoonActive","dragoonLandingReady","dragoonLanding","tickDragoonCooldown"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat Ultimate-resolution runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function player() { return requireRuntime().getPlayer(); }
  function currentEnemy() { return requireRuntime().getCurrentEnemy(); }
  function currentEnemies() { return requireRuntime().getCurrentEnemies(); }
  function livingEnemies() { return requireRuntime().livingEnemies(); }

  async function finishAfterAction(delayMs) {
    const rt = requireRuntime();
    await rt.delay(delayMs);
    const living = livingEnemies();
    if (!living.length) return rt.winCombat();
    rt.selectEnemy(currentEnemies().indexOf(living[0]));
    return rt.resolveEnemyResponse(false);
  }

  async function genericUltimate() {
    const rt = requireRuntime(), p = player(), enemy = currentEnemy();
    if (rt.getCombatBusy() || !enemy || p.ultimateCharge < 100) return;
    rt.setCombatBusy(true); p.guardCooldown = 0; p.ultimateCharge = 0;
    const chaos = await rt.rollD20Chaos("ultimate");
    rt.updateCombatUI();
    await rt.animateUltimate();

    let damage = 0, text = "", aoe = ["ranger","sorcerer","clown","berserker","turtle","slime","vampire","ceo","merchant","cleric","paladin","beastmaster"].includes(p.classId), twoTarget = false;
    if (p.classId === "fighter") {
      damage = Math.round(p.attack * 2.6) + rt.rand(2, 5); p.combatShield += 1 + (p.titanCleaveBarrierBonus || 0); twoTarget = true;
      text = `Titan Cleave hits up to two enemies for {DAMAGE} total damage and raises ${1 + (p.titanCleaveBarrierBonus || 0)} barrier${(1 + (p.titanCleaveBarrierBonus || 0)) === 1 ? "" : "s"}.`;
    } else if (p.classId === "ranger") { damage = Math.round(p.attack * 3.4) + rt.rand(3, 7); text = "Arrow Storm sweeps the pack for {DAMAGE}.";
    } else if (p.classId === "sorcerer") { damage = Math.round(p.attack * 3) + rt.rand(4, 8); text = "Starfall crashes across the pack for {DAMAGE}.";
    } else if (p.classId === "monk") { damage = Math.round(p.attack * 3.25) + rt.rand(3, 7); const h = rt.healPlayer(Math.ceil(p.maxHp * .10)); text = `Hundred Fists deals {DAMAGE} and restores ${h} HP.`;
    } else if (p.classId === "clown") { damage = Math.round(p.attack * (rt.rand(240, 420) / 100)) + rt.rand(2, 10); text = "Final Punchline devastates the pack for {DAMAGE}.";
    } else if (p.classId === "berserker") { damage = rt.ultimateBaseDamage("berserker", p, rt.rand(5, 10)); text = "Ragequake shatters the pack for {DAMAGE}.";
    } else if (p.classId === "turtle") { damage = Math.round((p.attack + p.defense) * 2.4) + rt.rand(4, 8); p.combatShield += 2; text = "Shellquake deals {DAMAGE} and grants two barriers.";
    } else if (p.classId === "frog") {
      const jumps = 6 + Math.floor(p.doubleStrike * 4), scale = .75 + p.doubleStrike * .55; let dealt = 0;
      for (let i = 0; i < jumps && livingEnemies().length; i++) { const t = rt.pick(livingEnemies()); dealt += rt.damageEnemy(t, (p.attack + rt.rand(0, 2)) * scale); await rt.animateClassAttack(i ? "echo" : "normal"); await rt.delay(rt.getCombatActionDelay()); }
      text = `Croak Cascade converts ${Math.round(p.doubleStrike * 100)}% Echo into ${jumps} jumps for ${dealt} total damage.`; damage = 0;
    } else if (p.classId === "d20") { damage = Math.round(p.attack * (2.1 + chaos.roll * .12)) + rt.rand(1, chaos.roll || 1); aoe = chaos.roll >= 15; text = "Natural Twenty warps probability for {DAMAGE}.";
    } else if (p.classId === "slime") { damage = Math.round(p.attack * 2.7) + rt.rand(3, 8); text = "Ooze Everything washes over the pack for {DAMAGE}.";
    } else if (p.classId === "vampire") { damage = Math.round(p.attack * 3.15) + rt.rand(4, 9); text = "Crimson Eclipse drains the pack for {DAMAGE}.";
    } else if (p.classId === "ninja") {
      let dealt = 0;
      for (let i = 0; i < 5 && livingEnemies().length; i++) { const t = currentEnemy()?.hp > 0 ? currentEnemy() : livingEnemies()[0], crit = rt.rollTieredProc(p.crit) + 1, d = Math.round(p.attack * .85 * (1 + crit)); dealt += rt.damageEnemy(t, d); await rt.animateClassAttack("crit"); await rt.delay(rt.getCombatActionDelay()); }
      text = `Thousand Shadows lands five guaranteed critical strikes for ${dealt} total damage.`; damage = 0;
    } else if (p.classId === "ceo") { damage = Math.round(p.attack * 2.8 + p.gold * .10) * (1 + p.bossDamage); text = "Quarterly Annihilation liquidates the pack for {DAMAGE}.";
    } else if (p.classId === "merchant") { damage = Math.round(p.attack * 3 + p.gold * .20); p.gold += 50; p.combatShield += 2; text = "Market Monopoly deals {DAMAGE}, grants 50 gold and raises two barriers.";
    } else if (p.classId === "cleric") { damage = Math.round(p.attack * 2.45 + p.maxHp * .16) + rt.rand(3, 7); const h = rt.healPlayer(Math.ceil(p.maxHp * .28)); text = `Divine Reckoning deals {DAMAGE} and restores ${h} HP.`;
    } else if (p.classId === "paladin") { damage = Math.round((p.attack + p.defense * .9) * 2.65) + rt.rand(3, 8); p.combatShield += 2; const h = rt.healPlayer(Math.ceil(p.maxHp * .15)); text = `Aegis Judgment deals {DAMAGE}, restores ${h} HP and raises two barriers.`;
    } else if (rt.isClassActive("beastmaster")) { damage = Math.round(p.attack * 2 + rt.petDamage() * 5.5) + rt.rand(4, 9); text = "Call of the Pack tears through every enemy for {DAMAGE}.";
    } else if (p.classId === "rogue") { damage = Math.round(p.attack * 4.1 + p.gold * .025) + rt.rand(4, 10); const stolen = 75 + Math.floor(p.level * 5); p.gold += stolen; text = `Grand Larceny strikes for {DAMAGE} and steals ${stolen} gold.`;
    } else { damage = Math.round(p.attack * 3.1) + rt.rand(4, 8); text = "Crimson Deluge paints the battlefield for {DAMAGE}."; }

    damage = rt.scaleUltimateDamage(damage, p, { chaosMultiplier: chaos.mult || 1, setDamageBonus: rt.getSetDamageBonus() });
    if (rt.getEncounterLead()?.boss) damage = Math.round(damage * (1 + p.bossDamage));
    let dealt = 0;
    if (twoTarget) [currentEnemy(), ...livingEnemies().filter(e => e !== currentEnemy())].slice(0, 2).forEach((e, i) => dealt += rt.damageEnemy(e, damage * (i ? .85 : 1)));
    else if (!["frog", "ninja"].includes(p.classId)) dealt = aoe ? rt.damageAll(damage, .78) : rt.damageEnemy(currentEnemy(), damage);
    const proc = livingEnemies().length ? rt.triggerStrikeElements(currentEnemy(), chaos) : { totalDamage: 0, message: "" };
    const drain = p.lifeSteal + (p.classId === "sorcerer" ? .20 : 0) + (p.classId === "rouge" ? .25 : 0) + (p.classId === "vampire" ? .50 : 0);
    const healAmount = drain > 0 && (dealt + proc.totalDamage) > 0 ? Math.max(1, Math.floor((dealt + proc.totalDamage) * drain)) : 0;
    const healed = rt.healPlayer(healAmount);
    const pants = rt.applyMythicPantsPulse();
    text = text.replace("{DAMAGE}", dealt) + (proc.message ? ` ${proc.message}` : "") + (healed ? ` Lifesteal restores ${healed} HP.` : "") + (pants ? ` ${pants}` : "");
    rt.setCombatText(text); rt.playCritSfx(); rt.updateCombatUI();
    return finishAfterAction(850);
  }

  async function v11BloodmageUltimate() {
    const rt = requireRuntime(), p = player();
    if (p.classId !== "bloodmage") return genericUltimate();
    if (rt.getCombatBusy() || !currentEnemy() || p.ultimateCharge < 100) return;
    rt.setCombatBusy(true); p.guardCooldown = 0; p.ultimateCharge = 0; p.combatActionCount++;
    const chaos = await rt.rollD20Chaos("ultimate"); rt.updateCombatUI(); await rt.animateUltimate();
    let damage = Math.round((p.attack * 3.4 + Math.max(0, p.maxHp - p.hp) * 1.4) * (chaos.mult || 1) * (1 + p.classUltimateBonus) * (1 + p.ultimateDamageBonus) * (1 + p.damageBonus + rt.getSetDamageBonus()));
    if (rt.getEncounterLead()?.boss) damage = Math.round(damage * (1 + p.bossDamage));
    const dealt = rt.damageAll(damage, .82), healed = rt.healPlayer(Math.max(1, Math.floor(dealt * .30))), ring = rt.applyMythicRingPulse();
    rt.setCombatText(`🩸☄️ Sanguine Cataclysm drenches the field for ${dealt} total damage and restores ${healed} HP.${ring ? ` ${ring}` : ""}`);
    rt.playCritSfx(); rt.updateCombatUI();
    return finishAfterAction(850);
  }

  async function v13RangerUltimate() {
    const rt = requireRuntime(), p = player();
    if (!rt.isClassActive("ranger")) return v11BloodmageUltimate();
    const marks = currentEnemies().reduce((n, e) => n + (e.rangerMarks || 0), 0), bonus = Math.min(.75, marks * .12);
    if (bonus) p.classUltimateBonus += bonus;
    try { return await v11BloodmageUltimate(); }
    finally { if (bonus) p.classUltimateBonus -= bonus; currentEnemies().forEach(e => e.rangerMarks = 0); rt.updateCombatUI(); }
  }

  async function v15CompanionUltimate() {
    const rt = requireRuntime(), p = player();
    if (!rt.isClassActive("summoner") && !rt.isClassActive("pokemontrainer")) return v13RangerUltimate();
    if (rt.getCombatBusy() || !currentEnemy() || p.ultimateCharge < 100) return;
    rt.setCombatBusy(true); p.guardCooldown = 0; p.ultimateCharge = 0; p.combatActionCount++; await rt.animateUltimate();
    let dealt = 0;
    if (rt.isClassActive("summoner")) {
      let ids = [...(p.summonerSpirits || [])], pool = Object.keys(rt.getPets()).filter(id => rt.getMeta().pets?.[id]?.unlocked);
      while (ids.length < 3 && pool.length) { const id = rt.pick(pool); if (!ids.includes(id) || pool.length <= ids.length) ids.push(id); else pool = pool.filter(x => x !== id); }
      const per = Math.round((p.attack * 1.25 + rt.petDamage() * 1.7) * (1 + p.classUltimateBonus));
      dealt = rt.damageAll(per + ids.length * rt.petDamage(), .82);
      rt.setCombatText(`🌌 Grand Convergence calls ${Math.max(1, ids.length)} spirits through the pact for ${dealt} total damage.`);
    } else {
      const ids = p.trainerRoster || [], rosterPower = ids.reduce((sum, id) => sum + rt.trainerPetDamage(id), 0), per = Math.round((p.attack * 1.2 + rosterPower * 1.25) * (1 + (p.trainerUltimateBonus || 0)) * (1 + p.classUltimateBonus));
      dealt = rt.damageAll(per, .88);
      const pets = rt.getPets(); rt.setCombatText(`🌈🐾 Six-Pack Stampede sends ${ids.map(id => pets[id]?.icon || "🐾").join("")} across the battlefield for ${dealt} total damage.`);
    }
    rt.playCritSfx(); rt.updateCombatUI();
    return finishAfterAction(900);
  }

  function rerollClownGag() {
    const rt = requireRuntime(), p = player(), gagInfo = rt.getGagInfo(), old = p.clownGimmick, pool = Object.keys(gagInfo).filter(x => x !== old);
    p.clownGimmick = rt.pick(pool.length ? pool : Object.keys(gagInfo)); p.clownPieReady = p.clownGimmick === "Exploding Pie";
    if (p.clownGimmick === "Safety Net") p.combatShield++;
    if (p.clownGimmick === "Standing Ovation") p.ultimateCharge = rt.clamp(p.ultimateCharge + 25, 0, 100);
    rt.identityFlash(`🤡 New gag: ${p.clownGimmick}`);
    rt.addCombatHistory(`Opening Gag rerolled: ${p.clownGimmick} — ${gagInfo[p.clownGimmick]}`);
  }

  async function v16IdentityUltimate() {
    const rt = requireRuntime(), p = player();
    if (rt.isClassActive("alchemist")) {
      if (rt.getCombatBusy() || !currentEnemy() || p.ultimateCharge < 100) return;
      rt.setCombatBusy(true); p.guardCooldown = 0; p.ultimateCharge = 0; p.combatActionCount++; await rt.animateUltimate(); p.potions += 3;
      const healing = rt.potionHealValue(.65), heal = rt.healPlayer(healing), damage = rt.damageAll(Math.round(rt.potionHealValue() * 1.55 + p.attack * 1.4), .86);
      rt.playHolySfx(); rt.setCombatText(`⚗️ Grand Distillation brews 3 potions, restores ${heal} HP and detonates restorative chemistry for ${damage} total damage.`); rt.updateCombatUI();
      return finishAfterAction(850);
    }
    let extra = 0, gag = null, ovation = false, turtleUltimateBonus = 0;
    if (rt.isClassActive("clown")) {
      gag = p.clownGimmick;
      if (gag === "Big Shoes") { p.combatShield += 2; extra = .10; }
      if (gag === "Rubber Chicken") extra = .35;
      if (gag === "Exploding Pie") extra = .65;
      if (gag === "Safety Net") { p.combatShield += 3; extra = .10; }
      if (gag === "Standing Ovation") { extra = .22; ovation = true; }
      p.classUltimateBonus += extra;
    }
    if (rt.isClassActive("turtle") && (p.turtleGuardChain || 0) > 0) { turtleUltimateBonus = Math.min(.75, p.turtleGuardChain * .12); p.classUltimateBonus += turtleUltimateBonus; }
    if (rt.isClassActive("ranger")) {
      const marks = currentEnemies().reduce((n, e) => n + (e.rangerMarks || 0), 0), old = Math.min(.75, marks * .12), desired = Math.min(1.20, marks * .12), bonus = Math.max(0, desired - old);
      if (bonus) p.classUltimateBonus += bonus;
      try { return await v15CompanionUltimate(); }
      finally { if (bonus) p.classUltimateBonus -= bonus; }
    }
    try {
      const result = await v15CompanionUltimate();
      if (gag && currentEnemy() && p.hp > 0) { if (ovation) p.ultimateCharge = rt.clamp(p.ultimateCharge + 45, 0, 100); rerollClownGag(); rt.updateCombatUI(); }
      if (turtleUltimateBonus) { p.turtleGuardChain = 0; rt.identityFlash("🐢 Shell Momentum released!"); rt.updateCombatUI(); }
      return result;
    } finally {
      if (extra) p.classUltimateBonus -= extra;
      if (turtleUltimateBonus) p.classUltimateBonus -= turtleUltimateBonus;
    }
  }

  async function v17NinjaUltimate() {
    const rt = requireRuntime(), p = player(), ninja = rt.isClassActive("ninja"), before = ninja ? (p.ninjaSmoke || 0) : 0, result = await v16IdentityUltimate();
    if (ninja) { const need = p.ninjaSmokeNeed || 3; p.ninjaSmoke = Math.min(need, before + 5); rt.addCombatHistory(`🌘 Thousand Shadows' five guaranteed critical strikes build Smoke to ${p.ninjaSmoke}/${need}.`); rt.updateCombatUI(); }
    return result;
  }

  async function v18OuroborosUltimate() {
    const rt = requireRuntime(), p = player();
    if (!rt.isClassActive("ouroboros")) return v17NinjaUltimate();
    if (rt.getCombatBusy() || !currentEnemy() || p.ultimateCharge < 100) return;
    rt.setCombatBusy(true); p.guardCooldown = 0; p.ultimateCharge = 0; p.combatActionCount++; rt.syncOuroborosAttack(); await rt.animateUltimate();
    const hits = Math.min(14, 4 + Math.floor((p.doubleStrike || 0) * 1.5)); let total = 0;
    for (let i = 0; i < hits && livingEnemies().length; i++) { const target = (i === 0 && currentEnemy()?.hp > 0) ? currentEnemy() : rt.pick(livingEnemies()), raw = Math.round(p.attack * (1.15 + (p.doubleStrike || 0) * .08) + rt.rand(1, 4)); total += rt.damageEnemy(target, raw); target.poisonStacks = (target.poisonStacks || 0) + 1; await rt.animateClassAttack(i ? "echo" : "normal"); }
    rt.setCombatText(`♾️☠️ Infinite Return loops ${hits} times for ${total} total damage and leaves one Poison stack per bite.`); rt.playCritSfx(); rt.updateCombatUI(); await rt.petTurn();
    return finishAfterAction(500);
  }

  async function v25FrogPoisonLifetime() {
    const rt = requireRuntime(), p = player();
    if (!rt.isClassActive("frog")) return v18OuroborosUltimate();
    p._v25CroakHitsRemaining = Math.max(0, 6 + Math.floor((p.doubleStrike || 0) * 4));
    try { return await v18OuroborosUltimate(); }
    finally { p._v25CroakHitsRemaining = 0; }
  }

  async function v27OuroborosSpeed() {
    const rt = requireRuntime(), p = player();
    if (p.classId !== "ouroboros") return v25FrogPoisonLifetime();
    const oldCap = rt.getFastEchoCap() || 0, echo = p.doubleStrike || 0; rt.setFastEchoCap(echo >= 50 ? 8 : echo >= 10 ? 28 : 90);
    try { return await v25FrogPoisonLifetime(); }
    finally { rt.setFastEchoCap(oldCap); }
  }

  async function v28FrogSpeedAndSlimeRouge() {
    const rt = requireRuntime(), p = player();
    if (p.classId === "slimerouge") return rt.slimeRougeUltimate();
    if (p.classId !== "frog") return v27OuroborosSpeed();
    const oldCap = rt.getFastEchoCap() || 0, cap = rt.frogEchoCap(p.doubleStrike || 0); if (cap) rt.setFastEchoCap(cap);
    try { return await v27OuroborosSpeed(); }
    finally { rt.setFastEchoCap(oldCap); }
  }

  async function unstableUltimate() {
    const rt = requireRuntime(), p = player();
    if (!rt.hasLegendaryEffect("unstable_ultimate")) return v28FrogSpeedAndSlimeRouge();
    if (rt.getCombatBusy() || !currentEnemy() || p.ultimateCharge < 70) return;
    const oldBonus = p.classUltimateBonus || 0; p.ultimateCharge = 100; p.classUltimateBonus = oldBonus - .25;
    try { return await v28FrogSpeedAndSlimeRouge(); }
    finally { p.classUltimateBonus = oldBonus; p.ultimateCharge = Math.max(0, p.ultimateCharge); }
  }

  async function dragonDive() {
    const rt = requireRuntime(), p = player();
    if (!rt.dragoonActive() || rt.getCombatBusy() || !currentEnemy() || p.ultimateCharge < 100) return false;
    rt.setCombatBusy(true); p.guardCooldown = 0; p.ultimateCharge = 0;
    const target = currentEnemy()?.hp > 0 ? currentEnemy() : livingEnemies()[0], critTiers = rt.rollTieredProc(p.crit), damage = Math.round((p.attack * 4.4 + rt.rand(5, 11)) * (1 + critTiers) * (rt.getEncounterLead()?.boss ? 1 + p.bossDamage : 1)), dealt = rt.damageEnemy(target, damage);
    await rt.animateUltimate(); const proc = target?.hp > 0 ? rt.triggerStrikeElements(target) : { message: "" };
    rt.setCombatText(`🐉 Dragon Dive deals ${dealt}${critTiers ? ` with ${critTiers} critical tier${critTiers === 1 ? "" : "s"}` : ""}.${proc?.message ? ` ${proc.message}` : ""}`); rt.playCritSfx(); rt.updateCombatUI();
    await rt.delay(720);
    const living = livingEnemies(); if (!living.length) return rt.winCombat(); rt.selectEnemy(currentEnemies().indexOf(living[0])); await rt.resolveEnemyResponse(false); return true;
  }

  async function friendsUltimate() {
    const rt = requireRuntime();
    if (rt.dragoonActive() && rt.dragoonLandingReady()) return rt.dragoonLanding();
    if (rt.dragoonActive()) return dragonDive();
    rt.tickDragoonCooldown();
    return unstableUltimate();
  }

  async function start(...args) { return friendsUltimate(...args); }

  const api = Object.freeze({
    apiVersion: 1,
    owner: "combat/ultimate-resolution",
    configure,
    start,
    _test: Object.freeze({ genericUltimate, v11BloodmageUltimate, v13RangerUltimate, v15CompanionUltimate, v16IdentityUltimate, v17NinjaUltimate, v18OuroborosUltimate, v25FrogPoisonLifetime, v27OuroborosSpeed, v28FrogSpeedAndSlimeRouge, unstableUltimate, dragonDive, friendsUltimate })
  });

  window.DiceboundCombatUltimateResolution = api;
})();
