from __future__ import annotations

import re

import tmp_materialize_0670_chainsaw_v2 as v2

base=v2.base


def route_owner_callbacks(text:str)->str:
    # isClassUnlocked is supplied as a callback value to two composition-owned
    # UI modules. Route those callbacks lazily to the Progression owner before
    # retiring the otherwise-redundant monolith adapter.
    pattern=re.compile(r'(?m)^(\s*)isClassUnlocked,\s*$')
    text,count=pattern.subn(r'\1isClassUnlocked:(...args)=>dbProgression.isClassUnlocked(...args),',text)
    if count != 2:
        raise RuntimeError(f'Expected two isClassUnlocked config shorthands, found {count}')
    return text


def removable_delegate(source:bytes,name:str):
    tree=base.parse(source)
    declarations=[]
    calls=[]
    other=[]
    for node in base.walk(tree.root_node):
        if node.type == 'function_declaration':
            ident=node.child_by_field_name('name')
            if ident and base.node_text(source,ident)==name:
                declarations.append(node)
            continue
        if node.type != 'identifier' or base.node_text(source,node)!=name:
            continue
        parent=node.parent
        if parent and parent.type=='function_declaration' and parent.child_by_field_name('name')==node:
            continue
        if parent and parent.type=='call_expression' and parent.child_by_field_name('function')==node:
            calls.append(node)
            continue
        other.append(node)
    return declarations,calls,other


def corrected_eliminate_delegates(text:str)->tuple[str,list[str],list[str]]:
    # Never rewrite a call until we have proved the adapter is not used as a
    # value/hook anywhere. The old cutter rewrote first and decided later,
    # silently bypassing monkey-patch seams such as resolveEnemyResponse even
    # when it correctly chose to retain their declarations.
    if 'isClassUnlocked' in base.DELEGATES:
        text=route_owner_callbacks(text)
    source=text.encode('utf-8')
    killed=[]
    skipped=[]
    for name,target in base.DELEGATES.items():
        declarations,calls,other=removable_delegate(source,name)
        if len(declarations)!=1:
            skipped.append(f'{name}: declarations={len(declarations)}')
            continue
        if other:
            skipped.append(f'{name}: non-call refs={len(other)}')
            continue

        replacements=[(node.start_byte,node.end_byte,target.encode('utf-8')) for node in calls]
        for start,end,repl in sorted(replacements,reverse=True):
            source=source[:start]+repl+source[end:]

        # Reparse after call replacements because target names may have changed
        # byte offsets around the declaration.
        tree=base.parse(source)
        declaration=None
        for node in base.walk(tree.root_node):
            if node.type!='function_declaration':
                continue
            ident=node.child_by_field_name('name')
            if ident and base.node_text(source,ident)==name:
                declaration=node
                break
        if declaration is None:
            raise RuntimeError(f'Delegate declaration vanished unexpectedly: {name}')
        start,end=declaration.start_byte,declaration.end_byte
        while end<len(source) and source[end:end+1] in {b' ',b'\t'}:
            end+=1
        if end<len(source) and source[end:end+2]==b'\r\n':
            end+=2
        elif end<len(source) and source[end:end+1]==b'\n':
            end+=1
        source=source[:start]+source[end:]
        killed.append(name)
    return source.decode('utf-8'),killed,skipped


base.eliminate_delegates=corrected_eliminate_delegates

if __name__=='__main__':
    raise SystemExit(base.main())
