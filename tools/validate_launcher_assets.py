#!/usr/bin/env python3
"""Static checks for DiceBound launcher presentation/config assets (#23)."""
from __future__ import annotations
import binascii, hashlib, json, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
canonical = ROOT / "runtime/assets/installer/splash/dicebound-launcher-splash-v2.png"
mirror = ROOT / "installer/assets/dicebound-launcher-splash-v2.png"
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

def validate_png(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: {path.relative_to(ROOT)} is not a PNG")
    offset = 8
    dimensions = None
    chunks = []
    while offset + 12 <= len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + length
        if end > len(data):
            raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: truncated PNG chunk in {path.relative_to(ROOT)}")
        payload = data[offset + 8:offset + 8 + length]
        expected_crc = struct.unpack(">I", data[offset + 8 + length:end])[0]
        actual_crc = binascii.crc32(kind + payload) & 0xFFFFFFFF
        if actual_crc != expected_crc:
            raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: invalid PNG CRC in {path.relative_to(ROOT)}")
        chunks.append(kind)
        if kind == b"IHDR":
            if length != 13 or dimensions is not None:
                raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: malformed PNG header in {path.relative_to(ROOT)}")
            dimensions = struct.unpack(">II", payload[:8])
        offset = end
        if kind == b"IEND":
            break
    if not chunks or chunks[0] != b"IHDR" or chunks[-1] != b"IEND" or offset != len(data) or dimensions is None:
        raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: incomplete PNG structure in {path.relative_to(ROOT)}")
    width, height = dimensions
    if width < 1000 or height < 560 or width / height < 1.6 or width / height > 1.9:
        raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: unsuitable splash dimensions {width}x{height}")
    return width, height

for path in required:
    if not path.is_file() or path.stat().st_size == 0:
        raise SystemExit(f"LAUNCHER ASSET AUDIT FAILED: missing/empty {path.relative_to(ROOT)}")

if sha(canonical) != sha(mirror):
    raise SystemExit("LAUNCHER ASSET AUDIT FAILED: installer splash mirror differs from canonical art")

width, height = validate_png(canonical)
validate_png(mirror)

hints = json.loads((ROOT / "installer/hints.json").read_text(encoding="utf-8"))
items = hints.get("hints", [])
if len(items) < 6 or any(not isinstance(x, str) or not x.strip() for x in items):
    raise SystemExit("LAUNCHER ASSET AUDIT FAILED: launcher hints are missing or malformed")

source = (ROOT / "installer/main_v2.go").read_text(encoding="utf-8")
for marker in (
    "assets/dicebound-launcher-splash-v2.png",
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
    "splashDimensions": [width, height],
    "hintCount": len(items),
    "canonicalSplash": canonical.relative_to(ROOT).as_posix(),
    "embeddedMirror": mirror.relative_to(ROOT).as_posix(),
}, indent=2))
