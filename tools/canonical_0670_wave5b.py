from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8').replace('\r\n','\n')
    before=text.count('\n')+1
    old='    const [icon,label]=tileMeta(tile);'
    new='    const [icon,label]=dbBoardPresentation.tileMeta(tile,{ready:dbTileMetaFinalReady});'
    if old in text:
        if text.count(old)!=1:raise RuntimeError(f'expected one refreshTile legacy call, found {text.count(old)}')
        text=text.replace(old,new,1)
    elif new not in text:
        raise RuntimeError('refreshTile Board presentation routing drifted')
    if 'const [icon,label]=tileMeta(tile);' in text or '[icon,label]=tileMeta(tile)' in text:
        raise RuntimeError('unowned tileMeta consumer survived Board presentation extraction')
    if text.count('dbBoardPresentation.tileMeta(')!=2:
        raise RuntimeError(f'expected exactly two Board tile metadata consumers, found {text.count("dbBoardPresentation.tileMeta(")}')
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    print(f'CANONICAL_0670_WAVE5B {before}->{text.count(chr(10))+1} monolith lines; refreshTile routed through Board presentation owner')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
