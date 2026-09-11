#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
mono=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
owner=(ROOT/'runtime/js/progression/class-unlock-rules.js').read_text(encoding='utf-8')
registry=(ROOT/'runtime/js/classes/registry.js').read_text(encoding='utf-8')

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

required_adapters=[
    'function isClassUnlocked(id){return DB_CLASS_UNLOCK_RULES.isUnlocked(id,dbClassUnlockContext());}',
    'function baseClassUnlocked(id){return DB_CLASS_UNLOCK_RULES.isBaseUnlocked(id,dbClassUnlockContext());}',
    'function unlockClass(id){if(!DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,dbClassUnlockContext()))return false;return commitClassUnlock(id);}',
    'function checkDynamicClassUnlocks(){',
    'DB_CLASS_UNLOCK_RULES.resolveDynamic({getContext:()=>dbClassUnlockContext(),unlock:id=>unlockClass(id)});',
]
for token in required_adapters:
    if token not in mono:
        raise SystemExit(f'dicebound.js missing thin class-unlock adapter: {token}')

retired=[
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
    raise SystemExit('dicebound.js must contain exactly one isClassUnlocked adapter')
if len(re.findall(r'\bfunction\s+baseClassUnlocked\s*\(',mono))!=1:
    raise SystemExit('dicebound.js must contain exactly one baseClassUnlocked adapter')
if len(re.findall(r'\bfunction\s+unlockClass\s*\(',mono))!=1:
    raise SystemExit('dicebound.js must contain exactly one unlockClass adapter')
if len(re.findall(r'\bfunction\s+checkDynamicClassUnlocks\s*\(',mono))!=1:
    raise SystemExit('dicebound.js must contain exactly one checkDynamicClassUnlocks adapter')

for token in ['"unlock": "Use 15 potions across all runs"','alchemist:{type:"lifetimeStat",stat:"potionsUsed",minimum:15}','"unlock": "Reach 10 Prestige points"','rouge:{type:"prestige",count:10}']:
    if token not in registry:
        raise SystemExit(f'class registry not reconciled to shipped unlock truth: {token}')

print('Class unlock extraction boundary PASS')
