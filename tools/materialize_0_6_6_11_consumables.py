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
    if count!=1: raise SystemExit(f'materialize 0.6.6.11: expected one {label}, found {count}')
    return text.replace(old,new,1)


def regex_once(text:str, pattern:str, replacement:str, label:str)->str:
    matches=list(re.finditer(pattern,text,flags=re.S))
    if len(matches)!=1: raise SystemExit(f'materialize 0.6.6.11: expected one {label}, found {len(matches)}')
    return re.sub(pattern,replacement,text,count=1,flags=re.S)


def run(*args:str)->None:
    subprocess.run(args,cwd=ROOT,check=True)


mono=MONO.read_text(encoding='utf-8')
mono=replace_once(mono,
    '  let dbCombatVictoryResolution=null;\n  let dbCombatAttackResolution=null;\n',
    '  let dbConsumablesResolution=null;\n  let dbCombatVictoryResolution=null;\n  let dbCombatAttackResolution=null;\n',
    'Consumables owner slot')

mono=regex_once(mono,
    r'  async function usePotion\(\)\{.*?\n  function handlePlayerDeath\(\)\{',
    "  async function usePotion(...args){if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.usePotion.apply(this,args);}\n  function usePotionOutsideCombat(...args){if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.usePotionOutsideCombat.apply(this,args);}\n\n  function handlePlayerDeath(){",
    'base Potion implementations')

mono=regex_once(mono,
    r'  function v16PotionHealValue\(mult=1\)\{.*?\n  async function alchemistVolatileFlaskV16\(\)',
    "  function v16PotionHealValue(mult=1){if(dbConsumablesResolution)return dbConsumablesResolution.potionHealValue(mult);return Math.max(1,Math.round((10+player.maxHp*.10)*(1+player.potionPower)*mult));}\n  function recordPotionUseV16(){if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.recordPotionUse();}\n  async function alchemistVolatileFlaskV16()",
    'V16 Potion ownership block')

mono=regex_once(mono,
    r'  const usePotionOutsideCombatV24Base=usePotionOutsideCombat;\n  usePotionOutsideCombat=function\(\)\{.*?\};\n',
    '',
    'V24 road Potion wrapper')

mono=replace_once(mono,
    "    const fn=({rollDice,rollTwoDice,returnToRoad,applyUpgrade,equipItem,usePotion,usePotionOutsideCombat})[name];if(typeof fn!=='function')return;\n",
    "    const fn=({rollDice,rollTwoDice,returnToRoad,applyUpgrade,equipItem})[name];if(typeof fn!=='function')return;\n",
    'v25 Potion traced-command lookup')
mono=replace_once(mono,
    "    if(name==='rollDice')rollDice=wrapped;else if(name==='rollTwoDice')rollTwoDice=wrapped;else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;else if(name==='usePotion')usePotion=wrapped;else if(name==='usePotionOutsideCombat')usePotionOutsideCombat=wrapped;\n",
    "    if(name==='rollDice')rollDice=wrapped;else if(name==='rollTwoDice')rollTwoDice=wrapped;else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;\n",
    'v25 Potion traced-command assignments')
mono=replace_once(mono,
    "  ['rollDice','rollTwoDice','returnToRoad','applyUpgrade','equipItem','usePotion','usePotionOutsideCombat'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'?'events':'detailed'));\n",
    "  ['rollDice','rollTwoDice','returnToRoad','applyUpgrade','equipItem'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'?'events':'detailed'));\n",
    'v25 Potion traced-command registration')

mono=replace_once(mono,
    '  async function identityPotionAction(){if(classIdentityActive("monk"))player.monkCombo=0;return usePotion();}\n',
    "  async function identityPotionAction(...args){if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.identityPotionAction.apply(this,args);}\n",
    'identity Potion base implementation')
mono=regex_once(mono,
    r'  // ---- Ranger / Fighter / Monk / Turtle identities -------------------------\n  identityPotionAction=async function\(\)\{.*?\};\n',
    '  // ---- Ranger / Fighter / Monk / Turtle identities -------------------------\n',
    'V16 identity Potion reassignment')

mono=regex_once(mono,
    r'  const dbFriendPotionBase=usePotion;\n  usePotion=async function\(\.\.\.args\)\{.*?\};\n',
    '',
    'Friends Patch Potion wrapper')

composition="""
  const dbConsumablesOwner=window.DiceboundConsumables;
  if(!dbConsumablesOwner)throw new Error('DiceBound requires the Consumables owner before dicebound.js');
  dbConsumablesResolution=dbConsumablesOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    livingEnemies:()=>livingEnemies(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    isGameStarted:()=>gameStarted,
    getRollLocked:()=>rollLocked,
    rollD20Chaos:action=>rollD20Chaos(action),
    healPlayer:amount=>healPlayer(amount),
    playHeal:()=>sfx.heal(),
    triggerElementEffect:(...args)=>triggerElementEffect(...args),
    getDiboElements:()=>DIBO_ELEMENTS,
    applyMythicPantsPulse:()=>applyMythicPantsPulse(),
    setCombatText:text=>setCombatText(text),
    updateCombatUI:()=>updateCombatUI(),
    delay:ms=>delay(ms),
    winCombat:()=>winCombat(),
    resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),
    ensureAlphaMeta:()=>ensureAlphaMeta(),
    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),
    saveMeta:()=>saveMeta(),
    renderClassChooser:()=>window.DiceboundClassChooser?.render?.(),
    addLog:html=>addLog(html),
    showToast:(...args)=>showToast(...args),
    updateHud:()=>updateHUD(),
    traceCommand:(name,fn,level,args,thisArg)=>v25TraceCommand(name,fn,level,args,thisArg),
    isClassActive:id=>classIdentityActive(id),
    dragoonActive:()=>dbFriendDragoonActive(),
    dragoonLandingReady:()=>!!player.dragoonLandingReady,
    dragoonLanding:()=>dbFriendDragoonLanding(),
    tickDragoonCooldown:()=>dbFriendTickDragoonCooldown()
  });

"""
mono=replace_once(mono,
    '  const dbCombatVictoryOwner=window.DiceboundCombatVictoryResolution;\n',
    composition+'  const dbCombatVictoryOwner=window.DiceboundCombatVictoryResolution;\n',
    'Consumables owner composition boundary')
MONO.write_text(mono,encoding='utf-8')

manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
if any(m.get('id')=='item-consumables' for m in manifest['modules']): raise SystemExit('item-consumables already exists')
idx=manifest['loadOrder'].index('item-equipment')+1
manifest['loadOrder'].insert(idx,'item-consumables')
module={
    'id':'item-consumables','path':'js/items/consumables.js','domain':'items/potion-and-consumable-action-resolution',
    'status':'extracted','requires':[],'provides':['DiceboundConsumables']
}
module_idx=next(i for i,m in enumerate(manifest['modules']) if m.get('id')=='item-equipment')+1
manifest['modules'].insert(module_idx,module)
manifest['plannedDomains']=[d for d in manifest.get('plannedDomains',[]) if d!='items/consumables']
MANIFEST.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

index=INDEX.read_text(encoding='utf-8')
index=replace_once(index,
    '<script src="js/items/equipment.js"></script>\n',
    '<script src="js/items/equipment.js"></script>\n<script src="js/items/consumables.js"></script>\n',
    'Consumables runtime script tag')
INDEX.write_text(index,encoding='utf-8')

shadow=SHADOW.read_text(encoding='utf-8')
block=r'''

consumables_retired = [
    'usePotionOutsideCombatV24Base', 'dbFriendPotionBase',
]
for symbol in consumables_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Consumables owner returned: {symbol}"
assert mono.count('async function usePotion(') == 1, 'usePotion must have exactly one thin compatibility adapter'
assert mono.count('function usePotionOutsideCombat(') == 1, 'usePotionOutsideCombat must have exactly one thin compatibility adapter'
assert mono.count('async function identityPotionAction(') == 1, 'identityPotionAction must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*usePotion\s*=\s*async function', mono), 'usePotion reassignment chain must not return'
assert not re.search(r'(?m)^\s*usePotionOutsideCombat\s*=\s*function', mono), 'road Potion reassignment chain must not return'
assert not re.search(r'(?m)^\s*identityPotionAction\s*=\s*async function', mono), 'identity Potion reassignment chain must not return'
assert "dbConsumablesResolution=dbConsumablesOwner.configure({" in mono, 'Consumables owner is not configured by the composition root'
assert "dbConsumablesResolution.usePotion.apply(this,args)" in mono, 'combat Potion thin adapter is missing'
assert "dbConsumablesResolution.usePotionOutsideCombat.apply(this,args)" in mono, 'road Potion thin adapter is missing'
assert "dbConsumablesResolution.identityPotionAction.apply(this,args)" in mono, 'identity Potion thin adapter is missing'
'''
shadow=replace_once(shadow,"\nprint('Monolith spring-clean guard PASS')\n",block+"\nprint('Monolith spring-clean guard PASS')\n",'shadow guard terminator')
SHADOW.write_text(shadow,encoding='utf-8')

changelog=CHANGELOG.read_text(encoding='utf-8')
entry='''## Beta 0.6.6.11\n\n### Potion / Consumable action-resolution ownership (#40, #209, #293)\n- Extracted combat and road Potion action resolution into `runtime/js/items/consumables.js` and retired the historical Potion reassignment ladder.\n- Preserved Double Dose, D20 Potion effects, exact healing/accounting, Alchemist usage tracking, Monk/Turtle action resets, Dragoon Landing precedence and Victory/enemy-response ordering.\n- Generic healing, elemental effects, D20 generation, Victory, enemy-response and Volatile Flask remain in their existing owners.\n\n'''
changelog=replace_once(changelog,'## Beta 0.6.6.10\n',entry+'## Beta 0.6.6.10\n','CHANGELOG insertion')
CHANGELOG.write_text(changelog,encoding='utf-8')

notes=PATCH_NOTES.read_text(encoding='utf-8')
entry='''# Unreleased — Beta 0.6.6.11\n\n## Beta 0.6.6.11 Potion / Consumable action-resolution ownership (#40, #209, #293)\n- `items/consumables.js` now owns combat Potion, Double Dose and road Potion transactions plus their historical action-level wrappers.\n- Potion counts, healing/rounding, Alchemist use tracking, D20 element ordering, Monk/Turtle reset behavior and Dragoon Landing precedence are preserved.\n- Generic healing, D20, elemental effects, Victory, enemy response and class-specific Volatile Flask behavior remain separate.\n\n'''
notes=replace_once(notes,'# Unreleased — Beta 0.6.6.10\n',entry+'# Unreleased — Beta 0.6.6.10\n','PATCH_NOTES insertion')
PATCH_NOTES.write_text(notes,encoding='utf-8')

run('python','tools/set_project_version.py','--version','0.6.6.11','--channel','Beta')
version=VERSION.read_text(encoding='utf-8')
version=re.sub(r'const RELEASE_SUMMARY="[^"]*";', 'const RELEASE_SUMMARY="Potion / consumable action-resolution ownership extraction.";', version, count=1)
VERSION.write_text(version,encoding='utf-8')
run('python','tools/refresh_runtime_manifest.py','--version','0.6.6.11','--channel','Beta','--development-state','Unreleased')

print('Materialized Beta 0.6.6.11 Potion / Consumable Action Resolution extraction')
