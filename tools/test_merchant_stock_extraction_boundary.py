from pathlib import Path
import json
import re

from audit_monolith_shadow_ownership import mask_non_code

ROOT = Path(__file__).resolve().parents[1]
js = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")
owner = (ROOT / "runtime/js/events/merchant-stock.js").read_text(encoding="utf-8")
facade = (ROOT / "runtime/js/events/merchant-facade.js").read_text(encoding="utf-8")
index = (ROOT / "runtime/index.html").read_text(encoding="utf-8")
manifest = json.loads((ROOT / "runtime/js/module-manifest.json").read_text(encoding="utf-8"))
js_code = mask_non_code(js)

# Wave 10 completed the Merchant caller drain: ordinary composition no longer
# keeps call-only catalog/gear/price/open adapters. Merchant stock behavior is
# internal to DiceboundMerchantStock and exposed to callers through the public
# DiceboundMerchant facade.
for token in ["merchantCatalog=function", "makeMerchantGear=function", "merchantPrice=function", "openMerchant=function",
              "merchantCatalogV13", "merchantCatalogV15", "merchantCatalogV19Base", "makeMerchantGearV19Base",
              "openMerchantV19Base", "db0646OpenMerchantBase"]:
    assert token not in js, f"legacy Merchant shadow ownership returned: {token}"
for name in ["merchantCatalog", "makeMerchantGear", "merchantPrice", "openMerchant"]:
    assert not re.search(rf"\bfunction\s+{re.escape(name)}\s*\(", js_code), f"retired monolith {name} adapter returned"

assert "const dbMerchantOwner=window.DiceboundMerchant;" in js
assert "dbMerchantOwner.configure" in js
assert "openMerchant:()=>dbMerchant.open()" in js
assert "DiceboundMerchantStock" not in js, "ordinary monolith must not coordinate Merchant stock directly"

for fragment in [
    "const stockOwner=window.DiceboundMerchantStock;",
    "stockOwner.createController",
    "function catalog(){return requireStock().catalog();}",
    "function price(base){return requireStock().price(base);}",
    "function makeGear(){return requireStock().makeGear();}",
    "function buildStock(){return requireStock().buildStock();}",
    "function open()",
    "const api=Object.freeze({configure,catalog,price,makeGear,buildStock,render,open,inspect,testing,owner:OWNER});",
    "window.DiceboundMerchant=api",
]:
    assert fragment in facade, f"Merchant facade ownership/routing missing: {fragment}"

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
facade_script = '<script src="js/events/merchant-facade.js"></script>'
monolith_script = '<script src="js/dicebound.js"></script>'
assert index.count(stock_script) == 1
assert index.index(transaction_script) < index.index(stock_script) < index.index(ui_script) < index.index(facade_script) < index.index(monolith_script)
print("Merchant stock extraction boundary PASS: stock/catalog ownership stays behind DiceboundMerchant and retired monolith adapters remain absent")
