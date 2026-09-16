# Runtime historical-layer census

Generated deterministically by `tools/test_historical_layer_census.py`. This is an archaeology ranking, not an ownership verdict: legitimate current facades/composition adapters are reviewed separately before any rewrite.

The census now distinguishes **historical predecessor chains** from scoped save/override/restore regression hooks. Same-name definitions only count as repeat evidence at the same lexical brace depth. This prevents test monkey-patches from masquerading as patch-era architecture debt.

Score weights predecessor+replacement pairs most heavily, then surviving predecessor captures and same-scope shadows. Version/history naming is only supporting evidence.

| Rank | Score | Runtime file | Replacement pairs | Same-scope repeats | Repeated symbols | Predecessor captures | Temp overrides ignored | Versioned defs | History-named defs | Max alias depth | Lines | Repeated symbols |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 656 | `runtime/js/dicebound.js` | 0 | 6 | 5 | 16 | 4 | 105 | 4 | 1 | 4933 | onComplete×3, add×2, applyPoisonTick×2, filter×2, playElementAnimation×2 |
| 2 | 114 | `runtime/js/combat/turn-resolution.js` | 0 | 0 | 0 | 7 | 0 | 0 | 2 | 1 | 354 | - |
| 3 | 109 | `runtime/js/combat/ultimate-resolution.js` | 0 | 0 | 0 | 5 | 0 | 9 | 0 | 1 | 266 | - |
| 4 | 89 | `runtime/js/combat/strike-resolution.js` | 0 | 0 | 0 | 2 | 0 | 13 | 5 | 1 | 342 | - |
| 5 | 86 | `runtime/js/powerups/facade.js` | 0 | 4 | 2 | 1 | 0 | 0 | 1 | 1 | 175 | filter×4, onComplete×2 |
| 6 | 72 | `runtime/js/combat/mana-action-resolution.js` | 0 | 0 | 0 | 4 | 0 | 0 | 2 | 1 | 303 | - |
| 7 | 72 | `runtime/js/ui/camp.js` | 0 | 0 | 0 | 4 | 0 | 0 | 2 | 1 | 567 | - |
| 8 | 68 | `runtime/js/combat/element-resolution.js` | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 1 | 471 | - |
| 9 | 68 | `runtime/js/combat/guard-resolution.js` | 0 | 0 | 0 | 3 | 0 | 4 | 1 | 1 | 208 | - |
| 10 | 56 | `runtime/js/classes/hooks.js` | 0 | 0 | 0 | 3 | 0 | 0 | 1 | 1 | 78 | - |
| 11 | 56 | `runtime/js/combat/pet-turn-resolution.js` | 0 | 0 | 0 | 3 | 0 | 0 | 1 | 1 | 158 | - |
| 12 | 56 | `runtime/js/items/operations.js` | 0 | 0 | 0 | 3 | 0 | 0 | 1 | 1 | 123 | - |
| 13 | 44 | `runtime/js/combat/effective-stats.js` | 0 | 0 | 0 | 2 | 0 | 0 | 2 | 1 | 151 | - |
| 14 | 44 | `runtime/js/events/reward-policy.js` | 0 | 0 | 0 | 2 | 0 | 0 | 2 | 1 | 65 | - |
| 15 | 42 | `runtime/js/classes/actions.js` | 0 | 0 | 0 | 2 | 0 | 0 | 1 | 1 | 154 | - |
| 16 | 42 | `runtime/js/core/state.js` | 0 | 0 | 0 | 2 | 0 | 0 | 1 | 1 | 59 | - |
| 17 | 42 | `runtime/js/progression/prestige.js` | 0 | 0 | 0 | 2 | 0 | 0 | 1 | 1 | 253 | - |
| 18 | 42 | `runtime/js/save-system.js` | 0 | 0 | 0 | 2 | 0 | 0 | 1 | 1 | 143 | - |
| 19 | 42 | `runtime/js/wrapper-contract.js` | 0 | 0 | 0 | 2 | 0 | 0 | 1 | 1 | 125 | - |
| 20 | 40 | `runtime/js/pets/lifecycle.js` | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 145 | - |
| 21 | 34 | `runtime/js/combat/attack-action-resolution.js` | 0 | 0 | 0 | 1 | 0 | 2 | 1 | 1 | 160 | - |
| 22 | 30 | `runtime/js/combat/vfx.js` | 0 | 0 | 0 | 1 | 0 | 0 | 2 | 1 | 356 | - |
| 23 | 28 | `runtime/js/combat/encounter-lifecycle.js` | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 275 | - |
| 24 | 28 | `runtime/js/items/equipment.js` | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 183 | - |
| 25 | 26 | `runtime/js/classes/runtime.js` | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 147 | - |
| 26 | 26 | `runtime/js/combat/healing-resolution.js` | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 163 | - |
| 27 | 26 | `runtime/js/events/lifecycle.js` | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 199 | - |
| 28 | 26 | `runtime/js/events/merchant-stock.js` | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 147 | - |
| 29 | 26 | `runtime/js/events/treasure.js` | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 75 | - |
| 30 | 26 | `runtime/js/platform.js` | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 138 | - |
| 31 | 26 | `runtime/js/storage.js` | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 46 | - |
| 32 | 17 | `runtime/js/powerups/presentation.js` | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 150 | filter×2 |
| 33 | 11 | `runtime/js/combat/d20-chaos-resolution.js` | 0 | 0 | 0 | 0 | 0 | 3 | 1 | 0 | 259 | - |
| 34 | 8 | `runtime/js/combat/victory-resolution.js` | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 376 | - |
| 35 | 6 | `runtime/js/progression/class-unlock-rules.js` | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 247 | - |
| 36 | 4 | `runtime/js/progression/lifecycle.js` | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 223 | - |
| 37 | 2 | `runtime/js/ui/camp-shell.js` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 83 | - |
| 38 | 0 | `runtime/js/assets.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 183 | - |
| 39 | 0 | `runtime/js/board/generation.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 221 | - |
| 40 | 0 | `runtime/js/board/movement.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 74 | - |
| 41 | 0 | `runtime/js/board/presentation.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 75 | - |
| 42 | 0 | `runtime/js/board/registry.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 89 | - |
| 43 | 0 | `runtime/js/board/tile-dispatch.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 64 | - |
| 44 | 0 | `runtime/js/board/transition.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 69 | - |
| 45 | 0 | `runtime/js/classes/invoker.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 160 | - |
| 46 | 0 | `runtime/js/classes/registry.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1310 | - |
| 47 | 0 | `runtime/js/combat/element-content.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 34 | - |
| 48 | 0 | `runtime/js/combat/enemies.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 291 | - |
| 49 | 0 | `runtime/js/combat/enemy-policy.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 44 | - |
| 50 | 0 | `runtime/js/combat/enemy-scaling-resolution.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 83 | - |
| 51 | 0 | `runtime/js/combat/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 80 | - |
| 52 | 0 | `runtime/js/combat/guardians.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 55 | - |
| 53 | 0 | `runtime/js/combat/presentation.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 338 | - |
| 54 | 0 | `runtime/js/combat/strike-policy.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30 | - |
| 55 | 0 | `runtime/js/combat/targeting.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 47 | - |
| 56 | 0 | `runtime/js/combat/view-facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 88 | - |
| 57 | 0 | `runtime/js/core/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 66 | - |
| 58 | 0 | `runtime/js/core/memory-diagnostics.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 339 | - |
| 59 | 0 | `runtime/js/core/run-checkpoint.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 120 | - |
| 60 | 0 | `runtime/js/core/runtime-services.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 62 | - |
| 61 | 0 | `runtime/js/events/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39 | - |
| 62 | 0 | `runtime/js/events/merchant-facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 85 | - |
| 63 | 0 | `runtime/js/events/merchant-transaction.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 135 | - |
| 64 | 0 | `runtime/js/items/artifacts.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 138 | - |
| 65 | 0 | `runtime/js/items/consumables.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 148 | - |
| 66 | 0 | `runtime/js/items/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 54 | - |
| 67 | 0 | `runtime/js/items/generation.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 78 | - |
| 68 | 0 | `runtime/js/items/loot.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 142 | - |
| 69 | 0 | `runtime/js/items/rarities.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 80 | - |
| 70 | 0 | `runtime/js/native-http-host.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39 | - |
| 71 | 0 | `runtime/js/pets/registry.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 47 | - |
| 72 | 0 | `runtime/js/powerups/borrowing.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 | - |
| 73 | 0 | `runtime/js/powerups/registry.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2959 | - |
| 74 | 0 | `runtime/js/progression/achievements.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 268 | - |
| 75 | 0 | `runtime/js/progression/class-unlock-feedback.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 159 | - |
| 76 | 0 | `runtime/js/progression/talents.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 732 | - |
| 77 | 0 | `runtime/js/rng.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 25 | - |
| 78 | 0 | `runtime/js/run/completion.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52 | - |
| 79 | 0 | `runtime/js/run/dice.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 63 | - |
| 80 | 0 | `runtime/js/run/facade.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 99 | - |
| 81 | 0 | `runtime/js/run/lifecycle.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 63 | - |
| 82 | 0 | `runtime/js/run/player-initialization.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 122 | - |
| 83 | 0 | `runtime/js/ui/achievements.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 173 | - |
| 84 | 0 | `runtime/js/ui/class-chooser.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 152 | - |
| 85 | 0 | `runtime/js/ui/equipment-heirlooms.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 168 | - |
| 86 | 0 | `runtime/js/ui/info-guide.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 168 | - |
| 87 | 0 | `runtime/js/ui/merchant.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 67 | - |
| 88 | 0 | `runtime/js/ui/options.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 118 | - |
| 89 | 0 | `runtime/js/ui/pet-chooser.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 186 | - |
| 90 | 0 | `runtime/js/ui/prestige-moon.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 116 | - |
| 91 | 0 | `runtime/js/ui/talent-tree.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 240 | - |
| 92 | 0 | `runtime/js/version.js` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 21 | - |

## Interpretation

A high rank means **inspect first**. A temporary override count is informational and is not debt by itself. Before changing a row, verify which remaining hits are real historical composition debt versus intentional current facade/dependency wiring, characterize released behavior when needed, then collapse only the proven historical chain into the current authoritative owner.
