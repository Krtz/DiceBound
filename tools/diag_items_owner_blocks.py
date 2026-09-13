#!/usr/bin/env python3
from pathlib import Path

path=Path('runtime/js/dicebound.js')
lines=path.read_text(encoding='utf-8').splitlines()
needles=[
    'function generateEquipment(forceRarity=null,forcedSlot=null)',
    'const generateEquipmentV13=generateEquipment;',
    'function v15SafeClassId',
    'const generateEquipmentV24OrdinaryBase=generateEquipment;',
    'const generateEquipmentV251Base=generateEquipment;',
    'const DB060_LEGENDARY_EFFECTS=Object.freeze([',
    'function db060RawGeneratedGear',
    'const db060GenerateEquipmentFallback=generateEquipment;',
    'function gearPowerScore(item)',
    'function equipItem(item,silent=false)',
    'function itemSellValue(item)',
    'const gearPowerScorePreV14=gearPowerScore;',
    'const equipItemV15Patch=equipItem;',
    'const db060GearScoreBase=gearPowerScore;',
    'const db06314GearScoreBase=gearPowerScore;',
]
seen=set()
for needle in needles:
    hits=[i for i,line in enumerate(lines) if needle in line]
    print(f'\n### {needle} :: hits={[i+1 for i in hits]}')
    for i in hits:
        lo=max(0,i-8); hi=min(len(lines),i+34)
        key=(lo,hi)
        if key in seen: continue
        seen.add(key)
        print(f'--- lines {lo+1}-{hi} ---')
        for n in range(lo,hi):
            print(f'{n+1:05d}: {lines[n]}')
