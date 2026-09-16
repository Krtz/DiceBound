from pathlib import Path

import tmp_materialize_0670_chainsaw as base

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8')
    before_lines=text.count('\n')+1
    before_bytes=len(text.encode('utf-8'))
    text,mutation_nodes,statements,_=base.delete_dead_proxy_statements(text)
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    after_lines=text.count('\n')+1
    after_bytes=len(text.encode('utf-8'))
    print(f'REGISTRY_MUTATION_CUT {before_lines}->{after_lines} lines, {before_bytes}->{after_bytes} bytes; mutations={mutation_nodes}; statements={statements}')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
