#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / "runtime" / "js" / "dicebound.js"

text = MONOLITH.read_text(encoding="utf-8")
lines = text.splitlines()

capture_re = re.compile(r"\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*updateCombatUI\s*;")
assign_re = re.compile(r"\bupdateCombatUI\s*=\s*(?:async\s*)?function\b")
render_capture_re = re.compile(r"\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*renderEnemyParty\s*;")
render_assign_re = re.compile(r"\brenderEnemyParty\s*=\s*(?:async\s*)?function\b")

captures = []
assignments = []
render_captures = []
render_assignments = []

for idx, line in enumerate(lines, start=1):
    for m in capture_re.finditer(line):
        captures.append({"line": idx, "name": m.group(1), "text": line.strip()[:300]})
    if assign_re.search(line):
        window = "\n".join(lines[max(0, idx - 2): min(len(lines), idx + 7)])
        assignments.append({
            "line": idx,
            "text": line.strip()[:500],
            "nearRandom": bool(re.search(r"\b(?:random|rand|pick)\s*\(", window)),
            "nearPlayerAssignment": bool(re.search(r"\bplayer\.[A-Za-z_$][\w$]*\s*(?:\+\+|--|[+\-*/]?=)", window)),
            "nearEnemyAssignment": bool(re.search(r"\b(?:currentEnemy|enemy)\.[A-Za-z_$][\w$]*\s*(?:\+\+|--|[+\-*/]?=)", window)),
        })
    for m in render_capture_re.finditer(line):
        render_captures.append({"line": idx, "name": m.group(1), "text": line.strip()[:300]})
    if render_assign_re.search(line):
        render_assignments.append({"line": idx, "text": line.strip()[:500]})

result = {
    "monolithBytes": len(text.encode("utf-8")),
    "monolithLines": len(lines),
    "updateCombatUICaptures": captures,
    "updateCombatUIAssignments": assignments,
    "renderEnemyPartyCaptures": render_captures,
    "renderEnemyPartyAssignments": render_assignments,
    "counts": {
        "updateCombatUICaptures": len(captures),
        "updateCombatUIAssignments": len(assignments),
        "renderEnemyPartyCaptures": len(render_captures),
        "renderEnemyPartyAssignments": len(render_assignments),
    },
}

print(json.dumps(result, indent=2))
