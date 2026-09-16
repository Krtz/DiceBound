from __future__ import annotations

import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
BOARDS=ROOT/'runtime/js/board/registry.js'
ANTI_RETURN=ROOT/'tools/test_monolith_chainsaw.py'


def replace_once(text:str,old:str,new:str,label:str)->str:
    count=text.count(old)
    if count!=1:raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)


def cut_between(text:str,start:str,end:str,label:str)->str:
    a=text.find(start)
    if a<0:raise RuntimeError(f'{label}: start marker missing')
    b=text.find(end,a)
    if b<0:raise RuntimeError(f'{label}: end marker missing')
    return text[:a]+text[b:]


def canonicalize_boards()->None:
    text=BOARDS.read_text(encoding='utf-8').replace('\r\n','\n')
    replacements={
      '"1"':('      "entryHeal": 0,\n      "entryPotions": 0','      "entryHeal": 0.10,\n      "entryPotions": 1'),
      '"2"':('      "entryHeal": 0.35,\n      "entryPotions": 1','      "entryHeal": 0.12,\n      "entryPotions": 1,\n      "extraHp": 0.05,\n      "extraAttack": 0.03,\n      "extraDefense": 0'),
      '"3"':('      "entryHeal": 0.28,\n      "entryPotions": 2','      "entryHeal": 0.16,\n      "entryPotions": 1,\n      "extraHp": 0.11,\n      "extraAttack": 0.07,\n      "extraDefense": 1'),
      '"4"':('      "entryHeal": 0.22,\n      "entryPotions": 3','      "entryHeal": 0.20,\n      "entryPotions": 2,\n      "extraHp": 0.18,\n      "extraAttack": 0.12,\n      "extraDefense": 2,\n      "threePackChance": 0.24'),
      '"5"':('      "entryHeal": 0.18,\n      "entryPotions": 3','      "entryHeal": 0.16,\n      "entryPotions": 2,\n      "extraHp": 0.38,\n      "extraAttack": 0.26,\n      "extraDefense": 5,\n      "threePackChance": 0.46'),
      '"6"':('      "entryHeal": 0.03,\n      "entryPotions": 1,\n      "balance":','      "entryHeal": 0.20,\n      "entryPotions": 2,\n      "extraHp": 0.56,\n      "extraAttack": 0.38,\n      "extraDefense": 7,\n      "threePackChance": 0.58,\n      "balance":'),
    }
    for board,(old,new) in replacements.items():
        if old in text:text=replace_once(text,old,new,f'canonical Board {board} values')
        elif new not in text:raise RuntimeError(f'Board {board} values drifted')
    BOARDS.write_text(text,encoding='utf-8',newline='\n')


def canonicalize_monolith()->tuple[int,int]:
    text=MONOLITH.read_text(encoding='utf-8').replace('\r\n','\n')
    before=text.count('\n')+1

    # Board 0.4.6/0.4.7 overlays are fully superseded by the final registry data.
    if 'const DB046_BOARD_OVERRIDES=' in text:
        text=cut_between(text,'  // Board balance pass. Goal: a smoother climb with Board 5 clearly harder than Board 4.\n','  // Hard anti-lock: only one haste skip can be banked before an enemy actually acts.\n','Board 0.4.6 overlay')
    if 'const DB047_BOARD_OVERRIDES=' in text:
        text=cut_between(text,'  // --- board pass: make the climb smoother and Board 5 > Board 4 ----------\n','  // --- haste anti-lock: never queue more than one skipped response ---------\n','Board 0.4.7 overlay')

    # Fold the Jean Jacket branch into the one defense reducer.
    old='  function defenseDamageReduction(defense=player.defense){const d=Math.max(0,Number(defense)||0);return clamp(d/(d+25),0,.82);}'
    new='  function defenseDamageReduction(defense=player.defense){const d=Math.max(0,Number(defense)||0);return v24HasJeanJacket()?clamp(d/(d+13),0,.90):clamp(d/(d+25),0,.82);}'
    if old in text:text=replace_once(text,old,new,'canonical defense reducer')
    elif new not in text:raise RuntimeError('canonical defense reducer drifted')
    wrapper='  const defenseDamageReductionV24Base=defenseDamageReduction;defenseDamageReduction=function(defense=player.defense){if(v24HasJeanJacket()){const d=Math.max(0,Number(defense)||0);return clamp(d/(d+13),0,.90);}return defenseDamageReductionV24Base(defense);};\n'
    text=text.replace(wrapper,'',1)

    # Fold quiet elemental-proc policy into the one toast function.
    old='  function showToast(text,duration=1900,isUnlock=false){toastQueue.push({text,duration,isUnlock});if(!toastActive)showNextToast();}'
    new='  function showToast(text,duration=1900,isUnlock=false){const value=String(text??\'\'),procToast=Object.values(ELEMENTS).some(e=>value.startsWith(`${e.icon} ${e.spell}`))||/^☢️\\s*-?\\d+\\s*DEF/.test(value);if(procToast)return;toastQueue.push({text,duration,isUnlock});if(!toastActive)showNextToast();}'
    if old in text:text=replace_once(text,old,new,'canonical toast policy')
    elif new not in text:raise RuntimeError('canonical toast function drifted')
    toast_start='  const showToastV27Base=showToast;\n  showToast=function(text,...args){\n'
    if toast_start in text:
        text=cut_between(text,toast_start,'\n\n  // ---- Per-run state for upgraded powerups -------------------------------\n','toast suppression predecessor')

    # End-of-run checkpoint clearing is current behavior, not a wrapper layer.
    old='  function showEnd(victory){const first=!runFinalized;'
    new='  function showEnd(victory){dbRunClearCheckpoint();const first=!runFinalized;'
    if old in text:text=replace_once(text,old,new,'canonical showEnd checkpoint clearing')
    elif new not in text:raise RuntimeError('canonical showEnd drifted')
    end_wrapper='  const dbRunShowEndBase=showEnd;showEnd=function(...args){dbRunClearCheckpoint();return dbRunShowEndBase.apply(this,args);};\n'
    text=text.replace(end_wrapper,'',1)

    # The canonical parser already accepts Legendary, so the later parser wrapper is dead archaeology.
    parser_start='  // New seed parser accepts the full generated ladder including Legendary.\n  const db060SeedParserBase=v15ParseSeedCode;\n'
    if parser_start in text:
        text=cut_between(text,parser_start,'\n\n  const DB060_LEGENDARY_EFFECTS=', 'redundant Legendary seed parser wrapper')

    stale=['DB046_BOARD_OVERRIDES','DB047_BOARD_OVERRIDES','db046BoardBase','db047BoardBase','defenseDamageReductionV24Base','showToastV27Base','dbRunShowEndBase','db060SeedParserBase']
    for marker in stale:
        if marker in text:raise RuntimeError(f'historical predecessor survived Wave 6: {marker}')
    if text.count('function defenseDamageReduction(')!=1:raise RuntimeError('defense reducer must have one declaration')
    if text.count('function showToast(')!=1:raise RuntimeError('toast must have one declaration')
    if text.count('function showEnd(')!=1:raise RuntimeError('showEnd must have one declaration')
    if text.count('function v15ParseSeedCode(')!=1:raise RuntimeError('seed parser must have one declaration')

    while '\n\n\n' in text:text=text.replace('\n\n\n','\n\n')
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    return before,text.count('\n')+1


def update_guard()->None:
    text=ANTI_RETURN.read_text(encoding='utf-8').replace('\r\n','\n')
    marker="STALE_WAVE6_PREDECESSORS=['DB046_BOARD_OVERRIDES','DB047_BOARD_OVERRIDES','db046BoardBase','db047BoardBase','defenseDamageReductionV24Base','showToastV27Base','dbRunShowEndBase','db060SeedParserBase']"
    if marker not in text:
        anchor="STALE_BOARD_PRESENTATION_NAMES=['tileMeta','guardianTileArt','db049EnemyTileIcon']"
        if anchor not in text:raise RuntimeError('Wave 6 anti-return anchor missing')
        text=text.replace(anchor,anchor+'\n'+marker,1)
    assertion='    for marker in STALE_WAVE6_PREDECESSORS:\n        assert marker not in text, f"historical Wave 6 predecessor {marker} returned"\n'
    if assertion not in text:
        anchor='    board_text=BOARD_PRESENTATION.read_text(encoding="utf-8")\n'
        if anchor not in text:raise RuntimeError('Wave 6 assertion anchor missing')
        text=text.replace(anchor,assertion+anchor,1)
    ANTI_RETURN.write_text(text,encoding='utf-8',newline='\n')


def main()->int:
    canonicalize_boards()
    before,after=canonicalize_monolith()
    update_guard()
    print(f'CANONICAL_0670_WAVE6 {before}->{after} monolith lines; final Board data moved to registry; Board/defense/toast/end/seed predecessor chains collapsed')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
