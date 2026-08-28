#!/usr/bin/env python3
"""Derive generic release spec, notes and workflow outputs from Version/Channel."""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

from dicebound_version import release_tag, require_supported_version


ROOT = Path(__file__).resolve().parents[1]
DIAGNOSTIC_BRANCH = "fix/0.6.4.20-playtest-followups"


def diagnostic_monolith_context(root: Path) -> None:
    """Temporary CI-only probe for monolith-owned playtest follow-ups."""
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_HEAD_REF") != DIAGNOSTIC_BRANCH:
        return
    source = (root / "runtime" / "js" / "dicebound.js").read_text(encoding="utf-8")
    lines = source.splitlines()
    probes = [
        ("IMPOSSIBLE", re.compile(r"Impossible|impossible"), 80),
        ("RELIC", re.compile(r"Relic|relic"), 80),
        ("PREFIX_SUFFIX_UI", re.compile(r"Prefix|Suffix|prefix|suffix"), 100),
        ("POISON", re.compile(r"poison", re.I), 140),
        ("TARGET_SELECTION", re.compile(r"selected(?:Enemy|Target)|targetIndex|enemyIndex|currentTarget", re.I), 140),
    ]
    print("=== DICEBOUND 0.6.4.20 MONOLITH DIAGNOSTIC ===")
    for label, rx, limit in probes:
        print(f"\n--- {label} ---")
        found = 0
        for index, line in enumerate(lines):
            if not rx.search(line):
                continue
            found += 1
            if found > limit:
                print(f"... truncated after {limit} matches ...")
                break
            lo = max(0, index - 3)
            hi = min(len(lines), index + 4)
            print(f"\n[{label} match {found} @ line {index + 1}]")
            for cursor in range(lo, hi):
                marker = ">" if cursor == index else " "
                print(f"{marker}{cursor + 1}: {lines[cursor]}")
        if found == 0:
            print("(no matches)")
    raise SystemExit("Diagnostic probe complete; inspect CI log before materializing Beta 0.6.4.20.")


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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--version")
    parser.add_argument("--channel")
    parser.add_argument("--output-dir", type=Path, default=Path("wrapper-source/release/generated"))
    parser.add_argument("--github-output", type=Path)
    args = parser.parse_args()

    root = args.root.resolve()
    diagnostic_monolith_context(root)
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
