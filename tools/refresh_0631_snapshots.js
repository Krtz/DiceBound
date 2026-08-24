"use strict";

const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const digest=value=>{const text=JSON.stringify(value);return {bytes:Buffer.byteLength(text),sha:crypto.createHash("sha256").update(text).digest("hex")};};
const load=(rel,context)=>vm.runInContext(fs.readFileSync(path.join(root,rel),"utf8"),context,{filename:rel});

const classContext=vm.createContext({window:{}});
load("runtime/js/classes/registry.js",classContext);
const classes=classContext.window.DiceboundClasses;
const registry=digest(classes.createRegistry());
const unlocks=digest(classes.createUnlockRegistry());

let classTest=fs.readFileSync(path.join(root,"tools/test_class_registry.js"),"utf8");
classTest=classTest.replace(/assert\.equal\(Buffer\.byteLength\(serialized\),\s*\d+,\s*"canonical class registry byte snapshot drifted"\);/,`assert.equal(Buffer.byteLength(serialized), ${registry.bytes}, "canonical class registry byte snapshot drifted");`);
classTest=classTest.replace(/crypto\.createHash\("sha256"\)\.update\(serialized\)\.digest\("hex"\),\s*"[0-9a-f]+",/,`crypto.createHash("sha256").update(serialized).digest("hex"),\n  "${registry.sha}",`);
classTest=classTest.replace(/snapshot\(unlocks,\s*\d+,\s*"[0-9a-f]+",\s*"class unlock registry"\);/,`snapshot(unlocks, ${unlocks.bytes}, "${unlocks.sha}", "class unlock registry");`);
fs.writeFileSync(path.join(root,"tools/test_class_registry.js"),classTest);

const stateContext=vm.createContext({window:{},console});
load("runtime/js/core/state.js",stateContext);
load("runtime/js/classes/registry.js",stateContext);
load("runtime/js/pets/registry.js",stateContext);
const api=stateContext.window.DiceboundCoreState;
const small=api.createMetaService({classIds:["ranger","sorcerer","fighter"],petIds:["neutral","fire","ice"],elementIds:["fire","ice"],saveService:null}).defaultMeta();
const live=api.createMetaService({classIds:stateContext.window.DiceboundClasses.ids,petIds:stateContext.window.DiceboundPets.ids,elementIds:["fire","ice","electric","light","void","nature","donut","tech","metal","coffee","gun","radiation"],saveService:null}).defaultMeta();
const smallDigest=digest(small),liveDigest=digest(live);
let coreTest=fs.readFileSync(path.join(root,"tools/test_core_state.js"),"utf8");
coreTest=coreTest.replace(/assert\.equal\(Buffer\.byteLength\(serialized\),\d+,"default career byte snapshot drifted"\);/,`assert.equal(Buffer.byteLength(serialized),${smallDigest.bytes},"default career byte snapshot drifted");`);
coreTest=coreTest.replace(/assert\.equal\(crypto\.createHash\("sha256"\)\.update\(serialized\)\.digest\("hex"\),"[0-9a-f]+","default career data drifted"\);/,`assert.equal(crypto.createHash("sha256").update(serialized).digest("hex"),"${smallDigest.sha}","default career data drifted");`);
coreTest=coreTest.replace(/assert\.equal\(Buffer\.byteLength\(liveSerialized\),\d+,"full live default-career byte snapshot drifted"\);/,`assert.equal(Buffer.byteLength(liveSerialized),${liveDigest.bytes},"full live default-career byte snapshot drifted");`);
coreTest=coreTest.replace(/assert\.equal\(crypto\.createHash\("sha256"\)\.update\(liveSerialized\)\.digest\("hex"\),"[0-9a-f]+","full live default-career data drifted"\);/,`assert.equal(crypto.createHash("sha256").update(liveSerialized).digest("hex"),"${liveDigest.sha}","full live default-career data drifted");`);
fs.writeFileSync(path.join(root,"tools/test_core_state.js"),coreTest);

console.log(JSON.stringify({registry,unlocks,smallDefault:smallDigest,liveDefault:liveDigest},null,2));
