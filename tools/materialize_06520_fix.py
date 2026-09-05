#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

ROOT=Path(__file__).resolve().parents[1]
mono_path=ROOT/'runtime/js/dicebound.js'
mono=mono_path.read_text(encoding='utf-8')

v24='''  /* MODULE: version / camp copy ------------------------------------------- */
  const v24TabHints=[...v235TabHints,'the moon seems to notice repeated circles','some invitations are accepted several roads later','not every dance requires music','certain relics remember very ordinary places','a warm fire can attract extremely bad company'];
  document.title=`Dicebound: Alpha v2.4 — ${pick(v24TabHints)}`;
  const v24Brand=document.querySelector('.brand h1');if(v24Brand)v24Brand.textContent='Dicebound: Alpha v2.4';
  const v24BrandSub=document.querySelector('.brand p');if(v24BrandSub)v24BrandSub.textContent='Alpha v2.4 · New rarities, heirloom storage, stranger relics, and something dancing near the fire.';
'''
if mono.count(v24)!=1:
    raise SystemExit(f'expected one orphaned v24 title/brand layer, found {mono.count(v24)}')
mono=mono.replace(v24,'',1)

v25='''  document.title=`Dicebound: Alpha v2.5.1 — ${pick(v24TabHints)}`;
  const v25Brand=document.querySelector('.brand h1');if(v25Brand)v25Brand.textContent='Dicebound: Alpha v2.5.1';
  const v25BrandSub=document.querySelector('.brand p');if(v25BrandSub)v25BrandSub.textContent='Six roads, persistent progression, improbable equipment and increasingly questionable decisions.';
'''
if mono.count(v25)!=1:
    raise SystemExit(f'expected one orphaned v25 title/brand layer, found {mono.count(v25)}')
mono=mono.replace(v25,'',1)
for name in ['v235TabHints','v24TabHints','v24Brand','v24BrandSub','v25Brand','v25BrandSub']:
    if re.search(rf'(?<![\w$]){re.escape(name)}(?![\w$])',mono):
        raise SystemExit(f'orphaned historical title symbol remains: {name}')
mono_path.write_text(mono,encoding='utf-8',newline='\n')

shadow='''from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
assert re.search(r'renderInfo\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{\\s*return\\s+dbInfoGuide\\.render\\(\\)',mono)
for name in [
    'renderInfoBase','renderInfoV13','renderInfoV14Base','renderInfoV15Patch','renderInfoV16Base','renderInfoV18Base','renderInfoV19Base','renderInfoV24Base','renderInfoV24PresentationBase','renderInfoV27Base',
    'buildAISim','DiceboundAITest','buildCareerHarness','DiceboundCareerTestLegacy','buildDiceboundHumanHarness235','DiceboundCareerTest','v235HumanHarness','DB235','DiceboundModules','v235ScaleEnemyBase','v235UpdateMetaBase','feedActivePetV26Base','v24MigratePrestigeHeirloomPurchases','prestigeHeirloomPurchasesMigrated','legacy_storage',
    'v235TabHints','v24TabHints','v24Brand','v24BrandSub','v25Brand','v25BrandSub'
]:
    assert not re.search(rf'(?<![\\w$]){re.escape(name)}(?![\\w$])',mono),name
assert re.search(r'function scaleEnemy\\([\\s\\S]*?const scaled=\\{[\\s\\S]*?if\\(boardLevel===6\\)\\{const balance=db317Board\\(6\\)\\.balance;[\\s\\S]*?return scaled;',mono), 'Board 6 scaling must survive inside the single scaleEnemy owner'
print('Monolith spring-clean guard PASS')
'''
(ROOT/'tools/test_shadow_ownership_drain.py').write_text(shadow,encoding='utf-8',newline='\n')

subprocess.run(['python','tools/refresh_runtime_manifest.py','--version','0.6.5.20','--channel','Beta','--development-state','Unreleased'],cwd=ROOT,check=True)
print(f'Follow-up cleanup applied; monolith now {len(mono.encode("utf-8"))} bytes / {len(mono.splitlines())} lines')
