from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

changelog = ROOT / "CHANGELOG.md"
changelog_text = changelog.read_text(encoding="utf-8")
if "## Beta 0.6.6.34" in changelog_text:
    raise RuntimeError("CHANGELOG already contains Beta 0.6.6.34")
anchor = "This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n"
if changelog_text.count(anchor) != 1:
    raise RuntimeError("CHANGELOG insertion anchor changed")
entry = """## Beta 0.6.6.34

### Classes subsystem facade and ownership (#348)
- Consolidated runtime class identity/capability policy, Slime Rouge borrowing lifecycle, combat action selection, bespoke class actions, class-specific combat/stat hooks and borrowed identity/Ultimate support initialization behind the existing public `DiceboundClasses` facade. Focused `classes/runtime.js`, `classes/actions.js`, `classes/hooks.js` and `classes/invoker.js` remain specialist internals rather than peer subsystem APIs.
- Drained direct class-runtime/action/hook ownership and the public `DiceboundInvoker` peer from ordinary composition. Combat, Mana, Run initialization and other ordinary collaborators now reach class policy through `DiceboundClasses`, while generic Combat, Pets, Powerups and Progression authority stays separate.
- Added a permanent 18-case exact released-0.6.6.33 Classes output/state/RNG oracle plus focused runtime, lifecycle, action, hook and Invoker facade/anti-shadow contracts. The 24-case Player Initialization oracle and all neighboring subsystem/browser/file suites remain authoritative.
- Architecture-only: no class stats, unlock thresholds, passive/Ultimate mechanics, Slime Rouge donor behavior, Invoker formulas, action ordering, RNG order/state, Combat/Pet/Powerup/Progression balance, save/checkpoint behavior or UI redesign is intended. Runtime graph is 86 modules (85 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 670,604 bytes / 7,075 physical lines versus 675,358 bytes / 7,064 lines in released 0.6.6.33.

"""
changelog.write_text(changelog_text.replace(anchor, anchor + entry, 1), encoding="utf-8")

patch_notes = ROOT / "runtime" / "PATCH_NOTES.md"
patch_text = patch_notes.read_text(encoding="utf-8")
if "Beta 0.6.6.34" in patch_text:
    raise RuntimeError("PATCH_NOTES already contains Beta 0.6.6.34")
patch_entry = """# Unreleased — Beta 0.6.6.34

## Beta 0.6.6.34 Classes subsystem ownership (#348)
- `DiceboundClasses` is now the ordinary public Classes boundary over focused registry, runtime identity/capability, action-mechanics, hook/lifecycle and Invoker internals; ordinary runtime composition no longer exposes those specialists or monolith-local class policy as peer subsystem APIs.
- Class identity/capabilities, Slime Rouge borrowing, Attack/Guard/Potion/Ultimate/Special routing, Rogue/Bloodmage/Cleric/Beastmaster/Alchemist mechanics, Monk/Clown/Berserker/Ninja/Ouroboros hooks, Bloodmage HP normalization, borrowed support initialization and Invoker collaboration route through the facade while generic Combat, Pets, Powerups and Progression ownership remains separate.
- A permanent 18-case exact released-0.6.6.33 Classes output/state/RNG oracle plus focused runtime/lifecycle/action/hook/Invoker ownership guards freezes behavior. The 24-case Player Initialization oracle, deterministic Mana/Combat suites and existing subsystem/browser/file regressions remain authoritative.
- No class balance, unlock requirements, passive/Ultimate semantics, Slime Rouge donor policy, Invoker formulas, RNG order/state, action/event ordering, save/checkpoint behavior or UI redesign is intended. Runtime graph is 86 modules (85 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 670,604 bytes / 7,075 lines.

"""
patch_notes.write_text(patch_entry + patch_text, encoding="utf-8")

print("Classes Beta 0.6.6.34 release notes staged")
