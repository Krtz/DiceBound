from pathlib import Path
import json

root=Path(__file__).resolve().parents[1]

def read(path): return (root/path).read_text(encoding='utf-8')
def write(path,text): (root/path).write_text(text,encoding='utf-8')
def once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise AssertionError(f'{label}: expected one match, found {count}')
    return text.replace(old,new,1)

# Core State is a focused pure owner. Runtime facade injects persistence; the
# owner must not silently reach sideways to the Save global on its own.
path=Path('runtime/js/core/state.js')
text=read(path)
text=once(text,
  'function createMetaService({classIds,petIds,elementIds,petUnlockRequirement=500,saveService=window.DiceboundSave}={}){',
  'function createMetaService({classIds,petIds,elementIds,petUnlockRequirement=500,saveService=null}={}){',
  'Core State implicit Save dependency')
write(path,text)

# Unlock feedback is an ordinary Progression consumer of persistence. Route it
# through the public Runtime boundary rather than the Storage peer global.
path=Path('runtime/js/progression/class-unlock-feedback.js')
text=read(path)
text=once(text,
  '  const storage=window.DiceboundStorage;',
  '  const runtime=window.DiceboundRuntime;\n  const storage=runtime?.storage;',
  'Class unlock feedback Storage route')
text=once(text,
  '  if(!storage)throw new Error("DiceboundClassUnlockFeedback requires DiceboundStorage");',
  '  if(!storage)throw new Error("DiceboundClassUnlockFeedback requires DiceboundRuntime.storage");',
  'Class unlock feedback Runtime error')
write(path,text)

# Existing focused unit harness supplies only the persistence port it exercises.
path=Path('tools/test_class_unlock_feedback.js')
text=read(path)
text=once(text,
  'const w={DiceboundStorage:{getString:key=>stored.get(String(key))??null,setString:(key,value)=>{stored.set(String(key),String(value));return true;}}};',
  'const w={DiceboundStorage:{getString:key=>stored.get(String(key))??null,setString:(key,value)=>{stored.set(String(key),String(value));return true;}}};\nw.DiceboundRuntime=Object.freeze({storage:w.DiceboundStorage});',
  'Unlock feedback test Runtime port')
write(path,text)

# Remove stale implementation dependencies from the authoritative graph. These
# modules receive capabilities/services via their public subsystem composition
# boundaries and do not import the focused Runtime peers themselves.
manifest_path=root/'runtime/js/module-manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
mods={module['id']:module for module in manifest['modules']}
remove_reqs={
  'core-state':{'save-system'},
  'run-lifecycle':{'run-checkpoint'},
  'run-completion':{'run-checkpoint'},
  'progression-prestige':{'core-state'},
  'progression-lifecycle':{'core-state'},
  'powerup-registry':{'runtime-services'},
  'progression-class-unlock-feedback':{'storage'},
}
for module_id,remove in remove_reqs.items():
    module=mods[module_id]
    module['requires']=[req for req in module.get('requires',[]) if req not in remove]
feedback=mods['progression-class-unlock-feedback']
if 'runtime-facade' not in feedback['requires']:
    feedback['requires'].append('runtime-facade')
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

boundary_test=r'''"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,".."),runtime=path.join(root,"runtime","js");
const peers={
  DiceboundVersion:"version.js",
  DiceboundPlatform:"platform.js",
  DiceboundStorage:"storage.js",
  DiceboundSave:"save-system.js",
  DiceboundRunCheckpoint:"core/run-checkpoint.js",
  DiceboundCoreState:"core/state.js",
  DiceboundRuntimeServices:"core/runtime-services.js",
  DiceboundMemoryDiagnostics:"core/memory-diagnostics.js",
};
const allowed={
  DiceboundVersion:new Set(["native-http-host.js","wrapper-contract.js","platform.js","save-system.js","core/run-checkpoint.js"]),
  DiceboundPlatform:new Set(["save-system.js"]),
  DiceboundStorage:new Set(["save-system.js"]),
  DiceboundSave:new Set(["core/run-checkpoint.js"]),
  DiceboundRunCheckpoint:new Set(),
  DiceboundCoreState:new Set(),
  DiceboundRuntimeServices:new Set(),
  DiceboundMemoryDiagnostics:new Set(),
};
const violations=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.isFile()&&entry.name.endsWith(".js")){
      const rel=path.relative(runtime,full).replaceAll("\\","/"),text=fs.readFileSync(full,"utf8");
      for(const [peer,owner] of Object.entries(peers)){
        if(rel===owner||rel==="core/facade.js")continue;
        const count=(text.match(new RegExp(`window\\.${peer}\\b`,"g"))||[]).length;
        if(count&&!allowed[peer].has(rel))violations.push(`${rel} -> ${peer} (${count})`);
      }
    }
  }
}
walk(runtime);
assert.deepEqual(violations,[],`ordinary Runtime peer-global consumers remain:\n${violations.join("\n")}`);

const state=fs.readFileSync(path.join(runtime,"core","state.js"),"utf8");
assert.match(state,/saveService=null/);
assert.doesNotMatch(state,/window\.DiceboundSave\b/,"Core State still has an implicit Save global dependency");
const feedback=fs.readFileSync(path.join(runtime,"progression","class-unlock-feedback.js"),"utf8");
assert.match(feedback,/const runtime=window\.DiceboundRuntime;/);
assert.match(feedback,/const storage=runtime\?\.storage;/);
assert.doesNotMatch(feedback,/window\.DiceboundStorage\b/);

const manifest=JSON.parse(fs.readFileSync(path.join(runtime,"module-manifest.json"),"utf8"));
const modules=Object.fromEntries(manifest.modules.map(module=>[module.id,module]));
const peerIds=new Set(["version","platform","storage","save-system","run-checkpoint","core-state","runtime-services","memory-diagnostics"]);
const focusedIds=new Set([...peerIds,"runtime-facade","dicebound-monolith"]);
const stale=[];
for(const module of manifest.modules){
  if(focusedIds.has(module.id))continue;
  const direct=(module.requires||[]).filter(req=>peerIds.has(req));
  if(direct.length)stale.push(`${module.id} -> ${direct.join(",")}`);
}
assert.deepEqual(stale,[],`ordinary module manifest still reaches Runtime implementation peers:\n${stale.join("\n")}`);
assert.ok(modules["progression-class-unlock-feedback"].requires.includes("runtime-facade"));
assert.ok(!modules["core-state"].requires.includes("save-system"));
for(const [id,peer] of [["run-lifecycle","run-checkpoint"],["run-completion","run-checkpoint"],["progression-prestige","core-state"],["progression-lifecycle","core-state"],["powerup-registry","runtime-services"]]){
  assert.ok(!modules[id].requires.includes(peer),`${id} stale implementation dependency ${peer} returned`);
}

console.log("Runtime peer-boundary PASS: ordinary modules route through DiceboundRuntime; only focused infrastructure internals retain peer dependencies");
'''
write(Path('tools/test_runtime_peer_boundaries.js'),boundary_test)
print('Runtime boundary cleanup materialized')
