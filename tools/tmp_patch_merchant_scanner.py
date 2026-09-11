from pathlib import Path

path=Path('tools/tmp_extract_merchant_ui.py')
text=path.read_text(encoding='utf-8')
start=text.index("assign_pattern = re.compile")
end=text.index("\n\nif len(re.findall(r'function renderMerchant", start)
replacement=r'''def find_function_assignments(source, name):
    import re
    starts=list(re.finditer(rf'\b{re.escape(name)}\s*=\s*function\s*\(\s*\)\s*\{{', source))
    spans=[]
    for match in starts:
        open_brace=source.find('{', match.start(), match.end())
        depth=1; i=open_brace+1; quote=None; line_comment=False; block_comment=False
        while i < len(source) and depth:
            ch=source[i]; nxt=source[i+1] if i+1 < len(source) else ''
            if line_comment:
                if ch in '\r\n': line_comment=False
                i+=1; continue
            if block_comment:
                if ch=='*' and nxt=='/': block_comment=False; i+=2; continue
                i+=1; continue
            if quote:
                if ch=='\\': i+=2; continue
                if ch==quote: quote=None
                i+=1; continue
            if ch=='/' and nxt=='/': line_comment=True; i+=2; continue
            if ch=='/' and nxt=='*': block_comment=True; i+=2; continue
            if ch in "'\"`": quote=ch; i+=1; continue
            if ch=='{': depth+=1
            elif ch=='}': depth-=1
            i+=1
        if depth: raise SystemExit(f'unterminated {name}=function assignment at offset {match.start()}')
        while i < len(source) and source[i] in ' \t': i+=1
        if i < len(source) and source[i]==';': i+=1
        if i < len(source) and source[i]=='\r': i+=1
        if i < len(source) and source[i]=='\n': i+=1
        spans.append((match.start(),i))
    return spans

assign_spans=find_function_assignments(text,'renderMerchant')
if len(assign_spans) != 6:
    raise SystemExit(f'expected exactly 6 renderMerchant replacement definitions, found {len(assign_spans)}')

config = '''  const dbMerchantUiOwner=window.DiceboundMerchantUi;\n  if(!dbMerchantUiOwner)throw new Error('DiceboundMerchantUi must load before dicebound.js');\n  dbMerchantUi=dbMerchantUiOwner.createController({\n    $:id=>$(id),\n    getPlayer:()=>player,\n    getItems:()=>currentMerchantItems,\n    getNotice:()=>currentMerchantNotice,\n    setNotice:value=>{currentMerchantNotice=value;},\n    priceFor:base=>merchantPrice(base),\n    getVisit:()=>db0646MerchantVisitForCurrentStock(),\n    transaction:db0646MerchantTransaction,\n    formatGearComparison:(item,current)=>formatGearComparison(item,current),\n    gearPowerScore:item=>gearPowerScore(item),\n    confirmWeakerGear:(gear,current)=>diceboundConfirm(`${gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`,{title:'Buy weaker gear?',confirmLabel:'Buy anyway',danger:true}),\n    chargeOffer:(item,price)=>{player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);},\n    refundOffer:price=>{player.gold+=price;},\n    applyOffer:item=>item.buy?.(),\n    recordRunBuff:item=>recordRunBuff(item.icon,item.name,item.desc,'merchant','Merchant'),\n    formatBonuses:item=>formatBonuses(item),\n    rarityInfoFor:rarity=>rarityInfo[rarity],\n    showToast:(...args)=>showToast(...args),\n    updateHud:()=>updateHUD(),\n    openLegendaryChoice:(source,done)=>db0410OpenSovereignChoice(source,done),\n    setMerchantVisible:visible=>$('merchantOverlay').classList.toggle('hidden',!visible),\n    schedule:(fn,ms)=>setTimeout(fn,ms)\n  });\n'''
# Remove all historical replacement renderers; configure the owner exactly where
# the final authoritative renderer used to be, after transaction/choice helpers exist.
parts=[];cursor=0
for idx,(span_start,span_end) in enumerate(assign_spans):
    parts.append(text[cursor:span_start])
    if idx == len(assign_spans)-1:
        parts.append(config)
    cursor=span_end
parts.append(text[cursor:])
text=''.join(parts)'''
path.write_text(text[:start]+replacement+text[end:],encoding='utf-8')
Path(__file__).unlink()
print('patched Merchant extraction transform with brace-aware renderer scanner')
