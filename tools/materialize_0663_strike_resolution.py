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


def matching_brace(text:str,start:int)->int:
    if text[start]!='{': raise SystemExit('brace scanner did not start on {')
    depth=0;quote=None;escape=False;line_comment=False;block_comment=False;i=start
    while i<len(text):
        ch=text[i];nxt=text[i+1] if i+1<len(text) else ''
        if line_comment:
            if ch=='\n': line_comment=False
            i+=1;continue
        if block_comment:
            if ch=='*' and nxt=='/': block_comment=False;i+=2;continue
            i+=1;continue
        if quote:
            if escape: escape=False;i+=1;continue
            if ch=='\\': escape=True;i+=1;continue
            if ch==quote: quote=None
            i+=1;continue
        if ch in "'\"`": quote=ch;i+=1;continue
        if ch=='/' and nxt=='/': line_comment=True;i+=2;continue
        if ch=='/' and nxt=='*': block_comment=True;i+=2;continue
        if ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0:return i
        i+=1
    raise SystemExit('unterminated function body while draining wrapper')


def remove_wrapper(text:str,capture:str,name:str,async_fn:bool=False)->str:
    marker=f'const {capture}={name};'
    if text.count(marker)!=1: raise SystemExit(f'{capture}: expected one capture marker, found {text.count(marker)}')
    start=text.index(marker)
    assign=f'{name}={"async " if async_fn else ""}function'
    assign_at=text.find(assign,start+len(marker))
    if assign_at<0: raise SystemExit(f'{capture}: assignment not found after capture')
    between=text[start+len(marker):assign_at]
    if between.strip(): raise SystemExit(f'{capture}: unexpected code between capture and assignment: {between[:80]!r}')
    body_at=text.find('){',assign_at)
    if body_at<0: raise SystemExit(f'{capture}: function body opening not found')
    body_at+=1
    end=matching_brace(text,body_at)
    if end+1>=len(text) or text[end+1]!=';': raise SystemExit(f'{capture}: function body is not followed by semicolon')
    stop=end+2
    if stop<len(text) and text[stop]=='\r':stop+=1
    if stop<len(text) and text[stop]=='\n':stop+=1
    # Keep surrounding patch text untouched; remove exactly capture + its function assignment.
    return text[:start]+text[stop:]


def write_json(path:Path,value:object)->None:
    path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')


mono=MONO_PATH.read_text(encoding='utf-8')
mono=replace_once(mono,'  let dbCombatPresentation=null;\n  let dbCombatEncounterLifecycle=null;\n  let dbCombatTurns=null;\n','  let dbCombatStrikes=null;\n  let dbCombatPresentation=null;\n  let dbCombatEncounterLifecycle=null;\n  let dbCombatTurns=null;\n','strike owner binding')

mono=regex_once(mono,r'(?m)^  function strikeBaseDamage\(echo=false,chaos=null,\{canCrit=true\}=\{\}\)\{[^\n]*\}\n',"  function strikeBaseDamage(...args){if(!dbCombatStrikes)throw new Error('Combat strike-resolution owner is not configured.');return dbCombatStrikes.strikeBaseDamage(...args);}\n",'base strikeBaseDamage adapter')
mono=regex_once(mono,r'(?ms)^  async function performStrike\(target,\{echo=false,index=0,chaos=null,canCrit=true\}=\{\}\)\{.*?^  \}\n\n  async function playerAttack\(\)',"  async function performStrike(...args){if(!dbCombatStrikes)throw new Error('Combat strike-resolution owner is not configured.');return dbCombatStrikes.performStrike(...args);}\n\n  async function playerAttack()",'base performStrike adapter')

for capture in ['strikeBaseDamageV13','strikeBaseDamageV15','strikeBaseDamageV26OuroBase','db060StrikeBaseDamageBase']:
    mono=remove_wrapper(mono,capture,'strikeBaseDamage',False)
for capture in ['performStrikeV13','performStrikeV16Base','performStrikeV17Base','performStrikeV18Base','performStrikeV24Base','performStrikeV25PoisonBase','performStrikeV26SpeedBase','performStrikeV27SpeedDodgeBase','performStrikeV28SmokeBase','performStrikeBeta04Base','db060PerformStrikeBase']:
    mono=remove_wrapper(mono,capture,'performStrike',True)

retired=['strikeBaseDamageV13','strikeBaseDamageV15','strikeBaseDamageV26OuroBase','db060StrikeBaseDamageBase','performStrikeV13','performStrikeV16Base','performStrikeV17Base','performStrikeV18Base','performStrikeV24Base','performStrikeV25PoisonBase','performStrikeV26SpeedBase','performStrikeV27SpeedDodgeBase','performStrikeV28SmokeBase','performStrikeBeta04Base','db060PerformStrikeBase']
for symbol in retired:
    if re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])',mono):raise SystemExit(f'retired strike symbol remains: {symbol}')
if len(re.findall(r'(?m)^  function strikeBaseDamage\(',mono))!=1:raise SystemExit('expected exactly one thin strikeBaseDamage adapter')
if len(re.findall(r'(?m)^  async function performStrike\(',mono))!=1:raise SystemExit('expected exactly one thin performStrike adapter')
if re.search(r'(?m)^\s*strikeBaseDamage\s*=\s*function',mono):raise SystemExit('strikeBaseDamage reassignment remains')
if re.search(r'(?m)^\s*performStrike\s*=\s*async function',mono):raise SystemExit('performStrike reassignment remains')

strike_config="""  const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;
  if(!dbCombatStrikeOwner)throw new Error('DiceBound requires the combat strike-resolution owner before dicebound.js');
  dbCombatStrikes=dbCombatStrikeOwner.configure({
    getPlayer:()=>player,getEncounterLead:()=>currentEncounterLead,livingEnemies:()=>livingEnemies(),isClassActive:id=>classIdentityActive(id),
    random,rand,pick,clamp,rollTieredProc,
    resolveCriticalTiers:(roller,options)=>window.DiceboundStrikePolicy.resolveCriticalTiers(roller,options),
    rangerMarkTotal:(before,options)=>window.DiceboundStrikePolicy.rangerMarkTotal(before,options),
    setDamageBonus:()=>v19SetDamageBonus(),petDamage:()=>petDamage(),healPlayer:amount=>healPlayer(amount),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),animateClassAttack:mode=>animateClassAttack(mode),
    playElementAnimation:(key,target,fromEnemy)=>playElementAnimation(key,target,fromEnemy),addCombatHistory:text=>addCombatHistory(text),
    updateCombatUI:()=>updateCombatUI(),setCombatText:text=>setCombatText(text),playHolySfx:()=>sfx.holy(),
    triggerStrikeElements:(target,chaos)=>triggerStrikeElements(target,chaos),triggerElementEffect:(key,target,options)=>triggerElementEffect(key,target,options),
    identityFlash:text=>identityFlash(text),reconcileDefeatedTarget:(target,reason)=>db0648ReconcileDefeatedTarget(target,reason),
    presentationTargetSnapshot:()=>db0648PresentationTargetSnapshot(),emitStrike:result=>DiceboundStateEvents.emit('combat:strike',result),
    renderStrike:result=>CombatUI.renderStrike(result),delay:ms=>delay(ms),chargeUltimate:amount=>chargeUltimate(amount),
    hasDevilsHorns:()=>v24HasHorns(),hasLegendaryEffect:id=>db060HasEffect(id),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),
    syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),getFastEchoCap:()=>window.__DB_FAST_ECHO_CAP__||0,
    setFastEchoCap:value=>{window.__DB_FAST_ECHO_CAP__=value;},getV26FastEcho:()=>!!window.__DB_V26_FAST_ECHO__,
    setV26FastEcho:value=>{window.__DB_V26_FAST_ECHO__=!!value;},getElementKeys:()=>ELEMENT_KEYS
  });

"""
mono=replace_once(mono,'  const dbCombatPresentationOwner=window.DiceboundCombatPresentation;\n',strike_config+'  const dbCombatPresentationOwner=window.DiceboundCombatPresentation;\n','strike composition root')
MONO_PATH.write_text(mono,encoding='utf-8')

manifest_path=ROOT/'runtime/js/module-manifest.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
if 'combat-strike-resolution' not in manifest['loadOrder']:manifest['loadOrder'].insert(manifest['loadOrder'].index('combat-strike-policy')+1,'combat-strike-resolution')
if not any(m.get('id')=='combat-strike-resolution' for m in manifest['modules']):
    pos=next(i for i,m in enumerate(manifest['modules']) if m.get('id')=='combat-strike-policy')+1
    manifest['modules'].insert(pos,{'id':'combat-strike-resolution','path':'js/combat/strike-resolution.js','domain':'combat/basic-and-echo-strike-resolution','status':'extracted','requires':['combat-strike-policy'],'provides':['DiceboundCombatStrikeResolution']})
monolith=next(m for m in manifest['modules'] if m.get('id')=='dicebound-monolith');requires=monolith.setdefault('requires',[])
if 'combat-strike-resolution' not in requires:requires.insert(requires.index('combat-strike-policy')+1 if 'combat-strike-policy' in requires else 0,'combat-strike-resolution')
write_json(manifest_path,manifest)

index_path=ROOT/'runtime/index.html';index=index_path.read_text(encoding='utf-8');index=replace_once(index,'<script src="js/combat/strike-policy.js"></script>\n','<script src="js/combat/strike-policy.js"></script>\n<script src="js/combat/strike-resolution.js"></script>\n','runtime strike script tag');index_path.write_text(index,encoding='utf-8')
project_path=ROOT/'wrapper-source/config/project.json';project=json.loads(project_path.read_text(encoding='utf-8'));scripts=project.get('runtimeScripts',[]);script='js/combat/strike-resolution.js'
if script not in scripts:scripts.insert(scripts.index('js/combat/strike-policy.js')+1,script)
project['runtimeScripts']=scripts;write_json(project_path,project)

shadow_path=ROOT/'tools/test_shadow_ownership_drain.py';shadow=shadow_path.read_text(encoding='utf-8');anchor="\nprint('Monolith spring-clean guard PASS')\n"
strike_guard="""
strike_retired = [
    'strikeBaseDamageV13','strikeBaseDamageV15','strikeBaseDamageV26OuroBase','db060StrikeBaseDamageBase',
    'performStrikeV13','performStrikeV16Base','performStrikeV17Base','performStrikeV18Base','performStrikeV24Base','performStrikeV25PoisonBase',
    'performStrikeV26SpeedBase','performStrikeV27SpeedDodgeBase','performStrikeV28SmokeBase','performStrikeBeta04Base','db060PerformStrikeBase',
]
for symbol in strike_retired:
    assert not re.search(rf'(?<![\\w$]){re.escape(symbol)}(?![\\w$])', mono), f"retired strike-resolution owner returned: {symbol}"
assert mono.count('function strikeBaseDamage(') == 1, 'strikeBaseDamage must have exactly one thin compatibility adapter'
assert mono.count('async function performStrike(') == 1, 'performStrike must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\\s*strikeBaseDamage\\s*=\\s*function', mono), 'strikeBaseDamage reassignment chain must not return'
assert not re.search(r'(?m)^\\s*performStrike\\s*=\\s*async function', mono), 'performStrike reassignment chain must not return'
assert "dbCombatStrikes=dbCombatStrikeOwner.configure({" in mono, 'combat strike-resolution owner is not configured by the composition root'
"""
if 'strike_retired = [' not in shadow:shadow=replace_once(shadow,anchor,strike_guard+anchor,'shadow strike guard insertion')
shadow_path.write_text(shadow,encoding='utf-8')

changelog_path=ROOT/'CHANGELOG.md';changelog=changelog_path.read_text(encoding='utf-8');heading='## Beta 0.6.6.3\n'
if heading not in changelog:
    marker='This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n'
    entry="""## Beta 0.6.6.3

### Player strike / basic attack resolution ownership (#40, #209, #275)
- Extracted individual basic/Echo strike resolution into `runtime/js/combat/strike-resolution.js`, consolidating the live `strikeBaseDamage` and `performStrike` patch stack behind one authoritative owner.
- Preserved exact Crit/Echo/Dodge/Poison RNG ordering, Ranger Marks, Fighter/Turtle strike consumption, Ninja Smoke Execution, Ouroboros speed/conversion, Devil's Horns and current strike-level Legendary effects, including historical ordering quirks.
- Guard, Potion, Pet combat, Ultimates and broader player-action orchestration remain outside this slice; gameplay values, saves/checkpoints and enemy-response ordering are unchanged.

"""
    changelog=replace_once(changelog,marker,marker+entry,'0.6.6.3 changelog entry')
changelog_path.write_text(changelog,encoding='utf-8')

print(json.dumps({'ok':True,'monolithBytes':len(mono.encode('utf-8')),'monolithLines':len(mono.splitlines())},indent=2))
