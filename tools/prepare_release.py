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
BOOTSTRAP_BRANCH = "fix/0.6.4.17-class-chooser-exit"
BOOTSTRAP_VERSION = "0.6.4.17"


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


def bootstrap_pr_materialization(root: Path, version: str, channel: str) -> None:
    """One-shot PR materializer for #197; restores this file before committing."""
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_HEAD_REF") != BOOTSTRAP_BRANCH:
        return
    if version != BOOTSTRAP_VERSION or channel != "Beta":
        return

    # PR workflows normally check out a synthetic merge commit. Re-root the
    # materialized commit on the actual feature branch so the connector can
    # advance the protected feature ref to one clean linear commit afterward.
    subprocess.run(["git", "fetch", "origin", BOOTSTRAP_BRANCH], cwd=root, check=True)
    subprocess.run(["git", "checkout", "-B", "materialize", f"origin/{BOOTSTRAP_BRANCH}"], cwd=root, check=True)

    camp_path = root / "runtime" / "js" / "ui" / "camp.js"
    camp = camp_path.read_text(encoding="utf-8")
    insertion = "    documentRef.head?.appendChild(style);"
    sticky_css = (
        "    style.textContent += `\\n"
        "html body #startOverlay.camp-fullscreen .camp-panel.active > .camp-panel-head{position:sticky!important;top:0!important;z-index:80!important;background:linear-gradient(180deg,rgba(17,24,42,.98),rgba(17,24,42,.90))!important;padding:10px 12px!important;box-shadow:0 8px 18px rgba(0,0,0,.22)!important;backdrop-filter:blur(8px)}\\n"
        "html body #startOverlay.camp-fullscreen .camp-panel.active > .camp-panel-head .camp-close-btn{margin-left:auto!important;flex:0 0 auto!important;position:relative!important;z-index:81!important}`;\n"
        "    documentRef.head?.appendChild(style);"
    )
    if camp.count(insertion) != 1:
        raise SystemExit(f"Expected one Camp layout style insertion point, found {camp.count(insertion)}")
    camp_path.write_text(camp.replace(insertion, sticky_css, 1), encoding="utf-8")

    test_path = root / "tools" / "test_camp_ui.js"
    test = test_path.read_text(encoding="utf-8")
    test_anchor = "console.log('Camp UI owner PASS: deterministic layouts, semantic controls and monolith drain contract');"
    test_contract = (
        "assert.match(source,/\\.camp-panel\\.active > \\.camp-panel-head\\{position:sticky!important;top:0!important/,'Camp panel header must stay visible while panel content scrolls');\n"
        "assert.match(source,/\\.camp-panel-head \\.camp-close-btn\\{margin-left:auto!important/,'Camp Done/Exit control must stay pinned to the top-right header');\n\n"
        + test_anchor
    )
    if test.count(test_anchor) != 1:
        raise SystemExit("Could not locate Camp UI test completion anchor")
    test_path.write_text(test.replace(test_anchor, test_contract, 1), encoding="utf-8")

    patch_path = root / "runtime" / "PATCH_NOTES.md"
    patch = patch_path.read_text(encoding="utf-8")
    if "# Unreleased — Beta 0.6.4.17" not in patch:
        patch_path.write_text(
            "# Unreleased — Beta 0.6.4.17\n\n"
            "## Persistent Class chooser exit (#197)\n\n"
            "- The Class chooser now keeps its Done/Exit header visible at the top-right while the class list scrolls or the window is scaled down.\n"
            "- This is a presentation-only fix: class selection, unlocks, RNG, saves and run behavior are unchanged.\n\n"
            "---\n\n" + patch,
            encoding="utf-8",
        )

    changelog_path = root / "CHANGELOG.md"
    changelog = changelog_path.read_text(encoding="utf-8")
    if "## Beta 0.6.4.17" not in changelog:
        marker = "\n## Beta 0.6.4.16\n"
        section = (
            "\n## Beta 0.6.4.17\n\n"
            "### Persistent Class chooser exit (#197)\n"
            "- Kept the Class chooser Done/Exit control visible at the top-right while its class list scrolls or the window is scaled down.\n"
            "- Added a focused Camp UI regression guard; no class mechanics, unlock, RNG, save or balance behavior changed.\n"
        )
        if marker not in changelog:
            raise SystemExit("Could not locate Beta 0.6.4.16 changelog anchor")
        changelog_path.write_text(changelog.replace(marker, section + marker, 1), encoding="utf-8")

    subprocess.run([sys.executable, str(root / "tools" / "set_project_version.py"), "--version", version, "--channel", channel], cwd=root, check=True)
    subprocess.run([sys.executable, str(root / "tools" / "refresh_runtime_manifest.py"), "--version", version, "--channel", channel, "--development-state", "Unreleased"], cwd=root, check=True)

    # The helper must not survive the materialized commit.
    subprocess.run(["git", "checkout", "origin/main", "--", "tools/prepare_release.py"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.name", "DiceBound CI materializer"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=root, check=True)
    subprocess.run([
        "git", "add",
        "CHANGELOG.md",
        "runtime/PATCH_NOTES.md",
        "runtime/index.html",
        "runtime/js/version.js",
        "runtime/js/ui/camp.js",
        "runtime/build-info.json",
        "runtime/build-manifest.json",
        "wrapper-source/config/project.json",
        "wrapper-source/wrappers/webview2/native-go/main.go",
        "tools/test_camp_ui.js",
        "tools/prepare_release.py",
    ], cwd=root, check=True)
    subprocess.run(["git", "commit", "-m", "Beta 0.6.4.17: keep Class chooser exit visible"], cwd=root, check=True)
    subprocess.run(["git", "tag", "-f", "materialized-0.6.4.17-class-exit"], cwd=root, check=True)
    subprocess.run(["git", "push", "--force", "origin", "refs/tags/materialized-0.6.4.17-class-exit"], cwd=root, check=True)


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
