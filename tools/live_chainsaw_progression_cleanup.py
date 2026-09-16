from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
PROGRESSION=ROOT/'runtime/js/progression/lifecycle.js'

OLD_FINALIZE='''  function finalizeRun(){
    if(call('isRunFinalized'))return call('getLastLegacyAward');
    call('setRunFinalized',true);
    const player=call('getPlayer'),travelAward=Math.max(0,Math.round(call('getTilesMovedThisRun')*(1+player.legacyXpBonus))),goldAward=Math.max(0,Math.floor(player.gold/10)),award=(travelAward+goldAward)*(call('isNightmare')?5:1),state=meta();
    call('setLastGoldLegacyAward',goldAward);call('setLastLegacyAward',award);
    state.runs++;state.bestTiles=Math.max(state.bestTiles,call('getTilesMovedThisRun'));grantLegacyXp(award);call('saveMeta');call('updateMetaUI');return award;
  }'''

NEW_FINALIZE='''  function finalizeRun(){
    if(call('isRunFinalized'))return call('getLastLegacyAward');
    call('setRunFinalized',true);
    const player=call('getPlayer'),tilesMoved=call('getTilesMovedThisRun'),travelAward=Math.max(0,Math.round(tilesMoved*(1+player.legacyXpBonus))),goldAward=Math.max(0,Math.floor(player.gold/10)),award=(travelAward+goldAward)*(call('isNightmare')?5:1),state=meta(),stats=call('ensureAlphaMeta');
    call('setLastGoldLegacyAward',goldAward);call('setLastLegacyAward',award);
    state.runs++;state.bestTiles=Math.max(state.bestTiles,tilesMoved);
    stats.runsFinished++;stats.rolls+=call('getRolls');stats.tilesTraveled+=tilesMoved;stats.highestRunLevel=Math.max(stats.highestRunLevel,player.level);stats.classMaxLevel[player.classId]=Math.max(stats.classMaxLevel[player.classId]||1,player.level);stats.highestGold=Math.max(stats.highestGold,player.gold);
    grantLegacyXp(award);call('saveMeta');call('updateMetaUI');return award;
  }'''


def main()->int:
    progression=PROGRESSION.read_text(encoding='utf-8')
    if OLD_FINALIZE in progression:
        progression=progression.replace(OLD_FINALIZE,NEW_FINALIZE,1)
    elif NEW_FINALIZE not in progression:
        raise RuntimeError('Progression finalizeRun body did not match expected canonical implementation')
    PROGRESSION.write_text(progression,encoding='utf-8',newline='\n')

    text=MONOLITH.read_text(encoding='utf-8')
    before=text.count('\n')+1
    old='getTilesMovedThisRun:()=>tilesMovedThisRun,isNightmare:()=>!!nightmareMode,random:()=>random(),updateMetaUI:()=>updateMetaUI(),'
    new='getTilesMovedThisRun:()=>tilesMovedThisRun,getRolls:()=>rolls,isNightmare:()=>!!nightmareMode,random:()=>random(),updateMetaUI:()=>updateMetaUI(),'
    if old in text:
        text=text.replace(old,new,1)
    elif new not in text:
        raise RuntimeError('Progression capability block did not match expected source')

    # The Alpha-v15 predecessor wrapper only added lifetime-stat bookkeeping.
    # That bookkeeping now belongs to the canonical Progression owner above.
    pattern=re.compile(r'''\n\s*const finalizeRunV15=finalizeRun;finalizeRun=function\(\)\{const was=runFinalized,result=finalizeRunV15\(\);if\(!was\)\{const s=ensureAlphaMeta\(\);s\.runsFinished\+\+;s\.rolls\+=rolls;s\.tilesTraveled\+=tilesMovedThisRun;s\.highestRunLevel=Math\.max\(s\.highestRunLevel,player\.level\);s\.classMaxLevel\[player\.classId\]=Math\.max\(s\.classMaxLevel\[player\.classId\]\|\|1,player\.level\);s\.highestGold=Math\.max\(s\.highestGold,player\.gold\);saveMeta\(\);\}return result;\};''')
    text,count=pattern.subn('',text,count=1)
    if count!=1 and 'finalizeRunV15' in text:
        raise RuntimeError('Could not retire finalizeRunV15 predecessor wrapper')

    # Composition consumers should call the real owner instead of retaining the
    # historical local forwarding function as a first-class callback.
    text=text.replace('finalizeRun,\n    getCompletionContext:', 'finalizeRun:()=>dbProgression.finalizeRun(),\n    getCompletionContext:',1)
    text=re.sub(r'\n(?:[ \t]*\n){3,}','\n\n',text)
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    print(f'PROGRESSION_CANONICAL {before}->{text.count(chr(10))+1} monolith lines; lifetime finalization moved to progression owner')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
