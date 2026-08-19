#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def replace_exactly_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, lambda _match: replacement, text, count=1)
    if count != 1:
        raise SystemExit(f"VERSION STAMP FAILED: expected exactly one {label}, found {count}")
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Stamp DiceBound release-facing version metadata.")
    parser.add_argument("--version", required=True)
    parser.add_argument("--channel", default="Beta")
    args = parser.parse_args()

    version = args.version.strip()
    channel = args.channel.strip()
    if not version or not channel:
        raise SystemExit("version and channel must be non-empty")

    project_path = ROOT / "wrapper-source" / "config" / "project.json"
    project = json.loads(project_path.read_text(encoding="utf-8"))
    project["version"] = version
    project["channel"] = channel
    project["releaseCommand"] = "Build-DiceBoundRelease.ps1"
    write_json(project_path, project)

    index_path = ROOT / "runtime" / "index.html"
    index = index_path.read_text(encoding="utf-8")
    display = f"Dicebound: {channel} v{version}"
    index = replace_exactly_once(
        index,
        r"<title>Dicebound: [^<]+</title>",
        f"<title>{display}</title>",
        "runtime <title>",
    )
    index = replace_exactly_once(
        index,
        r"<h1>Dicebound: [^<]+</h1>",
        f"<h1>{display}</h1>",
        "runtime <h1>",
    )
    index_path.write_text(index, encoding="utf-8")

    wrapper_path = ROOT / "wrapper-source" / "wrappers" / "webview2" / "native-go" / "main.go"
    wrapper = wrapper_path.read_text(encoding="utf-8")
    wrapper = replace_exactly_once(
        wrapper,
        r'appTitle\s*=\s*"Dicebound: [^"]+"',
        f'appTitle       = "{display}"',
        "native appTitle",
    )
    wrapper = replace_exactly_once(
        wrapper,
        r'messageBox\("Dicebound Beta [^"]+", err\.Error\(\)\+"\\n\\nNative wrapper log:\\n"\+logPath\)',
        'messageBox(appTitle, err.Error()+"\\n\\nNative wrapper log:\\n"+logPath)',
        "native fatal dialog title",
    )
    wrapper = replace_exactly_once(
        wrapper,
        r'Frontend ready handshake received for Beta [^"]+\.',
        f'Frontend ready handshake received for {channel} {version}.',
        "native ready log version",
    )
    wrapper_path.write_text(wrapper, encoding="utf-8")

    changelog_path = ROOT / "CHANGELOG.md"
    changelog = changelog_path.read_text(encoding="utf-8")
    old_heading = "## Unreleased — post-Beta 0.6 Git development"
    if old_heading in changelog and version == "0.6.1" and channel == "Beta":
        changelog = changelog.replace(
            old_heading,
            "## Beta 0.6.1 — Runtime Packaging & Asset Architecture",
            1,
        )
        changelog_path.write_text(changelog, encoding="utf-8")

    print(json.dumps({
        "version": version,
        "channel": channel,
        "displayTitle": display,
        "project": str(project_path.relative_to(ROOT)),
        "runtime": str(index_path.relative_to(ROOT)),
        "wrapper": str(wrapper_path.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
