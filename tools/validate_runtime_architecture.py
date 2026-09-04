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
    achievements_module = by_id.get("ui-achievements")
    achievements_owner_ok = False
    if not achievements_module:
        errors.append("Achievements presentation owner ui-achievements is missing from the runtime manifest")
    else:
        achievements_owner_ok = (
            achievements_module.get("path") == "js/ui/achievements.js"
            and {"progression-achievements", "ui-camp"}.issubset(
                set(achievements_module.get("requires") or [])
            )
            and "DiceboundAchievementsUi" in (achievements_module.get("provides") or [])
            and position.get("ui-achievements", -1) < position.get(str(monolith_id), -1)
        )
        if not achievements_owner_ok:
            errors.append(
                "ui-achievements must provide DiceboundAchievementsUi, require progression/Camp dependencies, "
                "and load before the monolith"
            )
    achievements_source = sources.get("ui-achievements", "")
    for required_achievements_behavior in [
        "const OWNER='ui/achievements'",
        "data-achievements-done",
        "achievements-chrome{position:sticky",
        "function viewModel(",
        "function createDetails(",
    ]:
        if required_achievements_behavior not in achievements_source:
            errors.append(
                "Achievements owner is missing required presentation behavior: "
                + required_achievements_behavior
            )
    if monolith_source:
        expected_achievements_adapter = "function renderAchievements(){return dbAchievementsUi.render();}"
        if expected_achievements_adapter not in monolith_source:
            errors.append("dicebound.js must retain only the thin Achievements lifecycle adapter")
        for retired_achievements_layer in [
            "renderAchievements=function",
            "renderAchievementsV",
            "achievementGrid",
            "achievementCloseBtn",
            "DiceboundAchievementHierarchyTest",
            "db064RenderAchievementsBase",
            "db064AchievementCard",
            "db064AchievementDetails",
            "db0512RenderAchievementsBase",
            "db060RenderAchievementsBase",
        ]:
            if retired_achievements_layer in monolith_source:
                errors.append(
                    "retired Achievements presentation implementation remains in dicebound.js: "
                    + retired_achievements_layer
                )
    for retired_achievements_style in [
        ".achievement-grid{",
        ".achievement-group{",
        ".achievement.secret-locked{",
    ]:
        if retired_achievements_style in stylesheet_source:
            errors.append(
                "retired Achievements style remains in runtime/css/dicebound.css: "
                + retired_achievements_style
            )
    info_guide_module = by_id.get("ui-info-guide")
    info_guide_owner_ok = False
    if not info_guide_module:
        errors.append("Info/Guide presentation owner ui-info-guide is missing from the runtime manifest")
    else:
        info_guide_owner_ok = (
            info_guide_module.get("path") == "js/ui/info-guide.js"
            and {"assets", "classes-registry", "ui-camp"}.issubset(
                set(info_guide_module.get("requires") or [])
            )
            and "DiceboundInfoGuide" in (info_guide_module.get("provides") or [])
            and position.get("ui-info-guide", -1) < position.get(str(monolith_id), -1)
        )
        if not info_guide_owner_ok:
            errors.append(
                "ui-info-guide must provide DiceboundInfoGuide, require its UI dependencies, "
                "and load before the monolith"
            )
    info_guide_source = sources.get("ui-info-guide", "")
    for required_info_guide_behavior in [
        "const OWNER='ui/info-guide'",
        "data-info-done",
        "info-guide-chrome{position:sticky",
        "function guideHtml(",
        "function lifetimeModel(",
    ]:
        if required_info_guide_behavior not in info_guide_source:
            errors.append(
                "Info/Guide owner is missing required presentation behavior: "
                + required_info_guide_behavior
            )
    if monolith_source:
        for expected_info_guide_adapter in [
            "renderInfo=function(){return dbInfoGuide.render();};",
            "renderLifetimeStats=function(){return dbInfoGuide.renderStats();};",
            "activateInfoTab=function(name='guide'){return dbInfoGuide.activateTab(name);};",
            "openInfo=function(){return dbInfoGuide.open();};",
        ]:
            if expected_info_guide_adapter not in monolith_source:
                errors.append("dicebound.js must retain only the thin Info/Guide lifecycle adapter")
        for retired_info_guide_layer in ["db060RenderInfoBase", "renderInfoV28Base"]:
            if retired_info_guide_layer in monolith_source:
                errors.append(
                    "retired final Info/Guide renderer remains in dicebound.js: "
                    + retired_info_guide_layer
                )
    for retired_info_guide_style in [
        ".info-tabs{display:grid",
        ".info-tab-panel{display:none}",
        ".lifetime-stats{display:grid",
        ".info-sections{display:grid",
    ]:
        if retired_info_guide_style in stylesheet_source:
            errors.append(
                "retired Info/Guide style remains in runtime/css/dicebound.css: "
                + retired_info_guide_style
            )
    for retired_info_guide_markup in ["id=\"infoCloseBtn\"", "id=\"infoSections\"", "id=\"infoTabs\""]:
        if retired_info_guide_markup in index_source:
            errors.append(
                "runtime/index.html retains static Info/Guide presentation markup: "
                + retired_info_guide_markup
            )
    equipment_ui_module = by_id.get("ui-equipment-heirlooms")
    equipment_ui_owner_ok = False
    if not equipment_ui_module:
        errors.append("equipment/Heirloom presentation owner ui-equipment-heirlooms is missing from the runtime manifest")
    else:
        equipment_ui_owner_ok = (
            equipment_ui_module.get("path") == "js/ui/equipment-heirlooms.js"
            and {"assets", "item-equipment", "ui-camp"}.issubset(
                set(equipment_ui_module.get("requires") or [])
            )
            and "DiceboundEquipmentHeirlooms" in (equipment_ui_module.get("provides") or [])
            and position.get("ui-equipment-heirlooms", -1) < position.get(str(monolith_id), -1)
        )
        if not equipment_ui_owner_ok:
            errors.append(
                "ui-equipment-heirlooms must provide DiceboundEquipmentHeirlooms, require its item/Camp dependencies, "
                "and load before the monolith"
            )
    equipment_ui_source = sources.get("ui-equipment-heirlooms", "")
    for required_equipment_ui_behavior in [
        "const OWNER='ui/equipment-heirlooms'",
        "function renderEquipment()",
        "function renderLoot(item)",
        "function renderCampStorage()",
        "function renderEndGear()",
        "db-equipment-slot-art",
        "db-equipment-loot-art",
    ]:
        if required_equipment_ui_behavior not in equipment_ui_source:
            errors.append(
                "equipment/Heirloom UI owner is missing required presentation behavior: "
                + required_equipment_ui_behavior
            )
    if monolith_source:
        for expected_equipment_ui_adapter in [
            "function renderEquipment(){\n    beta043RefreshEquipmentArt?.();return dbEquipmentUi.renderEquipment();\n  }",
            "function renderEndGear(){\n    return dbEquipmentUi.renderEndGear();\n  }",
            "function openLoot(item,callback){if(!dbEquipmentPrepareLoot(item,callback))return;pendingLootItem=item;pendingLootCallback=callback;return dbEquipmentUi.renderLoot(item);}",
        ]:
            if expected_equipment_ui_adapter not in monolith_source:
                errors.append("dicebound.js must retain only the thin equipment/Heirloom UI lifecycle adapters")
        for retired_equipment_ui_layer in [
            "renderEquipment=function",
            "renderEndGear=function",
            "openLoot=function",
            "renderEquipmentV110Base",
            "renderEquipmentV23Base",
            "renderEquipmentV24Base",
            "v24RenderHeirloomStorage",
            "v25RenderEndStorageManager",
            "db06314RenderEquipmentBase",
            "db06314OpenLootBase",
            "dicebound-06314-equipment-identity-style",
        ]:
            if retired_equipment_ui_layer in monolith_source:
                errors.append(
                    "retired equipment/Heirloom presentation implementation remains in dicebound.js: "
                    + retired_equipment_ui_layer
                )
    options_module = by_id.get("ui-options")
    options_owner_ok = False
    if not options_module:
        errors.append("Options/settings presentation owner ui-options is missing from the runtime manifest")
    else:
        options_owner_ok = (
            options_module.get("path") == "js/ui/options.js"
            and "DiceboundOptionsUi" in (options_module.get("provides") or [])
            and position.get("ui-options", -1) < position.get(str(monolith_id), -1)
        )
        if not options_owner_ok:
            errors.append(
                "ui-options must provide DiceboundOptionsUi and load before the monolith"
            )
    options_source = sources.get("ui-options", "")
    for required_options_behavior in [
        "const OWNER='ui/options'",
        "data-options-done",
        "options-chrome{position:sticky",
        "function ensureTopAction(",
        "function sync(",
    ]:
        if required_options_behavior not in options_source:
            errors.append(
                "Options/settings owner is missing required presentation behavior: "
                + required_options_behavior
            )
    if monolith_source:
        for expected_options_adapter in [
            "const dbOptionsUi=window.DiceboundOptionsUi?.configure({",
            "dbOptionsUi?.ensureTopAction?.();",
            "dbOptionsUi?.sync?.();",
            "function beta042EnsureCampOptions(){return window.DiceboundCamp?.ensureOptionsButton();}",
        ]:
            if expected_options_adapter not in monolith_source:
                errors.append("dicebound.js must retain only the documented Options/settings lifecycle adapters")
        for retired_options_layer in [
            "function beta042EnsureOptionsOverlay(",
            "function beta042SyncOptionsMenu(",
            "function beta042OpenOptions(",
            "function beta042CloseOptions(",
            "function beta042EnsureTopOptions(",
            ".options-grid{display:grid",
            ".options-actions{display:flex",
        ]:
            if retired_options_layer in monolith_source:
                errors.append(
                    "retired Options/settings presentation implementation remains in dicebound.js: "
                    + retired_options_layer
                )
    board_movement_module = by_id.get("board-movement")
    board_movement_owner_ok = False
    if not board_movement_module:
        errors.append("Board movement owner board-movement is missing from the runtime manifest")
    else:
        board_movement_owner_ok = (
            board_movement_module.get("path") == "js/board/movement.js"
            and "board-registry" in (board_movement_module.get("requires") or [])
            and "DiceboundBoardMovement" in (board_movement_module.get("provides") or [])
            and position.get("board-movement", -1) < position.get(str(monolith_id), -1)
        )
        if not board_movement_owner_ok:
            errors.append(
                "board-movement must provide DiceboundBoardMovement, require board-registry, and load before the monolith"
            )
    board_movement_source = sources.get("board-movement", "")
    for required_board_movement_behavior in [
        "const OWNER='board/movement'",
        "function planMove(",
        "async function move(",
        "Loaded Sixes",
        "Pale Devil",
        "runtime.dispatchTile?.()",
    ]:
        if required_board_movement_behavior not in board_movement_source:
            errors.append(
                "Board movement owner is missing required behavior: "
                + required_board_movement_behavior
            )
    if monolith_source:
        for expected_board_movement_adapter in [
            "const dbBoardMovement=window.DiceboundBoardMovement?.configure({",
            "board:dbBoardMovement.state",
            "await dbBoardMovement.move(",
        ]:
            if expected_board_movement_adapter not in monolith_source:
                errors.append("dicebound.js must use the board-movement composition owner")
        for retired_board_movement_layer in [
            "const BoardState=Object.freeze({",
            "const BoardUI=Object.freeze({",
            "async function movePlayer(",
            "const movePlayerV25LoadedBase=movePlayer;",
            "const movePlayerV26DevilBase=movePlayer;",
            "const db060MovePlayerBase=movePlayer;",
        ]:
            if retired_board_movement_layer in monolith_source:
                errors.append(
                    "retired board movement implementation remains in dicebound.js: "
                    + retired_board_movement_layer
                )
    board_tile_dispatch_module = by_id.get("board-tile-dispatch")
    board_tile_dispatch_owner_ok = False
    if not board_tile_dispatch_module:
        errors.append("Board tile-dispatch owner board-tile-dispatch is missing from the runtime manifest")
    else:
        board_tile_dispatch_owner_ok = (
            board_tile_dispatch_module.get("path") == "js/board/tile-dispatch.js"
            and "board-registry" in (board_tile_dispatch_module.get("requires") or [])
            and "DiceboundBoardTileDispatch" in (board_tile_dispatch_module.get("provides") or [])
            and position.get("board-tile-dispatch", -1) < position.get(str(monolith_id), -1)
        )
        if not board_tile_dispatch_owner_ok:
            errors.append(
                "board-tile-dispatch must provide DiceboundBoardTileDispatch, require board-registry, and load before the monolith"
            )
    board_tile_dispatch_source = sources.get("board-tile-dispatch", "")
    for required_board_tile_dispatch_behavior in [
        "const OWNER='board/tile-dispatch'",
        "const KNOWN_TILE_TYPES=Object.freeze(",
        "function recoverUnknown(",
        "function dispatchKnown(",
        "function dispatch()",
        "devilboss",
        "merchantBossPrimed",
    ]:
        if required_board_tile_dispatch_behavior not in board_tile_dispatch_source:
            errors.append(
                "Board tile-dispatch owner is missing required behavior: "
                + required_board_tile_dispatch_behavior
            )
    if monolith_source:
        for expected_board_tile_dispatch_adapter in [
            "const dbBoardTileDispatch=window.DiceboundBoardTileDispatch?.configure({",
            "dispatchTile:()=>dbBoardTileDispatch.dispatch()",
            "dbBoardTileDispatch.dispatch()",
            "trace:(name,work)=>v25TraceCommand(name,work,'detailed')",
        ]:
            if expected_board_tile_dispatch_adapter not in monolith_source:
                errors.append("dicebound.js must use the board-tile-dispatch composition owner")
        for retired_board_tile_dispatch_layer in [
            "function resolveTile(",
            "const resolveTileV24Base=resolveTile;",
            "const resolveTileV25SafetyBase=resolveTile;",
            "else if(name==='resolveTile')resolveTile=wrapped;",
            "['rollDice','rollTwoDice','resolveTile','returnToRoad'",
        ]:
            if retired_board_tile_dispatch_layer in monolith_source:
                errors.append(
                    "retired board tile-dispatch implementation remains in dicebound.js: "
                    + retired_board_tile_dispatch_layer
                )
    board_generation_module = by_id.get("board-generation")
    board_generation_owner_ok = False
    if not board_generation_module:
        errors.append("Board generation owner board-generation is missing from the runtime manifest")
    else:
        board_generation_owner_ok = (
            board_generation_module.get("path") == "js/board/generation.js"
            and "board-registry" in (board_generation_module.get("requires") or [])
            and "DiceboundBoardGeneration" in (board_generation_module.get("provides") or [])
            and position.get("board-generation", -1) < position.get(str(monolith_id), -1)
        )
        if not board_generation_owner_ok:
            errors.append(
                "board-generation must provide DiceboundBoardGeneration, require board-registry, and load before the monolith"
            )
    board_generation_source = sources.get("board-generation", "")
    for required_board_generation_behavior in [
        "const OWNER='board/generation'",
        "function buildRoad(",
        "function applyBoardSixFirstPass(",
        "function applyPaleDevil(",
        "function applyBoardFourFivePass046(",
        "function applyBoardFourFivePass047(",
        "function generate()",
    ]:
        if required_board_generation_behavior not in board_generation_source:
            errors.append(
                "Board generation owner is missing required behavior: "
                + required_board_generation_behavior
            )
    if monolith_source:
        for expected_board_generation_adapter in [
            "const dbBoardGeneration=window.DiceboundBoardGeneration?.configure({",
            "function enemyForPosition(index){return dbBoardGeneration.enemyForPosition(index);}",
            "function generateBoard(){return dbBoardGeneration.generate();}",
        ]:
            if expected_board_generation_adapter not in monolith_source:
                errors.append("dicebound.js must use the board-generation composition owner")
        for retired_board_generation_layer in [
            "function drawSpecialIndexes(",
            "function plannedPackSize(",
            "const generateBoardV15=generateBoard;",
            "const generateBoardV11=generateBoard;",
            "const generateBoardV12=generateBoard;",
            "const generateBoardV19Base=generateBoard;",
            "const v235GenerateBoardBase=generateBoard;",
            "const generateBoardV24Base=generateBoard;",
            "const generateBoardV25DevilBase=generateBoard;",
            "const db046GenerateBoardBase=generateBoard;",
            "const db047GenerateBoardBase=generateBoard;",
            "generateBoard=function",
        ]:
            if retired_board_generation_layer in monolith_source:
                errors.append(
                    "retired board generation implementation remains in dicebound.js: "
                    + retired_board_generation_layer
                )
    board_transition_module = by_id.get("board-transition")
    board_transition_owner_ok = False
    if not board_transition_module:
        errors.append("Board transition owner board-transition is missing from the runtime manifest")
    else:
        board_transition_owner_ok = (
            board_transition_module.get("path") == "js/board/transition.js"
            and "board-registry" in (board_transition_module.get("requires") or [])
            and "DiceboundBoardTransition" in (board_transition_module.get("provides") or [])
            and position.get("board-transition", -1) < position.get(str(monolith_id), -1)
        )
        if not board_transition_owner_ok:
            errors.append(
                "board-transition must provide DiceboundBoardTransition, require board-registry, and load before the monolith"
            )
    board_transition_source = sources.get("board-transition", "")
    for required_board_transition_behavior in [
        "const OWNER='board/transition'",
        "function entryRecovery(",
        "function advance()",
        "definition?.id===6",
        "runtime.completeFinalRoad?.()",
        "runtime.schedule?.(unlockMovement,350)",
    ]:
        if required_board_transition_behavior not in board_transition_source:
            errors.append(
                "Board transition owner is missing required behavior: "
                + required_board_transition_behavior
            )
    if monolith_source:
        for expected_board_transition_adapter in [
            "const dbBoardTransition=window.DiceboundBoardTransition?.configure({",
            "function advanceToNextBoard(){return dbBoardTransition.advance();}",
            "completeFinalRoad:()=>dbRunCompletion.completeFinalRoad()",
        ]:
            if expected_board_transition_adapter not in monolith_source:
                errors.append("dicebound.js must use the board-transition composition owner")
        for retired_board_transition_layer in [
            "advanceToNextBoard=function",
            "const advanceToNextBoardV15Patch=advanceToNextBoard;",
            "const advanceToNextBoardV16Base=advanceToNextBoard;",
            "const v235AdvanceBase=advanceToNextBoard;",
            "function v19BoardName(",
        ]:
            if retired_board_transition_layer in monolith_source:
                errors.append(
                    "retired board-transition implementation remains in dicebound.js: "
                    + retired_board_transition_layer
                )
    run_lifecycle_module = by_id.get("run-lifecycle")
    run_lifecycle_owner_ok = False
    if not run_lifecycle_module:
        errors.append("Run lifecycle owner run-lifecycle is missing from the runtime manifest")
    else:
        run_lifecycle_owner_ok = (
            run_lifecycle_module.get("path") == "js/run/lifecycle.js"
            and {"run-checkpoint", "board-generation", "board-transition"}.issubset(
                set(run_lifecycle_module.get("requires") or [])
            )
            and "DiceboundRunLifecycle" in (run_lifecycle_module.get("provides") or [])
            and position.get("run-lifecycle", -1) < position.get(str(monolith_id), -1)
        )
        if not run_lifecycle_owner_ok:
            errors.append(
                "run-lifecycle must provide DiceboundRunLifecycle, require checkpoint/generation/transition, and load before the monolith"
            )
    run_lifecycle_source = sources.get("run-lifecycle", "")
    for required_run_lifecycle_behavior in [
        "const OWNER='run/lifecycle'",
        "const FRESH_RUN_SURFACES=Object.freeze(",
        "function startFreshRun(options={})",
        "runtime.clearCheckpoint?.();runtime.seedNewRun?.();",
        "runtime.generateBoard?.();runtime.buildBoard?.();",
        "runtime.recordFreshRunStarted?.();runtime.updateHud?.();",
        "runtime.afterClassStart?.({wasRandom,chosen,context});runtime.scheduleCheckpoint?.();",
    ]:
        if required_run_lifecycle_behavior not in run_lifecycle_source:
            errors.append(
                "Run lifecycle owner is missing required behavior: "
                + required_run_lifecycle_behavior
            )
    if "Math.random" in run_lifecycle_source:
        errors.append("run-lifecycle must not consume RNG through Math.random")
    for forbidden_run_lifecycle_behavior in ["function restore", "function resume", "function resetPlayer("]:
        if forbidden_run_lifecycle_behavior in run_lifecycle_source:
            errors.append(
                "run-lifecycle must not absorb checkpoint restore or player-mechanics ownership: "
                + forbidden_run_lifecycle_behavior
            )
    if monolith_source:
        for expected_run_lifecycle_adapter in [
            "const dbRunLifecycle=window.DiceboundRunLifecycle?.configure({",
            "function startNewGame(){return dbRunLifecycle.startFreshRun();}",
            "dbRunLifecycle.startFreshRun({beforeFreshRun:()=>{",
        ]:
            if expected_run_lifecycle_adapter not in monolith_source:
                errors.append("dicebound.js must use the run-lifecycle composition owner")
        for retired_run_lifecycle_layer in [
            "const startNewGameV15=startNewGame;",
            "const startNewGameV16GuardReset=startNewGame;",
            "const startNewGameV19Base=startNewGame;",
            "const startNewGameV27Base=startNewGame;",
            "const startNewGameV28Base=startNewGame;",
            "const dbRunStartBase=startNewGame;",
            "startNewGame=function",
        ]:
            if retired_run_lifecycle_layer in monolith_source:
                errors.append(
                    "retired run-lifecycle implementation remains in dicebound.js: "
                    + retired_run_lifecycle_layer
                )
    run_completion_module = by_id.get("run-completion")
    run_completion_owner_ok = False
    if not run_completion_module:
        errors.append("Run completion owner run-completion is missing from the runtime manifest")
    else:
        run_completion_owner_ok = (
            run_completion_module.get("path") == "js/run/completion.js"
            and {"run-checkpoint", "run-lifecycle", "board-transition"}.issubset(
                set(run_completion_module.get("requires") or [])
            )
            and "DiceboundRunCompletion" in (run_completion_module.get("provides") or [])
            and position.get("run-completion", -1) < position.get(str(monolith_id), -1)
        )
        if not run_completion_owner_ok:
            errors.append(
                "run-completion must provide DiceboundRunCompletion, require checkpoint/lifecycle/transition, and load before the monolith"
            )
    run_completion_source = sources.get("run-completion", "")
    for required_run_completion_behavior in [
        "const OWNER='run/completion'",
        "function completeFinalRoad()",
        "runtime.clearCheckpoint?.();",
        "if(runtime.isCompleting?.())",
        "runtime.setRunState?.({gameStarted:false,rollLocked:true});",
        "const earned=Number(runtime.finalizeRun?.())||0;",
        "runtime.presentTerminalEnd?.(detail);",
        "if(first)runtime.recordFirstCompletion?.(detail);",
        "runtime.afterCompletion?.(detail);",
    ]:
        if required_run_completion_behavior not in run_completion_source:
            errors.append(
                "Run completion owner is missing required behavior: "
                + required_run_completion_behavior
            )
    if "Math.random" in run_completion_source:
        errors.append("run-completion must not consume RNG through Math.random")
    for forbidden_run_completion_behavior in [
        "function finalizeRun(",
        "function dbRunRestore(",
        "function openCombatLootChain(",
        "function renderEndGear(",
    ]:
        if forbidden_run_completion_behavior in run_completion_source:
            errors.append(
                "run-completion must coordinate existing owners rather than absorb "
                + forbidden_run_completion_behavior
            )
    if monolith_source:
        for expected_run_completion_adapter in [
            "const dbRunCompletion=window.DiceboundRunCompletion?.configure({",
            "completeFinalRoad:()=>dbRunCompletion.completeFinalRoad()",
            "function completeSixthRoadV19(){return dbRunCompletion.completeFinalRoad();}",
        ]:
            if expected_run_completion_adapter not in monolith_source:
                errors.append("dicebound.js must use the run-completion composition owner")
        for retired_run_completion_layer in [
            "const showEndV15Patch=showEnd;",
            "function completeFifthRoadV16()",
            "v16FifthRoadCompleting",
            "const completeSixthRoadV28Base=completeSixthRoadV19;",
            "const dbRunCompleteFifthBase=completeFifthRoadV16;",
            "const dbRunCompleteSixthBase=completeSixthRoadV19;",
        ]:
            if retired_run_completion_layer in monolith_source:
                errors.append(
                    "retired run-completion implementation remains in dicebound.js: "
                    + retired_run_completion_layer
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
        "achievementsOwner": {
            "id": "ui-achievements",
            "configured": achievements_owner_ok,
        },
        "infoGuideOwner": {
            "id": "ui-info-guide",
            "configured": info_guide_owner_ok,
        },
        "equipmentHeirloomUiOwner": {
            "id": "ui-equipment-heirlooms",
            "configured": equipment_ui_owner_ok,
        },
        "optionsOwner": {
            "id": "ui-options",
            "configured": options_owner_ok,
        },
        "boardMovementOwner": {
            "id": "board-movement",
            "configured": board_movement_owner_ok,
        },
        "boardTileDispatchOwner": {
            "id": "board-tile-dispatch",
            "configured": board_tile_dispatch_owner_ok,
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
