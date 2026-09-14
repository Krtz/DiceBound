#!/usr/bin/env python3
from pathlib import Path

path=Path(__file__).resolve().parent/'test_classes_runtime.js'
source=path.read_text(encoding='utf-8')
replacements={
    'const module=manifest.modules.find(entry=>entry.id==="classes-runtime");':'const runtimeModule=manifest.modules.find(entry=>entry.id==="classes-runtime");',
    'assert.ok(module,"classes-runtime manifest owner missing");':'assert.ok(runtimeModule,"classes-runtime manifest owner missing");',
    'assert.equal(module.path,"js/classes/runtime.js");':'assert.equal(runtimeModule.path,"js/classes/runtime.js");',
    'assert.deepEqual(module.requires,["classes-registry"]);':'assert.deepEqual(runtimeModule.requires,["classes-registry"]);',
    'assert.deepEqual(module.provides,[],"focused Classes runtime should not publish a peer public facade");':'assert.deepEqual(runtimeModule.provides,[],"focused Classes runtime should not publish a peer public facade");',
}
for old,new in replacements.items():
    if source.count(old)!=1:
        raise SystemExit(f'expected one test replacement for {old!r}, found {source.count(old)}')
    source=source.replace(old,new,1)
path.write_text(source,encoding='utf-8')
print('Classes runtime test CommonJS ambiguity fixed')
