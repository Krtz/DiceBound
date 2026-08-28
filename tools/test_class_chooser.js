#!/usr/bin/env node
/* Deterministic ownership contract for the extracted Camp Class chooser. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/ui/class-chooser.js'),'utf8');
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:'class-chooser.js'});

const chooser=sandbox.window.DiceboundClassChooser;
assert(chooser,'Class chooser module should publish its one public owner');
assert.deepStrictEqual([...chooser.order].slice(0,5),['ranger','sorcerer','fighter','monk','berserker']);
assert.equal(chooser.randomMinimum,5,'Random Class must retain its five-unlock threshold');
assert.equal(typeof chooser.resolveRandomForRun,'function','Random run selection must be owned by the Class chooser');
assert.equal(typeof chooser.setRandomMode,'function','Random selection state must be owned by the Class chooser');
assert.equal(typeof chooser.inspect,'function','chooser should expose a narrow inspection hook for runtime smoke checks');
assert.match(source,/data-class-chooser-done/,'every chooser rendering must provide persistent Done chrome');
assert.match(source,/resolveClassArt/,'chooser cards must consume semantic class artwork');
assert.match(source,/class-chooser-layout/,'chooser must render a roster/detail destination rather than the old card grid');
assert.match(source,/entry\.secret&&!runtime\.isUnlocked/,'locked secret classes must remain hidden from the roster');

let selected='ranger';
const classes=[
  {id:'ranger',name:'Ranger',icon:'🏹',desc:'Scout',stats:'40 HP',ultimate:{name:'Arrow Storm',icon:'🏹'}},
  {id:'sorcerer',name:'Sorcerer',icon:'✨',desc:'Mage',stats:'30 HP',ultimate:{name:'Nova',icon:'✨'}},
  {id:'fighter',name:'Fighter',icon:'⚔️',desc:'Front line',stats:'48 HP',ultimate:{name:'Cleave',icon:'⚔️'}},
  {id:'monk',name:'Monk',icon:'👊',desc:'Combo',stats:'38 HP',ultimate:{name:'Palm',icon:'👊'}},
  {id:'clown',name:'Clown',icon:'🤡',desc:'Chaos',stats:'36 HP',ultimate:{name:'Finale',icon:'🤡'}},
];
chooser.configure({
  getState:()=>({classes,selectedClassId:selected}),
  isUnlocked:()=>true,
  setSelectedClassId:id=>{selected=id;},
  pick:pool=>pool[3],
});
chooser.setRandomMode(true);
const picked=chooser.resolveRandomForRun();
assert.equal(picked.id,'monk','Random run selection must use the injected authoritative RNG/pick policy');
assert.equal(selected,'monk','Random run selection must update the selected class through the injected state owner');
assert.equal(chooser.lastRandomClass(),'monk');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
assert(monolith.includes('function renderClassChoices(){return window.DiceboundClassChooser?.render();}'),'monolith should retain only the thin Class chooser composition adapter');
for(const retired of ['renderClassChoices=function','renderClassChoicesV','renderClassChoicesBeta','renderClassChoicesBase','function v19EnsureHub()','Legacy Planning'])assert(!monolith.includes(retired),`retired Class chooser layer must not remain: ${retired}`);
assert(monolith.includes('const db064ClassChooser=window.DiceboundClassChooser;'),'monolith must configure the extracted Class chooser owner');

console.log('Class chooser owner PASS: semantic roster/detail contract, Random ownership and monolith drain guard');
