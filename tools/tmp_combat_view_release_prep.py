from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

changelog = ROOT / "CHANGELOG.md"
changelog_text = changelog.read_text(encoding="utf-8")
if "## Beta 0.6.6.32" in changelog_text:
    raise RuntimeError("CHANGELOG already contains Beta 0.6.6.32")
anchor = "This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n"
if changelog_text.count(anchor) != 1:
    raise RuntimeError("CHANGELOG insertion anchor changed")
entry = """## Beta 0.6.6.32

### Combat View subsystem facade and ownership (#343)
- Added `runtime/js/combat/view-facade.js` as the ordinary public `DiceboundCombatView` presentation/VFX boundary while retaining `combat/presentation.js` and `combat/vfx.js` as focused specialist internals.
- Routed ordinary Combat UI/view-model, Dragoon presentation, Nature/Donut/projectile VFX and transient-cleanup collaboration through `DiceboundCombatView`; `dicebound.js` no longer coordinates `DiceboundCombatPresentation` and `DiceboundCombatVfx` as peer public subsystem APIs.
- Added a permanent released-0.6.6.31 Combat View characterization oracle plus facade/ownership guards. The existing Combat presentation/VFX suites, 14-case Combat Engine oracle, browser/file startup checks and deterministic subsystem oracles remain green, and presentation-only paths remain zero-gameplay-RNG.
- Architecture-only: no combat balance, damage/healing math, turn/action ordering, targeting, class/Pet mechanics, rewards/progression, authored VFX behavior/timing, save/checkpoint behavior or UI redesign is intended. Runtime graph is 82 modules (81 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 678,074 bytes / 7,057 physical lines versus 678,722 bytes / 7,060 lines in released 0.6.6.31.

"""
changelog.write_text(changelog_text.replace(anchor, anchor + entry, 1), encoding="utf-8")

patch_notes = ROOT / "runtime" / "PATCH_NOTES.md"
patch_text = patch_notes.read_text(encoding="utf-8")
if "Beta 0.6.6.32" in patch_text:
    raise RuntimeError("PATCH_NOTES already contains Beta 0.6.6.32")
patch_entry = """# Unreleased — Beta 0.6.6.32

## Beta 0.6.6.32 Combat View subsystem ownership (#343)
- `DiceboundCombatView` is now the ordinary public Combat presentation/VFX boundary over focused `combat/presentation.js` and `combat/vfx.js` internals; ordinary runtime composition no longer treats those two specialist owners as peer subsystem APIs.
- Combat control/view-model rendering, enemy/status presentation, Dragoon presentation, authored Nature/Donut/projectile VFX and transient cleanup route through the facade while gameplay ownership remains behind `DiceboundCombat` and the other existing subsystem facades.
- A permanent released-0.6.6.31 Combat View characterization oracle plus facade/anti-shadow guards freezes output and zero-gameplay-RNG behavior. Existing presentation/VFX, Combat Engine, browser/file startup and deterministic subsystem suites remain authoritative.
- No combat formulas, balance, RNG, turn/action ordering, class/Pet mechanics, targeting, rewards/progression, authored VFX timing/assets, save/checkpoint behavior or UI redesign is intended. Runtime graph is 82 modules (81 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 678,074 bytes / 7,057 lines.

"""
patch_notes.write_text(patch_entry + patch_text, encoding="utf-8")

print("Combat View Beta 0.6.6.32 release notes staged")
