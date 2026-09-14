#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def replace_once(path, old, new, label):
    source=path.read_text(encoding='utf-8')
    count=source.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    path.write_text(source.replace(old,new,1),encoding='utf-8')

registry=ROOT/'runtime/js/classes/registry.js'
mono=ROOT/'runtime/js/dicebound.js'
manifest=ROOT/'runtime/js/module-manifest.json'
index=ROOT/'runtime/index.html'
project=ROOT/'wrapper-source/config/project.json'
test=ROOT/'tools/test_classes_runtime.js'
actions=ROOT/'runtime/js/classes/actions.js'
action_test=ROOT/'tools/test_class_action_mechanics.js'

if actions.exists():
    raise SystemExit('classes/actions.js already exists')

actions.write_text(r'''(() => {
  "use strict";

  const OWNER="classes/runtime-action-mechanics";
  let deps=null;

  function configure(next={}){
    for(const name of [
      "getPlayer","getCurrentEnemy","getCombatBusy","setCombatBusy","basicAttack","identityFlash","updateCombatUI",
      "healPlayer","damageAll","setCombatText","sfxHoly","delay","livingEnemies","winCombat","resolveEnemyResponse","isClassActive"
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

  const api=Object.freeze({owner:OWNER,apiVersion:1,configure,bloodmageBloodletting,clericConsecration,cycleBeastStance});
  const facade=window.DiceboundClasses;
  if(!facade?._installActions)throw new Error("classes/actions.js requires DiceboundClasses facade before loading.");
  facade._installActions(api);
})();
''',encoding='utf-8')

replace_once(registry,
'''  let runtimeOwner=null,runtime=null;\n''',
'''  let runtimeOwner=null,runtime=null,actionsOwner=null,actionsRuntime=null;\n''',
'registry owner state')

replace_once(registry,
'''  function configure(next={}){\n    if(!runtimeOwner)throw new Error("DiceboundClasses runtime owner has not been installed.");\n    runtime=runtimeOwner.configure(next);\n    return api;\n  }\n  function requireRuntime(name){\n''',
'''  function configure(next={}){\n    if(!runtimeOwner)throw new Error("DiceboundClasses runtime owner has not been installed.");\n    runtime=runtimeOwner.configure(next);\n    return api;\n  }\n  function installActions(owner){\n    if(!owner||typeof owner.configure!=="function")throw new Error("DiceboundClasses action-mechanics owner is invalid.");\n    actionsOwner=owner;\n    return api;\n  }\n  function configureActionMechanics(next={}){\n    if(!actionsOwner)throw new Error("DiceboundClasses action-mechanics owner has not been installed.");\n    actionsRuntime=actionsOwner.configure(next);\n    return api;\n  }\n  function requireActions(name){\n    const fn=actionsRuntime?.[name];\n    if(typeof fn!=="function")throw new Error(`DiceboundClasses action mechanic ${name}() is not configured.`);\n    return fn;\n  }\n  function callAction(name,...args){return requireActions(name)(...args);}\n  function requireRuntime(name){\n''',
'registry action owner install')

replace_once(registry,
'''    configure,\n    configureActions:next=>call("configureActions",next),\n    performAction:kind=>call("performAction",kind),\n''',
'''    configure,\n    configureActionMechanics,\n    configureActions:next=>call("configureActions",next),\n    performAction:kind=>call("performAction",kind),\n    bloodmageBloodletting:()=>callAction("bloodmageBloodletting"),\n    clericConsecration:()=>callAction("clericConsecration"),\n    cycleBeastStance:()=>callAction("cycleBeastStance"),\n''',
'facade action methods')

replace_once(registry,
'''    _installRuntime:installRuntime,\n''',
'''    _installRuntime:installRuntime,\n    _installActions:installActions,\n''',
'facade private action installer')

replace_once(index,
'''<script src="js/classes/runtime.js"></script>\n<script src="js/classes/invoker.js"></script>''',
'''<script src="js/classes/runtime.js"></script>\n<script src="js/classes/actions.js"></script>\n<script src="js/classes/invoker.js"></script>''',
'index actions script')

replace_once(project,
'''    "js/classes/runtime.js",\n    "js/classes/invoker.js",''',
'''    "js/classes/runtime.js",\n    "js/classes/actions.js",\n    "js/classes/invoker.js",''',
'wrapper actions script')

replace_once(manifest,
'''    "classes-runtime",\n    "classes-invoker",''',
'''    "classes-runtime",\n    "classes-actions",\n    "classes-invoker",''',
'manifest actions load order')

replace_once(manifest,
'''    {\n      "id": "classes-invoker",\n      "path": "js/classes/invoker.js",''',
'''    {\n      "id": "classes-actions",\n      "path": "js/classes/actions.js",\n      "domain": "classes/runtime-action-mechanics",\n      "status": "extracted",\n      "requires": [\n        "classes-registry",\n        "classes-runtime"\n      ],\n      "provides": []\n    },\n    {\n      "id": "classes-invoker",\n      "path": "js/classes/invoker.js",''',
'manifest actions module')

replace_once(mono,
'''  async function bloodmageBloodletting(){if(combatBusy||!currentEnemy)return;const oldLS=player.lifeSteal;player.lifeSteal+=.12;identityFlash("🩸 Bloodletting restores fuel");try{await playerAttack();}finally{player.lifeSteal=oldLS;}updateCombatUI();}\n\n''',
'''\n''',
'remove bloodmage Bloodletting shadow')

replace_once(mono,
'''  async function clericConsecration(){if(combatBusy||!currentEnemy||(player.clericFaith||0)<100)return;combatBusy=true;player.clericFaith=0;player.combatActionCount++;const heal=healPlayer(Math.ceil(player.maxHp*.22));player.combatShield+=1;const dmg=Math.round(player.attack*1.15+player.maxHp*.08),dealt=damageAll(dmg,.75);setCombatText(`☀️ Consecration spends 100 Faith, heals ${heal} HP, raises a Barrier and deals ${dealt} Light-touched damage across the pack.`);identityFlash("☀️ CONSECRATION");sfx.holy();updateCombatUI();await delay(760);if(!livingEnemies().length)return winCombat();await resolveEnemyResponse(false);}\n\n  function cycleBeastStance(){if(!classIdentityActive("beastmaster")||combatBusy)return;const order=["aggressive","defensive","support"],i=order.indexOf(player.beastStance);player.beastStance=order[(i+1)%order.length];identityFlash(`🐾 ${player.beastStance[0].toUpperCase()+player.beastStance.slice(1)} stance`);updateCombatUI();}\n''',
'''\n''',
'remove cleric/beast shadows')

replace_once(mono,
'''  dbClasses.configureActions({\n    basicAttack:()=>playerAttack(),\n    manaAttack:()=>occultChannelAttack(),\n    bloodmageAttack:()=>bloodmageBloodletting(),\n''',
'''  dbClasses.configureActionMechanics({\n    getPlayer:()=>player,\n    getCurrentEnemy:()=>currentEnemy,\n    getCombatBusy:()=>combatBusy,\n    setCombatBusy:value=>{combatBusy=!!value;},\n    basicAttack:()=>playerAttack(),\n    identityFlash:text=>identityFlash(text),\n    updateCombatUI:()=>updateCombatUI(),\n    healPlayer:amount=>healPlayer(amount),\n    damageAll:(amount,falloff=1)=>damageAll(amount,falloff),\n    setCombatText:text=>setCombatText(text),\n    sfxHoly:()=>sfx.holy(),\n    delay:ms=>delay(ms),\n    livingEnemies:()=>livingEnemies(),\n    winCombat:()=>winCombat(),\n    resolveEnemyResponse:guarded=>resolveEnemyResponse(guarded),\n    isClassActive:id=>classIdentityActive(id)\n  });\n  dbClasses.configureActions({\n    basicAttack:()=>playerAttack(),\n    manaAttack:()=>occultChannelAttack(),\n    bloodmageAttack:()=>dbClasses.bloodmageBloodletting(),\n''',
'compose action mechanics owner')

replace_once(mono,
'''    rogueSpecial:()=>rogueSteal(),\n    clericSpecial:()=>clericConsecration(),\n    beastmasterSpecial:()=>cycleBeastStance()\n''',
'''    rogueSpecial:()=>rogueSteal(),\n    clericSpecial:()=>dbClasses.clericConsecration(),\n    beastmasterSpecial:()=>dbClasses.cycleBeastStance()\n''',
'route simple bespoke actions')

replace_once(mono,
'''    clericConsecration:async()=>{dbClassesOracleSetup('cleric',{maxHp:100,hp:40,attack:20,clericFaith:100,combatShield:0,combatActionCount:0},[{hp:5000,maxHp:5000},{hp:5000,maxHp:5000}]);await dbClassesOracleWithoutResponse(()=>clericConsecration());return dbClassesOracleState();},\n    beastmasterStances:()=>{dbClassesOracleSetup('beastmaster');const sequence=[player.beastStance];for(let i=0;i<4;i++){cycleBeastStance();sequence.push(player.beastStance);}return {sequence,state:dbClassesOracleState()};},\n''',
'''    clericConsecration:async()=>{dbClassesOracleSetup('cleric',{maxHp:100,hp:40,attack:20,clericFaith:100,combatShield:0,combatActionCount:0},[{hp:5000,maxHp:5000},{hp:5000,maxHp:5000}]);await dbClassesOracleWithoutResponse(()=>dbClasses.clericConsecration());return dbClassesOracleState();},\n    beastmasterStances:()=>{dbClassesOracleSetup('beastmaster');const sequence=[player.beastStance];for(let i=0;i<4;i++){dbClasses.cycleBeastStance();sequence.push(player.beastStance);}return {sequence,state:dbClassesOracleState()};},\n''',
'Classes oracle simple action adapters')

replace_once(test,
'''const runtimePath=path.join(root,"runtime","js","classes","runtime.js");\nconst monoPath=''',
'''const runtimePath=path.join(root,"runtime","js","classes","runtime.js");\nconst actionsPath=path.join(root,"runtime","js","classes","actions.js");\nconst monoPath=''',
'test actions path')
replace_once(test,
'''vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});\n\nconst classes=''',
'''vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});\nvm.runInContext(fs.readFileSync(actionsPath,"utf8"),context,{filename:actionsPath});\n\nconst classes=''',
'test actions load')
replace_once(test,
'''assert.equal(context.window.DiceboundClassRuntime,undefined,"focused Classes runtime leaked as a peer public global");\n''',
'''assert.equal(context.window.DiceboundClassRuntime,undefined,"focused Classes runtime leaked as a peer public global");\nassert.equal(context.window.DiceboundClassActions,undefined,"focused Classes action mechanics leaked as a peer public global");\n''',
'test no peer actions global')
replace_once(test,
'''assert.doesNotMatch(monolith,/specialAttackBtn\\.addEventListener\\("click",\\(\\)=>\\{if\\(classHasMechanic\\("mana"\\)\\)/,'historical Special class-routing branch still lives in monolith');\n\nconst manifest=''',
'''assert.doesNotMatch(monolith,/specialAttackBtn\\.addEventListener\\("click",\\(\\)=>\\{if\\(classHasMechanic\\("mana"\\)\\)/,'historical Special class-routing branch still lives in monolith');\nassert.match(monolith,/dbClasses\\.configureActionMechanics\\(\\{/,'monolith does not configure the Classes action-mechanics owner');\nassert.doesNotMatch(monolith,/async function bloodmageBloodletting\\(/,'Bloodmage Bloodletting still lives in monolith');\nassert.doesNotMatch(monolith,/async function clericConsecration\\(/,'Cleric Consecration still lives in monolith');\nassert.doesNotMatch(monolith,/function cycleBeastStance\\(/,'Beastmaster stance mechanics still live in monolith');\nassert.match(monolith,/bloodmageAttack:\(\)=>dbClasses\\.bloodmageBloodletting\\(\\)/);\nassert.match(monolith,/clericSpecial:\(\)=>dbClasses\\.clericConsecration\\(\\)/);\nassert.match(monolith,/beastmasterSpecial:\(\)=>dbClasses\\.cycleBeastStance\\(\\)/);\n\nconst manifest=''',
'test simple action anti-shadow')
replace_once(test,
'''const runtimeModule=manifest.modules.find(entry=>entry.id==="classes-runtime");\nassert.ok(runtimeModule,"classes-runtime manifest owner missing");assert.equal(runtimeModule.path,"js/classes/runtime.js");assert.deepEqual(runtimeModule.requires,["classes-registry"]);assert.deepEqual(runtimeModule.provides,[],"focused Classes runtime should not publish a peer public facade");\nconst order=manifest.loadOrder;assert.equal(order[order.indexOf("classes-registry")+1],"classes-runtime","Classes runtime must load immediately after registry facade");\nconst scripts=[...fs.readFileSync(indexPath,"utf8").matchAll(/<script\\b[^>]*\\bsrc=["']([^"']+)["']/gi)].map(match=>match[1]);assert.ok(scripts.indexOf("js/classes/registry.js")<scripts.indexOf("js/classes/runtime.js"));assert.ok(scripts.indexOf("js/classes/runtime.js")<scripts.indexOf("js/dicebound.js"));\n\nconsole.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle and combat action routing are owned by DiceboundClasses");\n''',
'''const runtimeModule=manifest.modules.find(entry=>entry.id==="classes-runtime"),actionsModule=manifest.modules.find(entry=>entry.id==="classes-actions");\nassert.ok(runtimeModule,"classes-runtime manifest owner missing");assert.equal(runtimeModule.path,"js/classes/runtime.js");assert.deepEqual(runtimeModule.requires,["classes-registry"]);assert.deepEqual(runtimeModule.provides,[],"focused Classes runtime should not publish a peer public facade");\nassert.ok(actionsModule,"classes-actions manifest owner missing");assert.equal(actionsModule.path,"js/classes/actions.js");assert.deepEqual(actionsModule.requires,["classes-registry","classes-runtime"]);assert.deepEqual(actionsModule.provides,[],"focused Classes actions should not publish a peer public facade");\nconst order=manifest.loadOrder;assert.equal(order[order.indexOf("classes-registry")+1],"classes-runtime","Classes runtime must load immediately after registry facade");assert.equal(order[order.indexOf("classes-runtime")+1],"classes-actions","Classes actions must load immediately after runtime owner");\nconst scripts=[...fs.readFileSync(indexPath,"utf8").matchAll(/<script\\b[^>]*\\bsrc=["']([^"']+)["']/gi)].map(match=>match[1]);assert.ok(scripts.indexOf("js/classes/registry.js")<scripts.indexOf("js/classes/runtime.js"));assert.ok(scripts.indexOf("js/classes/runtime.js")<scripts.indexOf("js/classes/actions.js"));assert.ok(scripts.indexOf("js/classes/actions.js")<scripts.indexOf("js/dicebound.js"));\n\nconsole.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle, routing and simple action mechanics are owned behind DiceboundClasses");\n''',
'test manifest/actions completion')

action_test.write_text(r'''"use strict";
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
''',encoding='utf-8')

print('Classes simple bespoke action mechanics materialized')
