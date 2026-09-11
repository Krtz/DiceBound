#!/usr/bin/env python3
from pathlib import Path
import json
import re

root=Path(__file__).resolve().parents[1]
mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
owner=(root/'runtime/js/ui/merchant.js').read_text(encoding='utf-8')
index=(root/'runtime/index.html').read_text(encoding='utf-8')
manifest=json.loads((root/'runtime/js/module-manifest.json').read_text(encoding='utf-8'))

assert len(re.findall(r'\bfunction\s+renderMerchant\s*\(',mono))==1, 'monolith must retain exactly one thin renderMerchant adapter'
assert not re.search(r'\brenderMerchant\s*=\s*function\b',mono), 'historical renderMerchant reassignment stack must be retired'
assert re.search(r'function\s+renderMerchant\s*\(\)\s*\{[^{}]*dbMerchantUi\.render\(\)',mono,re.S), 'renderMerchant adapter must delegate to dbMerchantUi.render()'
assert 'DiceboundMerchantUi must load before dicebound.js' in mono, 'monolith must configure the Merchant UI owner'
assert 'createController' in owner and 'DiceboundMerchantUi' in owner, 'Merchant UI owner export missing'
for token in ('tx.reservePurchase','tx.beginChoice','tx.commitPurchase','tx.cancelReservation','tx.settleChoice','services.formatGearComparison','services.confirmWeakerGear'):
    assert token in owner, f'Merchant UI owner missing frozen interaction token: {token}'
assert 'js/ui/merchant.js' in index and index.index('js/ui/merchant.js') < index.index('js/dicebound.js'), 'Merchant UI owner must load before monolith'
entry=next((m for m in manifest['modules'] if m['id']=='ui-merchant'),None)
assert entry, 'ui-merchant manifest entry missing'
assert entry['path']=='js/ui/merchant.js' and entry['status']=='extracted', 'ui-merchant manifest ownership malformed'
assert entry['requires']==['merchant-transactions'], 'Merchant UI dependency topology drifted'
assert manifest['loadOrder'].index('ui-merchant') < manifest['loadOrder'].index('dicebound-monolith'), 'Merchant UI load order must precede monolith'
print('Merchant UI extraction boundary PASS')
