from __future__ import annotations

import os
import re

import tmp_materialize_0670_chainsaw_v3 as v3

base=v3.base


def remove_isolated_declaration(text:str,name:str)->str:
    code=base.mask_non_code(text)
    count=len(re.findall(rf'\b{re.escape(name)}\b',code))
    if count!=1:
        raise RuntimeError(f'{name} is not isolated after prior cleanup (occurrences={count})')
    source=text.encode('utf-8')
    tree=base.parse(source)
    target=None
    for node in base.walk(tree.root_node):
        if node.type!='lexical_declaration':
            continue
        declarators=[child for child in node.named_children if child.type=='variable_declarator']
        if len(declarators)!=1:
            continue
        ident=declarators[0].child_by_field_name('name')
        if ident and base.node_text(source,ident)==name:
            target=node
            break
    if target is None:
        raise RuntimeError(f'Could not locate isolated declaration: {name}')
    start,end=target.start_byte,target.end_byte
    while end<len(source) and source[end:end+1] in {b' ',b'\t',b';'}:
        end+=1
    if end<len(source) and source[end:end+2]==b'\r\n':
        end+=2
    elif end<len(source) and source[end:end+1]==b'\n':
        end+=1
    return (source[:start]+source[end:]).decode('utf-8')


def targeted_support_cleanup(text:str,removed_names:set[str])->tuple[str,list[str]]:
    # Generic history-prefix sweeping was unsafe. Only remove exact declarations
    # that have become isolated after the preceding, validated transformations.
    requested=[name.strip() for name in os.environ.get('CHAINSAW_SUPPORT_NAMES','v16Talents').split(',') if name.strip()]
    allowed={'db060GuardianArt','db0512GateRewards','v16Talents'}
    unknown=set(requested)-allowed
    if unknown:
        raise RuntimeError(f'Unsupported support-cleanup candidates: {sorted(unknown)}')
    removed=[]
    for name in requested:
        text=remove_isolated_declaration(text,name)
        removed.append(name)
    return text,removed


base.remove_dead_support_declarations=targeted_support_cleanup

if __name__=='__main__':
    raise SystemExit(base.main())
