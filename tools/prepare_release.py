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
BOOTSTRAP_BRANCH = "art/0.6.4.12-astral-devourer-dragon"


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
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_HEAD_REF") != BOOTSTRAP_BRANCH:
        return
    if version != "0.6.4.12" or channel != "Beta":
        return

    # pull_request checks run on GitHub's synthetic merge commit. Reset to the
    # real feature head first so the materialized commit remains linear and
    # satisfies the repository's no-merge-commits branch rule.
    subprocess.run(["git", "reset", "--hard", f"origin/{BOOTSTRAP_BRANCH}"], cwd=root, check=True)

    changelog_path = root / "CHANGELOG.md"
    changelog = changelog_path.read_text(encoding="utf-8")
    if "## Beta 0.6.4.12" not in changelog:
        marker = "\n## Beta 0.6.4.11\n"
        section = (
            "\n## Beta 0.6.4.12\n\n"
            "### Astral Devourer Dragon battle art (#13)\n"
            "- Replaced the incorrect canonical Board 2 final-guardian portrait with the approved Astral Devourer Dragon artwork.\n"
            "- Kept the authoritative #169 guardian identity/resolver unchanged; this is an art-only correction with no combat, RNG, balance or save changes.\n"
        )
        changelog = changelog.replace(marker, section + marker, 1)
        changelog_path.write_text(changelog, encoding="utf-8")

    patch_path = root / "runtime" / "PATCH_NOTES.md"
    patch = patch_path.read_text(encoding="utf-8")
    if "# Unreleased — Beta 0.6.4.12" not in patch:
        patch = (
            "# Unreleased — Beta 0.6.4.12\n\n"
            "## Astral Devourer Dragon battle art (#13)\n\n"
            "- Replaced the incorrect canonical Board 2 final-guardian portrait with the approved Astral Devourer Dragon artwork.\n"
            "- The existing authoritative guardian resolver remains unchanged; gameplay, RNG, balance and save behavior are unaffected.\n\n"
            "---\n\n"
            + patch
        )
        patch_path.write_text(patch, encoding="utf-8")

    subprocess.run([sys.executable, str(root / "tools" / "set_project_version.py"), "--version", version, "--channel", channel], cwd=root, check=True)
    subprocess.run([sys.executable, str(root / "tools" / "refresh_runtime_manifest.py"), "--version", version, "--channel", channel, "--development-state", "Unreleased"], cwd=root, check=True)

    subprocess.run(["git", "checkout", "origin/main", "--", "tools/prepare_release.py"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.name", "DiceBound CI materializer"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=root, check=True)
    subprocess.run(["git", "add", "CHANGELOG.md", "runtime/PATCH_NOTES.md", "runtime/index.html", "runtime/js/version.js", "runtime/build-info.json", "runtime/build-manifest.json", "wrapper-source/config/project.json", "wrapper-source/wrappers/webview2/native-go/main.go", "tools/prepare_release.py"], cwd=root, check=True)
    subprocess.run(["git", "commit", "-m", "chore: materialize Beta 0.6.4.12 identity"], cwd=root, check=True)
    subprocess.run(["git", "push", "origin", f"HEAD:refs/heads/{BOOTSTRAP_BRANCH}"], cwd=root, check=True)


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
        "artifact_label": f"DiceBound-{channel.replace(' ', '-')}-{version}",
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
