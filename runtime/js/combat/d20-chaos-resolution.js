(() => {
  "use strict";

  const OWNER = "combat/d20-chaos-resolution";
  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatD20ChaosResolution must be configured before use.");
    return runtime;
  }

  function configure(next) {
    const required = [
      "getPlayer", "classIdentityActive", "rand", "random", "pick", "clamp",
      "getAttackFx", "delay", "getElements", "getCoreElements", "setCombatText",
      "showToast", "identityFlash", "addCombatHistory", "clampQueuedHaste"
    ];
    for (const name of required) if (typeof next?.[name] !== "function") throw new Error(`D20 chaos runtime missing ${name}().`);
    runtime = next;
    return api;
  }

  const player = () => requireRuntime().getPlayer();

  function d20ResultTitle(roll) {
    if (roll === 1) return "CATASTROPHE";
    if (roll <= 3) return "BAD OMEN";
    if (roll <= 6) return "WEAK TIMELINE";
    if (roll <= 9) return "PATCH-UP";
    if (roll <= 12) return "EMPOWERED";
    if (roll <= 15) return "ECHO + BARRIER";
    if (roll <= 17) return "ELEMENTAL CHAOS";
    if (roll === 18) return "HASTE";
    if (roll === 19) return "CRITICAL MIRACLE";
    return "NATURAL TWENTY";
  }

  // The historical DB046/DB047 layers reset these locks whenever resetPlayer
  // ran.  The canonical reset adapter now calls this once instead of retaining
  // two last-definition-wins resetPlayer wrappers in the monolith.
  function initializePlayerState() {
    const p = player();
    p._db046HasteLocked = false;
    p._db047HastePrimed = false;
  }

  // Final shipped D20 outcome table before the later presentation/Haste layers.
  // Decorative rolls are intentionally real RNG consumption and therefore must
  // remain ahead of the actual roll and High Roll Chance check.
  async function baseRoll(action) {
    const rt = requireRuntime(), p = player();
    if (!rt.classIdentityActive("d20")) return { roll: 0, mult: 1, extraEcho: 0, bonusCrit: 0, potionMult: 1, guardBonus: 0 };

    const fx = rt.getAttackFx();
    fx.className = "attack-fx crit-attack";
    for (let i = 0; i < 4; i++) {
      fx.textContent = `🎲 ${rt.rand(1, 20)}`;
      void fx.offsetWidth;
      await rt.delay(105 + i * 18);
    }

    let roll = rt.rand(1, 20);
    if (p.d20HighRollChance && rt.random() < p.d20HighRollChance) roll = rt.rand(17, 20);
    fx.textContent = `🎲 ${roll}`;
    void fx.offsetWidth;
    await rt.delay(430);

    const out = { roll, mult: 1, extraEcho: 0, bonusCrit: 0, potionMult: 1, guardBonus: 0, notes: "" };
    if (roll === 1) {
      const hurt = Math.max(1, Math.ceil(p.maxHp * .12));
      p.hp = Math.max(1, p.hp - hurt);
      out.mult = .35;
      out.potionMult = .5;
      out.notes = `Natural 1: probability bites back for ${hurt} self-damage.`;
    } else if (roll <= 3) {
      const curse = rt.pick(["ult", "shield", "wobble"]);
      if (curse === "ult") {
        p.ultimateCharge = Math.max(0, p.ultimateCharge - 15);
        out.notes = `Roll ${roll}: fate steals 15 Ultimate charge.`;
      } else if (curse === "shield") {
        out.mult = .65;
        out.notes = `Roll ${roll}: reality becomes suspiciously soft. This action has reduced power.`;
      } else {
        out.mult = .8;
        out.guardBonus = -.08;
        out.notes = `Roll ${roll}: the action wobbles sideways through probability.`;
      }
    } else if (roll <= 6) {
      out.mult = .78;
      out.notes = `Roll ${roll}: a mediocre timeline wins the argument.`;
    } else if (roll <= 9) {
      const h = Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * .08));
      p.hp += h;
      p.ultimateCharge = rt.clamp(p.ultimateCharge + 8, 0, 100);
      out.notes = `Roll ${roll}: fate restores ${h} HP and 8 Ultimate.`;
    } else if (roll <= 12) {
      out.mult = 1.25;
      out.potionMult = 1.3;
      out.guardBonus = .10;
      out.notes = `Roll ${roll}: the action is empowered.`;
    } else if (roll <= 15) {
      out.extraEcho = 1;
      p.combatShield++;
      out.notes = `Roll ${roll}: gain an extra strike and a Barrier.`;
    } else if (roll <= 17) {
      out.mult = 1.6;
      out.forceElement = rt.pick(rt.getCoreElements());
      const element = rt.getElements()[out.forceElement];
      out.notes = `Roll ${roll}: ${element.icon} ${element.name} chaos erupts.`;
    } else if (roll === 18) {
      out.mult = 1.8;
      p.hasteTurns = (p.hasteTurns || 0) + 1;
      out.notes = "Roll 18: double-ish power and the enemy pack may lose its response to Haste.";
    } else if (roll === 19) {
      out.mult = 2;
      out.bonusCrit = 1;
      out.extraEcho = 1;
      out.notes = "Roll 19: double power, a critical tier and an extra strike.";
    } else {
      out.mult = 3;
      out.bonusCrit = 2;
      out.extraEcho = 2;
      out.allElements = true;
      p.hp = p.maxHp;
      p.ultimateCharge = 100;
      p.combatShield += 2;
      out.notes = "NATURAL 20: full heal, triple power, two extra strikes, two Barriers and all six core elements.";
    }

    if (p.d20BonusChance && rt.random() < p.d20BonusChance) {
      const bonus = rt.pick(["echo", "barrier", "heal", "element", "haste", "gold"]);
      if (bonus === "echo") {
        out.extraEcho++;
        out.notes += " Probability adds another Echo.";
      }
      if (bonus === "barrier") {
        p.combatShield++;
        out.notes += " Probability raises a Barrier.";
      }
      if (bonus === "heal") {
        const h = Math.min(p.maxHp - p.hp, rt.rand(4, 12));
        p.hp += h;
        out.notes += ` Probability heals ${h} HP.`;
      }
      if (bonus === "element") {
        out.forceElement = rt.pick(rt.getCoreElements());
        const element = rt.getElements()[out.forceElement];
        out.notes += ` Probability invokes ${element.icon} ${element.name}.`;
      }
      if (bonus === "haste") {
        p.hasteTurns = (p.hasteTurns || 0) + 1;
        out.notes += " Probability grants Haste.";
      }
      if (bonus === "gold") {
        const g = rt.rand(5, 25);
        p.gold += g;
        out.notes += ` Probability manifests ${g} gold for no defensible reason.`;
      }
    }

    rt.setCombatText(`🎲 ${action} d20: ${out.notes}`);
    rt.showToast(`D20 rolled ${roll}`);
    await rt.delay(260);
    return out;
  }

  // V15 readability/history layer.
  async function presentationLayer(action) {
    const rt = requireRuntime();
    const out = await baseRoll(action);
    if (rt.classIdentityActive("d20") && out?.roll) {
      const title = d20ResultTitle(out.roll);
      rt.identityFlash(`🎲 ${out.roll}/20 — ${title}`);
      rt.addCombatHistory(`🎲 ${action.toUpperCase()} ROLL: ${out.roll}/20 — ${title}. ${out.notes || ""}`);
      rt.setCombatText(`🎲 Twenty-Sider ${action}: ${out.roll}/20 — ${title}. ${out.notes || ""}`);
      rt.showToast(`🎲 ${out.roll}/20: ${title}`);
      await rt.delay(260);
    }
    return out;
  }

  // V17 intentionally overwrites the prior final combat text briefly so callers
  // get an explicit resolution beat before their action continues.
  async function resolvingLayer(action) {
    const rt = requireRuntime();
    const out = await presentationLayer(action);
    if (rt.classIdentityActive("d20") && out?.roll) {
      rt.setCombatText(`🎲 ${action.toUpperCase()} ROLL: ${out.roll}/20 — ${d20ResultTitle(out.roll)}. Resolving...`);
      await rt.delay(300);
    }
    return out;
  }

  async function v19HasteCooldownLayer(action) {
    const p = player(), before = p.hasteTurns || 0;
    const out = await resolvingLayer(action);
    if ((p.hasteCooldown || 0) > 0 && (p.hasteTurns || 0) > before) p.hasteTurns = before;
    return out;
  }

  async function beta045HasteClampLayer(action) {
    const rt = requireRuntime(), p = player(), before = p.hasteTurns || 0;
    const out = await v19HasteCooldownLayer(action);
    rt.clampQueuedHaste(before);
    return out;
  }

  async function db046HasteLockLayer(action) {
    const p = player();
    const beforeTurns = p.hasteTurns || 0, beforeCd = p.hasteCooldown || 0, beforeLock = !!p._db046HasteLocked;
    const out = await beta045HasteClampLayer(action);
    if ((p.hasteTurns || 0) > beforeTurns) {
      if (beforeLock || beforeCd > 0 || beforeTurns > 0) p.hasteTurns = beforeTurns;
      else {
        p.hasteTurns = 1;
        p._db046HasteLocked = true;
      }
    }
    return out;
  }

  // DB047 is historically outermost and therefore gets the final veto after
  // the DB046 lock mutation. Preserve that ordering exactly.
  async function rollD20Chaos(action) {
    const p = player();
    const beforeTurns = p.hasteTurns || 0;
    const beforeCd = p.hasteCooldown || 0;
    const beforePrimed = !!p._db047HastePrimed;
    const out = await db046HasteLockLayer(action);
    if ((p.hasteTurns || 0) > beforeTurns) {
      if (beforeTurns > 0 || beforeCd > 0 || beforePrimed) {
        p.hasteTurns = beforeTurns;
      } else {
        p.hasteTurns = 1;
        p._db047HastePrimed = true;
      }
    }
    return out;
  }

  const api = Object.freeze({
    owner: OWNER,
    configure,
    initializePlayerState,
    d20ResultTitle,
    rollD20Chaos,
    _test: Object.freeze({
      baseRoll,
      presentationLayer,
      resolvingLayer,
      v19HasteCooldownLayer,
      beta045HasteClampLayer,
      db046HasteLockLayer
    })
  });

  window.DiceboundCombatD20ChaosResolution = api;
})();
