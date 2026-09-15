from __future__ import annotations

import os
from pathlib import Path

import tmp_materialize_0670_chainsaw as chainsaw

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
INDEX=ROOT/'runtime/index.html'


def main()->int:
    phase=os.environ.get('CHAINSAW_PHASE','control').strip().lower()
    parts=set() if phase=='control' else set(phase.split('+'))
    allowed={'dead','element','delegates','support'}
    unknown=parts-allowed
    if unknown:
        raise SystemExit(f'Unknown phase parts: {sorted(unknown)}')

    text=MONOLITH.read_text(encoding='utf-8')
    removed_names=set()
    killed=[]

    if 'dead' in parts:
        text,dead_nodes,dead_statements,removed_names=chainsaw.delete_dead_proxy_statements(text)
        print(f'dead: nodes={dead_nodes} statements={dead_statements}')

    if 'element' in parts:
        text=chainsaw.replace_element_content(text)
        chainsaw.ELEMENT_MODULE.write_text(chainsaw.ELEMENT_MODULE_TEXT,encoding='utf-8')
        chainsaw.update_manifest()
        index=INDEX.read_text(encoding='utf-8')
        element_tag='<script src="js/combat/element-content.js"></script>'
        if element_tag not in index:
            anchor='<script src="js/combat/effective-stats.js"></script>'
            if anchor not in index:
                raise RuntimeError('Could not find effective-stats script anchor')
            index=index.replace(anchor,element_tag+'\n'+anchor,1)
            INDEX.write_text(index,encoding='utf-8',newline='\n')
        print('element: extracted canonical element metadata')

    if 'delegates' in parts:
        text,killed,skipped=chainsaw.eliminate_delegates(text)
        print(f'delegates: killed={len(killed)} skipped={len(skipped)}')

    if 'support' in parts:
        if 'dead' not in parts:
            raise RuntimeError('support phase requires dead phase so removed-name evidence exists')
        text,support=chainsaw.remove_dead_support_declarations(text,removed_names)
        print(f'support: removed={len(support)}')

    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    print(f'CHAINSAW_PHASE={phase} lines={text.count(chr(10))+1} bytes={len(text.encode("utf-8"))} killed={len(killed)}')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
