(() => {
  "use strict";

  const OWNER = "combat/element-resolution";
  const FIRE_BURN_CHANCE = .15;
  const FIRE_BURN_CAP = 10;
  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatElementResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Element-resolution runtime is required.");
    const required = [
      "getPlayer", "getCurrentEnemy", "setCurrentEnemy", "livingEnemies", "getEncounterLead",
      "getEncounterTurn", "setEncounterTurn", "getElements", "getRarityValues", "getCoreElements",
      "random", "clamp", "damageEnemy", "applyPlayerDamage", "healPlayer", "trackElementProgress",
      "playElementAnimation", "addLog", "showToast", "addCombatHistory", "renderEnemyParty",
      "updateCombatUI", "updateHUD", "setProcBonus", "setElementPower", "hasLegendaryEffect",
      "reconcileDefeatedTarget", "withNatureLegacyPresentation", "livingNatureTargets",
      "playNatureOnEnemy", "playNatureOnPlayer", "playDonutRain", "playProjectileProc"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Element-resolution runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function player() { return requireRuntime().getPlayer(); }
  function elements() { return requireRuntime().getElements(); }
  function living() { return requireRuntime().livingEnemies(); }

  function affinityElementMultiplier(enemy, key) {
    return enemy?.affinity === key ? .5 : 1;
  }

  function elementHit(enemy, key, amount, ignoreDefense = false) {
    const rt = requireRuntime();
    return rt.damageEnemy(enemy, amount * affinityElementMultiplier(enemy, key), ignoreDefense);
  }

  function damageAll(amount, falloff = 1) {
    const rt = requireRuntime(), selected = rt.getCurrentEnemy();
    let total = 0;
    for (const enemy of living()) total += rt.damageEnemy(enemy, amount * (enemy === selected ? 1 : falloff));
    return total;
  }

  function elementHitAll(key, amount, falloff = 1, ignoreDefense = false) {
    const rt = requireRuntime(), selected = rt.getCurrentEnemy();
    let total = 0;
    for (const enemy of living()) total += elementHit(enemy, key, amount * (enemy === selected ? 1 : falloff), ignoreDefense);
    return total;
  }

  function addEnemyBurn(target, stacks = 1) {
    if (!target || target.hp <= 0) return 0;
    target.burnStacks = Math.min(FIRE_BURN_CAP, Math.max(0, (target.burnStacks || 0) + Math.max(0, stacks || 0)));
    return target.burnStacks;
  }

  function addPlayerBurn(stacks = 1) {
    const p = player();
    p.db0511BurnStacks = Math.min(10, Math.max(0, (p.db0511BurnStacks || 0) + stacks));
    return p.db0511BurnStacks;
  }

  function addPlayerPoison(stacks = 1, power = .12) {
    const p = player();
    p.db0511PoisonStacks = Math.max(0, (p.db0511PoisonStacks || 0) + stacks);
    p.db0511PoisonPower = Math.max(p.db0511PoisonPower || 0, power || .12);
    return p.db0511PoisonStacks;
  }

  function queuePlayerControl(label) {
    const p = player();
    if (p._db0511SuppressControlProc) return false;
    if (!p._db0511SkipAction) p._db0511SkipAction = label;
    return true;
  }

  function resolveStandardElement(key, target, opts = {}) {
    const rt = requireRuntime(), p = player(), table = elements();
    if (!key || !table[key] || !target || target.hp <= 0) return null;
    const { forced = false, source = "Weapon" } = opts;
    const item = p.equipment?.weapon, e = table[key], weak = target.weakness === key;
    const guaranteedRend = !forced && item?.mythicPiece === "weapon" && p.combatAttackCount > 0 && p.combatAttackCount % 5 === 0;
    if (!forced) {
      if (!item || item.element !== key) return null;
      const rarityValues = rt.getRarityValues();
      const setProc = rt.setProcBonus();
      const chance = rt.clamp(.14 + rarityValues[item.rarity] * .025 + p.elementProcBonus + setProc + (weak ? .22 : 0), 0, .98);
      if (!guaranteedRend && rt.random() >= chance) return null;
    }

    rt.playElementAnimation(key, target, false);
    const rendPower = guaranteedRend ? 1.65 : 1;
    const setElementPower = rt.setElementPower();
    const mult = (weak ? 1.55 + p.weaknessElementBonus : 1) * (1 + p.elementDamageBonus) * rendPower * setElementPower;
    let totalDamage = 0, heal = 0;
    let extra = guaranteedRend ? " Reality Rend guarantees and strengthens the activation." : "";
    const aoe = ["ice", "light", "nature", "metal", "donut"].includes(key);
    const old = rt.getCurrentEnemy();
    rt.setCurrentEnemy(target);

    if (target.affinity === key) extra += ` ${target.name}'s ${e.name} affinity resists half of matching elemental damage.`;
    if (key === "fire") totalDamage = elementHit(target, key, p.attack * .65 * mult);
    if (key === "ice") {
      totalDamage = elementHitAll(key, p.attack * .38 * mult, .85);
      if (target.guardian) {
        if ((target.freezeCooldown || 0) <= 0) {
          target.skipTurns = (target.skipTurns || 0) + 1;
          target.freezeCooldown = 2;
          extra += " The guardian is frozen; Ice Nova cannot freeze it again until it has recovered.";
        } else extra += ` The guardian resists the freeze (${target.freezeCooldown} response${target.freezeCooldown === 1 ? "" : "s"} remain).`;
      } else {
        target.skipTurns = (target.skipTurns || 0) + 1;
        extra += " The selected target is frozen.";
      }
    }
    if (key === "electric") {
      totalDamage = elementHit(target, key, p.attack * .90 * mult);
      const stunChance = target.guardian ? .075 : .15;
      if (rt.random() < stunChance) {
        if (!target.guardian || (target.freezeCooldown || 0) <= 0) {
          target.skipTurns = (target.skipTurns || 0) + 1;
          if (target.guardian) target.freezeCooldown = 1;
          extra += " Static Shock stuns the target for one response!";
        }
      }
    }
    if (key === "light") {
      totalDamage = elementHitAll(key, p.attack * .52 * mult, .75);
      heal = rt.healPlayer(Math.ceil(p.maxHp * (weak ? .15 : .09) * (1 + p.elementDamageBonus)));
      extra += heal ? ` Holy restores ${heal} HP.` : "";
    }
    if (key === "void") totalDamage = elementHit(target, key, Math.max(1, Math.min(target.maxHp * (weak ? .14 : .09) * mult, p.attack * 4.5 * mult)), true);
    if (key === "nature") {
      totalDamage = elementHitAll(key, p.attack * .30 * mult, .8);
      const add = Math.max(1, p.naturePoisonStacks || 1);
      living().forEach(enemy => enemy.poisonStacks = (enemy.poisonStacks || 0) + add);
      extra += ` Poison Vines add ${add} Poison stack${add === 1 ? "" : "s"} to every living enemy.`;
    }
    if (key === "donut") {
      totalDamage = elementHitAll(key, p.attack * .30 * mult, .75);
      heal = rt.healPlayer(Math.ceil(p.maxHp * (weak ? .28 : .18) * (1 + p.elementDamageBonus)));
      extra += ` Donut Rain pelts the pack and restores ${heal} HP.`;
    }
    if (key === "tech") {
      totalDamage = elementHit(target, key, p.attack * .42 * mult);
      const cut = Math.max(1, Math.ceil(target.attack * (weak ? .22 : .14) * (1 + p.elementDamageBonus)));
      target.attack = Math.max(1, target.attack - cut);
      extra += ` Brain Hack lowers ${target.name}'s attack by ${cut}.`;
    }
    if (key === "metal") {
      totalDamage = elementHitAll(key, p.attack * .58 * mult, .78);
      p.ultimateCharge = rt.clamp(p.ultimateCharge + (weak ? 22 : 14), 0, 100);
      extra += " The riff charges your ultimate.";
    }
    if (key === "coffee") {
      totalDamage = elementHit(target, key, p.attack * .34 * mult);
      p.hasteTurns += 1;
      p.ultimateCharge = rt.clamp(p.ultimateCharge + 8, 0, 100);
      extra += " Caffeinated Haste deals damage and grants another action.";
    }
    if (key === "gun") {
      const armorPierce = Math.ceil((target.defense || 0) * .5);
      totalDamage = elementHit(target, key, p.attack * 1.05 * mult + armorPierce);
      extra += " Deadeye Volley ignores roughly half the target's Defense.";
    }

    rt.setCurrentEnemy(old?.hp > 0 ? old : (living()[0] || target));
    if (weak && p.elementUltimateGain) {
      p.ultimateCharge = rt.clamp(p.ultimateCharge + p.elementUltimateGain, 0, 100);
      extra += ` Weakness Lore grants ${p.elementUltimateGain} ultimate charge.`;
    }

    const echoed = rt.random() < rt.clamp(p.elementEchoChance, 0, .80);
    if (echoed) {
      rt.playElementAnimation(key, target, false);
      if (totalDamage) {
        const echoTarget = target.hp > 0 ? target : (living()[0] || target);
        const echoDamage = aoe
          ? damageAll(Math.max(1, totalDamage / Math.max(1, living().length || 1)), .75)
          : rt.damageEnemy(echoTarget, totalDamage);
        totalDamage += echoDamage;
      }
      if (heal) heal += rt.healPlayer(heal);
      extra += " Prismatic Echo repeats the effect!";
    }

    rt.trackElementProgress(key, totalDamage + heal);
    const message = `${weak ? "WEAKNESS! " : ""}${e.icon} ${e.spell}${totalDamage ? ` deals ${totalDamage} elemental damage${aoe ? " across the pack" : ""}.` : ""}${extra}`;
    rt.addLog(`<b>${e.spell}</b> ${source}${weak ? " exploits a weakness" : " activates"}${echoed ? " and echoes" : ""}.`);
    rt.showToast(`${e.icon} ${e.spell}${weak ? " — WEAKNESS!" : ""}${echoed ? " ×2" : ""}`);
    return { totalDamage, heal, message, weak, echoed, aoe };
  }

  function resolveRadiation(key, target, opts = {}) {
    const rt = requireRuntime(), p = player();
    if (!target || target.hp <= 0) return null;
    const { forced = false, source = "Weapon" } = opts;
    const item = p.equipment?.weapon, weak = target.weakness === key;
    if (!forced) {
      if (!item || item.element !== key) return null;
      const rarityValues = rt.getRarityValues();
      const setProc = rt.setProcBonus();
      const chance = rt.clamp(.14 + rarityValues[item.rarity] * .025 + p.elementProcBonus + setProc + (weak ? .22 : 0), 0, .98);
      if (rt.random() >= chance) return null;
    }
    rt.playElementAnimation(key, target, false);
    const mult = (weak ? 1.55 + p.weaknessElementBonus : 1) * (1 + p.elementDamageBonus);
    const damage = elementHit(target, key, p.attack * .34 * mult);
    const before = target.defense || 0;
    const shred = Math.min(before, Math.max(1, Math.round(1 + (weak ? 1 : 0) + p.elementDamageBonus * 2)));
    target.defense = Math.max(0, before - shred);
    rt.trackElementProgress(key, damage);
    const message = `${weak ? "WEAKNESS! " : ""}☢️ Irradiate deals ${damage} damage and lowers ${target.name}'s Defense by ${shred}.`;
    rt.addLog(`<b>Irradiate</b> ${source} ${weak ? "exploits a weakness" : "activates"}.`);
    rt.showToast(`☢️ -${shred} DEF`);
    rt.renderEnemyParty();
    rt.updateCombatUI();
    return { totalDamage: damage, heal: 0, message };
  }

  function resolvePreLegendary(key, target, opts = {}) {
    const rt = requireRuntime(), p = player();
    const beforeAttack = target?.attack;
    const beforeDefense = target?.defense;
    const v19BeforeTurns = p.hasteTurns || 0;
    const beta045BeforeTurns = p.hasteTurns || 0;
    const db046BeforeTurns = p.hasteTurns || 0;
    const db046BeforeCd = p.hasteCooldown || 0;
    const db046BeforeLock = !!p._db046HasteLocked;
    const db047BeforeTurns = p.hasteTurns || 0;
    const db047BeforeCd = p.hasteCooldown || 0;
    const db047BeforePrimed = !!p._db047HastePrimed;

    let out = key === "radiation" ? resolveRadiation(key, target, opts) : resolveStandardElement(key, target, opts);
    if (!out || !target) return out;

    if (key === "fire" && target.hp > 0 && rt.random() < FIRE_BURN_CHANCE) {
      const stacks = addEnemyBurn(target, 1);
      out.message = `${out.message || "🔥 Fireball erupts."} 🔥 Burn applied (${stacks}/${FIRE_BURN_CAP}).`;
      rt.addCombatHistory(`🔥 Fireball ignites ${target.name}: Burn ${stacks}/${FIRE_BURN_CAP}.`);
    }
    if (key === "tech" && Number.isFinite(beforeAttack)) {
      const cut = Math.max(1, Math.ceil(beforeAttack * .10));
      target.attack = Math.max(1, beforeAttack - cut);
      if (out.message) out.message = out.message.replace(/Brain Hack lowers .*? attack by \d+\./, `Brain Hack lowers ${target.name}'s attack by ${beforeAttack - target.attack} (10%).`);
      rt.renderEnemyParty();
      rt.updateCombatUI();
    }
    if (key === "radiation" && Number.isFinite(beforeDefense) && beforeDefense <= 0) {
      target.defense = beforeDefense - 1;
      out.message = `${target.weakness === "radiation" ? "WEAKNESS! " : ""}☢️ Irradiate deals ${out.totalDamage || 0} damage and drives ${target.name}'s Defense from ${beforeDefense} to ${target.defense}, increasing later damage.`;
      rt.renderEnemyParty();
      rt.updateCombatUI();
    }

    if (key === "coffee") {
      if ((p.hasteCooldown || 0) > 0 && (p.hasteTurns || 0) > v19BeforeTurns) {
        p.hasteTurns = v19BeforeTurns;
        out.message = `${out.message || "Coffee crackles."} Haste is cooling down, so no extra action is granted.`;
      }

      const pending = Math.max(0, p.hasteTurns || 0);
      if (beta045BeforeTurns >= 1 && pending > beta045BeforeTurns) p.hasteTurns = beta045BeforeTurns;
      else if (pending > 1) p.hasteTurns = 1;

      const gained046 = (p.hasteTurns || 0) > db046BeforeTurns;
      const blocked046 = db046BeforeLock || db046BeforeCd > 0 || db046BeforeTurns > 0;
      if (gained046 && blocked046) {
        p.hasteTurns = db046BeforeTurns;
        out.message = `${out.message || "Coffee crackles."} Haste is already primed, so no extra action is granted.`;
      } else if (gained046) {
        p.hasteTurns = 1;
        p._db046HasteLocked = true;
      }

      if ((p.hasteTurns || 0) > db047BeforeTurns) {
        if (db047BeforeTurns > 0 || db047BeforeCd > 0 || db047BeforePrimed) {
          p.hasteTurns = db047BeforeTurns;
          out.message = `${out.message || "Coffee crackles."} Haste is already primed, so no extra action is granted.`;
        } else {
          p.hasteTurns = 1;
          p._db047HastePrimed = true;
        }
      }
    }
    return out;
  }

  function resolveLegendaryLayer(key, target, opts = {}) {
    const rt = requireRuntime(), p = player();
    const oldBonus = p.elementDamageBonus || 0;
    const result = resolvePreLegendary(key, target, opts);
    if (result) p._db060LastElement = key;
    if (result && key === "gun" && rt.hasLegendaryEffect("second_barrel") && !p._db060SecondBarrel) {
      p._db060SecondBarrel = true;
      try {
        p.elementDamageBonus = (1 + oldBonus) * .65 - 1;
        const extra = resolvePreLegendary("gun", target?.hp > 0 ? target : (living()[0] || target), { forced: true, source: "Second Barrel" });
        if (extra) result.totalDamage = (result.totalDamage || 0) + (extra.totalDamage || 0);
      } finally {
        p.elementDamageBonus = oldBonus;
        p._db060SecondBarrel = false;
      }
    }
    return result;
  }

  function triggerElementEffect(key, target = requireRuntime().getCurrentEnemy(), opts = {}) {
    const rt = requireRuntime();
    const natureCandidates = key === "nature" ? rt.livingNatureTargets(living()) : [];
    const result = rt.withNatureLegacyPresentation(key, () => resolveLegendaryLayer(key, target, opts));
    if (key === "nature" && result) natureCandidates.forEach(enemy => rt.playNatureOnEnemy(enemy));
    if (key === "donut" && result) rt.playDonutRain({ origin: "player", enemy: target });
    if (target?.hp <= 0) rt.reconcileDefeatedTarget(target, `element:${key}`);
    if (result && (key === "fire" || key === "gun")) rt.playProjectileProc(key, { origin: "player", enemy: target });
    return result;
  }

  function currentWeaponElement() {
    const p = player(), table = elements(), weapon = p.equipment?.weapon;
    return weapon?.element && table[weapon.element] ? weapon.element : null;
  }

  function triggerWeaponElement(target = requireRuntime().getCurrentEnemy()) {
    const rt = requireRuntime(), p = player();
    const key = currentWeaponElement();
    const result = key ? triggerElementEffect(key, target, { forced: false, source: "weapon" }) : null;
    if (result && rt.hasLegendaryEffect("prismatic_weapon") && !p._db060PrismaticWeapon) {
      p._db060PrismaticWeapon = true;
      const old = p.elementDamageBonus || 0;
      try {
        p.elementDamageBonus = (1 + old) * .40 - 1;
        for (const element of rt.getCoreElements()) {
          const nextTarget = target?.hp > 0 ? target : (living()[0] || target);
          if (!nextTarget) break;
          triggerElementEffect(element, nextTarget, { forced: true, source: "Prismatic Weapon" });
        }
      } finally {
        p.elementDamageBonus = old;
        p._db060PrismaticWeapon = false;
      }
    }
    return result;
  }

  function applyPlayerElementDamage(raw) {
    return requireRuntime().applyPlayerDamage(Math.max(1, Math.round(raw || 0)));
  }

  function resolveEnemyCore(enemy) {
    const rt = requireRuntime(), p = player(), table = elements();
    if (!enemy?.affinity || !table[enemy.affinity] || rt.random() > enemy.elementProcChance) return "";
    const key = enemy.affinity, e = table[key];
    rt.playElementAnimation(key, enemy, true);
    let note = `${e.icon} ${enemy.name} activates ${e.spell}: `, hit = null;
    if (key === "fire") {
      hit = applyPlayerElementDamage(enemy.attack * .65); note += `${hit.total} Fire damage.`;
      if (rt.random() < .15) { const stacks = addPlayerBurn(1); note += ` Burn ${stacks}/10 applied.`; }
    } else if (key === "ice") {
      hit = applyPlayerElementDamage(enemy.attack * .38); queuePlayerControl("❄️ Frozen by Ice Nova"); note += `${hit.total} Ice damage and you are Frozen for your next action.`;
    } else if (key === "electric") {
      hit = applyPlayerElementDamage(enemy.attack * .90); note += `${hit.total} Electric damage.`;
      if (rt.random() < .15 && queuePlayerControl("⚡ Stunned by Static Shock")) note += " Static Shock stuns your next action.";
    } else if (key === "light") {
      hit = applyPlayerElementDamage(enemy.attack * .52); const heal = Math.min(enemy.maxHp - enemy.hp, Math.max(1, Math.ceil(enemy.maxHp * .09))); enemy.hp += heal; note += `${hit.total} Light damage and restores ${heal} HP to ${enemy.name}.`;
    } else if (key === "void") {
      const raw = Math.max(1, Math.min(p.maxHp * .09, enemy.attack * 4.5)); hit = applyPlayerElementDamage(raw); note += `${hit.total} Void damage based on your max HP.`;
    } else if (key === "nature") {
      hit = applyPlayerElementDamage(enemy.attack * .30); const stacks = addPlayerPoison(1, .12); note += `${hit.total} Nature damage and Poison Vines add a Poison stack (${stacks}).`;
    } else if (key === "donut") {
      hit = applyPlayerElementDamage(enemy.attack * .30); const heal = Math.min(enemy.maxHp - enemy.hp, Math.max(1, Math.ceil(enemy.maxHp * .18))); enemy.hp += heal; note += `${hit.total} Donut damage and restores ${heal} HP to ${enemy.name}.`;
    } else if (key === "tech") {
      hit = applyPlayerElementDamage(enemy.attack * .42); const before = p.attack, cut = Math.max(1, Math.ceil(Math.max(1, before) * .10)); p.attack = Math.max(1, before - cut); const actual = Math.max(0, before - p.attack); p.db0511TechAttackLost = (p.db0511TechAttackLost || 0) + actual; note += `${hit.total} Tech damage and Brain Hack lowers your Attack by ${actual} for this battle.`;
    } else if (key === "metal") {
      hit = applyPlayerElementDamage(enemy.attack * .58);
      if (rt.getEncounterLead()?.guardian) { rt.setEncounterTurn(rt.getEncounterTurn() + 1); note += `${hit.total} Metal damage and advances the Guardian special clock.`; }
      else { const gain = Math.max(1, Math.round(enemy.attack * .05)); enemy.attack += gain; note += `${hit.total} Metal damage and powers ${enemy.name} up by ${gain} Attack for this battle.`; }
    } else if (key === "coffee") {
      hit = applyPlayerElementDamage(enemy.attack * .34); const extra = applyPlayerElementDamage(enemy.attack * .34); note += `${hit.total + extra.total} Coffee damage as Caffeinated Haste grants ${enemy.name} an immediate extra hit.`;
    } else if (key === "gun") {
      const pierce = Math.ceil(Math.max(0, p.defense) * .5); hit = applyPlayerElementDamage(enemy.attack * 1.05 + pierce); note += `${hit.total} piercing damage, bypassing roughly half your Defense.`;
    } else if (key === "radiation") {
      hit = applyPlayerElementDamage(enemy.attack * .34); const loss = Math.min(Math.max(0, p.defense), 1); if (loss) { p.defense -= loss; p.radiationDefenseLost = (p.radiationDefenseLost || 0) + loss; } note += `${hit.total} Radiation damage${loss ? ` and your Defense falls by ${loss} for this battle` : ""}.`;
    }
    rt.addCombatHistory(note);
    rt.updateCombatUI();
    return note;
  }

  function resolveEnemyNatureAndInnate(enemy) {
    const rt = requireRuntime();
    const innate = enemy?.innateElement;
    const originalAffinity = enemy?.affinity;
    if (innate) enemy.affinity = innate;
    try {
      const effectiveKey = enemy?.affinity;
      const result = rt.withNatureLegacyPresentation(effectiveKey, () => resolveEnemyCore(enemy));
      if (effectiveKey === "nature" && result && player().hp > 0) rt.playNatureOnPlayer();
      return result;
    } finally {
      if (innate) enemy.affinity = originalAffinity;
    }
  }

  function enemyElementProc(enemy) {
    const rt = requireRuntime();
    const outerKey = enemy?.affinity;
    const isDonut = outerKey === "donut";
    const result = resolveEnemyNatureAndInnate(enemy);
    if (isDonut && result) rt.playDonutRain({ origin: "enemy", enemy });
    if (result && (outerKey === "fire" || outerKey === "gun")) rt.playProjectileProc(outerKey, { origin: "enemy", enemy });
    return result;
  }

  function restoreRadiationDefense() {
    const p = player();
    if (p.radiationDefenseLost) {
      p.defense += p.radiationDefenseLost;
      p.radiationDefenseLost = 0;
    }
  }

  function restoreEnemyElementDebuffs() {
    const p = player();
    if (p.db0511TechAttackLost) {
      p.attack += p.db0511TechAttackLost;
      p.db0511TechAttackLost = 0;
    }
    restoreRadiationDefense();
    p.db0511BurnStacks = 0;
    p.db0511PoisonStacks = 0;
    p.db0511PoisonPower = 0;
    p._db0511SkipAction = "";
    p._db0511SuppressControlProc = false;
  }

  const api = Object.freeze({
    owner: OWNER,
    configure,
    affinityElementMultiplier,
    elementHit,
    elementHitAll,
    currentWeaponElement,
    triggerWeaponElement,
    triggerElementEffect,
    enemyElementProc,
    addEnemyBurn,
    restoreRadiationDefense,
    restoreEnemyElementDebuffs,
    fireBurnChance: FIRE_BURN_CHANCE,
    fireBurnCap: FIRE_BURN_CAP
  });

  window.DiceboundCombatElementResolution = api;
})();
