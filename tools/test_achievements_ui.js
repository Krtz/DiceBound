#!/usr/bin/env node
/* Deterministic contract checks for the extracted Achievements/Trophy UI owner. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/ui/achievements.js'),'utf8');
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
sandbox.window.DiceboundAchievements={groups:[
  {id:'roads',label:'Roads'},
  {id:'builds',label:'Builds'},
  {id:'secrets',label:'Secrets'},
  {id:'hero-mastery',label:'Hero Mastery'}
]};
vm.runInNewContext(source,sandbox,{filename:'achievements.js'});

const achievements=sandbox.window.DiceboundAchievementsUi;
assert(achievements,'Achievements UI module should publish its one presentation owner');
const savedOpen={};
const registry=[
  {id:'road-one',name:'First Footfall',hierarchy:{group:'roads'},condition:'runsStarted'},
  {id:'secret-one',name:'Hidden Road',secret:true,hierarchy:{group:'secrets'},condition:'secret'},
  {id:'ranger-board',name:'Green Road Hunter',hierarchy:{group:'hero-mastery',heroId:'ranger'},condition:'boardClear'}
];
achievements.configure({
  getRegistry:()=>registry,
  getClasses:()=>[
    {id:'ranger',name:'Ranger',icon:'🏹'},
    {id:'hidden',name:'Hidden Hero',icon:'❔',secret:true}
  ],
  isClassUnlocked:id=>id!=='hidden',
  isDone:entry=>entry.id==='road-one',
  descriptionFor:entry=>`Condition for ${entry.id}.`,
  heroMasteryEntries:id=>id==='ranger'?[{id:'hero-talent:ranger:one',name:'Crownshot',description:'Unlocks a Ranger talent.',done:true}]:[],
  getOpenState:()=>savedOpen,
  setOpenState:(id,open)=>{savedOpen[id]=open;}
});

const model=achievements.viewModel();
assert.equal(model.owner,'ui/achievements');
assert.equal(model.groups.length,3,'the Trophy UI renders registry hierarchy groups except hero-mastery');
assert.equal(model.groups.find(group=>group.groupId==='roads').done,1);
assert.equal(model.groups.find(group=>group.groupId==='secrets').entries[0].name,'???','secret cards stay secret-safe');
assert.equal(model.heroes.find(group=>group.heroId==='hidden').hidden,true,'secret locked heroes remain unrevealed');
assert.equal(model.heroMastery.total,2,'hero milestones and mastery talent entries are combined by the UI owner');
assert.equal(sandbox.window.DiceboundAchievementsUiTest.render().at(-1).subgroups,2);

assert.match(source,/data-achievements-done/,'Trophy destination must own a semantic Done control');
assert.match(source,/achievements-chrome\{position:sticky/,'Done header must be sticky panel chrome');
assert.match(source,/function createDetails\(/,'hierarchy DOM ownership must be local to the UI module');
assert.doesNotMatch(source,/achievementGrid|achievementCloseBtn|MutationObserver/,'new Trophy UI must not depend on retired popup controls or observers');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
const stylesheet=fs.readFileSync(path.join(root,'runtime/css/dicebound.css'),'utf8');
assert.match(monolith,/function renderAchievements\(\)\{return dbAchievementsUi\.render\(\);\}/,'monolith must retain only the thin Achievements lifecycle adapter');
for(const retired of ['renderAchievements=function','renderAchievementsV','achievementGrid','achievementCloseBtn','DiceboundAchievementHierarchyTest','db064RenderAchievementsBase'])assert(!monolith.includes(retired),`retired Achievements chain remains in dicebound.js: ${retired}`);
for(const retiredStyle of ['.achievement-grid{','.achievement-group{','.achievement.secret-locked{'])assert(!stylesheet.includes(retiredStyle),`retired Achievements style remains in shared CSS: ${retiredStyle}`);

console.log('Achievements UI owner PASS: secret-safe hierarchy, persistent dismissal contract and monolith drain guards');
