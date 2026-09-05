#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
camp_path=ROOT/'runtime/js/ui/camp.js'
camp=camp_path.read_text(encoding='utf-8')
old="    'stacked-or-short':Object.freeze({})"
new="    'stacked-or-short':Object.freeze({campPetBtn:Object.freeze({x:.39,y:.80})})"
if camp.count(old)!=1:
    raise SystemExit(f'expected one short-layout refinement map, found {camp.count(old)}')
camp=camp.replace(old,new,1)
camp_path.write_text(camp,encoding='utf-8',newline='\n')

# Wide/compact keep Axel's requested +10 percentage-point Pet move. The short/wide
# viewport retains the previous safe Pet anchor because 90% puts its full control
# below the supported viewport; this is an explicit responsive refinement.
smoke_path=ROOT/'tools/smoke_run_resume_browser.js'
smoke=smoke_path.read_text(encoding='utf-8')
old_short="'stacked-or-short':{campOptionsBtn:[.085,.16],campTalentBtn:[.555,.18],campMoonBtn:[.83,.20],campClassBtn:[.39,.78],campPetBtn:[.39,.90]}"
new_short="'stacked-or-short':{campOptionsBtn:[.085,.16],campTalentBtn:[.555,.18],campMoonBtn:[.83,.20],campClassBtn:[.39,.78],campPetBtn:[.39,.80]}"
if smoke.count(old_short)!=1:
    raise SystemExit(f'expected one generated short Camp smoke anchor map, found {smoke.count(old_short)}')
smoke=smoke.replace(old_short,new_short,1)
smoke_path.write_text(smoke,encoding='utf-8',newline='\n')

# Add an explicit static contract for the short-only safe refinement.
test_path=ROOT/'tools/test_camp_ui.js'
test=test_path.read_text(encoding='utf-8')
needle="assert.equal(shortRules['#campClassBtn'],'left:39%;top:78%;translate:none','short Camp layout must move Class Choice 10% downward');\n"
insert=needle+"assert.match(source,/'stacked-or-short':Object\\.freeze\\(\\{campPetBtn:Object\\.freeze\\(\\{x:\\.39,y:\\.80\\}\\)\\}\\)/,'short/wide Pet must stay inside the viewport while wide/compact retain the requested lower anchor');\n"
if test.count(needle)!=1:
    raise SystemExit(f'expected one short Camp static-test insertion point, found {test.count(needle)}')
test=test.replace(needle,insert,1)
test_path.write_text(test,encoding='utf-8',newline='\n')

subprocess.run(['python','tools/refresh_runtime_manifest.py','--version','0.6.5.20','--channel','Beta','--development-state','Unreleased'],cwd=ROOT,check=True)
print('Short/wide Pet safe-area refinement applied; wide/compact Pet remains at 90%')
