from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]

def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def write(rel,text): (ROOT/rel).write_text(text,encoding='utf-8',newline='\n')
def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)

# ---------------------------------------------------------------------------
# Classes facade: install/configure the focused Invoker owner privately and
# expose all ordinary collaboration through DiceboundClasses.
# ---------------------------------------------------------------------------
registry=read('runtime/js/classes/registry.js')
registry=replace_once(registry,
'''  let runtimeOwner=null,runtime=null,actionsOwner=null,actionsRuntime=null,hooksOwner=null,hooksRuntime=null;''',
'''  let runtimeOwner=null,runtime=null,actionsOwner=null,actionsRuntime=null,hooksOwner=null,hooksRuntime=null,invokerOwner=null,invokerRuntime=null;''',
'registry Invoker state')
registry=replace_once(registry,
'''  function requireRuntime(name){
    const fn=runtime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses runtime capability ${name}() is not configured.`);
    return fn;
  }
  function call(name,...args){return requireRuntime(name)(...args);}
''',
'''  function installInvoker(owner){
    if(!owner||typeof owner.configure!=="function")throw new Error("DiceboundClasses Invoker owner is invalid.");
    invokerOwner=owner;
    return api;
  }
  function configureInvoker(next={}){
    if(!invokerOwner)throw new Error("DiceboundClasses Invoker owner has not been installed.");
    invokerRuntime=invokerOwner.configure(next);
    return api;
  }
  function requireInvoker(name){
    const fn=invokerRuntime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses Invoker capability ${name}() is not configured.`);
    return fn;
  }
  function callInvoker(name,...args){return requireInvoker(name)(...args);}
  function requireInvokerTest(name){
    const fn=invokerRuntime?._test?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses Invoker test capability ${name}() is not configured.`);
    return fn;
  }
  function requireRuntime(name){
    const fn=runtime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses runtime capability ${name}() is not configured.`);
    return fn;
  }
  function call(name,...args){return requireRuntime(name)(...args);}
''','registry Invoker helpers')
registry=replace_once(registry,
'''    configureActionMechanics,
    configureRuntimeHooks,
    configureActions:next=>call("configureActions",next),''',
'''    configureActionMechanics,
    configureRuntimeHooks,
    configureInvoker,
    configureActions:next=>call("configureActions",next),''','registry Invoker configure API')
registry=replace_once(registry,
'''    syncOuroborosEconomy:()=>callHook("syncOuroborosEconomy"),
    identityId:()=>call("identityId"),''',
'''    syncOuroborosEconomy:()=>callHook("syncOuroborosEconomy"),
    invokerActive:()=>invokerRuntime?.active?.()||false,
    invokerRecipeFor:orbs=>callInvoker("recipeFor",orbs),
    invokerRecipeInfo:()=>callInvoker("recipeInfo"),
    invokerOrbBonuses:()=>callInvoker("orbBonuses"),
    invokerActionBonuses:()=>invokerRuntime?.actionBonuses?.()||null,
    invokerOutgoingMultiplier:()=>invokerRuntime?.outgoingMultiplier?.()||1,
    invokerGeneratorManaMultiplier:()=>invokerRuntime?.generatorManaMultiplier?.()||1,
    invokerAfterPlayerAction:kind=>invokerRuntime?.afterPlayerAction?.(kind),
    invokerAfterPlayerHit:(target,options)=>invokerRuntime?.afterPlayerHit?.(target,options),
    invokerResponseModifier:()=>invokerRuntime?.responseModifier?.()||null,
    invokerElementalLance:()=>callInvoker("elementalLance"),
    invokerUltimate:()=>callInvoker("invokeUltimate"),
    invokerBeginCombat:()=>invokerRuntime?.beginCombat?.(),
    invokerResetCombat:(...args)=>invokerRuntime?.resetCombat?.(...args),
    invokerRender:()=>invokerRuntime?.render?.(),
    identityId:()=>call("identityId"),''','registry Invoker facade API')
registry=replace_once(registry,
'''    runtimeSnapshot:()=>call("snapshot"),
    _installRuntime:installRuntime,
    _installActions:installActions,
    _installHooks:installHooks,
''',
'''    runtimeSnapshot:()=>call("snapshot"),
    _invokerTest:Object.freeze({
      addOrb:orb=>requireInvokerTest("addOrb")(orb),
      state:(create=true)=>requireInvokerTest("state")(create),
      scale:(raw,options)=>requireInvokerTest("scale")(raw,options)
    }),
    _installRuntime:installRuntime,
    _installActions:installActions,
    _installHooks:installHooks,
    _installInvoker:installInvoker,
''','registry Invoker installer/test seam')
write('runtime/js/classes/registry.js',registry)

# ---------------------------------------------------------------------------
# Focused Invoker owner installs into Classes; it no longer publishes a peer
# public global.
# ---------------------------------------------------------------------------
invoker=read('runtime/js/classes/invoker.js')
invoker=replace_once(invoker,
'''  const api = Object.freeze({ owner: OWNER, apiVersion: 1, configure, active, ORB, RECIPE, recipeFor, recipeInfo, orbBonuses, actionBonuses, outgoingMultiplier, generatorManaMultiplier, afterPlayerAction, afterPlayerHit, responseModifier, elementalLance, invokeUltimate, beginCombat, resetCombat, render, _test: Object.freeze({ addOrb, state, scale }) });
  window.DiceboundInvoker = api;
})();''',
'''  const api = Object.freeze({ owner: OWNER, apiVersion: 1, configure, active, ORB, RECIPE, recipeFor, recipeInfo, orbBonuses, actionBonuses, outgoingMultiplier, generatorManaMultiplier, afterPlayerAction, afterPlayerHit, responseModifier, elementalLance, invokeUltimate, beginCombat, resetCombat, render, _test: Object.freeze({ addOrb, state, scale }) });
  const facade=window.DiceboundClasses;
  if(!facade?._installInvoker)throw new Error("classes/invoker.js requires DiceboundClasses facade before loading.");
  facade._installInvoker(api);
})();''','Invoker hidden install')
write('runtime/js/classes/invoker.js',invoker)

# ---------------------------------------------------------------------------
# Monolith: remove dbInvoker peer alias/owner lookup and route every ordinary
# caller plus the permanent oracle through DiceboundClasses.
# ---------------------------------------------------------------------------
mono=read('runtime/js/dicebound.js')
mono=replace_once(mono,'  let dbInvoker=null;\n','', 'remove dbInvoker alias')
for old,new,label in [
    ('dbInvoker?.resetCombat()','dbClasses.invokerResetCombat()','Invoker reset route'),
    ('afterPlayerAction:kind=>dbInvoker?.afterPlayerAction(kind)','afterPlayerAction:kind=>dbClasses.invokerAfterPlayerAction(kind)','Invoker action route'),
    ('actionBonuses:()=>dbInvoker?.actionBonuses()||null','actionBonuses:()=>dbClasses.invokerActionBonuses()','Invoker action bonuses route'),
    ('afterPlayerAction:kind=>dbInvoker?.afterPlayerAction(kind==="attack"&&player._invokerPendingGenerator?"generator":kind)','afterPlayerAction:kind=>dbClasses.invokerAfterPlayerAction(kind==="attack"&&player._invokerPendingGenerator?"generator":kind)','Invoker attack route'),
    ('invokerActive:()=>!!dbInvoker?.active()','invokerActive:()=>dbClasses.invokerActive()','Invoker active route'),
    ('invokerGeneratorManaMultiplier:()=>dbInvoker?.generatorManaMultiplier?.()||1','invokerGeneratorManaMultiplier:()=>dbClasses.invokerGeneratorManaMultiplier()','Invoker mana route'),
    ('invokerElementalLance:()=>dbInvoker?.elementalLance()','invokerElementalLance:()=>dbClasses.invokerElementalLance()','Invoker lance route'),
    ('outgoingDamageMultiplier:()=>dbInvoker?.outgoingMultiplier()||1','outgoingDamageMultiplier:()=>dbClasses.invokerOutgoingMultiplier()','Invoker outgoing route'),
    ('afterPlayerHit:(target,options)=>dbInvoker?.afterPlayerHit(target,options)','afterPlayerHit:(target,options)=>dbClasses.invokerAfterPlayerHit(target,options)','Invoker hit route'),
    ('invokeUltimate:()=>dbInvoker?.invokeUltimate()','invokeUltimate:()=>dbClasses.invokerUltimate()','Invoker ultimate route'),
    ('onCombatStart:()=>dbInvoker?.beginCombat()','onCombatStart:()=>dbClasses.invokerBeginCombat()','Invoker begin route'),
    ('responseModifier:()=>dbInvoker?.responseModifier()','responseModifier:()=>dbClasses.invokerResponseModifier()','Invoker response route')
]:
    count=mono.count(old)
    if count<1: raise SystemExit(f'{label}: expected at least one match, found {count}')
    mono=mono.replace(old,new)

mono=replace_once(mono,
'''  const dbInvokerOwner=window.DiceboundInvoker;
  if(!dbInvokerOwner)throw new Error('DiceBound requires the Invoker class owner before dicebound.js');
  dbInvoker=dbInvokerOwner.configure({''',
'''  dbClasses.configureInvoker({''','Invoker composition route')
mono=replace_once(mono,
'''    invokerFormula:()=>{dbClassesOracleSetup('invoker');dbInvoker.afterPlayerAction('guard');dbInvoker.afterPlayerAction('generator');dbInvoker.afterPlayerAction('spender');return {active:dbInvoker.active(),state:dbClassesOracleClone(dbInvoker._test.state(false)),recipe:dbClassesOracleClone(dbInvoker.recipeInfo()),bonuses:dbClassesOracleClone(dbInvoker.actionBonuses()),identity:classIdentityId()};},''',
'''    invokerFormula:()=>{dbClassesOracleSetup('invoker');dbClasses.invokerAfterPlayerAction('guard');dbClasses.invokerAfterPlayerAction('generator');dbClasses.invokerAfterPlayerAction('spender');return {active:dbClasses.invokerActive(),state:dbClassesOracleClone(dbClasses._invokerTest.state(false)),recipe:dbClassesOracleClone(dbClasses.invokerRecipeInfo()),bonuses:dbClassesOracleClone(dbClasses.invokerActionBonuses()),identity:classIdentityId()};},''','Invoker oracle route')
if 'dbInvoker' in mono: raise SystemExit('dbInvoker peer alias/caller survived monolith consolidation')
if 'window.DiceboundInvoker' in mono: raise SystemExit('peer DiceboundInvoker global lookup survived monolith consolidation')
write('runtime/js/dicebound.js',mono)

# ---------------------------------------------------------------------------
# Manifest: Invoker remains a focused internal but no longer provides a public
# subsystem global. Load order/dependency stays unchanged.
# ---------------------------------------------------------------------------
manifest_path=ROOT/'runtime/js/module-manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
entries=[entry for entry in manifest['modules'] if entry.get('id')=='classes-invoker']
if len(entries)!=1: raise SystemExit(f'classes-invoker manifest entries: {len(entries)}')
entry=entries[0]
if entry.get('provides')!=['DiceboundInvoker']: raise SystemExit(f'unexpected Invoker provides: {entry.get("provides")}')
entry['provides']=[]
manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')

# ---------------------------------------------------------------------------
# Migrate the deterministic Invoker contract to exercise the sole public
# Classes facade. Keep the existing behavioral coverage intact.
# ---------------------------------------------------------------------------
test=read('tools/test_invoker.js')
test=replace_once(test,
'''const registry = context.window.DiceboundClasses.createRegistry(), invoker = context.window.DiceboundInvoker;
assert.equal(registry.invoker.name, "Invoker");''',
'''const classes = context.window.DiceboundClasses, registry = classes.createRegistry();
assert.equal(context.window.DiceboundInvoker, undefined, "focused Invoker owner leaked as a peer public global");
assert.equal(registry.invoker.name, "Invoker");''','Invoker contract facade owner')
test=replace_once(test,'invoker.configure({','classes.configureInvoker({','Invoker test configure')
replacements={
    'invoker.recipeFor()':'classes.invokerRecipeFor()',
    'invoker.recipeInfo()':'classes.invokerRecipeInfo()',
    'invoker.orbBonuses()':'classes.invokerOrbBonuses()',
    'invoker.generatorManaMultiplier()':'classes.invokerGeneratorManaMultiplier()',
    'invoker.actionBonuses()':'classes.invokerActionBonuses()',
    'invoker.outgoingMultiplier()':'classes.invokerOutgoingMultiplier()',
    'invoker.afterPlayerAction(':'classes.invokerAfterPlayerAction(',
    'invoker.invokeUltimate()':'classes.invokerUltimate()',
    'invoker.resetCombat()':'classes.invokerResetCombat()',
    'invoker._test.addOrb(':'classes._invokerTest.addOrb(',
}
for old,new in replacements.items(): test=test.replace(old,new)
# recipeFor appears with explicit arrays in the loop, not only no-arg form.
test=test.replace('invoker.recipeFor(', 'classes.invokerRecipeFor(')
if 'invoker.' in test: raise SystemExit('legacy Invoker peer API survived deterministic test migration')
write('tools/test_invoker.js',test)

# Dedicated ownership guard for normal callers/manifest.
ownership=r'''"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const context=vm.createContext({window:{},console,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(path.join(root,"runtime/js/classes/registry.js"),"utf8"),context);
vm.runInContext(fs.readFileSync(path.join(root,"runtime/js/classes/invoker.js"),"utf8"),context);
const classes=context.window.DiceboundClasses;
assert.ok(classes);assert.equal(context.window.DiceboundInvoker,undefined);
assert.equal(typeof classes.configureInvoker,"function");assert.equal(typeof classes.invokerAfterPlayerAction,"function");assert.equal(typeof classes.invokerUltimate,"function");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"runtime/js/module-manifest.json"),"utf8"));
const entry=manifest.modules.find(item=>item.id==="classes-invoker");
assert.ok(entry);assert.deepEqual(entry.provides,[]);assert.ok(entry.requires.includes("classes-registry"));
const mono=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
assert.doesNotMatch(mono,/\bdbInvoker\b/);assert.doesNotMatch(mono,/window\.DiceboundInvoker/);
assert.match(mono,/dbClasses\.configureInvoker\(\{/);
for(const call of ["invokerResetCombat","invokerAfterPlayerAction","invokerActionBonuses","invokerGeneratorManaMultiplier","invokerElementalLance","invokerOutgoingMultiplier","invokerAfterPlayerHit","invokerUltimate","invokerBeginCombat","invokerResponseModifier"])assert.ok(mono.includes(`dbClasses.${call}`),`missing Classes Invoker route ${call}`);
const owner=fs.readFileSync(path.join(root,"runtime/js/classes/invoker.js"),"utf8");
assert.match(owner,/facade\._installInvoker\(api\)/);assert.doesNotMatch(owner,/window\.DiceboundInvoker\s*=/);
console.log("Classes Invoker facade PASS: focused Invoker behavior is internal and every ordinary caller routes through DiceboundClasses");
'''
write('tools/test_classes_invoker_facade.js',ownership)

print('Classes Invoker facade consolidation materialized')
