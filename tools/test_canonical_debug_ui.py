from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")


def require_one(pattern: str, label: str) -> None:
    count = len(re.findall(pattern, SOURCE))
    if count != 1:
        raise SystemExit(f"expected one canonical {label}, found {count}")


require_one(r"\bfunction\s+refreshDebugButtons\s*\(", "refreshDebugButtons declaration")
require_one(r"\bfunction\s+openDebugMenu\s*\(", "openDebugMenu declaration")
require_one(r"\bfunction\s+v25EnsureDebugControls\s*\(", "v25EnsureDebugControls declaration")

for name in ("refreshDebugButtons", "openDebugMenu", "v25EnsureDebugControls"):
    replacements = re.findall(rf"\b{re.escape(name)}\s*=\s*function\b", SOURCE)
    if replacements:
        raise SystemExit(f"historical {name} replacements returned: {len(replacements)}")

retired_aliases = {
    "refreshDebugButtonsV15Patch",
    "refreshDebugButtonsV21Base",
    "refreshDebugButtonsV22Base",
    "refreshDebugButtonsV25Base",
    "refreshDebugButtonsV26Base",
    "openDebugMenuV11",
    "openDebugMenuV24PresentationBase",
    "openDebugMenuV25Base",
    "v25EnsureDebugControlsV26Base",
}
for alias in sorted(retired_aliases):
    if re.search(rf"\b{re.escape(alias)}\b", SOURCE):
        raise SystemExit(f"retired debug-UI predecessor alias returned: {alias}")

for fragment in (
    "let dbDebugUiReady=false;",
    "if(dbDebugUiReady)v25EnsureDebugControls();",
    "dbDebugUiReady=true;refreshDebugButtons();",
    "grid.querySelectorAll('[data-v19-action]').forEach(b=>b.remove())",
    "ensure('kill_character_v26','☠️ Kill character')",
    "mythic:'🟧 Equip full Artifact set'",
    "move('board6',navPanel)",
):
    if fragment not in SOURCE:
        raise SystemExit("canonical debug UI is missing required final behavior: " + fragment)

# Freeze the final open-menu composition order. refreshDebugButtons performs one
# full control sync; v24's compatibility label pass then runs, followed by the
# final current-control pass that restores the released Artifact labels/layout.
open_match = re.search(r"function\s+openDebugMenu\s*\(\)\s*\{(?P<body>.*?)\n\s*\}", SOURCE, re.S)
if not open_match:
    raise SystemExit("could not extract canonical openDebugMenu body")
open_body = open_match.group("body")
open_order = [
    '$("debugOverlay").classList.remove("hidden")',
    "refreshDebugButtons()",
    "v24RefreshDebugLabels()",
    "v25EnsureDebugControls()",
]
positions = []
for fragment in open_order:
    index = open_body.find(fragment)
    if index < 0:
        raise SystemExit("canonical openDebugMenu ordering anchor missing: " + fragment)
    positions.append(index)
if positions != sorted(positions):
    raise SystemExit("canonical openDebugMenu ordering changed")

# Static generations that used to be added by v11/v15/v21/v22 wrappers must now
# be present in the one canonical refresh function.
refresh_match = re.search(r"function\s+refreshDebugButtons\s*\(\)\s*\{(?P<body>.*?)\n\s*\}", SOURCE, re.S)
if not refresh_match:
    raise SystemExit("could not extract canonical refreshDebugButtons body")
refresh_body = refresh_match.group("body")
for action in (
    "alwayschoose", "board5", "mythicring", "omega_merchant", "omega_stone",
    "mythic_weapon", "mythic_boots", "mythic_legs", "mythic_amulet",
    "mythic_hat", "mythic_ring", "seed_item", "all_powerups",
    "unlockclasses", "unlockpets",
):
    if not re.search(rf"['\"]{re.escape(action)}['\"]", refresh_body):
        raise SystemExit("canonical refreshDebugButtons lost action control: " + action)

print("Canonical debug UI PASS: refresh/open/current-controls each have one implementation and zero predecessor layers")
