#!/usr/bin/env node
/* Deterministic contract for canonical achievement facts and prerequisite copy. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const registrySource=fs.readFileSync(path.join(root,'runtime/js/progression/achievements.js'),'utf8');
const progressionSource=fs.readFileSync(path.join(root,'runtime/js/progression/lifecycle.js'),'utf8');
const sandbox={window:{DiceboundPrestige:{award:value=>value}},console,Object,Array,Number,String,Math,Set,Map,JSON,RegExp};
sandbox.window.window=sandbox.window;
vm.createContext(sandbox);
vm.runInContext(registrySource,sandbox,{filename:'achievements.js'});
vm.runInContext(progressionSource,sandbox,{filename:'progression/lifecycle.js'});

const registry=sandbox.window.DiceboundAchievements.createRegistry();
registry.push({id:'secret-prereq',category:'secrets',name:'Hidden Name',condition:'merchantKills:1',secret:true,hierarchy:{group:'secrets'}});
const meta={
  board4Clears:0,board5Clears:0,merchantKills:0,
  stats:{boardClears:{},classMaxLevel:{},potionsUsed:0,healingDone:0,highestGold:0},
  achievements:{},pets:{},prestige:{count:0},elementProgress:{},unlocks:{}
};
const classes={
  ranger:{id:'ranger',name:'Ranger'},fighter:{id:'fighter',name:'Fighter'},cleric:{id:'cleric',name:'Cleric'},paladin:{id:'paladin',name:'Paladin'}
};
const upgrades=[{id:'paladin-test',classId:'paladin',icon:'⚜️',name:'Oath Talent',achievementGate:'paladin_oath'}];
const gates={paladin_oath:{type:'achievements',requirements:['fighter-b3','cleric-b3']}};
function hasBoardClear(classId,board){
  return Object.entries(meta.stats.boardClears).some(([key,count])=>Number(count)>0&&[
    `${classId}:normal:b${board}`,`${classId}:nightmare:b${board}`,`${classId}:hell:b${board}`
  ].includes(key));
}

const progression=sandbox.window.DiceboundProgression.configure({
  getMeta:()=>meta,
  getPlayer:()=>({gold:0}),
  getAchievementRegistry:()=>registry,
  getPowerupGateRegistry:()=>gates,
  getClasses:()=>classes,
  getUpgrades:()=>upgrades,
  getElements:()=>({nature:{name:'Nature'}}),
  ensureAlphaMeta:()=>meta.stats,
  hasBoardClear,
  mythicalSetCount:()=>0,
  storageUnlocked:()=>false,
  getGameStarted:()=>false,
  getClassUnlockContext:()=>({}),
  classUnlockIsUnlocked:()=>false
});

meta.stats.boardClears['ranger:normal:b4']=1;
assert.equal(progression.achievementDone('road4'),true,'Fourth Road Conqueror must read the authoritative Board-clear ledger');
assert.equal(progression.achievementGateUnlocked('road4'),true,'direct achievement gates must share the same canonical Road 4 fact');
assert.equal(progression.achievementConditionText('road4'),'Clear Board 4.');

meta.stats.boardClears['ranger:hell:b5']=1;
assert.equal(progression.achievementDone('road5'),true,'Fifth Road Conqueror must read the authoritative Board-clear ledger');
assert.equal(progression.achievementDone('double-dice'),true,'Double Dice achievement must share the canonical Board 5 fact');
assert.equal(progression.achievementConditionText('road5'),'Clear Board 5.');

delete meta.stats.boardClears['ranger:normal:b4'];
meta.board4Clears=1;
assert.equal(progression.achievementDone('road4'),true,'historical board4Clears saves must remain readable at the migration boundary');
meta.board4Clears=0;

meta.stats.boardClears['fighter:normal:b3']=1;
meta.stats.boardClears['cleric:nightmare:b3']=1;
assert.equal(progression.achievementGateUnlocked('paladin_oath'),true,'multi-achievement gate must resolve through canonical achievement IDs');
assert.equal(
  progression.achievementGateConditionText('paladin_oath'),
  'Requires: Iron Through the Fracture · Faith Through the Fracture.',
  'non-secret prerequisite copy must name the actual achievements'
);
const mastery=progression.heroMasteryEntries('paladin')[0];
assert(mastery.description.includes('Iron Through the Fracture · Faith Through the Fracture'),'Hero Mastery copy must derive prerequisite names from canonical achievement data');
assert(!/listed (?:achievement|unlock)/i.test(mastery.description),'vague listed-achievement wording must not return');

assert.equal(progression.achievementGateConditionText('achievement:secret-prereq'),'Complete a hidden achievement prerequisite.');
assert(!progression.achievementGateConditionText('achievement:secret-prereq').includes('Hidden Name'),'locked secret prerequisite name must stay hidden');
meta.merchantKills=1;
assert.equal(progression.achievementGateConditionText('achievement:secret-prereq'),'Requires: Hidden Name.','completed secret prerequisite may reveal its canonical name');

assert(!registrySource.includes('"condition": "board4Clears"'),'retired Road 4 counter condition must stay out of the registry');
assert(!registrySource.includes('"condition": "board5Clears"'),'retired Road 5 counter condition must stay out of the registry');
assert(!progressionSource.includes("kind==='board4Clears'"),'retired Road 4 condition branch must stay out of progression');
assert(!progressionSource.includes("kind==='board5Clears'"),'retired Road 5 condition branch must stay out of progression');
assert(!progressionSource.includes('Complete the listed achievement condition.'),'vague achievement fallback must stay retired');
assert(!progressionSource.includes('Complete this hero’s listed unlock condition.'),'vague Hero Mastery fallback must stay retired');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
assert(!monolith.includes('road4:{type:"counter",field:"board4Clears"'),'Road 4 achievement gate must not retain shadow counter ownership in dicebound.js');
assert(monolith.includes('paladin_oath:{type:"achievements",requirements:["fighter-b3","cleric-b3"]}'),'Paladin prerequisite gate must reference canonical achievement IDs');

console.log('Achievement policy PASS: canonical Board clears, legacy read bridge, prerequisite names and secret-safe copy');
