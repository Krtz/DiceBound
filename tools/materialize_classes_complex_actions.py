from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT/rel).read_text(encoding="utf-8")


def write(rel,text):
    (ROOT/rel).write_text(text,encoding="utf-8",newline="\n")


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old,new,1)


def splice(text,start_marker,end_marker,replacement,label):
    start=text.find(start_marker)
    if start<0:
        raise SystemExit(f"{label}: start marker not found")
    end=text.find(end_marker,start)
    if end<0:
        raise SystemExit(f"{label}: end marker not found")
    return text[:start]+replacement+text[end:]


actions=r'''(() => {
  "use strict";

  const OWNER="classes/runtime-action-mechanics";
  let deps=null;

  function configure(next={}){
    for(const name of [
      "getPlayer","getCurrentEnemy","getBoardLevel","getEncounterLead","getCombatBusy","setCombatBusy",
      "basicAttack","identityFlash","updateCombatUI","healPlayer","damageAll","damageEnemy","setCombatText","updateHUD",
      "sfxHoly","sfxCoin","sfxHit","sfxCrit","delay","livingEnemies","winCombat","resolveEnemyResponse","isClassActive",
      "random","rand","clamp","modifiedGold","getUpgradeChoices","pick","applyUpgrade","showToast",
      "rollD20Chaos","animateClassAttack","getSetDamageBonus","applyMythicRingPulse","selectFirstLivingEnemy",
      "hasEffect","addCombatHistory","potionHealValue","recordPotionUse","chargeUltimate","pickElementKey","triggerElementEffect"
    ]){
      if(typeof next?.[name]!=="function")throw new Error(`Classes action mechanics requires ${name}().`);
    }
    deps=next;
    return api;
  }
  function runtime(){if(!deps)throw new Error("Classes action mechanics must be configured before use.");return deps;}

  async function bloodmageBloodletting(){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.getCombatBusy()||!rt.getCurrentEnemy())return;
    const oldLS=player.lifeSteal;
    player.lifeSteal+=.12;
    rt.identityFlash("🩸 Bloodletting restores fuel");
    try{await rt.basicAttack();}
    finally{player.lifeSteal=oldLS;}
    rt.updateCombatUI();
  }

  function roguePowerStealChance(luck=runtime().getPlayer()?.luck){
    return runtime().clamp((Number(luck)||0)-.50,0,.50)*.70;
  }

  async function rogueSteal(){
    const rt=runtime(),player=rt.getPlayer(),enemy=rt.getCurrentEnemy();
    if(rt.getCombatBusy()||!enemy||player.rogueStealUsed)return;
    rt.setCombatBusy(true);player.rogueStealUsed=true;player.combatActionCount++;
    const chance=rt.clamp(.48+player.luck*.22+(player.rogueStealChanceBonus||0),.48,.93),success=rt.random()<chance;
    let text="";
    if(success){
      const raw=rt.rand(10+rt.getBoardLevel()*4,22+rt.getBoardLevel()*8),gold=rt.modifiedGold(Math.max(1,Math.round(raw*(player.rogueStealGoldMult||1))));
      player.gold+=gold;text=`🗡️ You steal ${gold} gold from ${enemy.name}.`;
      const powerChance=roguePowerStealChance(player.luck),powerRoll=powerChance>0?rt.random():1;
      player._beta021LastStealPower={chance:powerChance,roll:powerRoll};
      if(powerChance>0&&powerRoll<powerChance){
        const choices=rt.getUpgradeChoices(),stolen=choices.length?rt.pick(choices):null;
        if(stolen){rt.applyUpgrade(stolen,"Rogue Steal");text+=` <b>Jackpot:</b> you also steal the powerup ${stolen.name}!`;rt.showToast(`🗡️ Stolen powerup: ${stolen.name}`);}
      }
      if(rt.random()<.18){player.potions++;text+=" You also somehow steal a potion.";}
      rt.identityFlash("🪙 Steal succeeded");rt.sfxCoin();
    }else{
      text=`🗡️ ${enemy.name} catches your hand. You steal absolutely nothing.`;rt.identityFlash("🚫 Caught!");
    }
    rt.setCombatText(text);rt.updateHUD();rt.updateCombatUI();await rt.delay(620);await rt.resolveEnemyResponse(false);
  }

  async function clericConsecration(){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.getCombatBusy()||!rt.getCurrentEnemy()||(player.clericFaith||0)<100)return;
    rt.setCombatBusy(true);
    player.clericFaith=0;
    player.combatActionCount++;
    const heal=rt.healPlayer(Math.ceil(player.maxHp*.22));
    player.combatShield+=1;
    const dmg=Math.round(player.attack*1.15+player.maxHp*.08),dealt=rt.damageAll(dmg,.75);
    rt.setCombatText(`☀️ Consecration spends 100 Faith, heals ${heal} HP, raises a Barrier and deals ${dealt} Light-touched damage across the pack.`);
    rt.identityFlash("☀️ CONSECRATION");
    rt.sfxHoly();
    rt.updateCombatUI();
    await rt.delay(760);
    if(!rt.livingEnemies().length)return rt.winCombat();
    await rt.resolveEnemyResponse(false);
  }

  function cycleBeastStance(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.isClassActive("beastmaster")||rt.getCombatBusy())return;
    const order=["aggressive","defensive","support"],i=order.indexOf(player.beastStance);
    player.beastStance=order[(i+1)%order.length];
    rt.identityFlash(`🐾 ${player.beastStance[0].toUpperCase()+player.beastStance.slice(1)} stance`);
    rt.updateCombatUI();
  }

  async function bloodmageReplenish(){
    const rt=runtime(),player=rt.getPlayer(),enemy=rt.getCurrentEnemy();
    if(rt.getCombatBusy()||!enemy)return;
    rt.setCombatBusy(true);player.combatActionCount++;
    const selfHeal=rt.healPlayer(Math.ceil(player.maxHp*.16)),enemyHeal=Math.min(enemy.maxHp-enemy.hp,Math.ceil(enemy.maxHp*.14));
    enemy.hp+=enemyHeal;player.ultimateCharge=rt.clamp(player.ultimateCharge+20,0,100);const ring=rt.applyMythicRingPulse();
    rt.setCombatText(`💉 Replenish restores ${selfHeal} HP to you and ${enemyHeal} HP to ${enemy.name}, then braces like Guard.${ring?` ${ring}`:""}`);
    rt.updateCombatUI();await rt.delay(700);await rt.resolveEnemyResponse(true);
  }

  async function bloodmageExsanguinateBase(){
    const rt=runtime(),player=rt.getPlayer(),enemy=rt.getCurrentEnemy();
    if(rt.getCombatBusy()||!enemy)return;
    rt.setCombatBusy(true);player.guardCooldown=0;player.combatAttackCount++;player.combatActionCount++;
    const costMult=player.bloodmageExsanguinateCostMult||1,damageMult=player.bloodmageExsanguinateDamageMult||1;
    const paid=Math.max(1,Math.ceil(player.maxHp*.12*costMult));player.hp=Math.max(1,player.hp-paid);
    const chaos=await rt.rollD20Chaos("attack");rt.updateCombatUI();await rt.animateClassAttack("crit");
    let damage=Math.round((player.attack*2.45+paid*1.9)*(chaos.mult||1)*(1+player.damageBonus+rt.getSetDamageBonus())*damageMult);
    if(rt.getEncounterLead()?.boss)damage=Math.round(damage*(1+player.bossDamage));
    const primary=rt.getCurrentEnemy(),first=rt.damageEnemy(primary,damage),second=rt.livingEnemies().find(candidate=>candidate!==primary);let splash=0;
    if(second)splash=rt.damageEnemy(second,Math.round(damage*.65));
    const ring=rt.applyMythicRingPulse(),total=first+splash;
    rt.setCombatText(`🩸 Exsanguinate spends ${paid} HP to deal ${first} to ${primary.name}${second?` and ${splash} to ${second.name}`:""} (${total} total).${ring?` ${ring}`:""}`);
    rt.sfxHit();rt.updateCombatUI();await rt.delay(820);
    if(!rt.livingEnemies().length)return rt.winCombat();
    rt.selectFirstLivingEnemy();await rt.resolveEnemyResponse(false);
  }

  async function bloodmageExsanguinate(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.hasEffect("blood_price"))return bloodmageExsanguinateBase();
    const old=player.damageBonus||0;player.damageBonus=old+.15;
    try{return await bloodmageExsanguinateBase();}
    finally{
      player.damageBonus=(player.damageBonus||0)-.15;player.damageBonus+=.08;
      player._db060BloodPriceStacks=(player._db060BloodPriceStacks||0)+1;
      rt.addCombatHistory(`🩸📈 Blood Price: +8% battle damage (${player._db060BloodPriceStacks} stack${player._db060BloodPriceStacks===1?"":"s"}).`);
    }
  }

  async function alchemistVolatileFlask(){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.getCombatBusy()||!rt.getCurrentEnemy()||player.potions<=0)return;
    rt.setCombatBusy(true);player.guardCooldown=0;
    const free=rt.random()<rt.clamp(player.alchemistFreeFlask||0,0,.8);
    if(!free){player.potions--;rt.recordPotionUse();}
    const healing=rt.potionHealValue(),raw=Math.round((healing*1.35+player.attack*.9)*(1+(player.alchemistFlaskBonus||0))),dealt=rt.damageAll(raw,.72);
    let extra=free?" Panacea Engine preserves the potion.":"";
    if(rt.random()<rt.clamp(player.alchemistElementChance||0,0,.75)){
      const key=rt.pickElementKey(),target=rt.getCurrentEnemy()?.hp>0?rt.getCurrentEnemy():rt.livingEnemies()[0],result=rt.triggerElementEffect(key,target,{forced:true,source:"Volatile Flask"});
      if(result)extra+=` ${result.message}`;
    }
    player.combatActionCount++;rt.chargeUltimate(Math.round(player.ultimateAttackGain*.75));rt.sfxCrit();
    rt.setCombatText(`🧪 Volatile Flask consumes restorative potency as violence for ${dealt} total damage.${extra}`);rt.updateCombatUI();await rt.delay(720);
    if(!rt.livingEnemies().length)return rt.winCombat();
    await rt.resolveEnemyResponse(false);
  }

  const api=Object.freeze({
    owner:OWNER,apiVersion:2,configure,bloodmageBloodletting,roguePowerStealChance,rogueSteal,clericConsecration,cycleBeastStance,
    bloodmageReplenish,bloodmageExsanguinate,alchemistVolatileFlask
  });
  const facade=window.DiceboundClasses;
  if(!facade?._installActions)throw new Error("classes/actions.js requires DiceboundClasses facade before loading.");
  facade._installActions(api);
})();
'''
write("runtime/js/classes/actions.js",actions)

registry=read("runtime/js/classes/registry.js")
registry=replace_once(
    registry,
    '    bloodmageBloodletting:()=>callAction("bloodmageBloodletting"),\n    clericConsecration:()=>callAction("clericConsecration"),\n    cycleBeastStance:()=>callAction("cycleBeastStance"),',
    '    bloodmageBloodletting:()=>callAction("bloodmageBloodletting"),\n    roguePowerStealChance:luck=>callAction("roguePowerStealChance",luck),\n    rogueSteal:()=>callAction("rogueSteal"),\n    clericConsecration:()=>callAction("clericConsecration"),\n    cycleBeastStance:()=>callAction("cycleBeastStance"),\n    bloodmageReplenish:()=>callAction("bloodmageReplenish"),\n    bloodmageExsanguinate:()=>callAction("bloodmageExsanguinate"),\n    alchemistVolatileFlask:()=>callAction("alchemistVolatileFlask"),',
    "Classes facade action methods"
)
write("runtime/js/classes/registry.js",registry)

runtime=read("runtime/js/classes/runtime.js")
runtime=replace_once(
    runtime,
    '      "manaSpecial","bloodmageSpecial","rogueSpecial","clericSpecial","beastmasterSpecial"',
    '      "manaSpecial","bloodmageSpecial","rogueSpecial","clericSpecial","beastmasterSpecial","alchemistSpecial"',
    "Classes action callback contract"
)
runtime=replace_once(
    runtime,
    '      if(active("beastmaster"))return action.beastmasterSpecial();\n      return undefined;',
    '      if(active("beastmaster"))return action.beastmasterSpecial();\n      if(active("alchemist"))return action.alchemistSpecial();\n      return undefined;',
    "Alchemist special routing"
)
write("runtime/js/classes/runtime.js",runtime)

mono=read("runtime/js/dicebound.js")
mono=splice(
    mono,
    '  async function bloodmageExsanguinate(){if(combatBusy||!currentEnemy)return;',
    '  const rollDiceV11=rollDice;',
    '  // Bloodmage bespoke combat actions are owned by DiceboundClasses.\n\n',
    "historical Bloodmage action/listener shadows"
)
mono=splice(
    mono,
    '  function beta021RoguePowerStealChance(luck=player.luck)',
    '  // Guard/potion identity wrappers.',
    '  // Rogue Steal mechanics are owned by DiceboundClasses.\n\n',
    "historical Rogue action shadow"
)

new_action_config='''  dbClasses.configureActionMechanics({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    getBoardLevel:()=>boardLevel,
    getEncounterLead:()=>currentEncounterLead,
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    basicAttack:()=>playerAttack(),
    identityFlash:text=>identityFlash(text),
    updateCombatUI:()=>updateCombatUI(),
    healPlayer:amount=>healPlayer(amount),
    damageAll:(amount,falloff=1)=>damageAll(amount,falloff),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    setCombatText:text=>setCombatText(text),
    updateHUD:()=>updateHUD(),
    sfxHoly:()=>sfx.holy(),
    sfxCoin:()=>sfx.coin(),
    sfxHit:()=>sfx.hit(),
    sfxCrit:()=>sfx.crit(),
    delay:ms=>delay(ms),
    livingEnemies:()=>livingEnemies(),
    winCombat:()=>winCombat(),
    resolveEnemyResponse:guarded=>resolveEnemyResponse(guarded),
    isClassActive:id=>classIdentityActive(id),
    random:()=>random(),
    rand:(min,max)=>rand(min,max),
    clamp:(value,min,max)=>clamp(value,min,max),
    modifiedGold:value=>modifiedGold(value),
    getUpgradeChoices:()=>getUpgradeChoices(),
    pick:values=>pick(values),
    applyUpgrade:(upgrade,source)=>applyUpgrade(upgrade,source),
    showToast:(...args)=>showToast(...args),
    rollD20Chaos:kind=>rollD20Chaos(kind),
    animateClassAttack:mode=>animateClassAttack(mode),
    getSetDamageBonus:()=>v19SetDamageBonus(),
    applyMythicRingPulse:()=>applyMythicRingPulse(),
    selectFirstLivingEnemy:()=>setCurrentEnemy(currentEnemies.indexOf(livingEnemies()[0])),
    hasEffect:id=>db060HasEffect(id),
    addCombatHistory:text=>addCombatHistory(text),
    potionHealValue:mult=>v16PotionHealValue(mult),
    recordPotionUse:()=>{if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.recordPotionUse();},
    chargeUltimate:amount=>chargeUltimate(amount),
    pickElementKey:()=>pick(ELEMENT_KEYS),
    triggerElementEffect:(key,target,options)=>triggerElementEffect(key,target,options)
  });
'''
start='  dbClasses.configureActionMechanics({\n'
end='  dbClasses.configureActions({\n'
mono=splice(mono,start,end,new_action_config,"Classes action-mechanics composition")
mono=replace_once(mono,'    bloodmageGuard:()=>bloodmageReplenish(),','    bloodmageGuard:()=>dbClasses.bloodmageReplenish(),',"Bloodmage guard routing")
mono=replace_once(mono,'    bloodmageSpecial:()=>bloodmageExsanguinate(),','    bloodmageSpecial:()=>dbClasses.bloodmageExsanguinate(),',"Bloodmage special routing")
mono=replace_once(mono,'    rogueSpecial:()=>rogueSteal(),','    rogueSpecial:()=>dbClasses.rogueSteal(),',"Rogue special routing")
mono=replace_once(mono,'    beastmasterSpecial:()=>dbClasses.cycleBeastStance()\n','    beastmasterSpecial:()=>dbClasses.cycleBeastStance(),\n    alchemistSpecial:()=>dbClasses.alchemistVolatileFlask()\n',"Alchemist special composition")

mono=splice(
    mono,
    "  function recordPotionUseV16()",
    "  // ---- Talents --------------------------------------------------------------",
    "  // Volatile Flask consumption/action mechanics are owned by DiceboundClasses.\n\n  // ---- Talents --------------------------------------------------------------",
    "Alchemist Volatile Flask shadow"
)
mono=replace_once(
    mono,
    '  $("specialAttackBtn")?.addEventListener("click",e=>{if(!classIdentityActive("alchemist"))return;e.preventDefault();e.stopImmediatePropagation();alchemistVolatileFlaskV16();},true);\n',
    '  // Alchemist Special now uses the shared DiceboundClasses action route.\n',
    "Alchemist capture listener"
)

mono=splice(
    mono,
    '  // ---- Guard, Replenish and pet-turn behavior ------------------------------',
    '  // ---- Endless Form support hooks ------------------------------------------',
    '  // ---- Guard, Replenish and pet-turn behavior ------------------------------\n  // Bloodmage Replenish and Exsanguinate are owned by DiceboundClasses.\n\n',
    "Bloodmage Replenish/Exsanguinate compatibility shadows"
)
mono=splice(
    mono,
    '  // Rogue: keep the established once-per-battle Steal cadence, but let the',
    '  /*\n    Full eligible-powerup picker.',
    '  // Rogue Steal and final Bloodmage Exsanguinate signature behavior are owned by DiceboundClasses.\n\n\n  /*\n    Full eligible-powerup picker.',
    "final Rogue/Bloodmage overrides"
)
mono=splice(
    mono,
    '  // Blood Price.\n  const db060BloodmageBase=bloodmageExsanguinate;',
    '  // Defense doubling during actual incoming attacks.',
    '  // Blood Price is applied inside the DiceboundClasses Bloodmage action owner.\n\n',
    "Blood Price wrapper shadow"
)

mono=replace_once(mono,'roguePowerChance(luck=1){return beta021RoguePowerStealChance(luck);},','roguePowerChance(luck=1){return dbClasses.roguePowerStealChance(luck);},',"Rogue test power chance")
mono=replace_once(mono,'try{await rogueSteal();const after=','try{await dbClasses.rogueSteal();const after=',"Rogue test action")
mono=replace_once(mono,'powerChance:beta021RoguePowerStealChance(player.luck),','powerChance:dbClasses.roguePowerStealChance(player.luck),',"Rogue test result chance")
mono=replace_once(mono,'try{await bloodmageReplenish();return {guarded,hp:player.hp,enemyHp:currentEnemy.hp};}','try{await dbClasses.bloodmageReplenish();return {guarded,hp:player.hp,enemyHp:currentEnemy.hp};}',"Replenish hidden regression route")
mono=replace_once(mono,'try{await bloodmageExsanguinate();return {firstDamage:1000-currentEnemies[0].hp,secondDamage:1000-currentEnemies[1].hp};}','try{await dbClasses.bloodmageExsanguinate();return {firstDamage:1000-currentEnemies[0].hp,secondDamage:1000-currentEnemies[1].hp};}',"Exsanguinate hidden regression route")
mono=replace_once(mono,'await dbClassesOracleWithoutResponse(()=>bloodmageReplenish())','await dbClassesOracleWithoutResponse(()=>dbClasses.bloodmageReplenish())',"Classes oracle Replenish route")
mono=replace_once(mono,'await dbClassesOracleWithoutResponse(()=>bloodmageExsanguinate())','await dbClassesOracleWithoutResponse(()=>dbClasses.bloodmageExsanguinate())',"Classes oracle Exsanguinate route")
mono=replace_once(mono,'await dbClassesOracleWithoutResponse(()=>alchemistVolatileFlaskV16())','await dbClassesOracleWithoutResponse(()=>dbClasses.alchemistVolatileFlask())',"Classes oracle Alchemist route")

for forbidden,label in [
    ('async function rogueSteal(',"Rogue function declaration"),
    ('rogueSteal=async function',"Rogue override"),
    ('async function bloodmageReplenish(',"Bloodmage Replenish declaration"),
    ('bloodmageReplenish=async function',"Bloodmage Replenish override"),
    ('async function bloodmageExsanguinate(',"Bloodmage Exsanguinate declaration"),
    ('bloodmageExsanguinate=async function',"Bloodmage Exsanguinate override"),
    ('db060BloodmageBase',"Blood Price base capture"),
    ('alchemistVolatileFlaskV16',"Alchemist Volatile Flask shadow"),
    ('beta021RoguePowerStealChance',"Rogue power-steal helper shadow")
]:
    if forbidden in mono:
        raise SystemExit(f"{label} survived monolith drain")
write("runtime/js/dicebound.js",mono)

runtime_test=read("tools/test_classes_runtime.js")
runtime_test=replace_once(
    runtime_test,
    'for(const name of ["basicAttack","manaAttack","bloodmageAttack","guard","bloodmageGuard","potion","ultimate","manaSpecial","bloodmageSpecial","rogueSpecial","clericSpecial","beastmasterSpecial"]){',
    'for(const name of ["basicAttack","manaAttack","bloodmageAttack","guard","bloodmageGuard","potion","ultimate","manaSpecial","bloodmageSpecial","rogueSpecial","clericSpecial","beastmasterSpecial","alchemistSpecial"]){',
    "runtime routing test callback list"
)
runtime_test=replace_once(
    runtime_test,
    'assert.deepEqual(routed("beastmaster","special"),{result:"beastmasterSpecial",trace:["beastmasterSpecial"]});\nassert.deepEqual(routed("ranger","special"),{result:undefined,trace:[]});',
    'assert.deepEqual(routed("beastmaster","special"),{result:"beastmasterSpecial",trace:["beastmasterSpecial"]});\nassert.deepEqual(routed("alchemist","special"),{result:"alchemistSpecial",trace:["alchemistSpecial"]});\nassert.deepEqual(routed("ranger","special"),{result:undefined,trace:[]});',
    "runtime Alchemist routing test"
)
runtime_test=replace_once(
    runtime_test,
    'assert.match(monolith,/beastmasterSpecial:\\(\\)=>dbClasses\\.cycleBeastStance\\(\\)/);\n',
    'assert.match(monolith,/beastmasterSpecial:\\(\\)=>dbClasses\\.cycleBeastStance\\(\\)/);\nassert.match(monolith,/bloodmageGuard:\\(\\)=>dbClasses\\.bloodmageReplenish\\(\\)/);\nassert.match(monolith,/bloodmageSpecial:\\(\\)=>dbClasses\\.bloodmageExsanguinate\\(\\)/);\nassert.match(monolith,/rogueSpecial:\\(\\)=>dbClasses\\.rogueSteal\\(\\)/);\nassert.match(monolith,/alchemistSpecial:\\(\\)=>dbClasses\\.alchemistVolatileFlask\\(\\)/);\nassert.doesNotMatch(monolith,/async function rogueSteal\\(/,\'Rogue Steal still lives in monolith\');\nassert.doesNotMatch(monolith,/rogueSteal=async function/,\'Rogue Steal override still lives in monolith\');\nassert.doesNotMatch(monolith,/bloodmageReplenish=async function|async function bloodmageReplenish\\(/,\'Bloodmage Replenish still lives in monolith\');\nassert.doesNotMatch(monolith,/bloodmageExsanguinate=async function|async function bloodmageExsanguinate\\(/,\'Bloodmage Exsanguinate still lives in monolith\');\nassert.doesNotMatch(monolith,/db060BloodmageBase/,\'Blood Price base-capture shadow still lives in monolith\');\nassert.doesNotMatch(monolith,/alchemistVolatileFlaskV16/,\'Alchemist Volatile Flask still lives in monolith\');\nassert.doesNotMatch(monolith,/beta021RoguePowerStealChance/,\'Rogue power-steal helper still lives in monolith\');\n',
    "complex-action anti-shadow guards"
)
runtime_test=replace_once(
    runtime_test,
    'console.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle, routing and simple action mechanics are owned behind DiceboundClasses");',
    'console.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle, routing and bespoke action mechanics are owned behind DiceboundClasses");',
    "runtime owner PASS label"
)
write("tools/test_classes_runtime.js",runtime_test)

action_test=r'''"use strict";
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
let boardLevel=2,encounterLead={boss:false},randomQueue=[],effects=new Set(),damageAllResult=47,ringText="",potionUses=0,applied=[];
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
  pickElementKey:()=>{nextRandom();return "fire";},triggerElementEffect:(key,target,options)=>{push("element",`${key}/${target?.name}/${options?.source}`);return {message:"Fire erupts."};}
});

(async()=>{
  await classes.bloodmageBloodletting();
  assert.equal(player.lifeSteal,.10,"Bloodletting did not restore Lifesteal");
  assert.deepEqual(events,["flash:🩸 Bloodletting restores fuel","attackLS:0.22","ui"]);

  player={classId:"cleric",maxHp:100,hp:40,attack:20,clericFaith:100,combatShield:0,combatActionCount:0};enemy={name:"Dummy",hp:100,maxHp:100};enemies=[enemy];busy=false;events=[];damageAllResult=47;
  await classes.clericConsecration();
  assert.equal(player.clericFaith,0);assert.equal(player.hp,62);assert.equal(player.combatShield,1);assert.equal(player.combatActionCount,1);
  assert.deepEqual(events,["busy:true","heal:22","damageAll:31/0.75","text:☀️ Consecration spends 100 Faith, heals 22 HP, raises a Barrier and deals 47 Light-touched damage across the pack.","flash:☀️ CONSECRATION","holy","ui","delay:760","response:false"]);

  player={classId:"beastmaster",beastStance:"aggressive"};busy=false;events=[];
  classes.cycleBeastStance();classes.cycleBeastStance();classes.cycleBeastStance();
  assert.equal(player.beastStance,"aggressive");assert.deepEqual(events,["flash:🐾 Defensive stance","ui","flash:🐾 Support stance","ui","flash:🐾 Aggressive stance","ui"]);

  player={classId:"rogue",luck:1,gold:0,potions:1,rogueStealUsed:false,combatActionCount:0};enemy={name:"Pocket Dummy",hp:1000,maxHp:1000};enemies=[enemy];busy=false;events=[];applied=[];boardLevel=2;randomQueue=[.1,.5,.2,.4,.1];
  assert.equal(classes.roguePowerStealChance(1),.35);
  await classes.rogueSteal();
  assert.equal(player.rogueStealUsed,true);assert.equal(player.combatActionCount,1);assert.equal(player.gold,28);assert.equal(player.potions,2);assert.deepEqual(applied,["stolen"]);assert.deepEqual(player._beta021LastStealPower,{chance:.35,roll:.2});assert.equal(randomQueue.length,0,"Rogue RNG draw count drifted");
  assert.ok(events.includes("response:false"));assert.ok(events.includes("coin"));

  player={classId:"bloodmage",maxHp:100,hp:40,ultimateCharge:0,combatActionCount:0,equipment:{}};enemy={name:"Blood Dummy",hp:600,maxHp:1000};enemies=[enemy];busy=false;events=[];ringText="";
  await classes.bloodmageReplenish();
  assert.equal(player.hp,56);assert.equal(enemy.hp,740);assert.equal(player.ultimateCharge,20);assert.equal(player.combatActionCount,1);assert.ok(events.includes("response:true"),"Replenish lost guarded enemy response");

  player={classId:"bloodmage",maxHp:100,hp:100,attack:20,damageBonus:0,bossDamage:0,bloodmageExsanguinateCostMult:1,bloodmageExsanguinateDamageMult:1,combatAttackCount:0,combatActionCount:0,equipment:{}};
  enemies=[{name:"A",hp:5000,maxHp:5000},{name:"B",hp:5000,maxHp:5000}];enemy=enemies[0];encounterLead={boss:false};busy=false;events=[];effects.clear();ringText="";
  await classes.bloodmageExsanguinate();
  assert.equal(player.hp,88);assert.equal(5000-enemies[0].hp,72);assert.equal(5000-enemies[1].hp,47);assert.equal(player.combatAttackCount,1);assert.equal(player.combatActionCount,1);assert.ok(events.includes("response:false"));

  player={classId:"bloodmage",maxHp:100,hp:100,attack:20,damageBonus:0,bossDamage:0,bloodmageExsanguinateCostMult:1,bloodmageExsanguinateDamageMult:1,combatAttackCount:0,combatActionCount:0,equipment:{}};
  enemies=[{name:"A",hp:5000,maxHp:5000},{name:"B",hp:5000,maxHp:5000}];enemy=enemies[0];busy=false;events=[];effects=new Set(["blood_price"]);
  await classes.bloodmageExsanguinate();
  assert.equal(5000-enemies[0].hp,83);assert.equal(5000-enemies[1].hp,54);assert.equal(player.damageBonus,.08);assert.equal(player._db060BloodPriceStacks,1);assert.ok(events.some(entry=>entry.startsWith("history:🩸📈 Blood Price")),"Blood Price history/stack ordering drifted");

  player={classId:"alchemist",maxHp:100,hp:100,attack:15,potions:3,potionPower:.5,alchemistFreeFlask:0,alchemistElementChance:0,alchemistFlaskBonus:0,combatActionCount:0,ultimateAttackGain:12,ultimateCharge:0,guardCooldown:2};
  enemy={name:"Flask Dummy",hp:5000,maxHp:5000};enemies=[enemy,{name:"Flask Dummy B",hp:5000,maxHp:5000}];busy=false;events=[];randomQueue=[.5,.5];potionUses=0;damageAllResult=54;effects.clear();
  await classes.alchemistVolatileFlask();
  assert.equal(player.potions,2);assert.equal(potionUses,1);assert.equal(player.guardCooldown,0);assert.equal(player.combatActionCount,1);assert.equal(player.ultimateCharge,9);assert.equal(randomQueue.length,0,"Alchemist RNG draw count drifted");
  assert.ok(events.includes("damageAll:54/0.72"));assert.ok(events.includes("response:false"));

  console.log("Classes bespoke action-mechanics owner PASS: Rogue, Bloodmage, Alchemist, Bloodletting, Consecration and Beastmaster preserve deterministic sequencing");
})().catch(error=>{console.error(error);process.exitCode=1;});
'''
write("tools/test_class_action_mechanics.js",action_test)

print("Classes complex action mechanics materialized")
