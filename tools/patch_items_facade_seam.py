#!/usr/bin/env python3
import json
from pathlib import Path

# runtime/index.html
index_path=Path('runtime/index.html')
index=index_path.read_text(encoding='utf-8')
needle='<script src="js/items/consumables.js"></script>\n<script src="js/progression/talents.js"></script>'
replacement='<script src="js/items/consumables.js"></script>\n<script src="js/items/facade.js"></script>\n<script src="js/progression/talents.js"></script>'
if index.count(needle)!=1: raise SystemExit(f'index Items insertion marker count={index.count(needle)}')
index=index.replace(needle,replacement)
index_path.write_text(index,encoding='utf-8',newline='\n')

# runtime/js/module-manifest.json
manifest_path=Path('runtime/js/module-manifest.json')
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
if any(m.get('id')=='items-facade' for m in manifest['modules']): raise SystemExit('items-facade already present')
idx=next(i for i,m in enumerate(manifest['modules']) if m.get('id')=='item-consumables')+1
manifest['modules'].insert(idx,{
    'id':'items-facade','path':'js/items/facade.js','domain':'items/public-items-subsystem-facade','status':'extracted',
    'requires':['item-rarities','item-equipment','item-consumables'],'provides':['DiceboundItems']
})
for module_id in ('road-event-treasure','merchant-stock'):
    module=next(m for m in manifest['modules'] if m.get('id')==module_id)
    module['requires']=[r for r in module.get('requires',[]) if r not in ('item-rarities','item-equipment')]
    if 'items-facade' not in module['requires']: module['requires'].append('items-facade')
monolith=next(m for m in manifest['modules'] if m.get('path')=='js/dicebound.js')
if 'items-facade' not in monolith.get('requires',[]): monolith['requires'].append('items-facade')
load=manifest['loadOrder']
load.insert(load.index('item-consumables')+1,'items-facade')
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding='utf-8',newline='\n')

# runtime/js/dicebound.js
js_path=Path('runtime/js/dicebound.js')
js=js_path.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global js
    count=js.count(old)
    if count!=1: raise SystemExit(f'{label}: expected one marker, found {count}')
    js=js.replace(old,new)

old_top='''  const dbRun=window.DiceboundRun;\n  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");\n  const dbRoadEvents=window.DiceboundRoadEvents;\n'''
new_top='''  const dbRun=window.DiceboundRun;\n  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");\n  const dbItems=window.DiceboundItems;\n  if(!dbItems)throw new Error("dicebound.js requires DiceboundItems before loading.");\n  dbItems.configure({\n    generateEquipment:(rarity=null,slot=null)=>generateEquipment(rarity,slot),\n    generateLegendary:(slot=null,preferUndiscovered=false)=>db060GenerateLegendary(slot,preferUndiscovered),\n    rollGearRarity:bonus=>rollGearRarity(bonus),\n    openLoot:(item,done)=>openLoot(item,done),\n    equip:(item,silent=false)=>equipItem(item,silent),\n    sellValue:item=>itemSellValue(item),\n    rawSellValue:item=>v14RawSellValue(item),\n    score:item=>gearPowerScore(item),\n    formatBonuses:item=>formatBonuses(item),\n    formatComparison:(item,current)=>formatGearComparison(item,current)\n  });\n  const dbRoadEvents=window.DiceboundRoadEvents;\n'''
replace_once(old_top,new_top,'Items facade bootstrap')

for old,new,label in [
    ('      rollGearRarity:bonus=>rollGearRarity(bonus),\n      generateEquipment:rarity=>generateEquipment(rarity),\n      openLoot:(item,done)=>openLoot(item,done),\n      generateLegendary:(slot,preferUndiscovered)=>db060GenerateLegendary(slot,preferUndiscovered)',
     '      rollGearRarity:bonus=>dbItems.rollGearRarity(bonus),\n      generateEquipment:rarity=>dbItems.generateEquipment(rarity),\n      openLoot:(item,done)=>dbItems.openLoot(item,done),\n      generateLegendary:(slot,preferUndiscovered)=>dbItems.generateLegendary(slot,preferUndiscovered)',
     'Road Events Items collaboration'),
    ('    rollGearRarity:bonus=>rollGearRarity(bonus),generateEquipment:(rarity,slot)=>generateEquipment(rarity,slot),\n    rawSellValue:item=>v14RawSellValue(item),equipItem:item=>equipItem(item),formatBonuses:item=>formatBonuses(item),',
     '    rollGearRarity:bonus=>dbItems.rollGearRarity(bonus),generateEquipment:(rarity,slot)=>dbItems.generateEquipment(rarity,slot),\n    rawSellValue:item=>dbItems.rawSellValue(item),equipItem:item=>dbItems.equip(item),formatBonuses:item=>dbItems.formatBonuses(item),',
     'Merchant Items collaboration'),
    ('    equipItem:(item,silent=false)=>equipItem(item,silent),gameplayTalentRank:id=>gameplayTalentRank(id),generateEquipment:(rarity,slot)=>generateEquipment(rarity,slot),',
     '    equipItem:(item,silent=false)=>dbItems.equip(item,silent),gameplayTalentRank:id=>gameplayTalentRank(id),generateEquipment:(rarity,slot)=>dbItems.generateEquipment(rarity,slot),',
     'Run initialization Items collaboration')
]: replace_once(old,new,label)

js_path.write_text(js,encoding='utf-8',newline='\n')
print('Items facade seam staged: manifest/index + Road Events/Merchant/Run caller routing.')
