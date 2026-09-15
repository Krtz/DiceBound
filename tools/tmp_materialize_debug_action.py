from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
CHANGELOG = ROOT / "CHANGELOG.md"
PATCH_NOTES = ROOT / "runtime/PATCH_NOTES.md"

CAPTURES = [
    "debugActionV11",
    "debugActionV15Patch",
    "debugActionV19Base",
    "debugActionV110Base",
    "debugActionV21Base",
    "debugActionV22Base",
    "debugActionV25Base",
    "debugActionV26Base",
    "debugActionBeta04Base",
]

CANONICAL = r'''function debugAction(action){
    // Final released dispatch order, collapsed from ten historical generations.
    // Beta 0.4 was the outermost wrapper.
    if(action==='unlock_hell'){
      meta.nightmareUnlocked=true;meta.hellUnlocked=true;saveMeta();
      try{renderClassChoices();}catch(_){}
      showToast('🔥 Hell Mode unlocked (debug)');
      return;
    }

    // v26 was the next outer layer and therefore intercepts these before v25 logging.
    if(action==='kill_character_v26'){
      if(!gameStarted){showToast('Start a run first');return;}
      $('debugOverlay')?.classList.add('hidden');
      const damage=Math.max(1,Math.ceil(player.hp+player.maxHp));
      meta.damageTaken=(meta.damageTaken||0)+damage;player.hp=0;
      addLog('<b>Debug monster</b> deals lethal damage. Running the normal death/revive pipeline.');
      showToast('☠️ Debug monster attacks');handlePlayerDeath();updateHUD();return;
    }
    const artifactFns={mythic_weapon:generateMythicalWeapon,mythic_offhand:generateMythicalOffhand,mythic_boots:generateMythicalBoots,mythic_legs:generateMythicalPants,mythic_amulet:generateMythicalAmulet,mythic_hat:generateMythicalHat,mythic_ring:generateMythicalRing};
    if(artifactFns[action]){
      if(!gameStarted){showToast('Start a run first');return;}
      const item=artifactFns[action]();equipItem(item,true);renderEquipment();updateHUD();showToast(`Artifact ${SLOT_LABELS[item.slot]} added`);return;
    }
    if(action==='mythic'){
      if(!gameStarted){showToast('Start a run first');return;}
      [generateMythicalWeapon,generateMythicalOffhand,generateMythicalBoots,generateMythicalPants,generateMythicalAmulet,generateMythicalHat,generateMythicalRing].forEach(fn=>equipItem(fn(),true));
      renderEquipment();updateHUD();showToast('Full current seven-piece Artifact set equipped');return;
    }

    // v25 logging occurred only after all later v26/Beta04 intercepts.
    v25Log('events','debug',`debugAction(${action})`,v25State());
    if(['legend_mug_v25','legend_headphones_v25','legend_jacket_v25','omega_horns_v25'].includes(action)){
      if(!gameStarted){showToast('Start a run first');return;}
      const item=action==='legend_mug_v25'?generateAxelsCoffeeMug():action==='legend_headphones_v25'?generateKratzHeadphones():action==='legend_jacket_v25'?generateKellysJeanJacket():generateDevilsHorns();
      equipItem(item,true);renderEquipment();updateHUD();showToast(`${item.name} added`);return;
    }
    if(action==='recover_road_v25'){v25RecoverRoadState('manual');return;}

    if(action==='unlockclasses'){
      meta.unlocks=meta.unlocks||{};Object.keys(CLASSES).forEach(id=>meta.unlocks[id]=true);saveMeta();renderClassChoices();showToast('Debug: all classes unlocked');return;
    }
    if(action==='unlockpets'){
      meta.pets=meta.pets||defaultPets();Object.keys(PETS).forEach(id=>{meta.pets[id]=meta.pets[id]||defaultPetState(false);meta.pets[id].unlocked=true;});
      ELEMENT_KEYS.forEach(k=>meta.elementProgress[k]=Math.max(meta.elementProgress[k]||0,PET_UNLOCK_REQUIREMENT));saveMeta();renderPetCollection();updateMetaUI();showToast('Debug: all pets unlocked');return;
    }
    if(action==='all_powerups'){
      if(!gameStarted){showToast('Start a run first');return;}
      $('debugOverlay').classList.add('hidden');showAllEligiblePowerupSelection('Debug · Full Eligible Powerup List',()=>{});return;
    }

    // v19 / v1.5 / v1.1 effective branches. Superseded Mythical branches that
    // are unreachable behind v26 are intentionally not carried forward.
    if(action==="board6"&&gameStarted){boardLevel=6;player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");updateHUD();showToast("Debug: board6");return;}
    if(action==="double_dice"){meta.doubleDiceUnlocked=true;saveMeta();updateHUD();showToast("Double Dice unlocked");return;}
    if(action==="seed_item"){
      if(!gameStarted){showToast("Start a run first");return;}
      const code=dbRuntime.platform.prompt("Paste a Dicebound v1.5 item seed code (starts with D15|):","");if(code==null)return;
      const item=v15GenerateEquipmentFromSeedCode(code);if(!item){dbRuntime.platform.alert("That seed code is not a valid Dicebound v1.5 ordinary-item seed.");return;}
      $("debugOverlay").classList.add("hidden");openLoot(item,()=>{});return;
    }
    if(action==="alwayschoose"){meta.debugAlwaysChooseRolls=!meta.debugAlwaysChooseRolls;saveMeta();refreshDebugButtons();showToast(`Always choose rolls ${meta.debugAlwaysChooseRolls?"enabled":"disabled"}`);return;}
    if(action==="board5"&&gameStarted){boardLevel=5;player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");updateHUD();showToast("Debug: board5");return;}
    if(action==="mythicring"&&gameStarted){equipItem(generateMythicalRing(),true);updateHUD();showToast("Artifact Ring added");return;}
    if(action==="omega_merchant"&&gameStarted){equipItem(generateMerchantWeapon(),true);updateHUD();showToast("The Final Price added");return;}
    if(action==="omega_stone"&&gameStarted){
      equipItem(generatePhilosophersStone(),true);updateHUD();showToast("Philosopher's Stone added");
      // The former v1.10 outer wrapper performed this presentation refresh after
      // the older handler returned; keep that order exactly once.
      renderEquipment();updateHUD();return;
    }

    // Original debug dispatcher. These actions intentionally fall through to the
    // common meta/HUD refresh and generic toast, exactly as released.
    if(action==="runxp"&&gameStarted)grantXp(250);
    if(action==="level"&&gameStarted)forceLevels(5);
    if(action==="legacy"){for(let i=0;i<5;i++){meta.level++;meta.points++;}meta.xpNext=legacyXpForLevel(meta.level);saveMeta();}
    if(action==="talents"){meta.points+=25;saveMeta();}
    if(action==="gold"&&gameStarted)player.gold+=5000;
    if(action==="cookies"){meta.petCookies+=25;saveMeta();}
    if(action==="heal"&&gameStarted){player.hp=player.maxHp;player.ultimateCharge=100;}
    if(action==="unlock"){Object.keys(CLASSES).forEach(k=>meta.unlocks[k]=true);Object.keys(meta.pets).forEach(k=>meta.pets[k].unlocked=true);saveMeta();renderClassChoices();}
    if(action==="dibo50"){meta.pets.neutral.level=30;saveMeta();checkDynamicClassUnlocks();}
    if(action==="nightmare"){meta.nightmareUnlocked=true;saveMeta();renderClassChoices();}
    if(/^board[234]$/.test(action)&&gameStarted){boardLevel=Number(action.slice(-1));player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");}
    if(action==="boss"&&gameStarted){$("debugOverlay").classList.add("hidden");player.position=currentTileCount()-1;refreshBoardHighlights();placePawn(false);rollLocked=true;dbRun.dispatchTile();}
    updateMetaUI();if(gameStarted)updateHUD();showToast(`Debug: ${action}`);
  }'''


def close_brace(src, open_pos):
    depth=0;state='code';quote='';escaped=False;i=open_pos
    while i<len(src):
        ch=src[i];nxt=src[i+1] if i+1<len(src) else ''
        if state=='line':
            if ch=='\n': state='code'
            i+=1;continue
        if state=='block':
            if ch=='*' and nxt=='/': state='code';i+=2;continue
            i+=1;continue
        if state=='string':
            if escaped: escaped=False;i+=1;continue
            if ch=='\\': escaped=True;i+=1;continue
            if ch==quote: state='code';quote=''
            i+=1;continue
        if ch=='/' and nxt=='/': state='line';i+=2;continue
        if ch=='/' and nxt=='*': state='block';i+=2;continue
        if ch in ('"',"'",'`'): state='string';quote=ch;i+=1;continue
        if ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0:return i
        i+=1
    raise RuntimeError(f'unclosed brace at {open_pos}')


def statement_end(src, close_pos):
    i=close_pos+1
    while i<len(src) and src[i] in ' \t\r': i+=1
    if i<len(src) and src[i]==';': i+=1
    if i<len(src) and src[i]=='\n': i+=1
    return i


def main():
    text=MONO.read_text(encoding='utf-8')
    before_bytes=len(text.encode('utf-8'));before_lines=len(text.splitlines())

    # Freeze the exact released chain shape before editing.
    for name in CAPTURES:
        if not re.search(rf'\b(?:const|let|var)\s+{re.escape(name)}\s*=\s*debugAction\s*;',text):
            raise RuntimeError(f'missing expected debugAction predecessor capture: {name}')
    if len(re.findall(r'\bdebugAction\s*=\s*function\s*\(\s*action\s*\)',text))!=9:
        raise RuntimeError('released debugAction replacement count is not 9')
    bases=list(re.finditer(r'\bfunction\s+debugAction\s*\(\s*action\s*\)\s*\{',text))
    if len(bases)!=1: raise RuntimeError(f'expected one original debugAction declaration, found {len(bases)}')

    # Remove each predecessor-capture + anonymous replacement block. Work from
    # source end to start so offsets remain valid.
    spans=[]
    for name in CAPTURES:
        cm=re.search(rf'\b(?:const|let|var)\s+{re.escape(name)}\s*=\s*debugAction\s*;',text)
        am=re.search(r'debugAction\s*=\s*function\s*\(\s*action\s*\)\s*\{',text[cm.end():])
        if not am: raise RuntimeError(f'missing replacement after {name}')
        assign_start=cm.end()+am.start();open_pos=text.find('{',assign_start,cm.end()+am.end());close_pos=close_brace(text,open_pos)
        spans.append((cm.start(),statement_end(text,close_pos),name))
    for start,end,name in sorted(spans,reverse=True):
        text=text[:start]+text[end:]

    base=re.search(r'\bfunction\s+debugAction\s*\(\s*action\s*\)\s*\{',text)
    if not base: raise RuntimeError('original debugAction declaration disappeared')
    open_pos=text.find('{',base.start(),base.end());close_pos=close_brace(text,open_pos)
    text=text[:base.start()]+CANONICAL+text[close_pos+1:]

    if len(re.findall(r'\bfunction\s+debugAction\s*\(',text))!=1: raise RuntimeError('canonical debugAction count is not one')
    if re.search(r'\bdebugAction\s*=\s*function\b',text): raise RuntimeError('debugAction replacement survived')
    if re.search(r'\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*debugAction\s*;',text): raise RuntimeError('debugAction predecessor capture survived')
    for name in CAPTURES:
        if name in text: raise RuntimeError(f'historical debugAction alias survived: {name}')

    MONO.write_text(text,encoding='utf-8',newline='\n')
    after_bytes=len(text.encode('utf-8'));after_lines=len(text.splitlines())

    changelog=CHANGELOG.read_text(encoding='utf-8')
    anchor='## Beta 0.6.6.37\n'
    if anchor not in changelog or '## Beta 0.6.6.38\n' in changelog: raise RuntimeError('unexpected changelog state')
    section=f'''## Beta 0.6.6.38\n\n### Canonical-function archaeology — Debug tooling (#359)\n- Collapsed the released ten-generation `debugAction` chain into one readable canonical dispatcher in the Composition / Bootstrap / Tooling root. The effective outer-to-inner dispatch order, v25 debug logging position and the surviving Philosopher's Stone post-refresh are preserved exactly once; unreachable superseded Mythical handlers and all nine predecessor captures are removed.\n- Added a deterministic repository-wide historical-layer census and anti-return coverage so later archaeology proceeds from measured debt rather than raw file size.\n- Architecture/tooling cleanup only: no gameplay/balance, RNG order/state, save/checkpoint semantics or player-facing UI behavior changes are intended. `dicebound.js` changes from {before_bytes:,} bytes / {before_lines:,} physical lines to {after_bytes:,} bytes / {after_lines:,} physical lines before release metadata materialization.\n\n'''
    CHANGELOG.write_text(changelog.replace(anchor,section+anchor,1),encoding='utf-8',newline='\n')

    notes=PATCH_NOTES.read_text(encoding='utf-8')
    if not notes.startswith('# Unreleased — Beta 0.6.6.37\n'): raise RuntimeError('unexpected patch notes header')
    notes=notes.replace('# Unreleased — Beta 0.6.6.37','# Unreleased — Beta 0.6.6.38',1)
    insertion=f'''\n## Beta 0.6.6.38 Canonical-function archaeology — Debug tooling (#359)\n- Replaced the ten-layer historical `debugAction` chain with one canonical dispatcher while preserving the final released dispatch/logging/post-refresh order.\n- Added a deterministic runtime historical-layer census and anti-return coverage; later rewrites will follow the measured ranking and manual ownership review.\n- No gameplay/balance, RNG order/state, save/checkpoint semantics or player-facing UI behavior changes are intended. `dicebound.js` is {after_bytes:,} bytes / {after_lines:,} physical lines before release metadata materialization.\n'''
    marker='\n## Beta 0.6.6.37 Composition sediment cleanup'
    if marker not in notes: raise RuntimeError('0.6.6.37 patch notes marker missing')
    PATCH_NOTES.write_text(notes.replace(marker,insertion+marker,1),encoding='utf-8',newline='\n')
    print(f'debugAction: 10 generations -> 1; {before_bytes:,}->{after_bytes:,} bytes; {before_lines:,}->{after_lines:,} lines')

if __name__=='__main__': main()
