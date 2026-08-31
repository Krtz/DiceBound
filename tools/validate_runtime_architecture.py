#!/usr/bin/env python3
"""Validate DiceBound's incremental runtime-module architecture.

This validator is intentionally browser-build friendly: it inspects source files only
and does not require Node/npm. It protects the migration away from dicebound.js by
checking deterministic script order, declared dependencies and public-global ownership.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime"
MANIFEST_PATH = RUNTIME / "js" / "module-manifest.json"
INDEX_PATH = RUNTIME / "index.html"
STYLE_PATH = RUNTIME / "css" / "dicebound.css"

SCRIPT_RE = re.compile(r"<script\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>\s*</script>", re.I)
FUNCTION_RE = re.compile(r"(?:^|\n)\s*function\s+([A-Za-z_$][\w$]*)\s*\(", re.M)
TOP_LEVEL_FUNCTION_RE = re.compile(r"^  (?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(", re.M)


def assignment_patterns(symbol: str) -> tuple[re.Pattern[str], re.Pattern[str]]:
    escaped = re.escape(symbol)
    return (
        re.compile(rf"\bwindow\s*\.\s*{escaped}\s*="),
        re.compile(rf"\bwindow\s*\[\s*[\"']{escaped}[\"']\s*\]\s*="),
    )


def assigns_symbol(source: str, symbol: str) -> bool:
    return any(pattern.search(source) for pattern in assignment_patterns(symbol))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="emit the report as JSON")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []

    if not MANIFEST_PATH.is_file():
        print(f"missing module manifest: {MANIFEST_PATH}", file=sys.stderr)
        return 1
    if not INDEX_PATH.is_file():
        print(f"missing runtime index: {INDEX_PATH}", file=sys.stderr)
        return 1
    if not STYLE_PATH.is_file():
        print(f"missing runtime stylesheet: {STYLE_PATH}", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest.get("format") != 1:
        errors.append(f"unsupported module manifest format: {manifest.get('format')!r}")

    modules = manifest.get("modules") or []
    load_order = manifest.get("loadOrder") or []
    by_id: dict[str, dict] = {}
    path_owner: dict[str, str] = {}
    symbol_owner: dict[str, str] = {}

    for module in modules:
        module_id = str(module.get("id") or "").strip()
        path = str(module.get("path") or "").strip()
        if not module_id:
            errors.append("module entry without id")
            continue
        if module_id in by_id:
            errors.append(f"duplicate module id: {module_id}")
            continue
        by_id[module_id] = module
        if not path:
            errors.append(f"module {module_id} has no path")
        elif path in path_owner:
            errors.append(f"module path {path} is owned by both {path_owner[path]} and {module_id}")
        else:
            path_owner[path] = module_id

        for symbol in module.get("provides") or []:
            symbol = str(symbol)
            if symbol in symbol_owner:
                errors.append(
                    f"public symbol {symbol} is claimed by both {symbol_owner[symbol]} and {module_id}"
                )
            else:
                symbol_owner[symbol] = module_id

    missing_from_order = [module_id for module_id in by_id if module_id not in load_order]
    unknown_in_order = [module_id for module_id in load_order if module_id not in by_id]
    if missing_from_order:
        errors.append(f"modules missing from loadOrder: {', '.join(missing_from_order)}")
    if unknown_in_order:
        errors.append(f"loadOrder references unknown modules: {', '.join(unknown_in_order)}")
    if len(load_order) != len(set(load_order)):
        errors.append("loadOrder contains duplicate module ids")

    expected_scripts = [str(by_id[module_id]["path"]) for module_id in load_order if module_id in by_id]
    index_source = INDEX_PATH.read_text(encoding="utf-8")
    actual_scripts = [src for src in SCRIPT_RE.findall(index_source) if src.startswith("js/")]
    if actual_scripts != expected_scripts:
        errors.append(
            "runtime/index.html script order differs from module-manifest.json; "
            f"expected {expected_scripts}, got {actual_scripts}"
        )

    position = {module_id: i for i, module_id in enumerate(load_order)}
    sources: dict[str, str] = {}
    for module_id, module in by_id.items():
        rel_path = str(module.get("path") or "")
        source_path = RUNTIME / rel_path
        if not source_path.is_file():
            errors.append(f"module {module_id} points to missing file: runtime/{rel_path}")
            continue
        source = source_path.read_text(encoding="utf-8")
        sources[module_id] = source

        for required in module.get("requires") or []:
            required = str(required)
            if required not in by_id:
                errors.append(f"module {module_id} requires unknown module {required}")
            elif module_id in position and required in position and position[required] >= position[module_id]:
                errors.append(f"module {module_id} requires {required}, but {required} does not load first")

        for symbol in module.get("provides") or []:
            symbol = str(symbol)
            if not assigns_symbol(source, symbol):
                errors.append(f"module {module_id} claims {symbol}, but does not assign window.{symbol}")

    # A declared public global must have exactly one authoritative assignment among
    # all runtime scripts represented in the manifest, including the compatibility monolith.
    for symbol, owner_id in symbol_owner.items():
        assignments = [module_id for module_id, source in sources.items() if assigns_symbol(source, symbol)]
        if owner_id not in assignments:
            # Already reported above; keep this message focused on ownership collisions.
            continue
        if len(assignments) > 1:
            errors.append(
                f"public symbol {symbol} has multiple runtime assignments: {', '.join(assignments)}; "
                f"manifest owner is {owner_id}"
            )

    monolith_id = next((m["id"] for m in modules if m.get("status") == "monolith"), None)
    monolith_source = sources.get(str(monolith_id), "") if monolith_id else ""
    camp_source = sources.get("ui-camp", "")
    reward_policy_source = sources.get("event-rewards", "")
    stylesheet_source = STYLE_PATH.read_text(encoding="utf-8")
    camp_module = by_id.get("ui-camp")
    camp_owner_ok = False
    if not camp_module:
        errors.append("Camp presentation owner ui-camp is missing from the runtime manifest")
    else:
        camp_owner_ok = (
            camp_module.get("path") == "js/ui/camp.js"
            and "assets" in (camp_module.get("requires") or [])
            and "DiceboundCamp" in (camp_module.get("provides") or [])
            and position.get("ui-camp", -1) < position.get(str(monolith_id), -1)
        )
        if not camp_owner_ok:
            errors.append("ui-camp must provide DiceboundCamp, require assets, and load before the monolith")
    for retired_camp_implementation in [
        "function db064PaintedCampBounds(",
        "function db064SyncCampHitTargets(",
        "function db058SetArt(",
        "function beta043RefreshCampIcons(",
        "function beta045RefreshCampLayout(",
        "function db046RefreshCamp(",
        "function db047RefreshCamp(",
        "const db055Style=",
        "const db057Style=",
        "const db058Style=",
        "const db0510Style=",
        "const db0512Style=",
        "const db060CampStyle=",
        "const v23CampRefresh=",
        "function db0633CampObjectMarkup(",
        "function db0633BindCampObject(",
        "function db0633AttachCampObject(",
        ".legacy-camp-modal{max-width:1100px",
    ]:
        if retired_camp_implementation in monolith_source:
            errors.append(
                "retired Camp presentation implementation remains in dicebound.js: "
                + retired_camp_implementation
            )
    if "#startOverlay.camp-fullscreen" in monolith_source:
        errors.append("dicebound.js retains a final Camp stylesheet block after ui-camp extraction")
    for required_camp_stage_owner in [
        "function applyStageLayout(",
        "function stageSpec(",
        "CAMP_STAGE_ANCHORS",
        "const CAMP_BASE_STYLE=",
        "function syncProgressionReveals(",
        "function hideLegacyCampDestinations(",
    ]:
        if required_camp_stage_owner not in camp_source:
            errors.append("ui-camp is missing authoritative Camp stage ownership: " + required_camp_stage_owner)
    if "#startOverlay.camp-fullscreen #nightmareBox,#startOverlay.camp-fullscreen #hellBox,#startOverlay.camp-fullscreen #startHeirloom{display:none!important}" not in camp_source:
        errors.append("ui-camp must suppress legacy mode/storage presentation at the Camp destination layer")
    for retired_reward_policy_camp_owner in ["campAnchors", "function scaleCamp(", "#startOverlay.camp-fullscreen", "#campScene .camp-spot"]:
        if retired_reward_policy_camp_owner in reward_policy_source:
            errors.append("event-rewards retains Camp presentation ownership: " + retired_reward_policy_camp_owner)
    for retired_shared_camp_style in [
        "Alpha 3.1 asset-backed camp art",
        "Alpha 3.1.2 campsite composition",
        "Alpha 3.1.3 — caravan start control",
    ]:
        if retired_shared_camp_style in stylesheet_source:
            errors.append("runtime/css/dicebound.css retains historical Camp presentation ownership: " + retired_shared_camp_style)
    if re.search(r"#startOverlay\.camp-fullscreen \.camp-(?:scene|ground|sky|spot|bonfire|popup|panel|journey)", stylesheet_source):
        errors.append("runtime/css/dicebound.css retains final Camp layout ownership after ui-camp extraction")
    chooser_module = by_id.get("ui-class-chooser")
    chooser_owner_ok = False
    if not chooser_module:
        errors.append("Class chooser presentation owner ui-class-chooser is missing from the runtime manifest")
    else:
        chooser_owner_ok = (
            chooser_module.get("path") == "js/ui/class-chooser.js"
            and {"assets", "classes-registry", "ui-camp"}.issubset(set(chooser_module.get("requires") or []))
            and "DiceboundClassChooser" in (chooser_module.get("provides") or [])
            and position.get("ui-class-chooser", -1) < position.get(str(monolith_id), -1)
        )
        if not chooser_owner_ok:
            errors.append(
                "ui-class-chooser must provide DiceboundClassChooser, require its class/Camp dependencies, "
                "and load before the monolith"
            )
    chooser_source = sources.get("ui-class-chooser", "")
    for required_chooser_behavior in [
        "resolveClassArt",
        "resolveRandomForRun",
        "data-class-chooser-done",
        "class-chooser-layout",
    ]:
        if required_chooser_behavior not in chooser_source:
            errors.append(
                "Class chooser owner is missing required presentation behavior: "
                + required_chooser_behavior
            )
    if monolith_source:
        expected_adapter = "function renderClassChoices(){return window.DiceboundClassChooser?.render();}"
        if expected_adapter not in monolith_source:
            errors.append("dicebound.js must retain only the thin Class chooser composition adapter")
        for retired_chooser_layer in [
            "renderClassChoices=function",
            "renderClassChoicesV",
            "renderClassChoicesBeta",
            "renderClassChoicesBase",
            "function v19EnsureHub()",
            "Legacy Planning",
            ".class-card .identity-note",
            ".class-card .mana-note",
            ".camp-panel .class-grid",
        ]:
            if retired_chooser_layer in monolith_source:
                errors.append(
                    "retired Class chooser implementation/wrapper remains in dicebound.js: "
                    + retired_chooser_layer
                )
    for retired_chooser_style in [".class-card{", ".class-grid{"]:
        if retired_chooser_style in stylesheet_source:
            errors.append(
                "retired Class chooser style remains in runtime/css/dicebound.css: "
                + retired_chooser_style
            )
    pet_chooser_module = by_id.get("ui-pet-chooser")
    pet_chooser_owner_ok = False
    if not pet_chooser_module:
        errors.append("Pet chooser presentation owner ui-pet-chooser is missing from the runtime manifest")
    else:
        pet_chooser_owner_ok = (
            pet_chooser_module.get("path") == "js/ui/pet-chooser.js"
            and {"assets", "pets-registry", "ui-camp"}.issubset(set(pet_chooser_module.get("requires") or []))
            and "DiceboundPetChooser" in (pet_chooser_module.get("provides") or [])
            and position.get("ui-pet-chooser", -1) < position.get(str(monolith_id), -1)
        )
        if not pet_chooser_owner_ok:
            errors.append(
                "ui-pet-chooser must provide DiceboundPetChooser, require its pet/Camp dependencies, "
                "and load before the monolith"
            )
    pet_chooser_source = sources.get("ui-pet-chooser", "")
    for required_pet_chooser_behavior in [
        "resolvePetArt",
        "data-pet-chooser-done",
        "pet-chooser-chrome",
        "function viewModel(",
    ]:
        if required_pet_chooser_behavior not in pet_chooser_source:
            errors.append(
                "Pet chooser owner is missing required presentation behavior: "
                + required_pet_chooser_behavior
            )
    if monolith_source:
        expected_pet_adapter = "function renderPetCollection(){return window.DiceboundPetChooser?.render?.()||null;}"
        if expected_pet_adapter not in monolith_source:
            errors.append("dicebound.js must retain only the thin Pet chooser lifecycle adapter")
        for retired_pet_chooser_layer in [
            "renderPetCollection=function",
            "renderPetCollectionV",
            "petCollectionGrid",
            "petCollectionClose",
            "campPetPanel",
            "dbBeta021RenderCampPets",
            "db059DecoratePetCollection",
            "db059Observer",
        ]:
            if retired_pet_chooser_layer in monolith_source:
                errors.append(
                    "retired Pet chooser implementation/wrapper remains in dicebound.js: "
                    + retired_pet_chooser_layer
                )
    for retired_pet_chooser_style in [
        ".pet-collection-grid{",
        ".camp-pet-choice-beta021{",
        ".camp-pet-feed-beta021{",
    ]:
        if retired_pet_chooser_style in stylesheet_source:
            errors.append(
                "retired Pet chooser style remains in runtime/css/dicebound.css: "
                + retired_pet_chooser_style
            )
    duplicate_functions: list[str] = []
    duplicate_top_level_functions: list[str] = []
    monolith_bytes = 0
    monolith_lines = 0
    if monolith_source:
        monolith_bytes = len(monolith_source.encode("utf-8"))
        monolith_lines = monolith_source.count("\n") + 1
        counts = Counter(FUNCTION_RE.findall(monolith_source))
        duplicate_functions = sorted(name for name, count in counts.items() if count > 1)
        top_level_counts = Counter(TOP_LEVEL_FUNCTION_RE.findall(monolith_source))
        duplicate_top_level_functions = sorted(
            name for name, count in top_level_counts.items() if count > 1
        )
        if duplicate_functions:
            warnings.append(
                "compatibility monolith still contains repeated named function declarations; "
                "treat these as extraction targets, not as new module patterns"
            )
        if duplicate_top_level_functions:
            errors.append(
                "compatibility monolith contains duplicate top-level function declarations: "
                + ", ".join(duplicate_top_level_functions)
            )

    planned_domains = [str(x) for x in manifest.get("plannedDomains") or []]
    if len(planned_domains) != len(set(planned_domains)):
        errors.append("plannedDomains contains duplicates")

    report = {
        "ok": not errors,
        "manifestFormat": manifest.get("format"),
        "moduleCount": len(modules),
        "extractedModuleCount": sum(1 for m in modules if m.get("status") == "extracted"),
        "monolithModuleCount": sum(1 for m in modules if m.get("status") == "monolith"),
        "scriptLoadOrder": actual_scripts,
        "plannedDomains": planned_domains,
        "publicSymbolOwners": symbol_owner,
        "campOwner": {
            "id": "ui-camp",
            "configured": camp_owner_ok,
        },
        "classChooserOwner": {
            "id": "ui-class-chooser",
            "configured": chooser_owner_ok,
        },
        "petChooserOwner": {
            "id": "ui-pet-chooser",
            "configured": pet_chooser_owner_ok,
        },
        "monolith": {
            "id": monolith_id,
            "bytes": monolith_bytes,
            "lines": monolith_lines,
            "duplicateNamedFunctionCount": len(duplicate_functions),
            "duplicateNamedFunctions": duplicate_functions,
            "duplicateTopLevelFunctionCount": len(duplicate_top_level_functions),
            "duplicateTopLevelFunctions": duplicate_top_level_functions,
        },
        "warnings": warnings,
        "errors": errors,
    }

    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print("DiceBound runtime architecture validation")
        print(f"  modules: {report['moduleCount']} ({report['extractedModuleCount']} extracted, {report['monolithModuleCount']} monolith)")
        if monolith_id:
            print(f"  monolith: {monolith_lines:,} lines / {monolith_bytes:,} bytes")
            print(f"  repeated named functions (advisory): {len(duplicate_functions)}")
            print(
                "  duplicate top-level function declarations (strict): "
                f"{len(duplicate_top_level_functions)}"
            )
        for warning in warnings:
            print(f"  WARNING: {warning}")
        if errors:
            for error in errors:
                print(f"  ERROR: {error}", file=sys.stderr)
        else:
            print("  PASS: load order, dependencies and public-global ownership are consistent")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
