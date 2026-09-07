#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

SCRIPT=Path(__file__).with_name('materialize_0666_followup.py')
source=SCRIPT.read_text(encoding='utf-8')
needle="replace_once(camp,old_style,new_style,'Hell integrated scene styling')"
replacement="""text=camp.read_text(encoding='utf-8')
style_start='    style.textContent += `\\\\\\n#startOverlay.camp-fullscreen #campHellBtn.hell-volcano-active'
style_end='    documentRef.head?.appendChild(style);'
if text.count(style_start)!=1:
    raise SystemExit(f'Hell integrated scene styling start: expected exactly one match, found {text.count(style_start)}')
start=text.index(style_start)
end=text.find(style_end,start)
if end<0:
    raise SystemExit('Hell integrated scene styling end marker not found')
text=text[:start]+new_style+text[end:]
camp.write_text(text,encoding='utf-8')"""
if source.count(needle)!=1:
    raise SystemExit(f'materializer patch point: expected exactly one match, found {source.count(needle)}')
patched=source.replace(needle,replacement,1)
namespace={'__file__':str(SCRIPT),'__name__':'__main__'}
exec(compile(patched,str(SCRIPT),'exec'),namespace,namespace)
