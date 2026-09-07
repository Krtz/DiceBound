#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
OWNER = ROOT / "runtime/js/combat/victory-resolution.js"
TEST = ROOT / "tools/test_combat_victory_resolution.js"
MANIFEST = ROOT / "runtime/js/module-manifest.json"
INDEX = ROOT / "runtime/index.html"
SHADOW = ROOT / "tools/test_shadow_ownership_drain.py"
ARCH = ROOT / "tools/validate_runtime_architecture.py"
CHANGELOG = ROOT / "CHANGELOG.md"
PATCH_NOTES = ROOT / "runtime/PATCH_NOTES.md"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"materialize 0.6.6.10: expected one {label}, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    matches = list(re.finditer(pattern, text, flags=re.S))
    if len(matches) != 1:
        raise SystemExit(f"materialize 0.6.6.10: expected one {label}, found {len(matches)}")
    return re.sub(pattern, replacement, text, count=1, flags=re.S)


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


mono = MONO.read_text(encoding="utf-8")
mono = replace_once(
    mono,
    "  let dbCombatAttackResolution=null;\n",
    "  let dbCombatVictoryResolution=null;\n  let dbCombatAttackResolution=null;\n",
    "Victory owner slot",
)
mono = regex_once(
    mono,
    r"  async function winCombat\(\)\{.*?\n  \}\n  function applyRunTheme\(\)",
    "  async function winCombat(...args){if(!dbCombatVictoryResolution)throw new Error('Combat Victory-resolution owner is not configured.');return dbCombatVictoryResolution.winCombat(...args);}\n  function applyRunTheme()",
    "base winCombat implementation",
)
mono = regex_once(
    mono,
    r"  // Track board/class feats and keep the Merchant tile after the secret fight\.\n  const winCombatV15=winCombat;winCombat=async function\(\)\{.*?\};\n  const loseGameV15=",
    "  // Track board/class feats; victory ownership now lives in combat/victory-resolution.\n  const loseGameV15=",
    "retired V15 winCombat wrapper",
)
mono = regex_once(
    mono,
    r"\n  winCombat=async function\(\)\{.*?\};\n\n  const openBloodwellV11=",
    "\n\n  const openBloodwellV11=",
    "mature ordinary winCombat implementation",
)
mono = regex_once(
    mono,
    r"\n  const winCombatV15Patch=winCombat;\n  winCombat=async function\(\)\{.*?\};\n\n  // ---- Debug:",
    "\n\n  // ---- Debug:",
    "V15 Patch winCombat wrapper",
)
mono = regex_once(
    mono,
    r"\n  const winCombatV16Base=winCombat;\n  winCombat=async function\(\)\{.*?\};\n  // ---- Info additions",
    "\n  // ---- Info additions",
    "V16 winCombat wrapper",
)
mono = regex_once(
    mono,
    r"\n  // Custom final resolution for Boards 5 and 6 bypasses all historical v16.*?\n  winCombat=async function\(\)\{.*?\};\n  // Board-6 guardian labels in the road HUD\.",
    "\n  // Board-6 guardian labels in the road HUD.",
    "V19/V266 late-final victory stack",
)
mono = regex_once(
    mono,
    r"\n  const winCombatV24Base=winCombat;winCombat=async function\(\)\{.*?\};\n",
    "\n",
    "V24 Pale Devil winCombat wrapper",
)
mono = replace_once(
    mono,
    "    const fn=({rollDice,rollTwoDice,returnToRoad,winCombat,applyUpgrade,equipItem,usePotion,usePotionOutsideCombat})[name];if(typeof fn!=='function')return;\n",
    "    const fn=({rollDice,rollTwoDice,returnToRoad,applyUpgrade,equipItem,usePotion,usePotionOutsideCombat})[name];if(typeof fn!=='function')return;\n",
    "v25 traced-command lookup",
)
mono = replace_once(
    mono,
    "    if(name==='rollDice')rollDice=wrapped;else if(name==='rollTwoDice')rollTwoDice=wrapped;else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='winCombat')winCombat=wrapped;else if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;else if(name==='usePotion')usePotion=wrapped;else if(name==='usePotionOutsideCombat')usePotionOutsideCombat=wrapped;\n",
    "    if(name==='rollDice')rollDice=wrapped;else if(name==='rollTwoDice')rollTwoDice=wrapped;else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;else if(name==='usePotion')usePotion=wrapped;else if(name==='usePotionOutsideCombat')usePotionOutsideCombat=wrapped;\n",
    "v25 traced-command winCombat assignment",
)
mono = replace_once(
    mono,
    "  ['rollDice','rollTwoDice','returnToRoad','winCombat','applyUpgrade','equipItem','usePotion','usePotionOutsideCombat'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'||n==='winCombat'?'events':'detailed'));\n",
    "  ['rollDice','rollTwoDice','returnToRoad','applyUpgrade','equipItem','usePotion','usePotionOutsideCombat'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'?'events':'detailed'));\n",
    "v25 traced-command registration",
)
mono = regex_once(
    mono,
    r"\n  // Contain reward-side failures after an enemy is already dead\..*?\n  winCombat=async function\(\.\.\.args\)\{.*?\n  \};\n\n  // Lightweight state healer",
    "\n  // Victory reward-side failure containment moved to combat/victory-resolution.\n\n  // Lightweight state healer",
    "V251 winCombat containment wrapper",
)
mono = regex_once(
    mono,
    r"\n  const winCombatV26Base=winCombat;winCombat=async function\(\.\.\.args\)\{.*?\};\n  const returnToRoadV26Base=",
    "\n  const returnToRoadV26Base=",
    "V26 secret Legacy winCombat wrapper",
)
mono = regex_once(
    mono,
    r"\n  const db0511WinCombatBase=winCombat;\n  winCombat=async function\(\.\.\.args\)\{.*?\};\n  const db0511HandleDeathBase=",
    "\n  const db0511HandleDeathBase=",
    "Beta 0.5.11 winCombat cleanup wrapper",
)
mono = regex_once(
    mono,
    r"\n  const db060WinCombatBase=winCombat;\n  winCombat=async function\(\.\.\.args\)\{.*?\};\n",
    "\n",
    "Beta 0.6 winCombat cleanup wrapper",
)
mono = regex_once(
    mono,
    r"\n  const db0631WinCombatBase=winCombat;\n  winCombat=async function\(\.\.\.args\)\{.*?\n  \};\n  const db0631OccultSpellAttackBase=",
    "\n  const db0631OccultSpellAttackBase=",
    "0.6.3.1 class-unlock winCombat wrapper",
)

victory_config = """
  const dbCombatVictoryOwner=window.DiceboundCombatVictoryResolution;
  if(!dbCombatVictoryOwner)throw new Error('DiceBound requires the combat Victory-resolution owner before dicebound.js');
  dbCombatVictoryResolution=dbCombatVictoryOwner.configure({
    getState:()=>({player,meta,boardLevel,nightmareMode,hellMode,combatKind:v16CombatKind,tiles,currentEnemy,currentEnemies,currentEncounterLead,currentEnemyTile}),
    ensureAlphaMeta:()=>ensureAlphaMeta(),
    recordBoardClear:(board,classId)=>recordBoardClear(board,classId),
    clearBloodOverhealTemp:()=>clearBloodOverhealTemp(),
    modifiedGold:amount=>modifiedGold(amount),
    healPlayer:amount=>healPlayer(amount),
    saveMeta:()=>saveMeta(),
    showToast:(...args)=>showToast(...args),
    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),
    addLog:html=>addLog(html),
    unlockClass:id=>unlockClass(id),
    refreshTile:index=>refreshTile(index),
    setCombatText:text=>setCombatText(text),
    playWin:()=>sfx.win(),
    updateHud:()=>updateHUD(),
    delay:ms=>delay(ms),
    presentVictory:payload=>BattleVictoryUI.present(BattleVictoryState.create(payload)),
    hideCombatOverlay:()=>$('combatOverlay')?.classList.add('hidden'),
    resetVictoryPresentation:()=>BattleVictoryUI.reset(),
    clearEncounterState:()=>{currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;},
    grantXp:xp=>grantXp(xp),
    getPendingLevelUps:()=>pendingLevelUps,
    openLevelUp:done=>openLevelUp(done),
    openCombatLootChain:(defeated,done)=>openCombatLootChain(defeated,done),
    showLegendaryChoice:(source,done)=>showLegendaryChoice(source,done),
    advanceToNextBoard:()=>advanceToNextBoard(),
    completeFinalRoad:()=>completeSixthRoadV19(),
    returnToRoad:()=>returnToRoad(),
    renderClassChoices:()=>renderClassChoices(),
    setMerchantBossFlags:flags=>{merchantBossBattle=!!flags.battle;merchantBossPrimed=!!flags.primed;merchantBossDefeatedThisBoard=!!flags.defeatedThisBoard;},
    restoreRadiationDefense:()=>restoreRadiationDefenseV16(),
    traceCommand:(name,fn,level,args,thisArg)=>v25TraceCommand(name,fn,level,args,thisArg),
    logDebug:(level,category,message,data)=>v25Log(level,category,message,data),
    debugState:()=>v25State(),
    setCombatBusy:value=>{combatBusy=!!value;},
    isCombatOverlayHidden:()=>!!$('combatOverlay')?.classList.contains('hidden'),
    setRollLocked:value=>{rollLocked=!!value;},
    clearStoneBattle:()=>v26ClearStoneBattle(),
    grantLegacyXp:gain=>grantLegacyXp(gain),
    updateMetaUi:()=>updateMetaUI(),
    restoreEnemyElementDebuffs:()=>db0511RestoreEnemyElementDebuffs(),
    clearLegendaryBattleTemps:()=>db060ClearBattleLegendaryTemps(),
    getClassUnlockFacts:()=>db0631Facts(),
    recordCombatFacts:(facts,payload)=>db0631Rules.recordCombatFacts(facts,payload)
  });

"""
mono = replace_once(
    mono,
    "  const dbCombatAttackOwner=window.DiceboundCombatAttackActionResolution;\n",
    victory_config + "  const dbCombatAttackOwner=window.DiceboundCombatAttackActionResolution;\n",
    "Victory owner composition boundary",
)
MONO.write_text(mono, encoding="utf-8")

# Complete the owner with the final outer class-unlock-facts wrapper discovered
# in the live post-0.6.6.9 census.
owner = OWNER.read_text(encoding="utf-8")
owner = replace_once(
    owner,
    '      "clearStoneBattle", "grantLegacyXp", "updateMetaUi", "restoreEnemyElementDebuffs", "clearLegendaryBattleTemps"\n',
    '      "clearStoneBattle", "grantLegacyXp", "updateMetaUi", "restoreEnemyElementDebuffs", "clearLegendaryBattleTemps",\n      "getClassUnlockFacts", "recordCombatFacts"\n',
    "Victory class-unlock callback requirements",
)
owner = replace_once(
    owner,
    '''  async function winCombat(...args) {\n    const rt = requireRuntime();\n    const result = await enemyElementCleanupLayer(...args);\n    rt.clearLegendaryBattleTemps();\n    return result;\n  }\n''',
    '''  async function legendaryCleanupLayer(...args) {\n    const rt = requireRuntime();\n    const result = await enemyElementCleanupLayer(...args);\n    rt.clearLegendaryBattleTemps();\n    return result;\n  }\n\n  // 0.6.3.1 class-unlock fact recording is the final historical outer layer:\n  // record combat facts before settlement, then re-check unlocks after every\n  // successful/contained inner victory.\n  async function classUnlockFactsLayer(...args) {\n    const rt = requireRuntime(), state = live(), defeated = defeatedFrom(state);\n    const tile = state.tiles?.[state.currentEnemyTile];\n    const isFinal = !!defeated?.finalBoss || state.combatKind === "final" || tile?.type === "boss";\n    state.meta.classUnlockFacts = rt.recordCombatFacts(rt.getClassUnlockFacts(), {\n      board: state.boardLevel,\n      classId: state.player.classId,\n      miniBoss: !!defeated?.miniBoss,\n      finalBoss: isFinal,\n      merchantBoss: !!defeated?.merchantBoss,\n      mode: state.hellMode ? "hell" : state.nightmareMode ? "nightmare" : "normal"\n    });\n    rt.saveMeta();\n    const result = await legendaryCleanupLayer(...args);\n    rt.checkDynamicClassUnlocks();\n    rt.saveMeta();\n    return result;\n  }\n\n  async function winCombat(...args) {\n    return classUnlockFactsLayer(...args);\n  }\n''',
    "Victory final class-unlock wrapper",
)
owner = replace_once(
    owner,
    "      enemyElementCleanupLayer\n",
    "      enemyElementCleanupLayer,\n      legendaryCleanupLayer,\n      classUnlockFactsLayer\n",
    "Victory test exports",
)
OWNER.write_text(owner, encoding="utf-8")

# Extend the deterministic harness for the final outer fact-recording layer.
test = TEST.read_text(encoding="utf-8")
test = replace_once(
    test,
    "    petCookies: 0, merchantKills: 0, bloodmageKills: 0, devilBossKills: 0,\n",
    "    petCookies: 0, merchantKills: 0, bloodmageKills: 0, devilBossKills: 0, classUnlockFacts: {},\n",
    "Victory test class unlock facts",
)
test = replace_once(
    test,
    "    player, meta, boardLevel: options.boardLevel || 1, nightmareMode: !!options.nightmareMode,\n",
    "    player, meta, boardLevel: options.boardLevel || 1, nightmareMode: !!options.nightmareMode, hellMode: !!options.hellMode,\n",
    "Victory test hell mode state",
)
test = replace_once(
    test,
    "    clearLegendaryBattleTemps: () => push('clearLegendaryTemps')\n",
    "    clearLegendaryBattleTemps: () => push('clearLegendaryTemps'),\n    getClassUnlockFacts: () => meta.classUnlockFacts || {},\n    recordCombatFacts: (facts, payload) => { push('recordCombatFacts', payload.board, payload.classId, payload.mode); return Object.assign({}, facts, { lastCombat: payload }); }\n",
    "Victory test fact callbacks",
)
test = replace_once(
    test,
    "    assert(order.indexOf('restoreEnemyDebuffs') < order.indexOf('clearLegendaryTemps'));\n",
    "    assert(order.indexOf('restoreEnemyDebuffs') < order.indexOf('clearLegendaryTemps'));\n    assert(order.indexOf('recordCombatFacts') < order.indexOf('traceStart'), 'class unlock facts must record before the historical victory stack');\n",
    "Victory test outer fact-order assertion",
)
TEST.write_text(test, encoding="utf-8")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
module_id = "combat-victory-resolution"
if module_id in manifest["loadOrder"] or any(m.get("id") == module_id for m in manifest["modules"]):
    raise SystemExit("materialize 0.6.6.10: victory module already present in manifest")
insert_at = manifest["loadOrder"].index("combat-pet-turn-resolution") + 1
manifest["loadOrder"].insert(insert_at, module_id)
module = {
    "id": module_id,
    "path": "js/combat/victory-resolution.js",
    "domain": "combat/post-kill-victory-reward-and-continuation-orchestration",
    "status": "extracted",
    "requires": [],
    "provides": ["DiceboundCombatVictoryResolution"],
}
module_index = next(i for i, m in enumerate(manifest["modules"]) if m.get("id") == "combat-enemy-policy")
manifest["modules"].insert(module_index, module)
monolith = next(m for m in manifest["modules"] if m.get("status") == "monolith")
requires = monolith.setdefault("requires", [])
if module_id not in requires:
    requires.append(module_id)
MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

index = INDEX.read_text(encoding="utf-8")
index = replace_once(
    index,
    '    <script src="js/combat/pet-turn-resolution.js"></script>\n',
    '    <script src="js/combat/pet-turn-resolution.js"></script>\n    <script src="js/combat/victory-resolution.js"></script>\n',
    "Victory runtime script tag",
)
INDEX.write_text(index, encoding="utf-8")

shadow = SHADOW.read_text(encoding="utf-8")
victory_shadow = r'''
victory_retired = [
    'winCombatV15','winCombatV15Patch','winCombatV16Base','winCombatV19Base','v266ResolveLateFinalBase',
    'winCombatV24Base','winCombatV251Base','winCombatV26Base','db0511WinCombatBase','db060WinCombatBase','db0631WinCombatBase',
    'v19ResolveLateFinal',
]
for symbol in victory_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Victory-resolution owner returned: {symbol}"
assert mono.count('async function winCombat(') == 1, 'winCombat must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^  winCombat\s*=\s*async function', mono), 'winCombat reassignment chain must not return'
assert "dbCombatVictoryResolution=dbCombatVictoryOwner.configure({" in mono, 'combat Victory-resolution owner is not configured by the composition root'
assert "return dbCombatVictoryResolution.winCombat(...args);" in mono, 'Victory thin adapter is missing'
'''
shadow = replace_once(shadow, "\nprint('Monolith spring-clean guard PASS')\n", victory_shadow + "\nprint('Monolith spring-clean guard PASS')\n", "Victory shadow guard insertion")
SHADOW.write_text(shadow, encoding="utf-8")

arch = ARCH.read_text(encoding="utf-8")
victory_arch = r'''
    victory_owner = next((m for m in modules if m.get("id") == "combat-victory-resolution"), None)
    if not victory_owner or victory_owner.get("status") != "extracted":
        errors.append("combat Victory-resolution owner is missing or not extracted")
    else:
        if victory_owner.get("path") != "js/combat/victory-resolution.js" or "DiceboundCombatVictoryResolution" not in (victory_owner.get("provides") or []):
            errors.append("combat-victory-resolution must provide DiceboundCombatVictoryResolution from js/combat/victory-resolution.js")
        if position.get("combat-victory-resolution", -1) >= position.get(str(monolith_id), -1):
            errors.append("combat-victory-resolution must load before the compatibility monolith")
    if monolith_source:
        if "dbCombatVictoryResolution=dbCombatVictoryOwner.configure({" not in monolith_source:
            errors.append("dicebound.js must configure the combat Victory-resolution owner")
        if monolith_source.count("async function winCombat(") != 1 or "return dbCombatVictoryResolution.winCombat(...args);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin winCombat adapter")
        if re.search(r"(?m)^  winCombat\s*=\s*async function", monolith_source):
            errors.append("dicebound.js retains a top-level winCombat reassignment after Victory extraction")
        for symbol in (
            "winCombatV15", "winCombatV15Patch", "winCombatV16Base", "winCombatV19Base", "v266ResolveLateFinalBase",
            "winCombatV24Base", "winCombatV251Base", "winCombatV26Base", "db0511WinCombatBase", "db060WinCombatBase", "db0631WinCombatBase",
            "v19ResolveLateFinal",
        ):
            if re.search(rf"(?<![\w$]){re.escape(symbol)}(?![\w$])", monolith_source):
                errors.append(f"retired combat Victory-resolution wrapper remains in dicebound.js: {symbol}")

'''
arch = replace_once(arch, "    planned_domains = [str(x) for x in manifest.get(\"plannedDomains\") or []]\n", victory_arch + "    planned_domains = [str(x) for x in manifest.get(\"plannedDomains\") or []]\n", "Victory architecture guard insertion")
ARCH.write_text(arch, encoding="utf-8")

changelog = CHANGELOG.read_text(encoding="utf-8")
marker = "This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n"
entry = """## Beta 0.6.6.10

### Combat Victory / Reward resolution ownership (#40, #209, #291)
- Extracted the post-kill combat-victory transaction into `runtime/js/combat/victory-resolution.js` and retired the historical `winCombat` reassignment ladder.
- Preserved ordinary/miniboss/final/secret-boss rewards, Board 5/6 late-final routing, command tracing, reward-error containment, class-unlock facts and battle cleanup ordering.
- Loot policy, level-up UI, Board transition, terminal run completion, saves/checkpoints and gameplay/balance values remain in their existing owners.

"""
changelog = replace_once(changelog, marker, marker + entry, "0.6.6.10 changelog insertion")
CHANGELOG.write_text(changelog, encoding="utf-8")

patch = PATCH_NOTES.read_text(encoding="utf-8")
patch_head = """# Unreleased — Beta 0.6.6.10

## Beta 0.6.6.10 Combat Victory / Reward resolution ownership (#40, #209, #291)
- `combat/victory-resolution.js` now owns the post-kill settlement/continuation transaction, including the published Board 5/6 final path and the historical cleanup/error-containment wrapper ordering.
- Exact Gold/XP/cookie formulas, unlock/accounting hooks, loot -> level-up -> continuation ordering and existing RNG-consuming loot callbacks are preserved.
- Loot/drop policy, Powerup UI, Board transition, terminal run completion, saves/checkpoints and gameplay/balance are unchanged.

"""
PATCH_NOTES.write_text(patch_head + patch, encoding="utf-8")

run("python", "tools/set_project_version.py", "--version", "0.6.6.10", "--channel", "Beta")
index = INDEX.read_text(encoding="utf-8")
index = re.sub(
    r"(<p>Beta v0\.6\.6\.10)\s*·[^<]*",
    r"\1 · Combat Victory / Reward resolution ownership.",
    index,
    count=1,
)
INDEX.write_text(index, encoding="utf-8")
run("python", "tools/refresh_runtime_manifest.py", "--version", "0.6.6.10", "--channel", "Beta", "--development-state", "Unreleased")

print("Materialized Beta 0.6.6.10 Combat Victory / Reward Resolution extraction")
