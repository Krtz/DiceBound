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

print('Monolith spring-clean guard PASS')
