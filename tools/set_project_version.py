#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from dicebound_version import require_supported_version

ROOT = Path(__file__).resolve().parents[1]


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def replace_exactly_once(text: str, pattern: str, replacement: str, label: str) -> str:
    count = len(re.findall(pattern, text))
    if count != 1:
        raise SystemExit(f"VERSION STAMP FAILED: expected exactly one {label}, found {count}")
    return re.sub(pattern, lambda _match: replacement, text, count=1)


def write_stamped(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def stamp_runtime_index(index: str, version: str, channel: str) -> str:
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
    return replace_exactly_once(
        index,
        r"<p>[A-Za-z][A-Za-z0-9 -]{0,31} v\d+(?:\.\d+){2,3}(?=\s*·)",
        f"<p>{channel} v{version}",
        "runtime subtitle",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Stamp DiceBound release-facing version metadata.")
    parser.add_argument("--version", required=True)
    parser.add_argument("--channel", required=True)
    args = parser.parse_args()

    version = args.version.strip()
    channel = args.channel.strip()
    if not version or not channel:
        raise SystemExit("version and channel must be non-empty")
    try:
        version = require_supported_version(version)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9 -]{0,31}", channel):
        raise SystemExit(f"invalid release channel: {channel!r}")

    project_path = ROOT / "wrapper-source" / "config" / "project.json"
    project = json.loads(project_path.read_text(encoding="utf-8"))
    project["version"] = version
    project["channel"] = channel
    project["releaseCommand"] = "Build-DiceBoundRelease.ps1"
    module_manifest = json.loads((ROOT / "runtime" / "js" / "module-manifest.json").read_text(encoding="utf-8"))
    modules = {str(module["id"]): module for module in module_manifest.get("modules", [])}
    project["runtimeScripts"] = [str(modules[module_id]["path"]) for module_id in module_manifest.get("loadOrder", [])]
    project["versionIdentity"] = "runtime/js/version.js"
    project["versionValidation"] = "tools/validate_version_identity.py"
    project["versionPolicy"] = "MAJOR.MINOR.PATCH.REVISION; historical three-component metadata remains readable"
    project["releaseIdentityGenerator"] = "tools/prepare_release.py"
    index_path = ROOT / "runtime" / "index.html"
    index = index_path.read_text(encoding="utf-8")
    display = f"Dicebound: {channel} v{version}"
    index = stamp_runtime_index(index, version, channel)

    runtime_identity_path = ROOT / "runtime" / "js" / "version.js"
    runtime_identity = runtime_identity_path.read_text(encoding="utf-8")
    runtime_identity = replace_exactly_once(
        runtime_identity,
        r'const VERSION="[^"]+";',
        f'const VERSION="{version}";',
        "central runtime version",
    )
    runtime_identity = replace_exactly_once(
        runtime_identity,
        r'const CHANNEL="[^"]+";',
        f'const CHANNEL="{channel}";',
        "central runtime channel",
    )
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
        r'messageBox\((?:"Dicebound Beta [^"]+"|appTitle), err\.Error\(\)\+"\\n\\nNative wrapper log:\\n"\+logPath\)',
        'messageBox(appTitle, err.Error()+"\\n\\nNative wrapper log:\\n"+logPath)',
        "native fatal dialog title",
    )
    wrapper = replace_exactly_once(
        wrapper,
        r'Frontend ready handshake received for Beta [^"]+\.',
        f'Frontend ready handshake received for {channel} {version}.',
        "native ready log version",
    )
    wrapper = replace_exactly_once(
        wrapper,
        r'Starting Dicebound [A-Za-z]+ [0-9][^ ]* native WebView2 wrapper\.',
        f'Starting Dicebound {channel} {version} native WebView2 wrapper.',
        "native startup log version",
    )
    wrapper = replace_exactly_once(
        wrapper,
        r'index\.html\?diceboundNative=1&v=[^&"]+&build=',
        f'index.html?diceboundNative=1&v={version}&build=',
        "native runtime URL version",
    )
    # Materialize only after every strict replacement has succeeded. A failed
    # stamp must never leave a partially updated project/runtime/native tree.
    write_json(project_path, project)
    write_stamped(index_path, index)
    write_stamped(runtime_identity_path, runtime_identity)
    write_stamped(wrapper_path, wrapper)

    print(json.dumps({
        "version": version,
        "channel": channel,
        "displayTitle": display,
        "project": str(project_path.relative_to(ROOT)),
        "runtime": str(index_path.relative_to(ROOT)),
        "runtimeIdentity": str(runtime_identity_path.relative_to(ROOT)),
        "wrapper": str(wrapper_path.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
