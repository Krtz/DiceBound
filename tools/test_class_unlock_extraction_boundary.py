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

# Beta 0.6.7.0 retires the call-only class-unlock adapters from the composition
# root. Ordinary callers route straight through DiceboundProgression; the
# unused commitClassUnlock root alias stays gone instead of being recreated for
# an architecture test.
required_routes=[
    'dbProgression.isClassUnlocked(',
    'dbProgression.unlockClass(',
    'dbProgression.checkDynamicClassUnlocks(',
]
for token in required_routes:
    if token not in mono:
        raise SystemExit(f'dicebound.js missing direct Progression class-unlock route: {token}')

required_progression=[
    "function isClassUnlocked(id){return call('classUnlockIsUnlocked',id,classUnlockContext());}",
    "function unlockClass(id){if(!call('classUnlockMayCommit',id,classUnlockContext()))return false;return commitClassUnlock(id);}",
    "call('classUnlockResolveDynamic',{getContext:()=>classUnlockContext(),unlock:id=>unlockClass(id)});",
]
for token in required_progression:
    if token not in progression:
        raise SystemExit(f'DiceboundProgression missing class-unlock orchestration boundary: {token}')

retired=[
    'function isClassUnlocked(id){return dbProgression.isClassUnlocked(id);}',
    'function commitClassUnlock(id){return dbProgression.commitClassUnlock(id);}',
    'function unlockClass(id){return dbProgression.unlockClass(id);}',
    'function checkDynamicClassUnlocks(){return dbProgression.checkDynamicClassUnlocks();}',
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

for name in ['isClassUnlocked','commitClassUnlock','unlockClass','checkDynamicClassUnlocks','baseClassUnlocked']:
    if re.search(rf'\bfunction\s+{name}\s*\(',mono):
        raise SystemExit(f'retired class-unlock forwarding adapter returned in dicebound.js: {name}')

# commitClassUnlock still exists as an owned Progression capability even though
# the old composition-root alias had no callers.
if 'commitClassUnlock' not in progression:
    raise SystemExit('DiceboundProgression commitClassUnlock capability missing')

for token in ['"unlock": "Use 15 potions across all runs"','alchemist:{type:"lifetimeStat",stat:"potionsUsed",minimum:15}','"unlock": "Reach 10 Prestige points"','rouge:{type:"prestige",count:10}']:
    if token not in registry:
        raise SystemExit(f'class registry not reconciled to shipped unlock truth: {token}')

print('Class unlock extraction boundary PASS: focused rules stay internal, call-only root adapters stay retired, and callers route through DiceboundProgression')
