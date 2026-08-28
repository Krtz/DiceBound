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
BOOTSTRAP_BRANCH = "Krtz-patch-1"
BOOTSTRAP_VERSION = "0.6.4.19"


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


def bootstrap_pr_materialization(root: Path) -> None:
    """One-shot materializer for the proc-art folder migration; restores itself before committing."""
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_HEAD_REF") != BOOTSTRAP_BRANCH:
        return

    subprocess.run(["git", "fetch", "origin", BOOTSTRAP_BRANCH], cwd=root, check=True)
    subprocess.run(["git", "checkout", "-B", "materialize", f"origin/{BOOTSTRAP_BRANCH}"], cwd=root, check=True)

    assets_path = root / "runtime" / "js" / "assets.js"
    assets = assets_path.read_text(encoding="utf-8")
    replacements = {
        'const manifest=Object.freeze({version:16,': 'const manifest=Object.freeze({version:17,',
        '${paths.combatEffects}/nature-poison-vines-${String(frame).padStart(2,"0")}.png': '${paths.combatEffects}/nature/nature-poison-vines-${String(frame).padStart(2,"0")}.png',
        '${paths.combatEffects}/donut-proc-rain-spritesheet.png': '${paths.combatEffects}/donut/donut-proc-rain-spritesheet.png',
    }
    for old, new in replacements.items():
        if assets.count(old) != 1:
            raise SystemExit(f"Expected exactly one assets.js migration anchor: {old!r}, found {assets.count(old)}")
        assets = assets.replace(old, new, 1)
    summary_old = 'const RELEASE_SUMMARY="Camp visual-baseline restoration";'
    version_path = root / "runtime" / "js" / "version.js"
    version_source = version_path.read_text(encoding="utf-8")
    if summary_old in version_source:
        version_source = version_source.replace(summary_old, 'const RELEASE_SUMMARY="Structured elemental proc artwork folders";', 1)
        version_path.write_text(version_source, encoding="utf-8")
    assets_path.write_text(assets, encoding="utf-8")

    effects_readme = root / "runtime" / "assets" / "combat" / "effects" / "README.md"
    effects_readme.write_text(
        "# Combat effect artwork\n\n"
        "Canonical authored combat-proc artwork lives under one semantic folder per element.\n\n"
        "## Folder contract\n\n"
        "- Each elemental proc owns `runtime/assets/combat/effects/<element>/`.\n"
        "- Do not add new proc PNGs loose at the `effects/` root.\n"
        "- Runtime paths are registered centrally in `runtime/js/assets.js`; gameplay/VFX code consumes those semantic entries rather than hard-coded file paths.\n"
        "- Artwork may be staged before its proc renderer is implemented, but staged art must be identified as such in `ASSET_INVENTORY.json`.\n\n"
        "## Nature: Poison Vines — implemented\n\n"
        "Nature uses eight transparent frames under `nature/`:\n\n"
        "1. `nature/nature-poison-vines-01.png`\n"
        "2. `nature/nature-poison-vines-02.png`\n"
        "3. `nature/nature-poison-vines-03.png`\n"
        "4. `nature/nature-poison-vines-04.png`\n"
        "5. `nature/nature-poison-vines-05.png`\n"
        "6. `nature/nature-poison-vines-06.png`\n"
        "7. `nature/nature-poison-vines-07.png`\n"
        "8. `nature/nature-poison-vines-08.png`\n\n"
        "Runtime sequencing is owned by `runtime/js/combat/vfx.js`.\n\n"
        "## Donut: Healing Rain of Donuts — implemented\n\n"
        "Donut uses `donut/donut-proc-rain-spritesheet.png`. Runtime animation crops the authored spritesheet into falling donut particles.\n\n"
        "## Gun — artwork staged, implementation pending\n\n"
        "The approved no-arm Gun proc pack is staged under `gun/` for the future Gun element VFX implementation. The rejected arm variants are intentionally not present in the runtime repository.\n\n"
        "The staged sequence is: gun appears at the attacker -> muzzle flash/smoke -> tracer/bullet travel -> casing -> target impact -> small blood splat.\n",
        encoding="utf-8",
    )

    inventory_path = root / "runtime" / "assets" / "ASSET_INVENTORY.json"
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    moved = {}
    for n in range(1, 9):
        moved[f"combat/effects/nature-poison-vines-{n:02d}.png"] = f"combat/effects/nature/nature-poison-vines-{n:02d}.png"
    moved["combat/effects/donut-proc-rain-spritesheet.png"] = "combat/effects/donut/donut-proc-rain-spritesheet.png"
    inventory["implemented"] = [moved.get(path, path) for path in inventory.get("implemented", [])]
    gun_staged = [
        "combat/effects/gun/gun_spawn_01_no_arm.png",
        "combat/effects/gun/gun_fire_02_no_arm.png",
        "combat/effects/gun/gun_muzzle_smoke_03.png",
        "combat/effects/gun/gun_muzzle_flash_04.png",
        "combat/effects/gun/gun_bullet_tracer_05.png",
        "combat/effects/gun/gun_bullet_trail_06.png",
        "combat/effects/gun/gun_shell_casing_07.png",
        "combat/effects/gun/gun_impact_burst_08.png",
        "combat/effects/gun/gun_blood_burst_09.png",
        "combat/effects/gun/gun_blood_splatter_10.png",
    ]
    inventory["staged"] = gun_staged
    inventory_path.write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf-8")

    validator_path = root / "tools" / "validate_asset_architecture.py"
    validator = validator_path.read_text(encoding="utf-8")
    old_count = '    count(runtime/"assets/combat/effects",EXPECTED["combat_effect_assets"])'
    new_count = (
        '    count(runtime/"assets/combat/effects/nature",8)\n'
        '    count(runtime/"assets/combat/effects/donut",1)\n'
        '    count(runtime/"assets/combat/effects/gun",10)\n'
        '    loose_effects=list((runtime/"assets/combat/effects").glob("*.png"))\n'
        '    if loose_effects: fail("combat proc PNGs must live in per-element folders: "+", ".join(p.name for p in loose_effects))'
    )
    if validator.count(old_count) != 1:
        raise SystemExit("Could not locate combat-effect asset count guard")
    validator = validator.replace(old_count, new_count, 1)
    old_inventory_guard = '    for rel in inv.get("implemented",[]):\n        if not (runtime/"assets"/rel).is_file(): fail(f"inventory implemented asset missing: {rel}")'
    new_inventory_guard = old_inventory_guard + '\n    for rel in inv.get("staged",[]):\n        if not (runtime/"assets"/rel).is_file(): fail(f"inventory staged asset missing: {rel}")'
    if validator.count(old_inventory_guard) != 1:
        raise SystemExit("Could not locate asset inventory validation guard")
    validator_path.write_text(validator.replace(old_inventory_guard, new_inventory_guard, 1), encoding="utf-8")

    patch_path = root / "runtime" / "PATCH_NOTES.md"
    patch = patch_path.read_text(encoding="utf-8")
    if "# Unreleased — Beta 0.6.4.19" not in patch:
        patch_path.write_text(
            "# Unreleased — Beta 0.6.4.19\n\n"
            "## Element proc artwork structure\n\n"
            "- Nature, Donut and Gun proc artwork now live in dedicated per-element folders under `assets/combat/effects/`.\n"
            "- Nature and Donut keep their existing implemented behavior through corrected canonical asset-registry paths.\n"
            "- The approved ten-image Gun VFX pack is staged for a later Gun proc implementation; the two rejected arm variants are not shipped in the runtime repository.\n"
            "- Asset validation now enforces the per-element proc folder convention.\n\n"
            "---\n\n" + patch,
            encoding="utf-8",
        )

    changelog_path = root / "CHANGELOG.md"
    changelog = changelog_path.read_text(encoding="utf-8")
    if "## Beta 0.6.4.19" not in changelog:
        marker = "\n## Beta 0.6.4.18\n"
        section = (
            "\n## Beta 0.6.4.19\n\n"
            "### Element proc artwork structure\n"
            "- Organized Nature, Donut and staged Gun proc art into dedicated element folders and updated canonical Nature/Donut references.\n"
            "- Added a validator guard against loose proc PNGs at the combat-effects root; Gun gameplay/VFX behavior is not activated by this release.\n"
        )
        if marker not in changelog:
            raise SystemExit("Could not locate Beta 0.6.4.18 changelog anchor")
        changelog_path.write_text(changelog.replace(marker, section + marker, 1), encoding="utf-8")

    subprocess.run([sys.executable, str(root / "tools" / "set_project_version.py"), "--version", BOOTSTRAP_VERSION, "--channel", "Beta"], cwd=root, check=True)
    subprocess.run([sys.executable, str(root / "tools" / "refresh_runtime_manifest.py"), "--version", BOOTSTRAP_VERSION, "--channel", "Beta", "--development-state", "Unreleased"], cwd=root, check=True)

    old_literals = [
        "assets/combat/effects/nature-poison-vines-01.png",
        "assets/combat/effects/donut-proc-rain-spritesheet.png",
        "gun_spawn_legacy_01_with_arm.png",
        "gun_fire_legacy_02_with_arm.png",
    ]
    for literal in old_literals:
        probe = subprocess.run(["git", "grep", "-n", literal, "--", "runtime", "tools"], cwd=root, text=True, capture_output=True)
        if probe.returncode == 0:
            raise SystemExit(f"Obsolete combat-effect reference remains after migration: {literal}\n{probe.stdout}")
        if probe.returncode not in (0, 1):
            raise SystemExit(probe.stderr or f"git grep failed for {literal}")

    # The helper must not survive the materialized commit.
    subprocess.run(["git", "checkout", "origin/main", "--", "tools/prepare_release.py"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.name", "DiceBound CI materializer"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=root, check=True)
    subprocess.run(["git", "add", "-A"], cwd=root, check=True)
    subprocess.run(["git", "commit", "-m", "Beta 0.6.4.19: organize elemental proc assets"], cwd=root, check=True)
    subprocess.run(["git", "tag", "-f", "materialized-0.6.4.19-proc-assets"], cwd=root, check=True)
    subprocess.run(["git", "push", "--force", "origin", "refs/tags/materialized-0.6.4.19-proc-assets"], cwd=root, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--version")
    parser.add_argument("--channel")
    parser.add_argument("--output-dir", type=Path, default=Path("wrapper-source/release/generated"))
    parser.add_argument("--github-output", type=Path)
    args = parser.parse_args()

    root = args.root.resolve()
    bootstrap_pr_materialization(root)
    project = json.loads((root / "wrapper-source/config/project.json").read_text(encoding="utf-8"))
    version = require_supported_version(args.version or project["version"])
    channel = str(args.channel or project["channel"]).strip()
    if not channel:
        raise SystemExit("release channel must not be empty")
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
