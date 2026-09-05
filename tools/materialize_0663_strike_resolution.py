#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONO_PATH=ROOT/'runtime/js/dicebound.js'


def replace_once(text:str,old:str,new:str,label:str)->str:
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected one literal, found {count}')
    return text.replace(old,new,1)


def regex_once(text:str,pattern:str,repl:str,label:str,flags:int=0)->str:
    out,count=re.subn(pattern,repl,text,count=1,flags=flags)
    if count!=1: raise SystemExit(f'{label}: expected one regex match, found {count}')
    return out


def remove_wrapper(text:str,capture:str,name:str,async_fn:bool=False)->str:
    escaped_capture=re.escape(capture);escaped_name=re.escape(name);async_prefix='async ' if async_fn else ''
    patterns=[
        rf'(?ms)^  const {escaped_capture}={escaped_name};\n  {escaped_name}={async_prefix}function\([^\n]*\)\{{.*?^  \}};\n',
        rf'(?m)^  const {escaped_capture}={escaped_name};{escaped_name}={async_prefix}function\([^\n]*\)\{{[^\n]*\}};\n',
    ]
    for pattern in patterns:
        out,count=re.subn(pattern,'',text,count=1)
        if count==1:return out
    raise SystemExit(f'{name} wrapper {capture}: no supported shape matched')


def write_json(path:Path,value:object)->None:
    path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')


mono=MONO_PATH.read_text(encoding='utf-8')

mono=replace_once(
    mono,
    '  let dbCombatPresentation=null;\n  let dbCombatEncounterLifecycle=null;\n  let dbCombatTurns=null;\n',
    '  let dbCombatStrikes=null;\n  let dbCombatPresentation=null;\n  let dbCombatEncounterLifecycle=null;\n  let dbCombatTurns=null;\n',
    'strike owner binding',
)

# Replace the original semantic base with thin compatibility entry points.
mono=regex_once(
    mono,
    r'(?m)^  function strikeBaseDamage\(echo=false,chaos=null,\{canCrit=true\}=\{\}\)\{[^\n]*\}\n',
    "  function strikeBaseDamage(...args){if(!dbCombatStrikes)throw new Error('Combat strike-resolution owner is not configured.');return dbCombatStrikes.strikeBaseDamage(...args);}\n",
    'base strikeBaseDamage adapter',
)
mono=regex_once(
    mono,
    r'(?ms)^  async function performStrike\(target,\{echo=false,index=0,chaos=null,canCrit=true\}=\{\}\)\{.*?^  \}\n\n  async function playerAttack\(\)',
    "  async function performStrike(...args){if(!dbCombatStrikes)throw new Error('Combat strike-resolution owner is not configured.');return dbCombatStrikes.performStrike(...args);}\n\n  async function playerAttack()",
    'base performStrike adapter',
)

# Retire the complete live strikeBaseDamage last-definition-wins stack.
for capture in ['strikeBaseDamageV13','strikeBaseDamageV15','strikeBaseDamageV26OuroBase','db060StrikeBaseDamageBase']:
    mono=remove_wrapper(mono,capture,'strikeBaseDamage',False)

# Retire the complete live performStrike wrapper stack. Broader playerAttack,
# Guard, Potion, Pet and Ultimate ownership stays deliberately untouched.
for capture in [
    'performStrikeV13','performStrikeV16Base','performStrikeV17Base','performStrikeV18Base','performStrikeV24Base',
    'performStrikeV25PoisonBase','performStrikeV26SpeedBase','performStrikeV27SpeedDodgeBase','performStrikeV28SmokeBase',
    'performStrikeBeta04Base','db060PerformStrikeBase',
]:
    mono=remove_wrapper(mono,capture,'performStrike',True)

retired=[
    'strikeBaseDamageV13','strikeBaseDamageV15','strikeBaseDamageV26OuroBase','db060StrikeBaseDamageBase',
    'performStrikeV13','performStrikeV16Base','performStrikeV17Base','performStrikeV18Base','performStrikeV24Base','performStrikeV25PoisonBase',
    'performStrikeV26SpeedBase','performStrikeV27SpeedDodgeBase','performStrikeV28SmokeBase','performStrikeBeta04Base','db060PerformStrikeBase',
]
for symbol in retired:
    if re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])',mono):raise SystemExit(f'retired strike symbol remains: {symbol}')
if len(re.findall(r'(?m)^  function strikeBaseDamage\(',mono))!=1:raise SystemExit('expected exactly one thin strikeBaseDamage adapter')
if len(re.findall(r'(?m)^  async function performStrike\(',mono))!=1:raise SystemExit('expected exactly one thin performStrike adapter')
if re.search(r'(?m)^\s*strikeBaseDamage\s*=\s*function',mono):raise SystemExit('strikeBaseDamage reassignment remains after extraction')
if re.search(r'(?m)^\s*performStrike\s*=\s*async function',mono):raise SystemExit('performStrike reassignment remains after extraction')

# Compose the authoritative strike owner late, after all injected helpers have
# reached their final live definitions, but before other combat owners are
# configured from the same composition root.
strike_config="""  const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;\n  if(!dbCombatStrikeOwner)throw new Error('DiceBound requires the combat strike-resolution owner before dicebound.js');\n  dbCombatStrikes=dbCombatStrikeOwner.configure({\n    getPlayer:()=>player,\n    getEncounterLead:()=>currentEncounterLead,\n    livingEnemies:()=>livingEnemies(),\n    isClassActive:id=>classIdentityActive(id),\n    random,\n    rand,\n    pick,\n    clamp,\n    rollTieredProc,\n    resolveCriticalTiers:(roller,options)=>window.DiceboundStrikePolicy.resolveCriticalTiers(roller,options),\n    rangerMarkTotal:(before,options)=>window.DiceboundStrikePolicy.rangerMarkTotal(before,options),\n    setDamageBonus:()=>v19SetDamageBonus(),\n    petDamage:()=>petDamage(),\n    healPlayer:amount=>healPlayer(amount),\n    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),\n    animateClassAttack:mode=>animateClassAttack(mode),\n    playElementAnimation:(key,target,fromEnemy)=>playElementAnimation(key,target,fromEnemy),\n    addCombatHistory:text=>addCombatHistory(text),\n    updateCombatUI:()=>updateCombatUI(),\n    setCombatText:text=>setCombatText(text),\n    playHolySfx:()=>sfx.holy(),\n    triggerStrikeElements:(target,chaos)=>triggerStrikeElements(target,chaos),\n    triggerElementEffect:(key,target,options)=>triggerElementEffect(key,target,options),\n    identityFlash:text=>identityFlash(text),\n    reconcileDefeatedTarget:(target,reason)=>db0648ReconcileDefeatedTarget(target,reason),\n    presentationTargetSnapshot:()=>db0648PresentationTargetSnapshot(),\n    emitStrike:result=>DiceboundStateEvents.emit('combat:strike',result),\n    renderStrike:result=>CombatUI.renderStrike(result),\n    delay:ms=>delay(ms),\n    chargeUltimate:amount=>chargeUltimate(amount),\n    hasDevilsHorns:()=>v24HasHorns(),\n    hasLegendaryEffect:id=>db060HasEffect(id),\n    syncOuroborosAttack:()=>v18SyncOuroborosAttack(),\n    syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),\n    getFastEchoCap:()=>window.__DB_FAST_ECHO_CAP__||0,\n    setFastEchoCap:value=>{window.__DB_FAST_ECHO_CAP__=value;},\n    getV26FastEcho:()=>!!window.__DB_V26_FAST_ECHO__,\n    setV26FastEcho:value=>{window.__DB_V26_FAST_ECHO__=!!value;},\n    getElementKeys:()=>ELEMENT_KEYS\n  });\n\n"""
mono=replace_once(mono,'  const dbCombatPresentationOwner=window.DiceboundCombatPresentation;\n',strike_config+'  const dbCombatPresentationOwner=window.DiceboundCombatPresentation;\n','strike composition root')

MONO_PATH.write_text(mono,encoding='utf-8')

# Module ownership/load order.
manifest_path=ROOT/'runtime/js/module-manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
if 'combat-strike-resolution' not in manifest['loadOrder']:
    pos=manifest['loadOrder'].index('combat-strike-policy')+1
    manifest['loadOrder'].insert(pos,'combat-strike-resolution')
if not any(m.get('id')=='combat-strike-resolution' for m in manifest['modules']):
    pos=next(i for i,m in enumerate(manifest['modules']) if m.get('id')=='combat-strike-policy')+1
    manifest['modules'].insert(pos,{
        'id':'combat-strike-resolution','path':'js/combat/strike-resolution.js','domain':'combat/basic-and-echo-strike-resolution',
        'status':'extracted','requires':['combat-strike-policy'],'provides':['DiceboundCombatStrikeResolution']
    })
monolith=next(m for m in manifest['modules'] if m.get('id')=='dicebound-monolith')
requires=monolith.setdefault('requires',[])
if 'combat-strike-resolution' not in requires:
    anchor=requires.index('combat-strike-policy')+1 if 'combat-strike-policy' in requires else 0
    requires.insert(anchor,'combat-strike-resolution')
write_json(manifest_path,manifest)

# Browser and native-wrapper runtime script lists.
index_path=ROOT/'runtime/index.html'
index=index_path.read_text(encoding='utf-8')
index=replace_once(index,'<script src="js/combat/strike-policy.js"></script>\n','<script src="js/combat/strike-policy.js"></script>\n<script src="js/combat/strike-resolution.js"></script>\n','runtime strike script tag')
index_path.write_text(index,encoding='utf-8')

project_path=ROOT/'wrapper-source/config/project.json'
project=json.loads(project_path.read_text(encoding='utf-8'))
scripts=project.get('runtimeScripts',[])
script='js/combat/strike-resolution.js'
if script not in scripts:
    pos=scripts.index('js/combat/strike-policy.js')+1
    scripts.insert(pos,script)
project['runtimeScripts']=scripts
write_json(project_path,project)

# Permanent anti-shadow ownership guard.
shadow_path=ROOT/'tools/test_shadow_ownership_drain.py'
shadow=shadow_path.read_text(encoding='utf-8')
anchor="\nprint('Monolith spring-clean guard PASS')\n"
strike_guard="""\nstrike_retired = [\n    'strikeBaseDamageV13','strikeBaseDamageV15','strikeBaseDamageV26OuroBase','db060StrikeBaseDamageBase',\n    'performStrikeV13','performStrikeV16Base','performStrikeV17Base','performStrikeV18Base','performStrikeV24Base','performStrikeV25PoisonBase',\n    'performStrikeV26SpeedBase','performStrikeV27SpeedDodgeBase','performStrikeV28SmokeBase','performStrikeBeta04Base','db060PerformStrikeBase',\n]\nfor symbol in strike_retired:\n    assert not re.search(rf'(?<![\\w$]){re.escape(symbol)}(?![\\w$])', mono), f\"retired strike-resolution owner returned: {symbol}\"\nassert mono.count('function strikeBaseDamage(') == 1, 'strikeBaseDamage must have exactly one thin compatibility adapter'\nassert mono.count('async function performStrike(') == 1, 'performStrike must have exactly one thin compatibility adapter'\nassert not re.search(r'(?m)^\\s*strikeBaseDamage\\s*=\\s*function', mono), 'strikeBaseDamage reassignment chain must not return'\nassert not re.search(r'(?m)^\\s*performStrike\\s*=\\s*async function', mono), 'performStrike reassignment chain must not return'\nassert \"dbCombatStrikes=dbCombatStrikeOwner.configure({\" in mono, 'combat strike-resolution owner is not configured by the composition root'\n"""
if 'strike_retired = [' not in shadow:
    shadow=replace_once(shadow,anchor,strike_guard+anchor,'shadow strike guard insertion')
shadow_path.write_text(shadow,encoding='utf-8')

# Candidate changelog entry. Release metadata/version stamping is handled by the
# repository's normal version tools after materialization.
changelog_path=ROOT/'CHANGELOG.md'
changelog=changelog_path.read_text(encoding='utf-8')
heading='## Beta 0.6.6.3\n'
if heading not in changelog:
    marker='This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n'
    entry="""## Beta 0.6.6.3\n\n### Player strike / basic attack resolution ownership (#40, #209, #275)\n- Extracted individual basic/Echo strike resolution into `runtime/js/combat/strike-resolution.js`, consolidating the live `strikeBaseDamage` and `performStrike` patch stack behind one authoritative owner.\n- Preserved exact Crit/Echo/Dodge/Poison RNG ordering, Ranger Marks, Fighter/Turtle strike consumption, Ninja Smoke Execution, Ouroboros speed/conversion, Devil's Horns and current strike-level Legendary effects, including historical ordering quirks.\n- Guard, Potion, Pet combat, Ultimates and broader player-action orchestration remain outside this slice; gameplay values, saves/checkpoints and enemy-response ordering are unchanged.\n\n"""
    changelog=replace_once(changelog,marker,marker+entry,'0.6.6.3 changelog entry')
changelog_path.write_text(changelog,encoding='utf-8')

print(json.dumps({'ok':True,'monolithBytes':len(mono.encode('utf-8')),'monolithLines':len(mono.splitlines())},indent=2))
