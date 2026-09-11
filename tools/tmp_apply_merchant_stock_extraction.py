from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "runtime/js/dicebound.js"
INDEX_PATH = ROOT / "runtime/index.html"
MANIFEST_PATH = ROOT / "runtime/js/module-manifest.json"
PROBE_PATH = ROOT / "tools/tmp_merchant_stock_probe.js"
TEST_PATH = ROOT / "tools/test_merchant_stock_resolution_browser.js"
FIXTURE_PATH = ROOT / "tools/fixtures/merchant_stock_0_6_6_23.json"
BOUNDARY_PATH = ROOT / "tools/test_merchant_stock_extraction_boundary.py"


def matching_brace(text: str, open_index: int) -> int:
    depth = 0
    state = "code"
    i = open_index
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                state = "line_comment"; i += 2; continue
            if ch == "/" and nxt == "*":
                state = "block_comment"; i += 2; continue
            if ch == "'": state = "single"; i += 1; continue
            if ch == '"': state = "double"; i += 1; continue
            if ch == "`": state = "template"; i += 1; continue
            if ch == "{": depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0: return i
            i += 1; continue
        if state == "line_comment":
            if ch == "\n": state = "code"
            i += 1; continue
        if state == "block_comment":
            if ch == "*" and nxt == "/": state = "code"; i += 2; continue
            i += 1; continue
        if state in {"single", "double", "template"}:
            quote = {"single": "'", "double": '"', "template": "`"}[state]
            if ch == "\\": i += 2; continue
            if ch == quote: state = "code"
            i += 1; continue
    raise RuntimeError(f"unmatched brace at {open_index}")


def replace_function_declaration(text: str, name: str, replacement: str) -> str:
    matches = list(re.finditer(rf"(?m)^[ \t]*function\s+{re.escape(name)}\s*\([^\n]*?\)\s*\{{", text))
    if len(matches) != 1:
        raise RuntimeError(f"expected one function declaration for {name}, found {len(matches)}")
    m = matches[0]
    open_index = text.find("{", m.start(), m.end())
    end = matching_brace(text, open_index) + 1
    if end < len(text) and text[end] == ";": end += 1
    return text[:m.start()] + replacement + text[end:]


def remove_function_assignments(text: str, name: str, expected: int) -> str:
    pattern = re.compile(rf"\b{re.escape(name)}\s*=\s*function\s*\([^\n]*?\)\s*\{{")
    found = 0
    while True:
        m = pattern.search(text)
        if not m: break
        found += 1
        open_index = text.find("{", m.start(), m.end())
        end = matching_brace(text, open_index) + 1
        while end < len(text) and text[end] in " \t": end += 1
        if end < len(text) and text[end] == ";": end += 1
        text = text[:m.start()] + text[end:]
    if found != expected:
        raise RuntimeError(f"expected {expected} {name}=function assignments, removed {found}")
    return text


js = JS_PATH.read_text(encoding="utf-8")
expected_assignment_counts = {
    "merchantCatalog": 3,
    "makeMerchantGear": 4,
    "merchantPrice": 1,
    "openMerchant": 3,
}
for name, count in expected_assignment_counts.items():
    actual = len(re.findall(rf"\b{re.escape(name)}\s*=\s*function\b", js))
    if actual != count:
        raise RuntimeError(f"released Merchant boundary drifted: {name}=function count {actual}, expected {count}")

if js.count("  let currentMerchantItems = [];\n") != 1:
    raise RuntimeError("currentMerchantItems declaration anchor drifted")
js = js.replace(
    "  let currentMerchantItems = [];\n",
    "  let currentMerchantItems = [];\n  let dbMerchantStock = null;\n",
    1,
)

js = replace_function_declaration(
    js,
    "makeMerchantGear",
    "  function makeMerchantGear(){if(!dbMerchantStock)throw new Error('Merchant stock owner is not configured.');return dbMerchantStock.makeGear();}",
)
js = replace_function_declaration(
    js,
    "merchantCatalog",
    "  function merchantCatalog(){if(!dbMerchantStock)throw new Error('Merchant stock owner is not configured.');return dbMerchantStock.catalog();}",
)
js = replace_function_declaration(
    js,
    "merchantPrice",
    "  function merchantPrice(base){if(!dbMerchantStock)throw new Error('Merchant stock owner is not configured.');return dbMerchantStock.price(base);}",
)
js = replace_function_declaration(
    js,
    "openMerchant",
    """  // Merchant stock/economy construction is owned by events/merchant-stock.js.\n  // This lexical adapter remains for Board/event callers inside the compatibility monolith.\n  function openMerchant(){\n    if(!dbMerchantStock)throw new Error('Merchant stock owner is not configured.');\n    if(db0646MerchantTransaction.hasActiveChoice(db0646MerchantVisit))return false;\n    const view=dbMerchantStock.buildStock();\n    currentMerchantItems=view.items;currentMerchantNotice=\"\";\n    $(\"merchantTitle\").textContent=view.title;$(\"merchantSubtitle\").textContent=view.subtitle;\n    $(\"merchantOverlay\").classList.remove(\"hidden\");renderMerchant();\n    db0646MerchantVisit=db0646MerchantTransaction.beginVisit(null,currentMerchantItems);\n  }""",
)

for name, count in expected_assignment_counts.items():
    js = remove_function_assignments(js, name, count)

capture_names = [
    "merchantCatalogV13",
    "merchantCatalogV15",
    "merchantCatalogV19Base",
    "makeMerchantGearV19Base",
    "openMerchantV19Base",
    "db0646OpenMerchantBase",
]
for capture in capture_names:
    pattern = re.compile(rf"\bconst\s+{re.escape(capture)}\s*=\s*[^;]+;")
    js, n = pattern.subn("", js)
    if n != 1:
        raise RuntimeError(f"expected one predecessor capture {capture}, removed {n}")

ui_anchor = "    const dbMerchantUiOwner=window.DiceboundMerchantUi;"
if js.count(ui_anchor) != 1:
    raise RuntimeError("Merchant UI controller anchor drifted")
stock_config = """  const dbMerchantStockOwner=window.DiceboundMerchantStock;\n  if(!dbMerchantStockOwner)throw new Error('DiceboundMerchantStock must load before dicebound.js');\n  dbMerchantStock=dbMerchantStockOwner.createController({\n    getPlayer:()=>player,getBoardLevel:()=>boardLevel,random:()=>random(),pick:list=>pick(list),\n    rollGearRarity:bonus=>rollGearRarity(bonus),generateEquipment:(rarity,slot)=>generateEquipment(rarity,slot),\n    rawSellValue:item=>v14RawSellValue(item),equipItem:item=>equipItem(item),formatBonuses:item=>formatBonuses(item),\n    getSlotLabel:slot=>SLOT_LABELS[slot],clamp:(value,min,max)=>clamp(value,min,max),eligibleUpgrades:filter=>eligibleUpgrades(filter),\n    isPowerupRarityAtLeast:(rarity,floor)=>DB_RARITIES.isPowerupRarityAtLeast(rarity,floor),\n    applyUpgrade:(up,source)=>applyUpgrade(up,source),applyRandomHighRarity:(source,announce)=>applyRandomHighRarity(source,announce)\n  });\n\n"""
js = js.replace(ui_anchor, stock_config + ui_anchor, 1)

for forbidden in [
    "merchantCatalog=function", "makeMerchantGear=function", "merchantPrice=function", "openMerchant=function",
    *capture_names,
]:
    if forbidden in js:
        raise RuntimeError(f"legacy Merchant shadow ownership remains after transform: {forbidden}")
for name in ["merchantCatalog", "makeMerchantGear", "merchantPrice", "openMerchant"]:
    count = len(re.findall(rf"\bfunction\s+{name}\s*\(", js))
    if count != 1:
        raise RuntimeError(f"expected one thin {name} declaration after transform, found {count}")
JS_PATH.write_text(js, encoding="utf-8")

index = INDEX_PATH.read_text(encoding="utf-8")
script_anchor = '<script src="js/events/merchant-transaction.js"></script>'
if index.count(script_anchor) != 1:
    raise RuntimeError("Merchant transaction script anchor drifted")
if 'js/events/merchant-stock.js' not in index:
    index = index.replace(script_anchor, script_anchor + '\n<script src="js/events/merchant-stock.js"></script>', 1)
INDEX_PATH.write_text(index, encoding="utf-8")

manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
if "merchant-stock" not in manifest["loadOrder"]:
    pos = manifest["loadOrder"].index("merchant-transactions") + 1
    manifest["loadOrder"].insert(pos, "merchant-stock")
if not any(module.get("id") == "merchant-stock" for module in manifest["modules"]):
    pos = next(i for i, module in enumerate(manifest["modules"]) if module.get("id") == "merchant-transactions") + 1
    manifest["modules"].insert(pos, {
        "id": "merchant-stock",
        "path": "js/events/merchant-stock.js",
        "domain": "events/merchant-stock-catalog-pricing-and-gear-offers",
        "status": "extracted",
        "requires": ["item-rarities", "item-equipment"],
        "provides": ["DiceboundMerchantStock"],
    })
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

fixture = {
    "sourceVersion": "0.6.6.23",
    "description": "Released Merchant overlay signatures plus exact RNG consumption captured before the 0.6.6.24 stock/economy extraction.",
    "cases": [
        {"name":"board1","signature":"1391420e","title":"Roadside Merchant","offerCount":4,"rngCalls":7,"rngState":1462090107},
        {"name":"board2","signature":"7987e95a","title":"Astral Merchant","offerCount":6,"rngCalls":12,"rngState":2080317437},
        {"name":"board3","signature":"598d0af0","title":"Impossible Merchant","offerCount":8,"rngCalls":20,"rngState":3831164434},
        {"name":"board4","signature":"c5c11337","title":"Crownroad Merchant","offerCount":10,"rngCalls":39,"rngState":26542074},
        {"name":"board5","signature":"75d2f34e","title":"Ouroboros Exchange","offerCount":11,"rngCalls":59,"rngState":2281342347},
        {"name":"board6","signature":"bfd06580","title":"Merchant at the End of Mathematics","offerCount":12,"rngCalls":33,"rngState":1955604322},
        {"name":"board4-free","signature":"d152fcb6","title":"The Merchant Owes You Everything","offerCount":10,"rngCalls":32,"rngState":1247384476},
        {"name":"board5-discount","signature":"1bd1cbfb","title":"Ouroboros Exchange","offerCount":11,"rngCalls":37,"rngState":51959829},
        {"name":"board4-nightmare","signature":"2a856bfc","title":"Crownroad Merchant","offerCount":10,"rngCalls":30,"rngState":2679971589},
        {"name":"board4-hell","signature":"adec6a06","title":"Crownroad Merchant","offerCount":10,"rngCalls":31,"rngState":556382992},
    ],
}
FIXTURE_PATH.write_text(json.dumps(fixture, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

probe = PROBE_PATH.read_text(encoding="utf-8")
probe = probe.replace(
    'const DEBUG_PORT=19417;\n',
    'const DEBUG_PORT=19417;\nconst FIXTURE=JSON.parse(fs.readFileSync(path.join(ROOT,"tools","fixtures","merchant_stock_0_6_6_23.json"),"utf8"));\n',
    1,
)
old_output = "console.log('MERCHANT_STOCK_ORACLE_BEGIN');console.log(JSON.stringify(result,null,2));console.log('MERCHANT_STOCK_ORACLE_END');"
new_output = "const expected=FIXTURE.cases;if(JSON.stringify(result.cases)!==JSON.stringify(expected)){console.error('Merchant stock oracle mismatch.');console.error('Expected:',JSON.stringify(expected,null,2));console.error('Actual:',JSON.stringify(result.cases,null,2));throw new Error('Merchant stock/output/RNG contract changed.');}console.log(`Merchant stock oracle passed: ${result.cases.length} cases match released ${FIXTURE.sourceVersion} signatures and exact RNG state.`);"
if old_output not in probe:
    raise RuntimeError("temporary Merchant probe output anchor drifted")
probe = probe.replace(old_output, new_output, 1)
TEST_PATH.write_text(probe, encoding="utf-8")
PROBE_PATH.unlink()

boundary = r'''from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
js = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")
owner = (ROOT / "runtime/js/events/merchant-stock.js").read_text(encoding="utf-8")
index = (ROOT / "runtime/index.html").read_text(encoding="utf-8")
manifest = json.loads((ROOT / "runtime/js/module-manifest.json").read_text(encoding="utf-8"))

for token in ["merchantCatalog=function", "makeMerchantGear=function", "merchantPrice=function", "openMerchant=function",
              "merchantCatalogV13", "merchantCatalogV15", "merchantCatalogV19Base", "makeMerchantGearV19Base",
              "openMerchantV19Base", "db0646OpenMerchantBase"]:
    assert token not in js, f"legacy Merchant shadow ownership returned: {token}"
for name in ["merchantCatalog", "makeMerchantGear", "merchantPrice", "openMerchant"]:
    assert len(re.findall(rf"\\bfunction\\s+{name}\\s*\\(", js)) == 1, f"expected one thin {name} adapter"
assert "dbMerchantStock.buildStock()" in js
assert "dbMerchantStockOwner.createController" in js
assert "window.DiceboundMerchantStock" in owner
for api in ["catalog", "price", "makeGear", "buildStock"]:
    assert api in owner, f"Merchant stock owner missing {api}"
assert "merchant-stock" in manifest["loadOrder"]
module = next(m for m in manifest["modules"] if m.get("id") == "merchant-stock")
assert module["path"] == "js/events/merchant-stock.js"
assert module["domain"] == "events/merchant-stock-catalog-pricing-and-gear-offers"
stock_script = '<script src="js/events/merchant-stock.js"></script>'
transaction_script = '<script src="js/events/merchant-transaction.js"></script>'
ui_script = '<script src="js/ui/merchant.js"></script>'
monolith_script = '<script src="js/dicebound.js"></script>'
assert index.count(stock_script) == 1
assert index.index(transaction_script) < index.index(stock_script) < index.index(ui_script) < index.index(monolith_script)
print("Merchant stock extraction boundary: PASS")
'''
BOUNDARY_PATH.write_text(boundary, encoding="utf-8")

print("Merchant stock extraction transform complete")
