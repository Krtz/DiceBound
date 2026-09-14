from pathlib import Path
path=Path(__file__).resolve().parents[1]/'tools'/'materialize_classes_runtime_hooks.py'
text=path.read_text(encoding='utf-8')
old='focused Classes actions leaked as a peer public global'
new='focused Classes action mechanics leaked as a peer public global'
if text.count(old)!=2:
    raise SystemExit(f'expected two stale action-owner assertion literals, found {text.count(old)}')
path.write_text(text.replace(old,new),encoding='utf-8',newline='\n')
print('Classes runtime-hook materializer guard literals patched')
