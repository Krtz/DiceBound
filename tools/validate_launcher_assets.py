#!/usr/bin/env python3
"""Static checks for DiceBound launcher presentation/config assets (#23)."""
from __future__ import annotations
import hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
canonical = ROOT / "runtime/assets/installer/splash/dicebound-launcher-splash.jpg"
mirror = ROOT / "installer/assets/dicebound-launcher-splash.jpg"
required = [
    ROOT / "installer/main_v2.go",
    ROOT / "installer/hints.json",
    ROOT / "installer/ui_splash.ps1",
    ROOT / "installer/ui_config.ps1",
    canonical,
    mirror,
]

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

for path in required:
    if not path.is_file() or path.stat().st_size == 0:
        raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: missing/empty {path.relative_to(ROOT)}")

if sha(canonical) != sha(mirror):
    raise SystemExit("LAUNCHER ASSET AUDIT FAILED: installer splash mirror differs from canonical art")

hints = json.loads((ROOT / "installer/hints.json").read_text(encoding="utf-8"))
items = hints.get("hints", [])
if len(items) < 6 or any(not isinstance(x, str) or not x.strip() for x in items):
    raise SystemExit("LAUNCHER ASSET AUDIT FAILED: launcher hints are missing or malformed")

source = (ROOT / "installer/main_v2.go").read_text(encoding="utf-8")
for marker in (
    "assets/dicebound-launcher-splash.jpg",
    "hints.json",
    "ui_splash.ps1",
    "ui_config.ps1",
    "distribution/latest.json",
    "launcher-config.json",
):
    if marker not in source:
        raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: main_v2.go missing marker {marker}")

print(json.dumps({
    "status": "pass",
    "issue": 23,
    "splashSha256": sha(canonical),
    "splashBytes": canonical.stat().st_size,
    "hintCount": len(items),
    "canonicalSplash": canonical.relative_to(ROOT).as_posix(),
    "embeddedMirror": mirror.relative_to(ROOT).as_posix(),
}, indent=2))
