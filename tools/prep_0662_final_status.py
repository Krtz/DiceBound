#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
MATERIALIZER = ROOT / "tools/materialize_0662_presentation.py"

# The temporary materializer originally tried the multiline wrapper regex first.
# For one-line updateCombatUI wrappers that could skip far ahead to an unrelated
# standalone `  };` and delete valid runtime ownership. Prefer exact one-line
# shapes first, then fall back to the multiline shape only when required.
materializer = MATERIALIZER.read_text(encoding="utf-8")
old_patterns = '''    patterns = [
        rf"(?ms)^  const {escaped}=updateCombatUI;\\n  updateCombatUI=function\\([^\\n]*\\)\\{{.*?^  \\}};\\n",
        rf"(?m)^  const {escaped}=updateCombatUI;\\n  updateCombatUI=function\\([^\\n]*\\)\\{{.*?\\}};\\n",
        rf"(?m)^  const {escaped}=updateCombatUI;updateCombatUI=function\\([^\\n]*\\)\\{{.*?\\}};\\n",
    ]
'''
new_patterns = '''    patterns = [
        rf"(?m)^  const {escaped}=updateCombatUI;\\n  updateCombatUI=function\\([^\\n]*\\)\\{{.*?\\}};\\n",
        rf"(?m)^  const {escaped}=updateCombatUI;updateCombatUI=function\\([^\\n]*\\)\\{{.*?\\}};\\n",
        rf"(?ms)^  const {escaped}=updateCombatUI;\\n  updateCombatUI=function\\([^\\n]*\\)\\{{.*?^  \\}};\\n",
    ]
'''
if materializer.count(old_patterns) != 1:
    raise SystemExit("materializer wrapper-pattern block did not match exactly once")
MATERIALIZER.write_text(materializer.replace(old_patterns, new_patterns, 1), encoding="utf-8")

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
print("0.6.6.2 final presentation fossils drained; wrapper removal made safe")
