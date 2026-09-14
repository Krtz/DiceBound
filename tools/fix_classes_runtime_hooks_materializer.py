from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
materializer_path=ROOT/'tools'/'materialize_classes_runtime_hooks.py'
owner_test_path=ROOT/'tools'/'test_classes_runtime.js'

materializer=materializer_path.read_text(encoding='utf-8')

# The Phase-F materializer was authored before Phase E finalized the umbrella
# Classes owner test. Remove only its stale owner-test rewrite section; the
# production/runtime transformations remain untouched. This repair script then
# updates the current Phase-E owner test directly using its actual text.
start_marker="# Extend umbrella owner test to assert hidden hook owner + load order.\n"
start=materializer.find(start_marker)
if start<0:
    raise SystemExit('stale umbrella-test rewrite start not found')
end_marker="write('tools/test_classes_runtime.js',test)\n"
end=materializer.find(end_marker,start)
if end<0:
    raise SystemExit('stale umbrella-test rewrite end not found')
end+=len(end_marker)
materializer=materializer[:start]+"# Umbrella owner test is aligned by fix_classes_runtime_hooks_materializer.py.\n"+materializer[end:]

# Focused hook assertions should test the released numerical behavior, not
# JavaScript's binary floating-point spelling (0.36 materializes as
# 0.3599999999999999). Keep a tight tolerance while preserving exact formulas.
float_asserts={
    'assert.equal(classes.legacyMonkDodge(.2),.36);':'assert.ok(Math.abs(classes.legacyMonkDodge(.2)-.36)<1e-12);',
    'assert.equal(classes.identityDodgeAdjustments(.36),.414);':'assert.ok(Math.abs(classes.identityDodgeAdjustments(.36)-.414)<1e-12);',
    'assert.equal(classes.identityDodgeAdjustments(.2),.32);':'assert.ok(Math.abs(classes.identityDodgeAdjustments(.2)-.32)<1e-12);'
}
for old,new in float_asserts.items():
    if materializer.count(old)!=1:
        raise SystemExit(f'focused float assertion drifted: {old!r} count={materializer.count(old)}')
    materializer=materializer.replace(old,new,1)
materializer_path.write_text(materializer,encoding='utf-8',newline='\n')

text=owner_test_path.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global text
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text=text.replace(old,new,1)

replace_once(
'''const runtimePath=path.join(root,"runtime","js","classes","runtime.js");
const actionsPath=path.join(root,"runtime","js","classes","actions.js");''',
'''const runtimePath=path.join(root,"runtime","js","classes","runtime.js");
const actionsPath=path.join(root,"runtime","js","classes","actions.js");
const hooksPath=path.join(root,"runtime","js","classes","hooks.js");''',
'Classes hook test path')

replace_once(
'''vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});
vm.runInContext(fs.readFileSync(actionsPath,"utf8"),context,{filename:actionsPath});''',
'''vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});
vm.runInContext(fs.readFileSync(actionsPath,"utf8"),context,{filename:actionsPath});
vm.runInContext(fs.readFileSync(hooksPath,"utf8"),context,{filename:hooksPath});''',
'Classes hook test load')

replace_once(
'''assert.equal(context.window.DiceboundClassActions,undefined,"focused Classes action mechanics leaked as a peer public global");''',
'''assert.equal(context.window.DiceboundClassActions,undefined,"focused Classes action mechanics leaked as a peer public global");
assert.equal(context.window.DiceboundClassHooks,undefined,"focused Classes hooks leaked as a peer public global");''',
'Classes hidden hook assertion')

replace_once(
'''const runtimeModule=manifest.modules.find(entry=>entry.id==="classes-runtime"),actionsModule=manifest.modules.find(entry=>entry.id==="classes-actions");
assert.ok(runtimeModule,"classes-runtime manifest owner missing");assert.equal(runtimeModule.path,"js/classes/runtime.js");assert.deepEqual(runtimeModule.requires,["classes-registry"]);assert.deepEqual(runtimeModule.provides,[],"focused Classes runtime should not publish a peer public facade");
assert.ok(actionsModule,"classes-actions manifest owner missing");assert.equal(actionsModule.path,"js/classes/actions.js");assert.deepEqual(actionsModule.requires,["classes-registry","classes-runtime"]);assert.deepEqual(actionsModule.provides,[],"focused Classes actions should not publish a peer public facade");''',
'''const runtimeModule=manifest.modules.find(entry=>entry.id==="classes-runtime"),actionsModule=manifest.modules.find(entry=>entry.id==="classes-actions"),hooksModule=manifest.modules.find(entry=>entry.id==="classes-hooks");
assert.ok(runtimeModule,"classes-runtime manifest owner missing");assert.equal(runtimeModule.path,"js/classes/runtime.js");assert.deepEqual(runtimeModule.requires,["classes-registry"]);assert.deepEqual(runtimeModule.provides,[],"focused Classes runtime should not publish a peer public facade");
assert.ok(actionsModule,"classes-actions manifest owner missing");assert.equal(actionsModule.path,"js/classes/actions.js");assert.deepEqual(actionsModule.requires,["classes-registry","classes-runtime"]);assert.deepEqual(actionsModule.provides,[],"focused Classes actions should not publish a peer public facade");
assert.ok(hooksModule,"classes-hooks manifest owner missing");assert.equal(hooksModule.path,"js/classes/hooks.js");assert.deepEqual(hooksModule.requires,["classes-registry","classes-runtime"]);assert.deepEqual(hooksModule.provides,[],"focused Classes hooks should not publish a peer public facade");''',
'Classes hook manifest assertion')

replace_once(
'''assert.ok(scripts.indexOf("js/classes/actions.js")<scripts.indexOf("js/dicebound.js"));''',
'''assert.ok(scripts.indexOf("js/classes/actions.js")<scripts.indexOf("js/classes/hooks.js"));assert.ok(scripts.indexOf("js/classes/hooks.js")<scripts.indexOf("js/dicebound.js"));''',
'Classes hook script order')

replace_once(
'''console.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle, routing and bespoke action mechanics are owned behind DiceboundClasses");''',
'''console.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle, routing, bespoke actions and runtime hooks are owned behind DiceboundClasses");''',
'Classes owner PASS label')

owner_test_path.write_text(text,encoding='utf-8',newline='\n')
print('Classes Phase-F temporary materializer and current umbrella owner test aligned')
