const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const exists=rel=>fs.existsSync(path.join(root,"runtime",rel));
function assert(condition,message){if(!condition)throw new Error(message);}

const inventory=JSON.parse(read("docs/art/import-2026-09-25/inventory.json"));
const assetsSource=read("runtime/js/assets.js");
const equipmentSource=read("runtime/js/items/equipment.js");
const powerupSource=read("runtime/js/powerups/registry.js");

const powerupEntries=inventory.filter(entry=>entry.destination.includes("/powerups/"));
const gearEntries=inventory.filter(entry=>entry.destination.includes("/equipment/"));
assert(powerupEntries.length===68,"Expected 68 imported Powerup assets.");
assert(gearEntries.length===40,"Expected 40 imported equipment assets.");

for(const entry of inventory){
  const rel=entry.destination.replace(/^runtime\//,"");
  assert(exists(rel),"Imported runtime asset missing: "+rel);
}
for(const entry of powerupEntries){
  const normalized=entry.name.toLowerCase().replace(/[^a-z0-9]+/g,"");
  const registryNames=[...powerupSource.matchAll(/"id":\s*"([^"]+)"[\s\S]{0,320}?"name":\s*"([^"]+)"/g)]
    .filter(match=>match[2].toLowerCase().replace(/[^a-z0-9]+/g,"")===normalized);
  assert(registryNames.length===1,"Powerup identity mapping must be unique for "+entry.name);
  const id=registryNames[0][1],rel=entry.destination.replace(/^runtime\//,"");
  assert(assetsSource.includes(JSON.stringify(id)+":{image:"+JSON.stringify(rel)),"Stable Powerup art mapping missing for "+id);
}
for(const entry of gearEntries){
  const id=entry.destination.split("/").pop().replace(/\.png$/,"");
  const rel=entry.destination.replace(/^runtime\//,"");
  assert(equipmentSource.includes('id:'+JSON.stringify(id)),"Equipment identity missing for "+id);
  assert(equipmentSource.includes("image:"+JSON.stringify(rel)),"Equipment art path missing for "+id);
}

const requiredNecromancer=[
  "player-necromancer.png","class-necromancer.png","summon-skeleton-warrior.png",
  "summon-spectral-skeleton.png","icon-grave-coil.png","icon-summon-skeleton.png",
  "icon-army-of-the-dead.png","icon-grave-count.png","effect-bone-shrapnel.png"
];
const futureNecromancer=[
  "summon-skeleton-mage.png","summon-skeleton-guardian.png","summon-skeleton-rogue.png",
  "summon-skeleton-archer.png","summon-skeleton-priest.png"
];
for(const file of [...requiredNecromancer,...futureNecromancer]){
  assert(exists("assets/necromancer/"+file),"Necromancer art missing: "+file);
  assert(assetsSource.includes(file),"Necromancer art is not semantically registered: "+file);
}
assert(assetsSource.includes("version:26"),"Asset manifest must be version 26 for the 0.6.9.0 art expansion.");
assert(/petDamageScale:(?:0?\.12|\.12)/.test(equipmentSource),"Champion 12% Pet Damage intrinsic missing.");
assert(/petDamageScale:(?:0?\.15|\.15)/.test(equipmentSource),"Champion 15% Pet Damage intrinsic missing.");

console.log("0.6.9.0 authored asset integration: PASS");
