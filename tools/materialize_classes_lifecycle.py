from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def write(rel,text): (ROOT/rel).write_text(text,encoding='utf-8',newline='\n')
def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)
def regex_once(text,pattern,repl,label):
    out,count=re.subn(pattern,repl,text,count=1,flags=re.S)
    if count!=1: raise SystemExit(f'{label}: expected exactly one regex match, found {count}')
    return out

# ---------------------------------------------------------------------------
# Classes runtime: own class-resource/lifecycle initialization policy.
# ---------------------------------------------------------------------------
runtime=read('runtime/js/classes/runtime.js')
anchor='''  function forceSlimeRouge(identity=null,ultimate=null){'''
insert='''  function ultimateSupportFor(id){return [...(runtime().getUltimateSupportMechanics(id)||[])];}
  function rosterPool(){
    const rt=runtime();
    if(typeof rt.shuffledPetIds==="function")return rt.shuffledPetIds();
    if(typeof rt.getPetIds==="function")return [...(rt.getPetIds()||[])];
    return [];
  }
  function initUltimateSupport(id){
    const player=runtime().getPlayer(),support=new Set(ultimateSupportFor(id));
    if(support.has('spirits')){player.summonerSpirits=player.summonerSpirits||[];player.summonerCap=player.summonerCap||3;player.summonerSpiritScale=player.summonerSpiritScale||1;}
    if(support.has('roster')&&!(player.trainerRoster||[]).length){const pool=rosterPool();player.trainerRoster=pool.slice(0,6);player.trainerActiveIndex=Math.min(player.trainerActiveIndex||0,Math.max(0,player.trainerRoster.length-1));player.trainerAssistScale=player.trainerAssistScale||.65;}
    if(support.has('mana')&&!player.maxMana){player.maxMana=100;player.mana=Math.max(player.mana||0,25);}
    if(support.has('alchemy')){player.alchemistBrewCounter=player.alchemistBrewCounter||0;player.alchemistBrewNeed=player.alchemistBrewNeed||3;player.alchemistFlaskBonus=player.alchemistFlaskBonus||0;}
    if(support.has('smoke')){player.ninjaSmoke=player.ninjaSmoke||0;player.ninjaSmokeNeed=player.ninjaSmokeNeed||3;}
  }
  function initIdentitySupport(id){
    const player=runtime().getPlayer(),mechanics=new Set(mechanicsFor(id));
    if(mechanics.has('mana')){
      const desiredMax=id==='summoner'?120:100,desiredStart=id==='summoner'?35:25;
      if((player.maxMana||0)<desiredMax)player.maxMana=desiredMax;
      if((player.mana||0)<=0)player.mana=desiredStart;
      else player.mana=Math.min(player.maxMana,Math.max(player.mana,desiredStart));
    }
    if(mechanics.has('spirits')){player.summonerSpirits=player.summonerSpirits||[];player.summonerCap=player.summonerCap||3;player.summonerSpiritScale=player.summonerSpiritScale||1;player.summonerSpiritDouble=player.summonerSpiritDouble||0;player.summonerManaBonus=player.summonerManaBonus||0;}
    if(mechanics.has('roster')&&!(player.trainerRoster||[]).length){const pool=rosterPool();player.trainerRoster=pool.slice(0,6);player.trainerActiveIndex=Math.min(player.trainerActiveIndex||0,Math.max(0,player.trainerRoster.length-1));player.trainerAssistScale=player.trainerAssistScale||.65;}
    if(mechanics.has('faith'))player.clericFaith=player.clericFaith||0;
    if(mechanics.has('smoke')){player.ninjaSmoke=player.ninjaSmoke||0;player.ninjaSmokeNeed=player.ninjaSmokeNeed||3;}
    if(mechanics.has('alchemy')){player.alchemistBrewCounter=player.alchemistBrewCounter||0;player.alchemistBrewNeed=player.alchemistBrewNeed||3;player.alchemistFlaskBonus=player.alchemistFlaskBonus||0;}
  }
  function syncBloodmageHpPassive(initial=false){
    const rt=runtime(),player=rt.getPlayer();
    if(!active("bloodmage"))return;
    if(initial){
      if(typeof rt.getClassBase!=="function")throw new Error("Classes Bloodmage lifecycle requires getClassBase().");
      const base=rt.getClassBase("bloodmage").maxHp,bonus=Math.max(0,(player.maxHp||base)-base);
      if(bonus>0){player.maxHp+=bonus;player.hp+=bonus;}
      player._v18BloodmageMaxHp=player.maxHp;return;
    }
    const last=Number(player._v18BloodmageMaxHp||player.maxHp||0),now=Number(player.maxHp||0);
    if(now>last){const extra=now-last;player.maxHp+=extra;player.hp=Math.min(player.maxHp,player.hp+extra);}
    player._v18BloodmageMaxHp=player.maxHp;
  }

'''
runtime=replace_once(runtime,anchor,insert+anchor,'runtime lifecycle insertion')
runtime=replace_once(runtime,
'''    owner:OWNER,apiVersion:1,configure,configureActions,identityId,active,mechanicsFor,capabilities,hasMechanic,performAction,
    forceSlimeRouge,prepareSlimeRougeBorrowing,finishSlimeRougeBorrowing,clearSlimeRougeRuntime,snapshot
''',
'''    owner:OWNER,apiVersion:1,configure,configureActions,identityId,active,mechanicsFor,ultimateSupportFor,capabilities,hasMechanic,performAction,
    initIdentitySupport,initUltimateSupport,syncBloodmageHpPassive,
    forceSlimeRouge,prepareSlimeRougeBorrowing,finishSlimeRougeBorrowing,clearSlimeRougeRuntime,snapshot
''','runtime lifecycle API')
write('runtime/js/classes/runtime.js',runtime)

# ---------------------------------------------------------------------------
# Public facade: runtime lifecycle remains behind DiceboundClasses.
# ---------------------------------------------------------------------------
registry=read('runtime/js/classes/registry.js')
registry=replace_once(registry,
'''    identityId:()=>call("identityId"),
    active:id=>call("active",id),
    mechanicsFor:id=>call("mechanicsFor",id),
    capabilities:()=>call("capabilities"),
    hasMechanic:tag=>call("hasMechanic",tag),
''',
'''    identityId:()=>call("identityId"),
    active:id=>call("active",id),
    mechanicsFor:id=>call("mechanicsFor",id),
    ultimateSupportFor:id=>call("ultimateSupportFor",id),
    capabilities:()=>call("capabilities"),
    hasMechanic:tag=>call("hasMechanic",tag),
    initIdentitySupport:id=>call("initIdentitySupport",id),
    initUltimateSupport:id=>call("initUltimateSupport",id),
    syncBloodmageHpPassive:(initial=false)=>call("syncBloodmageHpPassive",initial),
''','facade lifecycle API')
write('runtime/js/classes/registry.js',registry)

# ---------------------------------------------------------------------------
# Monolith: compose collaborators, delete lifecycle policy shadows, and route
# remaining compatibility callers through the Classes facade.
# ---------------------------------------------------------------------------
mono=read('runtime/js/dicebound.js')
mono=replace_once(mono,
'''    getSelectedClassId:()=>selectedClassId,
    getClassMechanics:id=>[...(window.DiceboundContent?.classMechanics?.[id]||[])],
    getUltimateSupportMechanics:id=>[...(window.DiceboundContent?.ultimateSupportMechanics?.[id]||[])]
''',
'''    getSelectedClassId:()=>selectedClassId,
    getClassMechanics:id=>[...(window.DiceboundContent?.classMechanics?.[id]||[])],
    getUltimateSupportMechanics:id=>[...(window.DiceboundContent?.ultimateSupportMechanics?.[id]||[])],
    getClassBase:id=>CLASSES[id]?.base||null,
    shuffledPetIds:()=>dbPets.shuffledPetIds(),
    getPetIds:()=>Object.keys(PETS)
''','Classes runtime lifecycle composition')

mono=regex_once(mono,
    r'''  function v18SyncBloodmageHpPassive\(initial=false\)\{.*?\n  \}\n\n\n  // ---- Guard, Replenish and pet-turn behavior''',
    '''  // Bloodmage max-HP normalization is owned by DiceboundClasses.\n\n\n  // ---- Guard, Replenish and pet-turn behavior''',
    'Bloodmage HP lifecycle shadow')
mono=replace_once(mono,
'''    v18SyncBloodmageHpPassive(false);v18SyncOuroborosAttack();updateHUDV18Base();''',
'''    dbClasses.syncBloodmageHpPassive(false);v18SyncOuroborosAttack();updateHUDV18Base();''','Bloodmage HUD lifecycle route')

mono=regex_once(mono,
    r'''  function v318InitUltimateSupport\(id\)\{.*?\n  \}\n  function v32InitIdentitySupport\(id\)\{.*?\n  \}\n\n\n  // Slime Rouge Powerup eligibility''',
    '''  // Slime Rouge borrowed identity/Ultimate support initialization is owned by DiceboundClasses.\n\n\n  // Slime Rouge Powerup eligibility''',
    'Slime Rouge support lifecycle shadows')

mono=replace_once(mono,
'''    syncActivePetBonus:force=>dbPets.syncActiveBonus(force),syncBloodmageHpPassive:initial=>v18SyncBloodmageHpPassive(initial),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),
    prepareSlimeRougeBorrowing:()=>dbClasses.prepareSlimeRougeBorrowing(v318SlimeRougeDonorPool(),pick),finishSlimeRougeBorrowing:()=>dbClasses.finishSlimeRougeBorrowing(),initIdentitySupport:id=>v32InitIdentitySupport(id),initUltimateSupport:id=>v318InitUltimateSupport(id),
    classMechanicsFor:id=>classMechanicsFor(id),getUltimateSupportMechanics:id=>window.DiceboundContent?.ultimateSupportMechanics?.[id]||[],addLog:text=>addLog(text),
''',
'''    syncActivePetBonus:force=>dbPets.syncActiveBonus(force),syncBloodmageHpPassive:initial=>dbClasses.syncBloodmageHpPassive(initial),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),
    prepareSlimeRougeBorrowing:()=>dbClasses.prepareSlimeRougeBorrowing(v318SlimeRougeDonorPool(),pick),finishSlimeRougeBorrowing:()=>dbClasses.finishSlimeRougeBorrowing(),initIdentitySupport:id=>dbClasses.initIdentitySupport(id),initUltimateSupport:id=>dbClasses.initUltimateSupport(id),
    classMechanicsFor:id=>dbClasses.mechanicsFor(id),getUltimateSupportMechanics:id=>dbClasses.ultimateSupportFor(id),addLog:text=>addLog(text),
''','Player Initialization Classes lifecycle routes')

for forbidden,label in [
    ('function v18SyncBloodmageHpPassive(', 'Bloodmage HP lifecycle implementation'),
    ('function v318InitUltimateSupport(', 'Ultimate support lifecycle implementation'),
    ('function v32InitIdentitySupport(', 'identity support lifecycle implementation'),
    ('syncBloodmageHpPassive:initial=>v18SyncBloodmageHpPassive', 'Player Initialization Bloodmage shadow route'),
    ('initIdentitySupport:id=>v32InitIdentitySupport', 'Player Initialization identity shadow route'),
    ('initUltimateSupport:id=>v318InitUltimateSupport', 'Player Initialization ultimate shadow route')
]:
    if forbidden in mono: raise SystemExit(f'{label} survived monolith drain')
write('runtime/js/dicebound.js',mono)

# ---------------------------------------------------------------------------
# Focused lifecycle contract + anti-shadow guard.
# ---------------------------------------------------------------------------
test=r'''"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const context=vm.createContext({window:{},console,Set,Object,Array,JSON,Math,Number});
const load=rel=>vm.runInContext(fs.readFileSync(path.join(root,rel),"utf8"),context,{filename:rel});
load("runtime/js/classes/registry.js");
load("runtime/js/classes/runtime.js");
const classes=context.window.DiceboundClasses;
const registry=classes.createRegistry(),mechanics=classes.createMechanicsRegistry(),ultimate=classes.createUltimateSupportRegistry();
let player={classId:"ranger"},selected="ranger",shuffleCalls=0;
const pets=["neutral","fire","ice","electric","nature","light","void","donut"];
classes.configure({
  getPlayer:()=>player,getSelectedClassId:()=>selected,
  getClassMechanics:id=>mechanics[id]||[],getUltimateSupportMechanics:id=>ultimate[id]||[],
  getClassBase:id=>registry[id]?.base||null,
  shuffledPetIds:()=>{shuffleCalls++;return [...pets];},getPetIds:()=>[...pets]
});

// Identity support preserves exact resource defaults and only consumes the
// roster collaborator when a roster is actually needed.
player={classId:"summoner",maxMana:0,mana:0,summonerSpirits:null,summonerCap:0,summonerSpiritScale:0,summonerSpiritDouble:0,summonerManaBonus:0};
classes.initIdentitySupport("summoner");
assert.equal(player.maxMana,120);assert.equal(player.mana,35);assert.deepEqual(Array.from(player.summonerSpirits),[]);assert.equal(player.summonerCap,3);assert.equal(player.summonerSpiritScale,1);assert.equal(player.summonerSpiritDouble,0);assert.equal(player.summonerManaBonus,0);assert.equal(shuffleCalls,0);

player={classId:"pokemontrainer",trainerRoster:[],trainerActiveIndex:9,trainerAssistScale:0};
classes.initIdentitySupport("pokemontrainer");
assert.deepEqual(Array.from(player.trainerRoster),pets.slice(0,6));assert.equal(player.trainerActiveIndex,5);assert.equal(player.trainerAssistScale,.65);assert.equal(shuffleCalls,1);

player={classId:"alchemist",alchemistBrewCounter:0,alchemistBrewNeed:0,alchemistFlaskBonus:0};
classes.initIdentitySupport("alchemist");assert.equal(player.alchemistBrewCounter,0);assert.equal(player.alchemistBrewNeed,3);assert.equal(player.alchemistFlaskBonus,0);
player={classId:"ninja",ninjaSmoke:0,ninjaSmokeNeed:0};classes.initIdentitySupport("ninja");assert.equal(player.ninjaSmoke,0);assert.equal(player.ninjaSmokeNeed,3);
player={classId:"cleric",clericFaith:0};classes.initIdentitySupport("cleric");assert.equal(player.clericFaith,0);

// Ultimate support intentionally uses the Ultimate donor's support metadata,
// including the older 100/25 Mana defaults rather than Summoner identity rules.
player={classId:"slimerouge",maxMana:0,mana:0,summonerSpirits:null,summonerCap:0,summonerSpiritScale:0};
classes.initUltimateSupport("summoner");assert.equal(player.maxMana,100);assert.equal(player.mana,25);assert.deepEqual(Array.from(player.summonerSpirits),[]);assert.equal(player.summonerCap,3);assert.equal(player.summonerSpiritScale,1);
player={classId:"slimerouge",trainerRoster:[],trainerActiveIndex:7,trainerAssistScale:0};classes.initUltimateSupport("pokemontrainer");assert.deepEqual(Array.from(player.trainerRoster),pets.slice(0,6));assert.equal(player.trainerActiveIndex,5);assert.equal(player.trainerAssistScale,.65);assert.equal(shuffleCalls,2);
assert.deepEqual(Array.from(classes.ultimateSupportFor("pokemontrainer")),Array.from(ultimate.pokemontrainer));

// Bloodmage HP normalization keeps the shipped double-growth bookkeeping.
const bloodBase=registry.bloodmage.base.maxHp;
player={classId:"bloodmage",maxHp:bloodBase+10,hp:20,_v18BloodmageMaxHp:null};
classes.syncBloodmageHpPassive(true);assert.equal(player.maxHp,bloodBase+20);assert.equal(player.hp,30);assert.equal(player._v18BloodmageMaxHp,bloodBase+20);
player.maxHp+=5;classes.syncBloodmageHpPassive(false);assert.equal(player.maxHp,bloodBase+30);assert.equal(player.hp,35);assert.equal(player._v18BloodmageMaxHp,bloodBase+30);

const mono=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
assert.doesNotMatch(mono,/function\s+v18SyncBloodmageHpPassive\s*\(/);
assert.doesNotMatch(mono,/function\s+v318InitUltimateSupport\s*\(/);
assert.doesNotMatch(mono,/function\s+v32InitIdentitySupport\s*\(/);
assert.match(mono,/syncBloodmageHpPassive:initial=>dbClasses\.syncBloodmageHpPassive\(initial\)/);
assert.match(mono,/initIdentitySupport:id=>dbClasses\.initIdentitySupport\(id\)/);
assert.match(mono,/initUltimateSupport:id=>dbClasses\.initUltimateSupport\(id\)/);
assert.match(mono,/getUltimateSupportMechanics:id=>dbClasses\.ultimateSupportFor\(id\)/);
console.log("Classes lifecycle PASS: Bloodmage HP normalization and borrowed identity/Ultimate support initialization are owned behind DiceboundClasses");
'''
write('tools/test_class_runtime_lifecycle.js',test)

print('Classes lifecycle/support policy materialized')
