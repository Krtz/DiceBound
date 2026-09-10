"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/progression/class-unlock-rules.js"),"utf8");
const context=vm.createContext({window:{},console});
vm.runInContext(source,context,{filename:"class-unlock-rules.js"});
const R=context.window.DiceboundClassUnlockRules;
assert.ok(R,"class unlock rules owner did not publish");
assert.equal(R.apiVersion,2);
assert.ok(Object.isFrozen(R));
assert.deepEqual(Array.from(R.targetIds),["pokemontrainer","rogue","merchant","slime","vampire","invoker","dragoon"]);

const CLASS_IDS=["ranger","sorcerer","fighter","monk","clown","rouge","berserker","turtle","frog","d20","slime","vampire","ninja","ceo","merchant","cleric","paladin","beastmaster","rogue","bloodmage","summoner","pokemontrainer","alchemist","ouroboros","dragoon","invoker","slimerouge"];
const PET_IDS=["neutral","fire","ice","electric"];

function baseContext(overrides={}){
  const ctx={
    classIds:[...CLASS_IDS],
    persistedUnlocks:{},
    bloodmageUnlocked:false,
    prestigeCount:0,
    damageTaken:0,
    merchantKills:0,
    stats:{healingDone:0,highestGold:0,potionsUsed:0},
    storedHighestGold:0,
    highestGold:0,
    facts:{},
    petIds:[...PET_IDS],
    petLevels:Object.fromEntries(PET_IDS.map(id=>[id,1])),
    petUnlocked:Object.fromEntries(PET_IDS.map(id=>[id,false])),
    beastmasterNightmareBoard5:false,
    gameStarted:false,
    player:{gold:0,defense:0,doubleStrike:0,lifeSteal:0,crit:0,bossDamage:0},
    publicSlimeCandidateIds:["ranger","sorcerer","fighter","monk","clown","rouge","berserker","turtle","frog","slime","vampire","ninja","cleric","paladin","beastmaster","rogue","bloodmage","summoner","pokemontrainer","alchemist","dragoon","invoker","slimerouge"].filter(id=>id!=="slime"),
    hasBoardClear:()=>false,
  };
  return Object.assign(ctx,overrides);
}

// Persisted unlocks remain one-way and Bloodmage's legacy flag still counts.
assert.equal(R.isUnlocked("sorcerer",baseContext()),false);
assert.equal(R.isUnlocked("sorcerer",baseContext({persistedUnlocks:{sorcerer:true}})),true);
assert.equal(R.isUnlocked("bloodmage",baseContext({bloodmageUnlocked:true})),true);
assert.equal(R.isUnlocked("ranger",baseContext()),true);

// Final shipped base eligibility boundaries.
assert.equal(R.isUnlocked("rouge",baseContext({prestigeCount:9})),false);
assert.equal(R.isUnlocked("rouge",baseContext({prestigeCount:10})),true);
assert.equal(R.isUnlocked("berserker",baseContext({damageTaken:999})),false);
assert.equal(R.isUnlocked("berserker",baseContext({damageTaken:1000})),true);
assert.equal(R.isUnlocked("d20",baseContext({petLevels:{neutral:29}})),false);
assert.equal(R.isUnlocked("d20",baseContext({petLevels:{neutral:30}})),true);
assert.equal(R.isUnlocked("cleric",baseContext({stats:{healingDone:999,highestGold:0,potionsUsed:0}})),false);
assert.equal(R.isUnlocked("cleric",baseContext({stats:{healingDone:1000,highestGold:0,potionsUsed:0}})),true);
assert.equal(R.isUnlocked("paladin",baseContext({hasBoardClear:(id,board)=>board===3&&(id==="fighter"||id==="cleric")})),true);
assert.equal(R.isUnlocked("summoner",baseContext({petLevels:{neutral:10,fire:10,ice:10,electric:1}})),true);
assert.equal(R.isUnlocked("alchemist",baseContext({stats:{healingDone:0,highestGold:0,potionsUsed:14}})),false);
assert.equal(R.isUnlocked("alchemist",baseContext({stats:{healingDone:0,highestGold:0,potionsUsed:15}})),true);

// Dynamic-only classes remain persisted-only for ordinary isClassUnlocked calls.
for(const id of ["turtle","frog","ninja","ceo","ouroboros"]){
  assert.equal(R.isUnlocked(id,baseContext({gameStarted:true,player:{gold:0,defense:99,doubleStrike:9,lifeSteal:9,crit:9,bossDamage:9}})),false,`${id} became base-unlocked before dynamic commit`);
}

// 0.6.3.1 compound rules remain exact.
let facts=R.recordCombatFacts({}, {board:3,miniBoss:true});
assert.equal(R.isEligible("rogue",baseContext({facts,highestGold:4999})),false);
assert.equal(R.isEligible("rogue",baseContext({facts,highestGold:5000})),true);
facts=R.recordCombatFacts({}, {board:3,finalBoss:true});facts.maxLifesteal=1;
assert.equal(R.isEligible("vampire",baseContext({facts})),false);
facts.maxLifesteal=1.001;
assert.equal(R.isEligible("vampire",baseContext({facts})),true);
facts=R.recordCombatFacts({}, {merchantBoss:true});
assert.equal(R.isEligible("merchant",baseContext({facts})),true);
facts=R.recordCombatFacts({}, {board:4,miniBoss:true});
assert.equal(R.isEligible("dragoon",baseContext({facts})),true);
let mana={};for(let i=0;i<100;i++)mana=R.recordManaSpenderCast(mana,true);
assert.equal(R.isEligible("invoker",baseContext({facts:mana})),true);
for(const mode of ["normal","nightmare","hell"]){
  const ptFacts=R.recordCombatFacts({}, {board:5,finalBoss:true,classId:"beastmaster",mode});
  assert.equal(R.isEligible("pokemontrainer",baseContext({facts:ptFacts,petLevels:Object.fromEntries(PET_IDS.map(id=>[id,10]))})),true,`Pokemon Trainer failed ${mode}`);
}

// Slime counts final resolved/unlocked classes, including persisted secret IDs,
// exactly as the final 0.6.3.1 context builder did.
const slimeNine=baseContext({persistedUnlocks:Object.fromEntries(["sorcerer","fighter","monk","clown","turtle","frog","ninja","ceo"].map(id=>[id,true]))});
assert.equal(R.eligibleClassIds(slimeNine).length,9); // + always-unlocked Ranger
assert.equal(R.isUnlocked("slime",slimeNine),false);
slimeNine.persistedUnlocks.merchant=true;
assert.equal(R.eligibleClassIds(slimeNine).length,10);
assert.equal(R.isUnlocked("slime",slimeNine),true);

// Direct commits remain permissive for event-driven classes, while the seven
// 0.6.3.1 targets retain their eligibility gate.
assert.equal(R.mayCommitUnlock("fighter",baseContext()),true);
assert.equal(R.mayCommitUnlock("merchant",baseContext()),false);
assert.equal(R.mayCommitUnlock("merchant",baseContext({facts:{roadMerchantSecretBossDefeated:true}})),true);

// Observed Gold/Lifesteal only advances during a live run and never regresses.
let observed=R.recordObservedProgress(baseContext({gameStarted:false,storedHighestGold:50,facts:{maxLifesteal:.5},player:{gold:5000,lifeSteal:2}}));
assert.equal(observed.changed,false);assert.equal(observed.highestGold,50);assert.equal(observed.facts.maxLifesteal,.5);
observed=R.recordObservedProgress(baseContext({gameStarted:true,storedHighestGold:50,facts:{maxLifesteal:.5},player:{gold:5000,lifeSteal:2}}));
assert.equal(observed.changed,true);assert.equal(observed.highestGold,5000);assert.equal(observed.facts.maxLifesteal,2);

// Freeze the cumulative historical dynamic-attempt order. The commit callback
// intentionally re-checks mayCommitUnlock against live state, matching the thin
// runtime transaction adapter used after extraction.
const dynamicState={
  persistedUnlocks:{sorcerer:true,fighter:true,monk:true,clown:true},
  facts:{board3MinibossDefeated:true,board3BossDefeated:true,board4MinibossDefeated:true,beastmasterBoard5Cleared:true,roadMerchantSecretBossDefeated:true,maxLifesteal:2,manaSpenderCasts:100},
};
function dynamicContext(){return baseContext({
  persistedUnlocks:dynamicState.persistedUnlocks,
  facts:dynamicState.facts,
  prestigeCount:10,damageTaken:1000,merchantKills:5,
  stats:{healingDone:1000,highestGold:5000,potionsUsed:100},storedHighestGold:5000,highestGold:5000,
  petLevels:Object.fromEntries(PET_IDS.map(id=>[id,30])),petUnlocked:Object.fromEntries(PET_IDS.map(id=>[id,true])),
  beastmasterNightmareBoard5:true,gameStarted:true,
  player:{gold:5000,defense:41,doubleStrike:4,lifeSteal:2,crit:1.01,bossDamage:3},
  hasBoardClear:(id,board)=>board===3&&(id==="fighter"||id==="cleric"),
});}
const result=R.resolveDynamic({
  getContext:dynamicContext,
  unlock:id=>{
    const ctx=dynamicContext();
    if(dynamicState.persistedUnlocks[id]||!R.mayCommitUnlock(id,ctx))return false;
    dynamicState.persistedUnlocks[id]=true;return true;
  }
});
assert.deepEqual(Array.from(result.attempted),[
  "d20","turtle","frog","vampire","ninja","ceo","rouge","berserker","merchant","cleric","paladin","beastmaster","rogue","slime",
  "summoner","pokemontrainer","alchemist","ouroboros","ceo","alchemist","alchemist","alchemist","alchemist",
  "pokemontrainer","rogue","merchant","slime","vampire","invoker","dragoon"
]);
for(const id of ["d20","turtle","frog","vampire","ninja","ceo","rouge","berserker","merchant","cleric","paladin","beastmaster","rogue","slime","summoner","pokemontrainer","alchemist","ouroboros","invoker","dragoon"]){
  assert.equal(dynamicState.persistedUnlocks[id],true,`${id} did not commit in full dynamic scan`);
}

console.log("Class unlock resolution contract preserved");
