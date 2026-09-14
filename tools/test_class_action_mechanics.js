"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON,Math});
for(const rel of ["runtime/js/classes/registry.js","runtime/js/classes/runtime.js","runtime/js/classes/actions.js"]){
  const file=path.join(root,rel);vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const classes=context.window.DiceboundClasses;
let player={classId:"bloodmage",lifeSteal:.10},enemy={name:"Dummy",hp:100,maxHp:100},busy=false,events=[];
const push=(name,value)=>{events.push(value===undefined?name:`${name}:${value}`);};
classes.configureActionMechanics({
  getPlayer:()=>player,getCurrentEnemy:()=>enemy,getCombatBusy:()=>busy,setCombatBusy:value=>{busy=!!value;push("busy",busy);},
  basicAttack:async()=>{push("attackLS",player.lifeSteal);},identityFlash:text=>push("flash",text),updateCombatUI:()=>push("ui"),
  healPlayer:amount=>{const healed=Math.min(amount,player.maxHp-player.hp);player.hp+=healed;push("heal",amount);return healed;},
  damageAll:(amount,falloff)=>{push("damage",`${amount}/${falloff}`);return 47;},setCombatText:text=>push("text",text),sfxHoly:()=>push("holy"),
  delay:async ms=>push("delay",ms),livingEnemies:()=>enemy&&enemy.hp>0?[enemy]:[],winCombat:()=>{push("win");return "won";},
  resolveEnemyResponse:async guarded=>push("response",guarded),isClassActive:id=>player.classId===id
});

(async()=>{
  await classes.bloodmageBloodletting();
  assert.equal(player.lifeSteal,.10,"Bloodletting did not restore Lifesteal");
  assert.deepEqual(events,["flash:🩸 Bloodletting restores fuel","attackLS:0.22","ui"]);

  player={classId:"cleric",maxHp:100,hp:40,attack:20,clericFaith:100,combatShield:0,combatActionCount:0};enemy={name:"Dummy",hp:100,maxHp:100};busy=false;events=[];
  await classes.clericConsecration();
  assert.equal(player.clericFaith,0);assert.equal(player.hp,62);assert.equal(player.combatShield,1);assert.equal(player.combatActionCount,1);assert.equal(busy,true);
  assert.deepEqual(events,["busy:true","heal:22","damage:31/0.75","text:☀️ Consecration spends 100 Faith, heals 22 HP, raises a Barrier and deals 47 Light-touched damage across the pack.","flash:☀️ CONSECRATION","holy","ui","delay:760","response:false"]);

  player={classId:"beastmaster",beastStance:"aggressive"};busy=false;events=[];
  classes.cycleBeastStance();classes.cycleBeastStance();classes.cycleBeastStance();
  assert.equal(player.beastStance,"aggressive");
  assert.deepEqual(events,["flash:🐾 Defensive stance","ui","flash:🐾 Support stance","ui","flash:🐾 Aggressive stance","ui"]);
  busy=true;classes.cycleBeastStance();assert.equal(player.beastStance,"aggressive");
  player.classId="ranger";busy=false;classes.cycleBeastStance();assert.equal(player.beastStance,"aggressive");

  console.log("Classes simple action-mechanics owner PASS: Bloodletting, Consecration and Beastmaster stance preserve exact sequencing");
})().catch(error=>{console.error(error);process.exitCode=1;});
