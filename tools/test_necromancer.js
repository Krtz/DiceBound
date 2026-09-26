"use strict";

const fs=require("fs");
const path=require("path");
const vm=require("vm");
const assert=require("node:assert/strict");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/classes/necromancer.js"),"utf8");
let installed=null;
const context={
  window:{
    DiceboundClasses:{
      _installNecromancer(owner){installed=owner;}
    }
  },
  console
};
vm.createContext(context);
vm.runInContext(source,context,{filename:"classes/necromancer.js"});
const necro=context.window.DiceboundNecromancer;
assert(necro&&installed===necro,"Necromancer owner must install through the Classes facade");

const player={
  classId:"necromancer",hp:100,maxHp:100,attack:20,defense:9,
  mana:80,maxMana:110,maxActiveAllies:2,graveCount:0,graveCountThreshold:5,
  guardCooldown:0,combatActionCount:0
};
let busy=false,turn=7,enemyResponseCalls=0,heroDeathCalls=0;
let enemies=[{id:"a",name:"A",hp:100,maxHp:100},{id:"b",name:"B",hp:100,maxHp:100}];
let allies=[];
let history=[],combatText="",effects=[],spawned=[],allyAttacks=[],heroDamage=0,allyDamage=0,enemyDamage=0;

function livingEnemies(){return enemies.filter(enemy=>enemy.hp>0);}
function spawnAlly(spec){
  let replaced=null;
  if(allies.length>=player.maxActiveAllies)replaced=allies.shift();
  const entity={...spec,instanceId:"ally-"+(spawned.length+1)};
  allies.push(entity);spawned.push(entity);
  return {entity,replaced,reason:replaced?"replaced-oldest":"spawned"};
}
function damageEnemy(enemy,amount){
  const dealt=Math.min(enemy.hp,Math.max(0,Math.round(amount)));
  enemy.hp-=dealt;enemyDamage+=dealt;return dealt;
}
function damageAlly(instanceId,amount){
  const target=allies.find(entity=>entity.instanceId===instanceId);
  if(!target)return {total:0,hp:0,defeated:false};
  const dealt=Math.min(target.hp,Math.max(0,Math.round(amount)));
  target.hp-=dealt;allyDamage+=dealt;
  return {total:dealt,hp:dealt,defeated:target.hp<=0};
}
function damageHero(amount){
  const dealt=Math.min(player.hp,Math.max(0,Math.round(amount)));
  player.hp-=dealt;heroDamage+=dealt;
  return {total:dealt,hp:dealt};
}

necro.configure({
  getPlayer:()=>player,
  isActive:id=>id==="necromancer"&&player.classId==="necromancer",
  getCombatBusy:()=>busy,
  setCombatBusy:value=>{busy=!!value;},
  getEncounterTurn:()=>turn,
  getCurrentEnemy:()=>livingEnemies()[0]||null,
  getCurrentEnemies:()=>enemies,
  livingEnemies,
  selectEnemy:()=>{},
  spawnAlly,
  livingAllies:()=>allies.filter(entity=>entity.hp>0),
  damageEnemy,
  damageAlly,
  damageHero,
  allyBasicAttack:async(entity,options={})=>{
    allyAttacks.push({entity:{...entity},options:{...options}});
    return {total:Math.round((entity.attack||1)*(options.multiplier||1)),hits:1,kills:0};
  },
  graveCoil:async()=>({kind:"grave-coil"}),
  summonAction:async()=>necro.summonSkeleton(),
  ultimateAction:async()=>necro.armyOfTheDead(),
  resolveEnemyResponse:async()=>{enemyResponseCalls++;busy=false;},
  handleHeroDeath:()=>{heroDeathCalls++;},
  setCombatText:text=>{combatText=text;},
  addCombatHistory:text=>history.push(text),
  updateCombatUI:()=>{},
  playEffect:async(key)=>{effects.push(key);return true;},
  delay:async()=>{}
});

const spec=necro.skeletonSpec();
assert.equal(spec.maxHp,38,"Skeleton HP must snapshot 8 + 30% hero max HP");
assert.equal(spec.attack,9,"Skeleton Attack must snapshot 2 + 35% hero Attack");
assert.equal(spec.defense,3,"Skeleton Defense must snapshot 1 + floor(33% hero Defense)");
assert.equal(spec.crit,.05);
assert.equal(spec.dodge,.02);
assert.equal(spec.threatWeight,1);
assert.equal(spec.actsOnSummonTurn,true);
assert.equal(spec.controlMode,"automatic");
assert.equal(spec.persistence,"encounter");
assert.equal(spec.onDeathId,"necromancer:bone-shrapnel");

(async()=>{
  const first=await necro.summonSkeleton();
  assert.equal(first.ok,true);
  assert.equal(player.mana,40,"Summon Skeleton must spend exactly 40 Mana");
  assert.equal(player.graveCount,1,"qualifying summon must add one Grave Count");
  assert.equal(player.combatActionCount,1);
  assert.equal(spawned.length,1);
  assert.equal(enemyResponseCalls,1,"summon action must enter the normal response cadence");
  assert(effects.includes("summonCircle"),"Summon Skeleton must play authored summon VFX");

  // Second and third summons prove Necromancer delegates FIFO semantics to the ally owner.
  busy=false;player.mana=100;
  await necro.summonSkeleton();
  busy=false;player.mana=100;
  const third=await necro.summonSkeleton();
  assert(third.replaced,"summoning at cap must report the replaced oldest ally");
  assert.equal(allies.length,2);
  assert.equal(player.graveCount,3);

  // Bone Shrapnel uses current hero Attack at death time: 20% enemies, 10% allied side.
  enemies=[{id:"c",name:"C",hp:50,maxHp:50},{id:"d",name:"D",hp:50,maxHp:50}];
  const dead={...allies[0],name:"Dead Skeleton",onDeathId:"necromancer:bone-shrapnel",hp:0};
  const survivor={...allies[1],instanceId:"survivor",name:"Survivor",hp:20,maxHp:20};
  allies=[dead,survivor];enemyDamage=0;allyDamage=0;heroDamage=0;player.hp=100;
  const shrapnel=necro.boneShrapnel(dead);
  assert.equal(shrapnel.triggered,true);
  assert.equal(enemyDamage,8,"20% of 20 Attack must deal 4 to each of two enemies");
  assert.equal(allyDamage,2,"10% of 20 Attack must deal 2 to each other living ally");
  assert.equal(heroDamage,2,"10% of 20 Attack must hit the hero");
  assert(effects.includes("boneShrapnel"),"Bone Shrapnel must play authored VFX");

  // Non-matching death hooks are ignored.
  const priorEnemyDamage=enemyDamage;
  assert.equal(necro.boneShrapnel({...dead,onDeathId:null}).triggered,false);
  assert.equal(enemyDamage,priorEnemyDamage);

  // Army with one living summon gets one 250% real strike + one 150% spectral strike.
  enemies=[{id:"e",name:"E",hp:500,maxHp:500}];
  allies=[{...spec,instanceId:"army-1",ownerClassId:"necromancer",hp:spec.maxHp}];
  player.graveCount=5;busy=false;allyAttacks=[];enemyResponseCalls=0;
  const army=await necro.armyOfTheDead();
  assert.equal(army.ok,true);
  assert.equal(allyAttacks.length,2);
  assert.equal(allyAttacks[0].options.multiplier,2.5);
  assert.equal(allyAttacks[0].options.spectral,undefined);
  assert.equal(allyAttacks[1].options.multiplier,1.5);
  assert.equal(allyAttacks[1].options.spectral,true);
  assert.equal(allyAttacks[1].entity.name,"Spectral Skeleton");
  assert.equal(player.graveCount,0,"Army of the Dead must reset Grave Count");
  assert.equal(enemyResponseCalls,1);
  assert(effects.includes("graveBurst"),"Army of the Dead must play authored grave VFX");

  // Registry descriptors are stable and use the canonical Combat collaborators.
  player.graveCount=5;busy=false;player.mana=80;
  const actions=necro.actionDescriptors();
  assert.deepEqual(Array.from(actions,a=>a.id),["grave-coil","summon-skeleton","army-of-the-dead"]);
  assert.equal(actions[0].metadata.fixedSlot,"attack");
  assert.equal(actions[1].metadata.fixedSlot,"special");
  assert.equal(actions[2].metadata.fixedSlot,"ultimate");
  assert.equal(actions[1].cost().amount,40);
  assert.equal(actions[2].cost().amount,5);

  assert.equal(heroDeathCalls,0);
  console.log("Necromancer mechanics: PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});
