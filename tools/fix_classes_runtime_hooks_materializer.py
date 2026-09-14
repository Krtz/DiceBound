from pathlib import Path
path=Path(__file__).resolve().parents[1]/'tools'/'materialize_classes_runtime_hooks.py'
text=path.read_text(encoding='utf-8')
old='''assert.equal(context.window.DiceboundClassActions,undefined,"focused Classes actions leaked as a peer public global");'''
new='''assert.equal(context.window.DiceboundClassActions,undefined,"focused Classes action mechanics leaked as a peer public global");'''
if text.count(old)!=1:
    raise SystemExit(f'expected one stale action-owner assertion pattern, found {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')
print('Classes runtime-hook materializer guard pattern patched')
