from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
monolith = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")
assets = (ROOT / "runtime/js/assets.js").read_text(encoding="utf-8")

expected = "const DB054_CLASS_ART_IDS=Object.freeze(Object.keys(CLASSES));"
assert expected in monolith, "Class-art compatibility allowlist must derive from the authoritative class registry."
assert not re.search(r"const DB054_CLASS_ART_IDS=Object\.freeze\(\[", monolith), "A hand-maintained class-art allowlist must not return."

match = re.search(r"const CLASSES=(\[[^;]+\]);", assets)
assert match, "Could not locate the canonical asset class list."
class_ids = json.loads(match.group(1))
assert "invoker" in class_ids, "Invoker must be registered by the canonical asset registry."
assert "dragoon" in class_ids, "Dragoon must remain registered by the canonical asset registry."
for class_id in class_ids:
    for role in ("campsite", "battle", "markers"):
        path = ROOT / "runtime/assets/characters/classes" / role / f"{class_id}.png"
        assert path.is_file(), f"Missing canonical {role} art for registered class {class_id}: {path}"
print(f"Class-art registry sync OK for {len(class_ids)} registered classes, including Invoker.")
