#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def replace_once(text, old, new, label):
    n=text.count(old)
    if n!=1: raise SystemExit(f'{label}: expected exactly one literal, found {n}')
    return text.replace(old,new,1)

def regex_once(text, pattern, repl, label, flags=0):
    out,n=re.subn(pattern,repl,text,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: expected exactly one regex match, found {n}')
    return out

def remove_section(text,start,end,label):
    a=text.find(start)
    if a<0: raise SystemExit(f'{label}: start marker missing')
    b=text.find(end,a+len(start))
    if b<0: raise SystemExit(f'{label}: end marker missing')
    return text[:a]+text[b:]

def write_json(path,value):
    path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')

mono_path=ROOT/'runtime/js/dicebound.js'
mono=mono_path.read_text(encoding='utf-8')
mono=replace_once(mono,"  let dbCombatTurns=null;\n","  let dbCombatEncounterLifecycle=null;\n  let dbCombatTurns=null;\n",'encounter owner binding')
mono=regex_once(mono,r'  function startCombat\(kind="normal"\)\{[\s\S]*?\n  \}\n  function damageEnemy','''  function startCombat(kind="normal"){
    if(!dbCombatEncounterLifecycle)throw new Error('Combat encounter-lifecycle owner is not configured.');
    return dbCombatEncounterLifecycle.start(kind);
  }
  function damageEnemy''','replace legacy startCombat body')
mono=regex_once(mono,r'^  startCombat=function\(kind="normal"\)\{const tile=tiles\[player\.position\];.*?\};\n','', 'V11 startCombat owner', re.M)
mono=remove_section(mono,'  const startCombatV13=startCombat;\n','  // ---- D20: make every combat roll readable','V13 start wrapper')
mono=regex_once(mono,r'^  const startCombatV15Patch=startCombat;\n  startCombat=function\(kind="normal"\)\{.*?\};\n','', 'V15 start wrapper', re.M)
mono=regex_once(mono,r'^  const startCombatV16Base=startCombat;startCombat=function\(kind="normal"\)\{.*?\};\n','', 'V16 start wrapper', re.M)
mono=regex_once(mono,r'^  const startCombatV17Base=startCombat;startCombat=function\(kind="normal"\)\{.*?\};\n','', 'V17 start wrapper', re.M)
mono=remove_section(mono,'  const startCombatV18Base=startCombat;\n','  // ---- Ouroboros ultimate','V18 start wrapper')
mono=remove_section(mono,'  const startCombatV19Base=startCombat;\n','  const applyRunThemeV19Base=applyRunTheme;','V19 start wrapper')
mono=remove_section(mono,'  const startCombatV19SetBase=startCombat;\n','  const petTurnV19Base=petTurn;','V19 set start wrapper')
mono=regex_once(mono,r'^  const startCombatV24Base=startCombat;\n  startCombat=function\(kind=\'normal\'\)\{.*?\};\n','', 'V24 start wrapper', re.M)
mono=remove_section(mono,'  const startCombatV25DevilBase=startCombat;\n','  const updateCombatUIV25BurnBase=updateCombatUI;','V25 start wrapper')
mono=regex_once(mono,r'^  const startCombatV26StoneBase=startCombat;startCombat=function\(kind=\'normal\'\)\{.*?\};\n','', 'V26 start wrapper', re.M)
mono=regex_once(mono,r'^  const startCombatV27DifficultyBase=startCombat;startCombat=function\(kind=\'normal\'\)\{.*?\};\n','', 'V27 start wrapper', re.M)
mono=remove_section(mono,'  const db0511StartCombatBase=startCombat;\n','  const db0511WinCombatBase=winCombat;','DB0511 start wrapper')
mono=remove_section(mono,'  const db060StartCombatBase=startCombat;\n','  const db060HandleDeathBase=handlePlayerDeath;','DB060 start wrapper')
mono=remove_section(mono,'  const db0635StartCombatBase=startCombat;\n','  window.DiceboundCombatBackgrounds=','DB0635 start wrapper')
mono=regex_once(mono,r'^  const db064StartCombatBase=startCombat;\n  startCombat=function\(\.\.\.args\)\{.*?\};\n','', 'DB064 start wrapper', re.M)
mono=remove_section(mono,'  const dbFriendStartCombatBase=startCombat;\n','  const dbFriendReturnToRoadBase=returnToRoad;','Friends start wrapper')
mono=replace_once(mono,"({rollDice,rollTwoDice,returnToRoad,startCombat,winCombat,applyUpgrade,equipItem,usePotion,usePotionOutsideCombat,identityGuardAction})","({rollDice,rollTwoDice,returnToRoad,winCombat,applyUpgrade,equipItem,usePotion,usePotionOutsideCombat,identityGuardAction})",'v25 command map startCombat removal')
mono=replace_once(mono,"else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='startCombat')startCombat=wrapped;else if(name==='winCombat')","else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='winCombat')",'v25 command assignment startCombat removal')
mono=replace_once(mono,"['rollDice','rollTwoDice','returnToRoad','startCombat','winCombat','applyUpgrade','equipItem','usePotion','usePotionOutsideCombat','identityGuardAction'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'||n==='startCombat'||n==='winCombat'?'events':'detailed'));","['rollDice','rollTwoDice','returnToRoad','winCombat','applyUpgrade','equipItem','usePotion','usePotionOutsideCombat','identityGuardAction'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'||n==='winCombat'?'events':'detailed'));",'v25 command registration startCombat removal')
configure_block='''  const dbCombatEncounterOwner=window.DiceboundCombatEncounterLifecycle;
  if(!dbCombatEncounterOwner)throw new Error('DiceBound requires the combat encounter-lifecycle owner before dicebound.js');
  dbCombatEncounterLifecycle=dbCombatEncounterOwner.configure({
    getPlayer:()=>player,
    getMeta:()=>meta,
    getTile:()=>tiles[player.position],
    getPosition:()=>player.position,
    getBoardLevel:()=>boardLevel,
    isNightmare:()=>nightmareMode,
    isHell:()=>hellMode,
    isClassActive:id=>classIdentityActive(id),
    petIds:()=>Object.keys(PETS),
    isPetUnlocked:(state,id)=>!!state.pets?.[id]?.unlocked,
    enemyById:id=>db317Enemy(id),
    finalGuardian:level=>db317FinalGuardian(level),
    minibossGuardian:level=>db317MinibossGuardian(level),
    enemyForPosition:index=>enemyForPosition(index),
    scaleEnemy:(...args)=>scaleEnemy(...args),
    setMerchantBossBattle:value=>{merchantBossBattle=!!value;},
    setCombatKind:value=>{v16CombatKind=value;},
    setEncounterState:state=>{currentEnemies=state.enemies;currentEncounterLead=state.lead;currentEnemyIndex=state.index;currentEnemy=state.current;currentEnemyTile=state.tile;currentEncounterTurn=state.turn;combatBusy=state.busy;},
    getEncounterState:()=>({enemies:currentEnemies,lead:currentEncounterLead,index:currentEnemyIndex,current:currentEnemy,tile:currentEnemyTile,turn:currentEncounterTurn,busy:combatBusy}),
    setEncounterSelection:state=>{currentEnemies=state.enemies;currentEncounterLead=state.lead;currentEnemyIndex=state.index;currentEnemy=state.current;},
    mythicalSetCount:()=>mythicalSetCount(),
    hasMythicPiece:slot=>hasMythicPiece(slot),
    startUltimate:()=>v19SetStartUltimate(),
    setCombatTitle:value=>{$('combatTitle').textContent=value;},
    getCombatTitle:()=>$('combatTitle').textContent,
    setCombatSubtitle:value=>{$('combatSubtitle').textContent=value;},
    clearCombatHistory:()=>{$('combatHistory').innerHTML='';},
    setCombatText:(...args)=>setCombatText(...args),
    showCombatOverlay:()=>$('combatOverlay').classList.remove('hidden'),
    addLog:text=>addLog(text),
    renderEnemyParty:()=>renderEnemyParty(),
    updateCombatUI:()=>updateCombatUI(),
    pick:values=>pick(values),
    clamp:(value,min,max)=>clamp(value,min,max),
    identityFlash:text=>identityFlash(text),
    addCombatHistory:text=>addCombatHistory(text),
    updateBossSpecialIndicator:()=>updateBossSpecialIndicator(),
    clearStoneBattle:()=>v26ClearStoneBattle(),
    restoreEnemyElementDebuffs:()=>db0511RestoreEnemyElementDebuffs(),
    clearBattleLegendaryTemps:()=>db060ClearBattleLegendaryTemps(),
    traceCoreStart:(kind,work)=>v25TraceCommand('startCombat',work,'events',[kind]),
    applyCombatBackground:()=>db0635ApplyCombatBackground(),
    syncBattleLog:()=>db064SyncBattleLog(),
    clearCombatPresentation:()=>dbFriendClearCombatPresentation(),
    refreshActivePetArt:()=>db059RefreshActivePetArt?.()
  });

'''
mono=replace_once(mono,'  const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;\n',configure_block+'  const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;\n','encounter composition configure')
retired=['startCombatV13','startCombatV15Patch','startCombatV16Base','startCombatV17Base','startCombatV18Base','startCombatV19Base','startCombatV19SetBase','startCombatV24Base','startCombatV25DevilBase','startCombatV26StoneBase','startCombatV27DifficultyBase','db0511StartCombatBase','db060StartCombatBase','db0635StartCombatBase','db064StartCombatBase','dbFriendStartCombatBase']
for symbol in retired:
    if re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])',mono): raise SystemExit(f'retired start symbol remains: {symbol}')
if len(re.findall(r'(?m)^  function startCombat\(',mono))!=1: raise SystemExit('expected exactly one startCombat function adapter')
if re.search(r'(?m)^\s*startCombat\s*=',mono): raise SystemExit('startCombat reassignment remains after extraction')
mono_path.write_text(mono,encoding='utf-8')

manifest_path=ROOT/'runtime/js/module-manifest.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
i=manifest['loadOrder'].index('combat-turn-resolution');manifest['loadOrder'].insert(i,'combat-encounter-lifecycle')
mods=manifest['modules'];mi=next(i for i,m in enumerate(mods) if m.get('id')=='combat-turn-resolution')
mods.insert(mi,{'id':'combat-encounter-lifecycle','path':'js/combat/encounter-lifecycle.js','domain':'combat/encounter-entry-and-battle-start-orchestration','status':'extracted','requires':[],'provides':['DiceboundCombatEncounterLifecycle']})
monolith=next(m for m in mods if m.get('id')=='dicebound-monolith');req=monolith.setdefault('requires',[])
for dep in ('combat-encounter-lifecycle','combat-turn-resolution'):
    if dep not in req:req.insert(req.index('combat-vfx'),dep)
write_json(manifest_path,manifest)
index_path=ROOT/'runtime/index.html';index=index_path.read_text(encoding='utf-8')
index=replace_once(index,'<script src="js/combat/targeting.js"></script>\n<script src="js/combat/turn-resolution.js"></script>','<script src="js/combat/targeting.js"></script>\n<script src="js/combat/encounter-lifecycle.js"></script>\n<script src="js/combat/turn-resolution.js"></script>','runtime encounter script tag');index_path.write_text(index,encoding='utf-8')

shadow_path=ROOT/'tools/test_shadow_ownership_drain.py';shadow=shadow_path.read_text(encoding='utf-8')
insert="""encounter_retired = [
    'startCombatV13','startCombatV15Patch','startCombatV16Base','startCombatV17Base','startCombatV18Base','startCombatV19Base','startCombatV19SetBase',
    'startCombatV24Base','startCombatV25DevilBase','startCombatV26StoneBase','startCombatV27DifficultyBase','db0511StartCombatBase','db060StartCombatBase',
    'db0635StartCombatBase','db064StartCombatBase','dbFriendStartCombatBase',
]
for symbol in encounter_retired:
    assert symbol not in mono, f"retired encounter-lifecycle owner returned to compatibility monolith: {symbol}"
assert mono.count('function startCombat(') == 1, 'startCombat must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\\s*startCombat\\s*=', mono), 'startCombat reassignment chain must not return'
assert "return dbCombatEncounterLifecycle.start(kind);" in mono, 'encounter lifecycle thin adapter is missing'
assert "dbCombatEncounterLifecycle=dbCombatEncounterOwner.configure({" in mono, 'encounter lifecycle owner is not configured by the composition root'

"""
shadow=replace_once(shadow,'combat_turn_retired = [\n',insert+'combat_turn_retired = [\n','shadow encounter guard insertion');shadow_path.write_text(shadow,encoding='utf-8')

arch_path=ROOT/'tools/validate_runtime_architecture.py';arch=arch_path.read_text(encoding='utf-8')
arch_guard='''    encounter_owner = next((m for m in modules if m.get("id") == "combat-encounter-lifecycle"), None)
    if not encounter_owner or encounter_owner.get("status") != "extracted":
        errors.append("combat encounter-lifecycle owner is missing or not extracted")
    if monolith_source:
        if "dbCombatEncounterLifecycle=dbCombatEncounterOwner.configure({" not in monolith_source:
            errors.append("dicebound.js must configure the combat encounter-lifecycle owner")
        if monolith_source.count("function startCombat(") != 1 or "return dbCombatEncounterLifecycle.start(kind);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin startCombat encounter-lifecycle adapter")
        if re.search(r"(?m)^\\s*startCombat\\s*=", monolith_source):
            errors.append("dicebound.js retains a startCombat reassignment after encounter-lifecycle extraction")
        for symbol in ("startCombatV13","startCombatV15Patch","startCombatV16Base","startCombatV17Base","startCombatV18Base","startCombatV19Base","startCombatV19SetBase","startCombatV24Base","startCombatV25DevilBase","startCombatV26StoneBase","startCombatV27DifficultyBase","db0511StartCombatBase","db060StartCombatBase","db0635StartCombatBase","db064StartCombatBase","dbFriendStartCombatBase"):
            if re.search(rf"(?<![\\w$]){re.escape(symbol)}(?![\\w$])", monolith_source):
                errors.append(f"retired combat encounter-lifecycle wrapper remains in dicebound.js: {symbol}")

'''
arch=replace_once(arch,'    planned_domains = [str(x) for x in manifest.get("plannedDomains") or []]\n',arch_guard+'    planned_domains = [str(x) for x in manifest.get("plannedDomains") or []]\n','architecture encounter guard insertion');arch_path.write_text(arch,encoding='utf-8')

patch_path=ROOT/'runtime/PATCH_NOTES.md';patch=patch_path.read_text(encoding='utf-8')
patch=replace_once(patch,'# Unreleased — Beta 0.6.6.0\n\n','# Unreleased — Beta 0.6.6.1\n\n','patch notes heading')
patch=replace_once(patch,'## Beta 0.6.6.0 Combat turn-resolution ownership (#40, #209, #267)\n','''## Beta 0.6.6.1 Combat encounter-lifecycle ownership (#40, #209, #269)
- Battle entry now has one authoritative owner in `combat/encounter-lifecycle.js`, covering encounter selection/state setup, class battle-start state, Board 6 entry behavior, secret-boss tuning, difficulty defenses and battle-local cleanup/presentation handoff.
- Removed the historical `startCombat` reassignment ladder from `dicebound.js`; the monolith retains one thin composition adapter. Existing combat values, encounter/scaling order, RNG draw/order, action/event ordering and checkpoint/save behavior are intentionally preserved.
- Deterministic encounter fixtures protect ordinary packs, Board 6 double-scaling behavior, Clown/Summoner entry RNG ordering, CEO barriers, Nightmare/Hell entry defenses, Bloodmage/Pale Devil setup and outer cleanup/presentation ordering.

## Beta 0.6.6.0 Combat turn-resolution ownership (#40, #209, #267)
''','patch notes 0.6.6.1 section');patch_path.write_text(patch,encoding='utf-8')
changelog_path=ROOT/'CHANGELOG.md';changelog=changelog_path.read_text(encoding='utf-8')
changelog=replace_once(changelog,'## Beta 0.6.6.0\n\n','''## Beta 0.6.6.1

### Combat encounter-lifecycle ownership (#40, #209, #269)
- Extracted battle-entry / `startCombat` orchestration into `runtime/js/combat/encounter-lifecycle.js`, including ordinary/Guardian/secret-boss selection, encounter state initialization, class entry state, Board 6 entry behavior, difficulty defenses and battle-local cleanup/presentation hooks.
- Retired the historical `startCombat*Base` reassignment ladder and retained one thin monolith adapter. Exact encounter/scaling sequence and RNG ordering are preserved, including the existing Board 6 final double-scaling quirk.
- Added deterministic encounter-entry coverage plus permanent architecture/shadow-ownership guards.

## Beta 0.6.6.0

''','changelog 0.6.6.1 section');changelog_path.write_text(changelog,encoding='utf-8')
print(json.dumps({'ok':True,'monolithBytes':len(mono.encode()),'monolithLines':mono.count('\n')+1},indent=2))
