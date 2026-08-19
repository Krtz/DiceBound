"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const errors = [];
const context = vm.createContext({window:{},console:{error:(...args)=>errors.push(args),log(){},warn(){}}});
const sourcePath = path.join(__dirname,"..","runtime","js","core","state.js");
vm.runInContext(fs.readFileSync(sourcePath,"utf8"),context,{filename:sourcePath});

const api=context.window.DiceboundCoreState;
assert.ok(api,"core state module did not publish window.DiceboundCoreState");
assert.equal(api.apiVersion,1);
assert.ok(Object.isFrozen(api),"core state API is mutable");

let loadOptions=null,savedMeta=null;
const persisted={
  level:26,xp:12,xpNext:999,purchased:{fortune_gold:2},
  heirlooms:[{id:"test",slot:"ring",bonuses:{luck:.2}}],
  pets:{fire:{level:7,xp:3}},elementProgress:{fire:500},
  prestige:{count:4,attack:2},unlocks:{sorcerer:true},
  settings:{masterVolume:2,soundPack:"custom"},
};
const saveService={
  loadMeta(options){loadOptions=options;return {meta:options.normalize(persisted),source:"primary",recovered:false,error:null};},
  saveMeta(meta){savedMeta=meta;return true;},
};
const service=api.createMetaService({classIds:["ranger","sorcerer","fighter"],petIds:["neutral","fire","ice"],elementIds:["fire","ice"],petUnlockRequirement:500,saveService});
assert.ok(Object.isFrozen(service),"configured meta service is mutable");

assert.deepEqual([1,10,11,25,26,50,51,100,101].map(service.legacyXpForLevel),[10,28,32,88,93,213,221,613,624]);
const defaults=service.defaultMeta(),serialized=JSON.stringify(defaults);
assert.equal(Buffer.byteLength(serialized),630,"default career byte snapshot drifted");
assert.equal(crypto.createHash("sha256").update(serialized).digest("hex"),"20ab26c8cb2290991fe621f4dfb99d35671453c8da3b29206e44b828eb4874fe","default career data drifted");
assert.equal(defaults.pets.neutral.unlocked,true);
assert.equal(defaults.pets.fire.unlocked,false);
assert.deepEqual({...defaults.unlocks},{ranger:true,sorcerer:false,fighter:false});

for(const relative of [["classes","registry.js"],["pets","registry.js"]]){
  const dependencyPath=path.join(__dirname,"..","runtime","js",...relative);
  vm.runInContext(fs.readFileSync(dependencyPath,"utf8"),context,{filename:dependencyPath});
}
const liveDefaults=api.createMetaService({
  classIds:context.window.DiceboundClasses.ids,
  petIds:context.window.DiceboundPets.ids,
  elementIds:["fire","ice","electric","light","void","nature","donut","tech","metal","coffee","gun","radiation"],
  saveService:null,
}).defaultMeta();
const liveSerialized=JSON.stringify(liveDefaults);
assert.equal(Buffer.byteLength(liveSerialized),1770,"full live default-career byte snapshot drifted");
assert.equal(crypto.createHash("sha256").update(liveSerialized).digest("hex"),"b5363846cbaafcbf009c95cd2426f0c128087a2b538b67b51a16f808a25f8858","full live default-career data drifted");

const result=service.load(),meta=result.meta;
assert.equal(result.source,"primary");
assert.equal(typeof loadOptions.defaultFactory,"function");
assert.equal(typeof loadOptions.normalize,"function");
assert.equal(meta.xpNext,93,"level XP threshold was not normalized");
assert.equal(meta.purchased.roadborn,1,"legacy purchased talents did not gain Roadborn");
assert.equal(meta.pets.fire.level,7);
assert.equal(meta.pets.fire.xpNext,2);
assert.equal(meta.pets.fire.unlocked,true,"element progress did not unlock the matching pet");
assert.equal(meta.pets.ice.unlocked,false);
assert.equal(meta.prestige.attack,2);
assert.equal(meta.prestige.defense,0);
assert.equal(meta.unlocks.sorcerer,true);
assert.equal(meta.unlocks.fighter,false);
assert.equal(meta.settings.masterVolume,1);
assert.equal(meta.settings.soundPack,"custom");
meta.heirlooms[0].bonuses.luck=99;
assert.equal(persisted.heirlooms[0].bonuses.luck,.2,"normalized heirlooms alias saved input");
assert.equal(service.save(meta),true);
assert.equal(savedMeta,meta);

const noSave=api.createMetaService({classIds:["ranger"],petIds:["neutral","fire"],elementIds:["fire"],saveService:null});
assert.equal(noSave.load().source,"new");
assert.equal(noSave.save({}),false);

const bus=api.createEventBus();
assert.ok(Object.isFrozen(bus));
const calls=[];
const off=bus.on("tick",value=>calls.push(`first:${value}`));
bus.on("tick",()=>{throw new Error("expected listener failure");});
bus.on("tick",value=>calls.push(`last:${value}`));
assert.equal(bus.emit("tick",7),7);
assert.deepEqual(calls,["first:7","last:7"]);
assert.equal(errors.length,1,"event listener failure was not isolated/logged");
off();bus.emit("tick",8);
assert.deepEqual(calls,["first:7","last:7","last:8"]);
assert.throws(()=>bus.on("tick",null),/listener must be a function/);

const monolith=fs.readFileSync(path.join(__dirname,"..","runtime","js","dicebound.js"),"utf8");
assert.doesNotMatch(monolith,/const\s+legacyXpForLevel\s*=\s*level\s*=>/);
assert.doesNotMatch(monolith,/function\s+normalizeMetaCore\s*\(/);
assert.doesNotMatch(monolith,/const\s+DiceboundStateEvents\s*=\s*\(\(\)=>/);
assert.match(monolith,/window\.DiceboundCoreState\?\.createMetaService\?\.\(/);
assert.match(monolith,/const normalizeMetaCore=DB_CORE_META\.normalizeMeta/);
assert.match(monolith,/window\.DiceboundCoreState\.createEventBus\(\)/);

console.log("Core state preserved: career defaults/normalization, save coordination and isolated event bus pass");
