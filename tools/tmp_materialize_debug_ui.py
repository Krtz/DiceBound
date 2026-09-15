from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
CHANGELOG = ROOT / "CHANGELOG.md"
PATCH_NOTES = ROOT / "runtime/PATCH_NOTES.md"

REFRESH_CAPTURES = [
    "refreshDebugButtonsV15Patch",
    "refreshDebugButtonsV21Base",
    "refreshDebugButtonsV22Base",
    "refreshDebugButtonsV25Base",
    "refreshDebugButtonsV26Base",
]
OPEN_CAPTURES = [
    "openDebugMenuV11",
    "openDebugMenuV24PresentationBase",
    "openDebugMenuV25Base",
]
CURRENT_CONTROLS_CAPTURE = "v25EnsureDebugControlsV26Base"

CANONICAL_REFRESH = r'''let dbDebugUiReady=false;
  function refreshDebugButtons(){
    const grid=$("debugGrid");if(!grid)return;
    const ensure=(id,label)=>{let btn=grid.querySelector(`[data-debug="${id}"]`);if(!btn){btn=document.createElement("button");btn.dataset.debug=id;btn.className="small-btn";grid.appendChild(btn);}btn.textContent=label;return btn;};

    // The static controls accumulated through v11, v1.5 and v21 now have one owner.
    ensure("alwayschoose",`${meta.debugAlwaysChooseRolls?"☑":"☐"} Always choose dice`);
    ensure("board5","Board 5");
    ensure("mythicring","Artifact Ring");
    ensure("omega_merchant","The Final Price");
    ensure("omega_stone","Philosopher's Stone");
    for(const [id,label] of [
      ["mythic_weapon","🌈 Mythic Weapon"],["mythic_boots","🌈 Mythic Boots"],["mythic_legs","🌈 Mythic Legguards"],
      ["mythic_amulet","🌈 Mythic Amulet"],["mythic_hat","🌈 Mythic Hat"],["mythic_ring","🌈 Mythic Ring"],["seed_item","🧬 Add item by seed code"],
      ["all_powerups","🎁 Choose any eligible powerup"]
    ])ensure(id,label);

    // v22 split the old destructive unlock button into separate class/Pet cheats.
    const old=grid.querySelector('[data-debug="unlock"]');
    if(old){old.dataset.debug="unlockclasses";old.textContent="🔓 Unlock all classes";}
    else ensure("unlockclasses","🔓 Unlock all classes");
    ensure("unlockpets","🐾 Unlock all pets");

    // During source evaluation the later v25/V26 control machinery is not ready
    // yet. Once the final debug UI generation has initialized, every ordinary
    // refresh also performs the current tab/control sync exactly once.
    if(dbDebugUiReady)v25EnsureDebugControls();
  }'''

CANONICAL_OPEN = r'''function openDebugMenu(){
    $("debugOverlay").classList.remove("hidden");
    refreshDebugButtons();
    v24RefreshDebugLabels();
    v25EnsureDebugControls();
  }'''


def close_brace(src: str, open_pos: int) -> int:
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


def statement_end(src: str, close_pos: int) -> int:
    i=close_pos+1
    while i<len(src) and src[i] in ' \t\r': i+=1
    if i<len(src) and src[i]==';': i+=1
    if i<len(src) and src[i]=='\n': i+=1
    return i


def function_span(src: str, name: str) -> tuple[int,int,int,int]:
    match=re.search(rf'\bfunction\s+{re.escape(name)}\s*\([^)]*\)\s*\{{',src)
    if not match: raise RuntimeError(f'missing function declaration: {name}')
    open_pos=src.find('{',match.start(),match.end());close_pos=close_brace(src,open_pos)
    return match.start(),statement_end(src,close_pos),open_pos,close_pos


def replacement_span(src: str, public_name: str, capture: str) -> tuple[int,int,int,int]:
    cap=re.search(rf'\b(?:const|let|var)\s+{re.escape(capture)}\s*=\s*{re.escape(public_name)}\s*;',src)
    if not cap: raise RuntimeError(f'missing predecessor capture: {capture}')
    assign=re.search(rf'{re.escape(public_name)}\s*=\s*function\s*\([^)]*\)\s*\{{',src[cap.end():])
    if not assign: raise RuntimeError(f'missing {public_name} replacement after {capture}')
    assign_start=cap.end()+assign.start();open_pos=src.find('{',assign_start,cap.end()+assign.end());close_pos=close_brace(src,open_pos)
    return cap.start(),statement_end(src,close_pos),open_pos,close_pos


def remove_replacements(src: str, public_name: str, captures: list[str], insert_after_capture: str|None=None, insertion: str='') -> str:
    spans=[]
    for capture in captures:
        start,end,_,_=replacement_span(src,public_name,capture)
        spans.append((start,end,capture))
    for start,end,capture in sorted(spans,reverse=True):
        replacement=insertion if capture==insert_after_capture else ''
        src=src[:start]+replacement+src[end:]
    return src


def canonicalize_current_controls(text: str) -> str:
    # Capture the released v26 extension before removing it.
    wrapper_start,wrapper_end,wrapper_open,wrapper_close=replacement_span(text,'v25EnsureDebugControls',CURRENT_CONTROLS_CAPTURE)
    wrapper_body=text[wrapper_open+1:wrapper_close]
    predecessor_call=f'{CURRENT_CONTROLS_CAPTURE}();'
    if predecessor_call not in wrapper_body:
        raise RuntimeError('v26 current-controls wrapper no longer calls its predecessor exactly once')
    if wrapper_body.count(CURRENT_CONTROLS_CAPTURE)!=1:
        raise RuntimeError('v26 current-controls predecessor call shape changed')
    extra=wrapper_body.replace(predecessor_call,'',1).strip()
    text=text[:wrapper_start]+text[wrapper_end:]

    start,end,open_pos,close_pos=function_span(text,'v25EnsureDebugControls')
    body=text[open_pos+1:close_pos]
    guard="const modal=$('debugOverlay')?.querySelector('.modal'),grid=$('debugGrid');if(!modal||!grid)return;"
    if guard not in body:
        raise RuntimeError('v25 current-controls initial guard changed; review merge manually')
    before,after=body.split(guard,1)
    canonical=(
        'function v25EnsureDebugControls(){'+before+
        "const modal=$('debugOverlay')?.querySelector('.modal'),grid=$('debugGrid');\n"
        '    if(modal&&grid){'+after+'\n    }\n'
        '    {\n      '+extra.replace('\n','\n      ')+'\n    }\n'
        '  }'
    )
    return text[:start]+canonical+text[end:]


def main() -> None:
    text=MONO.read_text(encoding='utf-8')
    before_bytes=len(text.encode('utf-8'));before_lines=len(text.splitlines())

    # Verify the released chain inventory before rewriting anything.
    for capture in REFRESH_CAPTURES:
        replacement_span(text,'refreshDebugButtons',capture)
    for capture in OPEN_CAPTURES:
        replacement_span(text,'openDebugMenu',capture)
    replacement_span(text,'v25EnsureDebugControls',CURRENT_CONTROLS_CAPTURE)
    if len(re.findall(r'\bfunction\s+refreshDebugButtons\s*\(',text))!=1: raise RuntimeError('refreshDebugButtons base declaration count changed')
    if len(re.findall(r'\bfunction\s+openDebugMenu\s*\(',text))!=1: raise RuntimeError('openDebugMenu base declaration count changed')
    if len(re.findall(r'\bfunction\s+v25EnsureDebugControls\s*\(',text))!=1: raise RuntimeError('v25EnsureDebugControls base declaration count changed')

    # First merge the current v25/V26 control builder, so the final refresh/open
    # functions can target one stable current implementation.
    text=canonicalize_current_controls(text)

    # Drain the five refresh wrappers. At the final v26 generation, flip the
    # readiness flag and perform one complete current refresh.
    text=remove_replacements(
        text,'refreshDebugButtons',REFRESH_CAPTURES,
        insert_after_capture='refreshDebugButtonsV26Base',
        insertion='\n  dbDebugUiReady=true;refreshDebugButtons();\n'
    )
    start,end,_,_=function_span(text,'refreshDebugButtons')
    text=text[:start]+CANONICAL_REFRESH+text[end:]

    # Drain open-menu wrappers and replace the original with the final released
    # composition order (overlay -> refresh -> v24 labels -> current controls).
    text=remove_replacements(text,'openDebugMenu',OPEN_CAPTURES)
    start,end,_,_=function_span(text,'openDebugMenu')
    text=text[:start]+CANONICAL_OPEN+text[end:]

    # Structural anti-shadow assertions before writing.
    for name in ('refreshDebugButtons','openDebugMenu','v25EnsureDebugControls'):
        if re.search(rf'\b{re.escape(name)}\s*=\s*function\b',text):
            raise RuntimeError(f'{name} replacement survived canonicalization')
        if len(re.findall(rf'\bfunction\s+{re.escape(name)}\s*\(',text))!=1:
            raise RuntimeError(f'{name} canonical declaration count is not one')
    for capture in REFRESH_CAPTURES+OPEN_CAPTURES+[CURRENT_CONTROLS_CAPTURE]:
        if re.search(rf'\b{re.escape(capture)}\b',text):
            raise RuntimeError(f'retired debug UI alias survived: {capture}')

    text=re.sub(r'(?m)^[ \t]+$','',text)
    MONO.write_text(text,encoding='utf-8',newline='\n')
    after_bytes=len(text.encode('utf-8'));after_lines=len(text.splitlines())

    changelog=CHANGELOG.read_text(encoding='utf-8')
    needle='- Added a deterministic repository-wide historical-layer census and anti-return coverage so later archaeology proceeds from measured debt rather than raw file size.\n'
    addition='- Collapsed the six-generation `refreshDebugButtons`, four-generation `openDebugMenu`, and two-generation current debug-control builder into one implementation each. Static button creation, tab/logging setup, V26 cleanup/layout and final Artifact labels now compose directly without predecessor chains.\n'
    if needle not in changelog or addition in changelog: raise RuntimeError('unexpected 0.6.6.38 changelog state for debug UI addition')
    CHANGELOG.write_text(changelog.replace(needle,needle+addition,1),encoding='utf-8',newline='\n')

    notes=PATCH_NOTES.read_text(encoding='utf-8')
    needle='- Added a deterministic runtime historical-layer census and anti-return coverage; later rewrites will follow the measured ranking and manual ownership review.\n'
    addition='- Canonicalized the Debug menu surface too: button refresh, menu opening and current control/tab layout each have one implementation instead of v11→v15→v21→v22→v25→v26 wrapper ladders.\n'
    if needle not in notes or addition in notes: raise RuntimeError('unexpected 0.6.6.38 patch-note state for debug UI addition')
    PATCH_NOTES.write_text(notes.replace(needle,needle+addition,1),encoding='utf-8',newline='\n')

    print(f'debug UI canonicalized: refresh 6->1, open 4->1, current-controls 2->1; {before_bytes:,}->{after_bytes:,} bytes; {before_lines:,}->{after_lines:,} lines')


if __name__=='__main__':
    main()
