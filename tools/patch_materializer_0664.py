from pathlib import Path
p=Path(__file__).with_name('materialize_0664_ultimate.py')
s=p.read_text(encoding='utf-8')
old="r'\\n  useUltimate=async function\\(\\)\\{\\n    if\\(combatBusy\\|\\|!currentEnemy\\|\\|player\\.ultimateCharge<100\\)[\\s\\S]*?\\n  \\};(?=\\n\\n\\n  async function bloodmageExsanguinate)'"
new="r'\\n  useUltimate=async function\\(\\)\\{[\\s\\S]*?\\n  \\};\\n(?=\\s*async function bloodmageExsanguinate)'"
if old not in s:
    raise SystemExit('expected generic Ultimate materializer pattern not found')
p.write_text(s.replace(old,new,1),encoding='utf-8',newline='\n')
print('Patched 0.6.6.4 generic Ultimate materializer anchor')
