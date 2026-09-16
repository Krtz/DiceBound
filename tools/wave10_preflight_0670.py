from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'runtime/js/combat/presentation.js'
text=PATH.read_text(encoding='utf-8')
text,count=re.subn(r'"enemyPortraitHTML",?', '', text, count=1)
if count==0 and 'enemyPortraitHTML' in text:
    raise RuntimeError('Could not remove dead enemyPortraitHTML dependency')
text=text.replace('"applyClassPortrait",\n', '"applyClassPortrait",\n')
PATH.write_text(text,encoding='utf-8',newline='\n')
print(f'WAVE10_PREFLIGHT removed_enemyPortraitHTML_dependency={count}')
