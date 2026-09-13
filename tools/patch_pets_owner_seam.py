import json
import re
from pathlib import Path

INDEX=Path('runtime/index.html')
MANIFEST=Path('runtime/js/module-manifest.json')
MONOLITH=Path('runtime/js/dicebound.js')


def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)


def regex_once(text, pattern, replacement, label, flags=0):
    out,count=re.subn(pattern,replacement,text,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')
    return out

# Runtime load order: public Pet facade/registry, then focused mechanics owner.
index=INDEX.read_text(encoding='utf-8')
needle='<script src="js/pets/registry.js"></script>'
if 'js/pets/lifecycle.js' not in index:
    index=replace_once(index,needle,needle+'\n  <script src="js/pets/lifecycle.js"></script>','index Pet registry script')
INDEX.write_text(index,encoding='utf-8',newline='\n')

manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
if not any(mod.get('id')=='pet-lifecycle' for mod in manifest['modules']):
    registry_i=next(i for i,mod in enumerate(manifest['modules']) if mod.get('id')=='pets-registry')
    manifest['modules'].insert(registry_i+1,{
        'id':'pet-lifecycle',
        'path':'js/pets/lifecycle.js',
        'domain':'pets/lifecycle-progression-switching-bond-and-active-bonus',
        'status':'extracted',
        'requires':['pets-registry'],
        'provides':['DiceboundPetLifecycle']
    })
if 'pet-lifecycle' not in manifest['loadOrder']:
    registry_i=manifest['loadOrder'].index('pets-registry')
    manifest['loadOrder'].insert(registry_i+1,'pet-lifecycle')
monolith_mod=next(mod for mod in manifest['modules'] if mod.get('id')=='dicebound-monolith')
if 'pet-lifecycle' not in monolith_mod['requires']:
    monolith_mod['requires'].append('pet-lifecycle')
if 'pets-registry' not in monolith_mod['requires']:
    monolith_mod['requires'].append('pets-registry')
MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')

text=MONOLITH.read_text(encoding='utf-8')
if "const dbPetLifecycleOwner=window.DiceboundPetLifecycle;" in text:
    print('Pet owner seam already patched.')
    raise SystemExit(0)

text=replace_once(text,
'''  const dbRun=window.DiceboundRun;\n  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");\n''',
'''  const dbRun=window.DiceboundRun;\n  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");\n  const dbPets=window.DiceboundPets;\n  if(!dbPets)throw new Error("dicebound.js requires DiceboundPets before loading.");\n  const dbPetLifecycleOwner=window.DiceboundPetLifecycle;\n  if(!dbPetLifecycleOwner)throw new Error("dicebound.js requires DiceboundPetLifecycle before loading.");\n  let dbPetLifecycle=null;\n''','top-level Pet owners')

text=replace_once(text,'  const PET_UNLOCK_REQUIREMENT=500;','  const PET_UNLOCK_REQUIREMENT=dbPetLifecycleOwner.unlockRequirement;','Pet unlock constant')
text=replace_once(text,'  const DB317_PETS_RAW=window.DiceboundPets?.createRegistry();','  const DB317_PETS_RAW=dbPets.createRegistry?.();','Pet registry source')
text=replace_once(text,
'''  const PETS=db317Readonly(DB317_PETS_RAW);\n''',
'''  const PETS=db317Readonly(DB317_PETS_RAW);\n  dbPetLifecycle=dbPetLifecycleOwner.configure({\n    getMeta:()=>meta,getPlayer:()=>player,getPets:()=>PETS,getElements:()=>ELEMENTS,isRunActive:()=>!!gameStarted,\n    classHasMechanic:id=>classHasMechanic(id),talentRank:id=>talentRank(id),rand:(min,max)=>rand(min,max),\n    saveMeta:()=>saveMeta(),checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),\n    sfxLevel:()=>sfx.level(),sfxCoin:()=>sfx.coin(),sfxHoly:()=>sfx.holy(),showToast:(...args)=>showToast(...args),\n    addLog:text=>addLog(text),updateMetaUI:()=>updateMetaUI(),updateHUD:()=>updateHUD()\n  });\n  dbPets.configure({\n    activeDefinition:()=>dbPetLifecycle.activeDefinition(),activeState:()=>dbPetLifecycle.activeState(),bondLevel:id=>dbPetLifecycle.bondLevel(id),\n    bonusScale:id=>dbPetLifecycle.bonusScale(id),damageExtra:id=>dbPetLifecycle.damageExtra(id),displayDamage:id=>dbPetLifecycle.displayDamage(id),\n    bonusText:id=>dbPetLifecycle.bonusText(id),chooserState:()=>dbPetLifecycle.chooserState(),elementName:id=>dbPetLifecycle.elementName(id),\n    canSwitch:id=>dbPetLifecycle.canSwitch(id),select:id=>dbPetLifecycle.select(id),feed:count=>dbPetLifecycle.feed(count),\n    trackElementProgress:(key,amount)=>dbPetLifecycle.trackElementProgress(key,amount),syncActiveBonus:force=>dbPetLifecycle.syncActiveBonus(force),\n    shuffledPetIds:()=>dbPetLifecycle.shuffledPetIds()\n  });\n''','Pet lifecycle composition')

text=replace_once(text,
'''  function activePetDef(){return PETS[meta.activePet]||PETS.neutral;}\n  function activePetState(){return meta.pets?.[meta.activePet]||meta.pets.neutral;}\n''',
'''  function activePetDef(){return dbPets.activeDefinition();}\n  function activePetState(){return dbPets.activeState();}\n''','active Pet adapters')

text=regex_once(text,
    r'''  function trackElementProgress\(key,amount\)\{\n    if\(!key\|\|!ELEMENTS\[key\]\|\|amount<=0\)return;meta\.elementProgress\[key\]=\(meta\.elementProgress\[key\]\|\|0\)\+amount;const state=meta\.pets\[key\];\n    if\(state&&!state\.unlocked&&meta\.elementProgress\[key\]>=PET_UNLOCK_REQUIREMENT\)\{state\.unlocked=true;saveMeta\(\);sfx\.holy\(\);showToast\(`NEW PET UNLOCKED · \$\{PETS\[key\]\.icon\} \$\{PETS\[key\]\.name\}`,3400,true\);addLog\(`<b>Elemental companion unlocked:</b> \$\{PETS\[key\]\.name\} after \$\{Math\.floor\(meta\.elementProgress\[key\]\)\} \$\{ELEMENTS\[key\]\.name\} damage/healing\.`\);\}else saveMeta\(\);\n  \}''',
    '  function trackElementProgress(key,amount){return dbPets.trackElementProgress(key,amount);}',
    'trackElementProgress owner drain')

text=regex_once(text,
    r'''  function feedActivePet\(count=1\)\{const state=activePetState\(\),def=activePetDef\(\),actual=Math\.min\(count,meta\.petCookies\);if\(actual<=0\)return;meta\.petCookies-=actual;state\.xp\+=actual\*\(1\+player\.cookieBondBonus\);let levels=0;while\(state\.xp>=state\.xpNext\)\{state\.xp-=state\.xpNext;state\.level\+\+;state\.xpNext=2\+Math\.floor\(state\.level\*\.7\);levels\+\+;\}saveMeta\(\);checkDynamicClassUnlocks\(\);levels\?sfx\.level\(\):sfx\.coin\(\);showToast\(levels\?`\$\{def\.name\} gained \$\{levels\} level\$\{levels===1\?"":"s"\}!`:`\$\{def\.name\} ate \$\{actual\} cookie\$\{actual===1\?"":"s"\}`\);updateMetaUI\(\);\}''',
    '  function feedActivePet(count=1){return dbPets.feed(count);}',
    'feedActivePet owner drain')

text=regex_once(text,
    r'''  // ---- Companion differentiation -------------------------------------------\n  const PET_STAT_BONUSES=\{.*?\n  // ---- Powerup rerolls ------------------------------------------------------''',
    '''  // ---- Companion differentiation -------------------------------------------\n  // Pet stat identities and their V1.7 bond scaling are owned by pets/lifecycle.js.\n  function syncActivePetBonusV16(force=false){return dbPets.syncActiveBonus(force);}\n\n  // ---- Powerup rerolls ------------------------------------------------------''',
    'Pet stat bonus owner drain',flags=re.S)

text=regex_once(text,
    r'''  // ---- Pet bond scaling ----------------------------------------------------\n  function v17PetBondLevel\(id\)\{.*?\n\n  // ---- Guardian elemental Guard talent \+ Turtle/Slime powerup -------------''',
    '''  // ---- Pet bond scaling ----------------------------------------------------\n  function v17PetBondLevel(id){return dbPets.bondLevel(id);}\n  function v17PetBonusScale(id){return dbPets.bonusScale(id);}\n  function v17PetDamageExtra(id){return dbPets.damageExtra(id);}\n  function v17PetBonusText(id){return dbPets.bonusText(id);}\n\n  // ---- Guardian elemental Guard talent + Turtle/Slime powerup -------------''',
    'V1.7 Pet owner drain',flags=re.S)

text=regex_once(text,
    r'''  // ---- Trigger companion finally gets a reason to be selected -------------\n  // Gun pet was the only elemental companion without an active stat identity\.\n  if\(PETS\.gun&&!PET_STAT_BONUSES\.gun\)\{\n    PET_STAT_BONUSES\.gun=.*?\n  \}\n\n''',
    '',
    'Gun Pet shadow drain',flags=re.S)

text=replace_once(text,
'''  function v19PetTaggedClass(){return classHasMechanic("pet");}\n  function v19CanSwitchPet(petId){return !gameStarted||v19PetTaggedClass()||meta.activePet===petId;}\n''',
'''  function v19PetTaggedClass(){return classHasMechanic("pet");}\n  function v19CanSwitchPet(petId){return dbPets.canSwitch(petId);}\n''','Pet switch adapter')

text=replace_once(text,
'''  function shuffledPetIds(){const arr=Object.keys(PETS);for(let i=arr.length-1;i>0;i--){const j=rand(0,i),t=arr[i];arr[i]=arr[j];arr[j]=t;}return arr;}\n''',
'''  function shuffledPetIds(){return dbPets.shuffledPetIds();}\n''','Trainer Pet shuffle adapter')

text=replace_once(text,'      activePetName:()=>activePetDef().name,','      activePetName:()=>dbPets.activeDefinition().name,','Road Event Pet collaboration')
text=replace_once(text,'    petBondLevel:id=>v17PetBondLevel(id),','    petBondLevel:id=>dbPets.bondLevel(id),','Combat Pet bond collaboration')
text=replace_once(text,'classHasMechanic:id=>classHasMechanic(id),shuffledPetIds:()=>shuffledPetIds(),setCombatKind:value=>{v16CombatKind=value;},','classHasMechanic:id=>classHasMechanic(id),shuffledPetIds:()=>dbPets.shuffledPetIds(),setCombatKind:value=>{v16CombatKind=value;},','Player Initialization Pet shuffle')
text=replace_once(text,'    syncActivePetBonus:force=>syncActivePetBonusV16(force),syncBloodmageHpPassive:initial=>v18SyncBloodmageHpPassive(initial),','    syncActivePetBonus:force=>dbPets.syncActiveBonus(force),syncBloodmageHpPassive:initial=>v18SyncBloodmageHpPassive(initial),','Player Initialization Pet bonus')

text=regex_once(text,
    r'''    getState:\(\)=>\(\{\n      pets:Object\.values\(PETS\),petStates:meta\.pets\|\|\{\},elementProgress:meta\.elementProgress\|\|\{\},\n      activePetId:meta\.activePet,cookies:meta\.petCookies\|\|0,unlockRequirement:PET_UNLOCK_REQUIREMENT,\n      runActive:!!gameStarted\n    \}\),\n    canSwitch:id=>v19CanSwitchPet\(id\),\n    damageFor:\(id,state\)=>\{\n      const petState=state\.petStates\?\.\[id\]\|\|\{level:1\};\n      return 1\+Math\.ceil\(\(petState\.level\|\|1\)\*\.8\)\+\(id!==['"]neutral['"]\?v17PetDamageExtra\(id\):0\);\n    \},\n    bonusFor:\(id\)=>id===['"]neutral['"]\?['"]Neutral companion · no stat bonus['"]:v17PetBonusText\(id\),\n    elementName:id=>ELEMENTS\[id\]\?\.name\|\|['"]elemental['"],''',
    '''    getState:()=>dbPets.chooserState(),\n    canSwitch:id=>dbPets.canSwitch(id),\n    damageFor:id=>dbPets.displayDamage(id),\n    bonusFor:id=>id==='neutral'?'Neutral companion · no stat bonus':dbPets.bonusText(id),\n    elementName:id=>dbPets.elementName(id),''',
    'Pet chooser read model routing')

text=regex_once(text,
    r'''    selectPet:id=>\{\n      if\(!v19CanSwitchPet\(id\)\|\|meta\.activePet===id\|\|!meta\.pets\?\.\[id\]\?\.unlocked\)return false;\n      const def=PETS\[id\]\|\|PETS\.neutral;meta\.activePet=id;saveMeta\(\);if\(gameStarted\)syncActivePetBonusV16\(\);updateMetaUI\(\);updateHUD\(\);showToast\(`\$\{def\.icon\} \$\{def\.name\} selected`\);return true;\n    \},\n    feed:count=>feedActivePet\(count\),''',
    '''    selectPet:id=>dbPets.select(id),\n    feed:count=>dbPets.feed(count),''',
    'Pet chooser actions routing')

# Characterization seam should observe the facade for migrated lifecycle behavior.
for old,new,label in [
    ('    feed:count=>feedActivePet(count),','    feed:count=>dbPets.feed(count),','oracle feed'),
    ('    trackElement:(key,amount)=>trackElementProgress(key,amount),','    trackElement:(key,amount)=>dbPets.trackElementProgress(key,amount),','oracle element progress'),
    ('    canSwitch:id=>v19CanSwitchPet(id),','    canSwitch:id=>dbPets.canSwitch(id),','oracle switch'),
    ('    bonusScale:id=>v17PetBonusScale(id),','    bonusScale:id=>dbPets.bonusScale(id),','oracle scale'),
    ('    damageExtra:id=>v17PetDamageExtra(id),','    damageExtra:id=>dbPets.damageExtra(id),','oracle damage extra'),
    ('    bonusText:id=>v17PetBonusText(id),','    bonusText:id=>dbPets.bonusText(id),','oracle bonus text'),
    ('    syncBonus:(force=false)=>syncActivePetBonusV16(force),','    syncBonus:(force=false)=>dbPets.syncActiveBonus(force),','oracle bonus sync'),
    ('    shuffledPetIds:()=>shuffledPetIds()','    shuffledPetIds:()=>dbPets.shuffledPetIds()','oracle shuffle')
]:
    text=replace_once(text,old,new,label)

MONOLITH.write_text(text,encoding='utf-8',newline='\n')
print('Patched Pet subsystem owner seam.')
