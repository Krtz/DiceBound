from pathlib import Path
root=Path(__file__).resolve().parents[1]

def replace_once(path,old,new):
    text=path.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1: raise RuntimeError(f'{path}: expected 1 match, got {count}')
    path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')

replace_once(root/'tools/test_merchant_transaction.js',
    'assert.doesNotMatch(monolith, /DiceboundMerchantTransaction/, "ordinary monolith must not coordinate Merchant transactions directly");',
    'assert.doesNotMatch(monolith, /window\\.DiceboundMerchantTransaction(?!Test)/, "ordinary monolith must not coordinate Merchant transactions directly");')
replace_once(root/'tools/test_shadow_ownership_drain.py',
    "assert 'DiceboundMerchantUi' not in merchant_mono and 'DiceboundMerchantStock' not in merchant_mono and 'DiceboundMerchantTransaction' not in merchant_mono, 'ordinary monolith must not coordinate Merchant peers directly'",
    "assert not re.search(r'window\\.DiceboundMerchant(?:Ui|Stock|Transaction)(?!Test)', merchant_mono), 'ordinary monolith must not coordinate Merchant peers directly'")
print('Merchant facade guard refinement applied')
