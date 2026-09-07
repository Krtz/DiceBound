from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
assert re.search(r'renderInfo\s*=\s*function\s*\([^)]*\)\s*\{\s*return\s+dbInfoGuide\.render\(\)',mono)
for name in [
    'renderInfoBase','renderInfoV13','renderInfoV14Base','renderInfoV15Patch','renderInfoV16Base','renderInfoV18Base','renderInfoV19Base','renderInfoV24Base','renderInfoV24PresentationBase','renderInfoV27Base',
    'buildAISim','DiceboundAITest','buildCareerHarness','DiceboundCareerTestLegacy','buildDiceboundHumanHarness235','DiceboundCareerTest','v235HumanHarness','DB235','DiceboundModules','v235ScaleEnemyBase','v235UpdateMetaBase','feedActivePetV26Base','v24MigratePrestigeHeirloomPurchases','prestigeHeirloomPurchasesMigrated','legacy_storage',
    'v235TabHints','v24TabHints','v24Brand','v24BrandSub','v25Brand','v25BrandSub'
]:
    assert not re.search(rf'(?<![\w$]){re.escape(name)}(?![\w$])',mono),name
assert re.search(r'function scaleEnemy\([\s\S]*?const scaled=\{[\s\S]*?if\(boardLevel===6\)\{const balance=db317Board\(6\)\.balance;[\s\S]*?return scaled;',mono), 'Board 6 scaling must survive inside the single scaleEnemy owner'
presentation_retired = [
    'updateCombatUIBase','updateCombatUIV12','updateCombatUIV13','updateCombatUIV15Patch','updateCombatUIV16Base',
    'updateCombatUIV17Base','updateCombatUIV17SmokeBase','updateCombatUIV18Base','updateCombatUIV19Base','updateCombatUIV24Base',
    'updateCombatUIV25BurnBase','updateCombatUIV27EnemyBase','updateCombatUIV28SmokeBase','updateCombatUIV28RougeBase',
    'updateCombatUIBeta04Base','db0511UpdateCombatUIBase','db060UpdateCombatUIBase','dbFriendUpdateCombatUiBase',
    'renderEnemyPartyV17Base','db0636RenderEnemyPartyBase','updateBossSpecialIndicatorV24Base',
    'setResourceUI','hideResourceUI','v17RenderSummonerSpirits','v17CompactPoisonMarkers','v24EnsureShieldBars',
]
for symbol in presentation_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired combat presentation owner returned: {symbol}"
assert mono.count('function updateCombatUI(') == 1, 'updateCombatUI must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*updateCombatUI\s*=', mono), 'updateCombatUI reassignment chain must not return'
assert mono.count('function renderEnemyParty(') == 1, 'renderEnemyParty must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*renderEnemyParty\s*=', mono), 'renderEnemyParty reassignment chain must not return'
assert "dbCombatPresentation=dbCombatPresentationOwner.configure({" in mono, 'combat presentation owner is not configured'

encounter_retired = [
    'startCombatV13','startCombatV15Patch','startCombatV16Base','startCombatV17Base','startCombatV18Base','startCombatV19Base','startCombatV19SetBase',
    'startCombatV24Base','startCombatV25DevilBase','startCombatV26StoneBase','startCombatV27DifficultyBase','db0511StartCombatBase','db060StartCombatBase',
    'db0635StartCombatBase','db064StartCombatBase','dbFriendStartCombatBase',
]
for symbol in encounter_retired:
    assert symbol not in mono, f"retired encounter-lifecycle owner returned to compatibility monolith: {symbol}"
assert mono.count('function startCombat(') == 1, 'startCombat must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*startCombat\s*=', mono), 'startCombat reassignment chain must not return'
assert "return dbCombatEncounterLifecycle.start(kind);" in mono, 'encounter lifecycle thin adapter is missing'
assert "dbCombatEncounterLifecycle=dbCombatEncounterOwner.configure({" in mono, 'encounter lifecycle owner is not configured by the composition root'

combat_turn_retired = [
    "v24ApplyDamage", "v24ResolveNormalHits", "v24AttackPattern", "beta03TickEnemyBurns",
    "db0511TickPlayerElementStatuses", "db064ResolveWolfEchoes",
    "enemyTurnV11", "enemyTurnV25DevilBase", "db0511EnemyTurnBase", "db060EnemyTurnBase", "db064EnemyTurnBase", "dbFriendEnemyTurnBase",
    "resolveEnemyResponseV15", "resolveEnemyResponseV19Base", "resolveEnemyResponseV24Base", "resolveEnemyResponseBeta045Base",
    "db046ResolveEnemyBase", "db047ResolveEnemyBase", "db0511ResolveEnemyResponseBase",
]
for symbol in combat_turn_retired:
    assert symbol not in mono, f"retired combat turn owner returned to compatibility monolith: {symbol}"
assert mono.count("async function enemyTurn(") == 1, "enemyTurn must have exactly one thin compatibility adapter"
assert mono.count("async function resolveEnemyResponse(") == 1, "resolveEnemyResponse must have exactly one thin compatibility adapter"
assert "dbCombatTurns=dbCombatTurnOwner.configure({" in mono, "combat turn owner is not configured by the compatibility composition root"

strike_retired = [
    'strikeBaseDamageV13','strikeBaseDamageV15','strikeBaseDamageV26OuroBase','db060StrikeBaseDamageBase',
    'performStrikeV13','performStrikeV16Base','performStrikeV17Base','performStrikeV18Base','performStrikeV24Base','performStrikeV25PoisonBase',
    'performStrikeV26SpeedBase','performStrikeV27SpeedDodgeBase','performStrikeV28SmokeBase','performStrikeBeta04Base','db060PerformStrikeBase',
]
for symbol in strike_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired strike-resolution owner returned: {symbol}"
assert mono.count('function strikeBaseDamage(') == 1, 'strikeBaseDamage must have exactly one thin compatibility adapter'
assert mono.count('async function performStrike(') == 1, 'performStrike must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*strikeBaseDamage\s*=\s*function', mono), 'strikeBaseDamage reassignment chain must not return'
assert not re.search(r'(?m)^\s*performStrike\s*=\s*async function', mono), 'performStrike reassignment chain must not return'
assert "dbCombatStrikes=dbCombatStrikeOwner.configure({" in mono, 'combat strike-resolution owner is not configured by the composition root'

ultimate_retired = [
    'useUltimateV11','useUltimateV13','useUltimateV15Patch','useUltimateV16Base','useUltimateV17Base','useUltimateV18Base',
    'useUltimateV25CroakBase','useUltimateV27SpeedBase','useUltimateV28Base','db060UseUltimateBase','dbFriendUltimateBase',
    'dbFriendDragonDive','rerollClownGagV16',
]
for symbol in ultimate_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Ultimate-resolution owner returned: {symbol}"
assert mono.count('async function useUltimate(') == 1, 'useUltimate must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*useUltimate\s*=', mono), 'useUltimate reassignment chain must not return'
assert "dbCombatUltimateResolution=dbCombatUltimateOwner.configure({" in mono, 'combat Ultimate-resolution owner is not configured by the composition root'
assert "return dbCombatUltimateResolution.start(...args);" in mono, 'Ultimate thin adapter is missing'


guard_retired = [
    'identityGuardActionV17Base','identityGuardActionV18Base','identityGuardActionV19Base','identityGuardActionV19OffhandBase',
    'db060GuardActionBase','dbFriendGuardActionBase',
]
for symbol in guard_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Guard-resolution owner returned: {symbol}"
assert mono.count('async function guardAction(') == 1, 'guardAction must have exactly one thin compatibility adapter'
assert mono.count('async function identityGuardAction(') == 1, 'identityGuardAction must have exactly one thin traced compatibility adapter'
assert not re.search(r'(?m)^  guardAction\s*=', mono), 'top-level guardAction reassignment chain must not return'
assert not re.search(r'(?m)^  identityGuardAction\s*=', mono), 'identityGuardAction reassignment chain must not return'
assert "dbCombatGuardResolution=dbCombatGuardOwner.configure({" in mono, 'combat Guard-resolution owner is not configured by the composition root'
assert "return dbCombatGuardResolution.guardAction(...args);" in mono, 'Guard thin adapter is missing'
assert "dbCombatGuardResolution.identityGuardAction" in mono, 'identity Guard thin adapter is missing'


pet_retired = [
    'petTurnV13', 'petTurnV15Patch', 'petTurnV18Base', 'petTurnV19Base', 'db060PetTurnBase',
    'petDamageV13', 'petDamageV16Base', 'petDamageV17Base',
    'trainerPetDamageV16Base', 'trainerPetDamageV17Base',
]
for symbol in pet_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Pet-resolution owner returned: {symbol}"
assert mono.count('async function petTurn(') == 1, 'petTurn must have exactly one thin compatibility adapter'
assert mono.count('function petDamage(') == 1, 'petDamage must have exactly one thin compatibility adapter'
assert mono.count('function trainerPetDamage(') == 1, 'trainerPetDamage must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^  petTurn\s*=', mono), 'top-level petTurn reassignment chain must not return'
assert not re.search(r'(?m)^  petDamage\s*=', mono), 'top-level petDamage reassignment chain must not return'
assert not re.search(r'(?m)^  trainerPetDamage\s*=', mono), 'top-level trainerPetDamage reassignment chain must not return'
assert "dbCombatPetTurnResolution=dbCombatPetTurnOwner.configure({" in mono, 'combat Pet turn-resolution owner is not configured by the composition root'
assert "return dbCombatPetTurnResolution.petTurn(...args);" in mono, 'Pet turn thin adapter is missing'
assert "return dbCombatPetTurnResolution.petDamage();" in mono, 'Pet damage thin adapter is missing'
assert "return dbCombatPetTurnResolution.trainerPetDamage(id);" in mono, 'Trainer Pet damage thin adapter is missing'

victory_retired = [
    'winCombatV15','winCombatV15Patch','winCombatV16Base','winCombatV19Base','v266ResolveLateFinalBase',
    'winCombatV24Base','winCombatV251Base','winCombatV26Base','db0511WinCombatBase','db060WinCombatBase','db0631WinCombatBase',
    'v19ResolveLateFinal',
]
for symbol in victory_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Victory-resolution owner returned: {symbol}"
assert mono.count('async function winCombat(') == 1, 'winCombat must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^  winCombat\s*=\s*async function', mono), 'winCombat reassignment chain must not return'
assert "dbCombatVictoryResolution=dbCombatVictoryOwner.configure({" in mono, 'combat Victory-resolution owner is not configured by the composition root'
assert "return dbCombatVictoryResolution.winCombat(...args);" in mono, 'Victory thin adapter is missing'


consumables_retired = [
    'usePotionOutsideCombatV24Base', 'dbFriendPotionBase',
]
for symbol in consumables_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Consumables owner returned: {symbol}"
assert mono.count('async function usePotion(') == 1, 'usePotion must have exactly one thin compatibility adapter'
assert mono.count('function usePotionOutsideCombat(') == 1, 'usePotionOutsideCombat must have exactly one thin compatibility adapter'
assert mono.count('async function identityPotionAction(') == 1, 'identityPotionAction must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*usePotion\s*=\s*async function', mono), 'usePotion reassignment chain must not return'
assert not re.search(r'(?m)^\s*usePotionOutsideCombat\s*=\s*function', mono), 'road Potion reassignment chain must not return'
assert not re.search(r'(?m)^\s*identityPotionAction\s*=\s*async function', mono), 'identity Potion reassignment chain must not return'
assert "dbConsumablesResolution=dbConsumablesOwner.configure({" in mono, 'Consumables owner is not configured by the composition root'
assert "dbConsumablesResolution.usePotion.apply(this,args)" in mono, 'combat Potion thin adapter is missing'
assert "dbConsumablesResolution.usePotionOutsideCombat.apply(this,args)" in mono, 'road Potion thin adapter is missing'
assert "dbConsumablesResolution.identityPotionAction.apply(this,args)" in mono, 'identity Potion thin adapter is missing'

print('Monolith spring-clean guard PASS')
