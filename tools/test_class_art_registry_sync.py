from pathlib import Path
import json
import re
import subprocess

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
node_probe = r"""
const fs=require("fs"),vm=require("vm");
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(process.argv[1],"utf8"),context,{filename:process.argv[1]});
process.stdout.write(JSON.stringify(context.window.DiceboundAssets.manifest.classes));
"""
probe = subprocess.run(
    ["node", "-e", node_probe, str(ROOT / "runtime/js/assets.js")],
    check=True,
    capture_output=True,
    text=True,
)
class_art = json.loads(probe.stdout)
assert list(class_art) == class_ids, "Canonical asset manifest class order/coverage drifted from CLASSES."
for class_id in class_ids:
    entry = class_art[class_id]
    for role in ("campsite", "battle", "marker"):
        relative = entry.get(role)
        assert relative, f"Registered class {class_id} is missing canonical {role} art metadata."
        art_path = ROOT / "runtime" / relative
        assert art_path.is_file(), f"Missing canonical {role} art for registered class {class_id}: {art_path}"
print(
    f"Class-art registry sync OK for {len(class_ids)} registered classes through "
    "the focused presentation owner and semantic asset manifest, including Necromancer."
)
