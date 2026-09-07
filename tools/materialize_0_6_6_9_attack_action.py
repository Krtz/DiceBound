#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / "runtime" / "js" / "dicebound.js"
INDEX = ROOT / "runtime" / "index.html"
MODULE_MANIFEST = ROOT / "runtime" / "js" / "module-manifest.json"
VERSION_JS = ROOT / "runtime" / "js" / "version.js"
CHANGELOG = ROOT / "CHANGELOG.md"
VERSION = "0.6.6.9"
CHANNEL = "Beta"
SUMMARY = "Basic Attack action-resolution ownership extraction."


def fail(message: str) -> None:
    raise SystemExit(f"0.6.6.9 MATERIALIZE FAILED: {message}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"expected exactly one {label}, found {count}")
    return text.replace(old, new, 1)


def replace_region(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        fail(f"could not find start marker for {label}")
    if text.find(start_marker, start + 1) >= 0:
        fail(f"start marker for {label} is not unique")
    end = text.find(end_marker, start)
    if end < 0:
        fail(f"could not find end marker for {label}")
    return text[:start] + replacement + text[end:]


def run(*args: str) -> None:
    print("+", " ".join(args), flush=True)
    subprocess.run(args, cwd=ROOT, check=True)


def census(text: str) -> dict[str, int]:
    return {
        "bytes": len(text.encode("utf-8")),
        "lines": len(text.splitlines()),
        "baseCaptures": len(re.findall(r"\bconst\s+[A-Za-z_$][\w$]*Base\s*=", text)),
        "playerAttackAssignments": len(re.findall(r"\bplayerAttack\s*=", text)),
    }


def main() -> None:
    if not (ROOT / "runtime" / "js" / "combat" / "attack-action-resolution.js").is_file():
        fail("attack-action-resolution.js is missing")
    if not (ROOT / "tools" / "test_combat_attack_action_resolution.js").is_file():
        fail("attack-action deterministic test is missing")

    monolith = MONOLITH.read_text(encoding="utf-8")
    before = census(monolith)

    adapter = '''  let dbCombatAttackResolution=null;\n  async function playerAttack(...args){if(!dbCombatAttackResolution)throw new Error('Combat Attack-action owner is not configured.');return dbCombatAttackResolution.playerAttack(...args);}\n\n'''
    monolith = replace_region(
        monolith,
        "  async function playerAttack(){",
        "  async function guardAction(...args)",
        adapter,
        "base playerAttack transaction",
    )

    monolith = replace_region(
        monolith,
        "  const playerAttackV13=playerAttack;",
        "  const healPlayerV13=healPlayer;",
        "",
        "V13 Monk/Frog playerAttack wrapper",
    )

    monolith = replace_region(
        monolith,
        "    const playerAttackV16Base=playerAttack;",
        "  identityPotionAction=async function()",
        "",
        "V16 identity playerAttack wrapper",
    )

    monolith = replace_region(
        monolith,
        "  // Strike-level effects.\n    // Echo Chamber must be active before playerAttack rolls Echo count.",
        "  // Weapon-proc effects and Pet Mirror element memory.",
        "  // Basic Attack action-level Echo Chamber sequencing is owned by combat/attack-action-resolution.\n  // Individual strike-level effects remain owned by combat/strike-resolution.\n  \n",
        "Echo Chamber playerAttack wrapper",
    )

    monolith = replace_region(
        monolith,
        "  const dbFriendPlayerAttackBase=playerAttack;",
        "  const dbFriendPotionBase=usePotion;",
        "",
        "Friends Patch Dragoon playerAttack wrapper",
    )

    configure = '''  const dbCombatAttackOwner=window.DiceboundCombatAttackActionResolution;\n  if(!dbCombatAttackOwner)throw new Error('DiceBound requires the combat Attack-action owner before dicebound.js');\n  dbCombatAttackResolution=dbCombatAttackOwner.configure({\n    getPlayer:()=>player,\n    getCurrentEnemy:()=>currentEnemy,\n    getCurrentEnemies:()=>currentEnemies,\n    livingEnemies:()=>livingEnemies(),\n    getCombatBusy:()=>combatBusy,\n    setCombatBusy:value=>{combatBusy=!!value;},\n    rollD20Chaos:(...args)=>rollD20Chaos(...args),\n    updateCombatUI:()=>updateCombatUI(),\n    rollTieredProc:chance=>rollTieredProc(chance),\n    performStrike:(...args)=>performStrike(...args),\n    chargeUltimate:amount=>chargeUltimate(amount),\n    applyMythicPantsPulse:()=>applyMythicPantsPulse(),\n    setCombatText:text=>setCombatText(text),\n    winCombat:(...args)=>winCombat(...args),\n    setCurrentEnemy:index=>setCurrentEnemy(index),\n    resolveEnemyResponse:(...args)=>resolveEnemyResponse(...args),\n    isClassActive:id=>classIdentityActive(id),\n    classIdentityId:()=>classIdentityId(),\n    hasLegendaryEffect:id=>db060HasEffect(id),\n    showToast:text=>showToast(text),\n    addCombatHistory:text=>addCombatHistory(text),\n    dragoonActive:()=>dbFriendDragoonActive(),\n    dragoonLandingReady:()=>!!player.dragoonLandingReady,\n    dragoonLanding:()=>dbFriendDragoonLanding(),\n    tickDragoonCooldown:()=>dbFriendTickDragoonCooldown()\n  });\n\n'''
    monolith = replace_once(
        monolith,
        "  const dbCombatGuardOwner=window.DiceboundCombatGuardResolution;",
        configure + "  const dbCombatGuardOwner=window.DiceboundCombatGuardResolution;",
        "Attack-action composition anchor",
    )

    for retired in (
        "const playerAttackV13=playerAttack",
        "const playerAttackV16Base=playerAttack",
        "const db060PlayerAttackBase=playerAttack",
        "const dbFriendPlayerAttackBase=playerAttack",
        "playerAttack=async function",
    ):
        if retired in monolith:
            fail(f"retired Basic Attack shadow ownership remains: {retired}")
    if monolith.count("DiceboundCombatAttackActionResolution") != 1:
        fail("Attack-action owner composition reference is not exactly one")

    MONOLITH.write_text(monolith, encoding="utf-8")

    index = INDEX.read_text(encoding="utf-8")
    index = replace_once(
        index,
        '<script src="js/combat/strike-resolution.js"></script>\n',
        '<script src="js/combat/strike-resolution.js"></script>\n<script src="js/combat/attack-action-resolution.js"></script>\n',
        "runtime Attack-action script insertion",
    )
    INDEX.write_text(index, encoding="utf-8")

    manifest = json.loads(MODULE_MANIFEST.read_text(encoding="utf-8"))
    module_id = "combat-attack-action-resolution"
    if module_id in manifest.get("loadOrder", []):
        fail(f"{module_id} already exists in loadOrder")
    load_index = manifest["loadOrder"].index("combat-strike-resolution") + 1
    manifest["loadOrder"].insert(load_index, module_id)
    modules = manifest.get("modules", [])
    if any(module.get("id") == module_id for module in modules):
        fail(f"{module_id} already exists in modules")
    module_index = next(i for i, module in enumerate(modules) if module.get("id") == "combat-strike-resolution") + 1
    modules.insert(module_index, {
        "id": module_id,
        "path": "js/combat/attack-action-resolution.js",
        "domain": "combat/basic-attack-action-orchestration",
        "status": "extracted",
        "requires": [],
        "provides": ["DiceboundCombatAttackActionResolution"],
    })
    MODULE_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    changelog = CHANGELOG.read_text(encoding="utf-8")
    section = '''## Beta 0.6.6.9\n\n### Basic Attack action-resolution ownership (#40, #209, #288)\n- Extracted the high-level Basic Attack transaction into `runtime/js/combat/attack-action-resolution.js`, leaving individual base/Echo strike math in the existing strike-resolution owner.\n- Consolidated the live Monk/Frog, Clown/Alchemist, Echo Chamber and Dragoon Basic Attack wrapper ladder while preserving D20/Echo RNG order, target reconciliation, Crit-to-Ultimate accounting and temporary-state restoration.\n- Potions, Ultimates, Guard, Pet/companion turns, occult/special attacks, victory rewards, saves/checkpoints and gameplay values remain outside this slice.\n\n'''
    anchor = "## Beta 0.6.6.8\n"
    changelog = replace_once(changelog, anchor, section + anchor, "0.6.6.8 changelog anchor")
    CHANGELOG.write_text(changelog, encoding="utf-8")

    run(sys.executable, "tools/set_project_version.py", "--version", VERSION, "--channel", CHANNEL)

    version_js = VERSION_JS.read_text(encoding="utf-8")
    version_js, count = re.subn(
        r'const RELEASE_SUMMARY="[^"]*";',
        f'const RELEASE_SUMMARY="{SUMMARY}";',
        version_js,
        count=1,
    )
    if count != 1:
        fail(f"expected one RELEASE_SUMMARY, found {count}")
    VERSION_JS.write_text(version_js, encoding="utf-8")

    index = INDEX.read_text(encoding="utf-8")
    index, count = re.subn(
        rf'<p>{re.escape(CHANNEL)} v{re.escape(VERSION)}\s*·[^<]*</p>',
        f'<p>{CHANNEL} v{VERSION} · Basic Attack action-resolution extraction.</p>',
        index,
        count=1,
    )
    if count != 1:
        fail(f"expected one stamped runtime subtitle, found {count}")
    INDEX.write_text(index, encoding="utf-8")

    run(
        sys.executable,
        "tools/refresh_runtime_manifest.py",
        "--version", VERSION,
        "--channel", CHANNEL,
        "--development-state", "Unreleased",
    )

    after_text = MONOLITH.read_text(encoding="utf-8")
    after = census(after_text)
    print(json.dumps({"before": before, "after": after, "deltaBytes": after["bytes"] - before["bytes"], "deltaLines": after["lines"] - before["lines"]}, indent=2))


if __name__ == "__main__":
    main()
