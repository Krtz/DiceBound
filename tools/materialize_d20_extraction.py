#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
INDEX = ROOT / "runtime/index.html"
MANIFEST = ROOT / "runtime/js/module-manifest.json"
GUARD = ROOT / "tools/test_shadow_ownership_drain.py"
PATCH = ROOT / "runtime/PATCH_NOTES.md"
CHANGELOG = ROOT / "CHANGELOG.md"


def matching_brace(text: str, open_at: int) -> int:
    if text[open_at] != "{":
        raise RuntimeError("matching_brace must start on {")
    depth = 0
    i = open_at
    state = "normal"
    quote = ""
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "line_comment":
            if ch == "\n": state = "normal"
            i += 1
            continue
        if state == "block_comment":
            if ch == "*" and nxt == "/":
                state = "normal"; i += 2; continue
            i += 1
            continue
        if state == "string":
            if ch == "\\": i += 2; continue
            if ch == quote: state = "normal"
            i += 1
            continue
        if state == "template":
            if ch == "\\": i += 2; continue
            if ch == "`": state = "normal"
            i += 1
            continue
        if ch == "/" and nxt == "/": state = "line_comment"; i += 2; continue
        if ch == "/" and nxt == "*": state = "block_comment"; i += 2; continue
        if ch in ("'", '"'):
            state = "string"; quote = ch; i += 1; continue
        if ch == "`": state = "template"; i += 1; continue
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: return i
        i += 1
    raise RuntimeError("unterminated JavaScript block")


def replace_function_declaration(text: str, token: str, replacement: str) -> str:
    start = text.find(token)
    if start < 0: raise RuntimeError(f"missing declaration {token}")
    if text.find(token, start + 1) >= 0: raise RuntimeError(f"duplicate declaration {token}")
    open_at = text.find("{", start + len(token) - 1)
    end = matching_brace(text, open_at) + 1
    return text[:start] + replacement + text[end:]


def remove_assignment_functions(text: str, token: str) -> tuple[str, int]:
    removed = 0
    while True:
        start = text.find(token)
        if start < 0: break
        open_at = text.find("{", start + len(token) - 1)
        end = matching_brace(text, open_at) + 1
        while end < len(text) and text[end] in " \t": end += 1
        if end < len(text) and text[end] == ";": end += 1
        text = text[:start] + text[end:]
        removed += 1
    return text, removed


def remove_named_reset_wrapper(text: str, capture: str) -> str:
    cap = f"const {capture}=resetPlayer;"
    start = text.find(cap)
    if start < 0: raise RuntimeError(f"missing reset capture {capture}")
    assign = "resetPlayer=function(classId=selectedClassId){"
    assign_at = text.find(assign, start + len(cap))
    if assign_at < 0: raise RuntimeError(f"missing reset assignment after {capture}")
    between = text[start + len(cap):assign_at]
    if between.strip(): raise RuntimeError(f"unexpected content between {capture} and reset assignment")
    open_at = text.find("{", assign_at + len(assign) - 1)
    end = matching_brace(text, open_at) + 1
    while end < len(text) and text[end] in " \t": end += 1
    if end < len(text) and text[end] == ";": end += 1
    return text[:start] + text[end:]


def inject_into_canonical_reset(text: str) -> str:
    token = "function resetPlayer(classId=selectedClassId){"
    start = text.find(token)
    if start < 0: raise RuntimeError("canonical resetPlayer not found")
    open_at = text.find("{", start + len(token) - 1)
    close_at = matching_brace(text, open_at)
    body = text[open_at + 1:close_at]
    marker = "dbCombatD20ChaosResolution.initializePlayerState()"
    if marker in body: return text
    addition = "if(dbCombatD20ChaosResolution)dbCombatD20ChaosResolution.initializePlayerState();"
    return text[:close_at] + addition + text[close_at:]


def update_monolith() -> None:
    text = MONO.read_text(encoding="utf-8")
    before_bytes = len(text.encode("utf-8")); before_lines = len(text.splitlines())

    owner_var_anchor = "  let dbCombatTurns=null;"
    if "let dbCombatD20ChaosResolution=null;" not in text:
        if owner_var_anchor not in text: raise RuntimeError("combat owner var anchor missing")
        text = text.replace(owner_var_anchor, "  let dbCombatD20ChaosResolution=null;\n" + owner_var_anchor, 1)

    adapter = '''async function rollD20Chaos(action){\n    if(!dbCombatD20ChaosResolution)throw new Error("D20 chaos-resolution owner is not configured.");\n    return dbCombatD20ChaosResolution.rollD20Chaos(action);\n  }'''
    text = replace_function_declaration(text, "async function rollD20Chaos(action){", adapter)

    text, removed = remove_assignment_functions(text, "rollD20Chaos=async function(action){")
    if removed != 7:
        raise RuntimeError(f"expected seven historical rollD20Chaos assignment layers, removed {removed}")

    text = replace_function_declaration(text, "function d20ResultTitle(roll){", "")

    for symbol in [
        "rollD20ChaosV15Patch", "rollD20ChaosV17Base", "rollD20ChaosV19Base",
        "rollD20ChaosBeta045Base", "db046RollD20Base", "db047RollD20Base"
    ]:
        pat = re.compile(rf"\s*const\s+{re.escape(symbol)}\s*=\s*rollD20Chaos\s*;")
        text, count = pat.subn("", text, count=1)
        if count != 1: raise RuntimeError(f"expected one {symbol} capture, found {count}")

    text = remove_named_reset_wrapper(text, "db046ResetPlayerBase")
    text = remove_named_reset_wrapper(text, "db047ResetPlayerBase")
    text, count = re.subn(r"\s*player\._db047HastePrimed=false;", "", text, count=1)
    if count != 1: raise RuntimeError(f"expected one top-level DB047 primed initializer, found {count}")

    text = inject_into_canonical_reset(text)

    config_marker = "  /* SEMANTIC OWNER — D20 / Twenty-Sider chaos resolution. */"
    if config_marker not in text:
        close = text.rfind("})();")
        if close < 0: raise RuntimeError("dicebound.js closing IIFE not found")
        config = '''\n\n  /* SEMANTIC OWNER — D20 / Twenty-Sider chaos resolution. */\n  const dbCombatD20ChaosOwner=window.DiceboundCombatD20ChaosResolution;\n  if(!dbCombatD20ChaosOwner)throw new Error("DiceBound requires the D20 chaos-resolution owner before dicebound.js");\n  dbCombatD20ChaosResolution=dbCombatD20ChaosOwner.configure({\n    getPlayer:()=>player,\n    classIdentityActive:id=>classIdentityActive(id),\n    rand:(min,max)=>rand(min,max),\n    random:()=>random(),\n    pick:values=>pick(values),\n    clamp:(value,min,max)=>clamp(value,min,max),\n    getAttackFx:()=>("attackFx" in window?window.attackFx:$("attackFx")),\n    delay:ms=>delay(ms),\n    getElements:()=>ELEMENTS,\n    getCoreElements:()=>DIBO_ELEMENTS,\n    setCombatText:text=>setCombatText(text),\n    showToast:text=>showToast(text),\n    identityFlash:text=>identityFlash(text),\n    addCombatHistory:text=>addCombatHistory(text),\n    clampQueuedHaste:before=>dbCombatElementResolution.clampQueuedHaste(before)\n  });\n  dbCombatD20ChaosResolution.initializePlayerState();\n'''
        text = text[:close] + config + text[close:]

    forbidden = [
        "rollD20ChaosV15Patch", "rollD20ChaosV17Base", "rollD20ChaosV19Base",
        "rollD20ChaosBeta045Base", "db046RollD20Base", "db047RollD20Base",
        "db046ResetPlayerBase", "db047ResetPlayerBase", "function d20ResultTitle("
    ]
    for symbol in forbidden:
        if symbol in text: raise RuntimeError(f"retired D20 symbol remains: {symbol}")
    if text.count("async function rollD20Chaos(action){") != 1:
        raise RuntimeError("D20 thin adapter count is not exactly one")
    if "rollD20Chaos=async function(action){" in text:
        raise RuntimeError("D20 reassignment tower remains")

    MONO.write_text(text, encoding="utf-8")
    after_bytes = len(text.encode("utf-8")); after_lines = len(text.splitlines())
    print(json.dumps({"monolithBeforeBytes": before_bytes, "monolithAfterBytes": after_bytes, "monolithBeforeLines": before_lines, "monolithAfterLines": after_lines}, indent=2))


def update_index() -> None:
    text = INDEX.read_text(encoding="utf-8")
    script = '  <script src="js/combat/d20-chaos-resolution.js"></script>\n'
    if script not in text:
        anchor = '  <script src="js/combat/element-resolution.js"></script>\n'
        if text.count(anchor) != 1: raise RuntimeError("element script anchor is not unique")
        text = text.replace(anchor, anchor + script, 1)
    INDEX.write_text(text, encoding="utf-8")


def update_manifest() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    new_id = "combat-d20-chaos-resolution"
    if new_id not in data["loadOrder"]:
        pos = data["loadOrder"].index("combat-element-resolution") + 1
        data["loadOrder"].insert(pos, new_id)
    modules = data["modules"]
    if not any(m["id"] == new_id for m in modules):
        pos = next(i for i,m in enumerate(modules) if m["id"] == "combat-element-resolution") + 1
        modules.insert(pos, {
            "id": new_id,
            "path": "js/combat/d20-chaos-resolution.js",
            "domain": "combat/twenty-sider-d20-chaos-outcome-presentation-and-haste-gating",
            "status": "extracted",
            "requires": ["combat-element-resolution"],
            "provides": ["DiceboundCombatD20ChaosResolution"]
        })
    monolith = next(m for m in modules if m["id"] == "dicebound-monolith")
    if new_id not in monolith["requires"]:
        pos = monolith["requires"].index("combat-element-resolution") + 1
        monolith["requires"].insert(pos, new_id)
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def update_guard() -> None:
    text = GUARD.read_text(encoding="utf-8")
    if "d20_retired = [" in text: return
    marker = "print('Monolith spring-clean guard PASS')"
    if marker not in text: raise RuntimeError("shadow ownership guard print marker missing")
    block = r'''

d20_retired = [
    'd20ResultTitle', 'rollD20ChaosV15Patch', 'rollD20ChaosV17Base', 'rollD20ChaosV19Base',
    'rollD20ChaosBeta045Base', 'db046RollD20Base', 'db047RollD20Base',
    'db046ResetPlayerBase', 'db047ResetPlayerBase',
]
for symbol in d20_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired D20 chaos owner returned: {symbol}"
assert mono.count('async function rollD20Chaos(action){') == 1, 'rollD20Chaos must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*rollD20Chaos\s*=\s*async function', mono), 'rollD20Chaos reassignment tower must not return'
assert 'let dbCombatD20ChaosResolution=null;' in mono, 'D20 resolution composition handle is missing'
assert 'dbCombatD20ChaosResolution=dbCombatD20ChaosOwner.configure({' in mono, 'D20 chaos owner is not configured by the composition root'
assert 'return dbCombatD20ChaosResolution.rollD20Chaos(action);' in mono, 'D20 chaos thin adapter is missing'
assert 'dbCombatD20ChaosResolution.initializePlayerState();' in mono, 'D20 state initialization bridge is missing'
'''
    text = text.replace(marker, block + "\n" + marker, 1)
    GUARD.write_text(text, encoding="utf-8")


def update_notes(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    header = "# Unreleased — Beta 0.6.6.18"
    if text.startswith("# Unreleased — Beta 0.6.6.19"):
        return
    if not text.startswith(header): raise RuntimeError(f"unexpected top release header in {path}")
    section = '''# Unreleased — Beta 0.6.6.19\n\n## Beta 0.6.6.19 D20 Chaos Resolution ownership (#304)\n- `combat/d20-chaos-resolution.js` now owns the Twenty-Sider's full d20 outcome, readability/presentation and accumulated Haste-gating sequence.\n- The historical `rollD20Chaos` replacement/wrapper tower and its two D20-specific `resetPlayer` wrappers are retired from `dicebound.js`; callers keep one thin composition adapter.\n- Exact decorative RNG draws, real-roll/High Roll ordering, Probability branches, all 1–20 outcomes, Haste lock/clamp ordering, result fields, combat text/history/toasts and delays are pinned by deterministic fixtures.\n- No gameplay, balance, save/checkpoint, class, element or action-resolution redesign is intended.\n\n'''
    path.write_text(section + text, encoding="utf-8")


def main() -> None:
    update_monolith()
    update_index()
    update_manifest()
    update_guard()
    update_notes(PATCH)
    update_notes(CHANGELOG)
    print("D20 extraction materialized.")


if __name__ == "__main__":
    main()
