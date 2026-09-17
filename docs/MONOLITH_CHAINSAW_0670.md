# Beta 0.6.7.0 monolith chainsaw report

Baseline: reconciled Beta 0.6.6.39 `main`.

- Monolith before: **7,177 lines / 649,410 UTF-8 bytes**.
- Monolith after source cleanup: **6,869 lines / 589,852 UTF-8 bytes**.
- Physical reduction: **308 lines / 59,558 bytes**.
- Proven DB317 no-op mutations removed: **113** mutation nodes in **115** dead statements/control statements.
- Redundant same-name owner delegates removed: **41**.
- Dead supporting literal declarations removed after their no-op writers disappeared: **1**.
- Element metadata: moved from `dicebound.js` into `runtime/js/combat/element-content.js` with all 12 final elements present from one canonical registry.

## Removed delegate names

- `achievementGateUnlocked`
- `activePetDef`
- `activePetState`
- `activeTrainerPetId`
- `affinityElementMultiplier`
- `allocatedTalentPoints`
- `applyRandomHighRarity`
- `checkDynamicClassUnlocks`
- `clearBloodOverhealTemp`
- `commitClassUnlock`
- `currentWeaponElement`
- `elementHit`
- `elementHitAll`
- `enemyElementProc`
- `enemyForPosition`
- `enemyTurn`
- `gameplayTalentRank`
- `generateBoard`
- `generateEquipment`
- `healPlayer`
- `isClassUnlocked`
- `manaGain`
- `maybePetElementProc`
- `occultChannelAttack`
- `occultSpellAttack`
- `performStrike`
- `petElementFor`
- `recordHealing`
- `renderEnemyParty`
- `repairTalentPrerequisites`
- `shuffledPetIds`
- `statusDotsHTML`
- `strikeBaseDamage`
- `summonerConjure`
- `trackElementProgress`
- `trainerPetDamage`
- `trainerStrike`
- `triggerElementEffect`
- `triggerWeaponElement`
- `unlockClass`
- `winCombat`
