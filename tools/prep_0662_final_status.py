#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
text = MONO.read_text(encoding="utf-8")

patterns = [
    (r"(?m)^  v17CompactPoisonMarkers=function\(\)\{\};\n", "late no-op poison compactor"),
    (r"(?m)^  statusDotsHTML=function\(barriers=0,poison=0,affinity=null\)\{.*?\};\n", "late compact status renderer"),
]
for pattern, label in patterns:
    text, count = re.subn(pattern, "", text, count=1)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")

replacements = [
    (
        "setTimeout(()=>{if(v24StorageUnlocked())v24SyncStorage();v24RefreshCamp();renderTalents();renderEquipment();v24EnsureShieldBars();},0);",
        "setTimeout(()=>{if(v24StorageUnlocked())v24SyncStorage();v24RefreshCamp();renderTalents();renderEquipment();v24UpdateShieldBars();},0);",
        "v24 storage bootstrap shield call",
    ),
    (
        "setTimeout(()=>{v24EnsureShieldBars?.();v24UpdateShieldBars?.();renderInfo();},0);",
        "setTimeout(()=>{v24UpdateShieldBars?.();renderInfo();},0);",
        "v27 bootstrap shield call",
    ),
]
for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one literal, found {count}")
    text = text.replace(old, new, 1)

MONO.write_text(text, encoding="utf-8")
print("0.6.6.2 final presentation fossils drained")
