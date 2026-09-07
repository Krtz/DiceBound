(() => {
  "use strict";

  const OWNER = "combat/victory-resolution";
  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatVictoryResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat victory runtime is required.");
    const required = [
      "getState", "ensureAlphaMeta", "recordBoardClear", "clearBloodOverhealTemp", "modifiedGold", "healPlayer",
      "saveMeta", "showToast", "checkDynamicClassUnlocks", "addLog", "unlockClass", "refreshTile", "setCombatText",
      "playWin", "updateHud", "delay", "presentVictory", "hideCombatOverlay", "resetVictoryPresentation", "clearEncounterState",
      "grantXp", "getPendingLevelUps", "openLevelUp", "openCombatLootChain", "showLegendaryChoice", "advanceToNextBoard",
      "completeFinalRoad", "returnToRoad", "renderClassChoices", "setMerchantBossFlags", "restoreRadiationDefense",
      "traceCommand", "logDebug", "debugState", "setCombatBusy", "isCombatOverlayHidden", "setRollLocked",
      "clearStoneBattle", "grantLegacyXp", "updateMetaUi", "restoreEnemyElementDebuffs", "clearLegendaryBattleTemps",
      "getClassUnlockFacts", "recordCombatFacts"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat victory runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function live() {
    const state = requireRuntime().getState();
    if (!state?.player || !state?.meta) throw new Error("Combat victory runtime returned incomplete live state.");
    return state;
  }

  function defeatedFrom(state = live()) {
    return state.currentEncounterLead || state.currentEnemy || null;
  }

  function encounterEnemies(state, defeated) {
    return state.currentEnemies?.length ? [...state.currentEnemies] : defeated ? [defeated] : [];
  }

  function rewardValues(state, all) {
    const rt = requireRuntime(), p = state.player;
    return {
      gold: rt.modifiedGold(all.reduce((sum, enemy) => sum + (enemy?.gold || 0), 0)),
      xp: Math.max(1, Math.round(all.reduce((sum, enemy) => sum + (enemy?.xp || 0), 0) * (1 + p.xpBonus)))
    };
  }

  function ordinaryCookies(defeated, board) {
    if (defeated?.finalBoss) return board === 5 ? 10 : board === 4 ? 8 : board === 3 ? 6 : board === 2 ? 4 : 2;
    if (defeated?.miniBoss) return board === 6 ? 10 : board === 5 ? 8 : board === 4 ? 7 : board === 3 ? 5 : board === 2 ? 3 : 1;
    return 0;
  }

  async function ordinaryVictoryCore() {
    const rt = requireRuntime(), state = live(), p = state.player, meta = state.meta;
    const defeated = defeatedFrom(state), all = encounterEnemies(state, defeated), tileIndex = state.currentEnemyTile;
    const board = state.boardLevel, classId = p.classId;

    if (defeated) {
      const stats = rt.ensureAlphaMeta();
      stats.enemiesDefeated += all.length;
      if (defeated.boss) stats.bossesDefeated++;
      if (defeated.miniBoss) stats.minibossesDefeated++;
      if (defeated.finalBoss) rt.recordBoardClear(board, classId);
    }
    if (p.bloodOverhealBonus) rt.clearBloodOverhealTemp();

    const reward = rewardValues(state, all);
    p.gold += reward.gold;
    if (p.postFightHeal > 0) rt.healPlayer(p.postFightHeal);

    const cookies = ordinaryCookies(defeated, board);
    if (cookies) {
      meta.petCookies += cookies;
      rt.saveMeta();
      rt.showToast(`🍪 +${cookies} cookies`);
    }

    if (defeated?.merchantBoss) {
      rt.setMerchantBossFlags({ battle: false, primed: false, defeatedThisBoard: true });
      p.freeMerchantRun = true;
      meta.merchantKills = (meta.merchantKills || 0) + 1;
      rt.saveMeta();
      rt.checkDynamicClassUnlocks();
      rt.addLog("<b>The Road Merchant is defeated.</b> Every merchant item is free for the rest of this run.");
      rt.showToast("🧔 All shops are free!");
    }
    if (defeated?.bloodmageBoss) {
      meta.bloodmageKills = (meta.bloodmageKills || 0) + 1;
      rt.unlockClass("bloodmage");
      rt.saveMeta();
      rt.addLog("<b>The Bloodmage is defeated.</b> Forbidden hemomancy bends the knee.");
      rt.showToast("🩸 Bloodmage unlocked");
    }

    if (defeated?.miniBoss && board === 1) rt.unlockClass("sorcerer");
    if (defeated?.finalBoss && board === 1) rt.unlockClass("fighter");
    if (defeated?.miniBoss && board === 2) rt.unlockClass("monk");
    if (defeated?.finalBoss && board === 2) rt.unlockClass("clown");

    const tile = state.tiles?.[tileIndex];
    if (tile) {
      tile.cleared = true;
      if (!defeated?.finalBoss && !defeated?.merchantBoss) {
        tile.type = "empty";
        delete tile.enemyBase;
        rt.refreshTile(tileIndex);
      }
    }

    rt.setCombatText(`Victory! +${reward.xp} XP, +${reward.gold} gold${cookies ? `, +${cookies} cookies` : ""}.`);
    rt.playWin();
    rt.addLog(`Defeated <b>${all.map(enemy => enemy.name).join(", ")}</b>: +${reward.xp} XP, +${reward.gold} gold.`);
    rt.updateHud();
    await rt.delay(320);
    await rt.presentVictory({ title: "Victory!", defeatedNames: all.map(enemy => enemy.name), xp: reward.xp, gold: reward.gold, cookies, board });
    rt.hideCombatOverlay();
    rt.resetVictoryPresentation();
    rt.clearEncounterState();
    rt.grantXp(reward.xp);
    rt.updateHud();

    const after = () => {
      if (defeated?.finalBoss) {
        if (board === 3 && !meta.nightmareUnlocked) {
          meta.nightmareUnlocked = true;
          rt.saveMeta();
          rt.showToast("🌑 Nightmare Mode unlocked");
          rt.addLog("<b>Nightmare Mode unlocked!</b> You may enable it from class selection on future runs.");
        }
        if (board === 4 && state.nightmareMode && !meta.hellUnlocked) {
          meta.hellUnlocked = true;
          rt.saveMeta();
          rt.showToast("🔥 Hell Mode unlocked");
          rt.addLog("<b>Hell Mode unlocked!</b> Future runs may enable it from class selection.");
          rt.renderClassChoices();
        }
        if (board < 5) rt.advanceToNextBoard();
        else {
          meta.board5Clears = (meta.board5Clears || 0) + 1;
          rt.saveMeta();
          rt.completeFinalRoad();
        }
      } else rt.returnToRoad();
    };
    const cont = () => rt.getPendingLevelUps() > 0 ? rt.openLevelUp(after) : after();
    const loot = () => rt.openCombatLootChain(defeated, cont);
    if (defeated?.miniBoss) rt.showLegendaryChoice("Miniboss Legendary Reward", loot);
    else loot();

    if (defeated?.merchantBoss && state.tiles?.[tileIndex]) {
      state.tiles[tileIndex].type = "merchant";
      state.tiles[tileIndex].cleared = false;
      delete state.tiles[tileIndex].enemyBase;
      rt.refreshTile(tileIndex);
    }
    rt.saveMeta();
  }

  // Historical V15 wrapper. Its Board-5 Beastmaster pre-hook is unreachable
  // through the later Board-5/6 final router, but the published post-victory
  // dynamic-unlock check remains live for the ordinary path.
  async function v15OrdinaryLayer(...args) {
    const rt = requireRuntime(), state = live(), defeated = defeatedFrom(state);
    const boardAtWin = state.boardLevel, classAtWin = state.player.classId, wasNightmare = !!state.nightmareMode;
    const isFinal = !!defeated?.finalBoss;
    if (isFinal && boardAtWin === 5 && classAtWin === "beastmaster" && wasNightmare) {
      state.meta.beastmasterNightmareBoard5 = true;
      rt.saveMeta();
    }
    const result = await ordinaryVictoryCore(...args);
    rt.checkDynamicClassUnlocks();
    return result;
  }

  // V16 wrapped the ordinary pipeline with Radiation-defense restoration.
  async function v16OrdinaryLayer(...args) {
    const rt = requireRuntime();
    const result = await v15OrdinaryLayer(...args);
    rt.restoreRadiationDefense();
    return result;
  }

  async function lateFinalCore(defeated, boardAtWin) {
    const rt = requireRuntime(), state = live(), p = state.player, meta = state.meta;
    const all = encounterEnemies(state, defeated), tileIndex = state.currentEnemyTile, classId = p.classId;
    const stats = rt.ensureAlphaMeta();
    stats.enemiesDefeated += all.length;
    stats.bossesDefeated++;
    rt.recordBoardClear(boardAtWin, classId);

    const reward = rewardValues(state, all);
    p.gold += reward.gold;
    if (p.postFightHeal > 0) rt.healPlayer(p.postFightHeal);
    const cookies = boardAtWin === 6 ? 15 : 10;
    meta.petCookies += cookies;

    if (boardAtWin === 5) {
      const alreadyUnlocked = !!meta.doubleDiceUnlocked;
      meta.board5Clears = (meta.board5Clears || 0) + 1;
      meta.doubleDiceUnlocked = true;
      if (classId === "beastmaster" && state.nightmareMode) meta.beastmasterNightmareBoard5 = true;
      if (!alreadyUnlocked) rt.showToast("🎲🎲 Double Dice unlocked!", 2600, true);
    }
    rt.saveMeta();
    rt.checkDynamicClassUnlocks();
    if (state.tiles?.[tileIndex]) state.tiles[tileIndex].cleared = true;

    rt.setCombatText(`${boardAtWin === 6 ? "Sixth" : "Fifth"} Road victory! +${reward.xp} XP, +${reward.gold} gold, +${cookies} cookies.`);
    rt.playWin();
    rt.addLog(`<b>${defeated.name} defeated.</b> +${reward.xp} XP, +${reward.gold} gold and +${cookies} cookies.`);
    rt.updateHud();
    await rt.delay(320);
    await rt.presentVictory({ title: `${boardAtWin === 6 ? "Sixth" : "Fifth"} Road Victory!`, defeatedNames: all.map(enemy => enemy.name), xp: reward.xp, gold: reward.gold, cookies, board: boardAtWin });
    rt.hideCombatOverlay();
    rt.resetVictoryPresentation();
    rt.clearEncounterState();
    rt.grantXp(reward.xp);
    rt.updateHud();

    const finish = () => boardAtWin === 6 ? rt.completeFinalRoad() : rt.advanceToNextBoard();
    const afterLevels = () => rt.getPendingLevelUps() > 0 ? rt.openLevelUp(finish) : finish();
    rt.openCombatLootChain(defeated, afterLevels);
  }

  // V19 routing preserves the separate published Board-5/6 final algorithm.
  async function routeVictory(...args) {
    const state = live(), defeated = defeatedFrom(state);
    const tile = state.tiles?.[state.currentEnemyTile];
    const isFinal = !!defeated?.finalBoss || state.combatKind === "final" || tile?.type === "boss";
    if (isFinal && (state.boardLevel === 5 || state.boardLevel === 6)) return lateFinalCore(defeated, state.boardLevel);
    return v16OrdinaryLayer(...args);
  }

  // V24 Pale Devil accounting runs before the inner victory pipeline.
  async function devilLayer(...args) {
    const rt = requireRuntime(), state = live(), defeated = defeatedFrom(state);
    if (defeated?.devilBoss) {
      state.meta.devilBossKills = (state.meta.devilBossKills || 0) + 1;
      rt.saveMeta();
      rt.showToast("👿 The Pale Devil bows.", 3000, true);
    }
    return routeVictory(...args);
  }

  // Alpha v2.5 command logging wrapped winCombat before the later recovery and
  // cleanup layers. Keep that exact nesting so completion/rejection logging
  // observes the same state boundary.
  function tracedLayer(args) {
    const rt = requireRuntime();
    return rt.traceCommand("winCombat", () => devilLayer(...args), "events", args, undefined);
  }

  // Alpha v2.5.1 reward-side exception containment.
  async function failureContainmentLayer(...args) {
    const rt = requireRuntime(), defeated = defeatedFrom(live());
    try {
      const result = await tracedLayer(args);
      const state = live();
      if (!state.currentEnemy && rt.isCombatOverlayHidden()) rt.setCombatBusy(false);
      return result;
    } catch (error) {
      const state = live();
      const battleFinished = !state.currentEnemy && (!state.currentEnemies?.length || state.currentEnemies.every(enemy => !enemy || enemy.hp <= 0));
      rt.logDebug("errors", "hotfix", "winCombat failure contained", { error: String(error), stack: error?.stack || "", battleFinished, defeated: defeated?.name || null, state: rt.debugState() });
      if (!battleFinished) throw error;
      rt.setCombatBusy(false);
      rt.hideCombatOverlay();
      rt.clearEncounterState();
      const continueAfterError = () => {
        try {
          if (defeated?.finalBoss) rt.advanceToNextBoard();
          else {
            rt.setRollLocked(false);
            rt.updateHud();
          }
        } catch (inner) {
          rt.logDebug("errors", "hotfix", "Post-victory recovery continuation failed", { error: String(inner), stack: inner?.stack || "", state: rt.debugState() });
          rt.setRollLocked(false);
          rt.setCombatBusy(false);
          rt.updateHud();
        }
      };
      if (rt.getPendingLevelUps() > 0) rt.openLevelUp(continueAfterError);
      else continueAfterError();
      rt.showToast("🛠️ Victory reward error contained — road recovered", 3200, true);
      return null;
    }
  }

  // Alpha v2.6 wraps successful/contained victory with Philosopher's Stone
  // battle cleanup and the secret-boss Legacy XP payout.
  async function secretLegacyLayer(...args) {
    const rt = requireRuntime(), state = live(), defeated = defeatedFrom(state);
    const secret = defeated?.devilBoss ? "devil" : defeated?.bloodmageBoss ? "bloodmage" : defeated?.merchantBoss ? "merchant" : null;
    const result = await failureContainmentLayer(...args);
    rt.clearStoneBattle();
    if (secret) {
      const base = { merchant: 400, bloodmage: 650, devil: 1200 }[secret];
      const gain = Math.max(1, Math.round(base * (1 + (state.player.legacyXpBonus || 0))));
      rt.grantLegacyXp(gain);
      rt.saveMeta();
      rt.updateMetaUi();
      rt.addLog(`<b>Secret legacy:</b> defeating ${defeated?.name || secret} grants <b>+${gain} Legacy XP</b>.`);
      rt.showToast(`🌟 Secret boss · +${gain} Legacy XP`, 3200, true);
    }
    return result;
  }

  async function enemyElementCleanupLayer(...args) {
    const rt = requireRuntime();
    const result = await secretLegacyLayer(...args);
    rt.restoreEnemyElementDebuffs();
    return result;
  }

  async function legendaryCleanupLayer(...args) {
    const rt = requireRuntime();
    const result = await enemyElementCleanupLayer(...args);
    rt.clearLegendaryBattleTemps();
    return result;
  }

  // 0.6.3.1 class-unlock fact recording is the final historical outer layer:
  // record combat facts before settlement, then re-check unlocks after every
  // successful/contained inner victory.
  async function classUnlockFactsLayer(...args) {
    const rt = requireRuntime(), state = live(), defeated = defeatedFrom(state);
    const tile = state.tiles?.[state.currentEnemyTile];
    const isFinal = !!defeated?.finalBoss || state.combatKind === "final" || tile?.type === "boss";
    state.meta.classUnlockFacts = rt.recordCombatFacts(rt.getClassUnlockFacts(), {
      board: state.boardLevel,
      classId: state.player.classId,
      miniBoss: !!defeated?.miniBoss,
      finalBoss: isFinal,
      merchantBoss: !!defeated?.merchantBoss,
      mode: state.hellMode ? "hell" : state.nightmareMode ? "nightmare" : "normal"
    });
    rt.saveMeta();
    const result = await legendaryCleanupLayer(...args);
    rt.checkDynamicClassUnlocks();
    rt.saveMeta();
    return result;
  }

  async function winCombat(...args) {
    return classUnlockFactsLayer(...args);
  }

  const api = Object.freeze({
    owner: OWNER,
    configure,
    winCombat,
    _test: Object.freeze({
      ordinaryCookies,
      ordinaryVictoryCore,
      v15OrdinaryLayer,
      v16OrdinaryLayer,
      lateFinalCore,
      routeVictory,
      devilLayer,
      tracedLayer,
      failureContainmentLayer,
      secretLegacyLayer,
      enemyElementCleanupLayer,
      legendaryCleanupLayer,
      classUnlockFactsLayer
    })
  });

  window.DiceboundCombatVictoryResolution = api;
})();
