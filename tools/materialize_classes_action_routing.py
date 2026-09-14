#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def replace_once(path, old, new, label):
    source=path.read_text(encoding='utf-8')
    count=source.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    path.write_text(source.replace(old,new,1),encoding='utf-8')

runtime=ROOT/'runtime/js/classes/runtime.js'
registry=ROOT/'runtime/js/classes/registry.js'
mono=ROOT/'runtime/js/dicebound.js'
test=ROOT/'tools/test_classes_runtime.js'

replace_once(runtime,
'''  let deps=null;\n''',
'''  let deps=null,actionDeps=null;\n''',
'runtime action state')

replace_once(runtime,
'''  function snapshot(){return Object.freeze({...slimeRougeState});}\n\n  const api=Object.freeze({\n    owner:OWNER,apiVersion:1,configure,identityId,active,mechanicsFor,capabilities,hasMechanic,\n    forceSlimeRouge,prepareSlimeRougeBorrowing,finishSlimeRougeBorrowing,clearSlimeRougeRuntime,snapshot\n  });\n''',
'''  function snapshot(){return Object.freeze({...slimeRougeState});}\n\n  function configureActions(next={}){\n    for(const name of [\n      "basicAttack","manaAttack","bloodmageAttack","guard","bloodmageGuard","potion","ultimate",\n      "manaSpecial","bloodmageSpecial","rogueSpecial","clericSpecial","beastmasterSpecial"\n    ]){\n      if(typeof next?.[name]!=="function")throw new Error(`Classes action routing requires ${name}().`);\n    }\n    actionDeps=next;\n    return api;\n  }\n  function actions(){if(!actionDeps)throw new Error("Classes action routing must be configured before use.");return actionDeps;}\n  function performAction(kind){\n    const action=actions();\n    if(kind==="attack"){\n      if(active("bloodmage"))return action.bloodmageAttack();\n      if(hasMechanic("mana"))return action.manaAttack();\n      return action.basicAttack();\n    }\n    if(kind==="guard")return active("bloodmage")?action.bloodmageGuard():action.guard();\n    if(kind==="potion")return action.potion();\n    if(kind==="ultimate")return action.ultimate();\n    if(kind==="special"){\n      if(hasMechanic("mana"))return action.manaSpecial();\n      if(active("bloodmage"))return action.bloodmageSpecial();\n      if(active("rogue"))return action.rogueSpecial();\n      if(active("cleric"))return action.clericSpecial();\n      if(active("beastmaster"))return action.beastmasterSpecial();\n      return undefined;\n    }\n    throw new Error(`Unknown Classes combat action: ${kind}`);\n  }\n\n  const api=Object.freeze({\n    owner:OWNER,apiVersion:1,configure,configureActions,identityId,active,mechanicsFor,capabilities,hasMechanic,performAction,\n    forceSlimeRouge,prepareSlimeRougeBorrowing,finishSlimeRougeBorrowing,clearSlimeRougeRuntime,snapshot\n  });\n''',
'runtime action routing')

replace_once(registry,
'''    createUltimateSupportRegistry,\n    configure,\n    identityId:()=>call("identityId"),\n''',
'''    createUltimateSupportRegistry,\n    configure,\n    configureActions:next=>call("configureActions",next),\n    performAction:kind=>call("performAction",kind),\n    identityId:()=>call("identityId"),\n''',
'facade action API')

old_dispatch='''  // Replace the four original action buttons once, removing old stacked listeners and giving class identity one clean dispatch path.\n  function replaceCombatButton(id,handler){const old=$(id);if(!old)return null;const neo=old.cloneNode(true);old.replaceWith(neo);neo.addEventListener("click",handler);return neo;}\n  replaceCombatButton("attackBtn",()=>{if(classIdentityActive("bloodmage"))bloodmageBloodletting();else if(classHasMechanic("mana"))occultChannelAttack();else playerAttack();});\n  replaceCombatButton("guardBtn",()=>{if(classIdentityActive("bloodmage"))bloodmageReplenish();else identityGuardAction();});\n  replaceCombatButton("potionBtn",()=>identityPotionAction());\n  replaceCombatButton("ultimateBtn",()=>useUltimate());\n  specialAttackBtn.addEventListener("click",()=>{if(classHasMechanic("mana"))occultSpellAttack();else if(classIdentityActive("bloodmage"))bloodmageExsanguinate();else if(classIdentityActive("rogue"))rogueSteal();else if(classIdentityActive("cleric"))clericConsecration();else if(classIdentityActive("beastmaster"))cycleBeastStance();});\n'''
new_dispatch='''  // Classes owns class-action selection policy. Generic Combat/Consumable/Ultimate\n  // resolution remains in its existing owners and is injected as collaborators.\n  dbClasses.configureActions({\n    basicAttack:()=>playerAttack(),\n    manaAttack:()=>occultChannelAttack(),\n    bloodmageAttack:()=>bloodmageBloodletting(),\n    guard:()=>identityGuardAction(),\n    bloodmageGuard:()=>bloodmageReplenish(),\n    potion:()=>identityPotionAction(),\n    ultimate:()=>useUltimate(),\n    manaSpecial:()=>occultSpellAttack(),\n    bloodmageSpecial:()=>bloodmageExsanguinate(),\n    rogueSpecial:()=>rogueSteal(),\n    clericSpecial:()=>clericConsecration(),\n    beastmasterSpecial:()=>cycleBeastStance()\n  });\n\n  // Replace the four original action buttons once, removing old stacked listeners.\n  function replaceCombatButton(id,handler){const old=$(id);if(!old)return null;const neo=old.cloneNode(true);old.replaceWith(neo);neo.addEventListener("click",handler);return neo;}\n  replaceCombatButton("attackBtn",()=>dbClasses.performAction("attack"));\n  replaceCombatButton("guardBtn",()=>dbClasses.performAction("guard"));\n  replaceCombatButton("potionBtn",()=>dbClasses.performAction("potion"));\n  replaceCombatButton("ultimateBtn",()=>dbClasses.performAction("ultimate"));\n  specialAttackBtn.addEventListener("click",()=>dbClasses.performAction("special"));\n'''
replace_once(mono,old_dispatch,new_dispatch,'monolith action dispatch')

insert='''\nconst actionTrace=[];\nconst actionCallbacks={};\nfor(const name of ["basicAttack","manaAttack","bloodmageAttack","guard","bloodmageGuard","potion","ultimate","manaSpecial","bloodmageSpecial","rogueSpecial","clericSpecial","beastmasterSpecial"]){\n  actionCallbacks[name]=()=>{actionTrace.push(name);return name;};\n}\nclasses.configureActions(actionCallbacks);\nfunction routed(classId,kind){player={classId};actionTrace.length=0;const result=classes.performAction(kind);return {result,trace:[...actionTrace]};}\nassert.deepEqual(routed("ranger","attack"),{result:"basicAttack",trace:["basicAttack"]});\nassert.deepEqual(routed("sorcerer","attack"),{result:"manaAttack",trace:["manaAttack"]});\nassert.deepEqual(routed("bloodmage","attack"),{result:"bloodmageAttack",trace:["bloodmageAttack"]});\nassert.deepEqual(routed("ranger","guard"),{result:"guard",trace:["guard"]});\nassert.deepEqual(routed("bloodmage","guard"),{result:"bloodmageGuard",trace:["bloodmageGuard"]});\nassert.deepEqual(routed("ranger","potion"),{result:"potion",trace:["potion"]});\nassert.deepEqual(routed("ranger","ultimate"),{result:"ultimate",trace:["ultimate"]});\nassert.deepEqual(routed("sorcerer","special"),{result:"manaSpecial",trace:["manaSpecial"]});\nassert.deepEqual(routed("bloodmage","special"),{result:"bloodmageSpecial",trace:["bloodmageSpecial"]});\nassert.deepEqual(routed("rogue","special"),{result:"rogueSpecial",trace:["rogueSpecial"]});\nassert.deepEqual(routed("cleric","special"),{result:"clericSpecial",trace:["clericSpecial"]});\nassert.deepEqual(routed("beastmaster","special"),{result:"beastmasterSpecial",trace:["beastmasterSpecial"]});\nassert.deepEqual(routed("ranger","special"),{result:undefined,trace:[]});\nassert.throws(()=>classes.performAction("bogus"),/Unknown Classes combat action/);\n'''
replace_once(test,
'''classes.clearSlimeRougeRuntime();\n\nconst monolith=fs.readFileSync(monoPath,"utf8"),runInit=fs.readFileSync(runInitPath,"utf8");\n''',
'''classes.clearSlimeRougeRuntime();\n'''+insert+'''\nconst monolith=fs.readFileSync(monoPath,"utf8"),runInit=fs.readFileSync(runInitPath,"utf8");\n''',
'action routing tests')

replace_once(test,
'''assert.match(runInit,/deps\\.finishSlimeRougeBorrowing\\(\\)/);\n\nconst manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));\n''',
'''assert.match(runInit,/deps\\.finishSlimeRougeBorrowing\\(\\)/);\nassert.match(monolith,/dbClasses\\.configureActions\\(\\{/,'monolith does not compose Classes action routing');\nassert.match(monolith,/replaceCombatButton\\("attackBtn",\\(\\)=>dbClasses\\.performAction\\("attack"\\)\\)/);\nassert.match(monolith,/replaceCombatButton\\("guardBtn",\\(\\)=>dbClasses\\.performAction\\("guard"\\)\\)/);\nassert.match(monolith,/replaceCombatButton\\("potionBtn",\\(\\)=>dbClasses\\.performAction\\("potion"\\)\\)/);\nassert.match(monolith,/replaceCombatButton\\("ultimateBtn",\\(\\)=>dbClasses\\.performAction\\("ultimate"\\)\\)/);\nassert.match(monolith,/specialAttackBtn\\.addEventListener\\("click",\\(\\)=>dbClasses\\.performAction\\("special"\\)\\)/);\nassert.doesNotMatch(monolith,/replaceCombatButton\\("attackBtn",\\(\\)=>\\{if\\(classIdentityActive\\("bloodmage"\\)\\)/,'historical Attack class-routing branch still lives in monolith');\nassert.doesNotMatch(monolith,/specialAttackBtn\\.addEventListener\\("click",\\(\\)=>\\{if\\(classHasMechanic\\("mana"\\)\\)/,'historical Special class-routing branch still lives in monolith');\n\nconst manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));\n''',
'action anti-shadow guards')

replace_once(test,
'''console.log("Classes runtime owner PASS: identity, capabilities and Slime Rouge borrowing lifecycle route through DiceboundClasses without raw state sharing");\n''',
'''console.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle and combat action routing are owned by DiceboundClasses");\n''',
'test status text')

print('Classes combat action routing materialized')
