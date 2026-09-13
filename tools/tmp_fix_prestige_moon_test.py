from pathlib import Path

moon_path=Path('tools/test_prestige_moon.js')
text=moon_path.read_text(encoding='utf-8')
old="assert.match(monolith,/function v27CompletePrestigeNoChoice\\(total\\)\\{return dbProgression\\.completePrestige\\(total\\);\\}/,'compatibility runtime must delegate the final reset transaction to DiceboundProgression');"
new="""assert.match(monolith,/async function prestigeTree\\(\\)/,'final Prestige entry should be the single live entry point');
assert.match(monolith,/return dbProgression\\.completePrestige\\(total\\);/,'final Prestige entry must delegate directly to DiceboundProgression');
assert.doesNotMatch(monolith,/v27CompletePrestigeNoChoice/,'retired V27 Prestige alias must not remain');"""
if text.count(old)!=1:
    raise SystemExit(f'expected one stale Prestige Moon facade assertion, found {text.count(old)}')
moon_path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')

checkpoint_path=Path('tools/test_run_checkpoint.js')
text=checkpoint_path.read_text(encoding='utf-8')
old='assert.match(monolith,/const dbRunCompletePrestigeBase=completePrestige;completePrestige=function/);'
new='''assert.match(monolith,/const dbRunOpenStartBase=openStartScreen;openStartScreen=function\\(\\.\\.\\.args\\)\\{dbRunClearCheckpoint\\(\\);/,"between-run start boundary must clear the active-run checkpoint");
assert.doesNotMatch(monolith,/dbRunCompletePrestigeBase/,"retired Prestige-specific checkpoint wrapper must stay drained");'''
if text.count(old)!=1:
    raise SystemExit(f'expected one stale Prestige checkpoint wrapper assertion, found {text.count(old)}')
checkpoint_path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')
print('Prestige Moon and run-checkpoint tests updated for final Progression boundaries.')
