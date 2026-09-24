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

assert.equal(equipment.apiVersion,4);
assert.equal(identities.length,58,"all approved authored bases and birthday identities must share one registry without generic fallbacks");
const expectedArt={
  "bronze-longsword":"assets/equipment/weapon/bronze-longsword.png",
  shortbow:"assets/equipment/weapon/shortbow.png",
  "rubber-chicken":"assets/equipment/weapon/rubber-chicken.png",
  "crimson-brush":"assets/equipment/weapon/crimson-brush.png",
  "tongue-lash":"assets/equipment/weapon/tongue-lash.png",
  "10th-birthday-balloons":"assets/equipment/weapon/10th-birthday-balloons.png",
  "ashen-staff":"assets/equipment/weapon/ashen-staff.png",
  "birthday-cake":"assets/equipment/weapon/birthday-cake.png",
  "bronze-full-helm":"assets/equipment/hat/bronze-full-helm.png",
  "bronze-platebody":"assets/equipment/chest/bronze-platebody.png",
  "bronze-platelegs":"assets/equipment/legs/bronze-platelegs.png",
  "bronze-armoured-boots":"assets/equipment/boots/bronze-armoured-boots.png",
  "bronze-round-shield":"assets/equipment/offhand/bronze-round-shield.png",
  "oak-shortbow":"assets/equipment/weapon/oak-shortbow.png",
  "bronze-battleaxe":"assets/equipment/weapon/bronze-battleaxe.png",
  "iron-round-shield":"assets/equipment/offhand/iron-round-shield.png",
  spellbook:"assets/equipment/offhand/spellbook.png",
  "hunter-hood":"assets/equipment/hat/hunter-hood.png",
  "leather-harness":"assets/equipment/chest/leather-harness.png",
  "ranger-trousers":"assets/equipment/legs/ranger-trousers.png",
  "trail-boots":"assets/equipment/boots/trail-boots.png",
  "mood-ring":"assets/equipment/ring/mood-ring.png",
  "hawkeye-charm":"assets/equipment/amulet/hawkeye-charm.png",
  "abyssal-wand":"assets/equipment/weapon/abyssal-wand.png",
  "adamant-halberd":"assets/equipment/weapon/adamant-halberd.png",
  "adamant-crossbow":"assets/equipment/weapon/adamant-crossbow.png",
  "adamant-claws":"assets/equipment/weapon/adamant-claws.png",
  "arcane-tome":"assets/equipment/offhand/arcane-tome.png",
  "bag-of-confetti":"assets/equipment/offhand/bag-of-confetti.png",
  "acid-bubble":"assets/equipment/offhand/acid-bubble.png",
  "barbed-quiver":"assets/equipment/offhand/barbed-quiver.png",
  basinet:"assets/equipment/hat/basinet.png",
  bucket:"assets/equipment/hat/bucket.png",
  "crimson-veil":"assets/equipment/hat/crimson-veil.png",
  crown:"assets/equipment/hat/crown.png",
  "band-t-shirt":"assets/equipment/chest/band-t-shirt.png",
  boneweave:"assets/equipment/chest/boneweave.png",
  cardigan:"assets/equipment/chest/cardigan.png",
  "blood-iron-cuirass":"assets/equipment/chest/blood-iron-cuirass.png",
  "bogstrider-wraps":"assets/equipment/legs/bogstrider-wraps.png",
  "executive-legs":"assets/equipment/legs/executive-legs.png",
  "chain-leggings":"assets/equipment/legs/chain-leggings.png",
  "distillers-legs":"assets/equipment/legs/distillers-legs.png",
  "astral-slippers":"assets/equipment/boots/astral-slippers.png",
  "bloodmarch-boots":"assets/equipment/boots/bloodmarch-boots.png",
  "cloudstep-sandals":"assets/equipment/boots/cloudstep-sandals.png",
  "demonhide-boots":"assets/equipment/boots/demonhide-boots.png",
  "gel-loop":"assets/equipment/ring/gel-loop.png",
  "lion-signet":"assets/equipment/ring/lion-signet.png",
  "falcon-band":"assets/equipment/ring/falcon-band.png",
  "jade-band":"assets/equipment/ring/jade-band.png",
  "distillers-amulet":"assets/equipment/amulet/distillers-amulet.png",
  "dragon-tooth":"assets/equipment/amulet/dragon-tooth.png",
  "astral-prism":"assets/equipment/amulet/astral-prism.png",
  "golden-fly":"assets/equipment/amulet/golden-fly.png",
  "decennial-jubilee-balloons":"assets/equipment/amulet/decennial-jubilee-balloons.png",
  "ashcore-pyrestaff":"assets/equipment/weapon/ashcore-pyrestaff.png",
  "candlecrown-gateau":"assets/equipment/offhand/candlecrown-gateau.png",
};
for(const [id,asset] of Object.entries(expectedArt)){
  const identity=equipment.equipmentIdentity(id);
  assert.ok(identity,`${id} missing from the identity registry`);
  assert.equal(identity.art.image,asset,`${id} does not own its canonical art reference`);
  assert.ok(fs.existsSync(path.join(root,"runtime",asset)),`${id} asset was not imported`);
  assert.ok(identity.family&&identity.visual?.rig&&identity.visual?.anchor,`${id} has incomplete reusable identity/rig metadata`);
  assert.ok(identity.rarityEligibility.includes("epic"),`${id} should be eligible at Epic or above where its identity allows`);
}
for(const id of ["10th-birthday-balloons","ashen-staff","birthday-cake"])assert.ok(equipment.equipmentIdentity(id).rarityEligibility.includes("common"),`${id} must retain its original lower-rarity identity range`);
for(const id of ["decennial-jubilee-balloons","ashcore-pyrestaff","candlecrown-gateau"])assert.deepEqual(JSON.parse(JSON.stringify(equipment.equipmentIdentity(id).rarityEligibility)),["epic","legendary"],`${id} must remain Epic+`);
assert.deepEqual(JSON.parse(JSON.stringify(equipment.intrinsicBonusesForItem({slot:"amulet",equipmentId:"decennial-jubilee-balloons"}))),{luck:.02,goldBonus:.05});
assert.deepEqual(JSON.parse(JSON.stringify(equipment.intrinsicBonusesForItem({slot:"weapon",equipmentId:"ashcore-pyrestaff"}))),{maxMana:10,doubleStrike:.02});
assert.deepEqual(JSON.parse(JSON.stringify(equipment.intrinsicBonusesForItem({slot:"offhand",equipmentId:"candlecrown-gateau"}))),{maxHp:5,potionPower:.15});
assert.deepEqual(JSON.parse(JSON.stringify(equipment.intrinsicBonusesForItem({slot:"weapon",equipmentId:"shortbow"}))),{attack:1,crit:.01});
assert.deepEqual(JSON.parse(JSON.stringify(equipment.intrinsicBonusesForItem({slot:"weapon",equipmentId:"oak-shortbow"}))),{attack:2,crit:.01},"Oak Shortbow must remain a distinct approved identity");
assert.deepEqual(JSON.parse(JSON.stringify(equipment.intrinsicBonusesForItem({slot:"offhand",equipmentId:"spellbook"}))),{maxMana:5});
assert.deepEqual(JSON.parse(JSON.stringify(equipment.allBonusesForItem({slot:"weapon",equipmentId:"shortbow",bonuses:{attack:3}}))),{attack:4,crit:.01});
assert.deepEqual(JSON.parse(JSON.stringify(equipment.elementProcBonusesForItem({slot:"weapon",equipmentId:"crimson-brush"}))),{fire:.01},"Crimson Brush must be Fire-specific");
assert.deepEqual(JSON.parse(JSON.stringify(equipment.elementProcBonusesForItem({slot:"boots",equipmentId:"demonhide-boots"}))),{fire:.01,void:.01},"Demonhide must retain both authored proc affinities");
assert.deepEqual(JSON.parse(JSON.stringify(equipment.elementProcBonusesForItem({slot:"weapon",equipmentId:"abyssal-wand"}))),{void:.01});

const fixedMythicals={
  "axels-coffee-mug":{slot:"offhand",intrinsic:{doubleStrike:.05}},
  "kratz-headphones":{slot:"hat",intrinsic:{dodge:.02}},
  "kellys-jean-jacket":{slot:"chest",intrinsic:{defense:2}},
};
for(const [id,expected] of Object.entries(fixedMythicals)){
  const identity=equipment.equipmentIdentity(id);
  assert.ok(identity,`${id} must resolve as a real equipment identity`);
  assert.equal(identity.exclusiveSpecial,true,`${id} must be exclusive to its named Mythical`);
  assert.equal(identity.slot,expected.slot);
  assert.deepEqual(JSON.parse(JSON.stringify(identity.intrinsicBonuses)),expected.intrinsic);
  if(id==="axels-coffee-mug")assert.equal(identity.art.image,"assets/equipment/offhand/axels-coffee-mug.png");
  if(id==="kratz-headphones")assert.equal(identity.art.image,"assets/equipment/hat/kratz-headphones.png");
  for(const rarity of ["poor","common","uncommon","rare","epic","legendary","mythical"]){
    assert.equal(equipment.eligibleEquipmentIdentities({slot:expected.slot,rarity}).some(candidate=>candidate.id===id),false,`${id} leaked into the generic base roll pool`);
  }
}
const oldMug={id:"legacy-mug",slot:"offhand",rarity:"mythical",specialMythical:true,specialLegendary:true,coffeeActionProc:.18,name:"Axel's Coffee Mug",bonuses:{doubleStrike:.70}};
assert.equal(equipment.repairPresentationFields(oldMug,{classId:"ranger"}),true,"old Axel's Coffee Mug must migrate to its fixed identity");
assert.equal(oldMug.equipmentId,"axels-coffee-mug");
assert.deepEqual(JSON.parse(JSON.stringify(equipment.intrinsicBonusesForItem(oldMug))),{doubleStrike:.05});
const oldHeadphones={id:"legacy-headphones",slot:"hat",rarity:"mythical",specialMythical:true,specialLegendary:true,oneHitPerRound:true,name:"Kratz Headphones",bonuses:{dodge:.23}};
equipment.repairPresentationFields(oldHeadphones,{classId:"ranger"});
assert.equal(oldHeadphones.equipmentId,"kratz-headphones");
const oldJacket={id:"legacy-jacket",slot:"chest",rarity:"mythical",specialMythical:true,specialLegendary:true,softDefenseCurve:true,name:"The Jean Jacket Lost at Kelly's",bonuses:{defense:28}};
equipment.repairPresentationFields(oldJacket,{classId:"ranger"});
assert.equal(oldJacket.equipmentId,"kellys-jean-jacket");
assert.equal(equipment.isHeirloomEligible({id:"ordinary",slot:"weapon",name:"Prismatic-sounding ordinary weapon"}),true,"ordinary eligibility must not inspect display names");
assert.equal(equipment.isHeirloomEligible({id:"birthright",slot:"weapon",provenance:"prismatic-birthright",heirloomEligible:false}),false,"explicit run-only equipment must be rejected semantically");
assert.equal(equipment.isHeirloomEligible(null),false,"missing equipment cannot become an heirloom");
assert.equal(equipment.identityForItem({slot:"weapon",equipmentId:"bronze-round-shield"}),null,"wrong-slot identities must never be accepted from saves");
assert.equal(equipment.identityForItem({slot:"weapon",name:"Old saved gear"}),null,"old saves must not be rerolled into random identities");

const specialBase={id:"artifact-crown-fixture",slot:"hat",rarity:"artifact",setName:"Impossible Road",mythicPiece:"hat",name:"Crown fixture",bonuses:{}};
const specialIdentity=equipment.ensureEquipmentIdentity(specialBase,{classId:"ranger",rarity:"legendary",seed:specialBase.id,requireIntrinsic:true});
assert.ok(specialIdentity,"special gear must receive a modern base identity");
assert.equal(specialIdentity.slot,"hat");
assert.equal(specialBase.equipmentId,specialIdentity.id);
assert.ok(Object.keys(equipment.intrinsicBonusesForItem(specialBase)).length>0,"Impossible Road base identity must carry an Intrinsic");
const specialRepeat={...specialBase,equipmentId:null};
equipment.ensureEquipmentIdentity(specialRepeat,{classId:"ranger",rarity:"legendary",seed:specialBase.id,requireIntrinsic:true});
assert.equal(specialRepeat.equipmentId,specialBase.equipmentId,"special identity selection must stay deterministic without gameplay RNG");
const legacySpecial={id:"legacy-special",slot:"offhand",rarity:"mythical",specialMythical:true,name:"Unknown legacy special",icon:"☕",bonuses:{}};
assert.equal(equipment.repairPresentationFields(legacySpecial,{classId:"ranger"}),false,"unknown old Mythicals must not be silently reinterpreted as random bases");
assert.equal(legacySpecial.equipmentId,undefined);

const weaponIds=Array.from(equipment.eligibleEquipmentIdentities({slot:"weapon",rarity:"common"}),identity=>identity.id);
assert.deepEqual(weaponIds,["bronze-longsword","shortbow","rubber-chicken","crimson-brush","tongue-lash","10th-birthday-balloons","ashen-staff","birthday-cake","oak-shortbow","bronze-battleaxe"]);
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

const monolith=fs.readFileSync(path.join(root,"runtime","js","dicebound.js"),"utf8");
assert.match(monolith,/const db06314Equipment=window\.DiceboundEquipment;/,"equipment compatibility adapters must bind their extracted owner before use");

console.log("PASS #128/#83 authored equipment identities: assets, weights, Intrinsics, save IDs and class-neutral eligibility");
