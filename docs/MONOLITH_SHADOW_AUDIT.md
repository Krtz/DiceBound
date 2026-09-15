# Monolith shadow-ownership and runtime-dead-content audit

Checkpoint for issue #363, based on reconciled Beta 0.6.6.39 `main` (`f42c6db31cd96a3cc0481672304cf42c65345f19`). The deterministic audit tool is `tools/audit_monolith_shadow_ownership.py`.

This document is an **audit checkpoint**, not authorization for a mass deletion. Findings are split into things we can prove are runtime-dead, things that are live but owned in the wrong place, and exact-name shadow candidates that still require semantic/call-routing review.

## Executive result

- `runtime/js/dicebound.js`: **7,177 lines / 649,410 UTF-8 bytes**.
- DB317 read-only proxy views discovered: **22**.
- Guaranteed no-op mutation statements/calls against those proxy views: **87**.
- Approximate footprint of those guaranteed no-op writes: **230 physical lines / 44,969 characters**. This counts merged mutation statement spans, not adjacent comments.
- Exact-name module-level function collisions between the monolith and extracted modules: **69**. These are manual-review shadow candidates, not automatic proof of duplicate behavior.
- The existing historical-layer census remains unchanged by this audit: `dicebound.js` score **2188**, still far above every extracted module.

The DB317 result is stronger than a naming heuristic. `db317Readonly()` explicitly replaces array mutators with no-op implementations and swallows `set`, `defineProperty` and `deleteProperty`. Once an extracted registry is wrapped in that proxy, later patch-era writes against the proxy cannot change the registry used by the shipped game.

## Guaranteed runtime-dead registry writes

| Proxy view | Current owner | Canonical module | No-op writes | IDs visible in writes | IDs also present in canonical module |
| --- | --- | --- | ---: | ---: | ---: |
| `CLASSES` | DiceboundClasses | `runtime/js/classes/registry.js` | 50 | 12 | 12/12 |
| `CLASS_PASSIVES` | DiceboundClasses | `runtime/js/classes/registry.js` | 4 | 0 | 0/0 |
| `CLASS_TAGS` | DiceboundClasses | `runtime/js/classes/registry.js` | 5 | 0 | 0/0 |
| `PETS` | DiceboundPets | `runtime/js/pets/registry.js` | 2 | 2 | 2/2 |
| `rarityInfo` | DiceboundItems | `runtime/js/items/rarities.js` | 2 | 0 | 0/0 |
| `rarityValues` | DiceboundItems | `runtime/js/items/rarities.js` | 2 | 0 | 0/0 |
| `talents` | DiceboundProgression | `runtime/js/progression/talents.js` | 5 | 2 | 2/2 |
| `upgrades` | DiceboundPowerups | `runtime/js/powerups/registry.js` | 17 | 86 | 86/86 |

### Important no-op blocks already identified

The earliest large dead block begins around monolith line 1129:

- `Object.assign(CLASSES, ...)` adds Vampire, Ninja, CEO and Merchant definitions, but `CLASSES` is already the read-only view of `DiceboundClasses.createRegistry()`.
- `CLASSES.d20.secret = true` is swallowed by the proxy.
- `upgrades.push(...)` around lines 1141 and 1160 contains large Legendary/Rare/class-powerup expansions, but `upgrades` is already the read-only view of `DiceboundPowerups.createRegistry(...)`.
- Every one of the **86 powerup IDs** found in later no-op `upgrades` writes is present in the extracted canonical Powerup registry.
- Every one of the **12 class IDs** found in later no-op class-definition writes is present in the extracted canonical Class registry.

Further guaranteed-dead writes occur throughout the historical patch stack, including old Gun/Radiation pet additions, Beastmaster/Cleric/Paladin/Rogue/Bloodmage/Summoner/Trainer/Alchemist class writes, legacy class tags/passives, old Talent additions/replacements, old rarity rewrites and later Powerup additions. The deterministic tool prints all 87 source locations.

These blocks can contain values that visibly disagree with the shipped game because the text is old but the write never lands. For example, the historical Powerup block still contains older Worldheart/Crown/etc. values while `powerups/registry.js` contains the current canonical values.

## `ELEMENTS`: live, but still misowned

The reported `ELEMENTS` table is **not** the same kind of dead residue.

Audit result:

- `runtime/js/dicebound.js` is the **only** runtime file that declares `ELEMENTS`.
- It is also the only runtime file containing the distinctive complete spell-metadata signature (`Healing Rain of Donuts`, `Caffeinated Haste`, `Hard Rock Metal Music`).
- The table is actively referenced by the monolith and injected through `getElements` into extracted modules.
- Extracted consumers include `combat/d20-chaos-resolution.js`, `combat/element-resolution.js`, `combat/pet-turn-resolution.js`, `combat/presentation.js`, `pets/lifecycle.js`, `progression/lifecycle.js`, `ui/info-guide.js` and runtime diagnostics.

**Classification: live but misowned content.** It is not already duplicated as a complete authoritative registry elsewhere. The mechanics using it are extracted, but the metadata source itself still lives in the Composition / Bootstrap / Tooling root.

A future cleanup should move this table into a focused element-content module under an **existing** subsystem owner (most naturally Combat), then inject/use that focused registry from the other owners. This does not justify a thirteenth public facade.

## Exact-name shadow candidates

The audit found **69** names implemented at module scope both in `dicebound.js` and in at least one extracted module. This is deliberately a wider net than the guaranteed-dead DB317 findings. Some will be real shadow implementations; others will be legitimate composition adapters or coincidental helper names.

High-value candidates by existing owner include:

- **Combat:** `affinityElementMultiplier`, `damageAll`, `elementHit`, `elementHitAll`, `enemyElementProc`, `enemyTurn`, `guardAction`, `healPlayer`, `performStrike`, `playerAttack`, `resolveEnemyResponse`, `rollD20Chaos`, `triggerElementEffect`, `triggerWeaponElement`, `winCombat`, plus several Pet/Mana helpers.
- **Progression:** `achievementGateUnlocked`, `allocatedTalentPoints`, `checkDynamicClassUnlocks`, `commitClassUnlock`, `finalizeRun`, `gameplayTalentRank`, `grantLegacyXp`, `isClassUnlocked`, `repairTalentPrerequisites`, `talentAvailable`, `talentRank`, `unlockClass`.
- **Items:** `formatBonuses`, `generateEquipment`, `openLoot`, `rollGearRarity`, `usePotion`, `usePotionOutsideCombat`.
- **Pets:** `shuffledPetIds`, `trackElementProgress`.
- **Board / Run:** `enemyForPosition`, `generateBoard`.
- **Powerups:** `applyRandomHighRarity`.
- **Presentation:** `renderEnemyParty`, `statusDotsHTML`.

Generic names such as `clamp`, `pick`, `random`, `filter`, `onComplete` and `livingEnemies` are particularly likely to be false positives or local dependency adapters and must not be deleted from name matching alone.

## Classification rules for the next cleanup

1. **Guaranteed runtime no-op:** writes to DB317 read-only registry views after canonical extracted registries are created. These are the safest future deletion candidates, but still need anti-return/registry tests around the deletion.
2. **Live but misowned:** definitions such as `ELEMENTS` that still supply shipped behavior but belong in a focused module under an existing owner.
3. **Potential shadow implementation:** monolith and extracted module both contain same/related behavior. Verify final caller routing and behavior before removing the monolith copy.
4. **Legitimate composition adapter:** dependency injection, bootstrap and facade wiring may stay in `dicebound.js` when it contains no domain implementation.
5. **Uncertain:** anything not proven by runtime semantics or deterministic tests remains for manual review.

## Checkpoint conclusion

The user's suspicion was correct in both directions:

- A **substantial amount of old class/Powerup/Talent/Pet/rarity content really is still physically present in the monolith while being impossible to affect the end product**. We can already prove at least 87 mutation sites / roughly 230 lines are no-op compatibility sediment.
- The `ELEMENTS` table is different: it **does affect the end product**, but its authoritative data has not been extracted even though most element mechanics have. It is therefore a clean example of live monolith ownership that should eventually move.

No production cleanup has been started from these findings. This is the requested stop/checkpoint before selecting or implementing the next removal target.
