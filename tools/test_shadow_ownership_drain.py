from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
assert re.search(r'renderInfo\s*=\s*function\s*\([^)]*\)\s*\{\s*return\s+dbInfoGuide\.render\(\)',mono)
for name in ['renderInfoBase','renderInfoV13','renderInfoV14Base','renderInfoV15Patch','renderInfoV16Base','renderInfoV18Base','renderInfoV19Base','renderInfoV24Base','renderInfoV24PresentationBase','renderInfoV27Base','buildAISim','DiceboundAITest']:
    assert not re.search(rf'(?<![\w$]){re.escape(name)}(?![\w$])',mono),name
print('Monolith spring-clean guard PASS')
