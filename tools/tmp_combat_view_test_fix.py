from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

vfx_path = ROOT / "tools/test_combat_vfx.js"
vfx_text = vfx_path.read_text(encoding="utf-8")
old = 'assert.match(monolith, /dbCombatView\\.clearTransient\\?\\.\\(\\)/, "Combat transitions must explicitly clear authored transient VFX");'
new = 'assert.match(monolith, /dbCombatView\\.clearTransient\\(\\)/, "Combat transitions must explicitly clear authored transient VFX through the Combat View facade");'
if vfx_text.count(old) != 1:
    raise RuntimeError(f"expected one stale Combat View transient-cleanup assertion, found {vfx_text.count(old)}")
vfx_path.write_text(vfx_text.replace(old, new, 1), encoding="utf-8")

nature_path = ROOT / "tools/test_nature_proc_vfx_registry.js"
nature_text = nature_path.read_text(encoding="utf-8")
replacements = [
    (
        'assert.match(monolith,/dbCombatVfx\\.withNatureLegacyPresentation/,"Monolith is not wired through the authoritative VFX owner");',
        'assert.match(monolith,/dbCombatView\\.withNatureLegacyPresentation/,"Monolith is not wired through the Combat View facade");',
    ),
    (
        'assert.match(monolith,/effect:dbCombatVfx\\.natureEffect/,"Nature smoke adapter bypasses the authoritative VFX owner");',
        'assert.match(monolith,/effect:dbCombatView\\.natureEffect/,"Nature smoke adapter bypasses the Combat View facade");',
    ),
]
for old_text, new_text in replacements:
    if nature_text.count(old_text) != 1:
        raise RuntimeError(f"expected one stale Nature VFX ownership assertion, found {nature_text.count(old_text)}: {old_text}")
    nature_text = nature_text.replace(old_text, new_text, 1)
nature_path.write_text(nature_text, encoding="utf-8")

print("Combat View stale ownership assertions updated")
