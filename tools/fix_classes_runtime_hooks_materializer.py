from pathlib import Path
path=Path(__file__).resolve().parents[1]/'tools'/'materialize_classes_runtime_hooks.py'
text=path.read_text(encoding='utf-8')

old='focused Classes actions leaked as a peer public global'
new='focused Classes action mechanics leaked as a peer public global'
if text.count(old)!=2:
    raise SystemExit(f'expected two stale action-owner assertion literals, found {text.count(old)}')
text=text.replace(old,new)

old_block='''test=replace_once(test,
''' + "'''" + '''const actionsModule=manifest.modules.find(entry=>entry.id==\"classes-actions\");
assert.ok(actionsModule,\"classes-actions manifest owner missing\");assert.equal(actionsModule.path,\"js/classes/actions.js\");assert.deepEqual(actionsModule.provides,[],\"focused Classes action mechanics should not publish a peer public facade\");''' + "'''" + ''',
''' + "'''" + '''const actionsModule=manifest.modules.find(entry=>entry.id==\"classes-actions\");
assert.ok(actionsModule,\"classes-actions manifest owner missing\");assert.equal(actionsModule.path,\"js/classes/actions.js\");assert.deepEqual(actionsModule.provides,[],\"focused Classes action mechanics should not publish a peer public facade\");
const hooksModule=manifest.modules.find(entry=>entry.id==\"classes-hooks\");
assert.ok(hooksModule,\"classes-hooks manifest owner missing\");assert.equal(hooksModule.path,\"js/classes/hooks.js\");assert.deepEqual(hooksModule.provides,[],\"focused Classes hooks should not publish a peer public facade\");''' + "'''" + ''','classes runtime manifest hook assert')'''

new_block='''test=replace_once(test,
''' + "'''" + '''const runtimeModule=manifest.modules.find(entry=>entry.id==\"classes-runtime\"),actionsModule=manifest.modules.find(entry=>entry.id==\"classes-actions\");
assert.ok(runtimeModule,\"classes-runtime manifest owner missing\");assert.equal(runtimeModule.path,\"js/classes/runtime.js\");assert.deepEqual(runtimeModule.requires,[\"classes-registry\"]);assert.deepEqual(runtimeModule.provides,[],\"focused Classes runtime should not publish a peer public facade\");
assert.ok(actionsModule,\"classes-actions manifest owner missing\");assert.equal(actionsModule.path,\"js/classes/actions.js\");assert.deepEqual(actionsModule.requires,[\"classes-registry\",\"classes-runtime\"]);assert.deepEqual(actionsModule.provides,[],\"focused Classes action mechanics should not publish a peer public facade\");''' + "'''" + ''',
''' + "'''" + '''const runtimeModule=manifest.modules.find(entry=>entry.id==\"classes-runtime\"),actionsModule=manifest.modules.find(entry=>entry.id==\"classes-actions\"),hooksModule=manifest.modules.find(entry=>entry.id==\"classes-hooks\");
assert.ok(runtimeModule,\"classes-runtime manifest owner missing\");assert.equal(runtimeModule.path,\"js/classes/runtime.js\");assert.deepEqual(runtimeModule.requires,[\"classes-registry\"]);assert.deepEqual(runtimeModule.provides,[],\"focused Classes runtime should not publish a peer public facade\");
assert.ok(actionsModule,\"classes-actions manifest owner missing\");assert.equal(actionsModule.path,\"js/classes/actions.js\");assert.deepEqual(actionsModule.requires,[\"classes-registry\",\"classes-runtime\"]);assert.deepEqual(actionsModule.provides,[],\"focused Classes action mechanics should not publish a peer public facade\");
assert.ok(hooksModule,\"classes-hooks manifest owner missing\");assert.equal(hooksModule.path,\"js/classes/hooks.js\");assert.deepEqual(hooksModule.requires,[\"classes-registry\",\"classes-runtime\"]);assert.deepEqual(hooksModule.provides,[],\"focused Classes hooks should not publish a peer public facade\");''' + "'''" + ''','classes runtime manifest hook assert')'''

if text.count(old_block)!=1:
    raise SystemExit(f'expected one stale manifest assertion transform, found {text.count(old_block)}')
text=text.replace(old_block,new_block,1)

path.write_text(text,encoding='utf-8',newline='\n')
print('Classes runtime-hook materializer aligned with current owner test')
