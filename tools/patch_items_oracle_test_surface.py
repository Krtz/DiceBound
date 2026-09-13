#!/usr/bin/env python3
from pathlib import Path

path=Path('runtime/js/dicebound.js')
text=path.read_text(encoding='utf-8')
marker="  // GUIDE / DEBUG -----------------------------------------------------------\n  window.DiceboundBeta06Test=Object.freeze({"
if text.count(marker)!=1:
    raise SystemExit(f'expected one Beta06 test marker, found {text.count(marker)}')
insert="""  // Test-only characterization surface for the Items subsystem migration.\n  // It deliberately exposes the current final wrappers without changing ordinary callers.\n  window.DiceboundItemsOracleTest=Object.freeze({\n    generateEquipment:(rarity=null,slot=null)=>generateEquipment(rarity,slot),\n    generateLegendary:(slot=null,preferUndiscovered=false)=>db060GenerateLegendary(slot,preferUndiscovered),\n    sellValue:item=>itemSellValue(item),\n    score:item=>gearPowerScore(item),\n    formatComparison:(item,current)=>formatGearComparison(item,current),\n    equip:(item,silent=true)=>{equipItem(item,silent);return JSON.parse(JSON.stringify(player.equipment[item.slot]));}\n  });\n\n"""
text=text.replace(marker,insert+marker)
path.write_text(text,encoding='utf-8',newline='\n')
print('Items oracle test surface staged.')
