from __future__ import annotations

import os
from pathlib import Path

# Import the corrected v2 materializer so the diagnostic exercises the exact
# deletion/load-graph behavior that produced the first committed checkpoint.
import tmp_materialize_0670_chainsaw_v2 as chainsaw_v2

chainsaw=chainsaw_v2.base
ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'


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
