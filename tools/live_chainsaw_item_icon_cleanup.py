from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'

text=MONOLITH.read_text(encoding='utf-8')
old='spendBase:v14SpendBase,gearIcon,baseName:window.DiceboundEquipment.ordinaryBaseName'
new='''spendBase:v14SpendBase,gearIcon:slot=>{const parsed=v15ParseSeedCode(code);if(!parsed||!CLASSES[parsed.classId])throw new Error(`Invalid equipment seed class: ${parsed?.classId||"unknown"}`);const offhand={fighter:"🛡️",ranger:"🪶",sorcerer:"📖",monk:"📿",clown:"🎭",rouge:"🎨",berserker:"💀",turtle:"🐚",frog:"🪷",d20:"🎲",slime:"🫧"};const icon={weapon:CLASSES[parsed.classId].attackIcon,offhand:Object.prototype.hasOwnProperty.call(offhand,parsed.classId)?offhand[parsed.classId]:"📖",boots:"🥾",legs:"👖",chest:"🥋",hat:"🪖",ring:"💍",amulet:"📿"}[slot];if(!icon)throw new Error(`Missing equipment icon policy for slot: ${slot}`);return icon;},baseName:window.DiceboundEquipment.ordinaryBaseName'''
if old in text:
    text=text.replace(old,new,1)
elif 'Missing equipment icon policy for slot' not in text:
    raise SystemExit('seed generator gearIcon dependency changed unexpectedly')
MONOLITH.write_text(text,encoding='utf-8',newline='\n')
print('ITEM_ICON_CANONICAL legacy gearIcon dependency retired')
