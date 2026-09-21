"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON,Math,Number});
for(const rel of ["runtime/js/classes/registry.js","runtime/js/classes/runtime.js","runtime/js/classes/actions.js"]){
  const file=path.join(root,rel);vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const classes=context.window.DiceboundClasses;
let player={classId:"bloodmage",lifeSteal:.10},enemy={name:"Dummy",hp:100,maxHp:100},enemies=[enemy],busy=false,events=[];
let boardLevel=2,encounterLead={boss:false},randomQueue=[],effects=new Set(),damageAllResult=47,ringText="",potionUses=0,applied=[],confusionResult=null;
const push=(name,value)=>{events.push(value===undefined?name:`${name}:${value}`);};
const nextRandom=()=>{if(!randomQueue.length)throw new Error("test RNG queue exhausted");const value=randomQueue.shift();push("rng",value);return value;};
const firstLiving=()=>enemies.filter(candidate=>candidate.hp>0);
classes.configureActionMechanics({
  getPlayer:()=>player,getCurrentEnemy:()=>enemy,getBoardLevel:()=>boardLevel,getEncounterLead:()=>encounterLead,getCombatBusy:()=>busy,setCombatBusy:value=>{busy=!!value;push("busy",busy);},
  basicAttack:async()=>{push("attackLS",player.lifeSteal);},identityFlash:text=>push("flash",text),updateCombatUI:()=>push("ui"),
  healPlayer:amount=>{const healed=Math.min(amount,player.maxHp-player.hp);player.hp+=healed;push("heal",amount);return healed;},
  damageAll:(amount,falloff)=>{push("damageAll",`${amount}/${falloff}`);return damageAllResult;},
  damageEnemy:(target,amount)=>{const dealt=Math.min(target.hp,Math.max(0,Math.round(amount)));target.hp-=dealt;push("damageEnemy",`${target.name}/${amount}`);return dealt;},
  setCombatText:text=>push("text",text),updateHUD:()=>push("hud"),sfxHoly:()=>push("holy"),sfxCoin:()=>push("coin"),sfxHit:()=>push("hit"),sfxCrit:()=>push("crit"),
  delay:async ms=>push("delay",ms),livingEnemies:firstLiving,winCombat:()=>{push("win");return "won";},resolveEnemyResponse:async guarded=>{push("response",guarded);busy=false;},isClassActive:id=>player.classId===id,
  random:nextRandom,rand:(min,max)=>Math.floor(nextRandom()*(max-min+1))+min,clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),modifiedGold:value=>value,
  getUpgradeChoices:()=>{push("choices");return [{id:"stolen",name:"Stolen Spark"}];},pick:values=>values[Math.floor(nextRandom()*values.length)],
  applyUpgrade:(upgrade,source)=>{applied.push(upgrade.id);push("apply",`${upgrade.id}/${source}`);return upgrade;},showToast:text=>push("toast",text),
  rollD20Chaos:async kind=>{push("chaos",kind);return {mult:1};},animateClassAttack:async mode=>push("animate",mode),getSetDamageBonus:()=>0,applyMythicRingPulse:()=>ringText,
  selectFirstLivingEnemy:()=>{enemy=firstLiving()[0]||null;push("select",enemy?.name||"none");},hasEffect:id=>effects.has(id),addCombatHistory:text=>push("history",text),
  potionHealValue:()=>30,recordPotionUse:()=>{potionUses++;push("potionUse");},chargeUltimate:amount=>{player.ultimateCharge=Math.max(0,Math.min(100,(player.ultimateCharge||0)+amount));push("charge",amount);},
  pickElementKey:()=>{nextRandom();return "fire";},triggerElementEffect:(key,target,options)=>{push("element",`${key}/${target?.name}/${options?.source}`);return {message:"Fire erupts.",totalDamage:0};},
  rollTieredProc:chance=>{push("tier",chance);return 0;},triggerStrikeElements:target=>{push("strikeElements",target?.name||"none");return {message:"",totalDamage:0};},
  playElementAnimation:(key,target)=>push("elementAnim",`${key}/${target?.name||"none"}`),gameplayTalentRank:()=>0,dragoonActive:()=>player.classId==="dragoon",
  syncDragoonPresentation:()=>push("dragoonSync"),dragoonLandPresentation:()=>push("dragoonLand"),
  resolvePlayerConfusionOffense:async()=>confusionResult
});

(async()=>{
  await classes.bloodmageBloodletting();
  assert.equal(player.lifeSteal,.10,"Bloodletting did not restore Lifesteal");
  assert.deepEqual(events,["flash:🩸 Bloodletting restores fuel","attackLS:0.22","ui"]);

  player={classId:"cleric",maxHp:100,hp:40,attack:20,crit:.06,clericFaith:100,combatShield:0,combatActionCount:0};enemy={name:"Dummy",hp:100,maxHp:100};enemies=[enemy];busy=false;events=[];damageAllResult=47;
  await classes.clericConsecration();
  assert.equal(player.clericFaith,0);assert.equal(player.hp,62);assert.equal(player.combatShield,1);assert.equal(player.combatActionCount,1);
  assert.deepEqual(events,["busy:true","heal:22","tier:0.06","damageAll:31/0.75","text:☀️ Consecration spends 100 Faith, heals 22 HP, raises a Barrier and deals 47 Light-touched damage across the pack.","flash:☀️ CONSECRATION","holy","ui","delay:760","response:false"]);

  player={classId:"cleric",maxHp:100,hp:40,attack:20,crit:.06,clericFaith:100,combatShield:0,combatActionCount:0};enemy={name:"Confused Dummy",hp:100,maxHp:100};enemies=[enemy];busy=false;events=[];confusionResult={misfired:true,target:"player",damage:15};
  assert.deepEqual(await classes.clericConsecration(),confusionResult,"direct class offense must return the authoritative Confusion resolution");
  assert.equal(player.clericFaith,100,"Confused Consecration must not spend Faith before the misfire interceptor");
  assert.equal(player.combatActionCount,0,"Confused Consecration must not also execute its normal action");
  assert.equal(enemy.hp,100,"Confused Consecration must not damage its intended enemy");
  confusionResult=null;

  player={classId:"beastmaster",beastStance:"aggressive"};busy=false;events=[];
  classes.cycleBeastStance();classes.cycleBeastStance();classes.cycleBeastStance();
  assert.equal(player.beastStance,"aggressive");assert.deepEqual(events,["flash:🐾 Defensive stance","ui","flash:🐾 Support stance","ui","flash:🐾 Aggressive stance","ui"]);

  player={classId:"rogue",luck:1,gold:0,potions:1,attack:20,defense:4,rogueStealStatFraction:.10,rogueStealUsed:false,combatActionCount:0};enemy={name:"Pocket Dummy",hp:1000,maxHp:1000,attack:30,defense:10};enemies=[enemy];busy=false;events=[];applied=[];boardLevel=2;randomQueue=[.1,.5,.2,.4,.1];
  assert.equal(classes.roguePowerStealChance(1),.35);
  await classes.rogueSteal();
  assert.equal(player.rogueStealUsed,true);assert.equal(player.combatActionCount,1);assert.equal(player.gold,28);assert.equal(player.potions,2);assert.deepEqual(applied,["stolen"]);assert.equal(player._beta021LastStealPower.chance,.35);assert.equal(player._beta021LastStealPower.roll,.2);
  assert.equal(player.attack,23);assert.equal(player.defense,5);assert.equal(enemy.attack,27);assert.equal(enemy.defense,9);assert.equal(player._rogueStolenAttack,3);assert.equal(player._rogueStolenDefense,1);
  assert.equal(randomQueue.length,0,"Stat Heist must not add RNG draws to Rogue Steal");
  assert.ok(events.includes("response:false"));assert.ok(events.includes("coin"));

  player={classId:"bloodmage",maxHp:100,hp:40,ultimateCharge:0,combatActionCount:0,equipment:{}};enemy={name:"Blood Dummy",hp:600,maxHp:1000};enemies=[enemy];busy=false;events=[];ringText="";
  await classes.bloodmageReplenish();
  assert.equal(player.hp,56);assert.equal(enemy.hp,740);assert.equal(player.ultimateCharge,20);assert.equal(player.combatActionCount,1);assert.ok(events.includes("response:true"),"Replenish lost guarded enemy response");

  player={classId:"bloodmage",maxHp:100,hp:100,attack:20,damageBonus:0,bossDamage:0,bloodmageExsanguinateCostMult:1,bloodmageExsanguinateDamageMult:1,combatAttackCount:0,combatActionCount:0,equipment:{}};
  enemies=[{name:"A",hp:5000,maxHp:5000},{name:"B",hp:5000,maxHp:5000}];enemy=enemies[0];encounterLead={boss:false};busy=false;events=[];effects.clear();ringText="";
  await classes.bloodmageExsanguinate();
  assert.equal(player.hp,88);assert.equal(5000-enemies[0].hp,72);assert.equal(5000-enemies[1].hp,47);assert.ok(events.includes("strikeElements:A"));assert.equal(player.combatAttackCount,1);assert.equal(player.combatActionCount,1);assert.ok(events.includes("response:false"));

  player={classId:"bloodmage",maxHp:100,hp:100,attack:20,damageBonus:0,bossDamage:0,bloodmageExsanguinateCostMult:1,bloodmageExsanguinateDamageMult:1,combatAttackCount:0,combatActionCount:0,equipment:{}};
  enemies=[{name:"A",hp:5000,maxHp:5000},{name:"B",hp:5000,maxHp:5000}];enemy=enemies[0];busy=false;events=[];effects=new Set(["blood_price"]);
  await classes.bloodmageExsanguinate();
  assert.equal(5000-enemies[0].hp,83);assert.equal(5000-enemies[1].hp,54);assert.equal(player.damageBonus,.08);assert.equal(player._db060BloodPriceStacks,1);assert.ok(events.some(entry=>entry.startsWith("history:🩸📈 Blood Price")),"Blood Price history/stack ordering drifted");

  player={classId:"alchemist",maxHp:100,hp:100,attack:15,potions:3,potionPower:.5,alchemistFreeFlask:0,alchemistElementChance:0,alchemistFlaskBonus:0,combatActionCount:0,ultimateAttackGain:12,ultimateCharge:0,guardCooldown:2};
  enemy={name:"Flask Dummy",hp:5000,maxHp:5000};enemies=[enemy,{name:"Flask Dummy B",hp:5000,maxHp:5000}];busy=false;events=[];randomQueue=[.5,.5];potionUses=0;damageAllResult=54;effects.clear();
  await classes.alchemistVolatileFlask();
  assert.equal(player.potions,2);assert.equal(potionUses,1);assert.equal(player.guardCooldown,0);assert.equal(player.combatActionCount,1);assert.equal(player.ultimateCharge,9);assert.equal(randomQueue.length,0,"Alchemist RNG draw count drifted");
  assert.ok(events.includes("damageAll:60/0.72"));assert.ok(events.includes("response:false"));

  player={classId:"rogue",attack:20,defense:4,rogueStealStatFraction:.10};enemy={name:"Stat Dummy",attack:30,defense:10};enemies=[enemy];
  {const cleared=classes.clearRogueStolenStats();assert.equal(cleared.attack,0);assert.equal(cleared.defense,0);}
  player._rogueStolenAttack=3;player._rogueStolenDefense=1;player.attack=23;player.defense=5;
  {const cleared=classes.clearRogueStolenStats();assert.equal(cleared.attack,3);assert.equal(cleared.defense,1);}assert.equal(player.attack,20);assert.equal(player.defense,4);

  console.log("Classes bespoke action-mechanics owner PASS: Rogue, Bloodmage, Alchemist, Bloodletting, Consecration, Beastmaster and Rogue cleanup preserve deterministic sequencing");
})().catch(error=>{console.error(error);process.exitCode=1;});
