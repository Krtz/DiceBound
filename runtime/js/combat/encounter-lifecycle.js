(() => {
  "use strict";

  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatEncounterLifecycle must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat encounter-lifecycle runtime is required.");
    const required = [
      "getPlayer","getMeta","getTile","getPosition","getBoardLevel","isNightmare","isHell","isClassActive","petIds","isPetUnlocked",
      "enemyById","finalGuardian","minibossGuardian","enemyForPosition","scaleEnemy","setMerchantBossBattle","setCombatKind",
      "setEncounterState","getEncounterState","setEncounterSelection","mythicalSetCount","hasMythicPiece","startUltimate",
      "setCombatTitle","getCombatTitle","setCombatSubtitle","clearCombatHistory","setCombatText","showCombatOverlay","addLog",
      "renderEnemyParty","updateCombatUI","pick","clamp","identityFlash","addCombatHistory","updateBossSpecialIndicator",
      "clearStoneBattle","restoreEnemyElementDebuffs","clearBattleLegendaryTemps","traceCoreStart","applyCombatBackground",
      "syncBattleLog","clearCombatPresentation","refreshActivePetArt"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat encounter-lifecycle runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function baseEncounter(kind) {
    const rt = requireRuntime(), player = rt.getPlayer(), tile = rt.getTile();
    const boardLevel = rt.getBoardLevel();
    let bases = [];
    rt.setMerchantBossBattle(kind === "merchant");
    if (kind === "merchant") {
      const merchant = rt.enemyById("road-merchant");
      merchant.hp = 185 + boardLevel * 60;
      merchant.attack = 28 + boardLevel * 5;
      bases = [merchant];
    } else if (kind === "bloodmage") {
      const bloodmage = rt.enemyById("bloodmage-boss");
      bloodmage.hp = 210 + boardLevel * 35;
      bloodmage.attack = 34 + boardLevel * 4;
      bases = [bloodmage];
    } else if (kind === "final") {
      bases = [rt.finalGuardian(boardLevel)];
    } else if (kind === "miniboss") {
      bases = [rt.minibossGuardian(boardLevel)];
    } else {
      bases = (tile.enemyBases?.length ? tile.enemyBases : [tile.enemyBase || rt.enemyForPosition(rt.getPosition())]).map(enemy => ({ ...enemy }));
    }

    const currentEnemies = bases.map(base => rt.scaleEnemy(base, kind, bases.length));
    if (kind === "bloodmage") currentEnemies.forEach(enemy => {
      enemy.bloodmageBoss = true;
      enemy.guardian = true;
      enemy.merchantBoss = false;
    });

    const lead = currentEnemies[0], position = rt.getPosition();
    rt.setEncounterState({
      enemies: currentEnemies,
      lead,
      index: 0,
      current: lead,
      tile: position,
      turn: 0,
      busy: false
    });

    player.combatShield = player.firstHitBlocks + (rt.mythicalSetCount() >= 5 ? 1 : 0) + (rt.hasMythicPiece("hat") ? 1 : 0);
    player.combatAttackCount = 0;
    player.combatActionCount = 0;
    player.mythicActionCount = 0;
    player.mythicAmuletUsed = false;
    player.omegaRingUsed = false;
    if (rt.mythicalSetCount() >= 4) player.ultimateCharge = Math.max(player.ultimateCharge, rt.startUltimate());

    rt.setCombatTitle(kind === "bloodmage" ? "Secret Boss: The Bloodmage" : kind === "merchant" ? "Secret Boss: The Merchant" : kind === "final" ? "Final Guardian" : kind === "miniboss" ? "Halfway Miniboss" : currentEnemies.length > 1 ? `Enemy Pack ×${currentEnemies.length}` : "Battle!");
    rt.setCombatSubtitle(kind === "bloodmage" ? "The Bloodwell answers with forbidden scholarship." : kind === "merchant" ? "He closes the shop, raises barriers and begins charging interest." : currentEnemies.length > 1 ? "Every enemy is visible below. The arrow marks your selected target." : "Choose your action.");
    rt.clearCombatHistory();
    rt.setCombatText(`${currentEnemies.map(enemy => enemy.name).join(", ")} block the road. Choose your action.`);
    rt.showCombatOverlay();
    rt.addLog(`Combat begins against <b>${currentEnemies.map(enemy => enemy.name).join(", ")}</b>.`);
    rt.renderEnemyParty();
    rt.updateCombatUI();
  }

  function applyClassEntry() {
    const rt = requireRuntime(), player = rt.getPlayer();
    player.rogueStealUsed = false;
    player.monkCombo = 0;
    player.fighterCounterReady = false;
    player.turtleCrushReady = false;
    player.ninjaSmoke = 0;
    if (rt.isClassActive("clown")) {
      player.clownGimmick = rt.pick(["Big Shoes", "Rubber Chicken", "Exploding Pie", "Safety Net", "Standing Ovation"]);
      player.clownPieReady = player.clownGimmick === "Exploding Pie";
      if (player.clownGimmick === "Safety Net") player.combatShield += 1;
      if (player.clownGimmick === "Standing Ovation") player.ultimateCharge = rt.clamp(player.ultimateCharge + 25, 0, 100);
      rt.identityFlash(`🤡 ${player.clownGimmick}`);
      rt.addCombatHistory(`Opening Gag: ${player.clownGimmick}.`);
    }
    if (rt.isClassActive("ceo") && player.gold >= 1000) {
      player.combatShield += 1;
      rt.addCombatHistory("📈 Platinum Executive tier begins the battle with a Barrier.");
    }
    rt.updateCombatUI();
  }

  function applySummonerEntry() {
    const rt = requireRuntime(), player = rt.getPlayer(), meta = rt.getMeta();
    if (rt.isClassActive("summoner")) {
      player.summonerSpirits = [];
      if (player.summonerAutoSpirit) {
        const pool = rt.petIds().filter(id => rt.isPetUnlocked(meta, id));
        if (pool.length) player.summonerSpirits = [rt.pick(pool)];
      }
    }
    rt.updateCombatUI();
  }

  function applyBloodmageTuning(kind) {
    const rt = requireRuntime(), state = rt.getEncounterState();
    if (kind === "bloodmage" && state.current) {
      state.enemies.forEach(enemy => {
        enemy.hp = Math.round(enemy.hp * 1.42);
        enemy.maxHp = enemy.hp;
        enemy.attack = Math.round(enemy.attack * 1.16);
        enemy.defense = (enemy.defense || 0) + 3;
        enemy.enemyBarrier = (enemy.enemyBarrier || 0) + 2;
      });
      rt.renderEnemyParty();
      rt.updateCombatUI();
      rt.addCombatHistory("🩸 The Bloodmage is stronger than the Merchant who revealed the path to this fight.");
    }
  }

  function applyCeoWealthEntry() {
    const rt = requireRuntime(), player = rt.getPlayer(), state = rt.getEncounterState();
    if (rt.isClassActive("ceo") && state.current) {
      let extra = 0;
      if (player.gold >= 10000) extra += 1;
      if (player.gold >= 25000) extra += 1;
      if (extra) {
        player.combatShield = (player.combatShield || 0) + extra;
        rt.addCombatHistory(`📈 Executive liquidity adds ${extra} extra Barrier${extra === 1 ? "" : "s"} (${player.gold >= 25000 ? "25,000+" : "10,000+"} gold tier).`);
        rt.updateCombatUI();
      }
    }
  }

  function applyBoardSixEntry(kind) {
    const rt = requireRuntime(), boardLevel = rt.getBoardLevel(), state = rt.getEncounterState();
    if (boardLevel !== 6 || !state.enemies.length) return;
    if (kind === "final") {
      const base = rt.finalGuardian(6), enemies = [rt.scaleEnemy(base, "final", 1)];
      rt.setEncounterSelection({ enemies, lead: enemies[0], index: 0, current: enemies[0] });
    } else if (kind === "miniboss") {
      state.enemies[0].name = "Abyssal Custodian";
      state.enemies[0].specialName = "Sixth Seal Collapse";
      rt.setEncounterSelection({ enemies: state.enemies, lead: state.enemies[0], index: state.index, current: state.enemies[0] });
    }
    rt.setCombatTitle(kind === "final" ? "Sixth Road Final Guardian" : kind === "miniboss" ? "Sixth Road Miniboss" : rt.getCombatTitle());
    rt.renderEnemyParty();
    rt.updateCombatUI();
  }

  function normalizeSetEntry() {
    const rt = requireRuntime(), player = rt.getPlayer(), state = rt.getEncounterState();
    if (!state.current) return;
    if (rt.mythicalSetCount() >= 4) player.ultimateCharge = Math.max(player.ultimateCharge, rt.startUltimate());
  }

  function applyPaleDevilIdentity(kind) {
    const rt = requireRuntime(), state = rt.getEncounterState();
    if (kind !== "devil" || !state.current) return;
    state.enemies.forEach(enemy => {
      enemy.devilBoss = true;
      enemy.boss = true;
      enemy.guardian = true;
      enemy.specialName = "Pale Moon Waltz";
      enemy.hp = Math.round(enemy.hp * 1.75);
      enemy.maxHp = enemy.hp;
      enemy.attack = Math.round(enemy.attack * 1.35);
      enemy.defense = (enemy.defense || 0) + 8;
    });
    rt.setEncounterSelection({ enemies: state.enemies, lead: state.enemies[0], index: state.index, current: state.enemies[state.index] || state.enemies[0] });
    rt.setCombatTitle("Secret Boss: The Pale Devil");
    rt.setCombatSubtitle("You danced around the fire. Something accepted the invitation.");
    rt.updateBossSpecialIndicator();
    rt.updateCombatUI();
  }

  function applyPaleDevilHellfireEntry(kind) {
    const rt = requireRuntime(), player = rt.getPlayer(), state = rt.getEncounterState();
    player.devilBurnStacks = 0;
    if (kind !== "devil" || !state.current) return;
    state.enemies.forEach(enemy => {
      enemy.enemyBarrier = Math.max(5, enemy.enemyBarrier || 0);
      enemy.devilBoss = true;
      enemy.boss = true;
      enemy.guardian = true;
      enemy.specialName = "Pale Moon Waltz";
    });
    player.devilBurnStacks = 0;
    rt.addCombatHistory("👿 The Pale Devil arrives behind five infernal barriers. Its attacks leave infinitely stacking Hellfire.");
    rt.renderEnemyParty();
    rt.updateCombatUI();
  }

  function coreThroughV25(kind) {
    const rt = requireRuntime();
    // Historical V16 wrapper wrote this before delegating into V15/V13/V11.
    rt.setCombatKind(kind);
    baseEncounter(kind);
    applyClassEntry();
    applySummonerEntry();
    applyBloodmageTuning(kind);
    applyCeoWealthEntry();
    applyBoardSixEntry(kind);
    normalizeSetEntry();
    applyPaleDevilIdentity(kind);
    applyPaleDevilHellfireEntry(kind);
  }

  function applyDifficultyEntry() {
    const rt = requireRuntime(), state = rt.getEncounterState(), boardLevel = rt.getBoardLevel();
    const nightmare = rt.isNightmare(), hell = rt.isHell();
    if (!state.enemies?.length) return;
    state.enemies.forEach(enemy => {
      if (nightmare || hell) {
        const baseDodge = (enemy.boss ? .015 : .02) + Math.max(0, boardLevel - 1) * .004 + (hell ? .02 : 0);
        enemy.dodge = Math.max(enemy.dodge || 0, Math.min(.10, baseDodge));
      }
      if (nightmare && enemy.boss) enemy.enemyBarrier = Math.max(1, enemy.enemyBarrier || 0);
      if (hell && boardLevel > 1) enemy.enemyBarrier = Math.max(1, enemy.enemyBarrier || 0);
    });
    rt.renderEnemyParty();
    rt.updateCombatUI();
  }

  function resetPostStartElementCounters() {
    const player = requireRuntime().getPlayer();
    player.db0511BurnStacks = 0;
    player.db0511PoisonStacks = 0;
    player.db0511PoisonPower = 0;
  }

  function start(kind = "normal") {
    const rt = requireRuntime(), player = rt.getPlayer();
    // Preserve the exact outer-wrapper order from the final 0.6.6.0 runtime.
    rt.clearCombatPresentation();
    rt.clearBattleLegendaryTemps();
    player._db060LastElement = null;
    rt.restoreEnemyElementDebuffs();
    rt.clearStoneBattle();
    const result = rt.traceCoreStart(kind, () => coreThroughV25(kind));
    applyDifficultyEntry();
    resetPostStartElementCounters();
    rt.applyCombatBackground();
    rt.syncBattleLog();
    rt.refreshActivePetArt();
    return result;
  }

  const api = Object.freeze({
    owner: "combat/encounter-lifecycle",
    apiVersion: 1,
    configure,
    start,
    test: Object.freeze({ baseEncounter, applyDifficultyEntry, coreThroughV25 })
  });

  window.DiceboundCombatEncounterLifecycle = api;
})();
