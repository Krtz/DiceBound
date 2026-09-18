#!/usr/bin/env node
"use strict";

const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/combat/turn-resolution.js"),"utf8");
const window={window:null};window.window=window;
vm.runInNewContext(source,{window,console},{filename:"runtime/js/combat/turn-resolution.js"});
const turns=window.DiceboundCombatTurnResolution;
assert.ok(turns,"Combat turn-resolution owner is not public");
assert.equal(turns.owner,"combat/turn-resolution");
assert.doesNotMatch(source,/\bMath\.random\b/,"turn orchestration must consume only the injected game RNG");

function makeHarness(options={}){
  const calls=[];
  let damageTaken=0,turn=options.turn||0,busy=options.busy??true;
  const player=Object.assign({
    hp:100,maxHp:100,energyShield:0,equipment:{},combatShield:0,flatReduction:0,guardPower:.5,defense:0,thorns:0,gold:0,
    ultimateCharge:0,mythicAmuletUsed:false,omegaRingUsed:false,hasteTurns:0,hasteCooldown:0,_db046HasteLocked:false,_db047HastePrimed:false,
    db0511BurnStacks:0,db0511PoisonStacks:0,db0511PoisonPower:.12,_db0511SkipAction:"",_db0511SuppressControlProc:false,
    devilBurnStacks:0,dragoonAirborneResponses:0,dragoonLandingReady:false
  },options.player||{});
  const enemies=options.enemies||[{name:"Dummy",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0}];
  let selected=options.selected??0;
  const living=()=>enemies.filter(enemy=>enemy.hp>0);
  const randomValues=[...(options.randomValues||[])];
  const runtime={
    guardianSpecialInterval:5,
    getPlayer:()=>player,
    getCurrentEnemy:()=>enemies[selected]||null,
    getCurrentEnemies:()=>enemies,
    getEncounterLead:()=>options.lead||enemies[0]||null,
    getEncounterTurn:()=>turn,
    setEncounterTurn:value=>{turn=value;},
    setCombatBusy:value=>{busy=value;calls.push(["busy",value]);},
    livingEnemies:living,
    selectEnemy:index=>{selected=index;calls.push(["select",index]);},
    random:()=>{const value=randomValues.length?randomValues.shift():(options.randomDefault??.99);calls.push(["random",value]);return value;},
    rand:(min,max)=>{const value=options.randValue??0;calls.push(["rand",min,max,value]);return value;},
    clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
    delay:async ms=>{calls.push(["delay",ms]);},
    petTurn:async()=>{calls.push(["pet"]);},
    applyPoisonTick:()=>{calls.push(["poison-tick"]);return 0;},
    winCombat:()=>{calls.push(["win"]);return "win";},
    handlePlayerDeath:()=>{calls.push(["death"]);return "death";},
    setCombatText:(text,...args)=>{calls.push(["text",text,...args]);},
    updateCombatUI:()=>{calls.push(["ui"]);},
    addCombatHistory:text=>{calls.push(["history",text]);},
    renderEnemyParty:()=>{calls.push(["render-enemies"]);},
    triggerElementEffect:(key,target,opts)=>{calls.push(["element",key,target?.name,opts?.source]);return {message:`${key} proc`};},
    defenseDamageReduction:()=>{calls.push(["defense-seen",player.defense]);return options.defenseReduction??0;},
    effectiveDodgeChance:()=>options.dodgeChance??0,
    enemyElementProc:enemy=>{calls.push(["enemy-proc",enemy.name]);if(options.queueSkip&&!player._db0511SuppressControlProc)player._db0511SkipAction=options.queueSkip;return "";},
    damageEnemy:(enemy,amount)=>{const dealt=Math.min(enemy.hp,Math.max(0,Math.round(amount)));enemy.hp-=dealt;calls.push(["damage-enemy",enemy.name,dealt]);return dealt;},
    healPlayer:amount=>{const healed=Math.min(player.maxHp-player.hp,Math.max(0,Math.round(amount)));player.hp+=healed;calls.push(["heal",healed]);return healed;},
    mythicalSetCount:()=>options.mythicalSetCount||0,
    guardianSpecialMultiplier:()=>options.guardianSpecialMultiplier??1,
    hasMythicPiece:slot=>!!options.mythicPieces?.includes(slot),
    hasDevilsHorns:()=>!!options.devilsHorns,
    hasHeadphones:()=>!!options.headphones,
    hasLegendaryEffect:id=>id==="glass_fortress"&&!!options.glassFortress,
    checkDynamicClassUnlocks:()=>{calls.push(["unlock-check"]);},
    saveMeta:()=>{calls.push(["save"]);},
    playHitSfx:()=>{calls.push(["hit-sfx"]);},
    recordDamageTaken:amount=>{damageTaken+=amount;calls.push(["damage-taken",amount]);},
    wolfEchoChance:()=>options.wolfEchoChance||0,
    presentEnemyAttack:async fact=>{calls.push(["attack-presentation",JSON.parse(JSON.stringify(fact))]);return fact;},
    dodge:unit=>{calls.push(["dodge",unit]);return true;},
    dragoonActive:()=>!!options.dragoon
  };
  turns.configure(runtime);
  return {player,enemies,calls,turn:()=>turn,busy:()=>busy,damageTaken:()=>damageTaken,runtime};
}

(async()=>{
  {
    const h=makeHarness({player:{hasteCooldown:3},enemies:[{name:"Frozen",hp:100,maxHp:100,attack:10,defense:0,skipTurns:1,freezeCooldown:1,lifeSteal:0}]});
    await turns.resolveEnemyResponse(false,.75);
    assert.equal(h.player.hasteCooldown,0,"legacy non-Haste response must retain the composed three-step cooldown decay");
    assert.equal(h.enemies[0].freezeCooldown,0,"freeze resistance must tick before the response");
    assert.equal(h.enemies[0].skipTurns,0,"all-frozen pack must consume its frozen turn without attacking");
    assert.deepEqual(h.calls.filter(call=>call[0]==="delay").map(call=>call[1]),[260],"frozen response timing must stay exact");
    assert.equal(h.damageTaken(),0);
  }
  {
    const h=makeHarness({player:{hasteTurns:1,hasteCooldown:0}});
    await turns.resolveEnemyResponse(false);
    assert.equal(h.player.hasteTurns,0,"one Haste response must be consumed exactly once");
    assert.equal(h.player.hasteCooldown,2,"composed anti-lock layers must leave the existing two-response cooldown");
    assert.ok(h.calls.some(call=>call[0]==="text"&&/Haste/.test(call[1])));
    assert.equal(h.damageTaken(),0);
  }
  {
    const h=makeHarness();
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,90,"ordinary enemy turn must preserve incoming damage");
    assert.equal(h.damageTaken(),10);
    assert.equal(h.turn(),1);
    assert.equal(h.calls.filter(call=>call[0]==="hit-sfx").length,1,"a landed hit keeps hit presentation");
    const attacks=h.calls.filter(call=>call[0]==="attack-presentation").map(call=>call[1]);
    assert.equal(attacks.length,1);assert.equal(attacks[0].attackId,"basic-attack");assert.equal(attacks[0].enemyIndex,0);assert.equal(attacks[0].outcome,"hit");
    assert.deepEqual(h.calls.filter(call=>call[0]==="delay").map(call=>call[1]),[980]);
  }
  {
    const h=makeHarness({dodgeChance:1,randomValues:[0]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100,"ordinary successful Dodge must prevent damage");
    assert.deepEqual(h.calls.filter(call=>call[0]==="dodge"),[["dodge","player"]]);
    assert.equal(h.calls.filter(call=>call[0]==="hit-sfx").length,0,"pure Dodge must not also play a hit SFX");
    assert.equal(h.calls.filter(call=>call[0]==="damage-taken").length,0);
    assert.equal(h.calls.filter(call=>call[0]==="attack-presentation")[0][1].outcome,"dodged","the attack attempt must still present when the player dodges");
  }
  {
    const hydra={name:"Nullstar Hydra",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0};
    const h=makeHarness({dodgeChance:1,randomValues:[0,0,0],enemies:[hydra]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100);
    assert.equal(h.calls.filter(call=>call[0]==="dodge").length,3,"each independently dodged multi-hit strike retriggers generic Dodge");
    assert.equal(h.calls.filter(call=>call[0]==="rand").length,0,"dodged hits consume no damage-variance RNG");
    const hydraAttacks=h.calls.filter(call=>call[0]==="attack-presentation").map(call=>call[1]);
    assert.equal(hydraAttacks.length,3,"multi-hit enemies must animate every resolved strike");
    assert.deepEqual(hydraAttacks.map(fact=>fact.hitIndex),[1,2,3]);
    assert.ok(hydraAttacks.every(fact=>fact.attackId==="hydra-heads"&&fact.hitCount===3&&fact.outcome==="dodged"));
  }
  {
    const h=makeHarness({dodgeChance:1,randomValues:[0,0],enemies:[
      {name:"First Enemy",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0},
      {name:"Second Enemy",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0}
    ]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100);
    assert.equal(h.calls.filter(call=>call[0]==="dodge").length,2,"every dodging enemy attack in a pack uses the same generic route");
    assert.deepEqual(h.calls.filter(call=>call[0]==="attack-presentation").map(call=>call[1].enemyIndex),[0,1],"pack presentation must identify the actual attacking unit");
  }
  {
    const h=makeHarness({enemies:[
      {name:"First Enemy",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0},
      {name:"Second Enemy",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0}
    ]});
    await turns.enemyTurn(false,0);
    const turnTexts=h.calls.filter(call=>call[0]==="text"&&/First Enemy|Second Enemy/.test(call[1])).map(call=>call[1]);
    assert.equal(turnTexts.length,2,"each living enemy must present its own turn instead of one pack summary");
    assert.match(turnTexts[0],/First Enemy/);assert.doesNotMatch(turnTexts[0],/Second Enemy/);
    assert.match(turnTexts[1],/Second Enemy/);assert.doesNotMatch(turnTexts[1],/First Enemy/);
    assert.deepEqual(h.calls.filter(call=>call[0]==="delay").map(call=>call[1]),[980,980],"individual enemy presentation must retain the established per-turn dwell time");
    assert.equal(h.player.hp,80,"individual presentation must not change incoming damage");
  }
  {
    const h=makeHarness({glassFortress:true,player:{defense:10}});
    await turns.enemyTurn(false,0);
    assert.ok(h.calls.some(call=>call[0]==="defense-seen"&&call[1]===20),"Glass Fortress must double Defense during incoming resolution");
    assert.equal(h.player.defense,10,"Glass Fortress temporary Defense must always restore");
  }
  {
    const guardian={name:"Guardian",hp:100,maxHp:100,attack:10,defense:0,guardian:true,finalBoss:true,specialName:"Regression Special",lifeSteal:0};
    const h=makeHarness({turn:4,enemies:[guardian],lead:guardian});
    await turns.enemyTurn(false,0);
    assert.equal(h.turn(),5);
    const guardianAttack=h.calls.find(call=>call[0]==="attack-presentation")?.[1];
    assert.equal(guardianAttack?.attackId,"guardian-special");assert.equal(guardianAttack?.special,true);
    assert.equal(h.player.hp,77,"Guardian special must retain the 2.25x special base before mitigation");
    assert.ok(h.calls.some(call=>call[0]==="text"&&/Regression Special/.test(call[1])));
  }
  {
    const h=makeHarness({queueSkip:"❄️ Frozen by regression",enemies:[{name:"Controller",hp:100,maxHp:100,attack:1,defense:0,lifeSteal:0}]});
    await turns.enemyTurn(false,0);
    assert.equal(h.turn(),2,"queued control must cause exactly one additional enemy-pack turn");
    assert.equal(h.player.hp,98);
    assert.deepEqual(h.calls.filter(call=>call[0]==="delay").map(call=>call[1]),[980,620,980]);
    assert.equal(h.player._db0511SuppressControlProc,false);
  }
  {
    const h=makeHarness({dragoon:true,player:{dragoonAirborneResponses:1},enemies:[{name:"Ground Enemy",hp:100,maxHp:100,attack:999,defense:0,lifeSteal:0}]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100,"Airborne Dragoon must skip ordinary incoming attacks");
    assert.equal(h.player.dragoonAirborneResponses,0);
    assert.equal(h.player.dragoonLandingReady,true);
    assert.equal(h.turn(),1);
    assert.deepEqual(h.calls.filter(call=>call[0]==="delay").map(call=>call[1]),[420]);
  }
  {
    const wolf={name:"Road Wolf",hp:100,maxHp:100,attack:5,defense:0,skipTurns:1,lifeSteal:0};
    const h=makeHarness({enemies:[wolf],wolfEchoChance:1,randomValues:[.5,.5]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,95,"Wolf Echo must still resolve after the ordinary turn");
    assert.equal(h.damageTaken(),10,"historical Wolf Echo damageTaken double-recording is intentionally preserved by extraction");
    assert.deepEqual(h.calls.filter(call=>call[0]==="random").map(call=>call[1]),[.5,.5],"Wolf Echo must preserve chance-then-dodge RNG order");
    assert.equal(h.calls.find(call=>call[0]==="attack-presentation"&&call[1].attackId==="wolf-echo")?.[1].outcome,"hit","Wolf Echo must use the same semantic attack presentation route");
  }
  {
    const wolf={name:"Road Wolf",hp:100,maxHp:100,attack:5,defense:0,skipTurns:1,lifeSteal:0};
    const h=makeHarness({enemies:[wolf],wolfEchoChance:1,dodgeChance:1,randomValues:[.5,0]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100,"dodged Wolf Echo must deal no damage");
    assert.deepEqual(h.calls.filter(call=>call[0]==="dodge"),[["dodge","player"]],"Wolf Echo uses the generic Dodge route");
    assert.equal(h.calls.filter(call=>call[0]==="hit-sfx").length,0);
  }
  {
    const h=makeHarness({player:{hp:5,maxHp:100,db0511BurnStacks:10}});
    const result=await turns.resolveEnemyResponse(false);
    assert.equal(result,"death");
    assert.equal(h.player.hp,0);
    assert.equal(h.calls.filter(call=>call[0]==="pet").length,0,"lethal player status tick must resolve before pet/enemy response work");
  }
  {
    const h=makeHarness({turn:2,player:{combatShield:0}});
    const pattern=turns.enemyAttackPattern({name:"The Pale Devil",devilBoss:true});
    assert.equal(pattern.id,"ember-waltz");assert.equal(pattern.name,"Ember Waltz");
    assert.deepEqual(Array.from(pattern.hits),[.58,.58]);
  }

  console.log("Combat turn-resolution owner PASS: response ordering, Haste, Guard/Defense, semantic attack presentation, specials, control repeat, Wolf Echo, statuses and Dragoon are deterministic");
})().catch(error=>{console.error(error);process.exitCode=1;});

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const route of [
  "let dbCombatTurns=null;",
  "return dbCombat.enemyResponse(...args);",
  "const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;",
  "dbCombatTurns=dbCombatTurnOwner.configure({",
  "turns:dbCombatTurns"
])assert.ok(monolith.includes(route),`missing combat turn-resolution composition/facade route: ${route}`);
for(const retiredAdapter of [
  "return dbCombatTurns.enemyTurn(...args);",
  "return dbCombatTurns.resolveEnemyResponse(...args);",
  "return dbCombat.enemyTurn(...args);"
])assert.ok(!monolith.includes(retiredAdapter),`call-only turn adapter returned: ${retiredAdapter}`);
for(const retired of [
  "v24ApplyDamage","v24ResolveNormalHits","v24AttackPattern","beta03TickEnemyBurns","db0511TickPlayerElementStatuses","db064ResolveWolfEchoes",
  "enemyTurnV11","enemyTurnV25DevilBase","db0511EnemyTurnBase","db060EnemyTurnBase","db064EnemyTurnBase","dbFriendEnemyTurnBase",
  "resolveEnemyResponseV15","resolveEnemyResponseV19Base","resolveEnemyResponseV24Base","resolveEnemyResponseBeta045Base","db046ResolveEnemyBase","db047ResolveEnemyBase","db0511ResolveEnemyResponseBase"
])assert.ok(!monolith.includes(retired),`retired combat turn ownership remains in monolith: ${retired}`);
assert.equal((monolith.match(/async function enemyTurn\(/g)||[]).length,0,"call-only enemyTurn adapter must stay retired");
assert.equal((monolith.match(/async function resolveEnemyResponse\(/g)||[]).length,1,"resolveEnemyResponse is a real first-class interception seam and must remain singular");
assert.doesNotMatch(source,/successfulDodgePresentation/,"path-specific Dodge presentation capability must stay retired");
assert.match(source,/function successfulDodge\(messages, message\)/,"Turn Resolution must retain one semantic successful-Dodge route");
assert.doesNotMatch(monolith,/dbFriendSuccessfulDodgePresentation/,"Dodge presentation must not return to the monolith");
assert.match(monolith,/dodge:unit=>dbCombatView\.dodge\(unit\)/,"Turn composition must route generic Dodge through Combat View");
assert.match(monolith,/presentEnemyAttack:fact=>dbCombatView\.enemyAttack\(fact\)/,"Turn composition must route semantic enemy attacks through Combat View");
assert.doesNotMatch(source,/Math\.random|setTimeout/,"enemy attack semantics must remain deterministic and presentation-agnostic");
