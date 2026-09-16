from pathlib import Path
import re

import tmp_materialize_0670_chainsaw as base

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'


def registry_aliases(text:str)->set[str]:
    aliases=set()
    proxy_alt='|'.join(sorted(map(re.escape,base.PROXIES),key=len,reverse=True))
    # Historical patches commonly grab an object out of a DB317 read-only view
    # and then mutate the alias. The nested object is still a proxy, so those
    # writes were just as dead as `talents.foo = ...` and should disappear too.
    patterns=[
        rf'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:{proxy_alt})\.find\s*\(',
        rf'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:{proxy_alt})(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])\s*;',
    ]
    for pattern in patterns:
        aliases.update(m.group(1) for m in re.finditer(pattern,text))
    return aliases


def remove_dead_alias_declarations(text:str,aliases:set[str])->tuple[str,int]:
    removed=0
    for name in sorted(aliases,key=len,reverse=True):
        # delete_dead_proxy_statements removes the mutation/if statement. If the
        # source lookup no longer feeds anything, remove that lookup as sediment.
        if len(re.findall(rf'\b{re.escape(name)}\b',text))!=1:
            continue
        pattern=re.compile(
            rf'^[ \t]*const\s+{re.escape(name)}\s*=\s*[^;]+;[ \t]*(?:\r?\n)?',
            re.M,
        )
        text,count=pattern.subn('',text,count=1)
        removed+=count
    return text,removed


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8')
    before_lines=text.count('\n')+1
    before_bytes=len(text.encode('utf-8'))
    aliases=registry_aliases(text)
    original=set(base.PROXIES)
    base.PROXIES.update(aliases)
    try:
        text,mutation_nodes,statements,_=base.delete_dead_proxy_statements(text)
    finally:
        base.PROXIES.clear();base.PROXIES.update(original)
    text,dead_aliases=remove_dead_alias_declarations(text,aliases)
    # Compact the holes left by removed patch strata without minifying useful code.
    text=re.sub(r'\n(?:[ \t]*\n){3,}', '\n\n', text)
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    after_lines=text.count('\n')+1
    after_bytes=len(text.encode('utf-8'))
    print(f'REGISTRY_MUTATION_CUT {before_lines}->{after_lines} lines, {before_bytes}->{after_bytes} bytes; aliases={len(aliases)}; mutations={mutation_nodes}; statements={statements}; dead_aliases={dead_aliases}')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
