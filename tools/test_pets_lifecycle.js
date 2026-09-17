#!/usr/bin/env node
/* Deterministic contract checks for the Pet subsystem facade + lifecycle owner. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const registrySource=fs.readFileSync(path.join(root,'runtime/js/pets/registry.js'),'utf8');
const lifecycleSource=fs.readFileSync(path.join(root,'runtime/js/pets/lifecycle.js'),'utf8');
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
vm.runInNewContext(registrySource,sandbox,{filename:'pets/registry.js'});
vm.runInNewContext(lifecycleSource,sandbox,{filename:'pets/lifecycle.js'});

const pets=sandbox.window.DiceboundPets;
const lifecycle=sandbox.window.DiceboundPetLifecycle;
assert(pets&&lifecycle,'Pet facade and lifecycle owner must publish');
assert.equal(pets.owner,'pets/facade');
assert.equal(pets.apiVersion,2);
assert.equal(lifecycle.owner,'pets/lifecycle');
assert.equal(lifecycle.unlockRequirement,500);
assert.equal(pets.ids.length,13);
assert.equal(pets.createRegistry().gun.name,'Trigger','registry compatibility must remain intact');
assert.throws(()=>pets.feed(1),/not configured/,'facade must fail closed before composition');

const registry=pets.createRegistry();
let meta={
  activePet:'neutral',petCookies:20,
  pets:Object.fromEntries(pets.ids.map(id=>[id,{unlocked:true,level:1,xp:0,xpNext:2,progress:0}])),
  elementProgress:Object.fromEntries(pets.ids.filter(id=>id!=='neutral').map(id=>[id,0]))
};
let player={attack:6,defense:1,crit:.15,doubleStrike:0,maxHp:37,hp:37,potionPower:0,bossDamage:0,flatReduction:0,luck:0,elementDamageBonus:0,cookieBondBonus:0,_activePetBonusId:'neutral',_v17PetBonusScale:1};
let runActive=false,petClass=false,saveCount=0,unlockChecks=0,levelSfx=0,coinSfx=0,holySfx=0,metaUpdates=0,hudUpdates=0,petCollectionRenders=0,activePetArtRefreshes=0;
const toasts=[],logs=[];
let randCalls=0;

lifecycle.configure({
  getMeta:()=>meta,getPlayer:()=>player,getPets:()=>registry,
  getElements:()=>Object.fromEntries(pets.ids.filter(id=>id!=='neutral').map(id=>[id,{name:id[0].toUpperCase()+id.slice(1)}])),
  isRunActive:()=>runActive,classHasMechanic:tag=>tag==='pet'&&petClass,talentRank:()=>0,
  rand:(min,max)=>{randCalls++;return min;},
  saveMeta:()=>{saveCount++;},checkDynamicClassUnlocks:()=>{unlockChecks++;},
  sfxLevel:()=>{levelSfx++;},sfxCoin:()=>{coinSfx++;},sfxHoly:()=>{holySfx++;},
  showToast:(...args)=>toasts.push(args),addLog:text=>logs.push(text),updateMetaUI:()=>{metaUpdates++;},updateHUD:()=>{hudUpdates++;},
  renderPetCollection:()=>{petCollectionRenders++;},refreshActivePetArt:()=>{activePetArtRefreshes++;}
});
pets.configure({
  activeDefinition:()=>lifecycle.activeDefinition(),activeState:()=>lifecycle.activeState(),
  bondLevel:id=>lifecycle.bondLevel(id),bonusScale:id=>lifecycle.bonusScale(id),damageExtra:id=>lifecycle.damageExtra(id),
  displayDamage:id=>lifecycle.displayDamage(id),bonusText:id=>lifecycle.bonusText(id),chooserState:()=>lifecycle.chooserState(),
  elementName:id=>lifecycle.elementName(id),canSwitch:id=>lifecycle.canSwitch(id),select:id=>lifecycle.select(id),
  feed:count=>lifecycle.feed(count),trackElementProgress:(key,amount)=>lifecycle.trackElementProgress(key,amount),
  syncActiveBonus:force=>lifecycle.syncActiveBonus(force),shuffledPetIds:()=>lifecycle.shuffledPetIds()
});

meta.activePet='fire';meta.pets.fire.level=1;
assert.equal(pets.bondLevel('fire'),1);assert.equal(pets.bonusScale('fire'),1);assert.equal(pets.damageExtra('fire'),2);assert.equal(pets.displayDamage('fire'),4);
meta.pets.fire.level=6;assert.equal(pets.bonusScale('fire'),1.08);assert.equal(pets.damageExtra('fire'),2);assert.equal(pets.displayDamage('fire'),8);
meta.pets.fire.level=11;assert.equal(pets.bonusScale('fire'),1.16);assert.equal(pets.damageExtra('fire'),3);assert.equal(pets.displayDamage('fire'),13);
meta.pets.fire.level=36;assert.equal(pets.bonusScale('fire'),1.5);assert.equal(pets.damageExtra('fire'),5);assert.equal(pets.displayDamage('fire'),35);
assert.equal(pets.bonusText('fire'),'Bonus: +5 base pet damage · +1 Attack (150% bond scaling) · Bond Lv 36');

meta.pets.fire={unlocked:true,level:1,xp:1,xpNext:2,progress:0};meta.petCookies=20;player.cookieBondBonus=0;
const feedResult=pets.feed(6);
assert.deepEqual(JSON.parse(JSON.stringify(meta.pets.fire)),{unlocked:true,level:3,xp:2,xpNext:4,progress:0});
assert.equal(meta.petCookies,14);assert.equal(saveCount,1);assert.equal(unlockChecks,1);assert.equal(levelSfx,1);assert.equal(coinSfx,0);
assert.equal(feedResult.ok,true);assert.equal(feedResult.spent,6);assert.equal(feedResult.level,3);assert.equal(Object.isFrozen(feedResult),true,'feed result must retain the final frozen compatibility contract');
assert.equal(toasts.length,0,'feeding must remain quiet instead of queueing a toast');assert(logs.at(-1).includes('ate <b>6</b> cookies'));
assert.equal(petCollectionRenders,1,'successful feeding must refresh the Pet collection');assert.equal(activePetArtRefreshes,1,'feeding must refresh active Pet art');
meta.petCookies=0;const noFeed=pets.feed(1);assert.equal(noFeed,false);assert.equal(petCollectionRenders,1,'no-op feed must not rerender the collection');assert.equal(activePetArtRefreshes,2,'final wrapper semantics refresh active Pet art even for a no-op feed');

meta.pets.fire.unlocked=false;meta.elementProgress.fire=0;holySfx=0;
pets.trackElementProgress('fire',499);assert.equal(meta.pets.fire.unlocked,false);
pets.trackElementProgress('fire',1);assert.equal(meta.pets.fire.unlocked,true);assert.equal(meta.elementProgress.fire,500);assert.equal(holySfx,1);assert(logs.at(-1).includes('Elemental companion unlocked'));

meta.activePet='neutral';runActive=true;petClass=false;
assert.equal(pets.canSwitch('fire'),false);assert.equal(pets.select('fire'),false);
petClass=true;assert.equal(pets.canSwitch('fire'),true);assert.equal(pets.select('fire'),true);assert.equal(meta.activePet,'fire');assert.equal(hudUpdates,1);

// Frozen V1.7 bonus replacement semantics: always remove the previous scaled
// bonus before applying the active one, including forced same-pet resync.
player={attack:6,defense:1,crit:.15,doubleStrike:0,maxHp:37,hp:37,potionPower:0,bossDamage:0,flatReduction:0,luck:0,elementDamageBonus:0,cookieBondBonus:0,_activePetBonusId:'neutral',_v17PetBonusScale:1};
meta.activePet='fire';meta.pets.fire.level=11;runActive=true;
pets.syncActiveBonus(true);assert.equal(player.attack,7.16);assert.equal(player._v17PetBonusScale,1.16);
pets.syncActiveBonus(true);assert(Math.abs(player.attack-7.16)<1e-12,'forced same-Pet resync must not drift');
meta.activePet='neutral';pets.syncActiveBonus();assert(Math.abs(player.attack-6)<1e-12);
meta.activePet='donut';meta.pets.donut.level=6;pets.syncActiveBonus();assert(Math.abs(player.maxHp-40.24)<1e-12);assert(Math.abs(player.potionPower-.054)<1e-12);
meta.activePet='neutral';pets.syncActiveBonus();assert(Math.abs(player.maxHp-37)<1e-12);assert(Math.abs(player.potionPower)<1e-12);

randCalls=0;const shuffled=pets.shuffledPetIds();assert.equal(shuffled.length,13);assert.equal(randCalls,12,'13-Pet Fisher-Yates must consume exactly 12 draws');
const chooser=pets.chooserState();assert.equal(chooser.unlockRequirement,500);assert.equal(chooser.activePetId,'neutral');assert.equal(chooser.pets.length,13);

const index=fs.readFileSync(path.join(root,'runtime/index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime/js/module-manifest.json'),'utf8'));
const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
assert(index.indexOf('js/pets/registry.js')<index.indexOf('js/pets/lifecycle.js'),'Pet registry must load before lifecycle owner');
assert(index.indexOf('js/pets/lifecycle.js')<index.indexOf('js/dicebound.js'),'Pet lifecycle owner must load before composition monolith');
const lifecycleModule=manifest.modules.find(mod=>mod.id==='pet-lifecycle');assert(lifecycleModule,'module manifest must register Pet lifecycle owner');
assert.deepEqual(lifecycleModule.provides,['DiceboundPetLifecycle']);
assert(manifest.loadOrder.indexOf('pets-registry')<manifest.loadOrder.indexOf('pet-lifecycle'));
assert(manifest.modules.find(mod=>mod.id==='dicebound-monolith').requires.includes('pet-lifecycle'));
assert.match(monolith,/const dbPets=window\.DiceboundPets;/,'monolith must consume public Pet facade');
assert.match(monolith,/const dbPetLifecycleOwner=window\.DiceboundPetLifecycle;/,'monolith must configure focused Pet lifecycle owner');
assert.match(monolith,/shuffledPetIds:\(\)=>dbPets\.shuffledPetIds\(\)/,'Player Initialization must collaborate through Pet facade');
assert.match(monolith,/syncActivePetBonus:force=>dbPets\.syncActiveBonus\(force\)/,'Player Initialization must route active Pet sync through facade');
assert.match(monolith,/renderPetCollection:\(\)=>window\.DiceboundPetChooser\.render\(\),refreshActivePetArt:\(\)=>db059RefreshActivePetArt\?\.\(\)/,'Pet lifecycle composition must provide final feed presentation callbacks directly through the Pet chooser owner');
assert.doesNotMatch(monolith,/function\s+renderPetCollection\s*\(/,'retired Pet chooser lifecycle adapter must stay retired');
assert.doesNotMatch(monolith,/feedActivePet=function\(count=1\)/,'late feed implementation reassignments must be retired');
assert.doesNotMatch(monolith,/dbFriendFeedActivePetBase/,'Friends feed compatibility wrapper must be retired');
assert.doesNotMatch(monolith,/function v17PetBondLevel\(/,'dead V1.7 Pet bond aliases must be retired');
assert.doesNotMatch(monolith,/function v17PetBonusScale\(/,'dead V1.7 Pet bonus-scale aliases must be retired');
assert.doesNotMatch(monolith,/function v17PetDamageExtra\(/,'dead V1.7 Pet damage aliases must be retired');
assert.doesNotMatch(monolith,/function v17PetBonusText\(/,'dead V1.7 Pet text aliases must be retired');
assert.doesNotMatch(monolith,/const PET_STAT_BONUSES=\{/,'historical Pet stat-bonus implementation must leave the monolith');
assert.doesNotMatch(monolith,/syncActivePetBonusV16=function\(/,'V1.7 active-Pet shadow reassignment must be retired');
assert.doesNotMatch(monolith,/PET_STAT_BONUSES\.gun/,'late Gun Pet shadow bonus must be retired');

console.log('Pet lifecycle owner PASS: progression, switching, final feed API/presentation, facade routing and anti-shadow guards');
