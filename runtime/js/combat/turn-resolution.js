(() => {
  "use strict";

  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatTurnResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat turn-resolution runtime is required.");
    const required = [
      "getPlayer","getCurrentEnemy","getCurrentEnemies","getEncounterLead","getEncounterTurn","setEncounterTurn","setCombatBusy",
      "livingEnemies","selectEnemy","random","rand","clamp","delay","petTurn","applyPoisonTick","winCombat","handlePlayerDeath",
      "setCombatText","updateCombatUI","addCombatHistory","renderEnemyParty","triggerElementEffect","defenseDamageReduction",
      "effectiveDodgeChance","enemyElementProc","damageEnemy","healPlayer","mythicalSetCount","guardianSpecialMultiplier",
      "hasMythicPiece","hasDevilsHorns","hasHeadphones","hasLegendaryEffect","checkDynamicClassUnlocks","saveMeta","playHitSfx",
      "recordDamageTaken","wolfEchoChance","successfulDodgePresentation","dragoonActive"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat turn-resolution runtime missing ${name}().`);
    if (!Number.isFinite(Number(nextRuntime.guardianSpecialInterval)) || Number(nextRuntime.guardianSpecialInterval) < 1) throw new Error("Combat turn-resolution runtime requires guardianSpecialInterval.");
    runtime = nextRuntime;
    return api;
  }

  function getPlayer() { return requireRuntime().getPlayer(); }
  function livingEnemies() { return requireRuntime().livingEnemies(); }

  function applyPlayerDamage(raw) {
    const rt = requireRuntime(), player = rt.getPlayer();
    raw = Math.max(0, Math.round(raw || 0));
    const shield = Math.min(player.energyShield || 0, raw);
    if (shield) { player.energyShield -= shield; raw -= shield; }
    const hp = Math.min(player.hp, raw);
    player.hp = Math.max(0, player.hp - hp);
    rt.recordDamageTaken(shield + hp);
    return Object.freeze({ shield, hp, total: shield + hp });
  }

  function enemyAttackPattern(enemy) {
    const rt = requireRuntime(), player = rt.getPlayer(), turn = rt.getEncounterTurn() || 1, name = enemy?.name || "";
    if (enemy?.devilBoss) {
      if ((player.combatShield || 0) > 0) return { name: "Pitchfork Rake", hits: [.46, .46, .46], burn: 1 };
      const phase = turn % 4;
      if (phase === 0) return { name: "Pale Moon Verdict", hits: [1.48], burn: 2 };
      if (phase === 1) return { name: "False Step", hits: [.34, 1.08], burn: 1 };
      if (phase === 2) return { name: "Ember Waltz", hits: [.58, .58], burn: 1 };
      return { name: "Ashen Kiss", hits: [.92], burn: 2, drain: .20 };
    }
    if (enemy?.bloodmageBoss) return turn % 2 ? { name: "Blood Needles", hits: [.62, .62] } : { name: "Sanguine Drain", hits: [1.05], drain: .30 };
    if (name.includes("Nullstar Hydra")) return turn % 2 ? { name: "Hydra Heads", hits: [.46, .46, .46] } : { name: "Null Bite", hits: [1.12] };
    if (name.includes("Crown-Eater")) return turn % 2 ? { name: "Royal Talons", hits: [.64, .64] } : { name: "Crown Bite", hits: [1.12] };
    if (name.includes("Ring Tyrant")) return turn % 2 ? { name: "Looping Fangs", hits: [.68, .68] } : { name: "Tyrant Bite", hits: [1.14] };
    if (name.includes("Abyssal Custodian")) return turn % 2 ? { name: "Twin Seal Bash", hits: [.68, .68] } : { name: "Custodian Crush", hits: [1.12] };
    if (name.includes("Last Equation")) return turn % 2 ? { name: "Division Sequence", hits: [.50, .50, .50] } : { name: "Proof Strike", hits: [1.22] };
    if (name.includes("Astral Devourer") && turn % 3 === 0) return { name: "Devouring Claws", hits: [.64, .64] };
    return { name: "Attack", hits: [1] };
  }

  async function resolveNormalHits(enemy, guarded, extraGuardPower, messages, roundState = { hit: false }) {
    const rt = requireRuntime(), player = rt.getPlayer(), pattern = enemyAttackPattern(enemy), dr = rt.defenseDamageReduction();
    let totalHpDamage = 0, totalDamage = 0, landedAny = false, blocked = 0, dodged = 0;
    for (let i = 0; i < pattern.hits.length; i += 1) {
      if (rt.hasHeadphones() && roundState.hit) {
        messages.push(`🎧 Kratz Headphones drown out ${enemy.name}'s ${pattern.name}${pattern.hits.length > 1 ? ` hit ${i + 1}` : ""}.`);
        continue;
      }
      if (rt.random() < rt.effectiveDodgeChance()) {
        dodged += 1;
        messages.push(`${enemy.name} ${pattern.hits.length > 1 ? `${pattern.name} hit ${i + 1}` : pattern.name} is dodged.`);
        continue;
      }
      if (player.combatShield > 0) {
        player.combatShield -= 1; blocked += 1;
        messages.push(`Barrier blocks ${enemy.name}'s ${pattern.hits.length > 1 ? `${pattern.name} hit ${i + 1}` : pattern.name}.`);
        continue;
      }
      const base = Math.max(1, (enemy.attack + rt.rand(-1, 1)) * pattern.hits[i]);
      let raw = Math.max(1, Math.round(base * (1 - dr) - player.flatReduction));
      if (guarded) raw = Math.max(0, Math.floor(raw * (1 - rt.clamp(player.guardPower + extraGuardPower, 0, .9))));
      const hit = applyPlayerDamage(raw);
      if (hit.total > 0) roundState.hit = true;
      totalDamage += hit.total; totalHpDamage += hit.hp; landedAny = landedAny || hit.total > 0;
      messages.push(`${enemy.name}'s ${pattern.name}${pattern.hits.length > 1 ? ` hit ${i + 1}/${pattern.hits.length}` : ""} ${guarded ? "hits your guard" : "hits"} for ${hit.total}${hit.shield ? ` (${hit.shield} absorbed by Energy Shield)` : ""}.`);
      if (player.thorns > 0 && hit.total > 0) {
        const returned = rt.damageEnemy(enemy, player.thorns, true); messages.push(`Spikes return ${returned}.`);
      }
      if (player.hp <= 0) break;
    }
    if (pattern.drain && totalDamage > 0 && enemy.hp > 0) {
      const heal = Math.min(enemy.maxHp - enemy.hp, Math.max(1, Math.floor(totalDamage * pattern.drain)));
      enemy.hp += heal; if (heal) messages.push(`🩸 ${pattern.name} restores ${heal} HP to ${enemy.name}.`);
    }
    if (enemy.lifeSteal > 0 && totalDamage > 0 && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
      const exact = totalDamage * enemy.lifeSteal + (enemy._lifeStealCarry || 0), whole = Math.floor(exact), heal = Math.min(enemy.maxHp - enemy.hp, whole);
      enemy._lifeStealCarry = exact - whole; if (heal > 0) { enemy.hp += heal; messages.push(`🩸 ${enemy.name} steals ${heal} HP back.`); }
    } else if (enemy.hp >= enemy.maxHp) enemy._lifeStealCarry = 0;
    if (landedAny) { const proc = rt.enemyElementProc(enemy); if (proc) messages.push(proc); }
    const result = { landedAny, totalHpDamage, totalDamage, blocked, dodged };
    if (enemy?.devilBoss && result.totalDamage > 0 && pattern.burn) {
      player.devilBurnStacks = (player.devilBurnStacks || 0) + pattern.burn;
      messages.push(`🔥 ${pattern.name} adds ${pattern.burn} Hellfire stack${pattern.burn === 1 ? "" : "s"} (${player.devilBurnStacks} total).`);
    }
    return result;
  }

  async function coreEnemyTurn(guarded = false, extraGuardPower = 0) {
    const rt = requireRuntime(), player = rt.getPlayer();
    if (!rt.getCurrentEnemy()) return;
    rt.setEncounterTurn(rt.getEncounterTurn() + 1);
    const messages = [], roundState = { hit: false }, lead = rt.getEncounterLead();
    const special = !!(lead?.guardian && (lead.miniBoss || lead.finalBoss || lead.merchantBoss || lead.bloodmageBoss || lead.devilBoss) && lead.hp > 0 && rt.getEncounterTurn() % rt.guardianSpecialInterval === 0);
    for (const enemy of livingEnemies()) {
      if ((enemy.skipTurns || 0) > 0 && !(special && enemy === lead)) { enemy.skipTurns -= 1; messages.push(`${enemy.name} is frozen.`); continue; }
      if (special && enemy === lead) {
        const partialDR = rt.defenseDamageReduction() * .55;
        if (enemy.bloodmageBoss || enemy.devilBoss) {
          const pulses = enemy.devilBoss ? 3 : 2, totalMult = enemy.devilBoss ? .72 : .98; let total = 0;
          for (let i = 0; i < pulses; i += 1) {
            if (rt.hasHeadphones() && roundState.hit) { messages.push(`🎧 Kratz Headphones drown out ${enemy.specialName} pulse ${i + 1}.`); continue; }
            const base = Math.max(1, enemy.attack * totalMult), rawBase = Math.max(1, Math.round(base * (1 - partialDR) - player.flatReduction * .35));
            let raw = guarded ? Math.max(0, Math.floor(rawBase * (1 - rt.clamp(player.guardPower + extraGuardPower, 0, .9)))) : rawBase;
            if (rt.mythicalSetCount() >= 4) raw = Math.floor(raw * rt.guardianSpecialMultiplier());
            const hit = applyPlayerDamage(raw); if (hit.total > 0) roundState.hit = true; total += hit.total;
            messages.push(`⚠️ ${enemy.specialName} pulse ${i + 1}/${pulses} pierces barriers for ${hit.total}${hit.shield ? ` (${hit.shield} Energy Shield)` : ""}.`);
            if (player.hp <= 0) break;
          }
          if (total > 0 && enemy.hp > 0) {
            const heal = Math.min(enemy.maxHp - enemy.hp, Math.max(1, Math.floor(total * (enemy.devilBoss ? .12 : .22))));
            enemy.hp += heal; if (heal) messages.push(`${enemy.name} restores ${heal} HP.`);
          }
        } else if (rt.hasHeadphones() && roundState.hit) messages.push(`🎧 Kratz Headphones drown out ${enemy.specialName || "Guardian special"}.`);
        else {
          const base = Math.max(1, enemy.attack * (enemy.merchantBoss ? 2.6 : 2.25));
          let raw = Math.max(1, Math.round(base * (1 - partialDR) - player.flatReduction * .5));
          if (guarded) raw = Math.max(0, Math.floor(raw * (1 - rt.clamp(player.guardPower + extraGuardPower, 0, .9))));
          if (rt.mythicalSetCount() >= 4) raw = Math.floor(raw * rt.guardianSpecialMultiplier());
          const hit = applyPlayerDamage(raw); if (hit.total > 0) roundState.hit = true;
          messages.push(`⚠️ ${enemy.specialName || "Guardian special"} partially pierces Defense and ignores barriers${guarded ? ", but Guard reduces it further" : ""}, dealing ${hit.total}${hit.shield ? ` (${hit.shield} Energy Shield)` : ""}.`);
          if (enemy.merchantBoss) {
            const stolen = Math.min(player.gold, Math.ceil(player.gold * .20)); player.gold -= stolen; enemy.enemyBarrier = (enemy.enemyBarrier || 0) + 2;
            messages.push(`The Merchant steals ${stolen} gold and raises 2 barriers.`);
          }
        }
      } else {
        await resolveNormalHits(enemy, guarded, extraGuardPower, messages, roundState);
        if (enemy.merchantBoss) { const stolen = Math.min(player.gold, Math.max(1, Math.round(enemy.attack * .6))); player.gold -= stolen; messages.push(`The Merchant steals ${stolen} gold.`); }
      }
      if (player.hp <= 0) break;
    }
    if (special && rt.hasMythicPiece("hat") && player.hp > 0 && !rt.hasDevilsHorns()) {
      const heal = rt.healPlayer(Math.max(1, Math.ceil(player.maxHp * .10))); player.ultimateCharge = rt.clamp(player.ultimateCharge + 25, 0, 100);
      messages.push(`👑 Crown of the Fourth Road restores ${heal} HP and grants 25 ultimate.`);
    }
    if (rt.hasMythicPiece("amulet") && !player.mythicAmuletUsed && player.hp > 0 && player.hp / player.maxHp <= .35) {
      player.mythicAmuletUsed = true; let consumed = 0;
      livingEnemies().forEach(enemy => { const damage = Math.max(1, Math.floor(enemy.maxHp * .12)); consumed += rt.damageEnemy(enemy, damage, true); });
      const healed = rt.healPlayer(Math.max(1, Math.floor(consumed * .5))); messages.push(`👁️ Devourer's Gaze consumes ${consumed} enemy HP and restores ${healed} HP.`);
    }
    if (player.hp > 0 && rt.mythicalSetCount() >= 7 && !player.omegaRingUsed && player.hp / player.maxHp <= .25) {
      player.omegaRingUsed = true; const heal = rt.healPlayer(Math.ceil(player.maxHp * .18)); player.combatShield = (player.combatShield || 0) + 1;
      messages.push(`🌈 Impossible Road 7-piece restores ${heal} HP and grants 1 barrier.`);
    }
    rt.checkDynamicClassUnlocks(); rt.saveMeta(); rt.playHitSfx(); rt.setCombatText(messages.join(" ")); rt.updateCombatUI(); await rt.delay(980);
    if (!livingEnemies().length) return rt.winCombat();
    if (player.hp <= 0) return rt.handlePlayerDeath();
    rt.setCombatBusy(false); rt.updateCombatUI(); rt.setCombatText("Choose your next action.", false);
  }

  function tickEnemyBurns() {
    const rt = requireRuntime(), player = rt.getPlayer(); let burned = false, total = 0, targets = 0;
    if (player.hp <= 0 || !rt.getCurrentEnemies()?.length) return { burned, total, targets, living: livingEnemies().length };
    for (const enemy of livingEnemies()) {
      const stacks = Math.min(10, Math.max(0, enemy.burnStacks || 0)); if (!stacks) continue;
      const raw = Math.max(1, Math.ceil(enemy.maxHp * .01 * stacks)), dealt = rt.damageEnemy(enemy, raw, true);
      burned = true; targets += 1; total += dealt; rt.addCombatHistory(`🔥 Burn ${stacks}/10 scorches ${enemy.name} for ${dealt} (${stacks}% max HP).`);
    }
    return { burned, total, targets, living: livingEnemies().length };
  }

  async function enemyTurnWithDevilAndBurn(guarded = false, extraGuardPower = 0) {
    const rt = requireRuntime(), player = rt.getPlayer(), lead = rt.getEncounterLead();
    const devil = !!lead?.devilBoss, special = devil && ((rt.getEncounterTurn() + 1) % rt.guardianSpecialInterval === 0);
    const result = await coreEnemyTurn(guarded, extraGuardPower);
    if (devil && player.hp > 0 && rt.getCurrentEnemy()) {
      if (special) { player.devilBurnStacks = (player.devilBurnStacks || 0) + 2; rt.addCombatHistory(`🔥 Pale Moon Waltz adds 2 Hellfire stacks (${player.devilBurnStacks} total).`); }
      const stacks = player.devilBurnStacks || 0;
      if (stacks > 0) {
        const raw = Math.max(1, Math.ceil(player.maxHp * .01 * stacks)), hit = applyPlayerDamage(raw);
        rt.addCombatHistory(`🔥 Hellfire ${stacks} deals ${hit.total} damage${hit.shield ? ` (${hit.shield} absorbed by Energy Shield)` : ""}.`); rt.updateCombatUI();
        if (player.hp <= 0) return rt.handlePlayerDeath();
      }
    }
    if (player.hp > 0 && rt.getCurrentEnemies()?.length) {
      const burn = tickEnemyBurns();
      if (burn.burned) {
        const living = livingEnemies(); if (!living.length) return rt.winCombat();
        if (!rt.getCurrentEnemy() || rt.getCurrentEnemy().hp <= 0) rt.selectEnemy(rt.getCurrentEnemies().indexOf(living[0]));
        rt.renderEnemyParty(); rt.updateCombatUI();
      }
    }
    return result;
  }

  async function enemyTurnWithControlRepeat(guarded = false, extraGuardPower = 0) {
    const rt = requireRuntime(), player = rt.getPlayer(), result = await enemyTurnWithDevilAndBurn(guarded, extraGuardPower);
    if (!player._db0511SkipAction || player.hp <= 0 || !livingEnemies().length) return result;
    const reason = player._db0511SkipAction; player._db0511SkipAction = ""; player._db0511SuppressControlProc = true; rt.setCombatBusy(true);
    rt.setCombatText(`${reason}. You lose this action and the enemy pack acts again.`); rt.updateCombatUI(); await rt.delay(620);
    try { return await enemyTurnWithDevilAndBurn(false, 0); }
    finally { player._db0511SuppressControlProc = false; player._db0511SkipAction = ""; }
  }

  async function enemyTurnWithGlassFortress(guarded = false, extraGuardPower = 0) {
    const rt = requireRuntime(), player = rt.getPlayer();
    if (!rt.hasLegendaryEffect("glass_fortress")) return enemyTurnWithControlRepeat(guarded, extraGuardPower);
    const old = player.defense; player.defense = old * 2;
    try { return await enemyTurnWithControlRepeat(guarded, extraGuardPower); }
    finally { player.defense = old; }
  }

  async function resolveWolfEchoes() {
    const rt = requireRuntime(), player = rt.getPlayer(), chance = rt.wolfEchoChance();
    if (!chance || player.hp <= 0) return { notes: [], defeated: false };
    const notes = [];
    for (const wolf of livingEnemies().filter(enemy => /\bwolf\b/i.test(String(enemy?.name || "")) && !enemy.guardian)) {
      if (rt.random() >= chance) continue;
      if (rt.random() < rt.effectiveDodgeChance()) { rt.successfulDodgePresentation(); notes.push(`🐺 ${wolf.name}'s Echo Strike is dodged.`); continue; }
      if (player.combatShield > 0) { player.combatShield -= 1; notes.push(`🐺 Barrier blocks ${wolf.name}'s Echo Strike.`); continue; }
      const base = Math.max(1, wolf.attack + rt.rand(-1, 1)), raw = Math.max(1, Math.round(base * (1 - rt.defenseDamageReduction()) - player.flatReduction)), hit = applyPlayerDamage(raw);
      // Historical behavior records the wolf Echo once in applyPlayerDamage and once here. Preserve it during extraction.
      rt.recordDamageTaken(hit.total);
      notes.push(`🐺 ${wolf.name}'s Echo Strike hits for ${hit.total}${hit.shield ? ` (${hit.shield} absorbed by Energy Shield)` : ""}.`);
      if (player.thorns > 0 && hit.total > 0) { const returned = rt.damageEnemy(wolf, player.thorns, true); notes.push(`Spikes return ${returned}.`); }
      if (player.hp <= 0) break;
    }
    if (notes.length) { notes.forEach(rt.addCombatHistory); rt.setCombatText(notes.join(" ")); rt.updateCombatUI(); await rt.delay(380); }
    return { notes, defeated: player.hp <= 0 };
  }

  async function enemyTurn(guarded = false, extraGuardPower = 0) {
    const rt = requireRuntime(), player = rt.getPlayer();
    if (rt.dragoonActive() && player.dragoonAirborneResponses > 0 && !livingEnemies().some(enemy => enemy.canHitAirborne === true)) {
      player.dragoonAirborneResponses -= 1; if (player.dragoonAirborneResponses === 0) player.dragoonLandingReady = true;
      rt.setEncounterTurn(rt.getEncounterTurn() + 1); rt.setCombatText("🐉 Dragoon is Airborne — ordinary attacks cannot reach the landing zone."); await rt.delay(420); rt.setCombatBusy(false); rt.updateCombatUI(); return;
    }
    const result = await enemyTurnWithGlassFortress(guarded, extraGuardPower);
    if (!rt.getCurrentEnemy() || player.hp <= 0 || !livingEnemies().length) return result;
    rt.setCombatBusy(true); const echo = await resolveWolfEchoes();
    if (echo.defeated) return rt.handlePlayerDeath();
    rt.setCombatBusy(false); rt.updateCombatUI(); return result;
  }

  function tickPlayerElementStatuses() {
    const rt = requireRuntime(), player = rt.getPlayer();
    if (player.hp <= 0) return "";
    const notes = [];
    if ((player.db0511BurnStacks || 0) > 0) {
      const stacks = Math.min(10, player.db0511BurnStacks), raw = Math.max(1, Math.ceil(player.maxHp * .01 * stacks)), hit = applyPlayerDamage(raw);
      notes.push(`🔥 Burn ${stacks}/10 scorches you for ${hit.total} (${stacks}% max HP).`);
    }
    if ((player.db0511PoisonStacks || 0) > 0) {
      const stacks = player.db0511PoisonStacks, raw = Math.max(1, Math.round(Math.max(1, player.maxHp * .025) * (player.db0511PoisonPower || .12) * stacks)), hit = applyPlayerDamage(raw);
      notes.push(`☠️ Poison ${stacks} deals ${hit.total} damage.`);
    }
    notes.forEach(rt.addCombatHistory); return notes.join(" ");
  }

  async function baseEnemyResponse(guarded = false, extraGuardPower = 0) {
    const rt = requireRuntime(), player = rt.getPlayer();
    await rt.petTurn(); if (!livingEnemies().length) return rt.winCombat();
    rt.applyPoisonTick(); await rt.delay(260); if (!livingEnemies().length) return rt.winCombat();
    if (player.hasteTurns > 0) { player.hasteTurns -= 1; rt.setCombatBusy(false); rt.setCombatText("☕ Haste! You act again before the enemy pack can respond."); rt.updateCombatUI(); return; }
    const allFrozen = livingEnemies().every(enemy => (enemy.skipTurns || 0) > 0);
    if (allFrozen) { livingEnemies().forEach(enemy => enemy.skipTurns -= 1); rt.setCombatBusy(false); rt.setCombatText("❄️ The entire enemy pack is frozen and loses its turn."); rt.updateCombatUI(); return; }
    return enemyTurn(guarded, extraGuardPower);
  }

  async function responseWithFreezeCooldown(guarded = false, extraGuardPower = 0) {
    livingEnemies().forEach(enemy => { if ((enemy.freezeCooldown || 0) > 0) enemy.freezeCooldown -= 1; });
    return baseEnemyResponse(guarded, extraGuardPower);
  }

  async function responseWithLegacyCooldown(guarded = false) {
    const player = getPlayer(), hadHaste = (player.hasteTurns || 0) > 0, cd = player.hasteCooldown || 0;
    const out = await responseWithFreezeCooldown(guarded);
    if (hadHaste && (player.hasteTurns || 0) < 1) player.hasteCooldown = 1;
    else if (!hadHaste && cd > 0) player.hasteCooldown = Math.max(0, cd - 1);
    return out;
  }

  async function responseWithCoffeeRelic(guarded = false, extraGuardPower = 0) {
    const rt = requireRuntime(), player = rt.getPlayer(), enemy = rt.getCurrentEnemy(), mug = player.equipment?.offhand;
    if (mug?.coffeeActionProc && enemy && rt.random() < mug.coffeeActionProc) {
      const old = player.elementDamageBonus || 0; player.elementDamageBonus = old + .50;
      try { const result = rt.triggerElementEffect("coffee", enemy, { forced: true, source: "Axel's Coffee Mug" }); if (result) rt.addCombatHistory(`☕ ${result.message}`); }
      finally { player.elementDamageBonus = old; }
    }
    // Historical v1.9 wrapper accepted only `guarded`; extraGuardPower is intentionally dropped here.
    return responseWithLegacyCooldown(guarded);
  }

  async function responseWithSingleHasteClamp(guarded = false) {
    const player = getPlayer(); if ((player.hasteTurns || 0) > 1) player.hasteTurns = 1;
    const out = await responseWithCoffeeRelic(guarded);
    if ((player.hasteTurns || 0) > 1) player.hasteTurns = 1;
    return out;
  }

  async function responseWithHasteLock(guarded = false, extraGuardPower = 0) {
    const player = getPlayer(), hadHaste = (player.hasteTurns || 0) > 0;
    const out = await responseWithSingleHasteClamp(guarded);
    if (hadHaste) { player.hasteTurns = Math.min(player.hasteTurns || 0, 1); player.hasteCooldown = Math.max(player.hasteCooldown || 0, 2); }
    else { player._db046HasteLocked = false; if ((player.hasteCooldown || 0) > 0) player.hasteCooldown = Math.max(0, (player.hasteCooldown || 0) - 1); }
    return out;
  }

  async function responseWithFinalHasteGate(guarded = false, extraGuardPower = 0) {
    const player = getPlayer(), skipped = (player.hasteTurns || 0) > 0;
    const out = await responseWithHasteLock(guarded, extraGuardPower);
    if (skipped) { player.hasteTurns = 0; player.hasteCooldown = Math.max(2, player.hasteCooldown || 0); }
    else { if ((player.hasteCooldown || 0) > 0) player.hasteCooldown = Math.max(0, (player.hasteCooldown || 0) - 1); player._db047HastePrimed = false; }
    return out;
  }

  async function resolveEnemyResponse(guarded = false, extraGuardPower = 0) {
    const rt = requireRuntime(), player = rt.getPlayer(), status = tickPlayerElementStatuses();
    if (player.hp <= 0) { if (status) rt.setCombatText(status); rt.updateCombatUI(); return rt.handlePlayerDeath(); }
    return responseWithFinalHasteGate(guarded, extraGuardPower);
  }

  const api = Object.freeze({
    owner: "combat/turn-resolution",
    apiVersion: 1,
    configure,
    resolveEnemyResponse,
    enemyTurn,
    applyPlayerDamage,
    enemyAttackPattern,
    test: Object.freeze({ tickEnemyBurns, tickPlayerElementStatuses })
  });

  window.DiceboundCombatTurnResolution = api;
})();
