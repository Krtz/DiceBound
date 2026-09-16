from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'

CANONICAL='''  async function animateUltimate(){
    const fx=$("attackFx"),enemy=$("enemyIcon");fx.className="attack-fx";void fx.offsetWidth;
    if(classIdentityActive("ouroboros")){
      fx.textContent="♾️🐍☠️";fx.classList.add("ultimate-ouroboros");sfx.holy();await delay(760);enemy.classList.add("enemy-hit");await delay(190);enemy.classList.remove("enemy-hit");return;
    }
    fx.textContent=({fighter:"⚔️",ranger:"➶➶➶➶",sorcerer:"☄️",monk:"👊👊👊👊",clown:"🎪🐔💥",rouge:"🌹🩸",berserker:"🌋🪓",turtle:"🐚💥",frog:"🐸🐸🐸",d20:"🎲20!",slime:"🟢🌊",vampire:"🌑🩸🦇",ninja:"🌘🗡️🗡️",ceo:"📉💥",merchant:"🏦🪙⚖️",cleric:"☀️✝️",paladin:"⚜️🛡️",beastmaster:"🐺🐾🐺",rogue:"💎🗡️"}[player.classId]||"💥");
    fx.classList.add(`ultimate-${player.classId}`);sfx.holy();await delay(({sorcerer:760,monk:690,clown:790,rouge:730,berserker:760,cleric:720,paladin:720,beastmaster:760,rogue:690}[player.classId]||620)+ALPHA_COMBAT_DELAY);enemy.classList.add("enemy-hit");await delay(190);enemy.classList.remove("enemy-hit");
  }
'''


def remove_block(text:str,start_marker:str,end_marker:str,include_end:bool=True)->tuple[str,int]:
    start=text.find(start_marker)
    if start<0:return text,0
    end=text.find(end_marker,start)
    if end<0:raise RuntimeError(f'Ultimate cleanup end marker missing: {end_marker!r}')
    if include_end:end+=len(end_marker)
    while end<len(text) and text[end] in ' \t':end+=1
    if end<len(text) and text[end]=='\r':end+=1
    if end<len(text) and text[end]=='\n':end+=1
    return text[:start]+text[end:],1


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8')
    before=text.count('\n')+1
    # Replace the oldest declaration in-place with the final canonical animation.
    start=text.find('  async function animateUltimate(){')
    if start<0:
        if text.count('function animateUltimate(')==1:
            print('ULTIMATE_CANONICAL already collapsed')
            return 0
        raise RuntimeError('Base animateUltimate declaration missing')
    end=text.find('\n  }',start)
    if end<0:raise RuntimeError('Base animateUltimate end missing')
    end+=len('\n  }')
    text=text[:start]+CANONICAL.rstrip('\n')+text[end:]

    # Remove the Alpha class-expansion replacement; its complete class map is now
    # part of the canonical implementation above.
    marker='  // Custom ultimate art for the new classes.'
    m=text.find(marker)
    if m>=0:
        line_end=text.find('\n',text.find('animateUltimate=async function(){',m))
        if line_end<0:raise RuntimeError('Class expansion animateUltimate line end missing')
        text=text[:m]+text[line_end+1:]

    # Remove the Ouroboros predecessor capture and wrapper. Its special branch is
    # folded directly into the canonical implementation instead of self-recursing.
    m=text.find('  const animateUltimateV18Base=animateUltimate;')
    if m>=0:
        wrapper_end=text.find('\n  };',m)
        if wrapper_end<0:raise RuntimeError('Ouroboros animateUltimate wrapper end missing')
        wrapper_end+=len('\n  };')
        if wrapper_end<len(text) and text[wrapper_end]=='\n':wrapper_end+=1
        text=text[:m]+text[wrapper_end:]

    if text.count('animateUltimate=async function'):
        raise RuntimeError('Historical animateUltimate assignment survived')
    if 'animateUltimateV18Base' in text:
        raise RuntimeError('Ultimate predecessor capture survived')
    if text.count('function animateUltimate(')!=1:
        raise RuntimeError(f'Expected one animateUltimate declaration, found {text.count("function animateUltimate(")}')
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    after=text.count('\n')+1
    print(f'ULTIMATE_CANONICAL {before}->{after} lines; patch ladder retired')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
