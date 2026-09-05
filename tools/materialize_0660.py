#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
MANIFEST=ROOT/'runtime/js/module-manifest.json'
SHADOW=ROOT/'tools/test_shadow_ownership_drain.py'


def sub_once(text: str, pattern: str, replacement: str, label: str, flags: int=re.S) -> str:
    matches=list(re.finditer(pattern,text,flags))
    if len(matches)!=1:
        raise SystemExit(f'0.6.6.0 MATERIALIZE FAILED: {label}: expected 1 match, found {len(matches)}')
    return re.sub(pattern,lambda _m:replacement,text,count=1,flags=flags)


def drop_once(text: str, pattern: str, label: str, flags: int=re.S) -> str:
    return sub_once(text,pattern,'',label,flags)


text=MONOLITH.read_text(encoding='utf-8').replace('\r\n','\n')

adapter='''  // Beta 0.6.6.0: enemy-response and enemy-turn orchestration is owned by\n  // combat/turn-resolution.js. These lexical adapters stay mutable so the\n  // existing regression hooks can temporarily replace them without creating\n  // a second production owner.\n  let dbCombatTurns=null;\n  async function enemyTurn(...args){if(!dbCombatTurns)throw new Error('Combat turn-resolution owner is not configured.');return dbCombatTurns.enemyTurn(...args);}\n  async function resolveEnemyResponse(...args){if(!dbCombatTurns)throw new Error('Combat turn-resolution owner is not configured.');return dbCombatTurns.resolveEnemyResponse(...args);}\n  function applyCombatPlayerDamage(raw){if(!dbCombatTurns)throw new Error('Combat turn-resolution owner is not configured.');return dbCombatTurns.applyPlayerDamage(raw);}\n\n'''
text=sub_once(
    text,
    r"  async function enemyTurn\(guarded,extraGuardPower=0\)\{\n    if\(!currentEnemy\)return;currentEncounterTurn\+\+;let messages=\[\];.*?\n  \}\n\n  async function resolveEnemyResponse\(guarded=false,extraGuardPower=0\)\{\n    await petTurn\(\);.*?\n  \}\n\n",
    adapter,
    'replace original enemyTurn/resolveEnemyResponse with adapters'
)

# Fully shadowed enemy-turn owners predating the final v2.4 rewrite.
text=drop_once(text,r"^  const enemyTurnV11=enemyTurn;enemyTurn=.*?;\n",'drop v1.1 enemyTurn wrapper',re.M)
text=drop_once(
    text,
    r"  enemyTurn=async function\(guarded,extraGuardPower=0\)\{\n    if\(!currentEnemy\)return;currentEncounterTurn\+\+;let messages=\[\];const lead=currentEncounterLead,special=.*?\n  \};\n\n(?=  // ---- Rarity/Luck)",
    'drop v1.5 full enemyTurn shadow'
)

# Enemy-response wrapper ladder, folded into the extracted owner in exact order.
text=drop_once(text,r"^  const resolveEnemyResponseV15=resolveEnemyResponse;resolveEnemyResponse=.*?;\n",'drop freeze response wrapper',re.M)
text=drop_once(text,r"  const resolveEnemyResponseV19Base=resolveEnemyResponse;\n  resolveEnemyResponse=async function\(guarded=false\)\{.*?\n  \};\n",'drop v1.9 haste response wrapper')

# v2.4 incoming-hit / special owner is moved to combat/turn-resolution.js.
text=drop_once(text,r"  function v24AttackPattern\(enemy\)\{\n.*?\n  \}\n",'drop historical attack-pattern helper')
text=drop_once(text,r"^  function v24ApplyDamage\(raw\)\{.*?\}\n",'drop historical player-damage helper',re.M)
text=drop_once(
    text,
    r"  async function v24ResolveNormalHits\(enemy,guarded,extraGuardPower,messages,roundState=\{hit:false\}\)\{\n.*?\n  \}\n(?=  enemyTurn=async function\(guarded,extraGuardPower=0\)\{\n    if\(!currentEnemy\)return;currentEncounterTurn\+\+;let messages=\[\],roundState=\{hit:false\};)",
    'drop historical normal-hit helper'
)
text=drop_once(
    text,
    r"  enemyTurn=async function\(guarded,extraGuardPower=0\)\{\n    if\(!currentEnemy\)return;currentEncounterTurn\+\+;let messages=\[\],roundState=\{hit:false\};.*?\n  \};\n(?=  const performStrikeV24Base=performStrike;)",
    'drop v2.4 full enemyTurn owner'
)
text=drop_once(text,r"^  const resolveEnemyResponseV24Base=resolveEnemyResponse;resolveEnemyResponse=.*?;\n",'drop coffee response wrapper',re.M)

# v2.5 Pale Devil/Burn extensions are folded into the owner, not retained as wrappers.
text=drop_once(text,r"  v24AttackPattern=function\(enemy\)\{\n.*?\n  \};\n",'drop v2.5 attack-pattern override')
text=drop_once(text,r"^  const v24ResolveNormalHitsV25Base=v24ResolveNormalHits;\n",'drop v2.5 normal-hit capture',re.M)
text=drop_once(text,r"^  v24ResolveNormalHits=async function.*?;\n",'drop v2.5 normal-hit wrapper',re.M)
text=drop_once(text,r"^  function beta03TickEnemyBurns\(\)\{.*?\}\n",'drop enemy Burn tick helper',re.M)
text=drop_once(text,r"^  const enemyTurnV25DevilBase=enemyTurn;\n",'drop Devil enemyTurn capture',re.M)
text=drop_once(text,r"^  enemyTurn=async function\(guarded,extraGuardPower=0\)\{const devil=.*?;\n",'drop Devil enemyTurn wrapper',re.M)

# Later Haste anti-lock response wrappers.
text=drop_once(
    text,
    r"  const resolveEnemyResponseBeta045Base=resolveEnemyResponse;\n  resolveEnemyResponse=async function\(guarded=false\)\{\n.*?\n  \};\n",
    'drop Beta 0.4.5 response clamp'
)
text=drop_once(
    text,
    r"  const db046ResolveEnemyBase=resolveEnemyResponse;\n  resolveEnemyResponse=async function\(guarded=false,extraGuardPower=0\)\{\n.*?\n  \};\n",
    'drop Beta 0.4.6 response lock'
)
text=drop_once(
    text,
    r"  const db047ResolveEnemyBase=resolveEnemyResponse;\n  resolveEnemyResponse=async function\(guarded=false,extraGuardPower=0\)\{\n.*?\n  \};\n",
    'drop Beta 0.4.7 response gate'
)

# Player status pre-tick and forced-control repeat now belong to the turn owner.
text=drop_once(text,r"  function db0511TickPlayerElementStatuses\(\)\{\n.*?\n  \}\n",'drop player status response helper')
text=drop_once(
    text,
    r"  const db0511ResolveEnemyResponseBase=resolveEnemyResponse;\n  resolveEnemyResponse=async function\(guarded=false,extraGuardPower=0\)\{\n.*?\n  \};\n",
    'drop player-status response wrapper'
)
text=drop_once(
    text,
    r"  const db0511EnemyTurnBase=enemyTurn;\n  enemyTurn=async function\(guarded=false,extraGuardPower=0\)\{\n.*?\n  \};\n",
    'drop forced-control enemyTurn wrapper'
)

# Legendary incoming-defense wrapper, Wolf follow-up, and Dragoon Airborne layer.
text=drop_once(text,r"^  const db060EnemyTurnBase=enemyTurn;\n  enemyTurn=async function\(\.\.\.args\)\{.*?\};\n",'drop Glass Fortress enemyTurn wrapper',re.M)
text=drop_once(text,r"  async function db064ResolveWolfEchoes\(\)\{\n.*?\n  \}\n",'drop Wolf Echo resolver')
text=drop_once(
    text,
    r"  const db064EnemyTurnBase=enemyTurn;\n  enemyTurn=async function\(\.\.\.args\)\{\n.*?\n  \};\n",
    'drop Wolf enemyTurn wrapper'
)
text=drop_once(
    text,
    r"  const dbFriendEnemyTurnBase=enemyTurn;\n  enemyTurn=async function\(\.\.\.args\)\{\n.*?\n  \};\n",
    'drop Dragoon enemyTurn wrapper'
)

# Remaining monolith consumers use the neutral extracted damage adapter/test surface.
if text.count('return v24ApplyDamage(Math.max(1,Math.round(raw||0)));')!=1:
    raise SystemExit('0.6.6.0 MATERIALIZE FAILED: expected one player-element v24ApplyDamage adapter use')
text=text.replace('return v24ApplyDamage(Math.max(1,Math.round(raw||0)));','return applyCombatPlayerDamage(Math.max(1,Math.round(raw||0)));',1)
if text.count('const before=e.hp,result=beta03TickEnemyBurns();')!=1:
    raise SystemExit('0.6.6.0 MATERIALIZE FAILED: expected one beta03 Burn regression call')
text=text.replace('const before=e.hp,result=beta03TickEnemyBurns();','const before=e.hp,result=dbCombatTurns.test.tickEnemyBurns();',1)

# Configure the extracted owner once, after every injected combat dependency has reached its final runtime binding.
configure_block='''  const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;\n  if(!dbCombatTurnOwner)throw new Error('DiceBound requires the combat turn-resolution owner before dicebound.js');\n  dbCombatTurns=dbCombatTurnOwner.configure({\n    guardianSpecialInterval:GUARDIAN_SPECIAL_INTERVAL,\n    getPlayer:()=>player,\n    getCurrentEnemy:()=>currentEnemy,\n    getCurrentEnemies:()=>currentEnemies,\n    getEncounterLead:()=>currentEncounterLead,\n    getEncounterTurn:()=>currentEncounterTurn,\n    setEncounterTurn:value=>{currentEncounterTurn=value;},\n    setCombatBusy:value=>{combatBusy=value;},\n    livingEnemies:()=>livingEnemies(),\n    selectEnemy:index=>setCurrentEnemy(index),\n    random:()=>random(),\n    rand:(min,max)=>rand(min,max),\n    clamp:(value,min,max)=>clamp(value,min,max),\n    delay:ms=>delay(ms),\n    petTurn:()=>petTurn(),\n    applyPoisonTick:()=>applyPoisonTick(),\n    winCombat:()=>winCombat(),\n    handlePlayerDeath:()=>handlePlayerDeath(),\n    setCombatText:(...args)=>setCombatText(...args),\n    updateCombatUI:()=>updateCombatUI(),\n    addCombatHistory:text=>addCombatHistory(text),\n    renderEnemyParty:()=>renderEnemyParty(),\n    triggerElementEffect:(...args)=>triggerElementEffect(...args),\n    defenseDamageReduction:()=>defenseDamageReduction(),\n    effectiveDodgeChance:()=>effectiveDodgeChance(),\n    enemyElementProc:enemy=>enemyElementProc(enemy),\n    damageEnemy:(...args)=>damageEnemy(...args),\n    healPlayer:(...args)=>healPlayer(...args),\n    mythicalSetCount:()=>mythicalSetCount(),\n    guardianSpecialMultiplier:()=>v19SetGuardianSpecialMult(),\n    hasMythicPiece:slot=>hasMythicPiece(slot),\n    hasDevilsHorns:()=>v24HasHorns(),\n    hasHeadphones:()=>v24HasHeadphones(),\n    hasLegendaryEffect:id=>db060HasEffect(id),\n    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),\n    saveMeta:()=>saveMeta(),\n    playHitSfx:()=>sfx.hit(),\n    recordDamageTaken:amount=>{meta.damageTaken=(meta.damageTaken||0)+amount;},\n    wolfEchoChance:()=>db064EnemyPolicy.wolfEchoChance(boardLevel,db064CombatMode()),\n    successfulDodgePresentation:()=>dbFriendSuccessfulDodgePresentation(),\n    dragoonActive:()=>dbFriendDragoonActive()\n  });\n\n'''
marker='  /* INFO / ROADKEEPER\'S GUIDE ------------------------------------------------'
if text.count(marker)!=1:
    raise SystemExit(f'0.6.6.0 MATERIALIZE FAILED: expected one Info marker, found {text.count(marker)}')
text=text.replace(marker,configure_block+marker,1)

# Hard postconditions: exactly one lexical adapter per orchestration entrypoint and no retired owner names.
retired=[
    'v24ApplyDamage','v24ResolveNormalHits','v24AttackPattern','beta03TickEnemyBurns','db0511TickPlayerElementStatuses','db064ResolveWolfEchoes',
    'enemyTurnV11','enemyTurnV25DevilBase','db0511EnemyTurnBase','db060EnemyTurnBase','db064EnemyTurnBase','dbFriendEnemyTurnBase',
    'resolveEnemyResponseV15','resolveEnemyResponseV19Base','resolveEnemyResponseV24Base','resolveEnemyResponseBeta045Base','db046ResolveEnemyBase','db047ResolveEnemyBase','db0511ResolveEnemyResponseBase'
]
for name in retired:
    if name in text: raise SystemExit(f'0.6.6.0 MATERIALIZE FAILED: retired combat owner remains: {name}')
if text.count('async function enemyTurn(')!=1 or text.count('async function resolveEnemyResponse(')!=1:
    raise SystemExit('0.6.6.0 MATERIALIZE FAILED: combat adapters are not singular')
MONOLITH.write_text(text,encoding='utf-8')

# Authoritative module graph.
manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
module_id='combat-turn-resolution'
if module_id not in manifest['loadOrder']:
    at=manifest['loadOrder'].index('combat-targeting')+1
    manifest['loadOrder'].insert(at,module_id)
if not any(module.get('id')==module_id for module in manifest['modules']):
    after=next(i for i,module in enumerate(manifest['modules']) if module.get('id')=='combat-targeting')+1
    manifest['modules'].insert(after,{
        'id':module_id,
        'path':'js/combat/turn-resolution.js',
        'domain':'combat/enemy-response-and-turn-orchestration',
        'status':'extracted',
        'requires':[],
        'provides':['DiceboundCombatTurnResolution']
    })
MANIFEST.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

# Permanent anti-shadow guard in addition to the focused Node contract test.
shadow=SHADOW.read_text(encoding='utf-8')
anchor='print("Monolith spring-clean guard PASS: DB235/Career harness and retired patch sediment stay deleted")'
if anchor not in shadow:
    raise SystemExit('0.6.6.0 MATERIALIZE FAILED: shadow-guard print anchor changed')
extra='''combat_turn_retired = [\n    "v24ApplyDamage", "v24ResolveNormalHits", "v24AttackPattern", "beta03TickEnemyBurns",\n    "db0511TickPlayerElementStatuses", "db064ResolveWolfEchoes",\n    "enemyTurnV11", "enemyTurnV25DevilBase", "db0511EnemyTurnBase", "db060EnemyTurnBase", "db064EnemyTurnBase", "dbFriendEnemyTurnBase",\n    "resolveEnemyResponseV15", "resolveEnemyResponseV19Base", "resolveEnemyResponseV24Base", "resolveEnemyResponseBeta045Base",\n    "db046ResolveEnemyBase", "db047ResolveEnemyBase", "db0511ResolveEnemyResponseBase",\n]\nfor symbol in combat_turn_retired:\n    assert symbol not in monolith, f"retired combat turn owner returned to compatibility monolith: {symbol}"\nassert monolith.count("async function enemyTurn(") == 1, "enemyTurn must have exactly one thin compatibility adapter"\nassert monolith.count("async function resolveEnemyResponse(") == 1, "resolveEnemyResponse must have exactly one thin compatibility adapter"\nassert "dbCombatTurns=window.DiceboundCombatTurnResolution.configure({" in monolith, "combat turn owner is not configured by the compatibility composition root"\n\n'''
if 'combat_turn_retired = [' not in shadow:
    shadow=shadow.replace(anchor,extra+anchor,1)
SHADOW.write_text(shadow,encoding='utf-8')

print(f'0.6.6.0 materialized: dicebound.js {MONOLITH.stat().st_size} bytes / {len(text.splitlines())} lines')
