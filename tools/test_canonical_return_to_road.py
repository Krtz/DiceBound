from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
if len(re.findall(r'\bfunction\s+returnToRoad\s*\(',SOURCE))!=1:
    raise SystemExit('returnToRoad must have exactly one canonical declaration')
if re.search(r'\breturnToRoad\s*=\s*function\b',SOURCE):
    raise SystemExit('historical returnToRoad function replacement returned')
if re.search(r'\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*returnToRoad\s*;',SOURCE):
    raise SystemExit('historical returnToRoad predecessor capture returned')
for alias in ('returnToRoadV251Base','returnToRoadV26Base','dbFriendReturnToRoadBase'):
    if re.search(rf'\b{alias}\b',SOURCE): raise SystemExit(f'retired returnToRoad alias returned: {alias}')

start=SOURCE.find('function returnToRoad(...args)')
end=SOURCE.find('function livingEnemies()',start)
if start<0 or end<0: raise SystemExit('could not isolate canonical returnToRoad region')
body=SOURCE[start:end]
required=(
    'if(dbReturnToRoadFriendReady){dbClasses.invokerResetCombat();dbFriendClearCombatPresentation();}',
    'const core=()=>{if(pendingLevelUps>0)openLevelUp();else{rollLocked=false;updateHUD();}};',
    "v25TraceCommand('returnToRoad',core,'detailed',args,this)",
    'if(dbReturnToRoadStoneReady&&!currentEnemy)v26ClearStoneBattle();',
    'return result;',
)
for fragment in required:
    if fragment not in body: raise SystemExit('canonical returnToRoad missing released behavior: '+fragment)
safety='if(dbReturnToRoadSafetyReady&&!currentEnemy)combatBusy=false;'
if body.count(safety)!=2: raise SystemExit('canonical returnToRoad must preserve pre/post combatBusy repair')
positions=[body.find('dbClasses.invokerResetCombat()'),body.find(safety),body.find("v25TraceCommand('returnToRoad'"),body.rfind(safety),body.find('v26ClearStoneBattle()')]
if positions!=sorted(positions): raise SystemExit('canonical returnToRoad final composition order changed')
for flag in ('dbReturnToRoadTraceReady=true;','dbReturnToRoadSafetyReady=true;','dbReturnToRoadStoneReady=true;','dbReturnToRoadFriendReady=true;'):
    if SOURCE.count(flag)!=1: raise SystemExit('returnToRoad staged bootstrap gate missing or duplicated: '+flag)
v25_start=SOURCE.find("function v25WrapCommand(")
v25_end=SOURCE.find('/* Final UI sync / tests',v25_start)
v25=SOURCE[v25_start:v25_end]
if 'returnToRoad' in v25: raise SystemExit('v25 generic command wrapper still owns returnToRoad')
print('Canonical returnToRoad PASS: base, trace, soft-lock repair, Stone cleanup and Friends presentation reset preserve final order in one function')
