#!/usr/bin/env python3
import json,re
from pathlib import Path


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected one exact marker, found {count}')
    return text.replace(old,new)

def sub_once(text,pattern,repl,label,flags=0):
    out,count=re.subn(pattern,repl,text,count=1,flags=flags)
    if count!=1: raise SystemExit(f'{label}: expected one regex marker, found {count}')
    return out

# Load graph: focused operations owner is internal, public facade stays thin.
index_path=Path('runtime/index.html')
index=index_path.read_text(encoding='utf-8')
index=replace_once(index,'<script src="js/items/generation.js"></script>\n<script src="js/items/facade.js"></script>','<script src="js/items/generation.js"></script>\n<script src="js/items/operations.js"></script>\n<script src="js/items/facade.js"></script>','index operations insertion')
index_path.write_text(index,encoding='utf-8',newline='\n')

manifest_path=Path('runtime/js/module-manifest.json')
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
if any(m.get('id')=='item-operations' for m in manifest['modules']):raise SystemExit('item-operations already present')
facade_index=next(i for i,m in enumerate(manifest['modules']) if m.get('id')=='items-facade')
manifest['modules'].insert(facade_index,{
    'id':'item-operations','path':'js/items/operations.js','domain':'items/score-value-comparison-equip-operations','status':'extracted',
    'requires':['item-rarities','item-equipment'],'provides':['DiceboundItemOperations']
})
facade=next(m for m in manifest['modules'] if m.get('id')=='items-facade')
if 'item-operations' not in facade['requires']:facade['requires'].append('item-operations')
manifest['loadOrder'].insert(manifest['loadOrder'].index('items-facade'),'item-operations')
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding='utf-8',newline='\n')

js_path=Path('runtime/js/dicebound.js')
js=js_path.read_text(encoding='utf-8')

# Public facade delegates lazily to both focused internal owners.
old='''  const dbItemGenerationOwner=window.DiceboundItemGeneration;\n  if(!dbItemGenerationOwner)throw new Error("dicebound.js requires DiceboundItemGeneration before loading.");\n  const dbItems=window.DiceboundItems;\n  if(!dbItems)throw new Error("dicebound.js requires DiceboundItems before loading.");\n  let dbItemGeneration=null;\n  dbItems.configure({\n    generateEquipment:(rarity=null,slot=null)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateEquipment(rarity,slot);},\n    generateLegendary:(slot=null,preferUndiscovered=false)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateLegendary(slot,preferUndiscovered);},\n    rollGearRarity:bonus=>rollGearRarity(bonus),\n    openLoot:(item,done)=>openLoot(item,done),\n    equip:(item,silent=false)=>equipItem(item,silent),\n    sellValue:item=>itemSellValue(item),\n    rawSellValue:item=>v14RawSellValue(item),\n    score:item=>gearPowerScore(item),\n    formatBonuses:item=>formatBonuses(item),\n    formatComparison:(item,current)=>formatGearComparison(item,current)\n  });\n'''
new='''  const dbItemGenerationOwner=window.DiceboundItemGeneration;\n  if(!dbItemGenerationOwner)throw new Error("dicebound.js requires DiceboundItemGeneration before loading.");\n  const dbItemOperationsOwner=window.DiceboundItemOperations;\n  if(!dbItemOperationsOwner)throw new Error("dicebound.js requires DiceboundItemOperations before loading.");\n  const dbItems=window.DiceboundItems;\n  if(!dbItems)throw new Error("dicebound.js requires DiceboundItems before loading.");\n  let dbItemGeneration=null,dbItemOperations=null;\n  dbItems.configure({\n    generateEquipment:(rarity=null,slot=null)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateEquipment(rarity,slot);},\n    generateLegendary:(slot=null,preferUndiscovered=false)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateLegendary(slot,preferUndiscovered);},\n    rollGearRarity:bonus=>rollGearRarity(bonus),\n    openLoot:(item,done)=>openLoot(item,done),\n    equip:(item,silent=false)=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.equip(item,silent);},\n    sellValue:item=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.sellValue(item);},\n    rawSellValue:item=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.rawSellValue(item);},\n    score:item=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.score(item);},\n    formatBonuses:item=>formatBonuses(item),\n    formatComparison:(item,current)=>{if(!dbItemOperations)throw new Error('Items operations owner is not configured.');return dbItemOperations.formatComparison(item,current);}\n  });\n'''
js=replace_once(js,old,new,'Items operations facade bootstrap')

# Original operations become compatibility aliases only.
js=sub_once(js,r'''  function gearPowerScore\(item\)\{\n.*?\n  \}\n  function equipItem\(item,silent=false\)\{\n.*?\n  \}\n  function renderEquipment\(\)\{''','''  function gearPowerScore(item){return dbItems.score(item);}\n  function equipItem(item,silent=false){return dbItems.equip(item,silent);}\n  function renderEquipment(){''','base score/equip ownership',re.S)
js=sub_once(js,r'''  function itemSellValue\(item\)\{return 10\+rarityValues\[item\.rarity\]\*14\+Math\.floor\(player\.position/5\);\}\n  function closeLoot''','''  function itemSellValue(item){return dbItems.sellValue(item);}\n  function closeLoot''','base sell ownership')
js=sub_once(js,r'''  function formatGearComparison\(item,current\)\{\n.*?\n  \}\n\n  /\* #209''','''  function formatGearComparison(item,current){return dbItems.formatComparison(item,current);}\n\n  /* #209''','base comparison ownership',re.S)

# v1.2 Merchant resale wrapper is superseded by the final released policy.
js=sub_once(js,r'''  const itemSellValueV12=itemSellValue;\n  itemSellValue=function\(item\)\{const base=itemSellValueV12\(item\);return classIdentityActive\("merchant"\)\?Math\.round\(base\*2\):base;\};\n''','', 'v12 sell wrapper')

# v1.4 historical score/value captures and the intermediate score wrapper.
js=sub_once(js,r'''  const gearPowerScorePreV14=gearPowerScore;\n  function v14FallbackPower\(item\)\{.*?\}\n  function v14RawSellValue\(item\)\{.*?\}\n  itemSellValue=function\(item\)\{.*?\};\n''','', 'v14 score/value block')
js=sub_once(js,r'''  // Better item comparison: actual hidden point budget is useful internally, while players still judge the visible rolls\.\n  const gearPowerScoreV14Base=gearPowerScorePreV14;\n  gearPowerScore=function\(item\)\{.*?\};\n''','  // Item score/value ownership now lives behind DiceboundItems.\n','v14 intermediate score')

# v1.5 final hidden-budget score/comparison and automatic replacement-sale wrapper.
js=sub_once(js,r'''  const gearPowerScoreV15Visible=gearPowerScorePreV14;\n  gearPowerScore=function\(item\)\{.*?\};\n  formatGearComparison=function\(item,current\)\{.*?\};\n\n\n\n  const equipItemV15Patch=equipItem;\n  equipItem=function\(item,silent=false\)\{.*?\};\n''','', 'v15 operations wrappers')

# Shifted Beta rarity economy and final Merchant resale wrapper: exact math is
# reproduced in items/operations.js.
js=sub_once(js,r'''  v14RawSellValue=function\(item\)\{const p=v14FallbackPower\(item\),mult=\{poor:\.68,common:\.82,uncommon:\.98,rare:1\.16,epic:1\.40,legendary:2\.15,artifact:2\.6,mythical:3\.1,omega:4\.2\}\[item\?\.rarity\]\|\|1;return Math\.max\(6,Math\.round\(\(10\+p\*1\.45\+p\*p\*\.042\)\*mult\)\);\};\n  itemSellValue=function\(item\)\{return v14RawSellValue\(item\);\};\n''','', 'shifted sell formula')
js=sub_once(js,r'''  itemSellValue=function\(item\)\{const base=v14RawSellValue\(item\);return classIdentityActive\('merchant'\)\?Math\.round\(base\*2\):base;\};\n''','', 'v24 merchant sell wrapper')

# Generated Legendary score bonus and gear-transform wrapper.
js=sub_once(js,r'''  const db060GearScoreBase=gearPowerScore;\n  gearPowerScore=function\(item\)\{return db060GearScoreBase\(item\)\+\(item\?\.legendaryEffectId\?180:0\);\};\n''','', '0.6 legendary score wrapper')
js=sub_once(js,r'''  const db060EquipItemBase=equipItem;\n  equipItem=function\(item,silent=false\)\{db060ClearGearTransform\(\);const r=db060EquipItemBase\(item,silent\);db060ApplyGearTransform\(\);renderEquipment\(\);updateHUD\(\);return r;\};\n''','', '0.6 transform equip wrapper')

# Equipment identity/intrinsic final score and comparison wrappers.
js=sub_once(js,r'''  const db06314GearScoreBase=gearPowerScore;\n  gearPowerScore=function\(item\)\{\n.*?\n  \};\n  formatGearComparison=function\(item,current\)\{\n.*?\n  \};\n''','', '0.6.3.14 intrinsic score/comparison',re.S)

# The 0.6.4.21 Mana wrapper was the outermost equip layer. Replace it with the
# single final operations composition, preserving all historical call order.
pattern=r'''  const db06421EquipItemBase=equipItem;\n  equipItem=function\(item,silent=false\)\{\n    const priorEquipmentMana=db06421UsesMana\(\)\?db06421EquipmentMana\(\):0,baseMaxMana=Math\.max\(0,\(Number\(player\.maxMana\)\|\|0\)-priorEquipmentMana\),currentMana=Number\(player\.mana\)\|\|0;\n    const result=db06421EquipItemBase\(item,silent\);\n    db06421SyncMana\(\{baseMaxMana,currentMana\}\);\n    return result;\n  \};'''
replacement='''  dbItemOperations=dbItemOperationsOwner.createController({\n    getPlayer:()=>player,getMeta:()=>meta,rarityValues,equipmentApi:db06314Equipment,\n    classIdentityActive:id=>classIdentityActive(id),bonusLabel:(key,value)=>db06314BonusLabel(key,value),\n    applyItemStats:(item,sign)=>applyItemStats(item,sign),clearGearTransform:()=>db060ClearGearTransform(),applyGearTransform:()=>db060ApplyGearTransform(),\n    usesMana:()=>db06421UsesMana(),equipmentMana:()=>db06421EquipmentMana(),syncMana:snapshot=>db06421SyncMana(snapshot),\n    ensureAlphaMeta:()=>ensureAlphaMeta(),setStatsLastGold:value=>{statsLastGold=value;},rarityLabel:rarity=>rarityInfo[rarity].label,\n    sfxLevel:()=>sfx.level(),sfxCoin:()=>sfx.coin(),showToast:text=>showToast(text),addLog:text=>addLog(text),\n    renderEquipment:()=>renderEquipment(),updateHUD:()=>updateHUD()\n  });'''
js=sub_once(js,pattern,replacement,'final operations composition')

js_path.write_text(js,encoding='utf-8',newline='\n')
print('Items operations owner migration staged.')
