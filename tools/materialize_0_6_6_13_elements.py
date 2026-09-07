#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONO=ROOT/'runtime/js/dicebound.js'
MANIFEST=ROOT/'runtime/js/module-manifest.json'
INDEX=ROOT/'runtime/index.html'
SHADOW=ROOT/'tools/test_shadow_ownership_drain.py'
CHANGELOG=ROOT/'CHANGELOG.md'
PATCH_NOTES=ROOT/'runtime/PATCH_NOTES.md'
VERSION=ROOT/'runtime/js/version.js'


def replace_once(text:str, old:str, new:str, label:str)->str:
    count=text.count(old)
    if count!=1: raise SystemExit(f'materialize 0.6.6.13: expected one {label}, found {count}')
    return text.replace(old,new,1)


def regex_once(text:str, pattern:str, replacement:str, label:str)->str:
    matches=list(re.finditer(pattern,text,flags=re.S))
    if len(matches)!=1: raise SystemExit(f'materialize 0.6.6.13: expected one {label}, found {len(matches)}')
    result=re.sub(pattern,replacement,text,count=1,flags=re.S)
    anchor='db0631RecordObservedProgress'
    if anchor in text and anchor not in result:
        raise SystemExit(f'materialize 0.6.6.13: {label} crossed protected progression anchor {anchor}')
    return result


def run(*args:str)->None:
    subprocess.run(args,cwd=ROOT,check=True)


mono=MONO.read_text(encoding='utf-8')
mono=replace_once(mono,
    '  let dbCombatHealingResolution=null;\n',
    '  let dbCombatElementResolution=null;\n  let dbCombatHealingResolution=null;\n',
    'Element owner slot')

# Earliest base player/enemy element implementations become stable forwarders.
mono=regex_once(mono,
    r'  function triggerElementEffect\(key,target=currentEnemy,\{forced=false,source="Weapon"\}=\{\}\)\{.*?\n  \}\n\n  function applyPoisonTick',
    "  function triggerElementEffect(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.triggerElementEffect.apply(this,args);}\n\n  function applyPoisonTick",
    'base player element implementation')
mono=regex_once(mono,
    r'  function enemyElementProc\(enemy\)\{\n    if\(!enemy\?\.affinity\|\|random\(\)>enemy\.elementProcChance\)return "";.*?\n    addCombatHistory\(note\);return note;\n  \}',
    "  function enemyElementProc(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.enemyElementProc.apply(this,args);}",
    'base enemy element implementation')
mono=replace_once(mono,
    '  function currentWeaponElement(){const weapon=player.equipment?.weapon;return weapon?.element&&ELEMENTS[weapon.element]?weapon.element:null;}\n  function damageAll(amount,falloff=1){let total=0;livingEnemies().forEach(e=>{total+=damageEnemy(e,amount*(e===currentEnemy?1:falloff));});return total;}\n  function triggerWeaponElement(target=currentEnemy){const key=currentWeaponElement();return key?triggerElementEffect(key,target,{forced:false,source:"weapon"}):null;}\n',
    "  function currentWeaponElement(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.currentWeaponElement.apply(this,args);}\n  function damageAll(amount,falloff=1){let total=0;livingEnemies().forEach(e=>{total+=damageEnemy(e,amount*(e===currentEnemy?1:falloff));});return total;}\n  function triggerWeaponElement(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.triggerWeaponElement.apply(this,args);}\n",
    'weapon element adapters')

# The old V15 branch is superseded by the later affinity rewrite and is no
# longer allowed to survive as hidden shadow ownership.
mono=regex_once(mono,
    r'\n  // Blood Moon/Crimson Eclipse overheal fix and guardian freeze cooldown\.\n  const triggerElementEffectV15=triggerElementEffect;triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n',
    '\n',
    'V15 element wrapper')

# Alpha v1.2 affinity-aware direct replacement is the real predecessor of the
# later Radiation/Haste/Legendary wrappers. Its mechanics now live in owner.
mono=regex_once(mono,
    r'  function affinityElementMultiplier\(enemy,key\)\{.*?\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n\n  applyPoisonTick=function',
    "  function affinityElementMultiplier(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.affinityElementMultiplier.apply(this,args);}\n  function elementHit(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.elementHit.apply(this,args);}\n  function elementHitAll(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.elementHitAll.apply(this,args);}\n\n  applyPoisonTick=function",
    'affinity-aware element implementation')

# Radiation mechanics and enemy implementation.
mono=regex_once(mono,
    r'\n  const triggerElementEffectV16Base=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n  const enemyElementProcV16Base=enemyElementProc;\n  enemyElementProc=function\(enemy\)\{.*?\n  \};\n  function restoreRadiationDefenseV16\(\)\{.*?\}\n',
    "\n  function restoreRadiationDefenseV16(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.restoreRadiationDefense.apply(this,args);}\n",
    'V16 Radiation player/enemy wrappers')

# Coffee/Haste player proc wrappers. D20 wrappers/reset flags remain in place.
for pattern,label in [
    (r'\n  const triggerElementEffectV19Base=triggerElementEffect;\n  triggerElementEffect=function\(key,target,opts=\{\}\)\{.*?\n  \};\n', 'V19 Haste wrapper'),
    (r'\n  // ----- Haste anti-lock: never queue more than one skipped response ------\n  function beta045ClampQueuedHaste\(before=0\)\{.*?\n  \}\n  const triggerElementEffectBeta045Base=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n', 'Beta045 Haste wrapper'),
    (r'\n  const db046TriggerElementBase=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n', 'Beta046 Haste wrapper'),
    (r'\n  const db047TriggerElementBase=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n', 'Beta047 Haste wrapper'),
]:
    mono=regex_once(mono,pattern,'\n',label)

# Beta03 Fire/Tech/Radiation follow-up mechanics move into the owner while its
# public regression helper remains as a thin adapter.
mono=regex_once(mono,
    r'  const BETA03_FIREBALL_BURN_CHANCE=\.15,BETA03_BURN_CAP=10;\n  function beta03AddBurn\(target,stacks=1\)\{.*?\}\n  const triggerElementEffectV27Base=triggerElementEffect;triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\};\n',
    "  const BETA03_FIREBALL_BURN_CHANCE=window.DiceboundCombatElementResolution.fireBurnChance,BETA03_BURN_CAP=window.DiceboundCombatElementResolution.fireBurnCap;\n  function beta03AddBurn(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.addEnemyBurn.apply(this,args);}\n",
    'Beta03 element follow-up wrapper')

# 0.5.11 enemy parity direct replacement and helper implementation.
mono=regex_once(mono,
    r'  // ENEMY ELEMENTAL PARITY — enemy affinities now use mirrored versions of the\n  // player\'s elemental effects instead of the old unrelated penalty table\.\n  function db0511PlayerElementDamage\(raw\)\{.*?\n\n\n\n\n  function db0511RestoreEnemyElementDebuffs\(\)\{.*?\n  \}\n',
    "  // ENEMY ELEMENTAL PARITY — mechanical ownership lives in combat/element-resolution.js.\n  function db0511RestoreEnemyElementDebuffs(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.restoreEnemyElementDebuffs.apply(this,args);}\n",
    '0.5.11 enemy parity implementation')

# 0.6 Legendary element wrappers. Keep the two historical wrappers as separate
# cuts because triggerWeaponElement is intentionally a compact one-line wrapper.
mono=regex_once(mono,
    r'\n  // Weapon-proc effects and Pet Mirror element memory\.\n  const db060TriggerElementBase=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n    return r;\n  \};\n',
    '\n  // Weapon-proc effects and Pet Mirror element memory are owned by combat/element-resolution.js.\n',
    '0.6 Second Barrel element wrapper')
mono=regex_once(mono,
    r'  const db060TriggerWeaponBase=triggerWeaponElement;\n  triggerWeaponElement=function\(target=currentEnemy\)\{.*?return r;\};\n',
    '',
    '0.6 Prismatic Weapon wrapper')

# Presentation wrappers no longer own mechanics. The legacy play-animation
# adapters around them remain because combat/vfx.js still owns authored visuals.
for pattern,label in [
    (r'\n  const dbTriggerElementBase=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n  const dbEnemyElementProcBase=enemyElementProc;\n  enemyElementProc=function\(enemy\)\{.*?\n  \};\n', 'Nature mechanic/VFX wrappers'),
    (r'\n  const db064EnemyElementProcBase=enemyElementProc;\n  enemyElementProc=function\(enemy\)\{.*?\n  \};\n', 'Devil innate element wrapper'),
    (r'\n  const db064DonutTriggerElementBase=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n  const db064DonutEnemyElementProcBase=enemyElementProc;\n  enemyElementProc=function\(enemy\)\{.*?\n  \};\n', 'Donut mechanic/VFX wrappers'),
    (r'\n  const db0648TriggerElementBase=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n', 'target reconciliation element wrapper'),
    (r'\n  const dbFriendElementProcBase=triggerElementEffect;\n  triggerElementEffect=function\(key,target=currentEnemy,opts=\{\}\)\{.*?\n  \};\n  const dbFriendEnemyElementProcBase=enemyElementProc;\n  enemyElementProc=function\(enemy\)\{.*?\n  \};\n', 'Friends projectile element wrappers'),
]:
    mono=regex_once(mono,pattern,'\n',label)

composition="""
  const dbCombatElementOwner=window.DiceboundCombatElementResolution;
  if(!dbCombatElementOwner)throw new Error('DiceBound requires the combat Element-resolution owner before dicebound.js');
  dbCombatElementResolution=dbCombatElementOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    setCurrentEnemy:value=>{currentEnemy=value;},
    livingEnemies:()=>livingEnemies(),
    getEncounterLead:()=>currentEncounterLead,
    getEncounterTurn:()=>currentEncounterTurn,
    setEncounterTurn:value=>{currentEncounterTurn=value;},
    getElements:()=>ELEMENTS,
    getRarityValues:()=>rarityValues,
    getCoreElements:()=>DIBO_ELEMENTS,
    random:()=>random(),
    clamp:(value,min,max)=>clamp(value,min,max),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    applyPlayerDamage:raw=>applyCombatPlayerDamage(raw),
    healPlayer:(...args)=>healPlayer(...args),
    trackElementProgress:(key,amount)=>trackElementProgress(key,amount),
    playElementAnimation:(key,target,enemySource)=>playElementAnimation(key,target,enemySource),
    addLog:text=>addLog(text),
    showToast:(...args)=>showToast(...args),
    addCombatHistory:text=>addCombatHistory(text),
    renderEnemyParty:()=>renderEnemyParty(),
    updateCombatUI:()=>updateCombatUI(),
    updateHUD:()=>updateHUD(),
    setProcBonus:()=>v19SetProcBonus(),
    setElementPower:()=>v19SetElementPower(),
    hasLegendaryEffect:id=>db060HasEffect(id),
    reconcileDefeatedTarget:(target,reason)=>db0648ReconcileDefeatedTarget(target,reason),
    withNatureLegacyPresentation:(key,work)=>dbCombatVfx.withNatureLegacyPresentation(key,work),
    livingNatureTargets:list=>dbCombatVfx.livingNatureTargets(list),
    playNatureOnEnemy:enemy=>dbCombatVfx.playNatureOnEnemy(enemy),
    playNatureOnPlayer:()=>dbCombatVfx.playNatureOnPlayer(),
    playDonutRain:payload=>dbCombatVfx.playDonutRain(payload),
    playProjectileProc:(key,payload)=>dbCombatVfx.playProjectileProc?.(key,payload)
  });

"""
mono=replace_once(mono,
    '  const dbCombatHealingOwner=window.DiceboundCombatHealingResolution;\n',
    composition+'  const dbCombatHealingOwner=window.DiceboundCombatHealingResolution;\n',
    'Element owner composition boundary')
MONO.write_text(mono,encoding='utf-8')

manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
if any(m.get('id')=='combat-element-resolution' for m in manifest['modules']): raise SystemExit('combat-element-resolution already exists')
load_idx=manifest['loadOrder'].index('combat-healing-resolution')+1
manifest['loadOrder'].insert(load_idx,'combat-element-resolution')
module={
    'id':'combat-element-resolution','path':'js/combat/element-resolution.js',
    'domain':'combat/player-and-enemy-elemental-proc-effect-resolution',
    'status':'extracted','requires':[],'provides':['DiceboundCombatElementResolution']
}
module_idx=next(i for i,m in enumerate(manifest['modules']) if m.get('id')=='combat-healing-resolution')+1
manifest['modules'].insert(module_idx,module)
MANIFEST.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

index=INDEX.read_text(encoding='utf-8')
index=replace_once(index,
    '<script src="js/combat/healing-resolution.js"></script>\n',
    '<script src="js/combat/healing-resolution.js"></script>\n<script src="js/combat/element-resolution.js"></script>\n',
    'Element runtime script tag')
INDEX.write_text(index,encoding='utf-8')

shadow=SHADOW.read_text(encoding='utf-8')
block=r'''

element_retired = [
    'triggerElementEffectV15', 'triggerElementEffectV16Base', 'enemyElementProcV16Base',
    'triggerElementEffectV19Base', 'triggerElementEffectV27Base', 'triggerElementEffectBeta045Base',
    'db046TriggerElementBase', 'db047TriggerElementBase', 'db060TriggerElementBase',
    'db060TriggerWeaponBase', 'dbTriggerElementBase', 'dbEnemyElementProcBase',
    'db064EnemyElementProcBase', 'db064DonutTriggerElementBase', 'db064DonutEnemyElementProcBase',
    'db0648TriggerElementBase', 'dbFriendElementProcBase', 'dbFriendEnemyElementProcBase',
    'db0511PlayerElementDamage', 'db0511AddPlayerBurn', 'db0511AddPlayerPoison', 'db0511QueueControl',
]
for symbol in element_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Element owner returned: {symbol}"
assert mono.count('function triggerElementEffect(') == 1, 'triggerElementEffect must have exactly one thin compatibility adapter'
assert mono.count('function enemyElementProc(') == 1, 'enemyElementProc must have exactly one thin compatibility adapter'
assert mono.count('function triggerWeaponElement(') == 1, 'triggerWeaponElement must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*triggerElementEffect\s*=\s*function', mono), 'triggerElementEffect reassignment chain must not return'
assert not re.search(r'(?m)^\s*enemyElementProc\s*=\s*function', mono), 'enemyElementProc reassignment chain must not return'
assert not re.search(r'(?m)^\s*triggerWeaponElement\s*=\s*function', mono), 'triggerWeaponElement reassignment chain must not return'
assert "dbCombatElementResolution=dbCombatElementOwner.configure({" in mono, 'Element owner is not configured by the composition root'
assert "dbCombatElementResolution.triggerElementEffect.apply(this,args)" in mono, 'triggerElementEffect thin adapter is missing'
assert "dbCombatElementResolution.enemyElementProc.apply(this,args)" in mono, 'enemyElementProc thin adapter is missing'
assert "dbCombatElementResolution.triggerWeaponElement.apply(this,args)" in mono, 'triggerWeaponElement thin adapter is missing'
assert "dbCombatElementResolution.restoreEnemyElementDebuffs.apply(this,args)" in mono, 'enemy elemental cleanup adapter is missing'
'''
shadow=replace_once(shadow,"\nprint('Monolith spring-clean guard PASS')\n",block+"\nprint('Monolith spring-clean guard PASS')\n",'shadow guard terminator')
SHADOW.write_text(shadow,encoding='utf-8')

changelog=CHANGELOG.read_text(encoding='utf-8')
entry='''## Beta 0.6.6.13\n\n### Elemental Proc / Effect resolution ownership (#40, #209, #297)\n- Extracted player and enemy elemental proc/effect mechanics into `runtime/js/combat/element-resolution.js`.\n- Retired the historical Radiation, Haste anti-lock, Fire/Tech, Legendary, target-reconciliation and presentation wrapper ladders while preserving exact RNG/order and VFX callbacks.\n- Generic damage/healing, strike/Pet/enemy-turn orchestration and authored `combat/vfx.js` presentation remain separate owners.\n\n'''
changelog=replace_once(changelog,'## Beta 0.6.6.12\n',entry+'## Beta 0.6.6.12\n','CHANGELOG insertion')
CHANGELOG.write_text(changelog,encoding='utf-8')

notes=PATCH_NOTES.read_text(encoding='utf-8')
entry='''# Unreleased — Beta 0.6.6.13\n\n## Beta 0.6.6.13 Elemental Proc / Effect resolution ownership (#40, #209, #297)\n- `combat/element-resolution.js` now owns player/enemy elemental mechanics, affinity/weakness math, Radiation, Coffee/Haste safeguards, elemental progress and Legendary element chaining.\n- Fire Burn, Electric stun, Prismatic Echo, enemy parity and Second Barrel/Prismatic Weapon preserve their historical RNG draw order and target semantics.\n- `combat/vfx.js` remains the authored Nature/Donut/projectile presentation owner; generic Healing and damage remain separate.\n\n'''
notes=replace_once(notes,'# Unreleased — Beta 0.6.6.12\n',entry+'# Unreleased — Beta 0.6.6.12\n','PATCH_NOTES insertion')
PATCH_NOTES.write_text(notes,encoding='utf-8')

run('python','tools/set_project_version.py','--version','0.6.6.13','--channel','Beta')
version=VERSION.read_text(encoding='utf-8')
version=re.sub(r'const RELEASE_SUMMARY="[^"]*";', 'const RELEASE_SUMMARY="Elemental Proc / Effect resolution ownership extraction.";', version, count=1)
VERSION.write_text(version,encoding='utf-8')
index=INDEX.read_text(encoding='utf-8')
index=re.sub(r'<p>Beta v0\.6\.6\.13 · .*?</p>', '<p>Beta v0.6.6.13 · Elemental Proc / Effect resolution ownership.</p>', index, count=1)
INDEX.write_text(index,encoding='utf-8')
run('python','tools/refresh_runtime_manifest.py','--version','0.6.6.13','--channel','Beta','--development-state','Unreleased')

print('Materialized Beta 0.6.6.13 Elemental Proc / Effect Resolution extraction')
