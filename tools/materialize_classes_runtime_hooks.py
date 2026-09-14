from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]

def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def write(rel,text): (ROOT/rel).write_text(text,encoding='utf-8',newline='\n')
def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)

hooks=r'''(() => {
  "use strict";

  const OWNER="classes/runtime-hooks";
  let deps=null;

  function configure(next={}){
    for(const name of ["getPlayer","isClassActive","clamp","scaleBerserkerRageDamage","hasEffect"]){
      if(typeof next?.[name]!=="function")throw new Error(`Classes runtime hooks require ${name}().`);
    }
    deps=next;
    return api;
  }
  function runtime(){if(!deps)throw new Error("Classes runtime hooks must be configured before use.");return deps;}

  function legacyMonkDodge(base){
    const rt=runtime();
    return rt.isClassActive("monk")?1-(1-base)*(1-base):base;
  }

  function identityDodgeAdjustments(base){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.isClassActive("monk"))base=rt.clamp(base+(player.monkCombo||0)*.018,0,.92);
    if(rt.isClassActive("clown")&&player.clownGimmick==="Big Shoes")base=rt.clamp(base+.12,0,.92);
    return base;
  }

  function berserkerDamage(amount){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.isClassActive("berserker")&&player.maxHp>0)return rt.scaleBerserkerRageDamage(amount,player);
    return amount;
  }

  function ninjaExecutionDamage(amount,ignoreDefense=false){
    const player=runtime().getPlayer();
    if(player._ninjaExecution)return Object.freeze({amount:amount*1.65,ignoreDefense:true});
    return Object.freeze({amount,ignoreDefense:!!ignoreDefense});
  }

  function syncOuroborosAttack(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.isClassActive("ouroboros"))return false;
    if(rt.hasEffect("perfect_specimen")){
      const delta=(Number(player.attack)||0)-30;
      if(delta>0){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=30;}
      else if(player.attack<30)player.attack=30;
      return true;
    }
    const delta=(Number(player.attack)||0)-10;
    if(Math.abs(delta)>.0001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=10;}
    return true;
  }

  function syncOuroborosEconomy(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.isClassActive("ouroboros"))return false;
    if((player.goldAttackScale||0)!==0){
      player.v27OuroGoldEchoScale=(player.v27OuroGoldEchoScale||0)+player.goldAttackScale*.10;
      player.goldAttackScale=0;
    }
    const desired=(player.gold||0)*(player.v27OuroGoldEchoScale||0),old=player.v27OuroGoldEchoApplied||0;
    if(Math.abs(desired-old)>.0000001){
      player.doubleStrike=Math.max(0,(player.doubleStrike||0)+(desired-old));
      player.v27OuroGoldEchoApplied=desired;
    }
    syncOuroborosAttack();
    return true;
  }

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,legacyMonkDodge,identityDodgeAdjustments,berserkerDamage,ninjaExecutionDamage,
    syncOuroborosAttack,syncOuroborosEconomy
  });
  const facade=window.DiceboundClasses;
  if(!facade?._installHooks)throw new Error("classes/hooks.js requires DiceboundClasses facade before loading.");
  facade._installHooks(api);
})();
'''
write('runtime/js/classes/hooks.js',hooks)

registry=read('runtime/js/classes/registry.js')
registry=replace_once(registry,
'''  let runtimeOwner=null,runtime=null,actionsOwner=null,actionsRuntime=null;''',
'''  let runtimeOwner=null,runtime=null,actionsOwner=null,actionsRuntime=null,hooksOwner=null,hooksRuntime=null;''','registry hook state')
registry=replace_once(registry,
'''  function requireActions(name){
    const fn=actionsRuntime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses action mechanic ${name}() is not configured.`);
    return fn;
  }
  function callAction(name,...args){return requireActions(name)(...args);}
''',
'''  function requireActions(name){
    const fn=actionsRuntime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses action mechanic ${name}() is not configured.`);
    return fn;
  }
  function callAction(name,...args){return requireActions(name)(...args);}
  function installHooks(owner){
    if(!owner||typeof owner.configure!=="function")throw new Error("DiceboundClasses runtime-hooks owner is invalid.");
    hooksOwner=owner;
    return api;
  }
  function configureRuntimeHooks(next={}){
    if(!hooksOwner)throw new Error("DiceboundClasses runtime-hooks owner has not been installed.");
    hooksRuntime=hooksOwner.configure(next);
    return api;
  }
  function requireHook(name){
    const fn=hooksRuntime?.[name];
    if(typeof fn!=="function")throw new Error(`DiceboundClasses runtime hook ${name}() is not configured.`);
    return fn;
  }
  function callHook(name,...args){return requireHook(name)(...args);}
''','registry hook helpers')
registry=replace_once(registry,
'''    configure,
    configureActionMechanics,
    configureActions:next=>call("configureActions",next),''',
'''    configure,
    configureActionMechanics,
    configureRuntimeHooks,
    configureActions:next=>call("configureActions",next),''','registry hook configure API')
registry=replace_once(registry,
'''    alchemistVolatileFlask:()=>callAction("alchemistVolatileFlask"),
    identityId:()=>call("identityId"),''',
'''    alchemistVolatileFlask:()=>callAction("alchemistVolatileFlask"),
    legacyMonkDodge:base=>callHook("legacyMonkDodge",base),
    identityDodgeAdjustments:base=>callHook("identityDodgeAdjustments",base),
    berserkerDamage:amount=>callHook("berserkerDamage",amount),
    ninjaExecutionDamage:(amount,ignoreDefense=false)=>callHook("ninjaExecutionDamage",amount,ignoreDefense),
    syncOuroborosAttack:()=>callHook("syncOuroborosAttack"),
    syncOuroborosEconomy:()=>callHook("syncOuroborosEconomy"),
    identityId:()=>call("identityId"),''','registry hook facade API')
registry=replace_once(registry,
'''    _installRuntime:installRuntime,
    _installActions:installActions,
''',
'''    _installRuntime:installRuntime,
    _installActions:installActions,
    _installHooks:installHooks,
''','registry hook installer')
write('runtime/js/classes/registry.js',registry)

mono=read('runtime/js/dicebound.js')
# Configure hook collaborators beside the existing Classes action composition.
anchor='''  dbClasses.configureActionMechanics({\n'''
insert='''  dbClasses.configureRuntimeHooks({
    getPlayer:()=>player,
    isClassActive:id=>classIdentityActive(id),
    clamp:(value,min,max)=>clamp(value,min,max),
    scaleBerserkerRageDamage:(amount,targetPlayer)=>DB_EFFECTIVE_STATS.scaleBerserkerRageDamage(amount,targetPlayer),
    hasEffect:id=>db060HasEffect(id)
  });

'''
if mono.count(anchor)!=1: raise SystemExit(f'hook composition anchor expected once, found {mono.count(anchor)}')
mono=mono.replace(anchor,insert+anchor,1)

mono=replace_once(mono,
'''  const effectiveDodgeChanceV12=effectiveDodgeChance;
  effectiveDodgeChance=function(){const base=effectiveDodgeChanceV12();return classIdentityActive("monk")?1-(1-base)*(1-base):base;};
  const damageEnemyV12=damageEnemy;
  damageEnemy=function(enemy,amount,ignoreDefense=false){if(classIdentityActive("berserker")&&player.maxHp>0)amount=DB_EFFECTIVE_STATS.scaleBerserkerRageDamage(amount,player);return damageEnemyV12(enemy,amount,ignoreDefense);};
''',
'''  const effectiveDodgeChanceV12=effectiveDodgeChance;
  effectiveDodgeChance=function(){return dbClasses.legacyMonkDodge(effectiveDodgeChanceV12());};
  const damageEnemyV12=damageEnemy;
  damageEnemy=function(enemy,amount,ignoreDefense=false){return damageEnemyV12(enemy,dbClasses.berserkerDamage(amount),ignoreDefense);};
''','V12 Monk/Berserker hook drain')
mono=replace_once(mono,
'''  const effectiveDodgeChanceV13=effectiveDodgeChance;
  effectiveDodgeChance=function(){let base=effectiveDodgeChanceV13();if(classIdentityActive("monk"))base=clamp(base+(player.monkCombo||0)*.018,0,.92);if(classIdentityActive("clown")&&player.clownGimmick==="Big Shoes")base=clamp(base+.12,0,.92);return base;};


  const damageEnemyV13=damageEnemy;
  damageEnemy=function(enemy,amount,ignoreDefense=false){if(player._ninjaExecution){amount*=1.65;ignoreDefense=true;}return damageEnemyV13(enemy,amount,ignoreDefense);};
''',
'''  const effectiveDodgeChanceV13=effectiveDodgeChance;
  effectiveDodgeChance=function(){return dbClasses.identityDodgeAdjustments(effectiveDodgeChanceV13());};


  const damageEnemyV13=damageEnemy;
  damageEnemy=function(enemy,amount,ignoreDefense=false){const adjusted=dbClasses.ninjaExecutionDamage(amount,ignoreDefense);return damageEnemyV13(enemy,adjusted.amount,adjusted.ignoreDefense);};
''','V13 identity hook drain')

# Replace the earliest Ouroboros owner with a thin facade adapter.
start='''  function v18SyncOuroborosAttack(){
    if(!classIdentityActive("ouroboros"))return;
    const delta=(Number(player.attack)||0)-10;
    if(Math.abs(delta)>.0001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=10;}
  }
'''
mono=replace_once(mono,start,'''
  function v18SyncOuroborosAttack(){return dbClasses.syncOuroborosAttack();}
''','initial Ouroboros attack hook')
# Remove the later duplicate base-10 rewrite.
mono=replace_once(mono,
'''  /* OUROBOROS: ATTACK IS A CURRENCY FOR ECHO, NOT NORMAL DAMAGE ----------- */
  v18SyncOuroborosAttack=function(){if(!classIdentityActive('ouroboros'))return;const delta=(Number(player.attack)||0)-10;if(Math.abs(delta)>.0001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=10;}};
''',
'''  /* OUROBOROS: ATTACK IS A CURRENCY FOR ECHO, NOT NORMAL DAMAGE ----------- */
  // Runtime conversion policy is owned by DiceboundClasses.
''','later Ouroboros base-10 shadow')
# Replace economy policy body with facade adapter while retaining its compatibility name.
old_econ='''  function v27SyncOuroborosEconomy(){
    if(!classIdentityActive('ouroboros'))return;
    // Any gold->Attack scaling source is converted into the mathematically
    // equivalent dynamic Echo scaling: +1 effective Attack == +10% Echo.
    if((player.goldAttackScale||0)!==0){player.v27OuroGoldEchoScale=(player.v27OuroGoldEchoScale||0)+player.goldAttackScale*.10;player.goldAttackScale=0;}
    const desired=(player.gold||0)*(player.v27OuroGoldEchoScale||0),old=player.v27OuroGoldEchoApplied||0;
    if(Math.abs(desired-old)>.0000001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+(desired-old));player.v27OuroGoldEchoApplied=desired;}
    v18SyncOuroborosAttack();
  }
'''
mono=replace_once(mono,old_econ,'''
  function v27SyncOuroborosEconomy(){return dbClasses.syncOuroborosEconomy();}
''','Ouroboros economy hook')
# Remove final Perfect Specimen wrapper/base capture; hook owner contains final semantics.
mono=replace_once(mono,
'''  // Ouroboros base-30 identity.
  const db060OuroSyncBase=v18SyncOuroborosAttack;
  v18SyncOuroborosAttack=function(){if(!classIdentityActive('ouroboros')||!db060HasEffect('perfect_specimen'))return db060OuroSyncBase();const delta=(Number(player.attack)||0)-30;if(delta>0){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=30;}else if(player.attack<30)player.attack=30;};
''',
'''  // Ouroboros Perfect Specimen baseline is applied inside DiceboundClasses.
''','Perfect Specimen Ouroboros wrapper')
# Route oracle seam directly through public facade for this ownership proof.
mono=replace_once(mono,
'''monkDodge:()=>{dbClassesOracleSetup('monk',{dodge:.10,monkCombo:3});return {chance:effectiveDodgeChance(),state:dbClassesOracleState()};},
    ninjaExecution:()=>{dbClassesOracleSetup('ninja',{attack:20,_ninjaExecution:true},[{hp:1000,maxHp:1000,defense:12}]);const dealt=damageEnemy(currentEnemy,100,false);return {dealt,state:dbClassesOracleState()};},
    ouroborosSync:()=>{dbClassesOracleSetup('ouroboros',{attack:37,doubleStrike:1.20});const before={attack:player.attack,doubleStrike:player.doubleStrike};v18SyncOuroborosAttack();return {before,after:{attack:player.attack,doubleStrike:player.doubleStrike},state:dbClassesOracleState()};},''',
'''monkDodge:()=>{dbClassesOracleSetup('monk',{dodge:.10,monkCombo:3});return {chance:effectiveDodgeChance(),state:dbClassesOracleState()};},
    ninjaExecution:()=>{dbClassesOracleSetup('ninja',{attack:20,_ninjaExecution:true},[{hp:1000,maxHp:1000,defense:12}]);const dealt=damageEnemy(currentEnemy,100,false);return {dealt,state:dbClassesOracleState()};},
    ouroborosSync:()=>{dbClassesOracleSetup('ouroboros',{attack:37,doubleStrike:1.20});const before={attack:player.attack,doubleStrike:player.doubleStrike};dbClasses.syncOuroborosAttack();return {before,after:{attack:player.attack,doubleStrike:player.doubleStrike},state:dbClassesOracleState()};},''','oracle Ouroboros facade route')
for forbidden,label in [
    ('classIdentityActive("monk")?1-(1-base)*(1-base):base','Monk legacy dodge policy'),
    ('player.monkCombo||0)*.018','Monk combo dodge policy'),
    ('player.clownGimmick==="Big Shoes"','Clown dodge policy'),
    ('DB_EFFECTIVE_STATS.scaleBerserkerRageDamage(amount,player)','Berserker damage policy'),
    ('if(player._ninjaExecution){amount*=1.65','Ninja execution policy'),
    ('db060OuroSyncBase','Ouroboros base capture'),
    ("player.v27OuroGoldEchoScale=(player.v27OuroGoldEchoScale||0)+player.goldAttackScale*.10",'Ouroboros economy policy')
]:
    if forbidden in mono: raise SystemExit(f'{label} survived monolith drain')
write('runtime/js/dicebound.js',mono)

# Manifest: add focused internal immediately after actions.
manifest_path=ROOT/'runtime/js/module-manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
if any(m['id']=='classes-hooks' for m in manifest['modules']): raise SystemExit('classes-hooks already exists')
aidx=manifest['loadOrder'].index('classes-actions')
manifest['loadOrder'].insert(aidx+1,'classes-hooks')
entry={"id":"classes-hooks","path":"js/classes/hooks.js","domain":"classes/runtime-combat-and-stat-hook-policy","status":"extracted","requires":["classes-registry","classes-runtime"],"provides":[]}
mid=next(i for i,m in enumerate(manifest['modules']) if m['id']=='classes-actions')
manifest['modules'].insert(mid+1,entry)
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding='utf-8',newline='\n')

# HTML and wrapper-source script order.
index=read('runtime/index.html')
index=replace_once(index,'<script src="js/classes/actions.js"></script>\n<script src="js/classes/invoker.js"></script>','<script src="js/classes/actions.js"></script>\n<script src="js/classes/hooks.js"></script>\n<script src="js/classes/invoker.js"></script>','runtime index hook script')
write('runtime/index.html',index)
project_path=ROOT/'wrapper-source/config/project.json'
project=json.loads(project_path.read_text(encoding='utf-8'))
scripts=project['runtimeScripts']
if 'js/classes/hooks.js' in scripts: raise SystemExit('wrapper source already contains classes/hooks.js')
scripts.insert(scripts.index('js/classes/actions.js')+1,'js/classes/hooks.js')
project_path.write_text(json.dumps(project,indent=2)+"\n",encoding='utf-8',newline='\n')

hook_test=r'''"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON,Math,Number});
for(const rel of ["runtime/js/classes/registry.js","runtime/js/classes/runtime.js","runtime/js/classes/hooks.js"]){
  const file=path.join(root,rel);vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const classes=context.window.DiceboundClasses;
assert.ok(classes,"DiceboundClasses missing");
assert.equal(context.window.DiceboundClassHooks,undefined,"focused hooks leaked as peer public global");
let player={classId:"ranger"},effects=new Set(),berserkerCalls=[];
classes.configureRuntimeHooks({
  getPlayer:()=>player,
  isClassActive:id=>player.classId===id,
  clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
  scaleBerserkerRageDamage:(amount,p)=>{berserkerCalls.push({amount,hp:p.hp,maxHp:p.maxHp});return amount*1.75;},
  hasEffect:id=>effects.has(id)
});

assert.equal(classes.legacyMonkDodge(.2),.2);
player={classId:"monk",monkCombo:3};
assert.equal(classes.legacyMonkDodge(.2),.36);
assert.equal(classes.identityDodgeAdjustments(.36),.414);
player={classId:"clown",clownGimmick:"Big Shoes"};
assert.equal(classes.identityDodgeAdjustments(.2),.32);

player={classId:"berserker",hp:25,maxHp:100};berserkerCalls=[];
assert.equal(classes.berserkerDamage(40),70);assert.equal(berserkerCalls.length,1);assert.equal(berserkerCalls[0].amount,40);
player={classId:"ranger",hp:25,maxHp:100};assert.equal(classes.berserkerDamage(40),40);

player={classId:"ninja",_ninjaExecution:true};let adjusted=classes.ninjaExecutionDamage(100,false);
assert.equal(adjusted.amount,165);assert.equal(adjusted.ignoreDefense,true);
player._ninjaExecution=false;adjusted=classes.ninjaExecutionDamage(100,false);assert.equal(adjusted.amount,100);assert.equal(adjusted.ignoreDefense,false);

player={classId:"ouroboros",attack:37,doubleStrike:1.20,gold:0,goldAttackScale:0};effects.clear();
assert.equal(classes.syncOuroborosAttack(),true);assert.equal(player.attack,10);assert.ok(Math.abs(player.doubleStrike-3.90)<1e-12);
player={classId:"ouroboros",attack:37,doubleStrike:1.20,gold:0,goldAttackScale:0};effects=new Set(["perfect_specimen"]);
classes.syncOuroborosAttack();assert.equal(player.attack,30);assert.ok(Math.abs(player.doubleStrike-1.90)<1e-12);
player={classId:"ouroboros",attack:10,doubleStrike:1,gold:400,goldAttackScale:.0025,v27OuroGoldEchoScale:0,v27OuroGoldEchoApplied:0};effects.clear();
classes.syncOuroborosEconomy();assert.equal(player.goldAttackScale,0);assert.ok(Math.abs(player.v27OuroGoldEchoScale-.00025)<1e-12);assert.ok(Math.abs(player.v27OuroGoldEchoApplied-.1)<1e-12);assert.ok(Math.abs(player.doubleStrike-1.1)<1e-12);assert.equal(player.attack,10);
player={classId:"ranger",attack:37,doubleStrike:1.2,gold:400,goldAttackScale:.0025};assert.equal(classes.syncOuroborosEconomy(),false);assert.equal(player.goldAttackScale,.0025);assert.equal(player.attack,37);

const mono=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
assert.match(mono,/effectiveDodgeChance=function\(\)\{return dbClasses\.legacyMonkDodge\(effectiveDodgeChanceV12\(\)\);\}/);
assert.match(mono,/effectiveDodgeChance=function\(\)\{return dbClasses\.identityDodgeAdjustments\(effectiveDodgeChanceV13\(\)\);\}/);
assert.match(mono,/dbClasses\.berserkerDamage\(amount\)/);
assert.match(mono,/dbClasses\.ninjaExecutionDamage\(amount,ignoreDefense\)/);
assert.match(mono,/function v18SyncOuroborosAttack\(\)\{return dbClasses\.syncOuroborosAttack\(\);\}/);
assert.match(mono,/function v27SyncOuroborosEconomy\(\)\{return dbClasses\.syncOuroborosEconomy\(\);\}/);
assert.doesNotMatch(mono,/classIdentityActive\("monk"\)\?1-\(1-base\)\*\(1-base\):base/);
assert.doesNotMatch(mono,/player\.monkCombo\|\|0\)\*\.018/);
assert.doesNotMatch(mono,/player\.clownGimmick==="Big Shoes"/);
assert.doesNotMatch(mono,/scaleBerserkerRageDamage\(amount,player\)/);
assert.doesNotMatch(mono,/if\(player\._ninjaExecution\)\{amount\*=1\.65/);
assert.doesNotMatch(mono,/db060OuroSyncBase/);
assert.doesNotMatch(mono,/v27OuroGoldEchoScale=\(player\.v27OuroGoldEchoScale/);

const manifest=JSON.parse(fs.readFileSync(path.join(root,"runtime/js/module-manifest.json"),"utf8"));
const hook=manifest.modules.find(entry=>entry.id==="classes-hooks");assert.ok(hook);assert.equal(hook.path,"js/classes/hooks.js");assert.deepEqual(hook.provides,[]);
assert.equal(manifest.loadOrder[manifest.loadOrder.indexOf("classes-actions")+1],"classes-hooks");
assert.equal(manifest.loadOrder[manifest.loadOrder.indexOf("classes-hooks")+1],"classes-invoker");
console.log("Classes runtime hooks PASS: Monk/Clown Dodge, Berserker, Ninja and Ouroboros policy are owned behind DiceboundClasses");
'''
write('tools/test_class_runtime_hooks.js',hook_test)

# Extend umbrella owner test to assert hidden hook owner + load order.
test=read('tools/test_classes_runtime.js')
test=replace_once(test,
'''const runtimePath=path.join(root,"runtime","js","classes","runtime.js");
const actionsPath=path.join(root,"runtime","js","classes","actions.js");''',
'''const runtimePath=path.join(root,"runtime","js","classes","runtime.js");
const actionsPath=path.join(root,"runtime","js","classes","actions.js");
const hooksPath=path.join(root,"runtime","js","classes","hooks.js");''','classes runtime test hook path')
test=replace_once(test,
'''vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});
vm.runInContext(fs.readFileSync(actionsPath,"utf8"),context,{filename:actionsPath});''',
'''vm.runInContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});
vm.runInContext(fs.readFileSync(actionsPath,"utf8"),context,{filename:actionsPath});
vm.runInContext(fs.readFileSync(hooksPath,"utf8"),context,{filename:hooksPath});''','classes runtime test hook load')
test=replace_once(test,
'''assert.equal(context.window.DiceboundClassActions,undefined,"focused Classes actions leaked as a peer public global");''',
'''assert.equal(context.window.DiceboundClassActions,undefined,"focused Classes actions leaked as a peer public global");
assert.equal(context.window.DiceboundClassHooks,undefined,"focused Classes hooks leaked as a peer public global");''','classes runtime hidden hook assert')
test=replace_once(test,
'''const actionsModule=manifest.modules.find(entry=>entry.id==="classes-actions");
assert.ok(actionsModule,"classes-actions manifest owner missing");assert.equal(actionsModule.path,"js/classes/actions.js");assert.deepEqual(actionsModule.provides,[],"focused Classes actions should not publish a peer public facade");''',
'''const actionsModule=manifest.modules.find(entry=>entry.id==="classes-actions");
assert.ok(actionsModule,"classes-actions manifest owner missing");assert.equal(actionsModule.path,"js/classes/actions.js");assert.deepEqual(actionsModule.provides,[],"focused Classes actions should not publish a peer public facade");
const hooksModule=manifest.modules.find(entry=>entry.id==="classes-hooks");
assert.ok(hooksModule,"classes-hooks manifest owner missing");assert.equal(hooksModule.path,"js/classes/hooks.js");assert.deepEqual(hooksModule.provides,[],"focused Classes hooks should not publish a peer public facade");''','classes runtime manifest hook assert')
test=replace_once(test,
'''assert.ok(scripts.indexOf("js/classes/actions.js")<scripts.indexOf("js/dicebound.js"));''',
'''assert.ok(scripts.indexOf("js/classes/actions.js")<scripts.indexOf("js/classes/hooks.js"));assert.ok(scripts.indexOf("js/classes/hooks.js")<scripts.indexOf("js/dicebound.js"));''','classes runtime script order hook')
test=replace_once(test,
'''console.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle, routing and bespoke action mechanics are owned behind DiceboundClasses");''',
'''console.log("Classes runtime owner PASS: identity, capabilities, Slime Rouge lifecycle, routing, bespoke actions and runtime hooks are owned behind DiceboundClasses");''','classes runtime PASS label')
write('tools/test_classes_runtime.js',test)

print('Classes runtime-hook policy materialized')
