"use strict";

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
const focusedIds=new Set([...peerIds,"native-http-host","wrapper-contract","runtime-facade","dicebound-monolith"]);
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
