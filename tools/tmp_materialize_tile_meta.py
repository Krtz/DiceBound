from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
CHANGELOG = ROOT / "CHANGELOG.md"
PATCH_NOTES = ROOT / "runtime/PATCH_NOTES.md"

CAPTURES = [
    "tileMetaV24Base",
    "tileMetaBeta043Base",
    "tileMetaBeta045Base",
    "db046TileMetaBase",
    "db047TileMetaBase",
    "db049TileMetaBase",
    "db060TileMetaBase",
]

CANONICAL = r'''let dbTileMetaFinalReady=false;
  function tileMeta(tile){
    if(dbTileMetaFinalReady){
      // Final 0.6 guardian art was the outermost generation.
      if(tile?.type==='miniboss'&&tile.enemyBase?.id&&db060GuardianArt(tile.enemyBase.id))return [db060GuardianTileArt(tile.enemyBase.id,tile.enemyBase.name),'Mini Boss · 1 enemy'];
      if(tile?.type==='boss'){
        const boss=DB317_GUARDIANS.resolveFinal(boardLevel);
        if(boss?.id&&boss.art?.boardMarker)return [db060GuardianTileArt(boss.id,boss.name),'Final Boss · 1 enemy'];
      }

      // Beta 0.4.9 current pack rendering supersedes earlier enemy art when it applies.
      if(tile?.type==='enemy'&&Number(tile.packSize||1)>1&&tile?.enemyBase){
        const count=Math.max(2,Number(tile.packSize)||2),name=tile.enemyBase.name||'Enemy';
        return [`<span class="db-enemy-pack-art">${db049EnemyTileIcon(tile)}<b>×${count}</b></span>`,`${name} pack · ${count} enemies`];
      }
      if(tile?.type==='enemy'&&tile?.enemyBase&&(/bandit|troll/i.test(tile.enemyBase.name||''))){
        return [db049EnemyTileIcon(tile),`${tile.enemyBase.name} · 1 enemy`];
      }

      // Preserve the exact 0.4.7 fallback for non-standard Bandit/Troll tiles or
      // when the later enemy-specific generations do not apply.
      const enemyName=tile?.enemyBase?.name||'';
      if(enemyName){
        let icon='';
        if(/bandit/i.test(enemyName))icon=db047UiArt('bandit',enemyName,'db-art-portrait');
        else if(/troll/i.test(enemyName))icon=db047UiArt('troll',enemyName,'db-art-portrait');
        if(icon){
          const n=Math.max(1,Number(tile.packSize||1)||1);
          const visual=n>1?`<span class="db-enemy-pack-art">${icon}<b>×${n}</b></span>`:icon;
          return [visual,n>1?`${enemyName} · ${n} enemies`:`${enemyName} · 1 enemy`];
        }
      }

      // Older art generations remain as real fallbacks because their asset helper
      // can succeed even when a newer helper does not.
      if(tile?.enemyBase?.name){
        const art=db046EnemyArtForName(tile.enemyBase.name);
        if(art&&tile.type==='enemy'){
          const count=tile.packSize||1;
          return [count>1?`${art}${art}`:art,count>1?`${tile.enemyBase.name} pack ×${count}`:`${tile.enemyBase.name} · 1 enemy`];
        }
        if(art&&tile.type==='miniboss')return [art,'Mini Boss · 1 enemy'];
      }
      if(tile?.enemyBase?.name){
        const art=beta045EnemyArtForName(tile.enemyBase.name);
        if(art&&tile.type==='enemy'){
          const count=tile.packSize||1;
          return [count>1?`${art}${art}`:art,count>1?`${tile.enemyBase.name} pack ×${count}`:`${tile.enemyBase.name} · 1 enemy`];
        }
        if(art&&tile.type==='miniboss')return [art,'Mini Boss · 1 enemy'];
      }

      if(tile?.type==='treasure')return [beta043Art('coins','Treasure','db-art-tile')||'💰','Treasure'];
      if(tile?.type==='gambler')return [beta043Art('gambler','Gambler','db-art-tile')||'🪙','Gambler'];
      if(tile?.type==='devilboss')return ['👿🌙','???'];
    }

    // Original base metadata remains the bootstrap fallback until all later art
    // helpers are initialized, and the final fallback after they decline a tile.
    if(tile.type==="enemy"&&tile.enemyBase){const n=tile.packSize||1;return [n===1?tile.enemyBase.icon:n===2?"👹👹":"👹👹👹",n===1?`${tile.enemyBase.name} · 1 enemy`:`Enemy pack · ${n}`];}
    if(tile.type==="miniboss"&&tile.enemyBase)return [tile.enemyBase.icon,"Mini Boss · 1 enemy"];
    return {start:["🏠","Start"],empty:["·","Road"],event:["🎰","Slots"],wheel:["🎡","Wheel"],powerup:["🎁","Powerup"],treasure:["💰","Treasure"],camp:["🔥","Camp"],merchant:["🧔","Merchant"],blessing:["✨","Blessing"],mystic:["🔮","Mystic"],bloodwell:["🩸","Bloodwell"],gambler:["🪙","Gambler"],boss:["🐉","Final Boss · 1"]}[tile.type];
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


def base_span(src: str) -> tuple[int,int]:
    match=re.search(r'\bfunction\s+tileMeta\s*\(\s*tile\s*\)\s*\{',src)
    if not match: raise RuntimeError('base tileMeta declaration missing')
    o=src.find('{',match.start(),match.end());e=close_brace(src,o)
    return match.start(),statement_end(src,e)


def replacement_span(src: str, capture: str) -> tuple[int,int]:
    cap=re.search(rf'\b(?:const|let|var)\s+{re.escape(capture)}\s*=\s*tileMeta\s*;',src)
    if not cap: raise RuntimeError(f'missing tileMeta capture {capture}')
    assignment=re.search(r'\btileMeta\s*=\s*function\s*\(\s*tile\s*\)\s*\{',src[cap.end():])
    if not assignment: raise RuntimeError(f'missing tileMeta assignment after {capture}')
    assign_start=cap.end()+assignment.start();o=src.find('{',assign_start,cap.end()+assignment.end());e=close_brace(src,o)
    return cap.start(),statement_end(src,e)


def main() -> None:
    text=MONO.read_text(encoding='utf-8')
    before_bytes=len(text.encode('utf-8'));before_lines=len(text.splitlines())

    if len(re.findall(r'\btileMeta\s*=\s*function\s*\(\s*tile\s*\)',text))!=7:
        raise RuntimeError('released tileMeta replacement count is not seven')
    spans=[]
    for capture in CAPTURES:
        start,end=replacement_span(text,capture)
        spans.append((start,end,capture))

    # Remove from the end so earlier offsets remain stable. The 0.4.7 compact
    # helper sits inside its historical generation span and is intentionally
    # inlined into the new canonical function.
    for start,end,capture in sorted(spans,reverse=True):
        insertion='\n  dbTileMetaFinalReady=true;\n' if capture=='db060TileMetaBase' else ''
        text=text[:start]+insertion+text[end:]

    start,end=base_span(text)
    text=text[:start]+CANONICAL+'\n'+text[end:]

    if len(re.findall(r'\bfunction\s+tileMeta\s*\(',text))!=1: raise RuntimeError('canonical tileMeta declaration count is not one')
    if re.search(r'\btileMeta\s*=\s*function\b',text): raise RuntimeError('tileMeta replacement survived')
    if re.search(r'\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*tileMeta\s*;',text): raise RuntimeError('tileMeta predecessor capture survived')
    for capture in CAPTURES:
        if re.search(rf'\b{re.escape(capture)}\b',text): raise RuntimeError(f'retired tileMeta alias survived: {capture}')

    text=re.sub(r'(?m)[ \t]+$','',text)
    MONO.write_text(text,encoding='utf-8',newline='\n')
    after_bytes=len(text.encode('utf-8'));after_lines=len(text.splitlines())

    changelog=CHANGELOG.read_text(encoding='utf-8')
    needle='- Collapsed the six-generation `refreshDebugButtons`, four-generation `openDebugMenu`, and two-generation current debug-control builder into one implementation each. Static button creation, tab/logging setup, V26 cleanup/layout and final Artifact labels now compose directly without predecessor chains.\n'
    addition='- Collapsed eight historical `tileMeta` generations into one canonical board-presentation function. Guardian art, current pack art, Bandit/Troll fallbacks, Treasure/Gambler art, the secret devil tile and base labels retain the exact final newest-to-oldest precedence without seven predecessor captures.\n'
    if needle not in changelog or addition in changelog: raise RuntimeError('unexpected changelog state for tileMeta addition')
    CHANGELOG.write_text(changelog.replace(needle,needle+addition,1),encoding='utf-8',newline='\n')

    notes=PATCH_NOTES.read_text(encoding='utf-8')
    needle='- Canonicalized the Debug menu surface too: button refresh, menu opening and current control/tab layout each have one implementation instead of v11→v15→v21→v22→v25→v26 wrapper ladders.\n'
    addition='- Board tile presentation now has one canonical `tileMeta` implementation instead of eight generations; current Guardian/pack art and every released fallback/label precedence are preserved.\n'
    if needle not in notes or addition in notes: raise RuntimeError('unexpected patch-notes state for tileMeta addition')
    PATCH_NOTES.write_text(notes.replace(needle,needle+addition,1),encoding='utf-8',newline='\n')

    print(f'tileMeta canonicalized: 8 generations -> 1; {before_bytes:,}->{after_bytes:,} bytes; {before_lines:,}->{after_lines:,} lines')


if __name__=='__main__':
    main()
