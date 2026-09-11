from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / 'runtime/js/dicebound.js'
INDEX = ROOT / 'runtime/index.html'
MANIFEST = ROOT / 'runtime/js/module-manifest.json'
TX_TEST = ROOT / 'tools/test_merchant_transaction.js'
SHADOW = ROOT / 'tools/test_shadow_ownership_drain.py'
OWNER = ROOT / 'runtime/js/ui/merchant.js'
BOUNDARY = ROOT / 'tools/test_merchant_ui_extraction_boundary.py'

owner_source = r'''(() => {
  "use strict";

  function isLegendaryChoiceOffer(item){
    return !!item?.alphaChooseLegendary || /Sovereign Relic|Legendary Contract/i.test(item?.name || "");
  }

  function createController(services={}){
    const required=["$","getPlayer","getItems","getNotice","setNotice","priceFor","getVisit","transaction","formatGearComparison","gearPowerScore","confirmWeakerGear","chargeOffer","refundOffer","applyOffer","recordRunBuff","formatBonuses","rarityInfoFor","showToast","updateHud","openLegendaryChoice","setMerchantVisible"];
    for(const name of required)if(!services[name])throw new Error(`Merchant UI requires ${name}`);
    const schedule=services.schedule||((fn,ms)=>setTimeout(fn,ms));
    const tx=services.transaction;

    function render(){
      const visit=services.getVisit(),player=services.getPlayer(),items=services.getItems();
      services.$("merchantGold").textContent=player.gold;
      const notice=services.$("merchantNotice");notice.classList.toggle("show",!!services.getNotice());notice.innerHTML=services.getNotice();
      const grid=services.$("shopGrid");grid.innerHTML="";
      items.forEach((item,index)=>{
        const key=tx.offerKey(item,index),price=services.priceFor(item.base),sold=item.sold||!tx.canPurchase(visit,key),btn=document.createElement("button");
        btn.className=`shop-item${sold?" sold":""}`;btn.disabled=sold||player.gold<price;
        const comparison=item.gear?`<div class="shop-compare">${services.formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:"";
        btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${sold?"SOLD":price+"g"}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;
        btn.addEventListener("click",async()=>{
          const livePlayer=services.getPlayer();
          if(item.sold||livePlayer.gold<price)return;
          const reservation=tx.reservePurchase(visit,key);if(!reservation.ok)return;
          if(item.gear){
            const current=livePlayer.equipment[item.gear.slot];
            if(current&&services.gearPowerScore(item.gear)<services.gearPowerScore(current)&&!(await services.confirmWeakerGear(item.gear,current))){tx.cancelReservation(visit,reservation.token);render();return;}
          }
          if(services.getPlayer().gold<price){tx.cancelReservation(visit,reservation.token);render();return;}
          const chooser=isLegendaryChoiceOffer(item),purchase=chooser?tx.beginChoice(visit,reservation.token):tx.commitPurchase(visit,reservation.token);
          if(!purchase.ok){tx.cancelReservation(visit,reservation.token);return;}
          services.chargeOffer(item,price);
          if(chooser){
            services.setNotice(`<b>${item.name} purchased.</b> Choose one Legendary power.`);render();services.setMerchantVisible(false);
            schedule(()=>{
              if(!tx.hasActiveChoice(visit))return;
              services.openLegendaryChoice(item.name||"Legendary Contract",chosen=>{
                if(!tx.settleChoice(visit,purchase.token).ok)return;
                if(!chosen){services.refundOffer(price);services.setNotice(`No eligible Legendary powers remain; ${price} gold was refunded. This Merchant offer remains sold.`);}
                else services.setNotice(`<b>${item.name} claimed:</b> ${chosen.name}.`);
                services.setMerchantVisible(true);services.showToast(chosen?`Legendary: ${chosen.name}`:"Relic refunded");services.updateHud();render();
              });
            },0);
            return;
          }
          const result=services.applyOffer(item);
          if(item.id==="relic"&&result){const rarity=services.rarityInfoFor(result.rarity);services.setNotice(`<b>Relic opened:</b> ${rarity.label} <b>${result.name}</b><br>${result.desc}`);}
          else if(item.gear)services.setNotice(`Equipped <b>${item.gear.name}</b>.<br>${services.formatBonuses(item.gear)}`);
          if(["attack","armor","charm"].includes(item.id))services.recordRunBuff(item);
          const rarity=item.id==="relic"&&result?services.rarityInfoFor(result.rarity):null;
          services.showToast(rarity?`${rarity.label}: ${result.name}`:item.name);services.updateHud();render();
        });
        grid.appendChild(btn);
      });
      return visit;
    }

    return Object.freeze({render,isLegendaryChoiceOffer});
  }

  const api=Object.freeze({apiVersion:1,createController,isLegendaryChoiceOffer});
  Object.defineProperty(window,"DiceboundMerchantUi",{value:api,enumerable:true,configurable:false,writable:false});
})();
'''
OWNER.write_text(owner_source, encoding='utf-8')

text = MONO.read_text(encoding='utf-8')
base_pattern = re.compile(r'^  function renderMerchant\(\)\{.*?^  \}\r?\n', re.M | re.S)
base_matches = list(base_pattern.finditer(text))
if len(base_matches) != 1:
    raise SystemExit(f'expected exactly 1 base renderMerchant declaration, found {len(base_matches)}')
adapter = '''  // Merchant presentation is owned by ui/merchant.js; this lexical adapter\n  // remains only for legacy callers inside the compatibility monolith.\n  let dbMerchantUi=null;\n  function renderMerchant(){\n    if(!dbMerchantUi)throw new Error('Merchant UI owner is not configured.');\n    return dbMerchantUi.render();\n  }\n'''
text = base_pattern.sub(adapter, text, count=1)

assign_pattern = re.compile(r'^  renderMerchant=function\(\)\{.*?^  \};\r?\n', re.M | re.S)
assign_matches = list(assign_pattern.finditer(text))
if len(assign_matches) != 6:
    raise SystemExit(f'expected exactly 6 renderMerchant replacement definitions, found {len(assign_matches)}')

config = '''  const dbMerchantUiOwner=window.DiceboundMerchantUi;\n  if(!dbMerchantUiOwner)throw new Error('DiceboundMerchantUi must load before dicebound.js');\n  dbMerchantUi=dbMerchantUiOwner.createController({\n    $:id=>$(id),\n    getPlayer:()=>player,\n    getItems:()=>currentMerchantItems,\n    getNotice:()=>currentMerchantNotice,\n    setNotice:value=>{currentMerchantNotice=value;},\n    priceFor:base=>merchantPrice(base),\n    getVisit:()=>db0646MerchantVisitForCurrentStock(),\n    transaction:db0646MerchantTransaction,\n    formatGearComparison:(item,current)=>formatGearComparison(item,current),\n    gearPowerScore:item=>gearPowerScore(item),\n    confirmWeakerGear:(gear,current)=>diceboundConfirm(`${gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`,{title:'Buy weaker gear?',confirmLabel:'Buy anyway',danger:true}),\n    chargeOffer:(item,price)=>{player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);},\n    refundOffer:price=>{player.gold+=price;},\n    applyOffer:item=>item.buy?.(),\n    recordRunBuff:item=>recordRunBuff(item.icon,item.name,item.desc,'merchant','Merchant'),\n    formatBonuses:item=>formatBonuses(item),\n    rarityInfoFor:rarity=>rarityInfo[rarity],\n    showToast:(...args)=>showToast(...args),\n    updateHud:()=>updateHUD(),\n    openLegendaryChoice:(source,done)=>db0410OpenSovereignChoice(source,done),\n    setMerchantVisible:visible=>$('merchantOverlay').classList.toggle('hidden',!visible),\n    schedule:(fn,ms)=>setTimeout(fn,ms)\n  });\n'''
# Remove all historical replacement renderers; configure the owner exactly where
# the final authoritative renderer used to be, after transaction/choice helpers exist.
parts=[];cursor=0
for idx,m in enumerate(assign_matches):
    parts.append(text[cursor:m.start()])
    if idx == len(assign_matches)-1:
        parts.append(config)
    cursor=m.end()
parts.append(text[cursor:])
text=''.join(parts)

if len(re.findall(r'function renderMerchant\s*\(', text)) != 1:
    raise SystemExit('post-transform monolith must retain exactly one renderMerchant adapter')
if re.search(r'renderMerchant\s*=\s*function', text):
    raise SystemExit('post-transform monolith still contains renderMerchant replacement ownership')
MONO.write_text(text, encoding='utf-8')

index = INDEX.read_text(encoding='utf-8')
needle='<script src="js/ui/info-guide.js"></script>\n<script src="js/dicebound.js"></script>'
replacement='<script src="js/ui/info-guide.js"></script>\n<script src="js/ui/merchant.js"></script>\n<script src="js/dicebound.js"></script>'
if needle not in index: raise SystemExit('index Merchant insertion point missing')
INDEX.write_text(index.replace(needle,replacement,1),encoding='utf-8')

manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
if 'ui-merchant' in manifest['loadOrder']: raise SystemExit('ui-merchant already in manifest')
mono_index=manifest['loadOrder'].index('dicebound-monolith')
manifest['loadOrder'].insert(mono_index,'ui-merchant')
module_ids=[m['id'] for m in manifest['modules']]
mono_module_index=module_ids.index('dicebound-monolith')
manifest['modules'].insert(mono_module_index,{
  'id':'ui-merchant','path':'js/ui/merchant.js','domain':'ui/merchant-offer-presentation-and-purchase-interaction-orchestration','status':'extracted','requires':['merchant-transactions'],'provides':['DiceboundMerchantUi']
})
MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

# Move transaction wiring assertions to the actual presentation owner while
# retaining the monolith's visit-lifecycle assertion.
tx=TX_TEST.read_text(encoding='utf-8')
tx=tx.replace('const monolith = fs.readFileSync("runtime/js/dicebound.js", "utf8");','const monolith = fs.readFileSync("runtime/js/dicebound.js", "utf8");\nconst merchantUi = fs.readFileSync("runtime/js/ui/merchant.js", "utf8");')
tx=tx.replace('assert.match(monolith, /db0646MerchantTransaction\\.beginChoice/, "Sovereign choice is not transaction-guarded");','assert.match(merchantUi, /tx\\.beginChoice/, "Sovereign choice is not transaction-guarded by the Merchant UI owner");')
tx=tx.replace('assert.match(monolith, /db0646MerchantTransaction\\.beginVisit/, "Merchant re-entry is not transaction-guarded");','assert.match(monolith, /db0646MerchantTransaction\\.beginVisit/, "Merchant re-entry is not transaction-guarded");\nassert.match(monolith, /function renderMerchant\\(\\)\\{[\\s\\S]*?dbMerchantUi\\.render\\(\\)/, "compatibility renderer is not a thin Merchant UI adapter");\nassert.doesNotMatch(monolith, /renderMerchant\\s*=\\s*function/, "historical Merchant renderer replacement ownership returned to the monolith");\nassert.match(merchantUi, /tx\\.reservePurchase/, "Merchant UI owner must reserve offers through the transaction owner");\nassert.match(merchantUi, /tx\\.settleChoice/, "Merchant UI owner must settle Legendary choices through the transaction owner");')
TX_TEST.write_text(tx,encoding='utf-8')

boundary = r'''#!/usr/bin/env python3
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
'''
BOUNDARY.write_text(boundary,encoding='utf-8')

shadow=SHADOW.read_text(encoding='utf-8')
marker='MERCHANT_UI_OWNERSHIP_GUARD'
if marker not in shadow:
    shadow += r'''

# MERCHANT_UI_OWNERSHIP_GUARD — #313 / Beta 0.6.6.23
merchant_mono=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
merchant_owner=(ROOT/'runtime/js/ui/merchant.js').read_text(encoding='utf-8')
assert len(re.findall(r'\bfunction\s+renderMerchant\s*\(',merchant_mono))==1, 'Merchant rendering must retain exactly one compatibility adapter'
assert not re.search(r'\brenderMerchant\s*=\s*function\b',merchant_mono), 'Merchant renderer replacement stack returned to monolith'
assert 'dbMerchantUi.render()' in merchant_mono, 'Merchant compatibility adapter no longer delegates to ui/merchant.js'
assert 'DiceboundMerchantUi' in merchant_owner and 'createController' in merchant_owner, 'Merchant UI owner missing'
'''
SHADOW.write_text(shadow,encoding='utf-8')

# Temporary extraction machinery must not survive the generated commit.
(ROOT/'.github/workflows/tmp-merchant-ui-extract.yml').unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)

print(f'Merchant UI extraction staged: monolith={MONO.stat().st_size} bytes / {len(MONO.read_text(encoding="utf-8").splitlines())} lines')
