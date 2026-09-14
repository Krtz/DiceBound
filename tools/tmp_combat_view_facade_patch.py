from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one occurrence, found {count}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


mono_path = ROOT / "runtime/js/dicebound.js"
mono = mono_path.read_text(encoding="utf-8")

anchor = "  let dbCombat=null;\n"
view_bind = (
    "  let dbCombat=null;\n"
    "  const dbCombatView=window.DiceboundCombatView;\n"
    "  if(!dbCombatView)throw new Error(\"dicebound.js requires DiceboundCombatView before loading.\");\n"
)
if anchor not in mono:
    raise RuntimeError("Combat facade bootstrap anchor missing")
mono = mono.replace(anchor, view_bind, 1)

vfx_boot = (
    "  const dbCombatVfx=window.DiceboundCombatVfx?.create({getEnemies:()=>currentEnemies,getPlayer:()=>player});\n"
    "  if(!dbCombatVfx)throw new Error('DiceBound requires the combat VFX module.');\n"
    "  dbCombatVfx.prepareNature();"
)
if mono.count(vfx_boot) != 1:
    raise RuntimeError(f"expected one VFX bootstrap, found {mono.count(vfx_boot)}")
mono = mono.replace(
    vfx_boot,
    "  dbCombatView.configureVfx({getEnemies:()=>currentEnemies,getPlayer:()=>player});\n  dbCombatView.prepareNature();",
    1,
)

presentation_boot = (
    "  const dbCombatPresentationOwner=window.DiceboundCombatPresentation;\n"
    "  if(!dbCombatPresentationOwner)throw new Error('DiceBound requires the combat presentation owner before dicebound.js');\n"
    "  dbCombatPresentation=dbCombatPresentationOwner.configure({"
)
if mono.count(presentation_boot) != 1:
    raise RuntimeError(f"expected one presentation bootstrap, found {mono.count(presentation_boot)}")
mono = mono.replace(presentation_boot, "  dbCombatView.configurePresentation({", 1)

if mono.count("  let dbCombatPresentation=null;\n") != 1:
    raise RuntimeError("focused presentation peer variable declaration missing or duplicated")
mono = mono.replace("  let dbCombatPresentation=null;\n", "", 1)

mono = mono.replace("dbCombatVfx.", "dbCombatView.")
mono = mono.replace("dbCombatPresentation?.", "dbCombatView.")
mono = mono.replace("dbCombatPresentation.", "dbCombatView.")
mono = mono.replace(
    "if(!dbCombatPresentation)throw new Error('Combat presentation owner is not configured.');",
    "",
)
mono = mono.replace(
    "function v24UpdateShieldBars(){if(!dbCombatPresentation)return;return dbCombatView.syncEnergyShieldBars();}",
    "function v24UpdateShieldBars(){if(!dbCombatView.isPresentationConfigured())return;return dbCombatView.syncEnergyShieldBars();}",
)
mono = mono.replace(
    "    dbCombatView.clearTransient?.();\n    dbCombatView.clearDragoonPresentation();",
    "    dbCombatView.clearTransient();",
)

for forbidden in [r"window\.DiceboundCombatPresentation", r"window\.DiceboundCombatVfx", r"\bdbCombatPresentation\b", r"\bdbCombatVfx\b"]:
    if re.search(forbidden, mono):
        raise RuntimeError(f"direct Combat View peer owner survived monolith patch: {forbidden}")
for required in [
    "const dbCombatView=window.DiceboundCombatView;",
    "dbCombatView.configureVfx({getEnemies:()=>currentEnemies,getPlayer:()=>player});",
    "dbCombatView.configurePresentation({",
    "function updateCombatUI(){const result=dbCombatView.update();updateHUD();return result;}",
    "function renderEnemyParty(){return dbCombatView.renderEnemyParty();}",
    "playDonutRain:payload=>dbCombatView.playDonutRain(payload)",
    "playProjectileProc:(key,payload)=>dbCombatView.playProjectileProc?.(key,payload)",
]:
    if required not in mono:
        raise RuntimeError(f"Combat View facade route missing after patch: {required}")
mono_path.write_text(mono, encoding="utf-8")

manifest_path = ROOT / "runtime/js/module-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
if any(module.get("id") == "combat-view-facade" for module in manifest["modules"]):
    raise RuntimeError("combat-view-facade already exists in manifest")
module = {
    "id": "combat-view-facade",
    "path": "js/combat/view-facade.js",
    "domain": "combat/public-presentation-vfx-facade",
    "status": "extracted",
    "requires": ["combat-presentation", "combat-vfx"],
    "provides": ["DiceboundCombatView"],
}
vfx_index = manifest["loadOrder"].index("combat-vfx")
manifest["loadOrder"].insert(vfx_index + 1, "combat-view-facade")
module_index = next(i for i, item in enumerate(manifest["modules"]) if item.get("id") == "combat-vfx")
manifest["modules"].insert(module_index + 1, module)
write_json(manifest_path, manifest)

index_path = ROOT / "runtime/index.html"
replace_once(
    index_path,
    '<script src="js/combat/vfx.js"></script>',
    '<script src="js/combat/vfx.js"></script>\n<script src="js/combat/view-facade.js"></script>',
)

project_path = ROOT / "wrapper-source/config/project.json"
project = json.loads(project_path.read_text(encoding="utf-8"))
script = "js/combat/view-facade.js"
if script in project["runtimeScripts"]:
    raise RuntimeError("Combat View facade already exists in project runtimeScripts")
project["runtimeScripts"].insert(project["runtimeScripts"].index("js/combat/vfx.js") + 1, script)
write_json(project_path, project)

validator_path = ROOT / "tools/validate_runtime_architecture.py"
validator = validator_path.read_text(encoding="utf-8")
validator_anchor = '    combat_presentation_module = by_id.get("combat-presentation")\n'
if validator.count(validator_anchor) != 1:
    raise RuntimeError("central validator Combat presentation anchor missing")
view_policy = '''    combat_view_module = by_id.get("combat-view-facade")
    combat_view_source = sources.get("combat-view-facade", "")
    if not combat_view_module:
        errors.append("Combat View public facade combat-view-facade is missing from the runtime manifest")
    else:
        combat_view_requires = set(combat_view_module.get("requires") or [])
        if combat_view_module.get("path") != "js/combat/view-facade.js" or "DiceboundCombatView" not in (combat_view_module.get("provides") or []):
            errors.append("combat-view-facade must own js/combat/view-facade.js and provide DiceboundCombatView")
        if not {"combat-presentation", "combat-vfx"}.issubset(combat_view_requires):
            errors.append("Combat View facade must compose the focused Presentation and VFX owners")
        if position.get("combat-view-facade", -1) <= position.get("combat-presentation", -1) or position.get("combat-view-facade", -1) <= position.get("combat-vfx", -1):
            errors.append("Combat View facade must load after its focused Presentation/VFX owners")
        if position.get("combat-view-facade", -1) >= position.get(str(monolith_id), -1):
            errors.append("Combat View facade must load before the compatibility monolith")
    for forbidden_rng in ["Math.random", "random(", "rand(", "pick("]:
        if forbidden_rng in combat_view_source:
            errors.append("combat-view-facade must not consume game RNG: " + forbidden_rng)
    if monolith_source:
        for required_view_route in [
            "const dbCombatView=window.DiceboundCombatView;",
            "dbCombatView.configureVfx({",
            "dbCombatView.configurePresentation({",
        ]:
            if required_view_route not in monolith_source:
                errors.append("dicebound.js is missing Combat View facade composition route: " + required_view_route)
        for peer_pattern, peer_label in [
            (r"window\\.DiceboundCombatPresentation", "DiceboundCombatPresentation"),
            (r"window\\.DiceboundCombatVfx", "DiceboundCombatVfx"),
            (r"(?<![\\w$])dbCombatPresentation(?![\\w$])", "dbCombatPresentation"),
            (r"(?<![\\w$])dbCombatVfx(?![\\w$])", "dbCombatVfx"),
        ]:
            if re.search(peer_pattern, monolith_source):
                errors.append("dicebound.js retains direct peer-public Combat View owner: " + peer_label)
'''
validator = validator.replace(validator_anchor, view_policy + validator_anchor, 1)
validator = validator.replace(
    'if "dbCombatPresentation=dbCombatPresentationOwner.configure({" not in monolith_source:',
    'if "dbCombatView.configurePresentation({" not in monolith_source:',
)
validator = validator.replace(
    'errors.append("dicebound.js must configure the combat presentation owner")',
    'errors.append("dicebound.js must configure combat presentation through the Combat View facade")',
)
validator = validator.replace('"dbCombatPresentation.update()"', '"dbCombatView.update()"')
validator = validator.replace('"dbCombatPresentation.renderEnemyParty()"', '"dbCombatView.renderEnemyParty()"')
validator_path.write_text(validator, encoding="utf-8")

shadow_path = ROOT / "tools/test_shadow_ownership_drain.py"
shadow = shadow_path.read_text(encoding="utf-8")
old_shadow = 'assert "dbCombatPresentation=dbCombatPresentationOwner.configure({" in mono, \'combat presentation owner is not configured\''
new_shadow = 'assert "dbCombatView.configurePresentation({" in mono, \'combat presentation must be configured through Combat View\'\nassert not re.search(r"(?<![\\w$])dbCombatPresentation(?![\\w$])", mono), \'peer-public Combat Presentation variable returned\'\nassert not re.search(r"(?<![\\w$])dbCombatVfx(?![\\w$])", mono), \'peer-public Combat VFX variable returned\''
if shadow.count(old_shadow) != 1:
    raise RuntimeError("shadow ownership Combat presentation assertion missing")
shadow_path.write_text(shadow.replace(old_shadow, new_shadow, 1), encoding="utf-8")

vfx_test_path = ROOT / "tools/test_combat_vfx.js"
vfx_test = vfx_test_path.read_text(encoding="utf-8")
old_owner_assert = 'assert.match(monolith, /window\\.DiceboundCombatVfx\\?\\.create/, "Combat VFX local-state adapter is missing");'
new_owner_assert = 'assert.match(monolith, /dbCombatView\\.configureVfx\\(\\{getEnemies:\\(\\)=>currentEnemies,getPlayer:\\(\\)=>player\\}\\);/, "Combat VFX must be configured through Combat View");'
if vfx_test.count(old_owner_assert) != 1:
    raise RuntimeError("focused VFX monolith ownership assertion missing")
vfx_test = vfx_test.replace(old_owner_assert, new_owner_assert, 1)
vfx_test = vfx_test.replace("dbCombatVfx", "dbCombatView")
vfx_test += '\nassert.doesNotMatch(monolith, /window\\.DiceboundCombatVfx/, "monolith must not bind focused VFX owner directly");\n'
vfx_test_path.write_text(vfx_test, encoding="utf-8")

print("Combat View facade staging patch applied")
