from pathlib import Path

path=Path('tools/validate_runtime_architecture.py')
text=path.read_text(encoding='utf-8')

replacements=[
(
'''        if monolith_source.count("function startCombat(") != 1 or "return dbCombatEncounterLifecycle.start(kind);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin startCombat encounter-lifecycle adapter")\n''',
'''        if monolith_source.count("function startCombat(") != 1 or "return dbCombat.startEncounter(kind);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin startCombat adapter through DiceboundCombat")\n        if "return dbCombatEncounterLifecycle.start(kind);" in monolith_source:\n            errors.append("dicebound.js must not expose the encounter-lifecycle specialist as a peer-public startCombat seam")\n''',
'encounter validator'
),
(
'''        if monolith_source.count("async function useUltimate(") != 1 or "return dbCombatUltimateResolution.start(...args);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin useUltimate adapter")\n''',
'''        if monolith_source.count("async function useUltimate(") != 1 or "return dbCombat.ultimate(...args);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin useUltimate adapter through DiceboundCombat")\n        if "return dbCombatUltimateResolution.start(...args);" in monolith_source:\n            errors.append("dicebound.js must not expose the Ultimate specialist as a peer-public seam")\n''',
'ultimate validator'
),
(
'''        if monolith_source.count("async function guardAction(") != 1 or "return dbCombatGuardResolution.guardAction(...args);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin guardAction adapter")\n        if monolith_source.count("async function identityGuardAction(") != 1 or "dbCombatGuardResolution.identityGuardAction" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin traced identityGuardAction adapter")\n''',
'''        if monolith_source.count("async function guardAction(") != 1 or "return dbCombat.guard(...args);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin guardAction adapter through DiceboundCombat")\n        if monolith_source.count("async function identityGuardAction(") != 1 or "dbCombat.identityGuard" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin traced identityGuardAction adapter through DiceboundCombat")\n        if "return dbCombatGuardResolution.guardAction(...args);" in monolith_source or "dbCombatGuardResolution.identityGuardAction" in monolith_source:\n            errors.append("dicebound.js must not expose Guard specialists as peer-public action seams")\n''',
'guard validator'
),
(
'''        if monolith_source.count("async function petTurn(") != 1 or "return dbCombatPetTurnResolution.petTurn(...args);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin petTurn adapter")\n        if monolith_source.count("function petDamage(") != 1 or "return dbCombatPetTurnResolution.petDamage();" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin petDamage adapter")\n        if monolith_source.count("function trainerPetDamage(") != 1 or "return dbCombatPetTurnResolution.trainerPetDamage(id);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin trainerPetDamage adapter")\n''',
'''        if monolith_source.count("async function petTurn(") != 1 or "return dbCombat.petTurn(...args);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin petTurn adapter through DiceboundCombat")\n        if monolith_source.count("function petDamage(") != 1 or "if(dbCombat)return dbCombat.petDamage();" not in monolith_source:\n            errors.append("dicebound.js must retain the Camp-safe petDamage fallback and route configured Combat through DiceboundCombat")\n        if monolith_source.count("function trainerPetDamage(") != 1 or "return dbCombat.trainerPetDamage(id);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin trainerPetDamage adapter through DiceboundCombat")\n        if any(peer in monolith_source for peer in (\n            "return dbCombatPetTurnResolution.petTurn(...args);",\n            "if(dbCombatPetTurnResolution)return dbCombatPetTurnResolution.petDamage();",\n            "return dbCombatPetTurnResolution.trainerPetDamage(id);",\n        )):\n            errors.append("dicebound.js must not expose Pet-turn specialists as peer-public seams")\n''',
'pet validator'
),
(
'''        if monolith_source.count("async function winCombat(") != 1 or "return dbCombatVictoryResolution.winCombat(...args);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin winCombat adapter")\n''',
'''        if monolith_source.count("async function winCombat(") != 1 or "return dbCombat.win(...args);" not in monolith_source:\n            errors.append("dicebound.js must retain only the thin winCombat adapter through DiceboundCombat")\n        if "return dbCombatVictoryResolution.winCombat(...args);" in monolith_source:\n            errors.append("dicebound.js must not expose the Victory specialist as a peer-public seam")\n''',
'victory validator'
),
(
'''        for expected_mana_adapter in [\n            "const dbCombatManaActionOwner=window.DiceboundCombatManaActionResolution;",\n            "function manaGain(amount){if(!dbCombatManaActionResolution)",\n            "async function occultChannelAttack(...args){if(!dbCombatManaActionResolution)",\n            "async function occultSpellAttack(...args){if(!dbCombatManaActionResolution)",\n            "async function summonerConjure(...args){if(!dbCombatManaActionResolution)",\n        ]:\n            if expected_mana_adapter not in monolith_source:\n                errors.append("dicebound.js must retain only the thin Mana action composition adapters")\n''',
'''        for expected_mana_adapter in [\n            "const dbCombatManaActionOwner=window.DiceboundCombatManaActionResolution;",\n            "function manaGain(amount){return dbCombat.manaGain(amount);}",\n            "async function occultChannelAttack(...args){return dbCombat.channel(...args);}",\n            "async function occultSpellAttack(...args){return dbCombat.spell(...args);}",\n            "async function summonerConjure(...args){return dbCombat.summonerConjure(...args);}",\n            "mana:dbCombatManaActionResolution",\n        ]:\n            if expected_mana_adapter not in monolith_source:\n                errors.append("dicebound.js must retain only the thin Mana action composition adapters through DiceboundCombat")\n        for retired_mana_adapter in [\n            "return dbCombatManaActionResolution.manaGain(amount);",\n            "return dbCombatManaActionResolution.occultChannelAttack.apply(this,args);",\n            "return dbCombatManaActionResolution.occultSpellAttack.apply(this,args);",\n            "return dbCombatManaActionResolution.summonerConjure.apply(this,args);",\n        ]:\n            if retired_mana_adapter in monolith_source:\n                errors.append("dicebound.js must not expose the Mana specialist as a peer-public seam: " + retired_mana_adapter)\n''',
'mana validator'
),
]

for old,new,label in replacements:
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    text=text.replace(old,new,1)

anchor='''    monolith_id = next((m["id"] for m in modules if m.get("status") == "monolith"), None)\n    monolith_source = sources.get(str(monolith_id), "") if monolith_id else ""\n'''
insert='''    monolith_id = next((m["id"] for m in modules if m.get("status") == "monolith"), None)\n    monolith_source = sources.get(str(monolith_id), "") if monolith_id else ""\n    combat_facade_module = by_id.get("combat-facade")\n    if not combat_facade_module:\n        errors.append("Combat public facade combat-facade is missing from the runtime manifest")\n    else:\n        combat_facade_requires = set(combat_facade_module.get("requires") or [])\n        if combat_facade_module.get("path") != "js/combat/facade.js" or "DiceboundCombat" not in (combat_facade_module.get("provides") or []):\n            errors.append("combat-facade must own js/combat/facade.js and provide DiceboundCombat")\n        if position.get("combat-facade", -1) >= position.get(str(monolith_id), -1):\n            errors.append("combat-facade must load before the compatibility monolith")\n        if "combat-presentation" in combat_facade_requires or "combat-vfx" in combat_facade_requires:\n            errors.append("Combat Engine facade must keep Combat Presentation/VFX outside its dependency boundary")\n    if monolith_source:\n        for required_combat_facade_route in [\n            "const dbCombatOwner=window.DiceboundCombat;",\n            "dbCombat=dbCombatOwner.configure({",\n            "encounter:dbCombatEncounterLifecycle",\n            "attack:dbCombatAttackResolution",\n            "guard:dbCombatGuardResolution",\n            "mana:dbCombatManaActionResolution",\n            "ultimate:dbCombatUltimateResolution",\n            "petTurn:dbCombatPetTurnResolution",\n            "turns:dbCombatTurns",\n            "victory:dbCombatVictoryResolution",\n            "elements:dbCombatElementResolution",\n            "healing:dbCombatHealingResolution",\n            "d20:dbCombatD20ChaosResolution",\n            "strikes:dbCombatStrikes",\n            "scaling:dbEnemyScalingResolution",\n        ]:\n            if required_combat_facade_route not in monolith_source:\n                errors.append("dicebound.js is missing Combat facade composition route: " + required_combat_facade_route)\n'''
count=text.count(anchor)
if count!=1:
    raise SystemExit(f'central Combat facade manifest anchor: expected one, found {count}')
text=text.replace(anchor,insert,1)

path.write_text(text,encoding='utf-8',newline='\n')
print('Central Combat facade architecture validator updated')
