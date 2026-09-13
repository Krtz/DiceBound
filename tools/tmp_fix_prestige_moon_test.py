from pathlib import Path

path=Path('tools/test_prestige_moon.js')
text=path.read_text(encoding='utf-8')
old="assert.match(monolith,/function v27CompletePrestigeNoChoice\\(total\\)\\{return dbProgression\\.completePrestige\\(total\\);\\}/,'compatibility runtime must delegate the final reset transaction to DiceboundProgression');"
new="""assert.match(monolith,/async function prestigeTree\\(\\)/,'final Prestige entry should be the single live entry point');
assert.match(monolith,/return dbProgression\\.completePrestige\\(total\\);/,'final Prestige entry must delegate directly to DiceboundProgression');
assert.doesNotMatch(monolith,/v27CompletePrestigeNoChoice/,'retired V27 Prestige alias must not remain');"""
if text.count(old)!=1:
    raise SystemExit(f'expected one stale Prestige Moon facade assertion, found {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')
print('Prestige Moon test updated for direct facade entry.')
