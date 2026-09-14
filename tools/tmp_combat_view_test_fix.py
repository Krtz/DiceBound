from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "tools/test_combat_vfx.js"
text = path.read_text(encoding="utf-8")
old = 'assert.match(monolith, /dbCombatView\\.clearTransient\\?\\.\\(\\)/, "Combat transitions must explicitly clear authored transient VFX");'
new = 'assert.match(monolith, /dbCombatView\\.clearTransient\\(\\)/, "Combat transitions must explicitly clear authored transient VFX through the Combat View facade");'
if text.count(old) != 1:
    raise RuntimeError(f"expected one stale Combat View transient-cleanup assertion, found {text.count(old)}")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Combat View stale ownership assertions updated")
