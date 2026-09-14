from pathlib import Path

path=Path('tools/test_combat_strike_resolution.js')
text=path.read_text(encoding='utf-8')
old='''for(const adapter of [\n  "let dbCombatStrikes=null;",\n  "return dbCombatStrikes.strikeBaseDamage(...args);",\n  "return dbCombatStrikes.performStrike(...args);",\n  "const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;",\n  "dbCombatStrikes=dbCombatStrikeOwner.configure({"\n])assert.ok(monolith.includes(adapter),`missing strike-resolution composition adapter: ${adapter}`);\n'''
new='''for(const adapter of [\n  "let dbCombatStrikes=null;",\n  "return dbCombat.strikeBaseDamage(...args);",\n  "return dbCombat.strike(...args);",\n  "const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;",\n  "dbCombatStrikes=dbCombatStrikeOwner.configure({",\n  "strikes:dbCombatStrikes"\n])assert.ok(monolith.includes(adapter),`missing strike-resolution composition/facade route: ${adapter}`);\nfor(const retiredAdapter of [\n  "return dbCombatStrikes.strikeBaseDamage(...args);",\n  "return dbCombatStrikes.performStrike(...args);"\n])assert.ok(!monolith.includes(retiredAdapter),`direct peer-public strike adapter returned: ${retiredAdapter}`);\n'''
if text.count(old)!=1:
    raise SystemExit(f'strike architecture guard anchor mismatch: {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')
print('Combat strike facade architecture guard updated')
