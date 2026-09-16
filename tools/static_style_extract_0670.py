from __future__ import annotations

import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
STYLES=ROOT/'runtime/css/extracted-monolith.css'

CREATE_RE=re.compile(r"(?m)^(?P<indent>[ \t]*)const (?P<name>[A-Za-z_$][\w$]*)=document\.createElement\((?P<q>['\"])style(?P=q)\);")
STATIC_MARKER='/* 0.6.7.0 extracted static runtime patch styles */'
GUARDIAN_MARKER='/* 0.6.7.0 extracted guardian art styles */'


def locate_block(source:str,match:re.Match[str]):
    name=match.group('name')
    token=f'{name}.textContent=`'
    text_pos=source.find(token,match.end())
    if text_pos<0:
        raise RuntimeError(f'{name}: style textContent assignment not found')
    pre=source[match.end():text_pos]
    id_match=re.fullmatch(r"\s*(?:"+re.escape(name)+r"\.id\s*=\s*(['\"])([^'\"]+)\1;\s*)?",pre,re.S)
    if not id_match:
        raise RuntimeError(f'{name}: non-static code exists between style creation and textContent')
    css_start=text_pos+len(token)
    css_end=source.find('`;',css_start)
    if css_end<0:
        raise RuntimeError(f'{name}: unterminated static stylesheet template')
    css=source[css_start:css_end]
    if '${' in css:
        raise RuntimeError(f'{name}: stylesheet contains runtime interpolation and must stay in JavaScript')
    cursor=css_end+2
    while cursor<len(source) and source[cursor].isspace():
        cursor+=1
    append_tokens=(f'document.head.appendChild({name});',f'document.head.append({name});')
    append_token=next((candidate for candidate in append_tokens if source.startswith(candidate,cursor)),None)
    if not append_token:
        raise RuntimeError(f'{name}: canonical document.head append was not found immediately after static CSS')

    start=match.start()
    end=cursor+len(append_token)
    style_id=id_match.group(2) if id_match else None
    guarded=False
    if style_id:
        # Some late patches guarded one-time style creation with exactly:
        # if(!document.getElementById('the-style-id')) { const style=...; ... }
        # A real stylesheet makes that entire installer obsolete. Recognize only
        # this exact immediately-enclosing shape; any other style-node use still
        # fails closed below.
        prefix=source[:start]
        guard_re=re.compile(
            r"(?:^|\n)(?P<guard>[ \t]*if\(!document\.getElementById\((['\"])"
            +re.escape(style_id)
            +r"\2\)\)\{[ \t]*\n?)\Z"
        )
        guard=guard_re.search(prefix)
        if guard:
            after=end
            while after<len(source) and source[after].isspace():
                after+=1
            if after>=len(source) or source[after]!='}':
                raise RuntimeError(f'{name}: guarded style installer has no immediate closing brace')
            start=guard.start('guard')
            end=after+1
            guarded=True

        outside=source[:start]+source[end:]
        if style_id in outside:
            context=' after removing its one-time installer' if guarded else ''
            raise RuntimeError(f'{name}: style element id {style_id!r} is referenced outside its declaration{context}')
    return start,end,name,css.strip()


def main()->int:
    source=MONOLITH.read_text(encoding='utf-8').replace('\r\n','\n')
    css_file=STYLES.read_text(encoding='utf-8').replace('\r\n','\n')
    before_lines=source.count('\n')+1
    matches=list(CREATE_RE.finditer(source))
    if not matches:
        if STATIC_MARKER in css_file:
            print(f'STATIC_STYLE_EXTRACT already canonical; monolith={before_lines} lines')
            return 0
        raise RuntimeError('No runtime-created style blocks found and extraction marker is absent')

    blocks=[locate_block(source,match) for match in matches]
    # Every style constructor must be understood before we mutate anything.
    if len(blocks)<10:
        raise RuntimeError(f'Expected a substantial static-style wave, found only {len(blocks)} blocks')
    ordered=sorted(blocks,key=lambda block:block[0])
    for previous,current in zip(ordered,ordered[1:]):
        if previous[1]>current[0]:
            raise RuntimeError(f'Overlapping style extraction spans: {previous[2]} and {current[2]}')

    for start,end,_,_ in reversed(ordered):
        source=source[:start]+source[end:]

    if CREATE_RE.search(source):
        raise RuntimeError('A runtime style constructor survived static extraction')
    if STATIC_MARKER in css_file:
        raise RuntimeError('Static patch-style extraction marker already exists while runtime blocks still survived')
    if GUARDIAN_MARKER not in css_file:
        raise RuntimeError('Guardian-art CSS marker missing; cannot preserve final cascade order safely')

    chunks=[STATIC_MARKER,'/* These blocks retain their original dicebound.js source order. */']
    for _,_,name,css in ordered:
        chunks.extend(['',f'/* {name} */',css])
    insertion='\n'.join(chunks).rstrip()+'\n\n'
    css_file=css_file.replace(GUARDIAN_MARKER,insertion+GUARDIAN_MARKER,1)

    while '\n\n\n' in source:
        source=source.replace('\n\n\n','\n\n')
    MONOLITH.write_text(source,encoding='utf-8',newline='\n')
    STYLES.write_text(css_file,encoding='utf-8',newline='\n')
    after_lines=source.count('\n')+1
    css_lines=sum(css.count('\n')+1 for *_,css in ordered)
    print(f'STATIC_STYLE_EXTRACT {before_lines}->{after_lines} monolith lines; blocks={len(ordered)}; css_lines={css_lines}; cascade inserted before guardian-art rules')
    print('extracted: '+', '.join(name for _,_,name,_ in ordered))
    return 0


if __name__=='__main__':
    raise SystemExit(main())
