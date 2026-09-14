from pathlib import Path
path=Path(__file__).resolve().parents[1]/'tools'/'materialize_classes_runtime_hooks.py'
text=path.read_text(encoding='utf-8')

# Phase E renamed the public-owner assertion wording. Patch the two stale
# literals in the temporary Phase-F materializer before it edits the owner test.
old='focused Classes actions leaked as a peer public global'
new='focused Classes action mechanics leaked as a peer public global'
if text.count(old)!=2:
    raise SystemExit(f'expected two stale action-owner assertion literals, found {text.count(old)}')
text=text.replace(old,new)

# The manifest assertion transform itself predates Phase E's combined
# runtime+actions declaration. Replace that one transform by its unique label.
marker="''','classes runtime manifest hook assert')"
end=text.find(marker)
if end<0:
    raise SystemExit('stale manifest assertion transform marker not found')
end+=len(marker)
start=text.rfind('test=replace_once(test,',0,end)
if start<0:
    raise SystemExit('stale manifest assertion transform start not found')
old_block=text[start:end]
if 'classes-actions' not in old_block or 'classes-hooks' not in old_block:
    raise SystemExit('unexpected manifest assertion transform shape')

# IMPORTANT: the current permanent Phase-E owner test still says
# "focused Classes actions should not publish..." in this manifest assertion.
# Match that exact released checkpoint wording rather than silently rewriting it.
new_block='''test=replace_once(test,
''' + "'''" + '''const runtimeModule=manifest.modules.find(entry=>entry.id==\"classes-runtime\"),actionsModule=manifest.modules.find(entry=>entry.id==\"classes-actions\");
assert.ok(runtimeModule,\"classes-runtime manifest owner missing\");assert.equal(runtimeModule.path,\"js/classes/runtime.js\");assert.deepEqual(runtimeModule.requires,[\"classes-registry\"]);assert.deepEqual(runtimeModule.provides,[],\"focused Classes runtime should not publish a peer public facade\");
assert.ok(actionsModule,\"classes-actions manifest owner missing\");assert.equal(actionsModule.path,\"js/classes/actions.js\");assert.deepEqual(actionsModule.requires,[\"classes-registry\",\"classes-runtime\"]);assert.deepEqual(actionsModule.provides,[],\"focused Classes actions should not publish a peer public facade\");''' + "'''" + ''',
''' + "'''" + '''const runtimeModule=manifest.modules.find(entry=>entry.id==\"classes-runtime\"),actionsModule=manifest.modules.find(entry=>entry.id==\"classes-actions\"),hooksModule=manifest.modules.find(entry=>entry.id==\"classes-hooks\");
assert.ok(runtimeModule,\"classes-runtime manifest owner missing\");assert.equal(runtimeModule.path,\"js/classes/runtime.js\");assert.deepEqual(runtimeModule.requires,[\"classes-registry\"]);assert.deepEqual(runtimeModule.provides,[],\"focused Classes runtime should not publish a peer public facade\");
assert.ok(actionsModule,\"classes-actions manifest owner missing\");assert.equal(actionsModule.path,\"js/classes/actions.js\");assert.deepEqual(actionsModule.requires,[\"classes-registry\",\"classes-runtime\"]);assert.deepEqual(actionsModule.provides,[],\"focused Classes actions should not publish a peer public facade\");
assert.ok(hooksModule,\"classes-hooks manifest owner missing\");assert.equal(hooksModule.path,\"js/classes/hooks.js\");assert.deepEqual(hooksModule.requires,[\"classes-registry\",\"classes-runtime\"]);assert.deepEqual(hooksModule.provides,[],\"focused Classes hooks should not publish a peer public facade\");''' + "'''" + ''','classes runtime manifest hook assert')'''

text=text[:start]+new_block+text[end:]
path.write_text(text,encoding='utf-8',newline='\n')
print('Classes runtime-hook materializer aligned with current owner test')
