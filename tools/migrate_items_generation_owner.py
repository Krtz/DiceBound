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

# Runtime load graph.
index_path=Path('runtime/index.html')
index=index_path.read_text(encoding='utf-8')
index=replace_once(index,'<script src="js/items/consumables.js"></script>\n<script src="js/items/facade.js"></script>','<script src="js/items/consumables.js"></script>\n<script src="js/items/generation.js"></script>\n<script src="js/items/facade.js"></script>','index generation insertion')
index_path.write_text(index,encoding='utf-8',newline='\n')

manifest_path=Path('runtime/js/module-manifest.json')
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
if any(m.get('id')=='item-generation' for m in manifest['modules']): raise SystemExit('item-generation already present')
facade_index=next(i for i,m in enumerate(manifest['modules']) if m.get('id')=='items-facade')
manifest['modules'].insert(facade_index,{
    'id':'item-generation','path':'js/items/generation.js','domain':'items/ordinary-generated-legendary-and-compatibility-generation','status':'extracted',
    'requires':['item-rarities','item-equipment'],'provides':['DiceboundItemGeneration']
})
facade=next(m for m in manifest['modules'] if m.get('id')=='items-facade')
if 'item-generation' not in facade['requires']: facade['requires'].append('item-generation')
load=manifest['loadOrder']; load.insert(load.index('items-facade'),'item-generation')
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding='utf-8',newline='\n')

js_path=Path('runtime/js/dicebound.js')
js=js_path.read_text(encoding='utf-8')

old_top='''  const dbItems=window.DiceboundItems;\n  if(!dbItems)throw new Error("dicebound.js requires DiceboundItems before loading.");\n  dbItems.configure({\n    generateEquipment:(rarity=null,slot=null)=>generateEquipment(rarity,slot),\n    generateLegendary:(slot=null,preferUndiscovered=false)=>db060GenerateLegendary(slot,preferUndiscovered),\n'''
new_top='''  const dbItemGenerationOwner=window.DiceboundItemGeneration;\n  if(!dbItemGenerationOwner)throw new Error("dicebound.js requires DiceboundItemGeneration before loading.");\n  const dbItems=window.DiceboundItems;\n  if(!dbItems)throw new Error("dicebound.js requires DiceboundItems before loading.");\n  let dbItemGeneration=null;\n  dbItems.configure({\n    generateEquipment:(rarity=null,slot=null)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateEquipment(rarity,slot);},\n    generateLegendary:(slot=null,preferUndiscovered=false)=>{if(!dbItemGeneration)throw new Error('Items generation owner is not configured.');return dbItemGeneration.generateLegendary(slot,preferUndiscovered);},\n'''
js=replace_once(js,old_top,new_top,'Items composition bootstrap')

# Original pre-v1.4 generator becomes a compatibility alias only.
pattern=r'''  function generateEquipment\(forceRarity=null,forcedSlot=null\)\{\n.*?\n  \}\n  function generateMythicalBoots\(\)\{'''
replacement='''  function generateEquipment(forceRarity=null,forcedSlot=null){return dbItems.generateEquipment(forceRarity,forcedSlot);}\n  function generateMythicalBoots(){'''
js=sub_once(js,pattern,replacement,'legacy generator body',re.S)

# Retire v1.4 generator implementation; its non-generator helpers remain collaborators.
pattern=r'''  const generateEquipmentV13=generateEquipment;\n  generateEquipment=function\(forceRarity=null,forcedSlot=null\)\{\n.*?\n  \};\n\n  const gearPowerScorePreV14=gearPowerScore;'''
js=sub_once(js,pattern,'  const gearPowerScorePreV14=gearPowerScore;', 'v14 generator wrapper', re.S)

# Retire the v1.5 wrapper; the seed/parser helpers remain authoritative collaborators.
js=sub_once(js,r'''  generateEquipment=function\(forceRarity=null,forcedSlot=null\)\{const rarity=forceRarity\|\|rollGearRarity\(0\);if\(!V14_RARITY_BUDGETS\[rarity\]\)return generateEquipmentV13\(forceRarity,forcedSlot\);const slot=forcedSlot\|\|pick\(EQUIPMENT_SLOTS\),classId=player\.classId,qualityBoost=Math\.min\(8,Math\.floor\(\(boardLevel-1\)\*1\.5\+player\.position/32\)\),core=`\$\{Math\.floor\(random\(\)\*0xffffffff\)\.toString\(36\)\}\$\{Math\.floor\(random\(\)\*0xffffffff\)\.toString\(36\)\}`,code=v15SeedCode\(rarity,slot,classId,qualityBoost,core\);return v15GenerateEquipmentFromSeedCode\(code\);\};\n''','', 'v15 generator wrapper')

# Retire v2.4 demotion wrapper while keeping the current sell-value assignment.
pattern=r'''  const generateEquipmentV24OrdinaryBase=generateEquipment;\n  generateEquipment=function\(forceRarity=null,forcedSlot=null\)\{\n    if\(forceRarity&&\['legendary','artifact','mythical','omega'\]\.includes\(forceRarity\)\)forceRarity='epic';\n    return generateEquipmentV24OrdinaryBase\(forceRarity,forcedSlot\);\n  \};\n'''
js=sub_once(js,pattern,'','v24 generator wrapper')

# Retire v2.5.1 no-null wrapper; its exact behavior is reproduced by the Items owner.
pattern=r'''  // Equipment generation should \*never\* return null to a caller\. If any future\n  // rarity/parser mismatch slips through, transparently fall back to a Common\n  // item and log enough context to identify the bad request\.\n  const generateEquipmentV251Base=generateEquipment;\n  generateEquipment=function\(forceRarity=null,forcedSlot=null\)\{\n.*?\n  \};\n\n  // Loot UI is also defensive now\.'''
js=sub_once(js,pattern,'  // Equipment no-null compatibility is owned by items/generation.js.\n\n  // Loot UI is also defensive now.','v251 generator wrapper',re.S)

# Replace 0.6 generated-Legendary implementation + final wrapper with owner composition.
pattern=r'''  const DB060_LEGENDARY_EFFECTS=Object\.freeze\(\[\n.*?\n  \};\n\n  // Generated Legendary effects count as real item value in comparisons\.'''
replacement='''  const DB060_LEGENDARY_EFFECTS=dbItemGenerationOwner.effects;\n  const DB060_EFFECT_BY_ID=dbItemGenerationOwner.effectById;\n  meta.legendaryEffectsDiscovered=Array.isArray(meta.legendaryEffectsDiscovered)?meta.legendaryEffectsDiscovered:[];\n  dbItemGeneration=dbItemGenerationOwner.createController({\n    getPlayer:()=>player,getMeta:()=>meta,getBoardLevel:()=>boardLevel,getClassIdentityId:()=>classIdentityId(),\n    slots:EQUIPMENT_SLOTS,slotLabels:SLOT_LABELS,rarityValues,gearNames,rarityPrefixes,rarityBudgets:V14_RARITY_BUDGETS,elementKeys:ELEMENT_KEYS,\n    rollGearRarity:bonus=>rollGearRarity(bonus),pick:list=>pick(list),random:()=>random(),rand:(min,max)=>rand(min,max),clamp:(value,min,max)=>clamp(value,min,max),\n    gearIcon:slot=>gearIcon(slot),elementChanceForRarity:rarity=>elementChanceForRarity(rarity),seedCode:v15SeedCode,generateFromSeedCode:v15GenerateEquipmentFromSeedCode,\n    ordinaryApi:window.DiceboundEquipment,logError:(message,data)=>v25Log('errors','loot',message,data),stateForLog:()=>v25State()\n  });\n  function db060HasEffect(id){return dbItemGeneration.hasEffect(id);}\n  function db060GenerateLegendary(forcedSlot=null,preferUndiscovered=false){return dbItems.generateLegendary(forcedSlot,preferUndiscovered);}\n\n  // Generated Legendary effects count as real item value in comparisons.'''
js=sub_once(js,pattern,replacement,'0.6 generation owner block',re.S)

# Test-only surfaces should exercise the public owner boundary, not a retired local generator.
js=js.replace("    generateLegendary:(slot=null,preferUndiscovered=false)=>db060GenerateLegendary(slot,preferUndiscovered),","    generateLegendary:(slot=null,preferUndiscovered=false)=>dbItems.generateLegendary(slot,preferUndiscovered),")
js=js.replace("    generatedLegendary:()=>{const x=db060GenerateLegendary(null,false);return {name:x.name,slot:x.slot,rarity:x.rarity,itemPower:x.itemPower,effect:x.legendaryEffectName,seed:x.seedCode};},","    generatedLegendary:()=>{const x=dbItems.generateLegendary(null,false);return {name:x.name,slot:x.slot,rarity:x.rarity,itemPower:x.itemPower,effect:x.legendaryEffectName,seed:x.seedCode};},")
js=js.replace("    generate:(rarity='common',slot='weapon')=>generateEquipment(rarity,slot)","    generate:(rarity='common',slot='weapon')=>dbItems.generateEquipment(rarity,slot)")

js_path.write_text(js,encoding='utf-8',newline='\n')
print('Items generation owner migration staged.')
