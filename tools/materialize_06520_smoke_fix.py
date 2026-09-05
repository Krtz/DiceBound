#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
paths=[ROOT/'tools/smoke_run_resume_browser.js',ROOT/'tools/smoke_run_resume_native.js']
replacements={
"campTalentBtn:[.305,.125]":"campTalentBtn:[.555,.125]",
"campMoonBtn:[.48,.115]":"campMoonBtn:[.83,.115]",
"campClassBtn:[.39,.55]":"campClassBtn:[.39,.65]",
"campPetBtn:[.39,.80]":"campPetBtn:[.39,.90]",
"campTalentBtn:[.305,.18]":"campTalentBtn:[.555,.18]",
"campMoonBtn:[.48,.20]":"campMoonBtn:[.83,.20]",
"campClassBtn:[.39,.68]":"campClassBtn:[.39,.78]",
}
changed={}
for path in paths:
    text=path.read_text(encoding='utf-8')
    original=text
    counts={}
    for old,new in replacements.items():
        count=text.count(old)
        if count:
            text=text.replace(old,new)
            counts[old]=count
    if text!=original:
        path.write_text(text,encoding='utf-8',newline='\n')
        changed[path.name]=counts
if 'smoke_run_resume_browser.js' not in changed:
    raise SystemExit('browser Camp smoke contained none of the old approved anchors')
print('Updated Camp smoke anchors:',changed)
