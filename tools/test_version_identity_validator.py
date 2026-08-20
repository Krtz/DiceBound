#!/usr/bin/env python3
"""Mutation tests proving the version-identity validator fails closed."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "tools" / "validate_version_identity.py"
PROJECT = json.loads((ROOT / "wrapper-source" / "config" / "project.json").read_text(encoding="utf-8"))
VERSION = str(PROJECT["version"])
CHANNEL = str(PROJECT["channel"])
TAG = f"{re.sub(r'[^a-z0-9]+', '-', CHANNEL.lower()).strip('-')}-{VERSION}"
assert re.fullmatch(r"\d+\.\d+\.\d+\.\d+", VERSION), f"new PR version must have four components: {VERSION}"


def make_fixture(parent: Path, name: str) -> Path:
    fixture = parent / name
    (fixture / "runtime").mkdir(parents=True)
    shutil.copytree(ROOT / "runtime" / "js", fixture / "runtime" / "js")
    for relative in [
        "runtime/index.html",
        "runtime/build-info.json",
        "runtime/build-manifest.json",
        "runtime/PATCH_NOTES.md",
        "wrapper-source/config/project.json",
        "wrapper-source/wrappers/webview2/native-go/main.go",
        "CHANGELOG.md",
    ]:
        source = ROOT / relative
        target = fixture / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    (fixture / "release-spec.json").write_text(json.dumps({
        "format": 2,
        "version": VERSION,
        "channel": CHANNEL,
        "tag": TAG,
        "title": f"DiceBound {CHANNEL} {VERSION}",
        "asset": "DiceBound.exe",
        "artifactLabel": f"DiceBound-{CHANNEL.replace(' ', '-')}-{VERSION}",
        "saveSchemaVersion": 2,
        "prerelease": True,
    }, indent=2) + "\n", encoding="utf-8")
    (fixture / "release-notes.md").write_text(f"# DiceBound {CHANNEL} {VERSION}\n\nGenerated test notes.\n", encoding="utf-8")
    return fixture


def run(fixture: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VALIDATOR), "--root", str(fixture), "--version", VERSION, "--channel", CHANNEL,
         "--release-spec", "release-spec.json", "--release-notes", "release-notes.md", *extra],
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def require_pass(fixture: Path, *extra: str) -> None:
    result = run(fixture, *extra)
    if result.returncode != 0:
        raise AssertionError(f"expected validator pass, got {result.returncode}:\n{result.stdout}")


def require_fail(fixture: Path, expected_text: str, *extra: str) -> None:
    result = run(fixture, *extra)
    if result.returncode == 0:
        raise AssertionError(f"expected validator failure after mutation:\n{result.stdout}")
    if expected_text not in result.stdout:
        raise AssertionError(f"failure did not mention {expected_text!r}:\n{result.stdout}")


with tempfile.TemporaryDirectory(prefix="dicebound-version-validator-") as temp:
    temp_root = Path(temp)

    baseline = make_fixture(temp_root, "baseline")
    require_pass(baseline)

    central = make_fixture(temp_root, "central-version-drift")
    identity_path = central / "runtime/js/version.js"
    identity_path.write_text(identity_path.read_text(encoding="utf-8").replace(f'const VERSION="{VERSION}";', 'const VERSION="0.0.0.0";', 1), encoding="utf-8")
    require_fail(central, "central runtime version")

    native = make_fixture(temp_root, "native-drift")
    native_path = native / "wrapper-source/wrappers/webview2/native-go/main.go"
    native_path.write_text(native_path.read_text(encoding="utf-8").replace(f"Frontend ready handshake received for {CHANNEL} {VERSION}.", "Frontend ready handshake received for Beta 0.0.0.0.", 1), encoding="utf-8")
    require_fail(native, "native wrapper")

    hardcoded = make_fixture(temp_root, "moved-hardcode")
    platform_path = hardcoded / "runtime/js/platform.js"
    platform_path.write_text(platform_path.read_text(encoding="utf-8") + '\nconst movedIdentity={appVersion:"0.5.8"};\n', encoding="utf-8")
    require_fail(hardcoded, "hardcoded release identity")

    dependency = make_fixture(temp_root, "missing-dependency")
    manifest_path = dependency / "runtime/js/module-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    platform_module = next(module for module in manifest["modules"] if module["id"] == "platform")
    platform_module["requires"].remove("version")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    require_fail(dependency, "consumes DiceboundVersion but does not require version")

    project_order = make_fixture(temp_root, "project-script-order")
    project_path = project_order / "wrapper-source/config/project.json"
    project = json.loads(project_path.read_text(encoding="utf-8"))
    project["runtimeScripts"] = list(reversed(project["runtimeScripts"]))
    project_path.write_text(json.dumps(project, indent=2) + "\n", encoding="utf-8")
    require_fail(project_order, "project runtimeScripts")

    release_spec = make_fixture(temp_root, "release-spec-drift")
    release_spec_path = release_spec / "release-spec.json"
    spec = json.loads(release_spec_path.read_text(encoding="utf-8"))
    spec["version"] = "0.0.0.0"
    release_spec_path.write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")
    require_fail(release_spec, "release spec version")

    distribution = make_fixture(temp_root, "distribution")
    build_info = json.loads((distribution / "runtime/build-info.json").read_text(encoding="utf-8"))
    metadata = {
        "format": 1,
        "version": VERSION,
        "channel": CHANNEL,
        "buildId": build_info["buildId"],
        "browserContentHash": build_info["browserContentHash"],
        "artifact": "DiceBound.exe",
        "sha256": "a" * 64,
        "bytes": 123456,
        "windowsTitle": f"Dicebound: {CHANNEL} v{VERSION}",
    }
    metadata_path = distribution / "release-metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    latest = {
        "format": 1,
        "name": "DiceBound",
        "version": VERSION,
        "channel": CHANNEL,
        "buildId": metadata["buildId"],
        "url": f"https://github.com/Krtz/DiceBound/releases/download/{TAG}/DiceBound.exe",
        "sha256": metadata["sha256"],
        "bytes": metadata["bytes"],
        "executable": "DiceBound.exe",
    }
    latest_path = distribution / "distribution/latest.json"
    latest_path.parent.mkdir(parents=True, exist_ok=True)
    latest_path.write_text(json.dumps(latest, indent=2) + "\n", encoding="utf-8")
    require_pass(distribution, "--release-metadata", "release-metadata.json", "--distribution", "distribution/latest.json")
    latest["bytes"] += 1
    latest_path.write_text(json.dumps(latest, indent=2) + "\n", encoding="utf-8")
    require_fail(distribution, "distribution bytes", "--release-metadata", "release-metadata.json", "--distribution", "distribution/latest.json")

print("Version identity validator mutation suite PASS: four-component central/runtime/native/module/release/distribution drift all fail closed")
