#!/usr/bin/env node
"use strict";

const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const policySource=fs.readFileSync(path.join(root,"runtime/js/combat/strike-policy.js"),"utf8");
const source=fs.readFileSync(path.join(root,"runtime/js/combat/strike-resolution.js"),"utf8");
const window={window:null};window.window=window;
vm.runInNewContext(policySource,{window,console},{filename:"runtime/js/combat/strike-policy.js"});
vm.runInNewContext(source,{window,console},{filename:"runtime/js/combat/strike-resolution.js"});
const strikes=window.DiceboundCombatStrikeResolution,policy=window.DiceboundStrikePolicy;
assert.ok(strikes,"Combat strike-resolution owner is not public");
assert.equal(strikes.owner,"combat/strike-resolution");
assert.doesNotMatch(source,/\bMath\.random\b/,"strike owner must consume only injected game RNG");

function makeHarness(options={}){
  const calls=[],events=[];
  const player=Object.assign({
    classId:options.classId||"fighter",attack:10,defense:0,defenseAttackScale:0,gold:0,goldAttackScale:0,damageBonus:0,
    hp:100,maxHp:100,crit:0,doubleStrike:0,criticalEchoBonus:0,echoDamageScale:.70,classBurst:0,firstAttackBonus:0,berserk:0,
    elementalEnemyDamage:0,bossDamage:0,execute:0,poisonOnHitChance:0,lifeSteal:0,packDamageBonus:0,equipment:{},
    combatAttackCount:0,ultimateCharge:0,fighterCounterReady:false,fighterCounterStacks:0,fighterCounterPowerBonus:0,
    turtleCrushReady:false,turtleGuardChain:0,rangerMarkMax:3,ninjaSmoke:0,ninjaSmokeNeed:3,_ninjaExecution:false,
    _db060EchoChamberActive:false,_db060IronEchoDefense:0
  },options.player||{});
  const enemies=options.enemies||[{name:"Dummy",hp:100,maxHp:100,defense:0,dodge:0,affinity:null,poisonStacks:0,rangerMarks:0,weakness:"fire"}];
  const active=id=>player.classId===id;
  const randomValues=[...(options.randomValues||[])];
  let randomIndex=0,fastCap=options.fastCap||0,v26Fast=!!options.v26Fast;
  const random=()=>{
    const value=randomValues.length?randomValues.shift():(options.randomDefault??.99);
    randomIndex++;calls.push(["random",value]);return value;
  };
  const rand=(min,max)=>{
    const raw=random(),value=Math.floor(raw*(max-min+1))+min;
    calls.push(["rand",min,max,value]);return value;
  };
  const pick=items=>{
    if(!items?.length)return undefined;
    const raw=random(),index=Math.min(items.length-1,Math.floor(raw*items.length)),value=items[index];
    calls.push(["pick",index,value]);return value;
  };
  const rollTieredProc=chance=>{
    const guaranteed=Math.floor(Math.max(0,chance)),fraction=Math.max(0,chance-guaranteed),roll=random(),result=guaranteed+(roll<fraction?1:0);
    calls.push(["tiered",chance,result]);return result;
  };
  const living=()=>enemies.filter(enemy=>enemy.hp>0);
  const legendary=new Set(options.legendary||[]);
  const runtime={
    getPlayer:()=>player,
    getEncounterLead:()=>options.lead||enemies[0]||null,
    livingEnemies:living,
    isClassActive:active,
    random,rand,pick,
    clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
    rollTieredProc,
    resolveCriticalTiers:(roller,opts)=>policy.resolveCriticalTiers(roller,opts),
    rangerMarkTotal:(before,opts)=>policy.rangerMarkTotal(before,opts),
    setDamageBonus:()=>options.setDamageBonus||0,
    petDamage:()=>options.petDamage||8,
    healPlayer:amount=>{const healed=Math.min(player.maxHp-player.hp,Math.max(0,Math.round(amount||0)));player.hp+=healed;calls.push(["heal",healed]);return healed;},
    damageEnemy:(enemy,amount,ignoreDefense=false)=>{
      let raw=amount;if(player._ninjaExecution){raw*=1.65;ignoreDefense=true;}
      const dealt=Math.min(enemy.hp,Math.max(0,Math.round(raw)));enemy.hp-=dealt;calls.push(["damage",enemy.name,dealt,!!ignoreDefense,!!player._ninjaExecution]);return dealt;
    },
    animateClassAttack:async mode=>{calls.push(["animate",mode]);},
    playElementAnimation:(key,target)=>{calls.push(["element-animation",key,target?.name]);},
    addCombatHistory:text=>{calls.push(["history",text]);},
    updateCombatUI:()=>{calls.push(["ui"]);},
    setCombatText:text=>{calls.push(["text",text]);},
    playHolySfx:()=>{calls.push(["holy"]);},
    triggerStrikeElements:(target,chaos)=>{calls.push(["strike-elements",target?.name,chaos?.roll||0]);return {totalDamage:options.elementDamage||0,message:options.elementMessage||""};},
    triggerElementEffect:(key,target,opts)=>{calls.push(["forced-element",key,target?.name,opts?.source]);return {totalDamage:0,message:""};},
    identityFlash:text=>{calls.push(["flash",text]);},
    reconcileDefeatedTarget:(target,reason)=>{calls.push(["reconcile",target?.name,reason]);},
    presentationTargetSnapshot:()=>({selected:options.presentationTarget||"Dummy"}),
    emitStrike:result=>{events.push({...result,presentationTarget:{...result.presentationTarget}});calls.push(["emit",result.targetName,result.dealt]);},
    renderStrike:result=>{calls.push(["render",result.targetName,result.dealt]);},
    delay:async ms=>{calls.push(["delay",ms,"cap",fastCap,"v26",v26Fast]);},
    chargeUltimate:amount=>{player.ultimateCharge=Math.min(100,player.ultimateCharge+amount);calls.push(["charge",amount]);},
    hasDevilsHorns:()=>!!options.devilsHorns,
    hasLegendaryEffect:id=>legendary.has(id),
    syncOuroborosAttack:()=>{
      calls.push(["ouro-sync-attack",player.attack,player.doubleStrike]);
      if(!active("ouroboros"))return;
      const base=legendary.has("perfect_specimen")?30:10,delta=(Number(player.attack)||0)-base;
      if(legendary.has("perfect_specimen")){
        if(delta>0){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=30;}
        else if(player.attack<30)player.attack=30;
      }else if(Math.abs(delta)>.0001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=10;}
    },
    syncOuroborosEconomy:()=>{calls.push(["ouro-sync-economy",player.attack,player.doubleStrike]);if(typeof options.syncOuroborosEconomy==="function")options.syncOuroborosEconomy(player);},
    getFastEchoCap:()=>fastCap,
    setFastEchoCap:value=>{fastCap=value;calls.push(["fast-cap",value]);},
    getV26FastEcho:()=>v26Fast,
    setV26FastEcho:value=>{v26Fast=!!value;calls.push(["v26-fast",!!value]);},
    getElementKeys:()=>["fire","ice","electric","nature","light","void","donut","tech","metal","coffee"]
  };
  strikes.configure(runtime);
  return {player,enemies,calls,events,living,randomIndex:()=>randomIndex,fastCap:()=>fastCap,v26Fast:()=>v26Fast,runtime};
}

(async()=>{
  {
    const h=makeHarness({randomValues:[.9,.3]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.dealt,10);
    assert.equal(result.critTiers,0);
    assert.equal(h.randomIndex(),2,"ordinary strike must retain one Crit-tier RNG draw plus base rand draw");
    assert.deepEqual(h.calls.filter(c=>c[0]==="delay").map(c=>c[1]),[460]);
    assert.equal(h.events.length,1);
  }
  {
    const h=makeHarness({player:{criticalEchoBonus:1},randomValues:[.9,.3]});
    const result=await strikes.performStrike(h.enemies[0],{echo:true,index:1,canCrit:false});
    assert.equal(result.critTiers,0,"Echo canCrit:false must still suppress Crit tiers");
    assert.equal(result.dealt,14,"historical wrapper argument loss must retain criticalEchoBonus damage scaling on non-critical Echoes");
    assert.equal(h.randomIndex(),2);
  }
  {
    const target={name:"Quarry",hp:500,maxHp:500,defense:0,dodge:0,affinity:null,poisonStacks:0,rangerMarks:2,weakness:"fire"};
    const h=makeHarness({classId:"ranger",player:{rangerMarkMax:5},enemies:[target],randomValues:[.9,.3,.9,.3]});
    await strikes.performStrike(target);
    assert.equal(target.rangerMarks,3);
    await strikes.performStrike(target,{echo:true,index:1,canCrit:false});
    assert.equal(target.rangerMarks,4,"each landed Echo must establish exactly one Ranger Mark");
  }
  {
    const h=makeHarness({classId:"fighter",player:{fighterCounterReady:true,fighterCounterStacks:2,fighterCounterPowerBonus:.20},randomValues:[.9,.3]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.dealt,18,"stored Counterblow + Endless Form bonus must preserve additive temporary damageBonus ordering");
    assert.equal(h.player.fighterCounterStacks,1);
    assert.equal(h.player.fighterCounterReady,false);
    assert.ok(Math.abs(h.player.damageBonus)<1e-12,"temporary Fighter bonuses must fully restore apart from floating-point dust");
  }
  {
    const h=makeHarness({classId:"turtle",player:{turtleCrushReady:true,turtleGuardChain:3},randomValues:[.9,.3]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.dealt,15);
    assert.equal(h.player.turtleGuardChain,0);
    assert.equal(h.player.turtleCrushReady,false);
  }
  {
    const h=makeHarness({classId:"ninja",player:{ninjaSmoke:3,ninjaSmokeNeed:3},randomValues:[.9,.3,.9]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.dealt,17,"Smoke Execution must retain the historical 1.65x ignore-defense damage wrapper");
    assert.equal(h.player.ninjaSmoke,0);
    assert.equal(h.player._ninjaExecution,false);
    assert.ok(h.calls.some(c=>c[0]==="damage"&&c[4]===true));
  }
  {
    const h=makeHarness({classId:"ninja",player:{crit:2,ninjaSmoke:0,ninjaSmokeNeed:3},randomValues:[.8,.3,.8]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.critTiers,2);
    assert.equal(h.player.ninjaSmoke,2,"final V28 Smoke owner must grant one Smoke per critical tier");
  }
  {
    const h=makeHarness({player:{poisonOnHitChance:2.4},randomValues:[.9,.3,.2]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.poisonApplied,0,"legacy base poison result field stays zero under V25 overflow ownership");
    assert.equal(h.enemies[0].poisonStacks,3);
    assert.equal(h.randomIndex(),3);
    const delayIndex=h.calls.findIndex(c=>c[0]==="delay"&&c[1]===460),poisonRollIndex=h.calls.findIndex(c=>c[0]==="tiered"&&c[1]===2.4);
    assert.ok(delayIndex>=0&&poisonRollIndex>delayIndex,"tiered Poison RNG must remain after core strike presentation delay");
  }
  {
    const h=makeHarness({devilsHorns:true,player:{poisonOnHitChance:1.5},randomValues:[.9,.3,.001,.1]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(h.enemies[0].hp,0,"Devil's Horns instant kill must resolve before tiered Poison");
    assert.equal(h.enemies[0].poisonStacks,0,"dead Horns target must not receive the later Poison roll");
    assert.equal(h.randomIndex(),3,"Poison RNG must short-circuit after Horns kills the target");
    assert.equal(result.dealt,100);
    assert.equal(h.events[0].dealt,10,"combat:strike event must remain emitted before the post-strike Horns mutation");
    assert.equal(h.events[0].targetHp,90);
  }
  {
    const target={name:"Dodger",hp:100,maxHp:100,defense:0,dodge:.5,affinity:null,poisonStacks:0,rangerMarks:0,weakness:"fire"};
    const h=makeHarness({enemies:[target],legendary:["elemental_roulette"],randomValues:[.1,.25]});
    const result=await strikes.performStrike(target);
    assert.equal(result.dodged,true);
    assert.equal(h.player.combatAttackCount,1);
    assert.equal(h.randomIndex(),2,"Dodge must be first RNG draw; Elemental Roulette pick remains the only post-dodge draw");
    assert.equal(h.events.length,0,"dodged strikes must continue bypassing combat:strike emission");
    assert.ok(h.calls.some(c=>c[0]==="forced-element"&&c[3]==="Elemental Roulette"),"Elemental Roulette historically still fires after a dodge");
    assert.deepEqual(h.calls.filter(c=>c[0]==="delay").map(c=>c[1]),[220]);
  }
  {
    const h=makeHarness({player:{hp:50,maxHp:100,lifeSteal:.5},elementDamage:10,randomValues:[.9,.3]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.dealt,10);
    assert.equal(result.elementDamage,10);
    assert.equal(result.heal,10,"lifesteal must continue using physical + elemental strike damage");
    assert.equal(h.player.hp,60);
  }
  {
    const h=makeHarness({classId:"ouroboros",player:{attack:20,doubleStrike:12},fastCap:7,randomValues:[.9,.3]});
    await strikes.performStrike(h.enemies[0]);
    assert.equal(h.fastCap(),7,"Ouroboros fast-Echo cap must restore after the strike");
    assert.equal(h.v26Fast(),false);
    assert.equal(h.player.attack,10,"V26 Ouroboros strike wrapper must retain its historical attack reset");
    assert.equal(h.player.doubleStrike,13,"Ouroboros attack currency conversion must preserve the existing 10% Echo conversion");
    assert.deepEqual(h.calls.filter(c=>c[0]==="fast-cap").map(c=>c[1]),[32,7]);
    assert.deepEqual(h.calls.filter(c=>c[0]==="v26-fast").map(c=>c[1]),[true,false]);
    const coreDelay=h.calls.find(c=>c[0]==="delay"&&c[1]===460);assert.equal(coreDelay[3],32);assert.equal(coreDelay[5],true);
  }
  {
    const h=makeHarness({classId:"sorcerer",player:{classBurst:1},legendary:["twin_surge"],randomValues:[.9,.3,.1]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.burst,"Twin Arcane Surge! ");
    assert.equal(result.dealt,22,"Twin Surge must mutate returned dealt total after repeating the first 70%-scaled hit");
    assert.equal(h.events[0].dealt,11,"combat:strike event must retain the pre-repeat dealt value");
    assert.deepEqual(h.calls.filter(c=>c[0]==="delay").map(c=>c[1]),[460,160]);
  }
  {
    const h=makeHarness({player:{crit:1.5,doubleStrike:.2},legendary:["echo_chamber"],randomValues:[.9,.3]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.critTiers,0,"direct strike Echo Chamber fallback must suppress Crit while active");
    assert.equal(h.player.crit,1.5);assert.equal(h.player.doubleStrike,.2,"Echo Chamber temporary conversion must restore exact stats");
  }
  {
    const h=makeHarness({player:{crit:1,defense:4},legendary:["critical_feedback","iron_echo"],randomValues:[.8,.3]});
    const result=await strikes.performStrike(h.enemies[0],{echo:true,index:1,canCrit:true});
    assert.equal(result.critTiers,1);
    assert.equal(h.player.ultimateCharge,8);
    assert.equal(h.player.defense,5);
    assert.equal(h.player._db060IronEchoDefense,1);
  }
  {
    const h=makeHarness({player:{execute:1},enemies:[{name:"Execute",hp:20,maxHp:100,defense:0,dodge:0,affinity:null,poisonStacks:0,rangerMarks:0,weakness:"fire"}],randomValues:[.9,.3]});
    const result=await strikes.performStrike(h.enemies[0]);
    assert.equal(result.executed,true);assert.equal(result.dealt,20);assert.equal(h.enemies[0].hp,0);
    assert.ok(h.calls.some(c=>c[0]==="reconcile"&&c[2]==="strike"));
  }

  console.log("Combat strike-resolution owner PASS: base/Echo damage, Crit tiers, Marks, Counter/Shell, Smoke, Poison, Dodge, Horns, Ouroboros, lifesteal and Legendary ordering are deterministic");
})().catch(error=>{console.error(error);process.exitCode=1;});

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "let dbCombatStrikes=null;",
  "return dbCombatStrikes.strikeBaseDamage(...args);",
  "return dbCombatStrikes.performStrike(...args);",
  "const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;",
  "dbCombatStrikes=dbCombatStrikeOwner.configure({"
])assert.ok(monolith.includes(adapter),`missing strike-resolution composition adapter: ${adapter}`);
for(const retired of [
  "strikeBaseDamageV13","strikeBaseDamageV15","strikeBaseDamageV26OuroBase","db060StrikeBaseDamageBase",
  "performStrikeV13","performStrikeV16Base","performStrikeV17Base","performStrikeV18Base","performStrikeV24Base","performStrikeV25PoisonBase",
  "performStrikeV26SpeedBase","performStrikeV27SpeedDodgeBase","performStrikeV28SmokeBase","performStrikeBeta04Base","db060PerformStrikeBase"
])assert.ok(!monolith.includes(retired),`retired strike ownership remains in monolith: ${retired}`);
assert.equal((monolith.match(/function strikeBaseDamage\(/g)||[]).length,1,"monolith should retain exactly one thin strikeBaseDamage adapter");
assert.equal((monolith.match(/async function performStrike\(/g)||[]).length,1,"monolith should retain exactly one thin performStrike adapter");
assert.doesNotMatch(monolith,/^\s*strikeBaseDamage\s*=\s*function/m,"strikeBaseDamage reassignment ladder must be gone");
assert.doesNotMatch(monolith,/^\s*performStrike\s*=\s*async function/m,"performStrike reassignment ladder must be gone");
