#!/usr/bin/env python3
"""Deterministic tests for latest.json generation from final artifact metadata."""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

from write_distribution_manifest import build_manifest


metadata = {
    "format": 1,
    "version": "0.6.2.1",
    "channel": "Beta",
    "buildId": "dicebound-0.6.2.1-0123456789abcdef",
    "browserContentHash": "0" * 64,
    "artifact": "DiceBound.exe",
    "sha256": "a" * 64,
    "bytes": 326955008,
    "windowsTitle": "Dicebound: Beta v0.6.2.1",
}
expected = {
    "format": 1,
    "name": "DiceBound",
    "version": "0.6.2.1",
    "channel": "Beta",
    "buildId": "dicebound-0.6.2.1-0123456789abcdef",
    "url": "https://github.com/Krtz/DiceBound/releases/download/beta-0.6.2.1/DiceBound.exe",
    "sha256": "a" * 64,
    "bytes": 326955008,
    "executable": "DiceBound.exe",
}
assert build_manifest(metadata, "Krtz/DiceBound") == expected
assert build_manifest(metadata, "example/Fork")["url"] == "https://github.com/example/Fork/releases/download/beta-0.6.2.1/DiceBound.exe"

for key, invalid in [
    ("version", "v0.6.2.1"),
    ("channel", "Beta!"),
    ("artifact", "dicebound.exe"),
    ("buildId", "dicebound-0.6.1-old"),
    ("sha256", "A" * 64),
    ("bytes", 0),
    ("bytes", True),
]:
    broken = dict(metadata)
    broken[key] = invalid
    try:
        build_manifest(broken, "Krtz/DiceBound")
    except ValueError:
        pass
    else:
        raise AssertionError(f"invalid {key} was accepted: {invalid!r}")

try:
    build_manifest(metadata, "not a repository")
except ValueError:
    pass
else:
    raise AssertionError("invalid repository was accepted")

with tempfile.TemporaryDirectory(prefix="dicebound-distribution-") as temp:
    output = Path(temp) / "latest.json"
    output.write_text(json.dumps(expected, indent=2) + "\n", encoding="utf-8")
    assert json.loads(output.read_text(encoding="utf-8")) == expected

print("Distribution manifest generation PASS: exact release URL/identity and invalid metadata rejection")
