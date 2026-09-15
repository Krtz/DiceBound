from __future__ import annotations

import re

import tmp_materialize_0670_chainsaw_v3 as v3

base=v3.base


def targeted_support_cleanup(text:str,removed_names:set[str])->tuple[str,list[str]]:
    # Do not infer declaration death from naming/history prefixes. Two values the
    # old sweep selected (db060GuardianArt and db0512GateRewards) are live reads.
    # v16Talents is different: DB317 makes its registration loop a guaranteed
    # no-op, so after dead-write removal the authored array has no remaining
    # consumer and can be retired explicitly.
    code=base.mask_non_code(text)
    if len(re.findall(r'\bv16Talents\b',code))!=1:
        raise RuntimeError('v16Talents is not isolated after DB317 dead-write removal')
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
        if ident and base.node_text(source,ident)=='v16Talents':
            target=node
            break
    if target is None:
        raise RuntimeError('Could not locate isolated v16Talents declaration')
    start,end=target.start_byte,target.end_byte
    while end<len(source) and source[end:end+1] in {b' ',b'\t',b';'}:
        end+=1
    if end<len(source) and source[end:end+2]==b'\r\n':
        end+=2
    elif end<len(source) and source[end:end+1]==b'\n':
        end+=1
    result=(source[:start]+source[end:]).decode('utf-8')
    for live in ('db060GuardianArt','db0512GateRewards'):
        if len(re.findall(rf'\b{live}\b',base.mask_non_code(result)))<2:
            raise RuntimeError(f'Live support value unexpectedly lost: {live}')
    return result,['v16Talents']


base.remove_dead_support_declarations=targeted_support_cleanup

if __name__=='__main__':
    raise SystemExit(base.main())
