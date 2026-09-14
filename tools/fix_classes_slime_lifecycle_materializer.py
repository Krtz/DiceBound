#!/usr/bin/env python3
from pathlib import Path

path=Path(__file__).resolve().parent/'test_classes_runtime.js'
source=path.read_text(encoding='utf-8')
old='assert.doesNotMatch(monolith,/SlimeRougeRuntime/,"monolith still holds a raw Slime Rouge runtime alias");'
new='assert.doesNotMatch(monolith,/const\\s+SlimeRougeRuntime\\s*=/,"monolith still allocates a raw Slime Rouge runtime alias");\nassert.doesNotMatch(monolith,/SlimeRougeRuntime\\.(?:pendingIdentity|pendingUltimate|forcedIdentity|forcedUltimate)\\s*=/,"monolith still mutates raw Slime Rouge runtime state");'
if source.count(old)!=1:
    raise SystemExit(f'expected one broad Slime Rouge assertion, found {source.count(old)}')
path.write_text(source.replace(old,new,1),encoding='utf-8')
print('Classes Slime Rouge anti-shadow guard narrowed to ownership/mutation patterns')
