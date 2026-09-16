from pathlib import Path
import re

import tmp_materialize_0670_chainsaw as base

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'


def registry_aliases(text:str)->tuple[set[str],set[str]]:
    aliases=set()
    helpers=set()
    proxy_alt='|'.join(sorted(map(re.escape,base.PROXIES),key=len,reverse=True))

    # Direct nested registry aliases. Objects returned from DB317 read-only views
    # are proxied recursively, so writes through these aliases were no-ops too.
    direct_patterns=[
        rf'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:{proxy_alt})\.find\s*\(',
        rf'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:{proxy_alt})(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])\s*;',
    ]
    for pattern in direct_patterns:
        aliases.update(m.group(1) for m in re.finditer(pattern,text))

    # Historical versions often wrapped the lookup first, e.g.
    # `const v26Upgrade=id=>upgrades.find(...)`, then mutated the returned item.
    helpers.update(m.group(1) for m in re.finditer(
        rf'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*=>\s*(?:{proxy_alt})\.find\s*\(',text))
    helpers.update(m.group(1) for m in re.finditer(
        rf'\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{{\s*return\s+(?:{proxy_alt})\.find\s*\(',text))

    # Propagate through tiny helper-to-helper wrappers and then through aliases
    # assigned from those helpers. Iterate because several alpha layers stacked
    # helpers on top of earlier helpers.
    changed=True
    while changed:
        changed=False
        if helpers:
            helper_alt='|'.join(sorted(map(re.escape,helpers),key=len,reverse=True))
            for pattern in [
                rf'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*=>\s*(?:{helper_alt})\s*\(',
                rf'\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{{\s*return\s+(?:{helper_alt})\s*\(',
            ]:
                for m in re.finditer(pattern,text):
                    if m.group(1) not in helpers:
                        helpers.add(m.group(1));changed=True
        if helpers:
            helper_alt='|'.join(sorted(map(re.escape,helpers),key=len,reverse=True))
            for m in re.finditer(rf'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:{helper_alt})\s*\(',text):
                if m.group(1) not in aliases:
                    aliases.add(m.group(1));changed=True
    return aliases,helpers


def remove_dead_alias_declarations(text:str,aliases:set[str])->tuple[str,int]:
    removed=0
    for name in sorted(aliases,key=len,reverse=True):
        if len(re.findall(rf'\b{re.escape(name)}\b',text))!=1:
            continue
        pattern=re.compile(
            rf'^[ \t]*const\s+{re.escape(name)}\s*=\s*[^;]+;[ \t]*(?:\r?\n)?',
            re.M,
        )
        text,count=pattern.subn('',text,count=1)
        removed+=count
    return text,removed


def remove_dead_lookup_helpers(text:str,helpers:set[str])->tuple[str,int]:
    removed=0
    for name in sorted(helpers,key=len,reverse=True):
        if len(re.findall(rf'\b{re.escape(name)}\b',text))!=1:
            continue
        patterns=[
            re.compile(rf'^[ \t]*const\s+{re.escape(name)}\s*=\s*[^;]+;[ \t]*(?:\r?\n)?',re.M),
            re.compile(rf'^[ \t]*function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{[^{{}}]*\}}[ \t]*(?:\r?\n)?',re.M),
        ]
        for pattern in patterns:
            text,count=pattern.subn('',text,count=1)
            if count:
                removed+=count;break
    return text,removed


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8')
    before_lines=text.count('\n')+1
    before_bytes=len(text.encode('utf-8'))
    aliases,helpers=registry_aliases(text)
    original=set(base.PROXIES)
    base.PROXIES.update(aliases)
    try:
        text,mutation_nodes,statements,_=base.delete_dead_proxy_statements(text)
    finally:
        base.PROXIES.clear();base.PROXIES.update(original)
    text,dead_aliases=remove_dead_alias_declarations(text,aliases)
    text,dead_helpers=remove_dead_lookup_helpers(text,helpers)
    text=re.sub(r'\n(?:[ \t]*\n){3,}', '\n\n', text)
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    after_lines=text.count('\n')+1
    after_bytes=len(text.encode('utf-8'))
    print(f'REGISTRY_MUTATION_CUT {before_lines}->{after_lines} lines, {before_bytes}->{after_bytes} bytes; helpers={len(helpers)}; aliases={len(aliases)}; mutations={mutation_nodes}; statements={statements}; dead_aliases={dead_aliases}; dead_helpers={dead_helpers}')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
