from pathlib import Path


def replace_exact(path, old, new, label):
    text=path.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')

# petDamage is also rendered on Camp before the Combat internals have been
# configured. Keep that released startup fallback, but once Combat is configured
# route the ordinary runtime call through the public facade.
path=Path('runtime/js/dicebound.js')
old='''function petDamage(){if(dbCombatPetTurnResolution)return dbCombatPetTurnResolution.petDamage();const talentBonus=gameStarted?player.petDamageBonus:talentRank("companion_damage")+talentRank("companion_ascendant")*2;return 1+Math.ceil((activePetState()?.level||1)*.8)+talentBonus;}'''
new='''function petDamage(){if(dbCombat)return dbCombat.petDamage();const talentBonus=gameStarted?player.petDamageBonus:talentRank("companion_damage")+talentRank("companion_ascendant")*2;return 1+Math.ceil((activePetState()?.level||1)*.8)+talentBonus;}'''
replace_exact(path,old,new,'petDamage startup/facade seam')

# Strike composition guard: the focused owner stays configured internally, while
# ordinary monolith calls must now cross the public Combat facade.
path=Path('tools/test_combat_strike_resolution.js')
old='''for(const adapter of [\n  "let dbCombatStrikes=null;",\n  "return dbCombatStrikes.strikeBaseDamage(...args);",\n  "return dbCombatStrikes.performStrike(...args);",\n  "const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;",\n  "dbCombatStrikes=dbCombatStrikeOwner.configure({"\n])assert.ok(monolith.includes(adapter),`missing strike-resolution composition adapter: ${adapter}`);\n'''
new='''for(const adapter of [\n  "let dbCombatStrikes=null;",\n  "return dbCombat.strikeBaseDamage(...args);",\n  "return dbCombat.strike(...args);",\n  "const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;",\n  "dbCombatStrikes=dbCombatStrikeOwner.configure({",\n  "strikes:dbCombatStrikes"\n])assert.ok(monolith.includes(adapter),`missing strike-resolution composition/facade route: ${adapter}`);\nfor(const retiredAdapter of [\n  "return dbCombatStrikes.strikeBaseDamage(...args);",\n  "return dbCombatStrikes.performStrike(...args);"\n])assert.ok(!monolith.includes(retiredAdapter),`direct peer-public strike adapter returned: ${retiredAdapter}`);\n'''
replace_exact(path,old,new,'strike architecture guard')

# Turn composition guard: same rule for enemy turn/response routing.
path=Path('tools/test_combat_turn_resolution.js')
old='''for(const adapter of [\n  "let dbCombatTurns=null;",\n  "return dbCombatTurns.enemyTurn(...args);",\n  "return dbCombatTurns.resolveEnemyResponse(...args);",\n  "const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;",\n  "dbCombatTurns=dbCombatTurnOwner.configure({"\n])assert.ok(monolith.includes(adapter),`missing combat turn-resolution composition adapter: ${adapter}`);\n'''
new='''for(const adapter of [\n  "let dbCombatTurns=null;",\n  "return dbCombat.enemyTurn(...args);",\n  "return dbCombat.enemyResponse(...args);",\n  "const dbCombatTurnOwner=window.DiceboundCombatTurnResolution;",\n  "dbCombatTurns=dbCombatTurnOwner.configure({",\n  "turns:dbCombatTurns"\n])assert.ok(monolith.includes(adapter),`missing combat turn-resolution composition/facade route: ${adapter}`);\nfor(const retiredAdapter of [\n  "return dbCombatTurns.enemyTurn(...args);",\n  "return dbCombatTurns.resolveEnemyResponse(...args);"\n])assert.ok(!monolith.includes(retiredAdapter),`direct peer-public turn adapter returned: ${retiredAdapter}`);\n'''
replace_exact(path,old,new,'turn architecture guard')

# Run-checkpoint regression: Pet turns participate in resumable combat, but the
# ordinary compatibility seam now belongs to DiceboundCombat.
path=Path('tools/test_run_checkpoint.js')
old='''assert.match(monolith,/return dbCombatPetTurnResolution\\.petTurn\\(\\.\\.\\.args\\)/,"petTurn compatibility seam must delegate to the extracted owner");'''
new='''assert.match(monolith,/return dbCombat\\.petTurn\\(\\.\\.\\.args\\)/,"petTurn compatibility seam must delegate through the Combat facade");\nassert.doesNotMatch(monolith,/return dbCombatPetTurnResolution\\.petTurn\\(\\.\\.\\.args\\)/,"petTurn peer-public compatibility seam must stay drained");'''
replace_exact(path,old,new,'checkpoint petTurn architecture guard')

# Enemy scaling remains focused internally while ordinary calls cross Combat.
path=Path('tools/test_enemy_scaling_extraction_boundary.py')
old='''    assert re.search(r"return\\s+dbEnemyScalingResolution\\.scale\\(", mono), (\n        "scaleEnemy thin adapter must delegate to the authoritative owner"\n    )\n    print("Enemy scaling extraction boundary PASS (authoritative owner + thin adapter)")\n'''
new='''    assert re.search(r"return\\s+dbCombat\\.scaleEnemy\\(", mono), (\n        "scaleEnemy thin adapter must delegate through the public Combat facade"\n    )\n    assert not re.search(r"return\\s+dbEnemyScalingResolution\\.scale\\(", mono), (\n        "direct peer-public enemy-scaling adapter returned"\n    )\n    assert "scaling:dbEnemyScalingResolution" in mono, (\n        "focused enemy-scaling owner must remain composed behind DiceboundCombat"\n    )\n    print("Enemy scaling extraction boundary PASS (focused owner behind Combat facade)")\n'''
replace_exact(path,old,new,'enemy scaling architecture guard')

# The broad spring-clean test used to freeze every focused Combat owner as a
# peer-public monolith adapter. Preserve its focused-owner/configuration checks,
# but make the public-boundary assertions match the new architecture.
path=Path('tools/test_shadow_ownership_drain.py')
text=path.read_text(encoding='utf-8')
replacements=[
    ("assert 'return dbEnemyScalingResolution.scale(...args);' in mono, 'scaleEnemy thin adapter must delegate to the owner'","assert 'return dbCombat.scaleEnemy(...args);' in mono, 'scaleEnemy thin adapter must delegate through Combat'"),
    ('assert "return dbCombatEncounterLifecycle.start(kind);" in mono, \'encounter lifecycle thin adapter is missing\'','assert "return dbCombat.startEncounter(kind);" in mono, \'Combat facade encounter adapter is missing\''),
    ('assert "return dbCombatUltimateResolution.start(...args);" in mono, \'Ultimate thin adapter is missing\'','assert "return dbCombat.ultimate(...args);" in mono, \'Combat facade Ultimate adapter is missing\''),
    ('assert "return dbCombatGuardResolution.guardAction(...args);" in mono, \'Guard thin adapter is missing\'','assert "return dbCombat.guard(...args);" in mono, \'Combat facade Guard adapter is missing\''),
    ('assert "dbCombatGuardResolution.identityGuardAction" in mono, \'identity Guard thin adapter is missing\'','assert "dbCombat.identityGuard" in mono, \'Combat facade identity Guard adapter is missing\''),
    ('assert "return dbCombatPetTurnResolution.petTurn(...args);" in mono, \'Pet turn thin adapter is missing\'','assert "return dbCombat.petTurn(...args);" in mono, \'Combat facade Pet turn adapter is missing\''),
    ('assert "return dbCombatPetTurnResolution.petDamage();" in mono, \'Pet damage thin adapter is missing\'','assert "if(dbCombat)return dbCombat.petDamage();" in mono, \'Combat facade Pet damage adapter/fallback is missing\''),
    ('assert "return dbCombatPetTurnResolution.trainerPetDamage(id);" in mono, \'Trainer Pet damage thin adapter is missing\'','assert "return dbCombat.trainerPetDamage(id);" in mono, \'Combat facade Trainer Pet damage adapter is missing\''),
    ('assert "return dbCombatVictoryResolution.winCombat(...args);" in mono, \'Victory thin adapter is missing\'','assert "return dbCombat.win(...args);" in mono, \'Combat facade Victory adapter is missing\''),
    ('assert "dbCombatHealingResolution.healPlayer.apply(this,args)" in mono, \'healPlayer thin adapter is missing\'','assert "return dbCombat.heal(...args);" in mono, \'Combat facade heal adapter is missing\''),
    ('assert "dbCombatHealingResolution.recordHealing.apply(this,args)" in mono, \'recordHealing thin adapter is missing\'','assert "return dbCombat.recordHealing(...args);" in mono, \'Combat facade healing-record adapter is missing\''),
    ('assert "dbCombatHealingResolution.clearBloodOverhealTemp.apply(this,args)" in mono, \'Blood Overheal cleanup adapter is missing\'','assert "return dbCombat.clearBloodOverhealTemp(...args);" in mono, \'Combat facade Blood Overheal cleanup adapter is missing\''),
    ('assert "dbCombatHealingResolution.clearStoneBattle.apply(this,args)" in mono, \'Stone cleanup adapter is missing\'','assert "return dbCombat.clearStoneBattle(...args);" in mono, \'Combat facade Stone cleanup adapter is missing\''),
    ('assert "dbCombatElementResolution.triggerElementEffect.apply(this,args)" in mono, \'triggerElementEffect thin adapter is missing\'','assert "return dbCombat.element(...args);" in mono, \'Combat facade element adapter is missing\''),
    ('assert "dbCombatElementResolution.enemyElementProc.apply(this,args)" in mono, \'enemyElementProc thin adapter is missing\'','assert "return dbCombat.enemyElementProc(...args);" in mono, \'Combat facade enemy element adapter is missing\''),
    ('assert "dbCombatElementResolution.triggerWeaponElement.apply(this,args)" in mono, \'triggerWeaponElement thin adapter is missing\'','assert "return dbCombat.triggerWeaponElement(...args);" in mono, \'Combat facade weapon-element adapter is missing\''),
    ('assert "dbCombatElementResolution.restoreEnemyElementDebuffs.apply(this,args)" in mono, \'enemy elemental cleanup adapter is missing\'','assert "return dbCombat.restoreEnemyElementDebuffs(...args);" in mono, \'Combat facade enemy-element cleanup adapter is missing\''),
    ("assert 'return dbCombatD20ChaosResolution.rollD20Chaos(action);' in mono, 'D20 chaos thin adapter is missing'","assert 'return dbCombat.chaos(action);' in mono, 'Combat facade D20 chaos adapter is missing'")
]
for old,new in replacements:
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'shadow ownership facade guard mismatch for {old!r}: {count}')
    text=text.replace(old,new,1)

# Explicitly reject the retired ordinary peer-public call shapes while allowing
# the focused owners to remain configured behind the facade.
insert="""
for direct_peer_call in [
    'return dbEnemyScalingResolution.scale(...args);',
    'return dbCombatEncounterLifecycle.start(kind);',
    'return dbCombatUltimateResolution.start(...args);',
    'return dbCombatGuardResolution.guardAction(...args);',
    'return dbCombatPetTurnResolution.petTurn(...args);',
    'if(dbCombatPetTurnResolution)return dbCombatPetTurnResolution.petDamage();',
    'return dbCombatPetTurnResolution.trainerPetDamage(id);',
    'return dbCombatVictoryResolution.winCombat(...args);',
    'dbCombatHealingResolution.healPlayer.apply(this,args)',
    'dbCombatElementResolution.triggerElementEffect.apply(this,args)',
    'return dbCombatD20ChaosResolution.rollD20Chaos(action);'
]:
    assert direct_peer_call not in mono, f'direct peer-public Combat call returned: {direct_peer_call}'
assert 'dbCombat=dbCombatOwner.configure({' in mono, 'public Combat facade is not configured by the composition root'
"""
marker="\nprint('Monolith spring-clean guard PASS')"
if text.count(marker)!=1:
    raise SystemExit('shadow ownership final marker mismatch')
text=text.replace(marker,insert+marker,1)
path.write_text(text,encoding='utf-8',newline='\n')

print('Combat facade architecture guards updated')
