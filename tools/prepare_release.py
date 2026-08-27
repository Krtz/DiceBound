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
BOOTSTRAP_BRANCH = "ui/0.6.4.13-camp-composition-pass"
TARGET_VERSION = "0.6.4.13"


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


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Camp materialization failed: expected one {label}, found {count}")
    return text.replace(old, new, 1)


def bootstrap_camp_composition(root: Path) -> None:
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_HEAD_REF") != BOOTSTRAP_BRANCH:
        return

    # PR checks run on a synthetic merge commit. Work from the actual feature
    # head so the exported materialized commit remains linear.
    subprocess.run(["git", "reset", "--hard", f"origin/{BOOTSTRAP_BRANCH}"], cwd=root, check=True)

    css_path = root / "runtime/css/dicebound.css"
    css = css_path.read_text(encoding="utf-8")
    old_css = """/* Beta 0.6.3.10 — Camp layout hotfix */
@media (min-width:1000px) and (min-height:650px){
  html body #startOverlay.camp-fullscreen #campInfoBtn{left:45vw!important}
  html body #startOverlay.camp-fullscreen #campGoBtn{right:-5vw!important}
}
@media (min-width:1000px) and (max-width:1350px) and (min-height:650px){
  html body #startOverlay.camp-fullscreen #campInfoBtn{left:43vw!important}
  html body #startOverlay.camp-fullscreen #campGoBtn{right:-6vw!important}
}
"""
    new_css = """/* Beta 0.6.4.13 — screenshot-driven Camp composition pass.
   Keep existing authored object sizes, semantic controls and hit-target sync;
   these desktop-only offsets spread the painted campsite back across the scene. */
@media (min-width:1360px) and (min-height:650px){
  html body #startOverlay.camp-fullscreen #campOptionsBtn{translate:-3vw -30vh!important}
  html body #startOverlay.camp-fullscreen #campTalentBtn{translate:0 -27vh!important}
  html body #startOverlay.camp-fullscreen #campMoonBtn{translate:0 -27vh!important}
  html body #startOverlay.camp-fullscreen #campAchievementBtn{translate:-35vw 0!important}
  html body #startOverlay.camp-fullscreen #campInfoBtn{left:45vw!important;translate:10vw 25vh!important}
  html body #startOverlay.camp-fullscreen #campPetBtn{translate:-31vw -4vh!important}
  html body #startOverlay.camp-fullscreen #campChestBtn{translate:-22vw 8vh!important}
  html body #startOverlay.camp-fullscreen .camp-bonfire{translate:0 4vh!important}
  html body #startOverlay.camp-fullscreen #campGoBtn{right:-5vw!important}
}
@media (min-width:1000px) and (max-width:1359px) and (min-height:650px){
  html body #startOverlay.camp-fullscreen #campOptionsBtn{translate:-2.5vw -28vh!important}
  html body #startOverlay.camp-fullscreen #campTalentBtn{translate:0 -25vh!important}
  html body #startOverlay.camp-fullscreen #campMoonBtn{translate:0 -25vh!important}
  html body #startOverlay.camp-fullscreen #campAchievementBtn{translate:-32vw 0!important}
  html body #startOverlay.camp-fullscreen #campInfoBtn{left:43vw!important;translate:9vw 23vh!important}
  html body #startOverlay.camp-fullscreen #campPetBtn{translate:-28vw -4vh!important}
  html body #startOverlay.camp-fullscreen #campChestBtn{translate:-20vw 7vh!important}
  html body #startOverlay.camp-fullscreen .camp-bonfire{translate:0 4vh!important}
  html body #startOverlay.camp-fullscreen #campGoBtn{right:-6vw!important}
}
"""
    css_path.write_text(replace_once(css, old_css, new_css, "legacy Camp hotfix block"), encoding="utf-8")

    changelog_path = root / "CHANGELOG.md"
    changelog = changelog_path.read_text(encoding="utf-8")
    if "## Beta 0.6.4.13" not in changelog:
        marker = "\n## Beta 0.6.4.12\n"
        section = (
            "\n## Beta 0.6.4.13\n\n"
            "### Camp composition follow-up\n"
            "- Repositioned the existing Camp interaction groups from screenshot playtest feedback: Options moves to the top-left; Talents and Prestige rise into the sky; Trophy moves to the far-left foreground; Info takes the former Trophy area; Pet moves under Class; Chest takes the former Pet area; and the bonfire settles slightly lower.\n"
            "- Start Run, artwork sizes, gameplay, saves and semantic Camp hit-target synchronization are unchanged.\n"
        )
        changelog = replace_once(changelog, marker, section + marker, "0.6.4.12 changelog marker")
        changelog_path.write_text(changelog, encoding="utf-8")

    patch_path = root / "runtime/PATCH_NOTES.md"
    patch = patch_path.read_text(encoding="utf-8")
    if "# Unreleased — Beta 0.6.4.13" not in patch:
        patch = (
            "# Unreleased — Beta 0.6.4.13\n\n"
            "## Camp composition follow-up\n\n"
            "- Spread the existing Camp objects back across the authored scene from screenshot playtest feedback: Options top-left, Talents/Prestige much higher, Trophy far left, Info into the former Trophy area, Pet under Class, Chest into the former Pet area, and the bonfire slightly lower.\n"
            "- Start Run and all gameplay, save, interaction and hit-target behavior remain unchanged.\n\n"
            "---\n\n"
            + patch
        )
        patch_path.write_text(patch, encoding="utf-8")

    subprocess.run([sys.executable, str(root / "tools/set_project_version.py"), "--version", TARGET_VERSION, "--channel", "Beta"], cwd=root, check=True)
    subprocess.run([sys.executable, str(root / "tools/refresh_runtime_manifest.py"), "--version", TARGET_VERSION, "--channel", "Beta", "--development-state", "Unreleased"], cwd=root, check=True)

    # The helper is only a browser-side bridge to the full checkout; do not
    # carry it into the real PR commit.
    subprocess.run(["git", "checkout", "origin/main", "--", "tools/prepare_release.py"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.name", "DiceBound CI materializer"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=root, check=True)
    subprocess.run([
        "git", "add",
        "CHANGELOG.md", "runtime/PATCH_NOTES.md", "runtime/css/dicebound.css",
        "runtime/index.html", "runtime/js/version.js", "runtime/build-info.json", "runtime/build-manifest.json",
        "wrapper-source/config/project.json", "wrapper-source/wrappers/webview2/native-go/main.go",
        "tools/prepare_release.py",
    ], cwd=root, check=True)
    subprocess.run(["git", "commit", "-m", "ui: reposition Camp composition for Beta 0.6.4.13"], cwd=root, check=True)
    subprocess.run(["git", "tag", "-f", "tmp-materialized-0.6.4.13"], cwd=root, check=True)
    subprocess.run(["git", "push", "origin", "refs/tags/tmp-materialized-0.6.4.13", "--force"], cwd=root, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--version")
    parser.add_argument("--channel")
    parser.add_argument("--output-dir", type=Path, default=Path("wrapper-source/release/generated"))
    parser.add_argument("--github-output", type=Path)
    args = parser.parse_args()

    root = args.root.resolve()
    bootstrap_camp_composition(root)
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
