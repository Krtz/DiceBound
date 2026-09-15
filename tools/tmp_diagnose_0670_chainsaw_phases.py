from __future__ import annotations

import os
from pathlib import Path

# Exercise the exact corrected deletion/load-graph behavior plus the v3
# hook-safe delegate cutter.
import tmp_materialize_0670_chainsaw_v3 as chainsaw_v3

chainsaw=chainsaw_v3.base
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
        spec=os.environ.get('CHAINSAW_DELEGATE_SLICE','').strip()
        explicit=[name.strip() for name in os.environ.get('CHAINSAW_DELEGATE_NAMES','').split(',') if name.strip()]
        original=chainsaw.DELEGATES
        if spec and explicit:
            raise RuntimeError('Use CHAINSAW_DELEGATE_SLICE or CHAINSAW_DELEGATE_NAMES, not both')
        if explicit:
            missing=[name for name in explicit if name not in original]
            if missing:
                raise RuntimeError(f'Unknown delegate names: {missing}')
            chainsaw.DELEGATES={name:original[name] for name in explicit}
            print(f'delegate names: {", ".join(explicit)}')
        elif spec:
            lo_text,hi_text=spec.split(':',1)
            lo,hi=int(lo_text),int(hi_text)
            names=list(original)
            selected=names[lo:hi]
            chainsaw.DELEGATES={name:original[name] for name in selected}
            print(f'delegate slice {lo}:{hi}: {", ".join(selected)}')
        try:
            text,killed,skipped=chainsaw.eliminate_delegates(text)
        finally:
            chainsaw.DELEGATES=original
        print(f'delegates: killed={len(killed)} skipped={len(skipped)} names={", ".join(killed)}')
        print(f'delegates skipped: {"; ".join(skipped)}')

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
