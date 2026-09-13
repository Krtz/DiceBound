#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'runtime/js/events/lifecycle.js'
text=p.read_bytes().decode('utf-8').replace('\r\n','\n')
old="function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};bind();return api;}"
new="function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}"
if text.count(old)!=1: raise SystemExit(f'configure eager-bind marker count {text.count(old)}')
text=text.replace(old,new,1)
for name in ['openSlot','openWheel','openBlessing','openMystic','openBloodwell','openGambler']:
    old=f'function {name}(){{'
    new=f'function {name}(){{bind();'
    if text.count(old)!=1: raise SystemExit(f'{name} marker count {text.count(old)}')
    text=text.replace(old,new,1)
p.write_bytes(text.encode('utf-8'))
print('Road Events listener binding is lazy.')
