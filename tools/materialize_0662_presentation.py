#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONO_PATH = ROOT / "runtime/js/dicebound.js"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one literal, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, repl: str, label: str, flags: int = 0) -> str:
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected one regex match, found {count}")
    return out


def remove_update_wrapper(text: str, capture: str) -> str:
    escaped = re.escape(capture)
    patterns = [
        rf"(?ms)^  const {escaped}=updateCombatUI;\n  updateCombatUI=function\([^\n]*\)\{{.*?^  \}};\n",
        rf"(?m)^  const {escaped}=updateCombatUI;\n  updateCombatUI=function\([^\n]*\)\{{.*?\}};\n",
        rf"(?m)^  const {escaped}=updateCombatUI;updateCombatUI=function\([^\n]*\)\{{.*?\}};\n",
    ]
    for pattern in patterns:
        out, count = re.subn(pattern, "", text, count=1)
        if count == 1:
            return out
    raise SystemExit(f"presentation wrapper {capture}: no supported shape matched")


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


mono = MONO_PATH.read_text(encoding="utf-8")

mono = replace_once(
    mono,
    "  let dbCombatEncounterLifecycle=null;\n  let dbCombatTurns=null;\n",
    "  let dbCombatPresentation=null;\n  let dbCombatEncounterLifecycle=null;\n  let dbCombatTurns=null;\n",
    "presentation owner binding",
)

# Base presentation becomes thin compatibility adapters. updateHUD stays outside
# the extracted renderer because its historical chain still owns non-presentation
# synchronization/progression side effects.
mono = regex_once(
    mono,
    r"(?ms)^  function statusDotsHTML\(barriers=0,poison=0,affinity=null\)\{.*?^  \}\n\n  function renderEnemyParty\(\)\{.*?^  \}\n\n  function updateCombatUI\(\)\{.*?^  \}\n",
    """  function statusDotsHTML(barriers=0,poison=0,affinity=null){if(!dbCombatPresentation)throw new Error('Combat presentation owner is not configured.');return dbCombatPresentation.statusDotsHTML(barriers,poison,affinity);}\n  function renderEnemyParty(){if(!dbCombatPresentation)throw new Error('Combat presentation owner is not configured.');return dbCombatPresentation.renderEnemyParty();}\n  function updateCombatUI(){if(!dbCombatPresentation)throw new Error('Combat presentation owner is not configured.');const result=dbCombatPresentation.update();updateHUD();return result;}\n""",
    "base combat presentation adapters",
)
mono = regex_once(
    mono,
    r"(?ms)^  function updateBossSpecialIndicator\(\)\{.*?^  \}\n",
    "  function updateBossSpecialIndicator(){if(!dbCombatPresentation)throw new Error('Combat presentation owner is not configured.');return dbCombatPresentation.renderBossSpecialIndicator();}\n",
    "boss special presentation adapter",
)

# The V13 full enemy-party rewrite is the current semantic base. presentation.js
# reproduces its final markup directly, including later poison/art refinements.
mono = regex_once(
    mono,
    r"(?ms)^  renderEnemyParty=function\(\)\{.*?^  \};\n\n  // ---- identity resource UI",
    "  // ---- identity resource UI",
    "V13 enemy-party rewrite",
)
mono = regex_once(
    mono,
    r"(?m)^  const renderEnemyPartyV17Base=renderEnemyParty;renderEnemyParty=function\(\)\{renderEnemyPartyV17Base\(\);v17CompactPoisonMarkers\(\);\};\n",
    "",
    "V17 enemy-party poison wrapper",
)
mono = regex_once(
    mono,
    r"(?ms)^  const db0636RenderEnemyPartyBase=renderEnemyParty;\n  renderEnemyParty=function\(\.\.\.args\)\{.*?^  \};\n",
    "",
    "0636 enemy-party art wrapper",
)

# Drain the complete updateCombatUI last-definition-wins ladder.
for capture in [
    "updateCombatUIBase",
    "updateCombatUIV12",
    "updateCombatUIV13",
    "updateCombatUIV15Patch",
    "updateCombatUIV16Base",
    "updateCombatUIV17Base",
    "updateCombatUIV17SmokeBase",
    "updateCombatUIV18Base",
    "updateCombatUIV19Base",
    "updateCombatUIV25BurnBase",
    "updateCombatUIV27EnemyBase",
    "updateCombatUIV28SmokeBase",
    "updateCombatUIV28RougeBase",
    "updateCombatUIBeta04Base",
    "db0511UpdateCombatUIBase",
    "db060UpdateCombatUIBase",
    "dbFriendUpdateCombatUiBase",
]:
    mono = remove_update_wrapper(mono, capture)

# V24 has updateHUD and combat presentation captures on one historical line.
mono = replace_once(
    mono,
    "const updateCombatUIV24Base=updateCombatUI;updateCombatUI=function(){updateCombatUIV24Base();v24UpdateShieldBars();};",
    "",
    "V24 combat presentation wrapper",
)

# The final owner handles Pale Devil special presentation directly.
mono = regex_once(
    mono,
    r"(?m)^  const updateBossSpecialIndicatorV24Base=updateBossSpecialIndicator;updateBossSpecialIndicator=function\(\)\{.*?\};\n",
    "",
    "V24 boss-special presentation wrapper",
)

# Presentation-only helpers that no longer need monolith ownership.
mono = regex_once(
    mono,
    r"(?m)^  function v17RenderSummonerSpirits\(\)\{.*?\}\n",
    "",
    "summoner spirit presentation helper",
)
mono = regex_once(
    mono,
    r"(?m)^  function v17CompactPoisonMarkers\(\)\{.*?\}\n",
    "",
    "poison compacting presentation helper",
)
mono = regex_once(
    mono,
    r"(?m)^  function v24EnsureShieldBars\(\)\{.*?\}\n",
    "",
    "energy shield bar creation helper",
)
mono = regex_once(
    mono,
    r"(?m)^  function v24UpdateShieldBars\(\)\{.*?\}\n",
    "  function v24UpdateShieldBars(){if(!dbCombatPresentation)return;return dbCombatPresentation.syncEnergyShieldBars();}\n",
    "energy shield compatibility adapter",
)

# Resource container is now lazily created by presentation.js. Keep only the
# special action button bootstrap because the gameplay action listeners are
# intentionally out of scope for this slice.
mono = regex_once(
    mono,
    r"(?ms)^  const ultimateWrap=document\.querySelector\(\"#combatOverlay \.ultimate-wrap\"\),combatActions=document\.querySelector\(\"#combatOverlay \.combat-actions\"\);\n  let classResourceWrap=.*?^  if\(!specialAttackBtn&&combatActions\)\{specialAttackBtn=.*?\}\n",
    """  const combatActions=document.querySelector(\"#combatOverlay .combat-actions\");\n  let specialAttackBtn=$(\"specialAttackBtn\");\n  if(!specialAttackBtn&&combatActions){specialAttackBtn=document.createElement(\"button\");specialAttackBtn.id=\"specialAttackBtn\";specialAttackBtn.className=\"combat-btn special action-tooltip\";specialAttackBtn.hidden=true;combatActions.insertBefore(specialAttackBtn,$(\"guardBtn\"));}\n""",
    "class resource/special bootstrap",
)
mono = regex_once(
    mono,
    r"(?m)^  function setResourceUI\(type,name,value,max,note\)\{.*?\}\n  function hideResourceUI\(\)\{.*?\}\n",
    "",
    "resource presentation helpers",
)

# Dragoon presentation primitives become thin calls to the new owner. Gameplay
# Jump/Land mechanics remain in dicebound.js for a later player-action slice.
mono = replace_once(mono, "  let dbFriendDragoonLandingTimer=0;\n", "", "dragoon presentation timer")
mono = regex_once(
    mono,
    r"(?m)^  function dbFriendSyncDragoonPresentation\(\)\{.*?\}\n",
    "  function dbFriendSyncDragoonPresentation(){return dbCombatPresentation?.syncDragoonPresentation();}\n",
    "dragoon sync adapter",
)
mono = regex_once(
    mono,
    r"(?m)^  function dbFriendDragoonLandPresentation\(\)\{.*?\}\n",
    "  function dbFriendDragoonLandPresentation(){return dbCombatPresentation?.dragoonLandPresentation();}\n",
    "dragoon landing adapter",
)
mono = regex_once(
    mono,
    r"(?ms)^  function dbFriendEnsureDragoonJumpButton\(\)\{.*?^  \}\n",
    "  function dbFriendEnsureDragoonJumpButton(){return dbCombatPresentation?.ensureDragoonJumpButton();}\n",
    "dragoon jump button adapter",
)
mono = replace_once(
    mono,
    "    clearTimeout(dbFriendDragoonLandingTimer);\n",
    "    dbCombatPresentation?.clearDragoonPresentation();\n",
    "dragoon clear presentation timer",
)

# Configure the extracted owner before the encounter/turn owners consume the
# compatibility presentation entry points.
presentation_config = """  const dbCombatPresentationOwner=window.DiceboundCombatPresentation;\n  if(!dbCombatPresentationOwner)throw new Error('DiceBound requires the combat presentation owner before dicebound.js');\n  dbCombatPresentation=dbCombatPresentationOwner.configure({\n    document,\n    guardianSpecialInterval:GUARDIAN_SPECIAL_INTERVAL,\n    getState:()=>({player,currentEnemy,currentEnemies,currentEnemyIndex,currentEncounterLead,currentEncounterTurn,combatBusy}),\n    find:$,\n    getClasses:()=>CLASSES,\n    getElements:()=>ELEMENTS,\n    getPets:()=>PETS,\n    getOccultSpells:()=>OCCULT_SPELLS,\n    getGagInfo:()=>GAG_INFO,\n    isClassActive:id=>classIdentityActive(id),\n    hasClassMechanic:id=>classHasMechanic(id),\n    classIdentityId:()=>classIdentityId(),\n    applyClassPortrait:(...args)=>applyClassPortrait(...args),\n    enemyPortraitHTML:enemy=>enemyPortraitSVG(enemy),\n    potionHealValue:()=>v16PotionHealValue(),\n    potionTooltip:()=>v18PotionTooltip(),\n    describeUltimate:id=>describeCurrentUltimate(id),\n    berserkerRageBonus:()=>DB_EFFECTIVE_STATS.berserkerRageBonus(player),\n    hasLegendaryEffect:id=>db060HasEffect(id),\n    activeTrainerPetId:()=>activeTrainerPetId(),\n    selectEnemy:index=>setCurrentEnemy(index),\n    dragoonActive:()=>dbFriendDragoonActive(),\n    dragoonJumpCooldown:()=>dbFriendDragoonCooldown(),\n    onDragoonJump:()=>dbFriendDragoonJump(),\n    clamp:(value,min,max)=>clamp(value,min,max)\n  });\n\n"""
mono = replace_once(
    mono,
    "  const dbCombatEncounterOwner=window.DiceboundCombatEncounterLifecycle;\n",
    presentation_config + "  const dbCombatEncounterOwner=window.DiceboundCombatEncounterLifecycle;\n",
    "combat presentation composition root",
)

# No production ownership ladder may remain after materialization.
retired = [
    "updateCombatUIBase","updateCombatUIV12","updateCombatUIV13","updateCombatUIV15Patch","updateCombatUIV16Base",
    "updateCombatUIV17Base","updateCombatUIV17SmokeBase","updateCombatUIV18Base","updateCombatUIV19Base","updateCombatUIV24Base",
    "updateCombatUIV25BurnBase","updateCombatUIV27EnemyBase","updateCombatUIV28SmokeBase","updateCombatUIV28RougeBase",
    "updateCombatUIBeta04Base","db0511UpdateCombatUIBase","db060UpdateCombatUIBase","dbFriendUpdateCombatUiBase",
    "renderEnemyPartyV17Base","db0636RenderEnemyPartyBase","updateBossSpecialIndicatorV24Base",
    "setResourceUI","hideResourceUI","v17RenderSummonerSpirits","v17CompactPoisonMarkers","v24EnsureShieldBars",
]
for symbol in retired:
    if re.search(rf"(?<![\w$]){re.escape(symbol)}(?![\w$])", mono):
        raise SystemExit(f"retired combat presentation symbol remains: {symbol}")
if len(re.findall(r"(?m)^  function updateCombatUI\(", mono)) != 1:
    raise SystemExit("expected exactly one thin updateCombatUI adapter")
if re.search(r"(?m)^\s*updateCombatUI\s*=", mono):
    raise SystemExit("updateCombatUI reassignment remains after extraction")
if len(re.findall(r"(?m)^  function renderEnemyParty\(", mono)) != 1:
    raise SystemExit("expected exactly one thin renderEnemyParty adapter")
if re.search(r"(?m)^\s*renderEnemyParty\s*=", mono):
    raise SystemExit("renderEnemyParty reassignment remains after extraction")

MONO_PATH.write_text(mono, encoding="utf-8")

# Runtime script/module wiring.
manifest_path = ROOT / "runtime/js/module-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
if "combat-presentation" not in manifest["loadOrder"]:
    pos = manifest["loadOrder"].index("combat-encounter-lifecycle")
    manifest["loadOrder"].insert(pos, "combat-presentation")
if not any(m.get("id") == "combat-presentation" for m in manifest["modules"]):
    pos = next(i for i, m in enumerate(manifest["modules"]) if m.get("id") == "combat-encounter-lifecycle")
    manifest["modules"].insert(pos, {
        "id": "combat-presentation",
        "path": "js/combat/presentation.js",
        "domain": "combat/presentation-and-battlefield-rendering",
        "status": "extracted",
        "requires": [],
        "provides": ["DiceboundCombatPresentation"],
    })
monolith = next(m for m in manifest["modules"] if m.get("id") == "dicebound-monolith")
requires = monolith.setdefault("requires", [])
if "combat-presentation" not in requires:
    anchor = requires.index("combat-encounter-lifecycle") if "combat-encounter-lifecycle" in requires else len(requires)
    requires.insert(anchor, "combat-presentation")
write_json(manifest_path, manifest)

index_path = ROOT / "runtime/index.html"
index = index_path.read_text(encoding="utf-8")
index = replace_once(
    index,
    '<script src="js/combat/targeting.js"></script>\n<script src="js/combat/encounter-lifecycle.js"></script>',
    '<script src="js/combat/targeting.js"></script>\n<script src="js/combat/presentation.js"></script>\n<script src="js/combat/encounter-lifecycle.js"></script>',
    "runtime combat presentation script tag",
)
index_path.write_text(index, encoding="utf-8")

# Permanent anti-shadow guard.
shadow_path = ROOT / "tools/test_shadow_ownership_drain.py"
shadow = shadow_path.read_text(encoding="utf-8")
presentation_guard = """presentation_retired = [\n    'updateCombatUIBase','updateCombatUIV12','updateCombatUIV13','updateCombatUIV15Patch','updateCombatUIV16Base',\n    'updateCombatUIV17Base','updateCombatUIV17SmokeBase','updateCombatUIV18Base','updateCombatUIV19Base','updateCombatUIV24Base',\n    'updateCombatUIV25BurnBase','updateCombatUIV27EnemyBase','updateCombatUIV28SmokeBase','updateCombatUIV28RougeBase',\n    'updateCombatUIBeta04Base','db0511UpdateCombatUIBase','db060UpdateCombatUIBase','dbFriendUpdateCombatUiBase',\n    'renderEnemyPartyV17Base','db0636RenderEnemyPartyBase','updateBossSpecialIndicatorV24Base',\n    'setResourceUI','hideResourceUI','v17RenderSummonerSpirits','v17CompactPoisonMarkers','v24EnsureShieldBars',\n]\nfor symbol in presentation_retired:\n    assert not re.search(rf'(?<![\\w$]){re.escape(symbol)}(?![\\w$])', mono), f\"retired combat presentation owner returned: {symbol}\"\nassert mono.count('function updateCombatUI(') == 1, 'updateCombatUI must have exactly one thin compatibility adapter'\nassert not re.search(r'(?m)^\\s*updateCombatUI\\s*=', mono), 'updateCombatUI reassignment chain must not return'\nassert mono.count('function renderEnemyParty(') == 1, 'renderEnemyParty must have exactly one thin compatibility adapter'\nassert not re.search(r'(?m)^\\s*renderEnemyParty\\s*=', mono), 'renderEnemyParty reassignment chain must not return'\nassert \"dbCombatPresentation=dbCombatPresentationOwner.configure({\" in mono, 'combat presentation owner is not configured'\n\n"""
shadow = replace_once(shadow, "encounter_retired = [\n", presentation_guard + "encounter_retired = [\n", "presentation shadow guard insertion")
shadow_path.write_text(shadow, encoding="utf-8")

# Runtime architecture validator owns the same permanent boundary.
arch_path = ROOT / "tools/validate_runtime_architecture.py"
arch = arch_path.read_text(encoding="utf-8")
arch_guard = """    combat_presentation_module = by_id.get(\"combat-presentation\")\n    if not combat_presentation_module:\n        errors.append(\"Combat presentation owner combat-presentation is missing from the runtime manifest\")\n    else:\n        if combat_presentation_module.get(\"path\") != \"js/combat/presentation.js\" or \"DiceboundCombatPresentation\" not in (combat_presentation_module.get(\"provides\") or []):\n            errors.append(\"combat-presentation must provide DiceboundCombatPresentation from js/combat/presentation.js\")\n        if position.get(\"combat-presentation\", -1) >= position.get(str(monolith_id), -1):\n            errors.append(\"combat-presentation must load before the compatibility monolith\")\n    combat_presentation_source = sources.get(\"combat-presentation\", \"\")\n    for forbidden_rng in [\"Math.random\", \"random(\", \"rand(\", \"pick(\"]:\n        if forbidden_rng in combat_presentation_source:\n            errors.append(\"combat-presentation must not consume game RNG: \" + forbidden_rng)\n    if monolith_source:\n        if \"dbCombatPresentation=dbCombatPresentationOwner.configure({\" not in monolith_source:\n            errors.append(\"dicebound.js must configure the combat presentation owner\")\n        if monolith_source.count(\"function updateCombatUI(\") != 1 or \"dbCombatPresentation.update()\" not in monolith_source:\n            errors.append(\"dicebound.js must retain only the thin updateCombatUI presentation adapter\")\n        if re.search(r\"(?m)^\\s*updateCombatUI\\s*=\", monolith_source):\n            errors.append(\"dicebound.js retains an updateCombatUI reassignment after presentation extraction\")\n        if monolith_source.count(\"function renderEnemyParty(\") != 1 or \"dbCombatPresentation.renderEnemyParty()\" not in monolith_source:\n            errors.append(\"dicebound.js must retain only the thin renderEnemyParty presentation adapter\")\n        if re.search(r\"(?m)^\\s*renderEnemyParty\\s*=\", monolith_source):\n            errors.append(\"dicebound.js retains a renderEnemyParty reassignment after presentation extraction\")\n        for symbol in (\"updateCombatUIBase\",\"updateCombatUIV12\",\"updateCombatUIV13\",\"updateCombatUIV15Patch\",\"updateCombatUIV16Base\",\"updateCombatUIV17Base\",\"updateCombatUIV17SmokeBase\",\"updateCombatUIV18Base\",\"updateCombatUIV19Base\",\"updateCombatUIV24Base\",\"updateCombatUIV25BurnBase\",\"updateCombatUIV27EnemyBase\",\"updateCombatUIV28SmokeBase\",\"updateCombatUIV28RougeBase\",\"updateCombatUIBeta04Base\",\"db0511UpdateCombatUIBase\",\"db060UpdateCombatUIBase\",\"dbFriendUpdateCombatUiBase\",\"renderEnemyPartyV17Base\",\"db0636RenderEnemyPartyBase\"):\n            if re.search(rf\"(?<![\\w$]){re.escape(symbol)}(?![\\w$])\", monolith_source):\n                errors.append(f\"retired combat presentation wrapper remains in dicebound.js: {symbol}\")\n\n"""
arch = replace_once(arch, "    run_lifecycle_module = by_id.get(\"run-lifecycle\")\n", arch_guard + "    run_lifecycle_module = by_id.get(\"run-lifecycle\")\n", "presentation architecture guard insertion")
arch_path.write_text(arch, encoding="utf-8")

# Source-facing release notes. Version stamping/build metadata is handled by the
# canonical release tooling in the materializer workflow.
change_path = ROOT / "CHANGELOG.md"
change = change_path.read_text(encoding="utf-8")
change = replace_once(
    change,
    "## Beta 0.6.6.1\n",
    """## Beta 0.6.6.2\n\n### Combat presentation ownership (#40, #209, #273)\n- Extracted the combat HUD/battlefield renderer into `runtime/js/combat/presentation.js`, consolidating the historical `updateCombatUI` and `renderEnemyParty` presentation ladders behind one owner.\n- Preserved final class resources, statuses, Energy Shield, enemy art/target presentation, Unstable Ultimate and Dragoon controls while removing overwritten historical presentation layers.\n- Rendering is now explicitly zero-RNG and does not own gameplay/progression state; the compatibility adapter preserves the existing HUD refresh separately.\n\n## Beta 0.6.6.1\n""",
    "changelog 0.6.6.2 entry",
)
change_path.write_text(change, encoding="utf-8")

patch_path = ROOT / "runtime/PATCH_NOTES.md"
patch = patch_path.read_text(encoding="utf-8")
patch = replace_once(patch, "# Unreleased — Beta 0.6.6.1\n", "# Unreleased — Beta 0.6.6.2\n", "patch notes heading")
patch = replace_once(
    patch,
    "## Beta 0.6.6.1",
    """## Beta 0.6.6.2 Combat presentation ownership (#40, #209, #273)\n- Combat HUD and battlefield rendering now have one authoritative runtime owner in `combat/presentation.js`.\n- Final class resource panels, combat statuses, Energy Shield, target/enemy presentation, borrowed Ultimates, Unstable Ultimate and Dragoon action presentation are preserved without the historical wrapper tower.\n- Combat rendering consumes no game RNG and no longer owns gameplay/progression mutations.\n\n## Beta 0.6.6.1""",
    "patch notes 0.6.6.2 entry",
)
patch_path.write_text(patch, encoding="utf-8")

print(json.dumps({"ok": True, "monolithBytes": len(mono.encode('utf-8')), "monolithLines": len(mono.splitlines())}, indent=2))
