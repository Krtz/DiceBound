from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
monolith = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")
assets = (ROOT / "runtime/js/assets.js").read_text(encoding="utf-8")
presentation = (ROOT / "runtime/js/ui/class-presentation.js").read_text(encoding="utf-8")

# 0.6.7.12 removes the historical monolith class-art compatibility allowlist.
# The focused presentation owner must resolve art through the canonical asset registry.
assert "DB054_CLASS_ART_IDS" not in monolith, "Retired monolith class-art allowlist returned."
assert "resolveClassArt:id=>window.DiceboundAssets?.resolveClassArt?.(id)||null" in monolith, (
    "Composition must wire class-presentation directly to the canonical asset registry."
)
assert 'for(const name of ["find","getClass","resolveClassArt"])' in presentation, (
    "Focused class presentation owner must require resolveClassArt()."
)
assert 'const art=rt().resolveClassArt(String(classId));' in presentation, (
    "Focused class presentation owner must consume canonical class art."
)

match = re.search(r"const CLASSES=(\[[^;]+\]);", assets)
assert match, "Could not locate the canonical asset class list."
class_ids = json.loads(match.group(1))
assert "invoker" in class_ids, "Invoker must be registered by the canonical asset registry."
assert "dragoon" in class_ids, "Dragoon must remain registered by the canonical asset registry."
for class_id in class_ids:
    for role in ("campsite", "battle", "markers"):
        path = ROOT / "runtime/assets/characters/classes" / role / f"{class_id}.png"
        assert path.is_file(), f"Missing canonical {role} art for registered class {class_id}: {path}"
print(f"Class-art registry sync OK for {len(class_ids)} registered classes through the focused presentation owner, including Invoker.")
