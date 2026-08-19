#!/usr/bin/env python3
"""Fail closed when DiceBound's release-facing version identity drifts."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


DEFAULT_ROOT = Path(__file__).resolve().parents[1]
SEMVER = r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?"


def read_json(path: Path, errors: list[str], label: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{label} could not be read: {exc}")
        return {}
    if not isinstance(value, dict):
        errors.append(f"{label} must contain a JSON object")
        return {}
    return value


def capture_once(source: str, pattern: str, errors: list[str], label: str) -> str | None:
    matches = re.findall(pattern, source, re.MULTILINE)
    if len(matches) != 1:
        errors.append(f"{label}: expected exactly one match, found {len(matches)}")
        return None
    return str(matches[0])


def expect(actual: object, expected: object, errors: list[str], label: str) -> None:
    if actual != expected:
        errors.append(f"{label}: expected {expected!r}, got {actual!r}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--version", help="expected semantic version; defaults to project.json")
    parser.add_argument("--channel", help="expected release channel; defaults to project.json")
    parser.add_argument("--release-metadata", type=Path, help="optional final build metadata to validate")
    parser.add_argument("--distribution", type=Path, help="optional launcher latest.json to reconcile with final metadata")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    root = args.root.resolve()
    errors: list[str] = []
    checks: list[str] = []
    project_path = root / "wrapper-source" / "config" / "project.json"
    project = read_json(project_path, errors, "project config")
    version = (args.version or str(project.get("version") or "")).strip()
    channel = (args.channel or str(project.get("channel") or "")).strip()
    if not re.fullmatch(SEMVER, version):
        errors.append(f"expected version is not semantic: {version!r}")
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9 -]{0,31}", channel):
        errors.append(f"expected channel is invalid: {channel!r}")
    display_title = f"Dicebound: {channel} v{version}"
    display_version = f"{channel} v{version}"
    tag = f"{re.sub(r'[^a-z0-9]+', '-', channel.lower()).strip('-')}-{version}"

    expect(project.get("version"), version, errors, "project version")
    expect(project.get("channel"), channel, errors, "project channel")
    expect(project.get("releaseCommand"), "Build-DiceBoundRelease.ps1", errors, "project release command")
    checks.append("project")

    runtime = root / "runtime"
    identity_path = runtime / "js" / "version.js"
    try:
        identity_source = identity_path.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"central runtime identity could not be read: {exc}")
        identity_source = ""
    runtime_version = capture_once(identity_source, rf'const VERSION="({SEMVER})";', errors, "central runtime version")
    runtime_channel = capture_once(identity_source, r'const CHANNEL="([^"]+)";', errors, "central runtime channel")
    expect(runtime_version, version, errors, "central runtime version")
    expect(runtime_channel, channel, errors, "central runtime channel")
    for marker in ["displayTitle:`${NAME}: ${CHANNEL} v${VERSION}`", "displayVersion:`${CHANNEL} v${VERSION}`", "subtitle:`${CHANNEL} v${VERSION} · ${RELEASE_SUMMARY}`"]:
        if marker not in identity_source:
            errors.append(f"central runtime identity is missing derived marker: {marker}")
    checks.append("runtime-identity")

    manifest = read_json(runtime / "js" / "module-manifest.json", errors, "runtime module manifest")
    modules = manifest.get("modules") if isinstance(manifest.get("modules"), list) else []
    load_order = manifest.get("loadOrder") if isinstance(manifest.get("loadOrder"), list) else []
    by_id = {str(module.get("id")): module for module in modules if isinstance(module, dict) and module.get("id")}
    if not load_order or load_order[0] != "version":
        errors.append("runtime version module must be first in loadOrder")
    version_module = by_id.get("version") or {}
    expect(version_module.get("path"), "js/version.js", errors, "version module path")
    if "DiceboundVersion" not in (version_module.get("provides") or []):
        errors.append("version module must provide DiceboundVersion")
    expected_scripts = [str(by_id[module_id].get("path")) for module_id in load_order if module_id in by_id]
    expect(project.get("runtimeScripts"), expected_scripts, errors, "project runtimeScripts")

    extracted_hardcoded_patterns = [
        re.compile(rf"\b(?:const|let|var)\s+(?:(?:APP|GAME|WRAPPER)_)?VERSION\s*=\s*[\"']{SEMVER}[\"']"),
        re.compile(rf"\b(?:version|appVersion|gameVersion|wrapperVersion)\s*:\s*[\"']{SEMVER}[\"']"),
        re.compile(r"\b(?:const|let|var)\s+(?:(?:APP|GAME|WRAPPER)_)?CHANNEL\s*=\s*[\"'][^\"']+[\"']"),
        re.compile(r"\bchannel\s*:\s*[\"'][^\"']+[\"']"),
        re.compile(rf"JSON\.stringify\(\{{version\s*:\s*[\"']{SEMVER}[\"']"),
        re.compile(rf"DiceboundInfrastructure\s*=\s*Object\.freeze\(\{{version\s*:\s*[\"']{SEMVER}[\"']"),
    ]
    monolith_hardcoded_patterns = [
        re.compile(rf"\b(?:APP_VERSION|GAME_VERSION|WRAPPER_VERSION)\s*=\s*[\"']{SEMVER}[\"']"),
        re.compile(rf"\b(?:appVersion|gameVersion|wrapperVersion)\s*:\s*[\"']{SEMVER}[\"']"),
        re.compile(rf"JSON\.stringify\(\{{version\s*:\s*[\"']{SEMVER}[\"']"),
        re.compile(rf"DiceboundInfrastructure\s*=\s*Object\.freeze\(\{{version\s*:\s*[\"']{SEMVER}[\"']"),
    ]
    for module_id, module in by_id.items():
        path = runtime / str(module.get("path") or "")
        try:
            source = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if module_id != "version" and "window.DiceboundVersion" in source and "version" not in (module.get("requires") or []):
            errors.append(f"module {module_id} consumes DiceboundVersion but does not require version")
        if module_id != "version":
            patterns = monolith_hardcoded_patterns if module_id == "dicebound-monolith" else extracted_hardcoded_patterns
            for pattern in patterns:
                match = pattern.search(source)
                if match:
                    errors.append(f"module {module_id} contains hardcoded release identity: {match.group(0)}")
    checks.append("module-consumers")

    index_source = (runtime / "index.html").read_text(encoding="utf-8")
    for marker, label in [
        (f"<title>{display_title}</title>", "runtime title"),
        (f"<h1>{display_title}</h1>", "runtime heading"),
        (f"<p>{display_version} ·", "runtime subtitle"),
        ('<script src="js/version.js"></script>', "runtime version script"),
    ]:
        if index_source.count(marker) != 1:
            errors.append(f"{label}: expected exactly one {marker!r}")
    monolith = (runtime / "js" / "dicebound.js").read_text(encoding="utf-8")
    title_assignments = list(re.finditer(r"document\.title\s*=\s*([^;\n]+)", monolith))
    if not title_assignments or title_assignments[-1].group(1).strip() != "APP_IDENTITY.displayTitle":
        errors.append("the final monolith document.title assignment must use APP_IDENTITY.displayTitle")
    for marker in [
        "db060Brand.textContent=APP_IDENTITY.displayTitle",
        "db060Sub.textContent=APP_IDENTITY.subtitle",
        "DiceboundInfrastructure=Object.freeze({version:APP_IDENTITY.version,channel:APP_IDENTITY.channel",
    ]:
        if marker not in monolith:
            errors.append(f"monolith final identity is missing central marker: {marker}")
    checks.append("runtime-presentation")

    build_info = read_json(runtime / "build-info.json", errors, "runtime build-info")
    build_manifest = read_json(runtime / "build-manifest.json", errors, "runtime build-manifest")
    for label, value in [("build-info", build_info), ("build-manifest", build_manifest)]:
        expect(value.get("version"), version, errors, f"{label} version")
        expect(value.get("channel"), channel, errors, f"{label} channel")
        if not str(value.get("buildId") or "").startswith(f"dicebound-{version}-"):
            errors.append(f"{label} buildId does not begin with dicebound-{version}-")
    expect(build_info.get("browserContentHash"), build_manifest.get("browserContentHash"), errors, "runtime content hash")
    expect(build_info.get("runtimeScripts"), expected_scripts, errors, "build-info runtimeScripts")
    manifest_files = build_manifest.get("files") if isinstance(build_manifest.get("files"), dict) else {}
    expect(manifest_files.get("js/version.js"), sha256(identity_path) if identity_path.is_file() else None, errors, "version module manifest hash")
    checks.append("runtime-build-metadata")

    native_path = root / "wrapper-source" / "wrappers" / "webview2" / "native-go" / "main.go"
    native = native_path.read_text(encoding="utf-8")
    native_markers = [
        f'appTitle       = "{display_title}"',
        f"Frontend ready handshake received for {channel} {version}.",
        f"Starting Dicebound {channel} {version} native WebView2 wrapper.",
        f"index.html?diceboundNative=1&v={version}&build=",
        "messageBox(appTitle,",
    ]
    for marker in native_markers:
        if marker not in native:
            errors.append(f"native wrapper is missing identity marker: {marker}")
    native_versions = set(re.findall(rf"\b({SEMVER})\b", native))
    native_versions.discard("127.0.0")
    if native_versions != {version}:
        errors.append(f"native wrapper semantic versions disagree: {sorted(native_versions)}")
    checks.append("native-wrapper")

    release_spec_path = root / ".release" / f"{tag}.json"
    release_spec = read_json(release_spec_path, errors, "release spec")
    expect(release_spec.get("version"), version, errors, "release spec version")
    expect(release_spec.get("channel"), channel, errors, "release spec channel")
    expect(release_spec.get("tag"), tag, errors, "release spec tag")
    expect(release_spec.get("asset"), "DiceBound.exe", errors, "release spec asset")
    notes_path = root / ".release" / f"{tag}.md"
    try:
        notes = notes_path.read_text(encoding="utf-8")
        if f"# DiceBound {channel} {version}" not in notes:
            errors.append(f"release notes heading does not identify DiceBound {channel} {version}")
    except OSError as exc:
        errors.append(f"release notes could not be read: {exc}")
    for path, label in [(root / "CHANGELOG.md", "changelog"), (runtime / "PATCH_NOTES.md", "runtime patch notes")]:
        try:
            documentation = path.read_text(encoding="utf-8")
            if display_version not in documentation and f"{channel} {version}" not in documentation:
                errors.append(f"{label} does not mention {channel} {version}")
        except OSError as exc:
            errors.append(f"{label} could not be read: {exc}")
    checks.append("release-spec-and-notes")

    release_metadata: dict = {}
    if args.release_metadata:
        metadata_path = args.release_metadata if args.release_metadata.is_absolute() else root / args.release_metadata
        release_metadata = read_json(metadata_path, errors, "release metadata")
        expect(release_metadata.get("version"), version, errors, "release metadata version")
        expect(release_metadata.get("channel"), channel, errors, "release metadata channel")
        expect(release_metadata.get("artifact"), "DiceBound.exe", errors, "release metadata artifact")
        expect(release_metadata.get("windowsTitle"), display_title, errors, "release metadata Windows title")
        expect(release_metadata.get("browserContentHash"), build_info.get("browserContentHash"), errors, "release metadata browser content hash")
        if not str(release_metadata.get("buildId") or "").startswith(f"dicebound-{version}-"):
            errors.append("release metadata buildId has the wrong version prefix")
        if not re.fullmatch(r"[0-9a-f]{64}", str(release_metadata.get("sha256") or "")):
            errors.append("release metadata sha256 is not a lowercase SHA-256")
        if not isinstance(release_metadata.get("bytes"), int) or release_metadata.get("bytes", 0) <= 0:
            errors.append("release metadata bytes must be a positive integer")
        checks.append("release-metadata")

    if args.distribution:
        if not release_metadata:
            errors.append("--distribution requires --release-metadata so latest.json is derived from a verified artifact")
        distribution_path = args.distribution if args.distribution.is_absolute() else root / args.distribution
        distribution = read_json(distribution_path, errors, "distribution manifest")
        for key in ["version", "channel", "buildId", "sha256", "bytes"]:
            expect(distribution.get(key), release_metadata.get(key), errors, f"distribution {key}")
        expect(distribution.get("executable"), release_metadata.get("artifact"), errors, "distribution executable")
        expected_url = f"https://github.com/Krtz/DiceBound/releases/download/{tag}/DiceBound.exe"
        expect(distribution.get("url"), expected_url, errors, "distribution URL")
        checks.append("distribution")

    report = {
        "status": "pass" if not errors else "fail",
        "version": version,
        "channel": channel,
        "checks": checks,
        "errors": errors,
    }
    if args.json:
        print(json.dumps(report, indent=2))
    elif errors:
        print("VERSION IDENTITY VALIDATION FAILED")
        for error in errors:
            print(f"  ERROR: {error}")
    else:
        print(f"Version identity PASS: {display_title}")
        print(f"  checks: {', '.join(checks)}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
