"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,".."),context=vm.createContext({window:{},document:undefined});
for(const relative of [["items","rarities.js"],["items","equipment.js"]]){
  const source=fs.readFileSync(path.join(root,"runtime","js",...relative),"utf8");
  vm.runInContext(source,context,{filename:relative.join("/")});
}
const equipment=context.window.DiceboundEquipment;
const registry=equipment.createRegistry(),identities=registry.identities;

assert.equal(equipment.apiVersion,2);
assert.equal(identities.length,12,"the first authored pack plus ring/amulet fallbacks must share one registry");
const expectedArt={
  "bronze-longsword":"assets/equipment/weapon/bronze-longsword.png",
  shortbow:"assets/equipment/weapon/shortbow.png",
  "rubber-chicken":"assets/equipment/weapon/rubber-chicken.png",
  "crimson-brush":"assets/equipment/weapon/crimson-brush.png",
  "tongue-lash":"assets/equipment/weapon/tongue-lash.png",
  "bronze-full-helm":"assets/equipment/hat/bronze-full-helm.png",
  "bronze-platebody":"assets/equipment/chest/bronze-platebody.png",
  "bronze-platelegs":"assets/equipment/legs/bronze-platelegs.png",
  "bronze-armoured-boots":"assets/equipment/boots/bronze-armoured-boots.png",
  "bronze-round-shield":"assets/equipment/offhand/bronze-round-shield.png",
};
for(const [id,asset] of Object.entries(expectedArt)){
  const identity=equipment.equipmentIdentity(id);
  assert.ok(identity,`${id} missing from the identity registry`);
  assert.equal(identity.art.image,asset,`${id} does not own its canonical art reference`);
  assert.ok(fs.existsSync(path.join(root,"runtime",asset)),`${id} asset was not imported`);
  assert.ok(identity.family&&identity.visual?.rig&&identity.visual?.anchor,`${id} has incomplete reusable identity/rig metadata`);
  assert.ok(identity.rarityEligibility.includes("poor")&&identity.rarityEligibility.includes("epic"),`${id} should be eligible across ordinary rarities`);
}
assert.deepEqual(JSON.parse(JSON.stringify(equipment.intrinsicBonusesForItem({slot:"weapon",equipmentId:"shortbow"}))),{attack:1,crit:.01});
assert.deepEqual(JSON.parse(JSON.stringify(equipment.allBonusesForItem({slot:"weapon",equipmentId:"shortbow",bonuses:{attack:3}}))),{attack:4,crit:.01});
assert.equal(equipment.identityForItem({slot:"weapon",equipmentId:"bronze-round-shield"}),null,"wrong-slot identities must never be accepted from saves");
assert.equal(equipment.identityForItem({slot:"weapon",name:"Old saved gear"}),null,"old saves must not be rerolled into random identities");

const weaponIds=Array.from(equipment.eligibleEquipmentIdentities({slot:"weapon",rarity:"common"}),identity=>identity.id);
assert.deepEqual(weaponIds,["bronze-longsword","shortbow","rubber-chicken","crimson-brush","tongue-lash"]);
for(const classId of ["ranger","fighter","clown","rouge","frog","slime"]){
  const distribution=Object.fromEntries(weaponIds.map(id=>[id,0]));
  for(let index=0;index<10000;index++)distribution[equipment.selectEquipmentIdentity({slot:"weapon",rarity:"common",classId,seed:`${classId}-${index}`}).id]++;
  for(const id of weaponIds)assert.ok(distribution[id]>0,`${classId} was incorrectly locked out of ${id}`);
  if(classId==="ranger")assert.ok(distribution.shortbow>distribution["bronze-longsword"],"Ranger shortbow weighting is not applied");
  if(classId==="fighter")assert.ok(distribution["bronze-longsword"]>distribution.shortbow,"Fighter sword weighting is not applied");
  if(classId==="clown")assert.ok(distribution["rubber-chicken"]>distribution.shortbow,"Clown chicken weighting is not applied");
}
const selected=equipment.selectEquipmentIdentity({slot:"weapon",rarity:"common",classId:"ranger",seed:"stable-identity"});
assert.equal(equipment.selectEquipmentIdentity({slot:"weapon",rarity:"common",classId:"ranger",seed:"stable-identity"}).id,selected.id,"identity selection is not deterministic");
const saved=JSON.parse(JSON.stringify({id:"gear_fixture",slot:"weapon",equipmentId:selected.id,bonuses:{attack:2}}));
assert.equal(equipment.identityForItem(saved).id,selected.id,"equipmentId did not survive JSON save/load");

const assetsContext=vm.createContext({window:{},document:undefined});
vm.runInContext(fs.readFileSync(path.join(root,"runtime","js","assets.js"),"utf8"),assetsContext,{filename:"assets.js"});
for(const relative of [["items","rarities.js"],["items","equipment.js"]])vm.runInContext(fs.readFileSync(path.join(root,"runtime","js",...relative),"utf8"),assetsContext,{filename:relative.join("/")});
const assets=assetsContext.window.DiceboundAssets;
assert.equal(assets.resolveEquipmentArt(saved).image,equipment.equipmentIdentity(selected.id).art.image,"asset bridge does not resolve equipment-owned art");
for(const asset of Object.values(expectedArt))assert.ok(assets.files.includes(asset),`asset preload inventory omits ${asset}`);

console.log("PASS #128/#83 authored equipment identities: assets, weights, Intrinsics, save IDs and class-neutral eligibility");
