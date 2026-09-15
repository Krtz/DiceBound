from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")

# The live tooling dispatcher is intentionally owned by the composition/tooling
# root, but it must be a single readable function rather than a patch ladder.
declarations = re.findall(r"\b(?:async\s+)?function\s+debugAction\s*\(", SOURCE)
replacements = re.findall(r"\bdebugAction\s*=\s*(?:async\s*)?function\b", SOURCE)
captures = re.findall(r"\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*debugAction\s*;", SOURCE)

if len(declarations) != 1:
    raise SystemExit(f"expected exactly one canonical debugAction declaration, found {len(declarations)}")
if replacements:
    raise SystemExit(f"historical debugAction replacements returned: {len(replacements)}")
if captures:
    raise SystemExit(f"historical debugAction predecessor captures returned: {len(captures)}")

retired_aliases = {
    "debugActionV11",
    "debugActionV15Patch",
    "debugActionV19Base",
    "debugActionV110Base",
    "debugActionV21Base",
    "debugActionV22Base",
    "debugActionV25Base",
    "debugActionV26Base",
    "debugActionBeta04Base",
}
for alias in sorted(retired_aliases):
    if re.search(rf"\b{re.escape(alias)}\b", SOURCE):
        raise SystemExit(f"retired debugAction alias returned: {alias}")

# Freeze the effective released action surface. Some actions are represented as
# object keys or array members in the canonical function rather than `action===`.
required_literals = {
    "runxp", "level", "legacy", "talents", "gold", "cookies", "heal", "unlock",
    "mythic", "dibo50", "nightmare", "boss", "alwayschoose", "board5",
    "mythicring", "omega_merchant", "omega_stone", "mythic_weapon",
    "mythic_boots", "mythic_legs", "mythic_amulet", "mythic_hat", "mythic_ring",
    "seed_item", "mythic_offhand", "board6", "double_dice", "all_powerups",
    "unlockclasses", "unlockpets", "legend_mug_v25", "legend_headphones_v25",
    "legend_jacket_v25", "omega_horns_v25", "recover_road_v25",
    "kill_character_v26", "unlock_hell",
}
missing = sorted(
    action
    for action in required_literals
    if not re.search(rf"['\"]{re.escape(action)}['\"]", SOURCE)
)
if missing:
    raise SystemExit("canonical debugAction lost released action literals: " + ", ".join(missing))

# These ordering anchors encode the non-obvious semantics discovered by the exact
# ten-generation audit: Beta04/v26 intercept before v25 logging, then v22/v21,
# while the v1.10 Philosopher's Stone refresh happens after the older equip path.
def pos(fragment: str) -> int:
    index = SOURCE.find(fragment)
    if index < 0:
        raise SystemExit(f"canonical debugAction ordering anchor missing: {fragment}")
    return index

order = [
    "if(action==='unlock_hell')",
    "if(action==='kill_character_v26')",
    "v25Log('events','debug'",
    "if(action==='unlockclasses')",
    "if(action==='all_powerups')",
    "if(action==\"board6\"&&gameStarted)",
    "if(action==\"seed_item\")",
    "if(action==\"alwayschoose\")",
    "if(action==\"omega_stone\"&&gameStarted)",
    "if(action==\"runxp\"&&gameStarted)",
]
positions = [pos(fragment) for fragment in order]
if positions != sorted(positions):
    raise SystemExit("canonical debugAction released dispatch ordering changed")

omega = re.search(
    r'if\(action=="omega_stone"&&gameStarted\)\{(?P<body>.*?)\n\s*\}',
    SOURCE,
    re.S,
)
if not omega:
    raise SystemExit("canonical omega_stone debug branch missing")
omega_body = omega.group("body")
for fragment in (
    "equipItem(generatePhilosophersStone(),true)",
    "showToast(\"Philosopher's Stone added\")",
    "renderEquipment();updateHUD();return;",
):
    if fragment not in omega_body:
        raise SystemExit("canonical omega_stone branch lost released post-refresh semantics: " + fragment)

print(
    f"Canonical debugAction PASS: one dispatcher, zero predecessor layers, "
    f"{len(required_literals)} released action literals guarded"
)
