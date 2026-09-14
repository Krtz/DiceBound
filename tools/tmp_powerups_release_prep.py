from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

changelog = ROOT / "CHANGELOG.md"
changelog_text = changelog.read_text(encoding="utf-8")
if "## Beta 0.6.6.33" in changelog_text:
    raise RuntimeError("CHANGELOG already contains Beta 0.6.6.33")
anchor = "This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n"
if changelog_text.count(anchor) != 1:
    raise RuntimeError("CHANGELOG insertion anchor changed")
entry = """## Beta 0.6.6.33

### Powerups subsystem facade and ownership (#346)
- Added `runtime/js/powerups/facade.js` as the sole ordinary public `DiceboundPowerups` boundary while retaining `powerups/registry.js` and `powerups/borrowing.js` as focused specialist internals.
- Routed Powerup eligibility, weighted ordinary choices, application ordering, random high-rarity rewards, Legendary/fallback/miniboss policy, selector/description bridges and ordinary Merchant/Road collaboration through `DiceboundPowerups`; historical application/weighted/Slime wrapper ownership and direct focused-global peering are drained from `dicebound.js`.
- Added a permanent 21-case exact released-0.6.6.32 Powerups output/state/RNG oracle plus a focused facade ownership contract. The complete JavaScript/Python suite, existing subsystem oracles and browser/file regressions remain authoritative.
- Architecture-only: no Powerup values, eligibility/gates, choice counts, RNG order/state, D20 behavior, Legendary/miniboss fallback semantics, class/Pet mechanics, Merchant/Road balance, save/checkpoint behavior or UI redesign is intended. Runtime graph is 83 modules (82 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 675,358 bytes / 7,064 physical lines versus 678,074 bytes / 7,057 lines in released 0.6.6.32.

"""
changelog.write_text(changelog_text.replace(anchor, anchor + entry, 1), encoding="utf-8")

patch_notes = ROOT / "runtime" / "PATCH_NOTES.md"
patch_text = patch_notes.read_text(encoding="utf-8")
if "Beta 0.6.6.33" in patch_text:
    raise RuntimeError("PATCH_NOTES already contains Beta 0.6.6.33")
patch_entry = """# Unreleased — Beta 0.6.6.33

## Beta 0.6.6.33 Powerups subsystem ownership (#346)
- `DiceboundPowerups` is now the ordinary public Powerups boundary over focused registry and borrowing internals; ordinary runtime composition no longer exposes those specialists or monolith-local eligibility/application wrappers as peer subsystem APIs.
- Eligibility, weighted/sample selection, normal/Unique/D20 application, high-rarity rewards, Legendary/miniboss/fallback choice policy, selector/description bridges and ordinary Merchant/Road collaboration route through the facade while neighboring subsystem authority stays separate.
- A permanent 21-case exact released-0.6.6.32 Powerups output/state/RNG oracle plus facade/anti-shadow guards freezes eligibility, achievement/Unique gates, 3/4-choice weighting, application side effects, Legendary/miniboss/exhaustion behavior and selector semantics. Existing subsystem/browser/file suites remain authoritative.
- No Powerup balance, class/Pet mechanics, Merchant/Road reward balance, RNG order/state, save/checkpoint behavior or UI redesign is intended. Runtime graph is 83 modules (82 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 675,358 bytes / 7,064 lines.

"""
patch_notes.write_text(patch_entry + patch_text, encoding="utf-8")

print("Powerups Beta 0.6.6.33 release notes staged")
