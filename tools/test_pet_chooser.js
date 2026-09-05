#!/usr/bin/env node
/* Deterministic contract checks for the extracted Pet chooser UI owner. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/ui/pet-chooser.js'),'utf8');
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:'pet-chooser.js'});

const chooser=sandbox.window.DiceboundPetChooser;
assert(chooser,'Pet chooser module should publish its one presentation owner');
let selected='neutral';
let runActive=false;
let feeds=[];
const pets=[
  {id:'neutral',name:'DiBo',icon:'🎲',desc:'A reliable companion.',element:null},
  {id:'fire',name:'Ember',icon:'🔥',desc:'A fire companion.',element:'fire'},
  {id:'void',name:'Null',icon:'🕳️',desc:'A locked companion.',element:'void'}
];
chooser.configure({
  getState:()=>({
    pets,activePetId:selected,cookies:3,unlockRequirement:500,runActive,
    elementProgress:{fire:500,void:80},
    petStates:{neutral:{unlocked:true,level:2,xp:1,xpNext:3},fire:{unlocked:true,level:4,xp:2,xpNext:4},void:{unlocked:false,level:1,xp:0,xpNext:2}}
  }),
  canSwitch:id=>!runActive||id===selected,
  damageFor:id=>id==='fire'?7:3,
  bonusFor:id=>id==='fire'?'Burning companion bonus':'Neutral companion · no stat bonus',
  elementName:id=>id==='void'?'Void':'Fire',
  selectPet:id=>{selected=id;return true;},
  feed:count=>{feeds.push(count);return true;}
});

let model=chooser.viewModel();
assert.equal(model.owner,'ui/pet-chooser');
assert.equal(model.activePet.id,'neutral');
assert.equal(model.pets.length,3);
assert.equal(model.pets.find(pet=>pet.id==='void').locked,true);
assert.equal(model.pets.find(pet=>pet.id==='fire').damage,7);
assert.equal(chooser.select('fire'),true,'unlocked Camp selection should call the authoritative action');
assert.equal(selected,'fire');
runActive=true;
model=chooser.viewModel();
assert.equal(model.pets.find(pet=>pet.id==='neutral').canSwitch,false,'normal active runs must preserve switch restriction');
assert.equal(chooser.select('neutral'),false,'locked mid-run switch must not call gameplay action');
assert.equal(chooser.feed(1),false,'feeding must remain unavailable during a run');
runActive=false;
assert.equal(chooser.feed(3),true);
assert.deepEqual(feeds,[3]);

assert.match(source,/data-pet-chooser-done/,'chooser must own a semantic Done control');
assert.match(source,/pet-chooser-chrome\{position:sticky/,'Done header must be sticky panel chrome');
assert.match(source,/resolvePetArt/,'chooser must consume canonical semantic pet art');
assert.doesNotMatch(source,/const feed=overlay\.querySelector\('\[data-pet-chooser-feed\]'\)/,'feed controls DOM handle must not shadow the feed(count) action');
assert.match(source,/const feedControls=overlay\.querySelector\('\[data-pet-chooser-feed\]'\)/,'feed controls must use a non-action DOM binding name');
assert.doesNotMatch(source,/petCollectionGrid|campPetPanel|MutationObserver/,'new chooser must not depend on retired Pet UI chains');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
const stylesheet=fs.readFileSync(path.join(root,'runtime/css/dicebound.css'),'utf8');
assert.match(monolith,/function renderPetCollection\(\)\{return window\.DiceboundPetChooser\?\.render\?\.\(\)\|\|null;\}/,'monolith must retain only a thin Pet chooser lifecycle adapter');
for(const retired of ['renderPetCollection=function','renderPetCollectionV','campPetPanel','dbBeta021RenderCampPets','db059DecoratePetCollection','db059Observer','petCollectionClose'])assert(!monolith.includes(retired),`retired Pet chooser chain remains in dicebound.js: ${retired}`);
for(const retiredStyle of ['.pet-collection-grid{','.camp-pet-choice-beta021{','.camp-pet-feed-beta021{'])assert(!stylesheet.includes(retiredStyle),`retired Pet chooser style remains in shared CSS: ${retiredStyle}`);

console.log('Pet chooser UI owner PASS: state contract, switching restrictions and monolith drain guards');
