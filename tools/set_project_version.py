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
    count = len(re.findall(pattern, text))
    if count != 1:
        raise SystemExit(f"VERSION STAMP FAILED: expected exactly one {label}, found {count}")
    return re.sub(pattern, lambda _match: replacement, text, count=1)


def write_stamped(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


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
    index = replace_exactly_once(
        index,
        r"<p>[A-Za-z]+ v[^<]+ · explicit Artifact table, generated Legendary effects, new gear budgets and guardian loot cleanup\.</p>",
        f"<p>{channel} v{version} · explicit Artifact table, generated Legendary effects, new gear budgets and guardian loot cleanup.</p>",
        "runtime subtitle",
    )
    write_stamped(index_path, index)

    wrapper_contract_path = ROOT / "runtime" / "js" / "wrapper-contract.js"
    wrapper_contract = wrapper_contract_path.read_text(encoding="utf-8")
    wrapper_contract = replace_exactly_once(
        wrapper_contract,
        r'const APP_VERSION = "[^"]+";',
        f'const APP_VERSION = "{version}";',
        "wrapper contract app version",
    )
    write_stamped(wrapper_contract_path, wrapper_contract)

    save_system_path = ROOT / "runtime" / "js" / "save-system.js"
    save_system = save_system_path.read_text(encoding="utf-8")
    save_system = replace_exactly_once(
        save_system,
        r'const GAME_VERSION="[^"]+";',
        f'const GAME_VERSION="{version}";',
        "save envelope game version",
    )
    write_stamped(save_system_path, save_system)

    platform_path = ROOT / "runtime" / "js" / "platform.js"
    platform = platform_path.read_text(encoding="utf-8")
    platform = replace_exactly_once(
        platform,
        r'appVersion:wrapper\?\.appVersion\|\|"[^"]+"',
        f'appVersion:wrapper?.appVersion||"{version}"',
        "platform app version fallback",
    )
    platform = replace_exactly_once(
        platform,
        r'channel:metadata\?\.channel\|\|"[^"]+"',
        f'channel:metadata?.channel||"{channel}"',
        "platform channel fallback",
    )
    platform = replace_exactly_once(
        platform,
        r'wrapper\?\.diagnostics\?\.\(\)\|\|Object\.freeze\(\{contractVersion:1,appVersion:"[^"]+"',
        f'wrapper?.diagnostics?.()||Object.freeze({{contractVersion:1,appVersion:"{version}"',
        "platform diagnostics app version fallback",
    )
    write_stamped(platform_path, platform)

    native_host_path = ROOT / "runtime" / "js" / "native-http-host.js"
    native_host = native_host_path.read_text(encoding="utf-8")
    native_host = replace_exactly_once(
        native_host,
        r'wrapperVersion:"[^"]+"',
        f'wrapperVersion:"{version}"',
        "native host wrapper version",
    )
    native_host = replace_exactly_once(
        native_host,
        r'channel:"[^"]+"',
        f'channel:"{channel}"',
        "native host channel",
    )
    native_host = replace_exactly_once(
        native_host,
        r'appVersion:"[^"]+"',
        f'appVersion:"{version}"',
        "native host app version",
    )
    native_host = replace_exactly_once(
        native_host,
        r'JSON\.stringify\(\{version:"[^"]+"',
        f'JSON.stringify({{version:"{version}"',
        "native host ready version",
    )
    write_stamped(native_host_path, native_host)

    game_path = ROOT / "runtime" / "js" / "dicebound.js"
    game = game_path.read_text(encoding="utf-8")
    game = replace_exactly_once(
        game,
        r"document\.title='Dicebound: [A-Za-z]+ v[^']+';\n  const db060Brand=",
        f"document.title='{display}';\n  const db060Brand=",
        "final runtime document title",
    )
    game = replace_exactly_once(
        game,
        r"const db060Brand=document\.querySelector\('\.brand h1'\);if\(db060Brand\)db060Brand\.textContent='Dicebound: [^']+';",
        f"const db060Brand=document.querySelector('.brand h1');if(db060Brand)db060Brand.textContent='{display}';",
        "final runtime heading",
    )
    game = replace_exactly_once(
        game,
        r"const db060Sub=document\.querySelector\('\.brand p'\);if\(db060Sub\)db060Sub\.textContent='[A-Za-z]+ v[^']+ · explicit Artifact tables, generated Legendary effects, new gear budgets and guardian loot cleanup\.';",
        f"const db060Sub=document.querySelector('.brand p');if(db060Sub)db060Sub.textContent='{channel} v{version} · explicit Artifact tables, generated Legendary effects, new gear budgets and guardian loot cleanup.';",
        "final runtime subtitle",
    )
    game = replace_exactly_once(
        game,
        r"window\.DiceboundInfrastructure=Object\.freeze\(\{version:'[^']+'",
        f"window.DiceboundInfrastructure=Object.freeze({{version:'{version}'",
        "runtime infrastructure version",
    )
    write_stamped(game_path, game)

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
    write_stamped(wrapper_path, wrapper)

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

    patch_notes_path = ROOT / "runtime" / "PATCH_NOTES.md"
    patch_notes = patch_notes_path.read_text(encoding="utf-8")
    patch_notes_heading = "# Unreleased — post-Beta 0.6 Git development"
    if patch_notes_heading in patch_notes and version == "0.6.1" and channel == "Beta":
        patch_notes = patch_notes.replace(
            patch_notes_heading,
            "# Beta 0.6.1 — Runtime Packaging & Asset Architecture",
            1,
        )
        write_stamped(patch_notes_path, patch_notes)

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
