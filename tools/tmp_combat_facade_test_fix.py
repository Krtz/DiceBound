from pathlib import Path

# Strike composition guard: the focused owner stays configured internally, while
# ordinary monolith calls must now cross the public Combat facade.
path=Path('tools/test_combat_strike_resolution.js')
text=path.read_text(encoding='utf-8')
old='''for(const adapter of [\n  "let dbCombatStrikes=null;",\n  "return dbCombatStrikes.strikeBaseDamage(...args);",\n  "return dbCombatStrikes.performStrike(...args);",\n  "const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;",\n  "dbCombatStrikes=dbCombatStrikeOwner.configure({"\n])assert.ok(monolith.includes(adapter),`missing strike-resolution composition adapter: ${adapter}`);\n'''
new='''for(const adapter of [\n  "let dbCombatStrikes=null;",\n  "return dbCombat.strikeBaseDamage(...args);",\n  "return dbCombat.strike(...args);",\n  "const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;",\n  "dbCombatStrikes=dbCombatStrikeOwner.configure({",\n  "strikes:dbCombatStrikes"\n])assert.ok(monolith.includes(adapter),`missing strike-resolution composition/facade route: ${adapter}`);\nfor(const retiredAdapter of [\n  "return dbCombatStrikes.strikeBaseDamage(...args);",\n  "return dbCombatStrikes.performStrike(...args);"\n])assert.ok(!monolith.includes(retiredAdapter),`direct peer-public strike adapter returned: ${retiredAdapter}`);\n'''
if text.count(old)!=1:
    raise SystemExit(f'strike architecture guard anchor mismatch: {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')

# Turn composition guard: same rule for enemy turn/response routing.
path=Path('tools/test_combat_turn_resolution.js')
text=path.read_text(encoding='utf-8')
old='''for(const adapter of [\n  "let dbCombatTurns=null;",\n  "return dbCombatTurns.enemyTurn(...args);",\n  "return dbCombatTurns.resolveEnemyResponse(...args);",\n  "const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;",\n  "dbCombatTurns=dbCombatTurnOwner.configure({"\n])assert.ok(monolith.includes(adapter),`missing combat turn-resolution composition adapter: ${adapter}`);\n'''
new='''for(const adapter of [\n  "let dbCombatTurns=null;",\n  "return dbCombat.enemyTurn(...args);",\n  "return dbCombat.enemyResponse(...args);",\n  "const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;",\n  "dbCombatTurns=dbCombatTurnOwner.configure({",\n  "turns:dbCombatTurns"\n])assert.ok(monolith.includes(adapter),`missing combat turn-resolution composition/facade route: ${adapter}`);\nfor(const retiredAdapter of [\n  "return dbCombatTurns.enemyTurn(...args);",\n  "return dbCombatTurns.resolveEnemyResponse(...args);"\n])assert.ok(!monolith.includes(retiredAdapter),`direct peer-public turn adapter returned: ${retiredAdapter}`);\n'''
if text.count(old)!=1:
    raise SystemExit(f'turn architecture guard anchor mismatch: {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')

# The checkpoint regression has a Combat Pet seam assertion because pet turns
# participate in resumable combat. Preserve the focused owner composition but
# require the ordinary compatibility seam to route through DiceboundCombat.
path=Path('tools/test_run_checkpoint.js')
text=path.read_text(encoding='utf-8')
old='''assert.match(monolith,/return dbCombatPetTurnResolution\\.petTurn\\(\\.\\.\\.args\\)/,"petTurn compatibility seam must delegate to the extracted owner");'''
new='''assert.match(monolith,/return dbCombat\\.petTurn\\(\\.\\.\\.args\\)/,"petTurn compatibility seam must delegate through the Combat facade");\nassert.doesNotMatch(monolith,/return dbCombatPetTurnResolution\\.petTurn\\(\\.\\.\\.args\\)/,"petTurn peer-public compatibility seam must stay drained");'''
if text.count(old)!=1:
    raise SystemExit(f'checkpoint petTurn architecture guard anchor mismatch: {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')

print('Combat facade architecture guards updated')
