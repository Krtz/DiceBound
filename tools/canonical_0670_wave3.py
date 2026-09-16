from __future__ import annotations

import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'


def replace_once(text:str,old:str,new:str,label:str)->str:
    if old in text:
        return text.replace(old,new,1)
    if new in text:
        return text
    raise RuntimeError(f'{label} changed unexpectedly')


def remove_once(text:str,old:str,label:str)->str:
    if old in text:
        return text.replace(old,'',1)
    raise RuntimeError(f'{label} changed unexpectedly or was already removed without guard update')


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8').replace('\r\n','\n')
    before=text.count('\n')+1

    old_death='''  function handlePlayerDeath(){
    if(player.revives>0){player.revives--;player.hp=Math.max(1,Math.ceil(player.maxHp*.5));combatBusy=false;sfx.holy();addLog("A <b>Phoenix Feather</b> drags you back from death.");setCombatText(`You revive at ${player.hp} HP. Phoenix feathers remaining: ${player.revives}.`);updateCombatUI();return;}
    loseGame();
  }
'''
    new_death='''  function handlePlayerDeath(){
    if(player.hp<=0&&db060HasEffect('last_stand')&&!player._db060LastStandUsed){player._db060LastStandUsed=true;player.hp=Math.max(1,Math.ceil(player.maxHp*.25));player.combatShield=(player.combatShield||0)+3;combatBusy=false;addCombatHistory('❤️‍🔥🛡️ Last Stand refuses death: 25% HP and 3 Barriers.');showToast('❤️‍🔥 LAST STAND',2400,true);updateCombatUI();return;}
    if(player.hp<=0&&player.secondSun&&!player.secondSunUsedBoards?.[boardLevel]){player.secondSunUsedBoards=player.secondSunUsedBoards||{};player.secondSunUsedBoards[boardLevel]=true;player.hp=1;combatBusy=false;sfx.holy();const target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0];let holy="";if(target){const r=dbCombat.element("light",target,{forced:true,source:"Second Sun"});holy=r?.message||"Holy erupts across the pack.";}addLog(`<b>Second Sun!</b> Death is refused on Board ${boardLevel}.`);setCombatText(`☀️☀️ Second Sun returns you at 1 HP. ${holy}`);updateCombatUI();if(!livingEnemies().length)return dbCombat.win();return;}
    if(player.revives>0){player.revives--;player.hp=Math.max(1,Math.ceil(player.maxHp*.5));combatBusy=false;sfx.holy();addLog("A <b>Phoenix Feather</b> drags you back from death.");setCombatText(`You revive at ${player.hp} HP. Phoenix feathers remaining: ${player.revives}.`);updateCombatUI();return;}
    loseGame();if(player.hp<=0)db0511RestoreEnemyElementDebuffs();
  }
'''
    text=replace_once(text,old_death,new_death,'canonical death handler')
    for old,label in [
      ('''  const handlePlayerDeathV16Base=handlePlayerDeath;
  handlePlayerDeath=function(){if(player.hp<=0&&player.secondSun&&!player.secondSunUsedBoards?.[boardLevel]){player.secondSunUsedBoards=player.secondSunUsedBoards||{};player.secondSunUsedBoards[boardLevel]=true;player.hp=1;combatBusy=false;sfx.holy();const target=currentEnemy?.hp>0?currentEnemy:livingEnemies()[0];let holy="";if(target){const r=dbCombat.element("light",target,{forced:true,source:"Second Sun"});holy=r?.message||"Holy erupts across the pack.";}addLog(`<b>Second Sun!</b> Death is refused on Board ${boardLevel}.`);setCombatText(`☀️☀️ Second Sun returns you at 1 HP. ${holy}`);updateCombatUI();if(!livingEnemies().length)return dbCombat.win();return;}return handlePlayerDeathV16Base();};
''','Second Sun predecessor'),
      ('''  const db0511HandleDeathBase=handlePlayerDeath;
  handlePlayerDeath=function(...args){const r=db0511HandleDeathBase.apply(this,args);if(player.hp<=0)db0511RestoreEnemyElementDebuffs();return r;};
''','enemy debuff death predecessor'),
      ('''  const db060HandleDeathBase=handlePlayerDeath;
  handlePlayerDeath=function(...args){if(player.hp<=0&&db060HasEffect('last_stand')&&!player._db060LastStandUsed){player._db060LastStandUsed=true;player.hp=Math.max(1,Math.ceil(player.maxHp*.25));player.combatShield=(player.combatShield||0)+3;combatBusy=false;addCombatHistory('❤️‍🔥🛡️ Last Stand refuses death: 25% HP and 3 Barriers.');showToast('❤️‍🔥 LAST STAND',2400,true);updateCombatUI();return;}return db060HandleDeathBase(...args);};
''','Last Stand death predecessor')]:
        if old in text:text=text.replace(old,'',1)
        elif label.split()[0] in text and ('Base=handlePlayerDeath' in text):raise RuntimeError(f'{label} changed unexpectedly')

    old_lose='  function loseGame(){sfx.lose();$("combatOverlay").classList.add("hidden");showEnd(false);}'
    new_lose='  function loseGame(){dbCombat.clearBloodOverhealTemp();sfx.lose();$("combatOverlay").classList.add("hidden");showEnd(false);}'
    text=replace_once(text,old_lose,new_lose,'loseGame')
    old_lose_wrap='  const loseGameV15=loseGame;loseGame=function(){dbCombat.clearBloodOverhealTemp();return loseGameV15();};\n'
    if old_lose_wrap in text:text=text.replace(old_lose_wrap,'',1)

    old_end='  function showEnd(victory){rollLocked=true;gameStarted=false;const earned=dbProgression.finalizeRun();updateHUD();$("endArt").textContent=victory?"🏆":"☠️";$("endTitle").textContent=victory?"Victory!":"Your journey ends";$("endTitle").className=victory?"victory-title":"danger-title";$("endText").textContent=victory?`You defeated all four final guardians and conquered the 364-tile ${nightmareMode?"Nightmare ":""}journey.`:`The road claimed the adventurer, but every crossed tile strengthened the Legacy.`;$("endLevel").textContent=player.level;$("endGold").textContent=player.gold;$("endTurns").textContent=rolls;$("endLegacyXp").textContent=earned;$("endGoldLegacyXp").textContent=lastGoldLegacyAward;dbEquipmentUi.renderEndGear();$("endOverlay").classList.remove("hidden");}'
    new_end='  function showEnd(victory){const first=!runFinalized;if(first){const s=ensureAlphaMeta();if(victory)s.fullVictories++;else s.deaths++;}rollLocked=true;gameStarted=false;const earned=dbProgression.finalizeRun();updateHUD();$("endArt").textContent=victory?"🏆":"☠️";$("endTitle").textContent=victory?"Victory!":"Your journey ends";$("endTitle").className=victory?"victory-title":"danger-title";$("endText").textContent=victory?`You defeated all four final guardians and conquered the 364-tile ${nightmareMode?"Nightmare ":""}journey.`:`The road claimed the adventurer, but every crossed tile strengthened the Legacy.`;$("endLevel").textContent=player.level;$("endGold").textContent=player.gold;$("endTurns").textContent=rolls;$("endLegacyXp").textContent=earned;$("endGoldLegacyXp").textContent=lastGoldLegacyAward;dbEquipmentUi.renderEndGear();$("endOverlay").classList.remove("hidden");}'
    text=replace_once(text,old_end,new_end,'showEnd')
    end_wrap='  const showEndV15=showEnd;showEnd=function(victory){const first=!runFinalized;if(first){const s=ensureAlphaMeta();if(victory)s.fullVictories++;else s.deaths++;}return showEndV15(victory);};\n'
    if end_wrap in text:text=text.replace(end_wrap,'',1)

    old_xp='  function grantXp(amount){const result=ProgressionState.grantXp(amount);ProgressionUI.render(result);return result;}'
    new_xp='  function grantXp(amount){const result=ProgressionState.grantXp(amount);ProgressionUI.render(result);const s=ensureAlphaMeta();s.highestRunLevel=Math.max(s.highestRunLevel,player.level);s.classMaxLevel[player.classId]=Math.max(s.classMaxLevel[player.classId]||1,player.level);dbProgression.checkDynamicClassUnlocks();saveMeta();return result;}'
    text=replace_once(text,old_xp,new_xp,'grantXp')
    xp_wrap='  const grantXpV15=grantXp;grantXp=function(amount){const r=grantXpV15(amount);const s=ensureAlphaMeta();s.highestRunLevel=Math.max(s.highestRunLevel,player.level);s.classMaxLevel[player.classId]=Math.max(s.classMaxLevel[player.classId]||1,player.level);dbProgression.checkDynamicClassUnlocks();saveMeta();return r;};\n'
    if xp_wrap in text:text=text.replace(xp_wrap,'',1)

    old_camp='''  function useCamp(){
    const heal=Math.max(1,Math.round(player.maxHp*.38)),actual=Math.min(heal,player.maxHp-player.hp);player.hp+=actual;
    tiles[player.position].cleared=true;tiles[player.position].type="empty";refreshTile(player.position);sfx.heal();addLog(`Rested by the fire and recovered <b>${actual} HP</b>.`);showToast(`Recovered ${actual} HP`);returnToRoad();
  }
'''
    new_camp='''  function useCamp(){const tile=tiles[player.position];if(player.hp>=player.maxHp){tile.cleared=true;tile.type="empty";refreshTile(player.position);const pool=eligibleUpgrades(u=>u.rarity==="common"||u.rarity==="uncommon");if(pool.length){const up=pick(pool);dbPowerups.apply(up,"Campfire Inspiration");sfx.holy();addLog(`<b>Camp:</b> Already fully rested, so the quiet fire grants <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);showToast(`🔥 ${up.name}`);}else{player.maxHp+=5;player.hp+=5;showToast("🔥 +5 max HP");}updateHUD();returnToRoad();return;}const heal=Math.max(1,Math.round(player.maxHp*.38)),actual=Math.min(heal,player.maxHp-player.hp);player.hp+=actual;tile.cleared=true;tile.type="empty";refreshTile(player.position);sfx.heal();addLog(`Rested by the fire and recovered <b>${actual} HP</b>.`);showToast(`Recovered ${actual} HP`);returnToRoad();}
'''
    text=replace_once(text,old_camp,new_camp,'useCamp')
    camp_wrap='  useCamp=function(){const tile=tiles[player.position];if(player.hp>=player.maxHp){tile.cleared=true;tile.type="empty";refreshTile(player.position);const pool=eligibleUpgrades(u=>u.rarity==="common"||u.rarity==="uncommon");if(pool.length){const up=pick(pool);dbPowerups.apply(up,"Campfire Inspiration");sfx.holy();addLog(`<b>Camp:</b> Already fully rested, so the quiet fire grants <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);showToast(`🔥 ${up.name}`);}else{player.maxHp+=5;player.hp+=5;showToast("🔥 +5 max HP");}updateHUD();returnToRoad();return;}const heal=Math.max(1,Math.round(player.maxHp*.38)),actual=Math.min(heal,player.maxHp-player.hp);player.hp+=actual;tile.cleared=true;tile.type="empty";refreshTile(player.position);sfx.heal();addLog(`Rested by the fire and recovered <b>${actual} HP</b>.`);showToast(`Recovered ${actual} HP`);returnToRoad();};\n'
    if camp_wrap in text:text=text.replace(camp_wrap,'',1)

    old_precious='  function unboundPreciousGearV16(){const bound=meta.heirlooms||[];return EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]).filter(i=>i&&(i.rarity==="mythical"||i.rarity==="omega")&&!bound.some(h=>h.id===i.id||(h.seed&&i.seed&&h.seed===i.seed)));}'
    new_precious='  function unboundPreciousGearV16(){const bound=[...(meta.heirlooms||[]),...(meta.heirloomStorage||[])];return EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]).filter(i=>i&&["legendary","artifact","mythical","omega"].includes(i.rarity)&&!bound.some(h=>h.id===i.id||(h.seed&&i.seed&&h.seed===i.seed)));}'
    text=replace_once(text,old_precious,new_precious,'precious gear guard')
    precious_wrap="  unboundPreciousGearV16=function(){const bound=[...(meta.heirlooms||[]),...(meta.heirloomStorage||[])];return EQUIPMENT_SLOTS.map(s=>player.equipment?.[s]).filter(i=>i&&['legendary','artifact','mythical','omega'].includes(i.rarity)&&!bound.some(h=>h.id===i.id||(h.seed&&i.seed&&h.seed===i.seed)));};\n"
    if precious_wrap in text:text=text.replace(precious_wrap,'',1)

    weighted_wrap='  weightedUpgrade=function(pool){return dbPowerups.weighted(pool);};\n'
    if weighted_wrap in text:text=text.replace(weighted_wrap,'',1)

    # Collapse the debug 1d6 predecessor into the one canonical roll function.
    old_roll='''  async function rollDice(){
    if(rollLocked||!gameStarted)return;ensureAudio();if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();rollLocked=true;updateHUD();const die=$("dice");die.classList.add("rolling");for(let i=0;i<11;i++){die.textContent=pick(diceFaces);sfx.roll();await delay(55+i*6);}let value=rand(1,6),chosen=false;if(player.diceChoiceChance>0&&random()<player.diceChoiceChance){value=await chooseDieResult();chosen=true;showToast(`🎲 Fate chosen: ${value}`);}let bonus=0;if(!chosen&&random()<clamp(player.extraStepChance,0,.75))bonus=1;die.textContent=diceFaces[value-1];die.classList.remove("rolling");rolls++;let titanstep="";if(hasMythicPiece("boots")&&value>=5){const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.05)));player.hp+=healed;player.ultimateCharge=clamp(player.ultimateCharge+10,0,100);titanstep=` Titanstep restores <b>${healed} HP</b> and grants <b>10 ultimate</b>.`;showToast("🥾 Titanstep!");}addLog(`${chosen?"Fate bends. You choose":"You rolled"} <b>${value}</b>${bonus?" and Long Stride adds <b>+1</b>":""}.${titanstep}`);await dbRun.move(value+bonus,value,bonus>0,chosen);
  }
'''
    new_roll='''  async function rollDice(){
    if(rollLocked||!gameStarted)return;ensureAudio();if(meta.debugAlwaysChooseRolls){rollLocked=true;updateHUD();const die=$("dice");die.classList.add("rolling");for(let i=0;i<8;i++){die.textContent=pick(diceFaces);sfx.roll();await delay(45+i*5);}const value=await chooseDieResult();die.textContent=diceFaces[value-1];die.classList.remove("rolling");rolls++;ensureAlphaMeta().rolls++;addLog(`Debug fate chooses <b>${value}</b>. Long Stride does not alter chosen fate.`);await dbRun.move(value,value,false,true);return;}if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();rollLocked=true;updateHUD();const die=$("dice");die.classList.add("rolling");for(let i=0;i<11;i++){die.textContent=pick(diceFaces);sfx.roll();await delay(55+i*6);}let value=rand(1,6),chosen=false;if(player.diceChoiceChance>0&&random()<player.diceChoiceChance){value=await chooseDieResult();chosen=true;showToast(`🎲 Fate chosen: ${value}`);}let bonus=0;if(!chosen&&random()<clamp(player.extraStepChance,0,.75))bonus=1;die.textContent=diceFaces[value-1];die.classList.remove("rolling");rolls++;let titanstep="";if(hasMythicPiece("boots")&&value>=5){const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.05)));player.hp+=healed;player.ultimateCharge=clamp(player.ultimateCharge+10,0,100);titanstep=` Titanstep restores <b>${healed} HP</b> and grants <b>10 ultimate</b>.`;showToast("🥾 Titanstep!");}addLog(`${chosen?"Fate bends. You choose":"You rolled"} <b>${value}</b>${bonus?" and Long Stride adds <b>+1</b>":""}.${titanstep}`);await dbRun.move(value+bonus,value,bonus>0,chosen);
  }
'''
    text=replace_once(text,old_roll,new_roll,'rollDice')
    roll_wrap='  const rollDiceV11=rollDice;rollDice=async function(){if(!(meta.debugAlwaysChooseRolls&&gameStarted&&!rollLocked))return rollDiceV11();ensureAudio();rollLocked=true;updateHUD();const die=$("dice");die.classList.add("rolling");for(let i=0;i<8;i++){die.textContent=pick(diceFaces);sfx.roll();await delay(45+i*5);}let value=await chooseDieResult(),bonus=0;die.textContent=diceFaces[value-1];die.classList.remove("rolling");rolls++;ensureAlphaMeta().rolls++;addLog(`Debug fate chooses <b>${value}</b>. Long Stride does not alter chosen fate.`);await dbRun.move(value,value,false,true);};\n'
    if roll_wrap in text:text=text.replace(roll_wrap,'',1)
    capture1='  $("rollBtn").addEventListener("click",e=>{if(meta.debugAlwaysChooseRolls&&gameStarted&&!rollLocked){e.preventDefault();e.stopImmediatePropagation();rollDice();}},true);\n'
    if capture1 in text:text=text.replace(capture1,'',1)
    capture2='''  $('rollBtn')?.addEventListener('click',async e=>{
    if(!(meta.debugAlwaysChooseRolls&&gameStarted&&!rollLocked))return;
    e.preventDefault();e.stopImmediatePropagation();ensureAudio();rollLocked=true;updateHUD();const die=$('dice');die.classList.add('rolling');for(let i=0;i<8;i++){die.textContent=pick(diceFaces);sfx.roll();await delay(45+i*5);}const value=await chooseDieResult();die.textContent=diceFaces[value-1];die.classList.remove('rolling');rolls++;ensureAlphaMeta().rolls++;addLog(`Debug fate chooses <b>${value}</b>. Long Stride does not alter chosen fate.`);await dbRun.move(value,value,false,true);
  },true);
'''
    if capture2 in text:text=text.replace(capture2,'',1)

    # Remove known empty patch bodies that only probe canonical registries.
    noops=[
      '  Object.entries(CLASS_PASSIVES).forEach(([id,p])=>{});\n',
      '  ["sorcerer","vampire","rouge","merchant"].forEach(id=>{});\n',
      '  v24NewPowerups.forEach(up=>{});\n',
      '  if(CLASSES.ceo){}\n',
      '  if(CLASSES.fighter){}\n  if(CLASSES.paladin){}\n  if(CLASSES.beastmaster){}\n',
      '  if(CLASSES.sorcerer){}\n  if(CLASSES.vampire){}\n  if(CLASSES.rouge){}\n  if(CLASSES.merchant){}\n  if(CLASSES.rogue){}\n  if(CLASSES.bloodmage){}\n  if(CLASSES.d20){}\n  if(CLASSES.slime){}\n',
      '  if(CLASSES.paladin){\n\n  }\n',
      '        const evasive=upgrades.find(u=>u.id==="evasive_bulwark");if(evasive){}\n',
      '  const prismaticTalent=talents.find(t=>t.id==="element_prismatic");if(prismaticTalent){}\n',
      "  const db315VenomEdge=upgrades.find(u=>u.id==='venom_edge');\n  if(db315VenomEdge){\n\n  }\n  const db315RoadToxicology=upgrades.find(u=>u.id==='toxicology');\n  if(db315RoadToxicology){\n\n  }\n"
    ]
    noop_removed=0
    for old in noops:
        if old in text:text=text.replace(old,'',1);noop_removed+=1

    # Fold the final luck promotion into the canonical gear-rarity function.
    old_rarity_tail="""    if(p<.45+boost*.58)return 'common';
    return 'poor';
  };"""
    new_rarity_tail="""    let rarity;if(p<.45+boost*.58)rarity='common';else rarity='poor';
    return DB_RARITIES.promoteOrdinaryRarityForLuck?.(rarity,player.luck)||rarity;
  };"""
    if old_rarity_tail in text:text=text.replace(old_rarity_tail,new_rarity_tail,1)
    rarity_wrap="  const rollGearRarityV26Base=rollGearRarity;rollGearRarity=function(...args){const rarity=rollGearRarityV26Base.apply(this,args);return DB_RARITIES.promoteOrdinaryRarityForLuck?.(rarity,player.luck)||rarity;};\n"
    if rarity_wrap in text:text=text.replace(rarity_wrap,'',1)

    forbidden=['handlePlayerDeathV16Base','db0511HandleDeathBase','db060HandleDeathBase','loseGameV15','showEndV15','grantXpV15','rollDiceV11','rollGearRarityV26Base']
    survivors=[name for name in forbidden if name in text]
    if survivors:raise RuntimeError(f'wave3 predecessor names survived: {survivors}')
    if 'useCamp=function' in text or 'unboundPreciousGearV16=function' in text:raise RuntimeError('wave3 replacement assignment survived')

    while '\n\n\n' in text:text=text.replace('\n\n\n','\n\n')
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    after=text.count('\n')+1
    print(f'CANONICAL_0670_WAVE3 {before}->{after} lines; death/end/xp/camp/dice/rarity/precious chains collapsed; dead registry noops removed={noop_removed}')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
