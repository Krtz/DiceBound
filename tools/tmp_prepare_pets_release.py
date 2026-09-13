from pathlib import Path

CHANGELOG = Path("CHANGELOG.md")
PATCH_NOTES = Path("runtime/PATCH_NOTES.md")

changelog = CHANGELOG.read_text(encoding="utf-8")
anchor = "This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n"
entry = """## Beta 0.6.6.28\n\n### Pets subsystem facade and lifecycle ownership (#327)\n- Expanded `DiceboundPets` from the static Pet registry boundary into the ordinary public Pets facade while retaining registry compatibility; the new focused `runtime/js/pets/lifecycle.js` owns unlock progression, feeding/bond levels, switching policy, active-Pet bonuses/formulas and Trainer roster shuffling.\n- Routed Pet chooser actions/read models and Player Initialization collaboration through the facade while keeping `combat/pet-turn-resolution.js` Combat-owned; retired the historical V1.6/V1.7 stat-bonus chain, the later V27 feed implementation, the Friends feed wrapper and dead V1.7 forwarding aliases from `dicebound.js`.\n- Added a permanent 18-case exact released-0.6.6.27 Pet oracle plus focused final-feed API/presentation guards covering quiet feed logging, frozen return values, chooser/art refresh behavior and anti-shadow ownership.\n- Architecture-only: no Pet balance, unlock threshold, cookie rewards, class design, combat, save/checkpoint or chooser redesign is intended. Runtime graph is 78 modules (77 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 692,187 bytes / 7,136 physical lines versus 694,385 bytes / 7,130 lines in released 0.6.6.27.\n\n"""
if "## Beta 0.6.6.28" in changelog:
    raise SystemExit("CHANGELOG already contains Beta 0.6.6.28")
if changelog.count(anchor) != 1:
    raise SystemExit("CHANGELOG anchor mismatch")
CHANGELOG.write_text(changelog.replace(anchor, anchor + entry, 1), encoding="utf-8", newline="\n")

notes = PATCH_NOTES.read_text(encoding="utf-8")
notes_entry = """# Unreleased — Beta 0.6.6.28\n\n## Beta 0.6.6.28 Pets subsystem ownership (#327)\n- `DiceboundPets` is now the ordinary public Pets boundary over the existing registry plus focused lifecycle mechanics; `pets/lifecycle.js` owns unlocks, cookies/bond progression, switching/selection, active-Pet bonuses and exact Trainer shuffling while Combat retains Pet-turn resolution.\n- Pet chooser and Run player initialization collaborate through the facade, and the old V1.6/V1.7 bonus implementation, V27 feed override, Friends feed wrapper and dead V1.7 aliases are removed from `dicebound.js` rather than surviving as shadow ownership.\n- A permanent 18-case released-0.6.6.27 output/state/RNG oracle freezes bond/damage formulas, feeding, the 500-point unlock threshold, Camp/run switching, Fire/Donut bonuses, chooser state and 12-draw Trainer shuffle; the focused owner test additionally freezes the final quiet-feed log, frozen result object and Pet presentation refresh contract.\n- No Pet balance, unlock/cookie tuning, class/Pet redesign, Combat ownership, save/checkpoint schema or chooser UI redesign is intended. Runtime graph is 78 modules (77 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 692,187 bytes / 7,136 lines.\n\n"""
if notes.startswith("# Unreleased — Beta 0.6.6.28"):
    raise SystemExit("PATCH_NOTES already contains Beta 0.6.6.28")
PATCH_NOTES.write_text(notes_entry + notes, encoding="utf-8", newline="\n")

print("0.6.6.28 release notes staged.")
