#!/usr/bin/env python3
"""Generate launcher latest.json exclusively from verified release metadata."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from dicebound_version import release_tag, require_supported_version

SHA256 = re.compile(r"[0-9a-f]{64}")


def build_manifest(metadata: dict, repository: str) -> dict:
    version = str(metadata.get("version") or "")
    channel = str(metadata.get("channel") or "")
    artifact = str(metadata.get("artifact") or "")
    build_id = str(metadata.get("buildId") or "")
    digest = str(metadata.get("sha256") or "")
    size = metadata.get("bytes")
    version = require_supported_version(version)
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9 -]{0,31}", channel):
        raise ValueError(f"release metadata has invalid channel: {channel!r}")
    if artifact != "DiceBound.exe":
        raise ValueError(f"release artifact must be DiceBound.exe, got {artifact!r}")
    if not build_id.startswith(f"dicebound-{version}-"):
        raise ValueError("release buildId does not contain the metadata version")
    if not SHA256.fullmatch(digest):
        raise ValueError("release sha256 must be a lowercase SHA-256")
    if not isinstance(size, int) or isinstance(size, bool) or size <= 0:
        raise ValueError("release bytes must be a positive integer")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError(f"invalid GitHub repository: {repository!r}")
    tag = release_tag(channel, version)
    return {
        "format": 1,
        "name": "DiceBound",
        "version": version,
        "channel": channel,
        "buildId": build_id,
        "url": f"https://github.com/{repository}/releases/download/{tag}/{artifact}",
        "sha256": digest,
        "bytes": size,
        "executable": artifact,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release-metadata", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--repository", default="Krtz/DiceBound")
    args = parser.parse_args()
    metadata = json.loads(args.release_metadata.read_text(encoding="utf-8"))
    manifest = build_manifest(metadata, args.repository)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), **manifest}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
