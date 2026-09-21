const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const sourcePath=path.join(root,"runtime","js","combat","confusion-resolution.js");
const source=fs.readFileSync(sourcePath,"utf8");
const sandbox={window:{},console,Math,Object,setTimeout,clearTimeout};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:sourcePath});
const owner=sandbox.window.DiceboundCombatConfusionResolution;
assert(owner&&owner.owner==="combat/confusion-resolution");

function harness(randoms=[]){
  const trace=[],rolls=[...randoms];
  const player={hp:100,maxHp:100,attack:20,defense:10,flatReduction:0,confusionActions:0};
  const enemies=[
    {id:"a",name:"A",hp:100,maxHp:100,attack:12,defense:0,confusionActions:0},
    {id:"b",name:"B",hp:100,maxHp:100,attack:12,defense:0,confusionActions:0},
    {id:"c",name:"C",hp:100,maxHp:100,attack:12,defense:0,confusionActions:0}
  ];
  let busy=false,current=enemies[0],rng=0,responses=0,deaths=0;
  owner.configure({
    getPlayer:()=>player,getCurrentEnemy:()=>current,livingEnemies:()=>enemies.filter(e=>e.hp>0),
    playerSideTargets:()=>[{kind:"player",id:"player",name:"you",entity:player}],
    random:()=>{rng++;return rolls.length?rolls.shift():.5;},
    getCombatBusy:()=>busy,setCombatBusy:v=>{busy=!!v;},defenseDamageReduction:()=>.25,
    applyPlayerDamage:raw=>{const total=Math.max(0,Math.round(raw));player.hp=Math.max(0,player.hp-total);trace.push(["playerDamage",total]);return {total};},
    damageFriendlyTarget:(target,raw)=>{target.entity.hp=Math.max(0,target.entity.hp-raw);return {total:raw};},
    setCombatText:text=>trace.push(["text",text]),addCombatHistory:text=>trace.push(["history",text]),
    updateCombatUI:()=>trace.push(["ui"]),delay:async()=>{},resolveEnemyResponse:async()=>{responses++;busy=false;},
    handlePlayerDeath:async()=>{deaths++;busy=false;}
  });
  return {player,enemies,trace,get rng(){return rng;},get responses(){return responses;},get deaths(){return deaths;},set current(v){current=v;}};
}

{
  const h=harness([.0,.49,.99]);
  assert.equal(owner.applyEnemy(h.enemies[0]),1);
  assert.strictEqual(owner.consumeEnemyTarget(h.enemies[0]),h.enemies[0],"low roll should select confused attacker itself");
  assert.equal(h.enemies[0].confusionActions,0);
  assert.equal(h.rng,1);

  owner.applyEnemy(h.enemies[0]);
  assert.strictEqual(owner.consumeEnemyTarget(h.enemies[0]),h.enemies[1],"middle roll should select a living ally");
  owner.applyEnemy(h.enemies[0]);
  assert.strictEqual(owner.consumeEnemyTarget(h.enemies[0]),h.enemies[2],"high roll should select the last living ally");
  assert.equal(h.rng,3);
}

{
  const h=harness();
  h.enemies[1].hp=0;h.enemies[2].hp=0;
  owner.applyEnemy(h.enemies[0]);
  assert.strictEqual(owner.consumeEnemyTarget(h.enemies[0]),h.enemies[0],"solo confused enemy must target itself");
  assert.equal(h.rng,0,"single valid target should not consume an unnecessary RNG draw");
}

(async()=>{
  const h=harness();
  assert.equal(owner.applyPlayer(),1);
  const result=await owner.resolvePlayerOffense("Attack");
  assert(result&&result.misfired);
  assert.equal(result.target,"player");
  assert.equal(result.damage,15,"self-hit should use the configured Defense reduction");
  assert.equal(h.player.hp,85);
  assert.equal(h.player.confusionActions,0);
  assert.equal(h.responses,1,"misfired player offense still consumes the player turn and reaches enemy response");
  assert(h.trace.some(entry=>entry[0]==="history"&&entry[1].includes("Confusion")));
  owner.applyPlayer();owner.clearPlayer();assert.equal(h.player.confusionActions,0);
  console.log("Combat Confusion Resolution PASS: one-action status, uniform same-side targets, self-hit and turn consumption are deterministic");
})().catch(error=>{console.error(error);process.exitCode=1;});
