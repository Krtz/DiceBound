# Runtime historical-layer census

Generated deterministically by `tools/test_historical_layer_census.py`. This is an archaeology ranking, not an ownership verdict: legitimate current facades/composition adapters are reviewed separately before any rewrite.

Score weights true replacement/capture evidence most heavily: repeated definitions, predecessor captures and resolvable alias depth outweigh naming-only hints.

| Rank | Score | Runtime file | Replacements | Repeated symbols | Predecessor captures | Versioned defs | History-named defs | Max alias depth | Lines | Repeated symbols |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 5515 | `runtime/js/dicebound.js` | 133 | 69 | 77 | 230 | 17 | 2 | 7103 | resolveEnemyResponse×11, tileMeta×8, classPortraitSVG×7, onComplete×7, filter×6, refreshDebugButtons×6, damageEnemy×5, openLevelUp×5, applyRunTheme×4, handlePlayerDeath×4, mythicalSetSummary×4, openDebugMenu×4, playElementAnimation×4, returnToRoad×4, animateClassAttack×3, animateUltimate×3, applyPoisonTick×3, choiceHTML×3, db317Board×3, effectiveDodgeChance×3, enemyPortraitSVG×3, formatBonuses×3, getHeirloomSlots×3, showEnd×3, showLegendaryChoice×3, showPowerupChoice×3, v15ParseSeedCode×3, add×2, addCombatHistory×2, addLog×2, attachPowerupRerollV16×2, beta04SyncHud×2, defenseDamageReduction×2, eligibleUpgrades×2, finalizeRun×2, gearIcon×2, generateAxelsCoffeeMug×2, generateKellysJeanJacket×2, generateKratzHeadphones×2, generateMythicalAmulet×2, generateMythicalBoots×2, generateMythicalHat×2, generateMythicalOffhand×2, generateMythicalPants×2, generateMythicalRing×2, generateMythicalWeapon×2, grantLegacyXp×2, grantXp×2, guardAction×2, loseGame×2, openStartScreen×2, petTurn×2, rollD20Chaos×2, rollDice×2, rollGearRarity×2, saveMeta×2, setCombatText×2, setCurrentEnemy×2, showToast×2, unboundPreciousGearV16×2, updateCombatUI×2, updateHUD×2, updateMetaUI×2, useCamp×2, v13NormalizeMeta×2, v19EnsureDoubleDiceButton×2, v19SetStartBarrier×2, v25EnsureDebugControls×2, weightedUpgrade×2 |
| 2 | 96 | `runtime/js/powerups/facade.js` | 4 | 2 | 0 | 0 | 0 | 0 | 175 | filter×4, onComplete×2 |
| 3 | 91 | `runtime/js/combat/strike-resolution.js` | 0 | 0 | 1 | 13 | 0 | 1 | 342 | - |
| 4 | 71 | `runtime/js/events/lifecycle.js` | 0 | 0 | 4 | 0 | 1 | 1 | 199 | - |
| 5 | 46 | `runtime/js/combat/vfx.js` | 0 | 0 | 2 | 0 | 2 | 1 | 356 | - |
| 6 | 46 | `runtime/js/events/reward-policy.js` | 0 | 0 | 2 | 0 | 2 | 1 | 65 | - |
| 7 | 46 | `runtime/js/progression/class-unlock-rules.js` | 0 | 0 | 2 | 0 | 2 | 1 | 247 | - |
| 8 | 45 | `runtime/js/combat/ultimate-resolution.js` | 0 | 0 | 0 | 9 | 0 | 0 | 266 | - |
| 9 | 35 | `runtime/js/combat/effective-stats.js` | 0 | 0 | 1 | 0 | 3 | 1 | 151 | - |
| 10 | 32 | `runtime/js/combat/turn-resolution.js` | 0 | 0 | 1 | 0 | 2 | 1 | 354 | - |
| 11 | 32 | `runtime/js/progression/lifecycle.js` | 0 | 0 | 1 | 0 | 2 | 1 | 221 | - |
| 12 | 29 | `runtime/js/classes/actions.js` | 0 | 0 | 1 | 0 | 1 | 1 | 154 | - |
| 13 | 26 | `runtime/js/board/movement.js` | 0 | 0 | 1 | 0 | 0 | 1 | 74 | - |
| 14 | 26 | `runtime/js/combat/pet-turn-resolution.js` | 0 | 0 | 1 | 0 | 0 | 1 | 158 | - |
| 15 | 26 | `runtime/js/core/runtime-services.js` | 0 | 0 | 1 | 0 | 0 | 1 | 62 | - |
| 16 | 26 | `runtime/js/events/treasure.js` | 0 | 0 | 1 | 0 | 0 | 1 | 75 | - |
| 17 | 26 | `runtime/js/powerups/registry.js` | 0 | 0 | 1 | 0 | 0 | 1 | 2959 | - |
| 18 | 26 | `runtime/js/ui/merchant.js` | 0 | 0 | 1 | 0 | 0 | 1 | 67 | - |
| 19 | 20 | `runtime/js/combat/guard-resolution.js` | 0 | 0 | 0 | 4 | 0 | 0 | 208 | - |
| 20 | 18 | `runtime/js/combat/d20-chaos-resolution.js` | 0 | 0 | 0 | 3 | 1 | 0 | 259 | - |
| 21 | 13 | `runtime/js/combat/victory-resolution.js` | 0 | 0 | 0 | 2 | 1 | 0 | 376 | - |
| 22 | 10 | `runtime/js/combat/attack-action-resolution.js` | 0 | 0 | 0 | 2 | 0 | 0 | 160 | - |
| 23 | 9 | `runtime/js/items/generation.js` | 0 | 0 | 0 | 0 | 3 | 0 | 168 | - |
| 24 | 9 | `runtime/js/ui/camp.js` | 0 | 0 | 0 | 0 | 3 | 0 | 567 | - |
| 25 | 6 | `runtime/js/platform.js` | 0 | 0 | 0 | 0 | 2 | 0 | 138 | - |
| 26 | 5 | `runtime/js/items/consumables.js` | 0 | 0 | 0 | 1 | 0 | 0 | 161 | - |
| 27 | 3 | `runtime/js/classes/hooks.js` | 0 | 0 | 0 | 0 | 1 | 0 | 78 | - |
| 28 | 3 | `runtime/js/core/state.js` | 0 | 0 | 0 | 0 | 1 | 0 | 59 | - |
| 29 | 3 | `runtime/js/progression/prestige.js` | 0 | 0 | 0 | 0 | 1 | 0 | 253 | - |
| 30 | 3 | `runtime/js/save-system.js` | 0 | 0 | 0 | 0 | 1 | 0 | 143 | - |
| 31 | 3 | `runtime/js/ui/camp-shell.js` | 0 | 0 | 0 | 0 | 1 | 0 | 83 | - |
| 32 | 3 | `runtime/js/wrapper-contract.js` | 0 | 0 | 0 | 0 | 1 | 0 | 125 | - |
| 33 | 0 | `runtime/js/assets.js` | 0 | 0 | 0 | 0 | 0 | 0 | 183 | - |
| 34 | 0 | `runtime/js/board/generation.js` | 0 | 0 | 0 | 0 | 0 | 0 | 221 | - |
| 35 | 0 | `runtime/js/board/registry.js` | 0 | 0 | 0 | 0 | 0 | 0 | 71 | - |
| 36 | 0 | `runtime/js/board/tile-dispatch.js` | 0 | 0 | 0 | 0 | 0 | 0 | 64 | - |
| 37 | 0 | `runtime/js/board/transition.js` | 0 | 0 | 0 | 0 | 0 | 0 | 69 | - |
| 38 | 0 | `runtime/js/classes/invoker.js` | 0 | 0 | 0 | 0 | 0 | 0 | 160 | - |
| 39 | 0 | `runtime/js/classes/registry.js` | 0 | 0 | 0 | 0 | 0 | 0 | 1310 | - |
| 40 | 0 | `runtime/js/classes/runtime.js` | 0 | 0 | 0 | 0 | 0 | 0 | 147 | - |
| 41 | 0 | `runtime/js/combat/element-resolution.js` | 0 | 0 | 0 | 0 | 0 | 0 | 471 | - |
| 42 | 0 | `runtime/js/combat/encounter-lifecycle.js` | 0 | 0 | 0 | 0 | 0 | 0 | 275 | - |
| 43 | 0 | `runtime/js/combat/enemies.js` | 0 | 0 | 0 | 0 | 0 | 0 | 291 | - |
| 44 | 0 | `runtime/js/combat/enemy-policy.js` | 0 | 0 | 0 | 0 | 0 | 0 | 44 | - |
| 45 | 0 | `runtime/js/combat/enemy-scaling-resolution.js` | 0 | 0 | 0 | 0 | 0 | 0 | 83 | - |
| 46 | 0 | `runtime/js/combat/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 80 | - |
| 47 | 0 | `runtime/js/combat/guardians.js` | 0 | 0 | 0 | 0 | 0 | 0 | 55 | - |
| 48 | 0 | `runtime/js/combat/healing-resolution.js` | 0 | 0 | 0 | 0 | 0 | 0 | 163 | - |
| 49 | 0 | `runtime/js/combat/mana-action-resolution.js` | 0 | 0 | 0 | 0 | 0 | 0 | 290 | - |
| 50 | 0 | `runtime/js/combat/presentation.js` | 0 | 0 | 0 | 0 | 0 | 0 | 338 | - |
| 51 | 0 | `runtime/js/combat/strike-policy.js` | 0 | 0 | 0 | 0 | 0 | 0 | 30 | - |
| 52 | 0 | `runtime/js/combat/targeting.js` | 0 | 0 | 0 | 0 | 0 | 0 | 47 | - |
| 53 | 0 | `runtime/js/combat/view-facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 88 | - |
| 54 | 0 | `runtime/js/core/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 66 | - |
| 55 | 0 | `runtime/js/core/memory-diagnostics.js` | 0 | 0 | 0 | 0 | 0 | 0 | 339 | - |
| 56 | 0 | `runtime/js/core/run-checkpoint.js` | 0 | 0 | 0 | 0 | 0 | 0 | 120 | - |
| 57 | 0 | `runtime/js/events/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 39 | - |
| 58 | 0 | `runtime/js/events/merchant-facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 85 | - |
| 59 | 0 | `runtime/js/events/merchant-stock.js` | 0 | 0 | 0 | 0 | 0 | 0 | 147 | - |
| 60 | 0 | `runtime/js/events/merchant-transaction.js` | 0 | 0 | 0 | 0 | 0 | 0 | 135 | - |
| 61 | 0 | `runtime/js/items/artifacts.js` | 0 | 0 | 0 | 0 | 0 | 0 | 44 | - |
| 62 | 0 | `runtime/js/items/equipment.js` | 0 | 0 | 0 | 0 | 0 | 0 | 183 | - |
| 63 | 0 | `runtime/js/items/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 54 | - |
| 64 | 0 | `runtime/js/items/loot.js` | 0 | 0 | 0 | 0 | 0 | 0 | 142 | - |
| 65 | 0 | `runtime/js/items/operations.js` | 0 | 0 | 0 | 0 | 0 | 0 | 123 | - |
| 66 | 0 | `runtime/js/items/rarities.js` | 0 | 0 | 0 | 0 | 0 | 0 | 80 | - |
| 67 | 0 | `runtime/js/native-http-host.js` | 0 | 0 | 0 | 0 | 0 | 0 | 39 | - |
| 68 | 0 | `runtime/js/pets/lifecycle.js` | 0 | 0 | 0 | 0 | 0 | 0 | 145 | - |
| 69 | 0 | `runtime/js/pets/registry.js` | 0 | 0 | 0 | 0 | 0 | 0 | 47 | - |
| 70 | 0 | `runtime/js/powerups/borrowing.js` | 0 | 0 | 0 | 0 | 0 | 0 | 13 | - |
| 71 | 0 | `runtime/js/progression/achievements.js` | 0 | 0 | 0 | 0 | 0 | 0 | 268 | - |
| 72 | 0 | `runtime/js/progression/class-unlock-feedback.js` | 0 | 0 | 0 | 0 | 0 | 0 | 159 | - |
| 73 | 0 | `runtime/js/progression/talents.js` | 0 | 0 | 0 | 0 | 0 | 0 | 732 | - |
| 74 | 0 | `runtime/js/rng.js` | 0 | 0 | 0 | 0 | 0 | 0 | 25 | - |
| 75 | 0 | `runtime/js/run/completion.js` | 0 | 0 | 0 | 0 | 0 | 0 | 52 | - |
| 76 | 0 | `runtime/js/run/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 99 | - |
| 77 | 0 | `runtime/js/run/lifecycle.js` | 0 | 0 | 0 | 0 | 0 | 0 | 63 | - |
| 78 | 0 | `runtime/js/run/player-initialization.js` | 0 | 0 | 0 | 0 | 0 | 0 | 122 | - |
| 79 | 0 | `runtime/js/storage.js` | 0 | 0 | 0 | 0 | 0 | 0 | 46 | - |
| 80 | 0 | `runtime/js/ui/achievements.js` | 0 | 0 | 0 | 0 | 0 | 0 | 173 | - |
| 81 | 0 | `runtime/js/ui/class-chooser.js` | 0 | 0 | 0 | 0 | 0 | 0 | 152 | - |
| 82 | 0 | `runtime/js/ui/equipment-heirlooms.js` | 0 | 0 | 0 | 0 | 0 | 0 | 168 | - |
| 83 | 0 | `runtime/js/ui/info-guide.js` | 0 | 0 | 0 | 0 | 0 | 0 | 168 | - |
| 84 | 0 | `runtime/js/ui/options.js` | 0 | 0 | 0 | 0 | 0 | 0 | 118 | - |
| 85 | 0 | `runtime/js/ui/pet-chooser.js` | 0 | 0 | 0 | 0 | 0 | 0 | 186 | - |
| 86 | 0 | `runtime/js/ui/prestige-moon.js` | 0 | 0 | 0 | 0 | 0 | 0 | 116 | - |
| 87 | 0 | `runtime/js/ui/talent-tree.js` | 0 | 0 | 0 | 0 | 0 | 0 | 240 | - |
| 88 | 0 | `runtime/js/version.js` | 0 | 0 | 0 | 0 | 0 | 0 | 21 | - |

## Interpretation

A high rank means **inspect first**. Before changing a row, verify which hits are real historical composition debt versus intentional current facade/dependency wiring, characterize released behavior when needed, then collapse only the proven historical chain into the current authoritative owner.
