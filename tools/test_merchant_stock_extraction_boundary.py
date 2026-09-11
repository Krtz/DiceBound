from pathlib import Path
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
    assert js.count(f"function {name}(") == 1, f"expected one thin {name} adapter"
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
