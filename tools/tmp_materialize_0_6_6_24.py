from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

changelog = ROOT / "CHANGELOG.md"
text = changelog.read_text(encoding="utf-8")
if "## Beta 0.6.6.24" not in text:
    entry = '''## Beta 0.6.6.24

### Merchant Stock / Economy Resolution ownership (#318)
- `events/merchant-stock.js` is now the authoritative Merchant catalog, pricing, generated-gear offer and stock-composition owner for Boards 1–6; transaction atomicity remains in `events/merchant-transaction.js` and presentation remains in `ui/merchant.js`.
- Removed the historical Merchant stock/economy patch ladder from `dicebound.js`: three `merchantCatalog` replacements, four `makeMerchantGear` replacements, the late pricing replacement and three `openMerchant` replacements are retired, leaving thin compatibility delegates plus one composition adapter.
- A frozen 10-case Beta 0.6.6.23 Windows Edge oracle pins complete Merchant stock signatures and exact RNG consumption across Boards 1–6, free-Merchant pricing, shop discount, Nightmare and Hell.
- Architecture-only: no Merchant balance, rarity odds, prices, item counts, Board routing, transaction, save/checkpoint or secret-boss behavior change is intended. The compatibility monolith drops from 752,414 bytes / 7,465 physical lines to 748,359 bytes / 7,432 physical lines before release metadata.

'''
    marker = "## Beta 0.6.6.23\n"
    if marker not in text:
        raise SystemExit("CHANGELOG insertion marker not found")
    text = text.replace(marker, entry + marker, 1)
    changelog.write_text(text, encoding="utf-8")

patch = ROOT / "runtime" / "PATCH_NOTES.md"
text = patch.read_text(encoding="utf-8")
if not text.startswith("# Unreleased — Beta 0.6.6.24"):
    entry = '''# Unreleased — Beta 0.6.6.24

## Beta 0.6.6.24 Merchant Stock / Economy Resolution ownership (#318)
- `events/merchant-stock.js` now owns Boards 1–6 Merchant catalogs, price calculation, generated gear offers and exact stock construction while Merchant transactions and UI remain in their existing explicit owners.
- The canonical Merchant functions now delegate through one configured stock/economy controller, and the historical catalog/gear/price/open replacement ladders and predecessor captures are removed from `dicebound.js`.
- A permanent 10-case Windows Edge oracle compares released 0.6.6.23 Merchant stock signatures plus exact RNG-call counts/final RNG state for Boards 1–6, free Merchant, discount, Nightmare and Hell paths; a static boundary guard rejects shadow ownership returning.
- No Merchant balance, RNG, Board, transaction, save/checkpoint, secret-boss or presentation redesign is intended. `dicebound.js` measures 748,359 bytes / 7,432 physical lines before release metadata, down from 752,414 / 7,465 in 0.6.6.23.

'''
    patch.write_text(entry + text, encoding="utf-8")

print("Beta 0.6.6.24 notes staged")
