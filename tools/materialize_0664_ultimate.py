#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / 'runtime/js/dicebound.js'
OWNER = ROOT / 'runtime/js/combat/ultimate-resolution.js'
MANIFEST = ROOT / 'runtime/js/module-manifest.json'
INDEX = ROOT / 'runtime/index.html'
SHADOW = ROOT / 'tools/test_shadow_ownership_drain.py'
ARCH = ROOT / 'tools/validate_runtime_architecture.py'
PATCH = ROOT / 'runtime/PATCH_NOTES.md'
CHANGELOG = ROOT / 'CHANGELOG.md'


def sub_once(text: str, pattern: str, replacement: str, label: str, flags: int = 0) -> str:
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, got {count}')
    return out


def remove_once(text: str, pattern: str, label: str, flags: int = 0) -> str:
    return sub_once(text, pattern, '', label, flags)


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding='utf-8', newline='\n')


# Fix the owner draft to consume the lexical combatBusy state through composition.
owner = OWNER.read_text(encoding='utf-8')
if '"getCombatBusy"' not in owner:
    owner = owner.replace('"getEncounterLead","livingEnemies","setCombatBusy"', '"getEncounterLead","livingEnemies","getCombatBusy","setCombatBusy"', 1)
owner = owner.replace('p.combatBusy', 'rt.getCombatBusy()')
write(OWNER, owner)

mono = MONO.read_text(encoding='utf-8')
mono = mono.replace('  let dbCombatStrikes=null;\n', '  let dbCombatStrikes=null;\n  let dbCombatUltimateResolution=null;\n', 1)

# Earliest callable becomes the one compatibility adapter. The later full generic
# implementation and every historical wrapper layer are deleted below.
mono = sub_once(
    mono,
    r'  async function useUltimate\(\)\{[\s\S]*?\n  \}\n  async function guardAction\(\)\{',
    "  async function useUltimate(...args){if(!dbCombatUltimateResolution)throw new Error('Combat Ultimate-resolution owner is not configured.');return dbCombatUltimateResolution.start(...args);}\n  async function guardAction(){",
    'replace original useUltimate with adapter',
)

# The later full generic owner is the semantically live base beneath the wrapper tower.
mono = remove_once(
    mono,
    r'\n  useUltimate=async function\(\)\{\n    if\(combatBusy\|\|!currentEnemy\|\|player\.ultimateCharge<100\)[\s\S]*?\n  \};(?=\n\n\n  async function bloodmageExsanguinate)',
    'remove later generic Ultimate base',
)

# V11 Bloodmage intercept.
mono = remove_once(mono, r'\n  const useUltimateV11=useUltimate;useUltimate=async function\(\)\{[^\n]*\};', 'remove V11 Ultimate wrapper')
# V13 Ranger mark wrapper.
mono = remove_once(mono, r'\n  const useUltimateV13=useUltimate;\n  useUltimate=async function\(\)\{[\s\S]*?\n  \};', 'remove V13 Ultimate wrapper')
# V15 Summoner / Trainer intercept.
mono = remove_once(mono, r'\n  const useUltimateV15Patch=useUltimate;\n  useUltimate=async function\(\)\{[^\n]*\};', 'remove V15 Ultimate wrapper')
# V16 keeps GAG_INFO for Info/Guide and other class consumers, but moves gag reroll + Ultimate ownership.
mono = remove_once(mono, r'\n  function rerollClownGagV16\(\)\{[^\n]*\}', 'remove V16 gag reroll helper')
mono = remove_once(mono, r'\n  // ---- Ultimate extensions -+\n  const useUltimateV16Base=useUltimate;\n  useUltimate=async function\(\)\{[\s\S]*?\n  \};', 'remove V16 Ultimate wrapper')
# V17 Ninja Smoke post-hook.
mono = remove_once(mono, r'\n\s*const useUltimateV17Base=useUltimate;useUltimate=async function\(\)\{[^\n]*\};', 'remove V17 Ultimate wrapper')
# V18 Ouroboros intercept.
mono = remove_once(mono, r'\n  const useUltimateV18Base=useUltimate;\n  useUltimate=async function\(\)\{[\s\S]*?\n  \};', 'remove V18 Ultimate wrapper')
# V25 Frog poison lifetime.
mono = remove_once(mono, r'\n  const useUltimateV25CroakBase=useUltimate;\n  useUltimate=async function\(\)\{[^\n]*\};', 'remove V25 Ultimate wrapper')
# V27 Ouroboros speed cap.
mono = remove_once(mono, r'\n\s*const useUltimateV27SpeedBase=useUltimate;useUltimate=async function\(\)\{[^\n]*\};', 'remove V27 Ultimate wrapper')
# V28 Frog speed / Slime Rouge delegation. Keep v28FrogEchoCap and the Slime Rouge helper.
mono = remove_once(mono, r'\n  const useUltimateV28Base=useUltimate;\n  useUltimate=async function\(\)\{[\s\S]*?\n  \};', 'remove V28 Ultimate wrapper')
# DB060 Unstable Ultimate.
mono = remove_once(mono, r'\n  const db060UseUltimateBase=useUltimate;\n  useUltimate=async function\(\)\{[^\n]*\};', 'remove DB060 Ultimate wrapper')
# Friends Dragoon Ultimate helper + outer wrapper. Landing remains shared by other actions.
mono = sub_once(
    mono,
    r'\n  async function dbFriendDragonDive\(\)\{[\s\S]*?\n  async function dbFriendDragoonRegressionExercise\(\)\{',
    '\n  async function dbFriendDragoonRegressionExercise(){',
    'remove Friends Dragon Dive and Ultimate wrapper',
)

composition = r'''  const dbCombatUltimateOwner=window.DiceboundCombatUltimateResolution;
  if(!dbCombatUltimateOwner)throw new Error('DiceboundCombatUltimateResolution must load before dicebound.js');
  dbCombatUltimateResolution=dbCombatUltimateOwner.configure({
    getPlayer:()=>player,
    getMeta:()=>meta,
    getCurrentEnemy:()=>currentEnemy,
    getCurrentEnemies:()=>currentEnemies,
    getEncounterLead:()=>currentEncounterLead,
    livingEnemies:()=>livingEnemies(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    selectEnemy:index=>setCurrentEnemy(index),
    isClassActive:id=>classIdentityActive(id),
    hasLegendaryEffect:id=>db060HasEffect(id),
    random:()=>random(),
    rand:(min,max)=>rand(min,max),
    pick:list=>pick(list),
    clamp:(value,min,max)=>clamp(value,min,max),
    rollTieredProc:chance=>rollTieredProc(chance),
    getSetDamageBonus:()=>v19SetDamageBonus(),
    damageEnemy:(enemy,amount,ignoreDefense)=>damageEnemy(enemy,amount,ignoreDefense),
    damageAll:(amount,secondary)=>damageAll(amount,secondary),
    healPlayer:(amount,opts)=>healPlayer(amount,opts),
    triggerStrikeElements:(target,chaos)=>triggerStrikeElements(target,chaos),
    petDamage:()=>petDamage(),
    trainerPetDamage:id=>trainerPetDamage(id),
    syncOuroborosAttack:()=>v18SyncOuroborosAttack(),
    rollD20Chaos:action=>rollD20Chaos(action),
    updateCombatUI:()=>updateCombatUI(),
    animateUltimate:()=>animateUltimate(),
    animateClassAttack:mode=>animateClassAttack(mode),
    setCombatText:text=>setCombatText(text),
    addCombatHistory:text=>addCombatHistory(text),
    identityFlash:text=>identityFlash(text),
    playCritSfx:()=>sfx.crit(),
    playHolySfx:()=>sfx.holy(),
    delay:ms=>delay(ms),
    winCombat:()=>winCombat(),
    resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),
    petTurn:(...args)=>petTurn(...args),
    applyMythicPantsPulse:()=>applyMythicPantsPulse(),
    applyMythicRingPulse:()=>applyMythicRingPulse(),
    potionHealValue:fraction=>v16PotionHealValue(fraction),
    getPets:()=>PETS,
    getGagInfo:()=>GAG_INFO,
    slimeRougeUltimate:()=>v318UseSlimeRougeUltimate(),
    getFastEchoCap:()=>window.__DB_FAST_ECHO_CAP__||0,
    setFastEchoCap:value=>{window.__DB_FAST_ECHO_CAP__=value;},
    frogEchoCap:echo=>v28FrogEchoCap(echo),
    dragoonActive:()=>dbFriendDragoonActive(),
    dragoonLandingReady:()=>!!player.dragoonLandingReady,
    dragoonLanding:()=>dbFriendDragoonLanding(),
    tickDragoonCooldown:()=>dbFriendTickDragoonCooldown(),
  });

'''
mono = mono.replace('  const dbCombatPresentationOwner=window.DiceboundCombatPresentation;\n', composition + '  const dbCombatPresentationOwner=window.DiceboundCombatPresentation;\n', 1)

# Strict postconditions: one adapter, no last-definition-wins Ultimate chain/captures.
if mono.count('async function useUltimate(') != 1:
    raise RuntimeError(f'expected one useUltimate adapter, found {mono.count("async function useUltimate(")}')
if re.search(r'(?m)^\s*useUltimate\s*=', mono):
    raise RuntimeError('useUltimate reassignment remains after extraction')
for symbol in [
    'useUltimateV11','useUltimateV13','useUltimateV15Patch','useUltimateV16Base','useUltimateV17Base','useUltimateV18Base',
    'useUltimateV25CroakBase','useUltimateV27SpeedBase','useUltimateV28Base','db060UseUltimateBase','dbFriendUltimateBase','dbFriendDragonDive','rerollClownGagV16',
]:
    if re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono):
        raise RuntimeError(f'retired Ultimate symbol remains: {symbol}')
if 'dbCombatUltimateResolution=dbCombatUltimateOwner.configure({' not in mono:
    raise RuntimeError('Ultimate owner composition missing')
write(MONO, mono)

# Module manifest + exact script order.
manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
owner_id = 'combat-ultimate-resolution'
if owner_id not in manifest['loadOrder']:
    pos = manifest['loadOrder'].index('combat-strike-resolution') + 1
    manifest['loadOrder'].insert(pos, owner_id)
if not any(m.get('id') == owner_id for m in manifest['modules']):
    insert_at = next(i for i,m in enumerate(manifest['modules']) if m.get('id') == 'combat-enemy-policy')
    manifest['modules'].insert(insert_at, {
        'id': owner_id,
        'path': 'js/combat/ultimate-resolution.js',
        'domain': 'combat/ultimate-resolution',
        'status': 'extracted',
        'requires': [],
        'provides': ['DiceboundCombatUltimateResolution'],
    })
monolith = next(m for m in manifest['modules'] if m.get('status') == 'monolith')
if owner_id not in monolith['requires']:
    pos = monolith['requires'].index('combat-strike-resolution') + 1
    monolith['requires'].insert(pos, owner_id)
write(MANIFEST, json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

index = INDEX.read_text(encoding='utf-8')
needle = '<script src="js/combat/strike-resolution.js"></script>\n'
addition = needle + '<script src="js/combat/ultimate-resolution.js"></script>\n'
if '<script src="js/combat/ultimate-resolution.js"></script>' not in index:
    if needle not in index: raise RuntimeError('strike-resolution script anchor missing')
    index = index.replace(needle, addition, 1)
write(INDEX, index)

# Permanent anti-shadow regression guard.
shadow = SHADOW.read_text(encoding='utf-8')
ultimate_guard = r'''
ultimate_retired = [
    'useUltimateV11','useUltimateV13','useUltimateV15Patch','useUltimateV16Base','useUltimateV17Base','useUltimateV18Base',
    'useUltimateV25CroakBase','useUltimateV27SpeedBase','useUltimateV28Base','db060UseUltimateBase','dbFriendUltimateBase',
    'dbFriendDragonDive','rerollClownGagV16',
]
for symbol in ultimate_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Ultimate-resolution owner returned: {symbol}"
assert mono.count('async function useUltimate(') == 1, 'useUltimate must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*useUltimate\s*=', mono), 'useUltimate reassignment chain must not return'
assert "dbCombatUltimateResolution=dbCombatUltimateOwner.configure({" in mono, 'combat Ultimate-resolution owner is not configured by the composition root'
assert "return dbCombatUltimateResolution.start(...args);" in mono, 'Ultimate thin adapter is missing'
'''
if 'ultimate_retired = [' not in shadow:
    shadow = shadow.replace("\nprint('Monolith spring-clean guard PASS')", ultimate_guard + "\nprint('Monolith spring-clean guard PASS')", 1)
write(SHADOW, shadow)

# Architecture validator knows the owner and rejects a shadow chain.
arch = ARCH.read_text(encoding='utf-8')
arch_guard = r'''
    ultimate_owner = next((m for m in modules if m.get("id") == "combat-ultimate-resolution"), None)
    if not ultimate_owner or ultimate_owner.get("status") != "extracted":
        errors.append("combat Ultimate-resolution owner is missing or not extracted")
    else:
        if ultimate_owner.get("path") != "js/combat/ultimate-resolution.js" or "DiceboundCombatUltimateResolution" not in (ultimate_owner.get("provides") or []):
            errors.append("combat-ultimate-resolution must provide DiceboundCombatUltimateResolution from js/combat/ultimate-resolution.js")
        if position.get("combat-ultimate-resolution", -1) >= position.get(str(monolith_id), -1):
            errors.append("combat-ultimate-resolution must load before the compatibility monolith")
    if monolith_source:
        if "dbCombatUltimateResolution=dbCombatUltimateOwner.configure({" not in monolith_source:
            errors.append("dicebound.js must configure the combat Ultimate-resolution owner")
        if monolith_source.count("async function useUltimate(") != 1 or "return dbCombatUltimateResolution.start(...args);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin useUltimate adapter")
        if re.search(r"(?m)^\s*useUltimate\s*=", monolith_source):
            errors.append("dicebound.js retains a useUltimate reassignment after Ultimate extraction")
        for symbol in ("useUltimateV11","useUltimateV13","useUltimateV15Patch","useUltimateV16Base","useUltimateV17Base","useUltimateV18Base","useUltimateV25CroakBase","useUltimateV27SpeedBase","useUltimateV28Base","db060UseUltimateBase","dbFriendUltimateBase","dbFriendDragonDive","rerollClownGagV16"):
            if re.search(rf"(?<![\w$]){re.escape(symbol)}(?![\w$])", monolith_source):
                errors.append(f"retired combat Ultimate-resolution wrapper remains in dicebound.js: {symbol}")
'''
if 'combat Ultimate-resolution owner is missing or not extracted' not in arch:
    arch = arch.replace('\n    planned_domains = [str(x) for x in manifest.get("plannedDomains") or []]', arch_guard + '\n    planned_domains = [str(x) for x in manifest.get("plannedDomains") or []]', 1)
write(ARCH, arch)

patch = PATCH.read_text(encoding='utf-8')
patch_head = '''# Unreleased — Beta 0.6.6.4\n\n## Beta 0.6.6.4 Ultimate resolution ownership (#40, #209, #277)\n- Player Ultimates now resolve through one authoritative owner in `combat/ultimate-resolution.js`; the historical `useUltimate` wrapper tower is retired from `dicebound.js`.\n- Generic class Ultimates plus Bloodmage, Ranger Marks, Summoner/Trainer, Alchemist, Clown/Turtle/Ninja, Ouroboros, Frog, Slime Rouge recursion, Unstable Ultimate and Dragoon ordering retain their existing formulas, RNG draws and historical wrapper quirks.\n- Basic/Echo strikes, Guard, Potions, ordinary Pet turns, enemy response, encounter entry, combat presentation, saves/checkpoints and gameplay values are unchanged.\n\n'''
if not patch.startswith('# Unreleased — Beta 0.6.6.4'):
    patch = patch_head + patch
write(PATCH, patch)

changelog = CHANGELOG.read_text(encoding='utf-8')
change_head = '''## Beta 0.6.6.4\n\n### Ultimate resolution ownership (#40, #209, #277)\n- Extracted the final `useUltimate` resolution stack into `runtime/js/combat/ultimate-resolution.js`, replacing the generic class base plus Bloodmage/Ranger/Companion/Alchemist/Clown/Turtle/Ninja/Ouroboros/Frog/Slime Rouge/Unstable/Dragoon wrapper ladder with one explicit owner.\n- Preserved exact targeting, charge mutation, temporary bonus cleanup, RNG draw/order, speed-cap lifetimes, poison bookkeeping, Slime Rouge recursive donor casting and Dragoon's outermost bypass semantics.\n- Other player actions, enemy turns, encounter/presentation owners, victory/rewards, saves/checkpoints and gameplay values remain outside this slice.\n\n'''
anchor = 'This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n'
if '## Beta 0.6.6.4' not in changelog:
    if anchor not in changelog: raise RuntimeError('CHANGELOG insertion anchor missing')
    changelog = changelog.replace(anchor, anchor + change_head, 1)
write(CHANGELOG, changelog)

print('Beta 0.6.6.4 Ultimate extraction materialized successfully')
