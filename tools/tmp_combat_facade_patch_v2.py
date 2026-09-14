from pathlib import Path
import json

root=Path('.')
mono=root/'runtime/js/dicebound.js'
index=root/'runtime/index.html'
manifest_path=root/'runtime/js/module-manifest.json'
project_path=root/'wrapper-source/config/project.json'
text=mono.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global text
    n=text.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected one match, found {n}')
    text=text.replace(old,new,1)

anchor='''  const APP_IDENTITY=window.DiceboundVersion;\n  if(!APP_IDENTITY)throw new Error("dicebound.js requires DiceboundVersion before loading.");\n'''
replace_once(anchor,anchor+'''  const dbCombatOwner=window.DiceboundCombat;\n  if(!dbCombatOwner)throw new Error("dicebound.js requires DiceboundCombat before loading.");\n  let dbCombat=null;\n''','bootstrap handle')

pairs=[
("function scaleEnemy(...args){if(!dbEnemyScalingResolution)throw new Error('Enemy scaling-resolution owner is not configured.');return dbEnemyScalingResolution.scale(...args);}","function scaleEnemy(...args){return dbCombat.scaleEnemy(...args);}",'scale'),
("function triggerElementEffect(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.triggerElementEffect.apply(this,args);}","function triggerElementEffect(...args){return dbCombat.element(...args);}",'element'),
("function enemyElementProc(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.enemyElementProc.apply(this,args);}","function enemyElementProc(...args){return dbCombat.enemyElementProc(...args);}",'enemy element'),
("async function enemyTurn(...args){if(!dbCombatTurns)throw new Error('Combat turn-resolution owner is not configured.');return dbCombatTurns.enemyTurn(...args);}","async function enemyTurn(...args){return dbCombat.enemyTurn(...args);}",'enemy turn'),
("async function resolveEnemyResponse(...args){if(!dbCombatTurns)throw new Error('Combat turn-resolution owner is not configured.');return dbCombatTurns.resolveEnemyResponse(...args);}","async function resolveEnemyResponse(...args){return dbCombat.enemyResponse(...args);}",'enemy response'),
("function applyCombatPlayerDamage(raw){if(!dbCombatTurns)throw new Error('Combat turn-resolution owner is not configured.');return dbCombatTurns.applyPlayerDamage(raw);}","function applyCombatPlayerDamage(raw){return dbCombat.applyPlayerDamage(raw);}",'player damage'),
("function recordHealing(...args){if(!dbCombatHealingResolution)throw new Error('Healing-resolution owner is not configured.');return dbCombatHealingResolution.recordHealing.apply(this,args);}","function recordHealing(...args){return dbCombat.recordHealing(...args);}",'record healing'),
("function healPlayer(...args){if(!dbCombatHealingResolution)throw new Error('Healing-resolution owner is not configured.');return dbCombatHealingResolution.healPlayer.apply(this,args);}","function healPlayer(...args){return dbCombat.heal(...args);}",'heal'),
("function clearBloodOverhealTemp(...args){if(!dbCombatHealingResolution)throw new Error('Healing-resolution owner is not configured.');return dbCombatHealingResolution.clearBloodOverhealTemp.apply(this,args);}","function clearBloodOverhealTemp(...args){return dbCombat.clearBloodOverhealTemp(...args);}",'blood cleanup'),
("async function petTurn(...args){if(!dbCombatPetTurnResolution)throw new Error(\"Combat Pet turn-resolution owner is not configured.\");return dbCombatPetTurnResolution.petTurn(...args);}","async function petTurn(...args){return dbCombat.petTurn(...args);}",'pet turn'),
("function currentWeaponElement(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.currentWeaponElement.apply(this,args);}","function currentWeaponElement(...args){return dbCombat.currentWeaponElement(...args);}",'current weapon element'),
("function triggerWeaponElement(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.triggerWeaponElement.apply(this,args);}","function triggerWeaponElement(...args){return dbCombat.triggerWeaponElement(...args);}",'weapon element'),
("async function rollD20Chaos(action){\n    if(!dbCombatD20ChaosResolution)throw new Error(\"D20 chaos-resolution owner is not configured.\");\n    return dbCombatD20ChaosResolution.rollD20Chaos(action);\n  }","async function rollD20Chaos(action){return dbCombat.chaos(action);}",'d20'),
("async function useUltimate(...args){if(!dbCombatUltimateResolution)throw new Error('Combat Ultimate-resolution owner is not configured.');return dbCombatUltimateResolution.start(...args);}","async function useUltimate(...args){return dbCombat.ultimate(...args);}",'ultimate'),
("function strikeBaseDamage(...args){if(!dbCombatStrikes)throw new Error('Combat strike-resolution owner is not configured.');return dbCombatStrikes.strikeBaseDamage(...args);}","function strikeBaseDamage(...args){return dbCombat.strikeBaseDamage(...args);}",'strike base'),
("async function performStrike(...args){if(!dbCombatStrikes)throw new Error('Combat strike-resolution owner is not configured.');return dbCombatStrikes.performStrike(...args);}","async function performStrike(...args){return dbCombat.strike(...args);}",'strike'),
("async function playerAttack(...args){if(!dbCombatAttackResolution)throw new Error('Combat Attack-action owner is not configured.');return dbCombatAttackResolution.playerAttack(...args);}","async function playerAttack(...args){return dbCombat.attack(...args);}",'attack'),
("async function guardAction(...args){if(!dbCombatGuardResolution)throw new Error('Combat Guard-resolution owner is not configured.');return dbCombatGuardResolution.guardAction(...args);}","async function guardAction(...args){return dbCombat.guard(...args);}",'guard'),
("function startCombat(kind=\"normal\"){\n    if(!dbCombatEncounterLifecycle)throw new Error('Combat encounter-lifecycle owner is not configured.');\n    return dbCombatEncounterLifecycle.start(kind);\n  }","function startCombat(kind=\"normal\"){return dbCombat.startEncounter(kind);}",'encounter'),
("async function winCombat(...args){if(!dbCombatVictoryResolution)throw new Error('Combat Victory-resolution owner is not configured.');return dbCombatVictoryResolution.winCombat(...args);}","async function winCombat(...args){return dbCombat.win(...args);}",'victory'),
("function manaGain(amount){if(!dbCombatManaActionResolution)throw new Error(\"Combat Mana action owner is not configured.\");return dbCombatManaActionResolution.manaGain(amount);}","function manaGain(amount){return dbCombat.manaGain(amount);}",'mana gain'),
("async function occultChannelAttack(...args){if(!dbCombatManaActionResolution)throw new Error(\"Combat Mana action owner is not configured.\");return dbCombatManaActionResolution.occultChannelAttack.apply(this,args);}","async function occultChannelAttack(...args){return dbCombat.channel(...args);}",'channel'),
("async function occultSpellAttack(...args){if(!dbCombatManaActionResolution)throw new Error(\"Combat Mana action owner is not configured.\");return dbCombatManaActionResolution.occultSpellAttack.apply(this,args);}","async function occultSpellAttack(...args){return dbCombat.spell(...args);}",'spell'),
("function trainerPetDamage(id){if(!dbCombatPetTurnResolution)throw new Error(\"Combat Pet turn-resolution owner is not configured.\");return dbCombatPetTurnResolution.trainerPetDamage(id);}","function trainerPetDamage(id){return dbCombat.trainerPetDamage(id);}",'trainer damage'),
("function petElementFor(id){if(!dbCombatPetTurnResolution)throw new Error(\"Combat Pet turn-resolution owner is not configured.\");return dbCombatPetTurnResolution.petElementFor(id);}","function petElementFor(id){return dbCombat.petElementFor(id);}",'pet element'),
("function activeTrainerPetId(){if(!dbCombatPetTurnResolution)throw new Error(\"Combat Pet turn-resolution owner is not configured.\");return dbCombatPetTurnResolution.activeTrainerPetId();}","function activeTrainerPetId(){return dbCombat.activeTrainerPetId();}",'active trainer'),
("async function maybePetElementProc(id,target,source=\"Companion Spark\"){if(!dbCombatPetTurnResolution)throw new Error(\"Combat Pet turn-resolution owner is not configured.\");return dbCombatPetTurnResolution.maybePetElementProc(id,target,source);}","async function maybePetElementProc(id,target,source=\"Companion Spark\"){return dbCombat.maybePetElementProc(id,target,source);}",'pet proc'),
("async function trainerStrike(id,target,scale=1,label=\"attacks\"){if(!dbCombatPetTurnResolution)throw new Error(\"Combat Pet turn-resolution owner is not configured.\");return dbCombatPetTurnResolution.trainerStrike(id,target,scale,label);}","async function trainerStrike(id,target,scale=1,label=\"attacks\"){return dbCombat.trainerStrike(id,target,scale,label);}",'trainer strike'),
("async function summonerConjure(...args){if(!dbCombatManaActionResolution)throw new Error(\"Combat Mana action owner is not configured.\");return dbCombatManaActionResolution.summonerConjure.apply(this,args);}","async function summonerConjure(...args){return dbCombat.summonerConjure(...args);}",'summoner conjure'),
("function restoreRadiationDefenseV16(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.restoreRadiationDefense.apply(this,args);}","function restoreRadiationDefenseV16(...args){return dbCombat.restoreRadiationDefense(...args);}",'radiation restore'),
("function v26ClearStoneBattle(...args){if(!dbCombatHealingResolution)throw new Error('Healing-resolution owner is not configured.');return dbCombatHealingResolution.clearStoneBattle.apply(this,args);}","function v26ClearStoneBattle(...args){return dbCombat.clearStoneBattle(...args);}",'stone cleanup'),
("function beta03AddBurn(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.addEnemyBurn.apply(this,args);}","function beta03AddBurn(...args){return dbCombat.addEnemyBurn(...args);}",'burn'),
("function db0511RestoreEnemyElementDebuffs(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.restoreEnemyElementDebuffs.apply(this,args);}","function db0511RestoreEnemyElementDebuffs(...args){return dbCombat.restoreEnemyElementDebuffs(...args);}",'element cleanup'),
("function affinityElementMultiplier(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.affinityElementMultiplier.apply(this,args);}","function affinityElementMultiplier(...args){return dbCombat.affinityElementMultiplier(...args);}",'affinity'),
("function elementHit(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.elementHit.apply(this,args);}","function elementHit(...args){return dbCombat.elementHit(...args);}",'element hit'),
("function elementHitAll(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.elementHitAll.apply(this,args);}","function elementHitAll(...args){return dbCombat.elementHitAll(...args);}",'element hit all'),
]
for old,new,label in pairs:
    replace_once(old,new,label)

old='''  async function identityGuardAction(...args){\n    if(!dbCombatGuardResolution)throw new Error('Combat Guard-resolution owner is not configured.');\n    const invoke=(...inner)=>dbCombatGuardResolution.identityGuardAction(...inner);\n    if(typeof v25TraceCommand==='function')return v25TraceCommand('identityGuardAction',invoke,'detailed',args,this);\n    return invoke(...args);\n  }\n'''
new='''  async function identityGuardAction(...args){\n    const invoke=(...inner)=>dbCombat.identityGuard(...inner);\n    if(typeof v25TraceCommand==='function')return v25TraceCommand('identityGuardAction',invoke,'detailed',args,this);\n    return invoke(...args);\n  }\n'''
replace_once(old,new,'identity guard')

anchor='''  dbCombatD20ChaosResolution.initializePlayerState();\n\n  /* SEMANTIC OWNER — Player / per-run initialization (#311). */\n'''
block='''  dbCombatD20ChaosResolution.initializePlayerState();\n\n  // Beta 0.6.6.31 — one ordinary public Combat Engine boundary. Focused\n  // resolution modules remain authoritative internals; presentation/VFX stay\n  // outside this facade for the separate Combat View ownership wave.\n  dbCombat=dbCombatOwner.configure({\n    encounter:dbCombatEncounterLifecycle,attack:dbCombatAttackResolution,guard:dbCombatGuardResolution,mana:dbCombatManaActionResolution,\n    ultimate:dbCombatUltimateResolution,petTurn:dbCombatPetTurnResolution,turns:dbCombatTurns,victory:dbCombatVictoryResolution,\n    elements:dbCombatElementResolution,healing:dbCombatHealingResolution,d20:dbCombatD20ChaosResolution,strikes:dbCombatStrikes,\n    scaling:dbEnemyScalingResolution\n  });\n\n  /* SEMANTIC OWNER — Player / per-run initialization (#311). */\n'''
replace_once(anchor,block,'configure boundary')
mono.write_text(text,encoding='utf-8',newline='\n')

idx=index.read_text(encoding='utf-8')
old='<script src="js/combat/mana-action-resolution.js"></script>\n<script src="js/progression/class-unlock-rules.js"></script>'
new='<script src="js/combat/mana-action-resolution.js"></script>\n<script src="js/combat/facade.js"></script>\n<script src="js/progression/class-unlock-rules.js"></script>'
if idx.count(old)!=1: raise SystemExit('index insertion anchor mismatch')
index.write_text(idx.replace(old,new,1),encoding='utf-8',newline='\n')

manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
if 'combat-facade' not in manifest['loadOrder']:
    pos=manifest['loadOrder'].index('combat-mana-action-resolution')+1
    manifest['loadOrder'].insert(pos,'combat-facade')
if not any(m.get('id')=='combat-facade' for m in manifest['modules']):
    mod={'id':'combat-facade','path':'js/combat/facade.js','domain':'combat/public-engine-facade','status':'extracted','requires':['combat-healing-resolution','combat-element-resolution','combat-d20-chaos-resolution','combat-strike-resolution','combat-attack-action-resolution','combat-ultimate-resolution','combat-guard-resolution','combat-pet-turn-resolution','combat-victory-resolution','combat-enemy-scaling-resolution','combat-encounter-lifecycle','combat-turn-resolution','combat-mana-action-resolution'],'provides':['DiceboundCombat']}
    pos=next(i for i,m in enumerate(manifest['modules']) if m['id']=='combat-mana-action-resolution')+1
    manifest['modules'].insert(pos,mod)
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

project=json.loads(project_path.read_text(encoding='utf-8'))
script='js/combat/facade.js'
if script not in project['runtimeScripts']:
    pos=project['runtimeScripts'].index('js/combat/mana-action-resolution.js')+1
    project['runtimeScripts'].insert(pos,script)
project_path.write_text(json.dumps(project,indent=2)+'\n',encoding='utf-8')
print('Combat facade wiring patch staged')
