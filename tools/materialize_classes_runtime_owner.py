#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "runtime" / "js" / "classes" / "registry.js"
CLASS_RUNTIME = ROOT / "runtime" / "js" / "classes" / "runtime.js"
MANIFEST = ROOT / "runtime" / "js" / "module-manifest.json"
INDEX = ROOT / "runtime" / "index.html"
MONO = ROOT / "runtime" / "js" / "dicebound.js"
RUNTIME_TEST = ROOT / "tools" / "test_classes_runtime.js"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


if CLASS_RUNTIME.exists():
    raise SystemExit("classes/runtime.js already exists")
if RUNTIME_TEST.exists():
    raise SystemExit("test_classes_runtime.js already exists")

CLASS_RUNTIME.write_text(r'''(() => {
  "use strict";

  const OWNER="classes/runtime-identity-capability";
  const slimeRougeState={pendingIdentity:null,pendingUltimate:null,forcedIdentity:null,forcedUltimate:null};
  let deps=null;

  function configure(next={}){
    for(const name of ["getPlayer","getSelectedClassId","getClassMechanics","getUltimateSupportMechanics"]){
      if(typeof next?.[name]!=="function")throw new Error(`Classes runtime requires ${name}().`);
    }
    deps=next;
    return api;
  }
  function runtime(){if(!deps)throw new Error("Classes runtime must be configured before use.");return deps;}
  function identityId(){
    const player=runtime().getPlayer();
    if(player?.classId==='slimerouge')return slimeRougeState.pendingIdentity||player.slimeRougeIdentityClass||'slimerouge';
    return player?.classId||runtime().getSelectedClassId()||'ranger';
  }
  function active(id){return identityId()===id;}
  function mechanicsFor(id){return [...(runtime().getClassMechanics(id)||[])];}
  function capabilities(){
    const player=runtime().getPlayer();
    if(player?.classId!=='slimerouge')return new Set(mechanicsFor(identityId()));
    const out=new Set(mechanicsFor('slimerouge'));
    mechanicsFor(slimeRougeState.pendingIdentity||player.slimeRougeIdentityClass).forEach(value=>out.add(value));
    const ultimate=slimeRougeState.pendingUltimate||player.slimeRougeUltimateClass;
    (runtime().getUltimateSupportMechanics(ultimate)||[]).forEach(value=>out.add(value));
    if(ultimate)out.add(`ultimate:${ultimate}`);
    return out;
  }
  function hasMechanic(tag){
    const player=runtime().getPlayer();
    return player?.classId==='slimerouge'?capabilities().has(tag):mechanicsFor(identityId()).includes(tag);
  }
  function forceSlimeRouge(identity=null,ultimate=null){
    slimeRougeState.forcedIdentity=identity;
    slimeRougeState.forcedUltimate=ultimate;
    return snapshot();
  }
  function clearSlimeRougeRuntime(){
    slimeRougeState.pendingIdentity=null;
    slimeRougeState.pendingUltimate=null;
    slimeRougeState.forcedIdentity=null;
    slimeRougeState.forcedUltimate=null;
    return snapshot();
  }
  function snapshot(){return Object.freeze({...slimeRougeState});}
  function runtimeState(){return slimeRougeState;}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,identityId,active,mechanicsFor,capabilities,hasMechanic,
    forceSlimeRouge,clearSlimeRougeRuntime,snapshot,_runtimeState:runtimeState
  });

  const facade=window.DiceboundClasses;
  if(!facade?._installRuntime)throw new Error("classes/runtime.js requires DiceboundClasses facade before loading.");
  facade._installRuntime(api);
})();
''', encoding="utf-8")

registry = REGISTRY.read_text(encoding="utf-8")
tail_marker = "  const CLASS_IDS=Object.freeze(Object.keys(CLASS_DATA));\n"
start = registry.find(tail_marker)
if start < 0:
    raise SystemExit("class registry tail marker missing")
if not registry.rstrip().endswith("})();"):
    raise SystemExit("class registry closure shape changed")
new_tail = r'''  const CLASS_IDS=Object.freeze(Object.keys(CLASS_DATA));

  const clone=value=>JSON.parse(JSON.stringify(value));
  function createRegistry(){return clone(CLASS_DATA);}
  function createPassiveRegistry(){return clone(CLASS_PASSIVE_DATA);}
  function createUnlockRegistry(){return clone(CLASS_UNLOCK_DATA);}
  function createMechanicsRegistry(){return clone(CLASS_MECHANICS_DATA);}
  function createUltimateSupportRegistry(){return clone(ULTIMATE_SUPPORT_DATA);}

  let runtimeOwner=null,runtime=null;
  function installRuntime(owner){
    if(!owner||typeof owner.configure!=="function")throw new Error("DiceboundClasses runtime owner is invalid.");
    runtimeOwner=owner;
    return api;
  }
  function configure(next={}){
    if(!runtimeOwner)throw new Error("DiceboundClasses runtime owner has not been installed.");
    runtime=runtimeOwner.configure(next);
    return api;
  }
  function requireRuntime(name){
    const fn=runtime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses runtime capability ${name}() is not configured.`);
    return fn;
  }
  function call(name,...args){return requireRuntime(name)(...args);}

  const api=Object.freeze({
    owner:"classes/facade",apiVersion:2,
    ids:CLASS_IDS,
    tagVocabulary:Object.freeze([...CLASS_TAG_VOCABULARY]),
    createRegistry,
    createPassiveRegistry,
    createUnlockRegistry,
    createMechanicsRegistry,
    createUltimateSupportRegistry,
    configure,
    identityId:()=>call("identityId"),
    active:id=>call("active",id),
    mechanicsFor:id=>call("mechanicsFor",id),
    capabilities:()=>call("capabilities"),
    hasMechanic:tag=>call("hasMechanic",tag),
    forceSlimeRouge:(identity=null,ultimate=null)=>call("forceSlimeRouge",identity,ultimate),
    clearSlimeRougeRuntime:()=>call("clearSlimeRougeRuntime"),
    runtimeSnapshot:()=>call("snapshot"),
    _runtimeState:()=>call("_runtimeState"),
    _installRuntime:installRuntime,
  });
  window.DiceboundClasses=api;
'''
REGISTRY.write_text(registry[:start] + new_tail + "})();\n", encoding="utf-8")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
modules = manifest.get("modules") or []
if any(module.get("id") == "classes-runtime" for module in modules):
    raise SystemExit("classes-runtime manifest entry already exists")
registry_index = next((i for i,module in enumerate(modules) if module.get("id") == "classes-registry"), None)
if registry_index is None:
    raise SystemExit("classes-registry manifest entry missing")
modules.insert(registry_index + 1, {
    "id": "classes-runtime",
    "path": "js/classes/runtime.js",
    "domain": "classes/runtime-identity-capability-and-slime-rouge-state",
    "status": "extracted",
    "requires": ["classes-registry"],
    "provides": []
})
load_order = manifest.get("loadOrder") or []
if "classes-runtime" in load_order:
    raise SystemExit("classes-runtime already in load order")
order_index = load_order.index("classes-registry")
load_order.insert(order_index + 1, "classes-runtime")
MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

index = INDEX.read_text(encoding="utf-8")
index = replace_once(
    index,
    '<script src="js/classes/registry.js"></script>',
    '<script src="js/classes/registry.js"></script>\n<script src="js/classes/runtime.js"></script>',
    "runtime index Classes insertion",
)
INDEX.write_text(index, encoding="utf-8")

mono = MONO.read_text(encoding="utf-8")
old_identity = r'''  const SlimeRougeRuntime={pendingIdentity:null,pendingUltimate:null,forcedIdentity:null,forcedUltimate:null};
  function classIdentityId(){
    if(player?.classId==='slimerouge')return SlimeRougeRuntime.pendingIdentity||player.slimeRougeIdentityClass||'slimerouge';
    return player?.classId||selectedClassId||'ranger';
  }
  function classIdentityActive(id){return classIdentityId()===id;}
  function classMechanicsFor(id){return [...(window.DiceboundContent?.classMechanics?.[id]||[])];}
  function slimeRougeCapabilities(){
    if(player?.classId!=='slimerouge')return new Set(classMechanicsFor(classIdentityId()));
    const out=new Set(classMechanicsFor('slimerouge'));
    classMechanicsFor(SlimeRougeRuntime.pendingIdentity||player.slimeRougeIdentityClass).forEach(x=>out.add(x));
    const ult=SlimeRougeRuntime.pendingUltimate||player.slimeRougeUltimateClass;
    (window.DiceboundContent?.ultimateSupportMechanics?.[ult]||[]).forEach(x=>out.add(x));
    if(ult)out.add(`ultimate:${ult}`);
    return out;
  }
  function classHasMechanic(tag){return player?.classId==='slimerouge'?slimeRougeCapabilities().has(tag):classMechanicsFor(classIdentityId()).includes(tag);}
'''
new_identity = r'''  // Classes owns runtime identity/capability policy. These thin local names remain
  // temporarily as compatibility adapters while ordinary callers are drained.
  const dbClasses=window.DiceboundClasses;
  if(!dbClasses?.configure)throw new Error("Dicebound.js requires the DiceboundClasses runtime facade.");
  dbClasses.configure({
    getPlayer:()=>player,
    getSelectedClassId:()=>selectedClassId,
    getClassMechanics:id=>[...(window.DiceboundContent?.classMechanics?.[id]||[])],
    getUltimateSupportMechanics:id=>[...(window.DiceboundContent?.ultimateSupportMechanics?.[id]||[])]
  });
  const SlimeRougeRuntime=dbClasses._runtimeState();
  function classIdentityId(){return dbClasses.identityId();}
  function classIdentityActive(id){return dbClasses.active(id);}
  function classMechanicsFor(id){return dbClasses.mechanicsFor(id);}
  function slimeRougeCapabilities(){return dbClasses.capabilities();}
  function classHasMechanic(tag){return dbClasses.hasMechanic(tag);}
'''
mono = replace_once(mono, old_identity, new_identity, "monolith class identity owner")
MONO.write_text(mono, encoding="utf-8")

RUNTIME_TEST.write_text(r'''"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const registryPath=path.join(root,"runtime","js","classes","registry.js");
const runtimePath=path.join(root,"runtime","js","classes","runtime.js");
const monoPath=path.join(root,"runtime","js","dicebound.js");
const manifestPath=path.join(root,"runtime","js","module-manifest.json");
const indexPath=path.join(root,"runtime","index.html");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON});
vm.runInContext(fs.readFileSync(registryPath,"utf8"),context,{filename:registryPath});
vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});

const classes=context.window.DiceboundClasses;
assert.ok(classes,"DiceboundClasses facade missing");
assert.equal(classes.apiVersion,2,"registry compatibility apiVersion drifted");
assert.equal(classes.owner,"classes/facade");
assert.equal(context.window.DiceboundClassRuntime,undefined,"focused Classes runtime leaked as a peer public global");

let player={classId:"ranger"},selected="sorcerer";
const mechanics=classes.createMechanicsRegistry(),ultimateSupport=classes.createUltimateSupportRegistry();
classes.configure({
  getPlayer:()=>player,
  getSelectedClassId:()=>selected,
  getClassMechanics:id=>mechanics[id]||[],
  getUltimateSupportMechanics:id=>ultimateSupport[id]||[],
});
assert.equal(classes.identityId(),"ranger");
assert.equal(classes.active("ranger"),true);
assert.equal(classes.hasMechanic("marks"),true);
assert.deepEqual(Array.from(classes.mechanicsFor("ranger")),["marks","crit","evasion","ranged"]);
player=null;
assert.equal(classes.identityId(),"sorcerer","selected-class fallback drifted");
player={classId:"slimerouge",slimeRougeIdentityClass:"summoner",slimeRougeUltimateClass:"pokemontrainer"};
assert.equal(classes.identityId(),"summoner");
let caps=new Set(Array.from(classes.capabilities()));
for(const capability of ["randomizer","flex","mana","spirits","roster","ultimate:pokemontrainer"])assert.ok(caps.has(capability),`missing Slime Rouge capability ${capability}`);
const raw=classes._runtimeState();
raw.pendingIdentity="ninja";raw.pendingUltimate="ranger";
assert.equal(classes.identityId(),"ninja");
caps=new Set(Array.from(classes.capabilities()));
assert.ok(caps.has("smoke"));assert.ok(caps.has("marks"));assert.ok(caps.has("ultimate:ranger"));
classes.forceSlimeRouge("cleric","alchemist");
assert.deepEqual(JSON.parse(JSON.stringify(classes.runtimeSnapshot())),{pendingIdentity:"ninja",pendingUltimate:"ranger",forcedIdentity:"cleric",forcedUltimate:"alchemist"});
classes.clearSlimeRougeRuntime();
assert.deepEqual(JSON.parse(JSON.stringify(classes.runtimeSnapshot())),{pendingIdentity:null,pendingUltimate:null,forcedIdentity:null,forcedUltimate:null});

const monolith=fs.readFileSync(monoPath,"utf8");
assert.doesNotMatch(monolith,/const SlimeRougeRuntime=\{pendingIdentity:/,"monolith still allocates Slime Rouge runtime state");
assert.match(monolith,/const dbClasses=window\.DiceboundClasses;/,"monolith is not composing the Classes facade");
assert.match(monolith,/const SlimeRougeRuntime=dbClasses\._runtimeState\(\);/,"compatibility state alias is not sourced from Classes owner");
assert.match(monolith,/function classIdentityId\(\)\{return dbClasses\.identityId\(\);\}/);
assert.match(monolith,/function classIdentityActive\(id\)\{return dbClasses\.active\(id\);\}/);
assert.match(monolith,/function classMechanicsFor\(id\)\{return dbClasses\.mechanicsFor\(id\);\}/);
assert.match(monolith,/function slimeRougeCapabilities\(\)\{return dbClasses\.capabilities\(\);\}/);
assert.match(monolith,/function classHasMechanic\(tag\)\{return dbClasses\.hasMechanic\(tag\);\}/);

const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const module=manifest.modules.find(entry=>entry.id==="classes-runtime");
assert.ok(module,"classes-runtime manifest owner missing");
assert.equal(module.path,"js/classes/runtime.js");
assert.deepEqual(module.requires,["classes-registry"]);
assert.deepEqual(module.provides,[],"focused Classes runtime should not publish a peer public facade");
const order=manifest.loadOrder;
assert.equal(order[order.indexOf("classes-registry")+1],"classes-runtime","Classes runtime must load immediately after registry facade");
const scripts=[...fs.readFileSync(indexPath,"utf8").matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match=>match[1]);
assert.ok(scripts.indexOf("js/classes/registry.js")<scripts.indexOf("js/classes/runtime.js"));
assert.ok(scripts.indexOf("js/classes/runtime.js")<scripts.indexOf("js/dicebound.js"));

console.log("Classes runtime owner PASS: identity, capability and Slime Rouge state route through DiceboundClasses");
''', encoding="utf-8")

print("Classes runtime identity owner materialized")
