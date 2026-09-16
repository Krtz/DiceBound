from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FILES=(
    ROOT/'runtime/js/dicebound.js',
    ROOT/'runtime/css/extracted-monolith.css',
    ROOT/'tools/test_items_oracle.js',
)

for path in FILES:
    text=path.read_text(encoding='utf-8')
    cleaned='\n'.join(line.rstrip() for line in text.splitlines()).rstrip()+'\n'
    path.write_text(cleaned,encoding='utf-8',newline='\n')
    print(f'WHITESPACE_CLEAN {path.relative_to(ROOT)}')
