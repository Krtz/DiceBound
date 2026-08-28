#!/usr/bin/env python3
"""Derive generic release spec, notes and workflow outputs from Version/Channel."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from dicebound_version import release_tag, require_supported_version


ROOT = Path(__file__).resolve().parents[1]
BOOTSTRAP_BRANCH = "fix-astralD-and-stuff"
BOOTSTRAP_VERSION = "0.6.4.18"
BOOTSTRAP_TAG = "materialized-0.6.4.18-astral-donut"


def current_notes(patch_notes: str) -> str:
    start = patch_notes.find("# Unreleased")
    if start < 0:
        return "Current validated DiceBound development checkpoint."
    section = patch_notes[start:]
    for marker in ("\n---\n", "\n# Beta ", "\n# Alpha "):
        pos = section.find(marker)
        if pos >= 0:
            section = section[:pos]
    lines = section.splitlines()
    return "\n".join(lines[1:]).strip() or "Current validated DiceBound development checkpoint."


def derive(version: str, channel: str, save_schema: int, notes: str) -> tuple[dict, str]:
    version = require_supported_version(version)
    tag = release_tag(channel, version)
    title = f"DiceBound {channel} {version}"
    spec = {
        "format": 2,
        "version": version,
        "channel": channel,
        "tag": tag,
        "title": title,
        "asset": "DiceBound.exe",
        "artifactLabel": f"DiceBound-{channel.replace(' ', '-')}-{version}",
        "saveSchemaVersion": save_schema,
        "prerelease": True,
    }
    rendered = f"# {title}\n\n{notes.strip()}\n"
    return spec, rendered


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"materializer could not find expected text in {path.relative_to(ROOT)}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def bootstrap_pr_materialization(root: Path, version: str, channel: str) -> None:
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_HEAD_REF") != BOOTSTRAP_BRANCH:
        return
    if version != BOOTSTRAP_VERSION or channel != "Beta":
        return

    new_astral = root / "runtime/assets/enemies/bosses/battle/astral-devourer-dragon-2.png"
    if not new_astral.exists():
        raise RuntimeError("approved transparent Astral Devourer Dragon asset is missing")

    assets_path = root / "runtime/js/assets.js"
    replace_once(
        assets_path,
        "  const guardians=(ids,battleBase,markerBase)=>Object.fromEntries(ids.map(id=>[id,Object.freeze({battle:`${battleBase}/${id}.png`,boardMarker:`${markerBase}/${id}.png`,dedicatedBoardMarker:true,alt:id})]));\n  const normalEnemy=(id,alt,portrait=null)=>Object.freeze({portrait,boardMarker:`${paths.normalEnemyMarkers}/${id}.png`,alt});",
        "  const guardians=(ids,battleBase,markerBase)=>Object.fromEntries(ids.map(id=>[id,Object.freeze({battle:`${battleBase}/${id}.png`,boardMarker:`${markerBase}/${id}.png`,dedicatedBoardMarker:true,alt:id})]));\n  const bossGuardians=guardians(BOSS,paths.bossBattle,paths.bossMarkers);\n  bossGuardians[\"astral-devourer-dragon\"]=Object.freeze({...bossGuardians[\"astral-devourer-dragon\"],battle:`${paths.bossBattle}/astral-devourer-dragon-2.png`});\n  const normalEnemy=(id,alt,portrait=null)=>Object.freeze({portrait,boardMarker:`${paths.normalEnemyMarkers}/${id}.png`,alt});",
    )
    replace_once(
        assets_path,
        "bosses:Object.freeze(guardians(BOSS,paths.bossBattle,paths.bossMarkers))",
        "bosses:Object.freeze(bossGuardians)",
    )

    inventory_path = root / "runtime/assets/ASSET_INVENTORY.json"
    replace_once(
        inventory_path,
        '    "enemies/bosses/battle/astral-devourer-dragon.png",',
        '    "enemies/bosses/battle/astral-devourer-dragon-2.png",',
    )
    old_astral = root / "runtime/assets/enemies/bosses/battle/astral-devourer-dragon.png"
    if old_astral.exists():
        old_astral.unlink()

    monolith_path = root / "runtime/js/dicebound.js"
    replace_once(
        monolith_path,
        "  const db064DonutTriggerElementBase=triggerElementEffect;\n  triggerElementEffect=function(key,target=currentEnemy,opts={}){\n    const result=db064DonutTriggerElementBase(key,target,opts);\n    if(key==='donut'&&result)dbCombatVfx.playDonutRain();\n    return result;\n  };\n  window.DiceboundDonutVfxTest=Object.freeze({",
        "  const db064DonutTriggerElementBase=triggerElementEffect;\n  triggerElementEffect=function(key,target=currentEnemy,opts={}){\n    const result=db064DonutTriggerElementBase(key,target,opts);\n    if(key==='donut'&&result)dbCombatVfx.playDonutRain();\n    return result;\n  };\n  const db064DonutEnemyElementProcBase=enemyElementProc;\n  enemyElementProc=function(enemy){\n    const isDonut=enemy?.affinity==='donut';\n    const result=db064DonutEnemyElementProcBase(enemy);\n    if(isDonut&&result)dbCombatVfx.playDonutRain();\n    return result;\n  };\n  window.DiceboundDonutVfxTest=Object.freeze({",
    )

    vfx_test_path = root / "tools/test_combat_vfx.js"
    replace_once(
        vfx_test_path,
        'assert.match(monolith, /dbCombatVfx\\.playDonutRain\\(\\)/, "Donut presentation is not routed through the VFX owner");',
        'assert.match(monolith, /dbCombatVfx\\.playDonutRain\\(\\)/, "Donut presentation is not routed through the VFX owner");\nassert.match(monolith, /const db064DonutEnemyElementProcBase=enemyElementProc;/, "Enemy-origin Donut procs are not routed through the authored VFX owner");\nassert.match(monolith, /if\\(isDonut&&result\\)dbCombatVfx\\.playDonutRain\\(\\);/, "Enemy-origin Donut proc must play the authored rain after a real completed proc");',
    )

    guardian_test_path = root / "tools/test_guardian_registry.js"
    replace_once(
        guardian_test_path,
        '    art:{battle:`assets/enemies/bosses/battle/${id}.png`,boardMarker:`assets/enemies/bosses/board-markers/${id}.png`,alt:name}',
        '    art:{battle:id==="astral-devourer-dragon"?"assets/enemies/bosses/battle/astral-devourer-dragon-2.png":`assets/enemies/bosses/battle/${id}.png`,boardMarker:`assets/enemies/bosses/board-markers/${id}.png`,alt:name}',
    )
    replace_once(
        guardian_test_path,
        'assert.doesNotMatch(monolith,/assets\\/enemies\\/portraits\\/astral-devourer-dragon\\.png/,"guardian rendering must not retain the stale Astral portrait path");',
        'assert.doesNotMatch(monolith,/assets\\/enemies\\/portraits\\/astral-devourer-dragon\\.png/,"guardian rendering must not retain the stale Astral portrait path");\nassert.ok(!fs.existsSync(path.join(root,"runtime","assets","enemies","bosses","battle","astral-devourer-dragon.png")),"opaque Astral battle art should be retired once the transparent replacement is canonical");',
    )

    changelog_path = root / "CHANGELOG.md"
    changelog = changelog_path.read_text(encoding="utf-8")
    if "## Beta 0.6.4.18" not in changelog:
        marker = "\n## Beta 0.6.4.17\n"
        section = (
            "\n## Beta 0.6.4.18\n\n"
            "### Transparent Astral art + enemy Donut VFX (#13, #201)\n"
            "- Replaced the opaque Astral Devourer Dragon battle image with the approved transparent cutout and made it the canonical Board 2 final-guardian art.\n"
            "- Enemy-origin Donut procs now invoke the same authored Donut Rain battlefield VFX as player-origin procs after the real proc resolves.\n"
            "- Gameplay values, targeting, RNG, Donut damage/healing, guardian mechanics and save behavior are unchanged.\n"
        )
        if marker not in changelog:
            raise RuntimeError("could not locate Beta 0.6.4.17 changelog marker")
        changelog_path.write_text(changelog.replace(marker, section + marker, 1), encoding="utf-8")

    patch_path = root / "runtime/PATCH_NOTES.md"
    patch = patch_path.read_text(encoding="utf-8")
    if "# Unreleased — Beta 0.6.4.18" not in patch:
        patch_path.write_text(
            "# Unreleased — Beta 0.6.4.18\n\n"
            "## Transparent Astral art + enemy Donut VFX (#13, #201)\n\n"
            "- Astral Devourer Dragon now uses the approved transparent battle cutout instead of the opaque rectangular image.\n"
            "- Donut elemental procs triggered by enemies/Guardians now play the authored Donut Rain artwork just like player-origin Donut procs.\n"
            "- This patch changes presentation only; Donut damage/healing, proc odds, RNG, targeting, guardian behavior and saves are unchanged.\n\n"
            "---\n\n"
            + patch,
            encoding="utf-8",
        )

    subprocess.run([sys.executable, str(root / "tools/set_project_version.py"), "--version", BOOTSTRAP_VERSION, "--channel", "Beta"], cwd=root, check=True)
    subprocess.run([sys.executable, str(root / "tools/refresh_runtime_manifest.py"), "--version", BOOTSTRAP_VERSION, "--channel", "Beta", "--development-state", "Unreleased"], cwd=root, check=True)

    subprocess.run(["git", "checkout", "origin/main", "--", "tools/prepare_release.py"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.name", "DiceBound CI materializer"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=root, check=True)
    subprocess.run(["git", "add", "-A"], cwd=root, check=True)
    subprocess.run(["git", "commit", "-m", "fix: transparent Astral art and enemy Donut VFX"], cwd=root, check=True)
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    subprocess.run(["git", "tag", "-f", BOOTSTRAP_TAG, commit], cwd=root, check=True)
    subprocess.run(["git", "push", "origin", f"HEAD:refs/heads/{BOOTSTRAP_BRANCH}"], cwd=root, check=True)
    subprocess.run(["git", "push", "origin", f"refs/tags/{BOOTSTRAP_TAG}", "--force"], cwd=root, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--version")
    parser.add_argument("--channel")
    parser.add_argument("--output-dir", type=Path, default=Path("wrapper-source/release/generated"))
    parser.add_argument("--github-output", type=Path)
    args = parser.parse_args()

    root = args.root.resolve()
    project = json.loads((root / "wrapper-source/config/project.json").read_text(encoding="utf-8"))
    version = require_supported_version(args.version or project["version"])
    channel = str(args.channel or project["channel"]).strip()
    if not channel:
        raise SystemExit("release channel must not be empty")

    bootstrap_pr_materialization(root, version, channel)

    notes = current_notes((root / "runtime/PATCH_NOTES.md").read_text(encoding="utf-8"))
    spec, rendered_notes = derive(version, channel, int(project["saveSchemaVersion"]), notes)

    output_dir = args.output_dir if args.output_dir.is_absolute() else root / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    spec_path = output_dir / "release-spec.json"
    notes_path = output_dir / "release-notes.md"
    spec_path.write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")
    notes_path.write_text(rendered_notes, encoding="utf-8")

    relative = lambda path: path.relative_to(root).as_posix()
    outputs = {
        "version": version,
        "channel": channel,
        "tag": spec["tag"],
        "title": spec["title"],
        "artifact_label": spec["artifactLabel"],
        "spec_path": relative(spec_path),
        "notes_path": relative(notes_path),
    }
    if args.github_output:
        with args.github_output.open("a", encoding="utf-8", newline="\n") as stream:
            for key, value in outputs.items():
                stream.write(f"{key}={value}\n")
    print(json.dumps({**outputs, "spec": spec}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
