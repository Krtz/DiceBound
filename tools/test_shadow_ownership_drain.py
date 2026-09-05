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
print('Monolith spring-clean guard PASS')
