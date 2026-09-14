from pathlib import Path

CHANGELOG=Path('CHANGELOG.md')
PATCH_NOTES=Path('runtime/PATCH_NOTES.md')

changelog=CHANGELOG.read_text(encoding='utf-8')
anchor="This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n"
entry="""## Beta 0.6.6.30

### Merchant subsystem facade and ownership (#321)
- Added `runtime/js/events/merchant-facade.js` as the ordinary public `DiceboundMerchant` boundary while retaining the existing focused stock/economy, transaction and Merchant UI modules as specialist internals.
- Routed Merchant catalog/pricing/generated offers, visit transaction state, Legendary-choice settlement and rendering/input entry points through the facade; `dicebound.js` no longer coordinates `DiceboundMerchantStock`, `DiceboundMerchantTransaction` and `DiceboundMerchantUi` as peer public owners.
- Added a permanent focused Merchant facade contract and strengthened anti-shadow boundaries while retaining the existing 10-case exact Merchant stock/output/RNG oracle, transaction tests and real Edge purchase regression.
- Architecture-only: no Merchant stock, prices, discounts, free-Merchant behavior, Nightmare/Hell behavior, Legendary-choice semantics, weaker-gear confirmation/refund behavior, RNG, save/checkpoint behavior or UI redesign is intended. Runtime graph is 80 modules (79 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 675,407 bytes / 6,996 physical lines versus 676,782 bytes / 7,025 lines in released 0.6.6.29.

"""
if '## Beta 0.6.6.30' in changelog:
    raise SystemExit('CHANGELOG already contains Beta 0.6.6.30')
if changelog.count(anchor)!=1:
    raise SystemExit('CHANGELOG anchor mismatch')
CHANGELOG.write_text(changelog.replace(anchor,anchor+entry,1),encoding='utf-8',newline='\n')

notes=PATCH_NOTES.read_text(encoding='utf-8')
notes_entry="""# Unreleased — Beta 0.6.6.30

## Beta 0.6.6.30 Merchant subsystem ownership (#321)
- `DiceboundMerchant` is now the ordinary public Merchant boundary over focused stock/economy, transaction and UI internals; ordinary runtime callers no longer coordinate those three peer owners directly.
- Merchant catalog/pricing/generated offers, visit transaction state, Legendary-choice settlement and rendering/input entry points route through the facade while the specialist modules remain authoritative internals.
- A focused facade contract plus strengthened anti-shadow guards freeze the public boundary, while the existing 10-case exact Merchant stock/output/RNG oracle, transaction suite and real Edge purchase regression preserve released behavior.
- No Merchant balance, stock composition, prices, discounts, free-Merchant behavior, Nightmare/Hell behavior, Legendary-choice semantics, weaker-gear confirmation/refund behavior, RNG order/state, save/checkpoint behavior or UI redesign is intended. Runtime graph is 80 modules (79 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 675,407 bytes / 6,996 lines.

"""
if notes.startswith('# Unreleased — Beta 0.6.6.30'):
    raise SystemExit('PATCH_NOTES already contains Beta 0.6.6.30')
PATCH_NOTES.write_text(notes_entry+notes,encoding='utf-8',newline='\n')

print('0.6.6.30 release notes staged.')
