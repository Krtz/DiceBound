from pathlib import Path

path=Path('tools/tmp_extract_merchant_ui.py')
text=path.read_text(encoding='utf-8')
old='Object.defineProperty(window,"DiceboundMerchantUi",{value:api,enumerable:true,configurable:false,writable:false});'
new='window.DiceboundMerchantUi=api;'
if old not in text:
    raise SystemExit('Merchant UI export patch point missing')
text=text.replace(old,new,1)
text=text.replace("merchant_mono=(ROOT/'runtime/js/dicebound.js')", "merchant_mono=(root/'runtime/js/dicebound.js')")
text=text.replace("merchant_owner=(ROOT/'runtime/js/ui/merchant.js')", "merchant_owner=(root/'runtime/js/ui/merchant.js')")
write="MONO.write_text(text, encoding='utf-8')"
if write not in text:
    raise SystemExit('monolith write patch point missing')
text=text.replace(write,"text=re.sub(r'[ \\t]+(?=\\r?\\n)', '', text)\nMONO.write_text(text, encoding='utf-8')",1)
path.write_text(text,encoding='utf-8')
Path(__file__).unlink()
print('patched Merchant extraction export, shadow guard root and whitespace cleanup')
