#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
mono=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
progression=(ROOT/'runtime/js/progression/lifecycle.js').read_text(encoding='utf-8')
owner=(ROOT/'runtime/js/progression/class-unlock-rules.js').read_text(encoding='utf-8')
registry=(ROOT/'runtime/js/classes/registry.js').read_text(encoding='utf-8')

# The focused rules module remains the specialist owner for eligibility policy,
# observed career facts and exact historical dynamic-scan ordering.
required_owner=[
    'apiVersion:2',
    'function isBaseUnlocked(',
    'function isUnlocked(',
    'function mayCommitUnlock(',
    'function recordObservedProgress(',
    'function resolveDynamic(',
    'function recordCombatFacts(',
    'function recordManaSpenderCast(',
]
for token in required_owner:
    if token not in owner:
        raise SystemExit(f'class unlock owner missing responsibility: {token}')

# Beta 0.6.6.29 makes DiceboundProgression the ordinary public boundary. The
# compatibility monolith may keep only thin facade adapters; it must not call
# the focused rule owner directly or reconstruct the unlock transaction/scan.
required_adapters=[
    'function isClassUnlocked(id){return dbProgression.isClassUnlocked(id);}',
    'function commitClassUnlock(id){return dbProgression.commitClassUnlock(id);}',
    'function unlockClass(id){return dbProgression.unlockClass(id);}',
    'function checkDynamicClassUnlocks(){return dbProgression.checkDynamicClassUnlocks();}',
]
for token in required_adapters:
    if token not in mono:
        raise SystemExit(f'dicebound.js missing thin Progression class-unlock adapter: {token}')

required_progression=[
    "function isClassUnlocked(id){return call('classUnlockIsUnlocked',id,classUnlockContext());}",
    "function unlockClass(id){if(!call('classUnlockMayCommit',id,classUnlockContext()))return false;return commitClassUnlock(id);}",
    "call('classUnlockResolveDynamic',{getContext:()=>classUnlockContext(),unlock:id=>unlockClass(id)});",
]
for token in required_progression:
    if token not in progression:
        raise SystemExit(f'DiceboundProgression missing class-unlock orchestration boundary: {token}')

retired=[
    'function baseClassUnlocked(id){return DB_CLASS_UNLOCK_RULES',
    'DB_CLASS_UNLOCK_RULES.isUnlocked(id,dbClassUnlockContext())',
    'DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,dbClassUnlockContext())',
    'DB_CLASS_UNLOCK_RULES.recordObservedProgress(dbClassUnlockContext())',
    'DB_CLASS_UNLOCK_RULES.resolveDynamic({getContext:()=>dbClassUnlockContext()',
    'baseClassUnlocked=function',
    'isClassUnlocked=function',
    'unlockClass=function',
    'checkDynamicClassUnlocks=function',
    'baseClassUnlockedV15Patch',
    'checkDynamicClassUnlocksV15Patch',
    'baseClassUnlockedV16',
    'checkDynamicClassUnlocksV16',
    'baseClassUnlockedV18Base',
    'checkDynamicClassUnlocksV18Base',
    'checkDynamicClassUnlocksV19Base',
    'baseClassUnlockedV110',
    'checkDynamicClassUnlocksV110',
    'baseClassUnlockedV28Base',
    'checkDynamicClassUnlocksV28Base',
    'db046BaseClassUnlocked',
    'db046CheckDynamicClassUnlocks',
    'db047BaseClassUnlocked',
    'db047CheckDynamicClassUnlocks',
    'db0631IsClassUnlockedBase',
    'db0631BaseClassUnlockedBase',
    'db0631UnlockClassBase',
    'db0631CheckDynamicBase',
    'DB047_ALCHEMIST_REQUIREMENT',
    'V28_ALCHEMIST_REQUIREMENT',
    'alchemistRequirement=50',
]
for token in retired:
    if token in mono:
        raise SystemExit(f'retired class unlock shadow ownership remains in dicebound.js: {token}')

if len(re.findall(r'\bfunction\s+isClassUnlocked\s*\(',mono))!=1:
    raise SystemExit('dicebound.js must contain exactly one isClassUnlocked facade adapter')
if len(re.findall(r'\bfunction\s+commitClassUnlock\s*\(',mono))!=1:
    raise SystemExit('dicebound.js must contain exactly one commitClassUnlock facade adapter')
if len(re.findall(r'\bfunction\s+unlockClass\s*\(',mono))!=1:
    raise SystemExit('dicebound.js must contain exactly one unlockClass facade adapter')
if len(re.findall(r'\bfunction\s+checkDynamicClassUnlocks\s*\(',mono))!=1:
    raise SystemExit('dicebound.js must contain exactly one checkDynamicClassUnlocks facade adapter')
if re.search(r'\bfunction\s+baseClassUnlocked\s*\(',mono):
    raise SystemExit('retired baseClassUnlocked adapter must stay out of dicebound.js')

for token in ['"unlock": "Use 15 potions across all runs"','alchemist:{type:"lifetimeStat",stat:"potionsUsed",minimum:15}','"unlock": "Reach 10 Prestige points"','rouge:{type:"prestige",count:10}']:
    if token not in registry:
        raise SystemExit(f'class registry not reconciled to shipped unlock truth: {token}')

print('Class unlock extraction boundary PASS: focused rules remain specialist internals behind DiceboundProgression')
