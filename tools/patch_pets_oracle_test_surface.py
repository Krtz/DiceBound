from pathlib import Path

path = Path('runtime/js/dicebound.js')
text = path.read_text(encoding='utf-8')
marker = '  // Test-only characterization surface for the Pet subsystem migration.\n'
if marker in text:
    print('Pet oracle test surface already present.')
    raise SystemExit(0)

anchor = '  // Test-only characterization surface for the Items subsystem migration.\n'
if anchor not in text:
    raise SystemExit('Items oracle surface anchor not found.')

block = '''  // Test-only characterization surface for the Pet subsystem migration.\n  // It deliberately exposes the current final Pet lifecycle wrappers without changing ordinary callers.\n  window.DiceboundPetsOracleTest=Object.freeze({\n    snapshot:()=>({\n      activePet:meta.activePet,petCookies:meta.petCookies,gameStarted:!!gameStarted,classId:player.classId,\n      activeState:JSON.parse(JSON.stringify(activePetState()||null)),\n      elementProgress:JSON.parse(JSON.stringify(meta.elementProgress||{})),\n      player:{attack:player.attack,defense:player.defense,crit:player.crit,doubleStrike:player.doubleStrike,maxHp:player.maxHp,hp:player.hp,potionPower:player.potionPower,bossDamage:player.bossDamage,flatReduction:player.flatReduction,luck:player.luck,elementDamageBonus:player.elementDamageBonus,cookieBondBonus:player.cookieBondBonus,_activePetBonusId:player._activePetBonusId||null,_v17PetBonusScale:player._v17PetBonusScale||null}\n    }),\n    setRunActive:value=>{gameStarted=!!value;return gameStarted;},\n    setPetLevel:(id,level)=>{const state=meta.pets?.[id];if(!state)return false;state.level=level;return true;},\n    setPetState:(id,next)=>{if(!meta.pets?.[id])return false;Object.assign(meta.pets[id],next||{});return true;},\n    setCookieBondBonus:value=>{player.cookieBondBonus=Number(value)||0;return player.cookieBondBonus;},\n    lockPet:id=>{if(!meta.pets?.[id])return false;meta.pets[id].unlocked=false;return true;},\n    feed:count=>feedActivePet(count),\n    trackElement:(key,amount)=>trackElementProgress(key,amount),\n    canSwitch:id=>v19CanSwitchPet(id),\n    select:id=>db064PetChooser.select(id),\n    damage:(id=meta.activePet)=>{const previous=meta.activePet;meta.activePet=id;try{return petDamage();}finally{meta.activePet=previous;}},\n    bonusScale:id=>v17PetBonusScale(id),\n    damageExtra:id=>v17PetDamageExtra(id),\n    bonusText:id=>v17PetBonusText(id),\n    syncBonus:(force=false)=>syncActivePetBonusV16(force),\n    forceActivePet:id=>{meta.activePet=id;return meta.activePet;},\n    playerStats:()=>({attack:player.attack,defense:player.defense,crit:player.crit,doubleStrike:player.doubleStrike,maxHp:player.maxHp,hp:player.hp,potionPower:player.potionPower,bossDamage:player.bossDamage,flatReduction:player.flatReduction,luck:player.luck,elementDamageBonus:player.elementDamageBonus,_activePetBonusId:player._activePetBonusId||null,_v17PetBonusScale:player._v17PetBonusScale||null}),\n    shuffledPetIds:()=>shuffledPetIds()\n  });\n\n'''
text = text.replace(anchor, block + anchor, 1)
path.write_text(text, encoding='utf-8', newline='\n')
print('Patched Pet oracle test surface.')
